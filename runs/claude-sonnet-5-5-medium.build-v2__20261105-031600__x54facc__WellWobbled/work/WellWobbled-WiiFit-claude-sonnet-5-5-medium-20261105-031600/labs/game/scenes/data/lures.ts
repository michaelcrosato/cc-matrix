/**
 * @file Still Pond's lures as data, escalating: the table the pond draws from (seeded) every 6 to 10 s. The page turns
 * `kind` into what is shown ("PRESS NOW", a fake pause menu, the credits…); the sim only needs the order and the length.
 * @example
 * LURES[0].kind; // 'press'
 */
export interface Lure {
  kind: string;
  seconds: number;
  line: string;
}
export const LURES: readonly Lure[] = [
  { kind: 'press', seconds: 3, line: 'lure.press' },
  { kind: 'tare', seconds: 3, line: 'lure.tare' },
  { kind: 'stone', seconds: 3, line: 'lure.stone' },
  { kind: 'frog', seconds: 4, line: 'lure.frog' },
  { kind: 'gull', seconds: 4, line: 'lure.gull' },
  { kind: 'pause', seconds: 4, line: 'lure.pause' },
  { kind: 'pad', seconds: 4, line: 'lure.pad' },
  { kind: 'plumb', seconds: 4, line: 'lure.plumb' },
  { kind: 'credits', seconds: 5, line: 'lure.credits' },
];
