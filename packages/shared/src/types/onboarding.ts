// ── Onboarding Types ─────────────────────────────────

export interface OnboardingStartRequest {
  orgId: string;
  locationId: string;
  websiteUrl: string;
  googleBusinessProfileUrl?: string;
  uploadedDocUrls?: string[];
}

export interface OnboardingStartResponse {
  draftAgentPackId: string;
  scanResults: import('./agent-pack').ScanResults;
  draftConfig: import('./agent-pack').AgentPackConfig;
  questions: OnboardingQuestion[];
}

export interface OnboardingQuestion {
  id: string;
  text: string;
  type: 'multi_select' | 'single_select' | 'text' | 'transfer_targets';
  options?: string[];
  required: boolean;
}

export interface OnboardingConfirmRequest {
  agentPackId: string;
  answers: import('./agent-pack').FiveQuestionAnswers;
}

export interface OnboardingConfirmResponse {
  agentPackId: string;
  version: number;
  status: string;
  config: import('./agent-pack').AgentPackConfig;
}

export interface OnboardingDeployRequest {
  agentPackId: string;
  locationId: string;
  phoneNumber?: string;
}

export interface OnboardingDeployResponse {
  success: boolean;
  phoneNumber: string;
  forwardingInstructions: string;
  dashboardUrl: string;
}
