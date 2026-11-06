/**
 * @file Thumb Yoga in a page. The island is the week. A hub session uses the pavilion instead.
 * The hub's own query keys are stripped before the engine sees them. Music starts at a tenth.
 */
import { createAudio, createEngine, createStore } from '../../engine';
import './audio/voice';
import './looks/retreat';
import { island } from './scenes/island';
import { round } from './scenes/round';
import './sounds/songs';
import './ui/actions';
import type { HubClient } from './ui/hub';
import { LINES } from './ui/lines/book';
import { createPage } from './ui/stage';

/** The session client, when the page was pasted into a hub build. */
const hubClient = (window as unknown as { AIHub?: HubClient }).AIHub;

/** The status line, shown until the first frame or a missing GPU. */
const msg = document.querySelector<HTMLElement>('#msg');

/** Starts the retreat, or says which browser can draw it. */
async function boot(): Promise<void> {
  if (!navigator.gpu) {
    if (msg) msg.textContent = LINES['no.gpu'] ?? '';
    if (hubClient?.active) hubClient.fail('WebGPU required');
    return;
  }
  const search = new URLSearchParams(location.search);
  for (const key of [...search.keys()]) if (key.startsWith('aihub')) search.delete(key);
  search.set('touch', 'off');
  if (!search.has('cam') && !search.has('cam3')) search.set('cam3', 'chase');
  const info = hubClient?.active ? await hubClient.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;
  if (info) {
    search.set('scene', round.id);
    search.set('seed', String(info.seed));
  }
  search.set('post.look', info ? 'look:pavilion' : 'look:retreat');
  const session = info !== null;
  const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  // Four hub copies, or a phone at full device pixels, do not finish a frame in time on this GPU.
  // The desk at 1× still draws the view 1:1, which the boot check measures.
  if (session || touch) {
    search.set('gfx.resolution', 'pixels');
    search.set('quality', 'low');
    search.set('gfx.warmUp', 'asked');
  } else search.set('gfx.resolution', 'full');
  const store = createStore({ prefix: 'thumb-yoga:', mode: session || search.has('replay') ? 'demo' : 'play' });
  const audio = createAudio();
  audio.volume('music', 0.1);
  const page = createPage({ audio, store, hub: session, touch });
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  // Hello starts a 20s clock. The fourth copy can still be compiling then. The card is already up,
  // so say ready while the GPU finishes. Leans go out from the hub clock, before the first drawn frame.
  let told = false;
  const tellHub = () => {
    if (!session || told) return;
    told = true;
    hubClient?.ready();
  };
  const watchdog = session ? setTimeout(tellHub, 14000) : 0;
  const engine = await createEngine({
    canvas,
    scenes: [island.id, round.id],
    search: `?${search}`,
    store,
    actionMap: 'actionMap:retreat',
    modal: () => page.modal(),
    cameraInput: () => ({ follow: page.follow() }),
    onFrame: (frame) => page.frame(frame),
  });
  clearTimeout(watchdog);
  // touch=off only hides the stick. The node is still in the document, and a count sees it.
  document.querySelector('.touch-layer')?.remove();
  if (!engine.ready) {
    if (session) hubClient?.fail('WebGPU required');
    if (msg) msg.textContent = LINES['no.gpu'] ?? '';
    return;
  }
  page.bind(engine);
  tellHub();
  if (msg) msg.hidden = true;
}

void boot();
