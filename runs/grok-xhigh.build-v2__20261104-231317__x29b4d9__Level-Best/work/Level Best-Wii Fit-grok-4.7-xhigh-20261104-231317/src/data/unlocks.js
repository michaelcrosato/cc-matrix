import { HATS, PAINTS } from './names.js';

export const MARBLE_GATES = [6, 14, 24, 36, 50, 60];

export function unlockedItems(marbles) {
  return {
    paints: PAINTS.filter((p) => marbles >= p.marbles).map((p) => p.id),
    hats: HATS.filter((h) => marbles >= h.marbles).map((h) => h.id),
  };
}

export function nextUnlock(marbles) {
  const pending = [...PAINTS, ...HATS].filter((item) => item.marbles > marbles);
  pending.sort((a, b) => a.marbles - b.marbles);
  return pending[0] || null;
}
