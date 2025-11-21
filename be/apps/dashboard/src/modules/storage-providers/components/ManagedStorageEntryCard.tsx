import { Button, Modal } from '@afilmory/ui'
import { DynamicIcon } from 'lucide-react/dynamic'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { useManagedStoragePlansQuery } from '~/modules/storage-plans'

import { ManagedStoragePlansModal } from './ManagedStoragePlansModal'

const managedStorageI18nKeys = {
  title: 'photos.storage.managed.title',
  description: 'photos.storage.managed.description',
  unavailable: 'photos.storage.managed.unavailable',
  empty: 'photos.storage.managed.empty',
  action: 'photos.storage.managed.actions.subscribe',
  seePlans: 'photos.storage.managed.actions.switch',
  loading: 'photos.storage.managed.actions.loading',
} as const

export function ManagedStorageEntryCard() {
  const { t } = useTranslation()
  const plansQuery = useManagedStoragePlansQuery()

  const openModal = () => {
    Modal.present(ManagedStoragePlansModal, {}, { dismissOnOutsideClick: true })
  }

  return (
    <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="group relative flex h-full flex-col gap-3 overflow-hidden bg-background-tertiary p-5 text-left transition-all duration-200 hover:shadow-lg">
        <div className="via-text/20 group-hover:via-accent/40 absolute top-0 right-0 left-0 h-[0.5px] bg-linear-to-r from-transparent to-transparent transition-opacity" />
        <div className="via-text/20 group-hover:via-accent/40 absolute top-0 right-0 bottom-0 w-[0.5px] bg-linear-to-b from-transparent to-transparent transition-opacity" />
        <div className="via-text/20 group-hover:via-accent/40 absolute right-0 bottom-0 left-0 h-[0.5px] bg-linear-to-r from-transparent to-transparent transition-opacity" />
        <div className="via-text/20 group-hover:via-accent/40 absolute top-0 bottom-0 left-0 w-[0.5px] bg-linear-to-b from-transparent to-transparent transition-opacity" />

        <div className="relative">
          <div className="bg-accent/15 inline-flex h-12 w-12 items-center justify-center rounded-lg">
            <DynamicIcon name="hard-drive" className="h-6 w-6 text-accent" />
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <h3 className="text-text text-sm font-semibold">{t(managedStorageI18nKeys.title)}</h3>
          <p className="text-text-tertiary text-xs">{t(managedStorageI18nKeys.description)}</p>
        </div>
        {/* 
        <div className="text-text-tertiary/80 text-xs">
          {plansQuery.isLoading
            ? t(managedStorageI18nKeys.loading)
            : plansQuery.isError
              ? t(managedStorageI18nKeys.unavailable)
              : plansQuery.data?.managedStorageEnabled
                ? t(managedStorageI18nKeys.seePlans)
                : t(managedStorageI18nKeys.unavailable)}
        </div> */}

        <div className="flex justify-end -mb-3 -mt-2 -mr-3.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={
              plansQuery.isLoading ||
              plansQuery.isError ||
              !plansQuery.data ||
              (!plansQuery.data.managedStorageEnabled && plansQuery.data.availablePlans.length === 0)
            }
            onClick={openModal}
          >
            {t(managedStorageI18nKeys.action)}
          </Button>
        </div>
      </div>
    </m.div>
  )
}
