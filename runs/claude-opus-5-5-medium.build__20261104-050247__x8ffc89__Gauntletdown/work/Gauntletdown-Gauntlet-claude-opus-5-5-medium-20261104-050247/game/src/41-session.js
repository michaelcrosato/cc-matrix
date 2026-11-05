/* 41-session: an AI Hub round. Straight into it (no title or menus): connect, build floor 1 for the seats, ready()
 * with no key press, our own card (players, how to win, this player's controls, Ready / More time), the 3-2-1 from the
 * hub's clock, six minutes of shared-world play, time-up -> finish() from the host, end -> ROUND OVER. */

const SESS = { info: null, card: null, started: false, ended: null, menu: null, floorQ: 1, finished: false };
const seatClass = i => HERO_ORDER[i % 4];

scenes.sboot = {
  touch: [],
  enter() {
    SC.sboot = { t: 0 };
    HUB.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { SESS.info = null; game.go('title'); return; }
      SESS.info = info;
      NET.me = info.me; NET.host = info.host; NET.role = info.server ? 'server' : info.isHost ? 'host' : 'client';
      HUB.on('card', c => { SESS.card = c; });
      HUB.on('start', () => { SESS.started = true; if (game.sceneName !== 'splay') game.go('splay', {}, { fade: .2 }); });
      HUB.on('message', (d, from) => NET.onMessage(d, from));
      HUB.on('leave', d => sessionLeave(d.id));
      HUB.on('time-up', () => { if (NET.role !== 'client') sessionFinish('time'); });
      HUB.on('end', d => { NET.ended = true; SESS.ended = d; game.input.clear(); music(null); SC.mute = true; A.mute && A.mute(true); game.go('sover', {}, { fade: .2 }); });
      // the world: floor 1, the seats' heroes in their hub colours
      PARTY.length = 0;
      info.players.forEach((p, i) => { const h = makeHero(seatClass(i), i, { input: p.id === info.me ? game.input : null, remote: p.id !== info.me, netId: p.id, color: p.color || SEAT_COLORS[i] }); h.netName = String(p.name || 'P' + (i + 1)); h.local = p.id === info.me; PARTY.push(h); });
      reseed(info.seed || 1); RUN.loop = 1; RUN.mode = 'session'; NARR.reset(false);
      SESS.floorQ = 1;
      newWorld(FLOOR_ORDER[0], { net: NET.role === 'client' ? 'client' : 'host' });
      W.serial = SESS.floorQ;
      if (!SESS.started) game.go('scard', {}, { fade: 0 });   // (at once: the card takes Enter from its first step)
      HUB.ready();
    });
  },
  update(dt) { SC.sboot.t += dt; },
  draw(r) { drawTitleBack(r, SC.sboot.t, true); r.overlay(g => otxt(g, 'JOINING THE ROUND...', r.W / 2, r.H / 2, '#ffe08a', { align: 'center', scale: 2 })); }
};

/* ---- the game's own card ---- */
scenes.scard = {
  touch: [],
  enter() { SC.scard = { t: 0, ready: false, boxes: {} }; music('title'); },
  update(dt) {
    const c = SC.scard; c.t += dt;
    const I = game.input, clk = I.clicked(), hit = (b) => clk && b && clk[0] >= b[0] && clk[0] < b[0] + b[2] && clk[1] >= b[1] && clk[1] < b[1] + b[3];
    const createHeld = I.held.has('Pad8');
    if (!createHeld && (I.pressed('confirm') || I.pressed('start') || hit(c.boxes.ready))) { HUB.answer('ready'); c.ready = true; happen('ui', { k: 'pick' }); }
    if (I.pressed('more') || hit(c.boxes.more)) { HUB.answer('more'); happen('ui', { k: 'move' }); }
  },
  draw(r) {
    drawTitleBack(r, SC.scard.t, true);
    r.overlay(g => drawSessionCard(g, r));
  }
};
function drawSessionCard(g, r) {
  const c = SC.scard, W0 = r.W, H0 = r.H, info = SESS.info || { players: [], round: 1 }, card = SESS.card || {}, I = game.input;
  E.font.title(g, 'GAUNTLETDOWN', W0 / 2, 8, { scale: 3, colors: LOGO_COLORS, outline: '#120806', depth: 3, depthColor: '#3a1a0a', align: 'center' });
  otxt(g, 'ROUND ' + (info.round || 1), W0 / 2, 40, '#e8c8a0', { align: 'center' });
  const n = info.players.length;
  info.players.forEach((p, i) => {
    const x = W0 / 2 + (i - (n - 1) / 2) * 90, y = 112, h = PARTY[i];
    if (h) { const rig = h.cardRig || (h.cardRig = h.D.rig()); rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: (card.ready || []).includes(p.id) ? 'cheer' : null }); rig.draw(g, x, y, r.view); }
    px.rect(g, x - 40, y + 4, 80, 2, p.color || SEAT_COLORS[i]);
    otxt(g, String(p.name || 'P' + (i + 1)).replace(/[^\x20-\x7E]/g, '?').slice(0, 14), x, y + 9, p.color || SEAT_COLORS[i], { align: 'center' });
    txt(g, h ? h.D.name : '', x, y + 19, '#c8b8a0', { align: 'center' });
    if ((card.ready || []).includes(p.id)) otxt(g, '✓ READY', x, y + 29, '#7ae87a', { align: 'center' });
  });
  const boxY = 158;
  otxt(g, 'HOW TO WIN', W0 / 2, boxY, '#e8a840', { align: 'center' });
  txt(g, 'Most points when the clock runs out: treasure, kills, stairs. Don\'t starve.', W0 / 2, boxY + 11, '#f0e0c8', { align: 'center' });
  const ctl = I.lastDevice === 'gamepad' ? 'Move: L stick   Aim: R stick   Fire: ' + I.label('fire') + '   Magic: ' + I.label('magic') : 'Move: WASD   Aim: mouse   Fire: ' + I.label('fire') + ' / Left click   Magic: ' + I.label('magic') + ' / Right click';
  txt(g, ctl, W0 / 2, boxY + 24, '#c8b8a0', { align: 'center' });
  const left = card.paused ? 'PAUSED' : card.left === null || card.left === undefined ? (card.starting ? 'STARTING' : '') : Math.ceil(card.left / 1000) + ' S';
  otxt(g, left, W0 - 10, 10, '#ffe08a', { align: 'right', scale: 2 });
  const bw = 120, by = H0 - 34;
  c.boxes.ready = [W0 / 2 - bw - 6, by, bw, 22]; c.boxes.more = [W0 / 2 + 6, by, bw, 22];
  px.rect(g, ...c.boxes.ready, c.ready ? '#2a5a2a' : '#6a3a1a'); px.rect(g, c.boxes.ready[0], by, bw, 1, '#e8a840');
  otxt(g, (c.ready ? '✓ ' : '') + 'READY  ' + I.label('confirm'), c.boxes.ready[0] + bw / 2, by + 7, '#ffe08a', { align: 'center' });
  px.rect(g, ...c.boxes.more, card.asked ? '#3a3a6a' : '#3a2a2a'); px.rect(g, c.boxes.more[0], by, bw, 1, '#8a8ac8');
  otxt(g, 'MORE TIME  ' + (I.lastDevice === 'gamepad' ? I.label('more') : 'T'), c.boxes.more[0] + bw / 2, by + 7, '#d8d8ff', { align: 'center' });
}

/* ---- the round ---- */
scenes.splay = {
  touch: [], world: true, view: 'threequarter', camera: { zoom: [.55, 1.2], start: .72, tall: .9 },
  enter() {
    SC.play = { t: 0, attract: false, session: true };
    setupLights(); music(musicFor(W.fd), { sync: false });
    game.weather = W.realm === 'furnace' ? { kind: 'ash', amount: .4 } : null;
  },
  update(dt) {
    const t = HUB.time();
    NET.tick(dt);
    if (SESS.ended) return;
    if (SESS.menu) { sessionMenuStep(); for (const h of PARTY) if (h.local) h.intent = IDLE_INTENT; }
    else if (game.input.pressed('pause') && !game.input.held.has('Pad8')) { SESS.menu = { i: 0 }; game.input.consumeAll(); }
    if (t < 0) { camFrame(false); NARR.update(dt); return; }
    for (const h of PARTY) if (h.local && !SESS.menu) h.intent = localIntent(h, h.input);
    if (NET.role === 'client') { stepWorld(dt); }
    else {
      stepWorld(dt);
      if (W.done && W.doneT > .7) sessionNextFloor();
      if (PARTY.length && !living().length && !SESS.finished) sessionFinish('all-down');
      if (W.boss && !W.boss.alive && !SESS.finished && W.doneT > 1) sessionFinish('king');
    }
    if (NET.role !== 'server') { camFrame(false); musicLayers(dt); }
    NARR.update(dt);
  },
  draw(r) {
    if (NET.role === 'server') { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#05040a'); otxt(g, 'HOSTING', r.W / 2, r.H / 2 - 8, '#ffe08a', { align: 'center', scale: 2 }); txt(g, PARTY.length + ' heroes  -  floor ' + (W ? W.no : 1), r.W / 2, r.H / 2 + 12, '#a89880', { align: 'center' }); }); return; }
    drawWorld(r); drawHUD(r);
    const t = HUB.time();
    if (t < 0 && t > -4000) r.overlay(g => E.font.title(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H / 2 - 30, { scale: 6, colors: LOGO_COLORS, outline: '#120806', depth: 3, align: 'center' }));
    if (SESS.menu) r.overlay(g => drawSessionMenu(g, r));
  }
};
function sessionNextFloor() {
  const d = W.done; let idx = RUN.floorIdx + 1;
  if (d.to) { const k = floorIndexOfNo(d.to); if (k > RUN.floorIdx) idx = k; }
  if (idx >= FLOOR_ORDER.length) idx = 0;
  SESS.floorQ++;
  NET.pending.push(['floor', { idx, q: SESS.floorQ }]);
  sessionFloor(idx, SESS.floorQ);
}
function sessionFloor(idx, q) {
  RUN.floorIdx = idx; RUN.deepest = Math.max(RUN.deepest, get('floors', FLOOR_ORDER[idx]).no || 1);
  for (const h of PARTY) { h.amulet = null; h.stun = 0; if (!h.alive) { h.alive = true; h.hp = 350; } }
  newWorld(FLOOR_ORDER[idx], { net: NET.role === 'client' ? 'client' : 'host' });
  W.serial = q; NET.snaps = [];
  setupLights(); music(musicFor(W.fd), { sync: false, fade: .5 });
  NARR.speak(W.fd.hoard ? LINES['hoard_' + W.fd.hoard] : LINES['floor_' + W.no]);
}
function sessionLeave(id) {
  const i = PARTY.findIndex(h => h.netId === id); if (i < 0) return;
  const h = PARTY[i]; h.alive = false; h.left = true; PARTY.splice(i, 1); PARTY.forEach((p, k) => { p.pi = k; });
  if (W) { W.bell = null; W.fieldKey = ''; }
  if (NET.role !== 'client' && !PARTY.length && !SESS.finished) sessionFinish('empty');
}
function sessionFinish(why) {
  if (SESS.finished || NET.role === 'client') return; SESS.finished = true;
  const ps = PARTY.slice().sort((a, b) => b.score - a.score), standings = [];
  for (const h of ps) { const last = standings[standings.length - 1]; if (last && PARTY.find(o => o.netId === last[0]).score === h.score) last.push(h.netId); else standings.push([h.netId]); }
  const scores = {}, stats = {}; for (const h of PARTY) { scores[h.netId] = h.score; stats[h.netId] = { Kills: h.stats.kills, Treasure: h.stats.treasure, Food: h.stats.food, Floors: h.stats.stairs }; }
  const award = (title, detail, key) => { const b = PARTY.reduce((a, h) => !a || h.stats[key] > a.stats[key] ? h : a, null); return b && b.stats[key] > 0 ? { id: b.netId, title, detail: detail + ': ' + b.stats[key] } : null; };
  const awards = [award('Glutton', 'Food eaten', 'food'), award('Generator Buster', 'Generators broken', 'gens'), award('Stair Finder', 'Stairs taken', 'stairs'), award('Shot the Supper', 'Food shot', 'foodShot')].filter(Boolean);
  try { HUB.finish({ standings, scores, stats, awards }); } catch (e) { game.fail('finish', e); }
  NET.pending.push(['over', { why, q: W ? W.serial : 0 }]);
  void why;
}
function sessionOver(d) { SESS.overWhy = d.why; }

/* ---- the session menu: a small overlay that never pauses ---- */
const SMENU = [['Volume', 'volume'], ['Music', 'music'], ['Voices', 'voices'], ['Button symbols', 'padGlyphs'], ['Close', null]];
function sessionMenuStep() {
  const m = SESS.menu, I = game.input;
  if (I.pressed('cancel') || (I.pressed('pause') && !I.held.has('Pad8'))) { SESS.menu = null; I.consumeAll(); return; }
  if (I.repeat('up', .3, .1)) m.i = (m.i + SMENU.length - 1) % SMENU.length;
  if (I.repeat('down', .3, .1)) m.i = (m.i + 1) % SMENU.length;
  const [, key] = SMENU[m.i], lr = I.repeat('left', .3, .1) ? -1 : I.repeat('right', .3, .1) ? 1 : 0;
  if (!key) { if (I.pressed('confirm')) { SESS.menu = null; I.consumeAll(); } return; }
  if (key === 'padGlyphs') { if (lr || I.pressed('confirm')) S.set('padGlyphs', S.padGlyphs === 'xbox' ? 'playstation' : 'xbox'); }
  else if (lr) S.set(key, clamp(+(S[key] + lr * .1).toFixed(2), 0, 1));
}
function drawSessionMenu(g, r) {
  const m = SESS.menu, w = 200, x = (r.W - w) / 2, y = r.H / 2 - 50;
  E.ui.box(g, x, y, w, 100, { bg: ['#2a1a14', '#100806'], border: '#e8a840', alpha: .95 });
  otxt(g, 'MENU  (the round goes on)', r.W / 2, y + 6, '#ffe08a', { align: 'center' });
  SMENU.forEach(([label, key], k) => {
    const yy = y + 20 + k * 14, on = k === m.i; if (on) px.rect(g, x + 4, yy - 2, w - 8, 12, '#4a2a1a');
    txt(g, label, x + 10, yy, on ? '#ffffff' : '#c8b8a0');
    if (key) txt(g, key === 'padGlyphs' ? (S.padGlyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION') : Math.round(S[key] * 100) + '%', x + w - 10, yy, '#ffe08a', { align: 'right' });
  });
}

/* ---- the end of the round ---- */
scenes.sover = {
  touch: [],
  enter() { SC.so = { t: 0 }; },
  update(dt) { SC.so.t += dt; game.input.clear(); },
  draw(r) {
    if (W && NET.role !== 'server') drawWorld(r);
    r.overlay(g => {
      const d = SESS.ended || {}, W0 = r.W, H0 = r.H;
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W0, H0, '#05040a'));
      E.font.title(g, 'ROUND OVER', W0 / 2, H0 / 2 - 60, { scale: 3, colors: LOGO_COLORS, outline: '#120806', depth: 3, align: 'center' });
      const why = { void: 'The round did not count.', 'host-left': 'The host left the round.', 'sat-out': 'You sat this round out.', 'session-ended': 'The session has ended.' }[d.reason];
      if (why) otxt(g, why, W0 / 2, H0 / 2 - 22, '#f0e0c8', { align: 'center' });
      const st = (d.standings || []).flat();
      st.slice(0, 4).forEach((id, k) => { const h = PARTY.find(p => p.netId === id); if (h) otxt(g, (k + 1) + '. ' + h.netName.replace(/[^\x20-\x7E]/g, '?').slice(0, 14) + '  ' + h.score, W0 / 2, H0 / 2 + k * 12, h.color, { align: 'center' }); });
    });
  }
};
