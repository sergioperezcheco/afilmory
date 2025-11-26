import { apiFetch } from './http'

export interface SessionUser {
  id: string
  name?: string | null
  image?: string | null
  role?: string | null
}

export interface SessionPayload {
  user: SessionUser
  session: unknown
  tenant?: unknown
}

export const authApi = {
  async getSession(): Promise<SessionPayload | null> {
    return await apiFetch<SessionPayload | null>('/api/auth/session')
  },
}
