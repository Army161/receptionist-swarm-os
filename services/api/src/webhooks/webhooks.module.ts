import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { CallSessionService } from './call-session.service';
import { CallsModule } from '../calls/calls.module';
import { AgentPacksModule } from '../agent-packs/agent-packs.module';
import { SwarmRouterModule } from '../swarm-router/swarm-router.module';
import { ToolsModule } from '../tools/tools.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [CallsModule, AgentPacksModule, SwarmRouterModule, ToolsModule, ProvidersModule],
  controllers: [WebhooksController],
  providers: [CallSessionService],
})
export class WebhooksModule {}
