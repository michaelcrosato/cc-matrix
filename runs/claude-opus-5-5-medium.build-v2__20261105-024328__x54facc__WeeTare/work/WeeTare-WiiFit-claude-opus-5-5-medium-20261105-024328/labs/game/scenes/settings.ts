/**
 * @file Every tunable number of Wee Tare as sim settings (`game.*`): the Wobble Model's, the breath's, and each
 * activity's. All are `when: 'now'`, so the dev panel's sliders change play at once and replays hold them. Each carries
 * its range, which the dev panel reads back through `inspector.describe('setting', path)`.
 */
import { defineSettings } from '../../../engine/sim-api';

/** One number setting. */
const num = (fallback: number, minimum: number, maximum: number, description: string, unit?: string) =>
  ({
    type: 'number',
    default: fallback,
    minimum,
    maximum,
    when: 'now',
    description,
    ...(unit ? { unit } : {}),
  }) as const;

/** Every numeric `game.*` setting, grouped by the first word after `game.` (the dev panel's groups). */
export const GAME_NUMBERS = {
  'game.wobble.gain': num(14, 4, 30, 'How fast your weight follows your thumb.', '1/s2'),
  'game.wobble.instability': num(3, 0, 10, 'How hard you fall away from the centre.', '1/s2'),
  'game.wobble.damping': num(5, 1, 12, 'How heavy the body feels.', '1/s'),
  'game.wobble.noise': num(3.5, 0, 8, 'Sway strength.', '1/s2'),
  'game.wobble.noiseRate': num(0.15, 0.05, 0.4, 'Sway speed: a slow push you lean against.', 'Hz'),
  'game.wobble.reach': num(0.9, 0.5, 1, 'Full stick’s target; a held full stick topples, on purpose.'),
  'game.breath.period': num(8, 4, 14, 'One breath, half in, half out.', 's'),
  'game.breath.calmEffect': num(0.5, 0, 1, 'How much full calm quiets the sway.'),
  'game.age.k': num(1.3, 0.5, 3, 'The Wobble Age curve.'),
  'game.pose.hold': num(12, 4, 30, 'How long a pose is held.', 's'),
  'game.pose.ring': num(0.2, 0.08, 0.4, 'The size of a pose’s ring.'),
  'game.reps.tempo': num(3, 1.5, 6, 'Seconds a rep.', 's'),
  'game.step.bpm': num(1, 0.5, 1.5, 'Scales every Step Class tempo.'),
  'game.step.perfect': num(3, 1, 8, 'The Perfect window, in steps either side.'),
  'game.step.good': num(7, 3, 14, 'The Good window, in steps either side.'),
  'game.pond.penalty': num(80, 10, 300, 'Composure lost each time you move.'),
  'game.line.stepKick': num(0.35, 0, 1, 'How hard each step kicks you sideways.'),
  'game.line.gust': num(2, 0, 4, 'The strength of a gust.'),
  'game.paddle.speed': num(6, 2, 12, 'The board’s top speed.', 'm/s'),
  'game.garden.tilt': num(12, 4, 25, 'The tray’s greatest tilt.', 'deg'),
  'game.garden.gravity': num(9, 2, 20, 'How hard a slope pulls a marble.', 'm/s2'),
  'game.garden.sink': num(1.6, 0.4, 4, 'A hole catches a marble below this speed.', 'm/s'),
  'game.hoop.bandMin': num(5, 2, 8, 'Slowest spin that keeps hoops up.', 'rad/s'),
  'game.hoop.bandMax': num(9, 7, 16, 'Fastest spin that keeps hoops up.', 'rad/s'),
  'game.tilt.rate': num(0.03, 0, 0.2, 'How fast the island tips in the storm.', 'deg/s'),
  'game.pebbles.mult': num(1, 0, 5, 'Multiplies the pebbles earned.'),
} as const;

export const GAME_SETTINGS = defineSettings(GAME_NUMBERS);

/** What a sim module reads a number through: settings are looked up by path. */
export const gameNumber = (w: unknown, path: keyof typeof GAME_NUMBERS): number =>
  (w as { settings: { get(path: string): number } }).settings.get(path);
