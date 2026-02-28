import { Injectable, Logger } from '@nestjs/common';
import { CallsService } from '../calls/calls.service';
import { AgentPacksService } from '../agent-packs/agent-packs.service';
import { SwarmRouterService, SwarmDecision } from '../swarm-router/swarm-router.service';
import { ToolsService } from '../tools/tools.service';
import { VoiceService } from '../providers/voice/voice.service';
import { SmsService } from '../providers/sms/sms.service';

/**
 * CallSessionService — manages the lifecycle of a single call session.
 * Implements the deterministic state machine from the spec.
 *
 * States: S0_GREETING → S1_INTENT → S2_BOOKING/S3_LEAD/S4_FAQ → S5_TRANSFER → S6_WRAPUP → S7_END
 */

export interface InboundCallPayload {
  callId: string;
  callerNumber: string;
  calledNumber: string;
  orgId: string;
  locationId: string;
  retellCallId?: string;
}

@Injectable()
export class CallSessionService {
  private readonly logger = new Logger(CallSessionService.name);

  constructor(
    private readonly callsService: CallsService,
    private readonly agentPacksService: AgentPacksService,
    private readonly swarmRouter: SwarmRouterService,
    private readonly toolsService: ToolsService,
    private readonly voiceService: VoiceService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Handle an inbound call from Retell webhook.
   * This is the main entry point for the call lifecycle.
   */
  async handleInboundCall(payload: InboundCallPayload) {
    const { callId, callerNumber, calledNumber, orgId, locationId } = payload;

    this.logger.log(`Inbound call: ${callId} from ${callerNumber} to ${calledNumber}`);

    // Step 1: Swarm Router decision
    const routeResult = await this.swarmRouter.routeCall(orgId, locationId);
    this.logger.log(`Swarm decision: ${routeResult.decision}`);

    if (routeResult.decision !== SwarmDecision.ACCEPT) {
      // Handle non-accept decisions
      const call = await this.callsService.createCall({
        orgId,
        locationId,
        providerCallId: payload.retellCallId || callId,
        callerNumber,
        outcome: routeResult.decision === SwarmDecision.QUEUE ? 'abandoned' : 'queued_callback',
        metricsJson: {
          swarmDecision: routeResult.decision,
          queuePosition: routeResult.queuePosition,
          estimatedWaitSeconds: routeResult.estimatedWaitSeconds,
        },
      });

      // If callback, send SMS
      if (routeResult.decision === SwarmDecision.CALLBACK && callerNumber) {
        await this.smsService.sendSms({
          to: callerNumber,
          body: `Thank you for calling! We're currently busy. We'll call you back within 30 minutes.`,
        });
      }

      return {
        ...routeResult,
        accepted: false,
        callId: call.id,
      };
    }

    // Step 2: Load AgentPack
    const agentPack = await this.agentPacksService.getCurrent(locationId);
    if (!agentPack) {
      this.logger.warn(`No AgentPack deployed for location ${locationId}`);
      await this.swarmRouter.releaseCall(orgId, locationId);
      return { accepted: false, error: 'No AgentPack deployed for this location' };
    }

    // Step 3: Create call record
    const call = await this.callsService.createCall({
      orgId,
      locationId,
      providerCallId: payload.retellCallId || callId,
      callerNumber,
      outcome: 'abandoned', // Will be updated on completion
      metricsJson: {
        agentPackVersion: agentPack.version,
        turnsCount: 0,
        toolCallsCount: 0,
        escalated: false,
      },
    });

    // Step 4: Start voice session
    const session = await this.voiceService.startInboundSession({
      callId: call.id,
      callerNumber,
      calledNumber,
      orgId,
      locationId,
      agentPackConfig: agentPack.configJson,
    });

    this.logger.log(`Call session started: ${session.sessionId} for call ${call.id}`);

    return {
      accepted: true,
      callId: call.id,
      sessionId: session.sessionId,
      agentPackVersion: agentPack.version,
      config: agentPack.configJson,
    };
  }

  /**
   * Handle call end event from Retell webhook.
   */
  async handleCallEnd(
    providerCallId: string,
    orgId: string,
    locationId: string,
    data: {
      transcript?: string;
      outcome?: string;
      duration?: number;
      disconnectionReason?: string;
    },
  ) {
    this.logger.log(`Call ended: ${providerCallId}`);

    // Release concurrency slot
    await this.swarmRouter.releaseCall(orgId, locationId);

    // Find and update call record
    // For MVP, we search by providerCallId
    const { calls } = await this.callsService.findByLocation(locationId);
    const call = calls.find((c) => c.providerCallId === providerCallId);

    if (!call) {
      this.logger.warn(`Call not found for provider call ID: ${providerCallId}`);
      return;
    }

    // Update call with final data
    await this.callsService.updateCall(call.id, {
      endedAt: new Date(),
      outcome: data.outcome || 'abandoned',
      metricsJson: {
        ...call.metricsJson,
        durationSeconds: data.duration || 0,
        disconnectionReason: data.disconnectionReason,
      },
    });

    // Store transcript
    if (data.transcript) {
      await this.callsService.createTranscript({
        callId: call.id,
        transcriptText: data.transcript,
        redactedText: data.transcript, // TODO: Implement PII redaction
        structuredJson: { raw: data.transcript },
      });
    }

    // Send SMS recap if caller number is available
    if (call.callerNumber) {
      await this.toolsService.executeTool('sms_send', {
        to: call.callerNumber,
        body: `Thank you for calling! Here's a recap of your call. If you need anything else, please call us back.`,
      });
    }
  }

  /**
   * Handle tool call request from Retell during a call.
   */
  async handleToolCall(callId: string, toolName: string, toolInput: Record<string, any>) {
    this.logger.log(`Tool call: ${toolName} for call ${callId}`);

    const result = await this.toolsService.executeTool(toolName, toolInput);

    // Record the tool run
    await this.callsService.createToolRun({
      callId,
      toolName,
      inputJson: toolInput,
      outputJson: result.output,
      status: result.status,
    });

    return result;
  }
}
