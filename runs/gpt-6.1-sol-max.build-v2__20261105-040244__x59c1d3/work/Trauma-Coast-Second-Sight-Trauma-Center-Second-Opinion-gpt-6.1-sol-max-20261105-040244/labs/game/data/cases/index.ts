/** @file Case catalogue and designer-data validation. */
import type { Case } from '../types';
import case0 from './first-cut';
import case1 from './quiet-lump';
import case2 from './crosstalk';
import case3 from './it-moves';
import case4 from './struck-off';
import case5 from './reverie';
import case6 from './gala-night';
import case7 from './mercy';
import session from './gala-shift';
export { line, circle } from './helpers';
export const CASES: Case[] = [case0, case1, case2, case3, case4, case5, case6, case7];
export const SESSION: Case = session;

export const allCases = [...CASES, SESSION];
export const getCase = (id: string): Case => allCases.find((c) => c.id === id) ?? CASES[0];
export function validateCase(c: Case): string[] {
  const issues: string[] = [];
  if (!c.phases.length || !c.phases.at(-1)?.close) issues.push(`${c.id}: final phase must close`);
  if (c.seconds < 60 || c.sites.length < 1 || c.sites.length > 3) issues.push(`${c.id}: invalid clock or sites`);
  for (const p of c.phases)
    for (const s of p.spawn) {
      if ((s.site ?? 0) >= c.sites.length) issues.push(`${c.id}/${p.id}: invalid site`);
      if (s.path && s.path.length < 2) issues.push(`${c.id}/${p.id}: short guide`);
    }
  return issues;
}
