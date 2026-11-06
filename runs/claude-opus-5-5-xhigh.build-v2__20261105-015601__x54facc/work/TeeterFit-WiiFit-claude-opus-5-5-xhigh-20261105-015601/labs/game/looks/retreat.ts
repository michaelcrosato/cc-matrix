/**
 * @file The picture: `look:retreat`, high-key brochure daylight (PLAN.md section 10), its skies (day, dawn, dusk, storm,
 * none with a silhouette backdrop: the sea horizon stays empty), and `look:storm`, which drains the colour.
 *
 * Game code, a page's.
 *
 * @example
 * // ?post.look=look:retreat
 */
import { defineLook, defineSky } from '../../../engine';

/** No backdrop: an empty sea horizon. */
const NO_BACKDROP = { haze: '#c8e4f8', tint: '#ffffff', layers: [] };

defineSky('sky:retreat', {
  description: 'Brochure noon: a clear dome, a high sun, an empty horizon.',
  background: '#bfe9ff',
  dome: { show: false },
  sun: { color: '#fff0d8', intensity: 2.1, azimuth: 2.5, elevation: 0.95 },
  ambient: { sky: '#d8e6ff', ground: '#8a8370', intensity: 1.35 },
  fog: { color: '#bfe9ff', start: 170, end: 900, amount: 1, floor: 0, ceiling: 1.5, height: 0 },
  backdrop: NO_BACKDROP,
} as never);
defineSky('sky:retreatDawn', {
  description: 'Dawn after the storm: pale gold on a glass sea.',
  background: '#ffe9cf',
  dome: { show: false },
  sun: { color: '#ffd9a8', intensity: 2, azimuth: 2, elevation: 0.3 },
  ambient: { sky: '#ffe6cc', ground: '#8a7a68', intensity: 1.6 },
  fog: { color: '#ffe9cf', start: 140, end: 800, amount: 1, floor: 0, ceiling: 1.5, height: 0 },
  backdrop: NO_BACKDROP,
} as never);
defineSky('sky:retreatDusk', {
  description: 'Evening: a low warm sun, the huts catching it.',
  background: '#f6c9a8',
  dome: { show: false },
  sun: { color: '#ffb98a', intensity: 1.7, azimuth: -2, elevation: 0.24 },
  ambient: { sky: '#e4c8d8', ground: '#7a6a60', intensity: 1.3 },
  fog: { color: '#f6c9a8', start: 130, end: 760, amount: 1, floor: 0, ceiling: 1.5, height: 0 },
  backdrop: NO_BACKDROP,
} as never);
defineSky('sky:storm', {
  description: 'The Great Tilt: slate cloud, low light, close fog.',
  background: '#39444f',
  dome: { show: false },
  sun: { color: '#b8c4d0', intensity: 1, azimuth: 0.6, elevation: 0.8 },
  ambient: { sky: '#7f8e9c', ground: '#3a4148', intensity: 1.2 },
  fog: { color: '#39444f', start: 30, end: 300, amount: 1, floor: 0, ceiling: 1.5, height: 0 },
  backdrop: NO_BACKDROP,
} as never);

/** The look's filters, shared. */
const FILTERS = {
  bloom: { scope: 'all', strength: 0.35, threshold: 0.92 },
  grade: { scope: 'all', brightness: 1.08, saturation: 0.92, lift: 0.03 },
  // `depth` 0.02, the default, draws a dark band along the horizon: a flat sea crosses it at about 2.3 degrees of grazing angle.
  outline: { scope: 'characters+objects', width: 1, darken: 0.25, depth: 0.1, fade: 1, fadeStart: 50, fadeEnd: 200 },
};

defineLook('look:retreat', {
  description: 'High-key brochure daylight: soft toon light, a little bloom, a thin ink line on people and things.',
  sky: 'sky:retreat',
  style: 'toon',
  filters: FILTERS,
} as never);
defineLook('look:retreatDawn', {
  description: 'Dawn over glass.',
  sky: 'sky:retreatDawn',
  style: 'toon',
  filters: FILTERS,
} as never);
defineLook('look:retreatDusk', {
  description: 'Evening on the island.',
  sky: 'sky:retreatDusk',
  style: 'toon',
  filters: FILTERS,
} as never);
defineLook('look:storm', {
  description: 'The storm: the colour drained out of the brochure.',
  sky: 'sky:storm',
  style: 'toon',
  filters: {
    bloom: { scope: 'all', strength: 0.2, threshold: 0.9 },
    grade: { scope: 'all', brightness: 0.86, saturation: 0.45, lift: 0.01 },
    outline: { scope: 'characters+objects', width: 1, darken: 0.35, depth: 0.1, fade: 1, fadeStart: 50, fadeEnd: 200 },
  },
} as never);
