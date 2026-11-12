// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Everything under lib/ plus the shared music state. Files without unit
      // tests (most splat animations) are deliberately counted so the global
      // number reflects reality instead of a hand-picked 100%.
      include: ['lib/**/*.ts', '.vitepress/theme/composables/useMusic.ts'],
      thresholds: {
        // Floor for the whole measured set (measured 2026-11: ~55/40/46/56).
        lines: 50,
        functions: 40,
        branches: 35,
        statements: 50,
        // Per-file / per-glob floors, a few points under the measured values.
        '**/lib/audio/xm-player.ts': {
          lines: 58,
          functions: 48,
          branches: 38,
          statements: 56
        },
        '**/.vitepress/theme/composables/useMusic.ts': {
          lines: 71,
          functions: 56,
          branches: 45,
          statements: 66
        },
        '**/lib/splat-scenes/**': {
          lines: 35,
          functions: 22,
          branches: 5,
          statements: 34
        },
        '**/lib/splat-animations/{animation-constants,audio-utils,color-utils,timestep}.ts':
          {
            lines: 95,
            functions: 95,
            branches: 95,
            statements: 95
          },
        '**/lib/{transformPage,image-utils}.ts': {
          lines: 95,
          functions: 95,
          branches: 78,
          statements: 80
        },
        '**/lib/audio/cp437.ts': {
          lines: 95,
          functions: 95,
          branches: 95,
          statements: 95
        }
      },
      reporter: ['text', 'lcov']
    }
  }
});
