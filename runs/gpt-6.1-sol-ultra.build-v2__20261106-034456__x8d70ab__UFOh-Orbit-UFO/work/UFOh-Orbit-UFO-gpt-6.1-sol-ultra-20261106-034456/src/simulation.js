import {ARENA, DEFAULT_BALANCE, BALANCE_VERSION, BALANCE_SPECS, sanitizeBalance} from './data/balance.js';
import {ENEMY_DEFS, FORMATIONS} from './data/enemies.js';
import {MISSION, SCORE_DECK, CONTENT_VERSION} from './data/mission.js';
export {ARENA,DEFAULT_BALANCE,BALANCE_SPECS,MISSION,CONTENT_VERSION};
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), hypot=Math.hypot;
const norm=a=>((a%TAU)+TAU)%TAU;
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const distance=(a,b)=>hypot(a.x-b.x,a.y-b.y);
const clone=o=>JSON.parse(JSON.stringify(o));
const neutral=()=>({mx:0,my:0,ax:0,ay:0,aim:false,fire:false});
function seeded(seed){if(globalThis.My3D2dge?.rng)return globalThis.My3D2dge.rng(seed);let s=seed|0;return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function random(w){w.rngCalls++;return w._rng();}
function emit(w,type,x=480,y=270,data={}){const e={id:++w.eventId,type,time:w.time,x,y,...data};w.events.push(e);if(w.events.length>64)w.events.splice(0,w.events.length-64);w.history[type]=(w.history[type]||0)+1;return e;}
function id(w){return w.nextId++;}
export function createWorld({mode='mission',players=1,seed=7,balance={},attract=false,content=MISSION,recordReplay=true}={}){
  const n=Array.isArray(players)?players.length:players;
  const w={version:1,balanceVersion:BALANCE_VERSION,contentVersion:content.version||CONTENT_VERSION,arena:{...ARENA},mode:mode==='score'?'score-attack':mode,seed:seed>>>0,time:0,tick:0,status:'running',debug:false,attract:!!attract,invulnerable:!!attract,
    balance:sanitizeBalance(balance),content:clone(content),players:[],enemies:[],bullets:[],blasts:[],chains:[],gates:[],events:[],history:{},stats:{shots:0,rams:0,fusions:0,kills:0,chainKills:0,gunships:0,rescues:0,hits:0,bossPhases:0,sectorTimes:[]},
    score:0,bestChain:0,sector:0,wave:0,waveClock:0,waveStarted:false,spawned:[],transition:2.1,objective:'FLIGHT CLEARANCE · MOVE. POINT. LET THE BEAD CATCH UP.',nextId:1,eventId:0,rngCalls:0,boss:null,deadTimer:0,extraction:null,scoreWave:0,tutorial:{moved:false,fired:false,rammed:false,recharged:false,escaped:false},overlays:false};
  Object.defineProperty(w,'_rng',{value:seeded(seed),writable:true,enumerable:false});
  Object.defineProperty(w,'replay',{value:recordReplay?{version:1,seed:seed>>>0,balanceVersion:BALANCE_VERSION,contentVersion:w.contentVersion,initial:{mode:w.mode,players:Array.isArray(players)?[...players]:n,seed:seed>>>0,balance:{...w.balance},attract:!!attract,content:clone(content)},frames:[],commands:[]}:null,writable:true,enumerable:false});
  Object.defineProperty(w,'_replayKey',{value:'',writable:true,enumerable:false});
  for(let i=0;i<clamp(n||1,1,2);i++)w.players.push({id:Array.isArray(players)?players[i]:i+1,x:480+(i?65:-25),y:405,vx:0,vy:0,r:16,angle:-Math.PI/2,targetAngle:-Math.PI/2,hull:w.balance.hull,shield:0,invuln:1.4,grace:0,cooldown:0,down:false,score:0,shots:0,rammed:0,active:true,recoil:0,damageFlash:0});
  emit(w,'launch',480,300,{sector:0,text:'GOOD NEWS. YOUR SAUCER HAS A SHIELD.'});
  return w;
}
function pilot(w,i){return w.players[i]||w.players.find(p=>p.id===i);}
function alive(w){return w.players.filter(p=>!p.down&&p.active!==false);}
function nearestPilot(w,e){let p=null,d=Infinity;for(const a of alive(w)){const dd=distance(a,e);if(dd<d){d=dd;p=a;}}return p;}
export function validateContent(data){
  const errors=[];
  if(!data||typeof data!=='object')return {ok:false,errors:['Content must be an object.']};
  if(!Array.isArray(data.sectors)||data.sectors.length<1||data.sectors.length>12)return {ok:false,errors:['Provide 1–12 sectors.']};
  const ids=new Set();
  data.sectors.forEach((s,si)=>{
    if(typeof s.name!=='string'||s.name.length>70)errors.push(`Sector ${si+1}: give it a short name.`);
    if(!Array.isArray(s.waves)||!s.waves.length||s.waves.length>40){errors.push(`Sector ${si+1}: provide 1–40 waves.`);return;}
    s.waves.forEach((wave,wi)=>{
      const at=`Sector ${si+1}, wave ${wi+1}`;
      if(typeof wave.id!=='string'||ids.has(wave.id))errors.push(`${at}: wave IDs must be unique text.`);ids.add(wave.id);
      if(!Array.isArray(wave.spawns)||!wave.spawns.length||wave.spawns.length>16){errors.push(`${at}: provide 1–16 spawn groups.`);return;}
      wave.spawns.forEach(sp=>{
        if(!ENEMY_DEFS[sp.type])errors.push(`${at}: unknown enemy ${sp.type}.`);
        if(!FORMATIONS.includes(sp.formation))errors.push(`${at}: unknown formation ${sp.formation}.`);
        for(const [key,min,max] of [['at',0,180],['cx',20,940],['cy',20,520],['count',1,32],['spacing',0,350]])if(!Number.isFinite(sp[key])||sp[key]<min||sp[key]>max)errors.push(`${at}: ${key} must be ${min}–${max}.`);
        if(!Number.isInteger(sp.count))errors.push(`${at}: count must be a whole number.`);
      });
    });
  });
  return {ok:errors.length===0,errors};
}
export function exportContent(w){return JSON.stringify(w?.content||MISSION,null,2);}
export function importContent(w,text){let data;try{data=typeof text==='string'?JSON.parse(text):text;}catch{return{ok:false,errors:['Invalid JSON. Keep the current working content.']};}const result=validateContent(data);if(!result.ok)return result;if(w.replay)w.replay.commands.push({tick:w.tick,command:'importContent',args:{text:JSON.stringify(data)}});w.content=clone(data);w.contentVersion=data.version||'custom';w.debug=true;w.sector=clamp(w.sector,0,data.sectors.length-1);w.wave=0;restartEncounter(w);return result;}
function currentWave(w){return w.content.sectors[w.sector]?.waves[w.wave];}
function pointsFor(sp){
  const out=[],n=sp.count||1,s=sp.spacing||0,a=sp.angle||0;
  for(let i=0;i<n;i++){
    let dx=0,dy=0;
    switch(sp.formation){
      case'line':dx=(i-(n-1)/2)*s;break;
      case'cluster':{const cols=Math.ceil(Math.sqrt(n));dx=(i%cols-(cols-1)/2)*s;dy=(Math.floor(i/cols)-(Math.ceil(n/cols)-1)/2)*s;break;}
      case'ring':dx=Math.cos(i/n*TAU)*s;dy=Math.sin(i/n*TAU)*s;break;
      case'fusion':dx=(i%2?1:-1)*(s/2);dy=(Math.floor(i/2)-(Math.ceil(n/2)-1)/2)*100;break;
      case'cross':if(i){const arm=(i-1)%4,rank=Math.floor((i-1)/4)+1;dx=Math.cos(arm*Math.PI/2)*rank*s;dy=Math.sin(arm*Math.PI/2)*rank*s;}break;
      case'pincer':dx=(i-(n-1)/2)*s;dy=(i%2)*45;break;
      case'lane':dx=i*s;dy=i*58;break;
    }
    const ca=Math.cos(a),sa=Math.sin(a);
    out.push({...sp,x:clamp(sp.cx+dx*ca-dy*sa,24,936),y:clamp(sp.cy+dx*sa+dy*ca,24,516),angle:sp.angle});
  }
  return out;
}
function spawnEnemy(w,spec){
  const def=ENEMY_DEFS[spec.type]||ENEMY_DEFS.drifter;
  const a=Number.isFinite(spec.angle)?spec.angle:random(w)*TAU;
  const e={id:id(w),type:spec.type||'drifter',x:clamp(spec.x??480,24,936),y:clamp(spec.y??200,24,516),vx:0,vy:0,r:def.r,angle:a,age:0,alive:true,arm:spec.type==='hunter'?w.balance.hunterArm:0,merge:spec.merge!==false&&def.merge,mergeWith:0,mergeTime:0,speed:spec.speed??1,spin:(random(w)>.5?1:-1)*(.45+random(w)*.5),fireTimer:w.balance.gunshipVolley,warning:spec.type==='gunship'?w.balance.gunshipWarning:0};
  if(e.type==='gunship'){
    e.angle=Number.isFinite(spec.angle)?spec.angle:(e.x>480?Math.PI+.35:.35);e.lane={x1:e.x,y1:e.y,x2:clamp(e.x+Math.cos(e.angle)*1000,0,960),y2:clamp(e.y+Math.sin(e.angle)*1000,0,540)};
    emit(w,'gunship-warning',e.x,e.y,{enemy:e.id,lane:e.lane});
  }
  if(e.type==='boss'){
    e.x=480;e.y=172;e.phase=1;e.phaseTime=0;e.attackTimer=2.2;e.spawnTimer=8;e.open=false;e.components=[];e.health=0;e.maxHealth=0;e.phaseHitGrace=0;initBossPhase(w,e);w.boss=e;emit(w,'boss-arrival',e.x,e.y,{phase:1,text:'COMMAND CRAFT. PLEASE REMAIN IMPRESSED.'});
  }
  w.enemies.push(e);emit(w,'spawn',e.x,e.y,{enemy:e.id,enemyType:e.type});return e;
}
function initBossPhase(w,b){
  const hp=Math.max(2,Math.round(w.balance.bossHealth/9*(w.players.length===2?1.3:1)));
  b.components=Array.from({length:3},(_,i)=>({id:`${b.id}:${b.phase}:${i}`,x:b.x,y:b.y,hp,maxHp:hp,open:false,angle:i*TAU/3}));b.health=hp*3;b.maxHealth=hp*3;b.phaseTime=0;b.phaseHitGrace=.6;w.stats.bossPhases++;emit(w,'boss-phase',b.x,b.y,{phase:b.phase,text:['','OPEN EMITTERS. CLOSE THE MATTER.','PURSUIT DIVISION. STILL VERY RUDE.','FINAL NOTICE. MAKE IT LOUD.'][b.phase]});
}
function queueFormation(w,sp){const ps=pointsFor(sp);w.gates.push({id:id(w),type:sp.type,x:sp.cx,y:sp.cy,timer:.85,spawns:ps});emit(w,'gate',sp.cx,sp.cy,{enemyType:sp.type});}
function beginWave(w){
  w.waveStarted=true;w.waveClock=0;w.spawned=[];
  if(w.mode==='score-attack'){
    w.scoreWave++;w.wave=w.scoreWave-1;w.sector=Math.min(3,Math.floor((w.scoreWave-1)/4));
    const level=Math.floor((w.scoreWave-1)/5),bossWave=w.scoreWave%7===0;
    w.scoreEncounter={id:`score-${w.scoreWave}`,title:`SIGNAL ${String(w.scoreWave).padStart(2,'0')}`,learning:'KEEP YOUR RING. KEEP YOUR NERVE.',delay:1,spawns:bossWave?[{at:0,formation:'single',type:'boss',cx:480,cy:170,count:1,spacing:0}]:[]};
    if(!bossWave){const pick=SCORE_DECK[(w.scoreWave-1)%SCORE_DECK.length];w.scoreEncounter.spawns.push({at:0,...pick,count:Math.min(20,pick.count+level*2),cx:480,cy:220,angle:pick.type==='gunship'?.35:0});if(level>0)w.scoreEncounter.spawns.push({at:5,formation:'pincer',type:'hunter',cx:480,cy:130,count:Math.min(5,level+1),spacing:140});}
    w.objective=`SCORE ATTACK · SIGNAL ${w.scoreWave} · CLEAR ALL CONTACTS`;
  } else {const enc=currentWave(w);w.objective=enc?.learning||'CLEAR ALL CONTACTS';}
  const enc=w.mode==='score-attack'?w.scoreEncounter:currentWave(w);emit(w,'wave',480,270,{wave:w.wave,sector:w.sector,text:enc?.title||'SIGNAL'});
}
function nextWave(w){
  if(w.mode==='score-attack'){w.waveStarted=false;w.transition=1.2;return;}
  w.wave++;w.waveStarted=false;w.transition=1.1;
  if(w.wave>=w.content.sectors[w.sector].waves.length){
    w.stats.sectorTimes.push(w.time);w.sector++;w.wave=0;w.transition=3;
    if(w.sector>=w.content.sectors.length){w.sector=w.content.sectors.length-1;startExtraction(w);return;}
    if(w.content.sectors[w.sector].repair)for(const p of alive(w)){p.hull=Math.min(w.balance.hull,p.hull+w.balance.sectorRepair);p.shield=0;p.invuln=2;}
    emit(w,'sector',480,270,{sector:w.sector,text:w.content.sectors[w.sector].subtitle});
  }
}
function startExtraction(w){if(w.extraction)return;w.extraction={time:0,x:480,y:270};w.objective='COMMAND SILENCED · EXTRACTION CLEAR';w.bullets=[];w.gates=[];for(const e of w.enemies)if(e.type!=='boss')killEnemy(w,e,-1,null,0);emit(w,'extraction',480,270,{text:'SPACE IS SAFE. TEMPORARILY.'});}
function encounterStep(w,dt){
  if(w.extraction){w.extraction.time+=dt;if(w.extraction.time>=3){w.status='victory';emit(w,'victory',480,270,{score:w.score,text:'MISSION COMPLETE. NATURALLY.'});}return;}
  if(w.transition>0){w.transition=Math.max(0,w.transition-dt);if(w.transition>0)return;}
  if(!w.waveStarted)beginWave(w);
  w.waveClock+=dt;
  const enc=w.mode==='score-attack'?w.scoreEncounter:currentWave(w);if(!enc)return;
  enc.spawns.forEach((sp,i)=>{if(!w.spawned.includes(i)&&w.waveClock>=sp.at){w.spawned.push(i);queueFormation(w,sp);}});
  if(w.spawned.length===enc.spawns.length&&w.gates.length===0&&w.enemies.filter(e=>e.alive).length===0&&w.waveClock>1)nextWave(w);
}
function consumeShield(w,p,kind){p.shield=w.balance.shieldRecharge;p.grace=w.balance.contactGrace;emit(w,'shield-spent',p.x,p.y,{player:p.id,cause:kind});}
function fire(w,p){
  if(p.cooldown>0)return false;p.cooldown=w.balance.shotInterval;p.shield=w.balance.shieldRecharge;p.recoil=1;p.shots++;w.stats.shots++;w.tutorial.fired=true;
  const c=Math.cos(p.angle),s=Math.sin(p.angle);w.bullets.push({id:id(w),x:p.x+c*30,y:p.y+s*30,px:p.x+c*30,py:p.y+s*30,vx:c*w.balance.bulletSpeed,vy:s*w.balance.bulletSpeed,r:4,life:w.balance.bulletLife,owner:p.id,hostile:false,alive:true});emit(w,'shot',p.x+c*28,p.y+s*28,{player:p.id,angle:p.angle});return true;
}
function movePilots(w,inputs,dt){
  for(let i=0;i<w.players.length;i++){
    const p=w.players[i],b=w.balance;p.cooldown=Math.max(0,p.cooldown-dt);p.invuln=Math.max(0,p.invuln-dt);p.grace=Math.max(0,p.grace-dt);p.recoil=Math.max(0,p.recoil-dt*8);p.damageFlash=Math.max(0,p.damageFlash-dt*4);
    const previousShield=p.shield;p.shield=Math.max(0,p.shield-dt);if(previousShield>0&&p.shield===0){emit(w,'shield-ready',p.x,p.y,{player:p.id});w.tutorial.recharged=true;}
    if(p.down||p.active===false){p.vx=0;p.vy=0;continue;}
    const input=inputs[i]||neutral();let mx=Number.isFinite(input.mx)?clamp(input.mx,-1,1):0,my=Number.isFinite(input.my)?clamp(input.my,-1,1):0;
    const magnitude=hypot(mx,my);if(magnitude>1){mx/=magnitude;my/=magnitude;}if(magnitude>.08)w.tutorial.moved=true;
    let ax=input.ax,ay=input.ay;if(input.aim&&Number.isFinite(ax)&&Number.isFinite(ay)&&hypot(ax,ay)>.06)p.targetAngle=norm(Math.atan2(ay,ax));else if(magnitude>.08)p.targetAngle=norm(Math.atan2(my,mx));
    const angleDiff=norm(p.targetAngle-p.angle);p.angle=norm(p.angle+Math.min(angleDiff,b.aimSpeed*dt));
    const exposed=p.shield>0,speed=b.moveSpeed*(exposed?b.recoverySpeed:1),smooth=1-Math.exp(-b.acceleration*dt);
    p.vx+=(mx*speed-p.vx)*smooth;p.vy+=(my*speed-p.vy)*smooth;p.x=clamp(p.x+p.vx*dt,p.r+5,ARENA.w-p.r-5);p.y=clamp(p.y+p.vy*dt,p.r+5,ARENA.h-p.r-5);
    if(p.x<=p.r+5||p.x>=ARENA.w-p.r-5)p.vx=0;if(p.y<=p.r+5||p.y>=ARENA.h-p.r-5)p.vy=0;
    if(input.fire)fire(w,p);else if(p.shield===0&&w.tutorial.fired&&magnitude>.1)w.tutorial.escaped=true;
  }
}
function hostileShot(w,e,angle,speed=w.balance.hostileSpeed){
  w.bullets.push({id:id(w),x:e.x+Math.cos(angle)*(e.r+8),y:e.y+Math.sin(angle)*(e.r+8),px:e.x,py:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:6,life:5.5,owner:-1,hostile:true,alive:true});emit(w,'missile',e.x,e.y,{enemy:e.id});
}
function updateBoss(w,b,dt){
  const bal=w.balance;b.phaseTime+=dt;b.phaseHitGrace=Math.max(0,b.phaseHitGrace-dt);b.x=480+Math.sin(b.age*.22)*(b.phase===3?110:55);b.y=176+Math.sin(b.age*.33)*25;b.angle=b.age*(b.phase===3?.19:.10);
  const cycle=b.phaseTime%bal.bossAttackInterval;b.open=cycle>=1.6&&cycle<bal.bossAttackInterval-.55;
  for(let i=0;i<b.components.length;i++){const c=b.components[i];c.angle=b.angle+i*TAU/3+(b.phase===2?Math.PI/3:0);c.x=b.x+Math.cos(c.angle)*82;c.y=b.y+Math.sin(c.angle)*65;c.open=b.open&&c.hp>0;}
  b.attackTimer-=dt;
  if(b.attackTimer<=0){b.attackTimer=bal.bossAttackInterval;emit(w,'boss-warning',b.x,b.y,{phase:b.phase});const p=nearestPilot(w,b);if(p){const a=Math.atan2(p.y-b.y,p.x-b.x);for(let i=0;i<3+b.phase;i++)hostileShot(w,b,a+(i-(2+b.phase)/2)*.17,bal.hostileSpeed*(b.phase===3?1.04:.9));}}
  b.spawnTimer-=dt;
  if(b.spawnTimer<=0){b.spawnTimer=b.phase===1?14:b.phase===2?16:19;const cx=b.x+Math.sin(b.age)*140,cy=b.y+85;if(b.phase===1)queueFormation(w,{at:0,formation:'line',type:'drifter',cx,cy,count:4,spacing:50,merge:false});else if(b.phase===2)queueFormation(w,{at:0,formation:'pincer',type:'hunter',cx:480,cy:100,count:2,spacing:260});else queueFormation(w,{at:0,formation:'lane',type:'gunship',cx:60,cy:410,count:1,spacing:0,angle:-.32});}
}
function enemiesStep(w,dt){
  for(const g of w.gates)g.timer-=dt;
  const due=w.gates.filter(g=>g.timer<=0);w.gates=w.gates.filter(g=>g.timer>0);for(const g of due)for(const spec of g.spawns)spawnEnemy(w,spec);
  for(const e of w.enemies){
    if(!e.alive)continue;e.age+=dt;e.arm=Math.max(0,e.arm-dt);
    if(e.type==='boss'){updateBoss(w,e,dt);continue;}
    if(e.mergeWith){const other=w.enemies.find(a=>a.id===e.mergeWith&&a.alive);if(!other){e.mergeWith=0;e.mergeTime=0;}else {e.mergeTime+=dt;const dx=other.x-e.x,dy=other.y-e.y;e.x+=dx*dt*.55;e.y+=dy*dt*.55;e.angle+=e.spin*dt;if(e.mergeTime>=w.balance.fusionTime&&e.id<other.id){e.alive=false;other.alive=false;const h=spawnEnemy(w,{type:'hunter',x:(e.x+other.x)/2,y:(e.y+other.y)/2});w.stats.fusions++;emit(w,'fusion',h.x,h.y,{enemy:h.id});}continue;}}
    if(e.type==='drifter'){
      e.angle+=e.spin*dt;let vx=e.vx||Math.cos(e.id*2.3+w.seed*.1)*w.balance.drifterSpeed*e.speed,vy=e.vy||Math.sin(e.id*1.7+w.seed*.2)*w.balance.drifterSpeed*e.speed;
      if(e.x<35)vx=Math.abs(vx);if(e.x>925)vx=-Math.abs(vx);if(e.y<35)vy=Math.abs(vy);if(e.y>505)vy=-Math.abs(vy);
      if(w.waveClock>20&&w.enemies.filter(a=>a.alive).length<3){const p=nearestPilot(w,e);if(p){const a=Math.atan2(p.y-e.y,p.x-e.x);vx=Math.cos(a)*Math.max(30,w.balance.drifterSpeed);vy=Math.sin(a)*Math.max(30,w.balance.drifterSpeed);}}
      e.vx=vx;e.vy=vy;
    }else if(e.type==='hunter'){
      if(e.arm>0){e.vx=0;e.vy=0;continue;}const p=nearestPilot(w,e);if(p){const target=Math.atan2(p.y-e.y,p.x-e.x),turn=clamp(delta(e.angle,target),-w.balance.hunterTurn*dt,w.balance.hunterTurn*dt);e.angle=norm(e.angle+turn);}
      e.vx=Math.cos(e.angle)*w.balance.hunterSpeed*e.speed;e.vy=Math.sin(e.angle)*w.balance.hunterSpeed*e.speed;
    }else if(e.type==='gunship'){
      if(e.warning>0){e.warning=Math.max(0,e.warning-dt);e.vx=e.vy=0;if(e.warning===0)e.fireTimer=.45;continue;}
      e.vx=Math.cos(e.angle)*w.balance.gunshipSpeed;e.vy=Math.sin(e.angle)*w.balance.gunshipSpeed;e.fireTimer-=dt;
      if(e.fireTimer<=0){e.fireTimer=w.balance.gunshipVolley;const p=nearestPilot(w,e);if(p){const a=Math.atan2(p.y-e.y,p.x-e.x);for(const off of [-.11,.11])hostileShot(w,e,a+off);}}
      if((e.x<32&&e.vx<0)||(e.x>928&&e.vx>0)||(e.y<32&&e.vy<0)||(e.y>508&&e.vy>0)){e.angle=norm(e.angle+Math.PI);e.warning=w.balance.gunshipWarning;e.lane={x1:e.x,y1:e.y,x2:clamp(e.x+Math.cos(e.angle)*1000,0,960),y2:clamp(e.y+Math.sin(e.angle)*1000,0,540)};emit(w,'gunship-warning',e.x,e.y,{enemy:e.id,lane:e.lane});}
    }
    e.x=clamp(e.x+e.vx*dt,22,938);e.y=clamp(e.y+e.vy*dt,22,518);
  }
  const ds=w.enemies.filter(e=>e.alive&&e.type==='drifter'&&e.merge&&!e.mergeWith&&e.age>.85);
  for(let i=0;i<ds.length;i++)for(let j=i+1;j<ds.length;j++){const a=ds[i],b=ds[j];if(a.mergeWith||b.mergeWith)continue;if(distance(a,b)<w.balance.fusionRadius){a.mergeWith=b.id;b.mergeWith=a.id;a.mergeTime=b.mergeTime=0;emit(w,'fusion-warning',(a.x+b.x)/2,(a.y+b.y)/2,{a:a.id,b:b.id});}}
}
function makeChain(w,owner){const c={id:id(w),owner,depth:0,count:0,points:0,x:0,y:0,last:w.time,victims:[]};w.chains.push(c);return c;}
function killEnemy(w,e,owner,chain=null,depth=0){
  if(!e||!e.alive||e.type==='boss')return false;
  const c=chain||makeChain(w,owner);if(c.victims.includes(e.id))return false;c.victims.push(e.id);e.alive=false;w.stats.kills++;if(e.type==='gunship')w.stats.gunships++;
  const mult=Math.min(w.balance.chainMultiplier,depth+1),points=ENEMY_DEFS[e.type].score*mult;c.x=(c.x*c.count+e.x)/(c.count+1);c.y=(c.y*c.count+e.y)/(c.count+1);c.count++;c.depth=Math.max(c.depth,depth);c.points+=points;c.last=w.time;w.score+=points;const p=w.players.find(p=>p.id===c.owner);if(p)p.score+=points;w.bestChain=Math.max(w.bestChain,c.count);if(depth>0)w.stats.chainKills++;
  w.blasts.push({id:id(w),x:e.x,y:e.y,age:-.045,r:0,maxRadius:w.balance.chainRadius,life:w.balance.blastDuration,chain:c.id,depth,owner:c.owner});emit(w,'destroy',e.x,e.y,{enemy:e.id,enemyType:e.type,owner:c.owner,chain:c.id,depth,points});if(c.count>1)emit(w,'chain',c.x,c.y,{chain:c.id,count:c.count,points:c.points,multiplier:mult});return true;
}
function hitBoss(w,b,component,owner,damage=1,chain=null){
  if(!b.alive||!b.open||b.phaseHitGrace>0||!component?.open||component.hp<=0)return false;
  if(chain){const key=component.id;if(chain.victims.includes(key))return false;chain.victims.push(key);}
  component.hp=Math.max(0,component.hp-damage);b.health=b.components.reduce((v,c)=>v+c.hp,0);emit(w,'boss-hit',component.x,component.y,{component:component.id,phase:b.phase,owner,hp:component.hp});
  if(b.health<=0){
    emit(w,'boss-break',b.x,b.y,{phase:b.phase});
    if(b.phase<3){b.phase++;initBossPhase(w,b);b.attackTimer=2;b.spawnTimer=7;for(const p of alive(w)){p.invuln=Math.max(p.invuln,1.3);p.hull=Math.min(w.balance.hull,p.hull+1);}w.bullets=w.bullets.filter(s=>!s.hostile);}
    else {b.alive=false;w.boss=null;const reward=ENEMY_DEFS.boss.score;w.score+=reward;const p=w.players.find(p=>p.id===owner);if(p)p.score+=reward;emit(w,'boss-defeated',b.x,b.y,{reward});if(w.mode==='mission')startExtraction(w);}
  }
  return true;
}
function segmentHit(x1,y1,x2,y2,cx,cy,r){const dx=x2-x1,dy=y2-y1,fx=x1-cx,fy=y1-cy,a=dx*dx+dy*dy,c=fx*fx+fy*fy-r*r;if(c<=0)return 0;if(a===0)return null;const b=2*(fx*dx+fy*dy),disc=b*b-4*a*c;if(disc<0)return null;const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;}
function damagePilot(w,p,source){
  if(p.down||p.invuln>0||p.grace>0||w.invulnerable)return false;
  p.hull=Math.max(0,p.hull-1);p.invuln=w.balance.damageImmunity;p.damageFlash=1;p.shield=w.balance.shieldRecharge;w.stats.hits++;emit(w,'hull-hit',p.x,p.y,{player:p.id,hull:p.hull});
  const a=source?Math.atan2(p.y-source.y,p.x-source.x):p.angle+Math.PI;p.x=clamp(p.x+Math.cos(a)*28,22,938);p.y=clamp(p.y+Math.sin(a)*28,22,518);p.vx=Math.cos(a)*90;p.vy=Math.sin(a)*90;
  if(p.hull===0){p.down=true;emit(w,'wreck',p.x,p.y,{player:p.id,text:w.players.length>1?'PARTNER DOWN. FULL SHIELD TO RESCUE.':'A MAGNIFICENT MISUNDERSTANDING.'});}
  return true;
}
function resolveBullets(w,dt){
  for(const s of w.bullets){
    if(!s.alive)continue;s.px=s.x;s.py=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;const expired=s.life<=0||s.x< -48||s.x>1008||s.y< -48||s.y>588;
    const hits=[];
    for(const e of w.enemies){if(!e.alive)continue;if(s.hostile&&e.type!=='drifter')continue;
      if(e.type==='boss'){
        for(const c of e.components)if(c.hp>0){const t=segmentHit(s.px,s.py,s.x,s.y,c.x,c.y,20+s.r);if(t!==null)hits.push({t,enemy:e,component:c});}
        const t=segmentHit(s.px,s.py,s.x,s.y,e.x,e.y,48+s.r);if(t!==null)hits.push({t,enemy:e});
      }else{const t=segmentHit(s.px,s.py,s.x,s.y,e.x,e.y,e.r+s.r);if(t!==null)hits.push({t,enemy:e});}
    }
    if(s.hostile)for(const p of alive(w)){const t=segmentHit(s.px,s.py,s.x,s.y,p.x,p.y,p.r+s.r);if(t!==null)hits.push({t,player:p});}
    hits.sort((a,b)=>a.t-b.t||(a.enemy?.id||0)-(b.enemy?.id||0));const hit=hits[0];if(!hit){if(expired)s.alive=false;continue;}s.alive=false;
    if(hit.player){const p=hit.player;if(p.invuln>0||p.grace>0)continue;if(p.shield===0)consumeShield(w,p,'missile');else damagePilot(w,p,s);}
    else if(hit.enemy.type==='boss'){if(hit.component)hitBoss(w,hit.enemy,hit.component,s.owner);else emit(w,'ricochet',s.x,s.y,{enemy:hit.enemy.id});}
    else killEnemy(w,hit.enemy,s.hostile?w.balance.environmentOwner:s.owner);
  }
}
function resolveContacts(w){
  // Stable player/entity ID order. Rescue first; each ready shield resolves only ONE
  // contact. The 120ms contact grace prevents an overlapping crowd stealing hull
  // in the same shield-consumption batch. Hull invulnerability is separate.
  for(const p of alive(w)){
    if(p.shield===0){const wreck=w.players.find(a=>a.down&&a.active!==false&&distance(a,p)<p.r+a.r+10);if(wreck){consumeShield(w,p,'rescue');wreck.down=false;wreck.hull=1;wreck.shield=w.balance.shieldRecharge;wreck.invuln=w.balance.damageImmunity;wreck.grace=.25;wreck.x=clamp(wreck.x+35,22,938);w.stats.rescues++;emit(w,'rescue',wreck.x,wreck.y,{player:wreck.id,rescuer:p.id});continue;}}
    if(p.invuln>0||p.grace>0)continue;
    const contacts=w.enemies.filter(e=>e.alive&&e.arm===0&&distance(e,p)<p.r+e.r).sort((a,b)=>a.id-b.id);
    const e=contacts[0];if(!e)continue;
    if(p.shield===0){consumeShield(w,p,'ram');p.rammed++;w.stats.rams++;w.tutorial.rammed=true;emit(w,'ram',e.x,e.y,{player:p.id,enemy:e.id});if(e.type==='boss'){const c=e.components.filter(c=>c.open).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(c&&distance(c,p)<95)hitBoss(w,e,c,p.id,w.balance.ramDamage);const a=Math.atan2(p.y-e.y,p.x-e.x);p.x=clamp(e.x+Math.cos(a)*(e.r+p.r+10),22,938);p.y=clamp(e.y+Math.sin(a)*(e.r+p.r+10),22,518);}else killEnemy(w,e,p.id);}
    else damagePilot(w,p,e);
  }
}
function resolveBlasts(w,dt){
  // Newly propagated blasts start next tick, producing a visible travelling cascade.
  const existing=[...w.blasts];
  for(const b of existing){b.age+=dt;if(b.age<0)continue;b.r=b.maxRadius*clamp(b.age/.16,0,1);const c=w.chains.find(c=>c.id===b.chain);if(!c)continue;
    for(const e of w.enemies){if(!e.alive)continue;if(e.type==='boss'){for(const comp of e.components)if(distance(b,comp)<b.r+15)hitBoss(w,e,comp,c.owner,2,c);}else if(distance(b,e)<b.r+e.r)killEnemy(w,e,c.owner,c,b.depth+1);}
  }
  w.blasts=w.blasts.filter(b=>b.age<b.life);w.chains=w.chains.filter(c=>w.time-c.last<2);
}
export function stepWorld(w,inputs=[],dt=1/120){
  if(w.status!=='running')return w;if(!Number.isFinite(dt)||dt<=0)return w;
  // Native engine supplies 1/120 steps. Splitting larger designer/test steps keeps
  // the same collision contract and never skips shield/merge/telegraph windows.
  if(dt>1/60+.000001){let remaining=dt;while(remaining>1e-9){const slice=Math.min(1/120,remaining);stepWorld(w,inputs,slice);remaining-=slice;if(w.status!=='running')break;}return w;}
  if(w.replay){const vectors=w.players.map((p,i)=>{const a=inputs[i]||{};return [Number.isFinite(a.mx)?a.mx:0,Number.isFinite(a.my)?a.my:0,Number.isFinite(a.ax)?a.ax:0,Number.isFinite(a.ay)?a.ay:0,a.aim?1:0,a.fire?1:0];});const key=JSON.stringify([dt,vectors]),last=w.replay.frames.at(-1);if(last&&w._replayKey===key)last[0]++;else{w.replay.frames.push([1,dt,vectors]);w._replayKey=key;}}
  w.time+=dt;w.tick++;movePilots(w,inputs,dt);encounterStep(w,dt);enemiesStep(w,dt);resolveBullets(w,dt);resolveContacts(w);resolveBlasts(w,dt);
  w.enemies=w.enemies.filter(e=>e.alive);w.bullets=w.bullets.filter(s=>s.alive);if(w.boss&&!w.boss.alive)w.boss=null;
  if(alive(w).length===0){w.deadTimer+=dt;if(w.deadTimer>=1.15){w.status='defeat';emit(w,'defeat',480,270,{score:w.score,text:'A FINE EXPLOSION. TRY AGAIN.'});}}else w.deadTimer=0;
  return w;
}
export function snapshotWorld(w){
  const {content,history,scoreEncounter,...rest}=w;
  return clone({...rest,events:w.events.slice(-40),stats:{...w.stats},boss:w.boss});
}
function restartEncounter(w){w.enemies=[];w.bullets=[];w.blasts=[];w.chains=[];w.gates=[];w.boss=null;w.waveClock=0;w.waveStarted=false;w.spawned=[];w.transition=.8;w.status='running';w.extraction=null;w.deadTimer=0;for(const p of w.players){p.down=false;p.hull=w.balance.hull;p.shield=0;p.invuln=1.5;p.x=480+(p===w.players[0]?-40:40);p.y=405;p.vx=p.vy=0;}}
export function commandWorld(w,command,args={}){
  const data=typeof args==='number'?{value:args}:args||{};
  if(command==='snapshot')return snapshotWorld(w);
  if(command==='exportContent')return exportContent(w);
  if(command==='importContent')return importContent(w,data.text??args);
  if(w.replay)w.replay.commands.push({tick:w.tick,command:command==='step'?'markDebug':command,args:clone(args)});
  w.debug=true;
  if(command==='invuln'||command==='invulnerable'){w.invulnerable=data.value===undefined?!w.invulnerable:!!data.value;return w.invulnerable;}
  if(command==='refill'){for(const p of w.players){p.down=false;p.hull=w.balance.hull;p.shield=0;p.invuln=1.5;}return true;}
  if(command==='spawn'){const type=typeof args==='string'?args:data.type||'drifter';if(!ENEMY_DEFS[type])return false;const spec={type,cx:data.x??480,cy:data.y??170,count:clamp(data.count||1,1,24),spacing:data.spacing||55,formation:data.formation||'single',angle:data.angle,merge:data.merge,speed:data.speed};for(const p of pointsFor(spec))spawnEnemy(w,p);return true;}
  if(command==='formation'){const sp={at:0,type:'drifter',cx:480,cy:200,count:8,spacing:57,formation:'cluster',...data};if(!FORMATIONS.includes(sp.formation)||!ENEMY_DEFS[sp.type])return false;queueFormation(w,sp);return true;}
  if(command==='clear'){w.enemies=[];w.bullets=[];w.blasts=[];w.chains=[];w.gates=[];w.boss=null;return true;}
  if(command==='sector'){w.sector=clamp(Math.round(data.value??data.sector??0),0,w.content.sectors.length-1);w.wave=clamp(Math.round(data.wave??0),0,w.content.sectors[w.sector].waves.length-1);restartEncounter(w);return true;}
  if(command==='wave'||command==='encounter'){w.wave=clamp(Math.round(data.value??data.wave??0),0,w.content.sectors[w.sector].waves.length-1);restartEncounter(w);return true;}
  if(command==='phase'){if(!w.boss)spawnEnemy(w,{type:'boss',x:480,y:170});w.boss.phase=clamp(Math.round(data.value??data.phase??1),1,3);initBossPhase(w,w.boss);return true;}
  if(command==='restart'||command==='restartEncounter'){restartEncounter(w);return true;}
  if(command==='resetSeed'){w.seed=(data.value??w.seed)>>>0;w._rng=seeded(w.seed);w.rngCalls=0;restartEncounter(w);return true;}
  if(command==='balance'){w.balance=sanitizeBalance({...w.balance,...data});for(const p of w.players)p.shield=Math.min(p.shield,w.balance.shieldRecharge);if(w.boss){const cap=Math.max(2,Math.round(w.balance.bossHealth/9*(w.players.length===2?1.3:1)));for(const c of w.boss.components){c.maxHp=cap;c.hp=Math.min(c.hp,cap);}w.boss.maxHealth=cap*3;w.boss.health=w.boss.components.reduce((v,c)=>v+c.hp,0);}return true;}
  if(command==='resetBalance'){w.balance={...DEFAULT_BALANCE};for(const p of w.players)p.shield=Math.min(p.shield,w.balance.shieldRecharge);if(w.boss){const cap=Math.max(2,Math.round(w.balance.bossHealth/9*(w.players.length===2?1.3:1)));for(const c of w.boss.components){c.maxHp=cap;c.hp=Math.min(c.hp,cap);}w.boss.maxHealth=cap*3;w.boss.health=w.boss.components.reduce((v,c)=>v+c.hp,0);}return true;}
  if(command==='overlays'){w.overlays=data.value===undefined?!w.overlays:!!data.value;return true;}
  if(command==='disconnect'){const p=pilot(w,data.index??data.value??1);if(p){p.active=false;p.down=true;p.hull=0;}return true;}
  if(command==='step'){stepWorld(w,[],data.seconds||1/120);return true;}
  return false;
}
export function autopilot(w,index=0,{rescue=true}={}){
  const p=w.players[index];if(!p||p.down||p.active===false)return neutral();
  const wreck=rescue?w.players.find(a=>a.down&&a.active!==false):null;if(wreck&&p.shield===0){const dx=wreck.x-p.x,dy=wreck.y-p.y,d=hypot(dx,dy);return{mx:dx/(d||1),my:dy/(d||1),ax:0,ay:0,aim:false,fire:false};}
  const es=w.enemies.filter(e=>e.alive);if(!es.length){const dx=480+(index?60:-60)-p.x,dy=410-p.y,d=hypot(dx,dy);return{mx:d>10?dx/d:0,my:d>10?dy/d:0,ax:0,ay:-1,aim:true,fire:false};}
  let target=es.filter(e=>e.type!=='boss').sort((a,b)=>distance(a,p)-distance(b,p))[0];
  const boss=w.boss;if(boss&&boss.open){const cs=boss.components.filter(c=>c.hp>0);if(cs.length)target=cs.sort((a,b)=>distance(a,p)-distance(b,p))[0];}
  if(!target)target=es[0];
  const dist=distance(target,p),lead=dist/w.balance.bulletSpeed;
  const tx=target.x+(target.vx||0)*lead*.85,ty=target.y+(target.vy||0)*lead*.85,ax=tx-p.x,ay=ty-p.y;
  const aimAngle=Math.atan2(ay,ax),aligned=Math.abs(delta(p.angle,aimAngle))<.1;
  // One deliberate ram during training. Later ready shields catch approaching
  // hunters opportunistically; exposed movement favours the largest safe gap.
  if(!w.tutorial.rammed&&w.tutorial.fired&&p.shield===0&&!boss&&target.type!=='gunship'){
    return{mx:(target.x-p.x)/(dist||1),my:(target.y-p.y)/(dist||1),ax,ay,aim:true,fire:false};
  }
  let mx=0,my=0;
  const safe=p.shield>0?195:125;
  for(const e of es){const dx=p.x-e.x,dy=p.y-e.y,d=hypot(dx,dy)||1,need=e.type==='boss'?e.r+100:safe;if(d<need){const f=(need-d)/need*3;mx+=dx/d*f;my+=dy/d*f;}}
  for(const s of w.bullets){if(!s.hostile)continue;const dx=p.x-s.x,dy=p.y-s.y,d=hypot(dx,dy)||1;const toward=(dx*s.vx+dy*s.vy)>0;if(d<160&&toward){let side=Math.sign(s.vx*dy-s.vy*dx)||1;if(index)side=-side;const len=hypot(s.vx,s.vy)||1;mx+=-s.vy/len*side*(160-d)/50;my+=s.vx/len*side*(160-d)/50;}}
  const ideal=boss?270:240;
  if(dist>ideal+100){mx+=(target.x-p.x)/(dist||1)*.55;my+=(target.y-p.y)/(dist||1)*.55;}
  if(p.x<100)mx+=(100-p.x)/50;if(p.x>860)mx-=(p.x-860)/50;if(p.y<85)my+=(85-p.y)/45;if(p.y>460)my-=(p.y-460)/45;
  if(hypot(mx,my)<.1&&dist<ideal){mx+=-(target.y-p.y)/(dist||1)*.18;my+=(target.x-p.x)/(dist||1)*.18;}
  const len=hypot(mx,my);if(len>1){mx/=len;my/=len;}
  const firingOpportunity=aligned&&dist>95&&(!boss||target!==boss)&&p.shield===0;
  const urgent=aligned&&dist>155&&dist<430&&w.time%2.35<.45;
  const fire=firingOpportunity||urgent;
  return{mx,my,ax,ay,aim:true,fire};
}

export function exportReplay(w){return w.replay?clone({...w.replay,result:{status:w.status,time:w.time,tick:w.tick,score:w.score,debug:w.debug}}):null;}
export function replayWorld(record,{untilTick=Infinity}={}){
  if(!record||record.version!==1||!Array.isArray(record.frames)||!record.initial)throw new Error('Unsupported replay record.');
  const w=createWorld({...record.initial,recordReplay:false});let ci=0;const commands=record.commands||[];
  for(const [count,dt,vectors] of record.frames){if(!Number.isInteger(count)||count<1||!Number.isFinite(dt)||dt<=0||!Array.isArray(vectors))throw new Error('Invalid replay input frame.');const inputs=vectors.map(a=>({mx:a[0],my:a[1],ax:a[2],ay:a[3],aim:!!a[4],fire:!!a[5]}));for(let i=0;i<count;i++){while(ci<commands.length&&commands[ci].tick===w.tick){const c=commands[ci++];commandWorld(w,c.command,c.args);}if(w.tick>=untilTick||w.status!=='running')return w;stepWorld(w,inputs,dt);}}
  while(ci<commands.length&&commands[ci].tick===w.tick){const c=commands[ci++];commandWorld(w,c.command,c.args);}
  return w;
}
