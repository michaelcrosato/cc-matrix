/* ---- AI HUB SESSIONS: connect, the game's own card, ready, the 3-2-1, play in one shared world, time-up, the end.
   In a session: no title, menus, settings screens, pausing, dev tools, high scores or quitting; Create + Options is the
   hub's (engine change E4). Outside one (AIHub.active false, or connect() answers null) none of this runs ---- */
const SESS = { info: null, card: null, started: false, startIn: 0, over: false, endInfo: null, finished: false, menu: null, left: new Set(), timeUp: false };
const SESS_MS = 6 * 60 * 1000;
scenes.session = {
  pausable: false, touch: [], camera: false, view: 'threequarter',
  enter() {
    this.t = 0; this.state = 'connecting'; game.allowJoin(false); game.input.touchEnabled = false;
    HUB.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { game.go('title'); return; }
      SESS.info = info; NET.reset(info.server ? 'server' : info.isHost ? 'host' : 'client');
      HUB.on('card', c => { SESS.card = c; });
      HUB.on('start', () => { SESS.started = true; });
      HUB.on('message', (d, from) => { if (NET.ended || !W) return; NET.received++; if (NET.role === 'client') { if (from === info.host) clientHear(d); } else hostHear(from, d); });
      HUB.on('leave', ({ id }) => sessionLeave(id));
      HUB.on('time-up', () => { SESS.timeUp = true; if (NET.role !== 'client') sessionFinish('time'); });
      HUB.on('end', e => sessionEnd(e));
      sessionWorld(0, 1);
      this.state = 'card';
      HUB.ready();
    });
  },
  update(dt) {
    this.t += dt; stepNarrator(dt);
    if (this.state !== 'card') return;
    if (SESS.started && HUB.time() >= 0) { game.go('splay', {}, { fade: 0 }); return; }
    if (SESS.started) return;
    const I = game.input, c = I.clicked();
    if (I.pressed('confirm') || I.pressed('start') || (c && this.readyBtn && inBox(c, this.readyBtn))) { HUB.answer('ready'); sfx('select'); I.consumeAll(); }
    if (I.pressed('magic') || game.input.held.has('KeyT') && !this._t || (c && this.moreBtn && inBox(c, this.moreBtn))) { this._t = true; HUB.answer('more'); sfx('move'); }
    if (!game.input.held.has('KeyT')) this._t = false;
  },
  draw(r) {
    r.overlay(g => {
      drawShaft(g, r, this.t * .5, { gauntlet: this.state === 'connecting' });
      px.blend(g, .4, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201018'));
      if (this.state === 'connecting') { logo(g, r, 60, 3); tx(g, 'JOINING THE SESSION...', r.W / 2, 120, '#ffe8b0', { align: 'center' }); return; }
      const info = SESS.info, c = SESS.card || {}, ready = new Set(c.ready || []), y = Math.max(4, Math.round((r.H - 236) / 2));
      logo(g, r, y + 4, r.W > 380 ? 3 : 2);
      tx(g, 'ROUND ' + (info.round || 1), r.W / 2, y + 30, '#e8c890', { align: 'center' });
      // the players, lined up as their heroes in their seat colours
      const ps = info.players, gap = Math.min(80, (r.W - 40) / Math.max(1, ps.length));
      ps.forEach((p, i) => {
        const x = r.W / 2 + (i - (ps.length - 1) / 2) * gap, h = W && W.heroes.find(q => q.hubId === p.id), cls = h ? h.cls : CLASSES[i % 4];
        drawRigAt(g, frontRig(cls), x, y + 96, 1 / 60, { pose: ready.has(p.id) ? 'cheer' : null, facing: Math.PI / 2 });
        tx(g, String(p.name || 'P' + (i + 1)).slice(0, 12), x, y + 102, p.color || SEAT_COLORS[i], { align: 'center' });
        tx(g, get('heroes', cls).name, x, y + 112, '#a89a88', { align: 'center', font: 'tiny' });
        if (ready.has(p.id)) tx(g, 'READY', x, y + 120, '#9aff8a', { align: 'center' });
      });
      tx(g, 'HOW TO WIN: MOST POINTS WHEN THE CLOCK RUNS OUT.', r.W / 2, y + 136, '#ffe8b0', { align: 'center' });
      tx(g, 'TREASURE, KILLS AND STAIRS. DON\'T STARVE.', r.W / 2, y + 146, '#ffe8b0', { align: 'center' });
      if (!info.server) { const I = game.input, pad = I.lastDevice === 'gamepad'; tx(g, 'MOVE ' + (pad ? '[L stick]' : '[WASD]') + '  AIM ' + (pad ? '[R stick]' : '[Mouse]') + '  FIRE ' + key(I, 'fire') + '  MAGIC ' + key(I, 'magic'), r.W / 2, y + 160, '#c8b8a0', { align: 'center' }); }
      const left = SESS.started ? 'STARTING' : c.paused ? 'PAUSED' : c.left != null ? Math.ceil(c.left / 1000) + ' S' : '';
      tx(g, left, r.W / 2, y + 174, '#ffd060', { align: 'center', scale: 2 });
      if (SESS.started) { const n = Math.ceil(-HUB.time() / 1000); if (n > 0 && n < 4) tx(g, String(n), r.W / 2, y + 44, '#ffffff', { align: 'center', scale: 5 }); return; }
      if (info.server) return;
      const by = y + 200;
      this.readyBtn = [r.W / 2 - 110, by, 100, 22]; this.moreBtn = [r.W / 2 + 10, by, 100, 22];
      E.ui.box(g, ...this.readyBtn, { bg: ['#4a6a1a', '#2a3a0a'], border: '#9aff8a' }); tx(g, 'READY ' + key(game.input, 'confirm'), this.readyBtn[0] + 50, by + 7, '#e8ffd8', { align: 'center' });
      E.ui.box(g, ...this.moreBtn, { bg: ['#4a3a1a', '#2a1a0a'], border: c.asked ? '#ffffff' : '#ffd060' }); tx(g, (c.asked ? 'ASKED ' : 'MORE TIME ') + (game.input.lastDevice === 'gamepad' ? key(game.input, 'magic') : '[T]'), this.moreBtn[0] + 50, by + 7, '#ffe8b0', { align: 'center' });
    });
  }
};
const inBox = (p, b) => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3];
/** build (or rebuild) the shared floor: classes by seat, names and colours from the hub */
function sessionWorld(index, serial) {
  const info = SESS.info;
  if (!PARTY.length) {
    startRun(info.players.map((p, i) => ({ seat: i, cls: CLASSES[i % 4], name: String(p.name || 'P' + (i + 1)), color: p.color || SEAT_COLORS[i], input: p.id === info.me && !info.server ? game.input : null, remote: p.id !== info.me || info.server })), { mode: 'session', seed: info.seed || 1 });
    PARTY.forEach((h, i) => { h.hubId = info.players[i].id; });
  }
  for (const h of PARTY) { if (!h.alive) { h.alive = true; h.hp = Math.max(h.hp, 350); } }
  PUP.clear(); NET.snaps = [];
  buildWorld(index, { role: NET.role, serial, seed: info.seed || 1 });
  for (const h of W.heroes) if (SESS.left.has(h.hubId)) h.gone = true;
  W.heroes = W.heroes.filter(h => !h.gone);
}
/** a client hears that the host went down a floor */
function sessionFloor(index, serial) { if (!W || serial <= W.serial) return; sessionWorld(index, serial); floorBanner = 2.5; music(REALM_SONG[W.realm] || 'larder'); }

scenes.splay = {
  pausable: false, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, touch: [], camera: CAM, propSize: 1.3,
  enter() {
    floorBanner = 3; SESS.menu = null; game.input.touchEnabled = false; camBounds();
    if (!SESS.info.server) { music(REALM_SONG[W.realm] || 'larder'); L.enabled = true; lighting(); } else A.mute(true);
    const me = W.heroes.find(h => !h.remote); if (me) game.follow(me, { z: 12, lead: 12 });
    say('start', null, 2);
  },
  update(dt) {
    stepNarrator(dt);
    if (NET.ended) { game.input.clear(); return; }
    const me = W.heroes.find(h => !h.remote);
    // the session's own small menu: Esc or Options; it never pauses (the hero stands still while it is open)
    if (game.input.pressed('pause') && me) { SESS.menu = SESS.menu ? null : new BigMenu(sessionMenuItems(), { y: 70, scale: 1 }); sfx('select'); }
    if (SESS.menu) { SESS.menu.update(); if (game.input.pressed('cancel')) SESS.menu = null; if (me) idleIntent(me); }
    else if (me) { if (me.alive) inputIntent(me, game.input); else idleIntent(me); }
    if (NET.role === 'client') { clientEase(dt); stepWorld(dt); clientTick(dt); }
    else {
      stepWorld(dt);
      for (const h of W.heroes) if (!h.alive && h.deadT >= 5) rise(h, 350, 250);   // sessions: back after 5 s beside a friend, 250 points poorer
      if (W.heroes.length && !W.heroes.some(h => h.alive)) sessionFinish('all down');
      if (W.boss && W.boss.dead && W.boss.deadT > 3) sessionFinish('king');
      if (W.done && !SESS.finished) { const to = W.done.to; const next = to === 'ending' || to >= FLOOR_ORDER.length ? 0 : to; W.events.push(['floor', next, W.serial + 1]); hostTick(dt); netFlush(); sessionWorld(next, W.serial + 1); floorBanner = 2.5; if (!SESS.info.server) music(REALM_SONG[W.realm] || 'larder'); }
      hostTick(dt);
    }
    if (me) { if (game.cam.frame) game.cam.frame(null); game.follow(me, { z: 12, lead: 12 }); }
    else if (W.heroes.length) game.focus(W.heroes[0].x, W.heroes[0].y, 10);
    musicLayers();
  },
  draw(r) {
    if (SESS.info.server) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#0a0610'); tx(g, 'HOSTING', r.W / 2, r.H / 2 - 4, '#a89a88', { align: 'center', scale: 2 }); }); return; }
    drawWorld(r); drawHud(r);
    r.overlay(g => {
      if (SESS.menu) { E.ui.box(g, r.W / 2 - 90, 56, 180, 110, { bg: ['#2a1a10', '#140a06'], border: '#ffd060', alpha: .95 }); tx(g, 'SETTINGS', r.W / 2, 60, '#ffd060', { align: 'center' }); SESS.menu.draw(g, r); }
      if (NET.ended) { px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#100810')); sessionOver(g, r); }
      if (CHEATS.netstats) { const s = NET.stats(); tx(g, NET.role + ' sent ' + s.sent + ' got ' + s.received + ' snap ' + s.lastSnapshotBytes + 'B max ' + s.maxBytes + 'B ' + s.maxPerSec + '/s', 4, r.H - 24, '#9aff8a', { font: 'tiny' }); }
    });
  }
};
function sessionMenuItems() {
  const S2 = game.settings, step = (k, d) => { S2.set(k, clamp(Math.round((S2[k] + d) * 10) / 10, 0, 1)); SESS.menu.items = sessionMenuItems(); };
  return [
    { label: 'VOLUME ' + Math.round(S2.volume * 100) + '%', fn: () => step('volume', S2.volume >= 1 ? -1 : .1) },
    { label: 'MUSIC ' + Math.round(S2.music * 100) + '%', fn: () => step('music', S2.music >= 1 ? -1 : .1) },
    { label: 'VOICES ' + Math.round(S2.voices * 100) + '%', fn: () => step('voices', S2.voices >= 1 ? -1 : .1) },
    { label: 'BUTTONS: ' + (S2.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION'), fn: () => { S2.set('glyphs', S2.glyphs === 'xbox' ? 'playstation' : 'xbox'); SESS.menu.items = sessionMenuItems(); } },
    { label: 'CLOSE', fn: () => { SESS.menu = null; } }
  ];
}
/** the host ends the round: standings by score (ties together), scores, stats and awards */
function sessionFinish(why) {
  if (SESS.finished || NET.role === 'client' || !W) return;
  SESS.finished = true;
  const hs = PARTY.filter(h => !SESS.left.has(h.hubId)).slice().sort((a, b) => b.score - a.score), standings = [];
  for (const h of hs) { const last = standings[standings.length - 1]; if (last && last.s === h.score) last.ids.push(h.hubId); else standings.push({ s: h.score, ids: [h.hubId] }); }
  const scores = {}, stats = {}; for (const h of PARTY) { scores[h.hubId] = h.score; stats[h.hubId] = { Kills: h.stats.kills, Treasure: h.stats.treasure, Food: h.stats.food, Floors: h.stats.floors }; }
  const best = (f, title, detail) => { const h = PARTY.slice().sort((a, b) => f(b) - f(a))[0]; return h && f(h) > 0 ? { id: h.hubId, title, detail: detail(h) } : null; };
  const awards = [best(h => h.stats.food, 'Glutton', h => h.stats.food + ' meals'), best(h => h.stats.gens, 'Generator Buster', h => h.stats.gens + ' broken'), best(h => h.stats.floors, 'Stair Finder', h => h.stats.floors + ' floors'), best(h => h.stats.foodShot, 'Shot the Supper', h => h.stats.foodShot + ' wasted')].filter(Boolean);
  netSend({ t: 'e', q: W.serial, e: W.events.splice(0) });
  HUB.finish({ standings: standings.map(s => s.ids), scores, stats, awards });
  void why;
}
function sessionLeave(id) {
  SESS.left.add(id);
  if (!W) return;
  const h = W.heroes.find(q => q.hubId === id);
  if (h) { emit('fall', { h }); W.heroes.splice(W.heroes.indexOf(h), 1); sfx('leave'); }
  if (NET.role !== 'client' && !W.heroes.length) sessionFinish('empty');
}
function sessionEnd(e) {
  NET.ended = true; SESS.endInfo = e; game.input.clear(); music(null); A.mute(true);
  clearNarrator();
}
function sessionOver(g, r) {
  const e = SESS.endInfo || {}, why = { void: 'THE ROUND DID NOT COUNT', 'host-left': 'THE HOST LEFT', 'sat-out': 'YOU SAT THIS ONE OUT', 'session-ended': 'THE SESSION ENDED' }[e.reason];
  E.font.title(g, 'ROUND OVER', r.W / 2, 40, { align: 'center', scale: 3, colors: TITLE_COLORS, depth: 3 });
  if (why) tx(g, why, r.W / 2, 74, '#ffb0a0', { align: 'center' });
  const order = (e.standings || []).flat(), list = order.length ? order.map(id => PARTY.find(h => h.hubId === id)).filter(Boolean) : PARTY.slice().sort((a, b) => b.score - a.score);
  list.forEach((h, i) => { tx(g, (i + 1) + '. ' + h.name.slice(0, 14), r.W / 2 - 90, 96 + i * 16, h.color, { scale: 1 }); tx(g, String(h.score), r.W / 2 + 90, 96 + i * 16, INK, { align: 'right' }); });
}
/** the round's clock and everyone's score, top centre */
function sessionStrip(g, r, y0) {
  const left = SESS.info.limitMs ? Math.max(0, SESS.info.limitMs - Math.max(0, HUB.time())) : 0, m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
  if (SESS.info.limitMs) tx(g, m + ':' + String(s).padStart(2, '0'), r.W / 2, y0 + 2, left < 30000 ? RED : '#ffe8b0', { align: 'center', scale: 2 });
  const list = W.heroes.slice().sort((a, b) => b.score - a.score), w = 70;
  list.forEach((h, i) => tx(g, h.name.slice(0, 7) + ' ' + h.score, r.W / 2 + (i - (list.length - 1) / 2) * w, y0 + 20, h.color, { align: 'center', font: 'tiny' }));
}
