/**
 * @file Button edges for the page's own shortcuts (use, Programme, pause, wave, hop). The engine's `input.pressed` reports the last
 * sim sample, which a slow frame can miss, so the page keeps its own: keydown events and gamepad button edges are
 * time-stamped here and consumed once per press. Edges older than the last screen change are dropped, so the key that
 * closed a menu never also uses the thing behind it. Page-side.
 * @example
 * installEdges(); if (consumeEdge('plan')) openProgramme();
 */
type Name = 'use' | 'plan' | 'pause' | 'wave' | 'hop';
const KEYS: Record<Name, string[]> = {
  use: ['KeyE', 'Enter'],
  plan: ['Tab'],
  pause: ['Escape'],
  wave: ['KeyC'],
  hop: ['Space'],
};
const PADS: Record<Name, number> = { use: 0, plan: 3, pause: 9, wave: 1, hop: 2 };
const stamps: Partial<Record<Name, number>> = {};
let since = 0;
let prevPad: boolean[] = [];
/** Keys that are only ever the page's: stop the browser using them (Tab moves focus). */
export function installEdges(): void {
  addEventListener(
    'keydown',
    (e) => {
      for (const n of Object.keys(KEYS) as Name[])
        if (KEYS[n].includes(e.code) && !e.repeat) {
          stamps[n] = performance.now();
          if (e.code === 'Tab') e.preventDefault();
        }
    },
    true,
  );
  addEventListener(
    'mousedown',
    (e) => {
      if (e.button === 0 && !(e.target as HTMLElement | null)?.closest?.('[data-ui]')) stamps.use = performance.now();
    },
    true,
  );
}
/** Call once per frame: records pad edges (Cross, Triangle, Circle, Square, Options; ignores Options while Create is held). */
export function pollPads(): void {
  const pads = navigator.getGamepads?.() ?? [];
  const p = pads.find((x) => x);
  const now = (p?.buttons ?? []).map((b) => b.pressed);
  for (const n of Object.keys(PADS) as Name[]) {
    const i = PADS[n];
    if (now[i] && !prevPad[i] && !(n === 'pause' && now[8])) stamps[n] = performance.now();
  }
  prevPad = now;
}
export function consumeEdge(n: Name): boolean {
  const t = stamps[n];
  if (t === undefined) return false;
  stamps[n] = undefined;
  return t >= since;
}
export function markScreenChange(): void {
  since = performance.now();
}
/** For tests: the pending stamps and the cut-off. */
export const edgeState = (): Record<string, number | undefined> => ({ ...stamps, since });
