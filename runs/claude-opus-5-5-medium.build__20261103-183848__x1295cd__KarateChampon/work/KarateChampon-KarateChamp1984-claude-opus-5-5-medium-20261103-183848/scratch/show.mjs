import { loadGame } from '../tests/lib/load.mjs';
const { KC } = loadGame();
const a = new KC.Karateka('taro', 0), b = new KC.Karateka('negi', 1), A = new KC.KarateAI({ id: 'taro', showcase: true, seed: 1 }), seen = [];
a.onStart = (f, tt) => seen.push(tt.id + '@' + (B.time).toFixed(1));
const B = new KC.Bout({ fighters: [a, b], ctrl: [(f, o, bb) => A.control(f, o, bb), null], seed: 1, intro: false, spar: true });
for (let k = 0; k < 120 * 90; k++) B.update(1 / 120);
console.log(seen.join(' '), A.showI, a.x.toFixed(0), b.x.toFixed(0), a.st);
