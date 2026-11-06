/**
 * @file The island and the pavilion boot through the shipped scenes and take a few steps.
 * Pose scrub, tilt, plaques and pebbles are asserted from the island step, not a stand-in.
 */
import { describe, expect, it } from 'vitest';
import type { EngineFrame } from '../../engine';
import { createAppHost } from '../../engine/app/headless';
import type { World } from '../../engine/sim-api';
import { stickIntents } from './scenes/bot';
import { actOf, flowOf } from './scenes/events/kit';
import { poseA } from './scenes/events/pose';
import { island } from './scenes/island';
import { round } from './scenes/round';
import { freshSave, noteProgress } from './ui/save';
import { readSnap } from './ui/snap';

/** A live island and the menu actions that drive it. */
function boot(seed: number, settings?: Record<string, unknown>) {
  const run = createAppHost({ scene: island, seed, settings });
  const w = run.session.world as World;
  const menu = (name: string, args?: unknown) => {
    (run.inspector.actions as { run: (action: string, value?: unknown) => void }).run(name, args);
  };
  return { run, w, menu };
}

/** Clip time on the guest, or -1 when that clip is not playing. */
function slotT(w: World, clip: string): number {
  const rows = w.query('actor') as unknown as {
    role?: { who: string };
    clips?: { state?: { slots?: { clip: string; t: number }[] } };
  }[];
  const who = rows.find((row) => row.role?.who === 'guest');
  const slot = who?.clips?.state?.slots?.find((row) => row.clip === clip);
  return slot?.t ?? -1;
}

/** The sea's turn. q[2] is the west-lean component. */
function seaZ(w: World): number {
  const rows = w.query('sceneProp') as unknown as { sceneProp: { prop: string; q: number[] } }[];
  return rows.find((row) => row.sceneProp.prop === 'prop:sea')?.sceneProp.q[2] ?? 0;
}

/** The island lean the sea is reading. */
function tiltX(w: World): number {
  const rows = w.query('island') as unknown as { island: { tiltX: number } }[];
  return rows[0]?.island.tiltX ?? 0;
}

/** A mark of one kind and text. */
function spot(w: World, kind: string, text: string) {
  const rows = w.query('mark') as unknown as {
    mark: { kind: string; text: string; x: number; z: number; taken: number; follow: number };
  }[];
  const row = rows.find((item) => item.mark.kind === kind && item.mark.text === text);
  if (!row) throw new Error(`${kind} ${text}`);
  return row.mark;
}

/** Where the guest is standing. */
function guestAt(w: World): { x: number; z: number } {
  const rows = w.query('actor') as unknown as { role?: { who: string }; actor: { x: number; z: number } }[];
  const who = rows.find((row) => row.role?.who === 'guest');
  if (!who) throw new Error('no guest');
  return who.actor;
}

describe('places', () => {
  it('boots the island and walks a step', () => {
    const run = createAppHost({ scene: island, seed: 1 });
    run.stepOnce({ move: [0, 1] });
    run.stepOnce({ move: [0, 1] });
    const world = run.session.world;
    expect(world.query('flow').length).toBe(1);
    expect(world.query('actor').length).toBeGreaterThan(0);
    expect(world.query('mark').length).toBeGreaterThan(4);
  });

  it('boots the pavilion and keeps a ghost seat', () => {
    const run = createAppHost({ scene: round, seed: 2 });
    run.stepOnce({ 'game:ghosts': [1, 1, 0.2, -0.1, 0, 2, 0, 0, 0, 0, 3, 0, 0, 0, 0] });
    const world = run.session.world;
    const ghosts = world.query('ghost') as unknown as { ghost: { on: number; seat: number } }[];
    expect(ghosts.length).toBe(3);
    expect(ghosts.some((row) => row.ghost.seat === 1 && row.ghost.on === 1)).toBe(true);
  });
});

describe('island day', () => {
  it('scrubs the pose clip from the class the guest is actually in', () => {
    const { run, w, menu } = boot(1, { 'game.pose.hold': 4 });
    menu('game.start', { event: 'pose-a' });
    run.stepOnce(poseA.bot(w, 'perfect'));
    const early = slotT(w, 'RETREAT/Nothing');
    expect(early).toBeGreaterThan(0);
    for (let i = 0; i < 20; i += 1) run.stepOnce(poseA.bot(w, 'perfect'));
    expect(actOf(w).phase).toBe(0);
    expect(slotT(w, 'RETREAT/Nothing')).toBeGreaterThan(early);
    let chair = false;
    for (let i = 0; i < 800 && !chair; i += 1) {
      run.stepOnce(poseA.bot(w, 'perfect'));
      chair = actOf(w).pose >= 1;
    }
    expect(chair).toBe(true);
    const held = slotT(w, 'RETREAT/Chair');
    for (let i = 0; i < 15; i += 1) run.stepOnce(poseA.bot(w, 'perfect'));
    const later = slotT(w, 'RETREAT/Chair');
    expect(later).toBeGreaterThan(0);
    expect(later).toBeGreaterThan(held);
  }, 120_000);

  it('tips the sea with the centre of balance, and a delivered guest takes lean off', () => {
    const still = boot(1);
    const pushed = boot(1);
    still.menu('game.jump', { step: 'tilt:stone' });
    pushed.menu('game.jump', { step: 'tilt:stone' });
    let leanGap = 0;
    let seaGap = 0;
    for (let i = 0; i < 120; i += 1) {
      still.run.stepOnce(stickIntents({ x: 0, y: 0 }, {}));
      pushed.run.stepOnce(stickIntents({ x: 1, y: 0 }, {}));
      leanGap = Math.max(leanGap, Math.abs(tiltX(pushed.w) - tiltX(still.w)));
      seaGap = Math.max(seaGap, Math.abs(seaZ(pushed.w) - seaZ(still.w)));
    }
    expect(leanGap).toBeGreaterThan(0.25);
    expect(seaGap).toBeGreaterThan(0.001);
    expect(seaZ(still.w)).not.toBe(0);

    const { run, w, menu } = boot(1, { 'game.tilt.rate': 1 });
    menu('game.start', { event: 'tilt' });
    for (let i = 0; i < 60; i += 1) run.stepOnce({});
    const fast = tiltX(w);
    const fastSea = seaZ(w);
    expect(fast).toBeCloseTo(1.4, 2);
    expect(fastSea).toBeLessThan(0);

    const calm = boot(1, { 'game.tilt.rate': 0 });
    calm.menu('game.start', { event: 'tilt' });
    for (let i = 0; i < 60; i += 1) calm.run.stepOnce({});
    expect(tiltX(calm.w)).toBeCloseTo(0.4, 2);
    expect(fastSea).toBeLessThan(seaZ(calm.w));

    const east = boot(2);
    east.menu('game.jump', { step: 'tilt:east' });
    east.run.stepOnce({});
    const before = tiltX(east.w);
    const beforeSea = seaZ(east.w);
    expect(before).toBeCloseTo(0.4, 3);
    expect(beforeSea).toBeLessThan(0);
    const guest = spot(east.w, 'guest', 'Gerald');
    guest.follow = 1;
    guest.x = 59;
    guest.taken = 0;
    actOf(east.w).px = 70;
    east.run.stepOnce({});
    expect(guest.taken).toBe(1);
    expect(tiltX(east.w)).toBeCloseTo(before - 0.5, 3);
    expect(seaZ(east.w)).toBeGreaterThan(beforeSea);
    east.run.stepOnce({});
    expect(tiltX(east.w)).toBeCloseTo(before - 0.5, 3);
  }, 120_000);

  it('shifts plaques west as the day advances', () => {
    const { run, w, menu } = boot(1);
    run.stepOnce({});
    expect(spot(w, 'plaque', 'plaque.want').x).toBeCloseTo(6, 5);
    expect(spot(w, 'plaque', 'plaque.moved').x).toBeCloseTo(-6, 5);
    menu('game.jump', { day: 4 });
    run.stepOnce({});
    expect(flowOf(w).day).toBe(4);
    expect(spot(w, 'plaque', 'plaque.want').x).toBeCloseTo(6 - 0.12, 5);
    expect(spot(w, 'plaque', 'plaque.moved').x).toBeCloseTo(-6 - 0.12, 5);
    run.stepOnce({});
    expect(spot(w, 'plaque', 'plaque.want').x).toBeCloseTo(6 - 0.12, 5);
  });

  it('keeps a found pebble taken when the save comes back', () => {
    const { run, w, menu } = boot(1);
    menu('game.leave');
    run.stepOnce({});
    const first = spot(w, 'pebble', 'pebble:0');
    const at = guestAt(w);
    first.x = at.x;
    first.z = at.z;
    run.stepOnce({});
    expect(first.taken).toBe(1);
    expect(flowOf(w).pebbles).toBe(1);
    expect(flowOf(w).line).toBe('find.pebble');
    const snap = readSnap({ world: w } as unknown as EngineFrame);
    expect(snap.finds).toContain('pebble:0');
    expect(noteProgress(freshSave(), snap).finds).toEqual(['pebble:0']);
    first.taken = 0;
    menu('game.begin', { day: 1, cursor: 0, pebbles: 1, finds: ['pebble:0'] });
    expect(first.taken).toBe(1);
    expect(flowOf(w).pebbles).toBe(1);
    menu('game.leave');
    const back = guestAt(w);
    first.x = back.x;
    first.z = back.z;
    run.stepOnce({});
    expect(flowOf(w).pebbles).toBe(1);
    const second = spot(w, 'pebble', 'pebble:1');
    second.x = guestAt(w).x;
    second.z = guestAt(w).z;
    run.stepOnce({});
    expect(second.taken).toBe(1);
    expect(flowOf(w).pebbles).toBe(2);
  });

  it('walks downhill when the island is leaning west', () => {
    const flat = boot(1);
    const tipped = boot(1);
    flat.menu('game.leave');
    tipped.menu('game.leave');
    const flatIsland = flat.w.query('island') as unknown as { island: { tiltX: number } }[];
    const tippedIsland = tipped.w.query('island') as unknown as { island: { tiltX: number } }[];
    const flatLean = flatIsland[0]?.island;
    const tippedLean = tippedIsland[0]?.island;
    if (!flatLean || !tippedLean) throw new Error('no island');
    flatLean.tiltX = 0;
    tippedLean.tiltX = 20;
    const flat0 = guestAt(flat.w).x;
    const tipped0 = guestAt(tipped.w).x;
    for (let i = 0; i < 200; i += 1) {
      flat.run.stepOnce({});
      tipped.run.stepOnce({});
    }
    const flatDrift = guestAt(flat.w).x - flat0;
    const tippedDrift = guestAt(tipped.w).x - tipped0;
    expect(tippedDrift).toBeLessThan(flatDrift - 0.2);
  }, 120_000);
});
