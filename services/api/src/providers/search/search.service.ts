import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SearchParams {
  query: string;
  recencyDays?: number;
  domainAllowlist?: string[];
  maxResults?: number;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResult {
  results: SearchResultItem[];
  cached: boolean;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly apiKey: string;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('PERPLEXITY_API_KEY', '');
    this.isMock = !this.apiKey;
    if (this.isMock) {
      this.logger.warn('PERPLEXITY_API_KEY not set — using mock search provider');
    }
  }

  get providerName(): string {
    return this.isMock ? 'mock' : 'perplexity';
  }

  async search(params: SearchParams): Promise<SearchResult> {
    if (this.isMock) {
      this.logger.log(`[MOCK SEARCH] Query: ${params.query}`);
      return {
        results: [
          {
            title: `[Mock] Search result for "${params.query}"`,
            url: 'https://example.com/mock-result',
            snippet: `This is a mock search result for the query: "${params.query}". Connect Perplexity API for real results.`,
          },
        ],
        cached: false,
      };
    }

    try {
      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a search assistant. Return factual information with citations.',
            },
            {
              role: 'user',
              content: params.query,
            },
          ],
          max_tokens: 500,
          return_citations: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = response.data.choices?.[0]?.message?.content || '';
      const citations = response.data.citations || [];

      return {
        results: citations.map((url: string, i: number) => ({
          title: `Source ${i + 1}`,
          url,
          snippet: content.substring(0, 200),
        })),
        cached: false,
      };
    } catch (err: any) {
      this.logger.error('Perplexity search failed', err.message);
      return { results: [], cached: false };
    }
  }
}
