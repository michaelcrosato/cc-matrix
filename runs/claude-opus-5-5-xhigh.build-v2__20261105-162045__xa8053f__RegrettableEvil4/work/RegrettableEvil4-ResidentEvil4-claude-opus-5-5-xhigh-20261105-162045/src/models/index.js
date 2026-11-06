// Every model def in the game and the catalog buildModel resolves ids in. No engine start in here.
import { MODEL_LIBRARY, ModelCatalog, TEXTURE_LIBRARY } from '../../pixel-engine.js';
import { HUMAN_DEFS } from './humans.js';
import { WEAPON_DEFS } from './weapons.js';
import { PROP_DEFS } from './props.js';
import { ICONS, SIGN_TEXTURE } from './icons.js';

if (!TEXTURE_LIBRARY.has?.('thole-sign')) { try { TEXTURE_LIBRARY.add(SIGN_TEXTURE); } catch { /* already added */ } }

export const ALL_DEFS = [...HUMAN_DEFS, ...WEAPON_DEFS, ...PROP_DEFS];
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...ALL_DEFS]);
export { HUMAN_DEFS, WEAPON_DEFS, PROP_DEFS, ICONS, SIGN_TEXTURE };
