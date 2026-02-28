import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlerService } from './crawler.service';
import { ExtractorService } from './extractor.service';
import { FlowGeneratorService } from './flow-generator.service';
import { AgentPacksService } from '../agent-packs/agent-packs.service';
import { LocationsService } from '../locations/locations.service';
import { KnowledgeDocEntity } from '../database/entities/knowledge-doc.entity';
import { KnowledgeChunkEntity } from '../database/entities/knowledge-chunk.entity';
import { PhoneNumberEntity } from '../database/entities/phone-number.entity';

const DEFAULT_FIVE_QUESTIONS = [
  {
    id: 'q1_call_goals',
    text: 'What are your top 3 call goals? (Select up to 3)',
    type: 'multi_select',
    options: ['Book appointments', 'Capture leads / request quotes', 'Answer FAQs (hours, location, services)', 'Transfer to human staff', 'Take messages', 'Schedule callbacks'],
    required: true,
  },
  {
    id: 'q2_after_hours',
    text: 'What should happen when someone calls after business hours?',
    type: 'single_select',
    options: ['Take a message and email it to me', 'Offer to schedule a callback', 'Transfer to emergency/on-call number', 'Play voicemail greeting'],
    required: true,
  },
  {
    id: 'q3_pricing',
    text: 'Can the AI share pricing information with callers?',
    type: 'single_select',
    options: ['Yes, share exact prices from our price list', 'Yes, but only price ranges', 'No, ask them to request a quote', 'No, transfer to staff for pricing questions'],
    required: true,
  },
  {
    id: 'q4_transfer_targets',
    text: 'Who should calls be transferred to when needed? (Add at least one contact)',
    type: 'transfer_targets',
    required: true,
  },
  {
    id: 'q5_compliance',
    text: 'Which compliance disclosures should the AI make? (Select all that apply)',
    type: 'multi_select',
    options: ['This call may be recorded', 'You are speaking with an AI assistant', 'We do not provide medical/legal advice', 'None required'],
    required: true,
  },
];

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(KnowledgeDocEntity)
    private readonly knowledgeDocRepo: Repository<KnowledgeDocEntity>,
    @InjectRepository(KnowledgeChunkEntity)
    private readonly knowledgeChunkRepo: Repository<KnowledgeChunkEntity>,
    @InjectRepository(PhoneNumberEntity)
    private readonly phoneNumberRepo: Repository<PhoneNumberEntity>,
    private readonly crawlerService: CrawlerService,
    private readonly extractorService: ExtractorService,
    private readonly flowGeneratorService: FlowGeneratorService,
    private readonly agentPacksService: AgentPacksService,
    private readonly locationsService: LocationsService,
  ) {}

  async startOnboarding(orgId: string, locationId: string, websiteUrl: string) {
    this.logger.log(`Starting onboarding for org=${orgId} location=${locationId} url=${websiteUrl}`);

    // Step B — Crawl website
    const crawlResults = await this.crawlerService.crawl(websiteUrl, 5);

    // Store as knowledge docs
    for (const result of crawlResults) {
      const doc = this.knowledgeDocRepo.create({
        orgId,
        locationId,
        sourceType: 'website',
        sourceUrl: result.url,
        title: result.title,
        rawText: result.text,
      });
      const savedDoc = await this.knowledgeDocRepo.save(doc);

      // Create chunks (simple splitting for MVP)
      const chunks = this.chunkText(result.text, 500, 50);
      for (const chunkText of chunks) {
        const chunk = this.knowledgeChunkRepo.create({
          docId: savedDoc.id,
          chunkText,
          metadataJson: { sourceUrl: result.url, title: result.title },
        });
        await this.knowledgeChunkRepo.save(chunk);
      }
    }

    // Step C — Extract + classify
    const extractedData = this.extractorService.extract(crawlResults);

    // Update location with extracted hours
    if (Object.keys(extractedData.hours).length > 0) {
      await this.locationsService.update(locationId, { hoursJson: extractedData.hours });
    }
    if (extractedData.address) {
      await this.locationsService.update(locationId, { address: extractedData.address });
    }

    // Step D — Generate draft AgentPack
    const location = await this.locationsService.findById(locationId);
    const draftConfig = this.flowGeneratorService.generate(extractedData, location.name);

    // Store as draft AgentPack
    const agentPack = await this.agentPacksService.createDraft(orgId, locationId, draftConfig as any);

    return {
      draftAgentPackId: agentPack.id,
      scanResults: extractedData,
      draftConfig,
      questions: DEFAULT_FIVE_QUESTIONS,
    };
  }

  async confirmOnboarding(
    agentPackId: string,
    answers: {
      topCallGoals?: string[];
      afterHoursBehavior?: string;
      pricingDisclosure?: string;
      transferTargets?: { name: string; number: string; department?: string }[];
      complianceDisclosures?: string[];
    },
  ) {
    const agentPack = await this.agentPacksService.findById(agentPackId);
    const config = { ...agentPack.configJson } as any;

    // Apply 5Q answers to config
    if (answers.afterHoursBehavior) {
      const behaviorMap: Record<string, string> = {
        'Take a message and email it to me': 'take_message',
        'Offer to schedule a callback': 'callback',
        'Transfer to emergency/on-call number': 'emergency_transfer',
        'Play voicemail greeting': 'voicemail',
      };
      config.afterHoursRules.behavior = behaviorMap[answers.afterHoursBehavior] || 'take_message';
    }

    if (answers.pricingDisclosure) {
      if (answers.pricingDisclosure.includes('No')) {
        config.verifiedAnswerPolicy.unknownBehavior = 'transfer';
      }
    }

    if (answers.transferTargets && answers.transferTargets.length > 0) {
      config.escalationMatrix = config.escalationMatrix.map((rule: any) => ({
        ...rule,
        targetNumber: answers.transferTargets![0].number,
      }));
    }

    if (answers.complianceDisclosures) {
      if (answers.complianceDisclosures.includes('This call may be recorded')) {
        config.persona.recordingDisclosure = 'This call may be recorded for quality assurance purposes.';
      }
      if (answers.complianceDisclosures.includes('You are speaking with an AI assistant')) {
        config.persona.greetingTemplate = config.persona.greetingTemplate.replace(
          'How can I help you today?',
          "You're speaking with an AI assistant. How can I help you today?",
        );
      }
    }

    // Confirm the agent pack
    const confirmed = await this.agentPacksService.confirm(agentPackId, config);
    return {
      agentPackId: confirmed.id,
      version: confirmed.version,
      status: confirmed.status,
      config: confirmed.configJson,
    };
  }

  async deployOnboarding(agentPackId: string, locationId: string, phoneNumber?: string) {
    // Deploy the agent pack
    const deployed = await this.agentPacksService.deploy(agentPackId);
    const location = await this.locationsService.findById(locationId);

    // Create phone number record if provided
    if (phoneNumber) {
      const pn = this.phoneNumberRepo.create({
        orgId: location.orgId,
        locationId,
        e164: phoneNumber,
        provider: 'retell',
        routingMode: 'call_forwarding',
      });
      await this.phoneNumberRepo.save(pn);
    }

    return {
      success: true,
      agentPackId: deployed.id,
      version: deployed.version,
      phoneNumber: phoneNumber || 'Not assigned — configure call forwarding',
      forwardingInstructions: `Forward your main business line to the assigned AI number. The AI receptionist for "${location.name}" is now live with AgentPack v${deployed.version}.`,
      dashboardUrl: `/dashboard?location=${locationId}`,
    };
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.substring(start, end));
      start += chunkSize - overlap;
    }
    return chunks;
  }
}
