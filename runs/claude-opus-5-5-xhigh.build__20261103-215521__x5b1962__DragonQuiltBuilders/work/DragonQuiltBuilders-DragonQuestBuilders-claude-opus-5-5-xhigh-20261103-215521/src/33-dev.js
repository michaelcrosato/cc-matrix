// Dev Tools (pause menu -> Dev Tools; hidden in AI Hub sessions): cheats, warps, spawns, story beats, live tuning sliders
// with reset to defaults, debug overlays and timing, and the World tab (export a stamp, dev snapshots, regenerate).
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const F = (g, s, x, y, c, o) => E.font.text(g, DQ.safe(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#05040a' }, o || {}));
const FW = s => E.font.width(DQ.safe(s));
const TABS = ['Cheats', 'Warp', 'Spawn', 'Story', 'Tuning', 'Debug', 'World'];
const CHEATS = [['god', 'God mode'], ['creative', 'Creative bag (infinite, every recipe)'], ['fly', 'Fly / no-clip (Jump up, Sprint down)'], ['instantBreak', 'Instant break'], ['noHunger', 'No hunger'], ['oneHit', 'One-hit kills'], ['freezeTime', 'Freeze time of day'], ['invisible', 'Invisible to monsters']];
const WARPS = [['Lint Hollow', 'hollowStart'], ['Thimbleton plaza', 'bannerSpot'], ['Corduroy Crags', 'cragLedge'], ['Button Quarry', 'quarryFloor'], ['Tweedwood Lint Camp', 'lintCamp'], ['Calico Coast shipwreck', 'shipwreck'], ['Frayed Verge', 'verge'], ['Knot Gate', 'vergeGate'], ['Knotted Spire top', 'spireTop'], ['The Rift', 'eastRoad']];
const OVERLAYS = [['showRooms', 'Room detector'], ['showNav', 'Nav paths (residents)'], ['showAggro', 'Monster aggro rings'], ['showCollision', 'Collision cells'], ['showCut', 'Cutaway radius'], ['showLights', 'Light radii'], ['showGhosts', 'Pattern ghost status'], ['perf', 'Perf readout']];
class DevScreen {
  constructor() { this.id = 'dev'; this.tab = 0; this.i = 0; this.item = 0; this.qty = 0; this.mark = []; }
  rows() {
    const ctx = this.ctx, d = ctx.dev, t = this.tab, R = [];
    if (t === 0) for (const [k, l] of CHEATS) R.push({ label: l, value: d[k] ? 'ON' : 'off', act: () => { d[k] = !d[k]; if (k === 'creative') ctx.builder.bag.infinite = d[k]; DQ.Dev.persist(ctx); } });
    if (t === 1) { for (const [l, k] of WARPS) R.push({ label: l, act: () => DQ.Dev.warp(ctx, k) }); R.push({ label: 'Teleport to the cursor', act: () => { const c = ctx.builder.cursor, p = c.plc || c.brk; if (p) ctx.builder.teleportCell(p[0], p[1], ctx.world.topZ(p[0], p[1])); this.ui.pop(); } }); }
    if (t === 2) {
      for (const k of ['lintling', 'dyedLintling', 'mothlet', 'pinhog', 'frayedKnight', 'knotbrute']) R.push({ label: 'Spawn ' + DQ.MONSTERS[k].name, value: '{btn:ok} x1  {btn:alt} x5', act: n => { for (let i = 0; i < (n || 1); i++) { const b = ctx.builder; ctx.monsters.spawn(k, b.cx + 3 + (i % 3), b.cy + Math.floor(i / 3)); } }, alt: () => { for (let i = 0; i < 5; i++) { const b = ctx.builder; ctx.monsters.spawn(k, b.cx + 3 + (i % 3), b.cy + Math.floor(i / 3)); } } });
      R.push({ label: 'Boss: Sir Buttonsworth (at the Quarry)', act: () => { ctx.flags.boss_buttonGolem = false; DQ.Dev.warp(ctx, 'quarryFloor'); ctx.bosses.wakeButtonsworth(); this.ui.closeAll(); } });
      R.push({ label: 'Boss: Gnarlgrim (here)', act: () => { const b = ctx.builder; ctx.bosses.spawnGnarlgrim({ x: b.cx + 5, y: b.cy }); ctx.siege.active = true; ctx.siege.phase = 'boss'; this.ui.closeAll(); } });
      const ids = Object.keys(DQ.ITEMS); this.item = E.clamp(this.item, 0, ids.length - 1);
      R.push({ label: 'Item: ' + DQ.ITEMS[ids[this.item]].name, value: '←→ pick  {btn:ok} x' + [1, 10, 99][this.qty] + '  {btn:alt} amount', lr: d2 => { this.item = (this.item + d2 + ids.length) % ids.length; }, act: () => { ctx.builder.bag.add(ids[this.item], [1, 10, 99][this.qty]); DQ.sfx('pickup'); }, alt: () => { this.qty = (this.qty + 1) % 3; } });
      for (const id of DQ.NPC_ORDER) R.push({ label: 'Resident arrives now: ' + DQ.NPCS[id].name, act: () => { if (!ctx.town.planted) DQ.Beats.apply(ctx, 'banner'); if (!ctx.npcs.get(id)) ctx.npcs.arrive(id); this.ui.closeAll(); } });
    }
    if (t === 3) {
      for (const b of DQ.Beats.list) R.push({ label: 'Jump to: ' + DQ.Beats.names[b], act: () => { DQ.Beats.apply(ctx, b); this.ui.closeAll(); } });
      R.push({ label: 'Complete the current quest step', act: () => DQ.Dev.completeStep(ctx) });
      R.push({ label: 'Town level', value: '← ' + ctx.town.level + ' →', lr: d2 => { if (!ctx.town.planted) DQ.Beats.apply(ctx, 'banner'); const lv = E.clamp(ctx.town.level + d2, 1, 5); if (lv > ctx.town.level) ctx.town.setLevel(lv); else { ctx.town.level = lv; ctx.town.rDisp = ctx.town.radius; } } });
      R.push({ label: 'Cheer', value: '← -50  ' + ctx.town.cheer + '  +50 →', lr: d2 => { if (d2 > 0) ctx.town.addCheer(50, 'dev'); else ctx.town.cheer = Math.max(0, ctx.town.cheer - 50); }, act: () => ctx.town.addCheer(50, 'dev') });
      R.push({ label: 'Hour', value: '← ' + ctx.clock.label + ' →', lr: d2 => ctx.clock.setHour(Math.floor(ctx.clock.hour) + d2), act: () => ctx.clock.setHour(Math.floor(ctx.clock.hour) + 1) });
      R.push({ label: 'Siege: start now', act: () => { ctx.siege.begin({ prep: 5 }); this.ui.closeAll(); } });
      R.push({ label: 'Siege: skip to the next wave', act: () => { ctx.siege.skipTo(Math.max(0, ctx.siege.wave + 1)); } });
    }
    if (t === 4) {
      for (const df of DQ.TUNING_DEFS) { const v = DQ.tune(df.key), chg = v !== df.def; R.push({ label: df.label, value: '← ' + (Math.round(v * 100) / 100) + ' →' + (chg ? ' *' : ''), slider: df, lr: d2 => { DQ.tuning.set(df.key, Math.round(E.clamp(v + d2 * df.step, df.min, df.max) / df.step) * df.step); }, alt: () => DQ.tuning.reset(df.key) }); }
      R.push({ label: 'Reset every slider to its default', act: () => { DQ.tuning.reset(); DQ.sfx('uiConfirm'); } });
    }
    if (t === 5) {
      for (const [k, l] of OVERLAYS) R.push({ label: l, value: d[k] ? 'ON' : 'off', act: () => { d[k] = !d[k]; d.overlays = OVERLAYS.some(([q]) => d[q]); DQ.Dev.persist(ctx); } });
      R.push({ label: 'Time scale', value: '← ' + d.timeScale + 'x →', lr: d2 => { const S = [0, .25, .5, 1, 2, 4], i = S.indexOf(d.timeScale); d.timeScale = S[E.clamp((i < 0 ? 3 : i) + d2, 0, S.length - 1)]; }, act: () => { d.timeScale = d.timeScale === 1 ? 0 : 1; } });
      R.push({ label: 'Frame step (while time scale is 0)', act: () => { d.stepOnce = true; } });
      R.push({ label: 'Cutaway', value: d.cutaway, act: () => { d.cutaway = d.cutaway === 'auto' ? 'always' : d.cutaway === 'always' ? 'off' : 'auto'; } });
      R.push({ label: 'Builder\'s Eye grid always', value: d.eyeGrid ? 'ON' : 'off', act: () => { d.eyeGrid = !d.eyeGrid; } });
    }
    if (t === 6) {
      R.push({ label: 'Stamp: mark corner ' + (this.mark.length % 2 ? 'B' : 'A') + ' at the cursor', value: this.mark.length ? this.mark.map(m => m.join(',')).join(' to ') : '', act: () => { const c = ctx.builder.cursor.brk || ctx.builder.cursor.plc || [ctx.builder.cx, ctx.builder.cy, ctx.builder.L]; if (this.mark.length >= 2) this.mark = []; this.mark.push(c.slice()); } });
      R.push({ label: 'Stamp: export the marked box (clipboard + download)', act: () => DQ.Dev.exportStamp(ctx, this.mark) });
      R.push({ label: 'Save a dev snapshot', act: () => { const w = DQ.Save.write(ctx); if (w) { DQ.store.set('devSnap', w.data); ctx.hud.toast('Dev snapshot saved.'); } } });
      R.push({ label: 'Load the dev snapshot', act: () => { const s = DQ.store.get('devSnap', null); if (s) { this.ui.closeAll(); DQ.game.go('play', { saveData: s }); } else ctx.hud.toast('No dev snapshot yet.'); } });
      R.push({ label: 'Regenerate the world (a new game, from the start)', act: () => { this.ui.closeAll(); DQ.game.go('play', { name: ctx.builder.name, look: ctx.builder.look, beat: 'start' }); } });
    }
    return R;
  }
  update(dt, I) {
    if (I.pressed('back')) { this.ui.pop(); return; }
    if (I.pressed('tabPrev')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.i = 0; DQ.sfx('uiMove'); }
    if (I.pressed('tabNext')) { this.tab = (this.tab + 1) % TABS.length; this.i = 0; DQ.sfx('uiMove'); }
    const R = this.rows();
    if (I.repeat('up', .3, .08)) { this.i = (this.i + R.length - 1) % R.length; DQ.sfx('uiMove'); }
    if (I.repeat('down', .3, .08)) { this.i = (this.i + 1) % R.length; DQ.sfx('uiMove'); }
    const r = R[this.i]; if (!r) return;
    const lr = (I.repeat('left', .3, .06) ? -1 : 0) + (I.repeat('right', .3, .06) ? 1 : 0); if (lr && r.lr) { r.lr(lr); DQ.sfx('uiTick'); }
    if (I.pressed('ok')) { if (r.act) r.act(); else if (r.lr) r.lr(1); DQ.sfx('uiConfirm'); }
    if (I.pressed('alt') && r.alt) { r.alt(); DQ.sfx('uiConfirm'); }
  }
  wheel(n) { this.i = Math.max(0, this.i + n); }
  draw(g, W, H, ui) {
    const x0 = 8, y0 = 22, w = W - 16, h = H - 44; DQ.Hud.panel(g, x0, y0, w, h, {});
    let tx = x0; TABS.forEach((t, i) => { const tw = FW(t) + 12; DQ.Hud.panel(g, tx, 6, tw, 15, { gold: i === this.tab }); F(g, t, tx + 6, 10, i === this.tab ? '#ffe070' : '#c8c0e0'); ui.hit(tx, 6, tw, 15, null, () => { this.tab = i; this.i = 0; }); tx += tw + 3; });
    { const ca = DQ.game.cornerArea && DQ.game.cornerArea(), right = ca ? Math.min(W - 6, Math.round(ca.x0) - 4) : W - 6, tw = FW('DEV TOOLS'); if (right - tw > tx + 4) F(g, 'DEV TOOLS', right - tw, 10, '#ff9a8a'); }
    const R = this.rows(), per = Math.floor((h - 10) / 13), start = E.clamp(this.i - Math.floor(per / 2), 0, Math.max(0, R.length - per));
    R.slice(start, start + per).forEach((r, k) => { const i = start + k, y = y0 + 6 + k * 13, sel = i === this.i; if (sel) DQ.Hud.panel(g, x0 + 4, y - 2, w - 8, 12, { gold: true }); F(g, r.label, x0 + 12, y, sel ? '#ffe070' : '#ffffff'); if (r.value) DQ.Glyphs.text(g, DQ.game, r.value, x0 + w - 12 - DQ.Glyphs.measure(DQ.game, r.value), y, r.value === 'ON' ? '#8adc8a' : '#c8c0e0');
      if (r.slider) { // a live slider: the track, the default's notch, the knob; click or drag on it with the mouse
        const df = r.slider, tw = Math.min(140, Math.round(w * .3)), tx = x0 + w - 70 - tw, ty = y + 3, v = DQ.tune(df.key), f = (q) => E.clamp((q - df.min) / (df.max - df.min), 0, 1), kx = tx + Math.round(f(v) * tw);
        px.rect(g, tx, ty, tw, 3, '#2a2440'); px.rect(g, tx, ty, kx - tx, 3, sel ? '#e8c040' : '#8a84c8'); px.rect(g, tx + Math.round(f(df.def) * tw), ty - 2, 1, 7, '#c8c0e0'); px.rect(g, kx - 2, ty - 3, 5, 9, sel ? '#ffe070' : '#ffffff'); px.rect(g, kx - 1, ty - 2, 3, 7, sel ? '#c89020' : '#8a84a8');
        const setAt = q => { const u = E.clamp((q[0] - tx) / tw, 0, 1), val = Math.round((df.min + u * (df.max - df.min)) / df.step) * df.step; DQ.tuning.set(df.key, Math.round(E.clamp(val, df.min, df.max) * 1000) / 1000); };
        ui.hit(tx - 4, y - 2, tw + 8, 12, q => { this.i = i; if (q && DQ.game.input.held.has('Mouse0')) setAt(q); }, q => { this.i = i; if (q) { setAt(q); DQ.sfx('uiMove'); } });
      }
      ui.hit(x0 + 4, y - 2, w - 8, 12, () => { this.i = i; }, () => { this.i = i; if (r.act) r.act(); else if (r.lr) r.lr(1); }); });
    const hint = this.tab === 4 ? '{btn:left}{btn:right} Adjust   {btn:alt} Reset this one   {btn:back} Close' : '{btn:ok} Choose   {btn:left}{btn:right} Adjust   {btn:tabPrev}{btn:tabNext} Tabs   {btn:back} Close';
    DQ.Glyphs.text(g, DQ.game, hint, 12, H - 16, '#c8c0e0');
  }
}
DQ.Dev = {
  open() { const ctx = DQ.ctx; if (!ctx || DQ.HUB || DQ.game.sceneName !== 'play') { if (DQ.ctx && DQ.ctx.hud) DQ.ctx.hud.toast('Dev Tools open during play.'); return; } ctx.ui.push(new DevScreen()); },
  persist(ctx) { const d = {}; for (const [k] of CHEATS) d[k] = ctx.dev[k]; for (const [k] of OVERLAYS) d[k] = ctx.dev[k]; DQ.store.set('dev', d); },
  restore(ctx) { const d = DQ.store.get('dev', null); if (d && typeof d === 'object') Object.assign(ctx.dev, d); ctx.dev.overlays = OVERLAYS.some(([q]) => ctx.dev[q]); if (ctx.dev.creative) ctx.builder.bag.infinite = true; },
  warp(ctx, key) { const p = ctx.poi[key]; if (!p) return; const b = ctx.builder; b.teleportCell(p.x, p.y, p.L || ctx.world.topZ(p.x, p.y)); ctx.world.escape(b.body); DQ.game.cam.snap = true; ctx.ui.closeAll(); },
  completeStep(ctx) {
    const cur = ctx.quests.current(); if (!cur) return; const s = ctx.quests.s[cur.id], qd = DQ.QUESTS[cur.id];
    if (s.status === 'ready') { ctx.quests.complete(cur.id); return; }
    s.step++; if (s.step >= qd.steps.length) ctx.quests.complete(cur.id); else ctx.quests.stepStart(cur.id);
  },
  exportStamp(ctx, mark) {
    if (mark.length < 2) { ctx.hud.toast('Mark two corners first.'); return null; }
    const w = ctx.world, [a, b] = mark, x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]), z0 = Math.min(a[2], b[2]), z1 = Math.max(a[2], b[2]);
    const legend = {}, chars = 'abcdefghijklmnopqrstuvwxyz0123456789', key = {}; let n = 0; const layers = [];
    for (let z = z0; z <= z1; z++) { const rows = []; for (let y = y0; y <= y1; y++) { let s = ''; for (let x = x0; x <= x1; x++) { const o = w.objIdx.get(w.idx(x, y, z)); let ch = '.'; if (o && o.z === z) { const k = 'o:' + o.id + ':' + o.facing; if (!key[k]) { key[k] = chars[n++ % chars.length]; legend[key[k]] = { obj: o.id, facing: o.facing }; } ch = key[k]; } else { const id = w.get(x, y, z); if (id) { const k = DQ.BLOCKS[id].key; if (!key[k]) { key[k] = chars[n++ % chars.length]; legend[key[k]] = k; } ch = key[k]; } } s += ch; } rows.push(s); } layers.push(rows); }
    const stamp = { size: [x1 - x0 + 1, y1 - y0 + 1], legend, layers }, json = JSON.stringify(stamp, null, 1);
    try { if (navigator.clipboard) navigator.clipboard.writeText(json).catch(() => {}); } catch (e) { /* no clipboard */ }
    try { if (typeof document !== 'undefined' && !DQ.HUB) { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a2.download = 'stamp.json'; a2.click(); } } catch (e) { /* no download */ }
    ctx.hud.toast('Stamp exported (' + stamp.size.join('x') + 'x' + layers.length + ').'); DQ.Dev.last = stamp; return stamp;
  },
  /** import a stamp at a cell (round trip of export) */
  importStamp(ctx, st, x0, y0, z0) { const objs = []; DQ.WG.stamp(ctx.world, st, x0, y0, z0, objs); for (const o of objs) ctx.objects.add(o.id, o.x, o.y, o.z, o.facing, { silent: true }); DQ.WG.recalc(ctx.world); },
  drawOverlays(ctx, r) {
    const d = ctx.dev, w = ctx.world, b = ctx.builder;
    if (d.showRooms) for (const rm of ctx.rooms.list) { const col = { bedroom: '#ff8ab0', workshop: '#8ab0ff', kitchen: '#ffb060', messHall: '#c8ff8a', smithy: '#ff6040', guardPost: '#a0a0ff', hall: '#ffe070', snug: '#c8c0e0' }[rm.type] || '#ffffff'; for (const [x, y] of rm.list) r.decal(() => r.groundDisc(x * T + 8, y * T + 8, 7, col, .5, rm.L * T + 1)); }
    if (d.showRooms && b && ctx.rooms.diagnose) { const h = ctx.rooms.diagnose(b.cx, b.cy, b.L); if (h) r.text('Here: ' + h, 6, r.H - 60, '#ff9a8a'); }
    if (d.showNav) for (const n of ctx.npcs.list) { const p = n.walker.path; if (!p) continue; for (let i = 1; i < p.length; i++) { const a = p[i - 1], c = p[i]; r.decal(() => { const A = r.w(a[0] * T + 8, a[1] * T + 8, a[2] * T + 1), C = r.w(c[0] * T + 8, c[1] * T + 8, c[2] * T + 1); px.line(r.ctx, Math.round(A[0]), Math.round(A[1]), Math.round(C[0]), Math.round(C[1]), '#8affc8'); }); } }
    if (d.showAggro) for (const m of ctx.monsters.list) if (!m.dead) r.decal(() => r.groundRing(m.x, m.y, DQ.tune('aggro') * (m.def.aggro / 8) * T, m.target ? '#ff6060' : '#ffb060', .6, m.z + 1));
    if (d.showCollision && b) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = b.cx + dx, y = b.cy + dy; if (w.blocksBody(x, y, b.body, x * T + 8, y * T + 8)) r.decal(() => r.groundDisc(x * T + 8, y * T + 8, 7, '#ff4040', .5, b.z + 1)); }
    if (d.showCut && ctx.render.cut) { const c = ctx.render.cut; r.decal(() => r.groundRing(c.x * T, c.y * T, Math.max(1, c.rad * T), '#80e0ff', .8, b.z + 1)); }
    if (d.showLights) for (const L of DQ.game.lights.list) r.decal(() => r.groundRing(L.x, L.y, L.r, L.color || '#ffe070', .5, L.z - 10));
    if (d.showGhosts) for (const p of ctx.town.patterns) r.text(p.def.name + ' ' + p.progress + '/' + p.total, 6, r.H - 72, '#ffe070');
    if (d.perf) { const s = DQ.game.stats; r.text('frame ' + (s.frameMs || 0).toFixed(1) + 'ms  upd ' + (s.updateMs || 0).toFixed(1) + '  draw ' + (s.renderMs || 0).toFixed(1) + '  runs ' + ctx.render.runsDrawn + '  items ' + (s.items || 0) + '  actors ' + s.actors + '  lights ' + DQ.game.lights.list.length + '  net ' + (ctx.net ? ctx.net.msgRate() + '/s' : '-'), 4, r.H - 36, '#a0ffa0', { font: 'tiny' }); }
  }
};
})();
