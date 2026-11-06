/** @file Surgery rule tests: actual inputs and visible state changes, ratings, physiology and failure. */
import { describe, it, expect } from 'vitest';
import { createOperation, defaultRules, spawn, rank } from './state';
import { stepOperation } from './step';
import { useTool } from './tools';
import { activate, pressGift, shock } from './gift';
import { TOOLS, KINDS, RESPONSE } from '../../data/tools';
import type { Hand, TargetKind } from '../../data/types';
const hand = (x = 0, z = 0, tool = 3, use = 0, site = 0): Hand => [x, z, tool, use, 0, 0, site, 0, 0];
describe('instruments and physiology', () => {
  for (const tool of TOOLS)
    it(`${tool} has a response for every target`, () => {
      for (const kind of KINDS) expect(RESPONSE[tool][kind].length).toBeGreaterThan(0);
    });
  it('drains a real pool and awards points once', () => {
    const r = defaultRules(),
      s = createOperation('first-cut'),
      p = s.seats[0],
      t = s.targets[0];
    p.x = t.x;
    p.z = t.z;
    p.tool = 3;
    for (let i = 0; i < 100; i++) useTool(s, r, p, true);
    expect(t.done).toBe(true);
    expect(s.score).toBeGreaterThan(0);
    const score = s.score;
    for (let i = 0; i < 10; i++) useTool(s, r, p, true);
    expect(s.score).toBe(score);
  });
  it('does not penalize a wrong tool', () => {
    const r = defaultRules(),
      s = createOperation('first-cut'),
      p = s.seats[0];
    p.tool = 4;
    p.x = s.targets[0].x;
    p.z = s.targets[0].z;
    useTool(s, r, p, true);
    expect(s.slips).toBe(0);
    expect(s.events.some((e) => e.type === 'refusal')).toBe(true);
  });
  it('stabilizer rewards its green band and has a cooldown', () => {
    const r = defaultRules(),
      s = createOperation('first-cut'),
      p = s.seats[0];
    s.patients[0] = 40;
    p.x = 7;
    p.z = 3;
    p.tool = 5;
    for (let i = 0; i < 51; i++) useTool(s, r, p, true);
    useTool(s, r, p, false);
    expect(s.patients[0]).toBe(64);
    expect(p.cooldown).toBe(120);
    expect(s.rating).toBe('TEXTBOOK');
  });
  it('underfilled and overfilled doses have distinct results', () => {
    for (const [ticks, vitals] of [
      [15, 46],
      [66, 46],
    ]) {
      const r = defaultRules(),
        s = createOperation('first-cut'),
        p = s.seats[0];
      s.patients[0] = 40;
      p.x = 7;
      p.tool = 5;
      for (let i = 0; i < ticks; i++) useTool(s, r, p, true);
      useTool(s, r, p, false);
      expect(s.patients[0]).toBeCloseTo(vitals, 3);
    }
  });
  it('offscreen sites continue bleeding', () => {
    const r = defaultRules(),
      s = createOperation('crosstalk'),
      start = s.patients[0];
    for (let i = 0; i < 60; i++) stepOperation(s, [hand(7, 3, 3, 0, 2)], r);
    expect(s.patients[0]).toBeCloseTo(start - 3, 2);
  });
  it('a clock expiry fails an operation', () => {
    const s = createOperation('first-cut');
    s.left = 100;
    stepOperation(s, [], defaultRules());
    expect(s.status).toBe('lost');
    expect(s.reason).toContain('time');
  });
  it('too many unsafe cuts leave real wounds and fail', () => {
    const s = createOperation('first-cut'),
      r = defaultRules();
    r.freezeVitals = true;
    const points = [
      [-6, 3],
      [-3, 3],
      [0, 3],
      [3, 3],
      [6, 3],
      [-6, -3],
      [-3, -3],
      [0, -3],
      [3, -3],
      [6, -3],
    ];
    for (let i = 0; i < 650 && s.status === 'playing'; i++) {
      const p = points[Math.floor(i / 65) % points.length];
      stepOperation(s, [hand(p[0], p[1], 0, 1)], r);
    }
    expect(s.targets.some((t) => t.kind === 'wound')).toBe(true);
    expect(s.slips).toBeGreaterThan(5);
    expect(s.status).toBe('lost');
  });
  it('opens a Code and revives in the green band', () => {
    const r = defaultRules(),
      s = createOperation('crosstalk');
    s.patients[0] = 0;
    stepOperation(s, [], r);
    expect(s.code).not.toBeNull();
    s.tick = 110;
    shock(s);
    expect(s.code).toBeNull();
    expect(s.patients[0]).toBe(25);
  });
  it('two missed shocks fail', () => {
    const s = createOperation('crosstalk');
    s.code = { patient: 0, until: 48000, tries: 0, scripted: false };
    s.tick = 1;
    shock(s);
    shock(s);
    expect(s.status).toBe('lost');
  });
  it('Stillpoint slows only field time', () => {
    const s = createOperation('crosstalk'),
      r = defaultRules();
    activate(s, r, s.seats[0], 6);
    stepOperation(s, [], r);
    expect(s.fieldTicks).toBe(25);
    expect(s.tick).toBe(1);
    expect(s.left).toBe(1800000 - 25);
  });
  it('Second Pulse protects shared vitals', () => {
    const s = createOperation('struck-off'),
      r = defaultRules();
    spawn(s, {
      kind: 'wound',
      at: [4, 0],
      path: [
        [3, 0],
        [5, 0],
      ],
      deep: true,
    });
    s.patients[0] = 50;
    activate(s, r, s.seats[0], 6);
    for (let i = 0; i < 60; i++) stepOperation(s, [], r);
    expect(s.patients[0]).toBe(50);
    expect(s.fieldTicks).toBe(6000);
  });
  it('Simple Gift reliably grants six seconds', () => {
    const r = defaultRules();
    r.simpleGift = true;
    const s = createOperation('crosstalk', 1, 1, 2);
    pressGift(s, r, s.seats[0]);
    expect(s.seats[0].giftUntil).toBe(360);
    expect(s.seats[0].gift).toBe(0);
  });
  it('Consult lengthens both Gifts', () => {
    const r = defaultRules(),
      s = createOperation('reverie');
    activate(s, r, s.seats[0], 6);
    s.tick = 1;
    activate(s, r, s.seats[1], 6);
    expect(s.seats[0].giftUntil).toBe(540);
    expect(s.seats[1].giftUntil).toBe(541);
    expect(s.events.some((e) => e.text === 'CONSULT!')).toBe(true);
  });
  it('a checkpoint retry caps rank at B', () => {
    const s = createOperation('first-cut');
    s.score = 99999;
    s.retry = true;
    expect(rank(s)).toBe('B');
  });
  for (const kind of ['lull', 'solace', 'reverie', 'matron', 'mercy', 'node'] as TargetKind[])
    it(`${kind} is a live, addressable body target`, () => {
      const s = createOperation('first-cut');
      const t = spawn(s, { kind, at: [1, 1] });
      expect(s.targets.find((x) => x.id === t.id)).toBe(t);
      expect(t.done).toBe(false);
    });
});

it('judges a delayed network rhythm press on its sampled ECG beat', () => {
  const r = defaultRules(),
    s = createOperation('crosstalk', 1, 1, 2),
    p = s.seats[0];
  s.tick = 18;
  pressGift(s, r, p, 0);
  const period = 3600 / Math.round(64 + (100 - s.patients[0]) * 0.65);
  for (let i = 1; i <= 3; i++) {
    const sampled = Math.round(period * i);
    s.tick = sampled + 18;
    pressGift(s, r, p, sampled);
  }
  expect(p.beats).toBe(3);
  expect(p.giftUntil - s.tick).toBe(630);
});
it('requires distinct ECG peaks for the three-press Gift', () => {
  const r = defaultRules(),
    s = createOperation('crosstalk', 1, 1, 2);
  pressGift(s, r, s.seats[0]);
  pressGift(s, r, s.seats[0]);
  pressGift(s, r, s.seats[0]);
  expect(s.seats[0].beats).toBe(0);
});
