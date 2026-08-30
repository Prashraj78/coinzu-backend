import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { AchievementsService } from './achievements.service';

@ApiTags('achievements')
@ApiBearerAuth()
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @ApiOperation({
    summary: 'Every achievement with my progress on each, plus my unlocked count and points',
  })
  list(@CurrentUser() user: RequestUser) {
    return this.achievementsService.listForUser(user.cz_user_id);
  }
}
