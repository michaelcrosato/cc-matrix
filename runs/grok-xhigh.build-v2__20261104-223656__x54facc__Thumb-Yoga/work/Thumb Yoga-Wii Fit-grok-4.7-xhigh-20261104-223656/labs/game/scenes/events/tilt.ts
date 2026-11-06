/**
 * @file The Great Tilt. A storm, a walk to the east terrace, the centre stone, then dawn.
 * The island's geometry stays put. Your centre of balance is what leans it, once you are on the stone.
 * There is no fail state. The clock moves every part on.
 */
import type { Intents, World } from '../../../../engine/sim-api';
import { type Band, seek, stickIntents, wantBreath } from '../bot';
import { clampScore } from '../score';
import { resetAct, visit } from '../state';
import { resetBalance } from '../wobble';
import { actOf, apply, cfgOf, flowOf, rowOf, sweep } from './kit';

const NAMES = ['Nan', 'Gerald', 'Bex', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

/** Guests, the storm, and a still balance. Attract begins on the stone. */
export function setup(w: World): void {
  const act = actOf(w);
  resetAct(act);
  const row = rowOf(w, 0);
  resetBalance(row.wobble, row.hist);
  const attract = String(w.settings.get('game.auto')) === 'attract';
  for (let i = 0; i < 12; i++) {
    const nan = i === 0;
    const col = (i - 1) % 4;
    const row = Math.floor((i - 1) / 4);
    w.spawn({
      made: { tag: 'guest' },
      mark: {
        x: nan ? 64 : 1 + col * 2.2,
        y: 0,
        z: nan ? 8 : (row - 1) * 2.2,
        kind: 'guest',
        text: NAMES[i] ?? 'guest',
        taken: nan ? 1 : 0,
        follow: nan ? 1 : 0,
      },
    });
  }
  flowOf(w).line = 'tilt.storm';
  visit(flowOf(w), 'tilt:storm');
  if (attract) {
    act.phase = 2;
    act.a = 1;
    act.b = 1;
    visit(flowOf(w), 'tilt:east');
    visit(flowOf(w), 'tilt:stone');
    flowOf(w).line = 'tilt.stone';
  }
}

/** The lean the storm, the deeds and the centre stone all write. */
function islandTilt(w: World): { tiltX: number; tiltZ: number; base: number } | undefined {
  const island = w.query('island') as unknown as { island: { tiltX: number; tiltZ: number; base: number } }[];
  return island[0]?.island;
}

function delivered(w: World): number {
  let n = 0;
  for (const row of w.query('mark') as unknown as { mark: { kind: string; taken: number } }[]) {
    if (row.mark.kind === 'guest' && row.mark.taken > 0.5) n += 1;
  }
  return n;
}

/** The four parts. Each one ends itself. */
export function step(w: World, intents: Intents): void {
  const act = actOf(w);
  if (act.done) return;
  const flow = flowOf(w);
  const phase = act.phase;
  const inst = phase === 2 ? 1 : 1;
  const wave = phase === 2 ? Math.sin(w.time * 1.4) * 0.55 : 0;
  const { body, seat } = apply(w, intents, { dx: wave, inst, noise: phase === 2 ? 1 : 0.4 });
  act.tick += 1;
  act.left += 1;
  if (phase === 0) {
    const tilt = islandTilt(w);
    if (tilt) {
      const rate = Number(w.settings.get('game.tilt.rate'));
      const speed = Number.isFinite(rate) ? rate : 0.15;
      tilt.tiltX = tilt.base + (act.left / 60) * speed;
    }
    if (act.left >= 20 * 60) {
      act.a = 1;
      act.phase = 1;
      act.left = 0;
      flow.line = 'tilt.east';
      visit(flow, 'tilt:east');
    }
    return;
  }
  if (phase === 1) {
    act.px += Math.max(0, body.y) * 6 * w.dt;
    if (seat.both) act.hold += 1;
    else {
      if (act.hold >= 50) pulse(w);
      act.hold = 0;
    }
    const tilt = islandTilt(w);
    for (const row of w.query('mark') as unknown as {
      mark: { kind: string; x: number; z: number; follow: number; taken: number };
    }[]) {
      const mark = row.mark;
      if (mark.kind !== 'guest') continue;
      if (mark.follow > 0.5) mark.x += (act.px - mark.x) * Math.min(1, 4 * w.dt);
      else mark.x -= 0.3 * w.dt;
      if (mark.x > 58 && mark.taken < 0.5) {
        mark.taken = 1;
        if (tilt) tilt.tiltX -= 0.5;
      }
    }
    if (act.left >= 75 * 60) {
      act.b = delivered(w) / 12;
      act.phase = 2;
      act.left = 0;
      act.samples = 0;
      act.acc = 0;
      act.acc2 = 0;
      resetBalance(rowOf(w, 0).wobble, rowOf(w, 0).hist);
      flow.line = 'tilt.stone';
      visit(flow, 'tilt:stone');
    }
    return;
  }
  if (phase === 2) {
    const ring = 0.3 - 0.14 * Math.min(1, act.left / (60 * 60));
    act.samples += 1;
    if (Math.hypot(body.x, body.y) <= ring) act.acc += 1;
    act.acc2 += body.sync;
    const tilt = islandTilt(w);
    if (tilt) {
      tilt.tiltX = body.x * 6;
      tilt.tiltZ = body.y * 6;
    }
    if (act.left >= 60 * 60) {
      act.c = act.samples ? act.acc / act.samples : 0;
      act.hz = act.samples ? act.acc2 / act.samples : 0;
      act.phase = 3;
      act.left = 0;
      if (tilt) {
        tilt.tiltX = 0;
        tilt.tiltZ = 0;
      }
      flow.line = 'tilt.dawn';
      visit(flow, 'tilt:dawn');
    }
    return;
  }
  if (act.left >= 15 * 60) act.done = 1;
}

/** A calm wave. Guests close enough come with you. Nan is already there. */
function pulse(w: World): void {
  const act = actOf(w);
  for (const row of w.query('mark') as unknown as { mark: { kind: string; x: number; z: number; follow: number } }[]) {
    const mark = row.mark;
    if (mark.kind !== 'guest') continue;
    if (Math.hypot(mark.x - act.px, mark.z) < 8) mark.follow = 1;
  }
  act.falls += 1;
}

/** Storm, guests, the stone, and the breath on it. */
export function score(w: World): number {
  const act = actOf(w);
  return clampScore(1000 * (0.15 * act.a + 0.35 * act.b + 0.4 * act.c + 0.1 * act.hz));
}

/** Breathes in the storm, walks east, then holds the stone. */
export function bot(w: World, band: Band): Intents {
  const act = actOf(w);
  const row = rowOf(w, 0);
  const cfg = cfgOf(w);
  const breathe = wantBreath(band, w.time, cfg.period);
  if (band === 'idle') return stickIntents({ x: 0, y: 0 }, {});
  if (act.phase === 1) {
    const stick = seek(band, 0, 0.55, row.wobble, row.hist, cfg, w.tick);
    const call = act.left % 240 < 100;
    return stickIntents(stick, { both: call });
  }
  const stick = seek(band, 0, 0, row.wobble, row.hist, cfg, w.tick);
  return stickIntents(stick, { both: breathe });
}

/** The crowd markers leave. The island stays. */
export function teardown(w: World): void {
  sweep(w);
}

/** The activity record. */
export const tilt = {
  id: 'tilt',
  title: 'The Great Tilt',
  seconds: 170,
  setup,
  step,
  teardown,
  score,
  bot,
};
