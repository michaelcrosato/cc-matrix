import RAPIER from '@dimforge/rapier3d-compat';
export const DEFAULTS={speed:19,steering:17,fuelDrain:2.5,fireRate:8,damage:1,enemyFire:1};
export const SECTORS=['GREENWATER REACH','THE SPLIT DECISION','NEEDLE CANYON','THE LAST SPLASH'];
export const LENGTH=480;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function course(s){
 const sec=clamp(Math.floor(s/LENGTH),0,3), t=s/LENGTH;
 const center=Math.sin(s*.011)*4.1+Math.sin(s*.025)*1.6;
 let width=31-sec*2.8+Math.sin(s*.015)*2;
 const local=((s%LENGTH)+LENGTH)%LENGTH;
 let island=null;
 if(sec===1&&local>125&&local<320){let w=Math.sin((local-125)/195*Math.PI)*5.7;island={center:center+Math.sin(s*.021)*1.6,width:w};width=34;}
 if(sec===2&&local>150&&local<340)width-=3;
 return {center,width,island,sector:sec};
}
export async function initPhysics(){await RAPIER.init();return RAPIER.version();}
export class Game{
 constructor(onEvent=()=>{}){this.onEvent=onEvent;this.config={...DEFAULTS};this.ids=0;this.reset();}
 reset(players=1,attract=false){
  this.world?.free();this.world=new RAPIER.World({x:0,y:0,z:0});this.world.timestep=1/60;
  this.colliderMap=new Map();this.revision=(this.revision||0)+1;this.ids=0;this.time=0;this.distance=0;this.fuel=100;this.speed=this.config.speed;this.score=0;this.combo=1;this.comboTimer=0;this.checkpoint=0;this.bridges=0;this.lives=4;this.finished=false;this.won=false;this.attract=attract;this.god=false;this.auto=false;this.pulseCooldown=0;this.pulseRing=0;this.bossHold=false;this.stats={kills:0,shots:0,refuels:0,pulses:0,crashes:0,bridges:0};this.lastRefuel=false;this.events=[];this.eventSerial=0;this.entities=[];this.bullets=[];this.players=[];this.respawnTimer=0;
  for(let i=0;i<players;i++){const p={id:'p'+i,kind:'player',index:i,x:(i?3:-3)*(players===2?1:0),s:-9-i*3,hp:3,inv:3,fire:0,roll:0,refuel:false};this.attach(p,.78,1.35);this.players.push(p);}
  this.plan=[];let n=0;
  for(let sec=0;sec<4;sec++){
   const start=sec*LENGTH;
   for(const pos of [68,242,382]){const s=start+pos,c=course(s);let x=c.center+(pos===242?-1:1)*(c.width*.22);if(c.island)x=c.center-c.width*.29;this.plan.push({id:'e'+n++,kind:'fuel',s,x,hp:3,maxHp:3,w:2.1,d:3.1});}
   for(let row=0;row<11;row++){
    const s=start+105+row*29;
    if([242,382].some(p=>Math.abs(s-start-p)<22))continue;
    const c=course(s),kind=row%4===1?'heli':row%5===3?'jet':'boat';
    let x=c.center+Math.sin(row*2.53+sec)*c.width*.3;
    if(c.island&&Math.abs(x-c.island.center)<c.island.width/2+2)x=c.center-c.width*.3;
    this.plan.push({id:'e'+n++,kind,s,x,baseX:x,baseS:s,sector:sec,hp:kind==='boat'?2:1,maxHp:kind==='boat'?2:1,w:kind==='jet'?1.4:1,d:kind==='boat'?1.9:1.4,phase:row+sec});
    if(sec>1&&row%3===0)this.plan.push({id:'e'+n++,kind:'turret',s:s+9,x:c.center+(row%2?1:-1)*(c.width/2-1.4),hp:3,maxHp:3,w:1.2,d:1.4,shoot:1.5});
   }
   const s=start+LENGTH-8,c=course(s);this.plan.push({id:'e'+n++,kind:sec===3?'boss':'bridge',s,x:c.center,hp:sec===3?70:8+sec*3,maxHp:sec===3?70:8+sec*3,w:sec===3?9:c.width/2,d:sec===3?3.8:1.7,width:c.width,sector:sec,shoot:1.6});
  }
  this.plan.sort((a,b)=>a.s-b.s);this.spawnIndex=0;this.emit('start',{text:'KEEP IT LOW. KEEP IT MOVING.'});
 }
 attach(e,w,d){
  e.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(e.x,0,-e.s));
  e.collider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(w,.6,d).setSensor(true).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),e.body);this.colliderMap.set(e.collider.handle,e);
 }
 detach(e){if(e.body){this.colliderMap.delete(e.collider.handle);this.world.removeRigidBody(e.body);e.body=null;e.collider=null;}}
 emit(type,data={}){const event={type,...data,time:this.time,serial:++this.eventSerial};this.events.push(event);if(this.events.length>30)this.events.shift();this.onEvent(event);}
 spawn(desc){const e={...desc,alive:true,shoot:desc.shoot||2};this.attach(e,e.w,e.d);this.entities.push(e);return e;}
 bullet(x,s,owner=0,dx=0,ds=85){const b={id:'b'+this.ids++,kind:owner<0?'enemyBullet':'bullet',x,s,dx,ds,owner,alive:true};this.attach(b,owner<0?.43:.38,owner<0?.43:.9);this.bullets.push(b);return b;}
 destroy(e,credit=true){
  if(!e.alive)return;e.alive=false;this.detach(e);this.emit('explosion',{x:e.x,s:e.s,kind:e.kind});
  if(credit){const value={boat:100,heli:150,jet:250,turret:200,fuel:100,bridge:1000,boss:5000}[e.kind]||0;this.score+=Math.round(value*this.combo);this.comboTimer=3;this.combo=clamp(this.combo+.15,1,4);this.stats.kills++;}
  if(e.kind==='bridge'||e.kind==='boss'){
   this.bridges++;this.stats.bridges++;this.checkpoint=(e.sector+1)*LENGTH;this.emit('bridge',{text:e.kind==='boss'?'RIVER SECURED!':'BRIDGE DOWN · CHECKPOINT',x:e.x,s:e.s});this.lives=Math.min(6,this.lives+1);for(const p of this.players){p.hp=3;p.inv=2;}this.pulseCooldown=0;
   if(e.kind==='boss'){this.finished=true;this.won=true;this.emit('win',{text:'A CLEAN GETAWAY.'});}
  }
 }
 hit(p,reason='IMPACT'){
  if(p.inv>0||this.god||this.attract||this.auto)return;
  p.hp--;p.inv=2.3;this.combo=1;this.emit('hit',{text:reason,x:p.x,s:p.s});
  if(p.hp<=0){this.stats.crashes++;this.lives--;p.hp=3;p.inv=4;this.fuel=Math.max(this.fuel,55);
   if(this.lives<=0){this.finished=true;this.won=false;this.emit('lose',{text:reason==='FUEL EMPTY'?'RUNNING ON EMPTY.':'YOUR WING IS GROUNDED.'});}
   else if(this.players.length===1){this.warp(this.checkpoint);this.emit('respawn',{text:'RESERVE JET · CHECKPOINT RESTART'});}
   else p.x=course(p.s).center;
  }
 }
 warp(s){this.revision++;this.distance=s;this.lastRefuel=false;for(const p of this.players){p.s=s-9-p.index*3;p.x=course(p.s).center+(p.index?3:-3)*(this.players.length===2?1:0);p.inv=4;}this.fuel=100;this.bossHold=false;
  for(const e of this.entities)this.detach(e);for(const b of this.bullets)this.detach(b);this.entities=[];this.bullets=[];this.spawnIndex=this.plan.findIndex(e=>e.s>=s+14);if(this.spawnIndex<0)this.spawnIndex=this.plan.length;
 }
 ai(p){
  const c=course(p.s+16);let target=c.center;
  const fuel=this.entities.filter(e=>e.alive&&e.kind==='fuel'&&e.s>p.s-3&&e.s<p.s+90).sort((a,b)=>a.s-b.s)[0];
  const enemy=this.entities.filter(e=>e.alive&&e.kind!=='fuel'&&e.s>p.s+7&&e.s<p.s+90).sort((a,b)=>a.s-b.s)[0];
  if(fuel&&this.fuel<80)target=fuel.x;else if(enemy)target=enemy.x;
  target=clamp(target,c.center-c.width*.36,c.center+c.width*.36);
  if(c.island&&Math.abs(target-c.island.center)<c.island.width/2+2.6)target=c.center-c.width*.29;
  const boss=this.entities.find(e=>e.alive&&e.kind==='boss');
  const approachBoss=boss&&(!enemy||enemy.kind==='boss')&&boss.s-p.s>63;
  return {x:clamp((target-p.x)*1.3,-1,1),y:fuel&&fuel.s-p.s<12?.7:-.1,fire:!approachBoss&&!(fuel&&this.fuel<80&&fuel.s-p.s<65&&Math.abs(p.x-fuel.x)<3),pulse:enemy&&enemy.s-p.s<17&&this.pulseCooldown<=0};
 }
 step(dt,inputs=[{}]){
  if(this.finished)return;const revision=this.revision;this.time+=dt;this.pulseCooldown=Math.max(0,this.pulseCooldown-dt);this.pulseRing=Math.max(0,this.pulseRing-dt*22);this.comboTimer-=dt;if(this.comboTimer<0)this.combo=Math.max(1,this.combo-dt*.5);
  if(this.fuel===undefined)this.fuel=100;
  const inputList=this.players.map((p,i)=>(this.attract||this.auto)?this.ai(p):(inputs[i]||{}));
  const throttle=inputList.reduce((a,i)=>a+(i.y||0),0)/this.players.length;
  this.speed=this.config.speed*clamp(1-throttle*.45,.55,1.45);
  const boss=this.entities.find(e=>e.kind==='boss'&&e.alive);
  if(boss&&boss.s-this.distance<53){this.bossHold=true;this.speed=0;}
  this.distance+=this.speed*dt;
  const barrier=this.entities.find(e=>e.kind==='bridge'&&e.alive&&e.s+6>=this.distance-this.speed*dt);
  if(barrier&&this.distance>barrier.s+6){this.distance=barrier.s+6;this.speed=0;}
  this.fuel=Math.max(0,this.fuel-this.config.fuelDrain*dt*(this.bossHold?.32:1));if(this.attract||this.god||this.auto)this.fuel=Math.max(this.fuel,30);
  while(this.spawnIndex<this.plan.length&&this.plan[this.spawnIndex].s<this.distance+175)this.spawn(this.plan[this.spawnIndex++]);
  let refueling=false;
  for(const p of this.players){
   const inp=inputList[p.index];p.inv=Math.max(0,p.inv-dt);p.fire-=dt;p.s=this.distance-9-p.index*3;
   const vx=(inp.x||0)*this.config.steering;p.x+=vx*dt;p.roll+=(clamp(-vx*.025,-.45,.45)-p.roll)*Math.min(1,dt*9);
   if(inp.target!==undefined)p.x+=(inp.target-p.x)*Math.min(1,dt*12);
   if(inp.fire&&p.fire<=0){p.fire=1/this.config.fireRate;this.bullet(p.x-.38,p.s+2,p.index,-.2);this.bullet(p.x+.38,p.s+2,p.index,.2);this.stats.shots++;this.emit('shot');}
   if(inp.pulse&&this.pulseCooldown<=0){this.pulseCooldown=11;this.pulseRing=1;this.stats.pulses++;this.emit('pulse',{x:p.x,s:p.s});for(const e of [...this.entities])if(e.alive&&Math.hypot(e.x-p.x,e.s-p.s)<29&&e.kind!=='fuel'){e.hp-=e.kind==='boss'?9:5;if(e.hp<=0)this.destroy(e);}for(const b of this.bullets)if(b.owner<0)b.alive=false;}
   p.body.setNextKinematicTranslation({x:p.x,y:0,z:-p.s});
   const c=course(p.s);if(Math.abs(p.x-c.center)>c.width/2-.85||(c.island&&Math.abs(p.x-c.island.center)<c.island.width/2+.7)){
    this.hit(p,'RIVERBANK');if(this.finished||this.revision!==revision)return;if(this.god||this.attract||this.auto||p.inv>0){p.x=clamp(p.x,c.center-c.width/2+1.8,c.center+c.width/2-1.8);if(c.island&&Math.abs(p.x-c.island.center)<c.island.width/2+1.5)p.x=c.island.center-c.island.width/2-1.8;}
   }
   if(this.fuel<=0)this.hit(p,'FUEL EMPTY');if(this.finished||this.revision!==revision)return;p.refuel=false;
  }
  for(const e of this.entities){if(!e.alive)continue;
   if(e.kind==='heli')e.x=e.baseX+Math.sin(this.time*1.3+e.phase)*3;
   if(e.kind==='jet')e.x=e.baseX+Math.sin(this.time*1.9+e.phase)*5;
   if(e.kind==='boat'&&e.sector>0)e.x=e.baseX+Math.sin(this.time+e.phase)*1.5;
   if((e.kind==='turret'||e.kind==='boss')&&e.s-this.distance<100&&e.s>this.distance-15){e.shoot-=dt*this.config.enemyFire;if(e.shoot<=0){e.shoot=e.kind==='boss'?.85:2.7;const p=this.players[Math.floor(this.time)%this.players.length];const ds=Math.max(1,e.s-p.s),dx=(p.x-e.x)/ds*30;for(let j=e.kind==='boss'?-1:0;j<=(e.kind==='boss'?1:0);j++)this.bullet(e.x+j*3,e.s-2,-1,dx+j*7,-30);this.emit('enemyshot');}}
   e.body.setNextKinematicTranslation({x:e.x,y:0,z:-e.s});
   if(e.s<this.distance-42){e.alive=false;this.detach(e);}
  }
  for(const b of this.bullets){if(!b.alive)continue;b.x+=b.dx*dt;b.s+=b.ds*dt;b.body.setNextKinematicTranslation({x:b.x,y:0,z:-b.s});if(b.s>this.distance+180||b.s<this.distance-40)b.alive=false;}
  this.world.timestep=dt;this.world.step();
  for(const b of this.bullets){if(!b.alive||!b.collider)continue;
   if(b.owner>=0){for(const e of this.entities){if(e.alive&&this.world.intersectionPair(b.collider,e.collider)){e.hp-=this.config.damage;b.alive=false;this.emit('spark',{x:b.x,s:b.s});if(e.hp<=0)this.destroy(e);break;}}}
   else for(const p of this.players)if(this.world.intersectionPair(b.collider,p.collider)){b.alive=false;this.hit(p,'ENEMY FIRE');if(this.finished||this.revision!==revision)return;break;}
  }
  for(const p of this.players){for(const e of this.entities){if(!e.alive)continue;if(this.world.intersectionPair(p.collider,e.collider)){
    if(e.kind==='fuel'){p.refuel=true;refueling=true;this.fuel=Math.min(100,this.fuel+dt*37);if(!this.lastRefuel){this.stats.refuels++;this.emit('refuel',{text:'TOPPING UP · HOLD YOUR FIRE'});}}
    else this.hit(p,e.kind==='bridge'?'BRIDGE IMPACT':'COLLISION');
    if(this.finished||this.revision!==revision)return;
   }} }
  this.lastRefuel=refueling;
  this.entities=this.entities.filter(e=>e.alive);this.bullets=this.bullets.filter(b=>{if(!b.alive)this.detach(b);return b.alive;});
 }
 snapshot(){return {time:this.time,distance:this.distance,score:this.score,combo:this.combo,fuel:this.fuel??100,speed:this.speed??19,lives:this.lives,briges:this.bridges,bridges:this.bridges,checkpoint:this.checkpoint,pulseCooldown:this.pulseCooldown,pulseRing:this.pulseRing,bossHold:this.bossHold,finished:this.finished,won:this.won,stats:{...this.stats},players:this.players.map(({body,collider,...p})=>({...p})),entities:this.entities.map(({body,collider,...e})=>({...e})),bullets:this.bullets.map(({body,collider,...b})=>({...b})),events:this.events.slice(-12)};}
 dispose(){this.world.free();}
}
