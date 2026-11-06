// A hub session: straight to the card, no title, menu or attract.
import { Engine, PALETTE, withUrlOptions } from '../../pixel-engine.js';
import { SLUG } from '../config.js';
import { app, NATIVE_LOOK } from '../core/app.js';
import { ShiftArena } from './shift.js';
export async function startSession(info) {
  const H = window.AIHub; let engine;
  H.isHubCard = true; H.hub = true; app.session = { hub: H };
  try { engine = await Engine.start(new ShiftArena(app, H, {}), withUrlOptions({ container: document.getElementById('app'), seed: info.seed >>> 0, camera: { preset: 'third', fov: 55 }, look: NATIVE_LOOK, quality: 'high', touch: false, settings: { button: false, key: SLUG }, debugUI: false, background: PALETTE.ink })); } catch (e) { H.fail(`WebGPU unavailable: ${e?.message ?? e}`); return; }
  window.__APP__ = app;
}
