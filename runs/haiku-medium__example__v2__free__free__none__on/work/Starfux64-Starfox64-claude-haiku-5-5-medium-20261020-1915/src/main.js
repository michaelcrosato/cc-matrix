// Boot: WebGPU check, physics init, renderer, then the frame loop. No WebGL fallback by design.
import { initPhysics } from './physics.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { GameAudio } from './audio.js';
import { Hud } from './hud.js';
import { Game } from './game.js';
import { App } from './app.js';

const $ = (id) => document.getElementById(id);

function showFatal(message) {
  $('fatal-text').textContent = message;
  $('fatal').classList.remove('hidden');
}

async function boot() {
  if (!navigator.gpu) {
    showFatal('This browser has no WebGPU. Use a current Chrome, Edge or Safari build with WebGPU enabled.');
    return;
  }
  const adapter = await navigator.gpu.requestAdapter().catch(() => null);
  if (!adapter) {
    showFatal('WebGPU is present, but no GPU adapter is available.');
    return;
  }
  try {
    await initPhysics();
    const renderer = new Renderer($('stage'));
    await renderer.init();
    const input = new Input();
    const audio = new GameAudio();
    const hud = new Hud();
    const game = new Game({ renderer, audio, input, hud, onEvent: () => {} });
    const app = new App({ renderer, input, audio, hud, game, menuRoot: $('menu'), gate: $('gate') });
    app.start();
    let last = performance.now();
    renderer.renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      app.frame(dt);
    });
  } catch (err) {
    console.error(err);
    showFatal(`Starfux 64 could not start: ${err && err.message ? err.message : err}`);
  }
}

boot();
