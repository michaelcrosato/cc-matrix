/* 11b-text: the text box: typed lines at the bottom of the screen, a name tag, a portrait, a voice for each letter,
 * choices on the last page. Confirm shows the rest of a line, then the next; cancel skips the page to its end. */
G.TextBox = class {
  constructor() { this.open = false; this.lines = []; this.i = 0; this.shown = 0; this.choices = null; this.choice = 0; this.t = 0; this.voice = null; this.last = -1; }
  say(text, o) {
    o = o || {};
    this.lines = Array.isArray(text) ? text : [text];
    this.i = 0; this.shown = 0; this.open = true; this.last = -1;
    this.name = o.name || null; this.color = o.color || '#ffd36a'; this.portrait = o.portrait || null;
    this.prof = o.prof || null; this.voice = o.prof ? G.voiceFor(o.prof) : null;
    this.choices = o.choices || null; this.choice = 0; this.onChoice = o.onChoice || null; this.onDone = o.onDone || null;
    this.speed = o.speed || G.T.textSpeed;
    return this;
  }
  page() { return this.lines[this.i] || ''; }
  typing() { return this.shown < this.page().length; }
  update(I, dt) {
    if (!this.open) return false;
    this.t += dt;
    const pg = this.page();
    if (this.typing()) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(pg.length, this.shown + (this.speed || 45) * dt);
      const after = Math.floor(this.shown);
      if (this.voice) for (let k = before; k < after; k++) this.voice(pg[k], k, [pg], null);
    }
    if (I.pressed('confirm') || I.pressed('cancel') && this.typing()) {
      if (this.typing()) { this.shown = pg.length; if (I.consume) I.consume('confirm'); return true; }
      if (this.choices && this.i >= this.lines.length - 1) {
        const pick = this.choice; this.open = false; if (this.onChoice) this.onChoice(pick); if (this.onDone) this.onDone(); return true;
      }
      this.i++; this.shown = 0;
      if (this.i >= this.lines.length) { this.open = false; if (this.onDone) this.onDone(); }
      return true;
    }
    if (this.choices && this.i >= this.lines.length - 1 && !this.typing()) {
      if (I.repeat('up', .3, .12)) this.choice = (this.choice + this.choices.length - 1) % this.choices.length;
      if (I.repeat('down', .3, .12)) this.choice = (this.choice + 1) % this.choices.length;
    }
    return true;
  }
  draw(r) {
    if (!this.open) return;
    const W = r.W, H = r.H, bw = Math.min(W - 16, 400), bh = 62, x = Math.round(W / 2 - bw / 2), y = H - bh - 22;
    const pg = this.page().slice(0, Math.floor(this.shown));
    const lines = G.wrapText(pg, bw - (this.portrait ? 52 : 14), 1);
    r.overlay(g => {
      E.ui.box(g, x, y, bw, bh, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
      if (this.name) { const nw = E.font.width(this.name, { scale: 1 }) + 10; E.ui.box(g, x + 8, y - 10, nw, 12, { bg: ['#2a1240', '#12081e'], border: this.color, alpha: 1 }); E.font.text(g, this.name, x + 13, y - 8, this.color, { scale: 1 }); }
      let ty = y + 8;
      const tx = x + (this.portrait ? 46 : 10);
      for (const ln of lines.slice(0, 3)) { E.font.text(g, ln, tx, ty, '#fff8e8', { shadow: '#000' }); ty += 11; }
      if (!this.typing() && !(this.choices && this.i >= this.lines.length - 1)) E.font.text(g, '▸', x + bw - 12, y + bh - 12, this.color, { scale: 1 });
      if (this.choices && this.i >= this.lines.length - 1 && !this.typing()) {
        this.choices.forEach((c, k) => { const cy = y - 4 - (this.choices.length - k) * 12; E.font.text(g, (k === this.choice ? '▸ ' : '  ') + c, x + bw - 90, cy, k === this.choice ? '#ffd36a' : '#fff8e8', { shadow: '#000' }); });
      }
    });
    if (this.portrait) r.overlay(g => { E.ui.box(g, x + 6, y + 6, 36, 42, { bg: ['#1a3a4a', '#0a1a24'], border: '#f6d38a', alpha: 1 }); this.portrait(g, x + 9, y + 9, 30); });
    if (this.choices) {}
  }
};
G.box = new G.TextBox();
