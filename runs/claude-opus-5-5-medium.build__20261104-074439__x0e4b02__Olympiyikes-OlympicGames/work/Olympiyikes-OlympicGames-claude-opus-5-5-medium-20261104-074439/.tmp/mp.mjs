import { boot } from '../tests/harness.mjs';
const c = boot(), O = c.OLY, game = O.game; game.advance(.3);
game.addPlayer({ pad: 1 }); game.addPlayer({ pad: 2 }); game.addPlayer({ pad: 3 });
const players = ['SUN', 'TRB', 'BON', 'WAV'].map((n, k) => ({ nat: n, input: k, color: '#fff' }));
const m = O.flow.newMeet('single', { events: ['sprint'], players }); O.flow.begin(m); game.go('ev:sprint', { noIntro: true }); game.advance(.6);
let n = 0; while ((!O.ctx.S || O.ctx.S.stage !== 'race') && n < 600) { game.advance(1 / 60); n++; }
console.log(n, game.sceneName, O.ctx.phase, O.ctx.S.stage, O.ctx.humans.map(a => a.id + (a.input === game.players[a.player]) ));
for (let i = 0; i < 120; i++) { game.players[0].tap(i % 2 ? 'mashL' : 'mashR'); game.advance(1/60); }
console.log(O.ctx.athletes.filter(a=>a.human).map(a => a.S.state + ' ' + a.S.d.toFixed(1) + ' ' + a.notes));
