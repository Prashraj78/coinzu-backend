import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { OnboardingGoalDto } from './dto/onboarding-goal.dto';
import { OnboardingInfoDto } from './dto/onboarding-info.dto';
import { OnboardingInterestsDto } from './dto/onboarding-interests.dto';
import { OnboardingPermissionsDto } from './dto/onboarding-permissions.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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
  me(@CurrentUser() user: RequestUser) {
    return this.usersService.getOrFail(user.cz_user_id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the signed-in user profile' })
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.cz_user_id, dto);
  }

  @Post('me/onboarding/info')
  @ApiOperation({ summary: 'Account setup step 1 — name, gender, age, country' })
  onboardingInfo(
    @CurrentUser() user: RequestUser,
    @Body() dto: OnboardingInfoDto,
  ) {
    return this.usersService.saveOnboardingInfo(user.cz_user_id, dto);
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
