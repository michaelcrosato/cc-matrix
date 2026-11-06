// Where the game's model ids resolve: the library and ours.
import { MODEL_LIBRARY, ModelCatalog } from '../../../pixel-engine.js';
import { GEAR_MODELS, bellwardenBody, censer, handBell, handLantern, lamplighterBody, pyxBody, sextonBody } from './heroes.js';
import { MONSTER_MODELS } from './monsters.js';
import { CLEMENCY, NPC_MODELS } from './npcs.js';
import { PROP_MODELS } from './props.js';

export const OWN_MODELS = [bellwardenBody, lamplighterBody, sextonBody, pyxBody, handBell, handLantern, censer, ...GEAR_MODELS, ...MONSTER_MODELS, ...NPC_MODELS, CLEMENCY, ...PROP_MODELS];
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...OWN_MODELS]);
export const OWN = OWN_MODELS;
