import { Toaster } from '@afilmory/ui'
import { Spring } from '@afilmory/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'jotai'
import { domMax, LazyMotion, MotionConfig } from 'motion/react'
import type { FC, PropsWithChildren } from 'react'
import { useState } from 'react'

import { withCloud } from '~/lib/hoc/withCloud'
import { jotaiStore } from '~/lib/jotai'

import { ContextMenuProvider } from './context-menu-provider'
import { EventProvider } from './event-provider'
import { I18nProvider } from './i18n-provider'
import { SessionProvider } from './session-provider'
import { StableRouterProvider } from './stable-router-provider'

const CloudSessionProvider = withCloud(SessionProvider)

export const RootProviders: FC<PropsWithChildren> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  )

  return (
    <LazyMotion features={domMax} strict key="framer">
      <MotionConfig transition={Spring.presets.smooth}>
        <Provider store={jotaiStore}>
          <QueryClientProvider client={queryClient}>
            <CloudSessionProvider>
              <EventProvider />
              <StableRouterProvider />

              <ContextMenuProvider />
              <I18nProvider>{children}</I18nProvider>
            </CloudSessionProvider>
          </QueryClientProvider>
        </Provider>
      </MotionConfig>
      <Toaster />
    </LazyMotion>
  )
}
