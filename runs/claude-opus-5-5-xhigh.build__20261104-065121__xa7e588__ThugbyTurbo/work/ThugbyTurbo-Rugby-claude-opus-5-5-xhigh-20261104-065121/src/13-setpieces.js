/* ---- SET PIECES: the walk-out, kick-offs and 22 drop-outs, rucks, scrums, lineouts, set kicks (conversions and penalty
 * goals) and the penalty's choice. Humans play each one through their seat's intent; the CPU by its difficulty ---- */
const POD_NAMES = ['FRONT', 'MIDDLE', 'BACK'];
TT.POD_NAMES = POD_NAMES;
Object.assign(Match.prototype, {
  /** a human seat's intent for team t (the first one), or null: set pieces read its presses */
  humanI(t) { const s = this.seats.find(q => q.team === t && q.kind !== 'cpu'); return s ? s.I : null; },
  humanSeats(t) { return this.seats.filter(q => q.team === t && q.kind !== 'cpu'); },
  /** a set kick or a restart is the human's to take: their seat moves to the kicker */
  seatToKicker(team, id) { const s = this.humanSeats(team)[0]; if (s && id >= 0 && s.pid !== id && this.players[id] && this.players[id].ctl < 0) this.assign(s, id); },
  /** kick-off formation spots for the kicking team k and the receivers (snap: place them there now) */
  formation(kind, k, snap) {
    const spots = {};
    const kick = [[-24, -190], [-24, -120], [-24, -50], [-30, 40], [-4, 0], [-24, 120], [-24, 190]];
    const recv = [[110, -90], [115, 0], [110, 90], [190, -30], [250, 70], [200, 170], [320, -150]];
    const base = kind === 'dropout' ? this.ownLine(k) + this.dir[k] * G.L22 : G.CX;
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const d = this.dir[k], [dx, dy] = (p.team === k ? kick : recv)[p.slot];
      spots[p.id] = [base + d * dx, G.CY + dy * (p.team === k ? 1 : (k ? -1 : 1))];
      if (kind === 'dropout' && p.team !== k) spots[p.id][0] = base + d * (dx * .8 + 60);
    }
    if (snap) for (const p of this.players) if (spots[p.id]) { p.x = spots[p.id][0]; p.y = spots[p.id][1]; p.vx = p.vy = 0; p.f = p.team === k ? (this.dir[k] > 0 ? 0 : PI) : (this.dir[k] > 0 ? PI : 0); this.setSt(p, 'free'); }
    return spots;
  },
  /* ---- the walk-out: both teams jog out of the tunnel to their places ---- */
  ph_intro(dt) {
    if (!this.introInit) {
      this.introInit = true; this.introSpots = this.formation('kickoff', this.kickoffTeam, false);
      for (const p of this.players) { p.x = G.CX + (p.team ? 14 : -14) + (p.slot - 3) * 3; p.y = G.Y1 + 30 + p.slot * 4; p.f = -PI / 2; }
    }
    for (const p of this.players) { const s = this.introSpots[p.id]; if (s) this.walkTo(p, s[0], s[1], dt, .8); }
    const skip = this.seats.some(s => s.I.pr.x || s.I.pr.ci || s.I.pr.tri) || this.o.skipIntro;
    if (skip || this.phaseT > 5.5 || this.players.every(p => { const s = this.introSpots[p.id]; return !s || dist2(p.x, p.y, s[0], s[1]) < 3; })) this.goPhase('kickoff');
  },
  /* ---- kick-off and 22 drop-out ---- */
  kickoffSetup(team, kind) {
    this.ball.st = 'dead'; this.ball.holder = -1; this.adv = null; this.breakDone = false; this.tryRun = null; this.kickForTouch = undefined;
    const kicker = this.players.filter(p => p.team === team && this.onPitch(p)).sort((a, b) => (b.slot === 4) - (a.slot === 4) || b.kck - a.kck)[0];
    const spots = this.formation(kind, team, false);
    const base = kind === 'dropout' ? this.ownLine(team) + this.dir[team] * G.L22 : G.CX;
    if (kicker) spots[kicker.id] = [base - this.dir[team] * 6, G.CY];
    if (kicker) this.seatToKicker(team, kicker.id);
    this.setp = { kind, team, kicker: kicker ? kicker.id : -1, spots, aim: { x: base + this.dir[team] * 170, y: G.CY + (team ? 1 : -1) * 120 }, power: 0, charging: false, t: 0, base };
    for (const p of this.players) if (p.st === 'cele' || p.st === 'set' || p.st === 'ruck') this.setSt(p, 'free');
    if (kind === 'dropout') this.goPhaseOnly('dropout');
    this.emit('kickoffSetup', { team, kind });
  },
  goPhaseOnly(ph) { this.phase = ph; this.sub = ''; this.phaseT = 0; this.emit('phase', { phase: ph }); },
  dropoutSetup(team) { this.kickoffSetup(team, 'dropout'); this.emit('dropout', { team }); },
  ph_dropout(dt) { this.ph_kickoff(dt); },
  ph_kickoff(dt) {
    const S = this.setp; if (!S) return this.kickoffSetup(this.kickoffTeam, 'kickoff');
    S.t += dt;
    for (const p of this.players) if (this.onPitch(p) && S.spots[p.id] && p.st === 'free') this.walkTo(p, S.spots[p.id][0], S.spots[p.id][1], dt, 1.2);
    else if (this.onPitch(p)) this.stepPlayers1(p, dt);
    const k = this.players[S.kicker]; if (!k) return this.kickoffKick(null);
    k.f = this.dir[S.team] > 0 ? 0 : PI;
    this.ball.x = k.x + Math.cos(k.f) * 4; this.ball.y = k.y; this.ball.z = 12; this.ball.st = 'dead';
    if (S.t < .9) return;
    const d = this.dir[S.team], I = k.ctl >= 0 ? this.seats[k.ctl].I : null;
    if (I) {
      // the reticle: the stick (or the mouse on the ground) aims it on the receiving half; O (or the left button) held powers it
      if (I.aim) { S.aim.x = I.aim.x; S.aim.y = I.aim.y; }
      else { S.aim.x += I.mx * 220 * dt; S.aim.y += I.my * 220 * dt; }
      S.aim.x = d > 0 ? clamp(S.aim.x, S.base + 40, G.X1 + 40) : clamp(S.aim.x, G.X0 - 40, S.base - 40);
      S.aim.y = clamp(S.aim.y, G.Y0 - 20, G.Y1 + 20);
      if (I.hd.ci || I.hd.x) { S.charging = true; S.power = Math.min(1, S.power + dt / .9); }
      else if (S.charging) { S.charging = false; this.kickoffKick(S); }
      else if (S.t > 14) { S.power = .8; this.kickoffKick(S); }
    } else if (S.t > 1.7) {
      const side = this.rng() < .5 ? -1 : 1, long = this.setp.kind === 'dropout' ? 220 + this.rng() * 120 : 120 + this.rng() * 80;
      S.aim = { x: S.base + d * long, y: G.CY + side * (80 + this.rng() * 140) }; S.power = .82 + this.rng() * .08;
      this.kickoffKick(S);
    }
  },
  /** the kick-off leaves the boot: a drop kick toward the reticle; the power decides how far (.85 lands on it) */
  kickoffKick(S) {
    S = S || this.setp || { team: this.kickoffTeam, kicker: -1, aim: { x: G.CX + this.dir[this.kickoffTeam] * 160, y: G.CY }, power: .85, kind: 'kickoff', base: G.CX };
    const k = this.players[S.kicker] || this.players.find(p => p.team === S.team && this.standing(p));
    const d0 = dist2(k.x, k.y, S.aim.x, S.aim.y), len = d0 * clamp(S.power / .85, .3, 1.5) * (this.megaBoot && this.megaBoot[S.team] > 0 ? 1.3 : 1);
    const a = Math.atan2(S.aim.y - k.y, S.aim.x - k.x) + (this.rng() - .5) * (11 - Math.min(10, k.kck)) * PI / 180 * .5;
    const v = E.arc({ x: k.x, y: k.y, z: 8 }, { x: k.x + Math.cos(a) * len, y: k.y + Math.sin(a) * len, z: 0 }, 600, { apex: 70 + 30 * S.power });
    this.ball.st = 'held'; this.ball.holder = k.id;
    this.release(k, v.vx, v.vy, v.vz, S.kind === 'dropout' ? 'dropoutk' : 'kickoff');
    this.ball.kickBase = S.base; this.ball.kickTeam = S.team;
    this.setSt(k, 'kick', .35); k.a.act = 'drop'; k.a.u = 0;
    this.setp = null; this.phase = 'play'; this.sub = ''; this.phaseT = 0;
    this.emit(S.kind === 'dropout' ? 'dropoutKick' : 'kickoff', { team: S.team, id: k.id });
  },
  /** a kick-off must go ten metres: checked as it lands or is caught */
  kickoffCheck(catcher) {
    const b = this.ball; if (b.kind !== 'kickoff') return false;
    const gone = (b.x - b.kickBase) * this.dir[b.kickTeam];
    b.kind = 'kickoffDone';
    if (gone < G.L10 && (!catcher || catcher.team === b.kickTeam || gone < G.L10 - 10)) {
      this.emit('notTen', { team: b.kickTeam }); this.refCall('ten');
      const t = 1 - b.kickTeam;
      this.whistle('notTen', () => this.penaltyAward(t, G.CX + this.dir[t] * 0, G.CY, 'notTen', true));
      return true;
    }
    return false;
  },
  /** players who are in no set-piece state still need their timers stepped */
  stepPlayers1(p, dt) {
    p.stT += dt;
    if (p.st === 'down' && p.stT >= p.stDur && !p.pin) this.setSt(p, 'up', .4);
    else if (p.st === 'up' && p.stT >= p.stDur) this.setSt(p, 'free');
    else if ((p.st === 'stun' || p.st === 'stumble' || p.st === 'pass' || p.st === 'kick' || p.st === 'lunge' || p.st === 'step' || p.st === 'spin') && p.stT >= p.stDur) this.setSt(p, 'free');
    else if (p.st === 'launch') this.launchStep(p, dt);
    else if (p.st === 'dive' || p.st === 'tdive') { if (p.stT >= p.stDur) { p.z = 0; this.setSt(p, 'down', .5); } }
    if (p.st !== 'launch') this.brake(p, dt);
  },
  /* ---- the ruck ---- */
  startRuck(c) {
    if (this.hooter && !this.sudden) { this.ball.st = 'dead'; return this.whistle('hooterTackle', null, .8); }
    const d = this.dir[c.team], b = this.ball;
    b.st = 'placed'; b.holder = -1; b.x = c.x - d * 7; b.y = c.y; b.z = 0; b.team = c.team;
    const att = c.team, def = 1 - att, mark = { x: b.x, y: b.y };
    const near = (t, n) => this.players.filter(p => p.team === t && this.standing(p) && FREE[p.st] && p.ctl < 0 && p.id !== c.id && dist(p, mark) < 80 && !(t === att && p.slot === 3)).sort((a, q) => dist(a, mark) - dist(q, mark)).slice(0, n);
    const cA = near(att, 2), cD = near(def, this.rng() < .5 ? 1 : 2);
    this.setp = { kind: 'ruck', x: mark.x, y: mark.y, att, bar: .35 + .1 * (cA.length - cD.length), t: 0, comm: [[], []], go: [cA.map(p => p.id), cD.map(p => p.id)], tackled: c.id, tackler: c.tackler, jackal: -1, first: -1, sub: 'contest' };
    this.ruckCount++; this.stats[att].rucks++;
    this.goPhase('ruck');
    this.emit('ruck', { x: mark.x, y: mark.y, att });
  },
  ph_ruck(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    this.clockStep(dt);
    S.t += dt;
    const att = S.att, def = 1 - att, d = this.dir[att], mark = S;
    // a human defender near the ball may jackal (SQUARE), in the ruck or about to join it
    for (const s of this.humanSeats(def)) { const p = this.players[s.pid]; if (p && s.I.pr.sq && (p.st === 'ruck' || FREE[p.st]) && dist(p, mark) < 30) this.jackal(p); }
    // those going in run to their places in the ruck; each human who runs his man into the ruck zone joins it
    const spotOf = (p, k) => { const side = p.team === att ? -1 : 1, n = S.comm[p.team === att ? 0 : 1].indexOf(p.id); return [mark.x + d * side * (9 + Math.floor(Math.max(0, n) / 2) * 7), mark.y + ((Math.max(0, n) % 2) ? 6 : -6)]; };
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const k = p.team === att ? 0 : 1;
      if (p.st === 'ruck') { const [sx, sy] = spotOf(p); p.x = lerp(p.x, sx, Math.min(1, dt * 8)); p.y = lerp(p.y, sy, Math.min(1, dt * 8)); p.f = p.team === att ? (d > 0 ? 0 : PI) : (d > 0 ? PI : 0); continue; }
      if (p.id === S.tackled) { p.stT += dt; this.brake(p, dt); continue; }
      if (S.go[k].includes(p.id) && this.standing(p) && FREE[p.st]) {
        if (this.walkTo(p, mark.x - d * (p.team === att ? 10 : -10), mark.y, dt, 1.2) || dist(p, mark) < 12) { S.comm[k].push(p.id); S.go[k] = S.go[k].filter(i => i !== p.id); this.setSt(p, 'ruck'); this.emit('ruckJoin', { id: p.id }); if (k === 1 && S.first < 0) S.first = p.id; }
        continue;
      }
      if (p.ctl >= 0 && FREE[p.st] && dist(p, mark) < 16 && S.t > .1) { S.comm[k].push(p.id); this.setSt(p, 'ruck'); this.emit('ruckJoin', { id: p.id }); if (k === 1 && S.first < 0) S.first = p.id; if (k === 1 && S.t < .35 && S.first === p.id) S.jackalOk = true; continue; }
      if (FREE[p.st]) this.movePlayer(p, p.I, dt);
      else this.stepPlayers1(p, dt);
    }
    this.separate();
    // the contest: commitment and POW push the bar; humans mash X (each press counts), the CPU mashes by its rate
    const pow = k => S.comm[k].reduce((a, id) => a + Math.min(12, this.players[id].pow), 0);
    S.bar += dt * .02 * (pow(0) - pow(1));
    for (const k of [0, 1]) {
      const t = k === 0 ? att : def, side = k === 0 ? 1 : -1, hs = this.humanSeats(t).filter(s => { const p = this.players[s.pid]; return p && (p.st === 'ruck' || p.id === S.tackled); });
      if (hs.length) { for (const s of hs) if (s.I.pr.x) { S.bar += side * TUNE.v.mashWeight; this.emit('mash', { team: t }); } }
      else if (S.comm[k].length || k === 0) { const rate = Math.max(0, TUNE.v.cpuMash + this.diffs[t].mash) * (.8 + this.rng() * .4); S.bar += side * rate * TUNE.v.mashWeight * dt; }
    }
    // the jackal: the first defender to the ball, quick enough, presses SQUARE (the CPU decides)
    const fp = this.players[S.first];
    if (fp && S.jackal < 0 && fp.ctl < 0 && S.t < .5 && fp.st === 'ruck' && this.rng() < .5 * dt * 10 * this.teams[fp.team].style.aggr) this.jackal(fp);
    S.bar = clamp(S.bar, -1.2, 1.2);
    if (S.t >= TUNE.v.ruckTime) this.ruckEnd();
  },
  jackal(p) {
    const S = this.setp; if (!S || S.kind !== 'ruck' || p.team === S.att) return;
    if (S.jackal >= 0) return;
    if ((S.first === p.id || dist(p, S) < 20) && S.t < .5 && (S.first < 0 || S.first === p.id)) {
      S.jackal = p.id; S.bar -= .5; if (p.st !== 'ruck') { S.comm[1].push(p.id); this.setSt(p, 'ruck'); }
      p.a.act = 'jackal'; this.emit('jackal', { id: p.id });
    } else { this.emit('handsInRuck', { id: p.id }); this.foul(p, 'hands'); }
  },
  /** the ruck's result: the attack's scrum-half takes it at the base, or the defence turns it over */
  ruckEnd(force) {
    const S = this.setp; if (!S) return;
    const att = S.att, win = S.bar >= 0 ? att : 1 - att;
    for (const p of this.players) if (p.st === 'ruck' || (p.id === S.tackled && p.st === 'down')) { p.pin = false; this.setSt(p, 'up', .35); }
    const tk = this.players[S.tackled]; if (tk) tk.pin = false;
    let rcv;
    if (win === att) {
      rcv = this.players.find(p => p.team === att && p.slot === 3 && this.standing(p) && FREE[p.st]) || this.players.filter(p => p.team === att && this.standing(p) && FREE[p.st]).sort((a, b) => dist(a, S) - dist(b, S))[0];
    } else {
      rcv = this.players[S.jackal] || this.players.filter(p => p.team === win && this.onPitch(p) && p.st !== 'down').sort((a, b) => dist(a, S) - dist(b, S))[0];
      this.stats[win].turnovers++; if (rcv) rcv.turnovers++; this.hypeAdd(win, 8);
      this.emit('turnover', { id: rcv ? rcv.id : -1, how: S.jackal >= 0 ? 'jackal' : 'ruck' });
    }
    this.setp = null; this.goPhase('play');
    if (!rcv) { this.ball.st = 'loose'; return; }
    const d = this.dir[win];
    const bx = S.x - d * 12, by = S.y;
    if (dist2(rcv.x, rcv.y, bx, by) > 40) { rcv.x = bx - d * 6; rcv.y = by + 8; }
    else { rcv.x = lerp(rcv.x, bx, .5); rcv.y = lerp(rcv.y, by, .5); }
    this.setSt(rcv, 'free'); rcv.f = d > 0 ? 0 : PI;
    this.give(rcv, 'ruck');
    this.emit('ruckWon', { team: win, id: rcv.id });
    if (win === att) { this.useIt = 3; this.useItId = rcv.id; this.useItX = rcv.x; this.useItY = rcv.y; }
    this.offsideCheck(S, win);
  },
  /** defenders ahead of their offside line closing on the ball as it comes out: offside, if seen */
  offsideCheck(S, win) {
    const def = 1 - win, d = this.dir[win];
    for (const p of this.players) {
      if (p.team !== def || !this.standing(p) || p.st === 'up') continue;
      const ahead = (p.x - S.x) * d < 10 && dist(p, S) < 30 && dist(p, S) > 12;
      if (ahead && p.ctl >= 0) { this.foul(p, 'offside'); return; }
    }
  },
  /* ---- the scrum ---- */
  scrumSetup(team, x, y, tag) {
    x = clamp(x, G.X0 + G.L5, G.X1 - G.L5); y = clamp(y, G.Y0 + G.L5, G.Y1 - G.L5);
    this.ball.st = 'dead'; this.ball.holder = -1;
    this.setp = { kind: 'scrum', team, x, y, sub: 'setup', t: 0, bar: .15, timing: [0, 0], tq: ['', ''], early: -1, setT: 0, last: ['', ''], cpuEarly: [this.rng() < this.diffs[0].early, this.rng() < this.diffs[1].early], cpuT: [this.rng.gauss() * this.diffs[0].sigma, this.rng.gauss() * this.diffs[1].sigma], tag, shift: 0 };
    this.stats[team].scrums++;
    this.goPhase('scrum', 'setup');
    for (const p of this.players) if (this.onPitch(p) && p.st !== 'off') { p.pin = false; if (p.st !== 'down' && p.st !== 'launch') this.setSt(p, 'free'); }
    this.emit('scrum', { team, x, y });
    this.refCall('scrum');
  },
  /** where each player stands for the scrum */
  scrumSpots() {
    const S = this.setp, spots = {};
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const d = this.dir[p.team], back = -d, sh = S.shift || 0;
      if (p.slot <= 2) { const lat = [-12, 0, 12][p.slot] * (p.team ? -1 : 1); spots[p.id] = [S.x + back * (p.slot === 1 ? 9 : 11) + sh, S.y + lat]; }
      else if (p.slot === 3) spots[p.id] = p.team === S.team ? [S.x + back * 3, S.y + 22] : [S.x + back * 24, S.y - 18];
      else { const k = p.slot - 4, lat = [-60, 70, 150][k] * (S.y > G.CY ? -1 : 1); spots[p.id] = [S.x + back * (G.L5 + 22 + k * 10), clamp(S.y + lat, G.Y0 + 16, G.Y1 - 16)]; }
    }
    return spots;
  },
  ph_scrum(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    S.t += dt;
    const spots = this.scrumSpots();
    const A = S.team, B = 1 - A;
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const s = spots[p.id];
      if (p.slot <= 2 && S.sub !== 'setup') { p.x = lerp(p.x, s[0], Math.min(1, dt * 10)); p.y = lerp(p.y, s[1], Math.min(1, dt * 10)); p.f = this.dir[p.team] > 0 ? 0 : PI; if (p.st !== 'set') this.setSt(p, 'set'); continue; }
      if (p.st === 'free') { this.walkTo(p, s[0], s[1], dt, 1.3); if (dist2(p.x, p.y, s[0], s[1]) < 3) p.f = this.dir[p.team] > 0 ? 0 : PI; } else this.stepPlayers1(p, dt);
    }
    this.ball.x = S.x + (S.sub === 'push' || S.sub === 'set' ? 0 : -this.dir[A] * 2); this.ball.y = S.y + 14; this.ball.z = 8;
    const H = [this.humanI(0), this.humanI(1)];
    if (S.sub === 'setup') {
      if (S.t > 1.5) { for (const p of this.players) if (spots[p.id] && this.onPitch(p) && p.st !== 'off') { p.x = spots[p.id][0]; p.y = spots[p.id][1]; if (p.slot <= 2) this.setSt(p, 'set'); } S.sub = 'crouch'; S.t = 0; this.refCall('crouch'); this.emit('scrumCall', { call: 'crouch' }); }
      return;
    }
    if (S.sub === 'crouch' || S.sub === 'bind') {
      // pressing before the ring nearly closes is an early engagement: a free kick to the other side
      for (const t of [0, 1]) if (H[t] && H[t].pr.x && (S.sub === 'crouch' || S.t < .6 - .25)) return this.scrumEarly(t);
      for (const t of [0, 1]) if (!H[t] && S.cpuEarly[t] && S.sub === 'bind' && S.t > .2) return this.scrumEarly(t);
      if (S.sub === 'bind') for (const t of [0, 1]) if (H[t] && H[t].pr.x && !S.tq[t]) this.scrumTime(t, S.t - .6);
      if (S.t >= .6) { if (S.sub === 'crouch') { S.sub = 'bind'; S.t = 0; this.refCall('bind'); this.emit('scrumCall', { call: 'bind' }); } else { S.sub = 'set'; S.t = 0; S.setT = this.t; this.refCall('set'); this.emit('scrumCall', { call: 'set' }); this.emit('scrumEngage', {}); } }
      return;
    }
    if (S.sub === 'set') {
      for (const t of [0, 1]) {
        if (H[t] && H[t].pr.x && !S.tq[t]) this.scrumTime(t, S.t);
        if (!H[t] && !S.tq[t] && S.t >= Math.max(0, S.cpuT[t])) this.scrumTime(t, S.cpuT[t]);
      }
      if (S.t > .3) { for (const t of [0, 1]) if (!S.tq[t]) S.tq[t] = 'LATE'; S.sub = 'push'; S.t = 0; }
      return;
    }
    if (S.sub === 'push') {
      const pow = t => this.players.filter(p => p.team === t && p.slot <= 2 && this.onPitch(p)).reduce((a, p) => a + Math.min(12, p.pow), 0);
      S.bar += dt * .01 * (pow(A) - pow(B)) * .5;
      for (const t of [0, 1]) {
        const side = t === A ? 1 : -1, hs = this.humanSeats(t);
        if (hs.length) for (const s of hs) for (const k of ['l1', 'r1']) if (s.I.pr[k]) { const alt = S.last[t] !== k; S.bar += side * TUNE.v.scrumPushWeight * (alt ? 1 : .5); S.last[t] = k; this.emit('push', { team: t }); }
        if (!hs.length) { const rate = Math.max(0, TUNE.v.cpuMash + this.diffs[t].mash) * (.8 + this.rng() * .4); S.bar += side * rate * TUNE.v.scrumPushWeight * dt * .9; }
      }
      S.bar = clamp(S.bar, -1, 1);
      S.shift = S.bar * 12 * this.dir[A];
      if (S.t >= 2.0 || Math.abs(S.bar) >= 1) this.scrumResult();
    }
  },
  scrumTime(t, off) {
    const S = this.setp, a = Math.abs(off), side = t === S.team ? 1 : -1;
    if (a <= .12) { S.tq[t] = 'PERFECT'; S.bar += side * .25; }
    else if (a <= .25) { S.tq[t] = 'GOOD'; S.bar += side * .1; }
    else S.tq[t] = 'LATE';
    this.emit('scrumTiming', { team: t, q: S.tq[t] });
  },
  scrumEarly(t) {
    const S = this.setp;
    this.emit('earlyEngage', { team: t }); this.refCall('early');
    for (const p of this.players) if (p.st === 'set') this.setSt(p, 'up', .3);
    this.setp = null;
    this.whistle('early', () => this.penaltyAward(1 - t, S.x, S.y, 'early', true), .8);
  },
  scrumResult() {
    const S = this.setp, A = S.team, win = S.bar >= 0 ? A : 1 - A, lose = 1 - win;
    for (const p of this.players) if (p.st === 'set') this.setSt(p, 'free');
    this.hypeAdd(win, 6);
    this.emit('scrumWon', { team: win, steal: win !== A });
    if (Math.abs(S.bar) >= .85) {
      const toLine = Math.abs(this.oppLine(win) - S.x);
      for (const p of this.players) if (p.team === lose && p.slot <= 2) this.setSt(p, 'down', 1);
      this.emit('collapse', { team: lose });
      if (toLine < 50 + G.L5) {
        const sh = this.players.find(p => p.team === win && p.slot === 1 && this.onPitch(p)) || this.players.find(p => p.team === win && this.onPitch(p));
        this.setp = null; this.goPhase('play'); this.give(sh, 'scrum');
        sh.x = this.oppLine(win) + this.dir[win] * 6; sh.y = S.y;
        this.emit('pushover', { team: win });
        return this.tryScored(sh, sh.x, S.y, 'pushover');
      }
      this.setp = null;
      return this.whistle('collapse', () => this.penaltyAward(win, S.x, S.y, 'collapse'), .9);
    }
    const sh = this.players.find(p => p.team === win && p.slot === 3 && this.standing(p)) || this.players.filter(p => p.team === win && this.standing(p) && p.slot > 2)[0] || this.players.find(p => p.team === win && this.standing(p));
    this.setp = null; this.goPhase('play');
    if (!sh) { this.ball.st = 'loose'; return; }
    const d = this.dir[win];
    sh.x = S.x - d * 22; sh.y = S.y + 10; this.setSt(sh, 'free'); sh.f = d > 0 ? 0 : PI;
    this.give(sh, 'scrum');
    if (win !== A) { this.stats[win].turnovers++; this.emit('turnover', { id: sh.id, how: 'scrum' }); }
  },
  /* ---- the lineout ---- */
  lineoutSetup(team, x, ty) {
    this.ball.st = 'dead'; this.ball.holder = -1;
    const s = ty <= G.Y0 + 1 ? 1 : -1;
    const w = [.4, .35, .25]; let cpuCall = 0; { const r = this.rng(); cpuCall = r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2; }
    if (this.lastCalls && this.lastCalls.length >= 2 && this.lastCalls.every(c => c === cpuCall)) cpuCall = (cpuCall + 1) % 3;
    this.setp = { kind: 'lineout', team, x, ty, s, sub: 'call', t: 0, calls: [1, 1], picked: [false, false], cpuCall, needle: 0, q: 0, qT: '', pressT: -1, arriveT: 0, timing: 0, result: '' };
    this.stats[team].lineouts++;
    this.goPhase('lineout', 'call');
    for (const p of this.players) if (this.onPitch(p) && p.st !== 'down' && p.st !== 'launch') this.setSt(p, 'free');
    this.emit('lineout', { team, x, ty });
  },
  podY(S, k) { return S.ty + S.s * (G.L5 + 16 * k); },
  lineoutSpots() {
    const S = this.setp, spots = {};
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const d = this.dir[p.team], own = p.team === S.team, call = S.calls[p.team];
      if (p.slot === 1 && own) spots[p.id] = [S.x, S.ty - S.s * 6];
      else if (p.slot <= 2) { const k = own ? (p.slot === 0 ? 0 : 1) : (p.slot === 0 ? 0 : p.slot === 1 ? 1 : 2); const jumper = own ? p.slot === 0 : p.slot === 1; const py = this.podY(S, call) + (jumper ? 0 : S.s * 9) + (own ? 0 : 0); spots[p.id] = [S.x - d * 9, k === 2 && !own ? this.podY(S, (call + 1) % 3) : py]; }
      else if (p.slot === 3) spots[p.id] = [S.x - d * 22, this.podY(S, 2) + S.s * 26];
      else { const k = p.slot - 4; spots[p.id] = [S.x - d * (G.L5 + 30 + k * 8), clamp(this.podY(S, 2) + S.s * (60 + k * 80), G.Y0 + 16, G.Y1 - 16)]; }
    }
    return spots;
  },
  ph_lineout(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    S.t += dt;
    const A = S.team, B = 1 - A, H = [this.humanI(0), this.humanI(1)];
    // the calls: up / down, L1 / R1 or a click on a pod (the CPU by weights; a CPU defence reads it by its difficulty)
    for (const t of [0, 1]) {
      const I = H[t];
      if (I && S.sub !== 'flight' && S.sub !== 'done') {
        let c = S.calls[t];
        if (I.pr.l1 || I.pr.up) c = Math.max(0, c - 1);
        if (I.pr.r1 || I.pr.down) c = Math.min(2, c + 1);
        if (I.podClick !== undefined && I.podClick !== null && I.podClick >= 0) c = I.podClick;
        if (c !== S.calls[t]) { S.calls[t] = c; S.picked[t] = true; this.emit('podPick', { team: t, pod: c }); }
      }
    }
    if (!H[A] && S.t > .4) S.calls[A] = S.cpuCall;
    if (!H[B] && S.t > .9 && !S.defRead) { S.defRead = true; S.calls[B] = this.rng() < this.diffs[B].read ? (H[A] ? S.calls[A] : S.cpuCall) : (S.cpuCall + 1 + Math.floor(this.rng() * 2)) % 3; }
    const spots = this.lineoutSpots();
    for (const p of this.players) {
      if (!this.onPitch(p) || p.st === 'set') continue;
      const s = spots[p.id]; if (!s) continue;
      if (p.st === 'free') { this.walkTo(p, s[0], s[1], dt, 1.4); if (dist2(p.x, p.y, s[0], s[1]) < 3) p.f = p.slot === 1 && p.team === A ? (S.s > 0 ? PI / 2 : -PI / 2) : (S.s > 0 ? -PI / 2 : PI / 2) + (p.slot > 2 ? 0 : 0); }
      else this.stepPlayers1(p, dt);
    }
    const thrower = this.players.find(p => p.team === A && p.slot === 1 && this.onPitch(p)) || this.players.find(p => p.team === A && this.standing(p));
    this.ball.x = thrower.x; this.ball.y = thrower.y - S.s * 2; this.ball.z = 22;
    if (S.sub === 'call') {
      const ready = H[A] ? (H[A].pr.x || S.t > 6) : S.t > 1.6;
      if (ready && S.t > .5) { S.sub = 'throw'; S.t = 0; for (const p of this.players) if (spots[p.id]) { p.x = spots[p.id][0]; p.y = spots[p.id][1]; } }
      return;
    }
    if (S.sub === 'throw') {
      S.needle = 1 - Math.abs(((S.t * 1.25) % 2) - 1);
      let go = false;
      if (H[A]) { if (H[A].pr.x && S.t > .1) go = true; else if (S.t > 5) go = true; }
      else if (S.t > .6 + this.rng() * .02) { S.needle = clamp(.5 + this.rng.gauss() * this.diffs[A].sigma * 1.2, 0, 1); go = true; }
      if (go) {
        const off = Math.abs(S.needle - .5);
        S.q = off < .15 ? 1 : off < .35 ? .6 : 0; S.qT = off < .15 ? 'GOOD THROW' : off < .35 ? 'WOBBLY' : 'NOT STRAIGHT';
        if (S.q === 0) { this.emit('notStraight', { team: A }); this.refCall('notStraight'); this.setp = null; return this.whistle('notStraight', () => this.scrumSetup(B, S.x + this.dir[A] * 0, S.ty + S.s * (G.L15)), .9); }
        S.sub = 'flight'; S.t = 0; S.arriveT = this.t + .65;
        thrower.a.act = 'throwIn'; thrower.a.u = 0;
        this.emit('lineoutThrow', { team: A, q: S.qT, pod: S.calls[A] });
        S.cpuPress = this.rng.gauss() * this.diffs[B].sigma;
        for (const p of this.players) if (p.team !== undefined && p.slot <= 2 && p.st === 'free' && this.onPitch(p)) { const jumper = (p.team === A && p.slot === 0) || (p.team === B && p.slot === 1); if (jumper) { this.setSt(p, 'set'); p.a.act = 'lift'; } }
      }
      return;
    }
    if (S.sub === 'flight') {
      const u = clamp(S.t / .65, 0, 1), py = this.podY(S, S.calls[A]);
      this.ball.x = thrower.x - this.dir[A] * 6 * u; this.ball.y = lerp(thrower.y, py, u); this.ball.z = 22 + Math.sin(u * PI) * 36 + u * 36;
      for (const p of this.players) if (p.st === 'set' && p.a.act === 'lift') p.z = Math.min(56, p.z + dt * 140);
      if (H[B] && H[B].pr.x && S.pressT < 0) S.pressT = this.t;
      if (S.t >= .65) this.lineoutResult();
    }
  },
  lineoutResult() {
    const S = this.setp, A = S.team, B = 1 - A;
    const jA = this.players.find(p => p.team === A && p.slot === 0 && this.onPitch(p)), jB = this.players.find(p => p.team === B && p.slot === 1 && this.onPitch(p));
    let win = A;
    if (S.calls[B] === S.calls[A] && jB) {
      const timing = S.pressT >= 0 ? clamp(1 - Math.abs(S.pressT - S.arriveT) / .3, 0, 1) : (this.humanI(B) ? 0 : clamp(1 - Math.abs(S.cpuPress) / .3, 0, 1));
      const att = .6 * S.q + .04 * (jA ? jA.hnd : 5) + .15, def = .6 * timing + .04 * jB.hnd;
      if (def > att) win = B;
    }
    const jumper = win === A ? jA : jB;
    for (const p of this.players) if (p.st === 'set') { p.z = 0; this.setSt(p, 'free'); }
    this.hypeAdd(win, win === A ? 2 : 8);
    this.emit('lineoutWon', { team: win, steal: win !== A, id: jumper ? jumper.id : -1 });
    if (jumper) { jumper.a.act = 'highCatch'; jumper.a.u = 0; }
    const sh = this.players.find(p => p.team === win && p.slot === 3 && this.standing(p)) || this.players.find(p => p.team === win && this.standing(p));
    this.lastCalls = (this.lastCalls || []).concat(S.cpuCall).slice(-2);
    this.setp = null; this.goPhase('play');
    if (!sh) return;
    const d = this.dir[win];
    sh.x = S.x - d * 18; sh.y = this.podY(S, S.calls[A]) + S.s * 10; this.setSt(sh, 'free'); sh.f = d > 0 ? 0 : PI;
    this.give(sh, 'lineout');
    if (win !== A) { this.stats[win].turnovers++; this.emit('turnover', { id: sh.id, how: 'lineout' }); }
  },
  /* ---- set kicks: conversions and penalty goals, in the behind-the-kicker camera ---- */
  setKickSetup(team, x, y, purpose) {
    const d = this.dir[team], line = this.oppLine(team);
    const kicker = this.players.filter(p => p.team === team && this.onPitch(p)).sort((a, b) => (b.slot === 4) - (a.slot === 4) || b.kck - a.kck)[0];
    const gy = clamp(y, G.Y0 + 8, G.Y1 - 8);
    if (kicker) this.seatToKicker(team, kicker.id);
    let dd = purpose === 'conv' ? G.L5 : Math.abs(line - x);
    if (purpose === 'conv' && (!kicker || kicker.ctl < 0)) dd = clamp(Math.abs(gy - G.CY) * .8 + G.L5, G.L5, 200);
    this.setp = { kind: 'setkick', team, purpose, kicker: kicker ? kicker.id : -1, gy, gx: x, d: dd, sub: purpose === 'conv' ? 'place' : 'aim', t: 0, aim: 0, power: 0, charging: false, clockT: 20, sway: 0, swayP: this.rng() * 6, result: '', resT: 0 };
    this.ball.st = 'dead'; this.ball.holder = -1;
    this.goPhase('setkick', this.setp.sub);
    for (const p of this.players) if (this.onPitch(p) && p.st !== 'launch') { p.pin = false; this.setSt(p, 'free'); }
    if (purpose === 'conv') this.stats[team].convAtt++;
    this.emit('setKick', { team, purpose });
  },
  teePos() { const S = this.setp, d = this.dir[S.team], line = this.oppLine(S.team); return S.purpose === 'conv' ? { x: line - d * S.d, y: S.gy } : { x: S.gx, y: S.gy }; },
  /** the meter's mark for the distance: the power the kick needs to clear the bar (0..1) */
  setKickNeed() {
    const S = this.setp, k = this.players[S.kicker], tee = this.teePos(), line = this.oppLine(S.team);
    const D = Math.hypot(line - tee.x, G.CY - tee.y);
    for (let p = .2; p <= 1.001; p += .02) if (this.setKickHeight(p, D, k) > G.BAR + 4) return p;
    return 1.05;
  },
  setKickVel(power, k) { return lerp(200, 520, power) * (.85 + .015 * Math.min(10, k ? k.kck : 6)) * (this.megaBoot && this.megaBoot[this.setp.team] > 0 ? 1.3 : 1); },
  setKickHeight(power, D, k) {
    const v = this.setKickVel(power, k), el = 38 * PI / 180, vh = v * Math.cos(el), vz = v * Math.sin(el);
    const t = -Math.log(1 - Math.min(.999, D * .3 / vh)) / .3;
    return vz * t - 300 * t * t;
  },
  ph_setkick(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    S.t += dt;
    const k = this.players[S.kicker], d = this.dir[S.team], tee = this.teePos();
    const I = k && k.ctl >= 0 ? this.seats[k.ctl].I : null;
    const line = this.oppLine(S.team);
    // everyone else: the kicking team behind the kicker, the defenders behind their posts
    for (const p of this.players) {
      if (!this.onPitch(p) || p === k) continue;
      if (p.st !== 'free') { this.stepPlayers1(p, dt); continue; }
      const tx = p.team === S.team ? tee.x - d * (40 + p.slot * 6) : line + d * (24 + (p.slot % 3) * 10), ty = p.team === S.team ? G.CY + (p.slot - 3) * 30 : G.CY + (p.slot - 3) * 26;
      this.walkTo(p, tx, ty, dt, .9);
    }
    if (k) { k.x = tee.x - d * (S.sub === 'flight' || S.sub === 'result' ? -2 : 10); k.y = tee.y + (S.sub === 'flight' || S.sub === 'result' ? 0 : 6); k.f = Math.atan2(G.CY - tee.y, line - tee.x); k.vx = k.vy = 0; }
    if (S.sub !== 'flight' && S.sub !== 'result') { this.ball.x = tee.x; this.ball.y = tee.y; this.ball.z = 3; }
    if (S.sub !== 'flight' && S.sub !== 'result') { S.clockT -= dt; if (S.clockT <= 0) { S.power = Math.max(S.power, .7); return this.setKickGo(); } }
    const kck = k ? Math.min(10, k.kck) : 6;
    S.swayP += dt * (1.3 + (10 - kck) * .08); S.sway = Math.sin(S.swayP) * (3 + (10 - kck) * 1.6) * (I ? this.diffs[S.team].kick : 0);
    if (S.sub === 'place') {
      if (I) {
        const mv = I.placeMove || 0;   // the intent layer turns the stick for the view: + moves the tee back
        S.d = clamp(S.d + mv * 160 * dt, G.L5, 400);
        if (I.pr.x || I.pr.ci || S.t > 12) { S.sub = 'aim'; S.t = 0; this.sub = 'aim'; }
      } else if (S.t > 1.2) { S.sub = 'aim'; S.t = 0; this.sub = 'aim'; }
      return;
    }
    if (S.sub === 'aim' || S.sub === 'power') {
      if (I) {
        if (I.aimY !== undefined && I.aimY !== null) S.aim = clamp(I.aimY - G.CY, -90, 90);
        else S.aim = clamp(S.aim + (I.aimMove || 0) * 70 * dt, -90, 90);
        if (I.hd.ci || I.mhold) { if (!S.charging) { S.charging = true; S.power = 0; S.sub = 'power'; this.sub = 'power'; } S.power = Math.min(1.05, S.power + dt / 1.1); }
        else if (S.charging) { S.charging = false; return this.setKickGo(); }
      } else {
        if (S.t > 1.0 && !S.charging) { S.charging = true; S.sub = 'power'; this.sub = 'power'; const need = this.setKickNeed(); S.cpuPower = clamp(Math.max(need + .05, .86) + this.rng.gauss() * .05 * this.diffs[S.team].kick, .3, 1.05); S.aim = 0; S.cpuErr = this.rng.gauss() * (12 - kck) * PI / 180 * .35 * this.diffs[S.team].kick; }
        if (S.charging) { S.power = Math.min(1.05, S.power + dt / 1.1); if (S.power >= S.cpuPower) { S.charging = false; return this.setKickGo(); } }
      }
      return;
    }
    if (S.sub === 'flight') {
      this.stepBall(dt);
      if (this.pendingKick && !S.result) { S.result = this.pendingKick; S.resT = 0; }
      if (S.result) { S.resT += dt; if (S.resT > 1.1) return this.setKickResult(S.result === 'good', S.result); }
      else if (S.t > 3.2 || (this.ball.st === 'loose' && S.t > .8)) return this.setKickResult(false, 'miss');
      return;
    }
  },
  /** the kick leaves the tee: toward the reticle, with the wind; a hook unless the meter stopped in the band */
  setKickGo() {
    const S = this.setp, k = this.players[S.kicker], tee = this.teePos(), line = this.oppLine(S.team), d = this.dir[S.team];
    const kck = k ? Math.min(10, k.kck) : 6, mega = this.megaBoot && this.megaBoot[S.team] > 0;
    const band = S.power >= .82 && S.power <= .95 || (mega && S.power >= .7 && S.power <= 1);
    let a = Math.atan2(G.CY + S.aim + S.sway - tee.y, line - tee.x);
    if (!band) a += (this.rng() * 2 - 1) * (12 - kck) * PI / 180 * (k && k.ctl >= 0 ? 1 : .4);
    if (S.cpuErr) a += S.cpuErr;
    const v = this.setKickVel(Math.min(1, S.power), k) * (S.power > 1 ? .97 : 1), el = 38 * PI / 180;
    this.ball.st = 'air'; this.ball.holder = -1; this.ball.x = tee.x; this.ball.y = tee.y; this.ball.z = 3;
    this.ball.vx = Math.cos(a) * v * Math.cos(el); this.ball.vy = Math.sin(a) * v * Math.cos(el); this.ball.vz = v * Math.sin(el);
    this.ball.kind = 'setkick'; this.ball.aimTeam = S.team; this.ball.from = S.kicker; this.ball.team = S.team; this.ball.t = 0; this.ball.tried = {};
    if (mega) this.megaBoot[S.team] = 0;
    this.pendingKick = null; S.sub = 'flight'; S.t = 0; this.sub = 'flight'; S.band = band;
    if (k) { k.a.act = 'placeKick'; k.a.u = 0; this.setSt(k, 'kick', .5); }
    this.emit('setKickGo', { team: S.team, band, power: S.power });
  },
  setKickResult(good, how) {
    const S = this.setp; if (!S) return;
    const team = S.team;
    this.setp = null; this.pendingKick = null;
    if (good) {
      const pts = S.purpose === 'conv' ? 2 : 3;
      this.addScore(team, pts, S.purpose);
      if (S.purpose === 'conv') { this.stats[team].convs++; this.hypeAdd(team, 5); }
      this.emit(S.purpose === 'conv' ? 'convMade' : 'penGoal', { team });
    } else this.emit(how === 'doink' ? 'doinkMiss' : 'convMissed', { team, purpose: S.purpose });
    this.ball.st = 'dead';
    if (S.purpose === 'conv') { const scorer = team; this.whistle('conv', () => this.afterScore(scorer), .5); }
    else if (good) this.whistle('pen', () => this.afterScore(team), .5);
    else this.whistle('penMiss', () => this.dropoutSetup(1 - team), .5);
  },
  /* ---- the penalty: the captain's choice on three big cards ---- */
  penaltyAward(team, x, y, kind, free) {
    if (this.hooter && !this.sudden && !free) { this.ball.st = 'dead'; return this.whistle('pen', null, .8); }
    x = clamp(x, G.X0 + G.L5, G.X1 - G.L5); y = clamp(y, G.Y0 + 20, G.Y1 - 20);
    this.ball.st = 'dead'; this.ball.holder = -1; this.adv = null;
    const line = this.oppLine(team), canGoal = !free && Math.hypot(line - x, G.CY - y) < 400;
    this.setp = { kind: 'penalty', team, x, y, sub: 'choose', sel: canGoal ? 1 : 0, opts: ['tap', canGoal ? 'goal' : null, 'touch'], free: !!free, foul: kind, t: 0 };
    this.goPhase('penalty');
    for (const p of this.players) if (this.onPitch(p) && (p.st === 'set' || p.st === 'ruck' || p.st === 'cele')) this.setSt(p, 'free');
    this.ref.signal = 'penalty'; this.ref.sigT = 2.5;
    this.emit(free ? 'freeKick' : 'penalty', { team, x, y, kind });
  },
  ph_penalty(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    S.t += dt;
    for (const p of this.players) if (this.onPitch(p)) { if (p.st === 'free') this.brake(p, dt); else this.stepPlayers1(p, dt); }
    this.ball.x = S.x; this.ball.y = S.y; this.ball.z = 0;
    const I = this.humanI(S.team), n = S.opts.length, ok = i => !!S.opts[i];
    if (I) {
      if (I.pr.left || I.pr.up || I.pr.l1) { let i = S.sel; do { i = (i + n - 1) % n; } while (!ok(i)); S.sel = i; this.emit('menuMove', {}); }
      if (I.pr.right || I.pr.down || I.pr.r1) { let i = S.sel; do { i = (i + 1) % n; } while (!ok(i)); S.sel = i; this.emit('menuMove', {}); }
      if (I.cardHover !== undefined && I.cardHover !== null && ok(I.cardHover)) S.sel = I.cardHover;
      if ((I.pr.x || I.cardClick) && S.t > .4) return this.penaltyChoose(S.sel);
      if (S.t > 15) return this.penaltyChoose(S.sel);
    } else if (S.t > 1.4) {
      // the CPU: a kick at goal within 300 when it is close or late; to touch from far; a tap near the line or trailing late
      const line = this.oppLine(S.team), dl = Math.hypot(line - S.x, G.CY - S.y), diff = this.score[S.team] - this.score[1 - S.team], late = this.half === 2 && this.clock > this.halfLen * .75;
      let c = 2;
      if (Math.abs(line - S.x) < 50) c = 0;
      else if (S.opts[1] && dl < 300 && (Math.abs(diff) <= 7 || late)) c = 1;
      else if (late && diff < -3) c = 0;
      this.penaltyChoose(c);
    }
  },
  penaltyChoose(i) {
    const S = this.setp; if (!S) return;
    const opt = S.opts[i] || 'tap', team = S.team, d = this.dir[team];
    this.emit('choice', { team, opt });
    if (opt === 'goal') return this.setKickSetup(team, S.x, S.y, 'pen');
    if (opt === 'tap') {
      // tap and go: the offenders are put back ten metres
      for (const p of this.players) if (p.team !== team && this.onPitch(p) && (p.x - S.x) * d < G.L10) p.x = S.x + d * G.L10 + (p.slot - 3) * 2 * d;
      this.emit('tapGo', { team });
      return this.restartPlay(team, S.x, S.y);
    }
    // kick for touch: the kicker punts at the nearer touchline; his team throws in at the lineout
    const k = this.players.filter(p => p.team === team && this.standing(p)).sort((a, b) => (b.slot === 4) - (a.slot === 4) || b.kck - a.kck)[0];
    this.setp = null; this.goPhase('play');
    k.x = S.x; k.y = S.y; this.setSt(k, 'free'); this.give(k, 'restart');
    const ty = S.y < G.CY ? G.Y0 - 70 : G.Y1 + 70, tx = clamp(S.x + d * (140 + Math.min(10, k.kck) * 14), G.X0 + 60, G.X1 - 60);
    this.kickForTouch = team;
    this.doKick(k, 'punt', tx, ty, .95, { exact: true, apex: 45 });
  }
});
