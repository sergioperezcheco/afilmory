import clsx from 'clsx'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface CommentActionBarProps {
  reacted: boolean
  reactionCount: number
  onReply: () => void
  onToggleReaction: () => void
}

export const CommentActionBar = ({ reacted, reactionCount, onReply, onToggleReaction }: CommentActionBarProps) => {
  const { t } = useTranslation()
  const handleReaction = useCallback(() => {
    onToggleReaction()
  }, [onToggleReaction])

  return (
    <div className="flex items-center gap-4 text-xs text-white/60">
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
        onClick={onReply}
      >
        <i className="i-mingcute-corner-down-right-line" />
        {t('comments.reply')}
      </button>
    </div>
  )
}
