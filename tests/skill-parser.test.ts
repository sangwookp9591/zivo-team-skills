import { describe, it, expect } from 'vitest';
import { parseSkillFile, validateFrontmatter } from '../src/core/skill-parser.js';

// Real-world SKILL.md content (aing Jay agent)
const VALID_SKILL_RAW = `---
name: jay
description: Backend engineer of aing. Implements API endpoints and server-side logic with TDD.
triggers:
  - backend
  - api
  - tdd
metadata:
  role: backend
  team: aing
---

# Jay - Backend Engineer

You are Jay, the Backend engineer of aing.

## Role
- API endpoint design and implementation
- Server-side business logic
- Backend testing (TDD enforced)
`;

describe('parseSkillFile', () => {
  it('parses valid frontmatter correctly', () => {
    const result = parseSkillFile(VALID_SKILL_RAW);

    expect(result.frontmatter.name).toBe('jay');
    expect(result.frontmatter.description).toBe(
      'Backend engineer of aing. Implements API endpoints and server-side logic with TDD.'
    );
  });

  it('parses triggers array', () => {
    const result = parseSkillFile(VALID_SKILL_RAW);

    expect(result.frontmatter.triggers).toEqual(['backend', 'api', 'tdd']);
  });

  it('preserves markdown body content', () => {
    const result = parseSkillFile(VALID_SKILL_RAW);

    expect(result.content).toContain('# Jay - Backend Engineer');
    expect(result.content).toContain('API endpoint design and implementation');
  });

  it('stores raw original string', () => {
    const result = parseSkillFile(VALID_SKILL_RAW);

    expect(result.raw).toBe(VALID_SKILL_RAW);
  });

  it('throws error when name is missing', () => {
    const raw = `---
description: Some description
---

body
`;
    expect(() => parseSkillFile(raw)).toThrow(/name/i);
  });

  it('throws error when description is missing', () => {
    const raw = `---
name: my-skill
---

body
`;
    expect(() => parseSkillFile(raw)).toThrow(/description/i);
  });

  it('throws error on empty file', () => {
    expect(() => parseSkillFile('')).toThrow();
  });

  it('parses optional metadata as Record', () => {
    const result = parseSkillFile(VALID_SKILL_RAW);

    expect(result.frontmatter.metadata).toEqual({ role: 'backend', team: 'aing' });
  });

  it('works without optional triggers and metadata', () => {
    const raw = `---
name: minimal-skill
description: A minimal skill with no triggers or metadata.
---

Just a body.
`;
    const result = parseSkillFile(raw);

    expect(result.frontmatter.name).toBe('minimal-skill');
    expect(result.frontmatter.triggers).toBeUndefined();
    expect(result.frontmatter.metadata).toBeUndefined();
  });
});

describe('validateFrontmatter', () => {
  it('returns typed SkillFrontmatter for valid input', () => {
    const fm = { name: 'test', description: 'A test skill' };
    const result = validateFrontmatter(fm);

    expect(result.name).toBe('test');
    expect(result.description).toBe('A test skill');
  });

  it('throws when name field is missing', () => {
    expect(() => validateFrontmatter({ description: 'no name here' })).toThrow(/name/i);
  });

  it('throws when description field is missing', () => {
    expect(() => validateFrontmatter({ name: 'no-desc' })).toThrow(/description/i);
  });

  it('throws when name is not a string', () => {
    expect(() => validateFrontmatter({ name: 123, description: 'valid' })).toThrow(/name/i);
  });

  it('accepts triggers as string array', () => {
    const fm = { name: 'skill', description: 'desc', triggers: ['a', 'b'] };
    const result = validateFrontmatter(fm);

    expect(result.triggers).toEqual(['a', 'b']);
  });
});
