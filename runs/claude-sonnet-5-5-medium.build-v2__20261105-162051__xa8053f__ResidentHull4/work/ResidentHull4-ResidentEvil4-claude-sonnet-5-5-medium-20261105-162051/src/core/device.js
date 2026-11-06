// Which device was used last, and what a button is called on it.
import { settings } from './settings.js';
export const device = { kind: 'kbm', touchOnly: false, padSeen: false, inputSeq: 0 };
export const noteInput = () => { device.inputSeq++; };
export function setDevice(kind) { if (device.kind !== kind) device.kind = kind; }
export function installDeviceTracking(win = globalThis.window) {
  if (!win || !win.addEventListener) return () => {};
  const k = (e) => { if (!e.isTrusted && !e.detail) { /* synthetic still counts for tests */ } setDevice('kbm'); device.touchOnly = false; };
  const m = () => setDevice('kbm');
  win.addEventListener('keydown', (e) => { k(e); noteInput(); }, true);
  win.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { m(); noteInput(); } }, true);
  win.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { m(); noteInput(); } }, true);
  win.addEventListener('wheel', () => { m(); noteInput(); }, true);
  return () => {};
}
let padHeld = false;
/** Poll the gamepads once a frame. Any button or stick past the deadzone makes the pad the last device. */
export function pollPads() {
  const nav = globalThis.navigator;
  const pads = nav && nav.getGamepads ? nav.getGamepads() : [];
  let active = false, any = false;
  for (const p of pads || []) {
    if (!p) continue;
    any = true;
    if (p.buttons.some((b) => b.pressed || b.value > 0.5) || p.axes.some((a) => Math.abs(a) > 0.5)) active = true;
  }
  device.padSeen = any;
  if (active) { setDevice('pad'); device.touchOnly = false; if (!padHeld) noteInput(); }
  const was = padHeld; padHeld = active;
  return active && !was;
}
const PS = { Cross: 'X', Circle: 'O', Square: '[]', Triangle: '^', L1: 'L1', R1: 'R1', L2: 'L2', R2: 'R2', Options: 'OPTIONS', Create: 'CREATE', Up: 'UP', Down: 'DOWN', Left: 'LEFT', Right: 'RIGHT', L3: 'L3', R3: 'R3' };
const XB = { Cross: 'A', Circle: 'B', Square: 'X', Triangle: 'Y', L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT', Options: 'MENU', Create: 'VIEW', Up: 'UP', Down: 'DOWN', Left: 'LEFT', Right: 'RIGHT', L3: 'LS', R3: 'RS' };
const PS_COLORS = { Cross: 'blue', Circle: 'red', Square: 'plum', Triangle: 'green' };
const XB_COLORS = { Cross: 'green', Circle: 'red', Square: 'blue', Triangle: 'sand' };
/** Verbs -> [pad button name, keyboard label]. */
export const BINDINGS = {
  confirm: ['Cross', 'ENTER'], back: ['Circle', 'ESC'], action: ['Cross', 'E'], aim: ['L2', 'R-MOUSE'], fire: ['R2', 'L-MOUSE'], knife: ['R1', 'V'],
  run: ['Circle', 'SHIFT'], reload: ['Square', 'R'], case: ['Triangle', 'TAB'], pause: ['Options', 'ESC'], map: ['Create', 'M'], heal: ['Left', 'H'],
  command: ['Right', 'C'], grenade: ['L1', 'G'], shoulder: ['R3', 'T'], dodge: ['Circle', 'SPACE'], prev: ['L1', 'Q'], next: ['R1', 'E'],
  second: ['Square', 'R'], third: ['Triangle', 'TAB'], weapon: ['Up', 'WHEEL'], skip: ['Cross', 'SPACE'], ready: ['Cross', 'ENTER'], more: ['Triangle', 'M'],
  arrange: ['R1', 'F'], drop: ['Triangle', 'X'], rotate: ['Square', 'R'], revive: ['Cross', 'E'], mash: ['Cross', 'E'], quick: ['Circle', 'Q'],
};
export function glyphName(verb) {
  const b = BINDINGS[verb] || [verb, verb];
  if (device.kind === 'pad') return (settings.glyphs === 'xbox' ? XB : PS)[b[0]] || b[0];
  return b[1];
}
export function glyphColor(verb) {
  const b = BINDINGS[verb] || [verb, verb];
  if (device.kind !== 'pad') return 'sand';
  return (settings.glyphs === 'xbox' ? XB_COLORS : PS_COLORS)[b[0]] || 'mist';
}
export const PAD_CODES = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
