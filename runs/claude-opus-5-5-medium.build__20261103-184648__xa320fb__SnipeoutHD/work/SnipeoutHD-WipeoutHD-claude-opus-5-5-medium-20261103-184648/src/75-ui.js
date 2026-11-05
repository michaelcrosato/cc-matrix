// The 10-foot, controller-first front end (§3.9): a widget kit (one focus, big tiles, at most six items, a prompt bar
// that follows the last device, mouse hover moves the focus, clicks activate, a BACK chip everywhere) and the screens:
// title (with the touch-only notice), main menu, challenges, options, the race setup flow, versus join, loading, results
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px;
const C = { bg: '#0a0c16', panel: '#141a2e', edge: '#29c8e8', focus: '#ffffff', text: '#e8f0ff', dim: '#7a86a0', hot: '#29c8e8', warn: '#ffd23f', bad: '#ff5a6e', good: '#5aff9a' };
SN.C = C;
const T = (g, s, x, y, c = C.text, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
const W = s => E.font.width(s, { scale: 2 });
let wheelAcc = 0;
if (typeof document !== 'undefined') addEventListener('wheel', e => { wheelAcc += Math.sign(e.deltaY); }, { passive: true });

const UI = SN.UI = {
  stack: [], focus: 0, t: 0, rects: [], idle: 0, chips: [],
  push(s) { if (this.top()) this.top()._focus = this.focus; this.stack.push(s); this.focus = s.focus ?? 0; this.enterT = 0; if (s.enter) s.enter(); this.clampFocus(); },
  pop() { const s = this.stack.pop(); if (s && s.leave) s.leave(); const t = this.top(); if (t) { this.focus = t._focus || 0; if (t.resume) t.resume(); } this.enterT = 0; this.clampFocus(); SN.sfx('ui_back'); return s; },
  replace(s) { this.stack.pop(); this.push(s); },
  reset(s) { this.stack.length = 0; this.push(s); },
  top() { return this.stack[this.stack.length - 1]; },
  items() {
    const s = this.top(); if (!s) return [];
    if (typeof s.items !== 'function') return (s.items || []).filter(Boolean);
    if (!s._its || s._itsF !== this.frame) { s._its = s.items().filter(Boolean); s._itsF = this.frame; }   // (one set of objects per frame: rects set in draw stay on them)
    return s._its;
  },
  clampFocus() { const n = this.items().length; if (this.focus >= n) this.focus = Math.max(0, n - 1); const it = this.items()[this.focus]; if (it && it.disabled && !it.lock) this.move(1); },
  move(d) { const its = this.items(), n = its.length; if (!n) return; for (let k = 0; k < n; k++) { this.focus = (this.focus + d + n) % n; if (!its[this.focus].disabled || its[this.focus].lock) break; } SN.sfx('ui_move'); },
  /** one step of the top screen: navigation, hover, clicks, back, tabs */
  update(dt) {
    this.frame = (this.frame || 0) + 1;
    const s = this.top(); if (!s) return; const I = SN.game.input; this.t += dt; this.enterT += dt;
    if (s.update && s.update(dt) === true) return;
    const its = this.items(), it = its[this.focus], horiz = s.layout === 'row';
    if (!s.navCustom && I.repeat(horiz ? 'left' : 'up')) this.move(-1);
    if (!s.navCustom && I.repeat(horiz ? 'right' : 'down')) this.move(1);
    if (it && (it.left || it.right)) { if (I.repeat(horiz ? 'up' : 'left') && it.left) { it.left(); SN.sfx('ui_tab'); } if (I.repeat(horiz ? 'down' : 'right') && it.right) { it.right(); SN.sfx('ui_tab'); } }
    if (s.tabs && (I.pressed('tabL') || I.pressed('tabR') || wheelAcc)) { const d = I.pressed('tabL') ? -1 : I.pressed('tabR') ? 1 : Math.sign(wheelAcc); s.tabs(d); SN.sfx('ui_tab'); }
    wheelAcc = 0;
    // the mouse: hover moves the focus, a click activates
    const p = I.pointer();
    if (p && (!this._pp || p[0] !== this._pp[0] || p[1] !== this._pp[1])) { I.lastDevice = 'mouse'; const k = this.rects.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); if (k >= 0 && k !== this.focus && !(its[k] && its[k].disabled && !its[k].lock)) { this.focus = k; SN.sfx('ui_move'); } }
    this._pp = p ? p.slice() : null;
    const ck = I.clicked();
    if (ck) {
      for (const c of this.chips) if (ck[0] >= c[0] && ck[0] < c[0] + c[2] && ck[1] >= c[1] && ck[1] < c[1] + c[3]) { I.consumeAll(); c[4](); return; }
      const k = this.rects.findIndex(r => r && ck[0] >= r[0] && ck[0] < r[0] + r[2] && ck[1] >= r[1] && ck[1] < r[1] + r[3]);
      if (k >= 0 && its[k]) { this.focus = k; this.activate(its[k]); return; }
    }
    if (I.pressed('confirm') && it) { I.consume('confirm'); this.activate(it); return; }
    if (I.pressed('cancel') && this.stack.length > 0) { I.consume('cancel'); this.back(); }
  },
  activate(it) {
    if (it.disabled) { SN.sfx('ui_locked'); if (it.lock) SN.HUD && (this.lockMsg = { text: it.lock, t: 2 }); return; }
    SN.sfx('ui_ok'); if (it.pick) it.pick(); else if (it.right) it.right();
  },
  back() { const s = this.top(); if (s && s.back === false) return; if (s && typeof s.back === 'function') { s.back(); SN.sfx('ui_back'); return; } if (this.stack.length > 1) this.pop(); else if (s && s.root) { SN.go('title'); SN.sfx('ui_back'); } },
  /** draw the top screen (in r.overlay) */
  draw(r) {
    this.frame = (this.frame || 0) + 1;
    const s = this.top(); if (!s) return; const I = SN.game.input;
    r.overlay(g => {
      const Wd = r.W, H = r.H; this.rects = []; this.chips = [];
      // a gradient band behind the menu column for legibility
      if (!s.noShade) { E.px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, Math.min(Wd, 250), H, '#05060c')); }
      if (s.title) { E.font.title(g, s.title, 16, 14, { scale: 3, colors: ['#ffffff', '#9ff4ff', '#29c8e8', '#1a2a4a'] }); if (s.sub) T(g, typeof s.sub === 'function' ? s.sub() : s.sub, 18, 42, C.dim, { scale: 1 }); }
      if (s.draw) s.draw(g, r, this);
      const its = this.items();
      if (s.layout !== 'custom') its.forEach((it, k) => { const rc = s.layout === 'row' ? this.rowRect(s, k, its.length, Wd, H) : this.listRect(s, k, its.length, Wd, H); this.rects[k] = rc; this.tile(g, it, rc, k === this.focus, k); });
      else its.forEach((it, k) => { this.rects[k] = it.rect || null; if (it.rect && !s.selfDraw) this.tile(g, it, it.rect, k === this.focus, k); else if (it.rect && s.selfDraw && k === this.focus && it.rect[3] > 0) this.focusFrame(g, it.rect); });
      // the prompt bar and the BACK chip
      const prompts = (s.prompts || [['confirm', 'SELECT']]).concat(s.back !== false && (this.stack.length > 1 || s.root || typeof s.back === 'function') ? [['cancel', 'BACK']] : []);
      E.px.blend(g, .7, 'normal', () => px.rect(g, 0, H - 18, Wd, 18, '#05060c'));
      const pw = SN.glyph.rowWidth(I, prompts); SN.glyph.row(g, I, prompts, Wd - pw - 8, H - 14);
      if (s.back !== false && (this.stack.length > 1 || s.root || typeof s.back === 'function')) { const bx = 6, by = H - 16, bw = 44, bh = 14, hv = this._pp && this._pp[0] >= bx && this._pp[0] < bx + bw && this._pp[1] >= by && this._pp[1] < by + bh; px.rect(g, bx, by, bw, bh, hv ? C.edge : '#2a3048'); px.rect(g, bx + 1, by + 1, bw - 2, bh - 2, hv ? '#1a4a5a' : '#141a2e'); T(g, '◂ BACK'.replace('◂', '<'), bx + bw / 2, by + 3, '#ffffff', { align: 'center' }); this.chips.push([bx, by, bw, bh, () => this.back()]); }
      if (this.lockMsg && (this.lockMsg.t -= 1 / 60) > 0) { const m = this.lockMsg.text, w = E.font.width(m) + 16; E.ui.box(g, (Wd - w) / 2, H - 44, w, 18, { bg: '#2a1018', border: C.bad }); T(g, m, Wd / 2, H - 39, '#ffffff', { align: 'center' }); }
    });
  },
  /** a focus frame drawn over a screen's own art: a pulsing double edge and chevrons (never colour alone) */
  focusFrame(g, [x, y, w, h]) {
    const p = Math.floor(Math.sin(this.t * 8) * 1.5 + 1.5);
    px.rect(g, x - 2 - p, y - 2 - p, w + 4 + p * 2, 1, '#ffffff'); px.rect(g, x - 2 - p, y + h + 1 + p, w + 4 + p * 2, 1, '#ffffff'); px.rect(g, x - 2 - p, y - 2 - p, 1, h + 4 + p * 2, '#ffffff'); px.rect(g, x + w + 1 + p, y - 2 - p, 1, h + 4 + p * 2, '#ffffff');
    for (const [cx, dir] of [[x - 9 - p, 1], [x + w + 5 + p, -1]]) for (let i = 0; i < 4; i++) { px.rect(g, cx + (dir > 0 ? i : 3 - i), y + h / 2 - 4 + i, 2, 1, C.edge); px.rect(g, cx + (dir > 0 ? i : 3 - i), y + h / 2 + 3 - i, 2, 1, C.edge); }
  },
  listRect(s, k, n, Wd, H) { const w = s.tileW || 200, h = 22, gap = 5, y0 = s.y0 || Math.max(60, Math.round(H / 2 - (n * (h + gap)) / 2 + 6)); return [18, y0 + k * (h + gap), w, h]; },
  rowRect(s, k, n, Wd, H) { const w = Math.min(96, Math.floor((Wd - 40) / n) - 6), h = s.tileH || 64, x0 = Math.round(Wd / 2 - (n * (w + 6)) / 2); return [x0 + k * (w + 6), s.y0 || Math.round(H / 2 - h / 2), w, h]; },
  /** a tile: thick animated chevron frame + colour shift + a shimmer when focused (never colour alone) */
  tile(g, it, [x, y, w, h], on, k) {
    const t = this.t, slide = Math.min(1, this.enterT / .18 + k * -.03), ox = Math.round((1 - E.ease.outBack(Math.max(0, slide))) * -40);
    x += ox;
    const dis = it.disabled;
    px.rect(g, x, y, w, h, on ? '#ffffff' : dis ? '#2a2c38' : '#3a4664');
    px.rect(g, x + 1, y + 1, w - 2, h - 2, on ? '#1a5a78' : dis ? '#14161e' : '#16203a');
    if (on) { const sx = x + 2 + Math.floor((t * 90) % (w - 4)); px.rect(g, sx, y + 1, 2, h - 2, '#3a8aa8'); const p = Math.floor(Math.sin(t * 8) * 2 + 2); for (const [cx, dir] of [[x - 6 - p, 1], [x + w + 3 + p, -1]]) for (let i = 0; i < 4; i++) { px.rect(g, cx + (dir > 0 ? i : 3 - i), y + h / 2 - 4 + i, 2, 1, C.edge); px.rect(g, cx + (dir > 0 ? i : 3 - i), y + h / 2 + 3 - i, 2, 1, C.edge); } px.rect(g, x, y, 3, h, C.edge); }
    if (it.color) px.rect(g, x + w - 6, y + 3, 3, h - 6, it.color);
    const lab = it.label + (it.value ? '' : '');
    if (h >= 40) { // a big tile (row layouts)
      if (it.icon) it.icon(g, x + w / 2, y + 18);
      T(g, lab, x + w / 2, y + h - (it.sub ? 26 : 16), dis ? C.dim : on ? '#ffffff' : C.text, { align: 'center', scale: lab.length > 9 ? 1 : 2 });
      if (it.sub) T(g, it.sub, x + w / 2, y + h - 12, on ? '#bff8ff' : C.dim, { align: 'center' });
    } else {
      T(g, lab, x + 10, y + 4, dis ? C.dim : on ? '#ffffff' : C.text, { scale: 2 });
      if (it.value) { const v = typeof it.value === 'function' ? it.value() : it.value; T(g, '< ' + v + ' >', x + w - 10, y + 7, on ? C.warn : C.dim, { align: 'right' }); }
      else if (it.sub) T(g, it.sub, x + w - 8, y + 8, on ? '#bff8ff' : C.dim, { align: 'right', font: 'tiny' });
    }
    if (dis && it.lock) { px.rect(g, x + w - 14, y + h / 2 - 3, 7, 6, C.dim); px.rect(g, x + w - 13, y + h / 2 - 6, 5, 3, C.dim); px.rect(g, x + w - 12, y + h / 2 - 5, 3, 2, '#14161e'); }
  }
};

/* ---- shared helpers ---- */
SN.sfx = (n, o) => { if (SN.Audio) SN.Audio.sfx(n, o); };
SN.isTouchOnly = () => { if (typeof matchMedia === 'undefined' || typeof navigator === 'undefined') return false; if (SN._sawKey) return false; let pad = false; try { pad = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(Boolean); } catch (e) { pad = false; } return !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0 && !pad; };
if (typeof window !== 'undefined' && window.addEventListener) { addEventListener('keydown', () => { SN._sawKey = true; SN._anyKey = true; }); addEventListener('gamepadconnected', () => { SN._sawKey = true; }); addEventListener('pointerdown', () => { SN._anyKey = true; }); }
/** any key at all (bound or not), a click or a tap since the last call */
SN.anyRaw = () => { const k = !!SN._anyKey; SN._anyKey = false; return k; };
SN.unlocked = cls => !SN.save || SN.save.data.unlocked.classes.includes(cls);
SN.speedText = v => { const kmh = Math.max(0, v) * SN.KMH; return SN.game && SN.game.settings.units === 'mph' ? Math.round(kmh * .6214) + ' MPH' : Math.round(kmh) + ' KM/H'; };
/** draw the track outline (plan view) fitted into a box */
SN.drawOutline = (g, T, x, y, w, h, color = '#ffffff', o = {}) => {
  const [x0, y0, x1, y1] = T.bounds, k = Math.min(w / (x1 - x0), h / (y1 - y0)), ox = x + (w - (x1 - x0) * k) / 2, oy = y + (h - (y1 - y0) * k) / 2, pts = T.minimap;
  const P = p => [Math.round(ox + (p[0] - x0) * k), Math.round(oy + (p[1] - y0) * k)];
  for (let i = 0; i < pts.length; i++) { const a = P(pts[i]), b = P(pts[(i + 1) % pts.length]); px.line(g, a[0], a[1], b[0], b[1], o.shadow || '#000000', (o.width || 1) + 2); }
  for (let i = 0; i < pts.length; i++) { const a = P(pts[i]), b = P(pts[(i + 1) % pts.length]); const hi = o.upper && o.upper(i); px.line(g, a[0], a[1], b[0], b[1], hi ? '#ffffff' : color, o.width || 1); }
  return P;
};

/* ---- the title ---- */
SN.scenes.title = {
  input: SN.INPUT,
  enter() {
    this.idle = 0; this.t = 0; SN.Audio && SN.Audio.music('zero');
    SN.game.splitScreen(0);
    this.demo();
  },
  demo() {
    const view = this.vw = SN.loadView(this.trackId || 'solenne');
    const R = this.race = new SN.Race({ track: view.T.id, mode: 'race', cls: 'flare', laps: 3, seed: 11 + (this.n = (this.n || 0) + 1), entrants: SN.field([]), intro: false });
    R.state = 'racing'; R.t = 0; view.bind(R); const c = view.cams[0]; c.tv = true; c.tvTarget = () => R.order[0]; c.ship = R.ships[0];
  },
  update(dt) {
    const I = SN.game.input; this.t += dt;
    const any = SN.anyRaw() || I.anyPressed() || I.clicked() || Math.hypot(...(I.padMove || [0, 0])) > .3 || (I.pointer() && I.lastDevice === 'mouse' && this._pp && I.pointer()[0] !== this._pp[0]);
    this._pp = I.pointer() ? I.pointer().slice() : null;
    if (any) this.idle = 0; else this.idle += dt;
    if (this.idle >= 10 && SN.Attract) { this.idle = 0; SN.Attract.start(); return; }
    const touch = SN.isTouchOnly();
    if (touch) { const ck = I.clicked(); if (ck && this.settingsRect && ck[0] >= this.settingsRect[0] && ck[0] < this.settingsRect[0] + this.settingsRect[2] && ck[1] >= this.settingsRect[1] && ck[1] < this.settingsRect[1] + this.settingsRect[3]) SN.game.menu('settings'); }
    else if ((I.pressed('confirm') || I.pressed('start') || I.clicked()) && this.t > .4) { I.consumeAll(); SN.sfx('ui_ok'); SN.go('menu', { screen: 'main' }); return; }
    const R = this.race; R.step(dt); if (R.state === 'results' || R.t > 120) this.demo();
    this.vw.step(dt);
  },
  draw(r) {
    if (this.vw.world) this.vw.world.draw(r);
    r.overlay(g => {
      const Wd = r.W, H = r.H, I = SN.game.input;
      E.px.blend(g, .45, 'normal', () => { px.rect(g, 0, 0, Wd, 64, '#05060c'); px.rect(g, 0, H - 40, Wd, 40, '#05060c'); });
      SN.drawLogo(g, Wd / 2, Math.round(H * .16), 5, this.t);
      T(g, 'ANTI-GRAVITY. ANTI-EVERYONE.', Wd / 2, Math.round(H * .16) + 46, '#bff8ff', { align: 'center' });
      if (SN.isTouchOnly()) {
        const w = 250, x = (Wd - w) / 2, y = H / 2 - 10; E.ui.box(g, x, y, w, 30, { bg: ['#1a1030', '#0a0a18'], border: C.bad }); T(g, 'CONTROLLER OR KEYBOARD REQUIRED', Wd / 2, y + 8, '#ffffff', { align: 'center', scale: 1 }); T(g, 'Connect one, or press a key, to race.', Wd / 2, y + 19, C.dim, { align: 'center', font: 'tiny' });
        const bw = 120, bh = 26, bx = (Wd - bw) / 2, by = y + 40; this.settingsRect = [bx, by, bw, bh]; px.rect(g, bx, by, bw, bh, '#ffffff'); px.rect(g, bx + 2, by + 2, bw - 4, bh - 4, '#1a5a78'); T(g, 'SETTINGS', Wd / 2, by + 7, '#ffffff', { align: 'center', scale: 2 });
      } else if (Math.floor(this.t * 2) % 2 === 0 || this.t < 1) {
        const items = [['confirm', 'PRESS TO START']], w = SN.glyph.rowWidth(I, items); SN.glyph.row(g, I, items, Math.round((Wd - w) / 2), H - 28);
      }
      T(g, (E.versionLabel ? E.versionLabel() : 'v' + SN.VERSION).replace(/·/g, '•'), Wd - 4, H - 9, '#5a6480', { align: 'right', font: 'tiny' });
      T(g, 'SNIPEOUT HD ' + SN.VERSION, 4, H - 9, '#5a6480', { font: 'tiny' });
    });
  }
};
/** the logo: chrome gradient title, an HD badge, a light sweep */
SN.drawLogo = (g, cx, y, scale, t) => {
  const s = 'SNIPEOUT', w = E.font.width(s, { scale });
  E.font.title(g, s, cx - 14, y, { scale, align: 'center', colors: ['#ffffff', '#9ff4ff', '#29c8e8', '#1a2a4a'], depth: 2, depthColor: '#0a1020' });
  const bx = Math.round(cx - 14 + w / 2 + 6), by = y + 6; px.rect(g, bx, by, 26, 22, '#ffffff'); px.rect(g, bx + 2, by + 2, 22, 18, '#ff3ab4'); E.font.text(g, 'HD', bx + 13, by + 5, '#ffffff', { scale: 2, align: 'center', outline: false });
  const sweep = ((t * 120) % (w + 160)) - 80; E.px.blend(g, .35, 'add', () => { for (let k = 0; k < 6; k++) px.rect(g, Math.round(cx - 14 - w / 2 + sweep + k), y - 2, 2, scale * 8 + 4, '#ffffff'); });
};

/* ---- the menu scene: the hangar behind every front-end screen ---- */
SN.screens = {};
SN.scenes.menu = {
  input: SN.INPUT,
  enter(d) {
    SN.game.splitScreen(0); SN.game.allowJoin(false);
    this.idle = 0; SN.Audio && SN.Audio.music('zero');
    if (SN.hangar) SN.hangar.turntable();
    const name = d && d.screen || 'main';
    if (d && d.keep && UI.stack.length) { if (UI.top().resume) UI.top().resume(); }
    else UI.reset(SN.screens.main());
    if (name !== 'main' && SN.screens[name]) UI.push(SN.screens[name](d));
  },
  update(dt) {
    const I = SN.game.input;
    if (SN.Dev && SN.Dev.open) { SN.Dev.update(dt); if (SN.hangar) SN.hangar.step(dt); return; }
    if (SN.Story && SN.Story.update(dt)) { if (SN.hangar) SN.hangar.step(dt); return; }
    const any = SN.anyRaw() || I.anyPressed() || I.clicked() || Math.hypot(...(I.padMove || [0, 0])) > .3 || (I.pointer() && this._pp && I.pointer()[0] !== this._pp[0]);
    this._pp = I.pointer() ? I.pointer().slice() : null;
    this.idle = any ? 0 : this.idle + dt;
    if (this.idle >= 10 && SN.Attract && !(SN.game.players.length > 1)) { this.idle = 0; SN.Attract.start(); return; }
    UI.update(dt);
    if (SN.hangar) {
      if (I.padAim) SN.hangar.drag = (SN.hangar.drag || 0) + I.padAim[0] * dt * 3;
      const p = I.pointer(); if (p && I.down('fire') && this._dp) SN.hangar.drag = (SN.hangar.drag || 0) + (p[0] - this._dp[0]) * .03; this._dp = p && I.down('fire') ? p.slice() : null;
      SN.hangar.step(dt);
    }
  },
  draw(r) {
    if (SN.hangar && SN.hangar.world) SN.hangar.world.draw(r); else r.sky(['#05060c', '#141a2e', '#29c8e8']);
    UI.draw(r);
    if (SN.Story) SN.Story.draw(r);
    if (SN.Dev && SN.Dev.open) SN.Dev.draw(r);
  }
};

/* ---- screens ---- */
const S = SN.screens;
S.main = () => ({ id: 'main', root: true, title: 'SNIPEOUT HD', sub: 'HOVERLINE CHAMPIONSHIP • SEASON 2161', items: () => [
  { id: 'season', label: SN.save && SN.save.data.started ? 'CONTINUE SEASON' : 'SEASON', sub: SN.save && SN.save.data.started ? (SN.Season ? SN.Season.summary() : '') : 'THE CAMPAIGN', pick: () => SN.Season ? SN.Season.open() : null },
  { id: 'quick', label: 'QUICK RACE', sub: '8 CRAFT', pick: () => UI.push(S.setupClass({ mode: 'race' })) },
  { id: 'challenges', label: 'CHALLENGES', sub: '>', pick: () => UI.push(S.challenges()) },
  { id: 'versus', label: 'VERSUS', sub: '2 PLAYERS', pick: () => UI.push(S.versus()) },
  { id: 'academy', label: 'ACADEMY', sub: '11 DRILLS', pick: () => SN.go('loading', { setup: SN.Academy.setup() }) },
  { id: 'options', label: 'OPTIONS', sub: '>', pick: () => UI.push(S.options()) }
], draw(g, r) { SN.drawPilotCard(g, r); } });
S.challenges = () => ({ id: 'challenges', title: 'CHALLENGES', sub: 'NO FIELD. NO EXCUSES.', items: [
  { id: 'timetrial', label: 'TIME TRIAL', sub: 'GHOST', pick: () => UI.push(S.setupClass({ mode: 'timetrial', laps: 3 })) },
  { id: 'hotlap', label: 'HOT LAP', sub: 'ONE LAP', pick: () => UI.push(S.setupClass({ mode: 'hotlap' })) },
  { id: 'snipeout', label: 'SNIPEOUT', sub: 'COMBAT', pick: () => UI.push(S.setupClass({ mode: 'snipeout', target: 10 })) },
  { id: 'overclock', label: 'OVERCLOCK', sub: 'SURVIVE', pick: () => UI.push(S.setupTrack({ mode: 'overclock', cls: 'spark' })) }
], draw(g, r) { SN.modeBlurb(g, r, UI.items()[UI.focus] && UI.items()[UI.focus].id); } });
S.options = () => ({ id: 'options', title: 'OPTIONS', items: [
  { id: 'settings', label: 'SETTINGS', pick: () => SN.game.menu('settings') },
  { id: 'controls', label: 'CONTROLS', pick: () => SN.game.menu('controls') },
  { id: 'howto', label: 'HOW TO PLAY', pick: () => UI.push(S.howto()) },
  { id: 'records', label: 'RECORDS', pick: () => UI.push(S.records()) },
  { id: 'about', label: 'ABOUT / CREDITS', pick: () => UI.push(S.about()) },
  { id: 'dev', label: 'DEV MODE', pick: () => SN.Dev && SN.Dev.show() }
] });
const MODE_TEXT = {
  timetrial: ['Three laps, no weapons, your ghost.', 'Beat it and it becomes the new ghost.'],
  hotlap: ['A flying start. One perfect lap counts.', 'End the run from the pause menu.'],
  snipeout: ['A point a hit, three an elimination.', 'Eliminated craft respawn. First to 10.'],
  overclock: ['The engine never stops. Neither does the clock.', 'Every 12 s the speed climbs. Survive.']
};
SN.modeBlurb = (g, r, id) => { const t = MODE_TEXT[id]; if (!t) return; const x = 240, y = r.H / 2 - 20; if (r.W < 400) return; E.ui.box(g, x, y, r.W - x - 14, 40, { bg: ['#141a2e', '#0a0c16'], border: '#3a4664', alpha: .9 }); T(g, t[0], x + 8, y + 9, '#ffffff'); T(g, t[1], x + 8, y + 23, C.dim); };
SN.drawPilotCard = (g, r) => {
  if (!SN.save || r.W < 400) return; const d = SN.save.data, p = SN.PILOT[d.pilot] || SN.PILOTS[0], t = SN.TEAM[p.team], x = r.W - 150, y = r.H - 84;
  E.ui.box(g, x, y, 136, 58, { bg: ['#141a2e', '#0a0c16'], border: t.colors[1], alpha: .92 });
  const rig = SN.rigFor(p.id); rig.drawPortrait(g, x + 6, y + 6, 46, { bg: '#0a0c16' });
  T(g, p.name, x + 58, y + 8, '#ffffff'); T(g, t.short, x + 58, y + 20, t.colors[1]); T(g, 'MEDALS ' + Object.keys(d.medals).length, x + 58, y + 34, C.warn); T(g, d.unlocked.classes.map(c => c[0].toUpperCase()).join(' '), x + 58, y + 44, C.dim, { font: 'tiny' });
};

/* ---- the setup flow: class -> track -> team -> confirm ---- */
const CLASS_ICON = (cls) => (g, x, y) => { const k = SN.CLASSES.findIndex(c => c.id === cls); for (let i = 0; i <= k; i++) { px.poly(g, [[x - 10 + i * 6, y - 6], [x - 4 + i * 6, y], [x - 10 + i * 6, y + 6], [x - 7 + i * 6, y]], '#29c8e8'); } };
S.setupClass = (st) => ({ id: 'class', title: 'SPEED CLASS', sub: (SN.MODE_NAMES[st.mode] || '') + ' • CHOOSE YOUR SPEED', layout: 'row', tileH: 70, items: SN.CLASSES.map(c => ({ id: c.id, label: c.name, sub: Math.round(c.top * SN.KMH * 1.012) + ' KM/H', icon: CLASS_ICON(c.id), disabled: !SN.unlocked(c.id), lock: !SN.unlocked(c.id) && c.unlock, pick: () => UI.push(S.setupTrack(Object.assign({}, st, { cls: c.id }))) })),
  focus: Math.max(0, SN.CLASSES.findIndex(c => SN.save && c.id === SN.save.data.lastCls && SN.unlocked(c.id))) });
S.setupTrack = (st) => {
  let k = Math.max(0, SN.TRACK_IDS.indexOf(SN.save && SN.save.data.lastTrack || 'solenne'));
  const cur = () => SN.TRACKS[SN.TRACK_IDS[k]], go = d => { k = (k + d + 4) % 4; };
  return { id: 'track', title: 'CIRCUIT', sub: () => (SN.MODE_NAMES[st.mode] || '') + ' • ' + (SN.CLASS[st.cls] ? SN.CLASS[st.cls].name : ''), layout: 'custom', selfDraw: true, tabs: d => go(d), prompts: [['confirm', 'SELECT'], ['tabL', ''], ['tabR', 'CIRCUIT']],
    items: () => [{ id: 'trackcard', label: cur().name, rect: null, left: () => go(-1), right: () => go(1), pick: () => { const next = Object.assign({}, st, { track: cur().id }); UI.push(st.players ? S.confirm(next) : S.setupTeam(next)); } }],
    draw(g, r, ui) {
      const tr = cur(), Tk = SN.getTrack(tr.id), Wd = r.W, H = r.H, cw = Math.min(380, Wd - 40), ch = H - 92, x = Math.round((Wd - cw) / 2), y = 56, th = SN.THEMES[tr.theme];
      E.ui.box(g, x, y, cw, ch, { bg: ['#141a2e', '#05060c'], border: th.neon });
      SN.drawOutline(g, Tk, x + 10, y + 26, 150, ch - 40, th.neon, { width: 2, upper: i => Tk.overpasses.some(o => Math.abs(i * 10 - o.upper) < 40) });
      T(g, tr.name, x + 170, y + 10, '#ffffff', { scale: 2 }); T(g, tr.place, x + 170, y + 28, C.dim, { font: 'tiny' });
      T(g, tr.lengthKm.toFixed(2) + ' KM', x + 170, y + 42, '#ffffff'); T(g, 'DIFFICULTY', x + 170, y + 56, C.dim);
      for (let i = 0; i < 4; i++) px.rect(g, x + 232 + i * 9, y + 57, 7, 6, i < tr.diff ? th.neon : '#2a3048');
      const rec = SN.save && SN.save.data.records[tr.id + '/' + (st.cls || 'spark') + '/' + (st.mode === 'hotlap' ? 'hotlap' : st.mode === 'timetrial' ? 'timetrial' : 'race')];
      T(g, 'BEST ' + (rec ? SN.fmtTime(rec.ms / 1000) : '--:--.--'), x + 170, y + 70, C.warn);
      T(g, tr.jumps && tr.jumps[0] ? tr.jumps[0].name : '', x + 170, y + 84, '#ff9a6a');
      E.font.text(g, tr.blurb, x + 170, y + 100, '#c8d0e0', { wrap: cw - 180, outline: false, shadow: '#000' });
      // clickable arrows
      const ay = y + ch / 2 - 10; for (const [ax, d, s] of [[x - 18, -1, '<'], [x + cw + 4, 1, '>']]) { px.rect(g, ax, ay, 14, 20, '#29c8e8'); px.rect(g, ax + 1, ay + 1, 12, 18, '#141a2e'); T(g, s, ax + 7, ay + 6, '#ffffff', { align: 'center' }); ui.chips.push([ax, ay, 14, 20, () => { go(d); SN.sfx('ui_tab'); }]); }
      ui.items()[0].rect = [x, y, cw, ch];
      for (let i = 0; i < 4; i++) px.rect(g, Wd / 2 - 22 + i * 12, y + ch + 6, 8, 3, i === k ? '#ffffff' : '#3a4664');
    } };
};
S.setupTeam = (st) => {
  const teams = SN.TEAMS; let k = Math.max(0, teams.findIndex(t => t.id === (st.team || (SN.save && SN.save.data.team) || 'kestrel'))), p = 0;
  const pilots = () => SN.pilotsOf(teams[k].id);
  const sync = () => { if (SN.hangar) SN.hangar.show(teams[k].id, st.champion); };
  return { id: 'team', title: st.who ? st.who + ' • TEAM' : 'TEAM', sub: () => teams[k].city + ' • ' + teams[k].craft, layout: 'custom', noShade: true, selfDraw: true, tabs: d => { k = (k + d + teams.length) % teams.length; p = 0; sync(); }, enter: sync, resume: sync,
    prompts: [['confirm', 'SELECT'], ['tabL', ''], ['tabR', 'TEAM']],
    items: () => [
      { id: 'team', label: teams[k].short, rect: null, left: () => { k = (k + teams.length - 1) % teams.length; p = 0; sync(); }, right: () => { k = (k + 1) % teams.length; p = 0; sync(); }, pick: () => { UI.focus = 1; } },
      { id: 'pilot', label: pilots()[p].name, rect: null, left: () => { p = (p + 1) % 2; }, right: () => { p = (p + 1) % 2; }, pick: () => { UI.focus = 3; } },
      SN.save && SN.save.data.unlocked.champion ? { id: 'livery', label: 'LIVERY', value: () => st.champion ? 'CHAMPION' : 'TEAM', rect: null, left: () => { st.champion = !st.champion; sync(); }, right: () => { st.champion = !st.champion; sync(); } } : { id: 'livery', label: '', disabled: true, rect: null },
      { id: 'go', label: 'CONFIRM', rect: null, pick: () => { const next = Object.assign({}, st, { team: teams[k].id, pilot: pilots()[p].id }); if (SN.save) { SN.save.data.livery = st.champion ? 'champion' : 'team'; } if (st.then) st.then(next); else UI.push(S.confirm(next)); } }
    ],
    draw(g, r, ui) {
      const t = teams[k], Wd = r.W, H = r.H, x = 14, y = 54, w = 196;
      E.ui.box(g, x, y, w, H - 74, { bg: ['#141a2ee8', '#05060ce8'], border: t.colors[1] });
      E.font.title(g, t.short, x + 10, y + 8, { scale: 2, colors: ['#ffffff', t.colors[1] === '#16161c' ? '#ffffff' : t.colors[1]] });
      E.font.text(g, t.copy, x + 10, y + 30, '#c8d0e0', { wrap: w - 20, font: 'tiny', outline: false });
      const bars = [['SPEED', t.stats.speed], ['THRUST', t.stats.thrust], ['HANDLING', t.stats.handling], ['SHIELD', t.stats.shield]];
      bars.forEach(([n, v], i) => { const yy = y + 46 + i * 10; T(g, n, x + 10, yy, C.dim); for (let s = 0; s < 10; s++) px.rect(g, x + 76 + s * 11, yy + 1, 9, 7, s < v ? t.colors[1] === '#16161c' ? '#e0213a' : t.colors[1] : '#2a3048'); });
      const items = ui.items(), rects = [[x + 6, y + 89, w - 12, 13], [x + 6, y + 104, w - 12, 29], [x + 6, y + 135, w - 12, items[2] && !items[2].disabled ? 10 : 0], [x + 6, y + 148, w - 12, 16]];
      items.forEach((it, i) => it.rect = rects[i]);
      // the pilot toggle with portraits
      const ps = pilots(); ps.forEach((pp, i) => { const rx = x + 10 + i * 92, ry = y + 106; if (i === p) px.rect(g, rx - 1, ry - 1, 27, 27, '#ffffff'); SN.rigFor(pp.id).drawPortrait(g, rx, ry, 25, { bg: '#0a0c16' }); T(g, pp.name.split(' ')[0], rx + 30, ry + 5, i === p ? '#ffffff' : C.dim, { font: 'tiny' }); T(g, pp.name.split(' ')[1] || '', rx + 30, ry + 14, i === p ? '#ffffff' : C.dim, { font: 'tiny' }); });
      T(g, '"' + ps[p].line + '"', Wd - 10, H - 34, '#bff8ff', { align: 'right' });
      const cb = rects[3], cOn = ui.focus === 3; px.rect(g, cb[0], cb[1], cb[2], cb[3], cOn ? '#ffffff' : '#3a4664'); px.rect(g, cb[0] + 1, cb[1] + 1, cb[2] - 2, cb[3] - 2, cOn ? '#1a5a78' : '#16203a'); T(g, 'CONFIRM', cb[0] + cb[2] / 2, cb[1] + 1, '#ffffff', { align: 'center', scale: 2 });
      T(g, '< ' + (k + 1) + '/' + teams.length + ' >', x + w - 10, y + 92, ui.focus === 0 ? '#ffd23f' : C.dim, { align: 'right' }); T(g, 'TEAM', x + 10, y + 92, ui.focus === 0 ? '#ffffff' : C.dim);
      if (items[2] && !items[2].disabled) T(g, 'LIVERY  < ' + items[2].value() + ' >', x + 10, y + 136, ui.focus === 2 ? '#ffd23f' : C.dim, { font: 'tiny' });
      T(g, t.craft, Wd - 10, 60, '#ffffff', { align: 'right', scale: 2 });
    } };
};
S.confirm = (st) => {
  const lapsOk = st.mode === 'race' || st.mode === 'versus';
  return { id: 'confirm', title: 'READY', sub: 'RACE CONTROL AWAITS', items: () => [
    lapsOk ? { id: 'laps', label: 'LAPS', value: () => String(st.laps || 3), left: () => { st.laps = Math.max(1, (st.laps || 3) - 1); }, right: () => { st.laps = Math.min(5, (st.laps || 3) + 1); } } : null,
    st.mode === 'snipeout' || st.vmode === 'snipeout' ? { id: 'target', label: 'TARGET', value: () => String(st.target || 10), left: () => { st.target = Math.max(5, (st.target || 10) - 1); }, right: () => { st.target = Math.min(20, (st.target || 10) + 1); } } : null,
    { id: 'start', label: 'START RACE', pick: () => { if (SN.save) { SN.save.data.lastTrack = st.track; SN.save.data.lastCls = st.cls; if (!st.players) { SN.save.data.team = st.team; SN.save.data.pilot = st.pilot; } } SN.go('loading', { setup: Object.assign({ laps: st.laps || (st.mode === 'race' ? 3 : undefined) }, st) }); } }
  ], draw(g, r) {
    const x = 240, y = 64; if (r.W < 400) return;
    E.ui.box(g, x, y, r.W - x - 14, 92, { bg: ['#141a2e', '#05060c'], border: '#29c8e8', alpha: .92 });
    const rows = [['MODE', SN.MODE_NAMES[st.vmode || st.mode] || ''], ['CLASS', SN.CLASS[st.cls] ? SN.CLASS[st.cls].name : 'ZONE 1'], ['CIRCUIT', SN.TRACKS[st.track].name], ['TEAM', st.players ? st.players.map(p => SN.TEAM[p.team].short).join(' / ') : SN.TEAM[st.team].short], ['PILOT', st.players ? st.players.map(p => SN.PILOT[p.pilot].name.split(' ')[0]).join(' / ') : SN.PILOT[st.pilot].name]];
    rows.forEach(([a, b], i) => { T(g, a, x + 8, y + 8 + i * 16, C.dim); T(g, b, x + 70, y + 8 + i * 16, '#ffffff'); });
  } };
};
/* ---- versus: the second player joins, both pick teams, then race or snipeout ---- */
S.versus = () => {
  const st = { mode: 'versus', vmode: 'race', laps: 3, players: [] };
  return { id: 'versus', title: 'VERSUS', sub: 'TWO PILOTS • ONE SCREEN', layout: 'custom',
    enter() { SN.game.allowJoin({ max: 2 }); }, leave() { if (!st.started) { SN.game.allowJoin(false); while (SN.game.players.length > 1) SN.game.removePlayer(SN.game.players[1]); } },
    items: () => SN.game.players.length > 1 ? [
      { id: 'vmode', label: 'MODE', value: () => st.vmode === 'race' ? 'RACE' : 'SNIPEOUT', rect: [18, 150, 200, 22], left: () => { st.vmode = st.vmode === 'race' ? 'snipeout' : 'race'; }, right: () => { st.vmode = st.vmode === 'race' ? 'snipeout' : 'race'; } },
      { id: 'go', label: 'PICK TEAMS', rect: [18, 177, 200, 22], pick: () => { st.started = true; SN.game.allowJoin(false); UI.push(S.setupTeam({ who: 'P1', then: a => { st.players[0] = { team: a.team, pilot: a.pilot }; UI.push(S.setupTeam({ who: 'P2', team: SN.TEAMS[(SN.TEAMS.findIndex(t => t.id === a.team) + 1) % 6].id, then: b => { st.players[1] = { team: b.team, pilot: b.pilot === a.pilot ? SN.pilotsOf(b.team).find(p => p.id !== a.pilot).id : b.pilot }; UI.push(S.setupClass(Object.assign({}, st, { mode: 'versus' }))); } })); } })); } }
    ] : [],
    draw(g, r) {
      const Wd = r.W, I = SN.game.input, two = SN.game.players.length > 1;
      T(g, two ? 'PLAYER 2 IS IN.' : 'PLAYER 2: PRESS START ON A SECOND PAD, OR 2 ON THE KEYBOARD', 18, 62, two ? C.good : '#ffffff', { wrap: Wd - 40 });
      // both keyboard layouts, read from the players' own labels
      const P = SN.game.players, lay = (q, x, y, name) => { E.ui.box(g, x, y, 190, 70, { bg: ['#141a2e', '#05060c'], border: q ? q.color || '#29c8e8' : '#3a4664', alpha: .9 }); T(g, name, x + 8, y + 6, q ? '#ffffff' : C.dim); if (!q) { T(g, 'NOT JOINED', x + 8, y + 22, C.dim); return; } const acts = [['steer', 'STEER'], ['thrust', 'THRUST'], ['fire', 'FIRE'], ['brakeL', 'AIRBRAKES']]; acts.forEach(([a, l], i) => { const w = SN.glyph.draw(g, q, a, x + 8 + (i % 2) * 90, y + 22 + Math.floor(i / 2) * 20); T(g, l, x + 12 + w + (i % 2) * 90, y + 24 + Math.floor(i / 2) * 20, '#ffffff', { font: 'tiny' }); }); };
      lay(P[0], 18, 76, 'P1'); if (Wd > 420) lay(P[1], 222, 76, 'P2'); else lay(P[1], 18, 200, 'P2');
    } };
};

/* ---- loading: the track card, a bar, a tip; the world is built behind it ---- */
const TIPS = ['Absorb a weapon you can\'t use: shield is worth more than a miss.', 'The inside airbrake is a rudder. Squeeze it, don\'t stamp on it.', 'Nose down on descents. Nose up over gaps.', 'Barrel roll in the air for a boost. Land it flat, or don\'t bother.', 'The green strip is the pit lane. It recharges your shield.', 'Side-shift through mines. Or take them personally.', 'A perfect start: hold thrust until the rev bar sits in the window.'];
SN.scenes.loading = {
  input: SN.INPUT,
  enter(d) { this.d = d; this.t = 0; this.built = false; this.tip = TIPS[Math.floor(Math.random() * TIPS.length)]; SN.game.splitScreen(0); },
  update(dt) {
    this.t += dt;
    if (!this.built && this.t > .05) { const S = this.d.setup; SN.loadView(S.track, S.mode === 'overclock' ? 'overclock' : 'normal'); this.built = true; }
    if (this.built && this.t > .6) { SN.game.go(this.d.next || 'race', this.d, { fade: 'wipe', seconds: .25 }); this.t = -99; }
  },
  draw(r) {
    r.overlay(g => {
      const S = this.d.setup, tr = SN.TRACKS[S.track], Wd = r.W, H = r.H, th = SN.THEMES[S.mode === 'overclock' ? 'overclock' : tr.theme];
      px.rect(g, 0, 0, Wd, H, '#05060c'); px.rect(g, 0, H / 2 - 50, Wd, 100, '#0a0c16'); px.rect(g, 0, H / 2 - 50, Wd, 2, th.neon); px.rect(g, 0, H / 2 + 48, Wd, 2, th.neon);
      E.font.title(g, tr.name, Wd / 2, H / 2 - 36, { scale: 4, align: 'center', colors: ['#ffffff', '#c8f0ff', th.neon] });
      T(g, tr.place, Wd / 2, H / 2 + 2, C.dim, { align: 'center' });
      T(g, (SN.MODE_NAMES[S.vmode || S.mode] || '') + (S.cls && S.mode !== 'overclock' ? ' • ' + SN.CLASS[S.cls].name : '') + (S.laps && S.mode !== 'hotlap' && S.mode !== 'overclock' && S.mode !== 'snipeout' && S.mode !== 'academy' ? ' • ' + S.laps + ' LAPS' : ''), Wd / 2, H / 2 + 16, '#ffffff', { align: 'center', scale: 1 });
      const bw = 200, k = Math.min(1, this.t / .6); px.rect(g, (Wd - bw) / 2, H / 2 + 32, bw, 4, '#1a2030'); px.rect(g, (Wd - bw) / 2, H / 2 + 32, Math.round(bw * k), 4, th.neon);
      E.font.text(g, this.tip, Wd / 2, H - 30, '#bff8ff', { align: 'center', outline: false, shadow: '#000' });
    });
  }
};

/* ---- results: podium (top 3) then one row per craft; CONTINUE • RETRY • REPLAY • MENU ---- */
SN.scenes.results = {
  input: SN.INPUT,
  enter(d) {
    this.result = (d && d.result) || SN.lastResult; this.t = 0; SN.game.splitScreen(0); SN.game.timeScale = 1;
    const p = this.result.player, rows = this.result.results;
    this.podium = SN.hangar && SN.hangar.world && p && p.place <= 3 && ['race', 'snipeout'].includes(this.result.mode) && !this.result.versus;
    if (this.podium) SN.hangar.podium(rows.slice(0, 3).map(r => r.pilot));
    this.phase = this.podium ? 'podium' : 'table';
    const S = this.result.setup, season = !!S.event;
    const it = [];
    if (season || S.gp) it.push({ id: 'continue', label: 'CONTINUE', pick: () => SN.Season.afterResults(this.result) });
    else it.push({ id: 'continue', label: 'CONTINUE', pick: () => SN.go('menu', { screen: 'main' }) });
    it.push({ id: 'retry', label: 'RETRY', pick: () => SN.go('loading', { setup: Object.assign({}, S, { seed: undefined }) }) });
    if (this.result.mode !== 'academy') it.push({ id: 'replay', label: 'REPLAY', pick: () => SN.go('race', { setup: S, replayRec: this.result.rec }) });   // (drills teleport the craft: not a replayable race)
    it.push({ id: 'menu', label: 'MENU', pick: () => { if (SN.Season) SN.Season.leaveGP && SN.Season.leaveGP(this.result); SN.go('menu', { screen: 'main' }); } });
    if (S.gp) it.splice(1, 1);
    UI.reset({ id: 'results', layout: 'custom', items: it, prompts: [['confirm', 'SELECT']], back: () => {} });
    SN.Audio && SN.Audio.music('zero');
    if (p && !p.dnf && p.place === 1 && ['race'].includes(this.result.mode)) SN.Audio && SN.Audio.stingNamed('win');
    if (this.result.medal) SN.Audio && SN.Audio.say && SN.Audio.announce(this.result.medal === 'gold' ? 'GOLD' : this.result.medal.toUpperCase());
  },
  update(dt) {
    this.t += dt; const I = SN.game.input;
    if (SN.hangar) SN.hangar.step(dt);
    if (this.phase === 'podium') { if (this.t > 4 || I.pressed('confirm') || I.clicked()) { this.phase = 'table'; I.consumeAll(); SN.hangar.turntable(); } else { if (Math.random() < .3 && SN.hangar.world) SN.game.particles.bits(296 + (Math.random() - .5) * 80, 60 + Math.random() * 30, 80, 2, ['#ffd23f', '#29c8e8', '#ff3ab4', '#ffffff']); return; } }
    UI.update(dt);
  },
  draw(r) {
    if (SN.hangar && SN.hangar.world) SN.hangar.world.draw(r); else r.sky(['#05060c', '#141a2e']);
    if (this.phase === 'podium') { r.overlay(g => { const p = this.result.player; E.font.title(g, p.place === 1 ? 'WINNER' : SN.ord(p.place) + ' PLACE', r.W / 2, 16, { scale: 4, align: 'center', colors: ['#ffffff', '#ffe08a', '#ffb000'] }); }); return; }
    const res = this.result, I = SN.game.input;
    r.overlay(g => {
      const Wd = r.W, H = r.H, x = Math.max(8, Math.round(Wd / 2 - 200)), w = Math.min(400, Wd - 16), y = 34;
      E.font.title(g, res.mode === 'overclock' ? 'ZONE ' + res.zone : res.mode === 'snipeout' ? 'SNIPEOUT' : res.mode === 'hotlap' ? 'HOT LAP' : 'RESULTS', Wd / 2, 6, { scale: 3, align: 'center', colors: ['#ffffff', '#9ff4ff', '#29c8e8'] });
      if (res.mode === 'overclock' || res.mode === 'hotlap' || res.mode === 'timetrial' || res.mode === 'academy') {
        E.ui.box(g, x, y, w, 96, { bg: ['#141a2ee8', '#05060ce8'], border: '#29c8e8' });
        const lines = res.mode === 'overclock' ? [['ZONE REACHED', String(res.zone)], ['TIME', SN.fmtTime(res.player.time)]] : res.mode === 'academy' ? [['DRILLS PASSED', (res.drills || 0) + ' / 11']] : [['BEST LAP', SN.fmtTime(res.player.best)], res.mode === 'timetrial' ? ['TOTAL', SN.fmtTime(res.player.time)] : ['LAPS', String(res.results[0].lap)]];
        lines.forEach(([a, b], i) => { T(g, a, x + 12, y + 12 + i * 22, C.dim, { scale: 2 }); T(g, b, x + w - 12, y + 12 + i * 22, '#ffffff', { scale: 2, align: 'right' }); });
      } else {
        const rows = res.results, rh = Math.min(15, Math.floor((H - 110) / rows.length));
        E.ui.box(g, x, y, w, rows.length * rh + 8, { bg: ['#141a2ee8', '#05060ce8'], border: '#29c8e8' });
        rows.forEach((row, i) => {
          const yy = y + 5 + i * rh, me = row.control === 'human', t = SN.TEAM[row.team];
          if (me) px.rect(g, x + 2, yy - 1, w - 4, rh - 1, '#1a5a78');
          T(g, String(row.place), x + 14, yy + 2, me ? '#ffffff' : C.dim, { align: 'right', scale: 1 });
          px.rect(g, x + 22, yy + 1, 6, rh - 4, t.colors[1]); px.rect(g, x + 28, yy + 1, 2, rh - 4, t.colors[0]);
          T(g, row.name + (me && res.versus ? ' (P' + (row.player + 1) + ')' : ''), x + 36, yy + 2, '#ffffff');
          const right = res.mode === 'snipeout' ? row.points + ' PTS' : row.dnf ? 'ELIMINATED' : i === 0 ? SN.fmtTime(row.time) : (row.gap !== null ? '+' + row.gap.toFixed(2) : SN.fmtTime(row.time)) + (row.est ? '*' : '');
          T(g, right, x + w - 70, yy + 2, row.dnf ? C.bad : '#ffffff', { align: 'right' });
          if (row.best < 1e9 && rows.every(q => q.best >= row.best)) T(g, '★', x + w - 60, yy + 2, C.warn);
          if (row.best < 1e9) T(g, SN.fmtTime(row.best), x + w - 8, yy + 2, C.dim, { align: 'right', font: 'tiny' });
        });
      }
      // medal and record banners
      let by = H - 70;
      if (res.medal) { const mc = { gold: '#ffd23f', silver: '#d8e0f0', bronze: '#d8884a' }[res.medal]; E.ui.box(g, Wd / 2 - 70, by - 20, 140, 18, { bg: '#1a1408', border: mc }); T(g, res.medal.toUpperCase() + ' MEDAL', Wd / 2, by - 15, mc, { align: 'center' }); }
      if (res.records && res.records.length) T(g, 'NEW RECORD: ' + res.records.join(', '), Wd / 2, by + 2, C.good, { align: 'center' });
      if (res.unlocks && res.unlocks.length) T(g, 'UNLOCKED: ' + res.unlocks.join(', '), Wd / 2, by + 12, C.warn, { align: 'center' });
      // the actions in a row
      const its = UI.items(), bw = 76, bx0 = Math.round(Wd / 2 - (its.length * (bw + 6)) / 2);
      its.forEach((it, k) => { it.rect = [bx0 + k * (bw + 6), H - 44, bw, 20]; });
    });
    UI.top().layout = 'custom';
    // horizontal navigation for the action row
    UI.draw(r);
  }
};
// the results' action row moves with left/right too
const _upd = UI.update.bind(UI);
UI.update = function (dt) { const s = this.top(); if (s && s.id === 'results') { const I = SN.game.input; if (I.repeat('left')) this.move(-1); if (I.repeat('right')) this.move(1); } return _upd(dt); };
})();
