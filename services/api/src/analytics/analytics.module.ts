import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CallEntity } from '../database/entities/call.entity';
import { ToolRunEntity } from '../database/entities/tool-run.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CallEntity, ToolRunEntity])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
