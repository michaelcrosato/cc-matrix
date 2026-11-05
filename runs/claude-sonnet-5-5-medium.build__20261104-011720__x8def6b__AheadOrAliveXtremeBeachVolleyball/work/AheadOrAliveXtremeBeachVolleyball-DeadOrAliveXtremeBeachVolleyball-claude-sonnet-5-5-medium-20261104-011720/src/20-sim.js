/* 20-sim: the volleyball simulation. Court, ball flight, referee, players, the timing judge, the AI.
 * Coordinates: x along the court (net at 0, team 0 on x < 0), y across it, z up. One unit is about 10 cm. */
G.COURT = { HL: 80, HW: 40, NETW: 50, BALL_R: 4 };
const C = G.COURT;
const GRAV = () => G.T.gravity;

/* ---- ball flight: closed-form launches (with a little air drag) ---- */
G.launch = (b, tx, ty, tz, T) => {
  const k = G.T.ballDrag, g = GRAV();
  const f = k > 1e-4 ? (1 - Math.exp(-k * T)) / k : T;      // horizontal travel per unit initial speed
  b.vx = (tx - b.x) / f; b.vy = (ty - b.y) / f;
  b.vz = (tz - b.z + .5 * g * T * T) / T;
};
// make a launched ball clear the net (a tiny correction so a hard attack is not a net fault by default)
G.netClear = (b, margin = 3) => {
  if (b.x * b.vx >= 0) return;
  const t = -b.x / b.vx, z = b.z + b.vz * t - .5 * GRAV() * t * t, need = G.T.netHeight + C.BALL_R + margin;
  if (z < need && t > .02) b.vz += (need - z) / t;
};
// where and when will the ball be at height h (descending side), by stepping the same physics
G.predict = (b, h, maxT = 3) => {
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz, t = 0; const dt = 1 / 60, g = GRAV(), k = G.T.ballDrag;
  while (t < maxT) {
    const pz = z;
    vx -= vx * k * dt; vy -= vy * k * dt; vz -= g * dt; x += vx * dt; y += vy * dt; z += vz * dt; t += dt;
    if (vz < 0 && z <= h && pz > h - 1e-6 || z <= C.BALL_R) { return { x, y, z: Math.max(z, 0), t }; }
  }
  return { x, y, z, t };
};
// when does the ball enter a sphere (cx, cy, cz, rad) from now: null if never within maxT
G.etaTo = (b, cx, cy, cz, rad, maxT = 2) => {
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz, t = 0; const dt = 1 / 60, g = GRAV(), k = G.T.ballDrag;
  while (t < maxT) {
    if (Math.hypot(x - cx, y - cy, z - cz) <= rad) return t;
    vx -= vx * k * dt; vy -= vy * k * dt; vz -= g * dt; x += vx * dt; y += vy * dt; z += vz * dt; t += dt;
    if (z < 0) return null;
  }
  return null;
};

/* ---- stats from the cast, affinity ---- */
G.statMul = (id, stat) => { const c = G.CAST[id]; return c ? .75 + (c.stats[stat] || 3) * .1 : 1; };

class Player {
  constructor(m, team, slot, charId, ctl) {
    this.m = m; this.team = team; this.slot = slot; this.id = team * 2 + slot; this.charId = charId; this.char = G.CAST[charId] || G.CAST.you;
    this.side = team === 0 ? -1 : 1; this.x = this.side * 50; this.y = slot ? 14 : -14; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0;
    this.face = team === 0 ? 0 : Math.PI; this.ctl = ctl || { type: 'ai' }; this.human = this.ctl.type !== 'ai';
    this.swing = null; this.cool = 0; this.downT = 0; this.diveT = 0; this.diveDir = [0, 0]; this.claim = 0; this.celeb = 0; this.air = false; this.jumpWant = false;
    this.in = { mx: 0, my: 0, play: false, dive: false, call: false, ax: 0, ay: 0 };   // this step's controls
    this.react = 0; this.aiErr = 0; this.popup = null; this.popT = 0; this.ring = null; this.stepT = 0; this.expr = null; this.blockT = 0; this.tgt = null; this.pressAt = null;
    this.skill = .5; this.chem = 0; this.name = this.char.name;
  }
  get reach() { return G.T.reach * (this.diveT > 0 ? 1.65 : 1) * (.9 + this.char.stats.receive * .04); }
  center() { return [this.x, this.y, this.z + (this.diveT > 0 ? 8 : 17)]; }
}
G.Player = Player;

class Match {
  /** cfg: { teams: [[idA, idB], [idC, idD]], ctl: [4 controllers], to, house, tutorial, attract, serveTeam, names, chem } */
  constructor(cfg) {
    this.cfg = cfg; this.t = 0; this.score = [0, 0]; this.to = cfg.to || G.T.pointsToWin; this.rallyN = 0;
    this.players = []; this.events = []; this.stats = [{ aces: 0, spikes: 0, blocks: 0, digs: 0, perfect: 0, dives: 0 }, { aces: 0, spikes: 0, blocks: 0, digs: 0, perfect: 0, dives: 0 }];
    this.rng = cfg.seed !== undefined ? E.rng(cfg.seed >>> 0) : G.rng('match');
    for (let team = 0; team < 2; team++) for (let slot = 0; slot < 2; slot++) {
      const ctl = (cfg.ctl && cfg.ctl[team * 2 + slot]) || { type: 'ai' };
      const p = new Player(this, team, slot, cfg.teams[team][slot], ctl); this.players.push(p);
    }
    this.ball = { x: 0, y: 0, z: 40, vx: 0, vy: 0, vz: 0, r: C.BALL_R, state: 'held', side: 0, last: null, lastTeam: 0, touches: 0, served: false, spin: 0, trail: [], bounced: 0 };
    this.serving = cfg.serveTeam === undefined ? 0 : cfg.serveTeam; this.server = [0, 0];
    this.phase = 'intro'; this.phaseT = 0; this.winner = null; this.msg = null; this.msgT = 0; this.lastPoint = null; this.rally = { luck: false, spikes: 0, hits: 0 };
    this.hist = []; this.replay = null; this.camShake = 0; this.flash = 0; this.matchPoint = false; this.log = [];
    this.setSkills(); this.formation('serve');
    this.phase = 'intro'; this.phaseT = 0;
  }
  setSkills() {
    for (const p of this.players) {
      const base = G.T.aiSkill + (p.char.stats.receive - 3) * .035;
      p.skill = clamp(this.cfg.attract ? .9 : base + (this.cfg.skillBonus && this.cfg.skillBonus[p.team] || 0), .05, 1);
      p.chem = (this.cfg.chem && this.cfg.chem[p.team]) || 0;
      if (p.chem && !p.human) p.skill = clamp(p.skill + .25 * p.chem * G.T.chemistry, .05, 1);
    }
  }
  emit(ev, data) { const e = Object.assign({ ev, t: this.t }, data); this.events.push(e); G.bus.emit(ev, e, this); }
  say(text, t = 1.6) { this.msg = text; this.msgT = t; }
  // formation for the start of a rally
  formation(kind) {
    for (const p of this.players) {
      const s = p.side, serving = p.team === this.serving, isServer = serving && p.slot === this.server[p.team];
      p.swing = null; p.downT = 0; p.diveT = 0; p.z = 0; p.vz = 0; p.vx = p.vy = 0; p.celeb = 0; p.cool = 0; p.claim = 0; p.blockT = 0;
      if (serving) { if (isServer) { p.x = s * (C.HL + 10); p.y = 0; } else { p.x = s * 22; p.y = (p.slot ? 1 : -1) * 14; } }
      else { p.x = s * (p.slot === this.server[p.team] ? 44 : 30); p.y = (p.slot === this.server[p.team] ? -1 : 1) * 14; }
      p.face = s < 0 ? 0 : Math.PI;
    }
    const sv = this.serverPlayer(); this.ball.state = 'held'; this.ball.served = false; this.ball.touches = 0; this.ball.last = sv; this.ball.lastTeam = this.serving;
    this.ball.vx = this.ball.vy = this.ball.vz = 0; this.ball.x = sv.x + sv.side * -2; this.ball.y = sv.y; this.ball.z = 22; this.ball.trail.length = 0; this.ball.bounced = 0;
    this.rally = { luck: false, spikes: 0, hits: 0, serveT: 0 };
  }
  serverPlayer() { return this.players[this.serving * 2 + this.server[this.serving]]; }
  teamPlayers(t) { return [this.players[t * 2], this.players[t * 2 + 1]]; }
  other(p) { return this.players[p.team * 2 + (1 - p.slot)]; }
  opps(p) { return this.teamPlayers(1 - p.team); }

  /* ---------- the step ---------- */
  step(dt) {
    dt *= G.T.timeScale; this.t += dt; this.phaseT += dt; if (this.msgT > 0) this.msgT -= dt;
    this.flash = Math.max(0, this.flash - dt * 3); this.camShake = Math.max(0, this.camShake - dt * 4);
    // record for the instant replay
    this._rec = (this._rec || 0) + dt; if (this._rec > 1 / 30) { this._rec = 0; this.hist.push(this.snap()); if (this.hist.length > 120) this.hist.shift(); }
    if (this.phase === 'intro') { if (this.phaseT > (this.cfg.skipIntro ? .2 : 2.2)) { this.phase = 'serve'; this.phaseT = 0; G.sfx('whistle'); this.say(this.serverPlayer().name + ' TO SERVE', 1.4); this.emit('serveStart', { team: this.serving }); } this.moveAll(dt, true); return; }
    if (this.phase === 'end') { for (const p of this.players) { p.celeb = p.team === this.winner ? 1 : 0; this.pUpdate(p, dt, true); } return; }
    if (this.phase === 'point') {
      this.updateBall(dt, true); for (const p of this.players) this.pUpdate(p, dt, true);
      if (this.phaseT > (this.cfg.fastPoints ? 1.3 : 2.4)) this.nextRally();
      return;
    }
    for (const p of this.players) { this.controls(p, dt); }
    for (const p of this.players) this.pUpdate(p, dt, false);
    this.updateBall(dt, false);
    if (this.phase === 'serve') {
      const sv = this.serverPlayer();
      if (this.ball.state === 'held') { this.ball.x = sv.x - sv.side * -2 + 0; this.ball.y = sv.y; this.ball.z = 20 + (sv.swing ? 6 : 0); }
      if (this.phaseT > 1.0 && this.ball.state === 'held' && sv.human === false && this.cfg.tutorialWait) { /* tutorial: wait */ }
    }
  }
  moveAll(dt, locked) { for (const p of this.players) this.pUpdate(p, dt, locked); }

  /* ---------- controls: humans from this.in, AI from think() ---------- */
  controls(p, dt) {
    if (p.ctl.type === 'ai') this.think(p, dt);
    else if (p.ctl.read) p.ctl.read(p);       // fills p.in (local input, or a remote client's last message)
    if (p.in.call && !p.callPrev) { p.claim = 1.2; if (!G.hub) { this.say(p.name + ': "MINE!"', .8); G.sfx('call'); G.speak(p.charId, 'a'); } this.emit('call', { p }); }   // (in a hub session a call only steers the CPU partner: no player-to-player signals)
    p.callPrev = p.in.call;
  }
  /* ---------- the player ---------- */
  pUpdate(p, dt, locked) {
    const T = G.T, I = p.in;
    p.claim = Math.max(0, p.claim - dt); p.cool = Math.max(0, p.cool - dt); p.popT = Math.max(0, p.popT - dt); p.blockT = Math.max(0, p.blockT - dt);
    // movement
    let mx = locked ? 0 : I.mx, my = locked ? 0 : I.my; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    const sp = (p.human ? T.moveSpeed : T.moveSpeed * T.aiSpeed) * (.88 + p.char.stats.speed * .05) * (p.swing ? .55 : 1) * (p.z > 1 ? .5 : 1);
    if (p.downT > 0) { p.downT -= dt; p.vx *= .88; p.vy *= .88; }
    else if (p.diveT > 0) {
      p.diveT -= dt; p.vx = p.diveDir[0] * T.diveSpeed * (p.diveT / .38 + .3); p.vy = p.diveDir[1] * T.diveSpeed * (p.diveT / .38 + .3);
      if (p.diveT <= 0) { p.downT = .55; }
    } else { p.vx = approach(p.vx, mx * sp, dt * 900); p.vy = approach(p.vy, my * sp, dt * 900); }
    if (p.z > 0 || p.vz > 0) { p.vz -= T.gravity * 1.2 * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; if (p.air) { p.air = false; G.sfx('land', { vol: .3 }); } } } else p.air = false;
    p.x += p.vx * dt; p.y += p.vy * dt;
    // keep out of the net and inside the extended court
    const lim = p.side * 4;
    if (p.side < 0) p.x = clamp(p.x, -(C.HL + 28), -4); else p.x = clamp(p.x, 4, C.HL + 28);
    void lim; p.y = clamp(p.y, -(C.HW + 22), C.HW + 22);
    const spd = Math.hypot(p.vx, p.vy);
    p.face = p.side < 0 ? 0 : Math.PI;
    if (spd > 8 && p.z <= 0 && p.diveT <= 0) { p.stepT -= dt; if (p.stepT <= 0) { p.stepT = .24; if (this.cfg.sounds !== false && p.human) G.sfx('step', { vol: .35 }); } }
    // buttons
    if (!locked) {
      if (I.dive && !p.diveP && p.diveT <= 0 && p.downT <= 0 && p.z <= 0 && this.phase === 'rally') {
        let dx = mx, dy = my; if (Math.hypot(dx, dy) < .2) { const b = this.ball; dx = b.x - p.x; dy = b.y - p.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; }
        else { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
        p.diveT = .38; p.diveDir = [dx, dy]; p.swing = { t: 0, dur: .34, hit: false, dive: true, pressT: this.t }; G.sfx('dive', { vol: .5 }); this.stats[p.team].dives++; this.emit('dive', { p });
      }
      if (I.play && !p.playP) this.pressPlay(p);
    }
    p.diveP = I.dive; p.playP = I.play;
    // swing progress and contact
    if (p.swing) {
      p.swing.t += dt;
      if (!p.swing.hit) this.tryContact(p);
      if (p.swing.t >= p.swing.dur) { p.swing = null; p.cool = .12; }
    }
    // the timing ring for the next contact (for humans)
    p.ring = null;
    if (p.human && this.phase === 'rally' && this.ball.state === 'flight' && !p.swing) {
      const c = p.center(), eta = G.etaTo(this.ball, c[0], c[1], c[2], p.reach + C.BALL_R, 1.4);
      if (eta !== null && (this.ball.x * p.side > -6 || Math.abs(this.ball.x) < 22)) p.ring = { eta };
    }
  }
  pressPlay(p) {
    const b = this.ball, T = G.T;
    if (p.downT > 0 || p.swing || p.cool > 0) return;
    if (this.phase === 'serve') {
      if (p !== this.serverPlayer()) return;
      if (b.state === 'held') {            // toss
        b.state = 'flight'; b.vx = 0; b.vy = 0; b.vz = 150; b.x = p.x - p.side * 0; b.y = p.y; b.z = 24; b.last = p; b.lastTeam = p.team; b.touches = 0; b.served = true; b.tossT = this.t;
        p.vz = T.jumpVel * .55; p.air = true; G.sfx('toss'); this.emit('toss', { p }); p.tossed = true; return;
      }
    }
    if (this.phase !== 'serve' && this.phase !== 'rally') return;
    // swing
    p.swing = { t: 0, dur: .3, hit: false, pressT: this.t };
    // jump for a ball that is high near the net, or to block
    const c = this.ball, near = Math.abs(p.x) < 40;
    if (p.z <= 0 && p.diveT <= 0 && ((c.z > 28 && near) || (this.phase === 'serve' && p === this.serverPlayer() && c.z > 26) || (near && Math.abs(c.x) < 26 && c.z > T.netHeight - 6))) {
      p.vz = T.jumpVel; p.air = true; G.sfx('jump', { vol: .5 });
    }
  }
  tryContact(p) {
    const b = this.ball, T = G.T; if (b.state !== 'flight') return;
    const c = p.center(), d = Math.hypot(b.x - c[0], b.y - c[1], b.z - c[2]), rad = p.reach + C.BALL_R;
    if (d > rad) return;
    // right side of the net, or a block over the net
    const onMySide = b.x * p.side > 0, nearNet = Math.abs(b.x) < 16;
    const attackedAtMe = !onMySide && b.lastTeam !== p.team;
    if (!onMySide && !(attackedAtMe && nearNet && (p.z > 4 || p.blockT > 0) && b.z > T.netHeight - 10)) return;
    if (!onMySide) { this.contactBlock(p, d, rad); return; }
    if (b.last === p && b.touches > 0 && !(this.phase === 'serve')) return;       // no double touches
    if (b.lastTeam === p.team && b.touches >= 3) return;                             // three touches only
    if (this.phase === 'serve' && p !== this.serverPlayer()) return;
    // timing: the swing's peak is at half its length
    const e = Math.abs(p.swing.t - p.swing.dur * .5);
    let q; if (e <= T.perfectWindow) q = 1; else if (e <= T.timingWindow) q = .75 - (e - T.perfectWindow) / (T.timingWindow - T.perfectWindow) * .3; else q = Math.max(.12, .45 - (e - T.timingWindow) * 1.8);
    q *= (1 - .35 * d / rad);
    if (!p.human) q = clamp(q * (.8 + p.skill * .25), .1, 1);
    this.contact(p, q, d / rad, e);
  }
  grade(q, e) { return e <= G.T.perfectWindow ? 'PERFECT' : q > .55 ? 'GOOD' : q > .3 ? 'OK' : 'LATE'; }

  /* ---------- a touch ---------- */
  aimTarget(p, depthMin, depthMax) {
    // human: stick/mouse; AI: pick the least covered spot
    const opp = this.opps(p), s = -p.side;
    if (p.human && (Math.abs(p.in.ax) + Math.abs(p.in.ay) > .25)) {
      const ax = p.in.ax * -p.side, ay = p.in.ay;                     // deeper into the opponents' court is +ax
      const depth = clamp(0.5 + 0.5 * ax, 0, 1);
      return [s * (depthMin + (depthMax - depthMin) * depth), clamp(ay * (C.HW - 6), -C.HW + 5, C.HW - 5)];
    }
    let best = null, bs = -1;
    for (let k = 0; k < 7; k++) {
      const tx = s * (depthMin + this.rng() * (depthMax - depthMin)), ty = (this.rng() * 2 - 1) * (C.HW - 6);
      const sc = Math.min(Math.hypot(opp[0].x - tx, opp[0].y - ty), Math.hypot(opp[1].x - tx, opp[1].y - ty)) + (p.human ? this.rng() * 12 : this.rng() * (1 - p.skill) * 60);
      if (sc > bs) { bs = sc; best = [tx, ty]; }
    }
    return best;
  }
  contact(p, q, off, e) {
    const b = this.ball, T = G.T, s = p.side, tc = (b.lastTeam === p.team && b.state === 'flight' && b.served !== 'x') ? b.touches : 0;
    const isServe = this.phase === 'serve' && p === this.serverPlayer();
    const err = (1 - q) * (isServe ? 26 : 22) + off * 6; let kind;
    const jit = () => (this.rng() * 2 - 1);
    p.swing.hit = true; p.expr = 'shout';
    if (isServe) {
      kind = 'serve'; const [tx, ty] = this.aimTarget(p, 18, 74);
      const dist = Math.hypot(tx - b.x, ty - b.y), Tm = clamp(dist / (150 * T.serveSpeed * (.9 + p.char.stats.power * .04)), .55, 1.4);
      G.launch(b, tx + jit() * err * (q > .95 ? .3 : 1), ty + jit() * err, 0, Tm); G.netClear(b, 4 + (1 - q) * 2); this.phase = 'rally'; this.phaseT = 0; b.served = true; b.touches = 0;
      p.swing.dur = .3; this.emit('serve', { p, q });
      this.stats[p.team].perfect += q >= .99 ? 1 : 0;
    } else {
      // bump first, set second, attack third
      const spikeOK = b.z >= T.netHeight - 2 && p.z > 3 && Math.abs(p.x) < 36;
      if (tc === 0) {
        kind = 'bump'; const mate = this.other(p), sx = s * 17, sy = clamp(mate.y + (mate.vy || 0) * .3, -20, 20);
        G.launch(b, sx + jit() * err * .8, sy + jit() * err * .8, T.netHeight + 14, .95); this.stats[p.team].digs++;
      } else if (tc === 1) {
        kind = 'set'; const hit = this.other(p), hx = s * 11, hy = clamp(hit.y, -26, 26);
        G.launch(b, hx + jit() * err * .5, hy + jit() * err * .6, T.netHeight + 11, .62 + .08 * (1 - q));
      } else {
        const [tx, ty] = this.aimTarget(p, 14, 74);
        if (spikeOK) {
          kind = 'spike'; const dist = Math.hypot(tx - b.x, ty - b.y);
          G.launch(b, tx + jit() * err * .8, ty + jit() * err * .9, 0, clamp(dist / (230 * T.spikePower * (.85 + p.char.stats.power * .06) * (.7 + q * .3)), .3, 1)); G.netClear(b, 1 + (1 - q) * 3);
          this.rally.spikes++; this.stats[p.team].spikes++;
        } else { kind = 'free'; G.launch(b, tx * .9 + jit() * err, ty + jit() * err, 0, .95); G.netClear(b, 6); }
      }
      if (b.lastTeam !== p.team) b.touches = 0; b.touches++; b.lastTeam = p.team; b.last = p; this.rally.hits++;
    }
    b.state = 'flight'; b.last = p; b.lastTeam = p.team; b.side = Math.sign(b.vx) || b.side; b.bounced = 0;
    const grade = this.grade(q, e); p.popup = { text: kind === 'serve' && q > .9 ? 'SERVE!' : grade, kind, q }; p.popT = .8;
    if (q >= .99 && kind !== 'serve') this.stats[p.team].perfect++;
    G.sfx(kind === 'spike' ? 'spike' : kind === 'serve' ? 'serve' : kind === 'set' ? 'set' : q >= .99 ? 'bumpPerfect' : 'bump', { vol: .9 });
    if (q >= .99) G.sfx('perfect', { vol: .5 }); else if (q < .3) G.sfx('miss', { vol: .4 });
    if (kind === 'spike') { this.camShake = .6; this.flash = .5; G.game.shake(2); G.game.freeze(.05); }
    G.game.input.rumble && p.human && p.ctl.input && p.ctl.input.rumble && p.ctl.input.rumble(.35, .1);
    this.emit('touch', { p, kind, q, grade });
    // a block next to the net may stop an attack
    b.spin = (this.rng() - .5) * 8;
  }
  contactBlock(p, d, rad) {
    const b = this.ball, T = G.T; p.swing.hit = true;
    const e = Math.abs(p.swing.t - p.swing.dur * .5), q = e <= T.timingWindow ? .8 : .45;
    const strong = q > .6 || (!p.human && this.rng() < p.skill * .6);
    const s = p.side;
    if (strong) {                                  // stuffed: down onto the attacker's side (a point)
      b.vx = -s * (60 + this.rng() * 30);
      b.vy = (this.rng() - .5) * 40; b.vz = -60; b.x = -s * 3; this.stats[p.team].blocks++; this.say('BLOCKED!', 1.2); this.emit('block', { p, strong: true }); b.lastTeam = p.team; b.last = p; b.touches = 0;
      p.popup = { text: 'BLOCK!', kind: 'block', q: 1 };
    } else {                                       // a soft touch: floats on to the blockers' side
      b.vx = p.side * 60; b.vy *= .3; b.vz = 120; b.lastTeam = 1 - p.team; b.last = p; b.touches = 0;
      p.popup = { text: 'TOUCH', kind: 'block', q: .4 }; this.emit('block', { p, strong: false });
    }
    p.popT = .8; G.sfx('spike', { vol: .6 }); G.game.shake(2); b.state = 'flight';
  }

  /* ---------- the ball ---------- */
  updateBall(dt, dead) {
    const b = this.ball, T = G.T; if (b.state === 'held') return;
    const px0 = b.x;
    b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
    b.vx -= b.vx * T.ballDrag * dt; b.vy -= b.vy * T.ballDrag * dt; b.vz -= T.gravity * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.state === 'dead') {                       // after the point: bounce and roll
      if (b.z <= C.BALL_R) { b.z = C.BALL_R; if (b.vz < -25) { b.vz = -b.vz * .4; G.sfx('bounce', { vol: .25 }); } else b.vz = 0; b.vx *= .94; b.vy *= .94; }
      return;
    }
    if (dead) return;
    // the net
    if ((px0 < 0) !== (b.x < 0) && px0 !== 0) {
      if (b.z < T.netHeight + C.BALL_R && Math.abs(b.y) < C.NETW + 4 && b.z > 0) {
        b.x = px0 < 0 ? -1.5 : 1.5; b.vx *= -.18; b.vy *= .5; b.vz = Math.min(b.vz, 20); G.sfx('net', { vol: .6 }); this.emit('net', {});
        if (b.vz < 0 && b.z < T.netHeight - 8) { b.vz = 10; }
        // a ball that goes into the net is still alive on the side it came from; touches stay
        if (b.last && b.touches >= 3 && b.lastTeam === (px0 < 0 ? 0 : 1)) { /* last touch into the net: just drops */ }
      } else {
        // crossed: the other side's touches start from 0
        b.touches = 0; b.side = b.x < 0 ? -1 : 1; this.rally.luck = this.rally.luck;
        if (this.cfg.attract !== true) { /* nothing */ }
      }
    }
    if (b.z <= C.BALL_R && b.vz < 0) this.landed();
  }
  landed() {
    const b = this.ball, T = G.T; b.z = C.BALL_R;
    const sideTeam = b.x < 0 ? 0 : 1;
    const inBounds = Math.abs(b.x) <= C.HL + 2 && Math.abs(b.y) <= C.HW + 2;
    // THE HOUSE: a lucky bounce keeps the ball alive on the House's side, once a rally
    if (this.cfg.house && inBounds && sideTeam === 1 && !this.rally.luck && this.phase === 'rally' && this.rng() < .3) {
      this.rally.luck = true; b.vz = 150; b.vx *= .3; b.vy *= .3; b.touches = 0; b.lastTeam = 0; G.sfx('jackpot', { vol: .5 }); this.say('LUCKY BOUNCE!', 1.4); this.emit('lucky', {}); b.bounced++; return;
    }
    let winner, why;
    if (this.phase === 'serve' && !b.served) return;
    if (!inBounds) { winner = 1 - b.lastTeam; why = 'out'; }
    else { winner = 1 - sideTeam; why = b.lastTeam === sideTeam && b.touches > 0 ? 'down' : 'floor'; }
    if (b.touches === 0 && b.last && this.rally.hits === 0 && inBounds && sideTeam !== b.lastTeam) why = 'ace';
    this.pointTo(winner, why);
  }
  pointTo(winner, why) {
    const b = this.ball; if (this.phase === 'point' || this.phase === 'end') return;
    const lastTeam = b.lastTeam; this.score[winner]++; this.phase = 'point'; this.phaseT = 0; b.state = 'dead'; b.vx *= .3; b.vy *= .3; b.vz = Math.abs(b.vz) * .3;
    const ace = why === 'ace' && winner === lastTeam; if (ace) this.stats[winner].aces++;
    this.lastPoint = { winner, why, ace, spikes: this.rally.spikes };
    this.matchPoint = false;
    for (const p of this.players) { p.celeb = p.team === winner ? 1 : 0; p.expr = p.team === winner ? 'smile' : 'wince'; p.swing = null; }
    this.say(ace ? 'ACE!' : why === 'out' ? 'OUT!' : (this.rally.spikes && winner === lastTeam) ? 'SPIKE!' : 'POINT!', 1.6);
    G.sfx('whistle'); G.sfx(winner === 0 ? 'point' : 'lose', { vol: .6 }); if (winner === 0) G.sfx('cheer', { vol: .7 });
    this.crowdBurst = 1.4; this.emit('point', { winner, why, ace, score: this.score.slice() });
    // serve rotation: the team that wins the rally serves next; if it was not serving, its other player serves
    if (winner !== this.serving) { this.serving = winner; this.server[winner] = 1 - this.server[winner]; }
    // match over?
    const [a, c] = this.score;
    if ((a >= this.to || c >= this.to) && Math.abs(a - c) >= 2) { this.winner = a > c ? 0 : 1; this.endT = this.t; }
    else if (Math.max(a, c) >= this.to - 1 && Math.abs(a - c) >= 1) { this.matchPoint = true; }
    // a replay of the highlight
    this.replayFrames = (ace || this.rally.spikes > 0 || this.rally.hits >= 6) ? this.hist.slice(-80) : null;
  }
  nextRally() {
    if (this.winner !== null) { this.phase = 'end'; this.phaseT = 0; G.jingle('victory'); this.emit('matchEnd', { winner: this.winner, score: this.score.slice() }); return; }
    this.phase = 'serve'; this.phaseT = 0; this.formation('serve'); this.rallyN++;
    const sv = this.serverPlayer(); this.say(this.matchPoint ? 'MATCH POINT' : sv.name + ' TO SERVE', 1.3); G.sfx('whistle', { vol: .5 });
    for (const p of this.players) p.expr = null;
  }

  /* ---------- the AI ---------- */
  think(p, dt) {
    const I = p.in, b = this.ball, T = G.T; I.play = false; I.dive = false; I.call = false; I.mx = 0; I.my = 0; I.ax = 0; I.ay = 0;
    if (p.downT > 0 || this.phase === 'intro') return;
    const mate = this.other(p), side = p.side, sk = p.skill;
    p.react -= dt;
    const goto = (x, y, tol = 3) => { const dx = x - p.x, dy = y - p.y, l = Math.hypot(dx, dy); if (l > tol) { I.mx = dx / l * Math.min(1, l / 14); I.my = dy / l * Math.min(1, l / 14); } return l; };
    if (this.phase === 'serve') {
      if (p === this.serverPlayer()) {
        goto(side * (C.HL + 10), clamp(b.y, -10, 10) * 0, 1);
        if (b.state === 'held' && this.phaseT > (this.cfg.attract ? .9 : 1.4 + (1 - sk) * .6) && !(this.cfg.tutorialHold)) I.play = true;
        else if (b.state === 'flight' && b.served && b.touches === 0) {
          // hit at the top of the toss, descending a little
          const tt = this.t - (b.tossT || 0), want = .62 + (this.rng() - .5) * (1 - sk) * .25;
          if (tt > want && b.vz < 30) { I.play = true; const t = this.aimTarget(p, 24, 70); I.ax = -side * (t[0] < 0 ? -1 : 1) * 0.0; }
          p.pressAt = null;
        }
      } else goto(side * 24, (p.slot ? 1 : -1) * 14);
      return;
    }
    if (this.phase !== 'rally') return;
    const mine = b.x * side > 0 || (b.lastTeam !== p.team && Math.abs(b.x) < 12 && b.vx * side < 0);
    const incoming = b.lastTeam !== p.team && (b.vx * side > 0 || b.x * side > 0);
    const rallyMine = b.lastTeam === p.team && b.touches > 0 && b.touches < 3 && b.x * side > -2 && b.state === 'flight';
    // who plays it? the nearer of the two (not the last toucher unless it is a first touch)
    const intercept = pl => {
      const tgt = G.predict(b, 18, 2.4); const t = tgt.t; const x = clamp(tgt.x, side < 0 ? -(C.HL + 18) : 6, side < 0 ? -6 : C.HL + 18), y = clamp(tgt.y, -C.HW - 14, C.HW + 14);
      return { x, y, t, dist: Math.hypot(x - pl.x, y - pl.y), time: Math.hypot(x - pl.x, y - pl.y) / (T.moveSpeed * T.aiSpeed * .95) };
    };
    const iAm = (() => {
      if (!(incoming || rallyMine) && !(b.lastTeam === p.team && b.touches === 0)) return false;
      if (b.lastTeam === p.team && b.touches >= 3) return false;
      const a = intercept(p), m = intercept(mate);
      const eligible = pl => !(b.last === pl && b.touches > 0 && b.lastTeam === p.team);
      let ma = a.time - (p.claim > 0 ? .5 : 0), mm = m.time - (mate.claim > 0 ? .5 : 0) + (mate.downT > 0 ? .6 : 0);
      if (!eligible(p)) return false; if (!eligible(mate)) return true;
      if (mate.human && mate.claim > 0) mm -= .3;
      return ma <= mm;
    })();
    if (iAm) {
      const ic = intercept(p);
      // the human reaction delay for the first move toward a new ball
      const spot = [ic.x, ic.y];
      // go where the ball will be at hitting height; prefer to wait for it
      const tol = 2; const l = goto(spot[0], spot[1], tol);
      // hit time: swing peak when the ball reaches the contact sphere
      const c = p.center(), eta = G.etaTo(b, c[0], c[1], c[2], p.reach + C.BALL_R * .5, 1.5);
      const need = p.swing ? 99 : .15 + (this.rng() - .5) * (1 - sk) * .22;
      if (eta !== null && eta <= need && l < p.reach * 1.1 && !p.swing && p.cool <= 0) I.play = true;
      // a long way off: dive
      if (!I.play && p.diveT <= 0 && ic.time > ic.t * .95 && l < 48 && l > p.reach * 1.2 && ic.t < .5 && sk > .35) { I.dive = this.rng() < .08 + sk * .12; I.mx = (ic.x - p.x) / Math.max(1, l); I.my = (ic.y - p.y) / Math.max(1, l); }
      // spike height: jump for it via pressPlay
      if (b.touches === 2 && b.lastTeam === p.team) { /* attacking: face open court */ }
      return;
    }
    // not the player: position
    if (rallyMine || (b.lastTeam === p.team && b.touches > 0)) {   // support: hitter waits at the net
      const gy = clamp(b.y, -22, 22) * .3 + (p.slot ? 12 : -12);
      goto(side * (b.touches >= 1 ? 16 : 24), gy);
    } else if (b.lastTeam !== p.team && Math.abs(b.x) < 6 && b.z > T.netHeight && (b.vx * side > 0 || b.x * side > 0)) {
      goto(side * 6, clamp(b.y, -30, 30));
    } else if (incoming) {
      // cover the back
      const t = G.predict(b, 18, 2.4); const cover = (mate.y > 0) ? -16 : 16; goto(side * clamp(Math.abs(t.x) + 16, 34, 66), cover);
      // block at the net when a spike is coming
      if (this.rally.spikes > 0 || (b.touches >= 2 && b.lastTeam !== p.team)) { /* stay */ }
    } else {
      goto(side * (p.slot === this.server[p.team] ? 46 : 32), (p.slot === this.server[p.team] ? -1 : 1) * 15);
    }
    // blocking: the front player jumps when the opponents are about to attack
    const front = Math.abs(p.x) < 28;
    if (front && !p.swing && p.z <= 0 && b.lastTeam !== p.team && Math.abs(b.x) < 18 && b.z > T.netHeight - 8 && this.rng() < .08 + sk * .1 && b.vx * side > 0) { I.play = true; }
    void mine;
  }

  /* ---------- snapshots (replay, net sync) ---------- */
  snap() {
    const b = this.ball;
    return { t: this.t, b: [b.x, b.y, b.z, b.state === 'dead' ? 1 : 0], p: this.players.map(p => [p.x, p.y, p.z, p.vx, p.vy, p.swing ? p.swing.t / p.swing.dur : -1, p.diveT > 0 ? 1 : p.downT > 0 ? 2 : 0, p.celeb ? 1 : 0]) };
  }
  state() {
    const b = this.ball;
    return { t: +this.t.toFixed(2), score: this.score.slice(), phase: this.phase, serving: this.serving, ball: [+b.x.toFixed(1), +b.y.toFixed(1), +b.z.toFixed(1)], touches: b.touches, winner: this.winner,
      players: this.players.map(p => [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]), stats: this.stats };
  }
}
G.Match = Match;
