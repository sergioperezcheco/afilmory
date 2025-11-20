import { Module } from '@afilmory/framework'
import { BuilderConfigService } from 'core/modules/configuration/builder-config/builder-config.service'
import { SystemSettingModule } from 'core/modules/configuration/system-setting/system-setting.module'
import { BillingModule } from 'core/modules/platform/billing/billing.module'
import { BuilderWorkerHost } from 'core/workers/builder/builder-worker.host'

import { PhotoController } from './assets/photo.controller'
import { PhotoAssetService } from './assets/photo-asset.service'
import { PhotoBuilderService } from './builder/photo-builder.service'
import { PhotoStorageService } from './storage/photo-storage.service'

@Module({
  imports: [SystemSettingModule, BillingModule],
  controllers: [PhotoController],
  providers: [PhotoBuilderService, PhotoStorageService, PhotoAssetService, BuilderConfigService, BuilderWorkerHost],
})
export class PhotoModule {}
