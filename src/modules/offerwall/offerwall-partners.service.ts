import { randomBytes } from 'crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferwallPartner } from '../../database/entities/offerwall-partner.entity';
import { CzOfferwallErrorCodes } from '../../common/errors/error.constants';
import { Env } from '../../common/config/env';
import { toSkipTake } from '../../common/utils/pagination.util';
import { CreateOfferwallPartnerDto } from './dto/create-offerwall-partner.dto';
import { UpdateOfferwallPartnerDto } from './dto/update-offerwall-partner.dto';

const SECRET_CACHE_TTL_MS = 60_000;

/** Admin CRUD plus the lookups the postback and app-list flows need. */
@Injectable()
export class OfferwallPartnersService {
  private readonly secretsCache = new Map<
    string,
    { partner: OfferwallPartner; expires_at: number }
  >();

  constructor(
    @InjectRepository(OfferwallPartner)
    private readonly partners: Repository<OfferwallPartner>,
  ) {}

  /** Active partners, ranked highest first, for the app list. */
  async listActive(): Promise<OfferwallPartner[]> {
    return this.partners.find({
      where: { is_active: true },
      order: { rank: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Every partner, active or not, for the admin list. Secret excluded.
   * `active_count` covers every partner, not just the current page, so the
   * admin stat tile stays accurate while paging.
   */
  async listAllAdmin(
    page?: number,
    limit?: number,
  ): Promise<{
    data: OfferwallPartner[];
    total: number;
    active_count: number;
  }> {
    const [[data, total], active_count] = await Promise.all([
      this.partners.findAndCount({
        order: { rank: 'DESC', name: 'ASC' },
        ...toSkipTake(page, limit),
      }),
      this.partners.count({ where: { is_active: true } }),
    ]);
    return { data, total, active_count };
  }

  async getOrFail(id: string): Promise<OfferwallPartner> {
    const partner = await this.partners.findOne({
      where: { cz_offerwall_partner_id: id },
    });
    if (!partner) {
      throw new NotFoundException({ cz_error_code: CzOfferwallErrorCodes.PARTNER_NOT_FOUND });
    }
    return partner;
  }

  async getBySlugOrFail(slug: string): Promise<OfferwallPartner> {
    const partner = await this.getWithSecretBySlug(slug);
    if (!partner) {
      throw new NotFoundException({ cz_error_code: CzOfferwallErrorCodes.PARTNER_NOT_FOUND });
    }
    return partner;
  }

  /**
   * Loads a row together with its select:false postback_secret. Cached
   * briefly — postbacks hit on every conversion, partner rows only change
   * on admin edit, which clears the cache.
   */
  private async getWithSecretBySlug(slug: string): Promise<OfferwallPartner | null> {
    const hit = this.secretsCache.get(slug);
    if (hit && Date.now() < hit.expires_at) return hit.partner;

    const partner = await this.partners
      .createQueryBuilder('p')
      .addSelect('p.postback_secret')
      .where('p.slug = :slug', { slug })
      .getOne();
    if (!partner) return null;

    this.secretsCache.set(slug, { partner, expires_at: Date.now() + SECRET_CACHE_TTL_MS });
    return partner;
  }

  async create(dto: CreateOfferwallPartnerDto): Promise<OfferwallPartner> {
    await this.assertSlugFree(dto.slug);
    const partner = this.partners.create({
      ...dto,
      postback_secret: dto.postback_secret ?? this.generateSecret(),
    });
    return this.partners.save(partner);
  }

  async update(id: string, dto: UpdateOfferwallPartnerDto): Promise<OfferwallPartner> {
    const partner = await this.getOrFail(id);
    if (dto.slug && dto.slug !== partner.slug) {
      await this.assertSlugFree(dto.slug);
    }
    Object.assign(partner, dto);
    const saved = await this.partners.save(partner);
    this.secretsCache.delete(partner.slug);
    return saved;
  }

  /** Full postback URL an admin copies into the partner's dashboard. */
  async getPostbackUrl(id: string): Promise<{ url: string; secret: string; method: string }> {
    const partner = await this.partners
      .createQueryBuilder('p')
      .addSelect('p.postback_secret')
      .where('p.cz_offerwall_partner_id = :id', { id })
      .getOne();
    if (!partner) {
      throw new NotFoundException({ cz_error_code: CzOfferwallErrorCodes.PARTNER_NOT_FOUND });
    }
    const base = Env.urls.api.replace(/\/$/, '');
    return {
      url: `${base}/api/offerwall/postback/${partner.slug}/${partner.postback_secret}`,
      secret: partner.postback_secret,
      method: partner.postback_method.toUpperCase(),
    };
  }

  private async assertSlugFree(slug: string): Promise<void> {
    const existing = await this.partners.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException({ cz_error_code: CzOfferwallErrorCodes.SLUG_ALREADY_EXISTS });
    }
  }

  private generateSecret(): string {
    return randomBytes(24).toString('hex');
  }
}
