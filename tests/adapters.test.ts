import { describe, it, expect, vi, beforeEach } from 'vitest';

// fs/promises와 os를 모킹 (hoisted)
vi.mock('fs/promises');
vi.mock('os', () => ({
  default: { homedir: vi.fn(() => '/home/testuser') },
  homedir: vi.fn(() => '/home/testuser'),
}));

import * as fs from 'fs/promises';
import * as os from 'os';

describe('getAllAdapters', () => {
  it('returns exactly 4 adapters', async () => {
    const { getAllAdapters } = await import('../src/adapters/index.js');
    const adapters = getAllAdapters();
    expect(adapters).toHaveLength(4);
  });

  it('adapter names are unique and correct', async () => {
    const { getAllAdapters } = await import('../src/adapters/index.js');
    const names = getAllAdapters().map((a) => a.name);
    expect(names).toContain('Claude Code');
    expect(names).toContain('Codex');
    expect(names).toContain('Gemini CLI');
    expect(names).toContain('Cursor');
    expect(new Set(names).size).toBe(4);
  });
});

describe('getAdapterByName', () => {
  it('finds Claude Code adapter', async () => {
    const { getAdapterByName } = await import('../src/adapters/index.js');
    const adapter = getAdapterByName('Claude Code');
    expect(adapter).toBeDefined();
    expect(adapter?.name).toBe('Claude Code');
  });

  it('returns undefined for unknown name', async () => {
    const { getAdapterByName } = await import('../src/adapters/index.js');
    expect(getAdapterByName('Unknown')).toBeUndefined();
  });
});

describe('detectInstalledAdapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue('/home/testuser');
  });

  it('detects adapters whose configDir exists', async () => {
    // ~/.claude 만 존재하는 시나리오
    vi.mocked(fs.access).mockImplementation(async (p) => {
      const pathStr = String(p);
      if (pathStr === '/home/testuser/.claude') return;
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    const { detectInstalledAdapters } = await import('../src/adapters/index.js');
    const detected = await detectInstalledAdapters();
    expect(detected.length).toBe(1);
    expect(detected[0].name).toBe('Claude Code');
  });

  it('returns empty array when no config dirs exist', async () => {
    vi.mocked(fs.access).mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    const { detectInstalledAdapters } = await import('../src/adapters/index.js');
    const detected = await detectInstalledAdapters();
    expect(detected).toHaveLength(0);
  });
});

describe('ClaudeAdapter', () => {
  it('getSkillsDir project returns .claude/skills/', async () => {
    const { ClaudeAdapter } = await import('../src/adapters/claude.js');
    const adapter = new ClaudeAdapter();
    expect(adapter.getSkillsDir('project')).toBe('.claude/skills/');
  });

  it('getSkillsDir global returns ~/.claude/skills/', async () => {
    const { ClaudeAdapter } = await import('../src/adapters/claude.js');
    const adapter = new ClaudeAdapter();
    expect(adapter.getSkillsDir('global')).toBe('/home/testuser/.claude/skills/');
  });
});

describe('CodexAdapter', () => {
  it('getSkillsDir returns ~/.codex/skills/', async () => {
    const { CodexAdapter } = await import('../src/adapters/codex.js');
    const adapter = new CodexAdapter();
    expect(adapter.getSkillsDir('global')).toBe('/home/testuser/.codex/skills/');
  });
});

describe('GeminiAdapter', () => {
  it('getSkillsDir returns ~/.gemini/extensions/', async () => {
    const { GeminiAdapter } = await import('../src/adapters/gemini.js');
    const adapter = new GeminiAdapter();
    expect(adapter.getSkillsDir('global')).toBe('/home/testuser/.gemini/extensions/');
  });
});
