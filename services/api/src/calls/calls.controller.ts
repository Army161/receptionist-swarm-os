import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  list(
    @CurrentUser('orgId') orgId: string,
    @Query('location_id') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (locationId) {
      return this.callsService.findByLocation(
        locationId,
        from,
        to,
        limit ? parseInt(limit) : 50,
        offset ? parseInt(offset) : 0,
      );
    }
    return this.callsService.findByOrg(
      orgId,
      from,
      to,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.callsService.findById(id);
  }

  @Get(':id/transcript')
  getTranscript(@Param('id') id: string) {
    return this.callsService.getTranscript(id);
  }

  @Get(':id/tool-runs')
  getToolRuns(@Param('id') id: string) {
    return this.callsService.getToolRuns(id);
  }
}
