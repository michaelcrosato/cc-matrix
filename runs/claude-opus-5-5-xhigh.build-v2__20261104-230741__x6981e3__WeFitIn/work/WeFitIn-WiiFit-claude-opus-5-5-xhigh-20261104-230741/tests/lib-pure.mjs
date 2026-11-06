// The results line and asserts, without importing the engine (browser test processes).
const results = [];
export async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); } catch (e) { results.push({ name, ok: false, detail: e?.stack?.split('\n').slice(0, 3).join(' | ') ?? String(e) }); }
}
export function done() { process.stdout.write(`\n@@RESULTS ${JSON.stringify(results)}\n`, () => process.exit(0)); }
export function assert(c, msg = 'assertion failed') { if (!c) throw new Error(msg); }
export const eq = (a, b, msg = '') => { if (a !== b) throw new Error(`${msg} expected ${b} got ${a}`); };
export const near = (a, b, tol, msg = '') => { if (Math.abs(a - b) > tol) throw new Error(`${msg} expected ${b} +- ${tol} got ${a}`); };
