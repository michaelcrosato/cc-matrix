/**
 * @file Teeter Fit's page: it connects to the hub when opened by one, starts the engine on `game:island` (or the small
 * `game:round` in a session), and hands every drawn frame to the app (ui/app.ts). Everything drawn is a sim entity;
 * everything else is HTML under the overlay.
 *
 * Game code, a page's: it imports only the engine's public API and the game's own files.
 *
 * Open it from the built single file on file://, or `npm run dev` at /labs/game/.
 */
/// <reference types="vite/client" />
import { createEngine, createStore, type Engine } from '../../engine';
import './cast/index';
import './materials/retreat';
import './looks/retreat';
import './bodies/cast';
import './cameras/shot';
import './ui/maps';
import './ui/theme.css';
import './emitters/retreat';
import { Session, hubClient } from './hub/session';
import { App } from './ui/app';
import { showHubCard } from './ui/screens/card';
import { hasWebGpu, showNoWebGpu } from './ui/nogpu';

const search = new URLSearchParams(location.search);
for (const key of [...search.keys()]) if (key.startsWith('aihub')) search.delete(key);
search.set('touch', 'off');
if (!search.has('post.look')) search.set('post.look', 'look:retreat');

const hub = hubClient();
const inSession = Boolean(hub?.active);
const info = hub && inSession ? await hub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;
if (info) {
  search.set('gfx.warmUp', 'asked');
  search.set('scene', 'game:round');
  search.set('seed', String(info.seed));
  search.set('cam3', 'shot');
} else if (!search.has('cam') && !search.has('cam3')) search.set('cam3', 'shot');

const watchdog = info ? setTimeout(() => hub?.ready(), 14000) : 0;
let readyCalled = false;
const callReady = (): void => {
  if (readyCalled) return;
  readyCalled = true;
  clearTimeout(watchdog);
  hub?.ready();
};
if (info) setTimeout(callReady, 14000);

const roundOnly = Boolean(info) || search.get('scene') === 'game:round';
await (roundOnly ? import('./scenes/round') : import('./scenes/island'));

const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
const session = info && hub ? new Session(hub, info) : null;
if (session) showHubCard(session);
const app = new App(session, search);

if (!(await hasWebGpu())) {
  if (info) hub?.fail('WebGPU required');
  showNoWebGpu();
} else {
  let engine: Engine | null = null;
  const store = createStore({ prefix: 'teeter-fit:', mode: search.has('replay') ? 'demo' : 'play' });
  engine = await createEngine({
    canvas,
    scenes: roundOnly ? ['game:round'] : ['game:island'],
    search: `?${search}`,
    store,
    modal: () => app.modal(),
    cameraInput: () => app.cameraInput(),
    onFrame: (frame) => app.frame(frame),
    actionMap: () => app.mapName(),
  });
  if (session) session.engine = engine;
  app.attach(engine, store);
  if (info) {
    callReady();
    if (!engine.ready && !engine.inspector) hub?.fail('WebGPU required');
  }
  const msg = document.getElementById('msg');
  if (msg) msg.hidden = true;
}
