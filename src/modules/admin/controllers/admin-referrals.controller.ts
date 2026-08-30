import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { AdminListReferralsDto } from '../../referrals/dto/admin-list-referrals.dto';
import { ReferralsService } from '../../referrals/referrals.service';

@ApiTags('admin-referrals')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/referrals')
export class AdminReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get()
  @ApiOperation({
    summary: 'Every user with their referral counts and coins earned, paginated (admin only)',
  })
  list(@Query() query: AdminListReferralsDto) {
    return this.referralsService.listAllAdmin(query);
  }

  @Get(':cz_user_id')
  @ApiOperation({
    summary: "One user's referral summary and everyone they invited, paginated (admin only)",
  })
  detail(
    @Param('cz_user_id') cz_user_id: string,
    @Query() query: ListQueryDto,
  ) {
    return this.referralsService.getAdminDetail(
      cz_user_id,
      query.page,
      query.limit,
    );
  }
}
