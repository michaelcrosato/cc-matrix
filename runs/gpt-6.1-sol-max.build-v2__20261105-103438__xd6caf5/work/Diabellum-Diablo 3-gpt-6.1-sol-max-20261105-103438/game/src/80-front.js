let frontButtons=[],previewHeroes=[],titleClock=0,galleryReturn=null,galleryClock=0,galleryStep=0;
const nowInput=()=>HAS_DOM?performance.now()/1000:game.real;
let lastTouchAt=-10;
function activity(e){
  if(e&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents||nowInput()-lastTouchAt<.8&&e.type?.startsWith('mouse')))return;
  lastActivity=nowInput();titleIdle=0;externalInput=true;
  if(attract&&!net){attract=false;attractClock=0;PANEL_STATE=null;W=null;viewRigs.clear();game.go('title',null,{fade:.15});}
}
function setupTitle(){
  titleClock=0;lastActivity=nowInput();frontFocus=game.saves.latest()?0:1;PANEL_STATE=null;audio.resume();audio.setCue('title');game.cam.frame(null);game.cam.bounds=null;game.focus(380,380,25);game.cam.snap=true;game.setZoom(1);
  game.lights.enabled=true;game.lights.ambient=.5;game.weather={kind:'rain',amount:.5,wind:.15,lightning:.09};
  previewHeroes=Object.keys(DB.hero).map((kind,i)=>{const h=newHero(kind,800+i,18);h.x=350+(i-1.5)*36;h.y=420+(i-1.5)*14;return h;});
}
function frontButton(label,x,y,w,h,fn,o={}){frontButtons.push({label,x,y,w,h,fn,...o});}
function frontStep(I=game.input){
  let acted=false;const pointer=I.pointer(),click=I.clicked();
  if(pointer&&['mouse','touch'].includes(I.lastDevice))for(let i=0;i<frontButtons.length;i++){const b=frontButtons[i];if(pointer[0]>=b.x&&pointer[0]<=b.x+b.w&&pointer[1]>=b.y&&pointer[1]<=b.y+b.h)frontFocus=i;}
  if(I.repeat('down')||I.repeat('right')){frontFocus=(frontFocus+1)%frontButtons.length;audio.sound('select');}
  if(I.repeat('up')||I.repeat('left')){frontFocus=(frontFocus+frontButtons.length-1)%frontButtons.length;audio.sound('select');}
  if(click){const b=frontButtons.find(b=>click[0]>=b.x&&click[0]<=b.x+b.w&&click[1]>=b.y&&click[1]<=b.y+b.h);if(b&&!b.disabled){b.fn();acted=true;}}
  else if(I.pressed('confirm')||I.pressed('start')){const b=frontButtons[frontFocus];if(b&&!b.disabled){b.fn();acted=true;}}
  if(acted)I.consumeAll();return acted;
}
function drawFrontButtons(g){for(let i=0;i<frontButtons.length;i++){const b=frontButtons[i],sel=i===frontFocus;smallBox(g,b.x,b.y,b.w,b.h,b.disabled?'#344247':sel?GOLD:'#536d6a',.96);if(sel&&!b.disabled)px.rect(g,b.x+3,b.y+3,2,b.h-6,TEAL);text(g,b.label,b.x+b.w/2,b.y+(b.h-7)/2,b.disabled?'#617071':sel?IVORY:MUTED,{align:'center'});}}
function updateTitle(dt){
  titleClock+=dt;for(let i=0;i<previewHeroes.length;i++){const h=previewHeroes[i];ensureRig(h,true).update(dt,{x:h.x,y:h.y,z:0,vx:0,vy:0,facing:-.6+i*.23,pose:Math.sin(titleClock*.3+i)>.9?'guard':null});}
  buildTitleButtons();if(PANEL_STATE){updatePanel(dt);return;}frontStep();
}
function buildTitleButtons(){const Wd=game.W,H=game.H,tall=H>Wd*.82;frontButtons=[];const x=tall?Wd/2-84:27,y=tall?H*.61:Math.max(119,H*.48),bw=168,bh=22;const latest=game.saves.latest();
  [['CONTINUE',()=>{loadSaved();},!latest],['NEW HERO',()=>{selectedHero=0;frontFocus=0;game.go('muster');}],['LOAD A HERO',()=>game.saves.show('load',()=>game.go('play')),!latest],['SETTINGS',()=>game.menu('settings')],['ABOUT AND CREDITS',()=>openPanel('about')]].forEach(([label,fn,disabled],i)=>frontButton(label,x,y+i*26,bw,bh,fn,{disabled}));
}
function drawTitleBackdrop(r){
  r.sky(['#09121c','#1c3034','#343c3d']);
  r.decal(g=>{const p=[r.w(215,200,0),r.w(545,200,0),r.w(545,550,0),r.w(215,550,0)];px.poly(g,p,'#273b3e');for(let i=0;i<16;i++){const a=r.w(210+i*22,200,0),b=r.w(210+i*22,550,0);px.line(g,...a,...b,i%3?'#31484a':'#435453');}for(let i=0;i<16;i++){const a=r.w(215,200+i*22,0),b=r.w(545,200+i*22,0);px.line(g,...a,...b,'#1c3035');}});
  drawGlass(r,380,365,0,115);
  for(const x of [250,510])for(const y of [265,410]){r.shape('spire',x,y,0,{scale:1.8});r.prop('candelabra',x-13,y+13,0,{size:1.8,light:true});}
  for(let i=0;i<3;i++)r.prop('window',330+i*50,270-i*16,62,{size:3.2,colors:['#7ca6b2','#b2787a','#d1b573'],light:true});
  r.shape('parishBell',397,372,10,{scale:3.7,facing:Math.sin(titleClock*.4)*.06});r.shape('chain',397,372,125,{scale:1.1});
  for(let i=0;i<12;i++){const a=i*Math.PI/6;r.prop('candle',397+Math.cos(a)*74,372+Math.sin(a)*74,0,{size:1.6,light:true});}
  for(const h of previewHeroes){const rig=ensureRig(h,true);r.shadow(h.x,h.y,7,.35);r.actor(h.x,h.y,0,(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{xray:true});game.lights.add(h.x,h.y,20,65,.65,{color:DB.hero[h.kind].color});}
  game.lights.add(397,372,35,160,.7,{color:'#cfb37e'});
}
function drawTitle(r){
  drawTitleBackdrop(r);r.overlay(g=>{
    const tall=r.H>r.W*.82,lx=tall?r.W/2:27,ly=tall?65:31;
    px.blend(g,.68,'normal',()=>{if(tall)px.rect(g,0,20,r.W,117,INK);else px.poly(g,[[0,0],[245,0],[213,r.H],[0,r.H]],INK);});
    text(g,'THE VESPER REACH',lx,ly,TEAL,{align:tall?'center':'left'});
    E.font.title(g,TITLE.toUpperCase(),lx,ly+18,{align:tall?'center':'left',scale:tall?5:4,colors:['#f3e5c0','#d2b173','#8f7448'],depth:2,depthColor:'#33392f',outline:'#121c22'});
    text(g,'EVERY SOUL COUNTED. EXCEPT YOURS.',lx,ly+(tall?65:55),IVORY,{align:tall?'center':'left'});
    if(tall){text(g,'FOUR UNRUNG. NINE BELLS. ONE HUNGRY SILENCE.',r.W/2,r.H*.57,MUTED,{align:'center'});}
    drawFrontButtons(g);
    text(g,'1-4 PLAYERS  •  A GOTHIC ACTION RPG',r.W-17,r.H-31,GOLD,{align:'right'});
    text(g,'OPTIONS ON A SECOND CONTROLLER TO JOIN',r.W-17,r.H-18,MUTED,{align:'right'});
    px.line(g,14,13,r.W-15,13,'#53635c');px.line(g,14,r.H-9,r.W-15,r.H-9,'#53635c');
    if(PANEL_STATE)drawPanel(g,r);
  });
}
function updateMuster(dt){
  titleClock+=dt;const kinds=Object.keys(DB.hero),h=previewHeroes[selectedHero];
  if(game.input.pressed('left')){selectedHero=(selectedHero+3)%4;activity();}
  if(game.input.pressed('right')){selectedHero=(selectedHero+1)%4;activity();}
  for(let i=0;i<previewHeroes.length;i++){const hero=previewHeroes[i],rig=ensureRig(hero,true);rig.update(dt,{x:hero.x,y:hero.y,z:0,vx:0,vy:0,facing:-Math.PI/4,attack:i===selectedHero?E.move(DB.hero[hero.kind].skills[0]==='clap'?'twohand':hero.kind==='sexton'?'overhead':'cast',(titleClock%3)/3):null,pose:i===selectedHero?'ready':null});}
  frontButtons=[];for(const action of ['left','right','up','down'])game.input.suppress(action);if(game.input.lastDevice!=='mouse')frontFocus=1;const x=game.W/2,y=game.H-50;
  frontButton('←',x-166,y,28,23,()=>selectedHero=(selectedHero+3)%4);frontButton('BEGIN THE WATCH',x-130,y,260,23,()=>{newCampaign(kinds[selectedHero]);prologuePage=0;game.go('prologue');});frontButton('→',x+138,y,28,23,()=>selectedHero=(selectedHero+1)%4);
  const I=game.input;if(I.pressed('up')||I.pressed('down'))frontFocus=1;frontStep(I);if(I.pressed('cancel'))game.go('title');
}
function drawMuster(r){drawTitleBackdrop(r);r.overlay(g=>{px.blend(g,.86,'normal',()=>px.rect(g,0,0,r.W,76,INK));const h=DB.hero[Object.keys(DB.hero)[selectedHero]];text(g,'CHOOSE AN UNCOUNTED SOUL',r.W/2,22,TEAL,{align:'center'});E.font.title(g,h.name.toUpperCase(),r.W/2,40,{align:'center',scale:2,colors:[IVORY,GOLD],depth:1});smallBox(g,26,r.H-108,r.W-52,51,TEAL);text(g,h.title.toUpperCase()+' • '+h.resource,r.W/2,r.H-98,GOLD,{align:'center'});text(g,h.blurb,r.W/2,r.H-82,IVORY,{align:'center'});drawFrontButtons(g);text(g,'← → CHOOSE   '+prompt('confirm')+' BEGIN   '+prompt('cancel')+' BACK',r.W/2,r.H-16,MUTED,{align:'center'});});}
function drawStory(r,ending=false){
  drawTitleBackdrop(r);r.overlay(g=>{px.blend(g,.9,'normal',()=>px.rect(g,0,0,r.W,r.H,INK));const data=ending?ENDING:PROLOGUE,index=ending?W.endingPage:prologuePage,[heading,line]=data[Math.min(index,data.length-1)],cx=r.W/2,yy=r.H/2-40;
    for(let i=0;i<data.length;i++){const x=cx-(data.length-1)*24+i*48,c=i<=index?GOLD:'#364e52';px.poly(g,[[x-14,yy-26],[x,yy-48],[x+14,yy-26],[x+14,yy-8],[x-14,yy-8]],'#253d44');bellArt(g,x,yy-26,.65,Math.sin(titleClock*.4)*.1);px.line(g,x-14,yy-8,x+14,yy-8,c);}
    E.font.title(g,heading,cx,yy+9,{align:'center',scale:2,colors:[IVORY,GOLD],depth:1});const lines=E.font.wrap(line,Math.min(344,r.W-50));for(let i=0;i<lines.length;i++)text(g,lines[i],cx,yy+43+i*13,IVORY,{align:'center'});
    drawFrontButtons(g);
  });
}
function buildStoryButtons(ending){const data=ending?ENDING:PROLOGUE,index=ending?W.endingPage:prologuePage,cx=game.W/2;frontButtons=[];frontButton(index<data.length-1?'NEXT VERSE':'RING OUT',cx-84,game.H-50,168,24,()=>advanceStory(ending));frontButton(ending?'FINISH THE VERSE':'SKIP THE VERSE',cx-84,game.H-20,168,14,()=>{if(ending){W.endingPage=ENDING.length;finishEnding();}else game.go('play');});}
function advanceStory(ending){if(ending){W.endingPage++;W.endingT=0;if(W.endingPage>=ENDING.length){finishEnding();return;}audio.speak(W.endingPage===2?'Mother Quillon':'Narrator',ENDING[W.endingPage][1]);}else{prologuePage++;if(prologuePage>=PROLOGUE.length){game.go('play');return;}audio.speak('Narrator',PROLOGUE[prologuePage][1]);}audio.bell(130+prologuePage*12,.12);}
function finishEnding(){W.flags.push('endingSeen');W.ended=false;saveGame();game.go('epilogue');}
function updateStory(dt,ending){buildStoryButtons(ending);titleClock+=dt;if(ending)W.endingT+=dt;frontStep();if(game.input.pressed('cancel')){if(ending)finishEnding();else game.go('play');}}
function updateEpilogue(){frontButtons=[];const x=game.W/2,y=game.H/2+12;frontButton('THE LONG VIGIL',x-100,y,200,25,()=>{startVigil(W,1);game.go('play');});frontButton('RETURN TO KNELLWICK',x-100,y+32,200,25,()=>{enterZone(W,'town');game.go('play');});frontButton('ABOUT AND CREDITS',x-100,y+64,200,23,()=>openPanel('about'));if(PANEL_STATE)updatePanel(1/120);else frontStep();}
function drawEpilogue(r){drawTitleBackdrop(r);r.overlay(g=>{px.blend(g,.84,'normal',()=>px.rect(g,0,0,r.W,r.H,INK));E.font.title(g,'THE BOOK IS ASH',r.W/2,r.H/2-58,{align:'center',scale:3,colors:[IVORY,GOLD],depth:2});text(g,'The watch is yours to keep.',r.W/2,r.H/2-21,TEAL,{align:'center'});drawFrontButtons(g);if(PANEL_STATE)drawPanel(g,r);});}
function startAttract(){
  if(net)return;attract=true;PANEL_STATE=null;attractClock=0;attractIndex=0;loadVignette();game.go('play',null,{fade:.2});
}
function loadVignette(){
  const vignette=ATTRACT[attractIndex%ATTRACT.length];viewRigs.clear();W=newWorld(7129+attractIndex);W.attract=true;W.progress=Math.max(0,CAMPAIGN.findIndex(q=>q.zone===vignette.zone));W.flags=['quillonRescued'];W.heroes=Object.keys(DB.hero).map((kind,i)=>{const h=newHero(kind,i,24);h.bot=true;h.unlockedAll=true;h.slots=[...DB.hero[kind].skills.slice(0,5),DB.hero[kind].skills[7]];const relic=rollItem(W,h,{rarity:4,relic:Object.values(DB.relic).find(r=>r.hero===kind).id});relic.identified=true;h.gear[relic.slot]=relic;return h;});W.me=Object.keys(DB.hero).indexOf(vignette.hero);W.cheats={god:true,infinite:true,noCD:true,bot:true};enterZone(W,vignette.zone);
  if(!['town','chapterhouse','mothcourt','chamber'].includes(vignette.zone)){const h=getMain();for(let i=0;i<30;i++){const a=i/30*Math.PI*2;spawnFoe(W,DB.zone[vignette.zone].pool[0],h.x+Math.cos(a)*(45+i%3*9),h.y+Math.sin(a)*(45+i%3*9));}dropItem(W,h,h.x+35,h.y,{rarity:4});}
  attractClock=0;game.cam.snap=true;
}
function updateAttract(dt){
  attractClock+=dt;const vignette=ATTRACT[attractIndex%ATTRACT.length];if(attractClock>vignette.seconds){attractIndex=(attractIndex+1)%ATTRACT.length;loadVignette();}
  if(attractClock>7&&attractClock<7+dt*2){const f=W.foes.find(f=>f.boss);if(f){f.hp=f.maxHp*.45;f.phase=1;}}
  if((attractIndex===3||attractIndex===6)&&attractClock>=8&&attractClock<11&&!W.uiShown){
    W.uiShown=true;const h=getMain();if(attractIndex===3){const item=rollItem(W,h,{rarity:4,relic:'firstSoil'});item.identified=true;h.bag.push(item);openPanel('inventory',h.id);}else{h.tones[h.slots[5]]=1;openPanel('skills',h.id);PANEL_STATE.slot=5;PANEL_STATE.skill=7;buildPanel();}
  }
  if(W.uiShown&&PANEL_STATE&&attractClock>=11){const h=getMain();if(h.bag.length)equipItem(W,h,h.bag.at(-1));PANEL_STATE=null;}
  if(vignette.zone==='town')for(let i=0;i<W.heroes.length;i++){const h=W.heroes[i];h.x+=Math.sin(W.time*.4+i)*dt*15;h.y+=Math.cos(W.time*.4+i)*dt*15;}
  stepWorld(W,dt);updateVisuals(dt);focusParty();
}
function drawAttractOverlay(g,r){const v=ATTRACT[attractIndex%ATTRACT.length];smallBox(g,14,14,128,20,GOLD);text(g,TITLE.toUpperCase()+' • DEMONSTRATION',20,21,GOLD);const yy=r.H-75;smallBox(g,r.W/2-148,yy,296,24,TEAL);text(g,'PRESS ANY BUTTON TO TAKE THE WATCH',r.W/2,yy+9,IVORY,{align:'center'});text(g,v.title,r.W/2,50,IVORY,{align:'center'});}
function startGallery(mode=null,id=null,phase=0){
  galleryReturn=W;W=newWorld(721);W.gallery=true;W.progress=3;W.heroes=[newHero('ringer',0,30)];W.heroes[0].unlockedAll=true;W.flags=['quillonRescued'];W.cheats={god:true,infinite:true,noCD:true,freezeAI:true};enterZone(W,'nave');W.foes=[];W.heroes[0].x=W.width*.5;W.heroes[0].y=W.height*.5;galleryClock=0;galleryStep=0;viewRigs.clear();game.go('gallery',null,{fade:.1});if(mode==='skill'&&DB.skill[id])galleryStep=Object.keys(DB.skill).indexOf(id)*3+phase%3;galleryNext();if(mode==='monster'&&DB.monster[id]){W.foes=[];const h=getMain();spawnFoe(W,id,h.x+45,h.y);W.galleryLabel=DB.monster[id].name;}if(mode==='boss'&&DB.boss[id]){W.foes=[];const h=getMain(),f=spawnFoe(W,id,h.x+80,h.y,{boss:true});f.phase=phase%DB.boss[id].phases.length;f.hp=f.maxHp*DB.boss[id].phases[f.phase].at;W.galleryLabel=DB.boss[id].name+' • phase '+(f.phase+1);bossPattern(W,f,h);}
}
function galleryNext(){
  const skills=Object.values(DB.skill),index=Math.floor(galleryStep/3)%skills.length,s=skills[index],tone=galleryStep%3,old=getMain(),h=newHero(s.hero,0,30);h.unlockedAll=true;h.x=old.x;h.y=old.y;h.tones[s.id]=tone;h.resource=100;W.heroes=[h];W.foes=[];W.corpses=[];W.hazards=[];W.shots=[];
  const kinds=Object.keys(DB.monster);for(let i=0;i<10;i++){const f=spawnFoe(W,kinds[(galleryStep+i)%kinds.length],h.x+45+(i%3)*20,h.y-25+Math.floor(i/3)*20,{elite:i===0?'rare':null});if(i===0)f.affixes=[Object.keys(DB.affix)[galleryStep%12]];}
  if(s.verb==='corpse')for(let i=0;i<3;i++){const b=new E.Body({x:h.x+55+i*9,y:h.y});Object.assign(b,{age:0,id:W.uid++,used:false,kind:'digger'});W.corpses.push(b);}
  castSkill(W,h,s.id,{x:h.x+70,y:h.y},true);W.galleryLabel=DB.hero[s.hero].title+' • '+s.name+' / '+s.tones[tone].name;
  if(galleryStep%9===8){const boss=Object.keys(DB.boss)[Math.floor(galleryStep/9)%6],f=spawnFoe(W,boss,h.x+100,h.y-40,{boss:true});f.phase=Math.floor(galleryStep/(9*6))%DB.boss[boss].phases.length;f.hp=f.maxHp*DB.boss[boss].phases[f.phase].at;bossPattern(W,f,h);W.galleryLabel=DB.boss[boss].name+' • phase '+(f.phase+1);}
}
function updateGallery(dt){const before=galleryClock;galleryClock+=dt;stepWorld(W,dt);if(Math.floor(galleryClock/.85)!==Math.floor(before/.85)){const boss=W.foes.find(f=>f.boss);if(boss)bossPattern(W,boss,getMain());}updateVisuals(dt);focusParty();if(galleryClock>5||game.input.pressed('next')){galleryClock=0;galleryStep++;galleryNext();}if(game.input.pressed('prev')){galleryClock=0;galleryStep=Math.max(0,galleryStep-1);galleryNext();}if(game.input.pressed('cancel')){W=galleryReturn||W;viewRigs.clear();game.go('play');}}
