import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { OfferwallService } from './offerwall.service';
import { OfferwallPostbackService } from './offerwall-postback.service';

@ApiTags('offerwall')
@ApiBearerAuth()
@Controller('offerwall')
export class OfferwallController {
  constructor(
    private readonly offerwallService: OfferwallService,
    private readonly postbackService: OfferwallPostbackService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Active offerwalls, ranked, each with my user id in its URL' })
  list(@CurrentUser() user: RequestUser) {
    return this.offerwallService.listForUser(user.cz_user_id);
  }

  @Public()
  @Get('postback/:slug/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Partner's reward webhook (GET). Public." })
  postbackGet(
    @Param('slug') slug: string,
    @Param('token') token: string,
    @Query() query: Record<string, string>,
  ) {
    return this.postbackService.handle(slug, token, query);
  }

  @Public()
  @Post('postback/:slug/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Partner's reward webhook (POST). Public." })
  postbackPost(
    @Param('slug') slug: string,
    @Param('token') token: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.postbackService.handle(slug, token, body);
  }
}
