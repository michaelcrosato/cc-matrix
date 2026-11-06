/** @file Accessible player preferences, isolated from deterministic operation balance. */
import type { Difficulty } from '../data/types';
export interface Preferences {
  master: number;
  music: number;
  effects: number;
  voice: number;
  glyphs: 'PlayStation' | 'Xbox';
  freeGift: 'still' | 'pulse';
  difficulty: Difficulty;
  simpleGift: boolean;
  hints: boolean;
  auto: boolean;
  textSpeed: number;
  textSize: number;
  blood: 'red' | 'teal' | 'off';
  flashes: boolean;
  assist: boolean;
  toggleUse: boolean;
  cursorSpeed: number;
}
export const defaultPreferences = (): Preferences => ({
  master: 0.7,
  music: 0.1,
  effects: 1,
  voice: 1,
  glyphs: 'PlayStation',
  freeGift: 'still',
  difficulty: 'Resident',
  simpleGift: false,
  hints: true,
  auto: false,
  textSpeed: 1,
  textSize: 1,
  blood: 'red',
  flashes: true,
  assist: true,
  toggleUse: false,
  cursorSpeed: 13,
});
