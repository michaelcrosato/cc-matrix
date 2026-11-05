/* ---- SCENES: title, shop, bento, results, game over, about, attract mode ---- */
const scenes = {};
const HEROES = [
  { x: MID - 84, face: 0, rig: makeHeroRig('sojiro'), name: 'sojiro' },
  { x: MID + 84, face: Math.PI, rig: makeHeroRig('kaede'), name: 'kaede' }
];
let idleT = 0, lastPtr = null;
const anyInput = () => {
  const I = game.input; let a = I.anyPressed() || I.pressed('start');
  const m = I.move(); if (Math.hypot(m[0], m[1]) > .3) a = true;
  const p = I.pointer && I.pointer(); if (p) { if (lastPtr && Math.abs(p[0] - lastPtr[0]) + Math.abs(p[1] - lastPtr[1]) > 2) a = true; lastPtr = p.slice(); }
  return a;
};
/* ---- TITLE ---- */
let titleRows = null;
const startStory = () => {
  const go = () => game.go('shop');
  if (!B.save.seenIntro) { B.save.seenIntro = true; B.persist(); B.cutscene(B.STORY.prologue, go, { music: B.SONGS.shop }); } else go();
};
scenes.title = {
  view: 'side', input: INPUT, res: 'ps1',
  enter() {
    A.music(B.SONGS.shop); game.follow(null); game.cam.bounds = null; game.cam.offset = null; game.resetCamera(); L.enabled = false; game.weather = null; S = null; B.devOpen = false; game.timeScale = 1; idleT = 0; lastPtr = null;
    const touch = B.touchOnly();
    titleRows = new RowsUI(touch ? [{ label: 'Settings', pick: () => game.menu('settings') }] : [
      { label: 'Play', pick: startStory },
      { label: 'Shadow Trial', pick: () => game.go('hubtrial') },
      { label: 'Workshop', pick: () => game.go('workshop') },
      { label: 'Settings', pick: () => game.menu('settings') },
      { label: 'About', pick: () => game.go('about') }
    ]);
    B.syncGlyphs();
  },
  update(dt) {
    if (anyInput()) idleT = 0; else idleT += dt;
    titleRows.update(dt);
    if (idleT > 10) { B.attractIdx = 0; game.go('attract'); }
    game.focus(MID, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    HEROES.forEach((h, i) => { const u = (game.time * .45 + i * .6) % 3, swing = u < .5 ? { spec: { a0: 1.4, a1: -1.6, z0: 12, z1: 8, reach: 7.5 }, phase: u < .15 ? 'wind' : 'active', u: u < .15 ? u / .15 : (u - .15) / .35 } : null; h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: h.face, vx: 0, vy: 0, attack: swing }); });
  },
  draw(r) {
    NIGHT.draw(r); stage.draw(r);
    for (const x of [MID - 80, MID + 80]) r.prop('lantern', x, -4, 56, { size: 1.2, light: true, anchor: 'top' });
    r.prop('banner', MID - 120, -8, 64, { size: 1.1, color: '#8a1a2a' }); r.prop('banner', MID + 120, -8, 64, { size: 1.1, color: '#8a1a2a' });
    for (const h of HEROES) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view));
    const W = r.W, H = r.H;
    r.overlay(g => {
      bigText(g, TITLE, W / 2, 14, 5, ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a']);
      txt(g, SUBTITLE, W / 2, 56, '#f0e0ff', { align: 'center', gradient: ['#ffffff', '#c8b8f0'] });
      const rowH = 18, rw = 150, rx = mm(W / 2 - rw / 2), ry = mm(H * .42);
      if (B.touchOnly()) { txt(g, 'Controller or keyboard required', W / 2, ry - 22, '#ffd070', { align: 'center', scale: 1 }); }
      panel(g, rx - 6, ry - 6, rw + 12, titleRows.rows.length * rowH + 12);
      titleRows.draw(g, rx, ry, rw, rowH, { scale: 1 });
      footer(g, W, H); const prompts = lastDev() === 'gamepad' ? 'D-pad / stick   ' + lbl('confirm') + ' Select' : lastDev() === 'touch' ? '' : 'Arrows / mouse   ' + lbl('confirm') + ' Select';
      txt(g, prompts, W / 2, H - 14, '#8a80a8', { align: 'center' });
      txt(g, 'An original game inspired by Tenchu 2. Not affiliated.', W / 2, H - 26, '#5a5078', { align: 'center' });
    });
  }
};
/* ---- THE SHOP: choose mission and hero, pack the bento, go ---- */
let shopRows = null, shopSel = 0;
function unlockedMissions() { return B.MISSIONS.filter(m => m.n < B.save.unlocked); }
scenes.shop = {
  view: 'side', input: INPUT, res: 'ps1',
  enter() {
    A.music(B.SONGS.shop); game.follow(null); game.resetCamera(); L.enabled = false; game.weather = null; S = null; game.timeScale = 1;
    shopSel = clamp(shopSel, 0, unlockedMissions().length - 1);
    if (B.save.unlocked > 1 && shopSel === 0 && B.save.ranks.trial !== undefined && B.save.ranks.rice === undefined) shopSel = 1;
    shopRows = new RowsUI([
      { label: 'Mission', value: () => (B.MISSIONS[shopSel].n === 0 ? 'Trial' : 'No. ' + B.MISSIONS[shopSel].n) + ': ' + B.MISSIONS[shopSel].name, left: () => { shopSel = (shopSel + unlockedMissions().length - 1) % unlockedMissions().length; }, right: () => { shopSel = (shopSel + 1) % unlockedMissions().length; } },
      { label: 'Apprentice', value: () => B.save.chara === 'sojiro' ? 'Sojiro (katana)' : 'Kaede (twin blades)', left: () => { B.save.chara = B.save.chara === 'sojiro' ? 'kaede' : 'sojiro'; B.persist(); }, right: () => { B.save.chara = B.save.chara === 'sojiro' ? 'kaede' : 'sojiro'; B.persist(); } },
      { label: 'Pack the bento', pick: () => game.go('pack', { mission: B.MISSIONS[shopSel].id }) },
      { label: 'Go', pick: () => launch(B.MISSIONS[shopSel].id) },
      { label: 'Back', pick: () => game.go('title') }
    ], { onCancel: () => game.go('title') });
  },
  update(dt) { shopRows.update(dt); game.focus(MID, 0, 32 + (game.H / 2 - 42) / -game.view.bz); const h = HEROES[B.save.chara === 'kaede' ? 1 : 0]; h.rig.update(dt, { x: MID, y: 0, z: 32, facing: 0, vx: 0, vy: 0, pose: 'hips' }); },
  draw(r) {
    NIGHT.draw(r); stage.draw(r); const m = B.MISSIONS[shopSel], W = r.W, H = r.H;
    r.prop('lantern', MID - 60, -4, 56, { size: 1.2, light: true, anchor: 'top' }); r.prop('lantern', MID + 60, -4, 56, { size: 1.2, light: true, anchor: 'top' });
    const h = HEROES[B.save.chara === 'kaede' ? 1 : 0]; r.actor(MID, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      bigText(g, 'THE JUBAKO-YA', W / 2, 10, 3);
      const rw = Math.min(W - 24, 280), rx = mm(W / 2 - rw / 2), ry = 44; panel(g, rx - 6, ry - 4, rw + 12, 5 * 17 + 8); shopRows.draw(g, rx, ry, rw, 17, {});
      const best = B.save.ranks[m.id]; panel(g, rx - 6, ry + 5 * 17 + 8, rw + 12, 40);
      txt(g, m.place, rx, ry + 5 * 17 + 13, '#d9b77c'); txt(g, 'Par ' + Math.floor(m.par / 60) + ':' + String(m.par % 60).padStart(2, '0') + '    Best: ' + (best === undefined ? 'unplayed' : B.RANKS[best][0]), rx, ry + 5 * 17 + 25, '#b8b0d8');
      txt(g, m.objectives.filter(o => o.req).map(o => o.text).slice(0, 1)[0] || '', rx, ry + 5 * 17 + 36, '#8a80a8');
      footer(g, W, H); txt(g, lbl('confirm') + ' Select    ' + lbl('cancel') + ' Back', W / 2, H - 12, '#6a6088', { align: 'center' });
    });
  }
};
function launch(id) {
  const m = B.missionById(id);
  const go = () => game.go('play', { mission: id });
  if (m.intro && B.STORY[m.intro] && m.n > 0) B.cutscene(B.STORY[m.intro], go); else go();
}
/* ---- PACK THE BENTO: eight compartments, two tiers ---- */
let packI = 0;
scenes.pack = {
  view: 'side', input: INPUT, res: 'ps1',
  enter(d) { this.d = d; packI = 0; game.follow(null); game.resetCamera(); this.tools = B.TOOL_ORDER.filter(t => B.save.tools.includes(t)); },
  cycle(dir) { const s = B.save, cur = s.loadout[packI], k = this.tools.indexOf(cur); s.loadout[packI] = this.tools[(k + dir + this.tools.length * 4) % this.tools.length]; B.persist(); A.sfx('tick'); },
  update(dt) {
    const I = game.input;
    if (I.repeat('left', .4, .12)) { packI = (packI + 7) % 8; A.sfx('tick'); }
    if (I.repeat('right', .4, .12)) { packI = (packI + 1) % 8; A.sfx('tick'); }
    if (I.repeat('up', .4, .12) || I.repeat('down', .4, .12)) { packI = (packI + 4) % 8; A.sfx('tick'); }
    if (I.pressed('confirm')) this.cycle(1); if (I.pressed('interact')) { B.save.loadout = B.missionById(this.d.mission).loadHint.slice(); B.persist(); A.sfx('powerup'); }
    if (I.pressed('block')) this.cycle(-1);
    if (I.pressed('cancel')) game.go('shop');
    const c = I.clicked && I.clicked(); if (c && this.hot) for (const h of this.hot) if (c[0] >= h.x && c[0] < h.x + h.w && c[1] >= h.y && c[1] < h.y + h.h) { if (packI === h.i) this.cycle(1); packI = h.i; }
    const p = I.pointer && I.pointer(); if (p && this.hot && lastPtr0(p)) for (const h of this.hot) if (p[0] >= h.x && p[0] < h.x + h.w && p[1] >= h.y && p[1] < h.y + h.h) packI = h.i;
  },
  draw(r) {
    NIGHT.draw(r); stage.draw(r); game.focus(MID, 0, 40); const W = r.W, H = r.H; this.hot = [];
    r.overlay(g => {
      bigText(g, 'PACK THE BENTO', W / 2, 10, 3);
      const cw = Math.min(52, Math.floor((W - 40) / 4)), ch = 46, bx = mm(W / 2 - cw * 2), by = 44;
      panel(g, bx - 8, by - 8, cw * 4 + 16, ch * 2 + 22, .9); px.rect(g, bx - 4, by + ch + 1, cw * 4 + 8, 3, '#3a2a18');
      txt(g, '1st tier', bx - 4, by - 7, '#6a5a78'); txt(g, '2nd tier', bx - 4, by + ch + 5 + 0, '#6a5a78');
      B.save.loadout.forEach((t, i) => {
        const c = i % 4, rr = Math.floor(i / 4), x = bx + c * cw, y = by + rr * (ch + 8) + 2, tl = B.TOOLS[t]; this.hot.push({ i, x, y, w: cw - 3, h: ch - 2 });
        px.rect(g, x, y, cw - 3, ch - 2, i === packI ? '#5a3a1a' : '#2a1c10'); px.rect(g, x, y, cw - 3, 2, i === packI ? '#ffd070' : '#4a3020');
        px.disc(g, x + (cw - 3) / 2, y + 16, 9, tl.icon); txt(g, tl.short, x + (cw - 3) / 2, y + 30, i === packI ? '#fff' : '#a8a0c0', { align: 'center' }); txt(g, 'x' + tl.stack, x + (cw - 3) / 2, y + 38, '#8a80a8', { align: 'center' });
      });
      const t = B.TOOLS[B.save.loadout[packI]]; panel(g, bx - 8, by + ch * 2 + 22, cw * 4 + 16, 30);
      txt(g, t.name, bx, by + ch * 2 + 26, '#ffe9b0'); txt(g, t.hint, bx, by + ch * 2 + 38, '#b8b0d8', { wrap: cw * 4 });
      footer(g, W, H, 34); const locked = B.TOOL_ORDER.filter(x => !B.save.tools.includes(x)).length; txt(g, locked + ' tools still locked: earn ranks to unlock them', W / 2, H - 26, '#6a6088', { align: 'center' });
      txt(g, lbl('confirm') + ' Next tool   ' + lbl('block') + ' Previous   ' + lbl('interact') + ' Suggested   ' + lbl('cancel') + ' Back', W / 2, H - 14, '#8a80a8', { align: 'center' });
    });
  }
};
const lastPtr0 = (p) => { const l = scenes.pack._lp; scenes.pack._lp = p.slice(); return !l || Math.abs(l[0] - p[0]) + Math.abs(l[1] - p[1]) > 1; };
/* ---- RESULTS: the hanko rank stamp and Granny's verdict ---- */
scenes.results = {
  view: 'side', input: INPUT, res: 'ps1',
  enter(d) {
    const r = this.r = d.result; this.t = 0; A.music('victory'); game.follow(null); game.resetCamera(); L.enabled = false; game.weather = null;
    const m = B.missionById(r.id), s = B.save; this.unlocks = [];
    const prev = s.ranks[r.id]; if (prev === undefined || r.rank < prev) s.ranks[r.id] = r.rank;
    s.unlocked = Math.max(s.unlocked, m.n + 2);
    const add = t => { if (!s.tools.includes(t)) { s.tools.push(t); this.unlocks.push(B.TOOLS[t].name); } };
    if (m.id === 'trial') { add('dango'); if (r.rank <= 2) add('plum'); }
    if (m.id === 'rice' && r.rank <= 2) add('firepot');
    if (m.id === 'lake' && r.rank <= 2) add('firepot'); if (r.rank === 0) add('cloak');
    if (m.id === 'moon') add('cloak');
    B.persist(); this.stamped = false;
  },
  update(dt) {
    this.t += dt; if (this.t > 1.2 && !this.stamped) { this.stamped = true; A.sfx('stamp'); game.shake(4); }
    if (this.t > 1.8 && game.input.pressed('confirm')) {
      const m = B.missionById(this.r.id);
      const out = m.outro && B.STORY[m.outro], after = () => { if (m.id === 'custom') game.go('workshop'); else if (m.id === 'moon') game.go('title'); else game.go('shop'); };
      if (out) B.cutscene(out, after, { bg: m.id === 'moon' ? 'dawn' : 'night' }); else after();
    }
    if (this.t > 1.8 && game.input.pressed('cancel')) game.go('shop');
  },
  draw(r) {
    NIGHT.draw(r); stage.draw(r); game.focus(MID, 0, 40); const W = r.W, H = r.H, R = this.r;
    r.overlay(g => {
      bigText(g, 'MISSION COMPLETE', W / 2, 8, 3);
      txt(g, R.name, W / 2, 34, '#d9b77c', { align: 'center' });
      const lx = mm(W / 2 - 150), ly = 52; panel(g, lx - 6, ly - 4, 300, 112);
      const flags = Object.keys(R.flags); flags.forEach((k, i) => { const ok = R.flags[k]; txt(g, (ok ? '[x] ' : '[ ] ') + FLAG_TEXT[k], lx, ly + i * 11, ok ? '#9ae89a' : '#6a6088'); });
      const mins = Math.floor(R.time / 60), secs = Math.floor(R.time % 60);
      txt(g, 'Time ' + mins + ':' + String(secs).padStart(2, '0') + '   Cuts ' + R.cuts, lx, ly + 68, '#b8b0d8'); txt(g, 'Seen ' + R.detected + '   Alarms ' + R.bells, lx, ly + 78, '#b8b0d8'); txt(g, 'Score ' + R.score, lx, ly + 90, '#ffe9b0');
      if (R.ledger) txt(g, 'Kanemori\'s ledger recovered', lx, ly + 102, '#ffd070');
      if (this.t > 1.2) {
        const k = clamp((this.t - 1.2) / .2, 0, 1), sc = 4 - 2 * k;
        E.font.title(g, B.RANKS[R.rank][0].toUpperCase(), mm(W / 2 + 70), mm(ly + 18), { align: 'center', scale: Math.max(2, Math.round(sc)), colors: ['#ffd8d0', '#e03a2a', '#901810'], depthColor: '#2a0808' });
        txt(g, '"' + B.RANKS[R.rank][1] + '" - Granny', W / 2 + 70, ly + 52, '#f0e0ff', { align: 'center' });
        this.unlocks.forEach((u, i) => txt(g, 'Unlocked: ' + u, W / 2 + 70, ly + 68 + i * 10, '#80e0ff', { align: 'center' }));
      }
      footer(g, W, H, 22); if (this.t > 1.8) txt(g, lbl('confirm') + ' Continue', W / 2, H - 14, '#8a80a8', { align: 'center' });
    });
  }
};
/* ---- GAME OVER ---- */
let overRows = null;
scenes.over = {
  view: 'side', input: INPUT, res: 'ps1',
  enter(d) { this.d = d; A.music(null); game.follow(null); game.resetCamera(); L.enabled = false; game.weather = null; game.timeScale = 1;
    overRows = new RowsUI([{ label: 'Try again', pick: () => game.go('play', { mission: d.mission }) }, { label: 'Pack the bento', pick: () => game.go('pack', { mission: d.mission }) }, { label: 'Back to the shop', pick: () => game.go('shop') }], { onCancel: () => game.go('shop') }); },
  update(dt) { overRows.update(dt); },
  draw(r) { const W = r.W, H = r.H; NIGHT.draw(r); r.overlay(g => { bigText(g, 'THE BOX WAS EMPTY', W / 2, 24, 3, ['#ffe0e0', '#ff7a6a', '#c8202a']); txt(g, '"Rice that falls is only seed." - Granny', W / 2, 62, '#d8c8e8', { align: 'center' }); panel(g, W / 2 - 86, 84, 172, 58); overRows.draw(g, mm(W / 2 - 80), 88, 160, 16, {}); }); }
};
/* ---- ABOUT / CREDITS: paged ---- */
scenes.about = {
  view: 'side', input: INPUT, res: 'ps1',
  enter() { this.p = 0; this.lines = null; game.follow(null); game.resetCamera(); },
  build(W, H) {
    const w = Math.min(W - 40, 380), lh = E.font.lineHeight({}) + 1, per = Math.max(6, Math.floor((H - 70) / lh)); this.w = w; this.lh = lh;
    const pages = []; for (const [title, text] of B.ABOUT_PAGES()) { const ls = []; for (const para of text.split('\n')) { ls.push(...wrapLines(para, w - 8)); } for (let i = 0; i < ls.length || i === 0; i += per) pages.push([title + (ls.length > per ? ' (' + (Math.floor(i / per) + 1) + ')' : ''), ls.slice(i, i + per)]); }
    this.pages = pages; this.key = W + 'x' + H;
  },
  update(dt) {
    const I = game.input; if (I.pressed('cancel')) game.go('title');
    const n = this.pages ? this.pages.length : 1;
    if (I.repeat('right', .4, .15) || I.pressed('confirm')) { this.p = (this.p + 1) % n; A.sfx('tick'); }
    if (I.repeat('left', .4, .15)) { this.p = (this.p + n - 1) % n; A.sfx('tick'); }
    const c = I.clicked && I.clicked(); if (c) { this.p = (this.p + (c[0] < game.W / 3 ? n - 1 : 1)) % n; }
  },
  draw(r) {
    const W = r.W, H = r.H; NIGHT.draw(r); if (this.key !== W + 'x' + H) this.build(W, H);
    r.overlay(g => {
      const pg = this.pages[this.p]; panel(g, mm(W / 2 - this.w / 2 - 6), 6, this.w + 12, H - 24, .88);
      bigText(g, pg[0].toUpperCase(), W / 2, 12, 2);
      pg[1].forEach((l, i) => txt(g, l, W / 2 - this.w / 2, 34 + i * this.lh, '#d8d0f0'));
      footer(g, W, H, 22); txt(g, (this.p + 1) + ' / ' + this.pages.length + '     Left / Right: page     ' + lbl('cancel') + ': back', W / 2, H - 14, '#8a80a8', { align: 'center' });
    });
  }
};
/* ---- ATTRACT MODE: after 10 seconds idle, an AI plays the missions on a loop; any input leaves ---- */
const ATTRACT = ['trial', 'delivery', 'rice'];
B.attractIdx = 0;
B.attractNext = () => { B.attractIdx = (B.attractIdx + 1) % ATTRACT.length; game.go('play', { mission: ATTRACT[B.attractIdx], auto: true }); };
scenes.attract = { view: 'side', input: INPUT, res: 'ps1', enter() { B.attractIdx = B.attractIdx || 0; game.go('play', { mission: ATTRACT[B.attractIdx % ATTRACT.length], auto: true }, { fade: 0 }); }, update() {}, draw() {} };
/* ---- THE PLAY SCENE ---- */
scenes.play = {
  view: 'iso', views: ['iso', 'threequarter'], input: INPUT, res: 'ps1', pausable: true, camera: { zoom: [.75, 2], start: 1.1, rotate: true },
  enter(d) {
    d = d || {}; game.resetCamera(); B.devOpen = false;
    const o = { auto: !!d.auto };
    if (d.trial) o.loadout = B.save.loadout;
    startMission(d.mission || 'trial', o); S.trialMode = !!d.trial;
    if (S.auto) { S.autoStart = game.real; B.attractStart = 0; }
    if (B.onPlayEnter) B.onPlayEnter(d);
    if (!S.auto && S.m.n === 0) { /* the trial opens with Granny's voice */ say('granny', 'Walk softly. A guard hears your feet before he sees your face.', 5); S.hints.add(0); }
  },
  exit() { game.cam.offset = null; game.cam.bounds = null; L.enabled = false; game.weather = null; game.timeScale = 1; game.setZoom(1); },
  back() { if (!HUB) { game.go('shop'); return true; } return false; },
  update(dt) {
    if (S && S.auto) { B.attractStart = (B.attractStart || 0) + dt; if (anyInput() && B.attractStart > .3) { game.go('title'); return; } if (B.attractStart > 75) { B.attractNext(); return; } }
    playUpdate(dt);
  },
  draw(r) { playDraw(r); }
};
B.pauseItems = () => {
  if (HUB) return [];
  const items = [];
  if (S && !S.auto && !S.done) { items.push(['Dev Mode', () => { game.resume(); B.devOpen = true; B.devI = 0; }]); items.push(['Restart', () => { game.resume(); game.go('play', { mission: S.m.id, trial: S.trialMode, ...(S.trialMode ? {} : {}) }); }]); }
  return items;
};
scenes.cutscene = cutScene;
