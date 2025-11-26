import { useEffect, useState } from 'react'

import { formatRelativeTime } from './format'

interface RelativeTimeProps {
  timestamp: string
  locale: string
  className?: string
}

export const RelativeTime = ({ timestamp, locale, className }: RelativeTimeProps) => {
  const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(timestamp, locale))

  useEffect(() => {
    const updateRelativeTime = () => {
      setRelativeTime(formatRelativeTime(timestamp, locale))
    }

    const getUpdateInterval = () => {
      const diffMs = Date.now() - new Date(timestamp).getTime()
      const diffMinutes = diffMs / 60000

      if (diffMinutes < 1) return 10000 // Update every 10 seconds for the first minute
      if (diffMinutes < 60) return 60000 // Update every minute for the first hour
      if (diffMinutes < 1440) return 300000 // Update every 5 minutes for the first day
      return 3600000 // Update every hour after that
    }

    const interval = setInterval(updateRelativeTime, getUpdateInterval())

    return () => clearInterval(interval)
  }, [timestamp, locale])

  return <span className={className}>{relativeTime}</span>
}
