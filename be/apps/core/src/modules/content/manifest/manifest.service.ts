import type { AfilmoryManifest, CameraInfo, LensInfo, PhotoManifestItem } from '@afilmory/builder'
import { CURRENT_PHOTO_MANIFEST_VERSION, photoAssets } from '@afilmory/db'
import { APP_GLOBAL_PREFIX } from 'core/app.constants'
import { DbAccessor } from 'core/database/database.provider'
import { normalizedBoolean } from 'core/helpers/normalize.helper'
import { SettingService } from 'core/modules/configuration/setting/setting.service'
import { SystemSettingService } from 'core/modules/configuration/system-setting/system-setting.service'
import { requireTenantContext } from 'core/modules/platform/tenant/tenant.context'
import { and, eq, inArray } from 'drizzle-orm'
import { injectable } from 'tsyringe'

@injectable()
export class ManifestService {
  constructor(
    private readonly dbAccessor: DbAccessor,
    private readonly settingService: SettingService,
    private readonly systemSettingService: SystemSettingService,
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

    const secureAccessEnabled = await this.isSecureAccessEnabled(tenant.tenant.id)
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

  private async isSecureAccessEnabled(tenantId: string): Promise<boolean> {
    const activeProvider = await this.settingService.get('builder.storage.activeProvider', { tenantId })
    if (activeProvider?.trim() === 'managed') {
      return await this.systemSettingService.isManagedStorageSecureAccessEnabled()
    }
    const value = await this.settingService.get('photo.storage.secureAccess', { tenantId })
    return normalizedBoolean(value ?? 'false')
  }

  private createProxyUrl(storageKey: string, intent = 'photo'): string {
    const params = new URLSearchParams()
    params.set('objectKey', storageKey)
    if (intent) {
      params.set('intent', intent)
    }
    return `${APP_GLOBAL_PREFIX}/storage/sign?${params.toString()}`
  }
}
