// Ambience: looped voices steered by where you are and what the sky is doing.
import { spatialize, THREE } from '../engine.js';
import { weatherNow, hourNow } from '../systems/time.js';
import { waterKind } from '../world/tiles.js';

const LOOPS = ['ambRiver', 'ambSurf', 'ambRain', 'ambWind', 'ambCrickets', 'ambBirds', 'ambCity', 'ambNeon', 'ambCrowd'];
export class Ambience {
  constructor(g) { this.g = g; this.v = {}; for (const n of LOOPS) this.v[n] = g.ctx.audio.loop(n, { volume: 0 }); this.t = 0; }
  stopAll() { for (const n of LOOPS) this.v[n].set({ volume: 0 }); }
  update(dt) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.25;
    const g = this.g;
    if (g.sessionEnded) { this.stopAll(); return; }
    const place = g.place;
    const out = place?.kind !== 'room' || !!place?.outdoors;
    const inTown = place === g.town;
    const inCity = place === g.city;
    const k = weatherNow(g);
    const h = hourNow(g.world);
    const night = h >= 20 || h < 5;
    const p = g.player;
    const set = (n, vol, pan = 0) => this.v[n].set({ volume: vol, pan });
    let river = 0;
    if (inTown) {
      // nearest water, sampled on a coarse grid
      let best = 99;
      for (let dz = -8; dz <= 8; dz += 2) for (let dx = -8; dx <= 8; dx += 2) { const w = waterKind(p.x + dx, p.z + dz); if (w && w !== 'sea') best = Math.min(best, Math.hypot(dx, dz)); }
      river = best < 99 ? Math.max(0, 0.16 - best * 0.015) : 0;
    }
    set('ambRiver', river);
    set('ambSurf', inTown ? Math.max(0, Math.min(0.22, (p.z - 38) * 0.012)) : 0);
    const rain = k === 'rain' || k === 'storm';
    set('ambRain', rain ? (out ? 0.26 : 0.06) : 0);
    set('ambWind', k === 'wind' ? (out ? 0.24 : 0.05) : k === 'snow' && out ? 0.08 : 0);
    const season = g.season;
    set('ambCrickets', inTown && night && season !== 3 && !rain ? 0.08 : 0);
    set('ambBirds', inTown && !night && !rain && season !== 3 ? 0.09 : 0);
    set('ambCity', inCity ? 0.1 : 0);
    set('ambNeon', inCity && (night || h >= 18) ? 0.05 : 0);
    set('ambCrowd', inCity ? 0.1 : 0);
  }
}
export const SPATIAL = spatialize;
export const V = THREE.Vector3;
