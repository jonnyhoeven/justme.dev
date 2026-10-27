// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/splat-animations/*-utils.ts',
        'lib/splat-animations/*-constants.ts',
        'lib/transformPage.ts',
        'lib/audio/cp437.ts',
        'lib/splat-scenes/utils.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      },
      reporter: ['text', 'lcov']
    }
  }
});
