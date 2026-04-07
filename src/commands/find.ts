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
import { verifyTeamCode } from '../core/auth.js';
import { printBanner } from '../ui/banner.js';
import type { AgentAdapter } from '../types/index.js';

const DEFAULT_REGISTRY_URL = 'https://github.com/sangwookp9591/zivo-team-skills';

export interface FindOptions {
  code?: string;
  yes?: boolean;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

/**
 * `zivo-skills find` — registry에서 설치 가능한 스킬 목록을 보여주고 선택 설치
 */
export async function findCommand(options: FindOptions): Promise<void> {
  printBanner();
  p.intro('zivo-skills find');

  // ── 0. 팀 코드 인증
  await verifyTeamCode(options.code);

  const config = await loadConfig();

  // ── 1. Registry clone (한 번만)
  const spinner = p.spinner();
  spinner.start('Fetching skill registry...');

  let repoDir: string;
  try {
    repoDir = await cloneRegistry({
      registryUrl: DEFAULT_REGISTRY_URL,
      cachePath: path.join(os.homedir(), '.zivo-skills', 'cache'),
      cacheTTL: config.cacheTTL,
    });
    spinner.stop('Registry loaded.');
  } catch (err) {
    spinner.stop('Failed to load registry.');
    p.cancel((err as Error).message);
    process.exit(1);
  }

  // ── 2. 스킬 목록 발견
  const skillsMap = await discoverSkills(repoDir);

  if (skillsMap.size === 0) {
    p.cancel('No skills found in registry.');
    await cleanup(repoDir);
    process.exit(1);
  }

  // ── 3. 스킬 목록 표시 + 체크박스 선택 (description 짧게)
  const skillNames = Array.from(skillsMap.keys()).sort();

  const selected = await p.multiselect({
    message: `Found ${skillNames.length} skills. Select to install:`,
    options: skillNames.map((name) => {
      const skill = skillsMap.get(name)!;
      return {
        value: name,
        label: name,
        hint: truncate(skill.frontmatter.description, 50),
      };
    }),
    required: true,
  });

  if (p.isCancel(selected)) {
    p.cancel('Cancelled.');
    await cleanup(repoDir);
    process.exit(0);
  }

  const chosen = selected as string[];

  if (chosen.length === 0) {
    p.cancel('No skills selected.');
    await cleanup(repoDir);
    process.exit(0);
  }

  // ── 4. 설치 옵션 선택
  let scope: 'project' | 'global' = 'project';
  let method: 'symlink' | 'copy' = 'symlink';

  if (!options.yes) {
    const scopeResult = await p.select({
      message: 'Installation scope:',
      options: [
        { value: 'project', label: 'project', hint: 'Current project only' },
        { value: 'global', label: 'global', hint: 'All projects on this machine' },
      ],
    });
    if (p.isCancel(scopeResult)) {
      p.cancel('Cancelled.');
      await cleanup(repoDir);
      process.exit(0);
    }
    scope = scopeResult as 'project' | 'global';

    const methodResult = await p.select({
      message: 'Installation method:',
      options: [
        { value: 'symlink', label: 'symlink', hint: 'Link to source (stays in sync)' },
        { value: 'copy', label: 'copy', hint: 'Copy files to destination' },
      ],
    });
    if (p.isCancel(methodResult)) {
      p.cancel('Cancelled.');
      await cleanup(repoDir);
      process.exit(0);
    }
    method = methodResult as 'symlink' | 'copy';
  }

  // ── 5. 어댑터 감지
  const detectedAdapters = await detectInstalledAdapters();
  let selectedAdapters: AgentAdapter[];

  if (options.yes || detectedAdapters.length > 0) {
    selectedAdapters = detectedAdapters.length > 0 ? detectedAdapters : getAllAdapters();
  } else {
    const allAdapters = getAllAdapters();
    const adapterChoice = await p.multiselect({
      message: 'Select agents:',
      options: allAdapters.map((a) => ({ value: a.name, label: a.name })),
      required: true,
    });
    if (p.isCancel(adapterChoice)) {
      p.cancel('Cancelled.');
      await cleanup(repoDir);
      process.exit(0);
    }
    const chosenNames = new Set(adapterChoice as string[]);
    selectedAdapters = allAdapters.filter((a) => chosenNames.has(a.name));
  }

  if (selectedAdapters.length === 0) {
    p.cancel('No agents detected.');
    await cleanup(repoDir);
    process.exit(1);
  }

  // ── 6. 선택한 스킬 순차 설치 (clone된 repo 재사용)
  const lockPath = scope === 'global'
    ? path.join(os.homedir(), '.zivo-skills', 'skills-lock.json')
    : path.join(process.cwd(), 'skills-lock.json');

  let installed = 0;
  let skipped = 0;

  for (const skillName of chosen) {
    const skill = skillsMap.get(skillName)!;
    const installSpinner = p.spinner();
    installSpinner.start(`Installing ${skillName} (${installed + skipped + 1}/${chosen.length})...`);

    try {
      const conflicts = await detectSymlinkConflicts(skillName);
      if (conflicts.length > 0) {
        await Promise.all(
          conflicts.map((c) =>
            fs.unlink(c).catch(() => fs.rm(c, { recursive: true, force: true })),
          ),
        );
      }

      const permanentDir = path.join(os.homedir(), '.zivo-skills', 'store', skillName);
      await fs.rm(permanentDir, { recursive: true, force: true });
      await fs.mkdir(permanentDir, { recursive: true });

      const srcSkillDir = path.join(repoDir, 'skills', skillName);
      await copyDirRecursive(srcSkillDir, permanentDir);

      await installSkill(skill, permanentDir, {
        method,
        scope,
        force: true,
        adapters: selectedAdapters,
      }, lockPath);

      installed++;
      installSpinner.stop(`✓ ${skillName}`);
    } catch (err) {
      skipped++;
      installSpinner.stop(`✗ ${skillName}: ${(err as Error).message}`);
    }
  }

  // ── 7. 결과 요약
  const agentNames = selectedAdapters.map((a) => a.name).join(', ');
  p.outro(`Installed ${installed}/${chosen.length} skills → ${agentNames}${skipped > 0 ? ` (${skipped} failed)` : ''}`);

  await cleanup(repoDir);
}

async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
