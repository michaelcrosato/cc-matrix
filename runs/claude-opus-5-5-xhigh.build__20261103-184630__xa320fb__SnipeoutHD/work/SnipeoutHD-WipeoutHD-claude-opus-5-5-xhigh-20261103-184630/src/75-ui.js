// SNIPEOUT HD: the 10-foot UI. A widget kit (one focus at a time, drawn as an animated chevron frame with a colour
// shift and a scanline shimmer, never colour alone; d-pad, stick, arrows or WASD move it with repeat; ✕ / Enter
// confirm, ○ / Esc back; L1 / R1, Q / E or the wheel page; the mouse's hover moves the focus and a click activates; a
// clickable BACK chip on every screen; a prompt bar for the device used last) and the front end's screens: the main
// menu, challenges, options, the race setup (class, track, team and pilot, laps), versus, how to play, records, about.
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px;
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#05040c' }, o));
const TW = (s, o = {}) => E.font.width(s, o);
const ease = x => { x = Math.max(0, Math.min(1, x)); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

const UI = SN.UI = {
  stack: [], t: 0, lastPt: null, moved: false, sel: {},
  top() { return UI.stack[UI.stack.length - 1] || null; },
  push(s) { s.focus = s.focus || 0; s.t = 0; UI.stack.push(s); if (s.enter) s.enter(); SN.audio.sfx('ui_ok'); return s; },
  replace(s) { UI.stack.pop(); return UI.push(s); },
  reset(s) { UI.stack.length = 0; if (s) UI.push(s); },
  pop() { const s = UI.stack.pop(); if (s && s.exit) s.exit(); SN.audio.sfx('ui_back'); const t = UI.top(); if (t) { t.t = Math.min(t.t, .1); if (t.resume) t.resume(); } return s; },
  back() { const s = UI.top(); if (!s) return; if (s.onBack) { if (s.onBack() !== false) return; } if (UI.stack.length > 1) UI.pop(); },
  /** the clocks run on while something else holds the input (a dialog, dev mode) */
  tick(dt) { const s = UI.top(); if (s) s.t += dt; UI.t += dt; },
  /** a step of the top screen: navigation, hover, click, its own update */
  update(dt, I) {
    const s = UI.top(); if (!s) return; s.t += dt; UI.t += dt;
    if (s.update && s.update(dt, I) === true) return;
    const items = (s.items || []).filter(Boolean), n = items.length;
    const row = s.layout === 'row', grid = s.layout === 'grid' ? (s.cols || 2) : 0;
    const prev = row ? 'left' : 'up', next = row ? 'right' : 'down';
    let f = E.clamp(s.focus || 0, 0, Math.max(0, n - 1));
    const step = d => { if (!n) return; let k = f; for (let a = 0; a < n; a++) { k = (k + d + n) % n; if (!items[k].skip) break; } if (k !== f) { f = k; SN.audio.sfx('ui_move'); } };
    if (grid) { if (I.repeat('left')) step(-1); if (I.repeat('right')) step(1); if (I.repeat('up')) step(-grid); if (I.repeat('down')) step(grid); }
    else { if (I.repeat(prev)) step(-1); if (I.repeat(next)) step(1); }
    const it = items[f];
    if (it && !row && !grid && (it.onLeft || it.onRight)) { if (I.repeat('left') && it.onLeft) { it.onLeft(); SN.audio.sfx('ui_tab'); } if (I.repeat('right') && it.onRight) { it.onRight(); SN.audio.sfx('ui_tab'); } }
    if (s.onTab) { if (I.pressed('tabL')) { s.onTab(-1); SN.audio.sfx('ui_tab'); } if (I.pressed('tabR')) { s.onTab(1); SN.audio.sfx('ui_tab'); } const wh = SN.wheel.take(); if (wh) { s.onTab(Math.sign(wh)); SN.audio.sfx('ui_tab'); } } else SN.wheel.take();
    // the mouse: hover moves the focus, a click activates (the chip's BACK too)
    const GS = E.current.screen || E.current; UI.layout(s, { W: GS.W || E.current.W || 427, H: GS.H || E.current.H || 240 });
    if (!UI._backChip && !s.noBack && (UI.stack.length > 1 || s.onBack)) UI._backChip = [8, (GS.H || 240) - 20, 52, 14];
    const p = I.pointer(); UI.moved = !!(p && (!UI.lastPt || p[0] !== UI.lastPt[0] || p[1] !== UI.lastPt[1])); UI.lastPt = p ? p.slice() : null;
    const hit = q => items.findIndex(it2 => it2._r && !it2.skip && q[0] >= it2._r[0] && q[0] < it2._r[0] + it2._r[2] && q[1] >= it2._r[1] && q[1] < it2._r[1] + it2._r[3]);
    if (p && UI.moved) { const k = hit(p); if (k >= 0 && k !== f) { f = k; SN.audio.sfx('ui_move'); } }
    const c = I.clicked();
    s.focus = f;
    if (c) {
      const bc = UI._backChip; if (bc && c[0] >= bc[0] && c[0] < bc[0] + bc[2] && c[1] >= bc[1] && c[1] < bc[1] + bc[3]) { UI.back(); I.consumeAll(); return; }
      if (s.onClick && s.onClick(c) === true) { I.consumeAll(); return; }
      const k = hit(c); if (k >= 0) { s.focus = k; UI.activate(items[k], I); I.consumeAll(); return; }
    }
    if (I.pressed('confirm') && it) { UI.activate(it, I); I.consumeAll(); return; }
    if (I.pressed('cancel')) { UI.back(); I.consumeAll(); return; }
  },
  activate(it, I) { if (!it) return; if (it.disabled) { SN.audio.sfx('ui_locked'); UI.flash = { t: UI.t, text: it.hint || 'LOCKED' }; return; } if (it.onActivate) { SN.audio.sfx('ui_ok'); it.onActivate(); } else if (it.onRight) { it.onRight(); SN.audio.sfx('ui_tab'); } },
  /** draw the top screen over whatever the scene drew */
  draw(r) {
    const s = UI.top(); if (!s) return;
    r.overlay(g => {
      if (s.dim !== false) { g.save(); g.globalAlpha = s.dim || .35; g.fillStyle = '#05040c'; g.fillRect(0, 0, r.W, r.H); g.restore(); g._c = null; }
      UI.streaks(g, r);
      if (s.title) UI.title(g, r, s.title, s.kicker);
      if (s.draw) s.draw(g, r);
      UI.layoutItems(g, r, s);
      UI.backChip(g, r, s);
      UI.promptBar(g, r, s.prompts || [['confirm', 'SELECT'], ['cancel', 'BACK']]);
      if (UI.flash && UI.t - UI.flash.t < 1.6) { const w = TW(UI.flash.text, { scale: 2 }) + 16; UI.panel(g, r.W / 2 - w / 2, r.H / 2 - 12, w, 22, '#2a0a10'); T(g, UI.flash.text, r.W / 2, r.H / 2 - 7, '#ff8a8a', { scale: 2, align: 'center' }); }
    });
  },
  title(g, r, text, kicker) {
    if (kicker) T(g, kicker, 14, 10, '#7af0ff', { font: 'tiny' });
    E.font.title(g, text, 14, kicker ? 18 : 12, { scale: 3, colors: ['#ffffff', '#9ff4ff', '#29c8e8', '#1a2a4a'] });
  },
  panel(g, x, y, w, h, bg = '#0a0c18', a = .82, border = '#29c8e8') { g.save(); g.globalAlpha = a; g.fillStyle = bg; g.fillRect(x, y, w, h); g.restore(); g._c = null; px.rect(g, x, y, w, 1, border); px.rect(g, x, y + h - 1, w, 1, SN.mix(border, '#000000', .6)); },
  /** the focus: a thick animated chevron frame, a colour shift, a 1 px scanline shimmer */
  focusFrame(g, x, y, w, h) {
    const t = UI.t, p = Math.round(Math.sin(t * 8) * 1.5) + 2, c = '#ffffff', c2 = '#29c8e8';
    px.rect(g, x - 2, y - 2, w + 4, 2, c2); px.rect(g, x - 2, y + h, w + 4, 2, c2); px.rect(g, x - 2, y, 2, h, c2); px.rect(g, x + w, y, 2, h, c2);
    for (let k = 0; k < 3; k++) { px.line(g, x - 6 - p + k, y + h / 2 - 4, x - 2 - p + k, y + h / 2, c); px.line(g, x - 2 - p + k, y + h / 2, x - 6 - p + k, y + h / 2 + 4, c); px.line(g, x + w + 6 + p - k, y + h / 2 - 4, x + w + 2 + p - k, y + h / 2, c); px.line(g, x + w + 2 + p - k, y + h / 2, x + w + 6 + p - k, y + h / 2 + 4, c); }
    const sy = y + Math.floor((t * 40) % h); g.save(); g.globalAlpha = .35; g.fillStyle = '#ffffff'; g.fillRect(x, sy, w, 1); g.restore(); g._c = null;
  },
  /** tiles for the screen's items (list, row or grid), each in its rectangle (kept for the mouse) */
  /** where each item's tile is (screen pixels), kept on the item for the mouse; r: anything with W and H */
  layout(s, r) {
    const items = (s.items || []).filter(Boolean); if (!items.length) return items;
    const L = s.box ? s.box(r) : null, row = s.layout === 'row', grid = s.layout === 'grid' ? (s.cols || 2) : 0;
    const iw = L ? L.w : row ? Math.min(96, (r.W - 40) / items.length - 8) : Math.min(220, r.W * .5), ih = L ? L.h : row ? 92 : 22, gap = L && L.gap !== undefined ? L.gap : row ? 8 : 5;
    const x0 = L ? L.x : row ? (r.W - (iw + gap) * items.length + gap) / 2 : 22, y0 = L ? L.y : row ? 70 : Math.max(52, Math.min(70, r.H * .24));
    items.forEach((it, k) => {
      const col = grid ? k % grid : row ? k : 0, rw = grid ? Math.floor(k / grid) : row ? 0 : k;
      const slide = (1 - ease((s.t - k * .04) / .18)) * 30;
      it._r = [x0 + col * (iw + gap) + (row ? 0 : -slide), y0 + rw * (ih + gap) + (row ? slide * .5 : 0), iw, ih];
    });
    return items;
  },
  layoutItems(g, r, s) {
    const items = UI.layout(s, r); if (!items.length) return;
    items.forEach((it, k) => {
      const [x, y, iw, ih] = it._r;
      if (it.skip) { if (it.draw) it.draw(g, x, y, iw, ih, false); return; }
      const f = (s.focus || 0) === k;
      if (it.draw) it.draw(g, x, y, iw, ih, f);
      else UI.tile(g, it, x, y, iw, ih, f);
      if (f) UI.focusFrame(g, x, y, iw, ih);
    });
  },
  tile(g, it, x, y, w, h, f) {
    const dis = it.disabled;
    UI.panel(g, x, y, w, h, f ? '#163a5a' : '#0c1020', f ? .92 : .8, f ? '#7af0ff' : '#29c8e8');
    const lab = typeof it.label === 'function' ? it.label() : it.label, val = it.value ? it.value() : null;
    T(g, lab, x + 8, y + (h - 14) / 2 + 1, dis ? '#5a6078' : f ? '#ffffff' : '#c8d4ec', { scale: 2 });
    if (val !== null && val !== undefined) { const vs = (it.onLeft ? '◀ ' : '') + val + (it.onRight ? ' ▶' : ''), lw = TW(lab, { scale: 2 }), big = lw + TW(vs, { scale: 2 }) + 24 <= w; T(g, vs, x + w - 8, y + (h - (big ? 14 : 7)) / 2 + 1, f ? '#ffd36a' : '#e8c880', { scale: big ? 2 : 1, align: 'right' }); }
    if (dis) { px.rect(g, x + w - 14, y + 6, 8, 6, '#5a6078'); px.rect(g, x + w - 13, y + 3, 6, 4, '#0c1020'); px.rect(g, x + w - 12, y + 3, 4, 1, '#5a6078'); }
    if (f && it.sub) { const sub = typeof it.sub === 'function' ? it.sub() : it.sub, R0 = E.current.r, sx = x + w + 16, sw = Math.max(60, R0.W - sx - 10), L = E.font.wrap(sub, sw - 10); UI.panel(g, sx, y, sw, 8 + L.length * 9, '#05040c', .6, '#29c8e8'); L.forEach((l, k) => T(g, l, sx + 5, y + 4 + k * 9, '#e8ecff', { shadow: '#000', outline: false })); }
  },
  backChip(g, r, s) {
    if (s.noBack || UI.stack.length < 2 && !s.onBack) { UI._backChip = null; return; }
    const w = 52, h = 14, x = 8, y = r.H - h - 6; UI._backChip = [x, y, w, h];
    const p = E.current.input.pointer(), hov = p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h;
    UI.panel(g, x, y, w, h, hov ? '#2a3a5a' : '#0c1020', .85, hov ? '#ffffff' : '#5a6a8a'); T(g, '◀ BACK', x + 6, y + 4, '#ffffff');
  },
  promptBar(g, r, items) {
    const I = E.current.input, dev = SN.glyph.device(I);
    const list = dev === 'mouse' ? items.map(([a, l]) => a === 'confirm' ? ['fire', 'CLICK'] : [a, l]).filter(([a]) => a !== 'cancel') : items;
    UI.panel(g, 64, r.H - 20, r.W - 70, 16, '#05040c', .55, '#1a2a4a');
    SN.glyph.bar(g, list, r.W - 10, r.H - 18, { right: true, input: I });
  },
  /** background light streaks drifting across the front end */
  streaks(g, r) {
    if (E.current.reduceMotion) return;
    const t = UI.t; g.save(); g.globalAlpha = .18;
    for (let k = 0; k < 7; k++) { const y = ((k * 53 + t * (14 + k * 3)) % (r.H + 40)) - 20, x = ((k * 97 + t * 60) % (r.W + 200)) - 100; g.fillStyle = k % 2 ? '#29c8e8' : '#ff3ab4'; g.fillRect(x, y, 80 + k * 10, 1); }
    g.restore(); g._c = null;
  }
};

/* ---- the screens ---- */
const S = SN.screens = {};
const G = () => E.current;
const save = () => SN.save.data;
const unlocked = cls => SN.save.classUnlocked(cls);
/** a simple tile */
const tile = (label, onActivate, o = {}) => Object.assign({ label, onActivate }, o);

S.main = () => ({
  id: 'main', title: 'SNIPEOUT HD', kicker: 'HOVERLINE CHAMPIONSHIP · SEASON 2161', noBack: true, dim: .2,
  items: [
    SN.save.hasSeason() ? tile('CONTINUE SEASON', () => SN.flow.season(), { sub: 'Your Season 2161 save' }) : tile('SEASON', () => SN.flow.season(), { sub: 'The campaign: tiers, story, the Grand Prix' }),
    tile('QUICK RACE', () => SN.flow.setup({ mode: 'race' }), { sub: 'Eight craft, weapons on' }),
    tile('CHALLENGES ▸', () => UI.push(S.challenges()), { sub: 'Time Trial, Hot Lap, Snipeout, Overclock' }),
    tile('VERSUS', () => UI.push(S.versus()), { sub: 'Two players, split screen' }),
    tile('ACADEMY', () => SN.flow.start({ mode: 'academy', track: 'solenne', cls: 'SPARK', team: SN.save.data.team, pilot: SN.save.data.pilot }), { sub: 'Eleven drills: learn every control' }),
    tile('OPTIONS ▸', () => UI.push(S.options()), { sub: 'Settings, controls, how to play, records, about, dev mode' })
  ],
  prompts: [['confirm', 'SELECT']],
  onBack() { SN.flow.toTitle(); return true; }
});
S.challenges = () => ({ id: 'challenges', title: 'CHALLENGES', kicker: 'MAIN MENU ▸', items: [
  tile('TIME TRIAL', () => SN.flow.setup({ mode: 'timetrial' }), { sub: 'Three laps against your ghost' }),
  tile('HOT LAP', () => SN.flow.setup({ mode: 'hotlap' }), { sub: 'A flying start: the best lap counts' }),
  tile('SNIPEOUT', () => SN.flow.setup({ mode: 'snipeout' }), { sub: 'Points for hits, more for eliminations' }),
  tile('OVERCLOCK', () => SN.flow.setup({ mode: 'overclock', cls: 'SPARK' }), { sub: 'The speed climbs every 12 seconds' })] });
S.options = () => ({ id: 'options', title: 'OPTIONS', kicker: 'MAIN MENU ▸', items: [
  tile('SETTINGS', () => G().menu('settings'), { sub: 'Difficulty, units, camera, HUD, picture, sound' }),
  tile('CONTROLS', () => G().menu('controls'), { sub: 'Rebind keys and buttons' }),
  tile('HOW TO PLAY', () => UI.push(S.howto())),
  tile('RECORDS', () => UI.push(S.records())),
  tile('ABOUT / CREDITS', () => UI.push(S.about())),
  tile('DEV MODE', () => SN.dev.open(null), { sub: 'Cheats, live tuning sliders, debug views' })] });

/* ---- the race setup: class, track, team and pilot, laps / confirm ---- */
const SET = SN.setupState = { mode: 'race', cls: 'SPARK', track: 'solenne', team: 'kestrel', pilot: 'vale', laps: 3, champion: false, versusMode: 'race', players: [] };
SN.flow = SN.flow || {};
SN.flow.setup = (o) => {
  Object.assign(SET, { team: SN.save.data.team || 'kestrel', pilot: SN.save.data.pilot || 'vale' }, o);
  if (!unlocked(SET.cls)) SET.cls = 'SPARK';
  if (SET.mode === 'overclock') { SET.cls = 'SPARK'; UI.push(S.track()); return; }
  UI.push(S.cls());
};
S.cls = () => ({
  id: 'cls', title: 'SPEED CLASS', kicker: SN.MODES[SET.mode].label + ' ▸', layout: 'row', focus: SN.CLASS_ORDER.indexOf(SET.cls),
  items: SN.CLASS_ORDER.map(c => ({
    label: c, disabled: !unlocked(c), hint: SN.CLASSES[c].unlock,
    onActivate: () => { SET.cls = c; UI.push(S.track()); },
    draw(g, x, y, w, h, f) {
      const C = SN.CLASSES[c], dis = !unlocked(c);
      UI.panel(g, x, y, w, h, f ? '#163a5a' : '#0c1020', .88, f ? '#ffffff' : C.color);
      E.font.title(g, String(SN.CLASS_ORDER.indexOf(c) + 1), x + w / 2, y + 8, { scale: 4, colors: dis ? ['#4a4a5a', '#2a2a3a'] : [C.color, SN.mix(C.color, '#000000', .5)], align: 'center' });
      T(g, c.length > 6 ? c.slice(0, 6) + '.' : c, x + w / 2, y + 44, dis ? '#5a6078' : '#ffffff', { scale: c.length > 8 ? 1 : 2, align: 'center' });
      T(g, Math.round(C.top * SN.KMH) + ' KM/H', x + w / 2, y + 62, dis ? '#5a6078' : '#ffd36a', { align: 'center' });
      if (dis) { T(g, 'LOCKED', x + w / 2, y + 76, '#ff8a8a', { align: 'center', font: 'tiny' }); }
    }
  })),
  draw(g, r) { const it = SN.CLASS_ORDER[this.focus || 0]; if (!unlocked(it)) T(g, 'UNLOCK: ' + SN.CLASSES[it].unlock, r.W / 2, 178, '#ff8a8a', { align: 'center', scale: 1 }); },
  prompts: [['confirm', 'SELECT'], ['cancel', 'BACK']]
});
S.track = () => {
  const s = {
    id: 'track', title: 'CIRCUIT', kicker: SN.MODES[SET.mode].label + ' ▸ ' + SET.cls + ' ▸', i: Math.max(0, SN.TRACK_ORDER.indexOf(SET.track)),
    onTab(d) { this.i = (this.i + d + 4) % 4; SET.track = SN.TRACK_ORDER[this.i]; },
    items: [{ label: 'CHOOSE', onActivate: () => { SET.track = SN.TRACK_ORDER[s.i]; UI.push(SET.mode === 'versus' ? S.versusTeams() : S.team()); }, onLeft: () => s.onTab(-1), onRight: () => s.onTab(1),
      draw(g, x, y, w, h, f) { UI.tile(g, { label: 'RACE HERE' }, x, y, w, h, f); } }],
    box: r => ({ x: r.W / 2 - 60, y: r.H - 52, w: 120, h: 20 }),
    onClick(c) { const r = G().r; if (c[1] > 60 && c[1] < r.H - 60) { if (c[0] < r.W * .2) { this.onTab(-1); return true; } if (c[0] > r.W * .8) { this.onTab(1); return true; } } return false; },
    draw(g, r) {
      const id = SN.TRACK_ORDER[this.i], D = SN.TRACKS[id], Tr = SN.getTrack(id), cx = r.W / 2, y = 44;
      UI.panel(g, cx - 150, y, 300, r.H - 104, '#0a0c18', .85);
      // the outline, the name, the place, the length, the difficulty, the best time
      const M = Tr.map, sz = 104; let last = null; for (const p of M.pts) { const q = Tr.mapXY(p[0], p[1], sz, sz); if (last) px.line(g, cx - 140 + last[0], y + 8 + last[1], cx - 140 + q[0], y + 8 + q[1], '#7af0ff', 2); last = q; }
      E.font.title(g, D.name, cx - 24, y + 10, { scale: 2, colors: ['#ffffff', '#7af0ff'] });
      T(g, D.place, cx - 24, y + 30, '#b8c4dc', { font: 'tiny' });
      T(g, D.lengthKm.toFixed(2) + ' KM', cx - 24, y + 42, '#ffffff', { scale: 2 });
      for (let k = 0; k < 4; k++) px.rect(g, cx - 24 + k * 10, y + 62, 8, 8, k < D.difficulty ? '#ff7ad8' : '#2a2a3a');
      const rec = SN.Records.get(SN.save.data, id, SET.cls, SET.mode === 'versus' ? 'race' : SET.mode);
      T(g, 'BEST ' + (rec && rec.race ? SN.fmtTime(rec.race) : '--:--.--') + (rec && rec.lap ? '  LAP ' + SN.fmtTime(rec.lap) : ''), cx - 24, y + 76, '#ffd36a');
      E.font.text(g, D.blurb, cx - 140, y + 118, '#e8ecff', { wrap: 280, shadow: '#000', outline: false });
      T(g, '◀', cx - 172, y + 50, '#ffffff', { scale: 3 }); T(g, '▶', cx + 158, y + 50, '#ffffff', { scale: 3 });
      T(g, (this.i + 1) + ' / 4', cx + 144, y + r.H - 116, '#7a8aa8', { align: 'right', font: 'tiny' });
    },
    prompts: [['confirm', 'SELECT'], ['tabL', ''], ['tabR', 'CIRCUIT'], ['cancel', 'BACK']]
  };
  SET.track = SN.TRACK_ORDER[s.i]; return s;
};
S.team = () => {
  const ti = Math.max(0, SN.TEAM_ORDER.indexOf(SET.team));
  const s = {
    id: 'team', title: 'TEAM AND PILOT', kicker: SN.MODES[SET.mode].label + ' ▸', i: ti, pilotK: Math.max(0, SN.TEAMS[SET.team].pilots.indexOf(SET.pilot)), spin: 0, dim: .1,
    onTab(d) { this.i = (this.i + d + 6) % 6; SET.team = SN.TEAM_ORDER[this.i]; this.pilotK = 0; SET.pilot = SN.TEAMS[SET.team].pilots[0]; },
    items: [
      { label: 'TEAM', value: () => SN.TEAMS[SN.TEAM_ORDER[s.i]].short, onLeft: () => s.onTab(-1), onRight: () => s.onTab(1) },
      { label: 'PILOT', value: () => SN.PILOTS[SN.TEAMS[SN.TEAM_ORDER[s.i]].pilots[s.pilotK]].name.split(' ').slice(-1)[0], onLeft: () => { s.pilotK = 1 - s.pilotK; }, onRight: () => { s.pilotK = 1 - s.pilotK; } },
      SN.save.data.unlocked.champion ? { label: 'LIVERY', value: () => SET.champion ? 'CHAMPION' : 'TEAM', onLeft: () => { SET.champion = !SET.champion; }, onRight: () => { SET.champion = !SET.champion; } } : null,
      { label: 'CONFIRM', onActivate: () => { SET.team = SN.TEAM_ORDER[s.i]; SET.pilot = SN.TEAMS[SET.team].pilots[s.pilotK]; SN.save.data.team = SET.team; SN.save.data.pilot = SET.pilot; SN.save.write(); if (SET.onTeam) { const f = SET.onTeam; SET.onTeam = null; f(); } else UI.push(S.confirm()); } }
    ].filter(Boolean),
    box: r => ({ x: 22, y: 64, w: 170, h: 20 }),
    update(dt, I) { this.spin += dt * .6; const p = I.pointer(); if (I.down('fire') && p && this._p && I.lastDevice === 'mouse' && p[0] > G().r.W * .45) this.spin += (p[0] - this._p[0]) * .04; this._p = p; if (I.padAim) this.spin += I.padAim[0] * dt * 3; SN.render.showCraft(SN.TEAM_ORDER[this.i], this.spin, SET.champion); },
    exit() { SN.render.showCraft(null); SET.onTeam = null; },
    draw(g, r) {
      const team = SN.TEAMS[SN.TEAM_ORDER[this.i]], pid = team.pilots[this.pilotK], P = SN.PILOTS[pid], x = 22, y = 64 + 4 * 25 + 4;
      const px0 = r.W - 172, py0 = r.H - 132;
      UI.panel(g, px0, py0, 164, 104, '#0a0c18', .84, team.colors.secondary);
      E.font.title(g, team.short, px0 + 8, py0 + 6, { scale: 2, colors: [team.colors.primary === '#0b0b0e' || team.colors.primary === '#141418' ? '#d8d8e0' : team.colors.primary, team.colors.secondary] });
      T(g, team.craft + ' · ' + team.city, px0 + 8, py0 + 24, '#b8c4dc', { font: 'tiny' });
      const st = team.stats; [['SPEED', st.speed], ['THRUST', st.thrust], ['HANDLING', st.handling], ['SHIELD', st.shield]].forEach(([n, v2], k) => { T(g, n, px0 + 8, py0 + 34 + k * 11, '#e8ecff'); for (let q = 0; q < 10; q++) px.rect(g, px0 + 64 + q * 9, py0 + 34 + k * 11, 7, 7, q < v2 ? team.colors.glow : '#1a1a2a'); });
      E.font.text(g, team.copy, px0 + 8, py0 + 80, '#c8d4ec', { wrap: 150, outline: false, shadow: '#000', font: 'tiny' });
      T(g, 'DRAG OR R-STICK TO TURN', r.W - 90, 44, '#5a6a8a', { font: 'tiny', align: 'center' });
      UI.panel(g, x, y, 170, 58, '#0a0c18', .82);
      SN.portrait(pid, g, x + 6, y + 5, 48);
      T(g, P.name, x + 60, y + 8, '#ffffff'); T(g, '"' + P.banter[0] + '"', x + 60, y + 20, '#b8c4dc', { font: 'tiny', wrap: 104 });
      T(g, 'RIVAL: ' + SN.PILOTS[SN.rivalFor(team.id)].name, x + 60, y + 44, '#ff8aa8', { font: 'tiny' });
    },
    prompts: [['confirm', 'SELECT'], ['tabL', ''], ['tabR', 'TEAM'], ['cancel', 'BACK']]
  };
  return s;
};
S.confirm = () => {
  const laps = SET.mode === 'race' || SET.mode === 'versus' || SET.mode === 'timetrial';
  return {
    id: 'confirm', title: 'READY', kicker: SN.MODES[SET.mode].label + ' ▸',
    items: [
      laps ? { label: 'LAPS', value: () => String(SET.laps), onLeft: () => { SET.laps = Math.max(1, SET.laps - 1); }, onRight: () => { SET.laps = Math.min(5, SET.laps + 1); } } : null,
      SET.mode === 'snipeout' ? { label: 'TARGET', value: () => String(SET.target || 10), onLeft: () => { SET.target = Math.max(5, (SET.target || 10) - 1); }, onRight: () => { SET.target = Math.min(20, (SET.target || 10) + 1); } } : null,
      { label: 'START RACE', onActivate: () => SN.flow.start(Object.assign({}, SET)) }
    ].filter(Boolean),
    draw(g, r) {
      const x = r.W / 2 + 10, y = 64, rows = [['MODE', SN.MODES[SET.mode].label], ['CLASS', SET.cls], ['CIRCUIT', SN.TRACKS[SET.track].name], ['TEAM', SN.TEAMS[SET.team].short], ['PILOT', SN.PILOTS[SET.pilot].name]];
      UI.panel(g, x, y, r.W / 2 - 22, 16 + rows.length * 16, '#0a0c18', .85);
      rows.forEach(([a, b], k) => { T(g, a, x + 8, y + 8 + k * 16, '#7af0ff'); T(g, b, x + 70, y + 6 + k * 16, '#ffffff', { scale: b.length > 14 ? 1 : 2 }); });
      T(g, SN.STORY.tips[Math.floor(UI.t / 6) % SN.STORY.tips.length], 22, r.H - 40, '#b8c4dc', { font: 'tiny' });
    }
  };
};

/* ---- versus: two players join, pick teams in turn, then race or snipeout ---- */
S.versus = () => ({
  id: 'versus', title: 'VERSUS', kicker: 'MAIN MENU ▸ TWO PLAYERS',
  enter() { G().allowJoin({ max: 2 }); },
  exit() { G().allowJoin(false); },
  items: [
    { label: 'MODE', value: () => SET.versusMode === 'snipeout' ? 'SNIPEOUT' : 'RACE', onLeft: () => { SET.versusMode = SET.versusMode === 'race' ? 'snipeout' : 'race'; }, onRight: () => { SET.versusMode = SET.versusMode === 'race' ? 'snipeout' : 'race'; } },
    { label: 'CONTINUE', onActivate: () => { if (G().players.length < 2) { UI.flash = { t: UI.t, text: 'PLAYER 2: PRESS START' }; SN.audio.sfx('ui_locked'); return; } Object.assign(SET, { mode: 'versus' }); if (!unlocked(SET.cls)) SET.cls = 'SPARK'; UI.push(S.cls()); } }
  ],
  box: r => ({ x: 22, y: 150, w: 180, h: 20 }),
  draw(g, r) {
    const P = G().players;
    for (let k = 0; k < 2; k++) {
      const x = 22 + k * (r.W / 2 - 10), y = 56, w = r.W / 2 - 34, I = P[k];
      UI.panel(g, x, y, w, 86, '#0a0c18', .85, E.PLAYER_COLORS[k]);
      T(g, 'PLAYER ' + (k + 1), x + 8, y + 6, E.PLAYER_COLORS[k], { scale: 2 });
      if (!I) { if (Math.floor(UI.t * 2) % 2) T(g, 'PRESS START ON A PAD, OR 2 ON THE KEYBOARD', x + 8, y + 30, '#ffffff', { wrap: w - 16 }); continue; }
      const dev = I.device || I.lastDevice;
      T(g, dev === 'gamepad' ? 'CONTROLLER' : I.half ? 'KEYBOARD · ' + (I.half === 'left' ? 'LEFT HALF' : 'RIGHT HALF') : 'KEYBOARD AND MOUSE', x + 8, y + 26, '#b8c4dc');
      const items = [['steer', 'STEER'], ['thrust', 'THRUST'], ['fire', 'FIRE'], ['absorb', 'ABSORB'], ['brakeL', ''], ['brakeR', 'AIRBRAKES'], ['shiftL', ''], ['shiftR', 'SHIFT']];
      let yy = y + 40, xx = x + 8; for (const [a, l] of items) { const gw = SN.glyph.draw(g, a, xx, yy, { input: I }); xx += gw + 2; if (l) { T(g, l, xx, yy + 2, '#ffffff', { outline: false }); xx += TW(l) + 8; } if (xx > x + w - 60) { xx = x + 8; yy += 14; } }
    }
  }
});
S.versusTeams = () => {
  // each player picks a team in turn on the team screen, then confirm
  SET.players = []; const P = G().players;
  const pick = k => { Object.assign(SET, { team: SN.TEAM_ORDER[k * 2 % 6], pilot: SN.TEAMS[SN.TEAM_ORDER[k * 2 % 6]].pilots[0] }); SET.onTeam = () => { SET.players[k] = { team: SET.team, pilot: SET.pilot, input: P[k] }; UI.pop(); if (k + 1 < P.length) UI.push(pick(k + 1)); else UI.push(S.confirm()); }; const s = S.team(); s.kicker = 'VERSUS ▸ PLAYER ' + (k + 1); s.ownerInput = P[k]; return s; };
  return pick(0);
};

/* ---- how to play: five pages ---- */
S.howto = () => ({
  id: 'howto', title: 'HOW TO PLAY', page: 0, items: [],
  onTab(d) { this.page = (this.page + d + SN.HOWTO.length) % SN.HOWTO.length; },
  update(dt, I) { if (I.repeat('left')) this.onTab(-1); if (I.repeat('right')) this.onTab(1); if (I.pressed('confirm')) this.onTab(1); if (I.pressed('cancel')) { UI.back(); I.consumeAll(); } const c = I.clicked(); if (c) { const bc = UI._backChip; if (bc && c[0] < bc[0] + bc[2] && c[1] > bc[1]) UI.back(); else this.onTab(c[0] < G().r.W / 2 ? -1 : 1); I.consumeAll(); } return true; },
  draw(g, r) {
    const P = SN.HOWTO[this.page], I = G().input, x = 22, y = 52;
    UI.panel(g, x - 6, y - 4, r.W - 32, r.H - 82, '#0a0c18', .86);
    T(g, P.title + '   ' + (this.page + 1) + '/' + SN.HOWTO.length, x, y, '#ffd36a', { scale: 2 });
    if (P.kind === 'controls') {
      const rows = [['thrust', 'THRUST (HOLD)'], ['steer', 'STEER'], ['noseDown', 'PITCH: NOSE DOWN / UP'], ['brakeL', 'AIRBRAKE LEFT'], ['brakeR', 'AIRBRAKE RIGHT'], ['shiftL', 'SIDE-SHIFT / ROLL LEFT'], ['shiftR', 'SIDE-SHIFT / ROLL RIGHT'], ['fire', 'FIRE (HOLD TO CHARGE)'], ['absorb', 'ABSORB WEAPON'], ['camera', 'CAMERA'], ['lookBack', 'LOOK BACK'], ['pause', 'PAUSE']];
      rows.forEach(([a, l], k) => { const cx = x + (k % 2) * (r.W / 2 - 16), cy = y + 22 + Math.floor(k / 2) * 18; const w = SN.glyph.draw(g, a, cx, cy, { input: I }); T(g, l, cx + Math.max(w, 26) + 4, cy + 2, '#ffffff'); });
      T(g, SN.glyph.device(I) === 'gamepad' ? 'CONTROLLER (' + (I.glyphs === 'xbox' ? 'XBOX SYMBOLS' : 'PLAYSTATION SYMBOLS') + ')' : 'KEYBOARD AND MOUSE: TOUCH A CONTROLLER TO SEE ITS BUTTONS', x, r.H - 46, '#7af0ff', { font: 'tiny' });
    } else if (P.kind === 'weapons') {
      SN.WEAPON_ORDER.slice(P.page * 5, P.page * 5 + 5).forEach((id, k) => { const W = SN.WEAPONS[id], cy = y + 20 + k * 27; SN.weaponIcon(g, id, x, cy); T(g, W.name, x + 30, cy + 2, W.color, { scale: 2 }); T(g, W.blurb, x + 30, cy + 17, '#e8ecff'); });
    } else P.lines.forEach((l, k) => SN.glyph.rich(g, l, x, y + 26 + k * 22, '#ffffff', { input: I }));
  },
  prompts: [['tabL', ''], ['tabR', 'PAGE'], ['cancel', 'BACK']]
});
/* ---- records: one circuit per page ---- */
S.records = () => ({
  id: 'records', title: 'RECORDS', page: 0, items: [],
  onTab(d) { this.page = (this.page + d + 4) % 4; },
  update(dt, I) { if (I.repeat('left')) this.onTab(-1); if (I.repeat('right')) this.onTab(1); if (I.pressed('cancel')) { UI.back(); I.consumeAll(); } const c = I.clicked(); if (c) { const bc = UI._backChip; if (bc && c[0] < bc[0] + bc[2] && c[1] > bc[1]) UI.back(); else this.onTab(c[0] < G().r.W / 2 ? -1 : 1); I.consumeAll(); } return true; },
  draw(g, r) {
    const id = SN.TRACK_ORDER[this.page], x = 22, y = 52; UI.panel(g, x - 6, y - 4, r.W - 32, r.H - 82, '#0a0c18', .86);
    T(g, SN.TRACKS[id].name + '   ' + (this.page + 1) + '/4', x, y, '#ffd36a', { scale: 2 });
    T(g, 'CLASS', x, y + 22, '#7af0ff'); T(g, 'BEST RACE', x + 100, y + 22, '#7af0ff'); T(g, 'BEST LAP', x + 210, y + 22, '#7af0ff');
    SN.CLASS_ORDER.forEach((c, k) => {
      const rr = SN.Records.get(SN.save.data, id, c, 'race') || {}, tt = SN.Records.get(SN.save.data, id, c, 'timetrial') || {}, hl = SN.Records.get(SN.save.data, id, c, 'hotlap') || {};
      const race = Math.min(rr.race || Infinity, tt.race || Infinity), lap = Math.min(rr.lap || Infinity, tt.lap || Infinity, hl.lap || Infinity), cy = y + 38 + k * 22;
      T(g, c, x, cy, '#ffffff', { scale: 2 }); T(g, isFinite(race) ? SN.fmtTime(race) : '--:--.--', x + 100, cy, '#ffffff', { scale: 2 }); T(g, isFinite(lap) ? SN.fmtTime(lap) : '--:--.--', x + 210, cy, '#ffffff', { scale: 2 });
    });
    const oc = SN.Records.get(SN.save.data, id, 'SPARK', 'overclock'); if (oc && oc.score) T(g, 'OVERCLOCK BEST: ZONE ' + oc.score, x, y + 132, '#ff7ad8', { scale: 2 });
  },
  prompts: [['tabL', ''], ['tabR', 'CIRCUIT'], ['cancel', 'BACK']]
});
/* ---- about / credits: source information, testing, engine and prompt feedback, credits ---- */
S.about = () => ({
  id: 'about', title: 'ABOUT', page: 0, scroll: 0, items: [],
  onTab(d) { this.page = (this.page + d + 5) % 5; this.scroll = 0; },
  update(dt, I) {
    if (I.repeat('left')) this.onTab(-1); if (I.repeat('right')) this.onTab(1);
    if (I.repeat('down', .25, .05)) this.scroll += 10; if (I.repeat('up', .25, .05)) this.scroll = Math.max(0, this.scroll - 10);
    if (I.pressed('cancel')) { UI.back(); I.consumeAll(); }
    const c = I.clicked(); if (c) { const bc = UI._backChip; if (bc && c[0] < bc[0] + bc[2] && c[1] > bc[1]) UI.back(); else this.onTab(c[0] < G().r.W / 2 ? -1 : 1); I.consumeAll(); }
    return true;
  },
  draw(g, r) {
    const A = SN.ABOUT, x = 22, y = 46, w = r.W - 44, pages = ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS'];
    UI.panel(g, x - 6, y - 4, r.W - 32, r.H - 74, '#0a0c18', .9);
    T(g, pages[this.page] + '   ' + (this.page + 1) + '/5', x, y, '#ffd36a', { scale: 2 });
    let lines = [];
    if (this.page === 0) lines = A.sourceRows().map(([k, v]) => k.toUpperCase() + ': ' + v);
    else if (this.page === 1) lines = A.testingFeedback.map((t, k) => A.testingQ[k] + ' ' + t);
    else if (this.page === 2) lines = A.engineFeedback.map((t, k) => A.engineQ[k] + ' ' + t);
    else if (this.page === 3) lines = A.promptFeedback.map((t, k) => A.promptQ[k] + ' ' + t);
    else lines = A.credits;
    g.save(); g.beginPath(); g.rect(x - 4, y + 18, w + 8, r.H - y - 70); g.clip();
    let cy = y + 20 - this.scroll;
    for (const l of lines) { const wr = E.font.wrap(l, w); for (const q of wr) { T(g, q, x, cy, '#e8ecff', { outline: false, shadow: '#000' }); cy += 9; } cy += 4; }
    g.restore(); g._c = null;
    this.maxScroll = Math.max(0, cy + this.scroll - (r.H - 36));
    if (this.scroll > this.maxScroll) this.scroll = this.maxScroll;
  },
  prompts: [['tabL', ''], ['tabR', 'PAGE'], ['up', ''], ['down', 'SCROLL'], ['cancel', 'BACK']]
});
})();
