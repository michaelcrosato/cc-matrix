// The AI Hub adapter (Session Protocol v1, shared world). The host runs the match; every other copy sends its player's
// stick and buttons (a log of presses, so a lost packet loses nothing), shows the world from the host's snapshots
// (interpolated 100 ms behind) and moves its own athlete at once (prediction, corrected by the host). Remote players are
// driven through the same control code as local ones. Play calls go to the host. A token bucket keeps every copy under
// 18 messages a second. Leave, time-up and end follow the protocol; the host reports the standings once.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, game = FF.game, YD = 16, bus = FF.bus;
const H = () => window.AIHub;
const ACTS = ['b1', 'b2', 'b3', 'b4', 'lb', 'rb', 'turbo', 'r1', 'r2', 'r3', 'r4', 'pause'];
const PHASES = ['COIN', 'PLAYCALL', 'PRESNAP', 'LIVE', 'DEAD', 'CELEBRATE', 'QBREAK', 'HALFTIME', 'PILE', 'FINAL'];
const KINDS = ['scrimmage', 'kickoff', 'pat', 'two'];
const BSTATES = ['held', 'pass', 'kick', 'loose', 'kickLoose', 'dead', 'bounce', 'placed', 'tee'];
const FWD = ['td', 'bigHit', 'megaHit', 'sack', 'int', 'fumble', 'pile', 'bigCatch', 'bigRun', 'hotOn', 'hotOff', 'fiascoBreak', 'cardUsed', 'fg', 'safety', 'firstDown', 'lateHit', 'special', 'mascotOn', 'kickoff', 'punt',
  'whistle', 'snap', 'pass', 'tackle', 'drop', 'incomplete', 'doink', 'final', 'quarterEnd', 'lightsOut', 'lightsOn', 'pat', 'seismic', 'pancake', 'brokenTackle', 'turnover', 'turnoverOnDowns', 'touchback', 'catch'];
const N = FF.net = { active: false, info: null, host: false, server: false, started: false, ended: false, card: null, snaps: [], evSeq: 0, seenEv: 0, inputs: {}, sentAt: 0, budget: { tokens: 18, t: 0 }, stats: { sent: 0, recv: 0, dropped: 0, bigSnap: 0 }, log: [] };
N.isHost = () => N.active && N.host;
N.isClient = () => N.active && !N.host;
N.sideOf = id => { const i = N.info ? N.info.players.findIndex(p => p.id === id) : 0; return i % 2 === 0 ? 0 : 1; };
/** send through the token bucket: 18 a second; an unreliable message past it is dropped, a reliable one always goes */
N.send = (data, o = {}) => {
  if (N.ended || !H()) return false;
  const B = N.budget, now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  B.tokens = Math.min(18, B.tokens + (now - (B.t || now)) * 18); B.t = now;
  if (B.tokens < 1 && o.reliable === false) { N.stats.dropped++; return false; }
  B.tokens -= 1; N.stats.sent++;
  return H().send(data, o);
};
N.answer = a => { if (H() && !N.ended) { try { H().answer(a); } catch (e) { game.fail('hub answer', e); } } };
N.init = async () => {
  N.started = true;
  let info = null;
  try { info = await H().connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
  if (!info) { FF.inHub = false; game.go('title'); return; }
  N.info = info; N.active = true; N.host = !!info.isHost; N.server = !!info.server;
  const R = H().rng('setup'), Ls = FF.data.stadiumList, Ts = FF.data.playable.slice();
  const stadium = Ls[Math.floor(R() * Ls.length) % Ls.length], home = FF.data.stadiums[stadium].home;
  const others = Ts.filter(t => t !== home), away = others[Math.floor(R() * others.length) % others.length];
  N.setup = { stadium, teams: [home, away] };
  const humans = { 0: [], 1: [] };
  info.players.forEach((p, i) => { const s = i % 2 === 0 ? 0 : 1; humans[s].push(p.id === info.me && !N.server ? 0 : 'net:' + p.id); });
  const lim = info.limitMs ? info.limitMs / 1000 : 330, q = Math.round(E.clamp((lim - 60) / 2 / 1.3, 45, 90));
  N.spec = { mode: 'hub', home, away, stadium, humans, quarterLength: q, seed: Math.floor(H().rng('match')() * 1e9), start: 'kickoff', difficulty: 'pro', cards: { 0: [FF.data.cardList[Math.floor(H().rng('cards')() * 8)]], 1: [FF.data.cardList[Math.floor(H().rng('cards')() * 8)]] } };
  N.names = {}; N.colors = {};
  info.players.forEach(p => { const k = p.id === info.me && !N.server ? 0 : 'net:' + p.id; N.names[k] = String(p.name || 'P').toUpperCase().slice(0, 10); N.colors[k] = p.color; });
  H().on('card', c => { N.card = c; });
  H().on('start', () => { N.go(); });
  H().on('message', (d, from) => N.onMessage(d, from));
  H().on('leave', ({ id }) => N.leave(id));
  H().on('time-up', () => { if (N.host) N.finish(); });
  H().on('end', e => N.end(e));
  if (N.server) { game.audio.mute(true); }
  // the match is built when the round starts; the card is ours until then
  H().ready();
};
N.go = () => { if (N.ended) return; game.go('match', { spec: N.spec, hub: true }, { fade: 0 }); };
N.onStart = m => { m.hubHalf = true; m.hubNames = N.names; m.seatColors = N.colors; m.client = !N.host; if (!N.host) { m.phase = 'COIN'; } };
/** a remote seat's input, as an object with the input API the control code reads */
N.fakeInput = key => N.inputs[key] || (N.inputs[key] = { key, mx: 0, my: 0, held: 0, now: 0, seen: -1, lastDevice: 'gamepad', half: null, map: game.input.map, codeLabel: c => game.input.codeLabel(c),
  move() { return [this.mx, this.my]; }, down(a) { const k = ACTS.indexOf(a); return k >= 0 && !!(this.held & (1 << k)); }, pressed(a) { const k = ACTS.indexOf(a); return k >= 0 && !!(this.now & (1 << k)); },
  repeat(a) { return this.pressed(a); }, released() { return false; }, clicked() { return null; }, consume() {}, consumeAll() {}, anyPressed() { return !!this.now; }, pointer() { return null; } });
N.onMessage = (d, from) => {
  N.stats.recv++;
  if (!d || typeof d !== 'object') return;
  if (N.host) {
    if (d.t === 'i') { const I = N.fakeInput('net:' + from); if (d.at !== undefined && I.at !== undefined && d.at < I.at) return; I.at = d.at; I.mx = (d.m && d.m[0] || 0) / 100; I.my = (d.m && d.m[1] || 0) / 100; I.held = d.b | 0; I.lastDevice = d.dv === 1 ? 'keyboard' : 'gamepad';
      for (const [q, bits] of d.log || []) if (q > I.seen) { I.seen = q; I.pend = (I.pend || 0) | bits; } }
    if (d.t === 'call' && FF.match) { const s = N.sideOf(from); if (FF.match.phase === 'PLAYCALL' && FF.match.callKind === d.k) FF.match.callPlay(s, d.play, !!d.flip, d.card || null); }
    return;
  }
  if (from !== N.info.host) return;
  if (d.t === 's') { if (N.lastSnapAt !== undefined && d.at < N.lastSnapAt) return; N.lastSnapAt = d.at; d.recvAt = now(); N.snaps.push(d); if (N.snaps.length > 12) N.snaps.shift(); N.applyEvents(d); if (d.over) N.overSeen = true; }
};
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/* ---- the host ---- */
N.hostPre = () => { for (const k in N.inputs) { const I = N.inputs[k]; I.now = I.pend || 0; I.pend = 0; } };
N.snapshot = m => {
  const A = m.on.concat(m.extra).map(a => [a.id, Math.round(a.x), Math.round(a.y), Math.round(a.z), Math.round(a.facing * 100), FF.POSE_CODE[a.pose] || 0, Math.round((a.poseU || 0) * 255), (a.carry ? 1 : 0) | (a.hot > 0 ? 2 : 0) | (a.dinged > 0 ? 4 : 0) | (a.helmetOff ? 8 : 0) | (a.carry === 'L' ? 16 : 0) | (a.fallBack ? 32 : 0), typeof a.ctl === 'number' ? N.localSeat() : a.ctl ? +String(a.ctl).slice(4) : -1]);
  const b = m.ball, K = m.meterK;
  const s = { t: 's', at: Math.round(H().time()), n: ++N.seq, ph: PHASES.indexOf(m.phase), pt: Math.round(m.phaseT * 10), c: Math.round(m.clock * 10), q: m.quarter, sc: m.score.slice(), d: [m.down, m.toGo, Math.round(m.los), Math.round(m.lineToGain || m.los), Math.round(m.ballY)],
    po: m.poss, ck: KINDS.indexOf(m.callKind), pn: m.playNo, ball: [Math.round(b.x), Math.round(b.y), Math.round(b.z), BSTATES.indexOf(b.state), b.holder ? b.holder.id : -1, b.to ? Math.round(b.to.x) : 0, b.to ? Math.round(b.to.y) : 0], A,
    mt: [Math.round(m.meter[0]), Math.round(m.meter[1])], cd: [m.cards[0].slice(), m.cards[1].slice()], cl: [m.calls[0] ? 1 : 0, m.calls[1] ? 1 : 0], ev: N.evq.slice(-8) };
  if (K) s.mk = [K.side, K.stage, Math.round(K.power * 100), Math.round((K.stage >= 2 ? K.needle : 0) * 100), Math.round(K.aim * 100), K.kind === 'fg' ? 1 : 0];
  if (m.play && m.play.off) s.pl = m.play.off.id;
  if (m.over) s.over = 1;
  let js = JSON.stringify(s); if (js.length > 1100) { s.ev = N.evq.slice(-2); js = JSON.stringify(s); } N.stats.bigSnap = Math.max(N.stats.bigSnap, js.length);
  return s;
};
N.localSeat = () => N.info ? N.info.me : 0;
N.evq = []; N.seq = 0;
bus.on('*', d => { if (!N.isHost() || !FF.match || d.m !== FF.match || !FWD.includes(d.ev)) return; const id = o => o && o.id !== undefined ? o.id : -1;
  const a = d.player || d.tackler || d.defender || d.receiver || d.who || d.a || d.carrier || d.athlete, b = d.carrier && d.tackler ? d.carrier : d.qb || d.victim || d.thrower;
  N.evq.push([++N.evSeq, FWD.indexOf(d.ev), id(a), id(b), Math.round(d.x || (a && a.x) || 0), Math.round(d.y || (a && a.y) || 0), d.yards !== undefined ? d.yards : d.good ? 1 : d.side !== undefined ? d.side + 10 : 0, d.kind || d.card || '']);
  if (N.evq.length > 16) N.evq.shift(); });
N.finish = () => {
  const m = FF.match; if (!N.host || N.finished || !m) return; N.finished = true;
  const ids = N.info.players.map(p => p.id).filter(id => !N.left || !N.left[id]), side = id => N.sideOf(id);
  let standings;
  if (ids.length === 1) standings = [[ids[0]]];
  else if (m.score[0] === m.score[1]) standings = [ids];
  else { const w = m.score[0] > m.score[1] ? 0 : 1; standings = [ids.filter(i => side(i) === w), ids.filter(i => side(i) !== w)].filter(a => a.length); }
  const scores = {}, stats = {}; for (const id of ids) { const s = side(id); scores[id] = m.score[s]; stats[id] = { Yards: m.stats[s].yards, TDs: m.stats[s].tds, Tackles: m.roster[s].reduce((n, a) => n + a.stats.tackles, 0), Sacks: m.stats[s].sacks }; }
  const best = [...m.all].sort((a, b) => (b.stats.tds * 6 + b.stats.yds * .1 + b.stats.tackles) - (a.stats.tds * 6 + a.stats.yds * .1 + a.stats.tackles))[0], hit = Math.max(m.stats[0].bigHit, m.stats[1].bigHit);
  const owner = s => ids.find(i => side(i) === s);
  const awards = []; if (best && owner(best.side) !== undefined) awards.push({ id: owner(best.side), title: 'Player of the Game', detail: best.name }); if (hit) { const hs = m.stats[0].bigHit >= m.stats[1].bigHit ? 0 : 1; if (owner(hs) !== undefined) awards.push({ id: owner(hs), title: 'Biggest Hit', detail: hit + '-yard launch' }); }
  const won = ids.length === 1 ? m.score[side(ids[0])] > m.score[1 - side(ids[0])] : undefined;
  try { N.send(Object.assign(N.snapshot(m), { over: 1 }), { reliable: true }); H().finish(Object.assign({ standings, scores, stats, awards }, won !== undefined ? { won } : {})); } catch (e) { game.fail('hub finish', e); }
  if (!m.over) m.final();
};
N.leave = id => {
  N.left = N.left || {}; N.left[id] = true;
  const m = FF.match, key = 'net:' + id; if (!m) return;
  for (const s of [0, 1]) m.humans[s] = (m.humans[s] || []).filter(p => p !== key);
  for (const a of m.all.concat(m.extra)) if (a.ctl === key) a.ctl = null;
  if (N.host && m.phase !== 'FINAL' && N.info.players.filter(p => !N.left[p.id]).length < 1) N.finish();
};
N.end = e => {
  N.ended = true; N.endReason = e && e.reason;
  try { game.audio.music(null); game.audio.mute(true); } catch (err) { /* no sound */ }
  FF.crowdAudio.stop();
};
/* ---- each step, from the match scene ---- */
N.update = (dt, rdt) => {
  const m = FF.match; if (!m || N.ended) return;
  // Create + Options belongs to the hub: Options alone opens our Settings, without pausing
  let create = false; try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p && p.buttons[8] && p.buttons[8].pressed) create = true; } catch (e) { /* no pads */ }
  if (create) { game.input.suppress('pause'); game.input.suppress('start'); }
  else if (game.input.pressed('pause') && !N.server && !game.shell.screen) game.menu('settings', { pause: false });
  if (N.host) {
    N.hostPre();
    N.sendT = (N.sendT || 0) + rdt;
    if (N.sendT >= 1 / 14) { N.sendT = 0; N.send(N.snapshot(m), { reliable: false }); }
    if (m.over && !N.finished) N.finish();
  } else {
    N.sendT = (N.sendT || 0) + rdt;
    const I = game.input, mv = I.move();
    let bits = 0; ACTS.forEach((a, k) => { if (I.down(a)) bits |= 1 << k; });
    let pr = 0; ACTS.forEach((a, k) => { if (I.pressed(a)) pr |= 1 << k; });
    if (pr) { N.pseq = (N.pseq || 0) + 1; N.plog = (N.plog || []).concat([[N.pseq, pr]]).slice(-8); }
    if (N.sendT >= 1 / 15 && H().time() > -Infinity) { N.sendT = 0; N.send({ t: 'i', at: Math.round(H().time()), m: [Math.round(mv[0] * 100), Math.round(mv[1] * 100)], b: bits, log: N.plog || [], dv: I.lastDevice === 'gamepad' ? 0 : 1 }, { to: N.info.host, reliable: false }); }
    N.applySnap(m, rdt);
  }
};
N.sendCall = (side, play, flip, card) => { const m = FF.match; N.send({ t: 'call', k: m ? m.callKind : 'scrimmage', play, flip: flip ? 1 : 0, card: card || null }, { to: N.info.host, reliable: true }); };
/* ---- the client: the world from the snapshots ---- */
const byId = (m, id) => id < 0 ? null : m.all.find(a => a.id === id) || m.extra.find(a => a.id === id) || null;
N.applySnap = (m, rdt) => {
  const S = N.snaps; if (!S.length) return;
  const t = now() - 100, last = S[S.length - 1];
  let a = S[0], b = S[0]; for (let i = 0; i < S.length - 1; i++) if (S[i].recvAt <= t && S[i + 1].recvAt >= t) { a = S[i]; b = S[i + 1]; }
  if (t > last.recvAt) { a = b = last; }
  const k = b.recvAt > a.recvAt ? E.clamp((t - a.recvAt) / (b.recvAt - a.recvAt), 0, 1) : 1;
  // the match's state from the newest snapshot
  m.phase = PHASES[last.ph] || m.phase; m.phaseT = last.pt / 10; m.clock = last.c / 10; m.quarter = last.q; m.score = last.sc.slice(); m.down = last.d[0]; m.toGo = last.d[1]; m.los = last.d[2]; m.lineToGain = last.d[3]; m.ballY = last.d[4];
  m.poss = last.po; m.callKind = KINDS[last.ck] || 'scrimmage'; m.playNo = last.pn; m.meter = last.mt.slice(); m.cards = [last.cd[0].slice(), last.cd[1].slice()]; m.over = !!last.over; if (m.over) m.winner = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
  if (last.pl && (!m.play || m.play.off.id !== last.pl)) m.play = { off: FF.data.plays[last.pl] || { id: last.pl, type: 'run' }, def: { id: 'x' }, t: 0, losX: m.los, passed: true };
  if (m.play) m.play.losX = m.los;
  m.meterK = last.mk ? { side: last.mk[0], stage: last.mk[1], power: last.mk[2] / 100, needle: last.mk[3] / 100, acc: last.mk[3] / 100, aim: last.mk[4] / 100, kind: last.mk[5] ? 'fg' : 'deep', done: last.mk[1] >= 3, band: FF.T.accBand } : null;
  m.set = m.phase === 'PRESNAP';
  // athletes: interpolated between two snapshots; mine predicted from my stick
  const ids = new Set(), A0 = new Map(a.A.map(e => [e[0], e])), me = N.info.me;
  const on = [];
  for (const e1 of last.A) {
    const e0 = A0.get(e1[0]) || e1, eb = b.A.find(x => x[0] === e1[0]) || e1, ea = a.A.find(x => x[0] === e1[0]) || eb, at = byId(m, e1[0]) || (e1[0] >= 40 ? N.mascotFor(m, e1[0]) : null); if (!at) continue; void e0;
    ids.add(at.id); at.onField = true;
    const L = j => ea[j] + (eb[j] - ea[j]) * k;
    const tx = L(1), ty = L(2);
    if (e1[8] === me && !N.server && m.phase === 'LIVE') {   // my athlete: predicted
      const I = game.input, mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]), sp = m.topSpeed(at) * (I.down('turbo') ? FF.T.turboMult : 1);
      at.x += d[0] * sp * rdt; at.y += d[1] * sp * rdt; const err = Math.hypot(tx - at.x, ty - at.y);
      if (err > 2 * YD) { at.x = tx; at.y = ty; } else { at.x += (tx - at.x) * Math.min(1, rdt * 6); at.y += (ty - at.y) * Math.min(1, rdt * 6); }
      at.vx = d[0] * sp; at.vy = d[1] * sp; if (Math.hypot(d[0], d[1]) > .2) at.facing = Math.atan2(d[1], d[0]);
    } else { at.vx = (tx - at.x) / Math.max(rdt, 1e-3) * .5; at.vy = (ty - at.y) / Math.max(rdt, 1e-3) * .5; at.x = tx; at.y = ty; at.facing = e1[4] / 100; }
    at.z = L(3); at.pose = FF.POSES[e1[5]] || 'idle'; at.poseU = e1[6] / 255; const f = e1[7]; at.carry = f & 1 ? (f & 16 ? 'L' : 'R') : null; at.hot = f & 2 ? 1 : 0; at.dinged = f & 4 ? 1 : 0; at.helmetOff = !!(f & 8); at.fallBack = !!(f & 32);
    at.ctl = e1[8] === me && !N.server ? 0 : e1[8] >= 0 ? 'net:' + e1[8] : null;
    on.push(at);
  }
  m.on = on.filter(x => x.id < 40); m.extra = on.filter(x => x.id >= 40); for (const x of m.all) if (!ids.has(x.id)) x.onField = false;
  m.bySlot = [{}, {}]; for (const x of m.on) m.bySlot[x.side][x.slot] = x;
  const B = last.ball, bb = b.ball, ba = a.ball, BL = j => ba[j] + (bb[j] - ba[j]) * k; const ball = m.ball;
  ball.x = BL(0); ball.y = BL(1); ball.z = BL(2); ball.state = BSTATES[B[3]] || 'dead'; ball.holder = byId(m, B[4]); ball.to = B[5] ? { x: B[5], y: B[6] } : null; if (ball.state === 'pass' && ball.T === undefined) { ball.T = 1; ball.t = .5; } ball.type = 'lob';
  ball.vx = (bb[0] - ba[0]) * 14; ball.vy = (bb[1] - ba[1]) * 14;
};
N.mascotFor = (m, id) => { const s = id - 40; let a = m.extra.find(x => x.id === id); if (!a) { a = m.makeMascot(s); a.id = id; m.extra.push(a); } return a; };
/** the client re-fires the host's events locally (commentary, FX, the crowd) */
N.applyEvents = d => {
  const m = FF.match; if (!m || !d.ev) return;
  for (const e of d.ev) {
    if (e[0] <= N.seenEv) continue; N.seenEv = e[0];
    const name = FWD[e[1]], A = byId(m, e[2]), B = byId(m, e[3]), num = e[6], side = A ? A.side : num >= 10 ? num - 10 : m.poss;
    const ev = { m, player: A, tackler: A, defender: A, receiver: A, who: A, a: A, athlete: A, carrier: B || A, qb: B || A, victim: B || A, thrower: B, x: e[4], y: e[5], z: 14, ang: 0, yards: num, good: num === 1, side, team: m.teams[side], kind: e[7], card: e[7] || null, winner: m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1, score: m.score.slice() };
    if (name === 'final') m.over = true;
    try { bus.emit(name, ev); } catch (err) { game.fail('hub event', err); }
  }
};
// in a session the game builds the match when the round starts, with no menus before it
if (FF.inHub) { const prev = FF.scenes.match.enter; FF.scenes.match.enter = function (data) { prev.call(this, data); if (data && data.hub) N.onStart(FF.match); }; }
})();
