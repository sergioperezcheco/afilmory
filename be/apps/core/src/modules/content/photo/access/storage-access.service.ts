import type { B2Config, ManagedStorageConfig, S3CompatibleConfig, StorageConfig } from '@afilmory/builder'
import { createS3Client } from '@afilmory/builder/s3/client.js'
import { generateId, photoAccessLogs, photoAccessStats, photoAssets } from '@afilmory/db'
import { Sha256 } from '@aws-crypto/sha256-js'
import { HttpRequest } from '@smithy/protocol-http'
import { SignatureV4 } from '@smithy/signature-v4'
import { DbAccessor } from 'core/database/database.provider'
import { BizException, ErrorCode } from 'core/errors'
import { logger } from 'core/helpers/logger.helper'
import { normalizedBoolean } from 'core/helpers/normalize.helper'
import { SettingService } from 'core/modules/configuration/setting/setting.service'
import { SystemSettingService } from 'core/modules/configuration/system-setting/system-setting.service'
import { PhotoStorageService } from 'core/modules/content/photo/storage/photo-storage.service'
import { requireTenantContext } from 'core/modules/platform/tenant/tenant.context'
import { and, eq, sql } from 'drizzle-orm'
import { injectable } from 'tsyringe'

type RemoteAccessTarget =
  | {
      kind: 's3'
      config: S3CompatibleConfig
      objectKey: string
    }
  | {
      kind: 'b2'
      config: B2Config
      objectKey: string
    }

type IssueSignedUrlOptions = {
  storageKey: string
  ttlSeconds?: number
  intent?: string
  clientIp?: string | null
  userAgent?: string | null
  referer?: string | null
}

export type IssueSignedUrlResult = {
  url: string
  expiresAt: string
  tokenId: string
  headers: Record<string, string>
}

const DEFAULT_TTL_SECONDS = 600
const MIN_TTL_SECONDS = 60
const MAX_TTL_SECONDS = 600

@injectable()
export class StorageAccessService {
  private readonly logger = logger.extend('StorageAccessService')
  private readonly b2Client = new B2SigningClient()

  constructor(
    private readonly dbAccessor: DbAccessor,
    private readonly photoStorageService: PhotoStorageService,
    private readonly settingService: SettingService,
    private readonly systemSettingService: SystemSettingService,
  ) {}

  createProxyUrl(storageKey: string, intent = 'photo'): string {
    const params = new URLSearchParams()
    params.set('objectKey', storageKey)
    if (intent) {
      params.set('intent', intent)
    }
    return `/api/storage/sign?${params.toString()}`
  }

  async isSecureAccessEnabled(): Promise<boolean> {
    const tenant = requireTenantContext()
    const { storageConfig } = await this.photoStorageService.resolveConfigForTenant(tenant.tenant.id)
    return await this.resolveSecureAccessPreference(storageConfig, tenant.tenant.id)
  }

  async resolveSecureAccessPreference(storageConfig: StorageConfig, tenantId: string): Promise<boolean> {
    if (storageConfig.provider === 'managed') {
      return await this.systemSettingService.isManagedStorageSecureAccessEnabled()
    }
    const raw = (await this.settingService.get('photo.storage.secureAccess', { tenantId })) ?? 'false'
    return normalizedBoolean(raw)
  }

  async issueSignedUrl(options: IssueSignedUrlOptions): Promise<IssueSignedUrlResult> {
    const tenant = requireTenantContext()
    const db = this.dbAccessor.get()
    const normalizedKey = this.normalizeKeyPath(options.storageKey)
    if (!normalizedKey) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: '缺少有效的 storage key' })
    }

    const { storageConfig } = await this.photoStorageService.resolveConfigForTenant(tenant.tenant.id)
    const secureAccessEnabled = await this.resolveSecureAccessPreference(storageConfig, tenant.tenant.id)
    if (!secureAccessEnabled) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: 'Secure access is not enabled.' })
    }
    const target = this.resolveRemoteTarget(storageConfig, normalizedKey, tenant.tenant.id)
    const ttl = this.normalizeTtlSeconds(options.ttlSeconds)
    const { url, expiresAt, headers } = await this.createProviderSignedUrl(target, ttl)
    const tokenId = generateId()

    const record = await db
      .select({
        id: photoAssets.id,
        photoId: photoAssets.photoId,
        storageProvider: photoAssets.storageProvider,
      })
      .from(photoAssets)
      .where(and(eq(photoAssets.tenantId, tenant.tenant.id), eq(photoAssets.storageKey, normalizedKey)))
      .limit(1)
      .then((rows) => rows[0])

    if (record) {
      const now = new Date().toISOString()

      await db.insert(photoAccessLogs).values({
        id: generateId(),
        tenantId: tenant.tenant.id,
        photoAssetId: record.id,
        photoId: record.photoId,
        storageKey: normalizedKey,
        provider: target.kind,
        intent: options.intent?.trim() || 'original',
        tokenId,
        signedUrl: url,
        status: 'issued',
        clientIp: options.clientIp ?? null,
        userAgent: options.userAgent ?? null,
        referer: options.referer ?? null,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })

      await db
        .insert(photoAccessStats)
        .values({
          tenantId: tenant.tenant.id,
          photoAssetId: record.id,
          photoId: record.photoId,
          viewCount: 1,
          lastViewedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [photoAccessStats.tenantId, photoAccessStats.photoAssetId],
          set: {
            viewCount: sql`${photoAccessStats.viewCount} + 1`,
            lastViewedAt: now,
            updatedAt: now,
            photoId: record.photoId,
          },
        })
    }
    return { url, expiresAt, tokenId, headers }
  }

  private async createProviderSignedUrl(
    target: RemoteAccessTarget,
    ttlSeconds: number,
  ): Promise<{ url: string; expiresAt: string; headers: Record<string, string> }> {
    if (target.kind === 's3') {
      return await this.createS3SignedUrl(target.config, target.objectKey, ttlSeconds)
    }
    return await this.b2Client.createSignedUrl(target.config, target.objectKey, ttlSeconds)
  }

  private resolveRemoteTarget(config: StorageConfig, key: string, tenantId: string): RemoteAccessTarget {
    switch (config.provider) {
      case 'managed': {
        if (config.provider !== 'managed') {
          throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: 'Invalid managed storage config' })
        }
        const managedConfig = config as ManagedStorageConfig
        const managedKey = this.applyManagedPrefix(managedConfig, key)
        return this.resolveRemoteTarget(managedConfig.upstream, managedKey, tenantId)
      }
      case 's3':
      case 'oss':
      case 'cos': {
        if (config.provider !== 's3' && config.provider !== 'oss' && config.provider !== 'cos') {
          throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: 'Invalid S3-compatible storage config' })
        }
        const s3Config = config as S3CompatibleConfig
        return { kind: 's3', config: s3Config, objectKey: key }
      }
      case 'b2': {
        if (config.provider !== 'b2') {
          throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: 'Invalid B2 storage config' })
        }
        const b2Config = config as B2Config
        const remoteKey = this.applyRemotePrefix(b2Config.prefix, key)
        return { kind: 'b2', config: b2Config, objectKey: remoteKey }
      }
      default: {
        this.logger.error(
          `Storage provider ${config.provider as string} for tenant ${tenantId} does not support secure download URLs.`,
        )
        throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: '当前存储提供商不支持安全访问链接' })
      }
    }
  }

  private applyManagedPrefix(config: ManagedStorageConfig, key: string): string {
    const tenantSegment = this.normalizePath(config.tenantId)
    const upstreamBase = this.normalizePath(this.extractUpstreamBasePath(config.upstream))
    const customBase = this.normalizePath(config.basePrefix)
    const combined = this.joinSegments(upstreamBase, customBase, tenantSegment)
    return this.joinSegments(combined, key)
  }

  private extractUpstreamBasePath(config: StorageConfig): string | null {
    switch (config.provider) {
      case 's3':
      case 'oss':
      case 'cos': {
        const s3Config = config as S3CompatibleConfig
        return this.normalizePath(s3Config.prefix)
      }
      case 'b2': {
        const b2Config = config as B2Config
        return this.normalizePath(b2Config.prefix)
      }
      case 'github': {
        const githubConfig = config as { provider: 'github'; path?: string | null }
        return this.normalizePath(githubConfig.path)
      }
      default: {
        return null
      }
    }
  }

  private applyRemotePrefix(prefix: string | null | undefined, key: string): string {
    const normalizedPrefix = this.normalizePath(prefix)
    const normalizedKey = this.normalizePath(key)
    if (!normalizedPrefix) {
      return normalizedKey
    }
    if (!normalizedKey) {
      return normalizedPrefix
    }
    return `${normalizedPrefix}/${normalizedKey}`
  }

  private normalizeTtlSeconds(input?: number): number {
    if (!input || !Number.isFinite(input)) {
      return DEFAULT_TTL_SECONDS
    }
    const normalized = Math.trunc(input)
    if (normalized < MIN_TTL_SECONDS) {
      return MIN_TTL_SECONDS
    }
    if (normalized > MAX_TTL_SECONDS) {
      return MAX_TTL_SECONDS
    }
    return normalized
  }

  private normalizeKeyPath(value: string): string {
    if (!value) {
      return ''
    }
    const segments = value.split(/[\\/]+/)
    const safeSegments: string[] = []
    for (const segment of segments) {
      const trimmed = segment.trim()
      if (!trimmed || trimmed === '.' || trimmed === '..') {
        continue
      }
      safeSegments.push(trimmed)
    }
    return safeSegments.join('/')
  }

  private normalizePath(value?: string | null): string {
    if (!value) {
      return ''
    }
    return value
      .replaceAll('\\', '/')
      .replaceAll(/\/+/g, '/')
      .replaceAll(/^\/+|\/+$/g, '')
  }

  private joinSegments(...segments: Array<string | null>): string {
    const filtered = segments.filter((segment): segment is string => typeof segment === 'string' && segment.length > 0)
    if (filtered.length === 0) {
      return ''
    }
    return filtered
      .map((segment) => segment.replaceAll(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/')
  }

  private inferS3ServiceName(provider: S3CompatibleConfig['provider']): string {
    switch (provider) {
      case 'oss': {
        return 'oss'
      }
      case 'cos': {
        return 's3' // COS 仍兼容 s3 签名
      }
      default: {
        return 's3'
      }
    }
  }

  private formatHttpRequestUrl(request: HttpRequest): string {
    const protocol = request.protocol ?? 'https:'
    const hostname = request.hostname ?? 'localhost'
    const port = request.port ? `:${request.port}` : ''
    const path = request.path?.startsWith('/') ? request.path : `/${request.path ?? ''}`
    const queryString = this.stringifyQuery(request.query ?? {})
    return `${protocol}//${hostname}${port}${path}${queryString}`
  }

  private stringifyQuery(query: HttpRequest['query']): string {
    const entries: string[] = []
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined) {
        continue
      }
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== undefined) {
            entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(entry)}`)
          }
        })
      } else {
        entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
      }
    }
    if (entries.length === 0) {
      return ''
    }
    return `?${entries.join('&')}`
  }

  private createQueryRecord(params: URLSearchParams): HttpRequest['query'] {
    const record: Record<string, string | string[]> = {}
    for (const [key, value] of params.entries()) {
      if (record[key] === undefined) {
        record[key] = value
      } else if (Array.isArray(record[key])) {
        ;(record[key] as string[]).push(value)
      } else {
        record[key] = [record[key] as string, value]
      }
    }
    return record
  }

  private async createS3SignedUrl(
    config: S3CompatibleConfig,
    key: string,
    ttlSeconds: number,
  ): Promise<{ url: string; expiresAt: string; headers: Record<string, string> }> {
    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: 'S3 存储配置缺少访问密钥' })
    }
    const client = createS3Client(config)
    const objectUrl = client.buildObjectUrl(key)
    const url = new URL(objectUrl)
    const signer = new SignatureV4({
      service: config.sigV4Service ?? this.inferS3ServiceName(config.provider),
      region: config.region ?? 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      },
      sha256: Sha256,
    })
    const headers: Record<string, string> = {
      host: url.host,
    }
    const query = this.createQueryRecord(url.searchParams)
    const hasLowerContentSha = Object.keys(query).some((key) => key.toLowerCase() === 'x-amz-content-sha256')
    if (!hasLowerContentSha) {
      query['X-Amz-Content-Sha256'] = 'UNSIGNED-PAYLOAD'
    }
    const hasLowerSecurityToken = Object.keys(query).some((key) => key.toLowerCase() === 'x-amz-security-token')
    if (config.sessionToken && !hasLowerSecurityToken) {
      query['X-Amz-Security-Token'] = config.sessionToken
    }
    if (!('x-amz-checksum-mode' in query)) {
      query['x-amz-checksum-mode'] = 'ENABLED'
    }
    if (!('x-id' in query)) {
      query['x-id'] = 'GetObject'
    }
    const request = new HttpRequest({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      method: 'GET',
      path: url.pathname,
      query,
      headers,
    })
    const signed = await signer.presign(request, { expiresIn: ttlSeconds })
    return {
      url: this.formatHttpRequestUrl(signed as HttpRequest),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      headers: {},
    }
  }
}

class B2SigningClient {
  private readonly authorizationCache = new Map<string, AuthorizationState>()
  private readonly bucketNameCache = new Map<string, string>()

  async createSignedUrl(
    config: B2Config,
    remoteKey: string,
    ttlSeconds: number,
  ): Promise<{ url: string; expiresAt: string; headers: Record<string, string> }> {
    const normalizedKey = this.encodeFileName(remoteKey)
    const authorization = await this.authorize(config)
    const bucketName = await this.resolveBucketName(config, authorization)
    const validDuration = Math.min(Math.max(ttlSeconds, MIN_TTL_SECONDS), MAX_TTL_SECONDS)
    const token = await this.getDownloadToken(config, authorization, remoteKey, validDuration)
    const baseUrl = authorization.downloadUrl.replace(/\/+$/, '')

    const url = `${config.customDomain || baseUrl}/file/${bucketName}/${normalizedKey}`
    return {
      url,
      expiresAt: new Date(Date.now() + validDuration * 1000).toISOString(),
      headers: {
        Authorization: token,
      },
    }
  }

  private async authorize(config: B2Config, force = false): Promise<AuthorizationState> {
    const cacheKey = `${config.applicationKeyId}:${config.bucketId}`
    const cached = this.authorizationCache.get(cacheKey)
    if (!force && cached && cached.expiresAt > Date.now()) {
      return cached
    }

    const basicToken = Buffer.from(`${config.applicationKeyId}:${config.applicationKey}`).toString('base64')
    const response = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      headers: {
        Authorization: `Basic ${basicToken}`,
      },
    })
    const text = await response.text()
    if (!response.ok) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: this.formatB2Error(response.status, text) })
    }

    const payload = text ? (JSON.parse(text) as B2AuthorizeAccountResponse) : null
    const storageApi = payload?.apiInfo?.storageApi
    const apiUrl = payload?.apiUrl ?? storageApi?.apiUrl
    const downloadUrl = payload?.downloadUrl ?? storageApi?.downloadUrl
    if (!apiUrl || !downloadUrl) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, {
        message: '无法从 B2 获取有效的 API 地址，请检查凭证或网络',
      })
    }

    const next: AuthorizationState = {
      token: payload?.authorizationToken ?? '',
      apiUrl,
      downloadUrl,
      allowedBucketId: payload?.allowed?.bucketId ?? storageApi?.bucketId ?? null,
      allowedBucketName: payload?.allowed?.bucketName ?? storageApi?.bucketName ?? null,
      expiresAt: Date.now() + 1000 * 60 * 60 * 22,
    }

    this.authorizationCache.set(cacheKey, next)
    if (config.bucketName) {
      this.bucketNameCache.set(config.bucketId, config.bucketName)
    } else if (next.allowedBucketName && next.allowedBucketId) {
      this.bucketNameCache.set(next.allowedBucketId, next.allowedBucketName)
    }

    return next
  }

  private async getDownloadToken(
    config: B2Config,
    authorization: AuthorizationState,
    remoteKey: string,
    ttlSeconds: number,
  ): Promise<string> {
    const payload = {
      bucketId: config.bucketId,
      fileNamePrefix: remoteKey,
      validDurationInSeconds: ttlSeconds,
    }
    const response = await fetch(`${authorization.apiUrl.replace(/\/+$/, '')}/b2api/v3/b2_get_download_authorization`, {
      method: 'POST',
      headers: {
        Authorization: authorization.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const text = await response.text()
    if (response.status === 401) {
      const refreshed = await this.authorize(config, true)
      return await this.getDownloadToken(config, refreshed, remoteKey, ttlSeconds)
    }

    if (!response.ok) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: this.formatB2Error(response.status, text) })
    }
    const data = text ? (JSON.parse(text) as { authorizationToken: string }) : null
    if (!data?.authorizationToken) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: 'B2 下载授权响应格式异常' })
    }
    return data.authorizationToken
  }

  private async resolveBucketName(config: B2Config, authorization: AuthorizationState): Promise<string> {
    if (config.bucketName) {
      return config.bucketName
    }
    const cached = this.bucketNameCache.get(config.bucketId)
    if (cached) {
      return cached
    }
    if (authorization.allowedBucketName && authorization.allowedBucketId === config.bucketId) {
      this.bucketNameCache.set(config.bucketId, authorization.allowedBucketName)
      return authorization.allowedBucketName
    }

    const response = await fetch(`${authorization.apiUrl.replace(/\/+$/, '')}/b2api/v3/b2_get_bucket`, {
      method: 'POST',
      headers: {
        Authorization: authorization.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: config.bucketId,
      }),
    })
    const text = await response.text()
    if (!response.ok) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: this.formatB2Error(response.status, text) })
    }
    const data = text ? (JSON.parse(text) as B2BucketResponse) : null
    if (!data?.bucketName) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: '无法解析 B2 bucket 信息' })
    }
    this.bucketNameCache.set(config.bucketId, data.bucketName)
    return data.bucketName
  }

  private encodeFileName(value: string): string {
    return value
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')
  }

  private formatB2Error(status: number, payload: string | null): string {
    if (!payload) {
      return `B2 API 请求失败 (status ${status})`
    }
    try {
      const parsed = JSON.parse(payload) as { code?: string; message?: string }
      if (parsed?.code || parsed?.message) {
        const parts: string[] = []
        if (parsed.code) parts.push(`[${parsed.code}]`)
        if (parsed.message) parts.push(parsed.message)
        return `B2 API 请求失败 (status ${status}) ${parts.join(' ')}`
      }
    } catch {
      // ignore
    }
    return `B2 API 请求失败 (status ${status}) ${payload}`
  }
}

interface B2AuthorizeAccountResponse {
  authorizationToken?: string
  apiUrl?: string
  downloadUrl?: string
  apiInfo?: {
    storageApi?: {
      apiUrl?: string
      downloadUrl?: string
      bucketId?: string | null
      bucketName?: string | null
    }
  }
  allowed?: {
    bucketId?: string | null
    bucketName?: string | null
  }
}

interface AuthorizationState {
  token: string
  apiUrl: string
  downloadUrl: string
  allowedBucketId: string | null
  allowedBucketName: string | null
  expiresAt: number
}

interface B2BucketResponse {
  bucketId: string
  bucketName: string
}
