import RAPIER from '@dimforge/rapier2d-compat';

export const WORLD=220;
export const defaults={speed:26,fireRate:8,enemySpeed:1,enemyFire:1,damage:1,pulseCooldown:12,assist:.24};
export const wrap=x=>((x+110)%WORLD+WORLD)%WORLD-110;
export const delta=(a,b)=>wrap(a-b);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export async function initPhysics(){await RAPIER.init();return RAPIER.version();}

export class Game {
 constructor(onEvent=()=>{}){this.onEvent=onEvent;this.cfg={...defaults};this.dev={god:false,convoySafe:false,slow:false};this.id=0;this.mode='title';this.time=0;this.cameraX=0;this.reset(1,true);this.mode='title';}
 event(type,data={}){this.onEvent(type,data);}
 addScore(points){this.score+=points;while(this.score>=this.nextReserve){this.reserves=Math.min(6,this.reserves+1);this.nextReserve+=10000;this.event('radio',{text:'ANOTHER BIRD IN RESERVE!'});}}
 reset(count=1,attract=false){
  this.world?.free();this.queue?.free();this.world=new RAPIER.World({x:0,y:0});this.world.timestep=1/60;this.queue=new RAPIER.EventQueue(true);this.colliders=new Map();
  this.players=[];this.enemies=[];this.trucks=[];this.bullets=[];this.pickups=[];this.pulse=null;this.time=0;this.score=0;this.kills=0;this.shots=0;this.hits=0;this.lost=0;this.reserves=3;this.nextReserve=10000;this.wave=1;this.spawned=0;this.spawnTimer=1;this.intermission=0;this.result=null;this.attract=attract;this.cameraX=0;this.pulseReady=0;this.convoyShield=0;this.boost=0;this.bossSpawned=false;this.mode='play';this.count=count;
  for(let i=0;i<count;i++)this.players.push(this.entity('player',{x:i?5:0,y:i?17:22,id:'p'+i,dir:1,hp:3,maxHp:3,invuln:3,alive:true,fire:0,aimX:1,aimY:0,shield:0,vx:0,vy:0},1.9,1));
  for(let i=0;i<12;i++)this.trucks.push(this.entity('truck',{x:-27+i*4.6,y:2,hp:2,maxHp:2},1.5,.95));
  this.event('wave',{wave:1,text:'KEEP THE MEDICINE MOVING.'});
 }
 entity(kind,data,hx,hy){
  const e={id:++this.id,kind,category:kind,dead:false,...data};
  e.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(e.x,e.y).setGravityScale(0).lockRotations().setCcdEnabled(true));
  e.collider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy).setSensor(true).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),e.body);this.colliders.set(e.collider.handle,e);return e;
 }
 destroy(e){if(e.dead)return;e.dead=true;this.colliders.delete(e.collider.handle);this.world.removeRigidBody(e.body);}
 position(e,x,y){e.x=wrap(x);e.y=y;e.body.setTranslation({x:e.x,y},true);}
 velocity(e,x,y){e.vx=x;e.vy=y;e.body.setLinvel({x,y},true);}
 spawnEnemy(type){
  const target=this.trucks.find(t=>!t.dead)||this.players[0];const side=this.spawned%2?1:-1;
  const y=type==='jet'?25+(this.spawned%4)*3:12+(this.spawned%5)*4;
  const e=this.entity('enemy',{x:wrap(target.x+side*(42+this.spawned%3*5)),y,baseY:y,type,dir:-side,hp:type==='jet'?2:3,maxHp:type==='jet'?2:3,age:0,fire:2+this.spawned%3*.4},type==='jet'?2.1:1.8,1);this.enemies.push(e);this.spawned++;return e;
 }
 spawnBoss(){const p=this.players[0];const e=this.entity('enemy',{x:wrap(p.x+38),y:30,baseY:30,type:'boss',dir:-1,hp:85,maxHp:85,age:0,phase:0,fire:1},8,3.5);this.enemies.push(e);this.bossSpawned=true;this.event('boss',{text:'BIG RIG IN THE SKY. BRING IT DOWN!'});return e;}
 shoot(p,input){
  if(p.fire>0||!p.alive)return;
  let ax=input.aimX??p.dir,ay=input.aimY??0;
  const len=Math.hypot(ax,ay)||1;ax/=len;ay/=len;
  if(!input.manualAim){
   const targets=this.enemies.filter(e=>!e.dead&&delta(e.x,p.x)*p.dir>0&&Math.abs(delta(e.x,p.x))<43&&Math.abs(e.y-p.y)<5.5);
   targets.sort((a,b)=>Math.abs(delta(a.x,p.x))-Math.abs(delta(b.x,p.x)));
   if(targets.length){const e=targets[0];ay=clamp((e.y-p.y)/Math.max(6,Math.abs(delta(e.x,p.x))),-this.cfg.assist,this.cfg.assist);ax=p.dir;}
  }
  p.aimX=ax;p.aimY=ay;p.dir=ax<0?-1:1;p.fire=1/this.cfg.fireRate;this.shots++;
  this.bullets.push(this.entity('bullet',{x:wrap(p.x+ax*3),y:p.y+ay*3,vx:ax*78,vy:ay*78,kind:'laser',owner:'player',ttl:.78,split:false},.85,.22));this.event('shoot',{x:p.x});
 }
 enemyShot(e){
  const live=this.trucks.filter(t=>!t.dead);const pilots=this.players.filter(p=>p.alive);if(!pilots.length)return;const player=pilots.reduce((a,b)=>Math.abs(delta(a.x,e.x))<Math.abs(delta(b.x,e.x))?a:b);
  const target=(e.type==='boss'||this.time%5<2)&&live.length?live[Math.floor(e.age)%live.length]:player;
  let dx=delta(target.x,e.x),dy=target.y-e.y;const n=Math.hypot(dx,dy)||1;const speed=e.type==='boss'?16:12+this.wave;
  this.bullets.push(this.entity('bullet',{x:e.x,y:e.y-1,vx:dx/n*speed,vy:dy/n*speed,kind:'missile',owner:'enemy',ttl:5,splitAt:.65,age:0,split:true},.38,.38));this.event('enemy');
 }
 activatePulse(p){
  if(this.pulseReady>0)return false;this.pulseReady=this.cfg.pulseCooldown;this.convoyShield=4;this.pulse={x:p.x,y:p.y,radius:0,ttl:.8};
  for(const b of this.bullets)if(b.owner==='enemy'&&!b.dead&&Math.abs(delta(b.x,p.x))<45)this.destroy(b);
  for(const q of this.players){q.invuln=Math.max(q.invuln,2);q.shield=4;}
  this.event('pulse',{x:p.x,y:p.y});return true;
 }
 damage(e,n=1){
  if(e.dead)return;
  if(e.kind==='player'&&(this.dev.god||this.attract||e.invuln>0))return;
  if(e.kind==='truck'&&(this.dev.convoySafe||this.attract||this.convoyShield>0))return;
  e.hp-=n*this.cfg.damage;this.event('hit',{x:e.x,y:e.y,kind:e.kind});
  if(e.kind==='player')e.invuln=1.5;
  if(e.hp>0)return;
  this.event('explode',{x:e.x,y:e.y,type:e.type});
  if(e.kind==='player'){
   if(this.reserves>0){this.reserves--;e.hp=3;e.invuln=3;this.position(e,this.trucks.find(t=>!t.dead)?.x||0,24);this.event('radio',{text:'FRESH CHOPPER. SAME GUTS.'});}
   else {e.alive=false;this.destroy(e);if(this.players.every(p=>!p.alive))this.finish(false);}
  }else if(e.kind==='truck'){this.lost++;this.destroy(e);if(this.trucks.every(t=>t.dead))this.finish(false);}
  else if(e.kind==='enemy'){
   this.kills++;this.addScore(e.type==='boss'?3000:e.type==='jet'?200:100);this.destroy(e);
   if(this.kills%4===0||e.type==='boss')this.pickups.push(this.entity('pickup',{x:e.x,y:Math.max(8,e.y),type:this.kills%8===0?'shield':'repair',age:0,ttl:20},1.3,1.3));
  }
 }
 collide(a,b){
  if(!a||!b||a.dead||b.dead)return;
  if(a.category!=='bullet'&&b.category==='bullet')[a,b]=[b,a];
  if(a.category==='bullet'){
   if(a.owner==='player'&&b.kind==='enemy'){this.hits++;this.damage(b,1);this.destroy(a);}
   else if(a.owner==='enemy'&&(b.kind==='player'||b.kind==='truck')){this.damage(b,1);this.destroy(a);}
   return;
  }
  if(a.kind!=='player'&&b.kind==='player')[a,b]=[b,a];
  if(a.kind==='player'&&b.kind==='pickup'){
   if(b.type==='repair'){a.hp=Math.min(3,a.hp+1);const truck=this.trucks.find(t=>!t.dead&&t.hp<2);if(truck)truck.hp++;}else this.pulseReady=0;
   this.destroy(b);this.addScore(50);this.event('pickup',{x:a.x,y:a.y,type:b.type});
  }else if(a.kind==='player'&&(b.kind==='enemy'||b.kind==='truck')){this.damage(a,1);if(b.kind==='enemy'&&b.type!=='boss')this.damage(b,1);}
 }
 ai(p){
  const enemies=this.enemies.filter(e=>!e.dead);enemies.sort((a,b)=>Math.abs(delta(a.x,p.x))-Math.abs(delta(b.x,p.x)));
  const target=enemies[0];const crate=this.pickups.filter(c=>!c.dead&&Math.abs(delta(c.x,p.x))<30).sort((a,b)=>Math.hypot(delta(a.x,p.x),a.y-p.y)-Math.hypot(delta(b.x,p.x),b.y-p.y))[0];
  if(crate&&(!target||this.time%14<4)){const cx=delta(crate.x,p.x),cy=crate.y-p.y;return {x:clamp(cx*.2,-1,1),y:clamp(cy*.25,-1,1),fire:!!target,aimX:target?delta(target.x,p.x):p.dir,aimY:target?target.y-p.y:0,manualAim:!!target,pulse:this.pulseReady<=0};}
  if(!target)return {x:.3,y:Math.sin(this.time)*.3,fire:true,pulse:false};
  const dx=delta(target.x,p.x),dy=target.y-p.y;return {x:Math.abs(dx)>19?Math.sign(dx)*.85:Math.abs(dx)<10?-Math.sign(dx)*.55:0,y:clamp(dy*.28,-1,1),fire:true,aimX:dx,aimY:dy,manualAim:true,pulse:this.pulseReady<=0,boost:Math.abs(dx)>42};
 }
 step(dt,inputs=[]){
  if(this.mode!=='play')return;dt*=this.dev.slow?.35:1;this.time+=dt;this.pulseReady=Math.max(0,this.pulseReady-dt);this.convoyShield=Math.max(0,this.convoyShield-dt);
  if(this.pulse){this.pulse.ttl-=dt;this.pulse.radius+=(55*dt);if(this.pulse.ttl<=0)this.pulse=null;}
  for(let i=0;i<this.players.length;i++){
   const p=this.players[i];if(!p.alive)continue;const input=this.attract?this.ai(p):(inputs[i]||{});const ix=clamp(input.x||0,-1,1),iy=clamp(input.y||0,-1,1);const boost=input.boost?1.6:1;
   p.fire=Math.max(0,p.fire-dt);p.invuln=Math.max(0,p.invuln-dt);p.shield=Math.max(0,p.shield-dt);
   const smooth=1-Math.exp(-dt*8);const speed=this.cfg.speed*boost;this.velocity(p,p.vx+(ix*speed-p.vx)*smooth,p.vy+(iy*speed*.8-p.vy)*smooth);
   if(Math.abs(ix)>.15&&!input.manualAim)p.dir=ix<0?-1:1;
   if(input.fire)this.shoot(p,input);if(input.pulse)this.activatePulse(p);
  }
  for(const t of this.trucks)if(!t.dead)this.velocity(t,-2.4,0);
  for(const e of this.enemies){if(e.dead)continue;e.age+=dt;e.fire-=dt;
   if(e.type==='boss'){
    e.phase=e.hp<e.maxHp*.45?1:0;this.velocity(e,Math.sin(e.age*.24)*7,Math.cos(e.age*.65)*2.5);
    if(e.fire<=0){this.enemyShot(e);e.fire=e.phase?.5:1;}
   }else{
    let vx=e.dir*(e.type==='jet'?18+this.wave*2:6+this.wave)*this.cfg.enemySpeed;
    const nearest=this.players.filter(p=>p.alive).sort((a,b)=>Math.abs(delta(a.x,e.x))-Math.abs(delta(b.x,e.x)))[0];if(nearest&&e.type==='heli'&&Math.abs(delta(e.x,nearest.x))>42)e.dir=delta(nearest.x,e.x)>0?1:-1;
    this.velocity(e,vx,Math.cos(e.age*1.4+Number(e.id))*2.5);
    if(e.fire<=0){this.enemyShot(e);e.fire=(e.type==='jet'?3.8:3.2)/(this.cfg.enemyFire*(1+this.wave*.16));}
   }
  }
  for(const b of [...this.bullets]){if(b.dead)continue;b.ttl-=dt;b.age=(b.age||0)+dt;
   if(b.ttl<=0||b.y<.7||b.y>47){if(b.y<.7&&b.owner==='enemy')this.event('dust',{x:b.x,y:1});this.destroy(b);continue;}
   if(b.split&&b.age>b.splitAt){b.split=false;this.event('split',{x:b.x,y:b.y});for(const sign of [-1,1])this.bullets.push(this.entity('bullet',{x:b.x,y:b.y,vx:b.vx+sign*4,vy:b.vy+sign*6,kind:'split',owner:'enemy',ttl:3.8,split:false},.3,.3));this.destroy(b);continue;}
   this.velocity(b,b.vx,b.vy);
  }
  for(const p of this.pickups){if(p.dead)continue;p.age+=dt;p.ttl-=dt;this.velocity(p,-1,Math.sin(p.age*2)*.4);if(p.ttl<=0)this.destroy(p);}
  this.world.timestep=dt;this.world.step(this.queue);
  for(const e of [...this.players,...this.enemies,...this.trucks,...this.bullets,...this.pickups]){if(e.dead)continue;const t=e.body.translation();e.x=t.x;e.y=t.y;if(e.x<-110||e.x>110)this.position(e,wrap(e.x),e.y);if(e.kind==='player'&&(e.y<5||e.y>39)){this.position(e,e.x,clamp(e.y,5,39));this.velocity(e,e.vx,0);}if(e.kind==='enemy'&&(e.y<8||e.y>39)){this.position(e,e.x,clamp(e.y,8,39));}}
  const contacts=[];this.queue.drainCollisionEvents((a,b,start)=>{if(start)contacts.push([this.colliders.get(a),this.colliders.get(b)]);});for(const pair of contacts)this.collide(...pair);
  this.enemies=this.enemies.filter(e=>!e.dead);this.bullets=this.bullets.filter(e=>!e.dead);this.pickups=this.pickups.filter(e=>!e.dead);
  const alive=this.players.filter(p=>p.alive);if(alive.length){let center=alive[0].x;if(alive.length>1)center+=delta(alive[1].x,center)/2;const target=center+(alive.length===1?alive[0].dir*8:0);this.cameraX=wrap(this.cameraX+delta(target,this.cameraX)*(1-Math.exp(-dt*3)));if(alive.length>1)for(const p of alive){const dx=delta(p.x,center);if(Math.abs(dx)>39){this.position(p,center+Math.sign(dx)*39,p.y);this.velocity(p,0,p.vy);}}}
  if(this.mode!=='play')return;
  if(this.intermission>0){this.intermission-=dt;if(this.intermission<=0){this.wave++;this.spawned=0;this.spawnTimer=1;this.event('wave',{wave:this.wave,text:this.wave===2?'SPLIT MISSILES. KEEP YOUR DISTANCE.':'LAST STRETCH. MAKE EVERY TRUCK COUNT.'});for(const t of this.trucks)if(!t.dead)t.hp=2;for(const p of alive)p.hp=Math.min(3,p.hp+1);}}
  else {
   this.spawnTimer-=dt;if(this.spawned<12&&this.spawnTimer<=0){this.spawnEnemy((this.spawned+this.wave)%3===0?'jet':'heli');this.spawnTimer=1.9;}
   if(this.wave===3&&this.spawned>=8&&!this.bossSpawned)this.spawnBoss();
   if(this.spawned>=12&&this.enemies.length===0){const bonus=this.trucks.filter(t=>!t.dead).length*this.wave*100;this.addScore(bonus);if(this.wave>=3)this.finish(true);else {this.intermission=4;this.event('clear',{wave:this.wave,bonus,text:'AIRSPACE CLEAR. CONVOY BONUS +'+bonus});}}
  }
 }
 finish(won){if(this.result)return;this.result={won,score:this.score,trucks:this.trucks.filter(t=>!t.dead).length,kills:this.kills,time:this.time};this.mode='result';this.event(won?'victory':'defeat',this.result);}
 nextWave(){for(const e of this.enemies)this.destroy(e);this.enemies=[];this.spawned=12;if(this.wave===3){this.bossSpawned=true;this.finish(true);}else this.intermission=.05;}
 snapshot(){return {mode:this.mode,time:this.time,wave:this.wave,score:this.score,kills:this.kills,shots:this.shots,hits:this.hits,reserves:this.reserves,pulseReady:this.pulseReady,convoyShield:this.convoyShield,spawned:this.spawned,intermission:this.intermission,result:this.result,attract:this.attract,physics:RAPIER.version(),players:this.players.map(({id,x,y,hp,alive,invuln,vx,vy})=>({id,x,y,hp,alive,invuln,vx,vy})),enemies:this.enemies.map(({id,x,y,hp,type})=>({id,x,y,hp,type})),trucks:this.trucks.map(({id,x,y,hp,dead})=>({id,x,y,hp,dead})),bullets:this.bullets.map(({kind,owner,x,y})=>({kind,owner,x,y})),pickups:this.pickups.map(({type,x,y})=>({type,x,y})),cfg:{...this.cfg},dev:{...this.dev}};}
}
