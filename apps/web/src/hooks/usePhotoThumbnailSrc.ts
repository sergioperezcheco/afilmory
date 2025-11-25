import type { PhotoManifestItem } from '@afilmory/builder'
import { useEffect, useMemo, useState } from 'react'

import { getDisplayAssetUrl, isSecureAccessRequired } from '~/lib/secure-asset'

export const usePhotoThumbnailSrc = (photo: PhotoManifestItem | null): string | null => {
  const secureAccess = isSecureAccessRequired()
  const fallback = useMemo(() => photo?.thumbnailUrl ?? null, [photo?.thumbnailUrl])
  const [src, setSrc] = useState<string | null>(fallback)

  useEffect(() => {
    let cancelled = false
    if (!photo) {
      setSrc(null)
      return
    }
    if (!secureAccess || !photo.thumbnailKey) {
      setSrc(photo.thumbnailUrl ?? null)
      return
    }
    getDisplayAssetUrl({
      objectKey: photo.thumbnailKey,
      intent: 'thumbnail',
      fallbackUrl: photo.thumbnailUrl ?? null,
    })
      .then((url) => {
        if (!cancelled) {
          setSrc(url)
        }
      })
      .catch((error) => {
        console.error('Failed to resolve secure thumbnail', error)
        if (!cancelled) {
          setSrc(photo.thumbnailUrl ?? null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [photo?.id, photo?.thumbnailKey, photo?.thumbnailUrl, secureAccess])

  return src
}
