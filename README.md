# justme.dev

The source of [justme.dev](https://justme.dev), a personal blog and project showcase. It is a static site built with
[VitePress](https://vitepress.dev) and hosted on GitHub Pages. Project pages are generated from the READMEs of my
other GitHub repositories. The home page has a particle canvas that reacts to a built-in player for FastTracker 2
(`.xm`) music.

## How it works

1. Each project is a small manifest in `requests/*.yaml`.
2. `scripts/process_requests.py` reads the manifests. For each one it fetches the repository README from GitHub,
   makes relative links absolute, and fetches star, fork and watcher counts for the badges. A failed stats request
   does not fail the build.
3. The result is written to `projects/*.md`. These files are generated. Do not edit them.
4. VitePress builds the site, and GitHub Actions deploys it to GitHub Pages.

The deploy workflow runs on pushes to `main` and on pull requests. It also runs every Monday. It lints, checks
formatting and types, runs the tests, generates the content, builds the site and deploys it. A second weekly workflow
opens a pull request that updates `flake.lock`, and Dependabot updates the npm packages and GitHub Actions.

Large media files are not in the repository. Audio, images and fonts are uploaded to a Cloudflare R2 bucket and served
from `media.justme.dev`. The `*:sync` scripts do the upload and need `R2_*` variables, see `.env.example`.

## The interesting bits

### Hero canvas

The home page hero is a canvas of coloured particles (splats). They form my avatar and animate in several styles.
Every so often they morph into a full-screen scene such as a starfield, rotozoom, copper bars, a bouncing ball or
pong, and then back to the avatar. Clicking the hero skips ahead. The canvas pauses when it is off-screen, when the tab
is hidden, or when the visitor prefers reduced motion.

While music plays, the canvas reacts to it. An FFT of the audio drives bass, mid and treble levels and a kick
detector that pumps the particles and the glow behind them.

Code: `components/HeroSplat.vue`, `lib/splat-animations/` and `lib/splat-scenes/`.

### XM tracker player

`lib/audio/xm-player.ts` plays FastTracker 2 modules in the browser. It is derived from
[jsxm](https://github.com/a1k0n/jsxm) (MIT) and mixes the samples in a `ScriptProcessorNode`.

- A mini player docks at the bottom of every page and keeps playing while you navigate.
- The [tracker page](https://justme.dev/blog/tracker) has the full player with a per-channel oscilloscope, a scrolling
  pattern view, instruments and a playlist. Channels can be muted or soloed, and tracks can be shared by link.
- The archive holds about 3,400 tracks. Only a small starter set is bundled with every page. The full catalog is
  loaded on demand.

Code: `components/MiniPlayer.vue`, `components/TrackerPlayer.vue` and `.vitepress/theme/composables/useMusic.ts`.

## Development

The environment comes from a Nix flake, loaded with [direnv](https://direnv.net). You need
[Nix](https://nixos.org/download/) and direnv installed. The flake provides:

- Node.js 24 with corepack (pnpm)
- Python 3 with `pyyaml`, `pydantic`, `pillow`, `pytest`, `pytest-cov`, `boto3` and `python-dotenv`
- ImageMagick (local shell only)
- `ruff` and `pre-commit`

```bash
direnv allow
pnpm install
pnpm run docs:dev
```

If the tools are not on your `PATH`, prefix commands with `direnv exec . `. The dev server listens on port 5173.

| Purpose                 | Command                                                                |
| :---------------------- | :--------------------------------------------------------------------- |
| Dev server              | `pnpm run docs:dev`                                                    |
| Generate project pages  | `pnpm run docs:generate`                                               |
| Generate splat assets   | `pnpm run docs:generate-splats`                                        |
| Build / preview         | `pnpm run docs:build` / `pnpm run docs:preview`                        |
| Lint / format (JS, Vue) | `pnpm run lint` / `pnpm run format`                                    |
| Lint (Python)           | `ruff check . --fix`                                                   |
| Type check              | `pnpm run typecheck`                                                   |
| Tests (Vitest, pytest)  | `pnpm test` / `pnpm run test:py` (both: `pnpm run test:all`)           |
| Sync media to R2        | `pnpm run audio:sync`, `images:sync`, `fonts:sync` (all: `media:sync`) |
| All pre-commit hooks    | `pre-commit run --all-files`                                           |

`AGENTS.md` describes the architecture in more detail.

## Adding a project

Add a file to `requests/`, for example `requests/workshop.yaml`:

```yaml
title: Git Ops Workshop
type: project
date: 2021-08-01
image: /images/gitops-workshop.webp
fetchReadme: true
gitlink: https://github.com/jonnyhoeven/workshop
user: jonnyhoeven
project: workshop
branch: main
readmeFile: README.md
languages: Kubernetes
outline: deep
intro: A hands-on workshop for a K3s and ArgoCD GitOps setup.
```

`title`, `date`, `image`, `languages` and `intro` are required. The rest is optional:

- `fetchReadme`: fetch the README from GitHub. This needs `user` and `project`. `branch` (default `main`) and
  `readmeFile` (default `README.md`) pick the file.
- `content`: use this Markdown instead of a fetched README.
- `gitlink`, `externalUrl` and `externalUrlLabel`: links shown on the page.
- `type` (default `project`) and `outline` (default `deep`).

Run `pnpm run docs:generate` to create the page in `projects/`.

## License

The code is licensed under the [GNU General Public License v3.0 or later](LICENSE) (`GPL-3.0-or-later`). Every
first-party source file carries an [SPDX](https://spdx.dev/) header. Third-party components and their licenses are
listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The license covers the code only. The tracker music served from the media bucket belongs to its original composers.
Content aggregated from other repositories keeps the licenses of those repositories.
