import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { R2StorageExternal, type UploadedFile as CzFile } from '../../../external/r2-storage.external';
import { CreateDropdownTypeDto } from '../../dropdown/dto/create-dropdown-type.dto';
import { ListAdminDropdownOptionsDto } from '../../dropdown/dto/list-admin-dropdown-options.dto';
import { ListDropdownTypesDto } from '../../dropdown/dto/list-dropdown-types.dto';
import { UpdateDropdownTypeDto } from '../../dropdown/dto/update-dropdown-type.dto';
import { UpsertDropdownOptionDto } from '../../dropdown/dto/upsert-dropdown-option.dto';
import { DropdownService } from '../../dropdown/dropdown.service';

@ApiTags('admin-dropdown')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/dropdown')
export class AdminDropdownController {
  constructor(
    private readonly dropdownService: DropdownService,
    private readonly r2Storage: R2StorageExternal,
  ) {}

  @Get('types')
  @ApiOperation({ summary: 'Dropdown categories with their option counts, paginated (admin only)' })
  listTypes(@Query() query: ListDropdownTypesDto) {
    return this.dropdownService.listTypesAdmin(query);
  }

  @Post('types')
  @ApiOperation({ summary: 'Onboard a new dropdown category (admin only)' })
  createType(@Body() dto: CreateDropdownTypeDto) {
    return this.dropdownService.createType(dto);
  }

  @Patch('types/:id')
  @ApiOperation({ summary: 'Update a dropdown category (admin only)' })
  updateType(@Param('id') id: string, @Body() dto: UpdateDropdownTypeDto) {
    return this.dropdownService.updateType(id, dto);
  }

  @Get('options')
  @ApiOperation({ summary: 'Dropdown options, inactive included, paginated (admin only)' })
  listOptions(@Query() query: ListAdminDropdownOptionsDto) {
    return this.dropdownService.listAllAdmin(query);
  }

  @Post('options')
  @ApiOperation({ summary: 'Create a dropdown option (admin only)' })
  createOption(@Body() dto: UpsertDropdownOptionDto) {
    return this.dropdownService.create(dto);
  }

  @Patch('options/:id')
  @ApiOperation({ summary: 'Update a dropdown option (admin only)' })
  updateOption(@Param('id') id: string, @Body() dto: UpsertDropdownOptionDto) {
    return this.dropdownService.update(id, dto);
  }

  @Post('options/icon')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a dropdown option icon and get its public URL (admin only)' })
  async uploadIcon(@UploadedFile() file: CzFile) {
    const valid = this.r2Storage.validateImage(file);
    const url = await this.r2Storage.upload('dropdown-icons', valid);
    return { url };
  }
}
