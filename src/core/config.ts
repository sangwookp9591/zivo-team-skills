import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export interface ZivoConfig {
  registryUrl: string;                       // 기본: "github.com/zivo-team/skills"
  cacheTTL: number;                          // 기본: 86400000 (24h)
  defaultScope: 'project' | 'global';       // 기본: 'project'
  defaultMethod: 'symlink' | 'copy';        // 기본: 'symlink'
  teamCode?: string;                         // 인증된 팀 코드 (한번 입력하면 저장)
}

const DEFAULT_CONFIG: ZivoConfig = {
  registryUrl: 'github.com/sangwookp9591/zivo-team-skills',
  cacheTTL: 86_400_000,
  defaultScope: 'project',
  defaultMethod: 'symlink',
};

function configFilePath(): string {
  return path.join(os.homedir(), '.zivo-skills', 'config.json');
}

/**
 * loadConfig — ~/.zivo-skills/config.json 읽기.
 * 파일이 없거나 파싱 실패 시 기본값 반환.
 */
export async function loadConfig(): Promise<ZivoConfig> {
  const filePath = configFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ZivoConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * saveConfig — config를 ~/.zivo-skills/config.json에 저장.
 * 디렉토리가 없으면 자동 생성.
 */
export async function saveConfig(config: ZivoConfig): Promise<void> {
  const filePath = configFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
}
