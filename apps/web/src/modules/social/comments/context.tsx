import { useInfiniteQuery } from '@tanstack/react-query'
import { produce } from 'immer'
import type { PrimitiveAtom } from 'jotai'
import { atom } from 'jotai'
import type { PropsWithChildren } from 'react'
import { createContext, use, useEffect, useMemo } from 'react'

import type { Comment, CommentUser } from '~/lib/api/comments'
import { commentsApi } from '~/lib/api/comments'
import { jotaiStore } from '~/lib/jotai'

const PAGE_SIZE = 20

export interface SubmitError {
  type: 'auth' | 'general'
  message: string
}

export interface CommentsAtoms {
  commentsAtom: PrimitiveAtom<Comment[]>
  relationsAtom: PrimitiveAtom<Record<string, Comment>>
  usersAtom: PrimitiveAtom<Record<string, CommentUser>>
  newCommentAtom: PrimitiveAtom<string>
  replyToAtom: PrimitiveAtom<Comment | null>
  statusAtom: PrimitiveAtom<{
    isLoading: boolean
    isError: boolean
    isLoadingMore: boolean
    nextCursor: string | null
  }>
  submitErrorAtom: PrimitiveAtom<SubmitError | null>
  lastSubmittedCommentIdAtom: PrimitiveAtom<string | null>
}

export interface CommentsMethods {
  submit: (content: string) => Promise<void>
  loadMore: () => Promise<void>
  toggleReaction: (params: { comment: Comment; reaction?: string }) => Promise<void>
  clearSubmitError: () => void
}

export interface CommentsContextValue {
  atoms: CommentsAtoms
  methods: CommentsMethods
}

const CommentsContext = createContext<CommentsContextValue | null>(null)

function createCommentsContext(photoId: string): { atoms: CommentsAtoms; methods: CommentsMethods } {
  const commentsAtom = atom<Comment[]>([])
  const relationsAtom = atom<Record<string, Comment>>({})
  const usersAtom = atom<Record<string, CommentUser>>({})
  const newCommentAtom = atom<string>('')
  const replyToAtom = atom<Comment | null>(null)
  const statusAtom = atom({
    isLoading: false,
    isError: false,
    isLoadingMore: false,
    nextCursor: null as string | null,
  })
  const submitErrorAtom = atom<SubmitError | null>(null)
  const lastSubmittedCommentIdAtom = atom<string | null>(null)

  const atoms: CommentsAtoms = {
    commentsAtom,
    relationsAtom,
    usersAtom,
    newCommentAtom,
    replyToAtom,
    statusAtom,
    submitErrorAtom,
    lastSubmittedCommentIdAtom,
  }

  const submit = async (content: string) => {
    const replyTo = jotaiStore.get(replyToAtom)
    jotaiStore.set(submitErrorAtom, null)
    try {
      jotaiStore.set(
        statusAtom,
        produce((draft) => {
          draft.isLoading = true
        }),
      )
      const result = await commentsApi.create({
        photoId,
        content: content.trim(),
        parentId: replyTo?.id ?? null,
      })
      const newComment = result.comments[0]
      jotaiStore.set(
        commentsAtom,
        produce((draft) => {
          draft.unshift(newComment)
        }),
      )
      jotaiStore.set(
        relationsAtom,
        produce((draft) => {
          Object.assign(draft, result.relations)
        }),
      )
      jotaiStore.set(
        usersAtom,
        produce((draft) => {
          Object.assign(draft, result.users)
        }),
      )
      jotaiStore.set(newCommentAtom, '')
      jotaiStore.set(replyToAtom, null)
      jotaiStore.set(lastSubmittedCommentIdAtom, newComment.id)
      setTimeout(() => {
        jotaiStore.set(lastSubmittedCommentIdAtom, null)
      }, 2000)
    } catch (error: any) {
      if (error?.status === 401) {
        jotaiStore.set(submitErrorAtom, { type: 'auth', message: 'comments.loginRequired' })
      } else {
        jotaiStore.set(submitErrorAtom, { type: 'general', message: 'comments.postFailed' })
      }
    } finally {
      jotaiStore.set(
        statusAtom,
        produce((draft) => {
          draft.isLoading = false
        }),
      )
    }
  }

  const loadMore = async () => {
    const status = jotaiStore.get(statusAtom)
    if (status.isLoadingMore || !status.nextCursor) return
    jotaiStore.set(
      statusAtom,
      produce((draft) => {
        draft.isLoadingMore = true
      }),
    )
    try {
      const result = await commentsApi.list(photoId, status.nextCursor, PAGE_SIZE)
      jotaiStore.set(
        commentsAtom,
        produce((draft) => {
          draft.push(...result.comments)
        }),
      )
      jotaiStore.set(
        relationsAtom,
        produce((draft) => {
          Object.assign(draft, result.relations)
        }),
      )
      jotaiStore.set(
        usersAtom,
        produce((draft) => {
          Object.assign(draft, result.users)
        }),
      )
      jotaiStore.set(
        statusAtom,
        produce((draft) => {
          draft.nextCursor = result.nextCursor
          draft.isLoadingMore = false
        }),
      )
    } catch {
      jotaiStore.set(
        statusAtom,
        produce((draft) => {
          draft.isLoadingMore = false
          draft.isError = true
        }),
      )
    }
  }

  const toggleReaction = async ({ comment, reaction = 'like' }: { comment: Comment; reaction?: string }) => {
    const isActive = comment.viewerReactions.includes(reaction)
    jotaiStore.set(
      commentsAtom,
      produce((draft) => {
        const item = draft.find((c) => c.id === comment.id)
        if (!item) return
        item.reactionCounts[reaction] = Math.max(0, (item.reactionCounts[reaction] ?? 0) + (isActive ? -1 : 1))
        if (isActive) {
          item.viewerReactions = item.viewerReactions.filter((r) => r !== reaction)
        } else {
          item.viewerReactions.push(reaction)
        }
      }),
    )
    try {
      await commentsApi.toggleReaction({ commentId: comment.id, reaction })
    } catch {
      jotaiStore.set(
        commentsAtom,
        produce((draft) => {
          const item = draft.find((c) => c.id === comment.id)
          if (!item) return
          item.reactionCounts[reaction] = Math.max(0, (item.reactionCounts[reaction] ?? 0) + (isActive ? 1 : -1))
          if (isActive) {
            item.viewerReactions.push(reaction)
          } else {
            item.viewerReactions = item.viewerReactions.filter((r) => r !== reaction)
          }
        }),
      )
    }
  }

  const clearSubmitError = () => {
    jotaiStore.set(submitErrorAtom, null)
  }

  const methods: CommentsMethods = {
    submit,
    loadMore,
    toggleReaction,
    clearSubmitError,
  }

  return { atoms, methods }
}

export function useCommentsContext(): CommentsContextValue {
  const ctx = use(CommentsContext)
  if (!ctx) {
    throw new Error('CommentsContext not found')
  }
  return ctx
}

export function CommentsProvider({ photoId, children }: PropsWithChildren<{ photoId: string }>) {
  const ctxValue = useMemo(() => createCommentsContext(photoId), [photoId])
  const { atoms } = ctxValue

  const commentsQuery = useInfiniteQuery({
    queryKey: ['comments', photoId],
    queryFn: ({ pageParam }) => commentsApi.list(photoId, pageParam as string | null, PAGE_SIZE),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    retry: 1,
  })

  useEffect(() => {
    jotaiStore.set(
      atoms.statusAtom,
      produce((draft) => {
        draft.isLoading = commentsQuery.isLoading
        draft.isLoadingMore = commentsQuery.isFetchingNextPage
      }),
    )
  }, [atoms.statusAtom, commentsQuery.isFetchingNextPage, commentsQuery.isLoading])

  useEffect(() => {
    if (commentsQuery.data) {
      jotaiStore.set(
        atoms.commentsAtom,
        commentsQuery.data.pages.flatMap((page) => page.comments),
      )
      // Merge all relations and users from all pages
      const allRelations: Record<string, Comment> = {}
      const allUsers: Record<string, CommentUser> = {}
      for (const page of commentsQuery.data.pages) {
        Object.assign(allRelations, page.relations)
        Object.assign(allUsers, page.users)
      }
      jotaiStore.set(atoms.relationsAtom, allRelations)
      jotaiStore.set(atoms.usersAtom, allUsers)
      const nextCursor = commentsQuery.data.pages.at(-1)?.nextCursor ?? null
      jotaiStore.set(
        atoms.statusAtom,
        produce((draft) => {
          draft.isLoading = false
          draft.isError = false
          draft.nextCursor = nextCursor
        }),
      )
    }
  }, [atoms.commentsAtom, atoms.relationsAtom, atoms.usersAtom, atoms.statusAtom, commentsQuery.data])

  useEffect(() => {
    if (commentsQuery.isError) {
      jotaiStore.set(
        atoms.statusAtom,
        produce((draft) => {
          draft.isLoading = false
          draft.isError = true
        }),
      )
    }
  }, [atoms.statusAtom, commentsQuery.isError])

  return <CommentsContext value={ctxValue}>{children}</CommentsContext>
}
