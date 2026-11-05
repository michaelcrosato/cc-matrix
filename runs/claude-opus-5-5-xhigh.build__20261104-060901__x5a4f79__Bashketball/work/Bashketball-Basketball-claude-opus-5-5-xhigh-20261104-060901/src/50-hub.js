/* 50-hub: AI Hub sessions (Protocol v1, PLAN 15), "HUB SHOWDOWN". Straight into the round: our own card (the court,
 * both teams lined up, the hub's names over the players they control, ready marks, how to win, this device's controls,
 * the countdown), then two halves of 1:30 in one shared world run by the host. Seats 0 and 2 play for HOME, 1 and 3 for
 * AWAY; empty slots are CPU. Clients send their inputs (stick, held buttons, and each press and release once, by id,
 * repeated in the next messages so a lost packet loses nothing) 15 times a second; the host sends snapshots 15 times a
 * second; clients draw the world 100 ms in the past, predict their own player's running and play each event once. A
 * leaver's player turns CPU; the host finishes the round at the final horn or at time-up. Outside a session the game
 * is untouched. */
const NET = { info: null, role: 'local', mySlot: -1, seatSlot: {}, slotSeat: {}, names: {}, colors: {}, sendT: 0, seq: 0, edgeId: 0, edges: [], lastHeld: 0, inputs: {}, snaps: [], lastSnapAt: 0,
  played: new Set(), card: null, started: false, startAt: 0, ended: false, finished: false, hostLeft: false, sent: 0, rateT: 0, rate: 0, left: new Set(), roster: null, graceMs: 0, endReason: null };
const BITS = { shoot: 1, pass: 2, turbo: 4, shove: 8, oop: 16, taunt: 32 };
const NET_EVENTS = ['basket', 'dunk', 'dunkStart', 'block', 'steal', 'shove', 'knockdown', 'posterized', 'shatter', 'supernovaOn', 'supernovaOff', 'powerupSpawn', 'powerupPick', 'jackpot', 'twist', 'overclock', 'reboot', 'alleyoop', 'rim', 'quarterEnd', 'gameEnd', 'tipWin', 'anklesBroken', 'airball', 'goaltend', 'shotClockViolation', 'halftime', 'clutch', 'suddenBlam', 'oilSlip', 'bombHit'];
const STATES = ['run', 'gather', 'air', 'dunk', 'hang', 'knock', 'getup', 'spin', 'steal', 'shove', 'stumble', 'frozen', 'cele', 'taunt', 'inbound', 'idle'];
const BSTATES = ['held', 'pass', 'shot', 'loose', 'dead', 'dunk'], PHASES = ['tipoff', 'live', 'buzzer', 'dead', 'inbound', 'sponsor', 'break', 'over'], JKINDS = ['shot', 'layup', 'block', 'rebound', 'tip', 'drop'];
/** the roster: two different street crews from the hub's shared random stream; the court is HOME's */
function hubRoster() { const R = AIHub.rng('roster'), a = Math.floor(R() * 4); let b = Math.floor(R() * 3); if (b >= a) b++; return { home: STREET_TEAMS[a], away: STREET_TEAMS[b], seed: Math.floor(R() * 1e9) }; }
function seatToSlot(i) { return [0, 2, 1, 3][i]; }
async function hubBoot() {
  let info = null;
  try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
  if (!info) { HUB_OFF(); return; }
  NET.info = info; NET.role = info.server ? 'server' : info.isHost ? 'host' : 'client'; S.net.role = NET.role; S.net.seat = info.me;
  info.players.forEach((pl, i) => { const slot = seatToSlot(i); NET.seatSlot[pl.id] = slot; NET.slotSeat[slot] = pl.id; NET.names[slot] = String(pl.name || ('P' + (i + 1))).slice(0, 12).toUpperCase(); NET.colors[slot] = pl.color; });
  NET.mySlot = info.server ? -1 : NET.seatSlot[info.me];
  NET.roster = hubRoster();
  AIHub.on('card', c => { NET.card = c; });
  AIHub.on('start', () => { NET.started = true; });
  AIHub.on('message', (data, from) => hubMessage(data, from));
  AIHub.on('leave', e => hubLeave(e));
  AIHub.on('time-up', e => { NET.graceMs = e && e.graceMs; if (NET.role !== 'client') hubFinish(); });
  AIHub.on('end', e => { NET.ended = true; NET.endReason = e && e.reason; A.music(null); crowdStop(); for (const I of game.players) I.clear(); });
  game.go('hubcard', null, { fade: 0 });
  AIHub.ready();
}
/** a session that turned out not to be one (connect gave null): the game as it is on its own */
let HUB_OFF = () => {};
function hubMatchOpts() {
  const R = NET.roster, humans = [];
  if (NET.mySlot >= 0) humans.push([NET.mySlot, game.input]);
  return { court: get('team', R.home).court, home: R.home, away: R.away, quarterLen: 90, quarters: 2, halfLen: true, diff: [1, 1], powerups: true, twists: true, tipoff: true, mode: 'hub', seed: R.seed, humans };
}
/** the match in a session: host and server run it; clients mirror it */
function hubStartMatch() {
  const o = hubMatchOpts(); S.cheats = {};
  game.go('match', { match: o }, { fade: 0 });   // (matchEnter calls hubAssignSources once the match exists)
}
/** each hub player's slot: the host reads remote seats from the network (NetSource); every copy tags the humans */
function hubAssignSources() {
  for (const [slot, seat] of Object.entries(NET.slotSeat)) {
    const p = S.players[+slot]; if (!p) continue;
    p.human = [0, 2, 1, 3].indexOf(+slot);   // the seat's number: P1-P4 tags in the seat order
    if (+slot !== NET.mySlot && NET.role !== 'client') p.source = netSource(+seat);
  }
}
/* ---- inputs: client -> host ---- */
function heldBits(I) { let h = 0; for (const a in BITS) if (I.down(a)) h |= BITS[a]; return h; }
function hubCollectInput() {
  const I = game.input, h = heldBits(I);
  for (const a in BITS) { const b = BITS[a]; if ((h & b) !== (NET.lastHeld & b)) NET.edges.push([++NET.edgeId, b, h & b ? 1 : 0]); }
  NET.lastHeld = h; if (NET.edges.length > 8) NET.edges = NET.edges.slice(-8);
}
function hubSendInput() {
  const m = game.input.move(), d = game.view.screenDirToGround(m[0], m[1]);
  hubSend({ t: 'i', s: ++NET.seq, a: Math.round(AIHub.time()), m: [Math.round(d[0] * 64), Math.round(d[1] * 64)], h: NET.lastHeld, e: NET.edges.slice(-8) }, false);
}
function hubSend(data, reliable) { if (NET.ended) return; NET.sent++; try { AIHub.send(data, { reliable: !!reliable }); } catch (e) { game.fail('hub send', e); } }
/** a remote seat's player on the host: the stick and held bits, and each edge applied once, in order */
function netSource(seat) {
  const st = NET.inputs[seat] || (NET.inputs[seat] = { m: [0, 0], h: 0, last: 0, pending: [] });
  return { kind: 'net', seat, read() {
    const c = blankCmd(); let pressed = 0, released = 0;
    for (const [, bit, d] of st.pending) { if (d) pressed |= bit; else released |= bit; }
    st.pending = [];
    c.mx = st.m[0] / 64; c.my = st.m[1] / 64;
    c.shootD = !!(st.h & BITS.shoot) || (!!(pressed & BITS.shoot) && !(released & BITS.shoot));
    c.shootP = !!(pressed & BITS.shoot); c.shootR = !!(released & BITS.shoot); c.turboD = !!(st.h & BITS.turbo);
    c.passP = !!(pressed & BITS.pass); c.shoveP = !!(pressed & BITS.shove); c.oopP = !!(pressed & BITS.oop);
    return c;
  } };
}
/* ---- snapshots: host -> all ---- */
const r1 = v => Math.round(v);
function hubSnapshot() {
  const M = S.match, b = S.ball; if (!M) return null;
  const flags = (M.sudden ? 1 : 0) | (M.gold[0] ? 2 : 0) | (M.gold[1] ? 4 : 0) | (ARENA.hoops[0] && !ARENA.hoops[0].glass ? 8 : 0) | (ARENA.hoops[1] && !ARENA.hoops[1].glass ? 16 : 0) | (TWIST.windOn ? 32 : 0);
  const now = M.gameT, ev = S.events.filter(e => NET_EVENTS.includes(e.type) && now - e.t < 1).slice(-6).map(e => [e.eid, NET_EVENTS.indexOf(e.type), e.slot === undefined ? -1 : e.slot, e.vslot === undefined ? -1 : e.vslot, e.pts || 0, e.dunk ? DUNK_ORDER.indexOf(e.dunk) : e.id ? PU_ORDER.indexOf(e.id) : -1]);
  const pl = S.players.map(p => [r1(p.x), r1(p.y), r1(p.z), r1(p.vx), r1(p.vy), r1(p.facing * 100), STATES.indexOf(p.state), r1(p.st * 100), r1(p.turbo * 100),
    (p.nova > 0 ? 1 : 0) | (p.overclock > 0 ? 2 : 0) | (p.pu ? (PU_ORDER.indexOf(p.pu.id) + 1) << 2 : 0) | (p.dizzy > 0 ? 32 : 0) | (p.heat << 6), p.state === 'air' && p.jump ? JKINDS.indexOf(p.jump.kind) : p.state === 'dunk' && p.dunk ? DUNK_ORDER.indexOf(p.dunk.def.id) : -1,
    p.state === 'dunk' && p.dunk ? r1(p.dunk.t / p.dunk.T * 100) : p.jump && p.jump.released ? 1 : 0, p.def.id === S.teams[p.team].lineup[0] ? 0 : 1]);
  const w = [r1(TWIST.windX * 100), r1(TWIST.windY * 100), TWIST.spot ? r1(TWIST.spot.x) : 0, TWIST.spot ? r1(TWIST.spot.y) : 0, TWIST.vents.map(v => v.puff > 0 ? 2 : v.pre > 0 ? 1 : 0).join(''),
    POWERUPS.floor.map(u => [PU_ORDER.indexOf(u.id), r1(u.x), r1(u.y)]), TWIST.bombs.filter(x => x.t >= 0 && !x.hit).map(x => [r1(x.x), r1(x.y), r1(x.t * 10)])];
  return { t: 's', n: ++NET.seq, a: Math.round(AIHub.time()), g: [PHASES.indexOf(M.phase), M.quarter, r1(M.clock * 10), r1(M.shot * 10), M.score[0], M.score[1], M.poss, flags, r1(M.phaseT * 10), M.breakKind === 'half' ? 1 : 0],
    b: [r1(b.x), r1(b.y), r1(b.z), r1(b.vx), r1(b.vy), r1(b.vz), b.owner ? b.owner.slot : -1, BSTATES.indexOf(b.state)], p: pl, w, ev };
}
function hubMessage(data, from) {
  if (!data || typeof data !== 'object') return;
  if (data.t === 'i' && NET.role !== 'client') {
    const seat = from, st = NET.inputs[seat] || (NET.inputs[seat] = { m: [0, 0], h: 0, last: 0, pending: [] });
    if (data.s < (st.seq || 0)) return; st.seq = data.s; st.m = data.m || [0, 0]; st.h = data.h | 0;
    for (const e of data.e || []) if (e[0] > st.last) { st.last = e[0]; st.pending.push(e); }
  } else if (data.t === 's' && NET.role === 'client') {
    if (data.n <= (NET.lastN || 0)) return; NET.lastN = data.n; data.at = game.real; NET.snaps.push(data); if (NET.snaps.length > 6) NET.snaps.shift(); NET.lastSnapAt = game.real;
  } else if (data.t === 'k' && NET.role === 'client') { TWIST.slicks = (data.s || []).map(([x, y, r]) => ({ x, y, r, ph: 0 })); TWIST.oil = TWIST.slicks.length > 0; }
  else if (data.t === 'over' && NET.role === 'client') { NET.over = data; }
}
/** a client applies the snapshot of 100 ms ago, interpolating, and plays new events once */
function hubApplySnapshots(dt) {
  const L2 = NET.snaps; if (!L2.length || !S.match) return;
  const target = game.real - .1; let a = L2[0], b = L2[L2.length - 1];
  for (let i = 0; i < L2.length - 1; i++) if (L2[i].at <= target && L2[i + 1].at >= target) { a = L2[i]; b = L2[i + 1]; break; }
  const k = b.at > a.at ? clamp((target - a.at) / (b.at - a.at), 0, 1) : 1, M = S.match, G = b.g;
  M.phase = PHASES[G[0]] || 'live'; M.quarter = G[1]; M.clock = G[2] / 10; M.shot = G[3] / 10; M.score = [G[4], G[5]]; M.poss = G[6]; M.phaseT = G[8] / 10; M.sudden = !!(G[7] & 1); M.gold = [!!(G[7] & 2), !!(G[7] & 4)];
  if (M.phase === 'break') M.breakKind = G[9] ? 'half' : 'quarter';
  for (const i of [0, 1]) if (ARENA.hoops[i]) ARENA.hoops[i].glass = !(G[7] & (i ? 16 : 8));
  S.players.forEach((p, i) => {
    const pa = a.p[i], pb = b.p[i]; if (!pa || !pb) return;
    const lx = lerp(pa[0], pb[0], k), ly = lerp(pa[1], pb[1], k), lz = lerp(pa[2], pb[2], k), st = STATES[pb[6]] || 'run';
    if (p.slot === NET.mySlot && st === 'run' && p.state === 'run') { const d = dist2(p.x, p.y, lx, ly); if (d > 48) { p.x = lx; p.y = ly; } else { p.x = lerp(p.x, lx, .15); p.y = lerp(p.y, ly, .15); } }
    else { p.x = lx; p.y = ly; p.vx = pb[3]; p.vy = pb[4]; }
    p.z = lz; p.facing = E.lerpAng ? E.lerpAng(pa[5] / 100, pb[5] / 100, k) : pb[5] / 100; p.turbo = pb[8] / 100;
    if (p.state !== st) { p.state = st; } p.st = pb[7] / 100;
    p.nova = pb[9] & 1 ? 1 : 0; p.overclock = pb[9] & 2 ? 1 : 0; const pu = (pb[9] >> 2) & 7; p.pu = pu ? { id: PU_ORDER[pu - 1], t: 9 } : null; p.dizzy = pb[9] & 32 ? 1 : 0; p.heat = (pb[9] >> 6) & 3;
    if (st === 'air') { p.jump = p.jump || { kind: 'shot', tried: new Set() }; p.jump.kind = JKINDS[pb[10]] || 'drop'; p.jump.released = !!pb[11]; }
    if (st === 'dunk') { const def = get('dunk', DUNK_ORDER[pb[10]] || 'hammer'); p.dunk = { def, t: pb[11] / 100, T: 1, slammed: false }; }
    if (st === 'knock') p.kdT = Math.max(p.kdT || .8, p.st + .2);
  });
  const ba = a.b, bb = b.b, ball = S.ball;
  ball.x = lerp(ba[0], bb[0], k); ball.y = lerp(ba[1], bb[1], k); ball.z = lerp(ba[2], bb[2], k); ball.vx = bb[3]; ball.vy = bb[4]; ball.vz = bb[5];
  ball.state = BSTATES[bb[7]] || 'loose'; ball.owner = bb[6] >= 0 ? S.players[bb[6]] : null; ball.roll += Math.hypot(ball.vx, ball.vy) * dt;
  ball.trail.push([ball.x, ball.y, ball.z]); if (ball.trail.length > 8) ball.trail.shift();
  const W = b.w; TWIST.windX = W[0] / 100; TWIST.windY = W[1] / 100; TWIST.windOn = !!(G[7] & 32);
  if (TWIST.spot && W[2]) { TWIST.spot.x = W[2]; TWIST.spot.y = W[3]; }
  String(W[4] || '').split('').forEach((c, i) => { const v = TWIST.vents[i]; if (v) { v.puff = c === '2' ? 1 : 0; v.pre = c === '1' ? .5 : 0; } });
  POWERUPS.floor = (W[5] || []).map(([c, x, y]) => ({ id: PU_ORDER[c] || 'rocket', x, y, t: 5, born: 1 }));
  TWIST.bombs = (W[6] || []).map(([x, y, t]) => ({ x, y, t: t / 10, warn: 1.2, hit: false }));
  for (const e of b.ev) if (!NET.played.has(e[0])) { NET.played.add(e[0]); const type = NET_EVENTS[e[1]], p = S.players[e[2]], v = S.players[e[3]];
    const data = { slot: e[2], vslot: e[3], name: p ? p.name : '', victim: v ? v.name : '', pts: e[4], net: true };
    if (type === 'dunk' || type === 'dunkStart') { const def = get('dunk', DUNK_ORDER[e[5]] || 'hammer'); Object.assign(data, { dunk: def.id, banner: def.banner, lines: def.lines, bonus: def.bonus, x: p ? attackRim(p.team).x : CMX, y: CMY, z: RIM_Z, T: .8, apexT: .4 }); }
    if (type === 'powerupPick' || type === 'powerupSpawn') { data.id = PU_ORDER[e[5]] || 'rocket'; data.x = p ? p.x : CMX; data.y = p ? p.y : CMY; }
    if (type === 'basket') { data.team = p ? p.team : 0; data.kind = 'jumper'; data.three = e[4] === 3; }
    if (type === 'supernovaOn' || type === 'supernovaOff' || type === 'jackpot') data.team = p ? p.team : 0;
    if (type === 'twist') data.kind = 'gust';
    if (type === 'gameEnd') data.winner = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
    if (type === 'shatter') { data.x = BOARD_X[0]; data.y = CMY; data.z = 86; }
    try { emit(type, data); } catch (err) { game.fail('net event', err); }
  }
  if (NET.played.size > 400) NET.played = new Set([...NET.played].slice(-200));
}
/** the client's own player runs at once on its own stick (blended toward the host above) */
function hubPredict(dt) { const p = S.players[NET.mySlot]; if (!p || p.state !== 'run') return; const c = localSource(game.input).read(p); p.cmd = c; locomote(p, c, dt); p.x += p.vx * dt; p.y += p.vy * dt; clampToArena(p); }
function hubLeave(e) {
  const id = e && e.id; NET.left.add(id);
  if (NET.info && id === NET.info.host) { NET.hostLeft = true; return; }
  const slot = NET.seatSlot[id]; if (slot === undefined || !S.players[slot]) return;
  const p = S.players[slot]; if (NET.role !== 'client') { p.source = cpuSource(); } p.human = null; delete NET.slotSeat[slot];
}
/** the host finishes the round once: standings, scores, stats, awards */
function hubFinish() {
  if (NET.finished || !NET.info || NET.role === 'client') return; NET.finished = true;
  const M = S.match, sc = M ? M.score : [0, 0], w = sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : -1, ids = NET.info.players.map(p => p.id).filter(id => !NET.left.has(id));
  const team = id => S.players[NET.seatSlot[id]] ? S.players[NET.seatSlot[id]].team : 0;
  const standings = w < 0 ? [ids] : [ids.filter(id => team(id) === w), ids.filter(id => team(id) !== w)].filter(a => a.length);
  const scores = {}, stats = {}; for (const id of ids) { const p = S.players[NET.seatSlot[id]]; scores[id] = sc[team(id)]; if (p) stats[id] = { PTS: p.stats.PTS, DUNKS: p.stats.DNK, STL: p.stats.STL, BLK: p.stats.BLK }; }
  const best = (k, title, detail) => { const id = ids.slice().sort((a, b) => (stats[b] ? stats[b][k] : 0) - (stats[a] ? stats[a][k] : 0))[0]; return id !== undefined && stats[id] && stats[id][k] > 0 ? { id, title, detail: detail + ': ' + stats[id][k] } : null; };
  const awards = [best('DUNKS', 'Dunk of the Round', 'Dunks'), best('STL', 'Pickpocket', 'Steals'), best('BLK', 'Wall', 'Blocks')].filter(Boolean);
  const out = { standings, scores, stats, awards }; if (ids.length === 1) out.won = w === team(ids[0]);
  if (M && M.phase !== 'over') { M.phase = 'over'; M.phaseT = 0; M.winner = w; }
  hubSend({ t: 'over', score: sc }, true);
  try { AIHub.finish(out); } catch (e) { game.fail('hub finish', e); }
}
/** each step of a session match */
function hubStep(dt) {
  if (NET.ended) return true;
  NET.rateT += dt; if (NET.rateT >= 1) { NET.rate = NET.sent / NET.rateT; NET.sent = 0; NET.rateT = 0; }
  if (NET.role === 'client') {
    hubCollectInput(); NET.sendT += dt; if (NET.sendT >= .066) { NET.sendT = 0; hubSendInput(); }
    hubApplySnapshots(dt); hubPredict(dt); animAll(dt); updateArena(dt, TWIST.windOn ? TWIST.windX : 0); bannerStep(dt); cameraStep(dt, 1 / 120); crowdTick(1 / 120, true);
    return true;
  }
  // host or server: the world runs; a snapshot 15 times a second; the tip-off waits for the hub's clock
  if (!NET.started || AIHub.time() < 0) { if (S.match) { S.match.phaseT = 0; } animAll(dt); return true; }
  NET.sendT += dt; if (NET.sendT >= .066) { NET.sendT = 0; const s = hubSnapshot(); if (s) hubSend(s, false); }
  if (TWIST.oil && !NET.sentSlicks) { NET.sentSlicks = true; hubSend({ t: 'k', s: TWIST.slicks.map(s => [r1(s.x), r1(s.y), r1(s.r)]) }, true); }
  if (S.match && S.match.phase === 'over' && S.match.phaseT > 1.5) hubFinish();
  return false;
}
/* ---- our own card ---- */
SC.hubcard = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { this.preview = !!(d && d.preview); playMusic('menu'); const R = this.preview ? { home: 'hightops', away: 'breakers' } : NET.roster; setupArena(get('team', R.home).court); this.rigs = [R.home, R.away].map((tid, team) => get('team', tid).players.slice(0, 2).map((pid, k) => ({ team, k, slot: team * 2 + k, rig: dressPlayer(get('player', pid), tid) }))).flat(); this.R = R; this.t = 0; },
  update(dt) {
    this.t += dt; updateArena(dt); game.focus(CMX, CMY, 0); game.cam.offset = [0, Math.round(game.H * .08)];
    for (const a of this.rigs) a.rig.update(dt, { x: CMX + (a.team ? 1 : -1) * (40 + a.k * 44), y: CMY + (a.k ? 30 : -10), z: 0, facing: a.team ? PI : 0, pose: 'hips' });
    const nav = navInput(), I = game.input;
    if (this.preview) { if (nav.cancel || nav.confirm) gotoScreen('menu'); return; }
    if (NET.started) { hubStartMatch(); return; }
    if (nav.confirm || (nav.click && this.readyRect && inRect(nav.click, this.readyRect))) { try { AIHub.answer('ready'); } catch (e) { game.fail('hub answer', e); } sfx('confirm'); }
    if (I.pressed('oop') || I.pressed('more') || (nav.click && this.moreRect && inRect(nav.click, this.moreRect))) { try { AIHub.answer('more'); } catch (e) { game.fail('hub answer', e); } sfx('select'); }
  },
  draw(r) {
    drawArena(r);
    for (const a of this.rigs) { const x = CMX + (a.team ? 1 : -1) * (40 + a.k * 44), y = CMY + (a.k ? 30 : -10); r.shadow(x, y, 7, .4); r.actor(x, y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view));
      const name = this.preview ? (a.slot === 0 ? 'YOU' : 'CPU') : NET.names[a.slot] || 'CPU', col = this.preview ? (a.slot === 0 ? '#e8443a' : '#9a8fb8') : NET.colors[a.slot] || '#9a8fb8';
      r.queue(x, y, 70, g => { const [sx, sy] = r.w(x, y, 66); E.font.text(g, name, Math.round(sx), Math.round(sy) - 8, col, { align: 'center', outline: '#000' }); const id = NET.slotSeat[a.slot]; if (NET.card && NET.card.ready && NET.card.ready.includes(id)) E.font.text(g, 'READY ★', Math.round(sx), Math.round(sy) + 1, '#5aff7a', { align: 'center', outline: '#000' }); }, { emissive: true }); }
    r.overlay(g => {
      const cx = Math.round(r.W / 2), R = this.R; px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, r.W, 52, '#1a0c2a'));
      drawLogo(g, r, cx - 6, 4, 2);
      E.font.text(g, 'HUB SHOWDOWN: ' + get('team', R.home).short + ' VS ' + get('team', R.away).short, cx, 36, '#fff', { align: 'center', outline: '#000' });
      E.font.text(g, 'OUTSCORE THE OTHER CREW OVER TWO HALVES. NO FOULS!', cx, 46, UIC.gold, { align: 'center', outline: '#000' });
      const C = NET.card, left = C && C.left !== null && C.left !== undefined ? Math.ceil(C.left / 1000) : null;
      E.font.text(g, C && C.paused ? 'PAUSED: SOMEONE WANTS MORE TIME' : C && C.starting ? 'STARTING!' : left !== null ? 'TIP-OFF IN ' + left : this.preview ? 'CARD PREVIEW' : 'WAITING FOR PLAYERS', cx, r.H - 70, '#fff', { align: 'center', scale: 1, outline: '#000' });
      promptLine(g, '{move} MOVE {shoot} SHOOT {pass} PASS {turbo} TURBO {shove} SHOVE {oop} OOP', cx, r.H - 56, { align: 'center' });
      this.readyRect = drawButton(g, cx - 104, r.H - 42, 100, 20, 'READY', { focus: true, center: true });
      this.moreRect = drawButton(g, cx + 4, r.H - 42, 100, 20, C && C.asked ? 'MORE TIME ★' : 'MORE TIME', { center: true });
      promptLine(g, '{confirm} READY    {oop} / T MORE TIME', cx, r.H - 16, { align: 'center' });
    });
  }
};
/** the small session overlay (Options or Esc): volumes and button symbols, never pausing the world */
const HUBMENU = { open: false, i: 0, rects: [] };
function hubMenuUpdate() {
  const I = game.input; if (!HUB) return false;
  if (I.pressed('pause') && !I.held.has('Pad8')) { HUBMENU.open = !HUBMENU.open; consumeNav(); return true; }
  if (!HUBMENU.open) return false;
  const nav = navInput(), items = HUBMENU_ITEMS(), r = listNav(HUBMENU, items, nav);
  const it = items[HUBMENU.i];
  if (nav.left || nav.right) { const d = nav.left ? -.1 : .1; if (it.key === 'volume') game.settings.set('volume', clamp((game.settings.volume || .7) + d, 0, 1)); if (it.key === 'voiceVol') game.settings.set('voiceVol', clamp((game.settings.voiceVol || .8) + d, 0, 1)); if (it.key === 'glyphs') game.settings.set('glyphs', glyphStyle() === 'xbox' ? 'playstation' : 'xbox'); }
  if (r.picked >= 0 && it.key === 'close' || r.cancel) HUBMENU.open = false;
  if (r.picked >= 0 && it.key === 'glyphs') game.settings.set('glyphs', glyphStyle() === 'xbox' ? 'playstation' : 'xbox');
  return true;
}
const HUBMENU_ITEMS = () => [{ key: 'volume', label: 'SOUND ← ' + Math.round((game.settings.volume === undefined ? .7 : game.settings.volume) * 10) + ' →' }, { key: 'voiceVol', label: 'VOICES ← ' + Math.round((game.settings.voiceVol === undefined ? .8 : game.settings.voiceVol) * 10) + ' →' }, { key: 'glyphs', label: 'BUTTONS: ' + (glyphStyle() === 'xbox' ? 'XBOX' : 'PLAYSTATION') }, { key: 'close', label: 'CLOSE' }];
function hubOverlay(g, r) {
  if (NET.role === 'server') { E.font.text(g, 'HOSTING', Math.round(r.W / 2), Math.round(r.H / 2), '#fff', { align: 'center', scale: 2, outline: '#000' }); return; }
  if (NET.hostLeft) { E.ui.box(g, Math.round(r.W / 2) - 70, Math.round(r.H * .4), 140, 24, { bg: '#3a0a0a', border: '#ff5a3a' }); E.font.text(g, 'HOST LEFT', Math.round(r.W / 2), Math.round(r.H * .4) + 8, '#fff', { align: 'center', outline: false }); }
  else if (NET.role === 'client' && NET.started && game.real - NET.lastSnapAt > 1 && !NET.ended) E.font.text(g, 'WAITING FOR HOST', Math.round(r.W / 2), Math.round(r.H * .4), '#fff', { align: 'center', outline: '#000' });
  if (NET.started && AIHub.time() < 0) E.font.title(g, String(Math.ceil(-AIHub.time() / 1000)), Math.round(r.W / 2), Math.round(r.H * .3), { align: 'center', scale: 4, colors: BANNER_COLORS.dunk });
  if (NET.ended) { E.ui.box(g, Math.round(r.W / 2) - 90, Math.round(r.H * .64), 180, 30, { bg: '#140c24', border: UIC.gold }); E.font.text(g, 'ROUND OVER  ' + S.match.score[0] + ' - ' + S.match.score[1], Math.round(r.W / 2), Math.round(r.H * .64) + 11, '#fff', { align: 'center', outline: false }); }
  if (HUBMENU.open) { const x = Math.round(r.W / 2) - 70; E.ui.box(g, x - 6, 50, 152, 100, { bg: '#140c24', border: UIC.gold }); HUBMENU.rects = HUBMENU_ITEMS().map((it, i) => drawButton(g, x, 56 + i * 22, 140, 18, it.label, { focus: HUBMENU.i === i })); }
}
