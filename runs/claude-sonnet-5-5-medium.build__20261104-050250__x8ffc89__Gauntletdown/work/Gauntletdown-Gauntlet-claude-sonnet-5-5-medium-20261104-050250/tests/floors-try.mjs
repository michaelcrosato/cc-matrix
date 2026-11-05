import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(readFileSync('my-3d2dge.js','utf8'), ctx);
const src = ['00-core','10-floors'].map(f=>readFileSync(`game/src/${f}.js`,'utf8')).join('\n');
vm.runInContext(`(() => {${src}\n globalThis.__t = { genFloor, PLAN };})()`, ctx);
const { genFloor, PLAN } = ctx.__t;
for (let s=0;s<PLAN.length;s++){ const t=Date.now(); const f=genFloor(s, 12345); console.log(s, PLAN[s].name, f.rows[0].length+'x'+f.rows.length, 'attempt', f.meta.attempt, Date.now()-t+'ms'); if(s===4||s===9) console.log(f.rows.join('\n')); }
