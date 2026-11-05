// a tiny check helper: check(name, ok, detail); done() prints RESULT pass fail. VERBOSE=1 also lists each pass.
let pass = 0, fail = 0;
export const check = (name, ok, detail = '') => {
  if (ok) { pass++; if (process.env.VERBOSE) console.log('ok   ' + name + (detail ? '  [' + String(detail).slice(0, 160) + ']' : '')); }
  else { fail++; console.log('FAIL ' + name + (detail ? ': ' + String(detail).slice(0, 400) : '')); }
  return ok;
};
export const done = () => { console.log(`RESULT ${pass} ${fail}`); process.exit(0); };
