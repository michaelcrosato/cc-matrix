/* THE REFEREE (section 6.10): a character on the pitch with a personality (strictness, gullibility, VAR-happiness). He
 * judges contact (fouls, cards, advantage), theatrics, and runs VAR; the ball can knock him over. */
class Referee {
  constructor(m, data) {
    this.m = m; this.data = data || EF.get('referee', 'haltwhistle');
    this.body = new E.Body({ x: P.CX, y: P.CY + 80, r: 5, friction: 0, gravity: 700 }); this.facing = -Math.PI / 2;
    this.state = 'run'; this.stT = 0; this.signal = null; this.signalT = 0; this.downT = 0; this.stride = 0;
    this.look = { pose: null, expr: null, down: 0, point: false, signal: null, tilt: null, clip: null };
  }
  get strict() { const s = game.settings.cards; return this.data.strictness * EF.T.foulStrictness * (s === 'strict' ? 1.3 : 1) * (this.m.buffs.some(b => b.hairdryer) && this.m.minute < 90 ? 1.2 : 1); }
  sign(kind, t = 1.2) { this.signal = kind; this.signalT = t; }
  update(dt) {
    const m = this.m, B = this.body, b = m.ball; this.stT += dt;
    if (this.signalT > 0) { this.signalT -= dt; if (this.signalT <= 0) this.signal = null; }
    if (this.state === 'down') { B.vx = approach(B.vx, 0, 400 * dt); B.vy = approach(B.vy, 0, 400 * dt); this.downT -= dt; if (this.downT <= 0) { this.state = 'run'; this.look.clip = null; } }
    else {
      // follow play 60-90 from the ball, off the line between the ball and either goal (the passing lanes)
      let tx, ty;
      if (m.mode === 'card' && this.cardFor) { tx = this.cardFor.body.x + 14; ty = this.cardFor.body.y + 6; }
      else if (m.setpiece && m.setpiece.pen) { tx = m.setpiece.pen.spot.x - m.setpiece.pen.dir * 30; ty = P.CY + 70; }
      else if (m.shootout) { tx = P.X1 - 120; ty = P.CY + 90; }
      else { const side = b.y > P.CY ? -1 : 1; tx = b.x - m.dir(m.owner ? m.owner.side : 0) * 40; ty = b.y + side * 70; }
      tx = clamp(tx, P.X0 + 20, P.X1 - 20); ty = clamp(ty, P.Y0 + 14, P.Y1 - 14);
      const d = H.d2(tx, ty, B.x, B.y), sp = d > 60 ? 95 : d > 12 ? 60 : 0;
      B.vx = approach(B.vx, d > 1 ? (tx - B.x) / d * sp : 0, 400 * dt); B.vy = approach(B.vy, d > 1 ? (ty - B.y) / d * sp : 0, 400 * dt);
      const look = m.mode === 'card' && this.cardFor ? this.cardFor.body : b; this.facing = E.approachAng(this.facing, Math.atan2(look.y - B.y, look.x - B.x), dt * 6);
      // the ball hits him: over he goes, comically
      if (!m.owner && !b.superPath && b.speed() > 90 && b.z < 22 && H.d(B, b) < 6 && m.mode === 'play' && this.stT > 1) {
        this.state = 'down'; this.downT = 1.3; this.stT = 0; this.look.clip = { name: 'Fall_On_Face', t: 0, w: 1 };
        b.vx *= -.4; b.vy *= -.4; m.emit('refHit', { x: B.x, y: B.y });
      }
    }
    B.update(dt, m.pitch.map); this.stride += dt * Math.hypot(B.vx, B.vy) / 7;
    const L = this.look; L.down = this.state === 'down' && !L.clip ? 1 : 0; L.signal = this.signal;
    L.pose = this.signal === 'card' ? 'cheer' : this.signal === 'advantage' ? 'cast' : this.signal === 'ear' ? null : null;
    L.point = this.signal === 'point' || this.signal === 'whistle';
    L.expr = this.signal === 'card' ? 'angry' : this.state === 'down' ? 'wince' : null;
  }
  /** contact on a tackle, slide, barge or collision: a foul? a card? (section 6.10) */
  judge(by, victim, info) {
    const m = this.m; if (m.mode !== 'play' && !(m.mode === 'setpiece' && m.setpiece && m.setpiece.taken)) return;
    if (by.side === victim.side) return;
    const fromBehind = info.fromBehind !== undefined ? info.fromBehind : Math.abs(E.angDiff(H.ang(victim.body, by.body), victim.facing)) > 2.1;
    const late = !!info.late, sev = (info.speed || 100) / 175 * (fromBehind ? 1.5 : 1) * (late ? 1.4 : 1) * (info.kind === 'slide' ? 1.2 : 1) * (info.mul || 1);
    const k = sev * this.strict;
    if (k <= .5) { m.emit('fairChallenge', { who: by, victim }); return; }
    m.foul(by, victim, k, { sev, kind: info.kind, fromBehind, late });
  }
  /** theatrics: contact or a close opponent, and he may buy it; nobody near, and it's a booking */
  judgeDive(diver) {
    const m = this.m; if (m.mode !== 'play') return;
    const opp = m.active(1 - diver.side).filter(o => o.role !== 'GK' || H.d(o.body, diver.body) < 14), B = diver.body;
    let near = null, nd = 99; for (const o of opp) { const d = H.d(o.body, B); if (d < nd) { nd = d; near = o; } }
    const contact = diver.contactT > m.t - .5 && diver.contactBy, closing = near && nd < 8 && ((near.body.vx - B.vx) * (B.x - near.body.x) + (near.body.vy - B.vy) * (B.y - near.body.y)) > 0;
    if (contact || closing) {
      const p = Math.max(.1, this.data.gullibility * EF.T.diveSuccess * (1.2 - nd / 14));
      if (m.rng() < p) { m.addEuphoria(diver.side, 5, 'diveWon'); m.emit('diveWon', { who: diver, by: contact ? diver.contactBy : near }); m.foul(contact ? diver.contactBy : near, diver, .62, { sev: .5, kind: 'dive', dive: true }); }
      else m.emit('diveIgnored', { who: diver });
    } else if (nd > 14) {
      m.addEuphoria(diver.side, -20, 'diveBooked'); m.emit('diveBooked', { who: diver }); m.note('SIMULATION!', { sub: diver.data.name, dur: 1.8 });
      if (game.settings.cards !== 'off') m.queueCard(diver, 'yellow', 'simulation');
      m.lastFoul = null; m.restart('freekick', 1 - diver.side, { x: B.x, y: B.y });
    } else m.emit('diveIgnored', { who: diver });
  }
}
EF.Referee = Referee;
Object.assign(Match.prototype, {
  /** a foul: the free kick or penalty, the card, advantage when the fouled side keeps the ball */
  foul(by, victim, k, info) {
    const gxDef = this.ownGoalX(by.side), x = victim.body.x, y = victim.body.y, box = P.inBoxAt(gxDef, x, y);
    const cardsOff = game.settings.cards === 'off';
    let card = null;
    if (!cardsOff && !info.dive) { if (k > 2.6) card = 'red'; else if (k > 1.35) card = 'yellow'; }
    if (card === 'red' && (by.role === 'GK' || this.outfield(by.side).length <= 2)) card = 'yellow';
    this.lastFoul = { t: this.t, by: by.side, sev: info.sev, punished: false, x, y, victim, tackler: by, card };
    this.stats.fouls[by.side]++; by.rating -= .3;
    this.emit('foul', { who: by, victim, k, card, box, kind: info.kind });
    const keeps = this.owner && this.owner.side === victim.side && this.owner !== victim;
    if (!box && keeps && !info.dive) { this.advantage = { t: .8, foul: this.lastFoul, by, card, side: victim.side }; return; }
    this.lastFoul.punished = true;
    if (card) this.queueCard(by, card, info.kind);
    this.ref.sign(box ? 'point' : 'whistle', 1.4);
    if (box) { this.note('PENALTY!', { dur: 1.6 }); return this.restart('penalty', victim.side, { x, y, foul: this.lastFoul, taker: null }); }
    this.restart('freekick', victim.side, { x, y, foul: this.lastFoul });
  },
  advantageStep(dt) {
    const A = this.advantage; if (!A) return;
    A.t -= dt;
    const lost = this.owner && this.owner.side !== A.side;
    if (lost) { this.advantage = null; A.foul.punished = true; if (A.card) this.queueCard(A.by, A.card, 'foul'); return this.restart('freekick', A.side, { x: A.foul.x, y: A.foul.y, foul: A.foul }); }
    if (A.t <= 0) {
      this.advantage = null; A.foul.punished = true; this.ref.sign('advantage', 1.2);
      this.note('ADVANTAGE!', { dur: 1.3, big: false }); this.emit('advantage', { side: A.side, card: A.card });
      if (A.card) this.queueCard(A.by, A.card, 'later');
    }
  },
  queueCard(who, color, why) { (this.pendingCards || (this.pendingCards = [])).push({ who, color, why }); },
  /* ---- cards: shown at the next stoppage (section 6.10) ---- */
  startCard() {
    const c = this.pendingCards.shift(); if (!c || c.who.sentOff) return this.pendingCards.length ? this.startCard() : this.continueRestart();
    this.cardNow = c; this.ref.cardFor = c.who; this.setMode('card'); this.setOwner(null);
    for (const f of this.players) f.order = null;
  },
  cardStep(dt) {
    const c = this.cardNow; this.stopT += dt; if (!c) return this.continueRestart();
    if (this.modeT > .5 && !c.shown) {
      c.shown = true; this.ref.sign('card', 1.6); c.who.cards++;
      let color = c.color; if (color === 'yellow' && c.who.cards >= 2) color = 'second';
      c.final = color; this.stats.cards[c.who.side]++;
      this.emit('card', { who: c.who, color: color === 'second' ? 'red' : color, second: color === 'second', why: c.why });
      this.note(color === 'yellow' ? 'YELLOW CARD' : 'RED CARD', { sub: c.who.data.name + (color === 'second' ? ' - SECOND YELLOW' : ''), dur: 1.8, color: color === 'yellow' ? '#ffe040' : '#ff3a3a' });
      c.who.pose = null; c.who.clip = { name: color === 'yellow' ? 'Shrug' : 'Angry', t: 0, w: 1, mask: 'upper' };
    }
    if (this.modeT > 2.2) {
      if ((c.final === 'red' || c.final === 'second') && (this.outfield(c.who.side).length > 2 || c.who.role === 'GK')) this.sendOff(c.who);
      c.who.clip = null; this.cardNow = null; this.ref.cardFor = null;
      if (this.pendingCards.length) return this.startCard();
      this.continueRestart();
    }
  },
  sendOff(f) {
    if (f.sentOff) return;
    f.sentOff = true; f.state = 'off'; if (this.owner === f) this.setOwner(null);
    const F = this.formation[f.side], drop = F.drop;
    if (f.slot !== drop) { const d = this.side[f.side].find(q => q.slot === drop && !q.sentOff); if (d) d.slot = f.slot; }
    if (f.human) { const h = f.human; f.human = null; h.fb = null; this.pickFor(h); }
    this.emit('sendOff', { who: f });
  },
  /* ---- VAR (section 6.10): 2.5 s, the referee's hand to his ear, then the decision ---- */
  startVar(v) {
    this.var = Object.assign({ t: 0, decided: false }, v); this.setMode('var'); this.setOwner(null);
    this.ref.sign('ear', 2.4); this.emit('var', { kind: v.kind }); this.note('VAR CHECK', { sub: v.kind === 'goal' ? 'CHECKING THE GOAL' : 'CHECKING THE PENALTY', dur: 2.4, big: false });
  },
  varStep(dt) {
    const V = this.var; this.stopT += dt; if (!V) return this.setMode('play');
    if (this.modeT > 2.5 && !V.decided) {
      V.decided = true;
      const sev = V.foul ? V.foul.sev : 1;
      if (V.kind === 'penalty') {
        V.overturn = this.forceVar ? this.forceVar === 'overturn' : sev < .8 && this.rng() < .5;
        this.ref.sign(V.overturn ? 'var' : 'point', 1.4);
        this.note(V.overturn ? 'NO PENALTY' : 'PENALTY STANDS', { dur: 1.6 });
      } else {
        V.overturn = sev > .6 && this.rng() < .5;
        this.ref.sign(V.overturn ? 'var' : 'whistle', 1.4);
        this.note(V.overturn ? 'NO GOAL' : 'GOAL STANDS', { sub: V.overturn ? 'FOUL IN THE BUILD-UP' : null, dur: 1.6 });
      }
      this.emit('varDecision', { kind: V.kind, overturned: V.overturn });
    }
    if (this.modeT > 4.1) {
      this.var = null;
      if (V.kind === 'penalty') { if (V.overturn) return this.startSetpiece('freekick', 1 - V.side, { x: V.foul ? V.foul.x : P.CX, y: V.foul ? V.foul.y : P.CY }); return this.startSetpiece('penalty', V.side, { taker: null }); }
      if (V.overturn) { const g = V.goal; this.score[g.side]--; this.goals.pop(); if (g.who) g.who.goalsN--; if (g.who && g.who.human) g.who.human.stats.Goals--; this.goldenWin = false; this.lastGoal = null; return this.startSetpiece('freekick', 1 - g.side, { x: V.foul.x, y: V.foul.y }); }
      if (this.wantReplay()) { this.setMode('replay'); this.emit('replayStart', { goal: this.lastGoal }); if (!this.replayHook) this.endReplay(); return; }
      this.resumeAfterGoal();
    }
  }
});
