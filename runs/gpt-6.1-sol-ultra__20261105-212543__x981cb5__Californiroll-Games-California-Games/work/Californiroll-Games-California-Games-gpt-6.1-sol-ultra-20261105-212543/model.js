import RAPIER from '@dimforge/rapier3d-compat';
export const EVENTS = [
 {name:'Half-pipe heaven',short:'HALF-PIPE',place:'01 / PALM SPRINGS SKATE CLUB',tag:'Big air. Bigger hair.',goal:'Pump the bowl, grab some air, stick the landing.',tips:['Steer toward the direction you’re rolling to pump.','At the lip, press ACTION to launch.','Hold TRICK in the air. Release before landing.'],action:'Ollie',move:'Pump left / right',trick:'Grab / spin',duration:45,medals:[600,1500,3000],color:'#f66f55'},
 {name:'Sole responsibility',short:'FOOTBAG',place:'02 / SUNSET SAND COURT',tag:'All feet. No worries.',goal:'Keep the bag flying. Mix kicks and head bumps.',tips:['Move under the striped bag. Watch its ground ring.','Press ACTION when it drops into your reach.','Hold TRICK with a kick for a spicy spinning return.'],action:'Kick / head bump',move:'Move left / right',trick:'Spin kick',duration:45,medals:[500,1400,2800],color:'#efb949'},
 {name:'Curl ambitions',short:'SURFING',place:'03 / TANGERINE POINT',tag:'The ocean called. It said “send it.”',goal:'Carve the wave, shoot the tube, launch off the lip.',tips:['Steer around the face. The glowing pocket pays extra.','Ride high and press ACTION to catch air.','Hold TRICK for a cutback. Keep clear of the red edges.'],action:'Pop an aerial',move:'Carve the wave',trick:'Cutback / air grab',duration:45,medals:[1000,2500,4500],color:'#28b8ad'},
 {name:'Boardwalk boogie',short:'ROLLER SKATE',place:'04 / PEACH BEACH PROMENADE',tag:'Eight wheels. Zero chill.',goal:'Weave through the boardwalk and collect sun coins.',tips:['Steer up / down between the three lanes.','Press ACTION to hop cones and puddles.','Hold TRICK in the air; release it before touchdown.'],action:'Hop',move:'Change lane',trick:'Air spin',duration:45,medals:[800,1900,3400],color:'#e88aaa'},
 {name:'Dirt, sweet dirt',short:'BMX',place:'05 / THE GOLDEN HILLS',tag:'Pedal first. Laundry later.',goal:'Ride the hills. Jump the rocks. Get stylish.',tips:['Steer between lanes. Hold forward to pedal faster.','Press ACTION to bunny hop rocks or boost off a hill.','Hold TRICK for a tabletop. Let go before landing.'],action:'Bunny hop',move:'Pedal / change lane',trick:'Tabletop / tailwhip',duration:45,medals:[800,1900,3400],color:'#d69b62'},
 {name:'A fling thing',short:'FLYING DISC',place:'06 / LAST LIGHT LAGOON',tag:'Throw a little sunshine.',goal:'Three throws. Charge it, chase it, make the catch.',tips:['Hold ACTION to charge; release near the gold mark.','Steer to aim. After throwing, you control the catcher.','Run under the disc and press ACTION to catch it.'],action:'Hold / release / catch',move:'Aim / run',trick:'Diving catch',duration:60,medals:[500,1300,2500],color:'#9d91ca'}
];
export const DEFAULTS = {speed:1,jump:1,score:1,duration:1,assist:0.35,invincible:false,auto:false};
export const groundHeight=x=>.75*Math.sin(x*.085)+.35*Math.sin(x*.19);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class CoastGame {
 constructor(onEvent=()=>{}) {this.onEvent=onEvent;this.tune={...DEFAULTS};this.stats={jumps:0,kicks:0,landings:0,catches:0,bails:0,coins:0,physicsSteps:0,eventsCompleted:0};this.ready=false;this.elapsed=0;this.world=null;this.state={phase:'title',event:0,score:0,time:45,x:0,y:0,z:0,vx:0,vz:0,air:0,combo:1,player:0,players:1,turn:0,tour:true,practice:false,results:[[],[]],tricks:[],bails:0,notice:'',noticeTime:0};}
 async init(){await RAPIER.init();this.ready=true;}
 emit(type,detail={}){this.onEvent(type,detail);}
 start(event=0,opts={}) {this.state={...this.state,phase:'brief',event,score:0,time:EVENTS[event].duration*this.tune.duration,x:0,y:0,z:0,vx:0,vz:0,air:0,combo:1,player:opts.player??0,players:opts.players??1,turn:0,tour:opts.tour??true,practice:opts.practice??false,results:[[],[]],tricks:[],bails:0,notice:'',noticeTime:0};this.setup();this.emit('stage');}
 begin(){if(this.state.phase==='brief'){this.state.phase='play';this.emit('start');}}
 setup(){
  const s=this.state;if(this.world)this.world.free();if(this.queue)this.queue.free();this.world=new RAPIER.World({x:0,y:-16,z:0});this.queue=new RAPIER.EventQueue(true);this.obstacles=[];this.collectibles=[];this.handleMap=new Map();this.elapsed=0;this.cooldown=0;this.trickHeld=0;this.airTrick=0;this.airTime=0;this.lastPrimary=false;this.lastTrick=false;this.surfCut=0;this.surfRisk=0;this.trickNames=new Set();this.scoreRemainder=0;
  if(s.event!==4)this.world.createCollider(RAPIER.ColliderDesc.cuboid(600,.2,100).setTranslation(200,-.2,0));
  if(s.event===4){for(let x=-4;x<620;x+=2){const y0=groundHeight(x),y1=groundHeight(x+2);this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.02,.2,4.8).setTranslation(x+1,(y0+y1)/2-.2,0).setRotation({x:0,y:0,z:Math.sin(Math.atan2(y1-y0,2)/2),w:Math.cos(Math.atan2(y1-y0,2)/2)}));}}
  const kinetic=s.event===0||s.event===1||s.event===2;this.body=this.world.createRigidBody((kinetic?RAPIER.RigidBodyDesc.kinematicPositionBased():RAPIER.RigidBodyDesc.dynamic()).setTranslation(0,.65,0).lockRotations().setCcdEnabled(true));
  this.collider=this.world.createCollider(RAPIER.ColliderDesc.capsule(.34,.26).setFriction(0).setRestitution(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),this.body);
  this.bag=null;this.disc=null;
  if(s.event===1){this.bag=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(.5,1.7,0).setCcdEnabled(true));this.world.createCollider(RAPIER.ColliderDesc.ball(.19).setRestitution(.5).setFriction(.8),this.bag);this.collider.setSensor(true);this.bag.setLinvel({x:.3,y:5,z:0},true);}
  if(s.event===3||s.event===4){
   for(let i=0;i<34;i++){const x=13+i*13,z=[-2.7,0,2.7][(i*7+1)%3],y=s.event===4?groundHeight(x):0;const kind=s.event===4?'rock':i%3===0?'puddle':'cone';const obj={id:i,x,z,y,kind,hit:false};const c=this.world.createCollider(RAPIER.ColliderDesc.cuboid(kind==='puddle'?1.1:.55,kind==='puddle'?.08:.6,.62).setTranslation(x,y+(kind==='puddle'?.06:.6),z).setSensor(true).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS));this.handleMap.set(c.handle,{type:'hazard',obj});this.obstacles.push(obj);
    for(let j=0;j<2;j++){const cz=j===0?[-2.7,0,2.7][(i+2)%3]:z,cx=x+(j===0?5:-3),cy=(s.event===4?groundHeight(cx):0)+(j===0?1:2);const coin={id:i*2+j,x:cx,y:cy,z:cz,hit:false};const cc=this.world.createCollider(RAPIER.ColliderDesc.ball(.6).setTranslation(cx,cy,cz).setSensor(true).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS));this.handleMap.set(cc.handle,{type:'coin',obj:coin});this.collectibles.push(coin);}
   }
  }
  if(s.event===0){s.x=-7;s.y=.035*49;s.vx=8;this.pipeVelocity=8;this.pipeDir=1;this.pipeAir=0;this.pipeFlight=0;this.pipeCooldown=0;}
  if(s.event===2){s.y=2.1;this.surfRisk=0;s.pocket=0;}
  if(s.event===5){s.discPhase='charge';s.charge=0;s.aim=0;s.attempt=1;s.discX=-12;s.discY=1;s.discZ=0;s.catcherX=9;s.catcherZ=0;s.discTargetX=18;s.discTargetZ=0;this.discWait=0;}
  s.air=0;s.trick=0;s.bails=0;s.bailTime=0;s.combo=1;s.score=0;s.time=EVENTS[s.event].duration*this.tune.duration;s.tricks=[];s.progress=0;s.surface=0;s.notice='';s.noticeTime=0;s.bagX=.5;s.bagY=1.7;s.bagZ=0;
 }
 say(text){this.state.notice=text;this.state.noticeTime=2.4;}
 add(base,name){const s=this.state;const amount=base*s.combo*this.tune.score+this.scoreRemainder;const value=Math.floor(amount+1e-8);this.scoreRemainder=amount-value;s.score+=value;if(name){this.say(name+'  +'+value);this.trickNames.add(name);s.tricks=[...this.trickNames];this.emit('score',{name,value});}}
 bail(){const s=this.state;if(this.tune.invincible||s.bailTime>0)return;s.bails++;this.stats.bails++;s.combo=1;s.bailTime=1.1;this.trickHeld=0;this.airTrick=0;this.say(['Sand happens!','A little coastal tumble.','The pavement says aloha.'][s.bails%3]);this.emit('bail');}
 step(input,dt){
  const s=this.state;if(s.phase!=='play')return;dt=Math.min(.04,dt);this.elapsed+=dt;s.time=Math.max(0,s.time-dt);s.noticeTime=Math.max(0,s.noticeTime-dt);s.bailTime=Math.max(0,(s.bailTime||0)-dt);this.cooldown=Math.max(0,this.cooldown-dt);const pressed=!!input.pressed;const released=this.lastPrimary&&!input.primary;this.lastPrimary=!!input.primary;
  if(s.event===0)this.pipe(input,dt,pressed);
  if(s.event===1)this.footbag(input,dt,pressed);
  if(s.event===2)this.surf(input,dt,pressed);
  if(s.event===3||s.event===4)this.path(input,dt,pressed);
  if(s.event===5)this.flying(input,dt,pressed,released);
  this.world.timestep=dt;this.world.step(this.queue);this.stats.physicsSteps++;
  this.queue.drainCollisionEvents((a,b,started)=>{if(!started)return;let obj;if(a===this.collider.handle)obj=this.handleMap.get(b);else if(b===this.collider.handle)obj=this.handleMap.get(a);if(!obj||obj.obj.hit)return;obj.obj.hit=true;if(obj.type==='coin'){this.add(90);this.stats.coins++;this.emit('coin');}else {this.bail();}});
  if(s.event===1){const b=this.bag.translation();s.bagX=b.x;s.bagY=b.y;s.bagZ=b.z;if(b.y<.24&&this.bag.linvel().y<1&&this.cooldown===0){s.combo=1;this.say('Bag down? Scoop it back up.');}if(Math.abs(b.x)>7)this.bag.setLinvel({x:-Math.sign(b.x)*2,y:3,z:0},true);}
  if(s.event===3||s.event===4||s.event===1){const p=this.body.translation();s.x=p.x;s.y=p.y-.6;s.z=p.z;}
  if(s.event===5&&this.disc){const p=this.disc.translation();s.discX=p.x;s.discY=p.y;s.discZ=p.z;}
  if(s.time<=0)this.finish();
 }
 pipe(i,dt,pressed){
  const s=this.state;this.pipeCooldown=Math.max(0,this.pipeCooldown-dt);
  if(this.pipeAir>0){this.pipeFlight+=dt;const t=this.pipeFlight;const v=this.launchV;s.x=this.launchX-Math.sign(this.launchX)*t*.75;s.y=5.04+v*t-8*t*t;s.air=Math.max(0,s.y-.035*s.x*s.x);if(i.trick){this.airTrick+=dt;s.trick=this.airTrick*6;}if(s.y<=.035*s.x*s.x&&t>.15){s.y=.035*s.x*s.x;this.pipeAir=0;s.air=0;this.pipeVelocity=-Math.sign(s.x)*Math.max(10,Math.abs(this.pipeVelocity)*.88);this.pipeCooldown=.6;this.land(i,150+this.airTrick*300,'Lip launch');}}
  else {const grav=-1.4*s.x;const pump=Math.sign(i.x||0)===Math.sign(this.pipeVelocity)?6:0;this.pipeVelocity+=(grav+pump*this.tune.speed-this.pipeVelocity*.075)*dt;this.pipeVelocity=clamp(this.pipeVelocity,-22*this.tune.speed,22*this.tune.speed);s.x+=this.pipeVelocity*dt;s.y=.035*s.x*s.x;s.air=0;
   if(Math.abs(s.x)>10.3&&pressed&&this.pipeCooldown===0){this.pipeAir=1;this.pipeFlight=0;this.launchV=(5+Math.abs(this.pipeVelocity)*.14)*this.tune.jump;this.launchX=clamp(s.x,-12,12);this.airTrick=0;this.stats.jumps++;this.emit('jump');}
   if(Math.abs(s.x)>12){s.x=Math.sign(s.x)*12;this.pipeVelocity=-Math.sign(s.x)*Math.max(6,Math.abs(this.pipeVelocity)*.86);this.add(40,'Kick turn');}
  }
  s.vx=this.pipeVelocity;s.lean=-Math.atan(.07*s.x);this.body.setNextKinematicTranslation({x:s.x,y:s.y+.65,z:0});
 }
 land(i,base,name){const s=this.state;this.stats.landings++;if(i.trick&&this.airTrick>.18){this.bail();return;}let label=name;if(this.airTrick>.15)label=this.airTrick>.6?'Sunset 360':'Melon grab';this.add(base,label);s.combo=clamp(s.combo+1,1,5);s.trick=0;this.airTrick=0;this.emit('land');}
 footbag(i,dt,pressed){
  const s=this.state,p=this.body.translation(),b=this.bag.translation();const targetX=clamp(p.x+i.x*dt*6,-7,7);this.body.setNextKinematicTranslation({x:targetX,y:.65,z:0});s.vx=i.x*6;s.air=0;s.kick=Math.max(0,(s.kick||0)-dt*4);
  if(pressed&&this.cooldown===0){this.cooldown=.18;const reach=1.2+this.tune.assist*.8;if(Math.abs(b.x-p.x)<reach&&b.y<3.3&&b.y>.1){const high=b.y>2.25;const spin=i.trick;s.kick=1;this.bag.setTranslation({x:b.x,y:Math.max(b.y,.3),z:0},true);this.bag.setLinvel({x:i.x*.8+(p.x-b.x)*.8,y:high?5.7:7.6,z:0},true);this.stats.kicks++;this.add(high?95:spin?130:65,high?'Head in the clouds':spin?'Sole spin':'Sweet sole');s.combo=clamp(s.combo+1,1,5);this.emit('kick');}else this.say('Get under it, then kick.');}
 }
 surf(i,dt,pressed){const s=this.state;const oldY=s.y;s.x=clamp(s.x+i.x*dt*5.5,-8.4,8.4);s.y=clamp(s.y-i.y*dt*3.4,.15,5.3);s.vx=9;s.vz=i.y*3.4;s.lean=i.x*.3+i.y*.25;s.pocket=Math.sin(this.elapsed*.55)*3;
  const inTube=Math.abs(s.x-s.pocket)<2.1&&s.y>1.2&&s.y<3.9;s.inTube=inTube;s.risk=clamp((this.surfRisk+=(s.y<.5||s.y>5||Math.abs(s.x)>7.4?dt*.5:-dt*.6)),0,1);this.surfRisk=s.risk;if(s.risk>=1){this.bail();s.x=0;s.y=2;s.risk=0;this.surfRisk=0;}
  if(s.bailTime<=0)this.add(dt*(inTube?74:22));if(i.trick&&Math.abs(i.x)+Math.abs(i.y)>.25){this.surfCut+=dt;if(this.surfCut>1){this.add(110,'Peachy cutback');this.surfCut=0;}}
  if(pressed&&this.cooldown===0&&s.y>3.35){this.airTime=.001;this.cooldown=1.8;this.airTrick=0;this.stats.jumps++;this.emit('jump');}
  if(this.airTime>0){this.airTime+=dt;s.air=Math.sin(Math.min(1,this.airTime/1.2)*Math.PI)*2.4*this.tune.jump;if(i.trick)this.airTrick+=dt;if(this.airTime>=1.2){this.airTime=0;s.air=0;this.land(i,220,'Off the lip');}}
  s.z=0;this.body.setNextKinematicTranslation({x:s.x,y:s.y+s.air+.6,z:0});
 }
 path(i,dt,pressed){const s=this.state;const p=this.body.translation(),v=this.body.linvel(),floor=s.event===4?groundHeight(p.x):0;const grounded=p.y<=floor+.78&&v.y<2;const speed=(s.event===4?9.2:8.3)*this.tune.speed*(i.brake?.65:1)*(s.bailTime>0?.38:1)*(s.event===4?1+Math.max(0,i.x)*.32:1);s.vx=speed;s.vz=i.y*6;let vy=v.y;
  if(pressed&&grounded&&this.cooldown===0){vy=8*this.tune.jump;this.cooldown=.3;this.airTrick=0;this.airTime=.01;this.stats.jumps++;this.emit('jump');}
  const z=clamp(p.z,-3.4,3.4);if(z!==p.z)this.body.setTranslation({x:p.x,y:p.y,z},true);this.body.setLinvel({x:speed,y:vy,z:i.y*6},true);s.air=Math.max(0,p.y-floor-.6);if(this.airTime>0){this.airTime+=dt;if(i.trick)this.airTrick+=dt;s.trick=this.airTrick*6;if(grounded&&this.airTime>.3){this.airTime=0;this.land(i,100+this.airTrick*210,s.event===4?'Dirt pop':'Boardwalk hop');}}s.surface=floor;s.lean=s.event===4?-Math.atan((groundHeight(p.x+1)-groundHeight(p.x-1))/2):0;s.progress=clamp(p.x/400,0,1);if(p.y<floor-.8)this.body.setTranslation({x:p.x,y:floor+.8,z},true);this.add(dt*7);
 }
 flying(i,dt,pressed,released){const s=this.state;this.collider.setSensor(true);this.body.setTranslation({x:s.catcherX,y:.65,z:s.catcherZ},true);this.body.setLinvel({x:0,y:0,z:0},true);s.x=s.discPhase==='charge'?-12:s.catcherX;s.y=0;s.z=s.discPhase==='charge'?0:s.catcherZ;s.vx=0;
  if(s.discPhase==='charge'){s.aim=clamp(s.aim+i.y*dt*.8,-.65,.65);if(i.primary)s.charge=clamp(s.charge+dt*.65,0,1);if(released&&s.charge>.03){const quality=1-Math.abs(s.charge-.82);const vx=10+s.charge*9;this.disc=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(-12,1.5,0).setGravityScale(.24).setLinearDamping(0).setCcdEnabled(true));this.world.createCollider(RAPIER.ColliderDesc.ball(.22).setRestitution(0).setSensor(true),this.disc);this.disc.setLinvel({x:vx,y:6.4,z:s.aim*8},true);s.discPhase='flight';s.discTargetX=-12+vx*3.54;s.discTargetZ=s.aim*8*3.54;s.catcherX=s.discTargetX-4;s.catcherZ=0;this.say(quality>.95?'Golden release! Now make the catch.':'It’s up! Chase that sunshine.');this.emit('jump');}}
  else if(s.discPhase==='flight'){s.catcherX=clamp(s.catcherX+i.x*dt*11,-10,65);s.catcherZ=clamp(s.catcherZ+i.y*dt*10,-22,22);s.vx=i.x*11;const p=this.disc.translation();const distance=Math.hypot(p.x-s.catcherX,p.z-s.catcherZ);s.catchReady=distance<(i.trick?3.4:2+this.tune.assist)&&p.y<3.6&&p.y>.2;if(pressed&&s.catchReady){this.stats.catches++;this.add(200+(p.x+12)*9+(i.trick?180:0),i.trick?'Sunset diving catch':'Signed, sealed, caught');s.combo=clamp(s.combo+1,1,5);this.disc.setLinvel({x:0,y:0,z:0},true);this.disc.setGravityScale(0,true);s.discPhase='rest';this.discWait=2;this.emit('catch');}else if(p.y<.2){s.discPhase='rest';this.discWait=2;this.add(Math.max(30,(p.x+12)*2),'Distance points');this.say('So close! Distance points banked.');}}
  else {this.discWait-=dt;if(this.discWait<=0){if(s.attempt>=3)this.finish();else {s.attempt++;s.discPhase='charge';s.charge=0;s.aim=0;if(this.disc){this.world.removeRigidBody(this.disc);this.disc=null;}s.discX=-12;s.discY=1;s.discZ=0;}}}
 }
 finish(){const s=this.state;if(s.phase!=='play')return;const score=Math.round(s.score),medal=this.medal(score);s.results[s.player][s.event]={score,medal};s.phase='result';this.stats.eventsCompleted++;this.emit('finish',{score,medal,event:s.event});}
 medal(score=this.state.score){const m=EVENTS[this.state.event].medals;return score>=m[2]?3:score>=m[1]?2:score>=m[0]?1:0;}
 next(){const s=this.state;if(s.phase!=='result')return;if(s.players===2&&s.player===0){s.player=1;s.turn++;}else if(s.tour&&s.event<5){s.event++;s.player=0;s.turn++;}else {s.phase='podium';this.emit('podium');return;}s.phase='brief';this.setup();this.emit('stage');}
 botInput(){const s=this.state;const i={x:0,y:0,primary:false,pressed:false,trick:false,brake:false};if(s.event===0){i.x=Math.sign(this.pipeVelocity);i.pressed=Math.abs(s.x)>10.4&&this.pipeAir===0;i.primary=i.pressed;i.trick=this.pipeAir>0&&this.pipeFlight<.52;}
  if(s.event===1&&this.bag){const b=this.bag.translation();i.x=clamp((b.x-s.x)*4,-1,1);i.pressed=b.y<1.6&&this.bag.linvel().y<0&&this.cooldown===0;i.primary=i.pressed;i.trick=true;}
  if(s.event===2){i.x=clamp((s.pocket-s.x)*1.2,-1,1);const target=2.9+Math.sin(this.elapsed*1.6)*1.2;i.y=clamp((s.y-target)*2,-1,1);i.trick=Math.sin(this.elapsed*2)>.3&&this.airTime===0;i.pressed=s.y>3.6&&this.cooldown===0;i.primary=i.pressed;}
  if(s.event===3||s.event===4){const next=this.obstacles.find(o=>!o.hit&&o.x>s.x-1);const near=next&&next.x-s.x<4;const lane=next?next.z:0;i.y=clamp((lane-s.z)*2,-1,1);i.x=1;i.pressed=!!near&&this.airTime===0&&this.cooldown===0;i.primary=i.pressed;i.trick=this.airTime>.08&&this.airTime<.4;}
  if(s.event===5){if(s.discPhase==='charge'){i.primary=s.charge<.82;}else if(s.discPhase==='flight'){const p=this.disc.translation();const t=Math.max(0,(this.disc.linvel().y+Math.sqrt(this.disc.linvel().y**2+2*3.84*Math.max(0,p.y-1.8)))/3.84);const tx=p.x+this.disc.linvel().x*t;const tz=p.z+this.disc.linvel().z*t;i.x=clamp((tx-s.catcherX)*2,-1,1);i.y=clamp((tz-s.catcherZ)*2,-1,1);i.pressed=!!s.catchReady;i.primary=i.pressed;i.trick=true;}}
  return i;
 }
 snapshot(){return JSON.parse(JSON.stringify(this.state));}
}
