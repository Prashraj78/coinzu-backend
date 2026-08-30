import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminListTransactionsDto } from '../../wallet/dto/admin-list-transactions.dto';
import { AdminTransactionsService } from '../services/admin-transactions.service';

@ApiTags('admin-transactions')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/transactions')
export class AdminTransactionsController {
  constructor(
    private readonly adminTransactionsService: AdminTransactionsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Every wallet movement across all users, filterable (admin only)',
  })
  list(@Query() query: AdminListTransactionsDto) {
    return this.adminTransactionsService.list(query);
  }

  @Get(':cz_wallet_transaction_id')
  @ApiOperation({
    summary: 'One wallet movement with its user and the row that caused it (admin only)',
  })
  detail(@Param('cz_wallet_transaction_id') cz_wallet_transaction_id: string) {
    return this.adminTransactionsService.detail(cz_wallet_transaction_id);
  }
}
