import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class ListOffersDto extends ListQueryDto {
  @ApiPropertyOptional({ example: 'games' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  category?: string;

  @ApiPropertyOptional({ example: 'android', enum: ['ios', 'android', 'web'] })
  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: string;

  @ApiPropertyOptional({ example: 'coin' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  search?: string;
}
