// Scenes: title (a living diorama, the attract countdown), new game, the intro crawl, play, results, credits.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;

// the touch-only notice: a coarse pointer, no fine one, no pad or key seen yet
DQ.touchOnly = (game) => {
  if (game.headless && !DQ._forceTouch) return false;
  if (DQ._forceTouch) return !DQ._sawKey;
  try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !DQ._sawKey && game.input.lastDevice !== 'gamepad' && game.input.padIndex === null; } catch (e) { return false; }
};

// a small generic chooser drawn on the title (Continue, New Game, ...): focus, hover, click
class TitleMenu {
  constructor(game, items) { this.game = game; this.items = items; this.focus = 0; this.rects = []; this.t = 0; this._pp = null; }
  update(dt) {
    const I = this.game.input, n = this.items.length; this.t += dt;
    if (I.repeat('up')) { this.focus = (this.focus + n - 1) % n; DQ.sfx(this.game, 'uiMove'); }
    if (I.repeat('down')) { this.focus = (this.focus + 1) % n; DQ.sfx(this.game, 'uiMove'); }
    const p = I.lastDevice === 'mouse' ? I.pointer() : null; if (p && (!this._pp || p[0] !== this._pp[0] || p[1] !== this._pp[1])) { this._pp = p.slice(); const h = this.at(p); if (h !== null && h !== this.focus) { this.focus = h; DQ.sfx(this.game, 'uiMove'); } }
    const c = this.at(I.clicked());
    if (c !== null) this.focus = c;
    const it = this.items[this.focus];
    if ((I.pressed('confirm') || I.pressed('start') || c !== null) && it && !it.disabled) { DQ.sfx(this.game, 'uiConfirm'); it.act(); return true; }
    return false;
  }
  at(p) { if (!p) return null; for (const [x, y, w, h, i] of this.rects) if (p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) return i; return null; }
  draw(g, cx, y) {
    this.rects = []; const w = 150, rh = 16;
    DQ.UI.panel(g, cx - w / 2, y, w, this.items.length * rh + 12, { alpha: .9 });
    this.items.forEach((it, i) => { const ry = y + 6 + i * rh, sel = i === this.focus; if (sel) { px.rect(g, cx - w / 2 + 6, ry, w - 12, rh - 2, '#3a3270'); DQ.UI.sel(g, cx - w / 2 + 6, ry, w - 12, rh - 2, this.t); E.font.text(g, '▸', cx - w / 2 + 10 + (Math.floor(this.t * 4) % 2), ry + 4, '#ffd36a', false); } DQ.UI.center(g, it.label, cx, ry + 4, it.disabled ? '#5a5478' : sel ? '#ffd36a' : '#ffffff'); this.rects.push([cx - w / 2 + 6, ry, w - 12, rh - 2, i]); });
  }
}
DQ.TitleMenu = TitleMenu;
DQ.sfx = (game, n) => { if (game._audioX) game._audioX.sfx(n); else game.audio.sfx('select'); };

// the title's diorama and the attract mode share a built-up demo world (made once)
DQ.demoSession = (game) => {
  const ctx = DQ.makeSession(game, { mode: 'attract', noFixed: true });
  DQ.applyBeat(ctx, 'hall');
  for (const [x, y] of [[88, 72], [64, 66], [80, 92]]) ctx.objects.add({ id: 'ballista', x, y, z: ctx.world.topZ(x, y), facing: 0 }, { force: true, silent: true });
  for (const [x, y] of [[70, 74], [75, 74], [70, 79], [75, 79]]) ctx.objects.add({ id: 'lantern', x, y, z: ctx.world.topZ(x, y) }, { force: true, silent: true });
  ctx.npcs.arrive('lintwick', { quiet: true }); ctx.flags.lintGifts = true;
  ctx.builder.body.x = 73.5 * T; ctx.builder.body.y = 80.5 * T; ctx.builder.body.z = ctx.world.topZ(73, 80) * T;
  ctx.clock.set(17.6); ctx.clock.frozen = false;
  ctx.quests.st('m1').state = 'done';
  return ctx;
};

DQ.SCENES = (game) => ({
  title: {
    input: DQ.Controls.PLAY, pausable: false, camera: { zoom: false },
    enter(data) {
      const s = this; s.t = 0; s.idle = 0; s.lastPtr = null; game.view && game.setView(DQ.baseView(game));
      if (!DQ._demo) DQ._demo = DQ.demoSession(game);
      s.ctx = DQ._demo; s.ctx.ui.close(); s.ctx.talk.cur = null; s.ctx.hud.popups = []; s.ctx.hud.toasts = [];
      s.ctx.clock.set(17.8); s.pan = 0; game.setZoom(1); game.resetCamera && game.resetCamera();
      const latest = game.saves && game.saves.latest && game.saves.latest();
      s.ui = new DQ.UIManager(s.ctx);
      s.menu = new TitleMenu(game, [
        { label: 'Continue', disabled: !latest, act: () => game.go('play', { load: latest }) },
        { label: 'New Game', act: () => game.go('newgame') },
        { label: 'Load Game', disabled: !(game.saves && game.saves.any), act: () => { game.saves.show('load', save => { if (save) game.go('play', { load: save }); }); } },
        { label: 'Quilting Bee', act: () => game.go('bee', { solo: true }) },
        { label: 'Settings', act: () => game.menu('settings') },
        { label: 'About & Credits', act: () => s.ui.open('about') }
      ]);
      if (!latest) s.menu.focus = 1;
      game._audioX && (game._audioX.vol = 1);
      game.audio.music(DQ.SONGS.title, { fade: .5 }); if (game._audioX) game._audioX.cur = 'title';
      game.weather = null;
    },
    update(dt) {
      const s = this, I = game.input; s.t += dt;
      // any input resets the attract countdown (not while the settings screen or a sub-screen is open)
      const p = I.pointer(); const moved = p && s.lastPtr && Math.hypot(p[0] - s.lastPtr[0], p[1] - s.lastPtr[1]) > 2; s.lastPtr = p ? p.slice() : null;
      if (I.anyPressed() || moved || I.held.size || (I.padMove && Math.hypot(...I.padMove) > .3)) s.idle = 0; else s.idle += dt;
      const settingsOpen = game._menuOpen || (game.shell && game.shell.screen) || (typeof document !== 'undefined' && document.querySelector && document.querySelector('[data-sys="menu"]:not([hidden])'));
      if (s.idle >= 10 && !settingsOpen) { game.go('attract'); return; }
      // the diorama: a slow camera pan around the town at dusk
      const ctx = s.ctx; ctx.clock.update(dt * .2); DQ.FX.update(dt); ctx.npcs.update(dt); ctx.objects.update(dt);
      s.pan += dt * .05; const cx = (72 + Math.cos(s.pan) * 9) * T, cy = (76 + Math.sin(s.pan) * 7) * T; game.focus(cx, cy, 10 * T);
      if (s.ui.update(dt)) return;
      if (DQ.touchOnly(game)) return;
      s.menu.update(dt);
    },
    draw(r) {
      const s = this, ctx = s.ctx, b = ctx.builder; b.body.x = -999;
      ctx.renderer.drawVoid(r, true); ctx.renderer.queue(r, ctx.world); ctx.objects.draw(r); ctx.town.draw(r); ctx.npcs.draw(r); DQ.FX.draw(r);
      if (r.game.lights.on) ctx.renderer.addLights(r, ctx.world, 50, 50, 100, 100);
      ctx.clock.applyLight(game, 'town');
      b.body.x = 73.5 * T;
      r.overlay(g => {
        const W = r.W, H = r.H, t = s.t;
        DQ.UI.logo(g, W / 2, 22, W < 380 ? 3 : 4, t);
        if (DQ.touchOnly(game)) {
          DQ.UI.panel(g, W / 2 - 120, H / 2 + 6, 240, 46, { thread: '#ffd36a' });
          DQ.UI.center(g, 'Controller or keyboard required', W / 2, H / 2 + 14, '#ffd36a', { scale: 1 });
          DQ.UI.center(g, 'Connect a controller or keyboard to play.', W / 2, H / 2 + 30, '#ffffff');
          return;
        }
        s.menu.draw(g, W / 2, Math.round(H * .48));
        if (Math.floor(t * 2) % 2 === 0) DQ.Glyphs.text(g, game, 'Press {btn:confirm} to choose', Math.round(W / 2 - DQ.Glyphs.width(game, 'Press {btn:confirm} to choose') / 2), H - 22, '#fff0c0');
        DQ.UI.text(g, 'Dragon Quilt Builders ' + DQ.VERSION + ' - engine ' + String(E.versionLabel ? E.versionLabel() : E.version).replace(/[^\x20-\x7e]/g, '-'), 4, H - 10, '#6a6488', { font: 'tiny' });
      });
      s.ui.draw(r);
    }
  },
  newgame: {
    input: DQ.Controls.PLAY, pausable: false,
    enter() {
      const s = this; s.t = 0; s.name = 'Patch'; s.row = 0; s.look = 'A'; s.pal = 0; s.diff = 1; s.gx = 0; s.gy = 0; s.rects = []; s.rig = DQ.makeBuilderRig('A', 0); s.turn = 0;
      s.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-'.split('').concat(['DEL', 'END']);
      s.onKey = e => { if (game.scene !== game.scenes.newgame) return; if (e.key && e.key.length === 1 && /[A-Za-z0-9 \-']/.test(e.key) && s.row === 0) { if (s.name.length < 12) s.name += e.key; s.typed = true; } else if (e.key === 'Backspace' && s.row === 0) { s.name = s.name.slice(0, -1); s.typed = true; } };
      if (typeof window !== 'undefined' && window.addEventListener && !DQ._keyHooked) { DQ._keyHooked = true; window.addEventListener('keydown', e => { DQ._sawKey = true; if (game.scene === game.scenes.newgame && game.scenes.newgame.onKey) game.scenes.newgame.onKey(e); }); }
    },
    update(dt) {
      const s = this, I = game.input; s.t += dt; s.turn += dt * .8; s.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: s.turn });
      const rows = 5;
      // row 0: the name grid; 1: look; 2: palette; 3: difficulty; 4: start
      if (s.row === 0) {
        const cols = 13, n = s.letters.length;
        if (I.repeat('left')) s.gx = (s.gx + cols - 1) % cols; if (I.repeat('right')) s.gx = (s.gx + 1) % cols;
        if (I.repeat('up')) s.gy = Math.max(0, s.gy - 1); if (I.repeat('down')) { if ((s.gy + 1) * cols < n) s.gy++; else { s.row = 1; } }
        const k = Math.min(n - 1, s.gy * cols + s.gx);
        if (I.pressed('confirm') && !s.typed) { const L = s.letters[k]; if (L === 'DEL') s.name = s.name.slice(0, -1); else if (L === 'END') s.row = 1; else if (s.name.length < 12) s.name += L; DQ.sfx(game, 'uiMove'); }
        if (I.pressed('interact') || (I.pressed('cancel') && !s.typed)) s.name = s.name.slice(0, -1);
        if (I.pressed('start') && s.typed) s.row = 4;
        s.typed = false;
      } else {
        if (I.repeat('up')) s.row = Math.max(0, s.row - 1); if (I.repeat('down')) s.row = Math.min(rows - 1, s.row + 1);
        const d = I.repeat('left') ? -1 : I.repeat('right') ? 1 : 0;
        if (d && s.row === 1) { s.look = s.look === 'A' ? 'B' : 'A'; s.rig = DQ.makeBuilderRig(s.look, s.pal); }
        if (d && s.row === 2) { s.pal = (s.pal + d + 4) % 4; s.rig = DQ.makeBuilderRig(s.look, s.pal); }
        if (d && s.row === 3) s.diff = E.clamp(s.diff + d, 0, 2);
        if (d) DQ.sfx(game, 'uiMove');
        if ((I.pressed('confirm') || I.pressed('start')) && s.row === 4) s.begin();
        if (I.pressed('cancel')) { if (s.row > 0) s.row = 0; else game.go('title'); }
      }
      const c = I.clicked(); if (c) for (const [x, y, w, h, id] of s.rects) if (c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h) { if (typeof id === 'number') { s.row = 0; s.gy = Math.floor(id / 13); s.gx = id % 13; const L = s.letters[id]; if (L === 'DEL') s.name = s.name.slice(0, -1); else if (L === 'END') s.row = 1; else if (s.name.length < 12) s.name += L; } else if (id === 'look') { s.row = 1; s.look = s.look === 'A' ? 'B' : 'A'; s.rig = DQ.makeBuilderRig(s.look, s.pal); } else if (id === 'pal') { s.row = 2; s.pal = (s.pal + 1) % 4; s.rig = DQ.makeBuilderRig(s.look, s.pal); } else if (id === 'diff') { s.row = 3; s.diff = (s.diff + 1) % 3; } else if (id === 'start') s.begin(); }
      const p = I.lastDevice === 'mouse' && I.pointer(); if (p) for (const [x, y, w, h, id] of s.rects) if (p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h && s._pp !== p[0] + ',' + p[1]) { if (typeof id === 'number') { s.row = 0; s.gy = Math.floor(id / 13); s.gx = id % 13; } else s.row = { look: 1, pal: 2, diff: 3, start: 4 }[id]; } if (p) s._pp = p[0] + ',' + p[1];
    },
    begin() { const s = this; game.settings.set('dqDifficulty', ['Relaxed', 'Normal', 'Hard'][s.diff]); game.go('intro', { name: (s.name || 'Patch').trim() || 'Patch', look: s.look, pal: s.pal }); },
    draw(r) {
      const s = this; r.sky(['#0c0a24', '#1a1640', '#2a1f50']);
      r.overlay(g => {
        const W = r.W, H = r.H, ui = DQ.UI; s.rects = [];
        E.font.title(g, 'A New Builder', W / 2, 8, { scale: 2, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', align: 'center' });
        ui.panel(g, 10, 30, W - 130, H - 40);
        ui.text(g, 'Name', 20, 38, '#ffd36a'); px.rect(g, 60, 36, 110, 12, '#120e26'); ui.text(g, s.name + (Math.floor(s.t * 2) % 2 && s.row === 0 ? '_' : ''), 64, 38, '#ffffff');
        s.letters.forEach((L, i) => { const x = 20 + (i % 13) * 19, y = 54 + Math.floor(i / 13) * 14, sel = s.row === 0 && i === s.gy * 13 + s.gx, w = L.length > 1 ? 17 : 15; if (sel) { px.rect(g, x - 2, y - 2, w + 2, 12, '#3a3270'); ui.sel(g, x - 2, y - 2, w + 2, 12, s.t); } ui.text(g, L, x + (L.length > 1 ? -1 : 3), y, sel ? '#ffd36a' : '#ffffff', { font: L.length > 1 ? 'tiny' : undefined }); s.rects.push([x - 2, y - 2, w + 2, 12, i]); });
        const opts = [['look', 'Look', s.look === 'A' ? 'Spiky hair and bandana' : 'Ponytail and apron'], ['pal', 'Colours', ['Denim', 'Meadow', 'Berry', 'Honey'][s.pal]], ['diff', 'Difficulty', ['Relaxed', 'Normal', 'Hard'][s.diff]]];
        opts.forEach(([id, k, v], i) => { const y = 124 + i * 16, sel = s.row === i + 1; if (sel) { px.rect(g, 16, y - 3, W - 152, 14, '#3a3270'); ui.sel(g, 16, y - 3, W - 152, 14, s.t); } ui.text(g, k, 22, y, '#ffd36a'); ui.text(g, '← ' + v + ' →', 100, y, sel ? '#ffd36a' : '#ffffff'); s.rects.push([16, y - 3, W - 152, 14, id]); });
        const sy = H - 34, sel = s.row === 4; px.rect(g, 16, sy, 120, 16, sel ? '#4a3a7a' : '#221c40'); if (sel) ui.sel(g, 16, sy, 120, 16, s.t); ui.center(g, 'Begin the story', 76, sy + 5, sel ? '#ffd36a' : '#ffffff'); s.rects.push([16, sy, 120, 16, 'start']);
        DQ.Glyphs.text(g, game, '{btn:confirm} Choose  {btn:interact} Delete  Type a name with the keyboard', 150, sy + 5, '#c8c0e0');
        // the live preview
        ui.panel(g, W - 112, 30, 102, 130, { bg: ['#3a3264', '#241e44'] });
        s.rig.draw(g, W - 61, 140, DQ.VIEW_ISO);
        ui.center(g, s.name || 'Patch', W - 61, 148, '#ffd36a');
        const dz = ['Lost Bundles keep everything; half damage.', 'The way it is meant to be played.', 'Monsters hit 40% harder.'][s.diff]; E.font.wrap(dz, 98).forEach((ln, i) => ui.text(g, ln, W - 108, 166 + i * 9, '#c8c0e0', { font: 'tiny' }));
      });
    }
  },
  intro: {
    input: DQ.Controls.PLAY, pausable: false,
    enter(data) { const s = this; s.data = data; s.page = 0; s.t = 0; s.shown = 0; game.audio.music(DQ.SONGS.lullaby, { fade: .5 }); if (game._audioX) game._audioX.cur = 'lullaby'; s.skipT = 0; },
    update(dt) {
      const s = this, I = game.input, P = DQ.LINES.intro; s.t += dt; const txt = P[s.page];
      const prev = Math.floor(s.shown); s.shown = Math.min(txt.length, s.shown + dt * 30);
      if (game._audioX) for (let q = prev; q < Math.floor(s.shown); q++) game._audioX.voiceLetter('granny', txt[q], q, txt);
      if (I.down('cancel') || I.down('pause')) s.skipT += dt; else s.skipT = 0;
      if (s.skipT > .8) { game.go('play', Object.assign({ fresh: true }, s.data)); return; }
      if (I.pressed('confirm') || I.pressed('jump') || I.clicked()) { if (s.shown < txt.length) s.shown = txt.length; else if (s.page < P.length - 1) { s.page++; s.shown = 0; } else game.go('play', Object.assign({ fresh: true }, s.data)); }
    },
    draw(r) {
      const s = this; r.sky(['#05041a', '#0d0b2a', '#1a1238']);
      r.overlay(g => {
        const W = r.W, H = r.H, t = s.t;
        for (let i = 0; i < 70; i++) { const x = (DQ.hash2(i, 1) * W + t * 3 * (1 + i % 3)) % W, y = (DQ.hash2(i, 2) * H - t * 2) % H; px.rect(g, Math.round(x), Math.round((y + H) % H), 1, 1, i % 4 ? '#8a84b0' : '#e8dcc0'); }
        // a patchwork quilt fraying at the edges
        const cx = W / 2, cy = H * .36; for (let y = -3; y <= 3; y++) for (let x = -5; x <= 5; x++) { const fr = Math.abs(x) + Math.abs(y) > 6 - s.page; if (fr && DQ.hash2(x, y) < .6) continue; px.rect(g, cx + x * 12 - 6, cy + y * 12 - 6, 11, 11, ['#d04a4a', '#4a6ad0', '#e8c040', '#5aa04a', '#a050c0', '#c8955a'][Math.abs(x * 7 + y * 3) % 6]); px.rect(g, cx + x * 12 - 6, cy + y * 12 - 6, 11, 1, '#f1e6c8'); }
        const txt = DQ.LINES.intro[s.page].slice(0, Math.floor(s.shown)), lines = E.font.wrap(txt, Math.min(W - 40, 320));
        lines.forEach((ln, i) => DQ.UI.center(g, ln, W / 2, H * .66 + i * 12, '#ffe8a0'));
        DQ.Glyphs.text(g, game, '{btn:confirm} Next   Hold {btn:cancel} to skip', W - 150, H - 14, '#8a84b0');
      });
    }
  },
  play: {
    input: DQ.Controls.PLAY, pausable: true, camera: { zoom: false },
    enter(data = {}) {
      const s = this; data = data || {};
      game.setView(DQ.baseView(game));
      const ctx = s.ctx = DQ.makeSession(game, { mode: 'story', name: data.name, look: data.look, pal: data.pal });
      DQ.current = ctx; ctx.save = new DQ.SaveHandle(ctx); ctx.inHub = DQ.inHub;
      game.input.wheelGame = true;
      ctx.onChapterClear = () => { game.after(2, () => game.go('results', { ctx })); };
      if (data.load && data.load.data) { try { DQ.Save.read(ctx, data.load.data); } catch (e) { DQ.fail('load', e); } if (data.retry) ctx.game.after(.5, () => { ctx.siege.start({ prep: 20 }); ctx.quests.st('m13').step = 2; }); }
      else if (data.resume) { DQ.resumeFreePlay(ctx, data.resume); }
      else { ctx.quests.update(0, true); if (!data.skipIntro) ctx.cutscenes.play('wake'); }
      const z = E.store.get('dqb-zoom', 1); ctx.zoom = DQ.ZOOMS.includes(z) ? z : 1; game.setZoom(ctx.zoom);
      game.lights.enabled = true; game.cam.smooth = .12; game.cam.bounds = v => ctx.world.bounds(v); game.cam.snap = true;
      if (game.saves) { game.saves.write = () => DQ.Save.write(ctx); game.saves.read = save => game.go('play', { load: save }); }
      ctx.audioX.cur = null;
    },
    exit() { game.input.wheelGame = false; game.weather = null; },
    update(dt) {
      const s = this, ctx = s.ctx; ctx.stats.playTime += dt;
      if (game.saves) game.saves.canSave = ctx.save.canSave();
      DQ.sessionUpdate(ctx, dt);
      if (DQ.Dev.frameStep && game.paused && game.input.pressed('confirm')) { game.paused = false; game.after(1 / 120, () => { game.paused = true; }); }
    },
    draw(r) { DQ.sessionDraw(this.ctx, r); }
  },
  results: {
    input: DQ.Controls.PLAY, pausable: false,
    enter(data) { this.ctx = data.ctx; this.t = 0; game.audio.music(DQ.SONGS.finale, { fade: 1 }); if (game._audioX) game._audioX.cur = 'finale'; },
    update(dt) { this.t += dt; const I = game.input; if (this.t > 1 && (I.pressed('confirm') || I.pressed('start') || I.clicked())) game.go('credits', { ctx: this.ctx }); },
    draw(r) {
      const ctx = this.ctx, b = ctx.builder, st = ctx.stats; r.sky(['#1a1036', '#2a1f50', '#3a2a5a']);
      r.overlay(g => {
        const W = r.W, H = r.H, ui = DQ.UI;
        E.font.title(g, 'CHAPTER ONE CLEAR!', W / 2, 10, { scale: 3, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', depth: 2, align: 'center' });
        ui.center(g, 'A Stitch in Time', W / 2, 38, '#ffd36a');
        ui.panel(g, W / 2 - 150, 52, 300, H - 76, { thread: '#ffd36a' });
        ui.panel(g, W / 2 - 140, 62, 70, 84, { bg: ['#3a3264', '#241e44'] }); b.rig.drawPortrait(g, W / 2 - 135, 66, 60, { bg: '#3a3264', shadow: false }); ui.center(g, b.name, W / 2 - 105, 132, '#ffd36a');
        const rows = [['Play time', DQ.fmtTime(st.playTime)], ['Blocks placed', st.blocksPlaced], ['Blocks broken', st.blocksBroken], ['Items crafted', st.crafted], ['Rooms built', st.rooms], ['Monsters defeated', st.kills], ['Cheer earned', st.cheerEarned]];
        rows.forEach(([k, v], i) => { ui.text(g, k, W / 2 - 60, 66 + i * 12, '#c8c0e0'); ui.text(g, String(v), W / 2 + 120 - E.font.width(String(v)), 66 + i * 12, '#ffffff'); });
        if (this.t > 1 && Math.floor(this.t * 2) % 2 === 0) DQ.Glyphs.text(g, game, '{btn:confirm} Continue to the credits', W / 2 - 70, H - 18, '#fff0c0');
      });
    }
  },
  credits: {
    input: DQ.Controls.PLAY, pausable: false,
    enter(data) { this.ctx = data.ctx; this.t = 0; this.y = 0; },
    update(dt) { this.t += dt; const I = game.input; this.y += dt * (I.down('confirm') || I.down('jump') ? 60 : 18); if (this.y > this.len + 40 || I.pressed('start') || I.pressed('cancel')) { game.go('play', { resume: DQ.Save.write(this.ctx) }); } },
    draw(r) {
      const lines = ['DRAGON QUILT BUILDERS', '', 'Chapter One: A Stitch in Time', '', '', 'DESIGN, CODE, ART, MUSIC AND WORDS', 'Anthropic claude-opus-5-5', 'from the plan PLAN.md', '', 'ENGINE', 'my-3D2dge v0.85.2 by michaelcrosato', '', 'ONLINE', 'AI Hub session client 1.4.0', '', 'STARRING', 'Granny Gossamer', 'Wren Tuck', 'Mortimer Bodkin', 'Marigold Purl', 'Professor Hemsley Selvage', 'Lintwick', '', 'AND INTRODUCING', 'Sir Buttonsworth', 'Gnarlgrim the Knotted', 'Frayvern (as a silhouette)', '', 'An original game inspired by', 'Dragon Quest Builders (Square Enix).', 'Not affiliated or endorsed.', '', '', 'To be continued...', 'Chapter Two: The Calico Coast', '', '', 'Thank you for playing!', '', 'Thimbleton is still yours to build.'];
      this.len = lines.length * 14 + r.H; r.sky(['#05041a', '#0d0b2a', '#1a1238']);
      r.overlay(g => { lines.forEach((ln, i) => { const y = r.H - this.y + i * 14; if (y < -10 || y > r.H) return; const big = ln === ln.toUpperCase() && ln.length > 3; DQ.UI.center(g, ln, r.W / 2, y, big ? '#ffd36a' : '#ffffff'); }); for (let i = 0; i < 20; i++) { const x = (DQ.hash2(i, 9) * r.W + this.t * 20) % r.W; px.rect(g, Math.round(x), Math.round((DQ.hash2(i, 8) * r.H + this.t * 30) % r.H), 2, 2, ['#d04a4a', '#4a6ad0', '#e8c040', '#5aa04a'][i % 4]); } });
    }
  }
});
// back to free play after the credits: reload the state, the party over
DQ.resumeFreePlay = (ctx, save) => { DQ.Save.read(ctx, save.data); ctx.flags.freePlay = true; ctx.game.cam.snap = true; ctx.hud.banner('Free play: Thimbleton is yours!'); };
DQ.baseView = game => (game.settings && game.settings.dqView === 'Three-quarter') ? DQ.VIEW_TQ : DQ.VIEW_ISO;
})();
