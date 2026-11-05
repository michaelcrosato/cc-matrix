// Scenes and the play context: building a play session (story, attract, Bee) from the systems, its update and draw
// order, and the scenes: title, newgame, intro, play, results, credits, about.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const F = (g, s, x, y, c, o) => E.font.text(g, DQ.safe(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#05040a' }, o || {}));
const FW = (s, o) => E.font.width(DQ.safe(s), o);
const Play = DQ.Play = {};
/** a new play context with its world and every system. o: { mode: 'story' | 'attract' | 'bee', def, seed, name, look, demo } */
Play.make = (game, o = {}) => {
  const mode = o.mode || 'story', def = o.def || DQ.WORLD, ctx = DQ.newCtx(game, mode, { seed: def.seed, dev: o.dev });
  ctx.def = def;
  const w = ctx.world = new DQ.VoxelWorld(def.W, def.D, def.H, { events: ctx.events, ctx });
  const gen = o.gen ? o.gen(w) : DQ.generateWorld(w, def);
  ctx.poi = gen.poi;
  ctx.render = new DQ.VoxelRenderer(w);
  ctx.nav = new DQ.Nav(w);
  ctx.objects = new DQ.Objects(ctx); for (const ob of gen.objects) ctx.objects.add(ob.id, ob.x, ob.y, ob.z, ob.facing, { silent: true, portal: ob.portal });
  w.snapshotBase(); ctx.baseObjects = gen.objects;
  ctx.crafting = new DQ.Crafting(ctx); ctx.rooms = new DQ.Rooms(ctx); ctx.town = new DQ.Town(ctx); ctx.npcs = new DQ.Residents(ctx); ctx.monsters = new DQ.Monsters(ctx);
  ctx.combat = new DQ.Combat(ctx); ctx.drops = new DQ.Drops(ctx); ctx.clock = new DQ.Clock(ctx); ctx.quests = new DQ.Quests(ctx); ctx.hud = new DQ.Hud(ctx); ctx.ui = new DQ.UI(ctx); ctx.talk = new DQ.Talk(ctx);
  ctx.siege = new DQ.Siege(ctx, o.siege || {}); ctx.bosses = new DQ.Bosses(ctx); ctx.ballista = new DQ.BallistaCtl(ctx);
  ctx.explored = new Uint8Array(def.W * def.D);
  const sp = o.spawn || (gen.poi.hollowStart ? [gen.poi.hollowStart.x, gen.poi.hollowStart.y, gen.poi.hollowStart.L] : [def.W >> 1, def.D >> 1, w.topZ(def.W >> 1, def.D >> 1)]);
  ctx.spawnPoint = [sp[0] * T + 8, sp[1] * T + 8, sp[2] * T];
  const b = ctx.builder = new DQ.Builder(ctx, { name: o.name, look: o.look, x: ctx.spawnPoint[0], y: ctx.spawnPoint[1], z: ctx.spawnPoint[2] });
  b.bag.add('darningStick', 1); b.applyEquipLook();
  ctx.builders = [b];
  Play.wire(ctx); ctx.quests.wire();
  if (mode === 'story' && !o.noButtons) ctx.bosses.placeButtonsworth();
  if (mode === 'story') { ctx.monsters.spawn('dyedLintling', 113, 30, undefined, { fixed: true }); ctx.monsters.spawn('dyedLintling', 119, 29, undefined, { fixed: true }); ctx.monsters.spawn('dyedLintling', 116, 33, undefined, { fixed: true }); ctx.monsters.spawn('frayedKnight', 95, 111, 9, { fixed: true }); ctx.monsters.spawn('frayedKnight', 95, 116, 9, { fixed: true }); ctx.monsters.spawn('pinhog', 30, 18, undefined, { fixed: true }); }
  ctx.say = (who, lines, oo) => ctx.talk.say(who, lines, oo);
  ctx.interact = bb => { if (bb.mounted) return; const r = DQ.Interact.find(ctx, bb); if (r) r.act(); };
  ctx.interactLabel = bb => { if (ctx._ilT === DQ.game.real && ctx._ilB === bb) return ctx._il; const r = DQ.Interact.find(ctx, bb); ctx._ilT = DQ.game.real; ctx._ilB = bb; ctx._il = r ? r.label : null; return ctx._il; };
  ctx.useKey = (bb, id) => Play.useKey(ctx, bb, id);
  ctx.pickActor = (sx, sy) => { const r = DQ.game.r; if (!r) return null; const p = r.pick(sx, sy); return p.find(q => q && q.kind === 'npc') || null; };
  ctx.onKO = bb => Play.onKO(ctx, bb);
  return ctx;
};
/** the event wiring: rooms, Patterns, Cheer, levels, arrivals, notions */
Play.wire = ctx => {
  const ev = ctx.events;
  const edit = e => { ctx.rooms.dirty(e.x, e.y); ctx.town.markDirty(e.x, e.y); };
  for (const n of ['blockPlaced', 'blockBroken', 'objectPlaced', 'objectRemoved']) ev.on(n, edit);
  ev.on('roomFormed', e => {
    const r = e.room; if (!r.inTown) return; const def = DQ.ROOM[r.type];
    if (e.cheer) ctx.town.addCheer(e.cheer, 'room');
    const [cx, cy] = r.center, z = r.L * T + 34;
    ctx.hud.banner('ROOM COMPLETE!', def.name + (e.cheer ? '  +' + Math.round(e.cheer * DQ.tune('cheerMul')) + ' Cheer' : '')); ctx.hud.label(def.name, cx * T + 8, cy * T + 8, z);
    DQ.AudioX && DQ.AudioX.jingle('room');
    for (let i = 0; i < 24; i++) DQ.game.particles.add({ kind: 'bit', x: cx * T + 8 + (Math.random() - .5) * 30, y: cy * T + 8 + (Math.random() - .5) * 30, z: z + 10, vx: (Math.random() - .5) * 40, vy: (Math.random() - .5) * 40, vz: 40 + Math.random() * 40, g: 120, drag: 1.5, max: 2, size: 2, color: ['#d04a4a', '#4a6ad0', '#e8c040', '#5aa04a', '#f1e6c8'][i % 5] });
    for (const n of ctx.npcs.list) if (Math.hypot(n.x - cx * T, n.y - cy * T) < 12 * T) { n.anim = { kind: 'cheer', t: 0, dur: 1.5 }; if (n.id === 'wren' || n.id === 'marigold') n.say(r.type === 'kitchen' ? 'A KITCHEN!' : r.type === 'bedroom' ? 'A BED ROOM!' : 'Wow!', 2); }
    ctx.builder.anim = ctx.builder.anim || { kind: 'cheer', t: 0, dur: .9 };
  });
  ev.on('townLevel', e => {
    if (e.quiet) return; const L = DQ.LEVELS[e.level];
    ctx.hud.popup('level', 'Thimbleton is now Level ' + e.level + '!', 'New: ' + L.unlocks.join(', ') + '.');
    DQ.game.particles.ring(ctx.town.x * T + 8, ctx.town.y * T + 8, 4, L.r * T, '#ffe070', 1, ctx.town.L * T + 1);
    for (let i = 0; i < 30; i++) DQ.game.particles.add({ kind: 'bit', x: ctx.town.x * T + 8, y: ctx.town.y * T + 8, z: ctx.town.L * T + 40, vx: (Math.random() - .5) * 120, vy: (Math.random() - .5) * 120, vz: 80 + Math.random() * 60, g: 160, drag: 1, max: 2.2, size: 2, color: ['#d04a4a', '#4a6ad0', '#e8c040', '#5aa04a'][i % 4] });
    if (ctx.mode === 'story' && e.level === 2) ctx.say('granny', DQ.LINES.levelUp, { auto: 2.6, modal: false });
    if (DQ.AudioX) DQ.AudioX.townLayers(e.level);
  });
  ev.on('npcArrived', e => { if (ctx.mode === 'story') DQ.Cutscenes.play(ctx, 'arrival', { id: e.id }); });
  ev.on('bannerPlanted', () => { if (ctx.mode === 'story' && !DQ.TEST.skipCutscenes) DQ.Cutscenes.play(ctx, 'plant'); else DQ.Cutscenes.end(ctx, 'plant'); });
  ev.on('timeOfDay', e => { if (e.phase === 'night' && ctx.mode === 'story') { DQ.AudioX && DQ.AudioX.jingle('night'); if (!ctx.flags.firstNight) { ctx.flags.firstNight = true; ctx.say('granny', DQ.LINES.firstNight, { auto: 3, modal: false }); } } if (e.phase === 'dawn' && ctx.mode === 'story') DQ.AudioX && DQ.AudioX.jingle('morning'); });
  ev.on('objectBroken', e => { if (e.id === 'cage') { ctx.quests.setFlag('lintwickFreed'); const n = ctx.npcs.add('lintwick', e.x, e.y + 1, e.z); n.follow = true; DQ.AudioX && DQ.AudioX.jingle('arrive'); ctx.say('lintwick', ['FREE! Lintwick free! Lintwick follow Builder home now. Lintwick very fast. Lintwick very fluffy.'], { name: 'Lintwick' }); } });
  ev.on('questDone', e => { if (e.id === 'S1') { const n = ctx.npcs.get('lintwick'); if (n) n.follow = false; } if (ctx.save && ctx.mode === 'story') ctx.save.autosave('quest'); });
  ev.on('questStep', e => { if (e.id === 'S1' && ctx.quests.s.S1.step === 2) { const n = ctx.npcs.get('lintwick'); if (n) { n.follow = false; ctx.npcs.arriveText = true; ctx.hud.popup('arrive', DQ.NPCS.lintwick.arrive, 'He wants a Bedroom with Felt in its walls.'); } } });
  ev.on('chapterClear', () => { if (ctx.mode === 'story') DQ.game.after(1.5, () => DQ.game.go('results', { ctx })); });
  ev.on('builderRespawn', () => { DQ.game.cam.snap = true; });
};
Play.useKey = (ctx, b, id) => {
  const t = ctx.town, poi = ctx.poi;
  if (id === 'banner') {
    if (t.planted) return; const p = poi.bannerSpot;
    if (Math.hypot(b.x - (p.x * T + 8), b.y - (p.y * T + 8)) > 4.5 * T) { ctx.hud.toast('Plant it on the old plaza of Thimbleton!', 'banner', 'plant'); return; }
    b.bag.remove('banner', 1); b.anim = { kind: 'plant', t: 0, dur: 1, lock: true }; DQ.sfx('plunge'); t.plant(p.x, p.y, p.L); return;
  }
  if (id === 'hallPattern') {
    if (!t.planted) return; if (t.placing) return;
    t.placing = { def: DQ.WORLD.patterns.hall, rot: 0, id }; ctx.hud.toast('Choose a spot inside the town.', id); return;
  }
  ctx.hud.toast(DQ.ITEMS[id].name + ': ' + (DQ.ITEMS[id].desc || ''), id);
};
Play.onKO = (ctx, b) => {
  if (ctx.mode !== 'story') { b.respawn(); return; }
  DQ.AudioX && DQ.AudioX.jingle('undone');
  if (ctx.siege && ctx.siege.active && ctx.siege.phase === 'boss') { ctx.siege.fail('ko'); b.respawn(); return; }
  const diff = DQ.game.settings.difficulty || 'Normal';
  if (diff !== 'Relaxed') {
    const m = b.bag.materials(), items = {}; let n = 0; for (const k in m) { const h = Math.floor(m[k] / 2); if (h > 0) { items[k] = h; b.bag.remove(k, h); n += h; } }
    if (n) { const old = ctx.objects.find('lostBundle'); if (old) { for (const k in old.data.items) items[k] = (items[k] || 0) + old.data.items[k]; ctx.objects.remove(old, { silent: true }); } let x = b.cx, y = b.cy, L = b.L; if (!ctx.nav.standable(x, y, L) && b.body.lastSafe) { x = Math.floor(b.body.lastSafe[0] / T); y = Math.floor(b.body.lastSafe[1] / T); L = Math.floor(b.body.lastSafe[2] / T); } const ob = ctx.objects.add('lostBundle', x, y, L, 1, { silent: true, data: { items } }); if (ob) ctx.flags.lostBundle = [x, y, L]; }
  }
  ctx.fade = { t: 0, to: 1 }; DQ.game.after(.5, () => { b.respawn(); ctx.fade = { t: 0, to: 0 }; if (ctx.flags.lostBundle) ctx.hud.toast('Your Lost Bundle waits where you came undone (see the Map).', 'lostBundle'); });
};
/** one step of a play session */
Play.update = (ctx, dt, o = {}) => {
  const G = DQ.game, b = ctx.builder, I = G.input; ctx.stats.time += dt;
  if (ctx.cutscene) DQ.Cutscenes.update(ctx, dt);
  if (o.ai && o.ai.autoTalk) o.ai.readTalk();
  const talking = ctx.talk.update(dt, I);
  const ui = !talking && ctx.ui.update(dt);
  const modal = talking || ui || !!ctx.cutscene;
  ctx.modal = ctx.cutscene ? 'cutscene' : talking ? 'talk' : ui ? 'ui' : null;
  // the builder's intent
  let intent = DQ.Controls.blank();
  if (!modal && b && !o.noInput) {
    intent = o.intent ? o.intent(dt) : DQ.Controls.intent(G, ctx, dt);
    if (!o.intent) {
      if (I.pressed('satchel')) { DQ.Menus.openSatchel(ctx, 0); intent = DQ.Controls.blank(); }
      else if (I.pressed('map')) { DQ.Menus.openSatchel(ctx, 1); intent = DQ.Controls.blank(); }
      else if (I.pressed('journal')) { DQ.Menus.openSatchel(ctx, 2); intent = DQ.Controls.blank(); }
    }
    if (ctx.town.placing) Play.placing(ctx, intent);
    Play.camera(ctx, intent);
  }
  const ts = ctx.dev.timeScale === undefined ? 1 : ctx.dev.timeScale; let dtw = dt * ts; if (ts === 0 && ctx.dev.stepOnce) { dtw = DQ.game.o.step; ctx.dev.stepOnce = false; }
  if (b) { if (b.mounted && !modal) ctx.ballista.update(b, dtw, intent); b.update(dtw, modal ? DQ.Controls.blank() : intent); }
  for (const ob of ctx.builders) if (ob !== b && ob.update && !ob.remote) ob.update(dtw, ob.ai ? ob.ai.intent(dtw) : DQ.Controls.blank());
  for (const ob of ctx.builders) if (ob.remote && ob.netUpdate) ob.netUpdate(dtw);
  ctx.objects.update(dtw);
  ctx.npcs.update(dtw);
  if (!ctx.cutscene || ctx.cutscene.name !== 'sleep') ctx.monsters.update(dtw);
  ctx.bosses.update(dtw); DQ.updateRings(ctx, dtw);
  ctx.combat.update(dtw); ctx.drops.update(dtw);
  ctx.world.healDamage(G.time);
  ctx.rooms.update(dtw); ctx.town.update(dtw);
  ctx.quests.update(dtw);
  if (!modal || ctx.modal === 'talk') ctx.clock.update(dtw); else ctx.clock.applyLight();
  ctx.siege.update(dtw);
  ctx.hud.update(dt);
  Play.cutaway(ctx, dt);
  Play.explore(ctx, dt);
  // the camera follows the builder (or a cutscene's focus)
  const f = ctx.camFocus || (b ? { x: b.x + Math.cos(b.facing) * 10, y: b.y + Math.sin(b.facing) * 10, z: b.z + 14 } : null);
  if (f) G.focus(f.x, f.y, f.z);
  if (ctx.fade) ctx.fade.t += dt;
};
/** camera turn (90-degree steps with a crossfade), zoom steps, reset */
Play.camera = (ctx, intent) => {
  const G = DQ.game;
  if (intent.camTurn) { G.rotateView(intent.camTurn * 90); DQ.sfx('whoosh', { vol: .2 }); if (!G.reduceMotion) ctx.turnFade = .18; }
  const zs = DQ.ZOOMS[G.baseView.id] || DQ.ZOOMS.iso;
  if (intent.zoom) { ctx.zoomI = E.clamp((ctx.zoomI === undefined ? 1 : ctx.zoomI) + intent.zoom, 0, zs.length - 1); G.setZoom(zs[ctx.zoomI]); DQ.store.set('zoom', ctx.zoomI); }
  if (intent.camReset) { G.resetCamera(); ctx.zoomI = 1; G.setZoom(zs[1]); }
};
/** laying out a Pattern: the ghost follows the cursor; turn, confirm, cancel */
Play.placing = (ctx, intent) => {
  const t = ctx.town, pl = t.placing, b = ctx.builder, c = b.cursor;
  if (intent.hotStep) { pl.rot = (pl.rot + (intent.hotStep > 0 ? 1 : 3)) % 4; DQ.sfx('uiMove'); intent.hotStep = 0; }
  const [fw, fd] = t.footprint(pl.def, pl.rot), at = c.plc || [b.cx + 2, b.cy, b.L];
  pl.x0 = at[0] - (fw >> 1); pl.y0 = at[1] - (fd >> 1); pl.L = ctx.world.topZ(at[0], at[1]);
  pl.why = t.canPlacePattern(pl.def, pl.x0, pl.y0, pl.L, pl.rot);
  pl.cells = t.layout(pl.def, pl.x0, pl.y0, pl.L, pl.rot); t.syncGhosts();
  if (intent.place) { intent.place = false; if (pl.why) { DQ.sfx('uiCancel'); ctx.hud.toast(pl.why, null, 'why'); } else { t.placing = null; t.placePattern(pl.def, pl.x0, pl.y0, pl.L, pl.rot); b.bag.remove(pl.id, 1); ctx.quests.setFlag('hallPlaced'); DQ.sfx('stitch'); ctx.hud.toast('The Pattern is laid out! Fill in the ghost blocks.', pl.id); } b.placeCd = .4; }
  if (intent.interact) { intent.interact = false; t.placing = null; t.syncGhosts(); DQ.sfx('uiCancel'); }
};
/** the cutaway: roofs, canopies and tunnels around the hero open up; eased, with hysteresis */
Play.cutaway = (ctx, dt) => {
  const R = ctx.render, b = ctx.builder, w = ctx.world, mode = ctx.dev.cutaway !== 'auto' ? ctx.dev.cutaway : (DQ.game.settings.cutaway || 'Auto').toLowerCase(); if (!b || !R) return;
  const L = b.L, v = DQ.game.view, fl = Math.hypot(v.fx, v.fy) || 1, ux = v.fx / fl, uy = v.fy / fl, fx = Math.round(v.fx), fy = Math.round(v.fy);
  const A = R.A || DQ.atlasFor(v), zh = A.zh || 20, ds = A.dstep || 16, step = Math.hypot(fx, fy) || 1;
  let roof = mode === 'always', slot = mode === 'always', len = 6;
  if (mode === 'auto') {
    // a roof, canopy or tunnel over the hero
    outer: for (const [x, y] of [[b.cx, b.cy], [b.cx + fx, b.cy], [b.cx, b.cy + fy]]) for (let z = L + 2; z <= L + 6; z++) if (DQ.OPAQUE[w.get(x, y, z)]) { roof = true; break outer; }
    // anything between the hero and the camera tall enough to hide him
    for (let k = 1; k <= 16; k++) for (const [ox, oy] of [[0, 0], [fx, 0], [0, fy]]) {
      const x = b.cx + k * fx + ox, y = b.cy + k * fy + oy, t = w.topZ(x, y), kk = k + (ox || oy ? .5 : 0);
      if (t - 1 >= L + 2 && t - 1 >= L + kk * ds / zh) { slot = true; len = Math.max(len, (kk + 1.5) * step); }
    }
  }
  const c = R.cut || (R.cut = { L: L + 2, x: b.cx + .5, y: b.cy + .5, rad: 0, hold: 0, slotW: 0, slotHold: 0, slotLen: 6, fx: ux, fy: uy });
  if (roof) c.hold = .5; else c.hold -= dt;
  if (slot) { c.slotHold = .5; c.slotLen = len; } else c.slotHold -= dt;
  if (roof || slot) c.L = L + 2;
  const off = mode === 'off';
  c.rad = E.approach(c.rad, !off && c.hold > 0 ? 6.5 : 0, dt * 6.5 / .2);
  c.slotW = E.approach(c.slotW, !off && c.slotHold > 0 ? 3.2 : 0, dt * 3.2 / .2);
  c.x = b.x / T; c.y = b.y / T; c.fx = ux; c.fy = uy;
};
Play.explore = (ctx, dt) => { ctx._exT = (ctx._exT || 0) - dt; if (ctx._exT > 0) return; ctx._exT = .5; const b = ctx.builder, w = ctx.world; if (!b) return; for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) { const x = b.cx + dx, y = b.cy + dy; if (x >= 0 && y >= 0 && x < w.W && y < w.D && dx * dx + dy * dy <= 100) ctx.explored[y * w.W + x] = 1; } };
/** draw a play session */
Play.draw = (ctx, r, o = {}) => {
  const G = DQ.game, clock = ctx.clock; DQ.lastIX = r.ix; DQ.lastIY = r.iy;
  // the void: deep navy, drifting lint motes, stars at night, a faint stitched grid
  r.sky(['#06051a', '#0d0b2a', '#141238']);
  r.overlay; const g0 = r.ctx, t = G.real;
  for (let i = 0; i < 40; i++) { const x = (DQ.h01(i, 1) * r.W + t * (4 + DQ.h01(i, 2) * 6)) % r.W, y = (DQ.h01(i, 3) * r.H + Math.sin(t * .5 + i) * 6 + r.H) % r.H; px.dot(g0, Math.round(x), Math.round(y), clock && clock.isNight && i % 3 === 0 ? '#ffffff' : '#3a3668'); }
  if (ctx.flags.frayvernSky) Play.frayvern(g0, r, t);
  ctx.render.queue(r);
  ctx.objects.draw(r); ctx.town.draw(r); ctx.drops.draw(r);
  for (const b of ctx.builders) b.draw(r, {});
  ctx.npcs.draw(r); ctx.monsters.draw(r); DQ.drawBossExtras(ctx, r); DQ.drawRings(ctx, r);
  ctx.combat.draw(r);
  // glow blocks light the scene
  Play.blockLights(ctx, r);
  if (ctx.builder && ctx.builder.mounted) { const o2 = ctx.builder.mounted; r.decal(() => { const a = o2.data.aim; r.groundArc(o2.x * T + 8, o2.y * T + 8, 12, 160, a - .04, a + .04, '#ffe070', .35, o2.z * T + 1); }); }
  G.particles.ground = (x, y, z) => { const gz = ctx.world.groundAt(x, y, 1, z + 4, 4); return isFinite(gz) ? gz : -64; };
  // fades: the camera turn crossfade, sleep and KO fades
  r.overlay(g => {
    if (ctx.turnFade > 0) { ctx.turnFade -= 1 / 60; px.blend(g, Math.max(0, ctx.turnFade / .18) * .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06051a')); }
    if (ctx.fade) { const k = ctx.fade.to ? Math.min(1, ctx.fade.t / .5) : Math.max(0, 1 - ctx.fade.t / .5); if (k > 0) px.blend(g, k, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000')); else if (!ctx.fade.to) ctx.fade = null; }
    if (ctx.flags.dark) px.rect(g, -2, -2, r.W + 4, r.H + 4, '#000000');
  });
  if (!o.noHud) { ctx.hud.draw(r); ctx.talk.draw(r); ctx.ui.draw(r); }
  if (ctx.dev && ctx.dev.overlays && DQ.Dev) DQ.Dev.drawOverlays(ctx, r);
};
Play.blockLights = (ctx, r) => {
  const R = ctx.render, [x0, y0, x1, y1] = R.visibleCols(r); let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = R.col(x, y); for (const z of c.light) { if (n++ > 40) return; DQ.game.lights.add(x * T + 8, y * T + 8, z * T + 10, 48, .9, { color: '#fff0b0' }); } }
};
Play.frayvern = (g, r, t) => { const cx = r.W * .5 + Math.sin(t * .3) * 30, cy = r.H * .25, s = 1 + Math.sin(t * 2) * .05; px.blend(g, .8, 'normal', () => { px.poly(g, [[cx - 140 * s, cy + 10], [cx - 40, cy - 30], [cx - 10, cy - 60], [cx, cy - 40], [cx + 10, cy - 60], [cx + 40, cy - 30], [cx + 140 * s, cy + 10], [cx + 50, cy + 5], [cx, cy + 50], [cx - 50, cy + 5]], '#1a0a24'); }); px.dot(g, Math.round(cx - 5), Math.round(cy - 42), '#ff40c0'); px.dot(g, Math.round(cx + 5), Math.round(cy - 42), '#ff40c0'); };

// ================================================================ scenes
const S = DQ.SCENES = DQ.SCENES || {};
/** a vertical list menu for the title and other full screens (keys, pad, mouse hover and click) */
class ListMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.rects = []; this._hp = null; }
  update(I) {
    const en = this.items.map(it => !it.disabled);
    const mv = d => { let k = this.i; for (let n = 0; n < this.items.length; n++) { k = (k + d + this.items.length) % this.items.length; if (en[k]) { this.i = k; break; } } DQ.sfx('uiMove'); };
    if (I.repeat('up', .3, .1)) mv(-1); if (I.repeat('down', .3, .1)) mv(1);
    const p = I.lastDevice === 'mouse' && I.pointer ? I.pointer() : null, moved = p && (!this._hp || p[0] !== this._hp[0] || p[1] !== this._hp[1]); this._hp = p ? p.slice() : null;
    if (moved) this.rects.forEach((q, k) => { if (p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3] && en[k] && this.i !== k) { this.i = k; DQ.sfx('uiMove'); } });
    const c = I.clicked ? I.clicked() : null; if (c) this.rects.forEach((q, k) => { if (c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3] && en[k]) { this.i = k; this.pick(); } });
    if (I.pressed('ok') || I.pressed('start')) this.pick();
  }
  pick() { const it = this.items[this.i]; if (it && !it.disabled && it.act) { DQ.sfx('uiConfirm'); it.act(); } }
  draw(g, cx, y, o = {}) {
    this.rects = []; const w = o.w || 150, lh = o.lh || 16;
    this.items.forEach((it, k) => { const sel = k === this.i, yy = y + k * lh, x = Math.round(cx - w / 2); if (sel) DQ.Hud.panel(g, x, yy - 3, w, lh - 1, { gold: true }); F(g, it.label, cx - FW(it.label) / 2, yy, it.disabled ? '#6a6488' : sel ? '#ffe070' : '#ffffff'); if (sel) F(g, '▸', x + 6 + (Math.floor(DQ.game.real * 4) % 2), yy, '#ffe070'); this.rects.push([x, yy - 3, w, lh - 1]); });
  }
}
DQ.ListMenu = ListMenu;
/** the title's diorama: the finished Thimbleton at dusk (shared with the attract mode) */
DQ.demoCtx = () => {
  if (DQ._demo) return DQ._demo;
  const game = DQ.game, ctx = Play.make(game, { mode: 'attract', noButtons: true });
  DQ.Beats.apply(ctx, 'lv4'); ctx.flags.woke = true; ctx.quests.s.M1.status = 'done';
  ctx.clock.setHour(18.2); ctx.clock.frozen = true; ctx.monsters.enabled = false; ctx.mode = 'attract';
  DQ._demo = ctx; return ctx;
};
S.title = {
  touch: [],
  enter() {
    const G = DQ.game; G.setView(G.settings.camView === 'Three-quarter' ? 'threequarter' : 'iso'); G.resetCamera(); G.setZoom(1);
    this.ctx = DQ.demoCtx(); this.idle = 0; this.t = 0; this.camA = 0; this.touchOnly = DQ.touchOnly();
    const has = !!(G.saves && G.saves.latest && G.saves.latest());
    this.menu = new ListMenu([
      { label: 'Continue', disabled: !has, act: () => { const s = G.saves.latest(); if (s) G.saves.load(s.slot); } },
      { label: 'New Game', act: () => G.go('newgame') },
      { label: 'Load Game', disabled: !has, act: () => G.saves.show('load') },
      { label: 'Quilting Bee', act: () => G.go('bee', { solo: true }) },
      { label: 'Settings', act: () => G.menu('settings') },
      { label: 'About & Credits', act: () => G.go('about', { back: 'title' }) }
    ]);
    if (!has) this.menu.i = 1;
    DQ.AudioX && DQ.AudioX.music('title');
    G.input.use(DQ.Controls.PLAY);
  },
  update(dt) {
    const G = DQ.game, I = G.input; this.t += dt; this.camA += dt * .06;
    const ctx = this.ctx, t = ctx.town; G.focus(t.x * T + 8 + Math.cos(this.camA) * 90, t.y * T + 8 + Math.sin(this.camA) * 60, t.L * T + 10);
    ctx.npcs.update(dt); ctx.objects.update(dt); ctx.clock.applyLight();
    const busy = G.shell && G.shell.screen;
    if (DQ.Attract.anyInput(G)) this.idle = 0; else if (!busy) this.idle += dt;
    if (this.idle >= 10 && !busy) { G.go('attract'); return; }
    if (this.touchOnly) { this.touchOnly = DQ.touchOnly(); return; }
    if (!busy) this.menu.update(I);
  },
  draw(r) {
    const ctx = this.ctx; Play.draw(ctx, r, { noHud: true });
    r.overlay(g => {
      const W = r.W, H = r.H;
      DQ.Title.logo(g, W / 2, Math.round(H * .14), this.t);
      if (this.touchOnly) { const w = 240; DQ.Hud.panel(g, (W - w) / 2, H * .55, w, 40, { gold: true }); F(g, 'Controller or keyboard required', W / 2 - FW('Controller or keyboard required') / 2, H * .55 + 9, '#ffe070'); F(g, 'Connect a controller or keyboard to play.', W / 2 - FW('Connect a controller or keyboard to play.') / 2, H * .55 + 23, '#ffffff'); return; }
      DQ.Hud.panel(g, W / 2 - 84, H * .52 - 8, 168, 6 * 16 + 10, { alpha: .82 });
      this.menu.draw(g, W / 2, Math.round(H * .52), { w: 150 });
      const pr = (DQ.Glyphs.family(DQ.game) === 'mouse' ? 'Click' : 'Press {btn:ok}') + ' to choose';
      DQ.Glyphs.text(g, DQ.game, pr, W / 2 - DQ.Glyphs.measure(DQ.game, pr) / 2, H - 14, Math.floor(DQ.game.real * 2) % 2 ? '#ffffff' : '#c8c0e0');
      F(g, E.versionLabel ? E.versionLabel() : 'v' + DQ.VERSION, 4, H - 10, '#5a5480', { font: 'tiny' });
    });
  }
};
DQ.touchOnly = () => { try { const m = typeof matchMedia === 'function' ? matchMedia : null; if (!m) return false; const coarse = m('(pointer: coarse)').matches, fine = m('(any-pointer: fine)').matches; const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false; return coarse && !fine && !DQ._keySeen && !pads; } catch (e) { return false; } };
S.newgame = {
  touch: [],
  enter() { this.name = ''; this.look = 'A'; this.pal = 0; this.diff = DQ.game.settings.difficulty || 'Normal'; this.row = 0; this.gi = 0; this.rig = DQ.makeBuilderRig({ style: 'A', palette: 0 }); this.t = 0; this.keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(['DEL', 'END']); this.typed = DQ.game.input; this.rects = []; DQ.Controls.typing = true; },
  exit() { DQ.Controls.typing = false; },
  update(dt) {
    const G = DQ.game, I = G.input; this.t += dt;
    this.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: this.t * 1.2, pose: Math.floor(this.t / 3) % 3 === 2 ? 'wave' : undefined, expr: 'smile' });
    if (I.repeat('up', .3, .1)) { if (this.row === 0 && this.gi >= 7) this.gi -= 7; else this.row = Math.max(0, this.row - 1); DQ.sfx('uiMove'); }
    if (I.repeat('down', .3, .1)) { if (this.row === 0 && this.gi + 7 < this.keys.length) this.gi += 7; else this.row = Math.min(4, this.row + 1); DQ.sfx('uiMove'); }
    const lr = (I.repeat('left', .3, .1) ? -1 : 0) + (I.repeat('right', .3, .1) ? 1 : 0);
    if (lr) { DQ.sfx('uiMove'); if (this.row === 0) this.gi = E.clamp(this.gi + lr, 0, this.keys.length - 1); else if (this.row === 1) { this.look = this.look === 'A' ? 'B' : 'A'; this.remake(); } else if (this.row === 2) { this.pal = (this.pal + lr + 4) % 4; this.remake(); } else if (this.row === 3) { const D = ['Relaxed', 'Normal', 'Hard']; this.diff = D[(D.indexOf(this.diff) + lr + 3) % 3]; } }
    for (const k of DQ.typedKeys.splice(0)) { if (k === 'Backspace') this.name = this.name.slice(0, -1); else if (k === 'Enter') { this.start(); return; } else if (/^[A-Za-z0-9 ]$/.test(k) && this.name.length < 10) this.name += this.name.length ? k.toLowerCase() : k.toUpperCase(); }
    if (I.pressed('ok')) { if (this.row === 0) { const k = this.keys[this.gi]; if (k === 'DEL') this.name = this.name.slice(0, -1); else if (k === 'END') this.row = 4; else if (this.name.length < 10) this.name += this.name.length ? k.toLowerCase() : k; DQ.sfx('uiTick'); } else if (this.row === 4) this.start(); }
    const c = I.clicked ? I.clicked() : null; if (c) for (const q of this.rects) if (c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) q[4]();
    const p = I.lastDevice === 'mouse' && I.pointer ? I.pointer() : null; if (p) for (const q of this.rects) if (p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3] && q[5]) q[5]();
    if (I.pressed('back')) { if (this.name) this.name = this.name.slice(0, -1); else G.go('title'); }
  },
  remake() { this.rig = DQ.makeBuilderRig({ style: this.look, palette: this.pal }); },
  start() { const G = DQ.game; G.settings.set('difficulty', this.diff); G.go('intro', { name: this.name.trim() || 'Patch', look: { style: this.look, palette: this.pal } }); },
  draw(r) {
    const G = DQ.game, W = r.W, H = r.H; r.sky(['#141030', '#2a2050', '#3a2a60']); this.rects = [];
    r.overlay(g => {
      E.font.title(g, 'A NEW BUILDER', W / 2, 10, { scale: 2, colors: ['#fff0a0', '#e8a040'], align: 'center', outline: '#2a1410' });
      const x0 = Math.round(W / 2 - 170);
      DQ.Hud.panel(g, x0, 36, 200, 150, {});
      F(g, 'Name: ' + (this.name || '') + (Math.floor(this.t * 2) % 2 ? '_' : ''), x0 + 10, 44, this.row === 0 ? '#ffe070' : '#ffffff');
      this.keys.forEach((k, i) => { const x = x0 + 10 + (i % 7) * 26, y = 60 + Math.floor(i / 7) * 16, sel = this.row === 0 && i === this.gi; if (sel) DQ.Hud.panel(g, x - 3, y - 3, 24, 14, { gold: true }); F(g, k, x + 9 - FW(k) / 2, y, sel ? '#ffe070' : '#e8e4f4'); this.rects.push([x - 3, y - 3, 24, 14, () => { this.row = 0; this.gi = i; const kk = this.keys[i]; if (kk === 'DEL') this.name = this.name.slice(0, -1); else if (kk === 'END') this.start(); else if (this.name.length < 10) this.name += this.name.length ? kk.toLowerCase() : kk; }, () => { this.row = 0; this.gi = i; }]); });
      const rows = [['Look', this.look === 'A' ? 'Bandana' : 'Ponytail'], ['Colours', DQ.PALETTES[this.pal].name], ['Difficulty', this.diff], ['', 'Begin!']];
      rows.forEach(([a, b], k) => { const y = 132 + k * 13, sel = this.row === k + 1; if (sel) DQ.Hud.panel(g, x0 + 6, y - 3, 188, 13, { gold: true }); F(g, a, x0 + 12, y, '#c8c0e0'); F(g, (k < 3 ? '← ' : '') + b + (k < 3 ? ' →' : ''), x0 + 90, y, sel ? '#ffe070' : '#ffffff'); this.rects.push([x0 + 6, y - 3, 188, 13, () => { this.row = k + 1; if (k === 0) { this.look = this.look === 'A' ? 'B' : 'A'; this.remake(); } else if (k === 1) { this.pal = (this.pal + 1) % 4; this.remake(); } else if (k === 2) { const D = ['Relaxed', 'Normal', 'Hard']; this.diff = D[(D.indexOf(this.diff) + 1) % 3]; } else this.start(); }, () => { this.row = k + 1; }]); });
      DQ.Hud.panel(g, x0 + 210, 36, 130, 150, { gold: true });
      const big = new E.View('iso', 'Preview', 45, 30, Math.SQRT2 * 2.4, 1); this.rig.draw(g, x0 + 275, 168, big);
      F(g, 'Silent, but handy.', x0 + 236, 172, '#c8c0e0');
      DQ.Glyphs.text(g, G, 'Type a name, or {btn:ok} letters   {btn:back} Back', 10, H - 14, '#c8c0e0');
    });
  }
};
DQ.typedKeys = [];
S.intro = {
  touch: [],
  enter(d) { this.d = d; this.page = 0; this.t = 0; this.shown = 0; DQ.AudioX && DQ.AudioX.music('lullaby'); },
  update(dt) {
    const I = DQ.game.input; this.t += dt; const txt = DQ.PROLOGUE[this.page]; const prev = Math.floor(this.shown); this.shown = Math.min(txt.length, this.shown + dt * 34);
    for (let k = prev; k < Math.floor(this.shown); k++) DQ.AudioX && DQ.AudioX.voice('granny', txt[k], k, txt);
    if (I.pressed('ok') || I.pressed('interact') || (I.clicked && I.clicked())) { if (this.shown < txt.length) this.shown = txt.length; else this.next(); }
    // skip: Esc / Circle, or Options on a pad (Enter is both OK and Start on a keyboard, and there it only turns the page)
    else if (I.pressed('back') || (I.pressed('start') && !I.pressed('ok'))) DQ.game.go('play', this.d);
  },
  next() { this.page++; this.shown = 0; if (this.page >= DQ.PROLOGUE.length) DQ.game.go('play', this.d); },
  draw(r) {
    const W = r.W, H = r.H, t = this.t; r.sky(['#06051a', '#0d0b2a', '#141238']);
    r.overlay(g => {
      for (let i = 0; i < 60; i++) { const x = (DQ.h01(i, 1) * W + t * (3 + DQ.h01(i, 2) * 5)) % W, y = (DQ.h01(i, 3) * H + Math.sin(t * .4 + i) * 4); px.dot(g, Math.round(x), Math.round(y), i % 4 ? '#3a3668' : '#c8b8e8'); }
      for (let i = 0; i < 12; i++) { const y = H * .62 + i * 4; for (let x = 0; x < W; x += 6) if ((x / 6 + i) % 2 === 0) px.rect(g, x + Math.round(Math.sin(t + i) * 2), y, 3, 1, ['#5aa04a', '#d04a4a', '#4a6ad0', '#e8c040'][(x / 6 + i) % 4]); }
      DQ.Hud.portrait(g, null, 'granny', W / 2 - 22, H * .16, 44);
      const txt = DQ.PROLOGUE[this.page].slice(0, Math.floor(this.shown)), lines = DQ.wrapText(txt, Math.min(300, W - 40));
      lines.forEach((l, i) => F(g, l, W / 2 - FW(l) / 2, H * .42 + i * 13, '#ffe9a0'));
      const pr = '{btn:ok} Next   {btn:back} Skip', pw = DQ.Glyphs.measure(DQ.game, pr); DQ.Glyphs.text(g, DQ.game, pr, W - 8 - pw, H - 14, '#8a84a8');
    });
  }
};
S.play = {
  pausable: true, touch: [], camera: { zoom: false },
  enter(d = {}) {
    const G = DQ.game; G.setView(G.settings.camView === 'Three-quarter' ? 'threequarter' : 'iso'); G.resetCamera();
    if (d.resume && DQ.ctx) { this.ctx = DQ.ctx; }
    else if (d.saveData) { this.ctx = DQ.ctx = Play.make(G, { mode: 'story', name: d.saveData.builder && d.saveData.builder.name, look: d.saveData.builder && d.saveData.builder.look }); DQ.Save.apply(this.ctx, d.saveData); }
    else { this.ctx = DQ.ctx = Play.make(G, { mode: 'story', name: d.name, look: d.look }); if (d.beat) DQ.Beats.apply(this.ctx, d.beat); else if (!DQ.TEST.noWake) DQ.Cutscenes.play(this.ctx, 'wake'); }
    const zs = DQ.ZOOMS[G.baseView.id] || DQ.ZOOMS.iso; this.ctx.zoomI = E.clamp(DQ.store.get('zoom', 1) | 0, 0, zs.length - 1); G.setZoom(zs[this.ctx.zoomI]);
    G.cam.bounds = v => this.ctx.world.bounds(v); G.cam.smooth = .12; G.cam.snap = true;
    G.input.use(DQ.Controls.PLAY); DQ.Controls.install(G);
    if (DQ.AudioX) DQ.AudioX.director(this.ctx, true);
    DQ.ctx.save = DQ.Save;
    if (DQ.Dev && !DQ.HUB) DQ.Dev.restore(this.ctx);
    if (d.then) d.then();
  },
  update(dt) {
    const ctx = this.ctx, G = DQ.game; this.pausable = !ctx.modal && !ctx.ui.open;
    Play.update(ctx, dt, ctx.driver ? { intent: () => ctx.driver.intent(), ai: ctx.driver } : undefined);
    if (DQ.AudioX) DQ.AudioX.director(ctx);
    DQ.Save.tick(ctx, dt);
  },
  draw(r) { Play.draw(this.ctx, r); }
};
S.results = {
  touch: [],
  enter(d) { this.ctx = (d && d.ctx) || DQ.ctx; this.t = 0; DQ.AudioX && DQ.AudioX.music('finale'); this.menu = new ListMenu([{ label: 'Continue to credits', act: () => DQ.game.go('credits', { ctx: this.ctx }) }]); },
  update(dt) { this.t += dt; if (this.t > .8) this.menu.update(DQ.game.input); },
  draw(r) {
    const ctx = this.ctx, s = ctx.stats, W = r.W, H = r.H; r.sky(['#2a1a40', '#4a2a50', '#e8a070']);
    r.overlay(g => {
      E.font.title(g, 'CHAPTER CLEAR!', W / 2, 12, { scale: 2, colors: ['#fff0a0', '#e8a040', '#c85a30'], align: 'center', outline: '#2a1410', depth: 2 });
      F(g, 'Chapter One: A Stitch in Time', W / 2 - FW('Chapter One: A Stitch in Time') / 2, 40, '#ffe9a0');
      const x0 = Math.round(W / 2 - 150); DQ.Hud.panel(g, x0, 56, 300, 130, { gold: true });
      ctx.builder.rig.drawPortrait(g, x0 + 12, 70, 56, { bg: '#2a2350', border: '#e8c040', shadow: false }); F(g, ctx.builder.name, x0 + 40 - FW(ctx.builder.name) / 2, 132, '#ffe070');
      const rows = [['Play time', DQ.fmtTime(s.time)], ['Blocks placed', s.placed], ['Blocks broken', s.broken], ['Items crafted', s.crafted], ['Rooms built', s.rooms], ['Monsters defeated', s.killed], ['Cheer earned', s.cheer]];
      rows.forEach(([a, b], i) => { F(g, a, x0 + 90, 66 + i * 16, '#c8c0e0'); F(g, String(b), x0 + 280 - FW(String(b)), 66 + i * 16, '#ffffff'); });
      this.menu.draw(g, W / 2, 200, { w: 170 });
    });
  }
};
const CREDITS = () => {
  const A = DQ.ABOUT && DQ.ABOUT.sourceInformation || {};
  return ['DRAGON QUILT BUILDERS', '', 'Chapter One: A Stitch in Time', '', '- Starring -', 'The Builder', 'Granny Gossamer', 'Wren Tuck', 'Mortimer Bodkin', 'Marigold Purl', 'Professor Hemsley Selvage', 'Lintwick', '', '- Villains -', 'Sir Buttonsworth', 'Gnarlgrim the Knotted', 'Frayvern the Unraveller', '',
    '- Design, code, art, music and words -', 'Claude (Anthropic, claude-opus-5-5)', 'under direction', '', '- Engine -', 'my-3D2dge v0.85.2 (MIT) by michaelcrosato', '', '- AI Hub Session client -', '1.4.0', '', 'An original game inspired by', 'Dragon Quest Builders (Square Enix).', 'Not affiliated with or endorsed by Square Enix.', 'No assets from the original.', '', '', 'To be continued...', 'Chapter Two: The Calico Coast', '', '', 'Thank you for playing!'];
};
S.credits = {
  touch: [],
  enter(d) { this.ctx = (d && d.ctx) || DQ.ctx; this.y = 0; this.t = 0; },
  update(dt) { this.t += dt; const I = DQ.game.input; this.y += dt * (I.down('ok') ? 60 : 18); if (this.y > CREDITS().length * 14 + DQ.game.H + 20 || I.pressed('back')) this.done(); },
  done() { if (this.ctx && this.ctx.mode === 'story') DQ.game.go('play', { resume: true }); else DQ.game.go('title'); },
  draw(r) {
    const W = r.W, H = r.H, ctx = this.ctx; if (ctx && ctx.world) { const t = ctx.town; DQ.game.focus(t.x * T + 8, t.y * T + 8, t.L * T + 10); Play.draw(ctx, r, { noHud: true }); } else r.sky(['#06051a', '#141238', '#2a2050']);
    r.overlay(g => { px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#06051a')); CREDITS().forEach((l, i) => { const y = Math.round(H - this.y + i * 14); if (y < -10 || y > H + 10) return; const big = i === 0 || l === 'Thank you for playing!'; if (big) E.font.title(g, l, W / 2, y, { scale: 1, colors: ['#fff0a0', '#e8a040'], align: 'center', outline: '#2a1410' }); else F(g, l, W / 2 - FW(l) / 2, y, l.startsWith('-') ? '#ffd36a' : '#ffffff'); }); DQ.Glyphs.text(g, DQ.game, 'Hold {btn:ok} to speed up', W - 120, H - 12, '#8a84a8'); });
  }
};
S.about = {
  touch: [],
  enter(d) { this.back = (d && d.back) || 'title'; this.page = 0; this.scroll = 0; this.t = 0; },
  pages() {
    const A = DQ.ABOUT || {}, si = A.sourceInformation || {}, fb = k => (A[k] || ['unknown']).map((s, i) => (i + 1) + '. ' + s);
    const SI = [['Date', si.date], ['Source', si.source], ['Plan', si.plan], ['Genre', si.genre], ['Perspective', si.perspective], ['Tech', si.tech], ['Art Direction', si.artDirection], ['Animation', si.animation], ['Audio', si.audio], ['Online', si.online], ['Testing', si.testing], ['Research', si.research], ['Environment', si.environment], ['Model', si.model], ['Usage', si.usage]].map(([a, b]) => a + ': ' + (b || 'unknown'));
    return [
      ['Credits', CREDITS(), 'Credits', 'roll'],
      ['Source Information', SI, 'Source', 'fields'],
      ['Testing Feedback', fb('testingFeedback'), 'Testing'],
      ['Engine Feedback', fb('engineFeedback'), 'Engine'],
      ['Prompt Feedback', fb('promptFeedback'), 'Prompt'],
      ['Licenses', ['my-3D2dge engine v0.85.2: MIT licence, (c) michaelcrosato.', 'Engine changes for this game: sewing-tool weapon kinds on the Humanoid rig (needle, club, bodkin, ripper).', 'AI Hub Session Protocol v1, client 1.4.0 (unmodified).', 'All game code, pixel art, music, sound and words: original, made for this game.', 'Dragon Quest Builders is a trademark of Square Enix. This is an unaffiliated, original homage.'], 'Licenses']
    ];
  },
  update(dt) {
    const I = DQ.game.input, P = this.pages(); this.t += dt;
    if (I.pressed('tabPrev') || I.repeat('left', .3, .12)) { this.page = (this.page + P.length - 1) % P.length; this.scroll = 0; DQ.sfx('uiMove'); }
    if (I.pressed('tabNext') || I.repeat('right', .3, .12)) { this.page = (this.page + 1) % P.length; this.scroll = 0; DQ.sfx('uiMove'); }
    if (I.repeat('down', .2, .06)) this.scroll++; if (I.repeat('up', .2, .06)) this.scroll = Math.max(0, this.scroll - 1);
    const wh = DQ.Controls.wheelSteps(); if (wh) this.scroll = Math.max(0, this.scroll + wh * 2);
    const c = I.clicked ? I.clicked() : null; if (c && this.rects) for (const q of this.rects) if (c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) { this.page = q[4]; this.scroll = 0; }
    if (I.pressed('back') || I.pressed('ok')) { if (this.back === 'pause') DQ.game.go('play', { resume: true }); else DQ.game.go(this.back); }
  },
  draw(r) {
    const W = r.W, H = r.H, P = this.pages(); r.sky(['#141030', '#2a2050', '#3a2a60']); this.rects = [];
    r.overlay(g => {
      // the tabs: short names, kept clear of the corner buttons (scrolled so the chosen one shows if they still don't fit)
      const ca = DQ.game.cornerArea && DQ.game.cornerArea(), right = ca && ca.y0 < 24 ? Math.round(ca.x0) - 4 : W - 8, ws = P.map(p => FW(p[2] || p[0]) + 12);
      let x = 8, off = 0; const xs = ws.map(w => { const a = x; x += w + 3; return a; }); if (xs[this.page] + ws[this.page] > right) off = xs[this.page] + ws[this.page] - right;
      P.forEach((p, i) => { const tx = xs[i] - off, w = ws[i]; if (tx < 4 || tx + w > right + 1) return; DQ.Hud.panel(g, tx, 6, w, 15, { gold: i === this.page }); F(g, p[2] || p[0], tx + 6, 10, i === this.page ? '#ffe070' : '#c8c0e0'); this.rects.push([tx, 6, w, 15, i]); });
      const px0 = 8, py0 = 26, pw = W - 16, ph = H - 46; DQ.Hud.panel(g, px0, py0, pw, ph, {});
      const [title, items, , kind] = P[this.page];
      E.font.title(g, title, W / 2, py0 + 5, { scale: 1, colors: ['#fff0a0', '#e8a040'], align: 'center', outline: '#2a1410' });
      // the body: wrapped lines, each {s, c, label, center}
      const lines = [], tw = pw - 28;
      if (kind === 'roll') for (const l of items) lines.push({ s: l, c: l.startsWith('-') ? '#ffd36a' : '#ffffff', center: true });
      else for (const l of items) { const k = kind === 'fields' ? l.indexOf(': ') : -1; DQ.wrapText(l, tw).forEach((w, j) => lines.push({ s: w, c: '#ffffff', label: j === 0 && k > 0 ? l.slice(0, k + 1) : null })); lines.push({ s: '' }); }
      const top = py0 + 22, rows = Math.floor((py0 + ph - 6 - top) / 11), max = Math.max(0, lines.length - rows); this.scroll = Math.min(this.scroll, max);
      lines.slice(this.scroll, this.scroll + rows).forEach((l, i) => { const y = top + i * 11; if (!l.s) return;
        if (l.center) F(g, l.s, W / 2 - FW(l.s) / 2, y, l.c);
        else if (l.label) { F(g, l.label, px0 + 10, y, '#ffd36a'); F(g, l.s.slice(l.label.length), px0 + 10 + FW(l.label), y, '#ffffff'); }
        else F(g, l.s, px0 + 10, y, l.c); });
      if (max) { const bx = px0 + pw - 7, by = top, bh = rows * 11 - 2, kh = Math.max(8, Math.round(bh * rows / lines.length)), ky = by + Math.round((bh - kh) * this.scroll / max); px.rect(g, bx, by, 2, bh, '#2a2440'); px.rect(g, bx - 1, ky, 4, kh, '#c8c0e0'); }
      DQ.Glyphs.text(g, DQ.game, '{btn:tabPrev}{btn:tabNext} Pages   {btn:up}{btn:down} Scroll   {btn:back} Back', 10, H - 14, '#c8c0e0');
    });
  }
};
// the title logo: "DRAGON QUILT" in patchwork fabric colours, "BUILDERS" in gold thread, a needle-and-thread dragon
DQ.Title = {
  logo(g, cx, y, t) {
    const word = 'DRAGON QUILT', cols = [['#9ae07a', '#4a9a3a'], ['#ff8a8a', '#c83a4a'], ['#8ab0ff', '#3a5ac8'], ['#fff09a', '#d8a830'], ['#d8a0e8', '#8a4aa8'], ['#f0c890', '#a8743a']];
    let w = 0; const sc = 3, lw = [...word].map(ch => ch === ' ' ? 10 : E.font.width(ch, { scale: sc }) + 2); w = lw.reduce((a, b) => a + b, 0);
    let x = cx - w / 2; [...word].forEach((ch, i) => { if (ch !== ' ') { const c = cols[i % cols.length], bob = Math.round(Math.sin(t * 2 + i * .6) * 1.5); E.font.title(g, ch, x + lw[i] / 2, y + bob, { scale: sc, colors: c, align: 'center', outline: '#1a1020', depth: 2, depthColor: '#3a2a40' }); } x += lw[i]; });
    E.font.title(g, 'BUILDERS', cx, y + 26, { scale: 2, colors: ['#fff0a0', '#e8b030'], align: 'center', outline: '#2a1410', depth: 1 });
    // stitches under the words
    for (let i = 0; i < w; i += 4) if ((i / 4 + Math.floor(t * 4)) % 2) px.rect(g, Math.round(cx - w / 2 + i), y + 46, 2, 1, '#f1e6c8');
    // the needle-dragon emblem
    const ex = cx + w / 2 + 14, ey = y + 8; px.line(g, ex - 8, ey + 14, ex + 8, ey - 10, '#e8ecf4', 2); px.dot(g, ex + 7, ey - 9, '#5a5a6a');
    for (let k = 0; k < 16; k++) { const a = k * .5 + t; px.dot(g, Math.round(ex + 8 + Math.cos(a) * (4 + k * .5) - k), Math.round(ey - 8 + Math.sin(a) * 3 + k), '#c84a3a'); }
    px.poly(g, [[ex - 8, ey + 14], [ex - 14, ey + 10], [ex - 10, ey + 18]], '#c84a3a'); px.dot(g, ex - 6, ey + 11, '#ffe070');
  }
};
})();
