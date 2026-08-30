import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  DailyDashboardDto,
  ListQuizzesDto,
  RepeatQuizDto,
  SaveScratchCardsDto,
  SaveSpinWheelDto,
  UpdateChallengeDto,
  UpdateDailyConfigDto,
  UpsertQuizDto,
} from '../../daily/dto/admin-daily.dto';
import {
  R2StorageExternal,
  type UploadedFile as CzFile,
} from '../../../external/r2-storage.external';
import { AdminDailyService } from '../services/admin-daily.service';
import { AdminDailyDashboardService } from '../services/admin-daily-dashboard.service';

@ApiTags('admin-daily')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/daily')
export class AdminDailyController {
  constructor(
    private readonly service: AdminDailyService,
    private readonly dashboard: AdminDailyDashboardService,
    private readonly r2Storage: R2StorageExternal,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Where the daily rewards went, and how much, over a date range (admin only)',
  })
  getDashboard(@Query() query: DailyDashboardDto) {
    return this.dashboard.overview(query);
  }

  @Get('challenges')
  @ApiOperation({
    summary: 'The daily challenge tiles, the master chest, and recent activity (admin only)',
  })
  overview() {
    return this.service.overview();
  }

  @Patch('config')
  @ApiOperation({
    summary: 'Sets the master chest reward and the scratch allowance (admin only)',
  })
  updateConfig(@Body() dto: UpdateDailyConfigDto) {
    return this.service.updateConfig(dto);
  }

  @Patch('challenges/:cz_daily_challenge_id')
  @ApiOperation({ summary: 'Edit one challenge tile (admin only)' })
  updateChallenge(
    @Param('cz_daily_challenge_id') id: string,
    @Body() dto: UpdateChallengeDto,
  ) {
    return this.service.updateChallenge(id, dto);
  }

  @Get('spin-wheel')
  @ApiOperation({ summary: 'Wheel segments with their real odds (admin only)' })
  getWheel() {
    return this.service.getWheel();
  }

  @Put('spin-wheel')
  @ApiOperation({ summary: 'Replaces the whole wheel in one transaction (admin only)' })
  saveWheel(@Body() dto: SaveSpinWheelDto) {
    return this.service.saveWheel(dto);
  }

  @Get('scratch-cards')
  @ApiOperation({ summary: 'Scratch prizes with their real odds (admin only)' })
  getScratch() {
    return this.service.getScratch();
  }

  @Put('scratch-cards')
  @ApiOperation({ summary: 'Replaces the whole prize pool in one transaction (admin only)' })
  saveScratch(@Body() dto: SaveScratchCardsDto) {
    return this.service.saveScratch(dto);
  }

  @Get('quizzes')
  @ApiOperation({
    summary: 'The quiz schedule, with attempts and any unfilled days (admin only)',
  })
  listQuizzes(@Query() query: ListQuizzesDto) {
    return this.service.listQuizzes(query);
  }

  @Post('quizzes')
  @ApiOperation({
    summary: 'Schedules a quiz for a date, replacing any already on it (admin only)',
  })
  upsertQuiz(@Body() dto: UpsertQuizDto) {
    return this.service.upsertQuiz(dto);
  }

  @Post('quizzes/:cz_quiz_id/repeat')
  @ApiOperation({ summary: 'Copies a quiz onto another day (admin only)' })
  repeatQuiz(@Param('cz_quiz_id') id: string, @Body() dto: RepeatQuizDto) {
    return this.service.repeatQuiz(id, dto);
  }

  @Post('quizzes/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploads a quiz image and returns its public URL (admin only)' })
  async uploadQuizImage(@UploadedFile() file: CzFile) {
    const valid = this.r2Storage.validateImage(file);
    const url = await this.r2Storage.upload('quiz-images', valid);
    return { url };
  }

  @Delete('quizzes/:cz_quiz_id')
  @ApiOperation({ summary: 'Removes a scheduled quiz (admin only)' })
  deleteQuiz(@Param('cz_quiz_id') id: string) {
    return this.service.deleteQuiz(id);
  }
}
