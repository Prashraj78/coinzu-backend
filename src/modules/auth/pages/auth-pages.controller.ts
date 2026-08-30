import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { PasswordResetService } from '../password-reset.service';
import { AuthPagesService } from './auth-pages.service';

/** Serves the branded HTML pages opened from transactional emails — raw HTML, not the JSON envelope. */
@ApiExcludeController()
@Controller('auth')
export class AuthPagesController {
  constructor(
    private readonly pages: AuthPagesService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Public()
  @Get('email/verify')
  verifyEmailPage(@Query('token') token: string | string[] | undefined, @Res() res: Response): void {
    const html = this.pages.renderVerifyEmailPage(this.asSingle(token));
    res.type('html').send(html);
  }

  @Public()
  @Get('password/reset')
  async resetPasswordPage(
    @Query('token') token: string | string[] | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const single = this.asSingle(token);
    const valid = single ? await this.passwordResetService.tokenIsValid(single) : false;
    const html = this.pages.renderResetPasswordPage(single, valid);
    res.type('html').send(html);
  }

  private asSingle(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
