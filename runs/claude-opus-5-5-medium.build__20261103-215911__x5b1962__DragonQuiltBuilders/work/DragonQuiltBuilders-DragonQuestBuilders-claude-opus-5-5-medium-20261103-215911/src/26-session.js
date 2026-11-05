// A play session: the world and every system in one context, their events wired together, update and draw in order.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;

DQ.makeSession = (game, o = {}) => {
  const mode = o.mode || 'story', ctx = DQ.newCtx(game, mode), ev = ctx.events;
  const bee = mode === 'bee';
  ctx.world = new DQ.VoxelWorld(bee ? 48 : 144, bee ? 48 : 144, bee ? 16 : 24, ev);
  if (bee) DQ.generateBee(ctx.world); else DQ.generateWorld(ctx.world);
  ctx.renderer = new DQ.VoxelRenderer(ctx);
  ctx.objects = new DQ.Objects(ctx);
  DQ.Objects.resetUids && DQ.Objects.resetUids();
  for (const s of ctx.world.genObjects) ctx.objects.add(Object.assign({}, s), { force: true, silent: true });
  ctx.objects.markGenerated();
  ctx.drops = new DQ.Drops(ctx); ctx.combat = new DQ.Combat(ctx); ctx.crafting = new DQ.Crafting(ctx);
  ctx.town = new DQ.Town(ctx, bee ? { bx: DQ.BEE.banner[0], by: DQ.BEE.banner[1] } : {}); ctx.rooms = new DQ.Rooms(ctx);
  ctx.npcs = new DQ.Residents(ctx); ctx.monsters = new DQ.Monsters(ctx); ctx.siege = new DQ.Siege(ctx); ctx.clock = new DQ.Clock(ctx);
  ctx.talk = new DQ.Talk(ctx); ctx.quests = new DQ.Quests(ctx); ctx.cutscenes = new DQ.Cutscenes(ctx); ctx.ui = new DQ.UIManager(ctx); ctx.hud = new DQ.Hud(ctx);
  ctx.audioX = game._audioX || (game._audioX = new DQ.AudioX(ctx)); ctx.audioX.ctx = ctx;
  ctx.explored = new Uint8Array(ctx.world.W * ctx.world.D);
  ctx.useObject = (ob, b) => DQ.useObject(ctx, ob, b);
  const P = DQ.WORLD.poi, start = bee ? [DQ.BEE.banner[0], DQ.BEE.banner[1] + 3, 5] : P.hollowStart;
  ctx.startPoint = [(start[0] + .5) * T, (start[1] + .5) * T, start[2] * T];
  if (!o.noBuilder) {
    const b = ctx.builder = new DQ.Builder(ctx, { x: ctx.startPoint[0], y: ctx.startPoint[1], z: ctx.startPoint[2], name: o.name, look: o.look, pal: o.pal, id: o.id || 0, color: o.color, local: true });
    ctx.builders.push(b); b.take('darningStick', 1, { quiet: true }); b.body.facing = 0;
  }
  if (bee) { ctx.town.planted = true; ctx.town.bz = ctx.world.topZ(...DQ.BEE.banner); ctx.clock.frozen = true; ctx.clock.hour = 10; for (const r of DQ.RECIPES) ctx.crafting.know(r.id, true); }
  else if (mode === 'story') { ctx.crafting.know('torch', true); ctx.crafting.known.delete('torch'); }
  DQ.wire(ctx);
  // fixed monsters: the Lint Camp's three, the gate's guards by day
  if (mode === 'story' && !o.noFixed) {
    for (const [x, y] of [[113, 28], [119, 31], [116, 34]]) ctx.monsters.spawnCell('dyedLintling', x, y, { fixed: true, tag: 'camp' });
    for (const [x, y] of [[96, 111], [96, 115]]) ctx.monsters.spawnCell('frayedKnight', x, y, { fixed: true, tag: 'gate' });
  }
  ctx._autoT = 0; ctx._healT = 0; ctx._exT = 0;
  return ctx;
};

// ---- the wiring: everything that reacts to everything else ----
DQ.wire = (ctx) => {
  const ev = ctx.events, game = ctx.game, hud = () => ctx.hud, au = () => ctx.audioX;
  const mark = () => ctx.rooms.mark();
  ev.on('blockPlaced', mark); ev.on('blockBroken', mark); ev.on('objectPlaced', mark); ev.on('objectRemoved', mark);
  ev.on('blockPlaced', e => { if (e.id === 24 || e.id === 23) ctx.quests.update(0, true); });
  ev.on('itemGained', e => { if (e.by && e.by.local) ctx.crafting.trigger('pickup', e.id); });
  ev.on('objectPlaced', e => { ctx.crafting.trigger('placed', e.obj.id); const p = P().tunnelMark; if (e.obj.id === 'torch' && Math.hypot(e.obj.x - p[0], e.obj.y - p[1]) <= 1.5) { if (!ctx.flags.tunnelLit) { ctx.flags.tunnelLit = true; ctx.talk.say(DQ.LINES.lit, { who: 'granny' }); } } });
  ev.on('notion', e => { const r = DQ.recipe(e.recipe); if (!r || ctx.mode === 'bee') return; const it = DQ.ITEMS[r.out]; hud().popup("You've got a notion!", it.name + '. Craft it ' + (r.station === 'pocket' ? 'from your Pocket Notions.' : 'at a ' + DQ.STATIONS[r.station] + '.'), r.out); au().jingle('notion'); const b = ctx.builder; if (b) { b.notionT = 1; b.notionItem = r.out; } if (e.recipe === 'torch') ctx.talk.say(DQ.LINES.lint, { who: 'granny' }); });
  ev.on('roomFormed', e => {
    if (ctx.mode === 'bee' || !e.room.inBorder && ctx.town.planted) return;
    if (!e.room.inBorder) return;
    hud().banner('ROOM COMPLETE! ' + e.room.name); au().jingle('room');
    DQ.FX.confetti(ctx, (e.room.cx + .5) * T, (e.room.cy + .5) * T, (e.room.L + 2) * T, 36);
    ctx.roomLabel = { text: e.room.name, x: (e.room.cx + .5) * T, y: (e.room.cy + .5) * T, z: (e.room.L + 2) * T, t: 3 };
    for (const n of ctx.npcs.list) { n.emote('heart', 2); n.pose = 'cheer'; }
    const b = ctx.builder; if (b) { b.mood = 'cheer'; b.moodT = 1.2; }
    const say = { kitchen: ['marigold', 'A KITCHEN!'], guardPost: ['mortimer', 'Hmph. Not bad.'], bedroom: ['wren', 'A BEDROOM!'], workshop: ['professor', 'Fascinating!'], messHall: ['wren', 'A table!'] }[e.room.type];
    if (say && ctx.npcs.get(say[0])) ctx.npcs.get(say[0]).speak(say[1], 2.5);
  });
  ev.on('townLevel', e => {
    if (e.silent || ctx.mode !== 'story') return;
    ctx.cutscenes.play('levelUp');
    const L = DQ.LEVELS[e.level]; if (L && L.arrives) ctx.pendingArrival = L.arrives;
  });
  ev.on('questStep', e => {
    if (e.id === 'm1' && e.step === 1) ctx.talk.say(DQ.LINES.ledge, { who: 'granny' });
    if (e.id === 'm1' && e.step === 2) { if (!ctx.monsters.list.some(m => m.tag === 'hollow')) ctx.monsters.spawnCell('lintling', 40, 39, { tag: 'hollow', fixed: true }); ctx.talk.say(DQ.LINES.lintling, { who: 'granny' }); }
    if (e.id === 'm1' && e.step === 4) ctx.talk.say(DQ.LINES.torch, { who: 'granny' });
    if (e.id === 'm13' && e.step === 2) { }
  });
  ev.on('questDone', e => {
    if (e.id === 'm1') ctx.cutscenes.play('exit');
    if (e.id === 'm5') ctx.cutscenes.play('spinDemo');
    if (e.id === 'm12') { ctx.cutscenes.play('thread'); ctx.save && ctx.save.auto('thread'); }
    if (e.id === 'm14') { /* the finale runs from the boss's defeat */ }
    if (e.id === 's1') { const n = ctx.npcs.get('lintwick'); if (n) n.mood = 1; }
    ctx.save && ctx.save.auto('quest');
  });
  ev.on('gateHit', e => { if (!ctx.flags.gateCut && e.by.weapon.ripper) ctx.cutscenes.play('gateRip'); });
  ev.on('cageBroken', () => { ctx.flags.lintwickFreed = true; const n = ctx.npcs.arrive('lintwick', { at: [116, 31], quiet: true }); n.follow = ctx.builder; ctx.cutscenes.play('lintwickFree'); });
  ev.on('bossDefeated', e => {
    if (ctx.mode !== 'story') return;
    if (e.id === 'buttonGolem') { const m = ctx.monsters.list.find(q => q.id === 'buttonGolem') || { body: ctx.builder.body }; ctx.drops.spawn('goldenNeedle', 1, m.body.x, m.body.y, m.body.z + 10); ctx.drops.spawn('steelThread', 3, m.body.x, m.body.y, m.body.z + 10); ctx.talk.say(DQ.LINES.buttonsDefeat, { who: 'buttonsworth' }); au().jingle('victory'); }
    if (e.id === 'gnarlgrim') { ctx.cutscenes.play('finale'); }
  });
  ev.on('bossHint', () => ctx.talk.say(DQ.LINES.gnarlHint, { who: ctx.npcs.get('mortimer') ? 'mortimer' : 'granny', auto: 2.5, modal: false }));
  ev.on('tangled', () => { });
  ev.on('siegeWave', e => {
    if (e.phase === 'prep') { hud().banner('The Knotted army approaches!'); }
    if (e.phase === 'wave') { hud().banner('Wave ' + e.wave + '!'); au().sfx('roar'); }
    if (e.phase === 'cleared') { au().jingle('wave'); hud().banner('Wave cleared!'); }
    if (e.phase === 'boss' && ctx.mode === 'story') { const m = ctx.siege.spawnBoss(); ctx.cutscenes.play('gnarlIntro', m); ctx.quests.update(0, true); }
  });
  ev.on('bannerFallen', () => { if (ctx.siege.active) ctx.siege.fail('banner'); });
  ev.on('siegeFailed', e => { if (ctx.mode !== 'story') return; ctx.failed = e.why; DQ.openFail(ctx); });
  ev.on('builderKO', e => {
    const b = e.by; if (!b.local) return;
    if (ctx.mode === 'story' && (ctx.siege.active || ctx.monsters.list.some(m => m.id === 'gnarlgrim' && !m.dead))) { ctx.onBuilderKO = () => { ctx.siege.fail('ko'); }; return; }
    ctx.onBuilderKO = null; ctx.talk.say(DQ.LINES.ko, { who: 'granny' });
    if (ctx.mode === 'story' && game.settings.dqDifficulty !== 'Relaxed') {
      const contents = {}; for (const s of b.bag.slots.slice()) { const it = DQ.ITEMS[s.id]; if (it.kind !== 'material' && it.kind !== 'block' && it.kind !== 'food') continue; const n = Math.floor(b.bag.real(s.id) / 2); if (n > 0 && !contents[s.id]) { contents[s.id] = n; } }
      for (const k in contents) b.bag.remove(k, contents[k]);
      if (Object.keys(contents).length) { const [cx, cy] = [Math.floor(b.body.x / T), Math.floor(b.body.y / T)]; let L = Math.floor((b.body.z + 1) / T); if (ctx.world.solidAt(cx, cy, L) || L < 1) L = ctx.world.topZ(cx, cy); const old = ctx.objects.find(q => q.id === 'lostBundle'); if (old) ctx.objects.remove(old, { silent: true }); ctx.objects.add({ id: 'lostBundle', x: cx, y: cy, z: L, contents }, { force: true, silent: true }); ctx.flags.lostBundle = [cx, cy]; }
    }
  });
  ev.on('timeOfDay', e => { if (ctx.mode !== 'story') return; if (e.night) { au().jingle('nightfall'); if (!ctx.flags.nightTold && ctx.town.planted) { ctx.flags.nightTold = true; ctx.talk.say(DQ.LINES.night, { who: 'granny', auto: 3, modal: false }); } } });
  ev.on('collected', e => { if (e.id === 'goldenThread') ctx.quests.update(0, true); });
  ev.on('bannerPlanted', () => { ctx.quests.update(0, true); });
  ev.on('cheer', e => { if (e.src === 'bubble') hud().pulseBanner(); });
  ev.on('chapterClear', () => { if (ctx.mode === 'story' && ctx.onChapterClear) ctx.onChapterClear(); });
  function P() { return DQ.WORLD.poi; }
};

// ---- the step ----
DQ.sessionUpdate = (ctx, dt, intentFn) => {
  const game = ctx.game, b = ctx.builder;
  DQ.FX.update(dt);
  if (ctx.swirl > 0) ctx.swirl -= dt;
  if (ctx.roomLabel) { ctx.roomLabel.t -= dt; if (ctx.roomLabel.t <= 0) ctx.roomLabel = null; }
  if (ctx.party > 0) { ctx.party -= dt; if (DQ.fx() < dt * 2) { const t = ctx.town; DQ.FX.firework(ctx, (t.bx + (DQ.fx() - .5) * 16) * T, (t.by + (DQ.fx() - .5) * 16) * T, (t.bz + 5) * T); } }
  let modal = ctx.ui.update(dt);
  if (!modal && ctx.talk.update(dt)) modal = true;
  ctx.cutscenes.update(dt);
  if (ctx.cutscene) modal = true;
  const it = modal ? DQ.Controls.blank() : (intentFn ? intentFn() : DQ.Controls.intent(game, ctx));
  ctx.lastIntent = it;
  // the camera: turn, zoom, reset (the menus own the same buttons while open)
  if (!modal && b && !b.seat) {
    if (it.camTurn) { game.rotateView(it.camTurn * 90); ctx.audioX.sfx('whoosh', { vol: .2 }); ctx.turnFade = game.reduceMotion ? 0 : .18; }
    if (it.zoom) { const Z = DQ.ZOOMS, i = Z.indexOf(ctx.zoom || 1); const ni = E.clamp((i < 0 ? 1 : i) + it.zoom, 0, Z.length - 1); ctx.zoom = Z[ni]; game.setZoom(ctx.zoom); if (!game.headless) E.store.set('dqb-zoom', ctx.zoom); }
    if (it.camReset) { game.resetCamera(); ctx.zoom = 1; game.setZoom(1); }
  }
  if (ctx.turnFade > 0) ctx.turnFade -= dt;
  if (!modal && b && ctx.mode !== 'attract') DQ.sessionKeys(ctx);
  for (const q of ctx.builders) if (!q.remote) q.update(dt, q === b ? it : (q.intent || DQ.Controls.blank()));
  ctx.objects.update(dt);
  if (!ctx.cutscene) ctx.npcs.update(dt); else for (const n of ctx.npcs.list) n.update(dt);
  if (!ctx.netClient || ctx.netClient.local) { ctx.monsters.update(dt); } else ctx.monsters._shots(dt);
  ctx.drops.update(dt); ctx.town.update(dt); ctx.rooms.update(dt);
  if (ctx.mode === 'story') ctx.quests.update(dt);
  if (!modal || ctx.cutscene) ctx.clock.update(modal ? 0 : dt);
  ctx.siege.update(dt);
  ctx.hud.update(dt, it);
  if (ctx.mode === 'story') DQ.storyTriggers(ctx, dt);
  // block damage heals after 4 s without hits
  ctx._healT -= dt; if (ctx._healT <= 0) { ctx._healT = .5; const now = game.time; for (const [i, m] of ctx.world.meta) if (m.hp && now - (m.t || 0) > 4 && (m.t || 0) > 0) { m.hp = 0; const [x, y] = ctx.world.unidx(i); ctx.world.colVer[y * ctx.world.W + x]++; } }
  // explored fog (10 blocks) and autosave every 5 minutes
  if (b) { ctx._exT -= dt; if (ctx._exT <= 0) { ctx._exT = .5; const cx = Math.floor(b.body.x / T), cy = Math.floor(b.body.y / T), w = ctx.world; for (let y = cy - 10; y <= cy + 10; y++) for (let x = cx - 10; x <= cx + 10; x++) if (w.insideCol(x, y) && (x - cx) ** 2 + (y - cy) ** 2 <= 100) ctx.explored[y * w.W + x] = 1; } }
  if (ctx.mode === 'story' && ctx.save) { ctx._autoT += dt; if (ctx._autoT > 300 && ctx.save.canSave()) { ctx._autoT = 0; ctx.save.auto('timer'); } }
  // the camera follows the builder (or a cutscene's focus)
  const f = ctx.camFocus || (b && { x: b.body.x, y: b.body.y, z: b.body.z + 14 });
  if (f) game.focus(f.x, f.y, f.z);
  // the cutaway around the builder
  if (b && !game.headless) ctx.renderer.updateCut(dt, ctx.world, b.body.x, b.body.y, b.body.z, game.view, game.settings.dqCutaway === 'Off' ? 'off' : game.settings.dqCutaway === 'Always' ? 'always' : DQ.dev.cutaway);
  else if (b) ctx.renderer.updateCut(dt, ctx.world, b.body.x, b.body.y, b.body.z, game.view, 'auto');
  if (ctx.audioX && ctx.mode === 'story') ctx.audioX.direct(dt);
  // weather and light by region and hour
  if (b) { const reg = DQ.regionAt(Math.floor(b.body.x / T), Math.floor(b.body.y / T)); if (reg !== ctx.region) { ctx.region = reg; game.weather = ctx.clock.weatherFor(reg); if (ctx.mode === 'story' && ctx.hud && DQ.WORLD.regions[reg]) ctx.hud.toast(DQ.WORLD.regions[reg].name, 'place'); } if (ctx._wT === undefined || (ctx._wT -= dt) <= 0) { ctx._wT = 5; game.weather = ctx.clock.weatherFor(reg); } }
};
// the satchel, map and journal keys in play
DQ.sessionKeys = (ctx) => {
  const I = ctx.game.input;
  if (I.pressed('satchel')) { if (ctx.inHub && I.down('pause')) return; ctx.ui.open('satchel', { tab: 0 }); }
  else if (I.pressed('map')) ctx.ui.open('satchel', { tab: 1 });
  else if (I.pressed('journal')) ctx.ui.open('satchel', { tab: 2 });
};
// story triggers by place and time
DQ.storyTriggers = (ctx, dt) => {
  const b = ctx.builder; if (!b) return; const P = DQ.WORLD.poi, cx = b.body.x / T, cy = b.body.y / T;
  if (!ctx.flags.lintCampSeen && Math.hypot(cx - 116, cy - 30) < 9) { ctx.flags.lintCampSeen = true; if (!ctx.flags.lintwickFreed) ctx.talk.say(DQ.LINES.lintwickCage, { who: 'lintwick', auto: 3, modal: false }); }
  const lw = ctx.npcs.get('lintwick'); if (lw && lw.follow && ctx.town.inBorder(Math.floor(lw.body.x / T), Math.floor(lw.body.y / T)) && Math.hypot(cx - ctx.town.bx, cy - ctx.town.by) < 10) { lw.follow = null; ctx.flags.lintwickHome = true; lw.speak('Lintwick home!', 3); ctx.quests.update(0, true); }
  // Sir Buttonsworth wakes when the Builder reaches the quarry floor on the quest
  if (ctx.quests.active('m11') && !ctx.flags.boss_buttonGolem && !ctx.monsters.list.some(m => m.id === 'buttonGolem') && Math.hypot(cx - 21.5, cy - 18) < 9 && b.body.z < 9 * T) { const m = ctx.monsters.spawnCell('buttonGolem', 21, 17, { fixed: true }); ctx.cutscenes.play('buttonsIntro', m); }
  // residents arrive at dawn, or now in daylight
  if (ctx.pendingArrival && !ctx.cutscene && ctx.clock.hour >= 6 && ctx.clock.hour < 18 && !ctx.siege.active) { const id = ctx.pendingArrival; ctx.pendingArrival = null; if (!ctx.npcs.get(id)) ctx.cutscenes.play('arrival', id); }
  // the hollow is dark until the tunnel torch is lit
  ctx.darkness = Math.hypot(cx - 38, cy - 40) < 11 && b.body.z < 11 * T && !ctx.flags.tunnelLit ? (cx > 43 ? .15 : .35) : undefined;
};

// ---- drawing ----
DQ.sessionDraw = (ctx, r) => {
  const game = ctx.game, b = ctx.builder, w = ctx.world, R = ctx.renderer;
  R.drawVoid(r, ctx.clock && ctx.clock.isNight);
  R.queue(r, w);
  ctx.objects.draw(r);
  ctx.town.draw(r);
  ctx.drops.draw(r);
  for (const q of ctx.builders) q.draw(r);
  ctx.npcs.draw(r); ctx.monsters.draw(r);
  DQ.FX.draw(r);
  ctx.hud.drawWorld(r);
  if (DQ.Dev && DQ.Dev.drawWorld) DQ.Dev.drawWorld(ctx, r);
  if (ctx.roomLabel) { const L = ctx.roomLabel; r.queue(L.x, L.y, L.z, g => { const [sx, sy] = r.w(L.x, L.y, L.z + 10 + (3 - L.t) * 4); DQ.UI.center(g, L.text, sx, sy, '#ffd36a'); }, { bias: .1 }); }
  if (ctx.frayvern > 0) r.overlay(g => { const k = Math.min(1, ctx.frayvern); px.blend(g, .35 * k, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#100020')); const cx = r.W / 2, cy = r.H * .3, s = 60 * k; px.blend(g, .8 * k, 'normal', () => { px.poly(g, [[cx - s * 2.2, cy + s * .2], [cx - s * .4, cy - s * .5], [cx, cy - s * .2], [cx + s * .4, cy - s * .5], [cx + s * 2.2, cy + s * .2], [cx + s * .5, cy + s * .1], [cx, cy + s * .6], [cx - s * .5, cy + s * .1]], '#05020e'); }); if (k > .5) { px.disc(g, cx - 8, cy - 4, 2, '#ff3aff'); px.disc(g, cx + 8, cy - 4, 2, '#ff3aff'); } });
  // lights: objects add their own; glow blocks; the builder's own faint light at night
  if (game.lights.on) { const c = Math.floor(b ? b.body.x / T : 0), d = Math.floor(b ? b.body.y / T : 0); R.addLights(r, w, c - 14, d - 14, c + 14, d + 14); if (b) game.lights.add(b.body.x, b.body.y, b.body.z + 20, 40, .5, { color: '#ffe8c0' }); }
  ctx.clock.applyLight(game, ctx.region, ctx.darkness);
  ctx.hud.draw(r);
  ctx.talk.draw(r);
  ctx.ui.draw(r);
  if (ctx.turnFade > 0 || ctx.swirl > 0 || ctx.blackout > 0) r.overlay(g => { const k = Math.max(ctx.turnFade > 0 ? ctx.turnFade / .18 * .6 : 0, ctx.swirl > 0 ? 1 - Math.abs(ctx.swirl - .4) / .4 : 0, ctx.blackout || 0); px.blend(g, E.clamp(k, 0, 1), 'normal', () => px.rect(g, 0, 0, r.W, r.H, ctx.swirl > 0 ? '#2a1a4a' : '#05040c')); });
  if (ctx.cutscene && !ctx.cutscenes.skipT) r.overlay(g => { GLtxt(g, game, '{btn:cancel} Hold to skip', 8, 42); });
  if (ctx.cutscenes.skipT > 0) r.overlay(g => { const k = Math.min(1, ctx.cutscenes.skipT); const cx = r.W - 16, cy = 16; for (let i = 0; i < 24 * k; i++) { const a = -Math.PI / 2 + i / 24 * Math.PI * 2; px.rect(g, Math.round(cx + Math.cos(a) * 7), Math.round(cy + Math.sin(a) * 7), 2, 2, '#ffd36a'); } DQ.UI.text(g, 'Skip', cx - 34, cy - 3); });
};
function GLtxt(g, game, s, x, y) { DQ.Glyphs.text(g, game, s, x, y, '#c8c0e0'); }

// the siege failed: retry from the checkpoint or return to the title
DQ.openFail = (ctx) => {
  const why = ctx.failed === 'banner' ? 'The Banner has fallen...' : "You've come undone...";
  ctx.ui.close();
  ctx.ui.open('list', { title: why, items: [
    { label: 'Try again from the start of the siege', act: () => { ctx.ui.close(); ctx.failed = null; if (ctx.save) ctx.save.restoreCheckpoint('siege'); } },
    { label: 'Return to title', act: () => { ctx.ui.close(); ctx.game.go('title'); } }
  ], w: 280 }).onClose = () => { if (ctx.failed) { ctx.failed = null; if (ctx.save) ctx.save.restoreCheckpoint('siege'); } };
};

// ---- story beats: dev mode and tests jump to a consistent state ----
DQ.BEATS = ['start', 'banner', 'lv2', 'lv3', 'lv4', 'hall', 'ripper', 'spire', 'siege', 'boss', 'clear'];
DQ.buildRoom = (ctx, x0, y0, w, d, o = {}) => {
  // walls 2 high (3 with a roof) around a w x d interior, a door on the south wall, a torch, furniture inside
  const W = ctx.world, L = o.L || W.topZ(x0 + 1, y0 + 1), mat = DQ.blockId(o.mat || 'planks');
  DQ.flatten(W, x0 - 1, y0 - 1, x0 + w, y0 + d, L);
  for (let y = y0 - 1; y <= y0 + d; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
    const edge = x === x0 - 1 || y === y0 - 1 || x === x0 + w || y === y0 + d;
    for (const ob of [W.objAt(x, y, L), W.objAt(x, y, L + 1)]) if (ob) ctx.objects.remove(ob, { silent: true, noRegrow: true });
    if (!edge) continue;
    const door = o.door !== false && x === x0 + (w >> 1) && y === y0 + d;
    for (let l = 0; l < (o.h || 2); l++) { if (door && l < 2) continue; const m = o.felt && l === 1 && (x + y) % 3 === 0 ? DQ.blockId('feltBlue') : mat; W.set(x, y, L + l, m, { silent: true, town: true }); }
    if (door) ctx.objects.add({ id: o.doorId || 'latticeDoor', x, y, z: L, facing: 1 }, { force: true, silent: true });
  }
  let k = 0; const spots = []; for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) spots.push([x, y]);
  for (const id of o.items || []) { const s = spots[k++]; if (s) ctx.objects.add({ id, x: s[0], y: s[1], z: L, facing: 1 }, { force: true, silent: true }); }
  W.recomputeTops(); ctx.rooms.mark();
  return { x0, y0, w, d, L };
};
DQ.applyBeat = (ctx, beat) => {
  const i = DQ.BEATS.indexOf(beat); if (i < 0) return false;
  const b = ctx.builder, Q = ctx.quests, done = ids => ids.forEach(id => { Q.st(id).state = 'done'; Q.st(id).step = DQ.quest(id).steps.length; }), act = id => Q.accept(id);
  const tp = (x, y) => { b.body.x = (x + .5) * T; b.body.y = (y + .5) * T; b.body.z = ctx.world.topZ(x, y) * T; ctx.world.escape(b.body); b.body.lastSafe = [b.body.x, b.body.y, b.body.z]; };
  ctx.skipCutscenes = true;
  if (i >= 1) { done(['m1']); ctx.flags.tunnelLit = true; ctx.flags.hasBanner = true; if (!ctx.town.planted) { ctx.town.plant(false); } done(['m2']); ctx.crafting.know('bench', true); ctx.crafting.know('latticeDoor', true); if (!ctx.npcs.get('wren')) ctx.npcs.arrive('wren', { quiet: true }); for (const p of DQ.WORLD.portals) ctx.objects.discover(p.id); tp(72, 79); }
  if (i >= 2) { DQ.buildRoom(ctx, 60, 70, 3, 3, { items: ['strawBed', 'torch'] }); DQ.buildRoom(ctx, 66, 82, 3, 3, { items: ['bench', 'chest', 'torch'] }); for (const r of ['strawBed', 'chest', 'planks', 'thread', 'thatch', 'cobbleClub']) ctx.crafting.know(r, true); done(['m3', 'm4']); ctx.town.cheer = Math.max(ctx.town.cheer, 40); while (ctx.town.level < 2) ctx.town.levelUp(true); ctx.npcs.arrive('mortimer', { quiet: true }); b.take('cobbleClub', 1, { quiet: true }); b.setEquip('weapon', 'cobbleClub'); }
  if (i >= 3) { DQ.buildRoom(ctx, 80, 72, 3, 3, { items: ['weaponRack', 'torch', 'torch'] }); DQ.buildRoom(ctx, 78, 83, 4, 3, { items: ['table', 'stool', 'stool', 'torch'] }); done(['m5', 'm6', 'm7']); b.spinUnlocked = true; b.hearts = Math.max(b.hearts, 1); ctx.town.cheer = Math.max(ctx.town.cheer, 130); while (ctx.town.level < 3) ctx.town.levelUp(true); ctx.npcs.arrive('marigold', { quiet: true }); ctx.flags.spin = true; }
  if (i >= 4) { DQ.buildRoom(ctx, 60, 86, 3, 3, { items: ['hearthPot', 'chest', 'torch'], mat: 'cobble' }); DQ.buildRoom(ctx, 84, 76, 3, 3, { items: ['forge', 'chest', 'torch'], mat: 'cobble' }); for (const r of ['hearthPot', 'forge', 'copperIngot', 'copperBodkin', 'copperBuckler', 'stew']) ctx.crafting.know(r, true); done(['m8', 'm9']); b.hearts = Math.max(b.hearts, 2); b.take('copperBodkin', 1, { quiet: true }); b.setEquip('weapon', 'copperBodkin'); ctx.crafting.crafted.copperIngot = 2; ctx.crafting.crafted.copperBodkin = 1; ctx.town.cheer = Math.max(ctx.town.cheer, 250); while (ctx.town.level < 4) ctx.town.levelUp(true); ctx.npcs.arrive('professor', { quiet: true }); }
  if (i >= 5) { const ch = ctx.objects.find(o => o.id === 'chest' && ctx.town.inBorder(o.x, o.y)); if (ch) { ch.townChest = true; ctx.flags.townChest = true; } ctx.flags.hallPlaced = true; DQ.flatten(ctx.world, 73, 60, 85, 70, 9); ctx.world.recomputeTops(); ctx.town.layPattern('hall', 74, 61, 9, 0); for (const c of ctx.town.pattern.cells) { if (c.block) ctx.world.set(c.x, c.y, c.z, c.block, { silent: true }); else ctx.objects.add({ id: c.obj, x: c.x, y: c.y, z: c.z, facing: c.facing }, { force: true, silent: true }); } ctx.world.recomputeTops(); ctx.town._patternCheck(); done(['m10']); ctx.crafting.know('ballista', true); b.hearts = 3; }
  if (i >= 6) { done(['m11']); ctx.flags.boss_buttonGolem = true; ctx.crafting.know('seamRipper', true); b.take('seamRipper', 1, { quiet: true }); b.setEquip('weapon', 'seamRipper'); ctx.crafting.crafted.seamRipper = 1; b.take('steelThread', 4, { quiet: true }); }
  if (i >= 7) { DQ.CUTSCENES.gateRip.apply(ctx); act('m12'); tp(124, 117); }
  if (i >= 8) { done(['m12']); b.take('goldenThread', 1, { quiet: true }); const p = ctx.objects.find(o => o.id === 'threadPedestal'); if (p) ctx.objects.remove(p, { silent: true }); act('m13'); tp(74, 79); for (const [x, y] of [[78, 74], [70, 72]]) ctx.objects.add({ id: 'ballista', x, y, z: ctx.world.topZ(x, y), facing: 0 }, { force: true, silent: true }); Q.st('m13').step = 1; }
  if (i >= 9) { Q.st('m13').step = 2; ctx.flags.siegeStarted = true; ctx.flags.siegeDone = true; done(['m13']); act('m14'); const m = ctx.siege.spawnBoss(); ctx.siege.active = false; }
  if (i >= 10) { const m = ctx.monsters.list.find(q => q.id === 'gnarlgrim'); if (m) { m.dead = true; m.deadT = 99; } ctx.flags.boss_gnarlgrim = true; DQ.CUTSCENES.finale.apply(ctx); done(['m14']); ctx.flags.chapterClear = true; }
  ctx.rooms.detect(); ctx.quests.update(0, true);
  ctx.skipCutscenes = false; ctx.pendingArrival = null;
  b.hp = b.maxHp; ctx.game.cam.snap = true;
  return true;
};
})();
