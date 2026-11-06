import RAPIER from '@dimforge/rapier3d-compat';

export const DEFAULTS = Object.freeze({ meteorSpeed: 3.5, spawnRate: 1.25, shuttleSpeed: 8, beamSpeed: 1.6, rescueSeconds: 95, defenseSeconds: 25, pulseSeconds: 9, damage: 1 });
export const PLANETS = [
  {name:'Mallow Moon', subtitle:'A small world. Six very big feelings.', color:'#c593ff', ground:'#65549c', sky:'#141c41', sun:'#ffcc92', species:['Moonmops','Sproutlings','Starbuns'], colors:['#f7a4c7','#b9ec9a','#ffc878']},
  {name:'Ember Orchard', subtitle:'The sun is hungry. The locals are round.', color:'#ffae73', ground:'#935564', sky:'#311b3f', sun:'#ffad67', species:['Emberpips','Peachbeaks','Fluffurns'], colors:['#ffac72','#f8d687','#e5a4e6']},
  {name:'Midnight Reef', subtitle:'Last call for the little ones.', color:'#72e8e5', ground:'#34667e', sky:'#10283e', sun:'#c4baff', species:['Bubblebits','Finfins','Glowbugs'], colors:['#95e7e1','#a9bcff','#edee9b']}
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function rngFrom(seed) { let n=seed>>>0; return ()=>{n+=0x6D2B79F5; let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}; }
export async function initPhysics(){await RAPIER.init();}

export class Cruise {
  constructor(seed=1982){this.tuning={...DEFAULTS};this.god=false;this.autopilot=false;this.events=[];this.reset(seed);}
  reset(seed=1982){
    this.generation=(this.generation||0)+1;
    this.world?.free();this.queue?.free();this.world=new RAPIER.World({x:0,y:0,z:0});this.world.timestep=1/60;this.queue=new RAPIER.EventQueue(true);
    this.seed=seed;this.random=rngFrom(seed);this.entities=new Map();this.colliders=new Map();this.nextId=1;this.events=[];this.time=0;this.phaseTime=0;this.phase='defense';this.planet=0;
    this.score=0;this.hull=6;this.maxHull=6;this.invul=0;this.combo=0;this.bestCombo=0;this.kills=0;this.rescued=0;this.pairs=0;this.pairLog=[];this.totalShots=0;this.hits=0;this.pulses=0;
    this.aim=0;this.fireCd=0;this.pulseCd=0;this.spawnCd=1.7;this.recallHold=0;this.dockCd=0;this.threatCd=0;this.lastHit=-99;this.surfaceTime=0;this.shuttle={x:0,y:5.1,vx:0,vy:0,cargo:[],beam:0,target:null,boost:1};
    this.creatures=[];this.sentinelX=-12;this.sentinelCd=3;this.endReason='';this.makeActor('ark',0,0,1.65);this.emit('phase',{phase:'defense',planet:0});
  }
  emit(type,data={}){this.events.push({type,...data});if(this.events.length>500)this.events.shift();}
  makeActor(kind,x,y,r){const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,y,0));const c=this.world.createCollider(RAPIER.ColliderDesc.ball(r).setSensor(true).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);const id=this.nextId++;const e={id,kind,body,collider:c,x,y,r,life:10000};this.entities.set(id,e);this.colliders.set(c.handle,id);return e;}
  spawn(kind,x,y,vx,vy,opts={}){
    const r=opts.r??(kind==='meteor'?.62:kind==='bolt'?.24:.18);const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,0).setLinvel(vx,vy,0).setGravityScale(0).lockRotations().enabledTranslations(true,true,false).setCcdEnabled(true));
    const c=this.world.createCollider(RAPIER.ColliderDesc.ball(r).setSensor(true).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);
    const e={id:this.nextId++,kind,x,y,vx,vy,r,life:12,body,collider:c,hp:1,spin:(this.random()-.5)*3,...opts};if(e.warning>0){body.setLinvel({x:0,y:0,z:0},true);c.setEnabled(false);}this.entities.set(e.id,e);this.colliders.set(c.handle,e.id);return e;
  }
  remove(id){const e=this.entities.get(id);if(!e)return;this.colliders.delete(e.collider.handle);this.world.removeRigidBody(e.body);this.entities.delete(id);}
  clearHazards(){for(const e of [...this.entities.values()])if(!['ark','shuttle'].includes(e.kind))this.remove(e.id);}
  goToPlanet(index){for(const e of [...this.entities.values()])this.remove(e.id);this.planet=clamp(index,0,2);this.makeActor('ark',0,0,1.65);this.setPhase('defense');this.spawnCd=1.7;this.pulseCd=0;this.combo=0;}
  setPhase(p){this.phase=p;this.phaseTime=0;this.clearHazards();this.emit('phase',{phase:p,planet:this.planet});}
  spawnMeteor(direction=null,hard=null){
    const d=direction??Math.floor(this.random()*4);const v=[{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}][d];const dist=d%2?14.8:22;
    const strong=hard??(this.planet>0&&this.random()<.22);const speed=this.tuning.meteorSpeed*(1+this.planet*.18)*(strong?.83:1);
    this.spawn('meteor',v.x*dist,v.y*dist,-v.x*speed,-v.y*speed,{dir:d,hp:strong?2:1,r:strong?.8:.58,strong});this.emit('incoming',{dir:d});
  }
  beginRescue(){
    for(const e of [...this.entities.values()])this.remove(e.id);
    this.setPhase('rescue');this.surfaceTime=this.tuning.rescueSeconds;this.shuttle={x:0,y:4.8,vx:0,vy:0,cargo:[],beam:0,target:null,boost:1};this.makeActor('shuttle',0,4.8,.65);this.makeActor('ark',0,7.7,2);
    this.creatures=[];const xs=[-13,-8.1,-3.6,3.6,8.1,13];const species=[0,1,2,2,1,0];
    for(let i=0;i<6;i++)this.creatures.push({id:i,species:species[i],x:xs[i],y:-6.8,status:'ground',beam:0,phase:this.random()*6.28});
    this.sentinelCd=3.8;this.dockCd=0;this.recallHold=0;this.emit('message',{text:'Six little lives. Bring them home.',tone:'calm'});
  }
  hit(amount=1){
    if(this.invul>0||this.god)return;this.hull=Math.max(0,this.hull-amount*this.tuning.damage);this.invul=1.2;this.combo=0;this.lastHit=this.time;this.emit('hit',{hull:this.hull});
    if(this.phase==='rescue'&&this.shuttle.cargo.length){const id=this.shuttle.cargo.pop();const c=this.creatures[id];c.status='ground';c.x=clamp(this.shuttle.x,-14,14);this.emit('drop',{id});}
    if(this.hull<=0)this.finish(false,'The ark ran out of hull. The stars will wait for another try.');
  }
  pulse(){
    if(this.pulseCd>0||!['defense','rescue'].includes(this.phase))return false;this.pulseCd=this.tuning.pulseSeconds;this.pulses++;let n=0;
    const x=this.phase==='rescue'?this.shuttle.x:0,y=this.phase==='rescue'?this.shuttle.y:0;
    for(const e of [...this.entities.values()])if(['meteor','bolt'].includes(e.kind)&&Math.hypot(e.x-x,e.y-y)<(this.phase==='defense'?12:7)){this.emit('burst',{x:e.x,y:e.y,color:'#7df3ef'});this.remove(e.id);n++;this.score+=25;}
    this.emit('pulse',{x,y,n});return true;
  }
  dock(){
    if(!this.shuttle.cargo.length)return;
    const ids=[...this.shuttle.cargo];this.shuttle.cargo=[];this.shuttle.beam=0;this.shuttle.target=null;
    for(const id of ids){const c=this.creatures[id];c.status='saved';this.rescued++;this.score+=300;const same=this.creatures.filter(v=>v.species===c.species&&v.status==='saved');if(same.length===2){this.pairs++;this.score+=500;this.pairLog.push(this.planet*3+c.species);this.emit('pair',{species:c.species,name:PLANETS[this.planet].species[c.species]});}}
    this.hull=Math.min(this.maxHull,this.hull+.25*ids.length);this.emit('dock',{count:ids.length});this.dockCd=1;
    if(this.creatures.every(c=>c.status==='saved')){this.score+=Math.ceil(this.surfaceTime)*10;this.hull=Math.min(this.maxHull,this.hull+1);this.setPhase('warp');}
  }
  depart(forced=false){
    this.dock();if(this.phase==='warp')return;
    if(forced){this.hit(2);if(this.phase==='defeat')return;this.emit('message',{text:'Solar surge! Emergency recall.',tone:'danger'});}this.setPhase('warp');
  }
  finish(won,reason=''){
    this.endReason=reason;this.setPhase(won?'victory':'defeat');if(won){this.score+=Math.round(this.hull*400);this.emit('message',{text:'Small creatures. Enormous universe. Home at last.',tone:'calm'});}
  }
  botInput(){
    if(this.phase==='defense'){
      const threats=[...this.entities.values()].filter(e=>e.kind==='meteor').sort((a,b)=>Math.hypot(a.x,a.y)/Math.hypot(a.vx,a.vy)-Math.hypot(b.x,b.y)/Math.hypot(b.vx,b.vy));
      const e=threats[0];return {aim:e?e.dir:this.aim,fire:true,pulse:threats.some(v=>Math.hypot(v.x,v.y)<3)};
    }
    if(this.phase==='rescue'){
      const s=this.shuttle;let tx=0,ty=5.2,beam=false;
      if(s.cargo.length<2){const cs=this.creatures.filter(c=>c.status==='ground').sort((a,b)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x));if(cs.length){tx=cs[0].x;ty=-3.8;beam=true;}}
      const dx=tx-s.x,dy=ty-s.y;return {mx:clamp(dx*1.8,-1,1),my:clamp(dy*1.8,-1,1),beam:beam&&Math.abs(dx)<1.35,boost:!beam&&Math.abs(dy)>2,pulse:[...this.entities.values()].some(e=>e.kind==='bolt'&&Math.hypot(e.x-s.x,e.y-s.y)<3)};
    }return {};
  }
  update(dt,input={}){
    if(['victory','defeat'].includes(this.phase))return;
    dt=Math.min(dt,1/30);this.time+=dt;this.phaseTime+=dt;this.invul=Math.max(0,this.invul-dt);this.fireCd-=dt;this.pulseCd=Math.max(0,this.pulseCd-dt);this.dockCd=Math.max(0,this.dockCd-dt);
    if(this.autopilot)input=this.botInput();if(input.pulse)this.pulse();
    if(this.phase==='defense'){
      if(input.aim!==undefined)this.aim=((input.aim%4)+4)%4;
      if(input.fire&&this.fireCd<=0){const a=this.aim*Math.PI/2,dx=Math.cos(a),dy=Math.sin(a);this.spawn('shot',dx*2,dy*2,dx*27,dy*27,{r:.22,life:1.7});this.fireCd=.17;this.totalShots++;this.emit('shot',{x:dx*2,y:dy*2,dir:this.aim});}
      this.spawnCd-=dt;if(this.spawnCd<=0){this.spawnMeteor();this.spawnCd=this.tuning.spawnRate/(1+this.planet*.18);if(this.planet===2&&this.random()<.16)this.spawnMeteor();}
      if(this.phaseTime>this.tuning.defenseSeconds+this.planet*4){this.setPhase('descent');}
    } else if(this.phase==='descent'){
      if(this.phaseTime>3.3)this.beginRescue();
    } else if(this.phase==='rescue'){
      const s=this.shuttle;const mx=clamp(input.mx||0,-1,1),my=clamp(input.my||0,-1,1);const boosting=input.boost&&s.boost>.03;
      const speed=this.tuning.shuttleSpeed*(boosting?1.7:1);const follow=1-Math.exp(-dt*8);s.vx+=(mx*speed-s.vx)*follow;s.vy+=(my*speed-s.vy)*follow;
      s.x=clamp(s.x+s.vx*dt,-16.4,16.4);s.y=clamp(s.y+s.vy*dt,-5.1,5.5);s.boost=clamp(s.boost+(boosting?-.45:.24)*dt,0,1);
      const actor=[...this.entities.values()].find(e=>e.kind==='shuttle');actor?.body.setNextKinematicTranslation({x:s.x,y:s.y,z:0});
      const c=this.creatures.filter(c=>c.status==='ground'&&Math.abs(c.x-s.x)<1.5&&s.y>-5.4&&s.y<-1).sort((a,b)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x))[0];
      const beam=input.beam&&s.cargo.length<2;s.beam=clamp(s.beam+(beam?6:-9)*dt,0,1);s.target=beam&&c?c.id:null;
      for(const v of this.creatures){if(beam&&c===v){v.beam+=dt*this.tuning.beamSpeed;if(v.beam>=1){v.beam=0;v.status='cargo';s.cargo.push(v.id);this.score+=50;this.emit('pickup',{id:v.id,species:v.species,x:v.x,y:v.y});}}else v.beam=Math.max(0,v.beam-dt*2);}
      if(Math.abs(s.x)<3.2&&s.y>4.3&&this.dockCd<=0)this.dock();
      this.sentinelX=Math.sin(this.phaseTime*.28+this.planet)*13;
      this.sentinelCd-=dt;if(this.sentinelCd<0){this.emit('warning',{x:s.x,y:s.y});this.sentinelCd=Math.max(1.7,4-this.planet*.7);const x=this.sentinelX;const dx=s.x-x,dy=s.y-1.6;const len=Math.hypot(dx,dy)||1;this.spawn('bolt',x,1.6,dx/len*(4+this.planet),dy/len*(4+this.planet),{r:.3,life:7,warning:.65});}
      this.surfaceTime-=dt;if(this.surfaceTime<=0&&this.phase==='rescue')this.depart(true);
      if(input.recall&&this.creatures.some(c=>c.status==='saved')&&Math.abs(s.x)<3.2&&s.y>4.3){this.recallHold+=dt;if(this.recallHold>1.2)this.depart(false);}else this.recallHold=0;
    } else if(this.phase==='warp'){
      if(this.phaseTime>3.6){if(this.planet<2){this.planet++;for(const e of [...this.entities.values()])this.remove(e.id);this.makeActor('ark',0,0,1.65);this.setPhase('defense');this.spawnCd=2;this.pulseCd=0;this.combo=0;}else this.setPhase('escape');}
    } else if(this.phase==='escape'){
      if(this.phaseTime>5)this.finish(true);
    }
    for(const e of this.entities.values())if(e.warning>0){e.warning-=dt;if(e.warning<=0){e.collider.setEnabled(true);e.body.setLinvel({x:e.vx,y:e.vy,z:0},true);}}
    this.world.step(this.queue);
    for(const e of [...this.entities.values()]){const p=e.body.translation();e.x=p.x;e.y=p.y;if(!['ark','shuttle'].includes(e.kind)){e.life-=dt;if(e.life<0||Math.abs(e.x)>29||Math.abs(e.y)>22)this.remove(e.id);}}
    const collisions=[];this.queue.drainCollisionEvents((a,b,started)=>{if(started)collisions.push([this.colliders.get(a),this.colliders.get(b)]);});
    for(const [a,b] of collisions){const ea=this.entities.get(a),eb=this.entities.get(b);if(!ea||!eb)continue;let shot=ea.kind==='shot'?ea:eb.kind==='shot'?eb:null;let meteor=ea.kind==='meteor'?ea:eb.kind==='meteor'?eb:null;
      if(shot&&meteor){this.remove(shot.id);meteor.hp--;this.hits++;this.emit('burst',{x:meteor.x,y:meteor.y,color:meteor.hp>0?'#ffc878':'#91f4e7'});if(meteor.hp<=0){this.remove(meteor.id);this.kills++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.score+=75*Math.min(5,1+Math.floor(this.combo/4));this.emit('kill',{x:meteor.x,y:meteor.y});}}
      else {const hazard=['meteor','bolt'].includes(ea.kind)?ea:['meteor','bolt'].includes(eb.kind)?eb:null;const actor=['ark','shuttle'].includes(ea.kind)?ea:['ark','shuttle'].includes(eb.kind)?eb:null;if(hazard&&actor){this.emit('burst',{x:hazard.x,y:hazard.y,color:'#ff8f94'});this.remove(hazard.id);this.hit();}}
    }
  }
  snapshot(){return {phase:this.phase,planet:this.planet,time:this.time,phaseTime:this.phaseTime,score:this.score,hull:this.hull,rescued:this.rescued,pairs:this.pairs,kills:this.kills,seed:this.seed,pulseCd:this.pulseCd,surfaceTime:this.surfaceTime,shuttle:{...this.shuttle,cargo:[...this.shuttle.cargo]},creatures:this.creatures.map(c=>({...c})),entities:[...this.entities.values()].map(({id,kind,x,y,dir,strong,hp})=>({id,kind,x,y,dir,strong,hp}))};}
}
