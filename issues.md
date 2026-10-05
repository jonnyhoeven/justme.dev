# Known Issues

## Accepted: `braces` ReDoS (GHSA-vfj7-8cjw-p6xm)

- **Severity:** high (per `pnpm audit`); `pnpm audit --prod` is clean.
- **Path:** `@vue/eslint-config-typescript` → `fast-glob` → `micromatch` → `braces` (<=3.0.3).
- **Scope:** dev-only (linting). It never ships in the built site or runs in production.
- **Status:** accepted. The advisory lists 3.0.4 as the fix, but npm's latest `braces` is 3.0.3, so no override is possible yet.
- **Follow-up:** re-run `pnpm audit` periodically (Dependabot is enabled) and add an override once a patched release is published.

## Open: Phone layout (unverified, found by code review)

- **Found:** 2026-10-04, from a static code review; not yet checked on a device or in an emulator.
- **Hero fallback avatar:** absolutely positioned with a hardcoded `padding-top: 7.5rem` in [`components/HeroSplat.vue`](components/HeroSplat.vue). It may overlap the hero buttons or leave a gap on narrow screens. The `<img>` has no intrinsic `width`/`height`, so it can shift layout while loading.
- **Performance:** `backdrop-filter: blur(...)` on the navbar, feature cards and custom blocks may cause scroll jank on low-end phones.
- **Spacing:** the homepage margins and gaps in [`layout.css`](.vitepress/theme/layout.css) don't scale down on phones.
- **Overflow risk:** blog-post iframes (`.embed-frame`) have no `max-width: 100%`.
- **Sticky hover on touch:** `.view-all-button`, `.container_row` and `.shieldButton` still apply `:hover` transforms outside `@media (hover: hover)`.
- **Music easter egg:** unavailable below 768px by design of the `!isMobileView` condition; confirm that is intended.
- **Status:** tracked in `todo.md` under "Phone Layout Follow-ups".
