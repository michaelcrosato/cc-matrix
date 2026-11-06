import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),c={console:{log(){},warn(){},error(){}},performance};c.window=c;vm.createContext(c);
for(const file of ['vendor/my-3d2dge/dist/handoff/my-3d2dge.js','src/config.js','src/data.js','src/sim/op.js','src/sim/cursor.js','src/sim/bot.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const G=c.GAME,rows=[];
for(const difficulty of ['Intern','Resident'])for(const skill of ['perfect','human'])for(const def of G.cases.filter(d=>d.id<=11)){
 const S=G.Op.create(def,{difficulty,seed:517}),B=G.Bot.create(0,skill==='human'?{reaction:.25,aimError:3,speed:260}:{});let i=0;
 while(!['won','lost'].includes(S.mode)&&i++<120*1200)G.Op.step(S,[G.Bot.next(B,S,1/120)],1/120);
 rows.push({case:def.id,difficulty,skill,mode:S.mode,phase:S.phase,seconds:Math.round(S.elapsed),pulse:Math.round(S.vitals),clock:Math.round(S.clock),slips:S.players[0].slips,rank:G.Op.rank(S).rank,score:G.Op.rank(S).score});
}
fs.mkdirSync(path.join(root,'tests/results'),{recursive:true});fs.writeFileSync(path.join(root,'tests/results/balance.json'),JSON.stringify(rows,null,2));
for(const d of ['Intern','Resident'])for(const s of ['perfect','human']){const a=rows.filter(r=>r.difficulty===d&&r.skill===s);console.log(d+' '+s+': '+a.filter(r=>r.mode==='won').length+'/'+a.length+' cleared');}
