import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/adapters/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
