// ── Search Provider Adapter Interface ────────────────

export interface SearchProviderAdapter {
  readonly providerName: string;

  /** Perform a web search */
  search(params: SearchParams): Promise<SearchResult>;
}

export interface SearchParams {
  query: string;
  recencyDays?: number;
  domainAllowlist?: string[];
  maxResults?: number;
}

export interface SearchResult {
  results: SearchResultItem[];
  cached: boolean;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}
