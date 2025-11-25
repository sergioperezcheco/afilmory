import { injectable } from 'tsyringe'

import { getUiSchemaTranslator } from '../../ui/ui-schema/ui-schema.i18n'
import type { SettingEntryInput } from '../setting/setting.service'
import { SettingService } from '../setting/setting.service'
import { createStorageProviderFormSchema } from './storage-provider.ui-schema'

type StorageSettingKey = 'builder.storage.providers' | 'builder.storage.activeProvider' | 'photo.storage.secureAccess'

@injectable()
export class StorageSettingService {
  constructor(private readonly settingService: SettingService) {}

  async getUiSchema() {
    const schema = await this.settingService.getUiSchema()
    const { t } = getUiSchemaTranslator()
    const providerForm = createStorageProviderFormSchema(t)
    return {
      ...schema,
      schema: {
        ...schema.schema,
        sections: schema.schema.sections.filter((section) => section.id.startsWith('builder-storage')),
      },
      providerForm,
    }
  }

  async get(key: StorageSettingKey): Promise<string | null> {
    return await this.settingService.get(key, {})
  }

  async getMany(keys: readonly StorageSettingKey[]): Promise<Record<StorageSettingKey, string | null>> {
    return await this.settingService.getMany(keys, {})
  }

  async setMany(entries: readonly SettingEntryInput[]): Promise<void> {
    await this.settingService.setMany(entries)
  }

  async delete(key: StorageSettingKey): Promise<void> {
    await this.settingService.delete(key)
  }

  async deleteMany(keys: readonly StorageSettingKey[]): Promise<void> {
    await this.settingService.deleteMany(keys)
  }
}
