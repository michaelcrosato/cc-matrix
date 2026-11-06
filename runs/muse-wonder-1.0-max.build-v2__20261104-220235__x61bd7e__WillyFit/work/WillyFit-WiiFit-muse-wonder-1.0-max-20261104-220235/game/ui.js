// Willy Fit — Pills widget, prompts, Card/Results helpers, Dev panel, studio backdrop.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  G.Pills = class Pills {
    constructor(game, items, opts) {
      this.game = game; this.items = items; this.i = 0; this.opts = opts || {};
      this.x = this.opts.x; this.y = this.opts.y;
    }
    update(dt) {
      const inp = this.game.input;
      const horiz = this.opts.horizontal;
      if (horiz) { if (inp.repeat('left')) { this.i = (this.i + this.items.length - 1) % this.items.length; G.sfx('tickS'); } if (inp.repeat('right')) { this.i = (this.i + 1) % this.items.length; G.sfx('tickS'); } }
      else { if (inp.repeat('up')) { this.i = (this.i + this.items.length - 1) % this.items.length; G.sfx('tickS'); } if (inp.repeat('down')) { this.i = (this.i + 1) % this.items.length; G.sfx('tickS'); } }
      // mouse hover moves focus, click picks
      try {
        const pt = inp.pointer ? inp.pointer() : null;
        if (pt && this._rects) for (let k = 0; k < this._rects.length; k++) { const rc = this._rects[k]; if (pt[0] >= rc[0] && pt[0] <= rc[0] + rc[2] && pt[1] >= rc[1] && pt[1] <= rc[1] + rc[3]) this.i = k; }
        if (inp.clicked && inp.clicked()) {
          const c = inp.clicked();
          if (c && this._rects) for (let k = 0; k < this._rects.length; k++) { const rc = this._rects[k]; if (c[0] >= rc[0] && c[0] <= rc[0] + rc[2] && c[1] >= rc[1] && c[1] <= rc[1] + rc[3]) { this.i = k; return 'pick'; } }
        }
      } catch (e) {}
      if (inp.pressed('confirm')) return 'pick';
      if (inp.pressed('cancel')) return 'cancel';
      return null;
    }
    draw(r) {
      const px = E.px;
      r.overlay(g => {
        const W = r.W, H = r.H;
        const horiz = this.opts.horizontal;
        const labels = this.items.map(it => typeof it === 'string' ? it : it.label);
        const dis = this.items.map(it => typeof it === 'string' ? false : !!it.disabled);
        const widths = labels.map(s => E.font.width(s) + 22);
        let totalW = widths.reduce((a, b) => a + b + 6, -6), totalH = labels.length * 20;
        let cx = this.x == null ? Math.round((W - (horiz ? totalW : Math.max(...widths))) / 2) : this.x;
        let cy = this.y == null ? Math.round(H * 0.62) : this.y;
        if (this.opts.title) E.font.text(g, this.opts.title, W / 2, cy - 22, '#20404c', { align: 'center', scale: 2 });
        this._rects = [];
        let x = cx, y = cy;
        for (let k = 0; k < labels.length; k++) {
          const w = horiz ? widths[k] : Math.max(...widths), h = 17;
          const foc = k === this.i, grow = foc ? 2 : 0;
          px.rect(g, x - grow, y - grow, w + grow * 2, h + grow * 2, dis[k] ? '#c8dde2' : foc ? '#2cc6e6' : '#ffffff');
          px.rect(g, x, y, w, h, dis[k] ? '#e6eeee' : '#ffffff');
          if (foc) px.rect(g, x - grow, y - grow, w + grow * 2, 2, '#14a8c8');
          E.font.text(g, labels[k], x + w / 2, y + 5, dis[k] ? '#8aa5ad' : '#20404c', { align: 'center' });
          this._rects.push([x - grow, y - grow, w + grow * 2, h + grow * 2]);
          if (horiz) x += w + 6; else y += 20;
        }
      });
    }
  };
  G.prompt = function (r, action, verb) {
    const game = G.game, inp = game.input;
    let txt = '';
    try {
      const last = inp.lastDevice;
      if (last === 'gamepad') txt = inp.label(action) + ' ' + verb;
      else if (last === 'touch') txt = verb;
      else {
        let a = '', b = '';
        try { a = inp.label(action, 'keyboard'); } catch (e) { a = inp.label(action); }
        try { b = inp.label(action, 'mouse'); } catch (e) { b = ''; }
        txt = (b && b !== a ? a + ' / ' + b : a) + ' ' + verb;
      }
    } catch (e) { txt = verb; }
    r.overlay(g => {
      const w = E.font.width(txt) + 14;
      const ca = game.cornerArea ? game.cornerArea() : null;
      let x = r.W - w - 8, y = r.H - 16;
      if (ca && x + w > ca.x0 && y + 12 > ca.y0) y = ca.y0 - 16;
      E.ui.box(g, x, y, w, 13, { bg: '#ffffff', border: '#2cc6e6' });
      E.font.text(g, txt, x + 7, y + 3, '#20404c', {});
    });
    return txt;
  };
  G.leanPromptText = function (intent) {
    if (!intent) return 'Lean';
    if (intent.source === 'gamepad') return 'Left stick — Lean';
    if (intent.source === 'mouse') return 'Move the mouse — Lean';
    return 'WASD — Lean';
  };
  G.drawStudio = function (r, opts) {
    opts = opts || {};
    const px = E.px, W = r.W, H = r.H, g0 = null;
    r.overlay(g => {});
    // paint backdrop in world draw: sky/wall/floor bands via overlay is wrong scale; use r's ctx through queue-less overlay at start
    // We draw with overlay first (behind actors? overlay is on top). Instead activities call this BEFORE actors using r.decal-like overlay trick:
    // Simplest: draw full-screen bands here; actors queued after will cover floor area. Callers invoke at top of draw().
    const cx = r.ctx; if (!cx) return;
  };
  G.paintRoom = function (r, theme) {
    // Called first in draw(r): fills screen bands directly on the buffer via px on r's overlay canvas is on top,
    // so we use low-level: draw sky with r.sky then floor rects in screen space behind actors via overlay ordering.
    // Engine draw order: first overlay call still renders after world. To keep it simple we paint world-space floor/wall
    // using ground discs and boxes in world coords (see activity draws). This helper paints the sea window in world space.
  };
  G.roomBackdrop = function (r, kind) {
    const px = E.px, W = r.W, H = r.H;
    // Screen-space backdrop drawn first via a background overlay hack: use r.sky for top, rest in draw fns.
    r.sky([kind === 'dusk' ? '#f2b880' : '#8fd3f4', kind === 'dusk' ? '#f7d9a8' : '#d8f3fb', '#ffffff']);
  };
  G.drawMatsAndRoom = function (r, spots) {
    // spots: [{x,y,label,color}] world coords in brawler (x right, y toward camera)
    for (const s of spots || []) {
      r.groundDisc(s.x, s.y, 14, s.color || '#bfeee0');
      r.groundRing(s.x, s.y, 14, '#2cc6e6');
    }
  };
  G.bigText = function (r, str, y, scale, color) {
    r.overlay(g => E.font.title(g, str, r.W / 2, y, { scale: scale || 3, colors: [color || '#14a8c8', '#2cc6e6', '#ffffff'], align: 'center' }));
  };
})();
