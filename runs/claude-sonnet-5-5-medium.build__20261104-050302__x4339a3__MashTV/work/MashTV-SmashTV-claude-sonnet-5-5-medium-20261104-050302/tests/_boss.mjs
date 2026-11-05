import { load } from './lib.mjs';
for (const id of process.argv.slice(2)) {
  const { game, MT } = load();
  game.advance(.3); MT.warp(id, { players: 2, bot: true, god: true, mode: 'test' }); MT.test = { noFlow: true };
  const t0 = Date.now(); let t = 0, snap, last = '';
  for (; t < 400; t += 1) { game.advance(1); snap = game.debug.snapshot(); const k = snap.phase + '/' + (snap.boss && (snap.boss.phase + snap.boss.sub + (snap.boss.stage || ''))); if (k !== last) { last = k; console.log('  t', t, k); } if (snap.phase === 'clear' || snap.scene !== 'play') break; if (game.errors.length) break; }
  console.log(id, 'phase', snap.phase, 'at', t, 's', JSON.stringify(snap.boss && snap.boss.parts.map(p => p[0] + ':' + p[1])), 'errors', game.errors.map(e => (e.message || String(e)) + (e.stack ? ' ' + e.stack.split('\n').slice(0, 3).join('|') : '')), (Date.now() - t0) + 'ms');
}
