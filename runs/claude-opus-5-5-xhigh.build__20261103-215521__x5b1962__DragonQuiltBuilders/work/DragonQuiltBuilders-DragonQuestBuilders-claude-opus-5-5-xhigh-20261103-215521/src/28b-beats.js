// Story beats: jump the story to a point (Dev Tools, tests, the attract town) with quests, flags, town level, rooms,
// residents, gear and notions all consistent.
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16;
const BEATS = ['start', 'banner', 'lv2', 'lv3', 'lv4', 'hall', 'ripper', 'spire', 'siege', 'boss', 'clear'];
const QDONE = { start: [], banner: ['M1', 'M2'], lv2: ['M1', 'M2', 'M3', 'M4'], lv3: ['M5', 'M6', 'M7'], lv4: ['M8', 'M9', 'S1'], hall: ['M10'], ripper: ['M11'], spire: [], siege: ['M12'], boss: ['M13'], clear: ['M14', 'S2', 'S3'] };
const LEVEL = { start: 1, banner: 1, lv2: 2, lv3: 3, lv4: 4, hall: 4, ripper: 4, spire: 4, siege: 4, boss: 4, clear: 5 };
DQ.Beats = {
  list: BEATS,
  names: { start: 'Start', banner: 'Banner planted', lv2: 'Town Lv 2', lv3: 'Town Lv 3', lv4: 'Town Lv 4', hall: 'Hall built', ripper: 'Seam Ripper', spire: 'At the Spire', siege: 'Siege', boss: 'Boss', clear: 'Chapter clear' },
  apply(ctx, beat) {
    const idx = BEATS.indexOf(beat); if (idx < 0) return false;
    ctx.quiet = true; try { return DQ.Beats._apply(ctx, beat, idx); } finally { ctx.quiet = false; }
  },
  _apply(ctx, beat, idx) {
    const b = ctx.builder, w = ctx.world, t = ctx.town, qs = ctx.quests, poi = ctx.poi;
    ctx.talk && ctx.talk.closeAll(); if (ctx.cutscene) { ctx.cutscene.script && ctx.cutscene.script.cancel(); ctx.cutscene = null; ctx.modal = null; }
    if (ctx.ui) ctx.ui.closeAll();
    const done = []; for (let i = 1; i <= idx; i++) done.push(...QDONE[BEATS[i]]);
    // the town
    if (idx >= 1 && !t.planted) { t.plant(poi.bannerSpot.x, poi.bannerSpot.y, poi.bannerSpot.L, { instant: true }); qs.setFlag('bannerPlanted'); }
    if (idx >= 1) { qs.setFlag('tunnelLit'); qs.setFlag('woke'); }
    const stage = idx >= 4 ? 'lv4' : idx >= 3 ? 'lv3' : idx >= 2 ? 'lv2' : null;
    if (stage && !ctx.flags['stamp_' + stage]) { const order = ['lv2', 'lv3', 'lv4']; for (const rm of DQ.WORLD.demoRooms) if (order.indexOf(rm.beat) <= order.indexOf(stage)) for (let y = rm.y; y < rm.y + rm.d; y++) for (let x = rm.x; x < rm.x + rm.w; x++) for (let z = 8; z < 13; z++) { const o = ctx.objects.at(x, y, z); if (o && !o.def.banner && !o.def.portal) ctx.objects.remove(o, { silent: true }); }
      const objs = DQ.stampTownRooms(w, [], stage); for (const o of objs) if (!ctx.objects.at(o.x, o.y, o.z)) ctx.objects.add(o.id, o.x, o.y, o.z, o.facing, { silent: true }); ctx.flags['stamp_' + stage] = true; }
    if (LEVEL[beat] > t.level) t.setLevel(LEVEL[beat]);
    // residents
    const who = ['wren']; if (idx >= 2) who.push('mortimer'); if (idx >= 3) who.push('marigold'); if (idx >= 4) who.push('professor', 'lintwick');
    if (idx >= 1) for (const id of who) if (!ctx.npcs.get(id)) { const k = who.indexOf(id); ctx.npcs.add(id, t.x - 2 + k, t.y + 2, t.L); }
    t.arrivals = t.arrivals.filter(a => !who.includes(a));
    // a Town Chest with building stock, and the Hall
    if (idx >= 5 && !ctx.flags.hallPlaced) {
      const def = DQ.WORLD.patterns.hall, x0 = poi.hallSite.x - 1, y0 = poi.hallSite.y - 6;
      for (let y = y0 - 1; y <= y0 + 9; y++) for (let x = x0 - 1; x <= x0 + 11; x++) { for (let z = t.L; z < t.L + 5; z++) { w.set(x, y, z, 0, { silent: true }); const o = ctx.objects.at(x, y, z); if (o) ctx.objects.remove(o, { silent: true }); } if (!DQ.SOLID[w.get(x, y, t.L - 1)]) w.set(x, y, t.L - 1, DQ.blockId('planks'), { silent: true }); }
      const p = t.placePattern(def, x0, y0, t.L, 0, { silent: true });
      for (const c of p.cells) { if (c.block) w.set(c.x, c.y, c.z, c.block, { silent: true, town: true }); else if (!ctx.objects.at(c.x, c.y, c.z)) ctx.objects.add(c.obj, c.x, c.y, c.z, c.facing, { silent: true }); }
      t.checkPattern(p); ctx.flags.hallPlaced = true;
    }
    if (idx >= 2 && !t.townChest()) { const ch = ctx.objects.list.find(o => o.def.chest && t.inside(o.x, o.y)); if (ch) { t.setTownChest(ch); ctx.flags.townChest = true; ch.data.store.add('planks', 30); ch.data.store.add('cobble', 20); } }
    // quests
    for (const id of done) { const s = qs.s[id]; if (s.status !== 'done') { s.status = 'active'; s.step = DQ.QUESTS[id].steps.length; qs.complete(id, { quiet: true }); } }
    // gear and stock
    b.bag.add('branch', 10); b.bag.add('earth', 20); b.bag.add('torch', 4);
    if (idx >= 3) { b.bag.add('cobbleClub', 1); b.equipItem('cobbleClub'); }
    if (idx >= 5) { b.bag.add('copperBodkin', 1); b.equipItem('copperBodkin'); b.bag.add('copperIngot', 4); b.bag.add('steelThread', 4); b.bag.add('log', 6); b.bag.add('pins', 6); b.bag.add('planks', 20); }
    if (idx >= 6) { b.bag.remove('goldenNeedle', 1); b.bag.add('seamRipper', 1); b.equipItem('seamRipper'); ctx.flags.boss_buttonGolem = true; }
    while (b.bag.count('heartpatch') > 0) { b.bag.remove('heartpatch', 1); b.heartpatches++; } { const j = b.bag.hotbar.indexOf('heartpatch'); if (j >= 0) b.bag.hotbar[j] = null; } b.hp = b.maxHp; b.belly = 100;
    b.bag.add('bun', 3); if (idx >= 1) b.bag.remove('banner', b.bag.count('banner')); if (idx >= 5) b.bag.remove('hallPattern', b.bag.count('hallPattern'));
    if (idx >= 2) for (const r of DQ.RECIPES) { const n = r.notion; if ((n.on === 'level' && n.key <= t.level) || n.on === 'pickup' || n.on === 'placed' || (n.on === 'flag') || (n.on === 'quest' && (done.includes(n.key) || done.includes(String(n.key).replace('start', ''))))) ctx.crafting.learn(r.id, { silent: true }); }
    if (idx >= 1) { ctx.crafting.learn('bench', { silent: true }); ctx.crafting.learn('latticeDoor', { silent: true }); ctx.crafting.learn('torch', { silent: true }); }
    for (const p of DQ.WORLD.portals) if (idx >= 2 || p.id === 'town' || p.id === 'hollow') ctx.flags['portal_' + p.id] = true;
    // where the builder stands
    if (beat === 'start') b.teleportCell(poi.hollowStart.x, poi.hollowStart.y, poi.hollowStart.L);
    else if (beat === 'spire') { qs.s.M12.status === 'locked' && qs.start('M12', { quiet: true }); b.teleportCell(96, 113, 9); }
    else b.teleportCell(t.x + 1, t.y + 3, w.topZ(t.x + 1, t.y + 3));
    if (beat === 'siege') { if (qs.s.M13.status !== 'active') qs.start('M13', { quiet: true }); qs.s.M13.step = 1; for (const [dx, dy] of [[6, 0], [0, 6]]) { const x = t.x + dx, y = t.y + dy, L = w.topZ(x, y); if (!ctx.objects.at(x, y, L)) ctx.objects.add('ballista', x, y, L, dx ? 0 : 1, { silent: true }); } b.bag.add('ballista', 1); b.bag.add('pinTrap', 4); }
    if (beat === 'boss') { qs.s.M14.status === 'locked' && qs.start('M14', { quiet: true }); ctx.flags.siegeDone = true; ctx.flags.siegeStarted = true; for (const [dx, dy] of [[6, 0], [0, 6], [-6, 0]]) { const x = t.x + dx, y = t.y + dy, L = w.topZ(x, y); if (!ctx.objects.at(x, y, L)) ctx.objects.add('ballista', x, y, L, dx > 0 ? 0 : dx < 0 ? 2 : 1, { silent: true }); } ctx.siege.active = true; ctx.siege.phase = 'boss'; if (!ctx.bosses.list.some(m => m.kind === 'gnarlgrim' && !m.dead)) ctx.bosses.spawnGnarlgrim(); }
    if (beat === 'clear') { DQ.Beats.stitchRift(ctx, 4); ctx.flags.chapterClear = true; ctx.flags.bossDone = true; ctx.flags.siegeDone = true; ctx.flags.boss_gnarlgrim = true; if (t.level < 5) t.setLevel(5); }
    ctx.clock.setHour(beat === 'siege' ? 15 : 9);
    ctx.rooms.timer = 0; ctx.rooms.detect(); qs.dirty = true;
    DQ.game.cam.snap = true;
    ctx.events.emit('beat', { beat });
    return true;
  },
  /** the finale's wave of stitches: the Rift becomes meadow, ring by ring */
  stitchRift(ctx, r) {
    const w = ctx.world, cx = 96, cy = 80;
    for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 6; x <= cx + 6; x++) {
      const d = Math.hypot(x - cx, y - cy); if (d > r + .6 || d > 5.2) continue;
      if (w.topZ(x, y) && w.get(x, y, w.topZ(x, y) - 1) !== DQ.blockId('frayedTurf')) continue;
      w.set(x, y, 0, DQ.BACKING, { silent: true }); for (let z = 1; z < 9; z++) w.set(x, y, z, z === 8 ? DQ.blockId('grass') : z >= 5 ? DQ.blockId('earth') : DQ.blockId('stone'), { silent: true }); for (let z = 9; z < w.H; z++) if (w.get(x, y, z)) w.set(x, y, z, 0, { silent: true });
    }
    ctx.flags.riftHealed = r >= 4;
  }
};
})();
