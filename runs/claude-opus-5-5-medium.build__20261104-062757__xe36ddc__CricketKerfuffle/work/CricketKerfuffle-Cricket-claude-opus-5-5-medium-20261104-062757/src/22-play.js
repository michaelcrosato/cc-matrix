// ---- the delivery director (5.7.3): setup -> runup -> flight -> inPlay -> dead -> between, every state with a timeout.
// Bowling (5.2), batting (5.3), running (5.4), fielding (5.5), umpiring (5.6). Each role reads a pad: a human player's
// input, or a virtual pad an AI brain presses (23-ai.js), so the CPU, the attract mode and the bots play through the
// same code as a person.
const ACTIONS = ['shot', 'loft', 'block', 'special', 'run', 'back', 'charge'];
function mkActor(p, role) { return { p, role, x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, anim: 'idle', animT: 0, sw: null, expr: null, state: 'set', hasBall: false, slow: 1, home: [0, 0], tx: 0, ty: 0, alpha: 1, dive: 0, signal: null, end: 0, target: null, sp: 0, lane: 0 }; }
// batter-frame angle θ (+ off side, 0 straight at the bowler) <-> world direction, for a batter of hand h
const dirOf = (th, h) => [-h * Math.sin(th), Math.cos(th)];
const angOf = (dx, dy, h) => Math.atan2(-h * dx, dy);

Object.assign(Match.prototype, {
  // ---------------------------------------------------------------- per step
  update(dt) {
    this.t += dt; this.st += dt;
    this._think(dt);
    const s = this.state;
    if (s === 'pre') { if (this.st > (this.cfg.mode === 'hub' ? .1 : 1.2)) this._go('between'); }
    else if (s === 'between') this._between(dt);
    else if (s === 'setup') this._setup(dt);
    else if (s === 'runup') this._runup(dt);
    else if (s === 'flight') this._flight(dt);
    else if (s === 'inPlay') this._inPlay(dt);
    else if (s === 'dead') this._dead(dt);
    else if (s === 'break') this._break(dt);
    if (this.chaosStep) this.chaosStep(dt);
    this._actors(dt);
    this._record(dt);
    for (const v of Object.values(this.vpads || {})) v._tick();
  },
  _go(s) { this.state = s; this.st = 0; emit('state', { s }); },
  pad(role) { const h = this.ctlFor(role); return h || this.vpad(role); },
  vpad(role) { this.vpads = this.vpads || {}; return this.vpads[role] || (this.vpads[role] = new VPad()); },
  isHuman(role) { return !!this.ctlFor(role); },
  // ---------------------------------------------------------------- between balls
  _between(dt) {
    const I = this.I;
    if (this.result) { if (this.state !== 'over') this._go('over'); return; }
    if (!I.bowler) {
      const list = this.eligibleBowlers();
      if (this.isHuman('bowl') && list.length > 1 && this.cfg.mode !== 'hub') {
        this.needBowler = list;   // the scene shows the bowler picker; pickBowler(id) answers
        if (this.st < 20) return;
      }
      this.setBowler(this.aiPickBowler(list).id); this.needBowler = null;
      this._overStart();
    }
    if (this.holdFor > 0) { this.holdFor -= dt; return; }
    this._placeAll(); this._go('setup');
  },
  pickBowler(id) { if (!this.needBowler) return; this.needBowler = null; this.setBowler(id); this._overStart(); },
  _overStart() {
    // a new over: the CPU captain's field, chaos events, an item token
    const I = this.I, pb = this.bowlerP();
    if (!this.isHuman('field')) this.fieldPreset[this.bowlT] = this.aiPickField();
    this.keeperUp = pb && pb.bowl && pb.bowl.fam !== 'pace' && pb.bowl.fam !== 'machine' && pb.bowl.fam !== 'swing';
    if (this.chaosOverStart) this.chaosOverStart();
    if (this.cfg.kerfuffle && !this.dev.noChaos && this.cfg.mode !== 'hub' && rp() < .35 * T('chaosRate')) this.spawnToken();
    emit('over:start', { over: Math.floor(I.legal / 6) + 1, bowler: pb ? pb.short : '' });
  },
  spawnToken(id, at) {
    const th = (rp() * 2 - 1) * 2.6, d = 150 + rp() * 260, h = this.strikerHand(), w = dirOf(th, h);
    id = id || pick(BAT_ITEMS, rp);
    this.token = { id, x: at ? at[0] : w[0] * d, y: at ? at[1] : w[1] * d, z: at ? at[2] : (rp() < .5 ? 6 : 26), t: 0 };
    emit('token', { id });
  },
  strikerHand() { const c = this.striker(); return c ? (c.p.hand || 1) : 1; },
  // ---------------------------------------------------------------- the field
  _ensureActors() {
    if (this._actorsFor === this.i + ':' + this.I.bat) return;
    this._actorsFor = this.i + ':' + this.I.bat;
    const fs = this.squads[this.bowlT];
    this.fielders = fs.map(p => mkActor(p, 'field'));
    this.batters = [mkActor(null, 'bat'), mkActor(null, 'bat')];
    if (!this.umps.length) this.umps = [mkActor({ id: 'ump1', name: 'Rev. Hollis', short: 'HOLLIS', ump: true, voice: 150 }, 'ump'), mkActor({ id: 'ump2', name: 'Mr Plimsoll', short: 'PLIMSOLL', ump: true, voice: 140 }, 'ump')];
  },
  fieldSpots() {
    const pre = FIELDS[this.fieldPreset[this.bowlT]] || FIELDS.balanced, h = this.strikerHand();
    return pre.spots.map(([name, th, d]) => {
      const w = dirOf(th * DEG, h), dist = d === 'b' ? this.boundaryDist(w[0], w[1]) - 30 : d;
      return { name, x: w[0] * dist, y: w[1] * dist };
    });
  },
  _placeAll() {
    this._ensureActors();
    const I = this.I, h = this.strikerHand(), sc = this.striker(), ns = this.nonStriker(), pb = this.bowlerP();
    const [b0, b1] = this.batters;
    b0.card = I.strikeCard; b0.p = sc.p; b1.card = I.nonCard; b1.p = ns.p;
    Object.assign(b0, { x: 5 * h, y: 14, z: 0, vx: 0, vy: 0, facing: h > 0 ? Math.PI : 0, anim: 'stance', animT: 0, sw: null, end: 0, target: null, sp: 0, dive: 0, lane: 8 * h, charged: 0, expr: null, out: false, slip: 0 });
    Object.assign(b1, { x: -14, y: 318, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, anim: 'backup', animT: 0, sw: null, end: 1, target: null, sp: 0, dive: 0, lane: -10, expr: null, out: false, slip: 0 });
    const fam = pb && pb.bowl ? pb.bowl.fam : 'pace';
    this.runLen = { pace: 170, swing: 140, medium: 110, spin: 40, machine: 30 }[fam] || 120;
    const spots = this.fieldSpots();
    let k = 0;
    const keeperIdx = this.fielders.findIndex(f => f.p.keeper);
    for (const f of this.fielders) {
      Object.assign(f, { vx: 0, vy: 0, z: 0, state: 'set', hasBall: false, anim: 'ready', animT: 0, dive: 0, expr: null, catchT: 0, alpha: f.p.ghost ? .6 : 1, slow: f.slow || 1 });
      if (f.p.machine && f.p.id !== I.bowler) { f.role = 'parked'; f.home = [-(this.g.rx + 70), 500]; f.facing = 0; f.anim = 'ready'; }
      else if (f.p.id === I.bowler) { f.role = 'bowler'; f.home = [this.overRound === 'over' ? 9 : -9, 300 + this.runLen]; f.facing = -Math.PI / 2; f.anim = 'mark'; }
      else if (f === this.fielders[keeperIdx]) { f.role = 'keeper'; f.home = [(this.keeperUp ? -9 : -5) * h, this.keeperUp ? -28 : -150]; f.facing = Math.PI / 2; f.anim = 'keep'; }
      else { f.role = 'field'; const s = spots[k++ % spots.length]; f.home = [s.x, s.y]; f.spot = s.name; f.facing = Math.atan2(-s.y, -s.x); }
      if (this.ball.phase !== 'held' || this.st === 0 || hyp(f.x - f.home[0], f.y - f.home[1]) > 120 || f.role !== 'field') { f.x = f.home[0]; f.y = f.home[1]; }
      f.tx = f.home[0]; f.ty = f.home[1];
    }
    // more than eleven-a-side spots go spare: the machine's team has no bowler to place, so it stands by the machine
    const [u1, u2] = this.umps;
    Object.assign(u1, { x: this.overRound === 'over' ? -24 : 24, y: 346, facing: -Math.PI / 2, anim: 'umpire', signal: null, animT: 0 });
    Object.assign(u2, { x: 200 * h, y: 12, facing: Math.PI, anim: 'umpire', signal: null, animT: 0 });
    const b = this.ball = newBall(); b.phase = 'held';
    this.holos = []; this.swing = null; this.ballRec = null; this.catchQTE = null; this.throwQ = null; this.runCalled = false;
    this.batSpecial = null; this.noBall = false; this.legByes = false; this.byes = false; this.appeal = null; this.stumpsDown = null; this.stumpingAt = null; this.aim = null;
    this.contact = null; this.padHit = null; this.wideCalled = false; this.decision = null; this.review = null; this.third = null; this.replay = null; this.runout = null; this.catcher = null;
    this.boundaryHit = 0; this.runs = 0; this.bananaUsed = false; this.flyT = 0; this.again = false; this.thrownBy = null; this.chaser = null; this.intercept = null; this.bowlPlan = null; this.aiMeter = null;
    for (const f of this.fielders) { f.misfielded = false; f.phantom = 0; }
  },
  bowler() { return this.fielders.find(f => f.role === 'bowler'); },
  keeper() { return this.fielders.find(f => f.role === 'keeper'); },
  // ---------------------------------------------------------------- setup: choose a delivery, place the marker
  _setup(dt) {
    const pad = this.pad('bowl'), pb = this.bowlerP(), human = this.isHuman('bowl');
    if (!pb) { this._go('between'); return; }
    const dels = pb.bowl.del;
    if (human) {
      const m = pad.move(), mg = pad.mouseGround ? pad.mouseGround() : null;
      if (mg) { this.marker.x = mg[0]; this.marker.y = mg[1]; }
      else { this.marker.x += m[0] * 70 * dt; this.marker.y += m[1] * 110 * dt; }
      this._clampMarker();
      if (pad.pressed('run') && !this.cfg.cheat) { const k = FIELD_ORDER.indexOf(this.fieldPreset[this.bowlT]); this.fieldPreset[this.bowlT] = FIELD_ORDER[(k + 1) % FIELD_ORDER.length]; this._placeAll(); emit('field', { preset: this.fieldPreset[this.bowlT] }); return; }
      if (pad.pressed('back')) { this.overRound = this.overRound === 'over' ? 'round' : 'over'; this._placeAll(); emit('overRound', { v: this.overRound }); return; }
    }
    let pickD = null, special = false;
    if (pad.pressed('shot')) pickD = dels[0]; else if (pad.pressed('loft')) pickD = dels[1]; else if (pad.pressed('block')) pickD = dels[2];
    else if (pad.pressed('special') && this.specialReady(this.bowlT)) { special = true; pickD = dels[0]; }
    if (this.dev.forceDelivery) { pickD = this.dev.forceDelivery.del || pickD || dels[0]; }
    if (!pickD && this.st > 20) pickD = dels[0];   // the nudge: nobody pressed for 20 s
    if (pickD) {
      this.del = { id: pickD, special: special ? this.bowlSpecialId() : null };
      if (special) this.useSpecial(this.bowlT, this.del.special);
      this.forceGrade = this.dev.forceDelivery && this.dev.forceDelivery.grade || null;
      if (this.dev.forceDelivery && this.dev.forceDelivery.target) { this.marker.x = this.dev.forceDelivery.target[0]; this.marker.y = this.dev.forceDelivery.target[1]; }
      if (this.dev.forceDelivery && !this.dev.forceDelivery.keep) this.dev.forceDelivery = null;
      this.meter = { p: 0, lock: null, on: false };
      const fam = DELIVERIES[pickD].fam;
      this.runupDur = RUNUP[fam] || 1.5;
      if (pb.machine) this.runupDur = 1.0;
      this.bowler().anim = 'runup'; this.bowler().animT = 0; if (pb.machine) sfx('steam');
      this._go('runup');
    }
  },
  _clampMarker() { this.marker.x = clamp(this.marker.x, -30, 30); this.marker.y = clamp(this.marker.y, 20, 240); },
  specialReady(t) { return this.cfg.kerfuffle && (this.hype[t] >= 100 || this.dev.infiniteHype) && !this.pendingSpecial[t]; },
  bowlSpecialId() { const p = this.bowlerP(); return (p && p.bsp) || 'kerfBall'; },
  batSpecialId() { const c = this.striker(); return (c && c.p.sp) || 'kerfShot'; },
  useSpecial(t, id) {
    this.hype[t] = id === 'chirp' ? Math.max(0, this.hype[t] - 50) : 0;
    if (this.dev.infiniteHype) this.hype[t] = 100;
    this.pendingSpecial[t] = id; cover('special:' + id); emit('special', { id, name: SPECIALS[id].name, team: t });
  },
  // ---------------------------------------------------------------- the run-up and the release meter
  _runup(dt) {
    const pad = this.pad('bowl'), human = this.isHuman('bowl'), bw = this.bowler(), dur = this.runupDur;
    const u = Math.min(1, this.st / dur);
    bw.y = 300 + this.runLen * (1 - u) + 4; bw.vy = -this.runLen / dur; bw.animT = this.st;
    if (human) { const m = pad.move(); this.marker.x += m[0] * 35 * dt; this.marker.y += m[1] * 55 * dt; const mg = pad.mouseGround ? pad.mouseGround() : null; if (mg) { this.marker.x = mg[0]; this.marker.y = mg[1]; } this._clampMarker(); }
    const mw = .7, special = !!this.del.special;
    if (this.st > dur - mw) {
      this.meter.on = true;
      const ph = (this.st - (dur - mw)) * T('meterSpeed'); this.meter.p = 1 - Math.abs(1 - (ph * 2) % 2);
      if (!this.meter.lock && (pad.pressed('shot') || pad.pressed('loft') || pad.pressed('block') || pad.pressed('special'))) this.meter.lock = this._meterGrade(this.meter.p);
      if (this.aiMeter && !human && !this.meter.lock && this.st >= dur - mw + this.aiMeter.at) this.meter.lock = this.aiMeter.grade;
    }
    // batting specials are armed during the run-up (or flight) by the batter
    this._batSpecialPress();
    this._chargePress();
    if (this.st >= dur) this._release(special ? 'green' : (this.meter.lock || 'amber'));
  },
  _meterGrade(p) {
    const pb = this.bowlerP(), sk = pb && pb.bowl ? pb.bowl.skill : 6, half = T('meterSweet') * (.8 + sk * .04) / 2;
    if (p > .94) return 'over';
    const d = Math.abs(p - .5);
    return d <= half ? 'green' : d <= half + .18 ? 'amber' : 'red';
  },
  _release(grade) {
    if (this.cfg.mode === 'hub') RNG.play = E.rng((this.cfg.seed + (this.ballNo + 1) * 7919) >>> 0);   // every copy draws this ball the same
    if (this.forceGrade) { grade = this.forceGrade; this.forceGrade = null; }
    const pb = this.bowlerP(), d0 = DELIVERIES[this.del.id], sp = this.del.special, h = this.strikerHand(), b = this.ball;
    let d = Object.assign({}, d0), kmh = d.kmh[0] + rp() * (d.kmh[1] - d.kmh[0]);
    const q = { green: [2, 1.02], amber: [10, .9], red: [18, .8], over: [10, .9] }[grade] || [10, .9];
    let tx = this.marker.x, ty = this.marker.y;
    const ang = rp() * TAU, sc = this.forced ? 0 : q[0] * Math.sqrt(rp()); tx += Math.cos(ang) * sc * .45; ty += Math.sin(ang) * sc * 1.4;
    kmh *= q[1] * (grade === 'green' ? 1 + rp() * .03 : 1);
    if (this.fire.bowlOn) kmh *= 1.1;
    b.multi = 1; b.fx = null; b.bounceK = d.bounce; b.wob = (d.wob || 0); b.spinGrip = d.fam === 'spin' ? .08 : 0;
    let swing = d.swing, turn = d.turn;
    if (d.turnRand) turn = (rp() < .5 ? -1 : 1) * turn;
    if (d.wob && d.fam === 'swing') swing = (rp() * 2 - 1) * d.wob;
    // the specials (8.6)
    this.effects = { edgeK: 1, winK: 1, aiK: 1, lbwSeek: false, vanish: false, sawn: false, sunburn: false };
    if (sp === 'kerfBall') { kmh *= 1.15; swing *= 2; b.fx = 'fire'; }
    if (sp === 'vicar') { d = DELIVERIES.yorker; kmh = 155; swing = -1.2; tx = 1.5 * h; ty = 28; b.fx = 'holy'; this.effects.edgeK = 1.5; b.bounceK = .9; }
    if (sp === 'grandad') { kmh = 62; turn = 7; b.multi = 3; ty = Math.max(ty, 150); tx = 4 * h; b.fx = 'dust'; this.effects.winK = .5; b.bounceK = 1.2; }
    if (sp === 'chirp') { this.effects.winK = .7; this.effects.aiK = 2; }
    if (sp === 'dibbly') { kmh = 80; b.wob = .6; this.effects.aiK = 2; b.fx = 'wobble'; }
    if (sp === 'peregrine') { swing = 3; b.fx = 'feather'; }
    if (sp === 'silverTray') { this.sideFlags = Object.assign(this.sideFlags || {}, { guaranteedCatch: this.bowlT }); }
    if (sp === 'sunburn') { d = DELIVERIES.bouncer; kmh = 152; ty = 175; b.bounceK = 1.35; b.fx = 'haze'; this.effects.sunburn = true; }
    if (sp === 'vanish') { this.effects.vanish = true; this.effects.aiK = 1.3; }
    if (sp === 'sawn') { d = DELIVERIES.googly; turn = -8; this.effects.sawn = true; }
    if (sp === 'lightning') { this.lightningOver = Math.floor(this.I.legal / 6); this.keeperUp = true; }
    if (sp === 'grudgeBall') { d = DELIVERIES.yorker; kmh = 138; tx = -1 * h; ty = 26; swing = -.5; this.effects.lbwSeek = true; b.fx = 'grudge'; }
    if (sp === 'triple') { kmh = 150; b.fx = 'glint'; }
    if (this.items[this.bowlT] === 'fogMachine') { this.effects.fog = true; this.effects.aiK *= 1.5; this.items[this.bowlT] = null; emit('item:use', { id: 'fogMachine' }); }
    const overstep = grade === 'over' && !sp;
    this.noBall = overstep;
    const rx = (this.overRound === 'over' ? 8 : -8), ry = 300, rz = 34;
    const v = kmhToU(kmh);
    const sol = solveDelivery(rx, ry, rz, tx, ty, v);
    Object.assign(b, { x: rx, y: ry, z: rz, vx: sol.vx, vy: sol.vy, vz: sol.vz, phase: 'delivery', pitched: false, bounces: 0, age: 0, carried: false, landed: false, kmh: Math.round(kmh), lastTouch: 'bowler' });
    const weather = this.weather === 'overcast' ? 1.5 : 1;
    b.swingX = -h * swing * 90 * T('swing') * weather * (sp === 'peregrine' ? 1.6 : 1);
    b.turnRad = -h * turn * DEG * this.env.turn * T('spin');
    b.seamDev = gauss(rp) * T('seam') * this.env.seam * d.seam * DEG;
    if (this.items[this.batT] === 'giantBat') this.effects.giant = (this.effects.giant || 0) + 1;
    this.delInfo = { id: d.id || this.del.id, name: sp ? SPECIALS[sp].name : d0.name, fam: d0.fam, kmh: Math.round(kmh), grade, special: sp, hideSpeed: d0.hideSpeed, target: [tx, ty] };
    if (sp === 'triple') {
      this.holos = [-1, 1].map(s => { const hb = cloneBall(b); const s2 = solveDelivery(rx, ry, rz, tx + s * 14, ty + s * 30, v * (1 + s * .05)); Object.assign(hb, s2, { vx: s2.vx, vy: s2.vy, vz: s2.vz, x: rx, y: ry, z: rz, phase: 'delivery' }); return hb; });
      cover('triple');
    }
    this.pendingSpecial[this.bowlT] = null;
    this.atouch = .25; this.bowler().anim = 'deliver'; this.bowler().animT = 0;
    this.crossed = false; this.contact = null; this.padHit = null; this.wideCalled = false; this.passedStumps = false; this.keeperHas = false;
    if (this.fire.bowlOn) b.fx = b.fx || 'fire';
    if (this.cheatBall) this.cheatBall(b);
    emit('ball:released', { kmh: Math.round(kmh), del: this.delInfo.name, grade });
    if (overstep) emit('extra', { kind: 'noBall' });
    this.ballNo++; this.releaseT = this.t;
    // the CPU batter reads the ball now
    this._go('flight');
  },
  // ---------------------------------------------------------------- flight: the batter's moment
  _batSpecialPress() {
    const pad = this.pad('bat');
    if (pad.pressed('special') && this.specialReady(this.batT) && !this.batSpecial && this.ball.phase !== 'hit') { this.batSpecial = this.batSpecialId(); this.useSpecial(this.batT, this.batSpecial); this.pendingSpecial[this.batT] = null; }
  },
  _chargePress() {
    const pad = this.pad('bat'), b0 = this.batters[0];
    if (pad.pressed('charge') && !b0.charged && !this.ball.pitched && !this.swing) { b0.charged = .001; b0.anim = 'charge'; b0.animT = 0; emit('charge', {}); cover('charge'); }
  },
  contactY() {
    const b0 = this.batters[0], b = this.ball;
    let len = null;
    if (b.pitched) len = b.pitchY - PITCH.crease;
    else { const a = arrival(b, 30, this.env); len = a && a.pitchY !== null && a.pitchY !== undefined ? a.pitchY - PITCH.crease : 0; }
    const band = lengthBand(Math.max(0, len));
    return { y: (band === 'short' ? 15 : 30) + (b0.charged ? 26 : 0), band, len };
  },
  timingWindows() {
    let k = this.effects.winK || 1;
    if (this.fire.batOn) k *= 1.5;
    if (this.effects.giant) k *= 1.4;
    if (this.teaTreat === 'tea' && this.I.bat === this.cfg.teams.indexOf('ker')) k *= 1.1;
    return { p: T('perfectMs') * k / 1000, g: T('goodMs') * k / 1000, ok: T('okMs') * k / 1000 };
  },
  resolveShot(btn, th, band, line, z) {
    const deg = th / DEG;
    const fits = s => s.b === btn && s.len.includes(band) && (deg >= s.sec[0] && deg <= s.sec[1] || (s.sec2 && deg >= s.sec2[0] && deg <= s.sec2[1]));
    if (btn === 'block') return band === 'short' ? SHOT.backDefence : SHOT.fwdDefence;
    let list = SHOTS.filter(fits);
    if (btn === 'loft' && band === 'short' && z > 26 && deg < 0) return SHOT.hook;
    if (!list.length) return btn === 'loft' ? SHOT.loftLeg : SHOT.push;
    // prefer the one whose zone holds the ball
    list.sort((a, b) => this._zoneMiss(a, line, z) - this._zoneMiss(b, line, z));
    return list[0];
  },
  _zoneMiss(s, line, z) { const k = this.effects.giant ? 1.4 : 1, l0 = s.line[0] * k, l1 = s.line[1] * k, z1 = s.z[1] * (k > 1 ? 1.2 : 1); return Math.max(0, l0 - line, line - l1, s.z[0] - z, z - z1); },
  naturalDir(btn, band, line) {
    if (btn === 'block') return 0;
    if (line > 9) return (band === 'short' ? 100 : 60) * DEG;
    if (line < -3) return (band === 'short' ? -95 : -100) * DEG;
    if (band === 'short') return (btn === 'loft' ? -80 : -70) * DEG;
    return (btn === 'loft' ? -10 : 5) * DEG;
  },
  // the aim from a pad: the stick in screen space, or the mouse's ground point -> batter-frame angle (or null)
  aimFrom(pad) {
    if (pad.aimTh !== undefined && pad.aimTh !== null) return pad.aimTh;
    const h = this.strikerHand(), mg = pad.mouseGround ? pad.mouseGround() : null, b0 = this.batters[0];
    if (mg) { const dx = mg[0] - b0.x, dy = mg[1] - b0.y; if (hyp(dx, dy) > 12) return angOf(dx, dy, h); }
    const m = pad.move(); if (hyp(m[0], m[1]) < .3) return null;
    const v = pad.groundDir ? pad.groundDir(m) : [m[0], m[1]];
    return angOf(v[0], v[1], h);
  },
  _flight(dt) {
    const b = this.ball, pad = this.pad('bat'), h = this.strikerHand(), b0 = this.batters[0];
    // aftertouch for 0.25 s after release: the bowler's stick adds swing or drift
    if (this.atouch > 0) { this.atouch -= dt; const bp = this.pad('bowl'); if (this.isHuman('bowl')) { const m = bp.move(); b.swingX += m[0] * 260 * dt; if (Math.abs(m[0]) > .5) cover('aftertouch'); } }
    this._batSpecialPress(); this._chargePress();
    if (b0.charged && b0.charged < 1) { b0.charged = Math.min(1, b0.charged + dt / .3); b0.y = 14 + 26 * b0.charged; }
    // the batter's aim, live (the aim arrow)
    const aim = this.aimFrom(pad); if (aim !== null) this.aim = aim; else if (!this.swing) this.aim = null;
    // a shot press: grade the timing now; the bat meets the ball when it reaches the contact plane
    if (!this.swing) {
      let btn = pad.pressed('shot') ? 'shot' : pad.pressed('loft') ? 'loft' : pad.pressed('block') ? 'block' : null;
      const sp = this.batSpecial, auto = sp && !btn;
      if (sp && auto) { // a special plays itself at the ideal moment
        const cy = this.contactY(), a = arrival(b, cy.y, this.env), sh = SHOT.loftStraight;
        if (a && a.t <= sh.at + 1 / 240) btn = sp === 'croquet' || sp === 'grudgeDrive' ? 'shot' : 'loft';
      }
      if (btn) this._press(btn);
    }
    const prevY = b.y, ev = stepBall(b, dt, this.env);
    for (const hb of this.holos) stepBall(hb, dt, this.env);
    if (ev === 'pitched') { emit('ball:pitched', { x: b.x, y: b.y }); if (this.cfg.mode !== 'hub' && hyp(b.x, b.y - 160) < 200) {} }
    // the popping crease: wides
    if (!this.crossed && b.y <= PITCH.crease) {
      this.crossed = true;
      const line = -h * b.x;
      if (!this.contact && (line > 30 || line < -20 || b.z > 40)) { this.wideCalled = true; emit('extra', { kind: 'wide' }); }
      if (!b.pitched && b.z > 26 && !this.noBall) { this.noBall = true; emit('extra', { kind: 'noBall', beamer: true }); }
    }
    // contact
    const sw = this.swing;
    if (sw && !this.contact && sw.grade !== 'MISS' && prevY > sw.cy && b.y <= sw.cy) this._contact(sw);
    if (b.phase === 'hit') { this._go('inPlay'); this.inPlayStart(); return; }
    // the pad (LBW) and the stumps
    if (!this.contact && !this.padHit) {
      const py = sw ? sw.cy : (b0.charged ? 40 : 24);
      if (prevY > py && b.y <= py) {
        const pxc = b0.x - 1.6 * h, ducking = b.z > 28 && (!sw || sw.shot.fam === 'block' || sw.grade === 'MISS');
        if (!ducking && Math.abs(b.x - pxc) < 2.6 && b.z < 18) { this._padImpact(); return; }
      }
    }
    if (!this.passedStumps && prevY > 0 && b.y <= 0) {
      this.passedStumps = true;
      if (Math.abs(b.x) < STUMPS.hw + BALL_R && b.z < STUMPS.h + BALL_R) { this._bowled(); return; }
      if (!sw || sw.grade === 'MISS') { if (Math.abs(b.x) < 14) emit('ball:beaten', {}); }
    }
    // the keeper
    const k = this.keeper();
    if (k && b.y < k.y + 3 && b.y > k.y - 30 && !this.keeperHas) {
      if (Math.abs(b.x - k.x) < 20 && b.z < 34) { this.keeperHas = true; k.hasBall = true; b.phase = 'carried'; k.anim = 'gather'; k.animT = 0; emit('keeper', {}); this._afterDelivery('keeper'); return; }
    }
    if (b.y < -330 || b.phase === 'rolling' && b.stopped || this.st > 6) { this._afterDelivery('past'); return; }
  },
  _press(btn) {
    const b = this.ball, h = this.strikerHand(), b0 = this.batters[0];
    const cy = this.contactY(), a = arrival(b, cy.y, this.env);
    if (!a) return;   // too late: the ball is past the bat
    const line = -h * a.x;
    const th = this.aim !== null && this.aim !== undefined ? this.aim : this.naturalDir(btn, cy.band, line);
    let shot = this.resolveShot(btn, th, cy.band, line, a.z);
    const sp = this.batSpecial;
    if (sp === 'croquet' || sp === 'grudgeDrive') shot = SHOT.straightDrive;
    if (sp && sp !== 'croquet' && sp !== 'grudgeDrive' && sp !== 'stats' && btn !== 'block') shot = (Math.abs(th) > 100 * DEG) ? SHOT.loftLeg : SHOT.loftStraight;
    const dlt = shot.at - a.t, w = this.timingWindows(), ad = Math.abs(dlt);
    let grade = ad <= w.p ? 'PERFECT' : ad <= w.g ? 'GOOD' : ad <= w.ok ? (dlt < 0 ? 'EARLY' : 'LATE') : 'MISS';
    if (sp && sp !== 'stats') grade = 'PERFECT';
    if (sp === 'stats') grade = ad <= w.p * 1.5 ? 'PERFECT' : 'GOOD';
    if (this.dev.forceOutcome) grade = 'PERFECT';
    // pressed far too early: the swing is over before the ball arrives (a miss); far too late: the ball is past
    this.swing = { btn, shot, grade, dlt, cy: cy.y, band: cy.band, th: sp === 'grudgeDrive' ? 0 : th, t0: this.t, at: shot.at };
    b0.anim = 'swing'; b0.animT = 0; b0.sw = { fam: shot.fam, at: shot.at, th: this.swing.th, h, grade };
    emit('bat:press', { grade, shot: shot.id });
    if (grade === 'MISS') b0.expr = 'wince';
  },
  _contact(sw) {
    const b = this.ball, h = this.strikerHand(), line = -h * b.x, z = b.z, s = sw.shot;
    let miss = this._zoneMiss(s, line, z);
    const edgeZ = 4 * T('edge') * (this.effects.edgeK || 1) * (this.fire.bowlOn ? 1.4 : 1);
    if (this.batSpecial && this.batSpecial !== 'stats') miss = 0;
    if (this.dev.forceOutcome || this.forced) miss = 0;
    if (miss > edgeZ) { emit('ball:beaten', { reach: true }); return; }   // played and missed: the ball goes on
    const vin = hyp(b.vx, b.vy, b.vz);
    let th = sw.th, speed, launch, kind = 'clean';
    if (miss > 0) {
      // an edge: thin to the keeper and slips, thick to third man and gully, inside onto the pad or the stumps
      if (line < s.line[0]) { kind = 'inside'; th = (-150 + rp() * 40) * DEG; speed = vin * (.2 + rp() * .2); launch = 2; if (Math.abs(b.x) < 4 && rp() < .45) { this.contact = { kind: 'dragged' }; this._bowled(true); return; } }
      else if (miss > edgeZ * .55) { kind = 'thin'; th = (150 + rp() * 25) * DEG; speed = vin * (.35 + rp() * .2); launch = 6 + rp() * 10; }
      else { kind = 'thick'; th = (115 + rp() * 30) * DEG; speed = vin * (.5 + rp() * .2); launch = 4 + rp() * 14; }
      emit('ball:edge', { kind });
    } else {
      const gk = { PERFECT: 1, GOOD: .85, EARLY: .6, LATE: .6 }[sw.grade];
      const p = this.striker().p;
      speed = s.speed * (.62 + (p.pow || 5) / 26) * gk * (1 + .25 * vin / 386) * T(sw.btn === 'loft' ? 'loftPower' : 'batPower');
      if (this.fire.batOn) speed *= 1.2;
      if (this.effects.giant) speed *= 1.1;
      launch = s.launch;
      if (sw.grade === 'GOOD') th += gauss(rp) * 6 * DEG;
      if (sw.grade === 'EARLY') { th -= 25 * DEG * (s.fam === 'block' ? .3 : 1); if (sw.btn === 'loft') launch += 8; }
      if (sw.grade === 'LATE') { th += 25 * DEG * (s.fam === 'block' ? .3 : 1); if (sw.btn === 'loft') launch += 12; speed *= .9; }
      th += gauss(rp) * 2 * DEG;
      if ((sw.grade === 'EARLY' || sw.grade === 'LATE') && sw.cy < 20 && !this.forced && !this.batSpecial && rp() < .015) { this.stumpsDown = [this.t, 0, 'hitwicket']; emit('stumps', { end: 0, how: 'hit wicket' }); cover('hitwicket'); this._dead('hitwicket'); return; }
      const sp = this.batSpecial;
      if (sp === 'kettle') speed *= 1.25; else if (sp === 'longHandle' || sp === 'bludgeon') speed *= 1.4; else if (sp === 'kerfShot') speed *= 1.2; else if (sp === 'grudgeDrive') speed *= 1.3;
      if (sp === 'croquet') { speed = 520; launch = 1; }
      if (this.effects.sunburn && (s.id === 'hook' || s.id === 'pull') && sw.grade !== 'PERFECT') { kind = 'topEdge'; th = (-150 - rp() * 20) * DEG; speed = 230; launch = 62; }
      if (s.fam === 'block') { speed = s.speed * (.6 + rp() * .6); launch = 0; }
    }
    const w = dirOf(th, h), lr = launch * DEG;
    b.vx = w[0] * speed * Math.cos(lr); b.vy = w[1] * speed * Math.cos(lr); b.vz = speed * Math.sin(lr) + (kind === 'clean' ? 0 : 20);
    b.phase = 'hit'; b.carried = true; b.landed = false; b.lastTouch = 'bat'; b.bounces = 0; b.rollK = .55; b.age = 0;
    if (this.batSpecial) b.fx = { kettle: 'steam', kerfShot: 'fire', longHandle: 'fire', bludgeon: 'fire', croquet: 'croquet', grudgeDrive: 'grudge', ecto: 'ecto', stats: null }[this.batSpecial] || b.fx;
    else b.fx = this.fire.batOn ? 'fire' : null;
    if (this.batSpecial === 'croquet') b.unstoppable = true;
    if (this.batSpecial === 'ecto') b.ectoLeft = 1;
    this.contact = { kind, grade: sw.grade, shot: s.id, th, speed, edge: kind !== 'clean' };
    cover('shot:' + s.fam); cover('grade:' + sw.grade);
    emit('bat:contact', { grade: sw.grade, shot: s.id, kind, name: s.name, special: this.batSpecial });
  },
  _padImpact() {
    const b = this.ball, h = this.strikerHand();
    this.padHit = { x: b.x, y: b.y, z: b.z, pitchX: b.pitched ? b.pitchX : null, pitchY: b.pitched ? b.pitchY : null, offered: !!this.swing };
    // the truth (5.6): pitched outside leg; impact outside off with a shot offered; then would it hit the stumps?
    const c = cloneBall(b); let hit = false, close = 1e9, t = 0;
    while (t < 1.2 && c.y > -4) { stepBall(c, 1 / 120, this.env); t += 1 / 120; if (Math.abs(c.y) < 2) { const ex = Math.abs(c.x) - (STUMPS.hw + BALL_R), ez = c.z - (STUMPS.h + BALL_R); close = Math.min(close, Math.max(ex, ez)); if (ex < 0 && ez < 0) hit = true; } }
    const pitchedLeg = this.padHit.pitchX !== null && h * this.padHit.pitchX > STUMPS.hw + BALL_R;
    const impOff = -h * b.x > STUMPS.hw + BALL_R && this.padHit.offered;
    if (this.forcedLbw) hit = true;   // a forced lbw (dev, attract) is plumb
    const truthOut = !pitchedLeg && !impOff && hit;
    const umpCall = Math.abs(close) < 1;
    this.padHit.truth = { out: truthOut, pitched: pitchedLeg ? 'outside leg' : 'in line', impact: impOff ? 'outside off' : 'in line', wickets: hit ? 'hitting' : 'missing', umpCall, path: predict(b, .5, this.env, 1 / 60, cc => cc.y < -2) };
    b.vx *= .15; b.vy *= .15; b.vz = Math.abs(b.vz) * .2 + 8; b.phase = 'hit'; b.carried = false; b.lastTouch = 'pad'; b.landed = true;
    const candidate = !pitchedLeg && (hit || close < 6) && !this.wideCalled;
    emit('ball:pad', { candidate });
    if (candidate || this.effects.lbwSeek) { this.appeal = { kind: 'lbw' }; emit('appeal', { kind: 'lbw' }); this._dead('lbw'); }
    else { this.legByes = true; this._go('inPlay'); this.inPlayStart(); }
  },
  _bowled(dragged) {
    const b = this.ball;
    b.vx *= .5; b.vy = Math.abs(b.vy) * -.3; b.phase = 'hit'; b.lastTouch = 'stumps';
    this.stumpsDown = [this.t, 0, this.effects.sawn ? 'sawn' : dragged ? 'dragged' : 'bowled'];
    emit('stumps', { end: 0, how: 'bowled' });
    this._dead('bowled');
  },
  _afterDelivery(why) {
    // the ball beat the bat: collected by the keeper (dead; a stumping if the striker charged), or byes past him
    const b0 = this.batters[0];
    if (why === 'keeper') {
      const window = (this.lightningOver === Math.floor(this.I.legal / 6) ? 3 : 1) * .35;
      if (b0.charged && this.keeperUp && (!this.swing || this.swing.grade === 'MISS' || !this.contact) && !this.wideCalled) {
        this.stumpingAt = this.t + Math.min(.25, window); this._go('inPlay'); this.inPlayStart(true); return;
      }
      this._dead('keeper'); return;
    }
    this.byes = true; this._go('inPlay'); this.inPlayStart();
  }
});
