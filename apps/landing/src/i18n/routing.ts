import { createNavigation } from 'next-intl/navigation'
import { defineRouting } from 'next-intl/routing'

import { defaultLocale, localePrefix, locales, pathnames } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix,
  pathnames,
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
