/* ---- Scenes: title, setup, event, results, ending, help, about ---- */
G.scenes = {};
const sceneBase = o => Object.assign({ pausable: false, view: 'side', input: G.INPUT, res: 'ps1', expand: true }, o);
G.touchOnly = false;
/* a shared diorama backdrop: sky of the season, hills, ground */
G.drawSky = (g, W, H, season, t, horizon) => {
  const P = G.SEASON_PAL[season]; for (let i = 0; i < 8; i++) px.rect(g, 0, Math.round(i * horizon / 8), W, Math.ceil(horizon / 8) + 1, G.lerpCol(P.sky[0], P.sky[1], i / 7));
  for (let i = 0; i < 6; i++) px.ell(g, i * W / 5 + Math.sin(t * .05 + i) * 4, horizon + 4, 70, 24 + (i % 3) * 8, G.lerpCol(P.forest, '#101020', .3 + (i % 2) * .15));
  px.rect(g, 0, horizon, W, H - horizon, G.lerpCol(P.plain[0], '#101828', .35));
  for (let i = 0; i < 40; i++) px.rect(g, Math.round(G.hash2(i, 3) * W), Math.round(horizon + 4 + G.hash2(i, 5) * (H - horizon)), 2, 1, G.lerpCol(P.plain[1], '#ffffff', .2));
};
G.drawClockTower = (g, cx, base, h, t, glow) => {
  const tn = G.tone('#b8b0c8'); px.ell(g, cx, base, 34, 8, '#00000055'); px.rect(g, cx - 14, base - h, 28, h, tn.base); px.rect(g, cx - 14, base - h, 4, h, tn.lt); px.rect(g, cx + 10, base - h, 4, h, tn.sh);
  px.poly(g, [[cx - 18, base - h], [cx, base - h - 22], [cx + 18, base - h]], '#5a3a78'); px.poly(g, [[cx - 14, base - h], [cx, base - h - 16], [cx + 14, base - h]], '#7a4a98');
  const fy = base - h + 22; px.disc(g, cx, fy, 11, '#c8a860'); px.disc(g, cx, fy, 9, '#f4ecd0'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; px.dot(g, Math.round(cx + Math.cos(a) * 7.5), Math.round(fy + Math.sin(a) * 7.5), '#3a2a40'); }
  const a1 = t * .6, a2 = t * .05; px.line(g, cx, fy, cx + Math.cos(a1) * 8, fy + Math.sin(a1) * 8, '#2a1a30', 1); px.line(g, cx, fy, cx + Math.cos(a2) * 5, fy + Math.sin(a2) * 5, '#2a1a30', 1);
  px.rect(g, cx - 3, base - 10, 6, 10, '#2a1a30'); px.rect(g, cx + 14, base - h + 6, 1, h, '#00000033');
  if (glow) px.ddisc(g, cx, fy, 26, '#ffe8a0', .18);
};

/* ---------------- TITLE ---------------- */
G.TitleScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.t = 0; this.rigs = []; this.mi = 0; }
  enter() {
    this.t = 0; G.music('title'); G.motesInit(50); G.activity(); this.items = null;
    if (!this.rigs.length) this.rigs = ['elaine', 'gawain', 'ragnell', 'nimue'].map((id, i) => ({ id, rig: new E.Humanoid(G.knightLook(id, G.KNIGHTS[id].line, 1, i, 1.05)) }));
    this.buildMenu(); G.run = null;
  }
  buildMenu() {
    let hasSave = false; try { hasSave = !!G.game.saves.latest(); } catch (e) { }
    const items = [{ label: 'New Campaign', id: 'new' }, { label: 'Continue', id: 'cont', disabled: !hasSave }, { label: 'Skirmish', id: 'skirm' }, { label: 'Training Field', id: 'train' }, { label: 'How to Play', id: 'help' }, { label: 'Settings', id: 'set' }, { label: 'Gallery', id: 'gallery' }, { label: 'About & Credits', id: 'about' }];
    this.list = new UI.List(items, { rows: 8 }); this.list.id = 'title';
  }
  update(dt) {
    this.t += dt; UI.pump(); G.fxUpdate(dt); if (G.deepLink) { const f = G.deepLink; G.deepLink = null; f(); return; }
    this.rigs.forEach((h, i) => { const u = (this.t * .4 + i * .9) % 4; h.rig.update(dt, { x: i * 40, y: 0, z: 0, vx: 0, vy: 0, facing: i < 2 ? 0 : Math.PI, pose: u < .6 ? 'cheer' : undefined }); });
    if (G.touchOnly) { if (UI.click && this.setBtn && UI.clickIn(...this.setBtn)) G.game.menu('settings'); }
    else {
      const r = this.list.update();
      if (r && r.pick != null) this.pick(this.list.items[r.pick].id);
    }
    if (G.idle() >= 10) G.game.go('attract');
  }
  pick(id) {
    const gm = G.game;
    if (id === 'new') gm.go('setup'); else if (id === 'cont') gm.saves.show('load'); else if (id === 'skirm') gm.go('skirmishSetup');
    else if (id === 'train') G.startTraining(); else if (id === 'help') gm.go('help', { back: 'title' }); else if (id === 'set') gm.menu('settings'); else if (id === 'gallery') gm.go('gallery'); else if (id === 'about') gm.go('about', { back: 'title' });
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); const season = Math.floor(t / 7) % 4, hor = Math.round(H * .56);
      G.drawSky(g, W, H, season, t, hor);
      G.drawClockTower(g, Math.round(W / 2), hor + 24, 74, t, true);
      G.drawMotes(g, W, H, season, t);
      // the four knights on the lawn, monsters at their feet
      const xs = [W * .14, W * .30, W * .70, W * .86];
      this.rigs.forEach((h, i) => { const x = Math.round(xs[i]), y = hor + 44 + (i % 2) * 8; px.ell(g, x, y, 10, 4, '#00000055'); h.rig.draw(g, x, y, G.game.view); const mon = G.all('monster').filter(m => m.el === i)[0]; G.drawMon(g, mon, 1, x + (i < 2 ? 18 : -18), y + 4, { t, dir: i < 2 ? 1 : -1, scale: .9 }); });
      E.font.title(g, 'BRIGANTIME', W / 2, 14, { scale: 3, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a' });
      G.T(g, 'The Legend of Forseasons', W / 2 - G.TW('The Legend of Forseasons', { scale: 1 }) / 2, 52, '#f4eed8');
      for (let i = 0; i < 4; i++) px.disc(g, Math.round(W / 2 - 15 + i * 10), 66, 3, i === season ? G.SEASON_COL[i] : G.lerpCol(G.SEASON_COL[i], '#000000', .6));
      if (G.touchOnly) {
        const w = 200, x = (W - w) / 2, y = Math.round(H * .56) - 10; G.box(g, x, y, w, 52); G.T(g, 'Controller or keyboard required', W / 2 - G.TW('Controller or keyboard required') / 2, y + 8, '#ffe8a0'); G.T(g, 'This game has no touch controls.', W / 2 - G.TW('This game has no touch controls.') / 2, y + 20, '#d8d0f0');
        this.setBtn = [x + w / 2 - 28, y + 33, 56, 13]; px.rect(g, ...this.setBtn, '#4a3a7a'); px.rect(g, this.setBtn[0], this.setBtn[1], this.setBtn[2], 1, '#8a78c8'); G.T(g, 'Settings', W / 2 - G.TW('Settings') / 2, y + 36, '#fff8d8');
      } else {
        const mw = 110, mx = Math.round((W - mw) / 2), my = Math.round(H * .56) - 16; G.box(g, mx - 6, my - 6, mw + 12, 8 * 12 + 12, { alpha: .88 }); this.list.draw(g, mx, my, mw);
        UI.prompts(g, W, H, [['confirm', 'Select'], ['dpad', 'Move'], ['help', 'Help']]);
      }
      G.T(g, 'v' + G.VERSION + ' - a demo', W - 8 - G.TW('v' + G.VERSION + ' - a demo'), H - 24, '#8a82a8', { font: 'tiny' });
      UI.drawToasts(g, W, H, 1 / 60);
    });
  }
};

/* ---------------- SETUP ---------------- */
G.SetupScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.sel = 0; this.diff = 1; this.row = 0; this.t = 0; this.hum = 1; }
  enter() { this.t = 0; this.rigs = this.rigs || [0, 1, 2, 3].map(i => new E.Humanoid(G.knightLook(G.RULERS[i], G.KNIGHTS[G.RULERS[i]].line, 1, i, 1.3))); G.music('title'); G.activity(); }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input, nav = UI.nav();
    this.rigs.forEach((r_, i) => r_.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, pose: i === this.sel ? 'cheer' : undefined }));
    if (nav.y) { this.row = G.clamp(this.row + nav.y, 0, 3); G.sfx('cursor'); }
    if (nav.x) { if (this.row === 0) { this.sel = (this.sel + nav.x + 4) % 4; } else if (this.row === 1) this.diff = (this.diff + nav.x + 3) % 3; else if (this.row === 2) this.hum = G.clamp(this.hum + nav.x, 1, 4); G.sfx('cursor'); }
    if (UI.mouse && UI.moved && UI.ptr) { const h = UI.hit('card'); if (h) { this.sel = h.i; this.row = 0; } const d = UI.hit('diff'); if (d) { this.row = 1; } }
    if (UI.click) { const h = UI.hit('card'); if (h) { this.sel = h.i; this.start(); return; } const d = UI.hit('diff'); if (d) { this.diff = d.i; this.row = 1; G.sfx('select'); } const hh = UI.hit('hum'); if (hh) { this.hum = hh.i + 1; this.row = 2; G.sfx('select'); } const s = UI.hit('start'); if (s) this.start(); }
    if (I.pressed('confirm')) { if (this.row === 3 || this.row === 0) this.start(); else { this.row = 3; G.sfx('select'); } }
    if (I.pressed('cancel')) { G.sfx('back'); G.game.go('title'); }
  }
  start() { G.sfx('fanfare', { vol: .6 }); G.startCampaign(this.sel, ['Easy', 'Normal', 'Hard'][this.diff], (Date.now() % 100000) + 1, Array.from({ length: this.hum }, (_, i) => (this.sel + i) % 4)); G.clearRigs(); G.game.go('event', { id: 'prologue', back: 'campaign', fresh: true }); }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); px.rect(g, 0, 0, W, H, '#120c1e'); G.drawWorldBackdrop(g, W, H, this.sel, t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .55);
      G.T(g, 'Choose your realm', W / 2 - G.TW('Choose your realm') / 2, 6, '#ffe8a0');
      const cw = Math.min(96, Math.floor((W - 30) / 4)), gap = 6, total = cw * 4 + gap * 3, x0 = Math.round((W - total) / 2);
      for (let i = 0; i < 4; i++) {
        const x = x0 + i * (cw + gap), y = 18, h = 116, rm = G.REALMS[i], sel = i === this.sel; UI.add('card', i, x, y, cw, h);
        G.box(g, x, y - (sel ? 3 : 0), cw, h, { border: sel ? '#fff0a0' : G.lerpCol(rm.col, '#000000', .3), bg: [G.lerpCol(rm.dark, '#000000', .2), '#0a0618'] });
        const yy = y - (sel ? 3 : 0); px.rect(g, x + 4, yy + 4, cw - 8, 3, rm.col);
        this.rigs[i].drawPortrait(g, x + Math.round((cw - 48) / 2), yy + 10, 48, { zoom: 3, turn: .3, bg: G.lerpCol(rm.dark, '#000000', .4), frame: true });
        G.T(g, rm.name, x + cw / 2 - G.TW(rm.name) / 2, yy + 62, rm.col); G.T(g, G.SEASONS[i], x + cw / 2 - G.TW(G.SEASONS[i]) / 2, yy + 72, G.SEASON_COL[i]);
        const rk = G.KNIGHTS[rm.ruler]; G.T(g, rk.short, x + cw / 2 - G.TW(rk.short) / 2, yy + 82, '#f4eed8'); G.T(g, G.LINES[rk.line].names[1], x + cw / 2 - G.TW(G.LINES[rk.line].names[1]) / 2, yy + 91, '#a8a0c8');
      }
      const rm = G.REALMS[this.sel]; UI.text(g, '"' + rm.motto + '" ' + rm.blurb, 20, 140, W - 40, '#d8d0f0', 10);
      // difficulty
      const dy = 164; G.T(g, 'Difficulty', 20, dy + 2, this.row === 1 ? '#ffe8a0' : '#a8a0c8');
      ['Easy', 'Normal', 'Hard'].forEach((d, i) => { const x = 90 + i * 70; UI.add('diff', i, x, dy, 64, 12); px.rect(g, x, dy, 64, 12, i === this.diff ? (this.row === 1 ? '#6a5aa8' : '#4a3a7a') : '#1e1630'); G.T(g, d, x + 32 - G.TW(d) / 2, dy + 2, i === this.diff ? '#fff8d8' : '#8a82a8'); });
      G.T(g, ['Candle +4 seasons, more mana', 'The Brigantime as written', 'Candle -2, fiercer rivals'][this.diff], 90, dy + 14, '#a8a0c8');
      const hy = 190; G.T(g, 'Human players', 20, hy + 2, this.row === 2 ? '#ffe8a0' : '#a8a0c8'); for (let i = 0; i < 4; i++) { const x = 90 + i * 40; UI.add('hum', i, x, hy, 34, 12); px.rect(g, x, hy, 34, 12, i + 1 === this.hum ? (this.row === 2 ? '#6a5aa8' : '#4a3a7a') : '#1e1630'); G.T(g, String(i + 1), x + 17 - G.TW(String(i + 1)) / 2, hy + 2, i + 1 === this.hum ? '#fff8d8' : '#8a82a8'); } G.T(g, this.hum > 1 ? 'Hot-seat: realms ' + Array.from({ length: this.hum }, (_, i) => G.REALMS[(this.sel + i) % 4].name).join(', ') : 'Local pass-and-play when more than one', 270, hy + 2, '#a8a0c8', { font: 'tiny' });
      const bx = W / 2 - 50, by = 207; UI.add('start', 0, bx, by, 100, 12); px.rect(g, bx, by, 100, 12, this.row === 3 || this.row === 0 ? '#6a5aa8' : '#3a2e5a'); px.rect(g, bx, by, 100, 1, '#aa98e8'); G.T(g, 'Begin the Brigantime', W / 2 - G.TW('Begin the Brigantime') / 2, by + 2, '#fff8d8');
      UI.prompts(g, W, H, [['dpad', 'Choose'], ['confirm', 'Begin'], ['cancel', 'Back']]);
    });
  }
};

/* ---------------- SKIRMISH SETUP ---------------- */
G.SkirmishScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.f = { you: 0, foe: 1, map: 0, season: 4, hot: 0, sides: 2 }; this.row = 0; this.t = 0; }
  enter() { this.t = 0; G.music('title'); G.activity(); }
  rows() { const f = this.f; return [['Your realm', G.REALMS[f.you].name, G.REALMS[f.you].col], ['Foe', G.REALMS[f.foe].name, G.REALMS[f.foe].col], ['Field', G.MAP_NAMES[G.PLAIN_MAPS[f.map]], '#f4eed8'], ['Season', f.season === 4 ? 'Random' : G.SEASONS[f.season], f.season === 4 ? '#f4eed8' : G.SEASON_COL[f.season]], ['Opponent', f.hot ? 'Human (hot-seat)' : 'CPU', f.hot ? '#80f0c0' : '#f4eed8'], ['Sides', f.sides + (f.sides > 2 ? ' (free-for-all)' : ''), '#f4eed8'], ['Fight!', '', '#ffe8a0']]; }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input, nav = UI.nav(), f = this.f;
    if (nav.y) { this.row = G.clamp(this.row + nav.y, 0, 6); G.sfx('cursor'); }
    const h = UI.hit('srow'); if (UI.mouse && UI.moved && h) this.row = h.i;
    let dx = nav.x; if (UI.click && h) { this.row = h.i; if (h.i === 4) dx = 0; else dx = (UI.click[0] > (UI.lastPtr ? 213 : 213)) ? 1 : 1; }
    if (dx && this.row < 6) { G.sfx('cursor'); if (this.row === 0) f.you = (f.you + dx + 4) % 4; if (this.row === 1) f.foe = (f.foe + dx + 4) % 4; if (this.row === 2) f.map = (f.map + dx + 13) % 13; if (this.row === 3) f.season = (f.season + dx + 5) % 5; if (this.row === 4) f.hot = 1 - f.hot; if (this.row === 5) f.sides = 2 + (f.sides - 2 + dx + 3) % 3; }
    if (I.pressed('confirm') || (UI.click && h && h.i === 6)) { if (this.row === 6 || (UI.click && h && h.i === 6)) this.go(); else { G.sfx('cursor'); if (this.row === 0) f.you = (f.you + 1) % 4; if (this.row === 1) f.foe = (f.foe + 1) % 4; if (this.row === 2) f.map = (f.map + 1) % 13; if (this.row === 3) f.season = (f.season + 1) % 5; if (this.row === 4) f.hot = 1 - f.hot; if (this.row === 5) f.sides = 2 + (f.sides - 1) % 3; } }
    if (I.pressed('cancel')) { G.sfx('back'); G.game.go('title'); }
  }
  go() { const f = this.f; if (f.you === f.foe) f.foe = (f.foe + 1) % 4; const seed = (Date.now() % 90000) + 1; const spec = G.makeSkirmish(seed, { sides: f.sides, realms: [f.you, f.foe], map: G.PLAIN_MAPS[f.map], season: f.season === 4 ? seed % 4 : f.season }); spec.sides[1].human = !!f.hot && f.sides === 2; spec.sides[1].items = spec.sides[1].human ? ['potion'] : []; spec.kind = 'field'; G.sfx('fanfare', { vol: .5 }); G.game.go('battle', { spec, skirmish: true }); }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin(); px.rect(g, 0, 0, W, H, '#120c1e'); G.drawWorldBackdrop(g, W, H, this.f.season === 4 ? Math.floor(this.t / 3) % 4 : this.f.season, this.t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .5);
      G.T(g, 'Skirmish', W / 2 - G.TW('Skirmish') / 2, 8, '#ffe8a0'); G.T(g, 'Two to four sides, twelve bells. Left and right change a row.', W / 2 - G.TW('Two to four sides, twelve bells. Left and right change a row.') / 2, 22, '#a8a0c8');
      const bw = 220, bx = Math.round((W - bw) / 2); G.box(g, bx - 8, 36, bw + 16, 7 * 17 + 10);
      this.rows().forEach((rw, i) => { const y = 41 + i * 17, sel = i === this.row; UI.add('srow', i, bx, y, bw, 16); px.rect(g, bx, y, bw, 16, sel ? '#4a3a7a' : '#1a1230'); if (sel) px.rect(g, bx - 2, y + 3, 2, 10, '#f0c860'); G.T(g, rw[0], bx + 8, y + 4, sel ? '#fff8d8' : '#a8a0c8'); if (i < 6) { const tt = (sel ? '< ' : '') + rw[1] + (sel ? ' >' : ''); G.T(g, tt, bx + bw - 8 - G.TW(tt), y + 4, rw[2]); } });
      UI.prompts(g, W, H, [['dpad', 'Choose'], ['confirm', 'Change / Fight'], ['cancel', 'Back']]);
    });
  }
};
G.trainingSpec = () => {
  const mk = (id, line, lvl, realm) => ({ id, line, tier: 0, lvl, equip: {}, hp: null, ruler: false, realm });
  return { seed: 4242, map: 'meadow', season: 0, kind: 'field', bells: 12, sides: [
    { realm: 0, human: true, items: ['potion', 'potion'], troops: [{ knight: mk('percival', 0, 3, 0), mons: [{ id: 't1', species: 'wolf', form: 0, lvl: 3 }, { id: 't2', species: 'pixie', form: 0, lvl: 3 }, { id: 't3', species: 'wolf', form: 0, lvl: 2 }] }, { knight: mk('bors', 4, 3, 0), mons: [{ id: 't4', species: 'wolf', form: 0, lvl: 3 }, { id: 't5', species: 'pixie', form: 0, lvl: 2 }] }] },
    { realm: 5, human: false, items: [], troops: [{ knight: mk('wick', 1, 2, 5), mons: [{ id: 't6', species: 'bone', form: 0, lvl: 2 }, { id: 't7', species: 'bone', form: 0, lvl: 2 }, { id: 't8', species: 'raven', form: 0, lvl: 2 }] }] }] };
};
G.startTraining = () => {
  const lines = [{ who: 'narrator', name: '', text: 'The Border Road, Spring. A training field, chalked out by someone who really enjoys chalk.', voice: 1 }, { who: 'percival', name: 'Percival', text: 'The brigands hold the far end. Move, strike, and mind the Ward: my monsters fight best near me.', voice: 1 }, { who: 'bors', name: 'Bors', text: 'Weak foes can be Bound to our banner. Use the Bind command when their health is low. Twelve bells, and no more.', voice: .8 }];
  G.game.go('event', { lines, stage: 'road', next: ['battle', { spec: G.trainingSpec(), tutorial: true, skirmish: true }] });
};

/* ---------------- BATTLE SCENE ---------------- */
G.BattleScene = class {
  constructor() { Object.assign(this, sceneBase({ pausable: true })); }
  enter(d) {
    this.d = d || {}; G.clearRigs(); G.fxs = []; const spec = this.d.spec;
    this.bv = new G.BattleView(spec, { tutorial: this.d.tutorial, onOver: S => this.over(S), noInput: !!this.d.hub });
    G.music(spec.kind === 'boss' ? 'boss' : 'battle', { restart: true }); G.motesInit(30); G.activity();
    if (this.d.hub) G.hubBattle(this);
  }
  over(S) {
    const d = this.d, res = B.result(S);
    if (d.hub) { G.hubDone(this, S); return; }
    G.music(S.winner === 0 ? 'victory' : 'defeat'); G.sfx(S.winner === 0 ? 'fanfare' : 'lose');
    if (d.campaign) { const out = C.applyBattle(G.run.S, d.attack, d.spec, res, S); G.game.go('results', { out, sim: S, attack: d.attack, campaign: true }); }
    else G.game.go('results', { sim: S, skirmish: true, tutorial: d.tutorial });
  }
  update(dt) {
    UI.pump(); try { G.game.saves.canSave = false; } catch (e) { } if (G.dev.update(this)) return; if (this.d.hub && G.hubGate) G.hubGate(this);
    this.bv.update(dt);
  }
  draw(r) { r.overlay(g => { UI.begin(); this.bv.draw(g, r, r.W, r.H); G.dev.draw(g, r.W, r.H); UI.drawToasts(g, r.W, r.H, 1 / 60); UI.prompts(g, r.W, r.H, G.dev.open ? [['confirm', 'Select'], ['cancel', 'Close']] : this.bv.prompts()); if (this.d.hub && this.hubMsg) { G.box(g, r.W / 2 - 80, r.H / 2 - 12, 160, 24); G.T(g, this.hubMsg, r.W / 2 - G.TW(this.hubMsg) / 2, r.H / 2 - 4, '#ffe8a0'); } }); }
};

/* ---------------- EVENT (story) ---------------- */
const STAGES = { hall: { season: 0, floor: '#4a3a5a', wall: ['#2a2040', '#4a3a68'] }, road: { season: 2, floor: '#6a5a3a', wall: null }, clock: { season: 4, floor: '#2a2638', wall: ['#12101e', '#3a2e58'] } };
G.EventScene = class {
  constructor() { Object.assign(this, sceneBase({ pausable: true })); this.say = new UI.Say(); }
  enter(d) {
    this.d = d; const S = G.run && G.run.S; let lines, stage = d.stage;
    if (d.lines) lines = d.lines; else { const ev = G.EVENTS.find(e => e.id === d.id); lines = ev.scene(S); stage = ev.stage; if (d.id === 'prologue' && S) S.eventsDone.prologue = true; }
    this.stage = STAGES[stage] || STAGES.hall; this.lines = lines; this.say.start(lines); this.t = 0; G.music('event'); G.sfx('page');
    this.actors = []; for (const l of lines) if (l.who !== 'narrator' && !this.actors.find(a => a.id === l.who)) this.actors.push({ id: l.who, rig: new E.Humanoid(G.knightLook(l.who, (G.KNIGHTS[l.who] || { line: 0 }).line, 1, (G.KNIGHTS[l.who] || { realm: 5 }).realm, 1.2)) });
    this.actors = this.actors.slice(0, 3);
    this.back = d.back || 'title';
  }
  actorX(i, n, W) { return n === 1 ? W / 2 : n === 2 ? (i ? W * .68 : W * .32) : [W * .22, W * .5, W * .78][i]; }
  update(dt) {
    this.t += dt; UI.pump(); try { G.game.saves.canSave = false; } catch (e) { } if (G.dev.update(this)) return;
    const cur = this.say.cur(), n = this.actors.length;
    this.actors.forEach((a, i) => a.rig.update(dt, { x: i * 50, y: 0, z: 0, vx: 0, vy: 0, facing: this.actorX(i, n, 400) < 200 ? 0 : Math.PI, expr: cur && cur.who === a.id && this.say.n < this.say.full ? 'shout' : undefined, pose: cur && cur.who === a.id && this.say.n < this.say.full ? 'wave' : undefined }));
    const r = this.say.update(dt);
    if (r && r.choice && r.choice.set && G.run) Object.assign(G.run.S.flags, r.choice.set);
    if (r && r.done) this.finish();
    if (G.game.input.pressed('cancel') && !this.say.list) { /* B skips nothing: story stays whole */ }
  }
  finish() { const d = this.d; if (d.next) { G.game.go(d.next[0], d.next[1]); return; } if (d.fresh) { G.game.go('campaign'); return; } G.game.go(this.back, d.backData); }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin(); const st = this.stage, t = this.t;
      if (st.wall) { for (let i = 0; i < 8; i++) px.rect(g, 0, Math.round(i * H / 8 * .65), W, Math.ceil(H / 8) + 1, G.lerpCol(st.wall[0], st.wall[1], i / 7)); } else G.drawSky(g, W, H, st.season, t, Math.round(H * .6));
      px.rect(g, 0, Math.round(H * .58), W, H, st.floor); for (let i = 0; i < 30; i++) px.rect(g, Math.round(G.hash2(i, 1) * W), Math.round(H * .6 + G.hash2(i, 2) * H * .4), 6, 1, G.lerpCol(st.floor, '#ffffff', .12));
      if (st.season === 4) { G.drawClockTower(g, Math.round(W / 2), Math.round(H * .58), 74, t, true); } else if (this.d.id === 'prologue' || st === STAGES.hall) { for (let i = 0; i < 4; i++) { const x = W * (.12 + i * .25); px.rect(g, Math.round(x - 6), 24, 12, 90, '#3a2e50'); px.poly(g, [[x - 5, 40], [x + 5, 40], [x + 5, 70], [x, 80], [x - 5, 70]], G.SEASON_COL[i]); } }
      const n = this.actors.length; const cur = this.say.cur();
      this.actors.forEach((a, i) => { const x = Math.round(this.actorX(i, n, W)), y = Math.round(H * .66) + (i % 2) * 6; px.ell(g, x, y, 14, 5, '#00000066'); const dim = cur && cur.who !== a.id && cur.who !== 'narrator'; if (dim) { g.save(); g.globalAlpha = .6; } a.rig.draw(g, x, y, G.game.view); if (dim) g.restore(); });
      if (!this.actors.length) G.drawMotes(g, W, H, st.season < 4 ? st.season : 0, t, .6);
      this.say.draw(g, W, H, (gg, x, y, size, who) => { const a = this.actors.find(q => q.id === who); if (a) a.rig.drawPortrait(gg, x, y, size, { zoom: 3.2, turn: .3, bg: '#1a1230' }); });
      G.dev.draw(g, W, H); UI.prompts(g, W, H, [['confirm', 'Continue'], ['alt', 'Hold: faster']]);
    });
  }
};

/* ---------------- RESULTS ---------------- */
G.ResultsScene = class {
  constructor() { Object.assign(this, sceneBase({})); }
  enter(d) {
    this.d = d; this.t = 0; const win = d.campaign ? (d.out.won === C.isHuman(G.run.S, d.attack.realm)) : d.sim.winner === 0; this.win = win;
    G.music(win ? 'victory' : 'defeat', { restart: true }); this.lines = this.build(); G.activity();
    if (win) G.sfx('fanfare');
  }
  build() {
    const d = this.d, L_ = [];
    if (d.campaign) {
      const out = d.out, S = G.run.S;
      L_.push([out.taken ? `${G.CASTLES[out.castle].short} falls to ${RN(out.att)}.` : `${G.CASTLES[out.castle].short} holds against ${RN(out.att)}.`, '#ffe8a0']);
      if (out.treasure) L_.push(['Treasury taken: ' + G.get('item', out.treasure).name, '#80f0c0']);
      for (const c of out.captured) L_.push(['Bound to the banner: ' + c, '#ffd870']);
      for (const lu of out.levelUps) { const name = lu.id.startsWith('M') ? (S.mons[lu.id] ? monName(S.mons[lu.id]) : '') : KS(lu.id); if (name) L_.push([name + ' reaches level ' + lu.lvl + '!', '#a0ffa0']); }
      for (const dth of out.deaths.slice(0, 5)) L_.push([dth.name + ' is lost.', '#f09090']);
      for (const w of out.wounded) L_.push([w + ' is wounded and will miss the next season.', '#f0b0a0']);
      L_.push(['Bells fought: ' + Math.min(d.sim.bell, d.sim.bells), '#a8a0c8']);
    } else {
      const S = d.sim, mine = B.live(S, 0).length, dead = S.units.filter(u => u.side === 0 && !u.alive).length;
      L_.push([S.winner === 0 ? 'The field is yours.' : 'The field is lost.', '#ffe8a0']); L_.push([`Your troops standing: ${mine}.  Fallen: ${dead}.  Bells: ${Math.min(S.bell, S.bells)}.`, '#d8d0f0']);
      const best = S.units.filter(u => u.side === 0).sort((a, b) => b.dmgDone - a.dmgDone)[0]; if (best) L_.push([`Most damage: ${best.name} (${best.dmgDone}).`, '#a8a0c8']);
      if (d.tutorial) L_.push(['Training complete. The campaign awaits.', '#80f0c0']);
    }
    return L_;
  }
  update(dt) { this.t += dt; UI.pump(); if (this.t > .8 && (G.game.input.pressed('confirm') || UI.click)) { G.sfx('select'); this.done(); } }
  done() {
    const d = this.d; if (d.campaign) { G.game.go('campaign', { resume: 'after' }); return; }
    G.game.go('title');
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); px.rect(g, 0, 0, W, H, '#0a0614'); G.drawWorldBackdrop(g, W, H, (G.run ? G.run.S.season : 0), t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .55);
      const u = Math.min(1, t * 2); E.font.title(g, this.win ? 'VICTORY' : 'DEFEAT', W / 2, 24 - (1 - u) * 20, { scale: 3, align: 'center', colors: this.win ? ['#ffffff', '#ffe070', '#e08a20'] : ['#e8e0f0', '#9a8ab8', '#4a3a68'], depth: 2 });
      const w = Math.min(W - 40, 320), x = (W - w) / 2, y = 74, h = Math.min(130, this.lines.length * 12 + 14); G.box(g, x, y, w, h);
      this.lines.slice(0, 9).forEach((l, i) => { if (t > .3 + i * .12) G.T(g, l[0], x + 10, y + 8 + i * 12, l[1]); });
      UI.prompts(g, W, H, [['confirm', 'Continue']]);
    });
  }
};

/* ---------------- ENDING + CREDITS ---------------- */
G.EndingScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.say = new UI.Say(); }
  enter(d) {
    this.d = d; const lines = G.ENDINGS[d.kind](d.realm).map(l => l); this.say.start(lines); this.phase = 'story'; this.t = 0; this.scroll = 0;
    G.music(d.won ? 'victory' : 'defeat', { restart: true }); G.clearRigs(); G.sfx(d.won ? 'fanfare' : 'lose');
    this.actors = {}; G.activity();
  }
  portrait(g, x, y, size, who) { const a = this.actors[who] || (this.actors[who] = new E.Humanoid(G.knightLook(who, G.KNIGHTS[who].line, 1, G.KNIGHTS[who].realm, 1.2))); a.drawPortrait(g, x, y, size, { zoom: 3.2, turn: .3, bg: '#1a1230' }); }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input;
    if (this.phase === 'story') { const r = this.say.update(dt); if (r && r.done) { this.phase = 'credits'; this.t = 0; } }
    else { this.scroll += dt * 16; if (I.pressed('confirm') && this.t > 1) { G.run = null; G.game.go('title'); } }
    for (const k in this.actors) this.actors[k].update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t; UI.begin(); const won = this.d.won, S = G.run ? G.run.S : null;
      G.drawSky(g, W, H, won ? 0 : 3, t, Math.round(H * .6)); G.drawClockTower(g, Math.round(W / 2), Math.round(H * .64), 80, t * (won ? 4 : 0), won); G.drawMotes(g, W, H, won ? 0 : 3, t, .8);
      if (this.phase === 'story') this.say.draw(g, W, H, (gg, x, y, s, who) => this.portrait(gg, x, y, s, who));
      else {
        px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .7);
        const lines = [['BRIGANTIME', 3], ['The Legend of Forseasons', 1], ['', 0], [won ? 'The Wheel turns again.' : 'The Clock waits for another hand.', 1], ['', 0]];
        if (S) { lines.push(['Seasons played: ' + S.turn, 1], ['Battles fought: ' + S.stats.battles, 1], ['Castles taken: ' + S.stats.castles, 1], ['Monsters bound: ' + S.stats.captured, 1], ['', 0]); }
        lines.push(['Inspired by Brigandine: The Legend of Forsena', 1], ['Built on my-3D2dge. Every sound and picture drawn by code.', 1], ['', 0], ['Thank you for playing.', 1]);
        let y = H - this.scroll; for (const [tx, sc] of lines) { if (sc === 3) E.font.title(g, tx, W / 2, Math.round(y), { scale: 3, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'] }); else if (tx) G.T(g, tx, W / 2 - G.TW(tx) / 2, Math.round(y), '#f4eed8'); y += sc === 3 ? 34 : 14; }
        if (y < 20 && this.t > 3) G.T(g, 'Press ' + G.game.input.label('confirm') + ' to return to the title', W / 2 - 80, H / 2, '#ffe8a0');
        UI.prompts(g, W, H, [['confirm', 'Title']]);
      }
    });
  }
};

/* ---------------- HELP ---------------- */
G.HELP = [
  ['Overview', ['BRIGANTIME is a game of seasons. Each turn is one season of the Brigantime: Spring, Summer, Autumn, Winter.', 'Read the Tidings, Muster your castles, then March on neighbours. Armies meet in hex battles of twelve bells.', 'Take Meridian and defeat the Gray Knight before the Hour-Candle burns out. It is lit in Spring of Year 2.']],
  ['Muster', ['Open a castle of yours: Summon monsters (mana), Bind them to your knights (a knight\'s Bond caps the troop), move knights to a neighbouring castle, or send them Questing for treasure, beasts, wanderers, mana, training... and mishaps.', 'Equip items, promote monsters (Lv 12, or earlier with a Season Seed) and knights (Lv 10 free; the third class needs a Writ).', 'Commands: March, Realms, End Muster. A castle can be Stilled by the Gray Knight for a season.']],
  ['Battle', ['Select a unit, pick a hex, then Attack, Skill, Bind, Item or Wait. Each unit acts once per bell. Spells need planted feet: cast before you move.', 'Opposed seasons hit hard: Spring vs Autumn, Summer vs Winter. The battle\'s season gives its own element a Tide bonus.', 'Monsters beyond four hexes from their knight are outside the Ward and fight weaker. Weak monsters can be Bound. Win by routing the foe; attackers also win with a knight on the Keep at the last bell.']],
  ['Controls', ['Controller: D-pad or left stick moves, Cross confirms, Circle goes back, Square is Commands or End phase, Triangle shows details, L1/R1 cycle units, R3 tilts the board, Options pauses.', 'Keyboard: arrows or WASD, Enter or Z confirm, Backspace or X back, Space end phase or commands, Tab or I details, Q and E cycle, V tilt, Esc pause.', 'Mouse: hover to focus, click to choose, right click to go back. Prompts follow the device you used last.']]
];
G.HelpScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.page = 0; }
  enter(d) { this.d = d || {}; this.t = 0; this.page = 0; G.activity(); }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input, nav = UI.nav();
    if (nav.x || I.pressed('next') || I.pressed('prev')) { this.page = (this.page + (nav.x || (I.pressed('next') ? 1 : -1)) + G.HELP.length) % G.HELP.length; G.sfx('cursor'); }
    if (UI.click) { const h = UI.hit('htab'); if (h) { this.page = h.i; G.sfx('cursor'); } }
    if (I.pressed('cancel') || I.pressed('confirm') && false) { G.sfx('back'); G.game.go(this.d.back || 'title'); }
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin(); px.rect(g, 0, 0, W, H, '#120c1e'); G.drawWorldBackdrop(g, W, H, this.page % 4, this.t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .6);
      G.T(g, 'How to Play', 10, 6, '#ffe8a0');
      G.HELP.forEach((p, i) => { const x = 10 + i * 70; UI.add('htab', i, x, 20, 66, 12); px.rect(g, x, 20, 66, 12, i === this.page ? '#6a5aa8' : '#2a2046'); G.T(g, p[0], x + 33 - G.TW(p[0]) / 2, 23, i === this.page ? '#fff8d8' : '#8a82a8'); });
      G.box(g, 10, 36, W - 20, H - 36 - 20); let y = 44; for (const para of G.HELP[this.page][1]) { y += UI.text(g, para, 18, y, W - 44, '#f4eed8', 10) + 8; }
      UI.prompts(g, W, H, [['dpad', 'Page'], ['cancel', 'Back']]);
    });
  }
};

/* ---------------- ABOUT / CREDITS ---------------- */
G.AboutScene = class {
  constructor() { Object.assign(this, sceneBase({})); this.page = 0; this.scroll = 0; }
  enter(d) { this.d = d || {}; this.t = 0; this.page = 0; this.scroll = 0; G.activity(); }
  update(dt) {
    this.t += dt; UI.pump(); const I = G.game.input, nav = UI.nav(), n = G.ABOUT.length;
    if (nav.x || I.pressed('next') || I.pressed('prev')) { this.page = (this.page + (nav.x || (I.pressed('next') ? 1 : -1)) + n) % n; this.scroll = 0; G.sfx('cursor'); }
    if (nav.y) this.scroll = Math.max(0, this.scroll + nav.y * 14);
    if (UI.click) { const h = UI.hit('atab'); if (h) { this.page = h.i; this.scroll = 0; } }
    if (I.pressed('cancel')) { G.sfx('back'); G.game.go(this.d.back || 'title'); }
  }
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; UI.begin(); px.rect(g, 0, 0, W, H, '#120c1e'); G.drawWorldBackdrop(g, W, H, 3, this.t, true); px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .6);
      G.T(g, 'About & Credits', 10, 5, '#ffe8a0'); const tw = Math.floor((W - 20) / G.ABOUT.length);
      G.ABOUT.forEach((p, i) => { const x = 10 + i * tw; UI.add('atab', i, x, 17, tw - 2, 12); px.rect(g, x, 17, tw - 2, 12, i === this.page ? '#6a5aa8' : '#2a2046'); G.T(g, p.title, x + (tw - 2) / 2 - G.TW(p.title) / 2, 20, i === this.page ? '#fff8d8' : '#8a82a8'); });
      G.box(g, 10, 32, W - 20, H - 32 - 18);
      const lines = []; for (const [k, v] of G.ABOUT[this.page].rows) { lines.push([k ? k + ': ' : '', v]); }
      let y = 38 - this.scroll; g.save(); g.beginPath(); g.rect(12, 34, W - 24, H - 34 - 20); g.clip();
      for (const [k, v] of lines) { const ls = UI.wrap((k || '') + v, W - 48); ls.forEach((l, i) => { if (y > 28 && y < H) G.T(g, l, 18, y, i === 0 && k ? '#f4eed8' : '#d8d0f0'); y += 9; }); y += 3; }
      g.restore(); this.maxScroll = Math.max(0, y + this.scroll - (H - 24));
      if (this.scroll > this.maxScroll) this.scroll = this.maxScroll;
      UI.prompts(g, W, H, [['dpad', 'Page - scroll'], ['cancel', 'Back']]);
    });
  }
};
