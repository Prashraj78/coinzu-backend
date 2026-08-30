import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from '../../../database/entities/achievement.entity';
import { UserAchievement } from '../../../database/entities/user-achievement.entity';
import { User } from '../../../database/entities/user.entity';
import { CzCommonErrorCodes } from '../../../common/errors/error.constants';
import { toSkipTake } from '../../../common/utils/pagination.util';
import {
  AdminListAchievementsDto,
  AdminMedalHoldersDto,
} from '../../achievements/dto/admin-achievements.dto';

interface CountRow {
  achievement_id: string;
  unlocked: string;
  in_progress: string;
}

@Injectable()
export class AdminAchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievements: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievements: Repository<UserAchievement>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /** Every medal with how many users hold it — the tab's grid. */
  async list(query: AdminListAchievementsDto) {
    const b = this.achievements
      .createQueryBuilder('a')
      .orderBy('a.display_order', 'ASC');

    if (query.search) {
      b.andWhere('(a.title ILIKE :s OR a.description ILIKE :s OR a.slug ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    if (query.rarity) b.andWhere('a.rarity = :r', { r: query.rarity });

    const [medals, counts, activeUsers] = await Promise.all([
      b.getMany(),
      this.holderCounts(),
      this.users.count({ where: { status: 'active' } }),
    ]);

    const data = medals.map((a) => {
      const c = counts.get(a.cz_achievement_id);
      const unlocked = Number(c?.unlocked ?? 0);
      return {
        cz_achievement_id: a.cz_achievement_id,
        slug: a.slug,
        title: a.title,
        emoji: a.emoji,
        description: a.description,
        icon_url: a.icon_url,
        rarity: a.rarity,
        points: a.points,
        criteria_type: a.criteria_type,
        criteria_value: a.criteria_value,
        is_active: a.is_active,
        display_order: a.display_order,
        /** Users who have unlocked it. */
        unlocked_users: unlocked,
        /** Users part-way there but not finished. */
        in_progress_users: Number(c?.in_progress ?? 0),
        /** Share of active accounts holding it, one decimal. */
        unlock_rate: activeUsers
          ? Number(((unlocked / activeUsers) * 100).toFixed(1))
          : 0,
      };
    });

    return {
      data,
      total: data.length,
      summary: {
        medals: data.length,
        active_users: activeUsers,
        total_unlocks: data.reduce((s, m) => s + m.unlocked_users, 0),
        /** Medals nobody has earned yet — usually a criteria that never fires. */
        never_unlocked: data.filter((m) => m.unlocked_users === 0).length,
        points_available: data.reduce((s, m) => s + m.points, 0),
      },
    };
  }

  /** Holder and in-progress counts for every medal, in one grouped query. */
  private async holderCounts(): Promise<Map<string, CountRow>> {
    const rows = await this.userAchievements
      .createQueryBuilder('ua')
      .select('ua.achievement_id', 'achievement_id')
      .addSelect('COUNT(*) FILTER (WHERE ua.unlocked_at IS NOT NULL)', 'unlocked')
      .addSelect(
        'COUNT(*) FILTER (WHERE ua.unlocked_at IS NULL AND ua.progress > 0)',
        'in_progress',
      )
      .groupBy('ua.achievement_id')
      .getRawMany<CountRow>();
    return new Map(rows.map((r) => [r.achievement_id, r]));
  }

  /** One medal plus the users who hold it, filterable and paginated. */
  async holders(slug: string, query: AdminMedalHoldersDto) {
    const medal = await this.achievements.findOne({ where: { slug } });
    if (!medal) {
      throw new NotFoundException({
        cz_error_code: CzCommonErrorCodes.RESOURCE_NOT_FOUND,
        cz_error_description: `No medal exists with the slug "${slug}".`,
      });
    }

    const { skip, take } = toSkipTake(query.page, query.limit);
    const base = () =>
      this.userAchievements
        .createQueryBuilder('ua')
        .innerJoin('users', 'u', 'u.cz_user_id = ua.user_id')
        .where('ua.achievement_id = :id', { id: medal.cz_achievement_id });

    const apply = (b: ReturnType<typeof base>) => {
      // Default view is holders; in_progress shows who is close.
      if (query.state === 'in_progress') {
        b.andWhere('ua.unlocked_at IS NULL').andWhere('ua.progress > 0');
      } else {
        b.andWhere('ua.unlocked_at IS NOT NULL');
      }
      if (query.search) {
        b.andWhere('(u.email ILIKE :s OR u.name ILIKE :s)', { s: `%${query.search}%` });
      }
      if (query.country) b.andWhere('u.country = :c', { c: query.country });
      if (query.tier) b.andWhere('u.tier = :t', { t: query.tier });
      if (query.kyc_status) b.andWhere('u.kyc_status = :k', { k: query.kyc_status });
      if (query.status) b.andWhere('u.status = :st', { st: query.status });
      if (query.date_from) {
        b.andWhere('ua.unlocked_at >= :df', { df: query.date_from });
      }
      if (query.date_end) {
        b.andWhere("ua.unlocked_at < (:de::date + interval '1 day')", {
          de: query.date_end,
        });
      }
      return b;
    };

    const rowsQuery = apply(base())
      .select([
        'ua.user_id AS user_id',
        'ua.progress AS progress',
        'ua.unlocked_at AS unlocked_at',
        'u.email AS email',
        'u.name AS name',
        'u.avatar_url AS avatar_url',
        'u.country AS country',
        'u.tier AS tier',
        'u.kyc_status AS kyc_status',
        'u.status AS status',
        'u.created_at AS joined_at',
      ])
      .orderBy('ua.unlocked_at', 'DESC', 'NULLS LAST')
      .addOrderBy('ua.progress', 'DESC')
      .offset(skip)
      .limit(take);

    const [rows, total] = await Promise.all([
      rowsQuery.getRawMany<Record<string, unknown>>(),
      apply(base()).getCount(),
    ]);

    return {
      medal: {
        cz_achievement_id: medal.cz_achievement_id,
        slug: medal.slug,
        title: medal.title,
        emoji: medal.emoji,
        description: medal.description,
        icon_url: medal.icon_url,
        rarity: medal.rarity,
        points: medal.points,
        criteria_type: medal.criteria_type,
        criteria_value: medal.criteria_value,
      },
      data: rows.map((r) => ({
        cz_user_id: r.user_id,
        email: r.email,
        name: r.name,
        avatar_url: r.avatar_url,
        country: r.country,
        tier: r.tier,
        kyc_status: r.kyc_status,
        status: r.status,
        joined_at: r.joined_at,
        progress: Number(r.progress ?? 0),
        target: medal.criteria_value,
        progress_label: `${Math.min(Number(r.progress ?? 0), medal.criteria_value)}/${medal.criteria_value}`,
        unlocked_at: r.unlocked_at,
        is_unlocked: Boolean(r.unlocked_at),
      })),
      total,
    };
  }

  /** Every medal for one user, for the admin user detail page. */
  async forUser(user_id: string) {
    const [medals, mine] = await Promise.all([
      this.achievements.find({
        where: { is_active: true },
        order: { display_order: 'ASC' },
      }),
      this.userAchievements.find({ where: { user_id } }),
    ]);
    const byId = new Map(mine.map((r) => [r.achievement_id, r]));

    const data = medals.map((a) => {
      const row = byId.get(a.cz_achievement_id);
      const unlocked = Boolean(row?.unlocked_at);
      const progress = unlocked
        ? a.criteria_value
        : Math.min(row?.progress ?? 0, a.criteria_value);
      return {
        slug: a.slug,
        title: a.title,
        emoji: a.emoji,
        description: a.description,
        icon_url: a.icon_url,
        rarity: a.rarity,
        points: a.points,
        target: a.criteria_value,
        progress,
        progress_label: `${progress}/${a.criteria_value}`,
        progress_pct: a.criteria_value
          ? Math.min(100, Math.round((progress / a.criteria_value) * 100))
          : 0,
        is_unlocked: unlocked,
        unlocked_at: row?.unlocked_at ?? null,
      };
    });

    const unlocked = data.filter((m) => m.is_unlocked);
    const rank: Record<string, number> = { rarest: 4, epic: 3, rare: 2, common: 1 };
    const rarest =
      [...unlocked].sort(
        (a, b) => rank[b.rarity] - rank[a.rarity] || b.points - a.points,
      )[0] ?? null;
    const current =
      [...unlocked].sort(
        (a, b) =>
          (b.unlocked_at?.getTime() ?? 0) - (a.unlocked_at?.getTime() ?? 0),
      )[0] ?? null;

    return {
      data,
      total: data.length,
      unlocked_count: unlocked.length,
      points: unlocked.reduce((s, m) => s + m.points, 0),
      points_available: data.reduce((s, m) => s + m.points, 0),
      current_medal: current,
      rarest_medal: rarest,
    };
  }
}
