/** @file Every live balance slider, declared once for engine settings and the developer panel. */
import { defineSettings, type Field } from '../../../engine/sim-api';
export const BALANCE: Record<string, [number, number, number, string]> = {
  vitalsDrain: [1, 0, 3, 'Vitals drain'],
  bleedRate: [1, 0, 3, 'Blood pooling'],
  clock: [1, 0.5, 2, 'Case clock'],
  slipLimit: [5, 1, 20, 'Slip limit'],
  cursorSpeed: [13, 3, 25, 'Cursor speed'],
  cursorCurve: [2.2, 1, 4, 'Stick curve'],
  magnet: [0.55, 0, 1, 'Target magnet'],
  railAssist: [0.6, 0, 1, 'Cutting assist'],
  sewAssist: [0.8, 0, 2, 'Stitch assist'],
  radialSlow: [0.6, 0.1, 1, 'Radial slow'],
  cutTolerance: [1, 0.5, 2, 'Cut tolerance'],
  stitchSpacing: [0.45, 0.2, 1, 'Stitch spacing'],
  drainRate: [1, 0.25, 4, 'Drain power'],
  laserPower: [1, 0.25, 4, 'Laser power'],
  laserHeat: [6, 2, 20, 'Laser heat limit'],
  stabilizer: [18, 5, 50, 'Stabilizer dose'],
  clipSeconds: [8, 2, 30, 'Flap clip time'],
  giftBase: [3, 1, 10, 'Gift duration'],
  giftPerBeat: [1.5, 0, 5, 'Beat bonus'],
  stillRate: [0.25, 0.05, 1, 'Stillpoint rate'],
  pulseHeal: [1.5, 0, 5, 'Second Pulse healing'],
  strainHp: [1, 0.25, 4, 'Parasite health'],
  strainSpeed: [1, 0.25, 3, 'Parasite speed'],
  strainDamage: [1, 0, 3, 'Parasite damage'],
  telegraph: [1, 0.25, 3, 'Telegraph duration'],
  coopHp: [0.6, 0, 2, 'Co-op extra health'],
};
export const defaults = (): Record<string, number> =>
  Object.fromEntries(Object.entries(BALANCE).map(([k, v]) => [k, v[0]]));
const fields: Record<string, Field> = {};
for (const [key, [value, min, max, label]] of Object.entries(BALANCE))
  fields[`game.${key}`] = {
    type: 'number',
    default: value,
    minimum: min,
    maximum: max,
    when: 'now',
    description: label,
  };
Object.assign(fields, {
  'game.run': { type: 'string', default: 'title', when: 'scene', description: 'Title, story or operation run.' },
  'game.giftChoice': {
    type: 'string',
    default: 'case',
    enum: ['case', 'still', 'pulse'],
    when: 'scene',
    description: 'Free Surgery Gift selection.',
  },
  'game.retry': { type: 'boolean', default: false, when: 'scene', description: 'Checkpoint retry caps rank at B.' },
  'game.phase': {
    type: 'integer',
    default: 0,
    minimum: 0,
    maximum: 20,
    when: 'scene',
    description: 'Phase checkpoint.',
  },
  'game.seats': { type: 'integer', default: 1, minimum: 1, maximum: 4, when: 'scene', description: 'Human surgeons.' },
  'game.difficulty': {
    type: 'string',
    default: 'Resident',
    enum: ['Intern', 'Resident', 'Attending'],
    when: 'scene',
    description: 'Difficulty.',
  },
  'game.attract': {
    type: 'boolean',
    default: false,
    when: 'scene',
    description: 'Demo mode disables scores and failure.',
  },
  'game.simpleGift': { type: 'boolean', default: false, when: 'now', description: 'One-press Gift.' },
  'game.freezeVitals': { type: 'boolean', default: false, when: 'now', description: 'Developer vitals lock.' },
  'game.freezeClock': { type: 'boolean', default: false, when: 'now', description: 'Developer clock lock.' },
  'game.infiniteGift': { type: 'boolean', default: false, when: 'now', description: 'Developer Gift supply.' },
  'game.oneHit': { type: 'boolean', default: false, when: 'now', description: 'Developer parasite damage.' },
  'game.autoplay': { type: 'boolean', default: false, when: 'now', description: 'Let the surgeon bot operate.' },
});
export const GAME_SETTINGS = defineSettings(fields);
