import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['contract/**/*.spec.ts'],
    environment: 'node',
  },
})
