import matter from 'gray-matter';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { SkillFrontmatter } from '../types/index.js';

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  content: string; // markdown body
  raw: string; // 원본 전체
}

/**
 * Validates frontmatter fields and returns a typed SkillFrontmatter.
 * Throws if required fields (name, description) are missing or wrong type.
 */
export function validateFrontmatter(fm: Record<string, unknown>): SkillFrontmatter {
  if (!('name' in fm) || fm['name'] === undefined || fm['name'] === null) {
    throw new Error('Frontmatter validation failed: "name" field is required');
  }
  if (typeof fm['name'] !== 'string') {
    throw new Error('Frontmatter validation failed: "name" must be a string');
  }

  if (!('description' in fm) || fm['description'] === undefined || fm['description'] === null) {
    throw new Error('Frontmatter validation failed: "description" field is required');
  }
  if (typeof fm['description'] !== 'string') {
    throw new Error('Frontmatter validation failed: "description" must be a string');
  }

  const result: SkillFrontmatter = {
    name: fm['name'],
    description: fm['description'],
  };

  if ('triggers' in fm && fm['triggers'] !== undefined) {
    if (!Array.isArray(fm['triggers'])) {
      throw new Error('Frontmatter validation failed: "triggers" must be an array of strings');
    }
    result.triggers = fm['triggers'] as string[];
  }

  if ('metadata' in fm && fm['metadata'] !== undefined) {
    if (typeof fm['metadata'] !== 'object' || Array.isArray(fm['metadata'])) {
      throw new Error('Frontmatter validation failed: "metadata" must be a plain object');
    }
    result.metadata = fm['metadata'] as Record<string, unknown>;
  }

  return result;
}

/**
 * Parses a single SKILL.md file content string.
 * Throws if the content is empty or frontmatter is invalid.
 */
export function parseSkillFile(raw: string): ParsedSkill {
  if (!raw || raw.trim() === '') {
    throw new Error('SKILL.md is empty');
  }

  const parsed = matter(raw);
  const frontmatter = validateFrontmatter(parsed.data as Record<string, unknown>);

  return {
    frontmatter,
    content: parsed.content,
    raw,
  };
}

/**
 * Recursively discovers SKILL.md files under:
 *   - {dir}/SKILL.md (root)
 *   - {dir}/skills/**\/SKILL.md (recursive)
 *
 * Returns Map<skillName, ParsedSkill>
 */
export async function discoverSkills(dir: string): Promise<Map<string, ParsedSkill>> {
  const result = new Map<string, ParsedSkill>();

  // Check root SKILL.md
  const rootSkillPath = join(dir, 'SKILL.md');
  try {
    const raw = await readFile(rootSkillPath, 'utf-8');
    const parsed = parseSkillFile(raw);
    result.set(parsed.frontmatter.name, parsed);
  } catch {
    // Root SKILL.md does not exist or is invalid — skip silently
  }

  // Recursively scan skills/ directory
  const skillsDir = join(dir, 'skills');
  await scanDirectory(skillsDir, result);

  return result;
}

async function scanDirectory(dir: string, result: Map<string, ParsedSkill>): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    // Directory does not exist — skip silently
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await scanDirectory(fullPath, result);
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      try {
        const raw = await readFile(fullPath, 'utf-8');
        const parsed = parseSkillFile(raw);
        result.set(parsed.frontmatter.name, parsed);
      } catch {
        // Invalid SKILL.md — skip silently
      }
    }
  }
}
