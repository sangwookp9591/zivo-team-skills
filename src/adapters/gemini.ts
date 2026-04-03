import * as os from 'os';
import * as path from 'path';
import type { AgentAdapter } from '../types/index.js';
import { detectByPath, ensureDir, symlinkOrCopy } from './base.js';
import { assertSafeSkillName } from '../core/validators.js';

export class GeminiAdapter implements AgentAdapter {
  readonly name = 'Gemini CLI';
  readonly configDir: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.gemini');
  }

  async detect(): Promise<boolean> {
    return detectByPath(this.configDir);
  }

  /**
   * Gemini CLI는 디렉토리 기반 설치 — ~/.gemini/extensions/
   */
  getSkillsDir(_scope: 'project' | 'global'): string {
    return path.join(os.homedir(), '.gemini', 'extensions') + '/';
  }

  /**
   * 스킬을 ~/.gemini/extensions/{name}/ 에 복사
   * 매니페스트 불필요 — 디렉토리 존재 자체가 설치 상태
   */
  async install(
    skillName: string,
    skillPath: string,
    method: 'symlink' | 'copy',
  ): Promise<void> {
    // Path Traversal 방어 (방어적 중복)
    assertSafeSkillName(skillName);

    const extensionsDir = path.join(this.configDir, 'extensions');
    await ensureDir(extensionsDir);

    const dest = path.join(extensionsDir, skillName);
    await symlinkOrCopy(path.resolve(skillPath), dest, method).catch((err) => {
      throw new Error(
        `[Gemini CLI] 스킬 설치 실패: ${skillName} (${skillPath} -> ${dest}): ${(err as Error).message}`,
      );
    });
  }

  async uninstall(skillName: string): Promise<void> {
    const dest = path.join(this.configDir, 'extensions', skillName);
    try {
      const { rm } = await import('fs/promises');
      await rm(dest, { recursive: true, force: true });
    } catch {
      // 이미 없으면 무시
    }
  }

  // writeManifest: Gemini CLI는 디렉토리 기반 — no-op
  // (인터페이스의 optional writeManifest를 구현하지 않음)
}
