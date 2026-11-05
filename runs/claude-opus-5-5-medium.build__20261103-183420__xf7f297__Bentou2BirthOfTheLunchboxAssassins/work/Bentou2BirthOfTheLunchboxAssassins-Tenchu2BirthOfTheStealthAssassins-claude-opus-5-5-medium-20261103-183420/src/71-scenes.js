/* 71-scenes: the title (and its idle clock into attract mode, and the touch-only notice), character select, mission
 * select, Pack the Bento, results with the rank stamp, About / Credits, and the story's flow between them. */
const MENU_SCENE = { view: 'side', res: 'ps1', input: B.INPUT, expand: true, touch: [] };
const titleBg = new E.Backdrop({ sky: ['#05060f', '#141838', '#2a2450'], moon: { x: .72, y: .26, r: 26, color: '#f4ecd0' }, stars: 70, starsY: .6,
  layers: [{ kind: 'mountains', color: '#1a1a38', y: .62, height: .26, parallax: .1 }, { kind: 'castle', color: '#0e0e22', y: .7, height: .3, parallax: .2 }, { kind: 'fog', color: '#3a3a6a', y: .78, height: .1, parallax: .3, drift: 3 }, { kind: 'forest', color: '#0a0c18', y: .86, height: .12, parallax: .4 }] });
const ridge = new E.PlatformMap({ rows: ['S'.repeat(70), 'S'.repeat(70)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#3a4458' } }, edges: 'open' });
const MIDX = 560;
B.titleRigs = null;
const titleItems = () => [B.hasSave() && 'Continue', 'New Story', 'Missions', 'Shadow Trial', 'Workshop', 'Settings', 'About'].filter(Boolean);
B.scenes.title = Object.assign({}, MENU_SCENE, {
  enter() {
    const G = B.game; G.resetCamera(); G.follow(null); G.cam.room = null; G.cam.bounds = null; G.lights.enabled = false; G.timeScale = 1; G.weather = { kind: 'petals', amount: .5, wind: .4 };
    if (!B.titleRigs) B.titleRigs = [B.RIGS.sojiro(), B.RIGS.kaede()];
    B.music.play('title'); B.idle = 0; this.pressed = !!this.pressedOnce; this.t = 0;
    this.items = titleItems(); this.menu = new E.Menu(G, this.items, { y: 112, onPick: i => this.pick(this.items[i]) });
  },
  pick(it) {
    const G = B.game; B.sfx('uiConfirm');
    if (it === 'Continue') { if (B.loadLatest()) B.Flow.continueStory(); }
    else if (it === 'New Story') G.go('charSelect', { then: 'story' });
    else if (it === 'Missions') { if (!B.save.data) B.loadLatest() || (B.save.data = B.freshSave()); G.go('missionSelect'); }
    else if (it === 'Shadow Trial') { if (!B.save.data) B.loadLatest() || (B.save.data = B.freshSave()); G.go('bento', { missionId: 'delivery', mode: 'trial', character: B.save.data.character || 'sojiro' }); }
    else if (it === 'Workshop') G.go('workshop', {});
    else if (it === 'Settings') G.menu('settings');
    else if (it === 'About') B.showAbout(0);
  },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt;
    B.idle += dt; if (I.anyPressed() || B.padActive() || B.ui.screen || (I.held && (I.held.size || 0) > 0)) B.idle = 0;
    if (B.idle > 10 && !B.HUB) { G.go('attract', {}, { fade: 'dissolve' }); return; }
    const tr = B.titleRigs; tr[0].update(dt, { x: MIDX - 22, y: 0, z: 32, vx: 0, vy: 0, facing: 0, pose: 'hips' }); tr[1].update(dt, { x: MIDX + 22, y: 0, z: 32, vx: 0, vy: 0, facing: Math.PI, stance: 'ready' });
    G.focus(MIDX, 0, 32 + (G.H / 2 - 46) / -G.view.bz);
    if (B.touchOnly) { const c = I.clicked(); if (c && this.btn && c[0] >= this.btn[0] && c[0] <= this.btn[0] + this.btn[2] && c[1] >= this.btn[1] && c[1] <= this.btn[1] + this.btn[3]) G.menu('settings'); return; }
    if (!this.pressed) { if (I.pressed('start') || I.pressed('confirm') || I.clicked()) { this.pressed = this.pressedOnce = true; B.sfx('uiConfirm'); I.consumeAll(); } return; }
    if (B.ui.screen) return;
    const was = this.menu.i; this.menu.update(dt); if (this.menu.i !== was) B.sfx('uiMove');
  },
  draw(r) {
    titleBg.draw(r); ridge.draw(r);
    for (const x of [MIDX - 90, MIDX + 90]) r.prop('lantern', x, 0, 40, { anchor: 'top', light: false, size: 1.2 });
    for (const rig of B.titleRigs) r.actor(rig.x, 0, 32, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'BENTOU 2', r.W / 2, 18, { align: 'center', scale: 4, colors: ['#fff4d8', '#e8b04a', '#d8402a', '#8a1c1c'], depth: 3 });
      E.font.text(g, 'Birth of the Lunchbox Assassins', r.W / 2, 54, '#f4ead5', { align: 'center', gradient: ['#ffffff', '#e8c8a0'], shadow: '#140c0c', outline: false });
      px.sprite(g, B.CREST, Math.round(r.W / 2 + E.font.width('BENTOU 2', { scale: 4 }) / 2 + 6), 22);
      E.font.text(g, E.versionLabel ? E.versionLabel() + '  game ' + B.VERSION : B.VERSION, r.W - 4, r.H - 9, '#6a6a8a', { align: 'right', outline: false, font: 'tiny' });
      if (B.touchOnly) {
        const w = 220, h = 70, x = Math.round(r.W / 2 - w / 2), y = 96; px.blend(g, .85, 'normal', () => px.rect(g, x, y, w, h, '#140c0c')); px.rect(g, x, y, w, 1, '#e8b04a');
        E.font.text(g, 'Controller or keyboard required', r.W / 2, y + 8, '#e8b04a', { align: 'center', outline: false });
        E.font.text(g, 'Connect a controller or a keyboard to play.', r.W / 2, y + 22, '#f4ead5', { align: 'center', outline: false });
        this.btn = [Math.round(r.W / 2 - 40), y + 40, 80, 20]; px.rect(g, this.btn[0], this.btn[1], 80, 20, '#e8b04a'); E.font.text(g, 'SETTINGS', r.W / 2, y + 46, '#140c0c', { align: 'center', outline: false });
        return;
      }
      if (!this.pressed) { if (Math.floor(this.t * 2) % 2 === 0) B.rich(g, 'PRESS {a:start}', r.W / 2, 128, '#f4ead5', { align: 'center' }); return; }
      const dev = B.device(); B.rich(g, dev === 'gamepad' ? '{a:up}{a:down} choose   {a:confirm} select' : dev === 'mouse' ? 'Click to select' : 'Arrows choose   Enter select', r.W / 2, r.H - 22, '#b8a890', { align: 'center' });
    });
    if (this.pressed && !B.touchOnly) this.menu.draw(r);
  }
});

/* ---- character select ---- */
B.scenes.charSelect = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d || {}; this.i = 0; this.rigs = [B.RIGS.sojiro(), B.RIGS.kaede()]; this.ids = ['sojiro', 'kaede']; this.t = 0; this.greet(); B.music.play('shop'); B.game.follow(null); B.game.lights.enabled = false; },
  greet() { const C = get('character', this.ids[this.i]); this.say = C.greet; this.sayT = 0; B.Voice.speak(C.greet, C.voice); },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt; this.sayT += dt;
    let ni = this.i; if (I.pressed('left')) ni = 0; if (I.pressed('right')) ni = 1;
    const p = I.pointer(); if (B.mouseMode() && p) ni = p[0] < G.W / 2 ? 0 : 1;
    if (ni !== this.i) { this.i = ni; B.sfx('uiMove'); this.greet(); }
    if (I.pressed('confirm') || I.clicked()) { B.sfx('uiConfirm'); I.consumeAll(); B.Flow.newStory(this.ids[this.i]); }
    if (I.pressed('cancel')) G.go('title');
    this.rigs.forEach((rg, k) => rg.update(dt, { x: -50 + k * 100, y: 0, z: 0, vx: 0, vy: 0, facing: k ? Math.PI * .85 : Math.PI * .15, stance: k === this.i ? 'ready' : null, pose: k === this.i && this.t % 4 < 1 ? 'cheer' : null }));
    G.focus(0, 0, 40 + (G.H / 2 - 60) / -G.view.bz);
  },
  draw(r) {
    titleBg.draw(r); ridge.draw(r);
    this.rigs.forEach((rg, k) => r.actor(rg.x, 0, 0, (g, ox, oy) => rg.draw(g, ox, oy, r.view), { flash: k === this.i ? undefined : '#1a1a2a', flashMix: k === this.i ? 0 : .55 }));
    r.overlay(g => {
      E.font.title(g, 'WHO PASSES THE TRIAL?', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      const C = get('character', this.ids[this.i]), x = this.i ? r.W - 130 : 12, y = 40;
      px.blend(g, .8, 'normal', () => px.rect(g, x - 4, y - 4, 124, 88, '#140c0c')); px.rect(g, x - 4, y - 4, 124, 1, C.crest);
      E.font.text(g, C.name.toUpperCase(), x, y, '#f4ead5', { scale: 2, outline: false, shadow: '#000' }); E.font.text(g, C.weapon, x, y + 17, '#e8b04a', { outline: false });
      ['Strength', 'Speed', 'Stealth'].forEach((lab, k) => { E.font.text(g, lab, x, y + 30 + k * 10, '#b8a890', { outline: false }); for (let j = 0; j < 5; j++) px.rect(g, x + 50 + j * 9, y + 31 + k * 10, 7, 5, j < C.bars[k] ? C.crest : '#3a2a2a'); });
      E.font.wrap(C.line, 116).forEach((l, k) => E.font.text(g, l, x, y + 62 + k * 9, '#f4ead5', { outline: false }));
      if (this.sayT < 3) { const w = E.font.width(this.say) + 10, bx = Math.round(r.W / 2 - w / 2); px.rect(g, bx, r.H - 50, w, 14, '#f4ead5'); E.font.text(g, this.say, r.W / 2, r.H - 47, '#1a1418', { align: 'center', outline: false }); }
      B.rich(g, '{a:left}{a:right} choose   {a:confirm} begin   {a:cancel} back', r.W / 2, r.H - 16, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- mission select: unlocked missions, best rank per character, the character toggle ---- */
B.scenes.missionSelect = Object.assign({}, MENU_SCENE, {
  enter() {
    const S = B.save.data; this.ch = S.character || 'sojiro'; this.list = B.STORY_ORDER.filter((id, i) => i === 0 || S.completed[B.STORY_ORDER[i - 1]] || S.completed[id]);
    this.menu = new E.Menu(B.game, this.list.map(id => get('mission', id).num + '  ' + get('mission', id).title), { y: 60, onPick: i => { B.sfx('uiConfirm'); B.Flow.startMission(this.list[i], 'missions', this.ch); } });
    B.music.play('shop'); B.game.follow(null);
  },
  update(dt) {
    const G = B.game, I = G.input; if (B.ui.screen) return;
    if (I.pressed('left') || I.pressed('right') || I.pressed('toolPrev') || I.pressed('toolNext') || I.pressed('block') || I.pressed('grapple')) { this.ch = this.ch === 'sojiro' ? 'kaede' : 'sojiro'; B.sfx('uiMove'); }
    if (I.pressed('cancel')) { G.go('title'); return; }
    this.menu.update(dt); G.focus(MIDX, 0, 120);
  },
  draw(r) {
    titleBg.draw(r);
    r.overlay(g => {
      px.blend(g, .85, 'normal', () => px.rect(g, 20, 30, r.W - 40, r.H - 60, '#1a1210')); px.rect(g, 20, 30, r.W - 40, 2, '#8a1c1c'); px.rect(g, 20, r.H - 32, r.W - 40, 2, '#8a1c1c');
      E.font.title(g, 'MISSIONS', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      E.font.text(g, 'Character: ' + get('character', this.ch).name, r.W / 2, 40, '#e8b04a', { align: 'center', outline: false });
      const S = B.save.data;
      this.list.forEach((id, i) => { const best = S.best[id] && S.best[id][this.ch]; if (best) { const y = this.menu.y + i * (this.menu.lh || 12); E.font.text(g, best.rank, r.W - 30, y, B.rankColor(best.rank), { align: 'right', outline: false, shadow: '#000' }); } });
      B.rich(g, '{a:up}{a:down} choose   {a:left}{a:right} character   {a:confirm} brief   {a:cancel} back', r.W / 2, r.H - 20, '#b8a890', { align: 'center' });
    });
    this.menu.draw(r);
  }
});

/* ---- Pack the Bento: the tool shelf (left) and the two-tier box (right) ---- */
B.scenes.bento = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.d = d; const S = B.save.data || (B.save.data = B.freshSave()), ms = get('mission', d.missionId);
    this.tools = B.TOOL_ORDER.filter(t => B.toolUnlocked(t)); this.hint = ms.loadoutHint.map(t => B.toolUnlocked(t) ? t : 'riceball');
    this.slots = (S.lastLoadout && S.lastLoadout.length === 8 ? S.lastLoadout : this.hint).map(t => t && B.toolUnlocked(t) ? t : null);
    this.fx = 0; this.fy = 0; this.brush = this.tools[0]; this.t = 0; B.music.play('shop'); B.game.follow(null); B.sfx('fusuma');
  },
  cells(r) { const out = [], sx = 16, sy = 34, rowH = Math.min(18, Math.floor((r.H - 80) / this.tools.length)); this.tools.forEach((t, i) => out.push({ kind: 'shelf', i, x: sx, y: sy + i * rowH, w: 120, h: rowH - 2, t }));
    const bw = Math.min(46, Math.floor((r.W - 170) / 4)), bx = Math.round(r.W - 20 - bw * 4), by = 52; for (let k = 0; k < 8; k++) out.push({ kind: 'slot', i: k, x: bx + (k % 4) * bw, y: by + Math.floor(k / 4) * (bw + 18), w: bw - 4, h: bw - 4 }); return out; },
  start() { const S = B.save.data; S.lastLoadout = this.slots.slice(); B.sfx('uiConfirm'); B.game.go('mission', Object.assign({}, this.d, { loadout: this.slots.slice() })); },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt; if (B.ui.screen) return;
    const col = this.fx === 0;
    if (I.pressed('up')) { if (col) this.fy = (this.fy - 1 + this.tools.length) % this.tools.length; else if (this.fy >= 4) this.fy -= 4; B.sfx('uiMove'); }
    if (I.pressed('down')) { if (col) this.fy = (this.fy + 1) % this.tools.length; else if (this.fy < 4) this.fy += 4; B.sfx('uiMove'); }
    if (I.pressed('right')) { if (col) { this.fx = 1; this.brush = this.tools[this.fy]; this.fy = 0; } else if (this.fy % 4 < 3) this.fy++; B.sfx('uiMove'); }
    if (I.pressed('left')) { if (!col) { if (this.fy % 4 === 0) { this.fx = 0; this.fy = Math.max(0, this.tools.indexOf(this.brush)); } else this.fy--; } B.sfx('uiMove'); }
    // the mouse: hover focuses, click places or picks, right click empties
    const p = I.pointer(), cl = I.clicked();
    if (B.mouseMode() && p && this._cells) { for (const c of this._cells) if (p[0] >= c.x && p[0] <= c.x + c.w && p[1] >= c.y && p[1] <= c.y + c.h) { const nx = c.kind === 'shelf' ? 0 : 1; if (this.fx !== nx || this.fy !== c.i) { this.fx = nx; this.fy = c.i; } } }
    if (I.pressed('confirm') || cl) { if (this.fx === 0) { this.brush = this.tools[this.fy]; this.fx = 1; this.fy = this.slots.findIndex(s => !s); if (this.fy < 0) this.fy = 0; B.sfx('uiConfirm'); } else { this.slots[this.fy] = this.brush; B.sfx('stamp', { vol: .3 }); } }
    if ((I.pressed('cancel') && this.fx === 1) || (B.mouseMode() && I.pressed('block') && this.fx === 1)) { this.slots[this.fy] = null; B.sfx('uiBack'); }
    else if (I.pressed('cancel')) { G.go(this.d.mode === 'trial' ? 'title' : this.d.mode === 'missions' ? 'missionSelect' : 'title'); return; }
    if (I.pressed('interact')) { this.slots = this.hint.slice(); B.sfx('fusuma'); }
    if (I.pressed('start') || I.pressed('useTool')) this.start();
  },
  draw(r) {
    r.sky(['#0e0808', '#1a1010', '#140c0c']); const cells = this._cells = this.cells(r);
    r.overlay(g => {
      E.font.title(g, 'PACK THE BENTO', r.W / 2, 6, { align: 'center', scale: 2, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      const ms = get('mission', this.d.missionId); E.font.text(g, ms.num + ': ' + ms.title, r.W / 2, 24, '#b8a890', { align: 'center', outline: false });
      // the box: black lacquer with a red inner rim, two tiers of four
      const sl = cells.filter(c => c.kind === 'slot'), x0 = sl[0].x - 6, y0 = sl[0].y - 6, x1 = sl[7].x + sl[7].w + 6, y1 = sl[7].y + sl[7].h + 6;
      px.rect(g, x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, '#0a0606'); px.rect(g, x0, y0, x1 - x0, y1 - y0, '#1a1214'); px.rect(g, x0, y0 + (sl[4].y - sl[0].y) - 10, x1 - x0, 3, '#e8b04a');
      E.font.text(g, 'UPPER TIER', x0 + 4, y0 + 1, '#8a7a60', { outline: false, font: 'tiny' }); E.font.text(g, 'LOWER TIER', x0 + 4, sl[4].y - 9, '#8a7a60', { outline: false, font: 'tiny' });
      for (const c of cells) {
        const foc = (c.kind === 'shelf' && this.fx === 0 && this.fy === c.i) || (c.kind === 'slot' && this.fx === 1 && this.fy === c.i);
        if (c.kind === 'shelf') {
          const T = get('tool', c.t); px.rect(g, c.x, c.y, c.w, c.h, foc ? '#3a2418' : c.t === this.brush ? '#2a1a12' : '#1a1210'); if (foc) px.rect(g, c.x, c.y, 2, c.h, '#e8b04a');
          px.sprite(g, B.ICON[c.t], c.x + 4, c.y + Math.max(0, (c.h - 12) / 2)); E.font.text(g, T.name, c.x + 22, c.y + Math.max(1, (c.h - 7) / 2), foc ? '#f4ead5' : '#c8b8a0', { outline: false });
        } else {
          const s = this.slots[c.i]; px.rect(g, c.x, c.y, c.w, c.h, '#8a1c1c'); px.rect(g, c.x + 2, c.y + 2, c.w - 4, c.h - 4, '#240e0e'); if (foc) { px.rect(g, c.x - 1, c.y - 1, c.w + 2, 1, '#e8b04a'); px.rect(g, c.x - 1, c.y + c.h, c.w + 2, 1, '#e8b04a'); px.rect(g, c.x - 1, c.y, 1, c.h, '#e8b04a'); px.rect(g, c.x + c.w, c.y, 1, c.h, '#e8b04a'); }
          if (s) { px.sprite(g, B.ICON[s], c.x + c.w / 2 - 14, c.y + c.h / 2 - 12, { scale: 2 }); E.font.text(g, 'x' + get('tool', s).stack, c.x + c.w - 3, c.y + c.h - 9, '#f4ead5', { align: 'right', outline: false, shadow: '#000' }); }
        }
      }
      const fT = this.fx === 0 ? this.tools[this.fy] : this.slots[this.fy] || this.brush, T = get('tool', fT);
      if (T) { const ty = y1 + 8; E.font.text(g, T.name + '  (stack ' + T.stack + ')', x0, ty, '#e8b04a', { outline: false }); E.font.wrap(T.desc, x1 - x0).forEach((l, k) => E.font.text(g, l, x0, ty + 10 + k * 9, '#f4ead5', { outline: false })); }
      const locked = B.TOOL_ORDER.filter(t => !B.toolUnlocked(t)).length; if (locked) E.font.text(g, locked + ' tools still locked: earn high ranks', 16, r.H - 28, '#8a7a60', { outline: false });
      B.rich(g, '{a:confirm} pack   {a:cancel} empty   {a:interact} suggested   {a:start} begin', r.W / 2, r.H - 14, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- results: the scroll, one stat at a time, the score, the hanko ---- */
B.scenes.results = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.d = d; this.t = 0; this.stamped = false; const M = d.M; this.sc = d.sc; B.music.play('results');
    const s = M.stats; this.lines = [['Time', B.fmtTime(M.t)], ['Silent Cuts', s.silentCuts], ['Kills', s.kills], ['Times detected', s.detections], ['Civilians harmed', s.civiliansHarmed], ['Optional tasks', s.optionalDone], ['Tools used', s.tools], ['Retries', s.retries]];
    this.items = d.mode === 'story' ? ['Continue', 'Retry'] : d.mode === 'workshop' ? ['Back to the Workshop', 'Retry'] : ['Missions', 'Retry', 'Title'];
    this.menu = new E.Menu(B.game, this.items, { y: 0, onPick: i => this.pick(this.items[i]) }); this.bow = B.RIGS[M.charId === 'kaede' ? 'kaede' : 'sojiro'](); B.game.follow(null);
  },
  pick(it) {
    const G = B.game, d = this.d; B.sfx('uiConfirm');
    if (it === 'Continue') B.Flow.afterResults(d); else if (it === 'Retry') G.go('mission', d.data); else if (it === 'Missions') G.go('missionSelect'); else if (it === 'Back to the Workshop') G.go('workshop', { keep: true }); else G.go('title');
  },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt * (I.down('confirm') && !this.stamped ? 4 : 1);
    const ready = this.t > this.lines.length * .45 + 2.2;
    if (this.t > this.lines.length * .45 + 1.6 && !this.stamped) { this.stamped = true; B.sfx('stamp'); G.shake(4); if (this.d.out.newTools.length) G.audio.sting(B.STINGS.newTool); }
    if (ready) this.menu.update(dt);
    this.bow.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: this.stamped ? 'kneel' : null });
  },
  draw(r) {
    r.sky(['#1a120c', '#241810', '#1a120c']);
    r.overlay(g => {
      const w = Math.min(300, r.W - 40), x0 = Math.round(r.W / 2 - w / 2), unroll = clamp(this.t / .6, 0, 1), hh = Math.round((r.H - 30) * unroll);
      px.rect(g, x0, 12, w, hh, '#f4ead5'); px.rect(g, x0 - 4, 8, w + 8, 6, '#6a3a1a'); px.rect(g, x0 - 4, 12 + hh, w + 8, 6, '#6a3a1a');
      if (unroll < 1) return;
      const M = this.d.M; E.font.text(g, (get('mission', M.missionId) || { title: M.level.name }).title || M.level.name, r.W / 2, 20, '#1a1418', { align: 'center', outline: false, scale: 1 });
      this.lines.forEach(([k, v], i) => { if (this.t < .8 + i * .45) return; const y = 36 + i * 12; E.font.text(g, k, x0 + 16, y, '#3a2a20', { outline: false }); E.font.text(g, String(v), x0 + w - 90, y, '#1a1418', { align: 'right', outline: false }); px.rect(g, x0 + 16, y + 8, Math.min(w - 110, (this.t - .8 - i * .45) * 300), 1, '#8a1c1c'); });
      const sy = 36 + this.lines.length * 12 + 4, shown = Math.round(this.sc.total * clamp((this.t - this.lines.length * .45 - .8) / .8, 0, 1));
      if (this.t > this.lines.length * .45 + .8) E.font.text(g, 'SCORE ' + shown, x0 + 16, sy, '#1a1418', { outline: false, scale: 2 });
      if (this.stamped) {
        const k = clamp((this.t - this.lines.length * .45 - 1.6) / .15, 0, 1), sx = x0 + w - 56, sy2 = 46, S = Math.round(lerp(60, 44, k));
        px.rect(g, sx - S / 2, sy2 - S / 2 + 20, S, S, '#c8302a'); px.rect(g, sx - S / 2 + 3, sy2 - S / 2 + 23, S - 6, S - 6, '#f4ead5'); px.rect(g, sx - S / 2 + 5, sy2 - S / 2 + 25, S - 10, S - 10, '#c8302a');
        const rk = this.sc.rank.split(' '); rk.forEach((wd, j) => E.font.text(g, wd.toUpperCase(), sx, sy2 + 14 + j * 9 - (rk.length - 1) * 4, '#f4ead5', { align: 'center', outline: false }));
        E.font.text(g, '"' + B.STORY.rankComment[this.sc.rank] + '"  - Granny', r.W / 2, sy + 22, '#3a2a20', { align: 'center', outline: false });
        if (this.d.out.newTools.length) { const nt = this.d.out.newTools.map(t => get('tool', t).name).join(', '); px.rect(g, x0 + 12, sy + 34, w - 24, 22, '#1a1214'); E.font.text(g, 'NEW TOOL: ' + nt, r.W / 2, sy + 37, '#e8b04a', { align: 'center', outline: false }); E.font.text(g, 'Pack it on the bento screen', r.W / 2, sy + 46, '#c8b8a0', { align: 'center', outline: false }); }
      }
    });
    if (this.t > this.lines.length * .45 + 2.2) { this.menu.y = r.H - 18 - this.items.length * 12; this.menu.draw(r); }
  }
});

/* ---- About / Credits: paged HTML screens, large type ---- */
B.showAbout = i => {
  const pages = B.ABOUT_PAGES(), p = pages[i];
  B.ui.show('about', { kicker: 'About ' + (i + 1) + ' / ' + pages.length, title: p[0], text: p[1],
    actions: [i > 0 && ['◀ Previous page', () => B.showAbout(i - 1)], i < pages.length - 1 && { label: 'Next page ▶', primary: true, fn: () => B.showAbout(i + 1) }, ['Back to the title', () => B.ui.hide()]],
    back: () => B.ui.hide() });
};

/* ---- the story's flow ---- */
B.Flow = {
  newStory(ch) {
    const keep = B.save.data && B.save.data.tools ? B.save.data : null; B.save.data = B.freshSave(); B.save.data.character = ch; if (keep) { B.save.data.tools = keep.tools.slice(); B.save.data.best = keep.best; }
    B.game.go('crawl', { then: () => B.Flow.startMission('training', 'story', ch) });
  },
  continueStory() { const S = B.save.data; if (S.nextMission === 'end') B.game.go('ending'); else B.Flow.startMission(S.nextMission, 'story', S.character); },
  startMission(id, mode, ch) {
    const S = B.save.data; S.character = ch || S.character; B.autosave();
    const br = B.STORY.briefings[id], ms = get('mission', id);
    const go = () => B.game.go('bento', { missionId: id, levelId: ms.level, mode, character: S.character });
    if (br) B.game.go('story', { place: br.place, lines: br.lines, title: ms.num + ': ' + ms.title, music: 'shop', then: go }); else go();
  },
  afterResults(d) {
    const S = B.save.data, ms = get('mission', d.M.missionId);
    if (ms && ms.next === 'end') B.game.go('ending'); else if (ms && ms.next) B.Flow.startMission(ms.next, 'story', S.character); else B.game.go('title');
  }
};
B.missionWon = M => {
  const sc = M.score(), G = B.game;
  if (M.mode === 'workshop') { G.go('results', { M, sc, mode: 'workshop', out: { newTools: [] }, data: M.scene.d }); return; }
  const out = B.applyResults(M, sc); B.autosave();
  G.go('results', { M, sc, mode: M.mode === 'story' ? 'story' : 'missions', out, data: M.scene.d });
};
