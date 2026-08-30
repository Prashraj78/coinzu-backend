import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CreateReferralRuleDto } from '../../referrals/dto/create-referral-rule.dto';
import { UpdateReferralRuleDto } from '../../referrals/dto/update-referral-rule.dto';
import { ReferralRulesService } from '../../referrals/referral-rules.service';

@ApiTags('admin-referral-rules')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/referral-rules')
export class AdminReferralRulesController {
  constructor(private readonly rulesService: ReferralRulesService) {}

  @Get()
  @ApiOperation({
    summary: 'The referral reward ladder plus every available trigger (admin only)',
  })
  list() {
    return this.rulesService.listAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Add a rule for a trigger that has none yet (admin only)' })
  create(@Body() dto: CreateReferralRuleDto) {
    return this.rulesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rule’s reward, threshold or active state (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateReferralRuleDto) {
    return this.rulesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a rule from the ladder (admin only)' })
  remove(@Param('id') id: string) {
    return this.rulesService.remove(id);
  }
}
