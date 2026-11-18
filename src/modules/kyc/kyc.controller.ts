import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { resolveDevicePlatform } from '../../common/utils/device-platform.util';
import type { RequestUser } from '../../common/auth/request-user.types';
import type { UploadedFile as StoredFile } from '../../external/r2-storage.external';
import { ApiData } from '../../common/decorators/api-envelope.decorator';
import { KycResultDto } from './dto/kyc.response';
import { KycService } from './kyc.service';

@ApiTags('kyc')
@ApiBearerAuth()
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('verify')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary:
      'Submit a selfie and get the whole decision back. The only KYC call the app makes.' })
  @ApiData(KycResultDto, 201)
  submitSelfie(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: StoredFile,
    @Req() req: Request,
  ) {
    return this.kycService.submitSelfie(user.cz_user_id, file, resolveDevicePlatform(undefined, req));
  }

}
