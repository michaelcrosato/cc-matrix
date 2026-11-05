/* The cab: windshield, dashboard, speedometer, the master controller strip, stop gauge, HUD, prompts (glyph badges), Stop Cam. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, R = DH.route, clamp = E.clamp;
const txt = (g, s, x, y, c = '#fff', o) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
DH.txt = txt;

/* ---------- prompt badges: PlayStation glyphs (or Xbox via Settings), keys and mouse ---------- */
const PS = { 0: ['x', '#6aa3ff'], 1: ['o', '#ff6a7a'], 2: ['s', '#ff9ad8'], 3: ['t', '#5fe0a0'], 4: ['L1'], 5: ['R1'], 6: ['L2'], 7: ['R2'], 9: ['OPT'], 12: ['UP'], 13: ['DN'], 14: ['LT'], 15: ['RT'] };
const XB = { 0: ['A', '#58d36a'], 1: ['B', '#ff6a5a'], 2: ['X', '#5a9bff'], 3: ['Y', '#f6d44a'], 4: ['LB'], 5: ['RB'], 6: ['LT'], 7: ['RT'], 9: ['MENU'], 12: ['UP'], 13: ['DN'], 14: ['LT'], 15: ['RT'] };
function drawGlyph(g, kind, x, y, col) {   // a 9x9 glyph centred at x,y
  px.disc(g, x, y, 5, '#1b1f2a'); px.disc(g, x, y, 4, '#2a3042');
  if (kind === 'x') { px.line(g, x - 2, y - 2, x + 2, y + 2, col); px.line(g, x - 2, y + 2, x + 2, y - 2, col); }
  else if (kind === 'o') { px.disc(g, x, y, 2, col); px.disc(g, x, y, 1, '#2a3042'); }
  else if (kind === 's') { px.rect(g, x - 2, y - 2, 5, 5, col); px.rect(g, x - 1, y - 1, 3, 3, '#2a3042'); }
  else if (kind === 't') { px.poly(g, [[x, y - 3], [x + 3, y + 2], [x - 3, y + 2]], col); px.poly(g, [[x, y - 1], [x + 1, y + 1], [x - 1, y + 1]], '#2a3042'); }
}
// returns the prompt description for an action on the device in use
DH.promptOf = (action) => {
  const I = E.current.input, dev = I.lastDevice;
  const forced = DH.MOUSE_PROMPTS[action];
  if (dev === 'gamepad') {
    const m = (I.map[action] || []).find(c => /^Pad\d+$/.test(c)); const n = m ? +m.slice(3) : -1, tbl = I.padStyle() === 'xbox' ? XB : PS, e = tbl[n];
    if (e) return { type: e[0].length === 1 && e[1] ? (I.padStyle() === 'xbox' ? 'xb' : 'ps') : 'pill', text: e[0], col: e[1] };
    return { type: 'pill', text: I.label(action) };
  }
  if (dev === 'mouse' && forced) return { type: 'pill', text: forced, mouse: true };
  return { type: 'key', text: (I.label(action, 'keyboard') || '?').replace('Backspace', 'Bksp').replace('Space', 'Space') };
};
DH.MOUSE_PROMPTS = { call: 'L-CLICK', horn: 'HORN BTN', ats: 'ATS BTN', eb: 'EB BTN', neutral: 'N', view: 'CAM' };
DH.badgeW = (p) => p.type === 'ps' || p.type === 'xb' ? 11 : E.font.width(p.text, { font: 'tiny' }) + 7;
DH.badge = (g, action, x, y) => {   // x,y = left, vertical centre; returns width
  const p = DH.promptOf(action), I = E.current.input;
  if (p.type === 'ps') { if (I.padStyle() === 'xbox') { px.disc(g, x + 5, y, 5, '#1b1f2a'); px.disc(g, x + 5, y, 4, p.col); txt(g, p.text, x + 5, y - 3, '#10131a', { font: 'tiny', align: 'center', shadow: null }); } else drawGlyph(g, p.text, x + 5, y, p.col); return 11; }
  if (p.type === 'xb') { px.disc(g, x + 5, y, 5, '#1b1f2a'); px.disc(g, x + 5, y, 4, p.col); txt(g, p.text, x + 5, y - 3, '#10131a', { font: 'tiny', align: 'center', shadow: null }); return 11; }
  const w = E.font.width(p.text, { font: 'tiny' }) + 7;
  px.rect(g, x, y - 5, w, 10, p.type === 'key' ? '#dfe3ea' : '#2a3042'); px.rect(g, x, y + 3, w, 2, p.type === 'key' ? '#9aa2b2' : '#161a24');
  txt(g, p.text, x + w / 2, y - 3, p.type === 'key' ? '#1a1d26' : '#e8ecf4', { font: 'tiny', align: 'center', shadow: null });
  return w;
};
DH.promptLine = (g, items, x, y, align) => {   // items: [[action, 'Label'], ...]
  let total = 0; const ws = items.map(([a, l]) => { const p = DH.promptOf(a), w = DH.badgeW(p) + 3 + E.font.width(l, { font: 'tiny' }) + 8; total += w; return w; });
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  items.forEach(([a, l], i) => { const bw = DH.badge(g, a, cx, y); txt(g, l, cx + bw + 3, y - 3, '#d9e0ee', { font: 'tiny' }); cx += ws[i]; });
};

/* ---------- the cab ---------- */
const NOTCH_CELLS = (T) => { const a = [{ l: -9, t: 'EB' }]; for (let i = 8; i >= 1; i--) a.push({ l: -i, t: 'B' + i }); a.push({ l: 0, t: 'N' }); for (let i = 1; i <= T.pn; i++) a.push({ l: i, t: 'P' + i }); return a; };
DH.NOTCH_CELLS = NOTCH_CELLS;

DH.drawCab = function (g, W, H, run, ui, ptr) {
  const dashH = Math.round(H * .31), y0 = H - dashH, T = run.T, sway = ui.sway || 0;
  const hit = (b) => ptr && ptr[0] >= b.x && ptr[0] < b.x + b.w && ptr[1] >= b.y && ptr[1] < b.y + b.h;
  ui.buttons = [];
  // windshield frame
  const pil = '#14161c', pil2 = '#232733';
  if (!ui.exterior) {
  px.poly(g, [[0, 0], [24, 0], [12, y0], [0, y0]], pil); px.poly(g, [[W, 0], [W - 24, 0], [W - 12, y0], [W, y0]], pil);
  px.poly(g, [[24, 0], [28, 0], [16, y0], [12, y0]], pil2); px.poly(g, [[W - 24, 0], [W - 28, 0], [W - 16, y0], [W - 12, y0]], pil2);
  px.rect(g, 0, 0, W, 6, pil); px.rect(g, 0, 6, W, 1, pil2); }
  // wipers in rain
  if (ui.rain && !ui.exterior) { const a = (Math.sin(ui.time * 3) * .5 + .5), bx = W / 2 - 40, by = y0 - 2; px.line(g, bx, by, bx + 60 * Math.cos(a * 1.5 + .2), by - 60 * Math.sin(a * 1.5 + .2), '#101216', 2); }
  // dashboard
  if (ui.exterior) px.blend(g, .62, 'normal', () => px.rect(g, 0, y0, W, dashH, '#10131c')); else { px.rect(g, 0, y0, W, dashH, '#181b24'); for (let x = 0; x < W; x += 6) px.rect(g, x, y0 + 3, 1, 1, '#222735'); }
  px.rect(g, 0, y0, W, 2, '#3a4152'); px.rect(g, 0, y0 + 2, W, 1, '#0c0e13');
  // speedometer
  const sr = Math.min(36, dashH * .44), scx = 14 + sr + 6, scy = y0 + dashH * .5 + 3;
  px.disc(g, scx, scy, sr + 3, '#0c0e13'); px.disc(g, scx, scy, sr, '#12161f');
  const kmh = run.v * 3.6, vmax = Math.max(120, T.maxKmh + 10), ang = k => (Math.PI * .75) + clamp(k / vmax, 0, 1) * Math.PI * 1.5;
  for (let k = 0; k <= vmax; k += 10) { const a = ang(k), r1 = sr - (k % 20 ? 3 : 5); px.line(g, scx + Math.cos(a) * (sr - 1), scy + Math.sin(a) * (sr - 1), scx + Math.cos(a) * r1, scy + Math.sin(a) * r1, k % 20 ? '#6c7488' : '#cfd6e6'); if (k % 20 === 0 && sr > 28 && k >= 20 && k <= vmax - 20) txt(g, String(k), scx + Math.cos(a) * (sr - 10), scy + Math.sin(a) * (sr - 10) - 2, '#aab3c8', { font: 'tiny', align: 'center', shadow: null }); }
  const lim = run.limitNow(); { const a = ang(lim); px.poly(g, [[scx + Math.cos(a) * (sr + 2), scy + Math.sin(a) * (sr + 2)], [scx + Math.cos(a - .09) * (sr - 4), scy + Math.sin(a - .09) * (sr - 4)], [scx + Math.cos(a + .09) * (sr - 4), scy + Math.sin(a + .09) * (sr - 4)]], kmh > lim + run.tune.limitTol ? '#ff4a3a' : '#ffb020'); }
  { const a = ang(kmh); px.line(g, scx, scy, scx + Math.cos(a) * (sr - 3), scy + Math.sin(a) * (sr - 3), '#ff5a4a', 2); px.disc(g, scx, scy, 3, '#2a3042'); }
  txt(g, String(Math.round(kmh)), scx, scy + sr * .3, '#e8f0ff', { align: 'center', scale: 2 }); txt(g, 'km/h', scx, scy + sr * .3 + 15, '#7f8aa4', { align: 'center', font: 'tiny' });
  // lamps column
  let lx = scx + sr + 10; const lampY = y0 + 7;
  const lamp = (label, on, c, x, y) => { px.rect(g, x, y, 24, 9, '#0c0e13'); px.rect(g, x + 1, y + 1, 22, 7, on ? c : '#2a2f3c'); txt(g, label, x + 12, y + 2, on ? '#10131a' : '#59627a', { font: 'tiny', align: 'center', shadow: null }); };
  const blink = Math.floor(ui.time * 4) % 2;
  lamp('DOORS', run.doors, '#ff6a4a', lx, lampY); lamp('GO', run.canDepart && run.phase === 'dwell', '#58e07a', lx + 26, lampY);
  lamp('ATS', run.atsRing ? blink : !!run.atsMode, '#ffc020', lx, lampY + 11); lamp('EB', run.lever === -9, '#ff3a3a', lx + 26, lampY + 11);
  lamp('RED', run.nextSignals(1)[0] && run.nextSignals(1)[0].aspect === 'R', '#ff3a2a', lx, lampY + 22); lamp('CAUT', run.nextSignals(1)[0] && run.nextSignals(1)[0].aspect === 'Y', '#f2c230', lx + 26, lampY + 22);
  // clock + timetable
  const cxm = lx, cym = lampY + 36;
  txt(g, DH.fmtTime(run.clock), cxm, cym, '#9ef0c0', { scale: 1 });
  if (run.leg) { const dlt = run.t - run.leg.arr; txt(g, (dlt >= 0 ? '+' : '-') + Math.abs(Math.round(dlt)) + 's due ' + DH.fmtClock(run.tod + run.leg.arr), cxm, cym + 9, Math.abs(dlt) <= 2 ? '#9ef0c0' : dlt > 0 ? '#ffb090' : '#9fc8ff', { font: 'tiny' }); }
  // the controller strip, across the dash bottom right; the stop gauge and the cab buttons take the middle
  const cells = NOTCH_CELLS(T), cw = clamp(Math.floor((W - 280) / cells.length), 9, 14), strW = cw * cells.length, sx0 = W - strW - 10, sy0 = y0 + dashH - 40;
  const gx = Math.round(lx + 62), gw = Math.max(96, sx0 - gx - 8), gy = y0 + 8;
  if (run.leg) {
    const d = run.distToMark(), nm = R.stations[run.leg.station].name;
    px.rect(g, gx, gy, gw, 38, '#0c0e13'); px.rect(g, gx + 1, gy + 1, gw - 2, 36, '#12161f');
    txt(g, 'NEXT ' + nm.toUpperCase(), gx + 4, gy + 4, '#c8d2ea', { font: 'tiny' });
    const dd = Math.abs(d) < 10 ? d.toFixed(1) : Math.round(d); txt(g, dd + ' m', gx + 4, gy + 13, d < -.5 ? '#ff7a6a' : Math.abs(d) < 5 ? '#9ef0c0' : '#ffffff', { scale: 2 });
    const bx = gx + 4, bw = gw - 8, by = gy + 31; px.rect(g, bx, by, bw, 3, '#2a3042'); const u = clamp(1 - Math.sqrt(Math.max(0, d) / 500), 0, 1); px.rect(g, bx, by, bw * u, 3, u > .85 ? '#58e07a' : '#4aa0e8'); px.rect(g, bx + bw - 1, by - 2, 2, 7, '#ffd23a');
    const dstop = run.v * run.v / (2 * Math.max(.3, run.T.brake * .8 / 3.6)); const gu = clamp(1 - Math.sqrt(Math.max(0, d - dstop) / 500), 0, 1); px.rect(g, bx + bw * gu - 1, by - 2, 2, 7, d - dstop < 0 ? '#ff4a3a' : '#ffffff');
  } else { px.rect(g, gx, gy, gw, 38, '#0c0e13'); txt(g, run.finished ? 'END OF LINE' : 'ARRIVED', gx + 6, gy + 14, '#9ef0c0', { scale: 2 }); }
  px.rect(g, sx0 - 3, sy0 - 16, strW + 6, 54, '#0c0e13');
  const cur = run.atsMode ? (run.atsMode === 'eb' ? -9 : -8) : run.lever;
  cells.forEach((c, i) => {
    const x = sx0 + i * cw, col = c.l === -9 ? '#a02020' : c.l < 0 ? '#3a5f9a' : c.l === 0 ? '#58606e' : '#3a8a54', on = c.l === cur;
    const b = { x, y: sy0, w: cw - 1, h: 22, notch: c.l }; ui.buttons.push(Object.assign(b, { kind: 'notch' }));
    px.rect(g, x, sy0 + (on ? 0 : 3), cw - 1, on ? 22 : 19, on ? (c.l === -9 ? '#ff4a4a' : c.l < 0 ? '#7ab4ff' : c.l === 0 ? '#e8ecf4' : '#78f0a0') : (hit(b) ? E.shade(col, .3) : col));
    txt(g, c.t, x + (cw - 1) / 2, sy0 + 8, on ? '#10131a' : '#d6dcec', { font: 'tiny', align: 'center', shadow: null });
  });
  { const i = cells.findIndex(c => c.l === cur), hx = sx0 + i * cw + (cw - 1) / 2; px.rect(g, sx0, sy0 - 8, strW, 3, '#1f2430'); px.poly(g, [[hx - 5, sy0 - 15], [hx + 5, sy0 - 15], [hx + 5, sy0 - 9], [hx, sy0 - 4], [hx - 5, sy0 - 9]], run.atsMode ? '#ffc020' : '#e8ecf4'); px.rect(g, hx - 3, sy0 - 15, 6, 2, '#9aa2b6'); }
  txt(g, 'BRAKE', sx0, sy0 + 24, '#7ab4ff', { font: 'tiny' }); txt(g, 'POWER', sx0 + strW, sy0 + 24, '#78f0a0', { font: 'tiny', align: 'right' });
  txt(g, run.atsMode ? 'ATS BRAKE' : run.canDepart || run.phase === 'run' ? '' : 'DOORS OPEN', sx0 + strW / 2, sy0 + 24, '#ffc020', { font: 'tiny', align: 'center' });
  px.rect(g, sx0, sy0 + 33, strW, 3, '#2a2f3c'); px.rect(g, sx0, sy0 + 33, strW * clamp(run.brakeEff / (T.brake * 1.1), 0, 1), 3, '#7ab4ff');
  // buttons for the mouse: horn, ATS, EB, N, camera
  const bw5 = Math.floor((gw - 4) / 5), byy = gy + 42;
  const btn = (id, label, i, col, down) => { const x = gx + i * (bw5 + 1), b = { x, y: byy, w: bw5, h: 12, kind: id }; ui.buttons.push(b); px.rect(g, x, byy, bw5, 12, hit(b) ? E.shade(col, .25) : col); px.rect(g, x, byy + 10, bw5, 2, '#0006'); if (down) px.rect(g, x, byy, bw5, 12, '#ffffff55'); txt(g, label, x + bw5 / 2, byy + 3, '#fff', { font: 'tiny', align: 'center', shadow: null }); };
  btn('horn', 'HORN', 0, '#2a62c8', ui.hornDown); btn('ats', 'ATS', 1, '#a87a10', false); btn('eb', 'EB', 2, '#b02020', false); btn('neutral', 'N', 3, '#4a5568', false); btn('view', 'CAM', 4, '#3a4560', false);
  // top HUD
  const ca = E.current.cornerArea && E.current.cornerArea(), topR = ca && ca.y0 < 30 ? ca.x0 - 4 : W - 4;
  // halo time
  const hw = 92; px.rect(g, 6, 5, hw + 4, 18, '#0b0e16c0');
  haloIcon(g, 15, 14, 6); const hp = clamp(run.halo / run.haloMax, 0, 1); px.rect(g, 26, 8, hw - 24, 5, '#2a3042'); px.rect(g, 26, 8, (hw - 24) * hp, 5, hp > .5 ? '#ffd23a' : hp > .25 ? '#ff9a3a' : '#ff4a3a');
  txt(g, 'HALO TIME ' + Math.ceil(run.halo), 26, 15, '#fff6d0', { font: 'tiny' });
  txt(g, String(Math.round(run.score)).padStart(6, '0'), 6, 26, '#fff', { shadow: '#000' });
  // next signal / limit
  const ns = run.nextSignals(1)[0], rx = topR;
  px.rect(g, rx - 74, 5, 74, 22, '#0b0e16c0');
  px.disc(g, rx - 62, 16, 8, '#f4f4f0'); px.disc(g, rx - 62, 16, 7, kmh > lim + run.tune.limitTol ? '#ff4a3a' : '#d02a2a'); px.disc(g, rx - 62, 16, 5, '#f8f8f4'); txt(g, String(lim), rx - 62, 13, '#222', { font: 'tiny', align: 'center', shadow: null });
  if (ns) { const c = ns.aspect === 'G' ? '#25d36a' : ns.aspect === 'Y' ? '#f2c230' : '#f23a2a'; px.disc(g, rx - 38, 16, 5, c); txt(g, Math.max(0, Math.round(ns.dist)) + 'm', rx - 29, 13, '#fff', { font: 'tiny' }); }
  const w = DH.WEATHER[ui.weather]; txt(g, DH.fmtClock(run.clock) + ' ' + (w ? w.name : ''), rx - 4, 31, '#d6dcec', { font: 'tiny', align: 'right' });
  // the call bracket
  if (run.callOpen && ui.callScreen) {
    const c = run.callOpen, bx = ui.callScreen[0], by = ui.callScreen[1], s = 10 + (1 - clamp(c.dist / c.win, 0, 1)) * 6, bl = Math.floor(ui.time * 6) % 2;
    const col = bl ? '#ffe24a' : '#ffffff'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.line(g, bx + dx * s, by + dy * s, bx + dx * (s - 5), by + dy * s, col); px.line(g, bx + dx * s, by + dy * s, bx + dx * s, by + dy * (s - 5), col); }
    txt(g, c.text.replace(/,.*/, ''), bx, by - s - 9, col, { font: 'tiny', align: 'center' });
  }
  if (run.atsRing) { txt(g, 'ATS  ' + (run.atsReason || ''), W / 2, 34, blink ? '#ffc020' : '#fff', { scale: 1 }); DH.promptLine(g, [['ats', 'CONFIRM']], W / 2, 52, 'center'); }
  // toasts: small ones stack down the left, big ones sit mid-screen
  let ty = 38, by2 = 96; for (const t of ui.toasts) { const a = clamp(Math.min(t.life * 3, 1), 0, 1); if (a <= 0) continue; if (t.big) { txt(g, t.text, W / 2, by2, t.color || '#ffffff', { align: 'center', scale: 2 }); by2 += 18; } else { px.rect(g, 4, ty - 2, E.font.width(t.text, { font: 'tiny' }) + 6, 9, '#000a'); txt(g, t.text, 7, ty, t.color || '#ffffff', { font: 'tiny' }); ty += 10; } }
  // judgment
  if (ui.judge && ui.judge.life > 0) { const j = ui.judge, y = 22 - (1 - clamp(j.life, 0, 1)) * 6, c = j.grade === 'PERFECT' ? ['#fff6c0', '#ffd23a', '#ff9a1a'] : j.grade === 'GREAT' ? ['#e8f6ff', '#6ab8ff', '#2a78e8'] : j.grade === 'GOOD' || j.grade === 'OK' ? ['#f2ffe8', '#9ae06a', '#4aa028'] : ['#ffe0e0', '#ff6a6a', '#c82a2a']; E.font.title(g, j.grade + '!', W / 2 - 40, y, { align: 'center', scale: 3, colors: c, depth: 2 }); txt(g, (j.e > 0 ? '+' : '') + (j.e * 100).toFixed(0) + ' cm   ' + j.timeGrade + '   ' + j.smooth, W / 2 - 40, y + 28, '#ffffff', { align: 'center' }); }
  // subtitles, wrapped
  if (ui.sub && ui.subOn) { const s = ui.sub, full = s.who + ': ' + s.text, cpl = Math.max(30, Math.floor((W - 60) / 4)), ls = DH.wrapText(full, cpl), hh = ls.length * 8 + 4, w = (ui._subTop = y0 - 8 - hh, Math.min(W - 40, Math.max(...ls.map(l => E.font.width(l, { font: 'tiny' }))) + 12)); px.rect(g, W / 2 - w / 2, y0 - 8 - hh, w, hh, '#000b'); ls.forEach((l, k) => { if (k === 0) { txt(g, s.who + ':', W / 2 - w / 2 + 5, y0 - 6 - hh, s.col || '#ffd36a', { font: 'tiny' }); txt(g, l.slice(s.who.length + 1), W / 2 - w / 2 + 5 + E.font.width(s.who + ':', { font: 'tiny' }), y0 - 6 - hh, '#fff', { font: 'tiny' }); } else txt(g, l, W / 2 - w / 2 + 5, y0 - 6 - hh + k * 8, '#fff', { font: 'tiny' }); }); }
  { const py = (ui.sub && ui.subOn ? ui._subTop : y0 - 6) - 7;
    if (run.callOpen) DH.promptLine(g, [['call', 'POINT & CALL']], W / 2, py, 'center');
    else if (run.phase === 'dwell' && run.canDepart && !run.finalStop) DH.promptLine(g, [['power', 'DEPART'], ['up', 'LEVER']], W / 2, py, 'center'); }
  ui.y0 = y0;
};
function haloIcon(g, x, y, r) { px.disc(g, x, y, r, '#8a6a10'); px.disc(g, x, y, r - 1, '#ffd23a'); px.disc(g, x, y, r - 3, '#0b0e16'); px.disc(g, x - 2, y - 2, 1, '#fff6d0'); }
DH.haloIcon = haloIcon;

/* ---------- Stop Cam: a side view of the stop, replayed from the recorded trace ---------- */
DH.drawStopCam = function (g, x, y, w, h, rec, T, p) {
  px.rect(g, x - 1, y - 1, w + 2, h + 2, '#ffd23a'); px.rect(g, x, y, w, h, '#a8d4f0'); px.rect(g, x, y + h * .35, w, h * .65, '#7c8896');
  const gy = y + h - 16, ppm = 3.4, trace = rec.trace && rec.trace.length ? rec.trace : [[0, 0, 0]]; const mark = trace[trace.length - 1][1] - rec.e * -1 * -1 * 0;
  const sMark = trace[trace.length - 1][1] + (-rec.e) * 0 - rec.e * 1; // marker position: final front minus overrun
  const mk = trace[trace.length - 1][1] - rec.e;
  const i = Math.min(trace.length - 1, Math.floor(clamp(p, 0, 1) * (trace.length - 1))), sF = trace[i][1];
  const cxm = x + w * .62; const X = s => cxm + (s - mk) * ppm;
  px.rect(g, x, gy + 1, w, 15, '#555f6e'); px.rect(g, x, gy + 11, w, 5, '#3a4250');
  px.rect(g, x + w * .06, gy - 5, w * .88, 5, '#b8bec6'); px.rect(g, x + w * .06, gy - 6, w * .88, 1, '#f0f0f0');
  px.rect(g, X(mk) - 1, gy - 22, 2, 22, '#ffd23a'); px.rect(g, X(mk) - 6, gy - 26, 12, 6, '#f0c428'); txt(g, '6', X(mk), gy - 25, '#222', { font: 'tiny', align: 'center', shadow: null });
  const len = T.len * 0.6, front = X(sF), x0 = front - len * ppm * .5;
  px.rect(g, Math.max(x, front - len * ppm * .5), gy - 21, Math.min(len * ppm * .5, front - x), 17, T.body); px.rect(g, Math.max(x, front - len * ppm * .5), gy - 14, Math.min(len * ppm * .5, front - x), 2, T.stripe);
  for (let q = 0; q < 6; q++) { const wx = front - 6 - q * 17; if (wx > x) px.rect(g, wx, gy - 19, 9, 5, '#2a3a4a'); }
  px.rect(g, front - 2, gy - 21, 2, 17, '#2a3a4a'); px.disc(g, Math.max(x + 4, front - 12), gy - 2, 3, '#222'); px.disc(g, Math.max(x + 4, front - 40), gy - 2, 3, '#222');
  txt(g, 'STOP CAM', x + 3, y + 3, '#10131a', { font: 'tiny', shadow: null });
  px.rect(g, x + 3, y + 11, 0, 0, '#000'); txt(g, (rec.e > 0 ? '+' : '') + (rec.e * 100).toFixed(0) + ' cm', x + w - 3, y + 3, rec.grade === 'PERFECT' ? '#c05a00' : '#10131a', { font: 'tiny', align: 'right', shadow: null });
};
})();
