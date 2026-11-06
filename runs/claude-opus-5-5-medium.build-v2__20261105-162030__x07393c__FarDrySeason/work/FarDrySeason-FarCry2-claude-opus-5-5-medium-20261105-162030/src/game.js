// Far Dry Season: one Game object, one Engine, and modes on it. No DOM at import.
import { buildModel, glowMaterial, NavGrid, PALETTE, setLookLayer, THREE, toonMaterial } from '../pixel-engine.js';
import { mixin } from './core/mixin.js';
import { StatePart } from './core/state.js';
import { Attract } from './attract/director.js';
import { Sound } from './audio/sound.js';
import { Actors } from './actors/soldier.js';
import { Buddies } from './actors/buddy.js';
import { People } from './actors/civilian.js';
import { Player } from './actors/player.js';
import { CATALOG } from './art/models.js';
import { GUN_VIEWMODELS } from './art/viewmodels.js';
import { Body } from './body/health.js';
import { Combat } from './combat/weapons.js';
import { Projectiles } from './combat/projectiles.js';
import { ViewModel } from './combat/viewmodel.js';
import { EPIGRAPHS, ledgerLines } from './content/dialogue.js';
import { LINES } from './content/dialogue.js';
import { MISSIONS, missionById } from './content/missions.js';
import { HALTS, ROADS } from './content/roads.js';
import { MERCY_RUNS, POSTS, SAFEHOUSES, siteById, SITES } from './content/sites.js';
import { GAME_TITLE } from './content/title.js';
import { SHOP_ORDER, THROWABLES, UPGRADES, WEAPONS } from './content/weapons.js';
import { ALL_CODES, CODES, PAD_BUTTONS, PREVENT, held, pressed as actionPressed, pressedFixed } from './core/actions.js';
import { Events } from './core/events.js';
import { installLook } from './core/look.js';
import { Save } from './core/save.js';
import { TUNING } from './core/tuning.js';
import { Dev, devScreen } from './dev/devmode.js';
import { Missions, npcTitle } from './missions/runner.js';
import { freshLedger } from './missions/ledger.js';
import { Talk } from './ui/dialogue.js';
import { Hud } from './ui/hud.js';
import { UI } from './ui/menu.js';
import { Prompt } from './ui/prompts.js';
import { ScenePlayer } from './ui/scenes.js';
import { aboutScreen, bedScreen, boardScreen, endingScreen, gameOverScreen, lockerScreen, mainScreen, pauseScreen, pressScreen, rackScreen, touchGateScreen } from './ui/screens/index.js';
import { repairVehicle } from './vehicles/repair.js';
import { Train } from './vehicles/train.js';
import { Vehicles } from './vehicles/vehicle.js';
import { MapTexture } from './world/map-texture.js';
import { World } from './world/world.js';
import { angleDiff, clamp, dist2, lerp, polyPoint, polyLength } from './world/geom.js';
import { Round } from './net/round.js';
import { linkSession } from './net/linkSession.js';
import { soloSession } from './net/soloSession.js';
const { BoxGeometry, Mesh, PlaneGeometry, Vector3 } = THREE;
export const LOOK = {
  scene: [{ id: 'adjust', params: { brightness: 0, contrast: 1.06, saturation: 1.05, warmth: 0.04 } }, { id: 'chromatic', params: { spread: 0 } }, { id: 'vignette', params: { intensity: 0.28, softness: 0.7, amount: 1 } }],
  actors: { pixel: { size: 1, outline: 0.45, crease: 0.08 }, filters: [] },
  environment: { pixel: { size: 1, outline: 0.32, crease: 0.05 }, filters: [] },
};
const SETTINGS_KEY = 'far-dry-season-settings';
const DEFAULT_SETTINGS = { voices: 1, padSens: 1, mouseSens: 1, invertY: false, aimAssist: true, rumble: true, glyphs: 'playstation', pixel: 'fine', quality: 'medium', fov: 62, subtitle: 'normal', reduceFlashes: false, feverReduced: false, music: 0.1, sfx: 1 };
const MISSION_ORDER = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'end'];
const freshStory = () => ({ done: {}, flags: {}, seen: { 'mile-forty': true, 'three-wells': true }, ledger: freshLedger(), act: 1, trigs: {}, halts: {}, collected: {}, wall: [], feverOn: false, pass: null, current: null, ending: null, bought: {}, mercy: 0 });
class Tracers {
  list = [];
  constructor(ctx) { this.ctx = ctx; const m = glowMaterial(PALETTE.sand), g = new BoxGeometry(0.035, 0.035, 1); for (let i = 0; i < 40; i++) { const o = new Mesh(g, m); o.visible = false; o.castShadow = false; o.frustumCulled = false; ctx.scene.add(o); this.list.push({ o, t: 0 }); } this.i = 0; }
  add(x0, y0, z0, x1, y1, z1) { const k = this.list[this.i++ % 40], l = Math.hypot(x1 - x0, y1 - y0, z1 - z0); k.o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); k.o.lookAt(x1, y1, z1); k.o.scale.z = Math.min(l, 16); k.o.visible = true; k.t = 0.05; }
  update(dt) { for (const k of this.list) if (k.t > 0) { k.t -= dt; if (k.t <= 0) k.o.visible = false; } }
}
class Tracker {
  up = false; beepT = 0; nearestD = 1e9;
  constructor(g) { this.g = g; }
  setUp(on) { const g = this.g; if (on === this.up) return; this.up = on; if (on) { g.audio.play('click'); g.vm.playTool('TrackerHold', ['tool-tracker'], { hideGun: false, loop: true }); } else if (g.vm.toolName === 'TrackerHold') g.vm.endTool(); }
  update(dt) {
    const g = this.g; if (!this.up) return;
    const p = g.player; let d = 1e9;
    for (const c of g.world.cases) if (!c.taken) d = Math.min(d, dist2(c.at[0], c.at[1], p.x, p.z));
    for (const q of g.prompt.pickups) if (q.stones) d = Math.min(d, dist2(q.x, q.z, p.x, p.z));
    if (g.net) for (const c of g.net.cases) if (!c.banked && !c.burned && c.carrier < 0) d = Math.min(d, dist2(c.x, c.z, p.x, p.z));
    this.nearestD = d;
    this.beepT -= dt;
    const within = d < 60;
    const period = within ? clamp(d / 40, 0.09, 1.3) : 2.2;
    if (this.beepT <= 0) { this.beepT = period; g.audio.play('tracker-beep', { pitch: within ? 0 : -7, volume: within ? 0.8 : 0.3 }); if (g.vm.led) g.vm.led.visible = true; g.ctx.tweens.call(0.05, () => { if (g.vm.led) g.vm.led.visible = false; }); }
  }
}
class Bot {
  codes = new Set(); drive = null; fire = false; aim = false; forward = 0; hold = null; pending = [];
  constructor(g) { this.g = g; }
  press(code) { this.pending.push(code); this.codes.add(code); }
  reset() { const input = this.g.ctx.input; for (const c of this.codes) input.setKey(c, false); this.codes.clear(); this.drive = null; this.fire = false; this.aim = false; this.forward = 0; this.hold = null; this.pending.length = 0; }
  key(code, on) { const input = this.g.ctx.input; if (on) this.codes.add(code); input.setKey(code, on); }
  apply() {
    const input = this.g.ctx.input;
    this.key('MouseLeft', this.fire || this.pending.includes('MouseLeft')); this.key('MouseRight', this.aim);
    this.key('KeyW', this.forward > 0 || (this.drive?.throttle ?? 0) > 0.05);
    this.key('KeyA', (this.drive?.steer ?? 0) < -0.2); this.key('KeyD', (this.drive?.steer ?? 0) > 0.2);
    if (this.hold) this.key(this.hold, true);
    for (const c of this.pending) { if (c !== 'MouseLeft') { input.setKey(c, true); this.toRelease = c; } }
    this.pending.length = 0;
  }
  after() { if (this.toRelease) { this.g.ctx.input.setKey(this.toRelease, false); this.toRelease = null; } }
}
const v3 = new Vector3();
export class FarDrySeason {
  name = GAME_TITLE;
  mode = 'boot'; device = 'kbm'; frozen = false; warOn = false; analog = [0, 0]; waypoint = null; ledgerUp = false; monocularUp = false; grassOn = false; demoTag = false; idle = 0; titleFireT = 0; lastDevice = 'kbm';
  cheats = { god: false, infiniteAmmo: false, noJams: false, noFever: false, invisible: false, noclip: false };
  cam = { override: null, enabled: true, sensX: 1, sensY: 1, invertY: false, kickPitch: 0, kickYaw: 0, roll: 0 };
  constructor(options = {}) {
    this.options = options; this.session = options.session ?? null;
    this.settings = { ...DEFAULT_SETTINGS };
    this.events = new Events();
    this.story = freshStory();
    this.scenes = new ScenePlayer(this); this.world = new World(this); this.player = new Player(this); this.combat = new Combat(this); this.projectiles = new Projectiles(this); this.vm = new ViewModel(this); this.mapTex = new MapTexture(this); this.body = new Body(this); this.actors = new Actors(this); this.vehicles = new Vehicles(this); this.train = new Train(this); this.buddies = new Buddies(this); this.people = new People(this); this.missions = new Missions(this); this.talk = new Talk(this); this.prompt = new Prompt(this); this.hud = new Hud(this); this.ui = new UI(this); this.audio = new Sound(this); this.save = new Save(this); this.dev = new Dev(this); this.attract = new Attract(this); this.tracker = new Tracker(this); this.bot = new Bot(this);
    this.pressed = (a) => actionPressed(this.ctx.input, a);
  }
  async setup(ctx) {
    this.ctx = ctx;
    this.headless = !ctx.engine.gpu;
    this.grassOn = this.options.grass ?? !this.headless;
    const input = ctx.input;
    input.gamepadButtons = { ...PAD_BUTTONS };
    for (const c of PREVENT) input.preventKeys.add(c);
    this.wantLock = false;
    Object.defineProperty(input, 'wantsPointerLock', { get: () => false, set() {}, configurable: true });
    installLook(ctx, this.cam);
    this.setFov(this.settings.fov);
    this.loadSettings();
    this.world.build(ctx);
    this.mapTex.build();
    this.player.build(ctx); this.combat.build(ctx); this.projectiles.build(ctx); this.vm.build(ctx); this.body.build(ctx); this.actors.build(ctx); this.vehicles.build(ctx); this.train.build(ctx); this.buddies.build(ctx); this.people.build(ctx); this.missions.build(ctx); this.prompt.build(ctx); this.hud.build(ctx); this.ui.build(ctx); this.audio.build(ctx);
    this.tracers = new Tracers(ctx);
    this.buildNav();
    this.rng = ctx.random.fork('game');
    this.bindEvents();
    this.ready_ = true;
    this.buildExtras(ctx);
    if (this.session) { this.net = new Round(this, this.session); this.mode = 'round'; await this.net.begin(); }
    else this.enterTitle('press');
  }
  buildExtras(ctx) {
    this.rack = { object: null };
    this.tableMap = new Mesh(new PlaneGeometry(0.96, 0.72), toonMaterial(0xffffff, { map: this.mapTex.texture }));
    this.tableMap.rotation.x = -Math.PI / 2; this.tableMap.visible = false; this.tableMap.castShadow = false; ctx.scene.add(this.tableMap);
    this.charges = [];
  }
  buildNav() {
    const land = this.world.land, n = new NavGrid(640, 640, { cell: 2, origin: [-640, 0, -640] });
    for (let r = 0; r < 640; r++) for (let c = 0; c < 640; c++) {
      const x = -640 + c * 2 + 1, z = -640 + r * 2 + 1, h = land.heightAt(x, z), dh = Math.abs(land.heightAt(x + 2, z) - h) + Math.abs(land.heightAt(x, z + 2) - h);
      if (dh > 2.2 || h < 35.2) n.setOpen(c, r, false);
    }
    const SIZE = { shack: [3.5, 3], barracks: [7.5, 3.5], office: [5, 4], bunker: [4.5, 3.5], silo: [4, 4], 'fuel-tank': [3.5, 3.5], 'pump-station': [5, 3.5], 'rail-shed': [7.5, 4.5], 'sluice-house': [6.5, 4], hut: [2.2, 2.2], 'clinic-tent': [4, 3], schoolroom: [4.5, 3.5], 'stone-wall': [3, 1], 'water-tower': [1, 1], 'obs-dome': [4.5, 4.5] };
    for (const def of SITES) for (const [id, dx, dz, yaw = 0] of def.props ?? []) { const sz = SIZE[id]; if (!sz) continue; const x = def.at[0] + dx, z = def.at[1] + dz, k = (yaw * Math.PI) / 180, c = Math.cos(k), q = Math.sin(k); for (let a = -sz[0]; a <= sz[0]; a += 1) for (let b = -sz[1]; b <= sz[1]; b += 1) n.setOpen(n.col(x + a * c + b * q), n.row(z - a * q + b * c), false); } // Each prop's true footprint, turned with it.
    const fort = SITES.find((d) => d.id === 'fort-clement'), gate = fort.props.find((q) => q[0] === 'fort-wall-gate'); for (const side of [-1, 1]) for (let a = 5; a <= 33; a += 1) for (let b = -1; b <= 1; b += 1) n.setOpen(n.col(fort.at[0] + gate[1] + side * a), n.row(fort.at[1] + gate[2] + b), false); // The gate wall, leaving its opening.
    this.nav = n;
  }
  bindEvents() {
    const ev = this.events;
    ev.on('actorDied', (a, o) => { if (o.by?.kind === 'player') { if (this.net) this.net.onKill(a, o); else this.story.ledger.killed++; } if (a.kind === 'soldier' && !this.net && !a.friendly && this.mode === 'play' && o.by?.kind === 'player' && this.rng.next() < 0.3 && !this.gunSlung()) this.spawnGunPickup('tractor', this.rng.range(20, 55), a.x, a.z, null); });
    ev.on('missionDone', () => { for (const a of [...this.actors.list]) if (a.tag && !a.site) this.actors.remove(a); for (const v of [...this.vehicles.list]) if (v.tag && ['escort', 'payroll', 'attract'].includes(v.tag)) this.vehicles.remove(v); this.hud.holdTimer = null; });
    ev.on('missionStart', () => { const b = this.buddies; if (b.state.dov.met && b.state.dov.alive) this.player.charges = Math.max(this.player.charges, THROWABLES.charge.carry); this.waypoint = null; this.userWaypoint = false; });
    ev.on('stepStart', () => { this.userWaypoint = false; });
    ev.on('fever', () => this.audio.setMusic('fever'));
  }
  ready(ctx) { if (typeof window !== 'undefined') { window.__GAME__ = this; window.__rack = rackScreen; window.__dev = devScreen; window.__end = endingScreen; window.__about = aboutScreen; } this.pageHooks(ctx); this.net?.onEngineReady(); }
  /** Cash Run outside a hub session: solo with hired guns, or two windows on one computer. */
  startCashRun(kind) {
    this.ui.clear();
    if (kind === 'solo') { this.beginRoundFrom(soloSession(this)); return; }
    const session = linkSession({ host: kind === 'host', name: kind === 'host' ? 'HOST' : 'GUEST' });
    this.linkPending = session;
    this.ui.push({ id: 'link-lobby', cover: 'ink', title: 'CASH RUN', sub: kind === 'host' ? 'WAITING FOR THE OTHER WINDOW. OPEN THIS GAME AGAIN AND CHOOSE JOIN.' : 'LOOKING FOR THE OTHER WINDOW.', top: 120, footer: [['back', 'BACK']], items: kind === 'host' ? [{ label: 'START', disabled: () => !session.joined, action: () => session.start() }] : [], back: () => { session.close(); this.linkPending = null; this.ui.pop(); } });
    session.on('start', () => { this.ui.clear(); this.linkPending = null; this.beginRoundFrom(session); });
  }
  beginRoundFrom(session) { this.beginCampaignState(); this.session = session; this.net = new Round(this, session); this.mode = 'round'; this.net.begin(); this.net.onEngineReady(); this.requestLock(); }
  pageHooks(ctx) {
    if (typeof document === 'undefined' || this.hooked) return; this.hooked = true;
    const canvas = ctx.engine.gpu?.canvas ?? document.querySelector('canvas');
    this.canvas = canvas;
    const relock = () => { if (this.wantLock && !document.pointerLockElement && canvas?.requestPointerLock) { const r = canvas.requestPointerLock(); if (r?.catch) r.catch(() => {}); } };
    window.addEventListener('pointerup', relock);
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.wantLock && !this.ui.top && (this.mode === 'play') && !this.session) this.pause(); });
    const real = () => { this.realInput = true; };
    window.addEventListener('keydown', real); window.addEventListener('pointerdown', real); window.addEventListener('touchstart', real, { passive: true });
    window.addEventListener('gamepaddisconnected', () => { if (this.mode === 'play' && !this.ui.top) this.pause(); });
  }
  // ----- Settings -----
  store() { return typeof localStorage !== 'undefined' ? localStorage : null; }
  loadSettings() {
    let saved = null;
    try { saved = JSON.parse(this.store()?.getItem(SETTINGS_KEY) ?? 'null'); } catch { saved = null; }
    if (saved) Object.assign(this.settings, saved);
    const a = this.ctx.audio; a.setVolume('music', this.settings.music); a.setVolume('sfx', this.settings.sfx);
    this.applySettings();
  }
  applySettings() { const s = this.settings; this.setFov(s.fov); this.cam.invertY = s.invertY; if (s.pixel === 'chunky') this.ctx.engine.settings?.set?.({ pixelSize: 'chunky' }); this.ctx.engine.shake.strength = s.reduceFlashes ? 0.5 : 1; }
  saveSettings() { const a = this.ctx.audio, s = this.settings; s.music = a.volume.music; s.sfx = a.volume.sfx; this.applySettings(); try { this.store()?.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* blocked storage: settings last the session */ } }
  resetSettings() { this.settings = { ...DEFAULT_SETTINGS }; const a = this.ctx.audio; a.setVolume('music', 0.1); a.setVolume('sfx', 1); a.setVolume('master', 0.8); if (this.ctx.engine.settings?.set) this.ctx.engine.settings.set({ pixelSize: 'fine' }); this.saveSettings(); }
  setFov(f) { const c = this.ctx.camera.camera; this.baseFov = f; if (c.fov !== f) { c.fov = f; c.updateProjectionMatrix(); } }
  isFullscreen() { return typeof document !== 'undefined' && !!document.fullscreenElement; }
  setFullscreen(on) { if (typeof document === 'undefined') return; const r = on ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.(); r?.catch?.(() => {}); }
  sfxK() { return 1; }
  // ----- Modes -----
  gateActive() {
    if (typeof matchMedia === 'undefined') return false;
    if (this.gateCleared) return false;
    const coarse = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    return coarse && !this.padConnected();
  }
  padConnected() { const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null; return !!pads && [...pads].some((p) => p && p.connected !== false); }
  enterTitle(first = 'press') {
    this.mode = 'title'; this.ui.clear(); this.ctx.engine.timeScale = 1; this.idle = 0; this.frozen = false; this.wantLock = false;
    this.releaseLock();
    this.world.setHour(18.4, true); this.world.pinWind({ dir: [0.4, -1], speed: 5 });
    this.titleCamera();
    const gate = this.gateActive();
    if (gate) this.ui.push(touchGateScreen(this)); else this.ui.push(first === 'main' ? mainScreen(this) : pressScreen(this));
    this.audio.dead = false;
    this.audio.setMusic('title');
    this.titleFireT = 0;
    if (!this.shownEpigraph) { this.shownEpigraph = true; this.hud.blackoutT = 3.2; this.hud.blackoutText = this.epigraph(); this.idle = 0; }
  }
  epigraph() { const list = EPIGRAPHS; return `${this.rng.pick(list)} - FROM HARROW'S FIELD NOTES`; }
  releaseLock() { if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.(); }
  titleCamera() { const f = siteById['long-field'].at, y = this.world.land.heightAt(f[0], f[1]); this.titleAt = [f[0] - 118, y + 11, f[1] + 78]; this.titleTarget = [f[0] - 10, y + 2, f[1]]; this.cam.override = { position: this.titleAt, target: this.titleTarget }; this.player.teleport(f[0] - 118, f[1] + 78); this.world.focusX = f[0]; this.world.focusZ = f[1]; }
  drawTitle(small) {
    const h = this.ctx.hud, t = GAME_TITLE.toUpperCase(), scale = h.measure(t, 4).width < h.width - 48 ? 4 : 3;
    h.text(0, small ? 40 : 56, t, { anchor: 'top', scale, color: 'sand', shadow: 'plum' });
    h.text(0, (small ? 40 : 56) + 8 * scale + 8, 'A MAP IS A PROMISE MADE BY SOMEONE WHO HAS ALREADY LEFT.', { anchor: 'top', color: 'white' });
  }
  beginCampaignState() {
    const w = this.world;
    this.vehicles.clear(); this.actors.clear(); this.buddies.reset(); this.projectiles.clear(); this.combat.clear(); this.prompt.clearDynamic(); this.talk.clear(); this.people.clearDynamic();
    for (const c of this.charges) this.ctx.scene.remove(c.object); this.charges.length = 0;
    w.reset();
    for (const s of Object.values(w.sites)) { s.live = false; s.actors = []; s.vehicles = []; }
    this.story = freshStory();
    this.setHutsDark(false);
    const p = this.player;
    Object.assign(p, { hp: 100, stones: 0, tablets: 0, syrettes: 3, molotovs: 0, charges: 0, upgrades: {}, unlocked: {}, planted: [], carrying: null, burning: 0, surgery: null, downT: 0, mapUp: false, mounted: false, mountGun: null, riding: null, railGun: null, crouched: false, walkToggle: false });
    p.guns = { melee: null, sidearm: null, main: null, special: null }; p.ctrl.collider.setEnabled(true); p.ctrl.body.setEnabled?.(true);
    this.combat.give('cane', 100, false); this.combat.give('m38', 88, true);
    this.body.resetFever(); this.body.feverNext = 1e9;
    this.warOn = false; this.side = null; this.waypoint = null; this.ledgerUp = false; this.monocularUp = false; this.frozen = false; this.tracker.setUp(false); this.mapTex.arc = false; this.cam.override = null; this.cam.kickPitch = 0; this.vm.allHidden = false; this.hud.holdTimer = null; this.missions.active = null; this.missions.steps = []; this.missions.st = {}; this.mapShowsAll = false; this.mapTex.zoom = false;
    this.people.showFriends();
    for (const n of Object.values(this.people.npcs)) { n.gone = false; if (n.id === 'harrow') n.view.setFull('WriteAtDesk'); }
  }
  resetCampaignStateForDemo() { this.beginCampaignState(); this.mode = 'attract'; this.combat.give('tractor', 70, false); this.player.molotovs = 3; this.mapShowsAll = true; }
  newGame() {
    this.ui.clear(); this.beginCampaignState(); this.mode = 'play'; this.ctx.engine.timeScale = 1; this.save.clear();
    this.player.teleport(-30, 104); this.audio.setMusic('day');
    this.hud.blackoutT = 3; this.hud.blackoutText = this.epigraph();
    this.missions.start('m0');
    this.requestLock();
  }
  continueGame() { this.ui.clear(); this.save.requestLoad(); this.mode = 'play'; this.ctx.engine.timeScale = 1; this.frozen = false; this.requestLock(); }
  afterLoad() { this.mode = 'play'; this.people.showFriends(); if (this.story.threeWellsEmpty) { this.people.emptyThreeWells(); this.setHutsDark(true); } if (this.story.done.m8) this.people.startColumn(); this.cam.override = null; this.world.pinWind(null); this.ctx.engine.timeScale = 1; this.body.resetFever(); this.frozen = false; this.ui.clear(); this.story.pass = null; this.story.current = null; const auto = MISSIONS.find((m) => m.auto && !this.story.done[m.id] && m.requires.every((r) => this.story.done[r])); if (auto && this.story.done.m0) this.missions.start(auto.id); else if (auto) this.newGame(); }
  requestLock() { this.wantLock = true; }
  pause() { if (this.ui.top || this.mode === 'attract') return; if (!this.session) this.ctx.engine.timeScale = 0; this.combat.stopStream(); this.ui.push(pauseScreen(this)); this.releaseLock(); }
  resume() { this.ui.clear(); this.ctx.engine.timeScale = 1; this.dev.playing = false; this.requestLock(); if (this.wantLock && typeof document !== 'undefined') { const r = this.canvas?.requestPointerLock?.(); r?.catch?.(() => {}); } }
  toTitle() { this.ui.clear(); this.beginCampaignState(); this.cam.override = null; if (this.net) this.net.leave(); this.enterTitle('main'); this.mode = 'title'; }
  gameOver(text) { this.ctx.engine.timeScale = 0; this.ui.clear(); this.ui.push(gameOverScreen(this, text)); this.releaseLock(); this.audio.setMusic('end'); this.events.emit('gameOver'); }
  finishGame() { this.story.finished = true; this.ctx.engine.timeScale = 0; this.audio.setMusic('end'); this.ui.push(endingScreen(this)); this.releaseLock(); this.mode = 'play'; const near = this.nearestRecovery(); const f = this.save.disabled; this.save.disabled = false; this.player.teleport(near[0], near[1]); this.save.write(); this.save.disabled = f; this.events.emit('finished', this.story.ending); }
  afterCredits() { this.toTitle(); }
  // ----- The rules of the world -----
  gunSlung() { if (this.mode !== 'play' || this.story.truceOver || this.world.sites['mile-forty'].truceOver) return false; const p = this.player, s = siteById['mile-forty']; return dist2(p.x, p.z, s.at[0], s.at[1]) < s.truce; }
  isHostileToPlayer(a, t = this.player) {
    if (this.mode === 'attract') return !a.friendly;
    if (this.mode === 'round') return true;
    if (a.friendly) return false;
    if (this.cheats.invisible) return false;
    if (!this.story.truceOver) { const s = siteById['mile-forty']; if (dist2(t.x, t.z, s.at[0], s.at[1]) < s.truce || dist2(a.x, a.z, s.at[0], s.at[1]) < s.truce) return false; }
    if (a.provokedBy) return true;
    if (a.tag === 'end-buddy') return true;
    if (t.vehicle?.tag === 'tanker' && a.faction === 'harvest' && dist2(t.x, t.z, 430, -60) > 16) return false;
    if (this.story.pass === a.faction) { const site = a.site ? siteById[a.site] : null; if (!(site?.inner && dist2(t.x, t.z, site.at[0], site.at[1]) < site.inner) || this.hasBusinessAt(a.site)) return false; }
    if (a.site && this.hasBusinessAt(a.site)) return false;
    return true;
  }
  hasBusinessAt(siteId) {
    const def = siteById[siteId]; if (!def?.npcs || def.kind !== 'hq' || def.id === 'observatory') return false;
    const m = this.missions, id = def.npcs[0][0], s = m.step;
    return !!(m.availableFor(id) || (s && s.to === id));
  }
  targetsFor(a) {
    const out = this._targets ??= []; out.length = 0;
    if (this.mode === 'round') { this.net.targets(out); return out; }
    if (!a.friendly) out.push(this.player);
    for (const f of this.buddies.followers) if (f.alive && !f.down && !a.friendly) out.push(f);
    if (a.friendly || this.warOn) for (const o of this.actors.list) if (o !== a && o.alive && o.ctrl && o.faction !== a.faction && Math.abs(o.x - a.x) < 100 && Math.abs(o.z - a.z) < 100) out.push(o);
    return out;
  }
  onAlert() { this.anyAlertT = this.world.time; }
  onSiteCheck(s) { if (s.live && s.actors.length === 0 && !s.cleared) { s.cleared = true; s.clearedAt = this.world.totalHours; if (s.def.safehouse) { this.story.flags[s.def.safehouse] = true; this.notice(`${s.def.name} IS YOURS`); } else if (s.def.kind === 'post') this.notice(`${s.def.name} CLEARED`); this.events.emit('siteCleared', s); } }
  damageActor(a, dmg, o = {}) { if (this.net) this.net.onActorHit?.(a, dmg, o); this.actors.damage(a, dmg, o); }
  damagePlayer(dmg, o = {}) {
    const p = this.player, g = this;
    if (o.player && o.player !== p && this.net) { this.net.damageRemote(o.player, dmg, o); return; }
    if (this.net && !this.net.isHost) return;
    if (this.cheats.god || p.downT || this.scenes.shielded || (this.mode === 'attract')) return;
    if (this.net) { this.net.damageLocal(dmg, o); return; }
    p.hp -= dmg * TUNING.playerDamageTaken;
    this.body.regenT = 0; this.body.lastDamageKind = o.fire ? 'fire' : 'bullet';
    this.hud.touch();
    if (!o.fire) { this.ctx.engine.shake.add(0.25); this.flashBlood = 0.2; this.audio.play('hit-flesh'); if (this.rng.next() < 0.3) this.audio.play('grunt'); this.rumble(0.5, 0.12); }
    if (p.surgery) { p.surgery = null; g.vm.endTool(); }
    if (p.hp <= 0) { p.hp = 0; this.body.down(); }
  }
  rumble(strength, dur) {
    if (!this.settings.rumble || this.device !== 'pad' || typeof navigator === 'undefined') return;
    const pads = navigator.getGamepads?.(); const pad = pads && [...pads].find((q) => q);
    pad?.vibrationActuator?.playEffect?.('dual-rumble', { duration: dur * 1000, strongMagnitude: strength, weakMagnitude: strength * 0.6 })?.catch?.(() => {});
  }
  notice(text) { this.hud.noticeText = text; this.hud.noticeT = 3; this.hud.touch(); }
  nearestRecovery() {
    const p = this.player; let best = [-22, 6], bd = dist2(-22, 6, p.x, p.z); // the clinic
    for (const id of SAFEHOUSES) { const s = siteById[id]; if (this.story.flags[id] || this.world.sites[id].cleared) { const d = dist2(s.at[0], s.at[1], p.x, p.z); if (d < bd) { bd = d; best = [s.at[0] + 2, s.at[1] + 2]; } } }
    return best;
  }
  blackout(text, fn, secs = 3) { this.hud.blackoutT = secs; this.hud.blackoutText = text; this.frozen = true; fn?.(); this.ctx.tweens.call(secs, () => { this.frozen = false; }); }
  // ----- Things you can use -----
  usableFor(u, s) {
    const g = this;
    switch (u.type) {
      case 'bed': return { label: 'SLEEP', fn: () => g.ui.push(bedScreen(g)) };
      case 'locker': return { label: 'OPEN THE LOCKER', fn: () => g.ui.push(lockerScreen(g)) };
      case 'crate': return { label: 'AMMO AND SYRETTES', fn: () => g.restock() };
      case 'wall': { const list = this.story.wall, note = this.missions.available().find((m) => m.giver === 'note'); if (note) return { label: 'READ THE NOTE', fn: () => g.missions.start(note.id) }; return { label: list.length ? 'READ THE WALL' : 'THE WALL FOR NAMES', fn: () => g.talk.say('you', list.length ? `SCRATCHED HERE: ${list.map((n) => n.toUpperCase()).join(', ')}.` : 'NOBODY ON THE WALL YET. THERE IS ROOM.', 4) }; }
      case 'board': return { label: 'READ THE BOARD', fn: () => g.ui.push(boardScreen(g)) };
      case 'rack': return { label: "LOOK AT TIBOR'S RACK", fn: () => g.ui.push(rackScreen(g)) };
    }
    return null;
  }
  talkTo(id) {
    const g = this, st = g.missions.talkStep(id); if (st) return st;
    const m = g.missions.availableFor(id);
    if (m) return { label: `TALK TO ${npcTitle(id)}`, fn: () => g.offerMission(m) };
    if (id === 'odile') return { label: 'TALK TO SISTER ODILE', fn: () => g.odileTalk() };
    if (id === 'tibor' || id === 'bakr') return { label: `TALK TO ${npcTitle(id)}`, fn: () => g.talk.startScene({ speaker: id, lines: [`${id}.idle`] }) };
    if (id === 'ines' || id === 'dov' || id === 'mags') return { label: `TALK TO ${id.toUpperCase()}`, fn: () => { const ids = id === 'mags' ? 'mags.meet' : id === 'dov' ? 'dov.meet' : 'm2.after'; g.talk.startScene({ speaker: id, lines: [ids] }); } };
    return null;
  }
  offerMission(m) {
    const g = this;
    if (!m.brief) { g.missions.start(m.id); return; }
    g.talk.startScene({ speaker: m.giver, lines: [m.brief], choices: [{ text: 'ACCEPT', fn: () => g.missions.start(m.id) }, { text: 'NOT YET', fn: () => {} }] });
  }
  odileTalk() {
    const g = this, st = this.story, run = MERCY_RUNS[st.mercy ?? 0];
    if (!run || this.side) { g.talk.startScene({ speaker: 'odile', lines: ['odile.idle'] }); return; }
    g.talk.startScene({ speaker: 'odile', lines: ['mercy.offer'], choices: [{ text: 'TAKE THE CRATE', fn: () => g.startMercy(run) }, { text: 'NOT NOW', fn: () => {} }] });
  }
  startMercy(run) {
    const g = this; this.side = { run, t: run.seconds };
    const u = { x: run.at[0], z: run.at[1], y: g.world.land.heightAt(run.at[0], run.at[1]) + 0.5, label: 'DROP THE CRATE', r: 8, anyAngle: true, fn: () => g.finishMercy(u) };
    this.side.use = u; g.prompt.missionUse.push(u); g.waypoint = run.at; g.userWaypoint = true; g.talk.say('you', run.title, 3);
  }
  finishMercy(u) {
    const g = this, st = this.story; g.prompt.missionUse = g.prompt.missionUse.filter((o) => o !== u);
    if (st.odileRefuses) { st.odileRefuses = false; g.talk.playLines('odile.idle'); } else { g.player.tablets += 4; g.notice('+4 TABLETS'); g.talk.playLines('mercy.done'); }
    st.mercy = (st.mercy ?? 0) + 1; this.side = null;
    if (!g.buddies.state.mags.met) { g.buddies.state.mags.met = true; g.people.showFriends(); g.talk.playLines('mags.meet'); }
    g.events.emit('mercyDone'); g.userWaypoint = false;
  }
  restock() {
    const p = this.player; for (const g of Object.values(p.guns)) if (g && WEAPONS[g.id].reserve) { const k = p.upgrades.belt ? 1.5 : 1; g.reserve = Math.round(WEAPONS[g.id].reserve * k); g.mag = WEAPONS[g.id].mag; }
    const max = p.upgrades.pouch ? 5 : 3; p.syrettes = Math.max(p.syrettes, Math.min(max, p.syrettes + 1 + (this.buddies.state.mags.met && this.buddies.state.mags.alive ? 1 : 0)));
    p.molotovs = Math.max(p.molotovs, this.story.bought.molotov ? THROWABLES.molotov.carry : p.molotovs);
    this.audio.play('magazine'); this.notice('RESTOCKED'); this.hud.touch();
  }
  sleepTo(hour) {
    const w = this.world; let dh = hour - w.hour; if (dh <= 0.01) dh += 24;
    this.blackout('', () => { w.advanceHours(dh); this.player.hp = 100; for (const v of this.vehicles.list) if (dist2(v.x, v.z, this.player.x, this.player.z) < 60 && !v.dead) { v.hp = 100; v.stalled = false; } this.restock(); this.save.write(); this.events.emit('slept', hour); }, 1.4);
  }
  onHoursPassed() { for (const s of Object.values(this.world.sites)) this.remanCheck(s); }
  remanCheck(s) { if (s.cleared && s.def.kind === 'post' && !this.story.flags[s.id] && !s.def.safehouse && this.world.totalHours - s.clearedAt >= TUNING.postRemanHours) { s.cleared = false; } }
  lockerOptions(slot) {
    const p = this.player, list = [];
    for (const [id, w] of Object.entries(WEAPONS)) { if (w.slot !== slot) continue; if (p.unlocked[id] || id === 'm38' || (id === 'flare' && this.story.hasFlare) || (id === 'empire' && this.story.cleanEmpire) || (this.story.truceOver && SHOP_ORDER.includes(id))) list.push(id); }
    return list;
  }
  buy(it) {
    const p = this.player, S = this.story;
    if (it.kind === 'gun') { const w = WEAPONS[it.id]; if (p.unlocked[it.id]) { this.combat.give(it.id, 100, false); this.audio.play('rack'); this.notice(`TOOK THE ${w.name}`); return; } if (p.stones < w.price) { this.notice('NOT ENOUGH STONES'); this.audio.play('ui-back'); return; } p.stones -= w.price; p.unlocked[it.id] = true; S.bought[it.id] = true; this.combat.give(it.id, 100, false); this.audio.play('stone'); this.notice('EVERY LOCKER HAS ONE NOW'); this.events.emit('bought', it.id); return; }
    if (it.kind === 'throw') { const t = THROWABLES[it.id]; const has = it.id === 'molotov' ? p.molotovs : p.charges; if (has >= t.carry || p.stones < t.price) { this.notice(has >= t.carry ? 'YOU CARRY ALL YOU CAN' : 'NOT ENOUGH STONES'); return; } p.stones -= t.price; if (it.id === 'molotov') { p.molotovs++; S.bought.molotov = true; } else p.charges++; this.audio.play('stone'); this.events.emit('bought', it.id); return; }
    const u = UPGRADES.find((x) => x.id === it.id); if (p.upgrades[u.id]) return; if (p.stones < u.price) { this.notice('NOT ENOUGH STONES'); return; } p.stones -= u.price; p.upgrades[u.id] = true; if (u.id === 'belt') for (const g of Object.values(p.guns)) if (g && WEAPONS[g.id].reserve) g.reserve = Math.round(g.reserve * 1.5); this.audio.play('stone'); this.events.emit('bought', u.id);
  }
  showRackGun(it) {
    const scene = this.ctx.scene;
    if (this.rack.object) { scene.remove(this.rack.object); this.rack.object = null; }
    if (!it) { this.cam.override = null; this.rack.light?.release(); this.rack.light = null; return; }
    const table = siteById['mile-forty'].at, x = table[0] + 37, z = table[1] + 4, y = this.world.land.heightAt(x, z) + 0.84;
    let obj;
    if (it.kind === 'gun') { obj = buildModel(GUN_VIEWMODELS[it.id], { catalog: CATALOG }).object; for (const n of ['ArmR', 'ArmL']) { const a = obj.getObjectByName(n); if (a) a.visible = false; } obj.scale.setScalar(1.3); obj.rotation.set(0, Math.PI / 2, 0); const inner = obj.getObjectByName('Weapon'); if (inner) { const r = inner.getObjectByName('Rust'), t = inner.getObjectByName('Tape'); if (r) r.visible = false; if (t) t.visible = false; inner.position.set(0, 0.17, -0.3); } }
    else obj = buildModel(it.kind === 'throw' ? (it.id === 'charge' ? 'charge-world' : 'barrel') : 'crate', { catalog: CATALOG }).object;
    if (it.kind !== 'gun') obj.scale.setScalar(it.id === 'charge' ? 1.4 : 0.35);
    obj.position.set(x, y, z); setLookLayer(obj, 'actors'); scene.add(obj); this.rack.object = obj;
    this.cam.override = { position: [x - 0.2, y + 0.5, z + 1.35], target: [x, y + 0.07, z] };
    this.rack.light ??= this.ctx.lights.request({ position: [x - 0.3, y + 1.2, z + 0.9], color: 0xffe0b0, intensity: 9, radius: 8, priority: 5 });
  }
  showTableMap(at) { this.tableMap.visible = !!at; if (at) { this.tableMap.position.set(at[0], at[1] + 0.02, at[2]); this.mapTex.draw(); } }
  /** Three Wells emptied: the huts go dark. */
  setHutsDark(dark) { const s = this.world.sites['three-wells']; s.dark = dark; s.calm = dark; for (const e of s.extras) if (e.tag === 'hut') { if (dark && !e.darkObject) { const b = buildModel('hut', { catalog: CATALOG, palette: { wall: 'night', roof: 'slate', roof2: 'ink', frame: 'ink' } }); b.object.position.copy(e.object.position); b.object.rotation.copy(e.object.rotation); this.ctx.scene.add(b.object); e.darkObject = b.object; } e.object.visible = !dark; if (e.darkObject) e.darkObject.visible = dark; } }
  takeCase(c) { c.taken = true; c.object.visible = false; const n = Math.round((c.stones + 2) * TUNING.stonesReward); this.player.stones += n; this.story.ledger.stones += n; this.audio.play('stone'); this.notice(`+${n} STONES`); this.events.emit('caseTaken', c); }
  useTrig(t) {
    const S = this.story; S.trigs[t.id] = true; this.lastNoteI = t.note - 1; this.audio.play('map-paper');
    this.notice('A NEW NOTE IN YOUR MARGIN'); this.events.emit('trig', t);
    if (Object.keys(S.trigs).length >= 6) { S.cleanEmpire = true; S.marginNote = 'For your trouble: a clean rifle, in your locker. It shoots where I say.'; }
  }
  useHalt(h) {
    const S = this.story;
    if (!S.halts[h.id]) { S.halts[h.id] = true; this.notice(`${h.name} MARKED. THE GOODS LINE STOPS HERE.`); this.audio.play('train-whistle', { volume: 0.5 }); return; }
    const others = HALTS.filter((o) => o.id !== h.id && S.halts[o.id]);
    if (!others.length) { this.notice('NOWHERE ELSE YOU HAVE MARKED'); return; }
    this.ui.push({ id: 'halts', title: 'RIDE TO', dim: true, sub: 'ONE STONE, ONE HOUR, AND OLD BAKR.', top: 84, items: [...others.map((o) => ({ label: o.name, action: () => { this.ui.pop(); this.ride(o); } })), { label: 'STAY', action: () => this.ui.pop() }] });
  }
  ride(h) {
    if (this.player.stones < 1) { this.notice('ONE STONE FOR THE RIDE'); return; }
    this.player.stones--;
    const line = LINES[h.line]?.[0]?.[1] ?? '';
    this.audio.play('train-clack');
    this.blackout(line.toUpperCase(), () => { this.world.advanceHours(1); this.player.teleport(h.at[0], h.at[1]); this.train.setAt(h.at[0], h.at[1] + 10); this.audio.voice('bakr', line); this.events.emit('rode', h); }, 3.2);
  }
  repair(v) { repairVehicle(this, v); }
  spawnGunPickup(gun, cond, x, z, tag) {
    const y = this.world.land.heightAt(x, z) + 0.05, b = buildModel('pickup-gun', { catalog: CATALOG }); b.object.position.set(x, y, z); b.object.rotation.y = this.rng.range(0, 6.28); setLookLayer(b.object, 'actors'); this.ctx.scene.add(b.object);
    const w = WEAPONS[gun]; const q = { x, z, y, label: `TAKE THE ${w.name.replaceAll('"', '')}`, object: b.object, tag, use: () => { const cur = this.player.guns[w.slot]; if (cur?.id === gun && !tag) { cur.reserve += 12; this.notice('+12 ROUNDS'); } else this.combat.give(gun, cond, true); if (tag) this.story.collected[tag] = true; this.prompt.removePickup(q); this.audio.play('rack'); this.events.emit('tookGun', gun); } };
    return this.prompt.addPickup(q);
  }
  spawnStonePickup(x, z, tag, stones) {
    const y = this.world.land.heightAt(x, z) + 0.05, b = buildModel('stone-case', { catalog: CATALOG }); b.object.position.set(x, y, z); setLookLayer(b.object, 'actors'); this.ctx.scene.add(b.object);
    const q = { x, z, y: y + 0.3, label: 'TAKE THE CASE', object: b.object, tag, stones, use: () => { const n = Math.round(stones * TUNING.stonesReward); this.player.stones += n; this.story.ledger.stones += n; this.story.collected[tag] = true; this.prompt.removePickup(q); this.audio.play('stone'); this.notice(`+${n} STONES`); } };
    return this.prompt.addPickup(q);
  }
  spawnCharge(x, y, z) { const b = buildModel('charge-world', { catalog: CATALOG }); b.object.position.set(x, y, z); setLookLayer(b.object, 'actors'); this.ctx.scene.add(b.object); const c = { x, y, z, object: b.object }; this.charges.push(c); return c; }
  removeCharge(c) { this.ctx.scene.remove(c.object); const i = this.charges.indexOf(c); if (i >= 0) this.charges.splice(i, 1); }
  spawnSquad(faction, x, z, n, tag) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = this.actors.spawn({ faction, role: i === 0 && n > 2 ? 'mg' : 'rifle', x: x + i * 2.5 - n, z: z + (i % 2) * 3, duty: 'guard', tag }); a.state = 'alert'; a.lastKnown = [this.player.x, this.player.z]; a.suspicion = 1; a.provokedBy = true; out.push(a); }
    return out;
  }
  spawnWave(at, kind) {
    const r = this.rng, a = r.range(0, 6.28), d = 60, x = at[0] + Math.cos(a) * d, z = at[1] + Math.sin(a) * d;
    const faction = kind === 'both' ? (r.next() < 0.5 ? 'concord' : 'harvest') : kind ?? 'concord';
    return this.spawnSquad(faction, x, z, 3, 'wave');
  }
  spawnCrew(v) { if (v.crewOut) return; v.crewOut = true; v.aiRoad = null; const n = v.type === 'cargo-truck' ? 2 : 2; for (let i = 0; i < n; i++) { const [x, z] = v.door(); const a = this.actors.spawn({ faction: v.hostile ?? 'concord', role: 'rifle', x: x + i * 1.5, z: z + i, duty: 'guard', tag: 'crew' }); a.state = 'alert'; a.lastKnown = [this.player.x, this.player.z]; a.provokedBy = false; } }
  setRiding(train, gun = false) {
    const p = this.player;
    if (!train) { if (p.riding) { p.riding = null; p.mounted = false; p.mountGun = null; p.railGun = null; p.ctrl.collider.setEnabled(true); p.ctrl.body.setEnabled?.(true); this.vm.allHidden = false; this.vm.show(p.guns[p.slot]?.id ?? 'cane'); this.mountedTracerFire = false; } return; }
    p.riding = train.cars[1]; p.ctrl.collider.setEnabled(false); p.ctrl.body.setEnabled?.(false);
    if (gun) { p.mounted = true; p.mountGun = { id: 'mg', cond: 100, mag: 999, reserve: 0, jammed: false }; p.railGun = new Vector3(); this.vm.show('mg'); this.mountedTracerFire = true; }
    p.x = train.cars[1].x; p.z = train.cars[1].z;
  }
  skipPressed() { return this.mode === 'play' && this.ctx.input.consumeAny(['Enter', 'PadCross']); }
  autoWaypoint() { if (this.userWaypoint) return; const t = this.missions.target(); this.waypoint = t ?? this.waypoint; if (t === null && !this.missions.active) this.waypoint = null; }
  mapMarginStep() { if (this.side) return this.side.run.title; return this.missions.step?.text ?? (this.missions.available().length ? `${this.missions.available().length} CONTRACTS ON OFFER` : 'NO CONTRACT'); }
  ledgerNow() { const l = this.story.ledger; return { hectares: this.world.fire.hectares(), moved: l.moved, killed: l.killed, friends: l.friends, stones: l.stones }; }
  ledgerLines = ledgerLines;
  isScoped() { const g = this.combat.current(), p = this.player; return !!(p.ads && g && WEAPONS[g.id]?.scope && this.vm.adsK > 0.7); }
  // ----- Dev -----
  dev_startMission(id) {
    const i = MISSION_ORDER.indexOf(id); const m = missionById[id];
    if (this.attract.active) { this.attract.active = false; this.attract.current?.end?.(this); this.attract.cleanse(); this.demoTag = false; this.save.disabled = false; Object.assign(this.cheats, { god: false, infiniteAmmo: false }); }
    this.ui.clear(); this.ctx.engine.timeScale = 1; this.beginCampaignState(); this.mode = 'play';
    const S = this.story, p = this.player;
    for (let k = 0; k < i; k++) S.done[MISSION_ORDER[k]] = true;
    if (i >= 2) { S.feverOn = true; p.tablets = 4; this.body.resetFever(); this.combat.give('tractor', 80, true); S.flags['pump-shed'] = true; }
    if (i > 2) { const b = this.buddies.state; b.ines.met = true; S.flags['ranger-post'] = true; this.world.sites['ranger-post'].cleared = true; }
    if (i > 3) { S.hasFlare = true; this.combat.give('flare', 100, false); this.combat.select('main', true); }
    if (i > 4) { S.hasTracker = true; this.buddies.state.dov.met = true; this.buddies.state.mags.met = true; }
    if (i > 3 && i >= 4) { if (S.done.m3) this.world.burnStrip('A'); }
    if (S.done.m6) this.world.burnStrip('B'); if (S.done.m7) { this.world.burnStrip('C'); S.truceOver = true; S.act = 3; this.world.sites['mile-forty'].truceOver = true; }
    if (S.done.m8) { this.people.startColumn(); S.flags.column = true; }
    const n = m.giver ? this.people.npcs[m.giver] : null;
    if (n) { p.teleport(n.x + 1.6, n.z + 1.4); } else if (id === 'm7') p.teleport(-115, 165); else if (id === 'm9') p.teleport(-120, -480); else if (id === 'end') p.teleport(-120, -500);
    this.people.showFriends();
    this.requestLock();
    this.missions.start(id);
  }
  // ----- Simulation bubble -----
  updateBubble() {
    const p = this.player, w = this.world, T = this.mode === 'round';
    for (const s of Object.values(w.sites)) {
      const def = s.def; if (dist2(def.at[0], def.at[1], p.x, p.z) < 130) this.story.seen[def.id] = true;
      if (!def.soldiers) continue;
      const d = T ? this.net.siteDist(def) : dist2(def.at[0], def.at[1], p.x, p.z);
      this.remanCheck(s);
      if (!s.live && d < 260 && !s.dormant && !s.cleared && this.spawnable(s)) this.goLive(s);
      else if (s.live && (d > 300 || s.dormant)) this.goDormant(s);
    }
  }
  spawnable(s) { if (this.mode === 'attract') return true; if (this.mode === 'round') return this.net.siteLive(s.def); if (this.mode !== 'play') return false; if (s.id === 'observatory' && !this.story.done.m8) return false; if (s.id === 'the-cut' && this.story.done.m7) return false; return true; }
  goLive(s) {
    s.live = true; const def = s.def;
    for (const [role, dx, dz, duty] of def.soldiers) {
      const a = this.actors.spawn({ faction: def.faction ?? 'concord', role, x: def.at[0] + dx, z: def.at[1] + dz, duty, site: s.id, y: duty === 'tower' ? 5.1 : 0 });
      s.actors.push(a);
    }
    for (const [type, dx, dz, yaw] of def.vehicles ?? []) if (!s.parked?.length) { const v = this.vehicles.spawn(type, def.at[0] + dx, def.at[1] + dz, (yaw * Math.PI) / 180, 'parked'); (s.parked ??= []).push(v); }
  }
  goDormant(s) { s.live = false; for (const a of s.actors) this.actors.remove(a); s.actors = []; if (s.parked) { for (const v of s.parked) if (!v.seated && this.vehicles.list.includes(v)) this.vehicles.remove(v); s.parked = []; } }
  /** Patrols: a technical on a road when you've been out here long enough. */
  patrols() {
    if (this.mode !== 'play' || !this.story.done.m1 || this.missions.step?.script === 'm4Convoy') return;
    const p = this.player, list = this.vehicles.list;
    for (const v of [...list]) if (v.tag === 'patrol') { const d = dist2(v.x, v.z, p.x, p.z); if (d > 400) { this.vehicles.remove(v); continue; } if (d < 25 && !v.crewOut && !v.dead) this.spawnCrew(v); }
    this.patrolT = (this.patrolT ?? 40) - 1;
    if (this.patrolT > 0 || list.some((v) => v.tag === 'patrol')) return; this.patrolT = 60;
    const roads = Object.values(ROADS), road = this.rng.pick(roads), L = polyLength(road), q = {};
    for (let s = 0; s < L; s += 20) { polyPoint(road, s, q); const d = dist2(q.x, q.z, p.x, p.z); if (d > 170 && d < 320 && !dist2(q.x, q.z, 0, 40) < 120) { const v = this.vehicles.spawn('technical', q.x, q.z, q.yaw, 'patrol'); v.aiRoad = road; v.aiS = s; v.aiSpeed = 9; v.hostile = this.rng.next() < 0.5 ? 'concord' : 'harvest'; v.onRoadEnd = () => { v.aiRoad = null; v.tag = 'patrol'; }; break; } }
  }
  gunners(dt) {
    for (const v of this.vehicles.list) {
      if (!v.hostile || v.dead || v.stalled || v.type !== 'technical' || !v.aiRoad) continue;
      v.gunT = (v.gunT ?? 2) - dt; if (v.gunT > 0) continue; v.gunT = 0.14;
      const a = v.fake ??= { kind: 'soldier', role: 'mg', faction: v.hostile, spec: { range: 110, damage: 9 }, ctrl: null, friendly: false };
      a.x = v.x; a.y = v.y + 0.6; a.z = v.z; a.site = null;
      const p = this.player, d = dist2(v.x, v.z, p.x, p.z);
      if (d > 90 || !this.isHostileToPlayer(a) || !(Math.sin(this.world.time * 1.3) > -0.1)) { v.gunT = 0.4; continue; }
      this.combat.npcShot(a, p);
      if (v.gunNode) v.gunNode.rotation.y = Math.atan2(p.x - v.x, p.z - v.z) - v.yaw;
    }
  }
  // ----- Hooks -----
  fixedUpdate(ctx, dt) {
    if (!this.ready_) return;
    const mode = this.mode, p = this.player, w = this.world;
    this.events.emit('fixed', dt);
    this.scenes.update(dt);
    if (this.net && !this.net.simulating()) { this.net.fixed(dt); return; }
    if (this.mode === 'attract') { this.bot.apply(); }
    p.hidden = this.cheats.invisible; p.lit = p.litT > 0 || w.fire.isBurning(p.x, p.z) || !!(w.nearestFire && w.nearestFire.d < 30);
    w.fixed(dt);
    if (mode === 'title' && (this.titleFireT -= dt) <= 0) { this.titleFireT = 5; if (w.fire.burning.length < 8) { const f = siteById['long-field'].at; if (w.fire.burntCount > 900) w.fire.regrowAll(); const r = w.look; w.fire.ignite(f[0] + r.range(-80, 60), f[1] + r.range(-50, 50), 8); } return; }
    if (mode === 'title') return;
    if (w.stepCount % 60 === 0) { this.updateBubble(); this.patrols(); }
    if (p.riding) { const c = p.riding; p.x = c.x; p.z = c.z; p.y = c.y + 1.3; if (p.railGun) { p.railGun.set(c.x, c.y + 3, c.z); } p.speed2 = 0; }
    p.fixed(dt); this.combat.fixed(dt); this.prompt.fixed(dt); this.actors.fixed(dt); this.buddies.fixed(dt); this.vehicles.fixed(dt); this.gunners(dt); this.train.fixed(dt); this.projectiles.fixed(dt); this.body.fixed(dt); this.people.fixed(dt);
    if (this.side) { this.side.t -= dt; if (this.side.t <= 0) { this.prompt.missionUse = this.prompt.missionUse.filter((o) => o !== this.side.use); this.side = null; this.story.mercy = (this.story.mercy ?? 0) + 0; this.talk.clear(); this.userWaypoint = false; this.events.emit('mercyFailed'); } }
    this.missions.fixed(dt);
    this.attract.fixed(dt);
    if (this.net) this.net.fixed(dt);
    if (this.mode === 'attract') this.bot.after();
    if (p.mapUp && this.ctx.input.consumeAny(CODES.mark.filter((c) => c !== 'MouseLeft'))) this.markMap();
    if (p.mapUp && this.ctx.input.consumeAny(['MouseLeft'])) this.markMap();
    if (p.mapUp && pressedFixed(this.ctx.input, 'zoom')) { this.mapTex.zoom = !this.mapTex.zoom; this.audio.play('map-paper', { volume: 0.5 }); }
    if (this.autoWp()) this.autoWaypoint();
    void held;
  }
  autoWp() { return this.world.stepCount % 30 === 0 && !this.userWaypoint; }
  markMap() { this.waypoint = this.mapTex.markTarget(); this.userWaypoint = true; this.audio.play('click'); this.events.emit('waypoint', this.waypoint); }
  /** Real input of any kind: a key, a button, a stick, real mouse movement, a tap. */
  anyInput() {
    const input = this.ctx.input;
    if (this.realInput) { this.realInput = false; return true; }
    for (const c of ALL_CODES) if (input.wasPressed(c) && !this.bot.codes.has(c)) return true;
    if (input.wasPressed('Escape', 'Enter', 'Space', 'KeyP', 'KeyX')) return true;
    if (input.buttonEvents.length) return true;
    if (this.padStickTilt > 0.35) return true;
    if (this.mouseMoved) return true;
    return false;
  }
  anyMenuPress() { const input = this.ctx.input; if (input.wasPressed(...ALL_CODES)) return true; return input.buttonEvents.some((e) => !e.down); }
  updateDevice() {
    const input = this.ctx.input;
    const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
    let tilt = 0, l2 = 0, r2 = 0, pad = null;
    if (pads) for (const q of pads) if (q && q.connected !== false && q.axes) { pad = q; tilt = Math.max(Math.hypot(q.axes[0] ?? 0, q.axes[1] ?? 0), Math.hypot(q.axes[2] ?? 0, q.axes[3] ?? 0)); l2 = q.buttons?.[6]?.value ?? 0; r2 = q.buttons?.[7]?.value ?? 0; this.lookTilt = Math.hypot(q.axes[2] ?? 0, q.axes[3] ?? 0); break; }
    this.padStickTilt = tilt;
    if (pad && (Math.abs(l2 - this.analog[0]) > 0.02 || Math.abs(r2 - this.analog[1]) > 0.02)) input.send({ tr: [l2, r2] });
    const p = input.pointer, moved = (this.lastPX !== undefined && (Math.abs(p.x - this.lastPX) > 0.0005 || Math.abs(p.y - this.lastPY) > 0.0005));
    this.lastPX = p.x; this.lastPY = p.y;
    this.mouseMoved = moved;
    const padPress = input.wasPressed('PadCross', 'PadCircle', 'PadSquare', 'PadTriangle', 'PadL1', 'PadR1', 'PadL2', 'PadR2', 'PadL3', 'PadR3', 'PadUp', 'PadDown', 'PadLeft', 'PadRight', 'PadOptions', 'PadCreate');
    if (padPress || tilt > 0.35) this.device = 'pad';
    else if (moved || input.buttonEvents.length || ALL_CODES.some((c) => !c.startsWith('Pad') && !this.bot.codes.has(c) && input.wasPressed(c)) || (Math.hypot(input.mouseDelta.x, input.mouseDelta.y) > 0 && tilt < 0.1 && input.pointerLocked)) this.device = 'kbm';
    if (this.gateCleared !== true && (padPress || ALL_CODES.some((c) => !c.startsWith('Pad') && !c.startsWith('Mouse') && input.wasPressed(c)))) { const wasGate = this.ui.top?.id === 'touch-gate'; this.gateCleared = true; if (wasGate) { this.ui.replace(pressScreen(this)); } }
    else if (this.ui.top?.id === 'touch-gate' && this.padConnected()) { this.gateCleared = true; this.ui.replace(pressScreen(this)); }
  }
  update(ctx, dt) {
    if (!this.ready_) return;
    const realDt = dt > 0 ? dt : 1 / 60, input = ctx.input, p = this.player;
    this.realDt = realDt;
    for (const c of input.commands) { if (c?.load) this.save.apply(c.load); if (c?.tr) { this.analog[0] = c.tr[0]; this.analog[1] = c.tr[1]; } }
    this.updateDevice();
    if (this.net) { this.net.update(dt, realDt); }
    // Attract: ten seconds without input on the title or main menu, and any input leaves it.
    if (this.mode === 'attract') { if (this.anyInput()) { this.attract.stop(); } }
    else if (this.mode === 'title') {
      const id = this.ui.top?.id;
      if (id === 'press' || id === 'main' || id === 'touch-gate') { if (this.anyInput()) this.idle = 0; else this.idle += realDt; if (this.idle >= 10 + 1 / 120) { this.idle = 0; this.attract.start(); } } else this.idle = 0;
    }
    const hadMenu = !!this.ui.top;
    this.ui.update();
    this.talk.update(dt, realDt);
    if ((this.mode === 'play' || this.mode === 'round') && !hadMenu) this.playInput();
    this.presentation(dt, realDt);
    this.drawHud(dt, realDt);
    void angleDiff; void POSTS; void MISSIONS;
  }
  playInput() {
    const input = this.ctx.input, p = this.player;
    if (this.ui.top) return;
    if (this.pressed('pause') && !input.isDown('PadCreate')) { if (this.ledgerUp) this.ledgerUp = false; else this.pause(); return; }
    if (this.talk.scene || this.scenes.locks) return;
    if (this.net) { if (this.pressed('map')) p.mapUp = !p.mapUp; if (this.pressed('tracker')) this.tracker.setUp(!this.tracker.up); return; }
    if (this.pressed('ledger')) { this.ledgerUp = !this.ledgerUp; this.audio.play('map-paper'); }
    if (this.pressed('map') && p.items.map !== false) { p.mapUp = !p.mapUp; this.audio.play('map-paper'); if (p.mapUp) { this.mapClock = 0; this.mapTex.draw(); this.tracker.setUp(false); if (this.cam.override && this.vehicles.chase) { this.vehicles.chase = false; this.cam.override = null; } } }
    if (this.pressed('tracker') && this.story.hasTracker && !p.vehicle) this.tracker.setUp(!this.tracker.up);
    const mono = held(input, 'monocular') && !p.vehicle && !p.mapUp;
    if (mono !== this.monocularUp) { this.monocularUp = mono; if (mono) this.vm.playTool('Monocular', ['tool-monocular'], { hideGun: true }); else if (this.vm.toolName === 'Monocular') this.vm.endTool(); }
    if (input.wheel && !p.mapUp && !p.vehicle) this.combat.nextWeapon(Math.sign(input.wheel));
    if (input.wheel && p.mapUp) { this.mapTex.zoom = input.wheel < 0; this.mapClock = 0; }
    if (p.mapUp && !this.mouseMoved && this.device === 'kbm') { /* cursor stays */ }
  }
  presentation(dt, realDt) {
    const ctx = this.ctx, p = this.player, cam = this.cam, input = ctx.input;
    // Look.
    const padLook = this.device === 'pad';
    let sens = padLook ? this.settings.padSens * Math.pow(clamp(this.lookTilt ?? 1, 0.01, 1), 0.6) : this.settings.mouseSens;
    const fovNow = ctx.camera.camera.fov; sens *= clamp(fovNow / 62, 0.2, 1);
    if (padLook && this.settings.aimAssist) sens *= this.aimAssist() ? 0.65 : 1;
    cam.sensX = cam.sensY = sens; cam.invertY = this.settings.invertY;
    const looking = !this.ui.top && !this.talk.scene && !this.scenes.locks && !p.mapUp && !p.surgery && !p.downT;
    cam.enabled = looking;
    if (p.mapUp && !this.ui.top) { const k = padLook ? 0.25 : 0.32; this.mapTex.moveCursor(input.mouseDelta.x * k * (padLook ? 0.2 : 1), input.mouseDelta.y * k * (padLook ? 0.2 : 1)); }
    // Recoil settles; fever pulls.
    cam.kickPitch *= Math.pow(0.0015, realDt * (dt > 0 ? 1 : 0)) ;
    const f = this.settings.feverReduced ? this.body.fever * 0.4 : this.body.fever;
    const t = this.world.time;
    cam.kickYaw = Math.sin(t * 0.7) * 0.05 * f; cam.roll = Math.sin(t * 0.5) * 0.06 * f + (p.vehicle ? -((p.vehicle.v.steering ?? 0) * 0.015) : 0);
    // Field of view.
    const g = this.combat.current(), w = g ? WEAPONS[g.id] : null;
    const goalFov = this.monocularUp ? 18 : p.ads && w ? (w.adsFov ?? 45 * (this.settings.fov / 62)) : this.settings.fov;
    const c = ctx.camera.camera, nf = lerp(c.fov, goalFov, clamp(realDt * 14, 0, 1));
    if (Math.abs(nf - c.fov) > 0.01) { c.fov = nf; c.updateProjectionMatrix(); }
    c.getWorldPosition(v3); this.camX = v3.x; this.camZ = v3.z;
    // Hands.
    const speed = p.vehicle ? 0 : p.speed2;
    const v = p.vehicle;
    let arrowYaw = 0;
    if (v && this.waypoint) arrowYaw = Math.atan2(this.waypoint[0] - v.x, this.waypoint[1] - v.z) - v.yaw;
    this.vm.update(dt, { speed, ads: p.ads, lowered: this.gunSlung() && !p.mounted && !p.mapUp && !v, fever: f, landDip: p.landDip, crouchDip: p.crouchDip, scoped: this.isScoped(), hidden: this.mode === 'title' || !!cam.override && !p.mapUp && !p.surgery || (this.mode === 'attract' && !!cam.override), hideGun: !!v && !p.mounted || this.monocularUp || p.mapUp || !!p.surgery, mapUp: p.mapUp, dash: !!v && !p.mounted && !this.vehicles.chase, wheel: v?.v.steering ?? 0, arrowYaw });
    for (const veh of this.vehicles.list) veh.object.visible = !(veh === v && !p.mounted && !this.vehicles.chase);
    this.world.update(dt, v3);
    this.actors.update(dt); this.people.update(dt); this.vehicles.update(dt); this.projectiles.update(dt); this.tracers.update(dt); this.tracker.update(dt); this.body.update(dt);
    this.audio.update(dt > 0 ? dt : 0);
    const torch = p.mapUp && this.world.isNight() && this.mode !== 'title'; if (torch && !this.mapTorch) this.mapTorch = this.ctx.lights.request({ follow: this.ctx.camera.camera, color: 0xffe6c0, intensity: 3, radius: 5, priority: 6 }); else if (!torch && this.mapTorch) { this.mapTorch.release(); this.mapTorch = null; } // A small hand torch, so the paper reads at night.
    if (p.mapUp) { this.mapClock = (this.mapClock ?? 0) - realDt; if (this.mapClock <= 0) { this.mapClock = 0.5; this.mapTex.draw(); } }
    // Picture: fever, low health and flames grade the look.
    this.lookClock = (this.lookClock ?? 0) - realDt;
    if (this.lookClock <= 0) { this.lookClock = 1 / 15; this.gradeLook(f); }
    // A smoke column you can see across the map, for a game day.
    const sm = this.story.smoke; if (sm && this.world.totalHours < sm.until) { this.smokeT = (this.smokeT ?? 0) - realDt; if (this.smokeT <= 0) { this.smokeT = 0.25; ctx.particles.burst('fire-smoke', [sm.at[0], this.world.land.heightAt(sm.at[0], sm.at[1]) + 8, sm.at[1]], { count: 3, direction: [this.world.wind.x * 0.4, 1, this.world.wind.z * 0.4] }); } }
    // Music by state, with a dwell.
    this.musicClock = (this.musicClock ?? 0) - realDt;
    if (this.musicClock <= 0) { this.musicClock = 1; this.chooseMusic(); }
    this.wantLock = (this.mode === 'play' || this.mode === 'round') && !this.ui.top && !this.talk.scene?.choosing;
  }
  aimAssist() { const p = this.player, yaw = this.ctx.camera.yaw, pitch = this.ctx.camera.pitch, e = p.eyeNow(); for (const a of this.actors.list) { if (!a.alive || a.friendly) continue; const dx = a.x - e.x, dz = a.z - e.z, d = Math.hypot(dx, dz); if (d > 150) continue; const ay = Math.atan2(-dx, -dz), ap = Math.atan2(a.y + 1.1 - e.y, d); if (Math.abs(angleDiff(ay, yaw)) < 0.07 && Math.abs(ap - pitch) < 0.07) { if (p.ads) { this.ctx.camera.yaw += angleDiff(ay, yaw) * 0.03; } return true; } } return false; }
  gradeLook(f) {
    const hp = this.player.hp, low = this.mode === 'play' && hp < 40 ? (40 - hp) / 40 : 0, fire = this.player.burning > 0 ? 1 : this.world.nearestFire && this.world.nearestFire.d < 25 ? 0.5 : 0, s = LOOK.scene;
    const spread = f * 4 * (this.settings.reduceFlashes ? 0.5 : 1);
    const sat = clamp(1.05 - f * 0.45 - low * 0.8, 0.1, 1.2), warm = 0.04 + f * 0.1 + fire * 0.08;
    const vig = 0.28 + low * 0.45 + f * 0.25;
    if (Math.abs(s[1].params.spread - spread) + Math.abs(s[0].params.saturation - sat) + Math.abs(s[0].params.warmth - warm) + Math.abs(s[2].params.intensity - vig) < 0.01) return;
    s[1].params.spread = spread; s[0].params.saturation = sat; s[0].params.warmth = warm; s[2].params.intensity = vig;
    this.ctx.engine.setLook(LOOK);
  }
  chooseMusic() {
    if (this.audio.dead) return; const mode = this.mode;
    if (mode === 'title') return this.audio.setMusic('title');
    if (this.story.finished) return this.audio.setMusic('end');
    if (this.body.feverActive) return this.audio.setMusic('fever');
    const alert = this.actors.list.some((a) => a.alive && a.state === 'alert' && Math.hypot(a.x - this.player.x, a.z - this.player.z) < 100);
    const sus = this.actors.list.some((a) => a.alive && (a.state === 'suspicious' || a.state === 'searching') && Math.hypot(a.x - this.player.x, a.z - this.player.z) < 80);
    if (alert || (this.world.nearestFire && this.world.nearestFire.d < 60)) return this.audio.setMusic('fight');
    if (sus) return this.audio.setMusic('stalk');
    return this.audio.setMusic(this.world.isNight() ? 'night' : 'day');
  }
  drawHud(dt, realDt) {
    const h = this.ctx.hud; h.clear(); this.hud.prompts = [];
    if (this.mode === 'attract' || this.mode === 'play' || this.mode === 'round') {
      if (!this.talk.scene && !this.scenes.locks && (!this.ui.top || this.mode === 'round' && this.ui.top.cover !== 'ink')) { if (this.mode === 'round') this.net.drawHud(realDt); else this.hud.drawPlay(realDt); }
      else if (this.talk.scene) { this.hud.drawScene(); this.hud.effects(realDt); }
      else if (this.scenes.locks && !this.ui.top) { this.hud.effects(realDt); }
      if (this.scenes.active && !this.ui.top) this.hud.drawTimeline();
    }
    if (this.titleBanner) { this.drawTitle(); }
    this.ui.draw();
    this.hud.drawBlackout(realDt);
    if (this.dev.open === false && (this.dev.counts || this.dev.coords || this.dev.statusLine || this.dev.aiText || this.dev.fireOverlay || this.dev.navOverlay) && this.mode === 'play' && !this.ui.top) this.dev.drawOverlays();
  }
  cameraTarget() { return this.eyePosition(); }
  eyePosition() {
    const p = this.player, out = this._eye ??= new Vector3();
    if (p.vehicle || p.mounted) return out.copy(p.eyeNow());
    if (p.riding) return out.set(p.x, p.y + 1.55, p.z);
    if (this.ctx.camera?.preset === 'first' && p.ctrl && !this.cheats.noclip) { const f = p.ctrl.interpolatedFeet(this.ctx.physics.alpha); return out.set(f.x, f.y + (p.crouched ? 0.95 : 1.55), f.z); }
    return out.set(p.x, p.y + 1.55, p.z);
  }
  onCameraChange(ctx) { installLook(ctx, this.cam); if (ctx.camera.preset === 'first') { ctx.scene.add(ctx.camera.camera); ctx.camera.camera.add(this.vm.group); } }
  status() { const p = this.player, m = this.missions; return `${this.mode} ${m.active ? `${m.active.id}/${m.stepI}` : '-'} hp${Math.round(p.hp)} stones${p.stones} fire${this.world.fire.burning.length}/${this.world.fire.burntCount}`; }
  fingerprint() { const p = this.player, list = this.actors.list; let h = 0; for (const a of list) h = (h * 31 + Math.round(a.x * 10) + Math.round(a.z * 10)) >>> 0; const g = this.combat.current(); return `${p.hp.toFixed(3)}|${p.stones}|${g?.id}|${g?.cond?.toFixed(3)}|${g?.mag}|${g?.jammed}|${this.world.fire.burning.length}|${this.world.fire.burntCount}|${h}`; }
  /** One plain JSON snapshot for every test. */
  dispose() {}
}
export const createGame = (options) => new FarDrySeason(options);
mixin(FarDrySeason, StatePart);
