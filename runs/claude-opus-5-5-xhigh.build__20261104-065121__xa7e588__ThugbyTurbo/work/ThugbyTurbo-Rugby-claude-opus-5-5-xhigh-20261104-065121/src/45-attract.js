/* ---- THE ATTRACT MODE: 10 s idle on the title or a menu starts a CPU v CPU match with cheats on; a director walks a
 * showcase of every system (the same force() calls as the dev panel), then the records, then the title. Any input exits:
 * a key, a button, the mouse moved, a stick, a tap ---- */
const ATTRACT_TEAMS = [['mud', 'gul', 'docks'], ['irn', 'mud', 'furnace'], ['mud', 'meg', 'megadome'], ['gul', 'bad', 'muddington']];
TT.attractData = loop => { const [h, a, v] = ATTRACT_TEAMS[loop % ATTRACT_TEAMS.length]; return { home: h, away: a, venue: v, attract: true, seed: 900 + loop * 17, loop }; };
const Attract = TT.Attract = {
  loop: 0, m: null, i: 0, t: 0, stepT: 0, steps: null, fired: {}, log: [], recT: 0, active: false,
  begin() { if (SESSION) return; TT.arcade.phase = 'demo'; TT.game.go('match', TT.attractData(this.loop++)); },
  start(m) {
    this.m = m; this.i = 0; this.t = 0; this.stepT = 0; this.fired = {}; this.recT = 0; this.active = true; this.armed = .6; this.log = [];
    m.o.attractHype = false;
    this.steps = SHOWCASE.map(q => Object.assign({}, q));
    this.sub = TT.bus.on('*', (d, n) => { if (d.m === m) this.fired[n] = (this.fired[n] || 0) + 1; });
  },
  stop() { if (this.sub) this.sub(); this.sub = null; this.active = false; this.m = null; },
  update(dt) {
    const game = TT.game, m = this.m; if (!m) return;
    this.t += dt; this.armed -= dt;
    // any input ends it at once (and the input picks nothing)
    if (this.armed <= 0 && UI.anyInput(game)) { for (const q of game.players) q.consumeAll(); TT.arcade.wake(); this.exit('title'); return; }
    if (this.recT > 0) { this.recT += dt; if (this.recT > 8) this.exit('title'); return; }
    const S = this.steps[this.i];
    if (!S) { this.recT = .001; TT.arcade.endDemo(); return; }
    this.stepT += dt;
    if (!S.started) { if (S.wait && !S.wait(m) && this.stepT < 6) return; S.started = true; S.at = this.stepT; S.mark = Object.assign({}, this.fired); try { S.run(m, this); } catch (e) { game.fail('attract ' + S.name, e); } this.log.push(S.name); }
    const done = S.until ? S.until(m, this, S) : this.stepT - S.at > 4;
    if (done || this.stepT - S.at > (S.max || 12)) { this.i++; this.stepT = 0; }
  },
  exit(to) { const game = TT.game; this.stop(); game.go(to); },
  /** how many times an event fired since a step began */
  since(S, n) { return (this.fired[n] || 0) - ((S.mark && S.mark[n]) || 0); },
  draw(r) {
    r.overlay(g => {
      const t = TT.game.real;
      FONT.title(g, 'DEMO', r.W / 2, 4, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#e0662a'] });
      FONT.title(g, 'THUGBY TURBO', r.W / 2, 32, { align: 'center', scale: 1, colors: ['#fffbe8', '#ffe08a', '#e0662a'] });
      const msg = TT.touchOnly ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON';
      if (Math.floor(t * 1.5) % 2 === 0) UI.txt(g, msg, r.W / 2, 46, '#ffffff', { align: 'center', scale: UI.w(msg, { scale: 2 }) > r.W - 12 ? 1 : 2 });
      const S = this.steps && this.steps[this.i]; if (S && S.label) UI.txt(g, S.label, r.W / 2, 24, '#ffe060', { align: 'center', font: 'tiny' });
    });
    if (this.recT > 0) { r.overlay(g => { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(0, 0, r.W + 4, r.H + 4); }); const mode = ['margin', 'tries', 'hit'][this.loop % 3]; TT.arcade.drawTable(r, mode, 30, TT.RECORD_TITLES[mode]); }
  }
};
const carrierOf = (m, team) => { const c = m.carrier(); if (c && (team === undefined || c.team === team)) return c; const p = m.players.find(q => (team === undefined || q.team === team) && m.standing(q) && q.slot >= 4) || m.players.find(q => m.standing(q)); m.force('give', { id: p.id }); return p; };
const near = (m, p, x, y) => { p.x = x; p.y = y; p.vx = p.vy = 0; };
const live = m => m.phase === 'play';
const SHOWCASE = [
  { name: 'kickoff', label: 'THE WALK-OUT AND THE KICK-OFF', run() { }, until: (m, A, S) => A.since(S, 'kickoff') > 0 && m.ball.st !== 'air', max: 16 },
  { name: 'step', label: 'SIDESTEP AND FEND', wait: live, run(m) { const c = carrierOf(m, 0); c.stepCd = 0; m.doStep(c, 1); }, until: (m, A, S) => { if (A.stepT - S.at > .8 && !S.f && m.phase === 'play') { const c = carrierOf(m); S.f = 1; c.fendCd = 0; m.doFend(c); const d = m.nearestFoe(c); if (d) { d.x = c.x + Math.cos(c.f) * 12; d.y = c.y + Math.sin(c.f) * 12; d.f = angTo(d, c); m.fended(d, c); } } return A.stepT - S.at > 2.5; }, max: 5 },
  { name: 'dummy', label: 'PASS IT BACKWARDS (AND A DUMMY)', wait: live, run(m) { const c = carrierOf(m); c.cool = 0; m.dummy(c, -1); }, until: (m, A, S) => { const c = m.carrier(); if (c && c.cool <= 0 && A.since(S, 'pass') < 3 && A.stepT - S.at > .5) { const r = m.passTarget(c, A.stepT % 2 > 1 ? 1 : -1, false); if (r) m.doPass(c, r, false); } return A.since(S, 'pass') >= 3 || A.stepT - S.at > 6; }, max: 7 },
  { name: 'monster', label: 'THE MONSTER HIT', wait: live, run(m) { m.force('monster'); }, until: (m, A, S) => A.since(S, 'replayEnd') > 0 || A.stepT - S.at > 9, max: 12 },
  { name: 'ruck', label: 'THE RUCK AND THE JACKAL', wait: live, run(m) { m.force('ruck'); const S0 = m.setp; if (S0) { const d = m.players.filter(q => q.team !== S0.att && m.standing(q)).sort((a, b) => dist(a, S0) - dist(b, S0))[0]; if (d) { near(m, d, S0.x + m.dir[S0.att] * 8, S0.y + 4); S0.first = -1; m.jackal(d); } } }, until: (m, A, S) => A.since(S, 'ruckWon') > 0 && A.stepT - S.at > 1, max: 6 },
  { name: 'knockOn', label: 'KNOCK-ON: SCRUM', wait: live, run(m) { m.force('knockOn', { team: 1 }); }, until: (m, A, S) => A.since(S, 'scrumWon') > 0 && A.stepT - S.at > .8, max: 14 },
  { name: 'touch', label: 'KICK TO TOUCH: LINEOUT', wait: live, run(m) { const c = carrierOf(m); const ty = c.y < G.CY ? G.Y0 - 40 : G.Y1 + 40; m.doKick(c, 'punt', c.x + m.dir[c.team] * 220, ty, .8, { exact: true }); }, until: (m, A, S) => A.since(S, 'lineoutWon') > 0 && A.stepT - S.at > .8, max: 14 },
  { name: 'powerup', label: 'THE CROWD THROWS A POWER-UP', wait: live, run(m) { const c = carrierOf(m); const q = m.throwPowerup(TT.POWERUP_ORDER[(Attract.loop + 2) % 5], { x: c.x + m.dir[c.team] * 50, y: c.y }); void q; }, until: (m, A, S) => A.since(S, 'powerupTake') > 0 && A.stepT - S.at > 1.5, max: 8 },
  { name: 'hazard', label: 'THE VENUE BITES BACK', wait: live, run(m) { m.force('hazard', { kind: m.hazardKind === 'mud' ? 'mud' : m.hazardKind, near: true }); }, until: (m, A, S) => A.stepT - S.at > 5, max: 7 },
  { name: 'thunder', label: 'THUNDER RUN!', wait: live, run(m) { const c = carrierOf(m, 0); c.x = m.oppLine(0) - m.dir[0] * 260; c.y = G.CY - 30; m.force('thunder', { team: 0 }); }, until: (m, A, S) => A.since(S, 'convMade') + A.since(S, 'convMissed') + A.since(S, 'doinkMiss') > 0, max: 30 },
  { name: 'cheap', label: 'BEHIND THE REF\'S BACK... AND IN FRONT OF IT', wait: live, run(m) { m.force('cheap', { team: 1 }); }, until: (m, A, S) => { if (A.stepT - S.at > 2 && !S.y) { S.y = 1; m.force('yellow', { team: 1 }); } return A.since(S, 'card') > 0 && A.stepT - S.at > 3.5; }, max: 8 },
  { name: 'fire', label: 'HE\'S ON FIRE!', wait: live, run(m) { const c = carrierOf(m, 0); m.force('fire', { id: c.id }); c.x = m.oppLine(0) - m.dir[0] * 140; c.y = G.CY + 60; }, until: (m, A, S) => A.since(S, 'try') > 0 || A.stepT - S.at > 10, max: 14 },
  { name: 'drop', label: 'THE DROP GOAL', wait: live, run(m) { m.force('dropGoal', { team: 1 }); }, until: (m, A, S) => A.stepT - S.at > 4, max: 6 }
];
TT.SHOWCASE = SHOWCASE;
