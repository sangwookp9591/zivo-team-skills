import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { AgentAdapter, SkillEntry } from '../types/index.js';
import { detectByPath, ensureDir, symlinkOrCopy } from './base.js';
import { assertSafeSkillName } from '../core/validators.js';

export class ClaudeAdapter implements AgentAdapter {
  readonly name = 'Claude Code';
  readonly configDir: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.claude');
  }

  async detect(): Promise<boolean> {
    return detectByPath(this.configDir);
  }

  /**
   * project scope: .claude/skills/ (프로젝트 로컬)
   * global scope:  ~/.claude/skills/
   */
  getSkillsDir(scope: 'project' | 'global'): string {
    if (scope === 'project') {
      return '.claude/skills/';
    }
    return path.join(os.homedir(), '.claude', 'skills') + '/';
  }

  /**
   * 스킬을 `.claude/skills/{name}/` 에 symlink/copy
   * `.claude/commands/{name}.md` 에도 symlink (명령어 연동)
   * installed_plugins.json은 읽기 전용 참조 — 수정 금지
   */
  async install(
    skillName: string,
    skillPath: string,
    method: 'symlink' | 'copy',
  ): Promise<void> {
    // Path Traversal 방어 (방어적 중복)
    assertSafeSkillName(skillName);

    // 프로젝트 스코프 설치 (기본)
    const skillsDir = '.claude/skills';
    const commandsDir = '.claude/commands';

    await ensureDir(skillsDir);
    await ensureDir(commandsDir);

    const skillDest = path.join(skillsDir, skillName);
    await symlinkOrCopy(path.resolve(skillPath), skillDest, method).catch((err) => {
      throw new Error(
        `[Claude Code] 스킬 설치 실패: ${skillName} (${skillPath} -> ${skillDest}): ${(err as Error).message}`,
      );
    });

    // commands/{name}.md symlink — skill 디렉토리 내 README.md 또는 index.md 연결 시도
    const commandFile = path.join(commandsDir, `${skillName}.md`);
    const candidateMd = [
      path.join(skillDest, 'README.md'),
      path.join(skillDest, 'index.md'),
      path.join(skillDest, `${skillName}.md`),
    ];

    for (const candidate of candidateMd) {
      try {
        await fs.access(candidate);
        await symlinkOrCopy(path.resolve(candidate), commandFile, method).catch(
          () => {
            // command symlink 실패는 non-fatal (skill 자체는 설치됨)
            console.warn(
              `[Claude Code] commands symlink 실패: ${commandFile} — 건너뜁니다.`,
            );
          },
        );
        break;
      } catch {
        // 후보 파일 없음, 다음 시도
      }
    }
  }

  async uninstall(skillName: string): Promise<void> {
    const targets = [
      path.join('.claude', 'skills', skillName),
      path.join('.claude', 'commands', `${skillName}.md`),
    ];

    await Promise.all(
      targets.map(async (target) => {
        try {
          const stat = await fs.lstat(target);
          if (stat.isDirectory()) {
            await fs.rm(target, { recursive: true, force: true });
          } else {
            await fs.unlink(target);
          }
        } catch {
          // 이미 없으면 무시
        }
      }),
    );
  }

  // installed_plugins.json은 읽기 전용 참조만 허용
  async readManifest(): Promise<SkillEntry[]> {
    const manifestPath = path.join(this.configDir, 'installed_plugins.json');
    try {
      const raw = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(raw) as unknown;
      if (Array.isArray(data)) {
        return data as SkillEntry[];
      }
      return [];
    } catch {
      return [];
    }
  }

  // writeManifest: installed_plugins.json 수정 금지 — no-op
  async writeManifest(_skills: SkillEntry[]): Promise<void> {
    // Claude Code의 installed_plugins.json은 읽기 전용 참조.
    // zivo-skills는 이 파일을 수정하지 않습니다.
  }
}
