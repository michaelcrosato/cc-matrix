import fs from 'node:fs'; import vm from 'node:vm';
const ctx = vm.createContext({}); for (const f of ['00-core.js','10-data-rules.js','11-data-floors.js']) vm.runInContext(fs.readFileSync('src/'+f,'utf8').replace(/^const B =/m,'var B ='), ctx);
const B = ctx.B; for (const id of ['f1','f2','f3','f4','rr']) { const f = B.FLOORS[id]; console.log(id, f.w+'x'+f.h); f.rows.forEach((r,y)=>console.log(String(y).padStart(2),r)); }
