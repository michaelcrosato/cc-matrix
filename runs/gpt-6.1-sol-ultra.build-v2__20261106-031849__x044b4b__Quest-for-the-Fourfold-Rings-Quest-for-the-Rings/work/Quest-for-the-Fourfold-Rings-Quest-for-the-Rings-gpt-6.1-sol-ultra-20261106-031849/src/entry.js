(() => {
  'use strict';
  const E=My3D2dge,C=RingContent,S=RingSim;
  const bindings={up:['KeyW','ArrowUp','Pad12'],down:['KeyS','ArrowDown','Pad13'],left:['KeyA','ArrowLeft','Pad14'],right:['KeyD','ArrowRight','Pad15'],attack:['Mouse0','KeyJ','Pad7'],skill:['Mouse2','KeyK','Pad6'],dash:['Space','Pad0'],interact:['KeyE','Pad3'],ping:['KeyQ','Pad5'],map:['Tab','Pad2','Pad17'],pause:['Escape','Pad9'],confirm:['Enter','Space','Pad0'],cancel:['Escape','Backspace','Pad1'],start:['Enter','Pad9']};
  const app={world:null,net:null,attract:false,ended:false,pendingJoin:null,waitingSeat:null,menuSeat:0,localHumans:1,save:null,saveAvailable:true,lastCheckpoint:-1,lastEvent:0,inject:[null,null],idle:0,idleWall:performance.now(),demoTime:0,demoSection:-1,epochSeen:-1,lastFootTime:0,footPositions:[]};
  const game=new E.Game({canvas:'screen',id:'fourfold-rings-1',res:'ps1',expand:true,view:'threequarter',input:bindings,autoPause:false,fullscreen:'button',live:false,menu:{quit:false,controls:{attack:'Primary action',skill:'Class power',dash:'Dodge',interact:'Interact / pass / revive',ping:'Companion objective',map:'Objective view'},settings:[{key:'music',value:.1},{key:'glyphs',value:'playstation',options:[['playstation','PlayStation'],['xbox','Xbox']]}]}});
  RingAudio.attach(game.audio);
  const SAVE_KEY='fourfold-rings-checkpoint-v3';
  function readSave(){try{const raw=localStorage.getItem(SAVE_KEY);const value=raw?JSON.parse(raw):null;app.save=S.validSave(value)?value:null;}catch(_){app.saveAvailable=false;app.save=null;}}
  readSave();
  function writeCheckpoint(){if(app.net||app.attract||!app.world||app.world.checkpointRequested===app.lastCheckpoint)return;app.lastCheckpoint=app.world.checkpointRequested;app.save=S.checkpoint(app.world);try{localStorage.setItem(SAVE_KEY,JSON.stringify(app.save));}catch(_){app.saveAvailable=false;ui.shell.toast('This journey lives for this visit','Storage is unavailable. Safe transitions remain in memory.');}}
  app.hasSave=()=>!!app.save;
  app.configureAudio=()=>RingAudio.configure({master:game.settings.sound?game.settings.volume:0,music:game.settings.music,sfx:game.settings.effects,voice:game.settings.voice??.5});
  app.intent=(value,seat=app.net?app.net.localSeat:app.menuSeat)=>{
    let result=false;if(app.net){result=app.net.intent(value);}else if(app.world)result=S.intent(app.world,seat,value,0);
    if(result){app.inject=[null,null];game.input.consumeAll();ui.invalidate();}return result;
  };
  app.dev=(action,value)=>{if(app.net&&!app.net.authority)return false;if(!app.world)return false;S.debug(app.world,action,value);app.net?.forceSnapshot();return true;};
  function cleanPresentation(){app.inject=[null,null];app.lastEvent=0;app.epochSeen=-1;app.lastCheckpoint=-1;game.input.clear();touches.clear();Object.assign(touch,{move:null,aim:null,primary:false,power:false,dodge:false,interact:false,pulses:{}});game.particles.list.length=0;RingAudio.dispose();RingAudio.attach(game.audio);app.configureAudio();document.getElementById('caption').classList.remove('on');}
  app.newRun=classes=>{cleanPresentation();app.attract=false;app.idle=game.real;app.idleWall=performance.now();app.world=S.create({seed:'dawn-'+Date.now().toString(36),classes});app.world.heroes[1].ai=app.localHumans<2;app.world.heroes[1].device=app.localHumans<2?'ai':'gamepad';app.world.heroes[1].owner=app.localHumans<2?null:'local2';game.scene.pausable=true;game.resume();ui.invalidate();writeCheckpoint();};
  app.continueRun=()=>{if(!app.save)return;cleanPresentation();app.world=S.restore(app.save);if(!app.world){app.save=null;ui.title();return;}app.world.heroes[1].ai=app.localHumans<2;game.scene.pausable=true;game.resume();ui.invalidate();};
  app.toTitle=(replay=false)=>{if(app.net)return;cleanPresentation();app.attract=false;app.world=null;app.ended=false;game.resume();game.scene.pausable=false;app.idle=game.real;app.idleWall=performance.now();ui.title();RingAudio.setScene('title');if(replay)ui.select(0);};
  app.useAI=seat=>{if(!app.world)return;app.waitingSeat=null;if(seat===0)game.input.pad='any';app.world.heroes[seat].ai=seat!==0;app.world.heroes[seat].owner=seat===0?'local':null;app.world.heroes[seat].device=seat===0?'keyboard':'ai';if(seat===1){app.localHumans=1;if(game.players.length>1)game.removePlayer(2);}game.resume();};
  const ui=RingUI.create(game,app);app.configureAudio();RingView.init(game);
  let lastMeaningfulPointer=null,consumeClickUntil=0;
  function meaningful(e){
    if(e?.type==='pointermove'){
      if(!lastMeaningfulPointer){lastMeaningfulPointer=[e.clientX,e.clientY];return;}
      if(Math.hypot(e.clientX-lastMeaningfulPointer[0],e.clientY-lastMeaningfulPointer[1])<4)return;
      lastMeaningfulPointer=[e.clientX,e.clientY];
    }
    app.idle=game.real;app.idleWall=performance.now();if(e&&e.type!=='pointermove')app.menuSeat=0;if(e?.type==='pointerdown'&&e.pointerType==='touch'){game.input.lastDevice='touch';touch.active=true;}
    if(app.attract){app.attract=false;app.world=null;app.demoSection=-1;app.demoTime=0;game.input.clear();game.scene.pausable=false;ui.title();RingAudio.setScene('title');consumeClickUntil=performance.now()+400;if(e){e.preventDefault();e.stopImmediatePropagation();}return true;}
    if(e?.type==='keydown'||e?.type==='pointerdown')RingAudio.unlock();return false;
  }
  addEventListener('keydown',meaningful,{capture:true});addEventListener('pointerdown',meaningful,{capture:true});addEventListener('pointermove',meaningful,{capture:true});
  addEventListener('click',e=>{if(performance.now()<consumeClickUntil){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
  document.getElementById('screen').addEventListener('contextmenu',e=>e.preventDefault());
  let lastScreen='',lastPause=false;
  game.hook('input',dt=>{
    const I=game.input;
    if(!app.net&&I.padIndex!==null&&I.lastDevice==='gamepad'&&(I.anyPressed()||Math.hypot(...I.padMove)>.3||I.padAim&&Math.hypot(...I.padAim)>.3))I.pad=I.padIndex;
    if(I.anyPressed()||Math.hypot(...I.padMove)>.3||I.padAim&&Math.hypot(...I.padAim)>.3){if(meaningful()){for(const a of Object.keys(I.map))I.suppress(a);I.consumeAll();return;}RingAudio.unlock();}
    if(app.net&&I.held.has('Pad8'))I.suppress('pause');
    if(!app.net&&app.waitingSeat!==null){const seat=app.waitingSeat,q=game.players[seat];if(q&&q.padIndex!==null&&!q.padLost&&(q.anyPressed()||Math.hypot(...q.padMove)>.3)){app.waitingSeat=null;const h=app.world.heroes[seat];h.ai=false;h.owner='local'+(seat+1);h.device='gamepad';ui.shell.hide();game.resume();q.consumeAll();}}
    if(!app.net&&!app.attract&&app.world){for(let seat=0;seat<game.players.length;seat++){if(game.players[seat].padLost){ui.reconnect(seat);break;}}}
    if(!app.net&&!app.attract&&ui.shell.screen==='title'&&Math.max(game.real-app.idle,(performance.now()-app.idleWall)/1000)>=10){app.attract=true;app.demoTime=0;app.demoSection=-1;ui.shell.hide();app.lastEvent=0;}
    if(lastPause!==game.paused){lastPause=game.paused;RingAudio.pause(app.ended||game.paused&&!app.net);}
    if(lastScreen!==ui.shell.screen){lastScreen=ui.shell.screen;app.idle=game.real;app.idleWall=performance.now();if(ui.shell.screen){touches.clear();Object.assign(touch,{move:null,aim:null,power:false,dodge:false,interact:false,pulses:{}});}}
    if(app.net&&app.net.localSeat<0)I.consumeAll();
  });
  // Native local-joining owns devices; the simulation owns hero control separately.
  game.allowJoin({max:2,keys:false,onJoin:(input,n)=>{if(app.net)return;app.pendingJoin=n;ui.shell.toast('A second hand has answered','Hero 2 joins at the next safe waystone or chamber.');}});
  const touches=new Map(),touch={move:null,aim:null,active:false,primary:false,power:false,dodge:false,interact:false,pulses:{}},touchRoot=document.getElementById('touchActions');
  const screen=document.getElementById('screen');game.input.touchEnabled=false;game.input.touchButtons([]);
  function touchEvent(e){if(e.pointerType!=='touch')return;if(e.type==='pointerup'||e.type==='pointercancel'){const side=touches.get(e.pointerId);if(side)touch[side]=null;touches.delete(e.pointerId);if(ui.shell.screen||!app.world||app.attract||app.ended)return;}if(ui.shell.screen||!app.world||app.attract||app.ended)return;e.preventDefault();e.stopImmediatePropagation();game.input.lastDevice='touch';touch.active=true;
    if(e.type==='pointerdown'){screen.setPointerCapture(e.pointerId);const side=e.clientX<innerWidth*.5?'move':'aim';if(!touch[side]){const p={id:e.pointerId,x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY};touches.set(e.pointerId,side);touch[side]=p;}}
    if(e.type==='pointermove'){const side=touches.get(e.pointerId),p=touch[side];if(p){p.cx=e.clientX;p.cy=e.clientY;}}
    if(e.type==='pointerup'||e.type==='pointercancel'){const side=touches.get(e.pointerId);if(side)touch[side]=null;touches.delete(e.pointerId);}
  }
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])screen.addEventListener(type,touchEvent,{capture:true});
  for(const action of ['power','dodge','interact']){
    const b=document.createElement('button');b.dataset.action=action;b.textContent=action==='interact'?'Take / help':action==='power'?'Class':'Evade';touchRoot.append(b);const pointers=new Set();
    b.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.pointerType!=='mouse')return;e.preventDefault();e.stopPropagation();pointers.add(e.pointerId);b.setPointerCapture(e.pointerId);touch[action]=true;touch.pulses[action]=true;game.input.lastDevice='touch';RingAudio.unlock();});
    const end=e=>{pointers.delete(e.pointerId);if(!pointers.size)touch[action]=false;};b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
  }
  function command(input,h){
    if(!h||h.down)return S.ZERO();
    const c=S.ZERO();const m=input.move(),v=game.view.screenDirToGround(m[0],m[1]);c.mx=v[0];c.my=v[1];
    if(input.padAim&&Math.hypot(...input.padAim)>.2){const a=game.view.screenDirToGround(...input.padAim);c.ax=a[0];c.ay=a[1];}
    else if(input.lastDevice==='mouse'&&input.mouse.active){const aim=RingView.screenToWorld(input.mouse.cx,input.mouse.cy);if(aim){const dx=aim[0]-h.x,dy=aim[1]-h.y,n=Math.hypot(dx,dy)||1;c.ax=dx/n;c.ay=dy/n;}}
    c.primary=input.down('attack')||input.pressed('attack');c.power=input.pressed('skill');c.dodge=input.pressed('dash');c.interact=input.down('interact')||input.pressed('interact');c.ping=input.pressed('ping');
    const near=app.world.enemies.filter(e=>e.kind!=='dragon'&&!e.dead&&S.line(app.world,h,e)).sort((a,b)=>E.dist(a,h)-E.dist(b,h))[0];
    if(game.settings.aimAssist&&input.lastDevice!=='mouse'&&Math.hypot(c.ax,c.ay)<.2&&near&&E.dist(near,h)<110){const n=E.dist(near,h)||1;c.ax=(near.x-h.x)/n;c.ay=(near.y-h.y)/n;}
    if(touch.active&&input===game.input&&input.lastDevice==='touch'){
      if(touch.move){const dx=(touch.move.cx-touch.move.x)/48,dy=(touch.move.cy-touch.move.y)/48,n=Math.max(1,Math.hypot(dx,dy)),vv=game.view.screenDirToGround(dx/n,dy/n);c.mx=vv[0];c.my=vv[1];}else{c.mx=0;c.my=0;}
      if(touch.aim){const dx=touch.aim.cx-touch.aim.x,dy=touch.aim.cy-touch.aim.y;if(Math.hypot(dx,dy)>12){const n=Math.hypot(dx,dy),a=game.view.screenDirToGround(dx/n,dy/n);c.ax=a[0];c.ay=a[1];}}
      c.primary=!!near&&E.dist(near,h)<(h.classId==='warrior'?32:105);c.power=touch.power||!!touch.pulses.power;c.dodge=touch.dodge||!!touch.pulses.dodge;c.interact=touch.interact||!!touch.pulses.interact;touch.pulses={};
    }
    return c;
  }
  function updateTouch(){const active=touch.active&&!ui.shell.screen&&app.world&&!app.attract&&!app.ended;touchRoot.hidden=!active;if(!active)return;const h=app.world.heroes[Math.max(0,app.net?app.net.localSeat:0)],ctx=S.context(app.world,h),danger=S.danger(app.world,h.x,h.y)>.3,threat=app.world.enemies.some(e=>E.dist(e,h)<120);for(const b of touchRoot.children){const a=b.dataset.action;b.hidden=a==='interact'?!ctx:a==='power'?h.powerCd>0||!(threat||danger||touch.aim||['crystal','inferno','final'].includes(C.rooms[app.world.roomId].family)):!(threat||danger||touch.aim);if(a==='interact')b.textContent=ctx?ctx.type==='revive'?'Hold to revive':ctx.type==='station'?'Hold to bind':ctx.type==='pass'?'Hold to pass':ctx.type==='exit'?'Enter light':'Take ring':'Context';if(a==='power')b.textContent=C.heroes[h.classId].power;}}
  function attractStep(dt){
    app.demoTime+=dt;const section=Math.floor(app.demoTime/15)%6;
    if(section!==app.demoSection){app.demoSection=section;const ids=['dungeon2','crystal2','inferno2','shifting2','final','dungeon2'];app.world=S.create({seed:'attract-'+section,classes:section===1?['phantom','changeling']:section===2?['wizard','warrior']:section===3?['changeling','phantom']:['warrior','wizard']});app.world.rings=[true,true,true,true];app.world.invulnerable=true;app.world.assisted=true;app.world.tuning.heroSpeed=95;app.world.site=C.sites.find(s=>s.rooms.includes(ids[section])).id;app.world.roomIndex=1;S.enterRoom(app.world,ids[section]);app.lastEvent=0;RingAudio.setScene(C.rooms[ids[section]].family);}
    if(['room','courtyard'].includes(app.world.mode)){
      const cmds=app.world.heroes.map(h=>S.companion(app.world,h,dt,true));app.world.heroes.forEach(h=>h.ai=false);S.step(app.world,dt,cmds);
    }
    document.getElementById('demo').hidden=false;
  }
  function update(dt){
    if(app.ended){RingView.update(app.world,dt,ui.state);return;}
    if(app.attract)attractStep(dt);else document.getElementById('demo').hidden=true;
    if(!app.attract&&app.world){
      if(app.pendingJoin&&['board','courtyard'].includes(app.world.mode)||app.pendingJoin&&app.world.epoch!==app.epochSeen){app.localHumans=2;app.world.heroes[1].ai=false;app.world.heroes[1].owner='local2';app.world.heroes[1].device='gamepad';app.pendingJoin=null;}
      const inMenu=!!ui.shell.screen;
      const seat=app.net?app.net.localSeat:0;
      const local=seat<0||inMenu?S.ZERO():app.inject[seat]||command(game.input,app.world.heroes[seat]);
      if(game.input.pressed('map')&&!inMenu){game.menu('objective');ui.shell.show('objective',{kicker:'The way ahead',title:S.objective(app.world),text:C.rooms[app.world.roomId].tutorial+'\n'+(app.net?'The shared world keeps moving. Your input is neutral while this view is open.':'Reading does not increase Dread.'),actions:[['Return to the road',()=>ui.shell.hide()]]});}
      if(app.net){app.net.update(dt,local);if(app.net.authority&&app.net.playing)S.step(app.world,dt,app.net.commands);}
      else if(!inMenu){const second=app.world.heroes[1].ai?null:app.inject[1]||command(game.players[1]||game.input,app.world.heroes[1]);S.step(app.world,dt,[local,second]);}
      ui.sync();writeCheckpoint();
      if(app.world.epoch!==app.epochSeen){app.epochSeen=app.world.epoch;app.footPositions=app.world.heroes.map(h=>({x:h.x,y:h.y}));app.lastFootTime=app.world.time;RingAudio.setScene(app.world.mode==='victory'?'victory':app.world.mode==='board'?'courtyard':C.rooms[app.world.roomId].family);}
    }else if(app.net)app.net.update(dt,S.ZERO());
    if(app.world){for(const ev of app.world.events)if(ev.id>app.lastEvent){RingAudio.event(ev);app.lastEvent=ev.id;}RingAudio.tension(app.world.dread);if(['room','courtyard'].includes(app.world.mode)&&app.world.time-app.lastFootTime>.32){app.lastFootTime=app.world.time;app.world.heroes.forEach((h,i)=>{const p=app.footPositions[i];if(p&&!h.down&&Math.hypot(h.x-p.x,h.y-p.y)>4)RingAudio.event({type:'step',id:'foot:'+app.world.epoch+':'+i+':'+app.world.tick});app.footPositions[i]={x:h.x,y:h.y};});}}
    if(!app.world)RingAudio.setScene('title');
    RingView.update(app.world,dt,ui.state);updateTouch();
  }
  async function boot(){
    app.net=await RingNet.setup({prepare(info){app.world=S.create({seed:'hub-'+Math.floor(info.rng('layouts')()*1e9),humans:info.players.map((_,i)=>i)});S.setRandomProvider(app.world,info.rng);S.board(app.world);app.world.heroes.forEach((h,i)=>{h.owner=info.players[i]?.id??null;h.device=h.ai?'ai':'remote';});ui.shell.hide();game.live=true;game.scene&&(game.scene.pausable=true);},getEpoch:()=>app.world?.epoch||0,readSnapshot:()=>S.snapshot(app.world),applySnapshot:(data)=>{app.world=S.applySnapshot(app.world,data);},onStart:()=>{game.live=true;game.resume();ui.invalidate();},onLeave:(id,seat)=>{if(app.world?.heroes[seat]){const h=app.world.heroes[seat];h.ai=true;h.owner=null;h.device='ai';}ui.invalidate();},onIntent:(seat,value)=>{S.intent(app.world,seat,value,app.net?.routeChooser??0);},getOutcome:()=>({won:app.world?.mode==='victory',score:(app.world?.rings.filter(Boolean).length||0)*100+(app.world?.bound||0)*20}),onEnd:detail=>{app.ended=true;if(game.scene)game.scene.pausable=false;app.inject=[null,null];game.input.clear();touches.clear();Object.assign(touch,{move:null,aim:null,power:false,dodge:false,interact:false,pulses:{}});RingAudio.pause(true);touchRoot.hidden=true;ui.shell.hide();ui.shell.show('sessionEnd',{kicker:'AI Hub',title:'The shared chapter has closed',text:detail?.reason==='host-left'?'The authority departed. The Hub will choose the next chapter.':'The Hub holds the expedition’s result.',actions:[['Expedition credits',()=>ui.about()]]});}});
    game.start({scene:'expedition',scenes:{expedition:{pausable:!!app.net,update,draw:r=>RingView.draw(r,app.world,ui.state),back:()=>{if(ui.shell.screen){ui.shell.back();return true;}return false;}}}});
    game.o.autoPause=!app.net;ui.state.remote=!!app.net&&!app.net.authority;
    if(app.net)game.allowJoin(false);
    if(!app.net){app.world=null;ui.title();app.idle=game.real;app.idleWall=performance.now();}else{game.live=true;game.scene.pausable=true;ui.invalidate();ui.sync();}
    document.getElementById('loading').remove();
    globalThis.__ring={get world(){return app.world;},get game(){return game;},get net(){return app.net;},get ui(){return ui;},get attract(){return app.attract;},get ended(){return app.ended;},inputIntent:(i)=>app.intent(i),testCommand:(seat,cmd)=>{if(seat<0||seat>1||app.net&&seat!==app.net.localSeat)return false;app.inject[seat]=cmd?{...S.ZERO(),...cmd}:null;return true;},dev:(a,v)=>app.dev(a,v),inspect:()=>({world:app.world?S.snapshot(app.world):null,net:app.net?.inspect(),errors:game.errors,audio:RingAudio.debug(),saveAvailable:app.saveAvailable,attract:app.attract}),newRun:classes=>{if(app.net)return false;ui.shell.hide();app.newRun(classes||['warrior','wizard']);return true;}};
    document.documentElement.dataset.ready='true';
  }
  boot().catch(err=>{game.fail('boot',err);document.getElementById('loading').textContent='The gate could not open: '+err.message;});
  addEventListener('pagehide',()=>{RingAudio.pause(true);});
})();
