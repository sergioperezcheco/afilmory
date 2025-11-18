import { isClientSide, isDev } from '~/lib/env'

export const API_URL: string = (() => {
  if (isDev) return process.env.NEXT_PUBLIC_API_URL || '/api'

  if (isClientSide && process.env.NEXT_PUBLIC_CHINA_API_URL) {
    return process.env.NEXT_PUBLIC_CHINA_API_URL
  }

  return process.env.NEXT_PUBLIC_API_URL || '/api'
})() as string
export const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || ''
