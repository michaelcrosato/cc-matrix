import {DEFAULTS,DIFFICULTY} from '../core/config.js';
import {clamp,dist,random} from '../core/rng.js';
import {opById,TOOLS} from '../content/ops.js';

export const DT=1/60;
export const INJECTION={x:-5.2,z:.8,r:.8};
const CORE=['id','seed','rng','tick','elapsed','remaining','vitals','doses','entities','scars','barriers','stage','stageTime','advance','score','streak','bestStreak','mistakes','actions','clean','good','sloppy','composure','quiet','quietUnlocked','bpm','flags','nextId','blue','blueUsed','cold','pink','lookCount','status','cause','massage','stageInjected','quietTime','currentTable'];
export function snapshotCore(s){const o={};for(const k of CORE)o[k]=structuredClone(s[k]);return o;}
export function emit(s,type,data={}){s.events.push({type,tick:s.tick,...data});if(s.events.length>180)s.events.shift();}
export function drainEvents(s){const e=s.events;s.events=[];return e;}
export function createOp(def,{seed=7,seats=1,difficulty='Resident',config={...DEFAULTS},god=false}={}){
 if(typeof def==='string')def=opById(def);
 const s={id:def.id,seed,rng:seed>>>0,tick:0,elapsed:0,remaining:def.time*DIFFICULTY[difficulty].time*config.timeMultiplier,
 vitals:Array.from({length:def.tableCount||1},(_,i)=>def.vitals-i*7),doses:def.doses,entities:[],scars:[],barriers:[],stage:0,stageTime:0,advance:0,
 score:0,streak:0,bestStreak:0,mistakes:0,actions:0,clean:0,good:0,sloppy:0,composure:40,quiet:false,quietUnlocked:def.n>=3,
 bpm:config.heartBPM,flags:{},nextId:1,blue:null,blueUsed:0,cold:0,pink:0,lookCount:0,status:'operating',cause:'',massage:null,
 stageInjected:false,quietTime:0,currentTable:0,config,difficulty,god,freezeClock:false,infiniteComposure:false,unlimitedMistakes:false,
  seats:Array.from({length:seats},(_,i)=>({id:i,x:(i%2?2:-2),z:.8,tool:'drain',lastTool:'forceps',using:false,giftPrev:false,
   grab:null,work:null,dry:0,draw:0,score:0,stitches:0,actions:0,table:0,angle:0,gift:i%2?'look':def.surgeon==='sabine'?'look':'quiet',active:true})),
 events:[],history:[],checkpoint:null,ghost:[],trace:[],traces:Array.from({length:seats},()=>[])};
 enterStage(s,0);return s;
}
function pathLine(x,z,len,zig=false){const n=Math.max(2,Math.ceil(len/.45));return Array.from({length:n+1},(_,i)=>({x:x+len*i/n,z:z+(zig?(i%2?.32:-.32):0)}));}
export function spawnEntity(s,spec){
 const e={id:s.nextId++,k:spec.k,x:spec.x||0,z:spec.z||0,ox:spec.x||0,oz:spec.z||0,r:spec.r||.52,table:spec.table||0,
 required:spec.required!==false,done:false,progress:0,heat:0,hp:spec.hp||1,phase:'closed',timer:0,...structuredClone(spec)};
 if(e.hp)e.hp=Math.max(1,Math.round(e.hp*s.config.strainHP));
 if(e.k==='incision')e.path=e.closed?Array.from({length:25},(_,i)=>({x:e.x+Math.cos(i/24*Math.PI*2)*(e.r||1.5),z:e.z+Math.sin(i/24*Math.PI*2)*(e.r||1.5)})):pathLine(e.x,e.z,e.length||2);
 if(e.k==='laceration'||e.k==='nick')e.path=pathLine(e.x,e.z,e.length||1.5,true);
 if(e.k==='mask'){
   e.cells=[];const nx=Math.ceil((e.w||4)/.65),nz=Math.ceil((e.h||2)/.65);
   for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++)e.cells.push({x:e.x-(e.w||4)/2+(ix+.5)*(e.w||4)/nx,z:e.z-(e.h||2)/2+(iz+.5)*(e.h||2)/nz,v:0});
 }
 if(['hook','prop','magnet','tumor','nerve','organ','clamp','dressing','strain','plate'].includes(e.k)){
  const sign=e.x>3?-1:1,len=e.k==='dressing'?(e.length||6):e.k==='strain'?2.5:1.3;
  e.path=Array.from({length:7},(_,i)=>({x:e.x+sign*len*i/6,z:e.z-(e.k==='hook'?Math.sin(i/6*Math.PI)*.42:i/6*.6)}));
 }
 if(e.k==='strain'&&e.strain==='introit'){e.phase='buried';e.timer=2.5;e.hp=Math.max(1,Math.round((spec.hp||3)*s.config.strainHP));}
 if(e.k==='strain'&&e.strain!=='introit')e.phase='exposed';
 if(e.k==='plate')e.phase='cut';
 if(e.k==='scan')e.hidden=true;
 if(e.k==='eye')e.phase='open';
 if(e.k==='cyst')e.revealed=false;
 s.entities.push(e);return e;
}
export function enterStage(s,index){
 const def=opById(s.id);if(index>=def.stages.length){finishOp(s,true);return;}
 s.stage=index;s.stageTime=0;s.advance=0;s.stageInjected=false;s.entities=[];
 for(const seat of s.seats){seat.grab=null;seat.work=null;seat.dry=0;}
 const st=def.stages[index];for(const e of st.spawn||[])spawnEntity(s,e);
 if(st.cold)s.cold=120;if(st.pink)s.pink=.001;
 if(st.special==='blue')triggerBlue(s,!!st.scripted);
 if(st.special==='quiet'){s.quietUnlocked=true;s.composure=Math.max(70,s.composure);}
 if(st.special==='rewind'){s.composure=Math.max(75,s.composure);if(!s.lookCount)s.vitals[0]=Math.max(20,s.vitals[0]-18);}
 if(st.special==='massage')s.massage={hits:0,last:-1,lastAt:-3,bad:0};else s.massage=null;
 emit(s,'stage',{index,title:st.title,say:st.say});s.checkpoint=snapshotCore(s);
}
export function retryStage(s){const cursors=s.seats.map(x=>({...x,grab:null,using:false,work:null,draw:0}));const cp=structuredClone(s.checkpoint);Object.assign(s,cp);s.seats=cursors;s.status='operating';s.vitals=s.vitals.map(v=>Math.max(50,v));s.remaining=Math.max(90,s.remaining);s.mistakes=0;s.flags.retried=true;s.history=[];s.events=[];return s;}
export function rating(s,seat,quality='CLEAN',at=null){
 const points=quality==='CLEAN'?100:quality==='GOOD'?60:20;
 if(quality==='CLEAN'){s.streak++;s.clean++;s.composure=clamp(s.composure+s.config.composureGain,0,100);}else {s.streak=0;if(quality==='GOOD')s.good++;else s.sloppy++;}
 s.bestStreak=Math.max(s.bestStreak,s.streak);const n=Math.round(points*(1+Math.min(10,s.streak-1)*.1));
 s.actions++;s.score+=n;seat.score+=n;seat.actions++;emit(s,'rating',{quality,x:at?.x??seat.x,z:at?.z??seat.z,seat:seat.id,points:n});
}
export function mistake(s,seat,why='HEALTHY TISSUE',spawn=true){
 s.mistakes++;s.streak=0;s.score=Math.max(0,s.score-150);s.vitals[seat.table]=Math.max(0,s.vitals[seat.table]-s.config.mistakePenalty);
 emit(s,'mistake',{why,x:seat.x,z:seat.z,seat:seat.id});
 if(spawn&&s.entities.filter(x=>!x.required&&!x.done).length<5)spawnEntity(s,{k:'nick',x:clamp(seat.x-.6,-5,4),z:seat.z,length:1.3,table:seat.table,required:false});
 if(s.config.maxMistakes>0&&!s.unlimitedMistakes&&s.mistakes>=s.config.maxMistakes&&!s.god)finishOp(s,false,'TOO MANY MISTAKES');
}
export function finishOp(s,won,cause=''){if(s.status!=='operating')return;s.status=won?'saved':'lost';s.cause=cause;s.quiet=false;emit(s,won?'saved':'lost',{cause});}
export function results(s){
 const total=Math.round((s.score+5*Math.max(0,s.remaining)+10*Math.min(...s.vitals))*(1-.05*Math.min(s.lookCount,8)));
 const ratio=total/opById(s.id).par;let rank=ratio>=.85?'S':ratio>=.7?'A':ratio>=.5?'B':'C';
 if(s.flags.retried&&['S','A'].includes(rank))rank='B';if(s.flags.emergency&&rank==='S')rank='A';
 return{total,rank,pristine:rank==='S'&&s.mistakes===0,time:s.elapsed,vitals:Math.round(Math.min(...s.vitals)),mistakes:s.mistakes,streak:s.bestStreak,clean:s.clean};
}
export function triggerBlue(s,scripted=false){if(s.blue||s.status!=='operating')return;s.blue={left:12,shocks:0,charge:0,held:false,needle:0,scripted};s.quiet=false;if(!scripted){s.blueUsed++;s.flags.emergency=true;}emit(s,'blue');}
export function useLook(s,seat){
 if(s.composure<s.config.lookCost||s.blue)return false;
 const target=s.history.find(h=>h.tick>=s.tick-s.config.lookSeconds*60)||s.history[0];
 if(!target)return false;
 const comp=s.composure-s.config.lookCost,looks=s.lookCount+1,cursors=s.seats.map(x=>({...x})),trace=(s.traces[seat.id]?.length?s.traces[seat.id]:s.trace).slice(-240).map(x=>({...x}));
 Object.assign(s,structuredClone(target));s.composure=comp;s.lookCount=looks;s.seats=cursors;s.history=[];s.ghost=trace;s.trace=[];s.traces=s.seats.map(()=>[]);s.events=[];
 for(const x of s.seats){x.grab=null;x.work=null;x.using=false;}s.flags.lookUsed=true;emit(s,'rewind',{seat:seat.id,ghost:trace.filter((_,i)=>i%6===0)});return true;
}
function finishEntity(s,e,seat,quality='CLEAN'){
 if(e.done)return;e.done=true;e.grabbed=null;seat.grab=null;seat.work=null;
 s.scars.push({k:e.k,x:e.ox,z:e.oz,path:e.path,table:e.table});if(s.scars.length>40)s.scars.shift();
 if(e.k==='nerve')s.vitals[0]=Math.min(99,s.vitals[0]+8);
 if(e.k==='plate'){s.bpm+=6;emit(s,'plate',{bpm:s.bpm});}
 rating(s,seat,quality,e);emit(s,'complete',{kind:e.k,x:e.x,z:e.z,seat:seat.id});
}
export function validTool(e){
 if(e.k==='pool'||e.k==='droplet')return'drain';if(['laceration','nick'].includes(e.k))return'suture';
 if(e.k==='incision')return'scalpel';if(e.k==='mask')return'gel';if(e.k==='scan')return'scanner';
 if(e.k==='polyp'||e.k==='eye')return'laser';if(e.k==='cyst')return e.revealed?'laser':'scanner';
 if(e.k==='plate')return e.phase==='cut'?'scalpel':e.phase==='lift'?'forceps':'laser';
 if(e.k==='strain')return e.phase==='buried'?'scanner':e.phase==='knock'?'scalpel':'forceps';return'forceps';
}
export function targetPoint(e){
 const tool=validTool(e);if(tool==='scalpel'||tool==='suture')return e.path[Math.min(e.progress,e.path.length-1)];
 if(e.k==='mask')return e.cells.find(c=>c.v<.2)||e;
 return e;
}
function heartSafe(s){return(s.elapsed*s.bpm/60)%1>.35;}
function inRange(seat,p,r){return Math.hypot(seat.x-p.x,seat.z-p.z)<r;}
function traceAction(s,e,seat,dt){
 const p=e.path[Math.min(e.progress,e.path.length-1)],d=dist(seat,p),tol=(seat.tool==='suture'?.57:.55)*s.config.tolerance;
 if(d<tol){e.heat+=dt;if(e.heat>.035){e.progress++;e.heat=0;if(seat.tool==='suture'){seat.stitches++;emit(s,'stitch',{x:p.x,z:p.z,n:e.progress});}}
  if(e.progress>=e.path.length){
   if(e.k==='plate'){e.phase='lift';e.progress=0;e.heat=0;emit(s,'lance',{x:e.x,z:e.z});}
   else if(e.k==='strain'){e.phase='exposed';e.timer=5;e.progress=0;e.path=Array.from({length:9},(_,i)=>({x:e.x+(e.x>3?-1:1)*2.5*i/8,z:e.z-.7*i/8}));emit(s,'lance',{x:e.x,z:e.z});}
   else finishEntity(s,e,seat,(e.deviation||0)/Math.max(1,e.samples||0)>.12?'GOOD':'CLEAN');
  }
 }else if(seat.work===e.id&&d>1.15*s.config.tolerance){seat.dry+=dt;if(seat.dry>.3){mistake(s,seat,'OFF THE GUIDE');seat.dry=0;seat.work=null;}return false;}
 if(d<tol||seat.work===e.id){seat.work=e.id;if(d<tol){const prev=e.path[Math.max(0,e.progress-1)]||p,dx=p.x-prev.x,dz=p.z-prev.z,len=dx*dx+dz*dz,t=len?clamp(((seat.x-prev.x)*dx+(seat.z-prev.z)*dz)/len,0,1):1;const dev=Math.hypot(seat.x-prev.x-dx*t,seat.z-prev.z-dz*t);e.deviation=(e.deviation||0)+dev;e.samples=(e.samples||0)+1;}return true;}return false;
}
function releaseGrab(s,seat){
 if(!seat.grab)return;const e=s.entities.find(e=>e.id===seat.grab);seat.grab=null;if(!e||e.done)return;e.grabbed=null;
 if(e.k==='fragment'||(e.k==='organ'&&e.place)){
  const angle=Math.abs(Math.atan2(Math.sin((e.angle||0)-(e.targetAngle||0)),Math.cos((e.angle||0)-(e.targetAngle||0))));
  if(Math.hypot(e.x-e.tx,e.z-e.tz)<.65*s.config.tolerance&&angle<Math.PI/12*s.config.tolerance){e.x=e.tx;e.z=e.tz;finishEntity(s,e,seat,angle<Math.PI/36?'CLEAN':'GOOD');}
  else {e.x=e.ox;e.z=e.oz;emit(s,'drop',{x:e.x,z:e.z});}return;
 }
 if(e.free){
  if(e.k==='strain'){
   if(e.strain==='miserere'&&s.seats.length>1&&!e.assisted){e.x=e.ox;e.z=e.oz;e.progress=0;e.free=false;emit(s,'two-hands');return;}
   e.hp--;rating(s,seat,'CLEAN');emit(s,'tether',{hp:e.hp,x:e.x,z:e.z});
   if(e.hp<=0)finishEntity(s,e,seat);else{e.phase=e.strain==='introit'?'buried':'exposed';e.timer=3;e.progress=0;e.free=false;e.x=e.ox;e.z=e.oz;
     e.path=Array.from({length:9},(_,i)=>({x:e.x+(e.x>3?-1:1)*2.5*i/8,z:e.z-.7*i/8}));
     if(e.strain==='introit')spawnEntity(s,{k:'laceration',x:e.ox-1,z:e.oz+1,length:2,required:false});}
  }else if(e.k==='plate'){e.phase='laser';e.x=e.ox;e.z=e.oz;e.progress=0;e.free=false;emit(s,'lift',{x:e.x,z:e.z});}
  else finishEntity(s,e,seat,e.error>.5?'GOOD':'CLEAN');
 }else{e.x=e.ox;e.z=e.oz;e.progress=0;if(e.k==='strain')mistake(s,seat,'THE TETHER SNAPPED BACK');}
}
function forcepsAction(s,e,seat,dt,input){
 if(!seat.grab){if(e.grabbed!=null||!inRange(seat,e,.68*s.config.tolerance))return false;seat.grab=e.id;e.grabbed=seat.id;e.progress=0;e.error=0;emit(s,'grab',{x:e.x,z:e.z});}
 if(seat.grab!==e.id)return false;
 if(e.k==='fragment'||(e.k==='organ'&&e.place)){e.x=seat.x;e.z=seat.z;e.angle=(e.angle||0)+(input.rotate||0)*dt*2;return true;}
 const path=e.path;
 const point=path[Math.min(e.progress,path.length-1)],d=dist(seat,point);
 if(d<.52*s.config.tolerance){
  if(e.k==='magnet'&&seat.speed>4.5){e.progress=Math.max(0,e.progress-1);emit(s,'resist');}
  else e.progress++;
 }else if(d>1.4*s.config.tolerance&&!e.free){e.error+=dt;if(e.error>.25){mistake(s,seat,'PULL ALONG THE ARROW');e.progress=0;e.error=0;seat.grab=null;e.grabbed=null;e.x=e.ox;e.z=e.oz;return true;}}
 e.x=seat.x;e.z=seat.z;
 if(e.progress>=path.length)e.free=true;return true;
}
function toolStep(s,seat,input,dt){
 const prevUse=seat.using;seat.using=!!input.use;
 if(TOOLS.includes(input.tool)&&input.tool!==seat.tool){releaseGrab(s,seat);seat.lastTool=seat.tool;seat.tool=input.tool;seat.dry=0;seat.work=null;seat.draw=0;emit(s,'tool',{tool:seat.tool,seat:seat.id});}
 if(input.drop){releaseGrab(s,seat);seat.using=false;seat.work=null;seat.dry=0;seat.draw=0;return;}
 if(!seat.using){releaseGrab(s,seat);seat.work=null;seat.dry=0;}
 if(seat.tool==='syringe'){
  if(seat.using&&s.doses>0){seat.draw=Math.min(1,seat.draw+dt/.45);if(!prevUse)emit(s,'draw');}
  if(prevUse&&!seat.using&&seat.draw>=1&&s.doses>0){s.doses--;if(inRange(seat,INJECTION,INJECTION.r*s.config.tolerance)){
    s.vitals[seat.table]=Math.min(99,s.vitals[seat.table]+s.config.syringeDose);s.stageInjected=true;s.flags.injected=true;s.bpm=Math.max(60,s.bpm-12);rating(s,seat);emit(s,'inject');
   }else{rating(s,seat,'SLOPPY');emit(s,'wasted');}seat.draw=0;
  }if(!seat.using)seat.draw=0;return;
 }
 if(!seat.using)return;
 if(seat.tool==='gel'){
  if(s.tick%7===0){const patch=s.barriers.find(p=>p.table===seat.table&&dist(p,seat)<.4);if(patch)patch.life=10;else s.barriers.push({x:seat.x,z:seat.z,table:seat.table,life:10});if(s.barriers.length>80)s.barriers.shift();}
  for(const nick of s.entities)if(nick.k==='nick'&&!nick.done&&nick.table===seat.table&&dist(nick,seat)<1){nick.heal=(nick.heal||0)+dt;if(nick.heal>1)finishEntity(s,nick,seat);}
 }
 let did=false,nearWrong=false;
 const candidates=seat.grab?s.entities.filter(e=>e.id===seat.grab):s.entities.filter(e=>!e.done&&e.table===seat.table);
 for(const e of candidates){
  if(e.done)continue;const want=validTool(e);
  if(want!==seat.tool){if(inRange(seat,e,e.r+.5))nearWrong=true;continue;}
  if((e.k==='plate')&&!heartSafe(s)){
   if(inRange(seat,targetPoint(e),.7)){seat.dry+=dt;did=true;if(seat.dry>.5){rating(s,seat,'SLOPPY');s.vitals[seat.table]=Math.max(1,s.vitals[seat.table]-2);seat.dry=0;emit(s,'systole');}}continue;
  }
  if(seat.tool==='drain'&&inRange(seat,e,e.r+.4)){
   e.r-=s.config.drainRate*dt*(typeof input.use==='number'?Math.max(.25,input.use):1);did=true;if(e.r<.2)finishEntity(s,e,seat);break;
  }
  if(seat.tool==='scanner'&&inRange(seat,e,2.2)){
   did=true;if(e.k==='scan'){e.heat+=dt;if(e.heat>.5){e.hidden=false;finishEntity(s,e,seat);emit(s,'scan',{x:e.x,z:e.z});}}
   if(e.k==='cyst'&&!e.revealed){e.revealed=true;e.hidden=false;emit(s,'scan',{x:e.x,z:e.z});}continue;
  }
  if(seat.tool==='gel'&&e.cells){
   for(const c of e.cells)if(inRange(seat,c,.85)){c.v=Math.min(.2,c.v+dt);did=true;}
   const n=e.cells.filter(c=>c.v>=.2).length;e.coverage=n/e.cells.length;if(e.coverage>=.92)finishEntity(s,e,seat);continue;
  }
  if(seat.tool==='laser'&&inRange(seat,e,.65*s.config.tolerance)){
   did=true;
   if(e.k==='cyst'&&!e.real){mistake(s,seat,'A FALSE CYST',false);e.done=true;break;}
   if(e.k==='eye'&&e.phase!=='open')break;
   e.heat+=dt;const goal=e.k==='eye'?1.2:s.config.laserTime;
   if(e.heat>=goal){e.heat=0;if(e.k==='eye'){e.hp--;rating(s,seat);if(e.hp<=0)finishEntity(s,e,seat);else {e.cooldown=1.5;emit(s,'eye-hit');}}else finishEntity(s,e,seat);}break;
  }
  if(seat.tool==='scalpel'||seat.tool==='suture'){if(traceAction(s,e,seat,dt)){did=true;break;}}
  if(seat.tool==='forceps'){if(forcepsAction(s,e,seat,dt,input)){did=true;break;}}
 }
 if(did)seat.dry=0;
 else if(nearWrong){if(!prevUse)emit(s,'wrong',{tool:seat.tool});seat.dry=0;}
 else if(['laser','scalpel','drain'].includes(seat.tool)){
  seat.dry+=dt;if(seat.dry>(seat.tool==='drain'?.8:.65)){if(seat.tool==='drain')rating(s,seat,'SLOPPY');else mistake(s,seat,'HEALTHY TISSUE');seat.dry=-.5;}
 }
}
function blueStep(s,inputs,dt){
 const b=s.blue;b.left-=dt;const held=inputs.some(i=>i&&(i.left||i.use)&&(i.right||i.gift));
 if(held){b.charge+=dt;b.needle=.5-.5*Math.cos(b.charge*Math.PI/1.2);}
 if(b.held&&!held){
  if(Math.abs(b.needle-.72)<s.config.blueWidth/2&&b.charge>.15){b.shocks++;emit(s,'shock',{good:true});}
  else {b.left-=3;emit(s,'shock',{good:false});}b.charge=0;b.needle=0;
 }
 b.held=held;
 if(b.shocks>=2){const scripted=b.scripted;s.blue=null;s.vitals=s.vitals.map(v=>Math.max(25,v));s.flags.blueComplete=true;if(scripted)s.flags.scriptedBlue=s.stage;emit(s,'revived');}
 else if(b.left<=0)finishOp(s,false,'RESUSCITATION FAILED');
}
function entityStep(s,e,dt){
 if(e.done)return;e.timer=(e.timer||0)-dt;
 if(e.k==='strain'&&e.strain==='introit'&&e.grabbed==null){
  if(e.phase==='buried'){
   e.x=e.ox+Math.sin(s.elapsed*1.2)*.45*s.config.strainSpeed;e.z=e.oz+Math.cos(s.elapsed*.8)*.3;
   if(e.timer<=0){e.phase='knock';e.timer=4;e.progress=0;e.path=pathLine(e.x-.45,e.z,.9);emit(s,'knock',{x:e.x,z:e.z});}
  }else if(e.phase==='knock'&&e.timer<=0){e.phase='buried';e.timer=4;spawnEntity(s,{k:'pool',x:e.x,z:e.z,r:.65,required:false});emit(s,'missed-knock');}
  else if(e.phase==='exposed'&&e.timer<=0){e.phase='buried';e.timer=4;}
 }
 if(e.k==='eye'){
  e.cooldown=Math.max(0,(e.cooldown||0)-dt);const left=s.entities.filter(x=>x.k==='eye'&&!x.done);const idx=left.indexOf(e);
  e.phase=e.cooldown>0?'closed':((Math.floor(s.elapsed/2)+idx)%Math.max(2,left.length)<2?'open':'closed');
  if(left.length<=2){e.x=e.ox+Math.sin(s.elapsed*.6+e.index)*.45;e.z=e.oz+Math.cos(s.elapsed*.7+e.index)*.3;}
  if(s.tick%150===0&&e.phase==='open')spawnEntity(s,{k:'droplet',x:e.x,z:e.z+.3,r:.25,required:false});
 }
 if(e.k==='droplet'){e.z+=dt*1.5;if(s.barriers.some(p=>p.table===e.table&&dist(p,e)<.75))e.done=true;else if(e.z>3){e.done=true;s.vitals[e.table]=Math.max(0,s.vitals[e.table]-1);}}
}
export function step(s,inputs=[],dt=DT){
 if(s.status!=='operating')return s;
 s.tick++;s.elapsed+=dt;
 if(s.blue){blueStep(s,inputs,dt);return s;}
 const def=opById(s.id),stage=def.stages[s.stage];
 if(s.tick%6===0){s.history.push(snapshotCore(s));if(s.history.length>61)s.history.shift();}
 s.trace.push({x:s.seats[0].x,z:s.seats[0].z,tool:s.seats[0].tool,use:s.seats[0].using,tick:s.tick});if(s.trace.length>240)s.trace.shift();
 for(const seat of s.seats){const trace=s.traces[seat.id]||(s.traces[seat.id]=[]);trace.push({x:seat.x,z:seat.z,tool:seat.tool,use:seat.using,tick:s.tick});if(trace.length>240)trace.shift();}
 const wasQuiet=s.quiet;s.quiet=false;
 for(let i=0;i<s.seats.length;i++){
  const seat=s.seats[i],input=inputs[i]||{};if(!seat.active)continue;
  if(input.table!=null)seat.table=clamp(input.table,0,s.vitals.length-1);
  if(input.tag&&def.partner){seat.gift=seat.gift==='look'?'quiet':'look';for(const other of s.seats)if(other.id!==seat.id)other.gift=seat.gift==='look'?'quiet':'look';emit(s,'tag',{gift:seat.gift});}
  else if(input.tag)emit(s,'reminder',{say:stage.say});
  if(input.gift&&s.quietUnlocked){
   if(seat.gift==='quiet'&&s.composure>=(wasQuiet?.01:20)){s.quiet=true;}
   else if(seat.gift==='look'&&!seat.giftPrev){seat.giftPrev=true;if(useLook(s,seat))return s;}
  }
  seat.giftPrev=!!input.gift;
 }
 const simdt=dt*(s.quiet?s.config.quietSlow:1);s.stageTime+=simdt;
 s.barriers=s.barriers.filter(p=>(p.life-=simdt)>0);
 if(s.pink>0&&s.pink<1&&s.entities.some(e=>e.k==='clamp'&&e.done))s.pink=Math.min(1,s.pink+simdt*.5);
 if(s.quiet){s.composure=Math.max(0,s.composure-s.config.quietDrain*dt);s.quietTime+=dt;if(s.infiniteComposure)s.composure=100;}
 if(!s.freezeClock)s.remaining-=simdt;
 if(s.cold>0){s.cold-=simdt;if(s.cold<=0&&!s.pink)finishOp(s,false,'DONOR COLD TIME EXPIRED');}
 const base=stage.drain??def.drain;const pressure=1+s.config.coopScale*(s.seats.length-1);
 if(!s.quiet)for(let i=0;i<s.vitals.length;i++){
  const bleeders=s.entities.filter(e=>!e.done&&e.table===i&&['pool','nick','laceration'].includes(e.k)).length;
  s.vitals[i]-=(base*s.config.drainMultiplier+Math.min(2,bleeders*s.config.bleedDrain))*DIFFICULTY[s.difficulty].drain*pressure*simdt;
 }
 for(const e of s.entities)entityStep(s,e,simdt);
 if(stage.boss==='miserere'){
  const core=s.entities.find(e=>e.k==='strain'&&!e.done);if(core&&core.grabbed!=null){const hand=s.seats[core.grabbed];core.assisted=s.seats.some((seat,i)=>i!==core.grabbed&&inputs[i]?.use&&inputs[i]?.tool==='forceps'&&Math.hypot((inputs[i].x??seat.x)-hand.x,(inputs[i].z??seat.z)-hand.z)<1.3);}
  const echo=s.trace[Math.max(0,s.trace.length-180)];if(echo&&s.trace.length>180&&echo.use&&s.tick%45===0&&Math.hypot(echo.x-s.seats[0].x,echo.z-s.seats[0].z)<.6){s.vitals[0]-=3;emit(s,'echo',{x:echo.x,z:echo.z});}
 }
 for(let i=0;i<s.seats.length;i++){
  const seat=s.seats[i],input=inputs[i]||{};if(!seat.active)continue;
  const px=seat.x,pz=seat.z;seat.x=clamp(input.x??seat.x,-6.4,6.4);seat.z=clamp(input.z??seat.z,-3.5,3);
  seat.speed=Math.hypot(seat.x-px,seat.z-pz)/dt;
  if(stage.special==='massage'){
   const side=input.left?0:input.right?1:-1,m=s.massage;
   if(side>=0&&side!==m.last&&s.elapsed-m.lastAt>.25){const phase=(s.elapsed*s.bpm/60)%1;
    if(Math.min(phase,1-phase)<.25){m.hits++;emit(s,'massage',{hits:m.hits});}else{m.bad++;emit(s,'offbeat');}m.last=side;m.lastAt=s.elapsed;}
  }else toolStep(s,seat,input,dt);
 }
 if(s.god)s.vitals=s.vitals.map(()=>99);
 if(s.infiniteComposure)s.composure=100;
 if(s.remaining<=0){finishOp(s,false,'TIME EXPIRED');return s;}
 if(s.vitals.some(v=>v<=0)){
  if(s.blueUsed<DIFFICULTY[s.difficulty].blue)triggerBlue(s,false);else finishOp(s,false,'VITALS LOST');return s;
 }
 if(s.bpm>=120&&!s.flags.fibrillation&&stage.boss==='wrath'){s.flags.fibrillation=true;s.bpm=96;triggerBlue(s,true);return s;}
 if(stage.deadline&&s.stageTime>stage.deadline&&!s.flags['wave'+s.stage]){s.flags['wave'+s.stage]=true;s.vitals[0]-=25;emit(s,'wave');}
 let clear=s.entities.every(e=>e.done||!e.required||(e.k==='cyst'&&!e.real));
 if(stage.special==='inject')clear=s.stageInjected;
 if(stage.special==='blue')clear=s.flags.scriptedBlue===s.stage;
 if(stage.special==='quiet')clear=s.quietTime>.35;
 if(stage.special==='rewind')clear=s.lookCount>0;
 if(stage.special==='massage')clear=s.massage.hits>=8;
 if(clear){s.advance+=dt;if(s.advance>.8)enterStage(s,s.stage+1);}else s.advance=0;
 return s;
}
