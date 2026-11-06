// Title, main menu, hero select, new hero, attract, touch-only. A state machine over the Play world.
import { buildModel, Rng, THREE } from '../../pixel-engine.js';
import { CLASSES, CLASS_IDS, SKILLS } from '../data/classes.js';
import { HERO_NAMES } from '../data/dialog.js';
import { LEGENDARIES, SET_FOR_CLASS, SETS } from '../data/items.js';
import { TAGLINE, TITLE } from '../data/meta.js';
import { DIFFICULTIES } from '../data/tuning.js';
import { addHero, newWorld } from '../sim/step.js';
import { enterZone, setDifficulty } from '../sim/world.js';
import { loadCampaign, loadHeroInto, saveCampaign, saveHero } from '../sim/serialize.js';
import { levelUp, refresh } from '../sim/hero.js';
import { makeItem } from '../sim/loot.js';
import { QUESTS } from '../sim/quests.js';
import { Actor } from '../view/actors.js';
import { MODELS } from '../view/models/props.js';
import { footer, prompt } from '../ui/glyphs.js';
import { drawIcon } from '../ui/hud.js';
import { Attract } from './attract.js';
import { blankSave, writeSave } from '../save/save.js';

const IDLE_ATTRACT = 600; // 10 s of frames.
export class Shell {
  constructor(ctx, game) { this.ctx = ctx; this.game = game; this.state = 'boot'; this.idle = 0; this.t = 0; this.frameN = 0; this.titleWorld = null; this.titleActors = []; this.sel = 0; this.heroSlot = 0; this.nameI = 0; this.diffI = 0; this.startI = 0; this.heroSel = 0; this.confirmDel = 0; this.rng = new Rng('shell'); this.attract = null; this.returnTo = 'title'; this.touchOnly = game.touchOnly; this.hub = false; this.creating = null; }
  get play() { return this.game.play; }
  get ui() { return this.game.ui; }
  boot(save) { this.game.save = save; this.game.settings.load(save.settings); this.toTitle(); }
  makeTitleWorld() {
    if (this.titleWorld) return;
    const w = newWorld({ seed: 7 }); enterZone(w, 'titlescene'); w.events.length = 0; w.mode = 'title'; this.titleWorld = w;
    this.play.begin(w, { local: [] }); this.play.view.update(w, 0.016, 1, {});
    const z = w.zone; const v = this.play.view; const add = (id, x, zz, s = 1, y = 0) => { const b = buildModel(id, { catalog: MODELS }); b.object.position.set(x, y, zz); b.object.scale.setScalar(s); b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); v.zone.root.add(b.object); return b.object; };
    this.belfry = add('belfry_scene', z.w / 2 - 6, z.h / 2 - 6, 0.85); for (const [dx, dz] of [[-2, 3], [3, -2], [3, 3]]) this.ctx.lights.request({ position: [z.w / 2 - 6 + dx, 5, z.h / 2 - 6 + dz], color: 0xffa060, intensity: 14, radius: 14, flicker: 'torch', priority: 3 });
    add('dead-tree', z.w / 2 + 4, z.h / 2 - 4); add('tombstone', z.w / 2 + 2, z.h / 2 + 3); add('tombstone', z.w / 2 + 5, z.h / 2 + 1); add('tombstone', z.w / 2 - 2, z.h / 2 + 4); add('tombstone', z.w / 2 - 5, z.h / 2 + 2);
    // Three heroes on plinths, for hero select.
    this.plinths = [];
    CLASS_IDS.forEach((c, i) => { const x = z.w / 2 + (i - 1) * 3.2 * 0.71; const zz = z.h / 2 + 7 - (i - 1) * 3.2 * 0.71; add('plinth', x, zz); const a = new Actor(this.ctx, `hero_${c}`, { x, z: zz }); a.root.position.y = 0.5; this.titleActors.push({ a, x, z: zz, c, y: 0.5 }); this.plinths.push({ x, z: zz }); this.ctx.lights.request({ position: [x, 3, zz + 1], color: 0xffc080, intensity: 8, radius: 7, flicker: 'torch', priority: 2 }); });
    v.ambient(w);
  }
  dropTitle() { for (const t of this.titleActors) t.a.dispose(); this.titleActors = []; this.titleWorld = null; this.belfry = null; }
  toTitle() { this.state = this.touchOnly ? 'touch' : 'title'; this.idle = 0; this.t = 0; this.makeTitleWorld(); this.game.music.play('vespers'); this.ui.focus = null; }
  toMenu() { if (!this.titleWorld) { this.play.stop(); this.makeTitleWorld(); } this.state = 'menu'; this.idle = 0; this.ui.focus = null; this.game.music.play('vespers'); }
  fixed(dt) { if (this.state === 'play') this.play.fixed(dt); else if (this.state === 'attract') this.play.fixed(dt); else if (this.titleWorld) this.titleWorld.time += dt; }
  update(dt) {
    this.frameN++; this.t += 1 / 60;
    const r = this.game.router;
    const stateIn = this.state;
    if (stateIn === 'play') { this.play.update(dt); return; }
    if (stateIn === 'attract') { this.updateAttract(dt); return; }
    if (stateIn === 'boot') return;
    // Title world idles behind every shell screen.
    if (this.titleWorld && this.play.world === this.titleWorld) this.updateTitleWorld(dt);
    if (r.anyInput) this.idle = 0; else this.idle++;
    if ((stateIn === 'title' || stateIn === 'menu' || stateIn === 'touch') && this.idle >= IDLE_ATTRACT) { this.startAttract(stateIn); return; }
    const fn = this[`draw_${stateIn}`]; if (fn) fn.call(this, this.ui, this.ui.m);
  }
  updateTitleWorld(dt) {
    const w = this.titleWorld; const v = this.play.view; const z = w.zone;
    const hs = this.state === 'heroselect' || this.state === 'newhero' || this.state === 'heroes';
    const cx = hs ? z.w / 2 : z.w / 2 + Math.sin(this.t * 0.1) * 2 - 8; const cz = hs ? z.h / 2 + 7 : z.h / 2 + Math.cos(this.t * 0.1) * 2 - 8;
    this.play.target.set(cx, 0.9, cz); v.focus.set(cx, 0, cz); this.ctx.camera.setZoom(hs ? 1.3 : 0.62);
    for (const t of this.titleActors) { t.a.update(dt, t.x, t.z, 0.8, false, { y: t.y }); if (t.a.root.position.y !== t.y) t.a.root.position.y = t.y; }
    v.fx.update(dt); v.zone.update(dt, v.focus, this.ctx.time);
    if (v.rng.chance(0.4)) this.ctx.particles.burst('emberfall', [cx + v.rng.range(-14, 14), 0.1, cz + v.rng.range(-10, 10)], { count: 1 });
    if (this.frameN % 400 === 1) this.ctx.audio.play('bell_small', { volume: 0.3, pitch: -12 });
  }
  draw_title(ui, m) {
    const big = ui.measure(TITLE, 4) < ui.W - 24 ? 4 : ui.measure(TITLE, 3) < ui.W - 24 ? 3 : 2;
    ui.textC(ui.W / 2, ui.H * 0.2, TITLE, { color: 'sand', scale: big });
    ui.textC(ui.W / 2, ui.H * 0.2 + 7 * big + 8, TAGLINE, { color: 'mist' });
    if (this.frameN % 80 < 56) ui.textC(ui.W / 2, ui.H * 0.72, 'PRESS ANY BUTTON', { color: 'white', scale: 1 });
    if (!this.ctx.audio.unlocked && this.game.router.lastDevice === 'pad') ui.textC(ui.W / 2, ui.H * 0.72 + 12, 'PRESS A KEY OR CLICK FOR SOUND', { color: 'mist' });
    if (this.game.router.anyInput && !this.game.router.pointerMoved && this.t > 0.3) { this.state = 'menu'; this.idle = 0; ui.focus = null; this.ctx.audio.play('bell_small'); this.ctx.input.clearQueued(); }
  }
  hasSave() { return this.game.save.heroes.some(Boolean); }
  draw_menu(ui, m) {
    const big = ui.measure(TITLE, 3) < ui.W - 24 ? 3 : 2; ui.textC(ui.W / 2, 22, TITLE, { color: 'sand', scale: big });
    const s = this.game.save; const knellOpen = s.unlocks.knell;
    const items = [];
    if (this.hasSave()) items.push(['CONTINUE', () => { this.state = 'heroes'; ui.focus = null; }]);
    items.push(['NEW HERO', () => { this.beginNew(); }]);
    items.push([knellOpen ? 'KNELL RUNS' : 'KNELL RUNS (LOCKED)', () => { if (knellOpen && this.hasSave()) { this.afterLoad = 'knell'; this.state = 'heroes'; ui.focus = null; } else { this.ctx.audio.play('ui_error'); } }, !knellOpen]);
    items.push(['SETTINGS', () => { this.state = 'settings'; ui.focus = null; }]);
    items.push(['ABOUT', () => { this.state = 'about'; ui.focus = null; this.aboutS = { tab: 0 }; }]);
    const y0 = Math.max(60, ui.H * 0.34); const rowH = 22;
    items.forEach(([label, fn, dis], i) => { if (ui.button(`m:${label}`, ui.W / 2 - 80, y0 + i * rowH, 160, rowH - 3, label, { disabled: dis })) fn(); });
    footer(ui, [['confirm', 'CHOOSE']]);
    if (m.back) { this.state = 'title'; this.t = 0; ui.focus = null; }
  }
  draw_settings(ui, m) { this.game.settings.draw(ui, this.setS ??= {}, m); this.game.persist?.(true); if (m.back) { this.state = this.settingsBack ?? 'menu'; ui.focus = null; } }
  draw_about(ui, m) { const s = this.aboutS; this.play.menus.screen_about(ui, s, this.titleWorld, null, m); if (m.back) { this.state = 'menu'; ui.focus = null; } }
  draw_touch(ui, m) {
    ui.rect(0, ui.H * 0.3, ui.W, 40, 'ink');
    const lines = ui.wrap('CONTROLLER OR KEYBOARD REQUIRED', Math.min(ui.W - 16, 300), 1);
    lines.forEach((l, i) => ui.textC(ui.W / 2, ui.H * 0.3 + 8 + i * 10, l, { color: 'sand' }));
    const big = ui.measure(TITLE, 3) < ui.W - 24 ? 3 : ui.measure(TITLE, 2) < ui.W - 24 ? 2 : 1; ui.textC(ui.W / 2, 14, TITLE, { color: 'sand', scale: big });
    const r = this.game.router; if (r.lastDevice === 'pad' && r.anyInput || this.ctx.input.queuedPresses.some((k) => k.startsWith('Key') || k === 'Enter')) { this.touchOnly = false; this.state = 'menu'; this.idle = 0; ui.focus = null; }
  }
  // Heroes: up to three slots; deletion with a hold to confirm.
  draw_heroes(ui, m) {
    ui.rect(0, 0, ui.W, 26, 'ink'); ui.textC(ui.W / 2, 8, 'YOUR HEROES', { color: 'sand' });
    const s = this.game.save; const y0 = ui.H - 96;
    s.heroes.forEach((h, i) => {
      const x = 12 + i * ((ui.W - 24) / 3); const w = (ui.W - 24) / 3 - 4; const id = `hs:${i}`; const st = ui.widget(id, x, y0, w, 62, {});
      ui.frame(x, y0, w, 62, st.focused ? 'sand' : 'slate', st.focused ? 'plum' : 'ink');
      if (h) {
        ui.text(x + 5, y0 + 5, h.name.slice(0, Math.floor((w - 10) / 6)), { color: 'white' }); ui.text(x + 5, y0 + 15, `LV ${h.level} ${CLASSES[h.cls].name}`, { color: CLASSES[h.cls].color });
        const qname = QUESTS[h.campaign?.story?.q ?? 0]?.name ?? 'THE BELL RINGS TRUE'; ui.text(x + 5, y0 + 25, qname.slice(0, Math.floor((w - 10) / 6)), { color: 'mist' }); ui.text(x + 5, y0 + 35, DIFFICULTIES[h.campaign?.difficulty ?? 0].name, { color: 'mist' });
        if (st.focused) this.heroSel = i;
      } else ui.textC(x + w / 2, y0 + 26, 'EMPTY', { color: 'mist' });
      if (st.act) { if (h) this.loadHero(i); else this.beginNew(i); }
    });
    // Show the hovered hero's class on the plinth by turning them to camera.
    const held = m.x === false && (this.ctx.input.isDown('KeyX') || this.game.router.pads.some((p) => (p.b & 4) !== 0));
    const fh = s.heroes[this.heroSel];
    if (fh && held && this.ui.focus?.startsWith('hs:')) { this.confirmDel += 1 / 60; ui.bar(ui.W / 2 - 60, ui.H - 30, 120, 6, this.confirmDel / 1.5, 'red'); if (this.confirmDel >= 1.5) { s.heroes[this.heroSel] = null; this.confirmDel = 0; this.game.persist?.(true); this.ctx.audio.play('ui_salvage'); } } else this.confirmDel = 0;
    footer(ui, [['confirm', 'PLAY'], ['x', 'HOLD TO DELETE'], ['back', 'BACK']]);
    if (m.back) { this.afterLoad = null; this.state = 'menu'; ui.focus = null; }
  }
  beginNew(slot = null) {
    const s = this.game.save; const free = slot ?? s.heroes.findIndex((h) => !h);
    if (free < 0) { this.state = 'heroes'; this.ctx.audio.play('ui_error'); return; }
    this.creating = { slot: free, cls: 0, name: this.rngName(), diff: 0, step: 0 }; this.state = 'newhero'; this.ui.focus = null;
  }
  rngName() { return HERO_NAMES[Math.floor(this.rng.next() * HERO_NAMES.length)]; }
  draw_newhero(ui, m) {
    const c = this.creating;
    const col = (ui.W - 24) / 3;
    if (c.step === 0) {
      ui.rect(0, 0, ui.W, 26, 'ink'); ui.textC(ui.W / 2, 8, 'PICK A TRADE', { color: 'sand' });
      CLASS_IDS.forEach((id, i) => {
        const x = 12 + i * col; const w = col - 4; const y = ui.H - 112; const st = ui.widget(`cl:${id}`, x, y, w, 82, {}); const k = CLASSES[id];
        ui.frame(x, y, w, 82, st.focused ? 'sand' : 'slate', st.focused ? 'plum' : 'ink'); ui.text(x + 5, y + 4, k.name, { color: k.color }); ui.para(x + 5, y + 14, k.fantasy, w - 10, { color: 'mist', lh: 8 });
        ui.text(x + 5, y + 44, k.resource.toUpperCase(), { color: 'sand' }); k.signature.forEach((sid, n) => { const sk = SKILLS[sid]; drawIcon(ui, x + 5 + n * 18, y + 54, sk.icon); });
        if (st.focused) { if (c.cls !== i) { c.cls = i; this.titleActors[i]?.a.play('Triumph', 1.2); } }
        if (st.act) { c.cls = i; c.step = 1; ui.focus = null; this.titleActors[i]?.a.play('Triumph', 1.2); }
      });
      footer(ui, [['confirm', 'CHOOSE'], ['back', 'BACK']]);
      if (m.back) { this.state = 'menu'; ui.focus = null; }
    } else if (c.step === 1) {
      ui.rect(ui.W / 2 - 130, 30, 260, ui.H - 60, 'ink');
      ui.textC(ui.W / 2, 38, `A ${CLASSES[CLASS_IDS[c.cls]].name}`, { color: CLASSES[CLASS_IDS[c.cls]].color, scale: 2 });
      ui.textC(ui.W / 2, 62, c.name, { color: 'white' });
      if (ui.button('n:shuffle', ui.W / 2 - 110, 74, 220, 16, 'SHUFFLE THE NAME')) c.name = this.rngName();
      ui.text(ui.W / 2 - 110, 96, 'DIFFICULTY', { color: 'mist' });
      const ds = DIFFICULTIES.filter((d) => !d.locked);
      ds.forEach((d, i) => { if (ui.button(`n:d${i}`, ui.W / 2 - 110 + i * 74, 106, 72, 16, d.name, { border: c.diff === i ? 'sand' : 'slate' })) c.diff = i; });
      ui.text(ui.W / 2 - 110, 128, 'WHERE TO BEGIN', { color: 'mist' });
      if (ui.button('n:begin', ui.W / 2 - 110, 138, 220, 18, 'THE BEGINNING')) this.startNew(false);
      if (ui.button('n:last', ui.W / 2 - 110, 158, 220, 18, 'THE LAST BELL (LEVEL 30)')) this.startNew(true);
      const f = ui.focus === 'n:last'; const hint = f ? 'ALL SKILLS, LEGENDARIES, A SET, GEMS, DEVOTION, A GRAND KEY.' : ui.focus === 'n:begin' ? 'FROM THE GROUND UP. ABOUT AN HOUR TO THE CREDITS.' : ''; if (hint) { const lines = ui.wrap(hint, 240); lines.forEach((l, i) => ui.textC(ui.W / 2, 180 + i * 9, l, { color: 'sand' })); }
      footer(ui, [['confirm', 'CHOOSE'], ['back', 'BACK']]);
      if (m.back) { c.step = 0; ui.focus = null; m.back = false; }
    }
  }
  // New game seeds are chosen here and passed through ctx.input.send, so they replay.
  startNew(lastBell) {
    const c = this.creating; const cls = CLASS_IDS[c.cls]; const seed = (this.rng.next() * 1e9) | 0;
    const w = newWorld({ seed, difficulty: c.diff }); this.leaveTitle();
    const h = addHero(w, { seat: 0, cls, name: c.name });
    this.heroSlot = c.slot; this.game.world = w;
    this.applyShared(w);
    if (lastBell) {
      this.setupLastBell(w, h);
      w.events.length = 0;
      enterZone(w, 'town');
      this.enterPlay(w);
      this.game.persist?.(true);
    } else {
      enterZone(w, 'yard');
      const p = w.props; void p;
      this.enterPlay(w);
      this.play.playScene({ black: true, lines: [[0.6, 6.4, 'narrator', 'For a thousand years Old Clemency tolled at dusk, and the dead of Vespermoor stayed down.'], [6.8, 12.4, 'narrator', 'Forty days ago the Great Bell cracked. It still tolls. It now says something else.'], [12.8, 18, 'narrator', 'You were buried on the thirty-ninth day. It did not take.']], cues: [{ at: 0.2, run: () => this.ctx.audio.play('bell_cracked') }, { at: 12.8, run: () => this.ctx.audio.play('bell_cracked', { volume: 0.5 }) }], duration: 18.5, after: () => { this.onRise(w, h); } });
      this.game.persist?.(true);
    }
  }
  onRise(w, h) { const a = this.play.view.heroes.get(h.id); a?.play('GetUp', 1.2); this.ctx.engine.shake.add(0.4); this.ctx.audio.play('coffin_crash'); this.ctx.particles.burst('bone_chips', [h.x, 0.5, h.z], { count: 26, colors: ['plum', 'mist'] }); }
  setupLastBell(w, h) {
    while (h.level < 30) levelUp(w, h);
    h.xp = 0; const rng = w.rngs.loot; h.gold = 25000;
    h.mats = { scrap: 120, dust: 60, shards: 30, keys: 1 };
    const legs = LEGENDARIES.filter((l) => l.cls === h.cls).slice(0, 2).concat(LEGENDARIES.filter((l) => !l.cls).slice(0, 1));
    for (const l of legs) { const it = makeItem(rng, { legendary: l.id, ilvl: 30, cls: h.cls }); const old = h.gear[it.slot]; h.gear[it.slot] = it; if (old) h.inv.push(old); }
    const set = SET_FOR_CLASS[h.cls];
    for (const slot of ['head', 'feet']) h.gear[slot] = makeItem(rng, { slot, set, ilvl: 30, cls: h.cls });
    for (const slot of ['shoulders', 'legs', 'amulet', 'ring', 'off', 'hands', 'chest']) if (!h.gear[slot]) h.gear[slot] = makeItem(rng, { slot, rarity: 'reliquary', ilvl: 29, cls: h.cls });
    for (const slot of ['chest', 'hands']) h.inv.push(makeItem(rng, { slot, set, ilvl: 30, cls: h.cls }));
    if (!h.gear.main) h.gear.main = makeItem(rng, { slot: 'main', rarity: 'reliquary', ilvl: 29, cls: h.cls });
    h.gems = { 'ember:1': 3, 'salt:1': 3, 'amber:1': 3 };
    const all = CLASSES[h.cls].skills;
    h.slots = [all[0], all[3], all[4], all[5], all[6], all[7]].map((s, i) => ({ skill: s.id, tone: Object.keys(s.tones)[i % 3] }));
    h.vows = [CLASSES[h.cls].vows[0].id, CLASSES[h.cls].vows[1].id];
    w.devotion.bonus = 5; w.unlocks.knell = true; w.unlocks.penance = true;
    w.story.q = QUESTS.length; w.story.step = 0; w.story.flags = { ...w.story.flags, brasseOpen: true, writsOpen: true, talk_ogive2: true, lastBell: true, pyx: false };
    w.story.lychgates = ['town', 'causeway', 'ossuary1', 'ossuary2', 'ossuary3', 'cloister', 'belfry1', 'belfry2', 'belfry3'];
    refresh(w, h); h.hp = h.stats.maxHp; h.res = h.stats.maxResource;
  }
  applyShared(w) { const s = this.game.save; w.stash = s.stash; w.devotion = s.devotion; w.unlocks = s.unlocks; w.bests = s.bests; }
  loadHero(i) {
    const s = this.game.save; const data = s.heroes[i]; if (!data) return;
    const c = data.campaign ?? {};
    const w = newWorld({ seed: c.seed ?? 11, difficulty: c.difficulty ?? 0 }); this.leaveTitle();
    const h = addHero(w, { seat: 0, cls: data.cls, name: data.name });
    this.applyShared(w);
    loadCampaign(w, c); w.bossKills = c.bossKills ?? w.bossKills;
    loadHeroInto(w, h, data);
    setDifficulty(w, c.difficulty ?? 0);
    this.heroSlot = i; this.game.world = w;
    enterZone(w, w.story.q >= 1 || w.story.flags?.lastBell ? 'town' : 'yard');
    this.enterPlay(w);
    if (this.afterLoad === 'knell') { this.afterLoad = null; this.play.menus.push('knell'); }
  }
  leaveTitle() { this.dropTitle(); this.play.stop(); }
  enterPlay(w) { this.state = 'play'; const bots = this.game.testBot ? { 0: true } : {}; this.play.begin(w, { local: [0], bots }); this.ctx.input.clearQueued(); }
  onEnding() {
    const w = this.play.world;
    this.game.persist?.(true);
    this.play.music.play('clemency');
    this.play.playScene({ black: (t) => t > 9, lines: [[1, 6, 'narrator', 'And the hand of the Late closed upon the rope, and Old Clemency spoke, and the word it spoke was true.'], [6.4, 11, 'malison', 'EVERY VERSE. I KNOW EVERY VERSE. I ONLY WANTED SOMEONE TO HEAR THE LAST ONE.'], [11.4, 17, 'narrator', 'The Unrung Saint came apart like old mortar. The dead of Vespermoor lay down, grumbling, and dawn came up over the moor.'], [17.4, 20.5, 'crier', 'Hear ye, hear ye! The fish is still off.'], [36, 41.5, 'narrator', 'And far below, under the foundation, under the peat, a much deeper bell answered.']],
      cues: [{ at: 0.3, run: () => { this.ctx.audio.play('bell_true'); this.ctx.engine.screen.flash('sand', { duration: 1 }); } }, { at: 36, run: () => this.ctx.audio.play('bell_big', { pitch: -12 }) }], duration: 43,
      credits: (ui, t) => { if (t < 21 || t > 35.5) return; const lines = [TITLE, ' ', 'A GAME OF THE BELL, THE PEAT AND THE LATE', ' ', 'WRITTEN, DRAWN AND RUNG', 'BY CLAUDE OPUS 5.5', ' ', 'ON THE PIXEL ENGINE', ' ', 'PENANCE IS UNLOCKED', 'THE KNELL FONT ANSWERS NOW', ' ', 'THANK YOU FOR PLAYING']; const y0 = ui.H - (t - 21) * 18; lines.forEach((l, i) => { const y = y0 + i * 14; if (y > 10 && y < ui.H - 10) ui.textC(ui.W / 2, y, l, { color: i === 0 ? 'sand' : 'white' }); }); },
      after: () => { this.game.endingSeen = true; if (w.zone.id !== 'town') enterZone(w, 'town'); this.play.music.play('lamps'); this.game.persist?.(true); this.play.hud.toast('THE KNELL FONT ANSWERS NOW. PENANCE IS UNLOCKED.', 'sand', { big: true }); } });
  }
  // Attract: any input goes straight back to where it was.
  startAttract(from) {
    this.returnTo = from; this.leaveTitle(); this.state = 'attract';
    this.attract = new Attract(this.ctx, this.game, this.play); this.attract.start();
    this.attractLoops = 0;
  }
  startAttractFromDev() { this.play.menus.closeAll(); this.game.persist?.(true); this.startAttract('menu'); }
  updateAttract(dt) {
    const r = this.game.router;
    this.attract.update(dt);
    this.play.update(dt);
    this.attract.draw(this.ui, this.touchOnly);
    if (r.anyInput && this.attract.age > 0.05) {
      if (this.touchOnly && r.lastDevice !== 'pad') { if (this.ctx.input.queuedPresses.some((k) => k.startsWith('Key') || k === 'Enter')) this.touchOnly = false; else { /* A tap only returns to the message. */ this.exitAttract(); return; } }
      this.exitAttract();
    } else if (r.touched && this.touchOnly) this.exitAttract();
  }
  exitAttract() { this.attract.stop(); this.attract = null; this.play.stop(); this.ctx.engine.screen.clear(); this.makeTitleWorld(); this.state = this.touchOnly ? 'touch' : this.returnTo; this.idle = 0; this.t = 0; this.game.music.play('vespers'); this.ui.focus = null; this.ctx.input.clearQueued(); }
}
export { saveCampaign, saveHero, blankSave, writeSave, prompt, SETS };
