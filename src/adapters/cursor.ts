import * as os from 'os';
import * as path from 'path';
import type { AgentAdapter } from '../types/index.js';
import { detectByPath, ensureDir, symlinkOrCopy } from './base.js';
import { assertSafeSkillName } from '../core/validators.js';

/**
 * CursorAdapter — 스텁 구현
 * 매니페스트 형식 TBD (Cursor 공식 플러그인 API 미확정)
 */
export class CursorAdapter implements AgentAdapter {
  readonly name = 'Cursor';
  readonly configDir: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.cursor');
  }

  async detect(): Promise<boolean> {
    return detectByPath(this.configDir);
  }

  /**
   * Cursor는 project scope만 지원 (TBD)
   * .cursor/skills/ 로 통일
   */
  getSkillsDir(_scope: 'project' | 'global'): string {
    return '.cursor/skills/';
  }

  /**
   * 스텁: .cursor/skills/{name}/ 에 설치 (매니페스트 TBD)
   */
  async install(
    skillName: string,
    skillPath: string,
    method: 'symlink' | 'copy',
  ): Promise<void> {
    // Path Traversal 방어 (방어적 중복)
    assertSafeSkillName(skillName);

    const skillsDir = path.join('.cursor', 'skills');
    await ensureDir(skillsDir);

    const dest = path.join(skillsDir, skillName);
    await symlinkOrCopy(path.resolve(skillPath), dest, method).catch((err) => {
      throw new Error(
        `[Cursor] 스킬 설치 실패: ${skillName} (${skillPath} -> ${dest}): ${(err as Error).message}`,
      );
    });
  }

  async uninstall(skillName: string): Promise<void> {
    const dest = path.join('.cursor', 'skills', skillName);
    try {
      const { rm } = await import('fs/promises');
      await rm(dest, { recursive: true, force: true });
    } catch {
      // 이미 없으면 무시
    }
  }
}
