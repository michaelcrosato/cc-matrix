import { FIELD,TUNING,WAVES,tuningForDifficulty } from './content.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,d=0)=>Number.isFinite(v)?v:d;
const clone=v=>JSON.parse(JSON.stringify(v));
export function random(world) {
 world.rng=(world.rng+0x6d2b79f5)>>>0;
 let t=world.rng; t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
 return ((t^(t>>>14))>>>0)/4294967296;
}
function event(w,type,more={}) { const e={id:++w.eventSeq,tick:w.tick,type,...more};w.events.push(e);return e; }
function makeBunker(center,index) {
 const cols=16,rows=8,cell=3,original=[];
 for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) original.push((row===0&&(col<3||col>12))||(row===1&&(col<1||col>14))||(row>=5&&col>=6&&col<=9)?0:1);
 return {id:index,x:center-cols*cell/2,y:202,center,cols,rows,cell,original,mask:original.slice(),growth:[]};
}
export function createWorld({seed=0x49a71,players=1,difficulty=1,ids}={}) {
 difficulty=clamp(Math.trunc(finite(difficulty,1)),0,3);players=clamp(Math.trunc(finite(players,1)),1,2);
 seed=finite(seed,0x49a71)>>>0;
 const w={version:1,tick:0,time:0,seed,rng:seed,epoch:0,entitySeq:0,eventSeq:0,encounter:0,location:0,status:'playing',reason:'',score:0,reserve:players*2,extraAwarded:false,assisted:false,difficulty,tuning:tuningForDifficulty(difficulty),players:[],enemies:[],bullets:[],pickups:[],bunkers:[80,186,294,400].map(makeBunker),formation:null,boss:null,saucer:null,events:[],encounterTime:0,transitionTime:0,nextEncounter:null,killCount:0,fireTimer:3.6,volleyCount:0,saucerTimer:0,bossDropTimer:0,invulnerable:false,intro:{moved:false,fired:false,eroded:false,collected:false,repaired:false},stats:{shots:0,hits:0,losses:0,armourHits:0,bombsStopped:0,cellsLost:0,cellsRepaired:0,salvageCaught:0,saucers:0,phases:[],encounters:[]}};
 for(let seat=0;seat<players;seat++) w.players.push({seat,id:ids?.[seat]??`p${seat+1}`,x:players===1?240:seat===0?186:294,y:FIELD.shipY,alive:true,active:true,gone:false,respawn:0,protected:2.4,charges:0,score:0,kills:0,repairs:0,recovery:0,recoil:0,feedback:'',feedbackTime:0,deploymentPaid:false});
 startEncounter(w,0);return w;
}
export function serialize(w){return JSON.stringify(w);}
export function deserialize(data){const w=typeof data==='string'?JSON.parse(data):clone(data);if(w.version!==1||!Array.isArray(w.players)||!Array.isArray(w.bunkers))throw new Error('Unsupported world snapshot.');return w;}
function positions(w) {
 for(const e of w.enemies){e.x=w.formation.startX+e.col*w.formation.spacingX+w.formation.x;e.y=w.formation.y+e.row*w.formation.spacingY;}
}
export function startEncounter(w,index) {
 index=clamp(Math.trunc(finite(index)),0,6);w.epoch++;w.encounter=index;w.location=Math.min(2,Math.floor(index/2));w.encounterTime=0;w.transitionTime=0;w.nextEncounter=null;w.status='playing';w.reason='';w.enemies=[];w.bullets=[];w.boss=null;w.saucer=null;w.fireTimer=index===0?4.5:3.4;w.volleyCount=0;w.saucerTimer=index<6?WAVES[index].saucerAt:12;w.bossDropTimer=6;
 for(const p of w.players){p.protected=Math.max(p.protected,p.alive?2.4:0);p.recovery=0;}
 if(index<6){const d=WAVES[index];w.formation={x:0,y:d.startY,dir:1,timer:0,beat:0,initial:0,interval:w.tuning.marchInterval*d.march,startX:100,spacingX:d.spacingX,spacingY:d.spacingY};
  d.rows.forEach((row,r)=>[...row].forEach((type,col)=>{if(type!=='.')w.enemies.push({id:++w.entitySeq,row:r,col,x:0,y:0,type:type==='A'?'armour':type==='B'?'bombardier':'ordinary',hp:type==='A'?2:1,maxHp:type==='A'?2:1,telegraph:0,flash:0,shotPending:false,attackKind:'bomb'});}));
  w.formation.initial=w.enemies.length;positions(w);
 }else{const hp=w.tuning.bossHealth,ehp=Math.max(3,Math.round(hp/3));w.formation=null;w.boss={x:240,y:68,phase:1,emitters:[{x:192,y:76,hp:ehp,maxHp:ehp,open:true,telegraph:0},{x:288,y:76,hp:ehp,maxHp:ehp,open:false,telegraph:0}],hp,maxHp:hp,open:false,cycle:0,safeLane:240,safeWidth:82,telegraph:0,age:0,phaseTime:0,hit:0,attackTimer:4.5,attackPending:false};}
 if(!w.stats.encounters.includes(index))w.stats.encounters.push(index);
 event(w,'stage',{encounter:index,location:w.location});return w;
}
export function setTuning(w,key,value) {
 const t=TUNING.find(t=>t.key===key);if(!t||!Number.isFinite(value))return false;
 value=clamp(value,t.min,t.max);if(t.step>=1)value=Math.round(value);
 const old=w.tuning[key];w.tuning[key]=value;w.assisted=true;
 if(key==='bossHealth'&&w.boss){const b=w.boss;b.hp=Math.max(0,Math.ceil(b.hp/Math.max(1,b.maxHp)*value));b.maxHp=value;const ehp=Math.max(3,Math.round(value/3));for(const e of b.emitters){e.hp=Math.max(0,Math.ceil(e.hp/Math.max(1,e.maxHp)*ehp));e.maxHp=ehp;}}
 return old!==value;
}
export function resetTuning(w){w.tuning=tuningForDifficulty(w.difficulty);w.assisted=true;return w.tuning;}
function playerFeedback(w,p,text){p.feedback=text;p.feedbackTime=1.2;event(w,'feedback',{seat:p.seat,x:p.x,y:p.y,text});}
function apertureColumns(w,b) {
 const cols=[];for(const p of w.players)if(p.active&&p.alive&&p.x+.9>=b.x&&p.x-.9<=b.x+b.cols*b.cell){const lo=clamp(Math.floor((p.x-b.x-.9)/b.cell),0,b.cols-1),hi=clamp(Math.floor((p.x-b.x+.9)/b.cell),0,b.cols-1);for(let c=lo;c<=hi;c++)if(!cols.includes(c))cols.push(c);}return cols;
}
export function repairPreview(w,seat) {
 const p=w.players[seat];if(!p||!p.active||!p.alive)return {bunker:-1,cells:[],usable:false,reason:'NO CANNON'};
 let bi=0;for(let i=1;i<w.bunkers.length;i++)if(Math.abs(w.bunkers[i].center-p.x)<Math.abs(w.bunkers[bi].center-p.x))bi=i;
 const b=w.bunkers[bi],apertures=apertureColumns(w,b),cells=[];
 for(let i=0;i<b.mask.length;i++)if(b.original[i]&&!b.mask[i]&&!apertures.includes(i%b.cols))cells.push(i);
 cells.sort((a,z)=>{
  const ac=a%b.cols,zc=z%b.cols,ar=Math.floor(a/b.cols),zr=Math.floor(z/b.cols);
  const da=Math.abs(b.x+(ac+0.5)*b.cell-p.x)+Math.abs(ar-3.5)*1.8,dz=Math.abs(b.x+(zc+0.5)*b.cell-p.x)+Math.abs(zr-3.5)*1.8;
  return da-dz||a-z;
 });
 const bounded=cells.slice(0,Math.round(w.tuning.repairYield));
 return {bunker:bi,cells:bounded,usable:p.charges>0&&bounded.length>0,reason:p.charges<=0?'CATCH SALVAGE':bounded.length?'REPAIR READY':b.mask.some((v,i)=>b.original[i]&&!v)?'FIRING LANE KEPT OPEN':'COVER INTACT'};
}
export function repair(w,seat) {
 const p=w.players[seat],target=repairPreview(w,seat);if(!p)return false;
 if(!target.usable){playerFeedback(w,p,target.reason);return false;}
 const b=w.bunkers[target.bunker];p.charges--;p.repairs++;w.intro.repaired=true;
 for(const i of target.cells){b.mask[i]=1;b.growth.push({cell:i,time:0.4});}
 w.stats.cellsRepaired+=target.cells.length;event(w,'repair',{x:b.center,y:b.y+10,seat,cells:target.cells.length,bunker:target.bunker});return true;
}
export function clearShot(w,x) {
 for(const b of w.bunkers)if(x+.8>=b.x&&x-.8<=b.x+b.cols*b.cell){const lo=clamp(Math.floor((x-b.x-.8)/b.cell),0,b.cols-1),hi=clamp(Math.floor((x-b.x+.8)/b.cell),0,b.cols-1);for(let c=lo;c<=hi;c++)for(let r=0;r<b.rows;r++)if(b.mask[r*b.cols+c])return false;}
 return true;
}
function award(w,seat,value) {
 w.score+=value;const p=w.players[seat];if(p)p.score+=value;
 if(!w.extraAwarded&&w.score>=1000){w.extraAwarded=true;w.reserve++;event(w,'extra',{x:240,y:36,value:1});}
}
function pickup(w,x,y,reason='kill') { w.pickups.push({id:++w.entitySeq,x:clamp(x,FIELD.left+5,FIELD.right-5),y,life:9,reason});event(w,'drop',{x,y,reason}); }
function enemyKilled(w,e,owner) {
 const i=w.enemies.indexOf(e);if(i<0)return;
 w.enemies.splice(i,1);const value=(4-e.row)*10;award(w,owner,value);w.killCount++;const p=w.players[owner];if(p){p.kills++;}w.stats.hits++;event(w,'kill',{x:e.x,y:e.y,seat:owner,enemyType:e.type,row:e.row,value});
 if(w.killCount%Math.round(w.tuning.salvageEvery)===0)pickup(w,e.x,e.y);
}
export function killPlayer(w,seat) {
 const p=w.players[seat];if(!p||!p.active||!p.alive||p.protected>0||w.invulnerable)return false;
 p.alive=false;p.respawn=0;p.recovery=0;p.recoil=0;p.deploymentPaid=false;w.stats.losses++;event(w,'loss',{x:p.x,y:p.y,seat});
 return true;
}
function scheduleRespawns(w) {
 for(const p of w.players)if(p.active&&!p.alive&&p.respawn<=0&&w.reserve>0){w.reserve--;p.respawn=1.05;p.deploymentPaid=true;}
}
export function leaveSeat(w,seat) {
 const p=w.players[seat];if(!p)return false;
 p.active=false;p.gone=true;p.alive=false;p.respawn=0;p.deploymentPaid=false;event(w,'leave',{seat,x:p.x,y:p.y});return true;
}
function updatePlayers(w,commands,dt) {
 for(const p of w.players){p.protected=Math.max(0,p.protected-dt);p.recovery=Math.max(0,p.recovery-dt);p.recoil=Math.max(0,p.recoil-dt);p.feedbackTime=Math.max(0,p.feedbackTime-dt);
  if(!p.active)continue;
  if(!p.alive){if(p.respawn>0){p.respawn=Math.max(0,p.respawn-dt);if(p.respawn===0){p.alive=true;p.protected=2.2;p.recovery=0;p.deploymentPaid=false;event(w,'respawn',{x:p.x,y:p.y,seat:p.seat});}}continue;}
  const c=commands[p.seat]||{},start=p.x;let move=clamp(finite(c.move),-1,1);
  if(Math.abs(move)<0.03&&Number.isFinite(c.targetX)){const delta=clamp(c.targetX,FIELD.left,FIELD.right)-p.x;move=clamp(delta/(w.tuning.playerSpeed*dt),-1,1);}
  p.x=clamp(p.x+move*w.tuning.playerSpeed*dt,FIELD.left,FIELD.right);if(Math.abs(p.x-start)>0.1)w.intro.moved=true;
  if(c.fire&&w.status==='playing'&&p.recovery<=0&&w.bullets.filter(b=>b.owner===p.seat).length<2){w.bullets.push({id:++w.entitySeq,x:p.x,y:p.y-9,vy:-w.tuning.playerShotSpeed,owner:p.seat,kind:'shot',r:0.8});p.recovery=w.tuning.shotRecovery;p.recoil=0.12;w.intro.fired=true;w.stats.shots++;event(w,'shot',{x:p.x,y:p.y-8,seat:p.seat});}
 }
}
function updateRepairs(w,commands){for(const p of w.players)if(p.active&&p.alive&&commands[p.seat]?.repair)repair(w,p.seat);}
function formationStep(w,dt) {
 const f=w.formation;if(!f||!w.enemies.length)return;
 const d=WAVES[w.encounter],ratio=w.enemies.length/f.initial;f.interval=Math.max(0.085,w.tuning.marchInterval*d.march*(0.19+0.81*ratio));f.timer+=dt;
 while(f.timer>=f.interval){f.timer-=f.interval;f.beat++;
  const left=Math.min(...w.enemies.map(e=>e.x-7)),right=Math.max(...w.enemies.map(e=>e.x+7)),step=4;
  if((f.dir>0&&right+step>FIELD.right-2)||(f.dir<0&&left-step<FIELD.left+2)){f.dir*=-1;f.y+=w.tuning.descent;event(w,'reverse',{x:f.x,y:f.y});}
  else f.x+=f.dir*step;
  positions(w);event(w,'march',{beat:f.beat,remaining:w.enemies.length});
  if(w.enemies.some(e=>e.y+6>=FIELD.breach)){w.status='defeat';w.reason='BREACH — THE SKY CROSSED THE LINE';event(w,'defeat',{reason:'breach'});return;}
 }
}
function exposedEnemies(w) {
 const exposed=[];for(let col=0;col<8;col++){const es=w.enemies.filter(e=>e.col===col);if(es.length)exposed.push(es.reduce((a,b)=>a.y>b.y?a:b));}return exposed;
}
function addBomb(w,x,y,kind='bomb') {
 if(w.bullets.filter(b=>b.owner<0).length>=12)return;
 w.bullets.push({id:++w.entitySeq,x,y,vy:w.tuning.bombSpeed*(kind==='heavy'?0.8:1),owner:-1,kind,r:kind==='heavy'?3.6:1.7});event(w,'volley',{x,y,kind});
}
function enemyAttacks(w,dt) {
 const d=WAVES[w.encounter];
 for(const e of w.enemies){e.flash=Math.max(0,e.flash-dt);if(e.shotPending){e.telegraph-=dt;if(e.telegraph<=0){e.telegraph=0;e.shotPending=false;addBomb(w,e.x,e.y+7,e.attackKind);}}}
 w.fireTimer-=dt;if(w.fireTimer>0||w.encounterTime<3.2)return;
 const active=w.players.filter(p=>p.active).length;const extra=active>1?1:0;
 let exposed=exposedEnemies(w).filter(e=>!e.shotPending);const parity=w.volleyCount%2;
 const preferred=exposed.filter(e=>e.col%2===parity);if(preferred.length)exposed=preferred;
 // Fisher-Yates on an authored exposed-column subset, with a serialized PRNG.
 for(let i=exposed.length-1;i>0;i--){const j=Math.floor(random(w)*(i+1));[exposed[i],exposed[j]]=[exposed[j],exposed[i]];}
 const count=Math.min(exposed.length,d.volley+extra,w.bullets.filter(b=>b.owner<0).length>=7?0:3);
 for(let i=0;i<count;i++){const e=exposed[i];e.shotPending=true;e.attackKind=e.type==='bombardier'?'heavy':'bomb';e.telegraph=d.telegraph+(e.type==='bombardier'?0.3:0);event(w,'telegraph',{x:e.x,y:e.y,kind:e.attackKind,duration:e.telegraph});}
 w.volleyCount++;w.fireTimer=w.tuning.fireInterval*d.fire;
 if(w.volleyCount%d.recoveryEvery===0)w.fireTimer+=d.recoveryFor;
}
export function spawnSaucer(w) {
 if(w.saucer)return false;const dir=w.volleyCount%2===0?1:-1;w.saucer={id:++w.entitySeq,x:dir>0?-20:500,y:36,dir,age:0,value:[100,200,300][Math.floor(random(w)*3)]};event(w,'saucer',{x:w.saucer.x,y:36});return true;
}
export function spawnEnemy(w,type='ordinary') {
 if(w.encounter>=6)return false;type=['ordinary','armour','bombardier'].includes(type)?type:'ordinary';
 let row=0,col=0;for(let r=0;r<4;r++)for(let c=0;c<8;c++)if(!w.enemies.some(e=>e.row===r&&e.col===c)){row=r;col=c;break;}
 if(w.enemies.some(e=>e.row===row&&e.col===col))return false;
 const hp=type==='armour'?2:1;w.enemies.push({id:++w.entitySeq,row,col,x:0,y:0,type,hp,maxHp:hp,telegraph:0,flash:0,shotPending:false,attackKind:'bomb'});w.formation.initial=Math.max(w.formation.initial,w.enemies.length);positions(w);return true;
}
function updateSaucer(w,dt) {
 if(!w.saucer){w.saucerTimer-=dt;if(w.saucerTimer<=0){spawnSaucer(w);w.saucerTimer=28;}return;}
 const s=w.saucer;s.age+=dt;s.x+=s.dir*31*dt;s.y=36+Math.sin(s.age*5)*1.5;
 if(s.x<-24||s.x>504){pickup(w,clamp(s.x,40,440),34,'saucer-trail');w.saucer=null;}
}
function bossStep(w,dt) {
 const b=w.boss;if(!b)return;b.age+=dt;b.phaseTime+=dt;b.hit=Math.max(0,b.hit-dt);
 if(b.phase===1){b.x=240+Math.sin(b.age*0.38)*94;for(let i=0;i<2;i++){const e=b.emitters[i];e.x=b.x+(i===0?-48:48);e.y=b.y+8;e.open=e.hp>0&&((b.phaseTime+i*2.5)%5)<3.2;e.telegraph=e.hp>0&&b.attackPending&&b.cycle%2===i?b.telegraph:0;}
  b.open=false;
 }else{const target=clamp(b.safeLane,86,394);b.x+=clamp(target-b.x,-45*dt,45*dt);b.open=(b.phaseTime%6)>1.1&&(b.phaseTime%6)<4.9;}
 b.attackTimer-=dt;
 if(b.attackTimer<=0&&!b.attackPending){b.attackPending=true;b.telegraph=b.phase===1?1.0:1.35;b.cycle++;
  if(b.phase===2)b.safeLane=48+96*((b.cycle*2+2)%5);
  event(w,'telegraph',{x:b.phase===1?b.emitters[b.cycle%2].x:b.safeLane,y:b.y,kind:b.phase===1?'heavy':'lanes',duration:b.telegraph});
 }
 if(b.attackPending){b.telegraph-=dt;if(b.telegraph<=0){b.attackPending=false;b.telegraph=0;
   if(b.phase===1){const side=b.cycle%2,x=b.emitters[side].x;for(const offset of [-22,0,22])addBomb(w,clamp(x+offset,24,456),b.y+18,offset===0?'heavy':'bomb');b.attackTimer=3.8;}
   else{for(let x=24;x<=456;x+=36)if(Math.abs(x-b.safeLane)>b.safeWidth/2)addBomb(w,x,b.y+18,(x/36)%2===0?'heavy':'bomb');b.attackTimer=4.4;}
  }
 }
 w.bossDropTimer-=dt;if(w.bossDropTimer<=0){pickup(w,48+384*random(w),112,'flagship');w.bossDropTimer=7;}
}
/** Parameter t of the first overlap of a vertical swept missile with a rectangle. */
export function sweepY(x,y,ny,r,left,top,right,bottom) {
 if(x+r<left||x-r>right)return null;top-=r;bottom+=r;
 if(y>=top&&y<=bottom)return 0;
 const dy=ny-y;if(dy>0&&y<top&&ny>=top)return (top-y)/dy;
 if(dy<0&&y>bottom&&ny<=bottom)return (bottom-y)/dy;
 return null;
}
function crater(w,b,x,y,r,owner) {
 let removed=0;const debris=[];
 for(let row=0;row<b.rows;row++)for(let col=0;col<b.cols;col++){const i=row*b.cols+col;if(!b.mask[i])continue;const cx=b.x+(col+0.5)*b.cell,cy=b.y+(row+0.5)*b.cell;if((cx-x)**2+(cy-y)**2<=r*r){b.mask[i]=0;removed++;debris.push([cx,cy]);}}
 if(!removed){const col=clamp(Math.floor((x-b.x)/b.cell),0,b.cols-1),row=clamp(Math.floor((y-b.y)/b.cell),0,b.rows-1),i=row*b.cols+col;if(b.mask[i]){b.mask[i]=0;removed++;debris.push([b.x+(col+0.5)*b.cell,b.y+(row+0.5)*b.cell]);}}
 w.stats.cellsLost+=removed;if(owner>=0)w.intro.eroded=true;else w.stats.bombsStopped++;
 if(removed)event(w,'erode',{x,y,bunker:b.id,owner,cells:removed,debris});
}
function bulletStep(w,dt) {
 const keep=[];
 for(const shot of w.bullets){const oldY=shot.y;shot.vy=(shot.owner>=0?-w.tuning.playerShotSpeed:w.tuning.bombSpeed*(shot.kind==='heavy'?0.8:1));const newY=oldY+shot.vy*dt;let hit=null;
  const consider=(kind,obj,t,extra)=>{if(t!==null&&t>=0&&t<=1&&(!hit||t<hit.t-1e-9)){hit={kind,obj,t,...extra};}};
  // Bunker is considered first for stable tie-breaking; a missile has one first hit.
  for(const b of w.bunkers){if(shot.x+shot.r<b.x||shot.x-shot.r>b.x+b.cols*b.cell||Math.max(oldY,newY)+shot.r<b.y||Math.min(oldY,newY)-shot.r>b.y+b.rows*b.cell)continue;
   const lo=clamp(Math.floor((shot.x-shot.r-b.x)/b.cell),0,b.cols-1),hi=clamp(Math.floor((shot.x+shot.r-b.x)/b.cell),0,b.cols-1);
   for(let row=0;row<b.rows;row++)for(let col=lo;col<=hi;col++){const i=row*b.cols+col;if(b.mask[i])consider('bunker',b,sweepY(shot.x,oldY,newY,shot.r,b.x+col*b.cell,b.y+row*b.cell,b.x+(col+1)*b.cell,b.y+(row+1)*b.cell),{cell:i});}
  }
  if(shot.owner>=0){for(const e of w.enemies)consider('enemy',e,sweepY(shot.x,oldY,newY,shot.r,e.x-7,e.y-5,e.x+7,e.y+6));
   if(w.saucer)consider('saucer',w.saucer,sweepY(shot.x,oldY,newY,shot.r,w.saucer.x-12,w.saucer.y-4,w.saucer.x+12,w.saucer.y+4));
   if(w.boss){const b=w.boss;if(b.phase===1){for(const e of b.emitters)if(e.hp>0)consider('emitter',e,sweepY(shot.x,oldY,newY,shot.r,e.x-11,e.y-7,e.x+11,e.y+8));}
    else consider('core',b,sweepY(shot.x,oldY,newY,shot.r,b.x-13,b.y-5,b.x+13,b.y+14));
    consider('hull',b,sweepY(shot.x,oldY,newY,shot.r,b.x-74,b.y-17,b.x+74,b.y+1));
   }
  }else for(const p of w.players)if(p.active&&p.alive)consider('player',p,sweepY(shot.x,oldY,newY,shot.r,p.x-5,p.y-5,p.x+5,p.y+4));
  if(hit){shot.y=oldY+(newY-oldY)*hit.t;
   if(hit.kind==='bunker'){const b=hit.obj,i=hit.cell,c=i%b.cols,r=Math.floor(i/b.cols);crater(w,b,b.x+(c+0.5)*b.cell,b.y+(r+0.5)*b.cell,shot.owner>=0?3.9:shot.kind==='heavy'?11.5:6.4,shot.owner);}
   else if(hit.kind==='enemy'){const e=hit.obj;e.hp--;if(e.hp<=0)enemyKilled(w,e,shot.owner);else{e.flash=0.18;w.stats.armourHits++;w.stats.hits++;event(w,'armour',{x:e.x,y:e.y,seat:shot.owner});}}
   else if(hit.kind==='saucer'){const s=hit.obj;award(w,shot.owner,s.value);w.stats.saucers++;event(w,'saucer-hit',{x:s.x,y:s.y,seat:shot.owner,value:s.value});pickup(w,s.x,s.y,'saucer');w.saucer=null;w.saucerTimer=24;}
   else if(hit.kind==='player'){const p=hit.obj;if(p.protected<=0&&!w.invulnerable)killPlayer(w,p.seat);else event(w,'shield',{x:p.x,y:p.y,seat:p.seat});}
   else if(hit.kind==='emitter'){const e=hit.obj;if(e.open){e.hp--;w.stats.hits++;event(w,e.hp<=0?'emitter-break':'armour',{x:e.x,y:e.y,seat:shot.owner});if(e.hp<=0){award(w,shot.owner,120);pickup(w,e.x,e.y,'emitter');}}
    else event(w,'blocked',{x:shot.x,y:shot.y});
   }else if(hit.kind==='core'){const b=hit.obj;if(b.open){b.hp--;b.hit=0.14;b.lastHitSeat=shot.owner;w.stats.hits++;award(w,shot.owner,10);event(w,'boss-hit',{x:b.x,y:b.y,seat:shot.owner,hp:b.hp});}else event(w,'blocked',{x:shot.x,y:shot.y});}
   else event(w,'blocked',{x:shot.x,y:shot.y});
  }else{shot.y=newY;if(shot.y>-8&&shot.y<278)keep.push(shot);}
 }
 w.bullets=keep;
}
function pickupStep(w,dt) {
 const keep=[];for(const item of w.pickups){item.y+=34*dt;item.life-=dt;let caught=false;
  for(const p of w.players)if(p.active&&p.alive&&Math.abs(p.x-item.x)<10&&Math.abs(p.y-item.y)<11){caught=true;const gain=p.charges<3?1:0;p.charges=Math.min(3,p.charges+1);w.intro.collected=true;w.stats.salvageCaught++;event(w,'pickup',{x:item.x,y:item.y,seat:p.seat,value:gain});break;}
  if(!caught&&item.life>0&&item.y<266)keep.push(item);else if(!caught)event(w,'pickup-expire',{x:item.x,y:item.y});
 }w.pickups=keep;
}
function transition(w,next){w.status='transition';w.nextEncounter=next;w.transitionTime=0;w.bullets=[];w.saucer=null;event(w,'cleared',{encounter:w.encounter,next});}
function progression(w) {
 if(w.status!=='playing')return;
 if(w.boss){const b=w.boss;if(b.phase===1&&b.emitters.every(e=>e.hp<=0)){b.phase=2;b.phaseTime=0;b.open=false;b.attackTimer=3.1;b.attackPending=false;b.telegraph=0;b.safeLane=240;w.bullets=w.bullets.filter(s=>s.owner>=0);w.stats.phases.push(2);event(w,'boss-phase',{phase:2,x:b.x,y:b.y});}
  if(b.phase===2&&b.hp<=0){award(w,b.lastHitSeat??0,500);w.status='victory';w.reason='PLANET DEFENDED';w.bullets=[];event(w,'victory',{x:b.x,y:b.y});return;}
 }else if(!w.enemies.length){transition(w,w.encounter+1);return;}
 scheduleRespawns(w);
 if(w.players.some(p=>p.active)&&!w.players.some(p=>p.active&&(p.alive||p.respawn>0))){w.status='defeat';w.reason='DEPLOYMENTS DEPLETED';w.bullets=[];event(w,'defeat',{reason:'deployments'});}
}
function transitionStep(w,dt) {
 w.transitionTime+=dt;const locationChange=w.nextEncounter<6&&Math.floor(w.nextEncounter/2)!==w.location;const duration=locationChange?3.8:2.35;
 if(locationChange){const fraction=clamp((w.transitionTime-0.5)/2.1,0,1);for(const b of w.bunkers){const apertures=apertureColumns(w,b);for(let i=0;i<b.mask.length;i++){const col=i%b.cols,row=Math.floor(i/b.cols),baseline=row>=3||col%3===0;if(b.original[i]&&!b.mask[i]&&baseline&&!apertures.includes(col)&&((i*37+11)%127)/127<fraction){b.mask[i]=1;b.growth.push({cell:i,time:0.5});}}}}
 scheduleRespawns(w);if(w.transitionTime>=duration)startEncounter(w,w.nextEncounter);
}
export function stepWorld(w,commands=[],dt=1/120) {
 if(!Number.isFinite(dt)||dt<=0||dt>0.1)throw new Error('stepWorld requires 0 < dt <= 0.1 seconds.');
 w.events=[];if(w.status==='victory'||w.status==='defeat')return w;
 w.tick++;w.time+=dt;w.encounterTime+=dt;
 for(const b of w.bunkers)b.growth=b.growth.map(g=>({cell:g.cell,time:g.time-dt})).filter(g=>g.time>0);
 updatePlayers(w,commands,dt);
 if(w.status==='transition'){updateRepairs(w,commands);pickupStep(w,dt);transitionStep(w,dt);return w;}
 formationStep(w,dt);if(w.status==='defeat')return w;
 if(w.boss)bossStep(w,dt);else enemyAttacks(w,dt);
 if(w.encounter>=1&&w.encounter<6)updateSaucer(w,dt);
 bulletStep(w,dt);pickupStep(w,dt);updateRepairs(w,commands);progression(w);return w;
}
