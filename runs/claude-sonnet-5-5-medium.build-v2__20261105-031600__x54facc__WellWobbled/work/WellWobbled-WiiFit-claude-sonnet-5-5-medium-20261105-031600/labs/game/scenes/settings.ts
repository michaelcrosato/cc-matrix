/**
 * @file Every tunable number of the game as live settings (`game.*`), one table. The dev panel builds its sliders from
 * `TUNABLES` (group, label, range), the sim reads them with `w.settings.get`. All are `when: 'now'` so a slider applies
 * at once and replays record it. Sim-side: imports only engine/sim-api.ts.
 */
import { defineSettings } from '../../../engine/sim-api';

/** One tunable: path, default, range, group and a short label for the dev panel. */
export interface Tunable {
  readonly path: string;
  readonly def: number;
  readonly min: number;
  readonly max: number;
  readonly group: string;
  readonly label: string;
}

const t = (path: string, def: number, min: number, max: number, group: string, label: string): Tunable => ({ path, def, min, max, group, label }); // prettier-ignore

/** The tunables, in panel order. */
export const TUNABLES: readonly Tunable[] = [
  t('game.wobble.gain', 14, 4, 30, 'Wobble', 'Gain: how fast weight follows thumb'),
  t('game.wobble.instability', 3, 0, 10, 'Wobble', 'Instability: fall from centre'),
  t('game.wobble.damping', 5, 1, 12, 'Wobble', 'Damping: heaviness'),
  t('game.wobble.noise', 3.5, 0, 8, 'Wobble', 'Sway strength'),
  t('game.wobble.noiseRate', 0.15, 0.05, 0.4, 'Wobble', 'Sway speed (Hz)'),
  t('game.wobble.reach', 0.9, 0.5, 1, 'Wobble', 'Reach of a full stick'),
  t('game.breath.period', 8, 4, 14, 'Breath', 'Breath period (s)'),
  t('game.breath.calmEffect', 0.5, 0, 1, 'Breath', 'Calm quiets sway'),
  t('game.pose.hold', 12, 4, 30, 'Pose', 'Hold time (s)'),
  t('game.pose.ring', 0.2, 0.08, 0.4, 'Pose', 'Seat ring radius'),
  t('game.reps.tempo', 3, 1.5, 6, 'Reps', 'Seconds per rep'),
  t('game.step.bpm', 1, 0.6, 1.4, 'Step', 'Tempo scale'),
  t('game.step.perfect', 3, 1, 8, 'Step', 'Perfect window (steps)'),
  t('game.step.good', 7, 3, 16, 'Step', 'Good window (steps)'),
  t('game.pond.penalty', 80, 10, 300, 'Pond', 'Composure lost per move'),
  t('game.line.stepKick', 0.35, 0, 1, 'Line', 'Sideways kick per step'),
  t('game.line.gust', 0.6, 0, 2, 'Line', 'Gust strength'),
  t('game.paddle.speed', 6, 2, 12, 'Paddle', 'Speed (m/s)'),
  t('game.garden.tilt', 12, 4, 25, 'Garden', 'Max tilt (deg)'),
  t('game.garden.gravity', 9, 2, 20, 'Garden', 'Marble gravity'),
  t('game.garden.sink', 1.4, 0.4, 4, 'Garden', 'Hole catch speed'),
  t('game.hoop.bandMin', 5, 2, 8, 'Hoop', 'Spin band min (rad/s)'),
  t('game.hoop.bandMax', 9, 6, 14, 'Hoop', 'Spin band max (rad/s)'),
  t('game.tilt.rate', 0.08, 0, 0.4, 'Tilt', 'Tilt growth (deg/s)'),
  t('game.age.k', 1.3, 0.6, 2.5, 'Age', 'Wobble Age curve'),
  t('game.pebbles.mult', 1, 0, 5, 'Age', 'Pebble multiplier'),
  t('game.assist', 0, 0, 1, 'Assist', 'Steadier Hands (1 halves sway)'),
];

/** Registers the settings. */
export const GAME_SETTINGS = defineSettings({
  ...Object.fromEntries(
    TUNABLES.map((x) => [
      x.path,
      { type: 'number', default: x.def, minimum: x.min, maximum: x.max, when: 'now', description: x.label },
    ]),
  ),
  'game.lite': {
    type: 'boolean',
    default: false,
    when: 'scene',
    description: 'Tests: a flat ground and a bare guest, no dressing or cast, for fast headless runs.',
  },
  'game.auto': {
    type: 'boolean',
    default: false,
    when: 'now',
    description: 'Attract/auto mode: the bot plays for the guest.',
  },
  'game.noTopple': { type: 'boolean', default: false, when: 'now', description: 'Dev cheat: the guest never topples.' },
  'game.expert': {
    type: 'boolean',
    default: false,
    when: 'now',
    description: 'Expert variants: smaller rings, more sway.',
  },
} as never);

/** Reads a numeric tunable. */
export function num(w: { settings: { get<T>(k: string): T } }, path: string): number {
  return w.settings.get<number>(path);
}
