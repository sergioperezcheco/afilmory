import createMiddleware from 'next-intl/middleware'

import {
  defaultLocale,
  localePrefix,
  locales,
  pathnames,
} from './src/i18n/config'

export default createMiddleware({
  defaultLocale,
  locales,
  localePrefix,
  pathnames,
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
