/** @file Harbor Light materials, tissue relief, cinematic looks and procedural hospital surfaces. */
import {
  defineMaterial,
  defineLook,
  defineSky,
  defineTexture,
  defineGeometry,
  roundedBoxGeometry,
} from '../../../engine';
export const PALETTE = {
  teal: '#164b4d',
  navy: '#071a22',
  brass: '#bd965c',
  steel: '#b7cdd3',
  cream: '#e8e4cf',
  red: '#7e2637',
  glow: '#75f3cf',
};
for (const [name, color] of Object.entries(PALETTE))
  defineMaterial(`material:hl-${name}`, {
    color,
    roughness: name === 'steel' ? 0.2 : 0.6,
    metalness: name === 'steel' ? 0.7 : name === 'brass' ? 0.45 : 0,
  });
defineMaterial('material:hl-lit', { color: '#8de8cf', emissive: '#7bdcbd', emissiveIntensity: 1.4, roughness: 0.3 });
defineMaterial('material:hl-window', { color: '#153544', emissive: '#0a2638', emissiveIntensity: 0.3, roughness: 0.2 });
defineTexture('texture:wet-cells', {
  description: 'Fine cellular relief in living tissue.',
  size: [128, 128],
  look: 'smooth',
  create: () => (x, y, t) => {
    const v = 190 + 20 * Math.sin(x * 0.61) * Math.sin(y * 0.57);
    t.color = [v, v * 0.92, v * 0.9];
    t.height = 0.5 + (v - 190) / 800;
  },
});
defineMaterial('material:tissue', {
  color: '#ffffff',
  vertexColors: true,
  roughness: 0.4,
  metalness: 0.03,
  map: 'texture:wet-cells',
});
defineMaterial('material:wet', { color: '#ffffff', vertexColors: true, roughness: 0.44, metalness: 0 });
defineMaterial('material:thread', { color: '#ffffff', vertexColors: true, roughness: 0.45 });
defineMaterial('material:field-glow', {
  color: '#ffffff',
  vertexColors: true,
  emissive: '#6bd8cc',
  emissiveIntensity: 0.3,
  roughness: 0.35,
});
defineMaterial('material:field-steel', { color: '#ffffff', vertexColors: true, roughness: 0.3, metalness: 0.5 });
defineMaterial('material:field-glove', { color: '#ffffff', vertexColors: true, roughness: 0.7 });
defineMaterial('material:hl-floor', { color: '#214047', roughness: 0.48 });
defineGeometry('geometry:hl-rounded', {
  description: 'Soft machined hospital furniture.',
  create: () => roundedBoxGeometry({ width: 1, height: 1, depth: 1, radius: 0.1 }),
});
defineSky('sky:harbor', {
  background: '#07151c',
  pointLights: 1,
  ambient: { sky: '#bcdfdf', ground: '#476067', intensity: 1 },
  sun: { color: '#ffe4c4', intensity: 1.6, azimuth: 3.7, elevation: 1.1 },
  fog: { color: '#091e28', amount: 0.3, start: 22, end: 65 },
});
defineLook('look:field', {
  description: 'Glossy living tissue beneath the surgical lamp.',
  style: 'pbr',
  sky: 'sky:harbor',
  resolution: 'full',
  textures: 'smooth',
  filters: { ao: { scope: 'all', strength: 0.6 }, aa: { scope: 'all' }, bloom: { scope: 'all', strength: 0.1 } },
});
defineLook('look:harbor', {
  description: 'Sea-glass walls, brass lamps and storm blue.',
  style: 'toon',
  sky: 'sky:harbor',
  resolution: 'full',
  textures: 'smooth',
  filters: { ao: { scope: 'all', strength: 0.4 }, aa: { scope: 'all' }, bloom: { scope: 'all', strength: 0.15 } },
});
defineLook('look:stillpoint', {
  description: 'A silent teal moment between heartbeats.',
  filters: { vignette: { scope: 'all', strength: 0.4 }, grade: { scope: 'all', saturation: 0.3, temperature: -0.25 } },
});
defineLook('look:second-pulse', {
  description: 'Amber heat and the rush of certainty.',
  filters: { speedlines: { scope: 'all', amount: 0.3 }, grade: { scope: 'all', temperature: 0.3 } },
});
defineLook('look:critical', {
  description: 'The red edge of a failing heartbeat.',
  filters: { vignette: { scope: 'all', strength: 0.5, color: '#631d2e' } },
});
