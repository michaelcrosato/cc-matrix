// Every model def in one catalog (library + ours). Safe to import anywhere: no engine start.
import { MODEL_LIBRARY, ModelCatalog } from '../../pixel-engine.js';
import * as humans from './humans.js';
import * as props from './props.js';

const defs = [];
for (const m of Object.values(humans)) if (m && m.id && m.parts) defs.push(m);
for (const m of Object.values(props)) if (m && m.id && m.parts) defs.push(m);
export const OUR_MODELS = defs;
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...defs]);
