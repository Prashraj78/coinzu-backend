import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../../database/entities/app-setting.entity';
import { CzAdminErrorCodes } from '../../common/errors/error.constants';
import {
  SettingCatalogue,
  SettingDefaults,
  SettingGroupMeta,
  type SettingGroup,
  type SettingMeta,
} from './setting.keys';
import { UpdateSettingsDto } from './dto/update-settings.dto';

// Settings are read on almost every game/wallet request but change rarely,
// so they are cached in memory. 30s bounds staleness across instances.
const CACHE_TTL_MS = 30_000;

@Injectable()
export class SettingsService {
  private cached: Map<string, string> | null = null;
  private cacheExpiresAt = 0;

  constructor(
    @InjectRepository(AppSetting)
    private readonly settings: Repository<AppSetting>,
  ) {}

  /** One query refreshes every key at once; reads inside the TTL are free. */
  private async allValues(): Promise<Map<string, string>> {
    const now = Date.now();
    if (this.cached && now < this.cacheExpiresAt) return this.cached;

    const rows = await this.settings.find({
      select: { setting_key: true, setting_value: true },
    });
    this.cached = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
    this.cacheExpiresAt = now + CACHE_TTL_MS;
    return this.cached;
  }

  async getString(key: string): Promise<string> {
    const values = await this.allValues();
    return values.get(key) ?? SettingDefaults[key] ?? '';
  }

  async getNumber(key: string): Promise<number> {
    const value = Number(await this.getString(key));
    return Number.isFinite(value) ? value : 0;
  }

  async getBoolean(key: string): Promise<boolean> {
    return (await this.getString(key)).toLowerCase() === 'true';
  }

  /** Admin Configuration tab: the whole catalogue, grouped, with live values. */
  async listAdmin() {
    const values = await this.allValues();
    const rows = await this.settings.find({
      select: { setting_key: true, updated_at: true },
    });
    const updatedAt = new Map(rows.map((r) => [r.setting_key, r.updated_at]));

    const groups = (Object.keys(SettingGroupMeta) as SettingGroup[]).map(
      (group) => ({
        group,
        label: SettingGroupMeta[group].label,
        description: SettingGroupMeta[group].description,
        settings: Object.entries(SettingCatalogue)
          .filter(([, meta]) => meta.group === group)
          .map(([setting_key, meta]) => ({
            setting_key,
            setting_value: values.get(setting_key) ?? SettingDefaults[setting_key] ?? '',
            default_value: SettingDefaults[setting_key] ?? '',
            is_default: !values.has(setting_key),
            updated_at: updatedAt.get(setting_key) ?? null,
            ...meta,
          })),
      }),
    );

    return { data: groups, total: groups.length };
  }

  /** Validates every item against the catalogue before writing any of them. */
  async updateMany(dto: UpdateSettingsDto) {
    const seen = new Set<string>();
    for (const item of dto.settings) {
      const meta = SettingCatalogue[item.setting_key];
      if (!meta) {
        throw new NotFoundException({
          cz_error_code: CzAdminErrorCodes.SETTING_NOT_FOUND,
          cz_error_description: `No catalogue entry for "${item.setting_key}".`,
        });
      }
      if (seen.has(item.setting_key)) {
        throw new BadRequestException({
          cz_error_code: CzAdminErrorCodes.INVALID_SETTING_VALUE,
          cz_error_description: `"${item.setting_key}" appears more than once.`,
        });
      }
      seen.add(item.setting_key);
      this.assertValid(item.setting_key, item.setting_value, meta);
    }

    for (const item of dto.settings) {
      await this.settings.upsert(
        {
          setting_key: item.setting_key,
          setting_value: item.setting_value.trim(),
          description: SettingCatalogue[item.setting_key].description,
        },
        ['setting_key'],
      );
    }

    // Next read must see the new values, not the 30s-old cache.
    this.cached = null;
    this.cacheExpiresAt = 0;

    return this.listAdmin();
  }

  /**
   * Writes keys that live outside the Configuration catalogue — the chest and
   * the scratch allowance, owned by the Daily Challenges tab.
   */
  async setNumbers(values: Record<string, number>): Promise<void> {
    for (const [setting_key, value] of Object.entries(values)) {
      await this.settings.upsert(
        { setting_key, setting_value: String(Math.round(value)) },
        ['setting_key'],
      );
    }
    this.cached = null;
    this.cacheExpiresAt = 0;
  }

  private assertValid(key: string, raw: string, meta: SettingMeta): void {
    const value = raw.trim();
    const fail = (why: string): never => {
      throw new BadRequestException({
        cz_error_code: CzAdminErrorCodes.INVALID_SETTING_VALUE,
        cz_error_description: `"${key}": ${why}`,
      });
    };

    if (meta.value_type === 'boolean') {
      if (value !== 'true' && value !== 'false') {
        fail('must be exactly "true" or "false".');
      }
      return;
    }

    const num = Number(value);
    if (value === '' || !Number.isFinite(num)) {
      fail('must be a number.');
    }
    if (meta.value_type === 'integer' && !Number.isInteger(num)) {
      fail('must be a whole number.');
    }
    if (meta.min !== undefined && num < meta.min) {
      fail(`must be at least ${meta.min}.`);
    }
    if (meta.max !== undefined && num > meta.max) {
      fail(`must be at most ${meta.max}.`);
    }
  }
}
