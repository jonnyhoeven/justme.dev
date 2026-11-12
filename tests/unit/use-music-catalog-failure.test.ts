// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../data/music-initial.data', () => ({
  data: { trackers: [], tracks: [['a.xm', 'A']] }
}));
vi.mock('../../data/music.data', () => {
  throw new Error('network');
});

import { useMusic } from '../../.vitepress/theme/composables/useMusic';

describe('ensureCatalog failure', () => {
  it('keeps the initial set and flags the failure', async () => {
    const { ensureCatalog, catalogFailed, catalogLoaded, tracks } = useMusic();

    await ensureCatalog();

    expect(catalogFailed.value).toBe(true);
    expect(catalogLoaded.value).toBe(false);
    expect(tracks.value.length).toBe(1);
  });
});
