import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * VoiceProviderAdapter — currently Retell, swappable to Twilio+OpenAI Realtime.
 */

export interface InboundCallContext {
  callId: string;
  callerNumber: string;
  calledNumber: string;
  orgId: string;
  locationId: string;
  agentPackConfig: Record<string, any>;
}

export interface SessionHandle {
  sessionId: string;
  providerSessionId: string;
  metadata: Record<string, any>;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  error?: string;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly apiKey: string;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('RETELL_API_KEY', '');
    this.isMock = !this.apiKey;
    if (this.isMock) {
      this.logger.warn('RETELL_API_KEY not set — using mock voice provider');
    }
  }

  get providerName(): string {
    return this.isMock ? 'mock' : 'retell';
  }

  async startInboundSession(context: InboundCallContext): Promise<SessionHandle> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Starting inbound session for call ${context.callId}`);
      return {
        sessionId: `mock_session_${Date.now()}`,
        providerSessionId: `mock_provider_${Date.now()}`,
        metadata: { mock: true, callId: context.callId },
      };
    }

    // Real Retell implementation
    try {
      const response = await axios.post(
        'https://api.retellai.com/v2/create-web-call',
        {
          agent_id: context.agentPackConfig.retellAgentId,
          metadata: {
            callId: context.callId,
            orgId: context.orgId,
            locationId: context.locationId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        sessionId: response.data.call_id,
        providerSessionId: response.data.call_id,
        metadata: response.data,
      };
    } catch (err: any) {
      this.logger.error('Failed to start Retell session', err.message);
      throw err;
    }
  }

  async transferCall(callId: string, targetNumber: string, mode: string): Promise<TransferResult> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Transferring call ${callId} to ${targetNumber} (${mode})`);
      return { success: true, transferId: `mock_transfer_${Date.now()}` };
    }

    // Real Retell transfer
    try {
      const response = await axios.post(
        `https://api.retellai.com/v2/call/${callId}/transfer`,
        {
          transfer_number: targetNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return { success: true, transferId: response.data.transfer_id };
    } catch (err: any) {
      this.logger.error('Failed to transfer call via Retell', err.message);
      return { success: false, error: err.message };
    }
  }

  async endSession(sessionId: string): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Ending session ${sessionId}`);
      return;
    }

    try {
      await axios.post(
        `https://api.retellai.com/v2/call/${sessionId}/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err: any) {
      this.logger.error('Failed to end Retell session', err.message);
    }
  }

  validateWebhook(headers: Record<string, string>, body: string): boolean {
    const webhookSecret = this.config.get('RETELL_WEBHOOK_SECRET', '');
    if (!webhookSecret) {
      this.logger.warn('RETELL_WEBHOOK_SECRET not set — skipping validation');
      return true;
    }
    // TODO: Implement proper Retell webhook signature validation
    return true;
  }
}
