/* ============ 12-match: the simulation: rules, referee, euphoria, set pieces, flow ============ */
EF.Match = class Match {
  constructor(o = {}) {
    this.o = o; this.seed = o.seed === undefined ? (EF.query.seed ? +EF.query.seed : 1337) : o.seed; this.rng = E.rng(this.seed);
    this.home = o.home || 'kip'; this.away = o.away || 'hoo'; this.stadiumId = o.stadium || (EF.get('team', this.home).stadium);
    this.stadium = EF.get('stadium', this.stadiumId) || EF.get('stadium', 'rec'); this.refData = EF.get('referee', o.ref || 'haltwhistle');
    this.rules = Object.assign({ needWinner: false, euphoria: true, shootoutOnly: false, training: false, halfSecs: EF.T.halfSecs, pure: false, aiOnly: false }, o.rules || {});
    this.halfSecs = this.rules.halfSecs; this.ball = new EF.Ball(); this.F = []; this.teams = []; this.t = 0; this.talk = o.talk || null; this.aiSpeed = 1; this.events = []; this.stats = [0, 1].map(() => this.newStats());
    for (const side of [0, 1]) {
      const id = side === 0 ? this.home : this.away, data = EF.get('team', id), kitKey = (side === 1 && o.awayKit) ? 'away' : 'kit', kit = (kitKey === 'away' && data.away) ? data.away : data.kit;
      const fm = EF.get('formation', (side === 0 && o.formation) ? o.formation : data.formation); const team = { id, data, kit, formation: fm, F: [], down: 0 };
      data.players.forEach((pd, i) => { const f = new EF.Footballer(this, side, i, pd, fm.slots[i][0]); team.F.push(f); this.F.push(f); });
      this.teams.push(team);
    }
    // the second team wears its away kit if the colours are too close
    if (this.teams[0].kit.cloth === this.teams[1].kit.cloth) this.teams[1].kit = this.teams[1].data.away || this.teams[1].kit;
    this.score = [0, 0]; this.half = 1; this.clock = 0; this.extra = false; this.golden = false; this.mode = 'kickoff'; this.modeT = 0; this.restartSide = 0; this.eu = [this.talk === 'shoulder' ? .15 : (o.euStart || 0), 0]; this.europhoria = null; this.euFull = [false, false];
    this.sp = null; this.adv = null; this.var = null; this.duel = null; this.slow = 1; this.shoot = null; this.suspect = [-99, -99]; this.refCard = null; this.fxEnts = []; this.nextEvent = 22 + this.rng() * 14; this.humans = []; this.frames = []; this.frameT = 0; this.replay = null; this.goals = []; this.oneTwo = null;
    this.ref = { x: Pitch.CX, y: Pitch.CY + 40, vx: 0, vy: 0, facing: 0, arm: 0 }; this.kickHold = 0; this.lastWhistle = 0; this.over = false; this.result = null; this.cheat = o.cheat || null; this.penaltyLive = false; this.duelSlow = 1;
    this.aiSpeed = o.aiSpeed || 1; if (EF.game && EF.game.settings) { const d = EF.game.settings.difficulty; if (!o.aiSpeed && !this.rules.training) this.aiSpeed = d === 'easy' ? .93 : d === 'hard' ? 1.05 : 1; }
    this.minutesShown = 0;
    if (this.rules.shootoutOnly) { this.startShootout(); } else this.kickoff(0, true);
  }
  newStats() { return { shots: 0, onTarget: 0, passes: 0, passesDone: 0, tackles: 0, fouls: 0, corners: 0, poss: 0, saves: 0, cards: 0, goals: 0, headerGoals: 0, nutmegs: 0, fkGoals: 0, superGoals: 0, busGoals: 0, supers: 0, skills: 0, dives: 0 }; }
  emit(type, data = {}) {
    const st = data.side !== undefined ? this.stats[data.side] : null;
    if (st) { if (type === 'shot') { st.shots++; this.pendingShot = { side: data.side, t: this.t }; } else if (type === 'pass' || type === 'lob') st.passes++; else if (type === 'skill' || type === 'rainbow' || type === 'nutmeg') { st.skills++; if (type === 'nutmeg') st.nutmegs++; this.addEu(data.side, type === 'nutmeg' ? .1 : .04, 'skill'); } else if (type === 'header' || type === 'volley' || type === 'bicycle') { this.addEu(data.side, .05); } }
    if (type === 'save' && data.shooter !== undefined && data.shooter >= 0 && this.F[data.shooter]) this.stats[this.F[data.shooter].side].onTarget++;
    if (type === 'goal' && !data.own) this.stats[data.side].onTarget++;
    data.t = +this.t.toFixed(2); this.seq = (this.seq || 0) + 1; this.events.push(Object.assign({ type, seq: this.seq }, data)); if (this.events.length > 60) this.events.shift(); EF.bus.emit(type, Object.assign({ match: this }, data)); }
  talkBuff(side, id) { return side === 0 && this.talk === id; }
  get minute() { const per = this.extra ? 15 : 45, base = this.extra ? 90 : this.half === 2 ? 45 : 0; return base + Math.min(per, Math.floor(this.clock / (this.extra ? this.halfSecs * .5 : this.halfSecs) * per)); }
  /* ---------- helpers ---------- */
  pressure(f) { let n = 0; for (const o of this.F) if (o.side !== f.side && !o.sentOff && Math.hypot(o.x - f.x, o.y - f.y) < 32) n++; return Math.min(3, n); }
  openness(f) { let m = 99; for (const o of this.F) if (o.side !== f.side && !o.sentOff) m = Math.min(m, Math.hypot(o.x - f.x, o.y - f.y)); return m; }
  nearestTo(x, y, pred) { let b = null, bd = 1e9; for (const f of this.F) { if (f.sentOff || (pred && !pred(f))) continue; const d = Math.hypot(f.x - x, f.y - y); if (d < bd) { bd = d; b = f; } } return b; }
  other(side) { return 1 - side; }
  /* ---------- euphoria ---------- */
  addEu(side, amt, why) {
    if (!this.rules.euphoria || this.europhoria && this.europhoria.side === side) return; const T = EF.T, was = this.eu[side];
    this.eu[side] = clamp(was + amt * T.euphGain * (this.cheat && this.cheat.euphoria && (this.cheat.side === undefined || this.cheat.side === side) ? this.cheat.euphoria : 1), 0, 1);
    if (this.eu[side] >= 1 && !this.euFull[side]) { this.euFull[side] = true; this.emit('euphoriaFull', { side }); }
  }
  tryEuphoria(side) {
    if (!this.rules.euphoria || this.europhoria || this.eu[side] < 1) return false; if (!['play', 'setpiece'].includes(this.mode)) return false;
    this.europhoria = { side, t: EF.T.europhoriaSecs }; this.emit('europhoria', { side }); return true;
  }
  useEuphoria(side) { this.stats[side].supers++; this.eu[side] = 0; this.euFull[side] = false; if (this.europhoria) this.europhoria.t = Math.min(this.europhoria.t, .6); }
  /* ---------- tackles, fouls, cards ---------- */
  resolveTackle(f, o, kind) {
    const M = this, T = EF.T, rng = this.rng, ref = this.refData, ball = this.ball;
    if (o.immune > 0 && kind !== 'slideNoBall') { f.cool = Math.max(f.cool, .5); M.emit('tackleFailed', { who: f.id, side: f.side, x: o.x, y: o.y, victim: o.id }); return; }
    const hasBall = ball.owner === o, behind = Math.abs(angDiff(f.facing, o.facing)) < 1.0;
    let win = {poke: .5, slide: .72, barge: .5, slideNoBall: 0}[kind] * T.tackleStrength * (.7 + (f.data.tackle || 70) / 150) / (.8 + (o.data.skill || 70) / 250) * (M.europhoria && M.europhoria.side === f.side ? 1.2 : 1) * (M.talkBuff(f.side, 'hairdryer') && M.minute < 15 ? 1.1 : 1) * (hasBall ? 1 : 0);
    if (f.side === 1) win *= T.aiSkill;
    let foulP = ({ poke: .06, slide: .28, barge: .16, slideNoBall: .85 }[kind]) * T.foulChance * ref.strict * (behind ? 2.1 : 1) * (kind === 'barge' && o.isGK ? 2 : 1);
    const won = rng() < win; foulP *= won ? .5 : 1.3;
    if (!hasBall && kind !== 'slideNoBall') foulP *= .9;
    // physical effects
    if (kind === 'barge') { const a = Math.atan2(o.y - f.y, o.x - f.x), m = 150 * (f.data.weight || 70) / (o.data.weight || 70); o.vx += Math.cos(a) * m; o.vy += Math.sin(a) * m; }
    if (rng() < foulP) { this.callFoul(f, o, clamp(.3 + (kind === 'slide' || kind === 'slideNoBall' ? .4 : kind === 'barge' ? .25 : 0) + (behind ? .25 : 0) + rng() * .2, 0, 1), kind); if (kind !== 'poke') o.knock(f, kind === 'slideNoBall' ? .9 : .6); return; }
    if (hasBall && won) {
      this.suspect[f.side] = kind === 'slide' ? this.t : this.suspect[f.side];
      if (kind === 'slide') { o.knock(f, 1); ball.owner = null; ball.last = f; const a = f.facing; ball.vx = Math.cos(a) * 110 + o.vx * .2; ball.vy = Math.sin(a) * 110 + o.vy * .2; ball.vz = 55; ball.z = 2; f.cool = .2; M.emit('knockdown', { who: o.id, side: o.side, x: o.x, y: o.y, by: f.id }); }
      else if (kind === 'barge') { ball.owner = null; ball.last = f; const a = Math.atan2(o.y - f.y, o.x - f.x); ball.vx = Math.cos(a) * 100; ball.vy = Math.sin(a) * 100; ball.vz = 30; ball.z = 2; o.stun = .35; }
      else { ball.owner = f; ball.last = f; ball.vx = ball.vy = 0; o.stun = .3; f.cool = .15; }
      this.tackleWon(f, o);
    } else { f.cool = Math.max(f.cool, kind === 'poke' ? .5 : .3); if (kind === 'poke') f.stun = .22; M.emit('tackleFailed', { who: f.id, side: f.side, x: o.x, y: o.y, victim: o.id }); }
  }
  tackleWon(f, o) { this.stats[f.side].tackles++; this.addEu(f.side, .045, 'tackle'); this.emit('tackleWon', { who: f.id, side: f.side, x: f.x, y: f.y, victim: o ? o.id : -1 }); }
  callFoul(off, vic, sev, kind) {
    const M = this, ball = this.ball, ref = this.refData, rng = this.rng; if (!['play'].includes(this.mode)) return;
    this.stats[off.side].fouls++;
    const inBox = Pitch.inBox(vic.x, vic.y, off.side), spot = { x: vic.x, y: vic.y };
    // advantage: the fouled side has the ball or is about to
    const vicHas = ball.owner && ball.owner.side === vic.side || (!ball.owner && Math.hypot(ball.x - vic.x, ball.y - vic.y) < 50 && ball.last && ball.last.side === vic.side);
    if (vicHas && sev < .8 && !inBox && !this.adv && this.rules.advantage !== false && (Pitch.goalX(vic.side) - vic.x) * (vic.side ? -1 : 1) > -400) {
      this.adv = { side: vic.side, t: 2.2, off, vic, spot, sev, kind }; this.suspect[off.side] = this.t; this.emit('advantage', { side: vic.side, who: off.id, x: vic.x, y: vic.y }); return;
    }
    this.punish(off, vic, sev, kind, spot, inBox);
  }
  punish(off, vic, sev, kind, spot, inBox) {
    const ref = this.refData, rng = this.rng; this.adv = null;
    this.emit('foul', { side: off.side, who: off.id, victim: vic.id, x: spot.x, y: spot.y, kind, sev });
    // cards
    let card = null; const p = clamp(sev * .55 * ref.strict + ((off.data.temper || 40) - 50) / 400 + (this.europhoria && this.europhoria.side === off.side ? .05 : 0), 0, .95);
    if (sev > .85 && rng() < .3 * ref.strict) card = 'red'; else if (rng() < p) card = 'yellow';
    if (card) { if (card === 'yellow' && off.cards >= 1) card = 'red'; this.giveCard(off, card); }
    if (inBox && !(this.stats && this.rules.training && !this.rules.penaltiesInTraining)) { this.awardPenalty(off, vic, sev); }
    else this.setPiece('freekick', vic.side, spot.x, spot.y, { foulBy: off.id });
  }
  giveCard(f, color) {
    this.refCard = { color, who: f.id, t: 2.4 }; this.stats[f.side].cards++;
    if (color === 'yellow') f.cards++; else { f.cards = 2; }
    this.emit('card', { who: f.id, side: f.side, color, x: f.x, y: f.y });
    if (color === 'red') { f.sentOff = true; this.teams[f.side].down++; f.x = f.side === 0 ? Pitch.X0 - 20 : Pitch.X1 + 20; f.y = Pitch.Y1 + 30; if (this.ball.owner === f) this.ball.owner = null; this.emit('sendOff', { who: f.id, side: f.side }); }
  }
  awardPenalty(off, vic, sev) {
    const side = vic.side, rng = this.rng; this.emit('penaltyAwarded', { side, who: vic.id, foul: off.id });
    const marginal = sev < .5 && this.refData.varHappy * EF.T.varChance > rng() * .7;
    this.pendingPen = { side, vic, marginal };
    this.startVar('penalty', () => this.setPiece('penalty', side, 0, 0, { taker: vic }), () => { this.emit('varDecision', { overturned: true, kind: 'penalty' }); this.setPiece('goalkick', 1 - side, 0, 0); }, marginal ? .9 : 0);
  }
  resolveDive(f) {
    const ref = this.refData, rng = this.rng, o = this.F.find(g => g.side !== f.side && !g.sentOff && Math.hypot(g.x - f.x, g.y - f.y) < 18 && g.state !== 'down'), ball = this.ball;
    this.stats[f.side].dives++; this.emit('dive', { who: f.id, side: f.side, x: f.x, y: f.y, contact: !!o });
    if (ball.owner === f) { ball.owner = null; ball.last = f; ball.vx = f.vx * .4; ball.vy = f.vy * .4; ball.vz = 0; f.cool = .6; }
    if (this.mode !== 'play') return;
    if (o) {
      const buy = .25 + ref.gull * .9 + (f.data.diver ? .15 : 0);
      if (rng() < buy) { this.emit('diveWon', { who: f.id, side: f.side }); this.punish(o, f, .4, 'dive', { x: f.x, y: f.y }, Pitch.inBox(f.x, f.y, o.side)); return; }
    }
    const book = (o ? .3 : .88) * ref.strict;
    if (rng() < book) { this.giveCard(f, f.cards >= 1 ? 'red' : 'yellow'); this.emit('diveBooked', { who: f.id, side: f.side }); this.setPiece('freekick', 1 - f.side, f.x, f.y, { indirect: true }); }
  }
  /* ---------- VAR ---------- */
  startVar(kind, onStand, onOver, forceP) {
    const ref = this.refData; let p = forceP !== undefined && forceP > 0 ? forceP : EF.T.varChance * (.4 + ref.varHappy);
    if (kind === 'goal') p *= (this.suspect[this.lastGoalSide] > this.t - 9 ? 1.8 : .2);
    const over = this.rng() < p; this.var = { kind, t: 0, dur: 2.9, over, onStand, onOver }; this.prevMode = this.mode; this.mode = 'var'; this.modeT = 0; this.emit('var', { kind });
  }
  /* ---------- the Save Duel ---------- */
  startDuel(keeper, ball, t, k) {
    if (this.duel || this.rules.noDuel) { k.outcome = 'beat'; return; }
    this.duel = { t: 0, dur: 1.0 * EF.T.duelWindow, keeper, side: keeper.side, press: null, q: null, k, eta: t }; this.emit('saveDuel', { side: keeper.side, who: keeper.id });
  }
  duelStep(dt) {
    const d = this.duel; d.t += dt; this.slow = d.done ? this.slow : .28;
    // a human defender pressing any face button: the ring's sweet spot is at 70%
    if (d.press === null) for (const h of this.humans) if (h.side === d.side && h.ctl && h.ctl.anyFace && h.ctl.anyFace()) { d.press = d.t; }
    const aiPress = d.aiAt === undefined ? (d.aiAt = d.dur * (.45 + this.rng() * .55 * (1.2 - Math.min(1, EF.T.aiSkill * .6)))) : d.aiAt;
    if (d.press === null && !this.humans.some(h => h.side === d.side) && d.t >= aiPress) d.press = d.t;
    if (d.press !== null || d.t >= d.dur) {
      const sweet = d.dur * .68, err = d.press === null ? 1 : Math.abs(d.press - sweet) / (d.dur * .32); d.q = clamp(1 - err, 0, 1);
      const human = this.humans.some(h => h.side === d.side); const need = human ? .45 : .5 / Math.max(.5, EF.T.aiSkill * .9);
      const save = d.q >= (human ? .45 : need) ; d.done = true; this.slow = 1; const k = d.k; k.outcome = save ? (d.q > .8 ? 'catch' : 'parry') : 'beat'; d.keeper.k.shotId = this.ball.shotId;
      if (!save) { k.ty = clamp(this.ball.shotAimY || Pitch.CY, Pitch.CY - Pitch.GH + 4, Pitch.CY + Pitch.GH - 4); } 
      this.emit('saveDuelResult', { side: d.side, save, q: d.q, perfect: d.q > .8 }); this.duelResult = { save, q: d.q, t: this.t }; this.duel = null;
    }
  }
  afterSave(keeper, held) { const s = keeper.side; this.stats[s].saves++; this.addEu(s, held ? .07 : .06, 'save'); if (this.ball.sup) this.ball.sup = null; this.slow = 1; this.duel = null; }
  /* ---------- humans ---------- */
  humanCtl(idx) { const h = this.humans.find(h => h.idx === idx); return h && h.ctl; }
  addHuman(idx, side, ctl, opts = {}) { const h = Object.assign({ idx, side, ctl, f: null, auto: true, swT: 0 }, opts); this.humans.push(h); return h; }
  claimed(except) { const s = new Set(); for (const h of this.humans) if (h !== except && h.f) s.add(h.f); return s; }
  assignHumans(dt) {
    const ball = this.ball;
    for (const h of this.humans) {
      h.swT = Math.max(0, h.swT - dt); const used = this.claimed(h), mates = this.F.filter(f => f.side === h.side && !f.sentOff && (!f.isGK || this.mode === 'penaltyHuman') && !used.has(f));
      if (!mates.length) { h.f = null; continue; }
      if (h.f && (h.f.sentOff || used.has(h.f) || (h.f.isGK && this.mode !== 'penaltyHuman'))) h.f = null;
      const dist = f => Math.hypot(f.x - ball.x, f.y - ball.y);
      if (this.mode === 'setpiece' && this.sp && this.sp.taker && this.sp.taker.side === h.side && !this.sp.taker.isGK) { if (!used.has(this.sp.taker)) h.f = this.sp.taker; continue; }
      if (this.mode === 'penaltyHuman' && this.shootoutHuman) { h.f = this.shootoutHuman(h.side) || h.f; continue; }
      if (!h.f) { h.f = mates.sort((a, b) => dist(a) - dist(b))[0]; continue; }
      if (h.manual) { if (h.f && ball.owner && ball.owner.side === h.side) h.manual = false; else continue; }
      if (h.auto && h.swT <= 0) {
        if (ball.owner && ball.owner.side === h.side && ball.owner !== h.f && mates.includes(ball.owner)) { h.f = ball.owner; h.swT = .5; }
        else if (!ball.owner || ball.owner.side !== h.side) { const n = mates.sort((a, b) => dist(a) - dist(b))[0]; if (n && n !== h.f && dist(h.f) - dist(n) > 22) { h.f = n; h.swT = .6; } }
      }
    }
    for (const f of this.F) f.human = null; for (const h of this.humans) if (h.f) h.f.human = h.idx;
  }
  requestSwitch(f) {
    const h = this.humans.find(h => h.f === f); if (!h) return; const used = this.claimed(h), ball = this.ball;
    const c = this.F.filter(g => g.side === h.side && !g.sentOff && !g.isGK && g !== f && !used.has(g)).sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y))[0];
    if (c) { h.f = c; h.swT = 1.2; h.manual = true; this.emit('switch', { side: h.side, who: c.id }); }
  }
  intentFor(f) {
    if (f.human !== null) { const h = this.humans.find(h => h.idx === f.human); if (h && h.ctl) return h.ctl.read(f, this); }
    return EF.AI.intent(this, f);
  }
  /* ---------- restarts ---------- */
  formationSpot(f, attacking) { return EF.AI.spot(this, f); }
  kickoff(side, first) {
    const P = Pitch, ball = this.ball; this.restartSide = side; ball.stop(); ball.owner = null; ball.x = P.CX; ball.y = P.CY; ball.z = 0; ball.last = null; ball.fk = -1; ball.sup = null; ball.shotBy = null; ball.passTo = null; this.adv = null; this.sp = null; this.penaltyLive = false;
    for (const f of this.F) {
      if (f.sentOff) continue; const dir = f.side === 0 ? -1 : 1; const s = EF.AI.baseSpot(this, f, 'kickoff');
      f.x = s[0]; f.y = s[1]; f.vx = f.vy = 0; f.state = 'run'; f.stateT = 0; f.z = 0; f.vz = 0; f.stun = 0; f.cool = 0; f.charging = false; f.charge = 0; f.action = null; f.tilt = 0; f.facing = f.side === 0 ? 0 : Math.PI; f.celebrate = 0; f.k.outcome = null; f.k.holding = false; f.immune = 0;
    }
    const taker = this.F.filter(f => f.side === side && !f.sentOff && !f.isGK).sort((a, b) => b.data.pass - a.data.pass)[0]; taker.x = P.CX - (side === 0 ? 8 : -8); taker.y = P.CY; ball.owner = null; this.kickTaker = taker;
    this.mode = 'kickoff'; this.modeT = 0; this.kickHold = 0; this.duel = null; this.slow = 1; this.var = null; this.emit('kickoffSet', { side, first: !!first });
  }
  /** a restart: type 'throwin' | 'goalkick' | 'corner' | 'freekick' | 'penalty' */
  setPiece(type, side, x, y, o = {}) {
    const P = Pitch, ball = this.ball, rng = this.rng; const dirIn = side === 0 ? 1 : -1;
    if (type === 'goalkick') { x = side === 0 ? P.X0 + 28 : P.X1 - 28; y = P.CY + (rng() - .5) * 40; }
    if (type === 'corner') { x = o.right ? P.X1 : P.X0; y = o.low ? P.Y1 : P.Y0; }
    if (type === 'throwin') { y = y < P.CY ? P.Y0 : P.Y1; x = clamp(x, P.X0 + 8, P.X1 - 8); }
    if (type === 'penalty') { x = side === 0 ? P.X1 - P.SPOT : P.X0 + P.SPOT; y = P.CY; }
    if (type === 'freekick') { x = clamp(x, P.X0 + 6, P.X1 - 6); y = clamp(y, P.Y0 + 6, P.Y1 - 6); }
    this.adv = null; ball.stop(); ball.owner = null; ball.x = x; ball.y = y; ball.z = 0; ball.sup = null; ball.shotBy = null; ball.path = null; ball.passTo = null;
    let taker;
    if (type === 'goalkick') taker = this.F.find(f => f.side === side && f.isGK && !f.sentOff);
    else if (type === 'penalty') taker = o.taker && !o.taker.sentOff ? o.taker : this.F.filter(f => f.side === side && !f.sentOff && !f.isGK).sort((a, b) => b.data.shoot - a.data.shoot)[0];
    else taker = this.nearestTo(x, y, f => f.side === side && !f.sentOff && !f.isGK && f !== (o.excl || null));
    this.sp = { type, side, x, y, t: 0, taker, wait: type === 'penalty' ? 2.4 : type === 'freekick' ? 1.8 : type === 'throwin' ? 1.1 : 1.5, foulBy: o.foulBy, indirect: o.indirect, human: false };
    if (type === 'corner') this.stats[side].corners++;
    const away = type === 'throwin' ? (y < P.CY ? -1 : 1) * 5 : 0;
    taker.state = 'run'; taker.z = 0; taker.vz = 0; taker.stateT = 0; taker.stun = 0; taker.downT = 0; taker.celebrate = 0;
    taker.x = x - (type === 'throwin' || type === 'corner' ? 0 : dirIn * 8); taker.y = y + (type === 'throwin' ? away : type === 'corner' ? (y < P.CY ? -4 : 4) : 0); taker.vx = taker.vy = 0; taker.state = 'run'; taker.stateT = 0; taker.cool = 0;
    taker.facing = type === 'throwin' ? (y < P.CY ? Math.PI / 2 : -Math.PI / 2) : type === 'corner' ? Math.atan2(P.CY - y, P.goalX(side) - 30 * dirIn - x) : dirIn > 0 ? 0 : Math.PI;
    if (type === 'penalty') taker.facing = dirIn > 0 ? 0 : Math.PI;
    ball.x = taker.x + Math.cos(taker.facing) * 7; ball.y = taker.y + Math.sin(taker.facing) * 7; ball.owner = taker;
    this.mode = 'setpiece'; this.modeT = 0; this.sp.human = this.humans.some(h => h.side === side);
    // players to their places
    for (const f of this.F) {
      if (f === taker || f.sentOff) continue; f.vx = f.vy = 0; if (f.state === 'slide' || f.state === 'barge') { f.state = 'run'; }
      const s = EF.AI.setPieceSpot(this, f, this.sp); if (type === 'penalty' || type === 'freekick' || type === 'corner' || type === 'goalkick') { if (type === 'penalty' || !f.human) { f.x = s[0]; f.y = s[1]; f.facing = f.side === 0 ? 0 : Math.PI; f.state = 'run'; f.stun = 0; } }
    }
    this.emit(type === 'goalkick' ? 'goalKickSet' : type === 'throwin' ? 'throwInSet' : type + 'Set', { side, x, y, taker: taker.id, indirect: !!o.indirect }); if (type === 'freekick') this.emit('freekick', { side, x, y });
    this.whistle();
  }
  whistle() { this.emit('whistle', {}); }
  /* ---------- the step ---------- */
  update(dt0) {
    if (this.o.frozen || this.o.mirror) return;
    let dt = dt0 * this.slow * EF.T.gameSpeed; this.t += dt; this.modeT += dt;
    const ball = this.ball;
    if (this.mode === 'replay') return this.replayStep(dt0);
    this.assignHumans(dt);
    this.refStep(dt);
    const M = this.mode;
    if (M === 'halftime' || M === 'fulltime' || M === 'over') { if (M === 'halftime' && this.modeT > 4) { this.half = 2; this.clock = 0; this.kickoff(1); } if (M === 'fulltime' && this.modeT > 3) { this.finish(); } for (const f of this.F) this.stepFootballer(f, dt, true); this.followBall(); return; }
    if (this.var) { this.varStep(dt); for (const f of this.F) this.stepFootballer(f, dt, true); this.followBall(); return; }
    if (M === 'shootout') return this.shootoutStep(dt);
    if (M === 'goal' || M === 'celebrate') return this.goalStep(dt);
    if (M === 'kickoff') {
      for (const f of this.F) this.stepFootballer(f, dt, true);
      this.followBall(); this.updateEntities(dt);
      if (this.modeT > (this.o.quickKick ? .4 : 1.9)) { this.mode = 'play'; this.modeT = 0; this.ball.owner = this.kickTaker; this.kickHold = 2.2; this.whistle(); this.emit('kickoff', { side: this.restartSide }); }
      return;
    }
    if (M === 'setpiece') { this.spStep(dt); this.collisions(dt); this.updateEntities(dt); this.record(dt); if (this.mode === 'setpiece') { this.clockHold = true; return; } }
    this.kickHold = Math.max(0, this.kickHold - dt);
    if (this.duel) this.duelStep(dt);
    if (this.mode === 'play') this.playStep(dt);
    this.updateEntities(dt); this.record(dt);
  }
  stepFootballer(f, dt, frozen) {
    if (frozen) { f.step(dt, null); if (this.mode === 'kickoff' && !f.sentOff) { const s = EF.AI.baseSpot(this, f, 'kickoff'); const dx = s[0] - f.x, dy = s[1] - f.y, d = Math.hypot(dx, dy); if (d > 2 && f !== this.kickTaker) { f.x += dx / d * Math.min(d, 140 * dt); f.y += dy / d * Math.min(d, 140 * dt); f.facing = Math.atan2(dy, dx); f.vx = dx / d * 60; f.vy = dy / d * 60; } else if (f === this.kickTaker) { const tx = Pitch.CX - (this.restartSide === 0 ? 8 : -8), ty = Pitch.CY, ex = tx - f.x, ey = ty - f.y, ed = Math.hypot(ex, ey); if (ed > 2) { f.x += ex / ed * Math.min(ed, 140 * dt); f.y += ey / ed * Math.min(ed, 140 * dt); f.facing = Math.atan2(ey, ex); } } } return; }
    const intent = this.intentFor(f); f.step(dt, intent);
  }
  followBall() { const b = this.ball; if (b.owner) { const o = b.owner, k = o.isGK && o.state === 'hold' ? 6 : 8; b.x = o.x + Math.cos(o.facing) * k; b.y = o.y + Math.sin(o.facing) * k; b.z = o.isGK && o.state === 'hold' ? 10 : 0; b.vx = o.vx; b.vy = o.vy; b.vz = 0; b.roll += Math.hypot(o.vx, o.vy) * .01; } }
  playStep(dt) {
    const ball = this.ball, stat = this.stats;
    for (const f of this.F) this.stepFootballer(f, dt, false);
    this.collisions(dt);
    if (ball.owner) { this.followBall(); }
    else {
      const evs = ball.step(dt, this); for (const [t, d] of evs) { this.emit(t, Object.assign({ x: ball.x, y: ball.y }, d)); if (t === 'post' || t === 'bar') { this.addEu(ball.shotBy ? ball.shotBy.side : 0, .03); } }
      this.pickups(dt);
      for (const f of this.F) if (f.isGK) f.keeperContact();
      this.checkBounds();
    }
    if (this.mode === 'play' || this.mode === 'penaltyHuman') { this.checkAdv(dt); this.clockStep(dt); this.euStep(dt); this.possessionStats(dt); }
    if (ball.shotBy) { /* shot outcome tracked in checkBounds */ }
  }
  collisions(dt) {
    // players push each other apart a little; set-piece distances
    const F = this.F;
    for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
      const a = F[i], b = F[j]; if (a.sentOff || b.sentOff || a.state === 'down' || b.state === 'down' || a.state === 'flying' || b.state === 'flying') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 9; if (d < min && d > .01) { const p = (min - d) * .5, nx = dx / d, ny = dy / d; a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; }
    }
    if (this.mode === 'setpiece' && this.sp) {
      const sp = this.sp, R = sp.type === 'freekick' ? 38 : sp.type === 'corner' ? 30 : 0;
      if (R) for (const f of F) { if (f === sp.taker || f.sentOff || f.side === sp.side || f.isGK) continue; const dx = f.x - sp.x, dy = f.y - sp.y, d = Math.hypot(dx, dy) || 1; if (d < R) { f.x = sp.x + dx / d * R; f.y = sp.y + dy / d * R; } }
      if (sp.type === 'penalty') for (const f of F) { if (f === sp.taker || f.sentOff || f.isGK) continue; const gxl = Pitch.goalX(sp.side); const inB = Math.abs(f.y - Pitch.CY) < Pitch.BOXH + 4 && Math.abs(f.x - gxl) < Pitch.BOXD + 4; if (inB) { f.x = gxl + (sp.side === 0 ? -1 : 1) * (Pitch.BOXD + 8); } }
    }
    if (this.kickHold > 0 && this.mode === 'play') for (const f of F) { if (f.side !== this.restartSide && !f.sentOff) { const dx = f.x - Pitch.CX, dy = f.y - Pitch.CY, d = Math.hypot(dx, dy) || 1; if (d < 46 && (f.side === 0 ? f.x > Pitch.CX - 2 : f.x < Pitch.CX + 2) || d < 46) { f.x = Pitch.CX + dx / d * 46; f.y = Pitch.CY + dy / d * 46; } } }
  }
  pickups(dt) {
    const ball = this.ball; if (ball.owner || ball.z > 9 || this.mode === 'goal') return;
    const sp = ball.speed(), r = sp > 230 ? 4.5 : 9; let best = null, bd = 1e9;
    for (const f of this.F) {
      if (f.sentOff || f.state === 'down' || f.state === 'flying' || f.state === 'diving' || f.stun > 0 || f.cool > 0 || f.isGK && f.state !== 'run') continue; if (f.state === 'slide' || f.state === 'barge') continue;
      if (f.isGK) continue; // keepers claim in their own step
      const d = Math.hypot(ball.x - f.x, ball.y - f.y); if (d < r + (f.state === 'skill' ? 2 : 0) && d < bd) { bd = d; best = f; }
    }
    if (!best) return;
    const last = ball.last, tgt = ball.passTo;
    if (last && last === best && ball.speed() > 60 && this.t - (ball.tpass || -9) < .25) return;
    if (this.kickHold > 0 && this.mode === 'play' && best.side !== this.restartSide) return;
    ball.owner = best; ball.prev = last; ball.spin = 0; ball.vx = ball.vy = 0; ball.path = null;
    if (last && last !== best) {
      if (last.side === best.side) { this.stats[best.side].passesDone++; this.addEu(best.side, .022, 'pass'); this.emit('passDone', { side: best.side, who: last.id, to: best.id, x: best.x, y: best.y }); if (this.oneTwo && this.oneTwo.f === best && this.t - this.oneTwo.t < 2.6) { this.emit('oneTwo', { side: best.side, who: best.id }); this.oneTwo = null; best.stamina = Math.min(1, best.stamina + .2); } if (this.oneTwo && this.oneTwo.mate === best && this.t - this.oneTwo.t < 2.6) {/* waiting for the return */} }
      else { if (tgt && tgt.side === last.side && ball.passer) { this.emit('intercept', { side: best.side, who: best.id, x: best.x, y: best.y }); this.addEu(best.side, .035, 'intercept'); } this.emit('possession', { side: best.side, who: best.id }); }
    }
    if (ball.shotBy && ball.shotBy.side !== best.side) { ball.shotBy = null; }
    ball.passTo = null; ball.sup = null;
    if (this.rules.training) this.emit('touch', { who: best.id, side: best.side });
  }
  checkBounds() {
    const ball = this.ball, P = Pitch; if (this.mode !== 'play' && this.mode !== 'penaltyHuman') return;
    const inX = ball.x < P.X0 - 2 || ball.x > P.X1 + 2, side = ball.x > P.X1 + 2 ? 0 : 1;
    if (inX) {
      if (Math.abs(ball.y - P.CY) < P.GH - 1 && ball.z < P.BAR) { return this.goalScored(side); }
      // behind the goal line: a goal kick or a corner
      const last = ball.last ? ball.last.side : 1 - side;
      if (last === side) { this.stats[side].shots += 0; this.shotOutcome('wide'); this.emit('out', { x: ball.x, y: ball.y }); return this.setPiece('goalkick', 1 - side, 0, 0); }
      this.shotOutcome('wide'); this.emit('out', { x: ball.x, y: ball.y }); return this.setPiece('corner', side, 0, 0, { right: side === 0, low: ball.y > P.CY });
    }
    if (ball.y < P.Y0 - 1 || ball.y > P.Y1 + 1) { const last = ball.last ? ball.last.side : 0; this.shotOutcome('wide'); this.emit('out', { x: ball.x, y: ball.y }); return this.setPiece('throwin', 1 - last, ball.x, ball.y); }
    // a shot passing the line wide/high, tracked for near-miss commentary
    if (ball.shotBy && ball.shotT > .1 && ball.shotT < 1.7) { const gx = P.goalX(ball.shotBy.side); if (Math.abs(ball.x - gx) < 10 && ball.z >= P.BAR) { this.emit('nearMiss', { side: ball.shotBy.side, who: ball.shotBy.id, over: true }); ball.shotBy = null; } }
  }
  shotOutcome(kind) {
    const ball = this.ball; if (ball.shotBy && kind === 'wide') { const gx = Pitch.goalX(ball.shotBy.side); if (Math.abs(ball.x - gx) < 60 && ball.shotT < 2) this.emit('nearMiss', { side: ball.shotBy.side, who: ball.shotBy.id, x: ball.x, y: ball.y }); }
    ball.shotBy = null;
  }
  clockStep(dt) {
    const T = EF.T; this.clock += dt;
    if (this.rules.training || this.o.noClock) return;
    const lim = this.extra ? this.halfSecs * .5 : this.halfSecs;
    if (this.clock >= lim) {
      if (this.extra) { this.emit('fulltimeWhistle', {}); return this.endRegular(); }
      if (this.half === 1) { this.mode = 'halftime'; this.modeT = 0; this.ball.owner = null; this.ball.stop(); this.emit('half', {}); this.whistle(); return; }
      this.endRegular();
    }
  }
  endRegular() {
    this.whistle();
    if (this.score[0] === this.score[1] && this.rules.needWinner) {
      if (!this.extra && !this.rules.noExtra) { this.extra = true; this.golden = true; this.clock = 0; this.emit('goldenGoal', {}); this.kickoff(0); return; }
      this.startShootout(); return;
    }
    this.mode = 'fulltime'; this.modeT = 0; this.ball.stop(); this.ball.owner = null; this.emit('fulltime', { score: this.score.slice() });
    for (const f of this.F) f.celebrate = this.winner() === f.side ? 99 : 0;
  }
  winner() { return this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : this.shoot ? (this.shoot.score[0] > this.shoot.score[1] ? 0 : 1) : -1; }
  finish() { this.mode = 'over'; this.over = true; this.result = { score: this.score.slice(), pens: this.shoot ? this.shoot.score.slice() : null, winner: this.winner(), stats: this.stats, goals: this.goals.slice() }; this.emit('matchOver', this.result); }
  euStep(dt) {
    const T = EF.T;
    if (this.europhoria) { this.europhoria.t -= dt; this.eu[this.europhoria.side] = clamp(this.europhoria.t / T.europhoriaSecs, 0, 1); if (this.europhoria.t <= 0) { const s = this.europhoria.side; this.eu[s] = 0; this.euFull[s] = false; this.europhoria = null; this.emit('europhoriaEnd', { side: s }); } }
    else for (const s of [0, 1]) { if (this.eu[s] < 1) this.eu[s] = Math.max(0, this.eu[s] - T.euphDecay * dt); }
    // the CPU lets it rip when it is full
    for (const s of [0, 1]) if (!this.europhoria && this.eu[s] >= 1 && !this.humans.some(h => h.side === s) && this.t - (this.euFullT || 0) > 1.2) { this.euFullT = this.t; if (this.rng() < .5 || this.cheat) this.tryEuphoria(s); }
    if (this.europhoria && !this.humans.some(h => h.side === this.europhoria.side)) { /* the AI shoots in range automatically */ }
  }
  possessionStats(dt) { const o = this.ball.owner; if (o) this.stats[o.side].poss += dt; }
  checkAdv(dt) {
    const a = this.adv; if (!a) return; a.t -= dt; const ball = this.ball;
    if (ball.owner && ball.owner.side !== a.side) { this.punish(a.off, a.vic, a.sev, a.kind, a.spot, false); return; }
    if (a.t <= 0) { this.emit('advantageOver', { side: a.side }); this.adv = null; this.addEu(a.side, .03); }
  }
  /* ---------- goals ---------- */
  goalScored(side) {
    const ball = this.ball, scorer = ball.last, own = scorer && scorer.side !== side; this.lastGoalSide = side;
    const info = { side, who: scorer ? scorer.id : -1, own, header: !!(ball.headerBy !== undefined && scorer && ball.headerBy === scorer.id && this.t - ball.headerT < .8 && ball.headerKind !== 'volley' && ball.headerKind !== 'bicycle'), fk: ball.fk === side && this.t - 0 < 1e9 && ball.fkT < 6, sup: !!(ball.superT > 0 && ball.shotBy && ball.shotBy.side === side), bus: false, x: ball.x, y: ball.y, pen: this.penaltyLive };
    info.bus = this.teams[1 - side].data.tactic === 'catenaccio' && this.teams[1 - side].F.filter(f => !f.sentOff && !f.isGK && Math.abs(f.x - Pitch.ownGoalX(1 - side)) < 90).length >= 3;
    if (ball.sup || ball.superT > 0 && ball.shotBy) info.sup = true;
    this.goalInfo = info; ball.sup = null; ball.path = null; ball.superT = 0;
    const accept = () => this.confirmGoal(info);
    this.mode = 'goalcheck'; this.ball.owner = null;
    this.startVar('goal', accept, () => { this.emit('varDecision', { overturned: true, kind: 'goal' }); this.setPiece('goalkick', 1 - side, 0, 0); });
    // most goals are not checked: skip the monitor when there is nothing to look at
    if (!(this.suspect[side] > this.t - 9) && this.rng() > .08) { const v = this.var; this.var = null; this.mode = 'play'; accept(); }
  }
  confirmGoal(info) {
    const side = info.side, scorer = info.who >= 0 ? this.F[info.who] : null; this.score[side]++; this.stats[side].goals++; if (info.header && !info.own) this.stats[side].headerGoals++; if (info.fk && !info.own) this.stats[side].fkGoals++; if (info.sup) this.stats[side].superGoals++; if (info.bus) this.stats[side].busGoals++;
    this.goals.push({ side, who: info.who, name: scorer ? scorer.name : '?', minute: this.minute, own: info.own, header: info.header, fk: info.fk, pen: info.pen, sup: info.sup }); this.addEu(side, .2); this.addEu(1 - side, -.0);
    this.mode = 'goal'; this.modeT = 0; this.ball.stop(); this.ball.owner = null; this.penaltyLive = false; this.sp = null; this.adv = null; this.slow = 1; this.duel = null;
    for (const f of this.F) { f.celebrate = f.side === side && !f.sentOff ? 4 : 0; f.charging = false; f.charge = 0; if (f.state === 'slide' || f.state === 'barge') f.state = 'run'; }
    if (scorer && scorer.side === side) { scorer.celebrate = 6; this.celebrant = scorer; } else this.celebrant = this.F.find(f => f.side === side && !f.isGK && !f.sentOff);
    this.emit('goal', { side, who: info.who, own: info.own, header: info.header, fk: info.fk, sup: info.sup, pen: info.pen, bus: info.bus, x: info.x, y: info.y, score: this.score.slice(), name: scorer ? scorer.name : '' });
    this.replayReady = this.frames.slice(-170);
  }
  goalStep(dt) {
    for (const f of this.F) this.stepFootballer(f, dt, true);
    // the scorer runs to the corner flag; the others jog toward him
    const c = this.celebrant; if (c) { const side = this.goalInfo ? this.goalInfo.side : 0, tx = Pitch.goalX(side) - (side === 0 ? 70 : -70), ty = c.y < Pitch.CY ? Pitch.Y0 + 40 : Pitch.Y1 - 40; const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy); if (d > 6) { c.x += dx / d * 80 * dt; c.y += dy / d * 80 * dt; c.facing = Math.atan2(dy, dx); c.vx = dx / d * 80; c.vy = dy / d * 80; } else { c.vx = c.vy = 0; }
      for (const f of this.F) if (f.side === side && f !== c && !f.isGK && !f.sentOff) { const ex = c.x - f.x, ey = c.y - f.y, ed = Math.hypot(ex, ey); if (ed > 24) { f.x += ex / ed * 60 * dt; f.y += ey / ed * 60 * dt; f.facing = Math.atan2(ey, ex); f.vx = ex / ed * 60; f.vy = ey / ed * 60; } else { f.vx = f.vy = 0; } } }
    if (this.mode === 'goal' && this.modeT > 1.4) { this.mode = 'celebrate'; this.modeT = 0; }
    if (this.mode === 'celebrate' && this.modeT > (this.o.noReplay ? 2.6 : 2.4)) {
      if (this.golden || (this.goalInfo && this.rules.sudden)) { this.finishGolden(); return; }
      if (!this.o.noReplay && this.replayReady && this.replayReady.length > 30) return this.startReplay();
      this.resumeAfterGoal();
    }
  }
  finishGolden() { this.mode = 'fulltime'; this.modeT = 0; for (const f of this.F) f.celebrate = this.winner() === f.side ? 99 : 0; this.emit('fulltime', { score: this.score.slice(), golden: true }); }
  resumeAfterGoal() { const side = this.goalInfo ? 1 - this.goalInfo.side : 0; this.replay = null; this.kickoff(side); }
  /* ---------- the replay ---------- */
  record(dt) { this.frameT += dt; if (this.frameT >= 1 / 30) { this.frameT = 0; this.frames.push(this.capture()); if (this.frames.length > 260) this.frames.shift(); } }
  capture() {
    const b = this.ball, round = v => Math.round(v * 10) / 10;
    return { b: [round(b.x), round(b.y), round(b.z), round(b.vx), round(b.vy), b.owner ? b.owner.id : -1, round(b.roll), b.sup ? 1 : 0],
      f: this.F.map(f => [round(f.x), round(f.y), round(f.z), +f.facing.toFixed(2), round(f.vx), round(f.vy), f.state, f.action || 0, +f.stateT.toFixed(2), +(f.tilt || 0).toFixed(2), +(f.jump || 0).toFixed(2), +(f.celebrate > 0 ? 1 : 0), f.sentOff ? 1 : 0, +f.stamina.toFixed(2), f.charging ? +Math.min(1.6, f.charge).toFixed(2) : 0]) };
  }
  restore(fr) {
    const b = this.ball, B = fr.b; b.x = B[0]; b.y = B[1]; b.z = B[2]; b.vx = B[3]; b.vy = B[4]; b.owner = B[5] >= 0 ? this.F[B[5]] : null; b.roll = B[6]; b.sup = B[7] ? { color: '#ffd84a' } : null;
    fr.f.forEach((a, i) => { const f = this.F[i]; f.x = a[0]; f.y = a[1]; f.z = a[2]; f.facing = a[3]; f.vx = a[4]; f.vy = a[5]; f.state = a[6]; f.action = a[7] || null; f.stateT = a[8]; f.tilt = a[9]; f.jump = a[10]; f.celebrate = a[11] ? 2 : 0; f.sentOff = !!a[12]; f.stamina = a[13]; f.charge = a[14]; f.charging = a[14] > 0; });
  }
  startReplay() {
    this.liveSave = this.capture(); this.liveMode = { half: this.half, clock: this.clock }; this.replay = { frames: this.replayReady, i: 0, t: 0, speed: 1 }; this.mode = 'replay'; this.modeT = 0; this.emit('replayStart', {});
  }
  replayStep(dt) {
    const r = this.replay; r.t += dt * (r.i > r.frames.length - 45 ? .55 : 1); r.i = Math.min(r.frames.length - 1, Math.floor(r.t * 30)); this.restore(r.frames[r.i]);
    if (r.i >= r.frames.length - 1 || this.skipReplay) { this.skipReplay = false; this.restore(this.liveSave); this.emit('replayEnd', {}); this.mode = 'celebrate'; this.replay = null; this.modeT = 99; this.replayReady = null; this.mode = 'goal'; this.modeT = 9; this.resumeAfterGoal(); }
  }
  varStep(dt) {
    const v = this.var; v.t += dt;
    if (v.t >= v.dur) { this.var = null; this.mode = this.prevMode === 'goalcheck' || v.kind === 'goal' ? 'play' : this.prevMode; this.emit('varDecision', { overturned: v.over, kind: v.kind }); if (v.over) v.onOver(); else v.onStand(); }
  }
  /* ---------- the referee and matchday entities ---------- */
  refStep(dt) {
    const r = this.ref, b = this.ball, tx = b.x - (b.vx > 30 ? -30 : 30) * 0 + 36 * (b.y > Pitch.CY ? -1 : 1) * 0, ty = b.y + 34, d = Math.hypot(tx - r.x, ty - r.y);
    const sp = Math.min(70, d * 2); r.vx = approach(r.vx, d > 2 ? (tx - r.x) / d * sp : 0, 400 * dt); r.vy = approach(r.vy, d > 2 ? (ty - r.y) / d * sp : 0, 400 * dt); r.x += r.vx * dt; r.y += r.vy * dt; r.y = clamp(r.y, Pitch.Y0 + 12, Pitch.Y1 + 8); if (Math.hypot(r.vx, r.vy) > 6) r.facing = Math.atan2(r.vy, r.vx);
    if (this.refCard) { this.refCard.t -= dt; if (this.refCard.t <= 0) this.refCard = null; }
  }
  updateEntities(dt) {
    this.nextEvent -= dt; const evs = this.stadium.events || [];
    if (this.nextEvent <= 0 && evs.length && !this.rules.training && !this.o.noEvents && this.mode === 'play') { this.nextEvent = 28 + this.rng() * 30; this.spawnEvent(this.rng() < .5 ? evs[Math.floor(this.rng() * evs.length)] : evs[0]); }
    for (const e of this.fxEnts) {
      e.t += dt;
      if (e.kind === 'seagull') { e.x += e.vx * dt; e.y += e.vy * dt; if (e.t < 2) { e.z = Math.max(0, e.z - 20 * dt); } else if (e.t > 6 + e.life) { e.z += 40 * dt; e.vx *= 1.01; } if (e.t > 3 && e.t < 6 && !this.ball.owner && Math.hypot(this.ball.x - e.x, this.ball.y - e.y) < 12 && this.ball.speed() < 30) { this.ball.vx += 25; this.ball.vy -= 15; } }
      else if (e.kind === 'invader') { e.x += e.vx * dt; if (e.t < 1) e.y += 0; for (const f of this.F) if (f.state === 'kick' && f.action === 'poke' && Math.hypot(f.x - e.x, f.y - e.y) < 17 && !e.caught) { e.caught = true; e.vx = 0; this.emit('invaderTackled', { who: f.id, side: f.side, kind: e.who }); } if (e.caught && e.t > e.catchT + 2) e.dead = true; if (e.caught && !e.catchT) e.catchT = e.t; }
      else if (e.kind === 'beachball') { e.vz -= 200 * dt; e.z += e.vz * dt; e.x += e.vx * dt; e.y += e.vy * dt; if (e.z < 0) { e.z = 0; e.vz = 90 * (e.bounces++ < 5 ? 1 : 0); } }
      else if (e.kind === 'keith') { e.x += e.vx * dt; }
    }
    this.fxEnts = this.fxEnts.filter(e => !e.dead && e.t < (e.max || 20));
    if (this.flicker > 0) this.flicker -= dt;
  }
  spawnEvent(kind) {
    const P = Pitch, rng = this.rng, e = { kind, t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, life: rng() * 3 };
    if (kind === 'seagull') { e.x = P.CX + (rng() - .5) * 200; e.y = P.CY + (rng() - .5) * 140; e.z = 70; e.vx = (rng() - .5) * 18; e.vy = (rng() - .5) * 10; e.max = 12; }
    else if (kind === 'beachball') { e.kind = 'beachball'; e.x = P.CX + (rng() - .5) * 100; e.y = P.Y0 - 4; e.z = 60; e.vx = (rng() - .5) * 30; e.vy = 40; e.vz = 0; e.bounces = 0; e.max = 14; }
    else if (kind === 'invader' || kind === 'keith') { e.kind = 'invader'; e.who = kind === 'keith' ? 'keith' : 'stag'; e.x = P.X0 + 10; e.y = P.CY + (rng() - .5) * 120; e.vx = 62; e.max = 14; if (kind === 'keith') { e.max = 16; e.vx = 48; } }
    else if (kind === 'flicker') { this.flicker = 3.2; e.max = 3.2; e.kind = 'fxflag'; }
    else { e.kind = 'fxflag'; e.max = 7; }
    e.name = kind; this.fxEnts.push(e); this.emit('event', { name: kind });
  }
  /* ---------- the shootout ---------- */
  startShootout() {
    const P = Pitch; this.mode = 'shootout'; this.modeT = 0; this.ball.stop(); this.ball.owner = null;
    this.shoot = { kicks: [[], []], score: [0, 0], turn: 0, round: 0, phase: 'intro', t: 0, taker: null, over: false, sudden: false, order: [this.F.filter(f => f.side === 0 && !f.isGK && !f.sentOff), this.F.filter(f => f.side === 1 && !f.isGK && !f.sentOff)] };
    for (const f of this.F) { f.celebrate = 0; f.state = 'run'; f.stateT = 0; f.z = 0; f.vx = f.vy = 0; f.charging = false; if (!f.sentOff && !f.isGK) { f.x = P.CX + (f.side === 0 ? -30 : 30) + (f.slot % 3) * 6 * (f.side ? 1 : -1); f.y = P.CY - 50 + f.slot * 24; f.facing = f.side === 0 ? 0 : Math.PI; } }
    this.emit('shootoutStart', {});
  }
  shootoutStep(dt) {
    const S = this.shoot, P = Pitch, ball = this.ball; S.t += dt;
    for (const f of this.F) if (f !== S.taker) { if (f.isGK) { if (f.state === 'keeperDive') { f.step(dt, null); } else f.step(dt, null); } else f.step(dt, null); }
    if (S.phase === 'intro') { if (S.t > 1.8) this.nextPenalty(); return; }
    if (S.phase === 'ready') {
      // the taker's controls: a human, or the CPU after a pause
      this.assignHumans(dt); const t = S.taker;
      for (const f of this.F) if (f === t) { const intent = this.intentFor(f); if (((f.human === null && S.t > 1.8 + this.rng() * .3) || S.t > 12) && !S.aiGo) { S.aiGo = true; } f.step(dt, S.aiGo ? EF.AI.penaltyIntent(this, f) : (f.human !== null ? intent : null)); }
      if (ball.owner) this.followBall(); else this.followBall();
      if (!ball.owner) { S.phase = 'flight'; S.t = 0; this.penaltyLive = true; this.slow = 1; }
      return;
    }
    if (S.phase === 'flight') {
      const evs = ball.step(dt, this); for (const [t, d] of evs) this.emit(t, Object.assign({ x: ball.x, y: ball.y }, d));
      for (const f of this.F) if (f.isGK) f.keeperContact(); if (this.duel) this.duelStep(dt);
      let res = null; const gx = P.goalX(S.turn);
      if (!ball.owner) {
        if ((S.turn === 0 ? ball.x > P.X1 + 2 : ball.x < P.X0 - 2)) res = Math.abs(ball.y - P.CY) < P.GH - 1 && ball.z < P.BAR ? 'goal' : 'miss';
        else if (ball.y < P.Y0 - 8 || ball.y > P.Y1 + 8 || ball.speed() < 6 && S.t > .6 || S.t > 4) res = Math.abs(ball.x - gx) < 40 && S.t > 1 ? 'saved' : 'miss';
        if ((S.turn === 0 ? ball.x < P.X1 - 90 : ball.x > P.X0 + 90) && ball.speed() > 20 && S.t > .5 && ball.last && ball.last.isGK) res = 'saved';
      } else if (ball.owner && ball.owner.isGK) res = 'saved';
      if (res) { S.phase = 'result'; S.t = 0; S.res = res; this.penaltyLive = false; this.slow = 1; this.emit('shootoutKick', { side: S.turn, result: res, who: S.taker.id }); S.kicks[S.turn].push(res === 'goal'); if (res === 'goal') { S.score[S.turn]++; this.emit('goalShoot', { side: S.turn }); } else if (res === 'saved') this.emit('save', { side: 1 - S.turn, who: 0, shootout: true }); }
      return;
    }
    if (S.phase === 'result') {
      this.followBall(); if (S.t > 1.8) {
        const a = S.kicks[0].length, b = S.kicks[1].length, sa = S.score[0], sb = S.score[1];
        // decided? (best of five, then sudden death)
        const left = [Math.max(0, 5 - a), Math.max(0, 5 - b)]; let done = false;
        if (a <= 5 || b <= 5) { if (sa > sb + left[1] || sb > sa + left[0]) done = true; if (a >= 5 && b >= 5 && sa !== sb) done = true; }
        else if (a === b && sa !== sb) done = true;
        if (a >= 5 && b >= 5 && a === b && sa !== sb) done = true;
        if (done) { S.over = true; this.mode = 'fulltime'; this.modeT = 0; this.ball.stop(); this.emit('shootoutEnd', { score: S.score.slice() }); for (const f of this.F) f.celebrate = this.winner() === f.side ? 99 : 0; return; }
        S.turn = 1 - S.turn; this.nextPenalty();
      }
    }
  }
  nextPenalty() {
    const S = this.shoot, P = Pitch, side = S.turn, k = S.kicks[side].length; const order = S.order[side];
    const taker = order[k % order.length]; S.taker = taker; S.phase = 'ready'; S.t = 0; S.aiGo = false; S.res = null;
    const dirIn = side === 0 ? 1 : -1, ball = this.ball; ball.stop(); ball.x = side === 0 ? P.X1 - P.SPOT : P.X0 + P.SPOT; ball.y = P.CY; ball.z = 0;
    taker.x = ball.x - dirIn * 9; taker.y = P.CY; taker.facing = dirIn > 0 ? 0 : Math.PI; taker.vx = taker.vy = 0; taker.state = 'run'; taker.cool = 0; ball.owner = taker; ball.last = taker;
    const gk = this.F.find(f => f.side === 1 - side && f.isGK && !f.sentOff); gk.x = Pitch.goalX(side) - dirIn * 4; gk.y = P.CY; gk.state = 'run'; gk.vx = gk.vy = 0; gk.z = 0; gk.k.outcome = null; gk.facing = dirIn > 0 ? Math.PI : 0; gk.k.shotId = -1; gk.tilt = 0;
    this.sp = { type: 'penalty', side, x: ball.x, y: ball.y, t: 0, taker, wait: 9, shootout: true }; this.mode = 'shootout'; this.whistle(); this.emit('penaltyReady', { side, taker: taker.id });
    // humans: the taker's side, plus the keeper's side (keepers dive by stick: simplified to AI + duel)
    this.shootoutHuman = s => s === side ? taker : null; this.mode2 = 'penaltyHuman';
    for (const h of this.humans) h.f = h.side === side ? taker : h.f;
  }
  spStep(dt) {
    const sp = this.sp; if (!sp) { this.mode = 'play'; return; } sp.t += dt; const t = sp.taker, ball = this.ball;
    if (!t || t.sentOff) { this.mode = 'play'; this.sp = null; return; }
    // the taker is held at the ball while he waits
    t.vx = approach(t.vx, 0, 900 * dt); t.vy = approach(t.vy, 0, 900 * dt); ball.owner = t; this.followBall();
    for (const f of this.F) if (f !== t) { const intent = this.intentFor(f); if (f.human !== null) f.step(dt, intent); else if (!f.sentOff) { const s = EF.AI.setPieceSpot(this, f, sp), dx = s[0] - f.x, dy = s[1] - f.y, d = Math.hypot(dx, dy); if (d > 2) { f.x += dx / d * Math.min(d, 90 * dt); f.y += dy / d * Math.min(d, 90 * dt); f.facing = Math.atan2(dy, dx); f.vx = dx / d * 60; f.vy = dy / d * 60; } else { f.vx = f.vy = 0; } f.step(dt, null); } }
    if (t.isGK) { if (sp.t > sp.wait) { t.k.holdT = 0; t.state = 'run'; t.distribute(); this.afterTake(); } return; }
    const humanTaker = t.human !== null;
    if (t.state !== 'run') { t.step(dt, null); ball.owner = t; this.followBall(); return; }
    const intent = humanTaker ? this.intentFor(t) : (sp.t > sp.wait ? EF.AI.setPieceIntent(this, t, sp) : null);
    if (intent) { t.step(dt, intent); if (!ball.owner || ball.owner !== t) this.afterTake(); } else t.step(dt, null);
    if (ball.owner === t && sp.t > sp.wait + (humanTaker ? 25 : 5)) { t.state = 'run'; t.cool = 0; t.charging = false; const i2 = EF.Intent(); i2.move = [Math.cos(t.facing), Math.sin(t.facing)]; if (humanTaker || sp.type === 'penalty') t.doShot(i2, .6); else t.doPass(i2, false); if (ball.owner !== t) this.afterTake(); }
  }
  afterTake() {
    const sp = this.sp; if (!sp) return; const ball = this.ball; this.mode = 'play'; this.modeT = 0;
    if (sp.type === 'freekick') { ball.fk = sp.side; ball.fkT = 0; } if (sp.type === 'penalty') this.penaltyLive = true;
    this.kickHold = 0; this.restartSide = sp.side; this.sp = null; this.emit('setPieceTaken', { type: sp.type, side: sp.side });
  }
};

