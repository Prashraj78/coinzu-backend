import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SupportTicket } from '../../../database/entities/support-ticket.entity';
import { CzSupportErrorCodes } from '../../../common/errors/error.constants';
import { toSkipTake } from '../../../common/utils/pagination.util';
import { AdminListTicketsDto } from '../../support/dto/admin-list-tickets.dto';

interface TicketRow {
  cz_support_ticket_id: string;
  user_id: string;
  type: string;
  category: string | null;
  issue_type: string | null;
  affected_area: string | null;
  subject: string | null;
  description: string;
  status: string;
  rating: number | null;
  occurred_at: Date | null;
  created_at: Date;
  updated_at: Date;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

/** Admin Reports tab: every problem report with the user who raised it. */
@Injectable()
export class AdminTicketsService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly tickets: Repository<SupportTicket>,
  ) {}

  async list(query: AdminListTicketsDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const base = () =>
      this.tickets
        .createQueryBuilder('t')
        .innerJoin('users', 'u', 'u.cz_user_id = t.user_id');

    const builder = base()
      .select([
        't.cz_support_ticket_id AS cz_support_ticket_id',
        't.user_id AS user_id',
        't.type AS type',
        't.category AS category',
        't.issue_type AS issue_type',
        't.affected_area AS affected_area',
        't.subject AS subject',
        't.description AS description',
        't.status AS status',
        't.rating AS rating',
        't.occurred_at AS occurred_at',
        't.created_at AS created_at',
        't.updated_at AS updated_at',
        'u.email AS email',
        'u.name AS name',
        'u.avatar_url AS avatar_url',
      ])
      .orderBy('t.created_at', 'DESC')
      .offset(skip)
      .limit(take);

    const countBuilder = base();

    for (const b of [builder, countBuilder]) {
      if (query.search) {
        b.andWhere(
          '(u.email ILIKE :s OR u.name ILIKE :s OR t.subject ILIKE :s OR t.description ILIKE :s)',
          { s: `%${query.search}%` },
        );
      }
      if (query.type) b.andWhere('t.type = :type', { type: query.type });
      if (query.status) b.andWhere('t.status = :status', { status: query.status });
      if (query.category) {
        b.andWhere('t.category = :category', { category: query.category });
      }
      if (query.issue_type) {
        b.andWhere('t.issue_type = :issue_type', { issue_type: query.issue_type });
      }
      if (query.rating !== undefined) {
        b.andWhere('t.rating = :rating', { rating: query.rating });
      }
      if (query.cz_user_id) {
        b.andWhere('t.user_id = :uid', { uid: query.cz_user_id });
      }
      if (query.date_from) {
        b.andWhere('t.created_at >= :date_from', { date_from: query.date_from });
      }
      if (query.date_end) {
        b.andWhere("t.created_at < (:date_end::date + interval '1 day')", {
          date_end: query.date_end,
        });
      }
    }

    const [rows, total, ratings] = await Promise.all([
      builder.getRawMany<TicketRow>(),
      countBuilder.getCount(),
      this.ratingSummary(countBuilder.clone()),
    ]);

    const data = rows.map((r) => ({
      cz_support_ticket_id: r.cz_support_ticket_id,
      type: r.type,
      category: r.category,
      issue_type: r.issue_type,
      affected_area: r.affected_area,
      subject: r.subject,
      description: r.description,
      status: r.status,
      rating: r.rating,
      occurred_at: r.occurred_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      user: {
        cz_user_id: r.user_id,
        email: r.email,
        name: r.name,
        avatar_url: r.avatar_url,
      },
    }));

    return { data, total, filters: await this.filterOptions(), ratings };
  }

  /**
   * Star breakdown over the same filters, for the Feedback tab's header.
   * `count` is rows that actually carry a rating, not the page total.
   */
  private async ratingSummary(builder: SelectQueryBuilder<SupportTicket>) {
    const row = await builder
      .andWhere('t.rating IS NOT NULL')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(AVG(t.rating), 0)', 'average')
      .addSelect('COUNT(*) FILTER (WHERE t.rating = 1)', 'r1')
      .addSelect('COUNT(*) FILTER (WHERE t.rating = 2)', 'r2')
      .addSelect('COUNT(*) FILTER (WHERE t.rating = 3)', 'r3')
      .addSelect('COUNT(*) FILTER (WHERE t.rating = 4)', 'r4')
      .addSelect('COUNT(*) FILTER (WHERE t.rating = 5)', 'r5')
      .getRawOne<Record<string, string>>();

    return {
      count: Number(row?.count ?? 0),
      average: Number(Number(row?.average ?? 0).toFixed(2)),
      distribution: {
        1: Number(row?.r1 ?? 0),
        2: Number(row?.r2 ?? 0),
        3: Number(row?.r3 ?? 0),
        4: Number(row?.r4 ?? 0),
        5: Number(row?.r5 ?? 0),
      },
    };
  }

  /** The category and issue-type values actually present, so filters stay honest. */
  private async filterOptions() {
    const [categories, issueTypes] = await Promise.all([
      this.tickets
        .createQueryBuilder('t')
        .select('DISTINCT t.category', 'value')
        .where('t.category IS NOT NULL')
        .orderBy('t.category', 'ASC')
        .getRawMany<{ value: string }>(),
      this.tickets
        .createQueryBuilder('t')
        .select('DISTINCT t.issue_type', 'value')
        .where('t.issue_type IS NOT NULL')
        .orderBy('t.issue_type', 'ASC')
        .getRawMany<{ value: string }>(),
    ]);
    return {
      categories: categories.map((r) => r.value),
      issue_types: issueTypes.map((r) => r.value),
    };
  }

  async detail(cz_support_ticket_id: string) {
    const rows = await this.tickets
      .createQueryBuilder('t')
      .innerJoin('users', 'u', 'u.cz_user_id = t.user_id')
      .select([
        't.cz_support_ticket_id AS cz_support_ticket_id',
        't.user_id AS user_id',
        't.type AS type',
        't.category AS category',
        't.issue_type AS issue_type',
        't.affected_area AS affected_area',
        't.subject AS subject',
        't.description AS description',
        't.rating AS rating',
        't.attachment_urls AS attachment_urls',
        't.messages AS messages',
        't.status AS status',
        't.admin_response AS admin_response',
        't.resolved_by AS resolved_by',
        't.occurred_at AS occurred_at',
        't.created_at AS created_at',
        't.updated_at AS updated_at',
        'u.email AS email',
        'u.name AS name',
        'u.avatar_url AS avatar_url',
        'u.status AS user_status',
        'u.country AS country',
        'u.created_at AS user_joined_at',
      ])
      .where('t.cz_support_ticket_id = :id', { id: cz_support_ticket_id })
      .getRawMany<Record<string, unknown>>();

    const row = rows[0];
    if (!row) {
      throw new NotFoundException({
        cz_error_code: CzSupportErrorCodes.TICKET_NOT_FOUND,
      });
    }

    return {
      ticket: {
        cz_support_ticket_id: row.cz_support_ticket_id,
        type: row.type,
        category: row.category,
        issue_type: row.issue_type,
        affected_area: row.affected_area,
        subject: row.subject,
        description: row.description,
        rating: row.rating,
        attachment_urls: row.attachment_urls ?? [],
        status: row.status,
        admin_response: row.admin_response,
        resolved_by: row.resolved_by,
        occurred_at: row.occurred_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      user: {
        cz_user_id: row.user_id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
        status: row.user_status,
        country: row.country,
        joined_at: row.user_joined_at,
      },
      /** The thread. Only the user's turn exists until replies ship. */
      messages: row.messages ?? [],
    };
  }
}
