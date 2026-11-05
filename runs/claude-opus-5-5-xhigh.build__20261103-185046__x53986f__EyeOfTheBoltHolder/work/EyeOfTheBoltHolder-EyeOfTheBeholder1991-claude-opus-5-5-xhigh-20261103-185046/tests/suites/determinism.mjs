// determinism: the same seed and commands give the same hash twice, and the same after a save and load mid-script
import { fresh } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh();
  const script = i => (i % 97 === 0 ? [{ c: 'move', d: 'f' }] : i % 131 === 0 ? [{ c: 'turn', s: 1 }] : i % 53 === 0 ? [{ c: 'strike' }] : i % 211 === 0 ? [{ c: 'use' }] : []);
  const go = (n, from = 0) => { for (let i = from; i < n; i++) B.update(1 / 120, script(i), 1 / 120); };
  const once = () => { B.newGame({ seed: 42 }); const P = B.S.party; P.cx = 2; P.cy = 9; B.S.floors.f1.doors.G1.open = 1; B.S.floors.f1.doors.G1.want = 1; go(4800); return B.hash(); };
  const a = once(), b = once(); t.check('the same seed and commands give the same hash', a === b, a + ' ' + b);
  B.newGame({ seed: 42 }); const P = B.S.party; P.cx = 2; P.cy = 9; B.S.floors.f1.doors.G1.open = 1; B.S.floors.f1.doors.G1.want = 1; go(2400);
  const mid = JSON.parse(JSON.stringify(B.serialize())); B.newGame({ seed: 1 }); B.load(mid); go(4800, 2400);
  t.check('a save and load mid-script changes nothing', B.hash() === a);
  B.newGame({ seed: 43 }); const P2 = B.S.party; P2.cx = 2; P2.cy = 9; B.S.floors.f1.doors.G1.open = 1; B.S.floors.f1.doors.G1.want = 1; go(4800);
  t.check('another seed plays differently', B.hash() !== a);
}
