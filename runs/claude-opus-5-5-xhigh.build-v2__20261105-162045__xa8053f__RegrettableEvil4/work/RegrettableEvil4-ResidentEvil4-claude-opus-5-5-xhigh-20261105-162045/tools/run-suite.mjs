// Runs one Node test suite in this process. A suite default-exports async (t) => { t.ok(...) }.
const url = process.argv[2];
let passed = 0;
let failed = 0;
const t = {
  ok(cond, msg) { if (cond) passed++; else { failed++; console.log(`@@FAIL ${msg}`); } return !!cond; },
  eq(a, b, msg) { return t.ok(a === b, `${msg} (got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)})`); },
  near(a, b, eps, msg) { return t.ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, wanted ${b} within ${eps})`); },
  log(...a) { if (process.env.TEST_VERBOSE) console.log(...a); },
};
try {
  const mod = await import(url);
  await mod.default(t);
} catch (e) {
  failed++;
  console.log(`@@FAIL threw: ${String(e?.stack ?? e).split('\n').slice(0, 8).join(' | ').slice(0, 1400)}`);
}
console.log(`@@COUNT ${passed} ${failed}`);
process.exit(0);
