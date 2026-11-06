/**
 * @file Button prompts that follow the input used last: PlayStation glyphs (Cross, Circle, Square, Triangle, L1/R1/L2/R2,
 * sticks) or Xbox (A B X Y, LB RB LT RT) as inline SVG for a pad, key caps for the keyboard and a mouse icon with the
 * button lit for the mouse. Never relies on the engine's `input.prompt()` text. Page-side.
 * @example
 * glyph('confirm', 'pad', 'ps'); // '<span class="gl">…</span>'
 */
export type Device = 'pad' | 'keyboard' | 'mouse';
export type GlyphSet = 'ps' | 'xbox';
export interface Prompt {
  pad: string;
  key: string;
  mouse?: string;
}
/** Actions the UI names. `pad` is a PlayStation name; the Xbox set maps it. */
export const PROMPTS: Record<string, Prompt> = {
  confirm: { pad: 'cross', key: 'Enter', mouse: 'left' },
  back: { pad: 'circle', key: 'Esc' },
  use: { pad: 'cross', key: 'E', mouse: 'left' },
  hop: { pad: 'square', key: 'Space' },
  programme: { pad: 'triangle', key: 'Tab' },
  wave: { pad: 'circle', key: 'C' },
  pause: { pad: 'options', key: 'Esc' },
  lean: { pad: 'lstick', key: 'WASD', mouse: 'move' },
  left: { pad: 'l2', key: 'Q', mouse: 'left' },
  right: { pad: 'r2', key: 'E', mouse: 'right' },
  both: { pad: 'l2r2', key: 'Space', mouse: 'both' },
  page: { pad: 'l1r1', key: 'Q E' },
  skip: { pad: 'cross', key: 'F' },
  more: { pad: 'triangle', key: 'T' },
  look: { pad: 'rstick', key: 'Mouse' },
  any: { pad: 'cross', key: 'Any\u00a0key' },
};
const XBOX: Record<string, string> = {
  cross: 'A',
  circle: 'B',
  square: 'X',
  triangle: 'Y',
  l1: 'LB',
  r1: 'RB',
  l2: 'LT',
  r2: 'RT',
  options: '≡',
  lstick: 'L',
  rstick: 'R',
};
const PS_SHAPE: Record<string, string> = {
  cross: '<path d="M7 7l10 10M17 7L7 17" stroke="#6ea8fe" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  circle: '<circle cx="12" cy="12" r="5.2" stroke="#ff6b6b" stroke-width="2.4" fill="none"/>',
  square: '<rect x="7.2" y="7.2" width="9.6" height="9.6" stroke="#e58bd0" stroke-width="2.4" fill="none"/>',
  triangle: '<path d="M12 6.4l5.6 9.6H6.4z" stroke="#4fd1a5" stroke-width="2.4" fill="none" stroke-linejoin="round"/>',
};
const disc = (inner: string, cls = ''): string =>
  `<svg class="gl ${cls}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2a3640"/>${inner}</svg>`;
const pill = (label: string): string => `<span class="gl pill">${label}</span>`;
/** One pad glyph by PlayStation name, in the chosen set. */
export function padGlyph(name: string, set: GlyphSet): string {
  if (name === 'l2r2') return `${padGlyph('l2', set)}${padGlyph('r2', set)}`;
  if (name === 'l1r1') return `${padGlyph('l1', set)}${padGlyph('r1', set)}`;
  if (set === 'xbox') {
    const t = XBOX[name] ?? name;
    const col = { A: '#4fd16a', B: '#ff6b6b', X: '#6ea8fe', Y: '#f5c542' }[t];
    return col
      ? disc(`<text x="12" y="16.5" text-anchor="middle" font-size="13" font-weight="700" fill="${col}">${t}</text>`)
      : pill(t);
  }
  if (PS_SHAPE[name]) return disc(PS_SHAPE[name]);
  const names: Record<string, string> = {
    l1: 'L1',
    r1: 'R1',
    l2: 'L2',
    r2: 'R2',
    options: 'OPT',
    lstick: 'L',
    rstick: 'R',
  };
  return pill(names[name] ?? name);
}
const mouseIcon = (b: string): string =>
  `<svg class="gl mouse" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="6" fill="#2a3640"/><path d="M12 2.5v8" stroke="#8aa" stroke-width="1"/>${b === 'left' || b === 'both' ? '<path d="M6 8.5a6 6 0 0 1 6-6v8H6z" fill="#FF8A70"/>' : ''}${b === 'right' || b === 'both' ? '<path d="M18 8.5a6 6 0 0 0-6-6v8h6z" fill="#FF8A70"/>' : ''}</svg>`;
/** The prompt for `action` as HTML for the device last used. */
export function glyph(action: string, device: Device, set: GlyphSet): string {
  const p = PROMPTS[action];
  if (!p) return pill(action);
  if (device === 'pad') return padGlyph(p.pad, set);
  if (device === 'mouse' && p.mouse) return mouseIcon(p.mouse);
  return p.key
    .split(' ')
    .map((k) => `<span class="gl cap">${k}</span>`)
    .join('');
}
/** Text for a prompt line: "✕ Talk" with glyph HTML. */
export const hint = (action: string, label: string, device: Device, set: GlyphSet): string =>
  `<span class="hint">${glyph(action, device, set)}<b>${label}</b></span>`;
