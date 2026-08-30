import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer } from '../../database/entities/offer.entity';
import { OfferClick } from '../../database/entities/offer-click.entity';
import { OfferCompletion } from '../../database/entities/offer-completion.entity';
import { User } from '../../database/entities/user.entity';
import { CzOfferErrorCodes } from '../../common/errors/error.constants';
import { generateClickId } from '../../common/utils/random.util';
import { toSkipTake } from '../../common/utils/pagination.util';
import { OfferwallExternal } from '../../external/offerwall.external';
import { ProvidersService } from './providers.service';
import { ListOffersDto } from './dto/list-offers.dto';

/** One row of the "My Offers" screen. */
export interface MyOfferRow {
  cz_offer_click_id: string;
  clicked_at: Date;
  offer: Offer | null;
  status: string;
  payout_coins: number;
  credited_at: Date | null;
}

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offers: Repository<Offer>,
    @InjectRepository(OfferClick)
    private readonly clicks: Repository<OfferClick>,
    @InjectRepository(OfferCompletion)
    private readonly completions: Repository<OfferCompletion>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly providersService: ProvidersService,
    private readonly offerwall: OfferwallExternal,
  ) {}

  /** Live offers, narrowed to the user's country and the requested filters. */
  async listForUser(user_id: string, query: ListOffersDto) {
    const user = await this.users.findOne({
      where: { cz_user_id: user_id },
      select: { cz_user_id: true, country: true },
    });
    const { skip, take } = toSkipTake(query.page, query.limit);

    const builder = this.offers
      .createQueryBuilder('o')
      .where('o.is_active = true')
      .andWhere('(o.expires_at IS NULL OR o.expires_at > NOW())');

    if (query.category) {
      builder.andWhere('o.category = :category', { category: query.category });
    }
    if (query.search) {
      builder.andWhere('o.title ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.platform) {
      builder.andWhere(
        "(o.platforms = '[]'::jsonb OR o.platforms @> :platform)",
        { platform: JSON.stringify([query.platform]) },
      );
    }
    if (user?.country) {
      builder.andWhere(
        "(o.countries = '[]'::jsonb OR o.countries @> :country)",
        { country: JSON.stringify([user.country]) },
      );
    }

    const [data, total] = await builder
      .orderBy('o.reward_coins', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { data, total };
  }

  async getOrFail(offer_id: string): Promise<Offer> {
    const offer = await this.offers.findOne({ where: { cz_offer_id: offer_id } });
    if (!offer) {
      throw new NotFoundException({
        cz_error_code: CzOfferErrorCodes.OFFER_NOT_FOUND,
      });
    }
    return offer;
  }

  async listCategories(): Promise<string[]> {
    const rows = await this.offers
      .createQueryBuilder('o')
      .select('DISTINCT o.category', 'category')
      .where('o.is_active = true')
      .andWhere('o.category IS NOT NULL')
      .getRawMany<{ category: string }>();
    return rows.map((row) => row.category);
  }

  /**
   * Records the click and returns the provider tracking URL with macros filled
   * in. The click_id is what the provider echoes back on the postback.
   */
  async click(
    user_id: string,
    offer_id: string,
    ip_address: string | null,
    user_agent: string | null,
  ) {
    const [offer, user] = await Promise.all([
      this.getOrFail(offer_id),
      this.users.findOne({
        where: { cz_user_id: user_id },
        select: { cz_user_id: true, country: true },
      }),
    ]);
    if (!offer.is_active) {
      throw new BadRequestException({
        cz_error_code: CzOfferErrorCodes.OFFER_INACTIVE,
      });
    }

    const provider = await this.providersService.getOrFail(offer.provider_id);
    if (!provider.is_active) {
      throw new ForbiddenException({
        cz_error_code: CzOfferErrorCodes.PROVIDER_INACTIVE,
      });
    }
    if (
      user?.country &&
      offer.countries.length > 0 &&
      !offer.countries.includes(user.country)
    ) {
      throw new ForbiddenException({
        cz_error_code: CzOfferErrorCodes.OFFER_NOT_AVAILABLE_IN_COUNTRY,
      });
    }

    const click = this.clicks.create({
      user_id,
      offer_id,
      provider_id: offer.provider_id,
      click_id: generateClickId(),
      ip_address,
      user_agent,
    });
    const saved = await this.clicks.save(click);

    const tracking_url = this.offerwall.buildClickUrl(
      provider.macro_template.click_url,
      {
        CLICK_ID: saved.click_id,
        USER_ID: user_id,
        OFFER_ID: offer.external_offer_id,
        COUNTRY: user?.country ?? '',
        DEVICE: user_agent ?? '',
      },
    );

    return { click_id: saved.click_id, tracking_url };
  }

  /** One query with both relations joined — no per-row lookups. */
  async listMyOffers(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [rows, total] = await this.clicks.findAndCount({
      where: { user_id },
      relations: { offer: true, completion: true },
      order: { clicked_at: 'DESC' },
      skip,
      take,
    });

    const data: MyOfferRow[] = [];
    for (const click of rows) {
      data.push({
        cz_offer_click_id: click.cz_offer_click_id,
        clicked_at: click.clicked_at,
        offer: click.offer,
        status: click.completion?.status ?? 'in_progress',
        payout_coins: click.completion?.payout_coins ?? 0,
        credited_at: click.completion?.credited_at ?? null,
      });
    }

    return { data, total };
  }
}
