import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/auth/request-user.types';
import { AdminListPushDto } from '../../notifications/dto/admin-list-push.dto';
import { CreatePushDto } from '../../notifications/dto/create-push.dto';
import { PreviewAudienceDto } from '../../notifications/dto/preview-audience.dto';
import { TestPushDto } from '../../notifications/dto/test-push.dto';
import { AdminPushService } from '../services/admin-push.service';

@ApiTags('admin-push')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/push')
export class AdminPushController {
  constructor(private readonly adminPushService: AdminPushService) {}

  @Get()
  @ApiOperation({ summary: 'Push campaigns, newest first, filterable (admin only)' })
  list(@Query() query: AdminListPushDto) {
    return this.adminPushService.list(query);
  }

  @Post('preview')
  @ApiOperation({
    summary:
      'How many users and devices an audience reaches, and who drops out, without sending (admin only)',
  })
  preview(@Body() dto: PreviewAudienceDto) {
    return this.adminPushService.previewAudience(dto);
  }

  @Post('test')
  @ApiOperation({
    summary: 'Send the message to a few named accounts without recording a campaign (admin only)',
  })
  test(@Body() dto: TestPushDto) {
    return this.adminPushService.testSend(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a campaign and send it now, schedule it, or save a draft (admin only)',
  })
  create(@CurrentUser() admin: RequestUser, @Body() dto: CreatePushDto) {
    return this.adminPushService.createAndSend(dto, admin.cz_user_id);
  }

  @Post(':cz_push_campaign_id/send')
  @ApiOperation({ summary: 'Run a draft, or resend a campaign (admin only)' })
  send(@Param('cz_push_campaign_id') cz_push_campaign_id: string) {
    return this.adminPushService.send(cz_push_campaign_id);
  }

  @Post(':cz_push_campaign_id/cancel')
  @ApiOperation({ summary: 'Cancel a draft or a scheduled campaign (admin only)' })
  cancel(@Param('cz_push_campaign_id') cz_push_campaign_id: string) {
    return this.adminPushService.cancel(cz_push_campaign_id);
  }

  @Post(':cz_push_campaign_id/duplicate')
  @ApiOperation({ summary: 'Copy a campaign into a new draft (admin only)' })
  duplicate(
    @Param('cz_push_campaign_id') cz_push_campaign_id: string,
    @CurrentUser() admin: RequestUser,
  ) {
    return this.adminPushService.duplicate(cz_push_campaign_id, admin.cz_user_id);
  }

  @Get(':cz_push_campaign_id')
  @ApiOperation({
    summary: 'One campaign with its results and what its audience reaches today (admin only)',
  })
  detail(@Param('cz_push_campaign_id') cz_push_campaign_id: string) {
    return this.adminPushService.detail(cz_push_campaign_id);
  }
}
