// buildModel, but a palette may name more slots than the model has (furniture sets share one palette).
import { buildModel } from '../engine.js';
import { MODELS } from './models.js';

export function buildAny(id, opts = {}) {
  const def = MODELS.get(id);
  let palette = opts.palette;
  if (palette && def?.palette) palette = Object.fromEntries(Object.entries(palette).filter(([k]) => k in def.palette));
  return buildModel(id, { catalog: MODELS, ...opts, palette });
}
