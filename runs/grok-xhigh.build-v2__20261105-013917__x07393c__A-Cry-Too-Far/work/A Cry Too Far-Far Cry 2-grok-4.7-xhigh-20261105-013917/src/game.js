import { THREE, GrassField, PALETTE, applySky, skyAt } from '../pixel-engine.js';
import { GAME_TITLE } from './content/title.js';
import { SLIDER_KEYS, TUNING_DEFAULTS, TUNING_RANGES } from './content/tuning-defaults.js';
import { aboutPages } from './content/about.js';
import { SONGS } from './audio/songs.js';
import { registerSfx } from './audio/sfx.js';
import { say } from './audio/voice.js';
import { LOOK, installLook, setWantLock } from './core/look.js';
import { TUNING } from './core/tuning.js';
import { applySlider, resetSliders } from './core/balance.js';
import { readSave, readSettings, writeSave, writeSettings } from './core/save.js';
import { World } from './sim/world.js';
import { CashRound } from './sim/round.js';
import { linkSession, soloSession } from './net/session.js';
import { promptList } from './ui/glyphs.js';

const target = new THREE.Vector3();
const eye = new THREE.Vector3();

const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyR', 'KeyQ', 'KeyM', 'KeyH', 'KeyF', 'KeyC', 'KeyJ', 'Enter', 'Space', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'MouseLeft'];
const PADS = ['PadCross', 'PadCircle', 'PadSquare', 'PadTriangle', 'PadUp', 'PadDown', 'PadLeft', 'PadRight', 'PadOptions', 'PadCreate', 'PadL1', 'PadR1', 'PadL2', 'PadR2'];

function pressed(input, codes) {
  return codes.some((code) => input.wasPressed(code));
}

export function touchGateActive() {
  if (typeof matchMedia !== 'function') return false;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const fine = matchMedia('(any-pointer: fine)').matches;
  let pad = false;
  try {
    pad = [...(navigator.getGamepads?.() || [])].some(Boolean);
  } catch { /* no pad list */ }
  return coarse && !fine && !pad;
}

export function createGame(options = {}) {
  return new BasinGame(options);
}

export class BasinGame {
  constructor(options = {}) {
    this.name = GAME_TITLE;
    this.options = options;
    this.session = options.session || null;
    this.mode = this.session ? 'card' : 'title';
    this.screen = this.mode;
    this.focus = 0;
    this.device = 'pad';
    this.glyphSet = 'playstation';
    this.notice = '';
    this.touchGate = false;
    this.attract = false;
    this.idle = 0;
    this.frame = 0;
    this.page = 0;
    this.musicName = '';
    this.musicT = 0;
    this.saveDisabled = false;
    this.saves = 0;
    this.ending = null;
    this.card = null;
    this.round = null;
    this.ended = false;
    this.world = null;
    this.ctx = null;
    this.netTimer = null;
    this.returnScreen = 'title';
    this.beat = 0;
    this.beatT = 0;
    this.look = { override: null, enabled: false, sensX: 1, sensY: 1, invertY: false };
    this.bot = null;
    this.volumes = { music: 0.1, sfx: 1, voice: 1 };
    this.devTab = 0;
    this.rows = [];
    if (this.session) this.bindSession(this.session);
  }

  bindSession(session) {
    session.on('card', (card) => { this.card = card; });
    session.on('start', () => this.beginRound());
    session.on('time-up', () => {
      if (this.round) this.round.finish('time-up');
      else if (session.isHost) {
        const ids = (session.players || []).map((p) => p.id);
        session.finish({ standings: ids.length ? [ids] : [], scores: {}, stats: {}, awards: [] });
      }
    });
    session.on('end', () => this.onSessionEnd());
    session.on('leave', (ev) => {
      if (!this.round || !session.isHost) return;
      const id = ev && ev.id;
      this.round.seats = this.round.seats.filter((s) => s.id !== id);
      if (this.round.seats.length === 0) this.round.finish('leave');
    });
    session.on('message', (data) => {
      if (!data) return;
      if (this.session?.isHost && this.round) this.round.applyClient(data);
      else if (data.t === 's' && this.round) this.round.applySnapshot(data);
      else if (data.t === 'finish') {
        if (this.session) {
          this.session.outcome = data.outcome;
          this.session.ended = true;
        }
        this.onSessionEnd();
      }
    });
    this.ensureNet();
  }

  ensureNet() {
    if (this.netTimer) clearInterval(this.netTimer);
    this.netTimer = null;
    if (this.session) this.netTimer = setInterval(() => this.netTick(), 80);
  }

  blocksSim() {
    if (this.ended) return true;
    return this.mode !== 'play' && this.mode !== 'attract' && this.mode !== 'round';
  }

  setup(ctx) {
    this.ctx = ctx;
    const cam = ctx.camera.camera;
    cam.far = 1000;
    cam.updateProjectionMatrix();
    installLook(ctx, this.look);
    this.world = new World(this, ctx);
    this.world.build();
    registerSfx(ctx.audio);
    ctx.audio.persist = false;
    const saved = this.session ? null : readSettings();
    if (saved?.volumes) this.volumes = { ...this.volumes, ...saved.volumes };
    if (saved?.glyphSet) this.glyphSet = saved.glyphSet;
    if (saved?.invertY) this.look.invertY = true;
    if (saved?.sensX) this.look.sensX = saved.sensX;
    ctx.audio.setVolume('music', this.volumes.music);
    ctx.audio.setVolume('sfx', this.volumes.sfx);
    this.touchGate = !!(this.options.touchOnly || touchGateActive());
    if (this.touchGate) this.notice = 'Controller or keyboard required';
    if (typeof document !== 'undefined') {
      this.grass = new GrassField({
        area: [90, 90],
        at: [0, 40, 40],
        count: 1200,
        height: [0.55, 1.2],
        width: 0.13,
        base: PALETTE.orange,
        tip: PALETTE.sand,
        ground: (x, z) => this.world.ground(x, z),
      });
      ctx.scene.add(this.grass);
    }
    this.playSong(this.session ? 'fight' : 'title');
    setWantLock(false);
  }

  ready(ctx) {
    this.ctx = ctx;
    if (typeof window !== 'undefined') window.__GAME__ = this;
    this.session?.ready();
    this.ensureNet();
  }

  beginRound() {
    if (!this.world || !this.session || this.round) return;
    this.mode = 'round';
    this.screen = 'round';
    this.round = new CashRound(this.world, this.session);
    this.world.round = this.round;
    if (this.ctx?.engine) this.ctx.engine.timeScale = 1;
    setWantLock(!this.session.server);
  }

  netTick() {
    const session = this.session;
    if (!session || session.ended || !this.round || !this.world) return;
    if (session.isHost) session.send(this.round.snapshot(), { reliable: false });
    else if (!session.server) {
      const p = this.world.feet();
      session.send({ t: 'me', id: session.me, x: p.x, z: p.z, yaw: this.ctx?.camera?.yaw || 0, carrying: this.round.seat(session.me)?.carrying || null }, { reliable: false });
    }
  }

  onSessionEnd() {
    this.ended = true;
    if (this.ctx?.audio) {
      this.ctx.audio.stopMusic();
      this.ctx.audio.stopLoops();
    }
    if (this.ctx?.engine) this.ctx.engine.timeScale = 0;
  }

  fixedUpdate(_ctx, dt) {
    if (!this.world) return;
    this.world.fixed(dt);
  }

  update(ctx, dt) {
    this.ctx = ctx;
    this.frame += 1;
    this.musicT += dt;
    this.trackDevice(ctx);
    if (this.touchGate && this.realControl(ctx)) {
      this.touchGate = false;
      this.notice = '';
    }
    if (this.menuArm > 0) this.menuArm = Math.max(0, this.menuArm - dt);
    this.trackIdle(ctx, dt);
    if (this.mode === 'attract') {
      if (this.freshInput(ctx)) this.exitAttract();
      else this.stepAttract(dt);
    } else if (this.mode === 'card') this.cardInput(ctx);
    else if (this.mode === 'play' || this.mode === 'round') this.playChrome(ctx);
    else this.menuInput(ctx);
    this.look.enabled = (this.mode === 'play' || this.mode === 'round' || this.mode === 'attract') && !this.world?.map.up && !this.look.override;
    if (this.grass) this.grass.update(ctx.time);
    if (this.world && typeof document !== 'undefined') applySky(ctx.engine, skyAt(this.world.hour));
    this.world?.syncViews();
    this.draw(ctx);
  }

  cameraTarget() {
    const f = this.world ? this.world.feet() : { x: 0, y: 42, z: 40 };
    const y = this.world?.crouch ? 1.15 : 1.62;
    return target.set(f.x, f.y + y, f.z);
  }

  eyePosition() {
    return eye.copy(this.cameraTarget());
  }

  onCameraChange(ctx) {
    installLook(ctx, this.look);
  }

  onDeath() {
    this.mode = 'gameover';
    this.screen = 'gameover';
    this.menuArm = 0.6;
    if (this.ctx?.engine) this.ctx.engine.timeScale = 0;
  }

  showEnding(which) {
    this.ending = which === 'walk' ? 'walk' : 'give';
    this.mode = 'ending';
    this.screen = 'ending';
    this.menuArm = 0.6;
    this.world.subtitle = this.ending === 'walk' ? 'YOU WALKED OUT WITH THE SHEET.' : 'YOU GAVE THEM THE SHEET.';
  }

  applySlider(key, value) {
    return applySlider(this.world, key, value);
  }

  resetSliders() {
    resetSliders(this.world);
  }

  playSong(name) {
    const song = SONGS[name];
    if (!song || !this.ctx?.audio || this.musicName === name) return;
    this.musicName = name;
    this.musicT = 0;
    this.ctx.audio.playMusic(song, name);
  }

  save() {
    if (this.saveDisabled || !this.world || this.session) return false;
    const w = this.world;
    const p = w.feet();
    const ok = writeSave({
      v: 1,
      hp: w.hp,
      stones: w.stones,
      tablets: w.tablets,
      syrettes: w.syrettes,
      hour: w.hour,
      x: p.x,
      z: p.z,
      flags: [...w.flags],
      sheet: w.sheet,
      ledger: w.ledger,
      fire: w.fire.encode(),
    });
    if (ok) this.saves += 1;
    return ok;
  }

  load() {
    const data = readSave();
    if (!data || !this.world) return false;
    this.world.hp = data.hp ?? 100;
    this.world.stones = data.stones ?? 0;
    this.world.tablets = data.tablets ?? 0;
    this.world.syrettes = data.syrettes ?? 0;
    this.world.hour = data.hour ?? 9;
    this.world.gameHours = this.world.hour;
    this.world.flags = new Set(data.flags || []);
    this.world.sheet = data.sheet || null;
    if (data.ledger) this.world.ledger = { ...this.world.ledger, ...data.ledger };
    if (data.fire) this.world.fire.decode(data.fire);
    this.world.teleport(data.x || 0, data.z || 40);
    this.mode = 'play';
    this.screen = 'play';
    if (this.ctx?.engine) this.ctx.engine.timeScale = 1;
    return true;
  }

  storeSettings() {
    writeSettings({ volumes: this.volumes, glyphSet: this.glyphSet, invertY: this.look.invertY, sensX: this.look.sensX });
  }

  items() {
    if (this.touchGate && (this.screen === 'title' || this.screen === 'menu')) return [{ id: 'settings', label: 'SETTINGS' }];
    if (this.screen === 'title') return [{ id: 'menu', label: 'PRESS TO START' }];
    if (this.screen === 'menu') {
      const rows = [];
      if (readSave()) rows.push({ id: 'continue', label: 'CONTINUE' });
      rows.push({ id: 'new', label: 'NEW GAME' }, { id: 'cash', label: 'CASH RUN' }, { id: 'settings', label: 'SETTINGS' }, { id: 'about', label: 'ABOUT AND CREDITS' });
      return rows;
    }
    if (this.screen === 'cash') {
      return [
        { id: 'solo', label: 'SOLO WITH HIRED GUNS' },
        { id: 'host', label: 'HOST ON THIS COMPUTER' },
        { id: 'join', label: 'JOIN ON THIS COMPUTER' },
        { id: 'back', label: 'BACK' },
      ];
    }
    if (this.screen === 'pause') {
      if (this.session) return [{ id: 'resume', label: 'RESUME' }, { id: 'settings', label: 'SETTINGS' }];
      return [
        { id: 'resume', label: 'RESUME' },
        { id: 'ledger', label: 'LEDGER' },
        { id: 'settings', label: 'SETTINGS' },
        { id: 'dev', label: 'DEV MODE' },
        { id: 'about', label: 'ABOUT AND CREDITS' },
        { id: 'quit', label: 'QUIT TO TITLE' },
      ];
    }
    if (this.screen === 'settings') {
      return [
        { id: 'music', label: 'MUSIC ' + Math.round(this.volumes.music * 100) },
        { id: 'sfx', label: 'EFFECTS ' + Math.round(this.volumes.sfx * 100) },
        { id: 'voice', label: 'VOICES ' + Math.round(this.volumes.voice * 100) },
        { id: 'glyphs', label: 'GLYPHS ' + (this.glyphSet === 'xbox' ? 'XBOX' : 'PLAYSTATION') },
        { id: 'invert', label: 'INVERT Y ' + (this.look.invertY ? 'ON' : 'OFF') },
        { id: 'reset-settings', label: 'RESET TO DEFAULTS' },
        { id: 'back', label: 'BACK' },
      ];
    }
    if (this.screen === 'about') return [{ id: 'about-next', label: 'NEXT PAGE' }, { id: 'back', label: 'BACK' }];
    if (this.screen === 'ledger') return [{ id: 'back', label: 'BACK' }];
    if (this.screen === 'dev') {
      const rows = SLIDER_KEYS.map((key) => ({ id: 'slider:' + key, label: key + ' ' + TUNING[key] }));
      rows.push({ id: 'reset-sliders', label: 'RESET TO DEFAULTS' }, { id: 'back', label: 'BACK' });
      return rows;
    }
    if (this.screen === 'ending' || this.screen === 'gameover') return [{ id: 'quit', label: 'TITLE' }];
    return [];
  }

  activate(item) {
    if (!item) return;
    this.ctx?.audio?.play('ui-confirm');
    if (item.id === 'menu') { this.screen = 'menu'; this.mode = 'menu'; this.focus = 0; return; }
    if (item.id === 'new') { this.world.startMission('m0'); setWantLock(true); return; }
    if (item.id === 'continue') { this.load(); setWantLock(true); return; }
    if (item.id === 'cash') { this.screen = 'cash'; this.focus = 0; return; }
    if (item.id === 'settings') { this.screen = 'settings'; this.focus = 0; this.idle = 0; return; }
    if (item.id === 'about') { this.screen = 'about'; this.page = 0; this.focus = 0; this.idle = 0; return; }
    if (item.id === 'back') { this.back(); return; }
    if (item.id === 'resume') { this.resume(); return; }
    if (item.id === 'ledger') { this.screen = 'ledger'; this.focus = 0; return; }
    if (item.id === 'dev') {
      if (this.session) return;
      this.screen = 'dev';
      this.mode = 'dev';
      this.focus = 0;
      if (this.ctx?.engine) this.ctx.engine.timeScale = 0;
      return;
    }
    if (item.id === 'quit') { this.toTitle(); return; }
    if (item.id === 'solo') { this.startSolo(); return; }
    if (item.id === 'host' || item.id === 'join') { this.startLink(item.id); return; }
    if (item.id === 'glyphs') {
      this.glyphSet = this.glyphSet === 'xbox' ? 'playstation' : 'xbox';
      this.storeSettings();
      return;
    }
    if (item.id === 'invert') { this.look.invertY = !this.look.invertY; this.storeSettings(); return; }
    if (item.id === 'music' || item.id === 'sfx' || item.id === 'voice') return;
    if (item.id === 'reset-settings') {
      this.volumes = { music: 0.1, sfx: 1, voice: 1 };
      this.glyphSet = 'playstation';
      this.look.invertY = false;
      this.ctx?.audio?.setVolume('music', 0.1);
      this.ctx?.audio?.setVolume('sfx', 1);
      this.storeSettings();
      return;
    }
    if (item.id === 'reset-sliders') { this.resetSliders(); return; }
    if (item.id === 'about-next') { this.page = (this.page + 1) % aboutPages().length; return; }
  }

  nudge(dir) {
    const item = this.items()[this.focus];
    if (!item) return;
    if (item.id === 'music' || item.id === 'sfx' || item.id === 'voice') {
      const key = item.id === 'music' ? 'music' : item.id === 'sfx' ? 'sfx' : 'voice';
      this.volumes[key] = Math.max(0, Math.min(1, this.volumes[key] + dir * 0.1));
      if (key !== 'voice') this.ctx?.audio?.setVolume(key === 'music' ? 'music' : 'sfx', this.volumes[key]);
      this.storeSettings();
      return;
    }
    if (item.id.startsWith('slider:')) {
      const key = item.id.slice(7);
      const [a, b] = TUNING_RANGES[key];
      const span = b - a;
      const step = span > 20 ? 1 : span > 2 ? 0.05 : 0.01;
      const next = Math.round((TUNING[key] + dir * step) * 1000) / 1000;
      this.applySlider(key, next);
    }
  }

  back() {
    if (this.screen === 'settings' || this.screen === 'about' || this.screen === 'cash' || this.screen === 'ledger') {
      this.screen = this.mode === 'pause' || this.mode === 'dev' ? 'pause' : (this.touchGate ? 'title' : 'menu');
      if (this.screen === 'pause') this.mode = 'pause';
      this.focus = 0;
      return;
    }
    if (this.screen === 'dev') {
      this.screen = 'pause';
      this.mode = 'pause';
      this.focus = 0;
    }
  }

  resume() {
    this.mode = this.round ? 'round' : 'play';
    this.screen = this.mode;
    if (this.ctx?.engine) this.ctx.engine.timeScale = 1;
    setWantLock(true);
  }

  toTitle() {
    this.mode = 'title';
    this.screen = 'title';
    this.focus = 0;
    this.ending = null;
    this.session = null;
    this.round = null;
    this.ended = false;
    if (this.world) {
      this.world.round = null;
      this.world.keepCivilians();
      this.world.dead = false;
      this.world.rescueT = 0;
      this.world.surgeryT = 0;
      if (this.world.hp <= 0) this.world.hp = 40;
    }
    this.idle = 0;
    if (this.ctx?.engine) this.ctx.engine.timeScale = 1;
    setWantLock(false);
    this.playSong('title');
  }

  startSolo() {
    const session = soloSession(this.ctx.random.fork('solo'));
    this.session = session;
    this.bindSession(session);
    this.beginRound();
  }

  startLink(role) {
    const session = linkSession(role === 'host' ? 'host' : 'join', this.ctx.random.fork('link'));
    this.session = session;
    this.bindSession(session);
    if (session.isHost) {
      session.post?.({ t: 'start', seed: this.ctx.random.state || 1 });
      this.beginRound();
    }
  }

  openPause() {
    if (this.mode !== 'play' && this.mode !== 'round') return;
    this.mode = 'pause';
    this.screen = 'pause';
    this.focus = 0;
    if (this.ctx?.engine) this.ctx.engine.timeScale = 0;
    setWantLock(false);
  }

  trackDevice(ctx) {
    const input = ctx.input;
    if (pressed(input, PADS) || Math.hypot(input.padAxis.x, input.padAxis.y) > 0.35) this.device = 'pad';
    if (pressed(input, KEYS) || input.buttonEvents.some((e) => e.down && e.code !== 'Touch') || Math.abs(input.mouseDelta.x) + Math.abs(input.mouseDelta.y) > 1) this.device = 'kbm';
  }

  realControl(ctx) {
    const keys = KEYS.filter((code) => code !== 'MouseLeft');
    return pressed(ctx.input, keys) || pressed(ctx.input, PADS);
  }

  freshInput(ctx) {
    const input = ctx.input;
    if (pressed(input, KEYS) || pressed(input, PADS) || pressed(input, ['Touch'])) return true;
    if (input.buttonEvents.some((e) => e.down)) return true;
    if (Math.hypot(input.padAxis.x, input.padAxis.y) > 0.35) return true;
    if (Math.abs(input.mouseDelta.x) + Math.abs(input.mouseDelta.y) > 1) return true;
    return false;
  }

  trackIdle(ctx, dt) {
    if (this.session || this.mode === 'attract') return;
    if (this.screen !== 'title' && this.screen !== 'menu') return;
    if (this.idle >= 10) {
      if (!this.freshInput(ctx)) this.startAttract();
      else this.idle = 0;
      return;
    }
    if (this.freshInput(ctx)) this.idle = 0;
    else this.idle += dt;
  }

  startAttract() {
    this.returnScreen = this.screen;
    this.mode = 'attract';
    this.attract = true;
    this.saveDisabled = true;
    this.beat = 0;
    this.beatT = 0;
    this.world.god = true;
    this.world.infAmmo = true;
    this.world.noJam = false;
    this.bot = { x: 0, y: 1, jump: false, fire: false };
    this.look.override = null;
  }

  exitAttract() {
    const back = this.returnScreen || 'title';
    this.attract = false;
    this.mode = back;
    this.screen = back;
    this.saveDisabled = false;
    this.idle = 0;
    this.bot = null;
    this.look.override = null;
    this.world.god = false;
    this.world.infAmmo = false;
    this.world.resetDynamic();
    if (this.touchGate) this.notice = 'Controller or keyboard required';
  }

  stepAttract(dt) {
    this.beatT += dt;
    const w = this.world;
    if (this.beat === 0) {
      w.ensureTruck(8, 40);
      if (!w.inVehicle && w.car) {
        w.inVehicle = true;
        w.hero.collider.setEnabled(false);
      }
      this.bot = { x: 0, y: 1, fire: false };
      w.map.up = this.beatT > 3;
    } else if (this.beat === 1) {
      w.giveGun('tractor', 40);
      this.bot = { x: 0, y: 0, fire: true };
      if (w.weapon) w.weapon.jammed = this.beatT > 2;
    } else if (this.beat === 2) {
      w.fire.ignite(20, 10, 6);
      w.windPin = { dir: 0.2, speed: 5 };
    } else if (this.beat === 3) {
      w.hour = 22;
      this.look.override = { position: [-240, w.ground(-240, -280) + 18, -250], target: [-260, w.ground(-260, -300) + 2, -300] };
    } else if (this.beat === 4) {
      this.look.override = null;
      w.feverOn = true;
      w.subtitle = 'THE FEVER.';
    } else if (this.beat === 6) {
      w.downBuddy('ines', { burning: false });
    }
    if (this.beatT > 8) {
      this.beat = (this.beat + 1) % 8;
      this.beatT = 0;
      this.look.override = null;
    }
  }

  cardInput(ctx) {
    const input = ctx.input;
    if (pressed(input, ['Enter', 'Space', 'PadCross']) || input.buttonEvents.some((e) => e.down)) this.session?.answer('ready');
    if (pressed(input, ['KeyM', 'PadTriangle'])) this.session?.answer('more');
  }

  playChrome(ctx) {
    const input = ctx.input;
    if (input.isDown('PadCreate') && input.wasPressed('PadOptions')) return;
    if (input.wasPressed('Escape') || input.wasPressed('PadOptions')) this.openPause();
    const locked = !!input.pointerLocked;
    if (this.wasLocked && !locked && (this.mode === 'play' || this.mode === 'round')) this.openPause();
    this.wasLocked = locked;
    if (this.world?.subtitle && this.musicT > 12 && this.mode === 'play') this.playSong(this.world.hour < 6 || this.world.hour > 19 ? 'night' : 'day');
    if (this.world?.feverOn) this.playSong('fever');
  }

  menuInput(ctx) {
    const input = ctx.input;
    const items = this.items();
    if (pressed(input, ['ArrowDown', 'KeyS', 'PadDown'])) this.focus = Math.min(items.length - 1, this.focus + 1);
    if (pressed(input, ['ArrowUp', 'KeyW', 'PadUp'])) this.focus = Math.max(0, this.focus - 1);
    if (pressed(input, ['ArrowLeft', 'KeyA', 'PadLeft'])) this.nudge(-1);
    if (pressed(input, ['ArrowRight', 'KeyD', 'PadRight'])) this.nudge(1);
    const armed = !(this.menuArm > 0);
    if (armed && pressed(input, ['Enter', 'Space', 'PadCross'])) this.activate(items[this.focus]);
    if (armed && pressed(input, ['Escape', 'PadCircle']) && this.screen !== 'title' && this.screen !== 'menu') this.back();
    this.hover(ctx, items, armed);
  }

  menuWindow(items) {
    const top = Math.max(0, this.focus - 6);
    const count = Math.min(9, Math.max(0, (items?.length || 0) - top));
    return { top, count };
  }

  hover(ctx, items, armed = true) {
    const input = ctx.input;
    const width = ctx.hud?.width || 480;
    const height = ctx.hud?.height || 270;
    const px = (input.pointer.x + 1) / 2 * width;
    const py = (1 - input.pointer.y) / 2 * height;
    const { top, count } = this.menuWindow(items);
    for (let i = 0; i < count; i++) {
      const y = 86 + i * 16;
      if (px > 36 && px < width - 36 && py > y - 2 && py < y + 14) this.focus = top + i;
    }
    if (!armed) return;
    for (const ev of input.buttonEvents) {
      if (!ev.down) continue;
      if (ev.code === 'MouseLeft' || ev.code === 'Touch') this.activate(items[this.focus]);
    }
  }

  state() {
    const w = this.world;
    const p = w ? w.feet() : { x: 0, y: 0, z: 0 };
    const gun = w?.weapon;
    const rows = [];
    if (this.notice) rows.push({ action: 'confirm', text: 'SETTINGS' });
    if (w?.prompt) rows.push({ action: 'use', text: w.prompt });
    if (this.mode === 'play' || this.mode === 'round') rows.push({ action: 'fire', text: 'FIRE' }, { action: 'map', text: 'MAP' });
    const prompts = promptList(this.device, this.glyphSet, rows);
    return {
      title: GAME_TITLE,
      mode: this.mode,
      screen: this.screen,
      focus: this.focus,
      device: this.device,
      glyphSet: this.glyphSet,
      notice: this.touchGate ? 'Controller or keyboard required' : '',
      attract: this.attract,
      mission: w?.mission?.def?.id || null,
      step: w?.currentStep()?.do || null,
      hp: w ? Math.round(w.hp) : 0,
      stones: w?.stones || 0,
      tablets: w?.tablets || 0,
      syrettes: w?.syrettes || 0,
      weapon: gun ? { id: gun.id, cond: gun.cond, jammed: gun.jammed, mag: gun.mag } : null,
      fever: !!w?.feverOn,
      pos: { x: p.x, y: p.y, z: p.z },
      yaw: this.ctx?.camera?.yaw || 0,
      vehicle: w?.inVehicle ? w.vehicleKind : null,
      hour: w?.hour || 0,
      wind: { dir: w?.windDir || 0, speed: w?.windSpeed || 0 },
      fire: { burning: w?.fire?.burning.length || 0, burnt: w?.fire?.burntCount || 0 },
      prompts,
      subtitle: w?.subtitle || '',
      buddies: (w?.buddies || []).map((b) => ({ id: b.id, alive: b.alive, down: b.down, hp: b.hp })),
      ledger: w ? { ...w.ledger, hectares: w.hectares() } : null,
      menu: this.items().map((item) => item.label),
      ending: this.ending,
      link: true,
      saves: this.saves,
    };
  }

  fingerprint() {
    const w = this.world;
    if (!w) return '0';
    const p = w.feet();
    return [Math.round(w.hp), w.stones, w.mission?.index || 0, Math.round(p.x), Math.round(p.z), w.fire.burntCount].join(':');
  }

  draw(ctx) {
    const hud = ctx.hud;
    if (!hud) return;
    hud.clear();
    const ink = 'ink';
    if (this.mode === 'card') {
      hud.text(16, 24, GAME_TITLE, { scale: 3, color: 'sand' });
      hud.text(16, 70, 'CARRY THE MOST DIAMOND CASES OUT', { color: 'sand' });
      const players = this.session?.players || [];
      players.forEach((pl, i) => {
        const ready = this.card?.ready?.includes?.(pl.id) ? 'READY' : 'WAIT';
        hud.text(16, 100 + i * 14, (pl.name || 'PLAYER') + ' ' + ready, { color: 'white' });
      });
      const left = this.card?.left;
      hud.text(16, 220, left == null ? 'STARTING' : 'CARD ' + Math.ceil(left / 1000), { color: 'sand' });
      hud.text(16, 240, 'ENTER READY  M MORE TIME', { color: 'white' });
      return;
    }
    if (this.attract) hud.text(8, 8, 'DEMO', { color: 'orange', anchor: 'top-right' });
    if (this.touchGate && (this.screen === 'title' || this.screen === 'menu' || this.attract)) {
      hud.text(0, 70, 'CONTROLLER OR KEYBOARD REQUIRED', { anchor: 'top', color: 'white', scale: 2 });
    }
    if (this.screen === 'title' || this.screen === 'menu' || this.screen === 'pause' || this.screen === 'cash' || this.screen === 'settings' || this.screen === 'about' || this.screen === 'dev' || this.screen === 'ledger' || this.screen === 'ending' || this.screen === 'gameover') {
      if (this.screen === 'title' || this.screen === 'menu') hud.text(16, 28, GAME_TITLE, { scale: 3, color: 'sand' });
      else hud.text(16, 16, this.screen === 'about' ? 'ABOUT AND CREDITS' : this.screen.toUpperCase(), { scale: 2, color: 'sand' });
      if (this.screen === 'about') {
        const page = aboutPages()[this.page] || [];
        page.forEach((line, i) => hud.text(16, 56 + i * 14, line, { color: 'white' }));
      }
      if (this.screen === 'ledger' && this.world) {
        const L = this.world.ledger;
        const lines = [
          'HECTARES ' + this.world.hectares().toFixed(2),
          'PEOPLE MOVED ' + L.moved,
          'MEN PAID TO KILL ' + L.killed,
          'FRIENDS LOST ' + L.friends,
          'STONES EARNED ' + L.stonesEarned,
        ];
        lines.forEach((line, i) => hud.text(16, 56 + i * 16, line, { color: 'white' }));
      }
      if (this.screen === 'ending') {
        const lines = this.ending === 'walk'
          ? ['YOU REACHED THE BORDER WITH THE SHEET.', 'THE GUARD ASKS YOUR TRADE.', 'YOU TELL HIM: SURVEYOR.']
          : ['THEY CROSSED AT FIRST LIGHT ON ASH.', 'NOBODY HAS ASKED WHO LIT IT.', 'YOU ARE OUT OF TABLETS. GOOD VIEW.'];
        lines.forEach((line, i) => hud.text(16, 56 + i * 16, line, { color: 'white' }));
      }
      const items = this.items();
      this.rows = items;
      const { top, count } = this.menuWindow(items);
      for (let i = 0; i < count; i++) {
        const index = top + i;
        const item = items[index];
        const mark = index === this.focus ? '> ' : '  ';
        hud.text(24, 86 + i * 16, mark + item.label, { color: index === this.focus ? 'orange' : 'white' });
      }
      if (this.screen === 'title') {
        const g = promptList(this.device, this.glyphSet, [{ action: 'confirm', text: 'START' }])[0];
        hud.text(16, 230, 'PRESS ' + g.glyph, { color: 'sand' });
      }
      return;
    }
    if (!this.world) return;
    const w = this.world;
    hud.text(8, 8, 'HP ' + Math.round(w.hp), { color: 'white' });
    hud.text(8, 20, 'STONES ' + w.stones, { color: 'sand' });
    if (w.weapon) hud.text(8, 32, w.weapon.name + ' ' + Math.round(w.weapon.cond) + (w.weapon.jammed ? ' JAM' : ''), { color: 'white' });
    if (w.feverOn) hud.text(8, 44, 'FEVER', { color: 'red' });
    if (w.prompt) hud.text(0, 230, w.prompt, { anchor: 'bottom', color: 'sand' });
    if (w.subtitle) hud.text(16, 200, w.subtitle.slice(0, 52), { color: 'white' });
    if (w.subtitle && w.subtitle !== this.said) {
      this.said = w.subtitle;
      const who = (w.speaker || 'soldier').toLowerCase().split(' ')[0];
      say(ctx.audio, who, w.subtitle, this.volumes.voice);
    }
    const g = promptList(this.device, this.glyphSet, [{ action: 'use', text: 'USE' }])[0];
    hud.text(8, 250, g.glyph + ' USE', { color: 'white' });
  }

  dispose() {
    if (this.netTimer) clearInterval(this.netTimer);
    this.netTimer = null;
  }
}

export { TUNING_DEFAULTS };
