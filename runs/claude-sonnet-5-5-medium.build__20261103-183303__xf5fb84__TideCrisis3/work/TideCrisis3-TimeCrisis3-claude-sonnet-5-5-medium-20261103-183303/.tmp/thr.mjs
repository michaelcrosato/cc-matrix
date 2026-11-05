import { load, mkSim, run, STEP } from '../tests/harness.mjs';
const { dbg } = await load(); const sim = mkSim(dbg, '1-1'); sim.waves.length = 0; const p = sim.players[0];
const th = sim.newThreat({ id: 99 }, 'bullet', .5, { target: 0 }); console.log(th, 'phase', sim.phase, 't', sim.t);
run(sim, .55, [{}]); console.log('lives', p.lives, 'inv', p.inv, 'threats', sim.threats.length, 'events', sim.events.map(e => e.type), 'c', p.c, 'tune god', dbg.tune.player.godMode, sim.cheats);
const s2 = mkSim(dbg, '1-1'); s2.waves.length = 0; s2.newThreat({ id: 99 }, 'bullet', .5, { target: 0 }); for (let i = 0; i < 70; i++) { s2.step(STEP, [{}]); if (s2.events.length || s2.threats.length === 0) { console.log('step', i, s2.t.toFixed(3), s2.events.map(e => e.type), 'lives', s2.players[0].lives, 'exposed', s2.exposed(s2.players[0])); break; } }
