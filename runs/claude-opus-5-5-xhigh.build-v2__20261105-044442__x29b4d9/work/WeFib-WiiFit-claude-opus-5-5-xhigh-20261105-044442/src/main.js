import * as THREE from 'three/webgpu';
import css from './ui/ui.css';
import { Game } from './game/director.js';
import { installTestHooks } from './core/testHooks.js';
import { runStandalone } from './game/flow.js';
import { runSession } from './game/session.js';
import { TITLE } from './data/config.js';

const q = new URLSearchParams(location.search);
const params = { test: q.get('test') === '1', render: q.get('render') !== '0', manual: q.get('manual') === '1' };

function setupPage() {
  const st = document.createElement('style');
  st.textContent = css;
  document.head.append(st);
  const ui = document.createElement('div');
  ui.id = 'ui';
  document.body.append(ui);
}

function showBootMessage(text, sub) {
  let b = document.getElementById('boot');
  if (!b) { b = document.createElement('div'); b.id = 'boot'; b.className = 'boot'; document.body.append(b); }
  b.innerHTML = '';
  if (!sub) {
    const icon = document.createElement('div');
    icon.className = 'boot-trudy';
    icon.innerHTML = '<svg viewBox="-70 -40 140 80" width="280"><rect x="-60" y="-26" width="120" height="44" rx="12" fill="#F5B700" stroke="#FFF4DC" stroke-width="4"/><rect x="-34" y="-16" width="68" height="24" rx="12" fill="#B9F26B"/><circle cx="-8" cy="-4" r="9" fill="#fff"/><circle cx="-8" cy="-4" r="3.5" fill="#1A1420"/><path d="M-30 18v10M30 18v10" stroke="#C78B4A" stroke-width="9"/></svg>';
    b.append(icon);
  }
  const t = document.createElement('div'); t.textContent = text; b.append(t);
  if (sub) { const s = document.createElement('div'); s.style.fontSize = '3.4rem'; s.textContent = sub; b.append(s); }
}
function hideBoot() { const b = document.getElementById('boot'); if (b) b.remove(); }

function showBootFailure(e) {
  const msg = (e && e.message) || String(e);
  showBootMessage(`${TITLE} needs WebGPU or WebGL2.`, msg);
  if (window.AIHub && window.AIHub.active) window.AIHub.fail(msg);
}

async function main() {
  setupPage();
  showBootMessage('Stretching...');
  const game = new Game(params);
  if (params.test) installTestHooks(game, THREE);
  window.addEventListener('error', (e) => game.noteError(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => game.noteError(e.reason));
  const AIHub = window.AIHub;
  if (AIHub && AIHub.active) {
    const pConnect = AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
    await game.bootEngine();
    hideBoot();
    const info = await pConnect;
    if (info) runSession(game, info); else runStandalone(game);
  } else {
    await game.bootEngine();
    hideBoot();
    runStandalone(game);
  }
  if (!params.manual) game.loop.start();
}
main().catch(showBootFailure);
