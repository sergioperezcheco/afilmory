import { Button, DialogDescription, DialogHeader, DialogTitle } from '@afilmory/ui'
import { clsxm } from '@afilmory/utils'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getI18n } from '~/i18n'
import type { ManagedStoragePlanSummary } from '~/modules/storage-plans'
import { useManagedStoragePlansQuery, useUpdateManagedStoragePlanMutation } from '~/modules/storage-plans'

const managedStorageI18nKeys = {
  title: 'photos.storage.managed.title',
  description: 'photos.storage.managed.description',
  unavailable: 'photos.storage.managed.unavailable',
  empty: 'photos.storage.managed.empty',
  capacityLabel: 'photos.storage.managed.capacity.label',
  capacityUnlimited: 'photos.storage.managed.capacity.unlimited',
  capacityUnknown: 'photos.storage.managed.capacity.unknown',
  priceLabel: 'photos.storage.managed.price.label',
  priceFree: 'photos.storage.managed.price.free',
  actionsSubscribe: 'photos.storage.managed.actions.subscribe',
  actionsSwitch: 'photos.storage.managed.actions.switch',
  actionsCurrent: 'photos.storage.managed.actions.current',
  actionsCancel: 'photos.storage.managed.actions.cancel',
  actionsLoading: 'photos.storage.managed.actions.loading',
  errorLoad: 'photos.storage.managed.error.load',
  toastSuccess: 'photos.storage.managed.toast.success',
  toastError: 'photos.storage.managed.toast.error',
} as const

export function ManagedStoragePlansModal() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language ?? i18n.resolvedLanguage ?? 'en'
  const plansQuery = useManagedStoragePlansQuery()
  const updateMutation = useUpdateManagedStoragePlanMutation()

  const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const priceFormatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })

  const handleSelect = async (planId: string | null) => {
    try {
      await updateMutation.mutateAsync(planId)
      toast.success(t(managedStorageI18nKeys.toastSuccess))
    } catch (error) {
      toast.error(
        t(managedStorageI18nKeys.toastError, {
          reason: extractErrorMessage(error, t('common.unknown-error')),
        }),
      )
    }
  }

  return (
    <div className="flex h-full max-h-[85vh] flex-col">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
          {t(managedStorageI18nKeys.title)}
        </DialogTitle>
        <DialogDescription className="text-text-secondary text-sm">
          {t(managedStorageI18nKeys.description)}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-4">
        {plansQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="bg-background-tertiary h-40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : plansQuery.isError ? (
          <div className="rounded-xl border border-red/30 bg-red/10 p-4 text-sm text-red">
            {t(managedStorageI18nKeys.errorLoad)}
          </div>
        ) : !plansQuery.data?.managedStorageEnabled ? (
          <div className="rounded-xl border border-border/30 bg-background-secondary/30 p-4 text-sm text-text-secondary">
            {t(managedStorageI18nKeys.unavailable)}
          </div>
        ) : plansQuery.data.availablePlans.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-background-secondary/30 p-4 text-sm text-text-secondary">
            {t(managedStorageI18nKeys.empty)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plansQuery.data.availablePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={plansQuery.data?.currentPlanId === plan.id}
                hasCurrentPlan={Boolean(plansQuery.data?.currentPlanId)}
                isProcessing={updateMutation.isPending}
                onSelect={() => handleSelect(plan.id)}
                formatCapacity={(bytes) => formatCapacity(bytes, numberFormatter)}
                formatPrice={(value, currency) => formatPrice(value, currency, priceFormatter)}
              />
            ))}
          </div>
        )}

        {plansQuery.data?.currentPlanId ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() => handleSelect(null)}
            >
              {updateMutation.isPending
                ? t(managedStorageI18nKeys.actionsLoading)
                : t(managedStorageI18nKeys.actionsCancel)}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  isCurrent,
  hasCurrentPlan,
  isProcessing,
  onSelect,
  formatCapacity,
  formatPrice,
}: {
  plan: ManagedStoragePlanSummary
  isCurrent: boolean
  hasCurrentPlan: boolean
  isProcessing: boolean
  onSelect: () => void
  formatCapacity: (bytes: number | null) => string
  formatPrice: (value: number, currency: string | null | undefined) => string
}) {
  const { t } = useTranslation()

  const hasPrice =
    plan.pricing &&
    plan.pricing.monthlyPrice !== null &&
    plan.pricing.monthlyPrice !== undefined &&
    Number.isFinite(plan.pricing.monthlyPrice)

  const priceLabel = hasPrice
    ? t(managedStorageI18nKeys.priceLabel, {
        price: formatPrice(plan.pricing!.monthlyPrice as number, plan.pricing!.currency ?? null),
      })
    : t(managedStorageI18nKeys.priceFree)

  const capacityLabel = formatCapacity(plan.capacityBytes)
  const actionLabel = isCurrent
    ? t(managedStorageI18nKeys.actionsCurrent)
    : hasCurrentPlan
      ? t(managedStorageI18nKeys.actionsSwitch)
      : t(managedStorageI18nKeys.actionsSubscribe)

  return (
    <div
      className={clsxm(
        'border-border/40 bg-background-secondary/40 flex h-full flex-col rounded-2xl border p-5',
        isCurrent && 'border-accent/50 shadow-[0_0_0_1px_rgba(var(--color-accent-rgb),0.3)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-text text-base font-semibold">{plan.name}</h3>
          {plan.description ? <p className="text-text-tertiary mt-1 text-sm leading-snug">{plan.description}</p> : null}
        </div>
        {isCurrent ? (
          <span className="text-accent border-accent/40 bg-accent/10 rounded-full px-2 py-0.5 text-xs font-semibold">
            {t(managedStorageI18nKeys.actionsCurrent)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <p className="text-text font-medium">{capacityLabel}</p>
        <p className="text-text-secondary">{priceLabel}</p>
      </div>

      <Button
        type="button"
        className="mt-6 w-full"
        variant={isCurrent ? 'secondary' : 'primary'}
        disabled={isCurrent || isProcessing}
        onClick={onSelect}
      >
        {isProcessing ? t(managedStorageI18nKeys.actionsLoading) : actionLabel}
      </Button>
    </div>
  )
}

function formatCapacity(bytes: number | null, formatter: Intl.NumberFormat) {
  const { t } = getI18n()
  if (bytes === null) {
    return t(managedStorageI18nKeys.capacityUnlimited)
  }
  if (bytes === undefined || bytes <= 0 || Number.isNaN(bytes)) {
    return t(managedStorageI18nKeys.capacityUnknown)
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  const formattedValue = formatter.format(value >= 10 ? Math.round(value) : value)
  return t(managedStorageI18nKeys.capacityLabel, { value: `${formattedValue} ${units[exponent]}` })
}

function formatPrice(value: number, currency: string | null | undefined, formatter: Intl.NumberFormat) {
  const formatted = formatter.format(value)
  const normalizedCurrency = currency?.toUpperCase()?.trim()
  return normalizedCurrency ? `${normalizedCurrency} ${formatted}` : formatted
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message
  }
  return fallback
}
