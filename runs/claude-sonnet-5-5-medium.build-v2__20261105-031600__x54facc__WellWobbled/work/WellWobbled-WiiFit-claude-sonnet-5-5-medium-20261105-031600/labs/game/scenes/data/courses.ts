/**
 * @file Courses as data: the Paddle Glide buoy circuit, the Island Jog flag ring and the Hoop Patrol sides. Add a row to
 * add a course. All in metres on the island's grid; jitter comes from a seeded stream at setup.
 * @example
 * PADDLE.gates; // 12
 */
export const PADDLE = {
  gates: 12,
  radius: 30,
  centre: [-72, 112] as const,
  wakeGate: 6,
  turtleGate: 8,
  remount: 3,
  seconds: 75,
};
/** The jog's ring: radius at each of 12 headings is found by marching out until the ground drops to the shore. */
export const JOG = { flags: 12, shore: 3.6, seconds: 150, ribbon: 8, geraldSpeed: 3.5 };
export const HOOP = { seconds: 60, every: 8, max: 8, sides: ['left', 'right', 'forward', 'back'] as const };
