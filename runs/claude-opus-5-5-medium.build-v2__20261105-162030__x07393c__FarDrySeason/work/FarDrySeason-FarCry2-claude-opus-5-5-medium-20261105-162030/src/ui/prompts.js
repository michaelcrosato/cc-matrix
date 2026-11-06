// One usable thing at a time: glyph plus verb, sometimes a ring that fills.
import { held, pressedFixed } from '../core/actions.js';
import { CASES as _C, siteById, TRIGS } from '../content/sites.js';
import { HALTS } from '../content/roads.js';
import { NOTES, NOTE_REWARD } from '../content/dialogue.js';
import { WEAPONS } from '../content/weapons.js';
import { angleDiff, dist2 } from '../world/geom.js';
export class Prompt {
  current = null; holdT = 0; flashT = 0; flashText = null; flashAction = null; choice = null; extra = []; scanClock = 0;
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; this.pickups = []; this.missionUse = []; }
  has() { return !!this.current && !this.current.passive; }
  jumpBlocked() { return false; }
  setChoice(c) { this.choice = c; }
  flash(action, text) { this.flashAction = action; this.flashText = text; this.flashT = 1.6; }
  addPickup(p) { this.pickups.push(p); return p; }
  removePickup(p) { const i = this.pickups.indexOf(p); if (i >= 0) this.pickups.splice(i, 1); if (p.object) this.ctx.scene.remove(p.object); }
  clearDynamic() { for (const p of [...this.pickups]) this.removePickup(p); this.missionUse.length = 0; this.current = null; }
  /** All things near enough to use. */
  candidates() {
    const g = this.game, p = g.player, out = [], px = p.x, pz = p.z;
    if (g.net) return g.net.candidates();
    const near = (x, z, r = 2.5) => Math.abs(x - px) < r && Math.abs(z - pz) < r && dist2(x, z, px, pz) < r;
    const add = (o) => out.push(o);
    if (p.vehicle) { // Only what a driver can do.
      for (const u of this.missionUse) if (u.driveIn && near(u.x, u.z, 8)) add(u);
      if (!p.mounted) add({ x: p.vehicle.x, z: p.vehicle.z, y: p.y + 1, label: 'GET OUT', silent: true, action: 'exit', passive: true });
      return out;
    }
    for (const u of this.missionUse) if (near(u.x, u.z, u.r ?? 2.5)) add(u);
    for (const q of this.pickups) if (near(q.x, q.z, 2.5)) add({ ...q, fn: () => q.use() });
    for (const v of g.vehicles.list) {
      if (v.dead || !near(v.x, v.z, 5.5)) continue;
      const [bx, bz] = v.bonnet(), [dx, dz] = v.door();
      if (v.hp < 50 && !v.dead && near(bx, bz, 2)) add({ x: bx, z: bz, y: v.y + 0.6, label: 'OPEN THE BONNET', hold: p.upgrades.vehicle ? 1.5 : 3, fn: () => g.repair(v), holdClip: 'wrench', vehicle: v });
      if (near(dx, dz, 2.2) && !v.aiRoad && !v.stalled) add({ x: dx, z: dz, y: v.y + 1, label: 'GET IN', fn: () => g.vehicles.enter(v) });
      else if (near(dx, dz, 2.2) && v.stalled && v.hp > 0) add({ x: dx, z: dz, y: v.y + 1, label: 'GET IN', fn: () => g.vehicles.enter(v) });
    }
    for (const s of Object.values(g.world.sites)) {
      if (!s.def.usables || dist2(s.def.at[0], s.def.at[1], px, pz) > s.def.r + 8) continue;
      for (const u of s.def.usables) {
        const x = s.def.at[0] + u.at[0], z = s.def.at[1] + u.at[1];
        if (!near(x, z, 3)) continue;
        if (u.needs === 'cleared' && !s.cleared && !g.story.flags[s.id]) continue;
        const o = g.usableFor(u, s); if (o) add({ x, z, y: g.world.land.heightAt(x, z) + 1, ...o });
      }
    }
    for (const n of Object.values(g.people.npcs)) { if (n.hidden || n.gone || n.caged || !near(n.x, n.z, 2.8)) continue; const o = g.talkTo(n.id); if (o) add({ x: n.x, z: n.z, y: n.y + 1.5, ...o }); }
    for (const c of g.world.cases) if (!c.taken && near(c.at[0], c.at[1], 2.6)) add({ x: c.at[0], z: c.at[1], y: g.world.land.heightAt(c.at[0], c.at[1]) + 0.3, label: 'TAKE THE CASE', fn: () => g.takeCase(c) });
    for (const t of TRIGS) if (near(t.at[0], t.at[1], 3)) { if (!g.story.trigs?.[t.id]) add({ x: t.at[0], z: t.at[1], y: t.y + 1.2, label: 'SIGHT THE PILLAR', hold: 1, fn: () => g.useTrig(t) }); }
    for (const h of HALTS) if (near(h.at[0], h.at[1], 4)) add({ x: h.at[0], z: h.at[1], y: g.world.land.heightAt(h.at[0], h.at[1]) + 1, label: g.story.halts?.[h.id] ? 'RIDE THE GOODS LINE' : 'MARK THIS HALT', fn: () => g.useHalt(h) });
    return out;
  }
  fixed(dt) {
    const g = this.game, p = g.player, input = this.ctx.input;
    this.flashT = Math.max(0, this.flashT - dt);
    if (g.ui.top || p.mapUp || !p.canAct()) { this.current = null; this.holdT = 0; return; }
    this.scanClock -= dt;
    if (this.scanClock <= 0) {
      this.scanClock = 0.1;
      const yaw = this.ctx.camera.yaw;
      let best = null, bs = 1e9;
      for (const c of this.candidates()) {
        if (c.passive) { if (!best) { best = c; bs = 1e8; } continue; }
        const a = Math.atan2(-(c.x - p.x), -(c.z - p.z)), off = Math.abs(angleDiff(a, yaw)), d = dist2(c.x, c.z, p.x, p.z);
        if (off > (40 * Math.PI) / 180 && d > 1.1 && !c.anyAngle) continue;
        const score = off * 2 + d * 0.3;
        if (score < bs) { bs = score; best = c; }
      }
      this.current = best;
    }
    const c = this.current;
    if (!c || c.passive) { this.holdT = 0; return; }
    if (c.hold) {
      if (held(input, 'use')) {
        if (this.holdT === 0 && c.holdClip === 'wrench') { g.vm.playTool('Wrench', ['tool-wrench'], { loop: true }); this.toolLoop = true; }
        this.holdT += dt;
        if (c.holdClip === 'wrench' && g.world.stepCount % 20 === 0) { this.ctx.particles.burst('sparks', [c.x, c.y, c.z], { count: 4 }); g.audio.play('wrench'); }
        if (this.holdT >= c.hold) { this.holdT = 0; if (this.toolLoop) { g.vm.endTool(); this.toolLoop = false; } input.clearQueued('PadSquare', 'KeyE'); c.fn(); this.current = null; }
      } else { if (this.holdT > 0 && this.toolLoop) { g.vm.endTool(); this.toolLoop = false; } this.holdT = 0; input.clearQueued('PadSquare', 'KeyE'); }
    } else if (pressedFixed(input, 'use')) { c.fn(); this.current = null; g.audio.play('ui-confirm', { volume: 0.4 }); }
  }
}
export { _C, siteById, NOTES, NOTE_REWARD, WEAPONS };
