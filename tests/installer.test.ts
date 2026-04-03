import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

// fs/promises 모킹 (hoisted)
vi.mock('fs/promises');

// os 모킹
vi.mock('os', () => ({
  default: {
    homedir: vi.fn(() => '/home/testuser'),
    tmpdir: vi.fn(() => '/tmp'),
  },
  homedir: vi.fn(() => '/home/testuser'),
  tmpdir: vi.fn(() => '/tmp'),
}));

// adapters/base.ts의 symlinkOrCopy를 모킹하기 위해 adapters/base.js를 모킹
vi.mock('../src/adapters/base.js', () => ({
  detectByPath: vi.fn(async () => true),
  ensureDir: vi.fn(async () => undefined),
  symlinkOrCopy: vi.fn(async () => undefined),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// Test 1: symlink 설치 → 파일 접근 가능
// ──────────────────────────────────────────────────────────────────────────────
describe('installSkill — symlink', () => {
  it('symlink 설치 후 어댑터 install이 호출된다', async () => {
    const { installSkill } = await import('../src/core/installer.js');

    const mockAdapter = {
      name: 'TestAdapter',
      configDir: '/home/testuser/.test',
      detect: vi.fn(async () => true),
      getSkillsDir: vi.fn(() => '/home/testuser/.test/skills/'),
      install: vi.fn(async () => undefined),
      uninstall: vi.fn(async () => undefined),
    };

    const mockSkill = {
      frontmatter: {
        name: 'my-skill',
        description: 'A test skill',
      },
      content: '# My Skill',
      raw: '---\nname: my-skill\ndescription: A test skill\n---\n# My Skill',
    };

    // 락 파일 읽기 mock
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({ version: 2, skills: {} }) as any,
    );
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);

    const result = await installSkill(mockSkill, '/tmp/skill-source/my-skill', {
      method: 'symlink',
      scope: 'project',
      force: false,
      adapters: [mockAdapter],
    }, '/tmp/skills-lock.json');

    expect(mockAdapter.install).toHaveBeenCalledWith(
      'my-skill',
      '/tmp/skill-source/my-skill',
      'symlink',
    );
    expect(result.skillName).toBe('my-skill');
    expect(result.adapters).toHaveLength(1);
    expect(result.adapters[0].name).toBe('TestAdapter');
    expect(result.adapters[0].method).toBe('symlink');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Test 2: symlink 실패 시 copy 폴백
// ──────────────────────────────────────────────────────────────────────────────
describe('installSkill — symlink 실패 시 copy 폴백', () => {
  it('어댑터 install이 EPERM으로 실패하면 copy 메서드로 재시도한다', async () => {
    const { installSkill } = await import('../src/core/installer.js');

    let callCount = 0;
    const mockAdapter = {
      name: 'TestAdapter',
      configDir: '/home/testuser/.test',
      detect: vi.fn(async () => true),
      getSkillsDir: vi.fn(() => '/home/testuser/.test/skills/'),
      install: vi.fn(async (_name: string, _path: string, method: string) => {
        callCount++;
        if (method === 'symlink') {
          const err = Object.assign(new Error('EPERM: operation not permitted'), {
            code: 'EPERM',
          });
          throw err;
        }
        // copy는 성공
      }),
      uninstall: vi.fn(async () => undefined),
    };

    const mockSkill = {
      frontmatter: { name: 'fallback-skill', description: 'Fallback test' },
      content: '# Fallback',
      raw: '---\nname: fallback-skill\ndescription: Fallback test\n---\n# Fallback',
    };

    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({ version: 2, skills: {} }) as any,
    );
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);

    const result = await installSkill(mockSkill, '/tmp/skill-source/fallback-skill', {
      method: 'symlink',
      scope: 'project',
      force: false,
      adapters: [mockAdapter],
    }, '/tmp/skills-lock.json');

    // install이 두 번 호출됨: 1번째 symlink(실패), 2번째 copy(성공)
    expect(callCount).toBe(2);
    expect(result.adapters[0].method).toBe('copy');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Test 3: 설치 후 락 파일 업데이트
// ──────────────────────────────────────────────────────────────────────────────
describe('installSkill — 락 파일 업데이트', () => {
  it('설치 후 skills-lock.json에 스킬이 추가된다', async () => {
    const { installSkill } = await import('../src/core/installer.js');

    const mockAdapter = {
      name: 'TestAdapter',
      configDir: '/home/testuser/.test',
      detect: vi.fn(async () => true),
      getSkillsDir: vi.fn(() => '/home/testuser/.test/skills/'),
      install: vi.fn(async () => undefined),
      uninstall: vi.fn(async () => undefined),
    };

    const mockSkill = {
      frontmatter: {
        name: 'lock-skill',
        description: 'Lock update test',
        metadata: { source: 'org/repo', sourceType: 'github' as const },
      },
      content: '# Lock skill',
      raw: '---\nname: lock-skill\ndescription: Lock update test\n---\n# Lock skill',
    };

    const existingLock = { version: 2, skills: {} };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingLock) as any);

    let writtenContent = '';
    vi.mocked(fs.writeFile).mockImplementation(async (_path, content) => {
      writtenContent = content as string;
    });
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);

    const result = await installSkill(mockSkill, '/tmp/skill-source/lock-skill', {
      method: 'copy',
      scope: 'project',
      force: false,
      adapters: [mockAdapter],
    }, '/tmp/skills-lock.json');

    expect(result.lockUpdated).toBe(true);
    const written = JSON.parse(writtenContent);
    expect(written.version).toBe(2);
    expect(written.skills['lock-skill']).toBeDefined();
    expect(written.skills['lock-skill'].name).toBe('lock-skill');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Test 4: uninstallSkill → 파일 제거 + 락 업데이트
// ──────────────────────────────────────────────────────────────────────────────
describe('uninstallSkill', () => {
  it('어댑터 uninstall 호출 후 락 파일에서 스킬이 제거된다', async () => {
    const { uninstallSkill } = await import('../src/core/installer.js');

    const mockAdapter = {
      name: 'TestAdapter',
      configDir: '/home/testuser/.test',
      detect: vi.fn(async () => true),
      getSkillsDir: vi.fn(() => '/home/testuser/.test/skills/'),
      install: vi.fn(async () => undefined),
      uninstall: vi.fn(async () => undefined),
    };

    const existingLock = {
      version: 2,
      skills: {
        'remove-me': {
          name: 'remove-me',
          description: 'To be removed',
          source: 'org/repo',
          sourceType: 'github',
          computedHash: 'sha256:abc',
        },
        'keep-me': {
          name: 'keep-me',
          description: 'Keep this',
          source: 'org/repo2',
          sourceType: 'github',
          computedHash: 'sha256:def',
        },
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingLock) as any);

    let writtenContent = '';
    vi.mocked(fs.writeFile).mockImplementation(async (_path, content) => {
      writtenContent = content as string;
    });

    await uninstallSkill('remove-me', [mockAdapter], '/tmp/skills-lock.json');

    expect(mockAdapter.uninstall).toHaveBeenCalledWith('remove-me');
    const written = JSON.parse(writtenContent);
    expect(written.skills['remove-me']).toBeUndefined();
    expect(written.skills['keep-me']).toBeDefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Test 5: v1 락 마이그레이션 감지
// ──────────────────────────────────────────────────────────────────────────────
describe('detectAndMigrate — v1 락 마이그레이션', () => {
  it('v1 락 파일이 존재하면 v2로 마이그레이션하고 lockMigrated=true를 반환한다', async () => {
    const { detectAndMigrate } = await import('../src/core/migrator.js');

    const v1Lock = {
      'old-skill': {
        source: 'org/old',
        sourceType: 'github',
        computedHash: 'sha256:oldhash',
      },
    };

    let writeCallCount = 0;
    vi.mocked(fs.readFile).mockImplementation(async (p) => {
      const pathStr = String(p);
      if (pathStr.includes('skills-lock.json')) {
        return JSON.stringify(v1Lock) as any;
      }
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });
    vi.mocked(fs.access).mockImplementation(async (p) => {
      const pathStr = String(p);
      if (pathStr.includes('skills-lock.json')) return;
      if (pathStr.includes('commands')) return;
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });
    vi.mocked(fs.writeFile).mockImplementation(async () => {
      writeCallCount++;
    });
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    const result = await detectAndMigrate();

    expect(result.lockMigrated).toBe(true);
    expect(writeCallCount).toBeGreaterThan(0);
  });

  it('락 파일이 없으면 lockMigrated=false를 반환한다', async () => {
    const { detectAndMigrate } = await import('../src/core/migrator.js');

    vi.mocked(fs.access).mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    const result = await detectAndMigrate();

    expect(result.lockMigrated).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Test 6: symlink 충돌 감지
// ──────────────────────────────────────────────────────────────────────────────
describe('detectSymlinkConflicts', () => {
  it('commands/ 디렉토리에 동일 이름 symlink가 있으면 충돌 목록을 반환한다', async () => {
    const { detectSymlinkConflicts } = await import('../src/core/migrator.js');

    // readdir: commands/ 에 my-skill.md 심볼릭 링크 존재
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'my-skill.md', isSymbolicLink: () => true, isFile: () => true } as any,
      { name: 'other-skill.md', isSymbolicLink: () => true, isFile: () => true } as any,
    ] as any);

    const conflicts = await detectSymlinkConflicts('my-skill');

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toContain('my-skill');
  });

  it('commands/ 디렉토리에 해당 symlink가 없으면 빈 배열을 반환한다', async () => {
    const { detectSymlinkConflicts } = await import('../src/core/migrator.js');

    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'other-skill.md', isSymbolicLink: () => true, isFile: () => true } as any,
    ] as any);

    const conflicts = await detectSymlinkConflicts('nonexistent-skill');

    expect(conflicts).toHaveLength(0);
  });
});
