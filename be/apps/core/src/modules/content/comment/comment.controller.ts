import { Body, ContextParam, Controller, Delete, Get, Param, Post, Query } from '@afilmory/framework'
import { Roles } from 'core/guards/roles.decorator'
import type { Context } from 'hono'

import { CommentReactionDto, CreateCommentDto, ListCommentsQueryDto } from './comment.dto'
import { CommentService } from './comment.service'

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('/')
  @Roles('user')
  async createComment(@ContextParam() context: Context, @Body() body: CreateCommentDto) {
    return await this.commentService.createComment(body, context)
  }

  @Get('/')
  async listComments(@Query() query: ListCommentsQueryDto) {
    return await this.commentService.listComments(query)
  }

  @Post('/:id/reactions')
  @Roles('user')
  async react(@Param('id') commentId: string, @Body() body: CommentReactionDto) {
    return await this.commentService.toggleReaction(commentId, body)
  }

  @Delete('/:id')
  @Roles('user')
  async deleteComment(@Param('id') commentId: string) {
    await this.commentService.softDelete(commentId)
    return { id: commentId, deleted: true }
  }
}
