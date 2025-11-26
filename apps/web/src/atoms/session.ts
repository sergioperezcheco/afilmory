import { atom } from 'jotai'

import type { SessionUser } from '~/lib/api/auth'

export const sessionUserAtom = atom<SessionUser | null>(null)
