/**
 * @file The Settings screens' rows and choices as pure functions: `settingsRows(group, settings)` gives a group's menu rows (Sound,
 * Play, Display) and `choose(id, settings)` applies one pick (a slider steps, a toggle flips, glyphs switch between
 * PlayStation and Xbox). Page-side.
 * @example
 * settingsRows('sound', DEFAULT_SETTINGS)[0].label; // 'Music 10%'
 */
import type { Row } from './screens';
import type { Settings } from './store';

export const COLOURS = ['mint', 'coral', 'sky', 'slate', 'lilac', 'gold and a headband'];
const pct = (v: number): string => `${Math.round(v * 100)}%`;
const onOff = (v: boolean): string => (v ? 'on' : 'off');
export const TITLES: Record<string, string> = { sound: 'Sound', play: 'Play', display: 'Display' };
export const ORDER = [
  'music',
  'effects',
  'voices',
  'glyphs',
  'mouse',
  'rumble',
  'steady',
  'cpu',
  'expert',
  'colour',
  'reduced',
  'invert',
  'fullscreen',
];
export function settingsRows(group: string, s: Settings): Row[] {
  const back: Row = { label: 'Back', id: 'back' };
  if (group === 'sound')
    return [
      { label: `Music ${pct(s.music)}`, id: 'music' },
      { label: `Effects ${pct(s.effects)}`, id: 'effects' },
      { label: `Voices ${pct(s.voices)}`, id: 'voices' },
      back,
    ];
  if (group === 'play') return [{ label: `Button icons: ${s.glyphs === 'ps' ? 'PlayStation' : 'Xbox'}`, id: 'glyphs' }, { label: `Mouse sensitivity ${s.mouse.toFixed(1)}`, id: 'mouse' }, { label: `Rumble: ${onOff(s.rumble)}`, id: 'rumble' }, { label: `Steadier Hands: ${onOff(s.steady)}`, id: 'steady' }, { label: `CPU guests: ${onOff(s.cpu)}`, id: 'cpu' }, { label: `Tracksuit: ${COLOURS[s.colour] ?? COLOURS[0]} (20 and 30 pebbles unlock more)`, id: 'colour' },
      { label: `Expert (10 pebbles): ${onOff(s.expert)}`, id: 'expert' }, back]; // prettier-ignore
  return [
    { label: `Reduced Motion: ${onOff(s.reduced)}`, id: 'reduced' },
    { label: `Invert look: ${onOff(s.invertLook)}`, id: 'invert' },
    { label: 'Fullscreen', id: 'fullscreen' },
    back,
  ];
}
const step = (v: number): number => (v >= 0.99 ? 0 : Math.round((v + 0.1) * 100) / 100);
/** Applies one pick to the settings. */
export function choose(id: string, s: Settings): void {
  if (id === 'music') s.music = step(s.music);
  else if (id === 'effects') s.effects = step(s.effects);
  else if (id === 'voices') s.voices = step(s.voices);
  else if (id === 'glyphs') s.glyphs = s.glyphs === 'ps' ? 'xbox' : 'ps';
  else if (id === 'mouse') s.mouse = s.mouse >= 3 ? 0.5 : s.mouse + 0.5;
  else if (id === 'rumble') s.rumble = !s.rumble;
  else if (id === 'steady') s.steady = !s.steady;
  else if (id === 'cpu') s.cpu = !s.cpu;
  else if (id === 'expert') s.expert = !s.expert;
  else if (id === 'reduced') s.reduced = !s.reduced;
  else if (id === 'invert') s.invertLook = !s.invertLook;
  else if (id === 'fullscreen') void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

/** The highest tracksuit unlocked: 20 pebbles opens lilac, 30 gold with a headband. */
export const maxColour = (pebbles: number): number => (pebbles >= 30 ? 5 : pebbles >= 20 ? 4 : 3);
export const nextColour = (cur: number, pebbles: number): number => (cur >= maxColour(pebbles) ? 0 : cur + 1);
