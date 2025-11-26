import { useQuery } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'

import { sessionUserAtom } from '~/atoms/session'
import { authApi } from '~/lib/api/auth'

export function SessionProvider() {
  const setSessionUser = useSetAtom(sessionUserAtom)

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: authApi.getSession,
  })

  useEffect(() => {
    if (sessionQuery.data?.user) {
      setSessionUser(sessionQuery.data.user)
    } else if (sessionQuery.data === null) {
      // Explicitly set to null when session is null (not logged in)
      setSessionUser(null)
    }
  }, [sessionQuery.data, setSessionUser])

  return null
}
