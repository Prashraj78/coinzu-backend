import { ApiProperty } from '@nestjs/swagger';

export class KycResultDto {
  @ApiProperty({ format: 'uuid' })
  cz_kyc_verification_id: string;

  @ApiProperty({ enum: ['verified', 'manual_review', 'rejected'], description: 'Same as status, named to match GET /api/users/me.' })
  kyc_status: string;

  @ApiProperty({ enum: ['verified', 'manual_review', 'rejected'] })
  status: string;

  @ApiProperty({ type: String, nullable: true, example: 'CZDKYC004', description: 'Set only on an automatic rejection.' })
  reason_code: string | null;

  @ApiProperty({ example: 'Your identity is verified. Withdrawals are unlocked.' })
  message: string;

  @ApiProperty()
  selfie_url: string;

  @ApiProperty({ description: 'Whether another selfie may be submitted.' })
  can_retry: boolean;

  @ApiProperty({ description: 'True only once verified.' })
  is_final: boolean;

  @ApiProperty()
  submitted_at: Date;
}
