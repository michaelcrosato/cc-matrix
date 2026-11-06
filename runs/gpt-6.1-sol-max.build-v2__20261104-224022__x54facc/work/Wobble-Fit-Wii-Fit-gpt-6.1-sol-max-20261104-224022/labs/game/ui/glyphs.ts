/** @file Explicit PlayStation and Xbox prompts, plus native keyboard and mouse labels. */
export const KEY_LABELS: Record<string, string> = { left: 'Q', right: 'E' };
export type Device = 'keyboard' | 'mouse' | 'pad';
const svg = (inside: string) => `<svg viewBox="0 0 32 32" aria-hidden="true">${inside}</svg>`;
const shapes: Record<string, string> = {
  accept: '<path d="m10 10 12 12m0-12L10 22"/>',
  back: '<circle cx="16" cy="16" r="8"/>',
  plan: '<path d="m16 7 10 17H6Z"/>',
  hop: '<path d="M8 8h16v16H8Z"/>',
};
export function glyph(action: string, device: Device, xbox = false): string {
  let text = '';
  if (device === 'pad') {
    if (shapes[action])
      return `<span data-glyph="${action}" class="glyph pad-glyph">${xbox ? ({ accept: 'A', back: 'B', plan: 'Y', hop: 'X' } as Record<string, string>)[action] : svg(shapes[action])}</span>`;
    text =
      KEY_LABELS[action] ??
      ({ lean: 'L', left: xbox ? 'LT' : 'L2', right: xbox ? 'RT' : 'R2', pause: '≡' } as Record<string, string>)[
        action
      ] ??
      action;
  } else if (device === 'mouse' && ['accept', 'left', 'right', 'lean'].includes(action)) {
    const side = action === 'right' ? 'M17 3h1a7 7 0 0 1 7 7v5h-8Z' : 'M14 3h-1a7 7 0 0 0-7 7v5h8Z';
    return `<span data-glyph="${action}" class="glyph mouse-glyph">${svg(`<rect x="6" y="3" width="19" height="27" rx="9"/><path class="mouse-fill" d="${side}"/>`)}</span>`;
  } else
    text =
      KEY_LABELS[action] ??
      (
        {
          accept: 'Enter',
          back: 'Esc',
          plan: 'Tab',
          hop: 'Space',
          lean: 'WASD',
          left: 'Q',
          right: 'E',
          pause: 'Esc',
        } as Record<string, string>
      )[action] ??
      action;
  return `<span data-glyph="${action}" class="glyph${device === 'pad' ? ' pad-glyph' : ''}">${text}</span>`;
}
export const safe = (text: unknown): string =>
  String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const LEAF =
  '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 40V23M24 29C7 30 6 15 6 10c12 0 20 5 18 19ZM24 22C23 9 33 6 42 6c1 11-6 18-18 16Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>';
