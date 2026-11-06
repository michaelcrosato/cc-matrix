import { createGame } from './game/director.js';
import { createStage } from './render/renderer.js';
import { renderProbe } from './audio/engine.js';
import { TITLE } from './data/config.js';

const params = new URLSearchParams(location.search);
const coarse = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;

const canvas = document.createElement('canvas');
canvas.id = 'view';
document.body.appendChild(canvas);

const boot = document.createElement('p');
boot.id = 'boot-line';
boot.textContent = TITLE;
document.body.appendChild(boot);

const errors = [];
window.addEventListener('error', (event) => { errors.push(String(event.message || 'error')); });
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  errors.push(String((reason && reason.message) || reason || 'rejection'));
});

async function start() {
const game = await createGame({
  window,
  document,
  coarse,
  manual: params.get('manual') === '1',
});

const pads = [null, null, null, null];
window.__pads = pads;
game.setPadSource(() => {
  let native = [];
  try { native = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch { native = []; }
  return [0, 1, 2, 3].map((i) => {
    if (pads[i]) return pads[i];
    const real = native[i];
    if (real && real.connected && real.mapping === 'standard') return real;
    return game.pads[i];
  });
});
game.input.setView(window.innerWidth, window.innerHeight);
const point = (event) => {
  const extra = event.buttons & 6;
  if (extra) game.pointer(event.clientX, event.clientY, event.buttons);
  else game.input.pointerMove(event.clientX, event.clientY, event.buttons);
};
window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  game.audio.unlock();
  game.key(event.code || event.key, true);
  if (event.code === 'Space' || event.code === 'Enter' || (event.code && event.code.startsWith('Arrow'))) event.preventDefault();
});
window.addEventListener('keyup', (event) => game.key(event.code || event.key, false));
window.addEventListener('pointermove', point);
window.addEventListener('pointerdown', (event) => { game.audio.unlock(); point(event); });
window.addEventListener('pointerup', point);

function publish(info) {
  const render = {
    backend: info ? info.backend : 'none',
    lost: info ? info.lost : null,
    frames: info ? info.frames : 0,
    width: info ? info.width : 0,
    height: info ? info.height : 0,
  };
  window.__RENDER__ = { ...render, errors: errors.slice() };
  game.setRender(render);
}

if (params.get('test') === '1') {
  window.__TEST__ = {
    state: () => game.state(),
    advance: (seconds) => game.advance(seconds),
    bot: (skill, opt) => game.bot(skill, opt),
    goto: (screen, args) => game.goto(screen, args),
    tuning: game.tuning,
    settings: game.settings,
    activate: (index) => game.activate(index),
    key: (code, down) => game.key(code, down),
    pointer: (x, y, buttons) => game.pointer(x, y, buttons),
    pad: (i) => game.pad(i),
    pads: game.pads,
    setCoarse: (on) => game.setCoarse(on),
    setPadSource: (fn) => game.setPadSource(fn),
    audio: game.audio,
    probe: (kind, id) => renderProbe(kind, id),
    errors: () => errors.slice(),
    TITLE,
  };
}

const hub = globalThis.AIHub;
const connecting = hub && hub.active ? hub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;

let stage = null;
const stagePromise = params.get('render') === '0'
  ? null
  : createStage(canvas, { session: !!(hub && hub.active) }).then((made) => {
    stage = made;
    publish(stage.info());
    return made;
  }).catch((err) => {
    errors.push(String((err && err.message) || err));
    if (hub && hub.active && hub.fail) hub.fail(String((err && err.message) || err));
    publish({ backend: 'none', lost: String((err && err.message) || err), frames: 0, width: 0, height: 0 });
    return null;
  });

function fit() {
  if (!stage) return;
  stage.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
}
window.addEventListener('resize', () => {
  fit();
  game.input.setView(window.innerWidth, window.innerHeight);
});

game.onFrame(() => {
  try {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of list) {
      if (pad && pad.buttons && pad.buttons.some((button) => button && button.pressed)) game.audio.unlock();
    }
  } catch { /* a missing gamepad list is not a gesture */ }
  const view = game.state();
  if (stage) {
    stage.sync(view);
    stage.setInk(view.inkOn !== false && view.settings.ink !== 0);
    stage.render(view.inkOn !== false);
    publish(stage.info());
  }
  if (boot.parentNode && view.screen !== 'boot') boot.remove();
});

if (connecting) {
  const info = await connecting;
  if (info) game.runSession(info);
  else game.runStandalone();
} else {
  game.runStandalone();
}
if (boot.parentNode && game.state().screen !== 'boot') boot.remove();
if (params.get('render') === '0') {
  game.setRender({ backend: 'none', lost: null, frames: 0, width: 0, height: 0 });
}
await stagePromise;
fit();
}

start().catch((err) => {
  errors.push(String((err && err.message) || err));
});
