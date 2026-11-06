/** @file Original instrument and lighthouse glyphs, drawn in code and shared by toolbar, radial and Handbook. */
const paths = [
  'M12 52 43 21M36 15l10-10 8 8-10 10M10 54l5-14 8 8-13 6',
  'M14 8c0 15 1 25 10 41l5 7M49 8c0 15-1 25-10 41l-5 7M14 8h35',
  'M47 12C14 4 4 32 27 45M27 45l5 11M23 40c19-19 25 5 34 2',
  'M50 9H30v24c0 8-17 5-17 14v10M24 9v22M43 13v13M24 5h31',
  'M12 50l21-24M30 19l14 14 12-12-14-14-12 12M11 40l-5 11 11 5M17 37l10 9',
  'M12 53l12-12M19 32l13 13 19-19-13-13-19 19M34 10l20 20M46 5l13 13M25 28l5 5M31 22l5 5',
  'M20 14h24l-4 35-8 9-8-9-4-35M19 9h26M27 31h10M26 39h12',
  'M31 12a19 19 0 1 0 1 0M32 18v16l11 6M49 48l10 10M28 8h8',
];
export function toolIcon(i: number): string {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="${paths[i] ?? paths[0]}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
export const lighthouse =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 52h20L38 24H26l-4 28ZM25 18h14v7H25zM21 18l11-9 11 9M29 10V5M14 55h36M5 19l13-3M46 16l13 3M29 35h6M28 44h8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>';
export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function button(id: string, label: string, extra = ''): string {
  return `<button data-focus data-action="${id}" ${extra}><span>${label}</span><span class="arrow">↗</span></button>`;
}
