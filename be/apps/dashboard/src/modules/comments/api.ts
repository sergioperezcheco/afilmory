import { coreApi } from '~/lib/api-client'
import { camelCaseKeys } from '~/lib/case'

import type { CommentsListResponse, ListAllCommentsQueryDto, ListCommentsQueryDto } from './types'

export const commentsApi = {
  list: async (query: ListCommentsQueryDto): Promise<CommentsListResponse> => {
    return camelCaseKeys(
      await coreApi('/comments', {
        method: 'GET',
        query,
      }),
    )
  },

  listAll: async (query: ListAllCommentsQueryDto): Promise<CommentsListResponse> => {
    return camelCaseKeys(
      await coreApi('/comments/all', {
        method: 'GET',
        query,
      }),
    )
  },

  delete: async (commentId: string): Promise<{ id: string; deleted: boolean }> => {
    return camelCaseKeys(
      await coreApi(`/comments/${commentId}`, {
        method: 'DELETE',
      }),
    )
  },
}
