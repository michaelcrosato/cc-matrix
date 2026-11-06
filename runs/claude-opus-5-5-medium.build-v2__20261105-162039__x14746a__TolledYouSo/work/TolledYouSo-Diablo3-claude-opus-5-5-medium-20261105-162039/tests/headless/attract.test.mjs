// Attract: idle 600 frames on the title and on the menu: it starts. Any key exits. It loops twice with no errors, covering each stop. Saves untouched.
import { ok, eq, guarded } from '../lib.mjs';
import { press, start, toMenu } from './lib.mjs';
import { STOPS } from '../../src/modes/attract.js';
await guarded(async () => {
  const { game: g, engine: e } = await start();
  const save = JSON.stringify(g.save);
  e.step(590); eq(g.shell.state, 'title', 'still on the title before 10 s'); e.step(20); eq(g.shell.state, 'attract', 'attract starts on the title after 10 s');
  e.step(10); press(e, 'KeyA'); e.step(2); eq(g.shell.state, 'title', 'any key exits to the title');
  toMenu(e); eq(g.shell.state, 'menu', 'menu'); e.step(605); eq(g.shell.state, 'attract', 'attract starts on the menu');
  e.step(10); press(e, 'Enter'); e.step(2); eq(g.shell.state, 'menu', 'any key exits to the menu');
  e.step(605); eq(g.shell.state, 'attract', 'attract again');
  const a = g.shell.attract; const totalT = 16 * 8 + 10; let kills = 0; const visits = {};
  for (let i = 0; i < totalT * 60 * 2 + 900; i++) { e.step(1); visits[STOPS[a.i]] = 1; kills = Math.max(kills, g.play.world?.stats.kills ?? 0); }
  for (const s of STOPS) ok(a.visited[s] >= 1, `attract visited ${s}`);
  ok(a.loops >= 2, `attract looped twice: ${a.loops}`); eq(e.errors.length, 0, `no errors: ${e.errors[0]}`);
  eq(g.shell.state, 'attract', 'still attracting'); ok(kills > 0, 'bots fight');
  eq(JSON.stringify(g.save), save, 'saves untouched');
  press(e, 'Space'); e.step(2); eq(g.shell.state, 'menu', 'exits');
  e.dispose();
});
