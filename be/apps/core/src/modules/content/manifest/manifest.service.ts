import type {
  AfilmoryManifest,
  CameraInfo,
  LensInfo,
  ManagedStorageConfig,
  PhotoManifestItem,
  S3CompatibleConfig,
  StorageConfig,
} from '@afilmory/builder'
import { DEFAULT_DIRECTORY as DEFAULT_THUMBNAIL_DIRECTORY } from '@afilmory/builder/plugins/thumbnail-storage/shared.js'
import { CURRENT_PHOTO_MANIFEST_VERSION, photoAssets } from '@afilmory/db'
import { APP_GLOBAL_PREFIX } from 'core/app.constants'
import { DbAccessor } from 'core/database/database.provider'
import { StorageAccessService } from 'core/modules/content/photo/access/storage-access.service'
import { PhotoStorageService } from 'core/modules/content/photo/storage/photo-storage.service'
import { requireTenantContext } from 'core/modules/platform/tenant/tenant.context'
import { and, eq, inArray } from 'drizzle-orm'
import { injectable } from 'tsyringe'

const DEFAULT_THUMBNAIL_EXTENSION = '.jpg'

@injectable()
export class ManifestService {
  constructor(
    private readonly dbAccessor: DbAccessor,
    private readonly photoStorageService: PhotoStorageService,
    private readonly storageAccessService: StorageAccessService,
  ) {}

  async getManifest(): Promise<AfilmoryManifest> {
    const tenant = requireTenantContext()
    const db = this.dbAccessor.get()

    const records = await db
      .select({
        manifest: photoAssets.manifest,
      })
      .from(photoAssets)
      .where(and(eq(photoAssets.tenantId, tenant.tenant.id), inArray(photoAssets.syncStatus, ['synced', 'conflict'])))

    if (records.length === 0) {
      return {
        version: CURRENT_PHOTO_MANIFEST_VERSION,
        data: [],
        cameras: [],
        lenses: [],
      }
    }

    const { storageConfig } = await this.photoStorageService.resolveConfigForTenant(tenant.tenant.id)
    const secureAccessEnabled = await this.storageAccessService.resolveSecureAccessPreference(
      storageConfig,
      tenant.tenant.id,
    )
    const items: PhotoManifestItem[] = []

    for (const record of records) {
      const item = record.manifest?.data
      if (!item) {
        continue
      }
      const normalized = structuredClone(item)
      if (secureAccessEnabled) {
        if (normalized.s3Key) {
          normalized.originalUrl = this.createProxyUrl(normalized.s3Key)
        }
        if (normalized.video?.type === 'live-photo' && normalized.video.s3Key) {
          normalized.video.videoUrl = this.createProxyUrl(normalized.video.s3Key, 'live-video')
        }
        const thumbnailKey = this.resolveThumbnailStorageKey(storageConfig, normalized.id)
        normalized.thumbnailKey = thumbnailKey
        normalized.thumbnailUrl = thumbnailKey ? this.createProxyUrl(thumbnailKey, 'thumbnail') : null
      }
      items.push(normalized)
    }

    const sorted = this.sortByDateDesc(items)
    const cameras = this.buildCameraCollection(sorted)
    const lenses = this.buildLensCollection(sorted)

    return {
      version: this.resolveManifestVersion(records),
      data: sorted,
      cameras,
      lenses,
    }
  }

  private resolveManifestVersion(
    records: Array<{ manifest: { version: typeof CURRENT_PHOTO_MANIFEST_VERSION } | null }>,
  ): typeof CURRENT_PHOTO_MANIFEST_VERSION {
    for (const record of records) {
      const version = record.manifest?.version
      if (version) {
        return version
      }
    }
    return CURRENT_PHOTO_MANIFEST_VERSION
  }

  private sortByDateDesc(items: PhotoManifestItem[]): PhotoManifestItem[] {
    return [...items].sort((a, b) => this.toTimestamp(b.dateTaken) - this.toTimestamp(a.dateTaken))
  }

  private toTimestamp(value: string | null | undefined): number {
    if (!value) {
      return 0
    }
    const time = Date.parse(value)
    return Number.isNaN(time) ? 0 : time
  }

  private buildCameraCollection(manifest: PhotoManifestItem[]): CameraInfo[] {
    const cameraMap = new Map<string, CameraInfo>()

    for (const photo of manifest) {
      const make = photo.exif?.Make?.trim()
      const model = photo.exif?.Model?.trim()
      if (!make || !model) {
        continue
      }

      const displayName = `${make} ${model}`
      if (!cameraMap.has(displayName)) {
        cameraMap.set(displayName, {
          make,
          model,
          displayName,
        })
      }
    }

    return Array.from(cameraMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  private buildLensCollection(manifest: PhotoManifestItem[]): LensInfo[] {
    const lensMap = new Map<string, LensInfo>()

    for (const photo of manifest) {
      const lensModel = photo.exif?.LensModel?.trim()
      if (!lensModel) {
        continue
      }

      const lensMake = photo.exif?.LensMake?.trim()
      const displayName = lensMake ? `${lensMake} ${lensModel}` : lensModel

      if (!lensMap.has(displayName)) {
        lensMap.set(displayName, {
          make: lensMake,
          model: lensModel,
          displayName,
        })
      }
    }

    return Array.from(lensMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  private createProxyUrl(storageKey: string, intent = 'photo'): string {
    const params = new URLSearchParams()
    params.set('objectKey', storageKey)
    if (intent) {
      params.set('intent', intent)
    }
    return `${APP_GLOBAL_PREFIX}/storage/sign?${params.toString()}`
  }

  private resolveThumbnailStorageKey(storageConfig: StorageConfig, photoId: string): string | null {
    if (!photoId) {
      return null
    }
    const fileName = `${photoId}${DEFAULT_THUMBNAIL_EXTENSION}`
    const prefix = this.resolveThumbnailRemotePrefix(storageConfig)
    if (!prefix) {
      return fileName
    }
    return this.joinSegments(prefix, fileName)
  }

  private resolveThumbnailRemotePrefix(storageConfig: StorageConfig): string | null {
    const directory = this.normalizeStorageSegment(DEFAULT_THUMBNAIL_DIRECTORY)
    if (!directory) {
      return null
    }

    switch (storageConfig.provider) {
      case 'managed': {
        const managedConfig = storageConfig as ManagedStorageConfig
        const managedBase = this.extractManagedBasePrefix(managedConfig)
        return this.joinSegments(managedBase, directory)
      }
      case 's3':
      case 'oss':
      case 'cos': {
        const s3Config = storageConfig as S3CompatibleConfig
        const base = this.normalizeStorageSegment(s3Config.prefix)
        return this.joinSegments(base, directory)
      }
      default: {
        return directory
      }
    }
  }

  private extractManagedBasePrefix(config: ManagedStorageConfig): string | null {
    if (!config.basePrefix) {
      return null
    }
    return this.normalizeStorageSegment(config.basePrefix)
  }

  private normalizeStorageSegment(value?: string | null): string | null {
    if (typeof value !== 'string') {
      return null
    }
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const normalized = trimmed.replaceAll('\\', '/').replaceAll(/^\/+|\/+$/g, '')
    return normalized.length > 0 ? normalized : null
  }

  private joinSegments(...segments: Array<string | null | undefined>): string | null {
    const filtered = segments.filter((segment): segment is string => typeof segment === 'string' && segment.length > 0)
    if (filtered.length === 0) {
      return null
    }
    return filtered.map((segment) => segment.replaceAll(/^\/+|\/+$/g, '')).join('/')
  }
}
