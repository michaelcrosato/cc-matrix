/** @file The activity lifecycle used by the residency, group round, bots and attract. */
import { activity, type EventId } from '../data/days';
import { makeWobble, stepWobble, clamp, balanceBot } from '../wobble';
import type { Lean, Wobble } from '../wobble';
import { balanceGuide, botBalance, stepBalance } from './balance';
import { gardenGuide, loadTray, stepGarden, gardenBot } from './garden';
import { motionGuide, motionBot, stepMotion } from './motion';
import { tiltGuide, tiltBot, stepTilt } from './tilt';
import type { ActivityModule, ActivityRun, EventConfig, Guide } from './types';
export function createRun(id: EventId, seed: number, short = false): ActivityRun {
  const r: ActivityRun = {
    id,
    tick: 0,
    length: (short ? 45 : activity(id).seconds) * 60,
    score: 0,
    total: 0,
    samples: 0,
    count: 0,
    combo: 0,
    bestCombo: 0,
    mistakes: 0,
    lastFoot: 0,
    lastTap: -1000,
    lastL: false,
    lastR: false,
    composure: 1000,
    progress: 0,
    hold: 0,
    phase: 0,
    pose: 0,
    breath: 0,
    targetX: 0,
    targetY: 0,
    ring: 0.22,
    angle: 0,
    previousAngle: 0,
    velocity: 0,
    offset: 0,
    gate: 0,
    marbles: [],
    tray: 0,
    sunk: 0,
    guests: 1,
    tilt: 6,
    scores: [0, 0, 0, 0],
    seats: [],
    inputs: [],
    children: [],
    seed,
    short,
  };
  if (id === 'garden') loadTray(r);
  if (id === 'dive') r.scores = [];
  if (id === 'group') {
    r.length = 3 * 51 * 60;
    for (let i = 0; i < 4; i++) {
      r.seats.push(makeWobble(Array.from({ length: 6 }, (_, j) => seed * 0.3 + i + j * 0.8)));
      r.children.push(createRun('check', seed, true));
    }
  }
  return r;
}
export function guideFor(r: ActivityRun, c: EventConfig): Guide {
  if (r.id === 'group') {
    const child = r.children[0],
      g = guideFor(child, c);
    return {
      ...g,
      title: `Class ${Math.min(3, r.phase + 1)} / 3 · ${g.title}`,
      instruction: r.tick % 3060 < 360 ? 'Find your mat. We will begin together.' : g.instruction,
    };
  }
  if (r.id === 'garden') return gardenGuide(r);
  if (r.id === 'tilt') return tiltGuide(r);
  if (['check', 'pose', 'pond'].includes(r.id)) return balanceGuide(r, c);
  return motionGuide(r, c);
}
export function botFor(r: ActivityRun, w: Wobble, c: EventConfig, kind = 'perfect'): Lean {
  if (r.id === 'group') return botFor(r.children[0], r.seats[0], c, kind);
  if (r.id === 'garden') return gardenBot(r, kind);
  if (r.id === 'tilt') return tiltBot(r, w, c, kind);
  if (['check', 'pose', 'pond'].includes(r.id)) return botBalance(r, w, c, kind);
  return motionBot(r, w, c, kind);
}
function stepGroup(r: ActivityRun, input: Lean, c: EventConfig): void {
  const part = Math.min(2, Math.floor(r.tick / 3060));
  if (part !== r.phase) {
    for (let i = 0; i < 4; i++) {
      r.scores[i] += r.children[i].score;
      r.children[i] = createRun(part === 1 ? (r.seed % 2 ? 'hoop' : 'step') : 'pond', r.seed + i, true);
    }
    r.phase = part;
  }
  if (r.tick % 3060 >= 360)
    for (let i = 0; i < 4; i++) {
      const child = r.children[i],
        w = r.seats[i];
      const seatInput =
        r.inputs[i] ??
        (i === 0 && r.inputs.length !== 4
          ? input
          : botFor(child, w, c, i === 1 ? 'sloppy' : i === 2 ? 'human' : 'perfect'));
      stepEvent(child, w, seatInput, c);
    }
  r.score = r.scores[0] + r.children[0].score;
}
export function stepEvent(r: ActivityRun, w: Wobble, input: Lean, c: EventConfig): void {
  if (r.tick >= r.length) return;
  if (r.id === 'group') stepGroup(r, input, c);
  else {
    const g = guideFor(r, c);
    r.targetX = g.x;
    r.targetY = g.y;
    r.ring = g.ring;
    if (r.id !== 'garden') stepWobble(w, input, r.tick, c.wobble);
    if (r.id === 'garden') {
      const n = Math.max(1, Math.hypot(input.x, input.y));
      w.x = (input.x / n) * 0.9;
      w.y = (input.y / n) * 0.9;
      w.tx = input.x;
      w.ty = input.y;
      stepGarden(r, input, c);
    } else if (r.id === 'tilt') stepTilt(r, w, input, c);
    else if (['check', 'pose', 'pond'].includes(r.id)) stepBalance(r, w, input, c);
    else stepMotion(r, w, input, c);
    r.score = clamp(r.score, 0, 1000);
  }
  r.tick++;
}
export const MODULES: ActivityModule[] = activityIds().map((id) => ({
  id,
  setup: (r) => {
    if (id === 'garden') loadTray(r);
  },
  guide: guideFor,
  step: stepEvent,
  score: (r) => r.score,
  bot: botFor,
  teardown: (r) => {
    r.inputs = [];
    r.marbles = [];
  },
}));
function activityIds(): EventId[] {
  return ['check', 'pose', 'pond', 'reps', 'garden', 'paddle', 'line', 'step', 'hoop', 'dive', 'jog', 'group', 'tilt'];
}
export { balanceBot };
