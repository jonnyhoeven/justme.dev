## Phone Layout Follow-ups

Remaining items from the phone layout review. Needs a real-device or emulator check at 375px, 414px and 700px wide. Originally found 2026-10-04 from a static code review (the former known-issues file, now merged here); none of it has been checked on a device or in an emulator yet.

- [x] **Fallback avatar spacing** ([`components/HeroSplat.vue`](components/HeroSplat.vue)): `.fallback-image` is `position: absolute; height: 100%` with a hardcoded `padding-top: 7.5rem`, plus the 24px margin and `--vp-home-hero-padding-top-mobile` (64px). Verify it doesn't overlap the hero buttons or leave a large gap, then move it into the normal flow if needed.
  - [x] Add `width`/`height` attributes to the avatar `<img>` to avoid layout shift while loading.
- [ ] **Backdrop blur cost on mobile**: the navbar, `.VPFeature` and `.custom-block` all use `backdrop-filter: blur(...)`. Profile scrolling on a low-end phone and reduce or drop the blur below 768px if it janks.
  - Found 2026-10-04 from a static code review; unverified, may cause scroll jank on low-end phones.
- [x] **Homepage spacing** ([`.vitepress/theme/layout.css`](.vitepress/theme/layout.css)): `.homepage-content { margin-top: 8rem }` and `.recent-posts { gap: 4.5rem }` are the same on every screen. Scale them down, e.g. `clamp(4rem, 10vw, 8rem)`.
- [x] **Embeds and touch hover**:
  - [x] Ensure iframes in blog posts (`.embed-frame`, `.embed-video`) have `max-width: 100%` so they don't overflow phones (obsolete rules removed; no posts use embed iframes).
  - [x] Wrap the remaining `:hover` transforms (`.view-all-button`, `.container_row:hover`, `.shieldButton:hover`) in `@media (hover: hover)`.
- [x] **Music player on phones**: the mini-player was moved to a floating bottom dock, enabled on mobile devices with touch-friendly layout.

## Codebase Review (2026-11-12)

Full read of the components, `lib/`, theme CSS, ETL scripts, CI and docs at commit `8139ff1`. Lint (ESLint, Prettier, Ruff) and both test suites pass on that commit. Items marked _(from code)_ were derived by reading the source and have not been checked in a browser. Ordered by impact within each group.

### 1. Bugs

- [x] **A track that fails to load leaves the player "playing" silence** ([`useMusic.ts`](.vitepress/theme/composables/useMusic.ts) `loadAndPlayTrack` / `switchTrack`): `XMPlayer.loadBuffer` returns `false` on a parse error and `loadUrl` throws on HTTP errors, but the result is ignored and nothing catches the throw. After an auto-advance, `isPlaying` stays `true`, the rAF loop keeps running and the rejection is unhandled. Group 9 lists 193 XM files that may not parse. Catch it, set `isPlaying = false` (or skip to the next track after N failures) and show the error in the title area.
- [x] **Stale load can win a race** (same function): `currentLoadedUrl` is set after `await xmPlayer.loadUrl(url)`. Skip twice quickly on a slow connection and the older fetch can resolve last, so track A plays while the UI shows track B. Keep a load token (or `AbortController`) and drop results that are no longer current.
- [x] **Hero tagline is partly unreadable in light mode** _(from code)_ ([`components.css`](.vitepress/theme/components.css) `.VPHero .tagline`): the gradient's middle stop is a fixed `#cbd5e1`, which is about 1.5:1 on a white background. Use a token that flips with the theme (e.g. `--vp-c-text-2`).
- [x] **Custom blocks lose their type colour** _(from code)_ ([`layout.css`](.vitepress/theme/layout.css) `.custom-block`): `background-color: rgba(255,255,255,.5) !important` overrides the tip/warning/danger backgrounds, so `--vp-custom-block-tip-bg` in `tokens.css` is dead and all callouts look alike. Tint per type instead, e.g. `color-mix(in srgb, var(--vp-custom-block-tip-bg) 60%, transparent)`.
- [x] **Deep-link example in the tracker post does not work** ([`blog/tracker.md`](blog/tracker.md)): it shows `?track=dead_lock.xm`; the catalog filename is `0_deadlock.xm` and `applyTrackQueryParam` only matches exact filenames.
- [x] **Hero physics is frame-rate dependent** ([`HeroSplat.vue`](components/HeroSplat.vue) render loop): spring, damping (`* 0.8`), the kick punch and `glowLevel += … * 0.08` are applied per frame, so on a 120 Hz display the cloud is stiffer and settles twice as fast as on 60 Hz. `ctx.dt` already exists; scale forces by `dt / 16.67` and use `Math.pow(damp, dt / 16.67)`.
- [x] **Phase timers use wall time across pauses** (same file): `phaseStart` and `startTime` are not shifted when the loop stops off-screen, so scrolling back to the hero usually triggers an immediate morph and animations jump. Accumulate active time from `dt` instead.
- [x] **Progress bar assumes 64-row patterns** ([`xm-player.ts`](lib/audio/xm-player.ts) `getProgress`): patterns can have 1 to 256 rows, so the bar jumps or stalls on such songs. Precompute cumulative row counts per order at load.
- [x] **ETL failures do not fail the build** ([`process_requests.py`](scripts/process_requests.py)): a failed README fetch or an invalid manifest is logged and the script exits 0, so CI can deploy a project page with an empty body or drop the page. Exit non-zero when any manifest fails (and label YAML/validation/network errors separately; the broad `except Exception` calls them all "Validation error").

### 2. Performance

- [x] **The 3,405-track catalog is downloaded on every page**: `MiniPlayer` sits in the global layout and `useMusic` statically imports `data/music.data`, so every visit loads about 689 KB of JS (117 KB gzip). `manualChunks` only splits it; it is still eagerly imported. Load it on first play or first playlist open (dynamic `import()`), and ship only the curated `INITIAL_TRACK_FILENAMES` entries up front.
- [x] **Shrink the catalog itself** ([`data/music-tracks.json`](data/music-tracks.json), [`sync_audio_r2.py`](scripts/sync_audio_r2.py)): every `url` equals `MEDIA_URL + '/audio/' + filename` (0 exceptions) and there are only 49 distinct `tracker` strings. Dropping `url` and using tuples with a tracker lookup table takes it from 689 KB to about 280 KB raw. The 831 KB pretty-printed JSON also churns the git history on every sync.
- [x] **Mobile LCP waits for hydration; desktop downloads an unused image** ([`HeroSplat.vue`](components/HeroSplat.vue)): the fallback avatar and canvas are toggled with `v-show` from `useWindowSize`, which is `Infinity` during SSR. Phones get `display: none` on the avatar until JS runs, and desktops fetch `ava.webp` for nothing. Switch visibility with CSS media queries, add `width`/`height` and `fetchpriority="high"`, and only start the canvas from JS.
- [x] **Article hero image is lazy-loaded** ([`ArticleItem.vue`](components/ArticleItem.vue)): it is the LCP element on every post but has `loading="lazy"` and no dimensions. Remove `lazy` there, keep it for list cards below the fold, and add `width`/`height` (images are generated at 653x378) to both to stop layout shift.
- [ ] **Catalog v2 assumes the default media URL** _(from code)_ ([`sync_audio_r2.py`](scripts/sync_audio_r2.py)): the client derives `url` as `MEDIA_URL/audio/<filename>`, so a sync run with `--prefix` other than `audio` or a different `R2_PUBLIC_URL` writes a catalog whose URLs no longer resolve. Refuse or warn in that case.
- [ ] **Junk bytes in tracker names** ([`sync_audio_r2.py`](scripts/sync_audio_r2.py) `parse_xm_header`): several catalog trackers read as e.g. `MadTracker 2.0\u0000\u0019%Õó`. Cut the field at the first NUL and trim.
- [ ] **653px images are used as 133px thumbnails** ([`ArticleList.vue`](components/ArticleList.vue), [`gen_image.sh`](gen_image.sh)): generate a small variant (e.g. 266px for 2x) and use `srcset`/`sizes`.
  - [x] `gen_image.sh` writes `<name>-266w.webp`; `ArticleList` adds `srcset`/`sizes` behind `SITE_CONSTANTS.IMAGES.THUMB_VARIANTS`. 28 variants generated locally.
  - [ ] Owner: run `pnpm run images:sync`, then set `THUMB_VARIANTS` to `true`.
- [ ] **Audio is mixed on the main thread** ([`xm-player.ts`](lib/audio/xm-player.ts)): `ScriptProcessorNode` is deprecated and competes with the hero canvas and Vue for the same thread. Port the mixer to an `AudioWorklet` (the engine is already self-contained in `createXMEngine`); send scope/VU data back with `postMessage`.
- [x] **Allocations inside the audio callback** (same file, around lines 1210 to 1240): a `Float32Array` per channel per tick for `VU` and scopes, plus a fresh `scopes` array. Preallocate per song and reuse; GC pauses here are audible.
- [x] **Tracker canvases redraw at 60 fps even when nothing changed** ([`TrackerPlayer.vue`](components/TrackerPlayer.vue) `animLoop`): the pattern grid only changes when `curRow`, pattern, mutes, page or width change, and neither canvas changes while paused. Redraw on change, cache `getContext('2d')`, and replace the per-channel `shadowBlur = 8` (expensive with 32 channels) with a cheaper double stroke.
- [x] **Per-particle garbage in the hero loop** ([`HeroSplat.vue`](components/HeroSplat.vue), `lib/splat-animations/*`): every animation's `apply` returns a new object per particle per frame (560 particles, 60 fps), and tinted scenes build an `"r, g, b"` string plus a `fillStyle` parse per particle. Use an out-parameter like scenes already do, and quantise tint colours into a small cached palette.
- [x] **Non-compositor background animation** ([`components.css`](.vitepress/theme/components.css) `.articleImagebg`): `glow` animates `background-position` forever under a `blur()` filter, forcing a repaint of a blurred layer every frame on every article. Animate `transform` on an oversized pseudo-element, or make it static.
- [x] **`.vp-doc > div > *` entrance animation** (same file): every top-level block of every page starts at `opacity: 0` and keeps `transform` from `animation-fill-mode: both` (a stacking context per block). Limit it to the first screen or drop it; it delays first paint of text.
- [x] **Third-party badge requests** ([`Badges.vue`](components/Badges.vue), footer in [`config.mts`](.vitepress/config.mts)): each project card loads three `img.shields.io` images and the footer two more on every page. Fetch star/fork counts in the ETL and render them as local badges.
- [ ] **Blog posts lost their GitHub counts**: they used shields.io badges too, but are not generated by the ETL, so they now only show the "View on Github" link. A VitePress data loader could fetch stats for posts with `user`/`project` at build time.
- [ ] **Hero canvas ignores `devicePixelRatio`**: it is sized in CSS pixels, so it is soft on HiDPI screens. Try `min(dpr, 2)` backing size and measure the frame cost before keeping it.

### 3. Dependencies and tooling

- [x] **There is no type checking at all**: no `typescript` or `vue-tsc` dependency, no `tsconfig.json`, and CI never checks types. Add both, a strict `tsconfig.json`, and a `typecheck` script in CI.
- [ ] **Type `xm-player.ts`**: (it is now excluded from `pnpm run typecheck` with `// @ts-nocheck`: 113 strict errors) the whole file runs under `/* eslint-disable no-explicit-any, no-unused-vars, no-var */` and `engine` is `any`. Give channels, instruments, samples and the song typed interfaces; this is where typing would have caught the ignored `loadBuffer` result.
- [x] **`pnpm audit --prod` in CI checks nothing** ([`deploy.yml`](.github/workflows/deploy.yml)): every package is a `devDependency`, so the production set is empty. A full `pnpm audit` currently reports 1 moderate advisory (`minimatch` via ESLint, GHSA-g3hv-75wg-m249). Audit everything and add an override for `minimatch`.
- [x] **CI lint auto-fixes instead of checking**: `pnpm run lint` is `eslint . --fix`, so fixable problems pass CI silently, and Prettier is not run in CI at all. Add `lint:check` (`eslint .`) and `format:check` (`prettier --check .`) and use those in the workflow.
- [ ] **Unsupported Vite/esbuild combination** ([`pnpm-workspace.yaml`](pnpm-workspace.yaml)): VitePress 1.6.4 targets Vite 5, the override forces `^6.4.5` (latest is 8.x) and esbuild is pinned to exactly `0.25.0` (latest 0.28.x). Record why each override exists, and plan the move to VitePress 2 (`next` is 2.0.0-alpha.21). The roughly 160 `!important` rules targeting internal class names (`.DocSearch-Button`, `.VPLocalSearchBox .shell`, …) are the main upgrade risk; see group 5.
  - [x] Each override now has a comment. Only `minimatch` has a recorded reason; the others are marked inferred or unknown (all from 9a9cdd4 or 1531760).
  - [ ] `js-yaml` and `brace-expansion@1` are no longer in the dependency tree; check whether those overrides can be dropped.
  - [ ] Plan the VitePress 2 move.
- [x] **Node 22 is in maintenance** ([`flake.nix`](flake.nix)): move to `nodejs_24` (or 26), update the README, and check whether `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` in the workflow is still needed.
- [x] **Minor updates available**: `vue` 3.5.45, `vitest` and `@vitest/coverage-v8` 5.1.0, `eslint` 10.14.0, `eslint-plugin-vue` 10.12.1; `pre-commit-hooks` is on v5.0.0.
- [x] **Dependabot covers only npm and Actions**: add a weekly `nix flake update` job (or Renovate with the `nix` manager) and declare the Python dependencies somewhere a bot can see them.
- [x] **Coverage numbers are misleading** ([`vitest.config.ts`](vitest.config.ts)): "100%" covers six small files (127 statements). `xm-player.ts`, `useMusic.ts` and the scenes have tests but are excluded from `coverage.include`. Include them with realistic per-file thresholds.
- [ ] **No end-to-end smoke test**: `data-animation` / `data-scene` / `data-phase` were added for testing but nothing uses them. Add one Playwright test: the home page hydrates without console errors, the director advances on click, and play/next works with a fixture `.xm`.
- [x] **Add a `.prettierignore` and explicit ESLint ignores**: both tools rely on `.gitignore`. The uncommitted `.gitignore` edit in the working tree (drops `.vitepress/cache` and `.vitepress/dist`) makes `eslint .` report 288 errors from the Vite cache and would make `pnpm run format` rewrite it.
- [x] **`public/data/splats.json` is both tracked and git-ignored**: pick one. Either generate it in CI (needs Pillow and the avatar) or remove the ignore rule.
- [x] **Rebuild on a schedule**: project READMEs are fetched at build time, so they are only refreshed when something is pushed. Add a weekly `schedule:` trigger, and add `TODO.md` to `paths-ignore`.
- [x] **The `requests/` folder shadows the `requests` library name** ([`process_requests.py`](scripts/process_requests.py)): the import only resolves to the library because the folder has no `__init__.py`, and Ruff already sorts it as first-party. Rename the folder (e.g. `manifests/`) or drop the library for `urllib.request`.
- [x] **Widen Ruff's rule set** ([`pyproject.toml`](pyproject.toml)): only `E`, `F`, `I` are on. Add `B`, `UP`, `SIM`, `BLE` (flags the bare `except Exception: pass` in `parse_xm_header`) and `G` (f-strings in `logger` calls).

### 4. Dead code and duplication

- [x] **Playlist logic is written twice**: `indexedTracks`, `filteredTracks`, the virtual list and the scroll reset are near-identical in [`MiniPlayer.vue`](components/MiniPlayer.vue) and [`TrackerPlayer.vue`](components/TrackerPlayer.vue), as are the heart/transport SVGs and `loadFavorites()` + `applyTrackQueryParam()` on mount (both run on the tracker page). Extract a `usePlaylist()` composable and small icon components, and do the one-time init inside `useMusic`.
- [x] **XM header parsing exists in three places**: `sync_audio_r2.py`, the fallback branch of [`music.data.ts`](data/music.data.ts) and `xm-player.ts`. Since the JSON catalog is always committed, delete the `public/audio` fallback from `music.data.ts` (about 45 lines) or make it dev-only.
- [x] **22 blog posts repeat the same `<script setup>` imports**: register `ArticleItem` / `ArticleFooter` in `enhanceApp`, or render them from the `doc-before` / `doc-after` layout slots based on frontmatter, and drop the boilerplate from every post and from `get_wrapper_template`.
- [x] **Unused code to delete**: `setAudioData`, `setPlaying`, `resetInitialTrackPicked` in `useMusic` (referenced only by tests); `isChannelMuted`, `getChannelInfo`, the no-op `debugLog` and its ~15 call sites (argument strings are still built), `XMView.resume/pause/stop`, `createJavaScriptNode` and `webkitAudioContext` fallbacks in `xm-player.ts`; `post`, `my_wrap`, `max_width` in `process_requests.py` (`post` is always `""`); `.embed-frame` / `.embed-video` / `.embed-caption` in `layout.css` (no post uses them, which also makes the open "Embeds" item above moot); `year:` / `month:` frontmatter in blog posts; `hero.image` in `index.md` is only there to trigger `has-image`, worth a comment.
- [x] **`onImageError` is copy-pasted** in `ArticleItem.vue` and `ArticleList.vue` with a hardcoded `https://media.justme.dev`. Move it to one helper using `SITE_CONSTANTS.MEDIA_URL`, and make it dev-only (the local `/images` path does not exist in production because `public/images` is git-ignored).
- [x] **Hand-maintained alpha tokens** ([`tokens.css`](.vitepress/theme/tokens.css)): 16 `--vp-c-brand-*-alpha-*` values and two `*-rgb` triples are duplicated for light and dark and must be kept in sync by hand. Replace with `color-mix(in srgb, var(--vp-c-brand-1) 20%, transparent)` (already used in `HeroSplat.vue`). `.dark .VPNavBar` in `layout.css` is also redundant, since the glass tokens already flip under `.dark`.
- [x] **Remove leftovers from the working tree**: untracked `src/fonts.css` and a root `dist/` (a different build, 713 KB bundle from 8 Nov) do not belong to the VitePress site.
- [x] **`gitlink` is required even for non-git projects** ([`process_requests.py`](scripts/process_requests.py), [`whos-the-fool.yaml`](requests/whos-the-fool.yaml)): the manifest has to pass the game URL as `gitlink`. Make it optional and derive the GitHub badges from `user`/`project` only.

- [ ] **Out-of-range keymap entry gives an undefined sample** _(from code)_ ([`xm-player.ts`](lib/audio/xm-player.ts) `nextRow`): `inst.samples[inst.samplemap[note]]` is not bounds-checked, so a malformed instrument could make the mixer read `undefined`. Guard it, and drop the stale `TODO: implement pingpong looping` / `FIXME: ignoring keymaps` comments.
- [ ] **`ArticleFooter` renders nothing on any post** ([`ArticleFooter.vue`](components/ArticleFooter.vue)): it only shows when frontmatter `model` is set, and no post sets it. Either use it or remove it.

### 5. Design and layout

- [x] **The audio dock covers page content** _(from code)_ ([`MiniPlayer.vue`](components/MiniPlayer.vue)): it is `position: fixed` at the bottom centre on every page with no bottom padding reserved, so it sits on top of the footer and the prev/next links at the end of a post. Reserve space (`padding-bottom` on `.VPContent`/footer), and add a collapse or close control whose state persists. (Owner chose padding only; no collapse control.)
- [x] **Text sizes below 11px in the player**: `8.5px`, `9.5px` and `10px` are used for tags, filenames and counts (`.meta-tag`, `.meta-filename`, `.track-count-badge`). Set a 11 to 12px floor and drop a column on narrow widths instead.
- [x] **Too much motion, and no reduced-motion guard on most of it**: buttons, feature cards, list cards, badges and search results all lift/scale on hover, brand buttons shimmer, and every doc block fades in. Only `HeroSplat` and the marquee respect `prefers-reduced-motion`. Pick one hover idiom, and add a global `@media (prefers-reduced-motion: reduce)` block for `fadeInUp`, `glow`, the `.flourish` sweep and hover transforms.
  - [x] Reduced-motion guard added (`motion.css`, scoped blocks in `MiniPlayer.vue`, instant order-strip scroll in `TrackerPlayer.vue`).
  - [x] Hover idiom: colour/border only (owner's choice); shimmer and all hover/press transforms removed.
- [ ] **Reduce `!important` (about 160 uses)**: most of `components.css` restyles VitePress internals by force. Prefer the theme's CSS variables where they exist (`--vp-nav-bg-color`, `--vp-local-search-bg`, button variables), put custom rules in an `@layer`, and keep `!important` for the few scoped-style overrides that need it.
- [x] **Colours outside the token system**: `#ef4444` appears about a dozen times across both players, and the tracker canvases hardcode about fifteen hex colours. Add `--c-favorite` and a small tracker palette (read once with `getComputedStyle` for the canvases).
- [x] **Brand consistency in the browser chrome**: `theme-color` and the manifest are `#ffffff` in dark mode too, the Safari mask icon is green (`#16673c`) while the brand is indigo, and `apple-touch-icon.png` is 76x76 (should be 180x180). Add light/dark `theme-color` media variants and regenerate the icon set.
- [x] **Contrast spot checks** _(from code)_: white on `#6366f1` (brand button hover, light and dark) is about 4.47:1, just under AA; `.VPFooter .message/.copyright` at `opacity: 0.7` on `--vp-c-text-2` is lower still. The "WCAG AA compliant" comments in `tokens.css` should be backed by a check.
- [ ] **Search placeholder is dimmed below AA** _(from code)_ ([`components.css`](.vitepress/theme/components.css) `.VPLocalSearchBox .search-input::placeholder`): `opacity: 0.5 !important` on `--vp-c-text-2`. `.post-intro` at `opacity: 0.85` is borderline too. Add both to `tests/unit/contrast.test.ts`.
- [ ] **Hero avatar source is 307px** but shown at up to 240 CSS px, so it is soft on 2x phones. Export a 480px version.
- [x] **Legacy syntax**: `-webkit-linear-gradient` for `--vp-home-hero-name-background`, `-webkit-mask-composite: source-in`, `transition: all` in about twenty places (animates layout properties by accident), and `display: flex !important` on `.music-mini-player`.

### 6. Accessibility

- [x] **Player controls that are not reachable by keyboard**: playlist rows and the per-row favourite toggle are clickable `<div>`s; the track title, both seek bars and the scope canvas (mute/solo) are click-only. Use `<button>`s, give the seek bars `role="slider"` with arrow-key handling, and add a mute/solo button row for channels (Shift+click does not exist on touch either).
- [x] **Missing names and states**: the playlist search input, the clear button (`✕`), the tracker volume and BPM sliders have no label; the tracker tabs lack `role="tablist"` / `aria-selected`; favourite buttons lack `aria-pressed`; `outline: none` removes the focus ring on the search inputs.
- [x] **Virtual list keys by position** ([`MiniPlayer.vue`](components/MiniPlayer.vue), `:key="index"`): key by `item.originalIndex` so rows are not reused across filter changes.
- [x] **Canvas label says "3D"** ([`HeroSplat.vue`](components/HeroSplat.vue)): it is a decorative 2D particle effect; mark it `aria-hidden` and keep the alt text on the fallback image.
- [x] **Copy-link failure is silent** ([`TrackerPlayer.vue`](components/TrackerPlayer.vue) `copyDeepLink`): show the URL in a selectable field when the clipboard API is blocked, and announce "Copied" through an `aria-live` region.

### 7. SEO and metadata ([`config.mts`](.vitepress/config.mts))

- [x] **Duplicate and malformed meta tags**: `transformHead` emits `<meta name="description" property="og:description">` in addition to VitePress' own description tag (two descriptions per page), and `name="title" property="og:title"` in one tag. Emit separate `og:*` tags and set the page `description` from `intro` in `transformPageData`.
- [x] **`og:locale` is `en-US`**; Open Graph expects `en_US`. Add `og:image:width/height/alt`, and drop `meta keywords`.
- [x] **`article:modified_time` is just the publish date**: use the git `lastUpdated` timestamp VitePress already computes.
- [x] **No RSS/Atom feed for the blog**: generate one in `buildEnd` from the existing content loader and link it in `<head>`.
- [x] **No structured data**: add `BlogPosting` JSON-LD for posts and `Person`/`WebSite` for the home page.

### 8. Documentation

- [ ] **README oversells the project and is published as a page**: it is fetched into `/projects/justme`, so "scalable, cloud-native reference architecture", "zero-maintenance" and "high availability" are the public description of a static blog. Rewrite it plainly: what the site is, the ETL, the hero canvas and the XM player (the two interesting parts are not mentioned at all). Update the `justme.yaml` intro and the home feature card to match.
- [ ] **README is out of date**: says Node 22 with `pyyaml` and `requests` only (the flake also provides pydantic, Pillow, boto3, pytest, …), and omits the media sync commands, tests and pre-commit.
- [x] **Stale comments**: `MOBILE_BREAKPOINT` in [`constants.ts`](.vitepress/constants.ts) says the mini-player is hidden on mobile (it is not); `setDarkTheme` in `color-utils.ts` says "each frame" (it is a `MutationObserver`); the header of `lib/splat-animations/index.ts` describes one random animation per page load (there is now a director); the old known-issues file (since merged into this file) pointed at `todo.md`.
- [ ] **XM effect coverage is undocumented** ([`xm-player.ts`](lib/audio/xm-player.ts)): tremolo (7), key off (K), set envelope position (L), panning slide (P), tremor (T), extra-fine portamento (X), E3/E7/E9/ED/EE, ping-pong sample loops and multi-sample keymaps are stubs or TODOs. List what is unsupported (group 9), then implement ping-pong loops, note delay (EDx) and key off first; they are the most audible in this archive.
  - [x] Unsupported features are listed in group 9 ("XM features the player does not support"). Ping-pong loops (unrolled at load) and multi-sample keymaps turned out to be supported already; the `TODO`/`FIXME` comments at those spots are stale.
  - [ ] Implement `Kxx` key off, then `EDx` note delay (needs the note trigger split out of `nextRow`).
- [x] **Merge the known-issues file and this file**: done; the separate file is deleted and its open entries live in group 9 (or were folded into the matching items). References in `deploy.yml` and `config.mts` were removed.

### 9. Known issues

Merged from the former known-issues file. Phone layout entries from that file are covered by "Phone Layout Follow-ups" at the top, and the XM effect list backs the "XM effect coverage" item in group 8.

- [ ] **XM files that failed a quick structural parse (possibly corrupt)**:
  - **Found:** 2026-10-07, while measuring instrument-name usage across `public/audio/*.xm` (3,405 files; 3,212 parsed).
  - **What failed:** a throwaway Python parser walking the XM header, patterns and instrument headers raised `struct.error` (ran out of bytes) on the 193 files below. They may be truncated or corrupt, or the throwaway parser may simply not handle some variant, so a failure here is not proof the file is bad.
  - **Follow-up:** try loading each in the player (`XMPlayer`) to see which really fail; remove or re-source the broken ones from the R2 bucket.

  <details><summary>193 files</summary>

  - `AAOCG-Nero-Burning-Rom-5.5.9.0-kg.xm`
  - `AAOCG-mIRC-6.x-kg.xm`
  - `ACME-UltraEdit-12.x-kg.xm`
  - `AGAiN-Desktop-Wizard-Pro-kg.xm`
  - `AGAiN-EIQ-FirewallAnalyzer-3.2.10-kg.xm`
  - `AGAiN-Express-Archiver-kg.xm`
  - `AGAiN-FairStars-MP3-Recorder-kg.xm`
  - `AGAiN-Link-Stash-1.6.8.0-kg.xm`
  - `AGAiN-PHP-Editor-3.0-r4066-kg.xm`
  - `AGES-Prey-1.0-10-trn.xm`
  - `AGGRESSiON-Easy-DVD-Creator-1.1.0-kg.xm`
  - `AH-Team-Accent-Office-Password-Recovery-2.12-rus-crk.xm`
  - `AH-Team-Quick-Unpack-0.7.xm`
  - `AT4RE-MagicTweak-4.01-kg.xm`
  - `AT4RE-MakBit-Virtual-CD-DVD-1.3.0.0-serials.xm`
  - `BRD-1-Video-Converter-kg.xm`
  - `BReWErS-X-Blade-7-trn.xm`
  - `BSA-BlazeDVD-Player-Pro-4.0-kg.xm`
  - `BetaMaster-Alcohol-120-1.9.5.3105-crk.xm`
  - `BetaMaster-Alcohol-120-activator.xm`
  - `BetaMaster-Articons-Pro-5.1-build-23.02.2006-crk.xm`
  - `BetaMaster-J.-River-Media-Center-11-crk.xm`
  - `CHiCNCREAM-CuteFTP-8-Professional-8.0.2.08.22.2006.5-crk.xm`
  - `CLASS-Delta-Force-Land-Warrior-setup_2.xm`
  - `CORE-Ashampoo-UnInstaller-Suite-1.3-keygen.xm`
  - `CORE-Big-Money-Deluxe-1.1-kg.xm`
  - `CORE-ExceleTel-TeleTools-Enterprise-3.7.1.2-kg.xm`
  - `CORE-Irfan-View-kg.xm`
  - `CORE-Net-Patrol-1.0.xm`
  - `CORE-NetObjects-Fusion-8.0-kg.xm`
  - `CORE-Pivot-Pro-7.68-kg.xm`
  - `CORE-Quest-Central-for-Microsoft-2.1-kg.xm`
  - `CORE-Winxpsilver-kg.xm`
  - `CRUDE-Ultra-Fractal-4.02-kg.xm`
  - `CRUDE-XnView1.74-kg.xm`
  - `Canterwood-Hex-Workshop-4.22-kg.xm`
  - `CiM-Nero-6-kg.xm`
  - `DARKSiDERS-Ashes-Of-Kanaka-intro.xm`
  - `DEViANCE-Big-Mutha-Truckers-2-trn.xm`
  - `DEViANCE-Cars-intro.xm`
  - `DEViANCE-Condemned-Criminal-Origins-5-trn.xm`
  - `DEViANCE-Fable-Lost-Chapters-7-trn.xm`
  - `DEViANCE-Pilot-Down-Behind-Enemy-line-trn.xm`
  - `DEViANCE-Serious-Sam-II-trn.xm`
  - `DEViANCE-Yeti-Sports-Arctic-Adventures-trn.xm`
  - `DJiNN-WinCHM-Pro-4.19-kg.xm`
  - `DiGERATi-AutoRun-III-kg.xm`
  - `DiGERATi-DockWare.Pro.v.2.0.2.PocketPC-kg.xm`
  - `DiGERATi-Preeminence-All-crk.xm`
  - `DraCooLa-WinRAR-3.40-AV-Multilanguage-crk.xm`
  - `ECLIPSE-Recover-My-Files-3.94-kg.xm`
  - `ECLiPSE-MIDI-Sight-Reader-kg.xm`
  - `ECLiPSE-MM-LSI-M-IPEG-Codec-1.0.9.0-kg.xm`
  - `ECLiPSE-Maintenance-Parts-Bin-Pro-7.4-kg.xm`
  - `ECLiPSE-Ricochet-Lost-Worlds-1.0.20-kg.xm`
  - `ECLiPSE-XMLwriter-2.6-kg.xm`
  - `EVASiON-Rome-Total-War-1.1-trainer.xm`
  - `EXPLOSiON-Acala-DVD-Ripper-2.3.2-kg.xm`
  - `EXPLOSiON-Magic-Utilities-2004-3.0-kg.xm`
  - `EXPLOSiON-RightClkImageCon-1.3.0-kg.xm`
  - `EiTheL-Pixel-Font-Maker-1.4.0.1625-kg.xm`
  - `FFF-7SinsUnlocker.xm`
  - `FFF-AB-Commander-XP-6.94-crk.xm`
  - `FFF-ACDSee-9.x-Photo-Manager-crk.xm`
  - `FFF-AVI_MPEG_RM_WMV-Joiner-3.01-kg.xm`
  - `FFF-Advanced-MP3-Converter-2.40-kg.xm`
  - `FFF-AirStrike-2-intro.xm`
  - `FFF-Alcohol-120-1.9.2.1705-crk.xm`
  - `FFF-BlindWrite-Suite-5.2.16.154-crk.xm`
  - `FFF-Bono-Longtion-GIF-Animator-crk.xm`
  - `FFF-Call-of-Duty-United-Offensiv-intro.xm`
  - `FFF-CrystalPlayer-1.76-Pro.xm`
  - `FFF-Cute-FTP-Pro-7.1b06.07.2005.1-crk.xm`
  - `FFF-Doom-3-Beta2-OpenGL1-Fix.xm`
  - `FFF-Doom-3-trn.xm`
  - `FFF-EA-Games-Multi-kg.xm`
  - `FFF-FarCry-1.x-DVDRiP-Update-Enable-intro.xm`
  - `FFF-Font-Creator-5.0.0.237.63-crk.xm`
  - `FFF-Half-Life-2-Cheats-Enabler.xm`
  - `FFF-HiDownload4.4-kg.xm`
  - `FFF-Internet-Download-Manager-4.0.7.2-crk.xm`
  - `FFF-MP3-Stream-Editor-3.2.2.231-crk.xm`
  - `FFF-Nero-7.xx-kg.xm`
  - `FFF-NetLimiter-Pro-2.0.x.x-crk.xm`
  - `FFF-Opanda-Power-Exif-Professional-1.2x-crk.xm`
  - `FFF-PainKiller-cracktro.xm`
  - `FFF-S.T.A.L.K.E.R.-Oblivion-Lost-alpha-build-1xxx-trn.xm`
  - `FFF-Zoom-Player-WMV-Professional-v4.03-crk.xm`
  - `FFF-Zoom-Player-WMV-Professional-v4.50-beta1.xm`
  - `FSS-Intervideo-WinDVR-3.x-kg.xm`
  - `GENESiS-Stronghold-2-intro.xm`
  - `H2O-Giga-Studio-3.10-Orchestra-kg.xm`
  - `HATRED-Pirates-of-the-Caribbean.-At-Worlds-En-intro.xm`
  - `HOODLUM-Chronicles-Of-Riddic-intro.xm`
  - `HOODLUM-ColdFea-intro.xm`
  - `HOODLUM-Manhattanchase.xm`
  - `HOODLUM-The-Banishe-intro.xm`
  - `HTB-Total-Commander6.53-crk.xm`
  - `Hatred-Supreme-Commande-intro.xm`
  - `ICU-CrackMe-v0.2.xm`
  - `ICU-Sudoku-Up-2007-1.5-kg.xm`
  - `ICU-XoftSpySE-4.23-crk.xm`
  - `Knetus-UltraEdit-32-11.00a-kg.xm`
  - `L33VaNcL33F-DAEMON-Tools-Pro-Advanced-4.10.218.0-crk.xm`
  - `Lazzy-CrackMe-1.xm`
  - `Lz0-tuEagle-Anti-Porn-15.x-crk.xm`
  - `MYTH-Madtown-Madness-installer.xm`
  - `ORiON-MPEGable-Broadcaster-2.2.7-kg.xm`
  - `PARADOX-3d-studio-max-7.0-kg.xm`
  - `PARADOX-Okino-Polytrans-4.1.2-crk.xm`
  - `PARADOX-Photoshop-CS-2-kg.xm`
  - `PWZ-LA-Rush-3-trn.xm`
  - `PiZZA-GTA-SA-27-trn.xm`
  - `PiZZA-LEGO-StarWars-2-trn.xm`
  - `PiZZA-Pariah-9-trn.xm`
  - `R2R-Native-Instruments-Kontakt-2.0.113-kg.xm`
  - `RED-Active-WebTraffic-8.1.7-crk.xm`
  - `RELOADED-BPRTHc64.xm`
  - `REVENGE-Resource-Tuner-1.94-crk.xm`
  - `REVENGE-The-Bat-Voyager-3.63.7-crk.xm`
  - `REVENGE-WinBoost-4.78-kg.xm`
  - `REVENGE-Zero-Spam-3.0-crk.xm`
  - `Razor1911-Armed-Assault-kg.xm`
  - `Razor1911-Battlefield-2142-kg.xm`
  - `Razor1911-NHL-07-autorun_1.xm`
  - `S.T.A.R.S.-WinSnap-universal-all-versions-crk.xm`
  - `SnD-1-DVD-Audio-Ripper-1.2.12-kg.xm`
  - `SnD-All-Sound-Recorder-2.28-kg.xm`
  - `SnD-AnyDVD-5.4.3.1-crk.xm`
  - `SnD-AnyDVD-5.8.3.1-crk.xm`
  - `SnD-BestCrypt-7.xx-crk.xm`
  - `SnD-DeskSoft-EarthView-3.6.x-crk.xm`
  - `SnD-Kingdia-DVD-Ripper-2.5.7-kg.xm`
  - `SnD-Offline-Explorer-Enterprise-4.xx-crk.xm`
  - `SnD-PE-Explorer-Resource-Tuner-1.9x-crk-1.01.xm`
  - `SnD-PtShare-Products-kg.xm`
  - `SnD-UltraEdit-10.10-kg.xm`
  - `TDS-CD-Bank-Cataloguer-Pro-kg.xm`
  - `TFT-LEGO-Chick-Boutique-crk.xm`
  - `TLG-Alawar-Crack-keyfinder.xm`
  - `TMG-Norton-AntiVirus-Pro-2004-kg.xm`
  - `TSRh-Ashampoo-UnInstaller-Platinum-Suite-1.10-kg.xm`
  - `TSRh-Avi-gif-2.0-kg.xm`
  - `TSRh-FolderGuard-Pro-7.6-kg.xm`
  - `TSRh-IVM-Answering-Attendant-2.23-kg.xm`
  - `TSRh-LANgames-BattlField2-etc-kg.xm`
  - `TSRh-Resco-Explorer-2003-5.15-for-Smartphone-kg.xm`
  - `TSRh-SimAquarium-2.06-Tank1-kg.xm`
  - `TSRh-Solid-Converter-PDF-3.0-kg.xm`
  - `TSRh-TuneUp-Utilities-2007-kg.xm`
  - `TSRh-WinImage-8.0-kg.xm`
  - `TSRh-iTunes-Folder-Watch-for-Windows-1.0.44-kg.xm`
  - `TSRh-mIRC-6.14-kg.xm`
  - `TWK-Windows-XP-UPDATE-Validation-crk.xm`
  - `UNLEASHED-Civil-Disturbance-8-trn.xm`
  - `USABiLiTY-WinRAR-3.70-crk.xm`
  - `UnREal-Look-n-Stop-2.06-crk.xm`
  - `UnderPL-1-More-WebCam-1.02-kg.xm`
  - `UnderPL-Ease-Audio-Converter-2.70-kg.xm`
  - `WDYL-WTN-Becky-Internet-Mail-2.21.04-kg.xm`
  - `YouKing-Craagle-1.8_1.xm`
  - `YouKing-Craagle-1.8_2.xm`
  - `YouKing-Craagle-1.8_3.xm`
  - `YouKing-Craagle-1.8_4.xm`
  - `kZ-Courier-Mail-Server-2.06-crk.xm`
  - `kZ-Driver-Checker-2.7.4-crk.xm`
  - `kZ-Ox5-2.00-crk.xm`
  - `kZ-SMAC-2.x.x.x-crk.xm`
  - `nGen-BlazeDVD-3.5-Pro-kg.xm`
  - `tPORt-AccessManagerForWindows60-kg.xm`
  - `tPORt-Advanced-Phone-Recorder-1.7.8-kg.xm`
  - `tPORt-All-Media-Fixer-6.3-crk.xm`
  - `tPORt-Cistone-Media-Burner-2.3-crk.xm`
  - `tPORt-Clone-Remover-1.5.1-crk.xm`
  - `tPORt-DVDFab-2.22-crk.xm`
  - `tPORt-Firmtools-Panorama-Composer-3.1-crk.xm`
  - `tPORt-ImTOO-DVD-Ripper-Platinum-4.0.52-build-0630-crk.xm`
  - `tPORt-ImTOO-MPEG-Encoder-3.1-build-0616b-crk.xm`
  - `tPORt-NetworkACTIV-PIAFCTM-2.2-crk.xm`
  - `tPORt-Personnal-avi-to-Video-Converter-crk.xm`
  - `tPORt-Privacy-Defender-7.0.2-crk.xm`
  - `tPORt-Pure-SEO-CMS-2-611-kg.xm`
  - `tPORt-Recomposit-1.6-kg.xm`
  - `tPORt-Ripple-Screensaver-3.2-kg.xm`
  - `tPORt-Stepok-Turbo-Photo-5.1-crk.xm`
  - `tPORt-WavePad-3.0-kg.xm`
  - `tPORt-X-NetStat-Professional-5.xx-kg.xm`
  - `tRUE-Respectsoft-Weather-Clock-3.6-crk.xm`
  - `tRUE-SolSuite-8.1-crk.xm`
  - `tRUE-WebcamMax-4.2.5.0-crk.xm`
  - `uCF-SWF-Scanner-2.6.xm`
  - `uCF-Search-Engine-Composer-5.2-kg.xm`
  - `uCF-TeleportPro-kg.xm`

  </details>

- [ ] **Tests for the full player**:
  - **Deferred:** 2026-10-07, by choice, while the full-player overlay is being built.
  - **To add (Vitest, `tests/unit/`):** instrument-name loader (trim, CP437 decoding, slot order, blank-slot gaps, trailing blanks dropped), `useMusic` state shared between the mini player and the overlay, `?track=` deep-link opening the overlay.
- [ ] **Idea: attract attention from the hero button while music plays**:
  - **Later:** show something interesting in the hero button while a track is playing (now playing, a small visualizer, pulsing with the beat) to draw people to the full player.
- [ ] **Mini player track name is hard to click**:
  - **Reported:** 2026-10-07. Touch users are not considered here; this is about mouse use.
  - **Where:** the scrolling track title (`.track-name-mini` inside `.track-name-mini-wrap`) in [`components/MiniPlayer.vue`](components/MiniPlayer.vue). Clicking it runs `scrollToCurrentTrack`, which scrolls the playlist to the playing track.
  - **Likely causes:** while a track plays, the title runs a marquee (`mini-marquee`, 8s loop) at 12px, so the click target is small and keeps moving. The wrap also fades out at both edges (`mask-image`), and nothing signals that the title is clickable beyond a hover colour change.
  - **Ideas:** pause the marquee on hover, give the wrap a larger hit area (min height/padding), and add a visible hover/focus affordance. Make it a real `<button>` so it is keyboard-reachable.
  - **Unverified:** this assumes "track scroll" means the marquee title; if the playlist scrollbar was meant, update this entry.
- [ ] **XM features the player does not support**:
  - **Found:** 2026-11-12, by reading [`lib/audio/xm-player.ts`](lib/audio/xm-player.ts) (effect tables, `eff_t0_e`, volume column in `nextRow`, `MixChannelIntoBuf`, `UnrollSampleLoop`, `load`). Line numbers are approximate. Nothing was run or listened to.
  - **What:** `player.effects_t0` / `player.effects_t1` map unused or unimplemented slots to `eff_unimplemented*` no-ops, so a song using them plays silently wrong rather than failing. Status below is from reading the code.
  - **Impact counts:** not measured. `public/audio/*.xm` is not present locally (the files live on R2), so no per-effect file counts exist. To measure later, scan pattern data of the R2 files (throwaway script outside the repo).

  | Effect                                             | Status      | Where in `xm-player.ts`                              | Notes                                                                                                                                                                                                                                               |
  | :------------------------------------------------- | :---------- | :--------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `7xy` Tremolo                                      | unsupported | `effects_t0[7]` / `effects_t1[7]` (about 379, 419)   | No tremolo state or waveform at all.                                                                                                                                                                                                                |
  | `Kxx` Key off (at tick xx)                         | unsupported | `effects_t0[20]` / `effects_t1[20]` (about 392, 432) | The pattern key-off note (97) works: `nextRow` sets `ch.release`. Only the effect form is missing.                                                                                                                                                  |
  | `Lxx` Set envelope position                        | unsupported | `effects_t0[21]` / `effects_t1[21]` (about 393, 433) | `EnvelopeFollower` has a `tick` field to set, but nothing writes it.                                                                                                                                                                                |
  | `Pxy` Panning slide                                | unsupported | `effects_t0[25]` / `effects_t1[25]` (about 397, 437) |                                                                                                                                                                                                                                                     |
  | `Txy` Tremor                                       | unsupported | `effects_t0[29]` / `effects_t1[29]` (about 401, 441) |                                                                                                                                                                                                                                                     |
  | `X1x` / `X2x` Extra-fine porta up/down             | unsupported | `effects_t0[33]` / `effects_t1[33]` (about 405, 445) |                                                                                                                                                                                                                                                     |
  | `E3x` Glissando control                            | unsupported | `eff_t0_e` (about 198), no `case 3`                  | Tone portamento never snaps to semitones.                                                                                                                                                                                                           |
  | `E7x` Tremolo waveform                             | unsupported | `eff_t0_e`, no `case 7`                              | Moot until `7xy` exists.                                                                                                                                                                                                                            |
  | `E9x` Retrigger note                               | unsupported | `eff_t0_e`, no `case 9`                              | Not the same as `Rxy`.                                                                                                                                                                                                                              |
  | `EDx` Note delay                                   | unsupported | `eff_t0_e`, no `case 0x0d`                           | The row's note is triggered on tick 0 in `nextRow` (about 615), so the delay is ignored. A fix needs the trigger split out of `nextRow` and run on tick x.                                                                                          |
  | `EEx` Pattern delay                                | unsupported | `eff_t0_e`, no `case 0x0e`                           | `nextRow` always advances.                                                                                                                                                                                                                          |
  | `ECx` Note cut                                     | partial     | `eff_t1_e` (about 252)                               | Works for x > 0. `EC0` never cuts: `eff_t1_e` only runs on ticks 1 and up, and the tick-0 branch is a no-op.                                                                                                                                        |
  | `Rxy` Multi retrigger                              | partial     | `eff_t0_r` (about 306), `eff_t1_r` (about 361)       | The volume change is applied once on tick 0. Later retrigger ticks only reset the sample offset; they do not repeat the volume change or restart the envelopes.                                                                                     |
  | `E1x` / `E2x` Fine porta                           | partial     | `eff_t0_e` (about 203)                               | No parameter memory (`E10` slides by 0).                                                                                                                                                                                                            |
  | `9xx` Sample offset                                | partial     | `eff_t0_9` (about 156)                               | No parameter memory (`900` resets to 0).                                                                                                                                                                                                            |
  | `1xx` / `2xx` Porta up/down                        | partial     | `eff_t0_1`, `eff_t0_2` (about 48, 63)                | Up and down keep separate memories. Slide up has no lower period clamp.                                                                                                                                                                             |
  | `Fxx` Set speed/tempo                              | partial     | `eff_t0_f` (about 263)                               | `F00` is ignored instead of stopping the song.                                                                                                                                                                                                      |
  | `Dxx` Pattern break                                | partial     | `eff_t0_d` (about 189)                               | When it wraps past the last order it does not call `onEnded`, and it bypasses the out-of-range pattern check in `setCurrentPattern`.                                                                                                                |
  | Volume column `Dx` / `Ex` (pan slide left/right)   | unsupported | volume column branch of `nextRow` (about 688-727)    | No branch for `0xd0-0xef`. `Cx` (set pan) and `Fx` (tone porta) work.                                                                                                                                                                               |
  | Instrument auto-vibrato (type, sweep, depth, rate) | unsupported | `load` (about 1436-1570)                             | The four header fields at offsets 235-238 are never read.                                                                                                                                                                                           |
  | Volume fadeout                                     | partial     | `load` (about 1523-1545)                             | Folded into the volume envelope as an extra end point, so it only applies when the volume envelope is on. Instruments without one cut on key off and ignore fadeout. With fadeout 0 and an envelope, the last envelope value is held after key off. |
  | Envelope flags                                     | partial     | `load` (about 1523, 1547)                            | "Envelope on" is `type !== 0`, so bit 0 is never tested on its own.                                                                                                                                                                                 |

  **Order from the TODO item and a suggested change:**

  1. Key off: do the `Kxx` effect together with the key-off note path, since the note path is already there. Check key off on instruments without a volume envelope and with fadeout 0 (see the fadeout row) at the same time.
  2. Note delay (`EDx`): needs the larger refactor of `nextRow`. Do it before `EEx`, `E9x` and `Rxy`, which also depend on separating "row start" from "note trigger".
  3. Ping-pong loops: see below, probably nothing to do.

  **Already supported, so the TODO item is out of date:**

  - **Ping-pong sample loops (type bit 1):** handled. `load` calls `UnrollSampleLoop` for every ping-pong loop (and every forward loop shorter than 2048 samples), which writes the loop forwards then reversed into the sample data and rewrites `type` to forward. The `// TODO: implement pingpong looping` comment in `MixChannelIntoBuf` (about 955) is stale because the mixer only ever sees forward loops. Unverified: whether the doubled edge sample at each turnaround matches FastTracker 2 exactly (needs an audio comparison). Side effect: `getInstruments` reports `type` as forward for those samples.
  - **Multi-sample keymaps:** handled. `load` keeps the 96-byte `samplemap` and `nextRow` picks `inst.samples[inst.samplemap[note]]`. The `// FIXME: ignoring keymaps` comment in `load` (about 1466) is stale. Possible crash: a keymap entry pointing past the sample count gives an undefined sample.
  - **Also fine:** `0` arpeggio, `3`/`5`/`6` portamento and combos, `4` vibrato with `E4` waveform (random uses the square wave), `E5` finetune, `E6` loop, `E8` pan, `EA`/`EB`, `Gxx`, `Hxx`, `Bxx`, and both linear and Amiga frequency tables (`flags & 1`).

  - **Follow-up:** implement in the order above, update the TODO item and remove the two stale comments once confirmed. Measure per-effect file counts first if the order should be driven by the archive.
