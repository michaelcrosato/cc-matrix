// Named story people and civilians: posed on the hero rig. Civilians walk between points and flee gunfire and fire.
import { THREE } from '../../pixel-engine.js';
import { PersonView } from './rig.js';
import { NPCS } from '../content/dialogue.js';

const V3 = THREE.Vector3;
export class NpcSystem {
  name = 'npcs';
  list = {}; civs = [];
  setup(g) {
    this.g = g; g.npcs = this; if (g.session) return;
    for (const [id, d] of Object.entries(NPCS)) {
      const site = g.sitesSys.find(d.site); const x = site.x + d.at[0], z = site.z + d.at[1];
      const v = new PersonView(d.model, g.ctx); g.ctx.scene.add(v.object); const y = g.world.heightAt(x, z);
      v.object.position.set(x, y, z); v.full(d.clip, true);
      this.list[id] = { id, name: d.name, view: v, pos: new V3(x, y, z), yaw: 0, clip: d.clip };
    }
    this.makeCivs();
    g.events.on('use', (kind) => {});
  }
  view(id) { return this.list[id] || null; }
  makeCivs() {
    const g = this.g; const rng = g.ctx.random.fork('civs');
    const slots = g.civilianSlots || [];
    // a few in Mile Forty as well
    const mf = g.sitesSys.find('mile-forty'); for (let i = 0; i < 6; i++) slots.push({ site: mf, at: [mf.x + rng.range(-25, 25), mf.z + rng.range(-12, 25)], model: 'civ' + (i % 4), i: 20 + i });
    for (const s of slots) {
      const v = new PersonView(s.model, g.ctx); g.ctx.scene.add(v.object); const y = g.world.heightAt(s.at[0], s.at[1]); v.object.position.set(s.at[0], y, s.at[1]); v.full('Idle', true);
      this.civs.push({ kind: 'civ', alive: true, view: v, pos: new V3(s.at[0], y, s.at[1]), home: s.site, target: null, speed: 0, flee: 0, t: rng.range(0, 5), yaw: 0, rng: rng.fork('c' + s.i), gone: false });
    }
  }
  fixed(g, dt) {
    if (g.session) return;
    const f = g.player.feet;
    for (const c of this.civs) {
      c.t -= dt; const near = Math.hypot(c.pos.x - f.x, c.pos.z - f.z);
      if (c.flee > 0) { c.flee -= dt; const dx = c.pos.x - f.x, dz = c.pos.z - f.z, d = Math.hypot(dx, dz) || 1; this.move(c, dx / d, dz / d, 5.4, dt); }
      else if (c.t <= 0) { c.t = c.rng.range(3, 8); if (c.rng.chance(0.6)) c.target = [c.home.x + c.rng.range(-20, 20), c.home.z + c.rng.range(-20, 20)]; else c.target = null; }
      else if (c.target) { const dx = c.target[0] - c.pos.x, dz = c.target[1] - c.pos.z, d = Math.hypot(dx, dz); if (d < 1) c.target = null; else this.move(c, dx / d, dz / d, 1.6, dt); }
      else c.speed = 0;
      if (g.fire?.grid.burning.length && g.fire.burningAt(c.pos.x + 12, c.pos.z) || g.fire?.burningAt(c.pos.x, c.pos.z + 12)) c.flee = 6;
    }
  }
  move(c, dx, dz, sp, dt) { c.pos.x += dx * sp * dt; c.pos.z += dz * sp * dt; c.pos.y = this.g.world.heightAt(c.pos.x, c.pos.z); c.yaw = Math.atan2(-dx, -dz); c.speed = sp; }
  frame(g, dt) {
    if (g.session) return;
    for (const n of Object.values(this.list)) { n.view.object.rotation.y = n.yaw + Math.PI; n.view.update(dt); }
    for (const c of this.civs) { const v = c.view; v.object.position.copy(c.pos); v.object.rotation.y = c.yaw + Math.PI; v.full(c.speed > 3 ? 'Run' : c.speed > 0.3 ? 'Walk' : 'Idle', true); v.update(dt); }
  }
  /** gunfire frightens the people near it */
  scare(pos, r) { for (const c of this.civs) if (Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z) < r) c.flee = 8; }
}
