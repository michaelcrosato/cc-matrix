/** @file Every network copy starts from identical simulation settings, independent of local saves or developer edits. */
import { MOVEMENT_SETTINGS } from '../../../engine/sim-api';
import { TUNING } from './settings';
export function contractPreset(seats = 1, me = 0): Record<string, unknown> {
  return {
    ...Object.fromEntries(Object.entries(MOVEMENT_SETTINGS).map(([key, f]) => [key, f.default])),
    ...Object.fromEntries(TUNING.map(([key, , value]) => [`game.${key}`, value])),
    ...Object.fromEntries(
      ['god', 'ammo', 'noWear', 'noFever', 'invisible', 'oneShot', 'noclip'].map((key) => [`game.${key}`, false]),
    ),
    'game.mode': 'contract',
    'game.seats': seats,
    'game.me': me,
    'game.merc': 0,
    'game.detail': 0.08,
    'input.sprint': 'toggle',
    'input.crouch': 'hold',
  };
}
