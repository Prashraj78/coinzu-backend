import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { R2StorageExternal, type UploadedFile as CzFile } from '../../external/r2-storage.external';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly r2Storage: R2StorageExternal) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an avatar image and get its public URL' })
  async uploadAvatar(@UploadedFile() file: CzFile) {
    const valid = this.r2Storage.validateImage(file);
    const url = await this.r2Storage.upload('avatars', valid);
    return { url };
  }
}
