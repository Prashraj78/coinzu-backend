import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiData, ApiList } from '../../../common/decorators/api-envelope.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { R2StorageExternal, type UploadedFile as CzFile } from '../../../external/r2-storage.external';
import { AvatarsService } from '../../avatars/avatars.service';
import { AdminAvatarDto, AvatarDeletedDto, AvatarImageDto } from '../../avatars/dto/avatar.response';
import { CreateAvatarDto } from '../../avatars/dto/create-avatar.dto';
import { ListAdminAvatarsDto } from '../../avatars/dto/list-admin-avatars.dto';
import { UpdateAvatarDto } from '../../avatars/dto/update-avatar.dto';

@ApiTags('admin-avatars')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/avatars')
export class AdminAvatarsController {
  constructor(
    private readonly avatarsService: AvatarsService,
    private readonly r2Storage: R2StorageExternal,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Avatar library, hidden ones included, paginated (admin only)' })
  @ApiList(AdminAvatarDto)
  list(@Query() query: ListAdminAvatarsDto) {
    return this.avatarsService.listAdmin(query);
  }

  @Post()
  @ApiOperation({ summary: 'Add an avatar to the library (admin only)' })
  @ApiData(AdminAvatarDto, 201)
  create(@Body() dto: CreateAvatarDto) {
    return this.avatarsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename, reorder, replace or hide an avatar (admin only)' })
  @ApiData(AdminAvatarDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAvatarDto) {
    return this.avatarsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an avatar from the library (admin only)' })
  @ApiData(AvatarDeletedDto)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.avatarsService.remove(id);
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an avatar image and get its public URL (admin only)' })
  @ApiData(AvatarImageDto, 201)
  async uploadImage(@UploadedFile() file: CzFile) {
    const valid = this.r2Storage.validateImage(file);
    const url = await this.r2Storage.upload('avatar-library', valid);
    return { url };
  }
}
