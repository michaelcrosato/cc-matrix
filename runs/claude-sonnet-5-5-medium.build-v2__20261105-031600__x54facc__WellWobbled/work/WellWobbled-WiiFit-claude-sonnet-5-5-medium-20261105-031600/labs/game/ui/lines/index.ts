/**
 * @file All spoken and written lines, merged, with `lineText(id, vars, n)` (pools pick by n; {name} slots fill from vars) and a
 * count helper for the "at least 200 lines" test. Page-side.
 * @example
 * lineText('tare.age.first', { age: 61 }); // 'Your Wobble Age is 61. ...'
 */
import { OTHERS } from './others';
import { PLUMB } from './plumb';
import { TARE } from './tare';

export const LINES: Record<string, string | string[]> = { ...TARE, ...PLUMB, ...OTHERS };
export function lineCount(): number {
  return Object.values(LINES).reduce<number>((n, v) => n + (Array.isArray(v) ? v.length : 1), 0);
}
export function lineText(id: string, vars: Record<string, string | number> = {}, n = 0): string {
  const v = LINES[id];
  if (v === undefined) return id;
  const t = Array.isArray(v) ? v[((n % v.length) + v.length) % v.length] : v;
  return t.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''));
}
export const speakerOf = (id: string): string =>
  id.split('.')[0].replace(/^(lure|plaque|notice|evening|result|ui|end)$/, 'tare');
