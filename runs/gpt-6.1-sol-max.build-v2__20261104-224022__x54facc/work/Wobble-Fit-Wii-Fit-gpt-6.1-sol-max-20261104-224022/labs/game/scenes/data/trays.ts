/** @file Five sand trays: cups, starting marbles, ridges and the open rim. */
export const TRAYS = [
  { starts: [[-0.65, 0.5]], holes: [[0.55, -0.5]], ridges: [], gap: false },
  { starts: [[-0.6, -0.5]], holes: [[0.6, 0.55]], ridges: [[0, -0.5, 0, 0.2]], gap: false },
  {
    starts: [
      [-0.6, 0.6],
      [0.6, 0.6],
    ],
    holes: [
      [-0.5, -0.6],
      [0.5, -0.6],
    ],
    ridges: [[-0.25, 0, 0.25, 0]],
    gap: false,
  },
  {
    starts: [
      [-0.7, -0.6],
      [0.7, 0.5],
    ],
    holes: [
      [0.6, -0.6],
      [-0.6, 0.55],
    ],
    ridges: [[0, -0.4, 0, 0.4]],
    gap: true,
  },
  {
    starts: [
      [-0.65, 0.6],
      [0, 0.65],
      [0.65, 0.6],
    ],
    holes: [
      [-0.6, -0.6],
      [0, -0.55],
      [0.6, -0.6],
    ],
    ridges: [[-0.3, 0, 0.3, 0]],
    gap: true,
  },
];
