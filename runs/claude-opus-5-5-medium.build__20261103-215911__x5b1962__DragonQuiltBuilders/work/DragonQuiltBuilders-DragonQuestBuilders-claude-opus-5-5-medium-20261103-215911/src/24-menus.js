// Menus: the Satchel (Bag, Map, Journal), crafting, chests, travel, the Banner screen, About & Credits.
// Every screen is a small state machine (focus, tab, scroll) driven by input actions; hover moves focus, clicks pick.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16, UI = () => DQ.UI, GL = () => DQ.Glyphs;

class Screen {
  constructor(ui, data) { this.ui = ui; this.ctx = ui.ctx; this.data = data || {}; this.focus = 0; this.rects = []; this._pp = null; this.t = 0; }
  get game() { return this.ctx.game; }
  hit(x, y, w, h, id) { this.rects.push([x, y, w, h, id]); }
  at(p) { if (!p) return null; for (let i = this.rects.length - 1; i >= 0; i--) { const [x, y, w, h, id] = this.rects[i]; if (p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) return id; } return null; }
  // the id under a pointer that moved (hover moves focus), and the id clicked this step
  hover(I) { const p = I.lastDevice === 'mouse' ? I.pointer() : null; if (!p) return null; const moved = !this._pp || p[0] !== this._pp[0] || p[1] !== this._pp[1]; this._pp = p.slice(); return moved ? this.at(p) : null; }
  click(I) { return this.at(I.clicked()); }
  sfx(n) { this.ctx.audioX && this.ctx.audioX.sfx(n); }
  update(dt) { this.t += dt; }
  begin() { this.rects = []; }
}
DQ.Screen = Screen;

// a vertical list of entries: { label, sub, icon, disabled, act, right } ; act() runs on confirm or click
class ListScreen extends Screen {
  constructor(ui, data) { super(ui, data); this.items = data.items || []; this.title = data.title || ''; this.scroll = 0; this.per = data.per || 7; }
  update(dt) {
    super.update(dt); const I = this.game.input, n = this.items.length; if (!n) { if (I.pressed('cancel')) this.ui.back(); return; }
    if (I.repeat('up')) { this.focus = (this.focus + n - 1) % n; this.sfx('uiMove'); }
    if (I.repeat('down')) { this.focus = (this.focus + 1) % n; this.sfx('uiMove'); }
    const it = this.items[this.focus];
    if (it && it.adjust && (I.repeat('left') || I.repeat('right'))) { it.adjust(I.repeat('left') ? -1 : 1); this.sfx('uiMove'); }
    const ws = I.wheelSteps(); if (ws) this.focus = E.clamp(this.focus + ws, 0, n - 1);
    const h = this.hover(I); if (h !== null && typeof h === 'number' && h !== this.focus) { this.focus = h; this.sfx('uiMove'); }
    const c = this.click(I);
    if (typeof c === 'number') this.focus = c;
    if (c === 'back') { this.ui.back(); return; }
    if (typeof c === 'string' && c.startsWith('adj')) { const [, i, d] = c.split(':'); const q = this.items[+i]; if (q && q.adjust) q.adjust(+d); return; }
    if ((I.pressed('confirm') || typeof c === 'number') && it && !it.disabled && it.act) { this.sfx('uiConfirm'); it.act(this); return; }
    if (I.pressed('cancel')) { this.sfx('uiCancel'); this.ui.back(); }
    this.scroll = E.clamp(this.scroll, Math.max(0, this.focus - this.per + 1), Math.min(this.focus, Math.max(0, n - this.per)));
  }
  draw(g, W, H) {
    this.begin(); const ui = UI(), w = this.data.w || 260, rowH = 18, n = this.items.length, vis = Math.min(this.per, n), h = 34 + vis * rowH + (this.data.foot ? 14 : 0), x = Math.round(W / 2 - w / 2), y = Math.round(this.data.y !== undefined ? this.data.y : H / 2 - h / 2);
    ui.panel(g, x, y, w, h);
    if (this.title) E.font.title(g, this.title, W / 2, y + 6, { scale: 2, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', align: 'center' });
    for (let k = 0; k < vis; k++) {
      const i = k + this.scroll, it = this.items[i], ry = y + 28 + k * rowH, sel = i === this.focus;
      if (sel) { px.rect(g, x + 6, ry - 2, w - 12, rowH - 1, '#3a3270'); ui.sel(g, x + 6, ry - 2, w - 12, rowH - 1, this.t); }
      let tx = x + 14; if (it.icon) { const ic = DQ.Icons.get(it.icon, 12); if (ic) g.drawImage(ic, tx, ry); tx += 16; }
      ui.text(g, it.label, tx, ry + 2, it.disabled ? '#6a6488' : sel ? '#ffd36a' : '#ffffff');
      if (it.right !== undefined) { const r = typeof it.right === 'function' ? it.right() : it.right; const rw = E.font.width(r); ui.text(g, r, x + w - 16 - rw, ry + 2, '#c8c0e0'); if (it.adjust) { ui.text(g, '←', x + w - 26 - rw, ry + 2, '#8a84b0'); this.hit(x + w - 30 - rw, ry - 2, 12, rowH - 1, 'adj:' + i + ':-1'); this.hit(x + w - 16, ry - 2, 12, rowH - 1, 'adj:' + i + ':1'); ui.text(g, '→', x + w - 12, ry + 2, '#8a84b0'); } }
      if (it.sub && sel) ui.text(g, it.sub, x + 14, y + h - 12, '#c8c0e0', { font: 'tiny' });
      this.hit(x + 6, ry - 2, w - 12, rowH - 1, i);
    }
    if (n > vis) { if (this.scroll > 0) ui.center(g, '↑', x + w - 10, y + 22, '#ffd36a'); if (this.scroll + vis < n) ui.center(g, '↓', x + w - 10, y + h - 14, '#ffd36a'); }
    if (this.data.foot) GL().text(g, this.game, this.data.foot, x + 10, y + h - 12, '#c8c0e0');
  }
}
DQ.ListScreen = ListScreen;

// ---- the Satchel: Bag | Map | Journal ----
class Satchel extends Screen {
  constructor(ui, data) { super(ui, data); this.tab = data.tab || 0; this.cat = 0; this.slot = 0; this.row = 'grid'; this.mapZ = 2; this.mapX = null; this.mapY = null; this.jq = 0; this.jpage = 0; this.dropHeld = 0; }
  update(dt) {
    super.update(dt); const I = this.game.input, b = this.ctx.builder;
    if (I.pressed('tabPrev') || I.pressed('hotPrev')) { this.tab = (this.tab + 2) % 3; this.sfx('uiMove'); }
    if (I.pressed('tabNext') || I.pressed('hotNext')) { this.tab = (this.tab + 1) % 3; this.sfx('uiMove'); }
    if (I.pressed('satchel') || I.pressed('cancel') || (this.tab === 1 && I.pressed('map')) || (this.tab === 2 && I.pressed('journal'))) { this.sfx('uiCancel'); this.ui.back(); return; }
    const c = this.click(I), h = this.hover(I);
    if (typeof c === 'string' && c.startsWith('tab:')) { this.tab = +c.slice(4); return; }
    if (this.tab === 0) this._bag(I, b, c, h);
    else if (this.tab === 1) this._map(I, dt, c);
    else this._journal(I, c, h);
  }
  items() { return this.ctx.builder.bag.byCat(DQ.CATS[this.cat]); }
  _bag(I, b, c, h) {
    const list = this.items(), n = list.length;
    if (typeof h === 'string' && h.startsWith('slot:')) this.slot = +h.slice(5), this.row = 'grid';
    if (typeof h === 'string' && h.startsWith('cat:')) this.row = 'cats';
    if (typeof c === 'string' && c.startsWith('cat:')) { this.cat = +c.slice(4); this.slot = 0; this.row = 'cats'; this.sfx('uiMove'); return; }
    if (c === 'pocket') { this.ui.open('craft', { station: 'pocket' }); return; }
    if (this.row === 'cats') {
      if (I.repeat('left')) { this.cat = (this.cat + 5) % 6; this.slot = 0; this.sfx('uiMove'); }
      if (I.repeat('right')) { this.cat = (this.cat + 1) % 6; this.slot = 0; this.sfx('uiMove'); }
      if (I.repeat('down')) { this.row = 'grid'; this.slot = 0; }
      if (I.pressed('confirm')) this.row = 'grid';
      if (I.repeat('up')) this.row = 'pocket';
      return;
    }
    if (this.row === 'pocket') { if (I.repeat('down')) this.row = 'cats'; if (I.pressed('confirm')) this.ui.open('craft', { station: 'pocket' }); return; }
    if (I.repeat('left')) this.slot = Math.max(0, this.slot - 1); if (I.repeat('right')) this.slot = Math.min(Math.max(0, n - 1), this.slot + 1);
    if (I.repeat('up')) { if (this.slot < 6) this.row = 'cats'; else this.slot -= 6; }
    if (I.repeat('down')) this.slot = Math.min(Math.max(0, n - 1), this.slot + 6);
    const ws = I.wheelSteps(); if (ws) this.slot = E.clamp(this.slot + ws, 0, Math.max(0, n - 1));
    this.slot = Math.min(this.slot, Math.max(0, n - 1));
    const e = list[this.slot]; if (!e) return;
    const it = DQ.ITEMS[e.id];
    if (typeof c === 'string' && c.startsWith('slot:') && +c.slice(5) === this.slot && this._lastClick === this.slot && this.t - (this._lct || 0) < .4) this.assign(e.id);
    if (typeof c === 'string' && c.startsWith('slot:')) { this._lastClick = +c.slice(5); this._lct = this.t; this.slot = +c.slice(5); }
    if (I.pressed('confirm') || c === 'assign') this.assign(e.id);
    if (I.pressed('place') || c === 'use') this.use(e.id);
    if (I.pressed('drop') || c === 'drop') { if (!it.keyItem && it.kind !== 'weapon') { b.bag.remove(e.id, 1); this.ctx.drops.spawn(e.id, 1, b.body.x + Math.cos(b.body.facing) * 12, b.body.y + Math.sin(b.body.facing) * 12, b.body.z + 10); this.sfx('uiMove'); } }
  }
  assign(id) { const b = this.ctx.builder, it = DQ.ITEMS[id]; if (it.kind === 'material' && !it.food) { this.ctx.hud.hint('Materials are for crafting.'); return; } const i = b.hotbar.indexOf(id); if (i >= 0) b.hotbar[i] = null; b.hotbar[b.sel] = id; b.sel = (b.sel + 1) % 8; this.sfx('uiConfirm'); }
  use(id) { const b = this.ctx.builder, it = DQ.ITEMS[id]; if (it.kind === 'food') b.eat(id); else if (['weapon', 'body', 'shield'].includes(it.kind)) { b.setEquip(it.kind === 'weapon' ? 'weapon' : it.kind, id); this.sfx('uiConfirm'); } else if (it.kind === 'use') { this.ui.close(); b.use(id); } }
  _map(I, dt, c) {
    const b = this.ctx.builder, w = this.ctx.world;
    if (this.mapX === null) { this.mapX = b.body.x / T; this.mapY = b.body.y / T; }
    const m = I.move(); this.mapX += m[0] * dt * 60 / this.mapZ; this.mapY += m[1] * dt * 60 / this.mapZ;
    if (I.pressed('sprint') || I.wheelSteps() < 0) this.mapZ = Math.min(4, this.mapZ + .5); if (I.pressed('eye') || I.wheelSteps() > 0) this.mapZ = Math.max(1, this.mapZ - .5);
    const pan = I.pan && I.pan(); if (pan) { this.mapX -= pan[0] / this.mapZ; this.mapY -= pan[1] / this.mapZ; }
    const box = I.box && I.box(); if (box && !box.done && this._mapRect) { /* drag pans */ }
    if (I.pressed('confirm') || c === 'map') {
      let tx = this.mapX, ty = this.mapY;
      if (c === 'map' && I.clicked() && this._mapRect) { const [mx, my, mw, mh] = this._mapRect, p = I.clicked(); tx = this.mapX + (p[0] - (mx + mw / 2)) / this.mapZ; ty = this.mapY + (p[1] - (my + mh / 2)) / this.mapZ; }
      this.ctx.waypoint = [Math.floor(tx), Math.floor(ty)]; this.sfx('uiConfirm');
    }
    this.mapX = E.clamp(this.mapX, 0, w.W); this.mapY = E.clamp(this.mapY, 0, w.D);
  }
  _journal(I, c, h) {
    const qs = this._quests();
    if (typeof h === 'number') this.jq = h;
    if (I.repeat('up')) this.jq = Math.max(0, this.jq - 1); if (I.repeat('down')) this.jq = Math.min(qs.length, this.jq + 1);
    if (typeof c === 'number') this.jq = c;
    const q = qs[this.jq];
    if ((I.pressed('confirm') || typeof c === 'number') && q && this.ctx.quests.st(q.id).state !== 'done') { this.ctx.quests.track[q.id] = this.ctx.quests.track[q.id] === false; this.sfx('uiConfirm'); }
    if (I.repeat('left') || I.repeat('right') || c === 'notions') this.jpage = 1 - this.jpage;
  }
  _quests() { const Q = this.ctx.quests; return DQ.QUESTS.filter(q => ['active', 'turnin'].includes(Q.st(q.id).state)).concat(DQ.QUESTS.filter(q => Q.st(q.id).state === 'done')); }
  draw(g, W, H) {
    this.begin(); const ui = UI(), w = Math.min(W - 16, 400), h = Math.min(H - 16, 224), x = Math.round(W / 2 - w / 2), y = Math.round(H / 2 - h / 2);
    ui.panel(g, x, y, w, h);
    const tabs = ['Bag', 'Map', 'Journal']; let tx = x + w / 2 - 110;
    GL().draw(g, this.game, 'tabPrev', tx - 16, y + 7);
    tabs.forEach((s, i) => { const tw = 70, sel = i === this.tab; px.rect(g, tx, y + 5, tw, 14, sel ? '#4a3a7a' : '#221c40'); if (sel) ui.sel(g, tx, y + 5, tw, 14, this.t); ui.center(g, s, tx + tw / 2, y + 8, sel ? '#ffd36a' : '#c8c0e0'); this.hit(tx, y + 5, tw, 14, 'tab:' + i); tx += tw + 4; });
    GL().draw(g, this.game, 'tabNext', tx + 2, y + 7);
    if (this.tab === 0) this._drawBag(g, x, y + 24, w, h - 24);
    else if (this.tab === 1) this._drawMap(g, x, y + 24, w, h - 24);
    else this._drawJournal(g, x, y + 24, w, h - 24);
  }
  _drawBag(g, x, y, w, h) {
    const ui = UI(), b = this.ctx.builder, list = this.items();
    // pocket notions and the category strip
    const pw = 92; px.rect(g, x + 8, y, pw, 13, this.row === 'pocket' ? '#4a3a7a' : '#221c40'); ui.text(g, 'Pocket Notions', x + 13, y + 3, this.row === 'pocket' ? '#ffd36a' : '#ffffff'); this.hit(x + 8, y, pw, 13, 'pocket'); if (this.row === 'pocket') ui.sel(g, x + 8, y, pw, 13, this.t);
    let cx = x + 8; const cy = y + 16;
    DQ.CATS.forEach((c, i) => { const cw = Math.max(30, E.font.width(c, { font: 'tiny' }) + 8), sel = i === this.cat; px.rect(g, cx, cy, cw, 12, sel ? '#4a3a7a' : '#221c40'); ui.text(g, c, cx + 4, cy + 3, sel ? '#ffd36a' : '#c8c0e0', { font: 'tiny' }); if (sel && this.row === 'cats') ui.sel(g, cx, cy, cw, 12, this.t); this.hit(cx, cy, cw, 12, 'cat:' + i); cx += cw + 2; });
    // the 6 x 4 grid
    const gx = x + 8, gy = y + 32, S = 26;
    for (let i = 0; i < 24; i++) {
      const e = list[i], sx = gx + (i % 6) * (S + 2), sy = gy + Math.floor(i / 6) * (S + 2), sel = i === this.slot && this.row === 'grid';
      px.rect(g, sx, sy, S, S, sel ? '#4a3a7a' : '#1a1430'); px.rect(g, sx, sy, S, 1, '#0a0814');
      if (e) { const ic = DQ.Icons.get(e.id, 20); if (ic) g.drawImage(ic, sx + 3, sy + 2); if (!DQ.ITEMS[e.id].keyItem || e.n > 1) ui.text(g, String(e.n), sx + S - 2 - E.font.width(String(e.n), { font: 'tiny' }), sy + S - 7, '#ffffff', { font: 'tiny', outline: '#000', shadow: false }); if (b.hotbar.includes(e.id)) px.rect(g, sx + 2, sy + 2, 3, 3, '#ffd36a'); if (Object.values(b.equip).includes(e.id)) E.font.text(g, 'E', sx + 2, sy + 2, '#6ae06a', { font: 'tiny' }); }
      if (sel) ui.sel(g, sx - 1, sy - 1, S + 2, S + 2, this.t);
      this.hit(sx, sy, S, S, 'slot:' + i);
    }
    // the detail pane
    const dx = gx + 6 * (S + 2) + 6, dw = x + w - dx - 8, e = list[this.slot];
    ui.panel(g, dx, y, dw, h - 22, { bg: ['#221c40', '#16122c'] });
    if (e) {
      const it = DQ.ITEMS[e.id], ic = DQ.Icons.get(e.id, 16);
      if (ic) { g.imageSmoothingEnabled = false; g.drawImage(ic, dx + dw / 2 - 24, y + 8, 48, 48); }
      ui.center(g, it.name, dx + dw / 2, y + 60, '#ffd36a');
      E.font.wrap(it.desc, dw - 14).slice(0, 4).forEach((ln, i) => ui.text(g, ln, dx + 7, y + 74 + i * 10, '#ffffff'));
      ui.text(g, 'You have ' + e.n, dx + 7, y + 118, '#c8c0e0');
      const acts = [];
      if (it.kind !== 'material' || it.food) acts.push(['assign', '{btn:confirm} To hotbar']);
      if (it.food) acts.push(['use', '{btn:place} Eat']); else if (['weapon', 'body', 'shield'].includes(it.kind)) acts.push(['use', '{btn:place} Equip']); else if (it.kind === 'use') acts.push(['use', '{btn:place} Use']);
      if (!it.keyItem && it.kind !== 'weapon') acts.push(['drop', '{btn:drop} Drop 1']);
      acts.forEach(([id, s], i) => { const ay = y + h - 66 + i * 13; GL().text(g, this.game, s, dx + 7, ay, '#ffffff'); this.hit(dx + 4, ay - 2, dw - 8, 12, id); });
    } else ui.center(g, 'Nothing here yet.', dx + dw / 2, y + 60, '#8a84b0');
    GL().text(g, this.game, '{btn:satchel} Close   {btn:hotbar} Tabs', x + 8, y + h - 16, '#c8c0e0');
  }
  _mapCanvas() {
    const ctx = this.ctx, w = ctx.world; if (this._mc && this.t - this._mct < 2) return this._mc; this._mct = this.t;
    const c = this._mc || (this._mc = E.mkCanvas(w.W, w.D)), g = c.getContext('2d'), img = g.createImageData(w.W, w.D), d = img.data, ex = ctx.explored;
    for (let y = 0; y < w.D; y++) for (let x = 0; x < w.W; x++) {
      const i = (y * w.W + x) * 4, t = w.topZ(x, y); let col;
      if (ex && !ex[y * w.W + x]) col = (x + y) % 2 ? [226, 214, 186] : [218, 205, 176];
      else if (!t) col = [16, 14, 46];
      else { const id = w.get(x, y, t - 1), bk = DQ.BLOCKS[id]; col = E.hex(bk ? bk.col : '#808080'); const k = .7 + t / w.H * .5; col = col.map(v => v * k); if (w.liquidAt(x, y, t)) col = [74, 138, 208]; const o = w.objAt(x, y, t); if (o && o.def.plant) col = col.map(v => v * .85); }
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return c;
  }
  _drawMap(g, x, y, w, h) {
    const ui = UI(), ctx = this.ctx, b = ctx.builder, Z = this.mapZ, mw = w - 16, mh = h - 26, mx = x + 8, my = y;
    this._mapRect = [mx, my, mw, mh]; this.hit(mx, my, mw, mh, 'map');
    const c = this._mapCanvas(); g.save(); g.beginPath(); g.rect(mx, my, mw, mh); g.clip();
    px.rect(g, mx, my, mw, mh, '#0c0a24');
    const ox = mx + mw / 2 - (this.mapX === null ? b.body.x / T : this.mapX) * Z, oy = my + mh / 2 - (this.mapY === null ? b.body.y / T : this.mapY) * Z;
    g.imageSmoothingEnabled = false; g.drawImage(c, Math.round(ox), Math.round(oy), c.width * Z, c.height * Z);
    const M = (wx, wy) => [ox + wx * Z, oy + wy * Z];
    // markers: portals, residents, the banner, quest targets, the bundle, the waypoint, you
    for (const o of ctx.objects.list) { if (o.def.portal && ctx.objects.discovered.has(o.portalId)) { const [sx, sy] = M(o.x + .5, o.y + .5); px.disc(g, sx, sy, 3, '#c8a0ff'); px.dot(g, sx, sy, '#ffffff'); } if (o.def.banner) { const [sx, sy] = M(o.x + .5, o.y + .5); px.rect(g, sx - 1, sy - 6, 2, 7, '#8a5a32'); px.rect(g, sx + 1, sy - 6, 4, 3, '#d04a4a'); } if (o.def.bundle) { const [sx, sy] = M(o.x + .5, o.y + .5); px.disc(g, sx, sy, 2.5, '#c87a4a'); } }
    if (ctx.quests && ctx.quests.active('s3')) for (const o of ctx.objects.filter(q => q.id === 'ancientButton')) { const reg = DQ.regionAt(o.x, o.y), cx = { coast: [22, 120], crags: [44, 12], tweedwood: [128, 48] }[reg] || [o.x, o.y]; const [sx, sy] = M(cx[0], cx[1]); ui.text(g, '?', sx - 2, sy - 3, '#ffd84a'); }
    for (const n of ctx.npcs.list) { const [sx, sy] = M(n.body.x / T, n.body.y / T); px.disc(g, sx, sy, 2, '#6ae06a'); }
    const ob = ctx.quests.objective(); if (ob && ob.target) { const [sx, sy] = M(ob.target[0] / T, ob.target[1] / T); px.poly(g, [[sx, sy - 4], [sx + 3, sy], [sx, sy + 4], [sx - 3, sy]], '#ffd84a'); }
    if (ctx.waypoint) { const [sx, sy] = M(ctx.waypoint[0] + .5, ctx.waypoint[1] + .5); px.line(g, sx - 3, sy - 3, sx + 3, sy + 3, '#ff6a6a', 2); px.line(g, sx + 3, sy - 3, sx - 3, sy + 3, '#ff6a6a', 2); }
    const [bx, by] = M(b.body.x / T, b.body.y / T), fa = b.body.facing;
    px.poly(g, [[bx + Math.cos(fa) * 5, by + Math.sin(fa) * 5], [bx + Math.cos(fa + 2.4) * 4, by + Math.sin(fa + 2.4) * 4], [bx + Math.cos(fa - 2.4) * 4, by + Math.sin(fa - 2.4) * 4]], '#ffffff');
    g.restore();
    const reg = DQ.WORLD.regions[DQ.regionAt(Math.floor(b.body.x / T), Math.floor(b.body.y / T))];
    ui.text(g, reg ? reg.name : '', x + 10, y + h - 22, '#ffd36a');
    GL().text(g, this.game, '{btn:move} Pan  {btn:sprint}{btn:eye} Zoom  {btn:confirm} Waypoint', x + 100, y + h - 22, '#c8c0e0');
  }
  _drawJournal(g, x, y, w, h) {
    const ui = UI(), Q = this.ctx.quests, qs = this._quests();
    px.rect(g, x + w - 92, y, 84, 13, '#221c40'); ui.text(g, this.jpage ? '← Quests' : 'Notions →', x + w - 86, y + 3, '#c8c0e0'); this.hit(x + w - 92, y, 84, 13, 'notions');
    if (this.jpage) {
      const known = DQ.RECIPES.filter(r => this.ctx.crafting.knows(r.id));
      ui.text(g, 'Notions known: ' + known.length + ' / ' + DQ.RECIPES.length, x + 10, y + 3, '#ffd36a');
      known.slice(0, 36).forEach((r, i) => { const cx = x + 10 + (i % 3) * 128, cy = y + 18 + Math.floor(i / 3) * 14; const ic = DQ.Icons.get(r.out, 10); if (ic) g.drawImage(ic, cx, cy); ui.text(g, DQ.ITEMS[r.out].name, cx + 13, cy + 1, '#ffffff', { font: 'tiny' }); ui.text(g, DQ.STATIONS[r.station].split(' ').pop(), cx + 13 + E.font.width(DQ.ITEMS[r.out].name, { font: 'tiny' }) + 4, cy + 1, '#8a84b0', { font: 'tiny' }); });
      return;
    }
    const lw = 150;
    qs.slice(0, 14).forEach((q, i) => { const s = Q.st(q.id), sel = i === this.jq, ry = y + 3 + i * 13; if (sel) { px.rect(g, x + 6, ry - 2, lw, 12, '#3a3270'); ui.sel(g, x + 6, ry - 2, lw, 12, this.t); } const done = s.state === 'done'; if (done) GL().tick(g, x + 9, ry, true); else if (Q.track[q.id] !== false) px.rect(g, x + 10, ry + 2, 3, 3, '#ffd36a'); ui.text(g, q.title, x + 20, ry, done ? '#8a84b0' : q.side ? '#bfe8ff' : '#ffffff'); this.hit(x + 6, ry - 2, lw, 12, i); });
    const q = qs[this.jq]; const dx = x + lw + 14, dw = w - lw - 22;
    ui.panel(g, dx, y, dw, h - 22, { bg: ['#221c40', '#16122c'] });
    if (!q) { ui.center(g, 'No quests yet.', dx + dw / 2, y + 40, '#8a84b0'); return; }
    const s = Q.st(q.id), giver = DQ.NPCS[q.giver] || { name: 'A note on a sign' };
    E.font.title(g, q.title, dx + 8, y + 6, { scale: 1, colors: ['#fff0a0', '#e8b830'] }); ui.text(g, 'From ' + giver.name, dx + 8, y + 18, '#c8c0e0', { font: 'tiny' });
    let yy = y + 30;
    q.steps.forEach((st, i) => { if (i > s.step && s.state !== 'done') return; const done = i < s.step || s.state === 'done'; GL().tick(g, dx + 8, yy, done); const lines = DQ.Hud.prototype._wrapTokens.call(null, this.game, st.text, dw - 28); lines.slice(0, 3).forEach((ln, k) => GL().text(g, this.game, ln, dx + 19, yy + k * 10, done ? '#8a84b0' : '#ffffff')); yy += Math.min(3, lines.length) * 10 + 4; });
    if (s.state !== 'done') GL().text(g, this.game, '{btn:confirm} Track: ' + (Q.track[q.id] === false ? 'off' : 'on'), dx + 8, y + h - 36, '#c8c0e0');
  }
}
DQ.Satchel = Satchel;

// ---- crafting at a station ----
class Craft extends Screen {
  constructor(ui, data) { super(ui, data); this.station = data.station; this.page = 0; this.qty = 0; this.pop = 0; }
  list() { return this.ctx.crafting.list(this.station); }
  update(dt) {
    super.update(dt); const I = this.game.input, L = this.list(), n = L.length, b = this.ctx.builder; this.pop = Math.max(0, this.pop - dt);
    if (I.pressed('cancel') || I.pressed('interact')) { this.sfx('uiCancel'); this.ui.back(); return; }
    if (I.repeat('up')) this.focus = (this.focus + n - 1) % Math.max(1, n); if (I.repeat('down')) this.focus = (this.focus + 1) % Math.max(1, n);
    const ws = I.wheelSteps(); if (ws) this.focus = E.clamp(this.focus + ws, 0, Math.max(0, n - 1));
    if (I.repeat('left')) this.qty = (this.qty + 2) % 3; if (I.repeat('right')) this.qty = (this.qty + 1) % 3;
    const h = this.hover(I); if (typeof h === 'number') this.focus = h;
    const c = this.click(I); if (typeof c === 'string' && c.startsWith('q:')) { this.qty = +c.slice(2); return; }
    if (typeof c === 'number') this.focus = c;
    this.page = Math.floor(this.focus / 6);
    const r = L[this.focus];
    if (r && (I.pressed('confirm') || c === 'craft' || (typeof c === 'number' && this._lc === c && this.t - this._lt < .4))) {
      const max = this.ctx.crafting.max(r, b.bag), n2 = [1, 5, Math.max(1, max)][this.qty];
      const made = this.ctx.crafting.craft(r.id, Math.min(n2, max), b.bag, { by: b });
      if (made) { this.pop = .8; this.popItem = r.out; this.ctx.audioX && this.ctx.audioX.sfx('craft'); b.act = new E.Attack('bash'); b.act.start(); this.ctx.game.particles.glints(b.body.x, b.body.y, b.body.z + 20, 8, '#ffd36a'); const it = DQ.ITEMS[r.out]; if (['block', 'object', 'food'].includes(it.kind) && !b.hotbar.includes(r.out)) { const k = b.hotbar.indexOf(null); if (k >= 0) b.hotbar[k] = r.out; } if (it.kind === 'weapon' && it.tier >= b.weapon.tier) b.setEquip('weapon', r.out); if ((it.kind === 'body' || it.kind === 'shield')) b.setEquip(it.kind, r.out); }
      else { this.sfx('uiCancel'); this.ctx.hud.hint(!b.bag.fits(r.out, r.n) ? 'Your bag is full!' : "You don't have enough materials."); }
    }
    if (typeof c === 'number') { this._lc = c; this._lt = this.t; }
  }
  draw(g, W, H) {
    this.begin(); const ui = UI(), L = this.list(), b = this.ctx.builder, w = Math.min(W - 16, 400), h = Math.min(H - 16, 220), x = Math.round(W / 2 - w / 2), y = Math.round(H / 2 - h / 2);
    ui.panel(g, x, y, w, h);
    E.font.title(g, DQ.STATIONS[this.station], x + 10, y + 6, { scale: 2, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a' });
    const lw = 216, rows = L.slice(this.page * 6, this.page * 6 + 6);
    if (!L.length) ui.text(g, 'No notions for this station yet!', x + 12, y + 34, '#c8c0e0');
    rows.forEach((r, k) => {
      const i = this.page * 6 + k, ry = y + 26 + k * 28, sel = i === this.focus, it = DQ.ITEMS[r.out], can = !!this.ctx.crafting.inputs(r, b.bag);
      px.rect(g, x + 8, ry, lw, 26, sel ? '#3a3270' : '#1e1838'); if (sel) ui.sel(g, x + 8, ry, lw, 26, this.t);
      const ic = DQ.Icons.get(r.out, 16); if (ic) g.drawImage(ic, x + 11, ry + 5);
      ui.text(g, it.name + (r.n > 1 ? ' x' + r.n : ''), x + 30, ry + 3, can ? '#ffffff' : '#a8a0c0');
      let ix = x + 30; const inp = this.ctx.crafting.inputs(r, b.bag) || r.inputs;
      for (const kk in inp) { const have = b.bag.count(kk), need = inp[kk], ok = have >= need, ic2 = DQ.Icons.get(kk, 10); if (ic2) g.drawImage(ic2, ix, ry + 14); const s = (have > 99 ? '99+' : have) + '/' + need; ui.text(g, s, ix + 11, ry + 15, ok ? '#ffffff' : '#ff8a8a', { font: 'tiny' }); GL().tick(g, ix + 12 + E.font.width(s, { font: 'tiny' }), ry + 14, ok); ix += 26 + E.font.width(s, { font: 'tiny' }); }
      this.hit(x + 8, ry, lw, 26, i);
    });
    if (L.length > 6) ui.text(g, 'Page ' + (this.page + 1) + '/' + Math.ceil(L.length / 6), x + 12, y + h - 14, '#8a84b0', { font: 'tiny' });
    // the detail pane
    const r = L[this.focus], dx = x + lw + 16, dw = w - lw - 24;
    ui.panel(g, dx, y + 26, dw, h - 34, { bg: ['#221c40', '#16122c'] });
    if (r) {
      const it = DQ.ITEMS[r.out], ic = DQ.Icons.get(r.out, 16), k = this.pop > 0 ? 1 + Math.sin(this.pop * 12) * .15 : 1;
      if (ic) { const s = Math.round(40 * k); g.drawImage(ic, dx + dw / 2 - s / 2, y + 34 + (40 - s) / 2, s, s); }
      ui.center(g, it.name, dx + dw / 2, y + 78, '#ffd36a');
      E.font.wrap(it.desc, dw - 12).slice(0, 4).forEach((ln, i) => ui.text(g, ln, dx + 6, y + 90 + i * 10, '#ffffff'));
      const max = this.ctx.crafting.max(r, b.bag);
      ['x1', 'x5', 'Max'].forEach((s, i) => { const qx = dx + 6 + i * 30, qy = y + h - 40; px.rect(g, qx, qy, 26, 12, i === this.qty ? '#4a3a7a' : '#221c40'); if (i === this.qty) ui.sel(g, qx, qy, 26, 12, this.t); ui.center(g, s, qx + 13, qy + 3, i === this.qty ? '#ffd36a' : '#c8c0e0'); this.hit(qx, qy, 26, 12, 'q:' + i); });
      GL().text(g, this.game, '{btn:confirm} Craft (' + max + ')', dx + 6, y + h - 24, max ? '#ffffff' : '#8a84b0'); this.hit(dx + 4, y + h - 26, dw - 8, 12, 'craft');
    }
    if (this.pop > 0 && this.popItem) { const ic = DQ.Icons.get(this.popItem, 16); if (ic) g.drawImage(ic, W / 2 - 8, y - 18 - (1 - this.pop) * 10); }
  }
}
DQ.Craft = Craft;

// ---- a chest: bag | chest ----
class ChestScreen extends Screen {
  constructor(ui, data) { super(ui, data); this.side = 0; this.i = [0, 0]; }
  lists() { const b = this.ctx.builder, o = this.data.obj; const bag = []; for (const s of b.bag.slots) { const e = bag.find(q => q.id === s.id); if (e) e.n += s.n; else bag.push({ id: s.id, n: s.n }); } return [bag, Object.keys(o.items).map(id => ({ id, n: o.items[id] }))]; }
  update(dt) {
    super.update(dt); const I = this.game.input, L = this.lists(), o = this.data.obj, b = this.ctx.builder;
    if (I.pressed('cancel') || I.pressed('interact')) { this.ui.back(); this.ctx.rooms && this.ctx.rooms.mark(); return; }
    if (I.repeat('left')) this.side = 0; if (I.repeat('right')) this.side = 1;
    const n = L[this.side].length + (this.side === 0 ? 1 : 1);
    if (I.repeat('up')) this.i[this.side] = Math.max(0, this.i[this.side] - 1); if (I.repeat('down')) this.i[this.side] = Math.min(n - 1, this.i[this.side] + 1);
    const h = this.hover(I); if (typeof h === 'string' && h.includes(':')) { const [s, k] = h.split(':'); this.side = +s; this.i[this.side] = +k; }
    const c = this.click(I); if (typeof c === 'string' && c.includes(':')) { const [s, k] = c.split(':'); this.side = +s; this.i[this.side] = +k; }
    if (I.pressed('confirm') || c) {
      const k = this.i[this.side], list = L[this.side];
      if (k >= list.length) {   // the button under the list
        if (this.side === 0) { const m = DQ.Chest.storeAll(o, b.bag); this.ctx.hud.hint(m ? 'Stored ' + m + ' items.' : 'Nothing to store.'); this.sfx('uiConfirm'); }
        else this._townChest();
        return;
      }
      const e = list[k]; if (!e) return;
      if (this.side === 0) { const it = DQ.ITEMS[e.id]; if (it.keyItem || it.kind === 'weapon' && Object.values(b.equip).includes(e.id)) { this.ctx.hud.hint("That stays with you."); return; } const left = DQ.Chest.add(o, e.id, e.n); b.bag.remove(e.id, e.n - left); if (left) this.ctx.hud.hint('The chest is full!'); }
      else { const n2 = DQ.Chest.take(o, e.id, e.n), left = b.bag.add(e.id, n2); if (left) DQ.Chest.add(o, e.id, left); }
      this.sfx('uiConfirm');
    }
  }
  _townChest() {
    const ctx = this.ctx, o = this.data.obj, t = ctx.town;
    if (o.townChest) { ctx.hud.hint('This is already the Town Chest.'); return; }
    if (!t.planted || t.level < 2 || !t.inBorder(o.x, o.y)) { ctx.hud.hint(t.level < 2 ? 'Town Level 2 unlocks the Town Chest.' : 'It must be inside the town border.'); return; }
    for (const q of ctx.objects.list) q.townChest = false;
    o.townChest = true; ctx.flags.townChest = true; ctx.hud.popup('Town Chest!', 'Residents will use this chest.'); ctx.audioX && ctx.audioX.jingle('item');
  }
  draw(g, W, H) {
    this.begin(); const ui = UI(), L = this.lists(), w = Math.min(W - 16, 400), h = Math.min(H - 16, 210), x = Math.round(W / 2 - w / 2), y = Math.round(H / 2 - h / 2);
    ui.panel(g, x, y, w, h);
    E.font.title(g, this.data.obj.townChest ? 'Town Chest' : 'Storage Chest', W / 2, y + 6, { scale: 2, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', align: 'center' });
    for (let s = 0; s < 2; s++) {
      const px0 = x + 8 + s * (w / 2), pw = w / 2 - 16, list = L[s];
      ui.text(g, s ? 'Chest (' + DQ.Chest.stacks(this.data.obj) + '/20)' : 'Bag', px0, y + 26, this.side === s ? '#ffd36a' : '#c8c0e0');
      const top = Math.max(0, this.i[s] - 8);
      list.slice(top, top + 9).forEach((e, k) => { const i = top + k, ry = y + 38 + k * 15, sel = this.side === s && this.i[s] === i; if (sel) { px.rect(g, px0, ry - 2, pw, 14, '#3a3270'); ui.sel(g, px0, ry - 2, pw, 14, this.t); } const ic = DQ.Icons.get(e.id, 10); if (ic) g.drawImage(ic, px0 + 3, ry); ui.text(g, DQ.ITEMS[e.id].name, px0 + 16, ry + 1, '#ffffff'); ui.text(g, 'x' + e.n, px0 + pw - 4 - E.font.width('x' + e.n), ry + 1, '#c8c0e0'); this.hit(px0, ry - 2, pw, 14, s + ':' + i); });
      const bi = list.length, by2 = y + h - 22, sel = this.side === s && this.i[s] >= bi, lab = s ? 'Make this the Town Chest' : 'Store all materials';
      px.rect(g, px0, by2, pw, 14, sel ? '#4a3a7a' : '#221c40'); if (sel) ui.sel(g, px0, by2, pw, 14, this.t); ui.center(g, lab, px0 + pw / 2, by2 + 3, sel ? '#ffd36a' : '#ffffff'); this.hit(px0, by2, pw, 14, s + ':' + bi);
    }
  }
}
DQ.ChestScreen = ChestScreen;

// ---- the UI manager: a stack of screens; modal while any is open ----
class UIManager {
  constructor(ctx) { this.ctx = ctx; this.stack = []; }
  get modal() { return this.stack.length > 0 || (this.ctx.talk && this.ctx.talk.open && !(this.ctx.talk.cur && this.ctx.talk.cur.auto && !this.ctx.talk.cur.modal)); }
  get top() { return this.stack[this.stack.length - 1] || null; }
  open(name, data = {}) {
    const ctx = this.ctx, K = { satchel: Satchel, craft: Craft, chest: ChestScreen, list: ListScreen, travel: TravelScreen, banner: BannerScreen, about: DQ.AboutScreen, dev: DQ.DevScreen };
    const C = typeof name === 'function' ? name : K[name]; if (!C) return null;
    const s = new C(this, data); s.name = typeof name === 'string' ? name : 'custom'; this.stack.push(s); ctx.game.input.consumeAll();
    ctx.audioX && ctx.audioX.sfx(name === 'satchel' || name === 'chest' ? 'zipper' : 'uiConfirm');
    ctx.events.emit('uiOpen', { name: s.name });
    return s;
  }
  back() { const s = this.stack.pop(); if (s && s.onClose) s.onClose(); this.ctx.game.input.consumeAll(); }
  close() { while (this.stack.length) this.back(); }
  update(dt) { const s = this.top; if (s) { s.update(dt); return true; } return false; }
  draw(r) { if (!this.stack.length) return; r.overlay(g => { px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040c')); for (const s of this.stack.slice(-1)) s.draw(g, r.W, r.H); }); }
}
DQ.UIManager = UIManager;

// ---- travel by Bobbin Portal ----
class TravelScreen extends ListScreen {
  constructor(ui, data) {
    const ctx = ui.ctx, items = DQ.WORLD.portals.filter(p => ctx.objects.discovered.has(p.id)).map(p => ({ label: p.name, sub: DQ.WORLD.regions[DQ.regionAt(...p.at)].name, act: () => { ui.close(); DQ.travelTo(ctx, p); }, disabled: data.from && data.from.portalId === p.id }));
    super(ui, { title: 'Bobbin Portal', items, foot: '{btn:confirm} Travel   {btn:cancel} Back' });
  }
}
DQ.travelTo = (ctx, p) => {
  const b = ctx.builder, [x, y] = p.at, z = ctx.world.topZ(x, y + 1);
  ctx.audioX && ctx.audioX.sfx('portal'); ctx.swirl = .8;
  ctx.game.after(.4, () => { b.body.x = (x + .5) * T; b.body.y = (y + 1.5) * T; b.body.z = z * T; b.body.vx = b.body.vy = b.body.vz = 0; ctx.world.escape(b.body); b.body.lastSafe = [b.body.x, b.body.y, b.body.z]; ctx.game.cam.snap = true; for (const n of ctx.npcs.list) if (n.follow === b) { n.body.x = b.body.x - 12; n.body.y = b.body.y; n.body.z = b.body.z; ctx.world.escape(n.body); } ctx.events.emit('traveled', { id: p.id }); });
};

// ---- the Banner screen: the town at a glance (and why a room did not form) ----
class BannerScreen extends Screen {
  update(dt) { super.update(dt); const I = this.game.input; if (I.pressed('cancel') || I.pressed('interact') || I.pressed('confirm') || I.clicked()) this.ui.back(); }
  draw(g, W, H) {
    const ui = UI(), ctx = this.ctx, t = ctx.town, w = Math.min(W - 16, 360), h = Math.min(H - 16, 210), x = Math.round(W / 2 - w / 2), y = Math.round(H / 2 - h / 2);
    ui.panel(g, x, y, w, h, { thread: '#ffd36a' });
    E.font.title(g, 'Thimbleton', W / 2, y + 6, { scale: 2, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', align: 'center' });
    const nx = t.nextCheer(), prev = DQ.LEVELS[t.level].cheer;
    ui.text(g, 'Town Level ' + t.level, x + 12, y + 28, '#ffd36a'); ui.text(g, 'Cheer ' + t.cheer + (nx ? ' / ' + nx : ''), x + 110, y + 28);
    ui.bar(g, x + 12, y + 40, w - 24, 7, nx ? (t.cheer - prev) / (nx - prev) : 1, '#ff7aa8', '#2a0a1a');
    const L = DQ.LEVELS[t.level + 1]; ui.text(g, L ? 'Next: ' + L.unlocks.slice(0, 3).join(', ') : 'Chapter One complete!', x + 12, y + 52, '#c8c0e0', { font: 'tiny' });
    ui.text(g, 'Rooms', x + 12, y + 66, '#ffd36a');
    const rooms = ctx.rooms.list.filter(r => r.inBorder);
    if (!rooms.length) ui.text(g, 'None yet. Walls 2 high, a door, a light!', x + 12, y + 78, '#c8c0e0');
    rooms.slice(0, 7).forEach((r, i) => ui.text(g, '• ' + r.name, x + 12, y + 78 + i * 10, '#ffffff'));
    const f = ctx.rooms.lastFail; if (f) GL().text(g, this.game, 'Almost a room! Missing: ' + f.why, x + 12, y + h - 18, '#ff9a9a');
    ui.text(g, 'Residents', x + w / 2 + 6, y + 66, '#ffd36a');
    ctx.npcs.list.forEach((n, i) => { const mood = n.mood > 0 ? 'Happy' : n.mood < 0 ? 'Grumpy' : 'Content'; E.font.text(g, n.mood > 0 ? '♥' : n.mood < 0 ? '×' : '•', x + w / 2 + 6, y + 78 + i * 10, n.mood > 0 ? '#ff7aa8' : '#c8c0e0', false); ui.text(g, n.name.split(' ')[0] + ': ' + mood, x + w / 2 + 16, y + 78 + i * 10, '#ffffff'); });
  }
}
DQ.BannerScreen = BannerScreen;

// ---- About & Credits: pages of the embedded exit interview ----
class AboutScreen extends Screen {
  constructor(ui, data) { super(ui, data); this.page = 0; this.scroll = 0; }
  pages() {
    const A = DQ.ABOUT || {}, si = A.sourceInformation || {}, fb = (k, qs) => (A[k] || []).map((a, i) => [qs[i] || '', a]);
    const SI = [['Date', si.date], ['Source', si.source], ['Plan', si.plan], ['Genre', si.genre], ['Perspective', si.perspective], ['Tech', si.tech], ['Art Direction', si.artDirection], ['Animation', si.animation], ['Audio', si.audio], ['Online', si.online], ['Testing', si.testing], ['Research', si.research], ['Environment', si.environment], ['Model', si.model], ['Usage', si.usage]];
    const TQ = ['How many issues did testing catch?', 'How many were critical / game breaking?', 'The most helpful test', 'The least helpful test'];
    const EQ = ['What I liked most about the engine', 'Did I get stuck or guess wrong?', 'The most important thing I built myself', 'The hardest part of using the engine', 'What I changed in the engine, and why', 'One thing I would change'];
    const PQ = ['What I liked most about the prompt', 'What was confusing', 'The hardest thing to do', 'What I would change'];
    return [
      ['Credits', [['', 'Dragon Quilt Builders: an original game inspired by Dragon Quest Builders (Square Enix). Not affiliated with or endorsed by Square Enix. No assets from the original.'], ['Design, code, art, music and writing', 'The AI model (Anthropic, claude-opus-5-5) under direction, from the plan PLAN.md.'], ['Engine', 'my-3D2dge v0.85.2 (MIT) by michaelcrosato, with these changes: an input wheel-steps accessor and right-stick flick; a Dialog onLetter hook; a Voices audio bus; darning stick, cobble club and Seam Ripper tools on the Humanoid rig; the mouse moving counts as using it (menu hover, mouse prompts).'], ['Online', 'AI Hub Session Protocol v1, client session.js 1.4.0.'], ['Thanks', 'To everyone who ever darned a sock.']]],
      ['Source Information', SI.map(([k, v]) => [k, v || 'unknown'])],
      ['Testing Feedback', fb('testingFeedback', TQ)],
      ['Engine Feedback', fb('engineFeedback', EQ)],
      ['Prompt Feedback', fb('promptFeedback', PQ)],
      ['Licenses', [['my-3D2dge', 'MIT License. Copyright (c) michaelcrosato.'], ['AI Hub session client', 'Included unmodified, as the protocol requires.'], ['Everything else', 'Original code, art, music, sound and writing made for this game. All sound is synthesised in code.']]]
    ];
  }
  update(dt) {
    super.update(dt); const I = this.game.input, P = this.pages();
    if (I.pressed('tabPrev') || I.repeat('left')) { this.page = (this.page + P.length - 1) % P.length; this.scroll = 0; this.sfx('uiMove'); }
    if (I.pressed('tabNext') || I.repeat('right')) { this.page = (this.page + 1) % P.length; this.scroll = 0; this.sfx('uiMove'); }
    if (I.repeat('down')) this.scroll += 1; if (I.repeat('up')) this.scroll = Math.max(0, this.scroll - 1);
    const ws = I.wheelSteps(); if (ws) this.scroll = Math.max(0, this.scroll + ws);
    const c = this.click(I); if (typeof c === 'number') { this.page = c; this.scroll = 0; } if (c === 'back') { this.ui.back(); return; }
    if (I.pressed('cancel') || I.pressed('confirm') && c === null && !I.clicked()) { this.ui.back(); }
  }
  draw(g, W, H) {
    this.begin(); const ui = UI(), P = this.pages(), w = Math.min(W - 12, 420), h = H - 12, x = Math.round(W / 2 - w / 2), y = 6;
    ui.panel(g, x, y, w, h);
    E.font.title(g, 'About & Credits', W / 2, y + 6, { scale: 2, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', align: 'center' });
    let tx = x + 8; P.forEach(([t], i) => { const tw = E.font.width(t, { font: 'tiny' }) + 8, sel = i === this.page; px.rect(g, tx, y + 24, tw, 12, sel ? '#4a3a7a' : '#221c40'); if (sel) ui.sel(g, tx, y + 24, tw, 12, this.t); ui.text(g, t, tx + 4, y + 27, sel ? '#ffd36a' : '#c8c0e0', { font: 'tiny' }); this.hit(tx, y + 24, tw, 12, i); tx += tw + 3; });
    const lines = []; for (const [k, v] of P[this.page][1]) { if (k) lines.push(['k', k]); for (const ln of E.font.wrap(String(v), w - 26)) lines.push(['v', ln]); lines.push(['s', '']); }
    const per = Math.floor((h - 64) / 10); this.scroll = Math.min(this.scroll, Math.max(0, lines.length - per));
    lines.slice(this.scroll, this.scroll + per).forEach(([kind, s], i) => ui.text(g, s, x + 12, y + 42 + i * 10, kind === 'k' ? '#ffd36a' : '#ffffff'));
    if (lines.length > per) ui.text(g, (this.scroll + per < lines.length ? '↓ ' : '') + (this.scroll + 1) + '/' + (lines.length - per + 1), x + w - 40, y + h - 14, '#8a84b0', { font: 'tiny' });
    GL().text(g, this.game, '{btn:tabPrev}{btn:tabNext} Pages   {btn:move} Scroll   {btn:cancel} Back', x + 10, y + h - 15, '#c8c0e0');
  }
}
DQ.AboutScreen = AboutScreen;
})();
