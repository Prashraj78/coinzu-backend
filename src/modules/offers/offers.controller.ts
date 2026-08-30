import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ListOffersDto } from './dto/list-offers.dto';
import { OffersService } from './offers.service';
import { PostbackService } from './postback.service';

@ApiTags('offers')
@ApiBearerAuth()
@Controller('offers')
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly postbackService: PostbackService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List live offers available to me' })
  list(@CurrentUser() user: RequestUser, @Query() query: ListOffersDto) {
    return this.offersService.listForUser(user.cz_user_id, query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List the categories that currently have offers' })
  async categories() {
    const data = await this.offersService.listCategories();
    return { data, total: data.length };
  }

  @Get('mine')
  @ApiOperation({ summary: 'Offers I started, with their reward status' })
  mine(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.offersService.listMyOffers(
      user.cz_user_id,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one offer' })
  getOne(@Param('id') id: string) {
    return this.offersService.getOrFail(id);
  }

  @Post(':id/click')
  @ApiOperation({ summary: 'Start an offer and get its tracking URL' })
  click(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.offersService.click(
      user.cz_user_id,
      id,
      req.ip ?? null,
      req.headers['user-agent'] ?? null,
    );
  }

  @Public()
  @Get('postback/:provider_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider reward webhook (GET). Public.' })
  postbackGet(
    @Param('provider_id') provider_id: string,
    @Query() query: Record<string, string>,
  ) {
    return this.postbackService.handle(provider_id, query);
  }

  @Public()
  @Post('postback/:provider_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider reward webhook (POST). Public.' })
  postbackPost(
    @Param('provider_id') provider_id: string,
    @Body() body: Record<string, string>,
  ) {
    return this.postbackService.handle(provider_id, body);
  }
}
