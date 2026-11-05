import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, dbg = game.debug; await new Promise(r => setTimeout(r, 100));
const { Sim, R3 } = dbg; const sim = new Sim({ scene: '1-B', stage: 1, players: [{}], cheats: { god: 1 } });
for (let i = 0; i < 120 * 12; i++) sim.step(1 / 120, [{ aim: [0, 0] }]);
const B = sim.boss; console.log(sim.phase, B.phase, Object.entries(B.parts).map(([k, p]) => k + ':' + p.hp + ':' + p.vulnerable + ':' + p.hidden));
B.parts.turretL.dead = B.parts.turretR.dead = true;
for (let i = 0; i < 120 * 4; i++) { sim.step(1 / 120, [{ aim: [0, 0] }]); const v = sim.bossVolumes(); if (v.length && B.parts.barracuda.vulnerable) { const vv = v[0]; const a = R3.aimOf(sim.pose(0), vv.c); const p = sim.players[0]; p.cool = 0; const before = B.parts.barracuda.hp; sim.step(1 / 120, [{ aim: [a[0], a[1]], firePressed: true, fireDown: true }]); console.log('fired at', a, 'part hp', before, '->', B.parts.barracuda.hp, 'vols', v.length, 'mag', p.mag, 'c', p.c); break; } }
const { Bot } = dbg; Bot.setStyle('fair'); const p = sim.players[0];
let last = 0; for (let i = 0; i < 120 * 14; i++) { const cmd = Bot.command(sim, p, 1 / 120); sim.step(1 / 120, [cmd]); if (i % 60 === 0 && B.parts.barracuda.vulnerable) { const S = Bot.S(0); const tg = Bot.pickTarget(sim, p, sim.pose(0), S, { react: .3, speed: 2.2, head: .3 }); console.log((i / 120).toFixed(1), 'vuln', 'tg', tg && [tg.id, tg.pri, tg.ax.toFixed(2), tg.ay.toFixed(2), tg.pre], 'aim', S.ax.toFixed(2), S.ay.toFixed(2), 'c', p.c.toFixed(1), 'hp', B.parts.barracuda.hp, 'cmd', cmd.firePressed, cmd.coverDown); } }
