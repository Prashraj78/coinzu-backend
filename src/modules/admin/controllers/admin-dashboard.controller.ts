import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminStreakService } from '../services/admin-streak.service';
import { AdminEconomyService } from '../services/admin-economy.service';
import { AdminEconomyQueryDto } from '../../wallet/dto/admin-economy-query.dto';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(
    private readonly adminStreakService: AdminStreakService,
    private readonly adminEconomyService: AdminEconomyService,
  ) {}

  @Get('streak')
  @ApiOperation({
    summary:
      'Daily streak participation, depth and payout for the dashboard (admin only)',
  })
  streak() {
    return this.adminStreakService.dashboard();
  }

  @Get('economy')
  @ApiOperation({
    summary:
      'Coins, gems, revenue, gift cards and withdrawals for a date range (admin only)',
  })
  economy(@Query() query: AdminEconomyQueryDto) {
    return this.adminEconomyService.overview(query);
  }
}
