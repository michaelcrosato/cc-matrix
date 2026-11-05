/* ---- AI HUB SESSIONS (shared world, 1 to 4 seats). The host's copy runs the match. Every other copy sends its player's
 * stick and buttons to the host (reliable, about 16 packets a second), and shows the host's snapshots (unreliable, 15 a
 * second): the skaters, the goalies, the puck, the score, the clock, the booth's lines and the sounds. Outside a session
 * (AIHub.active false) none of this runs. ---- */
/** a seat's input as the host has it: the stick from the last packet, the presses since the host last read them */
class RemoteInput {
  constructor() { this.mv = [0, 0]; this.held = new Set(); this.edges = new Set(); this.lastDevice = 'gamepad'; }
  apply(msg) { this.mv = msg.mv || [0, 0]; this.held = new Set(msg.held || []); for (const e of msg.edges || []) this.edges.add(e); }
  move() { return this.mv; }
  down(a) { return this.held.has(a); }
  pressed(a) { if (this.edges.has(a)) { this.edges.delete(a); return true; } return false; }
  released(a) { if (a === 'shoot' && this.edges.has('shootUp')) { this.edges.delete('shootUp'); return true; } return false; }
  consume(a) { this.edges.delete(a); }
  consumeAll() { this.edges.clear(); }
  label(a) { return game.input.label(a); }
}
const Net = { on: false, host: false, me: -1, n: 0, live: false, ended: false, finished: false, remote: [], latest: null, lastSeq: -1, sseq: 0,
  sendT: 0, overT: 0, pending: new Set(), cfg: null, info: null };
const NET_HELD = ['pass', 'shoot', 'deke', 'lob', 'turbo', 'chirp', 'switch'];
const NET_EDGES = ['pass', 'shoot', 'deke', 'lob', 'switch', 'chirp'];
/** every step: the local player's presses, kept until the next packet (a press is never lost between packets) */
function netSample() {
  const I = game.players[0];
  if (!I || Net.me < 0) return;
  for (const a of NET_EDGES) if (I.pressed(a)) Net.pending.add(a);
  if (I.released('shoot')) Net.pending.add('shootUp');
}
function netSendIntent() {
  const I = game.players[0];
  if (!I || Net.me < 0) return;
  const held = NET_HELD.filter(a => I.down(a));
  AIHub.send({ t: 'in', mv: I.move(), held, edges: [...Net.pending] }, { reliable: true });
  Net.pending.clear();
}
/** the host's picture of the match, for every other copy */
function netSnapshot() {
  const sk = M.skaters, pk = M.puck;
  return { t: 'snap', seq: ++Net.sseq, ph: M.phase, ck: +M.clock.toFixed(1), per: M.period, ot: M.ot, ov: !!M.over, sc: M.score.slice(), bo: M.boom.slice(), kb: M.kab.map(v => +v.toFixed(1)),
    sk: sk.map(k => [Math.round(k.x * 10) / 10, Math.round(k.y * 10) / 10, Math.round(k.vx), Math.round(k.vy), Math.round(k.face * 100), k.state, k.charge ? +k.charge.toFixed(2) : 0]),
    gl: M.goalies.map(g => [Math.round(g.x * 10) / 10, Math.round(g.y * 10) / 10, g.state]),
    pk: [Math.round(pk.x * 10) / 10, Math.round(pk.y * 10) / 10, Math.round(pk.z * 10) / 10, pk.owner ? sk.indexOf(pk.owner) : -1, !!pk.inNet],
    ban: M.banner, bt: +M.bannerT.toFixed(2), fi: M.fight ? [sk.indexOf(M.fight.a), sk.indexOf(M.fight.b), +M.fight.A.bal.toFixed(1), +M.fight.B.bal.toFixed(1), +M.fight.A.stam.toFixed(0), +M.fight.B.stam.toFixed(0), M.fight.A.act ? M.fight.A.act.name : '', M.fight.B.act ? M.fight.B.act.name : '', +M.fight.t.toFixed(1), M.fight.last || ''] : null,
    ev: (M.evq || []).slice(0, 12), say: (M.sayq || []).slice(0, 4),
    its: (M.items || []).filter(i => !i.taken).map(i => [i.kind, Math.round(i.x), Math.round(i.y), Math.round(i.z), i.landed ? 1 : 0]),
    mas: M.mascot ? [Math.round(M.mascot.x), Math.round(M.mascot.y), +M.mascot.down.toFixed(1), +M.mascot.wave.toFixed(1)] : null,
    slp: (M.slips || []).map(s => [s.x, s.y, s.r]), thn: (M.thin || []).map(p => [p.integ, p.hole ? 1 : 0]) };
}
/** a snapshot, applied to this copy's own match (it doesn't simulate: it shows the host's) */
function netApply(m) {
  M.phase = m.ph; M.clock = m.ck; M.period = m.per; M.ot = m.ot; M.score = m.sc; M.boom = m.bo; M.kab = m.kb;
  m.sk.forEach((a, i) => { const k = M.skaters[i]; if (!k) return; k.x = a[0]; k.y = a[1]; k.vx = a[2]; k.vy = a[3]; k.face = a[4] / 100; k.state = a[5]; k.charge = a[6]; });
  m.gl.forEach((a, i) => { const g = M.goalies[i]; if (!g) return; g.x = a[0]; g.y = a[1]; g.state = a[2]; });
  const pk = M.puck; pk.x = m.pk[0]; pk.y = m.pk[1]; pk.z = m.pk[2]; pk.owner = m.pk[3] >= 0 ? M.skaters[m.pk[3]] : null; pk.inNet = m.pk[4];
  M.banner = m.ban; M.bannerT = m.bt;
  M.fight = m.fi ? { a: M.skaters[m.fi[0]], b: M.skaters[m.fi[1]], A: { bal: m.fi[2], stam: m.fi[4], act: m.fi[6] ? { name: m.fi[6] } : null }, B: { bal: m.fi[3], stam: m.fi[5], act: m.fi[7] ? { name: m.fi[7] } : null }, t: m.fi[8], last: m.fi[9] } : null;
  M.items = m.its.map(([kind, x, y, z, landed]) => ({ kind, x, y, z, landed: !!landed, life: 5, t: 1, x0: x, y0: y, x1: x, y1: y, u: 1, vx: 0, vy: 0, taken: false }));
  if (m.mas) { M.mascot = M.mascot || { x: 0, y: 0, down: 0, wave: 0 }; M.mascot.x = m.mas[0]; M.mascot.y = m.mas[1]; M.mascot.down = m.mas[2]; M.mascot.wave = m.mas[3]; }
  M.slips = m.slp.map(([x, y, r]) => ({ x, y, r })); (M.thin || []).forEach((p, i) => { if (m.thn[i]) { p.integ = m.thn[i][0]; p.hole = !!m.thn[i][1]; } });
  M.evq = []; for (const e of m.ev) fx(e);
  M.sayq = []; for (const line of m.say) talkSay(line);
  if (m.ov && !M.over) { M.over = true; M.phase = 'over'; M.timer = 0; }
}
/** the start: the teams and the arena from the hub's seed (the same on every copy), a seat for each player */
function netStart() {
  const rng = AIHub.rng('teams'), n = Net.n;
  const home = Math.floor(rng() * TEAMS.length), away = (home + 1 + Math.floor(rng() * (TEAMS.length - 1))) % TEAMS.length, arena = Math.floor(rng() * ARENAS.length);
  const inputs = [];
  for (let i = 0; i < n; i++) {
    if (Net.host) { Net.remote[i] = Net.remote[i] || new RemoteInput(); inputs.push(i === Net.me ? game.players[0] : Net.remote[i]); }
    else inputs.push(i === Net.me ? game.players[0] : null);
  }
  Net.cfg = { teams: [home, away], arena, humans: n, seed: 1 + Math.floor(rng() * 1e6), mode: 'session', inputs };
  Net.live = true; Net.finished = false; Net.ended = false; Net.lastSeq = -1; Net.latest = null; Net.overT = 0; Net.sendT = 0;
  game.go('match', { cfg: Net.cfg }, { fade: 'iris' });
}
/** the host's end: the standings (the winning side's seats first), each seat's goals */
function netFinish() {
  if (Net.finished || !M) return;
  Net.finished = true;
  if (!M.over) { M.over = true; M.phase = 'over'; }
  const w = M.soWinner !== undefined ? M.soWinner : (M.score[0] > M.score[1] ? 0 : 1);
  const seatsOf = t => M.humans.filter(h => h.sk.t === t).map(h => h.i);
  const standings = [seatsOf(w), seatsOf(1 - w)].filter(a => a.length);
  const scores = {};
  for (const h of M.humans) scores[h.i] = M.score[h.sk.t];
  AIHub.finish({ standings, scores, won: w === 0 });
}
/** the match's own frame in a session: the host steps the match and sends it; the others show it and send their stick */
function netMatchUpdate(dt) {
  if (!M) return;
  if (Net.host) {
    matchStep(dt); rigsStep(dt); talk.update(dt);
    Net.sendT -= dt;
    if (Net.sendT <= 0) { Net.sendT = .066; AIHub.send(netSnapshot(), { reliable: false }); M.evq = []; M.sayq = []; }
    if (M.over) netFinish();
  } else {
    if (!Net.ended) netSample();
    if (Net.latest && Net.latest.seq !== Net.lastSeq) { Net.lastSeq = Net.latest.seq; netApply(Net.latest); }
    rigsStep(dt); talk.update(dt);
    Net.sendT -= dt;
    if (Net.sendT <= 0) { Net.sendT = .06; netSendIntent(); }
  }
  if (M.over) {
    Net.overT += dt;
    if (Net.overT > 3 || Net.ended) {
      Net.live = false; lastResult = { mode: 'session', home: M.teams[0].def.name, away: M.teams[1].def.name, score: M.score[0] + ' - ' + M.score[1], won: M.score[0] > M.score[1], stars: [] };
      game.go('results', null, { fade: 'iris' });
    }
  }
}
/** the hub's messages: a seat's stick (the host), the host's snapshot (the others) */
function netMessage(data, from) {
  if (!data) return;
  if (data.t === 'in' && Net.host && Net.remote[from]) Net.remote[from].apply(data);
  else if (data.t === 'snap' && !Net.host) Net.latest = data;
}
/** a player left: their seat goes to the CPU (the host), and the round goes on */
function netLeave(id) {
  if (!M || !Net.host) return;
  const h = M.humans.find(x => x.i === id);
  if (!h) return;
  h.sk.human = null; M.humans = M.humans.filter(x => x !== h); if (Net.remote[id]) Net.remote[id].held.clear();
}
/** the hub's connection: the host's copy, the seats, the start; no hub, the game runs as it does on its own */
function netConnect() {
  AIHub.connect({ mode: 'shared-world', seats: [1, 4] }).then(info => {
    if (!info) { game.go('title'); return; }
    Net.on = true; Net.info = info; Net.host = !!info.isHost; Net.me = info.server || info.me === undefined ? -1 : info.me; Net.n = info.players.length;
    AIHub.ready();
    AIHub.on('start', () => netStart());
    AIHub.on('message', (data, from) => netMessage(data, from));
    AIHub.on('leave', ({ id }) => netLeave(id));
    AIHub.on('time-up', () => { if (Net.host) netFinish(); });
    AIHub.on('end', ({ reason }) => { Net.ended = true; if (reason === 'void' || reason === 'host-left') { Net.live = false; } if (M && !M.over) { M.over = true; M.phase = 'over'; M.timer = 0; } });
  });
}
/** the session's own scene: the hub's card is up; this shows the round's waiting for its start */
scenes.session = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { M = null; game.follow(null); },
  update() { },
  draw(r) { r.sky(['#0e1630', '#1e3050', '#2e5a3a']); r.overlay(g => E.font.text(g, 'WAITING FOR THE FACEOFF', r.W / 2, r.H / 2, '#fffbe8', { align: 'center', outline: '#000' })); }
};
