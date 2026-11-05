import { load } from '../tests/lib/vm.mjs';
const ctx = load(), E = ctx.My3D2dge, g = E.current, SN = ctx.SN, I = g.input;
const err = () => g.errors.map(e => e.message + ' @' + (e.stack || '').split('\n').slice(1, 3).join(' ')).join('\n');
const tap = (a, t = .3) => { I.tap(a); g.advance(t); };
g.advance(1); console.log('1', g.sceneName);
tap('confirm', .6); console.log('2', g.sceneName, SN.UI.top().id, SN.UI.items().map(i => i.id).join(','));
SN.UI.focus = 1; tap('confirm'); console.log('3', SN.UI.top().id);
tap('confirm'); console.log('4', SN.UI.top().id);
tap('confirm'); console.log('5', SN.UI.top().id);
SN.UI.focus = 3; tap('confirm'); console.log('6', SN.UI.top().id, SN.UI.items().map(i => i.id).join(','));
SN.UI.focus = SN.UI.items().findIndex(i => i.id === 'start'); tap('confirm', 1.5); console.log('7', g.sceneName);
const R = SN.scenes.race.race; console.log('race', R && R.mode, R && R.state, R && R.ships.length);
// drive with the AI as a bot
const bot = () => { const c = SN.AI.controls(R.humans[0], R, { skill: 1 }); Object.assign(SN.vpad[0], { steer: c.steer, pitch: c.pitch, thrust: c.thrust, brakeL: c.brakeL, brakeR: c.brakeR, fire: c.fire, firePressed: c.firePressed, fireReleased: c.fireReleased, absorb: c.absorb }); };
for (let k = 0; k < 120 * 200 && g.sceneName === 'race'; k++) { bot(); g.advance(1 / 120); }
console.log('8', g.sceneName, R.state, R.humans[0].place, R.humans[0].finishTime.toFixed(1), 'errors', g.errors.length);
console.log(err());
