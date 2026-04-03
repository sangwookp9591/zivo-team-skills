import * as fs from 'fs/promises';
import { createHash } from 'crypto';
import { LockFileV2, SkillEntry } from '../types/index.js';

// v1 lock 포맷 (기존 aing 생태계)
interface LockFileV1 {
  [skillName: string]: {
    source: string;
    sourceType: string;
    computedHash: string;
  };
}

// v1 감지 기준: version 필드가 없거나 1이면 v1
// 실제 v1 데이터는 두 가지 형태:
//   - raw: { "skill-name": { source, sourceType, computedHash } }
//   - wrapped: { "version": 1, "skills": { ... } }
function isV1(raw: unknown): raw is LockFileV1 {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;

  // version 필드가 없으면 v1 (raw 형태)
  if (!('version' in obj)) return true;

  // version이 1이면 v1 (wrapped 형태 — skills 안이 v1 구조)
  if (obj['version'] === 1) return true;

  return false;
}

function isWrappedV1(raw: unknown): raw is { version: 1; skills: LockFileV1 } {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  return obj['version'] === 1 && 'skills' in obj;
}

/**
 * v1 → v2 마이그레이션 (기존 필드 보존)
 */
export function migrateV1toV2(v1: LockFileV1): LockFileV2 {
  const skills: Record<string, SkillEntry> = {};

  for (const [name, entry] of Object.entries(v1)) {
    skills[name] = {
      name,
      description: '',
      source: entry.source,
      sourceType: entry.sourceType as 'github' | 'local',
      computedHash: entry.computedHash,
    };
  }

  return { version: 2, skills };
}

/**
 * 락 파일 읽기 (v1이면 자동 v2 변환)
 */
export async function readLockFile(path: string): Promise<LockFileV2> {
  const raw = await fs.readFile(path, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[lock] 손상된 lock 파일 감지 (${path}). 빈 v2 lock으로 초기화합니다.`);
    return { version: 2, skills: {} };
  }

  // wrapped v1: { version: 1, skills: { ... } }
  if (isWrappedV1(parsed)) {
    return migrateV1toV2(parsed.skills);
  }

  // raw v1: { "skill-name": { source, ... } }
  if (isV1(parsed)) {
    return migrateV1toV2(parsed as LockFileV1);
  }

  // v2
  return parsed as LockFileV2;
}

/**
 * 락 파일 쓰기
 */
export async function writeLockFile(path: string, lock: LockFileV2): Promise<void> {
  await fs.writeFile(path, JSON.stringify(lock, null, 2), 'utf-8');
}

/**
 * 이중 락 merge (로컬 > 글로벌)
 * - 같은 스킬이면 로컬 승
 * - computedHash 불일치 시 콘솔 워닝 출력
 */
export function mergeLocks(
  global: LockFileV2,
  local: LockFileV2,
  force = false,
): LockFileV2 {
  const merged: Record<string, SkillEntry> = {};

  // 글로벌 스킬 먼저 복사
  for (const [name, entry] of Object.entries(global.skills)) {
    merged[name] = { ...entry };
  }

  // 로컬 스킬 병합 (로컬 우선)
  for (const [name, localEntry] of Object.entries(local.skills)) {
    const globalEntry = global.skills[name];

    if (globalEntry) {
      // 같은 스킬이 양쪽에 존재: 해시 불일치 워닝
      if (globalEntry.computedHash !== localEntry.computedHash) {
        console.warn(
          `[lock] hash mismatch for "${name}": global=${globalEntry.computedHash} local=${localEntry.computedHash}`,
        );
      }

      // --force: 글로벌 강제 적용 (역전)
      merged[name] = force ? { ...globalEntry } : { ...localEntry };
    } else {
      // 로컬 전용 스킬
      merged[name] = { ...localEntry };
    }
  }

  return { version: 2, skills: merged };
}

/**
 * 스킬 추가/업데이트 (불변)
 */
export function addSkillToLock(lock: LockFileV2, entry: SkillEntry): LockFileV2 {
  return {
    ...lock,
    skills: {
      ...lock.skills,
      [entry.name]: { ...entry },
    },
  };
}

/**
 * 스킬 제거 (불변)
 */
export function removeSkillFromLock(lock: LockFileV2, name: string): LockFileV2 {
  const { [name]: _removed, ...rest } = lock.skills;
  return {
    ...lock,
    skills: rest,
  };
}

/**
 * SHA 검증 (변조 탐지)
 * - 스킬이 없거나 해시 불일치면 false
 */
export function verifyIntegrity(
  lock: LockFileV2,
  skillName: string,
  currentHash: string,
): boolean {
  const entry = lock.skills[skillName];
  if (!entry) return false;
  return entry.computedHash === currentHash;
}

/**
 * 문자열로부터 SHA-256 해시 생성 (hex prefix 포함)
 */
export function computeSha256(content: string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex');
}
