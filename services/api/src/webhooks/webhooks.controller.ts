import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { CallSessionService } from './call-session.service';
import { VoiceService } from '../providers/voice/voice.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly callSessionService: CallSessionService,
    private readonly voiceService: VoiceService,
  ) {}

  /**
   * POST /v1/webhooks/retell/inbound
   * Retell calls this when a new inbound call arrives.
   */
  @Post('retell/inbound')
  @HttpCode(200)
  async retellInbound(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ) {
    this.logger.log(`Retell inbound webhook: ${JSON.stringify(body).substring(0, 200)}`);

    // Validate webhook (if secret is configured)
    // const rawBody = JSON.stringify(body);
    // this.voiceService.validateWebhook(headers, rawBody);

    const result = await this.callSessionService.handleInboundCall({
      callId: body.call_id || `call_${Date.now()}`,
      callerNumber: body.from_number || body.caller_number || '',
      calledNumber: body.to_number || body.called_number || '',
      orgId: body.metadata?.orgId || body.org_id || '',
      locationId: body.metadata?.locationId || body.location_id || '',
      retellCallId: body.call_id,
    });

    return result;
  }

  /**
   * POST /v1/webhooks/retell/events
   * Retell sends events: call_started, call_ended, tool_call, etc.
   */
  @Post('retell/events')
  @HttpCode(200)
  async retellEvents(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ) {
    this.logger.log(`Retell event: ${body.event} - ${JSON.stringify(body).substring(0, 200)}`);

    switch (body.event) {
      case 'call_started':
        this.logger.log(`Call started: ${body.call_id}`);
        return { status: 'ok' };

      case 'call_ended':
        await this.callSessionService.handleCallEnd(
          body.call_id,
          body.metadata?.orgId || '',
          body.metadata?.locationId || '',
          {
            transcript: body.transcript,
            outcome: this.mapRetellOutcome(body.disconnection_reason),
            duration: body.duration_ms ? Math.round(body.duration_ms / 1000) : 0,
            disconnectionReason: body.disconnection_reason,
          },
        );
        return { status: 'ok' };

      case 'call_analyzed':
        this.logger.log(`Call analyzed: ${body.call_id}`);
        return { status: 'ok' };

      case 'tool_call':
        const toolResult = await this.callSessionService.handleToolCall(
          body.call_id,
          body.tool_name || body.function_name,
          body.arguments || body.tool_input || {},
        );
        return toolResult;

      default:
        this.logger.warn(`Unknown Retell event: ${body.event}`);
        return { status: 'ok' };
    }
  }

  /**
   * POST /v1/webhooks/twilio/inbound_call
   * Placeholder for Twilio inbound call webhook (future provider swap).
   */
  @Post('twilio/inbound_call')
  @HttpCode(200)
  async twilioInbound(@Body() body: any) {
    this.logger.log(`Twilio inbound webhook (TODO): ${JSON.stringify(body).substring(0, 200)}`);
    return { status: 'ok', message: 'Twilio adapter not yet implemented — use Retell' };
  }

  private mapRetellOutcome(disconnectionReason: string): string {
    switch (disconnectionReason) {
      case 'agent_hangup':
      case 'user_hangup':
        return 'faq_answered'; // Default for completed calls
      case 'call_transfer':
        return 'transferred';
      case 'voicemail_reached':
        return 'voicemail';
      case 'inactivity':
      case 'machine_detected':
        return 'abandoned';
      default:
        return 'abandoned';
    }
  }
}
