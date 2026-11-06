// A tiny assert kit: failures print, the count goes last.
let pass = 0; let fail = 0;
export const ok = (c, msg) => { if (c) pass++; else { fail++; console.log(`FAIL ${msg}`); } return !!c; };
export const eq = (a, b, msg) => ok(a === b, `${msg}: got ${JSON.stringify(a)?.slice(0, 200)}, wanted ${JSON.stringify(b)?.slice(0, 200)}`);
export const done = () => { console.log(`RESULT ${pass} ${fail}`); process.exitCode = fail ? 1 : 0; };
export const guarded = async (fn) => { const limit = setTimeout(() => { fail++; console.log('FAIL timed out'); done(); process.exit(1); }, Number(process.env.TEST_LIMIT ?? 480000)); try { await fn(); } catch (e) { fail++; console.log(`FAIL threw: ${e?.stack ?? e}`); } clearTimeout(limit); done(); process.exit(fail ? 1 : 0); };
