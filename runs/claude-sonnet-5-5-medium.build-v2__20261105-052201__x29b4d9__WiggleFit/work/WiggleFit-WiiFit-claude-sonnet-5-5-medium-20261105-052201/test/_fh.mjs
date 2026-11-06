import { makeStub, run, resetTuning } from './headless.mjs';
import { FruitHat } from '../src/events/fruitHat.js';
const game = await makeStub();
for (const skill of ['sharp', 'average', 'clumsy']) for (const [bankAt, label] of [[7, 'bank7'], [5, 'bank5'], [99, 'never']]) {
  const res = [];
  for (let seed = 1; seed <= 3; seed++) {
    const ev = new FruitHat(game, { tier: 0, seed, lanes: [{ kind: 'bot', skill, bankAt }] });
    ev.lanes[0].bankAt = bankAt; run(ev, 66);
    const l = ev.lanes[0]; res.push(`${l.score.toFixed(1)}/${l.falls}f`);
    ev.dispose();
  }
  console.log(skill, label, res.join('  '));
}
