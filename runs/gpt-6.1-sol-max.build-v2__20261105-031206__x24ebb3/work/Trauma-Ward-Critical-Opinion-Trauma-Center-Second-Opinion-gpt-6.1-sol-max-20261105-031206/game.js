// Mouse/WASD/stick aim; J/click/R2 use; 1-8/right stick tools;
// Q/R1 last tool; Space/L2 gift; Esc/Options pause.
import {Engine,THREE,withUrlOptions,LOOK_PRESETS} from './pixel-engine.js';
import {TITLE,SAVE_KEY} from './src/core/meta.js';
import {DEFAULTS,resetConfig} from './src/core/config.js';
import {SETTINGS_DEFAULTS,SETTINGS_KEY,readSettings,LOOK} from './src/core/settings.js';
import {OPS,CONSULT,opById} from './src/content/ops.js';
import {SCENES,REACTIONS} from './src/content/story.js';
import {createOp,step,enterStage,drainEvents,retryStage,results,finishOp,triggerBlue,spawnEntity,snapshotCore} from './src/sim/op.js';
import {botInput} from './src/sim/bot.js';
import {emptySave,readSave,recordResult} from './src/sim/campaign.js';
import {Devices} from './src/input/devices.js';
import {AudioDirector} from './src/audio/director.js';
import {FieldView} from './src/view/field.js';
import {HospitalView} from './src/view/hospital.js';
import {draw,aboutPages} from './src/ui/screens.js';
import {startSession} from './src/net/session.js';
const storage=()=>{try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}};
const write=(key,value)=>{try{storage()?.setItem(key,JSON.stringify(value));}catch{}};
const MENU_SCREENS=new Set(['title','main','difficulty','log','consult','settings','about']);
export class SurgicalDrama{
 name=TITLE;assets=[];
 constructor(network=null){
  this.network=network;this.settings=network?{...SETTINGS_DEFAULTS}:readSettings(storage());this.save=network?emptySave():readSave(storage(),SAVE_KEY);
  this.config={...DEFAULTS};this.devices=new Devices();this.screen=network?'card':'title';this.age=0;this.idle=0;this.focus=0;this.scroll=0;this.ui=[];this.entries=[];
  this.episode=0;this.beat=0;this.lineAge=0;this.comm='';this.commAge=0;this.popups=[];this.attract=false;this.attractIndex=0;this.attractAge=0;
  this.sim=null;this.simSpeed=1;this.simAccumulator=0;this.botPlays=false;this.botSkill=.7;this.devTab=0;this.devPage=0;this.devHitboxes=false;
  this.jumpOp=1;this.jumpStage=0;this.jumpScene=0;this.spawnKind='pool';this.settingsTab=0;this.aboutPage=0;this.logIndex=0;
  this.consultSources=['keyboard'];this.consultOp=0;this.sources=['auto'];this.isConsult=false;this.isReplay=false;this.isCampaign=false;
  this.fromOperation=false;this.resultAt=0;this.ghostAge=0;this.notice='';this.noticeAge=0;this.localSeat=0;
 }
 async setup(ctx){
  this.ctx=ctx;ctx.input.gamepadButtons={};ctx.input.preventKeys.add('Tab');ctx.input.preventKeys.add('F1');
  this.field=new FieldView(ctx);ctx.gameField=this.field;this.field.root.visible=false;
  this.hospital=new HospitalView();await this.hospital.init(ctx);this.hospital.set('or');
  this.audio=new AudioDirector(ctx.audio,this.settings);await this.audio.init();
  ctx.engine.setSunDirection([.25,1,.35]);this.fxRandom=ctx.random.fork('cosmetic');
  ctx.particles.register('blood',{count:[3,5],life:[.15,.35],speed:[.3,1],gravity:-4,size:[1,2],colors:['red','plum']});
  ctx.particles.register('sterile',{count:[5,8],life:[.2,.5],speed:[.3,1.2],gravity:-1,size:[1,1],colors:['cyan','white','sky']});
  if(typeof document!=='undefined'){
   this.contextMenu=e=>e.preventDefault();document.getElementById('app').addEventListener('contextmenu',this.contextMenu);this.installGate();
  }
  this.show(this.screen);this.applyLook();
  if(!this.network&&typeof location!=='undefined'){
   const f=new URLSearchParams(location.search);
   if(['Intern','Resident','Attending'].includes(f.get('diff')))this.settings.difficulty=f.get('diff');
   if(f.has('op')){const id=String(f.get('op')).startsWith('op')?f.get('op'):'op'+f.get('op');this.startOperation(opById(id),{replay:true,seed:Number(f.get('seed'))||7});
    if(f.has('stage'))enterStage(this.sim,Math.min(opById(id).stages.length-1,Math.max(0,Number(f.get('stage'))||0)));
    if(f.has('god'))this.sim.god=f.get('god')!=='0';this.botPlays=f.has('bot')&&f.get('bot')!=='0';if(f.has('dev'))this.show('dev');
   }
   if(f.has('scene'))this.startStory(Math.min(10,Math.max(0,Number(f.get('scene'))||0)));
   if(f.has('attract'))this.startAttract();
  }
 }
 ready(ctx){
  if(typeof window!=='undefined'){
   window.__GAME__={app:this,get sim(){return this.app.sim;},config:this.config,goto:(op,stage=0)=>{this.startOperation(opById('op'+op),{replay:true});enterStage(this.sim,stage);},step:(n=1)=>ctx.engine.step(n)};
   document.title=TITLE+' - The truth, stat.';
  }
  if(this.network)this.network.attach(this);
 }
 show(screen){
  const old=this.screen;this.screen=screen;this.focus=0;this.scroll=0;this.ui=[];this.entries=[];
  if(screen==='operation'||screen==='results'||screen==='pause'||screen==='dev'||screen==='settings'&&this.fromOperation){
   if(this.sim){this.field.root.visible=true;this.hospital.root.visible=false;this.hospital.hidePortraits();this.ctx.engine.sun.intensity=1;this.ctx.engine.ambient.intensity=.55;this.ctx.engine.ambient.color.setHex(0xfff0e0);}
  }else{
   this.field.root.visible=false;this.hospital.root.visible=true;this.hospital.hidePortraits();this.hospital.set(screen==='story'?SCENES[this.episode].set:'or',screen==='story');
  }
  if(screen==='story')this.setBeat();
  if(screen==='title'){this.fromOperation=false;this.isCampaign=false;this.isConsult=false;this.isReplay=false;this.idle=0;}
  if(screen==='main'){this.fromOperation=false;this.audio?.stop();}
  if(screen==='results'){this.resultAt=this.age;this.audio?.audio.play('stamp');if(this.settings.shake)this.ctx.engine.shake.add(.16);}
  if(screen!=='operation'&&old==='operation')this.audio?.audio.stopLoops();
 }
 newShift(d){this.settings.difficulty=d;this.save=emptySave();this.persistSave();this.persistSettings();this.startStory(0);}
 startStory(index){this.episode=index;this.beat=0;this.lineAge=0;this.fromOperation=false;this.isCampaign=true;this.show('story');}
 setBeat(){const b=SCENES[this.episode].beats[this.beat];this.lineAge=0;const other=SCENES[this.episode].beats[Math.max(0,this.beat-1)]?.who;this.hospital.portrait(b.who,b.emo,other===b.who?null:other);this.audio.say(b.who,b.say);}
 advanceStory(force=false){const scene=SCENES[this.episode];if(!force&&this.lineAge*38*this.settings.textSpeed<scene.beats[this.beat].say.length){this.lineAge=10;return;}this.beat++;if(this.beat>=scene.beats.length){this.audio.line=null;this.show(this.episode===10?'credits':'briefing');}else this.setBeat();}
 skipStory(){this.audio.line=null;this.show(this.episode===10?'credits':'briefing');}
 startOperation(def,{campaign=false,replay=false,consult=false,seats=1,seed=7}={}){
  this.isCampaign=campaign;this.isReplay=replay;this.isConsult=consult;this.fromOperation=true;this.botPlays=false;this.simSpeed=1;
  if(campaign)this.episode=def.n-1;const count=def.partner&&!consult?Math.max(2,seats):seats;
  this.sim=createOp(def,{seed,seats:count,difficulty:this.settings.difficulty,config:this.config,god:this.attract});
  this.sources=consult?this.consultSources.slice(0,count):Array.from({length:count},(_,i)=>i?'bot':'auto');
  this.field.setArena(def.arena);this.field.items.forEach(x=>{x.root.removeFromParent();x.tail.forEach(t=>t.removeFromParent());});this.field.items.clear();
  this.comm=def.stages[0].say;this.commAge=0;this.popups=[];this.show('operation');this.events();
 }
 retry(){retryStage(this.sim);this.comm=opById(this.sim.id).stages[this.sim.stage].say;this.show('operation');}
 restart(){const opts={campaign:this.isCampaign,replay:this.isReplay,consult:this.isConsult,seats:this.sim.seats.length,seed:this.sim.seed};this.startOperation(opById(this.sim.id),opts);}
 afterResults(){if(this.isConsult){this.openConsult();return;}if(this.isReplay){this.show('log');return;}this.startStory(this.episode===9?10:this.episode+1);}
 openConsult(){this.consultSources=this.devices.last==='pad'?[this.devices.lastPad]:['keyboard'];this.show('consult');}
 openSettings(from){this.settingsReturn=from;this.settingsTab=0;this.fromOperation=['pause','dev'].includes(from);this.show('settings');}
 openAbout(from){this.aboutReturn=from;this.aboutPage=0;this.fromOperation=false;this.show('about');}
 setting(k,value){this.settings[k]=value;this.ctx.audio.setVolume('music',this.settings.music);this.ctx.audio.setVolume('sfx',this.settings.sound);this.persistSettings();if(k==='look'||k==='pixelSize')this.applyLook();}
 applyLook(){let look=this.settings.look==='Noir'?structuredClone(LOOK_PRESETS.noir):this.settings.look==='Arcade'?structuredClone(LOOK_PRESETS.arcade):LOOK();if(look.actors?.pixel)look.actors.pixel.size=this.settings.pixelSize;if(look.environment?.pixel)look.environment.pixel.size=this.settings.pixelSize;this.ctx.engine.setLook(look);this.lastQuiet=false;}
 resetSettings(){Object.assign(this.settings,SETTINGS_DEFAULTS);this.audio.settings=this.settings;this.setting('music',.1);this.applyLook();}
 resetBalance(){resetConfig(this.config);if(this.sim){this.sim.god=false;this.sim.infiniteComposure=false;this.sim.freezeClock=false;this.sim.unlimitedMistakes=false;}this.simSpeed=1;this.botPlays=false;}
 unlockAll(){for(const op of OPS)this.save.cleared[op.id]||={rank:'C',total:0};this.save.next=10;this.save.quiet=true;this.save.look=true;this.persistSave();this.notice='ALL CASES UNLOCKED';this.noticeAge=3;}
 jumpOperation(){this.attract=false;this.startOperation(opById('op'+this.jumpOp),{replay:true});enterStage(this.sim,this.jumpStage);this.events();}
 completeStage(){enterStage(this.sim,this.sim.stage+1);this.events();this.show('operation');}
 forceOutcome(won){finishOp(this.sim,won,won?'':'DEVELOPER TRIGGER');this.show('operation');this.events();}
 devBlue(){triggerBlue(this.sim,true);this.show('operation');this.events();}
 devSpawn(){spawnEntity(this.sim,{k:this.spawnKind,x:0,z:0,strain:'introit',hp:2,required:false});this.show('operation');}
 copyOp(){if(typeof console!=='undefined')console.log(JSON.stringify(opById(this.sim.id),null,2));this.notice='OPERATION JSON WRITTEN TO CONSOLE';this.noticeAge=3;}
 frameStep(){step(this.sim,this.sim.seats.map((_,i)=>this.botPlays?botInput(this.sim,i,this.botSkill):{}));this.events();}
 persistSave(){if(!this.attract&&!this.network)write(SAVE_KEY,this.save);}
 persistSettings(){if(!this.attract&&!this.network)write(SETTINGS_KEY,this.settings);}
 fullscreen(){if(typeof document==='undefined')return;const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();p?.catch(()=>{});}
 startAttract(){if(this.network)return;this.attract=true;this.attractAge=0;this.attractIndex=-1;this.startStory(0);this.isCampaign=false;}
 attractSegment(){const reel=[OPS[0],OPS[1],OPS[2],OPS[3],OPS[4],OPS[5],OPS[6],OPS[7],CONSULT];this.attractAge=0;this.startOperation(reel[this.attractIndex%reel.length],{seats:this.attractIndex%reel.length===9?4:1});this.sim.god=true;this.sim.infiniteComposure=true;this.sim.unlimitedMistakes=true;this.botPlays=true;}
 stopAttract(){this.attract=false;this.botPlays=false;this.sim=null;this.audio.stop();this.show('title');this.idle=0;}
 fixedUpdate(ctx,dt){
  if(this.network){if(this.screen==='operation'&&!this.network.ended)this.network.localInput=this.inputFor(this.localSeat);return;}
  if(this.screen!=='operation'||!this.sim||this.devices.blocked&&!this.attract)return;
  this.simAccumulator+=dt*this.simSpeed;
  while(this.simAccumulator>=1/60){this.simAccumulator-=1/60;const inputs=this.sim.seats.map((seat,i)=>{const command=this.botPlays||this.sources[i]==='bot'?botInput(this.sim,i,this.botSkill):this.inputFor(i);if(this.attract&&this.sim.quietUnlocked&&seat.gift==='quiet'&&Math.floor(this.sim.elapsed)%10<2)command.gift=true;return command;});step(this.sim,inputs);if(this.sim.status!=='operating')break;}
 }
 inputFor(i){return this.devices.operation(this.ctx,this.sim,i,this.network?'auto':this.sources[i]??'auto',this.settings);}
 events(){
  if(!this.sim)return;const s=this.sim;
  for(const e of this.network?this.network.takeEvents():drainEvents(s)){
   this.audio.event(e);
   this.field.effect(e);
   if(e.type==='stage'){this.comm=e.say;this.commAge=0;if(s.id!=='op9')this.audio.say(opById(s.id).surgeon==='sabine'?'sabine':'reyes',e.say||'');}
   if(e.type==='reminder'){this.comm=e.say;this.commAge=0;this.audio.say('reyes',e.say||'');}
   if(e.type==='rating'){this.popups.push({x:e.x,z:e.z,label:e.quality,age:0});if(s.streak>0&&s.streak%8===0)this.speakReaction('clean');}
   if(e.type==='mistake'){this.popups.push({x:e.x,z:e.z,label:'MISTAKE',age:0});this.speakReaction('mistake');if(this.settings.shake)this.ctx.engine.shake.add(.12);this.ctx.particles.burst('blood',[e.x,1,e.z]);}
   if(e.type==='wrong')this.speakReaction('wrong');
   if(e.type==='rewind'){this.ghostAge=0;if(this.network&&e.ghost)s.ghost=e.ghost;if(!this.settings.reduceFlashes)this.ctx.engine.screen.flash(0x7cc6de,{duration:.24});}
   if(e.type==='shock'&&e.good){if(!this.settings.reduceFlashes)this.ctx.engine.screen.flash('white',{duration:.12});if(this.settings.shake)this.ctx.engine.shake.add(.35);if(this.settings.rumble)this.devices.rumble(.8,200);}
   if(e.type==='tether'||e.type==='complete'){if(this.settings.rumble)this.devices.rumble(.18,70);}
   if(e.type==='complete'&&['polyp','eye','plate'].includes(e.kind))this.ctx.particles.burst('sterile',[e.x,1.3,e.z]);
   if(e.type==='complete'&&e.kind==='hook'&&s.id==='op1'&&s.stage===1){const n=s.entities.filter(x=>x.k==='hook'&&x.done).length;this.comm=n===11?'ELEVEN. THAT SHOULD BE ALL OF THEM.':n+'. STEADY. FOLLOW THE CURVE.';this.commAge=0;this.audio.say('reyes',this.comm);}
   if(e.type==='saved'||e.type==='lost'){
    if(this.network)continue;if(this.attract){this.attractAge=26;continue;}
    if(e.type==='saved'&&this.isCampaign){recordResult(this.save,s);this.persistSave();}
    if(e.type==='lost'){this.save.failures++;if(!this.isReplay&&!this.isConsult)this.persistSave();}
    if(s.id==='op9'&&e.type==='saved'){this.comm='...YOUR SUTURES ARE CROOKED, DOCTOR.';this.audio.say('reyes',this.comm);}this.show('results');
   }
  }
 }
 speakReaction(kind){if(this.sim.id==='op9'||this.commAge<3)return;const pool=REACTIONS[kind];this.comm=pool[(this.sim.actions+this.sim.mistakes)%pool.length];this.commAge=0;this.audio.say('reyes',this.comm);}
 inputUI(nav){
  const input=this.ctx.input;if(nav.up)this.focus=(this.focus-1+this.entries.length)%Math.max(1,this.entries.length);if(nav.down)this.focus=(this.focus+1)%Math.max(1,this.entries.length);
  if(input.wheel&&this.screen!=='operation'&&this.entries.length)this.focus=(this.focus+Math.sign(input.wheel)+this.entries.length)%this.entries.length;
  const hit=this.ui.find(r=>{const px=(input.pointer.x+1)/2*this.ctx.hud.width,py=(1-input.pointer.y)/2*this.ctx.hud.height;return input.pointer.over&&px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h;});
  if(hit&&this.devices.last==='mouse'&&this.devices.mouseMoved&&hit.index!=null)this.focus=hit.index;
  if(hit&&input.wasPressed('MouseLeft','Touch')){if(hit.index!=null)this.focus=hit.index;const e=hit.entry;if(e.adjust&&e.slider){const px=(input.pointer.x+1)/2*this.ctx.hud.width;const target=Math.max(0,Math.min(1,(px-hit.x)/hit.w));e.adjust(target>e.slider()?1:-1);}else if(!e.disabled){e.action?.();if(!e.action)e.adjust?.(1);}this.ctx.audio.play('confirm');return;}
  const e=this.entries[this.focus];if(!e||e.disabled)return;
  if(nav.left||nav.right){e.adjust?.(nav.right?1:-1);this.ctx.audio.play('move');}
  if(nav.confirm){e.action?.();if(!e.action)e.adjust?.(1);this.ctx.audio.play('confirm');}
  if(nav.up||nav.down)this.ctx.audio.play('move');
 }
 update(ctx,dt){
  this.age+=dt;this.lineAge+=dt;this.commAge+=dt;this.ghostAge+=dt;this.noticeAge-=dt;this.devices.poll(ctx.input);
  if(this.devices.activity)this.idle=0;else this.idle+=dt;if(this.gate)this.gate.hidden=!this.devices.blocked;
  if(this.swallowInput){const held=ctx.input.state().held.length||this.devices.pads.some(p=>p.buttons.some(b=>b.pressed||b.value>.2)||p.axes.some(x=>Math.abs(x)>.2));if(!held)this.swallowInput=false;draw(this);return;}
  if(this.attract&&this.devices.activity){this.stopAttract();this.swallowInput=true;this.devices.mouseMoved=false;draw(this);return;}
  if(this.devices.blocked&&this.screen!=='settings'&&!this.attract&&this.idle>=10)this.startAttract();
  const nav=this.devices.navigation(ctx.input,this.age);
  if(this.network){
   this.sim=this.network.sim;
   if(this.network.ended)this.audio.stop();
   else if(this.screen==='card'){
    if(nav.confirm)AIHub.answer('ready');if(ctx.input.wasPressed('MouseLeft','Touch'))this.inputUI({...nav,confirm:false});
    if(ctx.input.wasPressed('KeyM')||this.devices.pressed(3))AIHub.answer('more');if(this.network.started&&AIHub.time()>=0){this.fromOperation=true;this.show('operation');}
   }else this.network.updateClient(dt);
  }else if(!this.devices.blocked||this.screen==='settings'){
   if(this.screen==='title'){if(this.devices.activity){this.show('main');this.idle=0;}}
   else if(this.screen==='story'){if(nav.back)this.skipStory();else if(nav.confirm||ctx.input.wasPressed('MouseLeft'))this.advanceStory();}
   else if(this.screen==='briefing'){if(nav.back)this.startStory(this.episode);else if(nav.confirm||ctx.input.wasPressed('MouseLeft'))this.startOperation(OPS[this.episode],{campaign:true});}
   else if(this.screen==='operation'){if(ctx.input.wasPressed('Escape')||this.devices.pressed(9)){this.fromOperation=true;this.show('pause');}else if(ctx.input.wasPressed('MouseLeft'))this.inputUI({...nav,confirm:false});}
   else if(this.screen==='about'){
    if(nav.back)this.show(this.aboutReturn||'main');else if(this.aboutPage>=0){if(nav.prev||nav.left)this.aboutPage=(this.aboutPage-1+aboutPages().length)%aboutPages().length;if(nav.next||nav.right||nav.confirm)this.aboutPage=(this.aboutPage+1)%aboutPages().length;this.inputUI({...nav,confirm:false});}
   }else if(this.screen==='credits'){if(nav.back)this.show('title');if(nav.confirm)this.openAbout('credits');}
   else{
    if(nav.back){if(this.screen==='pause')this.show('operation');else if(this.screen==='dev')this.show('pause');else if(this.screen==='settings')this.show(this.settingsReturn||'main');else this.show('main');}
    else{
     if(this.screen==='dev'&&(nav.prev||nav.next)){this.devTab=(this.devTab+(nav.next?1:-1)+5)%5;this.focus=0;this.scroll=0;}
     if(this.screen==='settings'&&(nav.prev||nav.next)){this.settingsTab=(this.settingsTab+(nav.next?1:-1)+4)%4;this.focus=0;this.scroll=0;}
     if(this.screen==='log'&&(nav.prev||nav.next))this.logIndex+=nav.next?1:-1;
     if(this.screen==='consult')for(const p of this.devices.pads){if(this.devices.pressed(0,p.index)&&!this.consultSources.includes(p.index)&&this.consultSources.length<4){this.consultSources.push(p.index);nav.confirm=false;}if(this.devices.pressed(1,p.index)&&this.consultSources.length>1)this.consultSources=this.consultSources.filter(x=>x!==p.index);}
     this.inputUI(nav);
    }
   }
  }
  if(!this.network&&MENU_SCREENS.has(this.screen)&&this.idle>=10&&!this.attract)this.startAttract();
  if(this.attract){this.attractAge+=dt;if(this.attractIndex<0){if(this.attractAge>3*(this.beat+1)&&this.beat<2)this.advanceStory(true);if(this.attractAge>9){this.attractIndex=0;this.attractSegment();}}else if(this.attractAge>27){this.attractIndex++;this.attractSegment();}}
  if(this.sim){
   this.events();this.popups.forEach(p=>p.age+=dt);this.popups=this.popups.filter(p=>p.age<.8);if(this.field.root.visible)this.field.update(this.sim,dt);
   if(this.screen==='operation'&&this.sim.quiet!==this.lastQuiet&&this.settings.look==='Surgical'){this.lastQuiet=this.sim.quiet;this.ctx.engine.setLook(LOOK(this.sim.quiet?.2:1,this.sim.quiet?.52:.28,this.sim.quiet?.15:0));}
  }
  this.camera();this.hospital.update(dt,this.age,this.audio.line!=null);if(!this.network?.ended)this.audio.update(dt,this.screen,this.sim);draw(this);this.devices.mouseMoved=false;
  if(typeof document!=='undefined')document.getElementById('app').style.cursor=this.screen==='operation'&&!this.devices.blocked?'none':this.devices.last==='pad'?'none':'default';
 }
 camera(){
  const camera=this.ctx.camera.camera,aspect=this.ctx.hud.width/this.ctx.hud.height;
  if(this.field.root.visible&&this.sim){const ratio=Math.max(1,(16/9)/aspect),seat=this.sim.seats[this.localSeat]||this.sim.seats[0];camera.position.set(seat.x*.012,9.6*ratio,3.1*ratio);camera.lookAt(0,.1,.1);}
  else if(this.screen==='story'){const ratio=Math.max(1,1.45/aspect);camera.position.set(.2,1.65,7.2*ratio);camera.lookAt(0,1.45,0);}
  else{camera.position.set(10+Math.sin(this.age*.08)*.3,6.7,11+Math.cos(this.age*.08)*.3);camera.lookAt(1.2,1.4,-.4);}camera.updateMatrixWorld();
 }
 installGate(){if(!this.devices.touchOnly)return;const g=document.createElement('div');g.className='controller-gate';g.innerHTML='<div><span class="gate-cross">+</span><strong>Controller or keyboard required</strong><p>Connect a controller or keyboard to scrub in.<br>The demonstration will begin automatically.</p></div>';document.body.append(g);this.gate=g;}
 status(){const s=this.sim;return s?`${this.screen} ${s.id} stage=${s.stage+1} vitals=${Math.round(Math.min(...s.vitals))} t=${Math.ceil(s.remaining)} score=${s.score}${this.attract?' DEMO':''}`:this.screen;}
 cameraTarget(){return this.target||(this.target=new THREE.Vector3(0,1,0));}
 fingerprint(){return JSON.stringify({screen:this.screen,sim:this.sim?snapshotCore(this.sim):null,beat:this.beat,episode:this.episode});}
 snapshot(){return{screen:this.screen,sim:this.sim?structuredClone(this.sim):null,save:structuredClone(this.save),episode:this.episode,beat:this.beat,age:this.age};}
 restore(ctx,state){Object.assign(this,state);if(this.sim)this.sim.config=this.config;this.show(state.screen);}
 dispose(){this.devices.dispose();this.audio.stop();this.hospital.dispose();this.field.dispose();this.gate?.remove();if(this.contextMenu)document.getElementById('app')?.removeEventListener('contextmenu',this.contextMenu);}
}
export const createGame=()=>new SurgicalDrama();
export async function boot(){
 let network=null;if(window.AIHub?.active){network=await startSession();if(network?.info.server)return;}
 if(!navigator.gpu){if(network){AIHub.fail('WebGPU unavailable');return;}const {fallback}=await import('./src/ui/fallback.js');fallback();return;}
 const game=new SurgicalDrama(network);
 try{await Engine.start(game,withUrlOptions({container:document.getElementById('app'),aspect:'fill',touch:false,touchBar:false,
  settings:{button:game.devices.touchOnly?'top-right':false,key:network?false:'critical-opinion'},camera:{preset:'fixed',position:[10,6.7,11],target:[1.2,1.4,-.4],fov:44,minZoom:1,maxZoom:1},
  background:0x101d2c,look:LOOK(),record:18000,quality:'medium'}));}
 catch(error){if(network){AIHub.fail('WebGPU could not start');return;}const {fallback}=await import('./src/ui/fallback.js');fallback(String(error.message||error));}
}
if(typeof document!=='undefined')await boot();
