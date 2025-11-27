import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { PUBLIC_ROUTES } from '~/constants/routes'
import type { SessionResponse } from '~/modules/auth/api/session'
import { useStorageProvidersQuery } from '~/modules/storage-providers'

const STORAGE_SETUP_PATH = '/photos/storage'

type UseRequireStorageProviderArgs = {
  session: SessionResponse | null
  isLoading: boolean
}

export function useRequireStorageProvider({ session, isLoading }: UseRequireStorageProviderArgs) {
  const location = useLocation()
  const navigate = useNavigate()

  const pathname = location.pathname || '/'
  const shouldCheck =
    !isLoading &&
    !!session &&
    session.user.role !== 'superadmin' &&
    !PUBLIC_ROUTES.has(pathname) &&
    !pathname.startsWith('/superadmin')

  const storageProvidersQuery = useStorageProvidersQuery({
    enabled: shouldCheck,
  })

  const needsSetup =
    shouldCheck &&
    storageProvidersQuery.isSuccess &&
    (storageProvidersQuery.data?.providers.length ?? 0) === 0 &&
    !storageProvidersQuery.isFetching

  const navigateOnceRef = useRef(false)
  useEffect(() => {
    if (navigateOnceRef.current) {
      return
    }
    if (!needsSetup) {
      return
    }
    if (pathname === STORAGE_SETUP_PATH) {
      return
    }

    navigateOnceRef.current = true

    navigate(STORAGE_SETUP_PATH, { replace: true })
  }, [navigate, needsSetup, pathname])
}
