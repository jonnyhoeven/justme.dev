## Codebase Review (2026-11-12)

### 3. Performance

- [ ] **Hero canvas ignores `devicePixelRatio`**: it is sized in CSS pixels, so it is soft on HiDPI screens. Try
      `min(dpr, 2)` backing size and measure the frame cost before keeping it.

### 4. Dependencies and tooling

- [ ] **`update-flake-lock` v29 wraps two node20 actions**: `DamianReeves/write-file-action` v1.3 and
      `pedrolamas/handlebars-action` v2.4.0 still run on node20. Watch for an upstream release that moves them to node24
      before runners drop node20.
- [ ] **TypeScript 7 is available** (7.0.2; the project is on 6.0.3): check `vue-tsc` and `@typescript-eslint` peer
      support before upgrading.
  - Checked 2026-11-13: `vue-tsc` (`>=5.0.0`) and `@vue/eslint-config-typescript` (`>=4.8.4`) allow it, but `typescript-eslint` pins `typescript: ">=4.8.4 <6.1.0"` — blocked on `typescript-eslint` supporting TS 7.
- [ ] **No end-to-end smoke test**: `data-animation` / `data-scene` / `data-phase` were added for testing but nothing
      uses them. Add one Playwright test: the home page hydrates without console errors, the director advances on click, and
      play/next works with a fixture `.xm`.
  - Checked 2026-11-13: `playwright` / `@playwright/test` is not in `package.json` or the Nix shell (adding new dependencies was skipped without an explicit request); verified home hydration, `.VPHero` director advance (`data-phase` / `data-scene`), footer workflow badges, `/projects`, `/blog/cilium`, and `/blog/tracker` in a live browser against `vitepress preview` (without playing audio).

### 6. Design and layout

- [ ] use local browser storage for user setting, like last volume level, last played song that kind of stuff, so a refresh does not reset stuff like the volume level.

- [ ] **Hero avatar source is 307px** but shown at up to 240 CSS px, so it is soft on 2x phones. Export a 480px version
      (needs a larger source image).

- [ ] **Idea: attract attention from the hero button while music plays**:
  - **Later:** show something interesting in the hero button while a track is playing (now playing, a small
    visualizer, pulsing with the beat) to draw people to the full player.
