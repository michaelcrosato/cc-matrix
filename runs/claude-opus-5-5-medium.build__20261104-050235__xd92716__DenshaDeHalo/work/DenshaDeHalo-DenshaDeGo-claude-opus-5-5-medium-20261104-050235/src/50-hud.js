/* DENSHA DE HALO! · the cab and the HUD, in screen pixels. 10-foot rules: nothing under the 5x7 font, key numbers at
 * scale 2-3, a 5% safe margin, never colour alone (aspects also as lamp positions and a letter), at most six HUD groups
 * (the Halo ring, the station line, the top-right cluster, the stop gauge, the centre banner, the subtitle box).
 * DH.HUD.cab(g, D, vp) draws the windshield and dashboard; DH.HUD.hud(g, D, vp) the overlay; widgets (clickable cab
 * buttons, the notch strip, the handle) are collected in D.widgets for the mouse. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game;
const R = Math.round, T = (g, s, x, y, c, o = {}) => E.font.text(g, s, R(x), R(y), c, Object.assign({ shadow: '#000', outline: false }, o));
const W8 = (s, sc = 1) => E.font.width(s, { scale: sc });
const panelCol = run => run.T.cab === 'classic' ? { panel: '#2c4a3c', dk: '#1c3228', lt: '#4a6a58', face: '#e8e4d0' } : { panel: '#3a3e4a', dk: '#262a34', lt: '#5a5e6c', face: '#e8ecf4' };
const H = DH.HUD = {};
const notchList = TR => { const l = ['EB']; for (let i = TR.nb; i >= 1; i--) l.push('B' + i); l.push('N'); for (let i = 1; i <= TR.np; i++) l.push('P' + i); return l; };
H.notchList = notchList;

/* ---------- the windshield frame and dashboard ---------- */
H.cab = (g, D, vp) => {
  const run = D.run, W = vp.w, Hh = vp.h, X = vp.x, Y = vp.y, C = panelCol(run), night = (D.grade && D.grade.night) || 0;
  const top = Y + Hh - R(Hh * .3);
  D.widgets = [];
  // glass: reflections at night, rain droplets, the wipers
  if (night > .5) px.blend(g, .12, 'add', () => { px.poly(g, [[X + W * .12, Y + 16], [X + W * .2, Y + 16], [X + W * .1, top], [X + W * .02, top]], '#8090c0'); });
  if (D.rain) {
    for (const d of D.drops) { px.rect(g, R(X + d.x * W), R(Y + d.y * (top - Y)), d.r > 1 ? 2 : 1, d.r > 1 ? 2 : 1, '#c8d8f0'); if (d.r > 1.2) px.dot(g, X + d.x * W, Y + d.y * (top - Y) + 2, '#8aa0c0'); }
    const a = D.wiper;   // a sweep every 1.2 s, about its pivot at the bottom
    for (const [cx, k] of [[X + W * .3, 1], [X + W * .72, 1]]) { const ang = -Math.PI / 2 + Math.sin(a * Math.PI) * 1.2 * k - .6; px.line(g, cx, top, cx + Math.cos(ang) * Hh * .42, top + Math.sin(ang) * Hh * .42, '#1a1a20', 2); }
  }
  // the pillars, the header and the sun visor
  px.poly(g, [[X, Y], [X + 14, Y], [X + 22, top], [X, top]], C.dk); px.poly(g, [[X + W, Y], [X + W - 14, Y], [X + W - 22, top], [X + W, top]], C.dk);
  px.line(g, X + 14, Y, X + 22, top, C.lt); px.line(g, X + W - 14, Y, X + W - 22, top, C.lt);
  px.rect(g, X, Y, W, 9, C.dk); px.rect(g, X, Y + 9, W, 1, C.lt);
  const vis = D.visor || 0; if (vis > .02) { px.rect(g, X + W * .28, Y + 9, W * .44, R(22 * vis), '#2a2018'); px.blend(g, .5, 'normal', () => px.rect(g, X + W * .29, Y + 10, W * .42, R(20 * vis), '#5a3a20')); }
  // the dashboard
  px.rect(g, X, top, W, Y + Hh - top, C.panel); px.rect(g, X, top, W, 2, C.lt); px.rect(g, X, top + 2, W, 1, C.dk);
  for (let i = 0; i < 3; i++) px.rect(g, X, Y + Hh - 1 - i * 9, W, 1, C.dk);
  const cy = top + 6, hh = Y + Hh - cy - 4;
  // a flow layout: the parts that fit, by priority, left to right; the buttons right-aligned
  const list = notchList(run.T), cellW = W > 520 ? 7 : W < 380 ? 4 : 5, narrow = W < 380;
  const parts = [['card', W > 520 ? 100 : narrow ? 62 : 80, 1], ['watch', 26, 3], ['handle', narrow ? 38 : 46, 1], ['speedo', 50, 1], ['notch', cellW * list.length + 6, 1], ['bc', 24, 4], ['lamps', 48, 2]];
  const btnW = 76, avail = W - btnW - 8;
  let use = parts.slice(); while (use.reduce((a, q) => a + q[1], 0) + use.length * 3 > avail) { let worst = -1; use.forEach((q, i) => { if (worst < 0 || q[2] > use[worst][2]) worst = i; }); if (use[worst][2] <= 1) break; use.splice(worst, 1); }
  const gap = Math.max(3, (avail - use.reduce((a, q) => a + q[1], 0)) / (use.length + 1)), at = {};
  let xx = X + 4; for (const q of use) { at[q[0]] = xx; xx += q[1] + gap; }
  // 1. the timetable card
  if (at.card !== undefined) {
    const cw = use.find(q => q[0] === 'card')[1], cx0 = at.card;
    px.rect(g, cx0, cy, cw, hh, '#f4f0e0'); px.rect(g, cx0, cy, cw, 9, '#2a3a6a'); T(g, run.T.name, cx0 + 3, cy + 1, '#ffd36a', { shadow: null });
    const rows = run.stops.slice(Math.max(0, run.stopIdx - 1), Math.max(0, run.stopIdx - 1) + Math.floor((hh - 10) / 9));
    rows.forEach((sp, i) => {
      const yy = cy + 11 + i * 9, cur = sp === run.nextStop;
      if (cur) px.rect(g, cx0 + 1, yy - 1, cw - 2, 9, '#ffe27a');
      T(g, sp.st.name.slice(0, cw > 90 ? 10 : cw < 70 ? 5 : 7), cx0 + 3, yy, sp.judged ? '#8a8a90' : '#141824', { shadow: null });
      T(g, sp.arr !== null ? DH.clock(sp.arr).slice(3) : sp.dep !== null ? 'D' + DH.clock(sp.dep).slice(3) : '', cx0 + cw - 3, yy, '#141824', { shadow: null, align: 'right' });
    });
    for (const p of run.passes) if (!p.done && rows.length < 5 && run.R.ahead(run.wrapS(run.s), run.wrapS(p.target)) > 0) { const yy = cy + 11 + rows.length * 9; if (yy < cy + hh - 8) T(g, p.st.name.slice(0, 7) + ' PASS', cx0 + 3, yy, '#2a8a3a', { shadow: null }); }
  }
  // the pocket watch
  if (at.watch !== undefined) {
    const wx = at.watch + 13, wy = top + 20;
    px.disc(g, wx, wy, 11, '#c89a30'); px.disc(g, wx, wy, 9, '#f8f4e8'); px.rect(g, wx - 1, wy - 14, 3, 3, '#c89a30');
    const cl = run.clock, ma = (cl / 60 % 60) / 60 * Math.PI * 2 - Math.PI / 2, ha = (cl / 3600 % 12) / 12 * Math.PI * 2 - Math.PI / 2, sa = Math.floor(cl) % 60 / 60 * Math.PI * 2 - Math.PI / 2;
    px.line(g, wx, wy, wx + Math.cos(ha) * 5, wy + Math.sin(ha) * 5, '#141824'); px.line(g, wx, wy, wx + Math.cos(ma) * 7, wy + Math.sin(ma) * 7, '#141824'); px.line(g, wx, wy, wx + Math.cos(sa) * 8, wy + Math.sin(sa) * 8, '#d02020');
    T(g, DH.clock(cl).slice(3), wx, wy + 14, '#ffffff', { align: 'center' });
  }
  // 2. the speedometer, with the ATS lamps over it
  const sr = Math.min(22, R(hh * .48)), sx = at.speedo + 25, sy = top + 6 + sr + 6;
  px.disc(g, sx, sy, sr + 2, '#101218'); px.disc(g, sx, sy, sr, C.face);
  for (let v = 0; v <= 120; v += 10) { const a = Math.PI * .75 + v / 120 * Math.PI * 1.5, r0 = v % 20 ? sr - 3 : sr - 5; px.line(g, sx + Math.cos(a) * r0, sy + Math.sin(a) * r0, sx + Math.cos(a) * (sr - 1), sy + Math.sin(a) * (sr - 1), '#202430'); }
  const lim = run.limitNow(), la = Math.PI * .75 + Math.min(120, lim.v) / 120 * Math.PI * 1.5; px.disc(g, sx + Math.cos(la) * (sr - 3), sy + Math.sin(la) * (sr - 3), 2, '#ff3a2a');
  const na = Math.PI * .75 + E.clamp(D.needle, 0, 125) / 120 * Math.PI * 1.5; px.line(g, sx, sy, sx + Math.cos(na) * (sr - 4), sy + Math.sin(na) * (sr - 4), '#e02a20', 2); px.disc(g, sx, sy, 2, '#202020');
  T(g, String(Math.round(Math.abs(run.v))), sx, sy + 5, '#141824', { align: 'center', scale: 1, shadow: null });
  T(g, 'km/h', sx, sy + sr - 9, '#5a5e6c', { align: 'center', shadow: null });
  const atsOn = run.ats.ringing && Math.floor(game.real * 4) % 2 === 0;
  px.rect(g, sx - sr - 2, top + 3, 18, 8, '#e8e8e8'); T(g, 'ATS', sx - sr - 1, top + 3, '#141824', { shadow: null });
  px.rect(g, sx + sr - 15, top + 3, 18, 8, atsOn ? '#ff2a20' : '#4a1a18'); T(g, 'ATS', sx + sr - 14, top + 3, atsOn ? '#ffffff' : '#7a3a38', { shadow: null });
  // 3. the notch display and strip (click a cell for N or EB)
  const nx = at.notch, nw = cellW * list.length + 4;
  const nm = run.notchName, ncol = nm === 'EB' ? '#ff3a3a' : nm[0] === 'B' ? '#ffa040' : nm === 'N' ? '#ffffff' : '#5ac8ff';
  px.rect(g, nx, top + 5, nw, 26, '#0c0e14');
  T(g, nm, nx + nw / 2, top + 8, ncol, { align: 'center', scale: 3 });
  list.forEach((n, i) => {
    const x = nx + 2 + i * cellW, on = n === nm, c = n === 'EB' ? '#ff3a3a' : n[0] === 'B' ? '#ffa040' : n === 'N' ? '#ffffff' : '#5ac8ff';
    px.rect(g, x, top + 34, cellW - 1, 8, on ? c : E.shade(c, -.65));
    if (D.hover === 'strip') px.rect(g, x, top + 43, cellW - 1, 1, '#ffffff');
  });
  T(g, 'B', nx + 2, top + 45, '#ffa040'); T(g, 'P', nx + nw - 6, top + 45, '#5ac8ff');
  D.widgets.push({ id: 'strip', x: nx, y: top + 32, w: nw, h: 12, list, cellW });
  // 4. the BC gauge
  if (at.bc !== undefined) {
    const bx = at.bc + 11, by = top + 16;
    px.disc(g, bx, by, 10, '#101218'); px.disc(g, bx, by, 9, C.face);
    const bc = E.clamp((run.Be || 0) / 5, 0, 1), ba = Math.PI * .8 + bc * Math.PI * 1.4; px.line(g, bx, by, bx + Math.cos(ba) * 7, by + Math.sin(ba) * 7, '#e02a20');
    T(g, 'BC', bx, by + 11, '#c8c8d0', { align: 'center' });
  }
  // 5. lamps: pilot, door sides, SLIP, WSP, the comfort face
  if (at.lamps !== undefined) {
    const lx = at.lamps, ly = top + 4;
    const lamp = (x, y, on, c, lab) => { px.rect(g, x, y, 23, 9, '#0c0e14'); px.rect(g, x + 1, y + 1, 21, 7, on ? c : E.shade(c, -.7)); T(g, lab, x + 12, y + 1, on ? '#141824' : '#5a5a60', { align: 'center', shadow: null }); };
    lamp(lx, ly, run.pilot, '#ffa030', 'PILOT'); lamp(lx + 25, ly, run.slip, '#ff5a3a', 'SLIP');
    const ds = run.dw && run.dw.sp ? run.dw.sp.st.doorSide : null;
    lamp(lx, ly + 11, run.doors === 'open' && ds === 'L', '#ffe060', '< L'); lamp(lx + 25, ly + 11, run.doors === 'open' && ds === 'R', '#ffe060', 'R >');
    lamp(lx, ly + 22, run.slide, '#ff5a3a', 'WSP');
    const face = run.comfort > 85 ? 0 : run.comfort > 65 ? 1 : run.comfort > 40 ? 2 : 3, fx = lx + 36, fy = ly + 27;
    px.disc(g, fx, fy, 5, ['#6aee7a', '#ffe060', '#ffa040', '#ff5a4a'][face]); px.dot(g, fx - 2, fy - 1, '#141824'); px.dot(g, fx + 2, fy - 1, '#141824');
    if (face < 2) { px.dot(g, fx - 2, fy + 2, '#141824'); px.rect(g, fx - 1, fy + 3, 3, 1, '#141824'); px.dot(g, fx + 2, fy + 2, '#141824'); } else px.rect(g, fx - 2, fy + 2, 5, 1, '#141824');
  }
  // 6. buttons: ATS, HORN, EB (they depress, they click); the camera icon on the right pillar
  const btn = (id, x, y, r, col, lab, down) => {
    const hover = D.hover === id;
    px.disc(g, x, y + 2, r, '#0c0e14'); px.disc(g, x, y + (down ? 2 : 0), r, down ? E.shade(col, -.25) : col);
    if (!down) px.disc(g, x - r * .3, y - r * .3, Math.max(1, r * .3), E.shade(col, .4));
    if (hover) px.blend(g, .4, 'add', () => px.disc(g, x, y, r + 2, '#ffffff'));
    if (lab) T(g, lab, x, y + r + 3, hover ? '#ffe27a' : '#e8e8f0', { align: 'center' });
    D.widgets.push({ id, x: x - r - 2, y: y - r - 2, w: r * 2 + 4, h: r * 2 + 12 });
  };
  const rx = X + W - 14;
  btn('eb', rx, top + 16, 10, '#d82a20', 'EB', run.isEB);
  btn('horn', rx - 27, top + 18, 8, '#e8e8e8', 'HORN', D.hornDown);
  btn('ats', rx - 52, top + 18, 8, '#e8c020', 'ATS', run.ats.confirmed && run.ats.chime);
  const cmx = X + W - 26, cmy = top - 14;
  px.rect(g, cmx, cmy, 16, 10, D.hover === 'cam' ? '#7a9ae8' : '#4a5a88'); px.rect(g, cmx + 5, cmy + 2, 6, 6, '#141824'); px.rect(g, cmx + 6, cmy + 3, 4, 4, '#9ac8ff'); px.rect(g, cmx + 2, cmy - 2, 4, 2, '#4a5a88');
  D.widgets.push({ id: 'cam', x: cmx - 2, y: cmy - 3, w: 20, h: 15 });
  H.handle(g, D, at.handle + 23, Y + Hh - 6, run, C);
};
/* the master controller: one T-handle (8000) or two handles (3000), tweened per notch, the gloved hand riding it */
H.handle = (g, D, x, y, run, C) => {
  const list = notchList(run.T), n = list.length, k = D.leverVis, u = (k + run.T.nb + 1) / (n - 1);   // 0 = EB (back), 1 = full power
  const ang = -Math.PI / 2 + (u - .5) * 1.4, len = 28;
  px.ell(g, x, y - 2, 18, 5, '#101218'); px.ell(g, x, y - 3, 16, 4, C.lt);
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / (n - 1) - .5) * 1.4; px.dot(g, x + Math.cos(a) * 15, y - 3 + Math.sin(a) * 4, i === Math.round(k + run.T.nb + 1) ? '#ffe27a' : '#8a8a92'); }
  const draw1 = (a, col, off) => {
    const ex = x + off + Math.cos(a) * len * .55, ey = y - 3 - Math.abs(Math.sin(a)) * len;
    px.line(g, x + off, y - 3, ex, ey, '#b8b8c0', 3); px.line(g, x + off, y - 4, ex, ey - 1, '#e0e0e8');
    px.rect(g, R(ex - 9), R(ey - 3), 18, 5, col); px.rect(g, R(ex - 9), R(ey - 3), 18, 1, E.shade(col, .3));
    return [ex, ey];
  };
  let tip;
  if (run.T.handles === 2) {   // brake (left) and power (right)
    const bu = Math.min(1, (Math.min(0, k) + run.T.nb + 1) / (run.T.nb + 1)), pu = Math.max(0, k) / run.T.np;
    draw1(-Math.PI / 2 + (bu - 1) * .9, '#2a2a30', -10); tip = draw1(-Math.PI / 2 + pu * .9, '#2a2a30', 10);
  } else tip = draw1(ang, '#1a1a20', 0);
  D.widgets.push({ id: 'handle', x: x - 30, y: y - 40, w: 60, h: 40 });
  // the glove (unless it's off pointing at a call)
  if (!(D.glove && D.glove.t < D.glove.dur)) H.glove(g, tip[0], tip[1] - 2, 'grip');
};
H.glove = (g, x, y, pose, ang = 0) => {
  x = R(x); y = R(y);
  const W1 = '#f4f4f4', S1 = '#c8c8d0';
  if (pose === 'grip') { px.ell(g, x, y, 7, 5, S1); px.ell(g, x - 1, y - 1, 6, 4, W1); for (let i = 0; i < 4; i++) px.rect(g, x - 5 + i * 3, y - 4, 2, 3, i % 2 ? W1 : '#e8e8ec'); px.rect(g, x + 4, y + 2, 10, 5, '#1e3058'); return; }
  // pointing: a forearm in the navy sleeve, the index finger out toward ang
  const dx = Math.cos(ang), dy = Math.sin(ang);
  px.line(g, x - dx * 26, y - dy * 26, x - dx * 6, y - dy * 6, '#1e3058', 7);
  px.line(g, x - dx * 26, y - dy * 26 - 2, x - dx * 6, y - dy * 6 - 2, '#2a4078', 2);
  px.disc(g, x - dx * 3, y - dy * 3, 5, S1); px.disc(g, x - dx * 3, y - dy * 3 - 1, 4, W1);
  px.line(g, x - dx * 2, y - dy * 2, x + dx * 6, y + dy * 6, W1, 3); px.line(g, x - dx * 2 + 1, y - dy * 2 + 1, x + dx * 6 + 1, y + dy * 6 + 1, S1, 1);
};

/* ---------- the HUD over the view ---------- */
H.hud = (g, D, vp, compact) => {
  const run = D.run, W = vp.w, Hh = vp.h, X = vp.x, Y = vp.y, m = Math.max(6, R(Math.min(W, Hh) * .05)), t = game.real;
  const corner = game.cornerArea && game.cornerArea();
  const dashTop = D.cabFull ? Y + Hh - R(Hh * .3) : Y + Hh;
  // 1. the Halo Time ring (top left)
  const hx = X + m + 16, hy = Y + m + 16, gr = run.grace, frac = gr / 99, low = gr <= 10 && !run.stage.tutorial;
  px.disc(g, hx, hy, 17, '#0b0d18');
  for (let i = 0; i < 48; i++) { const a = -Math.PI / 2 + i / 48 * Math.PI * 2, on = i / 48 < frac; const c = on ? (low && Math.floor(t * 4) % 2 ? '#ff3a2a' : i % 2 ? '#ffd84a' : '#f2c230') : '#3a3420'; px.rect(g, R(hx + Math.cos(a) * 14) - 1, R(hy + Math.sin(a) * 14) - 1, 3, 3, c); }
  if (low) px.blend(g, .3, 'add', () => px.disc(g, hx, hy, 19, '#ff3a2a'));
  T(g, run.stage.tutorial ? '--' : String(Math.ceil(gr)), hx, hy - 7, low ? '#ff6a5a' : '#fff4c8', { align: 'center', scale: 2 });
  T(g, 'HALO', hx, hy + 19, '#ffd84a', { align: 'center' });
  for (const f of D.halos) { const k = f.t / 1.2; T(g, (f.d > 0 ? '+' : '') + f.d + ' s', hx + 22, hy - 4 - k * 14, f.d > 0 ? '#ffd84a' : '#ff5a4a'); }
  if (compact) { T(g, String(Math.round(run.finalScore())), X + W - m, Y + m, '#ffffff', { align: 'right' }); }
  // 2. the station line (top centre)
  const sp = run.nextStop, cxs = X + W / 2;
  if (sp && !run.stage.tutorial) {
    const label = run.phase === 'dwell' ? sp.st.name : 'NEXT  ' + sp.st.name, sc = compact || W < 400 ? 1 : 2;
    T(g, label, cxs, Y + m, '#ffffff', { align: 'center', scale: sc });
    const d = sp.target - run.s, line2 = run.phase === 'dwell' ? (sp.dep !== null ? 'DEP ' + DH.clock(sp.dep) : 'TERMINAL') : DH.fmtKm(Math.max(0, d)) + '  ARR ' + (sp.arr !== null ? DH.clock(sp.arr) : '--');
    T(g, line2, cxs, Y + m + 8 * sc + 2, '#c8d8ff', { align: 'center' });
    const nextPass = run.passes.find(p => !p.done && p.target > run.s && p.target < sp.target);
    if (nextPass && !compact) T(g, 'PASS ' + nextPass.st.name + ' ' + DH.clock(nextPass.at), cxs, Y + m + 8 * sc + 11, '#8aeea0', { align: 'center' });
  } else if (run.stage.tutorial) {
    const st = run.stage.steps[run.tut.i];
    T(g, 'DEPOT TRAINING  ' + Math.min(run.stage.steps.length, run.tut.i + 1) + '/' + run.stage.steps.length, cxs, Y + m, '#ffd84a', { align: 'center', scale: 1 });
    if (st) { T(g, st.goal.toUpperCase(), cxs, Y + m + 10, '#ffffff', { align: 'center', scale: 2 }); if (st.hint) DH.Glyph.prompt(g, st.hint, st.hint === 'call' ? 'CALL' : st.hint === 'eb' ? 'EMERGENCY' : st.hint.toUpperCase(), cxs, Y + m + 34, '#ffe27a', 1, 'center'); }
  }
  // toasts under the station line
  D.toasts.forEach((q, i) => { const a = q.t < .2 ? q.t / .2 : 1; if (a > 0) T(g, q.text, cxs, Y + m + 34 + i * 10 + (run.stage.tutorial ? 14 : 0), q.color || '#ffffff', { align: 'center' }); });
  // 3. the top-right cluster: limit, next limit, the next signal, the clock
  if (!compact) {
    const rx = X + W - m, ry = Y + m + (corner && corner.y1 && corner.x0 < X + W - 60 ? Math.max(0, corner.y1 - Y) : 0) + 2;
    const lim = run.limitNow(), lv = lim.v >= run.T.vmax ? run.T.vmax : lim.v, lw = 26;
    px.rect(g, rx - lw, ry, lw, 20, '#0b0d18'); px.rect(g, rx - lw + 1, ry + 1, lw - 2, 18, lim.why === 'signal' ? '#ffe060' : '#f4f4f0');
    T(g, String(lv), rx - lw / 2, ry + 3, '#141824', { align: 'center', scale: 2, shadow: null });
    T(g, lim.why === 'signal' ? 'SIG' : lim.why === 'slow' ? 'SLOW' : lim.why === 'board' ? 'LIMIT' : 'LINE', rx - lw - 3, ry + 6, '#c8c8d0', { align: 'right' });
    const nl = run.nextLimit(); if (nl && nl.d < 1000) T(g, '▸' + nl.v + ' in ' + Math.round(nl.d) + ' m', rx, ry + 23, '#ffd84a', { align: 'right' });
    const ns = run.nextSignals(3).find(q => q.sg.sighted && q.d > 0);
    if (ns) {
      const sx = rx - 8, sy = ry + 34, asp = ns.sg.aspect, lit = { G: [1], YG: [0, 1], Y: [3], YY: [0, 3], R: [2] }[asp] || [2], cols = ['#ffb020', '#30ff90', '#ff2a20', '#ffb020'];
      px.rect(g, sx - 4, sy, 9, 30, '#0b0d18');
      for (let i = 0; i < 4; i++) { const on = lit.includes(i); px.disc(g, sx, sy + 4 + i * 7, 2, on ? cols[i] : '#2a2a30'); if (on) px.blend(g, .4, 'add', () => px.disc(g, sx, sy + 4 + i * 7, 4, cols[i])); }
      T(g, asp, sx - 8, sy + 6, asp === 'R' ? '#ff5a4a' : asp === 'G' ? '#6aee7a' : '#ffd040', { align: 'right', scale: 2 });
      T(g, Math.round(ns.d) + ' m', sx - 8, sy + 22, '#ffffff', { align: 'right' });
    }
    T(g, DH.clock(run.clock), rx, ry + 68, '#ffffff', { align: 'right' });
  }
  // 4. the stop gauge, above the dash
  if (sp && (sp.target - run.s) < 600 && run.phase === 'run' && sp.target - run.s > -60) {
    const d = sp.target - run.s, gw = Math.min(compact ? W - 20 : 220, R(W * .52)), gx = X + R((W - gw) / 2), gy = dashTop - 20;
    px.rect(g, gx - 2, gy - 12, gw + 4, 24, '#0b0d18'); px.blend(g, .7, 'normal', () => px.rect(g, gx - 1, gy - 11, gw + 2, 22, '#141a2e'));
    const fine = Math.abs(d) < 30, span = fine ? 2 : 600, xOf = dd => gx + gw - 12 - E.clamp(dd, -span * .1, span) / span * (gw - 24);
    if (fine) for (let q = -2; q <= 2; q += .1) { const x = R(gx + gw / 2 + q / 2 * (gw / 2 - 12) * 1), big = Math.abs(q - Math.round(q)) < .01; px.rect(g, x, gy + (big ? 2 : 5), 1, big ? 6 : 3, big ? '#c8d0e8' : '#6a7090'); }
    else for (let q = 0; q <= 600; q += 100) px.rect(g, R(xOf(q)), gy + 3, 1, 5, '#6a7090');
    const mk = fine ? gx + gw / 2 : xOf(0);
    px.rect(g, R(mk) - 1, gy - 9, 3, 18, '#f0c818'); T(g, run.key, R(mk), gy - 9, '#141824', { align: 'center', shadow: null });
    const nose = fine ? gx + gw / 2 - E.clamp(d, -2.2, 2.2) / 2 * (gw / 2 - 12) : xOf(d);
    px.poly(g, [[nose, gy - 2], [nose - 7, gy - 7], [nose - 7, gy + 3]], '#5ac8ff');
    if (DH.guideOn() && D.guide) {   // the braking guide: where B4 must start, and the predicted stop
      const gb = D.guide;
      if (!fine && gb.brakeAt > 0) { const bx = xOf(gb.brakeAt); px.blend(g, .5, 'normal', () => px.rect(g, R(Math.min(bx, xOf(0))), gy - 5, R(Math.abs(xOf(0) - bx)), 10, '#ff9a20')); T(g, 'BRAKE', R(bx), gy + 7, '#ffb050', { align: 'center' }); }
      if (gb.stopAt !== null) { const px2 = fine ? gx + gw / 2 + E.clamp(gb.stopAt - d, -2.2, 2.2) / 2 * (gw / 2 - 12) * -1 : xOf(d - gb.stopAt); px.rect(g, R(px2) - 1, gy - 7, 2, 14, '#c8f0ff'); }
    }
    T(g, (d >= 0 ? '' : '+') + Math.abs(d).toFixed(Math.abs(d) < 30 ? 2 : 0) + ' m', X + W / 2, gy - 23, Math.abs(d) < 1 ? '#6aee7a' : '#ffffff', { align: 'center', scale: compact ? 1 : 2 });
  }
  // the call bracket and prompt
  const open = run.openCalls();
  if (open.length && !compact) {
    const o = open.sort((a, b) => a.d - b.d)[0];
    let p = null;
    if (o.dep) { const sg = o.call.sig; p = sg ? D.project(sg.s, (run.R.trackX(run.track, sg.s) || 0) - 2.4, 5.2) : null; }
    else p = D.project(o.call.s, o.call.x, o.call.y || 2.5);
    if (p) { const k = Math.max(6, Math.min(30, p[2] * 1.2)), x = R(p[0]), y = R(p[1]); const c = o.dep || (o.d >= 60 && o.d <= DH.T.callGreat) ? '#ffffff' : '#a8b0c8'; for (const [ax, ay] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.rect(g, x + ax * k - (ax > 0 ? 4 : 0), y + ay * k - (ay > 0 ? 0 : 0), 5, 1, c); px.rect(g, x + ax * k - (ax > 0 ? 0 : 0), y + ay * k - (ay > 0 ? 4 : 0), 1, 5, c); } }
    DH.Glyph.prompt(g, 'call', o.dep ? 'CALL: DEPARTURE' : 'CALL', X + W / 2, dashTop - (sp && sp.target - run.s < 600 && run.phase === 'run' ? 62 : 14), '#ffffff', 1, 'center');
  }
  if (run.ats.ringing && !run.ats.confirmed) { const bl = Math.floor(t * 4) % 2; DH.Glyph.prompt(g, 'ats', 'ATS CONFIRM', X + W / 2, Y + Hh * .45, bl ? '#ff5a4a' : '#ffffff', 2, 'center'); }
  if (run.isEB && Math.abs(run.v) < .05 && run.phase === 'run' && !compact) DH.Glyph.prompt(g, 'power', 'EB RELEASE', X + W / 2, Y + Hh * .55, '#ffd84a', 1, 'center');
  const hz = run.horns.find(h => h.inside && !h.done); if (hz && !compact) DH.Glyph.prompt(g, 'horn', 'HORN', X + W / 2, Y + Hh * .55 + 12, '#ffd84a', 1, 'center');
  if (run.flash && run.flash.state === 'flashing') DH.Glyph.prompt(g, 'horn', 'ANSWER THE FLASH', X + W / 2, Y + Hh * .5, '#ffd84a', 1, 'center');
  if (run.phase === 'dwell' && run.pilot && run.li <= 0 && run.depCall && run.depCall.done && !compact) DH.Glyph.prompt(g, 'power', 'POWER', X + W / 2, dashTop - 14, '#5ac8ff', 1, 'center');
  // 5. judgments and banners, centre
  if (D.judge) {
    const j = D.judge, k = Math.min(1, j.t / .15), sc = compact ? 2 : 3, y = Y + Hh * .3;
    if (j.t < 3.2) {
      E.font.title(g, j.label, R(X + W / 2), R(y - (1 - k) * 10), { scale: sc, colors: [E.shade(j.color, .5), j.color, E.shade(j.color, -.3)], outline: '#0b0d18', depth: 2, depthColor: '#0b0d18', align: 'center' });
      if (j.t > .5) (j.items || []).forEach((it, i) => T(g, it[0], X + W / 2, y + 26 + i * 10, it[1], { align: 'center' }));
      if (j.err !== undefined && j.t > .3) T(g, (j.err >= 0 ? '+' : '') + j.err.toFixed(2) + ' m', X + W / 2, y - 12, '#ffffff', { align: 'center' });
    }
  }
  if (D.banner && D.banner.t < 2.5) { const b = D.banner, y = Y + Hh * .2; px.blend(g, .6, 'normal', () => px.rect(g, X, R(y - 3), W, 15, '#0b0d18')); T(g, b.text, X + W / 2, y, b.color, { align: 'center', scale: compact ? 1 : 2 }); }
  // the stop cam inset: a side elevation of the platform edge, the marker and the front car
  if (D.stopcam && D.stopcam.t < 2.6 && !compact) H.stopCam(g, D, vp);
  // the glove pointing at a call
  if (D.glove && D.glove.t < D.glove.dur) {
    const gl = D.glove, u = gl.t < .15 ? gl.t / .15 : gl.t < .55 ? 1 : 1 - (gl.t - .55) / .25, sx = X + W * .55, sy = Y + Hh + 10;
    const tx = gl.x, ty = gl.y, x = sx + (tx - sx) * .78 * u, y = sy + (ty - sy) * .78 * u;
    if (u > 0) H.glove(g, x, y, 'point', Math.atan2(ty - sy, tx - sx));
  }
};
/* the stop cam: the platform in profile, the stop marker post, the train's front easing in, a dimension line */
H.stopCam = (g, D, vp) => {
  const sc = D.stopcam, W = vp.w, Hh = vp.h, big = game.settings.difficulty === 'Easy', w = big ? R(W * .8) : 170, h = big ? R(Hh * .5) : 74;
  const slide = Math.min(1, sc.t / .25) * (sc.t > 2.35 ? Math.max(0, 1 - (sc.t - 2.35) / .25) : 1);
  const x = vp.x + W - R(w * slide) - (big ? (W - w) / 2 : 6), y = vp.y + R(Hh * .3);
  px.rect(g, x - 2, y - 2, w + 4, h + 4, '#0b0d18'); px.rect(g, x, y, w, h, '#6aa0d8'); px.rect(g, x, y + h * .55, w, h * .45, '#8a8680');
  px.rect(g, x, y + R(h * .55) - 2, w, 3, '#f4f4f0'); px.rect(g, x, y + R(h * .55) + 3, w, 2, '#f0c818');
  T(g, 'STOP CAM', x + 3, y + 2, '#ffffff');
  const scale = w / 6, mx = x + w * .62;   // 6 m across
  px.rect(g, R(mx), R(y + h * .25), 2, R(h * .3), '#303030'); px.rect(g, R(mx) - 5, R(y + h * .18), 12, 9, '#f0c818'); T(g, D.run.key, R(mx) + 1, R(y + h * .18) + 1, '#141824', { align: 'center', shadow: null });
  const u = Math.min(1, sc.t / 1.2), e = 1 - Math.pow(1 - u, 3), err = sc.err || 0, nose = mx + E.clamp(err, -3, 3) * scale - (1 - e) * 2 * scale;
  const lv = DH.LIVERY[D.run.T.id] || DH.LIVERY.h8000;
  px.rect(g, R(nose - w), R(y + h * .2), R(w), R(h * .32), lv.body); px.rect(g, R(nose - w), R(y + h * .37), R(w), 3, lv.stripe);
  px.poly(g, [[nose, y + h * .2], [nose + 6, y + h * .26], [nose + 6, y + h * .52], [nose, y + h * .52]], lv.face);
  px.rect(g, R(nose - 30), R(y + h * .24), 10, 8, lv.win); px.rect(g, R(nose - 16), R(y + h * .24), 10, 8, lv.win);
  // the dimension line
  const yy = R(y + h * .8);
  px.line(g, mx, yy, nose + 6, yy, '#ffffff'); px.rect(g, R(mx), yy - 3, 1, 7, '#ffffff'); px.rect(g, R(nose + 6), yy - 3, 1, 7, '#ffffff');
  if (u >= 1) T(g, (err >= 0 ? '+' : '') + err.toFixed(2) + ' m', x + w / 2, yy + 3, Math.abs(err) <= .1 ? '#ffd84a' : '#ffffff', { align: 'center' });
  if (sc.label === 'PERFECT HALO!' && u >= 1) DH.drawHaro(g, x + 18, y + h - 8, 1, game.real, { hop: Math.max(0, Math.sin((sc.t - 1.2) * 6)) });
};
})();
