/**
 * @file Teeter Fit's page app: every drawn frame it reads the sim, plays new events, keeps the screens, HUD, camera and sound
 * up to date, and turns menu picks into scene actions. It reads the sim and never writes it.
 *
 * Game code, a page's.
 *
 * @example
 * // const app = new App(session, search); app.attach(engine, store);
 */
import type { CameraInput, Engine, EngineFrame, Input, Inspector, Store } from '../../../engine';
import { Sound } from '../audio/sound';
import { setShot } from '../cameras/shot';
import type { Session } from '../hub/session';
import type { ActivityData, Cast, Flow, IslandData, Seat, Wobble } from '../scenes/components';
import { ACTIVITIES } from '../scenes/events/index';
import { listenDevices, publishState, updateDevice } from './appInput';
import { onEvent } from './appEvents';
import { nameLabels } from './names';
import {
  sendInput,
  updateAttract,
  updateCamera,
  updateFocus,
  updateCalm,
  updateHud,
  updateMusic,
  updateSession,
  updateWorldLook,
} from './frame';
import type { Device, GlyphSet } from './glyphs';
import { Hud } from './hud/hud';
import { Speech } from './hud/speech';
import { StateOverlay } from './screens/dev';
import { PauseScreen, TitleScreen } from './screens/menus';
import { ProgrammeScreen } from './screens/programme';
import type { AppHost, Screen } from './screens/types';
import { loadSave, loadSettings, NEW_SETTINGS, saveFromFlow, type SaveData, type SettingsData } from './save';

/** Entities as the frame sees them. */
type Entities = Record<string, unknown>[];

/** The page app. */
export class App implements AppHost {
  engine!: Engine;
  store!: Store;
  root!: HTMLElement;
  sound!: Sound;
  save!: SaveData;
  settings: SettingsData = { ...NEW_SETTINGS };
  freePlay = false;
  freeCamera = false;
  throwaway = false;
  calmStep = 0;
  cheats = { bot: false, god: false };
  overlay!: StateOverlay;
  stack: Screen[] = [];
  title: TitleScreen | null = null;
  hud!: Hud;
  speech!: Speech;
  focusEl!: HTMLElement;
  reticle!: HTMLElement;
  attractEl!: HTMLElement;
  fadeEl!: HTMLElement;
  dev = '';
  lastSeen = 0;
  lastFlow: Flow | null = null;
  clock = 0;
  camCode = '';
  idle = 0;
  attract = false;
  device_: Device = 'keyboard';
  feet: [number, number, number] = [0, 0, 0];
  lastMode = '';
  look = 'look:retreat';
  mouse = [0, 0];
  point: [number, number, number] = [0, 0, 0];
  touchOnly = false;
  sawKeyOrPad = false;
  ending = false;
  sessionDone = false;
  settingOf: ((key: string) => unknown) | null = null;
  frameCount = 0;
  settling = false;
  wasLocked = false;
  clickEl!: HTMLElement;
  breathing = false;
  inputSeen = false;
  openedAt = -1;
  baseSensitivity = 1;

  readonly sessionState: Session | null;
  readonly search: URLSearchParams;

  constructor(sessionState: Session | null, search: URLSearchParams) {
    this.sessionState = sessionState;
    this.search = search;
  }

  /** Whether this page is a hub session. */
  get session(): boolean {
    return this.sessionState !== null;
  }

  device(): Device {
    return this.device_;
  }
  glyphs(): GlyphSet {
    return this.settings.glyphs;
  }
  flow(): Flow | null {
    return this.lastFlow;
  }
  sawInput(): boolean {
    return this.inputSeen;
  }
  setting(path: string): unknown {
    return this.settingOf?.(path);
  }
  act(name: string, args?: unknown): void {
    (this.engine.inspector?.actions as { run(n: string, a?: unknown): void } | undefined)?.run(name, args);
    this.readFlowNow();
  }
  open(screen: Screen): void {
    this.stack.push(screen);
    this.openedAt = this.frameCount;
    this.title?.show(this.stack.every((s) => s === this.title));
  }
  close(screen?: Screen): void {
    const at = screen ? this.stack.indexOf(screen) : this.stack.length - 1;
    if (at < 0) return;
    this.stack[at].remove();
    this.stack.splice(at, 1);
    // The press that closed the last screen must not also reach play: nothing does until it is let go.
    if (this.stack.length === 0) this.settling = true;
    this.title?.show(this.stack.length === 1 && this.stack[0] === this.title);
  }
  closeAll(): void {
    for (const screen of [...this.stack]) if (screen !== this.title) this.close(screen);
  }
  applySettings(): void {
    if (!this.session) this.store.set('settings', this.settings);
    this.sound.setVolumes(this.settings);
    this.engine.inspector?.set('game.assist', this.settings.steadier);
    this.engine.inspector?.set('game.noTopple', this.cheats.god);
    this.engine.inspector?.set('game.botSeat', this.cheats.bot);
    this.engine.inspector?.set('game.skill', 'perfect');
    this.engine.inspector?.set('game.expert', this.settings.expert);
    this.engine.inspector?.set('input.invert', this.settings.invert);
    this.engine.inspector?.set('input.stickInvert', this.settings.invert);
    this.engine.inspector?.set('input.sensitivity', this.baseSensitivity * this.settings.mouse);
  }
  writeSave(): void {
    if (!this.session && !this.throwaway) this.store.set('save', this.save);
  }
  cue(what: 'move' | 'pick' | 'cancel'): void {
    this.sound.play(what === 'move' ? 'sfx:blip' : what === 'pick' ? 'sfx:confirm' : 'sfx:cancel', 0.6);
  }
  beginPlay(): void {
    this.closeAll();
    this.closeTitle();
    this.endAttract();
    this.act('game.begin', { ...this.save, roam: true });
    this.lastSeen = -1;
    const flow = this.lastFlow;
    const day = flow?.day ?? this.save.day;
    const firstEver = day === 1 && (flow?.done.length ?? 0) === 0;
    if (firstEver) this.act('game.go', { station: 'pier' });
    this.sound.speak('tare', `day.${Math.min(day, 6)}.intro`, 0);
    this.look = 'look:retreat';
  }
  toTitle(): void {
    this.closeAll();
    this.freePlay = false;
    this.act('game.front');
    this.save = loadSave(this.store);
    this.openTitle();
  }

  modal(): boolean {
    if (this.settling) return true;
    if (this.session) return this.stack.length > 0;
    return this.stack.length > 0 || this.attract;
  }
  mapName(): string {
    if (this.stack.length > 0 || this.settling) return 'actionMap:front';
    const flow = this.lastFlow;
    if (!flow) return this.session ? 'actionMap:balance' : 'actionMap:front';
    if (this.session) return 'actionMap:balance';
    if (flow.mode === 'roam') return 'actionMap:roam';
    if (flow.mode === 'event') return ACTIVITIES[flow.event]?.map ?? 'actionMap:balance';
    return 'actionMap:front';
  }
  cameraInput(): CameraInput | undefined {
    return { follow: this.feet };
  }

  /** The first moment the engine is up. */
  attach(engine: Engine, store: Store): void {
    this.engine = engine;
    this.store = store;
    this.root = document.createElement('div');
    this.root.className = 'tf-root';
    (engine.ui?.root ?? document.body).append(this.root);
    this.hud = new Hud(this.root);
    this.speech = new Speech(this.root);
    this.focusEl = document.createElement('div');
    this.focusEl.className = 'tf-focusprompt';
    this.focusEl.dataset.ui = 'prompt';
    this.focusEl.style.display = 'none';
    this.reticle = document.createElement('div');
    this.reticle.className = 'tf-reticle';
    this.reticle.style.display = 'none';
    this.attractEl = document.createElement('div');
    this.attractEl.className = 'tf-banner';
    this.attractEl.dataset.ui = 'attract';
    this.attractEl.style.display = 'none';
    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'tf-fade';
    this.root.append(this.focusEl, this.reticle, this.attractEl, this.fadeEl);
    this.clickEl = document.createElement('div');
    this.clickEl.className = 'tf-focusprompt';
    this.clickEl.dataset.ui = 'clicklean';
    this.clickEl.style.display = 'none';
    this.clickEl.textContent = 'Click to lean with the mouse';
    this.root.append(this.clickEl);
    this.overlay = new StateOverlay(this.root);
    this.sound = new Sound();
    (window as unknown as { __tfAudio?: unknown }).__tfAudio = this.sound.audio;
    this.sound.onSpeech = (who, text, seconds) => this.speech.show(who, text, seconds);
    if (this.session) {
      this.save = loadSave(store);
      this.settings = { ...NEW_SETTINGS };
    } else {
      this.save = loadSave(store);
      this.settings = loadSettings(store);
    }
    this.baseSensitivity = Number(
      (engine.inspector?.describe('setting', 'input.sensitivity') as { default?: number } | undefined)?.default ?? 1,
    );
    this.applySettings();
    listenDevices(this);
    this.touchOnly = matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (this.sessionState) {
      const s = this.sessionState;
      this.act('round.join', { me: s.info.me, players: s.info.players.map((p) => p.id) });
      nameLabels(engine, s);
      s.onEnd = () => {
        this.sessionDone = true;
        engine.stop();
        void this.sound.audio.close();
        this.hud.hide();
      };
    } else if (this.search.get('scene') === 'game:round') {
      this.act('round.alone');
    } else this.openTitle();
    this.publish();
  }

  openTitle(): void {
    this.closeTitle();
    this.title = new TitleScreen(this);
    this.stack.unshift(this.title);
    this.title.setTouchOnly(this.touchOnly && !this.sawKeyOrPad);
    this.lastSeen = -1;
  }

  closeTitle(): void {
    if (!this.title) return;
    const at = this.stack.indexOf(this.title);
    if (at >= 0) this.stack.splice(at, 1);
    this.title.remove();
    this.title = null;
  }

  /** Reads the flow straight after an action, so a screen opened now sees it. */
  readFlowNow(): void {
    const q = this.engine.inspector?.state('flow') as unknown as { entities?: { flow: Flow }[] } | undefined;
    const flow = q?.entities?.[0]?.flow;
    if (flow) this.lastFlow = flow;
  }

  /** Opens the pause menu, when the browser took the pointer back. */
  askPause(): void {
    this.open(new PauseScreen(this));
  }

  /** Starts attract. */
  startAttract(): void {
    if (this.attract) return;
    this.attract = true;
    this.title?.show(false, true);
    this.act('game.begin', { roam: false });
    this.act('game.attract', { on: true });
    this.attractEl.style.display = '';
    this.publish();
  }

  /** Leaves attract: back to where you were. The save was never touched. */
  endAttract(): void {
    if (!this.attract) return;
    this.attract = false;
    this.attractEl.style.display = 'none';
    this.act('game.attract', { on: false });
    this.title?.show(this.stack.length === 1);
    this.title?.setTouchOnly(this.touchOnly && !this.sawKeyOrPad);
    this.idle = 0;
    this.hud.hide();
    this.speech.clear();
    this.publish();
  }

  /** Publishes the small read-only handle tests use. */
  publish(flow?: Flow | null, a?: ActivityData | null): void {
    publishState(this, flow, a);
  }

  /** One drawn frame. */
  frame(frame: EngineFrame): void {
    if (!this.engine || !this.root || this.sessionDone) {
      setShot({ at: [0, 40, 130], look: [0, 10, 0], fov: 42, ease: 0 });
      return;
    }
    const dt = frame.dt;
    this.frameCount += 1;
    this.settingOf = (key) => frame.setting(key);
    this.clock += dt;
    const input = this.engine.input as Input;
    const inspector = this.engine.inspector as Inspector;
    const world = frame.world as unknown as { query(...names: string[]): Entities; tick: number };
    const flow = world.query('flow')[0]?.flow as Flow | undefined;
    const activity = world.query('activity')[0]?.activity as ActivityData | undefined;
    const island = world.query('island')[0]?.island as IslandData | undefined;
    if (!flow || !island) return;
    this.lastFlow = flow;
    const running = activity && activity.id ? activity : null;
    updateDevice(this);
    if (this.settling && !input.held('uiAccept') && !input.held('uiCancel')) this.settling = false;
    this.sound.frame(frame, (type, payload) => onEvent(this, type, payload, flow));
    this.speech.update(dt);

    // Where the seat's person is, and whose seat is lit.
    const seats = world.query('seat', 'wobble') as unknown as { seat: Seat; wobble: Wobble; id: number }[];
    const mySeat = seats.find((e) => e.seat.kind === 'local') ?? seats[0];
    const myCast = world
      .query('cast', 'actor')
      .find((e) =>
        this.sessionState
          ? (e.cast as Cast).who === `seat${this.sessionState.info.me}`
          : (e.cast as Cast).who === 'guest' || (e.cast as Cast).who === 'seat0',
      ) as unknown as { actor: { x: number; y: number; z: number; yaw: number }; cast: Cast } | undefined;
    if (myCast) this.feet = [myCast.actor.x, myCast.actor.y, myCast.actor.z];

    this.handleScreens(input, dt, flow);
    sendInput(this, flow, running, input);
    updateCamera(this, flow, running, island, myCast, inspector);
    updateHud(this, flow, running, mySeat, seats, frame.camera);
    updateCalm(this, flow, mySeat);
    updateFocus(this, flow);
    updateWorldLook(this, frame, island, flow);
    updateMusic(this, flow, running, island);
    updateAttract(this, dt, flow);
    updateSession(this, frame, flow, running, mySeat);
    this.overlay.update(
      `CoB ${mySeat?.wobble.x.toFixed(2)} ${mySeat?.wobble.y.toFixed(2)}  calm ${mySeat?.wobble.calm.toFixed(2)}  sync ${mySeat?.wobble.sync.toFixed(2)}\ntilt ${island.tiltX.toFixed(1)} ${island.tilt.toFixed(1)}  ${flow.mode} ${flow.event} ${running?.phase ?? ''}\ntick ${world.tick}  hash ${inspector.hash()}`,
    );
    this.publish(flow, running);
    if (flow.mode !== this.lastMode) {
      this.lastMode = flow.mode;
      if (flow.mode === 'roam' && !this.session) this.saveNow(flow);
    }
  }

  saveNow(flow: Flow): void {
    if (this.attract) return;
    this.save = saveFromFlow(flow, this.save);
    this.writeSave();
  }

  /** The screens, and pause. */
  handleScreens(input: Input, dt: number, flow: Flow): void {
    const createHeld = (navigator.getGamepads?.() ?? []).some((pad) => pad?.buttons[8]?.pressed);
    const top = this.stack[this.stack.length - 1];
    if (top && !this.attract) {
      // A screen opened this frame, by the press still held in it, waits for the next frame.
      if (this.openedAt !== this.frameCount) top.update(input, dt);
    } else if (!top && input.pressed('pause') && !createHeld && !(flow.mode === 'front' && !this.session)) {
      this.open(new PauseScreen(this));
    } else if (!top && flow.mode === 'roam' && input.pressed('plan')) this.open(new ProgrammeScreen(this));
  }
}
