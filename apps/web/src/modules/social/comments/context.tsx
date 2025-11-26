import { useInfiniteQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { atom, Provider as JotaiProvider, useSetAtom } from 'jotai'
import type { PropsWithChildren } from 'react'
import { createContext, use, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import type { Comment } from '~/lib/api/comments'
import { commentsApi } from '~/lib/api/comments'

const PAGE_SIZE = 20

export interface CommentsAtoms {
  commentsAtom: ReturnType<typeof atom<Comment[]>>
  newCommentAtom: ReturnType<typeof atom<string>>
  replyToAtom: ReturnType<typeof atom<Comment | null>>
  statusAtom: ReturnType<
    typeof atom<{
      isLoading: boolean
      isError: boolean
      isLoadingMore: boolean
      nextCursor: string | null
    }>
  >

  submitAtom: ReturnType<typeof atom<null, [string], Promise<void>>>
  loadMoreAtom: ReturnType<typeof atom<null, [], Promise<void>>>
  toggleReactionAtom: ReturnType<typeof atom<null, [{ comment: Comment; reaction?: string }], Promise<void>>>
}

export interface CommentsContextValue {
  atoms: CommentsAtoms
}

const CommentsContext = createContext<CommentsContextValue | null>(null)

function createCommentsAtoms(photoId: string): CommentsAtoms {
  const commentsAtom = atom<Comment[]>([])
  const newCommentAtom = atom<string>('')
  const replyToAtom = atom<Comment | null>(null)
  const statusAtom = atom({
    isLoading: false,
    isError: false,
    isLoadingMore: false,
    nextCursor: null as string | null,
  })

  const submitAtom = atom(null, async (get, set, content: string) => {
    const replyTo = get(replyToAtom)
    try {
      set(statusAtom, (prev) => ({ ...prev, isLoading: true }))
      const comment = await commentsApi.create({
        photoId,
        content: content.trim(),
        parentId: replyTo?.id ?? null,
      })
      set(commentsAtom, (prev) => [comment, ...prev])
      set(newCommentAtom, '')
      set(replyToAtom, null)
      toast.success(i18next.t('comments.posted'))
    } catch (error: any) {
      if (error?.status === 401) {
        toast.error(i18next.t('comments.loginRequired'))
      } else {
        toast.error(i18next.t('comments.postFailed'))
      }
    } finally {
      set(statusAtom, (prev) => ({ ...prev, isLoading: false }))
    }
  })

  const loadMoreAtom = atom(null, async (get, set) => {
    const status = get(statusAtom)
    if (status.isLoadingMore || !status.nextCursor) return
    set(statusAtom, { ...status, isLoadingMore: true })
    try {
      const result = await commentsApi.list(photoId, status.nextCursor, PAGE_SIZE)
      set(commentsAtom, (prev) => [...prev, ...result.items])
      set(statusAtom, (prev) => ({ ...prev, nextCursor: result.nextCursor, isLoadingMore: false }))
    } catch {
      set(statusAtom, (prev) => ({ ...prev, isLoadingMore: false, isError: true }))
    }
  })

  const toggleReactionAtom = atom(
    null,
    async (get, set, { comment, reaction = 'like' }: { comment: Comment; reaction?: string }) => {
      const isActive = comment.viewerReactions.includes(reaction)
      set(commentsAtom, (prev) =>
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
        set(commentsAtom, (prev) =>
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
    },
  )

  return {
    commentsAtom,
    newCommentAtom,
    replyToAtom,
    statusAtom,
    submitAtom,
    loadMoreAtom,
    toggleReactionAtom,
  }
}

export function useCommentsContext(): CommentsContextValue {
  const ctx = use(CommentsContext)
  if (!ctx) {
    throw new Error('CommentsContext not found')
  }
  return ctx
}

export function CommentsProvider({ photoId, children }: PropsWithChildren<{ photoId: string }>) {
  const atoms = useMemo(() => createCommentsAtoms(photoId), [photoId])
  const setComments = useSetAtom(atoms.commentsAtom)
  const setStatus = useSetAtom(atoms.statusAtom)

  const commentsQuery = useInfiniteQuery({
    queryKey: ['comments', photoId],
    queryFn: ({ pageParam }) => commentsApi.list(photoId, pageParam as string | null, PAGE_SIZE),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    retry: 1,
  })

  useEffect(() => {
    setStatus((prev) => ({
      ...prev,
      isLoading: commentsQuery.isLoading,
      isLoadingMore: commentsQuery.isFetchingNextPage,
    }))
  }, [commentsQuery.isFetchingNextPage, commentsQuery.isLoading, setStatus])

  useEffect(() => {
    if (commentsQuery.data) {
      setComments(commentsQuery.data.pages.flatMap((page) => page.items))
      const nextCursor = commentsQuery.data.pages.at(-1)?.nextCursor ?? null
      setStatus((prev) => ({ ...prev, isLoading: false, isError: false, nextCursor }))
    }
  }, [commentsQuery.data, setComments, setStatus])

  useEffect(() => {
    if (commentsQuery.isError) {
      setStatus((prev) => ({ ...prev, isLoading: false, isError: true }))
    }
  }, [commentsQuery.isError, setStatus])

  const value = useMemo<CommentsContextValue>(() => ({ atoms }), [atoms])

  return (
    <JotaiProvider>
      <CommentsContext value={value}>{children}</CommentsContext>
    </JotaiProvider>
  )
}
