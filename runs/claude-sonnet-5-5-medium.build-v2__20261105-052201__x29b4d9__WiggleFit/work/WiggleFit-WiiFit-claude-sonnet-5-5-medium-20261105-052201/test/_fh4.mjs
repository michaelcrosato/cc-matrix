import { makeStub, run, tuning } from './headless.mjs';
import { FruitHat } from '../src/events/fruitHat.js';
const game = await makeStub();
const ev = new FruitHat(game, { tier: 0, seed: 2, lanes: [{ kind: 'bot', skill: 'sharp', bankAt: 7 }] });
const l = ev.lanes[0]; const buf = [];
ev.onFall = (lane) => { console.log(buf.join('\n')); };
run(ev, 30, (e, i) => { if (i % 12 === 0) { buf.push(`t=${e.t.toFixed(2)} wish=${l.bal.wishX.toFixed(2)},${l.bal.wishZ.toFixed(2)} cob=${l.bal.cobX.toFixed(2)},${l.bal.cobZ.toFixed(2)} lean=${l.bal.leanDeg.toFixed(1)} hat=${l.hat.length} nx=${l.bal.nx.toFixed(2)},${l.bal.nz.toFixed(2)}`); if (buf.length > 40) buf.shift(); } });
