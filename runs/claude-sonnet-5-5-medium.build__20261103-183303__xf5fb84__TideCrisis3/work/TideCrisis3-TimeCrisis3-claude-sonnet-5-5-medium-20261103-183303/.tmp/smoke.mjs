import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx, { filename: 'engine' });
vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx, { filename: 'game.js' });
const E = ctx.My3D2dge, game = E.current; const dbg = game.debug;
await new Promise(r => setTimeout(r, 100)); game.advance(.5); console.log('scene', dbg.snapshot().scene, 'errors', game.errors.map(e => e.message));
