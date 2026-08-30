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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/auth/request-user.types';
import {
  CreatePushTemplateDto,
  ListPushTemplatesDto,
  UpdatePushTemplateDto,
} from '../../notifications/dto/push-template.dto';
import { AdminPushTemplateService } from '../services/admin-push-template.service';

@ApiTags('admin-push')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/push-templates')
export class AdminPushTemplateController {
  constructor(private readonly templates: AdminPushTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Saved push templates, most used first (admin only)' })
  list(@Query() query: ListPushTemplatesDto) {
    return this.templates.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Save a reusable push template (admin only)' })
  create(@CurrentUser() admin: RequestUser, @Body() dto: CreatePushTemplateDto) {
    return this.templates.create(dto, admin.cz_user_id);
  }

  @Patch(':cz_push_template_id')
  @ApiOperation({ summary: 'Edit a template or deactivate it (admin only)' })
  update(
    @Param('cz_push_template_id') cz_push_template_id: string,
    @Body() dto: UpdatePushTemplateDto,
  ) {
    return this.templates.update(cz_push_template_id, dto);
  }

  @Delete(':cz_push_template_id')
  @ApiOperation({ summary: 'Delete a template permanently (admin only)' })
  remove(@Param('cz_push_template_id') cz_push_template_id: string) {
    return this.templates.remove(cz_push_template_id);
  }
}
