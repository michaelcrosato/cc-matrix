/**
 * @file The retreat save. The sim never reads the store. The page copies this in through game.begin.
 * Outfits stay an empty list. Pebbles are kept and never spent.
 */
import type { Store } from '../../../engine';
import type { Snap } from './snap';

/** What the player turned in Settings. */
export interface Prefs {
  music: number;
  effects: number;
  voices: number;
  icons: 'playstation' | 'xbox';
  assist: number;
  cpu: number;
}

/** One saved week. */
export interface Save {
  day: number;
  cursor: number;
  pebbles: number;
  age: number;
  prior: number;
  credits: number;
  result: number;
  seen: string;
  rank: string;
  bests: Record<string, number>;
  finds: string[];
  outfits: string[];
  settings: Prefs;
}

/** The store key. */
export const SAVE_KEY = 'save';

/** Volumes and switches for a guest who has never saved. */
export function freshPrefs(): Prefs {
  return { music: 0.1, effects: 1, voices: 1, icons: 'playstation', assist: 0, cpu: 1 };
}

/** A week that has not started. */
export function freshSave(): Save {
  return {
    day: 1,
    cursor: 0,
    pebbles: 0,
    age: 0,
    prior: 0,
    credits: 0,
    result: 0,
    seen: '',
    rank: '',
    bests: {},
    finds: [],
    outfits: [],
    settings: freshPrefs(),
  };
}

/** Reads the save, or null when there is none or it is not a save. */
export function readSave(store: Store): Save | null {
  const raw = store.get(SAVE_KEY, null);
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Save>;
  if (typeof row.day !== 'number') return null;
  const base = freshSave();
  return {
    ...base,
    ...row,
    bests: row.bests && typeof row.bests === 'object' ? row.bests : {},
    finds: Array.isArray(row.finds) ? row.finds.filter((id) => typeof id === 'string') : [],
    outfits: [],
    settings: { ...base.settings, ...(row.settings ?? {}) },
  };
}

/** Writes the save. Callers skip this during attract and during a hub session. */
export function writeSave(store: Store, save: Save): void {
  store.set(SAVE_KEY, { ...save, outfits: [] });
}

/** Copies the day, yesterday's age and each found pebble onto the save. A worse result does not replace a best. */
export function noteProgress(save: Save, snap: Snap): Save {
  const next: Save = {
    ...save,
    day: snap.day,
    cursor: snap.cursor,
    pebbles: snap.pebbles,
    age: snap.age,
    prior: snap.prior,
    credits: snap.credits,
    result: snap.result,
    seen: snap.seen,
    rank: snap.rank,
    finds: [...save.finds],
    outfits: [],
  };
  for (const id of snap.finds) {
    if (!next.finds.includes(id)) next.finds.push(id);
  }
  if (snap.mode === 'results' && snap.event) {
    const best = next.bests[snap.event] ?? -1;
    if (snap.result > best) next.bests = { ...next.bests, [snap.event]: snap.result };
  }
  return next;
}
