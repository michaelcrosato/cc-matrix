// The one Game object: the world is built once; title, attract, campaign and round are modes on it. No DOM at import.
import { THREE, Rng, PALETTE } from '../pixel-engine.js';
import { GAME_TITLE } from './content/title.js';
import { TUNING } from './core/tuning.js';
import { Events } from './core/events.js';
import { Actions } from './core/actions.js';
import { installLook, makeCamState } from './core/look.js';
import { Save, loadSettings, storeSettings, DEFAULT_SETTINGS } from './core/save.js';
import { Clock } from './core/clock.js';
import { Ground } from './world/ground.js';
import { FireGrid } from './world/fire.js';
import { FireView } from './world/fireview.js';
import { Wind } from './world/wind.js';
import { Sky } from './world/sky.js';
import { GrassManager } from './world/grass.js';
import { World } from './world/world.js';
import { Places } from './world/places.js';
import { HeldMap } from './world/map-texture.js';
import { Player } from './actors/player.js';
import { Actors } from './actors/actors.js';
import { Npcs } from './actors/npc.js';
import { Interact } from './actors/interact.js';
import { Weapons } from './combat/weapons.js';
import { Damage } from './combat/damage.js';
import { Projectiles } from './combat/projectiles.js';
import { Fx } from './combat/fx.js';
import { ViewModel } from './combat/viewmodel.js';
import { Body } from './body/health.js';
import { Vehicles, Driving } from './vehicles/driving.js';
import { Train } from './vehicles/train.js';
import { MissionRunner } from './missions/runner.js';
import { makeStory } from './missions/story.js';
import { Ledger } from './missions/ledger.js';
import { SceneDirector, Ending } from './missions/scene.js';
import { Dialogue, Subtitle } from './ui/dialogue.js';
import { GameHud } from './ui/hud.js';
import { UI } from './ui/ui.js';
import { Shell, isTouchOnly, NOTICE_TOUCH } from './ui/shell.js';
import { About } from './ui/about.js';
import { Sfx } from './audio/sfx.js';
import { Music } from './audio/music.js';
import { Voice } from './audio/voice.js';
import { Ambience } from './audio/ambience.js';
import { DevMode } from './dev/devmode.js';
import { Attract } from './attract/director.js';
import { drawnGlyphs } from './ui/glyphs.js';
import { Round, TRUCK_AT, ROAD_ENDS } from './net/round.js';
import { soloSession, linkSession } from './net/session.js';
import { SITES, HALTS } from './content/sites.js';
import { WEAPONS } from './content/weapons.js';
import { LINES } from './content/dialogue.js';
import { clamp, lerp, wrapAngle } from './core/rng.js';
const { Vector3 } = THREE;
export const LOOK = {
  scene: [{ id: 'adjust', params: { brightness: 0, contrast: 1.06, saturation: 1.05, warmth: 0.04 } }, { id: 'chromatic', params: { spread: 0 } }, { id: 'vignette', params: { intensity: 0.28, softness: 0.7, amount: 1 } }],
  actors: { pixel: { size: 1, outline: 0.45, crease: 0.08 }, filters: [] },
  environment: { pixel: { size: 1, outline: 0.32, crease: 0.05 }, filters: [] },
};
const SAFE_NEAR = ['pump-shed', 'ranger-post', 'water-tower'];
class FarCryUncle {
  name = GAME_TITLE; mode = 'boot'; tick = 0; time = 0; realT = 0; timers = []; realTimers = []; hasPlayer = true; ended = false; hitMap = new Map(); treeColliders = [];
  camPos = new Vector3(0, 50, 0); target = new Vector3(); monoT = 0; adsFov = 0; wheelStep = 0; lookT = 0; skyT = 0; hudHidden = false; lastSafe = null; skipHold = 0; mapZoom = false;
  right = new Vector3(); _listener = { position: new Vector3(), right: new Vector3(1, 0, 0) }; anchorPos = new Vector3(); holdT = 0; idle = 0;
  constructor(options = {}) { this.options = options; }
  async setup(ctx) {
    this.ctx = ctx;
    const o = this.options, session = o.session;
    this.views = !!ctx.engine.gpu || !!o.forceViews;
    this.hasPlayer = !session?.server;
    const r = ctx.random;
    this.rng = { gun: r.fork('gun'), fever: r.fork('fever'), ai: r.fork('ai'), look: r.fork('look'), fx: r.fork('fx'), story: r.fork('story') };
    this.events = new Events();
    this.story = makeStory();
    this.ledger = new Ledger(this);
    this.settings = session ? { ...DEFAULT_SETTINGS } : loadSettings();
    this.actions = new Actions(ctx.input);
    this.cam = makeCamState();
    this.save = new Save(this);
    this.clock = new Clock(this);
    this.ground = new Ground(7);
    this.fire = new FireGrid(this.ground, r.fork('fire'));
    this.wind = new Wind(r.fork('wind'));
    this.damage = new Damage(this);
    this.fx = new Fx(this);
    this.projectiles = new Projectiles(this);
    this.sfx = new Sfx(this);
    this.voice = new Voice(this);
    this.music = new Music(this);
    this.ambience = new Ambience(this);
    this.grass = new GrassManager(this);
    this.fireView = new FireView(this);
    this.interact = new Interact(this);
    this.sky = new Sky(this);
    this.world = new World(this);
    this.player = new Player(this);
    this.weapons = new Weapons(this);
    this.vm = new ViewModel(this);
    this.body = new Body(this);
    this.actors = new Actors(this);
    this.npcs = new Npcs(this);
    this.vehicles = new Vehicles(this);
    this.driving = new Driving(this);
    this.train = new Train(this);
    this.map = new HeldMap(this);
    this.places = new Places(this);
    this.missions = new MissionRunner(this);
    this.dialogue = new Dialogue(this);
    this.subtitle = new Subtitle();
    this.scene = new SceneDirector(this);
    this.ending = new Ending(this);
    this.hud = new GameHud(this);
    this.ui = new UI(this);
    this.shell = new Shell(this);
    this.about = new About();
    this.dev = new DevMode(this);
    this.attract = new Attract(this);

    this.sfx.build(ctx);
    this.voice.build(ctx);
    this.fx.build(ctx);
    this.sky.build(ctx);
    this.world.build(ctx);
    this.fireView.build(ctx);
    if (this.hasPlayer) {
      this.player.build(ctx);
      this.vm.build(ctx);
      this.map.build(ctx);
    }
    this.vehicles.build(ctx);
    this.train.build(ctx);
    this.actors.build(ctx);
    this.npcs.build(ctx);
    if (this.hasPlayer) this.places.build(ctx);
    if (ctx.camera.preset === 'first') {
      const c = ctx.camera.camera;
      c.far = 1000; c.fov = this.settings.fov; c.updateProjectionMatrix();
      installLook(ctx, this.cam);
    }
    // The pointer: accessor, so menu clicks never grab it (PLAN section 3).
    this.wantLock = false;
    const self = this;
    Object.defineProperty(ctx.input, 'wantsPointerLock', { get: () => self.wantLock, set() {}, configurable: true });
    this.installPage();
    this.ambience.build(ctx);
    this.applySettings();
    this.sky.apply(ctx, this.clock.hour);
    this.wireEvents();
    if (session) {
      this.mode = 'round';
      this.round = new Round(this, session);
      this.round.build(ctx);
      // The round can start now: shaders compile behind it, and the net tick does not wait for frames.
      session.ready();
    } else {
      this.mode = 'title';
      this.setupTitleScene();
      if (o.skipEpigraph) this.shell.enterTitle();
      else this.ui.epigraph(2.6, () => this.shell.enterTitle());
    }
  }
  installPage() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const canvas = () => document.querySelector('#app canvas');
    this.lockHandler = () => {
      if (!document.pointerLockElement && this.hadLock && this.playingNow() && !this.ui.open) { this.shell.openPause(); }
      this.hadLock = !!document.pointerLockElement;
    };
    document.addEventListener('pointerlockchange', this.lockHandler);
    document.addEventListener('pointerlockerror', () => {});
    // Re-lock from a pointerup when the game wants it. requestPointerLock can reject shortly after Esc.
    window.addEventListener('pointerup', () => {
      if (!this.wantLock || document.pointerLockElement) return;
      const c = canvas();
      try { const p = c?.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); } catch { /* the browser said no */ }
    });
    window.addEventListener('gamepaddisconnected', () => { if (this.playingNow() && !this.ui.open) this.shell.openPause(); });
  }
  wireEvents() {
    const e = this.events;
    e.on('fire-lit', (id, src) => {
      if (this.round?.isHost) { this.round.fireEvent('i', id); if (src === 'player') { const m = this.round.local; if (m) m.cells++; } }
    });
    const prevBurnt = this.fire.onBurnt;
    this.fire.onBurnt = (id) => { prevBurnt?.(id); if (this.round?.isHost) this.round.fireEvent('b', id); };
    e.on('reload-start', () => this.hudTouch('ammo'));
  }
  // ---- helpers the systems call ----
  anchor() {
    if (this.hasPlayer && this.mode !== 'title') return this.player.feet;
    return this.anchorPos.set(150, 40, -260);
  }
  listener() {
    const l = this._listener;
    l.position.copy(this.camPos);
    if (this.hasPlayer && this.ctx.camera.preset === 'first') { const y = this.player.yaw; l.right.set(Math.cos(y), 0, -Math.sin(y)); }
    return l;
  }
  playingNow() { return this.mode === 'campaign' || (this.mode === 'round' && this.round?.playing()) || this.mode === 'attract'; }
  canAct() {
    return this.hasPlayer && this.playingNow() && !this.menuBlocksPlay() && !this.scene.locksMove && !this.player.seat && !this.body.surgery && !this.body.dead && !this.round?.localDown_;
  }
  canHands() { return this.hasPlayer && this.playingNow() && !this.menuBlocksPlay() && !this.scene.locksMove && !this.body.dead; }
  canActSeated() { return this.canHands() && !this.mapUp; }
  menuBlocksPlay() { return this.ui.open; }
  get mapUp() { return this.map.up; }
  mapCursorActive() { return this.map.up; }
  inMonocular() { return this.monoT > 0.05; }
  after(t, fn) { this.timers.push({ t: this.time + t, fn }); }
  afterReal(t, fn) { if (t <= 0) fn(); else this.realTimers.push({ t: this.realT + t, fn }); }
  notice(text, s = 3) { this.hud.noticeText = text; this.hud.noticeT = s; }
  stepBanner(text) { this.hud.banner = text; this.hud.bannerT = 5; this.currentStepText = text; }
  say(who, text, s = 3, minor = false) { if (!text) return; this.subtitle.set(who, text, s); }
  hudTouch() { this.hud.touch(); }
  showJam() { this.hud.jamT = 2; this.hud.touch(); }
  rumble(strength, seconds) {
    if (!this.settings.rumble || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    try { for (const p of navigator.getGamepads()) if (p?.vibrationActuator?.playEffect) p.vibrationActuator.playEffect('dual-rumble', { duration: Math.round(seconds * 1000), strongMagnitude: clamp(strength, 0, 1), weakMagnitude: clamp(strength * 0.7, 0, 1) }).catch?.(() => {}); } catch { /* no rumble */ }
  }
  faceNpc(n) { this.scene.faceAt(n ? n.head() : null); }
  faceActor(a) { this.scene.faceAt(a ? () => [a.x, a.y + 1.5, a.z] : null); }
  fall() { this.ctx.engine.screen.cover('fade', { duration: 1.4 }); this.vm.setVisible(false); }
  wake() { this.ctx.engine.screen.reveal('fade', { duration: 1.4 }); this.vm.setVisible(true); }
  equipBest() { const w = this.weapons; if (w.slots.main) w.equip('main'); else if (w.slots.sidearm) w.equip('sidearm'); }
  squadsAlertAll(key) { const sq = this.actors.squads.get(key); if (!sq) return; for (const m of sq.members) if (!m.dead) { m.alertTo(this.player.feet.x, this.player.feet.z, 'player'); m.targetInfo = this.actors.playerInfo(); } }
  status() {
    const m = this.missions?.active;
    return `${this.mode}${m ? ` ${m.id} step ${this.missions.stepI}` : ''} hp ${Math.round(this.body?.hp ?? 0)} stones ${this.story?.stones ?? 0} burnt ${this.fire?.counts.burnt ?? 0} hour ${(this.clock?.hour ?? 0).toFixed(1)}`;
  }
  fingerprint() {
    if (!this.body) return '';
    const g = this.weapons.gun;
    let pos = 0;
    for (const s of this.actors.soldiers) pos = (pos * 31 + Math.round(s.x * 10) + Math.round(s.z * 10)) | 0;
    return `${Math.round(this.body.hp * 100)}|${this.story.stones}|${g?.id}:${Math.round((g?.cond ?? 0) * 100)}:${g?.jam ?? 0}:${Math.round(g?.mag ?? 0)}|${this.fire.counts.burning}:${this.fire.counts.burnt}|${pos}`;
  }
  /** One plain JSON snapshot for every test. */
  state() {
    const w = this.weapons, g = w.gun, f = this.player.feet, ms = this.ui.menu.state();
    return {
      mode: this.mode, screen: ms.screen, focus: ms.focus, item: ms.item, items: ms.items, tab: ms.tab, page: ms.page, device: this.actions.device, glyphSet: this.settings.glyphs,
      notice: this.shell.gate ? NOTICE_TOUCH : (this.hud.noticeT > 0 ? this.hud.noticeText : null),
      attract: this.attract.active, attractBeat: this.attract.active ? this.attract.beatI : null, mission: this.missions.active?.id ?? null, step: this.missions.active ? this.missions.stepI : null, stepDo: this.missions.currentStep()?.do ?? null, stepText: this.missions.currentStep()?.text ?? null,
      hp: this.body.hp, stones: this.story.stones, tablets: this.body.tablets, syrettes: this.body.syrettes,
      weapon: g ? { id: g.id, cond: g.cond, jammed: g.jam > 0, jam: g.jam, mag: g.mag, reserve: g.reserve } : null,
      fever: this.body.fever, pos: [f.x, f.y, f.z], yaw: this.player.yaw, vehicle: this.driving.vehicle ? { kind: this.driving.vehicle.kind, hp: this.driving.vehicle.hp, speed: this.driving.vehicle.car.speed, stalled: this.driving.vehicle.stalled } : null,
      hour: this.clock.hour, wind: { dir: this.wind.dir, speed: this.wind.total }, fire: { burning: this.fire.counts.burning, burnt: this.fire.counts.burnt },
      prompts: [...this.hud.prompts.map((p) => ({ act: p.act, glyph: p.glyph, text: p.text })), ...this.ui.menu.noted], glyphsOnScreen: [...drawnGlyphs], subtitle: this.subtitle.active ? this.subtitle.text : null,
      buddies: this.actors.buddies.map((b) => ({ id: b.id, met: b.met, dead: b.dead, trust: b.trust, active: b.active, down: b.isDown })), ledger: { ...this.ledger.v, hectares: this.ledger.hectares() }, done: [...this.missions.done], round: this.round ? { phase: this.round.phase, finished: this.round.finished, mercs: this.round.mercs.map((m) => ({ id: m.id, stones: m.stones, down: m.down, hp: m.hp, carrying: m.carrying })), cases: this.round.cases.map((c) => c.state) } : null,
    };
  }
  ready(ctx) {
    if (typeof window !== 'undefined') window.__GAME__ = this;
  }
  cameraTarget() { return this.target; }
  eyePosition() { return this.player.eye; }
  onCameraChange(ctx) {
    if (ctx.camera.preset === 'first') {
      const c = ctx.camera.camera;
      c.far = 1000; c.fov = this.settings.fov; c.updateProjectionMatrix();
      installLook(ctx, this.cam);
      if (this.hasPlayer) { ctx.scene.add(c); this.vm.attach(c); }
    } else if (ctx.camera.camera) ctx.camera.camera.far = 1000;
  }
  // ---- campaign flow ----
  resetCampaign({ keepScene, keepAttract } = {}) {
    this.noPassWarned = new Set();
    const ctx = this.ctx;
    this.dialogue.stopAll();
    this.scene.stop();
    if (this.player.seat) { if (this.driving.vehicle) this.driving.eject(); else this.player.leaveTrain(this.player.feet.x, this.player.feet.z); }
    this.map.raise(false);
    this.world.reset(ctx);
    this.world.stopColumn();
    this.world.closeCage();
    this.story = makeStory();
    this.ledger.reset();
    this.weapons.resetLoadout();
    this.body.resetAll();
    this.actors.reset();
    this.vehicles.reset();
    this.missions.reset();
    this.projectiles.clear();
    this.places.resetAll();
    this.map.seen.clear(); this.map.notes = []; this.map.markers = []; this.map.waypoint = null; this.map.marginLines = []; this.map.dirty = true;
    this.wind.reset();
    this.sky.setWeather('clear');
    this.timers.length = 0;
    this.player.frozen = false; this.player.stance = 'stand'; this.player.flying = false; this.player.carrying = null;
    this.cam.override = null; this.cam.roll = 0;
    this.shelling = null; this.holdT = 0; this.endingMusic = false; this.titleOverlay = false; this.skipPrompt = false; this.mapHint = false; this.tabletHint = false; this.healHint = false; this.trackerHint = false;
    this.ending.finished = false; this.ending.endScene = false;
    if (!keepAttract) { this.dev.god = false; this.dev.infiniteAmmo = false; this.dev.noWear = false; }
    this.vm.showGun(this.weapons.gun?.id ?? 'cane', false);
    this.vm.setVisible(true);
    this.npcs.sync();
    this.hud.prompts.length = 0;
    this.ctx.engine.screen.clear();
  }
  startNew() {
    const g = this;
    this.ui.menu.clear();
    this.save.clear();
    this.ui.epigraph(2.4, () => {
      g.mode = 'campaign';
      g.resetCampaign();
      g.missions.start('m0');
    });
    this.mode = 'campaign-loading';
  }
  startContinue() {
    this.ui.menu.clear();
    this.ui.epigraph(2, () => { this.mode = 'campaign'; if (!this.save.requestLoad()) this.toTitle(); });
    this.mode = 'campaign-loading';
  }
  setupForJump(m) {
    const w = this.weapons, b = this.body;
    w.give('m38', 100, false); w.give('tractor', 80, true); w.bottles = 2; w.charges = 2;
    this.story.unlocked.add('molotov'); this.story.trackerOwned = this.missions.done.has('m4');
    b.tablets = Math.max(b.tablets, 4); b.syrettes = 3;
    if (this.missions.done.has('m0')) { this.story.feverRunning = true; b.scheduleFever(); }
    this.story.safehouses.add('pump-shed');
    this.lastSafe = this.lastSafe ?? [SITES['pump-shed'].at[0] + 3, SITES['pump-shed'].at[1] + 3];
    if (this.missions.done.has('m1')) this.vehicles.startPatrols();
    this.clock.set(10);
    const n = m.giver && this.npcs.byWho[m.giver];
    if (n) { this.player.teleport(n.x + 2, n.z + 3); this.player.setYaw(Math.atan2(-(n.x - (n.x + 2)), -(n.z - (n.z + 3))), 0); }
    else { const s = SITES['pump-shed']; this.player.teleport(s.at[0] + 2, s.at[1] + 4); }
    this.npcs.sync();
  }
  applyStoryToWorld() {
    const st = this.story;
    if (st.flags.wellsEmpty) this.actors.civilians.emptyVillage();
    if (st.flags.columnWalking) this.world.startColumn();
    if (st.flags.tracker) st.trackerOwned = true;
    if (st.flags['up-vkit']) this.vehicles.hasKit = true;
    if (st.flags.arrived) this.vehicles.startPatrols();
    this.missions.refreshJobs();
    this.places.applySaved();
    this.npcs.sync();
  }
  toTitle() {
    this.ui.menu.clear();
    if (this.round) { this.round.dispose(); this.round = null; }
    this.engineResume();
    this.resetCampaign();
    this.mode = 'title';
    this.setupTitleScene();
    this.shell.enterTitle();
  }
  resume() { this.ui.menu.clear(); this.engineResume(); }
  engineResume() { this.ctx.engine.timeScale = 1; }
  applyTimeScale() {
    const stack = this.ui.menu.stack;
    const pausing = stack.some((s) => s.pausesWorld) && !(stack.some((s) => s.id === 'dev') && !this.dev.frozen);
    this.ctx.engine.timeScale = pausing || stack.some((s) => s.id === 'gameover') ? 0 : 1;
  }
  onMenuChange() { if (this.ctx?.engine) this.applyTimeScale(); }
  gameOver() {
    this.events.emit('game-over');
    this.ui.openGameOver();
  }
  /** Fever took you: you wake at the nearest safehouse or the clinic hours later, with 20% of your stones gone. */
  collapseAway() {
    const g = this;
    if (this.player.seat && this.driving.vehicle) this.driving.eject();
    this.map.raise(false);
    const f = this.player.feet;
    let best = SITES['mile-forty'], bd = Math.hypot(f.x - best.at[0], f.z - best.at[1]);
    for (const k of this.story.safehouses) { const s = SITES[k], d = Math.hypot(f.x - s.at[0], f.z - s.at[1]); if (d < bd) { bd = d; best = s; } }
    const lost = Math.ceil(this.story.stones * 0.2);
    this.player.frozen = true;
    this.fall();
    this.after(1.6, () => {
      g.story.stones -= lost;
      g.clock.advance(6);
      const off = best === SITES['mile-forty'] ? [-42, -26] : (best.safe?.bed ?? [2, 2]);
      g.player.teleport(best.at[0] + off[0] + 1, best.at[1] + off[1] + 1);
      g.player.frozen = false;
      g.body.hp = Math.max(g.body.hp, 60);
      g.wake();
      const buddy = g.actors.liveBuddies().find((b) => g.clock.abs >= b.spentUntil);
      const key = buddy && LINES[`fever.buddy.${buddy.id}`] ? `fever.buddy.${buddy.id}` : 'fever.collapse';
      g.dialogue.play(key);
      g.notice(lost ? `${lost} STONES GONE.` : 'NOTHING TO TAKE.', 4);
    });
  }
  /** Coming up on a headquarters with no pass: you are told once, while there is still time to turn round. */
  warnNoPass() {
    if (this.mode !== 'campaign' || this.story.pass || !this.hasPlayer) return;
    const f = this.player.feet, seen = (this.noPassWarned ??= new Set());
    for (const k of ['fort-clement', 'granary']) {
      const at = SITES[k].at;
      if (seen.has(k) || Math.hypot(f.x - at[0], f.z - at[1]) > 170) continue;
      if (this.story.grace && this.clock.abs < this.story.grace.until) continue;
      seen.add(k);
      this.notice('NO PASS. THEY SHOOT. THE BOARD AT MILE FORTY HAS WORK.', 6);
    }
  }
  sleepTo(hour, key) {
    const g = this, site = SITES[key];
    this.ctx.engine.screen.cover('fade', { duration: 0.5 });
    this.player.frozen = true;
    this.after(0.55, () => {
      g.clock.set(hour);
      g.fire.regrowTick();
      g.fire.dayRoll();
      g.lastSafe = [site.at[0] + site.safe.bed[0] + 1.5, site.at[1] + site.safe.bed[1] + 1.5];
      g.body.hp = Math.max(g.body.hp, 100);
      if (g.actors.buddy('mags')?.met && !g.actors.buddy('mags').dead) g.body.syrettes = Math.min(g.body.maxSyrettes, g.body.syrettes + 1);
      for (const v of g.vehicles.list) if (v.alive && Math.hypot(v.x - site.at[0], v.z - site.at[1]) < 40) { v.hp = 100; v.stalled = false; v.onFire = 0; }
      g.npcs.sync();
      g.save.write('sleep');
      g.ui.epigraph(2, () => { g.player.frozen = false; g.ctx.engine.screen.reveal('fade', { duration: 0.6 }); g.events.emit('slept', hour); });
    });
  }
  railTravel(key) {
    const g = this, h = HALTS[key];
    if (this.story.stones < 1) return;
    this.story.stones -= 1;
    const line = this.dialogue.pick('bakr.travel');
    this.sfx.play('train-clack');
    this.voice.say('bakr', line);
    let clacks = 0;
    this.ui.blackTalk(line, 'OLD BAKR', 3.4, () => {
      g.clock.advance(1);
      g.player.teleport(h.at[0] + 2, h.at[1] - 2);
      g.events.emit('rail-travel', key);
    });
    this.after(1, () => this.sfx.play('train-clack'));
    this.after(2, () => this.sfx.play('train-clack'));
  }
  startRound(kind) {
    const g = this, ctx = this.ctx;
    this.ui.menu.clear();
    this.engineResume();
    this.resetCampaign();
    if (kind === 'solo') {
      this.mode = 'round';
      this.round = new Round(this, soloSession(this.tick + 1));
      this.round.build(ctx);
      this.vm.setVisible(true);
      this.music.force('fight', this.realT);
      return;
    }
    const s = linkSession(kind);
    this.mode = 'lobby';
    this.linkPending = s;
    const showLobby = () => {
      this.ui.menu.clear();
      this.ui.menu.push({
        id: 'lobby', title: 'CASH RUN', subtitle: kind === 'host' ? 'OPEN THE GAME IN A SECOND WINDOW AND JOIN.' : 'LOOKING FOR THE OTHER WINDOW.',
        items: () => {
          const list = s.players.map((p) => ({ id: `p${p.id}`, label: p.name, enabled: false, small: true, focusable: false }));
          if (kind === 'host') list.push({ id: 'start', label: 'START', enabled: s.players.length >= 2, focusable: true, onSelect: () => s.begin() });
          list.push({ id: 'cancel', label: 'LEAVE', onSelect: () => { s.close(); if (s.helloTimer) clearInterval(s.helloTimer); this.toTitle(); } });
          return list;
        },
        onBack: () => { s.close(); this.toTitle(); },
      });
    };
    showLobby();
    s.on('lobby', () => {});
    s.on('start', () => {
      if (s.helloTimer) clearInterval(s.helloTimer);
      this.ui.menu.clear();
      this.mode = 'round';
      this.round = new Round(this, s);
      this.round.phase = 'countdown';
      this.round.build(ctx);
      this.music.force('fight', this.realT);
    });
  }
  onRoundOver(outcome) {
    const g = this;
    const r = this.round;
    if (!r) return;
    const order = (outcome?.standings ?? []).flat();
    this.ui.menu.clear();
    this.ui.menu.push({
      id: 'results', title: 'THE STONES ARE COUNTED', noBack: true, cover: false, dim: 0.5,
      items: [...order.map((id) => { const m = r.mercs.find((x) => x.id === id); return { id: `row${id}`, small: true, label: `${m?.name ?? id}   ${m?.stones ?? 0} STONES  ${m?.downs ?? 0} DOWNS  ${m?.revives ?? 0} REVIVES`, enabled: false }; }), { id: 'leave', label: 'BACK TO THE TITLE', onSelect: () => g.toTitle() }],
    });
    this.ui.menu.top.focus = order.length;
  }
  setupTitleScene() {
    const s = SITES['long-field'];
    this.clock.hour = 18.4; this.clock.abs = 18.4;
    this.sky.apply(this.ctx, 18.4);
    this.wind.pin([0.9, 0.3], 5);
    this.vm.setVisible(false);
    this.hudHidden = true;
    this.titleIgnite(s);
    this.fire.ignite(s.at[0] - 55, s.at[1] + 20, 14, 'world');
    for (let i = 0; i < 40; i++) this.fire.tick(this.wind);
    this.titleT = 0;
    this.player.teleport(s.at[0] + 130, s.at[1] + 90);
    this.music.force('title', this.realT);
  }
  titleIgnite(s) { this.fire.ignite(s.at[0] - 70, s.at[1] + (this.rng.fx.next() - 0.5) * 80, 10, 'world'); }
  toggleFullscreen() {
    if (typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.()?.catch?.(() => {});
    } catch { /* the hub or the browser may refuse */ }
  }
  applySettings() {
    const ctx = this.ctx, s = this.settings, a = ctx.audio;
    a.setVolume('music', s.music);
    a.setVolume('sfx', s.sfx);
    this.cam.sensPad = s.sensPad; this.cam.sensMouse = s.sensMouse; this.cam.invertY = s.invertY;
    if (ctx.engine.gpu) {
      if (s.pixelSize !== this._ps) { this._ps = s.pixelSize; ctx.engine.settings.set({ pixelSize: s.pixelSize }); }
      if (s.quality !== this._q) { this._q = s.quality; ctx.engine.useQuality(s.quality); }
    }
    this.baseFov = s.fov;
    ctx.engine.shake.strength = s.reduceFlashes ? 0.4 : 1;
    if (!this.options.session) storeSettings(s);
  }
  // ---- the fixed step ----
  fixedUpdate(ctx, dt) {
    this.tick++;
    this.time += dt;
    if (this.timers.length) {
      const due = this.timers.filter((t) => t.t <= this.time);
      if (due.length) { this.timers = this.timers.filter((t) => t.t > this.time); for (const t of due) t.fn(); }
    }
    this.wind.step(dt);
    if (this.mode !== 'title') this.clock.step(dt);
    if (this.tick % 15 === 0 && !this.round?.isClient) this.fire.tick(this.wind);
    if (this.tick % 240 === 0) this.fire.regrowTick();
    if (this.mode === 'title' && this.tick % 900 === 0) this.titleIgnite(SITES['long-field']);
    this.sky.stepStorm(ctx, dt, this.rng.look);
    this.world.stepColumn(dt);
    if (this.tick % 60 === 0) this.world.stepHuts();
    if (this.tick % 3600 === 0 && this.mode === 'campaign') this.stepDust();
    if (this.hasPlayer && this.mode !== 'title' && this.mode !== 'lobby' && this.mode !== 'campaign-loading') {
      if (this.scene.locksMove || this.ui.open) this.bleedPresses();
      this.interact.fixedUpdate(ctx, dt);
      this.driving.fixedUpdate(ctx, dt);
      this.player.fixedUpdate(ctx, dt);
      this.weapons.fixedUpdate(ctx, dt);
      if (this.dev.infiniteAmmo && this.weapons.gun && this.weapons.def.mag) { this.weapons.gun.reserve = Math.max(this.weapons.gun.reserve, 30); if (this.weapons.gun.mag <= 0 && this.mode === 'attract') this.weapons.gun.mag = this.weapons.def.mag; }
      this.body.fixedUpdate(ctx, dt);
      this.places.stepTracker(dt);
      if (this.tick % 30 === 0) this.places.tick();
      this.stepShelling(ctx, dt);
    }
    if (this.mode !== 'title' && this.mode !== 'lobby') {
      this.actors.fixedUpdate(ctx, dt);
      this.vehicles.fixedUpdate(ctx, dt);
      this.projectiles.fixedUpdate(ctx, dt);
      this.train.fixedUpdate(ctx, dt);
      this.dialogue.fixedUpdate(dt);
      if (this.mode === 'campaign') this.missions.fixedUpdate(ctx, dt);
      if (this.tick % 60 === 0) this.warnNoPass();
      if (this.mode === 'attract') this.attract.fixedUpdate(ctx, dt);
      if (this.round) this.round.fixedUpdate(ctx, dt);
    }
    if (this.actors && this.tick % 15 === 0) this.updateCombatFlags();
  }
  /** Now and then a dust wind crosses the Kettle. Storms are for the story. */
  stepDust() {
    const sky = this.sky;
    if (sky.storm || this.missions.active?.weather) return;
    if (sky.dust) { if (this.rng.look.chance(0.5)) { sky.setWeather('clear'); sky.apply(this.ctx, this.clock.hour); } }
    else if (this.rng.story.chance(0.06)) { sky.setWeather('dust'); sky.apply(this.ctx, this.clock.hour); this.notice('THE WIND IS CARRYING THE PLATEAU.', 3); }
  }
  bleedPresses() { const a = this.actions; for (const k of ['use', 'fire', 'jump', 'crouch', 'melee', 'next', 'throw', 'heal', 'alt']) a.take(k); }
  updateCombatFlags() {
    let c = false, s = false;
    const f = this.anchor();
    for (const x of this.actors.soldiers) { if (!x.active || x.dead) continue; const d = Math.hypot(x.x - f.x, x.z - f.z); if (d < 120) { if (x.state === 'alert') c = true; else if (x.state !== 'idle') s = true; } }
    this.actors.inCombat = c; this.actors.anyAlertNear = s;
  }
  stepShelling(ctx, dt) {
    const sh = this.shelling; if (!sh) return;
    sh.t -= dt;
    if (sh.t <= 0) {
      sh.t = sh.every * this.rng.fx.range(0.6, 1.4);
      const a = this.rng.fx.range(0, 6.28), r = this.rng.fx.range(8, sh.r), x = sh.at[0] + Math.cos(a) * r, z = sh.at[1] + Math.sin(a) * r;
      this.sfx.at('bullet-whip', x, z, { max: 80, volume: 0.5 });
      this.after(0.5, () => this.damage.blast(x, this.world.heightAt(x, z) + 0.4, z, 5, 60, 'world', { fire: 0 }));
    }
  }
  // ---- per rendered frame ----
  update(ctx, dt) {
    const realDt = dt > 0 ? dt : 1 / 60;
    this.realT += realDt;
    if (this.realTimers.length) {
      const due = this.realTimers.filter((t) => t.t <= this.realT);
      if (due.length) { this.realTimers = this.realTimers.filter((t) => t.t > this.realT); for (const t of due) t.fn(); }
    }
    const inp = ctx.input;
    const seen = this.actions.track();
    // A save coming back through the input.
    for (const cmd of inp.commands) if (cmd && cmd.loadSave) { this.mode = 'campaign'; this.save.apply(cmd.loadSave); }
    if (this.mode === 'title') this.shell.stepGate();
    if (this.attract.active || this.mode === 'title') this.attractTick(ctx, realDt, seen);
    // A copy with no player of its own runs the world and draws nothing.
    if (!this.hasPlayer) { this.actors.update(ctx, dt); this.round?.update(ctx, dt); return; }
    // Camera and view state.
    this.frameControls(ctx, dt, realDt);
    this.player.update(ctx, dt);
    this.vm.update(ctx, dt, realDt);
    this.scene.update(ctx, dt);
    this.driving.update(ctx, dt);
    // Where the eye really is this frame.
    if (this.mode === 'title') this.titleCamera(ctx, realDt);
    if (this.cam.override) this.camPos.set(...this.cam.override.position); else if (this.hasPlayer) this.camPos.copy(this.player.eye);
    if (this.hasPlayer) this.target.copy(this.player.eye);
    if ((this.skyT -= realDt) <= 0) { this.skyT = 0.1; this.sky.apply(ctx, this.clock.hour); }
    this.sky.update(ctx, dt, this.clock.hour, this.camPos);
    this.grass.update(ctx, this.camPos, ctx.time);
    this.world.update(ctx, dt, ctx.time);
    this.fireView.update(ctx, dt, ctx.time);
    this.actors.update(ctx, dt);
    this.npcs.update(ctx, dt);
    this.vehicles.update(ctx, dt);
    this.fx.update(ctx, dt);
    this.map.update(ctx, dt);
    this.dialogue.update();
    this.round?.update(ctx, dt);
    this.music.update(ctx, dt, this.realT);
    this.ambience.update(ctx, realDt);
    this.updateLook(ctx, realDt);
    // HUD and menus.
    this.collectPrompts(ctx);
    const hud = ctx.hud;
    hud.clear();
    this.hud.draw(ctx, realDt);
    this.dev.draw(hud);
    if (this.round) this.round.draw(ctx);
    if (this.titleOverlay) this.shell.logo(hud);
    this.ui.update(ctx, realDt);
    this.ui.draw(hud);
    this.wantLock = this.hasPlayer && this.playingNow() && !this.ui.open && !this.attract.active && !this.dev.freeCam && !this.round?.localDown_;
    // A menu opened from the pad or a key frees the pointer; leaving a lock this way must not pause again.
    if (!this.wantLock && typeof document !== 'undefined' && document.pointerLockElement) { this.hadLock = false; document.exitPointerLock?.(); }
  }
  attractTick(ctx, realDt, seen) {
    if (this.attract.active) { this.attract.tick(ctx, this.realInputSeen(ctx)); return; }
    this.attract.tick(ctx, seen, realDt);
  }
  /** During the demo the bot holds the action layer; only real devices count here. */
  realInputSeen(ctx) {
    const inp = ctx.input, st = inp.state();
    if (st.held.length || st.queued.length) return true;
    if (inp.buttonEvents.length || inp.wheel !== 0) return true;
    if (inp.mouseDelta.x !== 0 || inp.mouseDelta.y !== 0) return true;
    const pt = inp.pointer;
    if (this.attractPtr && (pt.x !== this.attractPtr[0] || pt.y !== this.attractPtr[1])) { this.attractPtr = [pt.x, pt.y]; return true; }
    this.attractPtr = [pt.x, pt.y];
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const pads = nav?.getGamepads ? nav.getGamepads() : null;
    if (pads) for (const p of pads) { if (!p || !p.connected) continue; if ((p.axes ?? []).some((v) => Math.abs(v) > 0.35)) return true; if ((p.buttons ?? []).some((b) => b.pressed)) return true; }
    return false;
  }
  titleCamera(ctx, realDt) {
    const s = SITES['long-field'];
    this.titleT = (this.titleT ?? 0) + realDt;
    // A slow fixed camera over the burning grass.
    const a = 0.65 + Math.sin(this.titleT * 0.04) * 0.2;
    const px = s.at[0] - 40 + Math.cos(a) * 118, pz = s.at[1] + Math.sin(a) * 118;
    const y = this.world.heightAt(px, pz) + 3.2;
    this.cam.override = { position: [px, y, pz], target: [s.at[0] - 62, y + 1.2, s.at[1]] };
    this.hudHidden = false;
  }
  frameControls(ctx, dt, realDt) {
    const a = this.actions, inp = ctx.input, cam = this.cam;
    const menuOpen = this.ui.open;
    cam.padFrame = a.rs > 0.15;
    cam.lookScale = cam.padFrame ? Math.pow(clamp(a.rs, 0, 1), 0.6) : 1;
    cam.assist = 1;
    // Pause and Ledger.
    const session = this.options.session;
    const createHeld = inp.isDown('PadCreate');
    if (this.hasPlayer && this.playingNow() && this.mode !== 'attract') {
      if (a.tapped('pause') && !createHeld && !menuOpen) { this.shell.openPause(); }
      else if (a.tapped('ledger') && !menuOpen && !session) { this.ui.openLedger(); }
    }
    const canHands = this.canHands();
    // The held map.
    if (canHands && a.tapped('map') && !this.scene.face && !this.body.surgery) this.map.raise(!this.map.up);
    if (this.map.up) {
      this.map.moveCursor(inp.mouseDelta.x * 0.16, inp.mouseDelta.y * 0.16);
      if (canHands && (a.tapped('use') || (a.device === 'kbm' && inp.wasPressed('MouseLeft')))) this.map.pick();
      if (canHands && (a.tapped('next') || inp.wheel !== 0)) { this.mapZoom = !this.mapZoom; this.vm.mapJoint?.scale.setScalar(this.mapZoom ? 1.42 : 1); this.sfx.play('map-paper', { volume: 0.3 }); }
    }
    // Monocular, held.
    const monoWant = canHands && !this.map.up && !this.player.seat && a.down('mono');
    if (monoWant && this.monoT === 0) { this.vm.showProp('p-mono'); this.vm.play('MonoUp', { keep: true }); this.sfx.play('gun-equip', { volume: 0.3 }); this.events.emit('mono'); }
    this.monoT = monoWant ? clamp(this.monoT + realDt * 5, 0, 1) : clamp(this.monoT - realDt * 6, 0, 1);
    if (!monoWant && this.monoWas) { this.vm.endAction(); this.vm.showGun(this.weapons.gun?.id ?? 'cane', false); }
    this.monoWas = monoWant;
    // Tracker, toggled.
    if (canHands && this.story.trackerOwned && a.tapped('tracker') && !this.map.up) this.places.setTracker(!this.places.trackerOn);
    // Weapons wheel.
    if (!menuOpen && !this.map.up && inp.wheel !== 0 && a.device === 'kbm') this.wheelStep += inp.wheel;
    // Look.
    cam.enabled = !menuOpen && !this.map.up && !this.scene.face && !this.scene.custom && this.mode !== 'title' && !this.body.surgery && !this.round?.localDown_;
    // Aim assist: pad only. Within 4 degrees of a live torso look sensitivity falls 35%.
    if (cam.padFrame && this.settings.aimAssist && this.hasPlayer && cam.enabled) {
      const e = this.player.eye, f = this.player.forward();
      let best = 0.9976; // cos 4 degrees
      for (const s of this.actors.soldiers) {
        if (!s.active || s.dead) continue;
        const dx = s.x - e.x, dy = s.y + 1.1 - e.y, dz = s.z - e.z, l = Math.hypot(dx, dy, dz);
        if (l > 140 || l < 0.1) continue;
        const c = (dx * f.x + dy * f.y + dz * f.z) / l;
        if (c > best) { best = c; cam.assist = 0.65; if (this.weapons.aiming) { const yawTo = Math.atan2(-dx, -dz); cam.kickYaw += wrapAngle(yawTo - this.player.yaw) * 0.03; } }
      }
    }
    // Field of view.
    if (ctx.camera.preset === 'first') {
      const c = ctx.camera.camera, def = this.weapons.def;
      let want = this.baseFov;
      if (this.weapons.aimT > 0.01 && def.ads) want = lerp(this.baseFov, def.ads, this.weapons.aimT);
      if (this.monoT > 0) want = lerp(want, 16, this.monoT);
      if (Math.abs(c.fov - want) > 0.01) { c.fov = want; c.updateProjectionMatrix(); }
    }
    // Hold to skip the ride.
    if (this.skipPrompt && this.missions.active?.id === 'm0') {
      if (a.down('skip') && !menuOpen) { this.skipHold += realDt; if (this.skipHold >= 1) this.skipM0(); } else this.skipHold = 0;
    }
  }
  skipM0() {
    this.skipPrompt = false; this.skipHold = 0;
    this.dialogue.stopAll();
    this.map.raise(false);
    this.train.moving = false; this.train.speed = 0;
    this.player.leaveTrain(6, 62);
    this.body.fever = 'none'; this.body.feverOn = false; this.body.swim = 0; this.cam.roll = 0;
    this.missions.forceStep();
  }
  collectPrompts(ctx) {
    const h = this.hud, a = this.actions;
    h.prompts.length = 0; this.ui.menu.noted.length = 0; drawnGlyphs.length = 0;
    if (!this.hasPlayer || this.ui.open) return;
    if (this.mode === 'attract') { h.addPrompt('confirm', 'PRESS'); return; }
    if (!this.playingNow() || this.scene.active) { if (this.dialogue.active && this.dialogue.skippable) h.addPrompt('skip', 'NEXT'); return; }
    if (this.skipPrompt) h.addPrompt('skip', 'HOLD TO SKIP');
    else if (this.dialogue.active && this.dialogue.skippable) h.addPrompt('skip', 'NEXT');
    const u = this.interact.current;
    if (u) {
      const dis = u.enabled && !u.enabled();
      h.addPrompt('use', typeof u.verb === 'function' ? u.verb() : u.verb, { dim: dis });
      if (u.onAlt) h.addPrompt('alt', u.altVerb());
    }
    const gun = this.weapons.gun;
    if (gun?.jam > 0 && !this.player.seat) h.addPrompt('reload', 'CLEAR THE JAM');
    if (this.body.fever === 'on' && this.body.tablets > 0) h.addPrompt('tablet', 'TABLET');
    if (this.body.hp < 20 && this.body.hp > 0 && !this.body.surgery) h.addPrompt('heal', 'PATCH YOURSELF UP');
    if (this.healHint && this.body.syrettes > 0) h.addPrompt('heal', 'SYRETTE');
    if (this.missions.currentStep()?.hint === 'mono' && !this.inMonocular()) h.addPrompt('mono', 'MONOCULAR');
    if (this.mapHint && !this.map.up) h.addPrompt('map', 'RAISE THE MAP');
    if (this.map.up) { h.addPrompt('use', 'SET WAYPOINT'); h.addPrompt('next', 'CLOSER'); h.addPrompt('map', 'LOWER'); }
    if (this.trackerHint && !this.places.trackerOn && this.story.trackerOwned) h.addPrompt('tracker', 'TRACKER');
    if (this.driving.vehicle) {
      const v = this.driving.vehicle;
      if (!this.map.up) {
        h.addPrompt('exit', 'GET OUT');
        if (v.def.gunSeat) h.addPrompt('swap', this.driving.gunning ? 'WHEEL' : 'THE GUN');
      }
    }
  }
  updateLook(ctx, realDt) {
    if (!ctx.engine.gpu) return;
    this.lookT -= realDt;
    if (this.lookT > 0) return;
    this.lookT = 1 / 15;
    const b = this.body;
    const fever = b.swim ?? 0;
    const drain = b.colorDrain ?? 0;
    const burn = b.burnScreen ?? 0;
    const scale = this.settings.feverReduced ? 0.35 : 1;
    const spread = fever * 4 * scale;
    const sat = 1.05 - fever * 0.35 * scale - drain * 0.75;
    const warm = 0.04 * (1 - (this.sky.night ?? 0)) + fever * 0.12 * scale + burn * 0.1 + (this.fireView.nearestDist < 40 ? 0.04 : 0);
    const vig = 0.28 + fever * 0.3 * scale + drain * 0.34 + burn * 0.12;
    const key = `${spread.toFixed(2)}|${sat.toFixed(2)}|${warm.toFixed(2)}|${vig.toFixed(2)}`;
    if (key === this._lookKey) return;
    this._lookKey = key;
    LOOK.scene[0].params.saturation = sat; LOOK.scene[0].params.warmth = warm;
    LOOK.scene[1].params.spread = spread;
    LOOK.scene[2].params.intensity = vig;
    ctx.engine.setLook(LOOK);
  }
  dispose() { this.round?.dispose(); }
}
export const createGame = (options = {}) => new FarCryUncle(options);
