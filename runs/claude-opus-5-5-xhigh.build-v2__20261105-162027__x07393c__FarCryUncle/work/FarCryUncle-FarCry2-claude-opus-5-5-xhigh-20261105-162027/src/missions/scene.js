// Scenes: holding the camera on someone, the fall and the wake, the rescue, Harrow's table, the ending.
import { THREE, Timeline, toonMaterial, setLookLayer, PALETTE } from '../../pixel-engine.js';
import { SITES } from '../content/sites.js';
import { LINES } from '../content/dialogue.js';
import { clamp, lerp, wrapAngle } from '../core/rng.js';
const { Mesh, PlaneGeometry } = THREE;
export class SceneDirector {
  active = false; locksMove = false; face = null; timeline = null; bars = 0; custom = null;
  constructor(game) { this.game = game; }
  /** The camera holds on the speaker; the world goes on. */
  faceAt(target) { this.face = target; this.locksMove = !!target; }
  update(ctx, dt) {
    const g = this.game, rig = ctx.camera;
    if (this.face && !this.custom) {
      const eye = g.player.eye;
      const [x, y, z] = typeof this.face === 'function' ? this.face() : this.face;
      const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z;
      const wantYaw = Math.atan2(-dx, -dz), wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
      const k = 1 - Math.exp(-dt * 5);
      rig.yaw += wrapAngle(wantYaw - rig.yaw) * k;
      rig.pitch += (wantPitch - rig.pitch) * k;
    }
    if (this.custom) {
      this.custom.t += dt;
      const done = this.custom.step(this.custom.t, dt);
      if (done) { const f = this.custom.onEnd; this.custom = null; this.active = false; this.locksMove = false; g.cam.override = null; f?.(); }
    }
    this.bars = lerp(this.bars, this.active ? 1 : 0, 1 - Math.exp(-dt * 6));
  }
  /** Frame-driven scene with its own camera: step(t, dt) returns true when finished. */
  play(step, onEnd) {
    this.custom = { t: 0, step, onEnd };
    this.active = true; this.locksMove = true;
  }
  stop() { this.custom = null; this.active = false; this.locksMove = false; this.face = null; this.game.cam.override = null; }
  /** Dragged backward in first person: low camera, sky, their boots, their gunfire, while they swear at you. */
  playRescue(buddy, done) {
    const g = this.game, ctx = g.ctx;
    const f = g.player.feet.clone();
    const yaw = g.player.yaw;
    const bx = -Math.sin(yaw), bz = -Math.cos(yaw);
    if (g.player.seat) g.driving.eject();
    g.map.raise(false);
    g.vm.setVisible(false);
    g.events.emit('rescue-start', buddy);
    const wasActive = buddy.active;
    const hp = wasActive ? buddy.hp : 200;
    if (!wasActive) buddy.spawn(ctx, f.x + bx * 1.6, f.z + bz * 1.6, { hp, following: false });
    buddy.fireProof = true;
    buddy.goal = null;
    const line = g.dialogue.pick(`${buddy.id}.rescue`) ?? 'GET UP.';
    g.say(buddy.id, line, 3.4); g.voice.say(buddy.id, line);
    g.sky?.fog && (ctx.engine.shake.add(0.3));
    const dragDist = 7;
    const dur = 4.4;
    const r = g.rng.fx;
    let shotT = 0.4;
    g.body.hp = 1;
    this.play((t, dt) => {
      const k = clamp(t / dur, 0, 1);
      const px = f.x + bx * dragDist * k, pz = f.z + bz * dragDist * k;
      const y = g.world.heightAt(px, pz) + 0.32 + Math.sin(t * 7) * 0.04;
      // You look back along the way you came, tilted to the sky; they walk backward above you.
      if (buddy.view) {
        const ax = px + bx * 1.1, az = pz + bz * 1.1, ay = g.world.heightAt(ax, az);
        buddy.cc.teleport([ax, ay + 0.1, az]);
        buddy.x = ax; buddy.z = az; buddy.y = ay;
        buddy.yaw = Math.atan2(bx, bz) + Math.PI;
        buddy.view.anim.set('DragBackward', 'DragBackward', 0.1);
        buddy.moveWanted = 0;
        buddy.scripted = true;
      }
      g.cam.override = { position: [px, y, pz], target: [px + bx * 1.6 + Math.sin(t * 3) * 0.1, y + 1.1, pz + bz * 1.6] };
      shotT -= dt;
      if (shotT <= 0) {
        shotT = r.range(0.3, 0.9);
        g.sfx.play('gun-tractor', { volume: 0.5 });
        const e = g.player.eye;
        g.fx.tracer(px + bx * 1, y + 1.1, pz + bz * 1, px - bx * 30 + r.range(-8, 8), y + r.range(0, 4), pz - bz * 30 + r.range(-8, 8));
      }
      return t >= dur;
    }, () => {
      const nx = f.x + bx * dragDist, nz = f.z + bz * dragDist;
      g.player.teleport(nx, nz);
      g.player.setYaw(yaw + Math.PI, 0);
      g.vm.setVisible(true);
      buddy.scripted = false; buddy.fireProof = false;
      if (!wasActive) { g.after(6, () => { if (buddy.active && !buddy.isDown && !g.missions.altBuddyNow) buddy.despawn(); }); }
      done();
    });
  }
}
export class Ending {
  sceneStep = 0; finished = false;
  constructor(game) { this.game = game; }
  /** Sit at the table: Harrow, the lamp, your contract map. */
  harrowScene(n) {
    const g = this.game, site = SITES.observatory, ctx = g.ctx;
    const [sx, sz] = site.at;
    const lamp = (g.world.byTag.get('table-lamp') ?? [])[0];
    if (lamp?.build.light && !this.lampLight) this.lampLight = ctx.lights.request({ position: [sx + 0.6, g.world.heightAt(sx, sz) + 1.2, sz + 1.2], color: 0xffd9a0, intensity: 12, radius: 12, flicker: 'torch', name: 'harrow lamp' });
    if (n) n.play('WriteAtDesk');
    g.vm.setVisible(false);
    this.sceneStep = 0;
    const y = g.world.heightAt(sx, sz);
    const eye = [sx, y + 1.25, sz + 3.3];
    this.tableY = y + 0.87;
    this.shot = { from: eye, at: [sx, y + 1.2, sz], t: 0 };
    g.player.frozen = true;
    this.laid = false;
    g.scene.play((t) => {
      if (t > 1) this.sceneStep = 1;
      const c = this.shot;
      const k = this.laid ? clamp((t - this.laidAt) / 2.5, 0, 1) : 0;
      const pos = [lerp(c.from[0], sx, k), lerp(c.from[1], y + 2.1, k), lerp(c.from[2], sz + 1.6, k)];
      const tgt = [lerp(c.at[0], sx - 0.05, k), lerp(c.at[1], this.tableY, k), lerp(c.at[2], sz + 1.22, k)];
      g.cam.override = { position: pos, target: tgt };
      this.t = t;
      return this.endScene;
    }, () => {
      g.player.frozen = false;
      g.vm.setVisible(true);
      if (this.lampLight) { this.lampLight.release(); this.lampLight = null; }
      if (this.tableMap) { ctx.scene.remove(this.tableMap); this.tableMap = null; }
      g.map.glowScar = false;
      g.vm.showGun(g.weapons.gun?.id ?? 'cane', false);
    });
  }
  layMap() {
    const g = this.game, ctx = g.ctx, site = SITES.observatory;
    g.map.glowScar = true;
    g.map.redraw();
    const m = new Mesh(new PlaneGeometry(1.1, 0.825), g.map.mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(site.at[0] - 0.05, this.tableY + 0.015, site.at[1] + 1.22);
    setLookLayer(m, 'actors');
    ctx.scene.add(m);
    this.tableMap = m;
    this.laid = true; this.laidAt = this.t ?? 0;
    g.sfx.play('map-paper');
    g.events.emit('scars-glow');
  }
  shootHarrow() {
    const g = this.game, n = g.npcs.byWho.harrow;
    g.sfx.play('gun-m38');
    g.ctx.engine.shake.add(0.3);
    g.rumble(0.8, 0.2);
    if (n?.view) n.view.anim.set('Death');
    g.story.flags.harrowDead = true;
    g.ctx.particles.burst('blood', n ? n.head() : [0, 0, 0], { count: 18 });
  }
  endHarrowScene() { this.endScene = true; }
  finish(sheet) {
    const g = this.game;
    if (this.finished) return;
    this.finished = true;
    g.story.ending = sheet;
    g.story.flags.finished = true;
    g.missions.done.add('end');
    g.events.emit('ending', sheet);
    g.endingMusic = true;
    g.music.force('end', g.realT);
    g.ui.openEnding(sheet);
    g.save.write('ending');
  }
}
