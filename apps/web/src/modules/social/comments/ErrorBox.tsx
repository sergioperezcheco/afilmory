import { useTranslation } from 'react-i18next'

import { useCommentsContext } from './context'

export const ErrorBox = () => {
  const { t } = useTranslation()
  const { methods } = useCommentsContext()

  return (
    <div className="glassmorphic-btn border-accent/20 flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-white/70">
      <i className="i-mingcute-alert-line text-accent text-xl" />
      <p className="text-sm">{t('comments.error')}</p>
      <button
        type="button"
        onClick={() => methods.loadMore()}
        className="bg-accent/90 hover:bg-accent/80 rounded-lg px-3 py-1 text-xs text-white"
      >
        {t('comments.retry')}
      </button>
    </div>
  )
}
