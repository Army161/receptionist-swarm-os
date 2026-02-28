import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendSmsParams {
  to: string;
  body: string;
  from?: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.accountSid = this.config.get('TWILIO_ACCOUNT_SID', '');
    this.authToken = this.config.get('TWILIO_AUTH_TOKEN', '');
    this.fromNumber = this.config.get('TWILIO_FROM_NUMBER', '');
    this.isMock = !this.accountSid || !this.authToken;
    if (this.isMock) {
      this.logger.warn('Twilio credentials not set — using mock SMS provider');
    }
  }

  get providerName(): string {
    return this.isMock ? 'mock' : 'twilio';
  }

  async sendSms(params: SendSmsParams): Promise<SmsResult> {
    if (this.isMock) {
      this.logger.log(`[MOCK SMS] To: ${params.to} | Body: ${params.body.substring(0, 100)}...`);
      return { success: true, messageId: `mock_msg_${Date.now()}` };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const data = new URLSearchParams({
        To: params.to,
        From: params.from || this.fromNumber,
        Body: params.body,
      });

      const response = await axios.post(url, data.toString(), {
        auth: { username: this.accountSid, password: this.authToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return { success: true, messageId: response.data.sid };
    } catch (err: any) {
      this.logger.error('Failed to send SMS via Twilio', err.message);
      return { success: false, error: err.message };
    }
  }
}
