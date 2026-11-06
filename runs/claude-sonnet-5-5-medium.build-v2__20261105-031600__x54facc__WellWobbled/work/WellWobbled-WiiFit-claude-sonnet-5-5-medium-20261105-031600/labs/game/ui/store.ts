/**
 * @file The page's save and settings: one `createStore` with a prefix of its own. The sim never reads it; the page hands the
 * sim its starting state through scene actions. Holds the day, done list, ages, pebbles, finds, outfit, bests and the
 * settings (music 10% by default). Page-side.
 * @example
 * const s = loadSave(store); s.day; // 1
 */
import { createStore, type Store } from '../../../engine';

export interface Save {
  day: number;
  done: string[];
  ages: number[];
  pebbles: number;
  finds: number[];
  plaques: number[];
  look: number;
  colour: number;
  bests: Record<string, number>;
  met: string[];
  started: boolean;
  finished: boolean;
  checkDay: number;
}
export interface Settings {
  music: number;
  effects: number;
  voices: number;
  glyphs: 'ps' | 'xbox';
  mouse: number;
  invertLook: boolean;
  rumble: boolean;
  steady: boolean;
  reduced: boolean;
  cpu: boolean;
  expert: boolean;
  colour: number;
}
export const DEFAULT_SAVE: Save = { day: 1, done: [], ages: [], pebbles: 0, finds: [], plaques: [], look: 0, colour: 0, bests: {}, met: [], started: false, finished: false, checkDay: 0 }; // prettier-ignore
export const DEFAULT_SETTINGS: Settings = { music: 0.1, effects: 0.8, voices: 0.7, glyphs: 'ps', mouse: 1, invertLook: false, rumble: true, steady: false, reduced: false, cpu: true, expert: false, colour: 0 }; // prettier-ignore
export function makeStore(mode: 'play' | 'demo' | 'sandbox' = 'play'): Store {
  return createStore({ prefix: 'well-wobbled:', mode } as never);
}
export const loadSave = (s: Store): Save => ({ ...DEFAULT_SAVE, ...(s.get<Save | null>('save', null) ?? {}) });
export const writeSave = (s: Store, v: Save): void => {
  s.set('save', v);
};
export const loadSettings = (s: Store): Settings => ({
  ...DEFAULT_SETTINGS,
  ...(s.get<Settings | null>('settings', null) ?? {}),
});
export const writeSettings = (s: Store, v: Settings): void => {
  s.set('settings', v);
};
