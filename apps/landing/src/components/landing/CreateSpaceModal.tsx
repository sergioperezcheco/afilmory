'use client'

import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { API_URL } from '~/constants/env'

import { NocturneButton } from './NocturneButton'

interface CreateSpaceModalProps {
  isOpen: boolean
  onClose: () => void
}

interface TenantSlugCheckResponse {
  ok?: boolean
  message?: string
  code?: number
  next_url?: string
  nextUrl?: string
  redirect_url?: string
  redirectUrl?: string
}

const API_BASE_URL = API_URL.replace(/\/$/, '')
const SLUG_CHECK_ENDPOINT = `${API_BASE_URL || ''}/tenant/check-slug`

export const CreateSpaceModal = ({
  isOpen,
  onClose,
}: CreateSpaceModalProps) => {
  const [subdomain, setSubdomain] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState('')
  const t = useTranslations('CreateSpaceModal')
  const descriptionLines = t.raw('descriptionLines') as string[]
  const tips = t.raw('tips') as string[]

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replaceAll(/[^a-z0-9-]/g, '')
    setSubdomain(value)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subdomain) {
      setError(t('validations.required'))
      return
    }

    if (subdomain.length < 3) {
      setError(t('validations.minLength'))
      return
    }

    setError('')
    setIsChecking(true)
    try {
      const response = await fetch(SLUG_CHECK_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ slug: subdomain }),
      })

      let payload: TenantSlugCheckResponse | null = null
      try {
        payload = (await response.json()) as TenantSlugCheckResponse
      } catch {
        payload = null
      }

      if (!response.ok || !payload?.ok) {
        const message = payload?.message ?? t('errors.generic')
        setError(message)
        return
      }

      const nextUrl =
        payload.next_url ??
        payload.nextUrl ??
        payload.redirect_url ??
        payload.redirectUrl ??
        null

      if (!nextUrl) {
        setError(t('errors.missingRedirect'))
        return
      }

      window.location.href = nextUrl
    } catch {
      setError(t('errors.network'))
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-100 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal 内容 */}
          <div className="fixed inset-0 z-101 flex items-center justify-center p-4">
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg overflow-hidden rounded-4xl border border-white/10 bg-linear-to-b from-[#0a0a0a] via-[#050505] to-black shadow-[0_30px_120px_rgba(0,0,0,0.9)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 背景装饰 */}
              <div className="pointer-events-none absolute inset-0 opacity-40">
                <div className="absolute inset-x-12 inset-y-10 rounded-4xl bg-[radial-gradient(circle_at_top,#2a2a2a,transparent_70%)] blur-3xl" />
              </div>

              {/* 内容区域 */}
              <div className="relative p-8 sm:p-10">
                {/* 关闭按钮 */}
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-6 right-6 flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                  aria-label={t('closeLabel')}
                >
                  <i className="i-lucide-x text-lg" />
                </button>

                {/* 标题区域 */}
                <div className="mb-8 text-center">
                  <p className="text-xs tracking-[0.5em] text-white/40 uppercase">
                    {t('eyebrow')}
                  </p>
                  <h2 className="mt-4 font-serif text-3xl leading-tight text-white sm:text-4xl">
                    {t('title')}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-white/70">
                    {descriptionLines.map((line, index) => (
                      <span key={line}>
                        {line}
                        {index === 0 && <br />}
                      </span>
                    ))}
                  </p>
                </div>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 输入框 */}
                  <div className="space-y-3">
                    <label className="block text-xs tracking-wider text-white/60">
                      {t('fieldLabel')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={subdomain}
                        onChange={handleSubdomainChange}
                        placeholder={t('fieldPlaceholder')}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 pr-32 text-base text-white transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/8 focus:outline-none"
                        autoFocus
                      />
                      <div className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-sm text-white/50">
                        {t('domainSuffix')}
                      </div>
                    </div>
                    {error && (
                      <p className="text-xs text-red-400/80">{error}</p>
                    )}
                  </div>

                  {/* 提示信息 */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="mb-2 text-xs font-medium tracking-wider text-white">
                      {t('tipsTitle')}
                    </p>
                    <ul className="space-y-1.5 text-xs leading-relaxed text-white/60">
                      {tips.map((tip) => (
                        <li key={tip}>• {tip}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 按钮组 */}
                  <div className="flex justify-center">
                    <NocturneButton
                      type="submit"
                      disabled={isChecking || !subdomain}
                      className="inline-block w-64 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isChecking
                        ? t('buttons.primaryPending')
                        : t('buttons.primaryIdle')}
                    </NocturneButton>
                  </div>
                </form>
              </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
