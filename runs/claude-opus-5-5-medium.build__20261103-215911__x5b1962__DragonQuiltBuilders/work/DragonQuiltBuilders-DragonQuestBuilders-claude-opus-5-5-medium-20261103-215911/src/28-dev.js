// Dev Tools (from the pause menu): cheats, warp, spawn, story beats, live tuning sliders, debug overlays, stamps.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;
const TABS = ['Cheats', 'Warp', 'Spawn', 'Story', 'Tuning', 'Debug', 'World'];
const WARPS = [['Lint Hollow', 38, 40], ['Thimbleton plaza', 72, 79], ['Corduroy Crags', 52, 30], ['Button Quarry', 21, 18], ['Tweedwood Lint Camp', 116, 33], ['Calico Coast shipwreck', 22, 129], ['Frayed Verge', 94, 108], ['Knot Gate', 97, 113], ['Knotted Spire top', 124, 124], ['The Rift', 101, 80]];
DQ.Dev = {
  stamp: null, corners: [null, null], frameStep: false,
  teleport(ctx, x, y, z) { const b = ctx.builder.body; b.x = (x + .5) * T; b.y = (y + .5) * T; b.z = (z === undefined ? ctx.world.topZ(x, y) : z) * T; b.vx = b.vy = b.vz = 0; ctx.world.escape(b); b.lastSafe = [b.x, b.y, b.z]; ctx.game.cam.snap = true; },
  exportStamp(ctx) {
    const [a, c] = DQ.Dev.corners; if (!a || !c) return null; const w = ctx.world, x0 = Math.min(a.x, c.x), x1 = Math.max(a.x, c.x), y0 = Math.min(a.y, c.y), y1 = Math.max(a.y, c.y), z0 = Math.min(a.z, c.z), z1 = Math.max(a.z, c.z) + 3;
    const keys = {}, legend = {}; let next = 0; const ch = id => { if (!id) return '.'; if (!keys[id]) { const k = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[next++]; keys[id] = k; legend[k] = DQ.BLOCKS[id].key; } return keys[id]; };
    const layers = []; for (let z = z0; z <= z1; z++) { const rows = []; for (let y = y0; y <= y1; y++) { let s = ''; for (let x = x0; x <= x1; x++) s += ch(w.get(x, y, z)); rows.push(s); } layers.push(rows); }
    const objects = ctx.objects.filter(o => o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1 && o.z >= z0 && o.z <= z1 && !o.def.fixed).map(o => [o.id, o.x - x0, o.y - y0, o.z - z0, o.facing]);
    const st = { size: [x1 - x0 + 1, y1 - y0 + 1, z1 - z0 + 1], layers, legend, objects };
    DQ.Dev.stamp = st; const json = JSON.stringify(st);
    try { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(json).catch(() => {}); } catch (e) { /* no clipboard */ }
    try { if (typeof document !== 'undefined' && !DQ.inHub) { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a2.download = 'stamp.json'; a2.click(); } } catch (e) { /* no download */ }
    return st;
  },
  importStamp(ctx, st, x, y, z) { if (!st) return 0; let n = 0; st.layers.forEach((rows, l) => rows.forEach((row, yy) => [...row].forEach((c, xx) => { if (c === ' ') return; const id = c === '.' ? 0 : DQ.blockId(st.legend[c]); if (ctx.world.set(x + xx, y + yy, z + l, id, { silent: true })) n++; }))); for (const [id, ox, oy, oz, f] of st.objects || []) ctx.objects.add({ id, x: x + ox, y: y + oy, z: z + oz, facing: f }, { force: true, silent: true }); ctx.world.recomputeTops(); ctx.rooms.mark(); return n; },
  // overlays drawn in the world
  drawWorld(ctx, r) {
    const d = DQ.dev, b = ctx.builder; if (!b) return;
    if (d.showRooms) {
      for (const room of ctx.rooms.list) for (const [x, y] of room.cells) r.queue((x + .5) * T, (y + .5) * T, room.L * T + .5, g => px.polyDither(g, [r.w(x * T, y * T, room.L * T), r.w(x * T + T, y * T, room.L * T), r.w(x * T + T, y * T + T, room.L * T), r.w(x * T, y * T + T, room.L * T)], { bedroom: '#ff7aa8', workshop: '#e8c040', kitchen: '#ff8a4a', guardPost: '#7a9aff', messHall: '#6ae06a', smithy: '#c87a4a', hall: '#d08ae8', snug: '#ffffff' }[room.type] || '#fff', .35, r.ix, r.iy), { bias: -.002 });
      for (const f of ctx.rooms.fails || []) if (f.leak) { const [x, y] = f.leak; r.queue((x + .5) * T, (y + .5) * T, (f.L + 1) * T, g => { const p = r.w((x + .5) * T, (y + .5) * T, (f.L + 1) * T); DQ.Glyphs.tick(g, Math.round(p[0]) - 3, Math.round(p[1]) - 3, false); }, { bias: .05 }); }
    }
    if (d.showNav) for (const n of ctx.npcs.list) if (n.path) { const pts = n.path.map(q => [(q[0] + .5) * T, (q[1] + .5) * T, q[2] * T]); r.queue(n.body.x, n.body.y, n.body.z, g => { let p0 = r.w(n.body.x, n.body.y, n.body.z); for (const q of pts) { const p1 = r.w(...q); px.line(g, p0[0], p0[1], p1[0], p1[1], '#6ae0ff'); p0 = p1; } }, { bias: .05 }); }
    if (d.showAggro) for (const m of ctx.monsters.list) if (!m.dead) { const R = DQ.tuning.get('aggro') / 8 * m.def.aggro * T; r.queue(m.body.x, m.body.y, m.body.z, g => { const pts = r.groundPts(m.body.x, m.body.y, R, 24, m.body.z + 1); for (let i = 0; i < pts.length; i += 2) px.rect(g, pts[i][0], pts[i][1], 1, 1, m.aggro ? '#ff4a4a' : '#ffd84a'); }, { bias: .05 }); }
    if (d.showCollide) { const cx = Math.floor(b.body.x / T), cy = Math.floor(b.body.y / T), L = b.L0; for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) for (const l of [L, L + 1]) if (ctx.world.blocks(x, y, l, 'builder', b.body.z, 2)) r.queue((x + .5) * T, (y + .5) * T, l * T, g => ctx.renderer.cube(g, r, x, y, l, '#ff4a4a', true), { bias: .05 }); }
    if (d.showLights) for (const L of r.game.lights.list) r.queue(L.x, L.y, L.z, g => { const pts = r.groundPts(L.x, L.y, L.r, 20, L.z - 12); for (const p of pts) px.rect(g, p[0], p[1], 1, 1, '#fff0a0'); }, { bias: .05 });
    if (d.showPattern && ctx.town.pattern) for (const c of ctx.town.pattern.cells) r.queue((c.x + .5) * T, (c.y + .5) * T, c.z * T, g => ctx.renderer.cube(g, r, c.x, c.y, c.z, c.ok ? '#6ae06a' : '#ff6a6a', !c.ok), { bias: .05 });
    if (d.perf) r.overlay(g => { const s = ctx.game.stats; DQ.UI.text(g, 'frame ' + s.frameMs.toFixed(1) + 'ms  draw ' + s.renderMs.toFixed(1) + '  runs ' + ctx.renderer.queued + '  items ' + s.items + '  actors ' + s.actors + '  lights ' + ctx.game.lights.list.length, 4, r.H - 46, '#6ae0ff', { font: 'tiny' }); });
  }
};
class DevScreen extends DQ.Screen {
  constructor(ui, data) { super(ui, data); this.tab = 0; this.scroll = 0; this.spawnItem = 0; this.spawnN = 0; this.hour = 12; this.msg = ''; this.msgT = 0; }
  say(s) { this.msg = s; this.msgT = 2; }
  items() {
    const ctx = this.ctx, d = DQ.dev, b = ctx.builder, tog = (k, label) => ({ label, right: () => d[k] ? 'ON' : 'off', act: () => { d[k] = !d[k]; if (k === 'creative') { b.bag.infinite = d[k]; } DQ.devSave(); } });
    switch (this.tab) {
      case 0: return [tog('god', 'God mode'), tog('creative', 'Creative bag (all materials, every recipe)'), tog('fly', 'Fly / no-clip ({btn:jump} up, {btn:sprint} down)'), tog('instantBreak', 'Instant break'), tog('noHunger', 'No hunger'), tog('oneHit', 'One-hit kills'), tog('freezeTime', 'Freeze time of day'), tog('invisible', 'Invisible to monsters')];
      case 1: return WARPS.map(([n, x, y]) => ({ label: n, act: () => { DQ.Dev.teleport(ctx, x, y, n === 'Knotted Spire top' ? 22 : undefined); this.say('Warped to ' + n); } })).concat([{ label: 'Teleport to cursor', act: () => { const t = b.target.plc || b.target.brk; if (t) { DQ.Dev.teleport(ctx, t.x, t.y); this.say('Warped'); } else this.say('No cursor target'); } }]);
      case 2: {
        const ids = Object.keys(DQ.ITEMS), it = ids[this.spawnItem % ids.length], nn = [1, 10, 99][this.spawnN];
        const mons = Object.keys(DQ.MONSTERS).map(id => ({ label: 'Spawn ' + DQ.MONSTERS[id].name + (DQ.MONSTERS[id].boss ? ' (boss)' : ''), right: 'x1 / x5', act: s => { const n = DQ.MONSTERS[id].boss ? 1 : 1; for (let k = 0; k < n; k++) { const a = k * 1.3, m = ctx.monsters.spawn(id, b.body.x + Math.cos(b.body.facing + a) * 48, b.body.y + Math.sin(b.body.facing + a) * 48, b.body.z + 8); m.awake = true; m.aggro = true; } }, adjust: () => { for (let k = 0; k < 5; k++) { const m = ctx.monsters.spawn(id, b.body.x + Math.cos(k) * 52, b.body.y + Math.sin(k) * 52, b.body.z + 8); m.awake = true; } this.say('Spawned 5'); } }));
        return [{ label: 'Item: ' + DQ.ITEMS[it].name, right: 'x' + nn, icon: it, adjust: dd => { this.spawnItem = (this.spawnItem + dd + ids.length) % ids.length; }, act: () => { b.take(it, nn); } }, { label: 'Amount', right: 'x' + nn, adjust: dd => { this.spawnN = (this.spawnN + dd + 3) % 3; } }].concat(mons).concat(['wren', 'mortimer', 'marigold', 'professor', 'lintwick'].map(id => ({ label: 'Resident arrives now: ' + DQ.NPCS[id].name, disabled: !!ctx.npcs.get(id), act: () => { if (!ctx.town.planted) ctx.town.plant(false); ctx.npcs.arrive(id); } })));
      }
      case 3: return DQ.BEATS.map(bt => ({ label: 'Jump to beat: ' + bt, act: () => { DQ.applyBeat(ctx, bt); this.say('Beat ' + bt); } })).concat([
        { label: 'Complete the current quest step', act: () => { const o = ctx.quests.objective(); if (o) { const s = ctx.quests.st(o.q.id); s.step++; if (s.step >= o.q.steps.length) ctx.quests.complete(o.q.id); ctx.quests.update(0, true); this.say('Step done'); } } },
        { label: 'Town level', right: () => 'Lv ' + ctx.town.level, adjust: dd => { if (!ctx.town.planted) ctx.town.plant(false); if (dd > 0 && ctx.town.level < 5) { ctx.town.cheer = Math.max(ctx.town.cheer, DQ.LEVELS[ctx.town.level + 1].cheer); ctx.town.levelUp(); } else if (dd < 0 && ctx.town.level > 1) { ctx.town.level--; ctx.town.cheer = DQ.LEVELS[ctx.town.level].cheer; } } },
        { label: 'Cheer +50 / -50', right: () => String(ctx.town.cheer), adjust: dd => { ctx.town.cheer = Math.max(0, ctx.town.cheer + dd * 50); if (dd > 0) ctx.town.addCheer(0); }, act: () => ctx.town.addCheer(50) },
        { label: 'Set the hour', right: () => DQ.fmtHour(ctx.clock.hour), adjust: dd => ctx.clock.set(Math.floor(ctx.clock.hour) + dd) },
        { label: 'Start the siege (or the next wave)', act: () => { if (!ctx.siege.active) ctx.siege.start({ prep: 10 }); else if (ctx.siege.phase === 'prep' || ctx.siege.phase === 'breather') ctx.siege.nextWave(); else { for (const m of ctx.monsters.list) if (m.siege) { m.dead = true; m.deadT = 99; } ctx.siege.spawns = []; } this.say('Siege: ' + ctx.siege.phase); } }
      ]);
      case 4: return DQ.TUNING_DEFS.map(([k, label, lo, hi, step]) => ({ label, key: k, right: () => (DQ.tuning.isDefault(k) ? '' : '* ') + (+DQ.tuning.get(k).toFixed(2)), adjust: dd => DQ.tuning.set(k, DQ.tuning.get(k) + dd * step * (hi - lo > 50 ? 5 : 1)), act: () => DQ.tuning.reset(k) })).concat([{ label: 'Reset all to defaults', act: () => { DQ.tuning.reset(); this.say('Defaults restored'); } }]);
      case 5: return [tog('showCollide', 'Overlay: collision cells'), tog('showRooms', 'Overlay: room detector'), tog('showNav', 'Overlay: NPC paths'), tog('showAggro', 'Overlay: monster aggro rings'), tog('showLights', 'Overlay: light radii'), tog('showPattern', 'Overlay: pattern ghost status'), tog('perf', 'Perf readout'),
        { label: 'Time scale', right: () => DQ.dev.timeScale + 'x', adjust: dd => { const S = [.25, .5, 1, 2, 4], i = S.indexOf(DQ.dev.timeScale); DQ.dev.timeScale = S[E.clamp((i < 0 ? 2 : i) + dd, 0, 4)]; ctx.game.timeScale = DQ.dev.timeScale; DQ.devSave(); } },
        { label: 'Frame step (while paused, {btn:confirm} steps)', right: () => DQ.Dev.frameStep ? 'ON' : 'off', act: () => { DQ.Dev.frameStep = !DQ.Dev.frameStep; } },
        { label: 'Cutaway', right: () => DQ.dev.cutaway, adjust: dd => { const C = ['auto', 'always', 'off'], i = C.indexOf(DQ.dev.cutaway); DQ.dev.cutaway = C[(i + dd + 3) % 3]; DQ.devSave(); }, act: () => { const C = ['auto', 'always', 'off']; DQ.dev.cutaway = C[(C.indexOf(DQ.dev.cutaway) + 1) % 3]; DQ.devSave(); } }];
      case 6: return [
        { label: 'Mark stamp corner A at the cursor', right: () => DQ.Dev.corners[0] ? DQ.Dev.corners[0].x + ',' + DQ.Dev.corners[0].y : '-', act: () => { const t = b.target.brk || b.target.plc; if (t) DQ.Dev.corners[0] = Object.assign({}, t); } },
        { label: 'Mark stamp corner B at the cursor', right: () => DQ.Dev.corners[1] ? DQ.Dev.corners[1].x + ',' + DQ.Dev.corners[1].y : '-', act: () => { const t = b.target.brk || b.target.plc; if (t) DQ.Dev.corners[1] = Object.assign({}, t); } },
        { label: 'Export the stamp (clipboard and download)', act: () => { const s = DQ.Dev.exportStamp(ctx); this.say(s ? 'Exported ' + s.size.join('x') : 'Mark both corners first'); } },
        { label: 'Place the last stamp at the cursor', act: () => { const t = b.target.plc || b.target.brk; if (t && DQ.Dev.stamp) this.say('Placed ' + DQ.Dev.importStamp(ctx, DQ.Dev.stamp, t.x, t.y, t.z) + ' cells'); else this.say('No stamp yet'); } },
        { label: 'Save a dev snapshot', act: () => { E.store.set('dqb-devsnap', DQ.Save.write(ctx).data); this.say('Snapshot saved'); } },
        { label: 'Load the dev snapshot', act: () => { const d = E.store.get('dqb-devsnap', null); if (d) { this.ui.close(); ctx.game.resume && ctx.game.resume(); ctx.game.go('play', { load: { data: d } }); } else this.say('No snapshot'); } },
        { label: 'Regenerate the world (a new game)', act: () => { this.ui.close(); ctx.game.resume && ctx.game.resume(); ctx.game.go('play', { fresh: true, skipIntro: true }); } }
      ];
    }
    return [];
  }
  update(dt) {
    super.update(dt); this.msgT -= dt; const I = this.game.input, L = this.items(), n = L.length;
    if (I.pressed('tabPrev') || I.pressed('hotPrev')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.focus = 0; this.scroll = 0; }
    if (I.pressed('tabNext') || I.pressed('hotNext')) { this.tab = (this.tab + 1) % TABS.length; this.focus = 0; this.scroll = 0; }
    if (I.pressed('cancel')) { this.ui.back(); return; }
    if (I.repeat('up')) this.focus = (this.focus + n - 1) % n; if (I.repeat('down')) this.focus = (this.focus + 1) % n;
    const ws = I.wheelSteps(); if (ws) this.focus = E.clamp(this.focus + ws, 0, n - 1);
    const h = this.hover(I); if (typeof h === 'number') this.focus = h;
    const c = this.click(I); if (typeof c === 'string' && c.startsWith('tab:')) { this.tab = +c.slice(4); this.focus = 0; this.scroll = 0; return; }
    if (typeof c === 'string' && c.startsWith('adj:')) { const [, i, d] = c.split(':'); const it = L[+i]; if (it && it.adjust) it.adjust(+d); return; }
    const it = L[this.focus];
    if (it && it.adjust && (I.repeat('left', .3, .06) || I.repeat('right', .3, .06))) it.adjust(I.repeat('left', .3, .06) ? -1 : 1);
    if (it && (I.pressed('confirm') || typeof c === 'number') && !it.disabled && it.act) { if (typeof c === 'number') this.focus = c; const q = L[this.focus]; if (q && q.act) { q.act(this); this.sfx('uiConfirm'); } }
    if (this.tab === 4 && it && it.key && I.pressed('place')) { DQ.tuning.reset(it.key); this.say(it.label + ' reset'); }
    this.scroll = E.clamp(this.scroll, Math.max(0, this.focus - 9), Math.min(this.focus, Math.max(0, n - 10)));
  }
  draw(g, W, H) {
    this.begin(); const ui = DQ.UI, L = this.items(), w = Math.min(W - 12, 420), h = H - 12, x = Math.round(W / 2 - w / 2), y = 6;
    ui.panel(g, x, y, w, h, { thread: '#6ae0ff' });
    E.font.title(g, 'Dev Tools', W / 2, y + 5, { scale: 2, colors: ['#bff0ff', '#6ae0ff'], outline: '#0a1a2a', align: 'center' });
    let tx = x + 8; TABS.forEach((t, i) => { const tw = E.font.width(t) + 8, sel = i === this.tab; px.rect(g, tx, y + 23, tw, 13, sel ? '#2a4a6a' : '#1a2238'); if (sel) ui.sel(g, tx, y + 23, tw, 13, this.t); ui.text(g, t, tx + 4, y + 26, sel ? '#ffd36a' : '#c8d8f0'); this.hit(tx, y + 23, tw, 13, 'tab:' + i); tx += tw + 3; });
    const rowH = 15, per = Math.floor((h - 64) / rowH);
    L.slice(this.scroll, this.scroll + per).forEach((it, k) => {
      const i = this.scroll + k, ry = y + 42 + k * rowH, sel = i === this.focus;
      if (sel) { px.rect(g, x + 6, ry - 2, w - 12, rowH - 1, '#24384e'); ui.sel(g, x + 6, ry - 2, w - 12, rowH - 1, this.t); }
      let lx = x + 12; if (it.icon) { const ic = DQ.Icons.get(it.icon, 10); if (ic) g.drawImage(ic, lx, ry); lx += 13; }
      DQ.Glyphs.text(g, this.game, it.label, lx, ry + 1, it.disabled ? '#5a6478' : sel ? '#ffd36a' : '#ffffff');
      if (it.right !== undefined) { const r = typeof it.right === 'function' ? it.right() : it.right, rw = E.font.width(r); ui.text(g, r, x + w - 24 - rw, ry + 1, '#bff0ff'); if (it.adjust) { ui.text(g, '←', x + w - 34 - rw, ry + 1, '#6a8aa8'); ui.text(g, '→', x + w - 18, ry + 1, '#6a8aa8'); this.hit(x + w - 38 - rw, ry - 2, 12, rowH - 1, 'adj:' + i + ':-1'); this.hit(x + w - 20, ry - 2, 14, rowH - 1, 'adj:' + i + ':1'); } }
      this.hit(x + 6, ry - 2, w - 70, rowH - 1, i);
    });
    if (this.tab === 4) { const it = L[this.focus]; if (it && it.key) { const d = DQ.tuning.def(it.key); ui.bar(g, x + 12, y + h - 30, w - 24, 6, (DQ.tuning.get(it.key) - d[2]) / (d[3] - d[2]), '#6ae0ff', '#0a1a2a'); } }
    DQ.Glyphs.text(g, this.game, this.msgT > 0 ? this.msg : '{btn:tabPrev}{btn:tabNext} Tabs  {btn:confirm} Use  ← → Adjust' + (this.tab === 4 ? '  {btn:place} Reset one' : '') + '  {btn:cancel} Back', x + 10, y + h - 16, this.msgT > 0 ? '#ffd36a' : '#c8d8f0');
  }
}
DQ.DevScreen = DevScreen;
})();
