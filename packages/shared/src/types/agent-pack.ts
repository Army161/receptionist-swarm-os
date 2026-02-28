// ── AgentPack Types ──────────────────────────────────

export interface AgentPack {
  id: string;
  orgId: string;
  locationId: string;
  version: number;
  status: AgentPackStatus;
  config: AgentPackConfig;
  createdAt: Date;
}

export enum AgentPackStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DEPLOYED = 'deployed',
  ARCHIVED = 'archived',
}

export interface AgentPackConfig {
  persona: PersonaConfig;
  flows: FlowConfig;
  tools: ToolPermission[];
  kb: KBConfig;
  verifiedAnswerPolicy: VerifiedAnswerPolicy;
  escalationMatrix: EscalationRule[];
  afterHoursRules: AfterHoursConfig;
  languages: string[];
  emergencyDisclaimers: string[];
  industry: string;
}

export interface PersonaConfig {
  name: string;
  tone: string; // e.g. 'professional', 'friendly', 'casual'
  brandVoice: string;
  greetingTemplate: string;
  recordingDisclosure?: string;
}

export interface FlowConfig {
  states: FlowState[];
  transitions: FlowTransition[];
}

export interface FlowState {
  id: string;
  name: string;
  type: FlowStateType;
  prompts: string[];
  collectFields?: string[];
  toolCalls?: string[];
}

export enum FlowStateType {
  GREETING = 'greeting',
  INTENT_DETECTION = 'intent_detection',
  BOOKING = 'booking',
  LEAD_CAPTURE = 'lead_capture',
  FAQ = 'faq',
  TRANSFER = 'transfer',
  WRAPUP = 'wrapup',
  END = 'end',
}

export interface FlowTransition {
  from: string;
  to: string;
  condition: string;
}

export interface ToolPermission {
  toolName: string;
  permissionLevel: 'auto' | 'confirm' | 'human_approval';
  enabled: boolean;
}

export interface KBConfig {
  retrievalTopK: number;
  similarityThreshold: number;
  fallbackToSearch: boolean;
}

export interface VerifiedAnswerPolicy {
  requireCitation: boolean;
  allowWebSearch: boolean;
  unknownBehavior: 'escalate' | 'take_message' | 'transfer';
}

export interface EscalationRule {
  trigger: string;
  action: 'transfer' | 'take_message' | 'emergency';
  targetNumber?: string;
  priority: number;
}

export interface AfterHoursConfig {
  behavior: 'take_message' | 'callback' | 'emergency_transfer' | 'voicemail';
  callbackEnabled: boolean;
  emergencyNumber?: string;
  message?: string;
}

// ── 5-Question Confirm ──────────────────────────────

export interface FiveQuestionAnswers {
  topCallGoals: string[];        // Q1: top 3 call goals
  afterHoursBehavior: string;    // Q2: after-hours behavior
  pricingDisclosure: string;     // Q3: pricing disclosure rules
  transferTargets: TransferTarget[]; // Q4: who/when to transfer
  complianceDisclosures: string[]; // Q5: recording, consent, etc.
}

export interface TransferTarget {
  name: string;
  number: string;
  department?: string;
  availableHours?: string;
}

// ── Onboarding Scan Results ─────────────────────────

export interface ScanResults {
  services: string[];
  hours: Record<string, { open: string; close: string } | null>;
  faqs: FAQ[];
  policies: string[];
  address?: string;
  phone?: string;
  industry?: string;
  pricingInfo?: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}
