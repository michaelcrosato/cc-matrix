// the suites' tiny check framework: check(name, ok, detail) prints only failures; done() reports the counts as JSON
let passed = 0, failed = 0; const fails = [], oks = [];
export function check(name, ok, detail = '') { if (ok) { passed++; oks.push(name); } else { failed++; fails.push(name); console.log('FAIL ' + name + (detail ? ': ' + String(detail).slice(0, 400) : '')); } return ok; }
export function done(suite) { console.log('@@PASSED ' + JSON.stringify(oks)); console.log('@@RESULT ' + JSON.stringify({ suite, passed, failed })); process.exit(0); }
export function guard(suite, fn) { Promise.resolve().then(fn).then(() => done(suite)).catch(e => { check(suite + ' crashed', false, (e && e.stack || e).toString().split('\n').slice(0, 4).join(' / ')); done(suite); }); }
