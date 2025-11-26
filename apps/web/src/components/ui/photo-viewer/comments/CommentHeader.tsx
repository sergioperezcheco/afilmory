import { useTranslation } from 'react-i18next'

import type { Comment } from '~/lib/api/comments'

import { formatRelativeTime } from './format'

export const CommentHeader = ({ comment, author, locale }: { comment: Comment; author: string; locale: string }) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-sm font-medium text-white/90">{author}</span>
      <span className="text-xs text-white/45">{formatRelativeTime(comment.createdAt, locale)}</span>
      {comment.status === 'pending' && (
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200/80 uppercase">
          {t('comments.pending')}
        </span>
      )}
    </div>
  )
}
