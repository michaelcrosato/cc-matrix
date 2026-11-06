import { Engine, PALETTE, withUrlOptions } from '../pixel-engine.js';
import { detectTouchOnly } from './core/device.js';
import { App } from './app.js';
import { CAMERA, World } from './scenes/world.js';
import { renderVoice, syllabify, SPEAKERS } from './audio/voice.js';

const GPU_FLAGS = {
  aspect: 'fill',
  touch: false,
  camera: CAMERA,
  background: PALETTE.sky,
};

function installHubKeys(hub) {
  if (!hub || globalThis.__mintHubKeys) return;
  globalThis.__mintHubKeys = true;
  const onKey = (ev) => {
    if (!hub.answer) return;
    const code = ev.code || '';
    const key = ev.key || '';
    if (code === 'Enter' || key === 'Enter') hub.answer('ready');
    if (code === 'KeyM' || key === 'm' || key === 'M') hub.answer('more');
  };
  window.addEventListener('keydown', onKey);
  document.addEventListener('keydown', onKey);
}

export async function boot() {
  const hub = globalThis.AIHub;
  let info = null;
  if (hub?.active) {
    installHubKeys(hub);
    try {
      info = await hub.connect({ mode: 'ghost', seats: [1, 4], card: true });
    } catch {
      info = null;
    }
  }
  const touchOnly = detectTouchOnly();
  const app = new App({ session: info || null, touchOnly });
  if (info) app.bindHub(hub);
  const world = new World(app);
  try {
    await Engine.start(world, withUrlOptions({
      container: document.getElementById('app'),
      ...GPU_FLAGS,
      settings: { button: touchOnly ? 'top-right' : false, key: 'mint-dial' },
      quality: info ? 'medium' : 'high',
      seed: info?.seed ?? 7,
    }));
    if (info) hub.ready();
  } catch (err) {
    if (hub?.active) {
      try { hub.fail(String(err?.message || err)); } catch { /* already failing */ }
    }
  }
}

if (typeof document !== 'undefined') {
  globalThis.__VOICE__ = { syllabify, renderVoice, SPEAKERS };
  boot();
}
