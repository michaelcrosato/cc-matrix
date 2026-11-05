/* ---- GLYPHS AND PROMPTS: an icon for an action's binding on the device the player used last. Gamepad: PlayStation
 * shapes by default (Cross blue, Circle red, Square pink, Triangle green on dark discs; L1 R1 L2 R2 pills), or Xbox
 * letters (A green, B red, X blue, Y yellow; LB RB LT RT) with the Button symbols setting. Keyboard: a keycap with the
 * key's label. Mouse: a mouse with the button lit (actions with no mouse button show their keycap). Prompts change on
 * the very next frame after the device changes, and follow the player's rebinding. ---- */
const PS_COL = { 0: '#7aa7ff', 1: '#ff6b6b', 2: '#ff8ad8', 3: '#5fd38a' }, XB_COL = { 0: '#5fd38a', 1: '#ff6b6b', 2: '#7aa7ff', 3: '#ffd23a' };
const Glyphs = {
  device(I) { const d = I.lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : d === 'touch' ? 'touch' : 'keyboard'; },
  style(I) { const s = K.game && K.game.settings ? K.game.settings.glyphs : null; return s === 'xbox' ? 'xbox' : 'playstation'; },   // (the Button symbols setting, for every player)
  /** the code to show for an action on a device */
  code(I, action, device = Glyphs.device(I)) {
    const m = I.map[action]; if (!m) return null;
    const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (device === 'gamepad') return real.find(c => /^Pad\d+$/.test(c)) || null;
    if (device === 'mouse') return real.find(c => /^Mouse\d$/.test(c)) || real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || null;
    return real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real.find(c => /^Mouse\d$/.test(c)) || null;
  },
  /** what a prompt shows, as data (tests read it): { kind: 'ps' | 'xbox' | 'key' | 'mouse', label } */
  info(I, action, device) {
    const dev = device || Glyphs.device(I), code = Glyphs.code(I, action, dev === 'touch' ? 'keyboard' : dev); if (!code) return { kind: 'none', label: '' };
    if (/^Pad\d+$/.test(code)) { const n = +code.slice(3), st = Glyphs.style(I); return { kind: st === 'xbox' ? 'xbox' : 'ps', n, label: I.codeLabel(code) }; }
    if (/^Mouse\d$/.test(code)) return { kind: 'mouse', n: +code.slice(5), label: code === 'Mouse0' ? 'LMB' : code === 'Mouse2' ? 'RMB' : 'MMB' };
    return { kind: 'key', label: I.codeLabel(code) };
  },
  /** draw an action's icon at (x, y) (top left, 9 px tall); returns its width */
  draw(g, x, y, I, action, o = {}) {
    const inf = Glyphs.info(I, action, o.device);
    return Glyphs.drawInfo(g, x, y, inf, o);
  },
  drawInfo(g, x, y, inf, o = {}) {
    const S = o.scale || 1, s = n => Math.round(n * S);
    if (inf.kind === 'ps' && inf.n <= 3) {
      const cx = x + s(5), cy = y + s(5), c = PS_COL[inf.n];
      px.disc(g, cx, cy, s(5), '#0e0e18'); px.disc(g, cx, cy, s(4.5), '#22223a');
      if (inf.n === 0) { px.line(g, cx - s(2), cy - s(2), cx + s(2), cy + s(2), c, S); px.line(g, cx - s(2), cy + s(2), cx + s(2), cy - s(2), c, S); }
      else if (inf.n === 1) { px.disc(g, cx, cy, s(2.6), c); px.disc(g, cx, cy, Math.max(1, s(1.5)), '#22223a'); }
      else if (inf.n === 2) { px.rect(g, cx - s(2), cy - s(2), s(5), s(5), c); px.rect(g, cx - s(1), cy - s(1), s(3), s(3), '#22223a'); }
      else { px.poly(g, [[cx, cy - s(3)], [cx + s(3), cy + s(2)], [cx - s(3), cy + s(2)]], c); px.poly(g, [[cx, cy - s(1)], [cx + s(1.4), cy + s(1.2)], [cx - s(1.4), cy + s(1.2)]], '#22223a'); }
      return s(11);
    }
    if (inf.kind === 'xbox' && inf.n <= 3) {
      const cx = x + s(5), cy = y + s(5), c = XB_COL[inf.n];
      px.disc(g, cx, cy, s(5), '#0e0e18'); px.disc(g, cx, cy, s(4.5), c);
      E.font.text(g, 'ABXY'[inf.n], cx + 1, cy - s(3), '#0e0e18', { align: 'center', scale: S, outline: false });
      return s(11);
    }
    if (inf.kind === 'ps' || inf.kind === 'xbox') {
      const lab = inf.kind === 'xbox' ? ({ 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU' }[inf.n] || inf.label) : ({ 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS' }[inf.n] || inf.label);
      const w = E.font.width(lab, { scale: S }) + s(6);
      px.rect(g, x, y + s(1), w, s(9), '#0e0e18'); px.rect(g, x + 1, y + s(1) + 1, w - 2, s(9) - 2, '#3a3a52'); E.font.text(g, lab, x + w / 2, y + s(2), '#ffffff', { align: 'center', scale: S, outline: false });
      return w + s(1);
    }
    if (inf.kind === 'mouse') {
      const w = s(8), h = s(10);
      px.rect(g, x + 1, y, w - 2, h, '#0e0e18'); px.rect(g, x, y + 1, w, h - 2, '#0e0e18'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#d8d8e0');
      const lit = inf.n === 0 ? [x + 1, y + 1] : [x + w / 2, y + 1]; px.rect(g, lit[0], lit[1], w / 2 - 1, s(4), '#ffb030'); px.rect(g, x + w / 2 - .5, y + 1, 1, s(4), '#0e0e18');
      return w + s(2);
    }
    if (inf.kind === 'key') {
      const lab = inf.label.toUpperCase(), w = Math.max(s(10), E.font.width(lab, { scale: S }) + s(6));
      px.rect(g, x, y, w, s(10), '#0e0e18'); px.rect(g, x + 1, y + 1, w - 2, s(10) - 2, '#e8e4d8'); px.rect(g, x + 1, y + s(10) - 3, w - 2, 2, '#a8a498');
      E.font.text(g, lab, x + w / 2, y + s(1.5), '#1a1a22', { align: 'center', scale: S, outline: false });
      return w + s(1);
    }
    return 0;
  },
  /** a stick / WASD / mouse "aim" icon */
  aim(g, x, y, I) {
    const d = Glyphs.device(I);
    if (d === 'gamepad') { px.disc(g, x + 5, y + 5, 5, '#0e0e18'); px.disc(g, x + 5, y + 5, 4, '#3a3a52'); px.disc(g, x + 5, y + 4, 2, '#8a8aa0'); return 11; }
    if (d === 'mouse') return Glyphs.drawInfo(g, x, y, { kind: 'mouse', n: 0 });
    let w = 0; for (const k of ['W', 'A', 'S', 'D']) w += Glyphs.drawInfo(g, x + w, y, { kind: 'key', label: k }) - 1; return w + 1;
  },
  /** a row of prompts: [[action, label], ...]; returns the width */
  row(g, x, y, I, list, o = {}) {
    let w = 0; const items = [];
    for (const [a, label] of list) { const iw = a === 'aim' ? 34 : 12, lw = E.font.width(label); items.push({ a, label, iw, lw }); w += iw + lw + 10; }
    let cx = o.align === 'center' ? Math.round(x - w / 2) : o.align === 'right' ? x - w : x;
    for (const it of items) {
      const gw = it.a === 'aim' ? Glyphs.aim(g, cx, y, I) : Glyphs.draw(g, cx, y, I, it.a);
      E.font.text(g, it.label, cx + gw + 2, y + 1, o.color || '#ffffff', { shadow: '#000', outline: false });
      cx += gw + 2 + E.font.width(it.label) + 8;
    }
    return w;
  }
};
K.Glyphs = Glyphs;
