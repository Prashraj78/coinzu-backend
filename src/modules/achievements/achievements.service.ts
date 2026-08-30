import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Achievement } from '../../database/entities/achievement.entity';
import { UserAchievement } from '../../database/entities/user-achievement.entity';
import { WalletTransaction } from '../../database/entities/wallet-transaction.entity';

/** Rarest first, so "current" and "rarest" medals are easy to pick out. */
const RARITY_RANK: Record<string, number> = {
  rarest: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievements: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievements: Repository<UserAchievement>,
    @InjectRepository(WalletTransaction)
    private readonly transactions: Repository<WalletTransaction>,
  ) {}

  /**
   * The whole Achievements screen in one call: lifetime earnings, the medal
   * board with per-medal progress, the current and rarest medals, and the
   * headline progress figure.
   */
  async listForUser(user_id: string) {
    const [all, mine, earned] = await Promise.all([
      this.achievements.find({
        where: { is_active: true },
        order: { display_order: 'ASC' },
      }),
      this.userAchievements.find({ where: { user_id } }),
      this.lifetimeEarned(user_id),
    ]);

    const byId = new Map(mine.map((row) => [row.achievement_id, row]));

    const data = all.map((a) => {
      const row = byId.get(a.cz_achievement_id);
      const progress = Math.min(row?.progress ?? 0, a.criteria_value);
      const is_unlocked = Boolean(row?.unlocked_at);
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
        /** How many are needed, e.g. 10 offers. */
        target: a.criteria_value,
        progress: is_unlocked ? a.criteria_value : progress,
        /** 0–100, for the bar under each medal. */
        progress_pct: a.criteria_value
          ? Math.min(
              100,
              Math.round(
                ((is_unlocked ? a.criteria_value : progress) / a.criteria_value) * 100,
              ),
            )
          : 0,
        /** "1/1" under the medal on the detail sheet. */
        progress_label: `${is_unlocked ? a.criteria_value : progress}/${a.criteria_value}`,
        is_unlocked,
        unlocked_at: row?.unlocked_at ?? null,
        display_order: a.display_order,
      };
    });

    const unlocked = data.filter((a) => a.is_unlocked);

    // Newest unlock wins; ties break on rarity so the better medal shows.
    const current =
      [...unlocked].sort((a, b) => {
        const t = (b.unlocked_at?.getTime() ?? 0) - (a.unlocked_at?.getTime() ?? 0);
        return t !== 0 ? t : RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
      })[0] ?? null;

    const rarest =
      [...unlocked].sort((a, b) => {
        const r = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
        return r !== 0 ? r : b.points - a.points;
      })[0] ?? null;

    return {
      /** Lifetime totals for the two header tiles. */
      earned: {
        coins: earned.coins,
        gems: earned.gems,
      },
      progress: {
        unlocked: unlocked.length,
        total: data.length,
        /** "18/36" on the header card. */
        label: `${unlocked.length}/${data.length}`,
        percent: data.length
          ? Math.round((unlocked.length / data.length) * 100)
          : 0,
        points: unlocked.reduce((sum, a) => sum + a.points, 0),
        points_available: data.reduce((sum, a) => sum + a.points, 0),
      },
      current_medal: current,
      rarest_medal: rarest,
      /** Every medal, in board order. `rarest` ones close the board. */
      data,
      total: data.length,
    };
  }

  /**
   * The medal to show against each user in a list — the rarest they hold,
   * breaking ties on points. One query for the whole page.
   */
  async currentMedals(user_ids: string[]) {
    const out = new Map<
      string,
      { slug: string | null; title: string; emoji: string | null; icon_url: string | null; rarity: string }
    >();
    if (!user_ids.length) return out;

    const rows = await this.userAchievements
      .createQueryBuilder('ua')
      .innerJoin('achievements', 'a', 'a.cz_achievement_id = ua.achievement_id')
      .select('ua.user_id', 'user_id')
      .addSelect('a.slug', 'slug')
      .addSelect('a.title', 'title')
      .addSelect('a.emoji', 'emoji')
      .addSelect('a.icon_url', 'icon_url')
      .addSelect('a.rarity', 'rarity')
      .addSelect('a.points', 'points')
      .where('ua.user_id IN (:...user_ids)', { user_ids })
      .andWhere('ua.unlocked_at IS NOT NULL')
      .getRawMany<{
        user_id: string; slug: string | null; title: string;
        emoji: string | null; icon_url: string | null; rarity: string; points: number;
      }>();

    for (const r of rows) {
      const held = out.get(r.user_id);
      const better =
        !held ||
        RARITY_RANK[r.rarity] > RARITY_RANK[held.rarity];
      if (better) {
        out.set(r.user_id, {
          slug: r.slug, title: r.title, emoji: r.emoji,
          icon_url: r.icon_url, rarity: r.rarity,
        });
      }
    }
    return out;
  }

  /** Lifetime coins and gems credited to this user, across every source. */
  private async lifetimeEarned(user_id: string) {
    const row = await this.transactions
      .createQueryBuilder('t')
      .select(
        `COALESCE(SUM(t.amount) FILTER (WHERE t.currency = 'coin'), 0)`,
        'coins',
      )
      .addSelect(
        `COALESCE(SUM(t.amount) FILTER (WHERE t.currency = 'gem'), 0)`,
        'gems',
      )
      .where('t.user_id = :user_id', { user_id })
      .andWhere("t.type = 'earn'")
      .getRawOne<{ coins: string; gems: string }>();
    return { coins: Number(row?.coins ?? 0), gems: Number(row?.gems ?? 0) };
  }

  /**
   * Bumps progress for every achievement watching this criteria_type, and
   * unlocks + pays out the ones that just hit their target.
   */
  async trackProgress(
    user_id: string,
    criteria_type: string,
    increment = 1,
  ): Promise<void> {
    const matching = await this.achievements.find({
      where: { criteria_type, is_active: true },
    });
    if (!matching.length) return;

    const existing = await this.userAchievements.find({
      where: {
        user_id,
        achievement_id: In(matching.map((a) => a.cz_achievement_id)),
      },
    });

    for (const achievement of matching) {
      const row =
        existing.find((r) => r.achievement_id === achievement.cz_achievement_id) ??
        this.userAchievements.create({
          user_id,
          achievement_id: achievement.cz_achievement_id,
          progress: 0,
        });

      if (row.unlocked_at) continue;

      row.progress += increment;
      if (row.progress >= achievement.criteria_value) {
        row.progress = achievement.criteria_value;
        row.unlocked_at = new Date();
      }
      await this.userAchievements.save(row);
    }
  }

  /**
   * Sets absolute progress rather than adding to it — right for a criteria
   * that is a standing figure, like a referral count or a streak length.
   */
  async setProgress(
    user_id: string,
    criteria_type: string,
    value: number,
  ): Promise<void> {
    const matching = await this.achievements.find({
      where: { criteria_type, is_active: true },
    });
    for (const achievement of matching) {
      const row =
        (await this.userAchievements.findOne({
          where: { user_id, achievement_id: achievement.cz_achievement_id },
        })) ??
        this.userAchievements.create({
          user_id,
          achievement_id: achievement.cz_achievement_id,
          progress: 0,
        });
      if (row.unlocked_at || value <= row.progress) continue;

      row.progress = Math.min(value, achievement.criteria_value);
      if (row.progress >= achievement.criteria_value) row.unlocked_at = new Date();
      await this.userAchievements.save(row);
    }
  }

}
