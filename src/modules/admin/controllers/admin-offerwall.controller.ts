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
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { R2StorageExternal, type UploadedFile as CzFile } from '../../../external/r2-storage.external';
import { CreateOfferwallPartnerDto } from '../../offerwall/dto/create-offerwall-partner.dto';
import { UpdateOfferwallPartnerDto } from '../../offerwall/dto/update-offerwall-partner.dto';
import { ListOfferwallPostbacksDto } from '../../offerwall/dto/list-offerwall-postbacks.dto';
import { OfferwallPartnersService } from '../../offerwall/offerwall-partners.service';
import { OfferwallPostbackService } from '../../offerwall/offerwall-postback.service';

@ApiTags('admin-offerwall')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/offerwall')
export class AdminOfferwallController {
  constructor(
    private readonly partnersService: OfferwallPartnersService,
    private readonly postbackService: OfferwallPostbackService,
    private readonly r2Storage: R2StorageExternal,
  ) {}

  @Get('partners')
  @ApiOperation({ summary: 'Every offerwall partner, inactive included, paginated (admin only)' })
  listPartners(@Query() query: ListQueryDto) {
    return this.partnersService.listAllAdmin(query.page, query.limit);
  }

  @Post('partners/logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an offerwall partner logo and get its public URL (admin only)' })
  async uploadLogo(@UploadedFile() file: CzFile) {
    const valid = this.r2Storage.validateImage(file);
    const url = await this.r2Storage.upload('offerwall-logos', valid);
    return { url };
  }

  @Post('partners')
  @ApiOperation({ summary: 'Onboard a new offerwall partner (admin only)' })
  createPartner(@Body() dto: CreateOfferwallPartnerDto) {
    return this.partnersService.create(dto);
  }

  @Patch('partners/:id')
  @ApiOperation({ summary: 'Update rank, badge, URL template or any other partner field (admin only)' })
  updatePartner(@Param('id') id: string, @Body() dto: UpdateOfferwallPartnerDto) {
    return this.partnersService.update(id, dto);
  }

  @Get('partners/:id/postback-url')
  @ApiOperation({ summary: 'The full postback URL to hand this partner (admin only)' })
  getPostbackUrl(@Param('id') id: string) {
    return this.partnersService.getPostbackUrl(id);
  }

  @Get('postbacks')
  @ApiOperation({ summary: 'Postback audit log, newest first, filterable by partner and status (admin only)' })
  listPostbacks(@Query() query: ListOfferwallPostbacksDto) {
    return this.postbackService.listForAdmin(query);
  }
}
