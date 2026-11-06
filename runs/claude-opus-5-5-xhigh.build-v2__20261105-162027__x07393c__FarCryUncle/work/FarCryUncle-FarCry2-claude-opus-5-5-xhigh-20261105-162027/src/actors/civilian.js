// Walk between points in Mile Forty and Three Wells; flee on gunfire or fire. Hits are ignored; the Ledger counts displacement, not bodies.
import { THREE } from '../../pixel-engine.js';
import { SITES } from '../content/sites.js';
import { makePerson } from './rig.js';
import { clamp, wrapAngle } from '../core/rng.js';
const { BoxGeometry } = THREE;
const PALETTES = [{ cloth: 'sand', dark: 'red', skin: 'plum', hat: 'white' }, { cloth: 'white', dark: 'slate', skin: 'red', hat: 'orange' }, { cloth: 'orange', dark: 'plum', skin: 'sand', hat: 'red' }, { cloth: 'teal', dark: 'night', skin: 'orange', hat: 'sand' }];
class Civilian {
  kind = 'civilian'; fleeT = 0; goal = null; moveT = 0; hidden = false;
  constructor(sys, home, at, i) { this.sys = sys; this.home = home; this.x = at[0]; this.z = at[1]; this.i = i; this.y = sys.game.world.heightAt(at[0], at[1]); this.yaw = 0; }
  flee(fromX, fromZ) { this.fleeT = 8; const dx = this.x - fromX, dz = this.z - fromZ, l = Math.hypot(dx, dz) || 1; this.goal = { x: this.x + (dx / l) * 40, z: this.z + (dz / l) * 40 }; }
  step(dt) {
    const g = this.sys.game;
    if (this.hidden) return;
    this.fleeT -= dt;
    if (!this.goal && (this.moveT -= dt) <= 0) {
      const r = g.rng.ai, a = r.range(0, 6.28), rr = r.range(4, this.home.r * 0.45);
      this.goal = { x: this.home.at[0] + Math.cos(a) * rr, z: this.home.at[1] + Math.sin(a) * rr };
      this.moveT = r.range(4, 12);
    }
    if (this.goal) {
      const dx = this.goal.x - this.x, dz = this.goal.z - this.z, l = Math.hypot(dx, dz);
      if (l < 0.8) { this.goal = null; this.speed = 0; return; }
      const sp = this.fleeT > 0 ? 5.2 : 1.3;
      this.x += (dx / l) * sp * dt; this.z += (dz / l) * sp * dt;
      this.y = g.world.heightAt(this.x, this.z);
      this.yaw = Math.atan2(dx, dz); this.speed = sp;
      if (!g.world.nav.walkable(this.x, this.z)) { this.goal = null; }
    } else this.speed = 0;
  }
}
export class Civilians {
  list = []; column = null; columnList = []; emptyWells = false;
  constructor(game) { this.game = game; }
  build(ctx) {
    const g = this.game;
    const towns = [[SITES['three-wells'], SITES['three-wells'].civilians], [SITES['mile-forty'], 10]];
    let i = 0;
    for (const [site, n] of towns) {
      for (let k = 0; k < n; k++, i++) {
        const a = (k / n) * 6.28, r = site.r * 0.35;
        this.list.push(new Civilian(this, site, [site.at[0] + Math.cos(a) * r, site.at[1] + Math.sin(a) * r], i));
      }
    }
    if (g.views) {
      for (const c of this.list) {
        const p = makePerson('civilian', PALETTES[c.i % 4]);
        c.view = p; ctx.scene.add(p.object); p.anim.set('Idle', 'Idle');
      }
    }
    for (const c of this.list) {
      const body = ctx.physics.addStaticBox({ position: [c.x, c.y + 0.9, c.z], halfExtents: [0.3, 0.9, 0.3] });
      c.body = body; g.hitMap.set(body.handle, { kind: 'civilian', ref: c });
    }
  }
  reset() { for (const c of this.list) { c.hidden = false; c.fleeT = 0; c.goal = null; if (c.view) c.view.object.visible = true; } this.emptyWells = false; this.columnList = []; this.column = null; }
  heard(x, z, r) { for (const c of this.list) if (!c.hidden && Math.hypot(c.x - x, c.z - z) < r) c.flee(x, z); }
  /** The village empties: a line of people walks the road to the clinic, huts go dark. */
  emptyVillage() {
    this.emptyWells = true;
    for (const c of this.list) if (c.home === SITES['three-wells']) { c.hidden = true; if (c.view) c.view.object.visible = false; }
    this.game.ledger.add('moved', 240);
  }
  showVillage() { this.emptyWells = false; for (const c of this.list) if (c.home === SITES['three-wells']) { c.hidden = false; if (c.view) c.view.object.visible = true; } }
  fixedUpdate(ctx, dt) {
    const g = this.game;
    if (g.round) return;
    const f = g.anchor();
    for (const c of this.list) {
      if (c.hidden || Math.hypot(c.x - f.x, c.z - f.z) > 280) continue;
      c.step(dt);
      if (g.tick % 20 === c.i % 20) {
        if (g.fire.isBurning(c.x, c.z) || g.fireView.nearestDist < 30 && g.fire.isBurning(c.x + 8, c.z)) c.flee(c.x + g.rng.ai.range(-3, 3), c.z + g.rng.ai.range(-3, 3));
      }
      c.body?.setTranslation?.({ x: c.x, y: c.y + 0.9, z: c.z });
    }
  }
  update(ctx, dt) {
    const cam = this.game.camPos;
    for (const c of this.list) {
      if (!c.view || c.hidden) continue;
      if (Math.hypot(c.x - cam.x, c.z - cam.z) > 170) { c.view.object.visible = false; continue; }
      c.view.object.visible = true;
      c.view.object.position.set(c.x, c.y, c.z); c.view.object.rotation.y = c.yaw;
      const d = Math.hypot(c.x - cam.x, c.z - cam.z);
      if (d > 20) c.waved = false;
      else if (d < 9 && !c.waved && c.speed === 0) { c.waved = true; c.view.anim.shot('Wave'); }
      if (c.speed > 0) c.view.anim.set(c.speed > 3 ? 'Run' : 'Walk');
      else c.view.anim.set('Idle', (this.game.time + c.i * 3) % 11 < 2 ? 'IdleLook' : 'Idle');
      c.view.anim.speed(c.speed > 3 ? c.speed / 6.5 : 1);
      c.view.anim.update(dt);
    }
  }
}
