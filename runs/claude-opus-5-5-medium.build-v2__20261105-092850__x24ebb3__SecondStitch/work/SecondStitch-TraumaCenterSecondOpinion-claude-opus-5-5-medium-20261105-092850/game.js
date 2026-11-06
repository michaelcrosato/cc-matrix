// Second Stitch: a surgical drama. Controls: stick/mouse move the tool, R2/left click use it,
// right stick/1-8 pick a tool, L2/Space the gift, Options/Esc pause.
import { Engine, withUrlOptions } from './pixel-engine.js';
import { app } from './src/core/app.js';
import { SLUG } from './src/core/meta.js';
import { TitleStage, MainMenuStage } from './src/stages/title.js';
import { cancelSwap, OP_CAMERA } from './src/stages/stage.js';
import { OperationStage } from './src/stages/operation.js';
import { StoryStage } from './src/stages/story.js';
import { CardStage } from './src/stages/card.js';
import { backToMain, resultsThenBack, startAttract } from './src/stages/flow.js';
import { NetSession } from './src/net/session.js';

/**
 * A fresh game: the page starts one, and `node check.mjs --headless` plays one in Node. The tool asks for
 * a second one to replay the recording it just took, which belongs to the level that was running: so once
 * a level is running, a fresh game is a new copy of that level.
 */
export const createGame = () => { cancelSwap(); return app.engine?.game?.fresh?.() ?? new TitleStage(); };

function flagsFromUrl() {
  if (typeof location === 'undefined') return {};
  const q = new URLSearchParams(location.search), out = {};
  for (const k of ['op', 'stage', 'diff', 'seed', 'bot', 'god', 'attract', 'dev', 'scene', 'menu']) if (q.has(k)) out[k] = q.get(k);
  return out;
}
function touchOnly() {
  if (typeof matchMedia === 'undefined') return false;
  const fine = matchMedia('(any-pointer: fine)').matches;
  const pad = navigator.getGamepads && [...navigator.getGamepads()].some(Boolean);
  return !fine && (navigator.maxTouchPoints ?? 0) > 0 && !pad;
}
function showGate() {
  const el = document.createElement('div');
  el.id = 'touch-gate';
  el.textContent = 'Controller or keyboard required';
  el.style.cssText = 'position:fixed;left:0;right:0;bottom:12%;text-align:center;font:bold 22px monospace;color:#fff;background:rgba(13,11,20,.82);padding:14px 10px;z-index:50;pointer-events:none';
  document.body.appendChild(el);
  const drop = () => { el.remove(); app.touchGate = false; app.exitAttract?.(); window.removeEventListener('keydown', drop); window.removeEventListener('gamepadconnected', drop); };
  window.addEventListener('keydown', drop);
  window.addEventListener('gamepadconnected', drop);
}
function noWebGpu() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;font:18px monospace;color:#fff;background:#0d0b14;padding:30px';
  el.textContent = 'This game needs WebGPU. Try a recent Chrome or Edge, Safari 26, or Firefox 141 on Windows.';
  document.body.appendChild(el);
}
function firstStage(flags) {
  if (flags.scene) return new StoryStage({ scene: flags.scene, onDone: backToMain });
  if (flags.op) return new OperationStage({ op: flags.op, stage: +(flags.stage ?? 0), difficulty: flags.diff ?? undefined, seed: flags.seed ? +flags.seed : undefined, onWin: resultsThenBack(flags.op) });
  if (flags.menu) return new MainMenuStage();
  return new TitleStage();
}
async function runStandalone() {
  if (!navigator.gpu) { noWebGpu(); return; }
  const flags = flagsFromUrl();
  app.urlFlags = { seed: flags.seed ? +flags.seed : null };
  if (flags.god) app.flags.cheats = { god: true };
  const gate = touchOnly();
  app.touchGate = gate;
  const engine = await Engine.start(firstStage(flags), withUrlOptions({ container: document.getElementById('app'), aspect: 'fill', touch: false, settings: { button: gate ? 'top-right' : false, key: SLUG }, background: 0x0a0a10, camera: OP_CAMERA }));
  if (gate) { showGate(); startAttract(); }
  if (flags.attract) startAttract();
  if (flags.dev && engine.game.openPause) { engine.game.intro = 0; engine.game.openPause(engine.context); engine.game.pause.openDev(engine.context); }
  if (flags.bot && engine.game.sim) { engine.game.botOn = true; engine.game.botSkill = +flags.bot; }
  return engine;
}
async function runSession(info) {
  const net = new NetSession(info);
  app.sessionInfo = info;
  if (info.server) { window.AIHub.ready(); return; } // a server copy never starts the engine
  if (!navigator.gpu) { window.AIHub.fail('WebGPU unavailable'); return; }
  const stage = new CardStage(net, () => window.AIHub.ready());
  await Engine.start(stage, { container: document.getElementById('app'), aspect: 'fill', touch: false, settings: { button: false, key: false }, background: 0x0a0a10, camera: OP_CAMERA });
}
async function main() {
  if (window.AIHub?.active) {
    const info = await window.AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (info) { await runSession(info); return; }
  }
  await runStandalone();
}
if (typeof document !== 'undefined') main();
