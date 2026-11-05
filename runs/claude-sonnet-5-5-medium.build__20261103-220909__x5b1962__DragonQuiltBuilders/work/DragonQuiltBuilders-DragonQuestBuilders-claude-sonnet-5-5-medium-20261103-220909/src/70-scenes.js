// Scenes: title (with attract countdown), new game, intro crawl, play, attract, results; about/credits panels.
(() => {
const { E, T } = DQ;
const px = E.px, F = DQ.F;
const PAL = ['#e8736a', '#f0b84a', '#6fae4f', '#5aa8e8', '#a86ae8', '#e88ab8', '#f4ecd8', '#4a8a8a'];

// ---------- text input for the name ----------
DQ.typed = [];
if (typeof window !== 'undefined') window.addEventListener('keydown', e => { if (e.key && e.key.length === 1 && /[A-Za-z0-9 ]/.test(e.key)) DQ.typed.push(e.key); else if (e.key === 'Backspace') DQ.typed.push('\b'); });

DQ.PANELS.newgame = class {
  constructor(o) { this.name = ''; this.look = 0; this.swatch = 0; this.row = 0; this.col = 0; this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); this.focus = 'grid'; this.sel = 0; this.preview = null; }
  items() { return ['grid', 'look', 'swatch', 'start']; }
  update(dt, I) {
    DQ.typed.length = DQ.typed.length > 20 ? 0 : DQ.typed.length;
    while (DQ.typed.length) { const c = DQ.typed.shift(); if (c === '\b') this.name = this.name.slice(0, -1); else if (this.name.length < 8) this.name += this.name.length ? c.toLowerCase() : c.toUpperCase(); }
    if (I.pressed('cancel') && !this.name.length) { DQ.ui.close(); return; } else if (I.pressed('cancel')) { this.name = this.name.slice(0, -1); }
    const [dx, dy] = DQ.navStep(I), n = this.letters.length, cols = 10;
    if (this.focus === 'grid') {
      const idx = this.sel; if (dx) this.sel = Math.max(0, Math.min(n + 1, idx + dx)); if (dy) { if (dy > 0 && idx + cols >= n + 2) this.focus = 'look'; else this.sel = Math.max(0, Math.min(n + 1, idx + dy * cols)); }
      if (I.pressed('confirm') || I.pressed('place')) { if (this.sel < n) { if (this.name.length < 8) this.name += this.name.length ? this.letters[this.sel].toLowerCase() : this.letters[this.sel]; DQ.audio.sfx('tick', { vol: .5 }); } else if (this.sel === n) this.name = this.name.slice(0, -1); else this.focus = 'start'; }
    } else if (this.focus === 'look') { if (dx) this.look = (this.look + dx + 2) % 2; if (dy > 0) this.focus = 'swatch'; if (dy < 0) this.focus = 'grid'; }
    else if (this.focus === 'swatch') { if (dx) this.swatch = (this.swatch + dx + 4) % 4; if (dy > 0) this.focus = 'start'; if (dy < 0) this.focus = 'look'; }
    else if (this.focus === 'start') { if (dy < 0) this.focus = 'swatch'; if (I.pressed('confirm')) this.go(); }
    if (!this.preview || this.pk !== this.look + ':' + this.swatch) { this.preview = DQ.heroRig(this.look, this.swatch); this.pk = this.look + ':' + this.swatch; }
    this.preview.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(DQ.game.time) * .4, pose: this.focus === 'start' ? 'cheer' : null });
  }
  go() { const nm = this.name || 'Patch'; DQ.ui.closeAll(); DQ.game.go('intro', { name: nm, look: this.look, swatch: this.swatch }); }
  draw(g, r) {
    const w = Math.min(r.W - 30, 360), x = (r.W - w) / 2, y = 10, ht = r.H - 20; DQ.stitchBox(g, x, y, w, ht);
    F(g, 'Who are you, Builder?', x + w / 2, y + 9, '#ffd36a', { align: 'center' });
    F(g, 'Name', x + 14, y + 26, '#c8c0e8'); px.rect(g, x + 44, y + 22, 90, 14, '#0a0818'); F(g, this.name + (Math.floor(DQ.game.time * 2) % 2 ? '_' : ''), x + 48, y + 26, '#fff');
    const cols = 10;
    this.letters.concat(['<', 'OK']).forEach((l, i) => { const cx = x + 14 + (i % cols) * 21, cy = y + 42 + Math.floor(i / cols) * 17, sel = this.focus === 'grid' && this.sel === i; px.rect(g, cx, cy, 19, 15, sel ? '#ffd36a' : '#2a2450'); F(g, l, cx + 10, cy + 4, sel ? '#2a1a00' : '#fff', { align: 'center', shadow: sel ? null : '#000' }); DQ.ui.hit(cx, cy, 20, 15, { focus: () => { this.focus = 'grid'; this.sel = i; }, click: () => { this.focus = 'grid'; this.sel = i; if (i < 26) { if (this.name.length < 8) this.name += this.name.length ? l.toLowerCase() : l; } else if (i === 26) this.name = this.name.slice(0, -1); else this.focus = 'start'; } }); });
    const ry = y + 42 + 3 * 17 + 6;
    px.rect(g, x + 14, ry, 100, 14, this.focus === 'look' ? '#ffd36a' : '#2a2450'); F(g, '< Look ' + (this.look ? 'B' : 'A') + ' >', x + 64, ry + 4, this.focus === 'look' ? '#2a1a00' : '#fff', { align: 'center', shadow: this.focus === 'look' ? null : '#000' }); DQ.ui.hit(x + 14, ry, 100, 14, { focus: () => { this.focus = 'look'; }, click: () => { this.look = 1 - this.look; } });
    for (let i = 0; i < 4; i++) { const sx = x + 14 + i * 22, sy = ry + 20; px.rect(g, sx, sy, 20, 14, this.focus === 'swatch' && this.swatch === i ? '#ffd36a' : '#0a0818'); px.rect(g, sx + 2, sy + 2, 8, 10, DQ.SWATCHES[i][0]); px.rect(g, sx + 10, sy + 2, 8, 10, DQ.SWATCHES[i][1]); DQ.ui.hit(sx, sy, 20, 14, { focus: () => { this.focus = 'swatch'; }, click: () => { this.swatch = i; } }); }
    const by = ry + 40; px.rect(g, x + 14, by, 100, 15, this.focus === 'start' ? '#ffd36a' : '#3a6a3a'); F(g, 'Begin!', x + 64, by + 4, this.focus === 'start' ? '#2a1a00' : '#fff', { align: 'center', shadow: this.focus === 'start' ? null : '#000' }); DQ.ui.hit(x + 14, by, 100, 15, { focus: () => { this.focus = 'start'; }, click: () => this.go() });
    // preview
    const ox = x + w - 60, oy = y + ht - 38; px.rect(g, ox - 38, y + 40, 76, ht - 56, '#120f2c'); px.rect(g, ox - 36, y + 42, 72, ht - 60, '#241e50');
    if (this.preview) { const rr = DQ.game.r; try { this.preview.draw(g, ox, oy - 22, DQ.game.view); } catch (e) { } }
    DQ.prompts(g, [['confirm', 'Pick'], ['cancel', 'Back'], ['place', 'Pick']].slice(0, 2), x + 10, y + ht - 14);
  }
};

DQ.PANELS.results = class {
  constructor(o) { this.o = o; this.t = 0; }
  update(dt, I) { this.t += dt; if (this.t > .8 && (I.pressed('confirm') || I.pressed('start'))) { DQ.ui.closeAll(); if (this.o.bee) DQ.game.go('title'); else { DQ.S.chapterShown = true; } } }
  draw(g, r) {
    const S = DQ.S, w = 300, x = (r.W - w) / 2, y = 20, ht = r.H - 40; DQ.stitchBox(g, x, y, w, ht, { border: '#ffd36a' });
    if (this.o.bee) {
      const b = S.bee; E.font.title(g, b.why === 'time' ? 'BEE COMPLETE!' : 'BANNER FELL', x + w / 2, y + 14, { scale: 2, align: 'center' });
      const rows = [['Score', b.final], ['Monsters stitched', b.kills], ['Blocks placed', S.stats.placed], ['Banner HP', Math.max(0, Math.round(S.town.bannerHp))]];
      rows.forEach(([k, v], i) => { F(g, k, x + 40, y + 52 + i * 14, '#c8c0e8'); F(g, v, x + w - 40, y + 52 + i * 14, '#fff', { align: 'right' }); });
      F(g, b.final >= 220 ? 'Grade: S - Master Quilter!' : b.final >= 140 ? 'Grade: A - Seamless!' : b.final >= 80 ? 'Grade: B - Neat stitching' : 'Grade: C - A bit frayed', x + w / 2, y + 120, '#ffd36a', { align: 'center' });
    } else {
      E.font.title(g, 'CHAPTER ONE CLEAR', x + w / 2, y + 12, { scale: 2, align: 'center' }); F(g, 'A Stitch in Time', x + w / 2, y + 36, '#ffd36a', { align: 'center' });
      const mins = Math.floor(S.played / 60);
      const rows = [['Play time', mins + ' min'], ['Thimbleton', 'Level ' + S.town.level + ', Cheer ' + S.town.cheer], ['Rooms built', Object.values(S.stats.rooms).reduce((a, b) => a + b, 0)], ['Monsters stitched', S.stats.kills], ['Blocks broken / placed', S.stats.broken + ' / ' + S.stats.placed], ['Ancient Buttons', S.stats.buttons + ' / 14'], ['Times undone', S.stats.deaths]];
      rows.forEach(([k, v], i) => { F(g, k, x + 24, y + 54 + i * 12, '#c8c0e8'); F(g, v, x + w - 24, y + 54 + i * 12, '#fff', { align: 'right' }); });
      F(g, 'Free play continues. Build on, Builder!', x + w / 2, y + ht - 34, '#8affd0', { align: 'center' });
    }
    DQ.prompts(g, [['confirm', 'Continue']], x + 10, y + ht - 14);
  }
};

// ---------- About / credits ----------
DQ.aboutLines = function () {
  return DQ.ABOUT.concat(['', 'Engine changes: ' + DQ.ENGINE_CHANGES]);
};

// ---------- scenes ----------
DQ.makeScenes = function (game) {
  const title = {
    idle: 0, mi: 0,
    enter() {
      this.idle = 0; DQ.attractOn = false; DQ.ui.closeAll(); DQ.audio.music('title'); DQ.fade = 0;
      const has = !!(game.saves && game.saves.latest && game.saves.latest());
      const items = []; if (has) items.push({ label: 'Continue' }); items.push({ label: 'New Game' }, { label: 'Quilting Bee' }, { label: 'Settings' }, { label: 'About & Credits' });
      this.items = items.map(i => i.label);
      this.menu = new E.Menu(game, items, { x: 'center', y: Math.round(game.H * .55), onPick: (i, it) => this.pick(it.label) });
    },
    pick(l) {
      DQ.audio.sfx('confirm', { vol: .5 });
      if (l === 'Continue') { try { const s = game.saves.latest(); game.saves.load(s.slot !== undefined ? s.slot : s); } catch (e) { DQ.err('continue', e); } }
      else if (l === 'New Game') DQ.ui.open('newgame');
      else if (l === 'Quilting Bee') game.go('play', { mode: 'bee' });
      else if (l === 'Settings') game.menu('settings');
      else if (l === 'About & Credits') DQ.ui.open('info', { title: 'About & Credits', lines: DQ.aboutLines() });
    },
    update(dt) {
      const I = game.input;
      if (DQ.ui.isOpen()) { DQ.ui.update(dt); this.idle = 0; return; }
      const any = I.anyPressed() || Math.hypot(...(I.padMove || [0, 0])) > .3 || (I.padAim && Math.hypot(...I.padAim) > .3);
      const p = I.pointer(); const moved = p && this.lp && (Math.abs(p[0] - this.lp[0]) + Math.abs(p[1] - this.lp[1])) > 3; this.lp = p ? [p[0], p[1]] : null;
      if (any || moved) this.idle = 0; else this.idle += dt;
      this.menu.update(dt);
      if (this.idle > 10) game.go('attract');
    },
    draw(r) {
      const t = game.time; r.sky(['#120a30', '#2a1850', '#4a2a70']);
      r.overlay(g => {
        const W = r.W, H = r.H, sz = 26;
        for (let y = -1; y < H / sz + 2; y++) for (let x = -1; x < W / sz + 2; x++) {
          const ox = (t * 6) % (sz * 2), gx = x + Math.floor((t * 6) / (sz * 2)) * 2 + ((y & 1) ? 1 : 0), c = PAL[Math.abs(DQ.hash(gx + ',' + y) % PAL.length)];
          const px0 = x * sz - (t * 6) % (sz * 2) + ((y & 1) ? 0 : 0), py0 = y * sz;
          px.blend(g, .22, 'normal', () => px.rect(g, px0, py0, sz - 2, sz - 2, c)); for (let k = 3; k < sz - 5; k += 4) { px.rect(g, px0 + k, py0 + 2, 2, 1, '#f3e9c8'); px.rect(g, px0 + k, py0 + sz - 5, 2, 1, '#f3e9c8'); px.rect(g, px0 + 2, py0 + k, 1, 2, '#f3e9c8'); px.rect(g, px0 + sz - 5, py0 + k, 1, 2, '#f3e9c8'); }
        }
        px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0620'));
        E.font.title(g, 'DRAGON', W / 2, H * .13, { scale: 3, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'], depth: 2 });
        E.font.title(g, 'QUILT BUILDERS', W / 2, H * .13 + 27, { scale: 3, align: 'center', colors: ['#fff6c8', '#ff9ac8', '#c0407a'], depth: 2 });
        F(g, 'A stitch-by-stitch building adventure', W / 2, H * .13 + 56, '#f3e9c8', { align: 'center' });
        const my = Math.round(game.H * .55); F(g, game.input.lastDevice === 'gamepad' ? '' : '', 0, 0);
        if (DQ.touchOnly) { F(g, 'Controller or keyboard required', W / 2, H - 40, '#ffb070', { align: 'center', scale: 1 }); }
        if (!DQ.ui.isOpen() && !DQ.touchOnly) DQ.prompts(g, [['confirm', 'Choose'], ['cancel', 'Back']], 8, H - 14);
        F(g, 'v' + DQ.VERSION + '  ' + (DQ.TAGLINE || ''), W - 6, H - 11, '#8a84b8', { align: 'right' });
      });
      this.menu.draw(r);
      DQ.ui.draw(r);
    }
  };
  const intro = {
    enter(d) { this.d = d; this.page = 0; this.t = 0; this.pages = [
      ['Long ago, Granny Gossamer, the Great Quilter, stitched the world from a thousand scraps and one Golden Thread.', 'Every patch had its place. Every seam held fast. And everyone had the Knack: the gift of making things.'],
      ['Then Frayvern the dragon pulled the Golden Thread and swallowed the Knack whole.', 'Beds became rumours. Walls became legends. Even doors forgot how to door.'],
      ['But one scrap of the quilt still remembers. One Builder can still make things on purpose.', 'That Builder is ' + d.name + '. Wake up, dearie. We have patches to mend.']]; DQ.audio.music('night'); },
    update(dt) { this.t += dt; if (game.input.pressed('confirm') || game.input.clicked()) { this.page++; this.t = 0; DQ.audio.sfx('select', { vol: .4 }); if (this.page >= this.pages.length) game.go('play', { new: true, ...this.d }); } if (game.input.pressed('cancel') || game.input.pressed('pause')) game.go('play', { new: true, ...this.d }); },
    draw(r) {
      r.sky(['#06051a', '#14103a', '#2a1850']);
      r.overlay(g => {
        const W = r.W, H = r.H, t = game.time; for (let i = 0; i < 30; i++) px.dot(g, (DQ.hash('s' + i) % W), (DQ.hash('t' + i) % (H - 40)) + Math.sin(t + i) * 1, i % 3 ? '#8a84b8' : '#fff');
        const pg = this.pages[Math.min(this.page, this.pages.length - 1)]; let y = H * .32; for (const para of pg) { for (const l of E.font.wrap(para, Math.min(W - 60, 340))) { const a = Math.min(1, this.t * 1.5); px.blend(g, a, 'normal', () => F(g, l, W / 2, y, '#f3e9c8', { align: 'center' })); y += 11; } y += 8; }
        F(g, 'Chapter One: A Stitch in Time', W / 2, 20, '#ffd36a', { align: 'center' });
        DQ.prompts(g, [['confirm', 'Next'], ['cancel', 'Skip']], 8, H - 14);
      });
    }
  };
  const play = {
    get pausable() { return !DQ.ui.isOpen() && !DQ.dialogOpen() && !(DQ.S && DQ.S.cut) && !DQ.ended; },
    camera: { zoom: [.75, 2], start: 1, wheel: false },
    enter(d) {
      d = d || {}; DQ.attractOn = false;
      if (d.load && DQ.pendingLoad) { DQ.deserialize(DQ.pendingLoad); DQ.pendingLoad = null; }
      else if (d.mode === 'bee') { DQ.startSession('bee', {}); }
      else if (d.new) { DQ.startSession('story', { name: d.name, look: d.look, swatch: d.swatch }); DQ.S.flags.fresh = 1; }
      else if (!DQ.S) DQ.startSession('story', {});
      DQ.ui.closeAll(); const S = DQ.S, map = S.world.map; game.follow(DQ.cam, { z: 14 }); game.cam.bounds = v => map.bounds(v); game.cam.smooth = .08; game.lights.enabled = true;
      DQ.snapCam(); if (S.mode === 'bee' && DQ.hubSession) { try { AIHub.ready(); } catch (e) { } }
      DQ.currentSong = null; DQ.musicTick(); DQ.camOverride = null;
      if (S.mode === 'story' && S.flags.fresh) { S.flags.fresh = 0; DQ.toast('Move with ' + (game.input.lastDevice === 'gamepad' ? 'the left stick' : 'WASD') + '. Break a block!', '#ffe9a0'); }
      if (S.mode === 'bee') DQ.toast('Quilting Bee! Defend the Banner for 3 minutes!', '#ffe9a0');
    },
    exit() { DQ.ui.closeAll(); game.lights.enabled = false; },
    update(dt) {
      if (DQ.ended) return;
      Object.assign(DQ.settings, game.settings || {});
      game.input.glyphs = DQ.settings.glyphs === 'Xbox' ? 'xbox' : 'playstation';
      DQ.playUpdate(dt);
      if (DQ.Net) DQ.Net.update(dt);
      const S = DQ.S; if (S.chapterClear && !S.chapterShown && !S.cut && !DQ.dialogOpen() && !DQ.ui.isOpen()) { S.chapterShown = true; DQ.ui.open('results', {}); DQ.audio.music('victory'); }
    },
    draw(r) { if (!DQ.S) return; DQ.ui.hits = []; DQ.drawWorld(r); DQ.drawHud(r); DQ.talk.draw(r); DQ.ui.draw(r); },
    back() { if (DQ.ui.isOpen()) { DQ.ui.close(); return true; } return false; }
  };
  const attract = {
    enter() { DQ.Attract.start(); this.armed = 0.6; this.lp = null; game.follow(DQ.cam, { z: 14 }); game.cam.bounds = v => DQ.S.world.map.bounds(v); game.cam.smooth = .08; game.lights.enabled = true; },
    exit() { DQ.Attract.stop(); game.lights.enabled = false; },
    update(dt) {
      const I = game.input; this.armed -= dt;
      const p = I.pointer(); const moved = p && this.lp && (Math.abs(p[0] - this.lp[0]) + Math.abs(p[1] - this.lp[1])) > 4; this.lp = p ? [p[0], p[1]] : null;
      if (this.armed < 0 && (I.anyPressed() || moved || Math.hypot(...(I.padMove || [0, 0])) > .4)) { game.go('title'); return; }
      Object.assign(DQ.settings, game.settings || {});
      DQ.Attract.update(dt);
    },
    draw(r) { if (!DQ.S) return; DQ.ui.hits = []; DQ.drawWorld(r); DQ.drawHud(r); DQ.talk.draw(r); }
  };
  const hubwait = { update() { }, draw(r) { r.sky(['#06051a', '#14103a']); r.overlay(g => { F(g, 'Threading the needles...', r.W / 2, r.H / 2, '#f3e9c8', { align: 'center' }); }); } };
  return { title, intro, play, attract, hubwait };
};
})();
