// Glyphs (PlayStation by default, Xbox by setting, keys and mouse for KB+M: whichever the player used last), the
// 10-foot UI kit (big focus lists, hover focuses, clicks pick, back goes back), and the HUD: player panels, the clock and
// buck icons, banners, score pops, captions, prompts, reticles and the scope lens ring.
(() => {
const B = BB, E = B.E, px = E.px, F = E.font;
const PS = { 0: ['✕', '#7aa8ff', 'cross'], 1: ['○', '#ff6a6a', 'circle'], 2: ['□', '#ff8ad8', 'square'], 3: ['△', '#5ae0a0', 'triangle'], 4: ['L1'], 5: ['R1'], 6: ['L2'], 7: ['R2'], 8: ['CREATE'], 9: ['OPTIONS'], 12: ['UP'], 13: ['DOWN'], 14: ['LEFT'], 15: ['RIGHT'] };
const XB = { 0: ['A', '#5ac85a'], 1: ['B', '#e85a4a'], 2: ['X', '#4a8ae8'], 3: ['Y', '#e8c84a'], 4: ['LB'], 5: ['RB'], 6: ['LT'], 7: ['RT'], 8: ['VIEW'], 9: ['MENU'], 12: ['UP'], 13: ['DOWN'], 14: ['LEFT'], 15: ['RIGHT'] };
B.lastDevice = (input) => { const d = input ? input.lastDevice : 'keyboard'; return d === 'gamepad' ? 'pad' : d === 'touch' ? 'pad' : 'kbm'; };
B.padFamily = () => { const g = B.setting('glyphs') || (E.current && E.current.settings && E.current.settings.glyphs); return g === 'xbox' ? 'xbox' : 'ps'; };
// what to show for an action: { kind: 'pad' | 'key' | 'mouse', text, color, shape }
B.glyphFor = (action, input) => {
  const I = input || (E.current && E.current.input), fam = B.lastDevice(I);
  const codes = I && I.map && I.map[action] ? I.map[action] : [];
  if (fam === 'pad') {
    const pc = codes.find(c => /^Pad\d+$/.test(c)); const n = pc ? +pc.slice(3) : 0, tb = B.padFamily() === 'xbox' ? XB : PS, d = tb[n] || ['?'];
    return { kind: 'pad', text: d[0], color: d[1], shape: d[2], fam: B.padFamily() };
  }
  const mouseUsed = I && I.mouse && I.mouse.t !== undefined && I.lastDevice === 'mouse' || (I && I._bbMouse);
  const mc = codes.find(c => /^Mouse/.test(c));
  if (mc && mouseUsed) return { kind: 'mouse', text: mc === 'Mouse0' ? 'L' : mc === 'Mouse2' ? 'R' : 'M', button: mc };
  const kc = codes.find(c => !/^(Pad|Mouse|Act)/.test(c)) || mc;
  let t = kc ? (I.codeLabel ? I.codeLabel(kc) : kc) : '?';
  t = String(t).replace('Left click', 'L').replace(/^Key/, '');
  if (kc === 'ShiftLeft') t = 'SHIFT'; if (kc === 'Space') t = 'SPACE'; if (kc === 'Escape') t = 'ESC'; if (kc === 'Enter') t = 'ENTER'; if (kc === 'Tab') t = 'TAB';
  return { kind: kc && /^Mouse/.test(kc) ? 'mouse' : 'key', text: t.toUpperCase(), button: kc };
};
// draw a glyph at (x, y) (top-left); returns its width
B.drawGlyph = (g, action, input, x, y, s = 1) => {
  px.reset(g);
  const G = typeof action === 'string' ? B.glyphFor(action, input) : action, h = 11 * s;
  if (G.kind === 'pad') {
    if (G.color) {   // face buttons: a dark disc with the symbol in its colour
      const r = Math.round(5.5 * s), cx = x + r, cy = y + r;
      px.disc(g, cx, cy, r, '#14141c'); px.disc(g, cx, cy, r - 1, '#2a2a36');
      if (G.fam === 'ps') {
        const c = G.color, k = Math.max(2, Math.round(2.5 * s));
        if (G.shape === 'cross') { px.line(g, cx - k, cy - k, cx + k, cy + k, c, Math.max(1, s)); px.line(g, cx - k, cy + k, cx + k, cy - k, c, Math.max(1, s)); }
        else if (G.shape === 'circle') { px.disc(g, cx, cy, k + 1, c); px.disc(g, cx, cy, Math.max(1, k), '#2a2a36'); }
        else if (G.shape === 'square') { px.rect(g, cx - k, cy - k, 2 * k + 1, 2 * k + 1, c); px.rect(g, cx - k + Math.max(1, s), cy - k + Math.max(1, s), 2 * k + 1 - 2 * Math.max(1, s), 2 * k + 1 - 2 * Math.max(1, s), '#2a2a36'); }
        else { px.poly(g, [[cx, cy - k - 1], [cx + k + 1, cy + k], [cx - k - 1, cy + k]], c); if (k > 2) px.poly(g, [[cx, cy - k + 2], [cx + k - 1, cy + k - 1], [cx - k + 1, cy + k - 1]], '#2a2a36'); }
      } else { px.disc(g, cx, cy, r - 1, G.color); F.text(g, G.text, cx, cy - 3 * s, '#ffffff', { align: 'center', scale: s, outline: false, shadow: false }); }
      return r * 2 + 2;
    }
    const w = F.width(G.text, { scale: s }) + 6 * s;   // shoulders, triggers, Options: a pill
    px.rect(g, x, y + 1, w, h - 1, '#14141c'); px.rect(g, x + 1, y + 2, w - 2, h - 3, '#3a3a4a');
    F.text(g, G.text, x + w / 2, y + 2 * s + 1, '#ffffff', { align: 'center', scale: s, outline: false, shadow: false }); return w + 2;
  }
  if (G.kind === 'mouse') {   // a mouse with the button lit
    const w = 8 * s, mh = 11 * s;
    px.rect(g, x, y, w, mh, '#14141c'); px.rect(g, x + 1, y + 1, w - 2, mh - 2, '#d8d8e0'); px.rect(g, x + w / 2, y + 1, 1, mh * .45, '#14141c');
    const lit = G.button === 'Mouse0' ? 0 : G.button === 'Mouse2' ? 1 : -1;
    if (lit >= 0) px.rect(g, x + 1 + lit * (w / 2), y + 1, w / 2 - 1, mh * .45, '#f08030');
    else px.rect(g, x + w / 2 - 1, y + 2, 2, 3 * s, '#f08030');
    return w + 2;
  }
  const w = Math.max(h, F.width(G.text, { scale: s }) + 6 * s);   // a keycap
  px.rect(g, x, y, w, h, '#14141c'); px.rect(g, x + 1, y + 1, w - 2, h - 3, '#e8e4dc'); px.rect(g, x + 1, y + h - 2, w - 2, 1, '#a8a49c');
  F.text(g, G.text, x + w / 2, y + 2 * s, '#1a1a22', { align: 'center', scale: s, outline: false, shadow: false }); return w + 2;
};
// a prompt row: [[action, 'LABEL'], ...] centred at (cx, y)
B.drawPrompts = (g, list, input, cx, y, s = 1, color = '#ffffff') => {
  const parts = list.map(([a, t]) => ({ a, t, w: glyphW(a, input, s) + F.width(t, { scale: s }) + 10 * s }));
  let x = Math.round(cx - parts.reduce((n, p) => n + p.w, 0) / 2);
  for (const p of parts) { const gw = B.drawGlyph(g, p.a, input, x, y, s); F.text(g, p.t, x + gw + 2, y + 2 * s, color, { scale: s, shadow: '#000' }); x += p.w; }
};
function glyphW(a, input, s) { const G = B.glyphFor(a, input); if (G.kind === 'pad') return G.color ? 13 * s : F.width(G.text, { scale: s }) + 8 * s; if (G.kind === 'mouse') return 10 * s; return Math.max(11 * s, F.width(G.text, { scale: s }) + 6 * s) + 2; }
B.glyphW = glyphW;

// ---- text helpers ----
B.clean = s => String(s).replace(/·/g, '•').replace(/✓/g, '★').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
B.text = (g, s, x, y, c = '#ffffff', o = {}) => { px.reset(g); const r = F.text(g, B.clean(s), Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000' }, o)); px.reset(g); return r; };
B.panel = (g, x, y, w, h, o = {}) => { px.reset(g); E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#2a2018', '#14100c'], border: '#c8a060', alpha: o.alpha || .92 }, o)); };
B.title = (g, s, x, y, scale = 3, o = {}) => F.title(g, B.clean(s), Math.round(x), Math.round(y), Object.assign({ scale, colors: ['#fff4c8', '#f0b040', '#c06a20'], outline: '#1a0c06', depth: 2, depthColor: '#5a2a10', align: 'center' }, o));

// ---- the 10-foot list: focus with d-pad, stick, arrows; hover with the mouse; click or confirm picks; cancel backs ----
class List {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.rects = []; this.t = 0; }
  update(input, dt) {
    const I = input, n = this.items.length; this.t += dt; if (!n) return null;
    const usable = k => !this.items[k].disabled;
    const move = d => { let k = this.i; for (let q = 0; q < n; q++) { k = (k + d + n) % n; if (usable(k)) break; } if (k !== this.i) { this.i = k; B.bus.emit('ui', { id: 'focus' }); } };
    const horiz = this.o.horizontal;
    if (I.repeat(horiz ? 'left' : 'up')) move(-1);
    if (I.repeat(horiz ? 'right' : 'down')) move(1);
    const it = this.items[this.i];
    if (it && it.slider && !horiz) { if (I.repeat('left')) { it.slider(-1); B.bus.emit('ui', { id: 'focus' }); } if (I.repeat('right')) { it.slider(1); B.bus.emit('ui', { id: 'focus' }); } }
    // the mouse: hover focuses, click picks
    const p = I.pointer && I.pointer();
    if (p && I.lastDevice === 'mouse' && (!this.lastP || p[0] !== this.lastP[0] || p[1] !== this.lastP[1])) { for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (r && usable(k) && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3] && k !== this.i) { this.i = k; B.bus.emit('ui', { id: 'focus' }); } } }
    this.lastP = p;
    const c = I.clicked && I.clicked();
    if (c) for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (r && usable(k) && c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]) { this.i = k; if (this.items[k].slider) { this.items[k].slider(c[0] > r[0] + r[2] / 2 ? 1 : -1); return null; } B.bus.emit('ui', { id: 'confirm' }); return { pick: this.items[k], i: k }; } }
    if (I.pressed('confirm') && this.t > .15) { if (this.items[this.i].slider && this.items[this.i].onConfirm) { this.items[this.i].onConfirm(); return null; } B.bus.emit('ui', { id: 'confirm' }); return { pick: this.items[this.i], i: this.i }; }
    if (I.pressed('cancel') && this.t > .15) { B.bus.emit('ui', { id: 'back' }); return { back: true }; }
    return null;
  }
  // draw as big cards in a column
  draw(g, x, y, w, o = {}) {
    const h = o.h || 22, gap = o.gap || 4, s = o.scale || 2; this.rects = [];
    const maxRows = o.rows || 99, first = Math.max(0, Math.min(this.i - Math.floor(maxRows / 2), this.items.length - maxRows));
    for (let k = 0; k < this.items.length; k++) {
      if (k < first || k >= first + maxRows) { this.rects[k] = null; continue; }
      const it = this.items[k], yy = y + (k - first) * (h + gap), on = k === this.i;
      this.rects[k] = [x, yy, w, h];
      const pulse = on ? Math.sin(this.t * 6) * .5 + .5 : 0;
      px.reset(g); E.ui.box(g, x, yy, w, h, { bg: on ? ['#6a3a14', '#3a1e0a'] : ['#2a2018', '#1a140e'], border: on ? (pulse > .5 ? '#ffd070' : '#f0a030') : '#5a4a36', alpha: it.disabled ? .5 : .95 });
      if (on) { px.poly(g, [[x - 7, yy + h / 2 - 4], [x - 2, yy + h / 2], [x - 7, yy + h / 2 + 4]], '#ffd070'); }
      const label = typeof it.label === 'function' ? it.label() : it.label;
      F.text(g, B.clean(label), x + 8, yy + (h - 7 * s) / 2, it.disabled ? '#8a7a6a' : on ? '#fff4d0' : '#e8dcc8', { scale: s, shadow: '#000' });
      if (it.value) { const v = typeof it.value === 'function' ? it.value() : it.value; F.text(g, B.clean(v), x + w - (it.bar !== undefined ? 92 : 8), yy + (h - 7 * s) / 2, on ? '#ffd070' : '#c8b898', { scale: s, align: 'right', shadow: '#000' }); }
      if (it.bar !== undefined) { const v = typeof it.bar === 'function' ? it.bar() : it.bar; px.rect(g, x + w - 84, yy + h / 2 - 2, 76, 4, '#14100c'); px.rect(g, x + w - 84, yy + h / 2 - 2, Math.round(76 * B.clamp(v, 0, 1)), 4, on ? '#ffd070' : '#a08050'); }
    }
  }
}
B.List = List;

// ---- reticles: a shape per player as well as a colour ----
B.drawReticle = (g, p, x, y, o = {}) => {
  px.reset(g);
  x = Math.round(x); y = Math.round(y);
  const c = p.benched ? '#808080' : o.ghost ? E.mix(p.color, '#ffffff', .2) : p.color, d = '#000000', b = Math.round(p.bloom * 3), sh = p.dry > 0 ? Math.round(Math.sin(p.dry * 60) * 2) : 0;
  x += sh;
  const L = (x0, y0, x1, y1) => { px.line(g, x0 + 1, y0 + 1, x1 + 1, y1 + 1, d); px.line(g, x0, y0, x1, y1, c); };
  const r = 6 + b;
  if (p.shape === 'circle') { for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2, X = Math.round(x + Math.cos(t) * r), Y = Math.round(y + Math.sin(t) * r); px.rect(g, X + 1, Y + 1, 1, 1, d); px.rect(g, X, Y, 1, 1, c); } L(x - r - 3, y, x - 3, y); L(x + 3, y, x + r + 3, y); L(x, y - r - 3, x, y - 3); L(x, y + 3, x, y + r + 3); }
  else if (p.shape === 'diamond') { L(x, y - r - 1, x + r + 1, y); L(x + r + 1, y, x, y + r + 1); L(x, y + r + 1, x - r - 1, y); L(x - r - 1, y, x, y - r - 1); }
  else if (p.shape === 'brackets') { L(x - r, y - r, x - r + 3, y - r); L(x - r, y - r, x - r, y - r + 3); L(x + r, y - r, x + r - 3, y - r); L(x + r, y - r, x + r, y - r + 3); L(x - r, y + r, x - r + 3, y + r); L(x - r, y + r, x - r, y + r - 3); L(x + r, y + r, x + r - 3, y + r); L(x + r, y + r, x + r, y + r - 3); }
  else { L(x, y - r - 1, x + r + 1, y + r); L(x + r + 1, y + r, x - r - 1, y + r); L(x - r - 1, y + r, x, y - r - 1); }
  px.rect(g, x, y, 1, 1, c);
  if (p.benched) B.text(g, 'BENCHED', x, y + r + 4, '#c0c0c0', { align: 'center' });
  if (o.name) B.text(g, o.name, x, y + r + 4, c, { align: 'center' });
};

// ---- HUD state: banners, pops, captions ----
const HUD = B.HUD = { banners: [], pops: [], captions: [], flashes: [] };
B.clearHud = () => { HUD.banners.length = 0; HUD.pops.length = 0; HUD.captions.length = 0; };
B.bus.on('banner', e => { HUD.banners = HUD.banners.filter(b => b.pri > (e.pri || 1)); HUD.banners.push({ text: e.text, color: e.color || '#ffd040', t: 0, life: e.life || 1.1, pri: e.pri || 1, sub: e.sub }); B.bus.emit('sound', { id: 'whoosh' }); });
B.bus.on('pop', e => { HUD.pops.push({ text: e.label, color: e.color, at: e.at, t: 0, life: 1.6 }); if (HUD.pops.length > 8) HUD.pops.shift(); });
B.bus.on('caption', e => { const who = B.CAST[e.who] || { name: e.who.toUpperCase(), color: '#ffffff' }; HUD.captions = HUD.captions.filter(c => c.t < c.life - .2).slice(-1); HUD.captions.push({ name: who.name, color: who.color, line: e.line, t: 0, life: Math.max(2.4, e.line.length * .07 + 1), who: e.who }); B.bus.emit('voice', { who: e.who, line: e.line }); });
B.stepHud = dt => { for (const l of [HUD.banners, HUD.pops, HUD.captions]) { for (const b of l) b.t += dt; } HUD.banners = HUD.banners.filter(b => b.t < b.life); HUD.pops = HUD.pops.filter(b => b.t < b.life); HUD.captions = HUD.captions.filter(b => b.t < b.life); };

B.CAST = {
  emcee: { name: 'EMCEE', color: '#ffd040' }, dub: { name: 'UNCLE DUB', color: '#f08030' }, granny: { name: 'GRANNY MAE', color: '#f0a0c8' },
  dwayne: { name: 'COUSIN DWAYNE', color: '#a0c860' }, loretta: { name: 'LORETTA', color: '#ff7060' }, earl: { name: 'BIG EARL', color: '#80b0ff' }
};

// ---- drawing the HUD for a play ----
B.drawHud = (g, W, H, play, o = {}) => {
  const site = play.site; if (!site) return;
  const big = B.setting('bigCaptions') ? 2 : 1, corner = o.corner;
  // top centre: site name, clock, buck icons
  if (!o.noTop) {
    const left = Math.max(0, site.timeLimit - site.t), name = site.def.name.toUpperCase();
    B.text(g, name, W / 2, 5, '#f0e0c0', { align: 'center' });
    B.text(g, o.clock !== undefined ? o.clock : B.mmss(left), W / 2, 14, left < 10 && !o.clock ? (Math.floor(site.t * 4) % 2 ? '#ff5040' : '#ffffff') : '#ffffff', { align: 'center', scale: 2 });
    const icons = o.icons || B.buckIcons(site), iw = 12, x0 = W / 2 - icons.length * iw / 2;
    icons.forEach((ic, k) => B.drawAntlerIcon(g, x0 + k * iw + 1, 31, ic));
  }
  // player panels: P1 bottom left, P2 bottom right, P3 top left, P4 top right
  for (const p of play.players) {
    if (p.ghost) continue;
    const right = p.n === 1 || p.n === 3, top = p.n >= 2, pw = 112, ph = 30;
    const x = right ? W - pw - 6 : 6, y = top ? 6 : H - ph - 6;
    if (top && right && corner) continue;
    E.ui.box(g, x, y, pw, ph, { bg: ['#1a140e', '#0a0806'], border: p.benched ? '#606060' : p.color, alpha: .7 });
    B.drawReticle(g, Object.assign({}, p, { bloom: 0, dry: 0, benched: false }), x + 10, y + 10);
    B.text(g, B.fmt(p.site.score), x + 22, y + 4, '#ffffff', { scale: 2 });
    // shells and the chamber light
    for (let k = 0; k < p.tube; k++) { const full = k < p.rounds; px.rect(g, x + 22 + k * 6, y + 20, 4, 7, full ? '#c82a1a' : '#3a2a20'); px.rect(g, x + 22 + k * 6, y + 25, 4, 2, full ? '#e0b040' : '#4a3a28'); }
    px.disc(g, x + 22 + p.tube * 6 + 4, y + 23, 2, p.chambered ? '#60ff60' : p.rack > 0 || p.reload > 0 ? '#ffd040' : '#602020');
    // calls (horn icons)
    for (let k = 0; k < Math.min(5, p.calls); k++) { const hx = x + pw - 10 - k * 8, hy = y + 6; px.poly(g, [[hx, hy], [hx + 6, hy - 2], [hx + 6, hy + 4]], '#e8d8a8'); px.rect(g, hx - 2, hy, 2, 2, '#a08050'); }
    if (p.benched) B.text(g, 'BENCHED', x + pw - 6, y + 18, '#ff6050', { align: 'right' });
    if (p.reload > 0) B.text(g, 'RELOADING', x + pw - 6, y + 18, '#ffd040', { align: 'right' });
  }
  // world pops
  for (const pp of HUD.pops) { const P = pp.at && site.lens.project(pp.at[0], pp.at[1], pp.at[2] + 1); if (!P) continue; const k = pp.t / pp.life; B.text(g, pp.text, P[0], P[1] - 10 - k * 18, pp.color, { align: 'center', outline: k < .8 }); }
  // banners
  for (const b of HUD.banners) {
    const k = b.t / b.life, sc = b.text.length > 12 ? 3 : 4, yy = H * .3 + (k < .12 ? (1 - k / .12) * -20 : 0);
    if (k > .85 && Math.floor(b.t * 20) % 2) continue;
    B.title(g, b.text, W / 2, yy, Math.min(sc, Math.floor(W / (F.width(b.text) + 4))), { colors: ['#ffffff', b.color, E.shade(b.color, -.35)] });
    if (b.sub) B.text(g, b.sub, W / 2, yy + 34, '#ffffff', { align: 'center' });
  }
  // captions
  const cap = HUD.captions[HUD.captions.length - 1];
  if (cap) {
    const lines = F.wrap(cap.line, W * .7 / big), lh = 9 * big, bh = 12 + lines.length * lh, by = H - (o.captionY || 48) - bh;
    px.blend(g, .7, 'normal', () => px.rect(g, W * .12, by, W * .76, bh, '#0a0806'));
    B.text(g, cap.name, W * .12 + 4, by + 2, cap.color);
    lines.forEach((l, i) => B.text(g, l, W / 2, by + 11 + i * lh, '#ffffff', { align: 'center', scale: big }));
  }
};
// buck icons: hollow = to come, filled in the bagger's colour, crossed = escaped or lost; gold for a trophy
B.buckIcons = site => {
  const out = [], legal = site.herd.list.filter(a => a.cat === 'animal' && a.legal);
  for (const a of legal) out.push(a.dead ? { fill: B.SEATS[a.bagger] || '#ffffff', gold: !!a.trophy } : a.gone ? { crossed: true, gold: !!a.trophy } : { live: true, gold: !!a.trophy });
  const want = Math.max(site.scheduled, site.spawnedLegal) + (site.def.trophy ? 1 : 0);
  while (out.length < want) out.push({ gold: !!site.def.trophy && !out.some(o => o.gold) });
  return out;
};
B.drawAntlerIcon = (g, x, y, ic) => {
  const c = ic.fill || (ic.gold ? '#f0c030' : ic.live ? '#f0e0c0' : '#7a6a58');
  const P = [[1, 0], [1, 1], [2, 2], [3, 3], [3, 4], [4, 5], [6, 5], [7, 4], [7, 3], [8, 2], [9, 1], [9, 0], [3, 1], [7, 1], [5, 6], [5, 7]];
  for (const [a, b] of P) { px.rect(g, x + a + 1, y + b + 1, 1, 1, '#000'); px.rect(g, x + a, y + b, 1, 1, c); }
  if (ic.fill) px.rect(g, x + 3, y + 5, 4, 3, c);
  if (ic.crossed) { px.line(g, x - 1, y - 1, x + 10, y + 9, '#ff4030'); px.line(g, x + 10, y - 1, x - 1, y + 9, '#ff4030'); }
};
})();
