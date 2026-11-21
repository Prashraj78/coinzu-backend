import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminDeleteUserDto } from '../../users/dto/admin-delete-user.dto';
import { AdminListUsersDto } from '../../users/dto/admin-list-users.dto';
import { AdminUpdateUserStatusDto } from '../../users/dto/admin-update-user-status.dto';
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

  @Patch(':cz_user_id/status')
  @ApiOperation({
    summary: 'Block (suspend/ban) or restore a user; takes effect on their next request (admin only)',
  })
  setStatus(
    @Param('cz_user_id') cz_user_id: string,
    @Body() body: AdminUpdateUserStatusDto,
  ) {
    return this.usersService.setStatusByAdmin(cz_user_id, body.status);
  }

  @Delete()
  @ApiOperation({
    summary:
      'Hard-delete a user by email or Telegram id, and every row that references them (admin only). Irreversible.',
  })
  remove(@Body() body: AdminDeleteUserDto) {
    return this.usersService.hardDelete(body);
  }
}
