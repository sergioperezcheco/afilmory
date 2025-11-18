import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server'

import { HydrationEndDetector } from '~/components/common/HydrationEndDetector'
import { ScrollTop } from '~/components/common/ScrollTop'
import { NocturneBackground } from '~/components/landing/NocturneBackground'
import { Footer } from '~/components/layout'
import { PageHeader } from '~/components/layout/PageHeader'
import { Root } from '~/components/layout/root/Root'
import type { AppLocale } from '~/i18n/config'
import { defaultLocale, locales } from '~/i18n/config'
import { sansFont, serifFont } from '~/lib/fonts'

import { Providers } from '../../providers/root'
import { ClientInit } from '../ClientInit'
import { init } from '../init'
import { InitInClient } from '../InitInClient'

init()

const siteUrl = 'https://afilmory.art'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export function generateViewport(): Viewport {
  return {
    themeColor: [
      { media: '(prefers-color-scheme: dark)', color: '#000212' },
      { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    ],
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale as AppLocale
  const isSupported = locales.includes(locale)
  const targetLocale = isSupported ? locale : defaultLocale
  const t = await getTranslations({ locale: targetLocale, namespace: 'Meta' })

  const title = t('title')
  const description = t('description')
  const keywords = t('keywords')

  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: `%s - ${title}`,
      default: title,
    },
    description,
    keywords,
    openGraph: {
      title: {
        default: title,
        template: `%s | ${title}`,
      },
      description,
      siteName: title,
      locale: targetLocale.replace('-', '_'),
      type: 'website',
      url: siteUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale as AppLocale

  if (!locales.includes(locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <>
      <ClientInit />
      <html lang={locale} suppressHydrationWarning>
        <head>
          <HydrationEndDetector />
        </head>
        <body
          className={`${sansFont.variable} ${serifFont.variable} m-0 h-full p-0 font-sans`}
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>
              <div data-theme>
                <Root>
                  <NocturneBackground />
                  <PageHeader />
                  {children}
                  <Footer />
                </Root>
              </div>
            </Providers>
          </NextIntlClientProvider>

          <ScrollTop />
          <InitInClient />
        </body>
      </html>
    </>
  )
}
