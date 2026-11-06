/**
 * @file The 10-foot shell. Attract, the touch gate, and the hub card sit over the sim.
 * The sim stays in the scene. Menus and ghosts live in their own files.
 */
import {
  createMenu,
  type Audio,
  type Engine,
  type EngineFrame,
  type Inspector,
  type Menu,
  type MenuItem,
  type Store,
} from '../../../engine';
import { say, speakerFor } from '../audio/voice';
import { LURES } from '../scenes/data/lures';
import { type GlyphSet, promptLine } from './glyphs';
import { createHub, type HubClient, type HubView } from './hub';
import { LINES } from './lines/book';
import { createMenus, type Host, type Live, type Menus } from './menus';
import { freshPrefs, freshSave, noteProgress, readSave, writeSave, type Prefs } from './save';
import { readSnap, resultCopy, runningScore, songFor, type Snap } from './snap';

/** What tests read. The page fills it in the same frame as the input. */
export interface GameHandle {
  title: 'Thumb Yoga';
  screen: string;
  attract: boolean;
  lastDevice: string;
  glyphSet: GlyphSet;
  volumes: { music: number; effects: number; voices: number };
  day: number;
  event: string;
  focus: string;
}

/** How the page is built. */
export interface PageOptions {
  audio: Audio;
  store: Store;
  hub: boolean;
  touch: boolean;
}

/** The page the frame loop drives. */
export interface Page {
  modal(): boolean;
  frame(frame: EngineFrame): void;
  follow(): readonly [number, number, number];
  bind(engine: Engine): void;
  client: HubClient | null;
}

const LURE_IDS = new Set(LURES.map((lure) => lure.id));

/** Builds the shell and keeps it in step with the sim. */
export function createPage(options: PageOptions): Page {
  const { audio, store, hub, touch } = options;
  const client = (window as unknown as { AIHub?: HubClient }).AIHub ?? null;
  const root = document.createElement('div');
  root.id = 'shell';
  root.dataset.ui = 'shell';
  document.body.append(root);
  const note = para('note');
  const disc = document.createElement('div');
  disc.dataset.ui = 'disc';
  disc.innerHTML =
    '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="#FF8A70" stroke-width="3"/><circle id="dot" cx="50" cy="50" r="5" fill="#3A4A55"/></svg>';
  const banner = para('banner');
  const copy = para('copy');
  const about = document.createElement('div');
  about.dataset.ui = 'about';
  about.hidden = true;
  const sliders = document.createElement('div');
  sliders.dataset.ui = 'sliders';
  sliders.hidden = true;
  const touchBtn = document.createElement('button');
  touchBtn.type = 'button';
  touchBtn.dataset.ui = 'touch-settings';
  touchBtn.textContent = 'Settings';
  root.append(note, disc, banner, copy, about, sliders, touchBtn);

  let engine: Engine | null = null;
  let menu: Menu | null = null;
  let screen = hub ? 'card' : touch ? 'touch' : 'title';
  let attract = false;
  let exitPending = false;
  let acceptHeld = false;
  let cancelHeld = false;
  let pauseHeld = false;
  let menuCancel: (() => void) | undefined;
  let armed = !touch;
  let icons: Prefs['icons'] = 'playstation';
  let glyphSet: GlyphSet = 'playstation';
  let lastDevice = 'gamepad';
  let focus = '';
  let prefs = freshPrefs();
  let save = readSave(store) ?? freshSave();
  prefs = save.settings;
  icons = prefs.icons;
  const live: Live = { event: '', mode: 'title', result: 0, calm: 0, rank: '', age: 0, pebbles: 0 };
  let lastInput = performance.now();
  let touchAt = 0;
  let mouseDx = 0;
  let mouseDy = 0;
  let song = '';
  let said = '';
  let savedKey = '';
  let look = '';
  let lookOk = true;
  let ended = false;
  let shownFrame: EngineFrame | null = null;
  let hubView: HubView | null = null;
  const feet: readonly [number, number, number] = [0, 1.4, 6];
  let follow: readonly [number, number, number] = feet;

  const publish = () => {
    const handle: GameHandle = {
      title: 'Thumb Yoga',
      screen,
      attract,
      lastDevice,
      glyphSet,
      volumes: { music: prefs.music, effects: prefs.effects, voices: prefs.voices },
      day: save.day,
      event: live.event,
      focus,
    };
    (window as unknown as { __game?: GameHandle }).__game = handle;
  };
  const inspector = (): Inspector | null => engine?.inspector ?? null;
  const run = (name: string, args?: Record<string, unknown>) => {
    const actions = inspector()?.actions as
      { run?: (id: string, body?: Record<string, unknown>) => unknown } | undefined;
    if (typeof actions?.run === 'function') actions.run(name, args);
  };
  const applyPrefs = () => {
    audio.volume('music', prefs.music);
    audio.volume('effects', prefs.effects);
    audio.volume('ui', prefs.voices);
    inspector()?.set('game.assist', prefs.assist);
    inspector()?.set('game.cpu', prefs.cpu);
    glyphSet = lastDevice === 'keyboard' ? 'keys' : lastDevice === 'mouse' ? 'mouse' : icons;
    if (screen !== 'touch') note.textContent = promptLine(glyphSet);
  };
  const persist = () => {
    save = { ...save, outfits: [], settings: { ...prefs, icons } };
    if (attract || hub) return;
    writeSave(store, save);
  };
  const close = () => {
    menu?.remove();
    menu = null;
    menuCancel = undefined;
  };
  const open = (
    items: MenuItem[],
    title: string,
    id: string,
    onPick: (itemId: string) => void,
    onCancel?: () => void,
  ) => {
    const input = engine?.input;
    if (!input) return;
    close();
    menuCancel = onCancel;
    screen = id;
    menu = createMenu(root, items.slice(0, 6), {
      input,
      id,
      title,
      onCancel: () => onCancel?.(),
      onMove: (_index, item) => {
        focus = labelOf(item);
        publish();
      },
      onPick: (_index, item) => onPick(typeof item === 'string' ? item : (item.id ?? item.label)),
    });
    focus = labelOf(menu.selected);
    publish();
  };
  const resume = () => {
    if (!hub) inspector()?.resume();
    close();
    screen = hub && hubView && !hubView.playing ? 'card' : 'play';
    publish();
  };
  const described = (path: string, key: string): number => {
    const row = inspector()?.describe('setting', path) as { fields?: { key: string; value: unknown }[] } | undefined;
    const field = row?.fields?.find((item) => item.key === key);
    return typeof field?.value === 'number' ? field.value : 0;
  };

  const host: Host = {
    hub,
    get attract() {
      return attract;
    },
    set attract(value) {
      attract = value;
    },
    get screen() {
      return screen;
    },
    set screen(value) {
      screen = value;
    },
    get icons() {
      return icons;
    },
    set icons(value) {
      icons = value;
    },
    get prefs() {
      return prefs;
    },
    set prefs(value) {
      prefs = value;
    },
    get save() {
      return save;
    },
    set save(value) {
      save = value;
    },
    live,
    note,
    about,
    sliders,
    store,
    devPage: 0,
    jumpPage: 0,
    bindPage: 0,
    pausePage: 0,
    aboutFrom: 'title',
    get lastDevice() {
      return lastDevice;
    },
    engine: () => engine,
    inspector,
    run,
    open,
    close,
    applyPrefs,
    persist,
    resume,
    publish,
    setting(path) {
      const value = shownFrame?.setting(path);
      return typeof value === 'number' && Number.isFinite(value) ? value : described(path, 'default');
    },
    settingDefault: (path) => described(path, 'default'),
  };
  const menus: Menus = createMenus(host);
  hubView =
    hub && client
      ? createHub(
          {
            audio,
            client,
            run,
            engine: () => engine,
            ended: () => ended,
            markEnded: () => {
              ended = true;
            },
          },
          root,
        )
      : null;

  const noteDevice = (device: string) => {
    lastDevice = device;
    glyphSet = device === 'keyboard' ? 'keys' : device === 'mouse' ? 'mouse' : icons;
    lastInput = performance.now();
    if (screen !== 'touch') note.textContent = promptLine(glyphSet);
    publish();
  };
  const exitAttract = () => {
    if (!attract) return;
    exitPending = true;
    lastInput = performance.now();
  };
  /** Leaves the demo after this frame has decided not to store it. */
  const finishExit = () => {
    if (!exitPending) return;
    exitPending = false;
    attract = false;
    lastInput = performance.now();
    inspector()?.set('game.auto', 'off');
    const seed = inspector()?.seed() ?? 1;
    inspector()?.seed(seed);
    if (armed) menus.showTitle();
    else screen = 'touch';
  };
  const startAttract = () => {
    attract = true;
    inspector()?.set('game.auto', 'attract');
    const seed = inspector()?.seed() ?? 1;
    inspector()?.seed(seed);
    if (screen === 'title') close();
    if (screen === 'title') screen = 'attract';
    publish();
  };

  touchBtn.addEventListener('click', () => {
    touchAt = performance.now();
    menus.showSettings(0);
  });
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      armed = true;
      noteDevice('keyboard');
      if (attract) exitAttract();
      else if (screen === 'touch') menus.showTitle();
      if (hub && screen === 'card') {
        if (event.code === 'Enter' || event.code === 'NumpadEnter') client?.answer('ready');
        if (event.code === 'KeyT') client?.answer('more');
      }
    },
    true,
  );
  window.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'touch') {
        touchAt = performance.now();
        return;
      }
      noteDevice('mouse');
      if (attract) exitAttract();
      else if (screen === 'touch') menus.showTitle();
      if ((screen === 'play' || screen === 'attract') && !menu) engine?.input?.mouse?.lock();
      if (hub && screen === 'card') client?.answer('ready');
    },
    true,
  );
  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      if (Math.abs(event.movementX) + Math.abs(event.movementY) < 2) return;
      mouseDx += event.movementX;
      mouseDy += event.movementY;
      if (menu) return;
      if (performance.now() - touchAt > 700) {
        noteDevice('mouse');
        if (attract) exitAttract();
      }
    },
    true,
  );

  applyPrefs();
  publish();

  return {
    client: hub ? client : null,
    modal: () => menu !== null || screen === 'title' || screen === 'touch' || screen === 'card' || screen === 'about',
    follow: () => follow,
    bind(next) {
      engine = next;
      lastInput = performance.now();
      applyPrefs();
      if (!hub) {
        if (armed) menus.showTitle();
        else screen = 'touch';
      } else screen = 'card';
      publish();
    },
    frame(drawn) {
      shownFrame = drawn;
      const input = engine?.input;
      // A catch-up step can sample a press and drop it before this draw. A hold still shows here.
      const accept = input?.held('uiAccept') ?? false;
      const cancel = input?.held('uiCancel') ?? false;
      if (menu && accept && !acceptHeld && !input?.pressed('uiAccept')) menu.pick();
      if (menu && cancel && !cancelHeld && !input?.pressed('uiCancel')) menuCancel?.();
      acceptHeld = accept;
      cancelHeld = cancel;
      if (menu) {
        menu.update(drawn.dt);
        // Begin closes the menu inside update. Reading selected after that throws and stops the loop.
        if (menu) focus = labelOf(menu.selected);
      }
      // Begin changes the world inside this draw. Read it after the menu, not before.
      const snap = readSnap(drawn);
      follow = snap.guest ? [snap.wx, snap.wy + 1.2, snap.wz] : [0, 1.4, 2];
      live.event = snap.event;
      live.mode = snap.mode;
      live.result = snap.mode === 'results' ? snap.result : runningScore(snap);
      live.calm = snap.calm;
      live.rank = snap.rank || live.rank;
      live.age = snap.age;
      live.pebbles = snap.pebbles;
      if (input && !ended) drive(input, snap);
      if (
        engine &&
        !attract &&
        !hub &&
        front(screen) &&
        snap.mode === 'title' &&
        performance.now() - lastInput >= 10000
      )
        startAttract();
      if (!menu && !hub) openBeat(snap);
      if (
        attract &&
        screen !== 'settings' &&
        screen !== 'about' &&
        screen !== 'controls' &&
        screen !== 'programme' &&
        screen !== 'touch'
      )
        screen = 'attract';
      if (hub && hubView && !hubView.playing && screen !== 'pause' && screen !== 'about' && screen !== 'settings')
        screen = 'card';
      else if (hub && hubView?.playing && screen === 'card') screen = 'play';
      setLook(snap);
      remember(snap);
      finishExit();
      paint(snap, drawn);
      hubView?.paint(screen, snap);
      publish();
    },
  };

  function drive(input: NonNullable<Engine['input']>, snap: Snap): void {
    const pads = navigator.getGamepads?.() ?? [];
    let padDown = false;
    let selectHeld = false;
    for (const pad of pads) {
      if (!pad) continue;
      if (pad.buttons[8]?.pressed) selectHeld = true;
      if (pad.buttons.some((button) => button.pressed)) padDown = true;
    }
    if (padDown) {
      noteDevice('gamepad');
      if (attract) exitAttract();
      if (hub && screen === 'card' && pads[0]?.buttons[0]?.pressed) client?.answer('ready');
      if (hub && screen === 'card' && pads[0]?.buttons[3]?.pressed) client?.answer('more');
    }
    const pausing = input.held('pause');
    if (!menu && (input.pressed('pause') || (pausing && !pauseHeld)) && !selectHeld && screen !== 'card' && !attract) {
      if (hub) menus.showHubPause();
      else {
        inspector()?.pause();
        menus.showPause(0);
      }
    }
    pauseHeld = pausing;
    if (!menu && input.pressed('act') && snap.mode === 'roam' && snap.text && !LURE_IDS.has(snap.text)) {
      run('game.start', { event: snap.text });
    }
    if (!menu) {
      const locked = input.mouse?.locked ?? false;
      input.virtual.axis('game:mouse', locked ? [mouseDx, mouseDy] : [0, 0]);
      mouseDx = 0;
      mouseDy = 0;
      if (snap.event === 'group' && !hub) sendSeats(input, pads);
      else {
        input.virtual.axis('game:claim', null);
        input.virtual.axis('game:seats', null);
      }
    }
    if (hub && hubView) hubView.tick(input, snap);
  }

  function openBeat(snap: Snap): void {
    if (snap.mode === 'results' && screen !== 'results') menus.showResults(snap.event, snap.rank);
    else if (snap.mode === 'evening' && screen !== 'evening') menus.showEvening();
    else if (snap.mode === 'credits' && screen !== 'credits') menus.showCredits();
    else if (screen === 'results' || screen === 'evening' || screen === 'credits')
      screen = attract ? 'attract' : 'play';
  }

  function setLook(snap: Snap): void {
    const id =
      snap.event === 'tilt' && snap.phase < 3
        ? 'look:storm'
        : snap.event === 'tilt' && snap.phase >= 3
          ? 'look:dawn'
          : 'look:retreat';
    if (!lookOk || id === look || !inspector()) return;
    try {
      inspector()?.set('post.look', id);
      look = id;
    } catch {
      lookOk = false;
    }
  }

  function remember(snap: Snap): void {
    if (attract || exitPending || hub) return;
    save = { ...noteProgress(save, snap), settings: { ...prefs, icons } };
    const finds = snap.finds.join(',');
    const key = [snap.mode, snap.event, snap.result, snap.pebbles, snap.cursor, snap.credits, snap.prior, finds].join(
      ':',
    );
    if (key !== savedKey && snap.mode !== 'title' && !attract && !hub) {
      savedKey = key;
      writeSave(store, save);
    }
  }

  function paint(snap: Snap, drawn: EngineFrame): void {
    const lure = LURE_IDS.has(snap.text) ? LURES.find((row) => row.id === snap.text) : undefined;
    const sentence = lure ? (LINES[`lure.${lure.id}`] ?? lure.line) : (LINES[snap.line] ?? '');
    if (sentence && sentence !== said && screen !== 'title' && screen !== 'touch' && screen !== 'card') {
      said = sentence;
      say(audio, speakerFor(snap.line || 'tare.welcome'), sentence, prefs.voices);
    }
    if (screen === 'touch') note.textContent = 'Controller or keyboard required.';
    else if (menu || !sentence) note.textContent = promptLine(glyphSet);
    else note.textContent = sentence;
    banner.textContent = attract ? 'Thumb Yoga. DEMO. Press any button.' : '';
    disc.hidden = (snap.mode === 'title' && !attract) || screen === 'card';
    const dot = disc.querySelector('#dot');
    if (dot) {
      dot.setAttribute('cx', String(50 + snap.ax * 40));
      dot.setAttribute('cy', String(50 - snap.ay * 40));
    }
    copy.hidden = screen === 'about' || screen === 'card';
    if (snap.mode === 'results') copy.textContent = resultCopy(snap, LINES[`rank.${snap.rank}`] ?? '');
    else if (snap.mode === 'evening') copy.textContent = LINES['evening.close'] ?? '';
    else if (snap.mode === 'credits')
      copy.textContent = `${LINES['credits.roll'] ?? ''} ${LINES['credits.walk'] ?? ''}`;
    else if (lure) copy.textContent = lure.line;
    else copy.textContent = snap.mode === 'roam' ? `Day ${snap.day}. Pebbles ${Math.round(snap.pebbles)}.` : '';
    touchBtn.hidden = !touch || (armed && screen !== 'touch');
    about.hidden = screen !== 'about';
    if (screen !== 'dev') sliders.hidden = true;
    const nextSong = songFor(attract ? { ...snap, mode: snap.mode === 'title' ? 'event' : snap.mode } : snap);
    if (nextSong !== song) {
      song = nextSong;
      audio.music(nextSong);
    }
    audio.update(drawn.camera, drawn.queries ?? undefined);
  }
}

/** Title and the other front screens, where ten quiet seconds starts the demo. */
function front(screen: string): boolean {
  return (
    screen === 'title' ||
    screen === 'touch' ||
    screen === 'settings' ||
    screen === 'about' ||
    screen === 'controls' ||
    screen === 'programme'
  );
}

/** The label under the menu cursor. */
function labelOf(item: MenuItem | undefined): string {
  return typeof item === 'string' ? item : (item?.label ?? '');
}

/** Extra pads fill seats 1 to 3. Seat 0 stays on the balance map. */
function sendSeats(input: NonNullable<Engine['input']>, pads: readonly (Gamepad | null)[]): void {
  const claim = [0, 0, 0, 0];
  const seats = Array.from({ length: 16 }, () => 0);
  for (let seat = 1; seat <= 3; seat += 1) {
    const pad = pads[seat];
    if (!pad) continue;
    claim[seat] = 1;
    seats[seat * 4] = pad.axes[0] ?? 0;
    seats[seat * 4 + 1] = -(pad.axes[1] ?? 0);
    seats[seat * 4 + 2] = pad.buttons[6]?.value || (pad.buttons[6]?.pressed ? 1 : 0);
    seats[seat * 4 + 3] = pad.buttons[7]?.value || (pad.buttons[7]?.pressed ? 1 : 0);
  }
  input.virtual.axis('game:claim', claim);
  input.virtual.axis('game:seats', seats);
}

/** A line in the shell. */
function para(kind: string): HTMLElement {
  const node = document.createElement('p');
  node.dataset.ui = kind;
  return node;
}
