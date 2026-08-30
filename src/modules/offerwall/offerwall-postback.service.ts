import { createHmac, timingSafeEqual } from 'crypto';
import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferwallPartner } from '../../database/entities/offerwall-partner.entity';
import {
  OfferwallPostback,
  OfferwallPostbackStatus,
} from '../../database/entities/offerwall-postback.entity';
import { User } from '../../database/entities/user.entity';
import { CzOfferwallErrorCodes } from '../../common/errors/error.constants';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OfferwallPartnersService } from './offerwall-partners.service';
import { ListOfferwallPostbacksDto } from './dto/list-offerwall-postbacks.dto';
import { toSkipTake } from '../../common/utils/pagination.util';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class OfferwallPostbackService {
  private readonly logger = new Logger(OfferwallPostbackService.name);

  constructor(
    @InjectRepository(OfferwallPostback)
    private readonly postbacks: Repository<OfferwallPostback>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly partnersService: OfferwallPartnersService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * A partner's own postback, GET or POST. Verifies the path token (or HMAC
   * signature), maps their fields onto ours, credits the wallet once, and
   * always writes an audit row — success or not. A postback that reuses a
   * transaction id already `credited` is treated as a reversal notice, not
   * a duplicate, since real advertisers reverse a conversion by re-hitting
   * the same transaction id with a reversed status.
   */
  async handle(
    slug: string,
    token: string,
    payload: Record<string, unknown>,
  ): Promise<{ status: string }> {
    const partner = await this.partnersService.getBySlugOrFail(slug);
    this.assertAuthorized(partner, token, payload);
    if (!partner.is_active) {
      throw new ForbiddenException({ cz_error_code: CzOfferwallErrorCodes.PARTNER_INACTIVE });
    }

    const mapping = partner.postback_field_mapping;
    const user_id = this.readString(payload, mapping.user_id);
    const external_transaction_id =
      this.readString(payload, mapping.external_transaction_id) ??
      `missing_${Date.now()}`;
    const offer_name = mapping.offer_name ? this.readString(payload, mapping.offer_name) : null;
    const milestone_name = mapping.milestone_name
      ? this.readString(payload, mapping.milestone_name)
      : null;
    const rawPayout = mapping.payout ? Number(payload[mapping.payout]) : 0;
    const payoutUnits = Number.isFinite(rawPayout) ? rawPayout : 0;
    const rawStatus = mapping.status ? this.readString(payload, mapping.status) : null;
    const outcome = this.readOutcome(mapping, rawStatus);
    const note = this.buildNote(partner.name, offer_name, milestone_name);

    const existing = await this.postbacks.findOne({
      where: {
        partner_id: partner.cz_offerwall_partner_id,
        external_transaction_id,
      },
    });
    if (existing) {
      if (existing.status === 'credited' && outcome === 'reversed') {
        return this.reverse(partner, existing, note);
      }
      await this.record(partner, {
        user_id: user_id ?? existing.user_id,
        external_transaction_id: `${external_transaction_id}_dup_${Date.now()}`,
        offer_name,
        coins_credited: 0,
        status: 'duplicate',
        wallet_transaction_id: null,
        raw_payload: payload,
      });
      return { status: 'duplicate' };
    }

    if (!user_id || !UUID_RE.test(user_id)) {
      await this.record(partner, {
        user_id: null,
        external_transaction_id,
        offer_name,
        coins_credited: 0,
        status: 'invalid_payload',
        wallet_transaction_id: null,
        raw_payload: payload,
      });
      return { status: 'invalid_payload' };
    }

    const user = await this.users.findOne({
      where: { cz_user_id: user_id },
      select: { cz_user_id: true },
    });
    if (!user) {
      await this.record(partner, {
        user_id,
        external_transaction_id,
        offer_name,
        coins_credited: 0,
        status: 'user_not_found',
        wallet_transaction_id: null,
        raw_payload: payload,
      });
      return { status: 'user_not_found' };
    }

    if (outcome === 'reversed') {
      // A reversal notice for a transaction we never credited — nothing to reverse.
      this.logger.warn(
        `Reversal postback for unknown transaction ${external_transaction_id} from ${partner.name}.`,
      );
      await this.record(partner, {
        user_id,
        external_transaction_id,
        offer_name,
        coins_credited: 0,
        status: 'reversed',
        wallet_transaction_id: null,
        raw_payload: payload,
      });
      return { status: 'reversed' };
    }

    const shareRate = partner.revenue_share_percent != null ? partner.revenue_share_percent / 100 : 1;
    const coins = Math.max(0, Math.round(payoutUnits * shareRate * partner.coins_per_payout_unit));

    const saved = await this.record(partner, {
      user_id,
      external_transaction_id,
      offer_name,
      coins_credited: coins,
      status: 'credited',
      wallet_transaction_id: null,
      raw_payload: payload,
    });

    if (coins > 0) {
      await this.walletService.credit({
        user_id,
        currency: 'coin',
        amount: coins,
        type: 'earn',
        source_type: 'offerwall',
        source_id: saved.cz_offerwall_postback_id,
        note,
      });
      await this.notificationsService.push(
        user_id,
        milestone_name ? 'Offerwall milestone completed' : 'Offerwall reward credited',
        milestone_name
          ? `You earned ${coins} coins for completing "${milestone_name}" in ${offer_name ?? partner.name}.`
          : `You earned ${coins} coins from ${partner.name}${offer_name ? ` — "${offer_name}"` : ''}.`,
      );
    }

    return { status: 'credited' };
  }

  /**
   * Flips the original row to `reversed` and debits the coins it credited,
   * using the amount actually on that row — never a value re-derived from
   * the reversal payload, which real advertisers often send without a payout
   * field at all.
   */
  private async reverse(
    partner: OfferwallPartner,
    existing: OfferwallPostback,
    note: string,
  ): Promise<{ status: string }> {
    await this.postbacks.update(existing.cz_offerwall_postback_id, { status: 'reversed' });

    if (existing.coins_credited > 0 && existing.user_id) {
      try {
        await this.walletService.debit({
          user_id: existing.user_id,
          currency: 'coin',
          amount: existing.coins_credited,
          type: 'reversal',
          source_type: 'offerwall',
          source_id: existing.cz_offerwall_postback_id,
          note: `Reversed: ${note}`,
        });
        await this.notificationsService.push(
          existing.user_id,
          'Offerwall reward reversed',
          `${existing.coins_credited} coins were reversed by ${partner.name}${
            existing.offer_name ? ` — "${existing.offer_name}"` : ''
          }.`,
        );
      } catch (error) {
        this.logger.warn(
          `Reversal debit failed for postback ${existing.cz_offerwall_postback_id} — user likely already spent the coins: ${String(error)}`,
        );
      }
    }

    return { status: 'reversed' };
  }

  /** "Partner - Offer (completed: Milestone)", trimmed down to whatever fields the partner actually sent. */
  private buildNote(partnerName: string, offerName: string | null, milestoneName: string | null): string {
    const base = offerName ? `${partnerName} - ${offerName}` : partnerName;
    return milestoneName ? `${base} (completed: ${milestoneName})` : base;
  }

  async listForAdmin(
    query: ListOfferwallPostbacksDto,
  ): Promise<{ data: OfferwallPostback[]; total: number }> {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const builder = this.postbacks
      .createQueryBuilder('p')
      .orderBy('p.created_at', 'DESC')
      .skip(skip)
      .take(take);

    if (query.partner_id) {
      builder.andWhere('p.partner_id = :partner_id', {
        partner_id: query.partner_id,
      });
    }
    if (query.status) {
      builder.andWhere('p.status = :status', { status: query.status });
    }
    if (query.date_from) {
      builder.andWhere('p.created_at >= :date_from', {
        date_from: query.date_from,
      });
    }
    if (query.date_end) {
      builder.andWhere("p.created_at < (:date_end::date + interval '1 day')", {
        date_end: query.date_end,
      });
    }

    const [data, total] = await builder.getManyAndCount();
    return { data, total };
  }

  private async record(
    partner: OfferwallPartner,
    fields: {
      user_id: string | null;
      external_transaction_id: string;
      offer_name: string | null;
      coins_credited: number;
      status: OfferwallPostbackStatus;
      wallet_transaction_id: string | null;
      raw_payload: Record<string, unknown>;
    },
  ): Promise<OfferwallPostback> {
    const row = this.postbacks.create({
      partner_id: partner.cz_offerwall_partner_id,
      partner_name: partner.name,
      ...fields,
    });
    return this.postbacks.save(row);
  }

  private assertAuthorized(
    partner: OfferwallPartner,
    token: string,
    payload: Record<string, unknown>,
  ): void {
    if (partner.postback_auth_type === 'hmac_sha256') {
      const signature = this.readString(payload, 'signature') ?? '';
      const expected = this.sign(partner.postback_secret, payload);
      const valid =
        signature.length === expected.length &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      if (!valid) {
        this.logger.warn(`Postback HMAC mismatch for ${partner.name}.`);
        throw new UnauthorizedException({
          cz_error_code: CzOfferwallErrorCodes.POSTBACK_UNAUTHORIZED,
        });
      }
      return;
    }
    if (token !== partner.postback_secret) {
      this.logger.warn(`Postback token mismatch for ${partner.name}.`);
      throw new UnauthorizedException({
        cz_error_code: CzOfferwallErrorCodes.POSTBACK_UNAUTHORIZED,
      });
    }
  }

  /**
   * HMAC-SHA256 over `JSON.stringify` of the payload with its keys sorted
   * alphabetically — the exact scheme RewardTym's own webhook dispatcher
   * uses (`PartnerWebhookDispatcherService.signPayload`).
   */
  private sign(secret: string, payload: Record<string, unknown>): string {
    const sortedKeys = Object.keys(payload)
      .filter((key) => key !== 'signature')
      .sort();
    const sorted: Record<string, unknown> = {};
    for (const key of sortedKeys) sorted[key] = payload[key];
    return createHmac('sha256', secret).update(JSON.stringify(sorted)).digest('hex');
  }

  private readOutcome(
    mapping: OfferwallPartner['postback_field_mapping'],
    rawStatus: string | null,
  ): 'credited' | 'reversed' {
    if (!mapping.status) return 'credited';
    const value = (rawStatus ?? '').toLowerCase();
    if (value === (mapping.reversed_value ?? 'reversed').toLowerCase()) return 'reversed';
    return 'credited';
  }

  private readString(payload: Record<string, unknown>, key?: string): string | null {
    if (!key) return null;
    const value = payload[key];
    return value == null || value === '' ? null : String(value);
  }
}
