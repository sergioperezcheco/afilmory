import { Body, Controller, Post } from '@afilmory/framework'
import { isTenantSlugReserved } from '@afilmory/utils'
import { AllowPlaceholderTenant } from 'core/decorators/allow-placeholder.decorator'
import { SkipTenantGuard } from 'core/decorators/skip-tenant.decorator'
import { BizException, ErrorCode } from 'core/errors'
import { SystemSettingService } from 'core/modules/configuration/system-setting/system-setting.service'

import { TenantService } from './tenant.service'

const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

type CheckTenantSlugRequest = {
  slug?: string | null
}

@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly systemSettings: SystemSettingService,
  ) {}

  @AllowPlaceholderTenant()
  @SkipTenantGuard()
  @Post('/check-slug')
  async checkTenantSlug(@Body() body: CheckTenantSlugRequest) {
    await this.systemSettings.ensureRegistrationAllowed()

    const slug = this.normalizeTenantSlug(body?.slug)
    if (!slug) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: '空间名称不能为空' })
    }

    this.validateTenantSlug(slug)

    if (isTenantSlugReserved(slug)) {
      throw new BizException(ErrorCode.TENANT_SLUG_RESERVED, { message: '该空间名称已被系统保留，请尝试其他名称。' })
    }

    const available = await this.tenantService.isSlugAvailable(slug)
    if (!available) {
      throw new BizException(ErrorCode.COMMON_CONFLICT, { message: '该空间名称已被使用，请换一个更独特的名字。' })
    }

    const settings = await this.systemSettings.getSettings()
    const tenantHost = `${slug}.${settings.baseDomain}`

    return {
      ok: true,
      slug,
      baseDomain: settings.baseDomain,
      tenantHost,
      nextUrl: this.buildTenantWelcomeUrl(slug, settings.baseDomain),
    }
  }

  private normalizeTenantSlug(slug?: string | null): string | null {
    if (!slug) {
      return null
    }
    const normalized = slug.trim().toLowerCase()
    return normalized.length > 0 ? normalized : null
  }

  private validateTenantSlug(slug: string): void {
    if (slug.length < 3) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: '空间名称至少需要 3 个字符' })
    }
    if (slug.length > 63) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, { message: '空间名称长度不能超过 63 个字符' })
    }
    if (!TENANT_SLUG_PATTERN.test(slug)) {
      throw new BizException(ErrorCode.COMMON_BAD_REQUEST, {
        message: '空间名称只能包含字母、数字或连字符 (-)，且不能以连字符开头或结尾。',
      })
    }
  }

  private buildTenantWelcomeUrl(slug: string, baseDomain: string): string {
    const normalizedBase = baseDomain.trim()
    const host = normalizedBase ? `${slug}.${normalizedBase}` : slug
    const protocol = this.resolveTenantProtocol(host)
    return `${protocol}://${host}/platform/welcome`
  }

  private resolveTenantProtocol(host: string): 'http' | 'https' {
    const normalized = host.trim().toLowerCase()
    if (normalized.includes('localhost') || normalized.startsWith('127.') || normalized.endsWith('.local')) {
      return 'http'
    }
    return 'https'
  }
}
