import { useTranslation } from 'react-i18next'

import type { Comment } from '~/lib/api/comments'

interface CommentContentProps {
  comment: Comment
  parent: Comment | null
  authorName: (comment: Comment) => string
}

export const CommentContent = ({ comment, parent, authorName }: CommentContentProps) => {
  const { t } = useTranslation()
  return (
    <>
      {parent ? (
        <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-white/70">
          <div className="mb-1 flex items-center gap-2 text-[11px] tracking-wide text-white/40 uppercase">
            <i className="i-mingcute-corner-down-right-line" />
            {t('comments.replyingTo', { user: authorName(parent) })}
          </div>
          <p className="line-clamp-3 text-sm leading-relaxed text-white/70">{parent.content}</p>
        </div>
      ) : null}

      <p className="text-sm leading-relaxed text-white/85">{comment.content}</p>
    </>
  )
}
