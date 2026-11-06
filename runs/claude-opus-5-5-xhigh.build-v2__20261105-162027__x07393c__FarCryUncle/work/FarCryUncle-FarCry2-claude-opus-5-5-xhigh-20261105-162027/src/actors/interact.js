// The use scan: within 2.5 m and 25 degrees of the view centre, one prompt. Some are hold-to-use with a ring that fills.
import { THREE } from '../../pixel-engine.js';
import { clamp } from '../core/rng.js';
const { Vector3 } = THREE;
const _f = new Vector3();
export class Interact {
  list = []; current = null; holdT = 0; holding = null;
  constructor(game) { this.game = game; }
  add(u) { this.list.push(u); return u; }
  remove(u) { const i = this.list.indexOf(u); if (i >= 0) this.list.splice(i, 1); if (this.current === u) this.current = null; if (this.holding === u) this.holding = null; }
  clearTagged(tag) { this.list = this.list.filter((u) => u.tag !== tag); }
  scan() {
    const g = this.game;
    const eye = g.player.eye;
    const fwd = g.player.forward(_f);
    let best = null, bs = -1;
    for (const u of this.list) {
      if (u.when && !u.when()) continue;
      let x = u.x, y = u.y, z = u.z;
      if (u.track) { const t = u.track(); x = t[0]; y = t[1]; z = t[2]; u.x = x; u.y = y; u.z = z; }
      if (u.liveAt) { const t = u.liveAt(); x = t[0]; y = t[1]; z = t[2]; u.x = x; u.y = y; u.z = z; }
      const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z, d = Math.hypot(dx, dy, dz);
      const r = u.r ?? 2.5;
      if (d > r) continue;
      const flatD = Math.hypot(dx, dz);
      const cos = d > 0.01 ? (dx * fwd.x + dy * fwd.y + dz * fwd.z) / d : 1;
      const coneOK = u.wide ? (flatD > 0.01 ? (dx * fwd.x + dz * fwd.z) / (flatD * Math.max(0.3, Math.hypot(fwd.x, fwd.z))) : 1) > 0.5 : cos > Math.cos((25 * Math.PI) / 180);
      if (!coneOK && d > 1) continue;
      const score = cos - d * 0.1;
      if (score > bs) { bs = score; best = u; }
    }
    return best;
  }
  fixedUpdate(ctx, dt) {
    const g = this.game, a = g.actions;
    const active = g.canAct() && !g.mapUp;
    const u = active ? this.scan() : null;
    if (u !== this.current) { this.cancelHold(); this.current = u; }
    if (!u) return;
    if (u.onAlt && a.take('alt')) { u.onAlt(); return; }
    if (u.enabled && !u.enabled()) { if (a.take('use')) g.sfx.play('ui-back', { volume: 0.3 }); return; }
    const hold = typeof u.hold === 'function' ? u.hold() : u.hold;
    if (hold) {
      if (a.down('use')) {
        if (this.holding !== u) { this.holding = u; this.holdT = 0; u.onStart?.(); }
        this.holdT += dt;
        u.tick?.(dt, this.holdT / hold);
        if (this.holdT >= hold) { const h = this.holding; this.holding = null; this.holdT = 0; h.onUse(); g.events.emit('used', h); }
      } else this.cancelHold();
      a.take('use');
    } else if (a.take('use')) { u.onUse(); g.events.emit('used', u); }
  }
  cancelHold() { if (this.holding) { this.holding.onCancel?.(); this.holding = null; this.holdT = 0; } }
  /** Fraction of the ring filled. */
  holdFrac() { if (!this.holding) return 0; const hold = typeof this.holding.hold === 'function' ? this.holding.hold() : this.holding.hold; return clamp(this.holdT / hold, 0, 1); }
}
