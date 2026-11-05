// The game's own screens (10-foot, controller first; the mouse hovers and clicks, the wheel scrolls): the Satchel (Bag,
// Map, Journal), crafting at a station, a chest, portal travel, the Banner. Each is a small state machine (focus, tab,
// page) driven by actions and testable headless; drawing reads the state.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const F = (g, s, x, y, c, o) => E.font.text(g, DQ.safe(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#05040a' }, o || {}));
const FW = (s, o) => E.font.width(DQ.safe(s), o);
const P = (g, x, y, w, h, o) => DQ.Hud.panel(g, x, y, w, h, o);
const CATS = [['materials', 'Materials'], ['building', 'Building'], ['furniture', 'Furniture'], ['food', 'Food'], ['tools', 'Tools'], ['key', 'Key Items']];
/** the screen stack */
class UI {
  constructor(ctx) { this.ctx = ctx; this.stack = []; this.hits = []; this._hp = null; }
  get open() { return this.stack.length > 0; }
  get top() { return this.stack[this.stack.length - 1] || null; }
  push(s) { s.ui = this; s.ctx = this.ctx; this.stack.push(s); if (s.enter) s.enter(); DQ.sfx(s.sound || 'zipper', { vol: .35 }); this.ctx.events.emit('uiOpen', { id: s.id }); return s; }
  pop() { const s = this.stack.pop(); if (s && s.exit) s.exit(); DQ.sfx('uiCancel', { vol: .3 }); if (!this.stack.length) DQ.game.input.consumeAll && DQ.game.input.consumeAll(); return s; }
  closeAll() { while (this.stack.length) this.pop(); }
  update(dt) {
    const s = this.top; if (!s) return false; const I = DQ.game.input;
    // the mouse: hover moves the focus, a click activates
    const p = I.lastDevice === 'mouse' && I.pointer ? I.pointer() : null, moved = p && (!this._hp || p[0] !== this._hp[0] || p[1] !== this._hp[1]); this._hp = p ? p.slice() : null;
    const c = I.clicked ? I.clicked() : null;
    for (const h of this.hits) { if (moved && p && p[0] >= h.x && p[0] < h.x + h.w && p[1] >= h.y && p[1] < h.y + h.h && h.hover) h.hover(p); }
    if (c) for (const h of this.hits) if (c[0] >= h.x && c[0] < h.x + h.w && c[1] >= h.y && c[1] < h.y + h.h && h.click) { h.click(c); break; }
    const wh = DQ.Controls.wheelSteps(); if (wh && s.wheel) s.wheel(wh);
    s.update(dt, I);
    return true;
  }
  draw(r) { const s = this.top; if (!s) return; r.overlay(g => { this.hits = []; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06051a')); s.draw(g, r.W, r.H, this); }); }
  hit(x, y, w, h, hover, click) { this.hits.push({ x, y, w, h, hover, click }); }
}
DQ.UI = UI;
const nav = (I, k) => I.repeat(k, .28, .09);
const tabs = (g, ui, x, y, list, cur, onPick) => { let cx = x; list.forEach((t, i) => { const w = FW(t) + 18; P(g, cx, y, w, 16, { gold: i === cur, alpha: i === cur ? 1 : .8 }); F(g, t, cx + 9, y + 4, i === cur ? '#ffe070' : '#c8c0e0'); ui.hit(cx, y, w, 16, null, () => onPick(i)); cx += w + 4; }); return cx; };
const glyphRow = (g, W, H, items) => { let x = 12; const y = H - 18; for (const it of items) { const w = DQ.Glyphs.measure(DQ.game, it) + 8; P(g, x - 4, y - 3, w, 15, { alpha: .9 }); DQ.Glyphs.text(g, DQ.game, it, x, y, '#ffffff'); x += w + 6; } };

// ================================================================ the Satchel: Bag, Map, Journal
class Satchel {
  constructor(tab = 0) { this.id = 'satchel'; this.tab = tab; this.cat = 0; this.focus = 0; this.zone = 'grid'; this.mapZ = 2; this.mapC = null; this.jq = 0; this.jtab = 0; this.holdDrop = 0; }
  enter() { if (this.tab === 1) this.mapC = [this.ctx.builder.cx, this.ctx.builder.cy]; }
  items() { const b = this.ctx.builder, key = CATS[this.cat][0], out = []; const ids = b.bag.ids(); for (const id in ids) { const it = DQ.ITEMS[id]; if (it && it.cat === key) out.push({ id, n: ids[id] }); } if (key === 'key') for (const id in b.bag.keys) out.push({ id, n: b.bag.keys[id] }); if (key === 'tools') { for (const k of ['weapon', 'body', 'shield']) { const e = b.equip[k]; if (e && !out.find(o => o.id === e)) out.unshift({ id: e, n: 1, equipped: true }); } } return out; }
  update(dt, I) {
    const ctx = this.ctx, b = ctx.builder;
    if (I.pressed('tabPrev')) { this.tab = (this.tab + 2) % 3; DQ.sfx('uiMove'); this.enter(); }
    if (I.pressed('tabNext')) { this.tab = (this.tab + 1) % 3; DQ.sfx('uiMove'); this.enter(); }
    if (I.pressed('back') || I.pressed('satchel')) { this.ui.pop(); return; }
    if (this.tab === 0) this.updBag(dt, I); else if (this.tab === 1) this.updMap(dt, I); else this.updJournal(dt, I);
  }
  updBag(dt, I) {
    const b = this.ctx.builder, list = this.items();
    if (nav(I, 'left')) { if (this.zone === 'grid' && this.focus % 6 > 0) this.focus--; else if (this.zone === 'grid') { this.cat = (this.cat + 5) % 6; this.focus = 0; } DQ.sfx('uiMove'); }
    if (nav(I, 'right')) { if (this.zone === 'grid' && this.focus % 6 < 5 && this.focus + 1 < Math.max(1, list.length)) this.focus++; else if (this.zone === 'grid') { this.cat = (this.cat + 1) % 6; this.focus = 0; } DQ.sfx('uiMove'); }
    if (nav(I, 'up')) { if (this.zone === 'pocket') this.zone = 'grid'; else if (this.focus >= 6) this.focus -= 6; DQ.sfx('uiMove'); }
    if (nav(I, 'down')) { if (this.zone === 'grid' && this.focus + 6 < list.length) this.focus += 6; else this.zone = 'pocket'; DQ.sfx('uiMove'); }
    this.focus = E.clamp(this.focus, 0, Math.max(0, list.length - 1));
    const it = this.zone === 'grid' ? list[this.focus] : null;
    if (I.pressed('ok')) { if (this.zone === 'pocket') { this.ui.push(new Craft('pocket', null)); return; } if (it) this.assign(it.id); }
    if (I.pressed('alt2') && it) this.useItem(it.id);
    if (I.down('alt') && it) { this.holdDrop += dt; if (this.holdDrop > .5) { this.drop(it.id, b.bag.realCount(it.id)); this.holdDrop = -9; } } else { if (this.holdDrop > 0 && it) this.drop(it.id, 1); this.holdDrop = 0; }
  }
  assign(id) { const it = DQ.ITEMS[id], b = this.ctx.builder; if (!['block', 'obj', 'food', 'use', 'key'].includes(it.kind) && !['weapon', 'body', 'shield'].includes(it.kind)) { DQ.sfx('uiCancel'); return; } if (['weapon', 'body', 'shield'].includes(it.kind)) { b.equipItem(id); return; } b.bag.setHot(b.hot, id); DQ.sfx('uiConfirm'); this.ctx.hud.toast(it.name + ' is on hotbar slot ' + (b.hot + 1) + '.', id); }
  useItem(id) { const b = this.ctx.builder, it = DQ.ITEMS[id]; if (it.kind === 'food') b.eat(id); else if (it.kind === 'use') b.useItem(id); else if (['weapon', 'body', 'shield'].includes(it.kind)) b.equipItem(id); else if (it.kind === 'key') { this.ui.pop(); if (this.ctx.useKey) this.ctx.useKey(b, id); } else DQ.sfx('uiCancel'); }
  drop(id, n) { const it = DQ.ITEMS[id], b = this.ctx.builder; if (it.kind === 'key' || n <= 0) { DQ.sfx('uiCancel'); return; } if (b.equip.weapon === id && b.bag.realCount(id) <= 1) { this.ctx.hud.toast('You can\'t drop your weapon!', id); return; } if (b.bag.remove(id, n)) { const d = this.ctx.drops.spawn(id, n, b.x + Math.cos(b.facing) * 14, b.y + Math.sin(b.facing) * 14, b.z + 10); if (d) d.t = -1.5; DQ.sfx('drop'); } }
  updMap(dt, I) {
    const m = I.move(); if (!this.mapC) this.mapC = [this.ctx.builder.cx, this.ctx.builder.cy];
    this.mapC[0] = E.clamp(this.mapC[0] + m[0] * dt * 60 / this.mapZ * 2, 0, 143); this.mapC[1] = E.clamp(this.mapC[1] + m[1] * dt * 60 / this.mapZ * 2, 0, 143);
    if (I.pressed('pgUp') || I.pressed('zoomOut')) this.mapZ = Math.max(1, this.mapZ - 1); if (I.pressed('pgDn') || I.pressed('zoomIn')) this.mapZ = Math.min(4, this.mapZ + 1);
    if (I.pressed('ok')) { this.ctx.waypoint = [Math.round(this.mapC[0]), Math.round(this.mapC[1])]; DQ.sfx('uiConfirm'); }
    if (I.pressed('alt')) { this.ctx.waypoint = null; DQ.sfx('uiCancel'); }
    const dr = I.pan && I.pan(); if (dr) { this.mapC[0] -= dr[0] / this.mapZ; this.mapC[1] -= dr[1] / this.mapZ; }
  }
  wheel(n) { if (this.tab === 1) this.mapZ = E.clamp(this.mapZ - n, 1, 4); else if (this.tab === 2) this.jq = Math.max(0, this.jq + n); else { this.focus = E.clamp(this.focus + n * 6, 0, Math.max(0, this.items().length - 1)); } }
  updJournal(dt, I) {
    if (nav(I, 'left') || nav(I, 'right')) { this.jtab = (this.jtab + 1) % 3; this.jq = 0; DQ.sfx('uiMove'); }
    if (nav(I, 'up')) this.jq = Math.max(0, this.jq - 1); if (nav(I, 'down')) this.jq++;
    if (I.pressed('ok') && this.jtab === 0) { const l = this.journalList(); const e = l[this.jq]; if (e) { const s = this.ctx.quests.s[e.id]; s.track = !s.track; DQ.sfx('uiConfirm'); } }
  }
  journalList() { const qs = this.ctx.quests, out = []; for (const id of DQ.QUEST_ORDER) { const s = qs.s[id]; if (this.jtab === 0 && (s.status === 'active' || s.status === 'ready')) out.push({ id, s }); if (this.jtab === 1 && s.status === 'done') out.push({ id, s }); } return out; }
  draw(g, W, H, ui) {
    const x0 = Math.round(W / 2 - 200), y0 = 14, w = 400, h = H - 44;
    P(g, x0, y0, w, h, {});
    tabs(g, ui, x0 + 8, y0 - 6, ['Bag', 'Map', 'Journal'], this.tab, i => { this.tab = i; this.enter(); DQ.sfx('uiMove'); });
    const tx = tabs(g, { hit() {} }, -999, -999, ['Bag', 'Map', 'Journal'], -1, () => {}) + x0 + 8 + 999 + 6; DQ.Glyphs.draw(g, DQ.game, 'tabPrev', tx, y0 - 4); DQ.Glyphs.draw(g, DQ.game, 'tabNext', tx + DQ.Glyphs.width(DQ.game, 'tabPrev') + 4, y0 - 4);
    if (this.tab === 0) this.drawBag(g, W, H, ui, x0, y0 + 14, w, h - 14); else if (this.tab === 1) this.drawMap(g, W, H, ui, x0, y0 + 14, w, h - 14); else this.drawJournal(g, W, H, ui, x0, y0 + 14, w, h - 14);
  }
  drawBag(g, W, H, ui, x0, y0, w, h) {
    const b = this.ctx.builder, list = this.items();
    let cx = x0 + 8; CATS.forEach(([k, n], i) => { const tw = FW(n) + 10, sel = i === this.cat; P(g, cx, y0 + 2, tw, 14, { gold: sel, alpha: .9 }); F(g, n, cx + 5, y0 + 5, sel ? '#ffe070' : '#b8b0d8'); ui.hit(cx, y0 + 2, tw, 14, null, () => { this.cat = i; this.focus = 0; DQ.sfx('uiMove'); }); cx += tw + 3; });
    const gs = 30, gx = x0 + 10, gy = y0 + 22;
    for (let i = 0; i < 24; i++) {
      const x = gx + (i % 6) * (gs + 3), y = gy + Math.floor(i / 6) * (gs + 3), e = list[i], sel = this.zone === 'grid' && i === this.focus;
      P(g, x, y, gs, gs, { gold: sel, alpha: .9 });
      if (e) { DQ.Icons.draw(g, e.id, x + gs / 2, y + gs / 2 - 1, 1.3); if (e.n > 1) F(g, String(e.n), x + gs - 3 - FW(String(e.n)), y + gs - 10, '#ffffff'); if (b.bag.hotbar.includes(e.id)) F(g, String(b.bag.hotbar.indexOf(e.id) + 1), x + 3, y + 2, '#a0e0ff', { font: 'tiny' }); if (e.equipped || Object.values(b.equip).includes(e.id)) F(g, 'E', x + 3, y + 2, '#ffe070', { font: 'tiny' }); }
      ui.hit(x, y, gs, gs, () => { if (e) { this.zone = 'grid'; this.focus = i; } }, () => { if (e) { this.zone = 'grid'; this.focus = i; this.assign(e.id); } });
    }
    // Pocket Notions
    const py = gy + 4 * (gs + 3) + 2, pw = 6 * (gs + 3) - 3; P(g, gx, py, pw, 18, { gold: this.zone === 'pocket' }); F(g, 'Pocket Notions (craft from your Bag)', gx + 8, py + 6, this.zone === 'pocket' ? '#ffe070' : '#ffffff');
    ui.hit(gx, py, pw, 18, () => { this.zone = 'pocket'; }, () => this.ui.push(new Craft('pocket', null)));
    // detail
    const e = this.zone === 'grid' ? list[this.focus] : null, dx = gx + pw + 8, dw = x0 + w - dx - 8;
    P(g, dx, gy, dw, 4 * (gs + 3) + 20, { alpha: .9 });
    if (e) { const it = DQ.ITEMS[e.id]; DQ.Icons.draw(g, e.id, dx + dw / 2, gy + 24, 2.4); F(g, it.name, dx + (dw - FW(it.name)) / 2, gy + 46, '#ffe070'); DQ.wrapText(it.desc || '', dw - 12).slice(0, 5).forEach((l, i) => F(g, l, dx + 6, gy + 60 + i * 11, '#e8e4f4'));
      const stat = it.food ? 'Belly +' + it.food.belly + (it.food.hp ? '  HP +' + Math.min(it.food.hp, 999) : '') : it.weapon ? 'Attack ' + it.weapon.atk + '  Breaks tier ' + it.weapon.tier : it.def ? 'Defence +' + it.def : 'You have ' + e.n + '.';
      F(g, stat, dx + 6, gy + 4 * (gs + 3) + 6, '#c8ffc8'); }
    else if (this.zone === 'pocket') DQ.wrapText('Craft simple things anywhere: torches, and your first Mending Bench.', dw - 12).forEach((l, i) => F(g, l, dx + 6, gy + 10 + i * 11, '#e8e4f4'));
    else F(g, 'Nothing here yet.', dx + 6, gy + 10, '#8a84a8');
    const it = e && DQ.ITEMS[e.id];
    const rowItems = []; if (it && ['weapon', 'body', 'shield'].includes(it.kind)) rowItems.push('{btn:ok} Equip'); else if (it && ['block', 'obj', 'food', 'use', 'key'].includes(it.kind)) rowItems.push('{btn:ok} To hotbar'); else if (this.zone === 'pocket') rowItems.push('{btn:ok} Open');
    if (it && it.kind === 'food') rowItems.push('{btn:alt2} Eat'); else if (it && (it.kind === 'use' || it.kind === 'key')) rowItems.push('{btn:alt2} Use');
    if (it && it.kind !== 'key') rowItems.push('{btn:alt} Drop (hold: all)'); rowItems.push('{btn:back} Close'); glyphRow(g, W, H, rowItems);
  }
  drawMap(g, W, H, ui, x0, y0, w, h) {
    const ctx = this.ctx, wd = ctx.world, b = ctx.builder, z = this.mapZ, mx = x0 + 8, my = y0 + 4, mw = w - 16, mh = h - 30, c = this.mapC || [b.cx, b.cy];
    const img = DQ.Menus.mapImage(ctx); const sx0 = c[0] - mw / z / 2, sy0 = c[1] - mh / z / 2;
    g.save(); g.beginPath(); g.rect(mx, my, mw, mh); g.clip();
    px.rect(g, mx, my, mw, mh, '#0a0820');
    if (img) g.drawImage(img, 0, 0, img.width, img.height, Math.round(mx - sx0 * z), Math.round(my - sy0 * z), img.width * z, img.height * z);
    const P2 = (x, y) => [Math.round(mx + (x - sx0) * z), Math.round(my + (y - sy0) * z)];
    if (ctx.town && ctx.town.planted) { const [a, b2] = P2(ctx.town.x, ctx.town.y); px.rect(g, a - 1, b2 - 4, 1, 6, '#8a6a3a'); px.rect(g, a, b2 - 4, 4, 3, '#c84a3a'); }
    for (const p of DQ.WORLD.portals) if (ctx.flags['portal_' + p.id]) { const [a, b2] = P2(p.x, p.y); px.disc(g, a, b2, 2, '#c8a0ff'); }
    for (const n of ctx.npcs.list) { const [a, b2] = P2(n.cx, n.cy); px.dot(g, a, b2, '#ffd36a'); }
    for (const bt of DQ.WORLD.buttons) if (ctx.quests.active('S3') && ctx.objects.list.some(o => o.def.collect && Math.abs(o.x - bt.x) < 2 && Math.abs(o.y - bt.y) < 2)) { const [a, b2] = P2(bt.x, bt.y); F(g, '?', a - 2, b2 - 4, '#ffe070'); }
    if (ctx.flags.lostBundle) { const [a, b2] = P2(ctx.flags.lostBundle[0], ctx.flags.lostBundle[1]); F(g, '×', a - 2, b2 - 4, '#ff8080'); }
    const q = ctx.quests.current(), t = q && ctx.quests.targetOf(q); if (t) { const [a, b2] = P2(t[0] / T, t[1] / T); px.disc(g, a, b2, 3, '#ffe070'); px.disc(g, a, b2, 1, '#3a2a10'); }
    if (ctx.waypoint) { const [a, b2] = P2(ctx.waypoint[0], ctx.waypoint[1]); px.line(g, a - 3, b2 - 3, a + 3, b2 + 3, '#a0ffa0'); px.line(g, a + 3, b2 - 3, a - 3, b2 + 3, '#a0ffa0'); }
    const [ba, bb] = P2(b.x / T, b.y / T), fa = b.facing; px.poly(g, [[ba + Math.cos(fa) * 5, bb + Math.sin(fa) * 5], [ba + Math.cos(fa + 2.4) * 3, bb + Math.sin(fa + 2.4) * 3], [ba + Math.cos(fa - 2.4) * 3, bb + Math.sin(fa - 2.4) * 3]], '#ffffff');
    px.line(g, mx + mw / 2 - 3, my + mh / 2, mx + mw / 2 + 3, my + mh / 2, '#ffffff80'); px.line(g, mx + mw / 2, my + mh / 2 - 3, mx + mw / 2, my + mh / 2 + 3, '#ffffff80');
    g.restore();
    const reg = DQ.regionAt(Math.round(c[0]), Math.round(c[1]), ctx); F(g, reg.name, mx + 4, my + 4, '#ffe9a0');
    ui.hit(mx, my, mw, mh, null, () => { const p = DQ.game.input.clicked(); if (p) { this.ctx.waypoint = [Math.round(sx0 + (p[0] - mx) / z), Math.round(sy0 + (p[1] - my) / z)]; DQ.sfx('uiConfirm'); } });
    glyphRow(g, W, H, ['{btn:ok} Set waypoint', '{btn:alt} Clear it', '{btn:pgUp}{btn:pgDn} Zoom', '{btn:back} Close']);
  }
  drawJournal(g, W, H, ui, x0, y0, w, h) {
    const qs = this.ctx.quests; let cx = x0 + 8;
    ['Active', 'Done', 'Notions'].forEach((n, i) => { const tw = FW(n) + 12, sel = i === this.jtab; P(g, cx, y0 + 2, tw, 14, { gold: sel }); F(g, n, cx + 6, y0 + 5, sel ? '#ffe070' : '#b8b0d8'); ui.hit(cx, y0 + 2, tw, 14, null, () => { this.jtab = i; this.jq = 0; }); cx += tw + 4; });
    const ly = y0 + 22;
    if (this.jtab === 2) {
      const known = DQ.RECIPES.filter(r => this.ctx.crafting.knows(r.id)); this.jq = Math.min(this.jq, Math.max(0, known.length - 12));
      F(g, known.length + ' Notions known', x0 + 10, ly, '#c8c0e0');
      known.slice(this.jq, this.jq + 12).forEach((r, i) => { const yy = ly + 14 + i * 14; DQ.Icons.draw(g, r.out, x0 + 18, yy + 4, .8); F(g, DQ.ITEMS[r.out].name, x0 + 30, yy, '#ffffff'); F(g, DQ.STATIONS[r.station], x0 + 200, yy, '#a8a0c8'); });
      glyphRow(g, W, H, ['{btn:up}{btn:down} Scroll', '{btn:back} Close']); return;
    }
    const list = this.journalList(); this.jq = E.clamp(this.jq, 0, Math.max(0, list.length - 1));
    if (!list.length) F(g, this.jtab === 0 ? 'No quests right now. Talk to folk with a ! over their heads.' : 'Nothing done yet. Off you go!', x0 + 10, ly, '#c8c0e0');
    list.slice(Math.max(0, this.jq - 3), Math.max(0, this.jq - 3) + 6).forEach((e, k) => {
      const i = Math.max(0, this.jq - 3) + k, qd = DQ.QUESTS[e.id], yy = ly + k * 30, sel = i === this.jq;
      P(g, x0 + 8, yy, w - 16, 27, { gold: sel, alpha: .9 });
      DQ.Hud.portrait(g, this.ctx, qd.giver, x0 + 11, yy + 3, 21);
      F(g, (qd.side ? 'Side: ' : '') + qd.title + (this.jtab === 0 && !e.s.track ? '  (not tracked)' : ''), x0 + 38, yy + 4, sel ? '#ffe070' : '#ffffff');
      const st = this.jtab === 1 ? 'Done!' : e.s.status === 'ready' ? 'Report back to ' + DQ.NPCS[qd.giver].name : qd.steps[e.s.step].text;
      F(g, st, x0 + 38, yy + 15, '#c8c0e0');
      ui.hit(x0 + 8, yy, w - 16, 27, () => { this.jq = i; }, () => { this.jq = i; if (this.jtab === 0) { e.s.track = !e.s.track; } });
    });
    const e = list[this.jq];
    if (e && this.jtab === 0) { const qd = DQ.QUESTS[e.id], yy = ly + 6 * 30 + 2; qd.steps.forEach((s, i) => { if (yy + i * 11 > H - 34) return; F(g, (i < e.s.step ? '• ' : i === e.s.step ? '▸ ' : '  ') + s.text, x0 + 14, yy + i * 11, i < e.s.step ? '#8adc8a' : i === e.s.step ? '#ffffff' : '#7a74a0'); }); }
    glyphRow(g, W, H, ['{btn:left}{btn:right} Tabs', '{btn:ok} Track on/off', '{btn:back} Close']);
  }
}

// ================================================================ crafting
class Craft {
  constructor(station, obj) { this.id = 'craft'; this.station = station; this.obj = obj; this.i = 0; this.page = 0; this.qty = 0; this.sound = 'zipper'; }
  list() { return this.ctx.crafting.forStation(this.station); }
  update(dt, I) {
    const L = this.list(), b = this.ctx.builder;
    if (I.pressed('back')) { this.ui.pop(); return; }
    if (nav(I, 'up')) { this.i = Math.max(0, this.i - 1); DQ.sfx('uiMove'); } if (nav(I, 'down')) { this.i = Math.min(L.length - 1, this.i + 1); DQ.sfx('uiMove'); }
    if (nav(I, 'left')) { this.qty = (this.qty + 2) % 3; DQ.sfx('uiMove'); } if (nav(I, 'right')) { this.qty = (this.qty + 1) % 3; DQ.sfx('uiMove'); }
    if (I.pressed('tabPrev')) this.i = Math.max(0, this.i - 6); if (I.pressed('tabNext')) this.i = Math.min(L.length - 1, this.i + 6);
    this.page = Math.floor(this.i / 6);
    if (I.pressed('ok')) this.make();
  }
  wheel(n) { this.i = E.clamp(this.i + n, 0, Math.max(0, this.list().length - 1)); }
  count(r) { const m = this.ctx.crafting.maxCraft(r, this.ctx.builder.bag); return this.qty === 0 ? 1 : this.qty === 1 ? 5 : Math.max(1, m); }
  make() {
    const r = this.list()[this.i]; if (!r) return;
    const n = Math.min(this.count(r), this.ctx.crafting.maxCraft(r, this.ctx.builder.bag));
    if (n <= 0) { DQ.sfx('uiCancel'); this.ctx.hud.toast('You don\'t have enough materials!', r.out, 'nomat'); return; }
    this.ctx.crafting.craft(r.id, n, this.ctx.builder, { station: this.obj });
  }
  draw(g, W, H, ui) {
    const L = this.list(), b = this.ctx.builder, x0 = Math.round(W / 2 - 200), y0 = 14, w = 400, h = H - 44;
    P(g, x0, y0, w, h, {}); const title = DQ.STATIONS[this.station]; P(g, x0 + 8, y0 - 6, FW(title) + 18, 16, { gold: true }); F(g, title, x0 + 17, y0 - 2, '#ffe070');
    if (!L.length) F(g, 'You don\'t know any recipes for this yet. Explore to get notions!', x0 + 12, y0 + 20, '#c8c0e0');
    const rows = L.slice(this.page * 6, this.page * 6 + 6), lw = 196;
    rows.forEach((r, k) => {
      const i = this.page * 6 + k, y = y0 + 14 + k * 30, sel = i === this.i, can = this.ctx.crafting.can(r, b.bag, 1);
      P(g, x0 + 8, y, lw, 27, { gold: sel, alpha: .9 });
      DQ.Icons.draw(g, r.out, x0 + 22, y + 13, 1.1); F(g, DQ.ITEMS[r.out].name + (r.n > 1 ? ' x' + r.n : ''), x0 + 36, y + 4, can ? '#ffffff' : '#a098b8');
      let ix = x0 + 36; for (const nd of this.ctx.crafting.needs(r, b.bag, 1)) { DQ.Icons.draw(g, nd.id, ix + 5, y + 19, .55); const ok = nd.have >= nd.need, s = nd.have + '/' + nd.need; F(g, s, ix + 11, y + 15, ok ? '#c8ffc8' : '#ff9a8a', { font: 'tiny' }); DQ.Menus.tick(g, ix + 12 + FW(s, { font: 'tiny' }), y + 15, ok); ix += 30 + FW(s, { font: 'tiny' }); }
      ui.hit(x0 + 8, y, lw, 27, () => { this.i = i; }, () => { this.i = i; this.make(); });
    });
    const pages = Math.ceil(L.length / 6); if (pages > 1) F(g, 'Page ' + (this.page + 1) + '/' + pages, x0 + 10, y0 + 14 + 6 * 30, '#8a84a8');
    // detail
    const r = L[this.i], dx = x0 + lw + 16, dw = x0 + w - dx - 8;
    P(g, dx, y0 + 14, dw, h - 34, { alpha: .9 });
    if (r) {
      const it = DQ.ITEMS[r.out]; DQ.Icons.draw(g, r.out, dx + dw / 2, y0 + 38, 2.4); F(g, it.name, dx + (dw - FW(it.name)) / 2, y0 + 60, '#ffe070');
      DQ.wrapText(it.desc || '', dw - 12).slice(0, 4).forEach((l, i) => F(g, l, dx + 6, y0 + 74 + i * 11, '#e8e4f4'));
      let yy = y0 + 122; for (const nd of this.ctx.crafting.needs(r, b.bag, this.count(r))) { DQ.Icons.draw(g, nd.id, dx + 12, yy + 4, .7); F(g, DQ.itemName(nd.id) + (nd.alt ? ' (or ' + DQ.itemName(nd.alt) + ')' : '') + '  ' + nd.have + '/' + nd.need, dx + 22, yy, nd.have >= nd.need ? '#c8ffc8' : '#ff9a8a'); DQ.Menus.tick(g, dx + dw - 14, yy, nd.have >= nd.need); yy += 12; }
      const qs = ['x1', 'x5', 'Max (' + this.ctx.crafting.maxCraft(r, b.bag) + ')']; let qx = dx + 6; qs.forEach((q, i) => { const tw = FW(q) + 12; P(g, qx, y0 + h - 44, tw, 15, { gold: i === this.qty }); F(g, q, qx + 6, y0 + h - 40, i === this.qty ? '#ffe070' : '#ffffff'); ui.hit(qx, y0 + h - 44, tw, 15, null, () => { this.qty = i; }); qx += tw + 4; });
    }
    glyphRow(g, W, H, ['{btn:ok} Craft', '{btn:left}{btn:right} Amount', '{btn:back} Close']);
  }
}
// ================================================================ a chest
class Chest {
  constructor(obj) { this.id = 'chest'; this.obj = obj; this.side = 0; this.i = 0; }
  bagList() { const b = this.ctx.builder; return b.bag.slots.map((s, i) => s ? { id: s.id, n: s.n, i } : null).filter(Boolean); }
  chestList() { return this.obj.data.store.slots.map((s, i) => s ? { id: s.id, n: s.n, i } : null).filter(Boolean); }
  update(dt, I) {
    if (I.pressed('back')) { this.ui.pop(); return; }
    const L = this.side === 0 ? this.bagList() : this.side === 1 ? this.chestList() : [];
    if (nav(I, 'left')) { this.side = Math.max(0, this.side - 1); this.i = 0; DQ.sfx('uiMove'); }
    if (nav(I, 'right')) { this.side = Math.min(1, this.side + 1); this.i = 0; DQ.sfx('uiMove'); }
    if (nav(I, 'up')) this.i = Math.max(0, this.i - 1); if (nav(I, 'down')) this.i = Math.min(L.length, this.i + 1);
    if (I.pressed('ok')) { if (this.i === L.length) this.button(); else this.move(L[this.i], I.down('sprint') ? 999 : 1); }
    if (I.pressed('alt')) { if (L[this.i]) this.move(L[this.i], 999); }
    if (I.pressed('alt2')) this.storeAll();
  }
  wheel(n) { this.i = Math.max(0, this.i + n); }
  move(e, n) {
    if (!e) return; const b = this.ctx.builder, st = this.obj.data.store; n = Math.min(n, e.n);
    if (this.side === 0) { if (DQ.ITEMS[e.id].kind === 'key') return; const left = st.add(e.id, n); b.bag.remove(e.id, n - left); }
    else { const left = b.bag.add(e.id, n); st.remove(e.id, n - left); }
    DQ.sfx('pickup', { vol: .3 });
  }
  storeAll() { const k = DQ.storeAll(this.ctx.builder.bag, this.obj.data.store); DQ.sfx('zipper'); this.ctx.hud.toast('Stored ' + k + ' materials.', 'chest'); }
  button() { if (this.side === 0) this.storeAll(); else this.makeTown(); }
  makeTown() { const t = this.ctx.town; if (!t || !t.planted || !t.inside(this.obj.x, this.obj.y)) { this.ctx.hud.toast('Only a chest inside the town can be the Town Chest!', 'chest'); return; } if (t.level < 2 && !this.ctx.quests.active('M10')) { this.ctx.hud.toast('The Town Chest unlocks at Town Level 2!', 'chest'); return; } t.setTownChest(this.obj); this.ctx.quests.setFlag('townChest'); DQ.sfx('uiConfirm'); this.ctx.hud.toast('This is now the Town Chest! Residents will use it.', 'chest'); }
  draw(g, W, H, ui) {
    const x0 = Math.round(W / 2 - 200), y0 = 14, w = 400, h = H - 44, cw = 192;
    P(g, x0, y0, w, h, {});
    const panes = [['Your Bag', this.bagList(), 'Store all materials'], [this.obj.data.townChest ? 'Town Chest ★' : 'Chest', this.chestList(), this.obj.data.townChest ? 'This is the Town Chest' : 'Make this the Town Chest']];
    panes.forEach(([title, L, btn], s) => {
      const x = x0 + 8 + s * (cw + 8), sel = s === this.side; P(g, x, y0 - 6, FW(title) + 16, 15, { gold: sel }); F(g, title, x + 8, y0 - 2, sel ? '#ffe070' : '#ffffff');
      const start = Math.max(0, (sel ? this.i : 0) - 9);
      L.slice(start, start + 11).forEach((e, k) => { const i = start + k, y = y0 + 14 + k * 15, f = sel && i === this.i; if (f) P(g, x, y - 2, cw, 14, { gold: true }); DQ.Icons.draw(g, e.id, x + 9, y + 4, .6); F(g, DQ.itemName(e.id), x + 19, y + 1, '#ffffff'); F(g, 'x' + e.n, x + cw - 6 - FW('x' + e.n), y + 1, '#c8c0e0'); ui.hit(x, y - 2, cw, 14, () => { this.side = s; this.i = i; }, () => { this.side = s; this.i = i; this.move(e, 1); }); });
      const by = y0 + h - 32, f = sel && this.i === L.length; P(g, x, by, cw, 16, { gold: f }); F(g, btn, x + 8, by + 4, f ? '#ffe070' : '#ffffff'); ui.hit(x, by, cw, 16, () => { this.side = s; this.i = L.length; }, () => { this.side = s; this.button(); });
    });
    glyphRow(g, W, H, ['{btn:ok} Move 1', '{btn:alt} Move all', '{btn:alt2} Store all', '{btn:back} Close']);
  }
}
// ================================================================ travel and the Banner
class Travel {
  constructor(from) { this.id = 'travel'; this.from = from; this.i = 0; this.sound = 'portal'; }
  list() { return DQ.WORLD.portals.filter(p => this.ctx.flags['portal_' + p.id]); }
  update(dt, I) { const L = this.list(); if (I.pressed('back')) { this.ui.pop(); return; } if (nav(I, 'up')) this.i = Math.max(0, this.i - 1); if (nav(I, 'down')) this.i = Math.min(L.length - 1, this.i + 1); if (I.pressed('ok') && L[this.i]) this.go(L[this.i]); }
  go(p) { this.ui.closeAll(); DQ.Menus.travelTo(this.ctx, p); }
  draw(g, W, H, ui) {
    const L = this.list(), w = 220, h = 30 + L.length * 16, x0 = Math.round((W - w) / 2), y0 = Math.round((H - h) / 2);
    P(g, x0, y0, w, h, {}); F(g, 'Bobbin Portal: travel to...', x0 + 10, y0 + 8, '#ffe070');
    L.forEach((p, i) => { const y = y0 + 22 + i * 16, sel = i === this.i; if (sel) P(g, x0 + 6, y - 3, w - 12, 15, { gold: true }); F(g, p.name + (this.from && this.from.data.portal === p.id ? ' (here)' : ''), x0 + 14, y, sel ? '#ffe070' : '#ffffff'); ui.hit(x0 + 6, y - 3, w - 12, 15, () => { this.i = i; }, () => this.go(p)); });
    glyphRow(g, W, H, ['{btn:ok} Travel', '{btn:back} Close']);
  }
}
class BannerScreen {
  constructor() { this.id = 'banner'; this.sound = 'uiConfirm'; }
  update(dt, I) { if (I.pressed('back') || I.pressed('ok')) this.ui.pop(); }
  draw(g, W, H, ui) {
    const ctx = this.ctx, t = ctx.town, x0 = Math.round(W / 2 - 180), y0 = 16, w = 360, h = H - 46;
    P(g, x0, y0, w, h, { gold: true });
    E.font.title(g, 'THIMBLETON', W / 2, y0 + 8, { scale: 2, colors: ['#fff0a0', '#e8a040'], align: 'center', outline: '#2a1410' });
    const nx = t.nextCheer(), base = DQ.LEVELS[t.level].cheer, k = nx ? E.clamp((t.cheer - base) / (nx - base), 0, 1) : 1;
    F(g, 'Town Level ' + t.level, x0 + 14, y0 + 32, '#ffe070'); F(g, 'Cheer ' + t.cheer + (nx ? ' / ' + nx : ''), x0 + 120, y0 + 32, '#ffb0d0');
    px.rect(g, x0 + 14, y0 + 44, w - 28, 6, '#3a2030'); px.rect(g, x0 + 14, y0 + 44, Math.round((w - 28) * k), 6, '#ff8ab0');
    F(g, nx ? 'Next level unlocks: ' + DQ.LEVELS[t.level + 1].unlocks.slice(0, 3).join(', ') : (ctx.flags.chapterClear ? 'Thimbleton is at its finest!' : 'Defeat Gnarlgrim to reach Level 5!'), x0 + 14, y0 + 54, '#e8e4f4');
    F(g, 'Rooms', x0 + 14, y0 + 70, '#ffe070');
    const rooms = ctx.rooms.list.filter(r => r.inTown); if (!rooms.length) F(g, 'No rooms yet! Walls 2 high, a door, a light.', x0 + 14, y0 + 82, '#c8c0e0');
    rooms.slice(0, 8).forEach((r, i) => F(g, '• ' + DQ.ROOM[r.type].name, x0 + 14 + (i % 2) * 90, y0 + 82 + Math.floor(i / 2) * 11, '#ffffff'));
    F(g, 'Residents', x0 + 196, y0 + 70, '#ffe070');
    ctx.npcs.list.forEach((n, i) => { const y = y0 + 82 + i * 16; DQ.Hud.portrait(g, ctx, n.id, x0 + 196, y - 2, 14); F(g, n.name, x0 + 214, y, '#ffffff'); F(g, n.mood >= 2 ? '♥ Happy' : n.mood >= 1 ? 'Content' : '... Unhappy', x0 + 290, y, n.mood >= 2 ? '#ff9ac0' : n.mood >= 1 ? '#c8ffc8' : '#ffb0a0'); });
    const b = ctx.builder, hint = ctx.rooms.diagnose(b.cx, b.cy, b.L); if (hint) { P(g, x0 + 10, y0 + h - 36, w - 20, 16, {}); F(g, 'Here: ' + hint, x0 + 18, y0 + h - 32, '#ffb0a0'); }
    glyphRow(g, W, H, ['{btn:back} Close']);
  }
}
DQ.Menus = {
  Satchel, Craft, Chest, Travel, BannerScreen,
  openSatchel(ctx, tab = 0) { if (!ctx.ui.open) ctx.ui.push(new Satchel(tab)); },
  openCraft(ctx, st, obj) { ctx.ui.push(new Craft(st, obj)); const b = ctx.builder; if (obj) b.targetFacing = Math.atan2(obj.y * T + 8 - b.y, obj.x * T + 8 - b.x); },
  openChest(ctx, obj) { ctx.ui.push(new Chest(obj)); },
  openTravel(ctx, obj) { ctx.ui.push(new Travel(obj)); },
  openBanner(ctx) { ctx.ui.push(new BannerScreen()); },
  travelTo(ctx, p) { const b = ctx.builder, w = ctx.world, L = w.topZ(p.x, p.y + 1); DQ.sfx('portal'); DQ.game.flash('#c8a0ff', .25, .5); b.place3(p.x * T + 8, (p.y + 1) * T + 8, L * T); for (const n of ctx.npcs.list) if (n.follow) n.place(p.x + 1, p.y + 1, L); DQ.game.cam.snap = true; ctx.events.emit('travel', { to: p.id }); },
  tick(g, x, y, ok) { if (ok) { px.line(g, x, y + 3, x + 1, y + 5, '#8adc8a'); px.line(g, x + 1, y + 5, x + 4, y, '#8adc8a'); } else { px.line(g, x, y, x + 4, y + 4, '#ff7a6a'); px.line(g, x + 4, y, x, y + 4, '#ff7a6a'); } },
  /** the world from above, a pixel per column, shaded by height; unexplored linen (refreshed every few seconds) */
  mapImage(ctx) {
    if (typeof document === 'undefined') return null;
    const w = ctx.world, now = DQ.game.real; if (ctx._map && now - ctx._mapT < 3) return ctx._map;
    const cv = ctx._map || E.mkCanvas(w.W, w.D), g = E.ctx2d(cv), img = g.createImageData(w.W, w.D), ex = ctx.explored;
    for (let y = 0; y < w.D; y++) for (let x = 0; x < w.W; x++) {
      const i = (y * w.W + x) * 4, t = w.topZ(x, y); let c;
      if (ex && !ex[y * w.W + x]) { const k = (x + y) % 4 === 0 ? 210 : 226; c = [k, k - 6, k - 22]; }
      else if (!t) c = [12, 10, 40];
      else { const id = w.get(x, y, t - 1), b = DQ.BLOCKS[id], wat = DQ.LIQUID[w.get(x, y, t)] || DQ.LIQUID[id]; c = wat ? [74, 138, 208] : E.hex(b ? b.top[1] : '#808080'); const k = .75 + (t - 9) * .035; c = c.map(v => E.clamp(v * k, 0, 255)); }
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); ctx._map = cv; ctx._mapT = now; return cv;
  }
};
})();
