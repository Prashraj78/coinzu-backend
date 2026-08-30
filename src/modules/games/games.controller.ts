import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { AnswerQuizDto } from './dto/answer-quiz.dto';
import { SpinService } from './spin.service';
import { QuizService } from './quiz.service';
import { ScratchService } from './scratch.service';

@ApiTags('games')
@ApiBearerAuth()
@Controller('games')
export class GamesController {
  constructor(
    private readonly spinService: SpinService,
    private readonly quizService: QuizService,
    private readonly scratchService: ScratchService,
  ) {}

  @Get('spin')
  @ApiOperation({ summary: 'Wheel segments and my remaining spins' })
  getWheel(@CurrentUser() user: RequestUser) {
    return this.spinService.getWheel(user.cz_user_id);
  }

  @Post('spin')
  @ApiOperation({ summary: 'Spin the wheel once' })
  spin(@CurrentUser() user: RequestUser) {
    return this.spinService.spin(user.cz_user_id);
  }

  @Get('spin/history')
  @ApiOperation({ summary: 'My past spins' })
  spinHistory(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.spinService.listHistory(user.cz_user_id, query.page, query.limit);
  }

  @Get('quiz')
  @ApiOperation({ summary: "Today's quiz question" })
  getQuiz(@CurrentUser() user: RequestUser) {
    return this.quizService.getToday(user.cz_user_id);
  }

  @Post('quiz/:id/answer')
  @ApiOperation({ summary: 'Answer a quiz question' })
  answerQuiz(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AnswerQuizDto,
  ) {
    return this.quizService.answer(user.cz_user_id, id, dto.selected_option);
  }

  @Get('quiz/history')
  @ApiOperation({ summary: 'My past quiz attempts' })
  quizHistory(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.quizService.listHistory(user.cz_user_id, query.page, query.limit);
  }

  @Get('scratch')
  @ApiOperation({ summary: 'How many scratch cards I have left today' })
  scratchStatus(@CurrentUser() user: RequestUser) {
    return this.scratchService.getStatus(user.cz_user_id);
  }

  @Post('scratch')
  @ApiOperation({ summary: 'Scratch one card' })
  scratch(@CurrentUser() user: RequestUser) {
    return this.scratchService.scratch(user.cz_user_id);
  }

  @Get('scratch/history')
  @ApiOperation({ summary: 'My past scratch cards' })
  scratchHistory(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.scratchService.listHistory(user.cz_user_id, query.page, query.limit);
  }
}
