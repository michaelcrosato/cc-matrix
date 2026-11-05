// ---- AI Hub sessions (Session Protocol v1, shared-world): the card, the Lightning Round, host and client netcode ----
// The host's copy runs the world; clients run their own contestant and mirror the rest from snapshots (render delay
// 120 ms, interpolated by id). Every message is JSON through AIHub only: at most 20 a second, none over 16 KB.
const NET = MT.net = { active: false, isHost: false, isServer: false, me: null, info: null, hub: null, overlayOpen: false, ov: { i: 0 }, sentT: 0, snapN: 0, roomSeq: 0, tokens: 40, tokT: 0, stats: { sent: 0, recv: 0, maxBytes: 0, bySec: {} }, snaps: [], reports: {}, claims: new Set(), outbox: [], ended: false, finished: false, left: new Set(), card: null, endReason: null, over: null, lastV: 0, landed: new Set(), startAt: null };
// code tables (kinds, states, events, weapons, phases) live here only
const KIND_CODES = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'discoBig', 'discoSmall', 'heckler', 'hecklerKing', 'tank', 'snake', 'snakeSeg', 'brute', 'paparazzo'];
const STATE_CODES = ['walk', 'wind', 'swing', 'rest', 'hop', 'fuse', 'idle', 'tele', 'move', 'flare', 'throw', 'aim', 'rear', 'lunge', 'charge', 'stun'];
const BULLET_CODES = ['orb', 'shard', 'beam', 'coin', 'card', 'static', 'gravy', 'butter', 'shell', 'spark', 'tomato', 'tot'];
const PICK_CODES = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'capsule', 'bomb', 'life', 'statue'];
const WPN_CODES = ['blaster', 'spread', 'rockets', 'popcorn', 'laser'];
const PHASE_CODES = ['ENTER', 'INTRO', 'WAVES', 'CLEAR', 'EXIT', 'BOSS_INTRO', 'BOSS', 'BOSS_DEATH', 'DONE', 'HOLD', 'BONUS'];
const DOOR_CODE = { closed: 0, opening: 1, closing: 1, open: 2, exit: 3 };
const EVENT_CODES = ['kill', 'hurt', 'died', 'showboat', 'prime', 'primeEnd', 'stunt', 'clear', 'exits', 'door', 'bomb', 'blast', 'partDown', 'bossIntro', 'bossDead', 'line', 'phase', 'keyDrop', 'exitPicked', 'cash', 'prize', 'key', 'powerup', 'respawn', 'multikill', 'wave', 'hurry', 'left'];
NET.codes = { KIND_CODES, STATE_CODES, BULLET_CODES, PICK_CODES, WPN_CODES, PHASE_CODES, EVENT_CODES };
const q10 = v => Math.round(v * 10), now = () => NET.hub && NET.hub.time ? NET.hub.time() : 0;
NET.inject = hub => { NET.hub = hub; };
NET.hubObj = () => NET.hub || GLOBAL.AIHub;
/** send through the hub, never over 20 a second (bursts of 40) or 16 KB */
NET.send = (data, reliable = true, to) => {
  const H = NET.hubObj(); if (!H || NET.ended) return false;
  const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000, tt = NET.clock !== undefined ? NET.clock : t;
  NET.tokens = Math.min(38, NET.tokens + (tt - NET.tokT) * 19); NET.tokT = tt;
  if (NET.tokens < 1) return false;
  const text = JSON.stringify(data); if (text.length > 16000) return false;
  NET.tokens -= 1;
  const ok = H.send(data, to === undefined ? { reliable } : { reliable, to });
  if (ok !== false) { NET.stats.sent++; NET.stats.maxBytes = Math.max(NET.stats.maxBytes, text.length); if (data.t === 's') NET.stats.lastSnapBytes = text.length; }
  return ok !== false;
};
// ------------------------------------------------------------------------------------------------ connect, the card
NET.begin = () => { /* the session card scene connects */ };
NET.connect = async () => {
  const H = NET.hubObj(); if (!H) return null;
  const info = await H.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  if (!info) return null;
  NET.info = info; NET.active = true; NET.isHost = !!info.isHost; NET.isServer = !!info.server; NET.me = info.me;
  H.on('card', c => { NET.card = c; });
  H.on('start', s => { NET.startAt = s; });
  H.on('message', (d, from) => NET.onMessage(d, from));
  H.on('leave', e => NET.onLeave(e));
  H.on('time-up', () => { if (NET.isHost) NET.finish(false); });
  H.on('end', e => NET.onEnd(e));
  // the run: contestants seated by the hub's players (names drawn on the canvas only, clipped, unsupported letters as ?)
  MT.newRun({ mode: 'session', diff: 'CONTESTANT', seed: info.seed >>> 0 });
  MT.seedAll(info.seed >>> 0);
  info.players.forEach((p, i) => {
    const name = String(p.name || 'PLAYER').toUpperCase().replace(/[^A-Z0-9 .!?-]/g, '?').slice(0, 12);
    const ctl = p.id === NET.me ? 'local' : NET.isHost ? 'remote' : 'mirror';
    const c = MT.addRunPlayer({ slot: i % 4, look: i % 4, ctl, input: ctl === 'local' ? game.input : null, name, netId: p.id });
    c.pr.lives = 99;
  });
  if (H.ready) H.ready();
  return info;
};
const PRE_PLAYERS = [{ id: 0, name: 'ROCKET' }, { id: 1, name: 'VOLT' }, { id: 2, name: 'MOXIE' }];
NET.cardScene = {
  input: MASH_MENU, view: 'threequarter', expand: true, touch: [], camera: { zoom: false },
  enter(d = {}) {
    this.preview = !!d.preview; this.t = 0; this.state = 'connecting'; this.rigs = []; this.btns = null; this.saidReady = false;
    MT.music.play('theme'); game.allowJoin(false);
    if (this.preview) { this.state = 'card'; this.players = PRE_PLAYERS.map((p, i) => ({ id: p.id, name: p.name, slot: i })); this.rigs = this.players.map(p => makeContestantRig(p.slot, p.slot)); return; }
    if (HAS_DOM && !this._key) { this._key = e => { if ((e.key === 'Enter' || e.code === 'Enter') && game.sceneName === 'sessionCard' && NET.active && !NET.answeredReady) { NET.answer('ready'); } }; window.addEventListener('keydown', this._key, true); }
    NET.connect().then(info => {
      if (!info) { game.go('title', {}); return; }
      this.players = info.players.map((p, i) => ({ id: p.id, name: MT.run.contestants[i].pr.name, slot: i % 4 }));
      this.rigs = this.players.map(p => makeContestantRig(p.slot, p.slot));
      this.state = NET.isServer ? 'server' : 'card';
      LINES.seq('sessionCard', {}, 2);
    }).catch(e => { game.fail('session connect', e); game.go('title', {}); });
  },
  exit() { if (this._key && HAS_DOM) { window.removeEventListener('keydown', this._key, true); this._key = null; } },
  update(dt) {
    this.t += dt; LINES.step(1 / 120); MT.studioStep(dt, null);
    if (!game.headless) { if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio'); BACKDROP.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); }
    if (this.preview) { const nav = UI.nav(); if (nav.cancel || nav.confirm) game.go('title', {}); return; }
    if (!NET.active) return;
    for (const rg of this.rigs) if (!MT.cfg.skipRigs) rg.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'hips', expr: 'smile' });
    const nav = UI.nav();
    if (!NET.isServer) {
      if (nav.confirm || (this.btns && UI.clickIn(this.btns.ready))) NET.answer('ready');
      if (nav.more || (this.btns && UI.clickIn(this.btns.more))) NET.answer('more');
    }
    const H = NET.hubObj(), tm = H.time ? H.time() : -Infinity;
    if (NET.startAt && tm >= -3200) this.state = 'countdown';
    if (NET.startAt && tm >= 0) { NET.startPlay(); }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .55);
    r.overlay(g => {
      const lh = UI.logo(g, r.W / 2, 8, 2, t);
      UI.text(g, 'THE LIGHTNING ROUND', r.W / 2, 8 + lh + 2, '#2ee6ff', { align: 'center' });
      if (this.state === 'connecting') { UI.text(g, 'CONNECTING TO THE STUDIO...', r.W / 2, r.H / 2, '#fff7e8', { align: 'center' }); return; }
      const P = this.players || [], card = NET.card || { left: null, ready: [] }, y0 = 8 + lh + 16, pw = Math.min(90, (r.W - 20) / Math.max(1, P.length));
      UI.text(g, "TONIGHT'S CONTESTANTS", r.W / 2, y0, '#ffcc33', { align: 'center' });
      P.forEach((p, i) => {
        const x = Math.round(r.W / 2 - P.length * pw / 2 + i * pw), col = SLOT_COLORS[p.slot], ready = (card.ready || []).includes(p.id);
        UI.panel(g, x + 2, y0 + 10, pw - 4, 64, { alpha: .85, border: col });
        if (this.rigs[i] && !MT.cfg.skipRigs) this.rigs[i].drawPortrait(g, x + pw / 2 - 16, y0 + 14, 32, { zoom: 1.6, turn: .3, bg: E.tones(col).deep });
        UI.text(g, p.name, x + pw / 2, y0 + 50, col, { align: 'center' });
        if (ready) UI.text(g, 'READY!', x + pw / 2, y0 + 60, '#3aff6a', { align: 'center', font: 'tiny' });
        if (p.id === NET.me) UI.text(g, 'YOU', x + pw / 2, y0 + 13, '#fff7e8', { align: 'center', font: 'tiny' });
      });
      const y1 = y0 + 80;
      UI.text(g, 'HOW TO WIN: GRAB THE MOST CASH, BEAT MASHY TOGETHER', r.W / 2, y1, '#fff7e8', { align: 'center' });
      const I = game.input;
      MT.glyph.prompt(g, r.W / 2, y1 + 12, [['move', 'MOVE'], ['aim', 'AIM+FIRE']], I, { align: 'center' });
      const pi = { lastDevice: I.lastDevice, glyphs: I.glyphs, map: MASH_PLAY, codeLabel: c => I.codeLabel(c) };
      MT.glyph.prompt(g, r.W / 2, y1 + 26, [['slide', 'SLIDE'], ['bomb', 'BOMB'], ['showboat', 'SHOWBOAT']], pi, { align: 'center' });
      const left = this.state === 'countdown' ? null : card.left, tm = NET.hubObj() && NET.hubObj().time ? NET.hubObj().time() : -Infinity;
      if (this.state === 'countdown' && isFinite(tm)) { const k = Math.ceil(-tm / 1000); UI.title(g, k > 0 ? String(k) : 'MASH!', r.W / 2, r.H - 60, 4); }
      else UI.text(g, card.paused ? 'PAUSED' : card.starting ? 'STARTING...' : left !== null && left !== undefined ? 'STARTS IN ' + Math.ceil(left / 1000) : '', r.W / 2, r.H - 52, '#ffcc33', { align: 'center', scale: 2 });
      if (!NET.isServer && this.state !== 'countdown') {
        const bw = 100, bh = 18, y = r.H - 30, rd = { x: Math.round(r.W / 2 - bw - 6), y, w: bw, h: bh }, mo = { x: Math.round(r.W / 2 + 6), y, w: bw, h: bh }; this.btns = { ready: rd, more: mo };
        px.rect(g, rd.x, rd.y, rd.w, rd.h, NET.answeredReady ? '#3aff6a' : '#ffcc33'); UI.text(g, 'READY', rd.x + rd.w / 2, rd.y + 5, '#140a24', { align: 'center', shadow: false });
        px.rect(g, mo.x, mo.y, mo.w, mo.h, '#3a1e5a'); UI.text(g, card.asked ? 'TAKE BACK' : 'MORE TIME', mo.x + mo.w / 2, mo.y + 5, '#fff7e8', { align: 'center' });
        MT.glyph.draw(g, rd.x - 14, rd.y + 3, 'confirm', I); MT.glyph.draw(g, mo.x + mo.w + 3, mo.y + 3, 'more', I);
      }
      if (this.preview) UI.text(g, 'SESSION CARD PREVIEW (NO HUB)', r.W / 2, r.H - 8, '#7a6a8a', { align: 'center', font: 'tiny' });
    });
    HUD.draw(r, { contestants: [], ratings: new Ratings(), room: null, run: MT.run, phase: '' }, t, { onlyLines: true });
  },
};
NET.answer = what => { const H = NET.hubObj(); if (!H || !H.answer) return; H.answer(what); if (what === 'ready') { NET.answeredReady = true; MT.sfx('bell'); } else MT.sfx('blip'); NET.lastAnswer = what; };
NET.startPlay = () => {
  if (NET.playing) return; NET.playing = true;
  if (NET.isServer) { game.go('sessionServer', {}, { fade: 0 }); return; }
  game.go('play', { room: 'L1' }, { fade: 0 });
};
// ------------------------------------------------------------------------------------------------ the world in a session
NET.attachWorld = w => { w.session = true; NET.world = w; NET.roomSeq++; NET.snaps.length = 0; NET.claims.clear(); NET.landed.clear(); NET.lastV = 0; if (!NET.isHost) { w.cosmetic = true; w.mode = 'mirror'; } };
NET.roomChanged = w => { NET.send({ t: 'room', rm: NET.roomSeq, id: w.room.id, entry: w.entry }, true); };
/** each play step: send what this copy owes */
NET.step = dt => {
  NET.clock = (NET.clock || 0) + dt;
  const w = PLAY.world; if (!w || NET.ended) return;
  NET.sentT += dt;
  if (NET.isHost) {
    if (NET.sentT >= 1 / 15) { NET.sentT = 0; NET.send(NET.snapshot(w), false); }
    if (NET.finishAt !== undefined && NET.clock >= NET.finishAt) NET.finish(true);
  } else {
    if (NET.sentT >= 1 / 15) { NET.sentT = 0; const c = NET.local(); if (c) NET.send({ t: 'c', a: now() | 0, s: [q10(c.x), q10(c.y), Math.round(c.aim * 1000), NET.flags(c), WPN_CODES.indexOf(c.weapon), q10(c.wT), c.hp, c.pr.lives, c.state === 'dead' ? 1 : 0] }, false); }
    NET.ceT = (NET.ceT || 0) + dt;
    if (NET.outbox.length && NET.ceT >= .26) { NET.ceT = 0; NET.send({ t: 'ce', ev: NET.outbox.splice(0, 12) }, true); }
  }
};
NET.local = () => MT.run && MT.run.contestants.find(c => c.netId === NET.me && c.ctl !== 'remote' && c.ctl !== 'mirror');
NET.flags = c => (c.firing ? 1 : 0) | (c.slideT > 0 ? 2 : 0) | (c.boatT > 0 ? 4 : 0) | (c.state === 'dead' ? 8 : 0) | (c.addons.shield > 0 ? 16 : 0) | (c.addons.records > 0 ? 32 : 0) | (c.addons.speed > 0 ? 64 : 0) | (c.invuln > 0 ? 128 : 0) | (c.state === 'walkin' ? 256 : 0) | (c.state === 'drop' ? 512 : 0) | (c.state === 'exit' ? 1024 : 0);
/** the host's snapshot of its world */
NET.snapshot = w => {
  const dr = DOOR_IDS.reduce((a, id, i) => a | (DOOR_CODE[w.arena.doors[id].state] << (i * 2)), 0);
  const P = w.contestants.map(c => [c.netId, q10(c.x), q10(c.y), Math.round(c.aim * 1000), NET.flags(c), WPN_CODES.indexOf(c.weapon), q10(c.wT), c.hp, c.pr.lives, c.pr.cash, c.pr.bombs, c.pr.kills]);
  const Ex = w.enemies.slice(0, 160).map(e => [e.id, KIND_CODES.indexOf(e.kind), q10(e.x), q10(e.y), Math.round(e.face * 100), STATE_CODES.indexOf(e.state), Math.round(e.rs.hpPct * 100), e.kind === 'tank' ? Math.round((e.turret || 0) * 100) : e.leap || (e.dropT !== undefined && e.dropT < .9) ? Math.round(e.z) : 0, e.entering ? 1 : 0]);
  const B = w.fShots.list.slice(0, 200).map(b => [b.data.id, BULLET_CODES.indexOf(b.data.kind), q10(b.x), q10(b.y), Math.round(b.vx), Math.round(b.vy)]).concat(w.lobs.slice(0, 20).map(L => [L.id, BULLET_CODES.indexOf(L.kind), q10(L.x), q10(L.y), Math.round(L.vx), Math.round(L.vy), Math.round(L.z), Math.round(L.vz), Math.round(L.tx), Math.round(L.ty)]));
  const K = w.pickups.slice(0, 40).map(p => [p.id, PICK_CODES.indexOf(p.kind) + (p.kind === 'capsule' ? 16 * (CAPSULES.indexOf(p.wpn) + 1) : 0), q10(p.x), q10(p.y), Math.round(p.z), p.ttl === Infinity ? -1 : q10(p.ttl)]);
  const V = w.ring.filter(v => v[0] > (NET.ringFloor || 0)).slice(-40).map(([seq, name, d]) => NET.encodeEv(seq, name, d)).filter(Boolean);
  return { t: 's', a: now() | 0, n: ++NET.snapN, rm: NET.roomSeq, id: w.room.id, ph: PHASE_CODES.indexOf(w.phase), pt: q10(w.phaseT), dr, R: q10(w.ratings.R), X: w.ratings.X, pm: q10(w.ratings.prime), wv: w.wave, P, E: Ex, B, K, G: w.boss ? w.boss.toNet() : 0, V };
};
NET.encodeEv = (seq, name, d) => {
  const code = EVENT_CODES.indexOf(name); if (code < 0) return null;
  const o = {}; for (const k in d) { const v = d[k]; if (v && typeof v === 'object' && v.netId !== undefined) o[k] = { c: v.netId }; else if (v && typeof v === 'object' && v.name && v.value) o[k] = { name: v.name, value: v.value, icon: v.icon, line: v.line }; else if (typeof v !== 'object' || v === null) o[k] = typeof v === 'number' ? Math.round(v * 10) / 10 : v; }
  return [seq, code, o];
};
// ------------------------------------------------------------------------------------------------ messages
NET.onMessage = (d, from) => {
  NET.stats.recv++; if (!d || NET.ended) return;
  if (NET.isHost) {
    if (d.t === 'c') { const r = NET.reports[from]; if (!r || d.a >= r.a) NET.reports[from] = d; }
    else if (d.t === 'ce') for (const ev of d.ev || []) NET.hostEvent(from, ev);
  } else {
    if (d.t === 's') { if (d.rm !== NET.roomSeq && PLAY.world && d.id !== PLAY.world.room.id) return; NET.snaps.push(d); NET.snaps.sort((a, b) => a.a - b.a); if (NET.snaps.length > 8) NET.snaps.shift(); }
    else if (d.t === 'room') { NET.pendingRoom = d; }
    else if (d.t === 'over') { NET.over = d; }
  }
};
NET.hostEvent = (from, ev) => {
  const w = PLAY.world; if (!w) return; const c = w.contestantById(from); if (!c) return;
  const [k, a1, a2, a3] = ev;
  if (k === 'claim') {
    const p = w.pickups.find(q => q.id === a1); if (!p || p.dead) return;
    if (Math.hypot(p.x - c.x, p.y - c.y) > 40) return;
    if (p.kind === 'capsule' || p.kind === 'bomb' || p.kind === 'life') { p.dead = true; w.event('powerup', { c, w: p.wpn || p.kind }); if (p.kind === 'bomb') c.pr.bombs = Math.min(3, c.pr.bombs + 1); return; }
    w.collect(c, p);
  } else if (k === 'hurt') { w.ratings.lose(12); c.hurtT = 1; w.event('hurt', { c, dmg: a1 || 1, kind: a2 }); if (a3) { const b = w.fShots.list.find(q => q.data.id === a3); if (b) b.dead = true; } }
  else if (k === 'died') { c.pr.cash = Math.max(0, c.pr.cash - 2500); c.pr.deaths++; w.ratings.lose(25); w.event('died', { c }); }
  else if (k === 'bomb') { c.place(a1 / 10, a2 / 10); w.showstopper(c); }
  else if (k === 'boat') { const g = w.ratings.add(a1, w); c.pr.boatGain += g; w.event('showboat', { c, gain: Math.round(g) }); }
  else if (k === 'respawn') w.event('respawn', { c });
};
/** the host moves a remote contestant from its newest report; a client draws the others from snapshots */
NET.stepRemote = (w, c, dt) => {
  if (c.ctl === 'remote') {
    const r = NET.reports[c.netId];
    if (r) { const s = r.s; const tx = s[0] / 10, ty = s[1] / 10; c.body.vx = (tx - c.x) * 10; c.body.vy = (ty - c.y) * 10; c.x = lerp(c.x, tx, Math.min(1, dt * 14)); c.y = lerp(c.y, ty, Math.min(1, dt * 14)); c.aim = s[2] / 1000; c.firing = !!(s[3] & 1); c.slideT = s[3] & 2 ? .2 : 0; c.boatT = s[3] & 4 ? .3 : 0; c.weapon = WPN_CODES[s[4]] || 'blaster'; c.wT = s[5] / 10; c.hp = s[6]; c.addons.shield = s[3] & 16 ? 1 : 0; c.addons.records = s[3] & 32 ? 1 : 0; c.addons.speed = s[3] & 64 ? 1 : 0; c.state = s[3] & 8 ? 'dead' : s[3] & 512 ? 'drop' : s[3] & 256 ? 'walkin' : s[3] & 1024 ? 'exit' : 'play'; c.facing = c.firing ? c.aim : Math.hypot(c.body.vx, c.body.vy) > 5 ? Math.atan2(c.body.vy, c.body.vx) : c.facing; }
    c.fireCD -= dt;
    if (c.state === 'play') MT.fireWeapon(w, c, dt); else c.laserSeg = null;
    return;
  }
  // mirror: interpolated in NET.applySnapshots; cosmetic shots from its flags
  c.recA += 4.2 * dt;
  if (c.state === 'play') { c.fireCD -= dt; MT.fireWeapon(w, c, dt); }
};
// ------------------------------------------------------------------------------------------------ the client's step
NET.clientStep = (w, dt) => {
  if (NET.pendingRoom) { const d = NET.pendingRoom; NET.pendingRoom = null; NET.roomSeq = d.rm - 1; PLAY.load(d.id, d.entry); w = PLAY.world; NET.roomSeq = d.rm; }
  w.lastDt = dt; w.time += dt; w.phaseT += dt;
  const me = NET.local();
  if (me && !NET.ended) { const it = me.state === 'play' && !NET.overlayOpen ? (me.ctl === 'bot' ? MT.bot.intent(w, me, dt) : MT.intentFrom(me.input, me)) : null; me.step(dt, w, it); }
  NET.applySnapshots(w, dt);
  for (const c of w.contestants) if (c.ctl === 'mirror') NET.stepRemote(w, c, dt);
  w.pShots.update(dt, w.arena.map); w.fShots.update(dt, w.arena.map); MT.stepProjectiles(w, dt);
  for (const L of w.lobs) { L.t += dt; L.vz -= L.g * dt; L.x += L.vx * dt; L.y += L.vy * dt; L.z += L.vz * dt; if (L.z <= 0) { L.dead = true; NET.landed.add(L.id); if (L.kind === 'tomato') { w.decals.push({ kind: 'splat', x: L.x, y: L.y, r: 14, t: 0, life: 6 }); MT.sfx('splat'); if (me && me.targetable && dist2(me, L) < (10 + me.r) ** 2) w.hurtContestant(me, 1, { kind: 'tomato', id: L.id, x: L.x, y: L.y }); } } }
  E.prune(w.lobs, L => L.dead);
  for (const e of w.enemies) e.t += dt;
  w.collide(dt);
  for (const d of w.decals) d.t += dt; E.prune(w.decals, d => d.t > d.life);
  for (const d of w.decals) if (d.kind === 'splat' && me && dist2(me, d) < d.r * d.r) me.slowT = .1;
  if (w.boss && me && me.targetable) { const b = w.boss.rs, d = Math.hypot(me.x - b.x, me.y - b.y); if (d < 24 + me.r && !b.gone) { const a = Math.atan2(me.y - b.y, me.x - b.x); me.x = b.x + Math.cos(a) * (24 + me.r); me.y = b.y + Math.sin(a) * (24 + me.r); clampInterior(me.body, 5); const spd = Math.hypot(b.x - (NET._bx || b.x), b.y - (NET._by || b.y)) / dt; if (spd > 100) w.hurtContestant(me, 2, { kind: 'mashy', x: b.x, y: b.y }); } NET._bx = b.x; NET._by = b.y; }
  // claims: touch a pickup, hide it, apply weapons at once, tell the host
  if (me && me.targetable) for (const p of w.pickups) { if (p.dead || NET.claims.has(p.id) || (p.locked && p.locked())) continue; if (dist2(me, p) < (me.r + 7) ** 2) { NET.claims.add(p.id); p.dead = true; if (p.kind === 'capsule') { MT.giveItem(w, me, p.wpn); w.event('powerup', { c: me, w: p.wpn }); } else if (p.kind === 'bomb') MT.sfx('powerup'); else MT.sfx('kaching'); NET.outbox.push(['claim', p.id]); } }
  E.prune(w.pickups, p => p.dead);
  // what my contestant did goes to the host
  for (const ev of w.events) if (ev.data && ev.data.c === me) { if (ev.name === 'hurt') NET.outbox.push(['hurt', ev.data.dmg, ev.data.kind, ev.data.id]); else if (ev.name === 'died') NET.outbox.push(['died']); else if (ev.name === 'bomb') NET.outbox.push(['bomb', q10(me.x), q10(me.y)]); else if (ev.name === 'showboat') NET.outbox.push(['boat', ev.data.gain]); else if (ev.name === 'respawn') NET.outbox.push(['respawn']); }
  w.arena.update(dt, () => {});
  if (!MT.cfg.skipRigs) { for (const c of w.contestants) c.animate(dt); for (const e of w.enemies) MT.animateEnemy(e, dt); if (w.boss) w.boss.animate(dt); }
  for (const c of w.contestants) c.syncRs();
  if (me && me.state === 'exit') { /* the host's room message moves us */ }
};
/** snapshots: the world's state at render time (120 ms behind), interpolated by id; foe shots at now */
NET.applySnapshots = (w, dt) => {
  const S = NET.snaps; if (!S.length) return;
  const tnow = now(), tr = tnow - 120;
  let a = S[0], b = S[S.length - 1];
  for (let i = 0; i < S.length - 1; i++) if (S[i].a <= tr && S[i + 1].a >= tr) { a = S[i]; b = S[i + 1]; break; }
  const k = b.a > a.a ? clamp((tr - a.a) / (b.a - a.a), 0, 1.0 + 100 / Math.max(1, b.a - a.a)) : 1, newest = S[S.length - 1];
  if (newest.id !== w.room.id) return;
  // the show's numbers
  w.ratings.R = newest.R / 10; w.ratings.prime = newest.pm / 10; w.wave = newest.wv;
  const ph = PHASE_CODES[newest.ph]; if (ph && ph !== w.phase) { w.phase = ph; w.phaseT = newest.pt / 10; }
  DOOR_IDS.forEach((id, i) => { const code = (newest.dr >> (i * 2)) & 3, d = w.arena.doors[id]; const want = ['closed', 'opening', 'open', 'exit'][code]; if (want === 'exit' && d.state !== 'exit') { const to = MT.ROOMS[w.room.exits[id]]; d.isExit = true; d.sign = to ? { name: w.room.lightning ? 'NEXT' : to.name, icon: MT.roomIcon(to), room: to.id } : null; } if (want === 'opening' && d.state === 'closed') { d.state = 'opening'; d.t = 0; } else if (want === 'opening' && d.state === 'open') { d.state = 'closing'; d.t = 0; } else if (want !== 'opening') { d.state = want; d.u = want === 'closed' ? 0 : 1; } });
  // contestants: my own is mine; the others interpolated; everyone's money from the host
  const PA = new Map(a.P.map(p => [p[0], p])), PB = new Map(b.P.map(p => [p[0], p]));
  for (const c of w.contestants) {
    const pb = PB.get(c.netId), pa = PA.get(c.netId) || pb; const pn = newest.P.find(p => p[0] === c.netId);
    if (pn) { c.pr.cash = pn[9]; c.pr.kills = pn[11]; if (c.netId !== NET.me) { c.pr.bombs = pn[10]; } }
    if (c.netId === NET.me || !pb) continue;
    const nx = lerp(pa[1], pb[1], k) / 10, ny = lerp(pa[2], pb[2], k) / 10; c.body.vx = (nx - c.x) / Math.max(dt, 1e-3); c.body.vy = (ny - c.y) / Math.max(dt, 1e-3); c.x = nx; c.y = ny;
    c.aim = pb[3] / 1000; const f = pb[4]; c.firing = !!(f & 1); c.slideT = f & 2 ? .2 : 0; c.boatT = f & 4 ? .3 : 0; c.addons.shield = f & 16 ? 1 : 0; c.addons.records = f & 32 ? 1 : 0; c.addons.speed = f & 64 ? 1 : 0; c.invuln = f & 128 ? .2 : 0;
    c.state = f & 8 ? 'dead' : f & 512 ? 'drop' : f & 256 ? 'walkin' : f & 1024 ? 'exit' : 'play'; if (c.state === 'dead') c.deadT = 1;
    c.weapon = WPN_CODES[pb[5]] || 'blaster'; c.wT = pb[6] / 10; c.hp = pb[7]; c.pr.lives = pb[8];
    c.facing = c.firing ? c.aim : Math.hypot(c.body.vx, c.body.vy) > 5 ? Math.atan2(c.body.vy, c.body.vx) : c.facing;
  }
  // enemies by id
  const EA = new Map(a.E.map(e => [e[0], e])), seen = new Set();
  for (const eb of b.E) {
    const ea = EA.get(eb[0]) || eb; seen.add(eb[0]);
    let e = w.enemies.find(q => q.id === eb[0]);
    const kind = KIND_CODES[eb[1]]; if (!kind) continue;
    if (!e) { const A = ENEMIES[kind]; e = { id: eb[0], kind, x: eb[2] / 10, y: eb[3] / 10, z: 0, vx: 0, vy: 0, face: eb[4] / 100, r: A.r, hp: 1, maxHp: 1, state: 'walk', t: 0, flash: 0, dead: false, alpha: kind === 'mime' ? .45 : 1, mirror: true }; e.rs = { kind, x: e.x, y: e.y, z: 0, face: e.face, vx: 0, vy: 0, state: 'walk', t: 0, t2: 0, hpPct: 1, flash: 0, alpha: e.alpha }; w.enemies.push(e); }
    const nx = lerp(ea[2], eb[2], k) / 10, ny = lerp(ea[3], eb[3], k) / 10; e.vx = (nx - e.x) / Math.max(dt, 1e-3); e.vy = (ny - e.y) / Math.max(dt, 1e-3); e.x = nx; e.y = ny; e.face = eb[4] / 100; e.state = STATE_CODES[eb[5]] || 'walk';
    const hp = eb[6] / 100; if (hp < (e.rs.hpPct || 1) - .001) e.flash = .08; e.flash = Math.max(0, e.flash - dt);
    e.entering = !!eb[8]; e.z = (kind !== 'tank' && eb[7]) ? eb[7] : 0; if (kind === 'tank') e.turret = eb[7] / 100;
    const s = e.rs; s.x = e.x; s.y = e.y; s.z = e.z; s.face = e.face; s.vx = e.vx; s.vy = e.vy; s.state = e.state; s.t = e.t; s.hpPct = hp; s.flash = e.flash; s.alpha = e.alpha; s.turret = e.turret; s.tread = (s.tread || 0) + Math.hypot(e.vx, e.vy) * dt;
  }
  for (const e of w.enemies) if (!seen.has(e.id) && !e.dead) { e.dead = true; }
  E.prune(w.enemies, e => e.dead);
  // foe shots from the newest snapshot, moved to now; lobs separately
  const age = Math.max(0, (tnow - newest.a) / 1000), byId = new Map(w.fShots.list.map(q => [q.data.id, q])), keep = new Set();
  for (const bb of newest.B) {
    const kind = BULLET_CODES[bb[1]]; keep.add(bb[0]);
    if (kind === 'tomato' || kind === 'tot') { if (NET.landed.has(bb[0]) || w.lobs.some(L => L.id === bb[0])) continue; const L = { id: bb[0], kind, x: bb[2] / 10 + bb[4] * age, y: bb[3] / 10 + bb[5] * age, z: bb[6] + bb[7] * age, vx: bb[4], vy: bb[5], vz: bb[7] - 360 * age, g: 360, tx: bb[8], ty: bb[9], t: 0 }; if (L.z > 0) w.lobs.push(L); continue; }
    let q = byId.get(bb[0]);
    const x = bb[2] / 10 + bb[4] * age, y = bb[3] / 10 + bb[5] * age;
    if (!q) { const F = FOE[kind] || FOE.orb; q = w.fShots.fire({ x, y, z: 10, vx: bb[4], vy: bb[5], r: F.r, life: 6, team: 'f', color: F.color, core: F.core, data: { id: bb[0], kind } }); }
    else if (Math.hypot(q.x - x, q.y - y) > 6) { q.x = x; q.y = y; q.vx = bb[4]; q.vy = bb[5]; }
  }
  for (const q of w.fShots.list) if (!keep.has(q.data.id) && q.t > .25) q.dead = true;
  E.prune(w.fShots.list, q => q.dead);
  // pickups by id
  const kseen = new Set();
  for (const kk of newest.K) {
    kseen.add(kk[0]); if (NET.claims.has(kk[0])) continue;
    let p = w.pickups.find(q => q.id === kk[0]);
    const kind = PICK_CODES[kk[1] % 16], wpn = kk[1] >= 16 ? CAPSULES[Math.floor(kk[1] / 16) - 1] : undefined;
    if (!p) { p = MT.makePickup(kind, kk[2] / 10, kk[3] / 10, { wpn }); p.id = kk[0]; p.z = kk[4]; w.pickups.push(p); }
    p.x = kk[2] / 10; p.y = kk[3] / 10; p.z = kk[4]; p.ttl = kk[5] < 0 ? Infinity : kk[5] / 10; p.vz = 0;
  }
  for (const p of w.pickups) if (!kseen.has(p.id)) p.dead = true;
  E.prune(w.pickups, p => p.dead);
  // the boss from its own netplay state
  if (newest.G) { const kind = newest.G[0]; if (!w.boss || w.boss.kind !== kind) { const B = MT.BOSSES[kind]; w.boss = new B(w); w.boss.introDone = true; } w.boss.fromNet(newest.G); } else if (w.boss) w.boss = null;
  // the host's events, each once
  for (const v of newest.V) { const [seq, code, o] = v; if (seq <= NET.lastV) continue; NET.lastV = seq; NET.playEvent(w, EVENT_CODES[code], o); }
};
NET.playEvent = (w, name, o) => {
  const me = NET.local(), d = {};
  for (const k in o) d[k] = o[k] && typeof o[k] === 'object' && o[k].c !== undefined ? w.contestantById(o[k].c) : o[k];
  if (d.c && d.c === me && ['hurt', 'died', 'showboat', 'bomb', 'powerup', 'respawn'].includes(name)) return;
  if (name === 'blast' && me && me.targetable && dist2(me, d) < (d.r + me.r) ** 2) w.hurtContestant(me, 1, { kind: d.kind, x: d.x, y: d.y });
  if (name === 'bomb' && d.c && d.c !== me) { w.fShots.clear(); }
  if ((name === 'cash' || name === 'prize' || name === 'key') && d.c !== me) return;
  w.events.push({ name, data: d, seq: 0, at: w.time });
};
// ------------------------------------------------------------------------------------------------ leaving, the round's end
NET.onLeave = e => {
  NET.left.add(e.id);
  const w = PLAY.world; if (!w) return;
  const c = w.contestantById(e.id); if (c) { if (game.particles) game.particles.bits(c.x, c.y, 8, 20, ['#ffcc33', '#ff2e88', '#2ee6ff']); MT.banners.show(c.pr.name + ' LEFT THE STUDIO', { color: SLOT_COLORS[c.slot] }); E.prune(w.contestants, q => q === c); E.prune(MT.run.contestants, q => q === c); }
  if (NET.isHost && !MT.run.contestants.length) NET.finish(false);
};
/** the host ends the round once: the 'over' message first, then AIHub.finish with standings by cash */
NET.finish = (won) => {
  if (!NET.isHost || NET.finished) return; NET.finished = true;
  const H = NET.hubObj(), list = MT.run.contestants.filter(c => !NET.left.has(c.netId));
  const sorted = list.slice().sort((a, b) => b.pr.cash - a.pr.cash), standings = [];
  for (const c of sorted) { const last = standings[standings.length - 1]; if (last && sorted.find(q => q.netId === last[0]).pr.cash === c.pr.cash) last.push(c.netId); else standings.push([c.netId]); }
  const scores = {}, stats = {}; for (const c of list) { scores[c.netId] = c.pr.cash; stats[c.netId] = { Kills: c.pr.kills, Prizes: c.pr.prizes.length, Deaths: c.pr.deaths }; }
  const best = (f) => list.length ? list.reduce((a, b) => f(b) > f(a) ? b : a) : null;
  const awards = []; const e1 = best(c => c.pr.cash), e2 = best(c => c.pr.kills), e3 = best(c => c.pr.boatGain);
  if (e1) awards.push({ id: e1.netId, title: 'BIGGEST EARNER', detail: money(e1.pr.cash) }); if (e2) awards.push({ id: e2.netId, title: 'MOST MASHES', detail: e2.pr.kills + ' KILLS' }); if (e3 && e3.pr.boatGain > 0) awards.push({ id: e3.netId, title: 'CROWD FAVORITE', detail: Math.round(e3.pr.boatGain) + ' RATINGS FROM SHOWBOATING' });
  NET.over = { t: 'over', won: !!won, standings, scores, stats };
  NET.send(NET.over, true);
  if (H.finish) H.finish({ standings, scores, won: !!won, stats, awards });
};
NET.roundWon = () => { if (NET.isHost && NET.finishAt === undefined) NET.finishAt = (NET.clock || 0) + .1; };
MT.on('ev:bossDead', () => { if (NET.active && NET.isHost && NET.finishAt === undefined) NET.finishAt = (NET.clock || 0) + 3; });
NET.onEnd = e => {
  if (NET.ended) return; NET.ended = true; NET.endReason = e.reason;
  for (const p of game.players) p.clear();
  if (game.audio) { game.audio.stopMusic(.3); game.audio.mute(true); }
  game.go('sessionEnd', { reason: e.reason }, { fade: 0 });
};
NET.endScene = {
  input: MASH_MENU, view: 'threequarter', expand: true, touch: [],
  enter(d = {}) { this.reason = d.reason || 'finished'; this.t = 0; },
  update(dt) { this.t += dt; for (const p of game.players) p.clear(); MT.frontCam(); },
  draw(r) {
    const t = game.real; backdrop(r, t, .65);
    r.overlay(g => {
      const R = this.reason, title = R === 'finished' ? "THAT'S OUR SHOW!" : R === 'sat-out' ? 'YOU SAT THIS ONE OUT' : R === 'session-ended' ? 'THANKS FOR WATCHING' : 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES';
      UI.title(g, title, r.W / 2, 30, R === 'finished' ? 3 : 1);
      const O = NET.over; if (O && O.scores && MT.run) { let y = 80; for (const grp of O.standings) for (const id of grp) { const c = MT.run.contestants.find(q => q.netId === id) || null; const name = c ? c.pr.name : 'PLAYER ' + (id + 1); UI.text(g, name, r.W / 2 - 80, y, c ? SLOT_COLORS[c.slot] : '#fff7e8', { scale: 2 }); UI.text(g, money(O.scores[id] || 0), r.W / 2 + 80, y, '#ffcc33', { align: 'right', scale: 2 }); y += 20; } if (O.won) UI.text(g, 'MASHY WAS MASHED! A WIN FOR THE TEAM!', r.W / 2, y + 6, '#3aff6a', { align: 'center' }); }
    });
  },
};
NET.serverScene = {
  input: MASH_MENU, view: 'threequarter', expand: true, touch: [],
  enter() { PLAY.overlay = null; MT.run.mode = 'session'; PLAY.load('L1', 'S'); this.t = 0; },
  update(dt) {
    this.t += dt; const w = PLAY.world; if (!w || NET.ended) return;
    NET.step(dt); w.step(dt); NET.serverDrain(w);
    if (w.outcome && !w.outcomeTaken) { w.outcomeTaken = true; if (w.outcome.exit) { PLAY.load(w.outcome.to, MT.entryFor(w.outcome.exit)); NET.roomChanged(PLAY.world); } else NET.roundWon(); }
  },
  draw(r) { r.sky(['#0c0618', '#140a24', '#0c0618']); r.overlay(g => { UI.title(g, 'STUDIO SERVER', r.W / 2, r.H / 2 - 20, 2); const w = PLAY.world; UI.text(g, w ? w.room.name + ' - ' + w.phase + ' - ' + w.enemies.length + ' ENEMIES' : '', r.W / 2, r.H / 2 + 14, '#c9b6e4', { align: 'center' }); }); },
};
// the server keeps a ring of events for snapshots even though it plays no reactions
NET.serverDrain = w => { for (const ev of w.events) { w.ring.push([ev.seq, ev.name, ev.data]); if (w.ring.length > 60) w.ring.shift(); } w.events.length = 0; };
// ------------------------------------------------------------------------------------------------ the session overlay (never pauses)
NET.toggleOverlay = () => { NET.overlayOpen = !NET.overlayOpen; MT.overlay.open = NET.overlayOpen; MT.overlay.who = NET.overlayOpen ? 'session' : null; MT.sfx(NET.overlayOpen ? 'bell' : 'back'); };
NET.overlayStep = () => {
  if (!NET.active || NET.ended || game.sceneName !== 'play') return;
  const I = game.input, createHeld = I.held && I.held.has('Pad8');
  if (I.pressed('pause') && !createHeld) NET.toggleOverlay();
  if (!NET.overlayOpen) return;
  const nav = UI.nav(), items = ['VOLUME', 'MUSIC', 'BUTTON SYMBOLS', 'CLOSE'];
  if (nav.up) NET.ov.i = (NET.ov.i + 3) % 4; if (nav.down) NET.ov.i = (NET.ov.i + 1) % 4;
  const S = game.settings, adj = d => { if (NET.ov.i === 0) S.set('volume', clamp(S.volume + d * .1, 0, 1)); if (NET.ov.i === 1) S.set('music', clamp(S.music + d * .1, 0, 1)); if (NET.ov.i === 2) S.set('glyphs', S.glyphs === 'xbox' ? 'playstation' : 'xbox'); };
  if (nav.left) adj(-1); if (nav.right) adj(1);
  if (nav.confirm) { if (NET.ov.i === 3) NET.toggleOverlay(); else adj(1); }
  if (nav.cancel && !I.pressed('pause')) NET.toggleOverlay();
};
NET.drawOverlay = r => {
  if (!NET.overlayOpen) return;
  r.overlay(g => {
    const w = 200, h = 110, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2, S = game.settings, t = game.real;
    UI.panel(g, x, y, w, h); UI.text(g, 'SESSION MENU (THE SHOW GOES ON)', r.W / 2, y + 6, '#ffcc33', { align: 'center', font: 'tiny' });
    const vals = [Math.round(S.volume * 100) + '%', Math.round(S.music * 100) + '%', S.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION', ''];
    ['VOLUME', 'MUSIC', 'BUTTON SYMBOLS', 'CLOSE'].forEach((lab, i) => UI.row(g, { x: x + 8, y: y + 18 + i * 21, w: w - 16, h: 19 }, lab, NET.ov.i === i, t, { scale: 1, align: 'left', value: vals[i] }));
  });
};
MT.on('ev:phase', () => {});
// the play scene in a session: no pause; Esc / Options opens the session overlay instead
const _sessionHook = () => { if (NET.active) NET.overlayStep(); };
E.HOOKS && E.HOOKS.step.push(g => { if (g === game) _sessionHook(); });
