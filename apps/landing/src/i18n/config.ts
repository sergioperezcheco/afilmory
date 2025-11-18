import type { Pathnames } from 'next-intl/routing'

export const locales = ['zh-CN', 'en'] as const

export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale = 'zh-CN'

export const localePrefix = 'always'

export const pathnames = {
  '/': '/',
  '/privacy': {
    'zh-CN': '/privacy',
    en: '/privacy',
  },
  '/terms': {
    'zh-CN': '/terms',
    en: '/terms',
  },
} satisfies Pathnames<typeof locales>
