// One context prompt. Priority: Kick/Takedown > ladder knock > door > window > push > pick up > talk > telegraph.
import { THREE } from '../../pixel-engine.js';
export class Interact {
  constructor(area) { this.area = area; this.items = []; this.best = null; this.bestEnemy = null; }
  add(it) { it.priority ??= 5; it.radius ??= 1.6; it.floor ??= 0; this.items.push(it); return it; }
  remove(it) { const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1); }
  /** Picks the best target for a player. Fills this.best with {verb, act} */
  pick(P) {
    const A = this.area; let best = null, bs = -1e9; const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    // Enemies first.
    for (const e of P.dameMode ? [] : A.enemies) {
      if (e.dead || e.floor !== P.floor) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (e.latched && e.target === P) { const s = 1000; if (s > bs) { bs = s; best = { verb: 'KICK OFF', act: () => { e.die({}); A.ctx.audio.play('kickhit'); P.limpets = Math.max(0, (P.limpets ?? 1)); return true; }, enemy: e }; } continue; }
      const front = d < 0.01 ? 1 : (dx * fx + dz * fz) / d;
      if (e.kickable() && d < 2.6 && front > 0.05) { const s = 900 - d; if (s > bs) { bs = s; best = { verb: 'KICK', kind: 'kick', enemy: e, act: () => this.doKick(P, e, 'kick') }; } }
      else if (e.takedownable() && d < 2.0 && front > 0.05) { const s = 880 - d; if (s > bs) { bs = s; best = { verb: 'TAKEDOWN', kind: 'takedown', enemy: e, act: () => this.doKick(P, e, 'takedown') }; } }
    }
    for (const it of this.items) {
      if (it.disabled || (it.when && !it.when())) continue; if ((it.floor ?? 0) !== P.floor) continue;
      const dx = it.x - P.pos.x, dz = it.z - P.pos.z, d = Math.hypot(dx, dz); if (d > it.radius) continue;
      const front = d < 0.3 ? 1 : (dx * fx + dz * fz) / d; if (front < 0.34 && !it.any) continue; // +-70 degrees
      const s = it.priority * 100 - d; if (s > bs) { bs = s; best = it; }
    }
    this.best = best; return best;
  }
  fire(P) { const b = this.pick(P); if (!b) return false; return b.act(P) !== false; }
  doKick(P, e, kind) { P.yaw = Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z); P.invuln = 0.5; P.startAction('kick', kind === 'kick' ? 0.6 : 0.8, { target: e, kind }); this.area.ctx.audio.play('kickwhoosh'); if (kind === 'takedown') P.h.play('HipThrow', { restart: true, fade: 0.05 }); return true; }
}
export function addWindowActions(a) { for (const w of a.level.windows) { if (w.floor) continue; a.interact.add({ x: w.x, z: w.z, radius: 1.25, priority: 7, any: true, verb: 'VAULT', win: w, act: () => { const P = a.player, v = a.level.vaultPath(w, P.pos); a.level.breakWindow(w); P.invuln = 0.8; P.startAction('vault', 0.7, { fx: P.pos.x, fz: P.pos.z, fy: P.pos.y, tx: v.tx, tz: v.tz, ty: P.pos.y, toFloor: P.floor }); return true; } }); } }
export function addDoorActions(a) { for (const d of a.level.doors) { a.interact.add({ x: d.x, z: d.z, radius: 1.9, priority: 8, any: true, door: d, get verb() { return d.lockText && !d.keyOK?.() ? d.lockText : 'KICK OPEN'; }, when: () => !d.open && !d.sealed, act: () => { if (d.keyOK && !d.keyOK()) { a.ctx.audio.play('uideny'); a.say('MAX', d.lockSay ?? 'Locked. Noted.', 2); return true; } a.player.yaw = Math.atan2(d.x - a.player.pos.x, d.z - a.player.pos.z); a.player.startAction('door', 0.42, { door: d }); return true; } }); } }
