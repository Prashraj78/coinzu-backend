import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SuperAdmin } from '../../../common/decorators/super-admin.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/auth/request-user.types';
import { AdminListKycDto } from '../../kyc/dto/admin-list-kyc.dto';
import { DecideKycDto } from '../../kyc/dto/decide-kyc.dto';
import { AdminKycService } from '../services/admin-kyc.service';

@ApiTags('admin-kyc')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/kyc')
export class AdminKycController {
  constructor(private readonly adminKycService: AdminKycService) {}

  @Get()
  @ApiOperation({
    summary: 'Every KYC attempt with its user, filterable, plus outcome counts (admin only)',
  })
  list(@Query() query: AdminListKycDto) {
    return this.adminKycService.list(query);
  }

  @Get(':cz_kyc_verification_id')
  @ApiOperation({
    summary: "One attempt with the user and their full attempt history (admin only)",
  })
  detail(@Param('cz_kyc_verification_id') cz_kyc_verification_id: string) {
    return this.adminKycService.detail(cz_kyc_verification_id);
  }

  @Post(':cz_kyc_verification_id/decision')
  @SuperAdmin()
  @ApiOperation({
    summary: 'Approve or reject an attempt awaiting review (super admin only)',
  })
  decide(
    @Param('cz_kyc_verification_id') cz_kyc_verification_id: string,
    @Body() dto: DecideKycDto,
    @CurrentUser() admin: RequestUser,
  ) {
    return this.adminKycService.decide(
      cz_kyc_verification_id,
      dto,
      admin.cz_user_id,
    );
  }
}
