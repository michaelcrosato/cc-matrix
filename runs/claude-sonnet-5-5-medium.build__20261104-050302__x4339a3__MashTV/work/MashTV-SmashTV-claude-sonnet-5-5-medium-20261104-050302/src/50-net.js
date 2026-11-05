// MASH TV: AI Hub Session Protocol v1, shared-world. The host (or a server copy) simulates; clients mirror and run their own contestant.
const N = MT.net = { hub: null, info: null, role: 'none', state: 'idle', card: null, scenes: {}, snapN: 0, sent: 0, standingsSent: false };
const KINDS = Object.keys(MT.ENEMIES), STATES = ['idle', 'walk', 'wind', 'recover', 'hop', 'squat', 'fuse', 'tele', 'flare', 'throw', 'strafe', 'aim', 'rear', 'lunge', 'charge', 'stunned', 'stunned2'];
const PK = ['bill', 'stack', 'bar', 'case', 'prize', 'key', 'cap', 'bomb', 'life', 'statue'], FK = ['orb', 'shard', 'beam', 'tomato', 'shell', 'butter', 'gravy', 'coin', 'card', 'static', 'tot'];
const PHASES = ['enter', 'intro', 'waves', 'clear', 'exit', 'bossIntro', 'boss', 'bossDeath'], DSTATE = { closed: 0, opening: 1, open: 1, exit: 2, closing: 3 };
const WK = Object.keys(MT.WEAPONS), BRADIUS = { shard: 2, beam: 2, static: 2, card: 3, coin: 3, shell: 4 };
const ARCH_R = k => (MT.ENEMIES[k] || {}).r || 6;
const FLAG = { fire: 1, slide: 2, boat: 4, dying: 8, out: 16, laser: 32 };
const clip12 = n => String(n == null ? '' : n).replace(/[^\x20-\x7e]/g, '?').slice(0, 12);
N.rt = () => (N.hub && N.hub.time ? N.hub.time() : 0);
N.send = function (data, reliable) { const h = N.hub; if (!h) return false; try { const ok = h.send(data, { reliable: !!reliable }); N.sent++; return ok; } catch (e) { return false; } };

// ---- begin: connect, seat contestants, show our card ------------------------------------------------------------------------
N.begin = function (game) {
  const hub = N.hub = MT.hubOverride || (typeof window !== 'undefined' ? window : globalThis).AIHub; if (!hub) return;
  Promise.resolve(hub.connect({ mode: 'shared-world', seats: [1, 4], card: true })).then(info => {
    if (!info) { N.hub = null; return; }
    N.info = info; N.role = info.server ? 'server' : info.isHost ? 'host' : 'client'; N.state = 'card'; MT.net.active = true;
    const players = info.players.map(p => ({ slot: p.id, look: p.id, name: clip12(p.name), input: p.id === info.me ? game.input : null, kind: p.id === info.me ? 'local' : (N.role === 'client' ? 'mirror' : 'remote') }));
    const run = MT.newRun({ mode: 'session', diff: 'CONTESTANT', players, seed: info.seed || 7 }); run.session = true;
    info.players.forEach((p, i) => { const c = run.cs[i]; c.color = p.color || MT.PCOL[i]; c.lives = 99; c.bombs = 2; c.name = clip12(p.name).toUpperCase(); c.pid = p.id; c.nextLife = 0; });
    hub.on('card', c => { N.card = c; }); hub.on('start', s => { N.state = 'countdown'; N.starting = true; });
    hub.on('message', N.onMessage); hub.on('leave', N.onLeave); hub.on('time-up', () => N.onTimeUp()); hub.on('end', e => N.onEnd(e));
    game.go('sessionCard'); hub.ready();
    if (MT.hasDOM) window.addEventListener('keydown', e => { if (e.key === 'Enter' && N.state === 'card') hub.answer('ready'); });
  });
};
N.previewCard = function () {
  const fake = { me: 0, host: 0, isHost: true, players: [{ id: 0, name: 'ROCKET', color: '#e8443a' }, { id: 1, name: 'VOLT', color: '#3b82f6' }, { id: 2, name: 'MOXIE', color: '#22c55e' }], seed: 5 };
  N.info = fake; N.preview = true; N.card = { left: 14000, ready: [1], asked: false, paused: false };
  const players = fake.players.map(p => ({ slot: p.id, look: p.id, name: p.name, input: p.id === 0 ? MT.game.input : null })); MT.newRun({ mode: 'test', players }); MT.game.go('sessionCard');
};
N.previewLightning = function (o) { MT.warp('L1', { players: o.players || 2, mode: 'test', bot: true, god: true }); };

// ---- the session card ------------------------------------------------------------------------------------------------------------
N.scenes.sessionCard = {
  input: MT.MENU, camera: { zoom: false }, pausable: false,
  enter() { this.t = 0; this.cd = null; N.cardScene = this; MT.music.play('theme'); MT.hud.cursorOn(true); this.rigs = {}; this.said = false; MT.lines.clear(); this.ph = 0; },
  exit() { N.cardScene = null; },
  update(dt) {
    this.t += dt; UI.t += dt; const game = MT.game, hub = N.hub, I = game.players, card = N.card || {};
    if (!this.said && this.t > .5) { this.said = true; MT.lines.say('LANCE', "WELCOME TO THE LIGHTNING ROUND! GRAB THE MOST CASH, AND BEAT MASHY TOGETHER!", { prio: 3, force: true }); }
    MT.lines.update(dt);
    if (hub && !N.preview) {
      if (I.some(p => p.pressed('confirm') || p.pressed('start')) && !N.starting) hub.answer('ready');
      if (I.some(p => p.pressed('tabL') || p.pressed('more') || p.pressed('reset'))) hub.answer('more');
      const c = UI.clicked(); if (c && this.btn) { if (UI.inRect(c, ...this.btn[0])) hub.answer('ready'); else if (UI.inRect(c, ...this.btn[1])) hub.answer('more'); }
      const tm = hub.time ? hub.time() : -Infinity;
      if (N.starting && isFinite(tm)) { this.cd = tm; if (tm >= 0 && !this.went) { this.went = true; N.startPlay(); } }
    }
  },
  draw(r) {
    MT.backdrop(r, this.t); const card = N.card || {}, info = N.info || { players: [] }, run = MT.run;
    r.overlay(g => {
      UI.title(g, 'MASH TV', r.W / 2, 6, 3); UI.text(g, "TONIGHT'S CONTESTANTS", r.W / 2, 28, '#2ee6ff', { align: 'center' });
      const n = info.players.length, bw = Math.min(90, (r.W - 20) / Math.max(1, n));
      info.players.forEach((p, i) => { const x = r.W / 2 - n * bw / 2 + i * bw, y = 40, rdy = (card.ready || []).includes(p.id), col = p.color || MT.PCOL[i], c = run && run.cs[i];
        E.ui.box(g, x + 2, y, bw - 4, 64, { bg: ['#2a1446', '#140a24'], border: col, alpha: .92 }); if (c && !c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); if (c && c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: rdy ? 'cheer' : 'hips' }); try { c.rig.drawPortrait(g, x + bw / 2 - 18, y + 4, 36, {}); } catch (e) { /* */ } }
        UI.text(g, clip12(p.name).toUpperCase(), x + bw / 2, y + 44, col, { align: 'center', font: 'tiny' }); UI.text(g, rdy ? '✓ READY' : '...', x + bw / 2, y + 54, rdy ? '#7affb0' : '#7a6a98', { align: 'center', font: 'tiny' }); });
      UI.panel(g, 12, 110, r.W - 24, 34, {}); UI.text(g, 'HOW TO WIN: GRAB THE MOST CASH - BEAT MASHY TOGETHER', r.W / 2, 114, '#ffe068', { align: 'center' });
      const pi = MT.lastInput(); MT.glyph.prompt(g, r.W / 2, 128, [['move', 'MOVE'], ['aim', 'AIM+FIRE'], ['slide', 'SLIDE'], ['bomb', 'BOMB']], pi, { align: 'center' });
      const left = card.paused ? 'PAUSED' : card.starting || N.starting ? 'STARTING' : card.left != null ? Math.ceil(card.left / 1000) + 's' : '...';
      UI.text(g, 'TIME LEFT: ' + left, r.W / 2, 150, '#c8c0e0', { align: 'center' });
      const b1 = [r.W / 2 - 96, 164, 90, 20], b2 = [r.W / 2 + 6, 164, 90, 20]; this.btn = [b1, b2];
      E.ui.box(g, ...b1, { bg: ['#1a5a2a', '#0a2a14'], border: '#7affb0', alpha: 1 }); UI.text(g, 'READY', b1[0] + 45, b1[1] + 6, '#7affb0', { align: 'center' });
      E.ui.box(g, ...b2, { bg: ['#2a3a5a', '#101a2a'], border: '#2ee6ff', alpha: 1 }); UI.text(g, card.asked ? 'TAKE BACK' : 'MORE TIME', b2[0] + 45, b2[1] + 6, '#2ee6ff', { align: 'center' });
      MT.glyph.prompt(g, r.W / 2, r.H - 26, [['confirm', 'READY'], ['more', 'MORE TIME']], pi, { align: 'center' });
      if (this.cd !== null && isFinite(this.cd) && this.cd < 0) { const k = Math.ceil(-this.cd / 1000); UI.text(g, String(k), r.W / 2, r.H / 2 - 20, '#fff', { align: 'center', scale: 6 }); }
      else if (this.cd !== null && this.cd >= 0) UI.text(g, 'MASH!', r.W / 2, r.H / 2 - 20, '#ff2e88', { align: 'center', scale: 5 });
    });
    UI.drawLowerThird(r);
  }
};
N.startPlay = function () {
  N.state = 'play'; const run = MT.run; for (const c of run.cs) { c.cash = 0; c.kills = 0; c.hp = c.maxHp; c.state = 'alive'; }
  N.roomSeq = 1; N.over = false; N.finished = false; N.gone = {}; MT.sessionOverlay = { open: false };
  MT.game.go('play', { room: 'L1', entry: 'S', netMode: N.role === 'client' ? 'client' : N.role }, { fade: 0 });
};
// ---- play-scene glue ------------------------------------------------------------------------------------------------------------------
N.onWorld = function (w, scene) {
  N.w = w; N.scene = scene; w.net = { snaps: [], lastSeq: 0, evs: [], q: [], lastC: 0, lastS: 0, lastE: 0, mir: new Map(), pk: new Map(), claimed: new Set() }; N.sc = 0;
  w.evHook = ev => N.onEvent(w, ev);
  if (N.role === 'client') for (const c of w.cs) if (c.kind !== 'local') { c.kind = 'mirror'; }
  if (N.role === 'host' || N.role === 'server') for (const c of w.cs) if (c.kind !== 'local') c.kind = 'remote';
  w.session = true; if (N.role !== 'client') { w.mode = N.role; }
  if (N.role === 'server') for (const c of w.cs) c.kind = 'remote';
  N.roomChanged = false; MT.sessionOverlay = MT.sessionOverlay || { open: false }; N.sessionMenu = null;
};
N.onWorldExit = function () { N.w = null; };
N.onEvent = function (w, ev) {
  if (!N.info) return; const me = N.info.me;
  if (w.mode === 'client') {
    if (ev.name === 'hurt' && ev.data.slot === me) w.net.q.push(['hurt', ev.data.dmg || 1, ev.data.src || '', ev.data.id || 0]);
    else if (ev.name === 'death' && ev.data.slot === me) w.net.q.push(['died']);
    else if (ev.name === 'bomb' && ev.data.slot === me) w.net.q.push(['bomb', Math.round(ev.data.x), Math.round(ev.data.y)]);
    else if (ev.name === 'showboat' && ev.data.slot === me) w.net.q.push(['boat', Math.round(ev.data.gain)]);
    else if (ev.name === 'drop' && ev.data.slot === me) w.net.q.push(['respawn']);
  }
};
N.update = function (w, dt, scene) {
  const game = MT.game, hub = N.hub; if (!hub || N.state === 'ended') return;
  // session overlay (never pauses)
  if (game.players.some(p => p.pressed('pause') && !(p.held && p.held.has && p.held.has('Pad8')))) { MT.sessionOverlay.open = !MT.sessionOverlay.open; MT.overlay.open = MT.sessionOverlay.open ? 1 : 0; if (MT.sessionOverlay.open) N.openMenu(); }
  if (MT.sessionOverlay.open && N.sessionMenu) N.sessionMenu.update(dt);
  w.net.time = N.rt();
  if (w.mode === 'client') N.clientStep(w, dt); else N.hostStep(w, dt);
};
N.openMenu = function () {
  const g = MT.game, set = (k, v) => g.settings.set(k, Math.max(0, Math.min(1, +(v).toFixed(2))));
  N.sessionMenu = new UI.Menu([
    { label: 'VOLUME', value: () => Math.round(g.settings.volume * 100) + '%', adjust: d => set('volume', g.settings.volume + d * .1) }, { label: 'MUSIC', value: () => Math.round(g.settings.music * 100) + '%', adjust: d => set('music', g.settings.music + d * .1) },
    { label: 'BUTTON SYMBOLS', value: () => g.settings.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION', adjust: () => g.settings.set('glyphs', g.settings.glyphs === 'xbox' ? 'playstation' : 'xbox'), onPick: () => g.settings.set('glyphs', g.settings.glyphs === 'xbox' ? 'playstation' : 'xbox') },
    { label: 'CLOSE', onPick: () => { MT.sessionOverlay.open = false; MT.overlay.open = 0; } }], { y: 70, rowH: 22, w: 230, scale: 1, onCancel: () => { MT.sessionOverlay.open = false; MT.overlay.open = 0; } });
};
N.drawOverlay = function (r, w) {
  if (N.role === 'server') { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#05020c'); UI.title(g, 'STUDIO SERVER', r.W / 2, 60, 3); UI.text(g, 'HOSTING THE ROUND FOR ' + (N.info ? N.info.players.length : 0) + ' CONTESTANTS', r.W / 2, 100, '#c8c0e0', { align: 'center' }); UI.text(g, 'ROOM ' + (w.rm ? w.rm.id : '') + '   ENEMIES ' + w.enemies.length, r.W / 2, 114, '#7affb0', { align: 'center' }); }); }
  if (MT.sessionOverlay && MT.sessionOverlay.open && N.sessionMenu) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,2,12,.6)'); UI.title(g, 'MASH TV', r.W / 2, 30, 3); }); N.sessionMenu.draw(r); UI.promptBar(r, [['confirm', 'SELECT'], ['pgL', 'ADJUST'], ['cancel', 'CLOSE']]); }
};
// ---- host --------------------------------------------------------------------------------------------------------------------------------
N.hostStep = function (w, dt) {
  const net = w.net, hub = N.hub;
  // remote contestant reports are applied in onMessage; step the world
  w.step(dt); N.fx = 0;
  const now = N.rt(); if (now - net.lastS >= 66) { net.lastS = now; N.sendSnapshot(w); }
  if (w.boss && w.boss.dead && w.phase === 'clear' && !N.bossT) N.bossT = 3;
  if (N.bossT) { N.bossT -= dt; if (N.bossT <= 0 && !N.finished) N.finish(true); }
  if (N.role === 'server') { /* no local contestant */ }
  // finish when nobody is left
  if (w.cs.length && w.cs.every(c => c.state === 'gone') && !N.finished) N.finish(false);
};
N.sendSnapshot = function (w) {
  const net = w.net, d = w.doors; let dr = 0; ['N', 'E', 'S', 'W'].forEach((k, i) => { dr |= (DSTATE[d[k].state] || 0) << (i * 2); });
  const P = w.cs.filter(c => c.state !== 'gone').map(c => [c.slot, Math.round(c.x * 10), Math.round(c.y * 10), Math.round(c.aim * 1000), (c.fireOn ? FLAG.fire : 0) | (c.slideT > 0 ? FLAG.slide : 0) | (c.boatT > 0 ? FLAG.boat : 0) | (c.state === 'dying' ? FLAG.dying : 0) | (c.state === 'out' ? FLAG.out : 0) | (c.laserOn ? FLAG.laser : 0), Math.max(0, WK.indexOf(c.wpn)), Math.round(c.wT * 10), c.hp, c.lives, Math.round(c.cash), c.bombs, c.kills, Math.round(c.face * 100), c.state === 'drop' ? 1 : 0]);
  const E_ = []; for (const e of w.enemies) { if (!e.alive || E_.length >= 160) continue; E_.push([e.id, KINDS.indexOf(e.kind), Math.round(e.x * 10), Math.round(e.y * 10), Math.round(e.face * 100), Math.max(0, STATES.indexOf(e.state)), Math.round(e.hpPct * 100), (e.carryKey ? 1 : 0) | (e.big ? 2 : 0) | (e.hidden ? 4 : 0) | (e.vulnerable ? 8 : 0) | (e.stunnedFlag ? 16 : 0), e.kind === 'tank' ? Math.round(e.turret * 100) : e.kind === 'segment' ? e.idx : e.kind === 'disco' ? Math.round((e.spin || 0) * 100) : 0]); }
  const B = []; for (const b of w.fShots.list) { if (b.dead || B.length >= 220) continue; B.push([b.id, Math.max(0, FK.indexOf(b.kind)), Math.round(b.x * 10), Math.round(b.y * 10), Math.round(b.vx), Math.round(b.vy), Math.round(b.z), 0]); }
  for (const l of w.lobs) if (B.length < 230 && (l.kind === 'tomato' || l.kind === 'tot')) B.push([l.id, Math.max(0, FK.indexOf(l.kind)), Math.round(l.x * 10), Math.round(l.y * 10), Math.round(l.vx), Math.round(l.vy), Math.round(l.z), Math.round(l.vz), Math.round(l.tx), Math.round(l.ty)]);
  const K = []; for (const p of w.pickups) { if (p.dead || K.length >= 40) continue; K.push([p.id, PK.indexOf(p.kind), Math.round(p.x * 10), Math.round(p.y * 10), p.ttl > 1e8 ? -1 : Math.round(p.ttl * 10), p.kind === 'cap' ? WK.indexOf(p.w) : p.kind === 'prize' ? p.prizeIdx : 0, Math.round(p.z), p.kind === 'prize' ? ['red', 'blue', 'gold'].indexOf(p.col) : 0, p.pedestal ? 1 : 0]); }
  const now = N.rt(), V = w.events.filter(e => e.seq > (net.lastEv || 0) - 0 && now - (e.at || (e.at = now)) < 1000).map(e => [e.seq, e.name, N.trimData(e.data)]);
  const snap = { t: 's', a: now | 0, n: ++N.snapN, rm: N.roomSeq || 1, ph: Math.max(0, PHASES.indexOf(w.phase)), pt: Math.round(w.phaseT * 10), dr, R: Math.round(w.rat.R * 10), X: w.rat.X, pm: Math.round(w.rat.prime * 10), k: MT.run ? MT.run.keys : 0, wv: w.waveI, P, E: E_, B, K, G: w.boss ? w.boss.toNet() : 0, V };
  N.lastSnapSize = JSON.stringify(snap).length; if (N.lastSnapSize > N.maxSnap) N.maxSnap = N.lastSnapSize; N.maxSnap = N.maxSnap || N.lastSnapSize;
  N.send(snap, false);
};
N.trimData = function (d) { const o = {}; for (const k in d) { const v = d[k]; if (typeof v === 'number') o[k] = Math.round(v * 10) / 10; else if (typeof v === 'string' || typeof v === 'boolean') o[k] = v; } return o; };
N.onMessage = function (m, from) {
  const w = N.w; if (!m || typeof m !== 'object') return;
  if (m.t === 'room') { if (N.role === 'client') N.clientRoom(m); return; }
  if (m.t === 'over') { N.overData = m; return; }
  if (!w) return;
  if (N.role === 'client') { if (m.t === 's' && m.rm === (N.roomSeq || 1)) { const net = w.net; net.snaps.push(m); if (net.snaps.length > 12) net.snaps.shift(); } return; }
  // host / server
  const c = w.cs.find(q => q.slot === from); if (!c) return;
  if (m.t === 'c') { const s = m.s; if (!s || (c.lastA !== undefined && m.a < c.lastA)) return; c.lastA = m.a; c.rep = { x: s[0] / 10, y: s[1] / 10, aim: s[2] / 1000, flags: s[3], wpn: WK[s[4]] || 'blaster', wT: s[5] / 10, hp: s[6], lives: s[7], t: N.rt() }; if (s[8] !== undefined) c.rep.face = s[8] / 100; }
  else if (m.t === 'ce') {
    for (const ev of m.ev || []) {
      const k = ev[0];
      if (k === 'claim') { const p = w.pickups.find(q => q.id === ev[1]); if (p && !p.dead && Math.hypot(c.x - p.x, c.y - p.y) < 40 + 14) { if (p.kind === 'cap') { p.dead = true; } else w.collect(c, p); } }
      else if (k === 'hurt') { w.loseRating(12); if (ev[3]) for (const b of w.fShots.list) if (b.id === ev[3]) b.dead = true; w.event('hurt', { slot: c.slot, hp: c.hp, x: c.x, y: c.y, src: ev[2] || '' }); }
      else if (k === 'died') { c.deaths++; c.cash = Math.max(0, c.cash - 2500); w.loseRating(25); w.event('death', { slot: c.slot, x: c.x, y: c.y, name: c.name, lives: 99 }); }
      else if (k === 'bomb') { c.x = ev[1]; c.y = ev[2]; w.showstopper(c); }
      else if (k === 'boat') { w.addRating(Math.min(30, ev[1])); c.boatGain += ev[1]; w.event('showboat', { slot: c.slot, gain: ev[1], x: c.x, y: c.y, n: 0 }); }
    }
  }
};
WP.updateRemote = function (c, dt) {
  const r = c.rep; c.flash = Math.max(0, c.flash - dt); c.fireCd = Math.max(0, c.fireCd - dt); c.invuln = Math.max(0, c.invuln - dt);
  if (!r) { c.state = c.state === 'gone' ? 'gone' : 'alive'; return; }
  const k = Math.min(1, dt * 14), ox = c.x, oy = c.y; c.x += (r.x - c.x) * k; c.y += (r.y - c.y) * k; c.body.x = c.x; c.body.y = c.y; c.vx = (c.x - ox) / (dt || 1); c.vy = (c.y - oy) / (dt || 1);
  c.aim = r.aim; if (r.face !== undefined) c.face = r.face; c.wpn = r.wpn; c.wT = r.wT; c.hp = r.hp; c.fireOn = !!(r.flags & FLAG.fire);
  c.state = (r.flags & FLAG.dying) ? 'dying' : (r.flags & FLAG.out) ? 'out' : 'alive'; c.slideT = (r.flags & FLAG.slide) ? .1 : 0; c.boatT = (r.flags & FLAG.boat) ? .3 : 0; c.laserOn = !!(r.flags & FLAG.laser); if (c.laserOn) { c.laserA = c.aim; }
  if (c.state === 'alive' && (r.flags & (FLAG.fire | FLAG.laser)) && !(r.flags & FLAG.slide)) this.fireWeapon(c, dt);
  if (c.state === 'dying') c.down = Math.min(1, c.down + dt * 2); else c.down = 0;
  this.pushOutStatics && 0;
};
N.onLeave = function (m) {
  const w = N.w; if (!m) return; N.gone = N.gone || {}; N.gone[m.id] = true; const c = MT.run && MT.run.cs.find(q => q.slot === m.id); if (!c) return;
  if (w && N.role !== 'client' || N.role === 'client') { c.state = 'gone'; if (w) { w.event('leave', { slot: m.id, name: c.name }); w.game.particles.bits(c.x, c.y, 10, 20, [c.color, '#fff']); } }
  if (N.role !== 'client' && MT.run.cs.every(q => q.state === 'gone')) N.finish(false);
};
N.onTimeUp = function () { if (N.role !== 'client') N.finish(false); };
N.standings = function () {
  const run = MT.run, cs = run.cs.filter(c => c.state !== 'gone'); cs.sort((a, b) => b.cash - a.cash); const groups = []; for (const c of cs) { if (groups.length && groups[groups.length - 1].cash === c.cash) groups[groups.length - 1].ids.push(c.slot); else groups.push({ cash: c.cash, ids: [c.slot] }); }
  return groups.map(g => g.ids);
};
N.finish = function (won) {
  if (N.finished || N.role === 'client') return; N.finished = true; const run = MT.run, w = N.w;
  const standings = N.standings(), scores = {}, stats = {}; for (const c of run.cs) { scores[c.slot] = Math.round(c.cash); stats[c.slot] = { Kills: c.kills, Prizes: c.prizes.length, Deaths: c.deaths }; }
  const best = (f) => run.cs.reduce((a, c) => (!a || f(c) > f(a) ? c : a), null), awards = [];
  const rich = best(c => c.cash), killer = best(c => c.kills), fav = best(c => c.boatGain);
  if (rich) awards.push({ id: rich.slot, title: 'BIGGEST EARNER', detail: MT.fmt$(rich.cash) }); if (killer) awards.push({ id: killer.slot, title: 'MOST MASHES', detail: killer.kills + ' KILLS' }); if (fav && fav.boatGain > 0) awards.push({ id: fav.slot, title: 'CROWD FAVORITE', detail: Math.round(fav.boatGain) + ' STYLE' });
  const over = { t: 'over', won: !!won, standings, scores, stats, awards }; N.overData = over; N.send(over, true);
  try { N.hub.finish({ standings, scores, won: !!won, stats, awards }); } catch (e) { /* */ }
};
N.exitRoom = function (w, dir, dest) {
  if (N.role === 'client') return; N.roomSeq = (N.roomSeq || 1) + 1; N.send({ t: 'room', rm: N.roomSeq, id: dest, entry: MT.DOORS[dir].opp }, true);
  N.goRoom(dest, MT.DOORS[dir].opp);
};
N.goRoom = function (id, entry) { for (const c of MT.run.cs) if (c.state === 'dying' || c.state === 'drop') { c.state = 'alive'; c.hp = c.maxHp; } MT.game.go('play', { room: id, entry, netMode: N.role === 'client' ? 'client' : N.role, R: N.w ? N.w.rat.R : undefined }, { fade: 0 }); };
N.clientRoom = function (m) { if (m.rm <= (N.roomSeq || 1)) return; N.roomSeq = m.rm; N.goRoom(m.id, m.entry); };
N.bossDone = function (w) { /* host: finish() is called 3 s later in hostStep */ };
N.onEnd = function (e) {
  N.state = 'ended'; const game = MT.game; try { game.input.clear(); } catch (x) { /* */ } try { MT.music.stop(.3); game.audio.mute(true); } catch (x) { /* */ }
  game.go('sessionEnd', { reason: e && e.reason, standings: (e && e.standings) || (N.overData && N.overData.standings) || [], over: N.overData }, { fade: 0 });
};
N.scenes.sessionEnd = {
  input: MT.MENU, camera: { zoom: false }, pausable: false,
  enter(d) { this.d = d; this.t = 0; MT.overlay.open = 1; MT.sessionOverlay = { open: false }; },
  update(dt) { this.t += dt; UI.t += dt; },
  draw(r) {
    const d = this.d, reason = d.reason, T = MT.TEXT; const head = reason === 'finished' ? T.sessionEnd : reason === 'sat-out' ? T.sessionSat : reason === 'session-ended' ? T.sessionOver : T.sessionDiff;
    MT.backdrop(r, this.t, reason === 'finished' ? {} : { sky: ['#05020a', '#14081c', '#05020a'] });
    r.overlay(g => {
      UI.title(g, head, r.W / 2, 18, head.length > 26 ? 2 : 3);
      if (reason === 'finished') {
        const run = MT.run, over = d.over || {}, st = d.standings && d.standings.length ? d.standings : (over.standings || []); let y = 56, rank = 1;
        for (const grp of st) { for (const id of grp) { const c = run.cs.find(q => q.slot === id); if (!c) continue; UI.text(g, rank + '.', r.W / 2 - 100, y, '#ffe068'); UI.text(g, c.name, r.W / 2 - 84, y, c.color); UI.text(g, MT.fmt$(over.scores ? over.scores[id] : c.cash), r.W / 2 + 100, y, '#fff7e8', { align: 'right' }); y += 14; } rank += grp.length; }
        (over.awards || []).forEach((a, i) => { const c = run.cs.find(q => q.slot === a.id); UI.text(g, a.title + ': ' + (c ? c.name : '?') + '  ' + a.detail, r.W / 2, y + 10 + i * 11, '#7affb0', { align: 'center', font: 'tiny' }); });
        UI.text(g, over.won ? 'MASHY HAS BEEN MASHED!' : 'MASHY LIVES TO MASH ANOTHER DAY', r.W / 2, r.H - 40, over.won ? '#7affb0' : '#ff8a8a', { align: 'center' });
      }
    });
  }
};
// ---- client ---------------------------------------------------------------------------------------------------------------------------------
N.clientStep = function (w, dt) {
  const net = w.net, hub = N.hub, me = N.info.me, now = N.rt();
  w.time += dt; w.phaseT += dt; MT.lines.update(0);
  const mine = w.cs.find(c => c.slot === me);
  const rt = now - 120, S = net.snaps; let a = null, b = null;
  for (let i = S.length - 1; i >= 0; i--) { if (S[i].a <= rt) { a = S[i]; b = S[i + 1] || null; break; } }
  if (!a && S.length) a = S[0]; const latest = S[S.length - 1];
  if (latest) N.applyLatest(w, latest, now, mine);
  if (a) N.interpolate(w, a, b || a, rt, dt, mine);
  // own contestant: fully local
  if (mine) {
    mine.intent = w.getIntent(mine); w.updateContestant(mine, dt); N.localHurt(w, mine, dt, now); N.localPickups(w, mine);
    mine.fireOn = !!(mine.intent && mine.intent.fire);
    if (now - net.lastC >= 80) { net.lastC = now; N.send({ t: 'c', a: now | 0, s: [Math.round(mine.x * 10), Math.round(mine.y * 10), Math.round(mine.aim * 1000), (mine.fireOn ? FLAG.fire : 0) | (mine.slideT > 0 ? FLAG.slide : 0) | (mine.boatT > 0 ? FLAG.boat : 0) | (mine.state === 'dying' ? FLAG.dying : 0) | (mine.laserOn ? FLAG.laser : 0), Math.max(0, WK.indexOf(mine.wpn)), Math.round(mine.wT * 10), mine.hp, mine.lives, Math.round(mine.face * 100)] }, false); }
    if (now - net.lastE >= 250 && net.q.length) { net.lastE = now; N.send({ t: 'ce', ev: net.q.splice(0, 12) }, true); }
    if (w.phase === 'exit' && !w.exitPicked) { /* host decides on reported positions */ }
  }
  // cosmetic bullets of the others, from snapshot flags
  for (const c of w.cs) if (c.kind === 'mirror' && c.state === 'alive' && c.fireOn && !(c.slideT > 0)) { c.fireCd -= dt; if (c.fireCd <= 0) { c.fireCd = 1 / (MT.WEAPONS[c.wpn] && MT.WEAPONS[c.wpn].rate ? Math.max(3, MT.WEAPONS[c.wpn].rate()) : 9); w.pShots.fire({ x: c.x + Math.cos(c.aim) * 10, y: c.y + Math.sin(c.aim) * 10, z: 14, vx: Math.cos(c.aim) * 330, vy: Math.sin(c.aim) * 330, r: 2.5, life: .9, team: 'p', color: '#ffe066', core: '#fff', dmg: 0, data: { owner: c.slot } }); } c.laserLen = 160; }
  w.pShots.update(dt, w.map); for (const b of w.pShots.list) for (const e of w.enemies) if (!b.dead && Math.hypot(b.x - e.x, b.y - e.y) < e.r + 2) { b.dead = true; w.game.particles.sparks(b.x, b.y, 12, 2); }
  w.pShots.list = w.pShots.list.filter(b => !b.dead);
  w.flash = 0; if (!MT.cfg.skipRigs) w.animate(dt);
  w.updatePickupsClient && 0;
  for (const p of w.pickups) p.t += dt;
  if (w.boss) { w.boss.eyeJ = (w.boss.eyeJ || 0) + dt; w.boss.bob = (w.boss.bob || 0) + dt; w.boss.tick && w.boss.tick(dt); }
  if (w.puddles) { for (const p of w.puddles) p.t -= dt; w.puddles = w.puddles.filter(p => p.t > 0); } for (const d of w.decals) d.t -= dt; w.decals = w.decals.filter(d => d.t > 0);
  for (const e of w.enemies) { e.age += dt; e.t += dt; e.sT = (e.sT || 0) + dt; e.flash = Math.max(0, e.flash - dt); const dur = { wind: .32, fuse: .6, tele: e.kind === 'brute' ? .85 : .7, throw: .45, aim: .45, flare: .4, rear: .5 }[e.state]; e.t2 = dur ? Math.max(0, dur - e.sT) : 0; }
  w.tickRatings && 0;
};
N.applyLatest = function (w, S, now, mine) {
  const net = w.net; // rating / phase / doors / pickups / boss / foe bullets / events
  w.rat.R = S.R / 10; w.rat.X = S.X; w.rat.prime = S.pm / 10; if (MT.run) MT.run.keys = S.k; w.waveI = S.wv;
  const ph = PHASES[S.ph] || w.phase; if (ph !== w.phase) { w.phase = ph; w.phaseT = S.pt / 10; if (ph === 'exit') { w.rm.exits && 0; } }
  ['N', 'E', 'S', 'W'].forEach((k, i) => { const code = (S.dr >> (i * 2)) & 3, d = w.doors[k]; const st = ['closed', 'open', 'exit', 'closing'][code]; if (d.state !== st) { d.state = st; d.t = 0; if (st === 'exit') { d.exit = w.rm.exits && w.rm.exits[k] || null; w.setDoorCells(k, 0); } else if (st === 'closed') w.setDoorCells(k, 2); } if (st === 'exit' && !d.exit) d.exit = w.rm.exits && w.rm.exits[k] || null; });
  // pickups
  const seen = new Set(); w.pickups = [];
  for (const e of S.K) { const id = e[0]; seen.add(id); if (net.claimed.has(id)) continue; let p = net.pk.get(id); const kind = PK[e[1]] || 'bill'; if (!p) { p = { id, kind, t: 0, vx: 0, vy: 0, r: 7 }; net.pk.set(id, p); } p.x = e[2] / 10; p.y = e[3] / 10; p.ttl = e[4] < 0 ? 1e9 : e[4] / 10; p.z = e[6]; if (kind === 'cap') p.w = WK[e[5]]; if (kind === 'prize') { p.prizeIdx = e[5]; p.col = ['red', 'blue', 'gold'][e[7]] || 'red'; } p.pedestal = !!e[8]; if (['bill', 'stack', 'bar', 'case'].includes(kind)) p.cash = true; w.pickups.push(p); }
  for (const id of [...net.pk.keys()]) if (!seen.has(id)) net.pk.delete(id); for (const id of [...net.claimed]) if (!seen.has(id)) net.claimed.delete(id);
  // foe bullets (newest snapshot, drawn at now) and lobs
  const dtS = Math.max(0, (now - S.a) / 1000); w.fShots.list = []; w.lobs = [];
  for (const e of S.B) { const kind = FK[e[1]] || 'orb', x = e[2] / 10 + e[4] * dtS, y = e[3] / 10 + e[5] * dtS;
    if (e.length > 8) { const z = e[6] + e[7] * dtS - 130 * dtS * dtS; w.lobs.push({ id: e[0], kind, x, y, z: Math.max(0, z), vx: e[4], vy: e[5], vz: e[7], tx: e[8], ty: e[9], t: .4 }); }
    else w.fShots.list.push({ id: e[0], kind, x, y, z: e[6], vx: e[4], vy: e[5], r: BRADIUS[kind] || 3, color: ({ orb: '#ff9a3c', shard: '#ffd23a', beam: '#ffe9a0', static: '#d8f0ff', card: '#ff6a9a', coin: '#ffd23a', butter: '#ffe27a', gravy: '#b86a30', tot: '#d8a050', shell: '#ff7a30' })[kind] || '#ff9a3c', core: '#fff', dead: false, spinA: now / 100, near: false }); }
  // events
  for (const ev of S.V) { if (ev[0] <= net.lastSeq) continue; net.lastSeq = ev[0]; const e = { seq: ev[0], name: ev[1], data: ev[2] }; if (e.data.slot === undefined || true) { MT.react.handle(w, e); N.clientFx(w, e); } }
  if (S.G) { const kind = S.G[0]; if (!w.boss && MT.BOSSES[kind]) { w.boss = new MT.BOSSES[kind](w); } if (w.boss) { w.boss.fromNet(S.G); if (w.phase === 'bossIntro' && w.boss.introUpdate) { /* position from net */ } } }
};
N.clientFx = function (w, ev) {
  const d = ev.data, g = w.game, P = g.particles;
  if (ev.name === 'kill') { P.bits(d.x, d.y, 12, d.big ? 22 : 10, ['#ff2e88', '#2ee6ff', '#ffcc33', '#fff']); if (d.big) { P.explosion(d.x, d.y, 10, 1); g.shake(3); } }
  else if (ev.name === 'boom' || ev.name === 'rocketBoom') P.explosion(d.x, d.y, 8, .8);
  else if (ev.name === 'hit') P.sparks(d.x, d.y, 12, 2);
  else if (ev.name === 'bomb') { g.flash('#ffffff', .12, .6); P.ring(d.x, d.y, 8, 190, '#ffffff', .5); }
  else if (ev.name === 'doorSlam') P.dust(184, 120, 2, 3);
  else if (ev.name === 'mimeBlast') { P.explosion(d.x, d.y, 6, .6); const me = w.cs.find(c => c.kind === 'local'); if (me && me.state === 'alive' && Math.hypot(me.x - d.x, me.y - d.y) < 40) w.hurtContestant(me, 1, 'mime', 0, 0); }
  else if (ev.name === 'popperBurst') P.bits(d.x, d.y, 10, 12, ['#ff2e88', '#2ee6ff', '#ffcc33']);
  else if (ev.name === 'death') { const c = w.cs.find(q => q.slot === d.slot); if (c && c.kind === 'mirror') P.bits(c.x, c.y, 10, 24, [c.color, '#fff']); }
};
N.interpolate = function (w, a, b, rt, dt, mine) {
  const net = w.net, u = b.a > a.a ? MT.clamp((rt - a.a) / (b.a - a.a), 0, 1.4) : 1;
  // contestants (others)
  const bm = new Map(); for (const e of b.P) bm.set(e[0], e); const am = new Map(); for (const e of a.P) am.set(e[0], e);
  for (const c of w.cs) {
    const eb = bm.get(c.slot), ea = am.get(c.slot) || eb; if (!eb) continue;
    c.cash = eb[9]; c.kills = eb[11]; c.bombs = eb[10] !== undefined && c.kind === 'mirror' ? eb[10] : c.bombs;
    if (c.kind !== 'mirror') continue;
    const ox = c.x, oy = c.y; c.x = ea[1] / 10 + (eb[1] - ea[1]) / 10 * u; c.y = ea[2] / 10 + (eb[2] - ea[2]) / 10 * u; c.body.x = c.x; c.body.y = c.y; c.vx = (c.x - ox) / (dt || 1); c.vy = (c.y - oy) / (dt || 1); c.aim = eb[3] / 1000; c.face = eb[12] / 100;
    const fl = eb[4]; c.fireOn = !!(fl & FLAG.fire); c.slideT = (fl & FLAG.slide) ? .1 : 0; c.boatT = (fl & FLAG.boat) ? .3 : 0; c.laserOn = !!(fl & FLAG.laser); c.laserA = c.aim; c.laserLen = 160;
    c.state = (fl & FLAG.dying) ? 'dying' : (fl & FLAG.out) ? 'out' : 'alive'; c.down = c.state === 'dying' ? 1 : 0; c.wpn = WK[eb[5]] || 'blaster'; c.wT = eb[6] / 10; c.hp = eb[7]; c.lives = eb[8];
    if (c.state === 'gone') continue;
  }
  // enemies
  const am2 = new Map(); for (const e of a.E) am2.set(e[0], e); const alive = new Set();
  for (const e of b.E) {
    alive.add(e[0]); let m = net.mir.get(e[0]); const kind = KINDS[e[1]] || 'goon', ea = am2.get(e[0]) || e;
    if (!m) { m = { id: e[0], kind, x: 0, y: 0, z: 0, r: ARCH_R(kind), vx: 0, vy: 0, face: 0, state: 'idle', t: 0, t2: 0, flash: 0, alpha: 1, alive: true, hp: 1, max: 1, hpPct: 1, seed: ((e[0] * 7919) % 1000) / 1000, age: 0, kb: [0, 0], entering: false, sT: 0 }; net.mir.set(e[0], m); m.x = e[2] / 10; m.y = e[3] / 10; }
    const nx = ea[2] / 10 + (e[2] - ea[2]) / 10 * u, ny = ea[3] / 10 + (e[3] - ea[3]) / 10 * u; m.vx = (nx - m.x) / (dt || 1); m.vy = (ny - m.y) / (dt || 1); m.x = nx; m.y = ny; m.face = e[4] / 100;
    const st = STATES[e[5]] || 'idle'; if (st !== m.state) { m.state = st; m.sT = 0; } const pct = e[6] / 100; if (pct < m.hpPct - .01) m.flash = .09; m.hpPct = pct;
    m.carryKey = !!(e[7] & 1); m.big = !!(e[7] & 2); m.hidden = !!(e[7] & 4); m.vulnerable = !!(e[7] & 8); if (kind === 'tank') m.turret = e[8] / 100; else if (kind === 'segment') m.idx = e[8]; else if (kind === 'disco') m.spin = e[8] / 100; if (kind === 'discoBig') m.big = true; m.body = m.body || { x: m.x, y: m.y };
    if (kind === 'tank') m.body_a = m.face;
  }
  for (const id of [...net.mir.keys()]) if (!alive.has(id)) net.mir.delete(id);
  w.enemies = [...net.mir.values()];
};
N.localHurt = function (w, c, dt, now) {
  if (c.state !== 'alive' || c.invuln > 0) return;
  for (const b of w.fShots.list) { if (Math.hypot(b.x - c.x, b.y - c.y) < b.r + 4.5) { b.dead = true; w.hurtContestant(c, 1, b.kind, b.id, Math.atan2(b.vy || 0, b.vx || 0)); if (c.invuln > 0) return; } }
  for (const e of w.enemies) { const A = MT.ENEMIES[e.kind]; if (A && A.contact && !e.hidden && Math.hypot(e.x - c.x, e.y - c.y) < e.r + c.r * .75) { w.hurtContestant(c, Math.max(1, A.contact), 'contact', e.id, MT.angTo(e, c)); return; } }
  for (const l of w.lobs) if (l.z <= 2 && l.kind === 'tomato' && Math.hypot(l.x - c.x, l.y - c.y) < 14) { w.hurtContestant(c, 1, 'tomato', l.id, 0); return; }
  if (w.boss && w.boss.contactR) { const b = w.boss; if (Math.hypot(b.x - c.x, b.y - c.y) < b.contactR + c.r * .7 && b.sub !== 'tele') w.hurtContestant(c, b.contactDmg || 1, 'boss', 0, MT.angTo(b, c)); }
};
N.localPickups = function (w, c) {
  if (c.state !== 'alive' && c.state !== 'walkin') return; const net = w.net;
  for (const p of w.pickups) { if (net.claimed.has(p.id) || p.caged) continue; if (Math.hypot(c.x - p.x, c.y - p.y) < c.r + p.r && p.z < 14) {
    net.claimed.add(p.id); net.q.push(['claim', p.id]);
    if (p.kind === 'cap') { w.giveWeapon(c, p.w); w.event('capsule', { slot: c.slot, w: p.w, x: p.x, y: p.y }); }
    else if (p.kind === 'bomb') { if (c.bombs < 3) c.bombs++; w.event('pickup', { slot: c.slot, kind: 'bomb' }); }
    else if (p.kind === 'life') w.event('life', { slot: c.slot });
    else { w.event('cash', { slot: c.slot, amt: { bill: 100, stack: 500, bar: 1000, case: 5000, prize: 1500, key: 0 }[p.kind] || 0, x: p.x, y: p.y }); if (p.kind === 'key') w.event('key', { slot: c.slot, n: 0, bonus: true }); }
  } }
  w.pickups = w.pickups.filter(p => !net.claimed.has(p.id));
};
// the client's mirror step
WP.mirrorStep = function (dt) { /* the client's step is driven by MT.net.update (clientStep) */ };
