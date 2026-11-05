// Animals and critters at run time: actors on terrain paths with order queues (walk, trot, run, graze, look, stand,
// hide, exit), herds that trail a leader, senses (gunshots and impacts spook them; calls stop them), wounds, death,
// escapes. Spawn patterns place them in a site's [bearing, dist] frame. All randomness from the spawn and ai streams.
(() => {
const B = BB, E = B.E;

// species: gameplay numbers (6.6)
B.def('species', 'whitetail', { rig: 'deer', size: 1, speeds: [1.3, 3.4, 8.5], hp: 1, temper: .35, targets: ['buck'], protect: ['doe', 'fawn'], antlers: 'whitetail', points: [4, 12], base: p => 100 + 15 * p, call: 'grunt', label: p => p + '-POINT' });
B.def('species', 'elk', { rig: 'elk', size: 1.5, speeds: [1.4, 4.0, 9.0], hp: 1.5, temper: .45, herd: true, targets: ['bull'], protect: ['cow', 'calf'], antlers: 'elk', points: [10, 12], base: p => 150 + 20 * p, call: 'bugle', label: p => Math.floor(p / 2) + 'x' + Math.ceil(p / 2) });
B.def('species', 'moose', { rig: 'moose', size: 1.9, speeds: [1.5, 4.5, 8.0], hp: 2, temper: .7, stubborn: true, targets: ['bull'], protect: ['cow', 'calf'], antlers: 'moose', spread: [40, 55], points: [8, 12], base: (p, sp) => 200 + 6 * sp, call: 'moose', label: (p, sp) => sp + '-INCH' });
B.def('species', 'paper', { rig: 'deer', size: 1, speeds: [1.3, 3.4, 6], hp: 1, temper: 9, targets: ['buck'], protect: ['doe'], antlers: 'whitetail', points: [8, 8], base: p => 100, call: 'grunt', label: () => 'PAPER' });
const SPECIES_OF = { hollow: 'whitetail', bugle: 'elk', muskeg: 'moose', range: 'paper' };
B.speciesFor = hunt => B.get('species', SPECIES_OF[hunt] || 'whitetail');

// critters (6.7): points, behaviour, protected
const C = (id, o) => B.def('critter', id, o);
C('squirrel', { points: 50, look: 'squirrel', move: 'scurry', speed: 3, bark: 'SQUIRREL!' });
C('rabbit', { points: 75, look: 'rabbit', move: 'hop', speed: 4 });
C('hare', { points: 125, look: 'hare', move: 'hop', speed: 5 });
C('turkey', { points: 150, look: 'turkey', move: 'strut', speed: 1.2, bark: 'TURKEY DINNER!' });
C('raccoon', { points: 100, look: 'raccoon', move: 'peek', speed: 1.5 });
C('skunk', { points: -100, look: 'skunk', move: 'waddle', speed: .8, protected: true, effect: 'stink', bark: 'OH, THE STINK!' });
C('crow', { points: 100, look: 'crow', move: 'fly', speed: 7 });
C('goldcrow', { points: 500, look: 'goldcrow', move: 'fly', speed: 8, bark: 'GOLDEN CROW!' });
C('raven', { points: 100, look: 'raven', move: 'fly', speed: 7 });
C('grouse', { points: 150, look: 'grouse', move: 'flush', speed: 9 });
C('marmot', { points: 75, look: 'marmot', move: 'peek', speed: 1 });
C('duck', { points: 150, look: 'duck', move: 'flush', speed: 10, swims: true });
C('loon', { points: -400, look: 'loon', move: 'swim', speed: .6, protected: true, swims: true, bark: 'NOT THE LOON!' });
C('beaver', { points: 100, look: 'beaver', move: 'swim', speed: 1, swims: true });
C('eagle', { points: -400, look: 'eagle', move: 'soar', speed: 9, protected: true, bark: "THAT'S THE NATIONAL BIRD, BUDDY!" });
C('coyote', { points: 250, quad: 'canid', move: 'trot', speed: 4, colors: { coat: '#b0906a', belly: '#e0d0b8', dark: '#6a5038' } });
C('wolf', { points: 300, quad: 'canid', move: 'trot', speed: 7, colors: { coat: '#8a8a90', belly: '#d0d0d4', dark: '#4a4a50' } });
C('cow', { points: -500, quad: 'cow', move: 'graze', speed: .5, protected: true, bark: "THAT'S BESSIE!!" });

let nextId = 1;
B.resetIds = () => { nextId = 1; };

// ---- a path on the terrain ----
class Path {
  constructor(pts) {   // pts: [[x, y, mark?], ...] world metres
    this.p = pts; this.L = [0];
    for (let i = 1; i < pts.length; i++) this.L.push(this.L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.length = this.L[this.L.length - 1];
  }
  at(d) {
    const L = this.L, p = this.p; d = B.clamp(d, 0, this.length);
    let i = 1; while (i < L.length - 1 && L[i] < d) i++;
    const t = L[i] === L[i - 1] ? 0 : (d - L[i - 1]) / (L[i] - L[i - 1]), a = p[i - 1], b = p[i];
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, angle: Math.atan2(b[1] - a[1], b[0] - a[0]), i };
  }
  marksBetween(d0, d1) { const out = []; for (let i = 0; i < this.p.length; i++) if (this.p[i][2] && this.L[i] > d0 && this.L[i] <= d1) out.push(this.p[i][2]); return out; }
}
B.Path = Path;

// ---- the actor ----
class Actor {
  constructor(o) {
    Object.assign(this, { id: nextId++, cat: 'animal', kind: 'buck', x: 0, y: 0, z: 0, heading: 0, speed: 0, state: 'walk', orders: [], hp: 1, maxHp: 1, fear: 0, wounded: false, dead: false, dying: 0, gone: false, bagger: -1, t: 0, seenT: -1, visible: false, onScreen: false, callCount: 0, frozen: 0, alert: 0, graze: 0, look: 0, jump: 0, jumpT: 0, pathD: 0, hits: [], flee: false, escaped: false, lost: false, trophy: null, hidden: false, spook: 1, lockIn: 0 }, o);
    this.ai = B.mkRng(B.hashStr('ai' + this.id) ^ B.runSeed);
  }
  get live() { return !this.dead && !this.gone; }
  get target() { return this.cat === 'animal' ? !!this.legal : this.cat === 'critter' ? !this.protected : !!this.legal; }
}
B.Actor = Actor;

// the run-time world of a site: actors, senses, calls
class Herd {
  constructor(site) { this.site = site; this.list = []; this.spawnLog = []; }
  add(a) { this.list.push(a); this.spawnLog.push([a.id, a.kind, Math.round(a.x * 10), Math.round(a.y * 10)]); return a; }
  live() { return this.list.filter(a => a.live); }
  // a loud event (a gunshot, an impact) at a point
  noise(x, y, loud, radius) {
    const sp = B.TUNING.spook;
    for (const a of this.list) {
      if (!a.live || a.cat === 'target' || a.noSpook) continue;
      const d = Math.hypot(a.x - x, a.y - y); if (d > radius) continue;
      const f = loud * (1 - d / radius) * sp * a.spook;
      a.fear += f;
      if (a.lockIn > 0) continue;
      if (d < 4 && loud < 1) { a.fear += 1; a.jumpNow = true; }
      if (a.fear > a.temper && !a.flee) a.startle(this.site);
      else if (a.flee) a.speedBoost = Math.min(1.3, (a.speedBoost || 1) * 1.1);
    }
  }
  call(x, y, radius, from) {
    let n = 0;
    for (const a of this.list) {
      if (!a.live || a.cat !== 'animal' || a.dying) continue;
      if (a.trophy && a.trophyCall) { if (a.trophyCall(a, from)) n++; continue; }
      if (a.flee && a.fear > 1.5) continue;
      if (a.callCount >= 2) continue;
      if (Math.hypot(a.x - x, a.y - y) > radius) continue;
      a.callCount++; a.frozen = B.TUNING.callFreeze + a.ai.range(-.2, .2); a.state = 'look'; n++;
      if (a.species === 'elk' && a.legal && a.ai.chance(.5)) B.bus.emit('sound', { id: 'bugle', x: a.x, y: a.y, far: true });
    }
    return n;
  }
}
B.Herd = Herd;

const SPEED_IDX = { walk: 0, trot: 1, run: 2, wade: 0 };
Actor.prototype.temper = .35;
Actor.prototype.startle = function (site) {
  if (this.flee || this.dead) return;
  if (this.stubborn && this.ai.chance(.45) && !this.stared) { this.stared = true; this.orders = [['look', 2 + this.ai.range(0, 1.5)], ['run', { to: 1 }], ['exit']]; this.state = 'look'; this.flee = true; return; }
  this.flee = true; this.alertT = this.ai.range(.15, .45);
  this.orders = [['run', { to: 1 }], ['exit']]; this.state = 'alert';
};
// one step of an animal or critter
Actor.prototype.step = function (dt, site) {
  this.t += dt;
  if (this.dead) { this.dying = Math.min(1, this.dying + dt); this.speed = 0; this.syncRig(dt, site); return; }
  if (this.gone) return;
  const T = B.TUNING, w = site.world;
  if (this.jumpNow) { this.jumpNow = false; if (!this.jumpT) this.jumpT = .6; }
  if (this.frozen > 0) { this.frozen -= dt; this.speed = B.approach(this.speed, 0, dt * 12); this.alert = 1; this.look = this.lookAtCam(site); this.syncRig(dt, site); if (this.frozen <= 0) this.state = 'walk'; return; }
  if (this.alertT > 0) { this.alertT -= dt; this.speed = B.approach(this.speed, 0, dt * 10); this.alert = 1; this.syncRig(dt, site); return; }
  // orders
  const o = this.orders[0];
  let want = 0, graze = 0, alert = this.flee ? .6 : 0, look = 0;
  const mult = T.animalSpeed * (this.speedMul || 1) * (this.speedBoost || 1) * (this.wounded ? .6 : 1);
  if (!o) { this.state = 'stand'; }
  else {
    const [kind, arg] = o;
    if (kind === 'walk' || kind === 'trot' || kind === 'run') {
      this.state = kind; want = this.speeds[SPEED_IDX[kind]] * mult;
      const to = (arg && arg.to !== undefined ? arg.to : 1) * this.path.length;
      if (this.pathD >= to - .05) this.orders.shift();
    } else if (kind === 'graze' || kind === 'look' || kind === 'stand' || kind === 'hide' || kind === 'call') {
      this.state = kind; o.t = (o.t || 0) + dt;
      if (kind === 'graze') graze = Math.sin(o.t * .9) > -.6 ? 1 : 0;
      if (kind === 'look') { alert = 1; look = this.lookAtCam(site); }
      if (kind === 'call') { alert = .5; this.calling = 1; }
      if (o.t >= arg) { this.orders.shift(); this.calling = 0; }
    } else if (kind === 'exit') { this.state = 'run'; want = this.speeds[2] * mult; if (this.pathD >= this.path.length - .05) this.leave(site); }
    else if (kind === 'wait') { if (arg()) this.orders.shift(); }
    else if (kind === 'fn') { this.orders.shift(); arg(this); }
    else this.orders.shift();
  }
  if (this.wounded && !this.flee) { this.flee = true; this.orders = [['trot', { to: 1 }], ['exit']]; }
  if (this.hidden && this.state !== 'hide') this.hidden = false;
  // move along the path
  const acc = this.cat === 'animal' ? 6 : 12;
  this.speed = B.approach(this.speed, want, acc * dt);
  if (this.path && this.speed > 0) {
    const d0 = this.pathD; this.pathD = Math.min(this.path.length, this.pathD + this.speed * dt);
    const marks = this.path.marksBetween(d0, this.pathD); if (marks.includes('jump') && !this.jumpT) this.jumpT = .6;
    const p = this.path.at(this.pathD + .01); this.x = p.x; this.y = p.y;
    this.heading = B.approachAngle(this.heading, p.angle, dt * 4);
    if (this.pathD >= this.path.length - .01 && this.state !== 'stand' && this.orders[0] && this.orders[0][0] !== 'exit' && this.orders.length && ['walk', 'trot', 'run'].includes(this.orders[0][0])) this.orders.shift();
  }
  if (this.jumpT > 0) { this.jumpT = Math.max(0, this.jumpT - dt); this.jump = 1 - this.jumpT / .6; if (!this.jumpT) this.jump = 0; }
  this.z = this.swims ? (w.waterAt(this.x, this.y) ?? w.groundAt(this.x, this.y)) : w.groundAt(this.x, this.y);
  if (this.alt) this.z += this.alt(this.path ? this.pathD / Math.max(1, this.path.length) : 0, this.t);
  if (this.state === 'hide' && this.cat === 'animal' && this.boltOnShot) this.z -= .5 * (this.rig ? this.rig.size : 1);
  this.graze = graze; this.alert = Math.max(alert, this.fear > .2 && !this.flee ? .7 : 0); this.look = look;
  this.fear = Math.max(0, this.fear - dt * .05);
  // out of the fan: gone
  if (site.outOfFan(this)) this.leave(site);
  this.syncRig(dt, site);
};
Actor.prototype.lookAtCam = function (site) { const a = Math.atan2(site.lens.y - this.y, site.lens.x - this.x); return B.clamp(B.wrapA(a - this.heading), -1.2, 1.2); };
Actor.prototype.leave = function (site) {
  if (this.gone || this.dead) return;
  this.gone = true;
  if (this.cat === 'animal' && this.legal) { if (this.wounded) { this.lost = true; B.bus.emit('lost', { a: this }); } else { this.escaped = true; B.bus.emit('escape', { a: this }); } }
};
Actor.prototype.syncRig = function (dt, site) {
  const w = site.world;
  if (this.rig) {
    this.rig.update(dt, { x: this.x, y: this.y, z: this.z, heading: this.heading, speed: this.speed, graze: this.graze, alert: this.alert, look: this.look, dead: this.dead ? 1 : 0, deadSide: this.deadSide || 1, hurt: this.hurtT > 0 ? 1 : 0, jump: this.jump, call: this.calling ? 1 : 0, limp: this.wounded ? this.limpLeg : -1, ground: (x, y) => w.groundAt(x, y) });
    if (this.hurtT > 0) this.hurtT -= dt;
  }
};
B.approachAngle = (a, b, d) => { const df = B.wrapA(b - a); return Math.abs(df) <= d ? b : a + Math.sign(df) * d; };

// ---- making animals ----
B.makeAnimal = (site, kind, o = {}) => {
  const sp = site.species, legal = sp.targets.includes(kind), young = kind === 'fawn' || kind === 'calf';
  const diff = B.diff();
  const a = new Actor({ cat: 'animal', kind, species: sp.id, legal, protected: !legal });
  const r = site.rng;
  if (legal) {
    a.points = o.points || r.int(sp.points[0], sp.points[1]);
    if (sp.spread) a.spread = o.spread || r.int(sp.spread[0], sp.spread[1]);
  }
  const size = sp.size * (young ? .6 : legal ? 1 : .92) * (o.sizeMul || 1) * B.TUNING.animalScale;
  a.rig = new B.Quadruped({ species: sp.rig, sex: legal ? 'buck' : 'doe', size, young, seed: a.id, antlers: legal ? { kind: sp.antlers, points: a.points, seed: a.id * 7 + 3, spread: a.spread } : null, colors: o.colors });
  a.speeds = sp.speeds.map((v, i) => v * [1.45, 1.25, 1][i] * (o.speedMul || 1) * diff.speed * (young ? .95 : 1));
  a.hp = a.maxHp = sp.hp * (o.trophy ? 1.5 : 1); a.temper = sp.temper * (o.calm || 1); a.stubborn = !!sp.stubborn;
  a.limpLeg = r.int(0, 3); a.deadSide = r.sign();
  if (o.trophy) { a.trophy = o.trophy; a.points = o.points; a.spread = o.spread; }
  return a;
};
B.makeCritter = (site, kind, o = {}) => {
  const c = B.get('critter', kind);
  const a = new Actor({ cat: 'critter', kind, crit: c, protected: !!c.protected, legal: !c.protected, points: c.points, swims: !!c.swims, temper: .2, hp: .3, maxHp: .3 });
  a.speeds = [c.speed * .4, c.speed * .7, c.speed];
  if (c.quad) { a.rig = new B.Quadruped({ species: c.quad, sex: 'doe', size: (c.quad === 'cow' ? 1.25 : kind === 'wolf' ? 1.15 : 1) * B.TUNING.animalScale, seed: a.id, colors: c.colors }); a.cat = 'critter'; }
  a.flyer = ['fly', 'flush', 'soar'].includes(c.move);
  a.strut = !!o.strut; a.slapper = !!o.slapper;
  const base = a.step;
  a.step = function (dt, site) {
    if (this.flyer && this.dead) {
      this.dying += dt; this.fallV = (this.fallV || 0) + 9.8 * dt; this.z -= this.fallV * dt; const g = site.world.groundAt(this.x, this.y); if (this.z <= g) this.z = g;
    } else base.call(this, dt, site);
    this.sinkV = B.approach(this.sinkV || 0, this.state === 'hide' ? 1 : 0, dt * 4);
    if (!c.quad) this.parts = B.critterParts(c.look, { x: this.x, y: this.y, z: this.z - this.sinkV * B.CRITTER_LOOKS[c.look].size * 2.4, heading: this.heading, t: this.t, speed: this.speed, flap: this.flyer && !this.dead && this.speed > .2 ? 1 : 0, dead: this.dead ? Math.min(1, this.dying * 2) : 0, swim: this.swims && site.world.waterAt(this.x, this.y) !== null, strut: this.strut && this.state === 'stand', slap: this.slapper ? Math.max(0, Math.sin(this.t * 1.3)) : 0, hop: c.move === 'hop' && this.speed > .3 ? Math.abs(Math.sin(this.t * 9)) * .25 : 0 });
  };
  a.partsFn = t => t.parts || [];
  a.parts = [];
  return a;
};
})();
