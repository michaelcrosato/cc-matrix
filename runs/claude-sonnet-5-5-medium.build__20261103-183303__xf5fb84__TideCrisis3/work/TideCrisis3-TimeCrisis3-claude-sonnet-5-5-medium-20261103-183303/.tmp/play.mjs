import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx, { filename: 'engine' });
vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx, { filename: 'game.js' });
const E = ctx.My3D2dge, game = E.current, dbg = game.debug;
await new Promise(r => setTimeout(r, 100)); game.advance(.2);
const stage = +process.argv[2] || 1, scene = process.argv[3], secs = +process.argv[4] || 60;
const sim = dbg.start('stage', stage, 'normal', 1); if (scene) dbg.jump(stage, scene);
game.advance(.1); dbg.cheat('god', 1); dbg.bot(true, 'fair');
let last = ''; for (let s = 0; s < secs; s++) { try { game.advance(1); } catch (e) { console.log('EXC', e.stack.split('\n').slice(0,4).join('\n')); break; } const sn = dbg.snapshot(); const line = sn.scene + ' ' + sn.sceneId + ' ' + sn.phase + ' t=' + sn.timer + ' en=' + sn.enemies + ' score=' + sn.players[0].score + ' ' + JSON.stringify(sn.boss || ''); if (line !== last && (s % 5 === 0)) console.log(s, line); last = line; if (sn.scene !== 'play') { console.log('left play', sn.scene); break; } }
console.log('errors', game.errors.map(e => e.message).slice(0, 5));
