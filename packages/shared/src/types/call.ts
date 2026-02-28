// ── Call Types ────────────────────────────────────────

export interface Call {
  id: string;
  orgId: string;
  locationId: string;
  providerCallId: string;
  callerNumber: string;
  startedAt: Date;
  endedAt?: Date;
  outcome: CallOutcome;
  metricsJson: CallMetrics;
}

export enum CallOutcome {
  BOOKED = 'booked',
  LEAD_CAPTURED = 'lead_captured',
  FAQ_ANSWERED = 'faq_answered',
  TRANSFERRED = 'transferred',
  VOICEMAIL = 'voicemail',
  ABANDONED = 'abandoned',
  QUEUED_CALLBACK = 'queued_callback',
  ERROR = 'error',
}

export interface CallMetrics {
  durationSeconds: number;
  latencyP95Ms?: number;
  turnsCount: number;
  toolCallsCount: number;
  escalated: boolean;
  transferTarget?: string;
  intentDetected?: string;
}

export interface CallTranscript {
  id: string;
  callId: string;
  transcriptText: string;
  redactedText: string;
  structuredJson: TranscriptStructured;
}

export interface TranscriptStructured {
  turns: TranscriptTurn[];
  summary?: string;
  extractedFields?: Record<string, string>;
}

export interface TranscriptTurn {
  speaker: 'agent' | 'caller';
  text: string;
  timestamp: number;
  intent?: string;
  toolCall?: string;
}

export interface ToolRun {
  id: string;
  callId: string;
  toolName: string;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  status: 'success' | 'error' | 'pending' | 'skipped';
  createdAt: Date;
}

// ── State Machine Types ─────────────────────────────

export enum ConversationState {
  GREETING = 'S0_GREETING',
  INTENT_DETECTION = 'S1_INTENT',
  BOOKING = 'S2_BOOKING',
  LEAD_CAPTURE = 'S3_LEAD_CAPTURE',
  FAQ = 'S4_FAQ',
  TRANSFER = 'S5_TRANSFER',
  WRAPUP = 'S6_WRAPUP',
  END = 'S7_END',
}

export interface CallSessionContext {
  callId: string;
  orgId: string;
  locationId: string;
  agentPackVersion: number;
  currentState: ConversationState;
  collectedFields: Record<string, string>;
  toolResults: ToolRun[];
  turns: TranscriptTurn[];
  startedAt: Date;
}

// ── Swarm Router Types ──────────────────────────────

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
