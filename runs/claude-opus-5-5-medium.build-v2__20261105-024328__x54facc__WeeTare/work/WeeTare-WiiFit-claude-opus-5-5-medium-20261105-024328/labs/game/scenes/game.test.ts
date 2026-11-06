/**
 * @file The rules' tests beside the balance table: the Wobble Model's maths, Still Pond's Composure, Step Class's windows, the
 * Morning Check's age, the whole game played by a bot to the credits on three seeds (the softlock finder), a capture and
 * restore that continues exactly, and every line the sim says being written.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHeadless, type Headless } from '../../../engine';
import '../props';
import '../cast/clips';
import { LINES } from '../ui/lines';
import { ageOf, rankOf } from './data/days';
import { pondScore } from './events/pond';
import { buildChart } from './events/step';
import { checkScore } from './events/ring';
import { island } from './island';
import type { Flow, Seat, Wobble } from './types';

type Runner = Headless & { actions: { run(name: string, args?: unknown): void } };
const start = async (seed = 1) => {
  const engine = (await createHeadless({ scene: island, seed })) as Runner;
  engine.actions.run('game.begin', {});
  return engine;
};
const flowOf = (e: Headless) => (e.state('flow').entities[0] as unknown as { flow: Flow }).flow;
const seat0 = (e: Headless) => e.state('seat').entities[0] as unknown as { seat: Seat; wobble: Wobble };

describe('the Wobble Model', () => {
  it('stays in a ring only part of the time with no input, and a held full stick topples', async () => {
    const engine = await start(4);
    engine.actions.run('game.bot', { skill: 'idle' });
    engine.actions.run('game.start', { id: 'ring' });
    engine.step(360);
    let inside = 0;
    for (let k = 0; k < 1200; k++) {
      engine.step(1);
      const { wobble } = seat0(engine);
      if (Math.hypot(wobble.x, wobble.y) <= 0.22) inside += 1;
    }
    expect(inside / 1200).toBeGreaterThan(0.1);
    expect(inside / 1200).toBeLessThan(0.75);
    engine.actions.run('game.bot', { skill: '' });
    let toppled = 0;
    for (let k = 0; k < 400; k++) {
      engine.step(1, { 'game:r': 1 } as never);
      toppled = Math.max(toppled, seat0(engine).wobble.topples);
    }
    expect(toppled).toBeGreaterThan(0);
  });
});

describe('Still Pond', () => {
  it('earns exactly half for no input, and more for breathing', () => {
    expect(pondScore(1000, 0.2)).toBe(500);
    expect(pondScore(1000, 1)).toBe(1000);
  });
  it('charges Composure for a fake prompt press', async () => {
    const engine = await start(2);
    engine.actions.run('game.start', { id: 'pond' });
    engine.step(30);
    engine.step(1, { b: ['act'], p: ['act'] } as never);
    engine.step(5);
    const ev = flowOf(engine).ev!;
    expect(ev.s[0].composure).toBeLessThan(1000);
  });
});

describe('Step Class', () => {
  it('places every note on an eighth at each tempo', () => {
    const { notes } = buildChart([{ bpm: 120, chart: 'L . R .' }], 1);
    expect(notes.map((n) => n.t)).toEqual([120, 150]);
  });
});

describe('Step Class in play', () => {
  it('hits land in the windows at each tempo, and a miss breaks the combo', async () => {
    for (const bpm of [0.8, 1, 1.3]) {
      const engine = (await createHeadless({ scene: island, seed: 3, settings: { 'game.step.bpm': bpm } })) as Runner;
      engine.actions.run('game.begin', {});
      engine.actions.run('game.bot', { skill: 'perfect' });
      engine.actions.run('game.start', { id: 'step' });
      engine.step(1200);
      const s = flowOf(engine).ev!.s[0];
      expect(s.hit, `bpm ${bpm}`).toBeGreaterThan(10);
      expect(s.miss, `bpm ${bpm}`).toBe(0);
      expect(s.combo).toBeGreaterThan(10);
      engine.actions.run('game.bot', { skill: 'idle' });
      engine.step(300);
      expect(flowOf(engine).ev!.s[0].combo).toBe(0);
    }
  }, 120000);
});

describe('Expert', () => {
  it('is harder than the ordinary class', async () => {
    const play = async (expert: boolean) => {
      const engine = await start(8);
      engine.actions.run('game.bot', { skill: 'sloppy' });
      engine.actions.run('game.start', { id: 'poseA', expert });
      for (let k = 0; k < 400 && flowOf(engine).mode === 'event'; k++) engine.step(30);
      return flowOf(engine).last.score;
    };
    expect(await play(true)).toBeLessThan(await play(false));
  }, 120000);
});

describe('the Morning Check', () => {
  it('holds the age to its bounds', () => {
    expect(ageOf(1, 1.3)).toBe(18);
    expect(ageOf(0, 1.3)).toBe(82);
    expect(checkScore(1, 1, 1)).toBeCloseTo(1);
    expect(rankOf(900).name).toBe('Unsettling');
    expect(rankOf(0).name).toBe('Present');
  });
});

describe('the whole game', () => {
  for (const seed of [1, 2, 3]) {
    it(`plays to the credits and into Free Play on seed ${seed}`, async () => {
      const engine = await start(seed);
      engine.actions.run('game.drive', { skill: 'perfect' });
      const seen = new Set<string>();
      let steps = 0;
      const limit = 60 * 60 * 40;
      while (!flowOf(engine).free && steps < limit) {
        engine.step(60);
        steps += 60;
        const flow = flowOf(engine);
        if (flow.ev) seen.add(flow.ev.id);
        expect(Number.isNaN(seat0(engine).wobble.x)).toBe(false);
      }
      const flow = flowOf(engine);
      expect({
        free: flow.free,
        day: flow.day,
        mode: flow.mode,
        ev: flow.ev?.id,
        phase: flow.ev?.phase,
        done: flow.done,
        drive: flow.drive,
        bot: flow.bot,
      }).toMatchObject({ free: true });
      expect(flow.day).toBe(6);
      for (const id of [
        'check',
        'poseA',
        'pond',
        'reps',
        'garden',
        'poseB',
        'paddle',
        'line',
        'step',
        'hoop',
        'plunge',
        'jog',
        'poseC',
        'tilt',
        'ring',
        'pondS',
      ])
        expect(seen.has(id), id).toBe(true);
      expect(flow.ages.length).toBeGreaterThan(4);
      expect(flow.pebbles).toBeGreaterThan(20);
    }, 400000);
  }
});

describe('the outfit', () => {
  it('swaps the guest and keeps stepping', async () => {
    const engine = await start(7);
    engine.step(5);
    engine.actions.run('game.begin', { outfit: 'body:guest1c1', outfitBuild: 'build:guestTall' });
    engine.step(5);
    expect(engine.state('actor').entities.length).toBeGreaterThan(5);
    expect((engine.get(seat0(engine).seat.actor) as unknown as { puppet: { body: string } }).puppet.body).toBe(
      'body:guest1c1',
    );
  });
});

describe('reproducibility', () => {
  it('continues exactly after a capture and a restore', async () => {
    const engine = await start(5);
    engine.actions.run('game.bot', { skill: 'human' });
    engine.actions.run('game.start', { id: 'poseA' });
    engine.step(240);
    const capture = engine.capture();
    engine.step(240);
    const straight = engine.hash();
    engine.restore(capture);
    engine.step(240);
    expect(engine.hash()).toBe(straight);
  });
  it('gives the same hash for the same seed', async () => {
    const run = async () => {
      const engine = await start(6);
      engine.actions.run('game.bot', { skill: 'human' });
      engine.actions.run('game.start', { id: 'step' });
      engine.step(600);
      return engine.hash();
    };
    expect(await run()).toBe(await run());
  });
});

describe('the writing', () => {
  it('has every line the sim says, and at least 200', () => {
    expect(Object.keys(LINES).length).toBeGreaterThanOrEqual(200);
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory()
          ? walk(path)
          : path.endsWith('.ts') && !path.endsWith('.test.ts')
            ? [path]
            : [];
      });
    const missing: string[] = [];
    for (const file of walk('labs/game/scenes')) {
      for (const [, id] of readFileSync(file, 'utf8').matchAll(/say\(w, '([a-zA-Z.0-9]+)'/g))
        if (!LINES[id]) missing.push(`${file}: ${id}`);
    }
    for (const who of ['tare', 'plumb', 'bex', 'nan'])
      for (let d = 1; d <= 5; d++)
        for (let n = 1; n <= 3; n++) if (!LINES[`talk.${who}.d${d}.${n}`]) missing.push(`talk ${who} ${d} ${n}`);
    for (let k = 1; k <= 12; k++) if (!LINES[`check.q.${k}`] || !LINES[`plaque.${k}`]) missing.push(`q/plaque ${k}`);
    expect(missing).toEqual([]);
    for (const text of Object.values(LINES))
      expect(/\b(weight|calorie|BMI|Wii)\b/i.test(text) && !/no longer measure weight/.test(text)).toBe(false);
  });
});
