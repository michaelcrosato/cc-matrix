/**
 * @file The retreat's materials as data: clinical white, mint, sand, lawn, sea, coral. Page-side, as materials are.
 */
import { defineMaterial } from '../../../engine';

const flat = (id: string, description: string, color: string, more: object = {}) =>
  defineMaterial(`material:${id}`, { description, color, roughness: 0.8, ...more } as never);

flat('retreatWhite', 'Clinical white.', '#f7fafc');
flat('retreatMint', 'Mint trim.', '#bfead6');
flat('retreatCoral', 'Coral: prompts, buoys, focus.', '#ff8a70');
flat('retreatMat', 'A class mat.', '#ffffff');
flat('retreatStone', 'Pale stone.', '#c9d2d6', { map: { texture: 'texture:stone', seed: 3 } });
flat('retreatBrass', 'Brass, polished by someone who is paid to.', '#d8b45a', { metalness: 0.6, roughness: 0.4 });
flat('retreatWood', 'Pale decking.', '#d9bd92', { map: { texture: 'texture:planks', seed: 4 } });
flat('retreatCurtain', 'A pale curtain.', '#e8f4f0', { side: 'double' });
flat('retreatMirror', 'A mirror wall, very clean.', '#cfe6f2', { metalness: 0.7, roughness: 0.15 });
flat('retreatLamp', 'A lighthouse lamp.', '#fff4c8', { emissive: '#fff0a8', emissiveIntensity: 1.6 });
flat('retreatPalm', 'A tidy frond.', '#6fbf73');
flat('retreatMarble', 'A marble.', '#3a6fd8', { roughness: 0.2 });
flat('retreatDrink', 'A drink.', '#ffb45a', { transparent: true, opacity: 0.85 });
flat('retreatPond', 'Still Pond.', '#7fcfd8', { roughness: 0.12, transparent: true, opacity: 0.86 });
flat('retreatSand', 'Sand.', '#f4e8c8');
flat('retreatLawn', 'Lawn, mown by someone who worries.', '#a9d98a', { map: { texture: 'texture:grass', seed: 6 } });
flat('retreatSea', 'The sea, far off: its texture only reaches so far, and it takes no light.', '#74cde8', {
  unlit: true,
});
flat('retreatSeaNear', 'The water near you.', '#ffffff', {
  map: { texture: 'texture:water', seed: 2, params: { base: '#6fd0e8' } },
  roughness: 0.2,
});
