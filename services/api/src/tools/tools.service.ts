import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from '../providers/sms/sms.service';
import { SearchService } from '../providers/search/search.service';

export interface ToolExecutionResult {
  toolName: string;
  status: 'success' | 'error' | 'skipped';
  output: Record<string, any>;
  error?: string;
}

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly searchService: SearchService,
  ) {}

  async executeTool(toolName: string, input: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Executing tool: ${toolName}`);

    try {
      switch (toolName) {
        case 'calendar_check_availability':
          return this.stubCalendarCheckAvailability(input);
        case 'calendar_book_appointment':
          return this.stubCalendarBookAppointment(input);
        case 'crm_upsert_contact':
          return this.stubCrmUpsertContact(input);
        case 'crm_create_opportunity':
          return this.stubCrmCreateOpportunity(input);
        case 'sms_send':
          return this.executeSendSms(input);
        case 'search_web':
          return this.executeSearchWeb(input);
        case 'transfer_call':
          return this.executeTransferCall(input);
        case 'knowledge_query':
          return this.stubKnowledgeQuery(input);
        case 'create_ticket':
          return this.stubCreateTicket(input);
        default:
          return { toolName, status: 'error', output: {}, error: `Unknown tool: ${toolName}` };
      }
    } catch (err: any) {
      this.logger.error(`Tool execution failed: ${toolName}`, err);
      return { toolName, status: 'error', output: {}, error: err.message };
    }
  }

  // ── Real implementations ─────────────────────────────

  private async executeSendSms(input: Record<string, any>): Promise<ToolExecutionResult> {
    const result = await this.smsService.sendSms({
      to: input.to,
      body: input.body,
      from: input.from,
    });
    return {
      toolName: 'sms_send',
      status: result.success ? 'success' : 'error',
      output: result,
      error: result.error,
    };
  }

  private async executeSearchWeb(input: Record<string, any>): Promise<ToolExecutionResult> {
    const result = await this.searchService.search({
      query: input.query,
      recencyDays: input.recency_days,
      domainAllowlist: input.domain_allowlist,
    });
    return {
      toolName: 'search_web',
      status: 'success',
      output: { results: result.results },
    };
  }

  private async executeTransferCall(input: Record<string, any>): Promise<ToolExecutionResult> {
    // TODO: Implement via VoiceProviderAdapter
    this.logger.log(`Transfer call ${input.call_id} to ${input.target_number} (${input.mode})`);
    return {
      toolName: 'transfer_call',
      status: 'success',
      output: {
        transferred: true,
        mode: input.mode || 'cold',
        target: input.target_number,
        message: 'Call transfer initiated',
      },
    };
  }

  // ── Stub implementations (TODO: wire to real providers) ──

  private async stubCalendarCheckAvailability(input: Record<string, any>): Promise<ToolExecutionResult> {
    // TODO: Wire to Google Calendar API
    this.logger.log(`[STUB] calendar_check_availability: ${JSON.stringify(input)}`);
    return {
      toolName: 'calendar_check_availability',
      status: 'success',
      output: {
        available: true,
        slots: [
          { date: '2025-01-15', time: '10:00 AM', duration: 60 },
          { date: '2025-01-15', time: '2:00 PM', duration: 60 },
          { date: '2025-01-16', time: '9:00 AM', duration: 60 },
        ],
        message: '[STUB] Returning mock availability slots',
      },
    };
  }

  private async stubCalendarBookAppointment(input: Record<string, any>): Promise<ToolExecutionResult> {
    // TODO: Wire to Google Calendar API
    this.logger.log(`[STUB] calendar_book_appointment: ${JSON.stringify(input)}`);
    return {
      toolName: 'calendar_book_appointment',
      status: 'success',
      output: {
        booked: true,
        appointmentId: `apt_${Date.now()}`,
        date: input.date || '2025-01-15',
        time: input.time || '10:00 AM',
        service: input.service,
        message: '[STUB] Appointment booked successfully',
      },
    };
  }

  private async stubCrmUpsertContact(input: Record<string, any>): Promise<ToolExecutionResult> {
    // TODO: Wire to GoHighLevel/HubSpot API
    this.logger.log(`[STUB] crm_upsert_contact: ${JSON.stringify(input)}`);
    return {
      toolName: 'crm_upsert_contact',
      status: 'success',
      output: {
        contactId: `contact_${Date.now()}`,
        name: input.name,
        phone: input.phone,
        email: input.email,
        message: '[STUB] Contact upserted',
      },
    };
  }

  private async stubCrmCreateOpportunity(input: Record<string, any>): Promise<ToolExecutionResult> {
    // TODO: Wire to GoHighLevel/HubSpot API
    this.logger.log(`[STUB] crm_create_opportunity: ${JSON.stringify(input)}`);
    return {
      toolName: 'crm_create_opportunity',
      status: 'success',
      output: {
        opportunityId: `opp_${Date.now()}`,
        service: input.service,
        urgency: input.urgency,
        message: '[STUB] Opportunity created',
      },
    };
  }

  private async stubKnowledgeQuery(input: Record<string, any>): Promise<ToolExecutionResult> {
    // TODO: Wire to pgvector RAG pipeline
    this.logger.log(`[STUB] knowledge_query: ${JSON.stringify(input)}`);
    return {
      toolName: 'knowledge_query',
      status: 'success',
      output: {
        results: [],
        message: '[STUB] No KB results — would fall back to web search',
      },
    };
  }

  private async stubCreateTicket(input: Record<string, any>): Promise<ToolExecutionResult> {
    // TODO: Wire to ticketing system
    this.logger.log(`[STUB] create_ticket: ${JSON.stringify(input)}`);
    return {
      toolName: 'create_ticket',
      status: 'success',
      output: {
        ticketId: `ticket_${Date.now()}`,
        message: '[STUB] Ticket created',
      },
    };
  }
}
