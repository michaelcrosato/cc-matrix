import {createOp,enterStage,spawnEntity} from './op.js';
import {opById,TOOLS} from '../content/ops.js';
const KINDS=['pool','hook','laceration','incision','mask','scan','prop','magnet','tumor','polyp','fragment','clamp','organ','eye','plate','strain','cyst','nerve','dressing','droplet','nick'];
const PHASES=['closed','open','buried','knock','exposed','cut','lift','laser'];
const q=x=>Math.round((x||0)*100);
function cells(e){let out='';for(let i=0;i<(e.cells?.length||0);i+=4){let n=0;for(let j=0;j<4;j++)if(e.cells[i+j]?.v>=.2)n|=1<<j;out+=n.toString(16);}return out;}
export function packSnapshot(s,keyframe=false){
 const p={t:keyframe?'k':'s',n:s.tick,d:[s.stage,q(s.elapsed),q(s.remaining),...s.vitals.map(q)],c:[s.doses,q(s.composure),s.mistakes,s.score,s.streak,s.bpm,s.status==='saved'?1:s.status==='lost'?2:0,s.quiet?1:0,s.lookCount],
 e:s.entities.filter(e=>!e.done||e.required).map(e=>[e.id,KINDS.indexOf(e.k),q(e.x),q(e.z),q(e.r),PHASES.indexOf(e.phase),e.progress,e.hp,q(e.heat),(e.done?1:0)|(e.revealed?2:0)|(e.free?4:0),q(e.angle),e.table,...(keyframe?[q(e.ox),q(e.oz),e.strain||'',e.cells?cells(e):'']:[])]),
 p:s.seats.map(v=>[q(v.x),q(v.z),TOOLS.indexOf(v.tool),v.score,v.using?1:0,v.table,v.gift==='look'?1:0])};
 if(s.blue)p.b=[q(s.blue.left),s.blue.shocks,q(s.blue.charge),q(s.blue.needle),s.blue.held?1:0];
 if(s.massage)p.m=s.massage.hits;
 const masks=s.entities.filter(e=>e.cells);if(masks.length)p.a=masks.map(e=>[e.id,cells(e)]);
 const paths=s.entities.filter(e=>e.path&&(e.k==='strain'||e.k==='plate'||keyframe&&!e.required));if(paths.length)p.r=paths.map(e=>[e.id,e.path.map(p=>[q(p.x),q(p.z)])]);
 if(!keyframe&&JSON.stringify(p).length>1100){p.e=p.e.filter(e=>s.entities.find(x=>x.id===e[0])?.required);}
 if(keyframe){p.f=s.flags;p.u=s.quietUnlocked?1:0;p.j=s.nextId;}
 return p;
}
export function applySnapshot(s,p,localSeat=-1){
 if(p.n<(s.networkTick??s.tick)&&p.t!=='k')return s;s.networkTick=p.n;
 const changed=s.stage!==p.d[0];if(changed){enterStage(s,p.d[0]);s.entities=[];}
 s.tick=p.g??p.n;s.stage=p.d[0];s.elapsed=p.d[1]/100;s.remaining=p.d[2]/100;s.vitals=p.d.slice(3).map(v=>v/100);
 [s.doses,s.composure,s.mistakes,s.score,s.streak,s.bpm]=p.c;s.composure/=100;s.status=p.c[6]===1?'saved':p.c[6]===2?'lost':'operating';s.quiet=!!p.c[7];s.lookCount=p.c[8];
 const st=opById(s.id).stages[s.stage],found=new Set();
 p.e.forEach((d,i)=>{
  let e=s.entities.find(e=>e.id===d[0]);const kind=KINDS[d[1]];
  if(!e){const spec=st.spawn?.[i]?.k===kind?st.spawn[i]:{k:kind,x:(d[12]??d[2])/100,z:(d[13]??d[3])/100,strain:d[14]||'introit',required:false};e=spawnEntity(s,spec);e.id=d[0];}
  e.x=d[2]/100;e.z=d[3]/100;e.r=d[4]/100;e.phase=PHASES[d[5]]||'closed';e.progress=d[6];e.hp=d[7];e.heat=d[8]/100;e.done=!!(d[9]&1);e.revealed=!!(d[9]&2);e.free=!!(d[9]&4);e.angle=d[10]/100;e.table=d[11];
  if(d.length>12){e.ox=d[12]/100;e.oz=d[13]/100;}
  found.add(e.id);
 });
 if(p.t==='k'){
  s.entities=s.entities.filter(e=>found.has(e.id));s.flags=p.f||s.flags;s.quietUnlocked=!!p.u;s.nextId=p.j||s.nextId;
 }
 for(const[id,bits]of p.a||[]){const e=s.entities.find(e=>e.id===id);if(e?.cells){for(let i=0;i<e.cells.length;i++)e.cells[i].v=(parseInt(bits[Math.floor(i/4)]||'0',16)&1<<(i%4))?.2:0;}}
 for(const[id,path]of p.r||[]){const e=s.entities.find(e=>e.id===id);if(e)e.path=path.map(([x,z])=>({x:x/100,z:z/100}));}
 p.p.forEach((d,i)=>{let seat=s.seats[i];if(!seat)return;const keep=i===localSeat&&Math.hypot(seat.x-d[0]/100,seat.z-d[1]/100)<1;
  if(!keep){seat.x=d[0]/100;seat.z=d[1]/100;}seat.tool=TOOLS[d[2]]||'drain';seat.score=d[3];seat.using=!!d[4];seat.table=d[5];seat.gift=d[6]?'look':'quiet';});
 s.blue=p.b?{left:p.b[0]/100,shocks:p.b[1],charge:p.b[2]/100,needle:p.b[3]/100,held:!!p.b[4],scripted:true}:null;
 s.massage=p.m!=null?{hits:p.m,last:-1,lastAt:0}:null;s.events=[];return s;
}
