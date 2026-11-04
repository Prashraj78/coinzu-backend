import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GiftCardExternal } from '../../../external/gift-card.external';
import { RedeemService } from '../../redeem/redeem.service';
import { AdminToggleProductDto } from '../../redeem/dto/admin-toggle-product.dto';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

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
  @ApiOperation({ summary: 'Gift-card vendors available to select (admin only)' })
  async vendors() {
    return {
      active: await this.giftCard.activeVendorName(),
      available: this.giftCard.availableVendors(),
    };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Pull the latest catalogue from the active vendor now (admin only)' })
  sync() {
    return this.redeemService.syncCatalog();
  }

  @Get('products')
  @ApiOperation({ summary: 'Every gift-card product, active or not, paginated (admin only)' })
  products(@Query() query: ListQueryDto) {
    return this.redeemService.listAdminProducts(query.page, query.limit);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Show or hide a product from the store (admin only)' })
  toggle(@Param('id') id: string, @Body() dto: AdminToggleProductDto) {
    return this.redeemService.setProductActive(id, dto.is_active);
  }
}
