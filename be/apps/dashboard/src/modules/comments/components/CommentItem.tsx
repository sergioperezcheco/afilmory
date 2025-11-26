import { clsxm } from '@afilmory/utils'
import { Trash2, User } from 'lucide-react'
import { m } from 'motion/react'
import { memo, useCallback, useState } from 'react'

import { useDeleteCommentMutation } from '../hooks'
import type { CommentResponseItem, UserViewModel } from '../types'
import { CommentStatusBadge } from './CommentStatusBadge'

// ============================================================================
// Types
// ============================================================================

interface CommentItemProps {
  comment: CommentResponseItem
  user: UserViewModel
  parentComment?: CommentResponseItem
  parentUser?: UserViewModel
  depth?: number
}

// ============================================================================
// Sub-components
// ============================================================================

const CommentUserAvatar = memo(function CommentUserAvatar({
  user,
  size = 'md',
}: {
  user: UserViewModel
  size?: 'sm' | 'md'
}) {
  const sizeClasses = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  if (user.image) {
    return <img src={user.image} alt={user.name} className={clsxm(sizeClasses, 'rounded-full bg-fill object-cover')} />
  }

  return (
    <div className={clsxm(sizeClasses, 'flex items-center justify-center rounded-full bg-fill')}>
      <User className={clsxm(iconSize, 'text-text-tertiary')} />
    </div>
  )
})

const CommentHeader = memo(function CommentHeader({
  user,
  createdAt,
  status,
  parentUser,
}: {
  user: UserViewModel
  createdAt: string
  status: CommentResponseItem['status']
  parentUser?: UserViewModel
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-sm font-medium text-text">{user.name}</span>
      {parentUser && (
        <span className="text-xs text-text-tertiary">
          Replied to <span className="text-text-secondary">@{parentUser.name}</span>
        </span>
      )}
      <span className="text-text-tertiary">·</span>
      <time className="text-xs text-text-tertiary">{formatDate(createdAt)}</time>
      {status !== 'approved' && <CommentStatusBadge status={status} />}
    </div>
  )
})

const CommentReactions = memo(function CommentReactions({ reactions }: { reactions: Record<string, number> }) {
  const entries = Object.entries(reactions)
  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([reaction, count]) => (
        <span key={reaction} className="inline-flex items-center gap-1 rounded-full bg-fill px-2 py-0.5 text-xs">
          <span>{reaction}</span>
          <span className="text-text-tertiary">{count}</span>
        </span>
      ))}
    </div>
  )
})

const CommentActions = memo(function CommentActions({ commentId, isHidden }: { commentId: string; isHidden: boolean }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteMutation = useDeleteCommentMutation()

  const handleDelete = useCallback(async () => {
    if (!confirm('确定要删除这条评论吗?')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(commentId)
    } catch {
      setIsDeleting(false)
    }
  }, [commentId, deleteMutation])

  if (isHidden) return null

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red/10 hover:text-red disabled:opacity-50"
      title="删除评论"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
})

// ============================================================================
// Main Component
// ============================================================================

export const CommentItem = memo(function CommentItem({
  comment,
  user,
  parentComment: _parentComment,
  parentUser,
  depth = 0,
}: CommentItemProps) {
  const isHidden = comment.status === 'hidden'

  return (
    <m.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={clsxm(
        'group flex items-start gap-3 rounded border border-fill-tertiary bg-background p-3 transition-colors hover:bg-background-hover',
        depth > 0 && 'ml-6',
        isHidden && 'opacity-50',
      )}
    >
      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        <CommentUserAvatar user={user} size="md" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <CommentHeader user={user} createdAt={comment.createdAt} status={comment.status} parentUser={parentUser} />

        {/* Comment Content */}
        <p className={clsxm('text-sm leading-relaxed text-text-secondary', isHidden && 'line-through')}>
          {comment.content}
        </p>

        <CommentReactions reactions={comment.reactionCounts} />
      </div>

      {/* Actions */}
      <CommentActions commentId={comment.id} isHidden={isHidden} />
    </m.div>
  )
})

// ============================================================================
// Utilities
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
