import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/agent/index.ts',
    'src/tools/index.ts',
    'src/workflows/index.ts',
    'src/llm/index.ts',
    'src/store/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  unbundle: true,
})
