import { Spring } from '@afilmory/utils'
import { useAtom } from 'jotai'
import { m as motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import type { GalleryViewMode } from '~/atoms/app'
import { gallerySettingAtom } from '~/atoms/app'

export const ViewModeSegment = () => {
  const { t } = useTranslation()
  const [settings, setSettings] = useAtom(gallerySettingAtom)

  const handleViewModeChange = (mode: GalleryViewMode) => {
    setSettings((prev) => ({ ...prev, viewMode: mode }))
  }

  return (
    <div className="bg-material-medium/40 relative flex h-7 items-center gap-0.5 rounded-lg p-0.5 lg:h-8 lg:gap-1 lg:p-1">
      <button
        type="button"
        onClick={() => handleViewModeChange('masonry')}
        className={`relative z-10 flex h-full items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors duration-200 lg:px-4 ${
          settings.viewMode === 'masonry' ? 'text-white' : 'text-white/60 hover:text-white/80'
        }`}
        title={t('gallery.view.masonry')}
      >
        {settings.viewMode === 'masonry' && (
          <motion.span
            layoutId="segment-indicator"
            className="absolute inset-0 rounded-md bg-white/15 shadow-sm"
            transition={Spring.presets.snappy}
          />
        )}
        <i className="i-mingcute-grid-line relative z-10 text-sm lg:text-base" />
      </button>
      <button
        type="button"
        onClick={() => handleViewModeChange('list')}
        className={`relative z-10 flex h-full items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors duration-200 lg:px-4 ${
          settings.viewMode === 'list' ? 'text-white' : 'text-white/60 hover:text-white/80'
        }`}
        title={t('gallery.view.list')}
      >
        {settings.viewMode === 'list' && (
          <motion.span
            layoutId="segment-indicator"
            className="absolute inset-0 rounded-md bg-white/15 shadow-sm"
            transition={Spring.presets.snappy}
          />
        )}
        <i className="i-mingcute-list-ordered-line relative z-10 text-sm lg:text-base" />
      </button>
    </div>
  )
}
