export const SITE_CONSTANTS = {
  AUTHOR: 'Jonny van der Hoeven',
  SITE_NAME: 'Justme.dev',
  HOSTNAME: 'https://justme.dev',
  MEDIA_URL: 'https://media.justme.dev',
  LANG: 'en-US',
  DESCRIPTION: 'Justme.dev - Jonny van der Hoeven. Just make it!',
  KEYWORDS:
    'Personal Portfolio, justme.dev, SRE, Kubernetes, Infrastructure as Code',
  IMAGES: {
    DEFAULT: 'https://media.justme.dev/images/justme.dev.webp',
    LOGO_LIGHT: 'https://media.justme.dev/images/logo.webp',
    LOGO_DARK: 'https://media.justme.dev/images/logo_dark.webp',
    GOOGLE_ICON: 'https://media.justme.dev/images/google.webp',
    FAVICON_MASK_COLOR: '#16673c',
    THEME_COLOR: '#ffffff'
  },
  SOCIAL_LINKS: {
    GITHUB: 'https://github.com/jonnyhoeven/',
    YOUTUBE: 'https://www.youtube.com/@JustDevMe',
    LINKEDIN: 'https://www.linkedin.com/in/jonnyhoeven/',
    GOOGLE_DEV: 'https://g.dev/jonnyvanderhoeven',
    REPO: 'https://github.com/jonnyhoeven/justme.dev'
  },
  /** Viewport width (px) below which the hero shows the static avatar and the music mini-player is hidden. CSS media queries can't read this; keep them at `MOBILE_BREAKPOINT - 1` / `MOBILE_BREAKPOINT` (768px). */
  MOBILE_BREAKPOINT: 768,
  /** How long the avatar animation runs before morphing into a scene (ms) */
  SPLAT_CYCLE_TIME: 15000,
  /** How long a full-canvas scene runs before morphing back (ms) */
  SPLAT_SCENE_TIME: 12000,
  /** Duration of each avatar <-> scene morph (ms) */
  SPLAT_MORPH_TIME: 2200,
  /** Faster morph used when the visitor clicks, so it feels responsive (ms) */
  SPLAT_MORPH_CLICK_TIME: 900,
  /** Fraction of the canvas width kept free on the left for scenes (0-1) */
  SPLAT_SCENE_LEFT_PAD: 0,
  /** Scene opacity at the far left (behind the hero text), fading to full on the right (0-1) */
  SPLAT_SCENE_LEFT_FADE: 0.15
};
