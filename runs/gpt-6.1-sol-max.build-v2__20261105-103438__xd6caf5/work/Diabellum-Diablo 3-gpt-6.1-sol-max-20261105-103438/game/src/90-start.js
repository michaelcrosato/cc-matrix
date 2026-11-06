const CONTROL_NAMES={s0:'Primary skill / click to move',s1:'Skill 2',s2:'Skill 3',s3:'Skill 4',s4:'Skill 5',s5:'Skill 6',evade:'Evade',potion:'Potion',interact:'Interact / hold to revive',portal:'Passing Bell',inventory:'Inventory',skills:'Skills and Tones',journal:'Journal',map:'Map',stand:'Stand and attack',labels:'Show loot',aimU:false,aimD:false,aimL:false,aimR:false,prev:'Previous tab',next:'Next tab',attack:false,jump:false,dash:false,skill:false};
function pausePanel(id){game.resume();openPanel(id,getMain()?.id||0);}
game=new E.Game({canvas:'screen',res:[480,270],expand:true,view:'iso',views:['iso'],bg:INK,touch:'never',input:PLAY,live:SESSION,autoPause:!SESSION,draw:true,
  menu:{quit:SESSION?false:'title',controls:CONTROL_NAMES,saves:SESSION?false:{slots:3,version:2,migrate:migrateSave},items:SESSION?[]:[['Inventory',()=>pausePanel('inventory')],['Skills',()=>pausePanel('skills')],['Journal',()=>pausePanel('journal')],['Dev Mode',()=>pausePanel('dev')],['About and Credits',()=>pausePanel('about')],['Leave couch co-op',()=>leaveCouch()]],
    settings:[{key:'music',value:.1},{key:'glyphs',value:'playstation',options:[['playstation','PlayStation'],['xbox','Xbox (A B X Y)']]},
      {key:'voices',label:'Voices',type:'slider',value:.75,min:0,max:1,step:.05,group:'Sound',apply:(g,v)=>{g.audio.voiceVolume=v;g.audio.applyVolume();}},
      {key:'blood',label:'Blood',value:'red',options:[['red','Red'],['wax','Wax'],['none','None']]},
      {key:'aimAssist',label:'Aim assist',value:'high',options:[['off','Off'],['low','Low'],['high','High']]},
      {key:'numbers',label:'Damage numbers',value:true},{key:'lootLabels',label:'Loot labels',value:'near',options:[['near','Nearby and Relics'],['all','All']]},
      {key:'holdAttack',label:'Hold to attack',value:true}]
  }});
shell=new E.Shell(game,{theme:{ink:IVORY,paper:INK,accent:TEAL,muted:MUTED,danger:'#d9857a',line:'#53676a',font:'Georgia, serif',titleFont:'Georgia, serif'}});
talk=new E.Dialog(game,{width:330,lines:2,speed:45,bg:PANEL,border:'#54716c',nameColor:TEAL,voice:false});
game.particles.max=3000;
const nativeFreeze=game.freeze.bind(game),nativeShake=game.shake.bind(game);
game.freeze=s=>{if(game.real-lastHitStop>=.1){lastHitStop=game.real;nativeFreeze(s*TUNE.hitstop);}};
game.shake=s=>nativeShake(s*TUNE.shake);
function fitShell(){if(!HAS_DOM)return;document.querySelectorAll('.esh').forEach(el=>{el.style.zoom=Math.max(1,Math.min(innerHeight/540,innerWidth/880));});}
function focusParty(){if(!W?.heroes.length)return;const local=W.heroes.filter(h=>!h.follower);if(local.length>1){game.cam.frame(local,{margin:65,zoom:[.7,1]});}else{game.cam.frame(null);const h=getMain();game.focus(h.x,h.y,18);const crowded=W.foes.filter(f=>dist(f,h)<150).length>=12||W.foes.some(f=>f.boss);game.setZoom(E.approach(game.zoom,crowded?.88:1,.01));}}
function configureZone(){
  if(!W)return;const z=DB.zone[W.zone],t=THEMES[z.theme];viewRigs.clear();talk.close();game.cam.bounds=v=>W.map.bounds(v);game.cam.snap=true;game.cam.offset=[0,-10];game.lights.enabled=true;game.lights.ambient=t.ambient;
  game.weather=t.weather?{kind:t.weather,amount:t.weather==='rain'?.45:.65,wind:.2,lightning:W.zone==='town'?.06:0}:null;audio.setCue(W.zone==='vigil'?'vigil':t.music);focusParty();
  if(W!==null&&!attract&&!net){const q=CAMPAIGN[W.progress];if(q&&q.zone===W.zone)say(q.line,q.speaker||'Mother Quillon');if(z.tip)toast(z.tip);}
}
function newCampaign(kind='ringer',seed=null){
  const chosen=seed??(HAS_DOM?(new URLSearchParams(location.search).get('seed')||Date.now()%1000000):1711);W=newWorld(chosen);W.heroes=[newHero(kind)];W.me=0;const h=getMain();h.gear[0]=rollItem(W,h,{slot:0,rarity:1});h.gear[2]=rollItem(W,h,{slot:2,rarity:1});h.pennies=40;attract=false;viewRigs.clear();enterZone(W,'prologue');return W;
}
function saveGame(slot='auto'){if(!W||attract||SESSION||W.gallery)return false;return game.saves.save(slot,{data:serializeWorld(W),place:DB.zone[W.zone].name,level:getMain().level});}
function loadSaved(){const latest=game.saves.latest();if(latest){game.saves.load(latest.slot);game.go('play');}}
game.saves.version=2;game.saves.migrate=migrateSave;game.saves.write=()=>W&&!attract&&!SESSION?{data:serializeWorld(W),place:DB.zone[W.zone].name,level:getMain()?.level||1}:null;
game.saves.read=save=>{W=loadWorld(save.data);viewRigs.clear();attract=false;configureZone();};
let lastSoundHit=0,lastBark=0,lastSaveTime=0;
function onWorldEvent(e){
  if(!game)return;
  if(net&&W?.authority&&!net.ended&&['spawn','kill','hit','fx','cast','drop','phase','taunt','notice','level','chord','bossDeath','warden','blessing','hazard','allySpawn','allyEnd'].includes(e.kind))net.events.push(e);
  if(net?.info.server)return;
  if(e.kind==='zone'){configureZone();if(!SESSION&&!attract&&game.scenes)saveGame();}
  if(e.kind==='hit'){
    game.hitFx(e.x,e.y,(e.z||0)+14,{power:e.crit?1.3:.35,angle:e.angle,color:ELEMENT[e.element]||GOLD,sound:false,rumble:false});
    if(game.real-lastSoundHit>.04){audio.sound('hit',e.crit?1.4:.8);lastSoundHit=game.real;}
    const id=e.source??e.id,hero=W?.heroes.find(h=>h.id===id),ii=hero&&game.players[W.heroes.filter(h=>!h.follower).indexOf(hero)];if(ii?.lastDevice==='gamepad')ii.rumble(e.crit?.5:.25,.09);
    viewRigs.get(e.id)?.rig.kick?.(.3);
  }
  if(e.kind==='cast'){
    audio.sound('swing');if(net&&!W.authority&&e.id===net.info.me)queueCommand({action:'skill',slot:e.sid,aim:e.aim});
    if(game.real-lastBark>12){const h=W.heroes.find(h=>h.id===e.id);if(h){lastBark=game.real;say(choose(W.rng,DB.hero[h.kind].barks),DB.hero[h.kind].name,2.6);}}
  }
  if(e.kind==='kill'){game.particles.bits(e.x,e.y,12,e.kindName==='digger'?10:5,e.kindName==='husk'?['#c4c7b5','#d9ddcb']:['#968c74','#6f6d58']);game.particles.dust(e.x,e.y,0,3);}
  if(e.kind==='break'){game.particles.bits(e.x,e.y,6,14,['#817058','#ae9874','#4a4842']);audio.sound('break');}
  if(e.kind==='drop'&&e.item.rarity>=4){audio.sound('relic');toast('★  '+RARITY[e.item.rarity].name.toUpperCase()+' FOUND',RARITY[e.item.rarity].color);if(!attract&&!W.flags.includes('bookBurned'))say('A fine Relic. The saint was shorter than you.');}
  if(e.kind==='pickup'){if(e.type==='penny')audio.sound('penny');if(e.type==='votive')audio.sound('heal');if(e.type==='item'){toast(itemName(e.item)+' • '+prompt('inventory')+' to inspect',RARITY[e.item.rarity].color);audio.bell(e.item.rarity>=3?330:460,.08);}}
  if(e.kind==='equip')viewRigs.delete(e.id);
  if(e.kind==='consecrate'){audio.sound(e.rarity>=4?'relic':'level');toast('The offering is Consecrated.');}
  if(e.kind==='level'){audio.sound('level');game.particles.ring(e.x,e.y,8,70,GOLD,1);toast('LEVEL '+e.level+' • '+(e.level===3?'Tones awaken. '+prompt('skills')+' to tune your build.':'A new verse in an unwritten life.'));}
  if(e.kind==='notice')toast(e.text);
  if(e.kind==='dialogue'||e.kind==='taunt')say(e.text,e.speaker);
  if(e.kind==='rung'){toast('RUNG × '+e.count,GOLD);audio.bell(110,.2);game.shake(4);}
  if(e.kind==='phase'){game.shake(5);audio.bell(78,.25);const f=W.foes.find(f=>f.id===e.id);if(f)say(DB.boss[f.kind].taunts[Math.min(DB.boss[f.kind].taunts.length-1,e.phase*3)],DB.boss[f.kind].name);}
  if(e.kind==='bossDeath'){
    audio.sound('relic');game.particles.explosion(getMain().x,getMain().y,20,3,{freeze:false,shake:4});toast('THE PARISH IS FREE TO PASS',GOLD);
    if(e.kindName==='regent')say('Five names on that page. Yours. And mine. I tore them out.');
    if(!SESSION&&!attract)saveGame();
  }
  if(e.kind==='evade'){audio.sound('evade');if(net&&!W.authority&&e.id===net.info.me)queueCommand({action:'evade',dir:getMain().dodgeDir});}
  if(e.kind==='potion'){audio.sound('heal');if(net&&!W.authority&&e.id===net.info.me)queueCommand({action:'potion'});}
  if(e.kind==='portal'||e.kind==='vigilStart')audio.sound('portal');
  if(e.kind==='heroDeath'){audio.sound('death');nativeFreeze(.12);}
  if(e.kind==='chord')audio.tone('choir',330,.5,.09);
  if(e.kind==='objective'){audio.bell(190,.17);toast(e.type==='chapel'?'SIDE CHAPEL LIT • '+e.count+'/2':e.type==='sluice'?'BRONZE SLUICE OPEN • '+e.count+'/3':'The pilgrims are safe.');}
  if(e.kind==='pour'){game.shake(6);say('The Bell is recast. The moths are coming.');audio.tone('noise',190,.9,.2);}
  if(e.kind==='ending'){audio.setCue('ending');audio.speak('Narrator',ENDING[0][1]);game.go('ending',null,{fade:.5});}
  if(e.kind==='warden'){toast('THE WARDEN HAS COME',GOLD);audio.sound('relic');}
}
function assistedAim(w,h,dir){
  const facing=Math.hypot(...dir)>.15?Math.atan2(dir[1],dir[0]):h.facing;
  if(game.settings.aimAssist==='off')return {x:h.x+Math.cos(facing)*100,y:h.y+Math.sin(facing)*100};
  let best=null,score=Infinity;for(const f of w.foes)if(f.alive){const d=dist(h,f),a=Math.abs(adiff(angle(h,f),facing)),cone=game.settings.aimAssist==='low'?.65:.9*TUNE.assist;if(d<180&&a<cone){const s=d+a*80-(f.elite?12:0);if(s<score){score=s;best=f;}}}
  return best||{x:h.x+Math.cos(facing)*100,y:h.y+Math.sin(facing)*100};
}
function localInput(w,h,I){
  const screenMove=I.move(),move=game.view.screenDirToGround(screenMove[0],screenMove[1]);let dir=move,aim=assistedAim(w,h,dir);
  const pointer=I.pointer(),mouse=I.lastDevice!=='gamepad'&&I.aimSource==='mouse',ground=game.mouseGround();
  let hover=null;if(pointer&&game.r)hover=game.r.pick(pointer[0],pointer[1]).find(o=>o?.team==='foe'||o?.type||o?.breakable)||null;
  if(h.id===w.me)currentHover=hover;
  const out={moveDir:dir,aim,slots:Array(6).fill(false),potion:I.pressed('potion'),portal:I.pressed('portal'),interact:I.pressed('interact'),rise:I.down('confirm')||I.down('interact'),riseAtGate:I.down('portal')};
  const usable=nearestUsable(w,h);if(usable&&(usable.team==='hero'||usable.type==='tongue'))out.interact=I.down('interact');
  if(net&&!w.authority&&out.interact&&w.time>(h.netInteractAt||0)){h.netInteractAt=w.time+.17;queueCommand({action:'interact'});}
  if(!w.session){for(const [a,panel]of [['inventory','inventory'],['skills','skills'],['journal','journal'],['map','map']])if(I.pressed(a)){openPanel(panel,h.id);return {};}}
  const right=[I.value('aimR')-I.value('aimL'),I.value('aimD')-I.value('aimU')],rm=Math.hypot(...right);
  out.evade=I.pressed('evade')||(rm>.7&&!(h.rightHeld));h.rightHeld=rm>.4;
  if(rm>.4)out.evadeDir=game.view.screenDirToGround(...right);
  for(let i=0;i<6;i++){out.slots[i]=(game.settings.holdAttack&&I.down('s'+i))||I.buffered('s'+i,.2);if(out.slots[i])I.consume('s'+i);}
  if(mouse&&ground){
    out.aim=hover?.team==='foe'?hover:{x:ground[0],y:ground[1]};
    if(I.down('s0')){
      if(hover?.team==='foe'||hover?.breakable){
        out.aim=hover;const s=tunedSkill(h,h.slots[0]),range=s?.range||s?.radius||30;
        if(dist(h,hover)>range&&!I.down('stand')){h.walkTarget={x:hover.x,y:hover.y,...(hover.breakable?{propId:hover.id}:{targetId:hover.id})};out.slots[0]=false;}else{h.walkTarget=null;out.slots[0]=true;}
      }else if(hover?.type&&!I.down('stand')){h.walkTarget={x:hover.x,y:hover.y,objectId:hover.id};out.slots[0]=false;}
      else if(!I.down('stand')){h.walkTarget={x:ground[0],y:ground[1]};out.slots[0]=false;}
    }
  }
  if(Math.hypot(...move)>.1)h.walkTarget=null;
  if(h.walkTarget){const target=h.walkTarget.targetId?w.foes.find(f=>f.id===h.walkTarget.targetId):h.walkTarget.propId?w.props.find(p=>p.id===h.walkTarget.propId&&!p.broken):h.walkTarget;if(!target||dist(h,target)<9)h.walkTarget=null;else{
    dir=norm(target.x-h.x,target.y-h.y);out.moveDir=dir;if((h.walkTarget.targetId||h.walkTarget.propId)&&dist(h,target)<(tunedSkill(h,h.slots[0])?.range||35)){out.slots[0]=true;out.moveDir=[0,0];out.aim=target;}
    if(h.walkTarget?.objectId&&dist(h,target)<33){out.interact=true;out.target=w.objects.find(o=>o.id===h.walkTarget.objectId)||w.drops.find(o=>o.id===h.walkTarget.objectId);h.walkTarget=null;out.moveDir=[0,0];}
  }}
  return out;
}
function updatePlay(dt){
  if(!W)return;if(net?.ended)return;if(net&&!net.started){updateVisuals(dt);return;}
  if(attract){updateAttract(dt);return;}
  if(PANEL_STATE){updatePanel(dt);updateVisuals(dt);return;}
  const inputs={};for(let i=0;i<W.heroes.length;i++){const h=W.heroes[i];if(h.follower||h.bot||h.remote)continue;const ii=W.session?game.input:game.players[W.heroes.filter(u=>!u.follower).indexOf(h)]||game.input;inputs[h.id]=localInput(W,h,ii);}
  if(PANEL_STATE)return;
  W.cheats.bot=CHEATS.bot;
  if(!CHEATS.stop)stepWorld(W,dt,inputs);
  if(W.activeEvent){const o=W.activeEvent;o.eventLeft-=dt;if(o.eventLeft<=0){const success=o.type==='unquiet'||W.kills-o.eventKills>=20;if(success){for(const h of W.heroes)for(let i=0;i<(o.type==='cursed'?2:1);i++)dropItem(W,h,o.x+i*8,o.y,{rarity:3});toast('THE PARISH HAS KEPT ITS WORD.');}else toast('The reliquary closes its eye.');W.activeEvent=null;}}
  const h=getMain();if(h?.alive&&h.buffs.conduit>0){h.conduitT=(h.conduitT||0)-dt;if(h.conduitT<0){h.conduitT=.4;const f=closest(W.foes,h,120,u=>u.alive);if(f){dealDamage(W,f,{src:h,amount:damageBase(h)*5,element:'lightning'});fx(W,'chain',{x:h.x,y:h.y,z:17,to:{x:f.x,y:f.y,z:17},color:'#c6bafb'});}}}
  if(h?.buffs.channel>0){h.resource=h.resourceMax;for(const k of Object.keys(h.cooldowns))h.cooldowns[k]=Math.max(0,h.cooldowns[k]-dt*3);}
  if(h&&!h.alive&&h.deathTimer<=0&&(game.input.pressed('confirm')||game.input.pressed('interact'))){reviveHero(W,h);}
  if(h&&!h.alive&&game.input.pressed('portal')){h.x=W.respawn.x;h.y=W.respawn.y;reviveHero(W,h);}
  if(!SESSION&&W.time-lastSaveTime>30){lastSaveTime=W.time;saveGame();}
  if(!W.flags.includes('bookBurned')&&W.zoneTime>20&&Math.floor(W.zoneTime/70)>Math.floor((W.zoneTime-dt)/70)&&!W.dialogue)say(QUILLON[Math.floor(W.rng()*QUILLON.length)]);
  if(W.ended&&W.results&&!SESSION){saveGame();game.go('results');}
  if(!net?.info.server){updateVisuals(dt);talk.update(dt);focusParty();}
}
function drawPlay(r){
  if(net?.info.server){r.sky(['#0d1c24','#172d32']);r.text(TITLE.toUpperCase()+' • WORLD HOST',r.W/2,r.H/2-20,GOLD,{align:'center'});r.text((W?.foes.length||0)+' foes • '+Math.floor(W?.reckoning||0)+'% Reckoning',r.W/2,r.H/2,TEAL,{align:'center'});return;}
  drawWorld(r);if(talk.open&&!PANEL_STATE&&!attract)talk.draw(r);if(PANEL_STATE)r.overlay(g=>drawPanel(g,r));
  if(attract)r.overlay(g=>drawAttractOverlay(g,r));
  const h=getMain();if(h&&!h.alive&&!PANEL_STATE&&!net)r.overlay(g=>{const cx=r.W/2,cy=r.H/2;ornate(g,cx-151,cy-40,302,91,TEAL);text(g,'YOUR NAME IS NOT IN THE BOOK.',cx,cy-24,GOLD,{align:'center'});text(g,'Get up.',cx,cy-10,IVORY,{align:'center',scale:2});text(g,h.deathTimer>0?'RISE IN '+Math.ceil(h.deathTimer)+' SECONDS':prompt('confirm')+' RISE HERE',cx,cy+13,IVORY,{align:'center'});text(g,prompt('portal')+' RISE AT THE LYCHGATE',cx,cy+31,MUTED,{align:'center'});});
}
function updateResults(){const h=getMain(),res=W.results;frontButtons=[];const x=game.W/2,y=game.H/2+22;frontButton('RING AGAIN • TIER '+(W.tier+1),x-110,y,220,25,()=>{startVigil(W,W.tier+1,W.greater);game.go('play');});frontButton('RETURN TO KNELLWICK',x-110,y+33,220,25,()=>{enterZone(W,'town');game.go('play');});frontStep();}
function drawResults(r){drawWorld(r,W,{hud:false});r.overlay(g=>{px.blend(g,.85,'normal',()=>px.rect(g,0,0,r.W,r.H,INK));const res=W.results,cx=r.W/2;E.font.title(g,res?.won?'THE WATCH IS KEPT':'THE BELL FALLS SILENT',cx,r.H/2-82,{align:'center',scale:2,colors:[IVORY,GOLD],depth:1});text(g,'TIER '+W.tier+'  •  '+Math.floor((res?.time||0)/60)+'m '+Math.floor((res?.time||0)%60)+'s',cx,r.H/2-49,TEAL,{align:'center'});text(g,(res?.kills||0)+' DEAD  •  '+(res?.deaths||0)+' DEATHS  •  '+W.bestRequiem+' BEST REQUIEM',cx,r.H/2-27,IVORY,{align:'center'});drawFrontButtons(g);});}
function rescaleParty(before,after){const ratio=(1+Math.max(0,after-1)*TUNE.coopLife)/(1+Math.max(0,before-1)*TUNE.coopLife);for(const f of W.foes){f.maxHp*=ratio;f.hp*=ratio;}}
function leaveCouch(){if(!W||SESSION)return;const local=W.heroes.filter(h=>!h.follower);if(local.length<=1){toast('Only one controller is in the parish.');return;}const seat=game.pausedBy>1?game.pausedBy-1:local.length-1,last=local[seat],input=game.players[seat];W.heroes=W.heroes.filter(h=>h.id!==last.id);(W.couchReserve||=[]).push(last);game.removePlayer(input);rescaleParty(local.length,local.length-1);game.resume();saveGame();toast(last.name+' left the watch.');}
game.allowJoin({max:4,keys:false,onJoin:(I,n)=>{
  if(SESSION||!W||attract){if(game.sceneName==='title'||game.sceneName==='muster'){newCampaign();game.go('play');}else return;}
  const index=game.players.indexOf(I),id=[1,2,3].find(id=>!W.heroes.some(h=>h.id===id)),main=getMain();if(W.heroes.length>=4){const f=W.heroes.find(h=>h.follower);if(f)W.heroes.splice(W.heroes.indexOf(f),1);}
  if(id===undefined)return;const stored=(W.couchReserve||[]).find(h=>h.id===id);if(stored)W.couchReserve.splice(W.couchReserve.indexOf(stored),1);const h=stored||newHero(Object.keys(DB.hero)[id%4],id,main.level,COLORS[index]);h.color=COLORS[index];h.x=main.x+15;h.y=main.y;if(!h.gear[0])h.gear[0]=rollItem(W,h,{slot:0,rarity:2});const before=W.heroes.filter(u=>!u.follower).length;W.heroes.push(h);rescaleParty(before,before+1);I.use(PLAY);if(stored)toast(h.name+' returned to the watch.');else openPanel('join',h.id);
}});
const scenes={
 sessionLoading:{pausable:false,update(){},draw(r){r.sky(['#09121c','#172d32']);r.text('THE PARISH IS GATHERING',r.W/2,r.H/2,GOLD,{align:'center'});}},
 title:{enter:setupTitle,update:updateTitle,draw:drawTitle,input:MENU,pausable:false},
 muster:{enter(){frontFocus=1;titleIdle=0;},update:updateMuster,draw:drawMuster,input:MENU,pausable:false},
 prologue:{enter(){prologuePage=0;frontFocus=0;audio.speak('Narrator',PROLOGUE[0][1]);},update:dt=>updateStory(dt,false),draw:r=>drawStory(r,false),input:MENU,pausable:false},
 play:{pausable:true,view:'iso',input:PLAY,propSize:1.3,camera:{zoom:[.7,1.5],start:1,rotate:false,wheel:false},enter:configureZone,update:updatePlay,draw:drawPlay,back(){if(PANEL_STATE){closePanel();return true;}return false;}},
 ending:{pausable:false,enter(){game.cam.frame(null);audio.setCue('ending');frontFocus=0;},update:dt=>updateStory(dt,true),draw:r=>drawStory(r,true),input:MENU},
 epilogue:{pausable:false,update:updateEpilogue,draw:drawEpilogue,input:MENU},
 results:{pausable:true,enter(){frontFocus=0;audio.setCue('ending');},update:updateResults,draw:drawResults,input:MENU},
 gallery:{pausable:true,enter:configureZone,update:updateGallery,draw(r){drawWorld(r);r.overlay(g=>{smallBox(g,r.W/2-190,48,380,29,TEAL);text(g,W.galleryLabel,r.W/2,54,GOLD,{align:'center'});text(g,prompt('prev')+' / '+prompt('next')+' PREVIEW   '+prompt('cancel')+' RETURN',r.W/2,66,IVORY,{align:'center'});});},input:MENU}
};
game.hook('input',dt=>{
  const g=game;if(net?.ended){for(const I of g.players)I.clear();return;}
  for(const [I,guard]of RESUME_GUARDS){for(const action of [...guard])if(I.down(action))I.suppress(action);else guard.delete(action);if(!guard.size)RESUME_GUARDS.delete(I);}
  const inMenu=!!PANEL_STATE||['title','muster','prologue','ending','epilogue','results','gallery'].includes(g.sceneName)||g.paused||!!g.shell?.screen;
  for(const I of g.players)if(I.preset!==(inMenu?MENU:PLAY))I.use(inMenu?MENU:PLAY);
  if(!net&&!attract&&!PANEL_STATE&&g.sceneName==='play'&&!g.paused&&!g.shell?.screen){
    for(const h of W?.heroes||[]){if(h.remote||h.follower)continue;const I=g.players[W.heroes.filter(u=>!u.follower).indexOf(h)]||g.input;
      for(const [action,panel] of [['inventory','inventory'],['skills','skills'],['journal','journal'],['map','map']])if(I.pressed(action)){openPanel(panel,h.id);break;}
      if(PANEL_STATE)break;
    }
  }
  if(PANEL_STATE){const I=g.players.find(i=>i.player===(W?.heroes.findIndex(h=>h.id===PANEL_STATE.owner)+1))||g.input;if(I.pressed('cancel')||I.pressed('pause')){closePanel();I.suppress('pause');I.suppress('cancel');I.consumeAll();}}
  if(HAS_DOM&&!net){for(const p of navigator.getGamepads?.()||[])if(p&&(p.buttons.some(b=>b.pressed)||p.axes.some(a=>Math.abs(a)>.28))){activity();break;}}
  if(!HAS_DOM&&g.input.anyPressed())lastActivity=g.real;
  if(!net&&!attract&&!PANEL_STATE&&!g.paused&&!g.shell?.screen&&['title','muster'].includes(g.sceneName)&&nowInput()-lastActivity>=10)startAttract();
  networkStep();audio.update();fitShell();
});
if(HAS_DOM){for(const name of ['keydown','mousemove','mousedown','wheel'])window.addEventListener(name,activity,{passive:true});window.addEventListener('touchstart',()=>{lastTouchAt=nowInput();},{passive:true});window.addEventListener('resize',()=>{fitShell();if(PANEL_STATE)buildPanel();});}
game.debug={
  snapshot:()=>({title:TITLE,scene:game.sceneName,zone:W?.zone||null,quest:W?.progress??null,flags:W?.flags||[],heroes:W?.heroes.map(h=>({id:h.id,kind:h.kind,x:Math.round(h.x*10)/10,y:Math.round(h.y*10)/10,hp:Math.round(h.hp),level:h.level,resource:Math.round(h.resource),bag:h.bag.length,alive:h.alive}))||[],foes:W?.foes.length||0,kills:W?.kills||0,reckoning:W?.reckoning||0,attract,attractIndex,session:!!net,authority:W?.authority,device:game.input.lastDevice,tuned:isTuned(),panel:PANEL_STATE?.kind||null,errors:game.errors.length}),
  teleport(x,y){const h=getMain();if(h){h.x=x;h.y=y;h.vx=h.vy=0;game.cam.snap=true;}},
  travel(id){if(!W)newCampaign();enterZone(W,id);game.go('play',null,{fade:0});},
  bot(on=true){CHEATS.bot=on;},newHero:newCampaign,openPanel,closePanel,
};
ROOT.__diabellum={game,talk,stat,DB,TUNE,DEFAULTS,TUNING,CHEATS,ABOUT,VERSION,newWorld,newHero,enterZone,stepWorld,spawnFoe,castSkill,tunedSkill,dealDamage,killFoe,rollItem,dropItem,equipItem,consecrate,salvage,craft,buy,sell,redip,socketGem,extractRelic,gainXP,xpNext,damageBase,serializeWorld,loadWorld,migrateSave,interactNearest,questTarget,objectiveReady,botInput,evade,usePotion,reviveHero,startVigil,passingBell,beginEnding,applyAffix,bossPattern,fx,synthVoice,VOICES,audio,openPanel,closePanel,startAttract,startGallery,updateAttract,ATTRACT,CAMPAIGN,PROLOGUE,ENDING,
  get world(){return W;},set world(v){W=v;},get panel(){return PANEL_STATE;},get net(){return net;},get attract(){return attract;},get frontButtons(){return frontButtons;},render:drawWorld,updateVisuals};
ROOT.__game={game,scenes};
game.start({scenes,scene:SESSION?'sessionLoading':'title'});fitShell();
if(SESSION)connectHub().catch(err=>{ROOT.AIHub.fail(String(err));game.fail('hub',err);});
else if(HAS_DOM){const bits=location.hash.slice(1).split('/'),[mode,id,phase]=bits;
  if(mode==='about')openPanel('about');
  if(mode==='attract')startAttract();
  if(mode==='gallery')startGallery(id,phase,Number(bits[3])||0);
  if(mode==='zone'||mode==='boss'||mode==='vigil'){
    const kind='ringer';newCampaign(kind);getMain().level=mode==='zone'?(DB.zone[id]?.level||1):22;getMain().unlockedAll=true;
    const zoneId=mode==='vigil'?'vigil':mode==='boss'?({beadle:'chapterhouse',regent:'mothcourt',angelus:'chamber'})[id]||'vigil':id;
    if(DB.zone[zoneId]){W.progress=Math.max(0,CAMPAIGN.findIndex(q=>q.zone===zoneId));enterZone(W,zoneId);if(mode==='vigil')W.tier=Number(id)||1;if(mode==='boss'){const f=W.foes.find(f=>f.boss);if(f){f.phase=clamp(Number(phase)||0,0,DB.boss[f.kind].phases.length-1);f.hp=f.maxHp*DB.boss[f.kind].phases[f.phase].at;}}game.go('play',null,{fade:0});}
  }
}
