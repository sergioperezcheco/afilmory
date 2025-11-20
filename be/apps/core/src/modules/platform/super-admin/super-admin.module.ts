import { Module } from '@afilmory/framework'
import { SystemSettingModule } from 'core/modules/configuration/system-setting/system-setting.module'
import { PhotoBuilderService } from 'core/modules/content/photo/builder/photo-builder.service'
import { BillingModule } from 'core/modules/platform/billing/billing.module'
import { TenantModule } from 'core/modules/platform/tenant/tenant.module'

import { BuilderWorkerHost } from 'core/workers/builder/builder-worker.host'
import { SuperAdminBuilderDebugController } from './super-admin-builder.controller'
import { SuperAdminSettingController } from './super-admin-settings.controller'
import { SuperAdminTenantController } from './super-admin-tenants.controller'

@Module({
  imports: [SystemSettingModule, BillingModule, TenantModule],
  controllers: [SuperAdminSettingController, SuperAdminBuilderDebugController, SuperAdminTenantController],
  providers: [PhotoBuilderService, BuilderWorkerHost],
})
export class SuperAdminModule {}
