/** @file Scripted field operative used by the playthrough tests. Travel is physical through Receipts; later jumps shorten test time. */
import type { Headless, Intents } from '../../engine';
import type { Campaign, Person, Usable } from './scenes/state';
import { place } from './scenes/map';
import { CONTRACTS } from './scenes/content';
import type { GameInspector } from './ui/context';
let observer: ((phase: string, data: unknown) => void) | null = null;
export function observeBot(fn: ((phase: string, data: unknown) => void) | null): void {
  observer = fn;
}
export const inspectorOf = (e: Headless) => e as unknown as GameInspector;
export const roundOf = (e: Headless): Campaign =>
  (e.get(e.entities('campaign')[0].id)!.campaign as { data: Campaign }).data;
export const mercOf = (e: Headless): Person => e.get(e.entities('seat')[0].id) as unknown as Person;
export const viewOf = (e: Headless) => ({ campaign: roundOf(e), merc: mercOf(e) });
export function botIntents(e: Headless, at: [number, number]): Intents {
  const p = mercOf(e),
    dx = at[0] - p.actor.x,
    dz = at[1] - p.actor.z,
    d = Math.hypot(dx, dz);
  return {
    move: d > 0.1 ? [dx / d, dz / d] : [0, 0],
    look: [Math.atan2(dx, dz), 0],
    b: d < 14 ? ['walk'] : ['sprint'],
  };
}
export function walkTo(e: Headless, at: [number, number], radius = 2.1, maxSteps = 24000): boolean {
  observer?.('travel', { at, radius });
  let last: [number, number] = [0, 0],
    stuck = 0;
  for (let n = 0; n < maxSteps; n += 12) {
    const p = mercOf(e);
    if (n % 600 === 0)
      observer?.('travel-progress', {
        at,
        n,
        x: p.actor.x,
        z: p.actor.z,
        distance: Math.hypot(p.actor.x - at[0], p.actor.z - at[1]),
      });
    if (Math.hypot(p.actor.x - at[0], p.actor.z - at[1]) < radius) return true;
    const I = botIntents(e, at);
    e.step(12, I);
    if (n % 180 === 0) {
      if (Math.hypot(p.actor.x - last[0], p.actor.z - last[1]) < 0.5) stuck++;
      else stuck = 0;
      last = [p.actor.x, p.actor.z];
      if (stuck) {
        const yaw = (I.look?.[0] ?? 0) + (stuck % 2 ? 1.57 : -1.57);
        e.step(90, { move: [Math.sin(yaw), Math.cos(yaw)], b: ['jump', 'sprint'], look: [yaw, 0] });
      }
    }
  }
  return false;
}
export function useKey(e: Headless, key: string, jump = true): void {
  observer?.('use', { key, jump });
  if (mercOf(e).seat!.data.vehicle >= 0) {
    e.step(1, { p: ['interact'] });
    e.step(2);
  }
  const target = e
    .entities('usable')
    .map((x) => e.get(x.id) as unknown as { id: number; usable: { data: Usable }; actor?: { x: number; z: number } })
    .find((x) => x.usable.data.key === key);
  if (!target) throw new Error(`No usable: ${key}`);
  const u = target.usable.data,
    x = target.actor?.x ?? u.x,
    z = target.actor?.z ?? u.z;
  if (!jump && key === 'ledger-km40')
    for (const at of [
      [604, 548],
      [624, 548],
    ] as [number, number][])
      if (!walkTo(e, at, 0.6, 3000)) throw new Error('Could not route around the checkpoint gate.');
  if (!jump && ['Lazare', 'Cassius', 'Naré'].includes(key)) {
    for (const at of [
      [806, 835],
      [806, 812],
      [x + 1.7, 812],
    ] as [number, number][])
      if (!walkTo(e, at, 0.6)) throw new Error(`Town approach failed: ${key}`);
  }
  if (jump) inspectorOf(e).actions.run('place', { x: x + 1.8, z });
  else if (!walkTo(e, [x + 1.7, z], 0.35)) throw new Error(`Travel failed: ${key}`);
  const p = mercOf(e),
    yaw = Math.atan2(x - p.actor.x, z - p.actor.z);
  e.step(1, { look: [yaw, 0], p: ['interact'] });
  e.step(2);
}
export function fight(e: Headless, where?: string, limit = 6000): number {
  e.step(1, { p: ['weapon2'] });
  e.step(25);
  let lastHP = -1,
    stuck = 0,
    flank: [number, number] | null = null;
  for (let n = 0; n < limit; n += 6) {
    const p = mercOf(e),
      enemies = e
        .entities('soldier')
        .map((x) => e.get(x.id) as unknown as Person)
        .filter((x) => x.health.hp > 0 && (!where || x.soldier!.data.place === where));
    if (p.health.hp <= 0) return -1;
    if (p.gunState.data.guns[1].broken || (p.weapons.mags[1] <= 0 && p.gunState.data.guns[1].reserve <= 0)) return -1;
    const enemy = enemies.sort(
      (a, b) =>
        Math.hypot(a.actor.x - p.actor.x, a.actor.z - p.actor.z) -
        Math.hypot(b.actor.x - p.actor.x, b.actor.z - p.actor.z),
    )[0];
    if (!enemy) return n;
    const g = p.gunState.data.guns[Math.max(0, p.weapons.slot)],
      dx = enemy.actor.x - p.actor.x,
      dz = enemy.actor.z - p.actor.z;
    if (enemy.health.hp === lastHP) stuck += 6;
    else stuck = 0;
    lastHP = enemy.health.hp;
    if (n % 300 === 0)
      observer?.('fight', {
        where,
        n,
        x: p.actor.x,
        z: p.actor.z,
        mag: p.weapons.mags[1],
        reserve: p.gunState.data.guns[1].reserve,
        condition: p.gunState.data.guns[1].condition,
        enemies: enemies.map((t) => ({
          id: t.id,
          hp: t.health.hp,
          state: t.soldier!.data.state,
          x: t.actor.x,
          z: t.actor.z,
        })),
      });
    const site = place(where ?? ''),
      distance = Math.hypot(dx, dz),
      yaw = Math.atan2(dx, dz);
    if (stuck > 150 && !flank)
      flank = [Math.min(1480, site.x + site.radius - 10), Math.max(50, site.z - site.radius + 12)];
    if (flank && Math.hypot(flank[0] - p.actor.x, flank[1] - p.actor.z) < 4) {
      flank = null;
      stuck = 0;
    }
    if (stuck === 120 && p.seat!.data.frags > 0) e.step(1, { p: ['frag'], look: [yaw, 0] });
    const mx = flank ? flank[0] - p.actor.x : dx,
      mz = flank ? flank[1] - p.actor.z : dz,
      md = Math.max(0.001, Math.hypot(mx, mz));
    e.step(6, {
      move: flank || distance > 120 ? [mx / md, mz / md] : [0, 0],
      look: [flank ? Math.atan2(mx, mz) : yaw, 0],
      ...(!flank ? { aim: [enemy.actor.x, enemy.actor.y + 1.5, enemy.actor.z] as [number, number, number] } : {}),
      b: flank ? ['sprint'] : g?.jam ? ['reload'] : ['fire', 'aim'],
      p: p.weapons.slot < 0 ? ['weapon2'] : [],
    });
    if (p.health.hp <= 0 && !p.seat!.data.down) return -1;
  }
  return -1;
}
export function playPrologue(e: Headless): void {
  inspectorOf(e).set('game.move.sprint', 18);
  inspectorOf(e).set('input.sprint', 'hold');
  inspectorOf(e).set('game.god', false);
  if (!walkTo(e, [330, 858], 15, 5000)) throw new Error('Could not leave the barge.');
  e.step(240, { b: ['reload'] });
  e.step(1, { p: ['heal'] });
  e.step(70);
  for (let n = 0; n < 2400 && roundOf(e).step < 4; n += 30) e.step(30);
  if (roundOf(e).step < 4) throw new Error('Buddy did not rescue the player.');
  useKey(e, 'Perpetua', false);
  e.step(1, { p: ['pill'] });
  e.step(80);
  inspectorOf(e).set('game.god', true);
  for (const at of [
    [390, 1155],
    [560, 970],
    [600, 930],
    [610, 865],
    [700, 855],
    [760, 835],
  ] as [number, number][])
    if (!walkTo(e, at, 8, 16000)) throw new Error(`Could not reach town: ${at}`);
  useKey(e, 'Lazare', false);
}
export function playReceipts(e: Headless): void {
  useKey(e, 'Cassius', false);
  for (const at of [
    [805, 850],
    [850, 720],
    [700, 680],
    [620, 580],
    [620, 555],
  ] as [number, number][])
    if (!walkTo(e, at, 7, 16000)) throw new Error(`Could not reach Km-40: ${at}`);
  fight(e, 'km40', 900);
  useKey(e, 'ledger-km40', false);
  for (const at of [
    [665, 570],
    [720, 700],
    [820, 760],
    [820, 835],
  ] as [number, number][])
    if (!walkTo(e, at, 8, 16000)) throw new Error('Could not return the receipts.');
  useKey(e, 'Cassius', false);
  inspectorOf(e).set('game.move.sprint', 6.4);
  inspectorOf(e).set('input.sprint', 'toggle');
}
export function playBot(
  e: Headless,
  choice = 'serve',
  physical = true,
): { state: string; contract: number; coverage: string[] } {
  const d = inspectorOf(e);
  if (physical) {
    playPrologue(e);
    playReceipts(e);
  } else {
    d.actions.run('story', { contract: 2 });
    d.set('game.god', true);
  }
  let previous = '',
    stalled = 0,
    reissued = false;
  for (let n = 0; n < 100; n++) {
    const c = roundOf(e);
    observer?.('story', { contract: c.contract, step: c.step, goal: c.goal });
    const token = `${c.contract}:${c.step}`;
    stalled = token === previous ? stalled + 1 : 0;
    previous = token;
    if (stalled > 5) throw new Error(`Campaign stalled at ${token}: ${c.goal}; flags=${JSON.stringify(c.flags)}`);
    if (c.ending) return { state: 'won', contract: c.contract, coverage: Object.keys(c.coverage) };
    if (c.contract === 3 && c.step === 0 && !reissued) {
      useKey(e, 'armoury-mission');
      reissued = true;
      continue;
    }
    const step = CONTRACTS[c.contract]?.steps[c.step];
    if (!step) break;
    if (step.kind === 'talk') useKey(e, step.key!);
    else if (step.kind === 'at') {
      if (mercOf(e).seat!.data.vehicle >= 0) {
        for (let t = 0; t < 3600; t += 12) {
          const p = mercOf(e),
            dx = step.at![0] - p.actor.x,
            dz = step.at![1] - p.actor.z;
          if (Math.hypot(dx, dz) < (step.radius ?? 30) - 3) break;
          const r = e.get(p.seat!.data.vehicle)!.ride as { data: { yaw: number } };
          const diff = Math.atan2(Math.sin(Math.atan2(dx, dz) - r.data.yaw), Math.cos(Math.atan2(dx, dz) - r.data.yaw));
          e.step(12, { b: ['throttle', ...(Math.abs(diff) > 0.05 ? [diff > 0 ? 'driveLeft' : 'driveRight'] : [])] });
        }
      } else {
        d.actions.run('place', { x: step.at![0], z: step.at![1] + 5 });
        e.step(120);
      }
    } else if (step.kind === 'use') useKey(e, step.key!);
    else if (step.kind === 'delivery') {
      for (let k = 0; k < 3; k++) {
        useKey(e, `quinine-${k}`);
        d.actions.run('place', { x: 330, z: 1147 });
        e.step(1, { p: ['interact'] });
        e.step(2);
      }
    } else if (step.kind === 'burn') {
      const at = step.at!;
      d.actions.run('place', { x: at[0] - 35, z: at[1] + 20 });
      for (let k = -1; k <= 1; k++) {
        e.step(1, { p: ['quickfire'] });
        e.step(30);
        const p = mercOf(e),
          x = at[0] + k * 13,
          z = at[1] - 15,
          yaw = Math.atan2(x - p.actor.x, z - p.actor.z),
          pitch = Math.atan2(3 - p.actor.y - 1.52, Math.hypot(x - p.actor.x, z - p.actor.z));
        e.step(1, { look: [yaw, pitch], aim: [x, 3, z], p: ['fire'] });
        e.step(240);
      }
      e.step(1800);
    } else if (step.kind === 'vehicle') {
      const boat = e
        .entities('ride')
        .map(
          (x) =>
            e.get(x.id) as unknown as {
              id: number;
              ride: { data: { kind: string } };
              sceneProp: { x: number; z: number };
            },
        )
        .find((x) => x.ride.data.kind === 'boat')!;
      d.actions.run('place', { x: boat.sceneProp.x + 1.5, z: boat.sceneProp.z });
      e.step(1, { look: [-1.57, 0], p: ['interact'] });
      e.step(10);
      if (mercOf(e).seat!.data.vehicle < 0) throw new Error('Could not board boat.');
    } else if (step.kind === 'clear') {
      d.actions.run('place', { place: step.key });
      e.step(120);
      fight(e, step.key);
      e.step(3);
    } else if (step.kind === 'flag' && step.key === 'invoiceResolved') {
      const b = roundOf(e).buddies.find((x) => x.fallen > 0);
      if (b) e.step(1, { 'game:command': { kind: 'saveBuddy', key: b.key } });
      else e.step(60);
    } else if (step.kind === 'choice') {
      d.actions.run('give', { stones: 100 });
      if (choice === 'wait') return { state: 'ready', contract: c.contract, coverage: Object.keys(c.coverage) };
      e.step(1, { 'game:command': { kind: 'ending', key: choice } });
    } else e.step(120);
  }
  const c = roundOf(e);
  return { state: c.ending ? 'won' : 'stalled', contract: c.contract, coverage: Object.keys(c.coverage) };
}
