import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallEntity } from '../database/entities/call.entity';
import { CallTranscriptEntity } from '../database/entities/call-transcript.entity';
import { ToolRunEntity } from '../database/entities/tool-run.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CallEntity, CallTranscriptEntity, ToolRunEntity])],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
