/**
 * @file The whole game (PLAN.md section 16): a scripted playthrough with `game.auto`, every day, every activity, the
 * finale's steps, ending at credits, on 3 seeds. It is the softlock finder. Plus the model's maths, reproducibility and
 * capture and restore.
 */
import { describe, expect, it } from 'vitest';
import { createHeadless, type Headless } from '../../../engine';
import '../cast/clips';
import type { Flow, Wobble } from './components';
import { DAYS } from './data/days';
import { ageRemark } from '../ui/screens/results';
import { island } from './island';
import { round } from './round';
import { wobbleAge } from './scoring';

/** The engine, with what the tests call on it. */
type Engine = Headless & {
  actions: { run(name: string, args?: unknown): void };
  set(path: string, value: unknown): void;
  step(n?: number): number;
  state(q: string): { entities: Record<string, never>[] };
  hash(): string;
};

/** A fresh engine on the island. */
async function fresh(seed: number): Promise<Engine> {
  return (await createHeadless({ scene: island, seed })) as unknown as Engine;
}
const flowOf = (engine: Engine): Flow => engine.state('flow').entities[0].flow as unknown as Flow;

describe('the whole game', () => {
  for (const seed of [1, 2, 3]) {
    it(`plays from Day 1 to the credits on seed ${seed}`, async () => {
      const engine = await fresh(seed);
      engine.actions.run('game.begin', {});
      engine.set('game.auto', true);
      engine.set('game.skill', 'human');
      const seen = new Set<string>();
      const days = new Set<number>();
      let n = 0;
      let credits = false;
      while (n < 60 * 60 * 60) {
        engine.step(60);
        n += 60;
        const flow = flowOf(engine);
        if (flow.mode === 'event') seen.add(flow.event);
        days.add(flow.day);
        if (flow.credits) credits = true;
        if (credits && !flow.credits) break;
      }
      expect(credits, `no credits after ${n} steps`).toBe(true);
      for (const day of DAYS)
        for (const id of day.items) if (id !== 'noticeboard') expect(seen, `never played ${id}`).toContain(id);
      expect([...days].sort()).toEqual([1, 2, 3, 4, 5, 6]);
      expect(flowOf(engine).ages.length).toBeGreaterThanOrEqual(6);
    }, 600_000);
  }

  it('keeps every activity clean: nothing stray after teardown', async () => {
    const engine = await fresh(1);
    engine.actions.run('game.begin', {});
    const count = () => (engine.state as unknown as () => { entities: unknown[] })().entities.length;
    const before = count();
    for (const id of [
      'morning',
      'poseA',
      'pond',
      'reps',
      'step',
      'line',
      'paddle',
      'garden',
      'plunge',
      'hoop',
      'jog',
      'group',
      'tilt',
    ]) {
      engine.actions.run('game.start', { event: id });
      engine.step(120);
      engine.actions.run('game.leave', {});
      engine.step(2);
      expect(count(), `${id} left something behind`).toBe(before);
    }
  }, 120_000);

  it('continues exactly after a capture and a restore, mid-activity', async () => {
    const engine = await fresh(4);
    engine.actions.run('game.begin', {});
    engine.set('game.skill', 'human');
    engine.actions.run('game.start', { event: 'line' });
    engine.set('game.auto', true);
    engine.step(240);
    const capture = (engine as unknown as { capture(): unknown }).capture();
    engine.step(240);
    const straight = engine.hash();
    (engine as unknown as { restore(c: unknown): void }).restore(capture);
    engine.step(240);
    expect(engine.hash()).toBe(straight);
  }, 120_000);

  it('gives the same hash for the same seed and input, twice', async () => {
    const hash = async () => {
      const engine = await fresh(9);
      engine.actions.run('game.begin', {});
      engine.set('game.auto', true);
      engine.step(1200);
      return engine.hash();
    };
    expect(await hash()).toBe(await hash());
  }, 120_000);
});

describe('the Wobble Model', () => {
  /** Runs an activity from its start until `steps` have passed, with a fixed lean. */
  it('lurches the island 3 degrees when you topple on the Centre Stone', async () => {
    const engine = await fresh(3);
    engine.actions.run('game.begin', {});
    engine.actions.run('game.start', { event: 'tilt' });
    engine.step(2);
    engine.actions.run('game.tiltStep', { phase: 'stone' });
    let lurch = 0;
    for (let k = 0; k < 600; k++) {
      engine.step(1, { 'game:r': 1 } as never);
      const wob = engine.state('wobble').entities[0].wobble as unknown as Wobble;
      const isl = engine.state('island').entities[0].island as unknown as { tiltX: number };
      lurch = Math.max(lurch, isl.tiltX - wob.x * 9);
    }
    expect(lurch).toBeGreaterThan(2.5);
    expect(lurch).toBeLessThanOrEqual(3);
  }, 120_000);

  async function ringTest(lean: [number, number], steps: number) {
    const engine = await fresh(3);
    engine.actions.run('game.begin', {});
    engine.actions.run('game.start', { event: 'ring' });
    let inside = 0;
    let topples = 0;
    for (let k = 0; k < steps; k++) {
      engine.step(1, {
        'game:r': lean[0] > 0 ? lean[0] : 0,
        'game:l': lean[0] < 0 ? -lean[0] : 0,
        'game:f': lean[1] > 0 ? lean[1] : 0,
        'game:b': lean[1] < 0 ? -lean[1] : 0,
      } as never);
      const wob = engine.state('wobble').entities[0].wobble as unknown as Wobble;
      if (Math.hypot(wob.x, wob.y) <= 0.22) inside += 1;
      topples = wob.topples;
    }
    return { share: inside / steps, topples };
  }

  it('no input stays in a 0.22 ring only part of the time', async () => {
    const { share } = await ringTest([0, 0], 1200);
    expect(share).toBeGreaterThan(0.1);
    expect(share).toBeLessThan(0.85);
  }, 60_000);

  it('a held full stick topples, on purpose', async () => {
    const { topples } = await ringTest([1, 0], 1200);
    expect(topples).toBeGreaterThan(0);
  }, 60_000);

  it('calm lowers the sway', async () => {
    const run = async (breathing: boolean) => {
      const engine = await fresh(5);
      engine.actions.run('game.begin', {});
      engine.actions.run('game.start', { event: 'pond' });
      engine.set('game.breath.calmEffect', 1);
      let travel = 0;
      let last = [0, 0];
      for (let k = 0; k < 3600; k++) {
        const down = breathing && k % 480 < 240 ? 1 : 0;
        engine.step(1, { 'game:fl': down, 'game:fr': down } as never);
        const wob = engine.state('wobble').entities[0].wobble as unknown as Wobble;
        travel += Math.hypot(wob.x - last[0], wob.y - last[1]);
        last = [wob.x, wob.y];
      }
      return travel;
    };
    expect(await run(true)).toBeLessThan(await run(false));
  }, 60_000);

  it('Wobble Age: bounds and the curve', () => {
    expect(wobbleAge(1, 1.3)).toBe(18);
    expect(wobbleAge(0, 1.3)).toBe(82);
    expect(wobbleAge(0.5, 1.3)).toBeGreaterThan(18);
    expect(wobbleAge(0.5, 1.3)).toBeLessThan(82);
  });
});

describe('Still Pond', () => {
  const runPond = async (press: (k: number) => Record<string, number | undefined>) => {
    const engine = await fresh(6);
    engine.actions.run('game.begin', {});
    engine.actions.run('game.start', { event: 'pond' });
    let k = 0;
    while (flowOf(engine).mode === 'event' && k < 6000) {
      engine.step(1, press(k) as never);
      k += 1;
    }
    return flowOf(engine).last.score ?? -1;
  };
  it('a no-input run earns exactly the capped result', async () => {
    expect(await runPond(() => ({}))).toBe(500);
  }, 60_000);
  it('real breath lifts the score', async () => {
    const score = await runPond((k) => (k % 480 < 240 ? { 'game:fl': 1, 'game:fr': 1 } : {}));
    expect(score).toBeGreaterThan(900);
  }, 60_000);
  it('pressing a fake prompt costs Composure', async () => {
    const score = await runPond((k) => (k % 600 < 3 ? { 'game:r': 1 } : {}));
    expect(score).toBeLessThan(500);
  }, 60_000);
});

describe('Step Class', () => {
  /** A class, played by `skill`, read at its end. */
  const stepClass = async (skill: string) => {
    const engine = await fresh(8);
    engine.actions.run('game.begin', {});
    engine.set('game.skill', skill);
    engine.actions.run('game.start', { event: 'step' });
    engine.set('game.botSeat', true);
    let last: { combo: number; misses: number; perfects: number; goods: number } | null = null;
    while (flowOf(engine).mode === 'event') {
      engine.step(30);
      const a = engine.state('activity').entities[0].activity as unknown as { data: { seats?: (typeof last)[] } };
      last = a.data.seats?.[0] ?? last;
    }
    return { ...last!, score: flowOf(engine).last.score ?? -1 };
  };
  it('hits land in the windows at every tempo: a perfect player gets every note perfect', async () => {
    const run = await stepClass('perfect');
    expect(run.misses).toBe(0);
    expect(run.goods).toBe(0);
    expect(run.perfects).toBeGreaterThan(100);
    expect(run.score).toBe(1000);
  }, 120_000);
  it('misses break the combo', async () => {
    const run = await stepClass('sloppy');
    expect(run.misses).toBeGreaterThan(0);
    expect(run.goods).toBeGreaterThan(0);
    const idle = await stepClass('idle');
    expect(idle.combo).toBe(0);
    expect(idle.perfects + idle.goods).toBe(0);
    expect(idle.score).toBe(0);
  }, 120_000);
});

describe('the Morning Check', () => {
  it('compares with yesterday, in a tone of mild scientific surprise', () => {
    expect(ageRemark(61, 64)).toContain('61');
    expect(ageRemark(61, 64)).toContain('64');
    expect(ageRemark(70, 64)).toContain('70');
    expect(ageRemark(64, 64)).toContain('64');
    expect(ageRemark(50, undefined).length).toBeGreaterThan(10);
    expect(ageRemark(61, 64)).not.toContain('{');
  });
});

describe('a session round', () => {
  it('runs by itself with ghosts on the neighbouring mats, and ends', async () => {
    const engine = (await createHeadless({ scene: round, seed: 11 })) as unknown as Engine;
    engine.actions.run('round.join', { me: 1, players: [0, 1, 2] });
    engine.step(10);
    expect(engine.state('ghost').entities.length).toBe(2);
    engine.actions.run('round.go', { me: 1 });
    engine.set('game.auto', true);
    let k = 0;
    while (flowOf(engine).mode !== 'results' && k < 60 * 240) {
      engine.step(60, { 'game:ghosts': [{ id: 0, e: 0, x: 0.1, y: 0.2, p: '', s: 10, gone: false }] } as never);
      k += 60;
    }
    expect(flowOf(engine).mode).toBe('results');
    engine.actions.run('round.leave', { id: 2 });
    engine.step(5);
  }, 120_000);
});
