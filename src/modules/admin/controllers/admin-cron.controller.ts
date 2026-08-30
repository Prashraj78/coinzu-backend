import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/auth/request-user.types';
import {
  SetCronEnabledDto,
  SetCronScheduleDto,
} from '../../cron/dto/admin-cron.dto';
import { AdminCronService } from '../services/admin-cron.service';

@ApiTags('admin-cron')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/cron')
export class AdminCronController {
  constructor(private readonly adminCronService: AdminCronService) {}

  @Get()
  @ApiOperation({
    summary: 'Every scheduled job, its schedule and how it last went (admin only)',
  })
  list() {
    return this.adminCronService.list();
  }

  @Post(':key/run')
  @ApiOperation({ summary: 'Runs one job now, on demand (admin only)' })
  run(@Param('key') key: string, @CurrentUser() admin: RequestUser) {
    return this.adminCronService.runNow(key, admin.cz_user_id);
  }

  @Patch(':key/enabled')
  @ApiOperation({ summary: 'Pauses or resumes one job (admin only)' })
  setEnabled(
    @Param('key') key: string,
    @Body() dto: SetCronEnabledDto,
    @CurrentUser() admin: RequestUser,
  ) {
    return this.adminCronService.setEnabled(key, dto.enabled, admin.cz_user_id);
  }

  @Put(':key/schedule')
  @ApiOperation({ summary: 'Overrides one job\'s cron expression (admin only)' })
  setSchedule(
    @Param('key') key: string,
    @Body() dto: SetCronScheduleDto,
    @CurrentUser() admin: RequestUser,
  ) {
    return this.adminCronService.setSchedule(key, dto.cron, admin.cz_user_id);
  }

  @Post(':key/reset')
  @ApiOperation({
    summary: 'Drops the override and restores the shipped schedule (admin only)',
  })
  resetSchedule(@Param('key') key: string, @CurrentUser() admin: RequestUser) {
    return this.adminCronService.resetSchedule(key, admin.cz_user_id);
  }
}
