// Page entry: AI Hub round vs normal start; touch and WebGPU checks.
import { Engine, withUrlOptions } from './engine.js';
import { Game } from './game.js';
import { loadFurniture } from './world/rooms.js';
import { hubConnect } from './net/hub.js';
const fail = (msg) => { const el = document.getElementById('fail'); if (el) { el.style.display = 'flex'; el.textContent = msg; } if (window.AIHub?.active) window.AIHub.fail(msg); };
async function start() {
  const touchOnly = navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches;
  try {
    const info = await hubConnect(); const game = new Game(); game.hubInfo = info;
    if (!info) await loadFurniture();
    await Engine.start(game, withUrlOptions({
      container: document.getElementById('app'), aspect: 'fixed', quality: info ? 'medium' : 'high',
      camera: { preset: 'iso', yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 },
      settings: { button: touchOnly ? 'top-right' : false, key: 'creditor-creek' }, touch: false, touchBar: false, background: 0x1a1c2c,
    }));
  } catch (e) { console.error(e); fail('Creditor Creek needs WebGPU. Try a recent Chrome, Edge, Safari 26 or Firefox 141+. (' + (e?.message ?? e) + ')'); }
}
start();
