import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../../database/entities/support-ticket.entity';
import {
  CzCommonErrorCodes,
  CzSupportErrorCodes,
} from '../../common/errors/error.constants';
import { toSkipTake } from '../../common/utils/pagination.util';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly tickets: Repository<SupportTicket>,
  ) {}

  async createTicket(user_id: string, dto: CreateTicketDto) {
    // The Feedback screen's stars are its main input, so a rating is required there.
    if (dto.type === 'feedback' && dto.rating === undefined) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: 'rating is required when type is "feedback".',
      });
    }

    const ticket = this.tickets.create({
      user_id,
      type: dto.type,
      category: dto.category ?? null,
      issue_type: dto.issue_type ?? null,
      occurred_at: dto.occurred_at ? new Date(dto.occurred_at) : null,
      affected_area: dto.affected_area ?? null,
      subject: dto.subject ?? null,
      description: dto.description,
      rating: dto.rating ?? null,
      attachment_urls: dto.attachment_urls ?? [],
      status: 'open',
      // The thread starts with what the user wrote; admin turns append later.
      messages: [
        {
          from: 'user',
          body: dto.description,
          author_id: user_id,
          created_at: new Date().toISOString(),
        },
      ],
    });
    return this.tickets.save(ticket);
  }

  async listForUser(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.tickets.findAndCount({
      where: { user_id },
      order: { created_at: 'DESC' },
      skip,
      take,
    });
    return { data, total };
  }

  async getForUser(user_id: string, ticket_id: string) {
    const ticket = await this.tickets.findOne({
      where: { cz_support_ticket_id: ticket_id, user_id },
    });
    if (!ticket) {
      throw new NotFoundException({
        cz_error_code: CzSupportErrorCodes.TICKET_NOT_FOUND,
      });
    }
    return ticket;
  }

}
