/**
 * @file The retreat's skies and looks: bright high-key brochure daylight (`look:retreat`), dawn, dusk and a storm that
 * drains the colour. No silhouette backdrop, so the horizon is an empty sea (and stays level while the island tips).
 * Page-side; registered by importing this module before the engine starts.
 * @example
 * import './art/looks'; // then ?post.look=look:retreat
 */
import { defineLook, defineSky } from '../../../engine';

const sky = (id: string, description: string, o: Record<string, unknown>) =>
  defineSky(id, {
    description,
    pointLights: 1,
    backdrop: { haze: '#e6f6ff', tint: '#ffffff', layers: [] },
    ...o,
  } as never);
const dome = { show: true, turbidity: 2, rayleigh: 1, mieCoefficient: 0.005, mieDirectionalG: 0.8, exposure: 0.5 };
sky('sky:retreat', 'Brochure noon over an empty sea.', {
  background: '#9cd0f4',
  dome,
  sun: { color: '#fff4e0', intensity: 1.5, azimuth: 0.4, elevation: 0.9 },
  ambient: { sky: '#d8e6ff', ground: '#8a8f80', intensity: 0.9 },
  fog: { color: '#d6ecfa', start: 80, end: 420, amount: 0.4, floor: 0, ceiling: 1.5, height: 0 },
});
sky('sky:retreatDawn', 'The last morning: soft rose light.', {
  background: '#f3cdb8',
  dome: { ...dome, rayleigh: 2.2, exposure: 0.45 },
  sun: { color: '#ffd0b0', intensity: 1.4, azimuth: 1.6, elevation: 0.25 },
  ambient: { sky: '#ffe0d0', ground: '#9a8f88', intensity: 0.9 },
  fog: { color: '#f6dccb', start: 80, end: 380, amount: 0.45, floor: 0, ceiling: 1.5, height: 0 },
});
sky('sky:retreatDusk', 'Evening on the island.', {
  background: '#d9a58a',
  dome: { ...dome, rayleigh: 3, exposure: 0.4 },
  sun: { color: '#ffb080', intensity: 1.2, azimuth: 2.4, elevation: 0.18 },
  ambient: { sky: '#e4c0b0', ground: '#7a6a68', intensity: 0.8 },
  fog: { color: '#e4b8a0', start: 70, end: 340, amount: 0.5, floor: 0, ceiling: 1.5, height: 0 },
});
sky('sky:storm', 'The storm: grey, close and low.', {
  background: '#58626c',
  dome: { ...dome, turbidity: 10, exposure: 0.25 },
  sun: { color: '#c0c8d0', intensity: 0.8, azimuth: 0.4, elevation: 0.5 },
  ambient: { sky: '#8a98a8', ground: '#4a4f55', intensity: 1.2 },
  fog: { color: '#6a747e', start: 30, end: 240, amount: 0.7, floor: 0, ceiling: 2, height: 0 },
});
const filters = {
  bloom: { scope: 'all', strength: 0.25, threshold: 1.1 },
  grade: { scope: 'all', brightness: 1.0, saturation: 1.05, lift: 0.0 },
  outline: { scope: 'characters+objects', width: 1, darken: 0.25 },
};
defineLook('look:retreat', {
  description: 'High-key brochure daylight: soft toon light, a little bloom, a thin ink line on people and things.',
  sky: 'sky:retreat',
  style: 'toon',
  textures: 'smooth',
  filters,
} as never);
defineLook('look:retreatDawn', {
  description: 'Dawn: rose light, same toon.',
  sky: 'sky:retreatDawn',
  style: 'toon',
  filters,
} as never);
defineLook('look:retreatDusk', {
  description: 'Dusk: warm evening.',
  sky: 'sky:retreatDusk',
  style: 'toon',
  filters,
} as never);
defineLook('look:storm', {
  description: 'The storm: colour drained.',
  sky: 'sky:storm',
  style: 'toon',
  filters: { ...filters, grade: { scope: 'all', brightness: 0.95, saturation: 0.4, lift: 0 } },
} as never);
