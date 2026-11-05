import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const ctx = { console, setTimeout, clearTimeout }; vm.createContext(ctx);
for (const f of ['../engine/my-3d2dge.js', '../dist/game.js']) vm.runInContext(readFileSync(new URL(f, import.meta.url), 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current;
game.advance(1);
console.log(JSON.stringify(game.debug.snapshot()));
console.log(game.errors.map(e => e.message + ' @ ' + (e.stack||'').split('\n')[1]).join('\n'));
