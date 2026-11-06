/**
 * @file Tunables for the retreat (`game.*`). Every one applies at once (`when: 'now'`) so Dev Mode sliders and
 * replays change the live balance step. Cut activities have no settings here, so their names do not linger.
 */
import { defineSettings } from '../../../engine/sim-api';

/** One slider: the setting path and the range Dev Mode offers. */
export interface Tunable {
  path: string;
  min: number;
  max: number;
  step: number;
}

/** The numeric settings Dev Mode lists, in the order the panel pages through them. */
export const TUNABLES: readonly Tunable[] = [
  { path: 'game.wobble.gain', min: 4, max: 30, step: 0.5 },
  { path: 'game.wobble.instability', min: 0, max: 10, step: 0.1 },
  { path: 'game.wobble.damping', min: 1, max: 12, step: 0.1 },
  { path: 'game.wobble.noise', min: 0, max: 8, step: 0.1 },
  { path: 'game.wobble.noiseRate', min: 0.05, max: 0.4, step: 0.01 },
  { path: 'game.wobble.reach', min: 0.5, max: 1, step: 0.01 },
  { path: 'game.breath.period', min: 4, max: 14, step: 0.1 },
  { path: 'game.breath.calmEffect', min: 0, max: 1, step: 0.01 },
  { path: 'game.age.k', min: 0.5, max: 3, step: 0.05 },
  { path: 'game.pose.hold', min: 4, max: 30, step: 0.5 },
  { path: 'game.pose.ring', min: 0.08, max: 0.45, step: 0.01 },
  { path: 'game.pond.penalty', min: 10, max: 200, step: 5 },
  { path: 'game.line.stepKick', min: 0, max: 1, step: 0.01 },
  { path: 'game.line.gust', min: 0, max: 1.5, step: 0.05 },
  { path: 'game.paddle.speed', min: 1, max: 14, step: 0.1 },
  { path: 'game.garden.tilt', min: 2, max: 25, step: 0.5 },
  { path: 'game.garden.gravity', min: 1, max: 30, step: 0.5 },
  { path: 'game.garden.sink', min: 0.05, max: 4, step: 0.05 },
  { path: 'game.tilt.rate', min: 0, max: 2, step: 0.01 },
  { path: 'game.pebbles.mult', min: 0.2, max: 3, step: 0.1 },
  { path: 'game.mouse.sens', min: 0.0004, max: 0.02, step: 0.0001 },
];

const num = (def: number, min: number, max: number, unit: string, description: string) => ({
  type: 'number' as const,
  default: def,
  minimum: min,
  maximum: max,
  unit,
  when: 'now' as const,
  description,
});

/** Registers every retreat setting. Imported once, from the scenes. */
export const GAME_SETTINGS = defineSettings({
  'game.wobble.gain': num(14, 4, 30, '1/s^2', 'How fast weight follows the thumb.'),
  'game.wobble.instability': num(3, 0, 10, '1/s^2', 'How hard the body falls away from the centre.'),
  'game.wobble.damping': num(5, 1, 12, '1/s', 'How heavy the body feels.'),
  'game.wobble.noise': num(3.5, 0, 8, '1/s^2', 'Sway strength.'),
  'game.wobble.noiseRate': num(0.15, 0.05, 0.4, 'Hz', 'Sway speed. Kept slow so a late thumb can lean against it.'),
  'game.wobble.reach': num(0.9, 0.5, 1, '1', 'Full stick target. A held full stick topples on purpose.'),
  'game.breath.period': num(8, 4, 14, 's', 'One breath: half in, half out.'),
  'game.breath.calmEffect': num(0.5, 0, 1, '1', 'How much full calm quiets the sway.'),
  'game.age.k': num(1.3, 0.5, 3, '1', 'How sharply Wobble Age falls as the morning check improves.'),
  'game.pose.hold': num(12, 4, 30, 's', 'How long a pose is held.'),
  'game.pose.ring': num(0.2, 0.08, 0.45, '1', 'The seat ring a pose is held inside.'),
  'game.pond.penalty': num(80, 10, 200, '1', 'Composure lost when the pond is disturbed.'),
  'game.line.stepKick': num(0.35, 0, 1, '1', 'Sideways kick of one step on the line.'),
  'game.line.gust': num(0.55, 0, 1.5, '1', 'How hard a gust shoves the line.'),
  'game.paddle.speed': num(6, 1, 14, 'm/s', 'Board speed at a full forward lean.'),
  'game.garden.tilt': num(12, 2, 25, 'deg', 'How far a full lean tilts a tray.'),
  'game.garden.gravity': num(9, 1, 30, 'm/s^2', 'How fast marbles run downhill.'),
  'game.garden.sink': num(1.2, 0.05, 4, 'm/s', 'A marble slower than this is caught by a hole.'),
  'game.tilt.rate': num(0.15, 0, 2, 'deg/s', 'How fast the storm leans the island before a deed takes some off.'),
  'game.pebbles.mult': num(1, 0.2, 3, '1', 'Scales pebbles earned from a rank.'),
  'game.mouse.sens': num(0.0025, 0.0004, 0.02, '1/px', 'How far pointer movement leans.'),
  'game.assist': num(0, 0, 1, '1', 'Steadier hands. One halves the sway.'),
  'game.cpu': num(1, 0, 1, '1', 'Empty Group Class seats take a CPU guest when this is 1.'),
  'game.auto': {
    type: 'string',
    default: 'off',
    when: 'now',
    description: 'Who drives. off waits for the player. director walks the programme. attract loops a demo.',
  },
});
