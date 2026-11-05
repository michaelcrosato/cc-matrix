import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console }; vm.createContext(ctx); vm.runInContext(readFileSync('engine/my-3d2dge.js','utf8'), ctx);
const E = ctx.My3D2dge; console.log(JSON.stringify(E.Input.DEFAULT)); console.log(Object.keys(E.Input));
