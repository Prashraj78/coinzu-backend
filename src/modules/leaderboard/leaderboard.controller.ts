import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Top earners for today, this week, or all time' })
  top(@Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.getTop(
      query.window ?? 'all_time',
      query.limit ?? 50,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'My own rank in the chosen window' })
  myRank(@CurrentUser() user: RequestUser, @Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.getMyRank(
      user.cz_user_id,
      query.window ?? 'all_time',
    );
  }
}
