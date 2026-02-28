import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwarmRouterService } from './swarm-router.service';
import { QueueEntity } from '../database/entities/queue.entity';
import { BillingPlanEntity } from '../database/entities/billing-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QueueEntity, BillingPlanEntity])],
  providers: [SwarmRouterService],
  exports: [SwarmRouterService],
})
export class SwarmRouterModule {}
