import { makeStub, run } from './headless.mjs';
import { Tug } from '../src/events/tug.js';
const game = await makeStub();
const ev = new Tug(game, { tier: 0, seed: 2, lanes: [{ kind: 'bot', skill: 'sharp' }] }); const l = ev.lanes[0]; const log = [];
run(ev, 40, (e, i) => { if (i % 60 === 0 && e.t > 1 && e.t < 20) log.push(`t=${e.t.toFixed(1)} rope=${l.rope.toFixed(2)} back=${l.leanBack.toFixed(2)} cobZ=${l.bal.cobZ.toFixed(2)} wishZ=${l.bal.wishZ.toFixed(2)} L=${l.intent.L} judged=${l.judged} pend=${e.callPend} won=${l.won} lost=${l.lost} pressT=${l.pressT.toFixed(1)} callT=${e.callT.toFixed(1)}`); });
console.log(log.join('\n'));
