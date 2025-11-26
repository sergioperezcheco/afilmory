import { apiFetch } from './http'

export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'hidden'

export interface CommentDto {
  id: string
  photo_id: string
  parent_id: string | null
  user_id: string
  content: string
  status: CommentStatus
  created_at: string
  updated_at: string
  reaction_counts?: Record<string, number>
  viewer_reactions?: string[]
}

export interface Comment {
  id: string
  photoId: string
  parentId: string | null
  userId: string
  content: string
  status: CommentStatus
  createdAt: string
  updatedAt: string
  reactionCounts: Record<string, number>
  viewerReactions: string[]
}

export interface CommentListResult {
  items: Comment[]
  nextCursor: string | null
}

export interface CreateCommentInput {
  photoId: string
  content: string
  parentId?: string | null
}

export interface ToggleReactionInput {
  commentId: string
  reaction: string
}

function mapComment(dto: CommentDto): Comment {
  return {
    id: dto.id,
    photoId: dto.photo_id,
    parentId: dto.parent_id,
    userId: dto.user_id,
    content: dto.content,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    reactionCounts: dto.reaction_counts ?? {},
    viewerReactions: dto.viewer_reactions ?? [],
  }
}

export const commentsApi = {
  async list(photoId: string, cursor?: string | null, limit = 20): Promise<CommentListResult> {
    const params = new URLSearchParams({
      photoId,
      limit: String(limit),
    })
    if (cursor) params.set('cursor', cursor)

    const data = await apiFetch<{ items: CommentDto[]; next_cursor: string | null }>(
      `/api/comments?${params.toString()}`,
    )
    return {
      items: data.items.map(mapComment),
      nextCursor: data.next_cursor ?? null,
    }
  },

  async create(input: CreateCommentInput): Promise<Comment> {
    const data = await apiFetch<{ item: CommentDto }>('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoId: input.photoId,
        content: input.content,
        parentId: input.parentId ?? undefined,
      }),
    })
    return mapComment(data.item)
  },

  async toggleReaction(input: ToggleReactionInput): Promise<Comment> {
    const data = await apiFetch<{ item: CommentDto }>(`/api/comments/${input.commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction: input.reaction }),
    })
    return mapComment(data.item)
  },
}
