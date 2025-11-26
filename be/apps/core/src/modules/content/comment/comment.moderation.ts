import { injectable } from 'tsyringe'

export type CommentModerationAction = 'allow' | 'reject' | 'flag_pending'

export interface CommentModerationHookInput {
  tenantId: string
  userId: string
  photoId: string
  parentId?: string | null
  content: string
  userAgent?: string | null
  clientIp?: string | null
}

export interface CommentModerationResult {
  action: CommentModerationAction
  reason?: string
}

export interface CommentModerationHook {
  review: (input: CommentModerationHookInput) => Promise<CommentModerationResult> | CommentModerationResult
}

export const COMMENT_MODERATION_HOOK = Symbol('COMMENT_MODERATION_HOOK')

@injectable()
export class AllowAllCommentModerationHook implements CommentModerationHook {
  async review(): Promise<CommentModerationResult> {
    return { action: 'allow' }
  }
}
