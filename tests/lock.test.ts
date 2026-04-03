import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('readLockFile', () => {
  it('v2 읽기/쓰기 round-trip', async () => {
    const v2Lock = {
      version: 2,
      skills: {
        'my-skill': {
          name: 'my-skill',
          description: 'A test skill',
          source: 'github.com/org/repo',
          sourceType: 'github',
          computedHash: 'sha256:abc123',
          installedBy: 'zivo',
          installedAt: '2026-04-03T00:00:00.000Z',
          adapterMeta: {},
        },
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(v2Lock) as any);

    const { readLockFile } = await import('../src/core/lock.js');
    const result = await readLockFile('/tmp/skills-lock.json');

    expect(result.version).toBe(2);
    expect(result.skills['my-skill'].source).toBe('github.com/org/repo');
    expect(result.skills['my-skill'].computedHash).toBe('sha256:abc123');
  });

  it('v1 자동 감지 → v2 변환', async () => {
    const v1Lock = {
      'skill-a': {
        source: 'org/repo-a',
        sourceType: 'github',
        computedHash: 'aaabbbccc',
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(v1Lock) as any);

    const { readLockFile } = await import('../src/core/lock.js');
    const result = await readLockFile('/tmp/skills-lock.json');

    expect(result.version).toBe(2);
    expect(result.skills['skill-a']).toBeDefined();
  });

  it('v1 필드(source, sourceType, computedHash) 보존 확인', async () => {
    const v1Lock = {
      'codebase-analysis': {
        source: 'solatis/claude-config',
        sourceType: 'github',
        computedHash: '22c3ce1dc97fc7d8eec04d93ae367d8b7b07743902600c215a562b2762ca883a',
      },
      'flutter-architecting-apps': {
        source: 'flutter/skills',
        sourceType: 'github',
        computedHash: 'ac8212aa825c75d468c216ffada34302d0ab6e8ffc8e99d789848aba4acd30ed',
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(v1Lock) as any);

    const { readLockFile } = await import('../src/core/lock.js');
    const result = await readLockFile('/tmp/skills-lock.json');

    const skill = result.skills['codebase-analysis'];
    expect(skill.source).toBe('solatis/claude-config');
    expect(skill.sourceType).toBe('github');
    expect(skill.computedHash).toBe(
      '22c3ce1dc97fc7d8eec04d93ae367d8b7b07743902600c215a562b2762ca883a',
    );

    const skill2 = result.skills['flutter-architecting-apps'];
    expect(skill2.source).toBe('flutter/skills');
    expect(skill2.sourceType).toBe('github');
    expect(skill2.computedHash).toBe(
      'ac8212aa825c75d468c216ffada34302d0ab6e8ffc8e99d789848aba4acd30ed',
    );
  });
});

describe('mergeLocks', () => {
  it('이중 락 merge — 로컬 우선', async () => {
    const { mergeLocks } = await import('../src/core/lock.js');

    const globalLock = {
      version: 2 as const,
      skills: {
        'shared-skill': {
          name: 'shared-skill',
          description: 'global version',
          source: 'global/repo',
          sourceType: 'github' as const,
          computedHash: 'global-hash',
          installedBy: 'global',
          installedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };

    const localLock = {
      version: 2 as const,
      skills: {
        'shared-skill': {
          name: 'shared-skill',
          description: 'local version',
          source: 'local/repo',
          sourceType: 'github' as const,
          computedHash: 'local-hash',
          installedBy: 'local',
          installedAt: '2026-04-03T00:00:00.000Z',
        },
      },
    };

    const merged = mergeLocks(globalLock, localLock);

    expect(merged.skills['shared-skill'].source).toBe('local/repo');
    expect(merged.skills['shared-skill'].computedHash).toBe('local-hash');
    expect(merged.skills['shared-skill'].installedBy).toBe('local');
  });

  it('이중 락 merge — 글로벌 전용 스킬 포함', async () => {
    const { mergeLocks } = await import('../src/core/lock.js');

    const globalLock = {
      version: 2 as const,
      skills: {
        'global-only': {
          name: 'global-only',
          description: 'only in global',
          source: 'global/repo',
          sourceType: 'github' as const,
          computedHash: 'global-only-hash',
        },
      },
    };

    const localLock = {
      version: 2 as const,
      skills: {
        'local-only': {
          name: 'local-only',
          description: 'only in local',
          source: 'local/repo',
          sourceType: 'github' as const,
          computedHash: 'local-only-hash',
        },
      },
    };

    const merged = mergeLocks(globalLock, localLock);

    expect(merged.skills['global-only']).toBeDefined();
    expect(merged.skills['local-only']).toBeDefined();
    expect(Object.keys(merged.skills)).toHaveLength(2);
  });
});

describe('addSkillToLock', () => {
  it('스킬 추가/업데이트', async () => {
    const { addSkillToLock } = await import('../src/core/lock.js');

    const lock = {
      version: 2 as const,
      skills: {} as Record<string, any>,
    };

    const entry = {
      name: 'new-skill',
      description: 'A brand new skill',
      source: 'github.com/org/new-skill',
      sourceType: 'github' as const,
      computedHash: 'sha256:newskillhash',
      installedBy: 'zivo',
      installedAt: '2026-04-03T00:00:00.000Z',
    };

    const updated = addSkillToLock(lock, entry);

    expect(updated.skills['new-skill']).toBeDefined();
    expect(updated.skills['new-skill'].source).toBe('github.com/org/new-skill');
    expect(updated.skills['new-skill'].computedHash).toBe('sha256:newskillhash');
    // 원본 불변성 확인
    expect(lock.skills['new-skill']).toBeUndefined();
  });
});

describe('removeSkillFromLock', () => {
  it('스킬 제거', async () => {
    const { removeSkillFromLock } = await import('../src/core/lock.js');

    const lock = {
      version: 2 as const,
      skills: {
        'keep-skill': {
          name: 'keep-skill',
          description: 'keep',
          source: 'org/keep',
          sourceType: 'github' as const,
          computedHash: 'keephash',
        },
        'remove-skill': {
          name: 'remove-skill',
          description: 'remove',
          source: 'org/remove',
          sourceType: 'github' as const,
          computedHash: 'removehash',
        },
      },
    };

    const updated = removeSkillFromLock(lock, 'remove-skill');

    expect(updated.skills['remove-skill']).toBeUndefined();
    expect(updated.skills['keep-skill']).toBeDefined();
    // 원본 불변성 확인
    expect(lock.skills['remove-skill']).toBeDefined();
  });
});

describe('verifyIntegrity', () => {
  it('SHA 변조 감지', async () => {
    const { verifyIntegrity } = await import('../src/core/lock.js');

    const lock = {
      version: 2 as const,
      skills: {
        'tampered-skill': {
          name: 'tampered-skill',
          description: 'integrity check',
          source: 'org/repo',
          sourceType: 'github' as const,
          computedHash: 'sha256:original-hash',
        },
      },
    };

    // 올바른 해시
    expect(verifyIntegrity(lock, 'tampered-skill', 'sha256:original-hash')).toBe(true);

    // 변조된 해시
    expect(verifyIntegrity(lock, 'tampered-skill', 'sha256:tampered-hash')).toBe(false);

    // 존재하지 않는 스킬
    expect(verifyIntegrity(lock, 'nonexistent-skill', 'sha256:any-hash')).toBe(false);
  });
});
