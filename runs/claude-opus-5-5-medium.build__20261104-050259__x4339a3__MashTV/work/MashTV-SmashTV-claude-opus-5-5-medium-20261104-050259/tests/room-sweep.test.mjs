// every room: warp in, 2 god-mode bots play to CLEAR (or the boss's death) within 240 s of game time; no errors; the data's kinds appeared
import { boot, suite, until, errs } from './lib.mjs';
export default async () => {
  const S = suite('room-sweep');
  const g = boot();
  const ids = Object.keys(g.MT.ROOMS);
  for (const id of ids) {
    const R = g.MT.ROOMS[id];
    g.MT.newRun({ mode: 'test', seed: 11, players: [{ slot: 0, look: 0, ctl: 'bot' }, { slot: 1, look: 1, ctl: 'bot' }] });
    g.MT.CHEATS.god = true; g.MT.setTune('dmgMul', 3, false);
    g.game.go('play', { room: id, noCard: true }); g.adv(.3);
    const W = g.MT.Show.W;
    const done = until(g, () => !g.MT.Show.W || g.MT.Show.W !== W || W.phase === 'exit' || W.phase === 'clear' || W.phase === 'done' || g.snap().scene !== 'play', 240, .5);
    S.check(id + ' reaches its end', done, JSON.stringify({ phase: W.phase, alive: W.alive(), wave: W.waveIdx, pend: W.pending(), byKind: g.snap().byKind, boss: g.snap().boss && g.snap().boss.phase }));
    const want = new Set(); for (const w of R.waves || []) for (const s of w.spawn || []) want.add(s[1] === 'discoBig' ? 'disco' : s[1]); for (const p of R.place || []) want.add(p[0]);
    for (const k of want) S.check(id + ' spawned ' + k, (W.stats.spawned[k] || W.stats.spawned[k === 'disco' ? 'discoBig' : k] || 0) > 0);
    if (R.key) S.check(id + ' gave its key', W.keyGiven, R.key.rule);
    S.check(id + ' no errors', g.game.errors.length === 0, errs(g).slice(0, 2).join(' | '));
    g.game.errors.length = 0; g.MT.CHEATS.god = false; g.MT.resetTunes();
  }
  return S;
};
