import {operations} from '../data/ops/index.js';
import {defaults,difficulty,tools} from '../config/tuning.js';
import {clamp,dist,seeded,project,pointAt,inTray,inDrape,hash} from './math.js';
import {stepBeat,beatDistance} from './beat.js';
import {gradeAction,finalRank} from './scoring.js';
import {Physics} from './physics.js';
export const DT=1/60;
const extractKinds=['shard','tumor','piece','adagio','fermata','crescendo','coda'];
export class Sim {
 constructor({op=0,players=[{id:0,name:'Doctor',color:'#f2b134'}],seed=1847,rng,tuning={},level='normal',doctor,consult='careful',assist=false}={}){
 this.op=typeof op==='number'?operations[op]:op;this.opIndex=operations.indexOf(this.op);this.tuning={...defaults,...tuning};this.level=level;this.diff=difficulty[level]||difficulty.normal;this.rng=rng||seeded(seed);this.events=[];this.inputs=new Map();this.nextId=1;this.assist=assist;this.consult=this.op.consult?consult:null;this.failures={};
 const time=this.op.timer*this.diff.time*this.tuning.timerMult+(this.consult==='careful'?60:this.consult==='aggressive'?-40:0);
 this.state={op:this.opIndex,phase:0,phaseTime:0,tick:0,elapsed:0,vitals:100,minVitals:100,timer:time,timerStart:time,score:0,combo:0,bestCombo:0,misses:0,actions:0,flawless:0,rank:null,doctor:doctor||this.op.doctor,composure:0,hush:0,sforzando:0,freeze:0,beat:0,bar:0,beatPhase:0,bpm:this.op.bpm,pulse:0,site:0,entities:[],tray:[],seats:players.map((p,i)=>({...p,x:-.3+i*.2,y:0,tool:3,site:0,held:null,cooldown:0,score:0,actions:0,clean:0,stats:{Cuts:0,Stitches:0,Burns:0,Saves:0},use:0,steady:false,seq:0})),status:'playing',arrest:false,arrestLeft:0,arrestsSurvived:0,objective:'',clamps:4,notes:assist,progressAt:0};
 this.cheats={god:false,freezeTimer:false,infiniteComposure:false,infiniteClamps:false};this.physics=new Physics(this.state.seats);this.beginPhase(0);
 }
 emit(type,data={}){this.events.push({type,...data,tick:this.state.tick});}
 drainEvents(){const e=this.events;this.events=[];return e;}
 get phase(){return this.op.phases[this.state.phase];}
 input(id,frame){if(this.state.seats.some(s=>s.id===id))this.inputs.set(id,{...frame});}
 spawn(spec,required=true){const s=this.state,site=spec.site??this.phase.site??s.site;
 const e={id:this.nextId++,site,required,done:false,marked:!spec.hidden,age:0,progress:0, ...structuredClone(spec)};
 e.x??=e.at?.[0]??0;e.y??=e.at?.[1]??0;e.ox=e.x;e.oy=e.y;e.spawnBeat=s.beat;
 if(e.hp){e.hp*=this.tuning.strainHpMult*this.diff.hp*(this.opIndex===8?1+.25*(s.seats.length-1):1);e.maxHp=e.hp;}
 if(e.kind==='gelZone'){e.cells=[];const w=e.w||1,h=e.h||.4;for(let x=-w/2+.02;x<w/2;x+=.04)for(let y=-h/2+.02;y<h/2;y+=.04)e.cells.push([e.x+x,e.y+y,0]);}
 if(e.kind==='pool'){e.vol??=.4;e.startVol=e.vol;e.overflow=e.vol>1.2;}
 if(e.kind==='wound'){e.gate=0;e.deviations=[];e.tieTimer=0;}
 if(e.kind==='incision'){e.deviations=[];e.points??=[[e.x-.4,e.y],[e.x+.4,e.y]];}
 if(e.kind==='bleeder'){e.clamped=!!this.phase.clampsOn;e.done=e.clamped;e.poolTimer=0;}
 if(e.kind==='legato'){e.nodes=Array.from({length:e.links},(_,i)=>({x:e.x-.6+1.2*i/(e.links-1),y:e.y+Math.sin(i*1.4)*.14,cut:false,deposited:false,cutBeat:0}));e.remaining=e.links-1;}
 if(e.kind==='crescendo'){e.size??=.2;e.points=Array.from({length:33},(_,i)=>[e.x+Math.cos(i/32*Math.PI*2)*.34,e.y+Math.sin(i/32*Math.PI*2)*.34]);e.deviations=[];s.entities.push(e);for(let i=0;i<4;i++)this.spawn({kind:'feeder',x:e.x+Math.cos(i*Math.PI/2+.5)*.65,y:e.y+Math.sin(i*Math.PI/2+.5)*.45,hp:40,parent:e.id,site},false);this.physics.add(e);return e;}
 s.entities.push(e);this.physics.add(e);return e;}
 beginPhase(index,retry=false){const s=this.state;if(index>=this.op.phases.length){this.win();return;}
 for(const seat of s.seats)if(seat.held)this.drop(seat,false);s.entities=[];s.phase=index;s.phaseTime=0;s.arrest=false;s.phaseArrests=0;s.phaseDrain=0;s.lockFail=false;s.extraSpawned=false;this.phaseTriggered=new Set();
 const p=this.phase;s.site=p.site??0;s.objective=p.objective;s.clamps=4;
 for(const seat of s.seats){seat.site=s.site;seat.cut=null;seat.charge=0;seat.laserTime=0;seat.inject=0;}
 const counts=new Map(),scale=this.opIndex===8?1+.5*(s.seats.length-1):1;for(const original of p.spawn){const n=counts.get(original.kind)||0;counts.set(original.kind,n+1);const copies=['shard','note','wound'].includes(original.kind)?Math.floor((n+1)*scale)-Math.floor(n*scale):1;for(let i=0;i<copies;i++){const spec=structuredClone(original);if(spec.kind==='legato')spec.links=Math.ceil(spec.links*scale);if(i){const dy=(i%2?1:-1)*.13*Math.ceil(i/2);spec.y+=dy;if(spec.gates)spec.gates=spec.gates.map(([x,y])=>[x,y+dy]);}this.spawn(spec);}}
 if(p.begin){const b=p.begin;s.vitals=clamp(b.vitalsSet??(s.vitals+(b.vitals||0)),1,100);s.composure=b.composure??s.composure;s.phaseDrain=b.drain||0;s.lockFail=b.lockFail||false;if(b.doctor)s.doctor=b.doctor;if(b.arrest)this.arrest(b.arrestTime);}
 if(retry){s.vitals=Math.max(60,s.vitals);s.timer=Math.max(90,s.timer);}else this.checkpoint={vitals:s.vitals,timer:s.timer,score:s.score,misses:s.misses,combo:s.combo};
 s.progressAt=s.elapsed;this.emit('phase',{phase:index,objective:p.objective});this.emit('bark',{text:p.say||'Steady hands, Doctor. One thing at a time.'});if(p.strain)this.emit('strain',{strain:p.strain});
 }
 retry(assist=false){const s=this.state;this.failures[s.phase]=(this.failures[s.phase]||0)+1;this.assist||=assist;Object.assign(s,this.checkpoint,{status:'playing',rank:null});s.notes=this.assist;this.beginPhase(s.phase,true);}
 skipTo(index){this.state.status='playing';this.beginPhase(clamp(index,0,this.op.phases.length-1));}
 restart(){this.state.vitals=100;this.state.timer=this.state.timerStart;this.state.score=0;this.state.misses=0;this.state.combo=0;this.state.status='playing';this.beginPhase(0);}
 finishEntity(e,grade='CLEAN',seat=this.state.seats[0]){if(e.done)return;e.done=true;e.progress=1;this.state.progressAt=this.state.elapsed;this.grade(grade,seat,e);this.emit('complete',{id:e.id,kind:e.kind,x:e.x,y:e.y});}
 grade(grade,seat,e){if(grade==='FLAWLESS')this.state.freeze=Math.max(this.state.freeze||0,.06);const n=gradeAction(this.state,grade,this.tuning,seat);this.emit('grade',{grade,points:n,x:e?.x??seat?.x??0,y:e?.y??seat?.y??0});}
 damage(amount){if(this.cheats.god||this.op.unfailing||this.state.lockFail||this.state.arrest)return;const plan=this.consult==='careful'?.8:1;this.state.vitals=clamp(this.state.vitals-amount*this.diff.drain*this.tuning.drainMult*plan*(this.assist?.7:1),0,100);}
 miss(seat,e,amount=3){this.grade('MISS',seat,e);this.damage(amount);this.emit('bark',{event:'miss'});}
 arrest(seconds=8){const s=this.state;s.arrest=true;s.arrestLeft=seconds;s.vitals=15;for(const seat of s.seats)seat.charge=0;this.emit('arrest');}
 shock(seat){const s=this.state;const eye=s.entities.find(e=>e.kind==='fermata'&&!e.done&&e.hp>0);if(eye||Math.abs((seat.charge||0)-1.2)>this.tuning.defibWindow*this.diff.tolerance){s.arrestLeft-=2;this.emit('weakShock');return;}
 s.arrest=false;s.lastShockTick=s.tick;s.vitals=65;s.arrestsSurvived++;s.phaseArrests++;seat.stats.Saves++;s.beatPhase=0;this.emit('defib');this.grade('FLAWLESS',seat);for(const e of s.entities.filter(e=>e.kind==='fermata')){if(e.extract){e.stunned=999;e.hp=0;}else this.finishEntity(e,'CLEAN',seat);} }
 special(seat){const s=this.state;if(s.composure<99&&!this.cheats.infiniteComposure)return;s.composure=0;const doc=this.opIndex===8?(s.seats.indexOf(seat)%2?'ines':'ren'):s.doctor;
 if(doc==='ines'){s.sforzando=this.tuning.sforzandoDuration;for(const e of s.entities){e.stunned=Math.max(e.stunned||0,this.tuning.sforzandoStun);if(e.hp)e.hp*=1-this.tuning.sforzandoDamage;}this.emit('sforzando');}else{s.hush=this.tuning.hushDuration;s.freeze=.4;this.emit('hush');}}
 drop(seat,deposit){const s=this.state,e=s.entities.find(e=>e.id===seat.held);if(e){if(deposit){this.finishEntity(e,e.pullFast?'ROUGH':'FLAWLESS',seat);s.tray.push({id:e.id,kind:e.kind,x:1.5+(e.id%4)*.06,y:.05+(e.id%5)*.07,site:e.site});if(e.poolOnRemove)this.spawn({kind:'pool',x:e.ox,y:e.oy,vol:e.poolOnRemove,site:e.site},true);if(e.chain){const parent=s.entities.find(p=>p.id===e.chain);if(parent){parent.nodes[e.node].deposited=true;parent.remaining--;if(parent.remaining<0)this.finishEntity(parent,'FLAWLESS',seat);}}this.emit('deposit',{id:e.id});}else if(!e.embedded&&e.embed>0){e.x=e.ox;e.y=e.oy;e.progress=0;}else{e.x=seat.x;e.y=seat.y;e.embedded=false;this.damage(1);}this.physics.release(seat,e,deposit);}seat.held=null;}
 available(e){if(e.done||e.site!==this.state.site)return false;if(this.phase.ordered&&!['bleeder','pool','scratch','spore','feeder'].includes(e.kind)){const first=this.state.entities.find(q=>q.required&&!q.done&&q.kind!=='bleeder');if(first&&e.required&&first.kind!==e.kind)return false;}return true;}
 step(dt=DT){const s=this.state;if(s.status!=='playing')return;s.tick++;s.elapsed+=dt;s.phaseTime+=dt;
 const worldScale=s.freeze>0?0:s.hush>0?this.tuning.hushTimeScale:1,wd=dt*worldScale;
 s.hush=Math.max(0,s.hush-dt);s.freeze=Math.max(0,s.freeze-dt);s.sforzando=Math.max(0,s.sforzando-dt);
 if(!this.cheats.freezeTimer&&!this.op.unfailing)s.timer-=wd/(this.assist?1.3:1);
 if(s.arrest){s.arrestLeft-=wd;if(s.arrestLeft<=0&&!this.op.unfailing&&!this.cheats.god){this.fail('FLATLINE');return;}}
 const beat=stepBeat(s,wd,this.tuning,this.op.bpm);if(beat){this.emit('beat',{beat:s.beat});this.strainBeat();}
 for(const seat of s.seats)this.stepSeat(seat,this.inputs.get(seat.id)||{},dt,wd);
 this.updateEntities(dt,wd);this.physics.step(s.seats);for(const item of s.tray){const body=this.physics.bodies.get(item.id);if(body){const p=body.translation(),q=body.rotation();item.pose=[p.x,p.y,p.z,q.x,q.y,q.z,q.w].map(n=>+n.toFixed(4));if(!item.landed&&p.y<.03){item.landed=true;this.emit('land',{id:item.id});}}}
 if(s.phaseDrain&&!s.entities.filter(e=>e.required&&!e.done).length)s.phaseDrain=0;
 if(!s.arrest)this.damage((s.phaseDrain+.035)*wd);
 if(this.cheats.god)s.vitals=100;if(this.cheats.infiniteComposure)s.composure=100;
 s.minVitals=Math.min(s.minVitals,s.vitals);
 if(!s.lockFail&&!this.op.unfailing){if(s.vitals<=0)this.fail('FLATLINE');else if(s.timer<=0)this.fail('TIME');else if(s.misses>=this.diff.misses+(this.tuning.missLimit-defaults.missLimit))this.fail('MALPRACTICE');}
 if(s.status==='playing'&&this.phaseComplete()){if(this.phase.extraWave&&!s.extraSpawned){s.extraSpawned=true;for(let i=0;i<this.phase.extraWave;i++)this.spawn({kind:'note',x:-.9+(i%8)*.25,y:-.28+Math.floor(i/8)*.55,hp:8,ttl:10+i*.8});}else this.beginPhase(s.phase+1);}
 if(s.elapsed-s.progressAt>12&&s.tick%120===0){this.emit('hint',{tools:this.phase.tools,text:this.phase.objective});s.progressAt=s.elapsed;}
 }
 stepSeat(seat,f,dt,wd){const s=this.state,t=this.tuning;seat.cooldown=Math.max(0,seat.cooldown-dt);seat.vent=Math.max(0,(seat.vent||0)-dt);seat.nickCooldown=Math.max(0,(seat.nickCooldown||0)-dt);
 const old={x:seat.x,y:seat.y};seat.steady=!!f.steady;seat.use=clamp(f.use||0,0,1);if(f.tool!=null)seat.tool=clamp(f.tool,0,7);
 if(f.site!=null&&f.site!==seat.site){seat.site=clamp(f.site,0,this.op.sites.length-1);s.site=seat.site;this.emit('site',{site:s.site});}
 if(f.swap&&!seat.prevSwap&&this.opIndex===6)s.doctor=s.doctor==='ren'?'ines':'ren';seat.prevSwap=!!f.swap;
 if(f.recenter){seat.x=0;seat.y=0;}
 if(Number.isFinite(f.x)&&Number.isFinite(f.y)){let dx=f.x-seat.x,dy=f.y-seat.y,len=Math.hypot(dx,dy),max=seat.held?4*dt:Infinity;if(len>max){dx*=max/len;dy*=max/len;}seat.x+=dx;seat.y+=dy;}
 else {const ax=f.ax||0,ay=f.ay||0,m=Math.hypot(ax,ay),speed=m>.12?t.tipSpeed*Math.pow(clamp((m-.12)/.88,0,1),t.stickCurve)*(seat.steady?t.steadyFactor:1):0;seat.x+=ax/(m||1)*speed*dt;seat.y+=ay/(m||1)*speed*dt;}
 if(!Number.isFinite(f.x)&&seat.use>0&&[0,4].includes(seat.tool)){let nearest=null,best=.12;for(const e of s.entities.filter(e=>!e.done&&e.site===seat.site)){const p=e.kind==='wound'?e.gates[e.gate]:null;const q=p?{x:p[0],y:p[1]}:e.kind==='incision'?project(seat.x,seat.y,e.points):null;if(q){const d=Math.hypot(seat.x-q.x,seat.y-q.y);if(d<best){nearest=q;best=d;}}}if(nearest){seat.x+=(nearest.x-seat.x)*t.aimAssist*dt*12;seat.y+=(nearest.y-seat.y)*t.aimAssist*dt*12;}}
 seat.x=clamp(seat.x,-1.55,1.9);seat.y=clamp(seat.y,-.95,.95);seat.speed=dist(seat,old)/dt;
 if(f.special&&!seat.prevSpecial)this.special(seat);seat.prevSpecial=!!f.special;
 const alt=f.alt&&!seat.prevAlt;seat.prevAlt=!!f.alt;
 if(f.hint&&!seat.prevHint)this.emit('hint',{tools:this.phase.tools,text:this.phase.objective});seat.prevHint=!!f.hint;
 if(!s.arrest&&seat.charging&&!(f.charge>0)&&!(f.use>.4&&f.steady)){seat.charging=false;if(s.tick-(s.lastShockTick??-999)<3){s.score+=500;seat.score+=500;seat.stats.Saves++;this.emit('synchronizedShock',{id:seat.id});}}
 if(s.arrest){if((f.charge||0)>0||((f.use||0)>.4&&f.steady)){seat.charge=(seat.charge||0)+dt;seat.charging=true;}else if(seat.charging){seat.charging=false;this.shock(seat);seat.charge=0;}}
 if(f.syringe&&seat.cooldown<=0&&!s.arrest){const inject=s.entities.find(e=>!e.done&&e.kind==='injection'&&e.site===seat.site&&dist(e,seat)<.12);seat.inject=(seat.inject||0)+dt;if(seat.inject>=(inject?.8:.5)){if(inject)this.finishEntity(inject,beatDistance(s)<t.clampWindow?'FLAWLESS':'CLEAN',seat);s.vitals=clamp(s.vitals+t.stabilizerHeal,0,100);seat.cooldown=t.stabilizerCooldown;seat.inject=0;seat.stats.Saves++;this.emit('inject');}}else seat.inject=0;
 const use=seat.use;
 if(seat.held){const e=s.entities.find(e=>e.id===seat.held);if(!e){seat.held=null;return;}
 if(use<.4||alt||seat.tool!==1){this.drop(seat,inTray(seat.x,seat.y));return;}
 if(!e.embedded&&e.embed>0){const a=(e.axis??90)*Math.PI/180,dx=seat.x-e.ox,dy=seat.y-e.oy,along=dx*Math.cos(a)+dy*Math.sin(a),perp=Math.abs(dx*Math.sin(a)-dy*Math.cos(a));
 if(seat.speed>t.pullTol*1.15){if(!seat.nickCooldown){this.miss(seat,e,4);seat.nickCooldown=.5;e.pullFast=true;}seat.x=old.x;seat.y=old.y;return;}
 if(perp>.12+Math.max(0,along)*1.2||along<-.04){seat.x=old.x;seat.y=old.y;return;}
 e.progress=clamp(along/e.embed,0,1);e.x=e.ox+Math.cos(a)*Math.max(0,along)*.25;e.y=e.oy+Math.sin(a)*Math.max(0,along)*.25;
 if(along>=e.embed){e.embedded=true;this.emit('pop',{id:e.id,x:e.x,y:e.y});}}
 else{e.x=seat.x;e.y=seat.y;}return;}
 if(alt){const b=s.entities.find(e=>e.kind==='bleeder'&&e.clamped&&e.site===seat.site&&dist(e,seat)<.14);if(b){b.clamped=false;b.removed=true;b.done=true;s.clamps++;this.emit('unclamp');}const w=s.entities.find(e=>e.kind==='wound'&&e.gate>=e.gates.length&&!e.done);if(w)this.finishEntity(w,'FLAWLESS',seat);}
 const active=s.entities.filter(e=>!e.done&&e.site===seat.site&&this.available({...e,site:s.site}));
 if(!use){seat.stitchId=null;seat.laserTime=0;seat.burnTime=0;seat.cutOut=false;return;}
 const tool=tools[seat.tool],power=(s.sforzando>0?t.sforzandoToolMult:1)*(this.consult==='aggressive'?1.25:1);
 if(tool==='scanner'){for(const e of active){if(dist(e,seat)<t.scannerRadius){e.scanned=true;e.scan=(e.scan||0)+dt;if(e.scan>=.6&&!e.marked){e.marked=true;this.emit('ping',{id:e.id});if(e.kind==='scanMark')this.finishEntity(e,'FLAWLESS',seat);}if(e.kind==='tremolo'&&e.scan>=1&&!(e.pinned>0)){e.pinned=3;e.pins=(e.pins||0)+1;e.scan=0;this.emit('pin',{id:e.id});}}else{e.scanned=false;if(e.kind==='tremolo')e.scan=0;}}return;}
 const near=active.filter(e=>e.marked&&dist(e,seat)<(tool==='suction'?.16:tool==='gel'?t.gelRadius:tool==='laser'?.095:.13)).sort((a,b)=>dist(a,seat)-dist(b,seat));
 if(tool==='gel'){for(const e of active){if(!e.marked)continue;if(e.kind==='gelZone'){let covered=0;for(const c of e.cells){if(Math.hypot(c[0]-seat.x,c[1]-seat.y)<t.gelRadius)c[2]=1;covered+=c[2];}e.progress=covered/e.cells.length;if(e.progress>=.9)this.finishEntity(e,e.age<e.parTime?'FLAWLESS':'CLEAN',seat);}else if(['scratch','spore','nest'].includes(e.kind)&&dist(e,seat)<t.gelRadius){e.progress+=dt*power;if(e.progress>=1)this.finishEntity(e,'CLEAN',seat);}}}
 if(tool==='suction')for(const e of near.filter(e=>e.kind==='pool')){e.vol-=t.suctionRate*dt*use*power;e.progress=1-e.vol/e.startVol;if(e.vol<.02)this.finishEntity(e,e.overflow?'CLEAN':'FLAWLESS',seat);}
 if(tool==='forceps'&&use>=.4){const e=near.find(e=>extractKinds.includes(e.kind)&&!s.seats.some(p=>p.held===e.id)&&(!e.hp||e.hp<=0)&&(!e.tethers||!active.some(v=>v.kind==='tether'))&&(e.kind!=='crescendo'||e.cutDone)&&(e.kind!=='coda'||!e.arms));if(e){seat.held=e.id;e.ox=e.x;e.oy=e.y;e.spawnBeat=s.beat;this.physics.grip(seat,e);this.emit('grip',{id:e.id});}const note=near.find(e=>e.kind==='note');if(note){note.progress+=dt;if(note.progress>=.2)this.finishEntity(note,'CLEAN',seat);}}
 if(tool==='clamp'&&!seat.prevUse){const e=near.find(e=>e.kind==='bleeder'&&!e.removed);if(e&&(s.clamps>0||this.cheats.infiniteClamps)){e.clamped=true;s.clamps--;this.finishEntity(e,beatDistance(s)<t.clampWindow*this.diff.tolerance?'FLAWLESS':beatDistance(s)<t.clampWindow*2*this.diff.tolerance?'CLEAN':'ROUGH',seat);this.emit('clamp');}}
 if(tool==='suture'){for(const e of active.filter(e=>e.kind==='wound')){if(seat.stitchId&&seat.stitchId!==e.id)continue;if(e.gate>=e.gates.length){if(seat.speed>=1.5&&e.tieTimer>0)this.finishEntity(e,'FLAWLESS',seat);continue;}const gate=e.gates[e.gate];const d=Math.hypot(seat.x-gate[0],seat.y-gate[1]);if(d<t.stitchGateR*this.diff.tolerance){seat.stitchId=e.id;e.deviations.push(d);e.gate++;e.progress=e.gate/e.gates.length;seat.stats.Stitches++;s.progressAt=s.elapsed;this.emit('stitch',{x:gate[0],y:gate[1],id:e.id});if(e.gate>=e.gates.length)e.tieTimer=1.5;}else if(seat.stitchId===e.id&&e.gate>0&&Math.hypot(seat.x-e.gates[e.gate-1][0],seat.y-e.gates[e.gate-1][1])>.3&&!seat.nickCooldown){this.miss(seat,e);seat.nickCooldown=.7;}}}
 if(tool==='laser'&&!seat.vent){seat.laserTime=(seat.laserTime||0)+dt;if(seat.laserTime>=6){seat.vent=1.5;seat.laserTime=0;this.emit('vent');return;}
 const target=near.find(e=>e.hp>0&&e.kind!=='tremolo'||e.kind==='tremolo'&&e.pinned>0&&e.hp>0);
 if(target){seat.burnTime=0;let mult=target.kind==='adagio'&&s.beat%4>=2?3:1;if(target.kind==='coda'&&(target.arms>0||s.bar%4!==3))mult=target.arms>0?0:.15;
 target.hp-=t.laserDps*clamp(use,.3,1)*dt*power*mult;seat.stats.Burns+=dt;
 if(target.hp<=0){target.hp=0;if(['adagio','fermata','coda'].includes(target.kind)){if(target.kind==='tremolo'&&(target.pins||0)<target.pinsRequired){target.hp=target.maxHp;target.pinned=0;}else{target.stunned=target.kind==='adagio'?5:999;this.emit('stun',{id:target.id});}}else if(target.kind==='tremolo'&&(target.pins||0)<target.pinsRequired){target.hp=target.maxHp;target.pinned=0;target.scan=0;}else this.finishEntity(target,'FLAWLESS',seat);}}
 else if(inDrape(seat.x,seat.y)){seat.burnTime=(seat.burnTime||0)+dt;if(seat.burnTime>.25){this.damage(t.laserBurn*dt*use);this.emit('scorch',{x:seat.x,y:seat.y});}}}
 if(tool==='scalpel'){let touched=false;
 for(const e of active.filter(e=>['incision','tether','crescendo'].includes(e.kind)&&e.marked)){
 if(e.kind==='crescendo'&&s.entities.some(f=>f.parent===e.id&&!f.done))continue;
 const tol=t.scalpelTol*this.diff.tolerance*(this.op.scalpelMult||1),p=project(seat.x,seat.y,e.points);
 if(e.kind==='tether'){if(p.d<tol*1.6&&seat.speed>=.4){this.finishEntity(e,'CLEAN',seat);touched=true;}continue;}
 if(p.d<tol&&(!e.started?p.t<.12:true)&&p.t<e.progress+.2){e.started=true;e.progress=Math.max(e.progress,p.t);e.deviations.push(p.d);e.fast||=seat.speed>1.8&&p.t>.015;touched=true;seat.cut=e.id;seat.cutOut=false;if(e.progress>.975){if(e.kind==='crescendo'){e.cutDone=true;e.started=false;this.grade('CLEAN',seat,e);}else{this.finishEntity(e,e.fast?'ROUGH':e.deviations.reduce((a,b)=>a+b,0)/e.deviations.length<tol*.35?'FLAWLESS':'CLEAN',seat);seat.stats.Cuts++;seat.nickCooldown=.4;}seat.cut=null;}}
 if(seat.cut===e.id&&e.started&&p.d>tol&&!seat.cutOut&&!seat.nickCooldown){this.nick(seat);seat.cutOut=true;}}
 for(const e of active.filter(e=>e.kind==='legato')){const node=e.nodes[e.remaining];if(node&&!node.cut){const d=Math.hypot(seat.x-node.x,seat.y-node.y);if(d<.1&&seat.speed>.4){node.cut=true;this.physics.sever(e,e.remaining);node.cutBeat=s.beat;this.spawn({kind:'piece',x:node.x,y:node.y,embed:0,chain:e.id,node:e.remaining,site:e.site},true);this.grade('CLEAN',seat,node);touched=true;}}
 for(let i=0;i<e.remaining;i++)if(Math.hypot(seat.x-e.nodes[i].x,seat.y-e.nodes[i].y)<.065&&seat.speed>.4&&!seat.nickCooldown){this.miss(seat,e,4);seat.nickCooldown=.7;const old=e.remaining;e.remaining=Math.min(e.nodes.length-1,e.remaining+2);for(let j=old+1;j<=e.remaining;j++){e.nodes[j].cut=false;e.nodes[j].deposited=false;}this.emit('reheal',{id:e.id});} }
 for(const e of active.filter(e=>e.kind==='coda'&&e.arms>0)){const ax=e.x+(e.arms===2?-.5:.5),ay=e.y+.15;if(Math.hypot(seat.x-ax,seat.y-ay)<.12&&seat.speed>.4){e.arms--;this.grade('CLEAN',seat,e);this.emit('sever',{id:e.id});touched=true;}}
 if(!touched&&!seat.cut&&seat.speed>.25&&inDrape(seat.x,seat.y)&&!seat.nickCooldown){const hasGuide=active.some(e=>(e.points&&project(seat.x,seat.y,e.points).d<.18)||e.kind==='legato'||e.kind==='coda');if(!hasGuide)this.nick(seat);}}
 seat.prevUse=use>0;
 }
 nick(seat){this.miss(seat,null,3);seat.nickCooldown=.4;this.spawn({kind:'pool',x:seat.x,y:seat.y,vol:.15},false);this.emit('nick',{x:seat.x,y:seat.y});}
 strainBeat(){const s=this.state;for(const e of [...s.entities]){if(e.done||e.stunned>0)continue;if(e.kind==='adagio'&&s.beat%4===0&&s.entities.filter(q=>q.kind==='scratch'&&!q.done).length<3)this.spawn({kind:'scratch',x:clamp(e.x-.25,-1,1),y:e.y,site:e.site},false);
 if(e.kind==='legato'&&s.beat%8===0&&s.entities.filter(b=>b.kind==='bleeder').length<2)this.spawn({kind:'bleeder',x:-.6,y:.25,site:e.site},false);
 if(e.kind==='legato')for(let i=0;i<e.nodes.length;i++){const n=e.nodes[i];if(n.cut&&!n.deposited&&s.beat-n.cutBeat>8){n.cut=false;for(const p of s.entities.filter(p=>p.chain===e.id&&p.node===i&&!p.done)){for(const seat of s.seats.filter(q=>q.held===p.id)){this.physics.release(seat,p);seat.held=null;}p.done=true;}this.emit('reattach');}}
 if(e.kind==='crescendo'&&!e.exposed&&e.nextRegrowBeat&&s.beat>=e.nextRegrowBeat){for(let i=0;i<4;i++){const x=e.ox+Math.cos(i*Math.PI/2+.5)*.65,y=e.oy+Math.sin(i*Math.PI/2+.5)*.45;if(!s.entities.some(f=>f.parent===e.id&&!f.done&&Math.hypot(f.ox-x,f.oy-y)<.02))this.spawn({kind:'feeder',x,y,hp:40,parent:e.id,site:e.site},false);}e.nextRegrowBeat=s.beat+16;this.emit('regrow',{id:e.id});}
 if(e.kind==='coda'&&e.arms>0&&s.beat%4===0){this.damage(6);if(s.entities.filter(q=>q.kind==='scratch'&&!q.done).length<3)this.spawn({kind:'scratch',x:.6,y:-.25,site:e.site},false);}if(e.kind==='coda'&&s.beat%4===2&&s.entities.filter(q=>['note','spore'].includes(q.kind)&&!q.done).length<3)this.spawn({kind:'note',x:-.65,y:-.2,hp:8,ttl:6,site:e.site},false);
 }}
 updateEntities(dt,wd){const s=this.state,t=this.tuning;
 for(const seat of s.seats)if(!seat.use)seat.prevUse=false;
 for(const e of [...s.entities]){if(e.done)continue;e.age+=wd;e.stunned=Math.max(0,(e.stunned||0)-wd);e.pinned=Math.max(0,(e.pinned||0)-wd);
 if(e.kind==='pool'&&e.vol>1.2){e.overflow=true;this.damage(.4*wd);}
 if(e.kind==='wound'&&e.tieTimer>0){e.tieTimer-=dt;if(e.tieTimer<=0)this.finishEntity(e,'CLEAN');}
 if(e.kind==='wound')this.damage(.04*wd);
 if(e.kind==='bleeder'&&!e.clamped&&!e.removed){this.damage(wd);e.poolTimer+=wd;const pool=s.entities.find(p=>p.kind==='pool'&&!p.done&&p.source===e.id);if(pool){pool.vol+=.08*wd;pool.startVol=Math.max(pool.startVol,pool.vol);}else if(e.poolTimer>2){e.poolTimer=0;this.spawn({kind:'pool',x:e.x,y:e.y,vol:.22,source:e.id,site:e.site},false);}}
 if(e.kind==='nest'){e.spawnClock=(e.spawnClock||0)+wd*this.tuning.spawnRateMult;if(e.spawnClock>60/s.bpm*1.5&&s.entities.filter(n=>['note','spore'].includes(n.kind)&&!n.done).length<3){e.spawnClock=0;this.spawn({kind:'note',x:clamp(e.x+.12,-1,1),y:clamp(e.y+.1,-.5,.5),site:e.site,hp:8,ttl:60/s.bpm*2},false);}}
 if(e.kind==='scratch')this.damage(.5*wd);if(e.kind==='spore')this.damage(.3*wd);
 if(e.kind==='note'&&e.age>e.ttl/(t.spawnRateMult||1)){this.damage(2);this.finishEntity(e,'ROUGH');this.spawn({kind:'spore',x:e.x,y:e.y,site:e.site},e.required);}
 if(e.kind==='adagio'&&e.hp>0&&!e.stunned){e.x=e.ox+Math.sin(e.age*.4*t.strainSpeedMult)*.3;e.y=e.oy+Math.sin(e.age*.6*t.strainSpeedMult)*.12;}
 if(e.kind==='adagio'&&e.hp<=0&&!e.stunned&&!s.seats.some(q=>q.held===e.id)){e.hp=40;e.maxHp=Math.max(40,e.maxHp);this.emit('wake',{id:e.id});}
 if(e.kind==='egg'&&s.bar>=e.hatchBar&&!e.hatched){e.kind='adagio';e.hp=60;e.maxHp=60;e.embed=.2;e.axis=90;e.hatched=true;e.marked=true;}
 if(e.kind==='tremolo'&&!e.pinned&&!e.stunned){const tip=s.seats.find(q=>q.site===e.site&&dist(e,q)<.6&&q.speed>.45);if(tip){const dx=e.x-tip.x,dy=e.y-tip.y,n=Math.hypot(dx,dy)||1;e.x=clamp(e.x+dx/n*.9*wd*t.strainSpeedMult,-.9,.9);e.y=clamp(e.y+dy/n*.9*wd*t.strainSpeedMult,-.48,.48);this.damage(1.5*wd);e.scan=0;}}
 if(e.kind==='crescendo'&&!e.cutDone&&!e.embedded){const feeders=s.entities.filter(f=>f.parent===e.id&&!f.done).length;if(feeders){if(feeders<4&&!e.nextRegrowBeat)e.nextRegrowBeat=s.beat+16;e.size+=(.02+.015*feeders)*wd*t.strainSpeedMult;this.damage((1+6*e.size)*wd*.22);if(e.size>=1){e.size=.6;this.damage(20);this.spawn({kind:'bleeder',x:-.7,y:.25,site:e.site},false);this.spawn({kind:'bleeder',x:.7,y:-.25,site:e.site},false);this.emit('fortissimo');}}else{e.size=Math.max(.2,e.size-wd*.15);e.exposed=true;}}
 if(e.kind==='coda'&&e.hp>0){const ratio=e.hp/e.maxHp;if((ratio<.66&&!e.moved1)||(ratio<.33&&!e.moved2)){if(ratio<.33)e.moved2=true;else e.moved1=true;e.site=(e.site+1)%this.op.sites.length;e.arms=2;s.site=e.site;for(const seat of s.seats)seat.site=e.site;this.emit('site',{site:e.site});}}
 }
 }
 phaseComplete(){const s=this.state,p=this.phase,d=p.done||{all:true};if(s.phaseTime<(p.minDuration||.4))return false;if(d.vitalsAbove&&s.vitals<d.vitalsAbove)return false;if(d.arrestsSurvived&&s.phaseArrests<d.arrestsSurvived)return false;if(s.arrest)return false;if(d.allClampsOff&&s.entities.some(e=>e.kind==='bleeder'&&e.clamped))return false;return !s.entities.some(e=>e.required&&!e.done);}
 fail(reason='FLATLINE'){if(this.op.unfailing)return;this.state.status='failed';this.state.reason=reason;this.emit('fail',{reason});}
 win(){const s=this.state;if(s.status!=='playing')return;s.status='won';s.score+=Math.round(s.vitals*20+Math.max(0,s.timer)*5+(s.misses?0:1500));if(this.consult)s.score=Math.round(s.score*(this.consult==='careful'?.9:1.15));s.rank=this.op.unfailing?null:finalRank(s,this.op.parScore,this.assist);this.emit('win',{rank:s.rank});}
 completeObjective(){const e=this.state.entities.find(e=>e.required&&!e.done);if(e)this.finishEntity(e,'FLAWLESS');else if(this.state.arrest){this.state.seats[0].charge=1.2;this.shock(this.state.seats[0]);}else this.state.vitals=100;}
 completePhase(){for(const e of this.state.entities){e.done=true;e.clamped=false;}this.state.arrest=false;this.beginPhase(this.state.phase+1);}
 leave(id){const seat=this.state.seats.find(s=>s.id===id);if(seat?.held)this.drop(seat,false);this.inputs.delete(id);this.state.seats=this.state.seats.filter(s=>s.id!==id);}
 hash(){return hash(this.state);}
 free(){this.physics.free();}
}
