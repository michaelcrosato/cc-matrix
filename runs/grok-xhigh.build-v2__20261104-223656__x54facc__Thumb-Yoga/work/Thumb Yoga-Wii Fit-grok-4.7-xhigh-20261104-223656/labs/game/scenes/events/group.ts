/**
 * @file Group Class. Three short classes on the mats: a still ring, the Heron, then the pond.
 * The deal is drawn so the seed matters. Empty seats can hold a CPU guest. Your score is your own.
 */
import type { Intents, World } from '../../../../engine/sim-api';
import { type Band, seek, stickIntents, wantBreath } from '../bot';
import { poseById } from '../data/poses';
import { clampScore } from '../score';
import { resetAct } from '../state';
import { resetBalance } from '../wobble';
import { actOf, apply, cfgOf, flowOf, rowOf, sweep } from './kit';
import { bot as pondBot, disturbed, score as pondScore, setup as pondSetup, step as pondStep } from './pond';

const LEAD = 6 * 60;
const CLASS = 45 * 60;

/** Deals the middle class, then starts the still ring. The middle is the Heron. */
export function setup(w: World): void {
  const act = actOf(w);
  resetAct(act);
  const row = rowOf(w, 0);
  resetBalance(row.wobble, row.hist);
  const deal = w.rng('deal').int(0, 2);
  act.flags = deal;
  act.text = 'heron';
  act.n = LEAD + CLASS;
  flowOf(w).line = 'group.mats';
  if (Number(w.settings.get('game.cpu')) > 0.5) {
    const rng = w.rng('sway');
    for (let seat = 1; seat <= 3; seat++) {
      const ratio = () => rng.range(0.8, 1.25);
      const phase = () => rng.range(0, Math.PI * 2);
      w.spawn({
        made: { tag: 'cpu' },
        hist: { xs: [], ys: [] },
        wobble: {
          seat,
          m1: ratio(),
          m2: ratio(),
          m3: ratio(),
          p1: phase(),
          p2: phase(),
          p3: phase(),
          n1: ratio(),
          n2: ratio(),
          n3: ratio(),
          q1: phase(),
          q2: phase(),
          q3: phase(),
        },
      });
    }
  }
}

/** A seat a real pad has claimed this step. Tests leave this unset, so the CPU still plays. */
function claimed(intents: Intents, seat: number): boolean {
  const raw = (intents as Record<string, unknown>)['game:claim'];
  return Array.isArray(raw) && raw[seat] === 1;
}

/** Steps the other mats. A claimed seat uses the pad. The rest stay CPU. They do not change your score. */
function cpus(w: World, intents: Intents): void {
  const cfg = cfgOf(w);
  const given = (intents as Record<string, unknown>)['game:seats'];
  const packed: number[] = [];
  for (let seat = 0; seat <= 3; seat++) packed.push(0, 0, 0, 0);
  for (let seat = 1; seat <= 3; seat++) {
    let row: ReturnType<typeof rowOf> | undefined;
    try {
      row = rowOf(w, seat);
    } catch {
      row = undefined;
    }
    if (!row) continue;
    if (claimed(intents, seat) && Array.isArray(given)) {
      for (let k = 0; k < 4; k++) {
        const value = given[seat * 4 + k];
        packed[seat * 4 + k] = typeof value === 'number' && Number.isFinite(value) ? value : 0;
      }
      continue;
    }
    const stick = seek('human', 0, 0, row.wobble, row.hist, cfg, w.tick, 1);
    const both = wantBreath('human', w.time, cfg.period) ? 1 : 0;
    packed[seat * 4] = stick.x;
    packed[seat * 4 + 1] = stick.y;
    packed[seat * 4 + 2] = both;
    packed[seat * 4 + 3] = both;
  }
  const fed = { 'game:seats': packed } as Intents;
  for (let seat = 1; seat <= 3; seat++) {
    try {
      rowOf(w, seat);
    } catch {
      continue;
    }
    apply(w, fed, { seat, noise: 1.35 });
  }
}

/** Lead-in, then the class. Phase 0 still, 1 heron, 2 pond. */
export function step(w: World, intents: Intents): void {
  const act = actOf(w);
  if (act.done) return;
  if (act.phase === 2) {
    const savedA = act.a;
    const savedB = act.b;
    const clock = act.hold;
    act.tick = clock;
    pondStep(w, intents);
    cpus(w, intents);
    act.hold = act.tick;
    act.a = savedA;
    act.b = savedB;
    act.phase = 2;
    if (act.done || act.hold >= 45 * 60) {
      act.c = pondScore(w);
      act.a = savedA;
      act.b = savedB;
      act.done = 1;
    } else act.done = 0;
    return;
  }
  act.tick += 1;
  act.left += 1;
  const pose = poseById('heron');
  const { body, seat } = apply(w, intents, {
    inst: act.phase === 1 ? pose.instability : 1,
    noise: act.phase === 1 ? 1 : 1,
  });
  cpus(w, intents);
  if (act.left < LEAD) return;
  const scoring = act.left - LEAD;
  if (act.phase === 0) {
    act.samples += 1;
    if (Math.hypot(body.x, body.y) <= 0.22) act.acc += 1;
    if (scoring >= CLASS) {
      act.a = 1000 * (act.samples ? act.acc / act.samples : 0);
      act.phase = 1;
      act.left = 0;
      act.samples = 0;
      act.acc = 0;
      flowOf(w).line = 'group.heron';
    }
    return;
  }
  const down = seat.fl > 0.5;
  act.samples += 1;
  if (down && Math.hypot(body.x, body.y) <= 0.2) act.acc += 1;
  act.acc2 += body.sync;
  if (scoring >= CLASS) {
    const inShare = act.samples ? act.acc / act.samples : 0;
    const sync = act.samples ? act.acc2 / act.samples : 0;
    const savedA = act.a;
    const savedB = clampScore(1000 * (0.7 * inShare + 0.3 * sync));
    pondSetup(w, 45);
    act.a = savedA;
    act.b = savedB;
    act.phase = 2;
    act.hold = 0;
    act.done = 0;
    flowOf(w).line = 'group.pond';
  }
}

/** The mean of the three classes, so a rank still fits in 0 to 1000. */
export function score(w: World): number {
  const act = actOf(w);
  return clampScore((act.a + act.b + act.c) / 3);
}

/** Holds the centre, the Heron, or the breath, depending on the class. */
export function bot(w: World, band: Band): Intents {
  const act = actOf(w);
  if (act.phase === 2) return pondBot(w, band);
  const row = rowOf(w, 0);
  const cfg = cfgOf(w);
  if (band === 'idle') return stickIntents({ x: 0, y: 0 }, {});
  const pose = poseById('heron');
  const inst = act.phase === 1 ? pose.instability : 1;
  const stick = seek(band, 0, 0, row.wobble, row.hist, cfg, w.tick, inst);
  const breathe = wantBreath(band, w.time, cfg.period);
  if (act.phase === 1) return stickIntents(stick, { both: breathe, l: true });
  return stickIntents(stick, act.phase === 0 ? {} : { both: breathe });
}

/** CPU guests and ripples go. Your mat stays. */
export function teardown(w: World): void {
  sweep(w);
}

/** Used so a stray press in a test can see the pond rule. */
export { disturbed };

/** The activity record. */
export const group = {
  id: 'group',
  title: 'Group Class',
  seconds: 153,
  setup,
  step,
  teardown,
  score,
  bot,
};
