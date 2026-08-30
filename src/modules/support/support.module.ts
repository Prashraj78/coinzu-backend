import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from '../../database/entities/support-ticket.entity';
import { Faq } from '../../database/entities/faq.entity';
import { FaqCategory } from '../../database/entities/faq-category.entity';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { FaqService } from './faq.service';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, Faq, FaqCategory])],
  controllers: [SupportController],
  providers: [SupportService, FaqService],
  exports: [SupportService, FaqService],
})
export class SupportModule {}
