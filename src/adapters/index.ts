import type { AgentAdapter } from '../types/index.js';
import { ClaudeAdapter } from './claude.js';
import { CodexAdapter } from './codex.js';
import { CursorAdapter } from './cursor.js';
import { GeminiAdapter } from './gemini.js';

/**
 * 모든 지원 어댑터 배열 반환
 * 순서: Claude Code, Codex, Gemini CLI, Cursor
 */
export function getAllAdapters(): AgentAdapter[] {
  return [
    new ClaudeAdapter(),
    new CodexAdapter(),
    new GeminiAdapter(),
    new CursorAdapter(),
  ];
}

/**
 * detect() === true인 어댑터만 반환
 * (실제 환경에서 설치된 AI 에이전트 감지)
 */
export async function detectInstalledAdapters(): Promise<AgentAdapter[]> {
  const adapters = getAllAdapters();
  const results = await Promise.all(
    adapters.map(async (adapter) => {
      const detected = await adapter.detect();
      return detected ? adapter : null;
    }),
  );
  return results.filter((a): a is AgentAdapter => a !== null);
}

/**
 * 이름으로 어댑터 조회 (대소문자 구분)
 */
export function getAdapterByName(name: string): AgentAdapter | undefined {
  return getAllAdapters().find((a) => a.name === name);
}

export { ClaudeAdapter } from './claude.js';
export { CodexAdapter } from './codex.js';
export { GeminiAdapter } from './gemini.js';
export { CursorAdapter } from './cursor.js';
