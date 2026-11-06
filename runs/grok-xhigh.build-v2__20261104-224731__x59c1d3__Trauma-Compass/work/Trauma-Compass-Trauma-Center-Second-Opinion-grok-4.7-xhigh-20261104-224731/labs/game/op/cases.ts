/**
 * @file The eight story operations, plus the session case. Each case adds one rule from the plan: tools, sites,
 * a strain, a gift. Numbers are metres and seconds. Postcards are the patient's own words, one line per rank.
 */
import type { CaseDef } from './types';
import { EARLY_CASES } from './casesEarly';
import { LATE_CASES } from './casesLate';

/** The eight story cases, in order, then the session case. */
export const CASES: readonly CaseDef[] = [...EARLY_CASES, ...LATE_CASES];

/** The case with this id, or a thrown error when the board names a case we do not have. */
export function caseById(id: string): CaseDef {
  const found = CASES.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown case ${id}`);
  return found;
}

/** Story cases, in campaign order. The session case is not one of them. */
export function storyCases(): CaseDef[] {
  return CASES.filter((item) => item.id !== 'case:gala-shift');
}
