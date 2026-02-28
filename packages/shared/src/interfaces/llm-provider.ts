// ── LLM Provider Adapter Interface ───────────────────

export interface LlmProviderAdapter {
  readonly providerName: string;

  /** Generate a text completion */
  complete(params: LlmCompletionParams): Promise<LlmCompletionResult>;

  /** Generate a structured (JSON) completion */
  completeStructured<T>(params: LlmStructuredParams): Promise<T>;
}

export interface LlmCompletionParams {
  systemPrompt: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: LlmToolDefinition[];
}

export interface LlmStructuredParams extends LlmCompletionParams {
  schema: Record<string, unknown>;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmCompletionResult {
  content: string;
  toolCalls?: LlmToolCall[];
  usage: { promptTokens: number; completionTokens: number };
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
