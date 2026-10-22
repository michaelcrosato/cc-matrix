// App state machine: boot checks, menus, mission flow, pause, results and
// the attract loop. Exactly one of these modes is active at a time.
//   boot | touch | title | map | briefing | menu | play | pause | results | attract

import { Render } from './render.js';
import { initRapier } from './physics.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { HUD } from './hud.js';
import { Game } from './game.js';
import { Autopilot } from './autopilot.js';
import { MISSIONS, missionById } from './missions.js';
import { recordClear } from './settings.js';

const IDLE_TO_ATTRACT = 10;
const ATTRACT_ORDER = ['training', 'plains', 'canyon', 'belt', 'core'];
const TITLE_MUSIC = { name: 'title', bpm: 96, roots: [45, 41, 36, 43], minor: true, lead: true, hats: false };
const BACKDROP = { id: 'backdrop', name: '', env: 'plains', speed: 16, length: Infinity, script: [] };
const MENU_MODES = ['title', 'map', 'briefing', 'menu'];
const NO_INPUT = { x: 0, y: 0, fire: false, lock: false, lockReleased: false, bomb: false, boost: false, brake: false, rollL: false, rollR: false, pause: false };

export class App {
  constructor(root, canvas) {
    this.root = root;
    this.render = new Render(canvas);
    this.input = new Input();
    this.sound = new Sound();
    this.ui = new UI(root, this.input);
    this.hud = new HUD(root);
    this.mode = 'boot';
    this.game = null;
    this.mission = null;
    this.autopilot = null;
    this.attractIndex = 0;
    this.inGame = false;
    this.lastNow = performance.now();
    this.ui.onVolume = () => this.sound.applyVolumes();
    this.input.onDevice = () => this.onDevice();
  }

  async start() {
    this.ui.showLoading('Warming up the flight computer...');
    if (!navigator.gpu) {
      this.ui.showError('WebGPU required', 'Starfoxy Sky renders with WebGPU only and has no WebGL fallback. Use a current Chromium-based browser, or open the page from localhost or https so the GPU API is available.');
      return;
    }
    const adapter = await navigator.gpu.requestAdapter().catch(() => null);
    if (!adapter) {
      this.ui.showError('No WebGPU adapter', 'The browser exposes WebGPU but found no usable GPU adapter. Check the browser and GPU driver settings.');
      return;
    }
    try {
      await initRapier();
      await this.render.init();
    } catch (err) {
      this.ui.showError('Startup failed', String(err && err.message ? err.message : err));
      return;
    }
    window.addEventListener('resize', () => this.render.resize());
    const unlockAudio = () => this.sound.init();
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    requestAnimationFrame((t) => this.frame(t));

    if (this.touchOnly()) this.enterTouchGate();
    else this.toTitle();
  }

  touchOnly() {
    return !window.matchMedia('(any-hover: hover)').matches && !this.input.padConnected;
  }

  enterTouchGate() {
    this.mode = 'touch';
    this.stopBackdrop();
    this.ui.showTouchGate(() => this.toSettings(() => this.enterTouchGate()));
  }

  onDevice() {
    if (this.mode !== 'touch') return;
    if (this.input.padConnected || this.input.keyboardUsed) this.toTitle();
  }

  // ----- Screen transitions -----

  toTitle() {
    this.mode = 'title';
    this.inGame = false;
    this.hud.show(false);
    this.ensureBackdrop();
    this.sound.playMusic(TITLE_MUSIC);
    this.ui.showTitle({
      start: () => this.toMap(),
      settings: () => this.toSettings(() => this.toTitle()),
      controls: () => this.toControls(() => this.toTitle()),
      credits: () => this.toCredits(() => this.toTitle()),
    });
  }

  toMap() {
    this.mode = 'map';
    this.ensureBackdrop();
    this.ui.showMap((m) => this.toBriefing(m), () => this.toTitle());
  }

  toBriefing(m) {
    this.mode = 'briefing';
    this.ui.showBriefing(m, () => this.startMission(m.id), () => this.toMap());
  }

  toSettings(back) {
    this.mode = 'menu';
    this.ui.showSettings(back);
  }

  toControls(back) {
    this.mode = 'menu';
    this.ui.showControls(back);
  }

  toCredits(back) {
    this.mode = 'menu';
    this.ui.showCredits(back);
  }

  toPause() {
    this.mode = 'pause';
    this.inGame = true;
    this.ui.showPause({
      resume: () => this.resume(),
      restart: () => this.startMission(this.mission.id),
      settings: () => this.toSettings(() => this.toPause()),
      controls: () => this.toControls(() => this.toPause()),
      abort: () => {
        this.endGame();
        this.toMap();
      },
    });
  }

  resume() {
    this.ui.hide();
    this.mode = 'play';
    this.inGame = false;
  }

  startMission(id) {
    const m = missionById(id);
    if (!m) return;
    this.endGame();
    this.mission = m;
    this.game = new Game({ render: this.render, sound: this.sound, input: this.input, mission: m, cheats: false });
    this.autopilot = null;
    this.sound.playMusic(m.music);
    this.ui.hide();
    this.hud.setAttract(false);
    this.hud.show(true, m.name);
    this.mode = 'play';
    this.inGame = false;
  }

  finishGame() {
    const r = this.game.result();
    const m = this.mission;
    if (r.state === 'clear') recordClear(m.id, r.medal, r.score);
    this.hud.show(false);
    this.mode = 'results';
    this.ui.showResults(r, m, {
      map: () => {
        this.endGame();
        this.toMap();
      },
      retry: () => this.startMission(m.id),
    });
  }

  // ----- Backdrop and attract -----

  // Behind the menus we run a slow flyover of the plains, so the title is never a blank page.
  ensureBackdrop() {
    if (this.game && this.game.mission === BACKDROP) return;
    this.endGame();
    this.mission = BACKDROP;
    this.game = new Game({ render: this.render, sound: this.sound, input: this.input, mission: BACKDROP, cheats: true });
    this.autopilot = new Autopilot();
  }

  stopBackdrop() {
    if (this.game && this.game.mission === BACKDROP) this.endGame();
  }

  startAttract() {
    this.mode = 'attract';
    this.ui.hide();
    this.startAttractMission();
    this.hud.setAttract(true);
  }

  startAttractMission() {
    const id = ATTRACT_ORDER[this.attractIndex % ATTRACT_ORDER.length];
    this.attractIndex++;
    const m = missionById(id);
    this.endGame();
    this.mission = m;
    this.game = new Game({ render: this.render, sound: this.sound, input: this.input, mission: m, cheats: true });
    this.autopilot = new Autopilot();
    this.sound.playMusic(m.music);
    this.hud.show(true, m.name);
    this.hud.setAttract(true);
    this.attractWait = 0;
  }

  exitAttract() {
    this.hud.setAttract(false);
    this.endGame();
    this.toTitle();
  }

  endGame() {
    if (this.game) this.game.dispose();
    this.game = null;
    this.hud.show(false);
  }

  // ----- Frame loop -----

  handleMenu(m) {
    if (m.dx || m.dy) this.sound.uiMove();
    if (m.confirm) this.sound.uiSelect();
    if (m.back) this.sound.uiBack();
    this.ui.handle(m);
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.lastNow) / 1000);
    this.lastNow = now;
    this.input.poll(dt, now);
    if (this.input.any) this.sound.init();
    this.ui.tickToast(dt);

    switch (this.mode) {
      case 'title':
      case 'map':
      case 'briefing':
      case 'menu':
        this.handleMenu(this.input.menu);
        if (!this.inGame && MENU_MODES.includes(this.mode) && this.input.idleSeconds(now) > IDLE_TO_ATTRACT) {
          this.startAttract();
        }
        break;
      case 'pause':
        this.handleMenu(this.input.menu);
        break;
      case 'results':
        this.handleMenu(this.input.menu);
        break;
      case 'play':
        if (this.input.flight.pause && this.game.state === 'play') {
          this.toPause();
          break;
        }
        this.game.update(dt, this.input.flight);
        if (this.game.state !== 'play' && this.game.endTimer <= 0) this.finishGame();
        break;
      case 'attract':
        if (this.input.any) {
          this.exitAttract();
          break;
        }
        this.game.update(dt, this.autopilot.frame(this.game, dt));
        if (this.game.state !== 'play') {
          this.attractWait += dt;
          if (this.attractWait > 3.2) this.startAttractMission();
        }
        break;
      default:
        break;
    }

    // The backdrop flies on behind the menus; a paused or finished sortie holds still
    // (results still animate its effects and camera).
    if (this.game && this.game.mission === BACKDROP) this.game.update(dt, NO_INPUT);
    else if (this.game && this.mode === 'results') this.game.update(dt, NO_INPUT);
    if (this.game && this.game.mission !== BACKDROP && ['play', 'pause', 'attract', 'results'].includes(this.mode)) {
      this.hud.update(this.game);
    }

    this.render.render();
    requestAnimationFrame((t) => this.frame(t));
  }
}
