import { Injectable } from '@nestjs/common';
import { ExtractedData } from './extractor.service';

export interface GeneratedAgentPackConfig {
  persona: {
    name: string;
    tone: string;
    brandVoice: string;
    greetingTemplate: string;
    recordingDisclosure?: string;
  };
  flows: {
    states: FlowState[];
    transitions: FlowTransition[];
  };
  tools: ToolPermission[];
  kb: {
    retrievalTopK: number;
    similarityThreshold: number;
    fallbackToSearch: boolean;
  };
  verifiedAnswerPolicy: {
    requireCitation: boolean;
    allowWebSearch: boolean;
    unknownBehavior: string;
  };
  escalationMatrix: EscalationRule[];
  afterHoursRules: {
    behavior: string;
    callbackEnabled: boolean;
    emergencyNumber?: string;
    message?: string;
  };
  languages: string[];
  emergencyDisclaimers: string[];
  industry: string;
}

interface FlowState {
  id: string;
  name: string;
  type: string;
  prompts: string[];
  collectFields?: string[];
  toolCalls?: string[];
}

interface FlowTransition {
  from: string;
  to: string;
  condition: string;
}

interface ToolPermission {
  toolName: string;
  permissionLevel: string;
  enabled: boolean;
}

interface EscalationRule {
  trigger: string;
  action: string;
  targetNumber?: string;
  priority: number;
}

@Injectable()
export class FlowGeneratorService {
  generate(extractedData: ExtractedData, businessName: string): GeneratedAgentPackConfig {
    const industry = extractedData.industry || 'general';

    return {
      persona: this.generatePersona(businessName, industry),
      flows: this.generateFlows(industry, extractedData),
      tools: this.generateToolPermissions(industry),
      kb: {
        retrievalTopK: 5,
        similarityThreshold: 0.7,
        fallbackToSearch: true,
      },
      verifiedAnswerPolicy: {
        requireCitation: true,
        allowWebSearch: true,
        unknownBehavior: 'escalate',
      },
      escalationMatrix: this.generateEscalationMatrix(),
      afterHoursRules: {
        behavior: 'take_message',
        callbackEnabled: true,
        message: `Thank you for calling ${businessName}. We're currently closed. I can take a message or schedule a callback during business hours.`,
      },
      languages: ['en'],
      emergencyDisclaimers: this.getEmergencyDisclaimers(industry),
      industry,
    };
  }

  private generatePersona(businessName: string, industry: string) {
    const toneMap: Record<string, string> = {
      dental: 'warm and reassuring',
      med_spa: 'professional and luxurious',
      law_intake: 'professional and empathetic',
      hvac: 'friendly and helpful',
      restaurant: 'upbeat and welcoming',
      home_services: 'friendly and reliable',
      auto_repair: 'straightforward and trustworthy',
      real_estate: 'enthusiastic and knowledgeable',
      general: 'professional and friendly',
    };

    return {
      name: `${businessName} AI Receptionist`,
      tone: toneMap[industry] || toneMap.general,
      brandVoice: `You are the AI receptionist for ${businessName}. Be helpful, concise, and professional.`,
      greetingTemplate: `Thank you for calling ${businessName}! How can I help you today?`,
      recordingDisclosure: 'This call may be recorded for quality assurance purposes.',
    };
  }

  private generateFlows(industry: string, data: ExtractedData) {
    const states: FlowState[] = [
      {
        id: 'S0_GREETING',
        name: 'Greeting',
        type: 'greeting',
        prompts: ['Greet the caller warmly. If recording disclosure is required, state it.'],
      },
      {
        id: 'S1_INTENT',
        name: 'Intent Detection',
        type: 'intent_detection',
        prompts: ['Determine what the caller needs: appointment, quote, information, or transfer.'],
      },
      {
        id: 'S2_BOOKING',
        name: 'Booking',
        type: 'booking',
        prompts: ['Collect booking details and check availability.'],
        collectFields: ['name', 'phone', 'service', 'preferred_time', 'notes'],
        toolCalls: ['calendar_check_availability', 'calendar_book_appointment'],
      },
      {
        id: 'S3_LEAD_CAPTURE',
        name: 'Lead Capture',
        type: 'lead_capture',
        prompts: ['Capture lead information for quote or service request.'],
        collectFields: ['name', 'phone', 'email', 'service', 'urgency', 'address', 'notes'],
        toolCalls: ['crm_upsert_contact', 'crm_create_opportunity'],
      },
      {
        id: 'S4_FAQ',
        name: 'FAQ / Info',
        type: 'faq',
        prompts: [
          'Answer questions from knowledge base. If not found, search the web.',
          'If still unsure, say "I\'m not certain—let me connect you to someone who can help."',
        ],
        toolCalls: ['knowledge_query', 'search_web'],
      },
      {
        id: 'S5_TRANSFER',
        name: 'Transfer',
        type: 'transfer',
        prompts: ['Transfer the call to the appropriate person.'],
        toolCalls: ['transfer_call'],
      },
      {
        id: 'S6_WRAPUP',
        name: 'Wrapup',
        type: 'wrapup',
        prompts: ['Summarize what was done. Offer to send SMS recap. Thank the caller.'],
        toolCalls: ['sms_send'],
      },
      {
        id: 'S7_END',
        name: 'End',
        type: 'end',
        prompts: ['End the call politely.'],
      },
    ];

    const transitions: FlowTransition[] = [
      { from: 'S0_GREETING', to: 'S1_INTENT', condition: 'always' },
      { from: 'S1_INTENT', to: 'S2_BOOKING', condition: 'intent == booking' },
      { from: 'S1_INTENT', to: 'S3_LEAD_CAPTURE', condition: 'intent == quote || intent == lead' },
      { from: 'S1_INTENT', to: 'S4_FAQ', condition: 'intent == faq || intent == hours || intent == location' },
      { from: 'S1_INTENT', to: 'S5_TRANSFER', condition: 'intent == transfer || intent == speak_to_human' },
      { from: 'S2_BOOKING', to: 'S6_WRAPUP', condition: 'booking_complete' },
      { from: 'S2_BOOKING', to: 'S5_TRANSFER', condition: 'booking_failed || needs_human' },
      { from: 'S3_LEAD_CAPTURE', to: 'S6_WRAPUP', condition: 'lead_captured' },
      { from: 'S4_FAQ', to: 'S6_WRAPUP', condition: 'question_answered' },
      { from: 'S4_FAQ', to: 'S5_TRANSFER', condition: 'cannot_answer' },
      { from: 'S5_TRANSFER', to: 'S7_END', condition: 'transfer_complete' },
      { from: 'S6_WRAPUP', to: 'S7_END', condition: 'always' },
    ];

    return { states, transitions };
  }

  private generateToolPermissions(industry: string): ToolPermission[] {
    return [
      { toolName: 'calendar_check_availability', permissionLevel: 'auto', enabled: true },
      { toolName: 'calendar_book_appointment', permissionLevel: 'confirm', enabled: true },
      { toolName: 'crm_upsert_contact', permissionLevel: 'auto', enabled: true },
      { toolName: 'crm_create_opportunity', permissionLevel: 'auto', enabled: true },
      { toolName: 'sms_send', permissionLevel: 'auto', enabled: true },
      { toolName: 'search_web', permissionLevel: 'auto', enabled: true },
      { toolName: 'transfer_call', permissionLevel: 'auto', enabled: true },
      { toolName: 'knowledge_query', permissionLevel: 'auto', enabled: true },
      { toolName: 'create_ticket', permissionLevel: 'auto', enabled: false },
    ];
  }

  private generateEscalationMatrix(): EscalationRule[] {
    return [
      { trigger: 'emergency', action: 'transfer', priority: 1 },
      { trigger: 'angry_customer', action: 'transfer', priority: 2 },
      { trigger: 'legal_question', action: 'transfer', priority: 3 },
      { trigger: 'medical_advice', action: 'transfer', priority: 3 },
      { trigger: 'pricing_negotiation', action: 'transfer', priority: 4 },
      { trigger: 'complaint', action: 'take_message', priority: 5 },
    ];
  }

  private getEmergencyDisclaimers(industry: string): string[] {
    const disclaimers = ['If this is a life-threatening emergency, please hang up and call 911.'];

    if (industry === 'dental' || industry === 'med_spa') {
      disclaimers.push('This AI assistant cannot provide medical advice. Please consult a healthcare professional.');
    }
    if (industry === 'law_intake') {
      disclaimers.push('This AI assistant cannot provide legal advice. Information shared is not protected by attorney-client privilege.');
    }

    return disclaimers;
  }
}
