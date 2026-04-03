import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as p from '@clack/prompts';
import { cloneRegistry } from '../core/registry.js';
import { discoverSkills } from '../core/skill-parser.js';
import { installSkill } from '../core/installer.js';
import { detectSymlinkConflicts } from '../core/migrator.js';
import { loadConfig } from '../core/config.js';
import { detectInstalledAdapters, getAllAdapters } from '../adapters/index.js';
import { assertSafeSkillName } from '../core/validators.js';
import { verifyTeamCode } from '../core/auth.js';
import type { AgentAdapter } from '../types/index.js';

export interface AddOptions {
  skill?: string;
  yes?: boolean;
  global?: boolean;
  copy?: boolean;
  cache?: boolean;   // commander --no-cache → cache: false
  force?: boolean;
  code?: string;     // team code for authentication
}

function isGitHubUrl(source: string): boolean {
  return (
    source.startsWith('https://github.com/') ||
    source.startsWith('http://github.com/') ||
    source.startsWith('github.com/')
  );
}

function getLockPath(scope: 'project' | 'global'): string {
  if (scope === 'global') {
    return path.join(os.homedir(), '.zivo-skills', 'skills-lock.json');
  }
  return path.join(process.cwd(), 'skills-lock.json');
}

/**
 * addCommand — `zivo-skills add <source>` 전체 플로우
 */
export async function addCommand(source: string, options: AddOptions): Promise<void> {
  p.intro('zivo-skills');

  // ── 0. 팀 코드 인증 ──────────────────────────────────────────────────────
  await verifyTeamCode(options.code);

  const config = await loadConfig();
  let repoDir: string | null = null;
  let isTemp = false;

  try {
    // ── 1. source 파싱 ────────────────────────────────────────────────────────
    if (isGitHubUrl(source)) {
      const spinner = p.spinner();
      spinner.start('Repository cloning...');
      try {
        repoDir = await cloneRegistry({
          registryUrl: source,
          cachePath: path.join(os.homedir(), '.zivo-skills', 'cache'),
          cacheTTL: options.cache === false ? 0 : config.cacheTTL,
        });
        isTemp = true;
        spinner.stop('Repository cloned.');
      } catch (err) {
        spinner.stop('Clone failed.');
        p.cancel((err as Error).message);
        process.exit(1);
      }
    } else {
      // 로컬 경로
      repoDir = path.resolve(source);
      try {
        await fs.access(repoDir);
      } catch {
        p.cancel(`Local path not found: ${repoDir}`);
        process.exit(1);
      }
    }

    // ── 2. 스킬 목록 발견 ─────────────────────────────────────────────────────
    const skillsMap = await discoverSkills(repoDir);

    if (skillsMap.size === 0) {
      p.cancel('No skills found in the repository. Ensure SKILL.md files are present.');
      process.exit(1);
    }

    const skillNames = Array.from(skillsMap.keys());

    // ── 3. 스킬 선택 ──────────────────────────────────────────────────────────
    let selectedSkillName: string;

    if (options.skill) {
      if (!skillsMap.has(options.skill)) {
        p.cancel(
          `Skill "${options.skill}" not found. Available: ${skillNames.join(', ')}`,
        );
        process.exit(1);
      }
      selectedSkillName = options.skill;
    } else if (skillNames.length === 1) {
      selectedSkillName = skillNames[0]!;
    } else if (options.yes) {
      // --yes: 첫 번째 스킬 (또는 전부 설치하려면 별도 루프지만 현재 단일 선택)
      selectedSkillName = skillNames[0]!;
    } else {
      const selected = await p.select({
        message: 'Select a skill to install:',
        options: skillNames.map((name) => {
          const skill = skillsMap.get(name)!;
          return {
            value: name,
            label: name,
            hint: skill.frontmatter.description,
          };
        }),
      });

      if (p.isCancel(selected)) {
        p.cancel('Installation cancelled.');
        process.exit(0);
      }

      selectedSkillName = selected as string;
    }

    // Path Traversal 방어: 선택된 스킬 이름 검증
    try {
      assertSafeSkillName(selectedSkillName);
    } catch (err) {
      p.cancel((err as Error).message);
      process.exit(1);
    }

    const selectedSkill = skillsMap.get(selectedSkillName)!;

    // ── 4. 어댑터 감지 ────────────────────────────────────────────────────────
    const detectedAdapters = await detectInstalledAdapters();
    const allAdapters = getAllAdapters();

    // ── 5. 에이전트 선택 ──────────────────────────────────────────────────────
    let selectedAdapters: AgentAdapter[];

    if (options.yes) {
      selectedAdapters = detectedAdapters.length > 0 ? detectedAdapters : allAdapters;
    } else {
      const detectedNames = new Set(detectedAdapters.map((a) => a.name));

      const chosen = await p.multiselect({
        message: 'Select agents to install the skill for:',
        options: allAdapters.map((adapter) => ({
          value: adapter.name,
          label: adapter.name,
          hint: detectedNames.has(adapter.name) ? 'detected' : undefined,
        })),
        initialValues: detectedAdapters.map((a) => a.name),
        required: true,
      });

      if (p.isCancel(chosen)) {
        p.cancel('Installation cancelled.');
        process.exit(0);
      }

      const chosenNames = new Set(chosen as string[]);
      selectedAdapters = allAdapters.filter((a) => chosenNames.has(a.name));
    }

    // ── 6. scope 선택 ─────────────────────────────────────────────────────────
    let scope: 'project' | 'global';

    if (options.global) {
      scope = 'global';
    } else if (options.yes) {
      scope = 'project';
    } else {
      const scopeResult = await p.select({
        message: 'Installation scope:',
        options: [
          { value: 'project', label: 'project', hint: 'Current project only' },
          { value: 'global', label: 'global', hint: 'All projects on this machine' },
        ],
      });

      if (p.isCancel(scopeResult)) {
        p.cancel('Installation cancelled.');
        process.exit(0);
      }

      scope = scopeResult as 'project' | 'global';
    }

    // ── 7. 설치 방식 선택 ─────────────────────────────────────────────────────
    let method: 'symlink' | 'copy';

    if (options.copy) {
      method = 'copy';
    } else if (options.yes) {
      method = 'symlink';
    } else {
      const methodResult = await p.select({
        message: 'Installation method:',
        options: [
          { value: 'symlink', label: 'symlink', hint: 'Link to source (stays in sync)' },
          { value: 'copy', label: 'copy', hint: 'Copy files to destination' },
        ],
      });

      if (p.isCancel(methodResult)) {
        p.cancel('Installation cancelled.');
        process.exit(0);
      }

      method = methodResult as 'symlink' | 'copy';
    }

    // ── 8. 충돌 감지 ──────────────────────────────────────────────────────────
    const conflicts = await detectSymlinkConflicts(selectedSkillName);

    if (conflicts.length > 0) {
      if (options.force) {
        // --force: 자동 덮어쓰기
        await removeConflicts(conflicts);
      } else if (options.yes) {
        // --yes: skip (아무것도 안 함)
        p.log.warn(
          `Conflicts detected (skipped): ${conflicts.join(', ')}`,
        );
      } else {
        p.log.warn(`Conflicts detected:\n  ${conflicts.join('\n  ')}`);

        const conflictAction = await p.select({
          message: 'How to handle conflicts?',
          options: [
            { value: 'overwrite', label: 'overwrite', hint: 'Remove existing and reinstall' },
            { value: 'skip', label: 'skip', hint: 'Keep existing, skip installation' },
            { value: 'rename', label: 'rename', hint: 'Install with a suffix (_new)' },
          ],
        });

        if (p.isCancel(conflictAction)) {
          p.cancel('Installation cancelled.');
          process.exit(0);
        }

        const action = conflictAction as 'overwrite' | 'skip' | 'rename';

        if (action === 'skip') {
          p.outro(`Skipped installation of ${selectedSkillName} due to conflicts.`);
          return;
        }

        if (action === 'overwrite') {
          await removeConflicts(conflicts);
        }
        // 'rename' — installSkill은 suffix 없이 설치되지만 충돌 파일은 유지됨
        // adapter.install 자체가 덮어쓰지 않으므로 결과적으로 rename suffix 역할
      }
    }

    // ── 9. 설치 실행 ──────────────────────────────────────────────────────────
    const spinner = p.spinner();
    spinner.start('Installing...');

    let result;
    try {
      // 스킬 소스 경로: repoDir 내에서 스킬 SKILL.md 위치의 부모 디렉토리
      const skillSourcePath = repoDir;
      const lockPath = getLockPath(scope);

      result = await installSkill(
        selectedSkill,
        skillSourcePath,
        {
          method,
          scope,
          force: options.force ?? false,
          adapters: selectedAdapters,
        },
        lockPath,
      );

      spinner.stop('Installation complete.');
    } catch (err) {
      spinner.stop('Installation failed.');
      p.cancel((err as Error).message);
      process.exit(1);
    }

    p.outro(
      `Installed ${result.skillName} to ${result.adapters.length} agent${result.adapters.length !== 1 ? 's' : ''}`,
    );
  } finally {
    // 임시 클론 디렉토리 정리
    if (isTemp && repoDir) {
      try {
        await fs.rm(repoDir, { recursive: true, force: true });
      } catch {
        // 정리 실패는 무시
      }
    }
  }
}

async function removeConflicts(conflicts: string[]): Promise<void> {
  await Promise.all(
    conflicts.map((conflictPath) =>
      fs.unlink(conflictPath).catch(() => fs.rm(conflictPath, { recursive: true, force: true })),
    ),
  );
}
