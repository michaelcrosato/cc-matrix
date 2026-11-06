// The shared flow: intro -> practice -> countdown -> play -> outro -> Results.
import { App } from '../../app.js';
import { blankInput, BotBrain, LocalDriver } from '../../core/drivers.js';
import { applyResult, hardOpen, starsFor } from '../../core/week.js';
import { CONFIRM } from '../../core/actions.js';
import { ACTIVITIES } from '../../data/activities.js';
import { BaseScene, laneCamera } from '../base.js';
import { ABOVE_PROMPTS } from '../../ui/layout.js';
import { promptBar } from '../../ui/prompts.js';
import { panel, say, sayCentered, SAFE, wrapCard } from '../../ui/activity-hud.js';
import { ResultsScreen } from '../../ui/screens/results.js';
import { Kevin, Ounce, place } from '../../art/props.js';
import { makeAvatar } from '../../art/avatar.js';
import { LOOKS } from '../../data/classmates.js';
import { controlsFor } from '../../data/howto.js';

export const CAMERAS = {
  lane3: () => laneCamera(3),
  lane4: () => laneCamera(4),
  header: () => ({ preset: 'fixed', position: [0, 3.1, 8.6], target: [0, 1.4, 0], fov: 34 }),
  slackline: () => ({ preset: 'fixed', position: [0, 3.2, -6], target: [0, 1.6, 6], fov: 46 }),
  tray: () => ({ preset: 'fixed', position: [0, 9.2, 2.3], target: [0, 0, 0.1], fov: 30 }),
  pier: () => ({ preset: 'side', zoom: 1, minZoom: 0.2, maxZoom: 4 }),
  jog: () => ({ preset: 'iso', zoom: 1.4, minZoom: 1.4, maxZoom: 1.4 }),
  stand: () => ({ preset: 'fixed', position: [0, 2.8, 9], target: [0, 1.75, 0], fov: 32 }),
};

export class ActivityScene extends BaseScene {
  canPause = true;
  id = 'activity';
  phase = 'boot';
  phaseT = 0;
  playT = 0;
  totalPlay = 0;
  camPush = 0;
  camGlide = 0;
  scoring = false;

  constructor(args = {}) {
    super(args);
    this.activity = args.id;
    this.def = ACTIVITIES[args.id];
    this.name = `activity:${args.id}`;
    this.mode = args.mode ?? 'dropin';
    this.hard = !!args.hard;
    this.attractMode = !!args.attract;
    this.hardData = this.hard ? (this.def.hard ?? {}) : {};
    this.ringBoost = this.attractMode ? 2 : 1;
    this.cheatRing = this.attractMode;
    this.inp = blankInput();
    this.driver = new LocalDriver();
  }

  cameraConfig() { return CAMERAS[this.def.camera]?.() ?? CAMERAS.lane3(); }

  get autopilot() { return this.attractMode ? 'expert' : App.dev.autopilot; }

  async build(ctx) {
    this.rng = ctx.random.fork('play');
    this.cosmetic = ctx.random.fork('cosmetic');
    this.botRand = ctx.random.fork('bot');
    this.base = this.cameraConfig();
    await this.stage(ctx);
    this.startMusic();
    if (this.attractMode) { this.begin(false); this.enter('play'); } else this.enter('intro');
  }

  startMusic() { App.music(this.def.song); }

  async stage() {}
  begin() {}
  stepPlay() {}
  isOver() { return this.playT >= this.playLength(); }
  playLength() { return 60; }
  /** { score, seconds, display, stars?, max? } */
  result() { return { score: 0, seconds: this.playT, display: '0' }; }
  botInput() {}
  visual() {}
  drawGame() {}
  drawGameHud() {}

  /** One player, not on a lane: stick, keys, mouse or autopilot. */
  readPlayer(ctx, dt, dial) {
    const out = this.inp;
    out.stepL = out.stepR = out.confirm = false;
    const auto = this.autopilot;
    if (auto) {
      if (!this.brain || this.brain.skill !== auto) this.brain = new BotBrain(auto, () => this.botRand.next());
      out.rate = false;
      this.botInput(out, dt, this.brain);
    } else this.driver.read(out, ctx, dt, App, dial);
    return out;
  }

  get practised() {
    if (this.attractMode || this.args.noPractice) return true;
    const rec = this.mode === 'week' ? App.slot?.records[this.activity] : App.store.data.dropin?.[this.activity];
    return !!rec || (App.practised ??= {})[this.activity];
  }

  enter(phase) {
    this.phase = phase;
    this.phaseT = 0;
    this.onEnter?.(phase);
    switch (phase) {
      case 'intro':
        App.say('coach', this.def.coach);
        this.camGlide = 1;
        break;
      case 'practice':
        (App.practised ??= {})[this.activity] = true;
        this.begin(true);
        this.playT = 0;
        break;
      case 'countdown':
        this.begin(false);
        this.playT = 0;
        this.lastCount = 4;
        break;
      case 'play':
        this.playT = 0;
        this.scoring = true;
        this.onPlayStart?.();
        break;
      case 'outro':
        this.scoring = false;
        this.onOutroStart?.();
        break;
      default:
        break;
    }
  }

  onInput(ctx) {
    const { input } = ctx;
    if (this.phase === 'intro') {
      if (input.wasPressed(...CONFIRM) || input.wasPressed('MouseLeft')) this.advanceIntro();
    }
  }

  advanceIntro() {
    if (this.phase !== 'intro') return;
    App.sfx('menuConfirm');
    this.enter(this.practised ? 'countdown' : 'practice');
  }

  onFixed(ctx, dt) {
    if (this.resultsShown) { this.idleStep?.(ctx, dt); return; }
    this.phaseT += dt;
    switch (this.phase) {
      case 'intro':
        if (this.autopilot && this.phaseT > 0.4) this.advanceIntro();
        break;
      case 'practice':
        this.playT += dt;
        this.stepPlay(ctx, dt, false);
        if (this.phaseT >= 8) this.enter('countdown');
        break;
      case 'countdown': {
        this.countStep?.(ctx, dt);
        const n = Math.ceil(3 - this.phaseT);
        if (n !== this.lastCount && n > 0) { this.lastCount = n; App.sfx('count'); }
        if (this.phaseT >= 3) { App.sfx('countGo'); this.enter('play'); }
        break;
      }
      case 'play':
        this.playT += dt;
        this.totalPlay += dt;
        this.stepPlay(ctx, dt, true);
        if (this.isOver()) this.enter('outro');
        break;
      case 'outro':
        this.idleStep?.(ctx, dt);
        if (this.phaseT >= (this.outroLength ?? 1.6)) this.finish();
        break;
      default:
        break;
    }
  }

  /** Write the result and show it. Dev Tools can force the stars. */
  finish(force = null) {
    if (this.resultsShown || this.attractMode) return;
    this.resultsShown = true;
    this.phase = 'results';
    const r = this.result();
    let stars = starsFor(this.def, r.score, r);
    if (force !== null) stars = force;
    const seconds = Math.max(r.seconds ?? this.totalPlay, 0);
    const out = { ...r, stars, seconds, id: this.activity, hard: this.hard, mode: this.mode };
    if (this.mode === 'week' && App.slot) {
      Object.assign(out, applyResult(App.slot, this.activity, { score: r.score, stars, seconds, hard: this.hard }));
      App.store.write();
    } else if (this.mode === 'dropin') {
      const d = (App.store.data.dropin ??= {});
      const rec = d[this.activity] ?? { best: 0, stars: 0, plays: 0 };
      out.firstEver = !d[this.activity];
      out.newBest = r.score > rec.best;
      rec.best = Math.max(rec.best, r.score); rec.stars = Math.max(rec.stars, stars); rec.plays++;
      d[this.activity] = rec;
      out.drips = 0;
      App.store.write();
    }
    this.lastResult = out;
    this.onFinish?.(out);
    if (!this.args.noResults) App.stack.push(new ResultsScreen(this, out));
  }

  onUpdate(ctx, dt) {
    if (this.base?.preset === 'fixed' && !App.dev.freeCam && !this.ownCamera) this.applyCamera(ctx, dt);
    this.ounce?.update(dt);
    this.kevin?.update(dt);
    this.coach?.update(dt);
    this.visual(ctx, dt);
    this.playVisual?.(ctx, dt);
  }

  applyCamera(ctx, dt) {
    const cam = ctx.camera.camera;
    const b = this.base;
    this.camGlide = this.phase === 'intro' ? Math.max(0, this.camGlide - dt * 0.5) : 0;
    const g = this.camGlide * this.camGlide;
    const px = b.position[0] + g * 3;
    const py = b.position[1] + g * 1.6;
    const pz = b.position[2] + g * 4 - this.camPush;
    cam.position.set(px, py, pz);
    cam.lookAt(b.target[0], b.target[1], b.target[2]);
    if (cam.fov !== b.fov) { cam.fov = b.fov; cam.updateProjectionMatrix(); }
  }

  onDraw(ctx) {
    const { hud } = ctx;
    if (this.phase !== 'results') this.drawGame(ctx);
    if (this.attractMode) return;
    if (this.phase === 'intro') this.drawCard(ctx);
    if (this.phase === 'practice') {
      hud.rect(Math.round(hud.width / 2) - 40, hud.height - 58, 80, 14, 'navy');
      sayCentered(hud, hud.width / 2, hud.height - 56, 'Try it.', { color: 'sand', name: 'practice' });
      this.drawControls(ctx);
    }
    if (this.phase === 'countdown') {
      const n = Math.max(1, Math.ceil(3 - this.phaseT));
      sayCentered(hud, hud.width / 2, Math.round(hud.height * 0.42), String(n), { scale: 4, color: 'sand', name: 'count' });
    }
    if (this.phase === 'play' && this.playT < 0.8) sayCentered(hud, hud.width / 2, Math.round(hud.height * 0.42), 'Begin.', { scale: 3, color: 'white', name: 'begin' });
    if (this.phase === 'play') this.drawGameHud(ctx);
  }

  barkBottom() { return this.phase === 'intro' || this.phase === 'practice' ? ABOVE_PROMPTS : 12; }

  drawControls(ctx) {
    promptBar(ctx.hud, App.device, controlsFor(this.def, App.device.promptColumn()));
  }

  drawCard(ctx) {
    const { hud } = ctx;
    const w = Math.min(hud.width - SAFE * 2, 300);
    const x = Math.round((hud.width - w) / 2);
    const lines = wrapCard(this.def.goal, w - 16);
    const h = 30 + lines.length * 11;
    const y = 18;
    panel(hud, x, y, w, h, { fill: 'navy', border: 'ink', name: 'card' });
    sayCentered(hud, hud.width / 2, y + 5, this.def.name, { scale: 1, color: 'sand', name: 'card-title' });
    if (this.hard) say(hud, x + 5, y + 5, 'HARD', { color: 'red', name: 'card-hard' });
    lines.forEach((l, i) => sayCentered(hud, hud.width / 2, y + 18 + i * 11, l, { color: 'white', name: 'card-goal' }));
    const list = [...controlsFor(this.def, App.device.promptColumn()), ['confirm', 'Begin']];
    promptBar(hud, App.device, list);
  }

  /** Coach: to one side of the player, never directly behind: their silhouettes merge. */
  async addCoach(ctx, { at, yaw = 0, clip = 'CoachStand', dais = false }) {
    if (dais) place(ctx, 'dais', { at: [at[0], 0, at[2]] });
    this.coach = await makeAvatar(ctx, LOOKS.coach, { at, yaw, clip });
    this.coach.addPlumb();
    return this.coach;
  }

  async addKevin(ctx, at, yaw = 0.4) {
    this.kevin = new Kevin(ctx, { at, yaw });
    return this.kevin;
  }

  addOunce(ctx, opts) {
    this.ounce = new Ounce(ctx, opts);
    return this.ounce;
  }

  // Pause menu's "Restart activity".
  restart() { App.go('activity', { ...this.args }); }

  /** Dev Tools: finish with 0-3 stars. */
  devFinish(stars) { if (!this.resultsShown) { this.scoring = false; this.finish(stars); } }

  hardAvailable() { return App.slot ? hardOpen(App.slot, App.dev.allUnlocked) : true; }

  status() {
    const r = this.phase === 'play' ? this.result() : null;
    return `activity ${this.activity} | ${this.phase} | t ${this.playT.toFixed(1)}${r ? ` | score ${Math.round(r.score)}` : ''}`;
  }
}
