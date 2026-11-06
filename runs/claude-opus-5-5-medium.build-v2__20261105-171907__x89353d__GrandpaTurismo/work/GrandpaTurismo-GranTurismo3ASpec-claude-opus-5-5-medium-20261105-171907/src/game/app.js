// App: profile, settings, input, audio mix, scene switching.
import { Engine, withUrlOptions, LOOK_PRESETS } from '../pixel-engine.js';
import { Actions } from './input/actions.js';
import { pollPads } from './input/pad.js';
import { UI } from './ui/ui.js';
import { Mix } from './audio/mix.js';
import { MenuScene } from './scenes/menu.js';
import { RaceScene } from './scenes/race.js';
import { ReplayScene } from './scenes/replay.js';
import { DevState, Dev } from './dev/devmode.js';
import { Attract } from './attract/director.js';
import { Couch } from './net/couch.js';
import { SAVE_KEY, SETTINGS_KEY, TITLE } from './data/meta.js';
import { TRACKS } from './data/tracks.js';
import { newProfile, migrate, applyRound, applyTest, addMileage, carRec, record } from './sim/career.js';
import { EVENT } from './data/events.js';
import { TEST } from './data/licences.js';
import { setSky } from './render/sky.js';
import { licenceSetup, quickRaceSetup, couchSetup } from './sim/setups.js';
import { b64, unb64 } from './scenes/race.js';
import * as Title from './ui/screens/title.js';
import * as Lic from './ui/screens/licence.js';
import * as Ev from './ui/screens/events.js';
import { Dealer } from './ui/screens/dealer.js';
import { Tuning, Service } from './ui/screens/tuning.js';
import { Garage, Museum, Theatre } from './ui/screens/garage.js';
import { Arcade } from './ui/screens/arcade.js';
import { Settings, Handbook, About } from './ui/screens/settings.js';
import { Pause, Results, LicenceResult } from './ui/screens/race.js';
import { Podium, PrizeReveal, Ending } from './ui/screens/podium.js';
const storage = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
const DEFAULT_SETTINGS = { voices: 0.8, raceMusic: true, glyphs: 'ps', vibration: true, steerCurve: 1.4, mouseSteer: false, units: 'kmh', musicSet: false };
export class App {
  constructor() {
    this.actions = new Actions(this); this.ui = new UI(this); this.mix = new Mix(this); this.dev = new DevState(); this.attract = new Attract(this); this.couchMgr = new Couch(this);
    this.settings = { ...DEFAULT_SETTINGS, ...this.readJSON(SETTINGS_KEY) }; this.profile = this.loadProfile(); this.scene = null; this.paused = false; this.couch = false; this.session = null; this.bot = null; this.lastResult = null; this.lastReplay = null; this.loading = false; this.keySeen = false; this.cursorIdle = 0; this.fresh = !this.settings.musicSet;
    this.screens = { Map: Title.MapScreen, MapPause: Title.MapPause, Title: Title.TitleScreen, Greet: Title.GreetScreen, LicenceCentre: Lic.LicenceCentre, TestList: Lic.TestList, TestCard: Lic.TestCard, EventHall: Ev.EventHall, EventCard: Ev.EventCard, RoundCard: Ev.RoundCard, Dealer, Tuning, Service, Garage, Museum, Theatre, Arcade, Settings, Handbook, About, Dev, Pause, Results, LicenceResult };
    if (typeof addEventListener !== 'undefined') { addEventListener('keydown', () => { this.keySeen = true; this.actions.anyKeyEvent = true; }); addEventListener('mousemove', () => (this.cursorIdle = 0)); }
  }
  readJSON(k) { try { const s = storage()?.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } }
  loadProfile() { const p = this.readJSON(SAVE_KEY); return p ? migrate(p) : null; }
  hasSave() { return !!this.readJSON(SAVE_KEY); }
  save() { if (!this.profile || this.session) return true; try { storage()?.setItem(SAVE_KEY, JSON.stringify(this.profile)); return true; } catch { return false; } }
  saveSettings() { try { storage()?.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* storage refused */ } }
  resetSettings() { Object.assign(this.settings, DEFAULT_SETTINGS); this.saveSettings(); const a = this.mix.audio; a?.resetVolumes(); a?.setVolume('music', 0.1); this.ctx?.engine.settings.reset(); }
  assistsTarget() { return (this.profile ??= newProfile()).assists; }
  engineOptions(container, o = {}) { return { container, camera: { preset: 'fixed', position: [0, 5, -10], target: [0, 1, 0], fov: 58, minZoom: 1, maxZoom: 1 }, settings: { button: false }, touch: false, look: LOOK_PRESETS.none, background: 0x1a1c2c, ...o }; }
  /** Called by every scene's setup. */
  bind(ctx, scene) {
    this.ctx = ctx; this.scene = scene; this.hud = ctx.hud; this.engine = ctx.engine; this.mix.bind(ctx); this.ui.prompted = false;
    const input = ctx.input; input.gamepadButtons = {}; input.gamepadLookSpeed = 0; for (const k of ['Tab', 'F1', 'F2', 'ControlLeft', 'Backspace', 'Slash', 'Period', 'Comma']) input.preventKeys.add(k);
    // first launch and every hub round: music at 10%.
    if (!this.settings.musicSet) { ctx.audio.setVolume('music', 0.1); }
  }
  onReady(ctx, scene) { if (typeof window !== 'undefined') window.__GAME__ = this.hook(); void ctx; void scene; }
  frameStart(ctx) { return this.actions.latch(ctx); }
  /** End of update: UI, attract, pads, cursor. */
  frameEnd(ctx, dt, skipUi = false) {
    this.realDt = dt;
    this.attract.update(ctx, dt);
    if (!skipUi && !this.attract.active) { if (this.ui.top) this.ui.frame(dt); else if (this.ui.subtitle || this.ui.toasts.length) { this.ui.dt = dt; if (this.ui.subtitle) this.ui.drawSubtitle(dt); this.ui.drawToasts(dt); } }
    else if (this.attract.active && this.ui.subtitle) this.ui.drawSubtitle(dt);
    if (this.session) { const s = this.scene; if (s?.sim) this.session.drawOver(s, ctx); }
    if (this.ui.top?.attract && !this.attract.active && !this.session && this.actions.idle > 10) this.attract.start();
    if (this.url?.attract && !this.attractDone) { this.attractDone = true; this.attract.start(); }
    if (this.url?.dev && !this.devOpened && this.ui.top && !this.loading) { this.devOpened = true; this.ui.push(this.screens.Dev()); }
    pollPads(ctx.input);
    if (!this.mix.audio?.unlocked && this.actions.anyInput && this.actions.device === 'pad') this.mix.audio?.unlock();
    this.mix.ensureGraph(); this.mix.updateLevels();
    this.cursorIdle += dt; if (typeof document !== 'undefined') { const hide = this.cursorIdle > 2 || (this.scene instanceof RaceScene && !this.paused && !this.ui.top); document.body.style.cursor = hide ? 'none' : 'default'; }
  }
  touchGate() { if (typeof matchMedia === 'undefined') return false; if (this.keySeen || this.actions.pads.length || this.actions.sawKey) return false; return !matchMedia('(any-pointer: fine)').matches && matchMedia('(pointer: coarse)').matches; }
  inRace() { return this.scene instanceof RaceScene; }
  tracksName(id) { return TRACKS[id].name.toUpperCase(); }
  async goScene(make) {
    if (this.loading) return; this.loading = true; const e = this.engine;
    try {
      const fx = !this.instant && e.screen?.cover ? e.screen : null;
      if (fx) await fx.cover('wipe', { duration: 0.22 });
      this.mix.clearEngines(); e.timeScale = 1; this.paused = false;
      await e.loadGame(make());
      if (fx) fx.reveal('wipe', { duration: 0.25 });
    } finally { this.loading = false; }
  }
  // ---- routes
  currentRoute() { const t = this.ui.top; return t?.id === 'map' ? { screen: 'map' } : { screen: 'title' }; }
  toTitle() { this.couchMgr.end(); this.ui.clearStack(); return this.goScene(() => new MenuScene(this, { screen: 'title' })); }
  toMap() { this.couchMgr.end(); this.ui.clearStack(); return this.goScene(() => new MenuScene(this, { screen: 'map' })); }
  toMenu(route) { this.couchMgr.end(); this.ui.clearStack(); return this.goScene(() => new MenuScene(this, route)); }
  applyRoute(r) {
    const ui = this.ui, s = this.screens; ui.clearStack(); const route = r ?? { screen: 'title' };
    if (route.screen === 'title' || !this.profile && route.screen !== 'title') { ui.push(s.Title()); return; }
    if (route.screen === 'none') return;
    ui.push(s.Map());
    const open = { map: null, dealer: () => s.Dealer(route.room ?? 0, route.car ?? 0), tuning: () => s.Tuning(), service: () => s.Service(), garage: () => s.Garage(), museum: () => s.Museum(), theatre: () => s.Theatre(), arcade: () => s.Arcade(), licence: () => s.LicenceCentre(), tests: () => s.TestList(route.lic), testcard: () => s.TestCard(route.id), events: () => s.EventHall(), eventcard: () => s.EventCard(route.id), roundcard: () => s.RoundCard(route.id), results: () => (this.lastResult?.licence ? s.LicenceResult() : s.Results()) }[route.screen];
    if (route.screen === 'tests' || route.screen === 'testcard') ui.push(s.LicenceCentre()); if (route.screen === 'testcard') ui.push(s.TestList(route.id[0]));
    if (route.screen === 'eventcard' || route.screen === 'roundcard') ui.push(s.EventHall()); if (route.screen === 'roundcard') ui.push(s.EventCard(route.id));
    if (open) { const sc = open(); ui.push(sc); }
    if (route.then) route.then(this);
  }
  newGame() { this.profile = newProfile(); this.save(); this.ui.clearStack(); this.ui.push(this.screens.Greet()); }
  onboard() { /* the Map's nudge takes it from here */ }
  // ---- racing
  startRace(setup) { this.couchMgr.end(); this.ui.clearStack(); this.paused = false; return this.goScene(() => new RaceScene(this, setup)); }
  startCouch(setup) { this.ui.clearStack(); return this.couchMgr.start(setup); }
  startReplay(data, back) { this.couchMgr.end(); this.ui.clearStack(); return this.goScene(() => new ReplayScene(this, data, back)); }
  leaveReplay(back) { this.ui.clearStack(); return this.goScene(() => new MenuScene(this, back)); }
  pause(scene) { this.actions.consume('pause'); this.actions.consume('back'); this.ui.push(Pause(scene)); this.paused = true; this.mix.quietDriving(); }
  restartRace(sc) { const s = sc.rs; if (s.mode === 'couch') { this.couchMgr.end(); return this.startCouch(s); } return this.startRace(s); }
  restartTrialLap(sc) { const sim = sc.sim, me = sim.player; sim.placeCar(me, sim.tr.length - 12, 0, 0); me.lap = 0; me.prevS = me.loc.s; me.lapStart = sim.t; me.midSeen = false; sc.trial.cur = []; sc.chase.snap(); }
  devRestart(sc, o) { const s = { ...sc.rs }; if (o.rain != null) s.rain = o.rain; const me = sc.sim.player; if (o.car) { const i = s.cars.findIndex((c) => c.seat === 0); if (s.mode === 'arcade' || s.mode === 'race' || s.mode === 'testdrive' || s.mode === 'trial') { s.cars = s.cars.slice(); const q = quickRaceSetup({ track: s.track, carId: o.car, field: 1, pace: 0.9 }).cars[0]; s.cars[i] = { ...q }; } } if (o.field && s.mode !== 'licence') { const carId = me.carId; const q = quickRaceSetup({ track: s.track, carId, field: o.field, pace: 0.92 }); s.cars = q.cars; } this.ui.clearStack(); this.paused = false; return this.startRace(s); }
  setSkyNow(sc) { setSky(this.ctx.engine, sc.hour, { rain: sc.rs.rain }); }
  retire(sc) {
    const a = sc.rs.after;
    if (a.kind === 'career') return this.toMenu({ screen: 'eventcard', id: a.eventId });
    if (a.kind === 'licence') return this.toMenu({ screen: 'testcard', id: a.testId });
    if (a.kind === 'route') return this.toMenu(a.route);
    return this.toMenu({ screen: 'arcade' });
  }
  raceOver(scene) {
    const { rs: setup, sim } = scene, a = setup.after, p = this.profile, dev = this.dev.dirty;
    this.lastReplay = sim.replayData();
    if (setup.mode === 'attract' || scene.rs.attractClip || this.attract.active) return;
    if (setup.mode === 'hub') return;
    if (a.kind === 'route') { return this.toMenu(a.route); }
    if (a.kind === 'licence') return this.licenceOver(scene);
    const rows = sim.results ?? [];
    const res = { setup, rows, replay: this.lastReplay, outcome: null, saved: false };
    if (a.kind === 'career') {
      res.snapshot = JSON.stringify(p);
      const me = sim.player, rec = carRec(p); addMileage(p, rec, me.metres, setup.track === 'redclay' ? 0.34 : 0);
      for (const c of sim.cars) p.seen[c.carId] = true;
      res.outcome = applyRound(p, a.eventId, rows.map((r) => ({ key: r.key, name: r.name, player: r.player })), this.dev.tune.prize);
      res.outcome.eventName = EVENT[a.eventId].name; res.eventId = a.eventId;
      if (isFinite(me.bestLap) && !dev && record(p, setup.track, me.bestLap, me.carId)) res.recordLap = me.bestLap;
      this.save();
    }
    this.lastResult = res; this.ui.clearStack(); this.ui.push(Results());
  }
  licenceOver(scene) {
    const { rs: setup, sim } = scene, a = setup.after, R = sim.run, p = this.profile, test = TEST[a.testId], total = a.times + (R.total ?? R.time);
    // three layouts: the next car, times added
    if (test.runs && !R.failed && a.run < test.runs.length - 1) { return this.startRace(licenceSetup(a.testId, a.run + 1, { times: total, demo: a.demo })); }
    if (a.demo) return this.toMenu({ screen: 'testcard', id: a.testId });
    const outcome = applyTest(p, a.testId, total, R.failed, this.dev.dirty); this.save();
    this.lastResult = { licence: true, setup, testId: a.testId, time: total, failed: R.failed, reason: R.reason, hits: R.hits, outcome, replay: this.lastReplay };
    this.ui.clearStack(); this.ui.push(LicenceResult());
  }
  continueAfterResult() {
    const R = this.lastResult, a = R.setup.after;
    if (R.licence) return this.toMenu({ screen: 'tests', lic: R.testId[0] });
    if (a.kind === 'career') {
      const o = R.outcome, id = a.eventId;
      if (o.seriesOver && o.seriesWon) return this.toMenu({ screen: 'map', then: (app) => app.seriesEnd(o) });
      if (o.seriesOver) return this.toMenu({ screen: 'eventcard', id });
      return this.toMenu({ screen: 'roundcard', id });
    }
    return this.toMenu({ screen: 'arcade' });
  }
  seriesEnd(o) { const ui = this.ui, afterPrize = () => { if (o.ending) ui.replace(Ending()); else ui.pop(); }, afterPodium = () => { if (o.prizeCar) ui.replace(PrizeReveal(o.prizeCar, afterPrize)); else afterPrize(); }; ui.push(Podium(o, afterPodium)); }
  retryResult() { const R = this.lastResult; if (R.snapshot) this.profile = JSON.parse(R.snapshot); this.save(); const a = R.setup.after; if (a.kind === 'career') return this.startRace(R.setup); return this.startRace(R.setup); }
  watchResult() { const R = this.lastResult; return this.startReplay(R.replay, { screen: 'results' }); }
  packReplay(d) { const every = Math.max(1, Math.round(d.hz / 10)), n = Math.floor(d.n / every), cars = d.data.map((a) => { const o = new Int16Array(n * 7); for (let i = 0; i < n; i++) { const k = i * every * 12, q = i * 7; o[q] = Math.round(a[k] * 4); o[q + 1] = Math.round(a[k + 1] * 16); o[q + 2] = Math.round(a[k + 2] * 4); o[q + 3] = Math.round(((a[k + 3] % 6.2832) + 6.2832) % 6.2832 * 4000); o[q + 4] = Math.round(a[k + 7] / 2); o[q + 5] = a[k + 10]; o[q + 6] = Math.round(a[k + 11] * 16); } return b64(o); }); return { track: d.track, hour: d.hour, rain: d.rain, n, label: d.label, cars: d.cars, data: cars, day: this.profile.day }; }
  unpackReplay(s) { const data = s.data.map((str) => { const o = unb64(str), a = new Float32Array(s.n * 12); for (let i = 0; i < s.n; i++) { const k = i * 12, q = i * 7; a[k] = o[q] / 4; a[k + 1] = o[q + 1] / 16; a[k + 2] = o[q + 2] / 4; a[k + 3] = o[q + 3] / 4000; a[k + 7] = o[q + 4] * 2; a[k + 8] = 0.6; a[k + 9] = 3; a[k + 10] = o[q + 5]; a[k + 11] = o[q + 6] / 16; } return a; }); return { track: s.track, hour: s.hour, rain: s.rain, n: s.n, hz: 10, label: s.label, cars: s.cars, data }; }
  saveReplay(d) { const p = this.profile; if (!p) return false; try { const s = this.packReplay(d); const prev = p.replays.slice(); p.replays.unshift(s); p.replays = p.replays.slice(0, 3); if (!this.save()) { p.replays = prev; this.save(); return false; } return true; } catch { return false; } }
  toggleFullscreen() { if (typeof document === 'undefined') return; if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.()?.catch?.(() => {}); }
  // ---- test hooks
  hook() { const app = this; return { app, state() { const s = app.scene, u = app.ui; return { scene: s?.name, screen: u.top?.id ?? null, stack: u.stack.map((x) => x.id), focus: u.focus, items: u.items.map((i) => i.id), prompts: (u.promptList ?? []).map((p) => p[1]), device: app.actions.device, idle: app.actions.idle, attract: app.attract.active, clip: app.attract.i, paused: app.paused, loading: app.loading, status: s?.status?.(), music: app.mix.audio?.volume?.music, profile: app.profile ? { credits: app.profile.credits, day: app.profile.day, cars: app.profile.cars.map((c) => c.id), licences: app.profile.licences } : null, tune: { ...app.dev.tune }, race: s?.sim ? { track: s.rs?.track, phase: s.sim.phase, lap: s.sim.player.lap, pos: s.sim.player.position, done: s.sim.done, t: s.sim.t } : null, couch: app.couch, engine2: !!app.couchMgr.engine2 }; }, press(a) { app.actions.inject(a); } }; }
}
export const parseUrl = () => { if (typeof location === 'undefined') return {}; const q = new URLSearchParams(location.search), o = {}; for (const [k, v] of q) o[k] = v; return o; };
export { TITLE, Engine, withUrlOptions, couchSetup };
