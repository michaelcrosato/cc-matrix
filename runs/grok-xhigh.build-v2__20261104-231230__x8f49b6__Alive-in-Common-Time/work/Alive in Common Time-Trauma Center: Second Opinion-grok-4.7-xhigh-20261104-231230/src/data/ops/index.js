import brokenGlass from './broken-glass.js';
import growthSpurt from './growth-spurt.js';
import adagio from './adagio.js';
import staccato from './staccato.js';
import legato from './legato.js';
import fermata from './fermata.js';
import coda from './coda.js';
import lastPatient from './last-patient.js';
import grandRounds from './grand-rounds.js';

export const OPS = [brokenGlass, growthSpurt, adagio, staccato, legato, fermata, coda, lastPatient];
export const ALL_OPS = [...OPS, grandRounds];

const byId = new Map(ALL_OPS.map((op) => [op.id, op]));

export function getOp(id) {
  const op = byId.get(id);
  if (!op) throw new Error(`unknown operation ${id}`);
  return op;
}

export function storyOrder() {
  return OPS.map((op) => op.id);
}
