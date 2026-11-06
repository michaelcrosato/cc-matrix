/**
 * @file The operation sim, driven through `stepOp` the way the page drives it. Tools, refusals, vitals, gifts,
 * strains, difficulty, and the sliders. Nothing here re-implements a rule to make the assertion true.
 */
import { describe, expect, it } from 'vitest';
import { setSlider, resetSliders } from './balance';
import { codeBand } from './body';
import { rankFor, rateCut, rateInject } from './ratings';
import { stepOp } from './step';
import { tableComplete, refusalLine } from './table';
import type { Hand, Op } from './types';
import { addTarget, createBare, createFromCase, idleHand } from './world';

/** Step seat 0. Other seats, if any, stay idle. */
function play(op: Op, over: Partial<Hand> = {}, n = 1): void {
  for (let i = 0; i < n; i++) {
    const hands = op.seats.map((seat, index) => (index === 0 ? { ...idleHand(seat), ...over } : idleHand(seat)));
    stepOp(op, hands);
  }
}

describe('operation sim', () => {
  it('names a tool or a refusal for every pair', () => {
    expect(tableComplete()).toBe(true);
  });

  it('drains a pool and refuses the scalpel without a slip', () => {
    const op = createBare();
    const pool = addTarget(op, { kind: 'pool', x: 0, z: 0, volume: 0.4, bleed: 0.5 }, 0);
    play(op, { x: 0, z: 0, tool: 0, use: true });
    expect(op.events.some((event) => event.type === 'refusal')).toBe(true);
    expect(op.events.find((event) => event.type === 'refusal')?.text).toBe(refusalLine('scalpel', 'pool'));
    expect(op.slips).toBe(0);
    expect(pool.volume).toBeCloseTo(0.4, 2);
    play(op, { x: 0, z: 0, tool: 3, use: true }, 20);
    expect(pool.done).toBe(true);
    expect(op.score).toBeGreaterThan(0);
  });

  it('injects on release inside the band and refuses a syringe on a shard', () => {
    const op = createBare({ vitals: 40 });
    addTarget(op, { kind: 'mass', x: 6, z: 4, hidden: false, locked: true }, 0);
    play(op, { x: 0, z: 2.2, tool: 5, use: true }, 52);
    expect(op.injected).toBe(false);
    play(op, { x: 0, z: 2.2, tool: 5, use: false });
    expect(op.injected).toBe(true);
    expect(op.patients[0].vitals).toBeGreaterThan(40);
    const shard = addTarget(op, { kind: 'shard', x: 1, z: 1 }, 0);
    const slips = op.slips;
    play(op, { x: 1, z: 1, tool: 5, use: true });
    expect(op.events.some((event) => event.type === 'refusal' && event.kind === 'shard')).toBe(true);
    expect(shard.done).toBe(false);
    expect(op.slips).toBe(slips);
  });

  it('grades cuts and injections on the published bands', () => {
    expect(rateCut(0.1, 0.18)).toBe('TEXTBOOK');
    expect(rateCut(0.3, 0.18)).toBe('CLEAN');
    expect(rateCut(0.5, 0.18)).toBe('ROUGH');
    expect(rateCut(0.8, 0.18)).toBe('SLIP');
    expect(rateInject(0.85)).toEqual({ rating: 'TEXTBOOK', vitals: 24 });
    expect(rateInject(0.97).rating).toBe('ROUGH');
    expect(rateInject(0.6).rating).toBe('CLEAN');
  });

  it('loses when the clock runs out', () => {
    const op = createBare();
    op.clock = 40;
    play(op);
    expect(op.status).toBe('lost');
    expect(op.fail).toBe('Time.');
  });

  it('loses when slips pass the limit', () => {
    const op = createBare();
    addTarget(op, { kind: 'mass', x: 6, z: 4, hidden: false, locked: true }, 0);
    op.slipLimit = 0;
    play(op, { x: 2, z: 2, tool: 0, use: true }, 20);
    expect(op.slips).toBeGreaterThan(0);
    expect(op.status).toBe('lost');
  });

  it('brings a patient back inside the green band and fails two misses', () => {
    const saved = createBare({ vitals: 1 });
    addTarget(saved, { kind: 'mass', x: 6, z: 4, hidden: false, locked: true }, 0);
    saved.patients[0].vitals = 0;
    play(saved);
    expect(saved.code).not.toBeNull();
    for (let i = 0; i < 200 && saved.code && saved.status === 'playing'; i++) play(saved, { paddle: codeBand(saved) });
    expect(saved.status).toBe('playing');
    expect(saved.code).toBeNull();
    expect(saved.patients[0].vitals).toBeGreaterThanOrEqual(25);

    const missed = createBare({ vitals: 1 });
    addTarget(missed, { kind: 'mass', x: 6, z: 4, hidden: false, locked: true }, 0);
    missed.patients[0].vitals = 0;
    play(missed);
    let misses = 0;
    for (let i = 0; i < 200 && missed.status === 'playing' && misses < 2; i++) {
      if (codeBand(missed)) {
        play(missed, { paddle: false });
        continue;
      }
      play(missed, { paddle: true });
      play(missed, { paddle: false });
      misses += 1;
    }
    expect(misses).toBe(2);
    expect(missed.status).toBe('lost');
    expect(missed.fail).toBe('The line stays flat.');
  });

  it('spends one Code try when the paddles are held off the green band', () => {
    const op = createBare({ vitals: 1 });
    addTarget(op, { kind: 'mass', x: 6, z: 4, hidden: false, locked: true }, 0);
    op.patients[0].vitals = 0;
    play(op);
    expect(op.status).toBe('playing');
    expect(op.code).not.toBeNull();
    expect(codeBand(op)).toBe(false);
    const tries = op.code?.tries ?? 0;
    play(op, { paddle: true }, 6);
    expect(op.status).toBe('playing');
    expect(op.code).not.toBeNull();
    expect(op.code?.tries).toBe(tries - 1);

    const held = createBare({ vitals: 1 });
    addTarget(held, { kind: 'mass', x: 6, z: 4, hidden: false, locked: true }, 0);
    held.patients[0].vitals = 0;
    play(held, { paddle: true }, 6);
    expect(held.tick).toBeGreaterThanOrEqual(3);
    expect(held.status).toBe('playing');
    expect(held.code).not.toBeNull();
    expect(held.code?.tries).toBeGreaterThan(0);
  });

  it('fails a flatline immediately when the case has no Code', () => {
    const op = createBare({ code: false, vitals: 5 });
    op.patients[0].vitals = 0;
    play(op);
    expect(op.status).toBe('lost');
    expect(op.code).toBeNull();
  });

  it('deepens a pool on a site nobody is standing on', () => {
    const op = createBare();
    op.sites.push({ id: 'other', name: 'Other' });
    const pool = addTarget(op, { kind: 'pool', x: 1, z: 1, volume: 1, bleed: 0.2, site: 1 }, 0);
    const before = pool.volume;
    play(op, {}, 90);
    expect(pool.volume).toBeGreaterThan(before);
  });

  it('slows field time in Stillpoint and holds vitals in Second Pulse', () => {
    const still = createBare();
    addTarget(still, { kind: 'mass', x: 6, z: 4, hidden: false, locked: true }, 0);
    still.simple = true;
    still.seats[0].charges = 1;
    play(still, { gift: true });
    expect(still.seats[0].giftKind).toBe('still');
    const field = still.field;
    play(still);
    expect(still.field - field).toBe(25);

    const pulse = createBare({ vitals: 50 });
    addTarget(pulse, { kind: 'mass', x: 6, z: 4, hidden: false, locked: true }, 0);
    pulse.simple = true;
    pulse.seats[0].gift = 'second';
    pulse.seats[0].charges = 1;
    addTarget(pulse, { kind: 'pool', x: 3, z: 3, volume: 2, bleed: 2 }, 0);
    play(pulse, { gift: true });
    play(pulse, {}, 30);
    expect(pulse.patients[0].vitals).toBeGreaterThanOrEqual(50);
  });

  it('starts a Consult when two gifts land inside a second', () => {
    const op = createBare({ seats: 2 });
    op.simple = true;
    for (const seat of op.seats) {
      seat.gift = 'stillpoint';
      seat.charges = 1;
    }
    const hands = op.seats.map((seat) => ({ ...idleHand(seat), gift: true }));
    stepOp(op, hands);
    expect(op.events.some((event) => event.type === 'consult')).toBe(true);
    expect(op.seats[0].giftLeft).toBeGreaterThan(6 * 60);
  });

  it('telegraphs a Lull before the numb patch', () => {
    const op = createBare({ vitals: 90 });
    addTarget(op, { kind: 'lull', x: 1, z: 0 }, 0);
    let saw = false;
    for (let i = 0; i < 400 && !saw; i++) {
      play(op);
      saw = op.events.some((event) => event.type === 'telegraph' && event.kind === 'lull');
    }
    expect(saw).toBe(true);
  });

  it('splits Solace, then lets the laser finish a third generation', () => {
    const op = createBare();
    const solace = addTarget(op, { kind: 'solace', x: 0, z: 0, gen: 1 }, 0);
    for (let i = 0; i < 50; i++) {
      const x = -1 + (i / 49) * 2;
      play(op, { x, z: 0, tool: 0, use: Math.abs(x) < 1 });
    }
    expect(solace.done).toBe(true);
    expect(op.targets.filter((target) => target.kind === 'solace' && !target.done).length).toBeGreaterThanOrEqual(2);
    const small = addTarget(op, { kind: 'solace', x: 3, z: 0, gen: 3 }, 0);
    play(op, { x: 3, z: 0, tool: 4, use: true }, 80);
    expect(small.done).toBe(true);
  });

  it('surfaces Reverie under the laser and sinks it again', () => {
    const op = createBare();
    const reverie = addTarget(op, { kind: 'reverie', x: 0, z: 0 }, 0);
    expect(reverie.hidden).toBe(true);
    play(op, { x: 0, z: 0, tool: 7, use: true }, 2);
    expect(reverie.hidden).toBe(false);
    play(op, { x: 0, z: 0, tool: 4, use: true }, 2);
    expect(reverie.surfaced).toBe(true);
    const damage = reverie.laserDamage;
    for (let i = 0; i < 200 && reverie.surfaced; i++) play(op, { x: 0, z: 0, tool: 4, use: true });
    expect(reverie.laserDamage).toBeGreaterThan(damage);
    expect(reverie.hidden).toBe(true);
    expect(op.events.some((event) => event.type === 'submerge')).toBe(true);
  });

  it('lacquers a wound beside a Balm cell and fades the film after the node dies', () => {
    const op = createBare();
    const wound = addTarget(op, { kind: 'wound', x: 0, z: 0, x2: 1, z2: 0 }, 0);
    addTarget(op, { kind: 'balmCell', x: 0.2, z: 0.2 }, 0);
    play(op);
    expect(wound.lacquer).toBe(true);
    play(op, { x: 0.4, z: 0, tool: 2, use: true });
    expect(op.events.some((event) => event.type === 'refusal')).toBe(true);
    const node = addTarget(op, { kind: 'balmNode', x: 2, z: 2 }, 0);
    play(op, { x: 2, z: 2, tool: 5, use: true }, 50);
    expect(node.done).toBe(true);
  });

  it('walks Mercy from motes to the exposed binders', () => {
    const op = createFromCase('case:mercy', { seed: 1 });
    const ids = op.phases.map((phase) => phase.id);
    expect(ids).toContain('mercy-motes');
    expect(ids).toContain('mercy-kindness');
    expect(ids).toContain('mercy-rites');
    op.phase = ids.indexOf('mercy-motes');
    op.targets.forEach((target) => {
      target.done = true;
    });
    op.mercyKills = 6;
    op.mercyBindSpawned = false;
    play(op);
    expect(op.targets.some((target) => target.kind === 'binder' && target.tag === 'mercy' && !target.done)).toBe(true);
  });

  it('scales the clock and the slip cap with difficulty', () => {
    const intern = createFromCase('case:first-cut', { difficulty: 'intern' });
    const attending = createFromCase('case:first-cut', { difficulty: 'attending' });
    expect(intern.clockMax).toBeGreaterThan(attending.clockMax);
    expect(intern.slipLimit).toBe(10);
    expect(attending.slipLimit).toBe(3);
    expect(rankFor(attending.par, attending.par, 0, 'attending')).toBe('★');
    expect(rankFor(intern.par * 0.5, intern.par, 1, 'intern')).toBe('C');
  });

  it('clamps a slider and puts it back on reset', () => {
    const op = createBare();
    expect(setSlider(op, 'drain', 99)).toBe(6);
    expect(op.balance.drain).toBe(6);
    setSlider(op, 'slips', 2);
    expect(op.slipLimit).toBe(2);
    resetSliders(op);
    expect(op.balance.drain).toBe(2.4);
    expect(op.slipLimit).toBe(op.slipDefault);
  });
});
