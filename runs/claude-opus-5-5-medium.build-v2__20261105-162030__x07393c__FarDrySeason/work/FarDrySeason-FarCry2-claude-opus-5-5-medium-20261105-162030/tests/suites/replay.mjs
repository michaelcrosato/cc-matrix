// Record a mission segment, replay it, compare the fingerprint.
import { boot, fakeStorage } from '../lib/boot.mjs';
import { createGame } from '../../src/game.js';
fakeStorage();
let pass = 0, fail = 0; const ok = (c, n) => { if (c) pass++; else { fail++; console.log(`FAIL ${n}`); } };
const { e, game: g } = await boot({ seed: 5 });
e.input.setKey('Enter', true); e.step(2); e.input.setKey('Enter', false); e.step(2);
// A short walk and some shooting from the title's first action, all through input.
const seq = [['Enter', 2], [null, 10], ['KeyW', 60], ['KeyD', 30], [null, 30], ['MouseLeft', 20], ['KeyM', 2], [null, 40], ['KeyM', 2], ['Space', 2], [null, 30]];
for (const [k, n] of seq) { if (k) e.input.setKey(k, true); e.step(n); if (k) e.input.setKey(k, false); e.step(2); }
const end = e.fingerprint(), rec = e.recording();
ok(rec && rec.frames?.length > 100, 'recording exists');
await e.replay(rec, () => e.loadGame(createGame({})));
ok(e.fingerprint() === end, `replay matches: ${e.game.status()} ${g.status()}`);
ok(e.errors.length === 0, `no errors ${e.errors[0]}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(0);
