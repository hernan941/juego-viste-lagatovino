import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/game/domain/**', 'src/game/data/**', 'src/game/plugins/**', 'src/game/systems/**'],
      exclude: ['**/*.gitkeep', '**/*.json'],
      // ADR 0012: 90 % en domain/ y data/ (schema), 80 % en plugins/ y systems/.
      // Las carpetas vacías no producen archivos que medir, así que no fallan por vacío.
      thresholds: {
        'src/game/domain/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/game/data/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/game/plugins/**': { lines: 80, functions: 80, branches: 80, statements: 80 },
        'src/game/systems/**': { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  },
});
