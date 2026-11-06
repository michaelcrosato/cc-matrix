/**
 * @file The sand trays. Each row is a marble and the hole that wants it. The activity only rolls them.
 */

/** One marble and the holes on its tray. */
export interface Tray {
  id: string;
  marbles: readonly { x: number; y: number }[];
  holes: readonly { x: number; y: number }[];
}

/** Five trays, from one marble to three. Coordinates sit in a square from -1 to 1. */
export const TRAYS: readonly Tray[] = [
  { id: 'straight', marbles: [{ x: -0.55, y: 0 }], holes: [{ x: 0.55, y: 0 }] },
  { id: 'diagonal', marbles: [{ x: -0.45, y: -0.4 }], holes: [{ x: 0.45, y: 0.4 }] },
  {
    id: 'pair',
    marbles: [
      { x: -0.5, y: 0.25 },
      { x: -0.5, y: -0.25 },
    ],
    holes: [{ x: 0.5, y: 0 }],
  },
  {
    id: 'split',
    marbles: [
      { x: -0.5, y: 0.35 },
      { x: 0.15, y: -0.5 },
    ],
    holes: [
      { x: 0.45, y: 0.35 },
      { x: 0.15, y: 0.45 },
    ],
  },
  {
    id: 'three',
    marbles: [
      { x: 0, y: -0.55 },
      { x: -0.5, y: 0.1 },
      { x: 0.2, y: 0.45 },
    ],
    holes: [
      { x: 0, y: 0.5 },
      { x: 0.5, y: 0.1 },
      { x: -0.35, y: -0.4 },
    ],
  },
];
