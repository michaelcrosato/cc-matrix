/**
 * @file The things a Guest can use on the island, as data: stations start an activity, people talk, boards open, plaques
 * read, benches sit. Add a row to add one.
 *
 * Game code, sim-side data.
 *
 * @example
 * USABLES[0].kind; // 'station'
 */
import type { GameWorld } from '../components';
import { castOf } from '../events/kit';
import { PLAQUES } from './plaques';
import { STATIONS } from './stations';

/** A usable thing. */
export interface Usable {
  id: string;
  kind: 'board' | 'platform' | 'station' | 'person' | 'plaque' | 'bench' | 'hut' | 'stone' | 'sign';
  label: string;
  /** Where it is, for those that stay put. */
  x?: number;
  z?: number;
  /** A person's name. */
  who?: string;
  /** Activities a station starts, in the order they are looked for on the Programme. */
  events?: readonly string[];
  /** A plaque's number. */
  plaque?: number;
}

/** The fixed things. */
const FIXED: readonly Usable[] = [
  { id: 'board', kind: 'board', label: 'Read', x: 7, z: 28 },
  { id: 'platform', kind: 'platform', label: 'Step on', x: 0, z: 35, events: ['morning'] },
  { id: 'pavilion', kind: 'station', label: 'Enter', x: STATIONS.pavilion.x, z: STATIONS.pavilion.z + 8, events: ['poseA', 'poseB', 'poseC', 'group'] },
  { id: 'annex', kind: 'station', label: 'Enter', x: STATIONS.annex.x, z: STATIONS.annex.z + 8, events: ['reps', 'step'] },
  { id: 'pondJetty', kind: 'station', label: 'Sit', x: STATIONS.pond.x, z: STATIONS.pond.z + 4, events: ['pond'] },
  { id: 'lagoonHead', kind: 'station', label: 'Begin', x: STATIONS.lagoon.x, z: STATIONS.lagoon.z - 1, events: ['line', 'paddle'] },
  { id: 'garden', kind: 'station', label: 'Begin', x: STATIONS.terrace.x, z: STATIONS.terrace.z + 3, events: ['garden'] },
  { id: 'cliffLip', kind: 'station', label: 'Begin', x: STATIONS.cliff.x, z: STATIONS.cliff.z + 2, events: ['plunge'] },
  { id: 'hoopSpot', kind: 'station', label: 'Begin', x: STATIONS.hoopBeach.x, z: STATIONS.hoopBeach.z, events: ['hoop'] },
  { id: 'jogFlag', kind: 'station', label: 'Begin', x: 12, z: 28, events: ['jog'] },
  { id: 'hut', kind: 'hut', label: 'Sleep', x: STATIONS.huts.x, z: STATIONS.huts.z + 2 },
  { id: 'stone', kind: 'stone', label: 'Do not', x: STATIONS.centre.x, z: STATIONS.centre.z },
  { id: 'bench1', kind: 'bench', label: 'Sit', x: -8, z: 46 },
  { id: 'bench2', kind: 'bench', label: 'Sit', x: 36, z: -34 },
  { id: 'bench3', kind: 'bench', label: 'Sit', x: -48, z: 44 },
  { id: 'sign', kind: 'sign', label: 'Read', x: 6, z: 74 },
  { id: 'tare', kind: 'person', label: 'Talk', who: 'tare' },
  { id: 'plumb', kind: 'person', label: 'Talk', who: 'plumb' },
  { id: 'gerald', kind: 'person', label: 'Talk', who: 'gerald' },
  { id: 'bex', kind: 'person', label: 'Talk', who: 'bex' },
  { id: 'nan', kind: 'person', label: 'Talk', who: 'nan' },
]; // prettier-ignore

/** Every usable: the fixed things, then each plaque. */
export const USABLES: readonly Usable[] = [
  ...FIXED,
  ...PLAQUES.map((_p, i): Usable => ({ id: `plaque${i}`, kind: 'plaque', label: 'Read', plaque: i })),
];

/** Where usable `i` is now, or null when it cannot be used. */
export function usableAt(w: GameWorld, i: number): [number, number] | null {
  const u = USABLES[i];
  if (u.kind === 'person') {
    const c = castOf(w, u.who ?? '');
    const actor = c ? w.get(c.id)?.actor : undefined;
    return actor ? [actor.x, actor.z] : null;
  }
  if (u.kind === 'plaque') {
    const e = w.query('plaque').find((p) => p.plaque.index === u.plaque);
    const prop = e ? w.get(e.plaque.prop)?.sceneProp : undefined;
    return prop ? [prop.x, prop.z] : null;
  }
  return [u.x ?? 0, u.z ?? 0];
}
