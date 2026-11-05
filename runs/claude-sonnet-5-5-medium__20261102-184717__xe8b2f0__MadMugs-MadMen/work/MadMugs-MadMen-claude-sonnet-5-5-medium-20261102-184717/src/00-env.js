// MAD MUGS: a spiritual successor to Mad Men (2007-2015). Built on my-3D2dge (v0.85.1).
// This file set is concatenated by build.mjs into ONE iife (the engine's rule), then inlined into the single html.
(() => {
const E = My3D2dge;
const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';
const HUB = (typeof AIHub !== 'undefined' && AIHub) ? AIHub : null;
const IN_SESSION = !!(HUB && HUB.active);
const TITLE = 'MAD MUGS';
const TAGLINE = 'Faces sell. Souls are extra.';
const STAMP = { date: '2026-11-02 18:47', model: 'claude-sonnet-5-5', effort: 'medium' };

// ---- gamepad axis inversion (the "sometimes the stick is flipped" quick fix): the engine reads navigator.getGamepads(),
// so one thin wrapper flips the axes there, for the game and every menu alike ------------------------------------------
const AXIS = { invX: false, invY: false };
function flipPad(p) {
  if (!p || (!AXIS.invX && !AXIS.invY)) return p;
  const axes = Array.from(p.axes, (v, i) => ((i % 2 === 0 && AXIS.invX) || (i % 2 === 1 && AXIS.invY)) ? -v : v);
  return { index: p.index, id: p.id, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes, vibrationActuator: p.vibrationActuator };
}
if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function' && !navigator.__mmWrapped) {
  const real = navigator.getGamepads.bind(navigator);
  const wrapped = () => Array.from(real() || [], flipPad);
  try { Object.defineProperty(navigator, 'getGamepads', { value: wrapped, configurable: true, writable: true }); navigator.__mmWrapped = true; } catch (e) { try { navigator.getGamepads = wrapped; navigator.__mmWrapped = true; } catch (e2) { /* read-only */ } }
}

// ---- input devices: is this a touch-only device (no keyboard, mouse or pad)? -------------------------------------------
const DEV = { sawKey: false, sawPad: false };
function touchOnly() {
  if (!HAS_DOM || DEV.sawKey || DEV.sawPad) return false;
  const mm = q => { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };
  const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
  const fine = mm('(any-pointer: fine)') || mm('(any-hover: hover)');
  let pad = false; try { pad = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(Boolean); } catch (e) { /* blocked */ }
  return touch && !fine && !pad;
}
if (HAS_DOM) {
  window.addEventListener('keydown', () => { DEV.sawKey = true; });
  window.addEventListener('gamepadconnected', () => { DEV.sawPad = true; });
}

// ---- small helpers ---------------------------------------------------------------------------------------------------
const clamp = E.clamp, TAU = Math.PI * 2;
const fmtTime = m => { const h = Math.floor(m / 60), mm = String(Math.floor(m % 60)).padStart(2, '0'); return ((h + 11) % 12 + 1) + ':' + mm + (h < 12 ? ' AM' : ' PM'); };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const upper = s => String(s).toUpperCase();

