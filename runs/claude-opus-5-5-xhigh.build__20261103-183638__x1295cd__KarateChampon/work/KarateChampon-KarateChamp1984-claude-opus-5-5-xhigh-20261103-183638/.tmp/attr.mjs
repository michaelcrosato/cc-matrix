import { fresh, steps } from '../tests/lib/util.mjs';
const { KC, game } = fresh(); game.go('attract'); steps(game, 2); const sc = game.scene, s = sc.sub, b = s.bout; let last = '';
b.bus.on('call', d => console.log((sc.t).toFixed(2), 'CALL', d.id));
for (let i = 0; i < 120 * 60 && sc.step === 'bout'; i++) { steps(game, 1); const D = s.dir, [W, R] = s.fighters; const line = `${b.phase} ex${D.ex} ${D.kind} step${D.step} W:${W.st}/${W.tech||''} R:${R.st}/${R.tech||''} gap ${W.gapTo(R).toFixed(0)}`; if (line.replace(/gap.*/, '') !== last) { console.log(sc.t.toFixed(2), line); last = line.replace(/gap.*/, ''); } }
