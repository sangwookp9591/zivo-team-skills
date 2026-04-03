export interface AgentAdapter {
  name: string;
  configDir: string;
  detect(): Promise<boolean>;
  getSkillsDir(scope: 'project' | 'global'): string;
  install(skillName: string, skillPath: string, method: 'symlink' | 'copy'): Promise<void>;
  uninstall(skillName: string): Promise<void>;
  // writeManifest는 optional (Gemini는 불필요)
  writeManifest?(skills: SkillEntry[]): Promise<void>;
  readManifest?(): Promise<SkillEntry[]>;
}

export interface SkillEntry {
  name: string;
  description: string;
  source: string;
  sourceType: 'github' | 'local';
  computedHash: string;
  installedBy?: string;
  installedAt?: string;
  adapterMeta?: Record<string, unknown>;
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  triggers?: string[];
  metadata?: Record<string, unknown>;
}

export interface LockFileV2 {
  version: 2;
  skills: Record<string, SkillEntry>;
}
