// A test file's checks: t.ok(name, cond, detail); results go to stdout as JSON lines for tests/run.mjs.
export function run(suite, fn) {
  const out = [], t = { ok(name, cond, detail = '') { out.push({ suite, name, pass: !!cond, detail: cond ? '' : String(typeof detail === 'function' ? detail() : detail).slice(0, 600) }); return !!cond; }, near(a, b, eps = 1e-6) { return Math.abs(a - b) <= eps; } };
  Promise.resolve().then(() => fn(t)).catch(e => out.push({ suite, name: 'threw', pass: false, detail: String(e && e.stack || e).slice(0, 900) })).finally(() => { for (const r of out) process.stdout.write(JSON.stringify(r) + '\n'); });
}
