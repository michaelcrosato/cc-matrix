// A replay's fingerprint: day, minute, position, beans, debt and collection counts.
import { hash32 } from '../core/rng.js';

export function fingerprintOf(g) {
  const w = g.world;
  if (!w) return 'none';
  const p = g.player;
  const col = Object.keys(w.almanac.fish).length * 1000 + Object.keys(w.almanac.bug).length;
  const s = `${w.clock.day}:${Math.round(w.clock.minute * 10)}:${p ? p.x.toFixed(3) : 0}:${p ? p.z.toFixed(3) : 0}:${w.player.beans}:${w.player.debt}:${col}:${g.mode}`;
  return hash32(s).toString(36);
}
