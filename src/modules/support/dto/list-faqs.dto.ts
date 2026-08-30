import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Category is the only filter. Searching is done on the client, over the full list. */
export class ListFaqsDto {
  @ApiPropertyOptional({
    example: 'payment',
    description: "Category slug from GET /api/support/faq-categories. Omit for every FAQ.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @ApiPropertyOptional({
    example: '0f1b2c3d-4e5f-6789-abcd-ef0123456789',
    description: 'Same filter by id, for callers that already hold one.',
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;
}
