import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiData } from '../../common/decorators/api-envelope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { OnboardingGoalDto } from './dto/onboarding-goal.dto';
import { OnboardingContactsDto } from './dto/onboarding-contacts.dto';
import { OnboardingInfoDto } from './dto/onboarding-info.dto';
import { OnboardingInterestsDto } from './dto/onboarding-interests.dto';
import { OnboardingPermissionsDto } from './dto/onboarding-permissions.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetAvatarDto } from './dto/set-avatar.dto';
import { TelegramLinkDto } from './dto/telegram-link.dto';
import { resolveDevicePlatform } from '../../common/utils/device-platform.util';
import { DeactivatedAccountDto, TelegramStatusDto, UserDto } from './dto/users.response';
import { UserDevicesService } from './user-devices.service';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userDevicesService: UserDevicesService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in user profile' })
  @ApiData(UserDto)
  me(@CurrentUser() user: RequestUser) {
    return this.usersService.getProfile(user.cz_user_id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the signed-in user profile' })
  @ApiData(UserDto)
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.cz_user_id, dto);
  }

  @Patch('me/avatar')
  @ApiOperation({ summary: 'Pick a library avatar, or switch back to the Google photo' })
  @ApiData(UserDto)
  setAvatar(@CurrentUser() user: RequestUser, @Body() dto: SetAvatarDto) {
    return this.usersService.setAvatar(user.cz_user_id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate my account (soft delete) — blocks sign-in, keeps data',
  })
  @ApiData(DeactivatedAccountDto)
  deactivateMe(@CurrentUser() user: RequestUser) {
    return this.usersService.deactivateSelf(user.cz_user_id);
  }

  @Post('me/onboarding/info')
  @ApiOperation({ summary: 'Account setup step 1 — name, gender, age (country is server-derived)' })
  onboardingInfo(
    @CurrentUser() user: RequestUser,
    @Body() dto: OnboardingInfoDto,
    @Req() req: Request,
  ) {
    return this.usersService.saveOnboardingInfo(user.cz_user_id, dto, req);
  }

  @Post('me/onboarding/permissions')
  @ApiOperation({ summary: 'Account setup step 2 — notification permission' })
  onboardingPermissions(
    @CurrentUser() user: RequestUser,
    @Body() dto: OnboardingPermissionsDto,
  ) {
    return this.usersService.saveOnboardingPermissions(user.cz_user_id, dto);
  }

  @Post('me/onboarding/interests')
  @ApiOperation({ summary: 'Account setup step 3 — interests' })
  onboardingInterests(
    @CurrentUser() user: RequestUser,
    @Body() dto: OnboardingInterestsDto,
  ) {
    return this.usersService.saveOnboardingInterests(user.cz_user_id, dto);
  }

  @Post('me/onboarding/goal')
  @ApiOperation({ summary: 'Account setup step 4 — goal, finishes onboarding' })
  onboardingGoal(
    @CurrentUser() user: RequestUser,
    @Body() dto: OnboardingGoalDto,
  ) {
    return this.usersService.saveOnboardingGoal(user.cz_user_id, dto);
  }

  @Post('me/onboarding/contacts')
  @ApiOperation({ summary: 'Web account setup — at least one chat handle, finishes onboarding' })
  onboardingContacts(
    @CurrentUser() user: RequestUser,
    @Body() dto: OnboardingContactsDto,
    @Req() req: Request,
  ) {
    return this.usersService.saveOnboardingContacts(user.cz_user_id, dto, req);
  }

  @Get('me/telegram/status')
  @ApiOperation({ summary: 'Web Telegram gate: whether the user must, and does, belong to the Coinzu channel' })
  @ApiData(TelegramStatusDto)
  telegramStatus(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.usersService.telegramStatus(user.cz_user_id, resolveDevicePlatform(undefined, req));
  }

  @Post('me/telegram/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connect a Telegram account (Telegram Login id_token) for the channel check' })
  @ApiData(TelegramStatusDto)
  linkTelegram(@CurrentUser() user: RequestUser, @Body() dto: TelegramLinkDto, @Req() req: Request) {
    return this.usersService.linkTelegram(user.cz_user_id, dto, resolveDevicePlatform(undefined, req), req);
  }

  @Patch('me/notification-preferences')
  @ApiOperation({
    summary: 'Turn push categories on or off, and set quiet hours opt-in',
  })
  updateNotificationPreferences(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(user.cz_user_id, dto);
  }

  @Post('me/device')
  @ApiOperation({
    summary: 'Register or refresh this device — fraud signals and push notification targeting',
  })
  registerDevice(
    @CurrentUser() user: RequestUser,
    @Body() dto: RegisterDeviceDto,
    @Req() req: Request,
  ) {
    return this.userDevicesService.registerDevice(user.cz_user_id, dto, req);
  }
}
