/**
 * @file The retreat, driven through the shipped scene. Bands, the balance step, teardown and the director
 * all call the activities' own setup, step, score and bot. Nothing here reimplements the disc.
 */
import { describe, expect, it } from 'vitest';
import type { EngineFrame } from '../../engine';
import { createAppHost, type AppRun } from '../../engine/app/headless';
import type { Intents, World } from '../../engine/sim-api';
import { bench } from './scenes/bench';
import type { Band } from './scenes/bot';
import { ACTIVITIES, type Activity } from './scenes/catalog';
import { programme } from './scenes/data/days';
import { actOf, cfgOf, flowOf, rowOf } from './scenes/events/kit';
import { disturbed, pond } from './scenes/events/pond';
import { ageLine, wobbleAge } from './scenes/score';
import { inRing, resetBalance, stepBalance, type Stick } from './scenes/wobble';
import { freshSave, noteProgress } from './ui/save';
import { emptySnap, readSnap, resultCopy } from './ui/snap';

const BANDS: readonly Band[] = ['perfect', 'human', 'sloppy', 'idle'];
const SEEN = [
  'morning',
  'pose',
  'pose-a',
  'pose-b',
  'pose-c',
  'pond',
  'garden',
  'paddle',
  'line',
  'group',
  'tilt:storm',
  'tilt:east',
  'tilt:stone',
  'tilt:dawn',
  'evening',
  'credits',
];

/** A live world and the menu actions that drive it. */
function open(seed: number, settings?: Record<string, unknown>) {
  const run = createAppHost({ scene: bench, seed, settings });
  const w = run.session.world as World;
  const menu = (name: string, args?: unknown) => {
    (run.inspector.actions as { run: (action: string, value?: unknown) => void }).run(name, args);
  };
  const reseed = (next: number) => {
    (run.inspector.seed as (n?: number) => number)(next);
  };
  return { run, w, menu, reseed };
}

/** A stick with every field, so the probe does not invent a second model. */
function stick(x: number, y: number, both = false): Stick {
  return {
    x,
    y,
    gentle: false,
    both,
    mdx: 0,
    mdy: 0,
    disturbX: 0,
    disturbY: 0,
    noiseScale: 1,
    instabilityScale: 1,
  };
}

/** The world the run is on now. A reseed replaces it. */
function live(run: AppRun): World {
  return run.session.world as World;
}

/** Plays one activity. The scene calls step. This calls the activity's bot and score. */
function play(run: AppRun, menu: (name: string, args?: unknown) => void, activity: Activity, band: Band): number {
  const w = live(run);
  const bootCount = w.count;
  menu('game.start', { event: activity.id });
  const cap = activity.seconds * 60 + 120;
  let score = Number.NaN;
  for (let i = 0; i < cap; i++) {
    const intents = activity.bot(w, band);
    run.stepOnce(intents);
    if (flowOf(w).mode === 'results') {
      score = activity.score(w);
      break;
    }
  }
  activity.teardown(w);
  expect(w.count, `${activity.id} teardown`).toBe(bootCount);
  return score;
}

describe('balance', () => {
  it('keeps a still thumb inside the 0.22 ring only part of the time', () => {
    const shares: number[] = [];
    for (let seed = 1; seed <= 10; seed++) {
      const { w } = open(seed);
      const row = rowOf(w, 0);
      resetBalance(row.wobble, row.hist);
      const cfg = cfgOf(w);
      let inside = 0;
      const steps = 20 * 60;
      for (let i = 0; i < steps; i++) {
        stepBalance(row.wobble, stick(0, 0), cfg, i / 60, w.dt);
        if (inRing(row.wobble, 0.22)) inside += 1;
      }
      shares.push(inside / steps);
    }
    const mean = shares.reduce((sum, n) => sum + n, 0) / shares.length;
    expect(mean).toBeGreaterThan(0.15);
    expect(mean).toBeLessThan(0.55);
  });

  it('topples a held full stick and quiets sway when the breath is calm', () => {
    const { w } = open(1);
    const row = rowOf(w, 0);
    resetBalance(row.wobble, row.hist);
    const cfg = cfgOf(w);
    for (let i = 0; i < 180; i++) stepBalance(row.wobble, stick(1, 0), cfg, i / 60, w.dt);
    expect(row.wobble.topples).toBeGreaterThan(0);
    resetBalance(row.wobble, row.hist);
    let wild = 0;
    for (let i = 0; i < 600; i++) {
      stepBalance(row.wobble, stick(0, 0), cfg, i / 60, w.dt);
      wild += Math.abs(row.wobble.x);
    }
    resetBalance(row.wobble, row.hist);
    let quiet = 0;
    for (let i = 0; i < 600; i++) {
      row.wobble.calm = 1;
      stepBalance(row.wobble, stick(0, 0, true), cfg, i / 60, w.dt);
      quiet += Math.abs(row.wobble.x);
    }
    expect(quiet).toBeLessThan(wild);
  });
});

describe('activities', () => {
  it('calls setup, step, score and bot on each activity', () => {
    const { w } = open(1);
    for (const activity of ACTIVITIES) {
      activity.setup(w);
      const intents = activity.bot(w, 'idle');
      activity.step(w, intents);
      expect(Number.isFinite(activity.score(w))).toBe(true);
      activity.teardown(w);
    }
    expect(w.count).toBe(2);
  });

  it.each(ACTIVITIES.map((item) => [item.id]))(
    'bands %s',
    (id) => {
      const activity = ACTIVITIES.find((item) => item.id === id);
      if (!activity) throw new Error(`missing ${id}`);
      const { run, menu, reseed } = open(1);
      const failures: string[] = [];
      for (let seed = 1; seed <= 10; seed++) {
        const scores: Record<string, number> = {};
        for (const band of BANDS) {
          reseed(seed);
          const score = play(run, menu, activity, band);
          scores[band] = score;
          if (!Number.isFinite(score)) failures.push(`${id} ${band} ${seed} did not finish`);
          else if (score < 0 || score > 1000) failures.push(`${id} ${band} ${seed} ${score}`);
          else if (band === 'perfect' && score < 750) failures.push(`${id} perfect ${seed} ${score.toFixed(1)}`);
          else if (band === 'human' && score < 550) failures.push(`${id} human ${seed} ${score.toFixed(1)}`);
          else if (band === 'sloppy' && score < 300) failures.push(`${id} sloppy ${seed} ${score.toFixed(1)}`);
          else if (band === 'idle' && score > 500) failures.push(`${id} idle ${seed} ${score.toFixed(1)}`);
        }
        const idle = scores.idle ?? 0;
        const human = scores.human ?? 0;
        if (Number.isFinite(idle) && Number.isFinite(human) && idle >= human) {
          failures.push(`${id} idle ${idle.toFixed(1)} vs human ${human.toFixed(1)} seed ${seed}`);
        }
      }
      expect(failures).toEqual([]);
    },
    600_000,
  );

  it('survives a mash, and an idle pond scores exactly 500', () => {
    const mashed = open(3);
    mashed.menu('game.start', { event: 'pond' });
    let threw = false;
    try {
      for (let i = 0; i < pond.seconds * 60 + 5; i++) {
        if (flowOf(mashed.w).mode === 'results') break;
        const mash: Intents = {
          'game:r': Math.sin(i * 0.7),
          'game:f': Math.cos(i * 0.4),
          'game:fl': i % 5 === 0 ? 1 : 0,
          'game:act': i % 11 === 0 ? 1 : 0,
        };
        disturbed(mashed.w, mash);
        mashed.run.stepOnce(mash);
      }
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(flowOf(mashed.w).mode).toBe('results');
    expect(Number.isFinite(flowOf(mashed.w).result)).toBe(true);
    const idle = open(4);
    idle.menu('game.start', { event: 'pond' });
    for (let i = 0; i < pond.seconds * 60 + 5; i++) {
      if (flowOf(idle.w).mode === 'results') break;
      idle.run.stepOnce(pond.bot(idle.w, 'idle'));
    }
    expect(pond.score(idle.w)).toBe(500);
    expect(actOf(idle.w).pose).toBe(0);
  });

  it('bounds Wobble Age', () => {
    expect(wobbleAge(1, 1.3)).toBe(18);
    expect(wobbleAge(0, 1.3)).toBe(82);
    const { run, w, menu } = open(2);
    const morning = ACTIVITIES[0];
    if (!morning) throw new Error('no morning');
    menu('game.start', { event: 'morning' });
    for (let i = 0; i < morning.seconds * 60 + 5; i++) {
      if (flowOf(w).mode === 'results') break;
      run.stepOnce(morning.bot(w, 'human'));
    }
    expect(flowOf(w).age).toBeGreaterThanOrEqual(18);
    expect(flowOf(w).age).toBeLessThanOrEqual(82);
    expect(flowOf(w).prior).toBe(0);
  });

  it('shows today against yesterday and keeps that prior', () => {
    expect(ageLine(82, 0)).toBe('age.first');
    expect(ageLine(40, 82)).toBe('age.down');
    expect(ageLine(82, 40)).toBe('age.up');
    expect(ageLine(40, 40)).toBe('age.same');
    const first = resultCopy(
      { ...emptySnap(), event: 'morning', age: 82, prior: 0, rank: 'Present', result: 0 },
      'Here.',
    );
    expect(first).toContain('82');
    expect(first).toContain('Present');
    const next = noteProgress(freshSave(), {
      ...emptySnap(),
      mode: 'results',
      event: 'morning',
      result: 400,
      age: 40,
      prior: 82,
      finds: ['pebble:1'],
    });
    expect(next.prior).toBe(82);
    expect(next.age).toBe(40);
    expect(next.finds).toEqual(['pebble:1']);
    expect(next.bests.morning).toBe(400);
    const kept = noteProgress(next, {
      ...emptySnap(),
      mode: 'results',
      event: 'morning',
      result: 100,
      age: 82,
      prior: 40,
      finds: ['pebble:1', 'pebble:2'],
    });
    expect(kept.bests.morning).toBe(400);
    expect(kept.finds).toEqual(['pebble:1', 'pebble:2']);
    expect(kept.prior).toBe(40);

    const { w, menu } = open(2);
    menu('game.start', { event: 'morning' });
    menu('game.finish');
    expect(flowOf(w).prior).toBe(0);
    expect(flowOf(w).age).toBe(82);
    expect(flowOf(w).line).toBe('age.first');
    const snap = readSnap({ world: w } as unknown as EngineFrame);
    expect(resultCopy(snap, 'Here.')).toContain('82');
    expect(noteProgress(freshSave(), snap).prior).toBe(0);
    menu('game.start', { event: 'morning' });
    menu('game.finish');
    expect(flowOf(w).prior).toBe(82);
    expect(flowOf(w).age).toBe(82);
    expect(flowOf(w).line).toBe('age.same');
    const again = readSnap({ world: w } as unknown as EngineFrame);
    const said = resultCopy(again, 'Here.');
    expect(said).toContain('82');
    expect(said).toContain('Yesterday');
    expect(noteProgress(freshSave(), again).prior).toBe(82);
    menu('game.begin', { day: 1, cursor: 0, age: 40, prior: 82 });
    expect(flowOf(w).age).toBe(40);
    expect(flowOf(w).prior).toBe(82);
  });
});

describe('director', () => {
  it('walks three seeds to the credits', () => {
    for (const seed of [1, 2, 3]) {
      const { run, w } = open(seed, { 'game.auto': 'director' });
      let guard = 0;
      for (const item of programme()) {
        const activity = ACTIVITIES.find((entry) => entry.id === item.event);
        guard += activity ? (activity.seconds + 2) * 60 : 60 * 60;
      }
      for (let i = 0; i < guard; i++) {
        run.stepOnce({});
        if (flowOf(w).mode === 'credits') break;
      }
      const flow = flowOf(w);
      expect(flow.credits, `seed ${seed}`).toBe(1);
      console.log(`seed ${seed} credits`);
      const got = flow.seen.split(',');
      for (const id of SEEN) expect(got, `seed ${seed} saw ${id}`).toContain(id);
      expect(flow.pebbles).toBeGreaterThan(0);
    }
  }, 600_000);
});
