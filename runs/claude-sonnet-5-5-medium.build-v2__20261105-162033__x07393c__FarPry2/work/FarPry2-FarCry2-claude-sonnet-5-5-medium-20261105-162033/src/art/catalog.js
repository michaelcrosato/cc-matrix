// One catalog for the library plus every model the game defines.
import { MODEL_LIBRARY, ModelCatalog } from '../../pixel-engine.js';
import { ALL_PEOPLE } from './people.js';
import { WORLD_MODELS } from './world-models.js';
import { VEHICLE_MODELS } from './vehicles.js';
import { VM_LIST } from './guns.js';
export const GAME_MODELS = [...ALL_PEOPLE, ...WORLD_MODELS, ...VEHICLE_MODELS, ...VM_LIST];
export const CATALOG = new ModelCatalog([...MODEL_LIBRARY.all(), ...GAME_MODELS]);
