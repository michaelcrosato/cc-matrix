// The operation's HUD, anchored to r.W and r.H and kept sparse: the patient is the screen (table 5.1). Drawn in r.overlay.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph, U = G.U, T = G.TUNING;
const HUD = G.HUD = {
  /** V: the scene's view state: { trace, bark, popups, flashSlip, input, t, hintTool, ... } */
  draw(g, r, S, V) {
    const W = r.W, H = r.H, silent = S.silent > 0;
    HUD.monitor(g, S, V, 6, 6);
    // the clock
    const secs = Math.max(0, Math.ceil(S.clock)), mm = String(secs / 60 | 0).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0'), low = S.clock < 30;
    Pix.panel(g, W - 76, 6, 70, 22); Pix.text(g, mm + ':' + ss, W - 41, 10, low && Math.sin(V.t * 8) > 0 ? '#ff7a6a' : '#e8fbf6', { scale: 2, align: 'center' });
    // the objective
    const ph = G.Op.phaseDef(S); if (ph && ph.obj && S.status === 'play') { const cx = (154 + (W - 76)) >> 1, w = E.font.width(ph.obj) + 12, x = Math.round(cx - w / 2); Pix.panel(g, x, 10, w, 13, { alpha: .62 }); Pix.text(g, ph.obj, cx, 13, S.phDone > 0 ? '#9fffc0' : '#e8fbf6', { align: 'center' }); }
    // the speaker and the bark box
    if (V.bark && S.status !== 'code') { HUD.bark(g, W, H, V.bark, S); }
    // Steady gauge and Flow
    HUD.steady(g, S, V, W - 96, H - 22);
    if (S.flow >= 3) Pix.text(g, 'FLOW x' + S.flow, W - 96, H - 33, S.flow >= 12 ? '#ffd36a' : '#bfe6dc');
    if (S.duo) { const other = S.doctor === 'vale' ? 'Dr. Sokolova' : 'Dr. Vale', lw = Glyph.width(V.input, 'consult') + 4, tw = E.font.width(other); Glyph.action(g, V.input, 'consult', W - 96, H - 45); Pix.text(g, other, W - 96 + lw, H - 44, S.prompt === 'consult' && Math.sin(V.t * 8) > 0 ? '#ffd36a' : '#a8c8c0'); }
    // critical
    if (S.vitals < 30 && !silent && S.status === 'play') { if (Math.sin(V.t * 7) > -.2) Pix.text(g, 'CRITICAL', 62, 40, '#ff6a5a', { scale: 2 }); }
    if (S.flags.windowOpen === false && S.flags.retractorPrompt) Pix.text(g, 'HOLD THE RETRACTOR', W / 2, 28, '#ffd36a', { align: 'center' });
    // the tutorial's big prompt
    if (S.tut) HUD.tutorial(g, W, H, S.tut, V);
    else if (S.prompt) HUD.bigPrompt(g, W, H, S.prompt, S, V);
    // tension
    if ((S.tension || 0) > .15) { const f = Math.min(1, S.tension), bw = 80, x = W / 2 - bw / 2, y = H - 18; Pix.panel(g, x - 2, y - 2, bw + 4, 10, { alpha: .7 }); E.ui.bar(g, x, y, bw, 6, f, f > .8 ? '#ff6a5a' : f > .55 ? '#ffc04a' : '#6cf0a0'); Pix.text(g, 'TENSION', W / 2, y - 11, f > .8 ? '#ff6a5a' : '#e8fbf6', { align: 'center' }); }
    // dev tag
    if (V.devTag) Pix.text(g, 'DEV', W / 2, H - 9, '#ffd36a', { align: 'center' });
  },
  monitor(g, S, V, x, y) {
    const w = 148, h = 30; Pix.panel(g, x, y, w, h, { bg: '#031014', alpha: .88 });
    if (S.silent > 0) {   // the hush falls: no number, no trace, no beep
      const seed = (V.t * 30) | 0; for (let i = 0; i < 90; i++) { const a = (i * 73 + seed * 131) % (w - 4), b = (i * 37 + seed * 89) % (h - 4); px.dot(g, x + 2 + a, y + 2 + b, i % 3 ? '#2a4a4a' : '#7a9a9a'); }
      return;
    }
    // the trace
    const tr = V.trace, n = tr.length, ww = 96, ox = x + 3, oy = y + h - 5, col = S.vitals < 30 ? '#ff6a5a' : S.breath ? '#a8e0ff' : '#6cf0a0';
    for (let i = 1; i < n; i++) { const k = (V.traceI + i) % n, k0 = (V.traceI + i - 1) % n; const X0 = ox + (i - 1) * ww / n, X1 = ox + i * ww / n, Y0 = oy - tr[k0] * 19, Y1 = oy - tr[k] * 19; px.line(g, Math.round(X0), Math.round(Y0), Math.round(X1), Math.round(Y1), i > n - 6 ? '#e8fff0' : col); }
    // the number
    const shakeV = S.jitter && !S.breath ? Math.round(Math.sin(V.t * 23) * 3 * S.jitter.amp) : 0, v = Math.ceil(S.vitals) + shakeV, flash = S.vitals < 30 && Math.sin(V.t * 9) < 0;
    Pix.text(g, String(v), x + w - 4, y + 7, flash ? '#ffffff' : col, { scale: 2, align: 'right' });
    px.rect(g, x + w - 44, y + 22, Math.round(40 * S.vitals / 99), 3, col);
  },
  bark(g, W, H, b, S) {
    const theatre = true, y0 = H - 62, cv = G.bust(b.who, { maskUp: b.masked && theatre, expr: b.expr, talk: b.talk ? 1 : 0, blink: b.blink ? 1 : 0 });
    px.rect(g, 3, y0 - 1, 58, 66, '#0a1e22');
    if (g.drawImage && cv) { const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(cv, 28, 16, 56, 62, 4, y0, 56, 62); g.imageSmoothingEnabled = sm; px.reset(g); }
    px.rect(g, 3, y0 - 1, 58, 1, '#2c6a68'); px.rect(g, 60, y0 - 1, 1, 64, '#2c6a68');
    const bw = Math.min(W - 180, 236); Pix.panel(g, 62, H - 34, bw, 28, { alpha: .85 });
    Pix.text(g, G.castName(b.who), 67, H - 31, '#ffd36a'); Pix.text(g, b.text, 67, H - 20, '#ffffff');
  },
  steady(g, S, V, x, y) {
    const f = S.steady / 100, doc = S.doctor, cost = doc === 'sokolova' && !S.noLook ? T.lookCost : T.breathCost, ready = S.status === 'play' && (S.breath || S.steady >= cost) && !(doc === 'sokolova' && !S.noLook && !G.Op.canLook(S));
    Pix.panel(g, x, y, 90, 16); const col = S.breath ? '#a8e0ff' : doc === 'sokolova' ? '#ffb86a' : '#5ff0e0';
    E.ui.bar(g, x + 3, y + 10, 84, 4, f, col); px.rect(g, x + 3 + Math.round(84 * cost / 100), y + 9, 1, 6, '#ffffff');
    const lw = Glyph.action(g, V.input, 'gift', x + 2, y - 1, {}); const name = doc === 'sokolova' && !S.noLook ? 'Second Look' : 'Long Breath';
    Pix.text(g, ready ? 'READY' : name, x + lw + 5, y + 1, ready ? (Math.sin(V.t * 6) > 0 ? '#ffffff' : col) : '#6a8a88');
  },
  tutorial(g, W, H, tut, V) {
    const lines = E.font.wrap(tut.text, Math.min(W - 40, 300)), h = lines.length * 10 + 28, y = 27, x = Math.round(W / 2 - 160);
    Pix.panel(g, x, y, 320, h, { alpha: .92, line: '#ffd36a' });
    Pix.text(g, G.TOOL_NAMES[tut.tool] || '', x + 8, y + 4, '#ffd36a');
    lines.forEach((l, i) => Pix.text(g, l, x + 8, y + 15 + i * 10, '#ffffff'));
    Pix.text(g, 'The clock waits for you.', x + 312, y + 4, '#8fb8b0', { align: 'right' });
    HUD.handPrompt(g, tut.tool, V, x + 8, y + h - 12);
  },
  /** how to reach the tool on this device, drawn as caps */
  handPrompt(g, tool, V, x, y) {
    const I = V.input, i = G.TOOLS.indexOf(tool); let cx = x;
    if (V.localTool !== tool) { if (I.lastDevice === 'gamepad') { const dirs = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']; cx += Glyph.cap(g, 'L', cx, y) + 2; const s = dirs[i]; Pix.text(g, s === '↗' || s === '↘' || s === '↙' || s === '↖' ? ['NE', 'SE', 'SW', 'NW'][['↗', '↘', '↙', '↖'].indexOf(s)] : s, cx, y + 1, '#ffffff'); cx += 16; } else { cx += Glyph.cap(g, String(i + 1), cx, y, { key: true }) + 3; } Pix.text(g, 'then', cx, y + 1, '#8fb8b0'); cx += 24; }
    cx += Glyph.action(g, I, 'useTool', cx, y) + 3;
  },
  bigPrompt(g, W, H, id, S, V) {
    const P = { breath: ['THE STEADY', 'Long Breath: the world slows. Your hands do not.', 'gift'], look: ['THE STEADY', 'Second Look: take back the last six seconds.', 'gift'], consult: ['CONSULT', 'Hand over to the other doctor.', 'consult'] }[id]; if (!P) return;
    const y = 44, h = 34; Pix.panel(g, W / 2 - 150, y, 300, h, { alpha: .92, line: '#a8e0ff' });
    const lw = Glyph.width(V.input, P[2]); Glyph.action(g, V.input, P[2], W / 2 - 142, y + 5);
    Pix.text(g, P[0], W / 2 - 142 + lw + 5, y + 6, Math.sin(V.t * 7) > 0 ? '#ffffff' : '#a8e0ff'); Pix.text(g, P[1], W / 2, y + 20, '#ffffff', { align: 'center' });
  },
  ribbon(g, W, H, V) { const y = H - 10; px.blend(g, .85, 'normal', () => px.rect(g, 0, y, W, 10, '#0a1a20')); Pix.text(g, 'DEMO', 10, y + 1, '#ffd36a'); Pix.text(g, 'Press any button', W - 10, y + 1, Math.sin(V.t * 3) > -.2 ? '#ffffff' : '#7a9a9a', { align: 'right' }); },
  popups(g, list, OX, OY) {
    for (const p of list) { const a = p.t / p.life, y = p.y + OY - (1 - a) * 16, k = p.scale; if (a < .15 && (p.t * 40 | 0) % 2) continue; E.font.text(g, p.text, Math.round(p.x + OX), Math.round(y), p.color, { outline: false, shadow: '#05040a', scale: k, align: 'center' }); }
  },
  /** the prompt beside the cursor, flipping near the edges */
  cursorPrompt(g, r, c, verb, input, OX, OY) {
    if (!verb) return; const lw = Glyph.width(input, 'useTool'), tw = E.font.width(verb), x0 = c.x + OX, y0 = c.y + OY, flip = x0 + 14 + lw + tw + 6 > r.W, x = flip ? x0 - 12 - lw - tw - 6 : x0 + 12, y = Math.max(2, y0 - 18);
    Pix.panel(g, x - 1, y - 1, lw + tw + 6, 12, { alpha: .7 }); Glyph.action(g, input, 'useTool', x, y); Pix.text(g, verb, x + lw + 3, y + 1, '#ffffff');
  },
};
// ------------------------------------------------------------------ the wheel, around the cursor
const R0 = 38;
G.drawWheel = (g, c, x, y, o = {}) => {
  const sel = c.wheelSector >= 0 ? c.wheelSector : G.TOOLS.indexOf(c.tool);
  G.TOOLS.forEach((tool, i) => {
    const a = i / 8 * Math.PI * 2 - Math.PI / 2, tx = Math.round(x + Math.cos(a) * R0 - 11), ty = Math.round(y + Math.sin(a) * R0 * .9 - 11), on = i === sel, hint = o.hint === tool, blink = Math.sin(o.t * 9) > 0;
    px.rect(g, tx, ty, 22, 22, on ? '#e8fbf6' : hint && blink ? '#ffd36a' : '#0a2428'); px.rect(g, tx + 1, ty + 1, 20, 20, on ? '#16504e' : '#0a2428'); if (hint) { px.rect(g, tx - 1, ty - 1, 24, 1, '#ffd36a'); px.rect(g, tx - 1, ty + 22, 24, 1, '#ffd36a'); px.rect(g, tx - 1, ty - 1, 1, 24, '#ffd36a'); px.rect(g, tx + 22, ty - 1, 1, 24, '#ffd36a'); }
    G.drawToolIcon(g, tool, tx + 1, ty + 1, on ? '#ffffff' : hint ? '#ffe9a0' : '#9fc4bc');
    if (o.keys) Pix.text(g, String(i + 1), tx + 15, ty + 14, on ? '#ffd36a' : '#6a8a88');
  });
  const name = G.TOOL_NAMES[G.TOOLS[sel]]; const w = E.font.width(name); Pix.panel(g, Math.round(x - w / 2 - 3), Math.round(y - 6), w + 6, 12, { alpha: .85 }); Pix.text(g, name, x, y - 4, '#ffffff', { align: 'center' });
};
/** the hint chip beside the cursor when the wheel is shut: the tool that would help, with a glow */
G.drawHintChip = (g, tool, x, y, t) => { const on = Math.sin(t * 7) > 0; px.rect(g, x, y, 22, 22, on ? '#ffd36a' : '#a88a30'); px.rect(g, x + 1, y + 1, 20, 20, '#0a2428'); G.drawToolIcon(g, tool, x + 1, y + 1, '#ffe9a0'); };
})();
