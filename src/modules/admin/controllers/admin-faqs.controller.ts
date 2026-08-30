import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminListFaqsDto } from '../../support/dto/admin-list-faqs.dto';
import { CreateFaqDto } from '../../support/dto/create-faq.dto';
import { UpdateFaqDto } from '../../support/dto/update-faq.dto';
import { FaqService } from '../../support/faq.service';

@ApiTags('admin-faqs')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/faqs')
export class AdminFaqsController {
  constructor(private readonly faqService: FaqService) {}

  @Get('categories')
  @ApiOperation({ summary: 'FAQ categories, inactive included (admin only)' })
  listCategories() {
    return this.faqService.listCategoriesAdmin();
  }

  @Get()
  @ApiOperation({
    summary: 'Every FAQ with its category, inactive included, filterable by category (admin only)',
  })
  list(@Query() query: AdminListFaqsDto) {
    return this.faqService.listFaqsAdmin(query);
  }

  @Post()
  @ApiOperation({ summary: 'Add a FAQ to a category (admin only)' })
  create(@Body() dto: CreateFaqDto) {
    return this.faqService.createFaq(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a FAQ, or hide it with is_active (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.faqService.updateFaq(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a FAQ for good (admin only)' })
  remove(@Param('id') id: string) {
    return this.faqService.deleteFaq(id);
  }
}
