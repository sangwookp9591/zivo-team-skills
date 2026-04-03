import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { AgentAdapter, SkillEntry } from '../types/index.js';
import { detectByPath, ensureDir, symlinkOrCopy } from './base.js';
import { assertSafeSkillName } from '../core/validators.js';

const SIDECAR_FILENAME = 'zivo-installed.json';

export class CodexAdapter implements AgentAdapter {
  readonly name = 'Codex';
  readonly configDir: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.codex');
  }

  async detect(): Promise<boolean> {
    return detectByPath(this.configDir);
  }

  /**
   * Codex는 scope 구분 없이 ~/.codex/skills/ 사용
   */
  getSkillsDir(_scope: 'project' | 'global'): string {
    return path.join(os.homedir(), '.codex', 'skills') + '/';
  }

  /**
   * 스킬을 ~/.codex/skills/{name}/ 에 copy
   * skills-curated-cache.json은 Codex CLI 관리 캐시이므로 건드리지 않음
   * 사이드카: ~/.codex/vendor_imports/zivo-installed.json
   */
  async install(
    skillName: string,
    skillPath: string,
    _method: 'symlink' | 'copy',
  ): Promise<void> {
    // Path Traversal 방어 (방어적 중복)
    assertSafeSkillName(skillName);

    const skillsDir = path.join(this.configDir, 'skills');
    await ensureDir(skillsDir);

    const dest = path.join(skillsDir, skillName);
    // Codex는 항상 copy (외부 경로 참조 대신 로컬 복사)
    await symlinkOrCopy(path.resolve(skillPath), dest, 'copy').catch((err) => {
      throw new Error(
        `[Codex] 스킬 설치 실패: ${skillName} (${skillPath} -> ${dest}): ${(err as Error).message}`,
      );
    });
  }

  async uninstall(skillName: string): Promise<void> {
    const dest = path.join(this.configDir, 'skills', skillName);
    try {
      await fs.rm(dest, { recursive: true, force: true });
    } catch {
      // 이미 없으면 무시
    }
  }

  /**
   * 사이드카 파일 작성: ~/.codex/vendor_imports/zivo-installed.json
   * skills-curated-cache.json은 절대 수정하지 않음
   */
  async writeManifest(skills: SkillEntry[]): Promise<void> {
    const vendorDir = path.join(this.configDir, 'vendor_imports');
    await ensureDir(vendorDir);

    const sidecarPath = path.join(vendorDir, SIDECAR_FILENAME);
    const payload = {
      updatedAt: new Date().toISOString(),
      managedBy: 'zivo-skills',
      skills,
    };

    await fs.writeFile(sidecarPath, JSON.stringify(payload, null, 2), 'utf-8').catch(
      (err) => {
        throw new Error(
          `[Codex] 사이드카 파일 작성 실패 (${sidecarPath}): ${(err as Error).message}`,
        );
      },
    );
  }

  async readManifest(): Promise<SkillEntry[]> {
    const sidecarPath = path.join(
      this.configDir,
      'vendor_imports',
      SIDECAR_FILENAME,
    );
    try {
      const raw = await fs.readFile(sidecarPath, 'utf-8');
      const data = JSON.parse(raw) as { skills?: SkillEntry[] };
      return data.skills ?? [];
    } catch {
      return [];
    }
  }
}
