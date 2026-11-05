import { loadGame } from '../tests/lib/load.mjs';
const { KC } = loadGame();
const a = new KC.Karateka('taro', 0), b = new KC.Karateka('negi', 1), A = new KC.KarateAI({ id: 'taro', showcase: true, seed: 1 });
a.onStart = (f, tt) => console.log('START', tt.id, 'req', f.reqTech, 'showI', A.showI);
const B = new KC.Bout({ fighters: [a, b], ctrl: [(f, o, bb) => { const it = A.control(f, o, bb); if (it.press) console.log('t', bb.time.toFixed(2), JSON.stringify(it), f.st, f.tech, 'plan', JSON.stringify(A.plan)); return it; }, null], seed: 1, intro: false, spar: true });
for (let k = 0; k < 120 * 5; k++) B.update(1 / 120);
