// Page entry: hub session? the round. Otherwise the normal start. WebGPU failure gets a plain message.
import { Engine, withUrlOptions, PALETTE } from './engine.js';
import { createGame } from './game.js';
const touchOnly = navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches;
function failPage(msg) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#1a1c2c;color:#f4f4f4;font:20px/1.5 monospace;padding:40px;text-align:center;z-index:9'; d.textContent = `Silly Folk needs WebGPU. Try a recent Chrome or Edge, Safari 26, or Firefox 141 on Windows. (${msg})`; document.body.appendChild(d); }
const options = (quality = 'high') => withUrlOptions({ container: document.getElementById('app'), aspect: 'fixed', quality, camera: { preset: 'iso', yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 }, settings: { button: touchOnly ? 'top-right' : false, key: 'silly-folk' }, touch: false, touchBar: false, background: PALETTE.ink });
async function start() {
  const hub = window.AIHub; if (hub?.active) { const { startRound } = await import('./net/round.js'); const handled = await startRound(hub, options); if (handled) return; }
  try { await Engine.start(createGame(), options()); } catch (e) { failPage(String(e?.message ?? e)); }
}
start();
