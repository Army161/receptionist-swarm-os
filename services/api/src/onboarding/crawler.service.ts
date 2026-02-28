import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CrawlResult {
  url: string;
  title: string;
  text: string;
  links: string[];
  metaDescription?: string;
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  async crawl(url: string, maxPages: number = 5): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    const visited = new Set<string>();
    const queue = [url];

    while (queue.length > 0 && results.length < maxPages) {
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const result = await this.fetchAndParse(currentUrl);
        results.push(result);

        // Only follow links on the same domain
        const baseHost = new URL(url).hostname;
        for (const link of result.links) {
          try {
            const linkHost = new URL(link).hostname;
            if (linkHost === baseHost && !visited.has(link)) {
              queue.push(link);
            }
          } catch {
            // Ignore invalid URLs
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to crawl ${currentUrl}: ${err}`);
      }
    }

    return results;
  }

  private async fetchAndParse(url: string): Promise<CrawlResult> {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'ReceptionistSwarmBot/1.0' },
    });

    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $('script, style, nav, footer, header').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || '';
    const metaDescription = $('meta[name="description"]').attr('content') || '';

    // Extract text content
    const text = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit text length

    // Extract links
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absolute = new URL(href, url).toString();
          links.push(absolute);
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    return { url, title, text, links, metaDescription };
  }
}
