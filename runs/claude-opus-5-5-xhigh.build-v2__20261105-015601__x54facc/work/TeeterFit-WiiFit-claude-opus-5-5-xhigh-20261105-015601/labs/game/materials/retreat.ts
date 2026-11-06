/**
 * @file Teeter Fit's materials: the brochure palette as data. Clinical white, mint, sand, lawn and a sea that drifts.
 * Materials are page-side; props name them by id.
 *
 * Game code, a page's.
 *
 * @example
 * // 'material:lawn' on the terrain's high layer.
 */
import { defineMaterial } from '../../../engine';

/** A plain coloured material. */
const flat = (id: string, color: string, roughness = 0.8, more: object = {}) =>
  defineMaterial(id, { description: `Plain ${id.split(':')[1]}.`, color, roughness, ...more });

defineMaterial('material:sand', {
  description: 'Pale shore sand, the low ground.',
  color: '#ffffff',
  map: {
    texture: 'texture:plaster',
    seed: 4,
    params: { plaster: '#f4e8c8', shade: '#efe2bd', light: '#f8efd6', fallen: 0, cracks: 0 },
  },
  roughness: 1,
});
defineMaterial('material:lawn', {
  description: 'Tidy lawn, the upland ground.',
  color: '#ffffff',
  map: { texture: 'texture:grass', seed: 5, params: { base: '#a9d98a', dark: '#93c776' } },
  roughness: 1,
});
defineMaterial('material:seawater', {
  description: 'The brochure sea: a baked ripple on a flat prop that drifts.',
  color: '#ffffff',
  map: {
    texture: 'texture:water',
    seed: 2,
    params: { base: '#6fd0e8', dark: '#62c7e2', light: '#a6ebf7', crests: 0.1 },
  },
  unlit: true,
});
defineMaterial('material:clinical', {
  description: 'Painted white plaster, the retreat itself.',
  color: '#ffffff',
  map: {
    texture: 'texture:plaster',
    seed: 8,
    params: { plaster: '#f7fafc', shade: '#eef3f6', light: '#ffffff', fallen: 0, cracks: 0 },
  },
  roughness: 0.7,
});
defineMaterial('material:deck', {
  description: 'Bleached decking, pier and jetty.',
  color: '#efe2c8',
  map: { texture: 'texture:planks', seed: 7 },
  roughness: 0.9,
});
defineMaterial('material:floorWhite', {
  description: 'The pavilion floor.',
  color: '#ffffff',
  map: {
    texture: 'texture:tiles',
    seed: 3,
    params: { tones: ['#fbfdfe', '#f1f5f7'], glaze: '#ffffff', grout: '#d3dce1' },
  },
  roughness: 0.5,
});
flat('material:skirt', '#bfe9ff', 1, { unlit: true, side: 'double' });
flat('material:mint', '#bfead6');
flat('material:mintDeep', '#8fd6b8');
flat('material:skyPale', '#bfe9ff');
flat('material:coral', '#ff8a70');
flat('material:slate', '#3a4a55');
flat('material:white', '#f7fafc', 0.6);
flat('material:sandstone', '#e6d6ac');
flat('material:rock', '#a7a9a4', 1);
flat('material:rockDark', '#7e8580', 1);
flat('material:palmTrunk', '#b9976c', 1);
flat('material:palmLeaf', '#6dbb6a', 1);
flat('material:rope', '#c9b79a', 1);
flat('material:brass', '#d9b45a', 0.35, { metalness: 0.6 });
flat('material:mirror', '#d6eaf3', 0.08, { metalness: 0.9 });
flat('material:curtain', '#f2f7f8', 1, { side: 'double' });
flat('material:marble', '#fbfdff', 0.15);
flat('material:marbleRed', '#ff8a70', 0.2);
flat('material:marbleBlue', '#5db6e8', 0.2);
flat('material:rakedSand', '#f4e8c8', 1);
flat('material:ridge', '#d9c79a', 1);
flat('material:hole', '#5a4d3a', 1);
flat('material:tray', '#d9c8a8', 0.9);
flat('material:ferry', '#f7fafc', 0.5);
flat('material:ferryTrim', '#3b82f6', 0.5);
flat('material:board', '#ffd6a0', 0.5);
flat('material:buoy', '#ff8a70', 0.4);
flat('material:buoyWhite', '#ffffff', 0.4);
flat('material:glassDrink', '#fff3d6', 0.2, { transparent: true, opacity: 0.8 });
flat('material:cart', '#8a96a0', 0.6, { metalness: 0.3 });
flat('material:card', '#ffffff', 0.9);
flat('material:wet', '#ffffff', 0.4, { emissive: '#bfe9ff', emissiveIntensity: 0.4 });
flat('material:ringGlow', '#ff8a70', 0.5, { emissive: '#ff8a70', emissiveIntensity: 1.2 });
flat('material:beam', '#fff6c8', 1, { unlit: true, transparent: true, opacity: 0.32, side: 'double' });
for (const [name, color] of [
  ['red', '#e8443a'],
  ['blue', '#3b82f6'],
  ['green', '#22c55e'],
  ['gold', '#f5b700'],
  ['plain', '#bfead6'],
] as const) {
  flat(`material:mat.${name}`, color, 0.95);
}
for (let i = 0; i < 6; i++)
  flat(`material:stone${i}`, ['#c9ced1', '#b7bdb9', '#e0dcd2', '#a9b4b8', '#d4cdbe', '#bfc7cc'][i], 1);
