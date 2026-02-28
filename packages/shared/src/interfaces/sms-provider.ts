// ── SMS Provider Adapter Interface ───────────────────

export interface SmsProviderAdapter {
  readonly providerName: string;

  /** Send an SMS message */
  sendSms(params: SendSmsParams): Promise<SmsResult>;

  /** Check delivery status */
  getDeliveryStatus(messageId: string): Promise<SmsDeliveryStatus>;
}

export interface SendSmsParams {
  to: string;
  from?: string;
  body: string;
  mediaUrls?: string[];
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type SmsDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
