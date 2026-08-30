import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListFaqsDto } from './dto/list-faqs.dto';
import { SupportService } from './support.service';
import { FaqService } from './faq.service';

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly faqService: FaqService,
  ) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Raise a support ticket, problem report, or feedback' })
  createTicket(@CurrentUser() user: RequestUser, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(user.cz_user_id, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'My tickets' })
  listTickets(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.supportService.listForUser(user.cz_user_id, query.page, query.limit);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get one of my tickets' })
  getTicket(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.supportService.getForUser(user.cz_user_id, id);
  }


  @Public()
  @Get('faqs')
  @ApiOperation({
    summary: 'Every FAQ with its categories, optionally filtered to one category. Public.',
  })
  listFaqs(@Query() query: ListFaqsDto) {
    return this.faqService.listFaqs(query);
  }

}
