// A very small test harness. Suites call t.ok / t.near and finish with t.done().
export function suite() {
  const failures = []; let passed = 0;
  const t = {
    ok(cond, msg) { if (cond) passed++; else failures.push(msg); return !!cond; },
    near(a, b, tol, msg) { return t.ok(Math.abs(a - b) <= tol, `${msg}: got ${typeof a === 'number' ? a.toFixed(2) : a}, want ${b} +/- ${tol}`); },
    eq(a, b, msg) { return t.ok(a === b, `${msg}: got ${a}, want ${b}`); },
    done() { process.stdout.write(`\n@@RESULT ${JSON.stringify({ passed, failed: failures.length, failures })}\n`); process.exit(0); },
  };
  return t;
}
