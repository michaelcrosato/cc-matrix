import { Gfx } from './render/renderer.js';
import { initRapier } from './physics/world.js';
import { Game } from './game/game.js';
import { Island } from './game/island.js';
import { install as screens1 } from './game/screens1.js';
import { install as flow } from './game/flow.js';
import { install as checkin } from './game/checkin.js';
import { install as extras } from './game/extras.js';
import { install as ending } from './game/ending.js';
import { install as session } from './game/session.js';
import { LINES } from './data/dialogue.js';
import * as AUD from './audio/engine.js';
import { TRACKS } from './audio/tracks.js';
import { SFX } from './audio/sfx.js';
import * as VOX from './audio/voice.js';
import * as THREE_ from 'three/webgpu';
import { RAPIER } from './physics/world.js';
import { tuning, resetTuning, TUNING_DEFS } from './data/tuning.js';
import { TITLE } from './data/config.js';
import { setSeed, seedFromClock } from './core/rng.js';

const q = new URLSearchParams(location.search);
const TEST = q.get('test') === '1', RENDER = q.get('render') !== '0', MANUAL = q.get('manual') === '1';
function fail(e) { const msg = String(e && e.message || e); const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;font:600 32px Fredoka,sans-serif;color:#fff;background:#1a1420;padding:5vw'; d.textContent = /webgpu|webgl/i.test(msg) ? 'This game needs WebGPU or WebGL2. Please try a newer browser.' : 'Something went wrong: ' + msg; document.body.appendChild(d); window.__err = msg; if (window.AIHub && window.AIHub.active) { try { window.AIHub.fail(msg); } catch (x) { /* ignore */ } } }
async function bootEngine() {
  await initRapier(); const gfx = new Gfx(); window.__gfx = gfx;
  if (RENDER) await gfx.init(document.body);
  const game = new Game({ gfx, test: TEST, manual: MANUAL }); if (q.get('audio') === '0') game.audio.disabled = true; game.IslandClass = Island; window.__LINES = LINES;
  for (const f of [screens1, flow, checkin, extras, ending, session]) f(game);
  game.go('boot0'); return game;
}
function startLoop(game) {
  let last = performance.now(), acc = 0; const FIX = 1 / 120;
  const loop = (now) => { const real = Math.min(0.25, (now - last) / 1000); last = now; acc += real * game.timeScale; let n = 0; while (acc >= FIX && n < 30) { game.fixed(FIX); acc -= FIX; n++; } if (n === 30) acc = 0; game.frame(real); game.gfx.render(); requestAnimationFrame(loop); };
  if (!MANUAL) requestAnimationFrame(loop);
}
function hooks(game) {
  const FIX = 1 / 120;
  window.__TEST__ = {
    game, state: () => game.state(), lib: { AUD, TRACKS, SFX, VOX, REV: THREE_.REVISION, RV: RAPIER.version() },
    advance(sec) { const n = Math.round(sec / FIX); for (let i = 0; i < n; i++) { game.fixed(FIX); if (i % 12 === 11) game.frame(FIX * 12); } },
    press(a, dev = 'kbm') { game.input.nav.push({ a, dev }); game.input.anyInput++; },
    bot(skill) { game.autoBot = skill || null; if (game.ev && skill) for (const l of game.ev.lanes) if (l.kind === 'local') { l.kind = 'bot'; l.skill = skill; } },
    render() { game.frame(1 / 60); game.gfx.render(); return game.gfx.lastError || null; },
    goto(name, args) { game.go(name, args); }, tuning, settings: game.settings,
    session: () => game.session,
  };
}
async function main() {
  const A = window.AIHub;
  setSeed(seedFromClock());
  if (A && A.active) {
    const pConnect = A.connect({ mode: 'ghost', seats: [1, 4], card: true });
    const game = await bootEngine(); window.__game = game; if (TEST) hooks(game);
    const info = await pConnect;
    if (info) { game.runSession(info); startLoop(game); } else { game.begin(); startLoop(game); }
  } else { const game = await bootEngine(); window.__game = game; if (TEST) hooks(game); game.begin(); startLoop(game); }
  window.__done = true;
}
main().catch(fail);
