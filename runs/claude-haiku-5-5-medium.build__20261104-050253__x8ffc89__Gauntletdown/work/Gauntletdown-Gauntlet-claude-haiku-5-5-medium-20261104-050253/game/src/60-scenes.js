// Scenes: the front end (title, class select, how to play, high scores, settings, about), the card between floors, the
// play scene with its pause overlay and Dev Tools, the game over, the ending, and the attract mode.

let IDLE = 0, PTR = null;
// Words set in lines no wider than n characters.
function wrapWords(text, n) {
  const lines = []; let cur = '';
  for (const w of text.split(' ')) { if ((cur + ' ' + w).trim().length > n) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}
const NO_INTENT = { move: [0, 0], aim: null, fire: false, magic: false, plant: false };
const PRESSING = a => game.players.some(p => p.pressed(a));

// A list of rows. A row: { label(): string, act(): void, adj(dir): void (left and right), off(): bool (greyed) }.
function List(rows, o = {}) { return { rows, i: 0, hit: [], o }; }
function listUpdate(L) {
  const ps = game.players.length ? game.players : [game.input];
  const n = L.rows.length;
  const step = d => { for (let k = 0; k < n; k++) { L.i = (L.i + d + n) % n; if (!L.rows[L.i].off || !L.rows[L.i].off()) break; } };
  for (const p of ps) {
    if (p.pressed('up')) step(-1);
    if (p.pressed('down')) step(1);
    if (p.pressed('left') && L.rows[L.i].adj) { L.rows[L.i].adj(-1); game.audio.sfx('select', { vol: .4 }); }
    if (p.pressed('right') && L.rows[L.i].adj) { L.rows[L.i].adj(1); game.audio.sfx('select', { vol: .4 }); }
    if (p.pressed('confirm') && L.rows[L.i].act && !(L.rows[L.i].off && L.rows[L.i].off())) { game.audio.sfx('confirm', { vol: .5 }); L.rows[L.i].act(); }
    if (p.pressed('cancel') && L.o.back) { game.audio.sfx('select', { vol: .3, pitch: .7 }); L.o.back(); }
  }
  const pt = game.input.pointer();
  if (pt) {
    const hit = L.hit.find(h => pt[1] >= h.y0 && pt[1] < h.y1 && pt[0] >= h.x0 && pt[0] < h.x1);
    if (hit && !hit.off && (!PTR || Math.abs(PTR[0] - pt[0]) + Math.abs(PTR[1] - pt[1]) > 0)) L.i = hit.i;
    PTR = pt;
  }
  const c = game.input.clicked && game.input.clicked();
  if (c) {
    const hit = L.hit.find(h => c[1] >= h.y0 && c[1] < h.y1 && c[0] >= h.x0 && c[0] < h.x1);
    if (hit && !L.rows[hit.i].off) { L.i = hit.i; game.audio.sfx('confirm', { vol: .5 }); if (L.rows[hit.i].act) L.rows[hit.i].act(); }
  }
}
function listDraw(r, L, x, y, o = {}) {
  const lh = o.lh || 16, scale = o.scale || 1, align = o.align || 'center';
  L.hit = [];
  L.rows.forEach((row, i) => {
    const yy = y + i * lh, off = row.off && row.off(), focus = i === L.i;
    const label = (typeof row.label === 'function' ? row.label() : row.label) || '';
    const col = off ? '#6a6480' : focus ? '#ffd36a' : '#e8e0ff';
    if (focus) r.overlay(g => E.px.rect(g, x - 130 * scale, yy - 3, 260 * scale, lh - 2, '#2a2050'));
    r.text((focus ? '> ' : '  ') + label, x, yy, col, { align, scale, shadow: '#000' });
    L.hit.push({ i, x0: 0, x1: r.W, y0: yy - 2, y1: yy + lh - 2, off });
  });
}

// Who is joined: the players' inputs.
const JOINED = () => game.players.slice();
function anyInputNow() {
  const I = game.input;
  if (game.players.some(p => p.anyPressed && p.anyPressed())) return true;
  if (I.move && (I.move()[0] || I.move()[1])) return true;
  if (I.padAim && (I.padAim[0] || I.padAim[1])) return true;
  const pt = I.pointer();
  if (pt && PTR && Math.abs(pt[0] - PTR[0]) + Math.abs(pt[1] - PTR[1]) > 4) return true;
  if (I.clicked && I.clicked()) return true;
  return false;
}
function idleTick(dt, to) {
  if (anyInputNow()) IDLE = 0; else IDLE += dt;
  if (IDLE > 10 && to) { IDLE = 0; game.go(to, null, { fade: 'black' }); }
}
const isTouchOnly = () => {
  try {
    const fine = typeof matchMedia === 'function' && matchMedia('(any-pointer: fine)').matches;
    const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    const pad = typeof navigator !== 'undefined' && navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(Boolean);
    return !fine && touch && !pad;
  } catch (e) { return false; }
};

// The records: each player's score on the table when a run ends.
// The table: a score qualifies when there is room or it beats the last entry (never with a cheat on).
function qualifies(score) {
  if (CHEATS.god || CHEATS.infinite || CHEATS.freeze || CHEATS.noGen || TUNE_CHANGED()) return false;
  const t = loadScores();
  return t.length < 10 || score > t[t.length - 1].score;
}
function recordEntry(e) {
  const table = loadScores();
  table.push(e); table.sort((a, b) => b.score - a.score);
  saveScores(table.slice(0, 10));
}
function recordRun(list) {
  if (CHEATS.god || CHEATS.infinite || CHEATS.freeze || CHEATS.noGen || TUNE_CHANGED()) return [];
  const table = loadScores();
  for (const e of list) table.push(e);
  table.sort((a, b) => b.score - a.score);
  const kept = table.slice(0, 10);
  saveScores(kept);
  return list.filter(e => kept.includes(e));
}

// --- the title ---
let TITLE = null;
const title = {
  pausable: false,
  enter() {
    IDLE = 0; game.audio.music(SONGS.throwdown);
    game.allowJoin(false);
    const touchOnly = isTouchOnly();
    TITLE = List([
      { label: 'START DESCENT', act: () => game.go('classes'), off: () => touchOnly },
      { label: 'HOW TO PLAY', act: () => game.go('howto') },
      { label: 'HIGH SCORES', act: () => game.go('scores') },
      { label: 'SETTINGS', act: () => game.go('settings', { from: 'title' }) },
      { label: 'ABOUT AND CREDITS', act: () => game.go('about') }
    ], { back: null });
    TITLE.touchOnly = touchOnly;
    if (touchOnly) TITLE.i = 1;   // the first row a touch device can use
  },
  update(dt) {
    listUpdate(TITLE);
    idleTick(dt, 'attract');
  },
  draw(r) {
    r.sky(['#06050e', '#1e1638', '#3a2a58']);
    const m = Math.round(r.H / 2);
    r.overlay(g => E.font.title(g, 'GAUNTLETDOWN', r.W / 2, Math.round(r.H * .2), { scale: 3, align: 'center' }));
    if (TITLE.touchOnly) {
      r.text('CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, m - 26, '#ffe08a', { align: 'center', scale: 1, shadow: '#000' });
      r.text('Connect a controller or a keyboard to play.', r.W / 2, m - 10, '#e8e0ff', { align: 'center', shadow: '#000' });
    }
    listDraw(r, TITLE, r.W / 2, m + 8, { lh: 16, scale: 1 });
    r.text('PRESS ' + game.input.label('confirm') + ' TO CHOOSE - ' + E.versionLabel(), r.W / 2, r.H - 14, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// --- class select ---
let PICKS = [];
function freeClass(except) { return CLASS_ORDER.find(c => !PICKS.some(p => p !== except && p.cls === c)) || null; }
const classes = {
  pausable: false,
  enter() {
    PICKS = [{ input: game.input, cls: 'berserker', locked: false, name: 'P1' }];
    game.allowJoin({
      max: 4,
      onJoin: input => {
        const cls = CLASS_ORDER.find(c => !PICKS.some(p => p.cls === c));
        if (!cls) return;
        PICKS.push({ input, cls, locked: false, name: 'P' + (PICKS.length + 1) });
        game.audio.sfx('powerup', { vol: .4 });
      }
    });
    game.audio.music(SONGS.throwdown);
    IDLE = 0;
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    for (const pk of PICKS) {
      const p = pk.input;
      if (!pk.locked) {
        if (p.pressed('left')) { const s = CLASS_ORDER, i = s.indexOf(pk.cls); for (let k = 1; k <= 4; k++) { const c = s[(i - k + 4 * 4) % 4]; if (!PICKS.some(q => q !== pk && q.cls === c)) { pk.cls = c; break; } } game.audio.sfx('select', { vol: .4 }); }
        if (p.pressed('right')) { const s = CLASS_ORDER, i = s.indexOf(pk.cls); for (let k = 1; k <= 4; k++) { const c = s[(i + k) % 4]; if (!PICKS.some(q => q !== pk && q.cls === c)) { pk.cls = c; break; } } game.audio.sfx('select', { vol: .4 }); }
        if (p.pressed('fire') || p.pressed('confirm')) { pk.locked = true; game.audio.sfx('confirm', { vol: .5 }); }
      } else if (p.pressed('cancel')) pk.locked = false;
    }
    if (PICKS.every(p => p.locked) && game.players.some(p => p.pressed('start'))) startRun();
    if (game.input.pressed('cancel') && !PICKS[0].locked) game.go('title', null, { fade: 'black' });
    idleTick(dt, 'attract');
  },
  draw(r) {
    r.sky(['#0a0816', '#2a1a40']);
    r.overlay(g => E.font.title(g, 'CHOOSE YOUR FOOL', r.W / 2, Math.round(r.H * .1), { scale: 2, align: 'center' }));
    const slot = r.W / 4;
    CLASS_ORDER.forEach((c, i) => {
      const x = Math.round(i * slot + slot / 2), def = HEROES[c];
      const taken = PICKS.find(p => p.cls === c);
      r.overlay(g => E.px.rect(g, x - slot / 2 + 6, r.H * .3, slot - 12, r.H * .42, taken ? '#2a2038' : '#1a1428'));
      r.text(def.name, x, r.H * .34, def.color, { align: 'center', shadow: '#000' });
      r.text(def.who, x, r.H * .34 + 12, '#c8c0e0', { align: 'center', scale: 1, shadow: '#000' });
      const labels = ['ARMOR', 'SHOTS', 'MELEE', 'MAGIC', 'SPEED'];
      def.stats.forEach((v, k) => r.text(labels[k] + ' ' + '|'.repeat(v) + '.'.repeat(5 - v), x - slot / 2 + 14, r.H * .34 + 30 + k * 10, '#e8e0ff', { scale: 1, shadow: '#000' }));
      wrapWords(def.quip, 24).forEach((t, k) => r.text(k === 0 ? '"' + t : t + (k === wrapWords(def.quip, 24).length - 1 ? '"' : ''), x, r.H * .34 + 84 + k * 10, '#ffe0a0', { align: 'center', scale: 1, shadow: '#000' }));
      PICKS.forEach((p, k) => { if (p.cls === c) r.text((p.name) + (p.locked ? ' READY' : ''), x, r.H * .34 + 100 + k * 10, p.locked ? '#7aff9a' : '#ffffff', { align: 'center', shadow: '#000' }); });
    });
    const all = PICKS.length && PICKS.every(p => p.locked);
    r.text(all ? '[' + game.input.label('start') + '] START' : game.input.label('fire') + ' LOCKS - ' + game.input.label('cancel') + ' BACKS OUT', r.W / 2, r.H - 26, all ? '#7aff9a' : '#ffe08a', { align: 'center', shadow: '#000' });
    r.text('[' + game.input.label('start') + '] TO JOIN', r.W - 6, r.H - 10, '#8a80a8', { align: 'right', shadow: '#000' });
  }
};

function startRun() {
  WORLD.heroes = PICKS.map((p, i) => makeHero(i, p.cls, p.input));
  WORLD.heroes.forEach((h, i) => { h.name = PICKS[i].name; });
  WORLD.attract = false; WORLD.runT = 0; WORLD.records = [];
  game.go('card', { index: 0, first: true }, { fade: 'black' });
}

// --- how to play, high scores, about: pages and tables ---
let PAGE = 0;
const howto = {
  pausable: false,
  enter(d) { PAGE = 0; this.back = d && d.back; },
  update(dt) {
    const I = game.input;
    if (PRESSING('right') || PRESSING('confirm')) { PAGE = (PAGE + 1) % HOW_TO.length; game.audio.sfx('select', { vol: .4 }); }
    if (PRESSING('left')) PAGE = (PAGE + HOW_TO.length - 1) % HOW_TO.length;
    if (PRESSING('cancel')) game.go(this.back || 'title', null, { fade: 'black' });
    idleTick(dt, 'attract');
  },
  draw(r) {
    r.sky(['#0a0816', '#241a40']);
    const [head, body] = HOW_TO[PAGE];
    r.overlay(g => E.font.title(g, 'HOW TO PLAY', r.W / 2, Math.round(r.H * .12), { scale: 2, align: 'center' }));
    r.text(head, r.W / 2, r.H * .36, '#ffd36a', { align: 'center', scale: 1, shadow: '#000' });
    body.forEach((t, i) => r.text(t, r.W / 2, r.H * .46 + i * 14, '#e8e0ff', { align: 'center', scale: 1, shadow: '#000' }));
    r.text(PAGE + 1 + ' / ' + HOW_TO.length + '   [' + game.input.label('left') + '] [' + game.input.label('right') + '] PAGE   [' + game.input.label('cancel') + '] BACK', r.W / 2, r.H - 16, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

const scores = {
  pausable: false,
  enter() { IDLE = 0; this.L = List([{ label: 'BACK', act: () => game.go('title', null, { fade: 'black' }) }], { back: () => game.go('title', null, { fade: 'black' }) }); },
  update(dt) { listUpdate(this.L); idleTick(dt, 'attract'); },
  draw(r) {
    r.sky(['#0a0816', '#241a40']);
    r.overlay(g => E.font.title(g, 'HIGH SCORES', r.W / 2, Math.round(r.H * .1), { scale: 2, align: 'center' }));
    const table = loadScores();
    if (!table.length) r.text('NO RECORDS YET. GO AND EAT SOMETHING.', r.W / 2, r.H / 2, '#e8e0ff', { align: 'center', shadow: '#000' });
    table.slice(0, 10).forEach((e, i) => r.text((i + 1 + '.').padEnd(4) + e.name.padEnd(4) + String(e.score).padStart(7) + '  F' + e.floor + '  ' + (e.cls ? HEROES[e.cls].name : ''), r.W / 2, r.H * .24 + i * 14, i === 0 ? '#ffd36a' : '#e8e0ff', { align: 'center', scale: 1, shadow: '#000' }));
    listDraw(r, this.L, r.W / 2, r.H - 26, {});
  }
};

// --- settings: the same rows on the title and the pause overlay ---
function settingsRows(back) {
  const cyc = (key, opts, label) => ({
    label: () => label + ': ' + prefOptLabel(key, opts),
    adj: d => { const i = opts.findIndex(o => o[0] === prefs[key]); prefs[key] = opts[(i + d + opts.length) % opts.length][0]; applyPref(key); savePrefs(); },
    act: () => { const i = opts.findIndex(o => o[0] === prefs[key]); prefs[key] = opts[(i + 1) % opts.length][0]; applyPref(key); savePrefs(); }
  });
  return [
    cyc('glyphs', [['playstation', 'PLAYSTATION'], ['xbox', 'XBOX (A B X Y)']], 'BUTTON SYMBOLS'),
    cyc('difficulty', [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']], 'DIFFICULTY'),
    cyc('cameraView', [['threequarter', 'THREE-QUARTER'], ['topdown', 'TOP-DOWN'], ['iso', 'ISOMETRIC']], 'CAMERA VIEW'),
    cyc('aim', [['off', 'OFF'], ['low', 'LOW 8 DEG'], ['high', 'HIGH 16 DEG']], 'AIM ASSIST'),
    cyc('tips', [[true, 'ON'], [false, 'OFF']], 'NARRATOR TIPS'),
    cyc('voices', [[true, 'ON'], [false, 'OFF']], 'VOICES'),
    cyc('names', [[true, 'ON'], [false, 'OFF']], 'PLAYER NAMES'),
    { label: 'BACK', act: back, adj: null }
  ];
}
function prefOptLabel(key, opts) { const o = opts.find(x => x[0] === prefs[key]); return o ? o[1] : String(prefs[key]); }
function applyPref(key) {
  if (key === 'glyphs') game.input.glyphs = prefs.glyphs;
  if (key === 'cameraView' && game.setView) game.setView(prefs.cameraView);
}
const settings = {
  pausable: false,
  enter(d) { IDLE = 0; this.from = d && d.from || 'title'; this.L = List(settingsRows(() => this.leave()), { back: () => this.leave() }); },
  leave() { game.go(this.from === 'pause' ? 'play' : this.from, this.from === 'pause' ? { resume: true } : null, { fade: 'black' }); },
  update(dt) { listUpdate(this.L); idleTick(dt, 'attract'); },
  draw(r) {
    r.sky(['#0a0816', '#241a40']);
    r.overlay(g => E.font.title(g, 'SETTINGS', r.W / 2, Math.round(r.H * .14), { scale: 2, align: 'center' }));
    listDraw(r, this.L, r.W / 2, r.H * .34, { lh: 18 });
  }
};

// --- about and credits: pages, and the feedback sections (written in 80-about.js) ---
const about = {
  pausable: false,
  enter() { PAGE = 0; IDLE = 0; },
  update(dt) {
    if (PRESSING('right') || PRESSING('confirm')) PAGE = (PAGE + 1) % ABOUT_PAGES.length;
    if (PRESSING('left')) PAGE = (PAGE + ABOUT_PAGES.length - 1) % ABOUT_PAGES.length;
    if (PRESSING('cancel')) game.go('title', null, { fade: 'black' });
    idleTick(dt, 'attract');
  },
  draw(r) {
    r.sky(['#0a0816', '#241a40']);
    const page = ABOUT_PAGES[PAGE];
    r.text(page.title, r.W / 2, 12, '#ffd36a', { align: 'center', scale: 1, shadow: '#000' });
    page.lines.forEach((t, i) => r.text(t, 12, 30 + i * 11, '#e8e0ff', { scale: 1, shadow: '#000' }));
    r.text((PAGE + 1) + ' / ' + ABOUT_PAGES.length + '   [' + game.input.label('left') + '] [' + game.input.label('right') + '] PAGE   [' + game.input.label('cancel') + '] BACK', r.W / 2, r.H - 14, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// --- the card between floors: the realm, the floor's name, the Gaunt's line, and the round's numbers ---
const card = {
  pausable: false,
  enter(d) {
    d = d || {};
    IDLE = 0; this.index = d.index || 0; this.t = 0; this.first = !!d.first;
    const prev = WORLD.stage;
    if (this.index < STAGES.length) loadStage(this.index);
    WORLD.attract = false;
    const st = STAGES[this.index];
    if (SESSION) announceStage(this.index);
    game.audio.music(stageSong(st));
    game.lights.enabled = false;
    WORLD.caption = null;
    // the first card, a new realm's card, the banquet, and the treasure rooms each have their line
    if (this.first) say('start', null, true);
    else if (st.kind === 'boss') say('king_intro', null, true);
    else if (st.realm !== (prev && prev.realm)) say('realm_' + st.realm, null, true);
    else if (st.kind === 'floor' && WORLD.loop) say('descent', null, true);
  },
  update(dt) {
    this.t += dt;
    const go = PRESSING('confirm') || PRESSING('fire') || this.t > (SESSION ? 2 : 6);
    if (go && this.t > .6) {
      const W = WORLD;
      if (this.index >= STAGES.length) { endRun('ending', { fade: 'black' }); return; }
      game.go('play', { index: this.index }, { fade: 'iris', at: W.heroes.find(h => !h.down) });
    }
  },
  draw(r) {
    const st = STAGES[this.index] || STAGES[STAGES.length - 1];
    r.sky(st.kind === 'boss' ? ['#1a0a20', '#3a1a40', '#6a3a50'] : ['#06050e', '#2a1a20', '#4a2a20']);
    r.overlay(g => E.font.title(g, STAGE_LABEL(st).toUpperCase(), r.W / 2, Math.round(r.H * .22), { scale: 2, align: 'center' }));
    r.text(st.name.toUpperCase(), r.W / 2, r.H * .52, '#ffe08a', { align: 'center', scale: 2, shadow: '#000' });
    r.text(REALMS[st.realm].name.toUpperCase(), r.W / 2, r.H * .64, '#c8b8e0', { align: 'center', shadow: '#000' });
    if (WORLD.caption) r.text(WORLD.caption, r.W / 2, r.H * .76, '#fff4c8', { align: 'center', shadow: '#000' });
    if (this.index > 0) WORLD.heroes.forEach((h, i) => r.text(h.name + '  SCORE ' + h.score + '  KILLS ' + h.kills + '  TREASURE ' + (h.treasure || 0), r.W / 2, r.H * .86 + i * 11, h.color, { align: 'center', shadow: '#000' }));
    r.text('[' + game.input.label('confirm') + '] GO', r.W / 2, r.H - 12, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// --- the play scene: the floor, the heroes, the pause overlay (with Dev Tools and the settings) ---
let OV = null;     // the overlay on top of play: { kind: 'pause' | 'dev' | 'settings' | 'howto', L }
let LAST_STAIRS = null;
const play = {
  pausable: false,
  enter(d) {
    d = d || {};
    OV = null; LAST_STAIRS = null;
    WORLD.attract = false;
    game.lights.enabled = true; game.lights.ambient = .42;
    game.cam.bounds = v => WORLD.map.bounds(v);
    game.audio.music(stageSong(WORLD.stage));
    game.allowJoin({ max: 4, onJoin: input => joinMidRun(input) });
  },
  exit() { game.allowJoin(false); game.lights.enabled = false; OV = null; },
  update(dt) {
    const W = WORLD;
    // the pause, the overlays
    if (SESSION) {
      // a round: no pause; it waits for the hub's start, and it ends when the hub ends it
      if (ROUND.ended) { game.go('roundover', null, { fade: 0 }); return; }
      if (!(AIHub.time() >= 0)) return;
    } else if (!OV && game.players.some(p => p.pressed('pause'))) { openPause(); return; }   // (Escape also cancels: the press that opens the menu does nothing else)
    if (OV) { updateOverlay(dt); return; }
    const intents = W.heroes.map(h => ({ hero: h, intent: h.down ? NO_INTENT : h.input ? intentFromInput(h.input, h) : h.remote != null ? remoteIntent(h) : botIntent(h, W.time) }));
    if (CLIENT_COPY()) { clientSend(dt); clientSmooth(dt); }   // a copy in a shared world: its intents go to the host, and the host's world is shown
    else {
      stepWorld(dt, intents);
      if (HOST()) { NET.snapT += dt; if (NET.snapT >= .125) { NET.snapT = 0; sendSnapshot(); } }
    }
    // the animations of each rig, from the bodies' motion this step
    for (const h of W.heroes) {
      const I = intents.find(x => x.hero === h).intent;
      const attack = heroAttack(h);
      h.rig.update(dt, { x: h.body.x, y: h.body.y, z: 0, vx: h.body.vx, vy: h.body.vy, facing: h.facing, hurt: h.hurt > 0, pose: h.down ? 'die' : null, attack, hunch: h.hp < 200 ? .5 : 0 });
    }
    for (const m of W.monsters) if (m.rig) m.rig.update(dt, { x: m.x, y: m.y, z: 0, vx: m.body.vx, vy: m.body.vy, facing: m.facing || 0 });
    // the camera: all the living heroes in view
    const living = W.heroes.filter(h => !h.down);
    if (living.length) game.cam.frame(living.map(h => h.body), { margin: 60, zoom: [.8, 1.1] });
    // the descent: the stair-taker's bonus, then the next floor
    if (W.descend) {
      const h = W.descend; W.descend = null;
      h.score += stairBonus(h);
      say('stairs', h, true);
      W.heroes.forEach(x => { if (!x.down) x.stair = 0; });
      const next = W.descendTo != null ? W.descendTo : W.index + 1;
      W.descendTo = null;
      if (next >= STAGES.length) { endRun('ending', { fade: 'iris', at: h }); return; }
      game.go('card', { index: next }, { fade: 'iris', at: h });
      return;
    }
    // the Iron Gauntlet taken from the King: the ending
    if (W.heroes.some(h => h.gauntlet) && !W.endingGone) { W.endingGone = true; endRun('ending', { fade: 'black' }); return; }
    if (W.over && !W.gameOverGone && !CLIENT_COPY()) {
      W.gameOverGone = true;
      if (SESSION) { hostFinish('over'); game.go('roundover', null, { fade: 'black' }); return; }
      game.go('gameover', null, { fade: 'black' });
    }
  },
  draw(r) {
    if (SESSION && !(AIHub.time() >= 0)) {
      drawWorld(r);
      const t = AIHub.time();
      r.text(isFinite(t) ? String(Math.max(1, Math.ceil(-t))) : 'READY', r.W / 2, r.H / 2 - 20, '#ffe08a', { align: 'center', scale: 3, shadow: '#000' });
      return;
    }
    drawWorld(r);
    drawHud(r);
    if (OV) drawOverlay(r);
  }
};

// Drop out: a player other than the first leaves the run; their hero goes.
function dropOut() {
  const i = WORLD.heroes.findIndex(h => h.input && h.input !== game.input);
  if (i < 0) return;
  game.removePlayer && game.removePlayer(WORLD.heroes[i].input);
  WORLD.heroes.splice(i, 1);
  WORLD.heroes.forEach((h, k) => { h.i = k; });
}
// The run's end: a round finishes with the hub; a single run goes to its ending.
function endRun(to, o) {
  if (SESSION) { hostFinish('ending'); game.go('roundover', null, o); return; }
  game.go(to, null, o);
}
function joinMidRun(input) {
  const taken = WORLD.heroes.map(h => h.cls);
  const cls = CLASS_ORDER.find(c => !taken.includes(c));
  if (!cls) return;
  const h = makeHero(WORLD.heroes.length, cls, input);
  h.name = 'P' + (WORLD.heroes.length + 1);
  h.body.x = WORLD.heroes[0] ? WORLD.heroes[0].body.x : (WORLD.F.starts[0][0] + .5) * T;
  h.body.y = WORLD.heroes[0] ? WORLD.heroes[0].body.y : (WORLD.F.starts[0][1] + .5) * T;
  WORLD.heroes.push(h);
  say('join', h, true);
  game.audio.sfx('powerup', { vol: .5 });
}

// The pause overlay: Resume, How to Play, Dev Tools, Settings, Quit to title.
function openPause() {
  OV = { kind: 'pause', L: List([
    { label: 'RESUME', act: () => { OV = null; } },
    { label: 'HOW TO PLAY', act: () => { OV = { kind: 'howto', L: List([{ label: 'BACK', act: () => openPause() }], { back: () => openPause() }) }; PAGE = 0; } },
    { label: 'DEV TOOLS', act: () => { OV = { kind: 'dev', L: devList(0) }; } },
    { label: 'SETTINGS', act: () => { OV = { kind: 'settings', L: List(settingsRows(() => openPause()), { back: () => openPause() }) }; } },
    { label: 'RESTART FLOOR', act: () => { OV = null; game.go('card', { index: WORLD.index }, { fade: 'black' }); } },
    { label: 'DROP OUT', act: () => { OV = null; dropOut(); } },
    { label: 'QUIT TO TITLE', act: () => { OV = null; game.go('title', null, { fade: 'black' }); } }
  ], { back: () => { OV = null; } }) };
}
function updateOverlay(dt) {
  if (!OV) return;
  if (OV.kind === 'howto') { if (PRESSING('right')) PAGE = (PAGE + 1) % HOW_TO.length; if (PRESSING('left')) PAGE = (PAGE + HOW_TO.length - 1) % HOW_TO.length; }
  const L = OV.L;
  listUpdate(L);
  if (OV && OV.kind === 'pause' && PRESSING('pause')) OV = null;
}
function drawOverlay(r) {
  r.overlay(g => E.px.rect(g, 0, 0, r.W, r.H, 'rgba(6,5,14,0.82)'));
  if (OV.kind === 'howto') {
    const [head, body] = HOW_TO[PAGE];
    r.text(head, r.W / 2, r.H * .3, '#ffd36a', { align: 'center', shadow: '#000' });
    body.forEach((t, i) => r.text(t, r.W / 2, r.H * .4 + i * 14, '#e8e0ff', { align: 'center', shadow: '#000' }));
    listDraw(r, OV.L, r.W / 2, r.H - 30, {});
    return;
  }
  if (OV.kind === 'dev') {
    r.text('DEV TOOLS - THIS RUN IS NOT RECORDED', r.W / 2, 14, '#ff9050', { align: 'center', shadow: '#000' });
    listDraw(r, OV.L, r.W / 2, 36, { lh: 11, scale: 1 });
    return;
  }
  if (OV.kind === 'settings') { r.text('SETTINGS', r.W / 2, 14, '#ffd36a', { align: 'center', shadow: '#000' }); listDraw(r, OV.L, r.W / 2, 40, { lh: 18 }); return; }
  r.text('PAUSED', r.W / 2, r.H * .28, '#ffe08a', { align: 'center', scale: 2, shadow: '#000' });
  listDraw(r, OV.L, r.W / 2, r.H * .42, { lh: 18 });
}

// Dev Tools: four pages (cheats and warps, gives and spawns, and two pages of tuning sliders). Each step applies at once.
const DEV_PAGES = 4;
function devList(page = 0) {
  const toggle = (k, label) => ({ label: () => label + ': ' + (CHEATS[k] ? 'ON' : 'OFF'), act: () => { CHEATS[k] = !CHEATS[k]; } });
  const tune = (k, label, step, min, max) => ({ label: () => label + ': ' + TUNE[k].toFixed(2).replace(/\.00$/, ''), adj: d => { TUNE[k] = clamp(Math.round((TUNE[k] + d * step) * 1000) / 1000, min, max); } });
  const warp = n => ({ label: 'WARP TO FLOOR ' + n, act: () => { OV = null; game.go('card', { index: n - 1 }, { fade: 'black' }); } });
  const PAGES = [
    [toggle('god', 'GOD MODE'), toggle('infinite', 'INFINITE KEYS AND FLASKS'), toggle('freeze', 'FREEZE MONSTERS'), toggle('noGen', 'GENERATORS OFF'), warp(1), warp(2), warp(3),
      { label: () => 'BOT PLAYS PLAYER 1: ' + (WORLD.heroes[0] && !WORLD.heroes[0].input ? 'ON' : 'OFF'), act: () => { const h = WORLD.heroes[0]; if (!h) return; if (h.input) { h.savedInput = h.input; h.input = null; } else { h.input = h.savedInput || game.input; } } },
      toggle('hitboxes', 'SHOW HITBOXES'), toggle('flowfield', 'SHOW MONSTER TARGETS')],
    [
      { label: '+3 KEYS AND +3 FLASKS', act: () => { for (const h of WORLD.heroes) { h.keys = Math.min(9, h.keys + 3); h.flasks = Math.min(9, h.flasks + 3); } } },
      { label: 'HEAL THE PARTY', act: () => { for (const h of WORLD.heroes) if (!h.down) h.hp += 500; } },
      { label: '+1000 SCORE', act: () => { for (const h of WORLD.heroes) h.score += 1000; } },
      { label: 'KILL ALL MONSTERS', act: () => { for (const m of WORLD.monsters) if (m.alive) killMonster(m, null); } },
      { label: 'DESTROY ALL GENERATORS', act: () => { for (const g of WORLD.gens) if (g.alive) damageGen(g, 1e9, null); } },
      { label: 'SPAWN 5 GHOSTS HERE', act: () => { const h = WORLD.heroes[0]; if (h) for (let i = 0; i < 5; i++) spawnMonster('ghost', h.body.x + 30 + i * 6, h.body.y + 20, 1, true); } },
      { label: 'REVEAL SECRETS', act: () => { for (const [k, f] of [...WORLD.fakes]) { WORLD.fakes.delete(k); WORLD.map.set(f.x, f.y, 0); } for (const k of [...WORLD.cracks.keys()]) { WORLD.cracks.delete(k); const [cx, cy] = k.split(',').map(Number); WORLD.map.set(cx, cy, 0); } WORLD.map.version = (WORLD.map.version || 0) + 1; } },
      { label: 'SPAWN 3 GNASHERS HERE', act: () => { const h = WORLD.heroes[0]; if (h) for (let i = 0; i < 3; i++) spawnMonster('gnasher', h.body.x - 30 - i * 6, h.body.y - 20, 2, true); } }
    ],
    [tune('drain', 'DRAIN', .25, 0, 5), tune('heroSpeed', 'HERO SPEED', .1, .5, 2), tune('shotRate', 'SHOT RATE', .25, .5, 3), tune('shotDamage', 'SHOT DAMAGE', .25, .5, 3), tune('magicPower', 'MAGIC POWER', .25, .25, 3), tune('monsterSpeed', 'MONSTER SPEED', .1, .25, 3), tune('monsterDamage', 'MONSTER DAMAGE', .25, 0, 3)],
    [tune('spawnInterval', 'SPAWN INTERVAL', .25, .25, 4), tune('generatorHp', 'GENERATOR HP', .25, .25, 4), tune('maxMonsters', 'MONSTER CAP', 10, 20, 300), tune('stairHold', 'STAIR HOLD', .25, 0, 3),
      { label: 'RESET TUNING TO DEFAULTS', act: () => { Object.assign(TUNE, DEFAULT_TUNE); } }]
  ];
  const rows = [
    { label: () => 'PAGE ' + (page + 1) + ' OF ' + DEV_PAGES + '   LEFT RIGHT TO TURN', adj: d => { OV = { kind: 'dev', L: devList((page + d + DEV_PAGES) % DEV_PAGES) }; } },
    ...PAGES[page],
    { label: 'BACK', act: () => openPause() }
  ];
  return List(rows, { back: () => openPause() });
}

// The game over: each player whose score makes the table enters their initials on the letter wheel with their own
// controller; then the table; then the title.
const gameover = {
  pausable: false,
  enter() {
    this.t = 0; IDLE = 0; game.audio.music(SONGS.fed, { loop: false });
    this.queue = WORLD.heroes.filter(h => qualifies(h.score)).map(h => ({ score: h.score, cls: h.cls, floor: WORLD.index + 1, input: h.input || game.input }));
    game.audio.sfx('hurt');
  },
  update(dt) {
    this.t += dt;
    if (this.queue.length) { game.go('initials', { queue: this.queue, next: 'scores' }, { fade: 'black' }); return; }
    if ((PRESSING('confirm') || PRESSING('fire')) && this.t > 1.5 || this.t > 9) game.go('title', null, { fade: 'black' });
  },
  draw(r) {
    r.sky(['#2a0a0a', '#5a1a1a']);
    r.overlay(g => E.font.title(g, 'GAME OVER', r.W / 2, Math.round(r.H * .2), { scale: 3, align: 'center' }));
    r.text(line('game_over'), r.W / 2, r.H * .48, '#ffe0c8', { align: 'center', shadow: '#000' });
    WORLD.heroes.forEach((h, i) => r.text(h.name + '  SCORE ' + h.score + '  ' + STAGE_LABEL(WORLD.stage), r.W / 2, r.H * .6 + i * 12, h.color, { align: 'center', shadow: '#000' }));
  }
};

// The letter wheel: three letters, moved with up and down, and the slots with left and right. Each entry is typed by
// the player whose score it is, on their own controller, and confirmed on the last letter.
const WHEEL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const initials = {
  pausable: false,
  enter(d) { this.queue = d.queue; this.next = d.next; this.k = 0; this.slot = 0; this.letters = [0, 0, 0]; this.t = 0; IDLE = 0; game.audio.music(SONGS.fed, { loop: false }); },
  update(dt) {
    this.t += dt;
    const e = this.queue[this.k];
    if (!e) { game.go(this.next, null, { fade: 'black' }); return; }
    const p = e.input || game.input;
    if (this.t < .4) return;
    if (p.pressed('up')) this.letters[this.slot] = (this.letters[this.slot] + 1) % WHEEL.length;
    if (p.pressed('down')) this.letters[this.slot] = (this.letters[this.slot] + WHEEL.length - 1) % WHEEL.length;
    if (p.pressed('right')) this.slot = Math.min(2, this.slot + 1);
    if (p.pressed('left')) this.slot = Math.max(0, this.slot - 1);
    if (p.pressed('confirm') || p.pressed('fire')) {
      if (this.slot < 2) this.slot++;
      else {
        const name = this.letters.map(i => WHEEL[i]).join('');
        recordEntry({ name, score: e.score, floor: e.floor, cls: e.cls });
        this.k++; this.slot = 0; this.letters = [0, 0, 0];
      }
    }
  },
  draw(r) {
    r.sky(['#06050e', '#2a1a40']);
    r.overlay(g => E.font.title(g, 'NAME THYSELF', r.W / 2, Math.round(r.H * .16), { scale: 2, align: 'center' }));
    const e = this.queue[this.k];
    if (!e) return;
    r.text(e.cls ? HEROES[e.cls].name : 'MORSEL', r.W / 2, r.H * .36, '#ffe08a', { align: 'center', scale: 2, shadow: '#000' });
    r.text('SCORE ' + e.score + '   FLOOR ' + e.floor, r.W / 2, r.H * .48, '#e8e0ff', { align: 'center', shadow: '#000' });
    this.letters.forEach((li, i) => {
      const x = Math.round(r.W / 2 + (i - 1) * 56);
      r.text(WHEEL[(li + WHEEL.length - 1) % WHEEL.length], x, r.H * .6 - 16, '#8a80a8', { align: 'center', scale: 2, shadow: '#000' });
      r.text(WHEEL[li], x, r.H * .6, i === this.slot ? '#ffd36a' : '#ffffff', { align: 'center', scale: 3, shadow: '#000' });
      r.text(WHEEL[(li + 1) % WHEEL.length], x, r.H * .6 + 22, '#8a80a8', { align: 'center', scale: 2, shadow: '#000' });
    });
    r.text('UP DOWN LETTER   LEFT RIGHT SLOT   ' + game.input.label('confirm') + ' ENTER', r.W / 2, r.H - 16, '#8a80a8', { align: 'center', shadow: '#000' });
  }
};

// The ending: the Iron Gauntlet raised, the credits, and the choice: Descent II, which loops the descent harder, or the title.
let ENDING_ROW = 0;
const ending = {
  pausable: false,
  enter() {
    this.t = 0; IDLE = 0; ENDING_ROW = 0; game.audio.music(SONGS.victory);
    const rows = WORLD.heroes.map(h => ({ name: CLASS_INITIALS[h.cls], score: h.score, floor: WORLD.index + 1, cls: h.cls }));
    this.saved = [];
    this.queue = rows.filter(r => qualifies(r.score)).map(r => ({ score: r.score, cls: r.cls, floor: r.floor, input: game.input }));
    this.L = List([
      { label: 'DESCENT II', act: () => { WORLD.loop = (WORLD.loop || 0) + 1; WORLD.heroes.forEach(h => { h.gauntlet = false; }); game.go('card', { index: 0 }, { fade: 'black' }); } },
      { label: 'TITLE', act: () => game.go('title', null, { fade: 'black' }) }
    ], { back: () => game.go('title', null, { fade: 'black' }) });
  },
  update(dt) {
    this.t += dt;
    if (this.queue.length) { game.go('initials', { queue: this.queue, next: 'ending' }, { fade: 'black' }); this.queue = []; return; }
    if (this.t > .8) listUpdate(this.L);
  },
  draw(r) {
    r.sky(['#103020', '#2a6a48']);
    r.overlay(g => E.font.title(g, 'GAUNTLET DOWN', r.W / 2, Math.round(r.H * .16), { scale: 2, align: 'center' }));
    wrapWords(line('ending'), 56).forEach((t, i) => r.text(t, r.W / 2, r.H * .36 + i * 12, '#e8ffe8', { align: 'center', shadow: '#000' }));
    r.text('THE GAUNT IS NOT DEAD. IT IS ONLY DIGESTING.', r.W / 2, r.H * .5, '#c8ffc8', { align: 'center', shadow: '#000' });
    WORLD.heroes.forEach((h, i) => r.text(h.name + '  SCORE ' + h.score + '  KILLS ' + h.kills + '  TREASURE ' + (h.treasure || 0), r.W / 2, r.H * .6 + i * 11, h.color, { align: 'center', shadow: '#000' }));
    if (this.saved && this.saved.length) r.text('ON THE TABLE: ' + this.saved.map(s => s.name).join(', '), r.W / 2, r.H * .76, '#ffd36a', { align: 'center', shadow: '#000' });
    if (this.t > .8) listDraw(r, this.L, r.W / 2, r.H * .84, { lh: 16 });
  }
};

// The attract mode: the autopilot plays four heroes through the floors with cheats on. Any input returns to the title.
const attract = {
  pausable: false,
  enter() {
    this.t = 0; this.pos = 0; this.loops = 0;
    game.audio.music(stageSong(WORLD.stage));
    WORLD.attract = true;
    WORLD.heroes = CLASS_ORDER.map((c, i) => { const h = makeHero(i, c, null); h.name = HEROES[c].name.slice(0, 4); return h; });
    loadStage(ATTRACT_STAGES[0]);
    game.audio.music(stageSong(WORLD.stage));
    game.cam.bounds = v => WORLD.map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .42;
    IDLE = 0;
  },
  exit() { WORLD.attract = false; game.lights.enabled = false; },
  update(dt) {
    this.t += dt;
    if (game.input.anyPressed() || (game.input.clicked && game.input.clicked()) || anyInputNow()) { game.input.consumeAll(); game.go('title', null, { fade: 'black' }); return; }
    const intents = WORLD.heroes.map(h => ({ hero: h, intent: h.down ? NO_INTENT : botIntent(h, WORLD.time) }));
    for (const h of WORLD.heroes) if (h.down && h.downT > 1) { rise(h, true); }
    stepWorld(dt, intents);
    for (const h of WORLD.heroes) {
      const attack = heroAttack(h);
      h.rig.update(dt, { x: h.body.x, y: h.body.y, z: 0, vx: h.body.vx, vy: h.body.vy, facing: h.facing, hurt: h.hurt > 0, pose: h.down ? 'die' : null, attack });
    }
    for (const m of WORLD.monsters) if (m.rig) m.rig.update(dt, { x: m.x, y: m.y, z: 0, vx: m.body.vx, vy: m.body.vy, facing: m.facing || 0 });
    const living = WORLD.heroes.filter(h => !h.down);
    if (living.length) game.cam.frame(living.map(h => h.body), { margin: 60, zoom: [.8, 1.1] });
    if (WORLD.descend) { WORLD.descend = null; this.t = 0; this.nextFloor(); }
    if (this.t > 60) { this.t = 0; this.nextFloor(); }
    if (WORLD.over) { this.nextFloor(); }
  },
  nextFloor() {
    this.pos = (this.pos + 1) % ATTRACT_STAGES.length;
    if (this.pos === 0) this.loops++;
    WORLD.heroes.forEach(h => { h.hp = TUNE.startHealth; h.down = false; h.downT = 0; });
    loadStage(ATTRACT_STAGES[this.pos]);
    game.audio.music(stageSong(WORLD.stage));
  },
  draw(r) { drawWorld(r); drawHud(r); }
};


