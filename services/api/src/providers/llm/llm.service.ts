import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface LlmCompletionParams {
  systemPrompt: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCompletionResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('OPENAI_API_KEY', '');
    this.isMock = !this.apiKey;
    if (this.isMock) {
      this.logger.warn('OPENAI_API_KEY not set — using mock LLM provider');
    }
  }

  get providerName(): string {
    return this.isMock ? 'mock' : 'openai';
  }

  async complete(params: LlmCompletionParams): Promise<LlmCompletionResult> {
    if (this.isMock) {
      this.logger.log(`[MOCK LLM] System: ${params.systemPrompt.substring(0, 50)}...`);
      return {
        content: '[Mock LLM response] I would be happy to help you with that.',
        usage: { promptTokens: 0, completionTokens: 0 },
      };
    }

    try {
      const messages = [
        { role: 'system', content: params.systemPrompt },
        ...params.messages,
      ];

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages,
          temperature: params.temperature ?? 0.3,
          max_tokens: params.maxTokens ?? 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        content: response.data.choices[0].message.content,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
        },
      };
    } catch (err: any) {
      this.logger.error('OpenAI completion failed', err.message);
      throw err;
    }
  }
}
