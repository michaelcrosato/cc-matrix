/** @file End-to-end simulation checks: campaign, fire, survival, vehicles, economy, capture and lockstep. */
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { createHeadless, type Headless } from '../../../engine';
import { def } from '../../../engine/sim-api';
import world from './world';
import { CONTRACTS, STOCK } from './content';
import { inspectorOf, roundOf, mercOf, useKey, playBot, observeBot } from '../bot';
import { inspectorDigest } from '../net/lockstep';
const make = (seed = 1, settings: Record<string, unknown> = {}) =>
  createHeadless({ scene: world, seed, settings: { 'game.mode': 'contract', 'game.detail': 0.05, ...settings } });
const action = (e: Headless, key: string, args: unknown = {}) => inspectorOf(e).actions.run(key, args);
const tick = (e: Headless, n = 1) => e.step(n);

function car(e: Headless, kind = 'pickup') {
  return e
    .entities('ride')
    .map(
      (x) =>
        e.get(x.id) as unknown as {
          id: number;
          ride: { data: { kind: string; hp: number; speed: number; driver: number; body: number } };
          sceneProp: { x: number; y: number; z: number };
        },
    )
    .find((x) => x.ride.data.kind === kind)!;
}
function enter(e: Headless, kind = 'pickup') {
  const r = car(e, kind);
  action(e, 'place', { x: r.sceneProp.x + 2.2, z: r.sceneProp.z });
  e.step(1, { look: [-Math.PI / 2, 0], p: ['interact'] });
  e.step(2);
  return r.id;
}

describe('the basin', () => {
  it('replays its recorded opening to the golden hashes', async () => {
    const replay = JSON.parse(readFileSync(new URL('../replays/bot.replay.json', import.meta.url), 'utf8'));
    const a = await make(7);
    for (let i = 0; i < 120; i++) a.step(1, { move: [0, -0.5], look: [Math.PI, 0] });
    expect(a.hash()).toBe(replay.hashes['linux-x64']['120']);
  });
  it('captures and restores a moving seat without shared state', async () => {
    const e = await make();
    e.step(90, { move: [0.4, 0.6], look: [0.3, 0], b: ['map'] });
    const capture = e.capture();
    e.step(90, { move: [-0.2, 0.7], look: [0.4, 0], b: ['fire'] });
    const hash = e.hash();
    e.restore(capture);
    e.step(90, { move: [-0.2, 0.7], look: [0.4, 0], b: ['fire'] });
    expect(e.hash()).toBe(hash);
  });
  it('clears a seized chamber and wears a rifle into the next tier', async () => {
    const e = await make();
    action(e, 'give', { condition: 0.67, jam: true });
    e.step(240, { b: ['reload'] });
    expect(mercOf(e).gunState.data.guns[1].jam).toBe(false);
    inspectorOf(e).set('game.wear.perShot', 0.02);
    e.step(60, { b: ['fire'] });
    expect(mercOf(e).gunState.data.guns[1].condition).toBeLessThan(0.66);
    expect(mercOf(e).weapons.slots[1]).toContain('worn');
  });
  it('distinguishes syrettes from free critical field surgery and segment regeneration', async () => {
    const e = await make();
    tick(e);
    action(e, 'hurt', { hp: 35 });
    e.step(1, { p: ['heal'] });
    tick(e, 60);
    expect(mercOf(e).health.hp).toBe(100);
    expect(mercOf(e).seat!.data.syr).toBe(2);
    action(e, 'hurt', { hp: 12 });
    e.step(1, { p: ['heal'] });
    tick(e, 160);
    expect(mercOf(e).health.hp).toBeGreaterThanOrEqual(60);
    expect(mercOf(e).seat!.data.syr).toBe(2);
    action(e, 'hurt', { hp: 41 });
    tick(e, 500);
    expect(mercOf(e).health.hp).toBeCloseTo(60);
  });
  it('takes quinine, clears fever, and produces a late-attack mirage', async () => {
    const e = await make();
    inspectorOf(e).set('game.god', true);
    tick(e);
    action(e, 'fever');
    tick(e, 1805);
    expect(roundOf(e).coverage.mirage).toBeGreaterThan(0);
    e.step(1, { p: ['pill'] });
    tick(e, 80);
    expect(mercOf(e).seat!.data.fever).toBe(0);
    expect(mercOf(e).seat!.data.pills).toBe(3);
  });
  it('honours a buddy rescue and stops an overdrawn account', async () => {
    const e = await make(3, { 'game.mode': 'story' });
    tick(e);
    action(e, 'place', { x: 400, z: 1150 });
    action(e, 'story', { contract: 1 });
    action(e, 'hurt', { hp: 0 });
    tick(e, 1400);
    expect(roundOf(e).coverage.rescue).toBeGreaterThan(0);
    expect(roundOf(e).buddies.some((b) => b.debt === 1)).toBe(true);
    for (const b of roundOf(e).buddies) action(e, 'debt', { key: b.key, debt: 3 });
    action(e, 'hurt', { hp: 0 });
    tick(e);
    expect(mercOf(e).seat!.data.rescue).toBe(-1);
  });
  it('drives with real suspension, exits and repairs the bonnet', async () => {
    const e = await make();
    tick(e, 10);
    const id = enter(e);
    expect(mercOf(e).seat!.data.vehicle).toBe(id);
    const before = car(e).sceneProp;
    e.step(300, { b: ['throttle'] });
    const after = car(e).sceneProp;
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(10);
    expect(car(e).ride.data.speed).toBeGreaterThan(1);
    e.step(1, { p: ['interact'] });
    expect(mercOf(e).seat!.data.vehicle).toBe(-1);
  });
  it('boards a buoyant boat and fires its mounted gun', async () => {
    const e = await make();
    tick(e, 10);
    const id = enter(e, 'boat');
    expect(mercOf(e).seat!.data.vehicle).toBe(id);
    e.step(1, { p: ['seat'] });
    e.step(120, { b: ['fire'], look: [1.57, 0] });
    expect(roundOf(e).coverage['mounted gun']).toBeGreaterThan(0);
    e.step(300, { b: ['throttle'] });
    expect(car(e, 'boat').ride.data.speed).toBeGreaterThan(1);
  });
  it('finds stones, buys reliability and reissues an owned weapon', async () => {
    const e = await make();
    tick(e);
    useKey(e, 'cache-0');
    expect(roundOf(e).caches).toContain('cache-0');
    action(e, 'place', { place: 'airstrip' });
    action(e, 'give', { stones: 100 });
    e.step(1, { 'game:command': { kind: 'buy', index: 12 } });
    expect(mercOf(e).seat!.data.reliability).toBe(1);
    action(e, 'give', { condition: 0.2, broken: true });
    e.step(1, { 'game:command': { kind: 'reissue' } });
    expect(mercOf(e).gunState.data.guns[1].condition).toBe(1);
    expect(mercOf(e).gunState.data.guns[1].broken).toBe(false);
  });
  it('has anisotropic fire, persistent scars and regrowth', async () => {
    const e = await make(9, { 'game.fire.regrow': 18 });
    inspectorOf(e).set('game.god', true);
    tick(e);
    action(e, 'ignite', { x: 850, z: 550, radius: 1 });
    tick(e, 1800);
    const c = roundOf(e);
    let east = 0,
      west = 0;
    c.fire.forEach((f, i) => {
      if (f < 2) return;
      const x = ((i % 192) + 0.5) * 8,
        z = (Math.floor(i / 192) + 0.5) * 8;
      if (Math.abs(z - 550) > 120) return;
      east = Math.max(east, x - 850);
      west = Math.max(west, 850 - x);
    });
    expect(east).toBeGreaterThan(40);
    expect(east).toBeGreaterThan(west);
    expect(c.coverage.scorch).toBeGreaterThan(0);
    expect(c.coverage.regrowth).toBeGreaterThan(0);
  });
  it('rain prevents fresh spread and salt is a firebreak', async () => {
    const e = await make();
    tick(e);
    action(e, 'weather', { rain: true });
    action(e, 'ignite', { x: 850, z: 550, radius: 1 });
    const before = roundOf(e).coverage.ignite;
    tick(e, 500);
    expect(roundOf(e).coverage.ignite).toBe(before);
    action(e, 'ignite', { x: 1240, z: 260 });
    expect(roundOf(e).fire[Math.floor(260 / 8) * 192 + Math.floor(1240 / 8)]).toBe(0);
  });
  it('keeps seats identical in 2- and 4-player lockstep with different local cameras', async () => {
    for (const n of [2, 4]) {
      const a = await make(12, { 'game.seats': n, 'game.me': 0 }),
        b = await make(12, { 'game.seats': n, 'game.me': n - 1 });
      for (let k = 0; k < 600; k++) {
        const wires = Array.from({ length: n }, (_, i) => ({
          move: [Math.sin(i) * 0.3, -0.3] as [number, number],
          look: [Math.PI, 0] as [number, number],
          b: k % 120 < 30 ? ['fire'] : ['reload'],
        }));
        const all = Object.fromEntries(wires.map((I, i) => [i, I]));
        a.step(1, { ...wires[0], 'game:seats': all as never });
        b.step(1, { ...wires[n - 1], 'game:seats': all as never });
      }
      expect(inspectorDigest(a)).toBe(inspectorDigest(b));
    }
  });
  it('adds a contract and dealer item entirely as validated data', async () => {
    const added = {
      name: 'A clean receipt',
      giver: 'Ferreira',
      faction: 'neutral',
      pay: 9,
      brief: 'Bring back a signature.',
      steps: [{ kind: 'talk', key: 'Ferreira', goal: 'Talk to Ferreira.' }],
      alt: '',
    };
    def('contract', 'contract:designer', added);
    CONTRACTS.push({ id: 'designer', ...added });
    def('stock', 'stock:designer', { name: 'Field repair kit', price: 1, op: 'kit', key: '1' });
    STOCK.push({ name: 'Field repair kit', price: 1, kind: 'kit', key: '1' });
    const e = await make(1, { 'game.mode': 'story' });
    tick(e);
    action(e, 'story', { contract: CONTRACTS.length - 1 });
    useKey(e, 'Ferreira');
    expect(roundOf(e).finished).toContain(CONTRACTS.length - 1);
    CONTRACTS.pop();
    STOCK.pop();
  });
  it.each([1, 2, 3])(
    'plays the full campaign seed %i and branches through all endings',
    async (seed) => {
      const e = await make(seed, { 'game.mode': 'story' });
      observeBot((phase, data) => writeFileSync('out/test/bot-progress.json', JSON.stringify({ seed, phase, data })));
      const run = playBot(e, 'wait', true);
      expect({ seed, ...run }).toMatchObject({ state: 'ready', contract: 6 });
      const checkpoint = e.capture();
      for (const choice of ['serve', 'buy', 'burn']) {
        e.restore(checkpoint);
        e.step(1, { 'game:command': { kind: 'ending', key: choice } });
        expect(roundOf(e).ending).not.toBe('');
        expect(roundOf(e).coverage[`ending ${choice}`]).toBeGreaterThan(0);
      }
      observeBot(null);
    },
    300000,
  );
  it('saves the original seed, vehicles, supplies and permanent buddy death', async () => {
    const e = await make(41, { 'game.mode': 'story' });
    e.step(1);
    action(e, 'story', { contract: 3, step: 1 });
    action(e, 'give', { stones: 77, pills: 2, condition: 0.4 });
    const buddy = roundOf(e).buddies[0];
    action(e, 'debt', { key: buddy.key, debt: 2, alive: false });
    action(e, 'standing', { front: 2, authority: -1 });
    const id = enter(e);
    e.step(180, { b: ['throttle'] });
    e.step(1, { p: ['interact'] });
    action(e, 'snapshot');
    const saved = (e.get(e.entities('gameSave')[0].id)!.gameSave as { data: import('./save').Save }).data;
    e.seed(saved.seed);
    action(e, 'load', saved);
    e.step(1);
    expect(mercOf(e).seat!.data.stones).toBe(77);
    expect(mercOf(e).gunState.data.guns[1].condition).toBeCloseTo(0.4);
    expect(roundOf(e).front).toBe(2);
    expect(roundOf(e).contract).toBe(3);
    expect(roundOf(e).buddies[0].alive).toBe(false);
    expect((e.get(roundOf(e).buddies[0].entity)!.health as { hp: number }).hp).toBe(0);
    expect(car(e).sceneProp.z).toBeCloseTo(saved.rides[0].at[2], 0);
    expect(id).toBeGreaterThan(0);
  });
  it('loads a carried crate into a moving pickup', async () => {
    const e = await make(8, { 'game.mode': 'story' });
    e.step(1);
    action(e, 'story', { contract: 2, step: 1 });
    inspectorOf(e).set('game.god', true);
    enter(e);
    e.step(220, { b: ['throttle'] });
    e.step(1, { p: ['interact'] });
    useKey(e, 'quinine-0');
    const r = car(e);
    action(e, 'place', { x: r.sceneProp.x + 2.2, z: r.sceneProp.z });
    e.step(1, { p: ['interact'], look: [-Math.PI / 2, 0] });
    e.step(2);
    const crate = e
      .entities('usable')
      .map((x) => e.get(x.id)!)
      .find((x) => (x.usable as { data: { key: string } }).data.key === 'quinine-0')!;
    expect((crate.usable as { data: { extra: string } }).data.extra).toBe(`vehicle:${r.id}`);
    expect(mercOf(e).seat!.data.vehicle).toBe(r.id);
  });
  it('keeps bleed-out final and prevents movement after it', async () => {
    const e = await make();
    e.step(1);
    action(e, 'hurt', { hp: 0 });
    e.step(2410);
    const p = mercOf(e);
    e.step(90, { move: [1, 0], b: ['fire'] });
    expect(mercOf(e).seat!.data.down).toBe(-1);
    expect(mercOf(e).actor.x).toBeCloseTo(p.actor.x, 3);
    expect(roundOf(e).ending).toBe('RESERVE NOT MET');
  });
});
