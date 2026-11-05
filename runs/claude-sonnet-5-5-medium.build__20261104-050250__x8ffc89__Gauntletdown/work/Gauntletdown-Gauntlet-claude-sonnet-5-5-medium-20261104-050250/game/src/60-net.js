/* AI Hub sessions: Session Protocol v1, shared world. The host's copy runs the sim; clients send their hero and draw the world they are sent.
   Messages are compact JSON: me (client->host, unreliable, 12/s), act (reliable), s (host->all snapshot, unreliable, 10/s), e (reliable event batches). */
const NET = { info: null, host: false, server: false, me: 0, phase: 'boot', card: null, ready: false, more: false, inbox: [], evq: [], snapT: 0, meT: 0, evT: 0, serial: 0, actN: 0, over: null, clock: 0, snaps: [], menu: { open: false, i: 0 }, stats: { out: 0, in: 0, bytes: 0, rate: 0 }, lastActN: {}, tokens: 40, tokenT: 0, endShown: false, limit: 360000 };
const CH_IDX = 'gnoiyxtK', CH_OF = i => CH_IDX[i];
const AMU_IDX = a => a ? AMULETS.indexOf(a) + 1 : 0;
const send = (data, o) => { NET.tokens -= 1; try { const ok = AIHub.send(data, o); NET.stats.out++; return ok !== false; } catch (e) { return false; } };

function netScenes() { return { netboot: SCENE_NETBOOT, netcard: SCENE_NETCARD, netplay: SCENE_NETPLAY }; }

const SCENE_NETBOOT = {
  pausable: false, input: GD_INPUT, res: 'ps1', expand: true, view: 'threequarter',
  async enter() {
    const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (!info) { game.go('title', {}, { fade: 0 }); return; }
    NET.info = info; NET.host = info.isHost; NET.server = !!info.server; NET.me = info.me; NET.limit = info.limitMs || 360000;
    RUN.mode = 'net'; RUN.seed = info.seed || 1; RUN.descent2 = false; RUN.attract = false; RUN.tipsSeen = {};
    RUN.heroes = info.players.map((pl, i) => { const h = makeHero(pl.id, pl.id % 4, null); h.local = pl.id === info.me && !NET.server; h.name2 = String(pl.name || 'P' + (pl.id + 1)).replace(/[^\x20-\x7e]/g, '?').slice(0, 10); h.hubColor = pl.color; h.hp = 700; h.puppet = !NET.host && !h.local; h.remote = NET.host && pl.id !== info.me; h.netId = pl.id; h.input = h.local ? game.input : null; return h; });
    game.settings.set && game.settings.set('glyphs', game.settings.glyphs === 'auto' ? 'playstation' : game.settings.glyphs);
    netBuildFloor(0);
    AIHub.on('card', c => { NET.card = c; });
    AIHub.on('start', () => { NET.phase = 'play'; game.go('netplay', {}, { fade: 0 }); });
    AIHub.on('message', (d, from) => { NET.inbox.push([d, from]); });
    AIHub.on('leave', ({ id }) => { const h = W && W.heroes.find(x => x.netId === id); if (h) { h.gone = true; h.down = true; } if (NET.host && W && W.heroes.every(x => x.gone)) netFinish(); });
    AIHub.on('time-up', () => { if (NET.host) netFinish(); });
    AIHub.on('end', e => { NET.over = e; NET.phase = 'end'; game.input.clear && game.input.clear(); game.audio.stopMusic(.2); game.audio.mute(true); });
    AIHub.ready(); NET.ready = true; game.go('netcard', {}, { fade: 0 });
  },
  update() { return; }, draw(r) { r.sky(['#05030a', '#140c20']); }
};

// ---------- floors in a session ----------
function netBuildFloor(step) {
  NET.serial++;
  buildWorld(step, { players: RUN.heroes.length });
  W.net = { host: NET.host, server: NET.server, event: netEvent, onSay: (k, slot, text) => netEvent(['say', k, slot, text]), allDown: () => { W.allDownT = (W.allDownT || 0) + 1; }, hud: netHud };
  W.heroes = RUN.heroes; W.cardT = 0; W.attract = false;
  RUN.step = step; W.serial = NET.serial;
  placeHeroes(W.heroes, W.starts);
  W.heroes.forEach(h => { h.down = false; h.stairT = 0; h.combo.cancel(); h.gone = h.gone || false; h.bell = 0; if (step > 0 && h.hp < 250) h.hp = 250; });
  W.allyStun = false; game.cam.bounds = v => W && W.map ? W.map.bounds(v) : null; game.cam.smooth = .12;
  const me = W.heroes.find(h => h.local); if (me) { game.cam.frame && game.cam.frame(null); game.focus(me.x, me.y, 12); game.cam.snap = true; game.setZoom && game.setZoom(.65); }
  if (!NET.server) music(PLAN[step].kind === 'boss' ? 'boss' : PLAN[step].kind === 'treasure' ? 'hoard' : REALMS[PLAN[step].realm].music);
  W.net.puppets = new Map(); showCaption('FLOOR ' + (PLAN[step].no || '') + '  ' + PLAN[step].name, 2);
  RUN.heroes.forEach(h => { h.floors = h.floors || 0; });
}
function netEvent(e) { NET.evq.push(e); }

// ---------- the card ----------
const SCENE_NETCARD = {
  pausable: false, input: GD_INPUT, res: 'ps1', expand: true, view: 'threequarter',
  update(dt) {
    NET.clock += dt;
    if (NET.server) return;
    const I = game.input;
    if (I.pressed('confirm') || I.pressed('start') || I.pressed('fire')) { AIHub.answer('ready'); NET.myReady = true; game.audio.sfx('menu'); }
    if (I.pressed('magic') || (I.mouse && 0)) { AIHub.answer('more'); game.audio.sfx('menu'); }
    const c = I.clicked(); if (c) { const R = game.r; if (c[0] > R.W / 2) AIHub.answer('more'); else AIHub.answer('ready'); }
    if (NET.phase === 'play') return;
  },
  draw(r) {
    titleBack(r, NET.clock);
    r.overlay(g => {
      const cx = r.W / 2, c = NET.card || {}, info = NET.info;
      E.font.title(g, TITLE, cx, 10, { scale: 3, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      E.font.text(g, 'ROUND ' + (info ? info.round : 1), cx, 44, '#d8c8f0', { align: 'center' });
      if (info) info.players.forEach((pl, i) => { const n = info.players.length, x = cx - (n - 1) * 52 + i * 104, h = RUN.heroes[i], rd = (c.ready || []).includes(pl.id); if (!h) return; h.rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); h.rig.drawPortrait(g, x - 22, 58, 44, { zoom: 3, turn: .5, bg: '#14101e', frame: true }); E.font.text(g, h.name2, x, 106, h.hubColor || h.C.color, { align: 'center', font: 'tiny' }); E.font.text(g, rd ? 'READY' : '...', x, 116, rd ? '#80ff80' : '#706890', { align: 'center', font: 'tiny' }); if (pl.id === info.me) px.rect(g, x - 24, 56, 48, 1, '#fff'); });
      E.font.text(g, 'Most points when the clock runs out: treasure, kills, stairs. Don\'t starve.', cx, 134, '#ffe9b8', { align: 'center', shadow: '#000' });
      if (!NET.server) E.font.text(g, 'Move ' + glyphList('left') + '  Aim ' + (game.input.lastDevice === 'gamepad' ? 'right stick' : 'mouse') + '  Fire ' + glyph('fire') + '  Magic ' + glyph('magic') + '  Plant ' + glyph('plant'), cx, 150, '#c8b8e0', { align: 'center', font: 'tiny' });
      const left = c.paused ? 'PAUSED' : c.left != null ? Math.ceil(c.left / 1000) + 's' : c.starting ? 'STARTING' : '';
      E.font.text(g, left, cx, 168, c.paused ? '#ffd860' : '#ffffff', { align: 'center', scale: 2, outline: '#000' });
      if (!NET.server) { E.ui.box(g, cx - 120, r.H - 40, 110, 24, { bg: ['#1a3a1a', '#0c200c'], border: '#60c060' }); E.font.text(g, 'READY: ' + glyph('confirm'), cx - 65, r.H - 32, '#c0ffc0', { align: 'center', font: 'tiny' }); E.ui.box(g, cx + 10, r.H - 40, 110, 24, { bg: ['#3a3a1a', '#20200c'], border: '#c0c060' }); E.font.text(g, 'MORE TIME: ' + glyph('magic') + (c.asked ? ' (asked)' : ''), cx + 65, r.H - 32, '#ffffc0', { align: 'center', font: 'tiny' }); }
      else E.font.text(g, 'HOSTING', cx, r.H - 30, '#a098b8', { align: 'center' });
    });
  }
};
const glyphList = a => game.input.label ? game.input.label(a) : a;

// ---------- play ----------
const SCENE_NETPLAY = {
  pausable: false, input: GD_INPUT, res: 'ps1', expand: true, view: 'threequarter', propSize: 1.3,
  enter() { NET.phase = 'play'; },
  update: netUpdate, draw: netDrawScene
};

function netUpdate(dt) {
  if (!W) return;
  const t = AIHub.time();
  // inbox
  for (const [d, from] of NET.inbox.splice(0)) netReceive(d, from);
  NET.tokenT += dt; if (NET.tokenT > 1 / 20) { NET.tokens = Math.min(40, NET.tokens + NET.tokenT * 20); NET.tokenT = 0; }
  if (NET.phase === 'end') { game.input.clear && game.input.clear(); return; }
  W.countdown = t < 0 && isFinite(t) ? -t / 1000 : undefined;
  const live = t >= 0 && isFinite(t);
  if (NET.menu.open) { netMenuUpdate(); const me = W.heroes.find(h => h.local); if (me) { me.int.mx = me.int.my = 0; me.int.fire = false; } }
  else if (!NET.server && (game.input.pressed('pause') && !(game.input.down && false))) NET.menu.open = true;
  const me = W.heroes.find(h => h.local);
  if (NET.host) {
    if (live && !W.descend) { for (const h of W.heroes) if (h.remote && h.netp) h.netp.age += dt; if (NET.menu.open && me) { me.int.mx = me.int.my = me.int.ay = 0; } simStep(dt); }
    else if (W.descend) { W.descend.t += dt; if (W.descend.t > .8 && !W.leaving) netLeaveFloor(); }
    animateAll(dt);
    if (live && !W.descend) netHostDone();
    NET.snapT += dt; if (NET.snapT >= .1) { NET.snapT = 0; netSendSnapshot(); }
    NET.evT += dt; if (NET.evT >= .125 && NET.evq.length) { NET.evT = 0; send({ t: 'e', e: NET.evq.splice(0, 40) }); }
  } else {
    clientStep(dt, live, me);
  }
  // camera and effects
  if (me) { game.cam.frame && game.cam.frame(null); game.focus(me.x, me.y, 12); }
  if (W.rings) { for (const r of W.rings) r.t += dt; W.rings = W.rings.filter(r => r.t < .8); }
  for (const tx of W.texts) { tx.t += dt; tx.z += 18 * dt; } W.texts = W.texts.filter(x => x.t < tx_life(x));
  narratorStepClient(dt);
  NET.stats.rate = NET.stats.rate * .98 + NET.stats.in * .02;
}
const tx_life = x => x.life;
function narratorStepClient(dt) { if (W.net.host) return; const S = W.speech; if (S.length) { S[0].life -= dt; if (S[0].life <= 0) S.shift(); } }

// ----- host: gather and send -----
function netSendSnapshot() {
  const hs = W.heroes.filter(h => !h.gone), R = [];
  const aoi = (x, y) => hs.some(h => !h.down && Math.abs(h.x - x) < 17 * TS && Math.abs(h.y - y) < 12 * TS);
  const H = W.heroes.map(h => [h.netId, Math.round(h.x), Math.round(h.y), Math.round(Math.atan2(h.aim[1], h.aim[0]) * 100), Math.round(h.hp), h.score, h.keys, h.flasks, (h.down ? 1 : 0) | (h.firing ? 2 : 0) | (h.int.plant ? 4 : 0) | (h.stun > 0 ? 8 : 0) | (h.queasy > 0 ? 16 : 0) | (h.bell > 0 ? 32 : 0) | (h.tele > 0 ? 64 : 0), AMU_IDX(h.amulet), Math.round(h.amuletT), h.kills, h.treasure, h.gone ? 1 : 0]);
  let M = W.mons.filter(m => !m.dead && aoi(m.x, m.y)).map(m => [m.id, CH_IDX.indexOf(m.ch), m.rank, Math.round(m.x), Math.round(m.y), Math.round(m.facing * 100), (m.tell > 0 ? 1 : 0) | (m.ch === 'y' && m.vis <= 0 ? 2 : 0) | (m.emerge > 0 ? 4 : 0) | (m.flash > 0 ? 8 : 0)]);
  if (M.length > 150) M = M.slice(0, 150);
  const P = W.foe.filter(f => aoi(f.x, f.y)).map(f => f.kind === 'pot' ? [0, Math.round(f.x), Math.round(f.y), Math.round(f.z), Math.round(f.tx), Math.round(f.ty), Math.round(f.sx), Math.round(f.sy), +(f.t / f.T).toFixed(2)] : [1, Math.round(f.x), Math.round(f.y), Math.round(f.z), Math.round(f.vx), Math.round(f.vy)]).slice(0, 40);
  const S = W.shots.slice(0, 60).map(s => [Math.round(s.x), Math.round(s.y), Math.round(s.a * 100), s.kind === 'axe' ? 0 : s.kind === 'javelin' ? 1 : s.kind === 'arrow' ? 2 : 3]);
  const G = W.gens.map(g => [g.id, g.dead ? 0 : g.rank, Math.round(g.hp)]);
  const B = W.boss ? [Math.round(W.boss.hp), W.boss.phase, W.boss.dead ? 1 : 0, W.boss.state === 'sleep' ? 0 : 1] : 0;
  const msg = { t: 's', at: Math.round(AIHub.time()), q: W.serial, h: H, m: M, p: P, s: S, g: G, b: B, w: Math.round(W.time), f: W.fog > 0 ? 1 : 0, z: W.menuHero ? W.menuHero.netId : -1 };
  const str = JSON.stringify(msg); NET.stats.bytes = str.length;
  if (str.length > 12000) { msg.m = msg.m.slice(0, 40); msg.s = []; }
  send(msg, { reliable: false });
}
function netHostDone() {
  const hs = W.heroes.filter(h => !h.gone);
  if (hs.length && hs.every(h => h.down)) { NET.allDownT = (NET.allDownT || 0) + 1 / 120; if (NET.allDownT > 4) netFinish(); } else NET.allDownT = 0;
}
function netLeaveFloor() {
  W.leaving = true; const d = W.descend;
  for (const h of W.heroes) h.floors++;
  if (d.to === -1) { netEvent(['over']); netFinish(); return; }
  const by = d.by.netId;
  netBuildFloor(d.to);
  netEvent(['floor', d.to, NET.serial, by]); NET.evT = 1; // send soon
}
let finishing = false;
function netFinish() {
  if (finishing || !NET.host) return; finishing = true;
  const hs = RUN.heroes.slice(), scores = {}, stats = {};
  hs.forEach(h => { scores[h.netId] = h.score; stats[h.netId] = { Kills: h.kills, Treasure: h.treasure, Food: h.food, Floors: h.floors }; });
  const order = hs.slice().sort((a, b) => b.score - a.score), standings = []; let last = null;
  for (const h of order) { if (last !== null && h.score === last) standings[standings.length - 1].push(h.netId); else standings.push([h.netId]); last = h.score; }
  const best = (k, title, detail) => { let b = null; for (const h of hs) if ((h[k] || 0) > (b ? b[k] : 0)) b = h; return b ? { id: b.netId, title, detail: detail(b) } : null; };
  const awards = [best('food', 'Glutton', h => h.food + ' meals'), best('gensKilled', 'Generator Buster', h => h.gensKilled + ' generators'), best('shotFood', 'Shot the Supper', h => h.shotFood + ' dinners shot'), best('floors', 'Stair Finder', h => h.floors + ' floors')].filter(Boolean);
  try { AIHub.finish({ standings, scores, stats, awards }); } catch (e) { game.fail && game.fail('finish', e); }
}

// ----- receiving -----
function netReceive(d, from) {
  NET.stats.in++;
  if (!d || !d.t) return;
  if (NET.host) {
    const h = W.heroes.find(x => x.netId === from); if (!h) return;
    if (d.t === 'me') { if (d.q !== W.serial) return; const nx = d.x, ny = d.y; if (!W.map.solidAt(nx, ny)) h.netp = { x: nx, y: ny, age: 0 }; h.int.ax = Math.cos(d.a / 100); h.int.ay = Math.sin(d.a / 100); h.int.fire = !!d.f; h.int.plant = !!d.p; h.int.aimed = true; h.aim = [h.int.ax, h.int.ay]; h.netView = d.v; }
    else if (d.t === 'act' && d.k === 'magic') { if (d.n !== NET.lastActN[from]) { NET.lastActN[from] = d.n; h.view = d.v; useFlask(h); } }
  } else if (d.t === 's') { if (d.q === W.serial) netApplySnap(d); else if (d.q > W.serial) NET.pendingSnap = d; }
  else if (d.t === 'e') for (const e of d.e) netApplyEvent(e);
}
function netApplySnap(d) {
  NET.snaps.push(d); if (NET.snaps.length > 3) NET.snaps.shift();
  NET.lastSnapAt = game.real; W.time = d.w; W.fog = d.f ? 1 : 0;
  for (const e of d.h) {
    const h = W.heroes.find(x => x.netId === e[0]); if (!h) continue;
    h.hp = e[4]; h.score = e[5]; h.keys = e[6]; h.flasks = e[7]; const fl = e[8]; const wasDown = h.down; h.down = !!(fl & 1); if (h.down && !wasDown) { h.downT = 0; sfx('die', { vol: .5 }); }
    h.stun = fl & 8 ? .1 : 0; h.queasy = fl & 16 ? 1 : 0; h.bell = fl & 32 ? 5 : 0; h.amulet = e[9] ? AMULETS[e[9] - 1] : null; h.amuletT = e[10]; h.kills = e[11]; h.treasure = e[12]; h.gone = !!e[13];
    h.firing = !!(fl & 2); h.int.plant = !!(fl & 4); h.int.fire = h.firing;
    if (!h.local) { h.tx = e[1]; h.ty = e[2]; h.aim = [Math.cos(e[3] / 100), Math.sin(e[3] / 100)]; if (h.x === 0 && h.y === 0) { h.x = h.tx; h.y = h.ty; } }
    else if (Math.hypot(h.x - e[1], h.y - e[2]) > 36) { h.x = e[1]; h.y = e[2]; }   // a pad or a shove: the host's word
  }
  const seen = new Set();
  for (const e of d.m) {
    seen.add(e[0]); let m = W.net.puppets.get(e[0]); const ch = CH_OF(e[1]);
    if (!m) { m = newMonster(ch, e[3], e[4], e[2]); m.id = e[0]; m.puppet = true; W.net.puppets.set(e[0], m); W.mons.push(m); if (ch === 'K') { m.isBoss = true; W.boss = m; m.T = Object.assign({}, m.T, { immune: false }); } }
    if (m.rank !== e[2] && ch !== 'K') { m.rank = e[2]; m.rigD = monRig(ch, e[2]); }
    m.tx = e[3]; m.ty = e[4]; m.facing = e[5] / 100; m.tell = e[6] & 1 ? .3 : 0; m.vis = e[6] & 2 ? 0 : 2; m.emerge = e[6] & 4 ? .2 : 0; m.flash = e[6] & 8 ? .1 : 0; m.seen = game.real;
  }
  for (const [id, m] of W.net.puppets) if (!seen.has(id)) { W.net.puppets.delete(id); if (!m.dead) { m.dead = true; m.dying = .5; } }
  W.foe = d.p.map(p => p[0] === 0 ? { kind: 'pot', x: p[1], y: p[2], z: p[3], tx: p[4], ty: p[5], sx: p[6], sy: p[7], t: p[8], T: 1 } : { kind: 'fire', x: p[1], y: p[2], z: p[3], vx: p[4], vy: p[5] });
  W.shotsNet = d.s;
  for (const g of d.g) { const G = W.gens[g[0]]; if (!G) continue; if (!g[1] && !G.dead) { G.dead = true; } else if (g[1]) { G.rank = g[1]; G.hp = g[2]; } }
  if (d.b && W.boss) { W.boss.hp = d.b[0]; W.boss.phase = d.b[1]; W.boss.state = d.b[3] ? 'idle' : 'sleep'; if (d.b[2]) W.boss.dead = true; }
  W.menuHero = d.z >= 0 ? W.heroes.find(h => h.netId === d.z) : null;
}
function netApplyEvent(e) {
  switch (e[0]) {
    case 'floor': if (e[2] !== W.serial) { NET.serial = e[2] - 1; netBuildFloor(e[1]); const h = W.heroes.find(x => x.netId === e[3]); sfx('descend'); } break;
    case 'gone': { const it = W.items.find(i => i.id === e[1]); if (it && !it.gone) { it.gone = true; if (e[2] >= 0) { const h = W.heroes.find(x => x.netId === e[2]); if (h && h.local) { sfx(it.kind === 'key' ? 'key' : ['roast', 'loaf', 'cider', 'platter'].includes(it.kind) ? 'chomp' : it.kind === 'gold' || it.kind === 'gem' ? 'coin' : 'pickup'); game.particles.glints(it.x, it.y, 8, 5); } } } break; }
    case 'door': { const d = W.doors[e[1]]; if (d && !d.open) { d.open = 1; d.t = 0; for (const c of d.cells) W.map.set(c.x, c.y, 0); sfx('door'); } break; }
    case 'wall': { const cr = W.cracked.find(c => c.x === e[1] && c.y === e[2]); if (cr) breakCrack(cr); break; }
    case 'trap': { for (const p of W.plates) if (p.kind === e[1]) p.hit = true; for (const t of W.trapWalls[e[1]]) { W.map.set(t.x, t.y, 0); game.particles.explosion((t.x + .5) * TS, (t.y + .5) * TS, 6, .5); } sfx('rumble'); break; }
    case 'gen': { const g = W.gens[e[1]]; if (g && !g.dead) { g.dead = true; game.particles.explosion(g.x, g.y, 6, .8); sfx('crumble'); game.shake(2); } break; }
    case 'magic': { W.rings = W.rings || []; W.rings.push({ x: e[2], y: e[3], t: 0, big: true }); game.flash('#ffffff', .4); sfx('magic'); game.shake(5); break; }
    case 'say': showCaption(e[3], 2); break;
    case 'stairs': W.descend = { by: W.heroes.find(h => h.netId === e[1]) || W.heroes[0], to: e[2], t: 0 }; sfx('descend'); break;
  }
}

// ----- client step: its own hero at once, puppets for the rest -----
function clientStep(dt, live, me) {
  W.time += dt;
  if (me && !NET.menu.open && live) {
    me.int.mx = me.int.my = 0; readIntent(me);
    const it = me.int, C = me.C;
    me.hurtT = Math.max(0, me.hurtT - dt); me.flash = Math.max(0, me.flash - dt); me.cd = Math.max(0, me.cd - dt); me.tele = Math.max(0, me.tele - dt);
    if (!me.down) {
      const planted = it.plant, mag = Math.min(1, Math.hypot(it.mx, it.my));
      if (planted || me.stun > 0) { me.vx *= .5; me.vy *= .5; if (planted && mag > .2) me.facing = Math.atan2(it.my, it.mx); } else { me.vx = it.mx * heroSpeed(me); me.vy = it.my * heroSpeed(me); if (mag > .2 && !it.fire) me.facing = Math.atan2(it.my, it.mx); }
      if (it.fire) me.facing = Math.atan2(it.ay, it.ax); me.aim = [it.ax, it.ay];
      me.update(dt, W.map); W.map.collide(me);
      if (it.fire && me.cd <= 0) { const a = Math.atan2(it.ay, it.ax), sp = C.shotSpeed; W.shots.push({ x: me.x + Math.cos(a) * 8, y: me.y + Math.sin(a) * 8, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 220 / sp, dmg: 0, owner: me, kind: C.shot, pierce: 0, bounce: 0, a, hit: new Set(), spin: 0, cosmetic: true }); me.cd = C.cd; sfx('shot_' + C.shot, { vol: .4 }); me.firing = true; } else if (!it.fire) me.firing = false;
      if (it.magic && me.flasks > 0) { NET.actN++; send({ t: 'act', k: 'magic', n: NET.actN, v: [Math.round(game.screenGround ? ((game.screenGround() || { x1: 0, x0: 0 }).x1 - (game.screenGround() || { x1: 0, x0: 0 }).x0) / 2 / TS : 14), 9] }, { to: NET.info.host }); me.castT = .45; }
    }
    me.castT = Math.max(0, (me.castT || 0) - dt);
    me.rig.update(dt, { x: me.x, y: me.y, z: 0, vx: me.vx, vy: me.vy, facing: me.facing, hurt: me.hurtT > 0, pose: me.down ? 'die' : me.castT > 0 ? 'cast' : null, point: me.firing, hunch: me.hunger * .5 });
    NET.meT += dt; if (NET.meT >= 1 / 12) { NET.meT = 0; send({ t: 'me', at: Math.round(AIHub.time()), x: Math.round(me.x), y: Math.round(me.y), a: Math.round(Math.atan2(it.ay, it.ax) * 100), f: it.fire ? 1 : 0, p: it.plant ? 1 : 0, q: W.serial, v: [14, 9] }, { to: NET.info.host, reliable: false }); }
  } else if (me) me.rig.update(dt, { x: me.x, y: me.y, z: 0, vx: 0, vy: 0, facing: me.facing, pose: me.down ? 'die' : null });
  // puppets
  for (const h of W.heroes) {
    if (h.local || h.gone) { if (h.local && h.down) h.rig.update(dt, { x: h.x, y: h.y, z: 0, vx: 0, vy: 0, facing: h.facing, pose: 'die' }); continue; }
    if (h.tx !== undefined) { const k = Math.min(1, dt * 10), ox = h.x, oy = h.y; h.x += (h.tx - h.x) * k; h.y += (h.ty - h.y) * k; h.vx = (h.x - ox) / dt; h.vy = (h.y - oy) / dt; if (Math.hypot(h.vx, h.vy) > 4) h.facing = Math.atan2(h.vy, h.vx); }
    if (h.firing) { h.facing = Math.atan2(h.aim[1], h.aim[0]); h.cd -= dt; if (h.cd <= 0) { h.cd = h.C.cd; const a = Math.atan2(h.aim[1], h.aim[0]), sp = h.C.shotSpeed; W.shots.push({ x: h.x + Math.cos(a) * 8, y: h.y + Math.sin(a) * 8, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 220 / sp, dmg: 0, owner: h, kind: h.C.shot, pierce: 0, bounce: 0, a, hit: new Set(), spin: 0, cosmetic: true }); } }
    h.flash = Math.max(0, h.flash - dt);
    h.rig.update(dt, { x: h.x, y: h.y, z: 0, vx: h.vx || 0, vy: h.vy || 0, facing: h.facing, pose: h.down ? 'die' : null, point: h.firing });
  }
  // monsters: ease to the latest snapshot
  for (const m of W.mons) if (m.puppet && m.tx !== undefined && !m.dead) { const k = Math.min(1, dt * 10), ox = m.x, oy = m.y; m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; m.vx = (m.x - ox) / dt; m.vy = (m.y - oy) / dt; m.t += dt; m.flash = Math.max(0, (m.flash || 0) - dt); }
  for (const m of W.mons) if (m.dead) m.dying += dt;
  W.mons = W.mons.filter(m => !(m.dead && m.dying > 1.2));
  // cosmetic shots stop at walls
  for (const s of W.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.spin += dt * 14; if (s.life <= 0 || W.map.solidAt(s.x, s.y)) { s.dead = true; if (W.map.solidAt(s.x, s.y)) game.particles.sparks(s.x, s.y, 12, 3); } }
  W.shots = W.shots.filter(s => !s.dead);
  for (const d of W.doors) if (d.open) d.t += dt;
  W.shots.length > 120 && (W.shots.length = 120);
  animateAll(dt);
  if (NET.pendingSnap && NET.pendingSnap.q === W.serial) { netApplySnap(NET.pendingSnap); NET.pendingSnap = null; }
}

// ----- drawing, HUD and the session menu -----
function netDrawScene(r) {
  if (!W) { r.sky(['#05030a', '#140c20']); return; }
  if (NET.server) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#05030a'); E.font.text(g, 'HOSTING', r.W / 2, r.H / 2, '#a098b8', { align: 'center', scale: 2 }); }); return; }
  drawWorld(r);
  if (W.shotsNet) for (const s of W.shotsNet) { drawShot(r, { x: s[0], y: s[1], z: 12, a: s[2] / 100, vx: Math.cos(s[2] / 100), vy: Math.sin(s[2] / 100), kind: ['axe', 'javelin', 'arrow', 'hex'][s[3]], spin: game.real * 14 }); }
  drawHud(r);
  r.overlay(g => { if (NET.over) drawNetOver(g, r); if (NET.menu.open) drawNetMenu(g, r); });
  if (DEV.netstats) r.overlay(g => E.font.text(g, 'net in ' + NET.stats.in + ' out ' + NET.stats.out + ' snap ' + NET.stats.bytes + 'B', 4, r.H - 18, '#80ff80', { font: 'tiny' }));
}
function netHud(g, r) {
  const t = AIHub.time(), left = Math.max(0, NET.limit - Math.max(0, t));
  if (isFinite(left)) E.font.text(g, Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0'), r.W / 2, 46, left < 30000 ? '#ff6050' : '#ffffff', { align: 'center', scale: 2, outline: '#000' });
  const hs = W.heroes.slice().sort((a, b) => b.score - a.score);
  hs.forEach((h, i) => { E.font.text(g, (h.name2 || h.C.name) + ' ' + h.score, r.W - 6, 42 + i * 8, h.hubColor || h.C.color, { align: 'right', font: 'tiny' }); });
  // arrows to allies off screen
  const me = W.heroes.find(h => h.local); if (me) for (const h of W.heroes) { if (h === me || h.gone) continue; const dx = h.x - me.x, dy = h.y - me.y, d = Math.hypot(dx, dy); if (d > 190) { const a = Math.atan2(dy, dx), ex = r.W / 2 + Math.cos(a) * (r.W / 2 - 14), ey = r.H / 2 + Math.sin(a) * (r.H / 2 - 40); px.poly(g, [[ex + Math.cos(a) * 6, ey + Math.sin(a) * 6], [ex + Math.cos(a + 2.5) * 5, ey + Math.sin(a + 2.5) * 5], [ex + Math.cos(a - 2.5) * 5, ey + Math.sin(a - 2.5) * 5]], h.hubColor || h.C.color); } }
}
function netMenuItems() { return [['Volume', () => Math.round(game.audio.volume * 100) + '%', d => game.audio.setVolume(clamp(game.audio.volume + d * .1, 0, 1))], ['Music', () => Math.round(game.audio.musicVolume * 100) + '%', d => { game.audio.musicVolume = clamp(game.audio.musicVolume + d * .1, 0, 1); game.audio.applyVolume(); }], ['Voices', () => Voice.on ? 'On' : 'Off', () => { Voice.on = !Voice.on; }], ['Button symbols', () => game.settings.glyphs === 'xbox' ? 'Xbox' : 'PlayStation', () => game.settings.set('glyphs', game.settings.glyphs === 'xbox' ? 'playstation' : 'xbox')], ['Close', () => '', () => { NET.menu.open = false; }]]; }
function netMenuUpdate() {
  const I = game.input, items = netMenuItems();
  if (I.repeat('up', .3, .1)) NET.menu.i = (NET.menu.i + items.length - 1) % items.length; if (I.repeat('down', .3, .1)) NET.menu.i = (NET.menu.i + 1) % items.length;
  const it = items[NET.menu.i];
  if (I.repeat('left', .3, .1)) it[2](-1); if (I.repeat('right', .3, .1)) it[2](1);
  if (I.pressed('confirm')) it[2](1);
  if (I.pressed('cancel') || I.pressed('pause')) NET.menu.open = false;
}
function drawNetMenu(g, r) {
  const items = netMenuItems(), x = r.W / 2 - 80, y = r.H / 2 - 50;
  E.ui.box(g, x, y, 160, 100, { bg: ['#1c1630', '#0e0a1a'], border: '#6a5a90' });
  items.forEach((it, i) => { E.font.text(g, it[0], x + 10, y + 10 + i * 16, i === NET.menu.i ? '#ffd860' : '#c8c0e0'); E.font.text(g, it[1](), x + 150, y + 10 + i * 16, '#fff', { align: 'right' }); });
}
function drawNetOver(g, r) {
  px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05030a'));
  E.font.title(g, 'ROUND OVER', r.W / 2, 40, { scale: 3, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
  const e = NET.over, why = { void: 'The round was voided.', 'host-left': 'The host left.', 'sat-out': 'A player sat the round out.', 'session-ended': 'The session ended.' }[e.reason];
  if (why) E.font.text(g, why, r.W / 2, 90, '#e8d8b0', { align: 'center' });
  (e.standings || []).forEach((grp, i) => { const names = [].concat(grp).map(id => { const h = RUN.heroes.find(x => x.netId === id); return h ? h.name2 + ' ' + h.score : '?'; }).join(', '); E.font.text(g, (i + 1) + '. ' + names, r.W / 2, 110 + i * 14, '#ffffff', { align: 'center' }); });
}
