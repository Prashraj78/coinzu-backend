import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AdminListAchievementsDto,
  AdminMedalHoldersDto,
} from '../../achievements/dto/admin-achievements.dto';
import { AdminAchievementsService } from '../services/admin-achievements.service';

@ApiTags('admin-achievements')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/achievements')
export class AdminAchievementsController {
  constructor(private readonly service: AdminAchievementsService) {}

  @Get()
  @ApiOperation({
    summary: 'Every medal with how many users hold it (admin only)',
  })
  list(@Query() query: AdminListAchievementsDto) {
    return this.service.list(query);
  }

  @Get(':slug/users')
  @ApiOperation({
    summary: 'The users holding one medal, filterable and paginated (admin only)',
  })
  holders(@Param('slug') slug: string, @Query() query: AdminMedalHoldersDto) {
    return this.service.holders(slug, query);
  }
}
