import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, dbg = game.debug; await new Promise(r => setTimeout(r, 100)); game.advance(.2);
const stage = +process.argv[2], god = process.argv[3] === 'god', style = process.argv[4] || 'fair', max = +process.argv[5] || 400;
dbg.start('stage', stage, 'normal', 1); game.advance(.1); if (god) dbg.cheat('god', 1); dbg.bot(true, style);
let cur = '', t0 = 0, lives0 = 0; const log = [];
for (let s = 0; s < max * 2; s++) { game.advance(.5); const sim = dbg.sim; if (!sim) break; if (sim.sceneId !== cur) { if (cur) log.push(cur + ' ' + (sim.t - t0).toFixed(0) + 's lost=' + (sim.players[0].st.lost - lives0) + ' acc=' + (sim.players[0].st.shots ? Math.round(sim.players[0].st.hits / sim.players[0].st.shots * 100) : 0)); cur = sim.sceneId; t0 = sim.t; lives0 = sim.players[0].st.lost; }
  if (sim.phase === 'stageclear' || game.sceneName !== 'play') { log.push(cur + ' END ' + sim.phase + ' ' + game.sceneName + ' t=' + sim.t.toFixed(0) + ' score=' + sim.players[0].score + ' lost=' + sim.players[0].st.lost); break; }
  if (s === max * 2 - 1) log.push('TIMEOUT at ' + cur + ' ' + JSON.stringify(dbg.snapshot().boss) + ' en=' + dbg.snapshot().enemies + ' ph=' + sim.phase); }
const S_ = dbg.sim; for (const e of S_.enemies) if (!e.dead) log.push('  stuck: ' + e.type + ' ' + e.st + ' p=' + e.p.toFixed(2) + ' at ' + [e.x, e.y, e.foot].map(Math.round) + ' cover=' + (e.cover && e.cover.id) + ' peek=' + e.peek + ' exposures=' + e.exposures + ' vols=' + S_.volumes(e).length);
console.log(log.join('\n')); console.log('errors', game.errors.map(e => e.message).slice(0, 4));
