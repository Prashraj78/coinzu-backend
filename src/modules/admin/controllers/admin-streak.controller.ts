import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SaveStreakLadderDto } from '../../daily/dto/streak-config.dto';
import { AdminStreakService } from '../services/admin-streak.service';

@ApiTags('admin-streak')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/streak')
export class AdminStreakController {
  constructor(private readonly adminStreakService: AdminStreakService) {}

  @Get()
  @ApiOperation({
    summary: 'The 30-day streak ladder, its payout totals and where users sit (admin only)',
  })
  getLadder() {
    return this.adminStreakService.getLadder();
  }

  @Put()
  @ApiOperation({
    summary: 'Replaces the whole 30-day ladder in one transaction (admin only)',
  })
  saveLadder(@Body() dto: SaveStreakLadderDto) {
    return this.adminStreakService.saveLadder(dto);
  }

  @Post('reset')
  @ApiOperation({
    summary: 'Restores the shipped 5,000-coin / 2,000-gem ladder (admin only)',
  })
  resetLadder() {
    return this.adminStreakService.resetLadder();
  }
}
