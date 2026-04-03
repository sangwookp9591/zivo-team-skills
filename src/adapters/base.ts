import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * detectByPath — 디렉토리 존재 여부로 에이전트 감지
 */
export async function detectByPath(configDir: string): Promise<boolean> {
  try {
    await fs.access(configDir);
    return true;
  } catch {
    return false;
  }
}

/**
 * ensureDir — 디렉토리가 없으면 생성 (recursive)
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * symlinkOrCopy — symlink 시도, 실패 시 copy 폴백
 * method가 'copy'이면 바로 copy 수행
 */
export async function symlinkOrCopy(
  src: string,
  dest: string,
  method: 'symlink' | 'copy',
): Promise<void> {
  if (method === 'copy') {
    await copyRecursive(src, dest);
    return;
  }

  // symlink 시도
  try {
    // dest가 이미 존재하면 제거 후 재생성
    try {
      await fs.unlink(dest);
    } catch {
      // 존재하지 않으면 무시
    }
    await fs.symlink(src, dest);
  } catch (err) {
    // symlink 실패 시 copy 폴백
    console.warn(
      `[base] symlink 실패 (${src} -> ${dest}): ${(err as Error).message}. copy로 폴백합니다.`,
    );
    await copyRecursive(src, dest);
  }
}

async function copyRecursive(src: string, dest: string): Promise<void> {
  // lstat 사용: symlink follow 방지
  const lstat = await fs.lstat(src);

  if (lstat.isSymbolicLink()) {
    // symlink 감지 시 skip + 경고 (symlink 공격 방어)
    console.warn(`[base] copyRecursive: symlink 감지, 건너뜁니다: ${src}`);
    return;
  }

  if (lstat.isDirectory()) {
    await ensureDir(dest);
    const entries = await fs.readdir(src);
    await Promise.all(
      entries.map((entry) =>
        copyRecursive(path.join(src, entry), path.join(dest, entry)),
      ),
    );
  } else {
    await fs.copyFile(src, dest);
  }
}
