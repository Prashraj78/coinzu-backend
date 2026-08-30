import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ReportPushEventDto } from './dto/push-event.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications, newest first, with my unread count' })
  list(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.notificationsService.listForUser(
      user.cz_user_id,
      query.page,
      query.limit,
    );
  }

  @Post('push-events')
  @ApiOperation({
    summary: 'Report that a push was delivered, opened, or had a button tapped',
  })
  reportPushEvent(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReportPushEventDto,
  ) {
    return this.notificationsService.reportPushEvent(user.cz_user_id, dto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.markRead(id, user.cz_user_id);
  }
}
