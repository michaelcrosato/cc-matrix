/** @file Original hospital melodrama: sixteen skippable scenes, each twelve short voiced beats. */
export const CAST: Record<string, { name: string; color: string; role: string }> = {
  wren: { name: 'DR. WREN TOLLIVER', color: '#59e6cf', role: 'Second-year resident' },
  odie: { name: 'ODALYS “ODIE” FERREIRA', color: '#e4ba75', role: 'Charge nurse' },
  chief: { name: 'DR. BRAM ACHTERBERG', color: '#e4e9e4', role: 'Chief of Surgery' },
  sabine: { name: 'DR. SABINE OYELARAN', color: '#f2a964', role: 'The other doctor' },
  voss: { name: 'DR. LUCAN VOSS', color: '#f4e7bb', role: 'Halcyon Biosciences' },
  patient: { name: 'THE PATIENT', color: '#9ab5d0', role: 'A life, not a case' },
};
export interface Beat {
  who: string;
  text: string;
  act: string;
  drama?: string;
}
export interface Story {
  id: string;
  set: string;
  beats: Beat[];
}

import { before0, after0 } from './episode-1';
import { before1, after1 } from './episode-2';
import { before2, after2 } from './episode-3';
import { before3, after3 } from './episode-4';
import { before4, after4 } from './episode-5';
import { before5, after5 } from './episode-6';
import { before6, after6 } from './episode-7';
import { before7, after7 } from './episode-8';
const before = [before0, before1, before2, before3, before4, before5, before6, before7];
const after = [after0, after1, after2, after3, after4, after5, after6, after7];

const sets = ['ward', 'ward', 'corridor', 'chief', 'ship', 'chief', 'gala', 'or'];
const actions = [
  'adjust-glasses',
  'clipboard-slam',
  'point-accusingly',
  'hands-on-desk',
  'exhale-relief',
  'hand-over-instrument',
  'scrub-hands',
  'mask-up',
  'collar-open',
  'collapse',
  'moustache-rage',
  'tv-host-smile',
  'despair-knees',
  'trumpet-raise',
  'scalpel-salute',
  'double-fist',
];
export function storyFor(index: number, part: 'before' | 'after'): Story {
  const source = (part === 'before' ? before : after)[index] ?? before[0];
  return {
    id: `story:${index}:${part}`,
    set: sets[index] ?? 'or',
    beats: source.map(([who, text], i) => ({
      who,
      text,
      act: actions[(i + index) % actions.length],
      ...((index === 1 && part === 'after' && i === 0) ||
      (index === 7 && i === 8) ||
      (index === 5 && part === 'before' && i === 2)
        ? { drama: text.toUpperCase() }
        : {}),
    })),
  };
}
export function validateStory(s: Story): string[] {
  return [
    ...(s.beats.length < 12 ? ['A scene needs at least twelve beats.'] : []),
    ...s.beats.filter((b) => !CAST[b.who] || !b.text || b.text.length > 180).map((b) => `Invalid beat: ${b.who}`),
  ];
}
