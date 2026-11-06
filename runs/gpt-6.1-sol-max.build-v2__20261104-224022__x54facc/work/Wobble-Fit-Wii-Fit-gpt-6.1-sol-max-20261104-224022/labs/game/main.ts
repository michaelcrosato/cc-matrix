/** @file Boots the self-contained retreat on the read-only my-3dge runtime. */
import { createEngine } from '../../engine';
import { GameApp } from './app';
import { startSound } from './audio/sound';
import { HubSession } from './hub/session';
import { island, round } from './scenes/island';
import { SHOT } from './cameras/retreat';
import { mapFor } from './ui/runtime';
import type { GameEngine } from './ui/context';
import './looks/retreat';
import './bodies/retreat';
import './ui/input';
import './emitters/retreat';
import './ui/theme.css';
const app = new GameApp(startSound());
const session = new HubSession(app);
await session.connect();
const search = new URLSearchParams(location.search);
for (const key of [...search.keys()]) if (key.startsWith('aihub')) search.delete(key);
search.set('touch', 'off');
search.set('cam3', 'retreat');
search.set('post.look', session.info ? 'look:retreatSession' : 'look:retreat');
search.set('gfx.resolution', session.info ? 'balanced' : 'full');
search.set('quality', session.info ? 'low' : 'high');
search.set('gfx.governor', 'false');
search.set('gfx.warmUp', 'asked');
if (session.info) {
  search.set('scene', round.id);
  search.set('seed', String(session.info.seed));
  search.set('game.sessionSeat', String(session.info.me));
  search.set('game.sessionCount', String(session.info.players.length));
}
let supported = !!navigator.gpu;
if (supported)
  try {
    supported = !!(await navigator.gpu.requestAdapter());
  } catch {
    supported = false;
  }
if (!supported) {
  document.querySelector('#msg')?.setAttribute('hidden', '');
  app.noGpu = true;
  app.show('title');
  if (session.info) session.client?.fail('WebGPU required');
} else {
  const watchdog = session.info ? setTimeout(() => session.client?.ready(), 14000) : 0;
  const engine = await createEngine({
    canvas: document.querySelector<HTMLCanvasElement>('#view')!,
    scenes: [island.id, round.id],
    search: `?${search}`,
    hash: '',
    store: app.store,
    actionMap: () => mapFor(app),
    modal: () => app.freeCamera || app.ui.choices.length > 0 || app.ui.screen === 'hub',
    cameraInput: () => (app.freeCamera ? app.seats.camera() : { follow: SHOT.feet as [number, number, number] }),
    onFrame: (frame) => {
      app.frame(frame);
      session.frame();
    },
  });
  if (watchdog) clearTimeout(watchdog);
  app.attach(engine as GameEngine);
  if (engine.ready) {
    document.querySelector('#msg')?.setAttribute('hidden', '');
    session.ready();
  } else {
    app.noGpu = true;
    app.show('title');
    if (session.info) session.client?.fail('WebGPU required');
  }
}
