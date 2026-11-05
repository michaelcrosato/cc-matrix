/* =====================================================================================================================
 * DEV MODE (the pause menu's Dev mode; after the first use F2, ` or L3+R3 toggle it; ?dev=1 enables it). A canvas panel,
 * 10-foot readable, 8 rows a page, tabs (L1/R1, Q/E or a click): TUNING (every balance variable a live slider, RESET ALL
 * TO DEFAULTS at the top; triangle or T resets one), TOGGLES, WARP, INFO. Persisted under E.store('kc:dev'). While any
 * tuning value is changed the HUD shows DEV and no high score is recorded. The TECHNIQUE LAB measures every technique.
 * ===================================================================================================================== */
KC.DEV = {
  on: false, boxes: false, frameData: false, inputDisplay: false, aiThoughts: false, invincible: false, p2: 'cpu', infiniteTime: false, freezeCpu: false,
  slowmo: false, frozen: false, fps: false, muteVoices: false, skipCutscenes: false, unlockAll: false,
  anyToggle() { return this.boxes || this.invincible || this.infiniteTime || this.freezeCpu || this.slowmo || this.frozen || this.unlockAll || this.p2 !== 'cpu'; }
};
const DEV_TOGGLES = [['boxes', 'HIT, HURT AND PUSH BOXES'], ['frameData', 'FRAME DATA'], ['inputDisplay', 'INPUT DISPLAY'], ['aiThoughts', 'AI THOUGHTS'], ['invincible', 'P1 INVINCIBLE'], ['p2', 'P2 CONTROL'], ['infiniteTime', 'INFINITE TIME'], ['freezeCpu', 'FREEZE CPU'], ['slowmo', 'SLOW MOTION 0.25x'], ['frozen', 'FRAME STEP (NEXT: E / R1)'], ['fps', 'FPS AND STATS'], ['muteVoices', 'MUTE VOICES'], ['skipCutscenes', 'SKIP CUTSCENES'], ['unlockAll', 'UNLOCK ALL']];
const P2_MODES = ['cpu', 'pad2', 'stand', 'crouch', 'jump', 'block', 'attack'];
KC.timeScale = () => KC.TUNE.gameSpeed * (KC.DEV.slowmo ? .25 : 1);
KC.Dev = {
  load() { const d = KC.store.get('dev', null); if (d && typeof d === 'object') { if (d.tune) for (const k in KC.TUNE_DEFAULTS) if (typeof d.tune[k] === 'number') KC.TUNE[k] = clamp(d.tune[k], KC.TUNE_SPEC[k][0], KC.TUNE_SPEC[k][1]); for (const [k] of DEV_TOGGLES) if (k in (d.flags || {})) KC.DEV[k] = d.flags[k]; KC.DEV.on = !!d.on; } if (typeof location !== 'undefined' && /[?&]dev=1/.test(location.search || '')) KC.DEV.on = true; KC.Voice.muted = KC.DEV.muteVoices; },
  persist() { const flags = {}; for (const [k] of DEV_TOGGLES) flags[k] = KC.DEV[k]; KC.store.set('dev', { on: KC.DEV.on, tune: KC.TUNE, flags }); },
  set(k, v) { const S = KC.TUNE_SPEC[k]; if (!S) return; KC.TUNE[k] = clamp(Math.round(v / S[2]) * S[2], S[0], S[1]); KC.TUNE[k] = +KC.TUNE[k].toFixed(4); if (k === 'gameSpeed' && KC.game) KC.game.timeScale = KC.timeScale(); this.persist(); },
  resetAll() { Object.assign(KC.TUNE, KC.TUNE_DEFAULTS); if (KC.game) KC.game.timeScale = KC.timeScale(); this.persist(); },
  exportTuning() { return JSON.stringify(KC.TUNE); },
  copy(text) { try { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) { /* no clipboard */ } KC.game.note('COPIED TO THE CLIPBOARD'); KC.lastCopied = text; },
  open() { if (SESSION) return; KC.DEV.on = true; this.persist(); if (KC.Overlay.stack.includes(this.panel)) return; this.panel = this.make(); KC.Overlay.push(this.panel); },
  close() { if (this.panel) { KC.Overlay.stack = KC.Overlay.stack.filter(o => o !== this.panel); this.panel = null; KC.consumeAll(); } },
  toggle() { if (this.panel && KC.Overlay.stack.includes(this.panel)) this.close(); else this.open(); },
  warps() {
    const g = KC.game, W = [];
    KC.DATA.ladder.forEach((n, i) => W.push(['ROAD ' + (i + 1) + ': ' + (n.kind === 'match' ? 'VS ' + KC.FIGHTER[n.opponent].short : n.kind === 'practice' ? KC.LESSON[n.lesson].title : n.kind === 'bonus' ? KC.BONUS[n.bonus].name : n.id.toUpperCase()), () => { if (!KC.Story.active) KC.Story.newGame(); KC.Story.node = i; KC.Story.run(); }]));
    W.push(['TECHNIQUE LAB', () => g.go('lab', { tech: 'frontKick' })]);
    for (const s of KC.FIGHT_STAGES) W.push(['QUICK BOUT: ' + KC.STAGE[s].name, () => g.go('fight', KC.Versus.quickData(s, 'kamaboko'))]);
    for (const b of KC.DATA.bonus) W.push(['BONUS: ' + b.name, () => g.go('bonus', { id: b.id })]);
    for (const l of KC.DATA.lessons) W.push(['PRACTICE: ' + l.title, () => g.go('practice', { lesson: l.id })]);
    W.push(['THE ENDING', () => { if (!KC.Story.active) KC.Story.newGame(); g.go('cutscene', KC.Story.endingData()); }], ['CREDITS', () => g.go('credits', {})], ['ATTRACT MODE', () => g.go('attract')]);
    W.push(['RANK UP (STORY)', () => { const i = KC.rankIndex(KC.Story.rank); KC.Story.rank = KC.DATA.ranks[Math.min(9, i + 1)].id; }], ['+10,000 SCORE', () => { KC.Story.score += 10000; }]);
    W.push(['WIN THE ROUND', () => { const b = KC.scene && KC.scene.bout; if (b && b.phase !== 'over') { b.points[0] = b.R('pointsToWin'); b.roundWinner = 0; b._go('roundEnd'); } }], ['LOSE THE ROUND', () => { const b = KC.scene && KC.scene.bout; if (b && b.phase !== 'over') { b.points[1] = b.R('pointsToWin'); b.roundWinner = 1; b._go('roundEnd'); } }]);
    W.push(['WIN THE MATCH', () => { const b = KC.scene && KC.scene.bout; if (b && b.phase !== 'over') b.forceWin(0, 'win'); }], ['LOSE THE MATCH', () => { const b = KC.scene && KC.scene.bout; if (b && b.phase !== 'over') b.forceWin(1, 'win'); }]);
    for (const id of Object.keys(KC.CALLS)) W.push(['CALL: ' + KC.CALLS[id][0], () => { const b = KC.scene && KC.scene.bout; if (b) b.call(id); else KC.Voice.call(id, KC.call(id)); }]);
    W.push(['COPY TUNING JSON', () => this.copy(this.exportTuning())], ['RESET THE SAVE', () => { KC.Save.reset(); try { g.saves.erase('auto'); } catch (e) { /* none */ } g.note('SAVE RESET'); }]);
    return W;
  },
  info() {
    const g = KC.game, sc = KC.scene, b = sc && sc.bout, L = [['VERSION', KC.VERSION + ' / ' + (E.versionLabel ? E.versionLabel() : E.version)], ['SCENE', g.sceneName + (sc && sc.mode ? ' (' + sc.mode + ')' : '')], ['SEED', sc && sc.d ? String(sc.d.seed || 1) : '-'], ['BOUT', b ? b.phase + '  CLOCK ' + b.clock.toFixed(1) + '  ' + b.points.join('-') : '-'], ['FPS', String(Math.round(g.fps || 0))]];
    if (sc && sc.ai) sc.ai.forEach((a, i) => { if (a) L.push(['AI ' + (i ? 'RED' : 'WHITE'), 'L' + a.level + ' ' + a.thought]); });
    const h = (b && b.lastPoint) || (sc && sc.spar && sc.spar.last); if (h && !h.aiuchi) L.push(['LAST HIT', h.tech + ' ' + h.pts + (h.counter ? ' COUNTER' : '') + '  TIMING ' + h.timingQ.toFixed(2) + '  SPACING ' + h.spacingQ.toFixed(2) + '  GAP ' + h.gap]);
    L.push(['TUNED', KC.tuneChanged() ? 'YES (NO HIGH SCORES)' : 'NO']);
    return L;
  },
  make() {
    const tabs = ['TUNING', 'TOGGLES', 'WARP', 'INFO'], P = { tab: 0, i: 0, t: 0, hold: 0, drag: null };
    const rows = () => {
      if (P.tab === 0) return [{ label: 'RESET ALL TO DEFAULTS', act: () => KC.Dev.resetAll() }].concat(Object.keys(KC.TUNE_DEFAULTS).map(k => ({ k, label: KC.TUNE_SPEC[k][3], slider: true })));
      if (P.tab === 1) return DEV_TOGGLES.map(([k, label]) => ({ k, label, toggle: true }));
      if (P.tab === 2) return KC.Dev.warps().map(([label, act]) => ({ label, act: () => { KC.Dev.close(); act(); } }));
      return KC.Dev.info().map(([label, v]) => ({ label, v }));
    };
    P.update = function (dt) {
      this.t += dt; const R = rows(), I = KC.game.input, n = R.length;
      if (KC.anyPressed('next')) { this.tab = (this.tab + 1) % 4; this.i = 0; KC.sfx('menuMove'); } if (KC.anyPressed('prev')) { this.tab = (this.tab + 3) % 4; this.i = 0; KC.sfx('menuMove'); }
      if (KC.anyRepeat('up')) this.i = (this.i + n - 1) % n; if (KC.anyRepeat('down')) this.i = (this.i + 1) % n;
      const it = R[this.i];
      const lr = (KC.anyPressed('left') || KC.anyPressed('right')) ? 1 : (KC.inputs().some(J => J.down('left') || J.down('right')) ? (this.hold += dt) : (this.hold = 0, 0));
      if (it && it.slider && (KC.anyRepeat('left') || KC.anyRepeat('right') || (lr && this.hold > .5))) { const S = KC.TUNE_SPEC[it.k], dir = KC.inputs().some(J => J.down('left')) ? -1 : 1, mult = this.hold > 1.5 ? 5 : 1; KC.Dev.set(it.k, KC.TUNE[it.k] + dir * S[2] * mult); }
      if (it && it.toggle && (KC.anyPressed('left') || KC.anyPressed('right') || KC.anyPressed('confirm'))) this._toggle(it.k, KC.anyPressed('left') ? -1 : 1);
      if (it && it.act && KC.anyPressed('confirm')) { KC.consumeAll(); it.act(); return; }
      if (it && it.slider && KC.anyPressed('alt')) KC.Dev.set(it.k, KC.TUNE_DEFAULTS[it.k]);
      // the mouse: tabs, rows (a click picks or toggles), a drag on a slider sets it
      const c = I.clicked(), p = I.pointer(), down = I.down('click');
      if (c && this.tabsAt) this.tabsAt.forEach(([x, w], k) => { if (c[0] >= x && c[0] < x + w && c[1] >= this.tabsY && c[1] < this.tabsY + 14) { this.tab = k; this.i = 0; } });
      if (this.rowsAt) for (const [k, x, y, w, h, sx, sw] of this.rowsAt) {
        if (c && c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h) { this.i = k; const r2 = R[k]; if (r2 && r2.toggle) this._toggle(r2.k, 1); else if (r2 && r2.act) { r2.act(); return; } else if (r2 && r2.slider) this.drag = { k: r2.k, sx, sw }; }
      }
      if (this.drag && down && p) { const S = KC.TUNE_SPEC[this.drag.k], u = clamp((p[0] - this.drag.sx) / this.drag.sw, 0, 1); KC.Dev.set(this.drag.k, S[0] + (S[1] - S[0]) * u); } else if (!down) this.drag = null;
      if (KC.anyPressed('cancel') || KC.anyPressed('dev')) { KC.consumeAll(); KC.Dev.close(); }
    };
    P._toggle = function (k, dir) { if (k === 'p2') { const i = P2_MODES.indexOf(KC.DEV.p2); KC.DEV.p2 = P2_MODES[(i + dir + P2_MODES.length) % P2_MODES.length]; } else KC.DEV[k] = !KC.DEV[k]; if (k === 'muteVoices') KC.Voice.muted = KC.DEV.muteVoices; if (k === 'slowmo' || k === 'frozen') KC.game.timeScale = KC.timeScale(); if (k === 'fps') KC.game.settings.set('showFps', KC.DEV.fps); KC.sfx('menuMove'); KC.Dev.persist(); };
    P.draw = function (g, W, H) {
      const R = rows(), w = Math.min(W - 16, 380), x = Math.round((W - w) / 2), y = 14, rh = 20, per = 8, h = per * rh + 56;
      E.ui.box(g, x, y, w, h, { bg: ['#1a0c14', '#0c0610'], border: '#ff8a6a', alpha: .95 });
      E.font.text(g, 'DEV MODE', x + 8, y + 5, '#ff8a6a', { outline: false });
      this.tabsAt = []; this.tabsY = y + 4; let tx = x + 70; tabs.forEach((t, k) => { const tw = E.font.width(t) + 10; px.rect(g, tx, y + 3, tw, 12, k === this.tab ? '#5a2a3a' : '#2a141c'); E.font.text(g, t, tx + 5, y + 5, k === this.tab ? '#ffd060' : '#a88a98', { outline: false }); this.tabsAt.push([tx, tw]); tx += tw + 3; });
      const first = clamp(this.i - 3, 0, Math.max(0, R.length - per)); this.rowsAt = [];
      R.slice(first, first + per).forEach((it, j) => {
        const k = first + j, yy = y + 22 + j * rh, on = k === this.i;
        if (on) px.rect(g, x + 4, yy - 2, w - 8, rh - 2, '#3a1a2a');
        E.font.text(g, (on ? '▸ ' : '  ') + it.label, x + 8, yy + 2, on ? '#fff6d0' : '#d8c8d0', { outline: false, scale: it.slider || it.toggle ? 1 : 1 });
        let sx = 0, sw = 0;
        if (it.slider) { const S = KC.TUNE_SPEC[it.k], v = KC.TUNE[it.k], u = (v - S[0]) / (S[1] - S[0]), changed = Math.abs(v - KC.TUNE_DEFAULTS[it.k]) > 1e-9; sx = x + w - 150; sw = 100; px.rect(g, sx, yy + 4, sw, 4, '#2a1a24'); px.rect(g, sx, yy + 4, Math.round(sw * u), 4, changed ? '#ff8a6a' : '#8a7ab0'); px.rect(g, sx + Math.round(sw * u) - 1, yy + 1, 3, 10, '#fff6d0'); E.font.text(g, String(+v.toFixed(2)), x + w - 10, yy + 2, changed ? '#ff8a6a' : '#c8c0e8', { align: 'right', outline: false }); }
        if (it.toggle) { const v = KC.DEV[it.k]; E.font.text(g, typeof v === 'boolean' ? (v ? 'ON' : 'OFF') : String(v).toUpperCase(), x + w - 10, yy + 2, v === true || (typeof v === 'string' && v !== 'cpu') ? '#8ae08a' : '#8a7a88', { align: 'right', outline: false }); }
        if (it.v !== undefined) E.font.text(g, String(it.v), x + 120, yy + 2, '#c8e0ff', { outline: false, font: 'tiny' });
        this.rowsAt.push([k, x + 4, yy - 2, w - 8, rh - 2, sx, sw]);
      });
      E.font.text(g, (this.i + 1) + '/' + R.length, x + w - 8, y + 5, '#a88a98', { align: 'right', outline: false, font: 'tiny' });
      KC.promptBar(g, W, H, [['prev', ''], ['next', 'TAB'], ['left', 'ADJUST'], ['alt', 'RESET'], ['cancel', 'CLOSE']]);
    };
    return P;
  }
};

/* ---- overlays drawn in the world: boxes, frame data, AI thoughts; free spar's panel ---- */
KC.DevDraw = {
  boxes(r, F) {
    r.overlay(g => {
      const out = (x0, z0, x1, z1, c) => { const a = r.w(x0, 0, z1), b = r.w(x1, 0, z0), x = Math.round(a[0]), y = Math.round(a[1]), w = Math.round(b[0] - a[0]), h = Math.round(b[1] - a[1]); px.rect(g, x, y, w, 1, c); px.rect(g, x, y + h - 1, w, 1, c); px.rect(g, x, y, 1, h, c); px.rect(g, x + w - 1, y, 1, h, c); };
      for (const f of F) {
        const prof = f.profile(), top = f.z + (prof === 'crouch' ? f.h * .55 : prof === 'roll' ? 24 : prof === 'flip' ? 40 : f.h);
        out(f.x - f.w / 2, f.z, f.x + f.w / 2, f.z + f.h, '#4a8aff');
        out(f.x - f.w / 2 - 2, f.z + (prof === 'flip' ? 12 : 0), f.x + f.w / 2 + 2, top, prof ? '#4ad860' : '#ffffff');
        if (f.st === 'tech' && f.T.scoring) { const [lo, hi] = f.contactBand(f.T), x0 = f.x + f.face * (f.w / 2 + lo), x1 = f.x + f.face * (f.w / 2 + hi), H = KC.Karateka.heightOf(f.T), zc = f.z + (H === 'low' ? 8 : H === 'mid' || H === 'midlow' ? 34 : 52); out(Math.min(x0, x1), zc - 5, Math.max(x0, x1), zc + 5, f.phase === 'active' ? '#ff4a4a' : '#8a3a3a'); }
        if (KC.DEV.frameData || (KC.scene && KC.scene.mode === 'freeSpar')) { const p = r.w(f.x, 0, f.z + f.h + 14); const t = f.st === 'tech' ? f.T.id + ' ' + f.fr.join('/') + (f.extra ? '+' + f.extra : '') + ' K' + f.k : f.st; E.font.text(g, t, Math.round(p[0]), Math.round(p[1]), '#ffe08a', { align: 'center', outline: '#000', font: 'tiny' }); }
      }
      if (KC.DEV.aiThoughts && KC.scene && KC.scene.ai) KC.scene.ai.forEach((a, i) => { if (!a) return; const f = F[i], p = r.w(f.x, 0, f.z + f.h + 24); E.font.text(g, a.thought, Math.round(p[0]), Math.round(p[1]), '#c8e0ff', { align: 'center', outline: '#000', font: 'tiny' }); });
    });
  },
  spar(r, sc) {
    r.overlay(g => {
      const W = r.W, H = r.H; E.ui.box(g, 6, 6, 170, 58, { bg: '#0c0a18', border: '#8a7ab0', alpha: .85 });
      E.font.text(g, 'FREE SPAR - DUMMY: ' + sc.spar.dummy.toUpperCase(), 12, 10, '#ffd060', { outline: false, font: 'tiny' });
      sc.spar.hits.forEach((h, i) => E.font.text(g, KC.TECH[h.tech].name + ' ' + h.pts + (h.full ? ' FULL' : ' HALF') + (h.counter ? ' x2' : '') + ' Q' + h.q.toFixed(2), 12, 22 + i * 9, i ? '#a8a0c8' : '#fff6e8', { outline: false, font: 'tiny' }));
      E.font.text(g, 'CLICK THE DUMMY OR PRESS T / △ TO CHANGE IT', W / 2, H - 30, '#8a80a8', { align: 'center', outline: false, font: 'tiny' });
      KC.promptBar(g, W, H, [['alt', 'DUMMY'], ['pause', 'MENU']]);
    });
    const I = KC.game.input, c = I.clicked(), d = sc.fighters[1], p = r.w(d.x, 0, d.z + d.h / 2);
    if ((c && Math.abs(c[0] - p[0]) < 20 && Math.abs(c[1] - p[1]) < 40) || KC.anyPressed('alt')) { const i = KC.DUMMY_MODES.indexOf(sc.spar.dummy); sc.spar.dummy = KC.DUMMY_MODES[(i + 1) % 5]; KC.game.note('DUMMY: ' + sc.spar.dummy.toUpperCase()); }
  }
};

/* ---- THE TECHNIQUE LAB (#lab/<techId>): the hero against a standing dummy; the technique's frame data and its measured
 * contact gap; live sliders for its frames and reach; COPY JSON. Also the filmstrip target ---- */
KC.LabScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    d = d || {}; this.ids = KC.DATA.techniques.map(t => t.id).filter(id => id !== 'crouch'); this.i = Math.max(0, this.ids.indexOf(d.tech)); this.t = 0; this.row = 0; this.slow = false; this.boxes = true; this.measured = null; this.play = 0;
    KC.Stage.enter(KC.game, 'dojo'); KC.music('practice'); KC.scene = this; this.mode = 'lab';
    this.hero = new KC.Karateka({ fid: 'taro', side: 0, x: 150 }); this.dummy = new KC.Karateka({ fid: 'negi', side: 1, x: 250 }); this.dummy.release(this.hero); this.hero.release(this.dummy);
    this.bus = new KC.Bus(); this.hero.bus = this.bus; this.fx = {}; KC.fx.attach({ bus: this.bus, f: [this.hero, this.dummy] }, KC.game, this.fx); this.dmode = 'stand';
    this.fighters = [this.hero, this.dummy]; this.ai = [null, null]; this._place(); this.autoplay = d.autoplay !== false;
  },
  exit() { KC.scene = null; KC.game.timeScale = 1; },
  get tech() { return KC.TECH[this.ids[this.i]]; },
  // stand the dummy at the gap the technique wants (the top of its band, less a little)
  _place() { const t = this.tech, b = this.hero.band(t), gap = t.scoring ? Math.max(0, b[1] - 3) : 60; this.hero.x = 150; this.dummy.x = this.hero.x + (this.hero.w + this.dummy.w) / 2 + gap; this.hero.release(this.dummy); this.dummy.release(this.hero); this.measured = null; this.startGap = gap; },
  update(dt) {
    const g = KC.game, h = this.hero, D = this.dummy, t = this.tech; this.t += dt; KC.Stage.update(dt); KC.fx.step(g, this.fx, dt);
    g.timeScale = this.slow ? .25 : KC.timeScale();
    if (KC.anyPressed('next')) { this.i = (this.i + 1) % this.ids.length; this._place(); KC.sfx('menuMove'); }
    if (KC.anyPressed('prev')) { this.i = (this.i + this.ids.length - 1) % this.ids.length; this._place(); KC.sfx('menuMove'); }
    if (KC.anyPressed('confirm') || (this.autoplay && h.free && D.free && (this.play -= dt) < 0)) { KC.consumeAll(); this._place(); h.startTech(t.id, D); this.play = 1.2; }
    if (KC.anyPressed('tLeft')) this.slow = !this.slow; if (KC.anyPressed('alt')) this.boxes = !this.boxes;
    if (KC.anyRepeat('up')) this.row = (this.row + 3) % 4; if (KC.anyRepeat('down')) this.row = (this.row + 1) % 4;
    if (KC.anyRepeat('left') || KC.anyRepeat('right')) { const k = KC.anyRepeat('left') ? -1 : 1; if (this.row < 3) t.f[this.row] = clamp(t.f[this.row] + k, this.row === 1 ? 0 : 1, 99); else { t.reach[1] = clamp(t.reach[1] + k, t.reach[0], 140); } this._place(); }
    if (KC.anyPressed('tUp')) KC.Dev.copy(JSON.stringify({ id: t.id, f: t.f, reach: t.reach, pts: t.pts }));
    const c = g.input.clicked(); if (c) { const p = this.dummyAt; if (p && Math.abs(c[0] - p[0]) < 20 && Math.abs(c[1] - p[1]) < 40) { const i = KC.DUMMY_MODES.indexOf(this.dmode); this.dmode = KC.DUMMY_MODES[(i + 1) % 4]; } }
    D.control(this.dmode === 'crouch' ? { posture: 'd', press: null } : this.dmode === 'jump' ? { posture: D.free && Math.floor(this.t) % 2 ? 'u' : 'n', press: null } : { posture: 'n', press: null }); D.ctlOn = this.dmode !== 'stand';
    h.update(dt, D); D.update(dt, h); KC.Bout.push(h, D);
    const s = h.strike(D); if (s) { h.resolved = true; const sc = KC.Bout.prototype._score.call({}, h, D, s); this.measured = { gap: s.gap, startGap: this.startGap, pts: sc.pts, full: sc.full, q: sc.q }; this.bus.emit('point', Object.assign({ x: (h.x + D.x) / 2, z: 50 }, sc)); }
    h.pose(dt); D.pose(dt);
    KC.camera(g, [h.x, D.x]);
  },
  draw(r) {
    const t = this.tech, h = this.hero;
    KC.Stage.draw(r, 'dojo', { noCrowd: true });
    h.draw(r); this.dummy.draw(r); const p = r.w(this.dummy.x, 0, 30); this.dummyAt = p;
    if (this.boxes) KC.DevDraw.boxes(r, [h, this.dummy]);
    r.overlay(g => {
      const W = r.W, H = r.H; E.ui.box(g, 6, 6, 196, 104, { bg: '#0c0a18', border: '#ff8a6a', alpha: .9 });
      E.font.text(g, 'TECHNIQUE LAB ' + (this.i + 1) + '/' + this.ids.length, 12, 10, '#ff8a6a', { outline: false, font: 'tiny' });
      E.font.text(g, t.name, 12, 20, '#fff6d0', { outline: false });
      const fr = h.frames(t), rows = [['STARTUP', t.f[0] + 'F (' + fr[0] + ' STEPS)'], ['ACTIVE', t.f[1] + 'F (' + fr[1] + ')'], ['RECOVERY', t.f[2] + 'F (' + fr[2] + ')'], ['REACH', t.reach[0] + '-' + t.reach[1] + ' (CONTACT ' + h.contactBand(t).map(v => Math.round(v)).join('-') + ')']];
      rows.forEach(([k, v], j) => E.font.text(g, (j === this.row ? '▸ ' : '  ') + k + ' ' + v, 12, 32 + j * 10, j === this.row ? '#ffd060' : '#c8c0e8', { outline: false, font: 'tiny' }));
      E.font.text(g, 'HEIGHT ' + KC.Karateka.heightOf(t).toUpperCase() + '  PTS ' + t.pts.join('-') + (t.unblockable ? '  UNBLOCKABLE' : ''), 12, 74, '#a8a0c8', { outline: false, font: 'tiny' });
      const M = this.measured; E.font.text(g, M ? 'MEASURED: START GAP ' + Math.round(M.startGap) + ', CONTACT GAP ' + M.gap + ', ' + M.pts + (M.full ? ' FULL' : ' HALF') : 'MEASURED: -', 12, 84, '#8ae08a', { outline: false, font: 'tiny' });
      E.font.text(g, 'DUMMY: ' + this.dmode.toUpperCase() + (this.slow ? '  SLOW 0.25x' : ''), 12, 94, '#c8c0e8', { outline: false, font: 'tiny' });
      KC.promptBar(g, W, H, [['prev', ''], ['next', 'TECHNIQUE'], ['confirm', 'PLAY'], ['tLeft', 'SLOW'], ['alt', 'BOXES'], ['tUp', 'COPY JSON']]);
    });
  },
  debugState() { return { tech: this.tech.id, measured: this.measured }; }
};
