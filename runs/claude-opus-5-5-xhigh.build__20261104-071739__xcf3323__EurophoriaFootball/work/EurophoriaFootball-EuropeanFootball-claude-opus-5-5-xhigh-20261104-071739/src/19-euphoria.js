/* EUPHORIA (section 6.9): each side's crowd, 0-100, fed by good football; full, it unlocks EUROPHORIA: speed, free
 * sprinting, longer tackles, a longer-reaching keeper and one SUPER STRIKE, which a human keeper meets in the SAVE DUEL.
 * Also here: the parked bus (catenaccio), the Golden Moment (galacticos) and goal celebrations (section 6.21). */
const GAINS = { passDone: ev => 2 + Math.min(6, Math.max(0, (ev.chain || 1) - 1)), onTarget: ev => 5 + (ev.screamer ? 4 : 0), woodwork: () => 7 };
const _emit1 = Match.prototype.emit;
Match.prototype.emit = function (type, ev = {}) {
  const r = _emit1.call(this, type, ev);
  if (GAINS[type] && !this.pure) { const s = type === 'woodwork' ? (this.lastKick ? this.lastKick.side : null) : ev.side !== undefined ? ev.side : ev.who && ev.who.side; if (s !== null && s !== undefined) this.addEuphoria(s, GAINS[type](ev), type); }
  if (type === 'shot' && ev.who && !(this.ball.shot && this.ball.shot.super)) {   // on target? (the predicted crossing inside the frame)
    const c = this.ball.crossing(this.goalX(ev.who.side)); if (c && Math.abs(c.y - P.CY) < P.GH && c.z < P.BAR) { this.stats.onTarget[ev.who.side]++; this.emit('onTarget', { who: ev.who, side: ev.who.side, screamer: ev.screamer }); }
  }
  return r;
};
Object.assign(Match.prototype, {
  addEuphoria(s, v, why) {
    if (this.pure || s === null || s === undefined) return;
    if (this.europhoria && this.europhoria.side === s && v > 0) return;
    const was = this.euphoria[s], k = v > 0 ? EF.T.euphoriaGain * this.euFactor(s) : 1;
    this.euphoria[s] = clamp(was + v * k, 0, 100);
    const now = this.euphoria[s];
    if (v > 0) this.emit('euphoriaGain', { side: s, amount: now - was, why, level: now });
    for (const th of [34, 67]) if (was < th && now >= th) this.emit('euphoriaLevel', { side: s, level: th });
    if (was < 100 && now >= 100) { this.emit('euphoriaFull', { side: s }); }
  },
  euphoriaStep(dt) {
    const T = EF.T;
    for (const s of [0, 1]) {
      if (this.cheats['euphoria' + s] && !this.pure && !(this.europhoria && this.europhoria.side === s)) this.euphoria[s] = 100;
      if (!(this.europhoria && this.europhoria.side === s) && this.euphoria[s] > 0 && this.euphoria[s] < 100 && this.mode === 'play') this.euphoria[s] = Math.max(0, this.euphoria[s] - T.euphoriaDecay * dt);
    }
    const EU = this.europhoria;
    if (EU) {
      EU.t -= dt; this.euphoria[EU.side] = Math.max(0, 100 * EU.t / EU.dur);
      if (EU.t <= 0 && !this.superSeq && !(this.ball.superPath)) { this.europhoria = null; this.euphoria[EU.side] = 0; this.emit('europhoriaEnd', { side: EU.side }); }
    }
    if (this.superSeq) this.superSeqStep(dt);
    if (this.duel) this.duelStep(dt);
    this.gimmickStep(dt);
  },
  triggerEuphoria(s, who) {
    if (this.pure || this.europhoria || this.euphoria[s] < 100) return false;
    if (this.mode !== 'play' && this.mode !== 'setpiece' && this.mode !== 'kickoff') return false;
    const dur = EF.T.europhoriaTime; this.europhoria = { side: s, t: dur, dur, who }; this.superUsed = false;
    this.emit('europhoria', { side: s, who }); this.note('EUROPHORIA!', { sub: this.teams[s].name, dur: 1.8, color: '#ffc83a' });
    return true;
  },
  /* ---- the super strike: 0.6 s of charge-up in slow motion, then the strike along its path ---- */
  superStrike(f, it) {
    const gx = this.goalX(f.side), k = this.keeper(1 - f.side), def = EF.get('super', f.data.captain && f.data.super ? f.data.super : 'rocket') || EF.get('super', 'rocket');
    this.superUsed = true; this.stats.supers[f.side]++; f.charging = false; f.charge = 0;
    const ty = P.CY + (k && k.body.y > P.CY ? -1 : 1) * (P.GH - 10), tz = 8 + this.rng() * 14;
    this.superSeq = { who: f, def, t: 0, to: { x: gx, y: ty, z: tz } };
    f.setState('super', .6); f.body.vx = f.body.vy = 0; f.facing = Math.atan2(ty - f.body.y, gx - f.body.x);
    this.slow(.3, .6);
    this.emit('superCharge', { who: f, super: def.id, name: def.name });
    this.note(def.name, { dur: 1.6, color: def.color || '#ffc83a' });
  },
  superSeqStep(dt) {
    const S = this.superSeq, f = S.who; S.t += dt / Math.max(.05, game.timeScale);
    f.body.z = Math.min(6, S.t * 12); f.body.vz = 0;
    const b = this.ball; if (this.owner !== f) this.setOwner(f);
    if (S.t >= .6) {
      this.superSeq = null; f.body.z = 0; f.setState('kick', .2); f.playKick('shotHard');
      this.setOwner(null);
      b.startPath(S.def.path, { x: b.x, y: b.y, z: 4 }, S.to, Object.assign({ side: f.side, speed: EF.T.superSpeed }, S.def.params || {}));
      b.superDef = S.def; this.lastKick = f; this.touch(f); this.stats.shots[f.side]++;
      if (this.bus && this.bus.side !== f.side) this.bus.smash = true;
      this.emit('superStrike', { who: f, super: S.def.id, name: S.def.name, path: S.def.path, side: f.side });
      this.slow(.5, .3);
    }
  },
  /** the super reaches the keeper: the Save Duel (a human defends), else a CPU keeper's chance (section 6.9) */
  superAtKeeper(b) {
    const sp = b.superPath, s = sp.side, d = 1 - s, k = this.keeper(d);
    if (!k) return;
    const h = this.humans.find(q => q.side === d && !q.cpu && !q.remote) || this.humans.find(q => q.side === d && !q.cpu);
    if (this.cheats['keeper' + d]) return this.superSaved(b, k, 'catch');
    if ((h && this.kind !== 'attract') || (this.kind === 'attract' && this.attractDuel)) {
      sp.paused = true; b.superPathHold = sp; b.superPath = null; b.vx = b.vy = b.vz = 0; b.held = true; b.heldBy = null;
      this.duel = { t: 0, dur: 1, keeper: k, human: this.kind === 'attract' ? null : h, press: null, result: null, b, sp, deadline: 1.14, startAt: EF.inSession && window.AIHub && AIHub.time ? AIHub.time() : 0 };
      game.timeScale = .3; this.wantScale = .3; this.slowmo = { t: 2 };
      this.emit('saveDuel', { who: k, human: h ? h.id : null }); return;
    }
    const chance = this.kind === 'attract' ? (this.attractSave || 0) : this.hasHuman(s) ? this.diff.cpuSuper : .25;
    if (this.rng() < chance) this.superSaved(b, k, this.rng() < .5 ? 'catch' : 'parry');
    else { k.diveSign = Math.sign(Math.cos(k.facing) * (sp.to.y - k.body.y)) || 1; k.diveV = clamp((sp.to.y - k.body.y) * 3, -200, 200); k.diveHigh = sp.to.z > 16; k.setState('keeper-dive', .8); this.emit('superBeaten', { who: k }); }
  },
  duelPress(at) { const D = this.duel; if (D && D.press === null) D.press = at !== undefined ? at : D.t; },
  duelStep(dt) {
    const D = this.duel, real = dt / Math.max(.05, game.timeScale); D.t += real;
    if (D.result) { D.after += real; if (D.after > .7) { this.duel = null; this.wantScale = 1; this.slowmo = { t: .01 }; } return; }
    if (D.human && !D.human.remote && D.press === null && D.human.ctl.peek().pass) D.press = D.t;
    if (D.press !== null || D.t > D.deadline + .3) {
      const err = D.press === null ? 9 : Math.abs(D.press - D.dur);
      D.result = err <= .06 ? 'perfect' : err <= .14 ? 'good' : 'miss'; D.after = 0;
      this.emit('saveDuelResult', { who: D.keeper, result: D.result, err });
      this.note(D.result === 'perfect' ? 'PERFECT!' : D.result === 'good' ? 'GOOD!' : 'MISS!', { dur: 1.2, color: D.result === 'miss' ? '#ff5a4a' : '#7aff9a' });
      const b = D.b, sp = D.sp;
      if (D.result === 'perfect') { this.superSaved(b, D.keeper, 'catch'); this.addEuphoria(D.keeper.side, 15, 'duel'); }
      else if (D.result === 'good') this.superSaved(b, D.keeper, 'parry');
      else { b.held = false; b.superPath = sp; sp.paused = false; b.superPathHold = null; D.keeper.diveSign = 1; D.keeper.diveV = clamp((sp.to.y - D.keeper.body.y) * 3, -200, 200); D.keeper.diveHigh = true; D.keeper.setState('keeper-dive', .8); D.keeper.into = true; }
    }
  },
  superSaved(b, k, how) {
    b.superPath = null; b.superPathHold = null; b.decoys = null; b.shot = null; b.held = false; this.touch(k);
    const out = this.ownGoalX(k.side) === P.X0 ? 1 : -1;
    if (how === 'catch') { this.setOwner(k, 'catch'); k.holding = true; this.emit('save', { who: k, kind: 'super', shooter: this.lastKick }); }
    else { b.vx = out * 150; b.vy = (this.rng() - .5) * 220; b.vz = 90; this.emit('save', { who: k, kind: 'superParry', shooter: this.lastKick }); this.emit('parry', { who: k }); }
    this.stats.saves[k.side]++; this.emit('superSaved', { who: k, how });
    k.tilt = null; k.setState('run'); k.look.pose = 'cheer';
  },
  /* ---- tactics' gimmicks: catenaccio's bus and 3-1, the galacticos' Golden Moment (section 6.13) ---- */
  gimmickStep(dt) {
    if (this.pure || this.kind === 'training' || this.shootout) return;
    for (const s of [0, 1]) {
      const g = this.tactic[s].gimmick, lead = this.score[s] > this.score[1 - s];
      if (g === 'catenaccio' && lead && this.minute >= 60 && this.half < 3 && !this.bus && !this.busDone) {
        const gx = this.ownGoalX(s); this.bus = { side: s, x: gx + this.dir(s) * 12, y: P.CY, w: 60, d: 18, h: 30, t: 0, state: 'arrive', from: P.Y1 + 60 };
        this.emit('bus', { side: s }); this.note('THE BUS IS PARKED', { dur: 2, big: false });
        if (this.formation[s].id !== '3-1') this.setFormation(s, '3-1');
      }
      if (g === 'galacticos' && !this.goldenMoment && this.minute >= 80 && this.half === 2 && this.score[s] <= this.score[1 - s] && !this.europhoria) {
        this.goldenMoment = true; this.euphoria[s] = 100; this.triggerEuphoria(s, this.side[s].find(f => f.data.captain));
        this.emit('goldenMoment', { side: s }); this.note('THE GOLDEN MOMENT', { sub: this.teams[s].name, dur: 2 });
      }
    }
    const BU = this.bus; if (!BU) return;
    BU.t += dt;
    if (BU.state === 'arrive') { const u = Math.min(1, BU.t / 2.5); BU.y = lerp(BU.from, P.CY, ease.outCubic(u)); if (u >= 1) BU.state = 'parked'; }
    if (BU.smash && BU.state === 'parked' && (!this.ball.superPath || Math.abs(this.ball.x - BU.x) < 20)) { BU.state = 'leave'; BU.t = 0; this.addEuphoria(1 - BU.side, 10, 'bus'); this.emit('busSmashed', { side: BU.side }); }
    if (BU.state === 'leave') { BU.y = P.CY + ease.inQuad(Math.min(1, BU.t / 2)) * 420; if (BU.t > 2) { this.bus = null; this.busDone = true; return; } }
    // the bus is solid: the ball bounces off it, bodies stay out
    const b = this.ball, inX = Math.abs(b.x - BU.x) < BU.d / 2 + b.r, inY = Math.abs(b.y - BU.y) < BU.w / 2 + b.r;
    if (inX && inY && b.z < BU.h && !b.superPath && !this.owner) {
      const ox = BU.d / 2 + b.r - Math.abs(b.x - BU.x), oy = BU.w / 2 + b.r - Math.abs(b.y - BU.y);
      if (ox < oy) { b.x += Math.sign(b.x - BU.x) * ox; b.vx = -b.vx * .5; } else { b.y += Math.sign(b.y - BU.y) * oy; b.vy = -b.vy * .5; }
      if (BU.state === 'parked' && this.t - (BU.hitT || -9) > .4) { BU.hitT = this.t; this.emit('busHit', { x: b.x, y: b.y }); }
    }
    for (const f of this.players) { const B = f.body; if (Math.abs(B.x - BU.x) < BU.d / 2 + 5 && Math.abs(B.y - BU.y) < BU.w / 2 + 5) { const ox = BU.d / 2 + 5 - Math.abs(B.x - BU.x), oy = BU.w / 2 + 5 - Math.abs(B.y - BU.y); if (ox < oy) B.x += Math.sign(B.x - BU.x || 1) * ox; else B.y += Math.sign(B.y - BU.y || 1) * oy; } }
  },
  /* ---- celebrations (section 6.21): the scorer runs to the corner or his fans; four to pick from for 1.2 s ---- */
  startCelebration(f) {
    const all = EF.all('celebration'), sig = EF.get('celebration', f.data.celebration || f.team.celebration) || all[0];
    const R = this.rng, others = H.shuffle(R, all.filter(c => c !== sig && !c.pair)).slice(0, 3), offer = [sig].concat(others);
    const cx = f.body.x > P.CX ? P.X1 - 30 : P.X0 + 30, cy = f.body.y > P.CY ? P.Y1 - 20 : P.Y0 + 20;
    this.celebration = { who: f, offer, pick: null, t: 0, dur: 2.6, to: [lerp(f.body.x, cx, .7), lerp(f.body.y, cy, .7)], human: f.human && !f.human.cpu ? f.human : null };
    f.order = { kind: 'celebrate', to: this.celebration.to, t: 6 };
    for (const q of this.side[f.side]) if (q !== f && q.role !== 'GK') q.order = { kind: 'pile', to: [this.celebration.to[0] + (q.idx - 2) * 8, this.celebration.to[1] + 8], t: 6 };
  },
  celebrationStep(dt) {
    const C = this.celebration; if (!C) return; C.t += dt; const f = C.who;
    if (!C.pick) {
      if (C.human) { const pr = C.human.ctl.peek(); const i = pr.pass ? 0 : pr.shoot ? 1 : pr.lob ? 2 : pr.through ? 3 : pr.cel >= 0 ? pr.cel : -1; if (i >= 0) C.pick = C.offer[i]; }
      if (!C.pick && (C.t > 1.2 || !C.human)) C.pick = C.offer[0];
      if (C.pick) { C.playT = 0; f.clip = C.pick.clip ? { name: C.pick.clip, t: 0, w: 1, speed: C.pick.speed || 1 } : null; f.proc = C.pick.proc || null; f.expr = 'shout';
        if (C.pick.proc === 'fishslap') { const mate = this.outfield(f.side).filter(q => q !== f).sort((a, b) => H.d(a.body, f.body) - H.d(b.body, f.body))[0]; if (mate) { mate.proc = 'fishslap'; mate.order = { kind: 'pile', to: [f.body.x + 10, f.body.y], t: 6 }; C.partner = mate; } }
        this.addEuphoria(f.side, C.pick.euphoria || 8, 'celebration'); this.emit('celebrate', { who: f, id: C.pick.id, name: C.pick.name }); if (C.pick.card && game.settings.cards !== 'off') this.queueCard(f, 'yellow', 'shirt'); }
    }
    if (C.pick) { C.playT += dt; if (C.pick.travel && C.playT < 1) { const a = f.facing; f.body.vx = Math.cos(a) * C.pick.travel * (1 - C.playT); f.body.vy = Math.sin(a) * C.pick.travel * (1 - C.playT); } }
    for (const q of this.side[f.side]) if (q !== f && q.order && q.order.kind === 'pile' && !q.clip && H.d(q.body, f.body) < 26) { q.clip = { name: q.idx % 2 ? 'Victory' : 'Cheer_One_arm', t: 0, w: 1 }; q.expr = 'shout'; }
    f.celebrate = C;
  },
  endCelebration() { const C = this.celebration; if (C) { C.who.celebrate = null; C.who.clip = null; C.who.pose = null; C.who.tilt = null; C.who.proc = null; C.who.expr = null; } for (const q of this.players) { if (q.order && (q.order.kind === 'pile' || q.order.kind === 'celebrate')) q.order = null; q.clip = null; q.pose = null; q.proc = null; q.expr = null; } this.celebration = null; }
});
/* the super's charge-up as a footballer state */
Object.assign(Footballer.prototype, {
  superHold() { const B = this.body; B.vx = B.vy = 0; this.look.pose = 'cast'; }
});
