## Phone Layout Follow-ups

Remaining items from the phone layout review. Needs a real-device or emulator check at 375px, 414px and 700px wide.

- [x] **Fallback avatar spacing** ([`components/HeroSplat.vue`](components/HeroSplat.vue)): `.fallback-image` is `position: absolute; height: 100%` with a hardcoded `padding-top: 7.5rem`, plus the 24px margin and `--vp-home-hero-padding-top-mobile` (64px). Verify it doesn't overlap the hero buttons or leave a large gap, then move it into the normal flow if needed.
  - [ ] Add `width`/`height` attributes to the avatar `<img>` to avoid layout shift while loading.
- [ ] **Backdrop blur cost on mobile**: the navbar, `.VPFeature` and `.custom-block` all use `backdrop-filter: blur(...)`. Profile scrolling on a low-end phone and reduce or drop the blur below 768px if it janks.
- [x] **Homepage spacing** ([`.vitepress/theme/layout.css`](.vitepress/theme/layout.css)): `.homepage-content { margin-top: 8rem }` and `.recent-posts { gap: 4.5rem }` are the same on every screen. Scale them down, e.g. `clamp(4rem, 10vw, 8rem)`.
- [ ] **Embeds and touch hover**:
  - [ ] Ensure iframes in blog posts (`.embed-frame`, `.embed-video`) have `max-width: 100%` so they don't overflow phones.
  - [ ] Wrap the remaining `:hover` transforms (`.view-all-button`, `.container_row:hover`, `.shieldButton:hover`) in `@media (hover: hover)`.
- [x] **Music player on phones**: the mini-player was moved to a floating bottom dock, enabled on mobile devices with touch-friendly layout.
