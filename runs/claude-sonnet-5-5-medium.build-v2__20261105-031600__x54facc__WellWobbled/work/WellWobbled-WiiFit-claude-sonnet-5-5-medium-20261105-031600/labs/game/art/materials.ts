/**
 * @file The retreat's materials, drawn from the palette: clinical white, mint, sand, lawn, sea, coral, slate and brass.
 * Page-side (imports engine/index.ts); registered by importing this module before the engine starts.
 * @example
 * import './art/materials'; // then props name 'material:rwhite' etc.
 */
import { defineMaterial } from '../../../engine';

const m = (id: string, color: string, extra: Record<string, unknown> = {}) =>
  defineMaterial(id, { color, roughness: 0.8, ...extra } as never);
export const PALETTE = {
  white: '#F7FAFC',
  sky: '#BFE9FF',
  mint: '#BFEAD6',
  sand: '#F4E8C8',
  lawn: '#A9D98A',
  sea: '#6FD0E8',
  coral: '#FF8A70',
  slate: '#3A4A55',
  brass: '#D8B25A',
} as const;
m('material:rwhite', PALETTE.white);
m('material:rmint', PALETTE.mint);
m('material:rsand', PALETTE.sand);
m('material:rlawn', PALETTE.lawn);
m('material:rcoral', PALETTE.coral);
m('material:rslate', PALETTE.slate);
m('material:rbrass', PALETTE.brass, { roughness: 0.35, metalness: 0.4 });
m('material:rwood', '#e9d3a8', { map: 'texture:planks' });
m('material:rglass', '#cdeffc', { transparent: true, opacity: 0.55 });
m('material:rglow', '#ffe9a8', { emissive: '#ffd36a', emissiveIntensity: 0.8 });
m('material:rsea', '#ffffff', {
  map: { texture: 'texture:water', seed: 2, params: { base: PALETTE.sea } },
  roughness: 0.4,
});
m('material:rsandTerrain', PALETTE.sand, { roughness: 1 });
m('material:rlawnTerrain', PALETTE.lawn, { roughness: 1 });
