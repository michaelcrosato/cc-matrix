import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); e.step(5);
let t = Date.now(); game.flow.startRound(); console.log('start ms', Date.now() - t); t = Date.now(); e.step(30); console.log('30 steps ms', Date.now() - t, game.mode, JSON.stringify(game.state().round), e.errors.slice(0, 3));
t = Date.now(); e.step(300); console.log('300 steps ms', Date.now() - t, game.round.clockMs(), JSON.stringify(game.state().round), e.errors.slice(0, 3));
t = Date.now(); e.step(60 * 360); console.log('6 min ms', Date.now() - t, game.round.clockMs(), JSON.stringify(game.state().round), game.state().screen, 'finished', game.life.finished, e.errors.slice(0, 3));
console.log(JSON.stringify(game.session.results)?.slice(0, 300));
