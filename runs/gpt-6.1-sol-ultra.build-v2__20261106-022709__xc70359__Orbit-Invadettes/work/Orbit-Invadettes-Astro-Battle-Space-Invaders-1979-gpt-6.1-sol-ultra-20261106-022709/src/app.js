import {createWorld,stepWorld,repairPreview,startEncounter,setTuning,resetTuning,spawnEnemy,spawnSaucer,leaveSeat,clearShot} from './sim.js';
import {DIFFICULTIES,TUNING,tuningForDifficulty} from './content.js';
import {createAssets} from './assets.js';
import {createAudio} from './audio.js';
import {createView} from './view.js';
import {Interface} from './ui.js';
import {connectSession} from './session.js';
import REPORT from '../report.json';

const E=globalThis.My3D2dge;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const keymap={
 up:['KeyW','ArrowUp','Pad12','PadAxisUp'],down:['KeyS','ArrowDown','Pad13','PadAxisDown'],
 left:['KeyA','ArrowLeft','Pad14','PadAxisLeft'],right:['KeyD','ArrowRight','Pad15','PadAxisRight'],
 fire:['Space','Mouse0','Pad0','Pad7'],repair:['KeyQ','Mouse2','Pad4','Pad2'],
 confirm:['Enter','Space','Pad0'],cancel:['Escape','Backspace','Pad1'],start:['Enter','Pad9'],pause:['Escape','Pad9'],
 halves:{left:{fire:['Space'],repair:['KeyQ'],confirm:['Enter'],start:['Enter'],pause:['Escape'],cancel:['Escape']},right:{fire:['Period','Numpad1'],repair:['Slash','Numpad2'],pause:['Backspace'],start:['Digit2'],confirm:['Enter','NumpadEnter'],cancel:['Backspace']}}
};
export class App{
 constructor(){
  this.report=REPORT;this.playerCount=1;this.difficulty=1;this.primary='keyboard';this.idle=0;this.speed=1;this.invulnerable=false;this.overlays=false;this.spawnType='ordinary';this.drain=0;this.wakeUntil=0;this.noticeTime=0;this.pointerTarget=null;this.touchContacts=new Map();this.padHistory=new Map();this.padWakeBlocked=false;this.activeRun=false;this.session=null;this.attractAge=0;this.attractSegment=-1;this.recorded=false;this.resultDelay=null;this.lobby=false;this.silenced=false;
  this.game=new E.Game({id:'orbit-invadettes-v1',canvas:'screen',res:[480,270],expand:true,view:'overhead',views:['overhead'],input:keymap,menu:false,corner:false,fullscreen:false,autoPause:false,backGesture:false,bg:'#07141e',draw:true});
  this.game.cam.smooth=0;this.game.focus(240,135,0);this.game.input.touchEnabled=false;this.game.input.touchButtons([]);
  const S=this.game.settings;
  S.set('touch','off');
  for(const [key,value] of [['music',.1],['glyphs','playstation']])S.define({...S.spec(key),key,value});
  S.define({key:'voice',label:'Alien voices',group:'Sound',type:'slider',value:1,min:0,max:1,step:.05,apply:(g,v)=>{g.audio.voiceVolume=v;g.audio.applyVolume();}});
  S.define({key:'touchAssist',label:'Touch auto-fire',group:'Touch',value:true});
  this.world=createWorld({seed:101});this.titleWorld=createWorld({seed:101});this.world=this.titleWorld;
  for(const t of TUNING)S.define({key:'dev_'+t.key,label:t.label,group:'Balance',type:'slider',value:t.default,min:t.min,max:t.max,step:t.step,help:t.description,apply:(_g,v)=>{if(this.ui?.screen==='dev'&&!this._syncTuning&&!this.session)setTuning(this.world,t.key,v);}});
  this.assets=createAssets(E);this.audio=createAudio(this.game);this.view=createView(E,this.game,this.assets);
  this.records=this.loadRecords();this.ui=new Interface(this,REPORT);this.ui.render();
  this.bindEvents();
  this.game.debug={snapshot:()=>({scene:this.ui.screen,world:JSON.parse(JSON.stringify(this.world)),primary:this.primary,session:this.session?.diagnostics,idle:this.idle,records:this.records.length}),state:()=>this.world};
  this.game.start({scene:'cabinet',scenes:{cabinet:{pausable:false,camera:{zoom:false},update:dt=>this.update(dt),draw:r=>this.draw(r),back:()=>{if(this.ui.screen!=='play')this.ui.activate('back');else this.openPause();return true;}}}});
  this.game.fadeTime=0;
  globalThis.__OI=this;globalThis.__game=this.game;
 }
 async connect(){
  this.session=await connectSession({
   createWorld,stepWorld,leaveSeat,
   onWorld:w=>{this.world=w;this.activeRun=true;this.game.allowJoin(false);},
   onEvents:events=>this.present(events),
   onStart:()=>{this.activeRun=true;this.ui.show('play');this.clearInput();},
   onEnd:({reason,world})=>{this.sessionEndReason=reason;if(world)this.world=world;this.silenced=true;this.audio.stop();this.touchContacts.clear();this.ui.show('results');this.notify(reason==='host-left'?'HOST DEPARTED · ROUND VOID':reason==='time-up'?'TIME EXPIRED':'ROUND COMPLETE');}
  });
  if(this.session){
   this.activeRun=true;this.ui.show(this.session.phase==='playing'?'play':'hub-wait');this.idle=0;this.clearInput();
  }
 }
 loadRecords(){
  try{
   const r=JSON.parse(localStorage.getItem('orbit-invadettes-records-v1')||'null');
   if(r?.version===1&&Array.isArray(r.records))return r.records.filter(x=>x&&Number.isFinite(x.score)&&x.score>=0&&typeof x.mode==='string'&&typeof x.difficulty==='string').slice(0,60);
  }catch(_){}
  return [];
 }
 saveRecord(){
  if(this.recorded||this.session||this.ui.screen==='attract')return;
  this.recorded=true;const w=this.world;
  this.records.push({score:w.score,mode:w.players.length>1?'Co-op':'Solo',difficulty:DIFFICULTIES[w.difficulty].name,assisted:!!w.assisted,won:w.status==='victory',time:Math.round(w.time)});
  this.records.sort((a,b)=>b.score-a.score);this.records=this.records.slice(0,60);
  try{localStorage.setItem('orbit-invadettes-records-v1',JSON.stringify({version:1,records:this.records}));}catch(_){}
 }
 menuPrompt(){
  return this.primary==='gamepad'?(this.game.settings.glyphs==='xbox'?'D-pad + A select · B back':'D-pad + Cross select · Circle back'):this.primary==='touch'?'Tap to choose · drag to defend':'Arrows + Enter · mouse to choose';
 }
 clearInput(){
  for(const I of this.game.players)I.clear();
  this.pointerTarget=null;this.touchContacts.clear();this.drain=.16;this.repairQueued=false;
 }
 activity(device){
  this.idle=0;
  if(device&&['keyboard','gamepad','touch','pointer','mouse'].includes(device)){
   const newDevice=device==='mouse'?'pointer':device;
   if(newDevice!==this.primary){this.primary=newDevice;const prompt=typeof document!=='undefined'?document.getElementById('menu-prompt'):null;if(prompt)prompt.textContent=this.menuPrompt();if(this.ui?.screen==='controls')this.ui.render();}
  }
  if(this.ui?.screen==='attract'){
   this.wakeUntil=performance.now()+450;this.padWakeBlocked=device==='gamepad';this.toTitle();this.ui.lock=.45;return true;
  }
  return false;
 }
 notify(message){
  this.notice=message;this.noticeTime=2.6;
  if(typeof document!=='undefined'){const n=document.getElementById('notice');n.textContent=message;n.style.opacity='1';}
 }
 point(e){
  const rect=this.game.screen.canvas.getBoundingClientRect();
  return {x:(e.clientX-rect.left)/rect.width*this.game.W-(this.game.W-480)/2,y:(e.clientY-rect.top)/rect.height*this.game.H-(this.game.H-270)/2};
 }
 bindEvents(){
  if(typeof window==='undefined')return;
  const c=this.game.screen.canvas;
  const actual=(e,device)=>{
   if(!e.isTrusted&&!e.__testReal)return false;
   const woke=this.activity(device);
   if(!this.silenced)this.audio.unlock();
   if(woke){e.preventDefault();e.stopImmediatePropagation();return true;}
   return false;
  };
  window.addEventListener('keydown',e=>{
   if(actual(e,'keyboard'))return;
   if(e.code==='Tab'){this.idle=0;return;}
   if(e.target.tagName==='INPUT')return;
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','Escape','Backspace'].includes(e.code))e.preventDefault();
   if(e.code==='KeyA'||e.code==='KeyD'||e.code==='ArrowLeft'||e.code==='ArrowRight')this.pointerTarget=null;
  },{capture:true});
  window.addEventListener('pointerdown',e=>{
   if(actual(e,e.pointerType==='touch'?'touch':'pointer'))return;
  },{capture:true});
  window.addEventListener('pointermove',e=>{
   if(e.movementX||e.movementY)actual(e,e.pointerType==='touch'?'touch':'pointer');
  },{capture:true});
  c.addEventListener('contextmenu',e=>e.preventDefault());
  c.addEventListener('pointermove',e=>{
   if(this.ui.screen!=='play'||performance.now()<this.wakeUntil)return;
   const pt=this.point(e);
   if(e.pointerType==='touch'){
    const q=this.touchContacts.get(e.pointerId);if(q){q.x=pt.x;q.y=pt.y;if(q.role==='move')this.pointerTarget=clamp(q.shipX+pt.x-q.startX,18,462);}
   }else if(pt.x>=16&&pt.x<=464&&pt.y>=30&&pt.y<=258&&(e.movementX||e.movementY))this.pointerTarget=pt.x;
  });
  c.addEventListener('pointerdown',e=>{
   if(this.ui.screen!=='play'||performance.now()<this.wakeUntil)return;
   const pt=this.point(e);
   if(e.pointerType==='touch'){
    e.preventDefault();try{c.setPointerCapture(e.pointerId);}catch(_){}
    const seat=this.session?.seat??0,ship=this.world.players[seat];
    const role=this.touchContacts.size===0?'move':'fire';
    this.touchContacts.set(e.pointerId,{role,startX:pt.x,x:pt.x,y:pt.y,shipX:ship?.x??240});
   }
  });
  const release=e=>{
   if(e.pointerType==='touch'){const role=this.touchContacts.get(e.pointerId)?.role;this.touchContacts.delete(e.pointerId);if(role==='move')this.pointerTarget=null;try{c.releasePointerCapture(e.pointerId);}catch(_){}}
  };
  c.addEventListener('pointerup',release);c.addEventListener('pointercancel',release);c.addEventListener('lostpointercapture',release);
  const pb=document.getElementById('pause-button'),rb=document.getElementById('repair-button');
  pb.addEventListener('click',e=>{e.stopPropagation();if(performance.now()>=this.wakeUntil)this.openPause();});
  rb.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.activity(e.pointerType==='touch'?'touch':'pointer');this.repairQueued=true;});
  window.addEventListener('blur',()=>{this.clearInput();if(!this.session&&this.ui.screen==='play')this.openPause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clearInput();if(!this.session&&this.ui.screen==='play')this.openPause();}});
  window.addEventListener('resize',()=>{this.touchContacts.clear();this.pointerTarget=null;});
 }
 pollPads(){
  let pads=[];try{pads=Array.from(navigator.getGamepads?.()||[]);}catch(_){}
  let neutral=true;
  for(const p of pads){
   if(!p||p.connected===false)continue;
   const vals=[...p.axes,...p.buttons.map(b=>b.value??(b.pressed?1:0))];
   const old=this.padHistory.get(p.index)||vals.map(()=>0);
   const significant=vals.some((v,i)=>Math.abs(v)>.26&&Math.abs(v-(old[i]??0))>.16);
   if(vals.some(v=>Math.abs(v)>.24))neutral=false;
   if(significant){this.activity('gamepad');if(!this.silenced)this.audio.unlock();}
   this.padHistory.set(p.index,vals);
  }
  if(neutral)this.padWakeBlocked=false;
 }
 configureRoster(){
  this.game.allowJoin(false);
  if(this.playerCount===1){while(this.game.players.length>1)this.game.removePlayer(2);this.game.input.pad='any';return;}
  if(this.game.players.length>1)return;
  let pads=[];try{pads=Array.from(navigator.getGamepads?.()||[]).filter(p=>p&&p.connected!==false);}catch(_){}
  if(pads.length>=2){
   const p1=pads.find(p=>p.index===this.game.input.padIndex)||pads[0];this.game.input.pad=p1.index;
   this.game.addPlayer({pad:pads.find(p=>p.index!==p1.index).index});
  }else if(pads.length===1){
   this.game.input.pad='any';this.game.addPlayer({pad:pads[0].index});
  }else this.game.addPlayer({keys:'right'});
 }
 startRun(seed){
  if(this.session)return;
  this.audio.stop();this.silenced=false;this.speed=1;this.invulnerable=false;this.overlays=false;this.game.timeScale=1;this.game.hitstop=0;this.game.resume();this.configureRoster();
  if(!Number.isFinite(seed)){const a=new Uint32Array(1);crypto.getRandomValues(a);seed=a[0];}
  this.world=createWorld({seed,players:this.playerCount,difficulty:this.difficulty});
  this.activeRun=true;this.recorded=false;this.resultDelay=null;this.titleWorld=null;this.view.reset();this.ui.show('play');this.idle=0;this.audio.location(this.world);this.syncTuning();
 }
 toTitle(){
  if(this.session)return;
  this.game.allowJoin(false);this.lobby=false;this.activeRun=false;this.audio.stop();this.silenced=false;this.speed=1;this.invulnerable=false;this.overlays=false;this.game.timeScale=1;this.game.hitstop=0;this.game.resume();
  while(this.game.players.length>1)this.game.removePlayer(2);
  this.game.input.pad='any';this.titleWorld=createWorld({seed:101});this.world=this.titleWorld;this.view.reset();this.ui.parent='title';this.ui.show('title');this.idle=0;
 }
 openPause(){
  if(this.ui.screen!=='play'||this.session?.ended)return;
  this.ui.show('pause');this.audio.effect('select');this.audio.location(this.world);
 }
 resetSettings(){
  for(const group of ['Sound','Comfort','Controller','Touch'])this.game.settings.reset(group);
  this.game.settings.set('music',.1);this.game.settings.set('touch','off');this.game.settings.set('touchAssist',true);this.notify('PREFERENCES RESET · MUSIC 10%');
 }
 fullscreen(){
  const fs=this.game.fullscreen;
  if(!fs.supported){this.notify('FULL SCREEN IS UNAVAILABLE IN THIS BROWSER');return;}
  fs.toggle().then(ok=>{if(!ok)this.notify('BROWSER DECLINED FULL SCREEN');});
 }
 syncTuning(){
  this._syncTuning=true;
  for(const t of TUNING)this.game.settings.set('dev_'+t.key,this.world.tuning[t.key]);
  this._syncTuning=false;
 }
 tune(key,value){if(this.session){this.notify('WORLD CONTROLS ARE DISABLED IN AI HUB');return;}this.game.settings.set('dev_'+key,value);}
 devAction(id,dir=1){
  const w=this.world;
  if(id==='overlay'){this.overlays=!this.overlays;return;}
  if(this.session){this.notify('WORLD CONTROLS ARE DISABLED IN AI HUB');return;}
  w.assisted=true;
  if(id==='invincible'){this.invulnerable=!this.invulnerable;w.invulnerable=this.invulnerable;}
  if(id==='reserve')w.reserve++;
  if(id==='charges')w.players.forEach(p=>p.charges=3);
  if(id==='encounter')startEncounter(w,(w.encounter+dir+7)%7);
  if(id==='phase'){
   if(w.encounter!==6)startEncounter(w,6);
   else if(w.boss.phase===1){w.boss.emitters.forEach(e=>e.hp=0);w.boss.phase=2;w.boss.phaseTime=0;w.boss.open=true;w.boss.attackTimer=4;}
   else startEncounter(w,6);
  }
  if(id==='restartEncounter')startEncounter(w,w.encounter);
  if(id==='spawnType'){const list=['ordinary','armour','bombardier','saucer'];this.spawnType=list[(list.indexOf(this.spawnType)+dir+list.length)%list.length];}
  if(id==='spawn'){if(this.spawnType==='saucer')spawnSaucer(w);else if(w.encounter<6)spawnEnemy(w,this.spawnType);else this.notify('FORMATION ENEMIES REQUIRE A FORMATION');}
  if(id==='time'){const list=[0,.25,.5,1,2];this.speed=list[(list.indexOf(this.speed)+dir+list.length)%list.length];}
  if(id==='step'){stepWorld(w,[],1/120);this.present(w.events);}
  if(id==='seed'){
   const val=document.getElementById('seed-input')?.value.trim();
   if(!/^\d{1,10}$/.test(val||'')){this.notify('ENTER A WHOLE NUMBER SEED');return;}
   const seed=Number(val)>>>0;this.startRun(seed);this.world.assisted=true;this.ui.show('dev',{parent:'pause'});
  }
  if(id==='resetTuning'){resetTuning(w);this.syncTuning();}
 }
 stateSummary(){
  const w=this.world;
  return 'SEED '+w.seed+'  TICK '+w.tick+'  EPOCH '+w.epoch+'\n'+
   'ENCOUNTER '+(w.encounter+1)+'  '+w.status.toUpperCase()+'  ENEMIES '+w.enemies.length+'  SHOTS '+w.bullets.length+'\n'+
   'RESERVE '+w.reserve+'  SCORE '+w.score+'  '+(this.session?JSON.stringify(this.session.diagnostics):'LOCAL AUTHORITY · '+this.speed+'×');
 }
 sampleSeat(I,index){
  const p=this.world.players[this.session?.seat??index];
  let move=I.move()[0];
  if(index===0&&Math.abs(move)>.05)this.pointerTarget=null;
  let fire=I.down('fire'),repair=I.pressed('repair');
  if(index===0){
   if(this.pointerTarget!==null&&Math.abs(move)<.05)move=0;
   const touch=[...this.touchContacts.values()];
   const intentional=touch.some(t=>t.role==='fire');
   if(touch.length&&p){
    fire=intentional||(this.game.settings.touchAssist&&clearShot(this.world,p.x));
   }
   if(this.repairQueued){repair=true;this.repairQueued=false;}
  }
  return {move,fire,repair,...(index===0&&this.pointerTarget!==null?{targetX:this.pointerTarget}:{})};
 }
 present(events){
  if(!events?.length)return;
  this.view.events(events);
  if(!this.silenced)this.audio.events(events,this.world);
  for(const e of events){
   if(e.type==='feedback')this.notify(e.text);
   if(e.type==='saucer'&&this.activeRun)this.notify('BONUS SAUCER · EXTRA SALVAGE');
   if(e.type==='extra')this.notify('1,000 POINTS · EXTRA DEPLOYMENT');
   if(e.type==='stage'&&this.activeRun&&!this.session?.ended)this.notify(e.encounter===6?'HOSTILE FLAGSHIP · BREAK BOTH EMITTERS':['TIDAL OUTPOST','EMBER FOUNDRY','AURORA CITADEL'][e.location]+' · WAVE '+(e.encounter+1));
   if(e.type==='loss'&&!this.game.settings.motion&&this.game.settings.shake>0)this.game.shake(1.4*this.game.settings.shake);
  }
 }
 startAttract(){
  if(this.session)return;
  this.activeRun=false;this.attractAge=0;this.attractSegment=-1;this.audio.stop();this.view.reset();this.ui.show('attract');
 }
 updateAttract(dt){
  this.attractAge+=dt;const seg=Math.floor(this.attractAge/12)%7;
  if(seg!==this.attractSegment){
   this.attractSegment=seg;this.world=createWorld({seed:700+seg,players:seg>=4?2:1,difficulty:1});this.world.invulnerable=true;this.world.assisted=true;this.world.players.forEach(p=>p.charges=3);
   startEncounter(this.world,[0,0,1,3,5,6,6][seg]);
   if(seg===1)this.world.bunkers[1].mask.fill(0);
   if(seg===2)spawnSaucer(this.world);
   if(seg===6){this.world.boss.phase=2;this.world.boss.emitters.forEach(e=>e.hp=0);this.world.boss.open=true;}
  }
  const w=this.world,cmd=w.players.map((p,seat)=>{
   let target=w.enemies.length?w.enemies.slice().sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0].x+8:240;
   if(w.saucer)target=w.saucer.x+10;
   if(w.boss){const emitter=w.boss.emitters.find(e=>e.hp>0&&e.open)||w.boss.emitters.find(e=>e.hp>0);target=w.boss.phase===1?(emitter?.x??240):w.boss.x;}
   const danger=w.bullets.find(b=>b.owner<0&&b.y>185&&Math.abs(b.x-p.x)<16);if(danger)target=p.x+(p.x<danger.x?-45:45);
   return {targetX:clamp(target+(seat?18:0),18,462),fire:true,repair:w.tick%180===0};
  });
  stepWorld(w,cmd,dt);this.present(w.events);
 }
 update(dt){
  if(!this.session?.server)this.pollPads();this.game.focus(240,135,0);this.game.timeScale=1;
  this.view.update(dt);this.drain=Math.max(0,this.drain-dt);this.noticeTime=Math.max(0,this.noticeTime-dt);
  if(this.noticeTime===0&&typeof document!=='undefined')document.getElementById('notice').style.opacity='0';
  if(this.padWakeBlocked){for(const I of this.game.players)I.consumeAll();}
  const screen=this.ui.screen;
  if(screen==='attract'){this.updateAttract(dt);return;}
  if(!this.session&&!this.activeRun){
   this.idle+=dt;
   if(this.idle>=10){this.startAttract();return;}
   if(screen==='launch'&&!this.lobby){this.lobby=true;this.game.allowJoin({max:2,keys:true,onJoin:()=>{this.playerCount=2;this.ui.render();}});}
   else if(screen!=='launch'&&this.lobby){this.lobby=false;this.game.allowJoin(false);}
  }
  if(screen==='play'&&this.drain<=0&&!this.padWakeBlocked){
   for(const I of this.game.players)if(I.pressed('pause')||I.pressed('start')){
    this.activity(I.lastDevice);this.openPause();I.consumeAll();return;
   }
  }
  if(!this.padWakeBlocked)this.ui.update(dt);
  const playing=this.ui.screen==='play';
  const commands=this.session?.server||this.drain>0||!playing?[]:this.game.players.map((I,i)=>this.sampleSeat(I,i));
  if(this.session){
   if(!this.session.ended)this.session.update(commands[0]||{move:0,fire:false,repair:false},!playing);
  }else if(playing&&this.activeRun&&this.speed>0){
   this.world.invulnerable=this.invulnerable;
   // Separate simulation scaling keeps menus at their ordinary fixed update rate.
   const total=dt*this.speed;
   let first=true;
   for(let left=total;left>1e-8;left-=1/120){const cmd=first?commands:commands.map(c=>({...c,repair:false}));stepWorld(this.world,cmd,Math.min(1/120,left));this.present(this.world.events);first=false;}
  }
  if(this.activeRun&&!this.silenced)this.audio.location(this.world);
  if(this.activeRun&&['victory','defeat'].includes(this.world.status)&&this.ui.screen==='play'){
   if(this.world.status==='victory'){if(this.resultDelay===null)this.resultDelay=2.4;else this.resultDelay-=dt;}
   if(this.world.status==='defeat'||this.resultDelay<=0){this.saveRecord();this.ui.show('results');}
  }
  if(typeof document!=='undefined'){
   const pb=document.getElementById('pause-button'),rb=document.getElementById('repair-button');
   pb.style.display=playing&&!this.session?.ended?'block':'none';
   const seat=this.session?.seat??0,p=this.world.players[seat],q=p?repairPreview(this.world,seat):null;
   rb.style.display=playing&&this.primary==='touch'&&q?.usable?'block':'none';
  }
 }
 draw(r){
  const isFront=!this.activeRun&&this.ui.screen!=='attract';
  const w=this.session?this.session.interpolatedWorld():this.world;
  this.game.lights.enabled=true;this.game.lights.ambient=.84;
  this.view.drawWorld(r,w,{front:isFront,attract:this.ui.screen==='attract',overlays:this.overlays});
  if(isFront)r.overlay(g=>E.px.blend(g,.38,'normal',()=>E.px.rect(g,0,0,r.W,r.H,'#04121a')));
 }
}
const app=new App();
app.connect().catch(e=>{app.game.fail('Hub connection',e);app.notify('SESSION CONNECTION FAILED');});
