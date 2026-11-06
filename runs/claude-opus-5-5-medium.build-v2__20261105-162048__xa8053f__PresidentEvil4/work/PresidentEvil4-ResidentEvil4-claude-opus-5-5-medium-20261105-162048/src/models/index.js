// Model catalogue. No engine start in here: check.mjs --sheets imports this module.
import { MODEL_LIBRARY, ModelCatalog } from '../../pixel-engine.js';
import { HUMANS, CREATURES } from './humans.js';
import { WEAPON_MODELS } from './weapons.js';
import { PROPS } from './props.js';
export const ALL_DEFS = [...Object.values(HUMANS), ...Object.values(CREATURES), ...Object.values(WEAPON_MODELS), ...Object.values(PROPS)];
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...ALL_DEFS]);
export { HUMANS, CREATURES, WEAPON_MODELS, PROPS };
