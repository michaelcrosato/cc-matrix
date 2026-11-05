// Starting a session, the per-step play update, saving and loading, the dev panel.
(() => {
const { E, T } = DQ;
const ev = DQ.events;
const cellC = c => c * T + 8;
DQ.settings = {};   // mirrored from game.settings each frame
DQ.cam = { x: 0, y: 0, z: 0 };

// ---------- new session ----------
DQ.startSession = function (mode, o = {}) {
  DQ.reseed(o.seed || DQ.SEED); DQ.clearBlockHp && DQ.clearBlockHp(); DQ.fade = 0; DQ.crack = null; DQ.ended = false;
  const S = DQ.S = DQ.newState(mode); S.name = o.name || 'Patch'; S.look = o.look || 0; S.swatch = o.swatch || 0;
  S.world = mode === 'bee' ? DQ.generateBee() : DQ.generateStory();
  const sp = mode === 'bee' ? [18, 22] : DQ.POI.start;
  DQ.makeHero(cellC(sp[0]), cellC(sp[1]));
  DQ.inv.add('stick', 1, true); DQ.notionCheck('start', 'x'); DQ.inv.equipBest(); DQ.syncWeaponLook();
  S.hero.heal = 0;
  if (mode === 'bee') DQ.Bee.setup(o);
  DQ.cam.x = S.hero.x; DQ.cam.y = S.hero.y;
  DQ.questTick();
  return S;
};
DQ.snapCam = function () { const S = DQ.S; DQ.cam.x = S.hero.x; DQ.cam.y = S.hero.y; DQ.game.cam.x !== undefined; };

// ---------- the step ----------
DQ.playUpdate = function (dt, o = {}) {
  const S = DQ.S, game = DQ.game, I = game.input, h = S.hero; if (!S) return;
  DQ.camTurnCd = Math.max(0, DQ.camTurnCd - dt);
  Object.assign(DQ.settings, game.settings || {});
  S.played += dt;
  DQ.hudTick(dt);
  // dialog/UI modal states
  const talking = DQ.talk && DQ.talk.update(dt);
  if (talking) { h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.facing }); animateOnly(dt); return; }
  if (DQ.ui.isOpen() && !o.attract) { DQ.ui.update(dt); animateOnly(dt); if (DQ.ui.isOpen()) return; }
  // cutscene skipping
  if (S.cut && !o.attract) { if (I.down('cancel') && S.cut.kind !== 'sleep') { S.cut.skipT = Math.min(1, S.cut.skipT + dt); if (S.cut.skipT >= 1) { S.cut.skip = true; if (DQ.talk.open) DQ.talk.close(); } } else S.cut.skipT = Math.max(0, S.cut.skipT - dt * 2); }
  if (!S.cut && !o.attract) {
    if (I.pressed('satchel')) DQ.ui.open('satchel', {}); else if (I.pressed('map')) DQ.ui.open('satchel', { tab: 3 }); else if (I.pressed('journal')) DQ.ui.open('satchel', { tab: 2 });
  }
  const intent = o.intent || DQ.readIntent(dt);
  if (S.cut) { intent.mx = intent.my = 0; intent.swingPressed = intent.placePressed = intent.interactPressed = intent.jump = false; }
  S.time += dt; if (!S.cut && S.mode === 'story') DQ.clockTick(dt, true);
  DQ.safe('hero', () => DQ.heroUpdate(dt, intent));
  DQ.safe('objects', () => DQ.objectsTick(dt));
  DQ.creaturesTick(dt);
  DQ.safe('drops', () => DQ.dropsTick(dt));
  DQ.townTick(dt); DQ.safe('pattern', () => DQ.patternTick(dt));
  S.qT = (S.qT || 0) - dt; if (S.dirtyQ || S.qT <= 0) { S.dirtyQ = false; S.qT = 1; DQ.safe('quests', () => DQ.questTick()); DQ.safe('arrivals', () => DQ.arrivalsTick()); }
  if (S.mode === 'story') { DQ.safe('spawn', () => DQ.spawnTick(dt)); DQ.safe('siege', () => DQ.siegeTick(dt)); }
  else DQ.safe('bee', () => DQ.Bee.update(dt));
  S.regT = (S.regT || 0) - dt; if (S.regT <= 0) { S.regT = .5; const reg = DQ.regionAt(Math.floor(h.x / T), Math.floor(h.y / T)); if (reg !== S.regionNow) { S.regionNow = reg; if (S.mode === 'story') DQ.toast(DQ.REGIONS[reg], '#c8e0ff'); } DQ.musicTick(); }
  // regrowth + autosave
  S.regrowT = (S.regrowT || 0) - dt; if (S.regrowT <= 0) { S.regrowT = 10; DQ.regrowTick(); }
  S.autoT = (S.autoT || 180) - dt; if (S.autoT <= 0) { S.autoT = 180; if (S.mode === 'story' && S.siege.phase === 'none' && !S.cut && !o.attract && DQ.Save) DQ.Save.autosave(); }
  // camera proxy
  const co = DQ.camOverride, tx = co ? co.x : h.x, ty = co ? co.y : h.y;
  DQ.cam.x += (tx - DQ.cam.x) * Math.min(1, dt * (co ? 10 : 9)); DQ.cam.y += (ty - DQ.cam.y) * Math.min(1, dt * (co ? 10 : 9)); DQ.cam.z = h.z;
  if (!o.attract) DQ.shimmer = 0;
  // rumble when hurt etc. is in hitFx
};
function animateOnly(dt) {
  const S = DQ.S;
  for (const r of S.residents) { r.t += dt; if (r.rig && r.rig.update) {} }
}

// ---------- save / load ----------
DQ.serialize = function () {
  const S = DQ.S, h = S.hero;
  return {
    v: 1, mode: S.mode, name: S.name, look: S.look, swatch: S.swatch, bag: S.bag, hotbar: S.hotbar, sel: S.sel, equip: S.equip, known: S.known, flags: S.flags,
    stats: S.stats, town: S.town, clock: S.clock, quests: S.quests, ready: S.ready || {}, offered: S.offered || {}, regrow: S.regrow || [], bundle: S.bundle, played: S.played,
    pattern: S.pattern ? { x0: S.pattern.x0, y0: S.pattern.y0 } : null, hero: { x: h.x, y: h.y, hp: h.hp, maxHp: h.maxHp, belly: h.belly }, tuning: DQ.tuning,
    residents: S.residents.map(r => ({ id: r.id, x: r.x, y: r.y })), edits: S.world.diff(),
    objs: S.world.list.map(o => ({ type: o.type, x: o.x, y: o.y, facing: o.facing, hp: o.hp, items: o.items, townChest: o.townChest, key: o.key, name: o.name, born: o.born })),
    siegeDone: S.siege.phase === 'done'
  };
};
DQ.deserialize = function (d) {
  const S = DQ.startSession(d.mode || 'story', { name: d.name, look: d.look, swatch: d.swatch });
  Object.assign(S, { bag: d.bag, hotbar: d.hotbar, sel: d.sel, equip: d.equip, known: d.known, flags: d.flags, stats: d.stats, town: d.town, clock: d.clock, quests: d.quests, ready: d.ready, offered: d.offered, regrow: d.regrow, bundle: d.bundle, played: d.played });
  S.stats.discovered = S.stats.discovered || {};
  const w = S.world; for (const o of w.list.slice()) w.removeObj(o, true);
  for (const o of d.objs) { const ob = w.addObj(o.type, o.x, o.y, { silent: true, facing: o.facing, gen: !o.born }); if (ob) { ob.hp = o.hp; ob.items = o.items; ob.townChest = o.townChest; ob.key = o.key; ob.name = o.name; ob.born = o.born; } }
  w.applyDiff(d.edits);
  if (d.pattern) S.pattern = { ...DQ.patternCells(d.pattern.x0, d.pattern.y0), ...d.pattern, t: 0 };
  const h = S.hero; Object.assign(h, d.hero); h.body = h; h.z = 0; h.vx = h.vy = 0;
  for (const r of d.residents) DQ.makeResident(r.id, r.x, r.y);
  if (d.siegeDone) { S.siege.phase = 'done'; }
  DQ.inv.equipBest(); DQ.syncWeaponLook(); DQ.cam.x = h.x; DQ.cam.y = h.y; S.bannerRise = 1;
  if (S.town.planted) { S.town.bannerHp = S.town.bannerHp || 300; DQ.updateRooms(); }
  return S;
};
DQ.Save = {
  autosave() { try { const g = DQ.game; if (g.saves && DQ.S && DQ.S.mode === 'story') g.saves.autosave(); } catch (e) { DQ.err('autosave', e); } },
  migrate(data, from) { return data; },
  install(game) {
    game.saves.write = () => { const S = DQ.S; return { data: DQ.serialize(), place: DQ.REGIONS[S.regionNow] || 'Thimble Glen', level: 'Town Lv ' + (S.town.level || 0) + ' · Day ' + S.clock.day }; };
    game.saves.read = save => { DQ.pendingLoad = save.data || save; game.go('play', { load: true }); };
    try { Object.defineProperty(game.saves, 'canSave', { get: () => !!(DQ.S && DQ.S.mode === 'story' && game.sceneName === 'play' && !DQ.S.cut && !['prep', 'wave', 'breather', 'boss'].includes(DQ.S.siege.phase)), configurable: true }); } catch (e) { game.saves.canSave = true; }
  }
};

// ---------- dev tools ----------
DQ.devOn = false; DQ.god = false;
const POIS = Object.keys(DQ.POI).filter(k => !['start'].includes(k));
const MON = Object.keys(DQ.MONSTERS), ITEMS = Object.keys(DQ.ITEMS);
DQ.PANELS.dev = class {
  constructor() { this.sel = 0; this.poi = 0; this.mon = 0; this.item = 0; this.sc = 0; this.rows = this.build(); }
  build() {
    const S = DQ.S, h = S.hero, rows = [];
    const act = (label, fn, getv) => rows.push({ label, fn, getv });
    act('God mode', d => { DQ.god = !DQ.god; }, () => DQ.god ? 'ON' : 'off');
    act('Show rooms and leaks', d => { DQ.devShowRooms = !DQ.devShowRooms; }, () => DQ.devShowRooms ? 'ON' : 'off');
    act('Heal and feed', d => { h.hp = h.maxHp; h.belly = 100; DQ.toast('Healed.', '#8affd0'); });
    act('Time of day', d => { if (d) { S.clock.hour = (S.clock.hour + d * 3 + 24) % 24; } else S.clock.hour = S.clock.hour < 12 ? 20 : 8; }, () => String(Math.floor(S.clock.hour)).padStart(2, '0') + ':00 (day ' + S.clock.day + ')');
    act('Teleport to', d => { if (d) this.poi = (this.poi + d + POIS.length) % POIS.length; else { const p = DQ.POI[POIS[this.poi]]; h.x = cellC(p[0]); h.y = cellC(p[1]) + 16; h.z = 0; DQ.snapCam(); DQ.ui.closeAll(); } }, () => POIS[this.poi]);
    act('Give item (x10)', d => { if (d) this.item = (this.item + d + ITEMS.length) % ITEMS.length; else DQ.inv.add(ITEMS[this.item], DQ.ITEMS[ITEMS[this.item]].stack === 1 ? 1 : 10); }, () => DQ.ITEMS[ITEMS[this.item]].name);
    act('Give all basics', d => { for (const k of ['felt', 'plank', 'cobble', 'woolblock', 'branch', 'cotton', 'straw', 'lint', 'copperthread', 'steelthread', 'door', 'torch', 'bed', 'chest']) DQ.inv.add(k, 20, true); DQ.inv.add('workbench', 2, true); DQ.inv.add('hearth', 1, true); DQ.inv.add('forge', 1, true); DQ.toast('Stocked!', '#ffe9a0'); });
    act('Learn all notions', d => { for (const r of DQ.RECIPES) DQ.learn(r, 'dev'); });
    act('Upgrade weapon', d => { const order = ['stick', 'club', 'bodkin', 'ripper']; const i = Math.max(...order.map((k, j) => DQ.inv.count(k) ? j : -1)); DQ.inv.add(order[Math.min(3, i + 1)], 1); });
    act('Spawn monster', d => { if (d) this.mon = (this.mon + d + MON.length) % MON.length; else { DQ.spawnMonster(MON[this.mon], h.x + 40, h.y, { siege: false }); DQ.ui.closeAll(); } }, () => MON[this.mon]);
    act('Kill all monsters', d => { for (const m of S.monsters) if (m.hp > 0) { m.hp = 0; DQ.killMonster(m); } });
    act('Add 25 Cheer', d => { DQ.addCheer(25, 'dev'); });
    act('Jump to story beat', d => { const names = ['plant', 'rooms', 'forge', 'ripper', 'siege']; if (d) this.sc = (this.sc + d + names.length) % names.length; else { DQ.devBeat(names[this.sc]); DQ.ui.closeAll(); } }, () => ['plant', 'rooms', 'forge', 'ripper', 'siege'][this.sc]);
    act('Start siege now', d => { if (S.town.planted) { S.flags.siegeStarted = true; DQ.siegeStart(); DQ.ui.closeAll(); } else DQ.toast('Plant the Banner first.', '#ff8a8a'); });
    act('Slow motion', d => { DQ.game.timeScale = DQ.game.timeScale < 1 ? 1 : .35; }, () => DQ.game.timeScale < 1 ? 'ON' : 'off');
    act('Auto-save now', d => { DQ.Save.autosave(); DQ.toast('Saved.', '#8affd0'); });
    for (const def of DQ.TUNING_DEFS) rows.push({ label: def.label, slider: def, getv: () => (+DQ.tuning[def.key]).toFixed(def.step < 1 ? 2 : 0) });
    rows.push({ label: 'Reset sliders to defaults', fn: () => { DQ.resetTuning(); DQ.toast('Defaults restored.', '#8affd0'); } });
    rows.push({ label: 'Close', fn: () => DQ.ui.close() });
    return rows;
  }
  update(dt, I) {
    if (I.pressed('cancel') || I.pressed('pause')) { DQ.ui.close(); return; }
    const [dx, dy] = DQ.navStep(I); if (dy) this.sel = (this.sel + dy + this.rows.length) % this.rows.length;
    const r = this.rows[this.sel];
    if (r.slider) { if (dx) { const d = r.slider; DQ.tuning[d.key] = Math.max(d.min, Math.min(d.max, Math.round((DQ.tuning[d.key] + dx * d.step) / d.step) * d.step)); } }
    else if (dx && r.fn) r.fn(dx); if (I.pressed('confirm') && r.fn) r.fn(0);
  }
  draw(g, r) {
    const w = Math.min(r.W - 30, 330), x = (r.W - w) / 2, y = 6, ht = r.H - 12; DQ.stitchBox(g, x, y, w, ht, { border: '#7aff7a' });
    DQ.F(g, 'DEV TOOLS', x + w / 2, y + 8, '#7aff7a', { align: 'center' });
    const per = 15, page = Math.floor(this.sel / per);
    for (let i = 0; i < per; i++) {
      const idx = page * per + i, row = this.rows[idx]; if (!row) break; const yy = y + 20 + i * 11, sel = idx === this.sel;
      E.px.rect(g, x + 8, yy, w - 16, 10, sel ? '#ffd36a' : '#241e46'); DQ.F(g, row.label, x + 12, yy + 1, sel ? '#2a1a00' : '#fff', { shadow: sel ? null : '#000' });
      if (row.getv) DQ.F(g, row.getv(), x + w - 12, yy + 1, sel ? '#2a1a00' : '#8affd0', { align: 'right', shadow: sel ? null : '#000' });
      if (row.slider) { const f = (DQ.tuning[row.slider.key] - row.slider.min) / (row.slider.max - row.slider.min); E.px.rect(g, x + w - 90, yy + 8, 60, 1, sel ? '#2a1a00' : '#6a64a0'); E.px.rect(g, x + w - 90 + Math.round(f * 60), yy + 6, 2, 4, sel ? '#2a1a00' : '#ffd36a'); }
      DQ.ui.hit(x + 8, yy, w - 16, 10, { focus: () => { this.sel = idx; }, click: () => { this.sel = idx; if (row.fn) row.fn(0); } });
    }
    DQ.prompts(g, [['confirm', 'Do'], ['left', 'Adjust'], ['cancel', 'Close']], x + 10, y + ht - 14);
  }
};
DQ.openDev = function () { if (DQ.hubSession) return; DQ.devOn = true; DQ.ui.open('dev'); };
// jump to story beats (dev + tests)
DQ.devBeat = function (name) {
  const S = DQ.S, h = S.hero; const give = (o) => { for (const [k, n] of Object.entries(o)) DQ.inv.add(k, n, true); };
  const done = id => { if (S.quests[id] !== 'done') { S.quests[id] = 0; DQ.finishQuest(DQ.questById(id)); } };
  if (['plant', 'rooms', 'forge', 'ripper', 'siege'].includes(name)) {
    for (const q of ['stitch', 'gather']) done(q);
    S.flags.thimbleDone = true; for (const k of ['felt', 'plank', 'cobble']) give({ [k]: 30 });
    if (!S.town.planted) { S.flags.planted = true; DQ.plantBanner(DQ.POI.banner[0], DQ.POI.banner[1]); S.bannerRise = 1; if (S.bag.banner) delete S.bag.banner; DQ.finishQuestIfNeeded && 0; S.quests.thimbleton = 0; DQ.finishQuest(DQ.questById('thimbleton')); }
    h.x = cellC(DQ.POI.banner[0]); h.y = cellC(DQ.POI.banner[1]) + 24; DQ.snapCam();
    for (const id of ['wren']) DQ.arriveResident(id);
  }
  if (['rooms', 'forge', 'ripper', 'siege'].includes(name)) { DQ.addCheer(60, 'dev'); for (const id of ['mortimer', 'marigold']) DQ.arriveResident(id); }
  if (['forge', 'ripper', 'siege'].includes(name)) { DQ.addCheer(60, 'dev'); DQ.arriveResident('selvage'); DQ.arriveResident('lintwick'); for (const q of ['wrenbed', 'guard', 'kitchen', 'supper', 'forge']) done(q); give({ copperthread: 12, plank: 20, cobble: 30, lint: 12, copperore: 5 }); for (const k of ['club', 'bodkin']) DQ.inv.add(k, 1, true); for (const r of DQ.RECIPES) DQ.learn(r, 'dev'); done('copper'); }
  if (['ripper', 'siege'].includes(name)) { for (const q of ['buttons']) done(q); S.flags.boss_buttons = true; give({ needle: 1, steelthread: 8 }); DQ.inv.add('ripper', 1, true); DQ.addCheer(120, 'dev'); done('ripper'); }
  if (name === 'siege') { give({ ballista: 2 }); DQ.inv.add('vest', 1, true); DQ.inv.add('shield', 1, true); DQ.inv.add('heartpatch', 3, true); }
  DQ.inv.equipBest(); DQ.syncWeaponLook(); DQ.questTick();
};
})();
