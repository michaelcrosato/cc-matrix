/* 26-matchscene: the match as a game scene: its players and rigs, the world draw, the HUD and the prompts. */
G.Match.prototype.updateRigs = function (dt) {
  for (const p of this.players) {
    if (!p.rig) continue;
    if (p.act === 'highfive' && (p.actT || 0) > 1.4) p.act = 'celebrate';
    G.mocapSet(p.rig, G.mocapClipFor(p), p.actT || 0);
    p.rig.ikHand = this.ikFor(p);
    p.rig.update(dt, G.rigStateFor(p, { pose: p.dive ? null : undefined }));
  }
};
/* the hands' targets: arms up over the net for a block, the two partners' hands meeting for a high five, otherwise the ball */
G.Match.prototype.ikFor = function (p) {
  const C = G.C;
  if (G.VOLLEY[G.mocapClipFor(p)]) return null;   // the clip has the arms
  if (p.act === 'block' && (p.actT || 0) < .6) return [C.NET_X - p.x, 0, C.NET_H + 14];
  if (p.act === 'highfive' && (p.actT || 0) < 1.4) { const m = this.players.find(q => q !== p && q.side === p.side); if (m) return [(m.x - p.x) * .5, (m.y - p.y) * .5, 44]; }
  return G.ikTargetFor(p, this.L || (this.phase === 'serve' ? this.tossL : null), this.t);
};
G.Match.prototype.drawBall = function (r) {
  const L = this.L || (this.phase === 'serve' ? this.tossL : null); if (!L) return;
  const s = G.flightAt(L, this.t), C = G.C;
  const z = Math.max(0, s.z);
  r.shadow(s.x, s.y, 4 - Math.min(2, z * .03), .4);
  r.queue(s.x, s.y, z, g => {
    const q = r.w(s.x, s.y, z), rad = 3;
    E.px.disc(g, q[0], q[1], rad + .5, '#1a3a52');
    E.px.disc(g, q[0], q[1], rad, '#ffffff');
    E.px.disc(g, q[0] - 1, q[1] - 1, 1, '#ffd23a');
    E.px.rect(g, q[0] - 2, q[1], 4, 1, '#2a6fd0');
  }, { emissive: true, bias: 1 });
};
G.Match.prototype.drawPlayers = function (r) {
  for (const p of this.players) {
    if (!p.rig) continue;
    const rig = p.rig;
    r.shadow(p.x, p.y, 5, .35);
    r.actor(p.x, p.y, p.z + (p.jumpY || 0), (g, ox, oy) => { rig.draw(g, ox, oy, r.view); G.dress(g, r, rig, ox, oy); }, { pick: p });
    if (p.human && this.pendingFor(p)) {
      const pd = this.pendingFor(p);
    }
  }
};
/* the ring under the planned contact: shrinks toward the moment of the touch */
G.Match.prototype.drawTimingRings = function (r) {
  const pd = this.pending; if (!pd || !pd.p.human || pd.judged) return;
  if (this.dazzled(pd.p)) { if (!this.dazzleSaid) { this.dazzleSaid = true; this.callFloat(pd.p, 'DAZZLED!'); } return; }
  const u = G.clamp(1 - (pd.ts - this.t) / .8, 0, 1), rad = 22 - (22 - 10) * u;
  const inWindow = Math.abs(this.t - pd.ts) <= G.T.perfectWin * 1.5;
  r.queue(pd.P[0], pd.P[1], 0.5, g => {
    const q = r.w(pd.P[0], pd.P[1], 0.5);
    const col = inWindow ? '#ffd36a' : '#fff8e8';
    for (let a = 0; a < 24; a++) { const an = a / 24 * Math.PI * 2, x = q[0] + Math.cos(an) * rad * 1.6, y = q[1] + Math.sin(an) * rad * .9; E.px.rect(g, Math.round(x), Math.round(y), 1, 1, col); }
  }, { emissive: true, bias: -1 });
};
G.Match.prototype.hud = function (r) {
  const W = r.W, H = r.H;
  r.overlay(g => {
    // the TV score bug, top left
    const bx = 6, by = 6, bw = 128, bh = 36;
    E.ui.box(g, bx, by, bw, bh, { bg: ['#0a2d3d', '#051a26'], border: '#f6d38a', alpha: .9 });
    for (let s = 0; s < 2; s++) {
      const y = by + 4 + s * 15;
      const team = this.players.filter(p => p.side === s);
      const names = team.map(p => p.name).join(' / ');
      E.font.text(g, names, bx + 6, y + 2, '#fff8e8', { shadow: '#000' });
      E.font.text(g, String(this.score[s]), bx + bw - 6, y, s === (this.server ? this.server.side : -1) ? '#ffd36a' : '#fff8e8', { scale: 2, align: 'right', shadow: '#000' });
      if (this.server && this.server.side === s && this.phase !== 'point') E.px.disc(g, bx + bw - 26 + 0, y + 6, 2, '#ffd36a');
    }
    E.font.text(g, 'SET ' + (this.setNo || 1), bx + bw - 6, by + bh + 3, '#9fd3d6', { scale: 1, align: 'right', shadow: '#000' });
    // a short rally counter
    if (this.stats.rallyLen > 2) E.font.text(g, 'RALLY ' + this.stats.rallyLen, W - 8, 8, '#9fd3d6', { align: 'right', shadow: '#000' });
    // the big call
    if (this.callText) {
      const ct = this.callText, sz = 3;
      const tw = E.font.width(ct.text, { scale: sz });
      E.font.text(g, ct.text, W / 2 - tw / 2, H * .3, '#ffd36a', { scale: sz, shadow: '#000' });
    }
    // judgement popups above the players
    for (const f of this.popups || []) {
      const q = r.w(f.p.x, f.p.y, (f.p.z || 0) + 36);
      const yy = q[0] !== undefined ? q[1] - f.t * 14 : 0;
      const fx = (q[0] !== undefined ? q[0] : 0);
      E.font.text(g, f.text, fx, yy, f.col, { scale: 1, align: 'center', shadow: '#000' });
    }
  });
};
G.Match.prototype.promptItems = function () {
  const hp = this.players.find(p => p.human && !p.down);
  if (!hp) return [];
  const pd = this.pendingFor(hp);
  if (this.phase === 'serve' && this.server === hp) return this.serveState === 'toss' ? [['play', 'Hit at the top'], ['shot', 'Jump serve']] : [['play', 'Toss'], ['shot', 'Jump serve']];
  if (pd && !pd.judged) return [['play', pd.kind === 'bump' ? 'Bump' : pd.kind === 'set' ? 'Set' : 'Spike'], ['shot', pd.kind === 'attack' ? 'Shot' : 'Block / shot'], ['dive', 'Dive'], ['call', 'Call']];
  return [['dive', 'Dive'], ['call', 'Call']];
};
/* the match scene for the game */
G.matchScene = {
  enter(data) {
    const game = G.game, o = data.opts;
    this.o = o;
    this.M = G.createMatch(o);
    G.curMatch = this.M;
    this.bg = G.courtBackdrop(o.court || 'sunset');
    game.setView(G.courtView());
    game.follow(null); game.cam.bounds = null; game.cam.smooth = .18;
    G.music(o.music || 'spike');
    this.t = 0;
  },
  update(dt) {
    const M = this.M;
    if (!M) return;
    if (M.over && M.phase === 'over') return;
    if (M.players.some(p => p.human && p.human.pressed && p.human.pressed('view'))) { this.serveCam = !this.serveCam; G.game.setView(this.serveCam ? G.serveCamView() : G.courtView()); G.toast(this.serveCam ? 'Serve Cam' : 'Broadcast'); }
    M.step(dt);
    // the camera: the ball and the players, in shot
    const pts = [];
    if (M.L) { const s = G.flightAt(M.L, M.t); pts.push({ x: s.x, y: s.y, z: Math.max(0, s.z) }); }
    for (const p of M.players) pts.push({ x: p.x, y: p.y, z: 0 });
    pts.push({ x: G.C.NET_X, y: G.C.CY, z: G.C.NET_H });
    const C = G.C;
    pts.push({ x: C.X0 - 26, y: C.Y0 - 30, z: 0 }, { x: C.X1 + 26, y: C.Y1 + 30, z: 0 });
    if (pts.length) G.game.cam.frame(pts, { margin: 16, zoom: [.6, 1] });
  },
  draw(r) {
    const M = this.M;
    if (!M) return;
    this.bg.draw(r);
    G.courtMap().drawFloor(r);
    G.drawCourtSet(r, this.o.court || 'sunset');
    G.drawNet(r);
    M.drawTimingRings(r);
    if (M.replay) { this.bg.draw(r); G.courtMap().drawFloor(r); G.drawCourtSet(r, this.o.court || 'sunset'); G.drawNet(r); M.drawReplay(r); return; }
    M.drawPlayers(r);
    M.drawBall(r);
    M.hud(r);
    M.drawCommentary(r);
    const items = M.promptItems();
    if (items.length) G.promptBar(r, items);
  },
  back() { return false; }
};
G.courtView = function () { if (!G._courtView) G._courtView = new E.View('court', 'Broadcast', 0, 32, 1.5, 1); return G._courtView; };
G.serveCamView = function () { if (!G._serveCam) G._serveCam = new E.View('servecam', 'Serve Cam', 90, 46, 1.5, 1); return G._serveCam; };
/* build a Match from the options of a match scene: teams of { id, human, suit, acc, base, skill } */
G.settingsOpts = function () {
  const s = (G.game && G.game.settings) || {};
  const low = v => String(v || '').toLowerCase();
  return { difficulty: low(s.difficulty || 'Normal'), timingAssist: low(s.timingAssist || 'Normal'), autoReceive: !!s.autoReceive, timingRing: s.timingRing !== false };
};
G.createMatch = function (o) {
  o = Object.assign({}, G.settingsOpts(), o);
  const M = new G.Match(o);
  const C = G.C;
  let k = 0;
  o.teams.forEach((team, side) => team.forEach((pd, slot) => {
    const cast = G.CAST[pd.id] || G.STAFF[pd.id];
    const x = side === 0 ? C.X0 + 40 : C.X1 - 40, y = slot === 0 ? C.CY - 34 : C.CY + 34;
    const p = G.makePlayer({ id: 'p' + (k++), cast, side, slot, x, y, human: pd.human || null, skill: pd.skill, base: pd.base || .4, chem: pd.chem || 1 });
    p.suit = pd.suit || cast.signature || null; p.acc = pd.acc || []; p.aff = pd.aff || 0;
    p.rig = G.rigFor(pd.id, { suit: p.suit, acc: p.acc });
    p.human = pd.human || null; p.ai = !pd.human;
    M.players.push(p);
  }));
  M.serveSide = o.serveSide === undefined ? 0 : o.serveSide;
  M.setPhase('intro');
  M.setupDone = true;
  return M;
};
