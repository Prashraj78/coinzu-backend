import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/auth/request-user.types';
import { AdminWithdrawalFiltersDto } from '../../wallet/dto/admin-list-withdrawals.dto';
import {
  PayWithdrawalDto,
  RejectWithdrawalDto,
} from '../../wallet/dto/review-withdrawal.dto';
import { AdminWithdrawalsService } from '../services/admin-withdrawals.service';

@ApiTags('admin-withdrawals')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/withdrawals')
export class AdminWithdrawalsController {
  constructor(
    private readonly adminWithdrawalsService: AdminWithdrawalsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'USDT withdrawal queue with its users, filterable, newest first (admin only)',
  })
  list(@Query() query: AdminWithdrawalFiltersDto) {
    return this.adminWithdrawalsService.list(query);
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Pending, paid today/this month and rejected this month tiles (admin only)',
  })
  summary(@Query() query: AdminWithdrawalFiltersDto) {
    return this.adminWithdrawalsService.summary(query);
  }

  @Get(':cz_withdrawal_request_id')
  @ApiOperation({
    summary:
      'One withdrawal with balance, lifetime payouts and previous requests (admin only)',
  })
  detail(@Param('cz_withdrawal_request_id') id: string) {
    return this.adminWithdrawalsService.detail(id);
  }

  @Patch(':cz_withdrawal_request_id/pay')
  @ApiOperation({
    summary:
      'Mark a pending withdrawal paid with its on-chain tx hash (admin only)',
  })
  pay(
    @Param('cz_withdrawal_request_id') id: string,
    @Body() dto: PayWithdrawalDto,
    @CurrentUser() admin: RequestUser,
  ) {
    return this.adminWithdrawalsService.pay(id, dto, admin.cz_user_id);
  }

  @Patch(':cz_withdrawal_request_id/reject')
  @ApiOperation({
    summary: 'Reject a pending withdrawal and refund its coins (admin only)',
  })
  reject(
    @Param('cz_withdrawal_request_id') id: string,
    @Body() dto: RejectWithdrawalDto,
    @CurrentUser() admin: RequestUser,
  ) {
    return this.adminWithdrawalsService.reject(id, dto.note, admin.cz_user_id);
  }
}
