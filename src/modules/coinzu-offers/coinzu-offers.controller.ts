import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ApiData, ApiList } from '../../common/decorators/api-envelope.decorator';
import { ListInProgressDto } from './dto/list-in-progress.dto';
import { ListSectionDto } from './dto/list-section.dto';
import {
  CoinzuHomeResponseDto,
  CoinzuInProgressOfferResponseDto,
  CoinzuOfferResponseDto,
  CoinzuRedirectResponseDto,
  CoinzuSectionPageResponseDto,
} from './dto/coinzu-offers.response';
import { CoinzuOffersService } from './coinzu-offers.service';
import { RewardtymPostbackService } from './rewardtym-postback.service';

@ApiTags('rewardtym')
@ApiBearerAuth()
@Controller('rewardtym')
export class CoinzuOffersController {
  constructor(
    private readonly service: CoinzuOffersService,
    private readonly postbackService: RewardtymPostbackService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "RewardTym's signed completion webhook (credits coins/gems). Public.",
  })
  webhook(@Body() body: Record<string, unknown>) {
    return this.postbackService.handle(body);
  }

  @Get('home')
  @ApiOperation({ summary: 'RewardTym home sections for the current user.' })
  @ApiData(CoinzuHomeResponseDto)
  home(@CurrentUser() user: RequestUser) {
    return this.service.getHome(user.cz_user_id);
  }

  @Get('section')
  @ApiOperation({
    summary: 'One home section, paginated (10 at a time) for infinite scroll.',
  })
  @ApiData(CoinzuSectionPageResponseDto)
  section(@CurrentUser() user: RequestUser, @Query() query: ListSectionDto) {
    return this.service.getSection(
      user.cz_user_id,
      query.section,
      query.page,
      query.limit,
    );
  }

  @Get('in-progress')
  @ApiOperation({ summary: 'Offers the user has started, paginated.' })
  @ApiList(CoinzuInProgressOfferResponseDto)
  inProgress(
    @CurrentUser() user: RequestUser,
    @Query() query: ListInProgressDto,
  ) {
    return this.service.getInProgress(
      user.cz_user_id,
      query.page,
      query.limit,
    );
  }

  @Get('redirect/:offer_id')
  @ApiOperation({ summary: 'Final click/redirect URL with device context.' })
  @ApiData(CoinzuRedirectResponseDto)
  redirect(
    @CurrentUser() user: RequestUser,
    @Param('offer_id') offerId: string,
  ) {
    return this.service.getRedirectUrl(user.cz_user_id, offerId);
  }

  @Get('offers/:id')
  @ApiOperation({ summary: 'Full detail for one RewardTym offer.' })
  @ApiData(CoinzuOfferResponseDto)
  offer(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getOffer(user.cz_user_id, id);
  }
}
