/**
 * @file The page of Well Wobbled (labs/game/index.html): boots the engine on `game:island` (or `game:round` in an AI Hub
 * session), the retreat's look, the stage camera, the action maps and the app (screens, HUD, audio, attract, dev mode).
 * No WebGPU: a plain, friendly page. Touch-only devices get "Controller or keyboard required" and a Settings button;
 * attract still runs behind it. Pointer-locked mouse movement and the garden's pointer are sent as custom intents.
 * Page-side: imports only engine/index.ts and the game's own files.
 * @example
 * // open labs/game/index.html (npm run dev) or the built single file
 */
/// <reference types="vite/client" />
import { createEngine, type EngineFrame } from '../../engine';
import './art/materials';
import './art/looks';
import './art/bodies';
import './cameras/stage';
import './ui/maps';
import './ui/theme.css';
import './scenes/island';
import { createApp } from './ui/app';
import { createDev } from './ui/dev';
import { SCREENS } from './ui/screens';
import { edgeState, installEdges } from './ui/edges';
import type { Device } from './ui/glyphs';
import { cleanSearch, connectHub, inSession, startSession, type Session } from './hub/session';

declare global {
  interface Window {
    __game?: Record<string, unknown>;
  }
}
const search = cleanSearch(new URLSearchParams(location.search));
if (!search.has('post.look')) search.set('post.look', 'look:retreat');
const touchOnly = matchMedia('(hover: none) and (pointer: coarse)').matches;
let engine: Awaited<ReturnType<typeof createEngine>> | null = null;
let follow: [number, number, number] | undefined;
const root = document.createElement('div');
root.id = 'ww';
document.body.appendChild(root);

async function main(): Promise<void> {
  if (!('gpu' in navigator)) {
    root.style.pointerEvents = 'auto';
    root.innerHTML = SCREENS.nowebgpu;
    const m = document.getElementById('msg');
    if (m) m.hidden = true;
    return;
  }
  const msg = document.getElementById('msg');
  if (msg) msg.textContent = 'Calibrating…';
  const hub = await connectHub();
  const session = !!hub || inSession();
  if (hub) {
    search.set('gfx.resolution', 'pixels'); // fewer pixels keep frames short, so the hub's time-up is answered in time on slow machines
    search.set('scene', 'game:round');
    search.set('seed', String(hub.seed));
  }
  const ses: Session | null = hub ? startSession(hub, root) : null;
  // the card is plain HTML and already answers keys, so the game is ready now; the view warms up behind it
  if (hub) window.AIHub?.ready();
  const watchdog = hub ? setTimeout(() => window.AIHub?.ready(), 14000) : 0;
  installEdges();
  let lastDev: Device = 'keyboard';
  const app = createApp({ engine: () => engine, session, touchOnly, device: () => lastDev });
  let dev: ReturnType<typeof createDev> | null = null;
  let mdx = 0,
    mdy = 0,
    ptr: [number, number] = [0, 0];
  let seenKey = false;
  addEventListener('mousemove', (e) => {
    lastDev = 'mouse';
    if (document.pointerLockElement) {
      mdx += e.movementX;
      mdy += e.movementY;
    }
    ptr = [(e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2];
    app.anyInput();
  });
  for (const t of ['keydown', 'pointerdown', 'wheel'])
    addEventListener(
      t,
      () => {
        if (t === 'keydown') {
          seenKey = true;
          lastDev = 'keyboard';
        } else if (t === 'pointerdown') lastDev = 'mouse';
        app.anyInput();
      },
      { capture: true },
    );
  let padSig = '';
  engine = await createEngine({
    canvas: document.querySelector<HTMLCanvasElement>('#view')!,
    scenes: ['game:island', 'game:round'],
    search: `?${search}`,
    store: app.store,
    modal: () => app.modal() as boolean,
    actionMap: () => app.mapId(),
    cameraInput: () => ({ follow }),
    onFrame: (f: EngineFrame) => {
      const g = (
        f.world.query('cast', 'actor') as unknown as {
          cast: { who: string };
          actor: { x: number; y: number; z: number };
        }[]
      ).find((e) => e.cast.who === 'guest');
      const scr = app.screenName;
      follow =
        g && (scr === 'play' || scr === 'attract' || scr === 'pause') ? [g.actor.x, g.actor.y, g.actor.z] : [0, 6, 0];
      // a pad press or stick move counts as input (leaves attract, restarts the idle timer)
      const pads = navigator.getGamepads?.() ?? [];
      let sig = '';
      for (const p of pads)
        if (p)
          sig +=
            p.buttons.map((b) => (b.pressed ? 1 : 0)).join('') +
            p.axes.map((a) => (Math.abs(a) > 0.4 ? 1 : 0)).join('');
      if (sig !== padSig) {
        if (sig.includes('1')) {
          lastDev = 'pad';
          app.anyInput();
        }
        padSig = sig;
      }
      const ins = engine?.inspector;
      const sens = app.settings.mouse * (app.settings.invertLook ? -1 : 1);
      engine?.input?.virtual.axis('game:mouse', [mdx * sens, mdy * sens] as never);
      mdx = mdy = 0;
      engine?.input?.virtual.axis('game:pointer', (app.screenName === 'play' && ins ? ptr : [0, 0]) as never);
      app.frame(f);
      ses?.frame(f as never);
      void dev;
      window.__game = {
        screen: app.screenName,
        attract: app.attract,
        device: app.lastDevice,
        glyphs: app.settings.glyphs,
        music: app.audio?.volume('music'),
        effects: app.audio?.volume('effects'),
        day: app.save.day,
        session,
        seenKey,
        edges: edgeState(),
      };
    },
  });
  if (hub) clearTimeout(watchdog);
  if (msg) msg.hidden = true;
  if (!engine.ready) {
    if (hub) window.AIHub?.fail('WebGPU required');
    return;
  }
  app.mount(root, engine);
  (window as unknown as { __ww?: unknown }).__ww = app;
  if (hub) {
    ses?.attach(engine);
    app.setMap('actionMap:balance');
  } else {
    dev = createDev(root, app, engine);
    app.setOpenDev(() => {
      dev?.open();
    });
  }
}
declare global {
  interface Window {
    AIHub?: { ready(): void; fail(m: string): void };
  }
}
void main();
