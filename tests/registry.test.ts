import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

vi.mock('fs/promises');
vi.mock('os');

// Reset module registry between tests to avoid caching issues
beforeEach(() => {
  vi.resetModules();
  vi.mocked(os.homedir).mockReturnValue('/home/testuser');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('toApiUrl', () => {
  it('converts "github.com/org/repo" to GitHub API URL', async () => {
    const { toApiUrl } = await import('../src/core/registry.js');
    expect(toApiUrl('github.com/zivo-team/skills')).toBe(
      'https://api.github.com/repos/zivo-team/skills',
    );
  });

  it('converts full "https://github.com/org/repo" URL to GitHub API URL', async () => {
    const { toApiUrl } = await import('../src/core/registry.js');
    expect(toApiUrl('https://github.com/zivo-team/skills')).toBe(
      'https://api.github.com/repos/zivo-team/skills',
    );
  });
});

describe('cache', () => {
  it('write then read returns cached data within TTL', async () => {
    const calls: Record<string, string> = {};

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockImplementation(async (filePath, data) => {
      calls[String(filePath)] = String(data);
    });
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const stored = calls[String(filePath)];
      if (!stored) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return stored;
    });

    const { writeCache, readCache } = await import('../src/core/cache.js');
    const cachePath = '/tmp/cache';
    const key = 'test-key';
    const data = 'hello world';
    const ttl = 86_400_000; // 24h

    await writeCache(cachePath, key, data);
    const result = await readCache(cachePath, key, ttl);
    expect(result).toBe(data);
  });

  it('returns null when cache entry is expired (TTL exceeded)', async () => {
    const expiredEntry = JSON.stringify({
      data: 'old data',
      timestamp: Date.now() - 90_000_000, // 25 hours ago
    });

    vi.mocked(fs.readFile).mockResolvedValue(expiredEntry as any);

    const { readCache } = await import('../src/core/cache.js');
    const result = await readCache('/tmp/cache', 'expired-key', 86_400_000);
    expect(result).toBeNull();
  });

  it('falls back to expired cache when fetch fails (offline mode)', async () => {
    const expiredEntry = JSON.stringify({
      data: 'cached content',
      timestamp: Date.now() - 90_000_000, // expired
    });

    vi.mocked(fs.readFile).mockResolvedValue(expiredEntry as any);

    const { readCache } = await import('../src/core/cache.js');
    // offline=true bypasses TTL check
    const result = await readCache('/tmp/cache', 'offline-key', 86_400_000, true);
    expect(result).toBe('cached content');
  });
});
