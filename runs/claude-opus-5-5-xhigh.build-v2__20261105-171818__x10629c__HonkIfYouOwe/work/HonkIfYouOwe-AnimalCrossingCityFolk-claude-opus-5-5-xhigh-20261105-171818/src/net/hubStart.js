// In an AI Hub session: connect first, before Engine.start, then build only the arena.
import { Engine, withUrlOptions, PALETTE } from '../engine.js';
import { BazaarGame } from './arena.js';

export async function startRound(hub, { touchOnly }) {
  const info = await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  if (!info) return false; // no hub after all: the normal start
  const game = new BazaarGame(hub, info, { touchOnly });
  try {
    await Engine.start(game, withUrlOptions({
      container: document.getElementById('app'),
      aspect: 'fixed',
      quality: 'medium',
      camera: { preset: 'iso', yaw: 45, pitch: 35, zoom: 1.35, minZoom: 0.5, maxZoom: 2 },
      settings: { button: false, key: false },
      touch: false, touchBar: false, background: PALETTE.ink,
    }));
  } catch (err) {
    hub.fail(`WebGPU is required: ${err?.message ?? err}`);
  }
  return true;
}
