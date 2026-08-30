import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DropdownOption } from '../../database/entities/dropdown-option.entity';
import { DropdownType } from '../../database/entities/dropdown-type.entity';
import { DropdownController } from './dropdown.controller';
import { DropdownService } from './dropdown.service';

@Module({
  imports: [TypeOrmModule.forFeature([DropdownOption, DropdownType])],
  controllers: [DropdownController],
  providers: [DropdownService],
  exports: [DropdownService],
})
export class DropdownModule {}
