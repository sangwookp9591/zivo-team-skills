/**
 * assertSafeSkillName — Path Traversal 방어
 *
 * 스킬 이름은 영문자/숫자/하이픈/언더스코어만 허용.
 * 슬래시, 점, 공백 등 경로 조작 문자 차단.
 */
export function assertSafeSkillName(name: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_\-]*$/.test(name) || name.includes('..')) {
    throw new Error(
      `Invalid skill name: "${name}". Only alphanumeric, hyphens, and underscores allowed.`,
    );
  }
}
