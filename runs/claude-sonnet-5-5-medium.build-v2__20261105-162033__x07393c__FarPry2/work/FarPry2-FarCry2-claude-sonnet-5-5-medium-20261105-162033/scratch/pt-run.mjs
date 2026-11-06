import { play } from '../tests/suites/playthrough.mjs';
let n = 0; const t = { ok(c, m) { n++; if (!c) console.log('FAIL', m); }, eq(a, b, m) { n++; if (JSON.stringify(a) !== JSON.stringify(b)) console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); }, fail(m) { console.log('FAIL', m); } };
const which = process.argv[2] || '0';
await play(t, 'scratch', which === '0' ? { finishBuddy: false, shoot: true, give: false, deadBuddy: false } : { finishBuddy: true, shoot: false, give: true, deadBuddy: true });
console.log('checks', n);
