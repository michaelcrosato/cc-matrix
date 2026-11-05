// The menus: the main menu (a big list with a live vignette for the focused item), the exhibition setup (players join
// and pick sides and teams, then the game's options), the Hall of Fiasco (records) and About & Credits (from FF_ABOUT).
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, ui = FF.ui, glyph = FF.glyph, T = FF.data.teams;
const idleCheck = (dt, from) => { if (FF.idle.update(dt) > 10 && !game.shell.screen) { game.go('attract', { from }); return true; } return false; };
const back = () => game.players.some(p => p.pressed('cancel') || p.pressed('b2'));
/* ---- records (the Hall of Fiasco) ---- */
const REC = [['longestTD', 'LONGEST TD', ' YD'], ['longestFG', 'LONGEST FG', ' YD'], ['biggestHit', 'BIGGEST HIT', ' YD LAUNCH'], ['mostPoints', 'MOST POINTS IN A GAME', ' PTS'], ['mostSacks', 'MOST SACKS IN A GAME', ' SACKS'], ['fastestCup', 'FASTEST FIASCO CUP', '']];
FF.records = {
  get() { return E.store.get('ff:records', {}) || {}; },
  put(k, v, who, team, better = (a, b) => a > b) { const R = this.get(), cur = R[k]; if (!cur || better(v, cur.v)) { R[k] = { v, who, team, date: new Date().toISOString().slice(0, 10) }; E.store.set('ff:records', R); return true; } return false; },
  afterGame(m) {
    if (m.mode === 'hub' || m.mode === 'attract' || m.mode === 'lab' || FF.inHub) return;
    for (const s of [0, 1]) { if (!m.isHuman(s) && m.mode !== 'story') continue; const t = m.teams[s];
      this.put('mostPoints', m.score[s], t.short, t.id); this.put('mostSacks', m.stats[s].sacks, t.short, t.id);
      for (const a of m.roster[s]) { if (a.stats.launch) this.put('biggestHit', a.stats.launch, a.short, t.id); }
      if (m.longestTD && m.longestTD[s]) this.put('longestTD', m.longestTD[s].yards, m.longestTD[s].who, t.id);
      if (m.longestFG && m.longestFG[s]) this.put('longestFG', m.longestFG[s].yards, m.longestFG[s].who, t.id);
    }
  }
};
FF.bus.on('td', d => { const m = d.m; if (!m || !d.player) return; m.longestTD = m.longestTD || {}; const c = m.longestTD[d.side]; if (!c || d.yards > c.yards) m.longestTD[d.side] = { yards: d.yards, who: d.player.short }; });
FF.bus.on('fg', d => { const m = d.m; if (!m || !d.good) return; m.longestFG = m.longestFG || {}; const c = m.longestFG[d.side], k = m.bySlot && m.bySlot[d.side] && m.bySlot[d.side].K; if (!c || d.yards > c.yards) m.longestFG[d.side] = { yards: d.yards, who: k ? k.short : 'KICKER' }; });

/* ---- the main menu ---- */
const MM = { focus: new ui.Focus({ wrap: true }), t: 0 };
FF.menuDebug = () => ({ focus: MM.focus.i, items: (MM.focus.items || []).map(it => ({ label: MM.items && MM.items[it.k] ? MM.items[it.k].label : '', x: it.x, y: it.y, w: it.w, h: it.h })) });   // (for game.debug.snapshot)
const menuItems = () => {
  const save = game.saves.latest && game.saves.latest(), out = [];
  if (save) { out.push({ label: 'CONTINUE', act: () => FF.story.continue(), v: 'story' }); out.push({ label: 'NEW STORY', act: () => FF.story.newGame(), v: 'story' }); }
  else out.push({ label: 'STORY', act: () => FF.story.newGame(), v: 'story' });
  out.push({ label: 'EXHIBITION', act: () => game.go('setup'), v: 'exh' }, { label: 'PRACTICE', act: () => game.go('practice'), v: 'prac' }, { label: 'HALL OF FIASCO', act: () => game.go('records'), v: 'rec' },
    { label: 'OPTIONS', act: () => game.menu('settings'), v: 'opt' }, { label: 'ABOUT & CREDITS', act: () => game.go('about'), v: 'about' });
  return out;
};
FF.scenes.menu = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter(d) { if (!d && FF.story && FF.story.active && FF.story.returnToBoard) { FF.story.returnToBoard = false; game.go('story', null, { fade: 0 }); return; } MM.t = 0; FF.idle.reset(); FF.stage().enter(); FF.audioFx.music('LOCKER'); MM.items = menuItems(); game.allowJoin(false); while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]); },
  update(dt) {
    MM.t += dt; FF.stage().update(dt); if (idleCheck(dt, 'menu')) return;
    if (game.shell.screen) return;
    if (back()) { game.go('title'); return; }
    MM.focus.set(menuLayout({ W: game.W, H: game.H }));
    const it = MM.focus.update(); if (it) MM.items[it.k].act();
  },
  draw(r) {
    FF.stage().draw(r);
    r.overlay(g => {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0614'));
      E.font.title(g, 'AMERICAN FOOTBALL', 14, 10, { scale: 1, colors: ['#ffffff', '#ffb347'], outline: '#000' });
      E.font.title(g, 'FIASCO', 14, 20, { scale: 3, colors: ['#fff8a0', '#ffd84a', '#ff9a2a', '#e8481a'], outline: '#1a0a10', depth: 2 });
      const items = menuLayout(r);
      items.forEach(it => ui.button(g, it.x, it.y, it.w, it.h, MM.items[it.k].label, { focus: MM.focus.i === it.k, scale: 2, align: 'left' }));
      MM.focus.set(items);
      const cur = MM.items[MM.focus.i]; if (cur) vignette(g, r, cur.v, MM.t);
      ui.prompts(g, [['confirm', 'SELECT'], ['cancel', 'TITLE']], r.W - 8, r.H - 12, { align: 'right' });
    });
  }
};
function menuLayout(r) { const bw = Math.min(200, Math.floor(r.W * .45)), bh = 22; return MM.items.map((m, k) => ({ x: 14, y: 50 + k * (bh + 5), w: bw, h: bh, k })); }
function vignette(g, r, v, t) {
  const x = Math.floor(r.W * .5) + 6, w = r.W - x - 10, y = 46, h = r.H - 76;
  ui.panel(g, x, y, w, h, { alpha: .9 });
  const cx = x + w / 2;
  if (v === 'story') { ui.T(g, 'THE FIASCO CUP', cx, y + 6, '#ffd84a', { align: 'center', scale: 2 }); const S = FF.story ? FF.story.state() : null; FF.data.story.chapters.forEach((c, k) => { const bx = x + 10 + (k % 3) * ((w - 20) / 3), by = y + 28 + Math.floor(k / 3) * 46, done = S && S.done[c.id]; ui.panel(g, bx, by, (w - 20) / 3 - 6, 40, { alpha: .95, border: done ? '#5ae05a' : '#5a5878', bg: ['#4a3420', '#2a1c10'] }); ui.T(g, String(c.n), bx + 6, by + 4, '#ffd84a', { scale: 2 }); ui.T(g, c.title, bx + 4, by + 22, '#f4e8c8', { font: 'tiny' }); if (done) ui.T(g, '★'.repeat(S.stars[c.id] || 1), bx + 4, by + 30, '#ffd84a', { font: 'tiny' }); }); ui.T(g, 'Save the Fiascos\' field. Win the Cup.', cx, y + h - 14, '#c8c4e0', { align: 'center' }); }
  else if (v === 'exh') { ui.T(g, 'EXHIBITION', cx, y + 6, '#ffd84a', { align: 'center', scale: 2 }); const a = FF.Rigs.portraitRig('fiascos'), b = FF.Rigs.portraitRig('dynasty'), k = Math.abs(Math.sin(t * 2)) * 6; a.drawPortrait(g, Math.round(cx - 56 + k), y + 34, 48, { zoom: 2.2, turn: -.6, bg: '#1c2040' }); b.drawPortrait(g, Math.round(cx + 8 - k), y + 34, 48, { zoom: 2.2, turn: .6, bg: '#401c20' }); ui.T(g, '1-4 PLAYERS · ANY TEAMS · ANY STADIUM', cx, y + h - 14, '#c8c4e0', { align: 'center', font: 'tiny' }); }
  else if (v === 'prac') { ui.T(g, 'PRACTICE', cx, y + 6, '#ffd84a', { align: 'center', scale: 2 }); const sq = Math.max(0, Math.sin(t * 3)) * 8; px.rect(g, cx - 6, y + 50 + sq, 12, 40 - sq, '#c8302a'); px.rect(g, cx - 6, y + 70, 12, 3, '#f0eee6'); px.rect(g, cx - 10, y + 90, 20, 4, '#2a2a34'); ui.T(g, 'NINE DRILLS. EVERY BUTTON.', cx, y + h - 14, '#c8c4e0', { align: 'center' }); }
  else if (v === 'rec') { ui.T(g, 'HALL OF FIASCO', cx, y + 6, '#ffd84a', { align: 'center', scale: 2 }); const spr = FF.trophySprite(); if (spr) px.sprite(g, spr, Math.round(cx - spr.width / 2), y + 30); ui.T(g, 'THE RECORD BOOK', cx, y + h - 14, '#c8c4e0', { align: 'center' }); }
  else if (v === 'opt') { ui.T(g, 'OPTIONS', cx, y + 6, '#ffd84a', { align: 'center', scale: 2 }); for (let k = 0; k < 2; k++) { const gx = cx + (k ? 22 : -14), gy = y + 70 + (k ? 18 : 0), rr = k ? 12 : 18, a0 = t * (k ? -2 : 1.4); for (let i = 0; i < 8; i++) { const a = a0 + i * Math.PI / 4; px.disc(g, gx + Math.cos(a) * rr, gy + Math.sin(a) * rr, 4, '#8a8aa0'); } px.disc(g, gx, gy, rr - 2, '#a8a8c0'); px.disc(g, gx, gy, 4, '#2a2a3a'); } ui.T(g, 'BUTTON SYMBOLS · SOUND · VOICES · CAMERA', cx, y + h - 14, '#c8c4e0', { align: 'center', font: 'tiny' }); }
  else if (v === 'about') { ui.T(g, 'ABOUT & CREDITS', cx, y + 6, '#ffd84a', { align: 'center', scale: 2 }); FF.talk.rig('chet').drawPortrait(g, Math.round(cx - 54), y + 34, 46, { zoom: 2.4, turn: .4, bg: '#3a1c1c' }); FF.talk.rig('lou').drawPortrait(g, Math.round(cx + 8), y + 34, 46, { zoom: 2.4, turn: -.4, bg: '#1c2a3a' }); ui.T(g, 'CHET & LOU IN THE BOOTH', cx, y + h - 14, '#c8c4e0', { align: 'center' }); }
}
let trophy = null; FF.trophySprite = () => { if (!trophy && E.shapeSprite) try { trophy = E.shapeSprite('trophy', { view: 'threequarter', size: 2.4 }); } catch (e) { trophy = null; } return trophy; };
const portraits = {}; FF.Rigs.portraitRig = id => portraits[id] || (portraits[id] = FF.Rigs.athlete(T[id].bySlot.QB, T[id], true));

/* ---- exhibition setup: players and sides, teams, then the options ---- */
const SU = { step: 0, cols: [], teams: ['fiascos', 'mudhogs'], ready: [], focus: new ui.Focus({ wrap: false }), opts: { stadium: null, weather: 'stadium' }, t: 0 };
const playable = () => FF.data.playable;
FF.scenes.setup = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter(d) { SU.step = 0; SU.t = 0; if (!(d && d.keep)) { SU.cols = [-1]; SU.teams = ['fiascos', 'mudhogs']; SU.opts = { stadium: null, weather: 'stadium' }; } SU.ready = []; FF.idle.reset(); FF.stage().enter(); game.allowJoin({ max: 4, onJoin: (I, n) => { SU.cols[n - 1] = 0; game.audio.sfx('menuSelect'); } }); FF.audioFx.music('LOCKER'); },
  exit() { game.allowJoin(false); },
  update(dt) {
    SU.t += dt; FF.stage().update(dt); if (SU.step === 0 && idleCheck(dt, 'setup')) return; if (game.shell.screen) return;
    if (SU.step === 0) {
      game.players.forEach((I, p) => {
        if (SU.cols[p] === undefined) SU.cols[p] = 0;
        if (SU.ready[p]) { if (I.pressed('b2') || I.pressed('cancel')) SU.ready[p] = false; return; }
        if (I.repeat('left', .3, .2)) { SU.cols[p] = Math.max(-1, SU.cols[p] - 1); game.audio.sfx('menuMove'); }
        if (I.repeat('right', .3, .2)) { SU.cols[p] = Math.min(1, SU.cols[p] + 1); game.audio.sfx('menuMove'); }
        const side = SU.cols[p] === -1 ? 0 : SU.cols[p] === 1 ? 1 : -1;
        if (side >= 0 && SU.cols.findIndex(c => c === SU.cols[p]) === p) { if (I.repeat('up', .3, .2)) cycleTeam(side, -1); if (I.repeat('down', .3, .2)) cycleTeam(side, 1); }
        if (p === 0 && I.pressed('b4')) { const free = [0, 1].find(s => !SU.cols.includes(s === 0 ? -1 : 1)); if (free !== undefined) cycleTeam(free, 1); }
        if (I.pressed('b1') || I.pressed('confirm')) { SU.ready[p] = true; game.audio.sfx('menuSelect'); }
        if (p === 0 && (I.pressed('cancel') || I.pressed('b2')) && !SU.ready[0]) game.go('menu');
      });
      // the mouse: click a side's arrows or panels
      const c = game.input.clicked(); if (c) { const W = game.W, third = W / 3; if (c[1] > 60 && c[1] < game.H - 40) { const col = c[0] < third ? -1 : c[0] > 2 * third ? 1 : 0; if (SU.cols[0] !== col) SU.cols[0] = col; else if (col !== 0) cycleTeam(col < 0 ? 0 : 1, 1); } if (c[1] >= game.H - 40) SU.ready[0] = true; }
      if (game.players.length && game.players.every((I, p) => SU.ready[p])) { SU.step = 1; SU.focus.i = 4; game.allowJoin(false); if (!SU.opts.stadium) SU.opts.stadium = T[SU.teams[0]].stadium; }
    } else {
      if (back()) { SU.step = 0; SU.ready = []; game.allowJoin({ max: 4, onJoin: (I, n) => { SU.cols[n - 1] = 0; } }); return; }
      drawOptions(null, { W: game.W, H: game.H });
      const it = SU.focus.update(); const P = game.input;
      const cur = SU.focus.item; if (cur && cur.cycle && (P.pressed('left') || P.pressed('right'))) cur.cycle(P.pressed('left') ? -1 : 1);
      if (it) { if (it.cycle) it.cycle(1); else if (it.go) it.go(); }
    }
  },
  draw(r) {
    FF.stage().draw(r);
    r.overlay(g => {
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0614'));
      ui.T(g, SU.step === 0 ? 'CONTROLLERS & TEAMS' : 'GAME OPTIONS', r.W / 2, 8, '#ffd84a', { align: 'center', scale: 2 });
      if (SU.step === 0) drawSides(g, r); else drawOptions(g, r);
    });
  }
};
function cycleTeam(side, d) { const L = playable(), i = L.indexOf(SU.teams[side]); let n = (i + d + L.length) % L.length; if (L[n] === SU.teams[1 - side]) n = (n + d + L.length) % L.length; SU.teams[side] = L[n]; game.audio.sfx('menuMove'); }
function drawSides(g, r) {
  const third = Math.floor(r.W / 3);
  for (const [col, label] of [[-1, 'HOME'], [0, 'CPU'], [1, 'AWAY']]) {
    const x = (col + 1) * third + 4, w = third - 8, y = 28, h = r.H - 82;
    ui.panel(g, x, y, w, h, { alpha: .9, border: col === 0 ? '#5a5878' : '#ffb02e' });
    ui.T(g, label, x + w / 2, y + 4, '#ffd84a', { align: 'center', scale: 2 });
    if (col !== 0) {
      const s = col < 0 ? 0 : 1, t = T[SU.teams[s]], human = SU.cols.some(c => c === col);
      ui.logo(g, t, x + w / 2 - 18, y + 24, 3);
      ui.T(g, t.short, x + w / 2, y + 62, '#ffffff', { align: 'center', scale: 1 });
      ui.T(g, human ? 'PLAYERS' : 'CPU', x + w / 2, y + 72, human ? '#5ae05a' : '#a9a6c0', { align: 'center', font: 'tiny' });
      const bars = t.bars; let by = y + 82; for (const k of ['PASS', 'RUN', 'DEFENSE', 'SPECIAL']) { ui.T(g, k, x + 6, by, '#a9a6c0', { font: 'tiny' }); ui.bar(g, x + 44, by, w - 52, 4, bars[k] / 10, '#ffb02e'); by += 9; }
      const star = t.star;
      ui.T(g, 'STAR: ' + star.name, x + w / 2, by + 2, '#f4e8c8', { align: 'center', font: 'tiny' });
      if (star.special) ui.T(g, star.special, x + w / 2, by + 10, '#e0a0ff', { align: 'center', font: 'tiny' });
      ui.T(g, '↑↓ TEAM', x + w / 2, y + h - 10, '#8a86a8', { align: 'center', font: 'tiny' });
    } else { ui.T(g, 'PRESS START ON A PAD', x + w / 2, y + 40, '#c8c4e0', { align: 'center', font: 'tiny' }); ui.T(g, 'OR 2 ON THE KEYBOARD', x + w / 2, y + 48, '#c8c4e0', { align: 'center', font: 'tiny' }); ui.T(g, 'TO JOIN (UP TO 4)', x + w / 2, y + 56, '#c8c4e0', { align: 'center', font: 'tiny' }); ui.T(g, 'NO HUMANS: CPU VS CPU', x + w / 2, y + 74, '#8a86a8', { align: 'center', font: 'tiny' }); }
  }
  // each player's device icon in its column
  game.players.forEach((I, p) => {
    const col = SU.cols[p] || 0, x = (col + 1) * third + third / 2 - 30 + (p % 2) * 32, y = r.H - 76 + Math.floor(p / 2) * 16, c = E.PLAYER_COLORS[p];
    ui.panel(g, x, y, 30, 14, { alpha: .95, border: c }); ui.T(g, 'P' + (p + 1), x + 3, y + 4, c, { font: 'tiny' }); ui.T(g, I.lastDevice === 'gamepad' || I.padIndex !== null && I.padIndex !== undefined ? 'PAD' : I.half ? 'KB' + (I.half === 'left' ? 'L' : 'R') : 'KEY', x + 14, y + 4, '#f4f0e6', { font: 'tiny' });
    if (SU.ready[p]) ui.T(g, '✓', x + 26, y - 6, '#5ae05a', { scale: 1 });
  });
  ui.prompts(g, [['move', 'SIDE / TEAM'], ['b1', 'READY'], ['b4', 'CPU TEAM'], ['b2', 'BACK']], r.W / 2, r.H - 14, { align: 'center' });
}
function drawOptions(g, r) {
  const S = FF.data.stadiums, L = FF.data.stadiumList, W = ['stadium', 'clear', 'rain', 'snow'], items = [], x = Math.floor(r.W / 2 - 150), w = 300;
  const rows = [
    ['STADIUM', S[SU.opts.stadium].name, d => { const i = L.indexOf(SU.opts.stadium); SU.opts.stadium = L[(i + d + L.length) % L.length]; }],
    ['WEATHER', SU.opts.weather === 'stadium' ? 'STADIUM\'S OWN' : SU.opts.weather.toUpperCase(), d => { const i = W.indexOf(SU.opts.weather); SU.opts.weather = W[(i + d + W.length) % W.length]; }],
    ['QUARTERS', FF.u.mmss(game.settings.quarter), d => { const o = [60, 90, 120, 180, 300], i = o.indexOf(game.settings.quarter); game.settings.set('quarter', o[(i + d + o.length) % o.length]); }],
    ['DIFFICULTY', game.settings.difficulty.toUpperCase(), d => { const o = ['rookie', 'pro', 'fiasco'], i = o.indexOf(game.settings.difficulty); game.settings.set('difficulty', o[(i + d + o.length) % o.length]); }]];
  rows.forEach(([lab, val, cyc], k) => { const y = 34 + k * 30, f = SU.focus.i === k; items.push({ x, y, w, h: 24, cycle: d => { cyc(d); game.audio.sfx('menuMove'); } }); if (g) { ui.button(g, x, y, w, 24, '', { focus: f }); ui.T(g, lab, x + 22, y + 9, '#a9a6c0'); ui.T(g, '‹ ' + val + ' ›', x + w - 12, y + 6, f ? '#fff4d8' : '#e8e4f0', { align: 'right', scale: 2 }); } });
  const py = 34 + 4 * 30 + 6; items.push({ x: x + 40, y: py, w: w - 80, h: 30, go: () => startExhibition() }); if (g) ui.button(g, x + 40, py, w - 80, 30, 'PLAY BALL!', { focus: SU.focus.i === 4, scale: 3 });
  SU.focus.set(items);
  if (g) ui.prompts(g, [['move', 'CHANGE'], ['b1', 'SELECT'], ['b2', 'BACK']], r.W / 2, r.H - 14, { align: 'center' });
}
function startExhibition() {
  const humans = { 0: [], 1: [] }; game.players.forEach((I, p) => { const c = SU.cols[p]; if (c === -1) humans[0].push(p); else if (c === 1) humans[1].push(p); });
  const spec = { mode: 'exhibition', home: SU.teams[0], away: SU.teams[1], stadium: SU.opts.stadium, weather: SU.opts.weather, humans, quarterLength: game.settings.quarter, difficulty: game.settings.difficulty, start: 'kickoff' };
  spec.cards = { 0: [FF.u.pick(FF.data.cardList, Math.random)], 1: [FF.u.pick(FF.data.cardList, Math.random)] };
  game.go('match', { spec }, { fade: 'wipe' });
}
FF.startExhibition = startExhibition;

/* ---- the Hall of Fiasco ---- */
const RC = { page: 0, t: 0 };
FF.scenes.records = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter() { RC.page = 0; FF.stage().enter(); },
  update(dt) { RC.t += dt; FF.stage().update(dt); if (back() || ui.backClicked(RC.back)) game.go('menu'); const I = game.input; if (I.pressed('right') || I.pressed('rb')) RC.page = (RC.page + 1) % 2; if (I.pressed('left') || I.pressed('lb')) RC.page = (RC.page + 1) % 2; },
  draw(r) { FF.stage().draw(r); r.overlay(g => drawRecords(g, r, RC)); }
};
function drawRecords(g, r, st) {
  px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0614'));
  E.font.title(g, 'HALL OF FIASCO', r.W / 2, 8, { scale: 2, colors: ['#fff8a0', '#ffd84a', '#ff9a2a'], outline: '#000', align: 'center', depth: 2 });
  const R = FF.records.get(), story = FF.story ? FF.story.state() : null, x = Math.floor(r.W / 2 - 180), w = 360;
  const rows = st.page === 0 ? REC.map(([k, lab, unit]) => [lab, R[k] ? (k === 'fastestCup' ? FF.u.mmss(R[k].v) : R[k].v + unit) : '—', R[k] ? R[k].who : '', R[k] ? R[k].team : null, R[k] ? R[k].date : ''])
    : FF.data.story.chapters.map(c => ['CH' + c.n + ' ' + c.title, story && story.done[c.id] ? '★'.repeat(story.stars[c.id] || 1) + '☆'.repeat(3 - (story.stars[c.id] || 1)) : 'NOT YET', '', 'fiascos', '']);
  rows.forEach(([lab, val, who, team, date], k) => { const y = 36 + k * 30; ui.panel(g, x, y, w, 26, { alpha: .9, border: '#5a5878' }); if (team && T[team]) ui.logo(g, T[team], x + 6, y + 7, 1); ui.T(g, lab, x + 24, y + 4, '#a9a6c0'); ui.T(g, who + (date ? '  ' + date : ''), x + 24, y + 14, '#c8c4e0', { font: 'tiny' }); ui.T(g, val, x + w - 8, y + 6, '#ffd84a', { align: 'right', scale: 2 }); });
  ui.T(g, (st.page + 1) + ' / 2', r.W / 2, r.H - 30, '#8a86a8', { align: 'center' });
  st.back = ui.backButton(g, r);
  ui.prompts(g, [['lb', 'PAGE'], ['rb', 'PAGE'], ['b2', 'BACK']], r.W - 8, r.H - 14, { align: 'right' });
}
FF.drawRecords = drawRecords;

/* ---- About & Credits: Source Information, the feedback, the credits, the engine changes ---- */
const AB = { page: 0, scroll: 0 };
FF.aboutPages = () => {
  const A = window.FF_ABOUT || {}, si = A.sourceInformation || {};
  const lab = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
  const Q = { t: ['How many issues did testing catch?', 'How many were critical / game breaking?', 'The most helpful test', 'The least helpful test'], e: ['What I liked most about the engine', 'Did I get stuck or guess wrong?', 'The most important thing I built myself', 'The hardest part of using the engine', 'What I changed in the engine, and why', 'One thing I would change about the engine'], p: ['What I liked most about this prompt', 'What was confusing', 'The hardest thing to do', 'What I would change in this prompt'] };
  return [
    { title: 'SOURCE INFORMATION', lines: Object.keys(lab).map(k => [lab[k], si[k] || 'unknown']) },
    { title: 'TESTING FEEDBACK', lines: (A.testingFeedback || []).map((v, i) => [Q.t[i] || '', v]) },
    { title: 'ENGINE FEEDBACK', lines: (A.engineFeedback || []).map((v, i) => [Q.e[i] || '', v]) },
    { title: 'PROMPT FEEDBACK', lines: (A.promptFeedback || []).map((v, i) => [Q.p[i] || '', v]) },
    { title: 'CREDITS', lines: (A.credits || []).map(c => [c[0], c[1]]) },
    { title: 'ENGINE CHANGES', lines: (A.engineChanges || []).map(c => [c[0], c[1]]) }
  ];
};
FF.scenes.about = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter() { AB.page = 0; AB.scroll = 0; FF.stage().enter(); },
  update(dt) {
    FF.stage().update(dt); const I = game.input, n = FF.aboutPages().length;
    if (back() || ui.backClicked(AB.back)) { game.go('menu'); return; }
    for (const p of game.players) { if (p.pressed('right') || p.pressed('rb')) { AB.page = (AB.page + 1) % n; AB.scroll = 0; game.audio.sfx('menuMove'); } if (p.pressed('left') || p.pressed('lb')) { AB.page = (AB.page + n - 1) % n; AB.scroll = 0; game.audio.sfx('menuMove'); } if (p.repeat('down', .2, .06)) AB.scroll += 12; if (p.repeat('up', .2, .06)) AB.scroll = Math.max(0, AB.scroll - 12); }
    const c = I.clicked(); if (c && c[1] > 30 && c[1] < game.H - 30) { if (c[0] > game.W - 40) { AB.page = (AB.page + 1) % n; AB.scroll = 0; } else if (c[0] < 40) { AB.page = (AB.page + n - 1) % n; AB.scroll = 0; } }
  },
  draw(r) { FF.stage().draw(r); r.overlay(g => drawAbout(g, r, AB)); }
};
function drawAbout(g, r, st) {
  px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0614'));
  const P = FF.aboutPages(), p = P[st.page], x = 44, w = r.W - 88;
  E.font.title(g, p.title, r.W / 2, 6, { scale: 2, colors: ['#fff8a0', '#ffd84a', '#ff9a2a'], outline: '#000', align: 'center', depth: 1 });
  let y = 30 - st.scroll; const clipTop = 26, clipBot = r.H - 38;
  for (const [k, v] of p.lines) {
    const L = E.font.wrap(String(v), w - 4);
    if (y + 9 >= clipTop && y < clipBot) ui.T(g, k, x, y, '#ffb02e');
    y += 9;
    for (const ln of L) { if (y >= clipTop && y < clipBot) ui.T(g, ln, x + 4, y, '#f4f0e6'); y += 9; }
    y += 4;
  }
  st.max = Math.max(0, y + st.scroll - clipBot);
  if (st.scroll > st.max) st.scroll = st.max;
  ui.T(g, '‹', 14, r.H / 2 - 8, '#ffd84a', { scale: 3 }); ui.T(g, '›', r.W - 24, r.H / 2 - 8, '#ffd84a', { scale: 3 });
  ui.T(g, (st.page + 1) + ' / ' + P.length, r.W / 2, r.H - 34, '#8a86a8', { align: 'center' });
  st.back = ui.backButton(g, r);
  ui.prompts(g, [['lb', 'PAGE'], ['rb', 'PAGE'], ['move', 'SCROLL'], ['b2', 'BACK']], r.W - 8, r.H - 14, { align: 'right' });
}
FF.drawAbout = drawAbout;
})();
