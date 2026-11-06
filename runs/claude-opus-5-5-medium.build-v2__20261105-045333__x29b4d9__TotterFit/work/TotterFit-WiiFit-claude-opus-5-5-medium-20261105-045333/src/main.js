import * as THREE from 'three/webgpu';
import cssText from './ui/ui.css';
import { RAPIER } from './physics/world.js';
import { Game } from './game/director.js';
import { startRenderer, R } from './render/renderer.js';
import { Session } from './game/session.js';
import { installTestHooks } from './core/testhooks.js';
import { newProfile } from './game/programme.js';
import { setSeed, freshSeed } from './core/rng.js';
import { Poses } from './events/poses.js';
const q = new URLSearchParams(location.search);
const params = { test: q.get('test') === '1', render: q.get('render') !== '0', manual: q.get('manual') === '1', seed: q.get('seed') };
const AIHub = globalThis.AIHub;
function style() { const s = document.createElement('style'); s.textContent = cssText; document.head.appendChild(s); }
function bootCard() { const b = document.createElement('div'); b.className = 'bootmsg'; b.id = 'boot'; b.innerHTML = '<div class="wob"></div><div>Stretching...</div>'; document.body.appendChild(b); return b; }
let game = null;
async function bootEngine() {
  style(); const b = bootCard();
  setSeed(params.seed != null ? +params.seed : freshSeed());
  await RAPIER.init();
  game = new Game(params); game.freshProfile = newProfile;
  game.buildWorld();
  if (params.render) { await startRenderer(game.scene, game.camera); if (R.renderer && R.renderer.backend && R.backend === 'none') R.backend = 'webgl2'; }
  if (params.test) installTestHooks(game, RAPIER, THREE);
  b.remove();
  return game;
}
function runStandalone() {
  game.goTitle(true);
  if (!params.manual) game.loop.start();
  // A controller-only device: the first attract and audio still work.
}
function runSession(info) {
  game.island.setStage('backdrop');
  const s = new Session(game, info); game.session = s;
  if (params.test) { window.__SESSION__ = s; }
  AIHub.ready();
  game.loop.start();
}
async function main() {
  if (AIHub && AIHub.active) {
    const pConnect = AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
    await bootEngine();
    const info = await pConnect;
    if (info) runSession(info); else runStandalone();
  } else { await bootEngine(); runStandalone(); }
}
function showBootFailure(e) {
  const m = String(e && e.message || e);
  const b = document.getElementById('boot') || bootCard(); b.innerHTML = `<div>This game needs WebGPU or WebGL2.</div><div style="font-size:30px">${m.replace(/[<&]/g, '')}</div>`;
  if (AIHub && AIHub.active) AIHub.fail(m);
  if (params.test) window.__BOOTERR__ = m;
}
main().catch(showBootFailure);
void Poses;
