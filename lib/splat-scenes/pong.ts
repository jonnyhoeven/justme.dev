import type {
  AnimationContext,
  SplatScene,
  SplatParticle
} from '../splat-animations/types';
import { dotSize, frac, R2_A, R2_B } from './utils';

/**
 * Particle Pong: two AI paddles rally a comet-trailed ball under a dot-matrix
 * score. The AI deliberately fumbles now and then so the score moves, and kicks
 * speed the ball up.
 */

// 3x5 dot-matrix digits, rows separated by "/"
export const DIGITS = [
  '###/#.#/#.#/#.#/###',
  '.#./##./.#./.#./###',
  '###/..#/###/#../###',
  '###/..#/###/..#/###',
  '#.#/#.#/###/..#/..#',
  '###/#../###/..#/###',
  '###/#../###/#.#/###',
  '###/..#/..#/..#/..#',
  '###/#.#/###/#.#/###',
  '###/#.#/###/..#/###'
];
const LIT: [number, number][][] = DIGITS.map((d) =>
  d
    .split('/')
    .flatMap((row, y) =>
      [...row].flatMap((c, x): [number, number][] =>
        c === '#' ? [[x, y]] : []
      )
    )
);

// The court is this fraction of the area, tucked against the right edge so the
// left paddle doesn't sit behind the hero text
const COURT_SCALE = 0.8 * 0.88;
const COURT_RIGHT = 0.94;

const WIN_SCORE = 10;
const TRAIL_LEN = 20;
const TRAIL_STEP = 22; // ms between trail samples
const SERVE_DELAY = 700;
const MISS_CHANCE = 0.22;
const NET_DASHES = 12;
const PADDLE_COLS = 3;

const LEFT_COLOR = '72, 176, 224';
const RIGHT_COLOR = '220, 92, 160';
const NEUTRAL = '150, 160, 180';
const LINE_COLOR = '120, 130, 150';

// Particle groups in draw order: walls, net, score, trail, paddles, ball
const SHARE = [0.12, 0.08, 0.25, 0.3, 0.1, 0.15];
const bounds: number[] = [];
let groupLookup = new Uint8Array(0);
let groupOffset: number[] = [];

// Court (px, canvas space), recomputed every frame
let x0 = 0;
let x1 = 0;
let y0 = 0;
let y1 = 0;
let padH = 80;
let padLX = 0;
let padRX = 0;
let ballRadius = 10;
let cell = 18;
let paddleDot = 4;
let dots = { wall: 1, net: 1, score: 1, trail: 1, paddle: 1, ball: 1 };

// Game state
let bx = 0;
let by = 0;
// Displayed ball position: glides to the serve spot instead of teleporting,
// so the spring-driven particles don't overshoot a sudden jump
let shX = 0;
let shY = 0;
let dirX = 1;
let slope = 0;
let rally = 0;
let serveTimer = 0;
let scoreL = 0;
let scoreR = 0;
let padLY = 0;
let padRY = 0;
let offsetL = 0;
let offsetR = 0;
let recoilL = 0;
let recoilR = 0;
let ballColor = NEUTRAL;
let trailAcc = 0;
const trailX = new Float32Array(TRAIL_LEN);
const trailY = new Float32Array(TRAIL_LEN);

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function layoutCourt(ctx: AnimationContext) {
  x1 = ctx.areaX + ctx.areaW * COURT_RIGHT;
  x0 = x1 - ctx.areaW * COURT_SCALE;
  const cy = ctx.areaY + ctx.areaH / 2;
  y0 = cy - (ctx.areaH * COURT_SCALE) / 2;
  y1 = cy + (ctx.areaH * COURT_SCALE) / 2;
  padH = (y1 - y0) * 0.19;
}

function aim(): number {
  return Math.random() < MISS_CHANCE
    ? (Math.random() < 0.5 ? -1 : 1) * padH * (0.75 + Math.random() * 0.3)
    : (Math.random() - 0.5) * padH * 0.6;
}

function serve() {
  bx = (x0 + x1) / 2;
  by = y0 + (y1 - y0) * (0.3 + Math.random() * 0.4);
  dirX = Math.random() < 0.5 ? -1 : 1;
  slope = (Math.random() - 0.5) * 0.8;
  rally = 0;
  serveTimer = SERVE_DELAY;
  ballColor = NEUTRAL;
  offsetL = aim();
  offsetR = aim();
}

function score(left: boolean) {
  if (left) scoreL++;
  else scoreR++;
  if (scoreL >= WIN_SCORE || scoreR >= WIN_SCORE) scoreL = scoreR = 0;
  serve();
}

function step(dt: number, beat: number) {
  const w = x1 - x0;
  const h = y1 - y0;

  // Paddles chase the ball while it heads their way, otherwise drift to centre
  const reach = h * 0.0007 * dt;
  const mid = (y0 + y1) / 2;
  const goalL = dirX < 0 ? by + offsetL : mid;
  const goalR = dirX > 0 ? by + offsetR : mid;
  padLY += clamp(goalL - padLY, -reach, reach);
  padRY += clamp(goalR - padRY, -reach, reach);
  const half = padH / 2;
  padLY = clamp(padLY, y0 + half, y1 - half);
  padRY = clamp(padRY, y0 + half, y1 - half);
  recoilL *= Math.exp(-dt / 140);
  recoilR *= Math.exp(-dt / 140);

  if (serveTimer > 0) {
    serveTimer -= dt;
    return;
  }

  const speed =
    w * 0.00042 * (1 + Math.min(rally, 12) * 0.05) * (1 + beat * 0.45);
  bx += dirX * speed * dt;
  by += slope * speed * dt;
  if (by < y0 + ballRadius) {
    by = y0 + ballRadius;
    slope = Math.abs(slope);
  } else if (by > y1 - ballRadius) {
    by = y1 - ballRadius;
    slope = -Math.abs(slope);
  }

  const face = w * 0.012;
  if (dirX > 0 && bx + ballRadius >= padRX - face) {
    if (Math.abs(by - padRY) <= half + ballRadius * 0.5 && bx < padRX) {
      dirX = -1;
      slope = clamp((by - padRY) / half, -1, 1) * 0.85;
      rally++;
      recoilR = 1;
      ballColor = RIGHT_COLOR;
      offsetL = aim();
    } else if (bx > x1) score(true);
  } else if (dirX < 0 && bx - ballRadius <= padLX + face) {
    if (Math.abs(by - padLY) <= half + ballRadius * 0.5 && bx > padLX) {
      dirX = 1;
      slope = clamp((by - padLY) / half, -1, 1) * 0.85;
      rally++;
      recoilL = 1;
      ballColor = LEFT_COLOR;
      offsetR = aim();
    } else if (bx < x0) score(false);
  }
}

export const pong: SplatScene = {
  name: 'Particle Pong',
  alpha: 0.9,
  glow: 0.7,
  glowShape: 'rect',

  glowRect(_ctx, out) {
    // The glow lights up the arena itself
    out.x = (x0 + x1) / 2;
    out.y = (y0 + y1) / 2;
    out.w = (x1 - x0) * 1.15;
    out.h = (y1 - y0) * 1.2;
  },

  init(particles: SplatParticle[], ctx) {
    let acc = 0;
    bounds.length = 0;
    for (const s of SHARE) {
      acc += s;
      bounds.push(Math.round(acc * particles.length));
    }
    bounds[bounds.length - 1] = particles.length;

    groupLookup = new Uint8Array(particles.length);
    groupOffset = new Array(bounds.length);
    let start = 0;
    for (let g = 0; g < bounds.length; g++) {
      groupOffset[g] = start;
      const end = bounds[g];
      for (let i = start; i < end; i++) {
        groupLookup[i] = g;
      }
      start = end;
    }

    scoreL = scoreR = 0;
    padLY = padRY = ctx.areaY + ctx.areaH / 2;
    recoilL = recoilR = 0;
    trailAcc = 0;
    layoutCourt(ctx);
    serve();
    shX = bx;
    shY = by;
    trailX.fill(bx);
    trailY.fill(by);
  },

  beforeFrame(_elapsed, ctx) {
    layoutCourt(ctx);
    padLX = x0 + (x1 - x0) * 0.04;
    padRX = x1 - (x1 - x0) * 0.04;
    ballRadius = (y1 - y0) * 0.023;
    cell = (y1 - y0) * 0.034;

    const { beat } = ctx.audioLevels;
    step(Math.min(ctx.dt, 50), beat);
    if (serveTimer > 0) {
      const k = 1 - Math.exp(-Math.min(ctx.dt, 50) / 150);
      shX += (bx - shX) * k;
      shY += (by - shY) * k;
    } else {
      shX = bx;
      shY = by;
    }

    trailAcc += ctx.dt;
    while (trailAcc >= TRAIL_STEP) {
      trailAcc -= TRAIL_STEP;
      trailX.copyWithin(1, 0);
      trailY.copyWithin(1, 0);
      trailX[0] = shX;
      trailY[0] = shY;
    }

    const n = (g: number) => Math.max(1, bounds[g] - (bounds[g - 1] ?? 0));
    const wallStep = (x1 - x0) / (n(0) / 2);
    const padRows = Math.max(2, Math.floor(n(4) / 2 / PADDLE_COLS));
    paddleDot = Math.min(4.5, (padH / padRows) * 0.75);
    dots = {
      wall: dotSize(Math.min(3.5, wallStep * 0.35), ctx),
      net: dotSize(Math.min(3.5, ((y1 - y0) / n(1)) * NET_DASHES * 0.3), ctx),
      score: dotSize(cell * 0.28, ctx),
      trail: dotSize(ballRadius * 0.8, ctx),
      paddle: dotSize(paddleDot, ctx),
      ball: dotSize(ballRadius * 0.4, ctx)
    };
  },

  target(_p, i, _elapsed, _ctx, out) {
    const g = groupLookup[i];
    const offset = groupOffset[g];
    const j = i - offset;
    const count = bounds[g] - offset;
    out.colorOverride = LINE_COLOR;

    switch (g) {
      case 0: {
        // top and bottom walls
        const per = Math.ceil(count / 2);
        out.x = x0 + ((Math.floor(j / 2) + 0.5) / per) * (x1 - x0);
        out.y = j & 1 ? y1 : y0;
        out.sizeMult = dots.wall;
        break;
      }
      case 1: {
        // dashed net
        const perDash = Math.ceil(count / NET_DASHES);
        const d = j % NET_DASHES;
        const k = Math.floor(j / NET_DASHES);
        out.x = (x0 + x1) / 2;
        out.y =
          y0 + (d + ((k + 0.5) / perDash) * 0.5) * ((y1 - y0) / NET_DASHES);
        out.sizeMult = dots.net;
        break;
      }
      case 2: {
        // score: the particles split over the lit cells of each digit
        const left = j < count / 2;
        const lit = LIT[(left ? scoreL : scoreR) % 10];
        const jj = left ? j : j - Math.floor(count / 2);
        const [cx, cy] = lit[jj % lit.length];
        const mx = (x0 + x1) / 2 + (left ? -1 : 1) * (x1 - x0) * 0.12;
        out.x =
          mx + (cx - 1) * cell + (frac(jj * R2_A + 0.1) - 0.5) * cell * 0.8;
        out.y =
          y0 +
          (y1 - y0) * 0.1 +
          cy * cell +
          (frac(jj * R2_B + 0.3) - 0.5) * cell * 0.8;
        out.sizeMult = dots.score;
        out.colorOverride = left ? LEFT_COLOR : RIGHT_COLOR;
        break;
      }
      case 3: {
        // comet trail: older samples are smaller
        const s = j % TRAIL_LEN;
        const taper = 1 - (0.75 * s) / TRAIL_LEN;
        out.x = trailX[s] + (frac(j * R2_A) - 0.5) * ballRadius * 0.8;
        out.y = trailY[s] + (frac(j * R2_B) - 0.5) * ballRadius * 0.8;
        out.sizeMult = dots.trail * taper;
        out.colorOverride = ballColor;
        break;
      }
      case 4: {
        // paddles: left half of the group, then right half
        const per = Math.floor(count / 2);
        const left = j < per;
        const jj = left ? j : j - per;
        const m = left ? per : count - per;
        // Whole rows only; the 0-2 leftover particles stack on the last cell
        const rows = Math.max(2, Math.floor(m / PADDLE_COLS));
        const g = Math.min(jj, rows * PADDLE_COLS - 1);
        const row = Math.floor(g / PADDLE_COLS);
        const col = g % PADDLE_COLS;
        const recoil = (left ? -recoilL : recoilR) * (x1 - x0) * 0.012;
        out.x = (left ? padLX : padRX) + recoil + (col - 1) * paddleDot * 0.9;
        out.y = (left ? padLY : padRY) + (row / (rows - 1) - 0.5) * padH;
        out.sizeMult = dots.paddle;
        out.colorOverride = left ? LEFT_COLOR : RIGHT_COLOR;
        break;
      }
      default: {
        // the ball: a small disc
        const r = Math.sqrt((j + 0.5) / count) * ballRadius * 0.7;
        const a = j * 2.399963;
        out.x = shX + Math.cos(a) * r;
        out.y = shY + Math.sin(a) * r;
        out.sizeMult = dots.ball;
        out.colorOverride = ballColor;
      }
    }
  }
};
