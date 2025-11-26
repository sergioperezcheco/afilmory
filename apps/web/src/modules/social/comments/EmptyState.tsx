import { useTranslation } from 'react-i18next'

export const EmptyState = () => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <i className="i-mingcute-comment-line mb-3 text-4xl text-white/30" />
      <p className="text-sm text-white/50">{t('comments.empty')}</p>
    </div>
  )
}
