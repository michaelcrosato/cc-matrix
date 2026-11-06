/** @file High-key brochure daylight, original retreat materials, and a darkening storm. */
import { defineMaterial, defineSky, defineLook } from '../../../engine';
defineMaterial('material:retreat', { color: '#ffffff', roughness: 0.9 });
defineMaterial('material:retreatSand', { color: '#e9dbb3' });
defineMaterial('material:retreatLawn', { color: '#b6cf90', roughness: 1 });
defineMaterial('material:retreatSea', {
  color: '#a4d8d0',
  map: { texture: 'texture:water', seed: 2, params: { base: '#72b8b2' } },
  normalScale: 0.14,
});
defineSky('sky:retreat', {
  description: 'An immaculate island under a pale sea sky.',
  background: '#c9ded4',
  sun: { color: '#fff3d4', intensity: 2.2, elevation: 0.8, azimuth: -0.8 },
  ambient: { sky: '#d7ebe2', ground: '#c4b28f', intensity: 2.1 },
  fog: { color: '#ccdcd0', start: 80, end: 380, amount: 0.65 },
  backdrop: { layers: [] },
});
defineSky('sky:retreatDawn', {
  background: '#e6dfc7',
  sun: { color: '#ffe1ad', intensity: 1.8, elevation: 0.25 },
  ambient: { sky: '#e6e2cc', ground: '#ada88d', intensity: 2 },
  backdrop: { layers: [] },
});
defineSky('sky:retreatDusk', {
  background: '#c6b8ba',
  sun: { color: '#ffd1a7', intensity: 1.4, elevation: 0.12 },
  ambient: { sky: '#b6c6c3', ground: '#8f917e', intensity: 1.8 },
  backdrop: { layers: [] },
});
defineSky('sky:stormRetreat', {
  background: '#546c70',
  sun: { color: '#a9c6cd', intensity: 0.7, elevation: 0.5 },
  ambient: { sky: '#859f9f', ground: '#566461', intensity: 1.4 },
  fog: { color: '#647e80', start: 40, end: 210, amount: 0.8 },
  backdrop: { layers: [] },
});
defineLook('look:retreat', {
  description: 'Quiet soft toon daylight, a fine line and warm paper colours.',
  sky: 'sky:retreat',
  style: 'toon',
  filters: {
    bloom: { scope: 'all', strength: 0.2, threshold: 0.96 },
    grade: { scope: 'all', brightness: 1.03, saturation: 0.86, lift: 0.02 },
    outline: { scope: 'characters+objects', width: 1, darken: 0.18 },
  },
});
defineLook('look:retreatStorm', {
  description: 'The same brochure in a politely serious storm.',
  sky: 'sky:stormRetreat',
  style: 'toon',
  filters: {
    grade: { scope: 'all', brightness: 0.9, saturation: 0.6 },
    outline: { scope: 'characters+objects', width: 1, darken: 0.2 },
  },
});
defineMaterial('material:retreatBeam', {
  color: '#ffefb3',
  unlit: true,
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
});
defineLook('look:retreatSession', {
  description: 'A clear, quick-to-prepare pavilion for the shared class.',
  sky: 'sky:retreat',
  style: 'toon',
});

defineLook('look:retreatDawn', {
  description: 'A level island in the first warm light.',
  sky: 'sky:retreatDawn',
  style: 'toon',
  filters: {
    grade: { scope: 'all', brightness: 1.03, saturation: 0.86, lift: 0.02 },
    outline: { scope: 'characters+objects', width: 1, darken: 0.18 },
  },
});
