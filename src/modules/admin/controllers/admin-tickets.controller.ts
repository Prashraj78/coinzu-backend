import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminListTicketsDto } from '../../support/dto/admin-list-tickets.dto';
import { AdminTicketsService } from '../services/admin-tickets.service';

@ApiTags('admin-tickets')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly adminTicketsService: AdminTicketsService) {}

  @Get()
  @ApiOperation({
    summary: 'Every problem report and support ticket with its user, filterable (admin only)',
  })
  list(@Query() query: AdminListTicketsDto) {
    return this.adminTicketsService.list(query);
  }

  @Get(':cz_support_ticket_id')
  @ApiOperation({
    summary: 'One ticket with its user and the full message thread (admin only)',
  })
  detail(@Param('cz_support_ticket_id') cz_support_ticket_id: string) {
    return this.adminTicketsService.detail(cz_support_ticket_id);
  }
}
