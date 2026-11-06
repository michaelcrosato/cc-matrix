/** @file Live balance controls. The same table builds the developer's sliders and their resets. */
import { defineSettings, type Field } from '../../../engine/sim-api';

export const TUNING = [
  ['move.run', 'Run speed', 4.2, 1, 12, 'Movement'],
  ['move.sprint', 'Sprint speed', 6.4, 2, 20, 'Movement'],
  ['move.crouch', 'Crouch speed', 2, 0.5, 6, 'Movement'],
  ['wear.perShot', 'Wear per shot', 0.0012, 0, 0.04, 'Weapons'],
  ['wear.jamK', 'Jam chance', 1, 0, 10, 'Weapons'],
  ['damage.player', 'Weapon damage', 1, 0.1, 5, 'Weapons'],
  ['damage.enemy', 'Enemy damage', 0.65, 0, 3, 'Enemies'],
  ['ai.accuracy', 'Enemy spread', 3, 0, 15, 'Enemies'],
  ['ai.sight', 'Sight distance', 70, 10, 180, 'Enemies'],
  ['ai.reaction', 'Reaction seconds', 1.8, 0.2, 8, 'Enemies'],
  ['ai.hearing', 'Hearing multiplier', 1, 0, 3, 'Enemies'],
  ['ai.attackers', 'Concurrent attackers', 4, 1, 12, 'Enemies'],
  ['ai.respawnHours', 'Checkpoint return hours', 6, 0.2, 24, 'Enemies'],
  ['fire.spread', 'Fire spread', 1, 0, 8, 'Fire'],
  ['fire.windBias', 'Wind bias', 3, 0, 8, 'Fire'],
  ['fire.burnTime', 'Burn duration', 1, 0.2, 4, 'Fire'],
  ['fire.damage', 'Fire damage per second', 14, 0, 60, 'Fire'],
  ['fire.regrow', 'Regrow game minutes', 180, 1, 720, 'Fire'],
  ['wind.speed', 'Wind metres per second', 5, 0, 15, 'World'],
  ['wind.shiftMinutes', 'Wind shift interval', 4, 0.1, 12, 'World'],
  ['day.minutes', 'Day duration minutes', 24, 2, 120, 'World'],
  ['fever.intervalMin', 'Fever interval minutes', 11, 0.2, 30, 'Survival'],
  ['fever.severity', 'Fever severity', 1, 0.1, 2, 'Survival'],
  ['health.regen', 'Segment regeneration', 6, 0, 20, 'Survival'],
  ['health.syrette', 'Syrette healing', 100, 20, 100, 'Survival'],
  ['car.engine', 'Engine force', 7800, 2000, 18000, 'Vehicles'],
  ['car.grip', 'Tyre grip', 2.2, 0.5, 5, 'Vehicles'],
  ['car.spring', 'Suspension spring', 42000, 12000, 80000, 'Vehicles'],
  ['car.damper', 'Suspension damper', 5200, 1500, 10000, 'Vehicles'],
  ['economy.prices', 'Dealer price multiplier', 1, 0.25, 3, 'Economy'],
  ['economy.pay', 'Contract pay multiplier', 1, 0.5, 3, 'Economy'],
] as const;

const fields: Record<string, Field> = {};
for (const [path, label, value, min, max] of TUNING)
  fields[`game.${path}`] = {
    type: 'number',
    default: value,
    minimum: min,
    maximum: max,
    when: 'now',
    description: label,
  };
for (const key of ['god', 'ammo', 'noWear', 'noFever', 'invisible', 'oneShot', 'noclip'])
  fields[`game.${key}`] = { type: 'boolean', default: false, when: 'now', description: `Developer option: ${key}.` };
Object.assign(fields, {
  'game.mode': {
    type: 'string',
    enum: ['title', 'story', 'attract', 'contract'],
    default: 'title',
    when: 'scene',
    description: 'World mode.',
  },
  'game.seats': {
    type: 'integer',
    default: 1,
    minimum: 1,
    maximum: 4,
    when: 'scene',
    description: 'Number of mercenaries.',
  },
  'game.me': {
    type: 'integer',
    default: 0,
    minimum: -1,
    maximum: 3,
    when: 'scene',
    description: 'Local camera seat; excluded from game digest.',
  },
  'game.merc': {
    type: 'integer',
    default: 0,
    minimum: 0,
    maximum: 3,
    when: 'scene',
    description: 'Selected mercenary.',
  },
  'game.detail': {
    type: 'number',
    default: 1,
    minimum: 0.05,
    maximum: 1,
    when: 'scene',
    description: 'Procedural vegetation density.',
  },
  'game.attract': { type: 'string', enum: ['auto', 'off', 'on'], default: 'auto', description: 'Attract director.' },
});
export const GAME_SETTINGS = defineSettings(fields);
