import { Button } from '@afilmory/ui'
import { Spring } from '@afilmory/utils'
import { m } from 'motion/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getActionTypeMeta, getConflictTypeLabel, PHOTO_ACTION_TYPE_CONFIG } from '../../constants'
import type {
  PhotoAssetSummary,
  PhotoSyncAction,
  PhotoSyncResult,
  PhotoSyncRunRecord,
  PhotoSyncSnapshot,
} from '../../types'

export function BorderOverlay() {
  return (
    <>
      <div className="via-text/20 absolute top-0 right-0 left-0 h-[0.5px] bg-linear-to-r from-transparent to-transparent" />
      <div className="via-text/20 absolute top-0 right-0 bottom-0 w-[0.5px] bg-linear-to-b from-transparent to-transparent" />
      <div className="via-text/20 absolute right-0 bottom-0 left-0 h-[0.5px] bg-linear-to-r from-transparent to-transparent" />
      <div className="via-text/20 absolute top-0 bottom-0 left-0 w-[0.5px] bg-linear-to-b from-transparent to-transparent" />
    </>
  )
}

type SummaryCardProps = {
  label: string
  value: number
  tone?: 'accent' | 'warning' | 'muted'
}

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  const toneClass =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'warning'
        ? 'text-amber-400'
        : tone === 'muted'
          ? 'text-text-secondary'
          : 'text-text'

  return (
    <div className="relative overflow-hidden p-5 bg-background-tertiary">
      <BorderOverlay />
      <p className="text-text-tertiary text-xs tracking-wide uppercase">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

const photoSyncResultSummaryLabelKeys = {
  storageObjects: 'photos.sync.result.summary.labels.storage-objects',
  databaseRecords: 'photos.sync.result.summary.labels.database-records',
  inserted: 'photos.sync.result.summary.labels.inserted',
  updated: 'photos.sync.result.summary.labels.updated',
  deleted: 'photos.sync.result.summary.labels.deleted',
  conflicts: 'photos.sync.result.summary.labels.conflicts',
  errors: 'photos.sync.result.summary.labels.errors',
  skipped: 'photos.sync.result.summary.labels.skipped',
  completed: 'photos.sync.result.summary.labels.completed',
  pending: 'photos.sync.result.summary.labels.pending',
} as const satisfies Record<string, I18nKeys>

const photoSyncResultKeys = {
  duration: {
    lessThanSecond: 'photos.sync.result.duration.less-than-second',
    minutes: 'photos.sync.result.duration.minutes',
    seconds: 'photos.sync.result.duration.seconds',
  },
  summary: {
    heading: 'photos.sync.result.summary.heading',
    descriptionLatest: 'photos.sync.result.summary.description.latest',
    descriptionPreview: 'photos.sync.result.summary.description.preview',
    descriptionLive: 'photos.sync.result.summary.description.live',
  },
  history: {
    heading: 'photos.sync.result.history.heading',
    completedAt: 'photos.sync.result.history.completed-at',
    duration: 'photos.sync.result.history.duration',
    modePreview: 'photos.sync.result.history.mode.preview',
    modeLive: 'photos.sync.result.history.mode.live',
    operations: 'photos.sync.result.history.operations',
  },
  status: {
    loadingTitle: 'photos.sync.result.status.loading.title',
    loadingDescription: 'photos.sync.result.status.loading.description',
    emptyTitle: 'photos.sync.result.status.empty.title',
    emptyDescription: 'photos.sync.result.status.empty.description',
  },
  operations: {
    count: 'photos.sync.result.operations.count',
    filterLabel: 'photos.sync.result.operations.filter-label',
  },
  table: {
    title: 'photos.sync.result.table.title',
    modePreview: 'photos.sync.result.table.mode.preview',
    modeLive: 'photos.sync.result.table.mode.live',
    emptyFiltered: 'photos.sync.result.table.empty.filtered',
    emptyNone: 'photos.sync.result.table.empty.none',
  },
  filters: {
    all: 'photos.sync.result.filters.all',
  },
  info: {
    photoId: 'photos.sync.result.info.photo-id',
    conflictType: 'photos.sync.result.info.conflict-type',
    storageKey: 'photos.sync.result.info.storage-key',
  },
  actions: {
    applied: 'photos.sync.result.actions.applied',
    pending: 'photos.sync.result.actions.pending',
    expand: 'photos.sync.result.actions.expand',
    collapse: 'photos.sync.result.actions.collapse',
  },
  alerts: {
    openOriginalFailed: 'photos.sync.result.alerts.open-original-failed',
  },
  manifest: {
    empty: 'photos.sync.result.manifest.empty',
  },
} as const satisfies {
  duration: Record<'lessThanSecond' | 'minutes' | 'seconds', I18nKeys>
  summary: Record<'heading' | 'descriptionLatest' | 'descriptionPreview' | 'descriptionLive', I18nKeys>
  history: Record<'heading' | 'completedAt' | 'duration' | 'modePreview' | 'modeLive' | 'operations', I18nKeys>
  status: Record<'loadingTitle' | 'loadingDescription' | 'emptyTitle' | 'emptyDescription', I18nKeys>
  operations: Record<'count' | 'filterLabel', I18nKeys>
  table: Record<'title' | 'modePreview' | 'modeLive' | 'emptyFiltered' | 'emptyNone', I18nKeys>
  filters: Record<'all', I18nKeys>
  info: Record<'photoId' | 'conflictType' | 'storageKey', I18nKeys>
  actions: Record<'applied' | 'pending' | 'expand' | 'collapse', I18nKeys>
  alerts: Record<'openOriginalFailed', I18nKeys>
  manifest: Record<'empty', I18nKeys>
}

type PhotoSyncResultPanelProps = {
  result: PhotoSyncResult | null
  lastWasDryRun: boolean | null
  baselineSummary?: PhotoAssetSummary | null
  isSummaryLoading?: boolean
  lastSyncRun?: PhotoSyncRunRecord | null
  isSyncStatusLoading?: boolean
  onRequestStorageUrl?: (storageKey: string) => Promise<string>
}

const actionTypeConfig = PHOTO_ACTION_TYPE_CONFIG

const SUMMARY_SKELETON_KEYS = ['summary-skeleton-1', 'summary-skeleton-2', 'summary-skeleton-3', 'summary-skeleton-4']

export function PhotoSyncResultPanel({
  result,
  lastWasDryRun,
  baselineSummary,
  isSummaryLoading,
  lastSyncRun,
  isSyncStatusLoading,
  onRequestStorageUrl,
}: PhotoSyncResultPanelProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language ?? i18n.resolvedLanguage ?? 'en'
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  )
  const formatDateTimeLabel = useCallback(
    (value: string): string => {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return value
      }
      return dateTimeFormatter.format(date)
    },
    [dateTimeFormatter],
  )
  const formatDurationLabel = useCallback(
    (start: string, end: string): string => {
      const startedAt = new Date(start)
      const completedAt = new Date(end)
      const duration = completedAt.getTime() - startedAt.getTime()
      if (!Number.isFinite(duration) || duration <= 0) {
        return t(photoSyncResultKeys.duration.lessThanSecond)
      }
      const totalSeconds = Math.max(Math.round(duration / 1000), 1)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      const parts: string[] = []
      if (minutes > 0) {
        parts.push(t(photoSyncResultKeys.duration.minutes, { count: minutes }))
      }
      parts.push(t(photoSyncResultKeys.duration.seconds, { count: seconds }))
      return parts.join(' ')
    },
    [t],
  )
  const isAwaitingStatus = isSyncStatusLoading && !lastSyncRun
  const summaryItems = useMemo(() => {
    const label = (key: keyof typeof photoSyncResultSummaryLabelKeys) => t(photoSyncResultSummaryLabelKeys[key])
    if (result) {
      return [
        { label: label('storageObjects'), value: result.summary.storageObjects },
        { label: label('databaseRecords'), value: result.summary.databaseRecords },
        {
          label: label('inserted'),
          value: result.summary.inserted,
          tone: 'accent' as const,
        },
        { label: label('updated'), value: result.summary.updated },
        { label: label('deleted'), value: result.summary.deleted },
        {
          label: label('conflicts'),
          value: result.summary.conflicts,
          tone: result.summary.conflicts > 0 ? ('warning' as const) : ('muted' as const),
        },
        {
          label: label('errors'),
          value: result.summary.errors,
          tone: result.summary.errors > 0 ? ('warning' as const) : ('muted' as const),
        },
        {
          label: label('skipped'),
          value: result.summary.skipped,
          tone: 'muted' as const,
        },
      ]
    }

    if (lastSyncRun) {
      return [
        { label: label('storageObjects'), value: lastSyncRun.summary.storageObjects },
        { label: label('databaseRecords'), value: lastSyncRun.summary.databaseRecords },
        {
          label: label('inserted'),
          value: lastSyncRun.summary.inserted,
          tone: lastSyncRun.summary.inserted > 0 ? ('accent' as const) : undefined,
        },
        { label: label('updated'), value: lastSyncRun.summary.updated },
        { label: label('deleted'), value: lastSyncRun.summary.deleted },
        {
          label: label('conflicts'),
          value: lastSyncRun.summary.conflicts,
          tone: lastSyncRun.summary.conflicts > 0 ? ('warning' as const) : ('muted' as const),
        },
        {
          label: label('errors'),
          value: lastSyncRun.summary.errors,
          tone: lastSyncRun.summary.errors > 0 ? ('warning' as const) : ('muted' as const),
        },
        {
          label: label('skipped'),
          value: lastSyncRun.summary.skipped,
          tone: 'muted' as const,
        },
      ]
    }

    if (baselineSummary) {
      return [
        { label: label('databaseRecords'), value: baselineSummary.total },
        { label: label('completed'), value: baselineSummary.synced },
        {
          label: label('conflicts'),
          value: baselineSummary.conflicts,
          tone: baselineSummary.conflicts > 0 ? ('warning' as const) : ('muted' as const),
        },
        {
          label: label('pending'),
          value: baselineSummary.pending,
          tone: baselineSummary.pending > 0 ? ('accent' as const) : ('muted' as const),
        },
      ]
    }

    return []
  }, [baselineSummary, lastSyncRun, result, t])

  const lastSyncRunMeta = useMemo(() => {
    if (!lastSyncRun) {
      return null
    }

    return {
      completedLabel: formatDateTimeLabel(lastSyncRun.completedAt),
      durationLabel: formatDurationLabel(lastSyncRun.startedAt, lastSyncRun.completedAt),
    }
  }, [lastSyncRun])

  const [selectedActionType, setSelectedActionType] = useState<'all' | PhotoSyncAction['type']>('all')
  const [expandedActionKey, setExpandedActionKey] = useState<string | null>(null)

  const actionFilters = useMemo(() => {
    const counts: Record<PhotoSyncAction['type'], number> = {
      insert: 0,
      update: 0,
      delete: 0,
      conflict: 0,
      error: 0,
      noop: 0,
    }

    if (result) {
      for (const action of result.actions) {
        counts[action.type] = (counts[action.type] ?? 0) + 1
      }
    }

    return [
      {
        type: 'all' as const,
        label: t(photoSyncResultKeys.filters.all),
        count: result ? result.actions.length : 0,
      },
      ...Object.entries(actionTypeConfig).map(([type]) => {
        const typed = type as PhotoSyncAction['type']
        return {
          type: typed,
          label: getActionTypeMeta(typed).label,
          count: counts[typed] ?? 0,
        }
      }),
    ]
  }, [result, t])

  const filteredActions = useMemo(() => {
    if (!result) {
      return [] as PhotoSyncAction[]
    }

    if (selectedActionType === 'all') {
      return result.actions
    }

    return result.actions.filter((action) => action.type === selectedActionType)
  }, [result, selectedActionType])

  const activeFilter = actionFilters.find((item) => item.type === selectedActionType)

  const handleSelectActionType = (type: 'all' | PhotoSyncAction['type']) => {
    setSelectedActionType(type)
    setExpandedActionKey(null)
  }

  const handleToggleAction = (key: string) => {
    setExpandedActionKey((prev) => (prev === key ? null : key))
  }

  const handleOpenOriginal = async (action: PhotoSyncAction) => {
    const manifest = action.manifestAfter ?? action.manifestBefore
    if (!manifest) return

    const candidate = manifest.originalUrl ?? manifest.thumbnailUrl
    if (candidate) {
      window.open(candidate, '_blank', 'noopener,noreferrer')
      return
    }

    if (!onRequestStorageUrl) return

    try {
      const url = await onRequestStorageUrl(action.storageKey)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      const fallback = t(photoSyncResultKeys.alerts.openOriginalFailed)
      const description = error instanceof Error ? error.message : String(error)
      toast.error(fallback, { description })
    }
  }

  const renderActionDetails = (action: PhotoSyncAction) => {
    const { label, badgeClass } = getActionTypeMeta(action.type)
    const {
      manifestBefore: beforeManifest,
      manifestAfter: afterManifest,
      conflictPayload,
      resolution,
      storageKey,
      photoId,
      applied,
    } = action
    const resolutionLabel =
      resolution === 'prefer-storage'
        ? t('photos.sync.conflicts.strategy.storage')
        : resolution === 'prefer-database'
          ? t('photos.sync.conflicts.strategy.database')
          : null
    const conflictTypeLabel = action.type === 'conflict' ? getConflictTypeLabel(conflictPayload?.type) : null

    return (
      <div className="relative overflow-hidden p-4">
        <BorderOverlay />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
              {label}
            </span>
            <code className="text-text-secondary text-xs">{storageKey}</code>
            {photoId ? (
              <span className="text-text-tertiary text-xs">
                {t(photoSyncResultKeys.info.photoId)} {photoId}
              </span>
            ) : null}
          </div>
          <span className="text-text-tertiary inline-flex items-center gap-1 text-xs">
            <span>{applied ? t(photoSyncResultKeys.actions.applied) : t(photoSyncResultKeys.actions.pending)}</span>
            {resolutionLabel ? <span>· {resolutionLabel}</span> : null}
          </span>
        </div>

        {action.reason ? <p className="text-text-tertiary text-sm mt-2">{action.reason}</p> : null}

        {conflictTypeLabel || conflictPayload?.incomingStorageKey ? (
          <div className="text-text-tertiary text-xs">
            {conflictTypeLabel ? (
              <span>
                {t(photoSyncResultKeys.info.conflictType)} {conflictTypeLabel}
              </span>
            ) : null}
            {conflictPayload?.incomingStorageKey ? (
              <span className="ml-2">
                {t(photoSyncResultKeys.info.storageKey)}
                <code className="text-text ml-1 font-mono text-[11px]">{conflictPayload.incomingStorageKey}</code>
              </span>
            ) : null}
          </div>
        ) : null}

        {(beforeManifest || afterManifest) && (
          <div className="grid gap-3 md:grid-cols-2">
            <ManifestPreview variant="database" manifest={beforeManifest} />
            <ManifestPreview
              variant="storage"
              manifest={afterManifest}
              onOpenOriginal={() => handleOpenOriginal(action)}
            />
          </div>
        )}

        {action.snapshots ? (
          <div className="text-text-tertiary grid gap-4 text-xs md:grid-cols-2">
            {action.snapshots.before ? (
              <div className="mt-4">
                <p className="text-text font-semibold">{t('photos.sync.metadata.database')}</p>
                <MetadataSnapshot snapshot={action.snapshots.before} />
              </div>
            ) : null}
            {action.snapshots.after ? (
              <div className="mt-4">
                <p className="text-text font-semibold">{t('photos.sync.metadata.storage')}</p>
                <MetadataSnapshot snapshot={action.snapshots.after} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  if (!result) {
    if (lastSyncRun && lastSyncRunMeta) {
      return (
        <div className="relative overflow-hidden p-6 bg-background-secondary">
          <BorderOverlay />
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-text text-base font-semibold">{t(photoSyncResultKeys.history.heading)}</h2>
              <p className="text-text-tertiary text-sm">
                <span>{t(photoSyncResultKeys.history.completedAt, { time: lastSyncRunMeta.completedLabel })}</span>
                <span className="mx-1">·</span>
                <span>{t(photoSyncResultKeys.history.duration, { duration: lastSyncRunMeta.durationLabel })}</span>
                <span className="mx-1">·</span>
                <span>
                  {lastSyncRun.dryRun
                    ? t(photoSyncResultKeys.history.modePreview)
                    : t(photoSyncResultKeys.history.modeLive)}
                </span>
              </p>
              <p className="text-text-tertiary text-xs">
                <span>{t(photoSyncResultKeys.history.operations, { count: lastSyncRun.actionsCount })}</span>
              </p>
            </div>
            {summaryItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryItems.map((item) => (
                  <SummaryCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )
    }

    const showSkeleton = isSummaryLoading || isAwaitingStatus

    return (
      <div className="relative overflow-hidden p-6 bg-background-secondary">
        <BorderOverlay />
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-text text-base font-semibold">
              {isAwaitingStatus ? t(photoSyncResultKeys.status.loadingTitle) : t(photoSyncResultKeys.status.emptyTitle)}
            </h2>
            <p className="text-text-tertiary text-sm">
              {isAwaitingStatus
                ? t(photoSyncResultKeys.status.loadingDescription)
                : t(photoSyncResultKeys.status.emptyDescription)}
            </p>
          </div>
          {showSkeleton ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {SUMMARY_SKELETON_KEYS.map((key) => (
                <div key={key} className="bg-fill/30 h-24 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : summaryItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryItems.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-text text-lg font-semibold">{t(photoSyncResultKeys.summary.heading)}</h2>
          <p className="text-text-tertiary text-sm">
            {lastWasDryRun === null
              ? t(photoSyncResultKeys.summary.descriptionLatest)
              : lastWasDryRun
                ? t(photoSyncResultKeys.summary.descriptionPreview)
                : t(photoSyncResultKeys.summary.descriptionLive)}
          </p>
        </div>
        <p className="text-text-tertiary text-xs">
          <span>{t(photoSyncResultKeys.operations.count, { count: filteredActions.length })}</span>
          {result && selectedActionType !== 'all' ? (
            <span className="ml-1 inline-flex items-center gap-1">
              <span>{t(photoSyncResultKeys.operations.filterLabel)}</span>
              <span>{activeFilter?.label ?? ''}</span>
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {summaryItems.map((item, index) => (
          <m.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...Spring.presets.smooth, delay: index * 0.04 }}
          >
            <SummaryCard label={item.label} value={item.value} tone={item.tone} />
          </m.div>
        ))}
      </div>

      <div className="relative overflow-hidden bg-background-tertiary">
        <BorderOverlay />
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-text text-base font-semibold">{t(photoSyncResultKeys.table.title)}</h3>
            <span className="text-text-tertiary text-xs">
              {lastWasDryRun ? t(photoSyncResultKeys.table.modePreview) : t(photoSyncResultKeys.table.modeLive)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {actionFilters.map((filter) => (
              <Button
                key={filter.type}
                type="button"
                size="xs"
                variant={selectedActionType === filter.type ? 'primary' : 'ghost'}
                className="gap-1 group"
                data-selected={selectedActionType === filter.type}
                onClick={() => handleSelectActionType(filter.type)}
              >
                <span>{filter.label}</span>
                <span className="text-text-tertiary text-[11px] group-data-[selected=true]:text-text">
                  {filter.count}
                </span>
              </Button>
            ))}
          </div>

          {filteredActions.length === 0 ? (
            <p className="text-text-tertiary text-sm mt-4">
              {result ? t(photoSyncResultKeys.table.emptyFiltered) : t(photoSyncResultKeys.table.emptyNone)}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredActions.map((action, index) => {
                const actionKey = `${action.storageKey}-${action.type}-${action.photoId ?? 'none'}-${action.manifestAfter?.id ?? action.manifestBefore?.id ?? 'unknown'}`
                const { label, badgeClass } = getActionTypeMeta(action.type)
                const resolutionLabel =
                  action.resolution === 'prefer-storage'
                    ? t('photos.sync.conflicts.strategy.storage')
                    : action.resolution === 'prefer-database'
                      ? t('photos.sync.conflicts.strategy.database')
                      : null
                const { conflictPayload } = action
                const conflictTypeLabel =
                  action.type === 'conflict' ? getConflictTypeLabel(conflictPayload?.type) : null
                const incomingKey = conflictPayload?.incomingStorageKey
                const isExpanded = expandedActionKey === actionKey

                return (
                  <m.div
                    key={actionKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      ...Spring.presets.snappy,
                      delay: index * 0.03,
                    }}
                  >
                    <div className="border-border/20 mt-4 bg-fill/10 relative overflow-hidden rounded-lg">
                      <BorderOverlay />
                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
                            >
                              {label}
                            </span>
                            <code className="text-text-secondary text-xs">{action.storageKey}</code>
                            {action.photoId ? (
                              <span className="text-text-tertiary text-xs">
                                {t(photoSyncResultKeys.info.photoId)} {action.photoId}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-text-tertiary flex flex-wrap items-center gap-2 text-xs">
                            <span>
                              {action.applied
                                ? t(photoSyncResultKeys.actions.applied)
                                : t(photoSyncResultKeys.actions.pending)}
                            </span>
                            {resolutionLabel ? <span>· {resolutionLabel}</span> : null}
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => handleToggleAction(actionKey)}
                            >
                              {isExpanded
                                ? t(photoSyncResultKeys.actions.collapse)
                                : t(photoSyncResultKeys.actions.expand)}
                            </Button>
                          </div>
                        </div>

                        {action.reason ? <p className="text-text-tertiary text-sm">{action.reason}</p> : null}

                        {conflictTypeLabel || incomingKey ? (
                          <div className="text-text-tertiary text-xs">
                            {conflictTypeLabel ? (
                              <span>
                                {t(photoSyncResultKeys.info.conflictType)} {conflictTypeLabel}
                              </span>
                            ) : null}
                            {incomingKey ? (
                              <span className="ml-2">
                                {t(photoSyncResultKeys.info.storageKey)}
                                <code className="text-text ml-1 font-mono text-[11px]">{incomingKey}</code>
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {isExpanded ? (
                          <div className="border-border/10 border-t pt-3">{renderActionDetails(action)}</div>
                        ) : null}
                      </div>
                    </div>
                  </m.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ManifestPreview({
  variant,
  manifest,
  onOpenOriginal,
}: {
  variant: 'database' | 'storage'
  manifest: PhotoSyncAction['manifestAfter'] | PhotoSyncAction['manifestBefore']
  onOpenOriginal?: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language ?? i18n.resolvedLanguage ?? 'en'
  const titleKey =
    variant === 'database'
      ? 'photos.sync.conflicts.preview.database.title'
      : 'photos.sync.conflicts.preview.storage.title'
  const emptyLabel =
    variant === 'database' ? 'photos.sync.conflicts.preview.database.empty' : photoSyncResultKeys.manifest.empty
  if (!manifest) {
    return (
      <div className="border-border/20 bg-background-secondary/60 text-text-tertiary rounded-md border p-3 text-xs">
        <p className="text-text text-sm font-semibold">{t(titleKey)}</p>
        <p className="mt-1">{t(emptyLabel)}</p>
      </div>
    )
  }

  const dimensions =
    manifest.width && manifest.height ? `${manifest.width} × ${manifest.height}` : t('photos.sync.metadata.unknown')
  const sizeMB =
    typeof manifest.size === 'number' && manifest.size > 0
      ? `${(manifest.size / (1024 * 1024)).toLocaleString(locale, { maximumFractionDigits: 2 })} MB`
      : t('photos.sync.metadata.unknown')
  const updatedAt = manifest.lastModified
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(manifest.lastModified),
      )
    : t('photos.sync.metadata.unknown')

  return (
    <div className="border-border/20 bg-background-secondary/60 rounded-md border p-3">
      <div className="flex items-start gap-3">
        {manifest.thumbnailUrl ? (
          <img src={manifest.thumbnailUrl} alt={manifest.id} className="h-16 w-20 rounded-md object-cover" />
        ) : null}
        <div className="text-text-tertiary space-y-1 text-xs">
          <p className="text-text text-sm font-semibold">{t(titleKey)}</p>
          <div className="flex items-center gap-2">
            <span className="text-text">{t('photos.sync.conflicts.preview.common.id')}</span>
            <span className="truncate">{manifest.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text">{t('photos.sync.conflicts.preview.common.dimensions')}</span>
            <span>{dimensions}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text">{t('photos.sync.conflicts.preview.common.size')}</span>
            <span>{sizeMB}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text">{t('photos.sync.conflicts.preview.common.updated-at')}</span>
            <span>{updatedAt}</span>
          </div>
        </div>
      </div>
      {onOpenOriginal ? (
        <Button type="button" variant="ghost" size="xs" className="mt-3" onClick={onOpenOriginal}>
          {t('photos.sync.conflicts.actions.view-original')}
        </Button>
      ) : null}
    </div>
  )
}

type MetadataSnapshotProps = {
  snapshot: PhotoSyncSnapshot | null | undefined
}

export function MetadataSnapshot({ snapshot }: MetadataSnapshotProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language ?? i18n.resolvedLanguage ?? 'en'
  if (!snapshot) return null
  const sizeLabel =
    snapshot.size !== null
      ? `${(snapshot.size / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 2 })} MB`
      : t('photos.sync.metadata.unknown')
  const etagLabel = snapshot.etag ?? t('photos.sync.metadata.unknown')
  const updatedAtLabel = snapshot.lastModified ?? t('photos.sync.metadata.unknown')
  const hashLabel = snapshot.metadataHash ?? t('photos.sync.metadata.none')
  return (
    <dl className="mt-2 space-y-1">
      <div className="flex items-center justify-between gap-4">
        <dt>{t('photos.sync.metadata.size')}</dt>
        <dd className="text-text text-right">{sizeLabel}</dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt>{t('photos.sync.metadata.etag')}</dt>
        <dd className="text-text text-right font-mono text-[10px]">{etagLabel}</dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt>{t('photos.sync.metadata.updated-at')}</dt>
        <dd className="text-text text-right">{updatedAtLabel}</dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt>{t('photos.sync.metadata.hash')}</dt>
        <dd className="text-text text-right font-mono text-[10px]">{hashLabel}</dd>
      </div>
    </dl>
  )
}
