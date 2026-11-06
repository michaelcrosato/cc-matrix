import {ALL_OPS} from '../src/content/ops.js';
import {createOp,step,drainEvents,results} from '../src/sim/op.js';
import {botInput} from '../src/sim/bot.js';
for(const d of ALL_OPS)for(const skill of [.4,.7,1]){const s=createOp(d);for(let n=0;n<50000&&s.status==='operating';n++){step(s,[botInput(s,0,skill)]);drainEvents(s);}const r=results(s);console.log(`${d.id} skill=${skill.toFixed(1)} ${s.status} time=${s.elapsed.toFixed(1)} vitals=${r.vitals} mistakes=${s.mistakes} rank=${r.rank}`);}
