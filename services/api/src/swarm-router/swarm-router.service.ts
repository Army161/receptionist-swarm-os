import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueEntity } from '../database/entities/queue.entity';
import { BillingPlanEntity } from '../database/entities/billing-plan.entity';

export enum SwarmDecision {
  ACCEPT = 'accept',
  QUEUE = 'queue',
  CALLBACK = 'callback',
  OVERFLOW = 'overflow',
  REJECT = 'reject',
}

export interface SwarmRouterResult {
  decision: SwarmDecision;
  queuePosition?: number;
  estimatedWaitSeconds?: number;
  callbackScheduledAt?: Date;
  overflowTarget?: string;
}

const DEFAULT_CONCURRENCY_LIMIT = 2;
const MAX_QUEUE_SIZE = 10;

@Injectable()
export class SwarmRouterService {
  private readonly logger = new Logger(SwarmRouterService.name);

  constructor(
    @InjectRepository(QueueEntity)
    private readonly queueRepo: Repository<QueueEntity>,
    @InjectRepository(BillingPlanEntity)
    private readonly billingPlanRepo: Repository<BillingPlanEntity>,
  ) {}

  async routeCall(orgId: string, locationId: string): Promise<SwarmRouterResult> {
    // Get or create queue for this location
    let queue = await this.queueRepo.findOne({ where: { orgId, locationId } });
    if (!queue) {
      queue = this.queueRepo.create({ orgId, locationId, activeCount: 0, queuedCount: 0 });
      queue = await this.queueRepo.save(queue);
    }

    // Get concurrency limit from billing plan
    const billingPlan = await this.billingPlanRepo.findOne({ where: { orgId } });
    const concurrencyLimit = billingPlan?.concurrencyLimit || DEFAULT_CONCURRENCY_LIMIT;

    this.logger.log(
      `Routing call: org=${orgId} location=${locationId} active=${queue.activeCount}/${concurrencyLimit} queued=${queue.queuedCount}`,
    );

    // Decision logic
    if (queue.activeCount < concurrencyLimit) {
      // Accept: increment active count
      await this.queueRepo.update(queue.id, { activeCount: queue.activeCount + 1 });
      return { decision: SwarmDecision.ACCEPT };
    }

    if (queue.queuedCount < MAX_QUEUE_SIZE) {
      // Queue: increment queued count
      const newQueuedCount = queue.queuedCount + 1;
      await this.queueRepo.update(queue.id, { queuedCount: newQueuedCount });
      const estimatedWait = newQueuedCount * 120; // ~2 min per call estimate
      return {
        decision: SwarmDecision.QUEUE,
        queuePosition: newQueuedCount,
        estimatedWaitSeconds: estimatedWait,
      };
    }

    // TODO: Check for overflow targets in escalation matrix
    // For now, offer callback
    return {
      decision: SwarmDecision.CALLBACK,
      callbackScheduledAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
    };
  }

  async releaseCall(orgId: string, locationId: string): Promise<void> {
    const queue = await this.queueRepo.findOne({ where: { orgId, locationId } });
    if (queue && queue.activeCount > 0) {
      const newActive = queue.activeCount - 1;
      const updates: Partial<QueueEntity> = { activeCount: newActive };

      // If there are queued calls, promote one
      if (queue.queuedCount > 0) {
        updates.activeCount = newActive + 1;
        updates.queuedCount = queue.queuedCount - 1;
      }

      await this.queueRepo.update(queue.id, updates);
    }
  }

  async getQueueStatus(orgId: string, locationId: string) {
    const queue = await this.queueRepo.findOne({ where: { orgId, locationId } });
    const billingPlan = await this.billingPlanRepo.findOne({ where: { orgId } });

    return {
      activeCount: queue?.activeCount || 0,
      queuedCount: queue?.queuedCount || 0,
      concurrencyLimit: billingPlan?.concurrencyLimit || DEFAULT_CONCURRENCY_LIMIT,
    };
  }
}
