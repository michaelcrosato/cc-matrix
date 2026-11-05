// 06-sim: people, routines, perception ("made") and the CornerSim: one simulation seen from both sides (story, interludes, versus, attract)
const SPEED = { walk: 58, run: 98, crouch: 34, blend: 26 };
class Person {
  constructor(o) {
    const { x, y, rig, ...rest } = o;
    Object.assign(this, { id: 'p' + (Person.n = (Person.n || 0) + 1), kind: 'civ', role: 'civ', name: '', state: 'idle', stT: 0, facing: rnd(rng.cosmetic) * 6, susp: 0, act: false, carry: false, hidden: false, pose: null, known: false, read: 0, route: null, ri: 0, wait: 0, speed: SPEED.walk, ctl: null, flags: {} }, rest);
    this.body = new E.Body({ x, y, r: 4 }); this.body.facing = this.facing;
    this.rig = rig instanceof E.Humanoid ? rig : mkRig(rig || {});
  }
  get x() { return this.body.x; } get y() { return this.body.y; } set x(v) { this.body.x = v; } set y(v) { this.body.y = v; }
  get z() { return this.body.z; }
  get vx() { return this.body.vx; } get vy() { return this.body.vy; }
  goTo(tx, ty, sp, dt, map) { const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy); if (d < 2.5) { this.body.vx = this.body.vy = 0; return true; } const k = Math.min(1, d / 6) * sp; this.body.vx = dx / d * k; this.body.vy = dy / d * k; this.facing = Math.atan2(dy, dx); return false; }
  stop() { this.body.vx = this.body.vy = 0; }
  stepBody(dt, map) { this.body.update(dt, map); }
  poseRig(dt) { this.rig.update(dt, { x: this.x, y: this.y, z: this.body.z, vx: this.body.vx, vy: this.body.vy, facing: this.facing, pose: this.pose || (this.act ? 'wave' : undefined), crouch: this.crouching, sprint: this.running, down: this.downT ? Math.min(1, this.downT * 3) : 0 }); }
}
const ROLE_LABEL = { lookout: 'Lookout', dealer: 'Corner boy', runner: 'Runner', buyer: 'Buyer', civ: 'Civilian', boss: 'Boss', cop: 'Police' };
class Sim {
  constructor(map, opts = {}) {
    this.map = map; this.o = opts; this.t = 0; this.people = []; this.shut = 0; this.cash = 0; this.sales = 0; this.heatCrew = 0; this.spawnT = 3; this.events = [];
    this.nodeCache = {}; this.buyerT = 2; this.copCalls = 0; this.alarm = 0; this.stashCount = 0;
    this.civCap = opts.civs == null ? 14 : opts.civs;
  }
  spawnTag(tag) { const s = this.map.find(tag); return s ? { x: s.x, y: s.y } : { x: 100, y: 100 }; }
  add(o) { const p = new Person(o); this.people.push(p); return p; }
  populate() {
    const crewRig = k => CAST[k].rig;
    const tee = this.spawnTag('tee'), d2 = this.spawnTag('dealer2'), l1 = this.spawnTag('look1'), l2 = this.spawnTag('look2'), l3 = this.spawnTag('look3'), run = this.spawnTag('runner');
    this.tee = this.add(Object.assign({ kind: 'crew', role: 'dealer', cast: 'tee', name: CAST.tee.name, rig: crewRig('tee'), post: tee }, tee));
    this.dealer2 = this.add(Object.assign({ kind: 'crew', role: 'dealer', cast: 'kid', name: 'Corner boy', rig: crewRig('kid'), post: d2 }, d2));
    this.look1 = this.add(Object.assign({ kind: 'crew', role: 'lookout', cast: 'look', name: 'Lookout', rig: crewRig('look'), post: l1, sweep: 0 }, l1));
    this.look2 = this.add(Object.assign({ kind: 'crew', role: 'lookout', cast: 'look', name: 'Lookout', rig: crewRig('look'), post: l2, sweep: 2 }, l2));
    this.look3 = this.add(Object.assign({ kind: 'crew', role: 'lookout', cast: 'look', name: 'Lookout', rig: crewRig('look'), post: l3, sweep: 4 }, l3));
    this.runner = this.add(Object.assign({ kind: 'crew', role: 'runner', cast: 'runner', name: 'Runner', rig: crewRig('runner'), post: run, route: 'shuttle' }, run));
    for (const p of [this.look1, this.look2, this.look3]) p.facing = angTo(p, tee) + 3;
    for (let i = 0; i < this.civCap; i++) this.spawnCiv();
    return this;
  }
  spawnCiv() {
    const loop = LOOPS[Math.floor(rnd(rng.world) * LOOPS.length)], i0 = Math.floor(rnd(rng.world) * loop.length), c = loop[i0], p0 = cc(c[0], c[1]);
    const seed = Math.floor(rnd(rng.world) * 1e6), r = E.rng(seed);
    const rig = mkRig({ size: 1.05 + r() * .25, weapon: null, outfit: r() < .5 ? 'shirt' : 'coat', hair: ['short', 'long', 'bald', 'ponytail', 'spiky'][Math.floor(r() * 5)], hat: r() < .25 ? 'cap' : undefined, sleeves: r() < .5 ? 'long' : 'short', colors: { skin: ['#c89070', '#7a5236', '#5a3a28', '#d8a888', '#8a6040'][Math.floor(r() * 5)], hair: '#2a2018', cloth: CIV_SHIRTS[Math.floor(r() * CIV_SHIRTS.length)], pants: ['#2a2a36', '#3a3a2a', '#2a3a4a'][Math.floor(r() * 3)] } });
    return this.add({ kind: 'civ', role: 'civ', name: 'Civilian', x: p0.x, y: p0.y, rig, loop, ri: (i0 + 1) % loop.length, dir: rnd(rng.world) < .5 ? 1 : -1, speed: 40 + rnd(rng.world) * 22, seed });
  }
  by(role) { return this.people.filter(p => p.role === role); }
  say(ev) { this.events.push(ev); bus.emit('sim', ev); }
  update(dt, subject) {
    this.t += dt; this.shut = Math.max(0, this.shut - dt); this.alarm = Math.max(0, this.alarm - dt);
    const map = this.map, shut = this.shut > 0;
    // customers
    if (this.follow) { for (const p of this.people) p.poseRig(dt); this.people = this.people.filter(p => !p.gone); return; }
    this.buyerT -= dt; const nb = this.people.filter(p => p.role === 'buyer').length;
    if (this.buyerT <= 0) { this.buyerT = 4 + rnd() * 4; if (!shut && nb < 3) this.spawnBuyer(); }
    if (!this.follow) for (const p of this.people) { p.stT += dt; this.brain(p, dt, subject); if (p.kind !== 'sub') p.stepBody(dt, map); if (p.downT) p.downT += dt; }
    for (const p of this.people) p.poseRig(dt);
    this.people = this.people.filter(p => !p.gone);
  }
  spawnBuyer() {
    const edge = [[1, 13], [46, 19], [10, 20], [40, 12], [20, 3], [27, 30]][Math.floor(rnd() * 6)], c = cc(edge[0], edge[1]), seed = Math.floor(rnd() * 1e6), r = E.rng(seed);
    const rig = mkRig({ size: 1.1, weapon: null, outfit: 'coat', hair: 'short', hat: r() < .4 ? 'cap' : undefined, colors: { skin: ['#c89070', '#7a5236', '#d8a888'][Math.floor(r() * 3)], cloth: '#6a6a52', pants: '#3a3a32' } });
    const target = [this.tee, this.dealer2][Math.floor(rnd() * 2)];
    return this.add({ kind: 'civ', role: 'buyer', name: 'Buyer', x: c.x, y: c.y, rig, target, speed: 46, state: 'toDealer' });
  }
  brain(p, dt, subject) {
    const map = this.map;
    if (p.downT) { p.stop(); return; }
    if (p.hold) { p.stop(); return; }
    const shut = this.shut > 0;
    if (p.ctl) return;                                              // player/bot-controlled: the scene moves it
    if (p.role === 'civ') {
      if (p.wait > 0) { p.wait -= dt; p.stop(); return; }
      const c = p.loop[p.ri], t = cc(c[0], c[1]);
      if (p.goTo(t.x, t.y, p.speed, dt, map)) { p.ri = (p.ri + p.dir + p.loop.length) % p.loop.length; if (rnd() < .25) p.wait = 2 + rnd() * 5; }
    } else if (p.role === 'buyer') {
      if (p.state === 'wait') { p.stop(); p.facing = angTo(p, p.target); if (p.stT > 9 || shut) { p.state = 'leave'; this.say({ k: 'lostSale', at: p }); } }
      else if (p.state === 'toDealer') { const t = p.target; if (shut || t.hidden) p.state = 'leave'; else if (t.ctl && dist2(p, t) < 16) { p.state = 'wait'; p.stT = 0; p.stop(); } else if (!t.ctl && dist2(p, t) < 14) { p.state = 'deal'; p.stT = 0; p.stop(); p.act = true; t.act = true; t.flags.dealT = 3.2; p.facing = angTo(p, t); } else p.goTo(t.x + 8, t.y + 4, p.speed, dt, map); }
      else if (p.state === 'deal') { p.stop(); if (p.stT > 3.2) { p.act = false; if (p.target) p.target.act = false; p.state = 'leave'; this.sales++; this.cash += 20; this.say({ k: 'sale', at: p }); } }
      else { const c = cc(1, 16); if (p.goTo(p.x < 400 ? c.x : 770, 270, p.speed, dt, map) || p.stT > 40) p.gone = true; }
    } else if (p.role === 'lookout') {
      const home = p.post; p.act = false;
      if (shut) { p.hidden = true; if (p.goTo(home.x - 100, home.y + 120, 60, dt, map)) p.stop(); return; }
      p.hidden = false; if (dist2(p, home) > 4) { p.goTo(home.x, home.y, 50, dt, map); return; } p.stop();
      if (p.susp > .3 && subject) p.facing = angTo(p, subject); else { p.sweep += dt * .5; p.facing = p.base == null ? (p.base = p.facing) : p.base + Math.sin(p.sweep) * 1.1; }
      p.pose = 'hips';
    } else if (p.role === 'dealer') {
      const home = p.post; if (p.flags.dealT > 0) { p.flags.dealT -= dt; p.act = true; } else p.act = false;
      if (shut) { p.hidden = true; if (p.goTo(home.x + 90, home.y - 90, 60, dt, map)) p.stop(); return; }
      p.hidden = false; if (!p.flags.dealT && dist2(p, home) > 3) p.goTo(home.x, home.y, 50, dt, map); else p.stop();
      if (!p.flags.dealT && p.susp > .3 && subject) p.facing = angTo(p, subject);
    } else if (p.role === 'runner') {
      this.runnerBrain(p, dt);
    } else if (p.role === 'cop') {
      this.copBrain(p, dt);
    }
  }
  runnerBrain(p, dt) {
    const map = this.map, shut = this.shut > 0;
    if (p.flags.fleeing) { return; }
    if (shut) { p.hidden = true; p.stop(); return; } p.hidden = false;
    const stash = this.spawnTag('stash'), pit = this.spawnTag('tee');
    if (p.state === 'idle' || !p.state) { p.state = 'wait'; p.stT = 0; }
    if (p.state === 'wait') { p.stop(); p.carry = false; if (p.stT > (p.flags.cycle || 12)) { p.state = 'toStash'; p.stT = 0; } }
    else if (p.state === 'toStash') { if (p.goTo(stash.x, stash.y, 50, dt, map)) { p.state = 'pickup'; p.stT = 0; } }
    else if (p.state === 'pickup') { p.stop(); if (p.stT > 2) { p.carry = true; p.act = true; p.state = 'toPit'; p.stT = 0; } }
    else if (p.state === 'toPit') { p.act = false; if (p.goTo(pit.x + 12, pit.y + 10, 50, dt, map)) { p.state = 'drop'; p.stT = 0; } }
    else if (p.state === 'drop') { p.stop(); p.act = p.stT < 2.5; if (p.stT > 2.5) { p.carry = false; this.stashCount += 1; this.say({ k: 'reup', at: p }); p.state = 'wait'; p.stT = 0; } }
  }
  copBrain(p, dt) {
    const tee = this.tee; if (p.hold) return;
    if (p.state === 'approach') { if (p.goTo(tee.x - 14, tee.y + 12, 44, dt, this.map) || p.stT > 40) { p.state = 'loiter'; p.stT = 0; if (!p.flags.called && !p.flags.bust) { p.flags.bust = true; this.say({ k: 'bust', at: p }); } } }
    else if (p.state === 'loiter') { p.stop(); if (p.stT > 4) p.state = 'leave'; }
    else if (p.state === 'leave') { if (p.goTo(20, 280, 50, dt, this.map) || p.stT > 30) p.gone = true; }
  }
  spawnCop(from) {
    const c = cc(from[0], from[1]); const rig = mkRig({ size: 1.12, weapon: null, outfit: 'shirt', hair: 'short', hat: 'cap', colors: { skin: '#d8a888', cloth: rnd() < .5 ? '#586a3a' : '#4a5a6a', pants: '#3a3a42' } });
    return this.add({ kind: 'civ', role: 'cop', name: 'Plainclothes', x: c.x, y: c.y, rig, state: 'approach', cover: 'civ' });
  }
  // the shutdown: the crew goes quiet for s seconds
  hideCorner(s) { this.shut = Math.max(this.shut, s); this.say({ k: 'shut', s }); }
}

// ---- perception: who can see the subject, and how fast they make her ----
const Perception = {
  // returns { seen, rate, d } for one watcher against a subject
  look(o, s, map, o2 = {}) {
    if (o.hidden || o.downT) return { seen: false, rate: 0, d: 999 };
    const d = dist2(o, s), range = (o2.range || 118) * (s.watching ? 1.25 : 1) * (s.blending && !s.moving ? .75 : 1);
    if (d > range) return { seen: false, rate: 0, d };
    let a = Math.abs(((angTo(o, s) - o.facing + Math.PI * 3) % TAU) - Math.PI); if (a > (o2.fov || 1.9) / 2) return { seen: false, rate: 0, d };
    if (!map.sight({ x: o.x, y: o.y, z: 0 }, { x: s.x, y: s.y, z: s.crouching ? 10 : 0 })) return { seen: false, rate: 0, d };
    let expo = .5; if (s.running) expo *= 2; else if (!s.moving) expo *= .6; if (s.crouching) expo *= .72; if (s.blending && !s.moving) expo *= .25; if (s.watching) expo *= 1.35; if (s.crowd >= 3) expo *= .7;
    const near = .4 + (1 - d / range) * 1.3;
    return { seen: true, rate: .46 * expo * near * (o2.k || 1), d };
  },
  // updates every observer's suspicion of one subject; returns the observer who made her, or null
  update(sim, subject, dt, kind = 'dana') {
    let made = null, heat = 0; const k = diff().susp;
    subject.crowd = sim.people.filter(p => p.role === 'civ' && dist2(p, subject) < 44).length;
    for (const o of sim.people) {
      if (o.kind !== 'crew') continue; const r = Perception.look(o, subject, sim.map, { k });
      if (r.seen && sim.shut <= 0) o.susp = Math.min(1.05, o.susp + r.rate * dt); else o.susp = Math.max(0, o.susp - .2 * dt);
      o.alertFlag = o.susp > .6 ? '!' : o.susp > .25 ? '?' : '';
      if (o.susp > .25 && !o.noticed) { o.noticed = true; Sound.sfx('notice', { vol: .5 }); } if (o.susp < .1) o.noticed = false;
      heat = Math.max(heat, o.susp); if (o.susp >= 1) made = o;
    }
    subject.heat = heat; return made;
  }
};
