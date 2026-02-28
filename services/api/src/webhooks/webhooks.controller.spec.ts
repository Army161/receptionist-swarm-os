import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { CallSessionService } from './call-session.service';
import { VoiceService } from '../providers/voice/voice.service';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  const mockCallSessionService = {
    handleInboundCall: jest.fn(),
    handleCallEnd: jest.fn(),
    handleToolCall: jest.fn(),
  };
  const mockVoiceService = {
    validateWebhook: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: CallSessionService, useValue: mockCallSessionService },
        { provide: VoiceService, useValue: mockVoiceService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    jest.clearAllMocks();
  });

  describe('retellInbound', () => {
    it('should handle an inbound call and return session info', async () => {
      mockCallSessionService.handleInboundCall.mockResolvedValue({
        accepted: true,
        callId: 'call-123',
        sessionId: 'session-456',
        agentPackVersion: 1,
      });

      const result = await controller.retellInbound({}, {
        call_id: 'retell-call-1',
        from_number: '+15125551234',
        to_number: '+15125555678',
        metadata: { orgId: 'org-1', locationId: 'loc-1' },
      });

      expect(result.accepted).toBe(true);
      expect(result.callId).toBe('call-123');
      expect(mockCallSessionService.handleInboundCall).toHaveBeenCalledWith({
        callId: 'retell-call-1',
        callerNumber: '+15125551234',
        calledNumber: '+15125555678',
        orgId: 'org-1',
        locationId: 'loc-1',
        retellCallId: 'retell-call-1',
      });
    });

    it('should handle missing metadata gracefully', async () => {
      mockCallSessionService.handleInboundCall.mockResolvedValue({
        accepted: false,
        error: 'No AgentPack deployed',
      });

      const result = await controller.retellInbound({}, {
        call_id: 'retell-call-2',
      });

      expect(result.accepted).toBe(false);
    });
  });

  describe('retellEvents', () => {
    it('should handle call_started event', async () => {
      const result = await controller.retellEvents({}, {
        event: 'call_started',
        call_id: 'retell-call-1',
      });

      expect(result.status).toBe('ok');
    });

    it('should handle call_ended event and update call record', async () => {
      mockCallSessionService.handleCallEnd.mockResolvedValue(undefined);

      const result = await controller.retellEvents({}, {
        event: 'call_ended',
        call_id: 'retell-call-1',
        metadata: { orgId: 'org-1', locationId: 'loc-1' },
        transcript: 'Hello, how can I help?',
        duration_ms: 120000,
        disconnection_reason: 'agent_hangup',
      });

      expect(result.status).toBe('ok');
      expect(mockCallSessionService.handleCallEnd).toHaveBeenCalledWith(
        'retell-call-1',
        'org-1',
        'loc-1',
        {
          transcript: 'Hello, how can I help?',
          outcome: 'faq_answered',
          duration: 120,
          disconnectionReason: 'agent_hangup',
        },
      );
    });

    it('should handle tool_call event and return tool result', async () => {
      mockCallSessionService.handleToolCall.mockResolvedValue({
        toolName: 'calendar_check_availability',
        status: 'success',
        output: { available: true },
      });

      const result = await controller.retellEvents({}, {
        event: 'tool_call',
        call_id: 'retell-call-1',
        tool_name: 'calendar_check_availability',
        arguments: { date: '2025-01-15' },
      });

      expect((result as any).status).toBe('success');
      expect((result as any).output.available).toBe(true);
    });

    it('should handle unknown events gracefully', async () => {
      const result = await controller.retellEvents({}, {
        event: 'unknown_event',
        call_id: 'retell-call-1',
      });

      expect(result.status).toBe('ok');
    });
  });
});
