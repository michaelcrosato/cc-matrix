// The one Game object: modes title, attract, play, round. Systems are functions over `g`.
import { THREE, PALETTE, applySky, skyAt, loadPack, Engine, withUrlOptions, LOOK_PRESETS } from './engine.js';
import { store } from './core/storage.js';
import { Events } from './core/events.js';
import { hash32 } from './core/rng.js';
import { saveWorld, loadWorld, newWorld, SAVE_KEY, hasSave } from './core/save.js';
import { calendar, dateLine } from './core/calendar.js';
import { installTextures } from './art/textures.js';
import { MODELS } from './art/models.js';
import { UI, drawWorldHud } from './ui/ui.js';
import { GameInput, PAD_BUTTONS } from './ui/input.js';
import { day1Lines, listenForErrands } from './systems/dayone.js';
import { drawText } from './ui/draw.js';
import { Scripts } from './systems/script.js';
import { advanceClock, calendarNow, weatherNow, absMinute, hourNow } from './systems/time.js';
import { TownPlace } from './world/town.js';
import { syncObjects, rebuildAllObjects } from './world/objectsView.js';
import { updateOccluders } from './world/occluders.js';
import { Player } from './actors/player.js';
import { SFX_DEFS, LOOP_DEFS } from './audio/sfx.js';
import { VoicePlayer } from './audio/voice.js';
import { MusicDirector } from './audio/music.js';
import { Ambience } from './audio/ambience.js';
import { tuning, loadTuning } from './dev/tuning.js';
import { Sky } from './systems/sky.js';
import { Interact, worldInput } from './systems/interact.js';
import { NpcManager } from './actors/npc.js';
import { RoomPlaces } from './world/roomPlaces.js';
import { CityPlace } from './world/city.js';
import { newDay, handleAbsence, onHourChange, recordExit } from './systems/flow.js';
import { Life } from './systems/life.js';
import { Festivals } from './systems/festivals/festivals.js';
import { titleScreen } from './ui/screens/title.js';
import { placementScreen } from './ui/screens/placement.js';
import { turnThePage } from './ui/screens/bed.js';
import { installWorld, quitToTitle, startNewGame, continueGame } from './systems/newgame.js';
import { dailyRespawn } from './systems/flow.js';
import { AttractMode } from './dev/attract.js';
import { fingerprintOf } from './dev/fingerprint.js';
import { visitHandle } from './net/visitUi.js';
import { LANDMARKS } from './data/town.js';
import { DevOverlay } from './dev/overlay.js';
import { makePatternTexture, patternMaterial } from './systems/patterns.js';
import { ITEMS } from './data/items.js';

const { Vector3 } = THREE;
const SETTINGS_KEY = 'honk:settings';
import { DEFAULT_SETTINGS, DEFAULT_MUSIC } from './gameDefaults.js';

export class HonkGame {
  name = 'Honk If You Owe';
  constructor(opts = {}) {
    this.opts = opts;
    this.mode = 'boot';
    this.target = new Vector3();
    this.camState = { yaw: 45, zoom: tuning.cameraZoom, yawT: 45, zoomT: tuning.cameraZoom, applied: '' };
    this.idleTime = 0;
    this.noInput = 0;
    this.lastMinute = -1;
    this.lastHour = -1;
    this.realNow = opts.realNow ?? null;
    this.season = 1;
    this.calendarDay = 1;
    this.frozenOverride = false;
    this.windNow = 1.2;
    this.camFocus = null;
    this.fixedCam = false; // a scene is flying the camera itself
    this.noclip = false;
    this.events = new Events();
    this.settings = { ...DEFAULT_SETTINGS, ...(store.get(SETTINGS_KEY) ?? {}) };
    loadTuning();
  }
  get cal() { return calendar(this.world, this.realNow); }
  absMinute() { return absMinute(this.world); }
  saveSettings() { store.set(SETTINGS_KEY, this.settings); }
  sound(name, opts) { return this.ctx?.audio.play(name, opts); }
  rumble(strong = 0.5, ms = 120) {
    if (!this.settings.rumble) return;
    this.rumbles = (this.rumbles ?? 0) + 1;
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) p?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: strong * 0.6 }).catch?.(() => {});
  }
  async setup(ctx) {
    this.ctx = ctx;
    this.engine = ctx.engine;
    const input = ctx.input;
    input.gamepadButtons = PAD_BUTTONS;
    for (const k of ['Tab', 'F1', 'F2', 'F3', 'Escape', 'Backspace', 'Slash']) input.preventKeys.add(k);
    installTextures();
    await loadPack('packs/kenney-furniture.json', { into: MODELS });
    await loadPack('packs/kenney-nature.json', { into: MODELS });
    // Music is 10% by default: set before anything plays, on a profile with no stored audio.
    if (!store.has('pixel-engine:audio')) ctx.audio.setVolume('music', DEFAULT_MUSIC);
    this.wrapResetVolumes();
    for (const [n, d] of Object.entries(SFX_DEFS)) ctx.audio.register(n, d);
    for (const [n, d] of Object.entries(LOOP_DEFS)) ctx.audio.register(n, d);
    this.inp = new GameInput();
    this.voice = new VoicePlayer(this);
    this.voice.install(ctx.audio);
    this.music = new MusicDirector(this);
    this.ambience = new Ambience(this);
    this.ui = new UI(this);
    this.scripts = new Scripts(this);
    this.interact = new Interact(this);
    listenForErrands(this);
    this.overlay = new DevOverlay(this);
    this.cosmetic = ctx.random.fork('cosmetic');
    this.world = newWorld(hash32('title-diorama'), { demo: true });
    this.world.clock.minute = 9.5 * 60;
    this.world.clock.day = 5;
    this.world.player.tools = ['net', 'rod', 'shovel', 'axe', 'can', 'slingshot'];
    this.demo = true;
    this.demoStack = null;
    this.town = new TownPlace(this);
    this.city = new CityPlace(this);
    this.rooms = new RoomPlaces(this);
    this.place = this.town;
    ctx.scene.add(this.town.group, this.city.group);
    this.city.group.visible = false;
    this.player = new Player(this);
    this.player.addTo(this.town.group);
    this.player.x = 24; this.player.z = 30;
    this.camFocus = { x: 24, y: 1, z: 40 };
    this.sky = new Sky(this);
    this.npcs = new NpcManager(this);
    this.life = new Life(this);
    this.festivals = new Festivals(this);
    this.attract = new AttractMode(this);
    this.refreshSeason(true);
    this.npcs.buildAll();
    dailyRespawn(this);
    rebuildAllObjects(this.town);
    this.life.resetDay();
    this.festivals.resetDay();
    this.mode = 'title';
    this.ui.push(titleScreen(this));
    this.camTeleport();
  }
  wrapResetVolumes() {
    const audio = this.ctx.audio;
    const orig = audio.resetVolumes.bind(audio);
    audio.resetVolumes = () => { orig(); audio.setVolume('music', DEFAULT_MUSIC); };
  }
  ready(ctx) {
    if (typeof window !== 'undefined') window.__GAME__ = this.handle();
  }
  handle() {
    const g = this;
    return {
      g,
      get world() { return g.world; },
      ui: { model: () => g.ui.model() },
      tuning,
      status: () => this.statusObject(),
      fingerprint: () => fingerprintOf(g),
      engine: this.engine,
      visit: visitHandle(g),
      devLineup: () => import('./ui/screens/dev.js').then((m) => m.toggleLineup(g)),
      actions: {
        newGame: (mode = 'village') => startNewGame(g, mode),
        continueGame: () => continueGame(g),
        /** Straight into free play on a fresh world: for tools and screenshots. */
        quickStart: (o = {}) => {
          const w = newWorld(o.seed ?? 42, { mode: o.mode ?? 'village' });
          g.ui.popAll();
          g.mode = 'play';
          g.demo = !!o.demo;
          g.camFocus = null;
          w.player.name = o.name ?? 'Pip'; w.player.town = o.town ?? 'Far Enough';
          w.flags.shackRoof = true;
          w.story.stage = 'free';
          w.museum.open = true;
          w.clock.day = o.day ?? 2;
          w.clock.daysPlayed = w.clock.day;
          w.clock.minute = (o.hour ?? 10) * 60;
          w.player.tools = o.tools ?? ['net', 'rod', 'shovel', 'axe', 'can', 'slingshot'];
          w.player.beans = o.beans ?? 5000;
          g.place.group.visible = false;
          g.place.leave?.(g);
          g.player.remove();
          g.place = g.town;
          g.town.group.visible = true;
          g.player.addTo(g.town.group);
          installWorld(g, w);
          dailyRespawn(g);
          rebuildAllObjects(g.town);
          g.swapPlace(g.town, o.x ?? 24, o.z ?? 31, 0);
        },
        goto: (placeId, x, z, facing = 0) => g.swapPlace(placeId === 'town' ? g.town : placeId === 'city' ? g.city : g.rooms.get(placeId), x, z, facing),
        // (tools only) Visit: real transports, no typing. The title's menus use the same calls.
        setDay: (day, hour = 10) => { const w = g.world; while (w.clock.day < day) { w.clock.minute = 300; g.newDay(); } w.clock.minute = hour * 60; g.weatherKey = null; g.lastHour = -1; g.refreshSeason(true); g.sky.placeChanged(); g.life.placeSpecials(); g.festivals.resetDay(); g.npcs.scatter(); },
      },
    };
  }
  statusObject() {
    const w = this.world;
    return { mode: this.mode, day: w.clock.day, hour: hourNow(w), minute: w.clock.minute, place: this.place?.id, beans: w.player.beans, debt: w.player.debt, x: this.player?.x, z: this.player?.z };
  }
  status() {
    const s = this.statusObject();
    return `${s.mode} day ${s.day} ${Math.floor(s.minute / 60)}:${String(Math.floor(s.minute % 60)).padStart(2, '0')} ${s.place} beans ${s.beans} debt ${s.debt}`;
  }
  fingerprint() { return fingerprintOf(this); }
  canAct() {
    return this.mode === 'play' && !this.ui.blocking && !this.scripts.holding && !this.inTransition;
  }
  get frozen() { return this.mode !== 'play' && this.mode !== 'attract' ? false : (this.ui.blocking || this.scripts.holding) && this.world.clock.mode !== 'real'; }
  fixedUpdate(ctx, dt) {
    if (this.mode === 'boot') return;
    if (this.mode === 'play') {
      this.player.fixedStep(dt);
      if (!this.frozen && !this.inTransition) {
        if (!this.timeFrozen) advanceClock(this, dt);
        this.life.fixedStep(dt);
        this.npcs.fixedStep(dt);
        this.festivals.fixedStep(dt);
      }
    } else if (this.mode === 'attract') {
      this.attract.fixedStep(dt);
      this.npcs.fixedStep(dt);
      this.life.fixedStep(dt);
    } else if (this.mode === 'title') {
      this.npcs.fixedStep(dt);
      this.life.fixedStep(dt);
    }
  }
  update(ctx, dt) {
    if (this.mode === 'boot') return;
    this.inp.begin(ctx, dt);
    this.readCommands(ctx);
    if (this.inp.any) { this.idleTime = 0; this.noInput = 0; } else { this.idleTime += dt; this.noInput += dt; }
    if (this.mode === 'play' && this.player.speed > 0.1) this.idleTime = 0;
    const wasBlocked = this.ui.blocking || this.scripts.holding;
    this.scripts.update(dt);
    this.ui.update(dt);
    if (this.mode === 'attract') this.attract.update(dt);
    if (this.mode === 'title') this.updateTitle(dt);
    if (this.mode === 'play') {
      if (this.canAct() && !wasBlocked) worldInput(this, dt);
      else if (!this.canAct()) this.interact.clear();
    }
    // Hour and minute changes
    const w = this.world;
    const hour = hourNow(w);
    if (hour !== this.lastHour) { const first = this.lastHour === -1; this.lastHour = hour; if (!first) onHourChange(this, hour); this.music.refresh(); }
    if (this.world.clock.day !== this.seenDay && !this.seenDayHold) {
      this.seenDay = this.world.clock.day;
      if (this.mode === 'play') turnThePage(this);
    }
    this.place?.update?.(dt, ctx.time);
    this.sky.update(dt);
    this.player.presentation(dt);
    this.npcs.presentation(dt);
    if (this.actorOverride) for (const a of Object.values(this.actorOverride)) a.update(dt);
    this.life.presentation(dt);
    this.festivals.presentation(dt);
    if (this.town.dirty.size) syncObjects(this.town);
    this.updateCamera(dt);
    if (this.place === this.town || this.place === this.city) updateOccluders(this);
    this.net?.update(dt);
    this.ambience.update(dt);
    this.music.update(dt);
    this.drawHud(ctx, dt);
  }
  updateTitle(dt) {
    // The camera drifts over the diorama; after 10 quiet seconds the attract loop takes over.
    this.titleDrift = (this.titleDrift ?? 0) + dt;
    const t = this.titleDrift * 0.03;
    this.camFocus = { x: 24 + Math.sin(t) * 16, y: 1, z: 40 + Math.cos(t * 1.3) * 8 };
    const top = this.ui.top;
    if (top?.isTitle && this.noInput >= 10) this.attract.start();
  }
  readCommands(ctx) {
    for (const c of ctx.input.commands) {
      if (!c) continue;
      if (c.t === 'now') this.realNow = c.ms;
      if (c.t === 'loadSave') this.pendingLoad = c.world;
    }
  }
  drawHud(ctx, dt) {
    const hud = ctx.hud;
    hud.clear();
    if (this.mode === 'play' && !this.hideHud) {
      const idle = this.idleTime > 6 && !this.ui.blocking;
      this.ui.hudAlpha = idle ? 0 : 1;
      if (!this.ui.has('placement') && !this.ui.has('credits') && !this.ui.has('stargaze')) {
        drawWorldHud(this, hud, dt);
        this.interact.drawPrompts(hud);
      }
    }
    this.life.drawHud(hud);
    this.festivals.drawHud(hud);
    this.ui.draw(hud);
    this.drawReveal?.(hud);
    this.attract.drawHud(hud);
    this.overlay.draw(hud);
    // The pixel cursor
    const m = this.inp.mouse;
    if (this.inp.device === 'kbm' && m.seen && m.over) hud.sprite(m.x, m.y, CURSOR, CURSOR_COL, { shadow: false });
  }
  // ---- Camera ------------------------------------------------------------------------------------
  cameraTarget() {
    if (this.camFocus) return this.target.set(this.camFocus.x + this.place.ox, this.camFocus.y, this.camFocus.z + this.place.oz);
    const p = this.player;
    return this.target.set(p.x + this.place.ox, p.y + 0.9, p.z + this.place.oz);
  }
  camTeleport() { this.ctx.camera.teleport(this.cameraTarget()); }
  /** A scene that flew the camera gives it back: the usual view, right where it belongs. */
  releaseFixedCam() {
    if (!this.fixedCam) return;
    this.fixedCam = false;
    this.camState.applied = '';
    this.updateCamera(0);
    this.camTeleport();
  }
  updateCamera(dt) {
    const c = this.camState;
    if (this.fixedCam) return;
    const rate = 1 - Math.exp(-dt * 9);
    c.yaw += (c.yawT - c.yaw) * rate;
    if (Math.abs(c.yaw - c.yawT) < 0.05) c.yaw = c.yawT;
    const baseZoom = this.place?.kind === 'room' ? (this.place.camZoom ?? 1.8) : tuning.cameraZoom;
    const talking = this.ui.has('dialogue');
    let zoomT = (c.zoomOverride ?? baseZoom) * (talking ? 1.25 : 1);
    if (this.mode === 'title') zoomT = c.zoomOverride ?? 1.15;
    if (this.mode === 'attract') zoomT = c.zoomOverride ?? 1.6;
    c.zoomT = zoomT;
    c.zoom += (c.zoomT - c.zoom) * (1 - Math.exp(-dt * 5));
    if (Math.abs(c.zoom - c.zoomT) < 0.002) c.zoom = c.zoomT;
    const key = `${c.yaw.toFixed(2)}:${c.zoom.toFixed(3)}`;
    if (key !== c.applied) {
      c.applied = key;
      this.engine.setCamera({ preset: 'iso', yaw: c.yaw, pitch: 35, zoom: c.zoom, minZoom: c.zoom, maxZoom: c.zoom }, { syncUrl: false });
    }
  }
  turnCamera(dir) {
    if (this.place?.kind === 'room') { this.sound('uiError'); return; }
    this.camState.yawT += dir * 90;
    this.sound('camera');
  }
  zoomStep(dir) {
    const c = this.camState;
    const cur = c.zoomOverride ?? tuning.cameraZoom;
    c.zoomOverride = Math.max(1.2, Math.min(2.4, cur + dir * 0.2));
  }
  // ---- Season --------------------------------------------------------------------------------------
  refreshSeason(force = false) {
    const c = this.cal;
    const changed = force || c.season !== this.season || c.calendarDay !== this.calendarDay;
    this.season = c.season;
    this.calendarDay = c.calendarDay;
    if (changed) this.town.setSeason(c.season, c.calendarDay);
    this.sky.setSeason(c.season);
    syncObjects(this.town);
  }
  // ---- Places --------------------------------------------------------------------------------------
  swapPlace(next, x, z, facing = 0) {
    const old = this.place;
    if (old !== next) {
      old.leave?.(this);
      old.group.visible = next.keepVisible?.(old) ?? false;
      if (old === this.town) this.town.releaseLights();
      this.player.remove();
      this.place = next;
      this.ctx.scene.add(next.group);
      next.group.visible = true;
      this.player.addTo(next.group);
      next.enter?.(this);
    }
    this.player.x = x; this.player.z = z;
    this.player.y = next.height(x, z);
    this.player.facing = facing;
    this.player.turnTo = null;
    this.player.cancelWalk();
    next.unstickPlayer?.();
    const w = this.world.player;
    w.place = next.id; w.x = this.player.x; w.z = this.player.z; w.facing = facing;
    this.camFocus = null;
    this.camState.zoomOverride = undefined;
    if (next.kind === 'room') { this.camState.yawT = 45; this.camState.yaw = 45; }
    this.camState.applied = '';
    this.updateCamera(1);
    this.camTeleport();
    this.sky.placeChanged();
    this.music.refresh();
    this.npcs.placeChanged();
    this.life.placeChanged();
    this.autosave();
  }
  /** Move between places under an iris. Use from a script: `yield* g.travel(...)`. */
  *travel(next, x, z, facing = 0, { kind = 'iris', duration = 0.35, sound = 'doorOpen' } = {}) {
    if (sound) this.sound(sound);
    this.inTransition = true;
    const center = new Vector3(this.player.x + this.place.ox, this.player.y + 1, this.player.z + this.place.oz);
    this.engine.screen.cover(kind, { center, duration });
    yield duration + 0.05;
    this.swapPlace(next, x, z, facing);
    this.engine.screen.reveal(kind, { duration, center: new Vector3(x + next.ox, next.height(x, z) + 1, z + next.oz) });
    yield duration * 0.6;
    this.inTransition = false;
  }
  autosave() {
    if (this.mode !== 'play' || this.demo || this.world.story.stage === 'new') return;
    this.world.meta.lastSeenMs = this.realNow ?? this.world.meta.lastSeenMs;
    saveWorld(this.world);
  }
  baseLook() { return LOOK_PRESETS.none; }
  /** World point → art pixels, for bubbles and chevrons. */
  project(x, y, z) {
    const cam = this.ctx.camera.camera;
    this.tmpV ??= new Vector3();
    this.tmpV.set(x + this.place.ox, y, z + this.place.oz).project(cam);
    if (this.tmpV.z > 1) return null;
    return { x: Math.round((this.tmpV.x + 1) * 240), y: Math.round((1 - this.tmpV.y) * 135) };
  }
  patternTexture(slot) { return makePatternTexture(this.world.patterns[slot]); }
  applyPatternShirt(actor, slot) {
    const data = this.world.patterns[slot];
    const mat = data ? patternMaterial(data) : null;
    if (!mat) return;
    const hex = PALETTE[ITEMS[this.world.player.look.outfit]?.shirt ?? 'blue'];
    actor.swapMaterial(hex, mat);
  }
  patternMaterialFor(slot) { return this.world.patterns[slot] ? patternMaterial(this.world.patterns[slot]) : null; }
  isNight() { return (this.sky?.night ?? 0) > 0.35; }
  day1Lines() { return day1Lines(this); }
  newDay() { newDay(this); }
  openPlacement(i) { this.ui.push(placementScreen(this, i)); }
  quitToTitle() { if (this.net) this.net.leave(); quitToTitle(this); }
  /** A guest arrives by bus in the host's town: a temporary world, not their own save. */
  visitArrive(world) {
    this.ui.popAll();
    this.mode = 'play';
    this.demo = true; // nothing a guest does writes a save
    this.camFocus = null;
    this.place.group.visible = false;
    this.place.leave?.(this);
    this.player.remove();
    this.place = this.town;
    this.town.group.visible = true;
    this.player.addTo(this.town.group);
    installWorld(this, world);
    rebuildAllObjects(this.town);
    this.swapPlace(this.town, LANDMARKS.busStop[0], LANDMARKS.busStop[1] + 0.3, 0);
  }
  goTitleFromVisit() { this.ui.popAll(); this.scripts.cancelAll(); this.goTitle(); }
  /** Back to the live diorama on a throwaway world. */
  goTitle() {
    const w = newWorld(hash32('title-diorama'), { demo: true });
    w.clock.minute = 9.5 * 60;
    w.clock.day = 5;
    w.player.tools = ['net', 'rod', 'shovel', 'axe', 'can', 'slingshot'];
    this.mode = 'title';
    this.demo = true;
    this.place.group.visible = false;
    this.place.leave?.(this);
    this.player.remove();
    this.place = this.town;
    this.town.group.visible = true;
    this.player.addTo(this.town.group);
    installWorld(this, w);
    dailyRespawn(this);
    rebuildAllObjects(this.town);
    this.player.x = 24; this.player.z = 30;
    this.camState.zoomOverride = undefined;
    this.camState.yawT = 45; this.camState.yaw = 45; this.camState.applied = '';
    this.titleDrift = 0;
    this.noInput = 0;
    this.camFocus = { x: 24, y: 1, z: 40 };
    this.updateCamera(1);
    this.camTeleport();
    this.music.refresh();
    this.ui.push(titleScreen(this));
  }
  actorOf(id) { return id === 'player' ? this.player : this.actorOverride?.[id] ?? this.npcs.actor(id) ?? this.place?.hostActor?.(id) ?? (id === 'trundle' ? this.life.trundle : id === 'rind' ? this.life.rind : id === 'vesper' ? this.life.vesper : id === 'hester' ? this.busPlace?.hester : null) ?? null; }
  actorEmote(id, clip) { const a = this.actorOf(id); if (a) a.play(clip, 0.1, { once: true }); }
  footstep() {
    const p = this.player;
    const surface = this.place?.surfaceAt?.(p.x, p.z);
    if (surface) this.sound(surface, { volume: p.speed < 2 ? 0.4 : 0.8 });
    this.life.onStep?.(p.x, p.z);
  }
  dust(x, y, z) { this.ctx.particles.burst('dust', [x + this.place.ox, y + 0.05, z + this.place.oz], { count: 2 }); }
}
const CURSOR = ['#.......', '##......', '#o#.....', '#oo#....', '#ooo#...', '#oooo#..', '#ooooo#.', '#oo###..', '#o#.....', '##......'];
const CURSOR_COL = { '#': 'ink', o: 'white' };
export const createGame = (opts) => new HonkGame(opts);
export { hasSave, SAVE_KEY, weatherNow, dateLine, calendarNow, rebuildAllObjects, PALETTE, applySky, skyAt, Engine, withUrlOptions, drawText, loadWorld };
