import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { readLockFile, writeLockFile, migrateV1toV2 } from './lock.js';

export interface MigrationResult {
  lockMigrated: boolean;       // v1→v2 마이그레이션 여부
  conflictsDetected: string[]; // 충돌 symlink 목록
  skipped: string[];           // 사용자가 skip한 항목
}

/** 기존 v1 락 파일 경로 */
const LEGACY_LOCK_PATH = path.join(
  os.homedir(),
  '.claude',
  'plugins',
  'marketplaces',
  'aing-marketplace',
  'skills-lock.json',
);

/** Claude Code commands 디렉토리 */
const COMMANDS_DIR = path.join(os.homedir(), '.claude', 'commands');

/**
 * 기존 설치 상태 감지 + 처리
 *
 * 흐름:
 * 1. LEGACY_LOCK_PATH 존재 확인
 * 2. 존재하면 v1→v2 마이그레이션 (lock.ts의 migrateV1toV2 사용)
 * 3. ~/.claude/commands/ 디렉토리 스캔 → 기존 symlink 목록 반환
 * 4. ~/.claude/plugins/installed_plugins.json — 읽기 전용 참조 (수정 금지)
 */
export async function detectAndMigrate(): Promise<MigrationResult> {
  const result: MigrationResult = {
    lockMigrated: false,
    conflictsDetected: [],
    skipped: [],
  };

  // 1. v1 락 파일 존재 확인
  const lockExists = await fileExists(LEGACY_LOCK_PATH);

  if (lockExists) {
    // 2. v1→v2 마이그레이션
    try {
      const raw = await fs.readFile(LEGACY_LOCK_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;

      // v2가 아니면 마이그레이션
      if (!isV2(parsed)) {
        const v1Data = extractV1Skills(parsed);
        const v2Lock = migrateV1toV2(v1Data);
        // 기존 파일 .bak 백업 후 마이그레이션
        const backupPath = `${LEGACY_LOCK_PATH}.bak`;
        try {
          await fs.copyFile(LEGACY_LOCK_PATH, backupPath);
        } catch {
          // 백업 실패해도 마이그레이션은 진행
        }
        await writeLockFile(LEGACY_LOCK_PATH, v2Lock);
        result.lockMigrated = true;
      }
    } catch {
      // 파싱 실패는 무시
    }
  }

  // 3. ~/.claude/commands/ 디렉토리 스캔 → 기존 symlink 목록
  try {
    const entries = await fs.readdir(COMMANDS_DIR, { withFileTypes: true });
    const symlinks = entries
      .filter((e) => e.isSymbolicLink())
      .map((e) => path.join(COMMANDS_DIR, e.name));
    result.conflictsDetected = symlinks;
  } catch {
    // commands/ 디렉토리가 없으면 무시
  }

  return result;
}

/**
 * ~/.claude/commands/ symlink 충돌 감지
 *
 * 설치하려는 스킬 이름과 동일한 symlink가 ~/.claude/commands/에 있으면 충돌 플래그.
 */
export async function detectSymlinkConflicts(skillName: string): Promise<string[]> {
  const conflicts: string[] = [];

  try {
    const entries = await fs.readdir(COMMANDS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isSymbolicLink()) continue;

      // {skillName}.md 또는 {skillName} (확장자 없음) 모두 충돌로 판단
      const nameWithoutExt = entry.name.replace(/\.md$/, '');
      if (nameWithoutExt === skillName) {
        conflicts.push(path.join(COMMANDS_DIR, entry.name));
      }
    }
  } catch {
    // commands/ 디렉토리가 없으면 무시 — 충돌 없음
  }

  return conflicts;
}

// ──────────────────────────────────────────────────────────────────────────────
// 내부 헬퍼
// ──────────────────────────────────────────────────────────────────────────────

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isV2(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  return (raw as Record<string, unknown>)['version'] === 2;
}

/**
 * raw 파싱 결과에서 v1 skills 데이터 추출
 * wrapped({ version:1, skills:{...} }) 또는 raw({ skillName:{...} }) 모두 처리
 */
function extractV1Skills(
  raw: unknown,
): Record<string, { source: string; sourceType: string; computedHash: string }> {
  if (typeof raw !== 'object' || raw === null) return {};
  const obj = raw as Record<string, unknown>;

  // wrapped v1: { version: 1, skills: { ... } }
  if (obj['version'] === 1 && typeof obj['skills'] === 'object' && obj['skills'] !== null) {
    return obj['skills'] as Record<
      string,
      { source: string; sourceType: string; computedHash: string }
    >;
  }

  // raw v1: { "skill-name": { source, ... } }
  // version 필드 제외하고 반환
  const { version: _v, ...skills } = obj;
  return skills as Record<
    string,
    { source: string; sourceType: string; computedHash: string }
  >;
}
