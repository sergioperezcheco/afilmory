import type { ComponentType, PropsWithChildren } from 'react'
import { Fragment } from 'react'

import { injectConfig } from '~/config'

/**
 * Higher-order component that conditionally wraps a component based on `injectConfig.useCloud`.
 * When `useCloud` is true, returns the wrapped component.
 * When `useCloud` is false, returns a Fragment (no wrapper).
 *
 * This is useful for feature flags and gradual migration scenarios.
 *
 * @param Component - The component to conditionally wrap
 * @returns The wrapped component or Fragment wrapper
 *
 * @example
 * ```tsx
 * const CloudSessionProvider = withCloud(SessionProvider)
 * // When useCloud is true: <SessionProvider>{children}</SessionProvider>
 * // When useCloud is false: <Fragment>{children}</Fragment>
 * ```
 */
export function withCloud<P extends PropsWithChildren>(Component: ComponentType<P>): ComponentType<P> {
  const WrappedComponent = (props: P) => {
    if (injectConfig.useCloud) {
      return <Component {...props} />
    }
    return <Fragment>{props.children}</Fragment>
  }

  WrappedComponent.displayName = `withCloud(${Component.displayName || Component.name || 'Component'})`

  return WrappedComponent as ComponentType<P>
}
