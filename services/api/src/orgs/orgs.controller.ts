import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { OrgsService } from './orgs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';

class UpdateOrgDto {
  @IsString()
  @IsOptional()
  name?: string;
}

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Get('current')
  getCurrent(@CurrentUser('orgId') orgId: string) {
    return this.orgsService.findById(orgId);
  }

  @Put('current')
  updateCurrent(@CurrentUser('orgId') orgId: string, @Body() dto: UpdateOrgDto) {
    return this.orgsService.update(orgId, dto);
  }
}
