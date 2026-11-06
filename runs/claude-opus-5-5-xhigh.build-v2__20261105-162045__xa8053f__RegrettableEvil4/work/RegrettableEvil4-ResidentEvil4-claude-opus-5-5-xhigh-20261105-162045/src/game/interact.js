// One context action at a time: the best target within 1.6 m and +-70 degrees of facing.
// Priority: kick/takedown > ladder knock > door > window > push > pick up > talk > telegraph.
import { angleDiff } from './enemy.js';

const FACE = (70 * Math.PI) / 180;

export class Interact {
  constructor(area) {
    this.area = area;
    this.items = [];
    this.current = null;
  }

  add(o) {
    const it = { prio: 5, radius: 1.6, floor: 0, enabled: () => true, facing: true, ...o };
    this.items.push(it);
    return it;
  }
  remove(it) { const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1); }

  update(p) {
    const { area } = this;
    let best = null; let score = Infinity;
    if (!p || !p.alive || p.state !== 'free') { this.current = null; return; }
    // Staggered enemies first.
    for (const e of area.enemies) {
      if (e.dead) continue;
      const kick = e.canKick(); const td = e.canTakedown();
      if (!kick && !td) continue;
      if (Math.abs(e.y - p.y) > 1) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d > (kick ? 2.6 : 2)) continue;
      const a = Math.abs(angleDiff(Math.atan2(e.x - p.x, e.z - p.z), p.facing));
      if (a > FACE * 1.3) continue;
      const s = d + a * 0.5;
      if (s < score) {
        score = s;
        best = { prio: 0, label: kick ? 'KICK' : 'TAKEDOWN', use: () => (kick ? p.startKick(e) : p.startTakedown(e)), enemy: e };
      }
    }
    if (!best && !p.aiming) {
      let bestPrio = 99;
      for (const it of this.items) {
        if (it.floor !== p.floor || !it.enabled(p)) continue;
        const d = Math.hypot(it.x - p.x, it.z - p.z);
        if (d > it.radius) continue;
        if (it.facing) {
          const a = Math.abs(angleDiff(Math.atan2(it.x - p.x, it.z - p.z), p.facing));
          if (a > FACE && d > 0.7) continue;
        }
        const s = d;
        if (it.prio < bestPrio || (it.prio === bestPrio && s < score)) { bestPrio = it.prio; score = s; best = it; }
      }
    }
    this.current = best;
  }

  use(p) {
    const c = this.current;
    if (!c) return false;
    c.use(p);
    this.current = null;
    return true;
  }
}
