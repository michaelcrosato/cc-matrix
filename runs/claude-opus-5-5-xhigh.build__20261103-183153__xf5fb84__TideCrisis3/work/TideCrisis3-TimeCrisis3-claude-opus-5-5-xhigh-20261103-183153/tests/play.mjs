// quick bot playthrough: node tests/play.mjs <stage> [style] [god]
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, setTimeout, clearTimeout, TC_NO_BOOT: true }; vm.createContext(ctx); ctx.window = undefined;
vm.runInContext(readFileSync(new URL('../engine/my-3d2dge.js', import.meta.url), 'utf8'), ctx);
vm.runInContext(readFileSync(new URL('../build/game.js', import.meta.url), 'utf8'), ctx);
const TC = ctx.TC, stage = isNaN(+process.argv[2]) ? process.argv[2] : +process.argv[2], style = process.argv[3] || 'fair', god = process.argv[4] === 'god';
const sim = new TC.Sim({ mode: stage === 'range' ? 'range' : 'stage', stage, seed: 11, skipIntro: true, cheats: { god } });
const bot = new TC.Autopilot(style); let last = '', t0 = Date.now(), log = [];
for (let i = 0; i < 120 * 60 * 12; i++) {
  sim.step(1 / 120, [bot.command(sim, 0, 1 / 120)]);
  for (const e of sim.drain()) if (['scene', 'clear', 'hurt', 'timeup', 'bossdown', 'gameover', 'stageclear', 'continue', 'out'].includes(e.type)) log.push(sim.t.toFixed(1) + ' ' + e.type + ' ' + (e.id || e.scene || e.why || e.name || ''));
  const k = sim.phase + ':' + sim.scene.id; if (k !== last) { last = k; }
  if (sim.phase === 'done' || sim.phase === 'gameover' || sim.phase === 'continue') break;
}
const p = sim.players[0];
console.log(log.join('\n'));
console.log('END', sim.phase, sim.scene.id, 't', sim.t.toFixed(1), 'score', p.score, 'lives', p.lives, 'acc', (p.stats.hits / Math.max(1, p.stats.shots)).toFixed(2), 'kills', p.stats.kills, 'saves', p.stats.saves, 'ms', Date.now() - t0);
if (sim.phase !== 'done') console.log(JSON.stringify(sim.snapshot()).slice(0, 800));
if (sim.phase !== 'done') {
  const V3 = TC.V3, cam = sim.cameraFor(0), o = [cam.x, cam.y, cam.z];
  for (const e of sim.enemies) if (e.alive && !e.civ && !e.ally) { const h = e.vols && e.vols.head ? e.vols.head.c : [e.x, e.y, e.z + 20], a = TC.worldToAim(cam, h), d = V3.sub(h, o), L = V3.len(d), w = sim.rayWorld({ o, d: V3.mul(d, 1 / L) }, L);
    console.log('STUCK', e.type, 'cover', e.cover && e.cover.id, 'entry', e.entry, 'state', e.state, 'st', e.st.toFixed(1), 'pos', [e.x, e.y, e.z].map(v => v.toFixed(0)).join(','), 'dz', e.dz.toFixed(1), 'head', h.map(v => v.toFixed(0)).join(','), 'aim', a && a.map(v => v.toFixed(2)).join(','), 'block', w ? w.t.toFixed(0) + '/' + L.toFixed(0) + ' ' + (w.col.box ? w.col.box.map(v => v.toFixed(0)).join(',') : w.col.impact) : 'clear'); }
}
