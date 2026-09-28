import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiList } from '../../common/decorators/api-envelope.decorator';
import { AvatarsService } from './avatars.service';
import { AvatarDto } from './dto/avatar.response';

@ApiTags('avatars')
@ApiBearerAuth()
@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Get()
  @ApiOperation({ summary: 'Avatars the user can pick for their profile picture' })
  @ApiList(AvatarDto)
  list() {
    return this.avatarsService.listActive();
  }
}
