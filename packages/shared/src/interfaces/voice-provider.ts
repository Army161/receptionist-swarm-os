// ── Voice Provider Adapter Interface ─────────────────

export interface VoiceProviderAdapter {
  readonly providerName: string;

  /** Start a new inbound call session */
  startInboundSession(context: InboundCallContext): Promise<SessionHandle>;

  /** Send audio chunk to the session */
  sendAudio(sessionHandle: string, chunk: Buffer): Promise<void>;

  /** Receive audio chunk from the session */
  receiveAudio(sessionHandle: string): Promise<Buffer | null>;

  /** Transfer call to another number */
  transferCall(callId: string, target: string, mode: TransferMode): Promise<TransferResult>;

  /** End the session */
  endSession(sessionHandle: string): Promise<void>;

  /** Validate webhook signature */
  validateWebhook(headers: Record<string, string>, body: string): boolean;
}

export interface InboundCallContext {
  callId: string;
  callerNumber: string;
  calledNumber: string;
  orgId: string;
  locationId: string;
  agentPackConfig: Record<string, unknown>;
}

export interface SessionHandle {
  sessionId: string;
  providerSessionId: string;
  metadata: Record<string, unknown>;
}

export type TransferMode = 'cold' | 'warm' | 'conference_intro';

export interface TransferResult {
  success: boolean;
  transferId?: string;
  error?: string;
}
