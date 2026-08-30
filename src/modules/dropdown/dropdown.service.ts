import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DropdownOption } from '../../database/entities/dropdown-option.entity';
import { DropdownType } from '../../database/entities/dropdown-type.entity';
import { CzDropdownErrorCodes } from '../../common/errors/error.constants';
import { toSkipTake } from '../../common/utils/pagination.util';
import { CreateDropdownTypeDto } from './dto/create-dropdown-type.dto';
import { ListAdminDropdownOptionsDto } from './dto/list-admin-dropdown-options.dto';
import { ListDropdownTypesDto } from './dto/list-dropdown-types.dto';
import { UpdateDropdownTypeDto } from './dto/update-dropdown-type.dto';
import { UpsertDropdownOptionDto } from './dto/upsert-dropdown-option.dto';

export interface DropdownOptionView {
  value: string;
  label: string;
  icon_url: string | null;
}

@Injectable()
export class DropdownService {
  constructor(
    @InjectRepository(DropdownOption)
    private readonly options: Repository<DropdownOption>,
    @InjectRepository(DropdownType)
    private readonly types: Repository<DropdownType>,
  ) {}

  /** Active options in active categories, grouped by type, for app consumption. */
  async listGrouped(types?: string[]): Promise<Record<string, DropdownOptionView[]>> {
    const activeTypes = await this.types.find({
      where: types?.length
        ? { is_active: true, type: In(types) }
        : { is_active: true },
      select: { type: true },
    });
    const allowed = activeTypes.map((t) => t.type);
    if (!allowed.length) return {};

    const rows = await this.options.find({
      where: { is_active: true, type: In(allowed) },
      order: { type: 'ASC', display_order: 'ASC' },
      select: { type: true, value: true, label: true, icon_url: true },
    });

    const grouped: Record<string, DropdownOptionView[]> = {};
    for (const row of rows) {
      (grouped[row.type] ??= []).push({
        value: row.value,
        label: row.label,
        icon_url: row.icon_url,
      });
    }
    return grouped;
  }

  /** Admin categories list, each with how many options it holds. */
  async listTypesAdmin(query: ListDropdownTypesDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const builder = this.types
      .createQueryBuilder('t')
      .orderBy('t.display_order', 'ASC')
      .addOrderBy('t.type', 'ASC')
      .skip(skip)
      .take(take);

    if (query.search) {
      builder.andWhere('(t.type ILIKE :search OR t.label ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.is_active !== undefined) {
      builder.andWhere('t.is_active = :is_active', {
        is_active: query.is_active,
      });
    }

    const [types, total] = await builder.getManyAndCount();
    if (!types.length) return { data: [], total };

    const counts = await this.options
      .createQueryBuilder('o')
      .select('o.type', 'type')
      .addSelect('COUNT(*)', 'option_count')
      .addSelect(
        'COUNT(*) FILTER (WHERE o.is_active = true)',
        'active_option_count',
      )
      .where('o.type IN (:...types)', { types: types.map((t) => t.type) })
      .groupBy('o.type')
      .getRawMany<{
        type: string;
        option_count: string;
        active_option_count: string;
      }>();
    const byType = new Map(counts.map((c) => [c.type, c]));

    const data = types.map((t) => {
      const c = byType.get(t.type);
      return {
        ...t,
        option_count: Number(c?.option_count ?? 0),
        active_option_count: Number(c?.active_option_count ?? 0),
      };
    });
    return { data, total };
  }

  async createType(dto: CreateDropdownTypeDto): Promise<DropdownType> {
    const existing = await this.types.findOne({ where: { type: dto.type } });
    if (existing) {
      throw new ConflictException({
        cz_error_code: CzDropdownErrorCodes.TYPE_ALREADY_EXISTS,
      });
    }
    return this.types.save(this.types.create(dto));
  }

  async updateType(id: string, dto: UpdateDropdownTypeDto): Promise<DropdownType> {
    const type = await this.types.findOne({
      where: { cz_dropdown_type_id: id },
    });
    if (!type) {
      throw new NotFoundException({
        cz_error_code: CzDropdownErrorCodes.TYPE_NOT_FOUND,
      });
    }
    Object.assign(type, dto);
    return this.types.save(type);
  }

  /** Admin options list — paginated, and scoped to one category when `type` is sent. */
  async listAllAdmin(query: ListAdminDropdownOptionsDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const builder = this.options
      .createQueryBuilder('o')
      .orderBy('o.display_order', 'ASC')
      .addOrderBy('o.value', 'ASC')
      .skip(skip)
      .take(take);

    if (query.type) {
      builder.andWhere('o.type = :type', { type: query.type });
    }
    if (query.search) {
      builder.andWhere('(o.value ILIKE :search OR o.label ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.is_active !== undefined) {
      builder.andWhere('o.is_active = :is_active', {
        is_active: query.is_active,
      });
    }

    const [data, total] = await builder.getManyAndCount();
    return { data, total };
  }

  async create(dto: UpsertDropdownOptionDto): Promise<DropdownOption> {
    if (dto.type && dto.value) {
      const existing = await this.options.findOne({
        where: { type: dto.type, value: dto.value },
      });
      if (existing) {
        throw new ConflictException({
          cz_error_code: CzDropdownErrorCodes.OPTION_ALREADY_EXISTS,
        });
      }
    }
    if (dto.type) {
      const type = await this.types.findOne({ where: { type: dto.type } });
      if (!type) {
        throw new NotFoundException({
          cz_error_code: CzDropdownErrorCodes.TYPE_NOT_FOUND,
        });
      }
    }
    const option = this.options.create(dto);
    return this.options.save(option);
  }

  async update(id: string, dto: UpsertDropdownOptionDto): Promise<DropdownOption> {
    const option = await this.options.findOne({
      where: { cz_dropdown_option_id: id },
    });
    if (!option) {
      throw new NotFoundException({
        cz_error_code: CzDropdownErrorCodes.OPTION_NOT_FOUND,
      });
    }
    const type = dto.type ?? option.type;
    const value = dto.value ?? option.value;
    if (type !== option.type || value !== option.value) {
      const existing = await this.options.findOne({ where: { type, value } });
      if (existing) {
        throw new ConflictException({
          cz_error_code: CzDropdownErrorCodes.OPTION_ALREADY_EXISTS,
        });
      }
    }
    Object.assign(option, dto);
    return this.options.save(option);
  }
}
