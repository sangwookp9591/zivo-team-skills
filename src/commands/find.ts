import * as os from 'os';
import * as path from 'path';
import * as p from '@clack/prompts';
import { cloneRegistry } from '../core/registry.js';
import { discoverSkills } from '../core/skill-parser.js';
import { loadConfig } from '../core/config.js';
import { verifyTeamCode } from '../core/auth.js';
import { printBanner } from '../ui/banner.js';
import { addCommand } from './add.js';

const DEFAULT_REGISTRY_URL = 'https://github.com/sangwookp9591/zivo-team-skills';

export interface FindOptions {
  code?: string;
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

  // ── 1. Registry clone
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
    process.exit(1);
  }

  // ── 3. 스킬 목록 표시 + 체크박스 선택
  const skillNames = Array.from(skillsMap.keys()).sort();

  const selected = await p.multiselect({
    message: `Found ${skillNames.length} skills. Select to install:`,
    options: skillNames.map((name) => {
      const skill = skillsMap.get(name)!;
      return {
        value: name,
        label: name,
        hint: skill.frontmatter.description,
      };
    }),
    required: true,
  });

  if (p.isCancel(selected)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  const chosen = selected as string[];

  if (chosen.length === 0) {
    p.cancel('No skills selected.');
    process.exit(0);
  }

  // ── 4. 선택한 스킬 설치 (addCommand 재활용)
  p.log.info(`Installing ${chosen.length} skill(s): ${chosen.join(', ')}`);

  // 임시 clone 정리는 addCommand에서 관리하므로, 직접 URL로 호출
  for (const skillName of chosen) {
    await addCommand(DEFAULT_REGISTRY_URL, {
      skill: skillName,
      yes: true,
      code: options.code,
    });
  }
}
