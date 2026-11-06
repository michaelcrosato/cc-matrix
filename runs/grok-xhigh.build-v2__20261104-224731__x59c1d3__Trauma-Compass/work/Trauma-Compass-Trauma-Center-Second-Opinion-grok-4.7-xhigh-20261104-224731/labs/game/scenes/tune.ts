/**
 * @file Settings for `game:main`. Run identity restarts the scene. Balance sliders apply on the next step, and only
 * after the player moves them, so a difficulty's own slip cap is not overwritten by the Resident default.
 */
import { defineSettings } from '../../../engine/sim-api';
import type { Balance } from '../op/types';

/** One live slider and the balance key it writes. */
export interface TuneRow {
  setting: string;
  key: keyof Balance;
  min: number;
  max: number;
  step: number;
  fallback: number;
  label: string;
}

/** The balance rows Dev Mode shows, in order. */
export const TUNE: readonly TuneRow[] = [
  { setting: 'game.vitalsDrain', key: 'vitalsDrain', min: 0, max: 3, step: 0.05, fallback: 1, label: 'Vitals drain' },
  { setting: 'game.bleedRate', key: 'bleed', min: 0, max: 3, step: 0.05, fallback: 1, label: 'Bleeds' },
  { setting: 'game.clock', key: 'clock', min: 0.4, max: 2, step: 0.05, fallback: 1, label: 'Clock' },
  { setting: 'game.slipLimit', key: 'slips', min: 1, max: 20, step: 1, fallback: 5, label: 'Slip limit' },
  { setting: 'game.cursorSpeed', key: 'cursor', min: 2, max: 18, step: 0.5, fallback: 8, label: 'Cursor speed' },
  {
    setting: 'game.cutTolerance',
    key: 'scalpel',
    min: 0.05,
    max: 1,
    step: 0.01,
    fallback: 0.18,
    label: 'Scalpel band',
  },
  { setting: 'game.forcepsPull', key: 'forceps', min: 0.4, max: 3, step: 0.05, fallback: 1.2, label: 'Forceps pull' },
  {
    setting: 'game.stitchSpacing',
    key: 'suture',
    min: 0.2,
    max: 1,
    step: 0.05,
    fallback: 0.45,
    label: 'Suture spacing',
  },
  { setting: 'game.drainRate', key: 'drain', min: 0.2, max: 6, step: 0.1, fallback: 2.4, label: 'Drain rate' },
  { setting: 'game.laserPower', key: 'laser', min: 0.2, max: 4, step: 0.05, fallback: 1.2, label: 'Laser time' },
  { setting: 'game.stabilizer', key: 'syringe', min: 0.5, max: 1, step: 0.01, fallback: 0.85, label: 'Syringe band' },
  { setting: 'game.gelRadius', key: 'gel', min: 0.2, max: 2, step: 0.05, fallback: 0.7, label: 'Gel radius' },
  { setting: 'game.scannerRange', key: 'scanner', min: 1, max: 8, step: 0.1, fallback: 3, label: 'Scanner range' },
  { setting: 'game.giftWindow', key: 'giftWindow', min: 40, max: 300, step: 5, fallback: 140, label: 'Gift window' },
  { setting: 'game.giftTime', key: 'giftTime', min: 0.5, max: 2, step: 0.05, fallback: 1, label: 'Gift duration' },
  { setting: 'game.strainHp', key: 'strainHp', min: 0.25, max: 3, step: 0.05, fallback: 1, label: 'Strain toughness' },
  {
    setting: 'game.strainSpeed',
    key: 'strainSpeed',
    min: 0.25,
    max: 3,
    step: 0.05,
    fallback: 1,
    label: 'Strain speed',
  },
  { setting: 'game.coopHp', key: 'coopHp', min: 0, max: 2, step: 0.05, fallback: 0.6, label: 'Co-op health' },
];

/** Page-side aim assists. They do not enter the operation hash. */
export const FEEL = [
  { setting: 'game.cursorCurve', min: 1, max: 4, step: 0.1, fallback: 2.2, label: 'Stick curve' },
  { setting: 'game.magnet', min: 0, max: 1, step: 0.05, fallback: 0.55, label: 'Magnet' },
  { setting: 'game.railAssist', min: 0, max: 1, step: 0.05, fallback: 0.6, label: 'Rail assist' },
  { setting: 'game.sewAssist', min: 0, max: 2, step: 0.05, fallback: 0.8, label: 'Sew assist' },
  { setting: 'game.radialSlow', min: 0.1, max: 1, step: 0.05, fallback: 0.6, label: 'Radial slow' },
] as const;

const sliderSettings = Object.fromEntries(
  TUNE.map((row) => [
    row.setting,
    {
      type: 'number' as const,
      default: row.fallback,
      minimum: row.min,
      maximum: row.max,
      when: 'now' as const,
      description: `${row.label}. A Dev Mode slider. It applies on the next step.`,
    },
  ]),
);

const feelSettings = Object.fromEntries(
  FEEL.map((row) => [
    row.setting,
    {
      type: 'number' as const,
      default: row.fallback,
      minimum: row.min,
      maximum: row.max,
      when: 'now' as const,
      view: true,
      description: `${row.label}. Cursor feel on the page. It does not change the operation hash.`,
    },
  ]),
);

/** Every setting `game:main` declares. */
export const GAME_SETTINGS = defineSettings({
  'game.run': {
    type: 'string',
    default: 'title',
    when: 'scene',
    description: 'The run: title, story:<id>, or op:<case>. Changing it restarts the scene in place.',
  },
  'game.phase': {
    type: 'integer',
    default: 0,
    minimum: 0,
    maximum: 24,
    when: 'scene',
    description: 'The phase a new operation opens on.',
  },
  'game.seats': {
    type: 'integer',
    default: 1,
    minimum: 1,
    maximum: 4,
    when: 'scene',
    description: 'How many surgeons scrub in.',
  },
  'game.difficulty': {
    type: 'string',
    default: 'resident',
    enum: ['intern', 'resident', 'attending'],
    when: 'scene',
    description: 'Intern, Resident or Attending.',
  },
  'game.attract': {
    type: 'boolean',
    default: false,
    when: 'scene',
    description: 'Attract cheats: no failure, vitals floored, the clock frozen.',
  },
  'game.simple': {
    type: 'boolean',
    default: false,
    when: 'scene',
    description: 'Simple Gift: one press, no beat lock.',
  },
  'game.colleague': {
    type: 'boolean',
    default: false,
    when: 'scene',
    description: 'Force the AI colleague on, for a lone player in a hub round.',
  },
  'game.seed': {
    type: 'integer',
    default: 1,
    minimum: 0,
    maximum: 999999,
    when: 'scene',
    description: 'The operation seed. The engine seed still restarts the scene.',
  },
  'game.autoplay': {
    type: 'boolean',
    default: false,
    when: 'now',
    description: 'The operation plays itself, one fresh bot hand every step. The page uses it to walk the shift.',
  },
  ...sliderSettings,
  ...feelSettings,
});
