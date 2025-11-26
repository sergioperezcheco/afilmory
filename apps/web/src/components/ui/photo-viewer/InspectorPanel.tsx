import type { PickedExif } from '@afilmory/builder'
import { SegmentGroup, SegmentItem } from '@afilmory/ui'
import { Spring } from '@afilmory/utils'
import { m } from 'motion/react'
import type { FC } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { injectConfig } from '~/config'
import { useMobile } from '~/hooks/useMobile'
import type { PhotoManifest } from '~/types/photo'

import { CommentsPanel } from './comments'
import { ExifPanelContent } from './ExifPanel'

type Tab = 'info' | 'comments'

export const InspectorPanel: FC<{
  currentPhoto: PhotoManifest
  exifData: PickedExif | null
  onClose?: () => void
  visible?: boolean
}> = ({ currentPhoto, exifData, onClose, visible = true }) => {
  const { t } = useTranslation()
  const isMobile = useMobile()
  const [activeTab, setActiveTab] = useState<Tab>('info')

  const showSocialFeatures = injectConfig.useCloud

  return (
    <m.div
      className={`${
        isMobile
          ? 'inspector-panel-mobile fixed right-0 bottom-0 left-0 z-10 max-h-[60vh] w-full rounded-t-2xl backdrop-blur-2xl'
          : 'relative w-80 shrink-0 backdrop-blur-2xl'
      } border-accent/20 flex flex-col text-white`}
      initial={{
        opacity: 0,
        ...(isMobile ? { y: 100 } : { x: 100 }),
      }}
      animate={{
        opacity: visible ? 1 : 0,
        ...(isMobile ? { y: visible ? 0 : 100 } : { x: visible ? 0 : 100 }),
      }}
      exit={{
        opacity: 0,
        ...(isMobile ? { y: 100 } : { x: 100 }),
      }}
      transition={Spring.presets.smooth}
      style={{
        pointerEvents: visible ? 'auto' : 'none',
        backgroundImage:
          'linear-gradient(to bottom right, rgba(var(--color-materialMedium)), rgba(var(--color-materialThick)), transparent)',
        boxShadow:
          '0 8px 32px color-mix(in srgb, var(--color-accent) 8%, transparent), 0 4px 16px color-mix(in srgb, var(--color-accent) 6%, transparent), 0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Inner glow layer */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent) 5%, transparent), transparent, color-mix(in srgb, var(--color-accent) 5%, transparent))',
        }}
      />

      {/* Header with tabs and actions */}
      <div className="relative z-50 mt-2 shrink-0">
        <div className="relative mb-3 flex items-center justify-center">
          {/* Tab switcher */}
          <SegmentGroup
            value={activeTab}
            onValueChanged={(value) => setActiveTab(value as Tab)}
            className="border-accent/20 bg-material-ultra-thick rounded text-white"
          >
            <SegmentItem
              value="info"
              activeBgClassName="bg-accent/20"
              className="text-white/60 hover:text-white/80 data-[state=active]:text-white"
              label={
                <div className="flex items-center">
                  <i className="i-mingcute-information-line mr-1.5" />
                  {t('inspector.tab.info')}
                </div>
              }
            />
            {showSocialFeatures && (
              <SegmentItem
                value="comments"
                activeBgClassName="bg-accent/20"
                className="text-white/60 hover:text-white/80 data-[state=active]:text-white"
                label={
                  <div className="flex items-center">
                    <i className="i-mingcute-comment-line mr-1.5" />
                    {t('inspector.tab.comments')}
                  </div>
                }
              />
            )}
          </SegmentGroup>

          {/* Close button (mobile only) */}
          {isMobile && onClose && (
            <button
              type="button"
              className="glassmorphic-btn border-accent/20 absolute right-0 flex size-8 items-center justify-center rounded-full border text-white/70 duration-200 hover:text-white"
              onClick={onClose}
            >
              <i className="i-mingcute-close-line text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="relative z-10 flex min-h-0 flex-1">
        {activeTab === 'info' ? (
          <ExifPanelContent currentPhoto={currentPhoto} exifData={exifData} />
        ) : (
          <CommentsPanel photoId={currentPhoto.id} visible={visible} />
        )}
      </div>
    </m.div>
  )
}
