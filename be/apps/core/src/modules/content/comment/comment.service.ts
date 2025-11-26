import { commentReactions, comments, photoAssets } from '@afilmory/db'
import { HttpContext } from '@afilmory/framework'
import { getClientIp } from 'core/context/http-context.helper'
import { DbAccessor } from 'core/database/database.provider'
import { BizException, ErrorCode } from 'core/errors'
import { requireTenantContext } from 'core/modules/platform/tenant/tenant.context'
import { and, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm'
import type { Context } from 'hono'
import { inject, injectable } from 'tsyringe'

import type { CommentReactionDto, CreateCommentDto, ListCommentsQueryDto } from './comment.dto'
import type { CommentModerationHook, CommentModerationHookInput } from './comment.moderation'
import { COMMENT_MODERATION_HOOK } from './comment.moderation'

export interface CommentViewModel {
  id: string
  photoId: string
  parentId: string | null
  userId: string
  content: string
  status: string
  createdAt: string
  updatedAt: string
}

interface ViewerContext {
  userId: string | null
  role?: string
}

interface CommentResponseItem extends CommentViewModel {
  reactionCounts: Record<string, number>
  viewerReactions: string[]
}

@injectable()
export class CommentService {
  constructor(
    private readonly dbAccessor: DbAccessor,
    @inject(COMMENT_MODERATION_HOOK) private readonly moderationHook: CommentModerationHook,
  ) {}

  async createComment(dto: CreateCommentDto, context: Context): Promise<{ item: CommentResponseItem }> {
    const tenant = requireTenantContext()
    const auth = this.requireAuth()
    const db = this.dbAccessor.get()

    await this.ensurePhotoExists(tenant.tenant.id, dto.photoId)
    const parent = await this.validateParent(dto.parentId, tenant.tenant.id, dto.photoId)

    const moderationInput: CommentModerationHookInput = {
      tenantId: tenant.tenant.id,
      userId: auth.userId,
      photoId: dto.photoId,
      parentId: parent?.id,
      content: dto.content.trim(),
      userAgent: context.req.header('user-agent') ?? null,
      clientIp: getClientIp(),
    }
    const moderationResult = await this.moderationHook.review(moderationInput)

    if (moderationResult.action === 'reject') {
      throw new BizException(ErrorCode.COMMON_FORBIDDEN, {
        message: moderationResult.reason ?? '评论未通过审核',
      })
    }

    const status = moderationResult.action === 'flag_pending' ? 'pending' : 'approved'

    const [record] = await db
      .insert(comments)
      .values({
        tenantId: tenant.tenant.id,
        photoId: dto.photoId,
        parentId: parent?.id ?? null,
        userId: auth.userId,
        content: dto.content.trim(),
        status,
        userAgent: moderationInput.userAgent ?? null,
        clientIp: moderationInput.clientIp ?? null,
      })
      .returning()

    const item = this.toResponse({
      ...record,
      reactionCounts: {},
      viewerReactions: [],
    })

    return { item }
  }

  async listComments(
    query: ListCommentsQueryDto,
  ): Promise<{ items: CommentResponseItem[]; nextCursor: string | null }> {
    const tenant = requireTenantContext()
    const viewer = this.getViewer()
    const db = this.dbAccessor.get()

    const filters = [
      eq(comments.tenantId, tenant.tenant.id),
      eq(comments.photoId, query.photoId),
      isNull(comments.deletedAt),
    ]

    let statusCondition
    if (viewer.isAdmin) {
      statusCondition = inArray(comments.status, ['approved', 'pending'])
    } else if (viewer.userId) {
      statusCondition = or(
        eq(comments.status, 'approved'),
        and(eq(comments.status, 'pending'), eq(comments.userId, viewer.userId)),
      )
    } else {
      statusCondition = eq(comments.status, 'approved')
    }
    filters.push(statusCondition)

    let cursorCondition
    if (query.cursor) {
      const anchor = await this.findCommentForCursor(query.cursor, tenant.tenant.id, query.photoId)
      cursorCondition = or(
        gt(comments.createdAt, anchor.createdAt),
        and(eq(comments.createdAt, anchor.createdAt), gt(comments.id, anchor.id)),
      )
    }

    const baseWhere = cursorCondition ? and(...filters, cursorCondition) : and(...filters)

    const rows = await db
      .select({
        id: comments.id,
        photoId: comments.photoId,
        parentId: comments.parentId,
        userId: comments.userId,
        content: comments.content,
        status: comments.status,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .where(baseWhere)
      .orderBy(comments.createdAt, comments.id)
      .limit(query.limit + 1)

    const hasMore = rows.length > query.limit
    const items = rows.slice(0, query.limit)
    const commentIds = items.map((item) => item.id)

    const reactions = await this.fetchReactionAggregations(tenant.tenant.id, commentIds, viewer.userId)

    const nextCursor = hasMore && items.length > 0 ? items.at(-1)!.id : null

    return {
      items: items.map((item) =>
        this.toResponse({
          ...item,
          reactionCounts: reactions.counts.get(item.id) ?? {},
          viewerReactions: reactions.viewer.get(item.id) ?? [],
        }),
      ),
      nextCursor,
    }
  }

  async toggleReaction(commentId: string, body: CommentReactionDto): Promise<{ item: CommentResponseItem }> {
    const tenant = requireTenantContext()
    const auth = this.requireAuth()
    const db = this.dbAccessor.get()

    const comment = await this.getCommentById(commentId, tenant.tenant.id)

    const [existing] = await db
      .select({ id: commentReactions.id })
      .from(commentReactions)
      .where(
        and(
          eq(commentReactions.tenantId, tenant.tenant.id),
          eq(commentReactions.commentId, comment.id),
          eq(commentReactions.userId, auth.userId),
          eq(commentReactions.reaction, body.reaction),
        ),
      )
      .limit(1)

    if (existing) {
      await db.delete(commentReactions).where(eq(commentReactions.id, existing.id))
    } else {
      await db.insert(commentReactions).values({
        tenantId: tenant.tenant.id,
        commentId: comment.id,
        userId: auth.userId,
        reaction: body.reaction,
      })
    }

    const aggregation = await this.fetchReactionAggregations(tenant.tenant.id, [comment.id], auth.userId)
    const item = this.toResponse({
      ...comment,
      reactionCounts: aggregation.counts.get(comment.id) ?? {},
      viewerReactions: aggregation.viewer.get(comment.id) ?? [],
    })
    return { item }
  }

  async softDelete(commentId: string): Promise<void> {
    const tenant = requireTenantContext()
    const auth = this.requireAuth()
    const db = this.dbAccessor.get()

    const [record] = await db
      .select({
        id: comments.id,
        tenantId: comments.tenantId,
        userId: comments.userId,
      })
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.tenantId, tenant.tenant.id), isNull(comments.deletedAt)))
      .limit(1)

    if (!record) {
      throw new BizException(ErrorCode.COMMON_NOT_FOUND, { message: '评论不存在' })
    }

    const isAdmin = auth.role === 'admin' || auth.role === 'superadmin'
    const isOwner = auth.userId === record.userId

    if (!isAdmin && !isOwner) {
      throw new BizException(ErrorCode.COMMON_FORBIDDEN, { message: '无权删除该评论' })
    }

    await db
      .update(comments)
      .set({
        status: 'hidden',
        deletedAt: new Date().toISOString(),
      })
      .where(eq(comments.id, record.id))
  }

  private requireAuth(): { userId: string; role?: string } {
    const authContext = HttpContext.getValue('auth') as
      | { user?: { id?: string; role?: string }; session?: unknown }
      | undefined
    if (!authContext?.user || !authContext.session) {
      throw new BizException(ErrorCode.AUTH_UNAUTHORIZED)
    }
    const userId = (authContext.user as { id?: string }).id
    if (!userId) {
      throw new BizException(ErrorCode.AUTH_UNAUTHORIZED)
    }
    return { userId, role: (authContext.user as { role?: string }).role }
  }

  private getViewer(): ViewerContext & { isAdmin: boolean } {
    const authContext = HttpContext.getValue('auth') as
      | { user?: { id?: string; role?: string }; session?: unknown }
      | undefined
    const userId = authContext?.user?.id ?? null
    const role = authContext?.user?.role
    const isAdmin = role === 'admin' || role === 'superadmin'
    return { userId, role, isAdmin }
  }

  private async ensurePhotoExists(tenantId: string, photoId: string): Promise<void> {
    const db = this.dbAccessor.get()
    const [photo] = await db
      .select({ id: photoAssets.id })
      .from(photoAssets)
      .where(and(eq(photoAssets.tenantId, tenantId), eq(photoAssets.photoId, photoId)))
      .limit(1)

    if (!photo) {
      throw new BizException(ErrorCode.COMMON_NOT_FOUND, { message: '照片不存在' })
    }
  }

  private async validateParent(parentId: string | undefined, tenantId: string, photoId: string) {
    if (!parentId) {
      return null
    }
    const db = this.dbAccessor.get()
    const [parent] = await db
      .select({
        id: comments.id,
        photoId: comments.photoId,
        status: comments.status,
        deletedAt: comments.deletedAt,
      })
      .from(comments)
      .where(and(eq(comments.id, parentId), eq(comments.tenantId, tenantId)))
      .limit(1)

    if (!parent) {
      throw new BizException(ErrorCode.COMMON_NOT_FOUND, { message: '引用的评论不存在' })
    }
    if (parent.photoId !== photoId) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: '引用的评论不属于当前照片' })
    }
    if (parent.status === 'hidden' || parent.status === 'rejected' || parent.deletedAt) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: '引用的评论不可用' })
    }

    return parent
  }

  private async getCommentById(commentId: string, tenantId: string) {
    const db = this.dbAccessor.get()
    const [comment] = await db
      .select({
        id: comments.id,
        status: comments.status,
        photoId: comments.photoId,
        parentId: comments.parentId,
        userId: comments.userId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
      })
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.tenantId, tenantId), isNull(comments.deletedAt)))
      .limit(1)

    if (!comment) {
      throw new BizException(ErrorCode.COMMON_NOT_FOUND, { message: '评论不存在或不可操作' })
    }

    return comment
  }

  private async fetchReactionAggregations(tenantId: string, commentIds: string[], viewerId: string | null) {
    const db = this.dbAccessor.get()
    const counts = new Map<string, Record<string, number>>()
    const viewer = new Map<string, string[]>()

    if (commentIds.length === 0) {
      return { counts, viewer }
    }

    const rows = await db
      .select({
        commentId: commentReactions.commentId,
        reaction: commentReactions.reaction,
        total: sql<number>`count(*)`,
      })
      .from(commentReactions)
      .where(and(eq(commentReactions.tenantId, tenantId), inArray(commentReactions.commentId, commentIds)))
      .groupBy(commentReactions.commentId, commentReactions.reaction)

    for (const row of rows) {
      const current = counts.get(row.commentId) ?? {}
      current[row.reaction] = row.total
      counts.set(row.commentId, current)
    }

    if (viewerId) {
      const viewerRows = await db
        .select({
          commentId: commentReactions.commentId,
          reaction: commentReactions.reaction,
        })
        .from(commentReactions)
        .where(
          and(
            eq(commentReactions.tenantId, tenantId),
            inArray(commentReactions.commentId, commentIds),
            eq(commentReactions.userId, viewerId),
          ),
        )

      for (const row of viewerRows) {
        const existing = viewer.get(row.commentId) ?? []
        existing.push(row.reaction)
        viewer.set(row.commentId, existing)
      }
    }

    return { counts, viewer }
  }

  private async findCommentForCursor(commentId: string, tenantId: string, photoId: string) {
    const db = this.dbAccessor.get()
    const [comment] = await db
      .select({
        id: comments.id,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.tenantId, tenantId), eq(comments.photoId, photoId)))
      .limit(1)

    if (!comment) {
      throw new BizException(ErrorCode.COMMON_NOT_FOUND, { message: '无效的游标' })
    }
    return comment
  }

  private toResponse(model: CommentViewModel & { reactionCounts: Record<string, number>; viewerReactions: string[] }) {
    return {
      id: model.id,
      photoId: model.photoId,
      parentId: model.parentId,
      userId: model.userId,
      content: model.content,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      reactionCounts: model.reactionCounts,
      viewerReactions: model.viewerReactions,
    }
  }
}
