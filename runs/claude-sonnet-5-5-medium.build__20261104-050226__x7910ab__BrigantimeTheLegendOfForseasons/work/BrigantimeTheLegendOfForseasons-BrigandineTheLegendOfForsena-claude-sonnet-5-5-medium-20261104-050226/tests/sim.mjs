import vm from 'node:vm'; import fs from 'node:fs';
const ctx = { console, Math, JSON, Object, Array, Map, Set, Date }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../engine/my-3d2dge.js', import.meta.url), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8'), ctx, { filename: 'game.js' });
export const G = ctx.My3D2dge.__brig, E = ctx.My3D2dge, game = E.current;
