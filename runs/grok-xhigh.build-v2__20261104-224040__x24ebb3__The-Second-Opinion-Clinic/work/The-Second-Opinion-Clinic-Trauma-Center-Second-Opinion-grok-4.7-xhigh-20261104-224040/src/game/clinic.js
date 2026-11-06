/** One clinic: title, story, surgery, couch consult, and a hub session. */

import { THREE } from '../../pixel-engine.js';
import { TAGLINE } from '../core/meta.js';
import { applySlider, DEFAULTS, getConfig, resetConfig } from '../core/config.js';
import { clearSave, emptySave, readSave, writeSave } from '../core/save.js';
import { opById, STORY_OPS } from '../content/ops.js';
import { CAST, SCENES } from '../content/story.js';
import { botInput } from '../sim/bot.js';
import { aimOnSurface } from '../sim/aim.js';
import { createOp, devCheat, hashSim, predictSeat, retryStage, step } from '../sim/op.js';
import { SONGS, trackFor } from '../audio/songs.js';
import { promptConfirm, sampleAll, TOOLS, toolIndex } from '../input/devices.js';
import { createView, syncView } from '../view/stage.js';
import { aboutPageLines, clean, drawHud, rowTop } from '../ui/hud.js';

const MENU = ['ON CALL', 'OPERATING LOG', 'CONSULT', 'SETTINGS', 'ABOUT'];
const PAUSE = ['Resume', 'Retry stage', 'Restart', 'Settings', 'Dev mode', 'Quit'];
const CHEATS = [
  ['god', 'God vitals'],
  ['composure', 'Infinite composure'],
  ['freeze', 'Freeze clock'],
  ['mistakes', 'Unlimited mistakes'],
  ['unlock', 'Unlock all'],
];
const ACTIONS = [
  ['complete', 'Complete stage'],
  ['win', 'Win op'],
  ['fail', 'Fail op'],
  ['blue', 'Code blue'],
  ['spawn', 'Spawn pool', { kind: 'pool', x: 0.4, z: 0.2, r: 0.7 }],
  ['spawn', 'Spawn bleeder', { kind: 'bleeder', x: -0.5, z: 0.3, len: 1, dx: 1, dz: 0 }],
  ['spawn', 'Spawn laceration', { kind: 'laceration', x: 1.2, z: -0.2, len: 1.1, dx: 1, dz: 0 }],
  ['spawn', 'Spawn hook', { kind: 'hook', x: -1.5, z: 0.1, pull: 1.1, dx: 0.2, dz: 1 }],
  ['spawn', 'Spawn strain', { kind: 'strain', name: 'introit' }],
  ['copy', 'Copy op JSON'],
];
const DIFFS = ['intern', 'resident', 'attending'];
const REELS = ['op1', 'op2', 'op5', 'pile'];
const SLIDER_STEP = {
  vitalsDrainMul: 0.1, bleedDrain: 0.05, mistakePenalty: 1, maxMistakes: 1, timeLimitMul: 0.1,
  cursorSpeed: 1, steadyFactor: 0.05, aimAssist: 0.1, toolTol: 0.1, drainRate: 0.1, laserTime: 0.05,
  syringeDose: 1, syringeDraw: 0.05, composureGain: 1, quietScale: 0.05, quietDrain: 1, lookCost: 5,
  lookSeconds: 0.5, strainSpeed: 0.1, strainHp: 0.1, diesBpm: 2, blueZone: 0.02, coopScale: 0.05,
};
const SETTINGS_KEY = 'soc:settings';

function now() {
  return globalThis.performance?.now?.() || 0;
}

function pageQuery() {
  try {
    if (typeof location === 'undefined') return new URLSearchParams();
    return new URLSearchParams(location.search);
  } catch {
    return new URLSearchParams();
  }
}

function loadSettings() {
  const base = { glyphs: 'ps', music: 0.1, sound: 1, voices: 1, rumble: true, difficulty: 'resident', aim: 1, cursor: 10 };
  try {
    const raw = globalThis.localStorage?.getItem(SETTINGS_KEY);
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch {
    /* keep defaults */
  }
  return base;
}

export class Clinic {
  name = 'The Second Opinion Clinic';

  constructor(args = {}) {
    this.session = args.session || null;
    this.touchOnly = !!args.touchOnly;
    this.mode = this.session ? 'card' : 'title';
    this.focus = 0;
    this.line = 0;
    this.sceneIndex = 0;
    this.device = 'pad';
    this.settings = loadSettings();
    this.devTab = 0;
    this.jumpKind = 'op';
    this.aboutPage = 0;
    this.drive = 0;
    this.simSpeed = 1;
    this.botSkill = 1;
    this.fps = 0;
    this.idleAt = now();
    this.pulse = 0;
    this.reel = 0;
    this.reelT = 0;
    this.joined = [false, false, false, false];
    this.look = new THREE.Vector3();
    this.rayO = new THREE.Vector3();
    this.rayD = new THREE.Vector3();
    this.padMemory = { pads: [] };
    this.humanInput = {};
    this.padInputs = {};
    this.tagline = TAGLINE;
    this.cardPlayers = [];
    this.allowStore = true;
  }

  async setup(ctx) {
    this.ctx = ctx;
    ctx.input.gamepadButtons = {};
    ctx.input.preventKeys.add('Tab');
    this.view = createView(ctx);
    ctx.audio.register('bark', { wave: 'square', freq: 220, decay: 0.12, volume: 0.35, duty: 0.25 });
    ctx.audio.register('ui', { wave: 'square', freq: 740, freqEnd: 180, decay: 0.07, volume: 0.3, duty: 0.25 });
    let fresh = true;
    try {
      fresh = globalThis.localStorage?.getItem('pixel-engine:audio') == null;
    } catch {
      fresh = true;
    }
    if (fresh) ctx.audio.setVolume('music', 0.1);
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (ev) => this.onKey(ev));
      window.addEventListener('gamepadconnected', () => this.dropGate());
    }
    if (this.session) {
      this.session.onSim = (sim) => { this.sim = sim; };
      this.session.silence = () => {
        ctx.audio.playMusic(null);
        ctx.audio.stopLoops();
      };
      this.mode = 'card';
      return;
    }
    this.applyUrl();
  }

  ready(ctx) {
    this.ctx = ctx;
    ctx.input.gamepadButtons = {};
    const game = this;
    const api = {
      app: game,
      get sim() { return game.sim; },
      goto: (mode) => game.goto(mode),
      config: getConfig(),
      act: (input) => game.act(input),
      get prompts() { return game.promptState(); },
      get music() { return ctx.audio.volume.music; },
      get art() { return { w: ctx.hud.width, h: ctx.hud.height }; },
      engine: ctx.engine,
    };
    if (typeof window !== 'undefined') window.__GAME__ = api;
    if (this.session) {
      const poke = () => globalThis.AIHub?.ready?.();
      poke();
      this.readyTimer = setInterval(poke, 250);
      setTimeout(() => clearInterval(this.readyTimer), 18000);
    }
  }

  fixedUpdate(ctx, dt) {
    if (this.session) return;
    if (this.simHold) return;
    if (this.mode !== 'op' && this.mode !== 'attract') return;
    if (!this.sim || this.sim.phase === 'won' || this.sim.phase === 'lost') return;
    const inputs = {};
    const speed = this.mode === 'attract' ? 1 : this.simSpeed;
    for (let i = 0; i < this.sim.seats.length; i++) inputs[i] = this.seatInput(i, dt);
    step(this.sim, inputs, dt * speed);
    if (this.mode === 'attract') {
      this.reelT += dt;
      if (this.reelT > 12 || this.sim.phase === 'won' || this.sim.phase === 'lost') this.nextReel();
    }
  }

  update(ctx, dt) {
    this.ctx = ctx;
    this.pulse += dt;
    this.swallowed = false;
    if (dt > 0) this.fps = this.fps ? this.fps * 0.85 + (1 / dt) * 0.15 : 1 / dt;
    if (this.session) this.syncSessionMode();
    this.readInput(ctx);
    if (this.session) {
      this.pullSession();
      this.predictLocal(dt);
    }
    if ((this.mode === 'op' || this.mode === 'dev' || this.mode === 'pause') && this.sim && (this.sim.phase === 'won' || this.sim.phase === 'lost')) this.mode = 'results';
    this.maybeAttract();
    this.playScore(ctx);
    this.speak(ctx);
    this.speaker = this.speakerId();
    if (this.view) syncView(this.view, this, this.pulse);
    this.placeCamera(ctx);
    drawHud(ctx, this);
    ctx.input.gamepadButtons = {};
  }

  cameraTarget() {
    return this.look;
  }

  status() {
    if (!this.sim) return `${this.mode} focus=${this.focus}`;
    const vitals = Math.round(this.sim.tables?.[0]?.vitals ?? this.sim.vitals ?? 0);
    return `${this.sim.id} stage=${this.sim.stageIndex} vitals=${vitals} t=${Math.floor(this.sim.timeLeft)} score=${Math.floor(this.sim.score)}`;
  }

  fingerprint() {
    return `${this.mode}|${this.focus}|${this.line}|${this.sim ? hashSim(this.sim) : '0'}`;
  }

  dispose() {
    if (this.readyTimer) clearInterval(this.readyTimer);
    this.session?.silence?.();
  }

  act(input = {}) {
    if (!this.sim) return null;
    const seat = input.seat ?? 0;
    const body = { ...input };
    delete body.seat;
    step(this.sim, { [seat]: body }, 1 / 60);
    return this.sim;
  }

  goto(mode) {
    if ((mode === 'pause' || mode === 'dev') && !this.sim) return;
    this.mode = mode;
    this.focus = 0;
    if (mode === 'dev') this.devTab = 0;
  }

  promptState() {
    const confirm = promptConfirm(this.device, this.settings.glyphs);
    return { confirm, device: this.device, glyphs: this.settings.glyphs };
  }

  promptName() {
    return this.promptState().confirm;
  }

  scene() {
    return SCENES[this.sceneIndex] || null;
  }

  listTitle() {
    if (this.mode === 'call') return 'ON CALL';
    if (this.mode === 'log') return 'OPERATING LOG';
    if (this.mode === 'consult') return 'CONSULT';
    if (this.mode === 'picks') return 'PICK A CASE';
    return 'MAIN';
  }

  listItems() {
    if (this.mode === 'menu') return MENU;
    if (this.mode === 'call') return [`DIFFICULTY ${this.settings.difficulty}`, 'NEW SHIFT', 'CONTINUE'];
    if (this.mode === 'log') return this.logItems();
    if (this.mode === 'consult') return this.consultItems();
    if (this.mode === 'picks') return this.pickItems();
    if (this.mode === 'settings') return this.settingsRows();
    if (this.mode === 'pause') return PAUSE;
    if (this.mode === 'dev') return this.devRows();
    return [];
  }

  settingsRows() {
    const music = Math.round((this.ctx?.audio?.volume?.music ?? this.settings.music) * 100);
    return [
      `GLYPHS ${this.settings.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION'}`,
      `MUSIC ${music}%`,
      `SOUND ${Math.round(this.settings.sound * 100)}%`,
      `VOICES ${Math.round(this.settings.voices * 100)}%`,
      `RUMBLE ${this.settings.rumble ? 'ON' : 'OFF'}`,
      `DIFFICULTY ${this.settings.difficulty}`,
      'RESET',
    ];
  }

  devRows() {
    if (this.devTab === 1) return CHEATS.map((row) => row[1]);
    if (this.devTab === 2) return this.jumpRows();
    if (this.devTab === 3) return ACTIONS.map((row) => row[1]);
    if (this.devTab === 4) {
      return [
        `HITBOXES ${this.hitbox ? 'ON' : 'OFF'}`,
        `BOT PLAYS ${this.forceBot ? 'ON' : 'OFF'}`,
        `BOT SKILL ${this.botSkill.toFixed(1)}`,
        `SIM SPEED ${this.simSpeed.toFixed(1)}`,
        'FRAME STEP',
        `FPS ${Math.round(this.fps || 0)}`,
        this.simLine(),
      ];
    }
    const rows = Object.keys(DEFAULTS).map((key) => `${key} ${trimNum(getConfig()[key])}`);
    rows.push('RESET');
    return rows;
  }

  jumpRows() {
    const kind = this.jumpKind || 'op';
    if (kind === 'stage') {
      const n = this.sim?.stages?.length || 1;
      const rows = ['LIST STAGES'];
      for (let i = 0; i < n; i++) rows.push(`STAGE ${i}`);
      return rows;
    }
    if (kind === 'scene') return ['LIST SCENES', ...SCENES.map((scene) => scene.title)];
    const pile = opById('pile');
    const ops = pile ? STORY_OPS.concat([pile]) : STORY_OPS;
    return ['LIST OPS', ...ops.map((op) => op.title)];
  }

  simLine() {
    const sim = this.sim;
    if (!sim) return 'SIM NONE';
    const vitals = Math.round(sim.tables?.[0]?.vitals ?? sim.vitals ?? 0);
    return `SIM ${sim.phase} V ${vitals} T ${Math.floor(sim.timeLeft)} SC ${Math.floor(sim.score)} M ${sim.mistakes}`;
  }

  seatInput(i, dt) {
    const seat = this.sim.seats[i];
    const skill = this.mode === 'attract' ? 1 : (this.forceBot ? this.botSkill : (seat.botSkill || this.botSkill));
    const human = seat.human && this.mode !== 'attract' && !this.forceBot;
    if (!human) return botInput(this.sim, i, skill, dt);
    const pad = this.padInputs[i];
    const drive = i === this.drive;
    const lastIsPad = this.device === 'pad';
    if (drive && !lastIsPad) return this.humanInput || {};
    if (lastIsPad && pad) return pad;
    if (drive) return this.humanInput || {};
    if (pad) return pad;
    return botInput(this.sim, i, skill, dt);
  }

  frameStep() {
    if (!this.sim || this.sim.phase === 'won' || this.sim.phase === 'lost') return;
    const inputs = {};
    for (let i = 0; i < this.sim.seats.length; i++) inputs[i] = this.seatInput(i, 1 / 60);
    step(this.sim, inputs, (1 / 60) * (this.simSpeed || 1));
  }

  pauseItems() {
    return PAUSE;
  }

  logItems() {
    const save = readSave();
    const rows = STORY_OPS.map((op) => {
      const rec = save?.ops?.[op.id];
      return rec ? `${op.title}  ${rec.rank || '-'}` : `${op.title}  LOCKED`;
    });
    return rows.length ? rows : ['NO CHARTS YET'];
  }

  consultItems() {
    return [0, 1, 2, 3].map((i) => `SEAT ${i + 1}  ${this.joined[i] ? 'IN' : 'OUT'}`).concat(['START']);
  }

  pickItems() {
    return this.choices().map((id) => opById(id)?.title || id);
  }

  aboutLines() {
    return aboutPageLines(this.aboutPage);
  }

  followLine() {
    const rank = this.sim?.rank || 'C';
    const pack = this.opDef?.reyes || this.opDef?.follow || {};
    if (typeof pack === 'string') return pack;
    return pack[rank] || pack.S || 'Chart closed.';
  }

  applyUrl() {
    const q = pageQuery();
    if (q.get('hold') === '1') this.simHold = true;
    if (q.get('attract') === '1') {
      this.startAttract();
      return;
    }
    if (q.get('op')) {
      this.beginOp(q.get('op'), { fromUrl: true, q, consult: Number(q.get('seats') || 1) > 1 });
      if (q.get('dev') === '1') { this.mode = 'dev'; this.devTab = 0; }
      return;
    }
    if (q.get('scene')) {
      const index = SCENES.findIndex((scene) => scene.id === q.get('scene'));
      this.enterScene(index < 0 ? 0 : index, false);
      return;
    }
    this.mode = 'title';
  }

  beginOp(defOrId, opts = {}) {
    const def = typeof defOrId === 'string' ? opById(defOrId) : defOrId;
    if (!def) return null;
    this.opDef = def;
    const q = opts.q;
    const seed = Number(q?.get?.('seed') ?? opts.seed ?? 1);
    const seats = Number(q?.get?.('seats') ?? opts.seats ?? 1);
    const difficulty = q?.get?.('diff') || opts.difficulty || this.settings.difficulty || 'resident';
    if (q?.get?.('bot') === '0') this.forceBot = false;
    else this.forceBot = q?.get?.('bot') === '1' || !!opts.bot;
    if (opts.fromUrl && q?.get?.('hold') === '1') this.simHold = true;
    applySlider('aimAssist', this.settings.aim);
    applySlider('cursorSpeed', this.settings.cursor);
    this.sim = createOp(def, {
      seed: Number.isFinite(seed) ? seed : 1,
      seats: Math.max(1, seats || 1),
      difficulty,
      god: q?.get?.('god') === '1' || !!opts.god,
      consult: !!opts.consult,
    });
    const stage = Number(q?.get?.('stage'));
    if (Number.isFinite(stage) && q?.get?.('stage') != null) devCheat(this.sim, 'stage', stage);
    this.opOpts = { seed, seats, difficulty, god: !!opts.god, consult: !!opts.consult };
    if (this.mode !== 'attract' && this.mode !== 'results' && this.mode !== 'dev') this.mode = 'op';
    return this.sim;
  }

  onKey(ev) {
    if (!this.session || (this.mode !== 'card' && this.mode !== 'session')) return;
    if (ev.key === 'Enter') globalThis.AIHub?.answer?.('ready');
    if (ev.key === 'm' || ev.key === 'M') globalThis.AIHub?.answer?.('more');
    if (ev.key === 'Escape') ev.preventDefault?.();
  }

  syncSessionMode() {
    const hub = globalThis.AIHub;
    if (!hub || !this.session) return;
    this.cardPlayers = hub.players || [];
    const t = hub.time?.() ?? -Infinity;
    if (this.session.sim) this.sim = this.session.sim;
    if (!this.session.ended && t >= 0 && this.sim) this.mode = 'session';
    else if (!this.session.ended) this.mode = 'card';
    this.session.me = hub.me;
  }

  pullSession() {
    const hub = globalThis.AIHub;
    if (!hub) return;
    this.syncSessionMode();
    const me = hub.me;
    const seat = this.sim?.seats?.[me];
    const aim = this.humanInput || {};
    const aimedX = aim.x;
    const aimedZ = aim.z;
    const local = {
      sx: aim.sx || 0,
      sz: aim.sz || 0,
      use: !!aim.use,
      gift: !!aim.gift,
      steady: !!aim.steady,
      tool: aim.tool || seat?.tool || 'forceps',
      place: !!aim.place,
      x: aimedX != null ? aimedX : (seat?.x ?? 0),
      z: aimedZ != null ? aimedZ : (seat?.z ?? 0),
    };
    if (aim.seek) local.seek = true;
    this.session.local = local;
    this.session.me = me;
  }

  predictLocal(dt) {
    const hub = globalThis.AIHub;
    if (!hub || hub.isHost || !this.sim || this.mode !== 'session') return;
    const me = hub.me;
    if (!Number.isInteger(me)) return;
    predictSeat(this.sim, me, this.session.local || {}, dt);
  }

  readInput(ctx) {
    const input = ctx.input;
    const pads = sampleAll(this.padMemory);
    const key = this.anyKey(input);
    const click = input.wasPressed('MouseLeft');
    const right = input.wasPressed('MouseRight');
    const moved = Math.hypot(input.mouseDelta?.x || 0, input.mouseDelta?.y || 0) > 0.4;
    const px = input.pointer?.x;
    const py = input.pointer?.y;
    const pointerMoved = this.lastPx != null && px != null && (Math.abs(px - this.lastPx) > 0.002 || Math.abs(py - this.lastPy) > 0.002);
    if (px != null) {
      this.lastPx = px;
      this.lastPy = py;
    }
    const pointed = moved || pointerMoved;
    if (key) this.device = 'key';
    else if (click || right || pointed) this.device = 'mouse';
    else if (pads.any) this.device = 'pad';
    const button = key || click || right || pads.any;
    if (this.holdOff) {
      if (button || moved) return;
      this.holdOff = false;
    }
    if (this.mode === 'attract' && (button || pointed)) {
      this.exitAttract();
      this.holdOff = true;
      return;
    }
    if (button || pointed) this.idleAt = now();
    this.buildSeatInputs(input, pads);
    if (this.session) {
      this.readCard(input, pads);
      return;
    }
    if (this.mode === 'title') {
      if (button) this.goto('menu');
      return;
    }
    const count = this.listItems().length;
    if (input.wasPressed('ArrowDown') || input.wasPressed('KeyS') || pads.pads.some((p) => p.down)) this.bump(1, count);
    if (input.wasPressed('ArrowUp') || input.wasPressed('KeyW') || pads.pads.some((p) => p.up)) this.bump(-1, count);
    if (input.wasPressed('End')) this.focus = Math.max(0, count - 1);
    if (input.wasPressed('Home')) this.focus = 0;
    if (pointed && !key) this.hover(input, count);
    const confirm = input.wasPressed('Enter') || input.wasPressed('Space') || click || pads.pads.some((p) => p.useEdge);
    const back = input.wasPressed('Escape') || right || pads.pads.some((p) => p.back);
    const left = input.wasPressed('ArrowLeft') || pads.pads.some((p) => p.left);
    const rightEdge = input.wasPressed('ArrowRight') || pads.pads.some((p) => p.right);
    const tabL = input.wasPressed('KeyQ') || pads.pads.some((p) => p.l1);
    const tabR = input.wasPressed('KeyE') || pads.pads.some((p) => p.r1);
    if (pads.pads.some((p) => p.options) || (input.wasPressed('Escape') && (this.mode === 'op' || this.mode === 'pause'))) {
      this.togglePause();
      return;
    }
    if (left) this.nudge(-1);
    if (rightEdge) this.nudge(1);
    if (tabL) this.tab(-1);
    if (tabR) this.tab(1);
    if (back && this.mode !== 'op') this.back();
    else if (confirm) this.confirm();
    pads.pads.forEach((pad) => {
      if (pad.useEdge && this.mode === 'consult') this.joined[pad.index] = true;
      if (pad.back && this.mode === 'consult') this.joined[pad.index] = false;
    });
  }

  buildSeatInputs(input, pads) {
    this.padInputs = {};
    for (const pad of pads.pads) {
      const row = { sx: pad.sx, sz: pad.sz, use: pad.use, gift: pad.gift, steady: pad.steady };
      if (pad.tool) row.tool = pad.tool;
      if (pad.left) row.table = Math.max(0, (this.sim?.active || 0) - 1);
      if (pad.right) row.table = (this.sim?.active || 0) + 1;
      this.padInputs[pad.index] = row;
      if (this.settings.rumble && pad.use) this.rumble(pad.index);
    }
    const row = { sx: 0, sz: 0, use: false, gift: false, steady: false };
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) row.sx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) row.sx += 1;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) row.sz -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) row.sz += 1;
    row.use = input.isDown('MouseLeft') || input.isDown('KeyJ');
    row.gift = input.isDown('Space');
    row.steady = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    for (let n = 1; n <= 8; n++) if (input.wasPressed(String(n))) row.tool = TOOLS[n - 1];
    if (input.wasPressed('KeyQ')) {
      const cur = toolIndex(row.tool || this.sim?.seats?.[this.drive]?.tool || 'drain');
      row.tool = TOOLS[(cur + 7) % 8];
    }
    if (input.wheel) {
      const cur = toolIndex(row.tool || this.sim?.seats?.[0]?.tool || 'drain');
      row.tool = TOOLS[(cur + (input.wheel > 0 ? 1 : 7)) % 8];
    }
    if (input.wasPressed('Tab') && this.sim) row.table = ((this.sim.active || 0) + 1) % this.sim.tables.length;
    if (input.wasPressed('KeyE') && this.sim?.def?.partner && this.mode === 'op') this.drive = this.drive ? 0 : 1;
    if (input.wasPressed('KeyF')) row.tool = 'syringe';
    if (this.device === 'mouse' && this.sim && this.ctx?.camera?.rayAt && (this.mode === 'op' || this.mode === 'session')) {
      this.ctx.camera.rayAt(input.pointer.x, input.pointer.y, this.rayO, this.rayD);
      const hit = aimOnSurface(this.sim.arena || 'forearm', this.rayO, this.rayD, this.pulse);
      row.place = true;
      row.x = hit.x;
      row.z = hit.z;
    }
    if (this.device === 'pad' && this.padInputs[0]) this.humanInput = { ...this.padInputs[0], ...row.tool ? { tool: row.tool } : {} };
    else this.humanInput = row;
  }

  anyKey(input) {
    const keys = ['Enter', 'Space', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyJ', 'KeyK', 'KeyF', 'KeyM', 'Tab', 'Home', 'End'];
    if (keys.some((key) => input.wasPressed(key))) return true;
    for (let n = 1; n <= 8; n++) if (input.wasPressed(String(n))) return true;
    return false;
  }

  readCard(input, pads) {
    if (this.mode !== 'card') return;
    if (input.wasPressed('Enter') || pads.pads.some((p) => p.useEdge)) globalThis.AIHub?.answer?.('ready');
    if (input.wasPressed('KeyM') || pads.pads.some((p) => p.triangle)) globalThis.AIHub?.answer?.('more');
  }

  bump(delta, count) {
    if (!count || this.mode === 'op' || this.mode === 'session' || this.mode === 'attract') return;
    this.focus = (this.focus + delta + count * 4) % count;
    this.ctx?.audio?.play('ui', { volume: this.settings.sound });
  }

  hover(input, count) {
    if (!count || !input.pointer?.over) return;
    const y = (1 - (input.pointer.y + 1) / 2) * this.ctx.hud.height;
    for (let i = 0; i < count; i++) {
      const top = this.mode === 'pause' ? 64 + i * 22 : this.mode === 'dev' ? 58 + i * 16 : rowTop(i);
      if (y >= top - 4 && y <= top + 20) this.focus = i;
    }
  }

  confirm() {
    if (this.mode === 'menu') this.pickMenu();
    else if (this.mode === 'call') this.pickCall();
    else if (this.mode === 'settings') this.pickSettings();
    else if (this.mode === 'story') this.advanceLine();
    else if (this.mode === 'brief') this.startBriefed();
    else if (this.mode === 'results') this.advanceStory();
    else if (this.mode === 'credits') this.finishCredits();
    else if (this.mode === 'pause') this.pickPause();
    else if (this.mode === 'dev') this.pickDev();
    else if (this.mode === 'about') this.aboutPage = (this.aboutPage + 1) % 5;
    else if (this.mode === 'consult') this.pickConsult();
    else if (this.mode === 'picks') this.pickCase();
    else if (this.mode === 'log') this.focus = (this.focus + 1) % Math.max(1, this.listItems().length);
  }

  back() {
    if (this.mode === 'dev') this.mode = 'pause';
    else if (this.mode === 'pause') this.mode = 'op';
    else if (this.mode === 'settings' && this.sim && this.returnMode) this.mode = this.returnMode;
    else if (this.mode === 'call' || this.mode === 'log' || this.mode === 'consult' || this.mode === 'settings' || this.mode === 'about' || this.mode === 'picks') this.goto('menu');
    else if (this.mode === 'story') this.skipScene();
  }

  pickMenu() {
    const item = MENU[this.focus] || MENU[0];
    if (item === 'ON CALL') this.goto('call');
    else if (item === 'OPERATING LOG') this.goto('log');
    else if (item === 'CONSULT') { this.joined = [false, false, false, false]; this.goto('consult'); }
    else if (item === 'SETTINGS') { this.returnMode = 'menu'; this.goto('settings'); }
    else if (item === 'ABOUT') { this.aboutPage = 0; this.goto('about'); }
  }

  pickCall() {
    if (this.focus === 1) this.newShift();
    else if (this.focus === 2) this.continueShift();
  }

  newShift() {
    if (this.mode === 'attract') return;
    clearSave();
    this.enterScene(0, true);
  }

  continueShift() {
    const save = readSave();
    if (!save || !save.scenes?.length) {
      this.newShift();
      return;
    }
    const next = Math.min(SCENES.length - 1, save.scenes.length);
    this.enterScene(next, false);
  }

  enterScene(index, write) {
    this.sceneIndex = index;
    this.line = 0;
    this.spoken = -1;
    this.mode = 'story';
    if (!write || this.mode === 'attract') return;
    const save = readSave() || emptySave();
    const id = SCENES[index]?.id;
    if (id && !save.scenes.includes(id)) save.scenes.push(id);
    save.difficulty = this.settings.difficulty;
    writeSave(save);
  }

  advanceLine() {
    const scene = this.scene();
    if (!scene) return;
    this.line += 1;
    if (this.line < scene.lines.length) return;
    if (scene.op) {
      this.opDef = opById(scene.op);
      this.mode = 'brief';
    } else this.mode = 'credits';
  }

  skipScene() {
    const scene = this.scene();
    if (!scene) return;
    this.line = scene.lines.length;
    this.advanceLine();
  }

  startBriefed() {
    if (!this.opDef) return;
    this.beginOp(this.opDef, { difficulty: this.settings.difficulty, seed: 1 });
  }

  advanceStory() {
    if (this.mode === 'attract') return;
    const save = readSave() || emptySave();
    const scene = this.scene();
    if (scene && !save.scenes.includes(scene.id)) save.scenes.push(scene.id);
    if (this.opDef && this.sim) {
      save.ops[this.opDef.id] = { rank: this.sim.rank, score: this.sim.finalScore || 0, won: this.sim.phase === 'won' };
      if (this.opDef.id === 'op3' && this.sim.phase === 'won') save.quiet = true;
    }
    writeSave(save);
    const next = this.sceneIndex + 1;
    if (next >= SCENES.length) {
      save.log = true;
      save.credits = true;
      writeSave(save);
      this.mode = 'credits';
      return;
    }
    this.enterScene(next, true);
  }

  finishCredits() {
    const save = readSave() || emptySave();
    save.log = true;
    save.credits = true;
    if (this.mode !== 'attract') writeSave(save);
    this.sim = null;
    this.goto('title');
  }

  togglePause() {
    if (this.session) return;
    if (this.mode === 'op') { this.mode = 'pause'; this.focus = 0; }
    else if (this.mode === 'pause') this.mode = 'op';
  }

  pickPause() {
    const item = PAUSE[this.focus];
    if (item === 'Resume') this.mode = 'op';
    else if (item === 'Retry stage') { retryStage(this.sim); this.mode = 'op'; }
    else if (item === 'Restart') { this.beginOp(this.opDef, this.opOpts || {}); this.mode = 'op'; }
    else if (item === 'Settings') { this.returnMode = 'pause'; this.mode = 'settings'; this.focus = 0; }
    else if (item === 'Dev mode') { this.mode = 'dev'; this.devTab = 0; this.focus = 0; }
    else if (item === 'Quit') { this.sim = null; this.goto('menu'); }
  }

  pickDev() {
    if (!this.sim) return;
    if (this.devTab === 0) {
      if (this.focus >= Object.keys(DEFAULTS).length) resetConfig();
      return;
    }
    if (this.devTab === 1) devCheat(this.sim, CHEATS[this.focus]?.[0] || 'god');
    else if (this.devTab === 2) this.pickJump();
    else if (this.devTab === 3) {
      const row = ACTIONS[this.focus] || ACTIONS[0];
      if (row[0] === 'copy') {
        this.copied = JSON.stringify(this.opDef || {});
        console.log(this.copied);
      } else if (row[0] === 'spawn') devCheat(this.sim, 'spawn', row[2]);
      else devCheat(this.sim, row[0]);
    } else if (this.devTab === 4) {
      if (this.focus === 0) this.hitbox = !this.hitbox;
      else if (this.focus === 1) this.forceBot = !this.forceBot;
      else if (this.focus === 4) this.frameStep();
    }
  }

  pickJump() {
    if (this.focus === 0) return;
    const index = this.focus - 1;
    if (this.jumpKind === 'stage') {
      devCheat(this.sim, 'stage', index);
      this.mode = 'op';
      return;
    }
    if (this.jumpKind === 'scene') {
      this.enterScene(index, false);
      return;
    }
    const pile = opById('pile');
    const ops = pile ? STORY_OPS.concat([pile]) : STORY_OPS;
    const op = ops[index];
    if (!op) return;
    this.beginOp(op, { difficulty: this.settings.difficulty, seed: 1 });
    this.mode = 'op';
  }

  nudge(dir) {
    if (this.mode === 'call' && this.focus === 0) {
      const i = Math.max(0, DIFFS.indexOf(this.settings.difficulty));
      this.settings.difficulty = DIFFS[(i + dir + DIFFS.length) % DIFFS.length];
      this.persistSettings();
      return;
    }
    if (this.mode === 'settings') {
      this.nudgeSetting(dir);
      return;
    }
    if (this.mode !== 'dev') return;
    if (this.devTab === 0) {
      const keys = Object.keys(DEFAULTS);
      if (this.focus >= keys.length) return;
      const key = keys[this.focus];
      applySlider(key, getConfig()[key] + dir * (SLIDER_STEP[key] || 0.1));
    } else if (this.devTab === 2 && this.focus === 0) {
      const kinds = ['op', 'stage', 'scene'];
      const i = Math.max(0, kinds.indexOf(this.jumpKind || 'op'));
      this.jumpKind = kinds[(i + (dir < 0 ? -1 : 1) + kinds.length) % kinds.length];
    } else if (this.devTab === 4) {
      if (this.focus === 2) this.botSkill = clamp(this.botSkill + dir * 0.1, 0, 1);
      if (this.focus === 3) this.simSpeed = clamp(this.simSpeed + dir * 0.1, 0.1, 3);
    }
  }

  nudgeSetting(dir) {
    const s = this.settings;
    if (this.focus === 0) s.glyphs = s.glyphs === 'xbox' ? 'ps' : 'xbox';
    else if (this.focus === 1) {
      s.music = clamp((this.ctx?.audio?.volume?.music ?? s.music) + dir * 0.1, 0, 1);
      this.ctx?.audio?.setVolume('music', s.music);
    } else if (this.focus === 2) s.sound = clamp(s.sound + dir * 0.1, 0, 1);
    else if (this.focus === 3) s.voices = clamp(s.voices + dir * 0.1, 0, 1);
    else if (this.focus === 4) s.rumble = !s.rumble;
    else if (this.focus === 5) {
      const i = Math.max(0, DIFFS.indexOf(s.difficulty));
      s.difficulty = DIFFS[(i + (dir < 0 ? -1 : 1) + DIFFS.length) % DIFFS.length];
    } else if (this.focus === 6 && dir) {
      this.settings = loadSettings();
      this.settings.glyphs = 'ps';
      this.settings.music = 0.1;
      this.ctx?.audio?.setVolume('music', 0.1);
    }
    this.persistSettings();
  }

  pickSettings() {
    if (this.focus === 0) this.nudgeSetting(1);
    else if (this.focus === 6) this.nudgeSetting(1);
  }

  tab(dir) {
    if (this.mode === 'dev') {
      this.devTab = (this.devTab + dir + 5) % 5;
      this.focus = 0;
    } else if (this.mode === 'about') this.aboutPage = (this.aboutPage + dir + 5) % 5;
  }

  pickConsult() {
    if (this.focus < 4) this.joined[this.focus] = !this.joined[this.focus];
    else this.goto('picks');
  }

  choices() {
    const save = readSave();
    const ids = ['pile'];
    for (const op of STORY_OPS) {
      if (op.id === 'op3' || op.id === 'op9') continue;
      if (save?.ops?.[op.id]?.won) ids.push(op.id);
    }
    return ids;
  }

  pickCase() {
    const id = this.choices()[this.focus] || 'pile';
    const seats = Math.max(1, this.joined.filter(Boolean).length || 1);
    this.joined.forEach((on, i) => { if (on) this.padInputs[i] = this.padInputs[i] || { sx: 0, sz: 0, use: false }; });
    this.beginOp(id, { consult: true, seats, difficulty: this.settings.difficulty, seed: 1 });
  }

  startAttract() {
    this.allowStore = false;
    this.mode = 'attract';
    this.reel = 0;
    this.reelT = 0;
    this.beginOp(REELS[0], { god: true, bot: true, seats: 1 });
    this.mode = 'attract';
  }

  nextReel() {
    this.reel = (this.reel + 1) % REELS.length;
    const id = REELS[this.reel];
    this.mode = 'attract';
    this.beginOp(id, { god: true, bot: true, seats: id === 'pile' ? 4 : 1, consult: id === 'pile' });
    this.mode = 'attract';
    this.reelT = 0;
  }

  exitAttract() {
    this.mode = 'title';
    this.sim = null;
    this.focus = 0;
    this.forceBot = false;
    this.allowStore = true;
    this.idleAt = now();
    this.swallowed = true;
  }

  maybeAttract() {
    if (typeof document === 'undefined') return;
    if (this.session) return;
    const idleScreens = new Set(['title', 'menu', 'call', 'log', 'consult', 'picks', 'settings', 'about']);
    if (!idleScreens.has(this.mode)) return;
    if (now() - this.idleAt >= 10000) this.startAttract();
  }

  playScore(ctx) {
    const name = trackFor(this.mode, this.sim);
    if (name === this.track) return;
    this.track = name;
    ctx.audio.playMusic(name ? SONGS[name] : null, name || undefined);
  }

  speak(ctx) {
    if (this.mode !== 'story') return;
    if (this.spoken === this.line) return;
    this.spoken = this.line;
    const line = this.scene()?.lines?.[this.line];
    if (!line) return;
    const pitch = CAST[line.who]?.pitch || 1;
    const semis = Math.round(12 * Math.log2(pitch));
    ctx.audio.play('bark', { pitch: semis, volume: 0.4 * (this.settings.voices || 1) });
  }

  speakerId() {
    if (this.mode === 'story') return this.scene()?.lines?.[this.line]?.who || 'ilya';
    if (this.mode === 'brief') return 'reyes';
    if (this.mode === 'card') return 'reyes';
    return 'ilya';
  }

  persistSettings() {
    if (!this.allowStore || this.mode === 'attract') return;
    try {
      globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* private mode */
    }
  }

  placeCamera(ctx) {
    const cam = ctx.camera?.camera;
    if (!cam) return;
    let x = 0.6;
    let y = 2.2;
    let z = 5.2;
    if (this.mode === 'op' || this.mode === 'attract' || this.mode === 'session' || this.mode === 'pause' || this.mode === 'dev' || this.mode === 'results') {
      x = 0; y = 9.6; z = 3.1;
      this.look.set(0, 0, 0.1);
    } else if (this.mode === 'story' || this.mode === 'brief') {
      x = 0; y = 1.7; z = 2.6;
      this.look.set(0, 1.25, -0.2);
    } else {
      this.look.set(0, 1.2, -0.5);
    }
    cam.position.set(x, y, z);
    cam.lookAt(this.look);
  }

  rumble(index) {
    try {
      const pads = globalThis.navigator?.getGamepads?.() || [];
      const pad = pads[index];
      pad?.vibrationActuator?.playEffect?.('dual-rumble', { duration: 30, strongMagnitude: 0.25, weakMagnitude: 0.4 });
    } catch {
      /* no actuator */
    }
  }

  dropGate() {
    const gate = typeof document !== 'undefined' ? document.getElementById('touch-gate') : null;
    gate?.remove();
    this.touchOnly = false;
  }
}

function trimNum(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

void clean;
