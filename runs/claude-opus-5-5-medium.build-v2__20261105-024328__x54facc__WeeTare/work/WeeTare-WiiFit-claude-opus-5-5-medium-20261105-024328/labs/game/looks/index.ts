/**
 * @file The picture: high-key brochure daylight (`look:retreat`), its skies by time and mood, and the storm's drained
 * `look:storm`. The skies start from `sky:noon`'s numbers, with its mountains gone: only sea to every horizon.
 */
import { defineLook, defineSky } from '../../../engine';

const backdrop = (haze: string) => ({ haze, tint: '#ffffff', layers: [] });
const fog = { color: '#a8def8', start: 160, end: 700, amount: 1, floor: 0, ceiling: 1.5, height: 0 };

defineSky('sky:retreat', {
  description: 'A brochure noon over an empty sea.',
  background: '#8fd4f8', pointLights: 1, backdrop: backdrop('#a8def8'),
  dome: { show: false, turbidity: 2, rayleigh: 1, mieCoefficient: 0.005, mieDirectionalG: 0.8, exposure: 0.5 },
  sun: { color: '#fff4e0', intensity: 2.1, azimuth: 0.4, elevation: 0.95 },
  ambient: { sky: '#d8e6ff', ground: '#c8c0a8', intensity: 1.3 },
  fog,
} as never); // prettier-ignore
defineSky('sky:retreatDawn', {
  description: 'First light, after everything.',
  background: '#ffd9c8', pointLights: 1, backdrop: backdrop('#ffd9c8'),
  dome: { show: false, turbidity: 3, rayleigh: 2, mieCoefficient: 0.006, mieDirectionalG: 0.8, exposure: 0.5 },
  sun: { color: '#ffc8a0', intensity: 2, azimuth: 1.5, elevation: 0.18 },
  ambient: { sky: '#ffdcd0', ground: '#a89c98', intensity: 1.6 },
  fog: { ...fog, color: '#ffd9c8' },
} as never); // prettier-ignore
defineSky('sky:retreatDusk', {
  description: 'An evening that has been told to be pleasant.',
  background: '#f3b9a6', pointLights: 1, backdrop: backdrop('#f3b9a6'),
  dome: { show: false, turbidity: 4, rayleigh: 2.4, mieCoefficient: 0.006, mieDirectionalG: 0.8, exposure: 0.45 },
  sun: { color: '#ffb080', intensity: 1.6, azimuth: -1.4, elevation: 0.14 },
  ambient: { sky: '#d0b8d8', ground: '#8a7c80', intensity: 1.4 },
  fog: { ...fog, color: '#f3b9a6' },
} as never); // prettier-ignore
defineSky('sky:storm', {
  description: 'The storm. Please remain calm.',
  background: '#46545e', pointLights: 1, backdrop: backdrop('#46545e'),
  dome: { show: false, turbidity: 8, rayleigh: 1, mieCoefficient: 0.01, mieDirectionalG: 0.7, exposure: 0.3 },
  sun: { color: '#a8bcc8', intensity: 0.9, azimuth: 0.4, elevation: 0.7 },
  ambient: { sky: '#7c8c9e', ground: '#4a5058', intensity: 1.7 },
  fog: { color: '#46545e', start: 40, end: 420, amount: 1, floor: 0, ceiling: 1.5, height: 0 },
} as never); // prettier-ignore

const FILTERS = {
  bloom: { scope: 'all', strength: 0.25, threshold: 0.98 },
  grade: { scope: 'all', brightness: 1.02, saturation: 0.95, lift: 0.02 },
  outline: { scope: 'characters', width: 1, darken: 0.25 },
};

defineLook('look:retreat', {
  description: 'High-key brochure daylight: soft toon light, a little bloom.',
  sky: 'sky:retreat',
  style: 'toon',
  filters: FILTERS,
} as never);
defineLook('look:dawn', {
  description: 'The same, at first light.',
  sky: 'sky:retreatDawn',
  style: 'toon',
  filters: FILTERS,
} as never);
defineLook('look:dusk', {
  description: 'The same, at the day’s end.',
  sky: 'sky:retreatDusk',
  style: 'toon',
  filters: FILTERS,
} as never);
defineLook('look:storm', {
  description: 'The storm: the colour drained.',
  sky: 'sky:storm',
  style: 'toon',
  filters: { grade: { scope: 'all', brightness: 0.92, saturation: 0.45, lift: 0.01 } },
} as never); // prettier-ignore
defineLook('look:session', {
  description:
    'A session\u2019s picture: the same daylight, no filters, because the hub gives every copy a boot deadline.',
  sky: 'sky:retreat',
} as never);
defineLook('look:sessionToon', {
  description: 'The same in toon, for a test of what the deadline can bear.',
  sky: 'sky:retreat',
  style: 'toon',
} as never);
