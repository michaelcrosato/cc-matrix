// The title (stadium at sunset beside the floodlit ski jump, the cauldron, the eight stars warming up), the touch-only
// notice, the main menu and the attract mode's director (10 s idle on the title or a menu: a looping AI demo).
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art;

// a lineup of the eight stars, used by the title and the menu vignettes
let lineup = null;
const getLineup = () => lineup || (lineup = O.NATIONS.map((n, i) => ({ n, rig: O.makeRig(n, 'ceremony'), ph: i * .7 })));
const yikesy = Art.makeYikesy(9);
O.drawLineup = (r, x0, y, o = {}) => {
  const L = getLineup(), t = game.real;
  L.forEach((m, i) => {
    const x = x0 + i * (o.gap || 26), kind = (i + Math.floor(t / 4)) % 4;
    const st = { x, y, z: 0, facing: o.facing === undefined ? Math.PI / 2 : o.facing, vx: 0, vy: 0 };
    if (kind === 0) st.run = .55; else if (kind === 1) st.pose = 'cheer'; else if (kind === 2) st.pose = 'wave'; else st.pose = 'hips';
    if (o.pose) { st.pose = o.pose; st.run = 0; }
    m.rig.update(1 / 60, st);
    r.shadow(x, y, 6, .45); r.actor(x, y, 0, (g, ox, oy) => m.rig.draw(g, ox, oy, r.view));
  });
};

// the title backdrop: sunset stadium on the left, floodlit ski jump on the right, the cauldron in the middle
O.drawTitleBack = (g, W, H, t) => {
  Art.sky(g, W + 2, H * .62, ['#1a1446', '#5a2a6a', '#e0605a', '#ffb060']);
  // the winter half: night blue gradient on the right
  px.blend(g, .55, 'multiply', () => { for (let i = 0; i < 20; i++) px.rect(g, Math.round(W * .5 + i * W * .025), 0, Math.ceil(W * .025) + 1, H * .62, E.mix('#ffffff', '#2a3a8a', i / 19)); });
  for (let i = 0; i < 40; i++) px.dot(g, Math.round(W * .55 + (i * 73) % (W * .45)), (i * 31) % Math.round(H * .4), i % 4 ? '#c8d0ff' : '#ffffff');
  // the sun
  px.disc(g, Math.round(W * .22), Math.round(H * .5), 26, '#ffd27a'); px.disc(g, Math.round(W * .22), Math.round(H * .5), 20, '#fff0b8');
  // the ski jump on the right
  const sx = W * .7, sy = H * .62;
  px.poly(g, [[sx - 60, sy], [sx + 40, sy - 120], [sx + 52, sy - 120], [sx - 30, sy]], '#d8e4f4'); px.poly(g, [[sx + 40, sy - 120], [sx + 52, sy - 120], [sx + 52, sy - 140], [sx + 40, sy - 140]], '#8a94b8');
  px.poly(g, [[sx - 30, sy], [sx + W * .35, sy - 10], [sx + W * .35, sy]], '#c8d4ec');
  for (let k = 0; k < 7; k++) { const lx = sx - 50 + k * 14, ly = sy - 10 - k * 15; px.rect(g, lx, ly, 1, 14, '#5a6080'); r0glow(g, lx, ly, 10); }
  // mountains behind
  px.poly(g, [[W * .45, H * .62], [W * .62, H * .3], [W * .78, H * .62]], '#3a4a8a'); px.poly(g, [[W * .62, H * .3], [W * .66, H * .38], [W * .6, H * .37]], '#ffffff');
  px.poly(g, [[W * .75, H * .62], [W * .92, H * .26], [W * 1.1, H * .62]], '#2a3a7a'); px.poly(g, [[W * .92, H * .26], [W * .96, H * .35], [W * .89, H * .34]], '#ffffff');
  // the stadium on the left: a curved bowl with lights and the crowd
  px.poly(g, [[-4, H * .4], [W * .46, H * .46], [W * .46, H * .62], [-4, H * .62]], '#3a2a5a');
  Art.crowd(g, 0, Math.round(H * .43), Math.round(W * .45), Math.round(H * .17), { seed: 5, level: .6, bg: '#2a2048', dark: true });
  for (let k = 0; k < 4; k++) { const lx = Math.round(W * .04 + k * W * .12); px.rect(g, lx, Math.round(H * .26), 2, Math.round(H * .15), '#6a6e88'); px.rect(g, lx - 6, Math.round(H * .24), 14, 6, '#3a3f5a'); r0glow(g, lx + 1, Math.round(H * .26), 16); }
  // the ground
  px.rect(g, 0, Math.round(H * .62), W + 2, H, '#2a6a3a'); px.rect(g, Math.round(W * .5), Math.round(H * .62), W, H, '#d8e4f4');
  for (let i = 0; i < 12; i++) px.rect(g, 0, Math.round(H * .62 + i * 6), Math.round(W * .5), 1, i % 2 ? '#2f7a40' : '#245a32');
  // the cauldron
  const cx = Math.round(W * .5), cy = Math.round(H * .58);
  px.poly(g, [[cx - 14, cy - 30], [cx + 14, cy - 30], [cx + 6, cy], [cx - 6, cy]], '#c8901a'); px.rect(g, cx - 3, cy, 6, Math.round(H * .1), '#8a6a2a'); px.rect(g, cx - 16, cy - 33, 32, 4, '#f2c94c');
  for (let i = 0; i < 6; i++) { const f = Math.sin(t * 9 + i) * 3, fx = cx - 10 + i * 4; px.poly(g, [[fx - 4, cy - 32], [fx + 4, cy - 32], [fx + f, cy - 50 - (i % 3) * 6]], i % 2 ? '#ff7a1a' : '#ffb020'); }
  r0glow(g, cx, cy - 40, 40);
  function r0glow(gg, x, y, rad) { const rr = game.r; if (rr && rr.glowDisc) rr.glowDisc(gg, x, y, rad, '#ffd27a', .5); }
};
O.drawLogo = (g, W, y, t) => {
  const bob = game.settings.motion ? 0 : Math.round(Math.sin(t * 2) * 2);
  Art.emblem(g, W / 2 - E.font.width(O.TITLE, { scale: 5 }) / 2 - 26, y + 18 + bob, 18, t);
  E.font.title(g, O.TITLE, Math.round(W / 2) + 10, y + bob, { scale: 5, colors: ['#fff6c8', '#ffd36a', '#ff9a2a', '#e0461a'], outline: '#3a0a10', depth: 3, depthColor: '#7a1a1a', align: 'center' });
  E.font.text(g, O.TAGLINE.toUpperCase(), Math.round(W / 2 - E.font.width(O.TAGLINE.toUpperCase(), { scale: 2 }) / 2) + 10, y + 46 + bob, '#ffffff', { scale: 2, shadow: '#3a0a10', outline: false });
};

// ---------------------------------------------------------------------------------------------------------------
// title
// ---------------------------------------------------------------------------------------------------------------
O.scene('title', {
  menu: true, view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .4,
  enter() { O.meet = null; O.Music.play('title'); game.lights.enabled = false; game.weather = null; O.CrowdAudio.set(true); O.Crowd.set(.5); this.t = 0; this.settingsRect = null; O.Comms.reset(); },
  update(dt, rdt) {
    this.t += rdt;
    game.focus(100, 40, 20);
    if (O.touchOnly) {
      const c = UI.clicked(); if (c && this.settingsRect && UI.hit(c, ...this.settingsRect)) game.menu('settings');
      return;
    }
    const c = UI.clicked();
    if (c && this.settingsRect && UI.hit(c, ...this.settingsRect)) { game.menu('settings'); return; }
    if (game.players.some(p => p.pressed('confirm') || p.pressed('start') || p.pressed('action')) || c) { UI.sfx('confirm'); O.go('menu'); }
  },
  draw(r) {
    const g = r.ctx, W = r.W, H = r.H, t = game.real;
    O.drawTitleBack(g, W, H, t);
    O.drawLineup(r, 100 - 3.5 * 26, 78, { gap: 26 });
    Art.drawYikesy(r, yikesy, 100 + 4.6 * 26, 70, 0);
    yikesy.update(1 / 60, { squash: Math.sin(t * 6) * .15, look: [Math.sin(t), .3], walk: 0 });
    r.overlay(g2 => {
      O.drawLogo(g2, W, 26, t);
      if (O.touchOnly) {
        const w = 280, x = Math.round(W / 2 - w / 2), y = Math.round(H * .56);
        UI.panel(g2, x, y, w, 70, { trim: '#ff6b6b' });
        UI.text(g2, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2 - UI.tw('CONTROLLER OR KEYBOARD REQUIRED', 1) / 2, y + 8, '#ff9a9a');
        UI.text(g2, 'Connect a controller or keyboard to play.', W / 2 - UI.tw('Connect a controller or keyboard to play.', 1) / 2, y + 22, '#ffffff');
        const bw = 120, bx = Math.round(W / 2 - bw / 2), by = y + 38; this.settingsRect = [bx, by, bw, 24];
        px.rect(g2, bx, by, bw, 24, '#f2b632'); px.rect(g2, bx, by + 22, bw, 2, '#a8701a'); UI.text(g2, 'SETTINGS', bx + bw / 2 - UI.tw('SETTINGS', 2) / 2, by + 5, '#1a1206', { scale: 2, shadow: false });
      } else {
        const on = Math.floor(t * 2) % 2 === 0 || game.settings.motion;
        if (on) { const w = O.Prompt.iconW(game.input, 'confirm', 2) + UI.tw('PRESS', 2) + UI.tw('TO START', 2) + 16; let x = Math.round(W / 2 - w / 2); const y = Math.round(H * .66); UI.text(g2, 'PRESS', x, y + 3, '#ffffff', { scale: 2 }); x += UI.tw('PRESS', 2) + 6; x += O.Prompt.icon(g2, x, y, 'confirm', { size: 2 }) + 6; UI.text(g2, 'TO START', x, y + 3, '#ffffff', { scale: 2 }); }
        this.settingsRect = null;
      }
      UI.text(g2, '© THE GAMES OF MOUNT GLORY & SUNNY BAY', 10, H - 12, '#c8ccec', { font: 'tiny' });
      UI.text(g2, 'v' + O.VERSION + ' · ENGINE ' + E.versionLabel(), W - 10 - E.font.width('v' + O.VERSION + ' · ENGINE ' + E.versionLabel(), { font: 'tiny' }), H - 10, '#8a90b8', { font: 'tiny' });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// the main menu
// ---------------------------------------------------------------------------------------------------------------
const MENU_DESC = {
  continue: 'Pick up The Games where you left off.',
  games: 'The full fortnight: 12 events, ceremonies, a rival, glory. Or Quick Games: 4 events.',
  single: 'Any one of the twelve events, against the world or in practice.',
  records: 'World records, laurels and the medal cabinet.',
  howto: 'The basics and every event card.',
  settings: 'Sound, display, controls, difficulty and assists.',
  about: 'Source information, feedback and credits.'
};
O.scene('menu', {
  menu: true, view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .25,
  enter() {
    O.meet = null; if (O.Music.current !== 'menu') O.Music.play('menu'); game.lights.enabled = false;
    const save = O.store.get('games', null);
    const items = [
      { id: 'continue', label: 'CONTINUE GAMES', hidden: !save, disabled: !save, right: save ? 'DAY ' + (save.day + 1) : '', onPick: () => O.flow.continueGames() },
      { id: 'games', label: 'THE GAMES', onPick: () => O.go('gamesSetup') },
      { id: 'single', label: 'SINGLE EVENT', onPick: () => O.go('single') },
      { id: 'records', label: 'RECORDS', onPick: () => O.go('records') },
      { id: 'howto', label: 'HOW TO PLAY', onPick: () => O.go('howto') },
      { id: 'settings', label: 'SETTINGS', onPick: () => game.menu('settings') },
      { id: 'about', label: 'ABOUT & CREDITS', onPick: () => O.go('about') }
    ];
    this.list = new UI.List(items, { x: 16, y: 44, w: 190, row: 23, scale: 2, onCancel: () => O.go('title') });
    if (O.menuFocus) { const k = items.findIndex(i => i.id === O.menuFocus); if (k >= 0 && !items[k].disabled) this.list.i = k; }
    this.pic = 0;
  },
  update(dt, rdt) { game.focus(260, 60, 20); this.list.update(); O.menuFocus = this.list.item && this.list.item.id; this.pic += rdt; },
  draw(r) {
    const W = r.W, H = r.H, g = r.ctx, t = game.real;
    UI.backdrop(g, r.bw, r.bh, '#1a1650', '#07081a');
    const it = this.list.item || {};
    r.overlay(g2 => {
      UI.screenTitle(g2, W, O.TITLE, { right: 'MAIN MENU' });
      this.list.draw(g2);
      // the vignette for the focused item
      const vx = 220, vy = 40, vw = W - vx - 14, vh = H - 100;
      UI.panel(g2, vx, vy, vw, vh, { alpha: .6 });
      vignette(g2, it.id, vx, vy, vw, vh, t);
      const d = MENU_DESC[it.id] || '';
      UI.text(g2, d, 16, H - 52, '#e6e9ff', { scale: 1 });
      O.Prompt.strip(g2, [['confirm', 'SELECT'], ['cancel', 'BACK']], W / 2, H - 24);
    });
  }
});
function vignette(g, id, x, y, w, h, t) {
  const cx = x + w / 2, cy = y + h / 2;
  if (id === 'games' || id === 'continue') {
    O.Art.emblem(g, cx, cy - 18, 30, t);
    const ids = O.EVENT_ORDER; ids.forEach((e, i) => { const a = i / 12 * Math.PI * 2 + t * .3; O.Art.picto(g, e, cx + Math.cos(a) * (w * .36) - 10, cy - 18 + Math.sin(a) * (h * .32) - 10, 20); });
    UI.text(g, id === 'continue' ? 'THE GAMES CONTINUE' : '12 EVENTS · 8 NATIONS · 1 RIVAL', cx - UI.tw(id === 'continue' ? 'THE GAMES CONTINUE' : '12 EVENTS · 8 NATIONS · 1 RIVAL', 1) / 2, y + h - 22, '#f2b632');
  } else if (id === 'single') {
    const ids = O.EVENT_ORDER; ids.forEach((e, i) => { const c = i % 4, rr = Math.floor(i / 4), s = 28, gx = cx - 2 * (s + 6) + c * (s + 6), gy = y + 18 + rr * (s + 8); O.Art.picto(g, e, gx, gy + Math.round(Math.sin(t * 3 + i) * 2), s); });
    UI.text(g, 'PICK ANY EVENT', cx - UI.tw('PICK ANY EVENT', 1) / 2, y + h - 22, '#f2b632');
  } else if (id === 'records') {
    for (let i = 0; i < 3; i++) O.Art.medal(g, cx - 40 + i * 40, cy + 10 - (i === 1 ? 16 : 0), 'gsb'[[1, 0, 2][i]], 22);
    O.Art.laurel(g, cx - 26, y + 14, 52, true);
    UI.text(g, 'WORLD RECORDS', cx - UI.tw('WORLD RECORDS', 1) / 2, y + h - 22, '#f2b632');
  } else if (id === 'howto') {
    O.Prompt.pair(g, cx - 40, cy - 20, 'mashL', 'mashR', { size: 2, rate: 6 });
    O.Prompt.draw(g, cx - 40, cy + 6, 'action', { size: 2, label: 'TIME IT' });
    UI.text(g, 'MASH · TIME · AIM · STEER', cx - UI.tw('MASH · TIME · AIM · STEER', 1) / 2, y + h - 22, '#f2b632');
  } else if (id === 'settings') {
    for (let i = 0; i < 4; i++) { UI.bar(g, cx - 60, y + 24 + i * 22, 120, 8, .3 + .5 * (.5 + .5 * Math.sin(t + i)), ['#f2b632', '#4fe0a8', '#7fb2ff', '#ff8fd8'][i]); }
    UI.text(g, 'MAKE IT YOURS', cx - UI.tw('MAKE IT YOURS', 1) / 2, y + h - 22, '#f2b632');
  } else if (id === 'about') {
    O.Art.emblem(g, cx, cy - 10, 26, t);
    UI.text(g, 'MADE IN CODE, EVERY PIXEL', cx - UI.tw('MADE IN CODE, EVERY PIXEL', 1) / 2, y + h - 22, '#f2b632');
  }
}

// ---------------------------------------------------------------------------------------------------------------
// the attract mode: LOGO → EVENT → RECORDS → EVENT → MEDAL TABLE → EVENT → TIP → EVENT → loop
// ---------------------------------------------------------------------------------------------------------------
const ATTRACT_EVENTS = ['sprint', 'skijump', 'diving', 'downhill', 'curling', 'figure', 'hockey', 'javelin', 'swim', 'archery', 'weights', 'bobsled'];
const TIPS = ['MASH: ALTERNATE THE TWO BUTTONS. FASTER IS FASTER.', 'A FULL HYPE FLAME MEANS YIKES TURBO. USE IT!', 'A WIPEOUT GIVES SYMPATHY HYPE. COMEBACKS HAPPEN.', 'HOLD BREATH IN ARCHERY TO STEADY THE SIGHT.', 'TELEMARK YOUR SKI JUMP LANDING FOR STYLE POINTS.', 'SWEEP HARD IN CURLING TO CARRY A STONE FURTHER.'];
O.Attract = {
  on: false, idx: 0, evIdx: 0, segT: 0, item: null, loops: 0, seen: {},
  playlist() { return ['logo', 'event', 'records', 'event', 'medals', 'event', 'tip', 'event']; },
  begin(from) { if (O.inHub) return; this.on = true; this.idx = 0; this.from = from; this.loops = 0; this.seen = {}; this.writes0 = O.store.writes; this.play(); },
  play() {
    if (!this.on) return;
    const pl = this.playlist(); this.item = pl[this.idx % pl.length]; this.segT = 0;
    if (this.item === 'event') {
      const id = ATTRACT_EVENTS[this.evIdx % ATTRACT_EVENTS.length]; this.evIdx++; this.seen[id] = 1;
      O.meet = O.flow.newMeet({ mode: 'attract', events: [id], players: [], seed: 1000 + this.evIdx * 31 });
      O.meet.featured = 0;
      game.go('ev:' + id, {}, { fade: 'dissolve', seconds: .3 });
    } else { this.seen[this.item] = 1; game.go('attract', { item: this.item }, { fade: 'dissolve', seconds: .3 }); }
  },
  segmentOver(ctx) { const def = ctx.def; this.segT += O.rdt || 1 / 120; return this.segT > ((def.attract && def.attract.seconds) || 18); },
  segmentDone() { if (this.on) this.next(); },
  next() { if (!this.on) return; this.idx++; if (this.idx % this.playlist().length === 0) this.loops++; this.play(); },
  exitOn() { if (!this.on) return; this.on = false; this.exitPending = true; },
  stop() { this.on = false; this.returning = .01; O.meet = null; game.timeScale = 1; game.go('title', {}, { fade: 'dissolve', seconds: .25 }); }
};
// any input during the attract mode returns to the title (the press is consumed)
O.updaters.push(rdt => {
  const At = O.Attract;
  if (At.returning) { if (game.sceneName === 'title') At.returning = 0; else if ((At.returning += rdt) > .7) { At.returning = .01; game.go('title', {}, { fade: 0 }); } }
  if (!O.Attract.on && !O.Attract.exitPending) return;
  if (O.Attract.exitPending) { O.Attract.exitPending = false; for (const p of game.players) p.consumeAll(); if (O.Attract.on || game.sceneName !== 'title') { O.Attract.on = false; O.Attract.stop(); } }
});
// any input (seen every step, fades included) leaves the attract mode
E.HOOKS.input.push(gm => { if (O.Attract.on && gm.players.some(p => p.anyPressed() || Math.hypot(...p.move()) > .3 || (p.clicked && p.clicked()))) { O.Attract.exitPending = true; if (gm._fade && gm._fade.out) { O.Attract.on = false; O.Attract.stop(); } } });
O.scene('attract', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: 0,
  enter(d) { this.item = d.item; this.t = 0; this.tip = TIPS[(O.Attract.loops + O.Attract.idx) % TIPS.length]; if (this.item === 'logo') O.Music.play('title'); },
  update(dt, rdt) { this.t += rdt; game.focus(100, 40, 20); const dur = { logo: 4, records: 6, medals: 6, tip: 5 }[this.item] || 5; if (this.t > dur && O.Attract.on) O.Attract.next(); },
  draw(r) {
    const g = r.ctx, W = r.W, H = r.H, t = game.real;
    if (this.item === 'logo') { O.drawTitleBack(g, W, H, t); O.drawLineup(r, 100 - 3.5 * 26, 78, { gap: 26 }); r.overlay(g2 => O.drawLogo(g2, W, 40, t)); return; }
    UI.backdrop(g, r.bw, r.bh, '#1a1650', '#07081a');
    r.overlay(g2 => {
      if (this.item === 'records') {
        const ids = O.EVENT_ORDER, id = ids[(O.Attract.loops * 3 + O.Attract.idx) % 12], ev = O.EVENTS[id];
        UI.screenTitle(g2, W, 'WORLD RECORDS', { right: ev ? ev.name : '' });
        if (ev) O.drawRecordTable(g2, id, W / 2 - 160, 40, 320);
      } else if (this.item === 'medals') {
        UI.screenTitle(g2, W, 'ALL-TIME MEDAL CABINET');
        const c = O.Records.cabinet(), med = {}; for (const n of O.NATION_IDS) { med[n] = { g: 0, s: 0, b: 0 }; for (const e in c[n] || {}) med[n][c[n][e]]++; }
        const seeded = Object.values(med).every(m => !m.g && !m.s && !m.b);
        if (seeded) O.NATION_IDS.forEach((n, i) => med[n] = { g: [5, 3, 4, 1, 2, 2, 1, 0][i], s: [2, 4, 3, 2, 1, 3, 2, 1][i], b: [1, 2, 2, 3, 4, 1, 3, 2][i] });
        O.drawMedalTable(g2, med, W / 2 - 150, 40, 300, null);
      } else {
        UI.screenTitle(g2, W, 'TIP');
        O.Art.emblem(g2, W / 2, H * .38, 30, t);
        const lines = UI.wrap(this.tip, W - 60, 2); lines.forEach((l, i) => UI.text(g2, l, W / 2 - UI.tw(l, 2) / 2, H * .56 + i * 20, '#ffffff', { scale: 2 }));
      }
    });
  }
});
// the attract overlay: DEMO badge, small logo, PRESS ANY BUTTON
O.overlays.push((r, g) => {
  if (!O.Attract.on) return;
  const W = r.W, H = r.H, t = game.real;
  px.rect(g, W - 64, 10, 52, 16, '#e23b2e'); UI.text(g, 'DEMO', W - 50, 14, '#ffffff');
  if (Math.floor(t * 1.6) % 2 === 0) { const s = O.touchOnly ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON'; UI.text(g, s, W / 2 - UI.tw(s, 2) / 2, H - 60, '#ffe066', { scale: 2 }); }
  E.font.title(g, O.TITLE, W - 70, H - 26, { scale: 2, colors: ['#fff6c8', '#ffd36a', '#e0461a'], outline: '#3a0a10', depth: 1, align: 'center' });
});
})();
