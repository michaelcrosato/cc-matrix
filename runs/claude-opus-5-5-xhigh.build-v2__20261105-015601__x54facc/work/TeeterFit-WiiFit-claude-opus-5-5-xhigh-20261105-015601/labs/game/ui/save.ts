/**
 * @file The save and the settings, in the page's store (PLAN.md section 5): the sim never reads them; the page hands the sim
 * its starting state through `game.begin`.
 *
 * Game code, a page's.
 *
 * @example
 * // const save = loadSave(store);
 */
import type { Store } from '../../../engine';
import type { Flow } from '../scenes/components';

/** What is kept between sittings. */
export interface SaveData {
  started: boolean;
  day: number;
  done: string[];
  seen: string[];
  pebbles: number;
  found: number[];
  ages: number[];
  bests: Record<string, number>;
  look: number;
  color: string;
  band: boolean;
  finished: boolean;
}

/** What the player has set. */
export interface SettingsData {
  music: number;
  effects: number;
  voices: number;
  glyphs: 'playstation' | 'xbox';
  mouse: number;
  invert: boolean;
  rumble: boolean;
  steadier: boolean;
  reduced: boolean;
  cpuGuests: boolean;
  expert: boolean;
}

/** A fresh save. */
export const NEW_SAVE: SaveData = { started: false, day: 1, done: [], seen: [], pebbles: 0, found: [], ages: [], bests: {}, look: 0, color: 'coral', band: false, finished: false }; // prettier-ignore

/** Fresh settings: music at 10%. */
export const NEW_SETTINGS: SettingsData = { music: 0.1, effects: 1, voices: 1, glyphs: 'playstation', mouse: 1, invert: false, rumble: true, steadier: false, reduced: false, cpuGuests: true, expert: false }; // prettier-ignore

/** Reads the save. */
export const loadSave = (store: Store): SaveData => ({ ...NEW_SAVE, ...store.get<Partial<SaveData>>('save', {}) });
/** Reads the settings. */
export const loadSettings = (store: Store): SettingsData => ({
  ...NEW_SETTINGS,
  ...store.get<Partial<SettingsData>>('settings', {}),
});

/** A save made from the sim's flow. */
export function saveFromFlow(flow: Flow, was: SaveData): SaveData {
  return {
    started: true,
    day: flow.day,
    done: [...flow.done],
    seen: [...flow.seen],
    pebbles: flow.pebbles,
    found: [...flow.found],
    ages: [...flow.ages],
    bests: { ...flow.bests },
    look: flow.look,
    color: flow.color,
    band: was.band,
    finished: was.finished || flow.day > 5,
  };
}
