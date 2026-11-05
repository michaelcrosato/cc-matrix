import { makeGame } from '../tools/node-env.mjs';
const { game, app } = await makeGame();
game.addPlayer({ keys: 'right' }); app.modes.splitRace('S2'); game.advance(1);
console.log(game.players.map(p => p.keys + ':' + JSON.stringify(p.map.camera) + ' resp ' + JSON.stringify(p.map.respawn)));
game.input.tap('confirm'); game.advance(.1); game.advance(6);
const R = app.race; console.log(R.players.map(P => P.cam.mode + ' ' + P.run.car.p.map(v => v.toFixed(1)) + ' cam ' + (P.cam.pos || []).map(v => v.toFixed(1))));
