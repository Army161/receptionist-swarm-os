import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import * as dns from 'dns';
import * as net from 'net';
import { promisify } from 'util';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

export interface CrawlResult {
  url: string;
  title: string;
  text: string;
  links: string[];
  metaDescription?: string;
}

/**
 * SSRF-safe crawler service.
 *
 * Protections:
 * 1. Only http:// and https:// schemes allowed
 * 2. Blocks localhost, private RFC-1918 ranges, link-local, metadata endpoints
 * 3. DNS resolution + re-check of resolved IPs before fetching
 * 4. axios: timeout=10s, maxRedirects=0
 */
@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  /** IPv4 CIDR ranges that must be blocked */
  private static readonly BLOCKED_IPV4_CIDRS: Array<{ network: number; mask: number }> = [
    // 10.0.0.0/8
    { network: 0x0a000000, mask: 0xff000000 },
    // 172.16.0.0/12
    { network: 0xac100000, mask: 0xfff00000 },
    // 192.168.0.0/16
    { network: 0xc0a80000, mask: 0xffff0000 },
    // 127.0.0.0/8 (loopback)
    { network: 0x7f000000, mask: 0xff000000 },
    // 169.254.0.0/16 (link-local)
    { network: 0xa9fe0000, mask: 0xffff0000 },
    // 0.0.0.0/8
    { network: 0x00000000, mask: 0xff000000 },
  ];

  /** Well-known metadata endpoint IPs */
  private static readonly BLOCKED_IPS = new Set([
    '169.254.169.254', // AWS/GCP/Azure metadata
    '100.100.100.200', // Alibaba Cloud metadata
    'fd00::1',         // IPv6 metadata
  ]);

  /** Blocked hostnames */
  private static readonly BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'metadata.google.internal',
    'metadata.google.com',
  ]);

  /**
   * Check if a given URL is safe to fetch (not targeting internal/private resources).
   * Exported for testing.
   */
  async validateUrl(url: string): Promise<void> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException(`Invalid URL: ${url}`);
    }

    // 1. Only http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException(`Blocked scheme: ${parsed.protocol} — only http and https are allowed`);
    }

    // 2. Blocked hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (CrawlerService.BLOCKED_HOSTNAMES.has(hostname)) {
      throw new BadRequestException(`Blocked hostname: ${hostname}`);
    }

    // 3. If hostname is already an IP literal, validate it directly
    if (net.isIP(hostname)) {
      this.assertIpSafe(hostname);
      return;
    }

    // 4. DNS resolve and check every resolved IP
    const ips = await this.resolveHostname(hostname);
    if (ips.length === 0) {
      throw new BadRequestException(`Could not resolve hostname: ${hostname}`);
    }
    for (const ip of ips) {
      this.assertIpSafe(ip);
    }
  }

  /**
   * Resolve a hostname to all IPv4 and IPv6 addresses.
   */
  private async resolveHostname(hostname: string): Promise<string[]> {
    const ips: string[] = [];
    try {
      const v4 = await dnsResolve4(hostname);
      ips.push(...v4);
    } catch {
      // No A records — that's fine, try AAAA
    }
    try {
      const v6 = await dnsResolve6(hostname);
      ips.push(...v6);
    } catch {
      // No AAAA records — that's fine
    }
    return ips;
  }

  /**
   * Throw if an IP address falls in a blocked range.
   */
  private assertIpSafe(ip: string): void {
    // Check explicit blocklist
    if (CrawlerService.BLOCKED_IPS.has(ip)) {
      throw new BadRequestException(`Blocked IP (metadata endpoint): ${ip}`);
    }

    if (net.isIPv4(ip)) {
      const numeric = this.ipv4ToNumber(ip);
      for (const cidr of CrawlerService.BLOCKED_IPV4_CIDRS) {
        if (((numeric & cidr.mask) >>> 0) === (cidr.network >>> 0)) {
          throw new BadRequestException(`Blocked private/reserved IPv4: ${ip}`);
        }
      }
    } else if (net.isIPv6(ip)) {
      // Block all IPv6 loopback, link-local, and unique-local
      if (
        ip === '::1' ||
        ip.startsWith('fe80') ||
        ip.startsWith('fc') ||
        ip.startsWith('fd')
      ) {
        throw new BadRequestException(`Blocked private/reserved IPv6: ${ip}`);
      }
    }
  }

  /**
   * Convert dotted-quad IPv4 to a 32-bit unsigned integer.
   */
  private ipv4ToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  async crawl(url: string, maxPages: number = 5): Promise<CrawlResult[]> {
    // Validate the initial URL
    await this.validateUrl(url);

    const results: CrawlResult[] = [];
    const visited = new Set<string>();
    const queue = [url];

    while (queue.length > 0 && results.length < maxPages) {
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        // Re-validate every URL before fetching (in case of crafted links)
        await this.validateUrl(currentUrl);
        const result = await this.fetchAndParse(currentUrl);
        results.push(result);

        // Only follow links on the same domain
        const baseHost = new URL(url).hostname;
        for (const link of result.links) {
          try {
            const linkUrl = new URL(link);
            if (linkUrl.hostname === baseHost && !visited.has(link)) {
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
      maxRedirects: 0,
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
