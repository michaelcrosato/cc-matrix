/* THUGBY TURBO — input presets, device → intent, glyphs. */
const KEYS = Object.assign({}, E.Input.DEFAULT);
['attack', 'dash', 'skill', 'jump'].forEach(k => delete KEYS[k]);
// order matters for the two-player half keyboard: buttons are handed out in this order
Object.assign(KEYS, { x: ['Space', 'Pad0'], sq: ['KeyF', 'Pad2'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad6'], ci: ['KeyC', 'Pad1'], tri: ['KeyR', 'Pad3'], l1: ['KeyQ', 'Pad4'], r1: ['KeyE', 'Pad5'], click: ['Mouse0'], rclick: ['Mouse2'], cam: ['KeyV', 'Pad11'] });
TT.KEYS = KEYS;
const CAM_VIEWS = ['broadcast', 'threequarter', 'topdown'];
let toggleTurbo = [false, false, false, false];

function readIntent(inp, seat) {
  const game = TT.game, I = emptyIntent();
  const m = inp.move(), len = Math.min(1, Math.hypot(m[0], m[1]));
  if (len > .02) { const d = game.view.screenDirToGround(m[0], m[1]), dl = Math.hypot(d[0], d[1]) || 1; I.mx = d[0] / dl * len; I.my = d[1] / dl * len; }
  I.turbo = inp.down('turbo'); if (!TT.settings.holdTurbo) { if (inp.pressed('turbo')) toggleTurbo[seat] = !toggleTurbo[seat]; I.turbo = toggleTurbo[seat]; }
  for (const k of ['x', 'sq', 'ci', 'tri', 'l1', 'r1']) { I[k] = inp.pressed(k); I['h' + k] = inp.down(k); I['r' + k] = inp.released(k); }
  if (inp.pressed('cam')) { const i = CAM_VIEWS.indexOf(game.view.id); const n = CAM_VIEWS[(i + 1) % CAM_VIEWS.length]; game.setView(n); TT.settings.cam = n; game.note('CAMERA: ' + n.toUpperCase(), 1); }
  // mouse (player 1 / keyboard seat only)
  if (inp.lastDevice === 'mouse' || inp.lastDevice === 'keyboard') {
    const mg = game.mouseGround && game.mouseGround();
    if (mg) { const mx = mg.x !== undefined ? mg.x : mg[0], my = mg.y !== undefined ? mg.y : mg[1]; V.mouse = [mx, my];
      let best = -1, bd = 20; const me = S.seats[seat] && S.players[S.seats[seat].pid];
      if (me) for (const q of S.players) if (q.team === me.team && q !== me && alive(q)) { const dd = Math.hypot(q.x - mx, q.y - my); if (dd < bd) { bd = dd; best = q.id; } }
      if (seat === 0) { V.hover = best; V.hoverLegal = best >= 0 && me && (S.players[best].x - me.x) * S.dir[me.team] <= 4; }
      if (inp.pressed('click') && best >= 0) I.click = best;
      if (inp.down('rclick')) { I.aim = [mx, my]; I.hci = true; }
      if (inp.released('rclick')) { I.aim = [mx, my]; I.rci = true; }
    }
  }
  return I;
}

// ---------- glyph badges (drawn with pixels: the pixel font has no ✕ ○ □ △)
const PSCOL = { x: '#6a9cf0', ci: '#f05a64', sq: '#e07ac8', tri: '#4ad0a0' }, XBCOL = { x: '#5ac85a', ci: '#e8503a', sq: '#3a86e8', tri: '#f0c830' }, XBL = { x: 'A', ci: 'B', sq: 'X', tri: 'Y' };
const ACT_ALIAS = { confirm: 'x', back: 'ci', pause: 'opt', start: 'opt' };
function glyph(g, act, x, y, inp, o = {}) {
  inp = inp || TT.game.input; const sc = o.scale || 1, dev = inp.lastDevice || 'keyboard', a = ACT_ALIAS[act] || act;
  if (dev === 'gamepad') {
    const xb = TT.settings.glyphs === 'xbox', R = 5 * sc;
    if (['x', 'ci', 'sq', 'tri'].includes(a)) {
      const c = (xb ? XBCOL : PSCOL)[a], cx = x + R, cy = y + R;
      px.disc(g, cx, cy, R, '#101018'); px.disc(g, cx, cy, R - 1, '#202030');
      if (xb) E.font.text(g, XBL[a], cx, cy - 3, c, { align: 'center' });
      else if (a === 'x') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, c, 1); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, c, 1); }
      else if (a === 'ci') { px.ell && px.ell(g, cx, cy, 3, 3, c); px.disc(g, cx, cy, 3, c); px.disc(g, cx, cy, 1.5, '#202030'); }
      else if (a === 'sq') { px.rect(g, cx - 2, cy - 2, 5, 5, c); px.rect(g, cx - 1, cy - 1, 3, 3, '#202030'); }
      else { px.poly(g, [[cx, cy - 3], [cx + 3, cy + 2], [cx - 3, cy + 2]], c); px.poly(g, [[cx, cy - 1], [cx + 1, cy + 1], [cx - 1, cy + 1]], '#202030'); }
      return R * 2 + 2;
    }
    const lab = { l1: xb ? 'LB' : 'L1', r1: xb ? 'RB' : 'R1', turbo: xb ? 'RT' : 'R2', opt: xb ? 'MENU' : 'OPT', cam: 'R3', tri: '' }[a] || a.toUpperCase();
    const w = E.font.width(lab) + 6; px.rect(g, x, y, w, 10, '#101018'); px.rect(g, x + 1, y + 1, w - 2, 8, '#34384c'); E.font.text(g, lab, x + 3, y + 2, '#ffffff'); return w + 2;
  }
  // keyboard / mouse
  let lab = inp.label(a === 'opt' ? 'pause' : a) || a.toUpperCase();
  if (a === 'click') lab = dev === 'mouse' ? 'LMB' : 'CLICK'; if (a === 'rclick') lab = 'RMB';
  lab = lab.replace('Left click', 'LMB').replace('Right click', 'RMB').replace('Shift', 'SHIFT').replace('Space', 'SPACE');
  const w = Math.max(10, E.font.width(lab) + 6); px.rect(g, x, y + 1, w, 10, '#101018'); px.rect(g, x, y, w, 10, '#d8d8e0'); px.rect(g, x + 1, y + 1, w - 2, 7, '#f4f4f8'); E.font.text(g, lab, x + w / 2, y + 2, '#202030', { align: 'center' });
  return w + 2;
}
// text with {x} style glyph markup; returns total width. align 'center' supported via two passes
function prompt(g, str, x, y, inp, o = {}) {
  const parts = str.split(/(\{[a-z0-9]+\})/).filter(s => s); const col = o.color || '#ffffff';
  const wOf = () => parts.reduce((w, p) => w + (p[0] === '{' ? 12 : E.font.width(p)) , 0);
  let cx = o.align === 'center' ? x - Math.round(parts.reduce((w, p) => w + (p[0] === '{' ? (inp && inp.lastDevice === 'keyboard' ? 22 : 12) : E.font.width(p)), 0) / 2) : x;
  for (const p of parts) { if (p[0] === '{') cx += glyph(g, p.slice(1, -1), cx, y - 2, inp, o); else { E.font.text(g, p, cx, y, col, { shadow: '#000', outline: false }); cx += E.font.width(p); } }
  return cx - x;
}
TT.glyph = glyph; TT.prompt = prompt;
