/** The Second Opinion Clinic. Boots from a page, and from `node check.mjs --headless`. */

import { Engine, withUrlOptions } from './pixel-engine.js';
import { Clinic } from './src/game/clinic.js';
import { openSession } from './src/net/session.js';

const CAMERA = {
  preset: 'fixed',
  position: [0, 9.6, 3.1],
  target: [0, 0, 0.1],
  fov: 44,
  minZoom: 1,
  maxZoom: 1,
};

export function createGame(opts = {}) {
  return new Clinic(opts);
}

function touchOnly() {
  if (typeof window === 'undefined' || typeof matchMedia !== 'function') return false;
  const fine = window.matchMedia('(any-pointer: fine)').matches;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  let pad = false;
  try {
    const pads = navigator.getGamepads?.() || [];
    for (const p of pads) if (p && p.connected) pad = true;
  } catch {
    pad = false;
  }
  return !fine && touch && !pad;
}

function showGate() {
  if (typeof document === 'undefined' || document.getElementById('touch-gate')) return;
  const el = document.createElement('div');
  el.id = 'touch-gate';
  el.textContent = 'Controller or keyboard required';
  el.setAttribute('role', 'status');
  el.style.cssText = 'position:fixed;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#f4f1ea;background:rgba(13,11,20,.55);font:700 22px sans-serif;pointer-events:none';
  document.body.appendChild(el);
}

function pageOptions(gate) {
  return {
    aspect: 'fill',
    touch: false,
    background: 0x1a1218,
    quality: 'low',
    debugUI: false,
    debugKeys: false,
    record: 0,
    camera: CAMERA,
    settings: gate
      ? { button: 'top-right', key: 'second-opinion-clinic' }
      : { button: false, key: 'second-opinion-clinic' },
  };
}

function needWebGPU(hub) {
  if (typeof navigator === 'undefined' || navigator.gpu) return false;
  if (hub && hub.active) hub.fail('WebGPU unavailable');
  if (typeof document !== 'undefined') {
    const note = document.createElement('p');
    note.textContent = 'This clinic needs WebGPU.';
    note.style.cssText = 'color:#f4f1ea;font:16px sans-serif;padding:24px';
    document.body.appendChild(note);
  }
  return true;
}

async function boot() {
  const app = document.getElementById('app');
  const gate = touchOnly();
  if (gate) showGate();
  const hub = globalThis.AIHub;
  if (hub && hub.active) {
    let info = null;
    try {
      info = await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    } catch (err) {
      hub.fail(String(err && err.message ? err.message : err));
      return;
    }
    if (info && info.server) {
      openSession(hub);
      hub.ready();
      return;
    }
    if (info) {
      if (needWebGPU(hub)) return;
      const session = openSession(hub);
      await Engine.start(createGame({ session, touchOnly: gate }), withUrlOptions({ container: app, ...pageOptions(gate) }));
      return;
    }
  }
  if (needWebGPU(hub)) return;
  await Engine.start(createGame({ touchOnly: gate }), withUrlOptions({ container: app, ...pageOptions(gate) }));
}

if (typeof document !== 'undefined') boot();
