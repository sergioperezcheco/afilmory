import clsx from 'clsx'
import { useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { Comment } from '~/lib/api/comments'

import { useCommentsContext } from './context'

interface CommentActionBarProps {
  reacted: boolean
  reactionCount: number
  comment: Comment
}

export const CommentActionBar = ({ reacted, reactionCount, comment }: CommentActionBarProps) => {
  const { t } = useTranslation()

  const { atoms, methods } = useCommentsContext()

  const handleReaction = useCallback(() => {
    methods.toggleReaction({ comment })
  }, [methods, comment])

  const setReplyTo = useSetAtom(atoms.replyToAtom)

  return (
    <div className="-ml-2 flex items-center gap-4 text-xs text-white/60">
      <button
        type="button"
        onClick={handleReaction}
        className={clsx(
          'flex items-center gap-1 rounded-full px-2 py-1 transition-colors',
          reacted ? 'bg-accent/20 text-white' : 'hover:bg-white/10',
        )}
      >
        <i className={reacted ? 'i-mingcute-heart-fill text-accent' : 'i-mingcute-heart-line'} />
        <span>{reactionCount}</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/10"
        onClick={() => setReplyTo(comment)}
      >
        <i className="i-mingcute-corner-down-right-line" />
        {t('comments.reply')}
      </button>
    </div>
  )
}
