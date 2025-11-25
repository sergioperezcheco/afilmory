import { injectConfig } from '~/config'

const SIGN_ENDPOINT = '/api/storage/sign'
const EXPIRATION_SKEW_MS = 5_000

export type AssetDescriptor =
  | string
  | {
      objectKey?: string | null
      intent: string
      fallbackUrl?: string | null
    }

export interface ResolvedAssetRequest {
  url: string
  headers: Record<string, string>
  expiresAt: number
}

type CachedDisplayEntry = {
  url: string
  expiresAt: number
  isObjectUrl: boolean
}

const signedRequestCache = new Map<string, ResolvedAssetRequest>()
const pendingSignedRequests = new Map<string, Promise<ResolvedAssetRequest>>()
const displayUrlCache = new Map<string, CachedDisplayEntry>()

let inferredSecureAccess: boolean | null = null

export const isSecureAccessRequired = (): boolean => {
  if (typeof injectConfig.secureAccessEnabled === 'boolean') {
    return injectConfig.secureAccessEnabled
  }
  if (inferredSecureAccess !== null) {
    return inferredSecureAccess
  }
  if (typeof window !== 'undefined' && '__MANIFEST__' in window) {
    try {
      const manifest = (window as typeof window & { __MANIFEST__?: { data?: Array<{ thumbnailKey?: unknown }> } })
        .__MANIFEST__
      if (manifest?.data && Array.isArray(manifest.data)) {
        inferredSecureAccess = manifest.data.some((entry) => Boolean(entry?.thumbnailKey))
        return inferredSecureAccess
      }
    } catch {
      // ignore
    }
  }
  inferredSecureAccess = false
  return inferredSecureAccess
}

const needsSecureAccess = (): boolean => isSecureAccessRequired()

const cacheKeyFor = (objectKey: string, intent: string, suffix = ''): string => {
  return `${objectKey}::${intent}${suffix ? `::${suffix}` : ''}`
}

const parseExpiresAt = (value: string | undefined): number => {
  if (!value) {
    return Date.now() + 10 * 60 * 1000
  }
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return Date.now() + 10 * 60 * 1000
  }
  return timestamp
}

const requestSignedUrl = async (objectKey: string, intent: string): Promise<ResolvedAssetRequest> => {
  const params = new URLSearchParams()
  params.set('objectKey', objectKey)
  if (intent) {
    params.set('intent', intent)
  }
  params.set('format', 'json')

  const response = await fetch(`${SIGN_ENDPOINT}?${params.toString()}`, {
    headers: {
      accept: 'application/json',
    },
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to sign storage asset (status ${response.status})`)
  }

  const payload = (await response.json()) as {
    url: string
    expiresAt: string
    headers?: Record<string, string>
  }

  return {
    url: payload.url,
    headers: payload.headers ?? {},
    expiresAt: parseExpiresAt(payload.expiresAt),
  }
}

const ensureSignedRequest = async (objectKey: string, intent: string): Promise<ResolvedAssetRequest> => {
  const key = cacheKeyFor(objectKey, intent)
  const cached = signedRequestCache.get(key)
  if (cached && cached.expiresAt - EXPIRATION_SKEW_MS > Date.now()) {
    return cached
  }

  let pending = pendingSignedRequests.get(key)
  if (!pending) {
    pending = requestSignedUrl(objectKey, intent)
      .then((result) => {
        signedRequestCache.set(key, result)
        return result
      })
      .finally(() => {
        pendingSignedRequests.delete(key)
      })
    pendingSignedRequests.set(key, pending)
  }

  return await pending
}

export const resolveAssetRequest = async (descriptor: AssetDescriptor): Promise<ResolvedAssetRequest> => {
  if (typeof descriptor === 'string') {
    return {
      url: descriptor,
      headers: {},
      expiresAt: Number.MAX_SAFE_INTEGER,
    }
  }

  if (!needsSecureAccess()) {
    const fallback = descriptor.fallbackUrl
    if (!fallback) {
      throw new Error('Missing fallback URL for non-secure asset descriptor')
    }
    return {
      url: fallback,
      headers: {},
      expiresAt: Number.MAX_SAFE_INTEGER,
    }
  }

  const objectKey = descriptor.objectKey?.trim()
  if (!objectKey) {
    throw new Error('Secure access is enabled but object key is missing')
  }

  return await ensureSignedRequest(objectKey, descriptor.intent)
}

const requiresCustomHeaders = (headers: Record<string, string>): boolean => {
  return Object.keys(headers).length > 0
}

export const getDisplayAssetUrl = async (descriptor: AssetDescriptor): Promise<string> => {
  if (typeof descriptor === 'string') {
    return descriptor
  }

  if (!needsSecureAccess()) {
    return descriptor.fallbackUrl ?? ''
  }

  const objectKey = descriptor.objectKey?.trim()
  if (!objectKey) {
    throw new Error('Secure asset descriptor is missing object key')
  }

  const cacheKey = cacheKeyFor(objectKey, descriptor.intent, 'display')
  const cached = displayUrlCache.get(cacheKey)
  if (cached && cached.expiresAt - EXPIRATION_SKEW_MS > Date.now()) {
    return cached.url
  }

  const request = await resolveAssetRequest(descriptor)
  let finalUrl = request.url
  let isObjectUrl = false

  if (requiresCustomHeaders(request.headers)) {
    const response = await fetch(request.url, {
      headers: request.headers,
      credentials: 'omit',
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch secured asset (status ${response.status})`)
    }
    const blob = await response.blob()
    finalUrl = URL.createObjectURL(blob)
    isObjectUrl = true
  }

  displayUrlCache.set(cacheKey, {
    url: finalUrl,
    expiresAt: request.expiresAt,
    isObjectUrl,
  })

  if (isObjectUrl) {
    const ttl = Math.max(request.expiresAt - Date.now(), 0)
    setTimeout(() => {
      const entry = displayUrlCache.get(cacheKey)
      if (entry && entry.url === finalUrl) {
        displayUrlCache.delete(cacheKey)
        try {
          URL.revokeObjectURL(finalUrl)
        } catch {
          // ignore
        }
      }
    }, ttl || EXPIRATION_SKEW_MS)
  }

  return finalUrl
}

export const invalidateDisplayAsset = (objectKey: string, intent: string) => {
  const cacheKey = cacheKeyFor(objectKey, intent, 'display')
  const entry = displayUrlCache.get(cacheKey)
  if (entry?.isObjectUrl) {
    try {
      URL.revokeObjectURL(entry.url)
    } catch {
      // ignore
    }
  }
  displayUrlCache.delete(cacheKey)
}
