import { Injectable, Logger } from '@nestjs/common';
import { CrawlResult } from './crawler.service';

export interface ExtractedData {
  services: string[];
  hours: Record<string, { open: string; close: string } | null>;
  faqs: { question: string; answer: string }[];
  policies: string[];
  address?: string;
  phone?: string;
  industry?: string;
  pricingInfo?: string[];
}

@Injectable()
export class ExtractorService {
  private readonly logger = new Logger(ExtractorService.name);

  extract(crawlResults: CrawlResult[]): ExtractedData {
    const allText = crawlResults.map((r) => r.text).join(' ');
    const allTitles = crawlResults.map((r) => r.title).join(' ');

    return {
      services: this.extractServices(allText),
      hours: this.extractHours(allText),
      faqs: this.extractFAQs(allText),
      policies: this.extractPolicies(allText),
      address: this.extractAddress(allText),
      phone: this.extractPhone(allText),
      industry: this.detectIndustry(allText + ' ' + allTitles),
      pricingInfo: this.extractPricing(allText),
    };
  }

  private extractServices(text: string): string[] {
    const services: string[] = [];
    // Look for common service-related patterns
    const servicePatterns = [
      /(?:our\s+)?services?\s*(?:include|:)\s*([^.]+)/gi,
      /we\s+(?:offer|provide|specialize\s+in)\s+([^.]+)/gi,
    ];

    for (const pattern of servicePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const items = match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        services.push(...items);
      }
    }

    // Deduplicate
    return [...new Set(services)].slice(0, 20);
  }

  private extractHours(text: string): Record<string, { open: string; close: string } | null> {
    const hours: Record<string, { open: string; close: string } | null> = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const day of days) {
      const pattern = new RegExp(
        `${day}\\s*:?\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|AM|PM))\\s*[-–to]+\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|AM|PM))`,
        'i',
      );
      const match = text.match(pattern);
      if (match) {
        hours[day] = { open: match[1].trim(), close: match[2].trim() };
      } else if (text.toLowerCase().includes(`${day}`) && text.toLowerCase().includes('closed')) {
        hours[day] = null;
      }
    }

    // Default hours if nothing found
    if (Object.keys(hours).length === 0) {
      for (const day of days.slice(0, 5)) {
        hours[day] = { open: '9:00 AM', close: '5:00 PM' };
      }
      hours['saturday'] = null;
      hours['sunday'] = null;
    }

    return hours;
  }

  private extractFAQs(text: string): { question: string; answer: string }[] {
    const faqs: { question: string; answer: string }[] = [];

    // Look for Q&A patterns
    const qaPattern = /(?:Q|Question)\s*[:.]?\s*([^?]+\?)\s*(?:A|Answer)\s*[:.]?\s*([^Q]+?)(?=(?:Q|Question)|$)/gi;
    let match;
    while ((match = qaPattern.exec(text)) !== null) {
      faqs.push({ question: match[1].trim(), answer: match[2].trim() });
    }

    return faqs.slice(0, 10);
  }

  private extractPolicies(text: string): string[] {
    const policies: string[] = [];
    const policyPatterns = [
      /(?:cancellation|refund|return)\s+policy\s*:?\s*([^.]+\.)/gi,
      /(?:no|free)\s+(?:cancellation|refund)/gi,
      /(?:insurance|payment)\s+(?:accepted|plans?)\s*:?\s*([^.]+\.)/gi,
    ];

    for (const pattern of policyPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        policies.push(match[0].trim());
      }
    }

    return [...new Set(policies)].slice(0, 10);
  }

  private extractAddress(text: string): string | undefined {
    // Simple pattern for US addresses
    const addressPattern = /\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court)[.,]?\s*(?:Suite\s+\d+[.,]?\s*)?[\w\s]+,\s*[A-Z]{2}\s+\d{5}/i;
    const match = text.match(addressPattern);
    return match ? match[0].trim() : undefined;
  }

  private extractPhone(text: string): string | undefined {
    const phonePattern = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const match = text.match(phonePattern);
    return match ? match[0].trim() : undefined;
  }

  private detectIndustry(text: string): string {
    const lowerText = text.toLowerCase();
    const industryKeywords: Record<string, string[]> = {
      hvac: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'duct'],
      dental: ['dental', 'dentist', 'teeth', 'orthodontic', 'oral health'],
      med_spa: ['med spa', 'medical spa', 'botox', 'filler', 'aesthetic', 'cosmetic'],
      law_intake: ['law', 'attorney', 'lawyer', 'legal', 'litigation'],
      home_services: ['plumbing', 'electrical', 'roofing', 'painting', 'renovation'],
      restaurant: ['restaurant', 'dining', 'menu', 'reservation', 'cuisine'],
      auto_repair: ['auto', 'car repair', 'mechanic', 'tire', 'brake', 'oil change'],
      real_estate: ['real estate', 'property', 'listing', 'realtor', 'home for sale'],
    };

    let bestMatch = 'general';
    let bestScore = 0;

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      const score = keywords.filter((kw) => lowerText.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = industry;
      }
    }

    return bestMatch;
  }

  private extractPricing(text: string): string[] {
    const pricing: string[] = [];
    const pricePattern = /\$[\d,]+(?:\.\d{2})?(?:\s*[-–]\s*\$[\d,]+(?:\.\d{2})?)?/g;
    let match;
    while ((match = pricePattern.exec(text)) !== null) {
      // Get some surrounding context
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 30);
      pricing.push(text.substring(start, end).trim());
    }
    return [...new Set(pricing)].slice(0, 10);
  }
}
