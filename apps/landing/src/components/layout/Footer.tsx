'use client'

import { useTranslations } from 'next-intl'

import { Link } from '~/i18n/routing'

export const Footer = () => {
  const t = useTranslations('Footer')
  return (
    <footer className="relative overflow-hidden rounded-t-[48px] border border-white/10 bg-linear-to-b from-black/80 via-black/60 to-black px-6 py-14 text-white sm:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 left-10 h-64 w-64 rounded-full bg-white/10 blur-[140px]" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-purple-500/10 blur-[160px]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent opacity-60" />
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <p className="text-xs tracking-[0.5em] text-white/50 uppercase">
              {t('eyebrow')}
            </p>
            <h3 className="font-serif text-4xl leading-tight">{t('title')}</h3>
            <p className="text-sm text-white/70">{t('description')}</p>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 text-sm text-white/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p>{t('copyright')}</p>
            <div className="flex gap-6 text-white/70">
              <Link href="/privacy" className="transition hover:text-white">
                {t('privacy')}
              </Link>
              <Link href="/terms" className="transition hover:text-white">
                {t('terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
