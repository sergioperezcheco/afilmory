import { clsxm as cn } from '@afilmory/utils'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { authApi } from '~/lib/api/auth'

export const SignInPanel = () => {
  const { t } = useTranslation()

  const { data: socialProviders } = useQuery({
    queryKey: ['socialProviders'],
    queryFn: authApi.getSocialProviders,
  })

  const handleSignIn = async (provider: string) => {
    try {
      const { url } = await authApi.signInSocial(provider)
      window.location.href = url
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  return (
    <div className="border-accent/10 flex items-center justify-between gap-3 border-t p-4">
      <span className="shrink-0 text-xs text-white/50">{t('comments.chooseProvider')}</span>
      <div className="flex items-center gap-2">
        {socialProviders?.providers.map((provider) => (
          <button
            type="button"
            key={provider.id}
            onClick={() => handleSignIn(provider.id)}
            className="bg-material-medium hover:bg-material-light flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white transition"
            aria-label={t('comments.signInWith', { provider: provider.name })}
          >
            <i className={cn(provider.icon, 'text-base')} />
            <span className="sr-only">{provider.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
