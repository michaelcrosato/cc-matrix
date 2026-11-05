// The HUD (10-foot: big, few, clear): HP and Belly, the objective and its marker, the clock and the Banner badge, the
// hotbar, context prompts with glyphs, toasts, popups (Notion, Room, Level, Quest), siege and boss bars, the cursor,
// Builder's Eye, the Pattern panel, tutorials. Also the shared drawing helpers: felt panels, icons, balloons, portraits.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const F = (g, s, x, y, c, o) => E.font.text(g, DQ.safe(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#05040a' }, o || {}));
const FW = (s, o) => E.font.width(DQ.safe(s), o);
// ---------------------------------------------------------------- icons
const _ic = new Map();
DQ.Icons = {
  get(id) {
    if (_ic.has(id)) return _ic.get(id);
    if (typeof document === 'undefined' && !DQ.TEST.canvas) return null;
    const it = DQ.ITEMS[id]; let cv = null;
    if (it && it.kind === 'block') cv = DQ.blockIcon(it.block);
    else if (it && it.icon) { const rows = it.icon.rows, w = Math.max(...rows.map(r => r.length)), h = rows.length; cv = E.mkCanvas(16, 16); const g = E.ctx2d(cv), ox = Math.floor((16 - w) / 2), oy = Math.floor((16 - h) / 2);
      rows.forEach((r, y) => [...r].forEach((ch, x) => { const c = it.icon.pal[ch]; if (c) { px.rect(g, ox + x, oy + y, 1, 1, c); } }));
      // a dark outline
      const d = g.getImageData(0, 0, 16, 16), o = new Uint8ClampedArray(d.data); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const i = (y * 16 + x) * 4; if (d.data[i + 3]) continue; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < 16 && Y < 16 && d.data[(Y * 16 + X) * 4 + 3] > 200) { o[i] = 20; o[i + 1] = 12; o[i + 2] = 28; o[i + 3] = 255; break; } } } d.data.set(o); g.putImageData(d, 0, 0); }
    else if (it && it.kind === 'obj') { const def = DQ.OBJECTS[it.obj]; try { const sp = E.shapeSprite(def.shape, { view: DQ.ICON_VIEW || (DQ.ICON_VIEW = new E.View('iso', 'Icon', 45, 30, .62, 1)), facing: Math.PI / 2, params: def.door ? { open: 0 } : undefined }); if (sp) { cv = E.mkCanvas(18, 20); const g = E.ctx2d(cv), s = Math.min(1, 18 / sp.cv.width, 20 / sp.cv.height); g.drawImage(sp.cv, Math.round((18 - sp.cv.width * s) / 2), Math.round(20 - sp.cv.height * s), Math.round(sp.cv.width * s), Math.round(sp.cv.height * s)); } } catch (e) { cv = null; } }
    else if (DQ.OBJECTS[id]) { const def = DQ.OBJECTS[id]; try { const sp = def.shape && E.shapeSprite(def.shape, { view: new E.View('iso', 'Icon', 45, 30, .62, 1), facing: Math.PI / 2 }); if (sp) cv = sp.cv; } catch (e) { cv = null; } }
    if (!cv) { cv = E.mkCanvas(12, 12); const g = E.ctx2d(cv); px.rect(g, 2, 2, 8, 8, '#8a8698'); }
    _ic.set(id, cv); return cv;
  },
  draw(g, id, x, y, scale = 1) { const c = DQ.Icons.get(id); if (!c) return; g.drawImage(c, Math.round(x - c.width * scale / 2), Math.round(y - c.height * scale / 2), Math.round(c.width * scale), Math.round(c.height * scale)); }
};
// ---------------------------------------------------------------- shared drawing
const Hud = DQ.Hud = class Hud {
  constructor(ctx) { this.ctx = ctx; this.toasts = []; this.popups = []; this.pop = null; this.idle = 0; this.alpha = 1; this.tut = null; this.banners = []; this.labels = []; this.picks = []; this.itemPops = []; this.keys = {}; }
  // ---- feeds
  toast(text, icon, key) { if (this.ctx.quiet) return; const now = DQ.game.real; if (key && this.keys[key] && now - this.keys[key] < 2.5) return; if (key) this.keys[key] = now; this.toasts.push({ text: DQ.safe(text), icon, t: 0 }); if (this.toasts.length > 5) this.toasts.shift(); this.wake(); }
  pickup(id, n) { const p = this.picks.find(q => q.id === id && q.t < 2); if (p) { p.n += n; p.t = 0; } else this.picks.push({ id, n, t: 0 }); if (this.picks.length > 5) this.picks.shift(); this.wake(); }
  popup(kind, title, text, icon) { if (this.ctx.quiet) return; this.popups.push({ kind, title: DQ.safe(title), text: text || '', icon, t: 0 }); this.wake(); }
  notion(item, title, text) { this.popup('notion', title, text, item); }
  banner(text, sub) { if (this.ctx.quiet) return; this.banners.push({ text: DQ.safe(text), sub: sub ? DQ.safe(sub) : '', t: 0 }); this.wake(); }
  label(text, x, y, z) { this.labels.push({ text: DQ.safe(text), x, y, z, t: 0 }); }
  itemPop(id, st) { if (st) this.itemPops.push({ id, x: st.x * T + 8, y: st.y * T + 8, z: st.z * T + 18, t: 0 }); }
  tutorial(kind) { if (DQ.game.settings.tutorials === false) return; this.tut = { kind, t: 0 }; }
  wake() { this.idle = 0; }
  update(dt) {
    const I = DQ.game.input, b = this.ctx.builder;
    this.idle += dt; if (I.anyPressed && I.anyPressed()) this.idle = 0; if (b && (b.combat > 0 || b.hp < b.maxHp * .5)) this.idle = 0;
    this.alpha = E.approach(this.alpha, this.idle > 6 ? .3 : 1, dt * 2);
    for (const t of this.toasts) t.t += dt; this.toasts = this.toasts.filter(t => t.t < 3.2);
    for (const p of this.picks) p.t += dt; this.picks = this.picks.filter(p => p.t < 2.6);
    if (!this.pop && this.popups.length) { this.pop = this.popups.shift(); this.pop.t = 0; if (DQ.AudioX) DQ.AudioX.jingle(this.pop.kind === 'notion' ? 'notion' : this.pop.kind === 'room' ? 'room' : this.pop.kind === 'level' ? 'level' : this.pop.kind === 'questDone' ? null : this.pop.kind === 'quest' ? 'item' : null); }
    if (this.pop) { this.pop.t += dt; if (this.pop.t > (this.pop.kind === 'level' ? 3.6 : 2.8)) this.pop = null; }
    for (const B of this.banners) B.t += dt; this.banners = this.banners.filter(B => B.t < 3);
    for (const l of this.labels) l.t += dt; this.labels = this.labels.filter(l => l.t < 3);
    for (const p of this.itemPops) p.t += dt; this.itemPops = this.itemPops.filter(p => p.t < 1.4);
    if (this.tut) { this.tut.t += dt; if (this.tut.t > 9) this.tut = null; }
  }
  // ---- drawing
  draw(r) {
    const ctx = this.ctx, b = ctx.builder, G = DQ.game; if (!b) return;
    this.drawWorld(r);
    r.overlay(g => {
      const W = r.W, H = r.H, a = this.alpha, A = (k, f) => { if (k >= .99) f(); else px.blend(g, k, 'normal', f); };
      if (ctx.cutscene) { this.drawCutsceneBars(g, W, H); this.drawCenter(g, W, H); return; }
      A(a, () => this.drawVitals(g, b));
      A(Math.max(a, .7), () => this.drawObjective(g, W));
      A(a, () => this.drawClock(g, W));
      if (!ctx.ui || !ctx.ui.open) A(Math.max(a, .55), () => this.drawHotbar(g, b, W, H));
      if (!ctx.talk.open && !(ctx.ui && ctx.ui.open)) this.drawPrompts(g, b, H);
      this.drawToasts(g, W, H);
      this.drawBars(g, W, H);
      this.drawCenter(g, W, H);
      if (this.tut && !ctx.talk.open && !(ctx.ui && ctx.ui.open)) this.drawTutorial(g, W, H);
      if (ctx.town && ctx.town.placing) this.drawPlacing(g, W, H);
      else if (ctx.town && ctx.town.active() && !(ctx.ui && ctx.ui.open)) this.drawPattern(g, W, H);
      if (b.hp < b.maxHp * .25 && !b.ko && G.settings.flashes > 0) { const k = (Math.sin(G.real * 6) * .5 + .5) * .25; px.blend(g, k, 'normal', () => { px.rect(g, 0, 0, W, 6, '#ff2040'); px.rect(g, 0, H - 6, W, 6, '#ff2040'); px.rect(g, 0, 0, 6, H, '#ff2040'); px.rect(g, W - 6, 0, 6, H, '#ff2040'); }); }
    });
  }
  drawWorld(r) {
    const ctx = this.ctx, b = ctx.builder, G = DQ.game, R = ctx.render;
    // the cursor: a stitched wireframe cube on the break target, a ghost where a block would go
    if (b && !b.ko && !ctx.cutscene && !(ctx.ui && ctx.ui.open) && R && R.A && !(ctx.town && ctx.town.placing)) {
      const c = b.cursor, it = DQ.ITEMS[b.held], placing = it && (it.kind === 'block' || it.kind === 'obj') && b.bag.count(it.id) > 0;
      const showBrk = c.brk && (c.mode !== 'auto' || !placing || DQ.SOLID[ctx.world.get(...c.brk)]);
      if (showBrk && c.brk) this.cube(r, c.brk, c.brkFar ? '#ff6060' : '#f8f0d8', true, c.brkFar);
      if (placing && c.plc && (c.mode !== 'auto' || !c.brk || true)) {
        const [x, y, z] = c.plc, far = c.plcFar;
        if (it.kind === 'block' && !far) r.queue(x * T + 8, y * T + 8, z * T + 1, g => { const A = R.A, f = A.faces[it.block] && A.faces[it.block][0]; if (!f) return; const p = r.w(x * T, y * T, z * T); px.blend(g, .45, 'normal', () => { for (const S of A.vis) R._blit(g, f.s[S.dir], Math.round(p[0]), Math.round(p[1])); R._blit(g, f.top, Math.round(p[0]), Math.round(p[1])); }); }, { bias: .002 });
        if (c.mode !== 'auto' || !showBrk) this.cube(r, c.plc, far ? '#ff6060' : '#a0f0a0', false, far);
      }
      if (c.mode === 'eye' && c.eye) r.overlay(g => this.eyeGrid(g, r, c.eye));
    }
    // floating room labels, item pops, notion thought bubble
    for (const l of this.labels) r.queue(l.x, l.y, l.z, g => { const p = r.w(l.x, l.y, l.z + l.t * 6); const w = FW(l.text) + 10; Hud.panel(g, Math.round(p[0] - w / 2), Math.round(p[1]) - 8, w, 14, {}); F(g, l.text, p[0] - w / 2 + 5, p[1] - 5, '#ffe9a0'); }, { bias: .1 });
    for (const p of this.itemPops) r.queue(p.x, p.y, p.z, g => { const q = r.w(p.x, p.y, p.z + p.t * 14); DQ.Icons.draw(g, p.id, q[0], q[1], 1 + Math.min(.4, p.t)); }, { bias: .1, emissive: true });
    if (b && b.thought && b.thought.t > 0) { b.thought.t -= 1 / 60; r.queue(b.x, b.y, b.z + 40, g => { const p = r.w(b.x, b.y, b.z + 42), x = Math.round(p[0]) + 8, y = Math.round(p[1]) - 10; px.disc(g, x - 8, y + 12, 1.5, '#ffffff'); px.disc(g, x - 5, y + 8, 2, '#ffffff'); px.ell ? px.ell(g, x + 4, y - 2, 13, 10, '#ffffff') : px.disc(g, x + 4, y - 2, 11, '#ffffff'); px.disc(g, x + 4, y - 2, 9, '#fffaf0'); DQ.Icons.draw(g, b.thought.item, x + 4, y - 2, 1); }, { bias: .12 }); }
    // the objective marker
    const q = ctx.quests && ctx.quests.current(); if (q && G.settings.tracker !== false && !ctx.cutscene) { const t = ctx.quests.targetOf(q); if (t && r.marker) { const d = Math.round(Math.hypot(t[0] - b.x, t[1] - b.y) / T); if (d > 2) r.marker(t[0], t[1], t[2], { label: d + 'm' }); } }
  }
  cube(r, cell, color, brk, far) {
    const R = this.ctx.render, [x, y, z] = cell, G = DQ.game;
    r.queue(x * T + 8, y * T + 8, z * T + 15, g => {
      const E2 = R.cubeEdges(r, x, y, z), pulse = Math.sin(G.real * 6) > 0;
      if (brk && !far) { const f = [r.w(x * T, y * T, z * T + 16), r.w(x * T + 16, y * T, z * T + 16), r.w(x * T + 16, y * T + 16, z * T + 16), r.w(x * T, y * T + 16, z * T + 16)]; px.blend(g, .18, 'add', () => px.poly(g, f.map(p => [Math.round(p[0]), Math.round(p[1])]), '#ffffff')); }
      for (const [a, b2] of E2) { const n = Math.max(2, Math.round(Math.hypot(b2[0] - a[0], b2[1] - a[1]) / 2)); for (let i = 0; i <= n; i++) { if (far && i % 2) continue; if (!far && (i + (pulse ? 1 : 0)) % 3 === 0) continue; px.dot(g, Math.round(a[0] + (b2[0] - a[0]) * i / n), Math.round(a[1] + (b2[1] - a[1]) * i / n), color); } }
      if (far) { const p = r.w(x * T + 8, y * T + 8, z * T + 22); F(g, 'Too far', p[0] - 14, p[1] - 8, '#ff8080'); }
    }, { bias: .2 });
  }
  eyeGrid(g, r, cell) {
    const [x, y, z] = cell;
    for (let dy = -2; dy <= 3; dy++) for (let dx = -2; dx <= 3; dx++) { const p = r.w((x + dx) * T, (y + dy) * T, z * T); px.dot(g, Math.round(p[0]), Math.round(p[1]), (dx + dy) % 2 ? '#f1e6c8' : '#c8b890'); }
    const p = r.w(x * T + 8, y * T + 8, z * T + 30); Hud.panel(g, Math.round(p[0]) - 16, Math.round(p[1]) - 6, 32, 13, {}); F(g, 'Lv ' + z, p[0] - 11, p[1] - 3, '#ffe9a0');
  }
  drawVitals(g, b) {
    const x = 6, y = 6;
    Hud.panel(g, x, y, 118, 34, { alpha: .82 });
    const hp = b.hp / b.maxHp; Hud.heart(g, x + 9, y + 10, 1);
    px.rect(g, x + 18, y + 6, 66, 8, '#3a1020'); px.rect(g, x + 18, y + 6, Math.round(66 * hp), 8, hp < .25 ? '#ff3a4a' : '#e84a5a'); px.rect(g, x + 18, y + 6, Math.round(66 * hp), 2, '#ff9aa8');
    for (let i = 1; i < 6; i++) px.rect(g, x + 18 + i * 11, y + 6, 1, 8, '#5a2030');
    F(g, Math.ceil(b.hp) + '/' + b.maxHp, x + 87, y + 6, '#ffffff');
    // belly: a bread loaf and its bar
    px.rect(g, x + 4, y + 21, 10, 6, '#c88a40'); px.rect(g, x + 5, y + 20, 8, 2, '#e8b060'); px.dot(g, x + 7, y + 22, '#8a5020'); px.dot(g, x + 10, y + 22, '#8a5020');
    const bl = b.belly / 100; px.rect(g, x + 18, y + 21, 66, 6, '#3a2a10'); px.rect(g, x + 18, y + 21, Math.round(66 * bl), 6, bl < .25 ? '#e87a30' : '#e8b050'); px.rect(g, x + 18, y + 21, Math.round(66 * bl), 1, '#ffe0a0');
    F(g, Math.ceil(b.belly) + '%', x + 87, y + 20, bl < .25 ? '#ffb070' : '#ffffff');
    // the weapon
    Hud.panel(g, x + 122, y, 24, 24, { alpha: .82 }); DQ.Icons.draw(g, b.equip.weapon, x + 134, y + 12, 1);
  }
  drawObjective(g, W) {
    this.objBottom = 0; const ctx = this.ctx, q = ctx.quests && ctx.quests.current(); if (!q || DQ.game.settings.tracker === false) return;
    // in the gap between the vitals (6..152) and the clock (W - 78); below the vitals when the gap is too narrow
    const L = 158, R = W - 84, wide = R - L >= 130; if (!wide && ctx.talk && ctx.talk.open) return; const x0 = wide ? L : 6, x1 = wide ? R : W - 84, top = wide ? 6 : 44;
    const title = q.title, text = q.text, w = Math.min(x1 - x0, Math.max(FW(title) + 20, FW(text) + 20, 120)), x = Math.round(x0 + (x1 - x0 - w) / 2), lines = DQ.wrapText(text, w - 14);
    const h = 16 + lines.length * 11; Hud.panel(g, x, top, w, h, { alpha: .78 });
    F(g, title, x + (w - FW(title)) / 2, top + 3, '#ffd36a');
    lines.forEach((l, i) => F(g, l, x + 7, top + 15 + i * 11, '#f4f0ff'));
    this.objBottom = top + h;
  }
  drawClock(g, W) {
    const ctx = this.ctx, c = ctx.clock, ca = DQ.game.cornerArea && DQ.game.cornerArea(), top = ca ? Math.max(6, Math.round(ca.y1) + 4) : 6, x = W - 78;
    Hud.panel(g, x, top, 72, 30, { alpha: .82 });
    const cx = x + 13, cy = top + 15, night = c.isNight;
    px.disc(g, cx, cy, 9, night ? '#1a1a4a' : '#5aa0e8'); px.disc(g, cx, cy, 8, night ? '#2a2a6a' : '#8ac8ff');
    const a = (c.hour / 24) * Math.PI * 2 + Math.PI / 2, sx = Math.round(cx + Math.cos(a) * 5), sy = Math.round(cy + Math.sin(a) * 5);
    if (night) { px.disc(g, sx, sy, 3, '#f4f0d0'); px.disc(g, sx + 1, sy - 1, 2, '#2a2a6a'); } else { px.disc(g, sx, sy, 3, '#ffe060'); px.dot(g, sx - 1, sy - 1, '#fffff0'); }
    F(g, 'Day ' + c.day, x + 26, top + 5, '#ffe9a0'); F(g, c.label, x + 26, top + 16, '#ffffff');
    const t = ctx.town; if (t && t.planted && ctx.mode !== 'bee') {
      const y2 = top + 34; Hud.panel(g, x, y2, 72, 22, { alpha: .82, gold: true });
      px.rect(g, x + 6, y2 + 4, 2, 14, '#8a6a3a'); px.rect(g, x + 8, y2 + 4, 8, 7, '#c84a3a'); px.dot(g, x + 11, y2 + 7, '#ffe070');
      F(g, 'Lv ' + t.level, x + 20, y2 + 3, '#ffe070');
      const nx0 = t.nextCheer(), gated = nx0 !== null && t.cheer >= nx0, nx = gated ? null : nx0, base = DQ.LEVELS[t.level].cheer, k = nx ? E.clamp((t.cheer - base) / (nx - base), 0, 1) : 1;
      px.rect(g, x + 20, y2 + 14, 46, 4, '#3a2030'); px.rect(g, x + 20, y2 + 14, Math.round(46 * k), 4, '#ff8ab0');
      F(g, t.cheer + (nx ? '/' + nx : ''), x + 42, y2 + 3, '#ffffff', { font: 'tiny' });
      const fl = ctx.npcs && ctx.npcs.flyingBubbles().length; if (fl) px.blend(g, .4, 'add', () => px.rect(g, x, y2, 72, 22, '#ff8ab0'));
    }
  }
  drawHotbar(g, b, W, H) {
    const n = 8, s = 22, gap = 3, w = n * s + (n - 1) * gap, x0 = Math.round((W - w) / 2), y0 = H - s - 8;
    const fam = DQ.Glyphs.family(DQ.game);
    DQ.Glyphs.draw(g, DQ.game, fam === 'mouse' ? '@Wheel' : 'hotPrev', x0 - (DQ.Glyphs.width(DQ.game, 'hotPrev') + 6), y0 + 6);
    if (fam !== 'mouse') DQ.Glyphs.draw(g, DQ.game, 'hotNext', x0 + w + 5, y0 + 6);
    for (let i = 0; i < n; i++) {
      const sel = i === b.hot, x = x0 + i * (s + gap), y = y0 - (sel ? 3 : 0), id = b.bag.hotbar[i], cnt = id ? b.bag.count(id) : 0;
      Hud.panel(g, x, y, s, s, { alpha: .85, gold: sel, thin: true });
      if (id) { if (!cnt) px.blend(g, .35, 'normal', () => DQ.Icons.draw(g, id, x + s / 2, y + s / 2, 1)); else DQ.Icons.draw(g, id, x + s / 2, y + s / 2, 1); if (cnt > 1 || (cnt === 0 && id)) F(g, b.bag.infinite ? '∞' : String(Math.min(cnt, 999)), x + s - 2 - FW(String(cnt)), y + s - 9, cnt ? '#ffffff' : '#ff8080', { font: 'tiny' }); }
      if (sel) { px.rect(g, x - 1, y - 1, s + 2, 1, '#ffe070'); px.rect(g, x - 1, y + s, s + 2, 1, '#ffe070'); px.rect(g, x - 1, y - 1, 1, s + 2, '#ffe070'); px.rect(g, x + s, y - 1, 1, s + 2, '#ffe070'); }
      F(g, String(i + 1), x + 2, y + 1, '#8a84a8', { font: 'tiny', shadow: false });
    }
    const id = b.held; if (id) { const t = DQ.ITEMS[id].name + (b.bag.count(id) > 1 ? ' x' + b.bag.count(id) : ''); const tw = FW(t); Hud.panel(g, Math.round((W - tw) / 2) - 6, y0 - 19, tw + 12, 13, { alpha: .8 }); F(g, t, (W - tw) / 2, y0 - 16, '#ffffff'); }
  }
  drawPrompts(g, b, H) {
    const ctx = this.ctx; let lines = b.prompts || [];
    if (b.mounted) lines = ['{btn:swing} Fire', '{btn:interact} Get off', '{btn:hotPrev}{btn:hotNext} Aim'];
    if (ctx.town && ctx.town.placing) lines = [];
    const y0 = H - 40 - lines.length * 14;
    lines.forEach((l, i) => { const w = DQ.Glyphs.measure(DQ.game, l) + 10; Hud.panel(g, 6, y0 + i * 14, w, 13, { alpha: .75 }); DQ.Glyphs.text(g, DQ.game, l, 11, y0 + i * 14 + 3, '#ffffff'); });
  }
  drawToasts(g, W, H) {
    let y = H - 44;
    for (let i = this.picks.length - 1; i >= 0; i--) { const p = this.picks[i], s = '+' + p.n + ' ' + DQ.ITEMS[p.id].name, w = FW(s) + 26, k = p.t > 2.2 ? 1 - (p.t - 2.2) / .4 : 1; px.blend(g, Math.max(0, k), 'normal', () => { Hud.panel(g, W - w - 6, y - 13, w, 15, { alpha: .85 }); DQ.Icons.draw(g, p.id, W - w + 5, y - 6, .7); F(g, s, W - w + 14, y - 9, '#ffffff'); }); y -= 17; }
    for (let i = this.toasts.length - 1; i >= 0; i--) { const t = this.toasts[i], lines = DQ.wrapText(t.text, 170), w = Math.max(...lines.map(l => FW(l))) + (t.icon ? 26 : 12), h = lines.length * 11 + 5, k = t.t > 2.8 ? 1 - (t.t - 2.8) / .4 : 1; y -= h - 13;
      px.blend(g, Math.max(0, k), 'normal', () => { Hud.panel(g, W - w - 6, y - 13, w, h, { alpha: .88 }); if (t.icon) DQ.Icons.draw(g, t.icon, W - w + 5, y - 13 + h / 2, .7); lines.forEach((l, j) => F(g, l, W - w + (t.icon ? 14 : 0) + 0, y - 10 + j * 11, '#ffffff')); }); y -= 17; }
  }
  drawCenter(g, W, H) {
    const p = this.pop;
    if (p) {
      const k = Math.min(1, p.t * 4), lines = DQ.wrapText(p.text.replace(/\{btn:[A-Za-z0-9@]+\}/g, 'XXX'), 250), tw = Math.max(FW(p.title, { scale: 1 }) + 30, 140, ...lines.map(l => FW(l) + 24)), h = 34 + lines.length * 11, x = Math.round((W - tw) / 2), y = Math.round(H * .3 - h / 2 + (1 - k) * 10);
      px.blend(g, Math.min(1, k * 1.2, (3.2 - p.t) * 3), 'normal', () => {
        Hud.panel(g, x, y, tw, h, { gold: p.kind === 'notion' || p.kind === 'level' || p.kind === 'questDone' });
        if (p.icon || p.kind === 'notion') { DQ.Icons.draw(g, p.icon, x + 16, y + 16, 1.2); }
        E.font.title(g, p.title, W / 2 + (p.icon ? 8 : 0), y + 6, { scale: 1, colors: p.kind === 'notion' ? ['#fff0a0', '#e8c040'] : ['#ffffff', '#c8d0ff'], align: 'center', outline: '#140c1c' });
        const raw = DQ.wrapText(p.text, 250); raw.forEach((l, i) => DQ.Glyphs.text(g, DQ.game, l, x + 12, y + 22 + i * 11, '#f4f0ff'));
      });
    }
    for (const B of this.banners) {
      const k = Math.min(1, B.t * 3), y = Math.round(H * .42);
      px.blend(g, Math.min(k, (3 - B.t) * 2), 'normal', () => {
        E.font.title(g, B.text, W / 2, y - 14, { scale: 2, colors: ['#fff0a0', '#e8a040', '#c85a30'], align: 'center', outline: '#2a1410', depth: 2 });
        if (B.sub) F(g, B.sub, W / 2 - FW(B.sub) / 2, y + 12, '#ffffff');
        for (let i = 0; i < 40; i++) { if ((i + Math.floor(DQ.game.real * 8)) % 3 === 0) px.rect(g, Math.round(W / 2 - 100 + i * 5), y + 24, 3, 1, '#f1e6c8'); }
      });
    }
  }
  drawBars(g, W, H) {
    const ctx = this.ctx, S = ctx.siege;
    if (S && S.active) {
      const y = Math.max(50, (this.objBottom || 0) + 4), ban = ctx.town && ctx.town.banner, k = ban ? ban.hp / ban.def.hp : 0;
      Hud.panel(g, W / 2 - 80, y, 160, 28, { alpha: .85 }); F(g, S.label(), W / 2 - FW(S.label()) / 2, y + 3, '#ffd36a');
      // the Banner's health: a small flag and its bar
      const bx = W / 2 - 70; px.rect(g, bx, y + 14, 1, 9, '#c8a060'); px.rect(g, bx + 1, y + 14, 7, 5, '#e84a5a'); px.rect(g, bx + 1, y + 16, 7, 1, '#ffd060');
      px.rect(g, bx + 12, y + 16, 128, 6, '#3a1020'); px.rect(g, bx + 12, y + 16, Math.round(128 * k), 6, k < .3 ? '#ff5a4a' : '#ffd060'); px.rect(g, bx + 12, y + 16, Math.round(128 * k), 1, '#fff0b0');
    }
    const boss = ctx.bosses && ctx.bosses.active();
    if (boss) {
      const w = Math.min(260, W - 120), x = Math.round((W - w) / 2), y = H - 64, k = Math.max(0, boss.hp / boss.maxHp);
      Hud.panel(g, x - 6, y - 14, w + 12, 26, { alpha: .9 });
      F(g, boss.name, x, y - 11, '#ffb0e0');
      px.rect(g, x, y, w, 7, '#2a0a20'); px.rect(g, x, y, Math.round(w * k), 7, boss.tangled > 0 ? '#ffe070' : '#d040a0'); px.rect(g, x, y, Math.round(w * k), 2, '#ff9ad8');
      if (boss.phases) for (let i = 1; i < boss.phases; i++) px.rect(g, x + Math.round(w * i / boss.phases), y - 1, 1, 9, '#ffffff');
      if (boss.tangled > 0 && Math.floor(DQ.game.real * 6) % 2) E.font.title(g, 'TANGLED!', W / 2, y - 34, { scale: 2, colors: ['#fff0a0', '#e8c040'], align: 'center', outline: '#2a1410' });
    }
  }
  drawCutsceneBars(g, W, H) { px.rect(g, -2, -2, W + 4, 18, '#000000'); px.rect(g, -2, H - 16, W + 4, 18, '#000000'); const run = this.ctx.cutscene; if (run && run.skip > 0) { const k = Math.min(1, run.skip); F(g, 'Skipping...', 8, 4, '#ffffff'); px.rect(g, 8, 13, Math.round(60 * k), 2, '#ffe070'); } else DQ.Glyphs.text(g, DQ.game, 'Hold {btn:interact} to skip', 8, 4, '#8a84a8'); }
  drawTutorial(g, W, H) {
    const t = this.tut, fam = DQ.Glyphs.family(DQ.game), mouse = fam === 'mouse' || fam === 'keys';
    const TXT = {
      move: ['{btn:up}{btn:left}{btn:down}{btn:right} Move  ' + (fam === 'ps' || fam === 'xbox' ? '(left stick)' : ''), '{btn:jump} Jump onto the ledge', (fam === 'ps' || fam === 'xbox') ? 'Right stick: turn the camera and zoom' : '{btn:camLeft}{btn:camRight} Turn the camera   {btn:zoomOut}{btn:zoomIn} Zoom'],
      break: ['{btn:swing} Swing at a block to break it', mouse ? 'Point with the mouse to pick a block' : 'Face a block, or hold {btn:eye} for Builder\'s Eye'],
      fight: ['{btn:swing} Swing at monsters  ({btn:swing} {btn:swing} for a combo)'],
      craft: ['{btn:satchel} Open your Bag, then Pocket Notions', 'Crafting needs the right materials'],
      place: ['{btn:hotPrev}{btn:hotNext} Pick an item on the hotbar', '{btn:place} Place it (or use it)'],
      room: ['A room: walls 2 high, a door, a light', 'Hold {btn:eye} for Builder\'s Eye to build precisely'],
      banner: ['Select the Banner on your hotbar', '{btn:place} Plant it on the old plaza']
    }[t.kind]; if (!TXT) return;
    const w = Math.max(...TXT.map(l => DQ.Glyphs.measure(DQ.game, l))) + 16, h = TXT.length * 14 + 18, x = 8, y = 48, k = t.t > 8 ? 1 - (t.t - 8) : 1;
    px.blend(g, Math.max(0, k), 'normal', () => { Hud.panel(g, x, y, w, h, { gold: true }); F(g, 'HOW TO', x + 8, y + 4, '#ffe070'); TXT.forEach((l, i) => DQ.Glyphs.text(g, DQ.game, l, x + 8, y + 16 + i * 14, '#ffffff')); });
  }
  drawPattern(g, W, H) {
    const ctx = this.ctx, p = ctx.town.active(), needs = ctx.town.needs(p, ctx.builder.bag).slice(0, 5), w = Math.max(116, ...needs.map(n => FW(DQ.itemName(n.id) + ' ' + Math.min(n.have, 999) + '/' + n.need) + 30), FW(p.def.name + ': ' + p.progress + '/' + p.total) + 14), x = W - w - 6, y = ctx.mode === 'bee' ? 66 : 98;
    Hud.panel(g, x, y, w, 18 + needs.length * 12, { alpha: .82 });
    F(g, p.def.name + ': ' + p.progress + '/' + p.total, x + 6, y + 4, '#ffe9a0');
    needs.forEach((n, i) => { DQ.Icons.draw(g, n.id, x + 12, y + 20 + i * 12, .55); F(g, DQ.itemName(n.id) + ' ' + Math.min(n.have, 999) + '/' + n.need, x + 22, y + 15 + i * 12, n.have >= n.need ? '#c8ffc8' : '#ffb0a0'); });
  }
  drawPlacing(g, W, H) {
    const pl = this.ctx.town.placing, lines = ['{btn:place} Lay out the Pattern here', (DQ.Glyphs.family(DQ.game) === 'mouse' ? '{btn:@Wheel}' : '{btn:hotPrev}{btn:hotNext}') + ' Turn it', '{btn:interact} Cancel'];
    const y0 = H - 40 - lines.length * 14; lines.forEach((l, i) => { const w = DQ.Glyphs.measure(DQ.game, l) + 10; Hud.panel(g, 6, y0 + i * 14, w, 13, { alpha: .8 }); DQ.Glyphs.text(g, DQ.game, l, 11, y0 + i * 14 + 3, '#ffffff'); });
    if (pl.why) { const w = FW(pl.why) + 12; Hud.panel(g, (W - w) / 2, H * .3, w, 14, {}); F(g, pl.why, (W - w) / 2 + 6, H * .3 + 3, '#ff9a8a'); }
  }
};
// ---- static helpers
Hud.panel = (g, x, y, w, h, o = {}) => {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const draw = () => {
    E.ui.box(g, x, y, w, h, { bg: o.gold ? ['#3a2a30', '#241a2a'] : ['#2a2350', '#1a1636'], border: '#120e24' });
    const c = o.gold ? '#e8c040' : '#f1e6c8';
    for (let i = 3; i < w - 3; i += 3) { if (i % 6 < 3) { px.dot(g, x + i, y + 2, c); px.dot(g, x + i, y + h - 3, c); } }
    for (let j = 3; j < h - 3; j += 3) { if (j % 6 < 3) { px.dot(g, x + 2, y + j, c); px.dot(g, x + w - 3, y + j, c); } }
  };
  if (o.alpha && o.alpha < 1) px.blend(g, o.alpha, 'normal', draw); else draw();
};
Hud.heart = (g, x, y, s = 1) => { const c = '#ff5a8a', d = '#b02a5a'; px.disc(g, Math.round(x - 2 * s), Math.round(y - 1 * s), 2.5 * s, d); px.disc(g, Math.round(x + 2 * s), Math.round(y - 1 * s), 2.5 * s, d); px.poly(g, [[x - 4.5 * s, y], [x + 4.5 * s, y], [x, y + 5 * s]], d); px.disc(g, Math.round(x - 2 * s), Math.round(y - 1 * s), 1.8 * s, c); px.disc(g, Math.round(x + 2 * s), Math.round(y - 1 * s), 1.8 * s, c); px.poly(g, [[x - 3.6 * s, y], [x + 3.6 * s, y], [x, y + 4 * s]], c); px.dot(g, Math.round(x - 2 * s), Math.round(y - 2 * s), '#ffd0e0'); };
Hud.balloon = (g, kind, x, y, item) => {
  const w = kind === 'need' ? 22 : 12; Hud.panel(g, x - w / 2, y - 14, w, 13, { gold: kind === '!' || kind === '?' });
  px.poly(g, [[x - 2, y - 2], [x + 2, y - 2], [x, y + 2]], '#1a1636');
  const t = kind === 'sleep' ? 'z' : kind === 'note' ? '♪' : kind === 'dots' ? '...' : kind === 'need' ? '' : kind;
  if (kind === 'need' && item) { DQ.Icons.draw(g, item, x - 3, y - 8, .5); F(g, '?', x + 4, y - 11, '#ff8080'); }
  else F(g, t, x - FW(t) / 2, y - 11, kind === '!' ? '#ffe070' : kind === '?' ? '#a0e0ff' : '#ffffff');
};
Hud.speech = (g, text, x, y) => { const w = FW(text) + 10; Hud.panel(g, Math.round(x - w / 2), y - 13, w, 13, {}); F(g, text, x - w / 2 + 5, y - 10, '#ffffff'); };
Hud.pins = (g, ox, oy, rig, rolled, t) => { const cols = ['#e84a4a', '#4a8ae8', '#f0c040', '#5ad06a']; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + (rolled ? t * 12 : 0), r0 = 5, r1 = rolled ? 6 : 9; const x0 = ox + Math.cos(a) * r0, y0 = oy - 7 + Math.sin(a) * r0 * .7, x1 = ox + Math.cos(a) * r1, y1 = oy - 7 + Math.sin(a) * r1 * .7 - (rolled ? 0 : 2); if (Math.sin(a) < -.2) continue; px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#c8ccd8'); px.dot(g, Math.round(x1), Math.round(y1), cols[i % 4]); } };
Hud.fuzz = (g, ox, oy, R, c) => { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, x = Math.round(ox + Math.cos(a) * (R + .5)), y = Math.round(oy - R + Math.sin(a) * R * .85); if ((i + Math.floor(DQ.game.real * 4)) % 3) px.dot(g, x, y, c); } };
/** a portrait for the dialog box: Granny's glowing spool, a resident, a villain */
Hud.portrait = (g, ctx, who, x, y, s) => {
  const t = DQ.game.real;
  if (who === 'granny') {
    E.ui.box(g, x, y, s, s, { bg: ['#4a3a20', '#2a2010'], border: '#e8c040' });
    const cx = x + s / 2, cy = y + s / 2 + 2; px.blend(g, .4, 'add', () => px.disc(g, cx, cy, s * .42 + Math.sin(t * 2) * 1.5, '#ffe070'));
    px.rect(g, cx - 11, cy - 13, 22, 4, '#8a5a32'); px.rect(g, cx - 11, cy + 10, 22, 4, '#8a5a32'); px.rect(g, cx - 8, cy - 9, 16, 19, '#e8c040'); for (let k = 0; k < 6; k++) px.rect(g, cx - 8, cy - 8 + k * 3, 16, 1, '#c89a20');
    const blink = Math.floor(t * 1.3) % 5 === 0; px.line(g, cx - 5, cy - 1, cx - 2, cy - 1 + (blink ? 0 : 1), '#5a3a10'); px.line(g, cx + 2, cy - 1 + (blink ? 0 : 1), cx + 5, cy - 1, '#5a3a10'); px.line(g, cx - 2, cy + 4, cx + 2, cy + 4, '#c84a3a');
    px.line(g, cx + 6, cy - 16, cx + 12, cy - 8, '#e8ecf4'); px.dot(g, cx + 6, cy - 16, '#ffffff'); px.dot(g, cx - 7, cy + 2, '#ff9a8a'); px.dot(g, cx + 7, cy + 2, '#ff9a8a');
    return;
  }
  const npc = ctx.npcs && ctx.npcs.get(who);
  if (npc) { npc.portrait(g, x, y, s); return; }
  const boss = ctx.bosses && ctx.bosses.rigOf && ctx.bosses.rigOf(who);
  if (boss && boss.drawPortrait) { boss.drawPortrait(g, x, y, s, { bg: '#2a1030', border: '#c06080', shadow: false }); return; }
  E.ui.box(g, x, y, s, s, { bg: ['#1a0a20', '#0a0410'], border: '#a060c0' });
  const cx = x + s / 2, cy = y + s / 2;
  if (who === 'frayvern') { px.poly(g, [[cx - 16, cy + 6], [cx - 4, cy - 4], [cx, cy - 14], [cx + 4, cy - 4], [cx + 16, cy + 6], [cx + 4, cy + 2], [cx, cy + 12], [cx - 4, cy + 2]], '#3a1a4a'); px.dot(g, cx - 2, cy - 6, '#ff40c0'); px.dot(g, cx + 2, cy - 6, '#ff40c0'); }
  else if (who === 'buttonsworth') { px.disc(g, cx, cy, 14, '#c8a878'); px.disc(g, cx - 5, cy - 3, 3, '#5a4010'); px.disc(g, cx + 5, cy - 3, 3, '#5a4010'); px.line(g, cx - 5, cy + 6, cx + 5, cy + 6, '#5a4010'); }
  else if (who === 'gnarlgrim') { px.disc(g, cx, cy, 15, '#2a1a3a'); for (let k = 0; k < 8; k++) { const a = k * .8 + t; px.line(g, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, cx + Math.cos(a + 1) * 13, cy + Math.sin(a + 1) * 13, '#4a3a6a'); } px.disc(g, cx - 5, cy - 2, 2, '#ff40c0'); px.disc(g, cx + 5, cy - 2, 2, '#ff40c0'); }
  else { px.disc(g, cx, cy, 10, '#8a84a8'); }
};
})();
