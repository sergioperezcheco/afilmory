import { useTranslation } from 'react-i18next'

import type { Comment } from '~/lib/api/comments'

interface CommentInputProps {
  isMobile: boolean
  sessionUser: { name?: string | null; id?: string | null } | null
  replyTo: Comment | null
  setReplyTo: (comment: Comment | null) => void
  newComment: string
  setNewComment: (value: string) => void
  onSubmit: (content: string) => void
}

export const CommentInput = ({
  isMobile,
  sessionUser,
  replyTo,
  setReplyTo,
  newComment,
  setNewComment,
  onSubmit,
}: CommentInputProps) => {
  const { t } = useTranslation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(newComment)
  }

  return (
    <div className="border-accent/10 shrink-0 border-t p-4">
      {replyTo ? (
        <div className="border-accent/20 bg-accent/5 mb-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs text-white/80">
          <div className="flex items-center gap-2">
            <i className="i-mingcute-reply-line text-accent" />
            <span>
              {t('comments.replyingTo', {
                user: replyTo.userId.slice(-6),
              })}
            </span>
          </div>
          <button type="button" className="text-white/50 transition hover:text-white" onClick={() => setReplyTo(null)}>
            {t('comments.cancelReply')}
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/80">
          {(sessionUser?.name || sessionUser?.id || 'G')[0]}
        </div>

        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('comments.placeholder')}
            rows={isMobile ? 2 : 1}
            className="bg-material-medium focus:ring-accent/50 w-full resize-none rounded-lg border-0 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!newComment.trim()}
          className="bg-accent shadow-accent/20 flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          <i className="i-mingcute-send-line" />
        </button>
      </form>
      <p className="mt-2 text-xs text-white/40">{t('comments.hint')}</p>
      {!sessionUser && <p className="mt-1 text-xs text-white/50">{t('comments.loginRequired')}</p>}
    </div>
  )
}
