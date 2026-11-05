/* ---- FIGHT (7.11): the gloves drop. A challenge (hold the saucer button near a rival with a grudge), accepted or turtled;
 * then a staged scrap at ice level: jab, haymaker (telegraphed; hold for more), duck, and the jersey yank (three in four
 * seconds pull it over their head). Balance at 0 is a knockdown; the loser sits 20 s in the sin bin: a power play ---- */
const Fight = (() => {
  const MOVES = { jab: { wind: .07, active: .06, recover: .12, dmg: 6, sta: 8, anim: 'jab' }, hay: { wind: .35, active: .1, recover: .35, dmg: 18, sta: 22, anim: 'haymaker' },
    duck: { wind: 0, active: .35, recover: .05, sta: 10 }, yank: { wind: .1, active: .1, recover: .1, sta: 6, anim: 'cross' } };
  /** can a and b fight now (rules, the cap, a minute of clock since the last one)? */
  const allowed = (m, a, b) => m.rules.fights && m.phase === 'play' && m.fights < T.fightMax && (m.lastFightClock === null || Math.abs(m.lastFightClock - m.clockTotal()) >= 60 || m.cfg.fightsOften)
    && Skater.free(a) && Skater.free(b) && a.state !== 'bin' && b.state !== 'bin' && a.team !== b.team;
  function rivalFor(m, s, need = T.fightGrudge) {
    let best = null, bg = -1;
    for (const o of m.teams[1 - s.team].skaters) { const d = U.dist(o, s), gr = Math.max(Grudge.get(s, o), Grudge.get(o, s)); if (d < 40 && gr >= need && gr > bg && allowed(m, s, o)) { bg = gr; best = o; } }
    return best;
  }
  /** s challenges (it held the button near a rival) */
  function challenge(m, s, target) {
    const o = target || rivalFor(m, s); if (!o) return false;
    Bus.emit('gloves', { by: s.id, target: o.id });
    if (o.ctrl.kind === 'cpu') {
      const gr = Math.max(Grudge.get(o, s), Grudge.get(s, o));
      const p = m.cfg.forceFights ? 1 : clamp(.4 + .12 * (o.def.r[4] - 3) + gr / 200, .1, .95);
      if (RNG.sim() < p) start(m, s, o); else turtle(m, o, s);
    } else m.invite = { by: s.id, to: o.id, t: 3, hold: 0 };
    return true;
  }
  function turtle(m, decliner, challenger) { m.invite = null; Grudge.add(m, decliner, challenger, -20); Bus.emit('turtle', { by: decliner.id, challenger: challenger.id }); }
  /** each step in play: a pending invitation, and CPU enforcers looking for trouble */
  function watch(m, dt) {
    if (m.invite) {
      const iv = m.invite, to = m.byId(iv.to), by = m.byId(iv.by); iv.t -= dt;
      if (!to || !by || !allowed(m, by, to) && m.phase !== 'play') { m.invite = null; return; }
      if (to.intent.held.lob) { iv.hold += dt; if (iv.hold >= .5) { m.invite = null; start(m, by, to); return; } } else iv.hold = 0;
      if (iv.t <= 0) turtle(m, to, by);
      return;
    }
    if (m.phase !== 'play' || !m.rules.fights) return;
    m.fightLook = (m.fightLook || 0) - dt; if (m.fightLook > 0) return; m.fightLook = .5;
    for (const s of m.skaters) {
      if (s.ctrl.kind !== 'cpu' || !Skater.free(s)) continue;
      const need = m.cfg.fightsOften ? 40 : s.def.r[4] >= 4 ? 38 : 60; if (s.def.r[4] < 3 && !m.cfg.fightsOften) continue;
      const o = rivalFor(m, s, need); if (!o) continue;
      if (o.ctrl.kind !== 'cpu') { m.invite = { by: s.id, to: o.id, t: 3, hold: 0 }; Bus.emit('gloves', { by: s.id, target: o.id }); return; }
      if (RNG.sim() < (m.cfg.fightsOften ? .5 : .3)) { challenge(m, s, o); return; }
    }
  }
  const fighter = (m, s) => ({ id: s.id, bal: T.fightBalance, sta: 100, act: null, t: 0, ph: null, hold: 0, yanks: [], hood: 0, openT: 0, guardBreak: 0, duckCD: 0, think: .4, flinch: 0, pose: null, attack: null });
  function start(m, a, b) {
    m.fights++; m.lastFightClock = m.clockTotal(); m.invite = null;
    const mx = (a.x + b.x) / 2, my = clamp((a.y + b.y) / 2, Rink.Y0 + 60, Rink.Y1 - 60), mxc = clamp(mx, Rink.X0 + 110, Rink.X1 - 110);
    for (const s of [a, b]) { if (m.puck.owner === s) Puck.loose(m, m.puck); Skater.setState(s, 'fight', 99); s.vx = s.vy = 0; }
    a.x = mxc - 11; a.y = my; b.x = mxc + 11; b.y = my; a.facing = 0; b.facing = PI;
    a.fight = fighter(m, a); b.fight = fighter(m, b);
    m.fight = { a: a.id, b: b.id, x: mxc, y: my, t: 0, over: 0, winner: -1, gear: [] };
    for (const s of [a, b]) for (const k of [0, 1, 2]) m.fight.gear.push({ kind: k === 2 ? 'helmet' : 'glove', x: s.x + (RNG.fx() - .5) * 20, y: s.y + (RNG.fx() - .5) * 16, color: k === 2 ? s.helmetColor : s.rig.C.glove, rot: RNG.fx() * TAU });
    const pk = m.puck; Puck.loose(m, pk); pk.vx = pk.vy = 0;
    m.setPhase('fight');
    Bus.emit('fight_start', { a: a.id, b: b.id, x: mxc, y: my });
  }
  function input(m, s) {
    if (s.ctrl.kind === 'cpu') return null;
    const it = s.intent; return { jab: it.press.pass, hay: it.press.shoot, hayHeld: it.held.shoot, duck: it.press.deke, yank: it.press.lob };
  }
  function ai(m, s, f, o, of, dt) {
    f.think -= dt; const skill = m.aiSkill(s.team), c = { jab: false, hay: false, hayHeld: f.act === 'hay' && f.ph === 'wind' && f.t < .5 * skill, duck: false, yank: false };
    if (of.act === 'hay' && of.ph === 'wind' && !f.act && !f.dodgeTried) { f.dodgeTried = true; if (RNG.sim() < skill * .85) { c.duck = true; return c; } }
    if (of.act !== 'hay') f.dodgeTried = false;
    if (f.think > 0 || f.act) return c;
    f.think = lerp(.7, .3, skill) * (.7 + RNG.sim() * .6);
    const fgt = s.def.r[4], r = RNG.sim();
    if (of.openT > 0 || of.guardBreak > 0) c.hay = true;
    else if (r < .5 - fgt * .04) c.jab = true; else if (r < .78) c.hay = true; else c.yank = true;
    return c;
  }
  function begin(f, act) { const M = MOVES[act]; if (!M || f.act) return false; if (act === 'duck' && f.duckCD > 0) return false; f.act = act; f.t = 0; f.ph = M.wind ? 'wind' : 'active'; f.hold = 0; f.sta = Math.max(0, f.sta - M.sta); f.landed = false; return true; }
  function step(m, dt) {
    const F = m.fight; if (!F) return;
    const a = m.byId(F.a), b = m.byId(F.b); F.t += dt;
    if (F.over > 0) { F.over -= dt; for (const s of [a, b]) poseOf(s, s.fight, s === m.byId(F.winner)); if (F.over <= 0) finish(m); return; }
    for (const [s, o] of [[a, b], [b, a]]) {
      const f = s.fight, of = o.fight;
      f.openT = Math.max(0, f.openT - dt); f.guardBreak = Math.max(0, f.guardBreak - dt); f.hood = Math.max(0, f.hood - dt); f.duckCD = Math.max(0, f.duckCD - dt); f.flinch = Math.max(0, f.flinch - dt);
      f.sta = Math.min(100, f.sta + 25 * dt * (f.act ? .3 : 1));
      const c = input(m, s) || ai(m, s, f, o, of, dt);
      if (!f.act && f.flinch <= 0) { if (c.duck) begin(f, 'duck'); else if (c.hay) begin(f, 'hay'); else if (c.jab) begin(f, 'jab'); else if (c.yank) begin(f, 'yank'); if (f.act) Bus.emit('fight_move', { by: s.id, move: f.act }); }
      if (f.act) {
        const M = MOVES[f.act], slow = f.sta <= 1 ? .6 : 1; f.t += dt * slow;
        if (f.ph === 'wind') { if (f.act === 'hay' && c.hayHeld && f.hold < .6 - M.wind) { f.hold += dt; f.t = Math.min(f.t, M.wind - .001); } if (f.t >= M.wind) { f.ph = 'active'; f.t = 0; } }
        else if (f.ph === 'active') { if (!f.landed && f.act !== 'duck') { f.landed = true; strike(m, s, f, o, of); } if (f.t >= M.active) { f.ph = 'recover'; f.t = 0; if (f.act === 'duck') f.duckCD = .4; } }
        else if (f.ph === 'recover' && f.t >= M.recover) { f.act = null; f.ph = null; }
      }
      poseOf(s, f, false);
      // they circle a little, gripping each other
      const k = Math.sin(F.t * 1.3) * 3; s.x = F.x + (s === a ? -11 : 11) * Math.cos(F.t * .25) + k * .2; s.y = F.y + (s === a ? -1 : 1) * Math.sin(F.t * .25) * 6;
      s.facing = U.angTo(s, o);
      if (f.bal <= 0 && F.over <= 0) { end(m, o, s); return; }
    }
    // everyone else circles at 50, watching
    m.skaters.forEach((s, i) => { if (s === a || s === b || s.state === 'bin' || s.offIce) return; const an = i * 1.05 + F.t * .25, tx = F.x + Math.cos(an) * 52, ty = F.y + Math.sin(an) * 40; s.x += (tx - s.x) * Math.min(1, dt * 2); s.y += (ty - s.y) * Math.min(1, dt * 2); s.vx = s.vy = 0; s.facing = U.angTo(s, F); });
    // the linesmen break it up after 20 s: a draw
    if (F.t > 20) end(m, null, null);
  }
  function strike(m, s, f, o, of) {
    const M = MOVES[f.act], dmgK = RATE.fight(s.def);
    if (f.act === 'yank') {
      if (of.act === 'duck' && of.ph === 'active') return;
      of.guardBreak = .6; of.sta = Math.max(0, of.sta - 15); f.yanks = f.yanks.filter(t => m.t - t < 4); f.yanks.push(m.t);
      if (f.yanks.length >= 3) { of.hood = 1.5; f.yanks = []; Bus.emit('fight_hood', { by: s.id, victim: o.id }); }
      Bus.emit('fight_hit', { by: s.id, kind: 'yank', dmg: 0 }); return;
    }
    const ducking = of.act === 'duck' && of.ph === 'active';
    if (f.act === 'hay' && ducking) { f.openT = .5; Bus.emit('fight_whiff', { by: s.id }); return; }
    let dmg = M.dmg * dmgK + (f.act === 'hay' ? Math.min(6, f.hold * 10) : 0);
    if (f.act === 'jab' && ducking) dmg *= .5;
    if (f.act === 'jab' && !of.act && of.guardBreak <= 0 && of.hood <= 0) dmg *= .6;
    if (of.openT > 0) dmg *= 1.5; if (of.hood > 0) dmg *= 1.3;
    of.bal -= dmg; of.flinch = f.act === 'jab' ? .12 : .3; if (of.act && of.act !== 'duck' && f.act === 'hay') { of.act = null; of.ph = null; }
    Bus.emit('fight_hit', { by: s.id, victim: o.id, kind: f.act, dmg: Math.round(dmg), x: o.x, y: o.y, big: f.act === 'hay' });
  }
  function poseOf(s, f, won) {
    if (!f) return;
    f.pose = won ? 'cheer' : f.act === 'duck' ? 'crouch' : null;
    f.grip = !f.act || f.act === 'yank';
    if (f.act && MOVES[f.act].anim) { const M = MOVES[f.act], tot = M.wind + M.active + M.recover, u = f.ph === 'wind' ? f.t : f.ph === 'active' ? M.wind + f.t : M.wind + M.active + f.t; f.attack = E.move(f.act === 'hay' && s.altHook ? 'hook' : M.anim, clamp(u / tot, 0, 1)); }
    else f.attack = null;
  }
  function end(m, winner, loser) {
    const F = m.fight; if (F.over > 0) return;
    F.over = 2.2; F.winner = winner ? winner.id : -1;
    if (winner) { Skater.setState(loser, 'down', 3); loser.fight = null; winner.stats.fightsWon++; loser.stats.fightsLost = (loser.stats.fightsLost || 0) + 1; Match.hoserCheck(winner); }
    Bus.emit('fight_end', { winner: winner ? winner.id : -1, loser: loser ? loser.id : -1, draw: !winner });
  }
  function finish(m) {
    const F = m.fight, a = m.byId(F.a), b = m.byId(F.b), loser = F.winner === F.a ? b : F.winner === F.b ? a : null;
    for (const s of [a, b]) { s.fight = null; if (s.state === 'fight' || s.state === 'down') Skater.setState(s, 'skate'); }
    if (loser) SinBin.send(m, loser);
    m.fight = null;
    m.stoppage('fight', Rink.nearestDot(F.x, F.y));
  }
  return { challenge, watch, start, step, end, rivalFor, allowed, MOVES };
})();

/* ---- SIN BIN: the fight's loser sits T.sinBin seconds of play clock in the box; the other team has a power play ---- */
const SinBin = {
  seat: team => [Rink.C.x + (team === 0 ? -36 : 36), Rink.Y0 - 12],
  send(m, s) { if (m.puck.owner === s) Puck.loose(m, m.puck); s.binT = T.sinBin; Skater.setState(s, 'bin', 1e9); const [x, y] = SinBin.seat(s.team); s.x = x; s.y = y; s.vx = s.vy = 0; s.facing = PI / 2; s.stats.pim = (s.stats.pim || 0) + 5; Bus.emit('sin_bin', { who: s.id, team: s.team, t: T.sinBin }); },
  step(m, dt) {
    for (const s of m.skaters) if (s.state === 'bin') {
      const [x, y] = SinBin.seat(s.team); s.x = x; s.y = y; s.facing = PI / 2;
      if (m.phase === 'play') s.binT -= dt;
      if (s.binT <= 0) { Skater.setState(s, 'skate'); s.x = x; s.y = Rink.Y0 + 14; s.vy = 60; Bus.emit('sin_bin_end', { who: s.id, team: s.team }); }
    }
  },
  /** the team with a skater in the box, or -1 */
  short(m) { const s = m.skaters.find(q => q.state === 'bin'); return s ? s.team : -1; }
};
