import type { UiSchemaTFunction } from '../../ui/ui-schema/ui-schema.i18n'
import type { UiSchema } from '../../ui/ui-schema/ui-schema.type'
import type { BuilderSettingField } from './builder-setting.types'

export const BUILDER_SETTING_UI_SCHEMA_VERSION = '1.0.0'

export function createBuilderSettingUiSchema (t: UiSchemaTFunction): UiSchema<BuilderSettingField> {
  return {
  version: BUILDER_SETTING_UI_SCHEMA_VERSION,
  title: t('builder.title'),
  description: t('builder.description'),
  sections: [
    {
      type: 'section',
      id: 'builder-processing',
      title: t('builder.sections.processing.title'),
      description: t('builder.sections.processing.description'),
      icon: 'cpu',
      children: [
        {
          type: 'group',
          id: 'builder-processing-concurrency',
          title: t('builder.sections.processing.groups.concurrency.title'),
          icon: 'gauge-circle',
          children: [
            {
              type: 'field',
              id: 'default-concurrency',
              title: t('builder.sections.processing.groups.concurrency.fields.default-concurrency.title'),
              description: t('builder.sections.processing.groups.concurrency.fields.default-concurrency.description'),
              helperText: t('builder.sections.processing.groups.concurrency.fields.default-concurrency.helper'),
              key: 'system.processing.defaultConcurrency',
              component: {
                type: 'text',
                inputType: 'number',
                placeholder: '10',
              },
            },
            {
              type: 'field',
              id: 'worker-count',
              title: t('builder.sections.processing.groups.concurrency.fields.worker-count.title'),
              description: t('builder.sections.processing.groups.concurrency.fields.worker-count.description'),
              key: 'system.observability.performance.worker.workerCount',
              component: {
                type: 'text',
                inputType: 'number',
                placeholder: '16',
              },
            },
            {
              type: 'field',
              id: 'worker-timeout',
              title: t('builder.sections.processing.groups.concurrency.fields.worker-timeout.title'),
              description: t('builder.sections.processing.groups.concurrency.fields.worker-timeout.description'),
              key: 'system.observability.performance.worker.timeout',
              component: {
                type: 'text',
                inputType: 'number',
                placeholder: '30000',
              },
            },
          ],
        },
        {
          type: 'group',
          id: 'builder-processing-options',
          title: t('builder.sections.processing.groups.behavior.title'),
          icon: 'settings-2',
          children: [
            {
              type: 'field',
              id: 'enable-live-photo',
              title: t('builder.sections.processing.groups.behavior.fields.enable-live-photo.title'),
              description: t('builder.sections.processing.groups.behavior.fields.enable-live-photo.description'),
              key: 'system.processing.enableLivePhotoDetection',
              component: {
                type: 'switch',
                trueLabel: t('builder.sections.processing.groups.behavior.fields.enable-live-photo.true'),
                falseLabel: t('builder.sections.processing.groups.behavior.fields.enable-live-photo.false'),
              },
            },
            {
              type: 'field',
              id: 'digest-suffix-length',
              title: t('builder.sections.processing.groups.behavior.fields.digest-suffix-length.title'),
              description: t('builder.sections.processing.groups.behavior.fields.digest-suffix-length.description'),
              key: 'system.processing.digestSuffixLength',
              component: {
                type: 'text',
                inputType: 'number',
                placeholder: '0',
              },
            },
            {
              type: 'field',
              id: 'supported-formats',
              title: t('builder.sections.processing.groups.behavior.fields.supported-formats.title'),
              description: t('builder.sections.processing.groups.behavior.fields.supported-formats.description'),
              key: 'system.processing.supportedFormats',
              component: {
                type: 'text',
                placeholder: 'jpg,png,heic',
              },
            },
          ],
        },
      ],
    },
    {
      type: 'section',
      id: 'builder-observability',
      title: t('builder.sections.observability.title'),
      description: t('builder.sections.observability.description'),
      icon: 'activity',
      children: [
        {
          type: 'group',
          id: 'builder-progress',
          title: t('builder.sections.observability.groups.progress.title'),
          icon: 'progress',
          children: [
            {
              type: 'field',
              id: 'show-progress',
              title: t('builder.sections.observability.groups.progress.fields.show-progress.title'),
              description: t('builder.sections.observability.groups.progress.fields.show-progress.description'),
              key: 'system.observability.showProgress',
              component: {
                type: 'switch',
              },
            },
            {
              type: 'field',
              id: 'show-detailed-stats',
              title: t('builder.sections.observability.groups.progress.fields.show-detailed-stats.title'),
              description: t('builder.sections.observability.groups.progress.fields.show-detailed-stats.description'),
              key: 'system.observability.showDetailedStats',
              component: {
                type: 'switch',
              },
            },
          ],
        },
        {
          type: 'group',
          id: 'builder-logging',
          title: t('builder.sections.observability.groups.logging.title'),
          icon: 'audio-lines',
          children: [
            {
              type: 'field',
              id: 'logging-level',
              title: t('builder.sections.observability.groups.logging.fields.logging-level.title'),
              description: t('builder.sections.observability.groups.logging.fields.logging-level.description'),
              key: 'system.observability.logging.level',
              component: {
                type: 'select',
                options: ['info', 'warn', 'error', 'debug'],
                placeholder: t('builder.sections.observability.groups.logging.fields.logging-level.placeholder'),
              },
            },
            {
              type: 'field',
              id: 'logging-verbose',
              title: t('builder.sections.observability.groups.logging.fields.logging-verbose.title'),
              description: t('builder.sections.observability.groups.logging.fields.logging-verbose.description'),
              key: 'system.observability.logging.verbose',
              component: {
                type: 'switch',
              },
            },
            {
              type: 'field',
              id: 'logging-output',
              title: t('builder.sections.observability.groups.logging.fields.logging-output.title'),
              description: t('builder.sections.observability.groups.logging.fields.logging-output.description'),
              key: 'system.observability.logging.outputToFile',
              component: {
                type: 'switch',
              },
            },
          ],
        },
      ],
    },
  ],
}
}
