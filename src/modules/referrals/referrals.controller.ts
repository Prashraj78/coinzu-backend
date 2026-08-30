import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('invite')
  @ApiOperation({
    summary:
      'Everything the Invite a Friend screen needs: link, reward ladder, caps, stats and invited friends',
  })
  invite(@CurrentUser() user: RequestUser) {
    return this.referralsService.getInviteInfo(user.cz_user_id);
  }
}
