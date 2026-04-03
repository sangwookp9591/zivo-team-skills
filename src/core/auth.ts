import { createHash } from 'crypto';
import * as p from '@clack/prompts';
import { loadConfig, saveConfig } from './config.js';

/**
 * 유효한 팀 코드의 SHA-256 해시 목록.
 * 소스 코드에도 원문은 노출하지 않음 — 해시만 보관.
 *
 * 새 코드 추가 방법:
 *   node -e "console.log(require('crypto').createHash('sha256').update('NEW_CODE').digest('hex'))"
 */
const VALID_CODE_HASHES = new Set([
  // 팀 코드 해시 (원문은 팀 내부에서만 공유, 소스에는 해시만)
  '7a605ae357fb1631d9b0300da0c839996d0b5f67d2b0aded0f6a84233e828efd',
]);

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * 팀 코드 검증.
 *
 * 보안 정책:
 * - 원문 코드는 어디에도 저장하지 않음
 * - config.json에는 SHA-256 해시만 저장
 * - 소스 코드에도 해시만 보관 (원문 X)
 *
 * 플로우:
 * 1. config에 저장된 해시가 있으면 자동 통과
 * 2. --code 플래그로 전달된 코드의 해시를 검증
 * 3. 둘 다 없으면 인터랙티브 프롬프트
 * 4. 검증 성공 시 해시를 config에 저장 (다음부터 자동 통과)
 */
export async function verifyTeamCode(codeFromFlag?: string): Promise<void> {
  const config = await loadConfig();

  // 이미 인증된 경우 (저장된 해시로 검증)
  if (config.teamCode) {
    // config.teamCode에는 해시가 저장되어 있음
    if (VALID_CODE_HASHES.has(config.teamCode)) {
      return; // 자동 통과
    }
    // 저장된 해시가 유효하지 않으면 (코드가 폐기된 경우) 재인증
    delete config.teamCode;
    await saveConfig(config);
  }

  // --code 플래그로 전달된 경우
  if (codeFromFlag) {
    const hash = hashCode(codeFromFlag);
    if (VALID_CODE_HASHES.has(hash)) {
      config.teamCode = hash; // 해시만 저장
      await saveConfig(config);
      return;
    }
    console.error('✗ Invalid team code.');
    process.exit(1);
  }

  // 인터랙티브 프롬프트
  const code = await p.text({
    message: 'Team code required. Enter your team code:',
    placeholder: 'XXXX',
    validate(value) {
      if (!value || value.trim().length === 0) return 'Code is required';
    },
  });

  if (p.isCancel(code)) {
    p.cancel('Authentication cancelled.');
    process.exit(1);
  }

  const codeStr = (code as string).trim();
  const hash = hashCode(codeStr);

  if (!VALID_CODE_HASHES.has(hash)) {
    p.cancel('Invalid team code.');
    process.exit(1);
  }

  // 성공 → 해시만 저장 (원문 절대 저장 안 함)
  config.teamCode = hash;
  await saveConfig(config);
  p.log.success('Team authenticated. Saved for future use.');
}
