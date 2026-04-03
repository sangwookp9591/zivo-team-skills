import * as os from 'os';
import * as path from 'path';
import { readLockFile } from '../core/lock.js';
import type { LockFileV2 } from '../types/index.js';

export interface ListOptions {
  global?: boolean;
}

function getLockPath(scope: 'project' | 'global'): string {
  if (scope === 'global') {
    return path.join(os.homedir(), '.zivo-skills', 'skills-lock.json');
  }
  return path.join(process.cwd(), 'skills-lock.json');
}

function shortHash(hash: string): string {
  if (!hash) return '—';
  // sha256:abcdef1234... → abcdef12
  const hex = hash.startsWith('sha256:') ? hash.slice(7) : hash;
  return hex.slice(0, 8);
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  } catch {
    return '—';
  }
}

function printTable(lock: LockFileV2): void {
  const entries = Object.values(lock.skills);

  if (entries.length === 0) {
    console.log('No skills installed.');
    return;
  }

  // 컬럼 너비 계산
  const COL = {
    name:   Math.max(4, ...entries.map((e) => e.name.length)),
    source: Math.max(6, ...entries.map((e) => e.source.length)),
    date:   10,
    hash:   8,
  };

  const sep = (n: number) => '─'.repeat(n);
  const pad = (s: string, n: number) => s.padEnd(n);

  const header =
    `  ${pad('Name', COL.name)}  ${pad('Source', COL.source)}  ${pad('Date', COL.date)}  Hash`;
  const divider =
    `  ${sep(COL.name)}  ${sep(COL.source)}  ${sep(COL.date)}  ${sep(COL.hash)}`;

  console.log('');
  console.log(header);
  console.log(divider);

  for (const entry of entries) {
    const row =
      `  ${pad(entry.name, COL.name)}  ${pad(entry.source, COL.source)}  ${pad(formatDate(entry.installedAt), COL.date)}  ${shortHash(entry.computedHash)}`;
    console.log(row);
  }

  console.log('');
  console.log(`${entries.length} skill${entries.length !== 1 ? 's' : ''} installed.`);
  console.log('');
}

/**
 * `zivo-skills list` — 설치된 스킬 목록 표시
 */
export async function listCommand(options: ListOptions): Promise<void> {
  const scope = options.global ? 'global' : 'project';
  const lockPath = getLockPath(scope);

  let lock: LockFileV2;
  try {
    lock = await readLockFile(lockPath);
  } catch {
    lock = { version: 2, skills: {} };
  }

  printTable(lock);
}
