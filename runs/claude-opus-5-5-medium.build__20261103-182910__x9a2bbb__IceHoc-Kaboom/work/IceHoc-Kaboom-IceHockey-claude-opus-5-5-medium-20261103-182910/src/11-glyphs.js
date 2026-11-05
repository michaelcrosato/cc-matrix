/* ---- Glyphs: device-aware prompt chips. PlayStation (or Xbox) badges for a pad, keycaps for keys, a mouse icon ---- */
const Glyphs = (() => {
  const PS = { '✕': '#7aa7ff', '○': '#ff6b6b', '□': '#ff8ad8', '△': '#4fe3a1' }, XB = { A: '#5ad05a', B: '#ff5a4a', X: '#4a8aff', Y: '#ffd040' };
  const font = { outline: false };
  /** which device a prompt shows for an input: the one used last (mouse counts as keyboard unless the action has a mouse button) */
  const deviceOf = (inp, action) => {
    const d = inp.lastDevice;
    if (d === 'gamepad') return 'gamepad';
    if (d === 'mouse') { const b = bindingsOf(inp, action).find(c => c.startsWith('Mouse')); return b ? 'mouse' : 'keyboard'; }
    return 'keyboard';
  };
  const bindingsOf = (inp, action) => (inp.map && inp.map[action]) || HOCKEY_KEYS[action] || [];
  /** the chip for one action: { kind: 'badge' | 'shoulder' | 'key' | 'mouse', text, color, w } */
  function spec(action, o = {}) {
    const inp = o.input || game.input, dev = o.device || deviceOf(inp, action);
    if (dev === 'mouse') { const c = bindingsOf(inp, action).find(c => c.startsWith('Mouse')); return { kind: 'mouse', btn: +c.slice(5), w: 9 }; }
    let lab = String(inp.label(action, dev === 'gamepad' ? 'gamepad' : 'keyboard') || action);
    if (dev === 'gamepad') {
      if (PS[lab]) return { kind: 'badge', text: lab, color: PS[lab], w: 11 };
      if (XB[lab]) return { kind: 'badge', text: lab, color: XB[lab], w: 11 };
      lab = lab.replace('D-pad ', ''); return { kind: 'shoulder', text: lab, w: E.font.width(lab, font) + 6 };
    }
    if (lab === 'Left click' || lab === 'Right click' || lab === 'Middle click') return { kind: 'mouse', btn: lab[0] === 'L' ? 0 : lab[0] === 'R' ? 2 : 1, w: 9 };
    lab = lab.length > 6 ? lab.slice(0, 6) : lab;
    return { kind: 'key', text: lab, w: Math.max(11, E.font.width(lab, font) + 6) };
  }
  /** draw a chip; returns its width. y is the chip's top; chips are 11 px tall */
  function chip(g, action, x, y, o = {}) {
    const s = spec(action, o); x = Math.round(x); y = Math.round(y);
    if (s.kind === 'badge') {
      px.disc(g, x + 5, y + 5, 5.5, '#0c0e16'); px.disc(g, x + 5, y + 5, 4.5, '#24283a');
      E.font.text(g, s.text, x + 6, y + 2, s.color, { align: 'center', outline: false });
    } else if (s.kind === 'shoulder') {
      px.rect(g, x + 1, y, s.w - 2, 11, '#0c0e16'); px.rect(g, x, y + 1, s.w, 9, '#0c0e16'); px.rect(g, x + 1, y + 1, s.w - 2, 9, '#2e3348');
      E.font.text(g, s.text, x + s.w / 2, y + 2, '#e8ecf8', { align: 'center', outline: false });
    } else if (s.kind === 'key') {
      px.rect(g, x, y, s.w, 11, '#0c0e16'); px.rect(g, x + 1, y + 1, s.w - 2, 8, '#e8e4d8'); px.rect(g, x + 1, y + 9, s.w - 2, 1, '#9a968c');
      E.font.text(g, s.text, x + s.w / 2, y + 2, '#1a1a22', { align: 'center', outline: false });
    } else {   // a mouse: body, the pressed button lit
      px.rect(g, x + 1, y, 7, 11, '#0c0e16'); px.rect(g, x + 2, y + 1, 5, 9, '#e8e4d8'); px.rect(g, x + 2, y + 4, 5, 1, '#6a6660'); px.rect(g, x + 4, y + 1, 1, 3, '#6a6660');
      const lit = s.btn === 0 ? [x + 2, 2] : s.btn === 2 ? [x + 5, 2] : [x + 4, 1]; px.rect(g, lit[0], y + 1, lit[1], 3, '#ff9a3a');
    }
    return s.w;
  }
  const width = (action, o) => spec(action, o).w;
  /** text with {action} tokens as chips: returns the width; o.align 'center' centers the whole line */
  function text(g, str, x, y, color = '#ffffff', o = {}) {
    const parts = String(str).split(/(\{\w+\})/).filter(Boolean), fo = Object.assign({ outline: false, shadow: '#000' }, o.font || {});
    const isTok = p => /^\{\w+\}$/.test(p) && HOCKEY_KEYS[p.slice(1, -1)];
    let w = 0; for (const p of parts) w += isTok(p) ? width(p.slice(1, -1), o) + 2 : E.font.width(p, fo);
    if (g === null) return w;
    let cx = o.align === 'center' ? Math.round(x - w / 2) : o.align === 'right' ? Math.round(x - w) : x;
    for (const p of parts) {
      if (isTok(p)) { cx += chip(g, p.slice(1, -1), cx, y - 2, o) + 2; }
      else { E.font.text(g, p, cx, y, color, fo); cx += E.font.width(p, fo); }
    }
    return w;
  }
  /** keep the pads' symbol family in step with the Button symbols setting (and the engine's own Controls option) */
  let lastEngine = null, lastPt = null;
  function sync() {
    const st = S(); if (!st) return;
    const pt = game.input.pointer && game.input.pointer();   // a mouse that moves takes the prompts over from the keyboard
    if (pt && lastPt && (pt[0] !== lastPt[0] || pt[1] !== lastPt[1]) && game.input.lastDevice === 'keyboard') game.input.lastDevice = 'mouse';
    lastPt = pt ? pt.slice() : null;
    const eng = st.glyphs;
    if (lastEngine !== null && eng !== lastEngine && (eng === 'xbox' || eng === 'playstation')) st.set('symbols', eng === 'xbox' ? 'Xbox' : 'PlayStation');
    const want = st.symbols === 'Xbox' ? 'xbox' : 'playstation';
    for (const p of game.players) p.glyphs = want;
    lastEngine = eng;
  }
  return { chip, text, width, spec, sync, deviceOf, PS, XB };
})();
