/* =============================================================================
 * 30-match: a ballgame. BZ.newMatch builds the state BZ.M; BZ.matchStep runs it
 * in exact steps (pregame -> halfStart -> atBat [walkup, select, windup, flight,
 * settle] -> inPlay -> playOver -> ... -> halfEnd -> between -> ... -> final),
 * with side states for cinematics, the Rhubarb and SUDDEN BOOM. The simulation
 * runs only here; drawing only reads it. A whole game runs headless.
 * ========================================================================== */
BZ.newMatch = (o = {}) => {
  const parkId = o.park || 'kernel', P = BZ.park(parkId);
  BZ.seed(o.seed !== undefined ? o.seed : (Date.now() & 0xffffff));
  const M = {
    mode: o.mode || 'exhibition', parkId, park: P, teams: [BZ.newTeamState(o.away || 'krakens', 0), BZ.newTeamState(o.home || 'comets', 1)],
    inning: 1, half: 'top', outs: 0, balls: 0, strikes: 0, bases: [null, null, null], innings: o.innings || 3,
    difficulty: o.difficulty || 'pro', cpuLevel: o.cpuLevel || o.difficulty || 'pro', mercy: o.mercy !== false,
    phase: 'pregame', phaseT: 0, clock: 0, fielders: [], runners: [], ball: BZ.newBall(), batter: null, pitcher: null,
    reticle: { x: 0, z: 17, vx: 0, vz: 0 }, marker: { x: 0, z: 17 }, ab: null, play: null, stats: {}, unsub: [], cheats: Object.assign({}, o.cheats || {}),
    fast: !!o.fast, attract: !!o.attract, seed: o.seed, tourStop: o.tourStop, upgrades: o.upgrades || null, upgradeTeam: o.upgradeTeam === undefined ? -1 : o.upgradeTeam,
    leads: {}, steals: {}, events: [], walkoff: false, result: null, boss: o.boss || null, script: o.script || null, cams: { mode: 'plate' }, log: [], lastContact: null, pitchCount: 0, playCount: 0,
    hazardFirst: {}, rallyCap: false, shows: 0, bonusRunner: false
  };
  M.teamOf = (p) => M.teams[0].lineup.includes(p) || M.teams[0].pitcher === p || M.teams[0].bullpen.includes(p) || (p && p.team === M.teams[0].id) ? M.teams[0] : M.teams[1];
  for (const s of [0, 1]) {
    const H = (o.humans && o.humans[s]) || [];
    M.teams[s].humans = H.map((inp, i) => ({ input: inp, role: i ? 'cocaptain' : 'captain' }));
    if (o.levels && o.levels[s]) M.teams[s].level = o.levels[s];
  }
  if (o.meters) { M.teams[0].meter = o.meters[0] || 0; M.teams[1].meter = o.meters[1] || 0; }
  P.rollWind();
  BZ.M = M;
  BZ.supers.install(M);
  BZ.match.setupDefense(M);
  M.batter = BZ.rules.batterNow(M); M.pitcher = BZ.defense(M).pitcher;
  if (BZ.hazards) BZ.hazards.init(M);
  M.unsub.push(BZ.bus.on('*', (d, ev) => { M.events.push(ev); if (M.events.length > 400) M.events.shift(); }));
  BZ.bus.emit('matchStart', { away: M.teams[0].id, home: M.teams[1].id, park: parkId });
  return M;
};
BZ.endMatch = (M) => { if (!M) return; for (const u of M.unsub) u(); M.unsub = []; if (BZ.hazard && BZ.hazard.end) BZ.hazard.end(M); };

BZ.match = {
  setupDefense(M) {
    const D = BZ.defense(M), P = M.park;
    const pos = {}; for (const p of D.lineup) pos[p.pos] = p; pos.P = D.pitcher;
    M.fielders = BZ.POS_ORDER.map(k => BZ.makeFielder(M, pos[k] || D.lineup[0], k));
    M.pitcher = D.pitcher;
    void P;
  },
  phase(M, ph) { M.phase = ph; M.phaseT = 0; BZ.bus.emit('phase', { phase: ph }); },
  /* ---- the at-bat ---- */
  newAtBat(M) {
    // the CPU calls the bullpen when its pitcher is gassed; a human sees the toast and uses Pitching change
    const D0 = BZ.defense(M);
    if (BZ.staminaOf(M, D0.pitcher) < 20 && D0.bullpen.length) {
      if (!D0.humans.length && !M.lesson) { const rp = D0.bullpen.shift(); D0.pitcher = rp; BZ.bus.emit('pitchingChange', { pitcher: rp }); BZ.hud.toast && BZ.hud.toast('NOW PITCHING: ' + rp.name.toUpperCase()); this.setupDefense(M); }
      else if (!M.bullpenSaid) { M.bullpenSaid = true; BZ.hud.toast && BZ.hud.toast('BULLPEN\'S READY: PITCHING CHANGE IN THE PAUSE MENU'); }
    }
    M.batter = BZ.rules.batterNow(M); M.pitcher = BZ.defense(M).pitcher;
    M.ab = { sub: 'walkup', t: 0, swing: null, pitch: null }; M.batterUp = false;
    M.leads = {}; M.steals = {};
    M.reticle.x = 0; M.reticle.z = 17;
    for (const f of M.fielders) { f.has = false; f.state = 'set'; f.z = 0; f.vz = 0; f.role = 'idle'; f.climbed = false; f.jumped = false; f.dives = 0; f.human = null; f.humanOverride = false; f.charge = null; f.botRun = null; f.throwT = 0; }
    M.ctlF = null; M.ctlLocked = false;
    M.ball.mode = 'none'; M.ball.trail = [];
    this.phase(M, 'atBat');
    BZ.bus.emit('batterUp', { batter: M.batter, team: BZ.offense(M).id, order: BZ.offense(M).order });
  },
  nextPitch(M) {
    M.ab.sub = 'select'; M.ab.t = 0; M.ab.swing = null; M.ab.pitch = null; M.ab.released = false; M.ab.contactDone = false; M.ab.botPlan = null; M.ab.botPick = null; M.ab.botRel = false; M.ab.cpu = null; M.ab.result = null; M.ab.bunting = false; M.ab.pick = null;
    M.leads = {}; M.steals = {};
    M.ball.mode = 'none';
    BZ.supers.pitchTick(M);
    BZ.bus.emit('pitchSelect', {});
  },
  atBat(M, dt) {
    const S = M.ab, D = BZ.defense(M), O = BZ.offense(M), PI = BZ.ctl.who(M, D.side, 'pitch'), BI = BZ.ctl.who(M, O.side, 'bat'), RI = BZ.ctl.who(M, O.side, 'run');
    S.t += dt;
    // fielders drift back to their spots between pitches
    for (const f of M.fielders) { BZ.moveTo(f, f.home.x, f.home.y, M.fast ? 1e5 : 120, dt); if (Math.hypot(f.x - f.home.x, f.y - f.home.y) < 1) f.facing = Math.atan2(M.park.H.y - f.y, M.park.H.x - f.x); }
    if (S.sub === 'walkup') { if (S.t >= (M.fast ? 0 : .9) || (BI && BI.pressed('south') && S.t > .2)) this.nextPitch(M); return; }
    // the batter's reticle: the stick or WASD moves it, the mouse places it
    if (BI) this.reticleInput(M, BI, dt);
    if (S.sub === 'select') {
      // offense: the Batzooka, the extra lead, a steal
      if (BI && BI.pressed('r1') && !(RI !== BI && RI && RI.down('l1'))) { if (O.meter >= 100 && !O.batzookaArmed) BZ.supers.arm(M, O.side); else if (!O.batzookaArmed) this.extraLead(M); }
      if (RI && RI !== BI && RI.pressed('r1')) this.extraLead(M);
      if (RI && RI.down('l1')) { const b = BZ.basePressed(RI); if (b && b >= 2 && b <= 4 && M.bases[b - 2] && (b === 4 || !M.bases[b - 1])) { M.steals[b - 1] = true; BZ.bus.emit('stealCall', { base: b }); BZ.sfx('select'); } }
      // defense: pick a pitch (or a pickoff)
      if (PI) {
        if (PI.down('l1')) { const b = BZ.basePressed(PI); if (b && b <= 3 && M.bases[b - 1]) { this.pickoff(M, b); return; } }
        if (BZ.wheel) { S.pick = ((S.pick || 0) + BZ.wheel + 50) % 5; BZ.sfx('select'); }
        let slot = null;
        if (PI.lastDevice === 'mouse') { if (PI.pressed('south')) slot = (S.pick || 0) < 4 ? BZ.PITCH_SLOTS[S.pick || 0] : 'r1'; }
        else for (const sl of ['south', 'east', 'west', 'north']) if (PI.pressed(sl)) slot = sl;
        if (PI.pressed('r1')) slot = 'r1';
        ['num1', 'num2', 'num3', 'num4', 'num5'].forEach((n, i) => { if (PI.pressed(n)) slot = i < 4 ? BZ.PITCH_SLOTS[i] : 'r1'; });
        if (slot === 'r1' && D.meter < 100) { slot = null; BZ.sfx('cancel'); }
        if (slot) this.beginWindup(M, slot, null);
      } else {
        const wait = M.fast ? 0 : (M.attract ? .6 : .9);
        if (S.t > wait) {
          const ch = M.forcePitch ? Object.assign({ slot: 'south', q: 1 }, M.forcePitch) : BZ.ai.choosePitch(M, D.side);
          if (M.forcePitch) { ch.type = M.forcePitch.type; ch.target = M.forcePitch.target || [0, 17]; M.forcePitch = null; }
          if (!O.humans.length && !M.fast) Object.assign(M.steals, BZ.ai.steals(M, O.side));
          this.beginWindup(M, ch.slot, ch);
        }
      }
      return;
    }
    if (S.sub === 'windup') {
      // the target marker: the stick, WASD or mouse moves it over the zone plane
      if (PI) this.markerInput(M, PI, dt);
      const relT = S.windT;
      if (PI && !S.released) {
        const again = S.slot === 'r1' ? PI.pressed('r1') : (PI.pressed(S.slot) || (PI.lastDevice === 'mouse' && PI.pressed('south')));
        const numAgain = ['num1', 'num2', 'num3', 'num4', 'num5'].some((n, i) => PI.pressed(n) && (i < 4 ? BZ.PITCH_SLOTS[i] : 'r1') === S.slot);
        if ((again || numAgain) && S.t > relT - BZ.RING - .15) this.release(M, BZ.releaseQ(S.t - relT));
        else if (S.t > relT + .2) this.release(M, .3);
      } else if (!PI && !S.released && S.t >= relT) this.release(M, S.cpu ? S.cpu.q : .6);
      return;
    }
    if (S.sub === 'flight') this.flight(M, dt, PI, BI);
  },
  extraLead(M) { for (let b = 1; b <= 3; b++) if (M.bases[b - 1]) M.leads[b] = .08; BZ.bus.emit('lead', {}); },
  reticleInput(M, I, dt) {
    const R = M.reticle, mv = I.move();
    const ptr = I.lastDevice === 'mouse' && I.pointer && I.pointer() && BZ.cams && BZ.cams.pointerToZone ? BZ.cams.pointerToZone(I.pointer()) : null;
    if (ptr) { R.x = ptr[0]; R.z = ptr[1]; }
    else {
      const tx = mv[0], tz = -mv[1];
      R.vx = BZ.approach(R.vx, tx * 80, 600 * dt); R.vz = BZ.approach(R.vz, tz * 80, 600 * dt);
      R.x += R.vx * dt; R.z += R.vz * dt;
    }
    const k = ((M.batter.look && M.batter.look.size) || 1.25) / 1.25;
    R.x = clamp(R.x, -BZ.GEO.zoneHalfW - 6, BZ.GEO.zoneHalfW + 6); R.z = clamp(R.z, BZ.GEO.zoneLo * k - 6, BZ.GEO.zoneHi * k + 6);
  },
  markerInput(M, I, dt) {
    const K = M.marker, mv = I.move();
    const ptr = I.lastDevice === 'mouse' && I.pointer && I.pointer() && BZ.cams && BZ.cams.pointerToZone ? BZ.cams.pointerToZone(I.pointer()) : null;
    if (ptr) { K.x = ptr[0]; K.z = ptr[1]; }
    else { K.x += mv[0] * 34 * dt; K.z -= mv[1] * 34 * dt; }
    if (BZ.game.settings && BZ.game.settings.pitchAssist === 'auto' && !ptr && Math.hypot(mv[0], mv[1]) < .1) { K.x = lerp(K.x, 0, dt * 1.5); K.z = lerp(K.z, 17, dt * 1.5); }
    K.x = clamp(K.x, -BZ.GEO.zoneHalfW - 8, BZ.GEO.zoneHalfW + 8); K.z = clamp(K.z, BZ.GEO.zoneLo - 8, BZ.GEO.zoneHi + 8);
  },
  beginWindup(M, slot, cpu) {
    const S = M.ab, D = BZ.defense(M), p = D.pitcher;
    const type = cpu && cpu.type ? cpu.type : slot === 'r1' ? D.def.superPitch : BZ.repertoire(p)[BZ.PITCH_SLOTS.indexOf(slot)];
    S.slot = slot; S.type = type; S.cpu = cpu; S.sub = 'windup'; S.t = 0;
    const tempo = M.fast ? .3 : (BZ.WINDUP * (1.1 - .02 * (p.vel || 5)) * (D.shortCircuit > 0 ? 1.2 : 1));
    S.windT = tempo; S.ringStart = Math.max(0, tempo - BZ.RING);
    if (cpu) { M.marker.x = cpu.target[0]; M.marker.z = cpu.target[1]; }
    else { M.marker.x = 0; M.marker.z = 17; }
    if (slot === 'r1') { D.meter = 0; BZ.bus.emit('super', { kind: 'pitch', type, side: D.side }); }
    BZ.bus.emit('windup', { type, slot });
  },
  release(M, q) {
    const S = M.ab, D = BZ.defense(M), O = BZ.offense(M), p = D.pitcher;
    S.released = true; S.q = q; S.sub = 'flight'; S.t = 0;
    const st = BZ.staminaOf(M, p), def = BZ.PITCHES[S.type] || BZ.PITCHES.heater;
    D.stamina[p.id] = Math.max(0, st - def.cost * TUNE.staminaDrain);
    let speedMul = 1;
    if (!D.humans.length || M.attract) speedMul *= BZ.LEVELS[M.cpuLevel] ? BZ.LEVELS[M.cpuLevel].pitchMul : 1;
    if (S.slot === 'r1' && !def.speed) speedMul *= 1.35;
    if (M.boss && D.id === 'mechanicals') speedMul *= 1 + .05 * (M.inning - 1);
    if (D.shortCircuit > 0) speedMul *= .85;
    if (M.lessonSpeed) speedMul *= M.lessonSpeed;
    if (M.upgrades && M.upgradeTeam === D.side) speedMul *= 1 + .03 * (M.upgrades.arms || 0);
    const target = [M.marker.x, M.marker.z];
    const strikeCheat = M.cheats.allStrikes && (D.humans.length || M.attract);
    S.pitch = new BZ.Pitch(M, { type: S.type, pitcher: p, target: strikeCheat ? [clamp(target[0], -4, 4), clamp(target[1], 12, 22)] : target, q, lefty: (p.bt || 'R/R').split('/')[1] === 'L', speedMul, stamina: st, noMiss: strikeCheat });
    M.pitchCount++;
    BZ.bus.emit('release', { type: S.type, q, speed: BZ.mph(S.pitch.speed), slot: S.slot, perfect: q >= .999 });
    if (q >= .999 && D.humans.length) BZ.bus.emit('perfectRelease', {});
    // the CPU batter's plan; runners break on a steal
    if (!O.humans.length) S.cpuSwing = BZ.ai.cpuSwingSchedule(M, O.side, S.pitch);
    else S.cpuSwing = null;
    if (S.cpuSwing && S.cpuSwing.plan.zooka && O.meter >= 100) BZ.supers.arm(M, O.side);
    if (M.forceContact) S.forceContact = M.forceContact, M.forceContact = null;
    if (S.cpu && S.cpu.after) S.cpuAfter = S.cpu.after;
    M.ball.mode = 'pitch';
  },
  flight(M, dt, PI, BI) {
    const S = M.ab, pt = S.pitch, O = BZ.offense(M), D = BZ.defense(M);
    // aftertouch: the pitcher's stick bends the ball during the first 40% of the flight
    if (PI) { const mv = PI.move(); if (Math.hypot(mv[0], mv[1]) > .25 && pt.u < .4) { if (!pt.afterUsed) { D.stamina[D.pitcher.id] = Math.max(0, BZ.staminaOf(M, D.pitcher) - .5); BZ.bus.emit('aftertouch', {}); } pt.steer(mv[0], -mv[1], dt); } }
    else if (S.cpuAfter && pt.u < .4) pt.steer(S.cpuAfter[0], S.cpuAfter[1], dt);
    // the black hole pulls a nearby reticle
    if (pt.def.pull) { const c = pt.pos(pt.u); const dx = c.x - M.reticle.x, dz = c.z - M.reticle.z, d = Math.hypot(dx, dz); if (d < 10 && d > .1) { M.reticle.x += dx / d * 3 * dt * 3; M.reticle.z += dz / d * 3 * dt * 3; } }
    pt.step(dt);
    // the batter: a human's buttons, or the CPU's scheduled press
    const assist = BZ.assistFor(M, O.side);
    if (BI && !S.swing && !S.contactDone) {
      let type = null;
      if (BI.pressed('r1') && O.meter >= 100 && !O.batzookaArmed) BZ.supers.arm(M, O.side);
      if (BI.pressed('south') && !(BI.lastDevice === 'mouse' && BI.held && BI.held.has && BI.held.has('Mouse2'))) type = 'contact';
      if (BI.pressed('west')) type = 'power';
      if (type) S.swing = { type: O.batzookaArmed ? 'batzooka' : type, t0: pt.t, human: true };
      S.bunting = BI.down('north');
    } else if (!BI && S.cpuSwing && !S.swing && pt.t >= S.cpuSwing.pressAt) {
      const pl = S.cpuSwing.plan;
      if (pl.type === 'bunt') S.bunting = true;
      else S.swing = { type: O.batzookaArmed ? 'batzooka' : pl.type, t0: pt.t, cpu: pl };
    }
    if (S.swing && !S.swing.done) {
      const sw = S.swing, Sd = BZ.SWINGS[sw.type] || BZ.SWINGS.contact, impact = sw.t0 + Sd.delay;
      if (pt.t >= impact) { sw.done = true; this.evaluateSwing(M, sw, impact - pt.T, assist); if (M.phase !== 'atBat') return; }
    }
    if (S.bunting && !S.swing && pt.t >= pt.T && !S.buntDone) {
      S.buntDone = true;
      const c = pt.cross(), res = BZ.buntContact(c, M.reticle.x, M.reticle.z, M.batter, M.park);
      if (res.kind === 'contact') { this.contact(M, res, c); return; }
      S.buntMiss = true;
    }
    // the pitch settles in the catcher's mitt
    const win = BZ.swingWindow(assist);
    if (pt.t >= pt.T + Math.max(.1, win + .02) && !S.contactDone) this.settlePitch(M);
  },
  evaluateSwing(M, sw, e, assist) {
    const S = M.ab, pt = S.pitch, O = BZ.offense(M), c = pt.cross(), lefty = (M.batter.bt || 'R/R')[0] === 'L';
    const ball = { x: c.x, z: c.z };
    const zooka = sw.type === 'batzooka';
    if (zooka) BZ.supers.spend(M, O.side);
    sw.e = e; sw.rx = sw.cpu ? sw.cpu.rx : M.reticle.x; sw.rz = sw.cpu ? sw.cpu.rz : M.reticle.z;
    if (M.cheats.perfect && (O.humans.length || M.attract) || S.forceContact === 'perfect') { sw.e = 0; sw.rx = c.x; sw.rz = c.z + (sw.type === 'power' || zooka ? -.6 : 0); }
    if (S.forceContact && typeof S.forceContact === 'object') { sw.e = (S.forceContact.timingMs || 0) / 1000; sw.rx = c.x - (S.forceContact.dx || 0); sw.rz = c.z - (S.forceContact.dz || 0); }
    if (S.forceContact === 'miss') sw.e = 1;
    const lumber = M.upgrades && M.upgradeTeam === O.side ? 1 + .05 * (M.upgrades.lumber || 0) : 1;
    let res = BZ.contact(sw, ball, pt.speed, M.batter, M.park, lefty, assist, { needGood: pt.def.needGood, evMul: (M.evMul || 1) * lumber });
    if (M.scriptHit && res.kind !== 'miss') res = M.scriptHit(res, sw) || res;
    res.zooka = zooka; res.type = sw.type;
    M.lastContact = { timingMs: res.ms, dx: +(ball.x - sw.rx).toFixed(2), dz: +(ball.z - sw.rz).toFixed(2), Q: res.Q !== undefined ? +res.Q.toFixed(3) : 0, EV: res.EV ? Math.round(res.EV) : 0, launch: res.phi ? +res.phi.toFixed(1) : 0, spray: res.theta ? +res.theta.toFixed(1) : 0, kind: res.kind, grade: res.grade };
    BZ.bus.emit('swing', { type: sw.type, kind: res.kind, grade: res.grade, ms: res.ms, feedback: res.feedback, feedback2: res.feedback2 });
    if (res.kind === 'miss') {
      S.whiff = true;
      if (zooka) BZ.bus.emit('batzookaFizzle', { batter: M.batter });
      BZ.bus.emit('miss', { ms: res.ms });
      return;
    }
    if (res.kind === 'foultip') { S.contactDone = true; S.result = 'foultip'; BZ.bus.emit('foulTip', {}); this.afterPitch(M, () => BZ.rules.foul(M, false)); return; }
    this.contact(M, res, c);
  },
  contact(M, res, c) {
    const S = M.ab, P = M.park, b = M.ball, pt = S.pitch;
    S.contactDone = true;
    Object.assign(b, BZ.newBall(), { x: P.H.x + c.x, y: P.H.y - 6, z: Math.max(2, c.z), vx: res.v[0], vy: res.v[1], vz: res.v[2], mode: 'batted', spin: res.spin || 0, boost: res.zooka ? .5 : 0, version: 1 });
    if (M.cheats.homer || S.forceContact === 'homer') { const th = (res.theta || 0) * Math.PI / 180 * .5, sp = 900; b.vx = Math.sin(th) * sp * .8; b.vy = -Math.cos(th) * sp * .8; b.vz = sp * .6; b.boost = res.zooka ? .5 : 0; M.cheats.homer = false; }
    M.lastBatted = { theta: res.theta, phi: res.phi, EV: res.EV, Q: res.Q, zooka: !!res.zooka, bunt: !!res.bunt };
    BZ.bus.emit('contact', { Q: res.Q || 0, EV: res.EV, zooka: !!res.zooka, bunt: !!res.bunt, grade: res.grade, batter: M.batter, theta: res.theta, phi: res.phi, foulTip: false });
    if (res.zooka) BZ.bus.emit('batzookaHit', { batter: M.batter });
    BZ.play.begin(M, 'batted', { contact: res });
    M.play.predT0 = 0;
    BZ.play.replan(M);
    M.play.contactPred = M.play.pred;
    // runners stealing get their head start
    for (const r of M.runners) if (r.steal) r.p = Math.min(r.start + .3, r.p + .25);
    this.phase(M, 'inPlay');
    void pt;
  },
  /** the pitch reaches the catcher with no contact: the call, or a wild pitch, a steal throw */
  settlePitch(M) {
    const S = M.ab, pt = S.pitch, c = pt.cross(), D = BZ.defense(M), O = BZ.offense(M), lefty = (M.batter.bt || 'R/R')[0] === 'L';
    S.contactDone = true;
    const size = (M.batter.look && M.batter.look.size) || 1.25;
    const swung = S.whiff || (S.buntMiss && S.bunting);
    let call;
    if (swung) call = 'swingStrike';
    else if (BZ.hitsBatter(c.x, c.z, lefty)) call = 'hbp';
    else call = BZ.inZone(c.x, c.z, size) ? 'strike' : 'ball';
    S.result = call; S.cross = c;
    BZ.bus.emit('pitchCross', { x: c.x, z: c.z, call, type: S.type, speed: BZ.mph(pt.speed) });
    if (call === 'hbp') {
      const hard = pt.speed >= .9 * 340;
      const rh = BZ.game && BZ.game.settings ? BZ.game.settings.rhubarbs !== false : true;
      BZ.statFor(M, D.pitcher).pitches++;
      if (!M.cheats.noRhubarb && ((hard && rh && BZ.R() < TUNE.rhubarbChance && !M.fast) || (M.script && M.script.rhubarbOnHbp))) { if (M.script) M.script.rhubarbOnHbp = false; M.pendingRhubarb = true; }
      this.afterPitch(M, () => { BZ.rules.walk(M, true); });
      return;
    }
    // a wild pitch or passed ball: outside the catcher's reach
    const wild = Math.abs(c.x) > 16 || c.z < 2 || c.z > 34;
    const C = M.fielders.find(f => f.pos === 'C');
    const anyOn = M.bases.some(Boolean);
    if (wild && anyOn && BZ.R() < .35 * (1 - (C ? C.player.glv : 5) / 10)) {
      const after = call === 'swingStrike' ? () => BZ.rules.strike(M, 'swinging') : call === 'strike' ? () => BZ.rules.strike(M, 'looking') : () => BZ.rules.ball(M);
      const res = after(); if (M.outs >= 3 || res === 'K' && M.outs >= 3) { this.endOfPlay(M); return; }
      if (res === 'BB' || res === 'K') { this.afterPitch(M, () => {}); return; }
      BZ.play.begin(M, 'wild');
      const P = M.park, b = M.ball; Object.assign(b, { x: P.H.x + c.x, y: P.H.y + 10, z: 6, vx: c.x * 4, vy: 160, vz: 30, mode: 'loose', version: b.version + 1, bounced: 1, fair: 'fair', touched: true });
      BZ.bus.emit('wildPitch', {});
      this.phase(M, 'inPlay');
      return;
    }
    const steal = Object.keys(M.steals).length > 0;
    this.afterPitch(M, () => {
      const r = call === 'swingStrike' ? BZ.rules.strike(M, 'swinging') : call === 'strike' ? BZ.rules.strike(M, 'looking') : BZ.rules.ball(M);
      return r;
    }, steal);
  },
  /** apply a pitch's outcome to the count, then the next pitch, the next batter, a steal play or the end of the half */
  afterPitch(M, apply, steal) {
    const res = apply();
    M.playCount++;
    if (M.pendingRhubarb && BZ.rhubarb) { M.pendingRhubarb = false; BZ.rhubarb.start(M, 'hbp'); return; }
    if (M.outs >= 3) { this.endOfPlay(M); return; }
    if (steal && res !== 'BB' && res !== 'K' && !M.walkoff) {
      // the steal: the catcher has the ball, the runners are running
      BZ.play.begin(M, 'steal');
      const C = M.fielders.find(f => f.pos === 'C');
      for (const r of M.runners) if (r.steal) { r.p = r.start + .62; r.goal = r.start + 1; r.state = 'run'; }
      BZ.play.give(M, C, 'pitch'); C.decideT = .05;
      this.phase(M, 'inPlay');
      return;
    }
    if (M.walkoff) { this.final(M); return; }
    M.ab.sub = 'settle'; M.ab.t = 0; M.ab.next = (res === 'BB' || res === 'K' || M.batterUp) ? 'batter' : 'pitch';
    M.batterUp = false;
    M.ball.mode = 'held';
  },
  pickoff(M, base) {
    BZ.play.begin(M, 'pickoff');
    const P = M.fielders.find(f => f.pos === 'P'), cov = { 1: '1B', 2: 'SS', 3: '3B' }[base], rec = M.fielders.find(f => f.pos === cov);
    const bp = M.park.base(base); if (rec) { rec.x = bp.x + (base === 1 ? 4 : 0); rec.y = bp.y + 6; rec.role = 'cover'; rec.coverBase = base; rec.tx = bp.x; rec.ty = bp.y; }
    const r = M.runners.find(q => q.start === base); if (r) { r.p = base + (M.leads[base] ? .08 : .04); r.goal = base; }
    BZ.play.give(M, P, 'pitch'); BZ.play.startThrow(M, P, base, .9);
    BZ.bus.emit('pickoff', { base });
    this.phase(M, 'inPlay');
  },
  /* ---- the live play ---- */
  inPlay(M, dt) {
    if (M.cinematic) return;
    BZ.ctl.step(M, dt);
    BZ.play.update(M, dt);
    if (M.play.done) this.resolvePlay(M);
  },
  resolvePlay(M) {
    const pl = M.play, O = BZ.offense(M);
    if (pl.deadReason === 'foul') {
      M.runners = []; M.ball.mode = 'dead';
      const bunt = M.lastBatted && M.lastBatted.bunt;
      BZ.bus.emit('foul', { bunt });
      this.afterPitch(M, () => BZ.rules.foul(M, bunt));
      if (M.phase === 'inPlay') this.phase(M, 'atBat');
      return;
    }
    const batterRunner = M.runners.find(r => r.isBatter);
    let hitBases = 0;
    if (pl.kind === 'batted') {
      if (pl.deadReason === 'hr') hitBases = 4;
      else if (pl.deadReason === 'grd') hitBases = 2;
      else if (batterRunner && batterRunner.state !== 'out') {
        const reached = clamp(Math.round(batterRunner.p), 1, 4);
        const fc = pl.outs.length > 0 && !pl.caughtFly;
        if (pl.error && !pl.wildThrow) { BZ.statFor(M, M.batter).AB++; BZ.bus.emit('reachedOnError', {}); }
        else if (fc) { BZ.statFor(M, M.batter).AB++; BZ.bus.emit('fieldersChoice', {}); }
        else {
          hitBases = Math.min(3, reached);
          if (batterRunner.state === 'scored') hitBases = 4;
          const s = BZ.statFor(M, M.batter); s.AB++; s.H++; if (hitBases === 2) s['2B']++; if (hitBases === 3) s['3B']++; if (hitBases === 4) { s.HR++; pl.insideParker = true; }
          O.hits++;
        }
      }
      if (hitBases && pl.deadReason !== 'hr' && pl.deadReason !== 'grd') BZ.bus.emit('hit', { bases: hitBases, batter: M.batter, inside: !!pl.insideParker });
      else if (pl.deadReason === 'hr' || pl.deadReason === 'grd') BZ.bus.emit('hit', { bases: hitBases, batter: M.batter, dead: true });
    }
    if (pl.kind === 'steal') for (const r of M.runners) if (r.stoleBase === undefined && r.steal !== undefined && r.state === 'out') BZ.bus.emit('steal', { ok: false, runner: r.player });
    BZ.runners.settle(M);
    if (pl.kind === 'batted') BZ.rules.nextBatter(M);
    BZ.bus.emit('playEnd', { kind: pl.kind, reason: pl.deadReason, outs: pl.outs.length, runs: pl.runs.length, hit: hitBases, error: pl.error });
    this.endOfPlay(M);
  },
  endOfPlay(M) {
    M.ball.mode = M.ball.mode === 'dead' ? 'dead' : 'held';
    if (M.walkoff) { this.final(M); return; }
    if (M.outs >= 3) { this.halfOver(M); return; }
    this.phase(M, 'playOver');
  },
  halfOver(M) {
    M.runners = []; M.bases = [null, null, null];
    BZ.bus.emit('halfEnd', { inning: M.inning, half: M.half, score: [M.teams[0].runs, M.teams[1].runs] });
    this.phase(M, 'halfEnd');
  },
  afterHalf(M) {
    const over = BZ.rules.gameOverAfterHalf(M);
    if (over && over.why === 'boom') { this.startBoom(M); return; }
    if (over) { M.endWhy = over.why; this.final(M); return; }
    // the boss's short circuit wears off, the Rally Cap
    for (const T of M.teams) if (T.shortCircuit > 0) T.shortCircuit--;
    BZ.rules.nextHalf(M);
    this.setupDefense(M);
    if (M.boss && M.half === 'top' && M.inning >= M.innings && BZ.leadBy(M) > 0 && M.teams[0].id === 'comets' && !M.rallyCap) { M.rallyCap = true; M.teams[0].meter = 100; BZ.bus.emit('rallyCap', {}); }
    this.phase(M, 'halfStart');
  },
  final(M) {
    const a = M.teams[0].runs, h = M.teams[1].runs;
    M.result = { winner: M.boomWinner !== undefined ? M.boomWinner : a > h ? 0 : h > a ? 1 : -1, score: [a, h], why: M.endWhy || (M.walkoff ? 'walkoff' : 'final') };
    BZ.bus.emit('gameEnd', M.result);
    this.phase(M, 'final');
  },
  /* ---- SUDDEN BOOM: the home run duel after 3 extra innings ---- */
  startBoom(M) {
    const pick = T => T.lineup.slice().sort((x, y) => y.pow - x.pow)[0];
    M.boom = { round: 0, side: 0, swings: [0, 0], feet: [0, 0], slugger: [pick(M.teams[0]), pick(M.teams[1])], max: 5, t: 0 };
    BZ.bus.emit('suddenBoom', {});
    this.phase(M, 'boom');
  },
  boom(M, dt) {
    const B = M.boom; B.t += dt;
    if (B.t < (M.fast ? 0 : 1.2)) return;
    B.t = 0;
    const side = B.side, sl = B.slugger[side], T = M.teams[side], R = BZ.R, L = BZ.ai.lv(M, side);
    // a machine pitch and a swing: the CPU's or the human's quality comes from the same model at the slugger's level
    const pitch = new BZ.Pitch(M, { type: 'machine', pitcher: { vel: 5, brk: 3 }, target: [(R() - .5) * 6, 15 + R() * 6], q: 1, rand: R });
    const c = pitch.cross(), human = T.humans.length > 0;
    const e = BZ.Rn(human ? .03 : L.swingSd), sw = { type: 'power', e, rx: c.x + BZ.Rn(1.2), rz: c.z + BZ.Rn(1.2) };
    const res = BZ.contact(sw, c, pitch.speed, sl, M.park, (sl.bt || 'R')[0] === 'L', BZ.assistFor(M, side));
    let feet = 0, carry = 0;
    if (res.kind === 'contact') {
      const b = Object.assign(BZ.newBall(), { x: M.park.H.x + c.x, y: M.park.H.y - 6, z: c.z, vx: res.v[0], vy: res.v[1], vz: res.v[2], mode: 'batted' });
      const pr = BZ.predict(b, M.park, 8); carry = BZ.feet(BZ.carry(b, M.park).dist); if (pr.hr) feet = carry;
    }
    B.feet[side] += feet; B.carry = B.carry || [0, 0]; B.carry[side] += carry; B.swings[side]++; B.last = { side, feet };
    BZ.bus.emit('boomSwing', { side, feet, slugger: sl });
    B.side = 1 - side;
    if (B.swings[0] >= B.max && B.swings[1] >= B.max) {
      // the most home-run feet wins; a tie goes on one swing each, and after three more the longest total carry decides
      const tie = B.feet[0] === B.feet[1], decide = !tie || B.max >= 8;
      if (decide) { M.boomWinner = !tie ? (B.feet[0] > B.feet[1] ? 0 : 1) : (B.carry[0] >= B.carry[1] ? 0 : 1); M.endWhy = 'boom'; M.teams[M.boomWinner].runs++; this.final(M); }
      else B.max++;
    }
  },
  /* ---- the step ---- */
  step(M, dt) {
    if (!M) return;
    M.clock += dt; M.phaseT += dt;
    BZ.supers.turboTick(M, dt);
    if (BZ.hazard && BZ.hazard.update) BZ.hazard.update(M, dt);
    if (M.cinematic) { M.cinematic.t += dt; if (M.cinematic.update) M.cinematic.update(M, dt); if (M.cinematic && M.cinematic.done) { const cb = M.cinematic.then; M.cinematic = null; if (cb) cb(); } return; }
    const ph = M.phase, skip = M.fast ? 0 : 1, anyA = BZ.match.anyAdvance(M);
    if (ph === 'pregame') { if (M.phaseT > 2.4 * skip || (anyA && M.phaseT > .4)) { BZ.bus.emit('playBall', {}); this.phase(M, 'halfStart'); } return; }
    if (ph === 'halfStart') { if (M.phaseT > 1.6 * skip || (anyA && M.phaseT > .3)) this.newAtBat(M); return; }
    if (ph === 'atBat') {
      if (M.ab.sub === 'settle') { M.ab.t += dt; if (M.ab.t > (M.fast ? 0 : .9)) { if (M.ab.next === 'batter') this.newAtBat(M); else this.nextPitch(M); } return; }
      this.atBat(M, dt); return;
    }
    if (ph === 'inPlay') { this.inPlay(M, dt); return; }
    if (ph === 'playOver') {
      const wait = M.play && (M.play.deadReason === 'hr') ? 2.2 : 1.3;
      if (M.phaseT > wait * skip || (anyA && M.phaseT > .35)) {
        if (M.play && M.play.kind !== 'batted' && M.ab) { this.phase(M, 'atBat'); this.nextPitch(M); }   // a steal, a wild pitch or a pickoff: the same at-bat goes on
        else this.newAtBat(M);
      }
      return;
    }
    if (ph === 'halfEnd') {
      if (M.phaseT > 2.4 * skip || (anyA && M.phaseT > .4)) {
        const over = BZ.rules.gameOverAfterHalf(M);
        if (!over && !M.fast && BZ.crowd && BZ.crowd.startShow && !M.attract && !(M.half === 'top' && false)) { this.phase(M, 'between'); BZ.crowd.startShow(M); }
        else this.afterHalf(M);
      }
      return;
    }
    if (ph === 'between') { if ((BZ.crowd && BZ.crowd.showDone(M)) || M.phaseT > 6 || (anyA && M.phaseT > .4)) { if (BZ.crowd) BZ.crowd.endShow(M); this.afterHalf(M); } return; }
    if (ph === 'rhubarb') { if (BZ.rhubarb) BZ.rhubarb.update(M, dt); return; }
    if (ph === 'boom') { this.boom(M, dt); return; }
    if (ph === 'final') return;
  },
  /** any human pressed ✕ / Enter / click to hurry a card along */
  anyAdvance(M) { for (const T of M.teams) for (const h of T.humans) if (h.input.pressed('south') || h.input.pressed('confirm')) return true; return false; }
};
BZ.matchStep = (M, dt) => BZ.match.step(M, dt);

/** run a whole CPU-vs-CPU game headless (balance sims, tests); returns the match */
BZ.simGame = (o = {}) => {
  const M = BZ.newMatch(Object.assign({ fast: true, innings: 9 }, o));
  let guard = 0;
  while (M.phase !== 'final' && guard++ < 2400 * 120) { BZ.match.step(M, 1 / 120); }
  BZ.endMatch(M);
  return M;
};
