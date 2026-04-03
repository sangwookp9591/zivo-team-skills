import * as fs from 'fs/promises';
import * as path from 'path';

interface CacheEntry {
  data: string;
  timestamp: number;
}

function cacheFilePath(cachePath: string, key: string): string {
  // Sanitize key for filesystem safety
  const safeKey = key.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return path.join(cachePath, `${safeKey}.json`);
}

/**
 * readCache — TTL 체크 후 캐시 데이터 반환.
 * offline=true 시 TTL 무시하고 만료된 캐시도 반환 (오프라인 폴백).
 */
export async function readCache(
  cachePath: string,
  key: string,
  ttl: number,
  offline = false,
): Promise<string | null> {
  const filePath = cacheFilePath(cachePath, key);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const entry: CacheEntry = JSON.parse(raw as string);
    const age = Date.now() - entry.timestamp;
    if (!offline && age > ttl) {
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * writeCache — 데이터를 타임스탬프와 함께 JSON으로 저장.
 */
export async function writeCache(
  cachePath: string,
  key: string,
  data: string,
): Promise<void> {
  await fs.mkdir(cachePath, { recursive: true });
  const filePath = cacheFilePath(cachePath, key);
  const entry: CacheEntry = { data, timestamp: Date.now() };
  await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
}

/**
 * clearCache — 캐시 디렉토리 전체 삭제.
 */
export async function clearCache(cachePath: string): Promise<void> {
  try {
    await fs.rm(cachePath, { recursive: true, force: true });
  } catch {
    // 이미 없으면 무시
  }
}
