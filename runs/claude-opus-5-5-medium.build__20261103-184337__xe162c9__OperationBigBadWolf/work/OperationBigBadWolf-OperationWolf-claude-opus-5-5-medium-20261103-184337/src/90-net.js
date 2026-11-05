// AI Hub sessions (Session Protocol v1, mode shared-world, 1-4 players): the game's own card, the host's sim, the
// clients' mirror, a compact codec under the packet size, a rate limiter, finish, leave, time-up and end.
(() => {
const E = My3D2dge, WP = globalThis.WP, H = WP.hub, px = E.px;
const Net = WP.Net = { state: { phase: H ? 'connecting' : 'off' }, inputs: {}, seq: 0, ended: false, finished: false, card: null, info: null, tokens: 18, lastTok: 0, sent: 0, snaps: [], evq: [], hits: {} };
if (!H) { Net.addScenes = () => {}; return; }
const TYPES = Object.keys(WP.TYPES), TIDX = Object.fromEntries(TYPES.map((k, i) => [k, i]));
const TELE = ['', 'ring', 'glint', 'throw', 'glow', 'whistle'], PK = Object.keys(WP.PICK_SPR);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const ascii = s => /^[\x20-\x7e]{1,12}$/.test(s || '') ? String(s).toUpperCase() : null;
// ---------------------------------------------------------------------------------------------- the rate limiter (mirrors the client's 20/s, bursts of 40; we keep under 18)
Net.send = (data, reliable) => {
  if (Net.ended) return false;
  const t = now(); Net.tokens = Math.min(18, Net.tokens + (t - Net.lastTok) / 1000 * 18); Net.lastTok = t;
  if (Net.tokens < 1) return false; Net.tokens -= 1;
  const s = JSON.stringify(data); if (s.length > 16000) throw new Error('message over 16 KB');
  if (!reliable && s.length > 1100) return false;
  Net.sent++; return H.send(data, { reliable: !!reliable });
};
// ---------------------------------------------------------------------------------------------- the codec: a snapshot under 1100 bytes
const q = v => Math.round(v);
Net.encodeEnt = (sim, e) => {
  let fl = (e.dead ? 1 : 0) | (e.pose === 'crouch' ? 2 : 0) | (e.pose === 'kneel' ? 4 : 0) | (e.hidden ? 8 : 0) | (e.chute ? 16 : 0) | (e.firing > 0 ? 32 : 0) | (e.gunner && e.gunner.dead ? 64 : 0) | (e.gunner2 && e.gunner2.dead ? 128 : 0) | (e.panic > 0 ? 256 : 0) | (e.wounded ? 512 : 0) | (e.grabbedBy ? 1024 : 0) | (e.fled ? 2048 : 0) | (e.cam ? 4096 : 0);
  const tl = e.tele ? [TELE.indexOf(e.tele.kind), q(e.tele.t / e.tele.max * 99), e.tele.pid] : 0;
  const pos = e.cam ? [q(e.lx), q(e.dz), q(e.zr ? e.lz : e.z)] : [q(e.x), q(e.y), q(e.z)];
  const a = [e.id, TIDX[e.type], pos[0], pos[1], pos[2], q(((e.facing || 0) % 6.2832 + 6.2832) % 6.2832 * 10), fl, e.max ? q(Math.max(0, e.hp) / e.max * 99) : 99, tl];
  if (e.kind === 'pickup') a.push(PK.indexOf(e.pk), q(e.life * 10));
  else if (e.kind === 'animal') a.push(e.carry ? PK.indexOf(e.carry) : -1);
  else if (e.clip) a.push(e.clip.map(q));
  else if (e.coverTop !== undefined) a.push(q(e.coverTop));
  return a;
};
Net.snapshot = sim => {
  const ps = sim.players.map(p => [p.pid, q(p.x), q(p.y), q(p.damage), p.mag, p.spares.length, p.grenades, p.score, (p.down ? 1 : 0) | (p.reload > 0 ? 2 : 0) | (p.fury > 0 ? 4 : 0), p.mult]);
  const live = sim.ents.filter(e => !(e.kind === 'prop' && !e.dead && e.hp === e.max));
  const pri = e => (e.kind === 'projectile' ? 0 : e.tele ? 1 : e.kind === 'boss' ? 2 : e.kind === 'prop' ? 6 : 3);
  live.sort((a, b) => pri(a) - pri(b));
  Net.rr = (Net.rr || 0) + 1;
  const msg = { k: 's', t: q(sim.t * 100), d: q(sim.d), p: sim.part === 'B' ? 1 : 0, tb: q(sim.tB * 100), q: sim.q, ps, ids: sim.ents.map(e => e.id), e: [], h: [sim.host.n, sim.host.saved, sim.host.lost], sp: sim.spotted > 0 ? 1 : 0, fl: sim.flare > 0 ? 1 : 0, ob: sim.objective ? sim.objective.have : 0 };
  if (sim.boss) { const b = sim.boss; msg.b = [b.id, b.phase, b.parts.map(p => p.dead ? -1 : q(p.hp)), b.tusk ? [q(b.tusk.x), q(b.tusk.y), b.tusk.shieldDown > 0 ? 1 : 0, b.tusk.knocked > 0 ? 1 : 0] : 0, b.flame ? b.flame.side : 0, b.vent ? 1 : 0, b.dead ? 1 : 0]; }
  let size = JSON.stringify(msg).length;
  // the most urgent first, then the rest in turns, until the size guard
  const rest = live.slice(); const urgent = rest.filter(e => pri(e) < 3); const others = rest.filter(e => pri(e) >= 3);
  const n = others.length, off = n ? (Net.rr * 7) % n : 0, order = urgent.concat(others.slice(off), others.slice(0, off));
  for (const e of order) { const a = Net.encodeEnt(sim, e), s = JSON.stringify(a).length + 1; if (size + s > 1050) break; msg.e.push(a); size += s; }
  return msg;
};
// ---------------------------------------------------------------------------------------------- the client's mirror: a Sim never stepped, filled from snapshots
Net.makeMirror = (op, players) => { const m = new WP.Sim({ op, players, seed: 1, session: true, hostages: 5, perks: {} }); m.events.length = 0; m.mirror = true; return m; };
Net.apply = (m, s) => {
  const t = now();
  m.part === 'A' && s.p === 1 && m.startPartB(); m.events.length = 0;
  m.prevD = m.d; m.prevTB = m.tB; m.d = s.d; m.tB = s.tb / 100; m.t = s.t / 100; m.q = s.q; m.snapT = t; m.prevT = m.lastT || t; m.lastT = t;
  m.host.n = s.h[0]; m.host.saved = s.h[1]; m.host.lost = s.h[2]; m.spotted = s.sp ? 1 : 0; m.flare = s.fl ? 1 : 0; if (m.objective) m.objective.have = s.ob;
  for (const a of s.ps) { const p = m.players.find(x => x.pid === a[0]); if (!p) continue; if (a[0] !== Net.me) { p.tx = a[1]; p.ty = a[2]; } p.damage = a[3]; p.mag = a[4]; if (p.spares.length !== a[5]) p.spares = Array(a[5]).fill(WP.T.magSize); p.grenades = a[6]; p.score = a[7]; p.down = !!(a[8] & 1); p.reload = a[8] & 2 ? .5 : 0; p.fury = a[8] & 4 ? 1 : 0; p.mult = a[9]; }
  const ids = new Set(s.ids);
  m.ents = m.ents.filter(e => { if (!ids.has(e.id)) { m.byId.delete(e.id); return false; } return true; });
  for (const a of s.e) {
    const [id, ti, x, y, z, f, fl, hp, tl] = a, type = TYPES[ti], Ty = WP.TYPES[type]; if (!Ty) continue;
    let e = m.get(id);
    if (!e) { e = { id, type, T: Ty, kind: Ty.kind, x, y, z, vx: 0, vy: 0, facing: f / 10, hp: Ty.hp, max: Ty.hp, o: {}, st: 'idle', t: 0 }; m.ents.push(e); m.byId.set(id, e); if (Ty.init && Ty.kind !== 'boss') { try { Ty.init(m, e); } catch (er) { /* the mirror needs no init state */ } } if (Ty.kind === 'boss') { Ty.init(m, e); m.boss = e; } }
    e.cam = !!(fl & 4096);
    if (e.cam) { e.lx1 = x; e.dz1 = y; e.lz1 = z; if (e.lx0 === undefined) { e.lx0 = x; e.dz0 = y; e.lz0 = z; } } else { e.px0 = e.x1 === undefined ? x : e.x1; e.py0 = e.y1 === undefined ? y : e.y1; e.pz0 = e.z1 === undefined ? z : e.z1; e.x1 = x; e.y1 = y; e.z1 = z; }
    e.facing = f / 10; const wasDead = e.dead; e.dead = !!(fl & 1); if (e.dead && !wasDead) e.deadT = 0;
    e.pose = fl & 2 ? 'crouch' : fl & 4 ? 'kneel' : 'stand'; e.hidden = !!(fl & 8); e.chute = !!(fl & 16); if (fl & 32) e.firing = .2; e.panic = fl & 256 ? 1 : 0; e.wounded = !!(fl & 512); e.grabbedBy = fl & 1024 ? 1 : 0; e.fled = !!(fl & 2048);
    if (e.gunner) e.gunner.dead = !!(fl & 64); if (e.gunner2) e.gunner2.dead = !!(fl & 128);
    e.hp = e.max * hp / 99;
    e.tele = tl ? { kind: TELE[tl[0]], t: tl[1] / 99, max: 1, pid: tl[2] } : null;
    if (Ty.kind === 'pickup') { e.pk = PK[a[9]]; e.life = a[10] / 10; } else if (Ty.kind === 'animal') e.carry = a[9] >= 0 ? PK[a[9]] : null; else if (Array.isArray(a[9])) e.clip = a[9]; else if (typeof a[9] === 'number') e.coverTop = a[9];
  }
  if (s.b) { const b = m.get(s.b[0]); if (b && b.parts) { m.boss = b; b.phase = s.b[1]; s.b[2].forEach((hp, i) => { if (b.parts[i]) { b.parts[i].dead = hp < 0; b.parts[i].hp = Math.max(0, hp); } }); if (s.b[3]) { b.tusk = b.tusk || { st: 'walk' }; b.tusk.x = s.b[3][0]; b.tusk.y = s.b[3][1]; b.tusk.shieldDown = s.b[3][2]; b.tusk.knocked = s.b[3][3]; } b.flame = s.b[4] ? { side: s.b[4], t: 1 } : null; b.vent = s.b[5] ? { t: 1 } : null; b.dead = !!s.b[6]; if (b.phase >= 1) b.towerDown = true; } }
};
// each drawn frame: the camera and remote things 100 ms behind, interpolated
Net.interp = (m, dt) => {
  const span = Math.max(30, (m.lastT || 0) - (m.prevT || 0)), u = Math.min(1, (now() - (m.lastT || 0) + span - 100) / span);
  if (m.part === 'B') { m.tB += dt; } else m.dShow = WP.lerp(m.prevD === undefined ? m.d : m.prevD, m.d, Math.max(0, u));
  const keep = m.d; if (m.part === 'A') m.d = m.dShow === undefined ? m.d : m.dShow; m.cam = m.camNow(); m.d = keep; m.view.begin(m.cam);
  for (const e of m.ents) {
    if (e.deadT !== undefined && e.dead) e.deadT += dt;
    if (e.cam) { e.lx0 += (e.lx1 - e.lx0) * Math.min(1, dt * 12); e.dz0 += (e.dz1 - e.dz0) * Math.min(1, dt * 12); e.lz0 += (e.lz1 - e.lz0) * Math.min(1, dt * 12); const w = WP.camToWorld(m.cam, e.lx0, e.dz0); e.vx = (w[0] - e.x) / dt; e.vy = (w[1] - e.y) / dt; e.x = w[0]; e.y = w[1]; e.lx = e.lx0; e.dz = e.dz0; e.z = e.zr || (e.T.kind === 'projectile') || e.type === 'hyenaOne' ? m.cam.h + e.lz0 : e.lz0; }
    else if (e.x1 !== undefined) { const ox = e.x, oy = e.y; const k = Math.max(0, u); e.x = WP.lerp(e.px0, e.x1, k); e.y = WP.lerp(e.py0, e.y1, k); e.z = WP.lerp(e.pz0, e.z1, k); e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt; }
  }
  for (const p of m.players) if (p.pid !== Net.me && p.tx !== undefined) { p.x += (p.tx - p.x) * Math.min(1, dt * 12); p.y += (p.ty - p.y) * Math.min(1, dt * 12); }
};
// ---------------------------------------------------------------------------------------------- events from the host (reliable, batched)
const EVK = new Set(['kill', 'explode', 'radio', 'boss', 'bossdown', 'rescued', 'lost', 'damage', 'pickup', 'cut', 'intercept', 'friendly', 'mult', 'chain', 'bridge', 'mast', 'spotted', 'dynamite', 'cell', 'down', 'telegraph', 'launch', 'efire', 'score']);
Net.queueEvents = evs => { for (const ev of evs) if (EVK.has(ev.k)) { if (ev.k === 'efire' && Net.evq.filter(x => x.k === 'efire').length > 2) continue; if (ev.k === 'score' && Net.evq.filter(x => x.k === 'score').length > 6) continue; Net.evq.push(ev); } if (Net.evq.length > 60) Net.evq.splice(0, Net.evq.length - 60); };
Net.flushEvents = () => { if (!Net.evq.length) return; const l = Net.evq.splice(0, 30).map(ev => { const o = {}; for (const k in ev) o[k] = typeof ev[k] === 'number' ? Math.round(ev[k] * 10) / 10 : ev[k]; return o; }); Net.send({ k: 'ev', l }, true); };
// ---------------------------------------------------------------------------------------------- connect, the card, the round
Net.connect = g => {
  H.on('card', c => { Net.card = c; });
  H.on('start', () => { Net.state.phase = 'countdown'; });
  H.on('message', (data, from) => Net.onMessage(data, from));
  H.on('leave', ev => { const s = Net.world(); if (s) { s.players = s.players.filter(p => p.pid !== ev.id); if (Net.isHost && s.players.length === 0 && !H.server) Net.finish(s, 'left'); } Net.state.left = (Net.state.left || 0) + 1; });
  H.on('time-up', () => { const s = WP.Play.sim; if (Net.isHost && s) Net.finish(s, 'time-up'); });
  H.on('end', () => { Net.ended = true; Net.state.phase = 'ended'; const a = g.audio; if (a) { a.music(null); if (a.mute) a.mute(true); } WP.Audio.music(null); });
  H.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
    if (!info) { Net.state.phase = 'off'; WP.hub = null; g.go('title'); return; }
    Net.info = info; Net.me = info.me; Net.isHost = !!info.isHost; Net.server = !!info.server;
    const rs = H.rng('stage'); Net.op = 1 + Math.floor(rs() * 6); Net.seed = Math.floor(H.rng('sim')() * 4294967296) >>> 0;
    Net.players = info.players.map((p, i) => ({ pid: p.id, name: ascii(p.name) || 'P' + (i + 1), color: p.color }));
    Net.players.forEach((p, i) => { WP.SEAT[i] = p.color || WP.SEAT[i]; });
    Net.state = { phase: 'card', op: Net.op, me: Net.me, host: Net.isHost, server: Net.server, players: Net.players.length, sent: 0, recv: 0 };
    WP.Render.viewFor(WP.STAGES[Net.op - 1], 'A');
    H.ready();
  });
  // a hidden host tab keeps simulating
  if (typeof setInterval !== 'undefined' && typeof document !== 'undefined') setInterval(() => { if (document.hidden && Net.isHost && !Net.ended && g.sceneName === 'play') { try { g.advance(.1); } catch (e) { /* keep going */ } } }, 100);
};
Net.world = () => WP.Play.sim;
Net.onMessage = (data, from) => {
  if (!data || Net.ended) return; Net.state.recv = (Net.state.recv || 0) + 1;
  if (data.k === 'i' && Net.isHost) { const r = Net.inputs[from] || (Net.inputs[from] = { g: 0, r: 0, lg: 0, lr: 0 }); if (data.s < (r.s || 0)) return; r.s = data.s; r.x = data.a[0] / 10; r.y = data.a[1] / 10; r.fire = !!data.b; r.g = data.g; r.r = data.r; }
  else if (data.k === 's' && !Net.isHost) { Net.lastSnap = data; const m = WP.Play.sim; if (m && m.mirror) Net.apply(m, data); }
  else if (data.k === 'ev' && !Net.isHost) { const m = WP.Play.sim; if (m && m.mirror) { for (const ev of data.l) { if (ev.k === 'cell') { m.cellsOpen = m.cellsOpen || []; m.cellsOpen[ev.idx] = true; } if (ev.k === 'kill') { const e = m.get(ev.id); if (e) { e.dead = true; e.deadT = 0; } } } WP.Pres.events(m, data.l.filter(ev => ev.k !== 'shot'), { local: Net.me, noTips: true, noFreeze: true }); } }
  else if (data.k === 'fin') { Net.state.phase = 'finished'; Net.state.won = data.won; }
};
// the host's frame for a remote player
Net.remoteFrame = (sim, i) => {
  const p = sim.players[i], r = Net.inputs[p.pid]; if (!r) return null;
  const f = { x: r.x === undefined ? p.x : r.x, y: r.y === undefined ? p.y : r.y, fire: r.fire, grenade: r.g > r.lg, reload: r.r > r.lr }; r.lg = r.g; r.lr = r.r; return f;
};
Net.finish = (sim, why) => {
  if (Net.finished || !Net.isHost) return; Net.finished = true;
  const ps = sim.players.slice().sort((a, b) => b.score - a.score), standings = [];
  for (const p of ps) { const last = standings[standings.length - 1]; if (last && sim.players.find(x => x.pid === last[0]).score === p.score) last.push(p.pid); else standings.push([p.pid]); }
  const won = sim.done === 'clear' || sim.cleared;
  const stats = {}, scores = {}; for (const p of sim.players) { scores[p.pid] = p.score; stats[p.pid] = { kills: p.stats.kills, accuracy: Math.round(p.stats.hits / Math.max(1, p.stats.shots) * 100) + '%', headshots: p.stats.heads, intercepts: p.stats.inter, 'civilians hit': p.stats.civ }; }
  const best = (f, title, detail) => { const p = sim.players.slice().sort((a, b) => f(b) - f(a))[0]; return p && f(p) > 0 ? { id: p.pid, title, detail } : null; };
  const awards = [best(p => p.stats.hits / Math.max(1, p.stats.shots), 'SHARPSHOOTER', 'Best accuracy'), best(p => p.stats.inter, 'GUARDIAN', 'Most intercepts'), best(p => p.stats.hostagesEscorted * 10 + (p.stats.civ === 0 ? 1 : 0), 'LIFESAVER', 'Hostages escorted, civilians spared')].filter(Boolean);
  try { H.finish({ standings, scores, won, stats, awards }); } catch (e) { WP.game.fail('finish', e); }
  Net.send({ k: 'fin', won }, true); Net.state.phase = 'finished'; Net.state.why = why;
};
// ---------------------------------------------------------------------------------------------- the session scenes: the card, then play
Net.addScenes = scenes => {
  const g = () => WP.game;
  scenes.hubcard = {
    enter() { this.t = 0; Net.connect(g()); WP.Audio.music('briefing'); },
    update(dt) {
      this.t += dt; const I = g().input;
      if (Net.state.phase === 'card' || Net.state.phase === 'countdown') {
        const cl = I.clicked ? I.clicked() : null;
        if (I.pressed('confirm') || (cl && WP.inRect(cl, [WP.W / 2 - 110, 214, WP.W / 2 - 10, 236]))) H.answer('ready');
        if (I.pressed('more') || (cl && WP.inRect(cl, [WP.W / 2 + 10, 214, WP.W / 2 + 110, 236]))) H.answer('more');
      }
      if (Net.state.phase === 'countdown' && H.time() >= 0) { Net.state.phase = 'play'; g().go('play', { session: true, op: Net.op, seed: Net.seed }); }
    },
    draw(r) {
      r.overlay(gg => {
        WP.UI.titleArt(gg, this.t); px.blend(gg, .55, 'normal', () => px.rect(gg, 0, 0, WP.W, WP.H, '#0b0c08'));
        WP.UI.logo(gg, 6);
        const T2 = WP.UI.txt, op = Net.op || 1, [name, obj] = WP.TEXT.ops[op - 1];
        T2(gg, 'OPERATION ' + op + ': ' + name, WP.W / 2, 60, '#e0b040', { align: 'center', scale: 2 }); T2(gg, obj, WP.W / 2, 78, '#f2ead3', { align: 'center' });
        T2(gg, 'GOAL: CLEAR THE OPERATION AS A TEAM. TOP SCORE WINS.', WP.W / 2, 92, '#c8b890', { align: 'center', font: 'tiny' });
        const c = Net.card || {}, ready = c.ready || [];
        (Net.players || []).forEach((p, i) => { const x = 40 + i * 104; E.ui.box(gg, x, 104, 96, 60, { bg: ['#1c2414', '#10140c'], alpha: .9 }); WP.HUD.portrait(['lobo', 'fang', 'tundra', 'moonshine'][i], gg, x + 4, 110, 28); T2(gg, p.name, x + 36, 112, p.color || WP.SEAT[i]); T2(gg, ready.includes(p.pid) ? 'READY' : '...', x + 36, 126, ready.includes(p.pid) ? '#80ff80' : '#8a8a7a'); if (p.pid === Net.me) T2(gg, 'YOU', x + 36, 140, '#ffe060', { font: 'tiny' }); });
        const I = g().input; T2(gg, 'AIM: MOUSE OR STICK   FIRE: ' + String(I.label('fire')).toUpperCase() + '   GRENADE: ' + String(I.label('grenade')).toUpperCase() + '   RELOAD: ' + String(I.label('reload')).toUpperCase(), WP.W / 2, 176, '#f2ead3', { align: 'center', font: 'tiny' });
        const left = c.paused ? 'PAUSED' : c.left !== null && c.left !== undefined ? Math.ceil(c.left / 1000) + 'S' : Net.state.phase === 'countdown' ? 'STARTING' : '';
        T2(gg, left, WP.W / 2, 194, '#ffe060', { align: 'center', scale: 2 });
        px.rect(gg, WP.W / 2 - 110, 214, 100, 22, '#e0b040'); T2(gg, String(I.label('confirm')).toUpperCase() + ' READY', WP.W / 2 - 60, 221, '#0b0c08', { align: 'center', outline: false });
        px.rect(gg, WP.W / 2 + 10, 214, 100, 22, c.asked ? '#80a060' : '#5a5a4a'); T2(gg, String(I.label('more')).toUpperCase() + ' MORE TIME', WP.W / 2 + 60, 221, '#f2ead3', { align: 'center' });
        if (Net.state.phase === 'countdown') { const s = Math.ceil(-H.time() / 1000); if (s > 0) T2(gg, String(s), WP.W / 2, 120, '#ffffff', { align: 'center', scale: 6 }); }
        if (Net.state.phase === 'connecting') T2(gg, 'CONNECTING...', WP.W / 2, 140, '#f2ead3', { align: 'center' });
      });
    }
  };
  // the play scene in a session: the host steps the sim; a client mirrors it; never paused; no title, quit or restart
  const base = scenes.play;
  scenes.play = Object.assign({}, base, {
    pausable: false,
    enter(d = {}) {
      if (!d.session) return base.enter.call(this, d);
      WP.Play.scene = this; WP.Play.attract = false; WP.Play.intro = 0; WP.Play.go = 1; WP.Play.banner = null; WP.Play.data = d; WP.Render.fx.length = 0;
      const players = Net.players.map(p => ({ pid: p.pid, name: p.name, color: p.color }));
      WP.T.railSpeed = WP.TDEF.railSpeed;
      if (Net.isHost) WP.Play.sim = new WP.Sim({ op: d.op, players, seed: d.seed, session: true, hostages: 5, perks: {} });
      else WP.Play.sim = Net.makeMirror(d.op, players);
      WP.Audio.music(WP.Play.sim.stage.music, { force: true }); Net.snapT = 0; Net.inT = 0; Net.evT = 0; Net.cnt = { g: 0, r: 0 };
      if (typeof document !== 'undefined' && g().canvas) g().canvas.style.cursor = 'none';
    },
    update(dt) {
      if (!WP.Play.data || !WP.Play.data.session) return base.update.call(this, dt);
      if (Net.ended) return;
      const sim = WP.Play.sim, gm = g(); WP.Radio.update(dt); if (WP.Play.banner && (WP.Play.banner.t -= dt) <= 0) WP.Play.banner = null; if (WP.Play.go > 0) WP.Play.go -= dt;
      const meIdx = sim.players.findIndex(p => p.pid === Net.me);
      if (Net.isHost) {
        const frames = sim.players.map((p, i) => i === meIdx && !Net.server ? WP.Players.frame(0, sim, dt, i) : Net.remoteFrame(sim, i));
        sim.step(dt, frames);
        WP.Pres.events(sim, sim.events, { local: Net.me, noTips: true }); Net.queueEvents(sim.events);
        Net.snapT -= dt; Net.evT -= dt;
        if (Net.snapT <= 0) { Net.snapT = 1 / 15; Net.send(Net.snapshot(sim), false); }
        if (Net.evT <= 0) { Net.evT = 1 / 3; Net.flushEvents(); }
        if ((sim.done || sim.cleared && sim.clearT > 2 || sim.players.length && sim.players.every(p => p.down)) && !Net.finished) Net.finish(sim, sim.done || 'down');
      } else {
        // the client: its own crosshair at once, its own shots shown at once; everything else from the host
        const me = sim.players[meIdx];
        if (me) { const f = WP.Players.frame(0, sim, dt, meIdx); if (f) { me.x = f.x; me.y = f.y; if (f.grenade) Net.cnt.g++; if (f.reload) Net.cnt.r++;
          if (f.fire && !me.down && (me.mag > 0 || me.fury > 0)) { me.fireT = (me.fireT || 0) - dt; if (!me.prevFire) me.fireT = 0; while (me.fireT <= 0) { me.fireT += 1 / WP.T.fireRate; WP.Pres.events(sim, [{ k: 'shot', pid: me.pid, x: me.x, y: me.y }], { local: Net.me }); } }
          me.prevFire = !!f.fire;
          Net.inT -= dt; if (Net.inT <= 0) { Net.inT = 1 / 15; Net.send({ k: 'i', s: ++Net.seq, a: [Math.round(me.x * 10), Math.round(me.y * 10)], b: f.fire ? 1 : 0, g: Net.cnt.g, r: Net.cnt.r }, false); } } }
        Net.interp(sim, dt);
      }
      WP.Render.update(sim, dt); WP.Audio.loops(sim, dt, Net.me);
    },
    draw(r) {
      if (!WP.Play.data || !WP.Play.data.session) return base.draw.call(this, r);
      const sim = WP.Play.sim; if (!sim) return;
      if (Net.server) { r.overlay(gg => { px.rect(gg, 0, 0, WP.W, WP.H, '#0b0c08'); WP.UI.txt(gg, 'HOSTING OPERATION ' + sim.opn, WP.W / 2, 120, '#e0b040', { align: 'center', scale: 2 }); WP.UI.txt(gg, sim.players.length + ' WOLVES  d ' + Math.round(sim.d), WP.W / 2, 144, '#f2ead3', { align: 'center' }); }); return; }
      WP.Render.draw(r, sim);
      const meIdx = sim.players.findIndex(p => p.pid === Net.me);
      r.overlay(gg => {
        WP.Render.screenFx(gg, sim); WP.Render.overlays(gg, sim, Net.me);
        const me = sim.players[meIdx]; if (me && g().settings.showGun !== false) WP.Render.drawGun(gg, me, me.seat, false);
        WP.Render.drawCasings(gg);
        const left = H.limitMs ? Math.max(0, (H.limitMs - H.time()) / 1000) : undefined;
        WP.HUD.draw(gg, sim, { local: Net.me, timeLeft: left });
        sim.players.forEach(p => WP.HUD.crosshair(gg, sim, p, { num: true }));
        if (WP.Play.go > 0) WP.UI.txt(gg, WP.TEXT.hud.go, WP.W / 2, 90, '#ffe060', { align: 'center', scale: 5 });
        const b = WP.Play.banner; if (b) WP.UI.txt(gg, b.text, WP.W / 2, 70, b.color, { align: 'center', scale: 3 });
        if (Net.state.phase === 'finished') WP.UI.txt(gg, Net.state.won || sim.cleared ? 'OPERATION CLEAR!' : 'THE HUNT IS OVER', WP.W / 2, 110, '#ffe060', { align: 'center', scale: 3 });
      });
      WP.Radio.draw(r);
    }
  });
};
})();
