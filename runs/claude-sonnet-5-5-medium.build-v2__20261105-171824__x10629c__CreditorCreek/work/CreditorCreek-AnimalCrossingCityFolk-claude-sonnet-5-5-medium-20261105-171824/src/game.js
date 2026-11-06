// The one Game object. Modes: title, attract, play, round. Systems live in systems/*.js and take (g).
import { Engine, withUrlOptions, THREE, PALETTE, applySky, skyAt, LOOK_PRESETS } from './engine.js';
import { UI, Dialogue } from './ui/ui.js';
import { W, H } from './ui/controls.js';
import { TitleScreen, SettingsScreen } from './ui/title.js';
import { tuning, loadTuning, setTuning } from './data/tuning.js';
import { loadSettings, saveSettings } from './core/settings.js';
import { newWorld, loadWorld, saveWorld, hasSave, SAVE_KEY } from './core/world.js';
import { hourOf, seasonOf, dayTypeOf, MIN_PER_DAY, weatherAt, isWet, fmtClock, dateLine, SEASONS } from './core/calendar.js';
import { TownView } from './world/terrain.js';
import { Occluders } from './world/occluders.js';
import { TW, TD, buildTownTiles, blockedGrid, BUILDINGS, SPAWNS, groundHeight } from './world/townMap.js';
import { Grid } from './world/collide.js';
import { registerVoices, speakChar } from './audio/voice.js';
import { registerSfx } from './audio/sfx.js';
import { songNamed, hourSong } from './audio/composer.js';
import { Actor } from './actors/actor.js';
import { Player } from './actors/player.js';
import { NpcManager } from './actors/npc.js';
import { registerSystems } from './systems/index.js';
import { install } from './game-utils.js';
import { Round, cardInput } from './net/arena.js';
import { moreSystems } from './systems/more.js';
import { installShell } from './systems/shell.js';

export class Game {
  moreSystems() { return moreSystems(); }
  name = 'Creditor Creek';
  assets = [];
  mode = 'boot'; world = null; frozen = false; t = 0; place = 'town'; tick = 0; flags = {}; hooks = {};
  target = new THREE.Vector3(30, 0, 23);
  async setup(ctx) {
    this.ctx = ctx; this.engine = ctx.engine; loadTuning(); this.settings = loadSettings();
    this.touchOnly = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && typeof matchMedia !== 'undefined' && !matchMedia('(any-pointer: fine)').matches;
    registerSfx(ctx.audio); registerVoices(ctx.audio);
    { const a = ctx.audio, orig = a.resetVolumes.bind(a); a.resetVolumes = () => { orig(); a.setVolume('music', 0.1); }; }
    this.applySettings(true);
    this.ui = new UI(ctx, this); const rf = ctx.random.fork('game'), cf = ctx.random.fork('cosmetic'); this.rng = () => rf.range(0, 1); this.cosmetic = () => cf.range(0, 1);
    this.tiles = buildTownTiles(); this.grid = new Grid(); this.town = new TownView(ctx); if (!this.hubInfo) this.town.build(this.tiles);
    this.occ = new Occluders(); this.player = new Player(this); ctx.scene.add(this.player.actor.root);
    this.npcs = new NpcManager(this);
    this.sys = registerSystems(this); this.camYaw = 45; this.camYawTarget = 45; this.zoomNow = tuning.zoom;
    if (this.hubInfo) { this.world = newWorld(1); this.startRound(this.hubInfo); this.engine.setCamera({ preset: 'iso', yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 }, { syncUrl: false }); return; }
    this.sys.city.build(this); this.sys.places.build(this); this.sys.nature.init(this);
    this.camYaw = 45; this.camYawTarget = 45; this.zoomNow = tuning.zoom;
    const w0 = newWorld(1); w0.min = 420; this.resetWorldView(w0); this.sys.time.onLoad(this); this.sys.nature.spawnBugs(this); this.sys.nature.spawnFish(this);
    if (this.hubInfo) { this.startRound(this.hubInfo); this.engine.setCamera({ preset: 'iso', yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 }, { syncUrl: false }); return; }
    this.showTitle();
    this.engine.setCamera({ preset: 'iso', yaw: 45, pitch: 35, zoom: tuning.zoom, minZoom: tuning.zoom, maxZoom: tuning.zoom }, { syncUrl: false });
  }
  applySettings(first) {
    const a = this.ctx.audio, s = this.settings;
    if (first && typeof localStorage !== 'undefined' && !localStorage.getItem('pixel-engine:audio')) a.setVolume('music', 0.1);
    if (first) { this.settings.music = Math.abs(this.settings.music - 0.1) < 1e-6 && !a.volume ? 0.1 : this.settings.music; }
    a.setVolume('music', s.music); a.setVolume('sfx', s.sfx); tuning.textSpeed = s.textSpeed;
    if (!first && this.engine?.settings) { try { this.engine.settings.set({ quality: s.quality, pixelSize: s.pixel >= 2 ? 'chunky' : 'fine' }); } catch {} }
    this.world && (this.world.clockMode = s.clock === 'real' ? 'real' : 'village');
  }
  toggleFullscreen() { if (typeof document === 'undefined') return; if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); }
  sfx(name, o) { this.ctx.audio.play(name, o); }
  voiceChar(ch, who, i) { if (!who) return; this.vstate ??= {}; speakChar(this.ctx.audio, this.settings, ch, who, i, this.vstate); who.actor?.speak?.(0.15); }
  /** Replace the world and rebuild all presentation. */
  resetWorldView(world) {
    this.world = world; this.seasonShown = -1; this.syncAll(); this.npcs.reset(); this.player.reset();
  }
  applyWorn() { const w = this.world; this.base ??= this.tiles.slice(); const worn = w.town.worn ?? {}; let changed = false; for (let i = 0; i < this.tiles.length; i++) { const want = (worn[i] ?? 0) >= 30 && this.base[i] === 0 ? 1 : this.base[i]; if (this.tiles[i] !== want) { this.tiles[i] = want; changed = true; } } if (changed) this.town.rebuildGround(this.tiles); }
  syncAll() { this.applyWorn(); const w = this.world, s = seasonOf(w.day); this.town.setSeason(s); this.town.syncTrees(w.town.trees, s); this.town.syncRocks(w.town.rocks); this.town.syncFlowers(w.town.flowers); this.town.syncWeeds(w.town.weeds); this.town.syncHoles(w.town.holes, w.town.cracks); this.town.syncItems(w.town.items); this.grid.set(blockedGrid(this.tiles, w.town.trees, w.town.rocks)); this.seasonShown = s; this.town.syncBuildings(w); }
  get hour() { return this.world ? hourOf(this.world.min) : 12; }
  get season() { return seasonOf(this.world.day); }
  get dayType() { return dayTypeOf(this.world.day); }
  get weather() { if (this.forceWeather) return this.forceWeather; return this.world ? weatherAt(this.season, this.world.day, this.hour, this.world.year, tuning.rainMult) : 'sun'; }
  setMusic(name) { if (this.musicName === name) return; this.musicName = name; this.ctx.audio.playMusic(songNamed(name), name); }
  showTitle() {
    this.mode = 'title'; this.ui.clear(); this.world = this.world ?? newWorld(1); this.ui.push(new TitleScreen(this)); this.frozen = true; this.titleCam = 0;
    this.player.actor.show(false); this.npcs.setVisible(true); this.musicName = ''; this.setMusic('title');
  }
  titleChoice(id) {
    if (id === 'continue') this.startGame(loadWorld(), false);
    else if (id === 'new') this.sys.intro.begin(this);
    else if (id === 'settings') this.ui.push(new SettingsScreen(this));
    else if (id === 'about') this.sys.about.open(this);
    else if (id === 'visit') this.sys.visit?.openMenu(this);
  }
  startRound(info) { this.mode = 'round'; this.sys.hubActive = true; this.ui.clear(); this.ui.noPrompts = false; this.player.actor.show(false); this.round = new Round(this, info); this.round.build(); this.round.attach(); this.engine.timeScale = 1; if (window.AIHub) setTimeout(() => window.AIHub.ready(), 0); }
  startAttract() { this.sys.attract?.start?.(this); }
  startGame(world, fresh) {
    if (!world) return; this.ui.clear(); this.mode = 'play'; this.resetWorldView(world); world.clockMode = this.settings.clock === 'real' ? 'real' : 'village';
    this.player.actor.show(true); this.frozen = false; this.grace = 0.35; this.ctx.input.clearQueued(); this.sys.time.onLoad(this); this.musicName = ''; this.updateMusic(true);
    this.sys.pimm?.maybeVisit(this, fresh);
  }
  update(ctx, dt) {
    for (const cmd of this.ctx.input.commands) if (cmd && cmd.t === 'clock') this.realNow = cmd.now; this.clockT = (this.clockT ?? 0) - dt; if (this.clockT <= 0) { this.clockT = 1; if (typeof Date !== 'undefined') this.ctx.input.send({ t: 'clock', now: Date.now() }); }
    this.t += dt; this.tick++; this.stepTimers(dt); if (this.grace > 0) this.grace -= dt; this.debug ??= {};
    const frame = (d) => this.drawHud(d);
    this.ui.frame(dt, frame);
    if (this.mode === 'round') { this.round.update(dt); cardInput(this.round, this); }
    if (this.mode === 'title' || this.mode === 'attract') this.updateTitleCam(dt);
    else if (this.mode === 'play') this.updatePlay(dt);
    this.updateWorld(dt); this.sys.city?.update(this, dt); if (this.visit) this.visit.update(this, dt); this.sys.venues.updateRoomActors?.(this, dt); this.sys.ambience.update(this, dt); this.sys.cameos.update(this, dt);
    this.floorY = this.place === 'town' ? groundHeight(this.player.pos.x, this.player.pos.z) : 0; if (this.mode !== 'title') this.player.syncActor(); this.player.actor.update(dt, this.t); this.npcs.updateVisual(dt, this.t);
    this.updateCamera(dt); this.updateOccluders(dt);
    if (this.mode === 'attract') this.sys.attract.update(this, dt);
  }
  fixedUpdate(ctx, dt) {
    if (this.mode !== 'play' && this.mode !== 'attract') return;
    if (this.frozen) return;
    this.sys.time.step(this, dt);
    this.player.fixed(dt); this.wearPath(dt); this.npcs.fixed(dt); this.sys.nature.fixed(this, dt);
  }
  updatePlay(dt) {
    this.frozen = this.ui.busy || this.cutscene > 0;
    if (!this.ui.busy && !this.frozen) { this.player.read(dt); this.sys.verbs.update(this, dt); this.sys.interact.update(this, dt); this.sys.nature.update(this, dt); }
    if (!this.ui.busy && !this.ui.closedThisFrame) {
      const c = this.ui.c;
      { const md = this.ctx.input.mouseDelta; if (c.device === 'pad') { this.rs ??= { x: 0, y: 0 }; this.rs.x += md.x; this.rs.y += md.y; this.rs.x *= 0.96; this.rs.y *= 0.96; if (Math.abs(this.rs.x) > 60) { this.camYawTarget += this.rs.x > 0 ? 90 : -90; this.rs.x = 0; this.sfx('tick'); } if (Math.abs(this.rs.y) > 70) { setTuning('zoom', tuning.zoom + (this.rs.y < 0 ? 0.2 : -0.2)); this.rs.y = 0; } } }
      if (c.ptr.left && c.device === 'kb' && c.ptr.x >= 12 && c.ptr.x <= 100 && c.ptr.y >= H - 36 && c.ptr.y <= H - 12) this.sys.pockets.open(this);
      if (c.pressed('camL')) { this.camYawTarget -= 90; this.sfx('tick'); } else if (c.pressed('camR')) { this.camYawTarget += 90; this.sfx('tick'); }
      if (c.pressed('zoomIn')) setTuning('zoom', tuning.zoom + 0.2); else if (c.pressed('zoomOut')) setTuning('zoom', tuning.zoom - 0.2);
      if (c.pressed('pause')) this.sys.pause.open(this);
      else if (c.pressed('pockets')) this.sys.pockets.open(this);
      else if (c.pressed('map')) this.sys.map.open(this);
      else if (c.pressed('almanac')) this.sys.almanac.open(this);
      else if (c.pressed('emote')) this.sys.emote.open(this);
    }
  }
  updateWorld(dt) {
    if (!this.world || this.mode === 'round') return;
    this.town.update(this.ctx.time); this.sys.time.visual(this, dt);
  }
  wearPath(dt) { const w = this.world; if (!w || this.place !== 'town' || this.player.speed < 1) return; const i = Math.floor(this.player.pos.z) * TW + Math.floor(this.player.pos.x); if (this.tiles[i] !== 0) return; if (this.player.mode === 'run' && this.place === 'town') { const fl = w.town.flowers.find(f => f.x === Math.floor(this.player.pos.x) && f.z === Math.floor(this.player.pos.z)); if (fl && !fl.wilt) { fl.wilt = true; this.town.syncFlowers(w.town.flowers); this.ui.toast('Oops. Running tramples flowers.'); } }
    w.town.worn ??= {}; this.wornT = (this.wornT ?? 0) + dt; if (this.wornT > 0.3) { this.wornT = 0; w.town.worn[i] = (w.town.worn[i] ?? 0) + 1; if (w.town.worn[i] === 30) this.applyWorn(); } }
  updateTitleCam() { this.titleCam += 0.002; }
  updateMusic(force) { this.sys.time.music(this, force); }
  updateCamera(dt) {
    const e = this.engine; const diff = ((this.camYawTarget - this.camYaw + 540) % 360) - 180; this.camYaw += diff * Math.min(1, dt * 8); if (Math.abs(diff) < 0.05) this.camYaw = this.camYawTarget;
    const talking = this.mode === 'play' && this.ui.top?.id === 'dialogue' && !this.cutscene; const z = this.zoomOverride ?? (talking ? Math.max(tuning.zoom, 2.0) : tuning.zoom); this.zoomNow += (z - this.zoomNow) * Math.min(1, dt * 6);
    const key = this.camYaw.toFixed(1) + '|' + this.zoomNow.toFixed(3);
    if (key !== this.camKey) { this.camKey = key; e.setCamera({ preset: 'iso', yaw: this.camYaw, pitch: 35, zoom: this.zoomNow, minZoom: this.zoomNow, maxZoom: this.zoomNow }, { syncUrl: false }); }
    if (this.mode === 'round') { /* round drives the camera target */ }
    else if (this.mode === 'title') { this.target.set(22 + Math.sin(this.t * 0.1) * 5, 0, 22 + Math.cos(this.t * 0.07) * 2); }
    else { const p = this.freeCam ?? this.player.pos; this.target.lerp(new THREE.Vector3(p.x, 0.8 + (this.floorY ?? 0), p.z), Math.min(1, dt * 5)); }
  }
  updateOccluders(dt) { if (this.mode === 'title' || this.mode === 'round') return; const inTown = this.place === 'town'; this.occFrame = (this.occFrame ?? 0) + 1; if (this.occFrame % 2) return; const town = this.town; if (inTown) { this.occ.setCandidates([...town.buildings.values(), ...[...town.treeMeshes.values()].map(t => t.obj), town.oldPear, town.rindStall]); this.occ.update(dt * 2, this.ctx.camera.camera, { x: this.player.pos.x, y: 0, z: this.player.pos.z }, true); } else this.occ.update(dt * 2, this.ctx.camera.camera, this.player.pos, false); }
  cameraTarget() { return this.target; }
  drawHud(d) { if (this.mode === 'round') { this.round.draw(d); return; } this.sys.hud?.draw(this, d); }
  /** Await a dialogue. speaker: actor-ish { name, type, pitch, actor }. */
  say(speaker, text, o = {}) {
    const dlg = new Dialogue(speaker, text, o); this.ui.push(dlg); return dlg.promise;
  }
  /** Say with choices; resolves to index. */
  ask(speaker, text, choices) { return this.say(speaker, text, { choices }); }
  status() { return this.world ? `${this.mode} d${this.world.day} ${fmtClock(this.world.min)} beans ${this.world.beans} debt ${this.world.debt}` : this.mode; }
  fingerprint() { const w = this.world; if (!w) return ''; return [w.day, Math.floor(w.min), this.player.pos.x.toFixed(2), this.player.pos.z.toFixed(2), w.beans, w.debt, Object.keys(w.coll.fish).length, Object.keys(w.coll.bug).length].join('|'); }
  ready(ctx) { if (typeof window !== 'undefined') window.__GAME__ = this.sys.testHandle(this); }
}
install(Game); installShell(Game);
export const createGame = () => new Game();
