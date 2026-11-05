// The 10-foot UI kit (plan §7.17, §7.19): glyph prompts that follow the device used last (PlayStation shapes by default,
// Xbox letters as a setting, keycaps and a mouse for keyboard and mouse), a menu with one focus frame that the pad,
// the keys and the mouse hover all move, and the panels and footers every screen shares.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px, clamp } = E;
const G = () => OB.game;
OB.UI = OB.UI || {};
const SUN = '#ffcf4a', PINK = '#ff5fa2', SEA = '#3ac8e0', INK = '#fff4e0', DUSK = ['#2a1450', '#5a2a6a'];

/** the buttons' look: PlayStation shapes, or Xbox letters (Settings > Controller > Button symbols) */
OB.buttonStyle = () => (G().settings && G().settings.buttons) || 'PlayStation';

/* ---- glyphs: a small drawing for each pad button, at scale s (its size is 12 pixels times s) ---- */
const PS = {
  Pad0: ['#3a7ad8', 'x'], Pad1: ['#e0403a', 'o'], Pad2: ['#e05a9a', 's'], Pad3: ['#40b860', 't'],
};
const XB = {
  Pad0: ['#2aa84a', 'A'], Pad1: ['#e0403a', 'B'], Pad2: ['#3a7ad8', 'X'], Pad3: ['#e8c030', 'Y'],
};
function padGlyph(g, code, x, y, s) {
  const xbox = OB.buttonStyle() === 'Xbox';
  const d = 12 * s;
  if (PS[code] || XB[code]) {
    const [col, sym] = (xbox ? XB : PS)[code];
    E.px.disc(g, x + d / 2, y + d / 2, d / 2, '#101020');
    E.px.disc(g, x + d / 2, y + d / 2, d / 2 - s, col);
    if (xbox) E.font.text(g, sym, Math.round(x + d / 2), Math.round(y + d / 2 - 3 * s), '#ffffff', { align: 'center', outline: false, font: 'tiny', scale: Math.max(1, s - 1) });
    else if (sym === 'x') { const c = d * .3; E.px.line(g, x + d / 2 - c, y + d / 2 - c, x + d / 2 + c, y + d / 2 + c, '#ffffff', Math.max(1, s)); E.px.line(g, x + d / 2 + c, y + d / 2 - c, x + d / 2 - c, y + d / 2 + c, '#ffffff', Math.max(1, s)); }
    else if (sym === 'o') E.px.disc(g, x + d / 2, y + d / 2, d * .26, '#ffffff'), E.px.disc(g, x + d / 2, y + d / 2, d * .15, col);
    else if (sym === 's') E.px.rect(g, x + d * .3, y + d * .3, d * .4, d * .4, '#ffffff');
    else E.px.poly(g, [[x + d / 2, y + d * .28], [x + d * .72, y + d * .7], [x + d * .28, y + d * .7]], '#ffffff');
    return;
  }
  // the shoulders, the triggers, the menu buttons, the d-pad and the stick: small pills and shapes
  const label = { Pad4: xbox ? 'LB' : 'L1', Pad5: xbox ? 'RB' : 'R1', Pad6: xbox ? 'LT' : 'L2', Pad7: xbox ? 'RT' : 'R2', Pad8: xbox ? 'VIEW' : 'CREATE', Pad9: xbox ? 'MENU' : 'OPTIONS' }[code];
  if (label) { const w = Math.max(d, E.font.width(label, { font: 'tiny' }) + 4 * s); E.px.rect(g, x, y + d * .2, w, d * .6, '#101020'); E.font.text(g, label, Math.round(x + w / 2), Math.round(y + d * .3), '#ffffff', { align: 'center', outline: false, font: 'tiny', scale: s }); return; }
  if (/^Pad1[2-5]$/.test(code)) { E.px.rect(g, x + d * .38, y, d * .24, d, '#e8e8f0'); E.px.rect(g, x, y + d * .38, d, d * .24, '#e8e8f0'); E.px.rect(g, x + d * .38, y + d * .38, d * .24, d * .24, '#ffcf4a'); return; }
  E.px.disc(g, x + d / 2, y + d / 2, d / 2, '#2a2a40');
  E.px.disc(g, x + d / 2, y + d / 2, d * .3, '#e8e8f0');
}
/** a keycap with the key's label, sized to the label */
function keycap(g, label, x, y, s) {
  const w = Math.max(12 * s, E.font.width(label, { font: 'tiny' }) * s + 6 * s), h = 12 * s;
  E.px.rect(g, x, y, w, h, '#101020'); E.px.rect(g, x + s, y + s, w - 2 * s, h - 3 * s, '#e8e8f0');
  E.font.text(g, label, Math.round(x + w / 2), Math.round(y + 2 * s), '#101020', { align: 'center', outline: false, font: 'tiny', scale: s });
  return w;
}
/** a mouse: the left or right button lit */
function mouseIcon(g, btn, x, y, s) {
  const d = 12 * s; E.px.rect(g, x + d * .2, y, d * .6, d, '#e8e8f0'); E.px.rect(g, x + d * .2, y, d * .6, d * .4, btn === 'right' ? '#e8e8f0' : '#ffcf4a'); E.px.rect(g, x + d * .48, y, d * .04, d * .4, '#101020');
}
/** the prompt for an action on the device used last: glyph and the action's name. Returns the width drawn. */
OB.UI.prompt = (g, x, y, action, text = '', o = {}) => {
  const s = o.scale || 1, dev = G().input.lastDevice || 'keyboard', I = G().input;
  let w = 0;
  if (dev === 'gamepad') {
    const codes = (I.map && I.map[action]) || [];
    const pad = codes.find(c => /^Pad/.test(c)) || (action === 'confirm' ? 'Pad0' : action === 'cancel' ? 'Pad1' : 'Pad0');
    padGlyph(g, pad, x, y, s); w = 12 * s;
  } else if (dev === 'mouse') {
    mouseIcon(g, action === 'cancel' ? 'right' : 'left', x, y, s); w = 12 * s * .8 + 2;
  } else {
    w = keycap(g, I.label(action, 'keyboard') || action.toUpperCase(), x, y, s);
  }
  if (text) { E.font.text(g, text.toUpperCase(), x + w + 4 * s, y + 2 * s, INK, { outline: false, shadow: '#000', font: 'tiny', scale: s }); w += 4 * s + E.font.width(text.toUpperCase(), { font: 'tiny' }) * s; }
  return w;
};
/** a line of prompts along a footer: [action, text] pairs, centred at x */
OB.UI.footer = (r, y, pairs, x = r.W / 2) => {
  r.overlay(g => {
    const I = G().input, parts = pairs.map(([a, t]) => ({ a, t }));
    let total = 0; for (const p of parts) total += 12 + 4 + E.font.width(p.t.toUpperCase(), { font: 'tiny' }) + 12;
    let cx = Math.round(x - total / 2);
    for (const p of parts) { cx += OB.UI.prompt(g, cx, y, p.a, p.t, { scale: 1 }) + 12; }
  });
};
/** a panel: the dusk gradient with a warm border, or a flat fill */
OB.UI.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || DUSK, border: o.border || '#ffd6a0', alpha: o.alpha, gradient: o.flat ? false : true });
/** text on screen: scale 1 is the smallest a player reads (28 pixels tall on a 1080p screen) */
OB.UI.text = (g, s, x, y, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), o.color || INK, Object.assign({ outline: false, shadow: '#000', align: 'left' }, o));
/** a title line: the big outlined pixel font, in the sun's colours */
OB.UI.title = (g, s, x, y, o = {}) => E.font.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale: 3, align: 'center', colors: ['#fff4e0', '#ffb3d1', '#ff7a59', '#ffcf4a'], depth: 3, depthColor: '#5a1e4a' }, o));

/* ---- Menu: a column or a row of items with one focus frame; the stick, the d-pad, the keys and the mouse move it ---- */
class Menu {
  /** new OB.Menu(items, { x, y, gap, cols, w, h, align, onBack, focus }): items [{ label, sub, act, disabled, card }] */
  constructor(items, o = {}) {
    this.items = items; this.o = Object.assign({ x: 240, y: 110, gap: 26, cols: 1, w: 260, h: 22, align: 'center', focus: 0 }, o);
    this.focus = clamp(this.o.focus || 0, 0, items.length - 1); this.rects = []; this.pulse = 0; this.hover = null;
    this.lastPointer = null;
  }
  /** the nearest item in a direction from the focus (for pinned items): the one most in that direction, then closest */
  moveSpatial([dx, dy]) {
    const f = this.rects[this.focus]; if (!f) return;
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    let best = -1, bestScore = Infinity;
    this.rects.forEach((r, i) => {
      if (i === this.focus || this.items[i].disabled) return;
      const ox = r.x + r.w / 2 - cx, oy = r.y + r.h / 2 - cy;
      const along = ox * dx + oy * dy; if (along <= 1) return;
      const across = Math.abs(ox * dy) + Math.abs(oy * dx);
      const score = along + across * 2;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) { this.focus = best; OB.Sfx.play('select', { vol: .3 }); }
  }
  /** the frame each item is drawn in (set by draw), for the mouse */
  layout(W, H) {
    const { cols, w, h, gap, y, x } = this.o, rows = Math.ceil(this.items.length / cols);
    // items with a position (a pinned postcard on a map) sit there; the others sit in the grid
    this.rects = this.items.map((it, i) => {
      if (it.pos) return { x: it.pos[0] - (it.w || w) / 2, y: it.pos[1] - (it.h || h) / 2, w: it.w || w, h: it.h || h, i };
      const c = i % cols, rr = Math.floor(i / cols), cw = w + gap;
      const ix = this.o.align === 'center' ? x - (cols * cw - gap) / 2 + c * cw : x + c * cw;
      return { x: ix, y: y + rr * (h + gap), w, h, i };
    });
    return this;
  }
  /** one step: move the focus by the input, the mouse over an item focuses it, a click or confirm picks it */
  update(dt, I) {
    this.pulse += dt;
    const n = this.items.length, cols = this.o.cols;
    const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const spatial = this.items.some(it => it.pos);
    for (const k of ['up', 'down', 'left', 'right']) {
      if (spatial && (I.pressed(k) || I.repeat(k, .42, .13))) { this.moveSpatial(dir[k]); continue; }
      if (I.pressed(k) || I.repeat(k, .42, .13)) {
        const [dx, dy] = dir[k], f = this.focus, c = f % cols, r = Math.floor(f / cols);
        let nc = c + dx, nr = r + dy, nf = nr * cols + nc;
        if (nc >= 0 && nc < cols && nf >= 0 && nf < n) { this.focus = nf; OB.Sfx.play('select', { vol: .3 }); }
        else if (cols === 1 && (dy !== 0) && n > 1) { this.focus = clamp(f + dy, 0, n - 1); OB.Sfx.play('select', { vol: .3 }); }
      }
    }
    // the mouse: hover moves the focus; a click on an item picks it
    const p = I.pointer && I.pointer();
    if (p && (!this.lastPointer || Math.abs(p[0] - this.lastPointer[0]) + Math.abs(p[1] - this.lastPointer[1]) > .5)) {
      const hit = this.rects.find(r => p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h);
      if (hit && hit.i !== this.focus) { this.focus = hit.i; OB.Sfx.play('select', { vol: .2 }); }
      this.lastPointer = p.slice();
    }
    const c = I.clicked && I.clicked();
    let picked = null;
    if (c) { const hit = this.rects.find(r => c[0] >= r.x && c[0] < r.x + r.w && c[1] >= r.y && c[1] < r.y + r.h); if (hit) { this.focus = hit.i; picked = hit.i; } }
    if (I.pressed('confirm') || I.pressed('start')) picked = this.focus;
    if (picked !== null) {
      const it = this.items[picked];
      if (it && !it.disabled && it.act) { OB.Sfx.play('confirm', { vol: .5 }); it.act(it); }
      else if (it && it.disabled) OB.Sfx.play('cancel', { vol: .4 });
    }
    if (I.pressed('cancel') && this.o.onBack) { OB.Sfx.play('cancel', { vol: .5 }); this.o.onBack(); }
    return this;
  }
  /** the focus frame and the items: label, and a sub line for the focused one */
  draw(g, o = {}) {
    const focusCol = `rgba(255,207,74,${(.6 + .4 * Math.sin(this.pulse * 6)).toFixed(3)})`;
    this.items.forEach((it, i) => {
      const rc = this.rects[i]; if (!rc) return;
      const f = i === this.focus;
      OB.UI.panel(g, rc.x, rc.y, rc.w, rc.h, { bg: f ? ['#4a1e6a', '#7a3a7a'] : ['#1e1040', '#3a2050'], border: f ? SUN : '#8a6a9a', alpha: .95 });
      const col = it.disabled ? '#7a7090' : f ? SUN : INK;
      if (it.sub) {
        // a card: the label small on top, its status under it
        E.font.text(g, it.label, Math.round(rc.x + rc.w / 2), Math.round(rc.y + 4), col, { align: 'center', outline: false, shadow: '#000', font: 'tiny', scale: 1 });
        E.font.text(g, it.sub, Math.round(rc.x + rc.w / 2), Math.round(rc.y + rc.h - 12), f ? '#ffd6a0' : '#c8b8d8', { align: 'center', outline: false, shadow: '#000', font: 'tiny', scale: 1 });
      } else E.font.text(g, it.label, Math.round(rc.x + rc.w / 2), Math.round(rc.y + rc.h / 2 - 7), col, { align: 'center', outline: false, shadow: '#000', scale: o.scale || 2 });
      if (f) {
        // one thick focus frame: a 2 px outline in the pulsing sun-yellow
        E.px.line(g, rc.x - 2, rc.y - 2, rc.x + rc.w + 2, rc.y - 2, focusCol, 2);
        E.px.line(g, rc.x - 2, rc.y + rc.h + 2, rc.x + rc.w + 2, rc.y + rc.h + 2, focusCol, 2);
        E.px.line(g, rc.x - 2, rc.y - 2, rc.x - 2, rc.y + rc.h + 2, focusCol, 2);
        E.px.line(g, rc.x + rc.w + 2, rc.y - 2, rc.x + rc.w + 2, rc.y + rc.h + 2, focusCol, 2);
      }
    });
  }
}
OB.Menu = Menu;
})();
