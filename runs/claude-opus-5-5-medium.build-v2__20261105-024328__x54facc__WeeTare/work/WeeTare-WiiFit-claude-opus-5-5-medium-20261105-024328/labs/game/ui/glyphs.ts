/**
 * @file On-screen prompts. Every prompt holds all its forms: PlayStation glyphs, Xbox letters, key caps and mouse buttons, and
 * CSS shows the one for the device used last (`#wt[data-device]`, `#wt[data-pad]`), so they switch the same frame. Never the
 * engine's `input.prompt()` for pads: it guesses the family and defaults to Xbox.
 */

const svg = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">${inner}</svg>`;

/** PlayStation's drawn glyphs. */
const PS: Record<string, string> = {
  cross: svg('<path d="M5 5 19 19M19 5 5 19"/>'),
  circle: svg('<circle cx="12" cy="12" r="8"/>'),
  square: svg('<rect x="5" y="5" width="14" height="14"/>'),
  triangle: svg('<path d="M12 4 21 20H3Z"/>'),
};
const ROUND = new Set(['cross', 'circle', 'square', 'triangle']);

/** Pad buttons by name: PlayStation's text, Xbox's. */
const PAD_TEXT: Record<string, [string, string]> = {
  cross: ['', 'A'], circle: ['', 'B'], square: ['', 'X'], triangle: ['', 'Y'],
  l1: ['L1', 'LB'], r1: ['R1', 'RB'], l2: ['L2', 'LT'], r2: ['R2', 'RT'],
  ls: ['L-Stick', 'L-Stick'], rs: ['R-Stick', 'R-Stick'], dpad: ['D-Pad', 'D-Pad'], options: ['Options', 'Menu'],
}; // prettier-ignore

/** A pad button, both families. */
export function padGlyph(name: string): string {
  const [ps, xbox] = PAD_TEXT[name] ?? [name, name];
  const klass = ROUND.has(name) ? 'wt-g round' : 'wt-g';
  return `<span class="${klass}" data-glyph="ps">${PS[name] ?? ps}</span><span class="${klass}" data-glyph="xbox">${xbox}</span>`;
}

const keyCap = (label: string) => `<span class="wt-g">${label}</span>`;
const mouseCap = (which: string) =>
  `<span class="wt-g">${svg(`<rect x="6" y="2" width="12" height="20" rx="6" stroke-width="2"/>${which === 'left' ? '<rect x="7" y="3" width="5" height="8" fill="currentColor" stroke="none"/>' : which === 'right' ? '<rect x="12" y="3" width="5" height="8" fill="currentColor" stroke="none"/>' : which === 'both' ? '<rect x="7" y="3" width="10" height="8" fill="currentColor" stroke="none"/>' : ''}`)}</span>`;

/** What a verb looks like on each device. */
export interface Verb {
  pad: string[];
  keys: string[];
  mouse?: string;
}

export const VERBS: Readonly<Record<string, Verb>> = {
  lean: { pad: ['ls'], keys: ['WASD'], mouse: 'move' },
  footL: { pad: ['l2'], keys: ['Q'], mouse: 'left' },
  footR: { pad: ['r2'], keys: ['E'], mouse: 'right' },
  both: { pad: ['l2', 'r2'], keys: ['Space'], mouse: 'both' },
  act: { pad: ['cross'], keys: ['F'] },
  use: { pad: ['cross'], keys: ['E'], mouse: 'left' },
  hop: { pad: ['square'], keys: ['Space'] },
  plan: { pad: ['triangle'], keys: ['Tab'] },
  wave: { pad: ['circle'], keys: ['C'] },
  pause: { pad: ['options'], keys: ['Esc'] },
  ok: { pad: ['cross'], keys: ['Enter'], mouse: 'left' },
  back: { pad: ['circle'], keys: ['Esc'] },
  page: { pad: ['l1', 'r1'], keys: ['Q', 'E'] },
  more: { pad: ['triangle'], keys: ['T'] },
  any: { pad: ['cross'], keys: ['Enter'], mouse: 'left' },
  walk: { pad: ['ls'], keys: ['WASD'] },
  look: { pad: ['rs'], keys: ['Mouse'] },
};

/** One verb's forms as HTML. */
export function glyphs(verb: string): string {
  const v = VERBS[verb];
  const pad = `<span data-for="pad" style="gap:.5vh">${v.pad.map(padGlyph).join('')}</span>`;
  const keys = v.keys.map(keyCap).join('');
  if (!v.mouse) return `${pad}<span data-for="keys mouse" style="gap:.5vh">${keys}</span>`;
  return `${pad}<span data-for="keys" style="gap:.5vh">${keys}</span><span data-for="mouse">${mouseCap(v.mouse)}</span>`;
}

/** A labelled prompt. */
export const prompt = (verb: string, label: string): string =>
  `<span class="wt-prompt">${glyphs(verb)}<span>${label}</span></span>`;

/** A row of prompts in a bar. */
export const promptBar = (items: readonly (readonly [string, string])[]): string =>
  `<div class="wt-bar"><div class="wt-prompts">${items.map(([v, l]) => prompt(v, l)).join('')}</div></div>`;
