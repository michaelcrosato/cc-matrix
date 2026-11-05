// UI: stitched panels, HUD, popups, and every modal screen (Satchel, craft, chest, banner, travel, journal, map).
(() => {
const { E, T } = DQ;
const px = E.px;
const F = (g, t, x, y, c = '#fff', o = {}) => E.font.text(g, String(t), x, y, c, { shadow: '#000', outline: false, ...o });
const W = (t, o) => E.font.width(String(t), o);
DQ.F = F;
const CREAM = '#f3e9c8', INK = '#1b1840';
DQ.stitchBox = function (g, x, y, w, h, o = {}) {
  const bg = o.bg || INK, bd = o.border || CREAM;
  px.rect(g, x, y, w, h, '#0a0818'); px.rect(g, x + 1, y + 1, w - 2, h - 2, bd); px.rect(g, x + 2, y + 2, w - 4, h - 4, bg);
  px.rect(g, x + 2, y + 2, w - 4, 1, E.tones(bg).sh);
  for (let i = 5; i < w - 5; i += 4) { px.rect(g, x + i, y + 4, 2, 1, bd); px.rect(g, x + i, y + h - 5, 2, 1, bd); }
  for (let j = 5; j < h - 5; j += 4) { px.rect(g, x + 4, y + j, 1, 2, bd); px.rect(g, x + w - 5, y + j, 1, 2, bd); }
};
const bar = (g, x, y, w, h, f, col, bg = '#241c3a') => { px.rect(g, x - 1, y - 1, w + 2, h + 2, '#0a0818'); px.rect(g, x, y, w, h, bg); px.rect(g, x, y, Math.max(0, Math.round(w * Math.min(1, Math.max(0, f)))), h, col); px.rect(g, x, y, Math.max(0, Math.round(w * Math.min(1, Math.max(0, f)))), 1, E.tones(col).hi); };
DQ.bar = bar;

// ---------- panel stack ----------
const ui = DQ.ui = {
  stack: [], hits: [], clickLock: 0,
  isOpen() { return this.stack.length > 0; },
  open(name, arg) { const p = new (PANELS[name])(arg || {}); p.panel = name; this.stack.push(p); this.clickLock = .15; DQ.audio.sfx('select', { vol: .3 }); return p; },
  close() { const p = this.stack.pop(); if (p && p.onClose) p.onClose(); this.clickLock = .15; DQ.audio.sfx('cancel', { vol: .3 }); },
  closeAll() { while (this.stack.length) { const p = this.stack.pop(); if (p.onClose) p.onClose(); } },
  top() { return this.stack[this.stack.length - 1]; },
  update(dt) {
    const p = this.top(); if (!p) return; this.clickLock -= dt; const I = DQ.game.input;
    const ptr = I.pointer(), clk = this.clickLock <= 0 ? I.clicked() : null; this.hover = null;
    // mouse hover/click against last frame's hit rects
    if (ptr) for (const h of this.hits) if (ptr[0] >= h.x && ptr[0] < h.x + h.w && ptr[1] >= h.y && ptr[1] < h.y + h.h) { this.hover = h; break; }
    if (this.hover && this.hover.focus && I.lastDevice === 'mouse' && (this.lastPtr == null || Math.hypot(ptr[0] - this.lastPtr[0], ptr[1] - this.lastPtr[1]) > 0)) this.hover.focus();
    this.lastPtr = ptr ? [ptr[0], ptr[1]] : null;
    if (clk) for (const h of this.hits) if (clk[0] >= h.x && clk[0] < h.x + h.w && clk[1] >= h.y && clk[1] < h.y + h.h) { if (h.focus) h.focus(); if (h.click) h.click(); break; }
    if (this.top() === p) p.update(dt, I);
  },
  hit(x, y, w, h, o) { this.hits.push({ x, y, w, h, ...o }); },
  draw(r) {
    const p = this.top(); this.hits = this.hits.slice(0, 0); if (!p) return;
    const keep = this.hits; this.hits = [];
    r.overlay(g => { px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05030f')); p.draw(g, r); });
  }
};
// repeating nav helper: returns [dx, dy] this step (menus)
DQ.navStep = function (I) { let dx = 0, dy = 0; if (I.repeat('up', .35, .09)) dy = -1; if (I.repeat('down', .35, .09)) dy = 1; if (I.repeat('left', .35, .09)) dx = -1; if (I.repeat('right', .35, .09)) dx = 1; return [dx, dy]; };

// ---------- panels ----------
const PANELS = {};
const tabsDraw = (g, r, tabs, cur, x, y, p) => {
  let cx = x;
  tabs.forEach((t, i) => { const w = W(t) + 14; px.rect(g, cx, y, w, 13, i === cur ? '#ffd36a' : '#2a2450'); px.rect(g, cx, y + 12, w, 1, '#0a0818'); F(g, t, cx + 7, y + 3, i === cur ? '#2a1a00' : '#c8c0e8', { shadow: i === cur ? null : '#000' }); ui.hit(cx, y, w, 13, { click: () => p.setTab(i), focus: null }); cx += w + 2; });
};

// --- Satchel: Bag | Craft | Journal | Map ---
PANELS.satchel = class {
  constructor(o) { this.tabs = ['Bag', 'Craft', 'Journal', 'Map']; this.tab = o.tab || 0; this.sel = 0; this.craft = new CraftView('pocket', true); this.jsel = 0; this.mapZoom = 1; this.mapPan = [0, 0]; }
  setTab(i) { this.tab = (i + this.tabs.length) % this.tabs.length; DQ.audio.sfx('select', { vol: .25 }); }
  bagItems() { const S = DQ.S; const order = ['block', 'obj', 'food', 'use', 'weapon', 'body', 'shield', 'mat', 'key']; return Object.keys(S.bag).filter(k => S.bag[k] > 0).sort((a, b) => order.indexOf(DQ.ITEMS[a].kind) - order.indexOf(DQ.ITEMS[b].kind)); }
  update(dt, I) {
    const S = DQ.S;
    if (I.pressed('cancel') || I.pressed('satchel') || I.pressed('pause')) { ui.close(); return; }
    if (I.pressed('hotNext') || I.pressed('camR')) this.setTab(this.tab + 1); if (I.pressed('hotPrev') || I.pressed('camL')) this.setTab(this.tab - 1);
    if (I.pressed('map')) this.tab = 3; if (I.pressed('journal')) this.tab = 2;
    const [dx, dy] = DQ.navStep(I);
    if (this.tab === 0) {
      const items = this.bagItems(), cols = 8; this.sel = Math.min(this.sel, Math.max(0, items.length - 1));
      if (dx) this.sel = Math.max(0, Math.min(items.length - 1, this.sel + dx)); if (dy) this.sel = Math.max(0, Math.min(items.length - 1, this.sel + dy * cols));
      const id = items[this.sel];
      if (id && (I.pressed('confirm') || I.pressed('place'))) {
        const it = DQ.ITEMS[id];
        if (it.kind === 'food') DQ.eat(id); else if (['block', 'obj', 'use'].includes(it.kind) || id === 'banner') { const ex = S.hotbar.indexOf(id); if (ex >= 0 && ex !== S.sel) S.hotbar[ex] = S.hotbar[S.sel]; S.hotbar[S.sel] = id; DQ.toast(it.name + ' set to slot ' + (S.sel + 1), '#ffe9a0'); }
        else DQ.toast(it.name + ' is ready in your hands.', '#ccc');
      }
    } else if (this.tab === 1) this.craft.update(dt, I, dx, dy);
    else if (this.tab === 2) { const n = DQ.QUESTS.filter(q => S.quests[q.id] !== undefined).length; if (dy) this.jsel = Math.max(0, Math.min(Math.max(0, n - 1), this.jsel + dy)); }
    else if (this.tab === 3) { if (dx) this.mapPan[0] += dx * 6; if (dy) this.mapPan[1] += dy * 6; if (I.pressed('confirm')) this.mapZoom = this.mapZoom === 1 ? 2 : 1; }
  }
  draw(g, r) {
    const S = DQ.S, h = S.hero, w = Math.min(r.W - 20, 400), x = (r.W - w) / 2, y = 8, ht = r.H - 16;
    DQ.stitchBox(g, x, y, w, ht); tabsDraw(g, r, this.tabs, this.tab, x + 8, y + 7, this);
    F(g, 'Satchel', x + w - 8, y + 9, '#ffd36a', { align: 'right' });
    const by = y + 24;
    if (this.tab === 0) this.drawBag(g, r, x, by, w, ht - 40);
    else if (this.tab === 1) this.craft.draw(g, x + 8, by, w - 16, ht - 40, r);
    else if (this.tab === 2) this.drawJournal(g, x + 8, by, w - 16, ht - 40);
    else this.drawMap(g, x + 8, by, w - 16, ht - 40);
    const hint = this.tab === 0 ? [['confirm', 'Set to hotbar'], ['hotNext', 'Next tab'], ['cancel', 'Close']] : this.tab === 1 ? [['confirm', 'Craft'], ['left', 'Qty'], ['cancel', 'Close']] : this.tab === 3 ? [['confirm', 'Zoom'], ['cancel', 'Close']] : [['hotNext', 'Next tab'], ['cancel', 'Close']];
    DQ.prompts(g, hint, x + 10, y + ht - 14);
  }
  drawBag(g, r, x, y, w, ht) {
    const S = DQ.S, h = S.hero, items = this.bagItems(), cols = 8, cs = 24, gx = x + 10;
    // vitals
    F(g, 'HP ' + Math.ceil(h.hp) + '/' + h.maxHp, gx, y + 2, '#ff9a9a'); bar(g, gx + 60, y + 3, 80, 6, h.hp / h.maxHp, '#e84a5a');
    F(g, 'Belly ' + Math.round(h.belly), gx + 150, y + 2, '#ffd890'); bar(g, gx + 205, y + 3, 80, 6, h.belly / 100, '#e8a040');
    const wp = DQ.inv.weapon(); F(g, wp.name + (S.equip.body ? ', Vest' : '') + (S.equip.shield ? ', Shield' : ''), gx, y + 14, '#c8c0e8');
    F(g, 'ATK ' + wp.atk + '  DEF ' + DQ.inv.defense(), gx + 190, y + 14, '#c8c0e8');
    for (let i = 0; i < Math.max(24, items.length); i++) {
      const cx = gx + (i % cols) * (cs + 2), cy = y + 28 + Math.floor(i / cols) * (cs + 2), id = items[i];
      px.rect(g, cx, cy, cs, cs, i === this.sel ? '#ffd36a' : '#0a0818'); px.rect(g, cx + 1, cy + 1, cs - 2, cs - 2, '#2a2450');
      if (id) { DQ.drawIcon(g, id, cx + 4, cy + 3, 16); F(g, S.bag[id], cx + cs - 2, cy + cs - 9, '#fff', { align: 'right' }); if (S.hotbar.includes(id)) px.rect(g, cx + 2, cy + 2, 3, 3, '#7aa7ff'); }
      ui.hit(cx, cy, cs, cs, { focus: () => { if (id) this.sel = i; }, click: () => { if (id) this.sel = i; } });
    }
    const id = items[this.sel]; const dx = gx + cols * (cs + 2) + 8;
    if (id) { const it = DQ.ITEMS[id]; DQ.drawIcon(g, id, dx, y + 28, 32); F(g, it.name, dx + 38, y + 30, '#ffd36a'); F(g, '×' + S.bag[id], dx + 38, y + 40, '#fff'); const lines = E.font.wrap(it.desc || '', w - (dx - x) - 14); lines.slice(0, 7).forEach((l, i) => F(g, l, dx, y + 66 + i * 9, '#c8c0e8')); }
    else F(g, 'Your bag is empty. Break some blocks!', dx, y + 30, '#c8c0e8');
    F(g, DQ.inv.slotsUsed() + '/40 slots', gx, y + ht - 16 - 8, '#9a94c0');
  }
  drawJournal(g, x, y, w, ht) {
    const S = DQ.S, qs = DQ.QUESTS.filter(q => S.quests[q.id] !== undefined);
    qs.forEach((q, i) => { const st = S.quests[q.id], done = st === 'done'; const yy = y + i * 11; if (yy > y + ht - 60) return; F(g, (i === this.jsel ? '▸ ' : '  ') + q.title, x, yy, done ? '#7a7a98' : i === this.jsel ? '#ffd36a' : '#fff'); F(g, done ? 'done' : 'active', x + 150, yy, done ? '#7a7a98' : '#8affd0'); ui.hit(x, yy, 190, 10, { focus: () => { this.jsel = i; } }); });
    if (!qs.length) F(g, 'No quests yet.', x, y, '#c8c0e8');
    const q = qs[this.jsel]; if (q) { const bx = x + 200; const giver = q.giver === 'granny' ? 'Granny Gossamer' : DQ.NPCS[q.giver].name; F(g, 'From ' + giver, bx, y, '#c8c0e8'); q.steps.forEach((s, i) => { const st = S.quests[q.id]; const done = st === 'done' || (typeof st === 'number' && i < st); const lines = E.font.wrap(s.text, w - 205); lines.forEach((l, j) => F(g, (j ? '   ' : done ? '+ ' : '- ') + l, bx, y + 14 + i * 20 + j * 9, done ? '#7a9a88' : '#fff')); }); }
    const act = DQ.currentObjective(); if (act) F(g, 'Now: ' + act.text, x, y + ht - 30, '#ffe9a0');
  }
  drawMap(g, x, y, w, ht) {
    const S = DQ.S, wd = S.world, sc = this.mapZoom === 1 ? Math.max(1, Math.floor(Math.min(w / wd.W, ht / wd.H))) : Math.max(2, Math.floor(Math.min(w / wd.W, ht / wd.H)) * 2), mw = wd.W * sc, mh = wd.H * sc;
    const ox = Math.round(x + (w - Math.min(mw, w)) / 2 - (this.mapZoom === 1 ? 0 : this.mapPan[0] * 2)), oy = Math.round(y - (this.mapZoom === 1 ? 0 : this.mapPan[1] * 2));
    const clipx = x, clipy = y, clipw = w, cliph = ht;
    const FL = { grass: '#4f8a3a', dirt: '#a98a5a', stone: '#8a8a98', water: '#3a6aaa', fray: '#6a4a8a', sand: '#d7bf84' };
    const inside = (xx, yy, ww, hh) => xx >= clipx && yy >= clipy && xx + ww <= clipx + clipw && yy + hh <= clipy + cliph;
    for (let cy = 0; cy < wd.H; cy++) for (let cx = 0; cx < wd.W; cx++) { const xx = ox + cx * sc, yy = oy + cy * sc; if (!inside(xx, yy, sc, sc)) continue; const hh = wd.hgt[cy * wd.W + cx]; const col = hh ? (DQ.BLOCKS[wd.topId(cx, cy)].top) : FL[wd.floor[cy * wd.W + cx]]; px.rect(g, xx, yy, sc, sc, col); }
    const mark = (cx, cy, col, s = 3) => { const xx = ox + cx * sc - 1, yy = oy + cy * sc - 1; if (inside(xx, yy, s, s)) px.rect(g, xx, yy, s, s, col); };
    for (const o of wd.list) { if (o.type === 'portal') mark(o.x, o.y, '#a0c8ff', 4); else if (o.type === 'banner') mark(o.x, o.y, '#ffd36a', 4); else if (o.type === 'button') mark(o.x, o.y, '#ffe060', 2); }
    for (const rs of S.residents) mark(Math.floor(rs.x / T), Math.floor(rs.y / T), '#8affd0', 3);
    if (S.bundle) mark(Math.floor(S.bundle.x / T), Math.floor(S.bundle.y / T), '#ff8aa8', 4);
    const t = DQ.objectiveTarget(DQ.currentObjective()); if (t) mark(Math.floor(t.x / T), Math.floor(t.y / T), (Math.floor(S.time * 3) % 2) ? '#ff5050' : '#ffffff', 4);
    mark(Math.floor(S.hero.x / T), Math.floor(S.hero.y / T), (Math.floor(S.time * 4) % 2) ? '#ffffff' : '#ff3a3a', 4);
    F(g, DQ.REGIONS[S.regionNow] || '', x, y + ht - 10, '#fff'); F(g, 'blue = portals   gold = banner   green = residents', x + w, y + ht - 10, '#c8c0e8', { align: 'right' });
  }
};

// --- Craft view (shared by Satchel and stations) ---
class CraftView {
  constructor(station, all) { this.station = station; this.all = !!all; this.sel = 0; this.qty = 1; this.flash = 0; }
  list() { const S = DQ.S; return DQ.RECIPES.filter(r => S.known[r.out] && (this.all || r.station === this.station)).sort((a, b) => (a.station === 'pocket' ? 0 : 1) - (b.station === 'pocket' ? 0 : 1)); }
  update(dt, I, dx, dy) {
    const L = this.list(); if (!L.length) return; this.sel = Math.max(0, Math.min(L.length - 1, this.sel + dy)); if (dx) { const q = [1, 5, 99]; this.qty = q[Math.max(0, Math.min(2, q.indexOf(this.qty) + dx))]; }
    const r = L[this.sel]; this.flash = Math.max(0, this.flash - dt);
    if (I.pressed('confirm')) this.doCraft(r);
  }
  doCraft(r) {
    const S = DQ.S; if (!r) return;
    if (r.station !== 'pocket' && !DQ.stationNear(r.station)) { DQ.toast('Stand near a ' + DQ.STATIONS[r.station] + ' to craft this.', '#ff8a8a'); DQ.audio.sfx('bump'); return; }
    const n = DQ.craft(r, this.qty === 99 ? 99 : this.qty); if (n) { this.flash = .4; DQ.audio.sfx('levelup', { vol: .25 }); S.hero.thought = 0; DQ.game.particles.glints(S.hero.x, S.hero.y, 24, 10, '#ffe9a0'); } else { DQ.toast("You don't have enough.", '#ff8a8a'); DQ.audio.sfx('bump'); }
  }
  draw(g, x, y, w, ht, r) {
    const S = DQ.S, L = this.list();
    if (!L.length) { F(g, 'No notions yet. Touch new materials to get ideas!', x + 4, y + 6, '#c8c0e8'); return; }
    const per = 8, page = Math.floor(this.sel / per), lw = 150;
    for (let i = 0; i < per; i++) {
      const idx = page * per + i, rc = L[idx]; if (!rc) break; const yy = y + i * 18, can = DQ.canCraft(rc), near = rc.station === 'pocket' || DQ.stationNear(rc.station);
      px.rect(g, x, yy, lw, 17, idx === this.sel ? '#ffd36a' : '#2a2450'); DQ.drawIcon(g, rc.out, x + 2, yy + 1, 14);
      F(g, DQ.ITEMS[rc.out].name + (rc.n > 1 ? ' ×' + rc.n : ''), x + 19, yy + 4, idx === this.sel ? '#2a1a00' : can ? '#fff' : '#8a84a8', { shadow: idx === this.sel ? null : '#000' });
      if (!near) F(g, 'bench', x + lw - 4, yy + 4, '#ff8a8a', { align: 'right' }); ui.hit(x, yy, lw, 17, { focus: () => { this.sel = idx; }, click: () => { this.sel = idx; this.doCraft(rc); } });
    }
    if (L.length > per) F(g, (page + 1) + '/' + Math.ceil(L.length / per), x + lw / 2, y + per * 18 + 2, '#9a94c0', { align: 'center' });
    const rc = L[this.sel], dx = x + lw + 10; if (!rc) return; const it = DQ.ITEMS[rc.out];
    DQ.drawIcon(g, rc.out, dx, y, 32); F(g, it.name, dx + 38, y + 2, '#ffd36a'); F(g, rc.station === 'pocket' ? 'Pocket Notions' : DQ.STATIONS[rc.station], dx + 38, y + 12, DQ.stationNear(rc.station) ? '#8affd0' : '#ff8a8a');
    E.font.wrap(it.desc || '', w - lw - 14).slice(0, 3).forEach((l, i) => F(g, l, dx, y + 38 + i * 9, '#c8c0e8'));
    let yy = y + 70; for (const [k, n] of Object.entries(rc.in)) { const have = DQ.inv.count(k), ok = have >= n; DQ.drawIcon(g, k, dx, yy - 3, 14); F(g, DQ.ITEMS[k].name, dx + 18, yy, ok ? '#fff' : '#ff9a9a'); F(g, have + '/' + n + (ok ? ' OK' : ' NEED'), dx + 108, yy, ok ? '#8affd0' : '#ff9a9a'); yy += 14; }
    F(g, 'Make: ' + (this.qty === 99 ? 'Max' : '×' + this.qty), dx, y + ht - 22, '#ffe9a0'); if (this.flash > 0) F(g, 'Ta-da!', dx + 70, y + ht - 22, '#ffd36a');
  }
}
DQ.CraftView = CraftView;
PANELS.craft = class {
  constructor(o) { this.station = o.station; this.view = new CraftView(o.station, false); this.obj = o.obj; }
  update(dt, I) { if (I.pressed('cancel') || I.pressed('pause') || I.pressed('interact')) { ui.close(); return; } const [dx, dy] = DQ.navStep(I); this.view.update(dt, I, dx, dy); }
  draw(g, r) {
    const w = Math.min(r.W - 40, 380), x = (r.W - w) / 2, y = 20, ht = r.H - 40; DQ.stitchBox(g, x, y, w, ht);
    F(g, DQ.STATIONS[this.station], x + 12, y + 10, '#ffd36a', { scale: 1 }); DQ.prompts(g, [['confirm', 'Craft'], ['left', 'Quantity'], ['cancel', 'Close']], x + 10, y + ht - 14);
    this.view.draw(g, x + 10, y + 26, w - 20, ht - 44, r);
  }
};

// --- Chest ---
PANELS.chest = class {
  constructor(o) { this.obj = o.obj; this.obj.items = this.obj.items || []; this.side = 0; this.sel = [0, 0]; }
  bag() { const S = DQ.S; return Object.keys(S.bag).filter(k => S.bag[k] > 0 && DQ.ITEMS[k].kind !== 'key'); }
  update(dt, I) {
    const S = DQ.S, ch = this.obj; if (I.pressed('cancel') || I.pressed('pause') || I.pressed('interact')) { ui.close(); return; }
    const [dx, dy] = DQ.navStep(I); const L = this.side === 0 ? this.bag() : ch.items, cols = 5;
    if (dx) { if (this.side === 0 && this.sel[0] % cols === cols - 1 || dx > 0 && this.side === 0 && this.sel[0] >= L.length - 1) { if (dx > 0) this.side = 1; } else if (this.side === 1 && this.sel[1] % cols === 0 && dx < 0) this.side = 0; else this.sel[this.side] = Math.max(0, Math.min(L.length - 1, this.sel[this.side] + dx)); }
    if (dy) this.sel[this.side] = Math.max(0, Math.min(Math.max(0, L.length - 1), this.sel[this.side] + dy * cols));
    const i = Math.min(this.sel[this.side], Math.max(0, L.length - 1));
    if (I.pressed('confirm') && L.length) this.move(i, I.down('sprint') ? 99 : 1);
    if (I.pressed('place')) this.storeAll();
  }
  move(i, n) {
    const S = DQ.S, ch = this.obj;
    if (this.side === 0) { const id = this.bag()[i]; if (!id) return; const cnt = Math.min(n, S.bag[id]); const e = ch.items.find(x => x.id === id); if (!e && ch.items.length >= 20) { DQ.toast('The chest is full!', '#ff8a8a'); return; } DQ.inv.remove(id, cnt); if (e) e.n += cnt; else ch.items.push({ id, n: cnt }); DQ.audio.sfx('pickup', { vol: .3 }); }
    else { const e = ch.items[i]; if (!e) return; const take = Math.min(n, e.n), got = DQ.inv.add(e.id, take, true); if (!got) { DQ.toast('Your bag is full!', '#ff8a8a'); return; } e.n -= got; if (e.n <= 0) ch.items.splice(i, 1); DQ.audio.sfx('pickup', { vol: .3 }); }
  }
  storeAll() { const S = DQ.S, ch = this.obj; let moved = 0; for (const id of this.bag()) { if (!['mat', 'block'].includes(DQ.ITEMS[id].kind)) continue; const cnt = S.bag[id]; const e = ch.items.find(x => x.id === id); if (!e && ch.items.length >= 20) continue; DQ.inv.remove(id, cnt); if (e) e.n += cnt; else ch.items.push({ id, n: cnt }); moved++; } DQ.toast(moved ? 'Stored all materials.' : 'Nothing to store.', '#ffe9a0'); }
  draw(g, r) {
    const S = DQ.S, w = Math.min(r.W - 30, 380), x = (r.W - w) / 2, y = 20, ht = r.H - 40; DQ.stitchBox(g, x, y, w, ht);
    F(g, this.obj.townChest ? 'Town Chest' : 'Chest', x + w / 2, y + 10, '#ffd36a', { align: 'center' });
    for (const side of [0, 1]) {
      const L = side === 0 ? this.bag() : this.obj.items, gx = x + 10 + side * (w / 2), cols = 5, cs = 24; F(g, side === 0 ? 'Bag' : 'Chest', gx, y + 24, '#c8c0e8');
      for (let i = 0; i < Math.max(20, L.length); i++) {
        const cx = gx + (i % cols) * (cs + 2), cy = y + 36 + Math.floor(i / cols) * (cs + 2), id = side === 0 ? L[i] : L[i] && L[i].id, n = side === 0 ? (id ? S.bag[id] : 0) : (L[i] ? L[i].n : 0);
        px.rect(g, cx, cy, cs, cs, side === this.side && i === this.sel[side] ? '#ffd36a' : '#0a0818'); px.rect(g, cx + 1, cy + 1, cs - 2, cs - 2, '#2a2450');
        if (id) { DQ.drawIcon(g, id, cx + 4, cy + 3, 16); F(g, n, cx + cs - 2, cy + cs - 9, '#fff', { align: 'right' }); }
        ui.hit(cx, cy, cs, cs, { focus: () => { this.side = side; this.sel[side] = i; }, click: () => { this.side = side; this.sel[side] = i; if (id) this.move(i, 1); } });
      }
    }
    const L = this.side === 0 ? this.bag() : this.obj.items, i = this.sel[this.side], id = L[i] && (this.side === 0 ? L[i] : L[i].id); if (id) F(g, DQ.ITEMS[id].name, x + 12, y + ht - 28, '#fff');
    DQ.prompts(g, [['confirm', 'Move 1'], ['sprint', 'Move stack'], ['place', 'Store all materials'], ['cancel', 'Close']], x + 10, y + ht - 14);
  }
};

// --- Banner screen ---
PANELS.banner = class {
  update(dt, I) { if (I.pressed('cancel') || I.pressed('pause') || I.pressed('interact') || I.pressed('confirm')) ui.close(); }
  draw(g, r) {
    const S = DQ.S, t = S.town, w = Math.min(r.W - 40, 360), x = (r.W - w) / 2, y = 16, ht = r.H - 32; DQ.stitchBox(g, x, y, w, ht, { border: '#ffd36a' });
    F(g, 'Banner of Mending', x + w / 2, y + 10, '#ffd36a', { align: 'center', scale: 1 }); F(g, 'Thimbleton, Town Level ' + t.level, x + w / 2, y + 22, '#fff', { align: 'center' });
    const nl = DQ.LEVELS[t.level], cur = DQ.LEVELS[t.level - 1];
    if (nl) { F(g, 'Cheer ' + t.cheer + ' / ' + nl.cheer, x + 14, y + 38, '#ff9ac8'); bar(g, x + 14, y + 48, w - 28, 7, (t.cheer - cur.cheer) / (nl.cheer - cur.cheer), '#ff7ab0'); F(g, 'Next: ' + nl.unlock, x + 14, y + 60, '#c8c0e8'); } else F(g, 'Cheer ' + t.cheer + ' (MAX LEVEL)', x + 14, y + 38, '#ff9ac8');
    F(g, 'Rooms (' + t.rooms.length + ')', x + 14, y + 80, '#ffd36a'); const counts = {}; for (const rm of t.rooms) counts[rm.type] = (counts[rm.type] || 0) + 1;
    Object.entries(counts).forEach(([k, v], i) => F(g, k + (v > 1 ? ' ×' + v : ''), x + 20 + (i % 2) * 160, y + 92 + Math.floor(i / 2) * 10, '#fff'));
    F(g, 'Residents', x + 14, y + 130, '#ffd36a'); S.residents.forEach((rs, i) => { const hap = Math.min(3, (DQ.roomCount(rs.def.fav) ? 2 : 0) + 1); F(g, rs.def.name + ' (' + rs.def.job + ')', x + 20, y + 142 + i * 10, '#fff'); F(g, DQ.roomCount(rs.def.fav) ? 'happy' : 'wants a ' + rs.def.fav, x + w - 14, y + 142 + i * 10, DQ.roomCount(rs.def.fav) ? '#8affd0' : '#ffb070', { align: 'right' }); });
    if (S.leaks && S.leaks.length) { const lk = S.leaks[0]; F(g, 'Almost a room: ' + lk.leak[2] + '.', x + 14, y + ht - 28, '#ff9a9a'); }
    DQ.prompts(g, [['cancel', 'Close']], x + 10, y + ht - 14);
  }
};

// --- Portal travel ---
PANELS.travel = class {
  constructor(o) { this.from = o.from; this.sel = 0; this.list = DQ.S.world.list.filter(p => p.type === 'portal' && p !== o.from && DQ.S.stats.discovered[p.key]); }
  update(dt, I) {
    if (I.pressed('cancel') || I.pressed('pause') || I.pressed('interact')) { ui.close(); return; } const [, dy] = DQ.navStep(I); if (dy) this.sel = Math.max(0, Math.min(this.list.length - 1, this.sel + dy));
    if (I.pressed('confirm') && this.list[this.sel]) this.go(this.list[this.sel]);
  }
  go(p) { const S = DQ.S, h = S.hero; ui.closeAll(); DQ.game.flash('#a0c8ff', .3, .7); DQ.audio.sfx('harp'); h.x = p.x * T + 8 + 16; h.y = p.y * T + 8 + 16; h.z = 0; h.vx = h.vy = 0; DQ.snapCam && DQ.snapCam(); DQ.game.particles.glints(h.x, h.y, 14, 20, '#a0c8ff'); }
  draw(g, r) {
    const w = 220, x = (r.W - w) / 2, y = 50, ht = 20 + Math.max(2, this.list.length) * 16 + 24; DQ.stitchBox(g, x, y, w, ht, { border: '#a0c8ff' });
    F(g, 'Bobbin Portals', x + w / 2, y + 8, '#a0c8ff', { align: 'center' });
    if (!this.list.length) F(g, 'No other portals attuned yet.', x + w / 2, y + 30, '#c8c0e8', { align: 'center' });
    this.list.forEach((p, i) => { const yy = y + 22 + i * 16; px.rect(g, x + 10, yy, w - 20, 14, i === this.sel ? '#ffd36a' : '#2a2450'); F(g, p.name, x + 16, yy + 3, i === this.sel ? '#2a1a00' : '#fff', { shadow: i === this.sel ? null : '#000' }); ui.hit(x + 10, yy, w - 20, 14, { focus: () => { this.sel = i; }, click: () => { this.sel = i; this.go(p); } }); });
    DQ.prompts(g, [['confirm', 'Travel'], ['cancel', 'Close']], x + 10, y + ht - 14);
  }
};

// --- generic confirm / info ---
PANELS.info = class {
  constructor(o) { this.title = o.title; this.lines = o.lines; this.onClose = o.onClose; this.scroll = 0; }
  update(dt, I) { const [, dy] = DQ.navStep(I); this.scroll = Math.max(0, this.scroll + dy * 2); if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('pause')) ui.close(); }
  draw(g, r) { const w = Math.min(r.W - 40, 380), x = (r.W - w) / 2, y = 14, ht = r.H - 28; DQ.stitchBox(g, x, y, w, ht); F(g, this.title, x + w / 2, y + 9, '#ffd36a', { align: 'center' }); let yy = y + 24 - this.scroll * 5; for (const l of this.lines) { for (const ll of E.font.wrap(l, w - 24)) { if (yy > y + 18 && yy < y + ht - 18) F(g, ll, x + 12, yy, '#e8e0ff'); yy += 9; } yy += 2; } DQ.prompts(g, [['up', 'Scroll'], ['cancel', 'Close']], x + 10, y + ht - 14); }
};
DQ.PANELS = PANELS;
})();
