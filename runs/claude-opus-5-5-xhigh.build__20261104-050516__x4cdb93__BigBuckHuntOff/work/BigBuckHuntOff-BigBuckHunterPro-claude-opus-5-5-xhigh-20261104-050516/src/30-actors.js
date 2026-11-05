// 30-actors: the animals and critters in a site: orders along paths on the ground, herds, hearing shots and spooking,
// stopping for a call, wounds and death, escape, and whether a hunter can see them.
let ACTOR_N = 0;
class APath {
  constructor(pts, smooth = true) { this.pts = pts; this.P = new E.Path(pts.map(p => [p.x, p.y, 0]), { smooth: smooth && pts.length > 2 ? 'catmull' : null }); this.len = this.P.length; }
  at(d) { return this.P.at(clamp(d, 0, this.len)); }
}
const GAIT_I = { walk: 0, trot: 1, run: 2, bound: 2, gallop: 2 };
class Actor {
  constructor(H, o) {
    this.H = H; this.id = o.id || ('a' + (++ACTOR_N)); this.n = ACTOR_N; this.o = o;
    this.cat = o.critter ? 'critter' : 'animal';
    this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.speed = 0; this.want = 0; this.heading = o.facing || 0;
    this.state = 'hidden'; this.delay = o.delay || 0; this.orders = (o.orders || []).slice(); this.order = null; this.oT = 0; this.t = 0;
    this.fear = 0; this.panic = false; this.alertT = 0; this.frozenT = 0; this.calls = 0; this.lookAt = null; this.hurtT = 0; this.jumpT = 0; this.jumpLen = .6;
    this.hits = []; this.wounds = 0; this.bagger = null; this.resolved = false; this.escaped = false; this.lost = false; this.entered = false; this.visible = false; this.seenAt = null; this.visT = 0;
    this.side = o.side || 0; this.follow = o.follow || null; this.back = o.back || 0; this.react = o.react || .2;
    this.r = RNG.wrap(E.rng(strHash(this.id + ':' + (H.site ? H.site.id : '')) ^ RNG.run));
    this.path = o.path ? new APath(o.path) : null; this.d = o.d || 0; this.jumps = o.jumps || [];
    this.splash = 0; this.flag = 0; this.deadT = 0; this.deadSide = 1; this.trophy = o.trophy || null;
    if (this.cat === 'animal') {
      const sp = this.sp = reg('species', o.species), [sex, young] = KIND[o.kind] || ['f', false];
      this.kind = o.kind; this.sex = sex; this.young = young; this.target = sex === 'm' && !young; this.protected = !this.target;
      this.points = this.target ? (o.points || 8) : 0;
      this.maxHp = this.hp = sp.hp * (o.trophy ? 1.5 : 1) * (o.hpMul || 1);
      const ant = this.target ? Object.assign(sp.antlers(this.points), { seed: o.seed || this.n * 7 + 3, kicker: o.kicker, drop: o.drop }) : null;
      this.rig = new E.Quadruped({ species: sp.rig, sex, young, antlers: ant, size: o.size || 1, colors: o.colors });
      this.speeds = sp.speeds.map(v => v * M);
      this.temper = sp.temper;
    } else {
      const C = this.def = reg('critter', o.critter); this.kind = o.critter; this.target = !C.protected; this.protected = !!C.protected;
      this.rig = C.rig(); this.maxHp = this.hp = .1; this.speeds = [C.speed * .4, C.speed * .7, C.speed].map(v => v * M); this.temper = .2; this.bird = !!C.bird;
      this.beh = o.behavior || C.behavior; this.bz = o.z || 0;
    }
    this.label = this.cat === 'animal' ? this.sp.names[this.young ? 'y' : this.sex] : this.def.label.toUpperCase();
    if (o.at && !o.path) { this.x = o.at.x; this.y = o.at.y; } else if (this.path) { const p = this.path.at(this.d); this.x = p.x; this.y = p.y; this.heading = p.angle; }
    this.z = H.world.height(this.x, this.y);
    this.snapRig();
    if (o.hidden === false || (!this.delay && !o.hidden)) this.appear();
  }
  /** the rig's feet put down where the actor now stands (after it is placed or moved at once) */
  snapRig() { const R = this.rig; if (R.legs) for (const L of R.legs) { L.planted = null; L.swing = false; } if (R instanceof E.Quadruped) { R.facing = this.heading; R.x = this.x; R.y = this.y; R.update(0, { x: this.x, y: this.y, z: this.z, vx: 0, vy: 0, facing: this.heading, ground: this.H.world.ground }); } }
  get alive() { return this.state !== 'dead' && this.state !== 'dying' && this.state !== 'gone' && this.state !== 'hidden'; }
  get live() { return this.state !== 'dead' && this.state !== 'gone'; }
  get running() { return this.speed > this.speeds[1] * 1.02; }
  gaitSpeed(g) { const k = T('animalSpeed') * (this.H.diff ? this.H.diff.speed : 1) * (this.o.speedMul || 1); return (this.speeds[GAIT_I[g] === undefined ? 0 : GAIT_I[g]] || this.speeds[0]) * k; }
  appear() {
    if (this.state !== 'hidden') return; this.state = 'move'; this.t = 0;
    if (!this.orders.length && this.cat === 'animal') this.orders.push(['walk', { to: 1 }], ['exit']);
    this.nextOrder(); bus.emit('appear', this);
  }
  nextOrder() { this.order = this.orders.shift() || null; this.oT = 0; if (this.order && this.order[0] === 'jump') { this.jumpT = this.jumpLen; this.order = this.orders.shift() || null; } }
  /** a shot or an impact heard: loud 0..1 at (x, y) */
  hear(x, y, loud, near) {
    if (!this.alive || this.cat === 'critter' && this.beh === 'graze') return;
    const d = Math.hypot(x - this.x, y - this.y) / M, heard = loud * clamp(1 - d / 400, 0, 1) * T('spook');
    if (heard <= 0) return;
    if (this.state === 'flee' || this.state === 'wounded') { this.fear += heard * .5; this.fleeBoost = Math.min(1.25, (this.fleeBoost || 1) * 1.1); return; }
    this.fear += heard;
    if (this.trophy && this.H.trophyRules && this.H.trophyRules.hear) { this.H.trophyRules.hear(this, heard, near); return; }
    const thr = this.temper * (this.o.calm || 1);
    if (near) { this.startle(0, true); return; }
    if (this.fear > thr) { if (this.sp && this.sp.stubborn && this.r.chance(.45) && !this.stared) { this.stared = true; this.frozenT = 1.6 + this.r.f(); this.lookAt = { x: this.H.cam.x, y: this.H.cam.y, z: 0 }; return; } this.startle(.15 + this.r.f() * .3, false); }
  }
  startle(delay, jump) {
    if (!this.alive || this.state === 'flee') return;
    this.alertT = delay; this.state = 'alert'; this.panic = jump || this.fear > this.temper * 2.2; this.frozenT = 0;
    if (jump) this.jumpT = this.jumpLen;
    bus.emit('spook', this);
  }
  /** flee along the rest of the path (or the escape route) */
  flee() {
    this.state = 'flee'; this.want = this.gaitSpeed('run') * (this.fleeBoost || 1);
    if (this.o.escape) { this.path = new APath([{ x: this.x, y: this.y }].concat(this.o.escape)); this.d = 0; }
    this.orders = [['run', { to: 1 }], ['exit']]; this.nextOrder();
  }
  /** a call heard (a hunter's grunt, bugle or moose call): stop and look toward it for a moment */
  hearCall(c) {
    if (this.trophy && this.H.trophyRules && this.H.trophyRules.call && !this.resolved && this.state !== 'dead' && this.state !== 'dying') return this.H.trophyRules.call(this, c);
    if (!this.alive || this.cat === 'critter') return false;
    const d = Math.hypot(c.x - this.x, c.y - this.y) / M; if (d > 200) return false;
    if (this.panic || this.calls >= 2 || this.state === 'wounded') return false;
    this.calls++; this.frozenT = Math.max(.2, T('callFreeze') + (this.r.f() - .5) * .4) * (this.o.callMul || 1); this.lookAt = { x: c.x, y: c.y, z: this.H.world.height(c.x, c.y) };
    if (this.sp && this.sp.id === 'elk' && this.target && this.r.chance(.5)) this.H.later(.4 + this.r.f() * .4, () => this.live && G.sfx && G.sfx.call('bugle', this, .5));
    if (this.sp && this.sp.id === 'moose' && this.r.chance(.4)) this.stepIn = .8;
    return true;
  }
  /** a hit: zone, damage, by player n; returns 'kill' | 'wound' | 'ping' */
  hit(zone, dmg, pn, at) {
    if (!this.alive && this.state !== 'hidden') return null;
    this.hurtT = .25; this.deadSide = at && this.rig.F ? (((at[0] - this.x) * this.rig.F.r[0] + (at[1] - this.y) * this.rig.F.r[1]) > 0 ? -1 : 1) : 1;
    if (zone === 'antler') { this.startle(0, true); return 'ping'; }
    this.hp -= dmg;
    if (this.hp <= 1e-6) { this.die(pn); return 'kill'; }
    this.wounds++;
    if (this.trophy && this.H.trophyRules && this.H.trophyRules.wounded) { this.H.trophyRules.wounded(this, zone); return 'wound'; }
    this.state = 'wounded'; this.limp = zone === 'leg' ? (this.r.int(0, 3)) : -1; this.panic = true;
    this.want = this.gaitSpeed('run') * .6; this.orders = [['run', { to: 1 }], ['exit']]; this.nextOrder();
    return 'wound';
  }
  die(pn) { this.state = 'dying'; this.deadT = 0; this.want = 0; this.bagger = pn; this.resolved = true; this.vx = this.vy = 0; }
  update(dt) {
    this.t += dt;
    const H = this.H, w = H.world;
    if (this.state === 'hidden') { if (this.delay > 0) { this.delay -= dt; if (this.delay <= 0) this.appear(); } this.rigUpdate(dt, 0, 0); return; }
    if (this.state === 'gone') return;
    if (this.state === 'dying' || this.state === 'dead') {
      this.deadT += dt; if (this.state === 'dying' && this.deadT > 1.1) { this.state = 'dead'; bus.emit('dead', this); }
      this.speed = Math.max(0, this.speed - dt * 30 * M); const a = this.heading; this.x += Math.cos(a) * this.speed * dt * .3; this.y += Math.sin(a) * this.speed * dt * .3; this.z = w.height(this.x, this.y);
      this.rigUpdate(dt, 0, 0); return;
    }
    if (this.hurtT > 0) this.hurtT -= dt;
    this.fear = Math.max(0, this.fear - dt * .12);
    if (this.cat === 'critter') { this.critterThink(dt); this.rigUpdate(dt, this.vx, this.vy); return; }
    // alert -> flee
    if (this.state === 'alert') { this.want = 0; this.alertT -= dt; if (this.alertT <= 0) this.flee(); }
    // following a leader: the leader's path, a little behind and to the side
    if (this.follow && this.state !== 'flee' && this.state !== 'wounded' && this.state !== 'alert') {
      const L = this.follow; if (!L.live) this.follow = null;
      else { if (!this.path) this.path = L.path; if (L.state === 'flee' || L.state === 'alert' || L.state === 'dying' || L.state === 'wounded') { this.react -= dt; if (this.react <= 0) this.startle(0, false); }
        this.want = clamp((L.d - this.back * M - this.d) * 2 + L.speed, 0, this.gaitSpeed('run')); this.order = ['follow']; }
    }
    if (this.frozenT > 0) { this.frozenT -= dt; this.want = 0; if (this.stepIn > 0) { this.stepIn -= dt; this.want = this.gaitSpeed('walk') * .5; } }
    else if (this.order) this.runOrder(dt);
    // move along the path
    const acc = (this.want > this.speed ? (this.want > this.speeds[1] ? 14 : 4) : 10) * M;
    this.speed = E.approach(this.speed, this.want, acc * dt);
    if (this.path && this.speed > 0) {
      this.d += this.speed * dt;
      const p = this.path.at(this.d), nx = p.x + Math.cos(p.angle + Math.PI / 2) * this.side * M, ny = p.y + Math.sin(p.angle + Math.PI / 2) * this.side * M;
      this.vx = (nx - this.x) / dt; this.vy = (ny - this.y) / dt; this.x = nx; this.y = ny; this.heading = p.angle;
      for (const j of this.jumps) if (!j.done && this.d >= j.d * this.path.len) { j.done = true; this.jumpT = this.jumpLen; bus.emit('jump', this); }
      if (this.d >= this.path.len - .5 && this.order && (this.order[0] === 'exit' || this.order[0] === 'run' || this.order[0] === 'walk' || this.order[0] === 'trot')) { if (this.order[0] === 'exit' || this.orders.some(o => o[0] === 'exit') || this.state === 'flee' || this.state === 'wounded') this.goneOut(); else this.nextOrder(); }
    } else { this.vx = this.vy = 0; }
    // the ground (and the jump's arc over a log, a fence or the creek)
    let gz = w.height(this.x, this.y); this.z = gz;
    if (this.jumpT > 0) { this.jumpT -= dt; this.z = gz + Math.sin((1 - this.jumpT / this.jumpLen) * Math.PI) * 1.1 * M * (this.rig.sz || 1); }
    const wl = w.hf.waterAt(this.x, this.y); this.inWater = wl !== null && wl > gz + 2;
    if (this.inWater && this.speed > 20 && (this.splashT = (this.splashT || 0) - dt) <= 0) { this.splashT = this.running ? .12 : .35; bus.emit('splash', this); }
    // in the fan, then out of it: gone
    const [b] = w.bearingOf(H.vantageId, this.x, this.y), F = H.fanB;
    if (b > F[0] - 2 && b < F[1] + 2) this.entered = true;
    else if (this.entered && (b < F[0] - 12 || b > F[1] + 12)) this.goneOut();
    this.rigUpdate(dt, this.vx, this.vy);
  }
  runOrder(dt) {
    const o = this.order, a = o[1] || {}; this.oT += dt;
    this.graze = 0; this.alertW = 0; this.callW = 0;
    switch (o[0]) {
      case 'walk': case 'trot': case 'run': case 'bound': {
        this.want = this.gaitSpeed(o[0]) * (this.state === 'flee' ? (this.fleeBoost || 1) : 1) * (this.state === 'wounded' ? .6 : 1);
        const to = (a.to === undefined ? 1 : a.to) * (this.path ? this.path.len : 0); if (this.path && this.d >= to - .5 && a.to !== undefined && a.to < 1) this.nextOrder(); break;
      }
      case 'graze': this.want = 0; this.graze = (this.oT % 3.4 < 2.6) ? 1 : 0; this.alertW = this.graze ? 0 : .6; if (this.oT > (a.secs || a)) this.nextOrder(); break;
      case 'look': case 'stand': this.want = 0; this.alertW = o[0] === 'look' ? 1 : .3; this.lookAt = o[0] === 'look' ? { x: this.H.cam.x, y: this.H.cam.y, z: 0 } : null; if (this.oT > (a.secs || a)) this.nextOrder(); break;
      case 'call': this.want = 0; this.callW = 1; if (this.oT < .05 && G.sfx) G.sfx.call(this.sp.call === 'bugle' ? 'bugle' : 'moose', this, 1); if (this.oT > (a.secs || a || 2)) this.nextOrder(); break;
      case 'wait': this.want = 0; if (this.oT > (a.secs || a)) this.nextOrder(); break;
      case 'face': this.want = 0; this.heading = E.approachAng(this.heading, a.yaw, dt * 3); if (this.oT > (a.secs || 1)) this.nextOrder(); break;
      case 'fight': { const B = a.with; this.want = 0; this.alertW = .4; if (B && B.live) { this.lookAt = { x: B.x, y: B.y, z: B.z }; const dd = Math.hypot(B.x - this.x, B.y - this.y); this.shove = Math.sin(this.oT * 6) * .5; if (dd > 4.2 * M * this.rig.sz) this.want = this.gaitSpeed('walk') * .6; } if (this.oT > (a.secs || 4)) this.nextOrder(); break; }
      case 'exit': this.want = this.gaitSpeed(this.state === 'flee' ? 'run' : 'trot'); break;
      case 'hold': this.want = 0; break;
      case 'follow': break;
      default: this.nextOrder();
    }
  }
  goneOut() {
    if (this.state === 'gone') return;
    const was = this.state; this.state = 'gone'; this.resolved = true;
    if (this.cat === 'animal' && this.target) { if (was === 'wounded' || this.wounds > 0) { this.lost = true; bus.emit('lost', this); } else { this.escaped = true; bus.emit('escape', this); } }
    else bus.emit('leave', this);
  }
  rigUpdate(dt, vx, vy) {
    const R = this.rig, w = this.H.world;
    if (this.cat === 'critter' && this.bird) { R.update(dt, { x: this.x, y: this.y, z: this.z, vx, vy, vz: this.vz, flap: this.flap === undefined ? 1 : this.flap, swim: this.swim, walk: this.walkW || 0, strut: this.strut, dead: this.state === 'dying' || this.state === 'dead', facing: this.heading }); return; }
    // antlers read at range: an arcade boost that grows with distance from the hunt's camera
    if (this.target && R.antlers) { const D = Math.hypot(this.x - this.H.cam.x, this.y - this.H.cam.y) / M; R.antlerScale = T('antlerBoost') * Math.min(1.6, 1 + Math.max(0, (D - 80) / 150)) * (this.o.antlerMul || 1); }
    const dead = this.state === 'dying' ? clamp(this.deadT / 1.05, 0, 1) : this.state === 'dead' ? 1 : 0;
    const ground = this.inWater ? ((x, y) => w.height(x, y)) : w.ground;
    R.update(dt, { x: this.x, y: this.y, z: this.z, vx, vy, facing: this.faceTo !== undefined ? this.faceTo : this.heading, faceLock: this.faceTo !== undefined, ground, alert: this.state === 'alert' || this.frozenT > 0 ? 1 : (this.alertW || 0), graze: this.graze || 0, look: this.lookAt || (this.frozenT > 0 ? { x: this.H.cam.x, y: this.H.cam.y } : null),
      hurt: this.hurtT > 0 ? 1 : 0, limp: this.state === 'wounded' ? this.limp : -1, jump: this.jumpT > 0 ? 1 : 0, dead, deadSide: this.deadSide, call: this.callW || 0, swim: this.swimW || 0, crouch: this.crouchW || 0, rear: this.rearW || 0 });
  }
  /* ---------- critters ---------- */
  critterThink(dt) {
    const C = this.def, H = this.H, w = H.world, b = this.beh, a = this.o;
    this.flap = 1; this.swim = false; this.walkW = 0; this.strut = false;
    if (this.state === 'alert') { this.alertT -= dt; if (this.alertT <= 0) this.state = 'flee'; }
    const moveAlong = (sp) => { if (!this.path) return; this.d += sp * dt; const p = this.path.at(this.d); this.vx = (p.x - this.x) / dt; this.vy = (p.y - this.y) / dt; this.x = p.x; this.y = p.y; this.heading = p.angle; if (this.d >= this.path.len - .5) this.goneOut(); };
    if (b === 'hop' || b === 'waddle' || b === 'scurry' || b === 'trot') {
      const fleeing = this.state === 'flee'; let sp = fleeing ? this.speeds[2] : b === 'hop' ? (Math.sin(this.t * 7) > -.2 ? this.speeds[1] : 0) : this.speeds[0];
      if (b === 'hop' && !fleeing && (this.t % 5) > 3.6) sp = 0;   // freezes now and then
      if (b === 'scurry' && !fleeing && (this.t % 3) > 2) { sp = 0; this.rearW = 1; } else this.rearW = 0;
      moveAlong(sp); this.z = w.height(this.x, this.y); if (b === 'hop' && sp > 0) this.z += Math.abs(Math.sin(this.t * 7 * Math.PI / 2)) * .35 * M;
      if (b === 'trot' && this.t % 7 < .02 && G.sfx) G.sfx.critter('howl', this);
    } else if (b === 'strut') {   // a turkey: walks the field, gobbles, runs off at a shot
      const fleeing = this.state === 'flee'; this.walkW = 1; this.strut = !fleeing && (this.t % 6) < 2.5;
      moveAlong(fleeing ? this.speeds[2] * 1.6 : this.strut ? 0 : this.speeds[0]); this.z = w.height(this.x, this.y);
      if (this.strut && (this.t % 6) < .02 && G.sfx) G.sfx.critter('gobble', this);
    } else if (b === 'peek') {   // a raccoon in a hollow log: up, look round, duck, up again
      const ph = this.t % 4.5; this.z = w.height(this.x, this.y) + (ph < 2.6 ? 0 : -1.2 * M); this.peekUp = ph < 2.6; this.heading = Math.atan2(H.cam.y - this.y, H.cam.x - this.x);
      if (this.state === 'flee' || this.t > (a.life || 14)) this.goneOut();
    } else if (b === 'graze') { this.vx = this.vy = 0; this.graze = (this.t % 6) < 4.5 ? 1 : 0; this.z = w.height(this.x, this.y); if (this.t % 9 < .02 && G.sfx) G.sfx.critter('moo', this); if (this.path) moveAlong(this.speeds[0] * (this.graze ? 0 : 1)); }
    else if (b === 'popup') { const ph = this.t % 5; this.rearW = ph < 3 ? 1 : 0; this.z = w.height(this.x, this.y) + (ph < 3.2 ? 0 : -1.4 * M); if (ph < .02 && G.sfx) G.sfx.critter('whistle', this); if (this.state === 'flee' || this.t > (a.life || 18)) this.goneOut(); }
    else if (b === 'pack') { moveAlong(this.speeds[2] * (a.speedMul || 1)); this.z = w.height(this.x, this.y); }
    else if (b === 'flock' || b === 'flush' || b === 'soar') {   // fliers: a path in the air (z above the ground)
      if (b === 'flush' && !this.flushed) { this.z = w.height(this.x, this.y) + (C.water ? 0 : .2 * M); this.swim = !!C.water; this.flap = 0; if (this.t > (a.wait || 3) || this.state === 'flee') { this.flushed = true; if (G.sfx) G.sfx.critter(C.water ? 'quack' : 'whirr', this); } return; }
      const sp = this.speeds[2] * (b === 'soar' ? .6 : 1); this.d += sp * dt; const p = this.path.at(this.d), alt = (a.alt || (b === 'soar' ? 60 : 12)) * M * (b === 'flush' ? Math.min(1, this.d / (30 * M)) : 1);
      const nz = w.height(p.x, p.y) + alt + (b === 'flock' ? Math.sin(this.t * 2 + this.n) * 1.5 * M : 0);
      this.vx = (p.x - this.x) / dt; this.vy = (p.y - this.y) / dt; this.vz = (nz - this.z) / dt; this.x = p.x; this.y = p.y; this.z = nz; this.heading = p.angle;
      this.flap = b === 'soar' ? (Math.sin(this.t * .7) > .7 ? .6 : .05) : 1;
      if (b === 'flock' && this.t % 4 < .02 && G.sfx && this.n % 3 === 0) G.sfx.critter('caw', this);
      if (this.d >= this.path.len - .5) this.goneOut();
    } else if (b === 'swim') {   // on the water: a loon floats and wails, a beaver swims with a wake and slaps
      const wl = w.hf.waterAt(this.x, this.y); this.swim = true; this.flap = 0;
      if (this.path) moveAlong(this.speeds[0] * (this.state === 'flee' ? 3 : 1)); this.z = (wl !== null ? wl : w.height(this.x, this.y)) - (this.bird ? 0 : .25 * M);
      if (this.t % 8 < .02 && G.sfx) G.sfx.critter(C.voice || 'loon', this);
      this.swimW = this.bird ? 0 : 1;
      if (this.state === 'flee' && !this.bird && this.t - (this.fleeAt || 0) > .3) { this.goneOut(); if (G.sfx) G.sfx.critter('slap', this); }
    }
  }
  /** for the hunt's renderer: a billboard item */
  item(scale) {
    if (this.state === 'hidden' || this.state === 'gone') return null;
    const R = this.rig, s = (this.cat === 'animal' ? T('animalScale') : 1.15) * (scale || 1), H = this.H, glint = G.game.settings.glint;
    if (this.cat === 'critter' && this.beh === 'peek' && !this.peekUp) return null;
    const it = this._it || (this._it = { draw: null, outline: H.hunt ? H.hunt.outline : '#1a1010', bias: 10 });
    const q = R instanceof E.Quadruped; it.x = q ? R.x : this.x; it.y = q ? R.y : this.y; it.z = q ? R.z : this.z; it.scale = s;   // (a rig's joints hang off its own root, which rides the ground under its legs)
    it.box = [Math.max(R.length || 10, R.height || 10) * .7, (R.height || 10) + 6];
    it.draw = (g, ox, oy, k, view) => { R.draw(g, ox, oy, view, { glint: glint && this.target, xray: this.xrayT > 0 }); };
    const w = this.cat === 'animal' ? H.world.hf.waterAt(this.x, this.y) : null; it.wade = w !== null && w > this.z + .3 ? w : null;   // wading: the water hides the legs (and takes the shots there)
    return it;
  }
  /** hit volumes in world space (with the arcade size boost the drawing uses) */
  zones() { const s = this.cat === 'animal' ? T('animalScale') : 1.15; return this.rig.zones(s); }
}
