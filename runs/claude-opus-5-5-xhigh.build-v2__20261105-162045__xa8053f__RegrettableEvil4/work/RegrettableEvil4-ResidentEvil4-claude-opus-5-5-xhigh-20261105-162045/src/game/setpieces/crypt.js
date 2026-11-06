// The Dame alone. A trapdoor drops her into the crypt and you play her: 90-120 s, three blind Knights who
// hunt by sound, niches to hide in, floor lamps to throw for a noise, a lever. Two hits and the segment restarts.
import { THREE, buildModel, setLookLayer } from '../../../pixel-engine.js';
import { Player } from '../player.js';
import { app } from '../../core/app.js';
import { Run } from '../../core/run.js';
import { angleDiff } from '../enemy.js';
import { S } from '../../data/dialogue.js';
import { MODELS } from '../../models/index.js';

const WALK = 2.2; const RUN = 3.2;
const HEAR_RUN = 9; const HEAR_WALK = 4;
const flow = [0, 0];

class SoloDame extends Player {
  buildGuns() { this.guns = {}; this.knifeObj = { visible: false }; }
  showGun() {}
  buildTails() { this.tailReady = false; this.scarf = { group: { visible: false } }; this.flap = { group: { visible: false } }; }
  updateTails() {}
  updateMuzzleAndLaser() { this.laserOn = false; this.laser.visible = false; }
  applyAimPose() {}

  stepFree(dt, it) {
    const { area } = this;
    const yaw = area.cam.yaw;
    this.aiming = false;
    this.aimBlend = 0;
    const mag = Math.min(1, Math.hypot(it.moveX, it.moveY));
    const want = mag > 0.05 ? (it.run ? RUN : WALK) : 0;
    const fx = Math.sin(yaw); const fz = Math.cos(yaw);
    const rx = -Math.cos(yaw); const rz = Math.sin(yaw);
    let dirX = 0; let dirZ = 0;
    if (mag > 0.05) { dirX = (rx * it.moveX + fx * it.moveY) / mag; dirZ = (rz * it.moveX + fz * it.moveY) / mag; }
    this.vx = dirX * want; this.vz = dirZ * want;
    this.moveBody(dt, this.vx, this.vz);
    if (want > 0) {
      const a = Math.atan2(this.vx, this.vz);
      this.facing += angleDiff(a, this.facing) * Math.min(1, dt * 10);
    }
    this.noise = want === 0 ? 0 : it.run ? HEAR_RUN : HEAR_WALK;
    if (it.action && area.interact?.use(this)) return;
    if (it.action || it.knife) this.whack();
    if (it.throw || it.command) area.crypt?.throwLamp();
  }

  whack() {
    if ((this.whackCool ?? 0) > 0) return;
    this.whackCool = 8;
    this.ctx.audio.play('caneWhack');
    this.doAction('whack', 0.5, {
      clip: 'DameCane',
      at: [0.17, () => {
        for (const e of this.area.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - this.x, e.z - this.z) < 2.2) { this.ctx.audio.play('metalClang'); e.stunT = 2; }
        }
      }],
    });
  }

  animate() {
    const a = this.actor;
    if (this.state === 'free') {
      const sp = Math.hypot(this.vx, this.vz);
      if (sp > 0.1) a.loco(sp > 2.6 ? 'DameRun' : 'DameWalk', sp, { fade: 0.14 });
      else if (a.baseName !== 'Idle') a.play('Idle', { fade: 0.18 });
    }
  }

  hurt() { return false; }
  frame(dt, alpha) {
    this.whackCool = (this.whackCool ?? 0) - dt;
    super.frame(dt, alpha);
  }
}

export class CryptSegment {
  constructor(area, { X, Z, onDone }) {
    this.area = area;
    this.X = X; this.Z = Z;
    this.onDone = onDone;
    this.hits = 0;
    this.leverDone = false;
    this.finished = false;
    this.lamps = 0;
    this.noiseAt = null;
    this.hidden = false;
    this.max = area.player;
    this.buildDame();
    this.buildKnights();
    this.buildProps();
  }

  buildDame() {
    const { area, X, Z } = this;
    const store = new Run();
    store.maxHealth = 2; store.health = 2;
    const d = new SoloDame(area, area.ctx, { x: X(3), z: Z(12), yaw: Math.PI * 0 + Math.PI / 1, store, modelId: 'dame' });
    this.dameP = d;
    area.players = [d];
    area.player = d;
    this.max.state = 'script';
    this.max.setVisible(false);
    this.max.hiddenByScript = true;
    d.actor.root.scale.setScalar(0.86);
    area.cam.yaw = 0;
    area.cam.pitch = -0.1;
    area.hud.solo = true;
    this.max.laser.visible = false;
  }

  buildKnights() {
    const { area, X, Z } = this;
    const routes = [
      [[3.5, 18], [1.5, 18], [5.5, 18], [3.5, 17]],
      [[2, 23], [5, 23], [2, 24], [5, 24]],
      [[3, 30], [1.5, 30], [5.5, 30], [3, 29]],
    ];
    this.knights = routes.map((route) => {
      const [c, r] = route[0];
      const e = area.spawnEnemy('knight', { x: X(c), z: Z(r), state: 'SCRIPT', noLoot: true });
      e.route = route; e.ri = 0; e.hearT = 0; e.stunT = 0; e.attackT = 0; e.goal = null;
      e.botIgnore = true;
      e.actor.play('KnightWalk');
      e.hp = 99999;
      return e;
    });
  }

  buildProps() {
    const { area, X, Z } = this;
    const { level, interact, ctx } = area;
    this.items = [];
    // Niches.
    for (const [c, r] of level.info.find('h')) {
      this.items.push(interact.add({
        kind: 'niche', x: X(c), z: Z(r), label: 'HIDE', prio: 3, radius: 1.5, facing: false, cryptOnly: true,
        enabled: () => !this.hidden,
        use: () => this.hide(c, r),
      }));
      ctx.lights.request({ position: [X(c), 1.6, Z(r)], color: 0x4040a0, intensity: 1.4, radius: 3 });
    }
    // Floor lamps to throw.
    for (const [c, r] of [[2, 13], [5, 19], [2, 22], [5, 26]]) {
      const b = level.placeAt('path-lantern', c, r, { collide: false });
      const light = ctx.lights.request({ position: [X(c), 0.9, Z(r)], color: 0xffa040, intensity: 4, radius: 5, flicker: 'torch' });
      const it = interact.add({
        kind: 'pick', x: X(c), z: Z(r), label: 'TAKE LAMP', prio: 4, radius: 1.4, facing: false,
        use: () => { this.lamps++; ctx.audio.play('pickup'); b.obj.visible = false; light.release(); interact.remove(it); area.hud.flashText('LAMP: THROW IT FOR A NOISE', 2); area.showHint('THROW', 'throw', 4); },
      });
      this.items.push(it);
    }
    // The lever.
    const lever = level.placeAt('lever', 3, 33, { collide: false });
    this.items.push(interact.add({
      kind: 'lever', x: X(3), z: Z(33), label: 'PULL THE LEVER', prio: 2, radius: 1.7, facing: false,
      enabled: () => !this.leverDone,
      use: (p) => {
        this.leverDone = true;
        p.doAction('hoist', 0.9, { clip: 'DameHoist' });
        ctx.audio.play('stoneGrind');
        ctx.engine.shake.add(0.25);
        const handle = lever.obj.getObjectByName('handle') ?? lever.obj.getObjectByName('Handle');
        if (handle) ctx.tweens.to(handle.rotation, { x: 0.6 }, { duration: 0.5 });
        area.run.giveKey('crypt');
        const door = level.doorAt(7, 30);
        door.locked = false;
        level.openDoor(door, X(6), Z(30));
        area.markDoor(door);
        area.setObjective('THE DOOR TO THE ARCADE IS OPEN');
        area.talk.bark('dame', 'IT WAS LOOSE.', { prio: 3 });
      },
    }));
    area.setObjective('FIND A WAY OUT. THEY HEAR YOU RUN. THEY HEAR YOU WALK');
    area.showHint('WALK SLOWLY. HOLD STILL. THEY ARE BLIND', 'move', 8);
  }

  hide(c, r) {
    const { dameP: d, X, Z } = this;
    this.hidden = true;
    this.hideSpot = [X(c), Z(r)];
    d.teleport(X(c), 0, Z(r));
    d.noise = 0;
    d.state = 'script';
    d.actor.play('DameDuck', { fade: 0.15 });
    this.area.ctx.audio.play('step');
    this.area.showHint('LEAVE THE NICHE', 'action', 6);
  }

  leaveNiche() {
    const { dameP: d, X } = this;
    this.hidden = false;
    d.state = 'free';
    d.teleport(this.hideSpot[0] + (this.hideSpot[0] < X(3) ? 1 : -1), 0, this.hideSpot[1]);
    d.actor.baseName = null;
    this.area.showHint(null);
  }

  throwLamp() {
    if (this.lamps <= 0) return;
    const { dameP: d, area } = this;
    this.lamps--;
    const tx = d.x + Math.sin(area.cam.yaw) * 8; const tz = d.z + Math.cos(area.cam.yaw) * 8;
    area.addProjectile('bottle', [d.x, 1.4, d.z], [tx, 0.1, tz], {
      owner: null, speed: 10,
      onLand: (x, z) => {
        area.ctx.audio.play('glass', area.spatial(x, z, 30));
        area.ctx.particles.burst('ember', [x, 0.2, z]);
        this.makeNoise(x, z, 14);
      },
    });
  }

  makeNoise(x, z, radius) {
    for (const e of this.knights) {
      if (Math.hypot(e.x - x, e.z - z) < radius) { e.goal = [x, z]; e.hearT = 3; }
    }
  }

  step(dt, it) {
    const { dameP: d, area, X, Z } = this;
    if (this.finished) return;
    // Knights: patrol; a noise in range gets investigated; close and heard, they swing.
    for (const e of this.knights) {
      e.stunT = Math.max(0, e.stunT - dt);
      if (e.stunT > 0) { if (e.actor.playing !== 'StunHands') e.actor.play('StunHands', { fade: 0.1 }); continue; }
      const dist = Math.hypot(d.x - e.x, d.z - e.z);
      const heard = !this.hidden && (d.noise ?? 0) > 0 && dist < d.noise;
      if (heard) { e.goal = [d.x, d.z]; e.hearT = 4; }
      if (e.attackT > 0) {
        e.attackT -= dt;
        if (!e.struck && e.attackT < 0.45) {
          e.struck = true;
          area.ctx.audio.play('kickWhoosh', area.spatial(e.x, e.z, 20));
          if (dist < 1.9 && !this.hidden) this.dameHit(e);
        }
        continue;
      }
      if (dist < 1.7 && !this.hidden && heard) {
        e.attackT = 1.15; e.struck = false;
        e.actor.play('HalberdSweep', { once: true, fade: 0.08 });
        continue;
      }
      let tx; let tz; let speed = 0.9;
      if (e.goal) {
        [tx, tz] = e.goal;
        speed = 1.5;
        e.hearT -= dt;
        if (e.hearT <= 0 || Math.hypot(tx - e.x, tz - e.z) < 1) e.goal = null;
      } else {
        const [c, r] = e.route[e.ri];
        tx = X(c); tz = Z(r);
        if (Math.hypot(tx - e.x, tz - e.z) < 0.6) e.ri = (e.ri + 1) % e.route.length;
      }
      const nav = area.level.nav;
      nav.flowTo(tx, tz);
      if (nav.flowDirection(e.x, e.z, flow)) {
        const nx = e.x + flow[0] * speed * dt; const nz = e.z + flow[1] * speed * dt;
        if (nav.walkable(nx, e.z)) e.x = nx;
        if (nav.walkable(e.x, nz)) e.z = nz;
        e.turnToward(Math.atan2(flow[0], flow[1]), dt, 4);
        e.actor.loco('KnightWalk', speed, { fade: 0.2 });
      } else if (e.goal) e.goal = null;
      else e.ri = (e.ri + 1) % e.route.length; // a stop he can't reach: on to the next
    }
    // Out through the door.
    if (this.leverDone && d.x > X(6.3) && Math.abs(d.z - Z(30.5)) < 2) this.finish();
  }

  dameHit(e) {
    const { area, dameP: d } = this;
    if (area.attractMode) return; // the demo is here to show the way to the lever
    this.hits++;
    d.actor.flash(2);
    area.ctx.audio.play('dameHurt');
    area.ctx.engine.shake.add(0.5);
    area.talk.bark('dame', 'DEDUCTED.', { prio: 3 });
    d.store.health = 2 - this.hits;
    if (this.hits >= 2) this.restart();
    else e.stunT = 2;
  }

  /** Back to the start of the crypt. No reload: the segment simply begins again. */
  restart() {
    const { dameP: d, area, X, Z } = this;
    this.hits = 0;
    d.store.health = 2;
    area.ctx.audio.play('sting');
    area.hud.flashText('AGAIN', 1.8);
    area.ctx.engine.screen?.flash?.('white', { duration: 0.2 });
    d.teleport(X(3), 0, Z(12));
    this.hidden = false;
    d.state = 'free';
    // They're somewhere else each time: the second try is never the first.
    for (const e of this.knights) {
      e.ri = area.fx.rng.int(0, e.route.length - 1);
      const [c, r] = e.route[e.ri];
      e.x = X(c); e.z = Z(r); e.goal = null; e.attackT = 0; e.stunT = 0;
    }
  }

  finish() {
    const { area, max, dameP: d } = this;
    this.finished = true;
    for (const it of this.items) area.interact.remove(it);
    for (const e of this.knights) e.dieQuiet();
    area.hud.solo = false;
    area.player = max;
    area.players = [max];
    max.hiddenByScript = false;
    max.setVisible(true);
    max.state = 'free';
    d.setVisible(false);
    d.root.visible = false;
    area.ctx.physics.remove(d.ctrl.collider);
    d.fill?.release();
    area.crypt = null;
    this.onDone?.();
  }
}
export { THREE, buildModel, setLookLayer, app, S, MODELS };
