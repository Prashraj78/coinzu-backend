import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { CzGameErrorCodes } from '../../common/errors/error.constants';
import { todayDate } from '../../common/utils/date.util';
import { toSkipTake } from '../../common/utils/pagination.util';
import { WalletService } from '../wallet/wallet.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ChallengesService } from '../daily/challenges.service';
import { ScratchCardGrant } from '../../database/entities/scratch-card-grant.entity';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizzes: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private readonly attempts: Repository<QuizAttempt>,
    private readonly walletService: WalletService,
    private readonly achievementsService: AchievementsService,
    private readonly challengesService: ChallengesService,
    @InjectRepository(ScratchCardGrant)
    private readonly grants: Repository<ScratchCardGrant>,
  ) {}

  /** Today's quiz. The answer is never included in the response. */
  async getToday(user_id: string) {
    const quiz = await this.quizzes.findOne({
      where: { date: todayDate(), is_active: true },
    });
    if (!quiz) {
      throw new NotFoundException({
        cz_error_code: CzGameErrorCodes.QUIZ_NOT_AVAILABLE,
      });
    }

    const attempt = await this.attempts.findOne({
      where: { user_id, quiz_id: quiz.cz_quiz_id },
    });

    return {
      cz_quiz_id: quiz.cz_quiz_id,
      date: quiz.date,
      question: quiz.question,
      options: quiz.options,
      image_url: quiz.image_url,
      already_attempted: Boolean(attempt),
      my_attempt: attempt
        ? {
            cz_quiz_attempt_id: attempt.cz_quiz_attempt_id,
            selected_option: attempt.selected_option,
            is_correct: attempt.is_correct,
            attempted_at: attempt.attempted_at,
          }
        : null,
    };
  }

  async answer(user_id: string, quiz_id: string, selected_option: string) {
    const quiz = await this.quizzes
      .createQueryBuilder('q')
      .addSelect('q.correct_option')
      .where('q.cz_quiz_id = :quiz_id', { quiz_id })
      .andWhere('q.is_active = true')
      .getOne();

    if (!quiz) {
      throw new NotFoundException({
        cz_error_code: CzGameErrorCodes.QUIZ_NOT_AVAILABLE,
      });
    }
    if (!quiz.options.includes(selected_option)) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.QUIZ_OPTION_INVALID,
      });
    }

    const existing = await this.attempts.findOne({
      where: { user_id, quiz_id },
    });
    if (existing) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.QUIZ_ALREADY_ATTEMPTED,
      });
    }

    const is_correct = selected_option === quiz.correct_option;

    const saved = await this.attempts.save(
      this.attempts.create({ user_id, quiz_id, selected_option, is_correct }),
    );

    // The card is the whole prize: a right answer pays no coins and no gems.
    if (is_correct) {
      await this.grants.save(
        this.grants.create({ user_id, date: todayDate(), source: 'quiz' }),
      );
    }

    await Promise.all([
      this.challengesService.markCompleted(user_id, 'quiz'),
      this.achievementsService.trackProgress(user_id, 'play_quiz'),
    ]);

    return {
      cz_quiz_attempt_id: saved.cz_quiz_attempt_id,
      is_correct,
      correct_option: quiz.correct_option,
      /** A right answer wins one scratch card. That is the only prize. */
      scratch_card_granted: is_correct,
    };
  }

  async listHistory(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.attempts.findAndCount({
      where: { user_id },
      order: { attempted_at: 'DESC' },
      skip,
      take,
    });
    return { data, total };
  }
}
