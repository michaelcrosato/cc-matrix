import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); e.step(5); game.flow.startRound(); game.godMode = true; e.step(60 * 4);
const p = game.round.players[1]; console.log('clock', game.round.clockMs(), 'playing', game.round.playing(), 'host', game.session.isHost);
for (let i = 0; i < 5; i++) { e.step(20); console.log(p.pos.toArray().map((v) => +v.toFixed(2)), p.ctrl.feet.toArray().map((v) => +v.toFixed(2)), p.ctrl.velocity.toArray().map((v) => +v.toFixed(1)), p.ctrl.grounded); }
