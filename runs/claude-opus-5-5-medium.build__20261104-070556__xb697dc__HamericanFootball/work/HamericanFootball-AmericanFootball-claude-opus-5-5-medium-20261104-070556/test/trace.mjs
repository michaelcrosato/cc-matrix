import { load } from './lib/context.mjs';
const { FF } = load();
const S = FF.sim, Y = 16;
const [off, def, seed] = [process.argv[2] || 'hb_dive', process.argv[3] || 'man', +process.argv[4] || 1];
S.newMatch({ home: 'fiascos', away: 'mudhogs', seed, qLen: 600, start: { possession: 0, los: 50, down: 1, toGo: 20 } });
FF.bus.on('*', e => { if (!['phase', 'act', 'shed', 'possess', 'set', 'presnap'].includes(e.ev)) console.log((S.play && S.play.t || 0).toFixed(2), 'EV', e.ev, e.player || '', e.yards !== undefined ? e.yards : ''); });
S.calls = [{ play: FF.play(off) }, { play: FF.play(def) }]; S.callsDone();
let k = 0; const los = S.los;
while (S.phase !== 'DEAD' && k < 120 * 30) {
  S.update(1 / 120); k++;
  if (S.phase === 'LIVE' && k % 30 === 0) {
    const c = S.carrier();
    const defs = S.onField(1).map(a => a.role + ':' + a.brain.beh + (a.eng ? '*' : '') + (a.down > 0 ? 'D' : '') + '@' + Math.round((a.b.x - los) / Y) + ',' + Math.round((a.b.y - 616) / Y) + (c ? ' d' + (Math.hypot(a.b.x - c.b.x, a.b.y - c.b.y) / Y).toFixed(1) : '')).join(' ');
    console.log(S.play.t.toFixed(2), c ? c.role + ' x' + ((c.b.x - los) / Y).toFixed(1) + ' y' + ((c.b.y - 616) / Y).toFixed(1) + ' v' + Math.round(Math.hypot(c.b.vx, c.b.vy)) + ' tb' + c.turbo.toFixed(2) : S.ball.state, '|', defs);
  }
}
console.log('result', JSON.stringify(S.play.result && { type: S.play.result.type, yd: S.play.result.x ? ((S.play.result.x - los) / Y).toFixed(1) : '' }));
