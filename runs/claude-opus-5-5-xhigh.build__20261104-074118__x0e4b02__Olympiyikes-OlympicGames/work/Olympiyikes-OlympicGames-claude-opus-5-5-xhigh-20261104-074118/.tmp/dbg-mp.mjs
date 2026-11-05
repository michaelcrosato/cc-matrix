import { boot } from '../tests/harness.mjs';
const h = boot(), { O, game } = h; game.start({ scenes: O.scenes, scene: 'title' }); game.advance(.5);
for (let p = 1; p <= 3; p++) game.addPlayer({ pad: p });
const nats = ['SUN', 'FRM', 'TRB', 'BON'];
O.meet = O.flow.newMeet({ mode: 'single', events: ['sprint'], players: game.players.map((inp, i) => ({ input: inp, nation: nats[i] })), seed: 4242 }); game.go('ev:sprint', {}, { fade: 0 }); game.advance(.2);
O.bus.on('yikes', e => console.log('YIKES', e.kind, e.a.nation, e.a.human, JSON.stringify(e.a.I).slice(0, 80), O.Run.ctx.s.phase, O.Run.ctx.s.t.toFixed(2))); const ctx = O.Run.ctx; h.until(() => ctx.phase === 'play' && ctx.s, 20, .1); console.log('phase', ctx.phase, ctx.s && ctx.s.phase);
for (let i = 0; i < 700 && ctx.s.phase !== 'race'; i++) game.advance(1 / 60); console.log('now', ctx.s.phase, ctx.s.t.toFixed(2), 'gun', ctx.s.gunT);
for (let i = 0; i < 240; i++) { game.players[0].tap(i % 2 ? 'mashL' : 'mashR'); game.advance(1 / 60); }
console.log(ctx.s.lanes.filter(l => l.a.human).map(l => [l.a.nation, l.started, l.d.toFixed(1), l.dq, l.yellow].join(':')).join(' '), 'mash', ctx.humans[0].mash.smooth.toFixed(1), 'notes', ctx.humans.map(a => a.notes.join('/')).join(','), h.errors());
