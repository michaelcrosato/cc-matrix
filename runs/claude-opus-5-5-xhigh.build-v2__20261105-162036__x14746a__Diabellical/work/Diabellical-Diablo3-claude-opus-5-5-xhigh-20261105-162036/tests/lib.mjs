// A very small test kit: named tests, thrown errors are failures.
export const tests = [];
export const test = (name, fn) => tests.push({ name, fn });
export function assert(cond, msg = 'assertion failed') { if (!cond) throw new Error(msg); }
export function eq(a, b, msg = '') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
export function near(a, b, tol, msg = '') { if (Math.abs(a - b) > tol) throw new Error(`${msg} expected ${b} +- ${tol}, got ${a}`); }
