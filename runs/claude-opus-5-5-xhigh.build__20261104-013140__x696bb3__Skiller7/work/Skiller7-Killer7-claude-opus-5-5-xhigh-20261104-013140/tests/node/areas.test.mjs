// Every area loads and runs, every node can be warped to, every boss phase starts and runs, with no errors.
import { boot } from '../lib/node-harness.mjs';
export default async (T) => {
  const { game, S7, sim, I, snap, step } = boot();
  step(.3);
  S7.newGame('piste'); step(.1); sim.skipCutscene(); step(.3);
  T.eq('new game reaches the lobby', snap().area, '00A');
  for (const id of Object.keys(S7.AREAS)) {
    const A = S7.AREAS[id];
    for (const n of Object.keys(A.nodes)) {
      try { sim.warp(id, n); step(.25); } catch (e) { T.check(`warp ${id}:${n}`, false, e.message); continue; }
    }
    sim.warp(id, Object.keys(A.nodes)[0]);
    for (const w of Object.keys(A.waves || {})) { sim.st.waves[id + ':' + w] = null; sim.startWave(w); }
    I.hold('aim'); step(2); I.hold('aim', false); step(1);
    S7.CHEAT.oneHit = true; game.debug.revealAll(); I.hold('aim'); step(.3); for (let k = 0; k < 6; k++) { I.tap('fire'); step(.3); } I.hold('aim', false); S7.CHEAT.oneHit = false;
    game.debug.killAll(); step(.5);
    T.check(`area ${id} runs without errors`, !game.errors.length, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
    game.errors.length = 0;
  }
  for (const b of S7.BOSS_WARPS) {
    try { sim.warpBoss(b.id, b.phase); for (let k = 0; k < 30; k++) { step(.2); if (sim.talk) sim.nextLine(); if (sim.card) sim.card = null; } } catch (e) { T.check(`boss ${b.label}`, false, e.stack); }
    T.check(`boss ${b.label} runs`, !game.errors.length && !!(sim.boss || sim.resultsReady !== undefined), game.errors.map(e => e.message).join(' | '));
    game.errors.length = 0;
  }
};
