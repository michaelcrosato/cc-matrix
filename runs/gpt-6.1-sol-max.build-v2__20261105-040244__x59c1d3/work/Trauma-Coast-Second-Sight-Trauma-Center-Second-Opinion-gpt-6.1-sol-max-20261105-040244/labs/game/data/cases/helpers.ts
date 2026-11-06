/** @file The complete eight-case story and standalone co-op session, authored as phase data. */
import type { Phase, Point, Spawn, TargetKind } from '../types';
export const at = (kind: TargetKind, x: number, z: number, extra: Partial<Spawn> = {}): Spawn => ({
  kind,
  at: [x, z],
  ...extra,
});
export const line = (x: number, z: number, length = 3): Point[] => [
  [x - length / 2, z - 0.2],
  [x, z + 0.15],
  [x + length / 2, z - 0.1],
];
export const circle = (x: number, z: number, r = 1.2): Point[] =>
  Array.from({ length: 25 }, (_, i) => [
    x + Math.cos((i / 24) * Math.PI * 2) * r,
    z + Math.sin((i / 24) * Math.PI * 2) * r,
  ]);
export const wound = (x: number, z: number, site = 0, deep = false): Spawn =>
  at('wound', x, z, { path: line(x, z), site, deep });
export const cut = (x = 0, z = 0, site = 0): Spawn =>
  at('incision', x, z, {
    path: [
      [-3.5 + x, z - 0.6],
      [-2 + x, z - 0.25],
      [x, z + 0.3],
      [2 + x, z + 0.6],
      [3.5 + x, z + 0.4],
    ],
    site,
  });
export const phase = (
  id: string,
  title: string,
  hint: string,
  spawn: Spawn[] = [],
  extra: Partial<Phase> = {},
): Phase => ({ id, title, hint, spawn, ...extra });
export const close = (): Phase =>
  phase('close', 'Close the field', 'Stitch any open wounds, paint Gel over the sutures, and let me dress it.', [], {
    close: true,
  });
export const cards = (a: string, c: string): string[] => [
  c,
  'Home. A little slower, but home. Thank you for staying.',
  a,
  a,
];
