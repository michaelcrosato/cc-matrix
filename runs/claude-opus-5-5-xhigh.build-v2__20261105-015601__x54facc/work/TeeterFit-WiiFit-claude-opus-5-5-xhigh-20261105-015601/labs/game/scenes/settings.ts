/**
 * @file Teeter Fit's tunable numbers: every `game.*` setting the dev panel exposes as a live slider, plus the switches
 * the director and tests use. All are sim settings read every step (`when: 'now'`), so a change plays at once and
 * replays hold it. `SLIDER_GROUPS` names which settings the dev panel shows, in which group.
 *
 * Game code, sim-side: it imports only engine/sim-api.ts.
 *
 * @example
 * // w.settings.get<number>('game.wobble.gain'); // 14
 * @see labs/game/scenes/wobble.test.ts
 */
import { defineSettings } from '../../../engine/sim-api';

/** A number setting, live. */
const num = (value: number, minimum: number, maximum: number, unit: string, description: string) =>
  ({ type: 'number', default: value, minimum, maximum, unit, when: 'now', description }) as const;

/** The settings (see the file comment). */
export const GAME_SETTINGS = defineSettings({
  'game.wobble.gain': num(14, 4, 30, '1/s2', 'How fast your weight follows your thumb.'),
  'game.wobble.instability': num(3, 0, 10, '1/s2', 'How hard you fall away from the centre.'),
  'game.wobble.damping': num(5, 1, 12, '1/s', 'How heavy the body feels.'),
  'game.wobble.noise': num(3.5, 0, 8, '1/s2', 'Sway strength.'),
  'game.wobble.noiseRate': num(0.15, 0.05, 0.4, 'Hz', 'Sway speed: a slow push you lean against.'),
  'game.wobble.reach': num(0.9, 0.5, 1, '', "Full stick's target; a held full stick topples, on purpose."),
  'game.breath.period': num(8, 4, 14, 's', 'One breath, half in, half out.'),
  'game.breath.calmEffect': num(0.5, 0, 1, '', 'How much full calm quiets the sway.'),
  'game.age.k': num(1.3, 0.5, 3, '', 'The Wobble Age curve.'),
  'game.pebbles.mult': num(1, 0, 5, '', 'Pebbles earned, multiplied.'),
  'game.pose.hold': num(12, 4, 30, 's', 'How long a pose is held.'),
  'game.pose.ring': num(0.2, 0.08, 0.4, '', 'The seat ring of a pose.'),
  'game.reps.tempo': num(3, 1.5, 6, 's', 'Seconds for one rep.'),
  'game.step.bpm': num(1, 0.5, 1.5, 'x', 'Scales the tempo of every Step Class phrase.'),
  'game.step.perfect': num(3, 1, 8, 'steps', 'The Perfect window, either side.'),
  'game.step.good': num(7, 3, 16, 'steps', 'The Good window, either side.'),
  'game.pond.penalty': num(80, 10, 200, '', 'Composure lost each time you move.'),
  'game.line.stepKick': num(0.35, 0, 1, '', 'How hard each step kicks you sideways.'),
  'game.line.gust': num(1.2, 0, 3, '', 'How hard the gusts push.'),
  'game.paddle.speed': num(6, 2, 12, 'm/s', 'Board speed at full forward lean.'),
  'game.garden.tilt': num(12, 4, 24, 'deg', 'The most the tray tilts.'),
  'game.garden.gravity': num(9, 2, 20, 'm/s2', 'How hard marbles roll downhill.'),
  'game.garden.sink': num(1.6, 0.4, 4, 'm/s', 'Below this speed a hole catches a marble.'),
  'game.dive.spin': num(9, 3, 16, 'rad/s', 'Full lean, spin speed in the air.'),
  'game.hoop.bandMin': num(5, 2, 8, 'rad/s', 'Slowest spin that keeps hoops up.'),
  'game.hoop.bandMax': num(9, 6, 18, 'rad/s', 'Fastest spin that keeps hoops up.'),
  'game.jog.speed': num(4.6, 2, 9, 'm/s', 'Island Jog speed.'),
  'game.tilt.rate': num(0.03, 0, 0.2, 'deg/s', 'How fast the Great Tilt grows.'),
  'game.auto': { type: 'boolean', default: false, when: 'now', description: 'The bot plays seat 0.' },
  'game.botSeat': {
    type: 'boolean',
    default: false,
    when: 'now',
    description: 'The bot plays seat 0, and the director stays out of it.',
  },
  'game.skill': {
    type: 'string',
    enum: ['perfect', 'human', 'sloppy', 'idle', 'mash'],
    default: 'perfect',
    when: 'now',
    description: 'Which of the test players the bot is.',
  },
  'game.noTopple': { type: 'boolean', default: false, when: 'now', description: 'Nobody topples.' },
  'game.assist': { type: 'boolean', default: false, when: 'now', description: 'Steadier Hands: halves the sway.' },
  'game.expert': { type: 'boolean', default: false, when: 'now', description: 'Expert: a smaller ring and more sway.' },
});

/** The dev panel's slider groups: each a title and its settings, in order. */
export const SLIDER_GROUPS: readonly { title: string; paths: readonly string[] }[] = [
  {
    title: 'Wobble',
    paths: [
      'game.wobble.gain',
      'game.wobble.instability',
      'game.wobble.damping',
      'game.wobble.noise',
      'game.wobble.noiseRate',
      'game.wobble.reach',
    ],
  },
  { title: 'Breath & age', paths: ['game.breath.period', 'game.breath.calmEffect', 'game.age.k', 'game.pebbles.mult'] },
  { title: 'Pose & reps', paths: ['game.pose.hold', 'game.pose.ring', 'game.reps.tempo', 'game.pond.penalty'] },
  { title: 'Step', paths: ['game.step.bpm', 'game.step.perfect', 'game.step.good'] },
  { title: 'Water', paths: ['game.line.stepKick', 'game.line.gust', 'game.paddle.speed', 'game.dive.spin'] },
  {
    title: 'Sand & hoops',
    paths: ['game.garden.tilt', 'game.garden.gravity', 'game.garden.sink', 'game.hoop.bandMin', 'game.hoop.bandMax'],
  },
  { title: 'Jog & tilt', paths: ['game.jog.speed', 'game.tilt.rate'] },
];
