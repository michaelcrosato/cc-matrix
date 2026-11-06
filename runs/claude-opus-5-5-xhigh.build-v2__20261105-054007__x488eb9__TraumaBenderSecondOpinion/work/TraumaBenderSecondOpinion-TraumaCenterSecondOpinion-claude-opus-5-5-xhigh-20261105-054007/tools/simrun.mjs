// A sim-only harness: load the sources the manifest calls "sim" in a vm, and run one case with the bot. Shared by the tests and balance runs.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
export function loadSim(extra = {}) {
  const ctx = { console, performance, structuredClone, ...extra }; ctx.window = ctx; vm.createContext(ctx);
  const man = JSON.parse(readFileSync(new URL('src/manifest.json', root), 'utf8'));
  for (const f of man.sim) vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
  return ctx;
}
export function runCase(ctx, id, o = {}) {
  const G = ctx.GAME, S = G.Op.create(id, { difficulty: o.diff || 'resident', seed: o.seed ?? 1234, players: o.players, dev: o.dev, phase: o.phase });
  const bots = S.hands.map((h, i) => G.Bot.create(S, i, o.skill || {}));
  const dt = 1 / 120; let n = 0; const max = (o.maxSeconds || 1200) * 120;
  while (S.status !== 'closed' && S.status !== 'lost' && n++ < max) { const inputs = bots.map(b => G.Bot.step(b, S, dt)); G.Op.step(S, inputs, dt); if (o.onStep) o.onStep(S, n); }
  return { S, secs: n / 120 };
}
