import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './orgs/orgs.module';
import { LocationsModule } from './locations/locations.module';
import { AgentPacksModule } from './agent-packs/agent-packs.module';
import { CallsModule } from './calls/calls.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SwarmRouterModule } from './swarm-router/swarm-router.module';
import { ToolsModule } from './tools/tools.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ProvidersModule } from './providers/providers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/receptionist_swarm'),
        entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    OrgsModule,
    LocationsModule,
    AgentPacksModule,
    CallsModule,
    OnboardingModule,
    WebhooksModule,
    SwarmRouterModule,
    ToolsModule,
    AnalyticsModule,
    ProvidersModule,
  ],
})
export class AppModule {}
