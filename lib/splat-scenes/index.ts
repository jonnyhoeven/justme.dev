import { dotShapes } from './dot-shapes';
import { rotozoom } from './rotozoom';
import { starfield } from './starfield';
import { sineText } from './sine-text';
import { copperBars } from './copper-bars';
import { boingBall } from './boing-ball';
import { pong } from './pong';
import type { SplatScene } from '../splat-animations/types';

/** Full-canvas scenes, shown in this order between avatar animations. */
export const scenes: SplatScene[] = [
  dotShapes,
  starfield,
  rotozoom,
  sineText,
  copperBars,
  boingBall,
  pong
];
