/**
 * @file Prompts drawn as SVG, so a PlayStation pad, an Xbox pad, a key and a mouse each look like themselves.
 * Unknown pads use the PlayStation shapes until Settings says otherwise.
 */

/** A small inline icon. The markup is ours, never a player's name. */
function svg(body: string): string {
  return `<svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true">${body}</svg>`;
}

/** PlayStation face shapes, or the Xbox letters when `xbox` is set. */
export function faceGlyph(which: 'south' | 'east' | 'west' | 'north', xbox: boolean): string {
  if (xbox) {
    const letter = { south: 'A', east: 'B', west: 'X', north: 'Y' }[which];
    return svg(
      `<circle cx="32" cy="32" r="26" fill="none" stroke="#f4f1ea" stroke-width="4"/><text x="32" y="42" text-anchor="middle" font-size="32" fill="#f4f1ea" font-family="sans-serif">${letter}</text>`,
    );
  }
  const shape = {
    south: '<path d="M32 8 56 32 32 56 8 32Z" fill="none" stroke="#f4f1ea" stroke-width="4"/>',
    east: '<circle cx="32" cy="32" r="22" fill="none" stroke="#f4f1ea" stroke-width="4"/>',
    west: '<rect x="12" y="12" width="40" height="40" fill="none" stroke="#f4f1ea" stroke-width="4"/>',
    north:
      '<path d="M32 8 38 26 56 26 42 38 48 56 32 44 16 56 22 38 8 26 26 26Z" fill="none" stroke="#f4f1ea" stroke-width="3"/>',
  }[which];
  return svg(shape);
}

/** A keycap with a short label. */
export function keyGlyph(label: string): string {
  return svg(
    `<rect x="6" y="10" width="52" height="44" rx="8" fill="none" stroke="#f4f1ea" stroke-width="4"/><text x="32" y="40" text-anchor="middle" font-size="22" fill="#f4f1ea" font-family="sans-serif">${label}</text>`,
  );
}

/** A mouse with one button marked. */
export function mouseGlyph(which: 'left' | 'right' | 'wheel'): string {
  const mark =
    which === 'left'
      ? '<path d="M18 16 h14 v20 h-14z" fill="#f4f1ea"/>'
      : which === 'right'
        ? '<path d="M32 16 h14 v20 h-14z" fill="#f4f1ea"/>'
        : '<rect x="29" y="18" width="6" height="16" fill="#f4f1ea"/>';
  return svg(
    `<rect x="14" y="8" width="36" height="48" rx="16" fill="none" stroke="#f4f1ea" stroke-width="4"/>${mark}`,
  );
}

/** The use prompt for the device that spoke last. */
export function usePrompt(device: string, xbox: boolean): string {
  if (device === 'mouse') return `${mouseGlyph('left')} Use`;
  if (device === 'keyboard') return `${keyGlyph('Enter')} Use`;
  return `${faceGlyph('south', xbox)} Use`;
}
