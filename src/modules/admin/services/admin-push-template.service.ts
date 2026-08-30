import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushTemplate } from '../../../database/entities/push-template.entity';
import type { PushButton } from '../../../database/entities/push-campaign.entity';
import { CzNotificationErrorCodes } from '../../../common/errors/error.constants';
import { toSkipTake } from '../../../common/utils/pagination.util';
import {
  CreatePushTemplateDto,
  ListPushTemplatesDto,
  UpdatePushTemplateDto,
} from '../../notifications/dto/push-template.dto';

/** Saved messages, so a recurring send is picked rather than retyped. */
@Injectable()
export class AdminPushTemplateService {
  constructor(
    @InjectRepository(PushTemplate)
    private readonly templates: Repository<PushTemplate>,
  ) {}

  async list(query: ListPushTemplatesDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const b = this.templates
      .createQueryBuilder('t')
      .orderBy('t.use_count', 'DESC')
      .addOrderBy('t.created_at', 'DESC')
      .skip(skip)
      .take(take);

    if (query.search) {
      b.andWhere('(t.name ILIKE :s OR t.title ILIKE :s OR t.body ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    if (query.category) b.andWhere('t.category = :c', { c: query.category });
    if (query.is_active !== undefined) {
      b.andWhere('t.is_active = :a', { a: query.is_active });
    }

    const [data, total] = await b.getManyAndCount();
    return { data, total };
  }

  async create(dto: CreatePushTemplateDto, admin_id: string | null) {
    return this.templates.save(
      this.templates.create({
        ...dto,
        buttons: (dto.buttons ?? []) as PushButton[],
        created_by: admin_id,
      }),
    );
  }

  async update(id: string, dto: UpdatePushTemplateDto) {
    const template = await this.getOrFail(id);
    Object.assign(template, {
      ...dto,
      ...(dto.buttons ? { buttons: dto.buttons as PushButton[] } : {}),
    });
    return this.templates.save(template);
  }

  async remove(id: string) {
    await this.getOrFail(id);
    await this.templates.delete({ cz_push_template_id: id });
    return { deleted: true };
  }

  private async getOrFail(id: string): Promise<PushTemplate> {
    const template = await this.templates.findOne({
      where: { cz_push_template_id: id },
    });
    if (!template) {
      throw new NotFoundException({
        cz_error_code: CzNotificationErrorCodes.TEMPLATE_NOT_FOUND,
      });
    }
    return template;
  }
}
