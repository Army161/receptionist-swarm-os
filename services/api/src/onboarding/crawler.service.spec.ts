import { BadRequestException } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import * as dns from 'dns';

// Mock dns.resolve4 and dns.resolve6
jest.mock('dns', () => ({
  resolve4: jest.fn(),
  resolve6: jest.fn(),
}));

describe('CrawlerService — SSRF Protection', () => {
  let service: CrawlerService;
  const mockResolve4 = dns.resolve4 as unknown as jest.Mock;
  const mockResolve6 = dns.resolve6 as unknown as jest.Mock;

  beforeEach(() => {
    service = new CrawlerService();
    jest.clearAllMocks();

    // Default: resolve to a safe public IP
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(null, ['93.184.216.34']); // example.com
    });
    mockResolve6.mockImplementation((_host: string, cb: Function) => {
      cb(new Error('no AAAA'), null);
    });
  });

  // ── Blocked schemes ──────────────────────────────────────────────
  it('should block ftp:// scheme', async () => {
    await expect(service.validateUrl('ftp://evil.com/payload')).rejects.toThrow(BadRequestException);
  });

  it('should block file:// scheme', async () => {
    await expect(service.validateUrl('file:///etc/passwd')).rejects.toThrow(BadRequestException);
  });

  it('should block javascript: scheme', async () => {
    await expect(service.validateUrl('javascript:alert(1)')).rejects.toThrow(BadRequestException);
  });

  // ── Blocked hostnames ────────────────────────────────────────────
  it('should block localhost', async () => {
    await expect(service.validateUrl('http://localhost/admin')).rejects.toThrow(BadRequestException);
  });

  it('should block metadata.google.internal', async () => {
    await expect(service.validateUrl('http://metadata.google.internal/computeMetadata/v1/')).rejects.toThrow(BadRequestException);
  });

  // ── Blocked IP literals ──────────────────────────────────────────
  it('should block 127.0.0.1 (loopback)', async () => {
    await expect(service.validateUrl('http://127.0.0.1/')).rejects.toThrow(BadRequestException);
  });

  it('should block 10.0.0.1 (RFC-1918)', async () => {
    await expect(service.validateUrl('http://10.0.0.1/')).rejects.toThrow(BadRequestException);
  });

  it('should block 172.16.0.1 (RFC-1918)', async () => {
    await expect(service.validateUrl('http://172.16.0.1/')).rejects.toThrow(BadRequestException);
  });

  it('should block 192.168.1.1 (RFC-1918)', async () => {
    await expect(service.validateUrl('http://192.168.1.1/')).rejects.toThrow(BadRequestException);
  });

  it('should block 169.254.169.254 (cloud metadata)', async () => {
    await expect(service.validateUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(BadRequestException);
  });

  it('should block 0.0.0.0', async () => {
    await expect(service.validateUrl('http://0.0.0.0/')).rejects.toThrow(BadRequestException);
  });

  // ── DNS rebind: hostname resolves to private IP ──────────────────
  it('should block hostname that resolves to 127.0.0.1', async () => {
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(null, ['127.0.0.1']);
    });
    await expect(service.validateUrl('http://evil.com/')).rejects.toThrow(BadRequestException);
  });

  it('should block hostname that resolves to 10.x', async () => {
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(null, ['10.0.0.5']);
    });
    await expect(service.validateUrl('http://evil.com/')).rejects.toThrow(BadRequestException);
  });

  it('should block hostname that resolves to 192.168.x', async () => {
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(null, ['192.168.0.1']);
    });
    await expect(service.validateUrl('http://evil.com/')).rejects.toThrow(BadRequestException);
  });

  it('should block hostname that resolves to metadata IP', async () => {
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(null, ['169.254.169.254']);
    });
    await expect(service.validateUrl('http://evil.com/')).rejects.toThrow(BadRequestException);
  });

  // ── IPv6 blocked ─────────────────────────────────────────────────
  it('should block ::1 IPv6 loopback', async () => {
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(new Error('no A'), null);
    });
    mockResolve6.mockImplementation((_host: string, cb: Function) => {
      cb(null, ['::1']);
    });
    await expect(service.validateUrl('http://evil.com/')).rejects.toThrow(BadRequestException);
  });

  it('should block fe80:: link-local IPv6', async () => {
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(new Error('no A'), null);
    });
    mockResolve6.mockImplementation((_host: string, cb: Function) => {
      cb(null, ['fe80::1']);
    });
    await expect(service.validateUrl('http://evil.com/')).rejects.toThrow(BadRequestException);
  });

  // ── Hostname that does not resolve ───────────────────────────────
  it('should block unresolvable hostname', async () => {
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(new Error('ENOTFOUND'), null);
    });
    mockResolve6.mockImplementation((_host: string, cb: Function) => {
      cb(new Error('ENOTFOUND'), null);
    });
    await expect(service.validateUrl('http://doesnotexist.invalid/')).rejects.toThrow(BadRequestException);
  });

  // ── Allowed public URL ───────────────────────────────────────────
  it('should allow a public URL that resolves to a safe IP', async () => {
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(null, ['93.184.216.34']);
    });
    await expect(service.validateUrl('https://example.com/')).resolves.toBeUndefined();
  });

  it('should allow http scheme', async () => {
    mockResolve4.mockImplementation((_host: string, cb: Function) => {
      cb(null, ['93.184.216.34']);
    });
    await expect(service.validateUrl('http://example.com/')).resolves.toBeUndefined();
  });

  // ── Invalid URL ──────────────────────────────────────────────────
  it('should throw on totally invalid URL', async () => {
    await expect(service.validateUrl('not-a-url')).rejects.toThrow(BadRequestException);
  });
});
