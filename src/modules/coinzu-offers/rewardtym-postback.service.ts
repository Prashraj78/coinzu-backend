import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransaction } from '../../database/entities/wallet-transaction.entity';
import { User } from '../../database/entities/user.entity';
import { CzOfferErrorCodes } from '../../common/errors/error.constants';
import { Env } from '../../common/config/env';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Receives RewardTym's /v3/coinzu completion webhook — a signed delivery fired
 * when a Coinzu user completes a milestone on a RewardTym offer. Verifies the
 * HMAC, then credits coins + gems from the payload (RewardTym resolved the
 * Coinzu override before signing). RewardTym's own DB is the audit trail, so
 * nothing is stored here; idempotency rides on the wallet ledger — each
 * conversion maps to one deterministic source_id, and a retry that finds an
 * existing credited row is a no-op. A reversed status debits those amounts.
 */
@Injectable()
export class RewardtymPostbackService {
  private readonly logger = new Logger(RewardtymPostbackService.name);

  constructor(
    @InjectRepository(WalletTransaction)
    private readonly transactions: Repository<WalletTransaction>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handle(payload: Record<string, unknown>): Promise<{ status: string }> {
    this.assertSigned(payload);

    const conversion_id = this.readString(payload, 'conversion_id');
    if (!conversion_id) return { status: 'invalid_payload' };

    const user_id = this.readString(payload, 'user_id');
    const offer_name = this.readString(payload, 'campaign_name');
    const milestone_name = this.milestoneLabel(payload);
    const status = (this.readString(payload, 'status') ?? 'approved').toLowerCase();
    const coins = this.readInt(payload, 'coinzu_coins');
    const gems = this.readInt(payload, 'coinzu_gems');
    const source_id = this.sourceId(conversion_id);
    const note = this.buildNote(offer_name, milestone_name);

    if (!user_id || !UUID_RE.test(user_id)) return { status: 'invalid_payload' };

    // One ledger row per conversion+currency is the dedup key. A retried
    // delivery finds the earn rows and credits nothing twice.
    const prior = await this.transactions.find({
      where: { source_type: 'rewardtym', source_id },
      select: { currency: true, type: true, amount: true },
    });
    const credited = prior.filter((t) => t.type === 'earn');

    if (status === 'reversed') {
      return this.reverse(user_id, source_id, credited, note);
    }
    if (status !== 'approved') return { status: 'not_payable' };
    if (credited.length > 0) return { status: 'duplicate' };

    const user = await this.users.findOne({
      where: { cz_user_id: user_id },
      select: { cz_user_id: true },
    });
    if (!user) return { status: 'user_not_found' };

    if (coins > 0) {
      await this.walletService.credit({
        user_id,
        currency: 'coin',
        amount: coins,
        type: 'earn',
        source_type: 'rewardtym',
        source_id,
        note,
      });
    }
    if (gems > 0) {
      await this.walletService.credit({
        user_id,
        currency: 'gem',
        amount: gems,
        type: 'earn',
        source_type: 'rewardtym',
        source_id,
        note,
      });
    }

    if (coins > 0 || gems > 0) {
      await this.notificationsService.push(
        user_id,
        milestone_name ? 'Milestone completed' : 'Reward credited',
        this.pushBody(note, coins, gems),
      );
    }

    return { status: 'credited' };
  }

  /** Debits exactly what this conversion credited, once, from the ledger rows. */
  private async reverse(
    user_id: string,
    source_id: string,
    credited: Pick<WalletTransaction, 'currency' | 'amount'>[],
    note: string,
  ): Promise<{ status: string }> {
    if (credited.length === 0) return { status: 'reversed' };
    const already = await this.transactions.count({
      where: { source_type: 'rewardtym', source_id, type: 'reversal' },
    });
    if (already > 0) return { status: 'duplicate' };

    for (const row of credited) {
      if (row.amount <= 0) continue;
      try {
        await this.walletService.debit({
          user_id,
          currency: row.currency,
          amount: row.amount,
          type: 'reversal',
          source_type: 'rewardtym',
          source_id,
          note: `Reversed: ${note}`,
        });
      } catch (error) {
        this.logger.warn(
          `Reversal debit failed source=${source_id} currency=${row.currency} — likely already spent: ${String(error)}`,
        );
      }
    }
    return { status: 'reversed' };
  }

  /** Deterministic UUID from the conversion id, so coin + gem rows share it and a retry collides. */
  private sourceId(conversionId: string): string {
    const h = createHash('sha1')
      .update(`rewardtym:${conversionId}`)
      .digest('hex');
    return [
      h.slice(0, 8),
      h.slice(8, 12),
      `5${h.slice(13, 16)}`,
      ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + h.slice(18, 20),
      h.slice(20, 32),
    ].join('-');
  }

  /** "<Offer> — <Milestone>", or just the offer when no milestone was sent. */
  private buildNote(
    offerName: string | null,
    milestoneName: string | null,
  ): string {
    const offer = offerName ?? 'Offer';
    return milestoneName ? `${offer} — ${milestoneName}` : offer;
  }

  private pushBody(note: string, coins: number, gems: number): string {
    const parts: string[] = [];
    if (coins > 0) parts.push(`${coins} coins`);
    if (gems > 0) parts.push(`${gems} gems`);
    return `You earned ${parts.join(' + ')} for ${note}.`;
  }

  /** Prefer the explicit level number; the webhook has no milestone title. */
  private milestoneLabel(payload: Record<string, unknown>): string | null {
    if (payload.is_campaign_completed === true) return null;
    const level = payload.level_number;
    if (level == null || level === '') return null;
    return `Milestone ${level}`;
  }

  /**
   * HMAC-SHA256 over JSON.stringify of the payload with its keys sorted, minus
   * `signature` — the exact scheme RewardTym's dispatcher signs with. A missing
   * or unconfigured secret rejects the request rather than accepting it unsigned.
   */
  private assertSigned(payload: Record<string, unknown>): void {
    const secret = Env.rewardtym.webhookSecret;
    const signature = this.readString(payload, 'signature') ?? '';
    const expected = secret ? this.sign(secret, payload) : '';
    const valid =
      expected.length > 0 &&
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) {
      this.logger.warn('RewardTym webhook signature mismatch.');
      throw new UnauthorizedException({
        cz_error_code: CzOfferErrorCodes.POSTBACK_SIGNATURE_INVALID,
      });
    }
  }

  private sign(secret: string, payload: Record<string, unknown>): string {
    const sortedKeys = Object.keys(payload)
      .filter((key) => key !== 'signature')
      .sort();
    const sorted: Record<string, unknown> = {};
    for (const key of sortedKeys) sorted[key] = payload[key];
    return createHmac('sha256', secret)
      .update(JSON.stringify(sorted))
      .digest('hex');
  }

  private readString(
    payload: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = payload[key];
    return value == null || value === '' ? null : String(value);
  }

  private readInt(payload: Record<string, unknown>, key: string): number {
    const n = Number(payload[key]);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
}
