// AI Hub shared-world rounds over a fake hub: 2 and 4 copies (and a server copy), seeded latency, jitter and loss.
// Checks: connect and ready with no key press, the card's answers, bots building and breaking with every copy's world
// converging, monsters on clients, message rates and sizes, a player leaving, time-up -> one finish with valid
// standings, end stopping input and sound, and the game unchanged outside a session.
import { makeBus } from './fakehub.mjs';
const tick = () => new Promise(r => setImmediate(r));
export default async function ({ load, check }) {
  async function round(n, o = {}) {
    const bus = makeBus(n, o), games = [];
    for (const hub of bus.hubs) { const L = load({ AIHub: hub, test: { skipCutscenes: true } }); games.push(L); }
    for (const L of games) { await L.game.booted; L.game.advance(.05); }
    for (let i = 0; i < 6; i++) { await tick(); for (const L of games) L.game.advance(.05); }
    const tag = n + 'p' + (o.server ? ' server' : '') + (o.loss ? ' lossy' : '');
    check(tag + ': every copy opens straight into the Bee and connects', games.every(L => L.game.sceneName === 'bee') && bus.hubs.every(h => h.opts && h.opts.mode === 'shared-world' && h.opts.card === true), games.map(L => L.game.sceneName).join());
    check(tag + ': ready() with no key press', bus.hubs.every(h => h.readyCalled));
    bus.card(15000); for (const L of games) L.game.advance(.05);
    const p0 = games[0]; p0.game.input.tap('ok'); p0.game.advance(.05); p0.game.input.tap('alt2'); p0.game.advance(.05);
    check(tag + ': the card answers Ready (Enter / Cross) and More (Triangle)', bus.hubs[0].answers.includes('ready') && bus.hubs[0].answers.includes('more'), bus.hubs[0].answers.join());
    bus.start();
    const step = (s, cb) => { for (let t = 0; t < s; t += .05) { bus.step(50); for (const L of games) if (!L.dead) L.game.advance(.05); if (cb) cb(t); } };
    step(3.2);
    check(tag + ': play begins at time 0', games.every(L => L.DQ.SCENES.bee.state === 'play'), games.map(L => L.DQ.SCENES.bee.state).join());
    // bots: each player's builder is driven by an autopilot that places and breaks
    const drivers = games.map((L, k) => { const c = L.DQ.ctx; if (!c.builder) return null; const ap = new L.DQ.Autopilot(c, c.builder, {}); c.driver = ap; return ap; });
    games.forEach((L, k) => { const ap = drivers[k]; if (!ap) return; const DQ = L.DQ, c = DQ.ctx, b = c.builder; b.bag.add('planks', 30); b.bag.add('cobble', 30);
      ap.run((function* () { for (let i = 0; i < 6; i++) { const x = 8 + k * 3 + (i % 3), y = 32 + Math.floor(i / 3), z = c.world.topZ(x, y); yield* ap.placeAt(x, y, z, i % 2 ? 'planks' : 'cobble', { timeout: 3 }); yield .2; } yield* ap.breakAt(8 + k * 3, 32, c.world.topZ(8 + k * 3, 32) - 1, { timeout: 4, collect: false }); })()); });
    step(14);
    step(3);   // quiescence
    const hashes = games.map(L => L.DQ.ctx.world.hash());
    check(tag + ': after quiescence every copy has the same world', hashes.every(h => h === hashes[0]), hashes.join());
    check(tag + ': edits happened', games[0].DQ.ctx.world.diff().length > 4, games[0].DQ.ctx.world.diff().length);
    const hostCtx = games.find(L => L.DQ.ctx.net && L.DQ.ctx.net.host).DQ.ctx;
    check(tag + ': the host sees every player', hostCtx.builders.length >= n, hostCtx.builders.length);
    // a client's craft scores on the host
    if (n === 2 && !o.server) { const cl = games.find(L => L.DQ.ctx.net && L.DQ.ctx.net.client), cc = cl.DQ.ctx, r = cl.DQ.RECIPES.find(q => q.station === 'pocket');
      const hostL = games.find(L => L.DQ.ctx.net && L.DQ.ctx.net.host), round = hostL.DQ.SCENES.bee.round, me = cc.builder.id, s0 = round.scores[me] || 0;
      cc.crafting.allKnown = true; for (const k in r.in) cc.builder.bag.add(k, r.in[k]); const made = cc.crafting.craft(r.id, 1, cc.builder, { quiet: true }); step(.5);
      check(tag + ': a client craft reaches the host score and stats', made === 1 && round.stats[me].Crafted === 1 && round.scores[me] === s0 + 1, JSON.stringify([made, round.stats[me], s0, round.scores[me]])); }
    // monsters reach clients as puppets
    const client = games.find(L => L.DQ.ctx.net && L.DQ.ctx.net.client);
    if (client) check(tag + ': monsters move on clients from snapshots', client.DQ.ctx.monsters.list.some(m => m.puppet && !m.dead), client.DQ.ctx.monsters.list.length);
    // message rates and sizes
    for (const h of bus.hubs) {
      const s = h.sent, last = s.filter(m => m.t > bus.now - 1000).length, max = Math.max(0, ...s.map(m => m.bytes)), unrel = Math.max(0, ...s.filter(m => !m.reliable).map(m => m.bytes));
      check(tag + ': copy ' + h.me + ' sends at most 20 messages a second', last <= 20, last);
      check(tag + ': copy ' + h.me + ' payloads stay small (<= 16 KB, unreliable <= 1200 B)', max <= 16384 && unrel <= 1200, [max, unrel]);
    }
    check(tag + ': traffic flows both ways', bus.hubs.every(h => h.sent.length > 0) && games.every(L => !L.DQ.ctx.net || L.DQ.ctx.net.stats.recv > 0));
    // a player leaves
    if (n >= 3) { const gone = games[n - 1]; gone.dead = true; bus.leave(n - 1); step(.6); check(tag + ': a player leaving removes their builder', !hostCtx.builders.some(b => b.id === n - 1), hostCtx.builders.map(b => b.id).join()); }
    // the raid comes, then time-up: the host finishes once, with valid standings
    step(25);
    check(tag + ': the raid phase arrives', games.every(L => L.dead || ['raid', 'over'].includes(L.DQ.SCENES.bee.round.phase)), games.map(L => L.DQ.SCENES.bee.round && L.DQ.SCENES.bee.round.phase).join());
    bus.timeUp(); step(.5);
    check(tag + ': time-up -> the host calls finish() once', bus.finished.length === 1 && bus.finished[0].from === bus.hubs.find(h => h.isHost).me, JSON.stringify(bus.finished.map(f => f.from)));
    const f = bus.finished[0] && bus.finished[0].r, ids = (f ? f.standings.flat() : []);
    const present = bus.hubs.filter(h => !h.gone && !h.server).map(h => h.me);
    check(tag + ': standings list every player once', f && present.every(id => ids.filter(x => x === id).length === 1) && ids.length === present.length, JSON.stringify(f && f.standings));
    check(tag + ': finish carries scores, won, stats', f && typeof f.won === 'boolean' && f.scores && f.stats && Object.keys(f.stats).length === present.length);
    bus.end('finished'); step(.3);
    check(tag + ': end stops the round (input and sound)', games.every(L => L.dead || (L.DQ.SCENES.bee.state === 'ended')));
    const sentAfter = bus.hubs.map(h => h.sent.length); step(1); check(tag + ': nothing is sent after end', bus.hubs.every((h, i) => h.sent.length === sentAfter[i]));
    check(tag + ': no errors on any copy', games.every(L => !L.game.errors.length), games.map(L => L.game.errors.map(e => e.where + ': ' + e.message + ' ' + String(e.stack || '').split('\n')[1]).join(' | ')).join(' || '));
  }
  await round(2);
  await round(4, { latency: 150, jitter: 50, loss: .05 });
  await round(2, { server: true });
  // outside a session nothing changes
  const L = load({ test: {} }); await L.game.booted; L.game.advance(.3);
  check('outside a session the game starts at the title', L.game.sceneName === 'title' && !L.DQ.HUB, L.game.sceneName);
}
