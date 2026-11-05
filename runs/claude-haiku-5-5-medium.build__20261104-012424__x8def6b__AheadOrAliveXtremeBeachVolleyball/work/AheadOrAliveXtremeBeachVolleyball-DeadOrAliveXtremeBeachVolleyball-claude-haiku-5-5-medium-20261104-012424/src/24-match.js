/* 24-match: the match loop (phases, serves, rallies, net and landing events, blocks), the camera, the draw and the HUD.
 * One Match per game; the match scene (matchScene) hosts it and reads the human inputs. */
G.Match.prototype.rng = function () { return G.rng('match'); };
G.Match.prototype.setPhase = function (ph) { this.phase = ph; this.phaseT = 0; };
G.Match.prototype.enterServe = function () {
  this.setPhase('serve');
  this.lastTouch = null; this.L = null; this.pending = null; this.touches = [0, 0];
  this.server = this.pickServer(this.serveSide);
  this.serveState = 'wait'; this.serveWaitHuman = 0; this.tossL = null; this.tossPlan = null; this.serveWait = null;
  this.serveQ = null;
  const sp = this.server;
  for (const p of this.players) { p.act = 'ready'; p.actT = 0; p.dive = null; p.blockAt = null; p.missedId = null; p.jumpY = 0; const h = this.home(p); p.x = h[0]; p.y = h[1]; p.facing = p.side === 0 ? 0 : Math.PI; }
  sp.x = sp.side === 0 ? G.C.X0 - 22 : G.C.X1 + 22; sp.y = G.C.CY;
  sp.facing = sp.side === 0 ? 0 : Math.PI;
  this.servePos = [sp.x, sp.y];
  this.callText = { text: sp.human ? 'YOUR SERVE' : (sp.name + ' SERVES'), t: 1.4, side: sp.side };
  if (sp.human) this.serveAutoT = 10;
};
G.Match.prototype.serveInput = function (p, action) {
  if (this.serveState === 'wait') { this.tossServe(p, action === 'shot'); return; }
  if (this.serveState === 'toss') this.serveHit(p, action);
};
G.Match.prototype.step = function (dt) {
  if (this.phase === 'over') return;
  if (this.replay) { this.stepReplay(dt); return; }
  this.t += dt; this.phaseT += dt;
  for (const p of this.players) if (!p.down) this.updatePlayer(p, dt);
  this.handleInputs();
  switch (this.phase) {
    case 'intro': if (this.phaseT > 1.4) this.enterServe(); break;
    case 'serve': this.serveStep(dt); break;
    case 'rally': this.rallyStep(dt); break;
    case 'point': this.pointStep(dt); break;
  }
  if (this.callText) { this.callText.t -= dt; if (this.callText.t <= 0) this.callText = null; }
  this.tickPresentation(dt);
  for (const f of this.popups || []) f.t += dt;
  this.popups = (this.popups || []).filter(f => f.t < 1.4);
  this.updateRigs(dt);
  this.recordFrame();
  this.stepFx && this.stepFx(dt);
};
G.Match.prototype.handleInputs = function () {
  for (const p of this.players) {
    const I = p.human; if (!I || p.down) continue;
    if (I.pressed('play')) this.humanPress(p, 'play');
    if (I.pressed('shot')) this.humanPress(p, 'shot');
    if (I.pressed('dive')) this.humanPress(p, 'dive');
    if (I.pressed('call')) this.humanPress(p, 'call');
  }
};
G.Match.prototype.serveStep = function (dt) {
  const s = this.server;
  if (this.serveState === 'hit') { this.setPhase('rally'); return; }
  if (!s) return;
  if (s.ai) this.aiServeStep(dt);
  else if (this.serveState === 'wait') {
    this.serveWaitHuman += dt;
    if (this.serveWaitHuman > 10) this.tossServe(s, false), this.autoServeHuman = true;
  } else if (this.serveState === 'toss' && this.autoServeHuman && this.tossL && this.t >= this.tossL.apexT) {
    this.autoServeHuman = false; this.serveHit(s, 'play');
  }
  if (this.serveState === 'toss' && this.serveTossT !== undefined && this.t - this.serveTossT > 2.5) { this.serveFault(s); }
};
G.Match.prototype.serveFault = function (s) {
  this.point(1 - s.side, 'serveFault', 'timed out');
};
G.Match.prototype.rallyStep = function (dt) {
  const L = this.L;
  if (!L) { this.point(1 - (this.lastTouch ? this.lastTouch.side : this.serveSide), 'land', 'no ball'); return; }
  this.aiBlockDecide(L);
  const pend = this.pending;
  if (pend && pend.p.human) this.tipFor(pend.kind === 'bump' ? 'receive' : pend.kind === 'set' ? 'set' : 'spike');
  if (pend && pend.p.ai) this.aiTouchStep();
  else if (pend && !pend.judged && this.t > pend.ts + G.T.okWin * 1.2 + .05) {
    // the human did not press: auto-receive for a pass if on, else the ball goes by
    if (this.o.autoReceive && pend.kind === 'bump' && this.touches[pend.side] === 0) { pend.judged = true; this.resolveTouch(pend.p, pend, 'ok', 'play'); }
    else { pend.p.missedId = L.id; this.whiffPending(pend); }
  }
  if (this.phase !== 'rally') return;
  if (L.tNet !== null && !L.netDone && this.t >= L.tNet) { L.netDone = true; this.handleNet(L); if (this.phase !== 'rally') return; }
  if (this.L === L && L.tLand !== null && !L.landDone && this.t >= L.tLand) { L.landDone = true; this.handleLand(L); }
};
G.Match.prototype.whiffPending = function (pend) {
  const side = pend.side, p = pend.p;
  this.pending = null; p.planned = null;
  p.stats.whiffs = (p.stats.whiffs || 0) + 1;
  this.callFloat(p, p.human ? 'MISS' : '');
  // another player on the side may still get it
  this.planFor(side);
  if (this.pending && this.pending.p === p) this.pending = null;
};
G.Match.prototype.handleLand = function (L) {
  const c = G.landCourt(L);
  if (!c) return;
  const lt = this.lastTouch, kind = lt ? lt.kind : 'serve';
  if (!c.inside) {
    const loser = lt ? lt.side : this.server.side;
    if (kind === 'serve') return this.point(1 - loser, 'serveFault', 'out');
    return this.point(1 - loser, 'out', 'out');
  }
  if (kind === 'serve' && c.side !== this.server.side) return this.point(this.server.side, 'ace', 'ace');
  if (kind === 'block' && c.side === lt.side) return this.point(1 - c.side, 'block', 'stuffed');
  if ((kind === 'spike' || kind === 'attack') && c.side !== lt.side) return this.point(1 - c.side, 'kill', 'kill');
  return this.point(1 - c.side, 'land', 'landed');
};
G.Match.prototype.handleNet = function (L) {
  const C = G.C, att = L.side;
  let out = G.netOutcome(L);
  if (out === 'net' && this.luckyNow) { out = 'cord'; this.luckyNow = false; this.luckyForce = true; }
  const def = att === undefined || att < 0 ? 1 : 1 - att;
  // a block: a defender at the net, timed, with the hands in the ball's height
  if (att >= 0 && (L.kind === 'spike' || L.kind === 'attack' || L.kind === 'shot')) {
    for (const b of this.players) {
      if (b.side !== def || b.blockAt === null || b.down) continue;
      const err = (b.blockAt + G.T.blockRise) - L.tNet;
      const hands = Math.abs(err) <= G.T.okWin * ((G.DIFFICULTY[this.o.difficulty] || { assist: 1 }).assist);
      const near = Math.abs(L.netY - b.y) <= 9 + .6 * b.stat('JMP') + 6;
      const high = L.netZ >= C.NET_H - 4 && L.netZ <= C.NET_H + 26;
      if (hands && near && high) { this.doBlock(b, L, err); return; }
    }
    for (const b of this.players) b.blockAt = null;
  }
  if (out === 'antenna') return this.point(1 - this.lastTouch.side, 'antenna', 'antenna');
  if (out === 'net') return this.point(1 - (this.lastTouch ? this.lastTouch.side : att), 'net', 'net');
  if (out === 'cord') {
    const s = G.flightAt(L, L.tNet), sg = Math.sign(s.vx) || 1;
    const dest = 1 - att;
    if (this.luckyForce || this.rng() < G.T.netCordOver) {
      this.luckyForce = false;
      this.launch({ t0: this.t, p: [C.NET_X + sg * 1.5, L.netY, C.NET_H + 2], v: [s.vx * .35, s.vy * .5, 60 + (this.rng() * 40 - 20)], kind: L.kind, side: att, by: L.by });
      this.L.side = att; this.touches[dest] = 0; this.planFor(dest);
    } else {
      this.launch({ t0: this.t, p: [C.NET_X - sg * 1.5, L.netY, C.NET_H + 1], v: [s.vx * -.3, s.vy * .5, 10], kind: 'cord', side: att, by: L.by });
      this.L.side = att; this.planFor(att);
    }
    this.lastCord = this.t;
    this.callText = { text: 'TAPE!', t: .8, side: att };
  }
};
G.Match.prototype.doBlock = function (b, L, err) {
  const C = G.C, s = G.flightAt(L, L.tNet), att = L.side, def = b.side;
  const stuff = Math.abs(err) <= G.T.greatWin;
  this.lastBlocker = b;
  b.stats.blockTouches = (b.stats.blockTouches || 0) + 1;
  b.act = 'block'; b.actT = 0; b.lockT = .3;
  G.bus.emit('block', { p: b, stuff });
  const x0 = C.NET_X + (def === 1 ? 2 : -2);
  if (stuff) {
    this.launch({ t0: this.t, p: [x0, L.netY, C.NET_H + 6], v: [-.35 * s.vx, .3 * s.vy + (this.rng() * 40 - 20), -60], kind: 'stuff', side: def, by: b });
    this.L.side = def;
    this.touches[def] = 1; this.touches[att] = 0;
    this.lastTouch = { side: def, p: b, kind: 'block', t: this.t, blocked: true };
    this.callText = { text: 'BLOCK!', t: 1.2, side: def };
    this.planFor(att);
  } else {
    this.launch({ t0: this.t, p: [x0, L.netY, C.NET_H + 4], v: [(def === 1 ? 1 : -1) * 30, .2 * s.vy, 70], kind: 'soft', side: def, by: b });
    this.L.side = def;
    this.touches[def] = 1;
    this.lastTouch = { side: def, p: b, kind: 'block', t: this.t, blocked: true };
    this.planFor(def);
  }
  for (const q of this.players) q.blockAt = null;
};
G.Match.prototype.pointStep = function (dt) {
  if (this.phaseT < 2.2) return;
  if (this.over) { this.setPhase('over'); this.finish && this.finish(); return; }
  if (this.pendingSetEnd) { this.pendingSetEnd = false; this.score = [0, 0]; this.setNo++; this.callText = { text: 'SET ' + (this.sets[0] + this.sets[1]) + '', t: 1.2, side: this.setWinner }; }
  this.serveSide = this.pendingPoint ? this.pendingPoint.won : this.serveSide;
  this.enterServe();
};
/* whether a side has changed its serve after a point */
G.Match.prototype.onPoint = function (won, why) { this.serveSide = won; };
