// Gameplay part 2: weapons, timeline director, bosses, allies, camera, all-range flight, attract AI, HUD feed.
import { THREE, R, mk, toon, glowMat } from './render.js';
import { Game, inputBlank } from './game.js';
import { FILTER } from './physics.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { settings } from './settings.js';
import * as M from './models.js';
import { clamp, damp, lerp, rr, pick, TAU, angDiff } from './util.js';
import { DEFS, ALLIES, fwd, steer } from './enemies.js';

const V = THREE.Vector3;
const STATIC = new Set(['turret', 'tank', 'tower', 'pillar', 'arch', 'ring', 'gold', 'item_shield', 'item_bomb', 'item_laser']);
const DEF_VS = { scout: 40, drone: 28, gunship: 30, bomber: 14, walker: 30 };
const lerpS = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

Object.assign(Game.prototype, {
  // ================= weapons =================
  aimPoints() {
    const P = this.p, out = this._aim || (this._aim = { near: new V(), far: new V() });
    if (this.mode === 'rail') {
      const ox = P.x + P.aimX * 22, oy = P.y + P.aimY * 14;
      this.railToWorld(P.s + 48, ox, oy, out.near); this.railToWorld(P.s + 125, ox, oy, out.far);
    } else {
      const f = fwd(P.yaw, P.pitch, new V());
      out.near.copy(P.pos).addScaledVector(f, 50); out.far.copy(P.pos).addScaledVector(f, 140);
    }
    return out;
  },
  assist(origin, dir) {
    if (!settings.aimAssist) return dir;
    let best = null, bd = 0.08;
    for (const e of this.ents) {
      if (e.dead || e.team !== 'enemy' || e.invulnerable) continue;
      const to = e.pos.clone().sub(origin); const dist = to.length(); if (dist < 15 || dist > 480) continue;
      to.divideScalar(dist); const ang = Math.acos(clamp(to.dot(dir), -1, 1));
      if (ang < bd) { bd = ang; best = to; }
    }
    return best ? dir.clone().lerp(best, 0.45).normalize() : dir;
  },
  updateWeapons(dt, inp) {
    const P = this.p; if (!P.alive || this.cleared) { if (!P.alive) return; }
    const aim = this.aimPoints();
    // lasers
    P.fireT -= dt;
    const charging = inp.lock && P.charge > 0.12;
    if (inp.fire && P.fireT <= 0 && !charging) {
      P.fireT = P.laser >= 2 ? 0.085 : 0.115;
      const muzzles = P.laser === 0 ? [[0, -0.1, -3.8]] : [[-3.9, 0.1, -0.6], [3.9, 0.1, -0.6]];
      const dmg = P.laser >= 2 ? 1.5 : 1; const col = P.laser >= 2 ? 0x8aff9a : 0x7cf3ff;
      this.ship.updateMatrixWorld(true);
      for (const mz of muzzles) {
        const origin = this.ship.localToWorld(new V(...mz));
        let dir = aim.far.clone().sub(origin).normalize(); dir = this.assist(origin, dir);
        this.playerBolt(origin, dir, dmg, 330, col);
      }
      this.stats.shots++; audio.sfx(P.laser ? 'laser2' : 'laser', 1 + rr(-0.05, 0.05));
    }
    // lock-on charge
    if (inp.lock) {
      if (P.charge === 0) audio.sfx('charge');
      P.charge = Math.min(1, P.charge + dt / 0.85);
      if (P.charge > 0.2) {
        P.lockT -= dt;
        if (P.lockT <= 0 && P.locks.length < 1 + Math.floor(P.charge * 5.99)) {
          const t = this.findLockTarget(aim.far);
          if (t) { P.locks.push(t); P.lockT = 0.11; audio.sfx('lock', P.locks.length); }
          else P.lockT = 0.06;
        }
      }
      P.locks = P.locks.filter((t) => !t.dead);
    } else if (P.charge > 0) {
      if (P.locks.length) this.launchMissiles(P.locks.slice()); else if (P.charge > 0.9) this.launchMissiles([null]);
      P.charge = 0; P.locks = []; P.lockT = 0;
    }
    // bomb
    if (inp.bomb && P.bombs > 0 && P.bombCd <= 0) { P.bombs--; P.bombCd = 1.8; this.detonateBomb(); }
    else if (inp.bomb && P.bombs <= 0) this.hud.toast('NO BOMBS');
  },
  findLockTarget(far) {
    const P = this.p, cam = R.camera; const rp = far.clone().project(cam);
    let best = null, bd = 0.2;
    for (const e of this.ents) {
      if (e.dead || e.team !== 'enemy' || e.invulnerable || e.shielded || P.locks.includes(e)) continue;
      const w = e.pos.clone(); const dist = w.distanceTo(P.pos); if (dist > 600 || dist < 10) continue;
      const v = w.project(cam); if (v.z > 1 || v.z < -1) continue;
      const toE = e.pos.clone().sub(cam.position).normalize(); if (toE.dot(cam.getWorldDirection(new V())) < 0.2) continue;
      const dd = Math.hypot((v.x - rp.x) * cam.aspect, v.y - rp.y);
      if (dd < bd) { bd = dd; best = e; }
    }
    return best;
  },
  launchMissiles(targets) {
    const P = this.p; this.ship.updateMatrixWorld(true);
    targets.forEach((t, i) => setTimeout(() => {
      if (!this.running || !P.alive) return;
      const side = i % 2 ? 1 : -1; const origin = this.ship.localToWorld(new V(side * 2.6, 0, -0.5));
      const dir = this.aimPoints().far.clone().sub(origin).normalize();
      const mesh = M.buildMissile(); mesh.position.copy(origin); mesh.lookAt(origin.clone().add(dir));
      const m = this.makeEnt({ kind: 'missile', team: 'pbullet', mesh, pos: origin, r: 1.5, filter: FILTER.pbullet, hp: 1, dmg: 8, life: 3.2, homing: !!t, target: t, pierce: false });
      m.vel.copy(dir).multiplyScalar(150);
      if (this.mode === 'rail') m.vel.addScaledVector(this.fr.t, P.speed * P.speedMul); else m.vel.addScaledVector(P.wvel, 0.6);
      this.bullets.push(m); audio.sfx('missile'); input.rumble(0.2, 0.3, 80);
    }, i * 70));
  },
  detonateBomb() {
    const P = this.p; this.stats.bombsUsed++;
    audio.sfx('bomb'); this.fx.shake = 1.1; this.hud.flash('bomb'); input.rumble(1, 1, 500);
    const center = P.pos.clone().addScaledVector(this.mode === 'rail' ? this.fr.t : fwd(P.yaw, P.pitch, new V()), 70);
    this.fx.addShock(center, 220, 0.9, 0xfff0b0); this.fx.addShock(center, 140, 0.6, 0xff9a40);
    for (let i = 0; i < 40; i++) { const v = new V(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize().multiplyScalar(rr(40, 140)); R.particles.emit({ pos: center, vel: v, size: rr(4, 9), size1: 0, life: rr(0.5, 1.2), color: 0xffffff, color1: 0xff7020, drag: 2 }); }
    this.invulnBomb = 0.5; P.invuln = Math.max(P.invuln, 0.6);
    const bodies = this.debris.filter((d) => d.h).map((d) => d.h.body);
    this.phys.impulseRadius(center, 180, 90, bodies);
    for (const e of this.ents.slice()) {
      if (e.dead) continue;
      if (e.team === 'ebullet') { this.fx.spark(e.pos, 2, 0xffffff, 10); this.removeEnt(e); continue; }
      if (e.team !== 'enemy') continue;
      if (e.pos.distanceTo(center) > 230) continue;
      if (e.invulnerable) continue;
      e.shielded && (e.shielded = e.shielded); // shield blocks bombs on boss core
      const dmg = e.kind === 'part' ? 18 : 30;
      this.damageEnt(e, dmg, 'bomb');
    }
    this.hitStop = 0.12;
  },

  // ================= director (rail timeline) =================
  director(dt) {
    if (this.title) return;
    if (this.mode === 'allrange') return this.airDirector(dt);
    const P = this.p;
    for (let i = 0; i < this.evList.length;) {
      const ev = this.evList[i];
      const lead = ev.ev === 'spawn' ? (STATIC.has(ev.kind) ? 820 : 430) : ev.ev === 'boss' ? 300 : 0;
      if (P.s >= ev.s - lead) { this.evList.splice(i, 1); this.runEvent(ev); } else i++;
    }
    // boss defeated sequence
    if (this.bossDefeatT !== undefined) {
      this.bossDefeatT += dt;
      if (this.bossDefeatT > 0.25 && this.boss) { this.bossDefeatT = 0; this.bossChain = (this.bossChain || 0) + 1; this.fx.explosion(this.boss.pos.clone().add(new V(rr(-8, 8), rr(-4, 6), rr(-14, 14))), rr(1.5, 3)); }
    }
    if (this.cleared && !this.clearedEmitted && this.clearT > 6) { this.clearedEmitted = true; this.emit('clear'); }
  },
  runEvent(ev) {
    const P = this.p;
    switch (ev.ev) {
      case 'spawn': this.spawnFromEvent(ev); break;
      case 'comm': this.hud.comm(ev.who, ev.text, 4.6); break;
      case 'hint': if (settings.hints && !this.attract) this.hud.hint(ev.text, ev.keys); break;
      case 'music': audio.playMusic(ev.name); break;
      case 'objective': this.hud.objective(ev.text); break;
      case 'checkpoint':
        this.checkpoint = { s: P.s, score: P.score, kills: P.kills, laser: P.laser, maxHealth: P.maxHealth, bombs: P.bombs };
        this.hud.toast('CHECKPOINT'); P.health = Math.min(P.maxHealth, P.health + 15); break;
      case 'chase': this.startChase(ev); break;
      case 'boss': this.startBoss(ev); break;
    }
  },
  spawnFromEvent(ev) {
    const P = this.p; const k = ev.kind;
    if (k === 'ring' || k === 'gold' || k.startsWith('item_')) { this.spawnPickup(k, ev.s, ev.x, ev.y); return; }
    if (k === 'pillar') {
      const h = ev.h || 50, r = ev.r || 4; const mesh = M.buildPillar(h, r);
      const e = this.makeEnt({ kind: 'pillar', team: 'obst', mesh, filter: FILTER.obst, hp: 1e9, shapes: [{ type: 'cyl', hh: h / 2, r: r * 1.0, oy: h / 2 }], ground: true });
      e.rail = { s: ev.s, x: ev.x, y: 0 }; this.syncRailEnt(e); e.mesh.rotation.set(0, rr(0, 6), 0); return;
    }
    if (k === 'arch') {
      const mesh = M.buildArch(34, 26);
      const e = this.makeEnt({ kind: 'arch', team: 'obst', mesh, filter: FILTER.obst, hp: 1e9, shapes: [{ type: 'box', hx: 7, hy: 3.4, hz: 3.5, oy: 17 }, { type: 'cyl', hh: 15, r: 3.8, ox: -17, oy: -15 }, { type: 'cyl', hh: 15, r: 3.8, ox: 17, oy: -15 }, { type: 'box', hx: 3.6, hy: 3.6, hz: 3.5, ox: -12, oy: 11 }, { type: 'box', hx: 3.6, hy: 3.6, hz: 3.5, ox: 12, oy: 11 }] });
      e.rail = { s: ev.s, x: ev.x, y: ev.y }; this.syncRailEnt(e); return;
    }
    const e = this.spawnEnemy(k, { x: ev.x, y: ev.y, vs: ev.vs ?? DEF_VS[k], s: STATIC.has(k) ? ev.s : P.s + 450 });
    if (k === 'tower') { e.shapes = null; }
    return e;
  },
  startChase(ev) {
    const a = this.allies.find((x) => x.key === ev.ally); if (!a || a.state === 'gone') return;
    a.state = 'chased'; a.chasers = 0;
    for (let i = 0; i < ev.count; i++) {
      const e = this.spawnEnemy('scout', { x: 0, y: 4, vs: 0, s: this.p.s + 140 });
      e.chase = a; e.chaseOff = 22 + i * 11; e.chaseX = (i - 1) * 4; e.fireT = rr(0.5, 1.5); a.chasers++;
      e.onDeath = () => { a.chasers--; if (a.chasers <= 0 && a.state === 'chased') { a.state = 'formation'; this.hud.comm(a.key, pick(['Thanks, Kit! I owe you one!', 'Whew — that was close. Nice shooting!', 'You\'re a lifesaver!']), 3.5); this.addScore(600, null, false); this.hud.toast('WINGMAN SAVED +600'); this.stats.saved = (this.stats.saved || 0) + 1; } };
    }
  },
  makePart(parent, local, hp, r, visual, opts = {}) {
    const e = this.makeEnt({ kind: 'part', team: 'enemy', mesh: null, filter: FILTER.enemy, hp, r, parent, local: local.clone(), visual, score: opts.score ?? 200, shielded: !!opts.shielded, pos: new V() });
    e.def = { ground: false }; e.name = opts.name || 'Weak point';
    e.onDeath = (p) => { if (visual) visual.visible = false; parent.parts.forEach((q) => q); if (opts.onDeath) opts.onDeath(p); const alive = parent.parts.filter((q) => !q.dead && q.kind === 'part' && !q.isCore).length; if (opts.killParent && alive === 0 && !parent.dead) this.killEnt(parent, 'parts'); };
    parent.parts.push(e); parent.mesh.updateMatrixWorld(true); e.pos.copy(e.local).applyMatrix4(parent.mesh.matrixWorld);
    return e;
  },
  setupBomber(e) {
    e.invulnerable = true; e.hold = 165; e.fireT = 2.5; e.fire2 = 1.5; e.noScore = false;
    const P = e.mesh.userData.parts;
    this.makePart(e, P.podL.position, 14, 2.0, P.podL, { killParent: true, name: 'Pod', score: 300 });
    this.makePart(e, P.podR.position, 14, 2.0, P.podR, { killParent: true, name: 'Pod', score: 300 });
    e.bossBar = true;
  },
  setupWalker(e) {
    e.invulnerable = true; e.hold = 150; e.fireT = 2;
    const P = e.mesh.userData.parts;
    const core = this.makePart(e, P.core.position, 46, 2.3, P.core, { name: 'Core', score: 1500, killParent: true });
    core.isCore = false; e.core = core;
    this.hud.toast('WALKER — SHOOT THE CORE');
  },
  setupCarrier(e) {
    e.invulnerable = true; e.hold = 165; e.phaseN = 1; e.fireT = 2; e.t = 0;
    e.mesh.scale.setScalar(1.5); e.baseScale = 1.5;
    const P = e.mesh.userData.parts;
    for (let i = 0; i < 4; i++) this.makePart(e, P['pod' + i].position.clone().add(new V(i % 2 ? 1 : -1, 0, 0)), 34, 3.6, null, { name: 'Gun Pod', score: 400 });
    const core = this.makePart(e, P.core.position, 110, 4.4, P.core, { name: 'Reactor Core', score: 5000, shielded: true,
      onDeath: () => this.bossDefeated() });
    core.isCore = true; e.core = core;
    e.podParts = e.parts.filter((p) => !p.isCore);
    e.pods = e.podParts; e.mesh.userData.shieldMesh = e.mesh.children.find((c) => c.material && c.material.transparent && c.material.opacity < 0.05);
    // pod visuals
    e.podParts.forEach((pp, i) => { pp.visual = P['pod' + i]; const prev = pp.onDeath; pp.onDeath = (q) => { P['pod' + i].visible = false; this.hud.toast('POD DESTROYED'); }; });
  },
  startBoss(ev) {
    const P = this.p;
    this.boss = this.spawnEnemy('carrier', { x: 0, y: 12, s: P.s + 520 }); this.boss.phase = 'in';
    this.bossActive = true; audio.playMusic('boss');
    this.hud.comm('base', 'WARNING — Warden Carrier detected. Destroy the gun pods, then crack the reactor!', 5);
    this.hud.objective('Destroy the Warden Carrier'); audio.sfx('alert');
  },
  bossUpdate(e, dt) {
    const r = e.rail, P = this.p; e.t += dt;
    const d = r.s - P.s;
    if (e.phase === 'in') {
      r.s -= 70 * dt; r.y = 12; if (d <= e.hold) { e.phase = 'fight'; this.hud.bossBar(e.name, 1); this.hud.banner('WARDEN CARRIER', 'Boss Engaged', 2.4); }
    } else {
      const rage = e.core && !e.core.dead && e.core.hp < e.core.maxHp * 0.4;
      r.s = lerpS(r.s, P.s + e.hold + Math.sin(e.t * 0.3) * 18, 1.2, dt);
      r.x = lerpS(r.x, Math.sin(e.t * (rage ? 0.7 : 0.4)) * (rage ? 22 : 12), 1.2, dt);
      r.y = lerpS(r.y, 12 + Math.sin(e.t * 0.7) * 4, 1.2, dt);
      const podsAlive = e.podParts.filter((p) => !p.dead);
      if (podsAlive.length === 0 && e.core.shielded) {
        e.core.shielded = false; this.hud.comm('kit', 'The shield is down — hit the reactor!', 3.6); audio.sfx('alert'); this.fx.shake = 0.8; e.phaseN = 2;
        const sm = e.mesh.userData.shieldMesh; if (sm) sm.visible = false;
      }
      if (rage && e.phaseN < 3) { e.phaseN = 3; this.hud.comm('rook', 'It\'s going critical — keep hammering it!', 3.2); audio.sfx('warn'); }
      e.fireT -= dt;
      if (e.phaseN === 1) {
        if (e.fireT <= 0) { e.fireT = 0.9; const pod = pick(podsAlive); if (pod) this.enemyBolt(pod.pos, 100, 10); }
      } else {
        if (e.fireT <= 0) { e.fireT = rage ? 0.55 : 0.95; for (let i = -1; i <= 1; i++) { const o = e.core.pos.clone(); const dir = this.leadDir(o, 100); dir.x += i * 0.07; dir.normalize(); this.enemyBolt(o, 100, 10, null, dir); } }
        e.ringT = (e.ringT ?? 4) - dt; if (e.ringT <= 0) { e.ringT = rage ? 3 : 5; this.ringBurst(e.core.pos, rage ? 16 : 12, 42, 9); }
        e.dronesT = (e.dronesT ?? 3) - dt; if (e.dronesT <= 0) { e.dronesT = rage ? 6 : 9; for (let i = 0; i < 3; i++) this.spawnEnemy('drone', { x: r.x + (i - 1) * 8, y: 8, s: r.s - 10, vs: 28 }); }
      }
      const sm = e.mesh.userData.shieldMesh; if (sm) { sm.visible = e.core.shielded; sm.material.opacity = e.core.shielded ? 0.25 + Math.sin(e.t * 6) * 0.1 : 0; }
      if (e.core && !e.core.dead) { const c = e.core.visual; if (c) c.scale.setScalar(1 + Math.sin(e.t * (rage ? 14 : 6)) * 0.08); }
    }
  },
  bossDefeated() {
    const b = this.boss; if (!b) return;
    this.cleared = true; this.bossDefeatT = 0; this.slowmo = 2.2; this.clearT = 0;
    this.hud.bossBar(null); this.hud.banner('MISSION COMPLETE', 'Warden Carrier destroyed', 4);
    audio.sfx('bigExplode'); this.fx.explosion(b.pos, 5); this.fx.shake = 1.4; this.p.invuln = 99; input.rumble(1, 1, 900);
    audio.playMusic('victory');
    b.keepAfterDeath = false;
    setTimeout(() => { if (this.boss && this.running) { this.fx.explosion(this.boss.pos, 7); this.boss.dead = true; this.boss.remove = true; for (const p of this.boss.parts) { p.dead = true; p.remove = true; } } }, 3200);
  },

  // ================= allies =================
  updateAllies(dt) {
    const P = this.p;
    this.allies.forEach((a, i) => {
      if (a.state === 'gone') {
        a.goneT += dt;
        if (a.goneT > 4.5) { if (a.h) { this.phys.remove(a.h); a.h = null; } a.mesh.visible = false; return; }
        if (this.mode === 'rail') { a.rail.s += 50 * dt; a.rail.x += (i - 1) * 14 * dt; a.rail.y -= 6 * dt; this.railToWorld(a.rail.s, a.rail.x, a.rail.y, a.pos); this.orientRail(a.mesh, a.rail.s, false); }
        else { a.pos.addScaledVector(a.vel, dt); a.pos.y -= 8 * dt; }
        a.mesh.position.copy(a.pos); a.mesh.rotateZ(a.goneT * 4);
        if (Math.random() < 0.6) this.fx.smoke(a.pos, new V(0, 1, 0), 2.2, 0x201820);
        return;
      }
      a.t += dt; a.anim.update(dt);
      if (this.mode === 'rail') {
        const r = a.rail; const ch = a.state === 'chased';
        const tx = ch ? Math.sin(a.t * 1.8) * 22 : a.off[0] + Math.sin(a.t * 0.6 + i) * 6;
        const ty = ch ? 5 + Math.cos(a.t * 2.2) * 6 : a.off[1] + Math.cos(a.t * 0.7 + i) * 3;
        const ts = P.s + (ch ? 105 : a.off[2] + Math.sin(a.t * 0.4 + i) * 10) + 0;
        const px = r.x; r.x = lerpS(r.x, tx, ch ? 2.5 : 1.4, dt); r.y = lerpS(r.y, ty, 1.5, dt); r.s = lerpS(r.s || ts, ts, 1.6, dt);
        this.railToWorld(r.s, r.x, r.y, a.pos); this.orientRail(a.mesh, r.s, false);
        a.mesh.position.copy(a.pos); a.bank = damp(a.bank || 0, -(r.x - px) / dt * 0.03, 6, dt); a.mesh.rotateZ(a.bank);
        a.fireT -= dt;
        if (a.fireT <= 0 && !this.cleared) {
          a.fireT = rr(0.4, 0.9); let tgt = null, bd = 260;
          for (const e of this.ents) { if (e.dead || e.team !== 'enemy' || e.invulnerable || e.chase === a) continue; const dd = e.pos.distanceTo(a.pos); if (dd < bd && e.pos.clone().sub(a.pos).dot(this.fr.t) > 0) { bd = dd; tgt = e; } }
          if (tgt) { const dir = tgt.pos.clone().sub(a.pos).normalize(); const b = this.playerBolt(a.pos.clone().addScaledVector(dir, 3), dir, 0.55, 280, M.PALETTES[a.info.pal].engine); b.vel.copy(dir).multiplyScalar(280); b.vel.addScaledVector(this.fr.t, P.speed * 0.9); }
        }
      } else this.updateAllyAir(a, dt, i);
    });
  },

  // ================= camera =================
  snapCamera() { this.updateCamera(1 / 60, true); },
  updateCamera(dt, snap) {
    const cam = R.camera, P = this.p; let pos, look;
    const k = snap ? 1 : 1;
    if (this.title) {
      const a = this.time * 0.22 + 0.6; const f = this.fr;
      pos = P.pos.clone().addScaledVector(f.t, -Math.cos(a) * 17).addScaledVector(f.r, Math.sin(a) * 17).addScaledVector(f.u, 4 + Math.sin(this.time * 0.3));
      look = P.pos.clone().addScaledVector(f.t, 6);
      this.camPos.copy(pos); this.camLook.copy(look);
    } else if (this.mode === 'rail') {
      const f = this.fr;
      const s = P.s;
      this.rail.at(s - 16 * (P.boosting ? 1.2 : 1), this.fr2);
      pos = this.fr2.p.clone().addScaledVector(f.r, P.x * 0.62).addScaledVector(f.u, P.y * 0.6 + 5.2);
      const lf = this.railToWorld(s + 38, P.x * 0.35, P.y * 0.35 + 1.5, new V());
      this.camPos.lerp(pos, snap ? 1 : 1 - Math.exp(-14 * dt)); this.camLook.lerp(lf, snap ? 1 : 1 - Math.exp(-10 * dt));
    } else {
      const f = fwd(P.yaw, P.pitch * 0.6, new V());
      pos = P.pos.clone().addScaledVector(f, -(P.boosting ? 20 : 16.5)); pos.y += 5.2;
      look = P.pos.clone().addScaledVector(fwd(P.yaw, P.pitch, new V()), 45);
      this.camPos.lerp(pos, snap ? 1 : 1 - Math.exp(-7 * dt)); this.camLook.lerp(look, snap ? 1 : 1 - Math.exp(-9 * dt));
    }
    cam.position.copy(this.camPos);
    if (this.fx.shake > 0 && settings.shake > 0) { const s = this.fx.shake * settings.shake * 1.1; cam.position.add(new V(rr(-s, s), rr(-s, s), rr(-s, s))); }
    cam.up.set(0, 1, 0); cam.lookAt(this.camLook);
    const roll = this.mode === 'rail' ? -P.vx * 0.004 : -(P.bankAir || 0) * 0.15;
    cam.rotateZ(roll);
    this.fovT = this.fovT || 64;
    cam.fov = damp(cam.fov, this.title ? 58 : this.fovT, 4, dt); cam.updateProjectionMatrix();
  },

  // ================= HUD feed =================
  updateHud(dt, inp) {
    const P = this.p, h = this.hud, cam = R.camera;
    if (this.title) return;
    h.set({ health: P.health, maxHealth: P.maxHealth, bombs: P.bombs, score: P.score, kills: P.kills, boost: P.boost, boostLock: P.boostLock, laser: P.laser, combo: P.combo, charge: P.charge });
    const al = this.allies.map((a) => ({ name: a.info.name, color: a.info.color, hp: Math.max(0, a.hp), state: a.state }));
    h.setAllies(al);
    const aim = this.aimPoints();
    const near = aim.near.clone().project(cam), far = aim.far.clone().project(cam);
    h.reticle(near, far, P.charge, P.alive);
    // lock markers
    const marks = [];
    if (P.charge > 0.05) for (const t of P.locks) if (!t.dead) { const v = t.pos.clone().project(cam); if (v.z < 1) marks.push({ x: v.x, y: v.y, id: t.id || 0 }); }
    h.locks(marks);
    // boss bar
    if (this.boss && !this.boss.dead && this.boss.phase === 'fight') {
      const b = this.boss; let hp = 0, mx = 0; for (const p of b.parts) { if (!p.dead) hp += p.hp; mx += p.maxHp; } h.bossBar(b.name, hp / mx);
    }
    // enemy tail warning in all-range
    if (this.mode === 'allrange') {
      let warn = false; const f = fwd(P.yaw, P.pitch, new V());
      for (const e of this.ents) if (!e.dead && e.team === 'enemy' && e.kind !== 'part') { const to = e.pos.clone().sub(P.pos); const d = to.length(); if (d < 90 && to.normalize().dot(f) < -0.4) { warn = true; break; } }
      h.tail(warn);
      h.radar(P, this.ents.filter((e) => !e.dead && e.team === 'enemy' && e.kind !== 'part'), this.allies.filter((a) => a.state !== 'gone'), this.stage.arenaR);
      const left = this.ents.filter((e) => !e.dead && e.team === 'enemy' && e.kind !== 'part').length;
      h.objectiveCount(left);
    }
    // arena warning
    if (this.mode === 'allrange') { const hd = Math.hypot(P.pos.x, P.pos.z); h.arena(hd > this.stage.arenaR - 40); }
    if (this.mode === 'rail') h.progress(clamp(P.s / (this.stage.bossS || 7300), 0, 1));
  },

  // ================= all-range mode =================
  initAir() {
    const P = this.p; P.pos.set(0, 30, 260); P.yaw = 0; P.pitch = 0; P.speed = this.stage.speed; P.wvel.set(0, 0, -70);
    this.waveI = -1; this.waveDelay = 2.5; this.airDone = false;
    this.camPos.copy(P.pos).add(new V(0, 6, 16)); this.camLook.copy(P.pos);
    this.fr.t.set(0, 0, -1); this.fr.r.set(1, 0, 0); this.fr.u.set(0, 1, 0);
  },
  airDirector(dt) {
    const alive = this.ents.filter((e) => !e.dead && e.team === 'enemy' && e.kind !== 'part').length;
    if (this.airDone) { if (this.cleared && !this.clearedEmitted && this.clearT > 6) { this.clearedEmitted = true; this.emit('clear'); } return; }
    if (alive === 0 && this.p.alive) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        this.waveI++;
        const w = this.stage.waves[this.waveI];
        if (!w) { this.airClear(); return; }
        this.waveDelay = 3;
        this.hud.banner(w.text.split(' — ')[0].toUpperCase(), w.text.split(' — ')[1] || '', 2.6);
        this.hud.comm(w.comm[0], w.comm[1], 4.6);
        if (this.waveI === 2) { audio.playMusic('boss'); this.hud.objective('Take down the Jackal Leader'); }
        else this.hud.objective(w.text.split(' — ')[1]);
        for (const [kind, n] of w.spawn) for (let i = 0; i < n; i++) {
          const a = rr(0, TAU) + i * 0.7, d = rr(260, 380);
          let kd = kind; if (kind === 'ace' && i === 2) kd = 'leader';
          const e = this.spawnEnemy(kd, { pos: new V(Math.cos(a) * d, rr(5, 80), Math.sin(a) * d), yaw: a + Math.PI });
          if (Math.random() < 0.3 && kd !== 'leader') e.targetAlly = pick(this.allies);
          if (kd === 'leader') { e.name = 'Jackal Leader'; this.leaderEnt = e; }
        }
        audio.sfx('alert');
      }
    } else this.waveDelay = 2.5;
    // leader bar
    if (this.leaderEnt && !this.leaderEnt.dead) this.hud.bossBar(this.leaderEnt.name, this.leaderEnt.hp / this.leaderEnt.maxHp); else if (this.waveI === 2) this.hud.bossBar(null);
  },
  airClear() {
    this.airDone = true; this.cleared = true; this.clearT = 0; this.p.invuln = 99; this.hud.bossBar(null);
    this.hud.banner('MISSION COMPLETE', 'The Silver Jackals are routed', 4); audio.playMusic('victory');
  },
  updateAirPlayer(dt, inp) {
    const P = this.p; const base = this.stage.speed;
    P.boosting = inp.boost && P.boost > 0 && !P.boostLock && !inp.brake && P.alive;
    P.braking = inp.brake && !P.boosting && P.alive;
    if (P.boosting) { P.boost = Math.max(0, P.boost - 30 * dt); if (P.boost <= 0) P.boostLock = true; if (!this._boostSfx) { audio.sfx('boost'); this._boostSfx = true; } }
    else { this._boostSfx = false; P.boost = Math.min(100, P.boost + 15 * dt); if (P.boostLock && P.boost > 30) P.boostLock = false; }
    const want = P.boosting ? 1.8 : P.braking ? 0.5 : 1;
    P.speedMul = damp(P.speedMul, want, 3, dt); P.speed = base;
    P.rollCd -= dt; if (P.rollT > 0) P.rollT -= dt;
    if ((inp.rollL || inp.rollR) && P.rollCd <= 0 && P.alive) {
      P.rollT = 0.62; P.rollCd = 0.85; this.anim.play(inp.rollL ? M.CLIPS.rollL : M.CLIPS.rollR, { restart: true, layer: 'roll' }); audio.sfx('roll');
    }
    const tr = (P.braking ? 1.45 : P.boosting ? 0.75 : 1) * (inp.tiltL || inp.tiltR ? 1.2 : 1);
    let yawRate = 0;
    if (P.uturnT > 0) { P.uturnT -= dt; yawRate = Math.PI / 1.05; }
    else if (inp.uturn && P.alive) { P.uturnT = 1.05; this.anim.play(M.CLIPS.uturn, { restart: true, layer: 'turn' }); audio.sfx('uturn'); P.invuln = Math.max(P.invuln, 0.3); }
    else yawRate = -inp.mx * 1.9 * tr;
    if (P.somerT > 0) { P.somerT -= dt; } else if (inp.somer && P.alive) { P.somerT = 0.9; this.anim.play(M.CLIPS.somer, { restart: true, layer: 'turn' }); audio.sfx('uturn'); P.invuln = Math.max(P.invuln, 0.9); }
    P.yaw += yawRate * dt;
    P.pitch = clamp(P.pitch + inp.my * 1.55 * tr * dt, -1.25, 1.25);
    const f = fwd(P.yaw, P.pitch, new V());
    P.wvel.copy(f).multiplyScalar(P.speed * P.speedMul);
    P.pos.addScaledVector(P.wvel, dt);
    const Rr = this.stage.arenaR, hd = Math.hypot(P.pos.x, P.pos.z);
    if (hd > Rr) { P.outT = (P.outT || 0) + dt; if (P.outT > 3) { const toC = Math.atan2(P.pos.x, P.pos.z); P.yaw = lerp(P.yaw, P.yaw + angDiff(P.yaw, toC), dt * 3); } if (hd > Rr + 120) { P.pos.x *= (Rr + 120) / hd; P.pos.z *= (Rr + 120) / hd; } } else P.outT = 0;
    if (P.pos.y < -88) { P.pos.y = -88; P.pitch = Math.max(P.pitch, 0.1); }
    if (P.pos.y > 170) { P.pos.y = 170; P.pitch = Math.min(P.pitch, -0.1); }
    this.shipRoot.position.copy(P.pos); this.shipRoot.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    P.bankAir = damp(P.bankAir || 0, yawRate * 0.55, 8, dt);
    this.shipBank.rotation.set(0, 0, P.bankAir + (inp.tiltL ? -0.9 : inp.tiltR ? 0.9 : 0));
    this.anim.update(dt);
    this.shipRoot.visible = P.alive && !(P.invuln > 0 && P.invuln < 0.8 && !this.attract && Math.floor(this.time * 18) % 2 === 0);
    this.shipEngine(dt); this.fovT = P.boosting ? 78 : P.braking ? 58 : 66;
    if (P.rollT <= 0 && !this.anim.isPlaying('roll') && !this.anim.isPlaying('turn')) { const b = this.ship.userData.parts.body; b.rotation.z = 0; b.rotation.x = 0; }
    this.fr.t.copy(f);
  },
  syncAirEnt(e) {
    e.mesh.position.copy(e.pos);
    e.mesh.rotation.set(e.pitch || 0, e.yaw || 0, 0, 'YXZ'); e.mesh.rotateZ(e.roll || 0);
  },
  updateAllyAir(a, dt, i) {
    const P = this.p;
    let tgt = null, bd = 450;
    for (const e of this.ents) { if (e.dead || e.team !== 'enemy' || e.invulnerable) continue; const d = e.pos.distanceTo(a.pos); if (d < bd) { bd = d; tgt = e; } }
    let dir;
    if (tgt) dir = tgt.pos.clone().sub(a.pos).normalize(); else dir = P.pos.clone().add(new V(Math.sin(a.t * 0.4 + i) * 60, 10 + i * 6, Math.cos(a.t * 0.4 + i) * 60)).sub(a.pos).normalize();
    steer(a, dir, 1.8, dt);
    const sp = tgt ? 88 : 70; const f = fwd(a.yaw, a.pitch, new V()); a.vel.copy(f).multiplyScalar(sp); a.pos.addScaledVector(a.vel, dt);
    const R2 = this.stage.arenaR, hd = Math.hypot(a.pos.x, a.pos.z); if (hd > R2) { a.pos.x *= R2 / hd; a.pos.z *= R2 / hd; }
    a.pos.y = clamp(a.pos.y, -80, 150);
    a.mesh.position.copy(a.pos); a.mesh.rotation.set(a.pitch, a.yaw, 0, 'YXZ'); a.mesh.rotateZ(-(a.yawRate || 0) / dt * 0.3);
    a.fireT -= dt;
    if (tgt && a.fireT <= 0 && f.dot(dir) > 0.97 && bd < 220) { a.fireT = rr(0.15, 0.4); const b = this.playerBolt(a.pos.clone().addScaledVector(f, 4), f, 0.5, 300, M.PALETTES[a.info.pal].engine); }
    // allies occasionally get hit by enemy fire (handled via bullets); allies slowly regen when idle
    a.hp = Math.min(a.maxHp, a.hp + dt * 0.5);
  },

  // ================= attract mode AI =================
  aiInput(dt) {
    const P = this.p, s = inputBlank(); this.aiT = (this.aiT || 0) + dt; P.invuln = 99; P.health = P.maxHealth; if (P.bombs < 2) P.bombs = 3;
    s.fire = true; s.firePressed = false;
    let best = null, bd = 1e9;
    for (const e of this.ents) {
      if (e.dead || e.team !== 'enemy' || e.invulnerable) continue;
      if (this.mode === 'rail') { const d = e.rail ? e.rail.s - P.s : 1e9; if (d > 15 && d < 280 && d < bd) { bd = d; best = e; } }
      else { const d = e.pos.distanceTo(P.pos); if (d < bd) { bd = d; best = e; } }
    }
    if (this.mode === 'rail') {
      let tx = 0, ty = 5;
      if (best) { const f = this.fr; const rel = best.pos.clone().sub(f.p); tx = rel.dot(f.r); ty = rel.dot(f.u); }
      else { tx = Math.sin(this.aiT * 0.7) * 14; ty = 5 + Math.sin(this.aiT * 1.1) * 5; }
      // dodge obstacles: look for pillar/arch ahead
      for (const e of this.ents) if (!e.dead && e.team === 'obst' && e.rail) { const d = e.rail.s - P.s; if (d > 5 && d < 120 && Math.abs(e.rail.x - P.x) < 9 && e.kind === 'pillar') tx = e.rail.x + (e.rail.x > P.x ? -13 : 13); if (d > 5 && d < 140 && e.kind === 'arch') { tx = e.rail.x; ty = 3; } }
      s.mx = clamp((tx - P.x) * 0.35, -1, 1); s.my = clamp((ty - P.y) * 0.35, -1, 1);
      // lock-on cycles
      s.lock = (this.aiT % 4) < 1.3; s.fire = !s.lock;
      let bulletsNear = 0; for (const b of this.bullets) if (!b.dead && b.team === 'ebullet' && b.pos.distanceTo(P.pos) < 24) bulletsNear++;
      if (bulletsNear > 1 && P.rollCd <= 0) { s.rollL = Math.random() < 0.5; s.rollR = !s.rollL; }
      let near = 0; for (const e of this.ents) if (!e.dead && e.team === 'enemy' && e.pos.distanceTo(P.pos) < 140) near++;
      if (near >= 5 && P.bombCd <= 0 && Math.random() < 0.03) s.bomb = true;
      s.boost = best && bd > 200 && P.boost > 50 && !this.bossActive;
    } else {
      if (best) {
        const to = best.pos.clone().sub(P.pos); const dist = to.length(); to.normalize();
        const ty = Math.atan2(-to.x, -to.z), tp = Math.asin(clamp(to.y, -1, 1));
        s.mx = -clamp(angDiff(P.yaw, ty) * 2.4, -1, 1); s.my = clamp((tp - P.pitch) * 2.4, -1, 1);
        if (Math.abs(angDiff(P.yaw, ty)) > 2.4 && P.uturnT <= 0 && Math.random() < 0.05) s.uturn = true;
        s.lock = (this.aiT % 5) < 1.4; s.fire = !s.lock;
        if (dist < 25 && P.rollCd <= 0 && Math.random() < 0.05) { s.rollL = true; }
      }
    }
    return s;
  },
  attractCheck(dt) {
    this.attractT = (this.attractT || 0) + dt;
    const limit = this.mode === 'rail' ? 80 : 55;
    if (this.attractT > limit || (this.cleared && this.clearT > 4)) { this.attractT = 0; this.emit('attractNext'); }
  },
});
