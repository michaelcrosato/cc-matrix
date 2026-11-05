import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load();
BZ.cosmetic = false;
let done = false;
for (let g = 0; g < 4 && !done; g++) {
  const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 300 + g, innings: 9, fast: true }); let s = 0, log = [], cur = null;
  BZ.bus.on('throw', d => log.push('THROW ' + JSON.stringify(d)));
  BZ.bus.on('fielded', d => log.push('FIELDED ' + JSON.stringify(d)));
  BZ.bus.on('drop', d => log.push('DROP ' + d.pos));
  while (M.phase !== 'final' && s++ < 360000 && !done) {
    BZ.match.step(M, 1 / 120);
    if (M.play !== cur) { cur = M.play; log = []; }
    if (M.phase === 'inPlay' && M.play) {
      const P = M.park, b = M.ball, h = BZ.play.holder(M);
      log.push(`${M.play.t.toFixed(2)} ${b.mode} ${Math.round(b.x - P.H.x)},${Math.round(b.y - P.H.y)},${b.z.toFixed(0)} v${Math.round(b.vx)},${Math.round(b.vy)},${Math.round(b.vz)} ver${b.version} h:${h ? h.pos + ' tT' + h.throwT.toFixed(2) : '-'} R:${M.runners.map(r => r.p.toFixed(2) + '>' + r.goal).join('|')}`);
      if (M.play.t > 6) { done = true; console.log('game', g, log.filter((l, i) => i % 5 === 0 || /THROW|FIELD|DROP/.test(l)).slice(0, 100).join('\n')); }
    }
  }
  BZ.endMatch(M);
}
