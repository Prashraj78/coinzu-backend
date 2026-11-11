import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Env } from '../../../common/config/env';
import { GiftCardExternal } from '../../../external/gift-card.external';
import { RedeemService } from '../../redeem/redeem.service';
import { AdminToggleProductDto } from '../../redeem/dto/admin-toggle-product.dto';
import { AdminListProductsDto } from '../../redeem/dto/admin-list-products.dto';

@ApiTags('admin-redeem')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/redeem')
export class AdminRedeemController {
  constructor(
    private readonly redeemService: RedeemService,
    private readonly giftCard: GiftCardExternal,
  ) {}

  @Get('vendors')
  @ApiOperation({
    summary:
      'Primary/secondary gift-card vendors, failover state and Phaze balance (admin only)',
  })
  async vendors() {
    const [plan, phaze_balance, catalogue] = await Promise.all([
      this.giftCard.plan(),
      this.giftCard.phazeAccountStatus(),
      this.redeemService.catalogueStats(),
    ]);
    return {
      active: plan.primary,
      primary: plan.primary,
      secondary: plan.secondary,
      failover: plan.failover,
      available: this.giftCard.availableVendors(),
      phaze_balance,
      catalogue,
    };
  }

  @Post('phaze/webhook')
  @ApiOperation({
    summary:
      'Register this backend as the Phaze order-status webhook (admin only)',
  })
  registerPhazeWebhook() {
    const url = `${Env.urls.api.replace(/\/$/, '')}/api/redeem/webhooks/phaze`;
    return this.giftCard.registerPhazeWebhook(url);
  }

  @Post('sync')
  @ApiOperation({
    summary:
      'Pull the latest catalogue from the primary and secondary vendors now (admin only)',
  })
  sync() {
    return this.redeemService.syncCatalog();
  }

  @Get('products')
  @ApiOperation({
    summary:
      'Gift-card products, filterable by brand/category/status, paginated (admin only)',
  })
  products(@Query() query: AdminListProductsDto) {
    return this.redeemService.listAdminProducts(query);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Distinct product categories, for the admin filter (admin only)',
  })
  categories() {
    return this.redeemService.listAdminCategories();
  }

  @Patch('products/:id')
  @ApiOperation({
    summary: 'Show or hide a product from the store (admin only)',
  })
  toggle(@Param('id') id: string, @Body() dto: AdminToggleProductDto) {
    return this.redeemService.setProductActive(id, dto.is_active);
  }
}
