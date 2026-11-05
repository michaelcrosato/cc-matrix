import { boot } from '../lib/game.mjs';
import { Bus } from '../lib/fakehub.mjs';
const tick = () => new Promise(r => setImmediate(r));
async function round(n, o = {}) {
  const bus = new Bus(n, o), Gs = [];
  for (let i = 0; i < n; i++) Gs.push(await boot({ AIHub: bus.hub(i) }));
  for (let k = 0; k < 5; k++) { await tick(); for (const G of Gs) G.game.advance(1 / 60); }
  const step = s => { for (let t = 0; t < s; t += 1 / 30) { bus.step(1 / 30); for (let i = 0; i < n; i++) if (!bus.copies[i].left) Gs[i].game.advance(1 / 30); } };
  return { bus, Gs, step };
}
export default async ({ check }) => {
  // 2 players, perfect network
  const A = await round(2), [g0, g1] = A.Gs.map(G => G.game);
  check('every copy calls ready() with no key press', A.bus.copies.every(c => c.readyCalled === 1));
  check('every copy shows its own card', A.Gs.every(G => G.game.scene.card));
  A.bus.card({}); g0.input.tap('start'); g1.input.press('Enter'); A.step(.1); g1.input.release('Enter');
  check('the card answers Ready on Enter', A.bus.copies.every(c => c.answers.includes('ready')), JSON.stringify(A.bus.copies.map(c => c.answers)));
  g0.input.tap('place'); A.step(.1); check('the card answers More time on Triangle', A.bus.copies[0].answers.includes('more'));
  A.bus.start(); A.step(.2); check('start replaces the card with the round', A.Gs.every(G => !G.game.scene.card));
  A.step(3.2); const B0 = g0.scene.bee, B1 = g1.scene.bee;
  check('play begins when the hub clock reaches 0', B0.phase === 'build' && B1.phase === 'build', [B0.phase, B1.phase]);
  // the client builds: its actions reach the host, and every copy converges
  const c1 = B1.ctx, b1 = c1.builder, site = c1.town.pattern.cells.filter(c => c.block && !c.clear && !c.fill && c.z === c1.town.pattern.z).slice(0, 4);
  for (const c of site) { b1.target.plc = { x: c.x, y: c.y, z: c.z }; b1.target.inPlc = true; b1.hotbar[0] = A.Gs[1].DQ.BLOCKS[c.block].key; b1.sel = 0; b1.bag.add(b1.hotbar[0], 2); b1.blockedByBody = () => false; b1.place(); A.step(.3); }
  A.step(2);
  check('the host applies the client\'s blocks', site.every(c => B0.ctx.world.get(c.x, c.y, c.z) === c.block));
  check('every copy\'s world converges (same hash)', B0.ctx.world.hash() === B1.ctx.world.hash());
  check('the host credits the placer (+3 a block)', B0.scores[1] >= 12, JSON.stringify(B0.scores));
  check('game traffic flows both ways', A.bus.copies.every(c => c.sent.length > 0));
  // the client sees the host's monsters from snapshots
  const m = B0.ctx.monsters.spawnCell('lintling', 10, 30); A.step(1);
  check('monsters move on clients from snapshots', B1.ctx.monsters.list.some(q => q.uid === m.uid && Math.abs(q.body.x - m.body.x) < 24));
  // rates and sizes
  const rate = c => { let worst = 0; for (const s of c.sent) { const n = c.sent.filter(q => q.t > s.t - 1 && q.t <= s.t).length; worst = Math.max(worst, n); } return worst; };
  check('each copy sends at most 20 messages a second', A.bus.copies.every(c => rate(c) <= 20), A.bus.copies.map(rate).join(','));
  check('every payload stays under 16 KB, unreliable under 1,200 bytes', A.bus.copies.every(c => c.sent.every(s => s.size < 16384 && (s.reliable || s.size <= 1200))), Math.max(...A.bus.copies.flatMap(c => c.sent.filter(s => !s.reliable).map(s => s.size))));
  // time-up: the host finishes within the grace, once, with valid standings
  A.bus.timeUp(); A.step(.5);
  check('time-up: the host calls finish() once', A.bus.finished.length === 1 && A.bus.finished[0].from === 0);
  const r = A.bus.finished[0].r; check('standings list every player once', r.standings.flat().sort().join(',') === '0,1' && typeof r.scores[0] === 'number');
  A.bus.end('finished'); A.step(.2);
  check('end stops input and sound', A.Gs.every(G => G.game.scene.bee.ended && G.game.audio.muted));
  // 4 players with latency 150 +- 50 ms and 5% loss; a player leaves
  const C = await round(4, { latency: 150, jitter: 50, loss: .05 }); C.bus.card({}); C.bus.start(); C.step(4);
  const H = C.Gs[0].game.scene.bee; check('4 players: the barn has crenellations', H.pid === 'barn3');
  const cl = C.Gs[2].game.scene.bee, cb = cl.ctx.builder, cells = cl.ctx.town.pattern.cells.filter(c => c.block && !c.clear && !c.fill && c.z === cl.ctx.town.pattern.z).slice(10, 14);
  for (const c of cells) { cb.target.plc = { x: c.x, y: c.y, z: c.z }; cb.target.inPlc = true; cb.hotbar[0] = 'cobble'; cb.sel = 0; cb.bag.add('cobble', 2); cb.blockedByBody = () => false; cb.place(); C.step(.25); }
  C.step(3); check('with latency and loss every copy converges', C.Gs.every(G => G.game.scene.bee.ctx.world.hash() === H.ctx.world.hash()));
  C.bus.leave(3); C.step(1); check('a player leaving removes their builder', !H.ctx.builders.some(b => b.id === 3) && H.left.has(3));
  C.bus.timeUp(); C.step(.5); const r2 = C.bus.finished[0] && C.bus.finished[0].r;
  check('the leaver is left out of the standings', r2 && !r2.standings.flat().includes(3) && r2.standings.flat().length === 3, r2 && JSON.stringify(r2.standings));
  // server mode: a host with no player of its own runs the round and finishes
  const S = await round(3, { server: true }); S.bus.card({}); S.bus.start(); S.step(4);
  const SH = S.Gs[0].game.scene.bee; check('server mode: the host has no local builder', SH.server && !SH.ctx.builder && SH.isHost);
  check('server mode: the host sends snapshots', S.bus.copies[0].sent.length > 10);
  S.bus.timeUp(); S.step(.5); check('server mode: the host finishes the round', S.bus.finished.length === 1 && S.bus.finished[0].r.standings.flat().length === 2, JSON.stringify(S.bus.finished));
  check('no errors', [...A.Gs, ...C.Gs, ...S.Gs].every(G => !G.game.errors.length), [...A.Gs, ...C.Gs, ...S.Gs].map(G => G.errs()).join(' '));
};
