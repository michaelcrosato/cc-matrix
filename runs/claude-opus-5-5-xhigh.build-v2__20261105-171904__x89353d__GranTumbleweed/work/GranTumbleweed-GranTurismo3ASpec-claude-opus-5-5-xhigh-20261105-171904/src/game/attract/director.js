// Attract mode: after 10 s of no input on the title or the Map, the game plays itself. Any input returns to where the player was.
import { RaceScene } from '../scenes/race.js';
import { MenuScene } from '../scenes/menu.js';
import { THREE } from '../../pixel-engine.js';
import { TITLE } from '../data/meta.js';
import { TESTS } from '../data/licences.js';
import { testSetup } from '../sim/licence.js';
import { defaultEnv, trackPoint } from '../sim/race.js';
import { CAR_INFO } from '../data/cars.js';
import { EVENTS } from '../data/events.js';
import { fullInstall } from '../sim/tuning.js';
import { DynoScreen } from '../ui/screens/tuning.js';
import { PodiumScreen, PrizeScreen } from '../ui/screens/cinema.js';
import { medalIcon } from '../ui/screens/common.js';
void THREE;
export const CLIPS = [
  { id: 'title', seconds: 3, kind: 'menu' },
  { id: 'showroom', seconds: 10, kind: 'menu' },
  { id: 'tuning', seconds: 8, kind: 'menu' },
  { id: 'licence', seconds: 10, kind: 'race' },
  { id: 'kestrel', seconds: 20, kind: 'race' },
  { id: 'redclay', seconds: 12, kind: 'race' },
  { id: 'harbour', seconds: 20, kind: 'race' },
  { id: 'saltline', seconds: 10, kind: 'race' },
  { id: 'podium', seconds: 8, kind: 'menu' },
  { id: 'credits', seconds: 4, kind: 'menu' },
];
const AI_FIELD = (ids, base = 0.95, extra = {}) => ids.map((id, i) => ({ carId: id, name: `DEMO ${i + 1}`, skill: base + i * 0.006, ...extra }));
export class Attract {
  constructor(app) { this.app = app; this.active = false; this.i = 0; this.t = 0; this.returnTo = null; this.starting = false; }
  // Called every frame by the App.
  tick(ctx, dt) {
    const app = this.app, a = app.actions;
    if (app.session) return;
    if (!this.active) {
      const top = app.ui.top?.id; // only on the title or the Map themselves, never on a screen opened over them
      if (app.idleWatch && (top === 'title' || top === 'map') && a.idle > 10 && !app.switching && !this.starting) this.start();
      return;
    }
    if (this.grace > 0) { this.grace -= dt; a.domInput = false; }
    else if (a.anyInput || a.domInput) { a.domInput = false; this.stop(); return; }
    if (app.switching) return;
    this.t += dt;
    this.clip?.update?.(dt);
    if (this.t >= CLIPS[this.i].seconds) { this.i = (this.i + 1) % CLIPS.length; this.play(); }
  }
  start() {
    const app = this.app; if (this.active || app.session) return;
    this.returnTo = app.ui.stack.some((s) => s.id === 'map') ? 'map' : 'title';
    this.active = true; this.i = 0; this.grace = 0.1; app.idleWatch = false; app.ui.subtitle = null; app.ui.clear();
    this.savedEnv = { ...app.env };
    this.play();
  }
  stop() {
    const app = this.app; this.active = false; this.clip = null; Object.assign(app.env, this.savedEnv ?? {}); app.actions.idle = 0; app.ui.clear();
    app.mix.stopVoice();
    const back = this.returnTo === 'map' ? (ui) => ui.push(new app.Screens.MapScreen(app)) : null;
    app.go(() => new MenuScene(app, { start: back }), 'fade');
  }
  menuClip(setupFn) { return this.app.go(() => new MenuScene(this.app, { start: (ui, scene) => { const s = new AttractScreen(this.app, this); ui.push(s); setupFn?.(ui, scene, s); } }), 'blinds'); }
  raceClip(setup, opts = {}) { const app = this.app; app.ui.clear(); return app.go(() => new RaceScene(app, { ...setup, env: { ...defaultEnv(), god: true } }, { attract: true, ...opts, onFrame: (scene, ctx, dt) => { this.overlay(ctx, dt); opts.onFrame?.(scene, ctx, dt); } }), 'blinds'); }
  overlay(ctx) { const ui = this.app.ui; ui.hud = ctx.hud; const w = ctx.hud.width; ui.w = w; ui.h = ctx.hud.height; ui.cx = w / 2; ui.panel(w / 2 - 22, 3, 44, 11, { color: 'ink', border: 'red' }); ui.text(w / 2, 5, 'DEMO', { align: 'center', color: Math.floor(ui.time * 2) % 2 ? 'red' : 'white' }); if (this.caption) ui.text(w / 2, ctx.hud.height - 20, this.caption, { align: 'center', color: 'sand' }); }
  play() {
    const app = this.app, clip = CLIPS[this.i]; this.t = 0; this.clip = null; this.caption = null;
    this.seen = this.seen ?? new Set(); this.seen.add(clip.id);
    const P = this[`play_${clip.id}`]; P.call(this);
    void app;
  }
  play_title() { this.menuClip((ui, scene, s) => { scene.opts.title = true; scene.stage('map', { hour: 17.6, titleCam: true }); app_music(this.app, 'lounge'); s.big = TITLE; }); }
  play_showroom() {
    const cars = ['kite', 'libeccio', 'heck'];
    this.menuClip((ui, scene, s) => { app_music(this.app, 'catalogue'); let k = -1, t = 99; s.onTick = (dt) => { t += dt; if (t > 3.3) { t = 0; k = (k + 1) % cars.length; scene.stage('showroom', { showroom: k + 1, car: { carId: cars[k], install: null }, person: 'fenn', personClip: 'DealerPresent', personAt: [-4.6, 0, 1.8], personYaw: 1.1 }); s.lines = CAR_INFO[cars[k]].text; ui.say('fenn', CAR_INFO[cars[k]].fenn, 3); } }; });
  }
  play_tuning() {
    const app = this.app, car = { carId: 'ginga', install: fullInstall(['exhaust', 'stage2']), km: 0, dirt: 0, uid: -1 };
    this.menuClip((ui, scene, s) => { app_music(app, 'socket'); scene.stage('bay', { car: { carId: 'ginga', install: car.install, y: 0.08 }, person: 'benno', personClip: 'MechanicWipe', personAt: [4.6, 0, 0.8], personYaw: -1.2, radius: 7.8, height: 2.3 }); const before = fullInstall(['exhaust']); const dy = new DynoScreen(app, car, before); ui.push(dy); let t = 0, done = false; s.owner = this; dy.autoClose = true; this.clip = { update: (dt) => { t += dt; if (t > 5.8 && !done) { done = true; ui.pop(); const inst = fullInstall(['exhaust', 'stage2', 'aeroWing']); scene.showCar('ginga', inst, { y: 0.08 }).settle = 0.16; s.lines = ['A BIG WING: YOU NOW HAVE MORE DOWNFORCE.', 'YOU ALSO HAVE MORE DRAG. THERE IS NO THIRD THING.']; app.mix.sfx('register'); } } }; });
  }
  play_licence() {
    const test = TESTS['B-1'], app = this.app; let medal = 0;
    this.raceClip({ ...testSetup(test, 0, {}), record: false, seed: 3 }, { test, demo: true, hideHud: false, onFrame: (scene, ctx, dt) => { if (scene.judge?.status === 'pass' && !medal) { medal = 1; app.mix.sfx('medal'); } if (medal) { medal += dt; const ui = app.ui; ui.panel(ui.cx - 70, 80, 140, 40, { color: 'ink', border: 'sand' }); medalIcon(ui, ui.cx - 4, 84, 'gold'); ui.text(ui.cx, 98, 'GOLD', { align: 'center', scale: 2, color: 'sand' }); } } });
    this.caption = 'LICENCE B-1: THRESHOLD';
  }
  play_kestrel() { this.caption = 'KESTREL PARK'; this.raceClip({ kind: 'attract', track: 'kestrel', laps: 3, hour: 15, start: 'rolling', wear: 0, fuel: 0, record: false, seed: 5, cars: AI_FIELD(['ginga', 'kite', 'brandt32', 'moth', 'ryu', 'heck'], 0.92) }, { onFrame: (scene) => { if (this.t > 9 && !scene.tvMode) scene.startTv(); if (scene.sim.phase === 'green' && this.t > 3 && !this.cut1) { this.cut1 = true; } } }); this.cut1 = false; }
  play_redclay() {
    this.caption = 'RED CLAY STAGE';
    this.raceClip({ kind: 'attract', track: 'redclay', laps: 3, hour: 17, start: 'flying', startS: 240, startSpeed: 90, contact: false, wear: 0, fuel: 0, record: false, seed: 6, cars: [{ carId: 'ryuRally', name: 'DEMO', skill: 1 }] }, { onFrame: (scene) => { const sim = scene.sim; if (this.t > 6.5 && !this.hair) { this.hair = true; const s = sim.tr.cornerS[4] - 70; sim.teleport(0, s); const c = sim.cars[0].c, pt = trackPoint(sim.tr, s, 0); c.vx = Math.sin(pt.yaw) * 24; c.vz = Math.cos(pt.yaw) * 24; scene.chase.snap(); this.caption = 'A HANDBRAKE HAIRPIN'; const orig = sim.aiInput.bind(sim); sim.aiInput = (e, m) => { const inp = orig(e, m), d = sim.tr.cornerS[4] - e.c.loc.s; inp.handbrake = d > -6 && d < 14 && Math.abs(e.c.u) > 8; return inp; }; } } });
    this.hair = false;
  }
  play_harbour() {
    this.caption = 'HARBOUR LIGHTS, NIGHT'; this.pitted = false;
    this.raceClip({ kind: 'attract', track: 'harbour', laps: 10, hour: 21, start: 'flying', startS: 400, startSpeed: 90, wear: 0, fuel: 1, record: false, seed: 7, cars: AI_FIELD(['libeccio', 'heck', 'brandt32', 'works'], 0.97) }, { onFrame: (scene) => { const sim = scene.sim, e = sim.cars[sim.cars.length - 1], tr = sim.tr; if (this.t > 9.5 && !this.pitted) { this.pitted = true; this.caption = 'THE TEN LAP RACE: ONE STOP NEEDED'; const s = tr.pit.in - 90, pt = trackPoint(tr, s, 0); sim.teleport(e.i, s); e.c.vx = Math.sin(pt.yaw) * 25; e.c.vz = Math.cos(pt.yaw) * 25; for (let i = 0; i < 4; i++) e.c.wear[i] = 0.25; e.c.fuel = 0.3; e.wantPit = true; scene.chase.snap(); } } });
  }
  play_saltline() {
    this.caption = 'SALTLINE SPEEDBOWL';
    this.raceClip({ kind: 'attract', track: 'saltline', laps: 5, hour: 18.5, start: 'flying', startS: 320, startSpeed: 290, wear: 0, fuel: 0, record: false, seed: 8, contact: false, cars: [{ carId: 'type9', name: 'DEMO 1', skill: 1.02 }, { carId: 'type9', name: 'DEMO 2', skill: 1 }] }, { beforeStep: (sim) => { sim.env.slip = 0.5; } });
  }
  play_podium() {
    const app = this.app;
    this.menuClip((ui) => { ui.push(new PodiumScreen(app, { eventId: 'gp', carId: 'corsa', install: null, short: true, auto: true, next: () => { ui.pop(); ui.push(new PrizeScreen(app, { carId: 'type9', short: true, auto: true, next: () => {} })); } })); });
    this.caption = null;
  }
  play_credits() { this.menuClip((ui, scene, s) => { scene.opts.title = true; scene.stage('map', { hour: 21, titleCam: true }); app_music(this.app, 'longDrive'); s.big = TITLE; s.lines = ['PRESS ANY BUTTON']; }); }
}
const app_music = (app, id) => app.mix.music(id);
class AttractScreen {
  constructor(app, owner) { this.id = 'attract'; this.app = app; this.owner = owner; this.noBack = true; this.lines = null; this.big = null; this.inputOff = true; }
  draw(ui, dt) {
    this.onTick?.(dt);
    if (this.big) { const [a, b] = this.big.split(' '); ui.text(ui.cx, 60, a, { align: 'center', scale: 3, color: 'white', shadow: 'plum' }); ui.text(ui.cx, 84, b, { align: 'center', scale: 4, color: 'sand', shadow: 'plum' }); }
    if (this.lines) { const H = this.lines.length * 10 + 6, y = ui.h - 22 - H; ui.panel(10, y, Math.min(ui.w - 20, 340), H, { color: 'ink', border: 'slate' }); this.lines.forEach((l, k) => ui.text(16, y + 4 + k * 10, l)); }
    ui.panel(ui.cx - 22, 3, 44, 11, { color: 'ink', border: 'red' }); ui.text(ui.cx, 5, 'DEMO', { align: 'center', color: Math.floor(ui.time * 2) % 2 ? 'red' : 'white' });
  }
}
void EVENTS;
