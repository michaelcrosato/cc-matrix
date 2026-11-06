/** @file Objective balance, activity, persistence and complete-residency regression tests. */
import { describe, it, expect } from 'vitest';
import { createHeadless } from '../../../engine';
import { ACTIVITIES, ageFor, DAYS } from './data/days';
import { createRun, botFor, stepEvent, guideFor } from './events/registry';
import { DEFAULT_WOBBLE, makeWobble, stepWobble, emptyLean } from './wobble';
import { TUNING } from './settings';
import { defineScene, placeActor } from '../../../engine/sim-api';
import { heightAt } from './terrain';
import { flowOf, type GameComponents } from './state';
import { island } from './island';
import type { Flow } from './state';
import type { GameInspector } from '../ui/context';
const config = (day = 1) => ({
  wobble: { ...DEFAULT_WOBBLE },
  get: (key: string) => TUNING.find(([k]) => k === key)?.[1] ?? 1,
  auto: true,
  day,
  expert: false,
});
const flow = (h: GameInspector) => (h.state('retreat').entities[0].retreat as { data: Flow }).data;
describe('Little Fulcrum model', () => {
  it('makes a delayed thumb useful, a full held lean topple, and calm quieten the sway', () => {
    const counts: Record<string, number> = {};
    for (const kind of ['perfect', 'human', 'sloppy', 'idle']) {
      let inside = 0,
        total = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const r = createRun('check', seed, true),
          w = makeWobble([seed * 0.4, seed * 0.7, 1, 2, 3, 4]),
          c = config();
        for (let i = 0; i < 1200; i++) {
          stepEvent(r, w, botFor(r, w, c, kind), c);
          if (Math.hypot(w.x, w.y) < 0.22) inside++;
          total++;
        }
      }
      counts[kind] = inside / total;
    }
    expect(counts.perfect).toBeGreaterThan(0.95);
    expect(counts.human).toBeGreaterThan(counts.idle + 0.15);
    expect(counts.sloppy).toBeGreaterThan(counts.idle);
    const w = makeWobble([0, 1, 2, 3, 4, 5]);
    for (let i = 0; i < 900; i++) stepWobble(w, { ...emptyLean(), x: 1 }, i, DEFAULT_WOBBLE);
    expect(w.topples).toBeGreaterThan(0);
    expect(ageFor(1000)).toBe(18);
    expect(ageFor(0)).toBe(82);
  });
  for (const a of ACTIVITIES)
    it(`${a.id}: four pilots on ten seeds and random input finish with finite scores`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const scores: Record<string, number> = {};
        for (const kind of ['perfect', 'human', 'sloppy', 'idle', 'random']) {
          const r = createRun(a.id, seed),
            w = makeWobble([seed * 0.4, seed * 0.7, 1, 2, 3, 4]),
            c = config();
          while (r.tick < r.length) {
            const input =
              kind === 'random'
                ? {
                    x: Math.sin(r.tick * 0.19),
                    y: Math.cos(r.tick * 0.13),
                    l: r.tick % 19 < 9 ? 1 : 0,
                    r: r.tick % 23 < 10 ? 1 : 0,
                    act: r.tick % 101 === 0,
                  }
                : botFor(r, w, c, kind);
            stepEvent(r, w, input, c);
          }
          const score = a.id === 'group' ? r.score / 3 : r.score;
          scores[kind] = score;
          expect(Number.isFinite(score), `${a.id}/${seed}/${kind}`).toBe(true);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1000);
        }
        expect(scores.perfect, `${a.id}/${seed} perfect`).toBeGreaterThanOrEqual(750);
        expect(scores.human, `${a.id}/${seed} human`).toBeGreaterThanOrEqual(550);
        expect(scores.sloppy, `${a.id}/${seed} sloppy`).toBeGreaterThanOrEqual(300);
        expect(scores.idle, `${a.id}/${seed} idle`).toBeLessThanOrEqual(500);
        expect(scores.idle).toBeLessThan(scores.human);
      }
    });
  it('pond punishes a fake prompt, real breath improves it, and guides never mutate state', () => {
    const r = createRun('pond', 7),
      w = makeWobble([0, 1, 2, 3, 4, 5]),
      c = config();
    for (let i = 0; i < 120; i++) stepEvent(r, w, emptyLean(), c);
    expect(r.score).toBe(500);
    stepEvent(r, w, { ...emptyLean(), act: true }, c);
    expect(r.composure).toBe(920);
    const before = JSON.stringify(r);
    guideFor(r, c);
    expect(JSON.stringify(r)).toBe(before);
  });
  it('all eight poses have safe guide seats and complete without input', () => {
    for (const day of [1, 2, 5]) {
      const r = createRun('pose', 3),
        w = makeWobble([0, 1, 2, 3, 4, 5]),
        c = config(day);
      while (r.tick < r.length) {
        const g = guideFor(r, c);
        expect(Math.hypot(g.x, g.y)).toBeLessThanOrEqual(0.51);
        stepEvent(r, w, emptyLean(), c);
      }
      expect(r.tick).toBeGreaterThanOrEqual(r.length);
    }
  });
});
describe('the actual engine scene', () => {
  it('capture and restore continues exactly with its physics and clip state', async () => {
    const h = (await createHeadless({ scene: island, seed: 7 })) as GameInspector;
    h.actions.run('game.start', { event: 'pose' });
    h.step(120, { 'game:r': 0.2, 'game:fl': 1, 'game:fr': 1 });
    const capture = h.capture();
    h.step(90, { 'game:l': 0.1 });
    const expected = h.hash();
    h.restore(capture);
    h.step(90, { 'game:l': 0.1 });
    expect(h.hash()).toBe(expected);
    expect(h.errors).toHaveLength(0);
  });
  it('the complete five-day residency reaches credits on three seeds', async () => {
    for (const seed of [2, 7, 19]) {
      const h = (await createHeadless({
        scene: island,
        seed,
        settings: { 'game.auto': true, 'game.pace': 8 },
      })) as GameInspector;
      h.actions.run('game.begin');
      let tick = 0;
      const seen = new Set<string>();
      while (flow(h).mode !== 'credits' && tick < 35000) {
        h.step(60);
        tick += 60;
        const f = flow(h);
        if (f.mode === 'event') seen.add(`${f.day}:${f.event.id}`);
      }
      expect(flow(h).mode, `seed ${seed}: ${flow(h).day}/${flow(h).event.id}`).toBe('credits');
      for (let d = 0; d < 5; d++)
        for (const id of DAYS[d].events) expect(seen.has(`${d + 1}:${id}`), `${d + 1}:${id}`).toBe(true);
      expect(flow(h).ages).toHaveLength(6);
      expect(h.errors).toHaveLength(0);
    }
  }, 120000);
});

it('pose entry is earned by following the guide, and a dive rotates only when leaned', async () => {
  const c = config();
  const attentive = createRun('pose', 9),
    idle = createRun('pose', 9),
    a = makeWobble([0, 1, 2, 3, 4, 5]),
    b = makeWobble([0, 1, 2, 3, 4, 5]);
  for (let i = 0; i < 839; i++) {
    stepEvent(attentive, a, botFor(attentive, a, c, 'perfect'), c);
    stepEvent(idle, b, emptyLean(), c);
  }
  expect(attentive.progress).toBeGreaterThan(0.95);
  expect(idle.progress).toBeLessThan(attentive.progress);
  const h = (await createHeadless({ scene: island, seed: 17 })) as GameInspector;
  h.actions.run('game.start', { event: 'dive' });
  h.step(722);
  const hero = flow(h).hero;
  const slots = () => (h.get(hero)?.clips as { state: { slots: { clip: string; t: number }[] } }).state.slots;
  expect(slots().find((s) => s.clip === 'RETREAT/Somersault')?.t).toBe(0);
  h.step(90, { 'game:f': 0.6 });
  expect(slots().find((s) => s.clip === 'RETREAT/Somersault')?.t).toBeGreaterThan(0.1);
});
it('the attract centre-stone segment lasts, and a session uses actual ghost actors', async () => {
  const h = (await createHeadless({ scene: island, seed: 5 })) as GameInspector;
  h.actions.run('game.demo');
  h.actions.run('game.finale', { tick: 140 * 60 });
  h.step(120);
  expect(flow(h).event.id).toBe('tilt');
  h.step(800);
  expect(flow(h).event.id).toBe('jog');
  const r = (await import('./island')).round;
  const session = (await createHeadless({ scene: r, seed: 4, settings: { 'game.sessionCount': 2 } })) as GameInspector;
  session.actions.run('round.ghosts', { items: [{ seat: 1, x: 0.3, y: -0.2, phase: 0, active: true, score: 450 }] });
  session.step(2);
  session.actions.run('round.decorate');
  session.step(2);
  expect(flow(session).others).toHaveLength(1);
  expect(session.get(flow(session).others[0])?.actor).toBeDefined();
  expect(session.state('ghost').entities).toHaveLength(1);
  expect(flow(session).remoteScores[1]).toBe(450);
  expect(session.errors).toHaveLength(0);
});

it('free practice checks return to the island, retakes replace today, and later mornings stay available', async () => {
  const h = (await createHeadless({ scene: island, seed: 31 })) as GameInspector;
  h.actions.run('game.unlock');
  const check = () => {
    h.actions.run('game.start', { event: 'check' });
    h.actions.run('game.finish', { score: 800 });
    h.actions.run('game.leave');
  };
  check();
  expect(flow(h).mode).toBe('roam');
  expect(flow(h).ages).toHaveLength(1);
  check();
  expect(flow(h).ages).toHaveLength(1);
  h.actions.run('game.sleep');
  expect(flow(h).day).toBe(7);
  check();
  expect(flow(h).ages).toHaveLength(2);
  expect(flow(h).mode).toBe('roam');
});

it('a saved find stays collected, and resetting the scene restores a fresh set of pebbles', async () => {
  const h = (await createHeadless({ scene: island, seed: 37 })) as GameInspector;
  expect(h.state('find').entities).toHaveLength(20);
  h.actions.run('game.begin', { finds: [0, 1], pebbles: 2 });
  expect(h.state('find').entities).toHaveLength(18);
  h.seed(h.seed());
  h.actions.run('game.begin');
  expect(h.state('find').entities).toHaveLength(20);
  expect(flow(h).pebbles).toBe(0);
});

it('idle exploration remains plain data, and title/sit modes clear the last walking input', async () => {
  const h = (await createHeadless({ scene: island, seed: 43 })) as GameInspector;
  h.actions.run('game.begin');
  h.step(30);
  expect(() => h.hash()).not.toThrow();
  expect(() => h.capture()).not.toThrow();
  h.step(30, { move: [1, 0] });
  h.actions.run('game.front');
  h.step(60);
  const hero = flow(h).hero;
  const actor = h.get(hero)?.actor as { x: number; z: number };
  expect(Math.abs(actor.x + 57.4)).toBeLessThan(0.1);
  expect(Math.abs(actor.z - 20)).toBeLessThan(0.1);
  expect(h.errors).toHaveLength(0);
});

it('the nearest guest can be spoken to and a nearby bench can be used beside a station', async () => {
  const visit = defineScene<GameComponents>('game:visitRetreat', {
    physics: true,
    terrain: island.terrain,
    setup: island.setup,
    step: island.step,
    actions: {
      ...island.actions,
      'test.travel': (w, args) => {
        placeActor(w, flowOf(w).hero, (args as { at: [number, number, number] }).at);
      },
    },
  });
  const h = (await createHeadless({ scene: visit, seed: 47 })) as GameInspector;
  h.actions.run('game.begin');
  h.actions.run('test.travel', { at: [-53.5, 8.2, 20] });
  h.step(2);
  h.step(1, { p: ['use'] });
  expect(flow(h).speaker).toBe('Gerald');
  expect(flow(h).message).toBe('Morning.');
  expect(flow(h).mode).toBe('roam');
  h.actions.run('test.travel', { at: [-64, heightAt(-64, 30) + 0.2, 30] });
  h.step(2);
  h.step(1, { p: ['use'] });
  expect(flow(h).mode).toBe('sit');
  h.step(30);
  expect(() => h.hash()).not.toThrow();
  h.step(1, { p: ['use'] });
  expect(flow(h).mode).toBe('roam');
  h.actions.run('test.travel', { at: [8, 8.2, 35] });
  h.step(2);
  h.step(1, { p: ['use'] });
  expect(h.state('retreat').entities[0].retreat).toBeDefined();
  expect(flow(h).focus).toBe('board');
});

it('terraces and physical mats support the complete body above the visible floor', async () => {
  expect(heightAt(-57.4, 20)).toBe(8);
  expect(heightAt(0, 34)).toBe(8);
  expect(heightAt(30, -48)).toBe(11);
  expect(heightAt(-70, -12)).toBe(4);
  expect(heightAt(0, 0)).toBe(18);
  const h = (await createHeadless({ scene: island, seed: 53 })) as GameInspector;
  h.step(120);
  const actor = h.get(flow(h).hero)?.actor as { y: number };
  expect(actor.y).toBeGreaterThanOrEqual(8);
  expect(actor.y).toBeLessThan(8.4);
  expect(h.errors).toHaveLength(0);
});
