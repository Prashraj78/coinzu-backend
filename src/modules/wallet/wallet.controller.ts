import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { resolveDevicePlatform } from '../../common/utils/device-platform.util';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ApiData, ApiList } from '../../common/decorators/api-envelope.decorator';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { RatesQueryDto } from './dto/rates-query.dto';
import {
  WalletBalanceDto,
  WalletDto,
  WalletRatesDto,
  WalletTransactionDto,
  WithdrawalDto,
  WithdrawalFormDto,
} from './dto/wallet.response';
import { WalletService } from './wallet.service';
import { WithdrawalService } from './withdrawal.service';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly withdrawalService: WithdrawalService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Coin and gem balances with their cash/coin value and live rates',
  })
  @ApiData(WalletBalanceDto)
  getBalance(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.walletService.getBalanceSummary(
      user.cz_user_id,
      resolveDevicePlatform(undefined, req),
    );
  }

  @Get('rates')
  @ApiOperation({
    summary:
      'Coin, gem, convert and withdrawal rate definitions, with an optional exact preview',
  })
  @ApiData(WalletRatesDto)
  getRates(@Query() query: RatesQueryDto, @Req() req: Request) {
    return this.walletService.getRates(
      resolveDevicePlatform(undefined, req),
      query.gem_amount,
      query.coin_amount,
    );
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List wallet transactions, newest first' })
  @ApiList(WalletTransactionDto)
  listTransactions(
    @CurrentUser() user: RequestUser,
    @Query() query: ListQueryDto,
  ) {
    return this.walletService.listTransactions(
      user.cz_user_id,
      query.page,
      query.limit,
    );
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert coins to gems or gems to coins' })
  @ApiData(WalletDto, 201)
  convert(@CurrentUser() user: RequestUser, @Body() dto: ConvertCurrencyDto) {
    return this.walletService.convert(
      user.cz_user_id,
      dto.from_currency,
      dto.amount,
    );
  }

  @Get('withdrawals/form')
  @ApiOperation({ summary: 'Everything the web withdraw page needs: balance, rates, fee, eligibility, last address' })
  @ApiData(WithdrawalFormDto)
  withdrawalForm(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.withdrawalService.form(user.cz_user_id, resolveDevicePlatform(undefined, req));
  }

  @Post('withdrawals')
  @ApiOperation({ summary: 'Request a USDT payout of coins (web only)' })
  @ApiData(WithdrawalDto, 201)
  createWithdrawal(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWithdrawalDto,
    @Req() req: Request,
  ) {
    return this.withdrawalService.create(
      user.cz_user_id,
      dto,
      resolveDevicePlatform(undefined, req),
    );
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'List my withdrawal requests' })
  @ApiList(WithdrawalDto)
  listWithdrawals(
    @CurrentUser() user: RequestUser,
    @Query() query: ListQueryDto,
  ) {
    return this.withdrawalService.listForUser(
      user.cz_user_id,
      query.page,
      query.limit,
    );
  }
}
