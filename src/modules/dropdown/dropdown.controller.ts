import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ListDropdownDto } from './dto/list-dropdown.dto';
import { DropdownService } from './dropdown.service';
import { ApiGrouped } from '../../common/decorators/api-envelope.decorator';
import { DropdownOptionDto } from './dto/dropdown.response';

@ApiTags('dropdown')
@Controller('dropdown')
export class DropdownController {
  constructor(private readonly dropdownService: DropdownService) {}

  @Public()
  @Get()
  @ApiGrouped(DropdownOptionDto)
  @ApiOperation({ summary: 'Master dropdown options (gender, interest, and more), grouped by type' })
  list(@Query() query: ListDropdownDto) {
    const types = query.types
      ?.split(',')
      .map((type) => type.trim())
      .filter(Boolean);
    return this.dropdownService.listGrouped(types);
  }
}
