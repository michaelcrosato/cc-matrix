/** @file Boot, run transitions and presentation; surgery rules and all multiplayer inputs stay in the sim. */
/// <reference types="vite/client" />
import { createEngine, createStore, type Engine, type EngineFrame, type Inspector } from '../../engine';
import { main } from './scenes/main';
import './view/assets';
import './view/bodies';
import { drawField } from './view/field';
import { surgicalCue } from './view/camera';
import { meshes, softwareSessionSheet } from './view/field/liveMesh';
import { Hands, MAP } from './input/hands';
import { Attractor } from './app/attract';
import { Director, freshProgress } from './app/director';
import { defaultPreferences } from './app/settings';
import { Soundtrack } from './audio/mix';
import { GameUI } from './ui';
import type { UIContext } from './ui/context';
import { CASES } from './data/cases';
import { StoryView } from './app/storyView';
import { BALANCE } from './data/balance';
import type { Hand, Operation } from './data/types';
import { Session, readOperation, type Hub } from './net/session';
import './ui/styles.css';
const hub = (window as unknown as { AIHub: Hub }).AIHub;
const info = hub?.active ? await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }) : null;
const search = new URLSearchParams(location.search);
for (const key of [...search.keys()]) if (key.startsWith('aihub')) search.delete(key);
search.set('touch', 'off');
search.set('gfx.warmUp', 'asked');
search.set('cam3', info || search.get('game.run')?.startsWith('op:') ? 'surgeon' : 'fixed,9,5,-12,-33,-16,46');
search.set('post.look', info || search.get('game.run')?.startsWith('op:') ? 'look:field' : 'look:harbor');
if (info) {
  search.set('seed', String(info.seed));
  search.set('game.run', 'op:gala-shift');
  search.set('game.seats', String(info.players.length));
}
const store = createStore({ prefix: 'trauma-coast:', mode: info ? 'demo' : 'play' }),
  prefs = { ...defaultPreferences(), ...store.get('preferences', defaultPreferences()) };
search.set('game.cursorSpeed', String(prefs.cursorSpeed));
const d = new Director(store.get('progress', freshProgress())),
  hands = new Hands(),
  sound = new Soundtrack();
let engine: Engine | null = null,
  frame: EngineFrame | null = null,
  operation: Operation | undefined,
  activeRun = search.get('game.run') ?? 'title',
  seed = Number(search.get('seed') ?? 1),
  attract = false,
  lastPhase = -1,
  lastSwap = 0,
  lastOverlay = '';
const live: Record<string, unknown> = Object.fromEntries(Object.entries(BALANCE).map(([k, [v]]) => [`game.${k}`, v]));
const session = info ? new Session(hub, info) : null;
if (session) session.onEnd = () => sound.silence();
Object.assign(window, { __surgerySession: session });
if (info?.server) {
  document.getElementById('app')!.style.display = 'none';
  document.querySelector<HTMLCanvasElement>('#view')!.style.cssText = 'position:fixed;width:1px;height:1px;inset:0';
}
if (activeRun.startsWith('op:')) {
  d.screen = 'op';
  d.caseIndex =
    activeRun === 'op:gala-shift'
      ? 8
      : Math.max(
          0,
          CASES.findIndex((c) => c.id === activeRun.slice(3)),
        );
}
const set = (key: string, value: unknown): void => {
  if (session && key.startsWith('game.')) return;
  live[key] = value;
  engine?.inspector?.set(key, value);
};
const save = (): void => {
  if (attract || session) return;
  store.set('preferences', prefs);
  store.set('progress', d.progress);
};
hands.networked = !!session;
const context: UIContext = {
  session: !!session,
  d,
  prefs,
  hands,
  sound,
  engine: () => engine,
  save,
  state: () => operation,
  set,
  get: (key) => frame?.setting(key) ?? live[key],
  act: (name, args) =>
    session
      ? undefined
      : (engine?.inspector?.actions as { run: (name: string, args: Record<string, unknown>) => unknown })?.run(
          name,
          args,
        ),
  startSession: () => {
    d.caseIndex = 8;
    d.free = true;
    d.start();
  },
};
const ui = new GameUI(context);
const storyView = new StoryView(context);
const attractor = new Attractor(d, set, (active) => {
  attract = active;
});
function camera(code: string, blend = true): void {
  (engine?.inspector?.camera as { set: (code: string, options?: object) => void })?.set(code, { blend });
}
function run(runId: string, phase = 0): void {
  if (!engine?.inspector) return;
  activeRun = runId;
  hands.radial = null;
  lastSwap = 0;
  lastOverlay = '';
  lastPhase = -1;
  set('game.run', runId);
  set('game.phase', phase);
  set('game.difficulty', prefs.difficulty);
  set('game.giftChoice', d.free ? prefs.freeGift : 'case');
  set('game.simpleGift', prefs.simpleGift);
  if (!hands.devices.length) hands.claim(hands.lastDevice === 'gamepad' ? 0 : 'keyboard');
  set('game.seats', hands.devices.length);
  set('game.attract', attract);
  for (const h of hands.seats) {
    h[3] = 0;
    h[4] = 0;
    h[5] = 0;
    h[7] = 0;
    h[6] = 0;
  }
  engine.inspector.seed(++seed);
  engine.inspector.resume();
  const op = runId.startsWith('op:');
  set('post.look', op ? 'look:field' : 'look:harbor');
  camera(op ? 'cam3=surgeon' : runId.startsWith('story:') ? 'cam3=harbor' : 'cam3=fixed,9,5,-12,-33,-16,46', false);
  document.body.classList.toggle('operating', op);
  sound.theme(op ? (runId === 'op:mercy' ? 'mercy' : 'calm') : runId === 'title' ? 'title' : 'story');
}
d.onChange = (runId, phase) => {
  if (runId) run(runId, phase);
  ui.render();
  storyView.reset();
};
hands.onActivity = () => attractor.activity();
hands.onMenu = (code) => {
  if (session && !session.started) {
    if (code === 'Enter') hub.answer('ready');
    if (code === 'KeyT') hub.answer('more');
    return;
  }
  ui.menu(code);
};
hands.onPause = () => {
  if (session) {
    hands.seats[0][3] = 0;
    ui.returnTo = 'op';
    d.go('settings');
  } else ui.pause();
};
hands.onHint = () => {
  if (operation) {
    ui.hud.showHint(operation);
    sound.say('odie', operation.hint, prefs);
  }
};
hands.onClaim = (device) => {
  if (session && !session.started) {
    hub.answer('ready');
    return true;
  }
  if (d.screen === 'scrub' && hands.claim(device)) {
    ui.render(true);
    document.querySelector<HTMLElement>('[data-action="scrub-start"]')?.focus();
    return true;
  }
  return false;
};
function touchGate(): void {
  const gate = document.getElementById('touch-gate')!;
  if (hands.touch && d.screen !== 'settings') {
    if (!gate.firstChild) {
      gate.innerHTML =
        '<section class="touch-cover"><h2>Controller or keyboard required</h2><p>Connect a controller to scrub in.<br>The night shift will play itself.</p><button data-touch-settings>Settings</button></section>';
      gate.querySelector('button')!.onclick = () => {
        attractor.exit();
        ui.open('settings');
        gate.innerHTML = '';
      };
    }
  } else gate.innerHTML = '';
}
function onFrame(f: EngineFrame): void {
  frame = f;
  if (!engine?.inspector) return;
  if (info?.server) return;
  if (session?.ended) {
    hands.playing = false;
    sound.silence();
    return;
  }
  operation = (f.world.query('operation')[0] as unknown as { operation: { data: Operation } } | undefined)?.operation
    .data;
  if (session && session.e) operation = readOperation(session.e);
  const swap = operation?.events.find((e) => e.type === 'swap' && e.n > lastSwap);
  if (swap && operation) {
    lastSwap = swap.n;
    const p = operation.seats[0],
      h = hands.seats[0];
    if (h) {
      h[0] = p.x;
      h[1] = p.z;
      h[2] = p.tool;
      h[6] = p.site;
      hands.moved = false;
    }
  }
  hands.playing = d.screen === 'op' && !hands.touch && !attract && (!session || session.started) && !session?.ended;
  hands.claimMode = d.screen === 'scrub';
  const inputs = hands.frame(f, prefs, operation, engine.input ?? undefined);
  if (session) {
    if (info && !info.server) {
      session.local = [...(inputs[0] ?? [0, 0, 3, 0, 0, 0, 0, 0, 0])] as Hand;
      const counters = session.local[4] + ':' + session.local[5];
      if (counters !== session.lastCounters) {
        session.lastCounters = counters;
        session.inputTick = session.seq.next;
      }
      session.local[9] = session.inputTick;
    }
    if (session.ended) sound.silence();
  } else if (hands.playing && !ui.dev.author)
    (engine.inspector.input as { axis: (key: string, value: unknown) => void }).axis('game:hands', inputs);
  if (ui.dev.author) {
    const h = inputs[0];
    if (h[3] && ui.dev.path.length < 500) {
      const last = ui.dev.path.at(-1);
      if (!last || Math.hypot(last[0] - h[0], last[1] - h[1]) > 0.1)
        ui.dev.path.push([Math.round(h[0] * 100) / 100, Math.round(h[1] * 100) / 100]);
    }
  }
  if (!session) attractor.frame(f.dt, ui.rebinding, !activeRun.startsWith('op:'));
  if (operation && activeRun.startsWith('op:')) {
    const localSite = inputs[0]?.[6] ?? operation.seats[0].site;
    const own = operation.seats.find((p) => p.id === info?.me) ?? operation.seats[0];
    const view =
      session || ui.dev.author
        ? {
            ...operation,
            seats: [
              {
                ...own,
                x: inputs[0]?.[0] ?? own.x,
                z: inputs[0]?.[1] ?? own.z,
                tool: inputs[0]?.[2] ?? own.tool,
                site: localSite,
              },
              ...operation.seats.filter((p) => p.id !== own.id),
            ],
          }
        : operation;
    Object.assign(surgicalCue, {
      x: inputs[0]?.[0] ?? 0,
      z: inputs[0]?.[1] ?? 0,
      precision: hands.precision,
      ship: operation.caseId === 'struck-off' && operation.phase > 0,
      time: operation.fieldTicks / 6000,
      flap: Math.max(0, ...operation.targets.filter((t) => t.kind === 'flap' && !t.done).map((t) => t.lift)),
      failed: operation.status === 'lost',
      site: localSite,
    });
    const gift = view.seats.find((q) => q.giftUntil > view.tick),
      overlay = (gift?.giftKind ?? '') + (Math.min(...view.patients) < 25 ? 'critical' : '');
    if (overlay !== lastOverlay) {
      lastOverlay = overlay;
      set('post.combine', [
        ...(gift ? [{ look: gift.giftKind === 'still' ? 'look:stillpoint' : 'look:second-pulse', amount: 1 }] : []),
        ...(Math.min(...view.patients) < 25 ? [{ look: 'look:critical', amount: 1 }] : []),
      ]);
    }
    drawField(view, f.dt, prefs.blood, {
      shapes: ui.dev.shapes,
      assist: ui.dev.assist,
      path: ui.dev.author ? ui.dev.path : [],
    });
    let debug = document.getElementById('dev-overlay');
    if (ui.dev.author || ui.dev.shapes || ui.dev.assist) {
      if (!debug) {
        debug = document.createElement('div');
        debug.id = 'dev-overlay';
        debug.className = 'view-debug';
        document.getElementById('app')!.append(debug);
      }
      debug.textContent = `Cursor [${inputs[0]?.[0].toFixed(2)}, ${inputs[0]?.[1].toFixed(2)}] m\nSim ${view.tick} · field ${view.fieldTicks}\n${ui.dev.author ? 'PATH AUTHOR · Esc returns to tools' : ''}`;
    } else debug?.remove();
    ui.hud.frame(context, view, f.dt, f.world);
    if (operation.phase !== lastPhase) {
      lastPhase = operation.phase;
      if (!attract && !session && !operation.dev) {
        d.progress.checkpoint = { caseIndex: d.caseIndex, phase: operation.phase };
        save();
      }
    }
    if (operation.status !== 'playing' && d.screen === 'op' && !attract && !session) {
      engine.inspector.pause();
      sound.theme(operation.status === 'won' ? 'success' : 'failed');
      d.finish(operation, true);
      save();
    }
    if (operation.caseId === 'gala-night' && !document.querySelector('.tv-caption')) {
      const el = document.createElement('div');
      el.className = 'tv-caption';
      el.textContent = 'VOSS, LIVE: “A city without suffering!”';
      document.getElementById('hud')!.append(el);
    }
  } else document.querySelector('.tv-caption')?.remove();
  storyView.frame(f, attract);
  sound.frame(f, prefs, operation);
  ui.radial();
  if (!session || d.screen === 'settings') ui.render();
  touchGate();
  document.body.classList.toggle('operating', activeRun.startsWith('op:'));
  if (!session?.ended && session?.started && hub.time() < 0) {
    const boot = document.getElementById('boot')!;
    boot.classList.remove('hidden');
    boot.querySelector('p')!.textContent = String(Math.ceil(-hub.time() / 1000));
  } else document.getElementById('boot')!.classList.add('hidden');
}
if (!session) ui.render();
else {
  const wait = setInterval(() => {
    const e = (window as unknown as { __engine?: Inspector }).__engine;
    if (e && typeof e.step === 'function') {
      session.attach(e);
      clearInterval(wait);
    }
  }, 25);
  addEventListener(
    'pagehide',
    () => {
      clearInterval(wait);
      session.stop();
    },
    { once: true },
  );
}
sound.theme(session ? 'calm' : 'title');
engine = await createEngine({
  canvas: document.querySelector<HTMLCanvasElement>('#view')!,
  scenes: [main.id],
  search: `?${search}`,
  store,
  actionMap: MAP.id,
  modal: () => !session && d.screen !== 'op',
  onFrame,
});
if (session && /swiftshader/i.test(JSON.stringify(engine.inspector?.info().adapter))) softwareSessionSheet();
if (!session && activeRun.startsWith('op:')) document.body.classList.add('operating');
Object.assign(window, {
  __surgery: {
    get state() {
      return operation;
    },
    director: d,
    ui,
    hands,
    prefs,
    sound,
    session,
    get attract() {
      return attract;
    },
    get idle() {
      return attractor.idle;
    },
    get meshes() {
      return Object.fromEntries(Object.entries(meshes).map(([k, m]) => [k, m.count]));
    },
    autoplay: (value: boolean) => set('game.autoplay', value),
    case: (id: string, phase = 0) => {
      d.caseIndex = CASES.findIndex((c) => c.id === id);
      d.go('op', `op:${id}`, phase);
    },
    exitDemo: () => attractor.exit(),
  },
});
addEventListener(
  'pagehide',
  () => {
    session?.stop();
    void sound.audio.close();
  },
  { once: true },
);
