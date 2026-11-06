// Far Pry 2: the Game object. Systems are plain objects with setup/fixed/frame/state; this file wires them.
import { PALETTE, THREE } from '../pixel-engine.js';
import { GAME_TITLE } from './content/title.js';
import { TUNING } from './core/tuning.js';
import { installLook } from './core/look.js';
import { Events } from './core/events.js';
import { PAD_MAP } from './core/actions.js';
import { WorldSystem } from './world/world.js';
import { PlayerSystem } from './actors/player.js';
import { CombatSystem } from './combat/combat.js';
import { ProjectileSystem } from './combat/projectiles.js';
import { WeaponSystem } from './combat/weapons.js';
import { FireSystem } from './world/firesystem.js';
import { SoldierSystem } from './actors/soldier.js';
import { BodySystem } from './body/body.js';
import { SitesSystem } from './world/sitesbuild.js';
import { GrassSystem } from './world/grass.js';
import { HudSystem } from './ui/hud.js';
import { UseSystem } from './ui/use.js';
import { UISystem } from './ui/ui.js';
import { buildScreens } from './ui/screens.js';
import { FlowSystem } from './flow.js';
import { AudioSystem } from './audio/audio.js';
import { VehicleSystem } from './vehicles/vehicles.js';
import { MapSystem } from './world/mapview.js';
import { MissionSystem } from './missions/runner.js';
import { DialogueSystem } from './ui/dialogue.js';
import { NpcSystem } from './actors/npcs.js';
import { BuddySystem } from './actors/buddies.js';
import { TrainSystem } from './vehicles/train.js';
import { WeatherSystem } from './world/weather.js';
import { FaunaSystem } from './actors/fauna.js';
import { DevSystem, devScreen } from './dev/devmode.js';
import { AttractSystem } from './attract/director.js';
import { RoundSystem } from './net/round.js';
import { loadSettings, applySettings } from './core/settings.js';
import { freshStory } from './core/story.js';
import { Lifecycle } from './net/lifecycle.js';

export const LOOK = {
  scene: [{ id: 'adjust', params: { brightness: 0, contrast: 1.06, saturation: 1.05, warmth: 0.04 } }, { id: 'chromatic', params: { spread: 0 } }, { id: 'vignette', params: { intensity: 0.28, softness: 0.7, amount: 1 } }],
  actors: { pixel: { size: 1, outline: 0.45, crease: 0.08 }, filters: [] },
  environment: { pixel: { size: 1, outline: 0.32, crease: 0.05 }, filters: [] },
};

class FarPry {
  name = GAME_TITLE;
  assets = [];
  constructor(options = {}) {
    this.options = options;
    this.session = options.session || null;
    this.mode = this.session ? 'round' : 'title';
    this.screen = null; this.device = 'kbm'; this.glyphSet = 'ps'; this.notice = '';
    this.camState = { override: null, enabled: true, sensPad: 1, sensMouse: 1, invertY: false, device: 'kbm', slow: 1, punch: 0, roll: 0 };
    this.events = new Events(); this.story = freshStory(); this.visitedHalts = new Set(['mile-forty']); this.trigRead = new Set();
    this.look = JSON.parse(JSON.stringify(LOOK));
    this.world = new WorldSystem(); this.player = new PlayerSystem(); this.combat = new CombatSystem(); this.projectiles = new ProjectileSystem();
    this.weapons = new WeaponSystem(); this.fireSys = new FireSystem(); this.soldierSys = new SoldierSystem(); this.body = new BodySystem(); this.sitesSys = new SitesSystem(); this.grassSys = new GrassSystem(); this.useSys = new UseSystem(); this.flow = new FlowSystem(); this.hudSys = new HudSystem(); this.uiSys = new UISystem(); this.audioSys = new AudioSystem(); this.vehSys = new VehicleSystem(); this.mapSys = new MapSystem(); this.missionSys = new MissionSystem(); this.dialogueSys = new DialogueSystem(); this.npcSys = new NpcSystem(); this.buddySys = new BuddySystem(); this.trainSys = new TrainSystem(); this.weatherSys = new WeatherSystem(); this.faunaSys = new FaunaSystem(); this.devSys = new DevSystem(); this.attractSys = new AttractSystem();
    this.systems = [this.audioSys, this.world, this.player, this.combat, this.projectiles, this.weapons, this.fireSys, this.soldierSys, this.body, this.sitesSys, this.grassSys, this.vehSys, this.mapSys, this.trainSys, this.weatherSys, this.faunaSys, this.npcSys, this.buddySys, this.dialogueSys, this.missionSys, this.devSys, this.attractSys, this.flow, this.useSys, this.hudSys, this.uiSys];
    if (this.session) { this.life = new Lifecycle(this.session); this.systems.push(this.life); this.round = new RoundSystem(this.session); this.systems.push(this.round); }
    this.systems = this.systems.filter((x) => x !== this.uiSys).concat([this.uiSys]);
    this.eyeV = new THREE.Vector3(); this.step = 0;
    this.subtitle = null; this.mapUp = false; this.surgeryActive = false; this.godMode = false; this.useTarget = null; this.noFever = false; this.drops = null;
    this.settings = this.session ? { ...loadSettings(), music: 0.1 } : loadSettings();
    this.sfx = () => {}; this.say = (text, who, secs = 2) => { this.subtitle = { text, who, until: (this.ctx?.time ?? 0) + secs }; };
    this.rumble = () => {};
  }
  async setup(ctx) {
    this.ctx = ctx;
    installLook(ctx, this.camState);
    ctx.input.gamepadButtons = { ...PAD_MAP };
    for (const k of ['Tab', 'Space', 'KeyM']) ctx.input.preventKeys.add(k);
    this.fire = null;
    for (const s of this.systems) s.setup?.(this);
    // fire belongs to g.fire (FireSystem sets it); keep the system reachable
    this.playerTarget = this.makePlayerTarget();
    this.screens = buildScreens(this); this.screens.dev = () => devScreen(this);
    this.touchOnly = this.detectTouch();
    applySettings(this);
    if (this.touchOnly) this.notice = 'Controller or keyboard required';
    if (!this.session) this.flow.startTitle(); else { this.hudHidden = false; }
  }
  detectTouch() {
    try { if (typeof window === 'undefined' || !window.matchMedia) return false; return window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches && !(navigator.getGamepads && [...navigator.getGamepads()].some(Boolean)); } catch { return false; }
  }
  makePlayerTarget() {
    const g = this, p = this.player;
    return { kind: 'player', get pos() { return p.ctrl.feet; }, get collider() { return p.ctrl.collider; }, get crouched() { return p.crouched; }, get speedNow() { return Math.sqrt(p.speed2 || 0); },
      takeHit(d, type, from) { g.hurt(d, type, from); g.events.emit('shotAt', from); } };
  }
  // ---- shared helpers ----
  gameHours() { return (this.world.day - 1) * 24 + this.world.hour; }
  hour8() { return Math.floor(this.world.hour / 3); }
  isNight() { const h = this.world.hour; return h >= 20.5 || h < 5.5; }
  canMove() { return this.mode === 'play' || this.mode === 'round'; }
  canBeTargeted() { return (this.mode === 'play' || this.mode === 'round') && this.body.hp > 0; }
  noFire() { return false; }
  stanceMult(t) {
    let m = 1; if (t.crouched) { m = 0.55; if (this.world.kindAt(t.pos.x, t.pos.z) === 0) m = 0.6 * 0.55 / 0.55; } return m;
  }
  lightMult(t) {
    if (!this.isNight()) return 1;
    let m = 0.45; const lit = this.ctx.time < (this.flashUntil || 0) || (this.fire && this.fire.stateAt(t.pos.x, t.pos.z) === 1);
    if (lit) m *= 2; return m;
  }
  passFor() { return false; }
  hostileNote() {}
  itemView(key, dur, clip) {
    const w = this.weapons; this.itemShown = false; this.itemPrev = this.itemPrev || w.current()?.vm;
    w.views.show(key); w.views.play(clip || key, dur, null);
    this.itemT = dur + 0.05;
  }
  itemHide() { const w = this.weapons; this.itemT = 0; const c = w.current(); w.views.anim = null; if (c) { w.views.show(c.vm); w.refreshLook(); } this.itemPrev = null; }
  eyePosition() { return this.player.ctrl ? this.player.eyePos(this.eyeV) : this.eyeV.set(0, 60, 0); }
  cameraTarget() { return this.eyePosition(); }
  onCameraChange(ctx) { installLook(ctx, this.camState); }
  fixedUpdate(ctx, dt) { this.step++; for (const s of this.systems) s.fixed?.(this, dt); }
  update(ctx, dt) {
    for (const s of this.systems) s.frame?.(this, dt);
    if (this.itemT > 0) { this.itemT -= dt; if (this.itemT <= 0 && !this.body.heal) this.itemHide(); }
    if (this.subtitle && ctx.time > this.subtitle.until) this.subtitle = null;
    this.extraUse.length = 0; for (const e of this.vehSys.extra(this)) this.extraUse.push(e); for (const e of this.buddySys.extra(this)) this.extraUse.push(e);
  }
  dispose() { for (const s of this.systems) s.dispose?.(this); }
  ready() {
    if (typeof window !== 'undefined') window.__GAME__ = this;
    if (this.session && !this.session.server) this.session.ready();
  }
  state() {
    const s = { mode: this.mode, screen: this.screen, device: this.device, glyphSet: this.glyphSet, notice: this.notice, step: this.step, prompts: [], subtitle: this.subtitle ? this.subtitle.text : null };
    for (const sys of this.systems) Object.assign(s, sys.state?.(this) || {});
    return s;
  }
  status() { const p = this.player.ctrl?.feet; return `${this.mode} h${this.world.hour.toFixed(1)} hp${Math.round(this.body.hp)} ${p ? `[${p.x.toFixed(0)},${p.z.toFixed(0)}]` : ''} fire${this.fireSys.grid ? this.fireSys.grid.burning.length : 0}`; }
  fingerprint() { const f = this.player.ctrl?.feet; const sol = this.soldierSys.list.map((s) => `${s.pos.x.toFixed(1)},${s.pos.z.toFixed(1)},${Math.round(s.hp)}`).join(';'); return f ? `${f.x.toFixed(2)},${f.z.toFixed(2)},${Math.round(this.body.hp)},${this.weapons.state().weapon?.cond},${this.fireSys.grid.counts().burnt},${sol}` : ''; }
}
export const createGame = (options) => new FarPry(options);
export { TUNING };
