import type { AfilmoryManifest } from '@afilmory/builder'
import { CURRENT_MANIFEST_VERSION, migrateManifest } from '@afilmory/builder'
import type { ManifestVersion } from '@afilmory/builder/manifest/version.js'
import type { PhotoAssetManifest } from '@afilmory/db'

export type PhotoAssetManifestPayload = PhotoAssetManifest | null

export function ensureCurrentPhotoAssetManifest(manifest: PhotoAssetManifestPayload): {
  manifest: PhotoAssetManifest | null
  changed: boolean
} {
  if (!manifest?.data) {
    return { manifest: null, changed: false }
  }

  const requiresMigration = manifest.version !== CURRENT_MANIFEST_VERSION || !hasValidFormat(manifest.data.format)
  if (!requiresMigration) {
    return { manifest, changed: false }
  }

  const migrated = migrateSingleManifestItem(manifest)
  if (!migrated) {
    return { manifest, changed: false }
  }

  return { manifest: migrated, changed: true }
}

function migrateSingleManifestItem(input: PhotoAssetManifest): PhotoAssetManifest | null {
  const wrapper: AfilmoryManifest = {
    version: input.version as ManifestVersion,
    data: [structuredClone(input.data)],
    cameras: [],
    lenses: [],
  }

  const migrated = migrateManifest(wrapper, CURRENT_MANIFEST_VERSION)
  const migratedItem = migrated.data[0]
  if (!migratedItem) {
    return null
  }

  return {
    version: CURRENT_MANIFEST_VERSION,
    data: migratedItem,
  }
}

function hasValidFormat(format: string | undefined | null): boolean {
  return typeof format === 'string' && format.trim().length > 0
}
