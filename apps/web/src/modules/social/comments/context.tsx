import { useInfiniteQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import type { PrimitiveAtom } from 'jotai'
import { atom } from 'jotai'
import type { PropsWithChildren } from 'react'
import { createContext, use, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import type { Comment } from '~/lib/api/comments'
import { commentsApi } from '~/lib/api/comments'
import { jotaiStore } from '~/lib/jotai'

const PAGE_SIZE = 20

export interface CommentsAtoms {
  commentsAtom: PrimitiveAtom<Comment[]>
  newCommentAtom: PrimitiveAtom<string>
  replyToAtom: PrimitiveAtom<Comment | null>
  statusAtom: PrimitiveAtom<{
    isLoading: boolean
    isError: boolean
    isLoadingMore: boolean
    nextCursor: string | null
  }>
}

export interface CommentsMethods {
  submit: (content: string) => Promise<void>
  loadMore: () => Promise<void>
  toggleReaction: (params: { comment: Comment; reaction?: string }) => Promise<void>
}

export interface CommentsContextValue {
  atoms: CommentsAtoms
  methods: CommentsMethods
}

const CommentsContext = createContext<CommentsContextValue | null>(null)

function createCommentsContext(photoId: string): { atoms: CommentsAtoms; methods: CommentsMethods } {
  const commentsAtom = atom<Comment[]>([])
  const newCommentAtom = atom<string>('')
  const replyToAtom = atom<Comment | null>(null)
  const statusAtom = atom({
    isLoading: false,
    isError: false,
    isLoadingMore: false,
    nextCursor: null as string | null,
  })

  const atoms: CommentsAtoms = {
    commentsAtom,
    newCommentAtom,
    replyToAtom,
    statusAtom,
  }

  const submit = async (content: string) => {
    const replyTo = jotaiStore.get(replyToAtom)
    try {
      jotaiStore.set(statusAtom, (prev) => ({ ...prev, isLoading: true }))
      const comment = await commentsApi.create({
        photoId,
        content: content.trim(),
        parentId: replyTo?.id ?? null,
      })
      jotaiStore.set(commentsAtom, (prev) => [comment, ...prev])
      jotaiStore.set(newCommentAtom, '')
      jotaiStore.set(replyToAtom, null)
      toast.success(i18next.t('comments.posted'))
    } catch (error: any) {
      if (error?.status === 401) {
        toast.error(i18next.t('comments.loginRequired'))
      } else {
        toast.error(i18next.t('comments.postFailed'))
      }
    } finally {
      jotaiStore.set(statusAtom, (prev) => ({ ...prev, isLoading: false }))
    }
  }

  const loadMore = async () => {
    const status = jotaiStore.get(statusAtom)
    if (status.isLoadingMore || !status.nextCursor) return
    jotaiStore.set(statusAtom, { ...status, isLoadingMore: true })
    try {
      const result = await commentsApi.list(photoId, status.nextCursor, PAGE_SIZE)
      jotaiStore.set(commentsAtom, (prev) => [...prev, ...result.items])
      jotaiStore.set(statusAtom, (prev) => ({ ...prev, nextCursor: result.nextCursor, isLoadingMore: false }))
    } catch {
      jotaiStore.set(statusAtom, (prev) => ({ ...prev, isLoadingMore: false, isError: true }))
    }
  }

  const toggleReaction = async ({ comment, reaction = 'like' }: { comment: Comment; reaction?: string }) => {
    const isActive = comment.viewerReactions.includes(reaction)
    jotaiStore.set(commentsAtom, (prev) =>
      prev.map((item) => {
        if (item.id !== comment.id) return item
        const counts = { ...item.reactionCounts }
        counts[reaction] = Math.max(0, (counts[reaction] ?? 0) + (isActive ? -1 : 1))
        const viewerReactions = isActive
          ? item.viewerReactions.filter((r) => r !== reaction)
          : [...item.viewerReactions, reaction]
        return { ...item, reactionCounts: counts, viewerReactions }
      }),
    )
    try {
      await commentsApi.toggleReaction({ commentId: comment.id, reaction })
    } catch (error: any) {
      jotaiStore.set(commentsAtom, (prev) =>
        prev.map((item) => {
          if (item.id !== comment.id) return item
          const counts = { ...item.reactionCounts }
          counts[reaction] = Math.max(0, (counts[reaction] ?? 0) + (isActive ? 1 : -1))
          const viewerReactions = isActive
            ? [...item.viewerReactions, reaction]
            : item.viewerReactions.filter((r) => r !== reaction)
          return { ...item, reactionCounts: counts, viewerReactions }
        }),
      )
      if (error?.status === 401) {
        toast.error(i18next.t('comments.loginRequired'))
      } else {
        toast.error(i18next.t('comments.reactionFailed'))
      }
    }
  }

  const methods: CommentsMethods = {
    submit,
    loadMore,
    toggleReaction,
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
    jotaiStore.set(atoms.statusAtom, (prev) => ({
      ...prev,
      isLoading: commentsQuery.isLoading,
      isLoadingMore: commentsQuery.isFetchingNextPage,
    }))
  }, [atoms.statusAtom, commentsQuery.isFetchingNextPage, commentsQuery.isLoading])

  useEffect(() => {
    if (commentsQuery.data) {
      jotaiStore.set(
        atoms.commentsAtom,
        commentsQuery.data.pages.flatMap((page) => page.items),
      )
      const nextCursor = commentsQuery.data.pages.at(-1)?.nextCursor ?? null
      jotaiStore.set(atoms.statusAtom, (prev) => ({ ...prev, isLoading: false, isError: false, nextCursor }))
    }
  }, [atoms.commentsAtom, atoms.statusAtom, commentsQuery.data])

  useEffect(() => {
    if (commentsQuery.isError) {
      jotaiStore.set(atoms.statusAtom, (prev) => ({ ...prev, isLoading: false, isError: true }))
    }
  }, [atoms.statusAtom, commentsQuery.isError])

  return <CommentsContext value={ctxValue}>{children}</CommentsContext>
}
