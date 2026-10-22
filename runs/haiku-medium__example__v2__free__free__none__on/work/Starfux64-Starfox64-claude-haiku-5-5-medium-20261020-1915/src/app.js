// App flow: title and menus, idle attract loop, stage play, pause, results and game over.
import { STAGES } from './stages.js';
import { Menu } from './menus.js';
import { settings, saveSettings, resetSettings } from './settings.js';
import { arwing } from './models.js';
import { ABOUT_HTML } from './about.js';
import { Vector3 } from 'three/webgpu';

const IDLE_TO_ATTRACT = 10;

// Medal thresholds per stage. Gold also needs every ship kept.
const MEDALS = [
  { gold: 5200, silver: 3200, bronze: 1500 },
  { gold: 4200, silver: 2600, bronze: 1200 },
  { gold: 6800, silver: 4400, bronze: 2200 },
];

export class App {
  constructor({ renderer, input, audio, hud, game, menuRoot, gate }) {
    this.renderer = renderer;
    this.input = input;
    this.audio = audio;
    this.hud = hud;
    this.game = game;
    this.gate = gate;
    this.menu = new Menu(menuRoot, (kind) => this.audio.sfx(kind));
    this.state = 'title';
    this.prev = 'title';
    this.idle = 0;
    this.attractIndex = -1; // first attract run starts on stage 1
    this.stageIndex = 0;
    this.hero = arwing(0xe6ecf5, 0x3a6cff);
    this.hero.scale.setScalar(1.25);
    this.hero.position.set(0, -0.4, -13);
    renderer.scene.add(this.hero);
    this.heroT = 0;
    this.stageBanner = 0;
    this.gateOn = false;
    this.lastResult = null;
    this.resultMedal = null;
    game.emit = (type, res) => this.onGameEvent(type, res);
    input.onDevice = () => this.audio.ensure();
    // Browsers only allow audio after a user gesture; pointer input counts.
    window.addEventListener('pointerdown', () => this.audio.ensure());
  }

  start() {
    this.audio.ensure();
    if (this.touchOnly() && !this.input.padPresent) this.showGate();
    else this.toTitle();
  }

  // Touch-only devices get no touch controls: the game asks for a controller or keyboard.
  touchOnly() {
    return !matchMedia('(any-pointer: fine)').matches && !matchMedia('(any-hover: hover)').matches;
  }

  showGate() {
    this.state = 'gate';
    this.gateOn = true;
    this.menu.hide();
    this.gate.classList.remove('hidden');
    this.gate.querySelector('#gate-settings').onclick = () => this.openOptions('gate');
  }

  hideGate() {
    this.gateOn = false;
    this.gate.classList.add('hidden');
  }

  // Title screen -----------------------------------------------------------
  toTitle() {
    this.game.stop();
    this.game.teardown();
    this.hud.show(false);
    this.hud.clearComms();
    this.hud.setHint('');
    this.hud.hideBoss();
    this.hero.visible = true;
    this.attractOn = false;
    document.getElementById('attract-tag').classList.add('hidden');
    document.getElementById('prompt').classList.add('hidden');
    this.state = 'title';
    this.idle = 0;
    this.audio.playTrack('title');
    this.menu.show({
      title: 'STARFUX 64',
      subtitle: 'A spiritual successor · Demo',
      className: 'title',
      items: [
        { label: 'Start Mission', hint: 'Corvane Outskirts', onSelect: () => this.startStage(0) },
        { label: 'Stage Select', onSelect: () => this.openStageSelect() },
        { label: 'Controls', onSelect: () => this.openControls() },
        { label: 'Options', onSelect: () => this.openOptions('title') },
        { label: 'About & Credits', onSelect: () => this.openAbout('title') },
      ],
      footer: 'Stick or D-pad: move · Cross: select · Circle: back',
    });
  }

  openStageSelect() {
    this.state = 'stageSelect';
    this.menu.show({
      title: 'Stage Select',
      items: STAGES.map((s, i) => ({ label: `${s.id}. ${s.name}`, hint: s.blurb, onSelect: () => this.startStage(i) })).concat([
        { label: 'Back', onSelect: () => this.toTitle() },
      ]),
      onBack: () => this.toTitle(),
      footer: 'Every stage is open in this demo',
    });
  }

  openControls() {
    this.state = 'controls';
    this.menu.show({
      title: 'Controls',
      className: 'wide',
      body: CONTROLS_HTML,
      items: [],
      onBack: () => this.toTitle(),
      footer: 'Circle or Esc: back',
    });
  }

  openAbout(from) {
    this.state = 'about';
    this.aboutFrom = from;
    this.menu.show({
      title: 'About & Credits',
      className: 'wide',
      body: ABOUT_HTML,
      items: [],
      onBack: () => this.back(),
      footer: 'Stick: scroll · Circle or Esc: back',
    });
  }

  back() {
    if (this.aboutFrom === 'pause') this.openPause();
    else if (this.aboutFrom === 'gate') this.showGate();
    else this.toTitle();
  }

  openOptions(from) {
    this.state = 'options';
    this.optionsFrom = from;
    // The gate covers the whole screen, so hide it while its options page is open.
    if (from === 'gate') this.gate.classList.add('hidden');
    const toggle = (label, key, hint) => ({
      kind: 'toggle', label, hint, get: () => settings[key], set: (v) => { settings[key] = v; saveSettings(); },
    });
    const slider = (label, key, min, max, step, fmt, onChange) => ({
      kind: 'slider', label, min, max, step, fmt,
      get: () => settings[key],
      set: (v) => { settings[key] = v; saveSettings(); if (onChange) onChange(); },
    });
    const pct = (v) => `${Math.round(v * 100)}%`;
    this.menu.show({
      title: 'Options',
      subtitle: 'Invert options apply to the left stick in flight and in menus',
      items: [
        toggle('Invert horizontal axis', 'invertX', 'Use if the stick reads left and right backwards'),
        toggle('Invert vertical axis', 'invertY', 'Use if the stick reads up and down backwards'),
        slider('Stick sensitivity', 'sensitivity', 0.5, 1.5, 0.05, pct),
        slider('Stick dead zone', 'deadzone', 0.02, 0.4, 0.01, pct),
        slider('Master volume', 'masterVol', 0, 1, 0.05, pct, () => this.audio.applyVolumes()),
        slider('Music volume', 'musicVol', 0, 1, 0.05, pct, () => this.audio.applyVolumes()),
        slider('Effects volume', 'sfxVol', 0, 1, 0.05, pct, () => this.audio.applyVolumes()),
        toggle('Screen shake and rumble', 'shake'),
        toggle('HUD hints', 'hudHints'),
        {
          label: 'Reset to defaults',
          onSelect: () => {
            resetSettings();
            this.audio.applyVolumes();
            this.openOptions(from);
          },
        },
        { label: 'Back', onSelect: () => this.back2() },
      ],
      onBack: () => this.back2(),
      footer: 'Circle or Esc: back',
    });
  }

  back2() {
    if (this.optionsFrom === 'gate') this.showGate();
    else if (this.optionsFrom === 'pause') this.openPause();
    else this.toTitle();
  }

  // Stage play --------------------------------------------------------------
  startStage(index, attract = false) {
    this.menu.hide();
    this.hideGate();
    this.hero.visible = false;
    this.stageIndex = index;
    this.attractOn = attract;
    this.state = attract ? 'attract' : 'play';
    this.game.startStage(index, { attract });
    this.game.paused = false;
    this.hud.clearComms();
    this.hud.show(!attract);
    document.getElementById('attract-tag').classList.toggle('hidden', !attract);
    document.getElementById('prompt').classList.toggle('hidden', !attract);
  }

  openPause() {
    this.state = 'pause';
    this.game.paused = true;
    this.menu.show({
      title: 'Paused',
      className: 'compact',
      items: [
        { label: 'Resume', onSelect: () => this.resume() },
        { label: 'Controls', onSelect: () => this.openControlsFromPause() },
        { label: 'Options', onSelect: () => this.openOptions('pause') },
        { label: 'Restart Stage', onSelect: () => this.startStage(this.stageIndex) },
        { label: 'Quit to Title', onSelect: () => this.toTitle() },
      ],
      onBack: () => this.resume(),
      footer: 'Options pause · Circle resume',
    });
  }

  openControlsFromPause() {
    this.menu.show({
      title: 'Controls',
      className: 'wide',
      body: CONTROLS_HTML,
      items: [],
      onBack: () => this.openPause(),
      footer: 'Circle or Esc: back',
    });
  }

  resume() {
    this.menu.hide();
    this.state = 'play';
    this.game.paused = false;
  }

  onGameEvent(type, res) {
    this.lastResult = res;
    // The attract loop simply moves on to the next demo stage.
    if (this.attractOn) {
      this.startAttract();
      return;
    }
    if (type === 'stageClear') {
      this.showResults(res);
    } else if (type === 'gameover') {
      this.state = 'gameover';
      this.hud.show(false);
      this.menu.show({
        title: 'Mission Failed',
        subtitle: STAGES[this.stageIndex].name,
        className: 'compact',
        items: [
          { label: 'Retry Stage', onSelect: () => this.startStage(this.stageIndex) },
          { label: 'Title', onSelect: () => this.toTitle() },
        ],
        footer: 'Score ' + res.score.toLocaleString(),
        onBack: () => this.toTitle(),
      });
    }
  }

  showResults(res) {
    this.state = 'results';
    this.hud.show(false);
    const idx = res.stage;
    const m = MEDALS[idx];
    let medal = 'None';
    if (res.score >= m.gold && res.lostShips === 0) medal = 'Gold';
    else if (res.score >= m.silver) medal = 'Silver';
    else if (res.score >= m.bronze) medal = 'Bronze';
    this.resultMedal = medal;
    const last = idx === STAGES.length - 1;
    const secs = Math.round(res.time);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    const body = `<div class="medal ${medal}">${medal === 'None' ? 'NO MEDAL' : medal.toUpperCase()}</div>
      <div class="results">
        <div><span>Score</span><b>${res.score.toLocaleString()}</b></div>
        <div><span>Time</span><b>${mm}:${ss}</b></div>
        <div><span>Kills</span><b>${res.kills}</b></div>
        <div><span>Rings</span><b>${res.rings}</b></div>
        <div><span>Ships lost</span><b>${res.lostShips}</b></div>
        <div><span>Wingmen on station</span><b>${res.wingmenAlive} / 2</b></div>
      </div>`;
    this.menu.show({
      title: res.name,
      subtitle: last ? 'Mission complete' : 'Stage clear',
      className: 'compact',
      body,
      items: [
        {
          label: last ? 'Credits' : `Next: ${STAGES[idx + 1].name}`,
          onSelect: () => {
            if (last) {
              this.openAbout('title');
            } else {
              this.startStage(idx + 1);
            }
          },
        },
        { label: 'Retry Stage', onSelect: () => this.startStage(idx) },
        { label: 'Title', onSelect: () => this.toTitle() },
      ],
      onBack: () => this.toTitle(),
    });
    this.audio.playTrack('title');
  }

  // Attract ----------------------------------------------------------------
  startAttract() {
    this.menu.hide();
    this.attractIndex = (this.attractIndex + 1) % STAGES.length;
    this.hero.visible = false;
    this.startStage(this.attractIndex, true);
  }

  stopAttract() {
    this.game.stop();
    this.game.teardown();
    this.toTitle();
  }

  // Frame ------------------------------------------------------------------
  frame(dt) {
    this.input.update(dt);
    this.hud.tick(dt);
    if (this.input.anyInput()) this.audio.ensure();

    if (this.gateOn) {
      if (this.input.padPresent || this.input.everKey) {
        this.hideGate();
        this.toTitle();
      } else if (this.menu.visible) {
        this.menu.update(this.input);
      }
      this.renderHero(dt);
      return;
    }

    switch (this.state) {
      case 'title':
      case 'stageSelect':
      case 'controls':
      case 'options':
      case 'about':
      case 'results':
      case 'gameover':
      case 'pause':
        this.updateMenuState(dt);
        break;
      case 'play':
        this.updatePlay(dt);
        break;
      case 'attract':
        this.updateAttract(dt);
        break;
      default:
        break;
    }
  }

  updateMenuState(dt) {
    this.menu.update(this.input);
    if (this.state === 'pause' && this.input.pressed('pause')) {
      this.resume();
      return;
    }
    if (this.state === 'title') {
      if (this.input.anyInput()) this.idle = 0;
      else this.idle += dt;
      if (this.idle >= IDLE_TO_ATTRACT) {
        this.startAttract();
        return;
      }
    }
    this.renderHero(dt);
  }

  updatePlay(dt) {
    if (this.input.pressed('pause')) {
      this.openPause();
      this.renderHero(dt);
      return;
    }
    if (this.game.running && !this.game.paused) this.game.update(dt);
    this.game.render(dt);
  }

  updateAttract(dt) {
    if (this.input.anyInput()) {
      this.stopAttract();
      return;
    }
    if (this.game.running) this.game.update(dt);
    this.game.render(dt);
  }

  // Title backdrop: the Arwing turns slowly in front of streaking stars.
  renderHero(dt) {
    this.heroT += dt;
    this.hero.visible = true;
    this.hero.rotation.set(Math.sin(this.heroT * 0.7) * 0.12, Math.sin(this.heroT * 0.4) * 0.6, Math.sin(this.heroT * 0.9) * 0.2);
    const cam = this.renderer.camera;
    if (cam.fov !== this.renderer.baseFov) {
      cam.fov = this.renderer.baseFov;
      cam.updateProjectionMatrix();
    }
    cam.position.set(0, 0, 0);
    cam.lookAt(new Vector3(0, -0.2, -13));
    this.renderer.render(cam, dt, 22);
  }
}

const CONTROLS_HTML = `
<div class="h">CONTROLLER (PS5 layout)</div>
<p><span class="k">Left stick / D-pad</span> fly, or move the menu cursor<br>
<span class="k">Cross</span> boost (hold) · select in menus<br>
<span class="k">L2</span> brake (hold) · <span class="k">R2</span> or <span class="k">Square</span> fire<br>
<span class="k">Hold fire</span> lock on up to 8 targets in the reticle · <span class="k">Release</span> launch homing missiles<br>
<span class="k">L1 / R1</span> barrel roll left / right, which deflects enemy bolts<br>
<span class="k">Circle</span> or <span class="k">Triangle</span> smart bomb (clears the screen ahead)<br>
<span class="k">Options</span> pause · <span class="k">Circle</span> back</p>

<div class="h">KEYBOARD</div>
<p><span class="k">Arrows / WASD</span> fly · <span class="k">Shift</span> boost · <span class="k">Ctrl</span> brake<br>
<span class="k">Space</span> or <span class="k">Z</span> fire (hold to lock) · <span class="k">X</span> or <span class="k">B</span> bomb<br>
<span class="k">Q / E</span> barrel roll · <span class="k">Esc</span> or <span class="k">P</span> pause · <span class="k">Enter</span> select · <span class="k">Esc</span> back</p>

<div class="h">HOW IT PLAYS</div>
<p>Your wingmen fire on their own, and you can lose one. Your shield refills from gold rings. Gold rings with a bomb symbol give a smart bomb.
Each ship you lose costs a life. Lose them all and the mission fails. Medals need a high score and no ships lost.</p>
`;
