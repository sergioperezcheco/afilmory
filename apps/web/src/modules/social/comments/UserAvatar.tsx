import { clsxm as cn } from '@afilmory/utils'

interface UserAvatarProps {
  image?: string | null
  name?: string | null
  fallback?: string
  size?: number
  className?: string
}

export const UserAvatar = ({ image, name, fallback = '?', size = 36, className }: UserAvatarProps) => {
  const displayName = name || fallback
  const initial = displayName.slice(0, 1).toUpperCase()

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/80',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {image ? (
        <img src={image} alt={displayName} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  )
}
