import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// esbuild cannot emit decorator metadata, which Nest's constructor injection relies on.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
