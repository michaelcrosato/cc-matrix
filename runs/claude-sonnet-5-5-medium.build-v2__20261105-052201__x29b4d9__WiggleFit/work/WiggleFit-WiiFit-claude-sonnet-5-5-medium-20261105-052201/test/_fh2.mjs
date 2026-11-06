import { makeStub, run } from './headless.mjs';
import { FruitHat } from '../src/events/fruitHat.js';
const game = await makeStub();
const ev = new FruitHat(game, { tier: 0, seed: 1, lanes: [{ kind: 'bot', skill: 'sharp', bankAt: 7 }] });
const l = ev.lanes[0]; let peak = 0; const log = [];
const orig = ev.onFall; ev.onFall = (lane) => { log.push(`fall t=${ev.t.toFixed(1)} lean=${lane.bal.leanDeg.toFixed(1)} hat=${lane.hat.length}`); orig.call(ev, lane); };
run(ev, 66, (e, i) => { peak = Math.max(peak, l.bal.leanDeg); if (i % 240 === 0 && i < 2400) log.push(`t=${e.t.toFixed(1)} lean=${l.bal.leanDeg.toFixed(1)} hat=${l.hat.length} spawned=${e.spawned.filter(f=>!f.dead).length} wish=${l.bal.wishX.toFixed(2)},${l.bal.wishZ.toFixed(2)} cob=${l.bal.cobX.toFixed(2)},${l.bal.cobZ.toFixed(2)}`); });
console.log(log.join('\n')); console.log('score', l.score, 'stats', l.stats, 'peak', peak.toFixed(1));
