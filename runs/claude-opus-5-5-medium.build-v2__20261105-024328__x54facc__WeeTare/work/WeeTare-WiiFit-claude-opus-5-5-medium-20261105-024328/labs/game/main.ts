/**
 * @file The page of Wee Tare: starts the engine (with or without the hub), and every drawn frame reads the sim to choose the
 * screens, the action map, the camera, the HUD and the sound. It reads the run and never writes it: all picks go through
 * scene actions, so replays hold them.
 */
/// <reference types="vite/client" />
import { createEngine, createStore, defineActionMap } from '../../engine';
import './ui/theme.css';
import './materials';
import './looks';
import './bodies';
import './emitters';
import './cameras/stage';
import './props';
import './cast/clips';
import { createSound } from './audio/sound';
import { openSession, type HubApi, type HubInfo, type Opening } from './hub/session';
import { createPage } from './ui/page';
import { island } from './scenes/island';
import { round } from './scenes/round';
import { DEFAULT_SETTINGS, type Settings } from './ui/ctx';
import { registerMaps } from './ui/maps';

registerMaps(defineActionMap);

const AIHub = (window as unknown as { AIHub?: HubApi }).AIHub;

/** The query: no hub keys, no touch stick, the game's look. */
const search = new URLSearchParams(location.search);
for (const key of [...search.keys()]) if (key.startsWith('aihub')) search.delete(key);
search.set('touch', 'off');
if (!search.has('post.look')) search.set('post.look', 'look:retreat');
if (!search.has('cam3') && !search.has('cam')) search.set('cam3', 'stage');

const msg = document.getElementById('msg') as HTMLElement;

async function main(): Promise<void> {
  if (!('gpu' in navigator)) {
    msg.textContent = 'This game needs a browser with WebGPU, such as current Chrome or Edge.';
    if (AIHub?.active) {
      await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
      AIHub.fail('WebGPU required');
    }
    return;
  }
  const root = document.createElement('div');
  root.id = 'wt';
  root.dataset.device = 'keys';
  document.body.append(root);
  const info: HubInfo | null = AIHub?.active ? await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;
  let opening: Opening | null = null;
  if (info && AIHub) {
    search.set('scene', 'game:round');
    search.set('seed', String(info.seed));
    search.set('post.look', 'look:session');
    search.set('quality', 'low');
    msg.hidden = true;
    opening = openSession(root, AIHub, info);
  }
  const store = createStore({ prefix: 'weetare:', mode: 'play' });
  const settings: Settings = { ...DEFAULT_SETTINGS, ...store.get<Partial<Settings>>('settings', {}) };
  const sound = createSound({ music: settings.music, effects: settings.effects, voices: settings.voices });
  let page: ReturnType<typeof createPage> | null = null;
  const engine = await createEngine({
    canvas: document.getElementById('view') as HTMLCanvasElement,
    scenes: [island.id, round.id],
    search: `?${search}`,
    store,
    actionMap: () => page?.map() ?? 'actionMap:wtMenu',
    modal: () => (page ? page.modal() : false),
    cameraInput: () => page?.cameraFollow(),
    onFrame: (frame) => page?.frame(frame),
  });
  if (!engine.inspector || !engine.input || !engine.ui) {
    if (info) AIHub?.fail('WebGPU required');
    msg.textContent = 'This game needs a browser with WebGPU, such as current Chrome or Edge.';
    return;
  }
  msg.hidden = true;
  page = createPage({ engine, store, sound, settings, info, opening, root });
}

void main();
