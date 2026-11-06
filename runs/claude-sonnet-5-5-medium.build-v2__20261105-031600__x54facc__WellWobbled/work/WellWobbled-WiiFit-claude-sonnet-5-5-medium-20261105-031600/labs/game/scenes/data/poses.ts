/**
 * @file The eight poses as a data table (seat on the disc, rules, which classes teach them). Add a row to add a pose.
 * @example
 * POSES.heron.foot; // 1: the left foot must be held
 */
export interface PoseDef {
  id: string;
  clip: string;
  title: string;
  seat: readonly [number, number];
  seat2?: readonly [number, number];
  inst: number;
  sway: number;
  ring?: number;
  foot: 0 | 1 | 2 | 3;
  breathW: number;
  hold?: number;
  climb?: number;
  line: string;
}
const P = (id: string, clip: string, title: string, seat: [number, number], o: Partial<PoseDef> = {}): PoseDef => ({
  id,
  clip,
  title,
  seat,
  inst: 1,
  sway: 1,
  foot: 0,
  breathW: 0.3,
  line: `plumb.pose.${id}`,
  ...o,
});
export const POSES: Record<string, PoseDef> = {
  nothing: P('nothing', 'Nothing', 'Seated Nothing', [0, 0], { sway: 0.5, breathW: 0.6 }),
  chair: P('chair', 'Chair', 'The Patient Chair', [0, -0.35], { foot: 3, breathW: 0, climb: 1.2 }),
  heron: P('heron', 'Heron', 'The Heron', [0, 0], { foot: 1, inst: 1.5 }),
  archer: P('archer', 'Archer', 'The Archer', [0.35, 0.35], { inst: 1.2 }),
  comma: P('comma', 'Comma', 'The Sideways Comma', [0.5, 0], { seat2: [-0.5, 0], hold: 8 }),
  napkin: P('napkin', 'Napkin', 'The Folded Napkin', [0, 0.5]),
  bridge: P('bridge', 'Bridge', 'The Polite Bridge', [0, 0], { breathW: 0.7 }),
  lighthouse: P('lighthouse', 'Lighthouse', 'The Lighthouse', [0, 0], { ring: 0.14, sway: 1.2 }),
};
/** The three poses of each class. */
export const CLASSES: Record<string, string[]> = {
  poseA: ['nothing', 'chair', 'heron'],
  poseB: ['archer', 'comma', 'napkin'],
  poseC: ['bridge', 'lighthouse', 'heron'],
  poseH: ['heron'],
};
