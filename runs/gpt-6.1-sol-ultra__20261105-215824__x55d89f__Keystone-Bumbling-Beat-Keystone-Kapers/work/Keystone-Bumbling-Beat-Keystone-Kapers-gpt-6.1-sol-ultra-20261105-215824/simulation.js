export const DEFAULTS = Object.freeze({speed:6.1,crookSpeed:2.25,gravity:24,jump:9.3,time:105,penalty:5,hazardSpeed:1,burst:1.65});
export const CASES = [
 {name:'THE FIVE-FINGER DISCOUNT',subtitle:'A light-fingered fellow. A very heavy bag.',floor:1,x:10,speed:1,time:105,hazards:5,goal:2},
 {name:'TROUBLE ON THE DOUBLE',subtitle:'More loot. More luggage. Same slippery shoes.',floor:2,x:8,speed:1.15,time:110,hazards:8,goal:4},
 {name:'THE LAST LAUGH',subtitle:'Closing time! Give this rascal his receipt.',floor:2,x:-17,speed:1.3,time:115,hazards:11,goal:6}
];
export class ChaseGame {
 constructor(RAPIER,{onEvent=()=>{}}={}){this.R=RAPIER;this.onEvent=onEvent;this.config={...DEFAULTS};this.metrics={jumps:0,ducks:0,bursts:0,rides:0,hits:0,pickups:0,catches:0,steps:0};this.mode='title';this.caseIndex=0;this.score=0;this.players=[];this.hazards=[];this.pickups=[];this.elapsed=0;this.invincible=false;this.freezeCrook=false;this.phaseTime=0;this.totalLoot=0;this.world=null;}
 event(type,data={}){this.onEvent(type,data);}
 start({coop=false,attract=false}={}){this.inactivePlayers=new Set();this.metrics={jumps:0,ducks:0,bursts:0,rides:0,hits:0,pickups:0,catches:0,steps:0};this.coop=coop;this.attract=attract;this.score=0;this.totalLoot=0;this.caseIndex=0;this.elapsed=0;this.mode='playing';this.loadCase(0);this.event('start');}
 loadCase(index){if(this.world)this.world.free();this.world=new this.R.World({x:0,y:-this.config.gravity,z:0});this.caseIndex=index;const c=CASES[index];this.time=c.time*(this.config.time/DEFAULTS.time);this.phaseTime=0;this.loot=0;this.caught=false;this.caseHits=0;this.players=[];this.hazards=[];this.pickups=[];
  for(let floor=0;floor<3;floor++){let body=this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(0,floor*5-.25,1.7));this.world.createCollider(this.R.ColliderDesc.cuboid(25,.25,2.5).setFriction(0),body);}
  for(let i=0;i<(this.coop?2:1);i++)this.addPlayer(i);for(const id of this.inactivePlayers||[])this.deactivatePlayer(id);
  this.crook={x:c.x,y:c.floor*5,floor:c.floor,dir:c.x>0?1:-1,transition:null,escape:0,routeTimer:0};
  const defs=[['ball',0,-7,1],['cart',0,11,-1],['plane',1,-12,1],['case',1,7,0],['ball',2,15,-1],['cart',1,20,-1],['plane',2,-15,1],['case',0,-18,0],['ball',1,-4,-1],['plane',0,19,-1],['cart',2,4,1]];
  for(let i=0;i<c.hazards;i++){const[kind,floor,x,dir]=defs[i];this.addHazard(kind,floor,x,dir);}
  for(let f=0;f<3;f++)for(let j=0;j<3;j++){const x=[-11,7,21][j]+(f%2?-2:0);this.addPickup(f,x);}
  this.event('case',{index,c});
 }
 addPlayer(id){const b=this.world.createRigidBody(this.R.RigidBodyDesc.dynamic().setTranslation(-21+id*1.5,.05,1.7).lockRotations().enabledTranslations(true,true,false).setLinearDamping(.2).setCanSleep(false));const collider=this.world.createCollider(this.R.ColliderDesc.capsule(.43,.3).setTranslation(0,.76,0).setFriction(0).setRestitution(0).setCollisionGroups(0x00010002),b);
 const p={id,active:true,body:b,collider,x:-21+id*1.5,y:.05,floor:0,dir:1,ground:true,duck:false,invul:0,stun:0,burst:0,cooldown:0,transition:null,lastInput:{},anim:'idle'};this.players.push(p);return p;}
 addHazard(kind,floor,x,dir){let h={id:this.hazards.length,kind,floor,x,dir,speed:kind==='plane'?4.2:kind==='cart'?2.2:kind==='ball'?3.0:0,y:floor*5+(kind==='plane'?1.42:kind==='ball'?.42:kind==='cart'?.53:.35)};h.body=this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(x,h.y,1.7));let cd=kind==='ball'?this.R.ColliderDesc.ball(.43):this.R.ColliderDesc.cuboid(kind==='plane'?.75:kind==='cart'?.65:.48,kind==='plane'?.16:kind==='cart'?.49:.32,.45);h.collider=this.world.createCollider(cd.setSensor(true),h.body);this.hazards.push(h);}
 addPickup(floor,x){const b=this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(x,floor*5+.55,1.7));const collider=this.world.createCollider(this.R.ColliderDesc.ball(.6).setSensor(true),b);this.pickups.push({id:this.pickups.length,floor,x,y:floor*5+.55,collected:false,body:b,collider});}
 resetConfig(){Object.assign(this.config,DEFAULTS);if(this.world)this.world.gravity.y=-this.config.gravity;}
 pause(){if(this.mode==='playing'){this.mode='paused';this.event('pause');}}
 resume(){if(this.mode==='paused'){this.mode='playing';this.event('resume');}}
 nextCase(){if(this.caseIndex<2){this.mode='playing';this.loadCase(this.caseIndex+1);}else{this.mode='won';this.event('win');}}
 jump(p){if(p.ground&&!p.transition&&!p.stun){const v=p.body.linvel();p.body.setLinvel({x:v.x,y:this.config.jump,z:0},true);p.ground=false;this.metrics.jumps++;this.event('jump',{id:p.id});}}
 travel(p,kind,delta){if(p.transition||!p.ground)return false;let dest=p.floor+delta;if(dest<0||dest>2)return false;
 const start=p.body.translation();let endX=p.x;if(kind==='escalator'){let center=p.floor===0||dest===0?-17:17;endX=center+(delta>0?3:-3);}
 p.transition={kind,t:0,duration:kind==='elevator'?1.55:1.25,from:{x:start.x,y:start.y},to:{x:endX,y:dest*5+.04},dest};p.body.setBodyType(this.R.RigidBodyType.KinematicPositionBased,true);p.body.setLinvel({x:0,y:0,z:0},true);this.metrics.rides++;this.event('ride',{kind,id:p.id});return true;}
 context(p){if(p.transition)return null;if(Math.abs(p.x)<2)return {kind:'elevator',up:p.floor<2,down:p.floor>0,label:p.floor===2?'LIFT ↓':'LIFT ↑'};if(p.floor===0&&Math.abs(p.x+20)<2.7)return {kind:'escalator',up:true,down:false,label:'ESCALATOR ↑'};if(p.floor===1&&Math.abs(p.x+14)<2.7)return {kind:'escalator',up:false,down:true,label:'ESCALATOR ↓'};if(p.floor===1&&Math.abs(p.x-14)<2.7)return {kind:'escalator',up:true,down:false,label:'ESCALATOR ↑'};if(p.floor===2&&Math.abs(p.x-20)<2.7)return {kind:'escalator',up:false,down:true,label:'ESCALATOR ↓'};return null;}
 interact(p,input){const c=this.context(p);if(!c)return false;let down=input.downUse||(!c.up&&c.down);return this.travel(p,c.kind,down?-1:1);}
 hit(p,h){if(p.invul>0||p.transition||this.invincible||this.attract)return;this.time=Math.max(0,this.time-this.config.penalty);p.invul=1.7;p.stun=.38;this.caseHits++;this.metrics.hits++;p.body.setLinvel({x:-p.dir*3,y:3,z:0},true);this.event('hit',{id:p.id,kind:h.kind});}
 catchCrook(){if(this.caught)return;this.caught=true;this.mode='caseclear';this.phaseTime=0;let bonus=Math.ceil(this.time)*10+500+this.loot*100;this.score+=bonus;this.metrics.catches++;this.event('catch',{bonus,loot:this.loot,clean:this.caseHits===0});}
 deactivatePlayer(id){this.inactivePlayers??=new Set();this.inactivePlayers.add(id);const p=this.players[id];if(p){p.active=false;p.body.setEnabled(false);p.transition=null;}}
 teleport(id,floor,x){const p=this.players[id];if(!p)return;p.transition=null;p.body.setBodyType(this.R.RigidBodyType.Dynamic,true);p.body.setTranslation({x,y:floor*5+.05,z:1.7},true);p.body.setLinvel({x:0,y:0,z:0},true);p.x=x;p.y=floor*5+.05;p.floor=floor;p.ground=true;}
 update(dt,inputs=[]){if(!this.world||this.mode!=='playing')return;dt=Math.min(dt,1/30);this.metrics.steps++;this.elapsed+=dt;this.phaseTime+=dt;this.time-=dt;if(this.world.gravity.y!==-this.config.gravity)this.world.gravity.y=-this.config.gravity;
  if(this.time<=0&&!this.attract){this.time=0;this.mode='lost';this.event('lose',{reason:'time'});return;}
  for(const p of this.players){if(p.active===false)continue;let input=inputs[p.id]||{};p.invul=Math.max(0,p.invul-dt);p.stun=Math.max(0,p.stun-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.burst=Math.max(0,p.burst-dt);
   if(p.transition){let t=p.transition;t.t+=dt;let a=Math.min(1,t.t/t.duration);a=a*a*(3-2*a);p.body.setNextKinematicTranslation({x:t.from.x+(t.to.x-t.from.x)*a,y:t.from.y+(t.to.y-t.from.y)*a,z:1.7});p.anim='idle';if(t.t>=t.duration){p.floor=t.dest;p.body.setBodyType(this.R.RigidBodyType.Dynamic,true);p.body.setLinvel({x:0,y:0,z:0},true);p.transition=null;p.invul=.3;}p.lastInput={...input};continue;}
   const pos=p.body.translation(),vel=p.body.linvel();p.floor=Math.max(0,Math.min(2,Math.round(pos.y/5)));p.ground=pos.y-p.floor*5<.11&&vel.y<.8;const wasDuck=p.duck;p.duck=!!input.duck&&p.ground;
   if(wasDuck!==p.duck){this.world.removeCollider(p.collider,true);p.collider=this.world.createCollider(this.R.ColliderDesc.capsule(p.duck?.12:.43,.3).setTranslation(0,p.duck?.43:.76,0).setFriction(0).setCollisionGroups(0x00010002),p.body);if(p.duck)this.metrics.ducks++;}
   if(input.jump&&!p.lastInput.jump)this.jump(p);
   if(input.dash&&!p.lastInput.dash&&p.cooldown<=0&&!p.stun){p.burst=.75;p.cooldown=4.2;this.metrics.bursts++;this.event('dash',{id:p.id});}
   if(input.interact&&!p.lastInput.interact)this.interact(p,input);
   let move=Math.max(-1,Math.min(1,input.move||0));if(Math.abs(move)<.15)move=0;if(move)p.dir=Math.sign(move);if(!p.stun&&!p.transition){p.body.setLinvel({x:move*this.config.speed*(p.duck?.56:1)*(p.burst>0?this.config.burst:1),y:p.body.linvel().y,z:0},true);}
   p.anim=p.duck?'duck':!p.ground?'jump':Math.abs(move)>.1?'run':'idle';p.lastInput={...input};
  }
  for(const h of this.hazards){h.x+=h.dir*h.speed*this.config.hazardSpeed*dt;if(h.x>24)h.x=-24;if(h.x< -24)h.x=24;h.body.setNextKinematicTranslation({x:h.x,y:h.y,z:1.7});}
  this.updateCrook(dt);
  this.world.timestep=dt;this.world.step();
  for(const p of this.players){if(p.active===false)continue;const pos=p.body.translation();if(Math.abs(pos.x)>24){p.body.setTranslation({x:Math.max(-24,Math.min(24,pos.x)),y:pos.y,z:1.7},true);}p.x=p.body.translation().x;p.y=p.body.translation().y;
   if(p.y< -2)this.teleport(p.id,0,-21);
   for(const h of this.hazards)if(this.world.intersectionPair(p.collider,h.collider))this.hit(p,h);
   for(const b of this.pickups)if(!b.collected&&this.world.intersectionPair(p.collider,b.collider)){b.collected=true;this.loot++;this.totalLoot++;this.score+=100;this.metrics.pickups++;this.time+=2;this.event('pickup',{id:p.id});}
   if(!p.transition&&!this.crook.transition&&Math.abs(p.x-this.crook.x)<1.2&&Math.abs(p.y-this.crook.y)<1.05)this.catchCrook();
  }
 }
 updateCrook(dt){let c=this.crook;if(this.freezeCrook)return;if(c.transition){let t=c.transition;t.t+=dt;let a=Math.min(1,t.t/1.55);c.x=t.x+(t.endX-t.x)*a;c.y=t.y+(t.dest*5-t.y)*a;if(a>=1){c.floor=t.dest;c.transition=null;c.dir=c.x>0?-1:1;}return;}
  c.routeTimer+=dt;const speed=this.config.crookSpeed*CASES[this.caseIndex].speed;
  c.x+=c.dir*speed*dt;c.y=c.floor*5;
  if(c.floor<2){let center=c.floor===0?-17:17;let start=center-3;if(c.dir===1&&c.x>=start&&c.x<start+1.5){c.transition={t:0,x:c.x,y:c.y,endX:center+3,dest:c.floor+1};return;}}
  if(c.x>23){c.x=23;c.dir=-1;}if(c.x< -23){c.x=-23;c.dir=1;}
  if(c.floor===2&&c.routeTimer>32){c.escape+=dt;if(c.escape>18&&!this.attract){this.mode='lost';this.event('lose',{reason:'escape'});}}
 }
 aiInput(p){if(!p||!this.crook)return {};const c=this.crook;let target=c.x,input={move:0};if(p.floor!==c.floor){const floor=p.floor;target=0;if(Math.abs(p.x)<1.2){input.interact=!p.lastInput.interact;input.downUse=floor>c.floor;}}
  input.move=Math.abs(target-p.x)<.4?0:Math.sign(target-p.x);for(const h of this.hazards)if(h.floor===p.floor&&Math.abs(h.x-p.x)<2.6&&Math.sign(h.x-p.x)===p.dir){if(h.kind==='plane')input.duck=true;else input.jump=true;}
  if(p.floor===c.floor&&Math.abs(c.x-p.x)>5)input.dash=p.cooldown<=0;return input;}
 snapshot(){return {mode:this.mode,caseIndex:this.caseIndex,time:this.time,score:this.score,loot:this.loot,totalLoot:this.totalLoot,elapsed:this.elapsed,coop:this.coop,attract:this.attract,phaseTime:this.phaseTime,players:this.players.map(p=>({id:p.id,active:p.active,x:p.x,y:p.y,floor:p.floor,dir:p.dir,anim:p.anim,duck:p.duck,invul:p.invul,cooldown:p.cooldown,burst:p.burst,transition:p.transition?{kind:p.transition.kind}:null})),crook:this.crook?{...this.crook}:null,hazards:this.hazards.map(h=>({id:h.id,kind:h.kind,x:h.x,y:h.y,floor:h.floor,dir:h.dir})),pickups:this.pickups.map(p=>({id:p.id,active:p.active,x:p.x,y:p.y,floor:p.floor,collected:p.collected})),metrics:{...this.metrics}};}
}
