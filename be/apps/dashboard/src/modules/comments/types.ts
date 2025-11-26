export type CommentStatus = 'approved' | 'pending' | 'hidden' | 'rejected'

export interface UserViewModel {
  id: string
  name: string
  image: string | null
}

export interface CommentViewModel {
  id: string
  photoId: string
  parentId: string | null
  userId: string
  content: string
  status: CommentStatus
  createdAt: string
  updatedAt: string
}

export interface CommentResponseItem extends CommentViewModel {
  reactionCounts: Record<string, number>
  viewerReactions: string[]
}

export interface CommentsListResponse {
  comments: CommentResponseItem[]
  relations: Record<string, CommentResponseItem>
  users: Record<string, UserViewModel>
  nextCursor: string | null
}

export interface CreateCommentDto {
  photoId: string
  content: string
  parentId?: string
}

export interface ListCommentsQueryDto {
  photoId: string
  limit?: number
  cursor?: string
}

export interface ListAllCommentsQueryDto {
  limit?: number
  cursor?: string
  photoId?: string
  status?: CommentStatus
}

export interface CommentReactionDto {
  reaction: string
}
