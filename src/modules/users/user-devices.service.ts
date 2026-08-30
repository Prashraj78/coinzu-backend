import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { UserDevice } from '../../database/entities/user-device.entity';
import { extractRequestIp, resolveDevicePlatform } from '../../common/utils/device-platform.util';
import { GeoLookupExternal } from '../../external/geo-lookup.external';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class UserDevicesService {
  constructor(
    @InjectRepository(UserDevice)
    private readonly userDevices: Repository<UserDevice>,
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

    const row = existing ?? this.userDevices.create({ cz_user_id, device_id: dto.device_id });
    row.platform_type = platform_type;
    row.fingerprint = fingerprint;
    row.ip_address = ip;
    row.country_code = geo?.country_code ?? null;
    row.asn = geo?.asn ?? null;
    row.isp = geo?.isp ?? null;
    row.is_vpn = geo?.is_vpn ?? false;
    row.user_agent = user_agent;
    if (dto.push_token !== undefined) row.push_token = dto.push_token;
    if (dto.device_info !== undefined) row.device_info = dto.device_info;
    row.last_seen_at = new Date();

    return this.userDevices.save(row);
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
