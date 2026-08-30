import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminLeaderboardDto } from '../../leaderboard/dto/admin-leaderboard.dto';
import { AdminLeaderboardService } from '../services/admin-leaderboard.service';

@ApiTags('admin-leaderboard')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/leaderboard')
export class AdminLeaderboardController {
  constructor(
    private readonly adminLeaderboardService: AdminLeaderboardService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Coin earners ranked, paginated and filterable by range, country and minimum (admin only)',
  })
  list(@Query() query: AdminLeaderboardDto) {
    return this.adminLeaderboardService.list(query);
  }
}
