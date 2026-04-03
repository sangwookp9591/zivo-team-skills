import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readCache, writeCache } from './cache.js';

const execFileAsync = promisify(execFile);

export interface RegistryConfig {
  registryUrl: string; // "github.com/zivo-team/skills" 또는 full URL
  token?: string;      // GitHub token (optional)
  cachePath: string;   // ~/.zivo-skills/cache/
  cacheTTL: number;    // 24시간 (ms)
}

export interface RemoteSkill {
  name: string;
  path: string; // repo 내 경로
  sha: string;  // git blob SHA
}

export class RegistryError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'RegistryError';
  }
}

/**
 * toApiUrl — GitHub repo URL을 GitHub Contents API base URL로 변환.
 * "github.com/org/repo" → "https://api.github.com/repos/org/repo"
 * "https://github.com/org/repo" → "https://api.github.com/repos/org/repo"
 */
export function toApiUrl(registryUrl: string): string {
  // Strip protocol prefix if present
  let normalized = registryUrl
    .replace(/^https?:\/\//, '')
    .replace(/^github\.com\//, '');

  // Remove trailing slash and .git suffix
  normalized = normalized.replace(/\.git$/, '').replace(/\/$/, '');

  return `https://api.github.com/repos/${normalized}`;
}

/**
 * parseRemoteSkillsJson — JSON 파싱 + 스키마 검증
 * 배열 여부 + name/path/sha 필드 존재 확인
 */
function parseRemoteSkillsJson(raw: string): RemoteSkill[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RegistryError('Failed to parse cached skill list: invalid JSON', 'PARSE_ERROR');
  }
  if (!Array.isArray(parsed)) {
    throw new RegistryError('Invalid skill list format: expected array', 'PARSE_ERROR');
  }
  return parsed.filter((item): item is RemoteSkill => {
    if (typeof item !== 'object' || item === null) return false;
    const obj = item as Record<string, unknown>;
    return (
      typeof obj['name'] === 'string' &&
      typeof obj['path'] === 'string' &&
      typeof obj['sha'] === 'string'
    );
  });
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'zivo-skills-cli/0.1.0',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function githubFetch(url: string, token?: string): Promise<Response> {
  const res = await fetch(url, { headers: buildHeaders(token) });

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    const reset = res.headers.get('x-ratelimit-reset');
    const resetTime = reset
      ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString()
      : 'unknown';
    throw new RegistryError(
      `GitHub API rate limit exceeded (remaining: ${remaining ?? 0}, resets at ${resetTime}). ` +
        `Set a GitHub token via GITHUB_TOKEN env or --token flag to increase limits.`,
      'RATE_LIMITED',
    );
  }

  if (!res.ok) {
    throw new RegistryError(
      `GitHub API request failed: ${res.status} ${res.statusText} (${url})`,
      `HTTP_${res.status}`,
    );
  }

  return res;
}

/**
 * listRemoteSkills — GitHub Contents API로 스킬 목록 조회.
 * 캐시 적중 시 캐시에서 반환. 오프라인 시 만료된 캐시도 반환.
 */
export async function listRemoteSkills(
  config: RegistryConfig,
): Promise<RemoteSkill[]> {
  const apiBase = toApiUrl(config.registryUrl);
  const url = `${apiBase}/contents`;
  const cacheKey = `list_${config.registryUrl.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 캐시 확인
  const cached = await readCache(config.cachePath, cacheKey, config.cacheTTL);
  if (cached !== null) {
    return parseRemoteSkillsJson(cached);
  }

  let offline = false;

  try {
    const res = await githubFetch(url, config.token);
    const items = (await res.json()) as Array<{
      name: string;
      path: string;
      sha: string;
      type: string;
    }>;

    const skills: RemoteSkill[] = items
      .filter((item) => item.type === 'file' || item.type === 'dir')
      .map((item) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
      }));

    const raw = JSON.stringify(skills);
    await writeCache(config.cachePath, cacheKey, raw);
    return skills;
  } catch (err) {
    if (err instanceof RegistryError) throw err;
    // 네트워크 실패 → 오프라인 폴백
    offline = true;
  }

  if (offline) {
    const fallback = await readCache(config.cachePath, cacheKey, config.cacheTTL, true);
    if (fallback !== null) {
      return parseRemoteSkillsJson(fallback);
    }
    throw new RegistryError(
      'Network unavailable and no cached skill list found. Connect to the internet and try again.',
      'OFFLINE',
    );
  }

  return [];
}

/**
 * fetchSkillContent — 개별 스킬의 raw 컨텐츠 다운로드.
 * 캐시 적중 시 캐시에서 반환. 오프라인 시 만료된 캐시도 반환.
 */
export async function fetchSkillContent(
  config: RegistryConfig,
  skill: RemoteSkill,
): Promise<string> {
  const apiBase = toApiUrl(config.registryUrl);
  const url = `${apiBase}/contents/${skill.path}`;
  const cacheKey = `skill_${skill.sha}`;

  // SHA 기반 캐시 — SHA가 같으면 내용이 동일하므로 TTL 무시
  const cached = await readCache(config.cachePath, cacheKey, Infinity);
  if (cached !== null) return cached;

  let offline = false;

  try {
    const res = await githubFetch(url, config.token);
    const data = (await res.json()) as {
      content?: string;
      encoding?: string;
      download_url?: string;
    };

    let content: string;

    if (data.content && data.encoding === 'base64') {
      // GitHub API returns base64-encoded content
      content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    } else if (data.download_url) {
      // Fallback: download raw content
      const rawRes = await fetch(data.download_url);
      if (!rawRes.ok) {
        throw new RegistryError(
          `Failed to download skill content: ${rawRes.status} ${rawRes.statusText}`,
          `HTTP_${rawRes.status}`,
        );
      }
      content = await rawRes.text();
    } else {
      throw new RegistryError(
        'Unexpected GitHub API response: no content or download_url',
        'PARSE_ERROR',
      );
    }

    await writeCache(config.cachePath, cacheKey, content);
    return content;
  } catch (err) {
    if (err instanceof RegistryError) throw err;
    offline = true;
  }

  if (offline) {
    const fallback = await readCache(config.cachePath, cacheKey, Infinity, true);
    if (fallback !== null) return fallback;
    throw new RegistryError(
      `Network unavailable and no cached content for skill "${skill.name}". Connect to the internet and try again.`,
      'OFFLINE',
    );
  }

  // unreachable
  throw new RegistryError('Unexpected error in fetchSkillContent', 'UNKNOWN');
}

/**
 * cloneRegistry — git clone으로 전체 repo를 임시 디렉토리에 복제.
 * 복제된 디렉토리 경로를 반환.
 * execFile을 사용해 shell injection을 방지합니다.
 */
export async function cloneRegistry(config: RegistryConfig): Promise<string> {
  const repoUrl = config.registryUrl.startsWith('http')
    ? config.registryUrl
    : `https://${config.registryUrl}`;

  const tmpDir = path.join(os.tmpdir(), `zivo-skills-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  // token을 URL에 embed하지 않고 GIT_ASKPASS 환경변수로 credential 전달
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  if (config.token) {
    env['GIT_TERMINAL_PROMPT'] = '0';
    env['GIT_USERNAME'] = 'x-access-token';
    env['GIT_PASSWORD'] = config.token;
    // GIT_ASKPASS 스크립트: username/password 요청 시 환경변수에서 응답
    const askpassScript =
      `#!/bin/sh\ncase "$1" in\n  Username*) echo "$GIT_USERNAME" ;;\n  Password*) echo "$GIT_PASSWORD" ;;\nesac\n`;
    const askpassPath = path.join(tmpDir, '.git-askpass.sh');
    await fs.writeFile(askpassPath, askpassScript, { mode: 0o700 });
    env['GIT_ASKPASS'] = askpassPath;
  }

  try {
    await execFileAsync('git', ['clone', '--depth', '1', repoUrl, tmpDir], { env });
  } catch (err) {
    // 에러 메시지에서 토큰 정보 마스킹 후 throw
    const rawMsg = (err as Error).message;
    const safeMsg = rawMsg
      .replace(/x-access-token:[^@]+@/g, '[TOKEN]@')
      .replace(/\/\/[^:]+:[^@]+@/g, '//[CREDENTIALS]@');
    throw new RegistryError(
      `Failed to clone registry: ${safeMsg}`,
      'CLONE_FAILED',
    );
  }

  return tmpDir;
}
