import { memo } from 'react'

import type { Comment } from '~/lib/api/comments'

import { CommentActionBar } from './CommentActionBar'
import { CommentContent } from './CommentContent'
import { CommentHeader } from './CommentHeader'

interface CommentCardProps {
  comment: Comment
  parent: Comment | null
  reacted: boolean
  onReply: () => void
  onToggleReaction: () => void
  authorName: (comment: Comment) => string
  locale: string
}

export const CommentCard = memo(
  ({ comment, parent, reacted, onReply, onToggleReaction, authorName, locale }: CommentCardProps) => {
    return (
      <div
        className="border-accent/10 relative overflow-hidden rounded-2xl border bg-white/5 p-3 backdrop-blur-xl"
        style={{
          boxShadow:
            '0 8px 32px color-mix(in srgb, var(--color-accent) 8%, transparent), 0 4px 16px color-mix(in srgb, var(--color-accent) 6%, transparent)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              'linear-gradient(120deg, color-mix(in srgb, var(--color-accent) 7%, transparent), transparent 40%, color-mix(in srgb, var(--color-accent) 7%, transparent))',
          }}
        />
        <div className="relative z-10 flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/80">
            {(authorName(comment) ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 space-y-2">
            <CommentHeader comment={comment} author={authorName(comment)} locale={locale} />
            <CommentContent comment={comment} parent={parent} authorName={authorName} />
            <CommentActionBar
              reacted={reacted}
              reactionCount={comment.reactionCounts.like ?? 0}
              onReply={onReply}
              onToggleReaction={onToggleReaction}
            />
          </div>
        </div>
      </div>
    )
  },
)
CommentCard.displayName = 'CommentCard'
