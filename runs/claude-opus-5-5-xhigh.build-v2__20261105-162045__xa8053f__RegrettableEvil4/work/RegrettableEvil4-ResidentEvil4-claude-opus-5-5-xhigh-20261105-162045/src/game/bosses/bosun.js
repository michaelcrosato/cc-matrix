// The Bosun: 4 m tall, three brine sacs on his back. 25% damage from the front, 100% on the sacs.
// The crane is the way to win: the Dame is in the cab, press Command when he's under the pallet.
import { buildModel, PALETTE, setLookLayer, SpringChain, THREE, toonMaterial } from '../../../pixel-engine.js';
import { TUNING } from '../../data/tuning.js';
import { Enemy, angleDiff } from '../enemy.js';
import { ENEMIES } from '../../data/enemies.js';
import { app } from '../../core/app.js';
import { MODELS } from '../../models/index.js';

const chainAt = new THREE.Vector3();

const { Vector3 } = THREE;
const v = new Vector3();
const flow = [0, 0];

ENEMIES.bosun = { name: 'THE BOSUN', hp: 540, speed: [1.4, 1.4], damage: 45, reach: 7, windup: 1, loco: 'BosunDrag', models: [['bosun']], prop: [], mute: true, big: 2.6, ragdoll: false, boss: true };

const SAC_NAMES = ['sacA', 'sacB', 'sacC'];
const SAC_OFFSET = [[-0.15, 1.06, -0.2], [0.15, 1.06, -0.2], [0, 0.82, -0.2]];
const SAC_PLACE = [[-0.15, 0.44, -0.2], [0.15, 0.44, -0.2], [0, 0.2, -0.2]];

export class Bosun extends Enemy {
  constructor(area, o) {
    super(area, 'bosun', { ...o, state: 'SCRIPT' });
    this.isBoss = true;
    this.noLoot = true;
    this.sacs = SAC_NAMES.map((name, i) => {
      const hp = 180 * TUNING.enemyHp;
      const s = { name, hp, hpMax: hp, alive: true, pos: new Vector3(), i };
      s.obj = this.actor.attach('Torso', 'bosun-sac', { at: SAC_PLACE[i] });
      setLookLayer(s.obj, 'actors');
      s.dull = s.obj.getObjectByName('dull'); s.lit = s.obj.getObjectByName('lit'); s.torn = s.obj.getObjectByName('torn');
      s.sh = { active: true, pos: s.pos, radius: 0.62, solid: true, label: 'sac', onHit: (h) => this.hitSac(s, h) };
      area.shootables.push(s.sh);
      return s;
    });
    this.actor.attach('HandR', 'w-anchor', { at: [0, -0.1, 0], rot: [Math.PI / 2, 0, 0] });
    this.buildChain(area);
    this.speedMul = 1;
    this.attackCool = 2.5;
    this.phase = 1;
    this.staggerT = 0;
    this.waveT = 40;
    this.hideT = 0;
    this.actor.play('BosunRoar');
    this.setSacs();
    this.sacGlow = area.ctx.lights.request({ position: [this.x, 2, this.z], color: 0x90f060, intensity: 0, radius: 7, priority: 4 });
    // A harpoon through his chain, while he's down, holds him there longer.
    this.chainPos = new Vector3();
    this.chainSh = { active: false, pos: this.chainPos, radius: 0.7, solid: true, label: 'chain', onHit: (h) => this.harpoonChain(h) };
    area.shootables.push(this.chainSh);
    this.buildHaul(area);
  }

  // A boss ignores most of what stops a man.
  knockdown() {}
  blind() {}
  kicked(dmg) { this.bodyDamage(dmg * 0.25); }
  blast(dmg) {
    this.bodyDamage(dmg * 0.4);
    this.stagger(4);
  }
  canKick() { return false; }
  canTakedown() { return false; }
  isDown() { return this.state === 'KNEEL'; }
  walkToSea() {}
  dieQuiet() {}

  hit(h) {
    if (this.dead) return { killed: false };
    this.area.fx.sparks(h.point);
    this.area.ctx.audio.play('armorSpark', this.area.spatial(this.x, this.z, 40));
    this.bodyDamage(h.damage * 0.25);
    this.actor.flash(1);
    return { killed: this.dead };
  }

  /** The sacs glow when they're exposed: when he's on his knees. A burst one is a torn flap. */
  setSacs() {
    const exposed = this.state === 'KNEEL';
    for (const s of this.sacs) {
      s.dull.visible = s.alive && !exposed;
      s.lit.visible = s.alive && exposed;
      s.torn.visible = !s.alive;
    }
  }

  harpoonChain(h) {
    const { area } = this;
    if (h.weapon !== 'harpoon' || this.state !== 'KNEEL') return;
    this.kneeT += 3;
    area.ctx.audio.play('metalClang', area.spatial(this.x, this.z, 40));
    area.fx.sparks(this.chainPos);
    area.hud?.flashText('THE CHAIN HOLDS HIM', 1.6);
  }

  hitSac(s, h) {
    if (!s.alive || this.dead) return;
    const mul = this.state === 'KNEEL' ? 2 : 1;
    s.hp -= h.damage * mul;
    this.actor.flash(1);
    this.area.ctx.audio.play('bodyHit', this.area.spatial(this.x, this.z, 40));
    this.area.ctx.particles.burst('brine', s.pos, { count: 6 });
    if (s.hp <= 0) this.burstSac(s);
    this.area.bossBar = { name: 'THE BOSUN', frac: this.bossFrac() };
  }

  bossFrac() { return this.sacs.reduce((n, s) => n + Math.max(0, s.hp), 0) / this.sacs.reduce((n, s) => n + s.hpMax, 0); }

  bodyDamage(d) {
    const live = this.sacs.filter((s) => s.alive);
    if (!live.length) return;
    const s = live.reduce((a, b) => (a.hp < b.hp ? a : b));
    s.hp -= d;
    if (s.hp <= 0) this.burstSac(s);
    this.area.bossBar = { name: 'THE BOSUN', frac: this.bossFrac() };
  }

  burstSac(s) {
    const { area } = this;
    s.alive = false;
    s.hp = 0;
    s.sh.active = false;
    const { ctx } = area;
    ctx.audio.play('brineBarrel', area.spatial(this.x, this.z, 60));
    ctx.particles.burst('brine', s.pos, { count: 40, speed: 1.6 });
    ctx.engine.shake.add(0.5);
    ctx.audio.play('bellow');
    this.speedMul *= 1.15;
    this.phase = 4 - this.sacs.filter((k) => k.alive).length;
    if (this.phase === 2) area.hud?.flashText('HE IS CALLING FOR HELP', 2);
    if (this.phase === 3) { area.world.setRain(1100, 1.1); area.hud?.flashText('HE IS FURIOUS', 2); }
    if (this.sacs.every((k) => !k.alive)) this.death();
  }

  death() {
    const { area } = this;
    const { ctx } = area;
    this.dead = true;
    this.corpse = false;
    this.removeBody();
    this.releaseToken();
    ctx.engine.hitstop(0.25);
    ctx.engine.shake.add(1);
    area.player.invuln = 5;
    if (!ctx.engine.manual) ctx.engine.screen.shockwave([this.x, 1, this.z], { radius: 0.5 });
    ctx.audio.play('stomp'); ctx.audio.play('craneDrop');
    ctx.particles.burst('smokeBig', [this.x, 0.5, this.z], { count: 30 });
    this.actor.play('Death', { once: true, rate: 0.6 });
    area.bossBar = null;
    this.chainSh.active = false;
    this.endHaul();
    this.sacGlow.intensity = 0;
    area.run.giveTreasure('blackPearl');
    area.run.money += 2000;
    area.hud?.flashText('BLACK PEARL  +2000', 3);
    area.bosunDead = true;
    for (const e of area.enemies) if (!e.dead && e !== this) e.damageRaw(999);
    area.addDelayed(1.4, () => { area.talk.bark('commodore', '...HE ONLY HAD THE ONE.', { prio: 3 }); ctx.audio.play('tannoyOn'); });
  }

  devKill() { for (const s of this.sacs) if (s.alive) this.burstSac(s); }

  stagger(t) { if (this.state !== 'KNEEL') { this.staggerT = Math.max(this.staggerT, t); this.releaseToken(); this.state = 'STAGGER'; this.stateT = 0; this.actor.play('Hurt', { fade: 0.1, rate: 0.5 }); } }

  /** Pallet on him. */
  dropHit() {
    const { area } = this;
    this.state = 'KNEEL'; this.stateT = 0;
    this.kneeT = 8;
    this.releaseToken();
    this.actor.play('BosunKneel', { once: true });
    area.ctx.audio.play('bellow');
    area.hud?.flashText('SHOOT THE SACS', 2.2);
    area.showHint(area.player.weapon?.id === 'harpoon' ? 'HE IS DOWN. A HARPOON THROUGH THE CHAIN HOLDS HIM' : 'HE IS DOWN. THE SACS TAKE DOUBLE.', 'fire', 5);
  }

  // ---- Fixed step ----
  step(dt) {
    if (this.dead) return;
    const { area, d } = this;
    this.stateT += dt;
    this.px = this.x; this.pz = this.z;
    const T = area.player;
    const dist = T ? Math.hypot(T.x - this.x, T.z - this.z) : 99;
    this.dist = dist;
    this.target = T;
    this.attackCool -= dt;
    if (app.dev.freezeAi) { this.commit(); return; }
    if (this.phase >= 2 && this.state !== 'SCRIPT') {
      this.waveT -= dt;
      if (this.waveT <= 0) { this.waveT = 40 * area.run.waveInterval; area.director.queueSpawn('gaffer', 4, area.level.spawnDoors['1'] ? '1' : [this.x, this.z], { every: 0.6 }); }
    }
    this.stepHaul(dt);
    this.chainSh.active = this.state === 'KNEEL' && T?.weapon?.id === 'harpoon';
    // Hiding behind a stack for 4 s: he throws it.
    this.checkHiding(dt, T);
    switch (this.state) {
      case 'SCRIPT': break;
      case 'WALK': this.stepWalk(dt, T, dist); break;
      case 'SWEEP': this.stepSweep(dt, T, dist); break;
      case 'THROW': this.stepThrow(dt, T); break;
      case 'STOMP': this.stepStomp(dt, T, dist); break;
      case 'GRABB': this.stepGrabb(dt, T, dist); break;
      case 'KNEEL':
        this.kneeT -= dt;
        area.gauge = { label: 'THE BOSUN IS DOWN', frac: Math.min(1, this.kneeT / 8), color: 'lime' };
        if (this.kneeT <= 0) { this.state = 'WALK'; this.stateT = 0; area.gauge = null; this.actor.play('BosunRoar', { once: true }); area.ctx.audio.play('bellow'); this.attackCool = 2; }
        break;
      case 'STAGGER':
        if (this.stateT > this.staggerT) { this.state = 'WALK'; this.stateT = 0; this.attackCool = 1; }
        break;
      default: break;
    }
    if (this.body) this.commit();
  }

  stepWalk(dt, T, dist) {
    const { area } = this;
    const nav = area.navByKey('player');
    nav.flowTo(T.x, T.z);
    const speed = 1.4 * this.speedMul * TUNING.enemySpeed;
    if (dist > 2.6 && nav.flowDirection(this.x, this.z, flow)) {
      this.x += flow[0] * speed * dt; this.z += flow[1] * speed * dt;
      this.turnToward(Math.atan2(flow[0], flow[1]), dt, 2.5);
      if (this.actor.playing !== 'BosunDrag') this.actor.play('BosunDrag', { fade: 0.25 });
      this.actor.channels.lower.action.timeScale = speed / 1.4;
      this.dragT -= dt;
      if (this.dragT <= 0) { this.dragT = 0.5; area.ctx.audio.play('anchorDrag', area.spatial(this.x, this.z, 30)); area.ctx.particles.burst('spark', [this.x + 1, 0.1, this.z], { count: 2 }); }
    } else {
      this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, 2.5);
      if (this.actor.playing !== 'Idle') this.actor.play('Idle', { fade: 0.2 });
    }
    if (this.attackCool <= 0) {
      if (dist < 3 && area.ctx.random.chance(0.4)) this.startGrab();
      else if (dist < 3) this.startStomp();
      else if (dist < 7) this.startSweep();
      else if (dist < 18 && area.ctx.random.chance(0.35)) this.startThrow();
      else this.attackCool = 1.2;
    }
  }

  startSweep() { this.state = 'SWEEP'; this.stateT = 0; this.sweepsLeft = this.phase >= 3 ? 2 : 1; this.swung = false; this.actor.play('BosunSweep', { once: true, rate: 0.9 }); this.area.ctx.audio.play('chain', this.area.spatial(this.x, this.z, 40)); }
  stepSweep(dt, T, dist) {
    const { area } = this;
    this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, this.stateT < 0.6 ? 3 : 0.5);
    if (!this.swung && this.stateT > 1.0) {
      this.swung = true;
      const a = Math.abs(angleDiff(Math.atan2(T.x - this.x, T.z - this.z), this.yaw));
      const inArc = dist < 7 && a < 1.3;
      area.ctx.audio.play('kickWhoosh', { volume: 0.9, pitch: -6 });
      area.ctx.engine.shake.add(0.25);
      if (inArc && T.state === 'free') {
        area.qte.press({ key: 'dodge', label: 'DODGE', onOk: () => { T.doAction('dodge', 0.45, { clip: 'Roll', invuln: 0.7 }); }, onFail: () => T.hurt(45, this, { knock: true }) });
      }
    }
    if (this.stateT > 1.45) {
      this.sweepsLeft--;
      if (this.sweepsLeft > 0) { this.stateT = 0; this.swung = false; this.actor.play('BosunSweep', { once: true }); }
      else { this.state = 'WALK'; this.stateT = 0; this.attackCool = 3 / this.speedMul; }
    }
  }

  startThrow() { this.state = 'THROW'; this.stateT = 0; this.thrown = false; this.inFlight = false; this.actor.play('BosunThrow', { once: true }); this.area.ctx.audio.play('chain', this.area.spatial(this.x, this.z, 40)); }
  stepThrow(dt, T) {
    const { area } = this;
    this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, 2);
    if (!this.thrown && this.stateT > 1.2) {
      this.thrown = true;
      this.inFlight = true;
      area.addProjectile('anchor', [this.x, 4, this.z], [T.x, 0.1, T.z], {
        owner: this, speed: 14,
        onLand: (x, z) => {
          this.inFlight = false;
          if (this.dead) return;
          area.ctx.audio.play('stomp', area.spatial(x, z, 40));
          area.ctx.engine.shake.add(0.5);
          area.ctx.particles.burst('dust', [x, 0.2, z], { count: 20 });
          if (Math.hypot(T.x - x, T.z - z) < 2) T.hurt(40, { x, z }, { knock: true });
          for (const c of area.level.crates) if (!c.broken && Math.hypot(c.x - x, c.z - z) < 2.5) area.breakCrate(c);
          this.haul = { x, z, x0: x, z0: z, t: 0 };
          this.haulObj.visible = true; this.haulLine.visible = true;
          area.ctx.audio.play('chain', area.spatial(x, z, 40));
        },
      });
    }
    // He stands and hauls it in. That's your opening.
    if (this.thrown && !this.inFlight && !this.haul) { this.state = 'WALK'; this.stateT = 0; this.attackCool = 3 / this.speedMul; }
  }

  /** The thrown anchor, lying where it fell, and the chain that drags it back over 2 s. */
  buildHaul(area) {
    const b = buildModel('w-anchor', { catalog: MODELS });
    this.haulObj = b.object;
    this.haulObj.scale.setScalar(1.4);
    this.haulObj.visible = false;
    this.haulLine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 1), toonMaterial(PALETTE.night));
    this.haulLine.visible = false;
    setLookLayer(this.haulObj, 'actors'); setLookLayer(this.haulLine, 'actors');
    area.ctx.scene.add(this.haulObj, this.haulLine);
  }

  stepHaul(dt) {
    const H = this.haul;
    if (!H) return;
    H.t += dt;
    const k = Math.min(1, H.t / 2);
    H.x = H.x0 + (this.x - H.x0) * k; H.z = H.z0 + (this.z - H.z0) * k;
    if (k >= 1) this.endHaul();
  }

  endHaul() {
    this.haul = null;
    this.haulObj.visible = false; this.haulLine.visible = false;
  }

  startStomp() { this.state = 'STOMP'; this.stateT = 0; this.stomped = false; this.actor.play('BosunStomp', { once: true }); }
  stepStomp(dt, T) {
    const { area } = this;
    if (!this.stomped && this.stateT > 0.6) {
      this.stomped = true;
      area.ctx.audio.play('stomp', area.spatial(this.x, this.z, 40));
      area.ctx.engine.shake.add(0.55);
      area.ctx.particles.burst('dust', [this.x, 0.2, this.z], { count: 24, speed: 1.6 });
      if (Math.hypot(T.x - this.x, T.z - this.z) < 3) T.hurt(25, this, { knock: true });
      for (const e of area.enemies) if (e !== this && !e.dead && Math.hypot(e.x - this.x, e.z - this.z) < 3) e.knockdown(v.set(e.x - this.x, 0, e.z - this.z).normalize());
    }
    if (this.stateT > 1.05) { this.state = 'WALK'; this.stateT = 0; this.attackCool = 1.8 / this.speedMul; }
  }

  startGrab() { this.state = 'GRABB'; this.stateT = 0; this.grabbed = false; this.actor.play('Slam', { once: true, rate: 0.6 }); }
  stepGrabb(dt, T, dist) {
    const { area } = this;
    this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, 3);
    if (!this.grabbed && this.stateT > 0.7) {
      this.grabbed = true;
      if (dist < 3 && T.state === 'free') {
        T.state = 'script';
        area.qte.mash({
          key: 'action', label: 'BREAK FREE', time: 2.8,
          onOk: () => { T.state = 'free'; T.invuln = 1.2; area.ctx.audio.play('kickImpact'); },
          onFail: () => { T.state = 'free'; T.hurt(60, this, { knock: true }); },
        });
      }
    }
    if (this.stateT > 1.4) { this.state = 'WALK'; this.stateT = 0; this.attackCool = 2.6 / this.speedMul; }
  }

  checkHiding(dt, T) {
    const { area } = this;
    if (this.state !== 'WALK') { this.hideT = 0; return; }
    const hidden = !area.level.nav.lineOfSight(this.x, this.z, T.x, T.z);
    this.hideT = hidden ? this.hideT + dt : 0;
    if (this.hideT > 4) {
      this.hideT = 0;
      // He throws the stack you're behind: the cover goes.
      area.onCoverThrown?.(T);
      this.startThrow();
    }
  }

  /** The anchor chain, hanging off his fist and swinging with him. */
  buildChain(area) {
    const length = 0.32;
    this.anchorChain = new SpringChain({ segments: 5, length, rest: [0, -1, 0.1], stiffness: 5, gravity: 9 });
    this.chainGroup = new THREE.Group();
    setLookLayer(this.chainGroup, 'actors');
    this.chainLinks = [];
    for (let i = 0; i < 5; i++) {
      const link = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, length * 1.05), toonMaterial(PALETTE.night));
      link.castShadow = true;
      this.chainGroup.add(link);
      this.chainLinks.push(link);
    }
    area.ctx.scene.add(this.chainGroup);
  }

  updateChain(dt) {
    const hand = this.actor.joints.HandR;
    hand.updateWorldMatrix(true, false);
    hand.getWorldPosition(chainAt);
    const f = this.yaw;
    const basis = [[-Math.cos(f), 0, Math.sin(f)], [0, 1, 0], [Math.sin(f), 0, Math.cos(f)]];
    const root = [chainAt.x, chainAt.y, chainAt.z];
    if (!this.chainReady) { this.chainReady = true; this.anchorChain.reset(root, basis); }
    this.anchorChain.update(Math.min(dt, 1 / 30), root, basis);
    const pts = this.anchorChain.points;
    this.chainLinks.forEach((link, i) => {
      const a = pts[i]; const b = pts[i + 1];
      link.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      chainAt.set(b[0], b[1], b[2]);
      link.lookAt(chainAt);
    });
  }

  frame(dt, alpha) {
    this.syncModel(alpha);
    const { actor } = this;
    actor.update(dt);
    if (this.dead) { this.chainGroup.visible = false; return; }
    this.updateChain(dt);
    this.setSacs();
    this.frameHaul();
    this.updateZones();
    this.area.bossBar = this.area.bossBar ?? { name: 'THE BOSUN', frac: this.bossFrac() };
    // Sac positions, on his back, in world space.
    const t = actor.joints.Torso;
    t.updateWorldMatrix(true, false);
    for (const s of this.sacs) {
      const o = SAC_OFFSET[s.i];
      v.set(o[0], o[1] - 0.6, o[2] - 0.1);
      s.pos.copy(t.localToWorld(v.clone()));
      s.sh.radius = this.state === 'KNEEL' ? 0.95 : 0.62;
      if (this.state === 'KNEEL') s.pos.y += 0.5;
    }
    this.sacGlow.position.set(this.x, 2, this.z);
    this.sacGlow.intensity = this.state === 'KNEEL' ? 12 : 0;
    const mid = this.anchorChain.points[3];
    this.chainPos.set(mid[0], mid[1], mid[2]);
  }

  frameHaul() {
    const H = this.haul;
    if (!H) return;
    this.haulObj.position.set(H.x, 0.15, H.z);
    const hand = this.actor.joints.HandR;
    hand.getWorldPosition(chainAt);
    const line = this.haulLine;
    const len = Math.hypot(chainAt.x - H.x, chainAt.y - 0.2, chainAt.z - H.z);
    line.position.set((chainAt.x + H.x) / 2, (chainAt.y + 0.2) / 2, (chainAt.z + H.z) / 2);
    line.scale.z = Math.max(0.1, len);
    line.lookAt(chainAt);
  }

  aimPoint(zone, out) {
    const s = this.sacs.find((k) => k.alive);
    return out.copy(s ? s.pos : this.zones.torso.a);
  }
}
