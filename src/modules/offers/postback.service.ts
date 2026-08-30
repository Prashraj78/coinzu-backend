import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferClick } from '../../database/entities/offer-click.entity';
import { OfferCompletion } from '../../database/entities/offer-completion.entity';
import { OfferwallProvider } from '../../database/entities/offerwall-provider.entity';
import { CzOfferErrorCodes } from '../../common/errors/error.constants';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralsService } from '../referrals/referrals.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ProvidersService } from './providers.service';

@Injectable()
export class PostbackService {
  private readonly logger = new Logger(PostbackService.name);

  constructor(
    @InjectRepository(OfferClick)
    private readonly clicks: Repository<OfferClick>,
    @InjectRepository(OfferCompletion)
    private readonly completions: Repository<OfferCompletion>,
    private readonly providersService: ProvidersService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly referralsService: ReferralsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  /**
   * The provider's reward webhook. Validates the shared secret, maps their
   * fields onto ours, then credits the wallet exactly once.
   */
  async handle(
    provider_id: string,
    payload: Record<string, string>,
  ): Promise<{ status: string }> {
    const provider = await this.providersService.getWithSecrets(provider_id);
    this.assertSecret(provider, payload);

    const mapping = provider.field_mapping;
    const click_id = payload[mapping.click_id];
    const transaction_id = payload[mapping.transaction_id];
    const rawStatus = payload[mapping.status];
    const payout_coins = Math.round(Number(payload[mapping.payout] ?? 0));
    const goal_id = mapping.goal_id ? payload[mapping.goal_id] : null;

    const [click, duplicate] = await Promise.all([
      this.clicks.findOne({ where: { click_id }, relations: { offer: true } }),
      this.completions.findOne({
        where: { provider_id, external_transaction_id: transaction_id },
        select: { cz_offer_completion_id: true },
      }),
    ]);
    if (!click) {
      throw new BadRequestException({
        cz_error_code: CzOfferErrorCodes.POSTBACK_CLICK_NOT_FOUND,
      });
    }
    if (duplicate) {
      this.logger.warn(`Duplicate postback ignored: ${transaction_id}`);
      return { status: 'duplicate' };
    }

    const status = this.readStatus(provider, rawStatus);
    const completion = this.completions.create({
      offer_click_id: click.cz_offer_click_id,
      provider_id,
      external_transaction_id: transaction_id,
      goal_id: goal_id ?? null,
      payout_coins,
      status,
      raw_payload: payload,
    });
    const saved = await this.completions.save(completion);

    if (status === 'approved') await this.creditUser(click, saved);
    if (status === 'reversed') await this.reverseUser(click, saved);

    return { status };
  }

  private assertSecret(
    provider: OfferwallProvider,
    payload: Record<string, string>,
  ): void {
    const expected = this.providersService.readPostbackSecret(provider);
    if (!expected) return;

    const received = payload.secret ?? payload.signature ?? '';
    if (received !== expected) {
      this.logger.warn(`Postback secret mismatch for ${provider.name}.`);
      throw new UnauthorizedException({
        cz_error_code: CzOfferErrorCodes.POSTBACK_SIGNATURE_INVALID,
      });
    }
  }

  /** Providers use their own status values, declared in field_mapping. */
  private readStatus(
    provider: OfferwallProvider,
    rawStatus: string | undefined,
  ): OfferCompletion['status'] {
    const mapping = provider.field_mapping;
    const value = (rawStatus ?? '').toLowerCase();
    if (value === (mapping.reversed_value ?? 'reversed').toLowerCase()) {
      return 'reversed';
    }
    if (value === (mapping.approved_value ?? 'approved').toLowerCase()) {
      return 'approved';
    }
    return 'pending';
  }

  /**
   * The ledger note for an offer credit. Mirrors the offerwall convention so
   * both earning paths read the same in the wallet: the offer title, plus the
   * milestone's own title when the postback named a goal.
   */
  private buildNote(click: OfferClick, completion: OfferCompletion): string {
    const offer = click.offer;
    const title = offer?.title ?? 'Offer';
    const goal = completion.goal_id
      ? offer?.goals?.find((g) => g.goal_id === completion.goal_id)
      : undefined;
    if (goal) return `${title}: ${goal.title}`;
    // A goal we do not have a title for is still worth naming in the ledger.
    if (completion.goal_id) return `${title}: milestone ${completion.goal_id}`;
    return title;
  }

  private async creditUser(
    click: OfferClick,
    completion: OfferCompletion,
  ): Promise<void> {
    const offer = click.offer;
    const goal = completion.goal_id
      ? offer?.goals?.find((g) => g.goal_id === completion.goal_id)
      : undefined;
    const coins =
      completion.payout_coins || goal?.reward_coins || offer?.reward_coins || 0;
    if (coins <= 0) return;

    const note = this.buildNote(click, completion);

    await this.walletService.credit({
      user_id: click.user_id,
      currency: 'coin',
      amount: coins,
      type: 'earn',
      source_type: 'offer',
      source_id: completion.cz_offer_completion_id,
      note,
    });

    await Promise.all([
      this.completions.update(completion.cz_offer_completion_id, {
        payout_coins: coins,
        credited_at: new Date(),
      }),
      this.notificationsService.push(
        click.user_id,
        'Offer reward credited',
        `You earned ${coins} coins from "${note}".`,
      ),
      this.achievementsService.trackProgress(click.user_id, 'complete_offer'),
      this.referralsService.qualify(click.user_id),
    ]);
  }

  /** A chargeback takes the coins back out through the same ledger. */
  private async reverseUser(
    click: OfferClick,
    completion: OfferCompletion,
  ): Promise<void> {
    if (completion.payout_coins <= 0) return;
    await this.walletService.debit({
      user_id: click.user_id,
      currency: 'coin',
      amount: completion.payout_coins,
      type: 'reversal',
      source_type: 'offer',
      source_id: completion.cz_offer_completion_id,
      note: `Reversed: ${this.buildNote(click, completion)}`,
    });
    await this.notificationsService.push(
      click.user_id,
      'Offer reward reversed',
      `The reward for "${this.buildNote(click, completion)}" was reversed by the provider.`,
    );
  }
}
