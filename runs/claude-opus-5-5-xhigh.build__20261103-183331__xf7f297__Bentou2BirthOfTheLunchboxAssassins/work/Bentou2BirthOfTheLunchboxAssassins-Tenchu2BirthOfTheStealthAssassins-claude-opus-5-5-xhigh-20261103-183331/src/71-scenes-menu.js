/* ---- MENUS: the title (a moonlit castle, the two apprentices on a tiled ridge; after 10 s idle, attract mode), the
 * character select, the mission select and the paged About / Credits. A touch-only device gets "Controller or keyboard
 * required" and a big Settings button instead of the menu ---- */
const MENU_SCENE = { view: 'side', res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: false } };
const paper = r => (g => { px.rect(g, 0, 0, r.W, r.H, '#140c0c'); for (let i = 0; i < 40; i++) { const x = (i * 97) % r.W, y = (i * 53) % r.H; px.dot(g, x, y, '#2a1814'); } })(r.ctx);
const TITLE_BG = new E.Backdrop({ sky: ['#05061a', '#10143a', '#2a2050', '#4a2a50'], moon: { x: .7, y: .3, r: 34, color: '#fff4d8' }, stars: 90, starsY: .7,
  layers: [{ kind: 'mountains', color: '#141a3a', y: .66, height: .28, parallax: .05, seed: 3 }, { kind: 'castle', color: '#0c0e24', y: .72, height: .44, parallax: .1, seed: 2 }, { kind: 'fog', color: '#3a3060', y: .8, height: .1, parallax: .2, drift: 6 }, { kind: 'forest', color: '#080a18', y: .86, height: .1, parallax: .3, seed: 5 }] });
const RIDGE = new E.PlatformMap({ rows: ['K'.repeat(80), 'K'.repeat(80)], legend: { K: 1 }, types: { 1: { style: 'block', side: '#3a4252', top: '#4a5468' } }, edges: 'open' });
const TMID = 640;
const TitleRigs = { sojiro: null, kaede: null };
const titleRig = id => TitleRigs[id] || (TitleRigs[id] = Rigs.make(id));
const versionLine = () => 'my-3D2dge v' + E.version + ' - Bentou 2 v' + B.version;
const titleScene = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.t = 0; this.pressed = !!(d && d.menu); B.Music.play('title'); game.follow(null); game.cam.bounds = null; Lt.enabled = false; game.lights.enabled = false;
    game.weather = { kind: 'petals', amount: .5, wind: .4 }; B.noteInput(); this.idleFrom = game.real; this.build();
  },
  build() {
    const any = game.saves.latest && game.saves.latest();
    this.items = [any && 'Continue', 'New Story', 'Missions', 'Shadow Trial', 'Workshop', 'Settings', 'About'].filter(Boolean);
    this.menu = new E.Menu(game, this.items, { x: 24, y: 112, box: false, color: '#f4ead5', pick: '#ffd36a', onPick: (i, it) => this.pick(it) });
  },
  pick(it) {
    Au.sfx('uiConfirm');
    if (it === 'Continue') Flow.continue();
    else if (it === 'New Story') game.go('charSelect', { then: 'story' }, { fade: 'dissolve' });
    else if (it === 'Missions') game.go('charSelect', { then: 'missions' }, { fade: 'dissolve' });
    else if (it === 'Shadow Trial') game.go('charSelect', { then: 'trial' }, { fade: 'dissolve' });
    else if (it === 'Workshop') game.go('workshop', {}, { fade: 'dissolve' });
    else if (it === 'Settings') game.menu('settings');
    else if (it === 'About') game.go('about', {}, { fade: 'dissolve' });
  },
  update(dt) {
    B.pollInput(); this.t += dt;
    if (game.real - B.lastInput > 10 && !ui.screen) { game.go('attract', {}, { fade: 'dissolve' }); return; }
    if (B.touchOnly()) { const c = game.input.clicked(); if (c && this.setBtn && c[0] >= this.setBtn.x && c[0] < this.setBtn.x + this.setBtn.w && c[1] >= this.setBtn.y && c[1] < this.setBtn.y + this.setBtn.h) game.menu('settings'); this.animate(dt); return; }
    if (ui.screen) { this.animate(dt); return; }
    if (!this.pressed) { if (game.input.pressed('start') || game.input.pressed('confirm') || game.input.clicked()) { this.pressed = true; Au.sfx('uiConfirm'); game.input.consumeAll(); } }
    else this.menu.update(dt);
    this.animate(dt);
  },
  animate(dt) {
    const t = game.time;
    titleRig('sojiro').update(dt, { x: TMID - 22, y: 0, z: 32, facing: 0, vx: 0, vy: 0, stance: 'ready' });
    titleRig('kaede').update(dt, { x: TMID + 22, y: 0, z: 32, facing: Math.PI, vx: 0, vy: 0, crouch: Math.sin(t * .5) > .6 });
    game.focus(TMID - Math.round(game.W * .18), 0, 32 + (game.H / 2 - 40) / -game.view.bz);
  },
  draw(r) {
    TITLE_BG.draw(r); RIDGE.draw(r);
    r.actor(TMID - 22, 0, 32, (g, ox, oy) => titleRig('sojiro').draw(g, ox, oy, r.view));
    r.actor(TMID + 22, 0, 32, (g, ox, oy) => titleRig('kaede').draw(g, ox, oy, r.view));
    for (const x of [TMID - 120, TMID + 120]) r.shape('paperLantern', x, 0, 32, {});
    r.overlay(g => {
      const W = r.W, ty = game.upright ? 64 : 14;
      E.font.title(g, 'BENTOU 2', W / 2, ty, { align: 'center', scale: 4, colors: ['#fff4c8', '#ffd36a', '#e8b04a', '#d8402a'], depth: 3, depthColor: '#3a0a0a' });
      E.font.text(g, 'Birth of the Lunchbox Assassins', W / 2, ty + 38, '#f4ead5', { align: 'center', gradient: ['#ffffff', '#e8c8a0'], shadow: '#140808', outline: false });
      px.sprite(g, Art.crest, Math.round(W / 2 + E.font.width('BENTOU 2', { scale: 4 }) / 2 + 6), ty + 4, { scale: 2 });
      E.font.text(g, versionLine(), W - 4, r.H - 10, '#6a6488', { align: 'right', font: 'tiny', outline: false });
      if (B.touchOnly()) {
        const bw = Math.min(240, W - 40), bx = Math.round((W - bw) / 2), by = ty + 76;
        px.blend(g, .85, 'normal', () => px.rect(g, bx, by, bw, 96, '#140c0c')); px.rect(g, bx, by, bw, 1, '#e8b04a');
        E.font.text(g, 'Controller or keyboard required', W / 2, by + 10, '#ffd36a', { align: 'center', outline: false });
        E.font.text(g, 'Connect a controller or a keyboard to play.', W / 2, by + 26, '#f4ead5', { align: 'center', outline: false, wrap: bw - 16 });
        this.setBtn = { x: bx + 40, y: by + 52, w: bw - 80, h: 30 }; px.rect(g, this.setBtn.x, this.setBtn.y, this.setBtn.w, this.setBtn.h, '#e8b04a'); E.font.text(g, 'SETTINGS', W / 2, this.setBtn.y + 9, '#1a1418', { align: 'center', scale: 2, outline: false });
        return;
      }
      if (!this.pressed) { if (Math.floor(this.t * 2) % 2 === 0) Glyph.text(g, 'PRESS {a:start}', Math.round(W * .3), Math.round(r.H * .5), '#f4ead5', { align: 'center', scale: 2 }); }
      else { const lbl = Glyph.device() === 'pad' ? '{a:confirm} Choose   {a:cancel} Back' : Glyph.device() === 'mouse' ? 'Click to choose' : '↑ ↓ + Enter'; Glyph.text(g, lbl, Math.max(12, Math.round(W * .08)), r.H - 24, '#b8b0d8', {}); }
    });
    if (this.pressed && !B.touchOnly()) { this.menu.x = Math.max(12, Math.round(r.W * .08)); this.menu.y = Math.max(70, Math.round(r.H * .36)); this.menu.draw(r); }
  }
});

/* ---- CHARACTER SELECT: two apprentices on a rooftop; left / right or hover; a greeting in their own voice ---- */
const CHAR_GREET = { sojiro: 'Sojiro. I carry the katana, and the shop\'s name.', kaede: 'Kaede. Two blades, light feet. Try to keep up.' };
const charScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d || {}; this.i = Save.get().character === 'kaede' ? 1 : 0; this.t = 0; this.greetT = 0; B.Music.play('shop'); this.greet(); this.rects = []; },
  greet() { const id = this.id(); B.Voice.say(CHAR_GREET[id], id); this.greetT = 3; },
  id() { return this.i ? 'kaede' : 'sojiro'; },
  update(dt) {
    B.pollInput(); this.t += dt; this.greetT -= dt;
    const I = game.input; let ch = false;
    if (I.pressed('left') && this.i) { this.i = 0; ch = true; } if (I.pressed('right') && !this.i) { this.i = 1; ch = true; }
    const p = I.pointer(); if (p && B.mouseMode()) { const k = p[0] < game.W / 2 ? 0 : 1; if (k !== this.i) { this.i = k; ch = true; } }
    if (ch) { Au.sfx('uiMove'); this.greet(); }
    if (I.pressed('confirm') || I.clicked() || I.pressed('start')) { Au.sfx('uiConfirm'); this.choose(); return; }
    if (I.pressed('cancel')) { game.go('title', { menu: true }); return; }
    for (const [k, x] of [['sojiro', TMID - 40], ['kaede', TMID + 40]]) titleRig(k).update(dt, { x, y: 0, z: 32, facing: Math.PI / 2, vx: 0, vy: 0, stance: this.id() === k ? 'ready' : null, pose: this.id() === k && this.t % 6 < 1 ? 'cheer' : undefined });
    game.focus(TMID, 0, 32 + (game.H / 2 - 60) / -game.view.bz);
  },
  choose() {
    const id = this.id(), then = this.d.then;
    Save.get().character = id;
    if (then === 'story') Flow.newStory(id);
    else if (then === 'missions') game.go('missions', { char: id }, { fade: 'dissolve' });
    else if (then === 'trial') Flow.bento('delivery', id, 'trial');
    else game.go('title', { menu: true });
  },
  draw(r) {
    B.BACKDROPS.roof.draw(r); RIDGE.draw(r);
    for (const [k, x] of [['sojiro', TMID - 40], ['kaede', TMID + 40]]) r.actor(x, 0, 32, (g, ox, oy) => titleRig(k).draw(g, ox, oy, r.view), { flash: this.id() === k ? false : '#202040', flashMix: .5 });
    r.overlay(g => {
      const W = r.W, id = this.id(), C = CHARS[id];
      E.font.title(g, 'CHOOSE YOUR APPRENTICE', W / 2, 10, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      const pw = Math.min(W - 20, 300), x0 = Math.round((W - pw) / 2), y0 = 30, half = Math.round(pw * .42);
      px.blend(g, .82, 'normal', () => px.rect(g, x0, y0, pw, 62, '#140c0c')); px.rect(g, x0, y0, pw, 1, id === 'kaede' ? '#5ad8c8' : '#ff8a6a');
      E.font.title(g, C.name.toUpperCase(), x0 + 6, y0 + 5, { scale: 2, colors: ['#ffffff', id === 'kaede' ? '#5ad8c8' : '#ff8a6a'], depth: 1 });
      E.font.text(g, C.weapon, x0 + 6, y0 + 24, '#e8b04a', { outline: false });
      ['Strength', 'Speed', 'Stealth'].forEach((l, i) => { E.font.text(g, l, x0 + half, y0 + 5 + i * 10, '#b8a890', { outline: false }); E.ui.bar(g, x0 + half + 48, y0 + 7 + i * 10, pw - half - 56, 4, C.bars[i], '#d8402a'); });
      E.font.text(g, C.blurb, x0 + 6, y0 + 38, '#f4ead5', { outline: false, wrap: pw - 12 });
      if (this.greetT > 0) { const tw = E.font.width(CHAR_GREET[id]) + 16; px.blend(g, .8, 'normal', () => px.rect(g, Math.round((W - tw) / 2), r.H - 44, tw, 14, '#140c0c')); E.font.text(g, CHAR_GREET[id], W / 2, r.H - 41, '#f4ead5', { align: 'center', outline: false }); }
      Glyph.text(g, '{a:left} {a:right} Choose   {a:confirm} Begin   {a:cancel} Back', W / 2, r.H - 14, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- MISSION SELECT: the unlocked missions on a scroll, each with its best rank per apprentice ---- */
const missionsScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.char = (d && d.char) || Save.get().character || 'sojiro'; const done = Save.get().completed; this.list = STORY_ORDER.filter((id, i) => i === 0 || done[STORY_ORDER[i - 1]] || done[id] || (B.Dev && B.Dev.unlockAll)); this.i = 0; B.Music.play('shop'); this.rects = []; },
  update(dt) {
    B.pollInput(); const I = game.input;
    if (I.repeat('up')) { this.i = (this.i + this.list.length - 1) % this.list.length; Au.sfx('uiMove'); } if (I.repeat('down')) { this.i = (this.i + 1) % this.list.length; Au.sfx('uiMove'); }
    if (I.pressed('block') || I.pressed('grapple')) { this.char = this.char === 'kaede' ? 'sojiro' : 'kaede'; Au.sfx('uiMove'); }
    const p = I.pointer(); if (p && B.mouseMode()) for (const rc of this.rects) if (p[1] >= rc.y && p[1] < rc.y + rc.h && p[0] >= rc.x && p[0] < rc.x + rc.w) this.i = rc.i;
    const cl = I.clicked(); let pick = I.pressed('confirm'); if (cl) for (const rc of this.rects) if (cl[1] >= rc.y && cl[1] < rc.y + rc.h && cl[0] >= rc.x && cl[0] < rc.x + rc.w) { this.i = rc.i; pick = true; }
    if (pick) { Au.sfx('uiConfirm'); Flow.briefing(this.list[this.i], this.char, 'missions'); }
    if (I.pressed('cancel')) game.go('title', { menu: true });
  },
  draw(r) {
    paper(r); this.rects = [];
    r.overlay(g => {
      const W = r.W, sw = Math.min(300, W - 40), sx = Math.round((W - sw) / 2);
      E.font.title(g, 'MISSIONS', W / 2, 10, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      E.font.text(g, 'Playing as ' + CHARS[this.char].name, W / 2, 30, '#f4ead5', { align: 'center', outline: false }); Glyph.text(g, '{a:block} {a:grapple} Switch', W / 2, 40, '#b8a890', { align: 'center' });
      this.list.forEach((id, i) => { const m = B.get('mission', id), y = 56 + i * 34, on = i === this.i, best = (Save.get().best[id] || {});
        this.rects.push({ i, x: sx, y, w: sw, h: 30 });
        px.rect(g, sx, y, sw, 30, on ? '#e8dcc0' : '#2a1a14'); px.rect(g, sx, y, 3, 30, on ? '#8a1c1c' : '#4a2a20');
        E.font.text(g, m.chapter, sx + 10, y + 4, on ? '#8a1c1c' : '#b8a890', { outline: false }); E.font.text(g, m.title, sx + 10, y + 15, on ? '#1a1418' : '#f4ead5', { outline: false, scale: 1 });
        for (const [k, c] of [['sojiro', 0], ['kaede', 1]]) { const b = best[k], x = sx + sw - 50 + c * 24; if (b) { const rk = B.RANKS.find(q => q[1] === b.rank); Art.hanko(g, x, y + 15, 9, rk ? rk[2] : '?', .9); } else { px.rect(g, x - 8, y + 7, 16, 16, on ? '#d8ccb0' : '#3a2a20'); } E.font.text(g, k === 'kaede' ? 'K' : 'S', x, y + 25, on ? '#3a2a20' : '#8a7a6a', { align: 'center', font: 'tiny', outline: false }); } });
      Glyph.text(g, '{a:up} {a:down} Choose   {a:confirm} Brief   {a:cancel} Back', W / 2, r.H - 14, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- ABOUT / CREDITS: paged, large type ---- */
const aboutScene = Object.assign({}, MENU_SCENE, {
  enter() { this.p = 0; this.scroll = 0; this.pages = B.About.pages(); B.Music.play('shop'); },
  update(dt) {
    B.pollInput(); const I = game.input, n = this.pages.length;
    if (I.pressed('right') || I.pressed('grapple')) { this.p = (this.p + 1) % n; this.scroll = 0; Au.sfx('uiMove'); }
    if (I.pressed('left') || I.pressed('block')) { this.p = (this.p + n - 1) % n; this.scroll = 0; Au.sfx('uiMove'); }
    if (I.down('down')) this.scroll += dt * 60; if (I.down('up')) this.scroll = Math.max(0, this.scroll - dt * 60);
    if (B.wheel) { this.scroll = Math.max(0, this.scroll + B.wheel * 12); B.wheel = 0; }
    const cl = I.clicked(); if (cl) { if (cl[0] < game.W * .25) { this.p = (this.p + n - 1) % n; this.scroll = 0; } else if (cl[0] > game.W * .75) { this.p = (this.p + 1) % n; this.scroll = 0; } }
    if (I.pressed('cancel') || I.pressed('confirm')) game.go('title', { menu: true });
  },
  draw(r) {
    paper(r);
    const pg = this.pages[this.p];
    r.overlay(g => {
      const W = r.W, x0 = Math.round(W * .08), w = W - x0 * 2;
      E.font.title(g, pg[0].toUpperCase(), W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      let y = 34 - Math.round(this.scroll); const maxY = r.H - 22;
      for (const para of pg[1]) {
        const head = para.startsWith('# '), lines = E.font.wrap(head ? para.slice(2) : para, w);
        for (const l of lines) { if (y > 26 && y < maxY) E.font.text(g, l, x0, y, head ? '#e8b04a' : '#f4ead5', { outline: false, shadow: '#000' }); y += 10; }
        y += 4;
      }
      // the scroll stops where the page's last line sits above the prompt bar (it never scrolls the words away)
      const most = Math.max(0, y + Math.round(this.scroll) - maxY + 10); if (this.scroll > most) this.scroll = most;
      if (y > maxY) E.font.text(g, '↓ more', W - 8, maxY - 2, '#8a7a6a', { align: 'right', font: 'tiny', outline: false });
      px.rect(g, 0, r.H - 20, W, 20, '#140c0c');
      Glyph.text(g, '◀ {a:left}   Page ' + (this.p + 1) + ' of ' + this.pages.length + '   {a:right} ▶     {a:up}{a:down} Scroll   {a:cancel} Back', W / 2, r.H - 14, '#b8a890', { align: 'center' });
    });
  }
});
B.menuScenes = { title: titleScene, charSelect: charScene, missions: missionsScene, about: aboutScene };
