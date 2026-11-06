/**
 * @file The retreat look. High-key daylight, a dawn, a dusk, and a drained storm.
 * Materials for the lawn, the shore, and the sea are defined here so the view can find them.
 */
import { defineLook, defineMaterial, defineSky } from '../../../engine';

defineMaterial('material:sand', {
  description: 'Shore sand and the mats.',
  color: '#F4E8C8',
  roughness: 0.9,
});

defineMaterial('material:lawn', {
  description: 'The upland lawn.',
  color: '#A9D98A',
  roughness: 0.85,
});

defineMaterial('material:sea', {
  description: 'The sea around the island. The texture is drifted by moving the prop.',
  color: '#6FD0E8',
  map: { texture: 'texture:water', seed: 2, params: { base: '#6fd0e8' } },
});

const day = {
  dome: { show: true, turbidity: 2, rayleigh: 1, mieCoefficient: 0.005, mieDirectionalG: 0.8, exposure: 0.5 },
  sun: { color: '#fff0d8', intensity: 2.6, azimuth: 0.4, elevation: 1.05 },
  ambient: { sky: '#BFE9FF', ground: '#F4E8C8', intensity: 1.5 },
  fog: { color: '#c8eaf8', start: 50, end: 240, amount: 0.35 },
  backdrop: { haze: '#BFE9FF', tint: '#ffffff', layers: [] as [] },
};

defineSky('sky:retreat', {
  description: 'Brochure noon over an empty sea horizon.',
  background: '#BFE9FF',
  ...day,
});

defineSky('sky:retreatDawn', {
  description: 'The last morning. The sun is low and the sea is pale.',
  background: '#f3d2c4',
  dome: { show: true, turbidity: 6, rayleigh: 2.2, mieCoefficient: 0.01, mieDirectionalG: 0.85, exposure: 0.36 },
  sun: { color: '#ffc8a0', intensity: 1.7, azimuth: -1.2, elevation: 0.25 },
  ambient: { sky: '#f0d0c8', ground: '#c8b8a0', intensity: 1.1 },
  fog: { color: '#f0ddd4', start: 30, end: 200, amount: 0.5 },
  backdrop: { haze: '#f3d2c4', layers: [] },
});

defineSky('sky:retreatDusk', {
  description: 'Evening on the lawn. The sun sits in the west.',
  background: '#e7a888',
  dome: { show: true, turbidity: 5, rayleigh: 2.4, mieCoefficient: 0.01, mieDirectionalG: 0.85, exposure: 0.32 },
  sun: { color: '#ff9a60', intensity: 1.5, azimuth: 2.4, elevation: 0.2 },
  ambient: { sky: '#e8c0b0', ground: '#6a5040', intensity: 1 },
  fog: { color: '#e8c8b8', start: 30, end: 200, amount: 0.45 },
  backdrop: { haze: '#e7a888', layers: [] },
});

defineSky('sky:storm', {
  description: 'The Great Tilt. The colour drains and the sun is a grey disc.',
  background: '#9aa8b0',
  dome: { show: true, turbidity: 10, rayleigh: 0.6, mieCoefficient: 0.02, mieDirectionalG: 0.7, exposure: 0.28 },
  sun: { color: '#d8dde2', intensity: 0.8, azimuth: 0.2, elevation: 0.6 },
  ambient: { sky: '#b8c4cc', ground: '#6a7070', intensity: 0.8 },
  fog: { color: '#aeb8c0', start: 20, end: 140, amount: 0.7 },
  backdrop: { haze: '#9aa8b0', layers: [] },
});

defineSky('sky:pavilion', {
  description: 'Flat noon for a hub copy. The dome stays off so four of these can start together.',
  background: '#BFE9FF',
  dome: { show: false },
  sun: { color: '#fff0d8', intensity: 2.2, azimuth: 0.4, elevation: 1.05 },
  ambient: { sky: '#BFE9FF', ground: '#F4E8C8', intensity: 1.4 },
  fog: { color: '#c8eaf8', start: 40, end: 180, amount: 0.2 },
  backdrop: { haze: '#BFE9FF', layers: [] },
});

defineLook('look:pavilion', {
  description: 'Group Class on a hub mat. The same noon, without the toon line or the bloom.',
  sky: 'sky:pavilion',
});

defineLook('look:retreat', {
  description: 'High-key brochure daylight: soft toon light, a little bloom, a thin ink line.',
  sky: 'sky:retreat',
  style: 'toon',
  filters: {
    bloom: { scope: 'all', strength: 0.35, threshold: 0.92 },
    grade: { scope: 'all', brightness: 1.08, saturation: 0.92, lift: 0.03 },
    outline: { scope: 'characters+objects', width: 1, darken: 0.25 },
  },
});

defineLook('look:dawn', {
  description: 'The last light. The same toon line under the dawn sky.',
  sky: 'sky:retreatDawn',
  style: 'toon',
  filters: {
    bloom: { scope: 'all', strength: 0.4, threshold: 0.88 },
    grade: { scope: 'all', brightness: 1.04, saturation: 0.84, lift: 0.04 },
    outline: { scope: 'characters+objects', width: 1, darken: 0.2 },
  },
});

defineLook('look:storm', {
  description: 'The same toon line, with the colour pulled toward the storm sky.',
  sky: 'sky:storm',
  style: 'toon',
  filters: {
    bloom: { scope: 'all', strength: 0.2, threshold: 0.95 },
    grade: { scope: 'all', brightness: 0.92, saturation: 0.45, lift: 0.02 },
    outline: { scope: 'characters+objects', width: 1, darken: 0.35 },
  },
});
