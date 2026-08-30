import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { RewardsService } from './rewards.service';
import { BuyEntriesDto, WinnersQueryDto } from './dto/rewards.dto';

@ApiTags('rewards')
@ApiBearerAuth()
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Get()
  @ApiOperation({ summary: 'The Rewards screen: every card with its countdown' })
  list(@CurrentUser() user: RequestUser) {
    return this.rewards.list(user.cz_user_id);
  }

  @Get('winners')
  @ApiOperation({ summary: 'Winners across every reward, filterable by date' })
  allWinners(@Query() query: WinnersQueryDto) {
    return this.rewards.listWinners(undefined, query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'One reward: pot, countdown, my entries, prizes, winners' })
  detail(@CurrentUser() user: RequestUser, @Param('slug') slug: string) {
    return this.rewards.detail(user.cz_user_id, slug);
  }

  @Get(':slug/winners')
  @ApiOperation({ summary: 'Winners of one reward, filterable by date' })
  winners(@Param('slug') slug: string, @Query() query: WinnersQueryDto) {
    return this.rewards.listWinners(slug, query);
  }

  @Post(':slug/entries')
  @ApiOperation({ summary: 'Buys entries into a draw with gems' })
  buyEntries(
    @CurrentUser() user: RequestUser,
    @Param('slug') slug: string,
    @Body() dto: BuyEntriesDto,
  ) {
    return this.rewards.buyEntries(user.cz_user_id, slug, dto.count);
  }

  @Post(':slug/play')
  @ApiOperation({ summary: 'Pays for one instant play and resolves it' })
  play(@CurrentUser() user: RequestUser, @Param('slug') slug: string) {
    return this.rewards.play(user.cz_user_id, slug);
  }
}
