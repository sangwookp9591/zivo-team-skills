import * as os from 'os';
import * as path from 'path';
import * as p from '@clack/prompts';
import { uninstallSkill } from '../core/installer.js';
import { getAllAdapters } from '../adapters/index.js';
import { assertSafeSkillName } from '../core/validators.js';

export interface RemoveOptions {
  yes?: boolean;
  global?: boolean;
}

function getLockPath(scope: 'project' | 'global'): string {
  if (scope === 'global') {
    return path.join(os.homedir(), '.zivo-skills', 'skills-lock.json');
  }
  return path.join(process.cwd(), 'skills-lock.json');
}

/**
 * `zivo-skills remove <name>` — 스킬 제거
 */
export async function removeCommand(name: string, options: RemoveOptions): Promise<void> {
  const scope = options.global ? 'global' : 'project';
  const lockPath = getLockPath(scope);

  if (!options.yes) {
    p.intro('zivo-skills remove');

    const confirmed = await p.confirm({
      message: `Remove "${name}"?`,
      initialValue: false,
    });

    if (p.isCancel(confirmed) || confirmed === false) {
      p.cancel('Removal cancelled.');
      return;
    }
  }

  const adapters = getAllAdapters();

  try {
    assertSafeSkillName(name);
    await uninstallSkill(name, adapters, lockPath);
    console.log(`✓ Removed ${name}`);
  } catch (err) {
    console.error(`✗ Failed to remove ${name}: ${(err as Error).message}`);
    process.exit(1);
  }
}
