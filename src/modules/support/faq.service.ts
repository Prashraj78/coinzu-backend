import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from '../../database/entities/faq.entity';
import { FaqCategory } from '../../database/entities/faq-category.entity';
import { CzSupportErrorCodes } from '../../common/errors/error.constants';
import { ListFaqsDto } from './dto/list-faqs.dto';
import { AdminListFaqsDto } from './dto/admin-list-faqs.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqs: Repository<Faq>,
    @InjectRepository(FaqCategory)
    private readonly categories: Repository<FaqCategory>,
  ) {}

  async listCategories() {
    const [data, total] = await this.categories.findAndCount({
      where: { is_active: true },
      order: { display_order: 'ASC' },
    });
    return { data, total };
  }

  /**
   * Category is the only filter. The whole list is small and returned in one
   * page so the app can search it on the device without another round trip.
   */
  async listFaqs(query: ListFaqsDto) {
    const builder = this.faqs
      .createQueryBuilder('f')
      .innerJoin('faq_categories', 'c', 'c.cz_faq_category_id = f.category_id')
      .where('f.is_active = true')
      .andWhere('c.is_active = true');

    if (query.category) {
      builder.andWhere('c.slug = :slug', { slug: query.category });
    }
    if (query.category_id) {
      builder.andWhere('f.category_id = :category_id', {
        category_id: query.category_id,
      });
    }

    const [[data, total], categories] = await Promise.all([
      builder
        .orderBy('c.display_order', 'ASC')
        .addOrderBy('f.display_order', 'ASC')
        .getManyAndCount(),
      this.listCategories(),
    ]);
    // Categories ride along so the screen's chips and list come from one call.
    return { data, total, categories: categories.data };
  }

  /** Admin list: inactive rows included, each row carrying its category. */
  async listFaqsAdmin(query: AdminListFaqsDto) {
    const builder = this.faqs
      .createQueryBuilder('f')
      .innerJoin('faq_categories', 'c', 'c.cz_faq_category_id = f.category_id')
      .addSelect(['c.slug AS category_slug', 'c.name AS category_name'])
      .orderBy('c.display_order', 'ASC')
      .addOrderBy('f.display_order', 'ASC');

    if (query.category) {
      builder.andWhere('c.slug = :slug', { slug: query.category });
    }
    if (query.is_active !== undefined) {
      builder.andWhere('f.is_active = :is_active', {
        is_active: query.is_active,
      });
    }

    const [rows, total] = await Promise.all([
      builder.getRawAndEntities(),
      builder.getCount(),
    ]);

    const data = rows.entities.map((faq, i) => ({
      ...faq,
      category_slug: rows.raw[i]?.category_slug as string,
      category_name: rows.raw[i]?.category_name as string,
    }));
    return { data, total };
  }

  /** Admin category list: inactive included, so a hidden group is still editable. */
  async listCategoriesAdmin() {
    const [data, total] = await this.categories.findAndCount({
      order: { display_order: 'ASC' },
    });
    return { data, total };
  }

  async createFaq(dto: CreateFaqDto): Promise<Faq> {
    await this.assertCategoryExists(dto.category_id);
    return this.faqs.save(this.faqs.create(dto));
  }

  async updateFaq(faq_id: string, dto: UpdateFaqDto): Promise<Faq> {
    const faq = await this.getFaqOrFail(faq_id);
    if (dto.category_id) await this.assertCategoryExists(dto.category_id);
    Object.assign(faq, dto);
    return this.faqs.save(faq);
  }

  async deleteFaq(faq_id: string): Promise<{ cz_faq_id: string }> {
    const faq = await this.getFaqOrFail(faq_id);
    await this.faqs.remove(faq);
    return { cz_faq_id: faq_id };
  }

  private async assertCategoryExists(category_id: string): Promise<void> {
    const exists = await this.categories.findOne({
      where: { cz_faq_category_id: category_id },
    });
    if (!exists) {
      throw new NotFoundException({
        cz_error_code: CzSupportErrorCodes.FAQ_CATEGORY_NOT_FOUND,
      });
    }
  }

  async getFaqOrFail(faq_id: string): Promise<Faq> {
    const faq = await this.faqs.findOne({ where: { cz_faq_id: faq_id } });
    if (!faq) {
      throw new NotFoundException({
        cz_error_code: CzSupportErrorCodes.FAQ_NOT_FOUND,
      });
    }
    return faq;
  }
}
