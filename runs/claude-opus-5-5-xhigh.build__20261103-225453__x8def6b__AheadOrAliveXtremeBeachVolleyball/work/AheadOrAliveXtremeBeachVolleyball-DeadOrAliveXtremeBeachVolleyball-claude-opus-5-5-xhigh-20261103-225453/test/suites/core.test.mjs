import { load } from '../lib/load.mjs';
export default function (t) {
  const { game, G } = load({});
  G.seed('a', 5); const a1 = [G.rng('a')(), G.rng('a')()]; G.seed('a', 5); const a2 = [G.rng('a')(), G.rng('a')()];
  t.ok('rng streams reproduce', a1[0] === a2[0] && a1[1] === a2[1]);
  G.seed('a', 5); G.seed('b', 5); G.rng('b')(); G.rng('b')(); t.ok('rng streams are independent', G.rng('a')() === a1[0]);
  let got = null; const off = G.bus.on('x', d => { got = d; }); G.bus.emit('x', 3); off(); G.bus.emit('x', 4); t.ok('event bus on, emit, off', got === 3);
  let n = 0; const ov = { id: 't', update() { n++; return true; } }; G.overlay.push(ov); game.advance(.1); G.overlay.remove(ov); t.ok('overlays take the input first', n > 5);
  G.setTuning('ballGravity', 400); t.ok('tuning sets', G.T.ballGravity === 400); G.resetTuning(); t.ok('tuning resets to defaults', G.T.ballGravity === 330);
  const st = G.newState('rin', 3); delete st.v; t.ok('save migration fills the version', G.migrate(st, 0).v === 1);
  t.ok('money format', G.fmtMoney(12500) === 'S$12,500');
  t.ok('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
}
