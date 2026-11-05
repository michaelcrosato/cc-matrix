/* 25-netplay: the AI Hub session (shared-world). The host's copy runs the match on the hub's clock and sends snapshots
 * (12 a second), each launch and each point; the other copies send their player's presses and movement to the host and
 * draw the host's world. Seats: left = seats 0 and 2, right = seats 1 and 3; empty seats are CPUs.
 * Only the host calls finish(). Outside a session nothing here runs. */
G.inSession = function () { return typeof AIHub !== 'undefined' && !!AIHub.active; };
/* a remote player's input: the presses the host has been sent, and the last move the player sent */
G.RemoteInput = class {
  constructor() { this.pend = new Set(); this.mv = [0, 0]; this.lastDevice = 'keyboard'; this.map = {}; this.held = new Set(); }
  pressed(a) { return this.pend.has(a); }
  down(a) { return false; }
  repeat() { return false; }
  consume(a) { this.pend.delete(a); }
  move() { return this.mv; }
  label() { return ''; }
  clicked() { return null; }
  pointer() { return [0, 0]; }
  anyPressed() { return this.pend.size > 0; }
  clear() { this.pend.clear(); }
};
G.hub = { info: null, role: null, card: null, started: false, M: null, sendT: 0, ended: false, seatOf: {}, remote: {}, lastSnap: 0, mode: 'shared-world' };
G.hubScene = {
  enter() {
    const H = G.hub;
    this.bg = new E.Backdrop('dusk'); this.t = 0; this.card = null; this.box = G.box;
    H.started = false; H.ended = false; H.M = null; H.remote = {};
    G.game.lights.enabled = false;
    AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { G.game.go('title', {}); return; }
      H.info = info; H.role = info.isHost ? 'host' : 'client';
      AIHub.on('card', c => { this.card = c; });
      AIHub.on('start', () => { H.started = true; this.startAt = AIHub.time(); });
      AIHub.on('message', (d, from) => G.hubMessage(d, from));
      AIHub.on('leave', ev => { G.hubLeave(ev); });
      AIHub.on('time-up', () => { if (G.hub.M && G.hub.role === 'host') G.hubFinish('time-up'); });
      AIHub.on('end', ev => G.hubEnd(ev));
      AIHub.ready();
    });
  },
  update(dt) {
    const H = G.hub, I = G.game.input;
    this.t += dt;
    if (H.ended) return;
    if (!H.started) {
      // the card: Enter or Cross is Ready, Triangle or T asks for more time
      if (I.pressed('confirm')) AIHub.answer('ready');
      if (I.pressed('extra')) AIHub.answer('more');
      return;
    }
    if (!H.M) return G.hubBuildMatch();
    const M = H.M;
    M.t = AIHub.time() / 1000;
    if (H.role === 'host') {
      M.stepHub(dt);
      G.hubBroadcast(dt);
      if (M.over && M.phase === 'over') G.hubFinish('over');
    } else {
      G.hubClientInputs(dt);
      G.hubClientUpdate(dt);
    }
  },
  draw(r) {
    const H = G.hub;
    if (H.M && H.started) { this.drawWorld(r); return; }
    this.bg.draw(r);
    const c = this.card || { left: null, ready: [], paused: false, asking: 0, asked: false, starting: false };
    const info = H.info || { players: [] };
    r.overlay(g => {
      E.font.title(g, 'AHEAD OR ALIVE', r.W / 2, r.H * .12, { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'] });
      E.font.text(g, 'Win the beach volleyball match: first to 7, by 2', r.W / 2, r.H * .12 + 34, '#fff8e8', { align: 'center', shadow: '#000' });
      info.players.forEach((p, i) => {
        const ready = (c.ready || []).includes(p.id);
        E.font.text(g, p.name, r.W / 2 - 120 + i * 80, r.H * .5, p.color || '#fff', { align: 'center', shadow: '#000' });
        E.font.text(g, ready ? 'READY' : '...', r.W / 2 - 120 + i * 80, r.H * .5 + 14, ready ? '#7cff9a' : '#9fd3d6', { align: 'center', shadow: '#000' });
      });
      if (c.left !== null && c.left !== undefined) E.font.text(g, 'Starts in ' + Math.ceil(c.left / 1000) + 's' + (c.paused ? ' · paused: more time' : ''), r.W / 2, r.H * .68, '#ffd36a', { align: 'center', shadow: '#000' });
      E.font.text(g, 'Stick or WASD move · Cross or Space hit on time · Circle or Shift dive · Square or E shot', r.W / 2, r.H * .8, '#9fd3d6', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Ready'], ['extra', 'More time']]);
  },
  drawWorld(r) {
    const M = G.hub.M;
    this.bg.draw(r);
    G.courtMap().drawFloor(r); G.drawCourtSet(r, 'sunset'); G.drawNet(r);
    M.drawPlayers(r); M.drawBall(r);
    M.hud(r);
    r.overlay(g => { const info = G.hub.info; E.font.text(g, info.players.map(p => p.name).join(' · '), r.W / 2, r.H - 30, '#9fd3d6', { align: 'center', shadow: '#000' }); });
    if (G.hub.ended) r.overlay(g => { E.ui.box(g, r.W / 2 - 150, r.H / 2 - 40, 300, 80, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 }); E.font.text(g, G.hub.endText || 'Round over', r.W / 2, r.H / 2 - 24, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' }); });
  }
};
G.hubBuildMatch = function () {
  const H = G.hub, info = H.info, me = info.me;
  const seatIds = info.players.map(p => p.id);
  const teams = [[], []];
  const seatTeam = (i) => (i % 2 === 0 ? 0 : 1);
  // the fighters: shuffled with the hub's cast stream; signature suits everywhere
  const order = G.FIGHTERS.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(AIHub.rng('cast')() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const seatsByTeam = [[0, 2], [1, 3]];
  for (let t = 0; t < 2; t++) for (const seat of seatsByTeam[t]) {
    const human = seatIds.includes(seat);
    const id = order[seat];
    const inp = human ? (seat === me ? G.game.input : (H.remote[seat] = H.remote[seat] || new G.RemoteInput())) : null;
    teams[t].push({ id, human: inp, seat, suit: G.CAST[id].signature, base: .5, skill: .5 });
  }
  const court = info.seed % 2 ? 'sunset' : 'day';
  const o = { teams, pointsToWin: 7, setsToWin: 1, difficulty: 'normal', court, serveSide: 0, hub: true };
  if (H.role === 'host') {
    const M = G.createMatch(o);
    M.seatOf = {};
    M.players.forEach(p => { p.seat = seatOf(p, teams); });
    H.M = M;
    // the host's clock is the hub's: the step adds dt, so start one step earlier
    M.stepHub = function (dt) { this.t = AIHub.time() / 1000 - dt; this.step(dt); for (const k in H.remote) H.remote[k].pend.clear(); };
  } else {
    const M = G.createMatch(o);
    M.players.forEach(p => { p.seat = seatOf(p, teams); });
    M.stepHub = function () {};
    H.M = M;
  }
  G.game.setView(G.courtView());
  G.game.follow(null);
  G.music('spike');
};
function seatOf(p, teams) { for (const t of teams) for (const q of t) if (q.id === p.cast.id) return q.seat; return 0; }
/* the host's remote handler: the presses and moves its clients send, applied before each step */
G.hubMessage = function (d, from) {
  const H = G.hub;
  if (!d || typeof d !== 'object') return;
  if (H.role === 'host') {
    if (d.t === 'c') G.hubClaim(from, d);
    if (d.t === 'i') { const I = H.remote[from]; if (I) { for (const a of d.a || []) if (a === 'dive' || a === 'call') I.pend.add(a); if (d.m) I.mv = d.m; } }
    if (d.t === 'm') { const I = H.remote[from]; if (I) { I.mv = d.m || [0, 0]; if (typeof d.x === 'number' && typeof d.y === 'number' && isFinite(d.x) && isFinite(d.y)) I.pos = [d.x, d.y]; } }
    return;
  }
  // a client: the host's world
  if (d.t === 's') G.hubSnap(d);
  else if (d.t === 'b') G.hubLaunch(d);
  else if (d.t === 'e') G.hubEvent(d);
};
G.hubBroadcast = function (dt) {
  const H = G.hub, M = H.M; if (!M) return;
  H.sendT -= dt; if (H.sendT > 0) return; H.sendT = 1 / 12;
  const pl = M.players.map(p => [p.seat, +p.x.toFixed(1), +p.y.toFixed(1), +(p.facing || 0).toFixed(2), p.act, p.down ? 1 : 0]);
  AIHub.send({ t: 's', at: AIHub.time(), p: pl, sc: M.score.slice(), ph: M.phase, sv: M.server ? M.server.seat : 0, ll: M.L ? M.L.id : 0, tc: M.callText ? M.callText.text : '', pd: M.pending && !M.pending.judged ? { seat: M.pending.p.seat, ts: M.pending.ts, kind: M.pending.kind, P: M.pending.P.slice(0, 2) } : null }, { reliable: false });
  if (M.L && M.L.id !== H.lastLaunchId) { H.lastLaunchId = M.L.id; const L = M.L; AIHub.send({ t: 'b', t0: L.t0, p: L.p, v: L.v, k: L.k, g: L.g, kind: L.kind, id: L.id }); }
};
G.hubLaunch = function (d) {
  const H = G.hub, M = H.M; if (!M) return;
  M.L = G.launchMake({ t0: d.t0, p: d.p, v: d.v, k: d.k, g: d.g, kind: d.kind });
  M.L.id = d.id;
};
G.hubEvent = function (d) { const M = G.hub.M; if (M && d.text) M.callText = { text: d.text, t: 1.2 }; };
G.hubSnap = function (d) {
  const M = G.hub.M; if (!M) return;
  for (const row of d.p) {
    const p = M.players.find(q => q.seat === row[0]); if (!p) continue;
    if (p.seat === G.hub.info.me) continue;      // a client's own fighter is never overwritten
    p.x = row[1]; p.y = row[2]; p.facing = row[3]; p.act = row[4]; p.down = !!row[5];
  }
  M.score = d.sc.slice(); M.phase = d.ph;
  if (d.tc) M.callText = { text: d.tc, t: .8 };
  G.hub.plan = d.pd || null;
  M.server = M.players.find(q => q.seat === d.sv) || M.server;
};
G.hubClientInputs = function (dt) {
  const H = G.hub, I = G.game.input;
  const acts = ['dive', 'call'].filter(a => I.pressed(a));
  if (acts.length) AIHub.send({ t: 'i', a: acts, m: I.move() }, { reliable: true });
  for (const a of ['play', 'shot']) if (I.pressed(a)) G.hubClaimFor(a);
  const M = H.M, me = M && M.players.find(p => p.seat === H.info.me);
  if (me) {
    if (!H.me) H.me = { x: me.x, y: me.y };
    const m = I.move();
    if (m[0] || m[1]) {
      const d = G.game.view.screenDirToGround(m[0], m[1]), len = Math.min(1, Math.hypot(m[0], m[1])), sp = M.speedOf(me) * len;
      H.me.x += d[0] * sp * dt; H.me.y += d[1] * sp * dt; H.facing = Math.atan2(d[1], d[0]);
    }
    H.me.x = G.clamp(H.me.x, me.side === 0 ? 40 : G.C.NET_X + 6, me.side === 0 ? G.C.NET_X - 6 : 668);
    H.me.y = G.clamp(H.me.y, 112, 432);
    me.x = H.me.x; me.y = H.me.y; me.facing = H.facing || me.facing;
  }
  H.moveT = (H.moveT || 0) - dt;
  if (H.moveT <= 0) { H.moveT = 1 / 12; AIHub.send({ t: 'm', m: I.move(), x: H.me ? H.me.x : 0, y: H.me ? H.me.y : 0 }, { reliable: false }); }
};
/* a client's touch claim: judged here on the hub clock against the planned contact the host published */
G.hubClaimFor = function (action) {
  const H = G.hub, pl = H.plan, me = H.info && H.info.me;
  if (!pl || pl.seat !== me) return;
  const at = AIHub.time() / 1000, err = at - pl.ts;
  if (err < -.6 || err > G.T.okWin * 1.2 + .05) return;
  const assist = (G.DIFFICULTY[G.settingsOpts().difficulty] || { assist: 1 }).assist;
  const ae = Math.abs(err), q = ae <= G.T.perfectWin * assist ? 'perfect' : ae <= G.T.greatWin * assist ? 'great' : ae <= G.T.okWin * assist ? 'ok' : 'miss';
  if (q === 'miss') return;
  AIHub.send({ t: 'c', at, k: pl.kind, q, a: action }, { reliable: true });
};
/* the host's validation of a claim: the touch is still open, it is the seat's planned kind, the time is in the window
 * (the planned window with 120 ms for the network), the claimant is in reach of the contact; then the host plays it */
G.hubClaim = function (from, d) {
  const H = G.hub, M = H.M; if (!M || H.role !== 'host') return;
  const pd = M.pending; if (!pd || pd.judged || pd.p.seat !== from || pd.kind !== d.k) return;
  if (Math.abs(d.at - pd.ts) > G.T.okWin * 1.2 + .12 + .05) return;
  const P = pd.P, reach = Math.hypot(P[0] - pd.p.x, P[1] - pd.p.y);
  if (reach > G.T.reach + .4 * pd.p.stat('TEC') + 12) return;
  const q = ['perfect', 'great', 'ok'].includes(d.q) ? d.q : 'ok';
  pd.judged = true;
  M.resolveTouch(pd.p, pd, q, d.a === 'shot' ? 'shot' : 'play');
  H.claims = (H.claims || 0) + 1;
};
G.hubClientUpdate = function (dt) {
  const M = G.hub.M; if (!M) return;
  for (const p of M.players) { if (!p.rig) continue; p.rig.update(dt, G.rigStateFor(p)); }
  M.updateRigs && M.updateRigs(0);
};
G.hubFinish = function (why) {
  const H = G.hub, M = H.M; if (!M || H._finished) return; H._finished = true;
  const winner = M.over ? M.winner : (M.score[0] === M.score[1] ? null : (M.score[0] > M.score[1] ? 0 : 1));
  const humans = H.info.players.map(p => p.id);
  const left = M.players.filter(p => p.side === 0 && humans.includes(p.seat)).map(p => p.seat), right = M.players.filter(p => p.side === 1 && humans.includes(p.seat)).map(p => p.seat);
  const all = left.concat(right);
  const standings = (winner === null ? [all] : winner === 0 ? [left, right] : [right, left]).filter(a => a.length);
  const scores = {}; M.players.forEach(p => { scores[p.seat] = M.score[p.side]; });
  AIHub.finish({ standings, scores, won: winner === 0 ? true : winner === 1 ? false : undefined });
  if (why === 'time-up') H.endText = 'Time is up'; else H.endText = 'Final: ' + M.score.join(' - ');
  H.ended = true;
};
G.hubEnd = function (ev) {
  const H = G.hub; H.ended = true; H.endText = (ev && ev.reason === 'finished') ? 'Final standings shown on the hub' : 'Round over';
  G.music(null); H.M && (H.M.stepHub = function () {});
};
G.hubLeave = function (ev) { const H = G.hub; if (H.remote[ev.id]) { H.remote[ev.id].pend.clear(); } };
