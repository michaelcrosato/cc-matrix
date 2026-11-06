/**
 * @file Prompts that follow the input used last (PLAN.md section 4). Pads: PlayStation glyphs drawn as inline SVG, or Xbox
 * letters when Settings says so; keyboard and mouse: key caps and a mouse icon with the button lit. Never the engine's
 * `input.prompt()` text for pads: it guesses the family from the pad's id.
 *
 * Game code, a page's.
 *
 * @example
 * // glyph('confirm', 'gamepad', 'playstation'); // inline SVG of a cross
 */

/** What is being used. */
export type Device = 'gamepad' | 'keyboard' | 'mouse';
/** The button icon setting. */
export type GlyphSet = 'playstation' | 'xbox';

/** A verb the game asks of you. */
export type Verb =
  | 'confirm' | 'cancel' | 'lean' | 'footL' | 'footR' | 'both' | 'pause' | 'plan' | 'wave' | 'hop' | 'use' | 'look' | 'walk' | 'pageL' | 'pageR' | 'more' | 'any'; // prettier-ignore

/** The four face shapes, as SVG. */
const FACE: Readonly<Record<string, string>> = {
  cross:
    '<svg viewBox="0 0 24 24"><path d="M5 5 19 19M19 5 5 19" stroke="#7fc4f0" stroke-width="3.4" stroke-linecap="round" fill="none"/></svg>',
  circle:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.6" stroke="#ff8a70" stroke-width="3.2" fill="none"/></svg>',
  square:
    '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="1.6" stroke="#e3a3d6" stroke-width="3.2" fill="none"/></svg>',
  triangle:
    '<svg viewBox="0 0 24 24"><path d="M12 4.5 20 19H4Z" stroke="#8fd6b8" stroke-width="3" fill="none" stroke-linejoin="round"/></svg>',
};

/** The stick, as SVG. */
const STICK =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="#fff" stroke-width="2.6" fill="none"/><circle cx="12" cy="12" r="3.4" fill="#fff"/></svg>';

/** A pad glyph: an SVG or letters. */
const padGlyph = (text: string, kind = 'pad'): string =>
  `<span class="tf-glyph" data-kind="${kind}" data-glyph="${text.length > 8 ? 'svg' : text}">${text}</span>`;

/** A key cap. */
const key = (text: string): string => `<span class="tf-glyph" data-kind="key" data-glyph="${text}">${text}</span>`;

/** A mouse with `button` lit. */
function mouse(button: 'left' | 'right' | 'both' | 'none'): string {
  const left = button === 'left' || button === 'both' ? '#ff8a70' : 'none';
  const right = button === 'right' || button === 'both' ? '#ff8a70' : 'none';
  return `<span class="tf-glyph" data-kind="mouse" data-glyph="mouse-${button}"><svg viewBox="0 0 16 22"><path d="M8 1v8H1.2V8A6.8 7 0 0 1 8 1Z" fill="${left}"/><path d="M8 1v8h6.8V8A6.8 7 0 0 0 8 1Z" fill="${right}"/><path d="M8 1v8M1.2 9h13.6" stroke="#3a4a55" stroke-width="1.2" fill="none"/></svg></span>`;
}

/** Each verb on a pad, PlayStation then Xbox. */
const PAD: Readonly<Record<Verb, readonly [string, string]>> = {
  confirm: [FACE.cross, 'A'],
  cancel: [FACE.circle, 'B'],
  lean: [STICK, STICK],
  footL: ['L2', 'LT'],
  footR: ['R2', 'RT'],
  both: ['L2+R2', 'LT+RT'],
  pause: ['Options', 'Menu'],
  plan: [FACE.triangle, 'Y'],
  wave: [FACE.circle, 'B'],
  hop: [FACE.square, 'X'],
  use: [FACE.cross, 'A'],
  look: ['R', 'R'],
  walk: [STICK, STICK],
  pageL: ['L1', 'LB'],
  pageR: ['R1', 'RB'],
  more: [FACE.triangle, 'Y'],
  any: [FACE.cross, 'A'],
};

/** Each verb on keys, and with the mouse. */
const KEYS: Readonly<Record<Verb, () => string>> = {
  confirm: () => key('Enter'),
  cancel: () => key('Esc'),
  lean: () => key('WASD'),
  footL: () => key('Q'),
  footR: () => key('E'),
  both: () => key('Space'),
  pause: () => key('Esc'),
  plan: () => key('Tab'),
  wave: () => key('C'),
  hop: () => key('Space'),
  use: () => key('E'),
  look: () => mouse('none'),
  walk: () => key('WASD'),
  pageL: () => key('Q'),
  pageR: () => key('E'),
  more: () => key('T'),
  any: () => key('Any key'),
};

/** Each verb with a mouse, where it has its own. */
const MOUSE: Partial<Readonly<Record<Verb, () => string>>> = {
  confirm: () => mouse('left'),
  lean: () => mouse('none'),
  footL: () => mouse('left'),
  footR: () => mouse('right'),
  both: () => mouse('both'),
  use: () => mouse('left'),
  look: () => mouse('none'),
};

/** The HTML of `verb`'s glyph for a device and a set. */
export function glyph(verb: Verb, device: Device, set: GlyphSet): string {
  if (device === 'gamepad') return padGlyph(PAD[verb][set === 'xbox' ? 1 : 0]);
  if (device === 'mouse') return (MOUSE[verb] ?? KEYS[verb])();
  return KEYS[verb]();
}

/** A prompt: a glyph and a word. */
export const promptHtml = (verb: Verb, word: string, device: Device, set: GlyphSet): string =>
  `<span class="tf-prompt">${glyph(verb, device, set)}<span>${word}</span></span>`;
