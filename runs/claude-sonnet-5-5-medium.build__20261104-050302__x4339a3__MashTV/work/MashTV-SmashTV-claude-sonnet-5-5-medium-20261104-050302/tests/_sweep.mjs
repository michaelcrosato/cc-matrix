import { load } from './lib.mjs';
const ids = process.argv.slice(2);
for (const id of (ids.length ? ids : ['1-1'])) {
  const { game, MT } = load();
  game.advance(.3);
  MT.warp(id, { players: 2, bot: true, god: true, mode: 'test' });
  const t0 = Date.now(); let t = 0, snap;
  for (; t < 300; t += 1) { game.advance(1); snap = game.debug.snapshot(); if (['clear', 'exit'].includes(snap.phase) || snap.scene !== 'play') break; if (game.errors.length) break; }
  console.log(id, 'phase', snap.phase, 'at', t, 's', 'alive', snap.alive, JSON.stringify(snap.byKind), 'cash', snap.players.map(p => p.cash), 'errors', game.errors.map(e => (e.message || String(e)) + (e.stack ? ' ' + e.stack.split('\n')[1] : '')), (Date.now() - t0) + 'ms');
}
