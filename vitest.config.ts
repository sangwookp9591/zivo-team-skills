import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // ESM 모듈 모킹을 위해 experimentalVmThreads 대신 기본 forks 사용
    pool: 'forks',
    // 각 테스트 파일마다 모듈 캐시 초기화 (vi.mock 격리)
    isolate: true,
  },
});
