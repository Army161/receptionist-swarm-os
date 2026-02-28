import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AgentPacksService } from './agent-packs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString, IsNumber } from 'class-validator';

class RollbackDto {
  @IsString()
  locationId: string;

  @IsNumber()
  targetVersion: number;
}

@Controller('agent-packs')
@UseGuards(JwtAuthGuard)
export class AgentPacksController {
  constructor(private readonly agentPacksService: AgentPacksService) {}

  @Get('current')
  getCurrent(@Query('location_id') locationId: string) {
    return this.agentPacksService.getCurrent(locationId);
  }

  @Get('list')
  list(@Query('location_id') locationId: string) {
    return this.agentPacksService.findByLocation(locationId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.agentPacksService.findById(id);
  }

  @Post('rollback')
  rollback(@Body() dto: RollbackDto) {
    return this.agentPacksService.rollback(dto.locationId, dto.targetVersion);
  }
}
