import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminListUsersDto } from '../../users/dto/admin-list-users.dto';
import { UsersService } from '../../users/users.service';
import { AdminUsersService } from '../services/admin-users.service';

@ApiTags('admin-users')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Every user with their wallet balance, paginated and searchable (admin only)',
  })
  list(@Query() query: AdminListUsersDto) {
    return this.usersService.listAllAdmin(query);
  }

  @Get(':cz_user_id')
  @ApiOperation({
    summary: 'One user\'s full profile: wallet, KYC, referrals, and recent activity (admin only)',
  })
  detail(@Param('cz_user_id') cz_user_id: string) {
    return this.adminUsersService.getAdminDetail(cz_user_id);
  }
}
