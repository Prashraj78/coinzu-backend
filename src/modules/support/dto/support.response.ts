import { ApiProperty } from '@nestjs/swagger';

export class FaqDto {
  @ApiProperty({ format: 'uuid' })
  cz_faq_id: string;

  @ApiProperty({ format: 'uuid' })
  category_id: string;

  @ApiProperty({ example: 'How long do withdrawals take?' })
  question: string;

  @ApiProperty({ example: 'Most withdrawals settle within 48 hours.' })
  answer: string;

  @ApiProperty({ example: 1 })
  display_order: number;

  @ApiProperty({ example: true })
  is_active: boolean;
}

export class FaqCategoryDto {
  @ApiProperty({ format: 'uuid' })
  cz_faq_category_id: string;

  @ApiProperty({ example: 'payment' })
  slug: string;

  @ApiProperty({ example: 'Payment' })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: null })
  icon: string | null;

  @ApiProperty({ example: 1 })
  display_order: number;

  @ApiProperty({ example: true })
  is_active: boolean;
}

export class FaqListDto {
  @ApiProperty({ type: [FaqDto] })
  data: FaqDto[];

  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ type: [FaqCategoryDto] })
  categories: FaqCategoryDto[];
}

export class TicketMessageDto {
  @ApiProperty({ enum: ['user', 'admin'] })
  from: 'user' | 'admin';

  @ApiProperty({ example: 'I completed the offer yesterday but got no coins.' })
  body: string;

  @ApiProperty()
  author_id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: string;
}

export class SupportTicketDto {
  @ApiProperty({ format: 'uuid' })
  cz_support_ticket_id: string;

  @ApiProperty({ format: 'uuid' })
  user_id: string;

  @ApiProperty({ enum: ['email_support', 'report_problem', 'feedback'] })
  type: 'email_support' | 'report_problem' | 'feedback';

  @ApiProperty({ type: String, nullable: true, example: 'Withdrawals' })
  category: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Coins not credited' })
  issue_type: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  occurred_at: Date | null;

  @ApiProperty({ type: String, nullable: true })
  affected_area: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Coins missing after offer' })
  subject: string | null;

  @ApiProperty({ example: 'I completed the offer yesterday but got no coins.' })
  description: string;

  @ApiProperty({ type: Number, nullable: true, example: null })
  rating: number | null;

  @ApiProperty({ type: [String] })
  attachment_urls: string[];

  @ApiProperty({ enum: ['open', 'in_progress', 'resolved'] })
  status: 'open' | 'in_progress' | 'resolved';

  @ApiProperty({ type: String, nullable: true, example: null })
  admin_response: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  resolved_by: string | null;

  @ApiProperty({ type: [TicketMessageDto] })
  messages: TicketMessageDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;
}
