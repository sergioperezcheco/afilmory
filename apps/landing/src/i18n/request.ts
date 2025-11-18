import { getRequestConfig } from 'next-intl/server'

import type { AppLocale } from './config'
import { defaultLocale, locales } from './config'

const resolveLocale = (locale?: string | null): AppLocale =>
  locales.find((item) => item === locale) ?? defaultLocale

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const segmentLocale = await requestLocale
  const targetLocale = resolveLocale(locale ?? segmentLocale)

  return {
    locale: targetLocale,
    messages: (await import(`../locales/${targetLocale}.json`)).default,
  }
})
