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

export interface CommentUser {
  id: string
  name: string
  image: string | null
}

export interface CommentListResult {
  comments: Comment[]
  relations: Record<string, Comment>
  users: Record<string, CommentUser>
  nextCursor: string | null
}

export interface CreateCommentResult {
  comments: Comment[]
  relations: Record<string, Comment>
  users: Record<string, CommentUser>
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

interface CommentUserDto {
  id: string
  name: string
  image: string | null
}

interface CommentListResponseDto {
  comments: CommentDto[]
  relations: Record<string, CommentDto>
  users: Record<string, CommentUserDto>
  next_cursor: string | null
}

interface CreateCommentResponseDto {
  comments: CommentDto[]
  relations: Record<string, CommentDto>
  users: Record<string, CommentUserDto>
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

function mapRelations(relations: Record<string, CommentDto>): Record<string, Comment> {
  const result: Record<string, Comment> = {}
  for (const [key, dto] of Object.entries(relations)) {
    result[key] = mapComment(dto)
  }
  return result
}

export const commentsApi = {
  async list(photoId: string, cursor?: string | null, limit = 20): Promise<CommentListResult> {
    const params = new URLSearchParams({
      photoId,
      limit: String(limit),
    })
    if (cursor) params.set('cursor', cursor)

    const data = await apiFetch<CommentListResponseDto>(`/api/comments?${params.toString()}`)
    return {
      comments: data.comments.map(mapComment),
      relations: mapRelations(data.relations),
      users: data.users,
      nextCursor: data.next_cursor ?? null,
    }
  },

  async create(input: CreateCommentInput): Promise<CreateCommentResult> {
    const data = await apiFetch<CreateCommentResponseDto>('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoId: input.photoId,
        content: input.content,
        parentId: input.parentId ?? undefined,
      }),
    })
    return {
      comments: data.comments.map(mapComment),
      relations: mapRelations(data.relations),
      users: data.users,
    }
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
