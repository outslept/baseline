import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,

    include: ['test/**/*.test.ts'],
    exclude: defaultExclude,

    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/bin/**',
        'tsup.config.ts',
        'vitest.config.ts',
      ],
      include: ['src/**/*.ts'],
    },
  },
})
