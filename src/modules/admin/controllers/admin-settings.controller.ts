import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UpdateSettingsDto } from '../../settings/dto/update-settings.dto';
import { SettingsService } from '../../settings/settings.service';

@ApiTags('admin-settings')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Every tunable setting, grouped, with its value and bounds (admin only)',
  })
  list() {
    return this.settingsService.listAdmin();
  }

  @Patch()
  @ApiOperation({
    summary: 'Update one or more settings; nothing is written unless all pass (admin only)',
  })
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateMany(dto);
  }
}
