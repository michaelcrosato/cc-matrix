/** @file The walkable retreat: stations, coast paths, discoverable pebbles and creeping plaques. */
import { addTerrainBody, physicsOf, spawnProp, type World } from '../../../engine/sim-api';
import { heightAt, islandGround } from './terrain';
import { spawnGuest } from '../cast/guest';
import type { GameComponents } from './state';
import { registerRetreat } from '../props/retreat';
export function put(w: World<GameComponents>, prop: string, x: number, z: number, y = heightAt(x, z), yaw = 0): number {
  return spawnProp(w, { prop: `prop:${prop}`, at: [x, y, z], yaw });
}
export function buildWorld(w: World<GameComponents>, small = false) {
  registerRetreat(small);
  if (small)
    physicsOf(w).addBody({
      type: 'fixed',
      position: [-52, 7.5, 18],
      colliders: [{ shape: { type: 'box', size: [40, 1, 36] } }],
    });
  else addTerrainBody(physicsOf(w), islandGround());
  put(w, 'pavilion', -52, 18, 8);
  for (let i = 0; i < 4; i++) put(w, i === 0 ? 'matCoral' : 'matMint', -57.4 + i * 3.6, 20, 8.02);
  put(w, 'matMint', -52, 13, 8.02);
  const me = w.settings.get<number>('game.sessionSeat');
  const hero = spawnGuest(
    w,
    -57.4,
    8.2,
    20,
    0,
    false,
    small ? 'build:guest' : undefined,
    small ? `body:seat${me}` : undefined,
  );
  const plumb = small ? -1 : spawnGuest(w, -52, 8.2, 13, 0, true);
  const others = small ? [] : [1, 2, 3].map((seat, n) => spawnGuest(w, -53.8 + n * 3.6, 8.2, 20, seat));
  const tare = put(w, 'tare', -60.5, 22, 8);
  if (small) return { hero, plumb, others, tare };
  put(w, 'sea', 0, 0, 1.8);
  put(w, 'platform', 0, 34, 8.02);
  put(w, 'notice', 8, 35, 8);
  put(w, 'stone', 0, 0, 18.05);
  put(w, 'pavilion', 52, 22, 8, Math.PI / 2);
  for (let i = 0; i < 4; i++) put(w, 'stepRetreat', 47 + i * 3.3, 28, 8.02);
  for (const [x, z] of [
    [62, 52],
    [71, 47],
    [62, 64],
  ])
    put(w, 'hut', x, z);
  put(w, 'lighthouse', 84, -60);
  put(w, 'beacon', 84, -60, heightAt(84, -60) + 14);
  put(w, 'pier', 0, 101, 2.5);
  put(w, 'ferry', 8, 111, 2.1);
  put(w, 'gardenTable', 30, -48, 11);
  put(w, 'board', -60, 85, 2.05);
  put(w, 'rope', -65, 62, 5);
  put(w, 'postRetreat', -65, 42, 3.5);
  put(w, 'postRetreat', -65, 82, 3.5);
  put(w, 'pondSurface', -70, -12, 4.01);
  put(w, 'pier', -70, -12, 4);
  put(w, 'frog', -71.5, -9, 4.25);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    put(w, 'buoy', -57 + Math.cos(a) * 22, 92 + Math.sin(a) * 12, 2.1);
  }
  for (const [x, z] of [
    [-64, 30],
    [-42, 30],
    [10, 42],
    [68, 75],
    [30, -60],
    [-76, -30],
  ]) {
    put(w, 'benchRetreat', x, z);
    put(w, 'parasol', x + 3, z - 2);
  }
  const rng = w.rng('landscape');
  for (let i = 0; i < 90; i++) {
    const a = rng.range(0, Math.PI * 2),
      radius = rng.range(40, 105);
    const x = Math.cos(a) * radius,
      z = Math.sin(a) * radius;
    if ((Math.abs(x + 52) < 15 && Math.abs(z - 18) < 18) || (Math.abs(x - 52) < 18 && Math.abs(z - 22) < 17)) continue;
    if (heightAt(x, z) > 2.2) put(w, i % 3 ? 'shrub' : 'palm', x, z, heightAt(x, z), a);
    if (i % 9 === 0) put(w, 'rock', x + 4, z + 3);
  }
  for (let i = 0; i < 72; i++) {
    const a = (i * Math.PI * 2) / 72,
      x = Math.sin(a) * 78,
      z = Math.cos(a) * 78;
    put(w, 'path', x, z, heightAt(x, z) + 0.06, -a);
  }
  for (let i = 0; i < 20; i++) {
    const a = (i * Math.PI * 2) / 20,
      x = Math.sin(a) * (i % 2 ? 53 : 83),
      z = Math.cos(a) * (i % 2 ? 53 : 83);
    spawnProp(
      w,
      { prop: 'prop:pebble', at: [x, heightAt(x, z) + 0.08, z], yaw: 0 },
      { components: { find: { index: i, x, z } } },
    );
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12,
      x = Math.sin(a) * 67,
      z = Math.cos(a) * 67;
    spawnProp(
      w,
      { prop: 'prop:plaque', at: [x, heightAt(x, z), z], yaw: a },
      { components: { plaque: { index: i, x, z } } },
    );
  }
  for (let i = 0; i < 6; i++) put(w, 'gull', rng.range(-90, 90), rng.range(-70, 70), rng.range(19, 29));
  return { hero, plumb, others, tare };
}
