'use client'

import { m, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { NocturneButton } from '~/components/landing/NocturneButton'
import { Link } from '~/i18n/routing'
import { blur, radius, transition } from '~/lib/design-tokens'
import { clsxm } from '~/lib/helper'

export const PageHeader = () => {
  const { scrollY } = useScroll()
  const [scrollPos, setScrollPos] = useState(0)

  const t = useTranslations('Header')
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrollPos(latest)
  })

  const scrolled = scrollPos > 60
  const headerOpacity = useTransform(scrollY, [0, 100], [0.95, 1])

  const headerClasses = useMemo(
    () =>
      clsxm(
        'pointer-events-auto relative flex items-center justify-between gap-3 overflow-hidden',
        radius.xl,
        'border pl-4 pr-3 py-2.5',
        transition.slow,
        scrolled
          ? 'border-white/10 bg-black/90 shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
          : 'border-white/8 bg-black/40',
        blur['2xl'],
      ),
    [scrolled],
  )

  const handleGetStarted = () => {
    document
      .querySelector('#create-space')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <m.header
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none fixed top-4 left-1/2 z-50 w-full max-w-6xl -translate-x-1/2 px-4"
    >
      <m.div
        className={headerClasses}
        style={{
          opacity: headerOpacity,
        }}
      >
        {/* 背景微光效果 */}
        <div
          className={clsxm(
            'pointer-events-none absolute inset-0 opacity-30',
            scrolled
              ? 'bg-linear-to-r from-white/5 via-transparent to-white/5'
              : 'bg-linear-to-r from-white/8 via-transparent to-white/8',
          )}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_60%)]" />

        {/* Logo 区域 */}
        <Link
          href="/"
          className="group relative z-10 flex items-center gap-3 transition-transform hover:scale-[1.02]"
        >
          <m.div
            className={clsxm(
              'flex size-10 items-center justify-center',
              radius.lg,
              'border transition-all duration-300',
              scrolled
                ? 'border-white/20 bg-white/8 shadow-[0_2px_8px_rgba(255,255,255,0.1)]'
                : 'border-white/15 bg-white/5',
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="font-serif text-base font-medium tracking-wider text-white">
              A
            </span>
          </m.div>
          <div className="hidden sm:block">
            <p className="font-serif text-base font-medium tracking-wide text-white">
              {t('brand')}
            </p>
            <p
              className={clsxm(
                'text-[10px] tracking-[0.3em] uppercase transition-colors',
                scrolled ? 'text-white/60' : 'text-white/50',
              )}
            >
              {t('tagline')}
            </p>
          </div>
        </Link>

        {/* CTA 按钮组 */}
        <div className="relative z-10 flex items-center gap-2">
          <NocturneButton
            onClick={handleGetStarted}
            className="px-5 py-2 text-xs"
          >
            {t('cta')}
          </NocturneButton>
        </div>
      </m.div>
    </m.header>
  )
}
