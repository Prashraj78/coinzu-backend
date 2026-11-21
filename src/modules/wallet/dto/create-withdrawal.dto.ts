import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, MaxLength, Min } from 'class-validator';
import {
  USDT_NETWORKS,
  type UsdtNetwork,
} from '../../../database/entities/withdrawal-request.entity';

export class CreateWithdrawalDto {
  @ApiProperty({
    example: 10000,
    description: 'Coins to withdraw. Up to the whole coin balance.',
  })
  @IsInt()
  @Min(1)
  amount_coins: number;

  @ApiProperty({ example: 'TRC20', enum: USDT_NETWORKS })
  @IsIn(USDT_NETWORKS)
  network: UsdtNetwork;

  @ApiProperty({
    example: 'TXYZabcdefghijkmnopqrstuvwxyz12345',
    description:
      'USDT address on the chosen network. Checked against the network format.',
  })
  @IsString()
  @MaxLength(64)
  wallet_address: string;
}
