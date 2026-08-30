import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminStreakService } from '../services/admin-streak.service';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminStreakService: AdminStreakService) {}

  @Get('streak')
  @ApiOperation({
    summary: 'Daily streak participation, depth and payout for the dashboard (admin only)',
  })
  streak() {
    return this.adminStreakService.dashboard();
  }
}
