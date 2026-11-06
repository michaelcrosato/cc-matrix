import { THREE, PALETTE, HERO_MODEL, HERO_RIG, compileClips, PlatformerCharacter, readMoveInput, Mirror, Precipitation, Timeline, applySky, skyAt, RAPIER, toonMaterial } from '../../pixel-engine.js';
import { avatar, LOOKS, CAST } from '../art/avatar.js';
import { CLIPS } from '../art/clips.js';
import { place, box, floor, island, postcard, stage, lineWorld, pierWorld, ocean } from '../art/world.js';
import { BY_ID, ACTIVITIES, STATIONS } from '../data/activities.js';
import { DAYS, QUESTIONS, UNLOCKS, MEDLEY, LONG_EVENTS } from '../data/week.js';
import { LINES, BARKS } from '../data/lines.js';
import { TITLE, TAGLINE } from '../data/title.js';
import { ActivityRun, ActivityBot } from '../core/activity.js';
import { uiDelta } from '../core/clock.js';
import { Dot, BalanceBot, clamp, disc, rng } from '../core/dot.js';
import { LocalDriver, PadDriver, BotDriver, GhostDriver } from '../core/drivers.js';
import { pressed, ACTIONS } from '../core/actions.js';
import { guest, confess, dayData } from '../core/save.js';
import { SONGS } from '../audio/songs.js';
import { C, rect, text, line, circle, panel, badge, stars, star, dial, ouncePortrait, chart } from '../ui/widgets.js';
import { wrap, measure, clean } from '../ui/font.js';
import { prompts } from '../art/glyphs.js';
const { Vector3, Mesh, CylinderGeometry, SphereGeometry, BoxGeometry, Group }=THREE;
const ATTRACT_NAMES=['Dennis','You','Marguerite'];
export class GameScene {
 name=TITLE;assets=[HERO_MODEL];
 constructor(app,id,args={}){this.app=app;this.id=id;this.args=args;this.phase='intro';this.t=0;this.uiTime=0;this.lanes=[];this.actors=[];this.target=new Vector3();this.temp=new Vector3();this.origin=new Vector3();this.ray=new Vector3();this.data=BY_ID[args.id]||BY_ID.tree;this.total=0;this.totals=[0,0,0,0];this.eventIndex=0;this.attract=app.attract;this.near=null;this.hover=null;this.menuRepeat=0;this.stickLatch=0;this.joinPrev=new Map();this.flash=0;this.barkAt=6;this.itemMeshes=[];this.hoopMeshes=[];this.pendingEvents=[];this.select=0;this.faceAge=35;this.age=0;this.morningPhase='test';this.rawAges=[];}
 camera(){
  const aspect=typeof innerWidth==='number'?innerWidth/innerHeight:16/9;
  const narrow=Math.max(1,(16/9)/aspect);
  if(this.id==='title')return{preset:'fixed',position:[12,9.4,15],target:[-.2,1.1,-.2],fov:35};
  if(this.id==='hub'||this.id==='jog')return{preset:'iso',zoom:1.15};
  if(this.id==='activity'&&this.data.kind==='slack')return{preset:'fixed',position:[0,3.2,-6],target:[0,1,8],fov:48};
  if(this.id==='activity'&&this.data.kind==='tray')return{preset:'fixed',position:[0,8.5,4.3],target:[0,0,0],fov:47};
  if(this.id==='activity'&&this.data.kind==='pier')return{preset:'fixed',position:[1.5,4.1,18],target:[1.5,1.2,0],fov:43};
  if(this.id==='locker'||this.id==='animation')return{preset:'fixed',position:[0,2,5.6],target:[-.9,.9,0],fov:31};
  if(this.id==='ferry')return{preset:'fixed',position:[10,7,13],target:[0,1,0],fov:40};
  const four=this.id==='medley'||this.id==='join'||this.id==='card';return{preset:'fixed',position:[0,3.2,(four?11.5:10.8)*narrow],target:[0,1.4,0],fov:34};
 }
 async setup(ctx){
  this.ctx=ctx;this.app.bind(ctx,this);ctx.engine.timeScale=1;ctx.engine.sun.intensity=2.2;ctx.engine.ambient.intensity=1.8;
  ctx.particles.register('zen',{count:[3,5],life:[1,2],speed:[.1,.4],gravity:.1,size:[1,2],colors:['white','sand']});
  ctx.particles.register('confetti',{count:[18,30],life:[1,2.2],speed:[2,4],gravity:-2,size:[1,2],colors:['sky','sand','white','cyan']});
  ctx.particles.register('splash',{count:[25,40],life:[.5,1.2],speed:[2,4],gravity:-5,size:[1,3],colors:['sky','white','cyan']});
  if(this.id==='title'){this.world=postcard(ctx);this.actors.push(await avatar(ctx,LOOKS[0],[3,.2,.3],'Tree'),await avatar(ctx,CAST.Coach,[5,.2,.3],'Heron'));this.ounce=place(ctx,'ounce',[1.5,.2,1.4],{scale:1.1,turn:20});this.phase='title';}
  else if(this.id==='hub'){this.world=island(ctx);const look=this.playerLook();this.player=await avatar(ctx,look,[0,.16,4]);this.actors.push(this.player);this.hero=new PlatformerCharacter(ctx.physics,{position:[0,.18,4],lockDepth:ctx.camera.lockDepth});this.hero.attachModel(this.player.root,compileClips(CLIPS,HERO_RIG,this.player.root),HERO_RIG);this.ounce=place(ctx,'ounce',[1,.18,4.7],{scale:1.3});for(const [name,x,z,clip]of [['Coach',-8,-1,'Tree'],['Dennis',9,4,'Chair'],['Marguerite',-10,-8,'Heron'],['June',10,-8,'Sit']])this.actors.push(await avatar(ctx,CAST[name],[x,.2,z],clip));this.phase='walk';if(!this.attract&&!this.app.guest)this.app.guest=guest('Visitor');if(this.app.guest?.day===7&&!this.app.guest.confessed&&!this.attract){this.pendingLong=true;}}
  else if(this.id==='activity'){await this.setupActivity(ctx);}
  else if(this.id==='medley'){this.world=stage(ctx,BY_ID.tree,4);await this.setupMedley(ctx);this.phase='play';}
  else if(this.id==='card'||this.id==='join'){this.world=stage(ctx,BY_ID.tree,4);const players=this.app.info?.players||Array.from({length:4},(_,i)=>({name:'Mat '+(i+1),id:i}));for(let i=0;i<players.length;i++)this.actors.push(await avatar(ctx,{...LOOKS[i],top:['red','blue','green','sand'][i]},[-3+2*i,.12,.8],'Idle'));this.phase=this.id;if(this.id==='join')this.select=1;}
  else if(this.id==='ferry'){this.world={sea:ocean(ctx),update(t){this.sea.update(t);}};box(ctx,[0,-.2,1.8],[8,.4,5],'orange');for(const x of [-3.8,3.8])for(const z of [0,3.8])box(ctx,[x,.55,z],[.18,1.5,.18],'white');this.ferry=place(ctx,'tare-ferry',[-4,0,-2],{turn:25});this.ounce=place(ctx,'ounce',[1,.02,1]);this.actors.push(await avatar(ctx,this.playerLook(),[-1,.02,1],'Wave'));this.timeline=new Timeline({duration:17,shots:[{at:0,position:[10,7,13],target:[0,1,0]},{at:12,position:[5,3,8],target:[0,1,1]}],lines:[{at:1,until:5,who:'Ounce',text:"Hello. I am Ounce. Please step on me."},{at:5,until:7,who:'Ounce',text:'Ow.'},{at:7,until:12,who:'Ounce',text:'That was a joke. I can only keep records.'},{at:12,until:17,who:'Ounce',text:'This dot is you. Keep it in the circle.'}]});this.timeline.play();this.phase='arrival';}
  else if(this.id==='weighin'){this.world=stage(ctx,BY_ID.tree,1);this.ounce=place(ctx,'ounce',[0,.12,.8],{scale:1.5});this.player=await avatar(ctx,this.playerLook(),[0,.57,.5],'Idle');this.actors.push(this.player);this.dot=new Dot(rng(800+(this.app.guest?.day||1)));this.bot=new BalanceBot(this.app.driverSkill||'expert',rng(800));this.driver=new LocalDriver(this.app);this.testScore=0;this.testInside=0;this.targetHold=0;this.targetsDone=0;this.testElapsed=0;this.phase='intro';}
  else if(this.id==='locker'||this.id==='animation'){this.world=stage(ctx,BY_ID.tree,1);this.player=await avatar(ctx,this.playerLook(),[0,.1,0],this.args.clip||'Idle');this.actors.push(this.player);this.phase='view';if(this.id==='locker'&&!this.args.initial)this.openLocker();}
  else if(['jar','records','report','ending'].includes(this.id)){this.world=postcard(ctx);this.ounce=place(ctx,'ounce',[1.4,.2,1.4]);this.actors.push(await avatar(ctx,CAST.Coach,[4,.12,.5],'Idle'));this.phase=this.id==='ending'?'confession':'view';if(this.id==='report')applySky(ctx.engine,skyAt(19));if(this.id==='ending'){this.rawAges=[...(this.app.guest?.ages||[])];this.timeline=new Timeline({duration:22,lines:[{at:.5,until:5,who:'Ounce',text:'I have been adding seven.'},{at:5,until:10,who:'Ounce',text:'To everyone. For years. It felt motivating.'},{at:10,until:15,who:'Coach',text:'You may start again at zero.'},{at:15,until:22,who:'Ounce',text:'See you tomorrow. Bring your knees.'}],cues:[{at:9,id:'confess',run:()=>{if(this.app.guest){confess(this.app.guest);this.app.save.write();}}}]});this.timeline.play();}}
  const song=this.id==='activity'?this.data.song:this.id==='report'||this.id==='ending'?'report':this.id==='medley'?'still':'plaza';ctx.audio.playMusic(SONGS[song],song);if(this.data.kind==='long'&&this.id==='activity')ctx.audio.setVolume('music',this.app.settings.music*.15);
 }
 playerLook(){const g=this.app.guest;return{...LOOKS[g?.avatar??this.app.preset??0],...g?.look};}
 async changeAvatar(index){if(!this.ctx)return;const old=this.player;if(old){this.ctx.scene.remove(old.root,old.shadow);this.actors=this.actors.filter(a=>a!==old);}this.player=await avatar(this.ctx,{...LOOKS[index],...this.app.guest?.look},[0,.1,0]);this.actors.push(this.player);}
 async setupActivity(ctx){
  const a=this.data;this.world=a.kind==='slack'?lineWorld(ctx):a.kind==='jog'?island(ctx):a.kind==='pier'?pierWorld(ctx):stage(ctx,a,3);this.actors=[];
  const configs=[{name:'Dennis',look:CAST.Dennis,skill:'average',x:-2.2},{name:this.app.guest?.name||'You',look:this.playerLook(),local:true,x:0},{name:'Marguerite',look:CAST.Marguerite,skill:'expert',x:2.2}];
  if(['slack','tray','jog','pier'].includes(a.kind))configs.splice(0,3,{name:this.app.guest?.name||'You',look:this.playerLook(),local:true,x:0});
  for(let i=0;i<configs.length;i++){const c=configs[i],av=await avatar(ctx,c.look,[c.x,a.kind==='slack'?1:.12,a.kind==='slack'?0:.8],a.clip);this.actors.push(av);const laneSeed=200+i*47+(a.kind==='tray'?this.args.board||0:0);const run=new ActivityRun(a,this.app.tunables,{seed:laneSeed,hard:this.args.hard,gentle:this.app.settings.gentle});this.lanes.push({...c,av,run,seed:laneSeed,driver:c.local&&!this.app.driverSkill?new LocalDriver(this.app):new BotDriver(c.local?this.app.driverSkill:c.skill,200+i*47)});}
  this.coach=await avatar(ctx,CAST.Coach,[-4.6,.32,-1.2],a.clip);this.actors.push(this.coach);this.ounce=place(ctx,'ounce',[4.3,.1,.6],{scale:.8,turn:-15});
  if(a.kind==='hoop')for(const l of this.lanes){const rings=[];for(let i=0;i<4;i++){const m=place(ctx,'exercise-hoop',[l.x,1,.8],{palette:{plastic:['orange','sand','cyan','plum'][i]}});rings.push(m);}this.hoopMeshes.push(rings);}
  if(a.kind==='header')for(let j=0;j<this.lanes.length;j++){const arr=[];for(let i=0;i<5;i++){arr.push({coconut:place(ctx,'flying-coconut',[0,-10,0]),flip:place(ctx,'flying-flip-flop',[0,-10,0]),gold:place(ctx,'golden-pineapple',[0,-10,0])});}this.itemMeshes.push(arr);}
  if(a.id==='press')for(const l of this.lanes)for(const side of ['R','L']){const hand=l.av.root.getObjectByName('Hand'+side);if(hand){const weight=place(ctx,'tare-dumbbell',[0,0,0],{scale:.055});hand.add(weight);weight.position.set(0,-.03,.08);}}if(a.kind==='reps'){this.mirror=new Mirror({size:[6,2.8]});this.mirror.mesh.position.set(0,1.8,-3.5);ctx.scene.add(this.mirror.mesh);this.stopMirror=this.mirror.attach(ctx.engine.renderer,ctx.scene);}
  if(a.kind==='tray')this.setupTray(ctx);
  if(a.kind==='jog'){this.scooter=place(ctx,'coach-scooter',[1,0,0]);this.coach.play('Sit');this.jogCups=[];for(let i=1;i<=18;i++){const theta=i*12/220*Math.PI*2,lane=Math.sin(i*2)*1.2;const cup=new Mesh(new CylinderGeometry(.16,.11,.35,8),toonMaterial(PALETTE.white));cup.position.set(Math.cos(theta)*(15+lane),.3,Math.sin(theta)*(11+lane));ctx.scene.add(cup);this.jogCups.push(cup);}ctx.engine.setCamera({preset:'iso',zoom:1.5},{syncUrl:false});}
  if(a.kind==='pier'){this.coach.root.visible=false;this.ounce.visible=false;this.judges=[];for(let i=0;i<3;i++)this.judges.push(await avatar(ctx,[CAST.Coach,CAST.Marguerite,CAST.June][i],[-7+i*2,.2,-3],'Sit'));this.actors.push(...this.judges);}
  if(a.kind==='long'){this.rain=new Precipitation({kind:'rain',count:600});this.rain.intensity=0;ctx.scene.add(this.rain);applySky(ctx.engine,skyAt(17));}
  this.phase=this.attract?'play':'intro';this.phaseT=0;this.practice=!this.app.guest?.played[a.id]&&!this.app.save.data.records[a.id];this.subtitle=LINES[a.id][this.practice?4:5];
 }
 setupTray(ctx){
  this.tray=new Group();this.tray.position.y=1.1;ctx.scene.add(this.tray);for(const x of [-2.5,2.5])for(const z of [-1.4,1.4])box(ctx,[x,.5,z],[.16,1,.16],'white');const base=new Mesh(new BoxGeometry(6,.15,4),toonMaterial(PALETTE.sand));this.tray.add(base);
  const add=(at,size,color)=>{const m=new Mesh(new BoxGeometry(...size),toonMaterial(PALETTE[color]));m.position.set(...at);this.tray.add(m);};
  for(const x of [-3,3])add([x,.2,0],[.15,.5,4.1],'teal');for(const z of [-2,2])add([0,.2,z],[6,.5,.15],'teal');
  for(const w of this.lanes[0].run.trayWalls)add([w.x,.2,w.z],[.7,.4,.65],'teal');
  this.cupMeshes=[];for(const c of this.lanes[0].run.trayCups){const cup=new Mesh(new CylinderGeometry(.45,.4,.16,16),toonMaterial(PALETTE[['red','blue','sand'][c.color]]));cup.position.set(c.x,.11,c.z);this.tray.add(cup);this.cupMeshes.push(cup);}

  ctx.physics.addStaticBox({position:[0,-.075,0],halfExtents:[3,.075,2]});this.originalGravity={...ctx.physics.world.gravity};ctx.physics.world.gravity={x:0,y:-this.app.tunables.trayGravity,z:0};
  this.vitamins=this.lanes[0].run.balls.map(b=>{const m=new Mesh(new SphereGeometry(.14,8,6),toonMaterial(PALETTE[['red','blue','sand'][b.color]]));m.position.set(b.x,.2,b.z);this.tray.add(m);const body=ctx.physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(b.x,.2,b.z).setCcdEnabled(true).setLinearDamping(1.4));ctx.physics.world.createCollider(RAPIER.ColliderDesc.ball(.14).setRestitution(.3),body);return{m,body};});
  this.playerVisible(false);
 }
 playerVisible(on){for(const a of this.actors){a.root.visible=on;a.shadow.visible=on;}if(this.ounce)this.ounce.visible=on;}
 resetDrivers(){for(const l of this.lanes){if(l.ghost)continue;l.driver=l.local&&!this.app.driverSkill?(l.padIndex!=null?new PadDriver(l.padIndex):new LocalDriver(this.app,{keyboardOnly:this.id==='medley'})):new BotDriver(l.local?this.app.driverSkill:l.skill||'expert',l.seed||100);}}
 async setupMedley(ctx){
  const players=this.app.info?this.app.info.players.map(p=>({name:clean(p.name).slice(0,12),local:p.id===this.app.info.me,ghost:p.id!==this.app.info.me,id:p.id})):this.app.family.map((p,i)=>({...p,local:p.type!=='bot',id:i,padIndex:p.type==='pad'?p.index:null}));
  if(!this.app.info&&this.app.fillBots)while(players.length<4)players.push({name:['Dennis','June','Marguerite'][players.length%3],skill:['average','good','expert'][players.length%3],type:'bot',id:players.length});
  for(let i=0;i<players.length;i++){const p=players[i],av=await avatar(ctx,{...LOOKS[i],top:['red','blue','green','sand'][i]},[-3+i*2,.12,.8],'Tree');this.actors.push(av);const seed=this.app.info?.seed||200;this.lanes.push({...p,av,x:-3+i*2,seed,run:p.ghost?null:new ActivityRun(BY_ID.tree,this.app.tunables,{seed,duration:MEDLEY.duration}),driver:p.ghost?new GhostDriver():p.type==='pad'?new PadDriver(p.index):p.local?this.app.driverSkill?new BotDriver(this.app.driverSkill,seed):new LocalDriver(this.app,{keyboardOnly:true}):new BotDriver(p.skill||'good',seed+i)});}
  this.data=BY_ID.tree;this.phaseT=0;
 }
 fixedUpdate(ctx,dt){
  const app=this.app;if(app.net.ended||app.menu&&!app.info||app.dialogue)return;this.t+=dt;
  if(this.id==='hub')this.stepHub(ctx,dt);
  else if(this.id==='activity')this.stepActivity(ctx,dt);
  else if(this.id==='medley')this.stepMedley(ctx,dt);
  else if(this.id==='weighin'&&this.phase==='test')this.stepWeighin(ctx,dt);
  else if(this.timeline){this.timeline.update(dt);if(this.timeline.ended){if(this.id==='ferry'){app.go('weighin');}else if(this.id==='ending'){this.phase='credits';}}}
 }
 stepHub(ctx,dt){
  this.move=readMoveInput(ctx,this.hero,this.move);const input=ctx.input;
  if(this.attract){const theta=this.t*.17;this.destination=new Vector3(Math.cos(theta)*11,.2,Math.sin(theta)*8);}
  if(this.destination){const f=this.hero.feetInto(this.temp);const dx=this.destination.x-f.x,dz=this.destination.z-f.z,d=Math.hypot(dx,dz);this.move.move.set(dx/Math.max(1,d),0,dz/Math.max(1,d));if(d<1.1){this.destination=null;if(this.enterAtDestination){const id=this.enterAtDestination;this.enterAtDestination=null;this.app.interact(id);}}if(!this.attract&&input.moveAxis().x*this.move.move.x+input.moveAxis().y*this.move.move.z>2)this.destination=null;}
  if(input.consumePress('PadCross')){if(this.near)this.app.interact(this.near.id);else this.move.jump=true;}
  if(input.consumePress('KeyE','Enter')&&this.near)this.app.interact(this.near.id);
  this.move.jumpHeld ||= input.isDown('PadCross');this.move.wave ||= input.consumePress('PadTriangle');this.move.sit ||= input.consumePress('PadSquare');this.hero.fixedUpdate(dt,this.move);
  const f=this.hero.feetInto(this.temp);if(f.y<-3||Math.abs(f.x)>23||Math.abs(f.z)>17)this.hero.teleport([0,.18,4]);
  this.near=STATIONS.find(s=>Math.hypot(f.x-s.x,f.z-(s.z+3))<3)||null;
  if(this.pendingLong&&!appHasOverlay(this.app)){this.pendingLong=false;this.app.say('Coach',DAYS[6].line,()=>this.app.startActivity('long'));}
 }
 walkTo(s,enter=false){this.destination=new Vector3(s.x,.2,s.z+3);this.enterAtDestination=enter?s.id:null;}
 stepActivity(ctx,dt){
  this.phaseT+=dt;
  if(this.phase==='practice'&&this.phaseT>=8){this.phase='countdown';this.phaseT=0;this.resetRuns();}
  else if(this.phase==='countdown'&&this.phaseT>=3){this.phase='settle';this.phaseT=0;this.subtitle='Settle. Four small seconds.';}else if(this.phase==='settle'&&this.phaseT>=4){this.phase='play';this.phaseT=0;this.resetRuns();ctx.audio.playMusic(SONGS[this.data.song],this.data.song);}else if(this.phase==='outro'&&this.phaseT>=2){this.finish(ctx);}
  if(!['practice','play'].includes(this.phase))return;
  for(let i=0;i<this.lanes.length;i++){const l=this.lanes[i];const u=l.driver.read(l.run,dt,ctx,this.dialPosition(i));if(l.local)this.app.lastInput=u;l.run.step(dt,u);if(this.app.debug.god){const d=Math.hypot(l.run.dot.x,l.run.dot.y),r=l.run.ring*.9;if(d>r){l.run.dot.x*=r/d;l.run.dot.y*=r/d;l.run.dot.vx*=.5;l.run.dot.vy*=.5;}}
   while(l.run.events.length){const e=l.run.events.shift();if(l.local)this.event(ctx,e,l);}
  }
  if(this.data.kind==='tray'){const u=this.app.lastInput,T=this.app.tunables;ctx.physics.world.gravity={x:(u.x||0)*T.trayGravity*.24,y:-T.trayGravity,z:-(u.y||0)*T.trayGravity*.24};}
  const local=this.lanes.find(l=>l.local);if(this.phase==='play'&&local?.run.done&&!this.attract){this.phase='outro';this.phaseT=0;this.subtitle='Release. The record is settling.';}
 }
 resetRuns(){for(const l of this.lanes){l.run=new ActivityRun(this.data,this.app.tunables,{seed:l.seed,hard:this.args.hard,gentle:this.app.settings.gentle});}this.resetDrivers();}
 forceFinish(stars=3){if(this.id!=='activity')return;const l=this.lanes.find(l=>l.local);l.run.t=l.run.duration;l.run.score=stars?this.data.stars[Math.min(2,stars-1)]*this.app.tunables.starThresholdScale+1:0;l.run.done=true;if(this.data.kind==='slack'){l.run.progress=stars?30:0;l.run.falls=stars===3?0:1;l.run.t=stars===3?28:40;}this.finish(this.ctx);this.app.closeMenu();}
 finish(ctx){this.phase='results';this.phaseT=0;this.result=this.app.activityFinished(this.lanes.find(l=>l.local).run.result());ctx.audio.play('star');this.subtitle=LINES[this.data.id][this.result.stars];this.app.voice.say(ctx,this.subtitle,'Ounce');this.lanes.find(l=>l.local).av.play(this.result.stars>=2?'Victory':'Bow');ctx.particles.burst('confetti',[0,1.5,.8]);ctx.audio.setVolume('music',this.app.settings.music);this.select=0;}
 event(ctx,e,l){const app=this.app;if(e.type==='story'){this.subtitle=e.text;app.voice.say(ctx,e.text,this.data.kind==='long'&&this.lanes[1]?.run.eventIndex===0?'Coach':'Ounce');}else{if(SFX_TYPES.has(e.type))ctx.audio.play(e.type);if(e.text){this.subtitle=e.text;this.barkTime=this.t;}if(['catch','bonk','step','in'].includes(e.type))ctx.particles.burst('zen',[l.x,1.7,.8]);if(e.type==='splash'){ctx.particles.burst('splash',l.av.root.position);if(!app.settings.reduceFlashes)ctx.engine.shake.add(.2);}if(e.type==='bonk'){l.av.play('HeaderNod');if(!app.settings.reduceFlashes)ctx.engine.hitstop(.05);}if(e.type==='step')l.av.play(l.run.input.stepL?'StepL':'StepR',.02);}}
 stepWeighin(ctx,dt){
  const test=dayData(this.app.guest).test;this.testElapsed+=dt;
  let target={x:0,y:0};if(test==='Lean')target={x:[-.7,.7,0][Math.min(2,this.targetsDone)],y:0};if(test==='Chase')target={x:Math.sin(this.testElapsed*.7)*.4,y:Math.sin(this.testElapsed*.47)*.35};this.testTarget=target;
  let u=this.app.driverSkill?this.bot.read(this.dot,dt,target):this.driver.read(null,dt,ctx,{x:ctx.hud.width/2,y:100});this.app.lastInput=u;this.dot.step(dt,u.x,u.y,this.app.tunables);
  const distance=Math.hypot(this.dot.x-target.x,this.dot.y-target.y);if(test==='Lean'){if(distance<.14){this.targetHold+=dt;if(this.targetHold>1.5){this.targetsDone++;this.targetHold=0;ctx.audio.play('in');}}else this.targetHold=Math.max(0,this.targetHold-dt*.5);this.testScore=clamp(this.targetsDone/3+(1-this.testElapsed/15)*.15);}else{this.testInside+=(test==='Stillness'?(distance<.3?1:0):clamp(1-distance*2))*dt;this.testScore=this.testInside/this.testElapsed;}
  if(this.testElapsed>=15){this.phase='question';this.select=0;this.age=this.app.guest.ages.at(-1)||0;}
 }
 stepMedley(ctx,dt){
  let t=this.app.info?this.app.net.time:this.t;this.medleyTime=t;if(t<0)return;const slot=MEDLEY.duration+MEDLEY.interval,index=Math.min(2,Math.floor(t/slot)),within=t-index*slot;
  if(index!==this.eventIndex){this.addMedleyScores();this.eventIndex=index;this.data=BY_ID[MEDLEY.events[index]];for(const l of this.lanes){if(!l.ghost)l.run=new ActivityRun(this.data,this.app.tunables,{seed:l.seed,duration:MEDLEY.duration});l.av.play(this.data.clip);}this.resetMedleyProps(ctx);ctx.audio.playMusic(SONGS[this.data.song],this.data.song);}
  this.phase=within>MEDLEY.duration?'interval':'play';
  if(within<=MEDLEY.duration)for(let i=0;i<this.lanes.length;i++){const l=this.lanes[i];if(l.ghost)continue;const u=this.app.menu&&l.local?{x:0,y:0}:l.driver.read(l.run,dt,ctx,this.dialPosition(i));if(l.local)this.app.lastInput=u;l.run.step(dt,u);l.run.events=[];}
  for(const l of this.lanes)if(l.ghost){const p=this.app.net.ghosts.get(l.id);l.av.root.visible=!!p&&p.a===index&&!this.app.net.left.has(l.id);if(p){l.av.root.rotation.z+=( -p.x*.18-l.av.root.rotation.z)*.12;this.totals[l.id]=p.s||0;}}
  if(t>=MEDLEY.total){this.addMedleyScores();this.phase='podium';if(this.app.info)this.app.net.finish();}
 }
 addMedleyScores(){if(this.scoredEvent===this.eventIndex)return;this.scoredEvent=this.eventIndex;for(const l of this.lanes){if(l.ghost)continue;const max=this.data.kind==='hoop'?140:this.data.kind==='header'?1000:100;this.totals[l.id]=(this.totals[l.id]||0)+Math.round(clamp(l.run.score/max)*1000);}}
 resetMedleyProps(ctx){for(const rings of this.hoopMeshes)for(const m of rings)ctx.scene.remove(m);this.hoopMeshes=[];for(const arr of this.itemMeshes)for(const group of arr)for(const m of Object.values(group))ctx.scene.remove(m);this.itemMeshes=[];
 if(this.data.kind==='hoop')for(const l of this.lanes)this.hoopMeshes.push([place(ctx,'exercise-hoop',[l.x,1,.8])]);
 if(this.data.kind==='header')for(const l of this.lanes)this.itemMeshes.push(Array.from({length:5},()=>({coconut:place(ctx,'flying-coconut',[0,-10,0]),flip:place(ctx,'flying-flip-flop',[0,-10,0]),gold:place(ctx,'golden-pineapple',[0,-10,0])})));
 }
 update(ctx,dt){
  ctx.hud.sync(ctx.engine.renderer.resolution,ctx.engine.renderer.framing);
  const uiDt=uiDelta(ctx,dt);this.uiTime+=uiDt;const app=this.app;const blocked=app.tick(ctx,uiDt);
   if(this.phase==='podium'&&this.id==='medley'&&!app.info){this.podiumTimer=(this.podiumTimer||0)+dt;}
  if(!blocked){if(app.menu)this.handleMenu(ctx,uiDt);else this.handleInput(ctx,uiDt);}
  this.present(ctx,dt);ctx.hud.clear();app.ui.begin(ctx.hud);
  if(!app.debug.hideHud||app.menu){if(app.device.touchOnly&&ctx.hud.width<300&&!app.menu){this.drawTouchMessage(ctx);}else{this.draw(ctx);if(app.menu)this.drawMenu(ctx);if(app.dialogue)this.drawDialogue(ctx);if(this.attract)this.drawAttract(ctx);if(app.debug.overlay)this.drawDebug(ctx);}}
 }
 handleInput(ctx,dt){
  const app=this.app,i=ctx.input,yes=pressed(i,'confirm'),click=i.wasPressed('MouseLeft'),back=pressed(i,'back');
  if(this.id==='title'){if((yes||click||i.queuedPresses.some(k=>!k.startsWith('Mouse')))&&!app.device.touchOnly)app.mainMenu();}
  else if(this.id==='activity'){
   if(this.phase==='intro'&&(yes||click)){this.phase=this.practice?'practice':'countdown';this.phaseT=0;this.subtitle=this.practice?'Try it. Eight seconds. No records.':'Gently.';app.voice.say(ctx,LINES[this.data.id][4],'Coach');}
   else if(this.phase==='practice'&&yes){this.phase='countdown';this.phaseT=0;this.resetRuns();}
   else if(this.phase==='results'){this.select=this.nav(ctx,this.select,3,dt,1,true);if(yes)this.resultAction(this.select);}
  } else if(this.id==='hub'){
   if(i.wasPressed('KeyM','Tab','PadTriangle'))app.travelMenu();
   if(click&&i.pointer.over&&!this.uiConsumed){this.pickWorld(ctx,true);}
   if(this.t>=this.barkAt&&!this.attract){this.barkAt=this.t+8;this.subtitle=BARKS[Math.floor(this.t/8)%BARKS.length];}
  } else if(this.id==='ferry'){if(yes||click)this.timeline.skip();}
  else if(this.id==='weighin'){
   if(this.phase==='intro'){if(pressed(i,'left'))this.faceAge=Math.max(5,this.faceAge-1);if(pressed(i,'right'))this.faceAge=Math.min(99,this.faceAge+1);if(yes||click){this.phase='test';this.testElapsed=0;ctx.audio.play('ow');app.voice.say(ctx,'Ow. Eyes closed in three seconds.','Ounce');}}
   else if(this.phase==='question'){this.select=this.nav(ctx,this.select,3,dt);if(yes){app.morningDone(this.testScore);this.age=app.guest.ages.at(-1);this.phase='reveal';this.phaseT=0;this.subtitle=app.guest.day===7?'It is all graded.':`Thank you. I have filed that.`;app.voice.say(ctx,`Your Wobble Age is ${this.age}. Is that close? I am so sorry.`,'Ounce');}}
   else if(this.phase==='reveal'&&(yes||click)){app.go('hub').then(()=>app.say(dayData(app.guest).who,dayData(app.guest).line));}
  } else if(this.id==='report'){if(yes)app.endDay();if(back)app.go('hub');}
  else if(this.id==='ending'){if(this.phase==='confession'&&yes)this.timeline.skip();else if(this.phase==='credits'&&yes){app.guest.day=7;app.endDay();}}
  else if(this.id==='join'){this.handleJoin(ctx);}
  else if(this.id==='card'){if(yes)globalThis.AIHub.answer('ready');if(i.wasPressed('KeyM','PadTriangle'))globalThis.AIHub.answer('more');}
  else if(this.id==='medley'&&this.phase==='podium'&&!app.info){this.select=this.nav(ctx,this.select,2,dt,1,true);if(yes){if(this.select===0)app.go('medley');else app.go('title').then(()=>app.mainMenu());}}
  else if(this.id==='records'){if(i.wasPressed('Tab','PadSquare'))this.recordTab=((this.recordTab||0)+1)%3;if(pressed(i,'tabR')||pressed(i,'right'))this.select=(this.select+1)%ACTIVITIES.length;if(pressed(i,'tabL')||pressed(i,'left'))this.select=(this.select+ACTIVITIES.length-1)%ACTIVITIES.length;if(back||yes)app.go('hub');}
  else if(['jar','animation'].includes(this.id)&& (back||yes))app.go('hub');
 }
 nav(ctx,index,count,dt,grid=1,horizontal=false){const i=ctx.input;this.menuRepeat=Math.max(0,this.menuRepeat-dt);let d=0;if(pressed(i,'up'))d=-grid;if(pressed(i,'down'))d=grid;if((grid>1||horizontal)&&pressed(i,'left'))d=-1;if((grid>1||horizontal)&&pressed(i,'right'))d=1;const axis=i.padAxis.y;if(!d&&Math.abs(axis)>.55&&this.menuRepeat<=0){d=axis>0?-grid:grid;this.menuRepeat=.22;}if(!d&&Math.abs(i.wheel)>.1)d=Math.sign(i.wheel);if(d){ctx.audio.play('move');return(index+d+count)%count;}return index;}
 handleMenu(ctx,dt){
  const app=this.app,m=app.menu,i=ctx.input;if(!m)return;
  if(m.kind==='name'){const commands=i.commands;for(const c of commands)if(c?.nameChar){if(c.nameChar==='BACK')app.nameValue=app.nameValue.slice(0,-1);else if(app.nameValue.length<8)app.nameValue+=clean(c.nameChar);}if(i.wasPressed('Backspace'))app.nameValue=app.nameValue.slice(0,-1);m.selection=this.nav(ctx,m.selection,30,dt,6);if(pressed(i,'confirm'))this.nameAction(m.selection);return;}
  if(i.wasPressed('KeyH','PadSquare')&&['dropin','station'].includes(m.kind)&&(app.mode!=='week'||app.guest?.day>=6)){app.hard=!app.hard;m.subtitle=app.hard?'Hard class. Small circle.':'Normal class. All knees welcome.';const row=m.rows.find(r=>r.label.startsWith('Hard class:'));if(row)row.label='Hard class: '+(app.hard?'on':'off');return;}if(pressed(i,'tabL')&&m.tab){m.tab(-1);return;}if(pressed(i,'tabR')&&m.tab){m.tab(1);return;}
  if(i.wasPressed('BracketLeft')&&m.subtab){m.subtab(-1);return;}if(i.wasPressed('BracketRight')&&m.subtab){m.subtab(1);return;}
  m.selection=this.nav(ctx,m.selection,m.rows.length,dt);
  const row=m.rows[m.selection];let adjustment=0;if(pressed(i,'left'))adjustment=-1;if(pressed(i,'right'))adjustment=1;
  if(adjustment&&row?.adjust){row.adjust(adjustment);if(app.menu?.kind===m.kind)app.menu.selection=m.selection;return;}
  if(adjustment&&m.subtab&&!row?.adjust){m.subtab(adjustment);return;}
  if(pressed(i,'confirm')&&row&&!row.disabled){ctx.audio.play('confirm');if(row.action)row.action();else row.adjust?.(1);if(app.menu?.kind===m.kind)app.menu.selection=Math.min(m.selection,app.menu.rows.length-1);}
  if(pressed(i,'back'))app.back();
 }
 nameAction(index){const app=this.app;if(index===29){app.avatarMenu();return;}if(index===28){app.nameValue=app.nameValue.slice(0,-1);return;}if(app.nameValue.length<8)app.nameValue+=(index===27?' ':index===26?'-':String.fromCharCode(65+index));}
 handleJoin(ctx){const app=this.app,i=ctx.input;this.select=this.nav(ctx,this.select,3,1/60,1,true);if(pressed(i,'back')){app.go('title').then(()=>app.mainMenu());return;}if(i.wasPressed('KeyB','PadSquare'))app.fillBots=!app.fillBots;let joined=false;const pads=typeof navigator!=='undefined'?navigator.getGamepads?.()||[]:[];for(const p of pads){if(!p)continue;const down=p.buttons[0]?.pressed;if(down&&!this.joinPrev.get(p.index)&&!app.family.some(x=>x.type==='pad'&&x.index===p.index)&&app.family.length<4){app.family.push({type:'pad',index:p.index,name:'Guest '+(app.family.length+1)});joined=true;}this.joinPrev.set(p.index,down);}if(joined)return;if(i.wasPressed('Space')){app.go('medley');return;}if(i.wasPressed('Enter','PadCross')){if(this.select===0)app.fillBots=!app.fillBots;else if(this.select===1)app.go('medley');else app.go('title').then(()=>app.mainMenu());}}

 resultAction(index){if(index===0)this.app.startActivity(this.data.id);else if(index===1)this.app.nextActivity();else if(this.data.id==='long'&&this.app.mode==='week'&&!this.app.guest.confessed)this.app.ending();else this.app.leaveActivity();}
 present(ctx,dt){
  this.world?.update(ctx.time,dt);this.jogWorld?.update(ctx.time,dt);if(this.id==='locker'&&this.player)this.player.root.rotation.y=Math.sin(ctx.time*.45)*.5;const app=this.app;const frozen=!!app.menu||!!app.dialogue;
  if(this.id==='hub'){this.hero.updateVisual(this.player.root,frozen?0:dt,ctx.physics.alpha);this.player.shadow.place(this.player.root.position.x,.15,this.player.root.position.z,0);const p=this.player.root.position;this.ounce.position.lerp(new Vector3(p.x+1.2,p.y+.15,p.z-.8),Math.min(1,dt*3));this.ounce.position.y+=Math.abs(Math.sin(ctx.time*4))*.05;this.pickWorld(ctx,false);}
  for(const a of this.actors){if(this.id==='hub'&&a===this.player)continue;const lane=this.lanes.find(l=>l.av===a),r=lane?.run;
   if(r){if(this.data.kind==='reps'&&this.phase!=='results'){a.play(this.data.clip,0);const action=a.actions[this.data.clip];action.paused=true;action.time=clamp(r.r)*action.getClip().duration;a.mixer.update(0);}else if(this.data.kind==='hoop'){a.root.rotation.z=Math.sin(ctx.time*10)*.04;a.root.position.x=lane.x+Math.cos(ctx.time*10)*.07;}else if(this.data.kind==='header'){a.root.position.x=lane.x+r.x;if(a.clip==='HeaderNod'&&a.actions.HeaderNod.time>.5)a.play('Idle');}else if(this.data.kind==='slack'){a.root.position.set(r.dot.x*.25,1-Math.sin(r.progress/30*Math.PI)*.25,r.progress);if(r.recover>0)a.root.position.y-=Math.sin(r.recover/1.2*Math.PI)*1.5;}else if(this.data.kind==='jog'){const angle=r.progress/220*Math.PI*2;a.root.position.set(Math.cos(angle)*(15+r.x),.2,Math.sin(angle)*(11+r.x));a.root.rotation.y=-angle;this.scooter?.position.set(Math.cos(angle+.16)*15,.2,Math.sin(angle+.16)*11);if(this.scooter){this.scooter.rotation.y=-angle;this.coach.root.position.copy(this.scooter.position).add(new Vector3(0,.65,0));this.coach.root.rotation.y=-angle;}this.jogCups?.forEach((c,i)=>c.visible=(i+1)*12>r.progress);}else if(this.data.kind==='pier'){const p=r.t%10;a.root.position.set(p<5?-5+p:(p-5)*2.5, p>=5&&p<9?Math.sin((p-5)/4*Math.PI)*3+.2:p>=9?-.3:.25,0);a.play(p<5?'Tuck':p<9?'Cannonball':'Idle');}}
   a.update(frozen?0:dt,r&&['pose','long','slack'].includes(this.data.kind)?r.dot:null);
  }
  if(this.ounce){const needle=this.ounce.getObjectByName('needle');if(needle)needle.rotation.y=Math.PI+Math.sin(ctx.time*1.3)*.25;}
  if(this.id==='ferry'&&this.ferry){this.ferry.position.x=-9+clamp((this.timeline?.time||0)/5)*5;const actor=this.actors[0];if((this.timeline?.time||0)>6&&actor.clip==='Wave')actor.play('Disembark');if((this.timeline?.time||0)>9&&actor.clip==='Disembark')actor.play('Idle');}if(this.timeline){const shot=this.timeline.camera();if(shot&&ctx.camera.camera.isPerspectiveCamera){const c=ctx.camera.camera;c.position.fromArray(shot.position);c.lookAt(new Vector3(...shot.target));if(shot.fov)c.fov=shot.fov;c.updateProjectionMatrix();}const l=this.timeline.line();if(l&&l!==this.lastTimelineLine){this.lastTimelineLine=l;app.voice.say(ctx,l.text,l.who||'Ounce');}}
  for(let j=0;j<this.hoopMeshes.length;j++){const l=this.lanes[j],r=l.run;for(let i=0;i<this.hoopMeshes[j].length;i++){const m=this.hoopMeshes[j][i];m.visible=!!r&&i<r.hoops;m.position.set(l.x+Math.cos(ctx.time*10)*.08,r?r.lift*.65+.3+i*.12:1,.8);m.rotation.set(Math.cos(ctx.time*10)*.12,ctx.time*3,Math.sin(ctx.time*10)*.12);}}
  for(let j=0;j<this.itemMeshes.length;j++){const l=this.lanes[j];for(let i=0;i<this.itemMeshes[j].length;i++){const group=this.itemMeshes[j][i],o=l.run?.objects[i];for(const [kind,m]of Object.entries(group)){m.visible=!!o&&o.type===kind;if(!o)continue;const u=clamp((l.run.t-(o.t-1.4))/1.4);m.position.set(l.x+o.x,(1-u)*3.8+1.55+Math.sin(u*Math.PI)*.6,.8);m.rotation.set(ctx.time*3,ctx.time*2,0);}}}
  if(this.tray){const u=app.lastInput;this.tray.rotation.z=-(u.x||0)*app.tunables.trayMaxTilt*Math.PI/180;this.tray.rotation.x=-(u.y||0)*app.tunables.trayMaxTilt*Math.PI/180;const balls=this.lanes[0].run.balls;for(let i=0;i<balls.length;i++){const b=balls[i],v=this.vitamins[i];v.body.setTranslation({x:b.x,y:.2,z:b.z},true);v.m.position.set(b.x,.2,b.z);v.m.visible=!b.done&&!b.respawn;}}
  if(this.rain){const r=this.lanes.find(l=>l.local)?.run;if(r&&this.world.bird){const b=this.world.bird;if(r.t>=10&&r.t<85){const k=Math.min(1,r.t-10);b.position.set(4.3*(1-k),.98+.92*k,-3.7+4.5*k);}else if(r.t>=85)b.position.set((r.t-85)*2,1.9+(r.t-85)*.4,.8-(r.t-85));if(r.t>=65&&r.t<66&&!this.rumbled){this.rumbled=true;if(!app.settings.reduceFlashes)ctx.engine.shake.add(.4);}}this.rain.intensity=r&&r.t>=35&&r.t<75?.7:0;this.rain.update(dt,new Vector3(0,1,0));if(r?.t>=75&&!this.sunOut){this.sunOut=true;applySky(ctx.engine,skyAt(16));ctx.audio.setVolume('music',app.settings.music);}}
 }
 pickWorld(ctx,click){
  const i=ctx.input;if(!i.pointer.over||this.app.device.kind!=='mouse')return;ctx.camera.rayAt(i.pointer.x,i.pointer.y,this.origin,this.ray);const hit=ctx.physics.castRay(this.origin,this.ray,200);if(!hit)return;this.hover=STATIONS.find(s=>Math.hypot(s.x-hit.point.x,s.z+3-hit.point.z)<3.2)||null;if(click){if(this.hover)this.walkTo(this.hover,true);else{this.destination=new Vector3(hit.point.x,.2,hit.point.z);this.enterAtDestination=null;}}
 }
 cameraTarget(){if(this.id==='hub'&&this.player)return this.target.set(this.player.root.position.x,1.3,this.player.root.position.z);if(this.id==='activity'&&this.data.kind==='jog'&&this.lanes[0])return this.target.copy(this.lanes[0].av.root.position).add(new Vector3(0,1,0));return this.target.set(0,1,0);}
 dialPosition(index=1){const h=this.ctx.hud;if(this.id==='medley')return{x:h.width*(.2+index*.2),y:65,r:24};return{x:h.width/2,y:66,r:36};}
 resumeMusic(){const ctx=this.ctx,r=this.lanes.find(l=>l.local)?.run;ctx.audio.playMusic(SONGS[this.data.song],this.data.song);const song=ctx.audio.song;if(this.data.kind==='step'&&song&&ctx.audio.context&&r){song.start=ctx.audio.context.currentTime+.05-r.t;song.nextStep=Math.ceil(r.t/song.parsed.stepTime);this.resumeCount=3;}}
 drawTouchMessage(ctx){const h=ctx.hud,W=h.width,H=h.height;panel(h,12,20,W-24,100,{shadow:false});text(h,W/2,32,'TARE ISLAND',{align:'center',color:C.teal});text(h,W/2,54,TITLE,{align:'center',maxWidth:W-38});text(h,W/2,81,'Controller or keyboard required',{align:'center',maxWidth:W-40});panel(h,12,H-52,W-24,35,{shadow:false});text(h,W/2,H-44,this.attract?'A little demonstration.':'Ounce is expecting you.',{align:'center',maxWidth:W-38,color:C.teal});}
 draw(ctx){
  const h=ctx.hud,W=h.width,H=h.height,app=this.app;
  if(this.id==='title'){this.drawTitle(ctx);return;}
  if(this.id==='activity'){this.drawActivity(ctx);return;}
  if(this.id==='hub'){this.drawHub(ctx);return;}
  if(this.id==='weighin'){this.drawWeighin(ctx);return;}
  if(this.id==='medley'){this.drawMedley(ctx);return;}
  if(this.id==='card'||this.id==='join'){this.drawJoin(ctx);return;}
  if(this.id==='ferry'){badge(h,12,12,'TARE ISLAND / ARRIVALS');text(h,W-12,16,'Everything starts at zero.',{align:'right',color:C.ink});const l=this.timeline?.line();if(l)this.subtitleBox(ctx,l.who,l.text);prompts(h,app,[['confirm','Skip arrival']],12,H-17);return;}
  if(this.id==='report'){const g=app.guest||guest();panel(h,W/2-174,24,348,H-52);badge(h,W/2-160,35,`DAY ${g.day} / EVENING REPORT`);text(h,W/2,64,'A little more than yesterday.',{scale:1,align:'center'});text(h,W/2-130,87,`${Math.floor(g.minutes||0)} min`,{scale:2});text(h,W/2+20,87,`${g.drips} Drips`,{scale:2});text(h,W/2-130,110,'Minutes, banked.',{color:C.grey});text(h,W/2+20,110,g.goal?'Goal completed.':'Tomorrow is available.',{color:C.grey});chart(h,W/2-125,134,250,38,g.ages);if(g.newUnlocks?.length)text(h,W/2,189,'Unlocked: '+g.newUnlocks.at(-1),{align:'center',color:C.teal});text(h,W/2,204,`Tomorrow: ${DAYS[Math.min(6,g.day)].concern}`,{align:'center'});this.button(ctx,'next-day',W/2-95,H-55,190,23,'Sleep. Begin again.',()=>app.endDay(),true);return;}
  if(this.id==='ending'){this.drawEnding(ctx);return;}
  if(this.id==='jar'){const g=app.guest||guest();panel(h,14,24,Math.min(270,W-28),H-52);badge(h,25,36,'THE SWEAT JAR');text(h,25,64,String(g.drips),{scale:4});text(h,25,103,'Drips, properly collected.',{color:C.teal});const next=UNLOCKS.find(([n])=>n>g.drips)||UNLOCKS.at(-1);text(h,25,128,`Next: ${next[1]}`,{maxWidth:240});text(h,25,153,`${Math.max(0,next[0]-g.drips)} Drips to go.`,{color:C.grey});rect(h,25,176,220,10,C.line);rect(h,25,176,220*clamp(g.drips/175),10,C.teal);text(h,25,200,UNLOCKS.filter(([n])=>n<=g.drips).at(-1)?.[2]||'The jar is patient. Up to a point.',{maxWidth:240});this.button(ctx,'jar-back',25,H-54,110,21,'Back',()=>app.go('hub'),true);return;}
  if(this.id==='records'){this.drawRecords(ctx);return;}

  if(this.id==='locker'){if(!app.menu)badge(h,12,12,'LOCKER ROOM');return;}
  if(this.id==='animation'){badge(h,12,12,'ANIMATION VIEWER');text(h,12,38,this.args.clip,{scale:2});text(h,12,62,'Engine ClipDef / AnimationMixer',{color:C.grey});prompts(h,app,[['back','Island']],12,H-20);}
 }
 drawTitle(ctx){
  const h=ctx.hud,W=h.width,H=h.height,app=this.app,phone=W<300;
  if(app.device.touchOnly&&phone){panel(h,12,22,W-24,104,{shadow:false});text(h,W/2,35,'TARE ISLAND',{align:'center',color:C.teal});text(h,W/2,56,TITLE,{align:'center',maxWidth:W-40,scale:1});text(h,W/2,91,'Controller or keyboard required',{align:'center',maxWidth:W-40,color:C.ink});text(h,W/2,H-37,'A little balance.',{align:'center'});text(h,W/2,H-23,'A lot of notes.',{align:'center'});return;}
  const pw=Math.min(245,Math.floor(W*.51));rect(h,0,0,pw,H,C.paper);rect(h,pw,0,2,H,C.line);
  badge(h,18,16,'TARE ISLAND / RESIDENCY');const parts=TITLE.split(' ');text(h,18,50,parts.slice(0,-1).join(' '),{scale:3});text(h,18,81,parts.at(-1),{scale:3});
  line(h,18,112,pw-19,112,C.line,1);
  if(!app.menu){text(h,18,129,'A little balance.',{scale:1,color:C.teal});text(h,18,145,'A lot of notes.',{scale:1,color:C.teal});text(h,18,180,app.device.touchOnly?'Controller or keyboard required':'Press any button. Gently.',{maxWidth:pw-32});if(!app.device.touchOnly)this.button(ctx,'title-start',18,H-47,pw-37,26,'Check in',()=>app.mainMenu(),true);}
  text(h,18,H-13,'OUNCE HAS BEEN EXPECTING YOU.',{color:C.grey});
  if(W>350){const x=W-104;panel(h,x,16,88,31,{shadow:false});text(h,x+8,23,'VISITOR PASS',{color:C.grey});text(h,x+8,35,'No. 0007',{color:C.teal});if(!app.menu){panel(h,W-188,H-62,170,40,{shadow:false});ouncePortrait(h,W-169,H-42,10,ctx.time);text(h,W-148,H-51,'"You brought your knees."',{maxWidth:122});}}
 }
 drawHub(ctx){
  const h=ctx.hud,W=h.width,H=h.height,app=this.app,g=app.guest||guest();panel(h,12,12,192,42,{shadow:false});badge(h,18,18,`WEEK ${g.week} / DAY ${g.day}`);text(h,18,39,dayData(g).goal,{maxWidth:180});panel(h,W-112,12,100,31,{shadow:false});text(h,W-62,20,`${g.drips} Drips`,{align:'center',color:C.teal,scale:1});text(h,W-62,32,`${g.stars} stars banked`,{align:'center',color:C.grey});
  const s=this.hover||this.near;if(s&&!app.menu){const label=s.label;const w=Math.min(W-30,measure(label)+35);panel(h,W/2-w/2,H-63,w,25,{shadow:false});text(h,W/2,H-55,label,{align:'center'});}
  if(this.subtitle&&!s&&!app.menu){panel(h,12,H-61,Math.min(W-24,340),24,{shadow:false});ouncePortrait(h,26,H-49,8,ctx.time);text(h,42,H-55,this.subtitle,{maxWidth:Math.min(W-64,290)});}
  this.button(ctx,'map',12,H-28,88,18,'Island map',()=>app.travelMenu(),false,true);if(s)this.button(ctx,'enter',W/2-42,H-29,84,20,'Enter',()=>app.interact(s.id),true,true);
  this.button(ctx,'pause',W-67,H-28,55,18,'Pause',()=>app.pause(),false,true);
 }
 drawActivity(ctx){
  const h=ctx.hud,W=h.width,H=h.height,app=this.app,a=this.data,l=this.lanes.find(l=>l.local),r=l?.run;if(!r)return;
  badge(h,12,12,`${a.station.toUpperCase()} / ${this.args.hard?'HARD':'CLASS'}`);panel(h,12,31,Math.min(W*.45,measure(a.name,measure(a.name,2)>W*.45?1:2)+12),23,{shadow:false});text(h,18,38,a.name,{scale:measure(a.name,2)>W*.45?1:2});
  if(this.phase==='intro'){
   panel(h,W/2-164,H/2-40,328,94);text(h,W/2,H/2-27,a.goal,{align:'center',maxWidth:300});text(h,W/2,H/2-8,a.controls,{align:'center',maxWidth:300,color:C.grey});this.button(ctx,'begin',W/2-85,H/2+21,170,24,'Take your place',()=>{this.phase=this.practice?'practice':'countdown';this.phaseT=0;this.app.voice.say(ctx,this.subtitle,'Coach');},true);this.subtitleBox(ctx,'Coach',this.subtitle);return;
  }
  if(this.phase==='results'){this.drawResults(ctx);return;}
  panel(h,12,59,85,39,{shadow:false});text(h,21,65,this.phase==='practice'?'TRY IT':'TIME LEFT',{color:C.grey});text(h,21,80,this.phase==='practice'?Math.max(0,Math.ceil(8-this.phaseT))+'s':Math.max(0,Math.ceil(r.duration-r.t))+'s',{scale:2});
  panel(h,W-104,59,92,39,{shadow:false});text(h,W-96,65,a.kind==='slack'?'DISTANCE':'NOTED SCORE',{color:C.grey});text(h,W-96,80,a.kind==='slack'?r.progress.toFixed(1)+'m':Math.round(r.score).toString(),{scale:2});
  if(['pose','long','slack','pier'].includes(a.kind)){const p=this.dialPosition();dial(h,p.x,p.y,p.r,r.dot,r.ring,{steady:r.inRing,pointer:app.device.kind==='mouse'?{x:(ctx.input.pointer.x+1)*W/2,y:(1-ctx.input.pointer.y)*H/2}:null});text(h,p.x,p.y+p.r+7,r.inRing?'Steady.':'A little correction.',{align:'center',color:r.inRing?C.teal:C.red});if(a.breath){const f=(Math.sin(r.t/a.breath*Math.PI*2-Math.PI/2)+1)/2;rect(h,p.x-37,p.y+p.r+22,74,5,C.line);rect(h,p.x-37,p.y+p.r+22,74*f,5,C.teal);text(h,p.x,p.y+p.r+32,r.t%a.breath<a.breath/2?'In... hold breathe.':'Out... release.',{align:'center',color:C.teal});}}
  else if(a.kind==='reps'){const x=W/2-70,y=65;panel(h,x-8,y-13,156,48,{shadow:false});text(h,W/2,y-7,`Rep ${Math.min(a.reps,1+Math.floor(r.t/(a.tempo*app.tunables.repTempoScale)))} / ${a.reps-2} announced`,{align:'center',color:C.grey});rect(h,x,y+10,140,9,C.line);rect(h,x+(r.targetR||0)*134,y+5,6,19,C.orange);rect(h,x+r.r*134,y+9,6,11,C.teal);text(h,W/2,y+29,r.quality||'Match the orange marker.',{align:'center',color:C.teal});}
  else if(a.kind==='hoop'){text(h,W/2,63,r.t<25?'Circle anticlockwise':r.t<50?'Now clockwise':'Either way',{align:'center',color:C.teal});text(h,W/2,80,Math.abs(r.omega).toFixed(1)+' turns / sec',{align:'center'});rect(h,W/2-44,97,88,5,C.line);rect(h,W/2-44,97,r.lift*88,5,r.inRing?C.teal:C.orange);if(r.t%9>6&&r.t%9<8)text(h,W/2,112,r.catchSide<0?'< Catch left':'Catch right >',{align:'center',color:C.red});}
  else if(a.kind==='step'){this.drawRhythm(ctx,r);}
  else if(a.kind==='header'){text(h,W/2,65,'Coconut: head it.',{align:'center',color:C.teal});text(h,W/2,81,'Flip-flop: dodge it.',{align:'center',color:C.grey});if(r.combo>1)text(h,W/2,104,`${r.combo} in a row`,{align:'center',color:C.teal});}
  else if(a.kind==='tray'){text(h,W/2,58,r.hard?'Three colours. Mind the gap.':'Red to red. Blue to blue.',{align:'center',color:C.teal});text(h,W/2,77,`${r.balls.filter(b=>b.done).length} / 8 filed`,{align:'center'});}
  else if(a.kind==='jog'){text(h,W/2,65,`${r.cadence.toFixed(1)} steps / sec`,{align:'center',color:C.teal});text(h,W/2,83,`${r.cups} / 18 water cups`,{align:'center'});}
  if(this.phase==='settle'||this.phase==='outro')text(h,W/2,124,this.phase==='settle'?'Settle. Then hold.':'Release. Very gently.',{align:'center',color:C.teal});if(this.phase==='countdown'){panel(h,W/2-30,H/2-13,60,46);text(h,W/2,H/2-3,String(Math.max(1,3-Math.floor(this.phaseT))),{align:'center',scale:4});}
  if(this.phase==='practice')text(h,W/2,H-71,'Try it. No records are being kept.',{align:'center',color:C.teal});
  if(this.lanes.length===3)for(let i=0;i<3;i++){const x=W/2+(i-1)*W*.215;badge(h,x-measure(this.lanes[i].name)/2-6,H-83,this.lanes[i].name,i===1?C.teal:C.grey);}
  this.subtitleBox(ctx,'Ounce',this.subtitle||'A small correction is still a correction.');
  prompts(h,app,[['WASD','Lean'],['pause','Pause']],12,H-17);this.button(ctx,'pause',W-55,12,43,17,'Pause',()=>app.pause(),false,true);
 }
 drawResults(ctx){
  const h=ctx.hud,W=h.width,H=h.height,r=this.result,app=this.app;
  panel(h,W/2-159,53,318,H-81);text(h,W/2,65,'PROPERLY NOTED',{align:'center',color:C.grey});stars(h,W/2-36,92,Math.min(r.stars,Math.floor(this.uiTime*2)),12);text(h,W/2,116,Math.round(r.score)+(this.data.kind==='pier'?' m':''),{align:'center',scale:3});
  text(h,W/2,146,this.subtitle,{align:'center',maxWidth:288});text(h,W/2,174,app.mode==='week'?`+${r.drips} Drips${r.bonus?' / goal bonus included':''}`:'Personal record filed. No Drips in Drop-In.',{align:'center',color:C.teal});
  const names=['Dennis','June','Marguerite'],scores=this.data.stars.map((s,i)=>Math.round(s*[1.1,1.1,1.15][i]));text(h,W/2,194,`Dennis ${scores[0]} / June ${scores[1]} / Marguerite ${scores[2]}`,{align:'center',color:C.grey});
  const labels=['Retry','Next class',this.data.id==='long'&&app.mode==='week'&&!app.guest.confessed?'Listen to Ounce':app.mode==='week'?'Island':'Back'];
  for(let i=0;i<3;i++)this.button(ctx,'result-'+i,W/2-147+i*100,H-61,94,23,labels[i],()=>this.resultAction(i),this.select===i,true);
  text(h,W/2,H-19,'Nobody loses. Everyone is noted.',{align:'center',color:C.grey});
 }
 drawRhythm(ctx,r){const h=ctx.hud,W=h.width,x=W/2,y=94;panel(h,x-61,49,122,69,{shadow:false});text(h,x,55,`${r.combo} / COMBO`,{align:'center',color:C.teal});line(h,x-48,y,x+48,y,C.teal,2);text(h,x-24,y+7,'L',{align:'center',color:C.grey});text(h,x+24,y+7,'R',{align:'center',color:C.grey});for(const n of r.notes)if(!n.hit&&n.t-r.t<1.6&&n.t-r.t>-.1){const ny=y-(n.t-r.t)*17,nx=x+(n.side==='L'?-24:24);rect(h,nx-4,ny-4,8,9,n.side==='L'?C.orange:C.teal);rect(h,nx-3,ny-7,6,2,n.side==='L'?C.orange:C.teal);}text(h,x,108,r.quality||'F / J to step',{align:'center',color:C.teal});}

 drawWeighin(ctx){
  const h=ctx.hud,W=h.width,H=h.height,app=this.app,g=app.guest,day=g?.day||1;badge(h,12,12,`DAY ${day} / MORNING WEIGH-IN`);
  if(this.phase==='intro'){panel(h,W/2-162,48,324,136);text(h,W/2,62,'How old do you feel?',{scale:2,align:'center'});text(h,W/2,86,'This is not binding. This is never saved.',{align:'center',color:C.grey});text(h,W/2,112,`< ${this.faceAge} >`,{align:'center',scale:3});this.button(ctx,'age-down',W/2-100,105,36,25,'-',()=>{this.faceAge=Math.max(5,this.faceAge-1);},false,true);this.button(ctx,'age-up',W/2+64,105,36,25,'+',()=>{this.faceAge=Math.min(99,this.faceAge+1);},false,true);this.button(ctx,'weigh-begin',W/2-96,151,192,24,'Please step on me',()=>{this.phase='test';this.testElapsed=0;ctx.audio.play('ow');},true,true);this.subtitleBox(ctx,'Ounce','This dot is you. Keep it in the circle.');}
  else if(this.phase==='test'){const test=dayData(g).test;const hidden=test==='Stillness'&&this.testElapsed>3;dial(h,W/2,95,57,this.dot,.3,{hide:hidden});if(test!=='Stillness'&&this.testTarget){const tx=W/2+this.testTarget.x/1.2*57,ty=95-this.testTarget.y/1.2*57;circle(h,tx,ty,7,C.orange,2);}text(h,12,53,test,{scale:2});text(h,W-14,53,Math.ceil(15-this.testElapsed)+'s',{scale:2,align:'right'});this.subtitleBox(ctx,'Ounce',hidden?'Eyes closed. You still have knees.':test==='Lean'?'Reach each orange target. Hold it gently.':test==='Chase'?'Follow the orange circle. It means well.':'Keep your dot in the circle. Then remember.');}
  else if(this.phase==='question'){const q=QUESTIONS[day-1];panel(h,W/2-170,48,340,151);text(h,W/2,64,q[0],{align:'center',maxWidth:310});for(let n=0;n<3;n++)this.button(ctx,'question-'+n,W/2-148,100+n*27,296,23,q[n+1],()=>{app.morningDone(this.testScore);this.age=g.ages.at(-1);this.phase='reveal';this.phaseT=0;app.voice.say(ctx,`Your Wobble Age is ${this.age}. I am so sorry.`,'Ounce');},this.select===n,true);this.subtitleBox(ctx,'Ounce','A short question for our records.');}
  else{panel(h,W/2-140,43,280,142);text(h,W/2,58,'YOUR WOBBLE AGE',{align:'center',color:C.grey});text(h,W/2,82,String(this.age),{align:'center',scale:6});text(h,W/2,137,'Is that close? No? I am so sorry.',{align:'center'});this.button(ctx,'morning-island',W/2-95,159,190,22,'A little free time',()=>app.go('hub').then(()=>app.say(dayData(g).who,dayData(g).line)),true,true);this.subtitleBox(ctx,'Ounce',day===7?'It is all graded.':Math.abs(this.age-this.faceAge)>10?'A number is only a number. I have several.':'Thank you. I have written that down.');}
  prompts(h,app,[['WASD','Lean'],['confirm','Continue']],12,H-17);
 }
 drawJoin(ctx){
  const h=ctx.hud,W=h.width,H=h.height,app=this.app,card=this.id==='card';badge(h,12,12,card?'AI HUB / THE MEDLEY':'FAMILY HOUR / THE MEDLEY');text(h,W/2,40,TITLE,{align:'center',scale:2});text(h,W/2,63,'Three classes. One politely contested podium.',{align:'center'});
  if(card){const c=app.net.card;for(let i=0;i<app.info.players.length;i++){const p=app.info.players[i],x=W/2+(i-(app.info.players.length-1)/2)*83;text(h,x,181,clean(p.name).slice(0,12),{align:'center',color:[C.red,0x3b82f6,0x22a55e,C.gold][i]});text(h,x,195,c.ready.includes(p.id)?'Ready.':'Finding feet.',{align:'center',color:C.grey});}text(h,W/2,88,c.paused?'A little more time.':c.left===null?'Lining up.':`Class begins in ${Math.ceil(c.left/1000)}s`,{align:'center',color:C.teal});this.button(ctx,'ready',W/2-115,H-52,110,24,'Ready',()=>globalThis.AIHub.answer('ready'),true,true);this.button(ctx,'more',W/2+5,H-52,110,24,'More time [M]',()=>globalThis.AIHub.answer('more'),false,true);text(h,W/2,H-16,'Lean: stick / WASD. Breathe: R2 / Space.',{align:'center',color:C.grey});}
  else{for(let i=0;i<4;i++){const p=app.family[i],x=W/2+(-1.5+i)*W*.18;text(h,x,181,p?p.name:'Open mat',{align:'center',color:p?C.teal:C.grey});text(h,x,196,p?p.type==='pad'?`Pad ${p.index+1}`:'Keyboard + mouse':'Press Cross to join',{align:'center',color:C.grey});}text(h,W/2,86,'Keyboard is on mat one. Pads: press Cross.',{align:'center',color:C.grey});this.button(ctx,'bots',12,H-52,150,23,`Fill bots: ${app.fillBots?'on':'off'}`,()=>{app.fillBots=!app.fillBots;},this.select===0,true);this.button(ctx,'start-medley',W/2-66,H-52,140,23,'Begin [Space]',()=>app.go('medley'),this.select===1,true);this.button(ctx,'join-back',W-87,H-52,75,23,'Back',()=>app.go('title').then(()=>app.mainMenu()),this.select===2,true);}
 }
 drawMedley(ctx){
  const h=ctx.hud,W=h.width,H=h.height,app=this.app;badge(h,12,12,`THE MEDLEY / EVENT ${this.eventIndex+1} OF 3`);text(h,12,34,this.data.name,{scale:2});text(h,W-12,18,Math.max(0,Math.ceil(MEDLEY.total-(this.medleyTime||0)))+'s',{align:'right',color:C.teal});
  if(this.phase==='podium'||app.net.resultSent){panel(h,W/2-155,58,310,H-87);text(h,W/2,70,'EVERYONE WAS NOTED',{align:'center',color:C.grey});const sorted=this.lanes.map(l=>({...l,score:this.totals[l.id]||0})).sort((a,b)=>b.score-a.score);for(let j=0;j<sorted.length;j++){const l=sorted[j];text(h,W/2-130,96+j*23,`${j+1}. ${l.name}`,{color:j===0?C.teal:C.ink,scale:1});text(h,W/2+130,96+j*23,String(l.score),{align:'right',scale:2});}text(h,W/2,198,'Stillest. Most apologetic. All present.',{align:'center',color:C.grey});if(!app.info){this.button(ctx,'rematch',W/2-130,H-54,125,23,'Rematch',()=>app.go('medley'),this.select===0,true);this.button(ctx,'medley-back',W/2+5,H-54,125,23,'Back',()=>app.go('title').then(()=>app.mainMenu()),this.select===1,true);}return;}
  if((this.medleyTime||0)<0){text(h,W/2,90,String(Math.ceil(-this.medleyTime)),{align:'center',scale:4});}
  else if(this.phase==='interval'){panel(h,W/2-115,67,230,40);text(h,W/2,78,'A moment to collect your feet.',{align:'center'});}
  else for(let i=0;i<this.lanes.length;i++){const l=this.lanes[i],p=this.dialPosition(i),r=l.run,packet=l.ghost?app.net.ghosts.get(l.id):null;dial(h,p.x,p.y,p.r,r?.dot||{x:packet?.x||0,y:packet?.y||0},r?.ring||.4);text(h,p.x,102,String(Math.round(r?.score||packet?.s||0)),{align:'center',color:C.teal});}
  for(let i=0;i<this.lanes.length;i++){const l=this.lanes[i],p=this.dialPosition(i);badge(h,p.x-measure(l.name)/2-6,H-65,l.name,l.local?C.teal:C.grey);}
  this.subtitleBox(ctx,'Ounce',this.phase==='interval'?'Next class in a moment. Nobody needs to rush.':this.data.kind==='hoop'?'Circle the stick or roll W-D-S-A. Keep the hoops up.':this.data.kind==='header'?'Head coconuts. Dodge footwear. Lean left and right.':'Stay in the circle. Same mats. Different interpretations.');prompts(h,app,[['WASD','Lean'],['Space','Breathe'],['F/J','Step']],12,H-17);
 }
 drawRecords(ctx){const h=ctx.hud,W=h.width,H=h.height,app=this.app,g=app.guest||guest(),a=ACTIVITIES[this.select],tab=this.recordTab||0;panel(h,20,24,W-40,H-52);badge(h,32,36,'HALL OF NUMBERS');
 if(tab===0){text(h,32,66,a.name,{scale:measure(a.name,2)>W-66?1:2});text(h,32,93,String(Math.round(g.records[a.id]||app.save.data.records[a.id]||0)),{scale:4});text(h,32,132,'Your personal best. Kept very carefully.',{color:C.teal,maxWidth:W-64});text(h,32,157,`Dennis ${Math.round(a.stars[0]*1.1)} / June ${Math.round(a.stars[1]*1.1)}`);text(h,32,174,`Marguerite ${Math.round(a.stars[2]*1.15)}`);}
 else if(tab===1){text(h,32,65,'Your week in wobble.',{scale:2});chart(h,50,107,W-100,66,g.ages);text(h,32,200,g.confessed?'An administrative correction: minus seven.':'Numbers delivered gently.',{color:C.teal});}
 else{const day=this.select%7,d=DAYS[day];text(h,32,67,`Day ${day+1} / ${day<g.day?'filed':day===g.day?'today':'ahead'}`,{scale:2});text(h,32,101,`Morning: ${d.test}`);text(h,32,122,d.goal,{maxWidth:W-70,color:C.teal});text(h,32,151,'New classes:');text(h,32,167,ACTIVITIES.filter(a=>a.day===day+1).map(a=>a.name).join(', ')||'Hard classes. Smaller circles.',{maxWidth:W-80});}
 if(tab!==1){this.button(ctx,'record-prev',W-135,36,40,16,'<',()=>{this.select=(this.select+ACTIVITIES.length-1)%ACTIVITIES.length;});this.button(ctx,'record-next',W-84,36,40,16,'>',()=>{this.select=(this.select+1)%ACTIVITIES.length;});}
 for(let j=0;j<3;j++)this.button(ctx,'record-tab-'+j,32+j*(W-64)/3,H-56,(W-70)/3,21,['Scores','Week chart','Calendar'][j],()=>{this.recordTab=j;},tab===j,true);prompts(h,app,[['back','Island'],['Q/E','Browse'],['Tab','View']],25,H-20);}
 drawEnding(ctx){
  const h=ctx.hud,W=h.width,H=h.height,g=this.app.guest||guest();panel(h,W/2-165,26,330,H-54);
  if(this.phase==='credits'){text(h,W/2,43,'EVERYTHING STARTS AT ZERO',{align:'center',color:C.teal});text(h,W/2,70,'You stood.',{scale:3,align:'center'});text(h,W/2,111,'With Coach Plumb, Marguerite, Dennis,',{align:'center'});text(h,W/2,127,'June, Kevin and one slightly better scale.',{align:'center'});text(h,W/2,151,'The island will be here tomorrow.',{align:'center',color:C.grey});this.button(ctx,'week-two',W/2-100,H-65,200,25,'Begin Week 2',()=>{g.day=7;this.app.endDay();},true,true);}
  else{const t=this.timeline?.time||0;const offset=clamp((t-9)/3)*7;badge(h,W/2-150,38,'AN ADMINISTRATIVE CORRECTION');chart(h,W/2-120,69,240,72,this.rawAges,offset);text(h,W/2,165,offset>0?'-7. Every number. Exactly.':'One small disclosure.',{align:'center',color:C.teal});const l=this.timeline?.line();if(l){text(h,W/2,190,l.who,{align:'center',color:C.teal});text(h,W/2,205,l.text,{align:'center',maxWidth:300});}this.button(ctx,'skip-ending',W-83,H-27,71,17,'Continue',()=>this.timeline.skip(),false,true);}
 }
 subtitleBox(ctx,who,s){const h=ctx.hud,W=h.width,H=h.height;panel(h,12,H-61,W-24,35,{shadow:false});ouncePortrait(h,30,H-43,10,this.uiTime);text(h,49,H-54,who,{color:C.teal});const rows=wrap(s,W-78);text(h,49,H-43,rows.slice(0,2).join('\n'),{leading:10});}
 drawDialogue(ctx){const d=this.app.dialogue,h=ctx.hud,W=h.width,H=h.height;panel(h,12,H-83,W-24,67);ouncePortrait(h,33,H-51,14,this.uiTime);text(h,58,H-71,d.who,{color:C.teal});const s=d.full?d.text:d.text.slice(0,Math.floor(d.elapsed*40));text(h,58,H-55,s,{maxWidth:W-85});text(h,W-26,H-28,'>',{color:C.teal,align:'right'});}
 button(ctx,id,x,y,w,height,label,fn,active=false,small=true){const ui=this.app.ui;ui.button(id,x,y,w,height,label,{active,small});const b=ui.buttons.at(-1),p=ctx.input.pointer,px=(p.x+1)*ctx.hud.width/2,py=(1-p.y)*ctx.hud.height/2;if(!this.app.menu&&!this.app.dialogue&&this.app.device.kind==='mouse'&&p.over&&px>=x&&py>=y&&px<=x+w&&py<=y+height){if(ctx.input.wasPressed('MouseLeft')){this.uiConsumed=true;fn();}}return b;}
 drawMenu(ctx){
  const app=this.app,m=app.menu;if(!m)return;const h=ctx.hud,W=h.width,H=h.height,i=ctx.input;app.ui.buttons=[];app.ui.rects=[];
  if(m.kind==='name'){const w=Math.min(324,W-24),x=W/2-w/2;panel(h,x,26,w,H-52);text(h,W/2,39,m.title,{align:'center',scale:1});text(h,W/2,63,(app.nameValue||'_').padEnd(8,'_'),{align:'center',scale:2,color:C.teal});const cw=(w-24)/6;for(let j=0;j<30;j++){const label=j<26?String.fromCharCode(65+j):j===26?'-':j===27?'Space':j===28?'Erase':'Done';app.ui.button('letter-'+j,x+12+j%6*cw,99+Math.floor(j/6)*23,cw-3,20,label,{active:m.selection===j,small:true});}this.menuMouse(ctx,m,j=>this.nameAction(j));return;}
  if(m.kind==='main'){
   const pw=Math.min(245,Math.floor(W*.51)),x=18,y=121,rh=Math.min(25,(H-145)/5);for(let n=0;n<m.rows.length;n++)app.ui.button('main-'+n,x,y+n*rh,pw-36,rh-2,m.rows[n].label,{active:m.selection===n,small:rh<24});this.menuMouse(ctx,m,j=>m.rows[j].action?.());return;
  }
  const side=['locker','avatar'].includes(m.kind),width=Math.min(W-24,side?W*.49:m.kind==='about'?400:356),x=side?12:(W-width)/2,top=23,height=H-47;
  panel(h,x,top,width,height);badge(h,x+12,top+11,m.kind==='dev'?'DESIGNER TOOLS':m.kind==='settings'?'YOUR PREFERENCES':m.kind==='about'?'ABOUT & CREDITS':'TARE ISLAND');
  text(h,x+12,top+35,m.title,{scale:measure(m.title,2)>width-24?1:2});
  if(m.pages>1){text(h,x+width-12,top+14,`${m.page+1}/${m.pages}`,{align:'right',color:C.grey});}
  let y=top+62;
  if(m.subtitle){text(h,x+12,y-5,m.subtitle,{color:C.grey,maxWidth:width-24});y+=15;}
  if(m.body){const lines=m.body.flatMap(s=>[...wrap(s,width-28),'']);const max=Math.max(1,Math.floor((height-94)/11));m.scroll=clamp(m.scroll||0,0,Math.max(0,lines.length-max));text(h,x+14,y-5,lines.slice(m.scroll,m.scroll+max).join('\n'),{leading:11});if(lines.length>max){text(h,x+width-13,H-63,`${m.scroll+1}-${Math.min(lines.length,m.scroll+max)}/${lines.length}`,{align:'right',color:C.grey});if(i.wheel)m.scroll=clamp(m.scroll+Math.sign(i.wheel)*2,0,lines.length-max);if(pressed(i,'down'))m.scroll=clamp(m.scroll+1,0,lines.length-max);if(pressed(i,'up'))m.scroll=clamp(m.scroll-1,0,lines.length-max);}y=H-59;}
  const available=H-40-y,rh=Math.min(25,available/Math.max(1,m.rows.length));
  for(let n=0;n<m.rows.length;n++){const r=m.rows[n],v=r.getValue?r.getValue():r.value;const label=r.label;app.ui.button('menu-'+n,x+12,y+n*rh,width-24,Math.max(16,rh-2),label,{active:m.selection===n,small:rh<28||measure(label,2)>width-70,disabled:r.disabled});if(r.range){const [min,max,step]=r.range,sx=x+width*.57,sw=width*.28;rect(h,sx,y+n*rh+15,sw,2,m.selection===n?C.line:C.mint);rect(h,sx+(v-min)/(max-min)*sw-1,y+n*rh+13,3,6,C.orange);const p=i.pointer,px=(p.x+1)*W/2,py=(1-p.y)*H/2;if(app.device.kind==='mouse'&&i.isDown('MouseLeft')&&px>=sx-3&&px<=sx+sw+3&&py>=y+n*rh&&py<=y+(n+1)*rh){const value=Math.round((min+clamp((px-sx)/sw)*(max-min))/step)*step;r.set?.(Math.round(value*1000)/1000);if(app.menu)app.menu.selection=n;}}if(v!==undefined)text(h,x+width-21,y+n*rh+6,typeof v==='boolean'?v?'on':'off':String(v)+(r.detail?' / '+r.detail.replace('default ',''):''),{color:m.selection===n?C.paper:C.teal,align:'right'});else if(r.detail&&rh>=23)text(h,x+width-20,y+n*rh+rh-10,r.detail,{color:m.selection===n?C.mint:C.grey,align:'right'});}
  this.menuMouse(ctx,m,j=>{const row=m.rows[j];if(!row.disabled){row.action?.();if(app.menu?.kind===m.kind)app.menu.selection=Math.min(j,app.menu.rows.length-1);}});
  if(m.pages>1){const cy=H-19;app.ui.button('page-left',x+10,cy-4,20,15,'<',{small:true});app.ui.button('page-right',x+width-30,cy-4,20,15,'>',{small:true});const p=ctx.input.pointer,px=(p.x+1)*W/2,py=(1-p.y)*H/2;if(i.wasPressed('MouseLeft')&&py>=cy-4&&py<=cy+11){if(px<x+32)m.tab?.(-1);else if(px>x+width-32)m.tab?.(1);}text(h,W/2,cy,'Q / E: tabs   Esc: back',{align:'center',color:C.grey});}
  else prompts(h,app,[['confirm','Choose'],['back','Back']],x+12,H-20);
 }
 menuMouse(ctx,m,activate){const app=this.app,p=ctx.input.pointer;if(app.device.kind!=='mouse'||!p.over)return;const px=(p.x+1)*ctx.hud.width/2,py=(1-p.y)*ctx.hud.height/2;const n=app.ui.hit(px,py);if(n>=0&&n<m.rows.length || m.kind==='name'&&n>=0){m.selection=n;if(ctx.input.wasPressed('MouseLeft')){ctx.audio.play('confirm');activate(n);}}}
 drawAttract(ctx){const h=ctx.hud,W=h.width;panel(h,W/2-155,5,310,27,{shadow:false,color:C.teal,edge:C.paper});text(h,W/2,10,TITLE+' / A LITTLE DEMONSTRATION',{align:'center',color:C.paper});text(h,W/2,21,'Press any button. Gently.',{align:'center',color:C.paper});}
 drawDebug(ctx){const h=ctx.hud,r=this.lanes.find(l=>l.local)?.run;panel(h,8,112,192,61,{shadow:false});text(h,13,118,this.status().slice(0,30),{color:C.teal});text(h,13,132,`Dot ${r?.dot.x.toFixed(2)||0}, ${r?.dot.y.toFixed(2)||0}`);text(h,13,145,`Ring ${r?.ring.toFixed(2)||0} / ${this.app.device.kind}`);text(h,13,158,`FPS ${Math.round(ctx.engine.state().fps||0)}`);}
 openLocker(){
  const app=this.app,g=app.guest||guest(),fields=[['hairStyle','Hair style',['cap','bun','cropped']],['skin','Skin',['sand','orange','red','plum']],['hair','Hair',['ink','orange','mist','plum']],['top','Top',['white','sky','teal','plum','cyan']],['bottom','Bottom',['sky','teal','navy','white']],['headband','Headband',['red','sky','white','sand']]];
  const rows=fields.map(([key,label,values])=>({label,value:g.look[key]||this.playerLook()[key],adjust:d=>{const v=g.look[key]||this.playerLook()[key];g.look[key]=values[(values.indexOf(v)+d+values.length)%values.length];app.save.write();this.changeAvatar(g.avatar);this.openLocker();},action:()=>{const r=app.menu.rows[app.menu.selection];r.adjust(1);}}));
  if(g.items.includes('Towel cape'))rows.push({label:'Towel cape',value:!!g.look.cape,action:()=>{g.look.cape=!g.look.cape;this.changeAvatar(g.avatar);app.save.write();this.openLocker();}});
  rows.push({label:'Back to the island',action:()=>app.go('hub')});app.setMenu('locker','The Locker Room',rows,{subtitle:`${g.items.length} jar rewards / appearances only`,back:()=>app.go('hub')});
 }
 status(){const r=this.lanes.find(l=>l.local)?.run;return `${this.id}${this.id==='activity'?' '+this.data.id:''} | ${this.phase} | t ${(r?.t||this.t).toFixed(1)} | score ${Math.round(r?.score||0)}`;}
 fingerprint(){return JSON.stringify([this.id,this.phase,Math.round(this.t*10000),this.lanes.filter(l=>!l.ghost).map(l=>l.run?.fingerprint()),this.hero?.body.translation(),this.app.guest?.drips]);}
 dispose(ctx){this.stopMirror?.();this.mirror?.dispose();if(this.originalGravity)ctx.physics.world.gravity=this.originalGravity;this.app.voice.stop();this.world?.sea?.dispose();this.jogWorld?.sea?.dispose();}
}
const SFX_TYPES=new Set(['in','out','rep','step','miss','bonk','thwap','catch','splash','gust','jump','fall']);
function appHasOverlay(app){return !!app.menu||!!app.dialogue;}
