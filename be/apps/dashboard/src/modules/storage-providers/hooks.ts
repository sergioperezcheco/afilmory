import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getStorageProviderFormSchema, getStorageSettings, updateStorageSettings } from './api'
import { STORAGE_SETTING_KEYS } from './constants'
import type { StorageProvider, StorageProvidersPayload } from './types'
import {
  ensureActiveProviderId,
  normalizeStorageProviderConfig,
  parseStorageProviders,
  serializeStorageProviders,
} from './utils'

export const STORAGE_PROVIDERS_QUERY_KEY = ['settings', 'storage-providers'] as const
export const STORAGE_PROVIDER_SCHEMA_QUERY_KEY = ['settings', 'storage-providers', 'schema'] as const

export function useStorageProvidersQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: STORAGE_PROVIDERS_QUERY_KEY,
    queryFn: async () => {
      const response = await getStorageSettings([
        STORAGE_SETTING_KEYS.providers,
        STORAGE_SETTING_KEYS.activeProvider,
        STORAGE_SETTING_KEYS.secureAccess,
      ])

      const rawProviders = response.values[STORAGE_SETTING_KEYS.providers] ?? '[]'
      const providers = parseStorageProviders(rawProviders).map((provider) => normalizeStorageProviderConfig(provider))
      const activeProviderRaw = response.values[STORAGE_SETTING_KEYS.activeProvider] ?? ''
      const activeProviderId =
        typeof activeProviderRaw === 'string' && activeProviderRaw.trim().length > 0 ? activeProviderRaw.trim() : null
      const secureAccessRaw = response.values[STORAGE_SETTING_KEYS.secureAccess] ?? 'false'
      const secureAccessEnabled =
        typeof secureAccessRaw === 'string' ? secureAccessRaw.trim().toLowerCase() === 'true' : Boolean(secureAccessRaw)

      return {
        providers,
        activeProviderId: ensureActiveProviderId(providers, activeProviderId),
        secureAccessEnabled,
      }
    },
    enabled: options?.enabled ?? true,
  })
}

export function useStorageProviderSchemaQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: STORAGE_PROVIDER_SCHEMA_QUERY_KEY,
    queryFn: async () => await getStorageProviderFormSchema(),
    enabled: options?.enabled ?? true,
  })
}

export function useUpdateStorageProvidersMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: StorageProvidersPayload) => {
      const currentProviders = payload.providers.map((provider) => normalizeStorageProviderConfig(provider))
      const previousProviders = queryClient.getQueryData<{
        providers: StorageProvider[]
        activeProviderId: string | null
        secureAccessEnabled: boolean
      }>(STORAGE_PROVIDERS_QUERY_KEY)?.providers

      const resolvedProviders = restoreProviderSecrets(currentProviders, previousProviders ?? [])
      const resolvedActiveId = ensureActiveProviderId(resolvedProviders, payload.activeProviderId ?? null)

      await updateStorageSettings([
        {
          key: STORAGE_SETTING_KEYS.providers,
          value: serializeStorageProviders(resolvedProviders),
        },
        {
          key: STORAGE_SETTING_KEYS.activeProvider,
          value: resolvedActiveId ?? '',
        },
      ])

      return {
        providers: resolvedProviders,
        activeProviderId: resolvedActiveId,
        secureAccessEnabled: payload.secureAccessEnabled,
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(STORAGE_PROVIDERS_QUERY_KEY, data)
      void queryClient.invalidateQueries({
        queryKey: STORAGE_PROVIDERS_QUERY_KEY,
      })
    },
  })
}

export function useUpdateStorageSecureAccessMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await updateStorageSettings([
        {
          key: STORAGE_SETTING_KEYS.secureAccess,
          value: enabled ? 'true' : 'false',
        },
      ])
      return enabled
    },
    onSuccess: (nextEnabled) => {
      queryClient.setQueryData(
        STORAGE_PROVIDERS_QUERY_KEY,
        (
          previous:
            | {
                providers: StorageProvider[]
                activeProviderId: string | null
                secureAccessEnabled: boolean
              }
            | undefined,
        ) => {
          if (!previous) {
            return previous
          }
          return {
            ...previous,
            secureAccessEnabled: nextEnabled,
          }
        },
      )
    },
  })
}

function restoreProviderSecrets(
  nextProviders: StorageProvider[],
  previousProviders: StorageProvider[],
): StorageProvider[] {
  const previousMap = new Map(previousProviders.map((provider) => [provider.id, provider]))

  return nextProviders.map((provider) => {
    const previous = previousMap.get(provider.id)
    const config: Record<string, string> = { ...provider.config }

    for (const [key, value] of Object.entries(config)) {
      if (value.trim().length === 0 && previous) {
        config[key] = previous.config[key] ?? ''
      }
    }

    return { ...provider, config }
  })
}
