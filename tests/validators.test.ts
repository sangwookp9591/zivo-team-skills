import { describe, it, expect } from 'vitest';
import { assertSafeSkillName } from '../src/core/validators.js';

describe('assertSafeSkillName', () => {
  it('허용: 일반 스킬 이름', () => {
    expect(() => assertSafeSkillName('java-springboot')).not.toThrow();
    expect(() => assertSafeSkillName('my_skill_01')).not.toThrow();
    expect(() => assertSafeSkillName('a')).not.toThrow();
    expect(() => assertSafeSkillName('CamelCase')).not.toThrow();
  });

  it('차단: 빈 문자열', () => {
    expect(() => assertSafeSkillName('')).toThrow('Invalid skill name');
  });

  it('차단: path traversal (../)', () => {
    expect(() => assertSafeSkillName('../etc/passwd')).toThrow('Invalid skill name');
    expect(() => assertSafeSkillName('skill/../../root')).toThrow('Invalid skill name');
  });

  it('차단: 슬래시 포함', () => {
    expect(() => assertSafeSkillName('path/to/skill')).toThrow('Invalid skill name');
  });

  it('차단: 점으로 시작 (hidden file)', () => {
    expect(() => assertSafeSkillName('.hidden')).toThrow('Invalid skill name');
  });

  it('차단: 공백 포함', () => {
    expect(() => assertSafeSkillName('skill name')).toThrow('Invalid skill name');
  });

  it('차단: 특수문자', () => {
    expect(() => assertSafeSkillName('skill@name')).toThrow('Invalid skill name');
    expect(() => assertSafeSkillName('skill;rm -rf')).toThrow('Invalid skill name');
  });
});
