import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentPacksController } from './agent-packs.controller';
import { AgentPacksService } from './agent-packs.service';
import { AgentPackEntity } from '../database/entities/agent-pack.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgentPackEntity])],
  controllers: [AgentPacksController],
  providers: [AgentPacksService],
  exports: [AgentPacksService],
})
export class AgentPacksModule {}
