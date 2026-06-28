import { defineConfig } from 'vitest/config'
import { createRequire } from 'node:module'

// `ai` / `ai/test` are not direct deps of this package; they are installed for
// `@chituma/core`. Resolve them from core's location so offline tests can build
// a Chituma backed by MockLanguageModelV1.
const coreRequire = createRequire(new URL('../core/package.json', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^ai\/test$/, replacement: coreRequire.resolve('ai/test') },
      { find: /^ai$/, replacement: coreRequire.resolve('ai') },
    ],
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
  },
})
