import { ok, eq, guarded } from '../lib.mjs';
import { Rng } from '../../pixel-engine.js';
import { generateZone, zoneHash } from '../../src/sim/zonegen.js';
import { ZONES } from '../../src/data/zones.js';
import { BIOMES } from '../../src/data/rooms.js';
await guarded(async () => {
  for (const id of Object.keys(ZONES)) {
    let bad = 0;
    for (let s = 1; s <= 200; s++) { const z = generateZone(new Rng(s * 37 + 1), id); if (!z.nav.path([z.entrance.x, 0, z.entrance.z], [z.exit.x, 0, z.exit.z])) bad++; }
    eq(bad, 0, `path entrance to exit for 200 seeds of ${id}`);
  }
  // The same seed builds an identical map no matter what other streams have drawn.
  const a = new Rng(9); const za = zoneHash(generateZone(a, 'ossuary1'));
  const b = new Rng(9); b.fork('loot').next(); b.fork('ai').next(); generateZone(b, 'causeway'); const zb = zoneHash(generateZone(b, 'ossuary1'));
  eq(za, zb, 'zone independent of other streams');
  for (const [k, bi] of Object.entries(BIOMES)) ok(bi.rooms.length >= (k === 'pantry' ? 2 : 8), `biome ${k} has enough templates (${bi.rooms.length})`);
});
