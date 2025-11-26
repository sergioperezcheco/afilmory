import { ScrollArea } from '@afilmory/ui'
import { useAtom, useAtomValue } from 'jotai'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { sessionUserAtom } from '~/atoms/session'
import { useMobile } from '~/hooks/useMobile'
import type { Comment } from '~/lib/api/comments'

import { CommentCard } from './CommentCard'
import { CommentInput } from './CommentInput'
import { CommentsProvider, useCommentsContext } from './context'
import { EmptyState } from './EmptyState'
import { ErrorBox } from './ErrorBox'
import { SkeletonList } from './SkeletonList'

export const CommentsPanel: FC<{ photoId: string; visible?: boolean }> = ({ photoId }) => {
  return (
    <CommentsProvider photoId={photoId}>
      <CommentsContent />
    </CommentsProvider>
  )
}

const CommentsContent: FC = () => {
  const { t, i18n } = useTranslation()
  const isMobile = useMobile()
  const { atoms, methods } = useCommentsContext()
  const [comments] = useAtom(atoms.commentsAtom)
  const [status] = useAtom(atoms.statusAtom)
  const [replyTo, setReplyTo] = useAtom(atoms.replyToAtom)
  const [newComment, setNewComment] = useAtom(atoms.newCommentAtom)
  const sessionUser = useAtomValue(sessionUserAtom)

  const authorName = (comment: Comment) => {
    if (sessionUser?.id && comment.userId === sessionUser.id) {
      return t('comments.you')
    }
    if (comment.userId) {
      return t('comments.user', { id: comment.userId.slice(-6) })
    }
    return t('comments.anonymous')
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <i className="i-mingcute-comment-line" />
          <span>{t('inspector.tab.comments')}</span>
          {comments.length > 0 && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">{comments.length}</span>
          )}
        </div>
        {status.isLoading && <span className="text-xs text-white/40">{t('comments.loading')}</span>}
      </div>

      <ScrollArea rootClassName="flex-1 min-h-0" viewportClassName="px-4">
        <div className="space-y-4 pb-4">
          {status.isLoading ? (
            <SkeletonList />
          ) : status.isError ? (
            <ErrorBox />
          ) : comments.length === 0 ? (
            <EmptyState />
          ) : (
            comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                parent={comment.parentId ? (comments.find((c) => c.id === comment.parentId) ?? null) : null}
                reacted={comment.viewerReactions.includes('like')}
                onReply={() => setReplyTo(comment)}
                onToggleReaction={() => methods.toggleReaction({ comment })}
                authorName={authorName}
                locale={i18n.language || 'en'}
              />
            ))
          )}

          {status.nextCursor && (
            <button
              type="button"
              onClick={() => methods.loadMore()}
              disabled={status.isLoadingMore}
              className="glassmorphic-btn border-accent/30 hover:border-accent/60 mx-auto flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="i-mingcute-arrow-down-line" />
              {status.isLoadingMore ? t('comments.loading') : t('comments.loadMore')}
            </button>
          )}
        </div>
      </ScrollArea>

      <CommentInput
        isMobile={isMobile}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        newComment={newComment}
        setNewComment={setNewComment}
        onSubmit={(content) => methods.submit(content)}
      />
    </div>
  )
}
