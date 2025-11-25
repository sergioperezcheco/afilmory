import { photoLoader } from '@afilmory/data'
import { ScrollArea, Thumbhash } from '@afilmory/ui'

import { usePhotoThumbnailSrc } from '~/hooks/usePhotoThumbnailSrc'

export const Component = () => {
  const photos = photoLoader.getPhotos()

  return (
    <ScrollArea rootClassName="h-screen">
      <div className="columns-4 gap-0">
        {photos.map((photo) => (
          <DebugPhotoTile key={photo.id} photo={photo} />
        ))}
      </div>
    </ScrollArea>
  )
}

const DebugPhotoTile = ({ photo }: { photo: ReturnType<typeof photoLoader.getPhotos>[number] }) => {
  const thumbnailSrc = usePhotoThumbnailSrc(photo)

  return (
    <div
      className="group relative m-2"
      style={{
        paddingBottom: `${(photo.height / photo.width) * 100}%`,
      }}
    >
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt={photo.title}
          height={photo.height}
          width={photo.width}
          className="absolute inset-0"
        />
      ) : (
        <div className="bg-fill-secondary absolute inset-0" />
      )}
      {photo.thumbHash && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
          <Thumbhash thumbHash={photo.thumbHash} />
        </div>
      )}
    </div>
  )
}
