// ---------------------------------------------------------------- the fight simulation (no drawing; deterministic; 120 Hz steps)
// Positions: x 0..400 (the arena), z is height. A fighter's "front" is the foe's side (facing), so 't' is toward the foe.
KC.ARENA = { x0: 0, x1: 400, marks: [150, 250] };
KC.BODY_W = 18;           // push box width: contact means a gap of 0
KC.WALK_AWAY = 56;        // units per second, walking back
KC.KNOCK_STEPS = 96;      // a full point or a sweep: lying down for this many steps
KC.HITSTOP_CALLS = true;

// a screen direction ('l' | 'r' | 'u' | 'd' | 'n') to a relative one for a fighter whose foe is on side foeDir (+1 right, -1 left)
KC.relDir = (screen, foeDir) => {
  if (screen === 'r') return foeDir > 0 ? 't' : 'a';
  if (screen === 'l') return foeDir > 0 ? 'a' : 't';
  return screen;
};

// a human's intent: posture from the left stick / WASD (held); the technique from the right stick or face buttons (press edges)
KC.readControl = (input, foeDir, prev) => {
  const held = (a) => input.down(a);
  let px = 'n';
  if (held('up') && !held('down')) px = 'u';
  else if (held('down') && !held('up')) px = 'd';
  else if (held('left') && !held('right')) px = 'l';
  else if (held('right') && !held('left')) px = 'r';
  let edge = null;
  if (input.pressed('tUp')) edge = 'u';
  else if (input.pressed('tDown')) edge = 'd';
  else if (input.pressed('tLeft')) edge = 'l';
  else if (input.pressed('tRight')) edge = 'r';
  // the right stick, read directly: a 4-way gate on its dominant axis, a press on the edge
  const aim = input.padAim;
  const q = aim ? KC.quantize(aim[0], -aim[1]) : null;
  if (prev) { if (q && q !== prev.padQ && !edge) edge = q; prev.padQ = q; }
  const pr = (s) => (s === 'u' || s === 'd') ? s : KC.relDir(s, foeDir);
  return { posture: pr(px), tech: edge ? pr(edge) : null };
};

// ---------------------------------------------------------------- Karateka: one fighter
KC.Karateka = class Karateka {
  constructor(o) {
    this.id = o.id; this.r = KC.DATA.roster[o.id]; this.side = o.side;
    this.stats = Object.assign({ walk: 1, reach: 1, speed: 1 }, this.r.stats || {});
    this.score = 0; this.bestPts = 0; this.hitsMade = { full: 0, half: 0, counters: 0 };
    this.intent = null;
    this.reset(false);
  }
  reset() {
    this.x = this.side === 'w' ? KC.ARENA.marks[0] : KC.ARENA.marks[1];
    this.z = 0; this.vz = 0; this.vx = 0;
    this.facing = this.side === 'w' ? 1 : -1;
    this.state = 'idle'; this.tech = null; this.crouch = false; this.flipping = false;
    this.stun = 0; this.downT = 0; this.recoilT = 0; this.pending = null; this.pendingT = 0; this.pendingPost = 'n';
    this.travel = 0; this.lastTech = null; this.guardOn = false;
  }
  get dir() { return this.facing; }
  get airborne() { return this.z > 0.01 || this.vz > 0.01; }
  // frames at 60 Hz to steps at 120 Hz, scaled by this fighter's speed and the tuning
  steps(frames) { return Math.max(1, Math.round(frames * 2 / (this.stats.speed * KC.TUNE.techSpeed))); }
  techSteps(id) {
    const T = KC.DATA.techniques[id];
    if (T.block) return { s: 1, a: Math.max(1, Math.round(KC.TUNE.blockWindow * 2)), r: 8 };
    return { s: this.steps(T.f[0]), a: this.steps(T.f[1]), r: this.steps(T.f[2]) };
  }
  // the foe's relative height rule (4.3): can this technique hit this foe right now?
  hittableBy(T, foe) {
    if (foe.state === 'down' || foe.state === 'rise') return false;
    if (foe.airborne) {
      if (T.antiAir) return foe.vz > 0;     // upper punch: only the first half of an airborne arc
      return T.height === 'high';           // only high techniques reach a jumper or a flipper
    }
    if (foe.crouch) {
      if (T.height === 'high') return false;
      if (T.height === 'mid') return !!T.hitsCrouch;
      return true;
    }
    return true;
  }
  startTech(id) {
    const T = KC.DATA.techniques[id], d = this.techSteps(id);
    this.tech = { id, ph: 0, t: 0, s: d.s, a: d.a, r: d.r, hit: false, gap: 0 };
    this.lastTech = id; this.state = 'tech';
    this.travel = T.travel ? T.travel * this.facing / (d.s + d.a) : 0;
    this.crouch = false;
    if (T.flip) { this.vz = 370; this.vx = T.travel * this.facing / 0.67; this.flipping = true; }
    else if (T.roll) { this.vx = T.travel * this.facing / 0.75; this.travel = 0; }
    else if (T.air || id === 'jump') { this.vz = KC.TUNE.jump; this.travel = T.travel ? T.travel * this.facing / (d.s + d.a) : 0; }
    if (id === 'crouch') { this.crouch = true; this.state = 'crouch'; this.tech = null; }
    if (id === 'block') this.guardOn = false;
  }
  // a press (rel posture + rel stick) while free starts a technique; returns true if it did
  tryStart(stick, posture, foe) {
    const gap = Math.abs(foe.x - this.x) - KC.BODY_W;
    const id = KC.DATA.techFor(posture || 'n', stick, gap);
    if (!id) return false;
    const T = KC.DATA.techniques[id];
    if (this.airborne && !T.air && !T.flip) return false;
    if (id === 'crouch') { if (!this.airborne) { this.startTech('crouch'); return true; } return false; }
    if (id === 'jump') { if (this.airborne) return false; this.startTech('jump'); return true; }
    this.startTech(id);
    return true;
  }
  // the intent of a free fighter (no technique) is walking, crouching or jumping
  moveIntent(dt, foe) {
    const p = this.intent ? this.intent.posture : 'n';
    const s = foe.x > this.x ? 1 : -1;
    let vx = 0;
    if (p === 't') vx = s * KC.TUNE.walk * this.stats.walk;
    else if (p === 'a') vx = -s * KC.WALK_AWAY * this.stats.walk;
    if (p === 'd' && !this.airborne) { this.crouch = true; this.state = 'crouch'; }
    else if (this.state === 'crouch') { this.crouch = false; this.state = 'idle'; }
    if (p === 'u' && !this.airborne) { this.vz = KC.TUNE.jump; this.state = 'idle'; }
    if (!this.airborne) { this.vx = vx; this.state = (this.state === 'crouch') ? 'crouch' : (vx !== 0 ? 'walk' : 'idle'); }
    this.x += this.vx * dt;
    this.clampX();
  }
  clampX() { this.x = KC.clamp(this.x, KC.ARENA.x0 + KC.BODY_W / 2, KC.ARENA.x1 - KC.BODY_W / 2); }
  knock(dir) { this.state = 'down'; this.downT = KC.KNOCK_STEPS; this.tech = null; this.crouch = false; this.flipping = false; this.x -= dir * 18; this.clampX(); }
  stagger(dir) { this.state = 'hit'; this.stun = 30; this.tech = null; this.crouch = false; this.x -= dir * 10; this.clampX(); }
  // the sim's input step: a press starts a technique; a press while busy is buffered for 0.15 s (18 steps)
  control(intent, foe) {
    this.intent = intent || { posture: 'n', tech: null };
    if (!intent || !intent.tech) return;
    if (this.state === 'down' || this.state === 'hit' || this.state === 'rise') return;
    if (this.state === 'tech' || this.airborne && this.state !== 'idle') { this.pending = intent.tech; this.pendingPost = intent.posture; this.pendingT = 18; return; }
    if (!this.tryStart(intent.tech, intent.posture, foe)) { this.pending = intent.tech; this.pendingPost = intent.posture; this.pendingT = 18; }
  }
  // one step of this fighter. live: the fight is on (movement and techniques); otherwise only the body settles.
  tick(dt, foe, live) {
    if (this.state === 'down') { this.downT--; if (this.downT <= 0) { this.state = 'rise'; this.stun = 36; } return; }
    if (this.state === 'rise') { this.stun--; if (this.stun <= 0) this.state = 'idle'; return; }
    if (this.state === 'hit') { this.stun--; if (this.stun <= 0) this.state = 'idle'; return; }
    if (this.recoilT > 0) this.recoilT -= dt;
    // flight
    if (this.z > 0 || this.vz !== 0) {
      this.vz -= KC.TUNE.gravity * dt; this.z += this.vz * dt;
      if (this.z <= 0) { this.z = 0; this.vz = 0; this.flipping = false; this.vx = 0; if (this.tech && this.tech.ph < 2 && (KC.DATA.techniques[this.tech.id].air || KC.DATA.techniques[this.tech.id].flip)) { this.tech.ph = 2; this.tech.t = 0; } }
    }
    if (this.state === 'tech' && this.tech) {
      const T = KC.DATA.techniques[this.tech.id], k = this.tech;
      if (k.ph === 0) { k.t++; if (k.t >= k.s) { k.ph = 1; k.t = 0; } }
      if (k.ph === 1) {
        k.t++;
        if (!this.airborne && this.travel) this.x += this.travel;
        if (T.block) this.guardOn = true;
        if (k.t >= k.a) { k.ph = 2; k.t = 0; this.guardOn = false; }
      }
      if (k.ph === 2) {
        k.t++;
        if (T.roll || T.flip) { this.x += this.vx * dt; }
        if (k.t >= k.r) this.endTech();
      }
      if (T.roll && this.tech && this.tech.ph === 2) this.vx *= 0.9;
      if (this.tech && (T.flip || T.air)) this.x += this.vx * dt;
    }
    if (this.state === 'tech' && this.tech && this.tech.ph === 1 && this.tech.id === 'block') this.guardOn = true;
    if (this.pendingT > 0) { this.pendingT--; if (this.pendingT <= 0) this.pending = null; }
    if (live && this.state !== 'tech' && this.intent) {
      // a buffered press fires on the first free step
      if (this.pending && this.state !== 'crouch' && !this.airborne) {
        const st = this.pending; this.pending = null; this.pendingT = 0;
        if (this.tryStart(st, this.pendingPost, foe)) return this.afterStart(foe);
      }
      if (this.intent.tech) { this.intent.tech = null; } // the press was spent on the start in control()
      this.moveIntent(dt, foe);
    } else if (this.state !== 'tech' && this.state !== 'down' && this.state !== 'hit' && this.state !== 'rise') {
      this.clampX();
    }
    if (this.state !== 'tech' && !this.airborne && foe) this.facing = foe.x >= this.x ? 1 : -1;
    if (this.state === 'tech' && this.tech && this.tech.id === 'block') this.facing = foe.x >= this.x ? 1 : -1;
    if (this.state !== 'tech' && this.state !== 'down' && this.state !== 'rise') this.clampX();
    if (this.state === 'tech' && !this.airborne && this.tech && !KC.DATA.techniques[this.tech.id].air && !KC.DATA.techniques[this.tech.id].flip) this.vx = 0;
  }
  afterStart() { }
  endTech() {
    this.tech = null; this.state = this.z > 0 ? 'idle' : 'idle';
    this.guardOn = false; this.travel = 0; this.flipping = this.z > 0 && this.flipping;
    if (!this.airborne) this.vx = 0;
  }
  // rig state: serializable (6.1), so a replay or a guest poses the same way
  poseState() {
    const k = this.tech;
    return { id: this.id, x: this.x, z: this.z, facing: this.facing, state: this.state, tech: k ? k.id : null, ph: k ? k.ph : -1, t: k ? k.t : 0, crouch: this.crouch, down: this.state === 'down' ? 1 : 0, flip: this.flipping, guard: this.guardOn };
  }
};

// ---------------------------------------------------------------- Bout: the referee's state machine (5.2), the scoring (4.5), the hantei (5.2)
KC.PHASE_SEC = { intro: 1.2, rei: 0.9, card: 0.9, ready: 0.4, hajime: 0.6, yame: 0.9, award: 1.2, roundEnd: 2.0, time: 0.8, hantei: 2.4, matchEnd: 2.5 };
KC.Bout = class Bout {
  constructor(o) {
    this.a = o.white; this.b = o.red;               // a = white, the left mark
    this.seed = (o.seed >>> 0) || 1;
    this.judgeRng = [E.rng(this.seed + 1), E.rng(this.seed + 2)];
    this.roundsToWin = o.roundsToWin || KC.TUNE.roundsToWin;
    this.pointsToWin = o.pointsToWin || KC.TUNE.pointsToWin;
    this.listeners = {};
    this.round = 1; this.roundWins = [0, 0]; this.matchOver = null; this.roundWinner = null; this.rounds = [];
    this.pace = KC.TUNE.refPace || 1;
    this.clockStart = KC.TUNE.clock; this.clock = this.clockStart;
    this.points = [0, 0]; this.stats = [this.emptyStats(), this.emptyStats()];
    this.attempts = [0, 0]; this.techPts = [0, 0]; this.blocksRound = [0, 0];
    this.pending = null; this.hitstopT = 0; this.lastCall = null; this.lastPoint = null; this.lastLanded = null;
    this.steps = 0; this.log = []; this.intro = o.intro !== false;
    this.setPhase(this.intro ? 'intro' : 'rei');
  }
  emptyStats() { return { full: 0, half: 0, blocks: 0, counters: 0 }; }
  on(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); return this; }
  emit(name, data) {
    this.log.push(name); if (this.log.length > 200) this.log.shift();
    (this.listeners[name] || []).forEach(f => f(data));
  }
  call(id, sub) {
    const pair = KC.TEXT.calls[id]; const text = pair ? pair[KC.callLang()] : id;
    this.lastCall = { id, text, sub: sub || null, step: this.steps };
    this.emit('call', this.lastCall);
    return text;
  }
  setPhase(p) {
    this.phase = p; this.phaseT = 0;
    this.phaseLen = KC.PHASE_SEC[p] !== undefined ? KC.PHASE_SEC[p] * this.pace : 0;
    if (p === 'intro') { this.a.x = 8; this.b.x = 392; this.a.facing = 1; this.b.facing = -1; }
    if (p === 'rei') { this.a.state = this.b.state = 'bow'; this.call('bow'); }
    if (p === 'ready') { this.a.reset(); this.b.reset(); }
    if (p === 'hajime') { this.call('begin'); }
    if (p === 'fight') { this.clock = this.clockStart; this.attempts = [0, 0]; this.techPts = [0, 0]; this.blocksRound = [0, 0]; this.emit('fight', {}); }
    if (p === 'yame') { this.call('stop'); }
    if (p === 'roundEnd') { this.emit('roundEnd', { winner: this.roundWinner }); }
    if (p === 'matchEnd') { this.emit('matchEnd', { winner: this.matchOver }); }
  }
  get fighters() { return [this.a, this.b]; }
  get frozen() { return this.hitstopT > 0; }
  // one fixed step; ctl = { a(): intent, b(): intent } read during the fight
  step(dt, ctl) {
    this.steps++; this.phaseT += dt;
    const p = this.phase;
    if (p === 'intro') { this.walkToMarks(dt, 60); if (this.phaseT >= this.phaseLen) this.setPhase('rei'); return; }
    if (p === 'rei') { if (this.phaseT >= this.phaseLen) this.setPhase('card'); return; }
    if (p === 'card') { this.a.state = this.b.state = 'idle'; if (this.phaseT >= this.phaseLen) this.setPhase('ready'); return; }
    if (p === 'ready') { this.a.state = this.b.state = 'idle'; if (this.phaseT >= this.phaseLen) this.setPhase('hajime'); return; }
    if (p === 'hajime') { if (this.phaseT >= this.phaseLen) this.setPhase('fight'); return; }
    if (p === 'fight') return this.fight(dt, ctl);
    if (p === 'yame') { this.tickBoth(dt, false); if (this.phaseT >= this.phaseLen) this.setPhase('award'); return; }
    if (p === 'award') { this.tickBoth(dt, false); if (this.phaseT >= this.phaseLen) this.afterAward(); return; }
    if (p === 'reset') { this.walkToMarks(dt, 144); if (this.atMarks() || this.phaseT > 1.8) this.setPhase('card'); return; }
    if (p === 'roundEnd') { if (this.phaseT >= this.phaseLen) (this.matchOver !== null ? this.setPhase('matchEnd') : this.nextRound()); return; }
    if (p === 'time') { if (this.phaseT >= this.phaseLen) this.setPhase('hantei'); return; }
    if (p === 'hantei') { if (this.phaseT >= this.phaseLen) this.afterHantei(); return; }
    if (p === 'matchEnd') { if (this.phaseT >= this.phaseLen) this.emit('done', { winner: this.matchOver }); return; }
  }
  atMarks() { return Math.abs(this.a.x - KC.ARENA.marks[0]) < 0.5 && Math.abs(this.b.x - KC.ARENA.marks[1]) < 0.5; }
  walkToMarks(dt, speed) {
    for (const [f, t] of [[this.a, KC.ARENA.marks[0]], [this.b, KC.ARENA.marks[1]]]) {
      const d = t - f.x, s = Math.min(Math.abs(d), speed * dt);
      f.x += Math.sign(d) * s; f.state = Math.abs(d) > 0.5 ? 'walk' : 'idle';
      f.facing = f === this.a ? 1 : -1;
    }
  }
  tickBoth(dt, live) { this.a.tick(dt, this.b, live); this.b.tick(dt, this.a, live); }
  nextRound() { this.round++; this.points = [0, 0]; this.setPhase('reset'); }
  afterAward() {
    if (this.points[0] >= this.pointsToWin || this.points[1] >= this.pointsToWin) {
      return this.endRound(this.points[0] >= this.pointsToWin ? 0 : 1, 'points');
    }
    if (this.clock <= 0) { this.setPhase('time'); return; }
    this.setPhase('reset');
  }
  endRound(side, why) {
    this.roundWinner = side; this.roundWins[side]++;
    const bonus = (this.clock > 0 && why === 'points') ? Math.floor(this.clock) * 100 : 0;
    if (bonus) this.stats[side].bonus = (this.stats[side].bonus || 0) + bonus;
    this.rounds.push({ winner: side, points: this.points.slice(), why, stats: this.stats.map(s => Object.assign({}, s)) });
    this.matchOver = this.roundWins[side] >= this.roundsToWin ? side : null;
    this.call(side === 0 ? 'whiteWins' : 'redWins');
    this.setPhase('roundEnd');
  }
  fight(dt, ctl) {
    if (this.hitstopT > 0) { this.hitstopT -= dt; return; }
    if (!KC.TOGGLES.infiniteTime && !this.pending) this.clock = Math.max(0, this.clock - dt * KC.TUNE.gameSpeed);
    if (this.clock <= 0 && !this.pending) { this.call('time'); return this.setPhase('time'); }
    // a short run with a settled score: nothing new is awarded while the pending hit is in its window
    if (this.phaseT >= 0.35 * this.pace) {
      const iA = ctl && ctl.a ? ctl.a() : null, iB = ctl && ctl.b ? ctl.b() : null;
      this.a.control(iA, this.b); this.b.control(iB, this.a);
    }
    this.tickBoth(dt, true);
    const hits = [this.checkHit(this.a, this.b), this.checkHit(this.b, this.a)].filter(Boolean);
    if (this.pending) {
      if (hits.some(h => h.side !== this.pending.first.side)) { return this.aiuchi(); }
      this.pending.t--;
      if (this.pending.t <= 0) this.award(this.pending.first);
      return;
    }
    if (hits.length) {
      this.pending = { first: hits[0], t: 6 };
      if (hits.length > 1) return this.aiuchi();
    }
  }
  aiuchi() {
    this.pending = null;
    this.call('aiuchi'); this.emit('aiuchi', {});
    this.stats.forEach(s => s.aiuchi = (s.aiuchi || 0) + 1);
    this.hitstopT = KC.TUNE.hitstop;
    this.setPhase('yame');
  }
  // a technique has connected: score it (4.5), or the block (4.4); returns the landed record, or null
  checkHit(att, def) {
    if (att.state !== 'tech' || !att.tech || att.tech.hit || att.tech.ph !== 1) return null;
    const T = KC.DATA.techniques[att.tech.id];
    if (!T.reach) return null;
    if (KC.TOGGLES.p1Invincible && att === this.b && def === this.a) return null;   // dev: the CPU cannot score on P1
    const dirOk = T.spin || T.flip || (def.x - att.x) * att.facing >= 0;
    if (!dirOk) return null;
    const gap = Math.abs(def.x - att.x) - KC.BODY_W;
    const maxR = T.reach[1] * KC.TUNE.reachScale * att.stats.reach;
    if (gap > maxR) return null;
    if (!att.hittableBy(T, def)) return null;
    att.tech.hit = true; att.tech.gap = gap;
    const side = att === this.a ? 0 : 1;
    // a guard stops high and mid techniques (not the unblockable low ones); the attacker is pushed back and recovers 10 frames later
    if (def.tech && def.tech.id === 'block' && def.guardOn && !T.unblockable) {
      this.stats[1 - side].blocks++; this.blocksRound[1 - side]++;
      att.x -= att.facing * 14; att.tech.r += this.steps10(); att.recoilT = 0.2;
      def.tech.ph = 2; def.tech.t = def.tech.r; def.guardOn = false;
      this.emit('block', { by: 1 - side, tech: T.name });
      this.lastBlock = { by: 1 - side, step: this.steps };
      return null;
    }
    const k = att.tech;
    const frac = k.a > 1 ? Math.min(1, (k.t - 1) / (k.a - 1)) : 0;
    const timingQ = frac <= 0.4 ? 1 : Math.max(0.3, 1 - (frac - 0.4) / 0.6 * 0.7);
    const r0 = T.reach[0], r1 = Math.max(r0 + 1, T.reach[1] * KC.TUNE.reachScale * att.stats.reach);
    const spacingQ = Math.min(1, KC.clamp((gap - r0) / (r1 - r0), 0, 1) / 0.7);
    let q = Math.max(0.15, 0.5 * timingQ + 0.5 * spacingQ);
    if (att.r.sig === k.id) q = Math.min(1, q + 0.1);
    if (T.antiAir && def.airborne) q = Math.min(1, q + 0.25);
    let pts = KC.clamp(T.pts[0] + Math.round((T.pts[1] - T.pts[0]) * q / 100) * 100, T.pts[0], T.pts[1]);
    const counter = (def.state === 'tech' && def.tech && def.tech.id !== 'block') || def.recoilT > 0;
    if (counter) pts = Math.min(1000, Math.round(pts * KC.TUNE.counterMul));
    const full = pts >= KC.TUNE.fullAt;
    return { att, def, side, T, id: k.id, pts, full, counter, q, timingQ, spacingQ, gap, knock: full || !!T.knockdown };
  }
  steps10() { return 20; }
  award(p) {
    const sc = p.side;
    this.points[sc] += p.full ? 1 : 0.5;
    this.techPts[sc] += p.pts;
    this.attempts[sc]++;
    const st = this.stats[sc];
    if (p.full) st.full++; else st.half++;
    if (p.counter) st.counters++;
    p.att.score += p.pts; p.att.bestPts = Math.max(p.att.bestPts, p.pts);
    p.att.hitsMade[p.full ? 'full' : 'half']++; if (p.counter) p.att.hitsMade.counters++;
    this.lastPoint = { side: sc, pts: p.pts, full: p.full, counter: p.counter, tech: p.id, q: p.q, timingQ: p.timingQ, spacingQ: p.spacingQ, gap: p.gap };
    if (p.knock) p.def.knock(p.att.facing); else p.def.stagger(p.att.facing);
    this.hitstopT = KC.TUNE.hitstop;
    this.pending = null;
    this.emit('point', this.lastPoint);
    this.call(p.full ? 'full' : 'half', p.counter ? 'COUNTER' : null);
    this.setPhase('yame');
  }
  afterHantei() {
    const sA = this.techPts[0] + 60 * this.attempts[0] + 40 * this.blocksRound[0];
    const sB = this.techPts[1] + 60 * this.attempts[1] + 40 * this.blocksRound[1];
    const vA = sA + (this.judgeRng[0]() * 2 - 1) * 120, vB = sB + (this.judgeRng[1]() * 2 - 1) * 120;
    const winner = vA === vB ? (this.lastPoint ? this.lastPoint.side : 0) : (vA > vB ? 0 : 1);
    this.emit('hantei', { winner }); this.call('judges');
    if (this.points[0] !== this.points[1]) this.endRound(this.points[0] > this.points[1] ? 0 : 1, 'time');
    else this.endRound(winner, 'hantei');
  }
  timeOut() { return this.clock <= 0; }
};
KC.callLang = () => (KC.settings && KC.settings.calls === 'Japanese') ? 1 : 0;
KC.settings = { calls: 'English' };

// ---------------------------------------------------------------- the CPU (6.1). Its output is the same intent a human makes.
KC.levelParams = (L) => {
  const t = (L - 1) / 9, s = (a, b) => a + (b - a) * t;
  return { react: s(0.55, 0.12) * KC.TUNE.cpuReact, think: s(0.50, 0.14), readP: s(0.25, 0.92), mistake: s(0.30, 0.02) };
};
KC.DATA.inverse = (() => {
  const inv = {};
  for (const p of Object.keys(KC.DATA.matrix)) for (const s of Object.keys(KC.DATA.matrix[p])) {
    const id = KC.DATA.matrix[p][s]; if (!inv[id]) inv[id] = { posture: p, stick: s };
  }
  inv.revPunch = { posture: 'n', stick: 't' }; inv.frontKick = { posture: 'n', stick: 't' };
  return inv;
})();
KC.KarateAI = class KarateAI {
  constructor(fighter, seed, o = {}) {
    this.f = fighter; this.rng = E.rng((seed >>> 0) || 1);
    const base = fighter.r.ai || { level: 3, aggr: .5, patience: .4, jump: .1, block: .3, gap: 40, weights: { roundKick: 1 } };
    this.L = KC.TUNE.cpuLevel > 0 && !o.noOverride ? KC.TUNE.cpuLevel : (o.level || base.level);
    this.p = KC.levelParams(this.L);
    this.ai = base;
    this.aggr = KC.TUNE.cpuAggression >= 0 ? KC.TUNE.cpuAggression : base.aggr;
    this.think = 0; this.hold = { posture: 'n', tech: null }; this.holdT = 0;
    this.delayed = []; this.seen = null;
  }
  observe(foe) {
    return { tech: foe.tech ? foe.tech.id : null, ph: foe.tech ? foe.tech.ph : -1, air: foe.airborne, crouch: foe.crouch, down: foe.state === 'down' || foe.state === 'rise', gap: Math.abs(foe.x - this.f.x) - KC.BODY_W };
  }
  intent(foe, dt) {
    this.delayed.push(this.observe(foe));
    const delay = Math.max(1, Math.round(this.p.react * 120));
    while (this.delayed.length > delay) this.seen = this.delayed.shift();
    this.think -= dt;
    if (this.think > 0) return { posture: this.hold.posture, tech: null };
    this.think = this.p.think * (0.9 + 0.2 * this.rng());
    const seen = this.seen || this.observe(foe), gap = Math.abs(foe.x - this.f.x) - KC.BODY_W;
    let out = null;
    if (seen.tech && (seen.ph === 0 || seen.ph === 1) && this.rng() < this.p.readP) {
      const T = KC.DATA.techniques[seen.tech];
      if (T.height === 'low') out = this.rng() < this.ai.jump + 0.4 ? { posture: 'u', tech: null } : null;
      else if (T.height === 'high') out = this.rng() < 0.6 ? { posture: 'd', tech: null } : { posture: 'a', tech: null };
      else if (T.height === 'mid') out = this.rng() < this.ai.block ? { posture: 'a', tech: 't' } : { posture: 'a', tech: null };
      if (seen.air && gap < 40) out = { posture: 'd', tech: 'u' };
    }
    if (!out && seen.ph === 2 && gap <= 40 && this.rng() < 0.85) out = this.best(gap);
    if (!out) {
      const pick = this.pickWeighted(gap);
      if (pick && this.rng() < this.aggr) out = pick;
      else out = { posture: gap > this.ai.gap + 6 ? 't' : (gap < this.ai.gap - 6 ? 'a' : 'n'), tech: null };
    }
    if (this.rng() < this.p.mistake) out = { posture: 'n', tech: KC.pick(this.rng, ['u', 't', 'd', 'a']) };
    this.hold = { posture: out.posture, tech: null };
    return Object.assign({}, out);
  }
  best(gap) {
    let best = null, bestW = -1;
    for (const id of Object.keys(this.ai.weights)) {
      const T = KC.DATA.techniques[id]; if (!T || !T.reach || gap < T.reach[0] || gap > T.reach[1]) continue;
      if (this.ai.weights[id] > bestW) { bestW = this.ai.weights[id]; best = id; }
    }
    const inv = best && KC.DATA.inverse[best];
    return inv ? { posture: inv.posture, tech: inv.stick } : null;
  }
  pickWeighted(gap) {
    const ids = Object.keys(this.ai.weights).filter(id => { const T = KC.DATA.techniques[id]; return T && T.reach && gap >= T.reach[0] - 6 && gap <= T.reach[1] + 6; });
    if (!ids.length) return null;
    const total = ids.reduce((s, id) => s + this.ai.weights[id], 0);
    let r = this.rng() * total, pick = ids[0];
    for (const id of ids) { r -= this.ai.weights[id]; if (r <= 0) { pick = id; break; } }
    const inv = KC.DATA.inverse[pick];
    return inv ? { posture: inv.posture, tech: inv.stick } : null;
  }
};
KC.pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
