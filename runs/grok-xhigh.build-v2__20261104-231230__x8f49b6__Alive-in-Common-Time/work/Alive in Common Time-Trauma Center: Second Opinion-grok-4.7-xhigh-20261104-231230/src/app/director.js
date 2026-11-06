import { GAME_TITLE, TAGLINE } from '../config/identity.js';
import { createTuning, DIFFICULTY, TUNING_DEFAULTS, TUNING_PAGES, TUNING_RANGES } from '../config/tuning.js';
import { getOp, storyOrder } from '../data/ops/index.js';
import { SCENES } from '../data/story/scenes.js';
import { castOf } from '../data/cast.js';
import { barkText } from '../data/barks.js';
import { fillPrompt } from '../input/glyphs.js';
import { createInput } from '../input/input.js';
import { createAudio } from '../audio/engine.js';
import { Sim } from '../sim/sim.js';
import { botInput } from '../sim/bot.js';
import { physicsReady } from '../sim/physics.js';
import { createPointerCamera, createView } from '../view/renderer.js';
import { loadSave, writeSave } from './save.js';
import { DEV_IDS, runDev } from './dev.js';
import { runSession } from './session.js';

const COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const WHEEL = ['scalpel', 'forceps', 'suction', 'gel', 'suture', 'laser', 'scanner', 'clamp'];
const ABOUT_HEADS = [
  ['sourceInformation', 'Source Information'],
  ['testingFeedback', 'Testing Feedback'],
  ['engineFeedback', 'Engine Feedback'],
  ['promptFeedback', 'Prompt Feedback'],
  ['credits', 'Credits'],
];
const FAIL_TITLE = { vitals: 'FLATLINE', time: 'TIME', miss: 'MALPRACTICE' };
const FX = {
  pop: 'pop', cut: 'scalpel', clamp: 'clamp', unclamp: 'clamp', shock: 'defib',
  inject: 'syringe', stabilize: 'syringe', gelled: 'gel', sealed: 'gel', tied: 'stitch',
  gate: 'thread', lasered: 'laser', scorch: 'laser', vent: 'laser', mark: 'scanner',
  nick: 'alarm', tear: 'alarm', fail: 'flatline', success: 'stamp', hush: 'murmur',
  sforzando: 'phone', arrest: 'alarm', drained: 'suction', tray: 'forceps', grip: 'forceps',
  drop: 'forceps', note: 'ui-move', pin: 'clamp', downed: 'pop', burst: 'pop', wake: 'chitter',
  fortissimo: 'screech', reattach: 'scratch', jerk: 'scratch', cue: 'ui-move',
};

const SETTINGS_PAGES = [
  [
    { id: 'music', label: 'Music', kind: 'slider', min: 0, max: 1, step: 0.01 },
    { id: 'effects', label: 'Effects', kind: 'slider', min: 0, max: 1, step: 0.01 },
    { id: 'voices', label: 'Voices', kind: 'slider', min: 0, max: 1, step: 0.01 },
  ],
  [
    { id: 'glyphs', label: 'Glyphs', kind: 'toggle' },
    { id: 'rumble', label: 'Rumble', kind: 'toggle' },
    { id: 'aimAssist', label: 'Aim Assist', kind: 'slider', min: 0, max: 1, step: 0.01 },
    { id: 'swapSticks', label: 'Swap Sticks', kind: 'toggle' },
    { id: 'tipSpeed', label: 'Tip Speed', kind: 'slider', min: 0.8, max: 3.5, step: 0.05 },
  ],
  [
    { id: 'fullscreen', label: 'Fullscreen', kind: 'toggle' },
    { id: 'shake', label: 'Screen Shake', kind: 'toggle' },
    { id: 'boil', label: 'Line Boil', kind: 'toggle' },
    { id: 'textSpeed', label: 'Text Speed', kind: 'cycle' },
  ],
];

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function clock(t) {
  const s = Math.max(0, Math.ceil(Number(t) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function createApp({ params }) {
  const save = loadSave();
  const tuning = createTuning();
  const settings = {
    glyphs: 'playstation',
    music: 0.1,
    effects: 0.8,
    voices: 0.8,
    rumble: true,
    shake: true,
    boil: true,
    textSpeed: 1,
    difficulty: save.difficulty || 'resident',
    aimAssist: tuning.aimAssist,
    tipSpeed: tuning.tipSpeed,
    swapSticks: false,
    fullscreen: false,
    ...(save.settings || {}),
  };
  tuning.aimAssist = settings.aimAssist;
  tuning.tipSpeed = settings.tipSpeed;

  const model = {
    screen: 'Boot',
    overlay: null,
    mode: 'standalone',
    params,
    tuning,
    settings,
    save,
    reached: new Set(),
    overlays: {},
    botOn: false,
    botOpts: {},
    warp: 0,
    test: params.get('test') === '1',
    norender: params.get('norender') === '1',
    pending: {},
    lastInput: performance.now(),
    attract: { on: false, from: null, opIndex: 0, opT: 0 },
    resultShown: false,
    sessionPause: false,
    focus: 0,
    page: 0,
    stack: [],
    joined: new Set(),
    siteHold: new Map(),
    storyMode: null,
    line: 0,
    consultChoice: 'careful',
    flow: 'story',
    storyIndex: 0,
    hold: 0,
    track: null,
    bark: null,
    blockMenu: false,
    paintSig: '',
    painting: false,
    countN: 0,
    card: null,
    nogfxNotice: false,
  };

  function persist() {
    if (model.attract.on || model.mode === 'session') return;
    model.save.difficulty = model.settings.difficulty;
    model.save.settings = { ...model.settings };
    writeSave(model.save);
  }

  function audioOk() {
    return !model.sessionInfo?.server;
  }

  const audio = createAudio();
  audio.setMusicGain(settings.music ?? 0.1);
  audio.sfx.gain.value = settings.effects ?? 0.8;
  audio.voice.gain.value = settings.voices ?? 0.8;
  model.audio = audio;

  function onKey(e) {
    if (e.repeat) return;
    if (e.key === 'Tab') e.preventDefault();
    audio.resume();
    model.lastInput = performance.now();
    if (model.attract.on) {
      model.pending = {};
      model.blockMenu = true;
      exitAttract();
      return;
    }
    if (model.mode === 'session' && (model.screen === 'Card' || AIHub.time?.() === -Infinity)) {
      const k = String(e.key || e.code || '').toLowerCase();
      if (k === 'enter' || k === ' ' || k === 'space') AIHub.answer('ready');
      else if (k === 'm') AIHub.answer('more');
      return;
    }
    if (model.screen === 'Touch notice') {
      model.pending.leaveTouch = true;
      return;
    }
    const key = String(e.key || '');
    const code = String(e.code || e.key || '');
    if (model.screen === 'Title') {
      model.pending.confirm = true;
      return;
    }
    const inPlay = model.screen === 'Operation' && !model.overlay && !model.sessionPause;
    if (inPlay && (key === 'h' || key === 'H' || code === 'KeyH')) {
      askBea();
      return;
    }
    if (key === 'Escape' || key === 'Backspace' || code === 'Escape' || code === 'Backspace') {
      model.pending[inPlay || model.screen === 'Story' ? 'pause' : 'back'] = true;
      return;
    }
    if (inPlay) return;
    if (key === 'Enter' || key === ' ' || code === 'Enter' || code === 'Space') model.pending.confirm = true;
    else if (key === 'Tab' || code === 'Tab') model.pending.skip = true;
    else if (key === 'ArrowUp' || key === 'w' || key === 'W' || code === 'ArrowUp' || code === 'KeyW') model.pending.up = true;
    else if (key === 'ArrowDown' || key === 's' || key === 'S' || code === 'ArrowDown' || code === 'KeyS') model.pending.down = true;
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A' || code === 'ArrowLeft' || code === 'KeyA') model.pending.left = true;
    else if (key === 'ArrowRight' || key === 'd' || key === 'D' || code === 'ArrowRight' || code === 'KeyD') model.pending.right = true;
    else if (key === 'q' || key === 'Q' || code === 'KeyQ') model.pending.pageLeft = true;
    else if (key === 'e' || key === 'E' || code === 'KeyE') model.pending.pageRight = true;
  }

  function onHover(id) {
    if (model.attract.on) {
      model.blockMenu = true;
      exitAttract();
      return;
    }
    const items = currentItems();
    const i = items.findIndex((it) => it.id === id);
    if (i >= 0 && i !== model.focus) {
      model.focus = i;
      if (model.screen === 'About') model.page = i;
      paint(true);
    }
  }

  function onActivate(id) {
    model.lastInput = performance.now();
    audio.resume();
    if (model.attract.on) {
      model.blockMenu = true;
      exitAttract();
      return;
    }
    if (model.blockMenu) {
      model.blockMenu = false;
      return;
    }
    if (model.mode === 'session' && (id === 'ready' || id === 'more')) {
      AIHub.answer(id === 'more' ? 'more' : 'ready');
      return;
    }
    activate(id);
  }

  function onTool(tool) {
    model.pendingTool = tool;
    model.lastInput = performance.now();
  }

  function onPointer() {
    model.lastInput = performance.now();
    if (model.attract.on) {
      model.blockMenu = true;
      exitAttract();
    }
  }

  model.onKey = onKey;
  model.onHover = onHover;
  model.onActivate = onActivate;
  model.onTool = onTool;
  model.onPointer = onPointer;
  model.persist = persist;
  model.reached = model.reached;
  model.openScene = openScene;
  model.setScreen = (name, overlay = null) => setScreen(name, overlay);

  ensureDom();
  model.input = createInput(model);
  document.documentElement.dataset.promptSet = 'keyboard';
  if (model.ui) {
    model.ui.addEventListener('input', (e) => {
      const id = e.target?.dataset?.slider;
      if (!id) return;
      writeSetting(id, Number(e.target.value));
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && model.mode !== 'session' && !model.attract.on && !model.overlay
      && (model.screen === 'Operation' || model.screen === 'Story')) {
      setOverlay('pause');
    }
  });
  window.addEventListener('resize', () => model.view?.resize?.());

  function ensureDom() {
    if (!document.body) return;
    if (!document.getElementById('boot')) {
      const boot = document.createElement('div');
      boot.id = 'boot';
      boot.textContent = 'Scrubbing in…';
      document.body.prepend(boot);
    }
    let app = document.getElementById('app');
    if (!app) {
      app = document.createElement('div');
      app.id = 'app';
      app.hidden = true;
      const canvas = document.createElement('canvas');
      canvas.id = 'view';
      const ui = document.createElement('div');
      ui.id = 'ui';
      app.append(canvas, ui);
      document.body.append(app);
    }
    model.canvas = document.getElementById('view');
    model.ui = document.getElementById('ui');
    document.body.tabIndex = 0;
  }

  function aboutData() {
    if (model.aboutDoc) return model.aboutDoc;
    const el = document.getElementById('about-data');
    try { model.aboutDoc = JSON.parse(el?.textContent || '{}'); } catch { model.aboutDoc = {}; }
    return model.aboutDoc;
  }

  function currentItems() {
    if (model.nogfxNotice) return [{ id: 'nogfx-ok', label: 'Continue' }];
    if (model.mode === 'session' && model.sessionPause) return settingsItems();
    if (model.overlay === 'chooser') return [{ id: 'continue', label: 'Continue' }, { id: 'new', label: 'New Game' }];
    if (model.overlay === 'pause') return pauseItems();
    if (model.overlay === 'dev') return devItems();
    if (model.screen === 'Title') return [{ id: 'start', label: 'Press any button' }];
    if (model.screen === 'Touch notice') return [{ id: 'settings', label: 'Settings' }];
    if (model.screen === 'Main Menu') {
      const story = (model.save.intro || model.save.storyPos > 0 || model.save.cleared?.length) ? 'Story' : 'Story';
      return [
        { id: 'story', label: story },
        { id: 'free', label: 'Free Play' },
        { id: 'rounds', label: 'Grand Rounds' },
        { id: 'settings', label: 'Settings' },
        { id: 'about', label: 'About & Credits' },
      ];
    }
    if (model.screen === 'Story' && model.storyMode === 'ask') {
      return [
        { id: 'intern', label: 'Intern' },
        { id: 'resident', label: 'Resident' },
        { id: 'attending', label: 'Attending' },
      ];
    }
    if (model.screen === 'Story' && model.storyMode === 'lines') return [{ id: 'advance', label: 'Continue' }];
    if (model.screen === 'Chart') return chartItems();
    if (model.screen === 'Report') return [{ id: 'report-next', label: 'Continue' }];
    if (model.screen === 'Fail') return failItems();
    if (model.screen === 'Free Play') return freeItems();
    if (model.screen === 'Lobby') return lobbyItems();
    if (model.screen === 'Settings') return settingsItems();
    if (model.screen === 'About') return aboutItems();
    if (model.screen === 'Credits roll') return [{ id: 'credits-skip', label: 'Skip' }];
    if (model.mode === 'session' && model.screen === 'Card') return [{ id: 'ready', label: 'Ready' }, { id: 'more', label: 'More Time' }];
    return [];
  }

  function chartItems() {
    const op = safeOp(model.opId);
    if (op?.consult) {
      return [
        { id: 'careful', label: 'Careful' },
        { id: 'aggressive', label: 'Aggressive' },
        { id: 'begin', label: 'Begin' },
      ];
    }
    return [{ id: 'begin', label: 'Begin' }];
  }

  function pauseItems() {
    if (model.screen === 'Story') {
      return [
        { id: 'resume', label: 'Resume' },
        { id: 'skip-scene', label: 'Skip Scene' },
        { id: 'settings', label: 'Settings' },
        { id: 'dev', label: 'Dev Mode' },
        { id: 'quit', label: 'Quit to Menu' },
      ];
    }
    return [
      { id: 'resume', label: 'Resume' },
      { id: 'retry', label: 'Retry Phase' },
      { id: 'restart', label: 'Restart Operation' },
      { id: 'settings', label: 'Settings' },
      { id: 'dev', label: 'Dev Mode' },
      { id: 'quit', label: 'Quit to Menu' },
    ];
  }

  function failItems() {
    const items = [
      { id: 'retry', label: 'Retry Phase' },
      { id: 'restart', label: 'Restart Operation' },
      { id: 'quit', label: 'Quit to Menu' },
    ];
    if (model.sim?.notesOffer) items.push({ id: 'notes', label: "Bea's Notes" });
    return items;
  }

  function freeItems() {
    const ids = storyOrder().filter(unlocked);
    const slice = ids.slice(model.page * 4, model.page * 4 + 4);
    const items = slice.map((id) => {
      const rank = model.save.ranks?.[id];
      return { id: `play:${id}`, label: `${getOp(id).title}${rank ? ` ${rank}` : ''}` };
    });
    items.push({ id: 'doctor', label: `Doctor: ${model.doctor === 'ines' ? 'Ines' : 'Ren'}` });
    return items;
  }

  function lobbyItems() {
    return [0, 1, 2, 3].map((i) => ({
      id: `seat:${i}`,
      label: model.joined.has(i) ? `Seat ${i + 1} in` : `Seat ${i + 1}`,
    })).concat([{ id: 'begin', label: 'Begin' }]);
  }

  function settingsItems() {
    const page = SETTINGS_PAGES[model.page] || SETTINGS_PAGES[0];
    return page.map((item) => ({ ...item, label: `${item.label}: ${readout(item.id)}` }));
  }

  function aboutSlides() {
    const data = aboutData();
    const slides = [];
    for (const [key, label] of ABOUT_HEADS) {
      let lines = [];
      if (key === 'credits') {
        lines = [...(Array.isArray(data.credits) ? data.credits : []), `Renderer: ${model.view?.backend || 'none'}`];
      } else {
        const block = data[key];
        if (block && !Array.isArray(block) && typeof block === 'object') {
          lines = Object.entries(block).map(([k, v]) => `${k}: ${v}`);
        } else if (Array.isArray(block)) lines = block.map(String);
      }
      const groups = [];
      let cur = [];
      let cost = 0;
      for (const line of lines) {
        const weight = Math.max(1, Math.ceil(line.length / 80));
        if (cur.length && cost + weight > 5) {
          groups.push(cur);
          cur = [];
          cost = 0;
        }
        cur.push(line);
        cost += weight;
      }
      if (cur.length || !groups.length) groups.push(cur);
      groups.forEach((chunk, i) => {
        slides.push({ head: key, label, lines: chunk, part: i + 1, parts: groups.length });
      });
    }
    return slides;
  }

  function aboutItems() {
    const slides = aboutSlides();
    return ABOUT_HEADS.map(([key, label]) => {
      const first = Math.max(0, slides.findIndex((s) => s.head === key));
      return { id: `about:${first}`, label, head: key };
    });
  }

  function devItems() {
    const pages = devPages();
    const page = pages[Math.min(model.page, pages.length - 1)] || [];
    return page;
  }

  function devPages() {
    const buttons = DEV_IDS.map((id) => ({
      id,
      kind: 'dev',
      label: id.startsWith('op:') ? safeOp(id.slice(3))?.title || id : id,
    }));
    const pages = [];
    for (let i = 0; i < buttons.length; i += 6) pages.push(buttons.slice(i, i + 6));
    for (const page of TUNING_PAGES) {
      pages.push(page.keys.map((key) => ({
        id: key,
        kind: 'slider',
        label: key,
        min: TUNING_RANGES[key][0],
        max: TUNING_RANGES[key][1],
        step: stepOf(TUNING_RANGES[key]),
      })).concat([{ id: 'reset-page', kind: 'dev', label: 'Reset page', keys: page.keys }]));
    }
    pages.push([{ id: 'reset-all', kind: 'dev', label: 'Reset all' }]);
    return pages;
  }

  function stepOf(range) {
    const span = range[1] - range[0];
    if (span <= 20 && Number.isInteger(range[0]) && Number.isInteger(range[1])) return 1;
    return Math.round((span / 20) * 1000) / 1000;
  }

  function pageCount() {
    if (model.overlay === 'dev') return devPages().length;
    if (model.screen === 'Settings' || model.sessionPause) return SETTINGS_PAGES.length;
    if (model.screen === 'About') return Math.max(1, aboutSlides().length);
    if (model.screen === 'Free Play') return Math.max(1, Math.ceil(storyOrder().filter(unlocked).length / 4));
    return 1;
  }

  function unlocked(id) {
    if (model.save.unlocked) return true;
    if (model.save.cleared?.includes(id)) return true;
    const i = storyOrder().indexOf(id);
    return i >= 0 && i <= (model.save.storyPos || 0);
  }

  function safeOp(id) {
    try { return getOp(id); } catch { return null; }
  }

  function defaultFocus() {
    if (model.screen === 'Story' && model.storyMode === 'ask') return 1;
    if (model.screen === 'Chart') return Math.max(0, chartItems().length - 1);
    if (model.screen === 'Lobby') return 4;
    if (model.screen === 'About') return model.page || 0;
    return 0;
  }

  function setScreen(name, overlay = null) {
    model.screen = name;
    model.overlay = overlay;
    model.page = name === 'About' ? model.page : 0;
    if (name !== 'About') model.page = 0;
    model.reached.add(name);
    if (name === 'Credits roll') model.reached.add('Credits');
    model.focus = defaultFocus();
    document.body.dataset.screen = name;
    syncMusic();
    present();
    paint(true);
  }

  function setOverlay(name) {
    model.overlay = name;
    model.focus = 0;
    model.page = 0;
    paint(true);
  }

  function readout(id) {
    if (id === 'glyphs') return model.settings.glyphs === 'xbox' ? 'Xbox' : 'PlayStation';
    if (id === 'rumble' || id === 'swapSticks' || id === 'fullscreen' || id === 'shake' || id === 'boil') {
      return model.settings[id] ? 'On' : 'Off';
    }
    if (id === 'textSpeed') return `${model.settings.textSpeed}x`;
    if (id === 'music' || id === 'effects' || id === 'voices') return `${Math.round((model.settings[id] ?? 0) * 100)}%`;
    const n = id in TUNING_DEFAULTS ? model.tuning[id] : model.settings[id];
    return `${Number(n).toFixed(2)} (default ${Number(TUNING_DEFAULTS[id] ?? n).toFixed(2)})`;
  }

  function writeSetting(id, value) {
    if (id === 'music' || id === 'effects' || id === 'voices' || id === 'aimAssist' || id === 'tipSpeed') {
      model.settings[id] = value;
      if (id === 'music') audio.setMusicGain(value);
      if (id === 'effects') audio.sfx.gain.value = value;
      if (id === 'voices') audio.voice.gain.value = value;
      if (id === 'aimAssist' || id === 'tipSpeed') model.tuning[id] = value;
    } else if (id in TUNING_DEFAULTS) {
      model.tuning[id] = value;
    } else {
      model.settings[id] = value;
    }
    const node = model.ui?.querySelector(`[data-readout="${id}"]`);
    if (node) node.textContent = readout(id);
    persist();
  }

  function syncMusic() {
    if (!audioOk()) return;
    let id = 'title';
    let bpm = 80;
    if (model.mode === 'session') {
      id = (model.screen === 'Card' || model.screen === 'Countdown') ? 'title' : 'rounds';
    } else if (model.attract.on && model.sim) {
      id = model.sim.op.music || 'rounds';
      bpm = model.sim.op.bpm || 80;
    } else if (model.screen === 'Story' && model.scene?.music) {
      id = model.scene.music;
    } else if ((model.screen === 'Operation' || model.screen === 'Chart' || model.screen === 'Report' || model.screen === 'Fail') && model.opId) {
      const op = safeOp(model.opId);
      id = model.screen === 'Operation' ? (op?.music || 'or-calm') : 'or-tense';
      bpm = op?.bpm || 80;
    } else if (model.screen === 'Credits roll') id = 'credits';
    else if (model.screen === 'Lobby') id = 'rounds';
    if (id !== model.track) {
      model.track = id;
      audio.playTrack(id, bpm);
    }
    audio.setHush(!!(model.sim && model.sim.hushPhase));
  }

  function present() {
    const view = model.view;
    if (!view) return;
    if (model.screen === 'Story' && model.scene) {
      const line = model.scene.lines[model.line];
      view.showStory?.(model.scene.set, line?.who);
      view.setSpeaker?.(line?.who, { mouth: 'open' });
      view.shout?.(!!line?.shout);
    } else if (model.screen === 'Operation' || model.attract.on || model.screen === 'Chart') {
      view.showOr?.();
      view.setPortrait?.(model.screen === 'Operation' || !!model.attract.on);
      view.shout?.(false);
    } else {
      view.showOr?.();
      view.placeLamp?.(true);
      view.setPortrait?.(false);
      view.shout?.(false);
    }
  }

  function decorateState(st) {
    if (!st) return st;
    if (!st.organ) {
      const op = safeOp(st.op);
      const site = op?.sites?.find((s) => s.id === st.site) || op?.sites?.[0];
      st.organ = site?.organ || 'forearm';
    }
    return st;
  }
  model.decorateState = decorateState;

  function playEvent(ev) {
    if (!ev) return;
    if (ev.type === 'say' && ev.text) {
      if (audioOk()) audio.say(ev.who || 'bea', ev.text);
      model.bark = { who: ev.who || 'bea', text: ev.text };
      model.view?.setSpeaker?.(ev.who || 'bea', { mouth: 'open' });
    } else if (ev.type === 'bark') {
      const text = barkText(ev.key, ev.arg, ev.n || 0);
      if (audioOk()) audio.say(ev.who || 'bea', text);
      model.bark = { who: ev.who || 'bea', text };
      model.view?.setSpeaker?.(ev.who || 'bea', { mouth: 'open' });
    } else if (audioOk() && FX[ev.type]) audio.effect(FX[ev.type]);
    if (ev.type === 'hush' || ev.type === 'success' || ev.type === 'fail') syncMusic();
  }
  model.playEvent = playEvent;

  function tickAudio() {
    if (!audioOk()) return;
    audio.scheduleAhead();
    if (model.remoteEvents?.length) {
      for (const ev of model.remoteEvents) playEvent(ev);
      model.remoteEvents = [];
    }
  }
  model.tickAudio = tickAudio;

  function syncFromSim() {
    if (!model.view || !model.sim || model.norender) return;
    model.painting = true;
    try {
      model.view.showOr?.();
      model.view.setPortrait?.(model.screen === 'Operation' || !!model.attract.on);
      model.view.sync(decorateState(model.sim.state), 1 / 60);
    } catch { /* the next pump draws */ }
    const drawn = model.view.render?.();
    if (drawn?.then) drawn.then(() => { model.painting = false; }, () => { model.painting = false; });
    else model.painting = false;
  }
  model.syncFromSim = syncFromSim;

  function askBea() {
    const text = barkText('idle', null, (model.sim?.tick || 0) % 3);
    audio.say('bea', text);
    model.bark = { who: 'bea', text };
    paint(true);
  }

  function openScene(id, onDone) {
    const scene = SCENES.find((s) => s.id === id);
    if (!scene) {
      onDone?.();
      return;
    }
    model.scene = scene;
    model.sceneId = id;
    model.line = 0;
    model.storyMode = 'lines';
    model.sceneDone = onDone || null;
    setScreen('Story');
    const line = scene.lines[0];
    if (line && audioOk()) audio.say(line.who, line.text);
  }

  function advanceLine() {
    const lines = model.scene?.lines || [];
    if (model.line >= lines.length - 1) {
      finishScene();
      return;
    }
    model.line += 1;
    const line = lines[model.line];
    model.view?.setSpeaker?.(line.who, { mouth: 'open' });
    model.view?.shout?.(!!line.shout);
    if (audioOk()) audio.say(line.who, line.text);
    paint(true);
  }

  function finishScene() {
    const done = model.sceneDone;
    model.sceneDone = null;
    model.view?.shout?.(false);
    if (done) done();
    else setScreen('Main Menu');
  }

  function openAsk() {
    model.storyMode = 'ask';
    model.flow = 'story';
    setScreen('Story');
  }

  function beginNew() {
    model.save.storyPos = 0;
    model.save.intro = false;
    model.save.cleared = [];
    model.flow = 'story';
    model.overlay = null;
    persist();
    openAsk();
  }

  function confirmDifficulty(id) {
    model.settings.difficulty = id;
    model.save.difficulty = id;
    persist();
    if (!model.save.intro) openScene('S0', afterIntro);
    else openOpStory(model.save.storyPos || 0);
  }

  function afterIntro() {
    model.save.intro = true;
    persist();
    openOpStory(0);
  }

  function openOpStory(index) {
    const order = storyOrder();
    if (index >= order.length) {
      openCredits();
      return;
    }
    model.storyIndex = index;
    model.flow = 'story';
    model.save.storyPos = index;
    model.save.intro = true;
    persist();
    const op = getOp(order[index]);
    model.opId = op.id;
    if (op.scene?.before) openScene(op.scene.before, () => openChart(op.id));
    else openChart(op.id);
  }

  function openChart(opId) {
    model.opId = opId;
    model.consultChoice = 'careful';
    model.flow = model.flow || 'story';
    setScreen('Chart');
  }

  function openCredits() {
    setScreen('Credits roll');
  }

  function continueReport() {
    recordResult();
    if (model.flow === 'couch') {
      setScreen('Lobby');
      return;
    }
    if (model.flow === 'free') {
      setScreen('Free Play');
      return;
    }
    const op = safeOp(model.opId);
    if (op?.scene?.after) openScene(op.scene.after, afterScene);
    else afterScene();
  }

  function afterScene() {
    const order = storyOrder();
    const i = order.indexOf(model.opId);
    if (model.flow === 'story' && i >= 0 && i < order.length - 1) openOpStory(i + 1);
    else if (model.flow === 'story') openCredits();
    else setScreen('Main Menu');
  }

  function recordResult() {
    if (model.attract.on || model.mode === 'session' || !model.sim || !model.opId) return;
    if (model.sim.rank?.id) model.save.ranks[model.opId] = model.sim.rank.id;
    if (model.flow === 'story' && model.sim.complete) {
      if (!model.save.cleared.includes(model.opId)) model.save.cleared.push(model.opId);
      const i = storyOrder().indexOf(model.opId);
      if (i >= 0) model.save.storyPos = Math.max(model.save.storyPos || 0, i + 1);
    }
    persist();
  }

  function freeSim() {
    try { model.sim?.physics?.free?.(); } catch { /* world already freed */ }
    model.sim = null;
  }

  function startOperation(opId, extra = {}) {
    model.opId = opId;
    model.resultShown = false;
    const op = getOp(opId);
    const players = extra.players || 1;
    const build = (physics) => {
      freeSim();
      model.sim = new Sim({
        op: opId,
        seed: extra.seed ?? 1,
        physics,
        tuning: model.tuning,
        difficulty: model.settings.difficulty || 'resident',
        consult: op.consult ? (model.consultChoice || 'careful') : null,
        players,
        couch: !!extra.couch,
        notes: !!extra.notes,
      });
      if (extra.couch) {
        for (let i = 0; i < model.sim.seats.length; i++) {
          if (!model.joined.has(model.sim.seats[i].id)) model.sim.leave(model.sim.seats[i].id);
        }
      }
      model.overlay = null;
      setScreen('Operation');
    };
    if (model.test || extra.physics === false) {
      build(false);
      return;
    }
    void (async () => {
      let physics = false;
      try { await physicsReady(); physics = true; } catch { physics = false; }
      if (model.mode === 'session') return;
      build(physics);
    })();
  }

  function mountAttract(opId) {
    freeSim();
    model.sim = new Sim({
      op: opId,
      seed: 1,
      physics: false,
      tuning: model.tuning,
      difficulty: 'resident',
      players: 1,
      cheats: { lockVitals: true, freezeTimer: true, infiniteComposure: true, infiniteClamps: true },
    });
    model.opId = opId;
    model.botOn = true;
    model.botOpts = {};
    model.view?.showOr?.();
    model.view?.setPortrait?.(true);
    syncMusic();
  }

  function startAttract() {
    const order = storyOrder();
    model.attract = { on: true, from: model.screen, opIndex: 0, opT: performance.now() };
    mountAttract(order[0]);
    paint(true);
  }

  function exitAttract() {
    if (!model.attract.on) return;
    model.attract.on = false;
    model.botOn = false;
    model.botOpts = {};
    freeSim();
    model.opId = null;
    model.pending = {};
    model.lastInput = performance.now();
    syncMusic();
    paint(true);
  }

  function nextAttractOp() {
    const order = storyOrder();
    model.attract.opIndex = (model.attract.opIndex + 1) % order.length;
    model.attract.opT = performance.now();
    mountAttract(order[model.attract.opIndex]);
    paint(true);
  }

  function checkAttract() {
    if (model.mode === 'session') return;
    const idle = model.screen === 'Title' || model.screen === 'Main Menu' || model.screen === 'Free Play' || model.screen === 'Touch notice';
    if (!model.attract.on) {
      if (model.overlay || !idle) return;
      if (performance.now() - model.lastInput >= 10000) startAttract();
      return;
    }
    if (performance.now() - model.attract.opT >= 2000) nextAttractOp();
  }

  function joinSeat(index) {
    model.joined.add(index);
    paint(true);
  }

  function startCouch() {
    if (model.joined.size === 0) {
      joinSeat(0);
      return;
    }
    model.flow = 'couch';
    const players = [0, 1, 2, 3].map((i) => ({ id: i, name: `Seat ${i + 1}`, color: COLORS[i] }));
    startOperation('grand-rounds', { couch: true, players });
  }

  function activate(id) {
    if (!id) return;
    if (id === 'nogfx-ok') {
      model.nogfxNotice = false;
      paint(true);
      return;
    }
    if (id === 'start') {
      setScreen('Main Menu');
      return;
    }
    if (id === 'story') {
      if (model.save.intro || (model.save.storyPos || 0) > 0 || model.save.cleared?.length) {
        model.overlay = 'chooser';
        model.focus = 0;
        paint(true);
      } else openAsk();
      return;
    }
    if (id === 'continue') {
      model.overlay = null;
      model.flow = 'story';
      if (!model.save.intro) openScene('S0', afterIntro);
      else openOpStory(model.save.storyPos || 0);
      return;
    }
    if (id === 'new') {
      beginNew();
      return;
    }
    if (id === 'free') {
      model.flow = 'free';
      setScreen('Free Play');
      return;
    }
    if (id === 'rounds') {
      model.joined = new Set();
      setScreen('Lobby');
      return;
    }
    if (id === 'settings') {
      openSettings();
      return;
    }
    if (id === 'about') {
      model.page = 0;
      setScreen('About');
      return;
    }
    if (id === 'intern' || id === 'resident' || id === 'attending') {
      confirmDifficulty(id);
      return;
    }
    if (id === 'advance') {
      advanceLine();
      return;
    }
    if (id === 'careful' || id === 'aggressive') {
      model.consultChoice = id;
      model.focus = chartItems().length - 1;
      paint(true);
      return;
    }
    if (id === 'begin' && model.screen === 'Chart') {
      model.flow = model.flow === 'free' ? 'free' : 'story';
      startOperation(model.opId);
      return;
    }
    if (id === 'begin' && model.screen === 'Lobby') {
      startCouch();
      return;
    }
    if (id.startsWith('seat:')) {
      joinSeat(Number(id.slice(5)));
      return;
    }
    if (id.startsWith('play:')) {
      model.flow = 'free';
      openChart(id.slice(5));
      return;
    }
    if (id === 'doctor') {
      model.doctor = model.doctor === 'ines' ? 'ren' : 'ines';
      paint(true);
      return;
    }
    if (id === 'report-next') {
      continueReport();
      return;
    }
    if (id === 'credits-skip' || id === 'skip-scene') {
      if (model.screen === 'Credits roll' || id === 'credits-skip') setScreen('Main Menu');
      else finishScene();
      return;
    }
    if (id === 'resume') {
      model.overlay = null;
      paint(true);
      return;
    }
    if (id === 'retry') {
      if (model.sim && !model.sim.over) model.sim.retryPhase();
      else model.sim?.retryPhase?.();
      model.resultShown = false;
      model.overlay = null;
      setScreen('Operation');
      return;
    }
    if (id === 'restart') {
      const flow = model.flow;
      startOperation(model.opId, { couch: flow === 'couch', players: flow === 'couch' ? [0, 1, 2, 3].map((i) => ({ id: i, name: `Seat ${i + 1}`, color: COLORS[i] })) : 1 });
      return;
    }
    if (id === 'notes') {
      try { model.sim?.acceptNotes?.(); } catch { /* notes stay offered */ }
      model.resultShown = false;
      model.overlay = null;
      setScreen('Operation');
      return;
    }
    if (id === 'quit') {
      model.overlay = null;
      freeSim();
      setScreen('Main Menu');
      return;
    }
    if (id === 'dev') {
      if (model.mode === 'session') return;
      setOverlay('dev');
      return;
    }
    if (id === 'back-settings' || id === 'back') {
      closeSettings();
      return;
    }
    if (id.startsWith('about:')) {
      model.page = Number(id.slice(6)) || 0;
      model.focus = model.page;
      paint(true);
      return;
    }
    if (id.startsWith('site:')) {
      const sim = model.sim;
      if (!sim) return;
      const idx = sim.op.sites.findIndex((s) => s.id === id.slice(5));
      if (idx >= 0) sim.setSite(sim.seats[0], idx);
      paint(true);
      return;
    }
    if (id === 'glyphs') {
      model.settings.glyphs = model.settings.glyphs === 'xbox' ? 'playstation' : 'xbox';
      persist();
      paint(true);
      return;
    }
    if (id === 'rumble' || id === 'swapSticks' || id === 'shake' || id === 'boil') {
      model.settings[id] = !model.settings[id];
      if (id === 'boil') model.view?.setBoil?.(!!model.settings.boil);
      persist();
      paint(true);
      return;
    }
    if (id === 'fullscreen') {
      model.settings.fullscreen = !model.settings.fullscreen;
      const node = document.documentElement;
      if (model.settings.fullscreen) node.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
      persist();
      paint(true);
      return;
    }
    if (id === 'textSpeed') {
      model.settings.textSpeed = model.settings.textSpeed >= 4 ? 1 : model.settings.textSpeed * 2;
      persist();
      paint(true);
      return;
    }
    if (DEV_IDS.includes(id) || id === 'reset-page' || id === 'reset-all' || id === 'jump') {
      const page = devPages()[model.page] || [];
      const found = page.find((item) => item.id === id);
      runDev(model, id, found?.keys);
      return;
    }
  }

  function openSettings() {
    if (model.mode === 'session') {
      model.sessionPause = true;
      paint(true);
      return;
    }
    model.returnTo = { screen: model.screen, overlay: model.overlay };
    model.page = 0;
    setScreen('Settings');
  }

  function closeSettings() {
    if (model.mode === 'session') {
      model.sessionPause = false;
      paint(true);
      return;
    }
    const ret = model.returnTo;
    model.returnTo = null;
    if (!ret) {
      setScreen('Main Menu');
      return;
    }
    setScreen(ret.screen);
    if (ret.overlay) setOverlay(ret.overlay);
  }
  model.applySettings = (sample) => {
    const menu = sample?.menu || {};
    if (menu.pageLeft) turnPage(-1);
    else if (menu.pageRight) turnPage(1);
    else if (menu.up) moveFocus(-1);
    else if (menu.down) moveFocus(1);
    else if (menu.left) nudge(-1);
    else if (menu.right) nudge(1);
    else if (menu.confirm) {
      const item = currentItems()[model.focus];
      if (item) activate(item.id);
    }
  };

  function moveFocus(dir) {
    const items = currentItems();
    if (!items.length) return;
    model.focus = (model.focus + dir + items.length) % items.length;
    if (model.screen === 'About' && !model.overlay) {
      const item = items[model.focus];
      if (item?.id?.startsWith('about:')) model.page = Number(item.id.slice(6)) || 0;
    }
    paint(true);
  }

  function turnPage(dir) {
    const n = pageCount();
    if (n <= 1) return false;
    model.page = (model.page + dir + n) % n;
    if (model.screen === 'About') {
      const head = aboutSlides()[model.page]?.head;
      const i = aboutItems().findIndex((item) => item.head === head);
      model.focus = i >= 0 ? i : 0;
    } else model.focus = 0;
    paint(true);
    return true;
  }

  function nudge(dir) {
    if (model.screen === 'Chart' && !model.overlay) {
      const order = ['intern', 'resident', 'attending'];
      const i = Math.max(0, order.indexOf(model.settings.difficulty || 'resident'));
      model.settings.difficulty = order[(i + (dir < 0 ? 2 : 1)) % 3];
      model.save.difficulty = model.settings.difficulty;
      persist();
      paint(true);
      return true;
    }
    const item = currentItems()[model.focus];
    if (!item) return false;
    if (item.kind === 'slider') {
      const cur = item.id in TUNING_DEFAULTS ? model.tuning[item.id] : (model.settings[item.id] ?? item.min);
      const step = item.step || 0.05;
      const v = Math.max(item.min, Math.min(item.max, Math.round((cur + dir * step) * 1000) / 1000));
      writeSetting(item.id, v);
      paint(true);
      return true;
    }
    if (item.kind === 'toggle' || item.kind === 'cycle' || item.id === 'glyphs' || item.id === 'textSpeed') {
      activate(item.id);
      return true;
    }
    return false;
  }

  function prepFrame(id, frame) {
    const next = { ...(frame || {}) };
    if (model.pendingTool && (id === 0 || id === model.sim?.seats?.[0]?.id)) {
      next.tool = model.pendingTool;
      model.pendingTool = null;
    }
    const prev = model.siteHold.get(id) || 0;
    if (next.siteDelta && next.siteDelta === prev) next.siteDelta = 0;
    model.siteHold.set(id, frame?.siteDelta || 0);
    return next;
  }

  function feedSim(sample) {
    const sim = model.sim;
    if (!sim || sim.over) return;
    const playing = model.attract.on || (model.screen === 'Operation' && !model.overlay && !model.sessionPause);
    if (!playing) return;
    if (model.botOn) {
      for (const seat of sim.seats) {
        if (seat.out) continue;
        sim.input(seat.id, prepFrame(seat.id, botInput(sim, seat, model.botOpts || {})));
      }
    } else if (model.flow === 'couch') {
      for (const s of sample.seats) {
        if (!model.joined.has(s.index)) continue;
        const seat = sim.seats.find((x) => x.id === s.index);
        if (seat && !seat.out) sim.input(seat.id, prepFrame(seat.id, s.frame));
      }
    } else {
      const s0 = sample.seats.find((s) => s.index === 0);
      const seat = sim.seats[0];
      if (s0 && seat) sim.input(seat.id, prepFrame(seat.id, s0.frame));
    }
    if (model.override && sim.seats[0]) {
      sim.input(sim.seats[0].id, prepFrame(sim.seats[0].id, model.override));
    }
    sim.step();
    for (const ev of sim.events || []) playEvent(ev);
    if (model.attract.on && sim.over) nextAttractOp();
    else if (!model.attract.on && sim.over && !model.resultShown) {
      model.resultShown = true;
      if (sim.complete) setScreen('Report');
      else setScreen('Fail');
    }
  }

  function realInput(sample, menu, pend) {
    if (Object.values(menu).some(Boolean) || Object.values(pend).some(Boolean)) return true;
    return sample.seats.some((s) => {
      if (s.edges && Object.values(s.edges).some(Boolean)) return true;
      const f = s.frame;
      return f && (Math.hypot(f.x || 0, f.y || 0) > 0.2 || (f.use || 0) > 0.2);
    });
  }

  let busy = false;
  function stepOnce() {
    if (busy || model.mode === 'session') return;
    busy = true;
    try {
      const sample = model.input.poll();
      const pend = model.pending;
      model.pending = {};
      const menu = { ...sample.menu };
      for (const k of Object.keys(pend)) if (pend[k]) menu[k] = true;
      model.input.takeClick();
      if (realInput(sample, menu, pend)) model.lastInput = performance.now();
      if (model.attract.on && (realInput(sample, menu, pend) || sample.hover)) {
        model.blockMenu = true;
        exitAttract();
        return;
      }
      if (model.blockMenu) {
        const held = sample.held || {};
        const padHeld = sample.seats.some((s) => (s.frame?.use || 0) > 0.2);
        if (held.confirm || held.back || padHeld) return;
        model.blockMenu = false;
      }
      if (model.screen === 'Touch notice' && (pend.leaveTouch || sample.seenPad || model.input.seenPad)) {
        if (pend.leaveTouch || sample.seats.some((s) => s.edges && Object.values(s.edges).some(Boolean))) {
          setScreen('Title');
          return;
        }
      }
      const padPause = sample.seats.some((s) => s.edges?.pause);
      const inPlay = model.screen === 'Operation' && !model.overlay;
      if ((pend.pause || padPause || (menu.back && model.screen === 'Story' && !model.overlay)) && model.mode !== 'session') {
        if (inPlay || model.screen === 'Story' || pend.pause || padPause) {
          setOverlay('pause');
          return;
        }
      }
      if (menu.back && model.overlay) {
        if (model.overlay === 'dev') setOverlay('pause');
        else if (model.screen === 'Settings') closeSettings();
        else {
          model.overlay = null;
          paint(true);
        }
        return;
      }
      const showedResult = model.resultShown;
      feedSim(sample);
      if (model.resultShown && !showedResult) return;
      if (model.screen === 'Lobby' && !model.overlay) {
        let joinedNow = false;
        for (const s of sample.seats) {
          if (s.edges?.confirm) {
            joinSeat(s.index);
            joinedNow = true;
          }
        }
        if (joinedNow && !menu.confirm && !pend.confirm) return;
      }
      if (model.screen === 'Story' && model.storyMode === 'lines' && !model.overlay) {
        if (menu.skip || pend.skip) {
          finishScene();
          return;
        }
        if (menu.confirm || pend.confirm) {
          model.hold = 0;
          advanceLine();
          return;
        }
        const speed = model.settings.textSpeed || 1;
        if (sample.held?.confirm) {
          model.hold += speed;
          if (model.hold >= 3) {
            model.hold = 0;
            advanceLine();
          }
        }
        return;
      }
      if (menu.pageLeft || pend.pageLeft) {
        if (turnPage(-1)) return;
      }
      if (menu.pageRight || pend.pageRight) {
        if (turnPage(1)) return;
      }
      if ((menu.left || pend.left) && nudge(-1)) return;
      if ((menu.right || pend.right) && nudge(1)) return;
      const padUp = sample.seats.some((s) => s.edges?.up);
      const padDown = sample.seats.some((s) => s.edges?.down);
      if (menu.up || pend.up || (padUp && !inPlay)) moveFocus(-1);
      else if (menu.down || pend.down || (padDown && !inPlay)) moveFocus(1);
      else if (inPlay && padDown) askBea();
      const inMenu = !!model.overlay || !!model.sessionPause || model.screen !== 'Operation';
      const padConfirm = sample.seats.some((s) => s.edges?.confirm);
      const confirm = menu.confirm || pend.confirm || (padConfirm && inMenu);
      if (confirm && inMenu) {
        const item = currentItems()[model.focus];
        if (item) activate(item.id);
      } else if ((menu.back || pend.back) && !inPlay) {
        if (model.screen === 'Settings') closeSettings();
        else if (model.screen !== 'Title' && model.screen !== 'Main Menu' && model.screen !== 'Touch notice') {
          const prev = model.stack.pop();
          setScreen(prev || 'Main Menu');
        }
      }
      tickAudio();
    } finally {
      busy = false;
    }
  }

  function btn(item, index) {
    const on = index === model.focus ? ' on' : '';
    const pick = item.id === model.consultChoice ? ' pick' : '';
    const slider = item.kind === 'slider'
      ? `<input type="range" data-slider="${esc(item.id)}" min="${item.min}" max="${item.max}" step="${item.step || 0.01}" value="${item.id in TUNING_DEFAULTS ? model.tuning[item.id] : (model.settings[item.id] ?? item.min)}">`
      : '';
    return `<button class="item${on}${pick}" data-item="${esc(item.id)}" type="button"><span data-readout="${esc(item.id)}">${esc(item.label)}</span>${slider}</button>`;
  }

  function menuBlock(title, items, extra = '') {
    model.focus = Math.max(0, Math.min(model.focus, Math.max(0, items.length - 1)));
    return `<section class="screen"><h1 class="logo">${esc(title)}</h1>${extra}<div class="menu">${items.map(btn).join('')}</div></section>`;
  }

  function paint(force) {
    const ui = model.ui;
    if (!ui) return;
    const sig = [
      model.screen, model.overlay, model.storyMode, model.line, model.focus, model.page,
      model.attract.on ? model.attract.opIndex : '', model.sessionPause, model.countN,
      model.card ? (model.card.ready || []).join(',') : '',
      model.opId, model.sceneId, model.nogfxNotice, model.consultChoice, model.settings.difficulty,
      model.settings.glyphs, [...model.joined].join(','), model.sim?.phase?.id || '', model.sim?.over || '',
      model.bark?.text || '', model.flow, model.doctor || '',
    ].join('|');
    document.body.dataset.screen = model.attract.on ? (model.attract.from || model.screen) : model.screen;
    if (!force && sig === model.paintSig) {
      patchLive();
      return;
    }
    model.paintSig = sig;
    const boot = document.getElementById('boot');
    const app = document.getElementById('app');
    if (boot) boot.hidden = model.screen !== 'Boot';
    if (app) app.hidden = model.screen === 'Boot';
    if (model.nogfxNotice) {
      ui.innerHTML = `<section class="screen nogfx"><p>This room cannot draw. A browser with graphics can open the chart. Your progress is still here.</p>${btn({ id: 'nogfx-ok', label: 'Continue' }, 0)}</section>`;
      return;
    }
    if (model.mode === 'session' && model.screen === 'Card') {
      paintCard(ui);
      return;
    }
    if (model.mode === 'session' && model.screen === 'Countdown') {
      ui.innerHTML = `<section class="screen"><p class="big" data-live="count">${esc(model.countN || '')}</p></section>`;
      return;
    }
    if (model.screen === 'Round over') {
      ui.innerHTML = '<section class="screen"><h1 class="big">Round over</h1><p class="note">The table is clear.</p></section>';
      return;
    }
    if (model.attract.on) {
      ui.innerHTML = `${hudHtml()}<p class="demo">DEMO</p><p class="press">Press any button</p>${model.attract.from === 'Touch notice' ? touchHtml() : ''}`;
      return;
    }
    if (model.sessionPause) {
      ui.innerHTML = `${hudHtml()}<div class="overlay">${menuBlock('Settings', settingsItems(), pageDots())}</div>`;
      return;
    }
    if (model.overlay === 'pause') {
      ui.innerHTML = `<div class="overlay">${menuBlock('Paused', pauseItems())}</div>`;
      return;
    }
    if (model.overlay === 'dev') {
      ui.innerHTML = `<div class="overlay">${menuBlock('Dev', devItems(), pageDots())}</div>`;
      return;
    }
    if (model.overlay === 'chooser') {
      ui.innerHTML = menuBlock(GAME_TITLE, currentItems(), '<p class="tag">The chart is already open.</p>');
      return;
    }
    if (model.screen === 'Title') {
      ui.innerHTML = `<section class="screen"><h1 class="logo" id="title"></h1><p class="tag" id="tagline"></p><div class="ecg-line"></div><div class="menu">${btn({ id: 'start', label: 'Press any button' }, 0)}</div></section>`;
      ui.querySelector('#title').textContent = GAME_TITLE;
      ui.querySelector('#tagline').textContent = TAGLINE;
      return;
    }
    if (model.screen === 'Touch notice') {
      ui.innerHTML = touchHtml();
      return;
    }
    if (model.screen === 'Main Menu') {
      ui.innerHTML = menuBlock(GAME_TITLE, currentItems());
      const h = ui.querySelector('.logo');
      if (h) h.textContent = GAME_TITLE;
      return;
    }
    if (model.screen === 'Story' && model.storyMode === 'ask') {
      ui.innerHTML = `<section class="screen"><p class="obj">How much do you hate yourself, child?</p><div class="menu">${currentItems().map(btn).join('')}</div></section>`;
      return;
    }
    if (model.screen === 'Story' && model.storyMode === 'lines') {
      const line = model.scene?.lines?.[model.line];
      const who = castOf(line?.who || 'narration');
      ui.innerHTML = `<section class="screen"><p class="where">${esc(model.scene?.where || '')}</p><div class="dialogue${line?.shout ? ' shout' : ''}" data-item="advance"><p class="who">${esc(who.name)}</p><p>${esc(line?.text || '')}</p></div><div class="menu">${btn({ id: 'advance', label: 'Continue' }, 0)}</div></section>`;
      return;
    }
    if (model.screen === 'Chart') ui.innerHTML = chartHtml();
    else if (model.screen === 'Operation') ui.innerHTML = hudHtml();
    else if (model.screen === 'Report') ui.innerHTML = reportHtml();
    else if (model.screen === 'Fail') ui.innerHTML = failHtml();
    else if (model.screen === 'Free Play') ui.innerHTML = menuBlock('Chart Board', freeItems(), `<p class="note">${esc(DIFFICULTY[model.settings.difficulty]?.label || 'Resident')}</p>${pageDots()}`);
    else if (model.screen === 'Lobby') ui.innerHTML = lobbyHtml();
    else if (model.screen === 'Settings') ui.innerHTML = menuBlock('Settings', settingsItems(), pageDots());
    else if (model.screen === 'About') ui.innerHTML = aboutHtml();
    else if (model.screen === 'Credits roll') ui.innerHTML = `<section class="screen"><h1 class="big">Credits</h1><p class="note">The lamp stays on.</p><div class="menu">${btn({ id: 'credits-skip', label: 'Skip' }, 0)}</div></section>`;
    else ui.innerHTML = '<section class="screen"><p class="note">Scrubbing in…</p></section>';
  }
  model.paint = () => paint(false);

  function patchLive() {
    const st = liveState();
    const set = (sel, text) => {
      const node = model.ui.querySelector(sel);
      if (node) node.textContent = text;
    };
    if (model.mode === 'session' && model.screen === 'Card' && model.card?.left != null) {
      set('[data-live="card"]', String(Math.max(0, Math.ceil(model.card.left / 1000))));
    }
    if (st) {
      set('[data-live="vitals"]', st.vitals == null ? '' : String(Math.round(st.vitals)));
      set('[data-live="timer"]', st.timer == null ? '' : clock(st.timer));
      set('[data-live="score"]', st.score == null ? '' : String(st.score));
      set('[data-live="bpm"]', st.bpm == null ? '' : String(Math.round(st.bpm)));
      const tool = st.tool;
      model.ui.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
    }
  }

  function liveState() {
    if (model.sim) {
      return {
        vitals: model.sim.vitals,
        timer: model.sim.noTimer ? null : model.sim.timer,
        score: model.sim.score,
        bpm: model.sim.beat?.bpm,
        tool: model.sim.seats[0]?.tool,
      };
    }
    return null;
  }

  function touchHtml() {
    return `<section class="screen"><p class="touch-copy">Controller or keyboard required</p><div class="menu">${btn({ id: 'settings', label: 'Settings' }, model.focus)}</div></section>`;
  }

  function pageDots() {
    const n = pageCount();
    if (n <= 1) return '';
    return `<p class="pages">Page ${model.page + 1} / ${n}</p>`;
  }

  function hudHtml() {
    const sim = model.sim;
    const op = sim?.op || safeOp(model.opId);
    const objective = sim?.objective || sim?.phase?.objective || '';
    const seats = sim?.seats || [];
    const seat = seats[0];
    const tools = (sim?.phase?.tools || []).join(' ');
    const sites = op?.sites || [];
    const siteBits = sites.length > 1 ? sites.map((s) => `<button type="button" data-item="site:${esc(s.id)}" class="item${s.id === sim?.activeSite ? ' on' : ''}">${esc(s.organ || s.id)}</button>`).join('') : '';
    const wheel = WHEEL.map((tool) => `<button type="button" data-tool="${tool}" class="${seat?.tool === tool ? 'on' : ''}">${esc(tool)}</button>`).join('');
    const prompt = fillPrompt('{special} gift   {syringe} stabilizer   {pause} pause', model.input?.promptSet || 'keyboard');
    const bark = model.bark ? `<div class="bark"><p class="who">${esc(castOf(model.bark.who).name)}</p><p>${esc(model.bark.text)}</p></div>` : '';
    return `<div class="hud"><div class="hud-top"><p class="obj">${esc(objective)}</p><div class="hud-mid"><p class="vitals" data-live="vitals">${sim ? Math.round(sim.vitals) : ''}</p><div class="ecg-line" id="ecg"></div><p class="timer bpm" data-live="bpm">${sim ? Math.round(sim.beat.bpm) : ''}</p></div><div class="hud-mid"><p class="timer" data-live="timer">${sim && !sim.noTimer ? clock(sim.timer) : ''}</p><p class="score" data-live="score">${sim ? sim.score : ''}</p></div></div><div></div><div class="hud-bot"><div class="wheel">${wheel}</div><div>${bark}<p class="note">${esc(tools)}</p><div class="pages">${siteBits}</div></div><div class="note">${prompt}</div></div></div>`;
  }

  function chartHtml() {
    const op = safeOp(model.opId);
    const p = op?.patient || {};
    const diff = DIFFICULTY[model.settings.difficulty]?.label || 'Resident';
    const items = chartItems();
    return `<section class="screen"><p class="who">${esc(op?.title || '')}</p><h1 class="big">${esc(p.name || '')}</h1><p class="note">${esc(p.age || '')} · ${esc(p.job || '')}</p><p class="obj">${esc(p.note || '')}</p><p class="note">Difficulty ${esc(diff)}. Left and right change it.</p><div class="menu">${items.map(btn).join('')}</div></section>`;
  }

  function reportHtml() {
    const sim = model.sim;
    const op = safeOp(model.opId);
    const rank = sim?.rank;
    const accuracy = sim?.seats?.[0]?.stats?.Accuracy ?? 100;
    const seats = (sim?.seats || []).filter((s) => !s.out).map((s) => `<p class="note">${esc(s.name)} ${s.score}</p>`).join('');
    return `<section class="screen"><p class="big">${esc(rank?.id || '')}</p><p class="obj">${esc(rank?.title || sim?.report?.text || '')}</p><div class="row"><span>Time</span><span>${esc(clock(sim?.time || 0))}</span></div><div class="row"><span>Vitals</span><span>${esc(Math.round(sim?.vitalsMin ?? sim?.vitals ?? 0))}</span></div><div class="row"><span>Precision</span><span>${esc(accuracy)}</span></div><div class="row"><span>Best Combo</span><span>${esc(sim?.bestCombo || 0)}</span></div><p class="note">${esc(op?.patient?.followUp || '')}</p>${seats}<div class="menu">${btn({ id: 'report-next', label: 'Continue' }, 0)}</div></section>`;
  }

  function failHtml() {
    const reason = FAIL_TITLE[model.sim?.failed] || 'FLATLINE';
    const line = barkText('fail', null, 0);
    return `<section class="screen"><h1 class="fail-title">${esc(reason)}</h1><div class="bark"><p class="who">Bea</p><p>${esc(line)}</p></div><div class="menu">${failItems().map(btn).join('')}</div></section>`;
  }

  function lobbyHtml() {
    const items = lobbyItems();
    const prompt = fillPrompt('Press {confirm} to join', model.input?.promptSet || 'keyboard');
    return `<section class="screen"><h1 class="big">Grand Rounds</h1><p class="note">${prompt}</p><div class="seats">${[0, 1, 2, 3].map((i) => `<div class="seat" style="color:${COLORS[i]}">${model.joined.has(i) ? 'In' : 'Open'}</div>`).join('')}</div><div class="menu">${items.map(btn).join('')}</div></section>`;
  }

  function aboutHtml() {
    const slides = aboutSlides();
    const page = ((model.page % slides.length) + slides.length) % slides.length;
    const slide = slides[page];
    const tabs = aboutItems().map((item) => {
      const on = item.head === slide.head ? ' on' : '';
      return `<button class="item${on}" data-item="${esc(item.id)}" type="button">${esc(item.label)}</button>`;
    }).join('');
    const body = slide.lines.map((line) => `<p class="about-line">${esc(line)}</p>`).join('');
    const part = slide.parts > 1 ? `<p class="note">${slide.part} / ${slide.parts}</p>` : '';
    return `<section class="screen about-fit"><div class="tabs">${tabs}</div><h1 class="obj">${esc(slide.label)}</h1><div class="page on">${body}</div>${part}</section>`;
  }

  function paintCard(ui) {
    ui.replaceChildren();
    const wrap = document.createElement('section');
    wrap.className = 'screen card';
    const h = document.createElement('h1');
    h.className = 'logo';
    h.textContent = GAME_TITLE;
    const tag = document.createElement('p');
    tag.className = 'tag';
    tag.textContent = TAGLINE;
    const goal = document.createElement('p');
    goal.className = 'obj';
    goal.textContent = 'Keep the patient alive and finish the operation together';
    const list = document.createElement('div');
    list.className = 'seats';
    const ready = new Set(model.card?.ready || []);
    for (const p of model.sessionInfo?.players || []) {
      const seat = document.createElement('div');
      seat.className = 'seat';
      if (/^#[0-9a-fA-F]{3,8}$/.test(p.color || '')) seat.style.color = p.color;
      seat.textContent = `${p.name || 'Surgeon'}${ready.has(p.id) ? ' ready' : ''}`;
      list.append(seat);
    }
    const secs = document.createElement('p');
    secs.className = 'vitals';
    secs.dataset.live = 'card';
    if (model.card?.left != null) secs.textContent = String(Math.max(0, Math.ceil(model.card.left / 1000)));
    const how = document.createElement('p');
    how.className = 'note';
    how.textContent = 'Aim with the right stick or the mouse. Use with R2 or click. Tools are the left stick or the number keys.';
    const menu = document.createElement('div');
    menu.className = 'menu';
    for (const item of [{ id: 'ready', label: 'Ready' }, { id: 'more', label: 'More Time' }]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item';
      b.dataset.item = item.id;
      b.textContent = item.label;
      menu.append(b);
    }
    wrap.append(h, tag, goal, list, secs, how, menu);
    ui.append(wrap);
  }

  function state() {
    const sim = model.sim;
    const net = !sim ? model.netState : null;
    const seats = sim?.seats || net?.seats || [];
    const seat = seats.find((s) => !s.out) || seats[0];
    const items = currentItems();
    const rank = sim?.rank?.id || (typeof net?.rank === 'string' ? net.rank : net?.rank?.id) || null;
    return {
      screen: model.screen,
      op: sim?.op?.id || net?.op || null,
      phase: sim?.phase?.id || net?.phase || null,
      vitals: sim ? sim.vitals : (net?.vitals ?? null),
      timer: sim ? sim.timer : (net?.timer ?? null),
      score: sim ? sim.score : (net?.score ?? 0),
      rank,
      bpm: sim ? sim.beat.bpm : (net?.bpm ?? null),
      beat: sim ? sim.beat.count : (net?.beat ?? 0),
      site: sim ? sim.activeSite : (net?.site ?? null),
      tool: seat?.tool || null,
      tips: seats.map((s) => ({ id: s.id, x: s.x, y: s.y, tool: s.tool, score: s.score || 0, use: s.use || 0 })),
      focusId: items[model.focus]?.id || null,
      promptSet: model.input?.promptSet || document.documentElement.dataset.promptSet || 'keyboard',
      glyphSet: model.settings.glyphs || 'playstation',
      attract: !!model.attract.on,
      devOpen: model.overlay === 'dev',
      renderBackend: model.view?.backend || 'none',
      musicGain: model.audio?.music?.gain?.value ?? 0.1,
      tuning: model.tuning,
      reached: [...model.reached],
      cardLeft: model.card?.left ?? null,
      countN: model.countN || 0,
    };
  }

  const api = {
    state,
    audio,
    devRun(id, arg) { return runDev(model, id, arg); },
  };
  if (model.test) {
    api.test = {
      step(n) {
        const count = Math.max(0, n | 0);
        for (let i = 0; i < count; i++) stepOnce();
      },
      warp(n) { model.warp = n | 0; },
      input(frame) { model.override = frame || null; },
      bot(on, opts) {
        model.botOn = !!on;
        if (opts) model.botOpts = opts;
      },
      skipTo(op, phase) {
        model.flow = model.flow || 'free';
        model.opId = op;
        freeSim();
        model.sim = new Sim({
          op, seed: 1, physics: false, tuning: model.tuning,
          difficulty: model.settings.difficulty || 'resident', players: 1,
        });
        if (phase) model.sim.skipTo(phase);
        model.resultShown = false;
        model.overlay = null;
        setScreen('Operation');
      },
      hash() { return model.sim ? model.sim.hash() : ''; },
    };
  }

  let raf = 0;
  let timer = 0;
  function draw() {
    if (model.mode === 'session' || !model.view || model.norender || model.painting) return;
    model.painting = true;
    try {
      if (model.sim && (model.attract.on || model.screen === 'Operation')) {
        model.view.showOr?.();
        model.view.setPortrait?.(true);
        model.view.sync(decorateState(model.sim.state), 1 / 60);
      } else if (model.screen === 'Story') present();
      if (model.screen === 'Operation' || model.attract.on) paint(false);
    } catch { /* draw again next frame */ }
    const drawn = model.view.render?.();
    if (drawn?.then) drawn.then(() => { model.painting = false; }, () => { model.painting = false; });
    else model.painting = false;
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (model.mode === 'session') return;
    checkAttract();
    if (model.test && !(model.warp > 0)) {
      /* scripted steps own the sim */
    } else {
      const n = model.warp > 0 ? model.warp : 1;
      for (let i = 0; i < n; i++) stepOnce();
    }
    draw();
  }

  function wantsTouch() {
    const mq = window.matchMedia?.('(any-pointer: fine)');
    if (!mq) return false;
    return mq.matches === false && !model.input.seenPad;
  }

  async function bootView() {
    if (!model.canvas) return;
    if (model.norender) {
      model.view = createPointerCamera(model.canvas);
      return;
    }
    const webgl = model.params.get('webgl') === '1';
    try {
      model.view = await createView(model.canvas, { webgl });
    } catch {
      try {
        model.view = await createView(model.canvas, { webgl: true });
      } catch {
        model.view = createPointerCamera(model.canvas);
        model.nogfxNotice = true;
        paint(true);
      }
    }
    if (model.settings.boil === false) model.view?.setBoil?.(false);
  }

  return {
    api,
    startSession(info) {
      model.mode = 'session';
      model.sessionInfo = info;
      model.paint = () => paint(false);
      model.syncFromSim = syncFromSim;
      model.applySettings = model.applySettings;
      model.tickAudio = tickAudio;
      model.playEvent = playEvent;
      model.decorateState = decorateState;
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearInterval(timer);
      runSession(model, info);
    },
    async startStandalone() {
      model.mode = 'standalone';
      model.lastInput = performance.now();
      if (wantsTouch()) setScreen('Touch notice');
      else setScreen('Title');
      try { document.body.focus(); } catch { /* focus is a courtesy */ }
      raf = requestAnimationFrame(loop);
      timer = setInterval(() => {
        if (model.mode === 'session') return;
        checkAttract();
        if (model.attract.on && model.test) {
          for (let i = 0; i < 4; i++) stepOnce();
        }
      }, 250);
      await bootView();
      present();
      draw();
    },
  };
}
