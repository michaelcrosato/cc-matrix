/* 16-referee: the referee on the pitch (he follows play, the ball can knock him over), foul judgement by severity,
 * advantage, cards (a second yellow is a red), sending off, theatrics judgement and the VAR check. */
function refStep(m, dt) {
  let o = m.official;
  if (!o) {
    o = m.official = { body: new E.Body({ x: P.CX - 40, y: P.CY + 60, r: 4, friction: 0, gravity: 700 }), facing: -PI / 2, sig: null, sigT: 0, downT: 0 };
  }
  const b = o.body, ball = m.ball;
  o.sigT = Math.max(0, o.sigT - dt); if (o.sigT <= 0) o.sig = null;
  if (o.downT > 0) { o.downT -= dt; b.vx = approach(b.vx, 0, 300 * dt); b.vy = approach(b.vy, 0, 300 * dt); b.update(dt, m.map); return; }
  let tx, ty;
  if (m.mode === 'var') { tx = P.CX; ty = P.Y1 - 10; }
  else if (m.foulSpot && m.mode === 'dead') { tx = m.foulSpot.x - 20; ty = m.foulSpot.y + 16; }
  else {
    const s = m.owner ? m.dir(m.owner.side) : (m.last ? m.dir(m.last.side) : 1);
    tx = ball.x - s * 50; ty = ball.y + (ball.y < P.CY ? 60 : -60);
  }
  [tx, ty] = P.clampField(tx, ty, 10);
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy), sp = Math.min(105, d * 3);
  b.vx = approach(b.vx, d > 2 ? dx / d * sp : 0, 500 * dt); b.vy = approach(b.vy, d > 2 ? dy / d * sp : 0, 500 * dt);
  o.facing = E.approachAng(o.facing, Math.atan2(ball.y - b.y, ball.x - b.x), dt * 6);
  b.update(dt, m.map);
  // the ball hits him: he goes over
  if (!m.owner && m.mode === 'play' && !ball.superPath && ball.z < 22 && hyp(ball.x - b.x, ball.y - b.y) < 6 && hyp(ball.vx, ball.vy) > 110) {
    o.downT = 1.3; ball.vx *= -.4; ball.vy *= -.4; ball.vz = 30; ball.onGround = false; m.emit('refHit', { x: b.x, y: b.y });
  }
}
function refSignal(m, sig, t = 1.4) { if (!m.official) refStep(m, 0); m.official.sig = sig; m.official.sigT = t; }
/** contact between a tackler and a victim: a foul when it is hard enough for this referee */
Match.prototype.contact = function (tackler, victim, o) {
  const m = this; victim.contactT = m.t;
  if (m.mode !== 'play' || m.o.training && !m.o.training.fouls) return;
  const behind = o.behind != null ? o.behind : Math.abs(E.angDiff(victim.facing, angTo(victim.body, tackler.body))) > 2.1;
  const late = m.owner !== victim && dist(m.ball, victim.body) > 30;
  const sev = (o.closing || 120) / 220 * (behind ? 1.5 : 1) * (late ? 1.4 : 1) * (o.kind === 'slide' ? 1.2 : 1);
  const strict = (m.ref ? m.ref.strictness : 1) * EF.T.foulStrictness * (m.buff.strict || 1) * (game.settings.cards === 'strict' ? 1.3 : 1);
  const k = sev * strict;
  m.emit('contact', { who: tackler.id, victim: victim.id, k, kind: o.kind });
  if (k <= .5 || m.foul) return;
  const card = game.settings.cards === 'off' || m.o.noCards ? null : k > 3.2 ? 'red' : k > 1.2 ? 'yellow' : null;
  const oppGoal = m.goalX(victim.side), inBox = P.inBox(oppGoal > P.CX ? 1 : -1, victim.body.x, victim.body.y);
  m.foul = { t: m.t, side: victim.side, x: victim.body.x, y: victim.body.y, offender: tackler, victim, k, sev, card, inBox, kind: o.kind };
  m.stats[tackler.side].fouls++;
  m.emit('foul', { who: tackler.id, victim: victim.id, side: victim.side, k, card, inBox, kind: o.kind });
};
Match.prototype.foulStep = function (dt) {
  const m = this, f = m.foul; if (!f) return;
  const el = m.t - f.t, keeps = m.owner && m.owner.side === f.side;
  if (f.inBox && el > .25) return m.whistleFoul(f);
  if (el > .8) {
    if (keeps && !f.card) { m.emit('advantage', { side: f.side }); refSignal(m, 'advantage'); m.advFoul = f; m.foul = null; return; }
    if (keeps && f.card) { m.emit('advantage', { side: f.side }); refSignal(m, 'advantage'); m.deferred.push({ f: f.offender, kind: f.card, why: 'foul' }); m.advFoul = f; m.foul = null; return; }
    return m.whistleFoul(f);
  }
  if (el > .3 && !keeps && !m.owner && hyp(m.ball.vx, m.ball.vy) < 40) return m.whistleFoul(f);
  if (el > .3 && m.owner && m.owner.side !== f.side) return m.whistleFoul(f);
};
Match.prototype.whistleFoul = function (f) {
  const m = this; m.foul = null; m.owner = null; m.shot = null;
  m.mode = 'dead'; m.modeT = 0; m.foulSpot = { x: f.x, y: f.y };
  m.emit('whistle', { kind: 'foul' }); refSignal(m, 'whistle', .8);
  const restart = () => {
    m.foulSpot = null;
    if (f.inBox) {
      m.emit('penaltyAwarded', { side: f.side, who: f.victim.id });
      refSignal(m, 'point', 1.2);
      // VAR checks every penalty
      m.mode = 'var'; m.modeT = 0; m.varCheck = { kind: 'penalty', foul: f, t: 0 }; m.emit('var', { kind: 'penalty' });
      return;
    }
    m.startSetpiece('freekick', f.side, { x: f.x, y: f.y });
  };
  m.applyDeferred();
  if (f.card) { m.dead = { t: .9, then: () => { giveCard(m, f.offender, f.card, 'foul'); m.mode = 'dead'; m.dead = { t: 1.3, then: restart }; } }; }
  else m.dead = { t: 1.0, then: restart };
};
Match.prototype.varStep = function (dt) {
  const m = this, v = m.varCheck; if (!v) { m.mode = 'play'; return; }
  v.t += dt; refSignal(m, v.t < 2 ? 'ear' : 'tv', .2);
  if (v.t < 2.6) return;
  m.varCheck = null;
  if (v.kind === 'penalty') {
    const soft = v.foul.sev < .8 || v.foul.dive;
    const over = soft && m.rng() < .5;
    m.emit('varDecision', { kind: 'penalty', overturned: over });
    if (over) m.startSetpiece('goalkick', 1 - v.foul.side, {});
    else m.startSetpiece('penalty', v.foul.side, {});
  } else if (v.kind === 'goal') {
    m.emit('varDecision', { kind: 'goal', overturned: false });
    m.kickoff(1 - v.side, false);
  }
};
function giveCard(m, f, kind, why) {
  if (!f || f.sentOff || game.settings.cards === 'off' || m.o.noCards) return;
  const second = kind === 'yellow' && f.cards >= 1;
  if (kind === 'yellow') f.cards++;
  m.stats[f.side].cards++;
  refSignal(m, 'card', 1.6);
  m.cards.push({ who: f.id, kind: second ? 'second' : kind, minute: m.minuteLabel(), why });
  m.emit('card', { who: f.id, side: f.side, kind: second ? 'red' : kind, second, why });
  m.gain(1 - f.side, 3, 'card');
  if (kind === 'red' || second) sendOff(m, f);
}
EF.giveCard = giveCard;
function sendOff(m, f) {
  f.sentOff = true; f.setState('off'); f.cards = Math.max(f.cards, 2);
  if (m.owner === f) m.owner = null;
  for (const sl of m.slots) if (sl.f === f) { sl.f = null; f.human = null; m.assignSlot(sl); }
  m.emit('sendOff', { who: f.id, side: f.side });
}
/** theatrics: contact or an opponent close and closing may win a foul; nobody near is a booking for simulation */
function judgeDive(m, f) {
  if (m.mode !== 'play') return;
  const foes = m.side[1 - f.side].filter(o => !o.sentOff && !o.gk), near = foes.map(o => ({ o, d: dist(o.body, f.body) })).sort((a, b) => a.d - b.d)[0];
  const d = near ? near.d : 99, contact = m.t - f.contactT < .5, gull = (m.ref ? m.ref.gullibility : .4) * EF.T.diveSuccess;
  if (contact || d < 8) {
    if (m.rng() < Math.max(.1, gull * (1.2 - d / 14))) {
      const oppGoal = m.goalX(f.side), inBox = P.inBox(oppGoal > P.CX ? 1 : -1, f.body.x, f.body.y);
      m.foul = { t: m.t - 1, side: f.side, x: f.body.x, y: f.body.y, offender: near.o, victim: f, k: .7, sev: .6, card: null, inBox, kind: 'dive', dive: true };
      m.gain(f.side, 5, 'dive'); m.emit('diveWon', { who: f.id, side: f.side, inBox });
      m.whistleFoul(m.foul);
    } else m.emit('diveIgnored', { who: f.id });
    return;
  }
  if (d > 14 && !contact) {
    m.owner = null; m.mode = 'dead'; m.modeT = 0; m.foulSpot = { x: f.body.x, y: f.body.y };
    m.emit('whistle', { kind: 'foul' }); m.emit('diveBooked', { who: f.id, side: f.side });
    m.euph[f.side] = Math.max(0, m.euph[f.side] - 20);
    m.dead = { t: .9, then: () => { giveCard(m, f, 'yellow', 'simulation'); m.mode = 'dead'; m.dead = { t: 1.2, then: () => { m.foulSpot = null; m.startSetpiece('freekick', 1 - f.side, { x: f.body.x, y: f.body.y }); } }; } };
    return;
  }
  m.emit('diveIgnored', { who: f.id });
}
