import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { UserDevice } from '../../database/entities/user-device.entity';
import { User } from '../../database/entities/user.entity';
import { extractRequestIp, resolveDevicePlatform } from '../../common/utils/device-platform.util';
import { GeoLookupExternal } from '../../external/geo-lookup.external';
import { RegisterDeviceDto } from './dto/register-device.dto';

// Fraud-signal weights. Shared hardware id dominates — it is the strongest
// "same physical device, different account" signal. Score+store only; nothing
// blocks yet, so these are tuning knobs, not gates.
const RISK_WEIGHTS = {
  SHARED_HARDWARE_ID: 50,
  EMULATOR: 25,
  ROOTED: 20,
  SIM_IP_COUNTRY_MISMATCH: 15,
  VPN: 10,
} as const;

type RiskFlag = keyof typeof RISK_WEIGHTS;

@Injectable()
export class UserDevicesService {
  constructor(
    @InjectRepository(UserDevice)
    private readonly userDevices: Repository<UserDevice>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly geoLookup: GeoLookupExternal,
  ) {}

  /** Fraud fields never leave this service — the ack only confirms what was registered. */
  async registerDevice(cz_user_id: string, dto: RegisterDeviceDto, req: Request) {
    const device = await this.upsert(cz_user_id, dto, req);
    return {
      cz_device_id: device.cz_device_id,
      device_id: device.device_id,
      platform_type: device.platform_type,
      registered: true,
    };
  }

  /** Admin detail page: every install this user has signed in from, newest first. */
  async listForUserAdmin(cz_user_id: string) {
    const [data, total] = await this.userDevices.findAndCount({
      where: { cz_user_id },
      order: { last_seen_at: 'DESC' },
    });
    return { data, total };
  }

  /** IP, ASN, ISP, VPN flag, country, user-agent and fingerprint are always server-derived, never trusted from the client. */
  async upsert(cz_user_id: string, dto: RegisterDeviceDto, req: Request): Promise<UserDevice> {
    const ip = extractRequestIp(req);
    const platform_type = resolveDevicePlatform(dto.platform_type, req);
    const user_agent = (req.headers['user-agent'] as string | undefined) ?? null;
    const geo = ip ? await this.geoLookup.lookup(ip) : null;
    const fingerprint = this.buildFingerprint(user_agent, geo?.asn ?? null, platform_type, dto.device_id);

    const existing = await this.userDevices.findOne({
      where: { cz_user_id, device_id: dto.device_id },
    });

    const now = new Date();
    const row = existing ?? this.userDevices.create({ cz_user_id, device_id: dto.device_id });
    row.platform_type = platform_type;
    row.fingerprint = fingerprint;
    row.ip_address = ip;
    row.country_code = geo?.country_code ?? null;
    row.asn = geo?.asn ?? null;
    row.isp = geo?.isp ?? null;
    row.is_vpn = geo?.is_vpn ?? false;
    row.user_agent = user_agent;
    if (dto.hardware_id !== undefined) row.hardware_id = dto.hardware_id;
    if (dto.sim_country_code !== undefined) row.sim_country_code = dto.sim_country_code.toUpperCase();
    if (dto.carrier !== undefined) row.carrier = dto.carrier;
    if (dto.mcc_mnc !== undefined) row.mcc_mnc = dto.mcc_mnc;
    if (dto.is_emulator !== undefined) row.is_emulator = dto.is_emulator;
    if (dto.is_rooted !== undefined) row.is_rooted = dto.is_rooted;
    if (dto.push_token !== undefined) row.push_token = dto.push_token;
    if (dto.device_info !== undefined) row.device_info = dto.device_info;
    row.first_seen_at ??= now;
    row.last_seen_at = now;

    // Score depends on how many distinct accounts share this hardware_id, so it
    // must run against the saved state — save, then score, then persist the score.
    const saved = await this.userDevices.save(row);
    const sharedAccounts = await this.countAccountsForHardwareId(saved.hardware_id);
    const { risk_score, risk_flags } = this.computeRiskScore(saved, sharedAccounts);
    saved.risk_score = risk_score;
    saved.risk_flags = risk_flags;
    await this.userDevices.save(saved);

    await this.recomputeUserFraud(cz_user_id);
    return saved;
  }

  /** Distinct accounts seen on one hardware id. 0/1 when null or unique. */
  private async countAccountsForHardwareId(hardware_id: string | null): Promise<number> {
    if (!hardware_id) return 0;
    const rows = await this.userDevices
      .createQueryBuilder('d')
      .select('DISTINCT d.cz_user_id', 'cz_user_id')
      .where('d.hardware_id = :hardware_id', { hardware_id })
      .getRawMany<{ cz_user_id: string }>();
    return rows.length;
  }

  private computeRiskScore(
    row: UserDevice,
    sharedAccounts: number,
  ): { risk_score: number; risk_flags: RiskFlag[] } {
    const flags: RiskFlag[] = [];
    if (row.hardware_id && sharedAccounts > 1) flags.push('SHARED_HARDWARE_ID');
    if (row.is_emulator === true) flags.push('EMULATOR');
    if (row.is_rooted === true) flags.push('ROOTED');
    if (
      row.sim_country_code &&
      row.country_code &&
      row.sim_country_code !== row.country_code
    ) {
      flags.push('SIM_IP_COUNTRY_MISMATCH');
    }
    if (row.is_vpn) flags.push('VPN');

    const risk_score = flags.reduce((sum, flag) => sum + RISK_WEIGHTS[flag], 0);
    return { risk_score: Math.min(risk_score, 100), risk_flags: flags };
  }

  /** User aggregate = worst device: MAX score, union of flags. Store only. */
  private async recomputeUserFraud(cz_user_id: string): Promise<void> {
    const devices = await this.userDevices.find({
      where: { cz_user_id },
      select: { risk_score: true, risk_flags: true },
    });
    const fraud_score = devices.reduce((max, d) => Math.max(max, d.risk_score ?? 0), 0);
    const fraud_flags = [...new Set(devices.flatMap((d) => d.risk_flags ?? []))];
    await this.users.update({ cz_user_id }, { fraud_score, fraud_flags });
  }

  private buildFingerprint(
    user_agent: string | null,
    asn: string | null,
    platform_type: string,
    device_id: string,
  ): string {
    const raw = `${user_agent ?? ''}|${asn ?? ''}|${platform_type}|${device_id}`.toLowerCase();
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 64);
  }
}
