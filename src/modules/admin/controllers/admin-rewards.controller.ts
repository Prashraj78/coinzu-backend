import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  DrawsQueryDto,
  RewardDashboardDto,
  SavePayoutRulesDto,
  SavePrizesDto,
  UpdateRewardGameDto,
} from '../../rewards/dto/admin-rewards.dto';
import { AdminRewardsService } from '../services/admin-rewards.service';

@ApiTags('admin-rewards')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/rewards')
export class AdminRewardsController {
  constructor(private readonly service: AdminRewardsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Gems collected, coins paid, and the trend (admin only)' })
  dashboard(@Query() query: RewardDashboardDto) {
    return this.service.dashboard(query);
  }

  @Get('games')
  @ApiOperation({ summary: 'Every reward card with its live figures (admin only)' })
  listGames() {
    return this.service.listGames();
  }

  @Patch('games/:cz_reward_game_id')
  @ApiOperation({ summary: 'Edits one reward card (admin only)' })
  updateGame(
    @Param('cz_reward_game_id') id: string,
    @Body() dto: UpdateRewardGameDto,
  ) {
    return this.service.updateGame(id, dto);
  }

  @Get('games/:cz_reward_game_id/prizes')
  @ApiOperation({ summary: 'The prize ladder or wheel face (admin only)' })
  getPrizes(@Param('cz_reward_game_id') id: string) {
    return this.service.getPrizes(id);
  }

  @Put('games/:cz_reward_game_id/prizes')
  @ApiOperation({ summary: 'Replaces the whole prize ladder (admin only)' })
  savePrizes(@Param('cz_reward_game_id') id: string, @Body() dto: SavePrizesDto) {
    return this.service.savePrizes(id, dto);
  }

  @Get('games/:cz_reward_game_id/payout-rules')
  @ApiOperation({ summary: 'How the pot scales with turnout (admin only)' })
  getRules(@Param('cz_reward_game_id') id: string) {
    return this.service.getRules(id);
  }

  @Put('games/:cz_reward_game_id/payout-rules')
  @ApiOperation({ summary: 'Replaces the turnout-to-pot ladder (admin only)' })
  saveRules(@Param('cz_reward_game_id') id: string, @Body() dto: SavePayoutRulesDto) {
    return this.service.saveRules(id, dto);
  }

  @Get('draws')
  @ApiOperation({ summary: 'Every draw instance with its winners (admin only)' })
  listDraws(@Query() query: DrawsQueryDto) {
    return this.service.listDraws(query);
  }

  @Post('draws/run')
  @ApiOperation({ summary: 'Settles what is due and opens what is missing (admin only)' })
  runDraws() {
    return this.service.runDraws();
  }
}
