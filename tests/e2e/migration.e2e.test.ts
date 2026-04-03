/**
 * E2E tests for v1 → v2 lock file migration using real filesystem (tmp dir).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { readLockFile, migrateV1toV2 } from '../../src/core/lock.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zivo-e2e-migration-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Test 4: v1 → v2 마이그레이션 ────────────────────────────────────────────
describe('E2E: v1 → v2 lock file migration', () => {
  it('v1 형식 skills-lock.json을 읽으면 v2 형식으로 자동 변환된다', async () => {
    // 1. v1 형식 파일 생성
    const v1Lock = {
      'codebase-analysis': {
        source: 'solatis/claude-config',
        sourceType: 'github',
        computedHash: '22c3ce1dc97fc7d8eec04d93ae367d8b7b07743902600c215a562b2762ca883a',
      },
      'flutter-architecting-apps': {
        source: 'flutter/skills',
        sourceType: 'github',
        computedHash: 'ac8212aa825c75d468c216ffada34302d0ab6e8ffc8e99d789848aba4acd30ed',
      },
    };

    const lockPath = path.join(tmpDir, 'skills-lock.json');
    await fs.writeFile(lockPath, JSON.stringify(v1Lock, null, 2), 'utf-8');

    // 2. readLockFile 호출 → v2 자동 변환
    const result = await readLockFile(lockPath);

    // 3. v2 구조 확인
    expect(result.version).toBe(2);
    expect(result.skills).toBeDefined();

    // 4. 모든 스킬이 마이그레이션됐는지 확인
    expect(result.skills['codebase-analysis']).toBeDefined();
    expect(result.skills['flutter-architecting-apps']).toBeDefined();

    // 5. v1 필드 보존 확인
    const skill1 = result.skills['codebase-analysis']!;
    expect(skill1.name).toBe('codebase-analysis');
    expect(skill1.source).toBe('solatis/claude-config');
    expect(skill1.sourceType).toBe('github');
    expect(skill1.computedHash).toBe(
      '22c3ce1dc97fc7d8eec04d93ae367d8b7b07743902600c215a562b2762ca883a',
    );

    const skill2 = result.skills['flutter-architecting-apps']!;
    expect(skill2.name).toBe('flutter-architecting-apps');
    expect(skill2.source).toBe('flutter/skills');
    expect(skill2.sourceType).toBe('github');
    expect(skill2.computedHash).toBe(
      'ac8212aa825c75d468c216ffada34302d0ab6e8ffc8e99d789848aba4acd30ed',
    );
  });

  it('wrapped v1 (version: 1 + skills 객체) 형식도 v2로 마이그레이션된다', async () => {
    const wrappedV1 = {
      version: 1,
      skills: {
        'wrapped-skill': {
          source: 'org/repo',
          sourceType: 'github',
          computedHash: 'sha256:abc123def456',
        },
      },
    };

    const lockPath = path.join(tmpDir, 'wrapped-v1-lock.json');
    await fs.writeFile(lockPath, JSON.stringify(wrappedV1, null, 2), 'utf-8');

    const result = await readLockFile(lockPath);

    expect(result.version).toBe(2);
    expect(result.skills['wrapped-skill']).toBeDefined();
    expect(result.skills['wrapped-skill'].name).toBe('wrapped-skill');
    expect(result.skills['wrapped-skill'].source).toBe('org/repo');
  });

  it('이미 v2 형식인 파일은 그대로 반환된다', async () => {
    const v2Lock = {
      version: 2,
      skills: {
        'modern-skill': {
          name: 'modern-skill',
          description: 'A v2 skill',
          source: 'org/modern',
          sourceType: 'github',
          computedHash: 'sha256:modernhash',
          installedAt: '2026-04-03T00:00:00.000Z',
        },
      },
    };

    const lockPath = path.join(tmpDir, 'v2-lock.json');
    await fs.writeFile(lockPath, JSON.stringify(v2Lock, null, 2), 'utf-8');

    const result = await readLockFile(lockPath);

    expect(result.version).toBe(2);
    expect(result.skills['modern-skill']).toBeDefined();
    expect(result.skills['modern-skill'].description).toBe('A v2 skill');
    expect(result.skills['modern-skill'].installedAt).toBe('2026-04-03T00:00:00.000Z');
  });

  it('migrateV1toV2 직접 호출 — 빈 v1 락도 정상 처리', async () => {
    const emptyV1 = {};
    const result = migrateV1toV2(emptyV1);

    expect(result.version).toBe(2);
    expect(result.skills).toEqual({});
  });
});
