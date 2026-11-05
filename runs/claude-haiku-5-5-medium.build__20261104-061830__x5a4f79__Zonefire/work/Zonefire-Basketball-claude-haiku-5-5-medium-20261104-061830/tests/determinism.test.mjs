// Determinism (plan §19.2 "determinism"): the same seed and the same inputs give the same state twice (the proof).
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const proof = (seed, steps) => {
  const g = loadGame({ seed });
  g.bb.setupMatch({ court: 'skybox', humans: [], qLen: 60 });
  for (let i = 0; i < steps; i++) g.bb.matchStep(1 / 120);
  return hash(JSON.stringify(g.game.debug.snapshot()));
};
T('determinism.the same seed gives the same match twice', () => {
  const a = proof(101, 3600), b = proof(101, 3600);
  expect(a === b, `hash ${a} then ${b}`);
});
T('determinism.a different seed gives a different match', () => {
  expect(proof(101, 1200) !== proof(202, 1200), 'two seeds give two matches');
});
