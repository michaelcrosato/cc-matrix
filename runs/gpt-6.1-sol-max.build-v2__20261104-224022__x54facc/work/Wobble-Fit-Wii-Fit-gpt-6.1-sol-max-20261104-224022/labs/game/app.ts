/** @file Presentation owner: screens, persistence, input-family changes, attract and the read-only testing handle. */
import { createStore, type EngineFrame, type Audio } from '../../engine';
import { syncBindings } from './ui/bindings';
import { Sandbox } from './ui/sandbox';
import { SeatInput } from './ui/seat-input';
import { Shell } from './ui/shell';
import { defaultOptions } from './ui/options';
import { freshProgress, type Flow, type Progress } from './scenes/state';
import { progressOf } from './scenes/flow';
import type { GameEngine, ScreenApp } from './ui/context';
import { title, arrival, pause, tools, controls, group, unsupported } from './ui/screens/front';
import { programme, noticeboard } from './ui/screens/programme';
import { credits } from './ui/screens/credits';
import { results, evening } from './ui/screens/results';
import { settings, erase } from './ui/screens/settings';
import { dev, devtools, devjump } from './ui/screens/dev';
import { about } from './ui/screens/about';
import { renderHud } from './ui/hud';
import { SHOT } from './cameras/retreat';
import { DEFAULT_WOBBLE } from './scenes/wobble';
import { TUNING } from './scenes/settings';
import { safe } from './ui/glyphs';
import { publishState, updateBanner, mapFor } from './ui/runtime';
import { songFor } from './audio/sound';
import { say } from './audio/voice';
import { startAmbience } from './audio/ambience';
export class GameApp implements ScreenApp {
  ui = new Shell();
  seats = new SeatInput();
  engine: GameEngine | null = null;
  audio: Audio;
  store = createStore({ prefix: 'wobble-fit-v1:' });
  options = { ...defaultOptions(), ...this.store.get('options', defaultOptions()) };
  save: Progress = { ...freshProgress(), ...this.store.get('progress', freshProgress()) };
  flow: Flow | null = null;
  touchOnly = matchMedia('(hover:none) and (pointer:coarse)').matches;
  uiTicks = 0;
  devScore = 800;
  freeCamera = false;
  ended = false;
  mood: ReturnType<typeof startAmbience> | null = null;
  noGpu = false;
  hubNames: string[] = [];
  hubActive = false;
  attract = false;
  private sandboxState = new Sandbox();
  get sandbox() {
    return this.sandboxState.on;
  }
  set sandbox(on: boolean) {
    this.sandboxState.set(this, on);
  }
  overlay = false;
  page = 0;
  route = 'title';
  syncBindings = () => syncBindings(this.engine?.input ?? null, this.seats);
  returnScreen = 'title';
  returnPage = 0;
  private lastSerial = -1;
  private lastMode = '';
  private lastCamera = '';
  private lastLook = '';
  private lastHud = 0;
  private lastSpeech = '';
  private lastSeq = 0;
  private world: object | null = null;
  private readSetting: (path: string) => unknown = (path) => TUNING.find(([k]) => `game.${k}` === path)?.[1];
  private needsBegin = false;
  private pendingEvent: string | null = null;
  private mouse = [0, 0];
  private lastTime = performance.now();
  constructor(audio: Audio) {
    this.audio = audio;
    this.applyOptions();
    this.show('title');
    this.ui.onPause = () => this.openPause();
    this.ui.onPage = (n) => {
      if (this.ui.screen === 'board') this.show('board', (this.page + n + 3) % 3);
      if (this.ui.screen === 'about') this.show('about', (this.page + n + 6) % 6);
    };
    this.ui.interaction = () => {
      if (this.ended) return true;
      if (this.attract) {
        this.exitAttract();
        return true;
      }
      if (this.ui.device === 'pad' && this.touchOnly) {
        this.touchOnly = false;
        this.show('title');
      }
    };
    addEventListener('keydown', (event) => {
      if (this.touchOnly) {
        this.touchOnly = false;
        this.show('title');
      }
      if (event.defaultPrevented || (this.hubActive && this.ui.screen === 'hub')) return;
      if (event.code === 'Tab' && !this.ui.choices.length && this.flow?.mode === 'roam') {
        event.preventDefault();
        this.show('programme');
        this.engine?.inspector?.pause();
      }
      if (this.ui.screen === 'board' && ['KeyQ', 'KeyE'].includes(event.code))
        this.show('board', (this.page + (event.code === 'KeyQ' ? 2 : 1)) % 3);
    });
    addEventListener('contextmenu', (event) => event.preventDefault());
    addEventListener('pointermove', (event) => {
      if (this.ui.choices.length || this.flow?.mode !== 'event') return;
      if (document.pointerLockElement) {
        this.mouse[0] += event.movementX * this.options.sensitivity;
        this.mouse[1] -= event.movementY * this.options.sensitivity;
      } else if (this.flow.event.id === 'garden') {
        const board = this.ui.hud.querySelector('.garden-board');
        if (board) {
          const rect = board.getBoundingClientRect();
          this.mouse = [
            (event.clientX - rect.x - rect.width / 2) / (rect.width / 2),
            -(event.clientY - rect.y - rect.height / 2) / (rect.height / 2),
          ];
        }
      }
    });
    publishState(this);
    setInterval(() => this.uiLoop(performance.now()), 16);
  }
  setting = (path: string): unknown => this.readSetting(path);
  run = (action: string, args?: unknown): void => {
    this.engine?.inspector?.actions.run(action, Array.isArray(args) ? { items: args } : args);
  };
  attach(engine: GameEngine): void {
    this.engine = engine;
    this.syncBindings();
    this.mood = startAmbience(this.audio);
    document.querySelectorAll('.touch-layer,.touch-turn').forEach((node) => node.remove());
    this.ui.lastInput = performance.now();
    this.applyOptions();
    if (engine.ui) {
      engine.ui.root.append(this.ui.root, this.ui.hud, this.ui.banner);
    }
    if (!this.hubActive) {
      this.run('game.begin', this.save);
      this.run('game.front');
    }
    if (this.pendingEvent) {
      const event = this.pendingEvent;
      this.pendingEvent = null;
      this.start(event);
    } else if (this.needsBegin) this.begin();
  }
  applyOptions = (): void => {
    this.audio.volume('music', this.options.music);
    this.audio.volume('effects', this.options.effects);
    this.audio.volume('ambience', this.options.effects * 0.5);
    this.audio.volume('ui', Math.max(0.1, this.options.voices));
    this.ui.xbox = this.options.xbox;
    document.body.classList.toggle('reduced', this.options.reduced);
    this.engine?.inspector?.set('game.assist', this.options.assist);
    this.engine?.inspector?.set('game.reduced', this.options.reduced);
    this.engine?.inspector?.set('input.invert', this.options.invert);
    this.store.set('options', this.options);
  };
  show = (screen: string, page = 0): void => {
    this.route = screen;
    if (screen === 'title' && this.noGpu) {
      unsupported(this);
      return;
    }
    this.page = page;
    this.ui.hud.innerHTML = '';
    if (
      screen !== 'title' &&
      screen !== 'arrival' &&
      screen !== 'group' &&
      this.flow?.mode === 'event' &&
      !this.hubActive
    )
      this.engine?.inspector?.pause();
    if (document.pointerLockElement) document.exitPointerLock();
    this.engine?.input?.use('actionMap:menuRetreat');
    if (screen === 'title') title(this);
    else if (screen === 'arrival') arrival(this);
    else if (screen === 'pause') pause(this);
    else if (screen === 'tools') tools(this);
    else if (screen === 'controls') controls(this);
    else if (screen === 'group') group(this);
    else if (screen === 'programme') programme(this);
    else if (screen === 'board') noticeboard(this, page);
    else if (screen === 'results') results(this);
    else if (screen === 'evening') evening(this);
    else if (screen === 'settings') settings(this, page);
    else if (screen === 'erase') erase(this);
    else if (screen === 'dev') dev(this, page);
    else if (screen === 'devtools') devtools(this, page);
    else if (screen === 'devjump') devjump(this, page);
    else if (screen === 'about') about(this, page);
    else if (screen === 'credits') credits(this);
  };
  begin = (): void => {
    if (!this.engine?.ready) {
      this.needsBegin = true;
      this.pendingEvent = null;
      this.ui.root
        .querySelector('h1')
        ?.insertAdjacentHTML('afterend', '<p class="loading-note">One moment. Tare is polishing the centre.</p>');
      return;
    }
    this.needsBegin = false;
    this.run('game.begin', this.save);
    this.resume();
    this.show('programme');
    this.engine.inspector?.pause();
  };
  start = (id: string): void => {
    if (!this.engine?.ready) {
      this.pendingEvent = id;
      this.needsBegin = false;
      return;
    }
    if (id === 'group' && !this.hubActive) this.seats.begin(this.ui.device);
    this.run('game.start', { event: id });
    this.ui.clear();
    this.engine.inspector?.resume();
    this.lastMode = '';
    this.lastCamera = '';
    this.audio.music(songFor(id));
  };
  resume = (): void => {
    this.freeCamera = false;
    this.ui.clear();
    this.engine?.inspector?.resume();
    this.engine?.input?.use(mapFor(this));
  };
  openPause(): void {
    const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected);
    if (this.hubActive && pad?.buttons[8]?.pressed) return;
    if (!this.hubActive) this.engine?.inspector?.pause();
    this.ui.padOld[9] = true;
    this.show('pause');
  }
  frame(frame: EngineFrame): void {
    const entity = frame.world.query('retreat')[0] as unknown as { retreat: { data: Flow } } | undefined;
    if (!entity) return;
    this.flow = entity.retreat.data;
    this.readSetting = frame.setting;
    const f = this.flow;
    this.mood?.set(f.event.id === 'tilt' && f.mode === 'event' && f.event.phase < 4 ? 'storm' : 'day');
    if (!this.engine) return;
    if (this.world !== frame.world) {
      this.world = frame.world;
      this.lastSeq = 0;
      this.lastSerial = -1;
    }
    if (this.lastSerial !== f.serial) {
      this.lastSerial = f.serial;
      if (!f.demo && !this.hubActive && ['roam', 'results', 'credits'].includes(f.mode)) {
        this.save = progressOf(f);
        if (!this.sandbox) this.store.set('progress', this.save);
      }
      if (f.mode === 'results' && !this.hubActive) this.show('results');
      else if (f.mode === 'credits') this.show('credits');
      else if (f.mode === 'event' && !this.hubActive) {
        this.ui.clear();
        this.engine?.input?.use(mapFor(this));
      }
    }
    if (this.lastMode !== `${f.mode}:${f.event.id}`) {
      this.lastMode = `${f.mode}:${f.event.id}`;
      if (!this.ui.choices.length) this.engine?.input?.use(mapFor(this));
      this.audio.music(f.mode === 'event' ? songFor(f.event.id) : f.mode === 'credits' ? 'song:dawn' : 'song:lobby');
    }
    SHOT.mode =
      ['title', 'arrival', 'credits', 'group'].includes(this.ui.screen) || f.mode === 'front'
        ? 'title'
        : f.mode === 'roam'
          ? 'roam'
          : 'event';
    SHOT.event = f.event.id;
    SHOT.tick = f.event.tick;
    SHOT.phase = f.event.phase;
    SHOT.tilt = f.event.tilt;
    SHOT.leanX = f.wobble.x;
    SHOT.leanY = f.wobble.y;
    SHOT.reduced = this.options.reduced;
    SHOT.feet = f.feet;
    const camera = this.freeCamera ? 'cam3=fly' : SHOT.mode === 'roam' ? 'cam3=chase,180,-25,10' : 'cam3=retreat';
    if (camera !== this.lastCamera) {
      this.lastCamera = camera;
      this.engine.inspector?.camera.set(camera, { blend: !this.options.reduced });
    }
    const look = this.hubActive
      ? 'look:retreatSession'
      : f.mode === 'credits' || (f.complete && !f.endingSeen && f.event.id === 'check')
        ? 'look:retreatDawn'
        : f.mode === 'event' && f.event.id === 'tilt' && f.event.phase < 4
          ? 'look:retreatStorm'
          : 'look:retreat';
    if (look !== this.lastLook) {
      this.lastLook = look;
      this.engine.inspector?.set('post.look', look);
    }
    if (this.engine.input?.pressed('plan') && f.mode === 'roam' && !this.ui.choices.length) {
      this.engine.inspector?.pause();
      this.show('programme');
    }
    this.audio.update(frame.camera, frame.queries ?? undefined);
    const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected);
    for (const event of frame.world.events.trace())
      if (event.seq > this.lastSeq) {
        this.lastSeq = event.seq;
        if (event.type === 'noticeboard') {
          this.engine.inspector?.pause();
          this.show('board');
        }
        const sound = (
          { result: 'stamp', pebble: 'pebble', topple: 'splash', moved: 'frog', beat: 'clap' } as Record<string, string>
        )[event.type];
        if (['topple', 'diveSplash', 'moved', 'result'].includes(event.type)) {
          const id = event.type === 'moved' ? 'ripple' : event.type === 'result' ? 'stamp' : 'splash';
          frame.emit(
            `emitter:retreat.${id}`,
            [f.feet[0], event.type === 'diveSplash' ? 2.2 : f.feet[1] + 0.2, f.feet[2]],
            `retreat-${event.seq}`,
            8,
          );
        }
        if (sound) this.audio.play(`sfx:retreat.${sound}`);
        if (event.type === 'result') this.audio.stinger('song:stamp');
        if (event.type === 'topple' && this.options.rumble)
          pad?.vibrationActuator
            ?.playEffect('dual-rumble', { duration: 180, strongMagnitude: 0.3, weakMagnitude: 0.4 })
            .catch(() => {});
      }
    if (f.message !== this.lastSpeech && !f.demo) {
      this.lastSpeech = f.message;
      say(this.audio, f.speaker, f.message, this.options.voices);
    }
    if (f.mode === 'event' && f.event.id === 'tilt' && f.event.phase < 4)
      frame.emit('emitter:rain', [f.feet[0], f.feet[1] + 10, f.feet[2]], 'retreat-rain', 2);
    if (performance.now() - this.lastHud > 60 && !this.ui.choices.length && this.ui.screen !== 'hub') {
      this.lastHud = performance.now();
      const get = (key: string) => Number(frame.setting(`game.${key}`));
      const config = {
        wobble: { ...DEFAULT_WOBBLE, period: get('breath.period') },
        get,
        auto: false,
        day: f.day,
        expert: f.expert,
      };
      const overlay = this.overlay
        ? `<div class="state-overlay">CoB ${f.wobble.x.toFixed(2)}, ${f.wobble.y.toFixed(2)} · calm ${f.wobble.calm.toFixed(2)}<br>${safe(f.event.id)} / ${f.event.phase} / ${f.event.tick}<br>tilt ${f.event.tilt.toFixed(2)}° · ${this.engine.inspector?.hash()}</div>`
        : '';
      this.ui.hud.innerHTML = renderHud(f, config, this.ui.device, this.options.xbox, overlay, this.hubNames);
    }
  }
  private uiLoop = (now: number): void => {
    if (this.ended) return;
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.uiTicks++;
    this.ui.updatePad(dt);
    if (
      !this.hubActive &&
      this.engine?.ready &&
      this.flow?.mode === 'front' &&
      ['title', 'settings', 'about', 'group', 'arrival', 'board'].includes(this.ui.screen) &&
      !this.attract &&
      !this.ui.capturing &&
      now - this.ui.lastInput >= 10000
    ) {
      this.attract = true;
      this.returnScreen = this.route;
      this.returnPage = this.page;
      this.run('game.demo');
      this.ui.clear('attract');
      this.engine.inspector?.resume();
    }
    updateBanner(this);
    if (this.engine && this.flow?.mode === 'event' && !this.ui.choices.length) {
      this.engine.input?.virtual.axis('game:mouse', this.mouse);
      if (this.flow.event.id !== 'garden') this.mouse = this.mouse.map((v) => v * Math.exp(-dt / 0.6));
      if (this.flow.event.id === 'group' && !this.hubActive)
        this.engine.input?.virtual.axis('game:seats', this.seats.values(this.mouse, this.options.cpu));
    }
  };
  exitAttract(): void {
    this.attract = false;
    this.run('game.front');
    this.ui.hud.innerHTML = '';
    this.ui.banner.innerHTML = '';
    this.show(this.returnScreen, this.returnPage);
    this.ui.lastInput = performance.now();
  }
}
