import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { RedeemService } from './redeem.service';
import { ApiData, ApiList } from '../../common/decorators/api-envelope.decorator';
import {
  GiftCardCodeDto,
  GiftCardOrderDto,
  GiftCardProductDto,
} from './dto/redeem.response';

@ApiTags('redeem')
@ApiBearerAuth()
@Controller('redeem')
export class RedeemController {
  constructor(private readonly redeemService: RedeemService) {}

  @Get('products')
  @ApiOperation({ summary: 'Browse the gift card catalog' })
  @ApiList(GiftCardProductDto)
  listProducts(@Query() query: ListProductsDto) {
    return this.redeemService.listProducts(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Gift card categories that currently have products' })
  @ApiList('string')
  async categories() {
    const data = await this.redeemService.listCategories();
    return { data, total: data.length };
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get one gift card product' })
  @ApiData(GiftCardProductDto)
  getProduct(@Param('id') id: string) {
    return this.redeemService.getProductOrFail(id);
  }

  @Post('products/:id/order')
  @ApiOperation({ summary: 'Spend coins on a gift card' })
  @ApiData(GiftCardOrderDto, 201)
  order(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.redeemService.order(user.cz_user_id, id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'My gift card orders' })
  @ApiList(GiftCardOrderDto)
  listOrders(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.redeemService.listOrders(user.cz_user_id, query.page, query.limit);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get one of my orders' })
  @ApiData(GiftCardOrderDto)
  getOrder(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.redeemService.getOrder(user.cz_user_id, id);
  }

  @Get('orders/:id/code')
  @ApiOperation({ summary: 'Reveal the gift card code for a fulfilled order' })
  @ApiData(GiftCardCodeDto)
  revealCode(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.redeemService.revealCode(user.cz_user_id, id);
  }
}
