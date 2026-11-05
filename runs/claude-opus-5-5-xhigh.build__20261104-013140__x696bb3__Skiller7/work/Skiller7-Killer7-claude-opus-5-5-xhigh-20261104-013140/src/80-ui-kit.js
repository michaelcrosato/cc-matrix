/* UI KIT: canvas widgets for a TV at ten feet (§6.4): big type, one idea per screen, a red focus bar, hover focuses,
 * a click activates, a drag moves a slider, the wheel scrolls; the same on pad, keys and mouse. Prompts are glyph chips
 * that follow the device used last. Everything draws in game pixels inside r.overlay. */
const INK = '#08070a', PAPER = '#f4f1ea', RED = '#d81e2a', MUTED = '#8a8590', GOLD = '#e0b040';
S7.COL = { INK, PAPER, RED, MUTED, GOLD };
const UI = S7.UIK = {
  /** text with the house outline; returns { w, h } */
  text(g, s, x, y, color = PAPER, o = {}) { return E.font.text(g, String(s), Math.round(x), Math.round(y), color, Object.assign({ outline: INK }, o)); },
  width(s, scale = 1) { return E.font.width(String(s), { scale }); },
  big(g, s, x, y, scale = 2, color = PAPER, align = 'center') { return E.font.text(g, String(s), Math.round(x), Math.round(y), color, { outline: INK, scale, align }); },
  title(g, s, x, y, scale = 4, o = {}) { E.font.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale, colors: ['#ffffff', '#f4f1ea', '#d8d4cc'], outline: INK, depth: 2, depthColor: '#2a0a0e', align: 'center' }, o)); },
  rect(g, x, y, w, h, c) { E.px.rect(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), c); },
  /** a see-through dark panel */
  panel(g, x, y, w, h, a = .82, c = '#0b0a0c') { g.save(); g.globalAlpha = a; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); g.restore(); },
  veil(g, r, a = .6, c = '#05030a') { g.save(); g.globalAlpha = a; g.fillStyle = c; g.fillRect(0, 0, r.W, r.H); g.restore(); },
  /** the safe area (5% inside every edge: TV overscan) */
  safe(r) { return { x0: Math.round(r.W * .05), y0: Math.round(r.H * .05), x1: Math.round(r.W * .95), y1: Math.round(r.H * .95) }; },
  /** a glyph chip for an action on the device used last: the button's symbol in a rounded box; returns its width */
  chip(g, act, x, y, scale = 1, o = {}) {
    const lab = o.label || S7.label(act);
    const w = Math.max(9, E.font.width(lab, { scale }) + 6 * scale), h = 9 * scale + 2;
    const yy = Math.round(y - 1), xx = Math.round(x);
    E.ui.box(g, xx, yy, w, h, { bg: o.bg || '#f4f1ea', border: INK, gradient: false });
    const glyphCol = { '✕': '#3a6ad8', '○': '#d83a3a', '□': '#c84ac8', '△': '#2aa080' }[lab] || INK;
    E.font.text(g, lab, xx + Math.round((w - E.font.width(lab, { scale })) / 2), yy + 1 + scale, glyphCol, { outline: false, scale });
    return w;
  },
  /** a prompt: chips and a verb in capitals: prompt(g, [['interact', 'CHECK']], x, y, { align: 'center' }) */
  prompt(g, parts, x, y, o = {}) {
    const sc = o.scale || 1, gap = 6 * sc;
    let w = 0; for (const [act, verb] of parts) w += Math.max(9, E.font.width(o.labels && o.labels[act] || S7.label(act), { scale: sc }) + 6 * sc) + 3 + E.font.width(verb, { scale: sc }) + gap;
    w -= gap;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    for (const [act, verb] of parts) { cx += this.chip(g, act, cx, y, sc, { label: o.labels && o.labels[act] }) + 3; this.text(g, verb, cx, y + sc, o.color || PAPER, { scale: sc }); cx += E.font.width(verb, { scale: sc }) + gap; }
    return w;
  },
  /** a pointer inside a box? */
  hit(p, x, y, w, h) { return !!p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h; },
  /** a portrait in a frame */
  portrait(g, rig, x, y, size, o = {}) { if (!rig) return; rig.drawPortrait(g, Math.round(x), Math.round(y), size, Object.assign({ bg: '#1a1418', frame: true, zoom: 2.6 }, o)); },
  /** five-segment bars (the Wax Bench) */
  segBar(g, x, y, n, of, w = 14, h = 6, on = RED) { for (let i = 0; i < of; i++) { this.rect(g, x + i * (w + 2), y, w, h, i < n ? on : '#3a3438'); this.rect(g, x + i * (w + 2), y + h - 1, w, 1, i < n ? '#8a0e18' : '#2a2428'); } },
  diamond(g, x, y, r, c, fill) { const pts = [[x, y - r], [x + r, y], [x, y + r], [x - r, y]]; if (fill) E.px.poly(g, pts, c); else for (let i = 0; i < 4; i++) E.px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % 4][0], pts[(i + 1) % 4][1], c); },
  /** read menu input this step: { up, down, left, right, confirm, back, pageL, pageR, ptr, click, wheel, moved } */
  nav(game) {
    const I = game.input;
    const nv = { up: I.repeat('up', .3, .09), down: I.repeat('down', .3, .09), left: I.repeat('left', .3, .07), right: I.repeat('right', .3, .07), confirm: I.pressed('confirm') || I.pressed('start'), back: I.pressed('cancel'),
      pageL: I.pressed('pageL'), pageR: I.pressed('pageR'), ptr: I.pointer ? I.pointer() : null, click: I.clicked ? I.clicked() : null, wheel: S7.Input.takeWheel(), held: I.down('confirm') };
    const p = nv.ptr, last = this._lastPtr;
    nv.moved = !!p && (!last || Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) > .5);
    this._lastPtr = p ? p.slice() : null;
    nv.mouseDown = I.held && (I.held.has ? I.held.has('Mouse0') : false);
    return nv;
  }
};

/** a vertical list of items, focus by keys/pad, hover by mouse, click or confirm to pick */
class ListMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.boxes = []; this.t = 0; this.skip(1); }
  skip(d) { const n = this.items.length; for (let k = 0; k < n && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + n) % n; }
  update(nv, game) {
    const n = this.items.length; if (!n) return null;
    this.t += 1 / 60;
    if (nv.up) { this.i = (this.i + n - 1) % n; this.skip(-1); S7.sfx('tick'); }
    if (nv.down) { this.i = (this.i + 1) % n; this.skip(1); S7.sfx('tick'); }
    for (let k = 0; k < this.boxes.length; k++) { const b = this.boxes[k]; if (!b) continue; if (nv.moved && UI.hit(nv.ptr, b[0], b[1], b[2], b[3]) && !this.items[k].disabled && this.i !== k) { this.i = k; S7.sfx('tick'); } if (UI.hit(nv.click, b[0], b[1], b[2], b[3]) && !this.items[k].disabled) { this.i = k; return this.pick(); } }
    const it = this.items[this.i];
    if (it && it.adjust && (nv.left || nv.right)) { it.adjust(nv.left ? -1 : 1); S7.sfx('tick'); }
    if (nv.confirm) return this.pick();
    if (nv.back && this.o.onBack) { S7.sfx('back'); this.o.onBack(); return 'back'; }
    return null;
  }
  pick() { const it = this.items[this.i]; if (!it || it.disabled) return null; S7.sfx('confirm'); if (it.on) it.on(); return it; }
  draw(g, x, y, o = {}) {
    const sc = o.scale || 2, lh = (o.lh || 13) * sc / 2 + (o.gap || 4), align = o.align || 'center';
    this.boxes = [];
    this.items.forEach((it, k) => {
      const yy = y + k * lh, f = k === this.i, label = typeof it.label === 'function' ? it.label() : it.label;
      const w = UI.width(label, sc) * (f ? 1.1 : 1), x0 = align === 'center' ? x - w / 2 : x;
      if (f) { UI.rect(g, align === 'center' ? x - w / 2 - 10 : x - 10, yy + 1, 5, 7 * sc - 1, RED); }
      UI.text(g, label, align === 'center' ? x : x, yy, it.disabled ? '#5a5560' : f ? '#ffffff' : (o.color || '#d0ccd4'), { scale: sc, align });
      this.boxes[k] = [x0 - 14, yy - 2, w + 28, 7 * sc + 4];
      if (f && it.hint) UI.text(g, it.hint, x, yy + 7 * sc + 3, MUTED, { align });
    });
  }
}
S7.ListMenu = ListMenu;

/** a horizontal slider row: label, bar, value; drag with the mouse */
S7.slider = (g, nv, x, y, w, v, min, max, focused) => {
  UI.rect(g, x, y + 3, w, 3, '#3a3438');
  const k = (v - min) / (max - min); UI.rect(g, x, y + 3, Math.round(w * k), 3, focused ? RED : '#8a8590');
  UI.rect(g, x + Math.round(w * k) - 2, y, 4, 9, focused ? '#ffffff' : '#c8c4cc');
  if (nv && nv.mouseDown && nv.ptr && nv.ptr[1] >= y - 4 && nv.ptr[1] <= y + 12 && nv.ptr[0] >= x - 4 && nv.ptr[0] <= x + w + 4) return min + clamp((nv.ptr[0] - x) / w, 0, 1) * (max - min);
  return null;
};

/** a canvas modal: freezes the sim while open; subclasses implement update(nv) → 'close' and draw(g, r) */
class Modal {
  constructor(o = {}) { this.o = o; this.t = 0; }
  update() { return null; }
  draw() {}
}
S7.Modal = Modal;
S7.sfx = (name) => { if (S7.audio && S7.audio.ui) S7.audio.ui(name); };
