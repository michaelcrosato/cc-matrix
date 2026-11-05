import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, dbg = game.debug; await new Promise(r => setTimeout(r, 100)); game.advance(.2);
const [stage, scene, secs] = [+process.argv[2], process.argv[3], +process.argv[4]]; const god = process.argv[5] !== 'nogod';
dbg.start('stage', stage, 'normal', 1); dbg.jump(stage, scene); game.advance(.1); if (god) dbg.cheat('god', 1); dbg.bot(true, 'fair');
for (let i = 0; i < secs * 2; i++) { game.advance(.5); const s = dbg.sim, p = s.players[0], B = s.boss; if (i % 2 === 0) console.log((i / 2) + 's', s.phase, 'c=' + p.c.toFixed(1), 'w' + p.weapon, 'mag' + p.mag, 'shots', p.st.shots, 'hits', p.st.hits, 'lives', p.lives, B ? 'B ph' + B.phase + ' ' + Object.entries(B.parts).map(([k, q]) => k + ':' + q.hp.toFixed(2) + (q.dead ? 'D' : '') + (q.vulnerable === false ? 'x' : '')).join(' ') : '', 'thr', s.threats.length, 'proj', s.proj.length, 'en', s.enemies.filter(e => !e.dead).length); if (s.phase === 'stageclear' || (s.phase === 'clear')) { console.log('CLEAR'); break; } }
console.log('errors', game.errors.map(e => e.message).slice(0, 3));
