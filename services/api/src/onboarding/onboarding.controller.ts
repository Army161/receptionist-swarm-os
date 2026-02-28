import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class StartOnboardingDto {
  @IsString()
  locationId: string;

  @IsString()
  websiteUrl: string;
}

class TransferTargetDto {
  @IsString()
  name: string;

  @IsString()
  number: string;

  @IsString()
  @IsOptional()
  department?: string;
}

class ConfirmOnboardingDto {
  @IsString()
  agentPackId: string;

  @IsArray()
  @IsOptional()
  topCallGoals?: string[];

  @IsString()
  @IsOptional()
  afterHoursBehavior?: string;

  @IsString()
  @IsOptional()
  pricingDisclosure?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferTargetDto)
  @IsOptional()
  transferTargets?: TransferTargetDto[];

  @IsArray()
  @IsOptional()
  complianceDisclosures?: string[];
}

class DeployOnboardingDto {
  @IsString()
  agentPackId: string;

  @IsString()
  locationId: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('start')
  start(@CurrentUser('orgId') orgId: string, @Body() dto: StartOnboardingDto) {
    return this.onboardingService.startOnboarding(orgId, dto.locationId, dto.websiteUrl);
  }

  @Post('confirm')
  confirm(@Body() dto: ConfirmOnboardingDto) {
    return this.onboardingService.confirmOnboarding(dto.agentPackId, {
      topCallGoals: dto.topCallGoals,
      afterHoursBehavior: dto.afterHoursBehavior,
      pricingDisclosure: dto.pricingDisclosure,
      transferTargets: dto.transferTargets,
      complianceDisclosures: dto.complianceDisclosures,
    });
  }

  @Post('deploy')
  deploy(@Body() dto: DeployOnboardingDto) {
    return this.onboardingService.deployOnboarding(dto.agentPackId, dto.locationId, dto.phoneNumber);
  }
}
