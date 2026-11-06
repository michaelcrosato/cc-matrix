import * as THREE from 'three/webgpu';
import {Game,initPhysics,course,DEFAULTS,SECTORS,LENGTH} from './game.js';
import {createJet,createEnemy,createRiverScene} from './art.js';
import {AudioEngine} from './audio.js';
import {Network} from './hub.js';
import credits from './credits.json';
const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const audio=new AudioEngine();
let settings={music:.1,sfx:.65,glyphs:'PlayStation',autoFire:false,shake:true};
try{Object.assign(settings,JSON.parse(localStorage.getItem('razzle-settings')||'{}'));}catch{}
audio.setMusic(settings.music);audio.setSfx(settings.sfx);
let mode='title',returnMode='title',lastUsed='keyboard',lastInput=performance.now(),focusIndex=0,localPlayers=1,game,renderer,scene,camera,river,ready=false,preview=false,finishHandled=false,resultAt=0,lastRadio=0,flash=0,shake=0,net,netStatus={},participantIds=[],remoteInputs={},remoteSnapshot=null,networkDelay=0,renderCount=0;
const pulseUntil=[0,0],fireUntil=[0,0];
let consumePad=false;
const keys=new Set(),heldPad=new Set(),visuals=new Map(),effects=[];
const mouse={x:0,y:0,fire:false,target:undefined,engaged:false};const touch={active:false,id:null,x:0,y:0,dx:0,dy:0,pulse:false};
let lastPointer={x:0,y:0},frameDt=0,accumulator=0,hudTick=0,lastEventTime=-1,worldEvents=[];
const glyph=(ps,xbox,k)=>lastUsed==='gamepad'?(settings.glyphs==='Xbox'?xbox:ps):k;
const prompt=(ps,xbox,k)=>`<span class="glyph" data-ps="${ps}" data-xbox="${xbox}" data-key="${k}">${glyph(ps,xbox,k)}</span>`;
function save(){try{localStorage.setItem('razzle-settings',JSON.stringify(settings));}catch{}}
function activity(type='keyboard'){
 const wasAttract=mode==='attract';lastInput=performance.now();const changed=lastUsed!==type;lastUsed=type;if(changed)document.querySelectorAll('[data-ps]').forEach(el=>el.textContent=type==='gamepad'?(settings.glyphs==='Xbox'?el.dataset.xbox:el.dataset.ps):el.dataset.key);document.body.classList.toggle('touch-mode',type==='touch');
 if(wasAttract){startTitle();return true;}return false;
}
function wakeAudio(){audio.unlock().catch(()=>{});}
function navItems(){return [...$('screens').querySelectorAll('[data-nav]')].filter(e=>!e.disabled&&e.offsetParent!==null);}
function setFocus(i,focusDom=false){const items=navItems();focusIndex=(i+items.length)%Math.max(1,items.length);items.forEach((e,j)=>e.classList.toggle('focused',j===focusIndex));if(focusDom)items[focusIndex]?.focus({preventScroll:true});if(focusDom)items[focusIndex]?.scrollIntoView({block:'nearest'});}
function bindScreen(){focusIndex=0;setFocus(0);$('screens').querySelectorAll('[data-nav]').forEach(e=>{e.addEventListener('pointerenter',()=>{const idx=navItems().indexOf(e);if(idx>=0)setFocus(idx);});});}
const btn=(label,action,small='',cls='')=>`<button data-nav data-action="${action}" class="${cls}">${label}${small?`<small>${small}</small>`:''}</button>`;
function panel(eyebrow,title,body,wide=false){return `<section class="screen"><div class="panel ${wide?'wide':''}"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${body}</div></section>`;}
function show(next){
 mode=next;preview=false;$('screens').classList.toggle('hidden',next==='playing'||next==='attract');$('hud').classList.toggle('hidden',!['playing','attract','pause','dev'].includes(next));$('attractBanner').classList.toggle('hidden',next!=='attract');audio.setState(next==='pause'?'paused':next);document.body.dataset.mode=next;
 if(next==='playing'||next==='attract'){keys.clear();return;}
 let html='';
 if(next==='waiting')html=panel('AI HUB CO-OP','Wing standing by.',`<p>Waiting for the shared flight countdown.</p><p class="small">Your seat and wingmate are managed by AI Hub.</p>`);
 if(next==='title')html=`<section class="screen title-screen"><div class="title-content"><div class="eyebrow">AN ARCADE RIVER SORTIE</div><h1>RIVER<span>RAZZLE</span></h1><p class="subtitle">Low altitude. High mischief.</p><div class="menu">${btn('FLY SOLO','solo','01 PILOT')}${btn('BRING A WINGMATE','coop','02 PILOTS')}${btn('FLIGHT SCHOOL','help','','quiet')}${btn('SETTINGS & CREDITS','options','','quiet')}</div><div class="title-foot">FOUR SECTORS. ONE WAY UPSTREAM.<br><span id="titleInput">${prompt('✕','A','Enter')} SELECT &nbsp; ${prompt('↕','↕','↑↓')} NAVIGATE</span></div></div><div class="corner-tag">RIVER PATROL / FIELD EDITION<br>EST. 1982 · REIMAGINED 2026</div><div class="side-stamp"><div><small>FLY LOW • AIM HIGH</small><b>04</b><small>BRIDGES TO TROUBLE</small></div></div></section>`;
 if(next==='pause')html=panel('FLIGHT ON HOLD','Catch your breath.',`<p>The river can wait a moment.</p><div class="menu">${btn('RESUME FLIGHT','resume')}${btn('FLIGHT SCHOOL','help')}${btn('SETTINGS','settings')}${btn('DEV HANGAR','dev')}${btn('ABORT SORTIE','abort','','quiet')}</div>`);
 if(next==='options')html=panel('GROUND CREW','Make yourself at home.',`<div class="menu">${btn('SETTINGS','settings')}${btn('ABOUT & CREDITS','about')}${btn('BACK TO FLIGHT LINE','back','','quiet')}</div>`);
 if(next==='help')html=panel('FLIGHT SCHOOL','Your river. Your rules.',`<div class="control-grid"><div class="control-card"><b>01 / SKIM THE RIVER</b><p>${prompt('L','L','WASD / ↑↓←→')} Steer. Push up to accelerate; pull down to brake. Banks and islands hurt.</p></div><div class="control-card"><b>02 / KEEP IT LOUD</b><p>${prompt('✕ / R2','A / RT','Space / LMB')} Hold to fire. Destroy boats, helicopters, jets and bridges.</p></div><div class="control-card"><b>03 / FUEL IS YOUR LIFELINE</b><p>Fly over the mint fuel pads. Slow down and release fire to fill up. Shoot spare pads for points.</p></div><div class="control-card"><b>04 / MAKE SOME ROOM</b><p>${prompt('□','X','E / RMB')} Pulse clears nearby threats. Recharges in 11 seconds. Bridges save your progress and grant a reserve.</p></div></div><p class="small">Mouse: move to steer across the river. Touch: drag anywhere to steer; firing and fuel approach are assisted. Tap PULSE when ready.<br>Two on one screen: pilot 1 uses WASD / Space / E; pilot 2 uses arrows / Enter / Right Shift. Or use two controllers. Share fuel, score and reserves.</p><div class="menu">${btn('ROGER THAT','back')}</div>`,true);
 if(next==='settings')html=panel('GROUND CREW','Tune your sortie.',`<div class="row"><label for="music">Music</label><input data-nav id="music" type="range" min="0" max="100" value="${Math.round(settings.music*100)}"><output id="musicVal">${Math.round(settings.music*100)}%</output></div><div class="row"><label for="sfx">Effects & radio</label><input data-nav id="sfx" type="range" min="0" max="100" value="${Math.round(settings.sfx*100)}"><output id="sfxVal">${Math.round(settings.sfx*100)}%</output></div><div class="row"><span>Controller prompts</span><button data-nav class="toggle" data-action="glyphs">${settings.glyphs}</button></div><div class="row"><span>Automatic fire</span><button data-nav class="toggle" data-action="autofire">${settings.autoFire?'ON':'OFF'}</button></div><div class="row"><span>Camera shake</span><button data-nav class="toggle" data-action="shake">${settings.shake?'ON':'OFF'}</button></div><div class="menu">${btn('BACK','back','','quiet')}</div>`);
 if(next==='coop')html=panel('TWO PILOTS / ONE RIVER','Bring a wingmate.',`<p>Share the fuel, split the trouble. Both pilots fly together.</p><div class="menu">${btn('TWO ON THIS SCREEN','local2','2 PADS / KEYBOARD')}${btn('CREATE TAB ROOM','create','SAME BROWSER')}</div><div id="netStatus">${netStatus.message||'Across devices: launch a co-op room in AI Hub.'}</div><div id="roomCode">${netStatus.code||''}</div><div class="room-actions"><input data-nav id="joinCode" maxlength="6" aria-label="Tab room code" placeholder="ROOM CODE"><button data-nav data-action="join">JOIN</button></div><div id="roomStart" class="menu ${netStatus.mode==='room'&&netStatus.isHost?'':'hidden'}">${btn('LAUNCH WING','roomstart','HOST')}${btn('CLOSE ROOM','leaveroom','','quiet')}</div><p class="small">Tab rooms connect pages on this browser and origin. For Internet co-op, use AI Hub. On one screen, a second controller joins pilot 2.</p><div class="menu">${btn('BACK','back','','quiet')}</div>`);
 if(next==='dev')html=panel('DEV HANGAR / LIVE BALANCE','Test the limits.',`<div class="control-grid"><div>${Object.entries({speed:['Cruise speed',8,36,.5],steering:['Steering',8,32,1],fuelDrain:['Fuel drain',0,6,.1],fireRate:['Fire rate',2,18,1],damage:['Shot damage',.5,5,.5],enemyFire:['Enemy fire',0,3,.1]}).map(([key,[name,min,max,step]])=>`<div class="row"><label for="dev-${key}">${name}</label><input data-nav data-var="${key}" id="dev-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${game.config[key]}"><output>${game.config[key]}</output></div>`).join('')}</div><div><div class="row"><span>Invincible</span><button data-nav class="toggle" data-action="god">${game.god?'ON':'OFF'}</button></div><div class="row"><span>AI pilot</span><button data-nav class="toggle" data-action="auto">${game.auto?'ON':'OFF'}</button></div><div class="row"><span>Live preview</span><button data-nav class="toggle" data-action="preview">OFF</button></div><div class="menu">${btn('NEXT SECTOR','skip')}${btn('REFILL & REPAIR','refill')}${btn('CLEAR THREATS','clear')}${btn('RESET DEFAULTS','defaults','','quiet')}</div></div></div><div class="menu">${btn('BACK TO FLIGHT','resume')}</div><p class="small">Changes apply immediately. Dev tools are available for local sorties; network rounds use host settings.</p>`,true);
 if(next==='about')html=panel('ABOUT / FIELD NOTES','Made for the river.',`<p>An original arcade sortie inspired by Carol Shaw’s River Raid. Procedural models, ink edges, synthetic sound. No external art or audio assets.</p>${creditMarkup()}<div class="menu">${btn('BACK','back','','quiet')}</div>`,true);
 if(next==='result'){
  const s=currentState(),best=Number(localStorage.getItem('razzle-best')||0),won=s.won;
  html=panel(won?'MISSION COMPLETE':'SORTIE OVER',won?'A clean getaway.':'One more run?',`<p>${won?'Four blockades cracked. The river is yours.':'Watch your fuel. Know your river. Come back swinging.'}</p><div class="result-stats"><div><b>${String(s.score).padStart(6,'0')}</b><small>SCORE</small></div><div><b>${s.bridges}/4</b><small>BLOCKADES</small></div><div><b>${s.stats?.kills||0}</b><small>TARGETS</small></div></div><p class="small">BEST ${Math.max(best,s.score).toLocaleString()} &nbsp; · &nbsp; FLIGHT ${Math.floor(s.time/60)}:${String(Math.floor(s.time%60)).padStart(2,'0')} &nbsp; · &nbsp; ${s.stats?.refuels||0} FUEL STOPS</p><div class="menu">${net?.embedded?'<p class="small">ROUND COMPLETE · Return with AI Hub when ready.</p>':btn('FLY AGAIN','again')+btn('FLIGHT LINE','abort','','quiet')}</div>`);
 }
 $('screens').innerHTML=html;bindScreen();
}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function creditMarkup(){const si=credits.sourceInformation;return `<div class="credit-section"><h3>Source Information</h3><dl>${Object.entries(si).map(([k,v])=>`<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`).join('')}</dl><p>Research: <a href="https://www.atariage.com/2600/manuals_old/river_raid.html" target="_blank" rel="noopener">1982 Activision manual</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub integration</a></p></div>${['testingFeedback','engineFeedback','promptFeedback'].map(key=>`<div class="credit-section"><h3>${key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}</h3>${credits[key].map((s,i)=>`<p>${i+1}. ${escape(s)}</p>`).join('')}</div>`).join('')}<div class="credit-section"><h3>Open source</h3><p>Three.js © its authors, MIT. Rapier © Dimforge, Apache-2.0. Third-party license texts are included in this HTML source and the development folder. River Raid is credited for inspiration; this is an independent original game.</p></div>`;}
function goSub(next){returnMode=mode;show(next);}
function startTitle(){if(net?.active&&!net.embedded)net.leaveRoom();remoteSnapshot=null;remoteInputs={};game.reset(1,true);game.warp(130);game.step(1/60);game.fuel=100;finishHandled=false;lastInput=performance.now();show('title');$('radio').classList.remove('show');}
function startGame(count=1,attract=false){mouse.engaged=false;mouse.fire=false;pulseUntil.fill(0);fireUntil.fill(0);previousSector=-1;localPlayers=count;game.reset(count,attract);remoteSnapshot=null;finishHandled=false;resultAt=0;lastEventTime=-1;worldEvents=[];accumulator=0;show(attract?'attract':'playing');wakeAudio();if(!attract)radio('UPSTREAM PATROL','KEEP IT LOW. KEEP IT MOVING.');}
function back(){if(mode==='title'||mode==='waiting'||(net?.embedded&&mode==='result'))return;if(mode==='pause'){show('playing');return;}if(mode==='result'){startTitle();return;}if(mode==='coop'&&net?.active&&!net.embedded)net.leaveRoom();const target=returnMode;returnMode='title';show(target==='playing'?'pause':target==='settings'?'options':target);}
function action(name){
 wakeAudio();audio.play('menu');
 if(net?.embedded&&['solo','local2','again','abort','create','join'].includes(name))return;
 if(name==='solo')return startGame(1);
 if(name==='local2')return startGame(2);
 if(name==='resume')return show('playing');
 if(name==='abort'){if(net?.active){net.finish(game.score,false,{aborted:true});if(!net.embedded)net.leaveRoom();}return startTitle();}
 if(name==='again'){if(net?.active&&!net.embedded)net.leaveRoom();return startGame(localPlayers);}
 if(['coop','help','options','settings','about'].includes(name))return goSub(name);
 if(name==='dev'){if(net?.active){radio('GROUND CREW','DEV TOOLS ARE LOCAL FLIGHT ONLY.');return;}return goSub('dev');}
 if(name==='back')return back();
 if(name==='glyphs'){settings.glyphs=settings.glyphs==='Xbox'?'PlayStation':'Xbox';save();show('settings');}
 if(name==='autofire'||name==='shake'){settings[name==='autofire'?'autoFire':'shake']=!settings[name==='autofire'?'autoFire':'shake'];save();show('settings');}
 if(name==='god'||name==='auto'){game[name]=!game[name];show('dev');}
 if(name==='preview'){preview=!preview;document.querySelector('[data-action="preview"]').textContent=preview?'ON':'OFF';}
 if(name==='refill'){game.fuel=100;game.lives=4;game.players.forEach(p=>{p.hp=3;p.inv=5;});radio('GROUND CREW','TOPPED UP. PATCHED UP.');}
 if(name==='clear'){game.entities.filter(e=>!['fuel','bridge','boss'].includes(e.kind)).forEach(e=>game.destroy(e,false));}
 if(name==='skip'){const next=Math.min(3,Math.floor(game.distance/LENGTH)+1);game.checkpoint=next*LENGTH;game.bridges=next;game.warp(next*LENGTH);radio('DEV HANGAR',SECTORS[next]);}
 if(name==='defaults'){game.config={...DEFAULTS};game.god=false;game.auto=false;show('dev');}
 if(name==='create'){net.createRoom();show('coop');}
 if(name==='join'){const code=$('joinCode').value.trim();net.joinRoom(code).then(ok=>{if(!ok&&mode==='coop')$('netStatus').textContent='No room found. Check the code and try again.';});}
 if(name==='roomstart'){if(net.players.length<2){$('netStatus').textContent='Waiting for your wingmate to join this tab room.';return;}net.startStandalone();}
 if(name==='leaveroom'){net.leaveRoom();show('coop');}
}
$('screens').addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button)action(button.dataset.action);});
$('screens').addEventListener('input',e=>{const el=e.target;if(el.id==='music'||el.id==='sfx'){settings[el.id]=+el.value/100;$(`${el.id}Val`).value=el.value+'%';audio[el.id==='music'?'setMusic':'setSfx'](settings[el.id]);save();}if(el.dataset.var){game.config[el.dataset.var]=+el.value;el.nextElementSibling.value=el.value;}});
function menuNavigate(d){if(['about','help'].includes(mode)&&navItems().length===1){$('screens').querySelector('.panel').scrollTop+=d*100;return;}setFocus(focusIndex+d,true);audio.play('menu');}
function adjustNav(direction){const el=navItems()[focusIndex];if(el?.type==='range'){el.value=+el.value+direction*(+el.step||1);el.dispatchEvent(new Event('input',{bubbles:true}));}else if(el?.classList.contains('toggle'))el.click();}
function pause(){if(mode==='playing'){if(net?.active){radio('CO-OP FLIGHT','WINGMATE KEEPS FLYING WHILE YOU PAUSE.');}show('pause');}else if(mode==='pause')show('playing');}
window.addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)&&!(e.target.tagName==='INPUT'&&e.target.type==='text'))e.preventDefault();
 if(activity('keyboard')){e.preventDefault();return;}wakeAudio();keys.add(e.code);
 if(e.repeat)return;
 if(mode==='playing'){if(e.code==='KeyE'||e.code==='ShiftLeft')pulseUntil[0]=performance.now()+180;if(e.code==='ShiftRight')pulseUntil[1]=performance.now()+180;if(e.code==='Space')fireUntil[0]=performance.now()+120;if(e.code==='Enter')fireUntil[1]=performance.now()+120;if(e.code==='Escape'||e.code==='KeyP')pause();return;}
 if(e.target.tagName==='INPUT'&&e.target.type==='text'){if(e.code==='Escape')back();return;}
 if(e.code==='Escape')return back();
 if(e.code==='Tab'){e.preventDefault();return menuNavigate(e.shiftKey?-1:1);}
 if(e.code==='ArrowUp'||e.code==='KeyW')menuNavigate(-1);
 if(e.code==='ArrowDown'||e.code==='KeyS')menuNavigate(1);
 if(e.code==='ArrowLeft'||e.code==='KeyA')adjustNav(-1);
 if(e.code==='ArrowRight'||e.code==='KeyD')adjustNav(1);
 if(e.code==='Enter'||e.code==='Space'){e.preventDefault();navItems()[focusIndex]?.click();}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();mouse.fire=false;if(mode==='playing'&&!net?.active)pause();});
window.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('wheel',()=>activity('mouse'),{passive:true});
window.addEventListener('pointerdown',e=>{const exited=activity(e.pointerType==='touch'?'touch':'mouse');wakeAudio();if(exited){e.preventDefault();e.stopImmediatePropagation();return;}if(e.target!==$('game'))return;
 if(e.pointerType==='touch'){if(!touch.active){Object.assign(touch,{active:true,id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0});$('game').setPointerCapture(e.pointerId);}else touch.pulse=true;}
 else{mouse.engaged=true;if(e.button===0){mouse.fire=true;fireUntil[0]=performance.now()+120;}if(e.button===2)touch.pulse=true;updateMouse(e);}
},true);
window.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y)>3){activity(e.pointerType==='touch'?'touch':'mouse');lastPointer={x:e.clientX,y:e.clientY};}if(e.pointerType==='touch'&&touch.active&&e.pointerId===touch.id){touch.dx=clamp((e.clientX-touch.x)/65,-1,1);touch.dy=clamp((e.clientY-touch.y)/80,-1,1);}else if(e.target===$('game'))updateMouse(e);});
window.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&e.pointerId===touch.id){touch.active=false;touch.dx=0;touch.dy=0;touch.id=null;}if(e.button===0)mouse.fire=false;});
window.addEventListener('pointercancel',()=>{touch.active=false;touch.dx=touch.dy=0;mouse.fire=false;});
const raycaster=new THREE.Raycaster(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),rayPoint=new THREE.Vector3();
function updateMouse(e){if(!camera)return;mouse.x=e.clientX/window.innerWidth*2-1;mouse.y=1-e.clientY/window.innerHeight*2;raycaster.setFromCamera(new THREE.Vector2(mouse.x,mouse.y),camera);if(raycaster.ray.intersectPlane(groundPlane,rayPoint))mouse.target=rayPoint.x;}
function pads(){try{return [...(navigator.getGamepads?.()||[])].filter(p=>p?.connected);}catch{return [];}}
function padValue(p,index){return p.buttons[index]?.pressed||p.buttons[index]?.value>.4;}
let padNavAt=0;
function pollPads(){
 const list=pads();if(consumePad){if(list.some(p=>p.axes.some(v=>Math.abs(v)>.22)||p.buttons.some(b=>b.pressed)))return list;consumePad=false;heldPad.clear();}for(const p of list){const any=p.axes.some(v=>Math.abs(v)>.22)||p.buttons.some(b=>b.pressed);if(any){if(activity('gamepad')){consumePad=true;heldPad.clear();return list;}wakeAudio();}
  const isPressed=i=>padValue(p,i),edge=i=>{const key=p.index+':'+i,now=isPressed(i),before=heldPad.has(key);if(now)heldPad.add(key);else heldPad.delete(key);return now&&!before;};
  const confirm=edge(0),cancel=edge(1),options=edge(9)&&!(net?.embedded&&isPressed(8));edge(2);
  if(mode==='playing'){if(options)pause();}
  else if(mode!=='attract'){
   if(Math.abs(p.axes[3]||0)>.15){const panel=$('screens').querySelector('.panel');if(panel)panel.scrollTop+=(p.axes[3]||0)*25;}
   if(options&&mode==='pause')show('playing');else if(cancel)back();else if(confirm)navItems()[focusIndex]?.click();
   const y=isPressed(12)?-1:isPressed(13)?1:p.axes[1]||0,x=isPressed(14)?-1:isPressed(15)?1:p.axes[0]||0;
   if(performance.now()>padNavAt&&(Math.abs(y)>.55||Math.abs(x)>.55)){if(Math.abs(y)>.55)menuNavigate(Math.sign(y));else adjustNav(Math.sign(x));padNavAt=performance.now()+220;}
  }
 }
 return list;
}
function getInputs(list){
 const arr=[{},{}],inputNow=performance.now();if(touch.pulse)pulseUntil[0]=inputNow+180;let i0={x:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),y:(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0),fire:keys.has('Space')||mouse.fire||settings.autoFire||inputNow<fireUntil[0],pulse:keys.has('KeyE')||keys.has('ShiftLeft')||inputNow<pulseUntil[0]};
 if(localPlayers===1){i0.x+=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);i0.y+=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);}
 if(lastUsed==='mouse'&&mouse.engaged)i0.target=mouse.target;
 if(lastUsed==='touch'){
  i0.x=touch.dx;i0.y=touch.dy;i0.fire=true;i0.pulse=inputNow<pulseUntil[0];
 }
 arr[0]=i0;arr[1]={x:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),y:(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0),fire:keys.has('Enter')||settings.autoFire||inputNow<fireUntil[1],pulse:keys.has('ShiftRight')||inputNow<pulseUntil[1]};
 list.slice(0,2).forEach((p,i)=>{const dx=(padValue(p,15)?1:0)-(padValue(p,14)?1:0),dy=(padValue(p,13)?1:0)-(padValue(p,12)?1:0);arr[i]={...arr[i],x:clamp(arr[i].x+(Math.abs(p.axes[0]||0)>.16?p.axes[0]:dx),-1,1),y:clamp(arr[i].y+(Math.abs(p.axes[1]||0)>.16?p.axes[1]:dy),-1,1),fire:arr[i].fire||padValue(p,0)||padValue(p,7),pulse:arr[i].pulse||padValue(p,2)||padValue(p,5)};});
 const state=currentState(),seat=net?.active?Math.max(0,net.players.findIndex(p=>p.id===net.localId)):0;
 for(let i=0;i<(net?.active?1:localPlayers);i++){if(!settings.autoFire&&!(lastUsed==='touch'&&i===0))continue;const p=state.players[net?.active?seat:i];if(!p)continue;const f=state.entities.find(e=>e.kind==='fuel'&&e.s>p.s-4&&e.s<p.s+115&&Math.abs(e.x-p.x)<3.2);if(f){arr[i].fire=false;if(lastUsed==='touch'&&i===0&&state.fuel<90&&Math.abs(f.s-p.s)<12)arr[i].y=1;}}
 touch.pulse=false;arr[0].x=clamp(arr[0].x,-1,1);arr[0].y=clamp(arr[0].y,-1,1);return arr;
}
function radio(name,text){if(!ready||mode==='title')return;$('radio').innerHTML=`<small>${escape(name)}</small>${escape(text)}`;$('radio').classList.add('show');lastRadio=performance.now();}
function onEvent(e){
 if(!ready)return;
 if(e.type==='shot')audio.play('shot');
 if(e.type==='explosion'){audio.play('explosion');burst(e.x,e.s,e.kind==='bridge'||e.kind==='boss'?34:13);shake=Math.max(shake,e.kind==='bridge'?.6:.15);}
 if(e.type==='spark')burst(e.x,e.s,3,true);
 if(e.type==='hit'){audio.play('hit');flash=.35;shake=.8;}
 if(e.type==='pulse'){audio.play('pulse');ringEffect(e.x,e.s);shake=.2;}
 if(e.type==='bridge'){audio.play('bridge');audio.voice(Math.floor(e.s));radio('UPSTREAM PATROL',e.text);}
 if(e.type==='refuel'){audio.play('refuel');radio('FUEL CONTACT',e.text);}
 if(e.type==='respawn'){audio.play('checkpoint');radio('GROUND CREW',e.text);}
 if(e.type==='win'){audio.play('win');audio.voice(81);radio('UPSTREAM PATROL',e.text);}
 if(e.type==='lose'){audio.play('gameover');radio('GROUND CREW',e.text);}
}
const particleGeo=new THREE.IcosahedronGeometry(.32,0),particleMats=[0xffcd55,0xff7957,0xfff0c5,0x243c40].map(c=>new THREE.MeshBasicMaterial({color:c}));
function burst(x,s,n,spark=false){if(!scene)return;for(let i=0;i<n;i++){const mesh=new THREE.Mesh(particleGeo,particleMats[i%4]);mesh.position.set(x,1.5,game.distance-s);mesh.scale.setScalar(spark?.45:.6+Math.random()*1.5);scene.add(mesh);effects.push({mesh,s,x,vx:(Math.random()-.5)*14,vs:(Math.random()-.5)*15,vy:Math.random()*9+2,y:1.5,life:spark?.25:.6+Math.random()*.5,max:1});}}
function ringEffect(x,s){const mesh=new THREE.Mesh(new THREE.RingGeometry(.8,1,48),new THREE.MeshBasicMaterial({color:0xffe09a,side:THREE.DoubleSide,transparent:true,opacity:.8}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.65,game.distance-s);scene.add(mesh);effects.push({mesh,s,x,y:.65,vx:0,vs:0,vy:0,life:.65,ring:true});}
function currentState(){return remoteSnapshot&&net?.active&&!net.isHost?remoteSnapshot:game.snapshot();}
function visualEntity(e,dt,distance){
 let obj=visuals.get(e.id);
 if(!obj){if(e.kind==='player')obj=createJet(e.index===1?0xfa795a:0xffce5b);else if(e.kind==='bullet'||e.kind==='enemyBullet'){
   obj=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(e.kind==='bullet'?.17:.55,.18,e.kind==='bullet'?1.9:.8),new THREE.MeshBasicMaterial({color:e.kind==='bullet'?0xfff0a8:0xff6b58}));obj.add(m);const glow=new THREE.Mesh(new THREE.BoxGeometry(.33,.1,1.4),new THREE.MeshBasicMaterial({color:e.kind==='bullet'?0xffab45:0xffb453}));glow.position.z=.5;obj.add(glow);
  }else obj=createEnemy(e.kind,{width:e.width||course(e.s).width});
  const wrapper=new THREE.Group();wrapper.add(obj);wrapper.userData.mixer=obj.userData.mixer;obj=wrapper;if(e.kind==='player'){const shield=new THREE.Mesh(new THREE.RingGeometry(1.85,1.95,40),new THREE.MeshBasicMaterial({color:0xffedbc,side:THREE.DoubleSide,transparent:true,opacity:.35}));shield.rotation.x=-Math.PI/2;shield.position.y=-.8;obj.add(shield);obj.userData.shield=shield;}scene.add(obj);visuals.set(e.id,obj);
 }
 const air=['player','heli','jet','bullet','enemyBullet'].includes(e.kind);obj.position.set(e.x,air?1.65:.15,distance-e.s);if(e.kind==='player'){obj.rotation.z=e.roll||0;obj.visible=true;if(obj.userData.shield){obj.userData.shield.visible=e.inv>0;obj.userData.shield.material.opacity=.2+Math.sin(performance.now()/150)**2*.35;}}obj.userData.mixer?.update(dt);obj.userData.seen=renderCount;
}
function updateView(dt){
 const s=currentState(),d=s.distance;river.update(d,dt);renderCount++;
 for(const e of [...s.entities,...s.bullets,...s.players])visualEntity(e,dt,d);
 for(const [id,obj]of visuals){if(obj.userData.seen!==renderCount){scene.remove(obj);obj.traverse(o=>o.geometry?.dispose());visuals.delete(id);}}
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.x+=e.vx*dt;e.s+=e.vs*dt;if(!e.ring){e.vy-=dt*18;e.y+=e.vy*dt;e.mesh.rotation.x+=dt*4;e.mesh.rotation.z+=dt*3;e.mesh.scale.multiplyScalar(Math.max(.01,1-dt*.9));}else{e.mesh.scale.setScalar(1+(1-e.life/.65)*34);e.mesh.material.opacity=Math.max(0,e.life/.65);}e.mesh.position.set(e.x,e.y,d-e.s);if(e.life<=0){scene.remove(e.mesh);if(e.ring){e.mesh.geometry.dispose();e.mesh.material.dispose();}effects.splice(i,1);}}
 const title=mode==='title'||mode==='options'||mode==='coop'||(mode==='help'&&returnMode==='title')||(mode==='settings'&&returnMode==='options')||mode==='about';
 const desired=(title?-16:0)+course(d).center*.24;
 camera.position.x+=(desired-camera.position.x)*Math.min(1,dt*4);camera.position.y=68;camera.position.z=42;
 let sx=0,sz=0;if(settings.shake&&shake>0){sx=(Math.random()-.5)*shake;sz=(Math.random()-.5)*shake;}camera.position.x+=sx;camera.lookAt(camera.position.x,0,-25+sz);shake=Math.max(0,shake-dt*2);flash=Math.max(0,flash-dt);$('flash').style.opacity=flash;
 if(performance.now()-lastRadio>3200)$('radio').classList.remove('show');
 hudTick+=dt;if(hudTick>.08){hudTick=0;updateHud(s);}
 audio.update(dt,{speed:s.speed||0,fuel:s.fuel,active:['playing','attract'].includes(mode)||(mode==='dev'&&preview)});if(s.players.some(p=>p.refuel))audio.play('refuel');
}
let previousSector=-1;
function updateHud(s){
 const sec=clamp(Math.floor(s.distance/LENGTH),0,3),progress=clamp(s.distance/(LENGTH*4)*100,0,100),boss=s.entities.find(e=>e.kind==='boss');
 if(sec!==previousSector&&mode==='playing'){previousSector=sec;if(sec>0){radio('UPSTREAM PATROL',SECTORS[sec]+(sec===1?' · PICK YOUR CHANNEL.':sec===2?' · WATCH THOSE BANKS.':' · CRACK THE BLOCKADE.'));audio.voice(sec*17);}}
 $('hud').innerHTML=`<div class="hud-top"><div class="score-box"><span>RAID SCORE</span><b>${String(s.score).padStart(6,'0')}</b><i>×${s.combo.toFixed(1)}</i></div><div class="sector-box"><small>SECTOR 0${sec+1} / 04</small><b>${SECTORS[sec]}</b><div class="progress"><i style="width:${progress}%"></i></div></div><button class="pause-btn" aria-label="Pause game" id="pauseBtn">${glyph('☰','☰','Ⅱ')}</button></div>${boss?`<div class="bossbar">THE LAST BLOCKADE<div><i style="width:${boss.hp/boss.maxHp*100}%"></i></div></div>`:''}<div class="hud-bottom"><div class="fuel-panel"><div class="fuel-heading"><span>${s.players.some(p=>p.refuel)?'↑ REFUELING':'FUEL RESERVE'}</span><span style="color:${s.fuel<25?'#ff795c':'#ffcf59'}">${Math.ceil(s.fuel)}%</span></div><div class="fuel-meter"><i style="width:${s.fuel}%;background:${s.fuel<25?'#ff795c':'#ffcf59'}"></i></div><div class="status-line"><span>${s.players.map((p,i)=>`P${i+1} ${'♥'.repeat(Math.max(0,p.hp))}`).join(' &nbsp; ')}</span><span>✈ ×${s.lives}</span></div></div><div class="pulse-panel"><b>${prompt('□','X','E / RMB')} ${s.pulseCooldown>0?`PULSE ${Math.ceil(s.pulseCooldown)}s`:'PULSE READY'}</b><small>${s.bridges} / 4 BLOCKADES CLEARED</small></div></div><div class="prompt-strip">${prompt('L','L','WASD')} STEER / THROTTLE &nbsp; ${prompt('✕ R2','A RT','Space')} FIRE</div>${lastUsed==='touch'&&s.pulseCooldown<=0?'<button id="touchPulse">PULSE</button>':''}${game.god||game.auto?'<div class="dev-mark">DEV FLIGHT ASSISTS ACTIVE</div>':''}`;
 
}
$('hud').addEventListener('pointerdown',e=>{if(e.target.closest('#pauseBtn')){e.preventDefault();pause();}if(e.target.closest('#touchPulse')){e.preventDefault();touch.pulse=true;}});
function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;renderer.setSize(w,h);renderer.setPixelRatio(Math.min(devicePixelRatio,2));const half=w<900?27:32,aspect=w/h;camera.left=-half*aspect;camera.right=half*aspect;if(aspect<1){camera.left=-25;camera.right=25;camera.top=25/aspect;camera.bottom=-25/aspect;}else{camera.top=half;camera.bottom=-half;}camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);
function endResult(){if(mode==='result')return;const s=currentState();try{localStorage.setItem('razzle-best',Math.max(+localStorage.getItem('razzle-best')||0,s.score));}catch{}show('result');}
function wireSnapshot(){const s=game.snapshot();const compact=e=>{const {id,kind,x,s,index,hp,maxHp,inv,roll,refuel,width,owner}=e;return {id,kind,x:Math.round(x*100)/100,s:Math.round(s*100)/100,index,hp,maxHp,inv,roll,refuel,width,owner};};return {...s,players:s.players.map(compact),entities:s.entities.map(compact),bullets:s.bullets.map(compact),events:s.events.filter(e=>e.type!=='shot').slice(-8)};}
function networkStart(info){participantIds=info.players.map(p=>p.id);networkDelay=Math.max(.1,(info.delay||0)/1000);remoteInputs={};remoteSnapshot=null;startGame(Math.min(2,info.players.length));radio('CO-OP FLIGHT','WING SYNCED · STAND BY');}
function tick(now){
 const dt=Math.min(.05,(now-(tick.last||now))/1000);tick.last=now;frameDt=dt;const list=pollPads();
 if(ready){
  if((mode==='title'||mode==='options'||mode==='coop'||mode==='about'||(mode==='settings'&&returnMode==='options')||(mode==='help'&&returnMode==='title'))&&now-lastInput>=10000&&!net?.active)startGame(1,true);
  if(mode==='attract'&&game.finished)game.reset(1,true);
  const run=(!net?.active||!net.ended)&&(mode==='playing'||mode==='attract'||(mode==='dev'&&preview)||(mode==='pause'&&net?.active));
  if(run){let inputs=getInputs(list);
   if(mode==='pause')inputs=[{},{}];
   networkDelay=net?.active?Math.max(0,-net.time()/1000):Math.max(0,networkDelay-dt);
   if(net?.active){const index=Math.max(0,net.players.findIndex(p=>p.id===net.localId)),local=inputs[0];
    if(net.isHost){inputs=net.players.map((p,i)=>p.id===net.localId?local:(remoteInputs[p.id]||{}));if(net.server)inputs=net.players.map(p=>remoteInputs[p.id]||{});}
    net.update(dt,local,wireSnapshot());
   }
   if((!net?.active||net.isHost)&&networkDelay<=0){accumulator+=dt;while(accumulator>=1/60){game.step(1/60,inputs);accumulator-=1/60;}}
   const s=currentState();if(s.finished&&!finishHandled&&mode!=='attract'){finishHandled=true;resultAt=now+1800;if(net?.active&&net.isHost)net.finish(s.score,s.won,s.stats);}
   if(finishHandled&&resultAt>0&&now>resultAt&&mode!=='result')endResult();
  }
  if(finishHandled&&resultAt>0&&now>resultAt&&mode!=='result')endResult();
  updateView(dt);renderer.render(scene,camera);
 }
 requestAnimationFrame(tick);
}
async function boot(){
 try{
  $('loadText').textContent='WARMING UP THE ENGINE…';const version=await initPhysics();game=new Game(onEvent);game.reset(1,true);
  renderer=new THREE.WebGPURenderer({canvas:$('game'),antialias:true,alpha:false});renderer.setClearColor(0x2b7274);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;await renderer.init();
  scene=new THREE.Scene();scene.background=new THREE.Color(0x2c7775);scene.fog=new THREE.Fog(0x7aa99a,155,260);camera=new THREE.OrthographicCamera(-70,70,47,-47,.1,400);camera.position.set(-16,68,42);camera.lookAt(-16,0,-25);
  scene.add(new THREE.HemisphereLight(0xfff1ce,0x284b4b,1.8));const sun=new THREE.DirectionalLight(0xffe6b3,2.1);sun.position.set(-35,60,-20);scene.add(sun);
  river=createRiverScene(scene,course);resize();
  net=new Network({onStart:networkStart,onSnapshot:s=>{remoteSnapshot=s;for(const e of s.events||[]){if(e.serial>lastEventTime){onEvent(e);lastEventTime=e.serial;}}},onInput:(input,from)=>remoteInputs[from]=input,onStatus:s=>{netStatus=s;if(mode==='coop'){if($('netStatus'))$('netStatus').textContent=s.message||`${s.count}/2 PILOTS CONNECTED`;if($('roomCode'))$('roomCode').textContent=s.code||'';if($('roomStart'))$('roomStart').classList.toggle('hidden',!(s.mode==='room'&&s.isHost));}},onEnd:e=>{keys.clear();mouse.fire=false;audio.setState('paused');if(remoteSnapshot){remoteSnapshot.finished=true;if(typeof e.won==='boolean')remoteSnapshot.won=e.won;if(typeof e.score==='number')remoteSnapshot.score=e.score;}finishHandled=true;resultAt=performance.now()+700;},onTimeUp:()=>{if(net.isHost){game.finished=true;game.won=game.bridges===4;net.finish(game.score,game.won,game.stats);finishHandled=true;resultAt=performance.now()+600;}},onLeave:e=>{const idx=participantIds.indexOf(e.id);if(net.isHost&&idx>=0&&game.players[idx]){game.detach(game.players[idx]);game.players.splice(idx,1);game.players.forEach((p,i)=>p.index=i);participantIds.splice(idx,1);}radio('CO-OP FLIGHT','WINGMATE DISCONNECTED · KEEP FLYING.');}});
  await net.init();ready=true;if(!net.active){game.warp(130);game.step(1/60);}show(net.embedded?'waiting':'title');lastInput=performance.now();updateView(0);await renderer.renderAsync(scene,camera);$('loading').classList.add('hidden');net.ready();requestAnimationFrame(tick);
  window.__RAZZLE__={get state(){return {mode,ready,backend:renderer.backend.isWebGPUBackend?'WebGPU':'WebGL2',physics:version,lastUsed,localPlayers,settings:{...settings},renderCount,net:net.debug(),audio:audio.debug(),...currentState()};},start:(n=1)=>startGame(n),autopilot:v=>game.auto=v,pause,show,action,game,net,audio,course,advance:(seconds=1)=>{for(let i=0;i<seconds*60;i++)game.step(1/60,game.players.map(()=>({})));return game.snapshot();},setIdle:()=>lastInput=performance.now()-10001,resetTitle:startTitle};
 }catch(e){console.error(e);$('loadText').textContent='FLIGHT GROUNDED: '+e.message;const button=document.createElement('button');button.className='action';button.textContent='RETRY ENGINE START';button.onclick=()=>location.reload();$('loading').append(button);}
}
boot();
