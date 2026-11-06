// People who live here, and people who used to. Civilians can't be shot: they flee, and the Ledger counts them.
import { CIV_PALETTES } from '../art/models.js';
import { STRIPS } from '../content/roads.js';
import { siteById, SITES } from '../content/sites.js';
import { dist2, polyLength, polyPoint } from '../world/geom.js';
import { PersonView } from './rig.js';
const NPC_CLIP = { odile: 'SmokeIdle', tibor: 'Shrug', vance: 'CleanRifleIdle', ansa: 'TeachPoint', harrow: 'WriteAtDesk', bakr: 'Idle', ines: 'Idle', dov: 'Idle', mags: 'Idle' };
export class People {
  npcs = {}; civs = []; column = null; refugees = [];
  constructor(game) { this.game = game; }
  build(ctx) {
    this.ctx = ctx; this.rng = ctx.random.fork('people');
    for (const def of SITES) for (const [id, dx, dz, yaw] of def.npcs ?? []) {
      const x = def.at[0] + dx, z = def.at[1] + dz, y = this.game.world.land.heightAt(x, z);
      const view = new PersonView(ctx, id, undefined, { gun: false });
      view.place(x, y, z, (yaw * Math.PI) / 180); view.setFull(NPC_CLIP[id]);
      this.npcs[id] = { id, view, x, y, z, yaw: (yaw * Math.PI) / 180, site: def.id };
    }
    // Friends wait at Mile Forty's bar once you've met them.
    for (const [id, dx, dz] of [['ines', -25, 13], ['dov', -20, 18], ['mags', -19, -38]]) {
      const x = dx, z = 40 + dz, y = this.game.world.land.heightAt(x, z), view = new PersonView(ctx, id, undefined, { gun: false });
      view.place(x, y, z, 2.6); view.setFull('Idle'); view.object.visible = false;
      this.npcs[id] = { id, view, x, y, z, yaw: 2.6, site: 'mile-forty', hidden: true };
    }
    for (const def of SITES) if (def.civilians) for (let i = 0; i < def.civilians; i++) this.spawnCiv(def, i);
  }
  spawnCiv(def, i) {
    const a = this.rng.range(0, 6.28), r = this.rng.range(6, def.r * 0.45), x = def.at[0] + Math.cos(a) * r, z = def.at[1] + Math.sin(a) * r;
    const view = new PersonView(this.ctx, 'civilian', CIV_PALETTES[i % 4], { gun: false });
    view.setLower('Idle'); view.setUpper('Idle');
    const c = { def, view, x, z, y: this.game.world.land.heightAt(x, z), yaw: a, gx: x, gz: z, wait: this.rng.range(0, 5), flee: 0, sp: 0 };
    this.civs.push(c);
  }
  fixed(dt) {
    const g = this.game, p = g.player;
    for (const c of this.civs) {
      const near = dist2(c.x, c.z, p.x, p.z) < 200;
      if (!near) continue;
      if (c.flee > 0) c.flee -= dt;
      if (c.flee <= 0 && g.world.time - (g.lastShotT ?? -99) < 2 && dist2(c.x, c.z, p.x, p.z) < 60 && !g.world.sites[c.def.id].calm) { c.flee = 6; const a = Math.atan2(c.z - p.z, c.x - p.x) + this.rng.range(-0.8, 0.8); c.gx = c.def.at[0] + Math.cos(a) * c.def.r * 0.7; c.gz = c.def.at[1] + Math.sin(a) * c.def.r * 0.7; }
      if (g.world.fire.isBurning(c.x + g.world.wind.x * 8, c.z + g.world.wind.z * 8)) { c.flee = 6; c.gx = c.x - g.world.wind.x * 30; c.gz = c.z - g.world.wind.z * 30; }
      const dx = c.gx - c.x, dz = c.gz - c.z, l = Math.hypot(dx, dz);
      if (l < 0.6) { c.sp = 0; c.wait -= dt; if (c.wait <= 0) { c.wait = this.rng.range(3, 9); const a = this.rng.range(0, 6.28), r = this.rng.range(4, c.def.r * 0.5); c.gx = c.def.at[0] + Math.cos(a) * r; c.gz = c.def.at[1] + Math.sin(a) * r; } }
      else { const sp = c.flee > 0 ? 4.2 : 1.2; c.sp = sp; c.x += (dx / l) * sp * dt; c.z += (dz / l) * sp * dt; c.yaw = Math.atan2(dx, dz); c.y = g.world.land.heightAt(c.x, c.z); }
    }
    if (this.column) {
      const col = this.column; col.s += dt * 1.1;
      for (const w of col.walkers) { const q = polyPoint(col.path, Math.max(0, Math.min(col.L, col.s + w.off))); w.x = q.x + w.side; w.z = q.z; w.yaw = q.yaw; }
    }
    for (const r of this.refugees) { const q = polyPoint(r.path, Math.min(r.L, (r.s += dt * 1.1))); r.x = q.x + r.side; r.z = q.z + r.side * 0.5; r.yaw = q.yaw; }
  }
  /** Three Wells empties. */
  emptyThreeWells() {
    const def = siteById['three-wells'], keep = [];
    for (const c of this.civs) if (c.def === def) { c.view.dispose(); } else keep.push(c);
    this.civs = keep;
    const path = [def.at, [-200, 30], [-100, 35], [-20, 15]], L = polyLength(path);
    for (let i = 0; i < 14; i++) { const view = new PersonView(this.ctx, 'civilian', CIV_PALETTES[i % 4], { gun: false }); view.setLower('Trudge', 1); view.setUpper('Idle'); this.refugees.push({ view, path, L, s: -i * 3, side: (i % 3) - 1, x: def.at[0], z: def.at[1], yaw: 0 }); }
  }
  /** The column walks the scar. */
  startColumn() {
    if (this.column) return;
    const arc = [...STRIPS.A.points, ...STRIPS.C.points.slice(1), ...STRIPS.B.points.slice(1), [-590, -430]], L = polyLength(arc), walkers = [];
    for (let i = 0; i < 18; i++) { const view = new PersonView(this.ctx, 'civilian', CIV_PALETTES[i % 4], { gun: false }); view.setLower('Trudge', 1); view.setUpper('Idle'); walkers.push({ view, off: -i * 3.5, side: ((i * 7) % 5) - 2, x: arc[0][0], z: arc[0][1], yaw: 0 }); }
    this.column = { path: arc, L, s: 60, walkers };
  }
  clearDynamic() {
    if (this.column) { for (const w of this.column.walkers) w.view.dispose(); this.column = null; }
    for (const r of this.refugees) r.view.dispose(); this.refugees = [];
    if (!this.civs.some((c) => c.def.id === 'three-wells')) for (let i = 0; i < siteById['three-wells'].civilians; i++) this.spawnCiv(siteById['three-wells'], i);
  }
  /** Ines sits in the cage at Ranger Post until you open it. */
  showInCage() { const n = this.npcs.ines, s = siteById['ranger-post'].at; n.x = s[0] + 8; n.z = s[1] + 8; n.y = this.game.world.land.heightAt(n.x, n.z); n.caged = true; n.hidden = false; n.view.setFull('Beg'); }
  leaveCage() { const n = this.npcs.ines; n.caged = false; n.hidden = true; n.x = -25; n.z = 53; n.y = this.game.world.land.heightAt(n.x, n.z); n.view.setFull('Idle'); }
  showFriends() { const st = this.game.buddies.state; for (const id of ['ines', 'dov', 'mags']) { const n = this.npcs[id]; if (n.caged) continue; n.hidden = !(st[id].met && st[id].alive) || this.game.buddies.followers.some((f) => f.buddy === id); } }
  update(dt) {
    const g = this.game, cx = g.camX ?? 0, cz = g.camZ ?? 0;
    for (const n of Object.values(this.npcs)) { const near = dist2(n.x, n.z, cx, cz) < 200 && !n.hidden && !n.gone; n.view.object.visible = near; if (near) { n.view.place(n.x, n.y, n.z, n.yaw); n.view.update(dt); } }
    for (const c of this.civs) { const near = dist2(c.x, c.z, cx, cz) < 170; c.view.object.visible = near; if (!near) continue; c.view.place(c.x, c.y, c.z, c.yaw); c.view.setLower(c.sp > 2 ? 'Run' : c.sp > 0 ? 'Walk' : 'Idle', c.sp > 2 ? 1 : 0.6); c.view.update(dt); }
    const walkers = [...(this.column?.walkers ?? []), ...this.refugees];
    for (const w of walkers) { const near = dist2(w.x, w.z, cx, cz) < 300; w.view.object.visible = near; if (near) { w.view.place(w.x, g.world.land.heightAt(w.x, w.z), w.z, w.yaw); w.view.update(dt); } }
  }
}
