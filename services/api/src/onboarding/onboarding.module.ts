import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { CrawlerService } from './crawler.service';
import { ExtractorService } from './extractor.service';
import { FlowGeneratorService } from './flow-generator.service';
import { AgentPacksModule } from '../agent-packs/agent-packs.module';
import { LocationsModule } from '../locations/locations.module';
import { KnowledgeDocEntity } from '../database/entities/knowledge-doc.entity';
import { KnowledgeChunkEntity } from '../database/entities/knowledge-chunk.entity';
import { PhoneNumberEntity } from '../database/entities/phone-number.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeDocEntity, KnowledgeChunkEntity, PhoneNumberEntity]),
    AgentPacksModule,
    LocationsModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, CrawlerService, ExtractorService, FlowGeneratorService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
