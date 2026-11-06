// The Game object: one for the whole session. Zones swap inside it, so recordings cover everything.
import { LOOK_PRESETS, MODEL_LIBRARY, PALETTE, Rng, THREE } from '../../pixel-engine.js';
import { AudioSys } from '../audio/audio.js';
import { CLASSES, PLAYABLE } from '../data/classes.js';
import { TITLE } from '../data/meta.js';
import { QUESTS } from '../data/quests.js';
import { InputRouter } from '../input/router.js';
import { defaultSettings, emptySave, HERO_SLOTS, readSave, writeSave } from '../save/save.js';
import { botAfter, botIntent, botManage, newBotMemory } from '../sim/bot.js';
import { applyCommand } from '../sim/commands.js';
import { addHero, heroToData, newHeroData, recalcHero, gearLook } from '../sim/hero.js';
import { emptyIntent } from '../sim/intents.js';
import { makeItem, makeRolledItem } from '../sim/loot.js';
import { newCampaign, questInit, ensurePyx } from '../sim/quests.js';
import { loadZone } from '../sim/travel.js';
import { beginCampaign, createWorld, stepWorld, worldHash } from '../sim/world.js';
import { AttractTour } from './attract.js';
import { DevOverlays } from '../ui/devoverlays.js';
import { HudSys } from '../ui/hud.js';
import { DeathScreen, Cutscene, DialogueScreen, KnellScreen, LoreScreen, MapScreen, ResultsScreen, STORY, WritsScreen } from '../ui/menus/world.js';
import { HeroScreen } from '../ui/menus/hero.js';
import { AboutScreen, CreditsRoll, HowToScreen, LOOKS, PartyScreen, PauseScreen, SettingsScreen } from '../ui/menus/pause.js';
import { DevScreen } from '../ui/menus/dev.js';
import { MainMenu, TitleScreen, TouchNotice } from '../ui/menus/shell.js';
import { BrasseScreen, OgiveScreen, PennywhistleScreen, StashScreen } from '../ui/menus/vendors.js';
import { UI } from '../ui/ui.js';
import { ShellSet } from '../view/sets.js';
import { View } from '../view/view.js';
import { STORY_LINES } from '../data/dialog.js';
import { gemId } from '../data/items.js';
import { SET_BY_CLASS } from '../data/items.js';
import { SKILLS } from '../data/skills.js';

const { Vector3 } = THREE;
export const VIGNETTE_LOOK = (v) => ({ scene: [{ id: 'vignette', params: { intensity: v } }] });

export class DiabellicalGame {
  name = TITLE;

  constructor(opts = {}) {
    this.opts = opts;
    this.frame = 0;
    this.frameTime = 0;
    this.lastRealDt = 1 / 60;
    this.world = null;
    this.screens = [];
    this.mode = 'boot';
    this.botSeats = new Set();
    this.botMem = new Map();
    this.pendingEvents = [];
    this.isSession = false;
    this.isClient = false;
    this.seed = opts.seed ?? 1;
    this.isSession = !!opts.hub;
    this.settings = defaultSettings();
    this.save = emptySave();
    this.overlays = { nav: false, hit: false, ai: false, spawn: false, flow: false, state: false };
    this.overlaysOn = false;
    this.devTimeScale = 1;
    this.camTarget = new Vector3();
    this.uiRng = new Rng(`ui:${opts.seed ?? 1}`);
    this.labelsHeld = false;
    this.touchOnly = !!opts.touchOnly;
    this.currentSlot = -1;
    this.autosaveT = 0;
    this.pxScale = 4;
    this.attract = null;
    this.screenClasses = { HeroScreen, PauseScreen, MapScreen, KnellScreen, WritsScreen, StashScreen, BrasseScreen, OgiveScreen, PennywhistleScreen, SettingsScreen, HowToScreen, PartyScreen, DevScreen, AboutScreen };
  }

  async setup(ctx) {
    this.ctx = ctx;
    this.audioSys = new AudioSys(this, ctx);
    this.input = new InputRouter(this, ctx);
    this.view = new View(this, ctx);
    this.ui = new UI(this, ctx);
    this.hudSys = new HudSys(this, ctx);
    this.devOverlays = new DevOverlays(this);
    if (this.opts.onSetup) await this.opts.onSetup(this, ctx);
    if (!this.opts.hub) {
      this.loadSaveData();
      this.enterShell();
    }
  }

  ready() {
    if (typeof window !== 'undefined') window.__GAME__ = this;
    this.computeScale();
  }

  computeScale() {
    try {
      const v = this.ctx.engine.renderer.viewport;
      this.pxScale = (v?.width ?? 960) / this.ctx.hud.width;
    } catch { this.pxScale = 4; }
  }

  loadSaveData() {
    const s = readSave();
    if (s) this.save = s;
    this.settings = { ...this.settings, ...this.save.settings };
    this.save.settings = this.settings;
    this.audioSys.voicesVol = this.settings.voices ?? 1;
  }

  saveSettings() { writeSave(this.save); }

  resetSettings() {
    this.save.settings = defaultSettings();
    this.settings = this.save.settings;
    this.ctx.audio.resetVolumes();
    this.ctx.engine.settings.reset();
    this.audioSys.voicesVol = 1;
    this.applyLook();
    this.saveSettings();
  }

  applyLook() {
    const i = this.settings.lookIndex ?? 0;
    const id = LOOKS[i][1];
    if (id) this.ctx.engine.setLook(LOOK_PRESETS[id]);
    else this.ctx.engine.setLook(VIGNETTE_LOOK(0.3));
  }

  applyVignette(v) {
    if ((this.settings.lookIndex ?? 0) !== 0) return;
    this.ctx.engine.setLook(VIGNETTE_LOOK(v));
  }

  toggleFullscreen() {
    if (typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) { const p = document.exitFullscreen(); if (p?.catch) p.catch(() => {}); }
      else { const p = document.documentElement.requestFullscreen?.(); if (p?.catch) p.catch(() => {}); }
    } catch { /* browsers may refuse */ }
  }

  // ---- Shell -------------------------------------------------------------------------------
  enterShell() {
    this.mode = 'shell';
    this.closeAll();
    this.teardownWorld();
    if (!this.shellSet) this.shellSet = new ShellSet(this.view);
    this.shellSet.setMode('title', 0);
    this.audioSys.music('vespers');
    this.ctx.engine.timeScale = 1;
    if (this.touchOnly) { this.openScreen(new TouchNotice(this)); this.startAttract(false); return; }
    this.openScreen(new TitleScreen(this));
    this.idleSeen = 0;
  }

  openMainMenu() {
    this.closeScreen();
    this.openScreen(new MainMenu(this));
  }

  // ---- Screens -----------------------------------------------------------------------------
  openScreen(s) {
    if (this.screens.length) this.screens[this.screens.length - 1].savedFocus = this.ui?.focus;
    this.screens.push(s);
    s.onOpen?.();
    this.ui.focus = null;
    this.input.input.clearQueued();
  }

  closeScreen() {
    const s = this.screens.pop();
    if (s) { s.onClose?.(); this.audioSys?.sfx('ui_back'); }
    const top = this.screens[this.screens.length - 1];
    if (top?.savedFocus) this.ui.focus = top.savedFocus;
    this.input.input.clearQueued();
    if (!this.screens.length) this.menuSeat = null;
  }

  closeAll() {
    while (this.screens.length) { const s = this.screens.pop(); s.onClose?.(); }
    this.menuSeat = null;
  }

  topScreen() { return this.screens[this.screens.length - 1] ?? null; }
  menuHero() {
    const seat = this.menuSeat ?? this.localSeats()[0] ?? 0;
    return this.world?.heroes.find((h) => h.seat === seat) ?? this.world?.heroes[0] ?? null;
  }

  // ---- Heroes and seats --------------------------------------------------------------------
  localSeats() {
    if (this.net) return this.net.seat === null ? [] : [this.net.seat];
    return this.input.seats.map((_, i) => i).filter((i) => this.world?.heroes.some((h) => h.seat === i && !h.gone));
  }
  isLocalSeat(seat) { return this.localSeats().includes(seat); }
  isLocalLoot(owner) { return owner < 0 || this.isLocalSeat(owner) || this.botSeats.has(owner) || this.attract; }
  isCameraSeat(seat) { return this.localSeats().includes(seat) || !!this.attract; }
  seatLabel(h) { return this.isSession ? String(h.name).slice(0, 10) : `P${h.seat + 1}`; }
  humanCount() { return this.world ? this.world.heroes.filter((h) => !h.gone && !h.companion).length : 1; }
  localHero() { const s = this.localSeats()[0] ?? 0; return this.world?.heroes.find((h) => h.seat === s) ?? null; }
  freePads() { const out = []; for (let i = 0; i < this.input.pads.length; i++) if (this.input.pads[i] && this.input.seatOfPad(i) < 0) out.push(i); return out; }

  onPadSeen(i) {
    if (this.mode === 'play' && this.input.seats[0].pad !== null && this.input.seatOfPad(i) < 0) this.hudSys.toast('A NEW CONTROLLER. PRESS OPTIONS ON IT TO JOIN.', 'sky', { life: 5 });
    else if (this.mode === 'play' && i > 0) this.hudSys.toast('A NEW CONTROLLER. PRESS OPTIONS ON IT TO JOIN.', 'sky', { life: 5 });
  }

  joinSeat(pad, cls) {
    const w = this.world;
    const seat = this.input.seats.length;
    if (seat > 3 || !w) return null;
    const d = this.save.guests[cls] ?? newHeroData(cls, `GUEST ${seat + 1}`, `guest:${cls}`);
    const lead = w.heroes.find((h) => h.seat === 0);
    d.level = Math.max(d.level, lead?.level ?? 1);
    d.skills = CLASSES[cls].preset.map(([id]) => (d.level >= SKILLS[id].level ? { id, tone: null } : null));
    this.input.seats.push({ kind: 'pad', pad });
    const h = addHero(w, d, seat, { navIndex: seat, guest: true, x: (lead?.x ?? 0) + 1, z: (lead?.z ?? 0) + 1 });
    if (!w.zone.nav.walkable(h.x, h.z)) { h.x = lead.x; h.z = lead.z; }
    ensurePyx(w);
    this.hudSys.toast(`P${seat + 1} JOINS AS ${CLASSES[cls].name}`, 'sky', { big: true });
    this.audioSys.sfx('bell_mid');
    return h;
  }

  leaveSeat(seat) {
    const w = this.world;
    const h = w.heroes.find((o) => o.seat === seat);
    if (!h) return;
    this.save.guests[h.cls] = heroToData(h);
    h.gone = true;
    w.heroes.splice(w.heroes.indexOf(h), 1);
    this.view.ev_hero_gone({ id: h.id });
    this.input.seats.splice(seat, 1);
    for (const o of w.heroes) if (!o.companion && o.seat > seat) o.seat--;
    ensurePyx(w);
    this.hudSys.toast(`P${seat + 1} LEAVES`, 'mist');
    this.botSeats.delete(seat);
  }
  leaveLastSeat() { const n = this.input.seats.length - 1; if (n > 0) this.leaveSeat(n); }

  addBotSeat() {
    const w = this.world;
    const seat = this.input.seats.length;
    if (seat > 3) return;
    const cls = PLAYABLE[seat % 3];
    const lead = w.heroes.find((h) => h.seat === 0);
    const d = newHeroData(cls, `BOT ${seat + 1}`, `bot${seat}`);
    d.level = lead.level;
    this.input.seats.push({ kind: 'bot', pad: null });
    const h = addHero(w, d, seat, { navIndex: seat, x: lead.x + 1, z: lead.z + 1 });
    if (!w.zone.nav.walkable(h.x, h.z)) { h.x = lead.x; h.z = lead.z; }
    this.botSeats.add(seat);
    botManage(w, h, this.memOf(h));
  }
  removeBotSeat() { for (let s = this.input.seats.length - 1; s > 0; s--) if (this.botSeats.has(s)) { this.leaveSeat(s); return; } }
  toggleBot(seat) { if (this.botSeats.has(seat)) this.botSeats.delete(seat); else this.botSeats.add(seat); }
  memOf(h) { let m = this.botMem.get(h.id); if (!m) { m = newBotMemory(); this.botMem.set(h.id, m); } return m; }

  // ---- Starting play -----------------------------------------------------------------------
  startNewHero(cls, name, difficulty, start) {
    const slot = this.save.heroes.findIndex((h) => !h);
    if (slot < 0) return;
    const seed = this.newSeed();
    const data = newHeroData(cls, name, `hero${slot}:${seed}`);
    const camp = newCampaign();
    camp.seed = seed;
    camp.difficulty = difficulty;
    this.save.heroes[slot] = { data, camp };
    this.currentSlot = slot;
    if (start === 'lastbell') this.prepareLastBell(this.save.heroes[slot], seed);
    writeSave(this.save);
    this.launchPlay(this.save.heroes[slot], { start });
  }

  newSeed() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues && !this.opts.fixedSeed) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % 1000000; }
    return this.opts.fixedSeed ?? 12345;
  }

  /** A level 30 hero with the whole endgame in reach. */
  prepareLastBell(slot, seed) {
    const d = slot.data;
    const rng = new Rng(`lastbell:${seed}`);
    d.level = 30;
    const cls = CLASSES[d.cls];
    d.skills = cls.skills.slice(2, 8).map((id) => ({ id, tone: Object.keys(SKILLS[id].tones)[0] }));
    d.skills[0] = { id: cls.skills[0], tone: Object.keys(SKILLS[cls.skills[0]].tones)[0] };
    d.vows = [null, null];
    const who = { cls: d.cls };
    const set = SET_BY_CLASS[d.cls];
    for (const slotId of ['main', 'off', 'head', 'shoulders', 'chest', 'hands', 'legs', 'feet', 'amulet', 'ring']) {
      d.gear[slotId] = makeItem(rng, { slot: slotId, rarity: 'reliquary', ilvl: 30, cls: d.cls, forceSocket: slotId === 'main' || slotId === 'chest' });
    }
    d.gear.head = makeItem(rng, { slot: 'head', rarity: 'set', ilvl: 30, cls: d.cls, set });
    d.gear.chest = makeItem(rng, { slot: 'chest', rarity: 'set', ilvl: 30, cls: d.cls, set, forceSocket: true });
    d.inv[0] = makeRolledItem(rng, who, 'legendary', 30);
    d.inv[1] = makeRolledItem(rng, who, 'legendary', 30);
    d.inv[2] = makeRolledItem(rng, who, 'legendary', 30);
    d.gear.main = makeItem(rng, { rarity: 'legendary', ilvl: 30, cls: d.cls, legendary: { bellwarden: 'widows_clapper', lamplighter: 'last_wick', sexton: 'second_best_crook' }[d.cls], forceSocket: true });
    d.mats = { scrap: 40, dust: 20, shards: 12 };
    d.gold = 60000;
    d.grandKeys = 1;
    d.gems = { [gemId('ember', 1)]: 3, [gemId('salt', 1)]: 3, [gemId('amber', 1)]: 3, [gemId('ember', 0)]: 3 };
    const c = slot.camp;
    c.q = { i: QUESTS.length, s: 0 };
    c.credits = true;
    c.zone = 'town';
    c.floor = 0;
    Object.assign(c.flags, { open_causeway: 1, open_ossuary: 1, open_cloister: 1, open_belfry: 1, forge: 1, reliquary: 1, brasse_met: 1, brasse_home: 1, crier_met: 1, pyx: 1, overdue_open: 1, wagon_home: 1, malison_dead: 1, yard_coffin: 1, bursar_dead: 1, ambrose_dead: 1 });
    c.plateFirst = true;
    const a = this.save.account;
    a.unlocks.knell = true;
    a.unlocks.penance = true;
    a.devotion.points += 5;
    a.devotion.level = Math.max(a.devotion.level, 5);
  }

  continueHero(i, o = {}) {
    const slot = this.save.heroes[i];
    if (!slot) return;
    this.currentSlot = i;
    this.launchPlay(slot, { start: o.knell ? 'knell' : 'continue' });
  }

  deleteHero(i) {
    this.save.heroes[i] = null;
    writeSave(this.save);
    this.audioSys.sfx('coffin_slam');
  }

  launchPlay(slot, o = {}) {
    this.closeAll();
    this.leaveShell();
    this.input.seats = [{ kind: 'kbm', pad: this.input.seats[0]?.pad ?? null }];
    const camp = slot.camp;
    const seed = camp.seed ?? this.newSeed();
    camp.seed = seed;
    this.seed = seed;
    const w = createWorld({ seed, difficulty: camp.difficulty ?? 0, account: this.save.account, camp });
    w.mode = 'campaign';
    this.world = w;
    this.mode = 'play';
    this.view.setWorld(w);
    const fresh = o.start === 'beginning';
    addHero(w, slot.data, 0, { navIndex: 0 });
    let zone = camp.zone ?? 'yard', floor = camp.floor ?? 0;
    if (o.start === 'knell') { zone = 'town'; floor = 0; }
    if (w.camp.credits && zone === 'belfry') { zone = 'town'; floor = 0; }
    loadZone(w, zone, floor, 'start');
    this.flushEvents();
    this.applyLook();
    if (fresh) {
      questInit(w);
      this.flushEvents();
      this.openScreen(new Cutscene(this, { ...STORY.opening({ onEnd: () => this.coffinBurst() }) }));
    } else if (o.start === 'lastbell') {
      this.hudSys.toast('THE LAST BELL: THE WHOLE ENDGAME IS OPEN. SPEND YOUR DEVOTION.', 'sand', { life: 6 });
      this.hudSys.toast('THE KNELL FONT IS IN THE SQUARE.', 'sand', { life: 6 });
    } else if (w.camp.q.i < QUESTS.length) this.hudSys.toast(`QUEST: ${QUESTS[w.camp.q.i].steps[w.camp.q.s].text}`, 'sand', { life: 5 });
  }

  /** Your coffin bursts and you get up: it did not take. */
  coffinBurst() {
    const h = this.world?.heroes[0];
    const a = h && this.view.actors.get(h.id);
    if (!a) return;
    a.play('GetUp', 1, false);
    this.view.fx.shatter(h.x, 0.05, h.z, PALETTE.plum, h.x, h.z, this.uiRng, { count: 16, size: 0.3, spread: 0.7, speed: 6 });
    this.view.showFx({ k: 'dust_ring', s: 'coffin_slam', sh: 0.4, x: h.x, z: h.z, r: 3 });
    this.audioSys.zoneChanged(this.world.zone);
  }

  leaveShell() {
    if (this.shellSet) { this.shellSet.dispose(); this.shellSet = null; }
    if (this.attract) { this.attract.stop(); this.attract = null; }
  }

  teardownWorld() {
    this.view.setWorld(null);
    this.world = null;
    this.botSeats.clear();
    this.botMem.clear();
    this.pendingEvents.length = 0;
  }

  persist() {
    if (this.currentSlot < 0 || !this.world || this.isSession || this.attract) return;
    const h = this.world.heroes.find((o) => o.seat === 0);
    if (!h) return;
    const slot = this.save.heroes[this.currentSlot];
    if (!slot) return;
    slot.data = heroToData(h);
    slot.camp = this.world.camp;
    for (const o of this.world.heroes) if (o.guest) this.save.guests[o.cls] = heroToData(o);
    writeSave(this.save);
  }

  saveAndQuit() {
    this.persist();
    this.ctx.engine.timeScale = 1;
    this.closeAll();
    this.enterShell();
  }

  rerollMap() {
    const w = this.world;
    const seed = this.newSeed();
    w.camp.seed = seed;
    w.seed = seed;
    w.root = new Rng(seed);
    loadZone(w, w.zone.id, w.zone.floor, 'start');
  }

  cmd(c, seat = null) {
    const s = seat ?? this.menuSeat ?? this.localSeats()[0] ?? 0;
    if (this.isClient) { this.net.sendCommand(c); return true; }
    return applyCommand(this.world, s, c);
  }

  // ---- Attract ------------------------------------------------------------------------------
  startAttract(fromDev = false) {
    if (this.attract) return;
    if (this.shellSet) { this.shellSet.dispose(); this.shellSet = null; }
    const returnTo = this.mode;
    this.attractReturn = returnTo;
    this.attractFromDev = fromDev;
    if (fromDev) { this.savedWorld = this.world; this.persist(); this.view.setWorld(null); }
    this.mode = 'attract';
    this.attract = new AttractTour(this);
    this.attract.start();
  }

  stopAttract() {
    const fromDev = this.attractFromDev;
    if (this.attract) { this.attract.stop(); this.attract = null; }
    this.world = null;
    this.view.setWorld(null);
    this.botSeats.clear();
    this.botMem.clear();
    this.pendingEvents.length = 0;
    this.ctx.engine.timeScale = 1;
    this.input.menu = this.input.emptyMenu();
    this.input.input.clearQueued();
    if (fromDev && this.savedWorld) {
      this.world = this.savedWorld;
      this.savedWorld = null;
      this.mode = 'play';
      this.view.setWorld(this.world);
      return;
    }
    this.mode = 'shell';
    this.shellSet = new ShellSet(this.view);
    this.shellSet.setMode('title', 0);
    this.audioSys.music('vespers');
    this.input.idleFrames = 0;
    this.applyLook();
  }

  // ---- Hooks --------------------------------------------------------------------------------
  fixedUpdate(ctx, dt) {
    if (this.opts.hub && this.net) { this.net.fixedUpdate(dt); return; }
    const w = this.world;
    if (!w) return;
    if (this.mode === 'attract') { this.attract?.fixed(); return; }
    if (this.mode !== 'play') return;
    const top = this.topScreen();
    if (top?.holdSim) return;
    this.stepPlay(w);
  }

  stepPlay(w) {
    const intents = [];
    for (let seat = 0; seat < this.input.seats.length; seat++) {
      const h = w.heroes.find((o) => o.seat === seat);
      if (!h) continue;
      if (this.botSeats.has(seat)) {
        const mem = this.memOf(h);
        intents[seat] = botIntent(w, h, mem);
        if (w.t % 300 === 0) botManage(w, h, mem, mem.opts ?? {});
        botAfter(w, h, mem);
      } else {
        intents[seat] = this.menuBlocks(seat) ? emptyIntent() : this.input.intentFor(seat, w);
      }
    }
    for (const h of w.heroes) {
      if (!h.companion) continue;
      intents[h.seat] = botIntent(w, h, this.memOf(h));
      botAfter(w, h, this.memOf(h));
    }
    stepWorld(w, intents);
    for (const e of w.events) if (e.t === 'talk' && this.botSeats.has(e.seat)) applyCommand(w, e.seat, { c: 'talk_done', npc: e.npc });
    this.drainEvents(w);
  }

  menuBlocks() { return this.screens.length > 0 && !(this.topScreen()?.tag === 'death'); }

  drainEvents(w) {
    if (w.events.length) { for (const e of w.events) this.pendingEvents.push(e); w.events.length = 0; }
  }

  flushEvents() { if (this.world) this.drainEvents(this.world); this.dispatchEvents(); }

  dispatchEvents() {
    if (!this.pendingEvents.length) return;
    const list = this.pendingEvents;
    this.pendingEvents = [];
    if (this.evCounts) for (const e of list) this.evCounts[e.t] = (this.evCounts[e.t] ?? 0) + 1;
    this.view.consume(list);
    this.hudSys.consume(list);
    for (const e of list) this.flowEvent(e);
  }

  flowEvent(e) {
    const w = this.world;
    switch (e.t) {
      case 'talk':
        if (this.isLocalSeat(e.seat) && !this.botSeats.has(e.seat)) { this.menuSeat = e.seat; this.openScreen(new DialogueScreen(this, e.npc, e.id)); }
        break;
      case 'open': {
        if (!this.isLocalSeat(e.seat) || this.botSeats.has(e.seat)) break;
        this.menuSeat = e.seat;
        if (e.ui === 'map') this.openScreen(new MapScreen(this));
        else if (e.ui === 'knell') this.openScreen(new KnellScreen(this));
        else if (e.ui === 'writs') this.openScreen(new WritsScreen(this));
        else if (e.ui === 'stash') this.openScreen(new StashScreen(this));
        break;
      }
      case 'lore':
        if (this.isLocalSeat(e.seat) && !this.botSeats.has(e.seat)) this.openScreen(new LoreScreen(this, e.id));
        break;
      case 'down':
        if (this.isLocalSeat(e.seat) && !e.companion && !this.botSeats.has(e.seat)) { this.menuSeat = e.seat; if (!this.isSession) this.openScreen(new DeathScreen(this, e.seat)); }
        break;
      case 'cut': this.onCut(e); break;
      case 'autosave': this.persist(); break;
      case 'run_done': if (!this.botSeats.has(0) && !this.attract) this.openScreen(new ResultsScreen(this, e.results)); break;
      case 'zone': this.persist(); break;
      default: break;
    }
  }

  onCut(e) {
    if (this.isSession || this.attract) return;
    if (e.id === 'ending') { this.playEnding(!!e.first); return; }
    const s = STORY[e.id];
    if (!s) return;
    const boss = this.world.boss;
    this.openScreen(new Cutscene(this, { ...s, cam: boss ? { x: boss.x, z: boss.z, zoom: 1.1 } : null }));
  }

  playEnding(first) {
    const w = this.world;
    const ctx = this.ctx;
    this.openScreen(new Cutscene(this, {
      lines: STORY_LINES.ending,
      music: 'clemency',
      extra: 2,
      onEnd: () => {
        ctx.engine.screen.flash('white', { duration: 0.6 });
        this.persist();
        const home = () => {
          if (first) this.hudSys.toast('PENANCE AND KNELL RUNS ARE OPEN AT THE FONT', 'sand', { big: true, life: 6 });
          this.cmd({ c: 'dev_goto', zone: 'town', floor: 0 });
        };
        if (first && !this.skipCutscenes) this.openScreen(new CreditsRoll(this, home));
        else home();
      },
    }));
    ctx.engine.sun.color.setHex(0xffd090);
    ctx.engine.sun.intensity = 1.4;
    ctx.engine.ambient.intensity = 1.4;
  }

  update(ctx, dt) {
    if (this.opts.server) { return; }
    const real = this.realDt(ctx, dt);
    this.lastRealDt = real;
    this.frame++;
    this.frameTime += real;
    this.input.beginFrame();
    this.handleCommands(ctx);
    if (this.world) this.drainEvents(this.world);
    this.dispatchEvents();
    this.audioSys.update(real);
    if (this.net) this.net.update(real);
    // Time: full-screen menus freeze the world (solo and couch). Dev time scale otherwise.
    const top = this.topScreen();
    if (!this.isSession && this.mode === 'play') {
      const frozen = !!top?.freeze;
      if (frozen) ctx.engine.timeScale = 0;
      else if (!(this.view.slowT > 0)) ctx.engine.timeScale = this.devTimeScale;
    }
    this.view.update(dt, real);
    if (this.shellSet) this.shellSet.update(dt, real);
    this.hudSys.update(real);
    if (this.mode === 'play') this.playFrame();
    else if (this.mode === 'shell') this.shellFrame();
    else if (this.mode === 'attract') this.attract?.frame();
    this.drawUI(real);
    if (this.mode === 'play') {
      this.autosaveT += real;
      if (this.autosaveT > 60) { this.autosaveT = 0; this.persist(); }
    }
  }

  realDt(ctx, dt) {
    if (dt > 0) return dt;
    return 1 / 60;
  }

  handleCommands() {}

  /** One camera: a hero off screen for two seconds comes back to seat one. */
  couchLeash() {
    const w = this.world;
    if (this.isSession || w.heroes.filter((h) => !h.companion && !h.gone).length < 2) return;
    const lead = w.heroes.find((h) => h.seat === 0);
    const hud = this.ctx.hud;
    for (const h of w.heroes) {
      if (h === lead || h.gone || h.companion || h.dead) continue;
      const [x, y] = this.view.project(h.x, 1, h.z);
      const off = x < -4 || y < -4 || x > hud.width + 4 || y > hud.height + 4;
      h.offT = off ? (h.offT ?? 0) + this.lastRealDt : 0;
      if (h.offT > 2) { h.offT = 0; h.x = lead.x; h.z = lead.z; this.view.showFx({ k: 'portal', s: 'blink', x: h.x, z: h.z, r: 1.5 }); }
    }
  }

  playFrame() {
    const w = this.world;
    if (!w) return;
    const m = this.input.menu;
    const top = this.topScreen();
    // Couch: a free pad pressing Options joins with the next class along.
    if (!this.isSession) {
      const join = this.input.freePadPressedOptions();
      if (join >= 0 && this.input.seats[0].pad !== null) {
        // A free pad joins through the Party screen, where it picks a class.
        if (this.input.seats.length < 4) { this.joinPad = join; this.openScreen(new PartyScreen(this)); return; }
      }
    }
    this.labelsHeld = false;
    const seats = this.localSeats();
    if (this.input.wheelNow && !top) {
      this.settings.zoom = Math.max(0.6, Math.min(1.4, Math.round((this.settings.zoom - this.input.wheelNow * 0.1) * 100) / 100));
    }
    this.couchLeash();
    if (top) {
      if (m.back && top.back) top.back();
      else if (m.pause && top.tag !== 'dialogue' && top.tag !== 'cutscene' && top.tag !== 'death') this.closeAll();
      return;
    }
    for (const seat of seats) {
      if (this.botSeats.has(seat) && seat !== 0) continue;
      const me = w.heroes.find((h) => h.seat === seat);
      if (me?.pick && this.handlePick(me)) continue;
      const acts = this.input.frameActions(this.isSession ? 0 : seat);
      for (const a of acts) this.seatAction(seat, a);
      if (this.topScreen()) return;
    }
  }

  /** Level-ups in a session: pick 1 of 3, on d-pad left, up, right; Z, X, C; or a click. */
  handlePick(h) {
    const input = this.input.input;
    const m = this.input.menu;
    let i = -1;
    if (input.wasPressed('KeyZ') || m.left) i = 0;
    if (input.wasPressed('KeyX') || m.up) i = 1;
    if (input.wasPressed('KeyC') || m.right) i = 2;
    if (m.click) {
      const x0 = Math.floor(this.ctx.hud.width / 2 - 150);
      for (let k = 0; k < 3; k++) if (m.clickX >= x0 + k * 102 && m.clickX < x0 + k * 102 + 96 && m.clickY >= 54 && m.clickY < 94) i = k;
    }
    if (i >= 0) { this.cmd({ c: 'pick3', i }, h.seat); h.pick = this.isClient ? null : h.pick; this.audioSys.sfx('ui_confirm'); return true; }
    return true;
  }

  seatAction(seat, a) {
    const open = (s) => { this.menuSeat = seat; this.openScreen(s); };
    switch (a) {
      case 'pause': open(new PauseScreen(this)); break;
      case 'hero_gear': if (!this.world.heroes.find((h) => h.seat === seat)?.dead) open(new HeroScreen(this, 0)); break;
      case 'hero_skills': open(new HeroScreen(this, 1)); break;
      case 'hero_quests': { const s = new HeroScreen(this, 4); open(s); break; }
      case 'map': open(new MapScreen(this)); break;
      case 'equip': this.cmd({ c: 'equip_newest' }, seat); break;
      case 'cycle': this.cmd({ c: 'cycle_use' }, seat); break;
      case 'labels': this.labelsHeld = true; break;
      default: break;
    }
  }

  shellFrame() {
    const m = this.input.menu;
    const top = this.topScreen();
    if (top && m.back) top.back();
    if (top && this.input.idleFrames > 600 && (top.tag === 'title' || top.tag === 'menu') && !this.opts.noAttract) {
      this.startAttract(false);
    }
  }

  drawUI(real) {
    const ui = this.ui;
    ui.begin();
    if (this.mode === 'play' || this.mode === 'attract' || this.isSession) {
      const top = this.topScreen();
      const showHud = !top || !(top.tag === 'cutscene' || top.tag === 'dialogue' || top.covers);
      // A touch-only player gets the demo and one clear notice: nothing here can be pressed.
      if (showHud && this.world?.zone && !(this.touchOnly && this.mode === 'attract')) this.hudSys.draw(ui, real);
    }
    if (this.mode === 'attract' && !this.touchOnly) this.attract?.drawOverlay(ui);
    if (this.net?.drawOverlay) this.net.drawOverlay(ui);
    const top = this.topScreen();
    if (top && (this.mode !== 'attract' || this.touchOnly)) {
      ui.screenTag = top.tag;
      top.t += real;
      top.draw(ui, real);
    }
    ui.end();
    this.updateCursor();
  }

  updateCursor() {
    if (typeof document === 'undefined') return;
    const want = this.input.lastDevice === 'pad' ? 'none' : (this.cursorCss ??= gauntletCursor());
    if (this.lastCursor !== want) { this.lastCursor = want; document.body.style.cursor = want; const c = this.ctx.engine.gpu?.renderer?.domElement; if (c) c.style.cursor = want; }
  }

  drawDevOverlays(ui) { this.devOverlays.draw(ui); }

  cameraTarget() { return this.view?.cam ?? this.camTarget; }
  status() {
    const w = this.world;
    if (!w) return `${this.mode} ${this.topScreen()?.tag ?? ''}`;
    const h = w.heroes[0];
    return `${this.mode} ${w.zone?.id}:${w.zone?.floor} L${h?.level} party ${w.heroes.length} kills ${h?.kills ?? 0} monsters ${w.monsters.length}`;
  }
  fingerprint() { return this.world ? worldHash(this.world) : `${this.mode}:${this.frame % 1}`; }
  dispose() { this.audioSys?.stopAll(); }
}

function gauntletCursor() {
  if (typeof document === 'undefined') return 'default';
  try {
    const rows = ['KK........', 'KOK.......', 'KOOK......', 'KOOOK.....', 'KOOOOK....', 'KOOOOOK...', 'KOOOOOOK..', 'KOOOOKKKK.', 'KOOKOOK...', 'KOK.KOOK..', 'KK..KOOK..', '.....KK...'];
    const c = document.createElement('canvas');
    c.width = 30; c.height = 36;
    const g = c.getContext('2d');
    rows.forEach((r, y) => r.split('').forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = ch === 'K' ? '#1a1c2c' : '#ffcd75';
      g.fillRect(x * 3, y * 3, 3, 3);
    }));
    return `url(${c.toDataURL()}) 0 0, default`;
  } catch { return 'default'; }
}

export { MODEL_LIBRARY, gearLook, recalcHero, HERO_SLOTS, beginCampaign };
