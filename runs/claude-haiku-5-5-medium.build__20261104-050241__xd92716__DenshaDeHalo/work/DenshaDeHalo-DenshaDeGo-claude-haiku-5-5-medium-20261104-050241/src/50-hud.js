/* Densha de Halo! · 50-hud: the cab, the dashboard, the HUD, the prompt badges and the judgments, drawn in screen pixels
 * over the rail view (sections 4.14 and 4.15). Everything reads a sim snapshot; nothing here changes the game. */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;
const { px, font } = E;

/* ---- prompt badges (section 4.15): PlayStation shapes or Xbox letters, a keycap for keys, a mouse for the mouse ---- */
const PS = { Pad0: ['x', '#5a8ce0'], Pad1: ['o', '#e05a5a'], Pad2: ['sq', '#d070c0'], Pad3: ['tri', '#58c08a'] };
const XB = { Pad0: ['A', '#4caf50'], Pad1: ['B', '#e53935'], Pad2: ['X', '#2f6fd6'], Pad3: ['Y', '#f2c230'] };
DH.Glyph = {
  /** the text a prompt shows for an action on the device last used (keys and buttons as the player bound them) */
  text(game, action) { return game.input.label(action); },
  /** draw a badge for an action at (x, y), size s pixels */
  draw(g, game, action, x, y, s = 7) {
    const dev = game.input.lastDevice, fam = game.settings && game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation';
    const code = DH.Glyph.codeOf(game, action);
    if (dev === 'gamepad' && code && code.startsWith('Pad')) {
      const b = (fam === 'xbox' ? XB : PS)[code];
      if (b && fam === 'xbox') { px.disc(g, x, y, s, b[1]); E.font.text(g, b[0], x, y - 3, '#ffffff', { align: 'center', scale: 1 }); return s * 2 + 2; }
      if (b) {   // the PlayStation symbols, drawn as shapes (the font has no such glyphs)
        px.disc(g, x, y, s, b[1]); const w = '#ffffff', r = s * .42;
        if (code === 'Pad0') { px.line(g, x - r, y - r, x + r, y + r, w, 1); px.line(g, x + r, y - r, x - r, y + r, w, 1); }
        else if (code === 'Pad1') { px.disc(g, x, y, r, w); px.disc(g, x, y, r * .6, b[1]); }
        else if (code === 'Pad2') { px.line(g, x - r, y - r, x + r, y - r, w, 1); px.line(g, x + r, y - r, x + r, y + r, w, 1); px.line(g, x + r, y + r, x - r, y + r, w, 1); px.line(g, x - r, y + r, x - r, y - r, w, 1); }
        else { px.line(g, x, y - r, x + r, y + r, w, 1); px.line(g, x + r, y + r, x - r, y + r, w, 1); px.line(g, x - r, y + r, x, y - r, w, 1); }
        return s * 2 + 2;
      }
      const pill = DH.Glyph.pill(code);
      E.ui.box(g, x - 4, y - 4, 20, 9, { bg: '#2a2a33', border: '#8a8a98' });
      E.font.text(g, pill, x + 6, y - 3, '#ffffff', { align: 'center', scale: 1 });
      return 24;
    }
    if (dev === 'mouse' || code === 'Mouse0') {
      E.ui.box(g, x - 4, y - 6, 9, 13, { bg: '#2a2a33', border: '#c8c8d8' });
      px.rect(g, x - 4, y + 1, 4, 6, '#8a8a98');
      return 12;
    }
    const label = game.input.label(action, 'keyboard').toUpperCase().slice(0, 7);
    const w = Math.max(9, label.length * 6 + 4);
    E.ui.box(g, x - 2, y - 4, w, 11, { bg: '#2e2c3a', border: '#b8b4c8' });
    E.font.text(g, label, x + w / 2 - 2, y - 2, '#ffffff', { align: 'center', scale: 1 });
    return w + 4;
  },
  /** the pill name for a shoulder or trigger */
  pill(code) {
    return ({ Pad4: 'L1', Pad5: 'R1', Pad6: 'L2', Pad7: 'R2', Pad8: 'SEL', Pad9: 'OPT', Pad10: 'L3', Pad11: 'R3', Pad12: 'UP', Pad13: 'DN', Pad14: 'LT', Pad15: 'RT' })[code] || code;
  },
  /** the code bound to an action (the first one), for a badge */
  codeOf(game, action) {
    const map = game.input.map || game.input.bindings || null;
    const list = map && map[action];
    if (Array.isArray(list)) return list.find(c => c.startsWith('Pad') && !c.startsWith('PadAxis')) || list[0];
    return null;
  }
};

/* ---- the cab and HUD ---- */
const C = {
  dash: '#17141f', dashHi: '#2c2740', panel: '#0e0c16', ink: '#f2efe6', gold: '#f2c230', sky: '#3aa0e0',
  power: '#48a8ff', brake: '#ff9a3a', red: '#ff4a3a', green: '#5ad46a', white: '#ffffff', dim: '#8a8698'
};
DH.Cab = C;

/** the cab (bottom 30% of the screen): the dash, the speed needle, the notch display, the lever, the buttons */
DH.drawCab = (r, g, game, snap, ui) => {
  const W = r.W, H = r.H, top = Math.round(H * 0.70), k = Math.min(W, H * 1.8) / 427;
  // the windshield frame: pillars and the header's shadow
  px.rect(g, 0, 0, Math.round(W * .03), H, '#0a0912'); px.rect(g, W - Math.round(W * .03), 0, Math.round(W * .03), H, '#0a0912');
  px.rect(g, 0, 0, W, Math.round(H * .04), '#0a0912');
  // the dash
  const classic = snap.cab === 'classic';   // the HALO 3000: a green panel, two handles and cream gauges (section 5.2)
  px.rect(g, 0, top, W, H - top, classic ? '#1a2c20' : C.dash);
  px.rect(g, 0, top, W, 2, C.dashHi);
  // the timetable card (left)
  const cardW = Math.round(W * .22), cx = Math.round(W * .04), cy = top + 8;
  E.ui.box(g, cx, cy, cardW, H - cy - 6, { bg: '#1c1a28', border: '#4a4560' });
  const st = ui.nextStop;
  E.font.text(g, 'TIMETABLE', cx + 6, cy + 5, C.gold, { scale: 1 });
  const rows = ui.timetable || [];
  rows.slice(0, 4).forEach((row, i) => {
    const y = cy + 16 + i * 10, hi = row.next;
    if (hi) px.rect(g, cx + 2, y - 1, cardW - 4, 9, '#3a3450');
    E.font.text(g, row.name.slice(0, 10), cx + 5, y, hi ? C.white : C.dim, { scale: 1 });
    E.font.text(g, row.arr || row.pass || '', cx + cardW - 4, y, hi ? C.gold : C.dim, { scale: 1, align: 'right' });
  });
  // the pocket watch (under the card): the clock and its second hand
  // the speedometer (centre-left): an analog dial and a digital readout
  const spX = Math.round(W * .36), spY = top + Math.round((H - top) * .47), R = Math.round((H - top) * .40);
  px.disc(g, spX, spY, R + 2, '#050409'); px.disc(g, spX, spY, R, '#1e1b2c');
  for (let v = 0; v <= 120; v += 10) {
    const a = (-225 + v * 270 / 120) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const major = v % 20 === 0, r0 = R * (major ? .72 : .84), r1 = R * .94;
    px.line(g, spX + c * r0, spY + s * r0, spX + c * r1, spY + s * r1, major ? C.ink : C.dim, 1);
    if (major) E.font.text(g, String(v), spX + c * R * .56, spY + s * R * .56 - 3, C.dim, { align: 'center', scale: 1 });
  }
  const lim = snap.limit, limA = (-225 + lim * 270 / 120) * Math.PI / 180;
  px.line(g, spX + Math.cos(limA) * R * .66, spY + Math.sin(limA) * R * .66, spX + Math.cos(limA) * R * .96, spY + Math.sin(limA) * R * .96, C.red, 2);
  const needA = (-225 + Math.min(120, Math.max(0, snap.v)) * 270 / 120) * Math.PI / 180;
  px.line(g, spX, spY, spX + Math.cos(needA) * R * .9, spY + Math.sin(needA) * R * .9, '#ff5a40', 2);
  px.disc(g, spX, spY, 2, C.ink);
  E.font.text(g, String(Math.round(snap.v)), spX, spY + R * .42, C.white, { align: 'center', scale: 2 });
  E.font.text(g, 'KM/H', spX, spY + R * .42 + 14, C.dim, { align: 'center', scale: 1 });
  // the ATS lamps, the pilot lamp, the slip lamp, the door arrows
  const lampY = top + 8, lamps = [['ATS', ui.atsRing ? C.red : (ui.atsOn ? C.gold : '#3a3450')], ['PILOT', snap.pilot ? '#ffb040' : '#3a3450'], ['SLIP', snap.slip ? C.red : '#3a3450'], ['DOORS', snap.doors ? C.green : '#3a3450']];
  lamps.forEach(([t, col], i) => { const x = Math.round(W * .47) + i * Math.round(W * .085); px.disc(g, x, lampY, 3, col); E.font.text(g, t, x + 5, lampY - 3, C.dim, { scale: 1 }); });
  // the notch display (big) and the 15-cell strip
  const nX = Math.round(W * .60), nY = top + 26;
  E.font.text(g, 'NOTCH', nX, top + 14, C.dim, { scale: 1 });
  const nm = snap.notch;
  const nCol = nm.startsWith('P') ? C.power : nm.startsWith('B') ? C.brake : nm === 'EB' ? C.red : C.ink;
  E.font.text(g, nm, nX, nY, nCol, { scale: 3, shadow: '#000' });
  const cw = Math.round(W * .014), cellsX = nX;
  const total = 14, lev = snap.eb ? -8 : snap.notchNum;   // the 14 cells run B8 .. P5
  if (classic) DH.drawClassicLevers(g, cellsX, top, snap);
  else for (let i = 0; i < total; i++) {
    const val = i - 8;                                             // -8 .. +5
    const on = (val === lev) || (snap.eb && i === 0);
    const col = val > 0 ? C.power : val < 0 ? C.brake : C.ink;
    px.rect(g, cellsX + i * (cw + 1), top + 58, cw, 8, on ? (snap.eb ? C.red : col) : '#2a2638');
  }
  if (!classic) { E.font.text(g, 'B8', cellsX, top + 68, C.dim, { scale: 1 }); E.font.text(g, 'P5', cellsX + 13 * (cw + 1), top + 68, C.dim, { scale: 1 }); }
  // the EB and horn and ATS buttons (right)
  const bX = Math.round(W * .80), bY = top + Math.round((H - top) * .48);
  const btn = (x, y, col, label, pressed) => { px.disc(g, x, y, Math.round(H * .045), pressed ? '#ffffff' : col); px.disc(g, x, y, Math.round(H * .045) - 2, pressed ? col : '#20203a'); E.font.text(g, label, x, y - 3, pressed ? '#101018' : C.ink, { align: 'center', scale: 1 }); };
  btn(bX, bY, '#e04030', 'EB', ui.ebPressed);
  btn(bX + Math.round(W * .07), bY, '#ffd23a', 'ATS', ui.atsPressed);
  btn(bX + Math.round(W * .14), bY, '#8ab0e0', 'HORN', snap.hornOn);
  // the stop gauge, the braking guide and the metre readout, above the dash
  const sgW = Math.round(W * .5), sgX = Math.round((W - sgW) / 2), sgY = top - Math.round(H * .085);
  DH.drawStopGauge(r, g, sgX, sgY, sgW, snap, ui);
  // the subtitles
  if (ui.subtitle) {
    const sW = Math.round(W * .66), sX = Math.round((W - sW) / 2), sY = top - Math.round(H * .04);
    E.ui.box(g, sX, sY, sW, Math.round(H * .045) + 2, { bg: '#080612', border: '#5a5470', alpha: .85 });
    E.font.text(g, ui.subtitle.who.toUpperCase(), sX + 6, sY + 4, C.gold, { scale: 1 });
    E.font.text(g, ui.subtitle.text, sX + 6, sY + 13, C.ink, { scale: 1, wrap: sW - 12 });
  }
  return { top, speed: { x: spX, y: spY, R } };
};

/** the HALO 3000's two handles: the brake (orange, B1..B7) and the power (blue, P1..P4), each a bar that fills with its notch */
DH.drawClassicLevers = (g, x, top, snap) => {
  const n = snap.notchNum, pw = Math.max(0, n), br = Math.max(0, -n), y0 = top + 60;
  for (let k = 0; k < 2; k++) {
    const hx = x + k * 46, isP = k === 0, lvl = isP ? pw : br, max = isP ? 4 : 7;
    E.font.text(g, isP ? 'POWER' : 'BRAKE', hx, top + 48, C.dim, { scale: 1 });
    px.rect(g, hx, y0, 12, 40, '#0c140e');
    px.rect(g, hx + 3, y0 + 40 - lvl * 40 / max, 6, lvl * 40 / max, isP ? C.power : C.brake);
    E.font.text(g, (isP ? 'P' : 'B') + lvl, hx + 16, y0 + 16, C.ink, { scale: 1 });
  }
};

/** the stop gauge: a horizontal bar from 600 m to the mark, the train's nose, the metres to go, and the braking guide */
DH.drawStopGauge = (r, g, x, y, w, snap, ui) => {
  if (!snap.nextStop || snap.nextStop.dist > 600 || snap.nextStop.dist < -60) return;
  const d = snap.nextStop.dist, far = d > 30, span = far ? 600 : 2;
  const rem = DH.clamp(d, -2, span);
  E.ui.box(g, x - 6, y - 6, w + 12, 30, { bg: '#0a0912', border: '#4a4560', alpha: .8 });
  px.rect(g, x, y + 10, w, 4, '#2a2638');
  const markX = x + w * (1 - (Math.max(0, rem) / span));
  if (ui.guide && far) {   // the braking guide: where the B4 brake must begin
    const v = snap.v / 3.6, aB = 0.55;
    const dStart = (v * v) / (2 * aB) + v * 0.7;
    const gx = x + w * (1 - DH.clamp(dStart, 0, span) / span);
    px.rect(g, gx, y + 8, Math.max(2, x + w - gx), 8, '#7a5a1a');
  }
  px.rect(g, markX - 1, y + 5, 3, 12, C.green);
  E.font.text(g, far ? 'MARK' : 'MARK', x, y - 4, C.dim, { scale: 1 });
  const readout = d > 999 ? (d / 1000).toFixed(2) + ' km' : (d >= 0 ? d.toFixed(1) : '-' + Math.abs(d).toFixed(1)) + ' m';
  E.font.text(g, readout, x + w, y - 4, C.white, { align: 'right', scale: 2 });
  // the train's nose (its front on the bar)
};

/** the HUD over the top of the screen: the halo ring, the station line, the clock and the limits, the judgments */
DH.drawHud = (r, g, game, snap, ui) => {
  const W = r.W, H = r.H, m = Math.round(W * .03);
  // Halo Time ring (top-left): a gold ring filling clockwise as a share of 99, with the seconds and HALO
  const ringR = Math.round(Math.min(W, H) * .075), rx = m + ringR + 4, ry = m + ringR + 4;
  px.disc(g, rx, ry, ringR + 3, '#15121f');
  const frac = DH.clamp(snap.halo / 99, 0, 1);
  const segs = 48;
  for (let i = 0; i < segs; i++) {
    const a0 = -Math.PI / 2 + i / segs * Math.PI * 2, a1 = a0 + Math.PI * 2 / segs * .85;
    if (i / segs <= frac) px.line(g, rx + Math.cos(a0) * ringR, ry + Math.sin(a0) * ringR, rx + Math.cos(a1) * ringR, ry + Math.sin(a1) * ringR, snap.halo <= 10 && Math.floor(game.time * 4) % 2 ? C.red : C.gold, 2);
  }
  px.disc(g, rx, ry, ringR - 3, '#0c0a14');
  E.font.text(g, String(Math.max(0, Math.ceil(snap.halo))), rx, ry - 8, snap.halo <= 10 ? C.red : C.white, { align: 'center', scale: 2, shadow: '#000' });
  E.font.text(g, 'HALO', rx, ry + 6, C.gold, { align: 'center', scale: 1 });
  // the next station (top centre)
  if (ui.nextName) {
    const cx = Math.round(W / 2);
    E.font.text(g, 'NEXT  ' + ui.nextName, cx, m, C.white, { align: 'center', scale: 2, shadow: '#000' });
    const line2 = snap.nextStop ? ((snap.nextStop.dist / 1000).toFixed(2) + ' km' + (snap.nextStop.arr ? '  ARR ' + snap.nextStop.arr : '  PASS')) : '';
    E.font.text(g, line2, cx, m + 17, C.dim, { align: 'center', scale: 1 });
  }
  // top right: the clock, the limit plate, the next signal
  const rx2 = W - m;
  E.font.text(g, snap.clock.slice(0, 5), rx2, m, C.white, { align: 'right', scale: 2, shadow: '#000' });
  const plateW = 26, pX = rx2 - plateW, pY = m + 22;
  E.ui.box(g, pX - 2, pY - 2, plateW + 4, 16, { bg: '#ffffff', border: '#c8c8c8', gradient: false });
  E.font.text(g, String(snap.limit), pX + plateW / 2, pY + 2, '#101010', { align: 'center', scale: 2 });
  if (ui.nextLimit) E.font.text(g, '▸' + ui.nextLimit.v + ' IN ' + ui.nextLimit.dist + ' M', rx2, pY + 22, C.dim, { align: 'right', scale: 1 });
  const sig = snap.signals.find(s => s.sighted);
  if (sig) {
    const sy = pY + 36, sx = rx2 - 8;
    E.ui.box(g, sx - 14, sy - 3, 16, 22, { bg: '#0a0a10', border: '#505060' });
    const lamps = LAMPS_DRAW[sig.aspect] || [0, 0, 1, 0];
    const cols = ['#ffc83a', '#3ad060', '#ff4a3a', '#ffc83a'];
    lamps.forEach((on, i) => px.disc(g, sx - 6, sy + 1 + i * 5, 2, on ? cols[i] : '#2a2a34'));
    E.font.text(g, sig.aspect, rx2, sy + 2, C.gold, { align: 'right', scale: 1 });
    E.font.text(g, sig.dist + ' M', rx2, sy + 11, C.dim, { align: 'right', scale: 1 });
  }
  // the judgments: a big word at the centre, held a moment
  const j = ui.judgment;
  if (j && game.time - j.at < 1.6) {
    const col = j.col;
    E.font.title(g, j.text, Math.round(W / 2), Math.round(H * .26), { scale: Math.max(2, Math.round(H / 110)), colors: [col, col, '#806020'], align: 'center', outline: '#0a0812' });
    if (j.sub) E.font.text(g, j.sub, Math.round(W / 2), Math.round(H * .26) + Math.round(H / 14), C.ink, { align: 'center', scale: 1 });
  }
  // toasts, under the station line
  (ui.toasts || []).slice(-2).forEach((t, i) => E.font.text(g, t, Math.round(W / 2), m + 30 + i * 9, C.gold, { align: 'center', scale: 1, shadow: '#000' }));
  // the prompts, bottom-left above the dash
  if (ui.call) {
    E.font.text(g, 'CALL ' + ui.call, Math.round(W / 2), Math.round(H * .66), C.white, { align: 'center', scale: 1 });
  }
};
const LAMPS_DRAW = { R: [0, 0, 1, 0], Y: [1, 0, 0, 0], YG: [1, 1, 0, 0], G: [0, 1, 0, 0], YY: [1, 0, 0, 1] };

/** the glove that points at a call target, raised and held (section 4.7) */
DH.drawGlove = (g, x, y, t) => {
  // t in 0..1: raise, hold, back. A white-gloved hand from the bottom of the screen toward (x, y)
  const k = Math.sin(Math.min(1, t) * Math.PI);
  const hx = x + (1 - k) * 0, hy = y + 24 * (1 - k);
  px.disc(g, hx, hy + 6, 6, '#f4f4f4'); px.rect(g, hx - 3, hy + 6, 6, 12, '#f4f4f4');
  px.line(g, hx, hy + 6, x, y, '#f4f4f4', 2); px.disc(g, x, y, 2, '#ffe060');
};

/** the judgment colours (section 4.14) */
DH.judgmentColour = (label) => {
  if (/PERFECT/.test(label)) return '#ffd23a';
  if (/GREAT/.test(label)) return '#5ad8ff';
  if (/GOOD/.test(label)) return '#7ad06a';
  if (/OVERRUN|OVER THE|SIGNAL|LATE|LIMIT|EMERG|MISSED|WRONG|ATS|HAZARD/.test(label)) return '#ff5a4a';
  if (/SHORT/.test(label)) return '#ff9a3a';
  if (/SMOOTH/.test(label)) return '#ff8ad0';
  if (/ON TIME/.test(label)) return '#ffd23a';
  if (/EARLY/.test(label)) return '#9ad0ff';
  return '#ffffff';
};
})();
