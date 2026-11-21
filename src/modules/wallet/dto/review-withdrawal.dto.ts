import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class PayWithdrawalDto {
  @ApiProperty({
    example:
      '0x3f1c8a5e9b2d4c6f8a1b3d5e7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a',
    description:
      'On-chain hash of the USDT transfer. Checked against the withdrawal network format.',
  })
  @IsString()
  @MaxLength(100)
  tx_hash: string;

  @ApiPropertyOptional({ example: 'Sent from treasury wallet #2.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectWithdrawalDto {
  @ApiProperty({
    example:
      'The wallet address belongs to an exchange that does not accept TRC20.',
    description: 'Shown to the user as the rejection reason.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}
