import fs from 'node:fs/promises'
import path from 'node:path'

import { decompressUint8Array } from '@afilmory/utils'
import type sharp from 'sharp'

import { HEIC_FORMATS } from '../constants/index.js'
import { extractExifData } from '../image/exif.js'
import { calculateHistogramAndAnalyzeTone } from '../image/histogram.js'
import { generateThumbnailAndBlurhash, thumbnailExists } from '../image/thumbnail.js'
import { workdir } from '../path.js'
import type { LocationInfo, PhotoManifestItem, PickedExif, ToneAnalysis } from '../types/photo.js'
import { getPhotoExecutionContext } from './execution-context.js'
import type { GeocodingProvider } from './geocoding.js'
import { createGeocodingProvider, extractLocationFromGPS, parseGPSCoordinates } from './geocoding.js'
import { getGlobalLoggers } from './logger-adapter.js'
import type { PhotoProcessorOptions } from './processor.js'

export interface ThumbnailResult {
  thumbnailUrl: string
  thumbnailBuffer: Buffer
  thumbHash: Uint8Array | null
}

/**
 * 处理缩略图和 blurhash
 * 优先复用现有数据，如果不存在或需要强制更新则重新生成
 */
export async function processThumbnailAndBlurhash(
  imageBuffer: Buffer,
  photoId: string,
  existingItem: PhotoManifestItem | undefined,
  options: PhotoProcessorOptions,
): Promise<ThumbnailResult> {
  const loggers = getGlobalLoggers()

  // 检查是否可以复用现有数据
  if (
    !options.isForceMode &&
    !options.isForceThumbnails &&
    existingItem?.thumbHash &&
    (await thumbnailExists(photoId))
  ) {
    try {
      const thumbnailPath = path.join(workdir, 'public/thumbnails', `${photoId}.jpg`)
      const thumbnailBuffer = await fs.readFile(thumbnailPath)
      const thumbnailUrl = `/thumbnails/${photoId}.jpg`

      loggers.blurhash.info(`复用现有 blurhash: ${photoId}`)
      loggers.thumbnail.info(`复用现有缩略图：${photoId}`)

      return {
        thumbnailUrl,
        thumbnailBuffer,
        thumbHash: decompressUint8Array(existingItem.thumbHash),
      }
    } catch (error) {
      loggers.thumbnail.warn(`读取现有缩略图失败，重新生成：${photoId}`, error)
      // 继续执行生成逻辑
    }
  }

  // 生成新的缩略图和 blurhash
  const result = await generateThumbnailAndBlurhash(
    imageBuffer,
    photoId,
    options.isForceMode || options.isForceThumbnails,
  )

  return {
    thumbnailUrl: result.thumbnailUrl!,
    thumbnailBuffer: result.thumbnailBuffer!,
    thumbHash: result.thumbHash!,
  }
}

/**
 * 处理 EXIF 数据
 * 优先复用现有数据，如果不存在或需要强制更新则重新提取
 */
export async function processExifData(
  imageBuffer: Buffer,
  rawImageBuffer: Buffer | undefined,
  photoKey: string,
  existingItem: PhotoManifestItem | undefined,
  options: PhotoProcessorOptions,
): Promise<PickedExif | null> {
  const loggers = getGlobalLoggers()

  // 检查是否可以复用现有数据
  if (!options.isForceMode && !options.isForceManifest && existingItem?.exif) {
    const photoId = path.basename(photoKey, path.extname(photoKey))
    loggers.exif.info(`复用现有 EXIF 数据：${photoId}`)
    return existingItem.exif
  }

  // 提取新的 EXIF 数据
  const ext = path.extname(photoKey).toLowerCase()
  const originalBuffer = HEIC_FORMATS.has(ext) ? rawImageBuffer : undefined

  return await extractExifData(imageBuffer, originalBuffer)
}

/**
 * 处理影调分析
 * 优先复用现有数据，如果不存在或需要强制更新则重新计算
 */
export async function processToneAnalysis(
  sharpInstance: sharp.Sharp,
  photoKey: string,
  existingItem: PhotoManifestItem | undefined,
  options: PhotoProcessorOptions,
): Promise<ToneAnalysis | null> {
  const loggers = getGlobalLoggers()

  // 检查是否可以复用现有数据
  if (!options.isForceMode && !options.isForceManifest && existingItem?.toneAnalysis) {
    const photoId = path.basename(photoKey, path.extname(photoKey))
    loggers.tone.info(`复用现有影调分析：${photoId}`)
    return existingItem.toneAnalysis
  }

  // 计算新的影调分析
  return await calculateHistogramAndAnalyzeTone(sharpInstance)
}

// ============ 地理编码相关 ============

// 坐标缓存（避免重复 API 调用）
// Key 格式："{lat},{lon}" 精确到小数点后4位（约10米精度）
const locationCache = new Map<string, LocationInfo | null>()

// 单例提供者（避免重复创建）
let cachedProvider: GeocodingProvider | null = null
let lastProviderConfig: string | null = null

/**
 * 处理位置数据（反向地理编码）
 * 优先复用现有数据，如果不存在或需要强制更新则进行地理编码
 */
export async function processLocationData(
  exifData: PickedExif | null,
  photoKey: string,
  existingItem: PhotoManifestItem | undefined,
  options: PhotoProcessorOptions,
): Promise<LocationInfo | null> {
  const loggers = getGlobalLoggers()

  try {
    // 获取配置
    const context = getPhotoExecutionContext()
    const config = context.builder.getConfig()
    const geocodingSettings = config.user?.geocoding ?? {
      enableGeocoding: false,
      geocodingProvider: 'auto',
    }

    // 检查是否启用地理编码
    if (!geocodingSettings.enableGeocoding) {
      return null
    }

    // 检查是否可以复用现有数据
    if (!options.isForceMode && !options.isForceManifest && existingItem?.location) {
      const photoId = path.basename(photoKey, path.extname(photoKey))
      loggers.location.info(`复用现有位置数据：${photoId}`)
      return existingItem.location
    }

    // 检查 EXIF 是否包含 GPS 数据
    if (!exifData) {
      return null
    }

    // 解析 GPS 坐标
    const { latitude, longitude } = parseGPSCoordinates(exifData)

    if (latitude === undefined || longitude === undefined) {
      return null
    }

    // 生成缓存 key（精确到小数点后4位）
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`

    // 检查缓存
    if (locationCache.has(cacheKey)) {
      const cached = locationCache.get(cacheKey)
      const photoId = path.basename(photoKey, path.extname(photoKey))
      loggers.location.info(`使用缓存的位置数据：${photoId} (${cacheKey})`)
      return cached ?? null
    }

    // 创建或复用地理编码提供者
    const providerType = geocodingSettings.geocodingProvider || 'auto'
    const providerConfigKey = `${providerType}:${geocodingSettings.mapboxToken || ''}:${geocodingSettings.nominatimBaseUrl || ''}`

    if (!cachedProvider || lastProviderConfig !== providerConfigKey) {
      cachedProvider = createGeocodingProvider(
        providerType,
        geocodingSettings.mapboxToken,
        geocodingSettings.nominatimBaseUrl,
      )
      lastProviderConfig = providerConfigKey
    }

    if (!cachedProvider) {
      loggers.location.warn('无法创建地理编码提供者')
      return null
    }

    // 调用反向地理编码 API
    const locationInfo = await extractLocationFromGPS(latitude, longitude, cachedProvider)

    // 缓存结果（包括 null）
    locationCache.set(cacheKey, locationInfo)

    return locationInfo
  } catch (error) {
    loggers.location.error('处理位置数据失败:', error)
    return null
  }
}
