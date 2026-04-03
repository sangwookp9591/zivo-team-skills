import * as fs from 'fs/promises';
import * as path from 'path';
import type { AgentAdapter } from '../types/index.js';
import type { ParsedSkill } from './skill-parser.js';
import {
  readLockFile,
  writeLockFile,
  addSkillToLock,
  removeSkillFromLock,
  computeSha256,
} from './lock.js';
import { assertSafeSkillName } from './validators.js';

export interface InstallOptions {
  method: 'symlink' | 'copy';
  scope: 'project' | 'global';
  force: boolean;
  adapters: AgentAdapter[];
}

export interface InstallResult {
  skillName: string;
  adapters: { name: string; path: string; method: 'symlink' | 'copy' }[];
  lockUpdated: boolean;
}

/**
 * 스킬 설치 (핵심 함수)
 *
 * 흐름:
 * 1. 각 어댑터에 대해 adapter.install(skillName, skillSourcePath, method) 호출
 * 2. symlink 실패 시 copy 폴백 (경고 출력)
 * 3. adapter.writeManifest가 있으면 호출
 * 4. 락 파일 업데이트 (addSkillToLock)
 * 5. InstallResult 반환
 */
export async function installSkill(
  skill: ParsedSkill,
  skillSourcePath: string,
  options: InstallOptions,
  lockPath: string,
): Promise<InstallResult> {
  const skillName = skill.frontmatter.name;
  // Path Traversal 방어: 스킬 이름 검증
  assertSafeSkillName(skillName);
  const adapterResults: InstallResult['adapters'] = [];

  for (const adapter of options.adapters) {
    let usedMethod = options.method;

    try {
      await adapter.install(skillName, skillSourcePath, usedMethod);
    } catch (err) {
      if (usedMethod === 'symlink') {
        // symlink 실패 → copy 폴백
        console.warn(
          `[installer] symlink 실패 (${adapter.name}): ${(err as Error).message}. copy로 폴백합니다.`,
        );
        usedMethod = 'copy';
        await adapter.install(skillName, skillSourcePath, usedMethod);
      } else {
        throw err;
      }
    }

    // writeManifest 호출 (optional)
    if (typeof adapter.writeManifest === 'function') {
      const existing = adapter.readManifest ? await adapter.readManifest() : [];
      await adapter.writeManifest(existing);
    }

    const skillsDir = adapter.getSkillsDir(options.scope);
    adapterResults.push({
      name: adapter.name,
      path: path.join(skillsDir, skillName),
      method: usedMethod,
    });
  }

  // SKILL.md 읽어서 SHA-256 해시 계산
  let computedHash = '';
  try {
    const skillMdPath = path.join(skillSourcePath, 'SKILL.md');
    const content = await fs.readFile(skillMdPath, 'utf-8');
    computedHash = computeSha256(content);
  } catch {
    // SKILL.md를 찾을 수 없으면 빈 해시 (경고 없이 진행)
  }

  // 락 파일 업데이트
  let lock = await readLockFileOrEmpty(lockPath);
  const meta = skill.frontmatter.metadata as Record<string, unknown> | undefined;
  lock = addSkillToLock(lock, {
    name: skillName,
    description: skill.frontmatter.description,
    source: (meta?.['source'] as string) ?? skillSourcePath,
    sourceType: ((meta?.['sourceType'] as 'github' | 'local') ?? 'local'),
    computedHash,
    installedAt: new Date().toISOString(),
  });
  await writeLockFile(lockPath, lock);

  return {
    skillName,
    adapters: adapterResults,
    lockUpdated: true,
  };
}

/**
 * 스킬 제거
 */
export async function uninstallSkill(
  skillName: string,
  adapters: AgentAdapter[],
  lockPath: string,
): Promise<void> {
  assertSafeSkillName(skillName);
  // 모든 어댑터에서 제거
  await Promise.all(adapters.map((adapter) => adapter.uninstall(skillName)));

  // 락 파일에서 제거
  let lock = await readLockFileOrEmpty(lockPath);
  lock = removeSkillFromLock(lock, skillName);
  await writeLockFile(lockPath, lock);
}

/**
 * 락 파일 읽기 (없으면 빈 v2 락 반환)
 */
async function readLockFileOrEmpty(lockPath: string) {
  try {
    return await readLockFile(lockPath);
  } catch {
    return { version: 2 as const, skills: {} };
  }
}
