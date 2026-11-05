/* AI HUB (Session Protocol v1, shared world): straight into "HUB SHOWDOWN", two halves. The host's copy runs the match;
 * each other copy sends its player's stick, held buttons and button edges 15 times a second and renders the host's
 * snapshots (100 ms behind, interpolated; its own player predicted and pulled toward the host). Our own card, ready with no
 * key press, leaving players turn CPU, time-up and the end are handled here. Outside a session nothing here runs. */
const NET = { role: null, info: null, card: null, started: false, startAt: 0, seq: 0, edges: [], edgeId: 0, lastSnap: 0, snaps: [], seen: new Set(), over: false, ended: null, hostLeft: false, sentAt: 0, overlay: false, lastEdge: {}, finished: false, rx: 0, tx: 0 };
const STATES = ['run', 'air', 'jumpshot', 'layup', 'dunk', 'hang', 'knocked', 'spin', 'shove', 'steal', 'inbound'];
const BSTATES = ['dead', 'held', 'dribble', 'pass', 'shot', 'loose'];
const PHASES = ['tipoff', 'live', 'clockout', 'scored', 'inbound', 'break', 'sponsor', 'over'];
const EV_KEYS = ['type', 'slot', 'victim', 'name', 'victimName', 'dunkId', 'dunk', 'three', 'alleyoop', 'dist', 'kind', 'team', 'points', 'layup', 'jackpot', 'goaltend', 'id', 'perfect', 'rel', 'made', 'gold', 'hoop', 'shatter'];
const NET_EVENTS = new Set(['basket', 'block', 'steal', 'shove', 'ankles', 'posterized', 'supernovaOn', 'supernovaOff', 'shatter', 'reboot', 'twist', 'overtime', 'dunkStart', 'slam', 'rim', 'backboard', 'release', 'powerupPick', 'powerupSpawn', 'quarterEnd', 'halftime', 'gameEnd', 'tipoff', 'goaltend', 'caption', 'knockdown', 'shotClockViolation']);
const seatSlot = seat => [0, 2, 1, 3][seat];
function hubRoster(n) {
  const R = AIHub.rng('roster'), a = Math.floor(R() * 4); let b = Math.floor(R() * 3); if (b >= a) b++;
  return { home: STREET_TEAMS[a], away: STREET_TEAMS[b], court: get('team', STREET_TEAMS[a]).court, seed: Math.floor(R() * 1e9) };
}
async function hubBoot() {
  let info = null;
  try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; }
  if (!info) { S.hubFallback = true; go('title'); return; }
  NET.info = info; NET.role = info.server ? 'server' : info.isHost ? 'host' : 'client'; S.net = NET;
  AIHub.on('card', c => { NET.card = c; });
  AIHub.on('start', () => { NET.started = true; NET.cardDone = true; });
  AIHub.on('message', (d, from) => hubMessage(d, from));
  AIHub.on('leave', e => hubLeave(e));
  AIHub.on('time-up', () => { if (NET.role !== 'client') hubFinish(); });
  AIHub.on('end', e => { NET.ended = e || { reason: 'finished' }; A.music(null); musicName = null; Crowd.stop(); game.players.forEach(I => I.clear && I.clear()); });
  go('hub', {}, { fade: 0 });
  AIHub.ready();
  addEventListener('keydown', e => {   // the card's answers, straight from the keys (Enter: ready; T: more time)
    if (NET.cardDone || NET.ended) return;
    if (e.key === 'Enter') AIHub.answer('ready'); if (e.key === 't' || e.key === 'T') AIHub.answer('more');
  });
}
/** the match config every copy builds the same way (from AIHub.rng) */
function hubCfg() {
  const info = NET.info, ro = hubRoster(info.players.length), limit = info.limitMs ? info.limitMs / 1000 : 240, half = clamp(Math.floor((limit - 14) / 2), 12, 90);
  const humans = info.players.map((pl, seat) => {
    const slot = seatSlot(seat), mine = pl.id === info.me && NET.role !== 'server';
    return { slot, seat: pl.id, tag: (pl.name || 'P' + (seat + 1)).toUpperCase().slice(0, 8), color: pl.color || E.PLAYER_COLORS[seat], input: mine ? game.input : null, src: mine ? null : NetSource(pl.id) };
  });
  return { court: ro.court, mode: 'hub', teams: [{ id: ro.home }, { id: ro.away }], humans, quarter: half, periods: 2, difficulty: 'pro', powerups: true, twists: true, seed: ro.seed, cheats: {} };
}
SCENES.hub = {
  isMatch: true, view: 'broadcast', input: KEYS, pausable: false,
  enter() {
    S.scene = 'hub'; const cfg = hubCfg(); lastMatchCfg = cfg; startMatch(cfg); S.mode = 'hub';
    for (const p of S.players) if (p.seat !== undefined && !p.human) p.human = null;
    S.match.phase = 'tipoff'; S.match.hold = true;
    const court = get('court', cfg.court); if (NET.role !== 'server') { game.weather = court.weather ? Object.assign({}, court.weather) : null; music('menu'); }
    FX.focusX = XM;
    if (NET.role === 'host' || NET.role === 'server') AIHub.send({ t: 'r', home: cfg.teams[0].id, away: cfg.teams[1].id, court: cfg.court }, { reliable: true });
  },
  update(dt) {
    const m = S.match; if (!m) return;
    if (NET.ended) { cameraStep(dt); return; }
    // the session overlay (not a pause): Options/Esc, not while Create is held
    if (!NET.cardDone) return hubCardStep(dt);
    if (game.input.pressed('pause') && !(game.input.held && game.input.held.has('Pad8'))) NET.overlay = !NET.overlay;
    if (NET.overlay) hubOverlayStep();
    const t = AIHub.time();
    if (m.hold) { if (t >= 0) { m.hold = false; if (NET.role !== 'server') music(get('court', S.court).music); } else { cameraStep(dt); poseOnly(dt); return; } }
    if (NET.role === 'client') { clientStep(dt); return; }
    // host and server: run the world
    matchStep(dt);
    if (m.sudden) { m.suddenT = (m.suddenT || 0) + dt; if (m.suddenT > 30 && m.phase !== 'over') endGame(); }
    if (m.phase === 'over' && !NET.finished && m.overT > .8) hubFinish();
    if (NET.role !== 'server') { cameraStep(dt); Caption.update(dt); Crowd.update(dt, true); }
    hoopStep(dt, m.wind ? m.wind.x / Math.max(1, tune('windStrength')) : 0);
    if (game.real - NET.sentAt >= .066) { NET.sentAt = game.real; hostSend(); }
  },
  draw(r) {
    if (NET.role === 'server') { r.sky(['#05040a', '#0a0814', '#10101a']); r.overlay(g => { txt(g, 'HOSTING', r.W / 2, r.H / 2 - 8, UI.gold, 2, 'center'); const m = S.match; if (m) txt(g, teamName(0) + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + teamName(1), r.W / 2, r.H / 2 + 14, '#ffffff', 1, 'center'); }); return; }
    drawMatchWorld(r);
    r.overlay(g => {
      if (!NET.cardDone) return drawHubCard(g, r);
      drawHud(g, r);
      const t = AIHub.time();
      if (S.match.hold && t > -4) E.font.title(g, t < 0 ? String(Math.ceil(-t / 1000)) : 'BLAM!', r.W / 2, r.H * .35, { scale: 5, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 3, align: 'center' });
      if (NET.role === 'client' && game.real - NET.lastSnap > 1 && !NET.ended && !S.match.hold) txt(g, NET.hostLeft ? 'HOST LEFT' : 'WAITING FOR HOST', r.W / 2, r.H * .45, UI.gold, 2, 'center');
      if (NET.hostLeft) txt(g, 'HOST LEFT', r.W / 2, r.H * .45, UI.gold, 2, 'center');
      if (NET.ended) { const m = S.match; E.ui.box(g, r.W / 2 - 120, r.H * .3, 240, 60, { bg: '#140c24', border: UI.gold }); txt(g, 'FINAL', r.W / 2, r.H * .3 + 8, UI.gold, 2, 'center'); txt(g, teamName(0) + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + teamName(1), r.W / 2, r.H * .3 + 32, '#ffffff', 1, 'center'); }
      if (NET.overlay) drawHubOverlay(g, r);
    });
  }
};
function poseOnly(dt) { for (const p of S.players) poseAndBall(p, dt); }

/* ---- our card: the court at night, both crews lined up, names over the players they will control ---- */
function hubCardStep(dt) {
  const I = game.input;
  if (I.pressed('confirm')) AIHub.answer('ready');
  if (I.pressed('oop')) AIHub.answer('more');
  const cl = I.clicked(); if (cl && NET.cardBtns) { if (hitBox(cl, NET.cardBtns.ready)) AIHub.answer('ready'); if (hitBox(cl, NET.cardBtns.more)) AIHub.answer('more'); }
  cameraStep(dt); poseOnly(dt);
}
function drawHubCard(g, r) {
  const info = NET.info, c = NET.card || {}, sf = safe(r), m = S.match;
  px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a'));
  logo(g, r.W / 2, sf.y, 3, game.real);
  txt(g, 'HUB SHOWDOWN: ' + teamName(0) + ' VS ' + teamName(1) + ' AT ' + get('court', S.court).name, r.W / 2, sf.y + 34, UI.accent2, 1, 'center');
  txt(g, 'OUTSCORE THE OTHER CREW OVER TWO HALVES. NO FOULS!', r.W / 2, sf.y + 46, '#ffffff', 1, 'center');
  info.players.forEach((pl, k) => { const p = S.players[seatSlot(k)], ready = (c.ready || []).includes(pl.id), y = sf.y + 62 + k * 14; txt(g, (pl.name || 'P' + (k + 1)).toUpperCase().slice(0, 12), r.W / 2 - 10, y, pl.color || '#fff', 1, 'right'); txt(g, (p ? p.name + ' (' + teamName(p.team) + ')' : '') + (ready ? '  READY' : ''), r.W / 2 + 4, y, ready ? UI.good : UI.dim, 1); });
  const cpu = S.players.filter(p => p.seat === undefined).map(p => p.name); if (cpu.length) txt(g, 'CPU: ' + cpu.join(', '), r.W / 2, sf.y + 62 + info.players.length * 14, UI.dim, 1, 'center');
  const y2 = sf.y + 130;
  promptLine(g, '{move} RUN  {shoot} SHOOT  {turbo}+{shoot} DUNK  {pass} PASS/STEAL  {shove} SHOVE/SPIN  {oop} OOP', r.W / 2, y2, game.input, { align: 'center' });
  const left = c.paused ? 'PAUSED' : c.left != null ? 'STARTS IN ' + Math.ceil(c.left / 1000) : c.starting ? 'STARTING...' : '';
  txt(g, left, r.W / 2, y2 + 16, UI.gold, 2, 'center');
  if (NET.role !== 'server') {
    const bw = 110, by = y2 + 38; NET.cardBtns = { ready: [r.W / 2 - bw - 6, by, bw, 22], more: [r.W / 2 + 6, by, bw, 22] };
    E.ui.box(g, r.W / 2 - bw - 6, by, bw, 22, { bg: [UI.good, E.shade(UI.good, -.5)], border: '#ffffff' }); promptLine(g, '{confirm} READY', r.W / 2 - bw / 2 - 6, by + 6, game.input, { align: 'center' });
    E.ui.box(g, r.W / 2 + 6, by, bw, 22, { bg: c.asked ? [UI.gold, E.shade(UI.gold, -.5)] : '#2a1e44', border: '#ffffff' }); promptLine(g, (game.input.lastDevice === 'gamepad' ? '{oop}' : 'T') + ' MORE TIME', r.W / 2 + bw / 2 + 6, by + 6, game.input, { align: 'center' });
    if (c.asking) txt(g, c.asking + ' ASKED FOR MORE TIME', r.W / 2, by + 28, UI.dim, 1, 'center');
  }
}
/* ---- the session overlay: sound, voices, button symbols; the world keeps going ---- */
const HUB_OV = new FocusList([
  { label: 'SOUND', value: () => Math.round((game.settings.volume || 0) * 10) + '/10', side: d => game.settings.set('volume', clamp((game.settings.volume || 0) + d * .1, 0, 1)) },
  { label: 'VOICES', value: () => Math.round(setting('voiceVol') * 10) + '/10', side: d => game.settings.set('voiceVol', clamp(setting('voiceVol') + d * .1, 0, 1)) },
  { label: 'SYMBOLS', value: () => setting('symbols') === 'xbox' ? 'XBOX' : 'PLAYSTATION', side: () => game.settings.set('symbols', setting('symbols') === 'xbox' ? 'playstation' : 'xbox') },
  { label: 'CLOSE', onPick: () => { NET.overlay = false; } }
], { side: true, onBack: () => { NET.overlay = false; } });
function hubOverlayStep() { HUB_OV.update(1 / 120, [game.input]); }
function drawHubOverlay(g, r) { const w = 220, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .3); panel(g, x - 6, y - 24, w + 12, 4 * 20 + 30, 'SESSION'); HUB_OV.draw(g, x, y, w, 17, { scale: 1, gap: 3 }); }

/* ---- the host: snapshots out; inputs in ---- */
function hostSend() {
  const m = S.match, b = S.ball, R = Math.round;
  const ev = S.events.filter(e => NET_EVENTS.has(e.type) && e.t >= m.time - 1).slice(-6).map(e => EV_KEYS.filter(k => e[k] !== undefined && e[k] !== '' && e[k] !== false).reduce((o, k) => (o[k] = typeof e[k] === 'number' ? Math.round(e[k] * 10) / 10 : e[k], o), {}));
  const pl = S.players.map(p => {
    const st = STATES.indexOf(p.state);
    let xa = 0, xb = 0;
    if (p.state === 'dunk' && p.dunk) { xa = all('dunk').indexOf(p.dunk.def); xb = R(p.dunk.t / p.dunk.T * 100); }
    else if (p.jump && (p.state === 'jumpshot' || p.state === 'layup')) { xa = R(p.jump.t * 100); xb = R((p.jump.apexT || p.jump.relT || .3) * 100); }
    else if (p.state === 'air' && p.jump) xa = ['block', 'rebound', 'tip', 'shot', 'dunkfall'].indexOf(p.jump.kind);
    else if (p.act) xa = R(p.act.t * 100);
    else if (p.state === 'knocked') xa = R(p.knock * 100);
    const flags = (p.nova ? 1 : 0) | (p.reboot > 0 ? 2 : 0) | (p.cmd.tD ? 4 : 0) | (p.dizzy > 0 ? 8 : 0) | ((p.powerup ? POWERUPS.indexOf(p.powerup.id) + 1 : 0) << 4);
    return [R(p.x), R(p.y), R(p.z), R(p.vx), R(p.vy), R(p.facing * 100), st, xa, xb, R(p.turbo * 100), flags, p.dribSide, R(p.dribPh * 100), p.id];
  });
  const g = [PHASES.indexOf(m.phase), m.quarter, R(m.clock * 10), R(m.shotClock * 10), m.score[0], m.score[1], (m.sudden ? 1 : 0) | (m.gold === 0 ? 2 : 0) | (m.gold === 1 ? 4 : 0) | (HOOP_FX[0].shattered ? 8 : 0) | (HOOP_FX[1].shattered ? 16 : 0), m.streak.slot, m.streak.n, R(m.breakT || 0), R(m.overclock)];
  const tw = m.twist ? { w: m.wind ? [R(m.wind.x), R(m.wind.y)] : 0, b: (m.twist.bombs || []).filter(x => !x.hit).map(x => [R(x.x), R(x.y), R(x.t * 10), R(x.max * 10)]), s: m.twist.slicks ? m.twist.slicks.map(s => [R(s.x), R(s.y), R(s.rx), R(s.ry)]) : 0, v: m.twist.ventOn ? 1 : 0 } : 0;
  const msg = { t: 's', n: ++NET.seq, a: R(AIHub.time()), g, b: [R(b.x), R(b.y), R(b.z), R(b.vx), R(b.vy), R(b.vz), b.owner ? b.owner.slot : -1, BSTATES.indexOf(b.state)], p: pl, pu: m.powerups.map(x => [POWERUPS.indexOf(x.id), R(x.x), R(x.y)]), j: m.jackpot ? [R(m.jackpot.x), R(m.jackpot.y)] : 0, tw, ev };
  if (m.phase === 'over') msg.over = 1;
  AIHub.send(msg, { reliable: m.phase === 'over' });
}
function hubMessage(d, from) {
  NET.rx++;
  if (!d || typeof d !== 'object') return;
  if (d.t === 'i' && NET.role !== 'client') {   // a client's input
    const p = S.players.find(q => q.seat === from); if (!p || !p.src || p.src.kind !== 'net') return;
    const st = p.src.st, last = NET.lastEdge[from] || 0;
    st.mx = clamp((d.m && d.m[0] || 0) / 64, -1, 1); st.my = clamp((d.m && d.m[1] || 0) / 64, -1, 1); st.held = d.h | 0;
    for (const [id, bit, down] of d.e || []) if (id > last) { st.edges.push([bit, down]); NET.lastEdge[from] = Math.max(NET.lastEdge[from] || 0, id); }
  }
  if (d.t === 's' && NET.role === 'client') { NET.snaps.push(Object.assign(d, { at: game.real })); if (NET.snaps.length > 12) NET.snaps.shift(); NET.lastSnap = game.real; if (S.match && S.match.hold && d.g[0] !== 0) S.match.hold = false; }
}
function hubLeave(e) {
  if (!e) return;
  if (NET.info && e.id === NET.info.host) { NET.hostLeft = true; return; }
  const p = S.players.find(q => q.seat === e.id); if (p) { p.src = CpuSource(); p.brain = p.brain || newBrain(p); p.human = null; p.seat = undefined; p.tag = null; emit('leave', { slot: p.slot }); }
}
function hubFinish() {
  if (NET.finished || NET.role === 'client') return; NET.finished = true;
  const m = S.match; if (!m) return;
  if (m.phase !== 'over') { m.winner = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1; m.phase = 'over'; }
  hostSend();
  const humans = S.players.filter(p => p.seat !== undefined), ids = t => humans.filter(p => p.team === t).map(p => p.seat);
  const standings = m.winner < 0 ? [humans.map(p => p.seat)] : [ids(m.winner), ids(1 - m.winner)].filter(a => a.length);
  const scores = {}, stats = {}; for (const p of humans) { scores[p.seat] = m.score[p.team]; stats[p.seat] = { PTS: p.stats.PTS, DUNKS: p.stats.DNK, STL: p.stats.STL, BLK: p.stats.BLK }; }
  const awards = [];
  const best = (k, title, detail) => { const p = humans.slice().sort((a, b) => b.stats[k] - a.stats[k])[0]; if (p && p.stats[k] > 0) awards.push({ id: p.seat, title, detail: detail(p) }); };
  best('DNK', 'Dunk of the Round', p => p.stats.DNK + ' dunks'); best('STL', 'Pickpocket', p => p.stats.STL + ' steals'); best('BLK', 'The Wall', p => p.stats.BLK + ' blocks');
  const res = { standings, scores, stats, awards };
  if (humans.length === 1) res.won = m.winner === humans[0].team;
  try { AIHub.finish(res); } catch (e) { game.fail('hub finish', e); }
}

/* ---- a client: send the stick and buttons; render the host's world ---- */
const BITS = { shoot: 0, pass: 1, turbo: 2, shove: 3, oop: 4 };
function clientStep(dt) {
  const I = game.input, m = S.match;
  for (const [a, bit] of Object.entries(BITS)) { if (I.pressed(a)) NET.edges.push([++NET.edgeId, bit, 1]); if (I.released(a)) NET.edges.push([++NET.edgeId, bit, 0]); }
  if (NET.edges.length > 8) NET.edges.splice(0, NET.edges.length - 8);
  if (game.real - NET.sentAt >= .066) {
    NET.sentAt = game.real; const mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
    const h = (I.down('shoot') ? 1 : 0) | (I.down('pass') ? 2 : 0) | (I.down('turbo') ? 4 : 0);
    AIHub.send({ t: 'i', s: ++NET.seq, a: Math.round(AIHub.time()), m: [Math.round(d[0] * 64), Math.round(d[1] * 64)], h, e: NET.edges.slice() }, { reliable: false }); NET.tx++;
  }
  applySnapshots(dt);
  cameraStep(dt); Caption.update(dt); Crowd.update(dt, true); hoopStep(dt, 0);
}
function applySnapshots(dt) {
  const L0 = NET.snaps; if (!L0.length) { poseOnly(dt); return; }
  const target = game.real - .1; let a = L0[0], b = L0[L0.length - 1];
  for (let i = 0; i < L0.length - 1; i++) if (L0[i].at <= target && L0[i + 1].at >= target) { a = L0[i]; b = L0[i + 1]; break; }
  const u = b.at > a.at ? clamp((target - a.at) / (b.at - a.at), 0, 1) : 1, m = S.match, ball = S.ball, me = S.players.find(p => p.seat === NET.info.me);
  // the match
  const G = b.g; m.phase = PHASES[G[0]] || 'live'; m.quarter = G[1]; m.clock = G[2] / 10; m.shotClock = G[3] / 10; m.score = [G[4], G[5]]; m.sudden = !!(G[6] & 1); m.gold = G[6] & 2 ? 0 : G[6] & 4 ? 1 : null;
  HOOP_FX[0].shattered = !!(G[6] & 8); HOOP_FX[1].shattered = !!(G[6] & 16); m.streak = { slot: G[7], n: G[8] }; m.breakT = G[9]; m.overclock = G[10];
  if (m.phase === 'break') m.breakKind = m.quarter === 1 ? 'halftime' : 'quarter';
  // players
  b.p.forEach((pb, k) => {
    const p = S.players[k], pa = a.p[k] || pb; if (!p) return;
    if (pb[13] && pb[13] !== p.id) { const np = makePlayer(k, pb[13], p.team); Object.assign(np, { seat: p.seat, tag: p.tag, tagColor: p.tagColor, human: p.human, src: p.src }); S.players[k] = np; return; }
    const st = STATES[pb[6]] || 'run', x = lerp(pa[0], pb[0], u), y = lerp(pa[1], pb[1], u);
    if (p === me && st === 'run' && Math.hypot(p.x - x, p.y - y) < 48) {   // our own player: predicted from the stick, pulled toward the host
      const mv = game.input.move(), d = game.view.screenDirToGround(mv[0], mv[1]), sp = moveSpeed(p);
      p.vx = approach(p.vx, d[0] * sp, tune('accel') * dt); p.vy = approach(p.vy, d[1] * sp, tune('accel') * dt);
      p.x += p.vx * dt; p.y += p.vy * dt; p.x = lerp(p.x, x, .15); p.y = lerp(p.y, y, .15);
    } else { p.x = x; p.y = y; p.vx = pb[3]; p.vy = pb[4]; }
    p.z = lerp(pa[2], pb[2], u); p.facing = pb[5] / 100; p.state = st; p.turbo = pb[9] / 100; p.dribSide = pb[11] || 1; p.dribPh = pb[12] / 100;
    const fl = pb[10]; p.nova = fl & 1 ? (p.nova || { baskets: 0, t: 0 }) : null; p.reboot = fl & 2 ? 1 : 0; p.cmd.tD = !!(fl & 4); p.dizzy = fl & 8 ? 1 : 0; const pu = (fl >> 4) - 1; p.powerup = pu >= 0 ? { id: POWERUPS[pu], t: 10 } : null;
    p.dunk = st === 'dunk' ? { def: all('dunk')[pb[7]] || get('dunk', 'hammer'), t: pb[8] / 100, T: 1, slammed: pb[8] > 92, oop: false } : null;
    p.jump = st === 'jumpshot' || st === 'layup' ? { kind: 'shot', t: pb[7] / 100, apexT: pb[8] / 100, relT: pb[8] / 100 } : st === 'air' ? { kind: ['block', 'rebound', 'tip', 'shot', 'dunkfall'][pb[7]] || 'rebound', t: 0 } : null;
    p.act = st === 'shove' || st === 'steal' ? { kind: st, t: pb[7] / 100, T: .45 } : null;
    if (st === 'knocked') { p.knock = pb[7] / 100; p.st = Math.max(0, .8 - p.knock); }
  });
  // the ball
  const ba = a.b, bb = b.b; ball.owner = bb[6] >= 0 ? S.players[bb[6]] : null; ball.state = BSTATES[bb[7]] || 'loose';
  for (const p of S.players) poseAndBall(p, dt);
  if (!ball.owner) { ball.x = lerp(ba[0], bb[0], u); ball.y = lerp(ba[1], bb[1], u); ball.z = lerp(ba[2], bb[2], u); ball.vx = bb[3]; ball.vy = bb[4]; ball.vz = bb[5]; }
  ball.spin += Math.hypot(ball.vx, ball.vy) * dt * .15;
  // floor things and twists
  m.powerups = (b.pu || []).map(([i, x, y]) => ({ id: POWERUPS[i], x, y, t: 5 }));
  m.jackpot = b.j ? { x: b.j[0], y: b.j[1], t: 10 } : null;
  if (b.tw) { m.twist = m.twist || { kind: get('court', S.court).twist, bombs: [] }; m.wind = b.tw.w ? { x: b.tw.w[0], y: b.tw.w[1] } : null; m.twist.bombs = (b.tw.b || []).map(([x, y, t, mx]) => ({ x, y, t: t / 10, max: mx / 10 })); m.twist.slicks = b.tw.s ? b.tw.s.map(([x, y, rx, ry]) => ({ x, y, rx, ry })) : null; m.twist.ventOn = !!b.tw.v; }
  // events: each plays its sounds, captions and effects once
  for (const s of L0) for (const e of s.ev || []) if (!NET.seen.has(e.id)) { NET.seen.add(e.id); const ev = Object.assign({}, e); clientEvent(ev); }
}
function clientEvent(ev) {
  const t = ev.type;
  if (t === 'caption') return;
  const fake = Object.assign({}, ev); delete fake.id;
  if (t === 'slam') { const h = HOOPS[ev.hoop || (S.players[ev.slot] && S.players[ev.slot].team === 0 ? 1 : 0)]; if (h) dunkFx(S.players[ev.slot] || S.players[0], h, ev.shatter); }
  if (t === 'basket') sfxAt('swish');
  if (t === 'rim') sfxAt('rim');
  if (t === 'block') sfxAt('block'); if (t === 'steal') sfxAt('steal'); if (t === 'shove') sfxAt('shove');
  for (const fn of (LISTENERS[t] || []).slice()) { try { fn(fake); } catch (e) { /* a listener that needs host state */ } }
}
