import RAPIER from '@dimforge/rapier3d-compat';
import { NightWorld } from './world.js';
import {
  Journey,
  DEFAULTS,
  PARTS,
  FLOWERS,
  BRIDGE,
  TRANSMITTER,
  RINGS,
  SHIP,
} from './core.js';
import { Soundscape } from './audio.js';
import { Together } from './network.js';
import { Controls } from './input.js';
import { Interface, contextFor } from './ui.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const DEFAULT_SETTINGS = {
  master: 0.75,
  music: 0.1,
  sfx: 0.7,
  voice: 0.65,
  glyphs: 'ps',
  sensitivity: 1,
  largeText: false,
  reduced: false,
};
const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem('extra-trusting:' + key));
    } catch {
      return null;
    }
  },
  set(key, data) {
    try {
      localStorage.setItem('extra-trusting:' + key, JSON.stringify(data));
    } catch {}
  },
};
let settings = { ...DEFAULT_SETTINGS, ...store.get('settings') };
let world,
  core,
  controls,
  net,
  remote = null,
  attract = false,
  lastInput = performance.now(),
  lastEvent = 0,
  lastPhase = 'gather',
  lastSave = 0,
  netClock = 0,
  acc = 0,
  started = false,
  debug = false,
  clickPath = [],
  clickGoal = null,
  hovered = null,
  auto = null;
let queued = {},
  sentInput = {};
let titleReturn = 'title';
let mutedEnd = false;
let drawing = true;
let initialHub = false;
let cameraHasSet = false;
const sound = new Soundscape(settings);
const ui = new Interface(
  settings,
  route,
  (key, value) => {
    settings[key] = value;
    sound.apply();
    ui.applySettings();
    store.set('settings', settings);
  },
  (key, value) => {
    if (net?.isHost) core.settings[key] = value;
  },
);
function snapshot() {
  return !net?.isHost && remote ? remote : core.snapshot();
}
function local(s = snapshot()) {
  return s.players.find((p) => p.id === net.me) || s.players[0];
}
function fresh({ cheat = false } = {}) {
  core?.dispose();
  core = new Journey(RAPIER, { cheat });
  for (const o of world.obstacles) core.addObstacle(o);
  for (const p of net?.players || [{ id: 0, name: 'June', color: '#ff9b72' }])
    core.addPlayer(p.id, p.name, p.color);
  lastEvent = 0;
  lastPhase = 'gather';
  remote = null;
  clickPath = [];
  clickGoal = null;
  queued = {};
  sentInput = {};
  acc = 0;
  lastSave = 0;
  started = false;
  world.snap = true;
  if (debug) world.showDebug(core.world, true);
  return core;
}
function begin(load = false) {
  attract = false;
  $('attract-banner').classList.add('hidden');
  if (net.mode === 'solo' || !started) {
    fresh();
    if (load) core.loadSave(store.get('save'));
  }
  started = true;
  if (net.isHost) core.start();
  ui.play();
  sound.resume();
  controls.first();
  world.resetCamera(local());
  lastInput = performance.now();
}
function enterTitle() {
  if (net.mode === 'hub') return;
  attract = false;
  net.close();
  fresh();
  ui.title(!!store.get('save'));
  world.titleCamera(local());
  lastInput = performance.now();
  controls.first();
  sound.resume();
}
function startAttract() {
  if (net.mode !== 'solo') return;
  attract = true;
  fresh({ cheat: true });
  core.settings.speed = 11;
  core.start();
  started = true;
  auto = {
    stage: 0,
    path: [],
    lastPlan: 0,
    stuck: 0,
    lastPos: { x: 0, z: 0 },
    winAt: 0,
  };
  ui.attract();
  lastInput = performance.now();
}
function activity() {
  if (mutedEnd) return true;
  if (attract) {
    enterTitle();
    return true;
  }
  lastInput = performance.now();
  return false;
}
function focus(selector) {
  const el = selector ? document.querySelector(selector) : null;
  if (el) controls?.focus(el);
  else controls?.first();
}
function openPause() {
  if (attract || ui.view === 'loading' || net.ended) return;
  if (ui.view === 'title') return;
  ui.pause(net);
  focus();
}
function resume() {
  if (core.phase === 'tune' || remote?.phase === 'tune') ui.tune(snapshot());
  else ui.play();
  focus();
}
function returnBack() {
  if (ui.view === 'play') {
    openPause();
    return;
  }
  if (ui.view === 'pause') {
    resume();
    return;
  }
  if (ui.view === 'tune') {
    openPause();
    return;
  }
  if (ui.view === 'ending') {
    if (net.mode !== 'hub') enterTitle();
    return;
  }
  if (ui.view === 'join') {
    ui.coop(net);
    focus();
    return;
  }
  if (['settings', 'about', 'help', 'map', 'coop', 'dev'].includes(ui.view)) {
    if (titleReturn === 'ending') {
      ui.ending(snapshot());
    } else if (titleReturn === 'title') {
      ui.title(!!store.get('save'));
    } else ui.pause(net);
    focus();
  }
}
async function route(action, el) {
  if (mutedEnd) return;
  if (!attract) lastInput = performance.now();
  sound.wake();
  sound.fx('click');
  if (action.startsWith('tab-')) {
    ui.about(action.slice(4));
    focus('[data-action="' + action + '"]');
    return;
  }
  switch (action) {
    case 'new':
      net.close();
      begin(false);
      break;
    case 'continue':
      net.close();
      begin(true);
      break;
    case 'pause':
    case 'pause-tune':
      openPause();
      break;
    case 'resume':
      resume();
      break;
    case 'back':
      returnBack();
      break;
    case 'map':
      titleReturn = 'play';
      ui.map(snapshot(), net.me);
      focus();
      break;
    case 'help':
      titleReturn = 'play';
      ui.help();
      focus();
      break;
    case 'settings':
      if (['title', 'ending', 'pause'].includes(ui.view))
        titleReturn = ui.view === 'pause' ? 'play' : ui.view;
      ui.settingsPanel();
      focus();
      break;
    case 'about':
      if (['title', 'ending', 'pause'].includes(ui.view))
        titleReturn = ui.view === 'pause' ? 'play' : ui.view;
      ui.about();
      focus();
      break;
    case 'coop':
      if (['title', 'pause', 'play'].includes(ui.view))
        titleReturn = ui.view === 'title' ? 'title' : 'play';
      ui.coop(net);
      focus();
      break;
    case 'host-room':
      net.host();
      if (started) net.started = true;
      ui.coop(net);
      focus();
      break;
    case 'show-join':
      ui.joinPanel();
      focus();
      $('room-input').focus();
      break;
    case 'join-room': {
      const code = $('room-input')
        .value.toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (code.length !== 6) {
        $('join-error').textContent =
          'Six letters, just like the code on your friend’s screen.';
        return;
      }
      net.join(code);
      ui.coop(net);
      focus();
      break;
    }
    case 'room-start':
      if (net.started && started) resume();
      else net.begin();
      break;
    case 'copy-room':
      try {
        await navigator.clipboard.writeText(net.room);
        ui.toast('Room code copied.');
      } catch {
        ui.toast('Your room code is ' + net.room);
      }
      break;
    case 'leave-room':
      net.close();
      fresh();
      started = false;
      ui.coop(net);
      focus();
      break;
    case 'return-title':
      if (net.mode !== 'hub') {
        if (started && !attract && net.isHost) store.set('save', core.save());
        enterTitle();
      }
      break;
    case 'fullscreen':
      if (document.fullscreenElement)
        document.exitFullscreen?.().catch(() => {});
      else document.documentElement.requestFullscreen?.().catch(() => {});
      break;
    case 'glyphs':
      settings.glyphs = settings.glyphs === 'ps' ? 'xbox' : 'ps';
      store.set('settings', settings);
      ui.settingsPanel();
      focus('[data-action="glyphs"]');
      break;
    case 'largeText':
    case 'reduced':
      settings[action] = !settings[action];
      ui.applySettings();
      store.set('settings', settings);
      ui.settingsPanel();
      focus('[data-action="' + action + '"]');
      break;
    case 'reset-settings':
      Object.assign(settings, DEFAULT_SETTINGS);
      sound.apply();
      store.set('settings', settings);
      ui.applySettings();
      ui.settingsPanel();
      focus();
      break;
    case 'dev':
      titleReturn = 'play';
      ui.dev(core, net.isHost, debug);
      focus();
      break;
    case 'dev-reset':
      Object.assign(core.settings, DEFAULTS);
      ui.dev(core, net.isHost, debug);
      focus();
      break;
    case 'dev-invincible':
      core.cheat = !core.cheat;
      ui.dev(core, net.isHost, debug);
      focus('[data-action="dev-invincible"]');
      break;
    case 'dev-colliders':
      debug = !debug;
      world.showDebug(core.world, debug);
      ui.dev(core, net.isHost, debug);
      focus('[data-action="dev-colliders"]');
      break;
    case 'dev-refill':
      if (net.isHost) {
        core.bond = 100;
        for (const p of core.players.values()) p.candy = 3;
        ui.toast('A pocketful of candy. A heartful of light.');
      }
      break;
    case 'dev-next':
      if (net.isHost) {
        const p = core.players.get(net.me) || [...core.players.values()][0];
        const objective = core.objective(p);
        if (objective) {
          teleport(
            p,
            objective.x,
            !core.bridge && objective.x === BRIDGE.x && objective.z === BRIDGE.z
              ? -6
              : objective.z,
            core.phase === 'flight' ? objective.y || 10 : 0,
          );
          ui.toast('Moved to the next little miracle.');
        }
      }
      break;
    case 'dev-tune':
      if (net.isHost) {
        core.parts = [true, true, true];
        core.grow();
        core.phase = 'gather';
        core.finished = false;
        const p = core.players.get(net.me) || [...core.players.values()][0];
        teleport(p, 1, -40, 0);
        resume();
      }
      break;
    case 'dev-flight':
      if (net.isHost) {
        core.parts = [true, true, true];
        core.grow();
        core.launch();
        resume();
      }
      break;
    case 'dev-restart':
      if (net.isHost && net.mode !== 'hub') {
        fresh();
        started = true;
        core.start();
        ui.play();
      }
      break;
    case 'glow':
      queued.glow = true;
      break;
    case 'candy':
      queued.candy = true;
      break;
    case 'interact': {
      const s = snapshot(),
        p = local(s),
        n = p ? contextFor(s, p) : null;
      if (n?.kind === 'grow' || n?.kind === 'flower') queued.glow = true;
      else queued.action = true;
      break;
    }
    case 'tune-note':
      queued.action = true;
      break;
    case 'freeride':
      if (net.mode === 'hub') return;
      if (net.isHost) {
        core.finished = false;
        core.phase = 'freeride';
        core.bond = 100;
        for (const p of core.players.values())
          teleport(p, -22 + p.id * 2, 27, 0);
      }
      ui.play();
      ui.say('JUNE', 'One more lap. There’s still a little moonlight left.');
      break;
  }
}
function teleport(p, x, z, y = 0) {
  p.x = x;
  p.z = z;
  p.y = y;
  p.vy = 0;
  p.body.setTranslation({ x, y: y + 0.84, z }, true);
  p.body.setNextKinematicTranslation({ x, y: y + 0.84, z });
  clickPath = [];
}
function handleEvents(s) {
  for (const event of s.events || []) {
    if (event.id <= lastEvent) continue;
    lastEvent = event.id;
    if (event.kind === 'say') {
      if (!attract) ui.say(event.speaker, event.text);
      sound.speak(event.id % 7);
    } else if (event.kind === 'chapter') {
      if (!attract) ui.caption(event.text);
    } else if (event.kind === 'pulse') {
      world.pulse(event.x, event.y, event.z);
      sound.fx('pulse');
      controls.rumble(0.25);
    } else if (event.kind === 'bridge') {
      sound.fx('bridge');
      if (!attract)
        ui.toast('A little kindness goes a long way. · Creek bridge restored');
    } else if (event.kind === 'flower') {
      sound.fx('flower');
      if (!attract) ui.toast('A flower remembers. · Bond restored');
    } else if (event.kind === 'collect') {
      sound.fx('collect');
      controls.rumble(0.35);
      if (!attract)
        ui.toast(
          PARTS[event.part]?.name +
            ' borrowed · ' +
            s.parts.filter(Boolean).length +
            '/3',
        );
    } else if (event.kind === 'tune-start') {
      if (!attract) {
        ui.tune(s);
        focus();
      }
    } else if (event.kind === 'note') {
      sound.fx('note', event.note);
      if ($('tune-feedback'))
        $('tune-feedback').textContent = [
          '',
          'A little closer.',
          'Somebody heard that.',
          'There you are.',
        ][event.note];
    } else if (event.kind === 'miss') {
      sound.fx('miss');
      if ($('tune-feedback'))
        $('tune-feedback').textContent =
          'Almost. Let the light come around again.';
    } else if (event.kind === 'launch') {
      sound.fx('launch');
      controls.rumble(0.7);
      if (!attract) ui.play();
      clickPath = [];
      clickGoal = null;
    } else if (event.kind === 'ring') {
      sound.fx('ring', event.ring);
      controls.rumble(0.15);
    } else if (event.kind === 'rescue') {
      sound.fx('rescue');
      controls.rumble(0.6);
      if (!attract) {
        $('flash').style.opacity = '.65';
        setTimeout(() => ($('flash').style.opacity = '0'), 250);
        ui.toast('Mara brought you back. Your borrowed parts are safe.');
      }
      clickPath = [];
      clickGoal = null;
    } else if (event.kind === 'candy') sound.fx('candy');
    else if (event.kind === 'won') {
      sound.fx('won');
      if (!attract) {
        ui.ending(s);
        focus();
        if (net.isHost) net.finish(true);
        store.set('save', core.save());
      }
    }
  }
}
function hoverWorld(x, y) {
  hovered = null;
  if (ui.view !== 'play') return;
  const s = snapshot();
  for (const p of [
    ...PARTS.filter((p) => !s.parts[p.id]),
    ...(!s.bridge ? [{ ...BRIDGE, name: 'roots', kind: 'bridge' }] : []),
    ...(s.parts.every(Boolean)
      ? [{ ...TRANSMITTER, name: 'transmitter' }]
      : []),
  ]) {
    const q = world.project({ x: p.x, y: 1, z: p.z });
    const sx = (q.x * 0.5 + 0.5) * innerWidth,
      sy = (-q.y * 0.5 + 0.5) * innerHeight;
    if (q.z < 1 && Math.hypot(x - sx, y - sy) < 40) hovered = p;
  }
  document.body.style.cursor = hovered ? 'pointer' : 'default';
}
function clickWorld(x, y) {
  if (ui.view !== 'play' || net.server) return;
  const s = snapshot(),
    p = local(s);
  if (!p) return;
  const point = world.groundPoint(x, y, s.phase === 'flight' ? p.y : 0);
  const target =
    hovered ||
    (point
      ? { x: clamp(point.x, -48, 48), z: clamp(point.z, -122, 45) }
      : null);
  if (!target) return;
  if (hovered && d(p, target) < 5) {
    queued.action = true;
    return;
  }
  let destination = { x: target.x, z: target.z };
  if (!s.bridge && target.z > -18 && target.z < -9)
    destination = { x: BRIDGE.x, z: -6 };
  clickGoal = target;
  clickPath =
    s.phase === 'flight' ? [destination] : core.pathTo(p, destination);
}
function clickInput(p, input) {
  if (Math.hypot(input.mx, input.mz) > 0.15) {
    clickPath = [];
    clickGoal = null;
    return input;
  }
  if (!clickPath.length) return input;
  while (clickPath.length && d(p, clickPath[0]) < 1.2) clickPath.shift();
  if (clickGoal?.kind === 'bridge' && d(p, BRIDGE) < 10) {
    input.glow = true;
    clickPath = [];
    clickGoal = null;
    return input;
  }
  if (!clickPath.length) {
    const n = contextFor(snapshot(), p);
    if (n) {
      if (n.kind === 'grow' || n.kind === 'flower') input.glow = true;
      else input.action = true;
    }
    clickGoal = null;
    return input;
  }
  const target = clickPath[0],
    len = d(p, target);
  return {
    ...input,
    mx: (target.x - p.x) / (len || 1),
    mz: (target.z - p.z) / (len || 1),
  };
}
function attractInput() {
  const p = core.players.get(0);
  const result = { mx: 0, mz: 0, assist: true, boost: true };
  const goals = [
    PARTS[0],
    PARTS[2],
    { x: -18, z: -6, kind: 'bridge' },
    PARTS[1],
    FLOWERS[2],
    TRANSMITTER,
  ];
  let target;
  if (core.phase === 'gather') {
    target = goals[auto.stage] || TRANSMITTER;
    if (auto.stage === 2 && core.bridge) {
      auto.stage++;
      auto.path = [];
      target = goals[auto.stage];
    }
    if (auto.stage === 4 && core.flowers[2]) {
      auto.stage++;
      auto.path = [];
      target = goals[auto.stage];
    }
    if (auto.stage < 2 && core.parts[goals[auto.stage].id]) {
      auto.stage++;
      auto.path = [];
      target = goals[auto.stage];
    }
    if (auto.stage === 3 && core.parts[1]) {
      auto.stage++;
      auto.path = [];
      target = goals[auto.stage];
    }
    if (d(p, target) < (auto.stage === 2 ? 3 : 3.2)) {
      if (auto.stage === 2 || auto.stage === 4) result.glow = true;
      else result.action = true;
      auto.path = [];
    } else {
      if (!auto.path.length || core.clock - auto.lastPlan > 5) {
        auto.path = core.pathTo(p, target);
        auto.lastPlan = core.clock;
      }
      while (auto.path.length && d(p, auto.path[0]) < 1.2) auto.path.shift();
      const next = auto.path[0] || target;
      const len = d(p, next);
      result.mx = (next.x - p.x) / (len || 1);
      result.mz = (next.z - p.z) / (len || 1);
      if (d(p, auto.lastPos) < 0.1) auto.stuck += 1 / 60;
      else auto.stuck = 0;
      if (auto.stuck > 3) {
        teleport(p, next.x, next.z, 0);
        auto.stuck = 0;
      }
      auto.lastPos = { x: p.x, z: p.z };
    }
    result.hush = auto.stage === 1;
    result.candy = Math.floor(core.clock) % 10 === 4;
  } else if (core.phase === 'tune') {
    result.action = Math.abs(((core.tuneClock * 0.26) % 1) - 0.25) < 0.055;
  } else if (core.phase === 'flight') {
    target = RINGS[core.ring] || SHIP;
    const len = d(p, target);
    result.mx = (target.x - p.x) / (len || 1);
    result.mz = (target.z - p.z) / (len || 1);
    result.action = core.ring >= 6 && len < 5;
  } else if (core.phase === 'won') {
    auto.winAt += 1 / 60;
    if (auto.winAt > 6) startAttract();
  }
  return result;
}
async function boot() {
  try {
    net = new Together({
      start() {
        if (net.isHost) {
          if (!started) begin(false);
          else resume();
        } else {
          started = true;
          ui.play();
        }
        if (net.isHost && core) net.state(core.snapshot());
        else net.input({});
        sound.resume();
      },
      input(id, input) {
        if (net.isHost && core) core.setInput(id, input);
      },
      state(state) {
        remote = state;
        if (core && state.bridge && !core.bridge) core.grow();
        if (core) {
          core.parts = [...state.parts];
          core.flowers = [...state.flowers];
          core.phase = state.phase;
          core.ring = state.ring;
        }
        if (started && state.phase === 'tune' && lastPhase !== 'tune') {
          ui.tune(state);
          focus();
        }
        if (started && state.phase === 'flight' && lastPhase !== 'flight')
          ui.play();
        if (state.finished && ui.view !== 'ending' && !net.ended)
          ui.ending(state);
        lastPhase = state.phase;
      },
      join(player) {
        if (core) core.addPlayer(player.id, player.name, player.color);
      },
      joined() {},
      leave(id) {
        core?.removePlayer(id);
        ui.toast('A friend left the ride. The night goes on.');
      },
      status() {
        if (ui.view === 'coop') {
          const active = document.activeElement?.dataset.action;
          ui.coop(net);
          focus(active ? '[data-action="' + active + '"]' : undefined);
        }
      },
      disconnected() {
        const shared = remote
          ? {
              version: 1,
              parts: remote.parts,
              flowers: remote.flowers,
              bridge: remote.bridge,
              bond: remote.bond,
              phase: remote.phase,
              checkpoint: remote.parts.every(Boolean)
                ? { x: 1, z: -38 }
                : { x: -22, z: 27 },
            }
          : null;
        net.close();
        fresh();
        if (shared) core.loadSave(shared);
        started = true;
        core.start();
        ui.play();
        ui.toast('The room closed. Your progress came with you.');
      },
      end() {
        mutedEnd = true;
        sound.silence();
      },
      score: () => core.score(),
    });
    initialHub = await net.initHub();
    await new Promise((resolve) => setTimeout(resolve, 0));
    $('loading-note').textContent = 'Painting the neighborhood…';
    world = new NightWorld($('world'));
    await Promise.all([RAPIER.init(), world.init()]);
    controls = new Controls(
      {
        action: route,
        activity,
        inMenu: () => !['play', 'attract'].includes(ui.view),
        camera(delta, tilt = 0) {
          if (ui.view === 'play') {
            world.cameraYaw += delta;
            world.elevation = clamp(world.elevation + tilt, 0.25, 1.3);
          }
        },
        zoom(delta) {
          world.zoom = clamp(world.zoom + delta, 0.65, 1.6);
        },
        worldClick: clickWorld,
        hover: hoverWorld,
        wake: () => sound.wake(),
        mode() {
          ui.controlsKey = '';
        },
      },
      settings,
    );
    addEventListener('pagehide', () => {
      if (net.mode === 'room') net.close();
    });
    fresh();
    const p = local();
    world.resetCamera(p);
    $('loader').classList.add('hidden');
    if (initialHub) {
      ui.play();
      ui.say('THE WALKIE-TALKIE', 'Waiting for all the bicycles…');
      net.ready();
    } else {
      ui.title(!!store.get('save'));
      world.titleCamera(local());
      controls.first();
    }
    window.__game = {
      get ready() {
        return true;
      },
      get renderer() {
        return world.backend;
      },
      get state() {
        return snapshot();
      },
      get core() {
        return core;
      },
      get settings() {
        return settings;
      },
      get ui() {
        return ui.view;
      },
      get network() {
        return {
          mode: net.mode,
          me: net.me,
          isHost: net.isHost,
          players: net.players,
          room: net.room,
          started: net.started,
        };
      },
      get audio() {
        return sound;
      },
      get controls() {
        return controls;
      },
      get world() {
        return world;
      },
      route,
      startAttract,
      save: () => store.get('save'),
      get attract() {
        return attract;
      },
      get idleMilliseconds() {
        return performance.now() - lastInput;
      },
    };
    if (new URLSearchParams(location.search).has('test')) installTestAPI();
    let last = performance.now();
    world.renderer.setAnimationLoop((now) => {
      try {
        frame(Math.min(0.05, (now - last) / 1000 || 1 / 60));
        last = now;
      } catch (error) {
        console.error(error);
        ui.fatal(error);
        world.renderer.setAnimationLoop(null);
      }
    });
  } catch (error) {
    console.error(error);
    ui.fatal(error);
    window.AIHub?.fail?.('WebGPU initialization failed: ' + error.message);
  }
}
function frame(dt) {
  if (!core || net.ended || (initialHub && !net.canStep())) return;
  let input = {};
  if (!mutedEnd && !net.server) input = controls.poll(dt, world.cameraYaw);
  if (ui.view === 'title' && performance.now() - lastInput >= 10000)
    startAttract();
  const active = started && net.canStep() && !net.ended;
  const paused =
    net.mode === 'solo' && !['play', 'tune', 'attract'].includes(ui.view);
  if (active && !paused) {
    if (attract) input = attractInput();
    else {
      input = { ...input, ...queued };
      if (!['play', 'tune'].includes(ui.view)) input = {};
      const p = local();
      if (p) input = clickInput(p, input);
      if (controls.mode === 'touch' && ui.view === 'play') {
        const n = contextFor(snapshot(), p);
        if (n?.kind === 'part' && d(p, n.target) < 2.6) input.action = true;
      }
    }
    queued = {};
    if (net.isHost && !net.server) core.setInput(net.me, input);
    if (
      !net.isHost &&
      ['action', 'glow', 'candy'].some(
        (key) => !!input[key] !== !!sentInput[key],
      )
    ) {
      net.input(input);
      sentInput = { ...input };
    }
    if (net.isHost) {
      acc += dt;
      let steps = 0;
      while (acc >= 1 / 60 && steps++ < 5) {
        core.step(1 / 60);
        acc -= 1 / 60;
      }
    }
    netClock += dt;
    if (netClock > 0.1) {
      netClock = 0;
      if (net.isHost) net.state(core.snapshot());
      else net.input(input);
    }
    if (
      !attract &&
      net.isHost &&
      core.clock - lastSave > 4 &&
      net.mode !== 'hub'
    ) {
      store.set('save', core.save());
      lastSave = core.clock;
    }
  }
  const s = snapshot();
  if (net.isHost || remote) handleEvents(s);
  if (started && s.phase !== lastPhase) {
    if (!attract) {
      if (s.phase === 'tune') {
        ui.tune(s);
        focus();
      } else if (s.phase === 'flight') ui.play();
      else if (s.phase === 'won') {
        ui.ending(s);
        focus();
      }
    }
    lastPhase = s.phase;
  }
  if (ui.view === 'tune') ui.updateTune(s);
  if (ui.view === 'play') {
    const p = local(s);
    ui.hud(s, p, p ? contextFor(s, p) : null, world, net);
    if (p) ui.marker(core.objective(p), world, p);
  }
  world.update(s, dt, {
    title: ui.view === 'title' || (!started && !initialHub),
    me: net.me,
    attract,
    reduced: settings.reduced,
  });
  if (debug && Math.floor(core.clock * 2) % 2 === 0 && net.isHost)
    world.showDebug(core.world, true);
  sound.update(s.phase, local(s)?.speed > 1);
  if (drawing && !net.server) world.render();
}
function installTestAPI() {
  const api = window.__game;
  api.test = {
    pauseDrawing() {
      drawing = false;
    },
    flush() {
      frame(0);
      return ui.view;
    },
    begin: () => {
      net.close();
      begin(false);
      core.cheat = true;
      return snapshot();
    },
    advance(seconds, input = {}) {
      const p = core.players.get(net.me) || [...core.players.values()][0];
      core.setInput(p.id, input);
      for (let i = 0; i < seconds * 60; i++) core.step(1 / 60);
      core.setInput(p.id, {});
      handleEvents(core.snapshot());
      return snapshot();
    },
    driveTo(target, { hush = false, boost = false, max = 12000 } = {}) {
      const p = core.players.get(net.me) || [...core.players.values()][0];
      let path = core.phase === 'flight' ? [target] : core.pathTo(p, target);
      let steps = 0,
        stalled = 0,
        prev = { x: p.x, z: p.z };
      while (d(p, target) > 2.3 && steps++ < max) {
        while (path.length && d(p, path[0]) < 0.95) path.shift();
        const next = path[0] || target,
          len = d(p, next);
        core.setInput(p.id, {
          mx: (next.x - p.x) / (len || 1),
          mz: (next.z - p.z) / (len || 1),
          hush,
          boost,
        });
        core.step(1 / 60);
        if (steps % 120 === 0) {
          if (d(p, prev) < 0.1) stalled++;
          else stalled = 0;
          prev = { x: p.x, z: p.z };
          if (stalled > 2) break;
        }
      }
      core.setInput(p.id, {});
      core.step(1 / 60);
      return {
        steps,
        distance: d(p, target),
        position: { x: p.x, y: p.y, z: p.z },
        blocked: stalled > 2,
        path: path.slice(0, 3),
        phase: core.phase,
      };
    },
    press(key) {
      const p = core.players.get(net.me) || [...core.players.values()][0];
      core.setInput(p.id, {});
      core.step(1 / 60);
      core.setInput(p.id, { [key]: true });
      core.step(1 / 60);
      core.setInput(p.id, {});
      core.step(1 / 60);
      return snapshot();
    },
    tunePerfect() {
      while (core.phase === 'tune') {
        core.tuneClock = 0.25 / 0.26;
        core.tunePress();
      }
      return snapshot();
    },
    teleport(x, z, y = 0) {
      teleport(
        core.players.get(net.me) || [...core.players.values()][0],
        x,
        z,
        y,
      );
      return snapshot();
    },
    teleportSeat(id, x, z, y = 0) {
      teleport(core.players.get(id), x, z, y);
      return snapshot();
    },
    get constants() {
      return { PARTS, FLOWERS, BRIDGE, TRANSMITTER, RINGS, SHIP };
    },
    tour(seconds) {
      const phases = new Set();
      let won = false,
        parts = 0,
        rings = 0,
        bridge = false;
      for (let i = 0; i < seconds * 60; i++) {
        core.setInput(0, attractInput());
        core.step(1 / 60);
        phases.add(core.phase);
        parts = Math.max(parts, core.parts.filter(Boolean).length);
        rings = Math.max(rings, core.ring);
        bridge ||= core.bridge;
        won ||= core.finished;
      }
      return { phases: [...phases], won, parts, rings, bridge };
    },
    expireIdle() {
      lastInput = performance.now() - 10001;
    },
    setAlert(value) {
      local();
      const p = core.players.get(net.me);
      p.alert = value;
    },
    setPhase(phase) {
      core.phase = phase;
    },
    networkHost(code) {
      net.host(code);
      ui.coop(net);
    },
    networkJoin(code) {
      net.join(code);
      ui.coop(net);
    },
    networkBegin() {
      net.begin();
    },
    resetBalance() {
      Object.assign(core.settings, DEFAULTS);
    },
  };
}
boot();
