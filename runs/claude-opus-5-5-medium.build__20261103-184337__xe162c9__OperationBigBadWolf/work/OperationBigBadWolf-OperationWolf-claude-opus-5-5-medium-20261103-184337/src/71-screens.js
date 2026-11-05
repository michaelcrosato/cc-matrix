// Canvas screens: a 10-foot menu (pad, keys, mouse hover and click), the prompt footer in the last device's glyphs,
// and the backdrops of the title, map, briefing, interrogation tent and ending.
(() => {
const E = My3D2dge, WP = globalThis.WP, px = E.px, F = E.font;
const UI = WP.UI = {};
const txt = UI.txt = (g, s, x, y, c = '#f2ead3', o = {}) => F.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: '#0b0c08' }, o));
// ---------------------------------------------------------------------------------------------- the menu
UI.Menu = class {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.x = o.x || WP.W / 2; this.y = o.y || 120; this.gap = o.gap || 18; this.scale = o.scale || 2; this.align = o.align || 'center'; this.onPick = o.onPick; this.onCancel = o.onCancel; this.rects = []; this.lastPtr = null; this.onMove = o.onMove; }
  label(it) { return typeof it.label === 'function' ? it.label() : it.label; }
  update(I) {
    const n = this.items.length; if (!n) return;
    const ok = k => !this.items[k].disabled && !this.items[k].hidden;
    const move = d => { let k = this.i; for (let t = 0; t < n; t++) { k = (k + d + n) % n; if (ok(k)) break; } if (k !== this.i) { this.i = k; WP.Audio.S.menuMove(); if (this.onMove) this.onMove(this.i); } };
    if (I.repeat('down', .3, .12)) move(1); if (I.repeat('up', .3, .12)) move(-1);
    const it = this.items[this.i];
    if (it && it.options && (I.repeat('left', .3, .15) || I.repeat('right', .3, .15))) { const d = I.down('left') ? -1 : 1; it.cycle(d); WP.Audio.S.menuMove(); }
    // the mouse: hover moves the focus, a click picks
    const ptr = I.pointer ? I.pointer() : null;
    if (ptr && (!this.lastPtr || ptr[0] !== this.lastPtr[0] || ptr[1] !== this.lastPtr[1])) { this.lastPtr = ptr.slice(); const k = this.rects.findIndex(r => r && WP.inRect(ptr, r)); if (k >= 0 && ok(k) && k !== this.i) { this.i = k; WP.Audio.S.menuMove(); } }
    const cl = I.clicked ? I.clicked() : null;
    if (cl) { const k = this.rects.findIndex(r => r && WP.inRect(cl, r)); if (k >= 0 && ok(k)) { this.i = k; this.pick(); return; } }
    if (I.pressed('confirm') || I.pressed('start')) { this.pick(); return; }
    if (I.pressed('cancel') && this.onCancel) { WP.Audio.S.menuBack(); this.onCancel(); }
  }
  pick() { const it = this.items[this.i]; if (!it || it.disabled) return; WP.Audio.S.menuPick(); if (it.options) it.cycle(1); else if (it.fn) it.fn(); else if (this.onPick) this.onPick(this.i, it); }
  draw(g) {
    this.rects = []; let y = this.y; const t = WP.Render.t;
    this.items.forEach((it, k) => {
      if (it.hidden) { this.rects.push(null); return; }
      const s = this.label(it) + (it.options ? '  < ' + it.value() + ' >' : ''), on = k === this.i, w = F.width(s, { scale: this.scale }), h = 7 * this.scale;
      const x = this.align === 'center' ? this.x - w / 2 : this.x;
      if (on) { px.blend(g, .55, 'normal', () => px.rect(g, x - 14, y - 3, w + 28, h + 6, '#2a3a1c')); px.rect(g, x - 14, y - 3, 2, h + 6, '#e0b040'); const b = Math.round(Math.sin(t * 6) * 2); txt(g, '>', x - 11 + b, y, '#e0b040', { scale: this.scale }); }
      txt(g, s, x, y, it.disabled ? '#5a5a4a' : on ? '#ffe080' : '#d8d0b8', { scale: this.scale });
      this.rects.push([x - 16, y - 4, x + w + 16, y + h + 4]); y += this.gap;
    });
  }
};
// the prompt footer: "✕ SELECT  ○ BACK" in the last device's symbols
UI.footer = (g, I, items) => {
  let x = WP.W - 6; const y = WP.H - 12;
  for (const [a, label] of items.slice().reverse()) { const s = String(I ? I.label(a) : a).toUpperCase() + ' ' + label; const w = F.width(s); x -= w; txt(g, s, x, y, '#c8c0a8'); x -= 12; }
};
// ---------------------------------------------------------------------------------------------- the title's art
UI.titleArt = (g, t) => {
  for (let y = 0; y < WP.H; y++) { const u = y / WP.H; px.rect(g, 0, y, WP.W, 1, E.mix('#05060f', '#2a1e3a', Math.min(1, u * 1.4))); }
  for (let i = 0; i < 70; i++) { const x = (i * 137) % WP.W, y = (i * 71) % 140, tw = Math.sin(t * 2 + i) > .7; px.rect(g, x, y, 1, 1, tw ? '#ffffff' : '#8a8aa8'); }
  // the full moon
  px.ddisc(g, 360, 70, 60, '#f8f0d0', .18); px.disc(g, 360, 70, 34, '#f4ecd0'); px.disc(g, 352, 62, 8, '#e0d8bc'); px.disc(g, 372, 80, 6, '#e0d8bc'); px.disc(g, 366, 56, 4, '#e8e0c4');
  // searchlights sweeping
  for (let i = 0; i < 2; i++) { const a = Math.sin(t * .5 + i * 2) * .5 - Math.PI / 2, x0 = 80 + i * 320; px.blend(g, .1, 'add', () => px.poly(g, [[x0, 230], [x0 + Math.cos(a - .06) * 300, 230 + Math.sin(a - .06) * 300], [x0 + Math.cos(a + .06) * 300, 230 + Math.sin(a + .06) * 300]], '#fff8d0')); }
  // a helicopter crossing
  const hx = ((t * 30) % (WP.W + 120)) - 60, hy = 40 + Math.sin(t) * 4;
  px.ell(g, hx, hy, 10, 5, '#0a0a12'); px.rect(g, hx - 24, hy - 1, 16, 2, '#0a0a12'); px.rect(g, hx - 26, hy - 5, 2, 6, '#0a0a12'); const rr = Math.abs(Math.cos(t * 30)) * 16 + 2; px.rect(g, hx - rr, hy - 7, rr * 2, 1, '#0a0a12');
  // the ridge and four wolves on it
  px.poly(g, [[0, 200], [80, 180], [170, 186], [250, 166], [330, 178], [420, 160], [WP.W, 176], [WP.W, WP.H], [0, WP.H]], '#0b0c12');
  const wolf = (x, y, s, howl) => { const P = q => q.map(([a, b]) => [x + a * s, y + b * s]); px.poly(g, P([[-10, 0], [-8, -6], [4, -7], [8, -6], [9, 0], [7, 0], [6, -3], [-6, -3], [-7, 0]]), '#0b0c12'); px.poly(g, P(howl ? [[6, -6], [9, -12], [12, -16], [13, -13], [11, -9], [9, -5]] : [[6, -6], [10, -9], [14, -8], [13, -6], [9, -4]]), '#0b0c12'); px.poly(g, P([[-10, -5], [-15, -9], [-14, -6], [-10, -3]]), '#0b0c12'); px.poly(g, P(howl ? [[10, -14], [11, -18], [12, -15]] : [[11, -9], [11, -12], [12, -9]]), '#0b0c12'); };
  wolf(232, 168, 1.6, true); wolf(200, 176, 1.3, false); wolf(275, 170, 1.4, false); wolf(170, 182, 1.2, false);
};
UI.logo = (g, y) => {
  F.title(g, 'OPERATION', WP.W / 2, y, { scale: 2, colors: ['#e8e0b0', '#c8b070', '#8a7040'], outline: '#0b0c08', depth: 2, depthColor: '#3a2e18', align: 'center' });
  F.title(g, 'BIG BAD WOLF', WP.W / 2, y + 20, { scale: 3, colors: ['#fff0b0', '#e0b040', '#6a7a3a'], outline: '#0b0c08', depth: 4, depthColor: '#2a3018', align: 'center' });
};
// ---------------------------------------------------------------------------------------------- the map of the Brimstone Coast
UI.NODES = [[96, 196], [150, 130], [222, 170], [290, 120], [360, 80], [410, 150]];
UI.mapArt = (g, t) => {
  px.rect(g, 0, 0, WP.W, WP.H, '#1a3a5a');
  for (let i = 0; i < 40; i++) px.rect(g, (i * 53 + t * 6) % WP.W, (i * 37) % WP.H, 6, 1, '#2a4a6a');
  const coast = [[30, 250], [20, 180], [50, 120], [110, 70], [200, 40], [320, 30], [440, 50], [470, 120], [450, 200], [380, 240], [260, 258], [140, 262]];
  px.poly(g, coast.map(([x, y]) => [x + 4, y + 4]), '#0e2a40'); px.poly(g, coast, '#c8b080'); px.poly(g, coast.map(([x, y]) => [WP.W / 2 + (x - WP.W / 2) * .95, 140 + (y - 140) * .93]), '#4a7a3a');
  for (let i = 0; i < 60; i++) { const x = 60 + (i * 97) % 380, y = 60 + (i * 53) % 180; px.disc(g, x, y, 3 + (i % 3), i % 2 ? '#3a6a2a' : '#2e5a24'); }
  // the river, roads, the volcano
  for (let i = 0; i < 40; i++) { const u = i / 40; px.rect(g, 120 + u * 90 + Math.sin(u * 8) * 10, 210 - u * 110, 4, 4, '#3a6a9a'); }
  for (let i = 0; i < 6; i++) { const a = UI.NODES[i], b = UI.NODES[i + 1]; if (!b) break; for (let s = 0; s < 1; s += .04) px.rect(g, a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, 2, 2, '#8a6a44'); }
  px.poly(g, [[280, 70], [320, 22], [340, 22], [380, 70]], '#5a4a3a'); px.poly(g, [[318, 26], [330, 14], [342, 26]], '#3a2e24'); px.blend(g, .5 + .2 * Math.sin(t * 3), 'add', () => px.disc(g, 330, 20, 5, '#ff6020'));
  for (let i = 0; i < 4; i++) px.ddisc(g, 330 + Math.sin(t + i) * 4, 10 - i * 6 - (t * 4 % 6), 6 + i * 2, '#5a5050', .4);
  F.text(g, 'MT. BRIMSTONE', 304, 74, '#e8d8b0', { outline: '#0b0c08', font: 'tiny' });
  F.text(g, 'BRIMSTONE COAST', 24, 8, '#f2ead3', { outline: '#0b0c08', scale: 2 });
};
UI.mapIcons = ['icoMast', 'icoBoat', 'icoSoldier', 'icoJeep', 'icoHostage', 'icoHeli'];
// ---------------------------------------------------------------------------------------------- briefing: the coast at night
UI.coastNight = (g, t) => {
  for (let y = 0; y < WP.H; y++) px.rect(g, 0, y, WP.W, 1, E.mix('#03040c', '#1a1430', Math.min(1, y / 160)));
  for (let i = 0; i < 80; i++) px.rect(g, (i * 131 + t * 2) % WP.W, (i * 61) % 120, 1, 1, i % 5 ? '#6a6a8a' : '#ffffff');
  const pan = t * 8;
  px.poly(g, [[0, 170], [120 - pan % 40, 150], [200, 120], [240, 90], [270, 92], [300, 120], [400, 160], [WP.W, 170], [WP.W, WP.H], [0, WP.H]], '#0a0c14');
  px.blend(g, .6 + .3 * Math.sin(t * 2), 'add', () => { px.disc(g, 255, 90, 6, '#ff5020'); px.ddisc(g, 255, 92, 26, '#ff3010', .3); });
  for (let y = 172; y < WP.H; y += 3) { const s = Math.sin(y * .3 + t * 2) * 6; px.rect(g, 0, y, WP.W, 1, y % 6 ? '#0c1428' : '#14203a'); px.rect(g, 360 + s, y, 30 - (y - 172) * .1, 1, '#4a4a6a'); }
};
UI.tent = (g, t) => {
  px.rect(g, 0, 0, WP.W, WP.H, '#140f0a');
  px.poly(g, [[0, 30], [WP.W / 2, 0], [WP.W, 30], [WP.W, 220], [0, 220]], '#3a3020'); px.poly(g, [[60, 40], [WP.W / 2, 14], [WP.W - 60, 40], [WP.W - 60, 210], [60, 210]], '#4a3e2a');
  px.rect(g, 0, 210, WP.W, 60, '#2a2218');
  const sw = Math.sin(t * 1.4) * 10, lx = WP.W / 2 + sw;
  px.line(g, WP.W / 2, 0, lx, 50, '#2a2a2a'); px.ell(g, lx, 54, 8, 5, '#5a5a4a');
  px.blend(g, .35, 'add', () => px.ddisc(g, lx, 120, 150, '#ffd890', .45)); px.blend(g, 1, 'add', () => px.disc(g, lx, 58, 3, '#fff0c0'));
};
UI.sunriseSea = (g, t) => {
  for (let y = 0; y < 150; y++) px.rect(g, 0, y, WP.W, 1, E.mix('#3a4a8a', '#f0a070', y / 150));
  px.ddisc(g, 240, 150, 80, '#ffd8a0', .35); px.disc(g, 240, 150, 22, '#fff0c0');
  for (let y = 150; y < WP.H; y++) { const u = (y - 150) / 120; px.rect(g, 0, y, WP.W, 1, E.mix('#d08060', '#1a3a5a', Math.min(1, u * 1.5))); if (y % 3 === 0) { const w = 60 - u * 40; px.rect(g, 240 - w / 2 + Math.sin(y + t * 3) * 4, y, w, 1, '#ffe0b0'); } }
};
UI.plane = (g, x, y, s, t) => {
  const T1 = E.tones('#8a8e94');
  px.ell(g, x, y, 14 * s, 10 * s, T1.base); px.ell(g, x, y - 2 * s, 12 * s, 6 * s, T1.lt);
  px.rect(g, x - 70 * s, y - 2 * s, 140 * s, 4 * s, '#d8d4c8'); px.rect(g, x - 70 * s, y - 2 * s, 140 * s, 1 * s, '#f8f4e8');
  px.poly(g, [[x - 2 * s, y - 10 * s], [x, y - 28 * s], [x + 2 * s, y - 10 * s]], T1.sh); px.rect(g, x - 24 * s, y - 14 * s, 48 * s, 3 * s, '#d8d4c8');
  for (const sd of [-1, 1]) { px.disc(g, x + sd * 30 * s, y + 1 * s, 5 * s, '#3e4a2a'); const a = Math.abs(Math.cos(t * 40)) * 12 * s + 1; px.rect(g, x + sd * 30 * s - a, y + 1 * s, a * 2, 1, '#141414'); }
};
// ---------------------------------------------------------------------------------------------- About / Credits pages (14.2): the same text goes in the chat reply
WP.ABOUT = [
  ['SOURCE INFORMATION (1/2)', [['DATE', '2026-11-03 18:43:37'], ['SOURCE', 'Operation Wolf (Taito, 1987 arcade)'], ['PLAN', 'PLAN.md'], ['GENRE AND PERSPECTIVE', 'Light-gun rail shooter; first person on a scripted rail (Mode 7 depth view)'],
    ['TECH', 'my-3D2dge v0.85.2 (full engine: Mode 7, Arcade, Shell; 5 small engine edits), AI Hub session client 1.4.0, Playwright 1.63.0 and Node 24 for tests and the bundle']]],
  ['SOURCE INFORMATION (2/2)', [['ART DIRECTION', 'The engine\'s native PS1/SNES pixel style: shaded HD Humanoid rigs, shapes-as-data vehicles and props, pixel-art HUD and screens'],
    ['ANIMATION', 'The engine\'s rig system (poses, moves, throw) plus custom poses: hands up, bound hands, panic, whistle, rocket on the shoulder, parachute'],
    ['AUDIO', 'All synthesized in code: chip-synth SFX, 13 original songs with layers, Animalese-style gibberish voices, the howl'],
    ['ONLINE', 'AI Hub Session Protocol v1, shared-world co-op for 1-4; local co-op for 1-4'],
    ['TESTING', 'Headless scripted suites and a whole-game bot playthrough, browser smoke test, AI Hub harness'], ['RESEARCH', 'Planner: Wikipedia and arcade-history.com on Operation Wolf; builder: none beyond the engine and hub docs'],
    ['ENVIRONMENT', 'Claude Code CLI (headless); Linux; browser unknown'], ['MODEL', 'Anthropic, claude-opus-5-5, reasoning effort medium'], ['USAGE', 'Cost and tokens: unknown. Session time: about 1 hour 17 minutes (18:43:37 to 20:00)']]],
  ['TESTING FEEDBACK', [['ISSUES CAUGHT', 'About 18 issues, by the headless suites, the bot playthroughs and the browser checks'], ['CRITICAL', '6 would have broken the game: enemy types overwritten by same-named projectiles, enemies never attacking (a stun timer started undefined), an endless reload loop, an unreachable gunship, a boss part hidden behind its own hull, and continues that replayed the same lost fight forever'],
    ['MOST HELPFUL', 'The headless bot playthrough of every operation, reporting damage taken by source'], ['LEAST HELPFUL', 'Screenshots of static menus: they found nothing a script had not']]],
  ['ENGINE FEEDBACK', [['LIKED MOST', 'Mode 7 with project and toFloor: the same math draws the world and hit-tests the shots'], ['STUCK OR GUESSED', 'Rig heights in world units are not written down: I measured them in a browser. E.store forgot everything where storage is blocked'],
    ['BUILT MYSELF', 'The light-gun loop: screen-space hit shapes, the rail camera with holds, telegraphs and the bot'], ['HARDEST', 'Mode 7 draws as an overlay, so the engine\'s lights and particles do not apply: FX and the night mask are my own'],
    ['CHANGED', 'A function voice for Dialog, a settings-rows screen and hidden groups for Shell, PlayStation glyphs by default, E.store keeping the visit\'s data, stereo pan for sounds'], ['ONE WISH', 'A first-person gallery mode for Mode 7 that keeps lighting, particles and hit picking']]],
  ['PROMPT FEEDBACK', [['LIKED MOST', 'A clear deliverable and a concrete plan to follow'], ['CONFUSING', 'The plan\'s file names (max effort, 17:47) differ from the task\'s'],
    ['HARDEST', 'Content volume: six operations and six bosses in one session'], ['WOULD CHANGE', 'Let the plan carry the exact deliverable names, or say they come from the task']]],
  ['CREDITS', [['GAME', 'OPERATION BIG BAD WOLF, an original game inspired by Operation Wolf (Taito, 1987). Not affiliated with or endorsed by Taito.'], ['ENGINE', 'my-3D2dge (MIT), michaelcrosato'], ['ONLINE', 'AI Hub session client, michaelcrosato'],
    ['BUILT BY', 'Anthropic claude-opus-5-5 in Claude Code'], ['THANKS', 'Every wolf who brought them home']]]
];
UI.aboutPage = (g, i) => {
  const [title, rows] = WP.ABOUT[i];
  E.ui.box(g, 20, 14, WP.W - 40, WP.H - 40, { bg: ['#1c2414', '#10140c'], alpha: .95 });
  txt(g, title, WP.W / 2, 22, '#e0b040', { align: 'center', scale: 2 });
  let y = 44;
  for (const [k, v] of rows) { txt(g, k, 32, y, '#c8b070'); const lines = F.wrap(v, WP.W - 180); lines.forEach((l, j) => txt(g, l, 150, y + j * 9, '#f2ead3')); y += Math.max(1, lines.length) * 9 + 5; }
  txt(g, (i + 1) + ' / ' + WP.ABOUT.length, WP.W / 2, WP.H - 36, '#8a8a7a', { align: 'center' });
};
})();
