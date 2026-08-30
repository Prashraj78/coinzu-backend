import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ChallengesService } from './challenges.service';
import { ChallengeBoardService } from './challenge-board.service';
import { StreakService } from './streak.service';

@ApiTags('daily')
@ApiBearerAuth()
@Controller('daily')
export class DailyController {
  constructor(
    private readonly challengesService: ChallengesService,
    private readonly boardService: ChallengeBoardService,
    private readonly streakService: StreakService,
  ) {}

  @Get('challenges')
  @ApiOperation({
    summary:
      'The whole Daily Challenge screen — tiles, progress, master chest, calendar and what is playable',
  })
  challengeBoard(
    @CurrentUser() user: RequestUser,
    @Query('date') date?: string,
  ) {
    return this.boardService.getBoard(user.cz_user_id, date);
  }

  @Post('challenges/chest')
  @ApiOperation({
    summary: 'Claim the daily master chest, once every challenge is finished',
  })
  claimChest(@CurrentUser() user: RequestUser) {
    return this.boardService.claimChest(user.cz_user_id);
  }

  @Post('challenges/:id/claim')
  @ApiOperation({ summary: 'Claim the reward for a completed challenge' })
  claimChallenge(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.challengesService.claim(user.cz_user_id, id);
  }

  @Get('streak')
  @ApiOperation({
    summary: 'My 30-day streak board — the whole Rewards screen, called on app open',
  })
  streakBoard(@CurrentUser() user: RequestUser) {
    return this.streakService.getBoard(user.cz_user_id);
  }

  @Post('streak/claim')
  @ApiOperation({ summary: "Claim today's streak day. This is the daily check-in." })
  claimStreak(@CurrentUser() user: RequestUser) {
    return this.streakService.claimToday(user.cz_user_id);
  }
}
