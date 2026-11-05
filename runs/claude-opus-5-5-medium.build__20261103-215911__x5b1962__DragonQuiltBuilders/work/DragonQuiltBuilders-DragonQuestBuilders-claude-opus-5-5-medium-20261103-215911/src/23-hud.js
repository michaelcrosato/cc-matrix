// The UI kit (felt panels with stitched borders, portraits, logo) and the HUD in play.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16, G = () => DQ.Glyphs;

const UI = DQ.UI = {
  // a dark felt panel with a cream running-stitch border 2 px inside
  panel(g, x, y, w, h, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    E.ui.box(g, x, y, w, h, { bg: o.bg || ['#2a2350', '#1a1636'], border: o.edge || '#0c0a18', alpha: o.alpha });
    const c = o.thread || '#f1e6c8';
    if (o.alpha !== undefined && o.alpha < .5) return;
    for (let i = 3; i < w - 3; i++) if (i % 4 < 2) { px.rect(g, x + i, y + 2, 1, 1, c); px.rect(g, x + i, y + h - 3, 1, 1, c); }
    for (let i = 3; i < h - 3; i++) if (i % 4 < 2) { px.rect(g, x + 2, y + i, 1, 1, c); px.rect(g, x + w - 3, y + i, 1, 1, c); }
  },
  sel(g, x, y, w, h, t) { const c = '#ffd36a', b = Math.floor((t || 0) * 3) % 2; for (let i = 0; i < w; i++) if ((i + b) % 3 < 2) { px.rect(g, x + i, y, 1, 1, c); px.rect(g, x + i, y + h - 1, 1, 1, c); } for (let i = 0; i < h; i++) if ((i + b) % 3 < 2) { px.rect(g, x, y + i, 1, 1, c); px.rect(g, x + w - 1, y + i, 1, 1, c); } },
  text(g, s, x, y, c = '#ffffff', o = {}) { return E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ shadow: '#05040a', outline: false }, o)); },
  center(g, s, cx, y, c = '#ffffff', o = {}) { const w = E.font.width(s, o); E.font.text(g, s, Math.round(cx - w / 2), Math.round(y), c, Object.assign({ shadow: '#05040a', outline: false }, o)); return w; },
  bar(g, x, y, w, h, k, col, back = '#200a14') { px.rect(g, x, y, w, h, '#0c0a18'); px.rect(g, x + 1, y + 1, w - 2, h - 2, back); const fw = Math.round((w - 2) * E.clamp(k, 0, 1)); if (fw > 0) { px.rect(g, x + 1, y + 1, fw, h - 2, col); px.rect(g, x + 1, y + 1, fw, 1, E.tones(col).lt); } for (let i = 4; i < w - 2; i += 6) px.rect(g, x + i, y + h - 2, 1, 1, '#0c0a1880'.slice(0, 7)); },
  grannyPortrait(g, x, y, s, t) {
    px.rect(g, x, y, s, s, '#3a2a10'); px.rect(g, x + 1, y + 1, s - 2, s - 2, '#4a3818');
    const cx = x + s / 2, cy = y + s / 2 + Math.sin(t * 2) * 1;
    for (let r = s * .45; r > 2; r -= 2) px.disc(g, cx, cy, r, r > s * .38 ? '#5a4420' : '#6a5020');
    px.rect(g, cx - s * .28, cy - s * .3, s * .56, s * .6, '#e8b830'); for (let i = 0; i < 5; i++) px.rect(g, cx - s * .28, cy - s * .24 + i * s * .11, s * .56, 1, '#c89820');
    px.rect(g, cx - s * .34, cy - s * .36, s * .68, 3, '#8a5a32'); px.rect(g, cx - s * .34, cy + s * .3, s * .68, 3, '#8a5a32');
    px.rect(g, cx - 6, cy - 2, 4, 1, '#3a2010'); px.rect(g, cx + 2, cy - 2, 4, 1, '#3a2010'); px.dot(g, cx - 5, cy - 3, '#3a2010'); px.dot(g, cx + 3, cy - 3, '#3a2010');
    px.rect(g, cx - 2, cy + 3, 4, 1, '#a02a2a'); px.disc(g, cx - 7, cy + 1, 1.5, '#ff9aa8'); px.disc(g, cx + 7, cy + 1, 1.5, '#ff9aa8');
    px.line(g, cx + s * .2, cy - s * .44, cx + s * .36, cy - s * .2, '#e8e8f0'); px.dot(g, cx + s * .2, cy - s * .44, '#ffffff');
    if (Math.floor(t * 2) % 3 === 0) px.dot(g, cx - s * .2, cy - s * .3, '#fff8d0');
  },
  blobPortrait(g, x, y, s, t) { px.rect(g, x, y, s, s, '#3a3264'); const cx = x + s / 2, cy = y + s / 2 + 3; px.disc(g, cx, cy, s * .36, '#9a94a8'); px.disc(g, cx, cy - 1, s * .33, '#cfcad6'); px.disc(g, cx - 3, cy - 3, s * .12, '#f0eef4'); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; px.dot(g, cx + Math.cos(a) * s * .38, cy + Math.sin(a) * s * .36, '#f0eef4'); } px.disc(g, cx - 4, cy - 1, 2.2, '#3a2a40'); px.disc(g, cx + 4, cy - 1, 2.2, '#3a2a40'); px.dot(g, cx - 5, cy - 2, '#fff'); px.dot(g, cx + 3, cy - 2, '#fff'); px.rect(g, cx - 2, cy + 4, 4, 1, '#5a3a4a'); },
  monsterPortrait(g, x, y, s, who, t) {
    px.rect(g, x, y, s, s, '#2a1a3a'); const cx = x + s / 2, cy = y + s / 2;
    if (who === 'frayvern') { px.rect(g, x, y, s, s, '#08061a'); px.poly(g, [[cx - 14, cy + 6], [cx, cy - 10], [cx + 14, cy + 6], [cx, cy]], '#1a1030'); px.dot(g, cx - 3, cy - 2, '#ff3aff'); px.dot(g, cx + 3, cy - 2, '#ff3aff'); return; }
    const col = who === 'buttonsworth' ? '#c8a878' : '#2a1a3a', tn = E.tones(col);
    px.disc(g, cx, cy + 2, s * .38, tn.sh); px.disc(g, cx, cy, s * .34, tn.base);
    if (who === 'buttonsworth') { for (const sx of [-6, 6]) { px.disc(g, cx + sx, cy - 2, 4, '#e8c040'); px.dot(g, cx + sx - 1, cy - 3, '#8a6a20'); px.dot(g, cx + sx + 1, cy - 1, '#8a6a20'); } px.rect(g, cx - 5, cy + 6, 10, 2, '#5a3a20'); }
    else { px.disc(g, cx - 5, cy - 2, 2.5, '#ff3aff'); px.disc(g, cx + 5, cy - 2, 2.5, '#ff3aff'); px.rect(g, cx - 6, cy + 6, 12, 2, '#100818'); for (let i = 0; i < 5; i++) px.line(g, cx - 10 + i * 5, cy - s * .32, cx - 8 + i * 5, cy - s * .48, '#6a3a8a'); }
  },
  // the logo: patchwork letters with a stitched outline, and BUILDERS in gold thread
  logo(g, cx, y, scale = 4, t = 0) {
    const cols = [['#8ad86a', '#4a9a3a'], ['#ff7a7a', '#c03a4a'], ['#7aa0ff', '#3a5f9a'], ['#ffe07a', '#d0a030'], ['#d08ae8', '#7a3a9a'], ['#e8c08a', '#a07040']];
    const word = 'DRAGON QUILT'; let x = cx - E.font.width(word, { scale }) / 2 - scale * 2;
    for (let i = 0; i < word.length; i++) { const ch = word[i]; if (ch === ' ') { x += scale * 4; continue; } const c = cols[i % cols.length], bob = Math.round(Math.sin(t * 2 + i * .6) * 1.2); E.font.title(g, ch, Math.round(x), y + bob, { scale, colors: c, outline: '#1a1020', depth: 2, depthColor: '#0c0814' }); x += E.font.width(ch, { scale }) + scale; }
    E.font.title(g, 'BUILDERS', cx, y + scale * 9 + 4, { scale: Math.max(2, scale / 2), colors: ['#fff0a0', '#e8b830'], outline: '#3a2a10', depth: 1, align: 'center' });
    // the emblem: a needle dragon with a thread tail
    const ex = cx + E.font.width(word, { scale }) / 2 + 6, ey = y + 10;
    px.line(g, ex, ey + 14, ex + 18, ey - 4, '#e8e8f0', 2); px.disc(g, ex + 19, ey - 5, 3, '#e8e8f0'); px.dot(g, ex + 20, ey - 6, '#1a1020');
    for (let i = 0; i < 12; i++) { const a = i * .6 + t * 2; px.dot(g, ex - i * 2, ey + 14 + Math.sin(a) * 3, '#ff7a7a'); }
    px.poly(g, [[ex + 8, ey + 4], [ex + 14, ey - 6], [ex + 4, ey - 2]], '#c03a4a');
  }
};

class Hud {
  constructor(ctx) { this.ctx = ctx; this.toasts = []; this.popups = []; this.hintT = 0; this.hintS = ''; this.idle = 0; this.alpha = 1; this.bannerT = 0; this.bannerS = ''; this.flashT = 0; this.flashS = ''; this.pulse = 0; this.lvT = 0; this.lv = 0; this.wave = null; }
  toast(text, kind, icon) { this.toasts.push({ text, kind, icon, t: 3 }); if (this.toasts.length > 5) this.toasts.shift(); this.idle = 0; }
  hint(text, t = 2.6) { this.hintS = text; this.hintT = t; this.idle = 0; }
  popup(title, text, icon) { if (this.popups.length > 6) return; this.popups.push({ title, text, icon, t: 2.8 }); this.idle = 0; }
  banner(text) { this.bannerS = text; this.bannerT = 3; }
  flashText(s) { this.flashS = s; this.flashT = 1.2; }
  pulseBanner() { this.pulse = .5; }
  levelUp(lv) { this.lv = lv; this.lvT = 4; }
  update(dt, it) {
    const ctx = this.ctx;
    for (const q of this.toasts) q.t -= dt; this.toasts = this.toasts.filter(q => q.t > 0);
    if (this.popups.length) { this.popups[0].t -= dt; if (this.popups[0].t <= 0) this.popups.shift(); }
    this.hintT -= dt; this.bannerT -= dt; this.flashT -= dt; this.pulse -= dt; this.lvT -= dt;
    const active = it && (Math.hypot(it.move[0], it.move[1]) > .1 || it.swing || it.place || it.jump || it.hot !== null);
    const fight = ctx.monsters && ctx.monsters.list.some(m => !m.dead && m.aggro);
    if (active || fight || this.popups.length || (ctx.builder && ctx.builder.iframe > 0)) this.idle = 0; else this.idle += dt;
    this.alpha = E.approach(this.alpha, this.idle > 6 ? .3 : 1, dt * 2);
  }
  // world parts: the cursor and the objective marker
  drawWorld(r) {
    const ctx = this.ctx, b = ctx.builder; if (!b || b.ko || ctx.cutscene || ctx.mode === 'attract' && !ctx.attractCursor) return;
    const t = b.target, R = ctx.renderer, held = b.held, it = held && DQ.ITEMS[held];
    if (b.seat) return;
    const placing = it && (it.kind === 'block' || it.kind === 'object');
    const c = placing && t.plc ? t.plc : t.brk || (t.obj && { x: t.obj.x, y: t.obj.y, z: t.obj.z });
    const show = c && (t.mode !== 'auto' || placing || t.brk || t.obj);
    if (show) {
      const ok = placing && t.plc ? t.inPlc : t.inBrk, col = ok ? '#f1e6c8' : '#ff6a6a';
      r.queue((c.x + .5) * T, (c.y + .5) * T, c.z * T + 8, g => {
        if (placing && t.plc && it.kind === 'block' && R.A) R.ghost(g, r, R.A, DQ.blockId(it.block), c.x, c.y, c.z, .45);
        R.cube(g, r, c.x, c.y, c.z, col, !ok, c === t.plc && it && it.kind === 'object' && DQ.OBJECTS[it.obj].tall ? 2 : 1);
        if (!ok && placing) { const p = r.w((c.x + .5) * T, (c.y + .5) * T, (c.z + 1) * T); UI.center(g, 'Too far', p[0], p[1] - 12, '#ff8a8a'); }
        if (b.eye.on) { const p = r.w((c.x + .5) * T, (c.y + .5) * T, (c.z + 1) * T); UI.center(g, 'L' + c.z, p[0] + 14, p[1] - 4, '#bfe8ff'); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = r.w((c.x + .5 + dx) * T, (c.y + .5 + dy) * T, c.z * T); px.rect(g, Math.round(q[0]), Math.round(q[1]), 1, 1, '#bfe8ff'); } }
      }, { bias: .01 });
    }
    const obj = ctx.quests && ctx.quests.objective();
    if (obj && obj.target && r.marker && !ctx.ui.modal) r.marker(obj.target[0], obj.target[1], obj.target[2], { label: Math.round(Math.hypot(obj.target[0] - b.body.x, obj.target[1] - b.body.y) / T) + 'm', color: '#ffd84a' });
  }
  draw(r) {
    const ctx = this.ctx, b = ctx.builder, game = ctx.game, t = game.real;
    r.overlay(g => {
      const W = r.W, H = r.H, a = this.alpha;
      if (!b || ctx.mode === 'attract') return;
      g.globalAlpha = a;
      // top left: HP, belly, the weapon
      const mh = b.maxHp, hp = Math.max(0, b.hp);
      UI.panel(g, 4, 4, 108, 32, { alpha: .82 });
      DQ.Icons.get(b.equip.weapon, 14) && g.drawImage(DQ.Icons.get(b.equip.weapon, 14), 8, 10);
      E.font.text(g, '♥', 26, 8, '#ff6a8a', false); UI.bar(g, 34, 8, 54, 7, hp / mh, hp / mh < .25 && Math.floor(t * 4) % 2 ? '#ff9a9a' : '#e04860'); UI.text(g, hp + '/' + mh, 90, 8, '#ffffff', { font: 'tiny' });
      DQ.Icons.get('bun', 9) && g.drawImage(DQ.Icons.get('bun', 9), 24, 18);
      UI.bar(g, 34, 20, 54, 7, b.belly / 100, b.belly < 25 ? '#e08a3a' : '#e8b860', '#2a1a0a'); UI.text(g, Math.round(b.belly) + '%', 90, 20, '#ffffff', { font: 'tiny' });
      // top right: clock and the banner badge (below the corner buttons)
      const ca = game.cornerArea ? game.cornerArea() : null, ty = ca ? Math.max(4, Math.round(ca.y1 || 0) + 2) : 4;
      if (ctx.clock) { const x = W - 76, y = ty; UI.panel(g, x, y, 72, 22, { alpha: .82 }); const h = ctx.clock.hour, night = ctx.clock.isNight; const ang = (h / 24) * Math.PI * 2 - Math.PI / 2; px.disc(g, x + 12, y + 11, 7, night ? '#1a2050' : '#5a9ae0'); px.disc(g, x + 12 + Math.cos(ang) * 4, y + 11 + Math.sin(ang) * 4, 2.6, night ? '#f0f0ff' : '#ffd84a'); UI.text(g, 'Day ' + ctx.clock.day, x + 23, y + 4); UI.text(g, DQ.fmtHour(h), x + 23, y + 12, '#c8c0e0', { font: 'tiny' }); }
      if (ctx.town && ctx.town.planted && ctx.mode !== 'bee') {
        const x = W - 76, y = ty + 24, tn = ctx.town, nx = tn.nextCheer(), prev = DQ.LEVELS[tn.level].cheer;
        UI.panel(g, x, y, 72, 22, { alpha: .82, thread: this.pulse > 0 ? '#ffd84a' : undefined });
        px.rect(g, x + 7, y + 5, 2, 13, '#8a5a32'); px.rect(g, x + 9, y + 5, 8, 7, '#d04a4a'); px.rect(g, x + 9, y + 8, 8, 1, '#f1e6c8');
        UI.text(g, 'Lv ' + tn.level, x + 21, y + 4, '#ffd36a'); UI.bar(g, x + 21, y + 13, 46, 5, nx ? (tn.cheer - prev) / (nx - prev) : 1, '#ff7aa8', '#2a0a1a');
        UI.text(g, String(tn.cheer), x + 47, y + 4, '#ffffff', { font: 'tiny' });
      }
      // top centre: the objective
      const obj = ctx.quests && ctx.quests.objective();
      if (obj && !ctx.ui.modal) {
        const s = obj.text, w = Math.min(W - 230, Math.max(150, G().width(game, s) + 16)), x = Math.round(W / 2 - w / 2);
        const lines = E.font.wrap(s.replace(/\{btn:(\w+)\}/g, '[$1]'), w - 12), hh = 14 + Math.min(2, lines.length) * 10;
        UI.panel(g, x, 4, w, hh, { alpha: .8, thread: obj.q.side ? '#bfe8ff' : '#ffd36a' });
        UI.center(g, (obj.q.side ? 'Side: ' : '') + obj.q.title, W / 2, 7, obj.q.side ? '#bfe8ff' : '#ffd36a', { font: 'tiny' });
        if (G().width(game, s) <= w - 12) G().text(g, game, s, Math.round(W / 2 - G().width(game, s) / 2), 15, '#ffffff');
        else { const wr = this._wrapTokens(game, s, w - 12); wr.slice(0, 2).forEach((ln, i) => G().text(g, game, ln, x + 6, 15 + i * 10, '#ffffff')); }
      }
      g.globalAlpha = 1;
      // bottom centre: the hotbar
      const hw = 8 * 24 + 4, hx = Math.round(W / 2 - hw / 2), hy = H - 30;
      g.globalAlpha = Math.max(a, .6);
      UI.panel(g, hx, hy, hw, 27, { alpha: .82 });
      for (let i = 0; i < 8; i++) {
        const id = b.hotbar[i], sel = i === b.sel, x = hx + 3 + i * 24, y = hy + 3 - (sel ? 2 : 0), n = id ? b.bag.count(id) : 0;
        px.rect(g, x, y, 22, 21, sel ? '#4a3a7a' : '#1a1430'); px.rect(g, x, y, 22, 1, '#0a0814');
        if (id) { const ic = DQ.Icons.get(id, 16); if (ic) { if (!n) g.globalAlpha = .3; g.drawImage(ic, x + 3, y + 2); g.globalAlpha = Math.max(a, .6); } if (DQ.ITEMS[id].kind !== 'weapon' && !DQ.ITEMS[id].keyItem) UI.text(g, n > 99 ? '99' : String(n), x + 21 - E.font.width(String(Math.min(99, n)), { font: 'tiny' }), y + 14, n ? '#ffffff' : '#ff8a8a', { font: 'tiny', outline: '#000', shadow: false }); }
        if (sel) UI.sel(g, x - 1, y - 1, 24, 23, t);
      }
      G().draw(g, game, 'hotPrev', hx - 14, hy + 8); G().draw(g, game, 'hotNext', hx + hw + 3, hy + 8);
      const hid = b.held; if (hid) { const it = DQ.ITEMS[hid], s = it.name + (it.kind === 'block' || it.kind === 'material' || it.kind === 'food' || it.kind === 'object' ? '  ×' + b.bag.count(hid) : ''); UI.center(g, s, W / 2, hy - 11, '#ffffff'); }
      g.globalAlpha = 1;
      // bottom left: context prompts
      const pr = this.prompts(); let py = H - 14;
      for (const p of pr.slice(0, 3)) { UI.panel(g, 4, py - 3, G().width(game, p) + 12, 14, { alpha: .75 }); G().text(g, game, p, 10, py, '#ffffff'); py -= 15; }
      // bottom right: pickup toasts
      let toy = H - 48;
      for (let i = this.toasts.length - 1; i >= 0; i--) { const q = this.toasts[i], w = E.font.width(q.text) + (q.icon ? 18 : 8) + 6; g.globalAlpha = Math.min(1, q.t * 2); UI.panel(g, W - w - 4, toy, w, 15, { alpha: .85, thread: q.kind === 'warn' ? '#ff8a8a' : undefined }); if (q.icon && DQ.Icons.get(q.icon, 10)) g.drawImage(DQ.Icons.get(q.icon, 10), W - w + 2, toy + 3); UI.text(g, q.text, W - w + (q.icon ? 15 : 3) + 2, toy + 4, q.kind === 'warn' ? '#ff9a9a' : '#ffffff'); toy -= 16; }
      g.globalAlpha = 1;
      // the hint line
      if (this.hintT > 0) { g.globalAlpha = Math.min(1, this.hintT * 3); const w = G().width(game, this.hintS) + 14; UI.panel(g, W / 2 - w / 2, hy - 30, w, 15, { alpha: .9 }); G().text(g, game, this.hintS, Math.round(W / 2 - w / 2 + 7), hy - 26, '#fff0c0'); g.globalAlpha = 1; }
      // centre popups (queued): notions, rooms, levels, quests
      const p = this.popups[0];
      if (p) { const k = Math.min(1, (2.8 - p.t) * 5, p.t * 4), w = Math.max(E.font.width(p.title, { scale: 2 }), G().width(game, p.text)) + 36, h = 44, x = W / 2 - w / 2, y = H * .28 - (1 - k) * 10; g.globalAlpha = k; UI.panel(g, x, y, w, h, { thread: '#ffd36a' }); if (p.icon && DQ.Icons.get(p.icon, 16)) g.drawImage(DQ.Icons.get(p.icon, 16), x + 8, y + 8); E.font.title(g, p.title, W / 2, y + 6, { scale: 2, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', align: 'center' }); G().text(g, game, p.text, Math.round(W / 2 - G().width(game, p.text) / 2), y + 28, '#ffffff'); g.globalAlpha = 1; }
      if (this.bannerT > 0) { const k = Math.min(1, this.bannerT * 2, (3 - this.bannerT) * 4); g.globalAlpha = k; const w = E.font.width(this.bannerS, { scale: 2 }) + 30; UI.panel(g, W / 2 - w / 2, H * .14, w, 26, { thread: '#ffd36a' }); E.font.title(g, this.bannerS, W / 2, H * .14 + 6, { scale: 2, colors: ['#ffffff', '#ffd36a'], outline: '#1a1020', align: 'center' }); g.globalAlpha = 1; }
      if (this.lvT > 0) { const k = Math.min(1, this.lvT, (4 - this.lvT) * 3); g.globalAlpha = k; E.font.title(g, 'THIMBLETON IS NOW LEVEL ' + this.lv + '!', W / 2, H * .42, { scale: 2, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', depth: 2, align: 'center' }); const L = DQ.LEVELS[this.lv]; if (L) UI.center(g, 'Unlocked: ' + L.unlocks.join(', '), W / 2, H * .42 + 22, '#ffffff'); g.globalAlpha = 1; }
      if (this.flashT > 0 && Math.floor(this.flashT * 8) % 2 === 0) E.font.title(g, this.flashS, W / 2, H * .34, { scale: 3, colors: ['#ffb0ff', '#ff3aff'], outline: '#1a0a1a', depth: 2, align: 'center' });
      // siege and boss bars
      const S = ctx.siege;
      if (S && S.active) {
        const ban = ctx.town && ctx.town.bannerObj(), bw = 140, x = W / 2 - bw / 2, y = obj ? 42 : 6;
        UI.panel(g, x - 4, y - 3, bw + 8, 24, { alpha: .85, thread: '#ff8a8a' });
        const lab = S.phase === 'prep' ? 'The Knotted army approaches! ' + DQ.fmtTime(S.left) : S.phase === 'breather' ? 'Wave cleared! Repair! ' + DQ.fmtTime(S.left) : S.phase === 'wave' ? 'Wave ' + S.wave + ' / ' + S.waves.length : S.phase === 'boss' ? 'Defend Thimbleton!' : '';
        UI.center(g, lab, W / 2, y, '#ffd0d0'); if (ban) { UI.bar(g, x, y + 10, bw, 7, ban.hp / (S.bee ? 200 : 300), '#ffd84a', '#2a1a0a'); UI.text(g, 'Banner', x + 3, y + 10, '#2a1a0a', { font: 'tiny', shadow: false }); }
      }
      const boss = ctx.monsters && ctx.monsters.list.find(m => m.def.boss && !m.dead && m.awake);
      if (boss) {
        const bw = Math.min(260, W - 160), x = W / 2 - bw / 2, y = H - 64;
        UI.panel(g, x - 6, y - 12, bw + 12, 26, { thread: '#ff6aff' }); UI.center(g, boss.def.name, W / 2, y - 9, '#ffd0ff');
        UI.bar(g, x, y + 1, bw, 8, boss.hp / boss.maxHp, boss.tangled > 0 ? '#ff6aff' : '#c04ad0', '#1a0a20');
        if (boss.id === 'gnarlgrim') for (let i = 1; i <= 2; i++) px.rect(g, x + Math.round(bw * i / 3), y, 1, 10, '#ffffff');
      }
      // low HP vignette and the KO fade
      if (b.hp / b.maxHp < .25 && b.hp > 0 && !game.reduceMotion) { const k = .5 + .5 * Math.sin(t * 6); px.blend(g, .25 * k, 'normal', () => { px.rect(g, 0, 0, W, 6, '#a00020'); px.rect(g, 0, H - 6, W, 6, '#a00020'); px.rect(g, 0, 0, 6, H, '#a00020'); px.rect(g, W - 6, 0, 6, H, '#a00020'); }); }
      if (ctx.sleeping > 0) { const k = ctx.sleeping > 1.3 ? (2.6 - ctx.sleeping) / 1.3 : ctx.sleeping / 1.3; px.blend(g, Math.min(1, k * 1.2), 'normal', () => px.rect(g, 0, 0, W, H, '#05040c')); if (k > .6) E.font.title(g, 'Zzz...', W / 2, H / 2 - 8, { scale: 2, colors: ['#c8d8ff', '#8a9ae0'], align: 'center' }); }
      if (b.ko > 0) { const k = E.clamp((2.6 - b.ko) / 2.2, 0, 1); px.blend(g, k * .8, 'normal', () => px.rect(g, 0, 0, W, H, '#100818')); if (k > .3) E.font.title(g, "You've come undone...", W / 2, H / 2 - 10, { scale: 2, colors: ['#ffd0e0', '#c87a9a'], align: 'center' }); }
    });
  }
  _wrapTokens(game, s, maxW) { const words = s.split(' '), out = []; let cur = ''; for (const w of words) { const t2 = cur ? cur + ' ' + w : w; if (G().width(game, t2) > maxW && cur) { out.push(cur); cur = w; } else cur = t2; } if (cur) out.push(cur); return out; }
  // the context prompts for what the builder faces and holds
  prompts() {
    const ctx = this.ctx, b = ctx.builder, t = b.target, out = [], held = b.held, it = held && DQ.ITEMS[held];
    if (ctx.ui.modal || ctx.cutscene || b.ko) return out;
    if (b.seat) return ['{btn:swing} Fire', '{btn:interact} Get off'];
    if (ctx.town && ctx.town.placing) { const p = ctx.town.placing; return ['{btn:place} Lay the Pattern' + (p.ok ? '' : ' (' + p.why + ')'), '{btn:hotPrev}{btn:hotNext} Turn it', '{btn:interact} Cancel']; }
    if (t.npc) out.push('{btn:interact} Talk to ' + t.npc.name.split(' ')[0]);
    else if (t.use) { const d = t.use.def; out.push('{btn:interact} ' + (d.station ? 'Craft' : d.chest ? 'Open chest' : d.bed ? 'Sleep' : d.ballista ? (t.use.broken ? 'Repair' : 'Man the Ballista') : d.portal ? 'Travel' : d.banner ? 'Banner' : d.bundle ? 'Pick up' : d.collect ? 'Take' : d.supply ? 'Take supplies' : t.use.id === 'cage' ? 'Look' : 'Use')); }
    const bt = t.obj || (t.brk && { blk: ctx.world.get(t.brk.x, t.brk.y, t.brk.z) });
    if (t.inBrk && bt) { const nm = t.obj ? t.obj.def.name : DQ.BLOCKS[bt.blk] && DQ.BLOCKS[bt.blk].name; if (nm && !(t.obj && t.obj.def.fixed && !t.obj.def.plant && t.obj.id !== 'cage')) out.push('{btn:swing} ' + (t.obj && !t.obj.def.plant && t.obj.id !== 'cage' ? 'Pick up ' : 'Break ') + nm); }
    if (it) { if (it.kind === 'food') out.push('{btn:place} Eat ' + it.name); else if (it.kind === 'use') out.push('{btn:place} Use ' + it.name); else if ((it.kind === 'block' || it.kind === 'object') && t.plc) out.push('{btn:place} Place ' + it.name); else if (it.kind === 'weapon' || it.kind === 'body' || it.kind === 'shield') out.push('{btn:place} Equip ' + it.name); }
    return out;
  }
}
DQ.Hud = Hud;
})();
