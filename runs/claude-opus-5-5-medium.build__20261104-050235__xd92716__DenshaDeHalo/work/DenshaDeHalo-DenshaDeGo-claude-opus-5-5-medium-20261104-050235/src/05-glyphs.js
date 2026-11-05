/* DENSHA DE HALO! · prompt badges that follow the device used last: PlayStation shapes (or Xbox letters, a setting) for
 * a controller, keycaps for the keyboard, a mouse with its button or wheel for the mouse. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game;
const PS = { '✕': '#7ab0ff', '○': '#ff6a6a', '□': '#ff9ad8', '△': '#5ae0a0' }, XB = { A: '#5ad06a', B: '#ff5a5a', X: '#5aa0ff', Y: '#ffd040' };
DH.device = () => { const d = game.input.lastDevice; return d === 'touch' ? 'gamepad' : d; };
/** the text a prompt shows for an action on a device (after rebinding, with the lever direction) */
DH.glyphLabel = (a, dev = DH.device()) => {
  const I = game.input;
  if (dev === 'mouse') { if (a === 'call') return 'LMB'; if (a === 'power') return 'WHEEL ↑'; if (a === 'brake') return 'WHEEL ↓'; dev = 'keyboard'; }
  if (dev === 'gamepad') { const prev = I.glyphs; I.glyphs = game.settings.symbols || 'playstation'; const l = I.label(a, 'gamepad'); I.glyphs = prev; return l; }
  const l = I.label(a, 'keyboard'); return l === 'Backspace' ? 'BKSP' : l === 'Escape' ? 'ESC' : l;
};
/** draw a badge for action a at (x, y) (its left, its middle); returns its width */
DH.Glyph = {
  draw(g, a, x, y, sc = 1, dev = DH.device()) {
    const lab = DH.glyphLabel(a, dev), f = { scale: sc };
    x = Math.round(x); y = Math.round(y);
    if (dev === 'gamepad') {
      const col = PS[lab] || XB[lab];
      if (col && lab.length === 1) { const r = 5 * sc; px.disc(g, x + r, y, r + 1, '#0b0d18'); px.disc(g, x + r, y, r, '#2a2e40'); E.font.text(g, lab, x + r + (lab === '△' ? 0 : 0), y - 3 * sc, col, { align: 'center', scale: sc }); return r * 2 + 2; }
      const w = E.font.width(lab, f) + 6 * sc, h = 11 * sc;
      px.rect(g, x, y - h / 2 - 1, w, h + 2, '#0b0d18'); px.rect(g, x + 1, y - h / 2, w - 2, h, '#3a3e54');
      E.font.text(g, lab, x + w / 2, y - 3 * sc, '#ffffff', { align: 'center', scale: sc }); return w + 2;
    }
    if (dev === 'mouse' && (a === 'call' || a === 'power' || a === 'brake')) {
      const w = 9 * sc, h = 13 * sc;
      px.rect(g, x, y - h / 2, w, h, '#0b0d18'); px.rect(g, x + 1, y - h / 2 + 1, w - 2, h - 2, '#e8e8f0');
      if (a === 'call') px.rect(g, x + 1, y - h / 2 + 1, Math.floor((w - 2) / 2), Math.floor(h * .4), '#ff7a5a');
      else { px.rect(g, x + w / 2 - 1, y - h / 2 + 2, 2, 4 * sc, '#5a6aff'); E.font.text(g, a === 'power' ? '↑' : '↓', x + w + 2, y - 3 * sc, '#ffffff', { scale: sc }); return w + 9 * sc; }
      return w + 2;
    }
    const w = Math.max(11 * sc, E.font.width(lab, f) + 6 * sc), h = 11 * sc;
    px.rect(g, x, y - h / 2 - 1, w, h + 3, '#0b0d18'); px.rect(g, x + 1, y - h / 2 + 1, w - 2, h, '#9aa0b8'); px.rect(g, x + 1, y - h / 2, w - 2, h - 1, '#f0f0f8');
    E.font.text(g, lab, x + w / 2, y - 3 * sc, '#141824', { align: 'center', scale: sc }); return w + 2;
  },
  /** a badge then words: [X] CALL */
  prompt(g, a, words, x, y, col = '#ffffff', sc = 1, align = 'left') {
    const wB = this.width(a, sc), wT = E.font.width(words, { scale: sc }), tot = wB + 3 + wT;
    const x0 = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x;
    this.draw(g, a, x0, y, sc); E.font.text(g, words, Math.round(x0 + wB + 3), Math.round(y - 3 * sc), col, { scale: sc, shadow: '#000', outline: false });
    return tot;
  },
  width(a, sc = 1, dev = DH.device()) {
    const lab = DH.glyphLabel(a, dev);
    if (dev === 'gamepad') return (PS[lab] || XB[lab]) && lab.length === 1 ? 10 * sc + 2 : E.font.width(lab, { scale: sc }) + 6 * sc + 2;
    if (dev === 'mouse' && (a === 'call')) return 9 * sc + 2;
    if (dev === 'mouse' && (a === 'power' || a === 'brake')) return 18 * sc;
    return Math.max(11 * sc, E.font.width(lab, { scale: sc }) + 6 * sc) + 2;
  }
};
/** the lever direction setting: Up = Brake flips W/S, the arrows, the d-pad and the stick (not R2/L2, not the wheel) */
DH.applyLeverDir = () => {
  const I = game.input, m = I.map; if (!m.power || !m.brake) return;
  const flip = game.settings.leverDir === 'up-brake';
  const up = ['KeyW', 'ArrowUp', 'Pad12', 'PadAxisUp'], down = ['KeyS', 'ArrowDown', 'Pad13', 'PadAxisDown'];
  const strip = l => l.filter(c => !up.includes(c) && !down.includes(c));
  m.power = strip(m.power).concat(flip ? down : up); m.brake = strip(m.brake).concat(flip ? up : down);
};
})();
