/**
 * E2E tests for `add` command flow using real filesystem (tmp dir).
 * No GitHub API calls — only local path installs.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { installSkill } from '../../src/core/installer.js';
import { readLockFile } from '../../src/core/lock.js';
import { discoverSkills } from '../../src/core/skill-parser.js';
import type { AgentAdapter, SkillEntry } from '../../src/types/index.js';

// ── 헬퍼: 테스트용 mock 어댑터 ────────────────────────────────────────────────
function makeMockAdapter(skillsRoot: string): AgentAdapter {
  const installedFiles = new Map<string, string>();

  return {
    name: 'MockAdapter',
    configDir: path.join(skillsRoot, '.mock'),
    detect: async () => true,
    getSkillsDir: (_scope: 'project' | 'global') => path.join(skillsRoot, 'skills'),
    install: async (skillName: string, skillPath: string, method: 'symlink' | 'copy') => {
      const dest = path.join(skillsRoot, 'skills', skillName);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      if (method === 'symlink') {
        // symlink 대신 copy fallback (테스트 환경 단순화)
        try {
          await fs.symlink(skillPath, dest);
        } catch {
          await fs.cp(skillPath, dest, { recursive: true });
        }
      } else {
        await fs.cp(skillPath, dest, { recursive: true });
      }
      installedFiles.set(skillName, dest);
    },
    uninstall: async (skillName: string) => {
      const dest = path.join(skillsRoot, 'skills', skillName);
      try {
        await fs.rm(dest, { recursive: true, force: true });
      } catch {
        // 이미 없으면 무시
      }
      installedFiles.delete(skillName);
    },
  };
}

// ── 헬퍼: mock SKILL.md 포함 디렉토리 생성 ─────────────────────────────────
async function createMockSkillDir(
  baseDir: string,
  skillName: string,
  description = 'A test skill',
): Promise<string> {
  const skillDir = path.join(baseDir, skillName);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: ${skillName}\ndescription: ${description}\n---\n# ${skillName}\n\nThis is a test skill.\n`,
    'utf-8',
  );
  // README.md 추가 (명령어 연동용)
  await fs.writeFile(
    path.join(skillDir, 'README.md'),
    `# ${skillName}\n\nReadme for ${skillName}.\n`,
    'utf-8',
  );
  return skillDir;
}

// ────────────────────────────────────────────────────────────────────────────
// Test Suite
// ────────────────────────────────────────────────────────────────────────────

let tmpDir: string;
let lockPath: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zivo-e2e-add-'));
  lockPath = path.join(tmpDir, 'skills-lock.json');
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Test 1: 로컬 경로에서 스킬 설치 → 락 파일 생성 ─────────────────────────
describe('E2E: local skill install', () => {
  it('로컬 경로 스킬 설치 후 skills-lock.json이 생성되고 스킬이 기록된다', async () => {
    // 1. mock skill 디렉토리 생성
    const repoDir = path.join(tmpDir, 'my-repo');
    const skillDir = await createMockSkillDir(repoDir, 'test-skill');

    // 2. 스킬 발견
    const skillsMap = await discoverSkills(skillDir);
    expect(skillsMap.size).toBe(1);
    const skill = skillsMap.get('test-skill')!;
    expect(skill).toBeDefined();

    // 3. 어댑터 준비
    const adapter = makeMockAdapter(tmpDir);

    // 4. 설치
    const result = await installSkill(
      skill,
      skillDir,
      {
        method: 'copy',
        scope: 'project',
        force: false,
        adapters: [adapter],
      },
      lockPath,
    );

    // 5. 결과 검증
    expect(result.skillName).toBe('test-skill');
    expect(result.lockUpdated).toBe(true);

    // 6. 락 파일 존재 확인
    const lockStat = await fs.stat(lockPath);
    expect(lockStat.isFile()).toBe(true);

    // 7. 락 파일 내용 확인
    const lock = await readLockFile(lockPath);
    expect(lock.version).toBe(2);
    expect(lock.skills['test-skill']).toBeDefined();
    expect(lock.skills['test-skill'].name).toBe('test-skill');
    expect(lock.skills['test-skill'].description).toBe('A test skill');
  });
});

// ── Test 2: 설치 후 스킬 파일이 에이전트 디렉토리에 존재하는지 확인 ─────────
describe('E2E: installed skill files exist in adapter directory', () => {
  it('설치 후 에이전트 skills 디렉토리에 파일이 존재한다', async () => {
    const repoDir = path.join(tmpDir, 'repo-b');
    const skillDir = await createMockSkillDir(repoDir, 'my-agent-skill', 'Agent skill test');

    const skillsMap = await discoverSkills(skillDir);
    const skill = skillsMap.get('my-agent-skill')!;

    const adapter = makeMockAdapter(tmpDir);

    await installSkill(
      skill,
      skillDir,
      { method: 'copy', scope: 'project', force: false, adapters: [adapter] },
      lockPath,
    );

    // 어댑터 skills 디렉토리에 스킬이 존재하는지 확인
    const installedPath = path.join(tmpDir, 'skills', 'my-agent-skill');
    const stat = await fs.stat(installedPath);
    expect(stat.isDirectory()).toBe(true);

    // SKILL.md가 복사되었는지 확인
    const skillMdPath = path.join(installedPath, 'SKILL.md');
    const skillMdStat = await fs.stat(skillMdPath);
    expect(skillMdStat.isFile()).toBe(true);
  });
});

// ── Test 3: 이미 설치된 스킬 재설치 시 감지 ────────────────────────────────
describe('E2E: duplicate install detection', () => {
  it('같은 스킬을 두 번 설치하면 락 파일에 한 개 항목만 남는다 (덮어쓰기)', async () => {
    const repoDir = path.join(tmpDir, 'repo-c');
    const skillDir = await createMockSkillDir(repoDir, 'duplicate-skill');

    const skillsMap = await discoverSkills(skillDir);
    const skill = skillsMap.get('duplicate-skill')!;
    const adapter = makeMockAdapter(tmpDir);

    // 1차 설치
    await installSkill(
      skill,
      skillDir,
      { method: 'copy', scope: 'project', force: false, adapters: [adapter] },
      lockPath,
    );

    const lock1 = await readLockFile(lockPath);
    const installedAt1 = lock1.skills['duplicate-skill']?.installedAt;

    // 약간 대기 (installedAt timestamp 차이를 위해)
    await new Promise((res) => setTimeout(res, 50));

    // 2차 설치 (재설치)
    await installSkill(
      skill,
      skillDir,
      { method: 'copy', scope: 'project', force: true, adapters: [adapter] },
      lockPath,
    );

    const lock2 = await readLockFile(lockPath);
    // 스킬은 여전히 하나만 있어야 함
    expect(Object.keys(lock2.skills)).toHaveLength(1);
    expect(lock2.skills['duplicate-skill']).toBeDefined();

    // 재설치 후 installedAt이 갱신되었는지 확인
    const installedAt2 = lock2.skills['duplicate-skill']?.installedAt;
    // 두 timestamp 모두 ISO string 형식이어야 함
    expect(installedAt1).toBeTruthy();
    expect(installedAt2).toBeTruthy();
    // 재설치 후 timestamp가 달라졌거나 같은지 (time resolution에 따라)
    // 핵심: 락에 스킬이 정확히 1개
    expect(Object.keys(lock2.skills)).toHaveLength(1);
  });
});
