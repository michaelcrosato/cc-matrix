// TollGame: the one Game object for the whole session. Title, menus, play, attract and overlays all live here.
import { THREE, Engine, PALETTE, Timeline, disposeObject, buildModel } from '../../pixel-engine.js';
import { TITLE, SEAT_PALETTE } from '../data/meta.js';
import { ZONES, CAMPAIGN } from '../data/zones.js';
import { CLASSES, SKILLS, resolveSkill } from '../data/classes.js';
import { NPCS, NARRATION, ENDING, QUESTS } from '../data/quests.js';
import { createWorld, stepWorld, loadZone, drainEvents } from '../sim/world.js';
import { createHero, autoLoadout, slotsOpen } from '../sim/progress.js';
import { exitLock, campaignEvent, campaignTick, newCampaign, onZoneLoaded, questLine, curStep, questZone, beginStep } from '../sim/campaign.js';
import { knellKill, knellTick, knellBossDead, startKnell, knellNextFloor } from '../sim/knell.js';
import { writEvent, newAccount, addDevotionXp, rollWrits } from '../sim/town.js';
import { skillSpec } from '../sim/effects.js';
import { botIntent } from '../sim/bot.js';
import { refreshStats, livingHeroes, ev, giveXp, moveBy } from '../sim/core.js';
import { equipItem, reviveHero } from '../sim/hero.js';
import { isUpgrade } from '../sim/items.js';
import { installBossHooks } from '../sim/bosses.js';
import { ZoneView } from '../view/zonebuild.js';
import { Actors } from '../view/actors.js';
import { Vfx, registerParticles } from '../view/vfx.js';
import { UI } from '../ui/ui.js';
import { Glyphs } from '../ui/glyphs.js';
import { drawHud } from '../ui/hud.js';
import { GameAudio, SPEAKERS } from '../audio/audio.js';
import { Router } from '../input/router.js';
import { SaveStore, serializeHero } from '../save/save.js';
import { drawScreen } from '../ui/screens.js';
import { Attract } from './attract.js';

const { Vector3 } = THREE;
const _pv = new Vector3();
function projectXY(g, x, y, z) { const hud = g.ctx.hud; _pv.set(x, y, z).project(g.ctx.camera.camera); return [((_pv.x + 1) / 2) * hud.width, (1 - (_pv.y + 1) / 2) * hud.height]; }
const FIXED = 1 / 60;

export class TollGame {
  name = TITLE;
  assets = [];
  constructor(opts = {}) {
    this.opts = opts; this.frame = 0; this.mode = 'boot'; this.overlay = null; this.stack = []; this.world = null; this.titleWorld = null; this.target = new Vector3(0, 0, 0);
    this.pending = {}; this.toasts = []; this.bannerNow = null; this.bannerQ = []; this.subtitle = null; this.zoneToast = null; this.upgradeToast = null; this.questLine = '';
    this.seats = [{ seat: 0, kind: 'kbm' }]; this.couch = false; this.idleT = 0; this.explored = null; this.fast = !!opts.fast; this.noTransitions = !!opts.fast; this.attract = null; this.session = null; this.net = null;
    this.labelsAll = false; this.timeline = null; this.cut = null; this.hoverMonster = 0; this.darkMode = false; this.zoom = 1; this.devFlags = {}; this.sessionPaused = false; this.status0 = 'boot';
  }
  // ------------------------------------------------------------------ setup
  async setup(ctx) {
    this.ctx = ctx; const eng = ctx.engine;
    registerParticles(ctx);
    this.glyphs = new Glyphs(); this.ui = new UI(this); this.audio = new GameAudio(ctx, this); this.router = new Router(ctx, this); this.save = new SaveStore();
    if (this.opts.noSave || this.opts.session) this.save.disabled = true;
    this.glyphs.set = this.save.settings.glyphs;
    this.applySettings();
    this.view = new ZoneView(ctx, this); this.actors = new Actors(ctx, this.view); this.vfx = new Vfx(ctx, this); this.vfx.view = this.view;
    if (typeof window !== 'undefined') { window.__GAME__ = this; }
    this.touchOnly = typeof matchMedia !== 'undefined' && !matchMedia('(any-pointer: fine)').matches && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    if (this.opts.session) { this.mode = 'session'; return; }
    if (this.opts.quick) { await this.quickStart(this.opts.quick); return; }
    await this.enterTitle();
  }
  applySettings() {
    const s = this.save.settings; const a = this.ctx.audio;
    this.glyphs.set = s.glyphs; this.shakeScale = s.shake; this.audio.voiceVol = s.voices ?? 1; this.zoom = s.zoom;
  }
  skillSpecFor(h, i) { return skillSpec(h, i); }
  localHero() { const w = this.world; if (!w) return null; return w.heroes.find((h) => h.seat === (this.localSeat ?? 0) && !h.gone) || w.heroes[0] || null; }
  shake(a) { if (this.fast && false) return; this.ctx.engine.shake.add(Math.min(1, a * (this.world ? this.world.tuning.feelShake : 1) * (this.shakeScale ?? 1))); }
  toast(text, seat, color) { this.toasts.push({ text, t: 2.8, color }); if (this.toasts.length > 4) this.toasts.shift(); }
  banner(text, color = 'sand', scale = 2, dur = 2.5, sub = '') { this.bannerQ.push({ text, color, scale, t: dur, sub }); }
  say(who, text, dur = null) { const sp = SPEAKERS[who] || SPEAKERS.hero; const d = this.audio.speak(text, who); this.subtitle = { who: sp.name, color: sp.color, text, t: dur ?? Math.max(2.5, d + 1) }; }
  toastUpgrade(e) { const it = { name: e.name, rarity: e.rarity }; this.upgradeToast = { ...it, t: 6, uid: e.uid }; this.toast('UPGRADE: ' + e.name.toUpperCase()); }
  flashCost() {}
  onHeroHurt() {}

  // ------------------------------------------------------------------ world lifecycle
  newWorld(opts = {}) {
    const w = createWorld({ seed: opts.seed ?? ((Date.now() % 100000) + 1), difficulty: opts.diff || 'pilgrim', session: !!opts.session });
    w.acct = opts.acct || this.save.acct; w.camp = opts.camp || newCampaign(); w.camp.writs = w.camp.writs && w.camp.writs.length ? w.camp.writs : rollWrits(w);
    w.devotionXp = (ww, xp) => addDevotionXp(ww, xp); w.devotionLvl = w.acct.devotion.level;
    w.hooks = {
      onKill: (ww, m, killer) => { if (ww.knell && ww.knell.active) knellKill(ww, m); this.onKillHook(ww, m); },
      onLevel: (ww, h) => { autoLoadout(h); refreshStats(ww, h); },
      onHeroDeath: (ww, h) => { this.onHeroDeath(h); },
      onRespawn: (ww, h) => { this.respawnHero(h); },
      onUse: (ww, h, s) => this.onUse(h, s),
      onPickup: (ww, h, it) => {},
    };
    installBossHooks(w);
    this.world = w; this.explored = null;
    return w;
  }
  onKillHook(w, m) { if (m.type === 'collection_plate') ev(w, { t: 'banner', text: 'THE PLATE IS YOURS. JACKPOT', small: true }); }
  onHeroDeath(h) {
    const w = this.world;
    if (this.localHeroDead(w)) { if (!w.session) { if (!this.overlay) { this.audio.sfx('hero_death'); this.ctx.engine.timeScale = 0.3; this.deathT = 0.8; this.pushOverlay('death', {}); } } }
  }
  localHeroDead(w) { return livingHeroes(w).length === 0; }
  respawnHero(h) { const w = this.world; const spot = w.spots.find((s) => s.kind === 'lychgate' && s.unlocked) ; reviveHero(w, h, 1, h.diedAt); }
  async enterZone(zoneId, opts = {}) {
    const w = this.world; const eng = this.ctx.engine;
    if (!this.noTransitions && !opts.instant) { try { await eng.screen.cover('iris', { duration: 0.45 }); } catch {} }
    this.clearView();
    const def = ZONES[zoneId];
    loadZone(w, zoneId, { ...opts.load });
    if (w.camp) onZoneLoaded(w, zoneId);
    this.buildView();
    this.zoneToast = { text: def.name, t: 3.2 };
    this.audio.music(def.look === 'ossuary' ? (zoneId === 'counting' ? 'counting' : 'ossuary') : zoneId.startsWith('belfry') ? 'belfry' : zoneId === 'summit' ? 'summit' : zoneId === 'knell' || zoneId === 'knell_arena' ? 'knell' : zoneId);
    this.audio.ambience(def.ambient);
    this.questLine = w.camp ? questLine(w.camp) : '';
    if (!this.noTransitions && !opts.instant) { try { await eng.screen.reveal('iris'); } catch {} }
    if (w.camp && !w.knell) this.autosave();
    return w;
  }
  clearView() { this.actors.clear(); this.vfx.clear(); if (this.view.root.parent) this.view.dispose(); this.view = new ZoneView(this.ctx, this); this.vfx.view = this.view; this.explored = null; this.pending = {}; }
  buildView() {
    const w = this.world; this.view.build(w.zone, w.zoneDef, w); this.explored = new Uint8Array(w.zone.w * w.zone.h);
    const hh = livingHeroes(w)[0]; if (hh) this.ctx.camera.teleport(this.target.set(hh.x, 0.9, hh.z));
  }
  autosave() {
    if (this.save.disabled || this.session) return; const w = this.world; if (!w || !w.camp || this.slot == null) return;
    const h = w.heroes.find((q) => q.seat === 0); if (!h) return;
    w.heroes.forEach((g) => { if (g.seat > 0 && !g.bot) this.save.data.guests[g.cls] = serializeHero(g); });
    this.save.putSlot(this.slot, h, w.camp, { zone: ZONES[w.zoneId].safe ? w.zoneId : 'town', diff: w.diffId, seed: w.seed, lastBell: !!w.flags.lastBell });
  }
  async quickStart(q) {
    const w = this.newWorld({ seed: q.seed || 7, diff: q.diff || 'pilgrim' });
    const h = createHero(w, { seat: 0, cls: q.cls || 'bellwarden', name: 'Tester', level: q.level || 1, lastBell: !!q.lastBell });
    this.slot = null; this.mode = 'play'; this.localSeat = 0; w.flags.lastBell = !!q.lastBell;
    if (q.lastBell) { w.camp.done = true; w.camp.credits = true; w.camp.questsDone = QUESTS.map((x) => x.id); w.camp.q = QUESTS.length; for (const z of Object.keys(ZONES)) w.camp.visited[z] = true; }
    if (q.level && !q.lastBell) { h.level = q.level; autoLoadout(h, { tones: true, vows: true }); refreshStats(w, h, true); }
    await this.enterZone(q.zone || 'town', { instant: true });
  }
  async startNewGame({ cls, name, diff, lastBell, slot }) {
    const w = this.newWorld({ diff, seed: this.opts.seed || ((Date.now() % 90000) + 1) }); this.slot = slot; this.localSeat = 0; this.seats = [{ seat: 0, kind: 'kbm' }]; this.couch = false;
    createHero(w, { seat: 0, cls, name, level: 1, lastBell });
    if (lastBell) { w.flags.lastBell = true; w.camp.done = true; w.camp.credits = true; w.camp.questsDone = QUESTS.map((x) => x.id); w.camp.q = QUESTS.length; for (const z of Object.keys(ZONES)) w.camp.visited[z] = true; w.acct.grandKeys = Math.max(1, w.acct.grandKeys || 0); }
    this.teardownTitle(); this.mode = 'play'; this.overlay = null; this.stack = [];
    if (!lastBell) { await this.enterZone('yard'); await this.playNarration(); } else await this.enterZone('town');
  }
  async continueGame(slot) {
    const s = this.save.slot(slot); if (!s) return;
    const w = this.newWorld({ seed: s.seed, diff: s.diff, camp: s.camp });
    const h = createHero(w, { seat: 0, cls: s.hero.cls, name: s.hero.name, level: s.hero.level, saved: s.hero });
    this.slot = slot; this.localSeat = 0; this.seats = [{ seat: 0, kind: 'kbm' }]; this.couch = false; w.flags.lastBell = s.lastBell;
    this.teardownTitle(); this.mode = 'play'; this.overlay = null; this.stack = [];
    await this.enterZone(ZONES[s.zone] ? s.zone : 'town');
  }
  async playNarration() {
    if (this.noTransitions) return;
    this.pushOverlay('narration', { i: 0, t: 0 });
    await new Promise((res) => { this._narrDone = res; });
  }
  returnToTown() { return this.enterZone('town'); }
  teardownTitle() { if (this.titleStage) { this.titleStage = null; } this.clearView(); this.audio.stopAll(); }

  // ------------------------------------------------------------------ overlays
  pushOverlay(type, data = {}, pauses = true) { if (this.overlay) this.stack.push(this.overlay); this.overlay = { type, data, pauses, t: 0, born: this.frame }; this.ui.setFocus(null); this.router.ctx.input.clearQueued(); }
  closeOverlay() { this.overlay = this.stack.pop() || null; this.ui.setFocus(null); this.ctx.input.clearQueued(); if (!this.overlay) this.ctx.engine.timeScale = 1; }
  closeAll() { this.overlay = null; this.stack = []; this.ui.setFocus(null); this.ctx.input.clearQueued(); this.ctx.engine.timeScale = 1; }
  onUse(h, s) {
    const w = this.world;
    if (s.kind === 'npc') { this.pushOverlay('dialog', { npc: s.npc, spot: s, i: 0 }); }
    else if (s.kind === 'exit') { if (w.camp) s.locked = exitLock(w, w.camp); if (s.locked) { this.toast(s.locked); this.audio.sfx('error'); } else if (s.toZone === 'town') this.enterZone('town'); else if (s.toZone) this.enterZone(s.toZone); else if (w.zoneId === 'summit') this.playEnding(); else if (w.knell) { if (w.knell.phase === 'fill' && w.knell.floor < 2) { knellNextFloor(w); this.clearView(); this.buildView(); this.questLine = ''; } else this.toast('THE KNELL WANTS MORE'); } }
    else if (s.kind === 'gate') { this.pushOverlay('map', { travel: true }); }
    else if (s.kind === 'box') this.pushOverlay('stash', {});
    else if (s.kind === 'board') this.pushOverlay('writs', {});
    else if (s.kind === 'font') this.pushOverlay('knellsetup', {});
    else if (s.kind === 'book') this.pushOverlay('lore', { lore: s.lore, spot: s });
    else if (s.kind === 'wagon') this.toast('THE WAGON NEEDS DEFENDING');
    else if (s.kind === 'box') {}
  }
  openVendor(npc) { this.pushOverlay(npc === 'penny' ? 'vendor' : npc === 'brasse' ? 'smith' : 'reliquary', { npc }); }
  async playEnding() {
    const w = this.world; this.pushOverlay('ending', { i: 0, t: 0 }); this.audio.music('ending');
  }

  // ------------------------------------------------------------------ title and attract
  async enterTitle() {
    this.mode = 'title'; this.idleT = 0; this.clearOverlayState();
    this.setupStage('summit');
    this.audio.music('title');
  }
  clearOverlayState() { this.overlay = null; this.stack = []; this.ctx.engine.timeScale = 1; }
  setupStage(zoneId) {
    const w = this.newWorld({ seed: 4242 }); w.noSpawn = true; this.titleStage = true; this.localSeat = -1;
    loadZone(w, zoneId, { instant: true }); w.noSpawn = false; this.clearView();
    this.view.build(w.zone, w.zoneDef, w); this.explored = new Uint8Array(w.zone.w * w.zone.h);
    try { const b = buildModel('old-clemency', { catalog: undefined }); } catch {}
    const e = this.ctx.engine; e.sun.intensity = 1.1; e.ambient.intensity = 1.9;
    const bell = this.view.place('old-clemency', w.zone.w / 2, w.zone.h / 2 - 5, 0); if (bell) { bell.scale.setScalar(0.9); bell.position.y = 0.3; this.stageBell = bell; }
    for (const [dx, dz, c] of [[-6, -2, 0xffa050], [6, -2, 0xffa050], [0, 4, 0xffe0a0], [0, -6, 0xff9040]]) this.view.lights.push(this.ctx.lights.request({ position: [w.zone.w / 2 + dx, 2.2, w.zone.h / 2 + dz], color: c, intensity: 9, radius: 12, flicker: 'torch', priority: 3 }));
    for (const [cls, dx] of [['bellwarden', -3], ['lamplighter', 0], ['sexton', 3]]) { this.view.place(cls, w.zone.w / 2 + dx, w.zone.h / 2 + 2, 0.2 * dx); }
    this.camAngle = 0;
  }
  enterAttract() { this.attract = new Attract(this); this.mode = 'attract'; this.attract.start(); }
  exitAttract() { if (this.attract) { this.attract.stop(); this.attract = null; } this.idleT = 0; this.enterTitle(); }

  // ------------------------------------------------------------------ per-frame
  fixedUpdate(ctx, dt) {
    if ((this.mode !== 'play' && this.mode !== 'attract' && this.mode !== 'session') || !this.world || this.world.noSpawn && false) return;
    if (this.sessionPaused) return;
    if (this.cine && this.cine.t > 0) return;
    if (this.session && !this.session.isHost) return;
    const w = this.world; if (!w.zone) return;
    const intents = this.mode === 'attract' ? this.attract.intents(w) : this.takeIntents(w);
    if (this.net && this.net.preStep) this.net.preStep(w, intents);
    stepWorld(w, intents);
    if (w.camp && this.mode === 'play') campaignTick(w, dt);
    if (w.knell) knellTick(w, dt);
    if (this.net && this.net.postStep) this.net.postStep(w);
  }
  takeIntents(w) {
    const out = {};
    for (const s of this.seats) { const p = this.pending[s.seat]; if (p) { out[s.seat] = p; this.pending[s.seat] = { ...p, pressed: [false, false, false, false, false, false], dodge: false, potion: false, interact: false }; } }
    for (const h of w.heroes) if (h.bot && !h.gone) { out[h.seat] = botIntent(w, h, { goal: this.botGoal(w, h) }); }
    return out;
  }
  botGoal(w, h) { const lead = w.heroes.find((q) => !q.bot && q.alive); return lead ? { x: lead.x, z: lead.z } : null; }
  mergePending(seat, I) {
    const p = this.pending[seat];
    if (p) { for (let i = 0; i < 6; i++) I.pressed[i] = I.pressed[i] || p.pressed[i]; I.dodge = I.dodge || p.dodge; I.potion = I.potion || p.potion; I.interact = I.interact || p.interact; }
    this.pending[seat] = I;
  }
  update(ctx, dt) {
    const rdt = dt > 0 ? dt : 1 / 60; this.frame++; const eng = ctx.engine;
    if (this.serverMode) { const w0 = this.world; if (w0) { this.processEventsLite(w0); } if (this.session) this.session.update(this, rdt); return; }
    const nav = this.router.poll(rdt); const hud = ctx.hud;
    hud.clear(); this.ui.begin(hud, ctx.input, nav);
    const w = this.world; const cam = this.target;
    this.audio.update(rdt, cam);
    this.tickTimers(rdt);
    if (this.mode === 'play' || this.mode === 'session' || this.mode === 'attract') this.updateWorld(rdt, dt, nav);
    else if (this.mode === 'title' || this.mode === 'menu' || this.mode === 'create' || this.mode === 'about' || this.mode === 'settingsMenu' || this.mode === 'touch') this.updateStage(rdt);
    this.drawMode(nav, rdt);
    // idle -> attract
    if ((this.mode === 'title' || this.mode === 'menu') && !this.overlay) { if (nav.any) this.idleT = 0; else this.idleT += rdt; if (this.idleT >= 10 && !this.fast || this.forceAttract) { this.forceAttract = false; this.idleT = 0; this.enterAttract(); } }
    if (this.mode === 'attract' && nav.any && this.attract && this.attract.age > 0.5) this.exitAttract();
    this.ui.endFrame();
  }
  tickTimers(rdt) {
    if (this.cine) { this.cine.t -= rdt; this.cut = this.cine.t > 0 ? { x: this.cine.x, z: this.cine.z } : null; this.cutZoom = this.cine.t > 0 ? 1.45 : 1; if (this.cine.t <= 0) this.cine = null; }
    for (const t of this.toasts) t.t -= rdt; this.toasts = this.toasts.filter((t) => t.t > 0);
    if (this.zoneToast) this.zoneToast.t -= rdt; if (this.upgradeToast) this.upgradeToast.t -= rdt; if (this.subtitle) this.subtitle.t -= rdt;
    if (this.bannerNow) { this.bannerNow.t -= rdt; if (this.bannerNow.t <= 0) this.bannerNow = null; } if (!this.bannerNow && this.bannerQ.length) this.bannerNow = this.bannerQ.shift();
    if (this.deathT > 0) { this.deathT -= rdt; if (this.deathT <= 0) { this.ctx.engine.timeScale = 0; this.deathT = 0; } }
  }
  updateStage(rdt) {
    const w = this.world; if (!w || !w.zone) return;
    this.camAngle += rdt * 0.12; const cx = w.zone.w / 2, cz = w.zone.h / 2 - 2;
    this.target.set(cx + Math.sin(this.camAngle) * 4, 2.4, cz + Math.cos(this.camAngle * 0.7) * 2);
    this.view.update(rdt, this.target); if (this.stageBell) this.stageBell.rotation.z = Math.sin(this.ctx.time * 0.7) * 0.04;
    if (this.frame % 4 === 0) this.ctx.particles.burst('ember', [cx + (Math.sin(this.frame) * 8), 0.3, cz + Math.cos(this.frame * 1.3) * 6], { count: 1 });
  }
  updateWorld(rdt, dt, nav) {
    const w = this.world; const eng = this.ctx.engine;
    const me = this.localHero();
    const paused = !!this.overlay && this.overlay.pauses !== false && !w.session && this.mode !== 'attract';
    if (this.deathT > 0) {} else eng.timeScale = paused ? 0 : (w.devTimeScale || 1);
    // input -> intents
    if ((this.mode === 'play' || this.mode === 'session') && !this.overlay && me) {
      if (nav.start && !this.ctx.input.isDown('KeyEscape')) { }
      if (nav.start) this.pushOverlay('pause', {});
      else if (nav.hero) this.pushOverlay('hero', { tab: 0 });
      else if (nav.skills) this.pushOverlay('hero', { tab: 1 });
      else if (nav.quests) this.pushOverlay('hero', { tab: 4 });
      else if (nav.map && !w.session) this.pushOverlay('map', {});
      if (this.router.padStates.some((p) => p && p.p.left && !p.b.l1) || nav.equip) this.equipNewest(me);
      this.labelsAll = this.ctx.input.isDown('AltLeft', 'AltRight') || this.router.padStates.some((p) => p && p.b.r3);
      for (const s of this.seats) {
        const h = w.heroes.find((q) => q.seat === s.seat && !q.gone); if (!h) continue;
        const I = this.router.intent(s.seat, w, h, {}); this.mergePending(s.seat, I);
        if (s.seat === 0 && I.passingBell && !w.session) this.tryPassingBell(h, true);
        if (this.session && !this.session.isHost && s.seat === this.session.me) this.predict(w, h, I, rdt);
      }
      if (!w.session) { this.checkPartyJoin(); this.updatePassingBell(rdt, me); }
      const wheel = this.ctx.input.wheel; if (wheel) { this.zoom = Math.max(0.6, Math.min(1.4, this.zoom * (1 - wheel * 0.08))); this.ctx.input.wheel = 0; }
    }
    if (this.session) { this.session.update(this, rdt); if (!this.session.isHost && !this.session.ended) this.session.interp(w, rdt); }
    // events
    this.processEvents(w);
    // view sync
    if (this.mode !== 'attract' || true) { this.actors.syncWorld(w, dt, this); this.actors.tickDolls(); this.vfx.update(w, dt, this); this.view.update(dt, this.target); }
    this.cameraUpdate(w, rdt);
    if (this.hoverEnabled !== false && this.mode === 'play') this.hoverMonster = this.updateHover(w);
    if (this.mode === 'play' && this.net === null && w.camp) this.questLine = questLine(w.camp);
    // explored
    if (this.explored) for (const h of w.heroes) { if (h.gone) continue; const r = 9; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dz * dz > r * r) continue; const c = Math.floor(h.x) + dx, rr = Math.floor(h.z) + dz; if (c >= 0 && rr >= 0 && c < w.zone.w && rr < w.zone.h) this.explored[rr * w.zone.w + c] = 1; } }
    if (this.upgradeToast && me && !me.upgrade) this.upgradeToast = null;
  }
  processEventsLite(w) {
    let guard = 0; while (w.events.length && guard++ < 8) { for (const e of drainEvents(w)) { if (w.knell && e.t === 'bossDead' && e.boss === 'warden') knellBossDead(w); if (this.net) this.net.onEvent(e, w); } }
  }
  predict(w, h, I, rdt) {
    if (!h.alive || h.dodgeT > 0) return; const sp = h.stats.speed * w.tuning.playerSpeed; const l = Math.hypot(I.mx, I.mz);
    if (l > 0.05) { moveBy(w, h, (I.mx / Math.max(1, l)) * sp * rdt, (I.mz / Math.max(1, l)) * sp * rdt); h.facing = Math.atan2(I.mx, I.mz); h.moving = true; } else h.moving = false;
  }
  updateHover(w) {
    const gp = this.router.pointerGround(); if (!gp || this.glyphs.device === 'pad') return 0; const m = this.router.pickMonster(w, gp, {}); return m && !m.prop ? m.id : 0;
  }
  equipNewest(h) {
    const w = this.world; const it = h.inv.find((x) => x.uid === h.upgrade) || h.inv.slice().reverse().find((x) => isUpgrade(h, x)); if (!it) { this.toast('NO UPGRADE TO EQUIP'); return; }
    equipItem(w, h, it.uid); h.upgrade = 0; this.upgradeToast = null; this.audio.sfx('equip'); this.toast('EQUIPPED ' + it.name.toUpperCase());
  }
  tryPassingBell(h, start) {
    const w = this.world; if (w.knell || w.zoneDef.safe || w.session || w.zoneDef.boss) return;
    h.passing = (h.passing || 0) + 1 / 60; if (h.passing >= 1.5) { h.passing = 0; this.enterZone('town'); }
  }
  updatePassingBell(rdt, me) { if (!me) return; if (!(this.router.padStates.some((p) => p && p.b.down) || this.ctx.input.isDown('KeyT'))) { me.passing = 0; return; } this.tryPassingBell(me); }
  checkPartyJoin() {
    if (this.world.session) return;
    for (const p of this.router.padStates) {
      if (!p || !p.p.options || p.b.create) continue;
      if (this.seats.length < 4 && !this.seats.find((s) => s.pad === p.index) && this.router.padStates.filter(Boolean).length >= 2) { this.joinSeat(p.index); }
    }
    if (this.router.padStates.filter(Boolean).length >= 2 && !this.couchHint) { this.couchHint = true; this.toast('A SECOND PAD IS READY: PRESS OPTIONS ON IT TO JOIN'); }
  }
  joinSeat(pad) {
    const w = this.world; const seat = this.seats.length; const classes = ['bellwarden', 'lamplighter', 'sexton']; const cls = classes[(seat) % 3];
    const lvl = Math.max(...w.heroes.map((h) => h.level)); const saved = this.save.data.guests[cls];
    const h = createHero(w, { seat, cls, name: ['Ash', 'Briar', 'Cobb', 'Dusk'][seat], level: lvl, saved: saved ? { ...saved, seat } : null });
    if (!saved) { autoLoadout(h, { tones: true, vows: true }); refreshStats(w, h, true); }
    const lead = w.heroes[0]; h.x = lead.x + 1; h.z = lead.z + 1;
    if (this.seats[0] && this.seats[0].pad == null) { const first = this.router.padStates.find((q) => q && q.index !== pad); if (first) { this.seats[0].pad = first.index; this.router.seatPad[0] = first.index; } }
    this.seats.push({ seat, kind: 'pad', pad }); this.router.seatPad[seat] = pad; this.couch = true; this.toast(h.name.toUpperCase() + ' JOINS AS ' + CLASSES[cls].name.toUpperCase());
  }
  leaveSeat(seat) { const w = this.world; const h = w.heroes.find((q) => q.seat === seat); if (h && seat > 0) { h.gone = true; ev(w, { t: 'leave', seat }); } this.seats = this.seats.filter((s) => s.seat !== seat); this.router.seatPad[seat] = null; this.couch = this.seats.length > 1; }
  processEvents(w) {
    let guard = 0;
    while (w.events.length && guard++ < 8) {
      const evs = drainEvents(w);
      for (const e of evs) {
        this.actors.onEvent(e, w); this.vfx.onEvent(e, w);
        if (this.mode === 'play' || this.mode === 'attract') { if (w.camp && this.mode === 'play') { campaignEvent(w, e); writEvent(w, e); } if (w.knell && e.t === 'bossDead' && e.boss === 'warden' && (!this.session || this.session.isHost)) knellBossDead(w); }
        this.onSimEvent(e, w);
        if (this.net && this.net.onEvent) this.net.onEvent(e, w);
      }
    }
  }
  onSimEvent(e, w) {
    switch (e.t) {
      case 'subtitle': this.say(e.who, e.text); break;
      case 'questStep': this.toast('DONE: ' + e.text.toUpperCase(), 0, 'lime'); this.audio.sfx('ui_ok'); break;
      case 'questDone': this.banner('QUEST COMPLETE', 'lime', 2, 3, e.name.toUpperCase()); this.audio.sfx('levelup'); break;
      case 'campaignDone': this.onCampaignDone(); break;
      case 'bossStart': if (!w.session && this.mode === 'play') { const b = w.monsters.find((q) => q.id === e.id); if (b) this.cine = { t: 2.6, dur: 2.6, x: b.x, z: b.z }; } this.audio.music(e.boss === 'malison' ? 'summit' : e.boss === 'warden' ? 'knell' : 'counting'); this.banner(e.name, 'red', 2, 3); this.audio.sfx('boss_stinger'); this.shake(0.4); break;
      case 'music': this.audio.music(e.song); break;
      case 'dark': this.darkMode = e.on; this.ctx.engine.ambient.intensity = e.on ? 0.25 : 1; this.ctx.engine.sun.intensity = e.on ? 0.1 : 0.5; break;
      case 'bossDead': this.audio.sfx('death_big'); this.banner('VICTORY', 'sand', 2, 3, e.name.toUpperCase()); break;
      case 'lychgate': this.save.acct && 0; if (w.camp) w.camp.lychgates[w.zoneId + ':' + e.n] = true; break;
      case 'openMap': this.pushOverlay('map', {}); break;
      case 'levelup': if (e.seat === (this.localSeat ?? 0)) { this.toast('LEVEL ' + e.level); const h = this.localHero(); if (h && SKILLS && slotsOpen(h.level) > slotsOpen(h.level - 1)) this.toast('A NEW SKILL SLOT OPENS'); } break;
      case 'crumble': this.onCrumble(e); break;
      case 'knellDone': this.onKnellDone(e); break;
      case 'flash': this.ctx.engine.screen.flash('white', { duration: 0.4 }); break;
      case 'coffinDone': break;
      case 'tele': if (!this.seenTele) { this.seenTele = true; this.toast('RED MEANS DANGER: DODGE'); } break;
      default: break;
    }
  }
  onCrumble(e) { this.view.markPits(e); }
  onCampaignDone() { this.playEnding(); }
  onKnellDone(e) { this.pushOverlay('knellresults', { result: e.result }); }
  cameraUpdate(w, rdt) {
    const hs = livingHeroes(w); let tx = 0, tz = 0, n = 0;
    for (const h of hs.length ? hs : w.heroes) { if (h.gone) continue; tx += h.x; tz += h.z; n++; }
    if (n) this.target.set(tx / n, 0.9, tz / n);
    if (this.cut) { this.target.set(this.cut.x, 0.9, this.cut.z); }
    // zoom out for couch: fit all seats
    let want = this.zoom;
    if (n > 1) { let far = 0; for (const h of w.heroes) { if (!h.gone) far = Math.max(far, Math.hypot(h.x - this.target.x, h.z - this.target.z)); } want = Math.max(0.62, Math.min(this.zoom, 1 / (1 + far / 12))); }
    const vh = w.tuning.viewHeight; const z = want * (11.5 / vh) * (this.cutZoom || 1);
    this.ctx.camera.setZoom(Math.max(this.ctx.camera.minZoom, Math.min(this.ctx.camera.maxZoom, z)));
    if (this.audio) this.audio.camX = this.target.x, this.audio.camZ = this.target.z;
  }
  cameraTarget() { return this.target; }
  drawMode(nav, rdt) {
    const w = this.world; const ui = this.ui;
    if (this.cine && this.cine.t > 0) { const hud = ui.real; const k = Math.min(1, Math.min(this.cine.t, this.cine.dur - this.cine.t) / 0.4); const bh = Math.round(26 * Math.max(0, k)); hud.rect(0, 0, hud.width, bh, 'ink'); hud.rect(0, hud.height - bh, hud.width, bh, 'ink'); }
    if (this.mode === 'play' || this.mode === 'attract' || this.mode === 'session') {
      if (w && w.zone && this.mode !== 'attract' && !(this.overlay && (this.overlay.type === 'narration' || this.overlay.type === 'ending' || this.overlay.type === 'dialog'))) { drawHud(this); this.drawDevOverlays(ui); }
      if (this.mode === 'attract' && this.attract) this.attract.draw(ui);
    }
    if (this.mode === 'session' && this.net) this.net.draw(ui);
    drawScreen(this, nav, rdt);
  }
  teardownWorld(toAttract) {
    this.actors.clear(); this.vfx.clear(); this.clearView(); this.audio.stopAll(); this.world = null; this.slot = null; this.seats = [{ seat: 0, kind: 'kbm' }]; this.couch = false; this.ctx.engine.timeScale = 1; this.darkMode = false;
    this.ctx.engine.ambient.intensity = 1; this.mode = 'title'; this.enterTitle();
  }
  reviveAll(where) {
    const w = this.world; const gate = w.spots.find((s) => s.kind === 'lychgate' && s.unlocked) || (w.zone.entrance ? { x: w.zone.entrance.x, z: w.zone.entrance.z } : null);
    if (where === 'town') { for (const h of w.heroes) { h.respawnT = null; reviveHero(w, h, 1); } this.enterZone('town'); return; }
    for (const h of w.heroes) { h.respawnT = null; const at = where === 'gate' && gate ? { x: gate.x + 1.5, z: gate.z } : h.diedAt; reviveHero(w, h, 1, at); }
  }
  createGuest(cls, seat, level, bot) {
    const w = this.world; const saved = this.save.data.guests[cls];
    const h = createHero(w, { seat, cls, name: ['Ash', 'Briar', 'Cobb', 'Dusk'][seat] || 'Guest', level, bot, saved: saved ? { ...saved, seat, level } : null });
    if (!saved) { autoLoadout(h, { tones: true, vows: true }); refreshStats(w, h, true); }
    const lead = w.heroes[0]; h.x = lead.x + 1.2; h.z = lead.z + 1.2; return h;
  }
  beginKnellView() { this.clearView(); this.buildView(); this.audio.music('knell'); this.audio.ambience('fire'); this.questLine = ''; this.zoneToast = { text: 'THE KNELL', t: 3 }; }
  finishCampaign() { const w = this.world; w.camp.done = true; w.camp.credits = true; this.banner('THE END OF THE BEGINNING', 'sand', 2, 4); this.toast('KNELL RUNS ARE NOW OPEN'); this.enterZone('town'); }
  drawDevOverlays(ui) {
    const D = this.devOverlays; if (!D || !this.world || !this.world.zone) return; const w = this.world; const h = this.localHero(); if (!h) return;
    const hud = ui.hud;
    if (D.stats) { ui.text(8, 30, `FPS ${this.ctx.engine.fps.toFixed(0)} FRAME ${this.ctx.engine.frame} MON ${w.monsters.length} SHOTS ${w.shots.length}`, { color: 'lime' }); }
    for (const m of w.monsters) {
      if (m.dead) continue; const near = Math.hypot(m.x - h.x, m.z - h.z) < 22; if (!near) continue; const [sx, sy] = projectXY(this, m.x, 1, m.z);
      if (D.circles) hud.rect(Math.round(sx - m.r * 6), Math.round(sy + 6), Math.round(m.r * 12), 1, 'red');
      if (D.ai && !m.prop) ui.text(Math.round(sx - 10), Math.round(sy - 14), m.state, { color: 'sky' });
    }
    if (D.spawns) for (const mk of w.zone.markers) { if (mk.t === 'S' || mk.t === 'E') { const [sx, sy] = projectXY(this, mk.x, 0, mk.z); hud.rect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3, mk.t === 'E' ? 'sand' : 'red'); } }
    if (D.nav) for (let dz = -7; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) { const x = Math.floor(h.x) + dx + 0.5, z = Math.floor(h.z) + dz + 0.5; if (!w.zone.nav.walkable(x, z)) { const [sx, sy] = projectXY(this, x, 0, z); hud.rect(Math.round(sx) - 1, Math.round(sy) - 1, 2, 2, 'slate'); } }
    if (D.flow) { const o = [0, 0]; for (let dz = -5; dz <= 5; dz += 2) for (let dx = -5; dx <= 5; dx += 2) { const x = Math.floor(h.x) + dx + 0.5, z = Math.floor(h.z) + dz + 0.5; if (w.navs[0].flowDirection(x, z, o)) { const [sx, sy] = projectXY(this, x, 0, z); hud.rect(Math.round(sx), Math.round(sy), 2, 2, 'lime'); hud.rect(Math.round(sx + o[0] * 3), Math.round(sy + o[1] * 3), 1, 1, 'white'); } } }
  }
  // ------------------------------------------------------------------ tooling
  status() { const w = this.world; if (!w) return this.mode; const h = this.localHero(); return `${this.mode}${this.overlay ? '/' + this.overlay.type : ''} ${w.zoneId || ''} L${h ? h.level : 0} kills ${w.kills} hp ${h ? Math.round(h.hp) : 0}`; }
  fingerprint() { const w = this.world; if (!w) return this.mode; let s = w.tick + ':' + w.kills + ':' + w.monsters.length; for (const h of w.heroes) s += `|${h.x.toFixed(2)},${h.z.toFixed(2)},${Math.round(h.hp)},${h.level}`; return s; }
  ready() { if (typeof window !== 'undefined') window.__GAME__ = this; }
  dispose() { try { this.actors.dispose(); this.vfx.dispose(); this.view.dispose(); } catch {} if (typeof window !== 'undefined' && window.__GAME__ === this) window.__GAME__ = null; }
}
