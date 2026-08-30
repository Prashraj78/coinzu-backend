import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const KYC_DECISIONS = ['approve', 'reject'] as const;

/** A super admin's verdict on an attempt the face check could not settle. */
export class DecideKycDto {
  @ApiProperty({ enum: KYC_DECISIONS })
  @IsIn(KYC_DECISIONS)
  decision: (typeof KYC_DECISIONS)[number];

  @ApiPropertyOptional({
    example: 'Face does not match the document on file.',
    description:
      'Shown to the user on a rejection. A default is used when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
