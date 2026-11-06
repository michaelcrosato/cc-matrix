import {Game,initPhysics,defaults,wrap,delta} from './sim.js';
import {createVisuals} from './visuals.js';
import {AudioEngine} from './audio.js';
import {connectHub} from './hub.js';
import metadata from './metadata.json';

const $=id=>document.getElementById(id),show=(id,v)=>$(id).classList.toggle('hide',!v);
const audio=new AudioEngine();
let visual,game,hub,screen='loading',returnScreen='title',aboutPage=0,lastInput=navigator.maxTouchPoints>0?'touch':'keyboard',lastActivity=performance.now(),noticeUntil=0,frameTime=0,acc=0,ended=false,previousButtons=[],padNavAt=0,frameCount=0,lastProgress=0;
if(navigator.maxTouchPoints>0)document.body.classList.add('touch');
const keys=new Set(),mouse={down:false,x:0,y:0,aim:false},touches=new Map();
let focusIndex=0;
const settings={music:.1,sfx:.65,glyphs:'PlayStation',difficulty:'Cadet'};
try{Object.assign(settings,JSON.parse(localStorage.getItem('csc-settings')||'{}'));}catch{}
audio.setMusic(settings.music);audio.setSfx(settings.sfx);
const saveSettings=()=>{try{localStorage.setItem('csc-settings',JSON.stringify(settings));}catch{}};
const muted=()=>ended||screen==='hub-end'||['pause','dev'].includes(screen)||(['settings','manual','about'].includes(screen)&&returnScreen==='play');
const unlockSound=()=>{if(!muted())audio.unlock();};
const labels={PlayStation:{fire:'R2 / ✕',pulse:'□',boost:'R1',pause:'OPTIONS',confirm:'✕',back:'○'},Xbox:{fire:'RT / A',pulse:'X',boost:'RB',pause:'MENU',confirm:'A',back:'B'}};
function promptText(){const pad=labels[settings.glyphs];return lastInput==='gamepad'?pad:{fire:'SPACE / LMB',pulse:'E',boost:'SHIFT',pause:'ESC',confirm:'ENTER',back:'ESC'};}
function setInput(type){if(lastInput!==type){lastInput=type;updatePrompts();}}
function updatePrompts(){const p=promptText();$('titlePrompt').textContent=lastInput==='touch'?'DRAG TO FLY · AUTO CANNON · TAP SHIELD':lastInput==='gamepad'?`LEFT STICK FLY · ${p.fire} FIRE · ${p.pulse} SHIELD`:'WASD FLY · SPACE FIRE · E SHIELD';$('pulseLabel').textContent=`${p.pulse}  CONVOY SHIELD`;$('flightHelp').innerHTML=lastInput==='gamepad'?`LEFT STICK &nbsp; FLY<br>RIGHT STICK &nbsp; AIM &nbsp; · &nbsp; ${p.fire} &nbsp; FIRE<br>${p.boost} &nbsp; BOOST &nbsp; · &nbsp; ${p.pause} &nbsp; PAUSE`:'WASD / ARROWS &nbsp; FLY<br>SPACE / MOUSE &nbsp; FIRE<br>SHIFT &nbsp; BOOST &nbsp; · &nbsp; ESC &nbsp; PAUSE';const hint=document.querySelector('.menu-hint');if(hint)hint.textContent=lastInput==='touch'?'TAP TO SELECT':`${p.confirm} SELECT  ·  ${p.back} BACK`;}
function activity(type='keyboard'){
 if(ended)return false;lastActivity=performance.now();setInput(type);
 if(screen==='attract'){title();return false;}return true;
}
function notice(title,text='',seconds=3){$('noticeTitle').textContent=title;$('noticeText').textContent=text;noticeUntil=performance.now()+seconds*1000;$('notice').classList.add('visible');}
function event(type,data){
 if(type==='explode'){visual?.burst(data.x,data.y,data.type==='boss'?0xffcc63:0xf77639,28);audio.play('explode');}
 else if(type==='hit'){visual?.burst(data.x,data.y,0xffefb5,6);audio.play('hit');}
 else if(type==='dust'){visual?.burst(data.x,data.y,0xb48057,4);}
 else if(['shoot','enemy','split','pulse','pickup'].includes(type)){audio.play(type,data);if(type==='pickup')notice('SUPPLY SECURED',data.type==='repair'?'HULL & CONVOY REPAIRED':'SHIELD RECHARGED',2);}
 else if(type==='wave'){audio.play('wave');if(screen==='play'||screen==='attract')notice('SORTIE 0'+data.wave,data.text,4);}
 else if(type==='boss'){audio.voice('big rig');notice('THE ROADBLOCK',data.text,4);}
 else if(type==='clear'){audio.play('wave');audio.voice('all clear');notice('SORTIE CLEAR',data.text,3.7);}
 else if(type==='radio'){audio.voice(data.text);notice('AIR DIVISION',data.text,2.5);}
 else if(type==='victory'||type==='defeat'){
  audio.play(type);if(screen==='attract')return;
  if(hub?.active){hub.result(game.score,stats());screen='hub-result';renderMenu();}else {screen='result';renderMenu();}
 }
}
function stats(){return {Trucks:game.trucks.filter(t=>!t.dead).length,Aircraft:game.kills,Sortie:game.wave,'Flight sec':Math.round(game.time)};}
function setChrome(play){for(const id of ['masthead','title','title-stamp','footer'])show(id,!play);show('hud',play);show('bottom',play);show('demo',screen==='attract');}
function title(){if(hub?.active)return;screen='title';game.reset(1,true);game.mode='title';game.players[0].x=18;game.players[0].y=23;game.cameraX=0;game.players[0].invuln=0;noticeUntil=0;$('notice').classList.remove('visible');$('menu').innerHTML='';show('bossbar',false);setChrome(false);lastActivity=performance.now();focusIndex=0;focusButtons();}
function start(count=1,attract=false){if(ended)return;keys.clear();mouse.down=false;touches.clear();screen=attract?'attract':'play';game.cfg={...defaults};if(settings.difficulty==='Commander'){game.cfg.enemySpeed=1.25;game.cfg.enemyFire=1.3;game.cfg.assist=.15;}game.dev={god:false,convoySafe:false,slow:false};game.reset(count,attract);$('menu').innerHTML='';setChrome(true);if(!attract){audio.resume();notice('SORTIE 01','KEEP THE MEDICINE MOVING.',4);}}
function openMenu(name){if(ended||screen==='attract')return;if(screen==='play'||screen==='title'||screen==='result')returnScreen=screen;if(name==='pause'&&screen!=='play')return;screen=name;keys.clear();mouse.down=false;touches.clear();audio.play('menu');if(name==='pause')audio.stop();if(name==='about')aboutPage=0;renderMenu();}
function back(){if(hub?.active&&screen==='hub-result')return;if(screen==='pause'){screen='play';audio.resume();renderMenu();return;}if(['settings','manual','about','dev'].includes(screen)){screen=returnScreen==='play'?'pause':returnScreen==='result'?'result':'title';renderMenu();return;}}
function action(name){
 if(!activity(lastInput))return;
 if(name==='solo')start(1);else if(name==='coop')start(2);else if(name==='pause')openMenu('pause');else if(name==='resume'){screen='play';audio.resume();renderMenu();}
 else if(['settings','manual','about','dev'].includes(name))openMenu(name);
 else if(name==='back')back();else if(name==='title'){if(!hub?.active)title();}
 else if(name==='retry'){if(!hub?.active)start(game.count);}
 else if(name==='pulse'){if(screen==='play')game.activatePulse(game.players[0]);}
 else if(name==='glyphs'){settings.glyphs=settings.glyphs==='PlayStation'?'Xbox':'PlayStation';saveSettings();renderMenu();updatePrompts();}
 else if(name==='difficulty'){settings.difficulty=settings.difficulty==='Cadet'?'Commander':'Cadet';saveSettings();renderMenu();}
 else if(name==='about-next'){aboutPage=(aboutPage+1)%4;renderMenu();}else if(name==='about-prev'){aboutPage=(aboutPage+3)%4;renderMenu();}
 else if(name==='god'){game.dev.god=!game.dev.god;renderMenu();}else if(name==='convoySafe'){game.dev.convoySafe=!game.dev.convoySafe;renderMenu();}else if(name==='slow'){game.dev.slow=!game.dev.slow;renderMenu();}
 else if(name==='next-wave'){game.nextWave();notice('DEV: SORTIE ADVANCED','RESUME TO CONTINUE',2);}
 else if(name==='restore'){for(const p of game.players)if(p.alive)p.hp=3;for(const t of game.trucks)if(!t.dead)t.hp=2;game.reserves=6;game.pulseReady=0;notice('DEV: SUPPLIES RESTORED','',2);}
 else if(name==='reset-vars'){game.cfg={...defaults};renderMenu();}
 else if(name==='spawn-boss'){if(!game.enemies.some(e=>e.type==='boss'))game.spawnBoss();}
}
const button=(label,act,cls='')=>`<button class="btn ${cls}" data-action="${act}">${label}</button>`;
const header=(eyebrow,title)=>`<div class="panel-head"><span class="eyebrow">${eyebrow}</span><button class="back" data-action="back">← BACK</button></div><h2>${title}</h2>`;
const setting=(label,key,value,min=0,max=1,step=.05)=>`<label class="setting"><span class="rowlabel">${label}</span><input aria-label="${label}" data-setting="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output>${Math.round(value*100)}%</output></label>`;
const devSlider=(label,key,min,max,step)=>`<label class="setting"><span class="rowlabel">${label}</span><input aria-label="${label}" data-dev="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${game.cfg[key]}"><output>${game.cfg[key]}</output></label>`;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function creditsContent(){
 if(aboutPage===0){const names={date:'Date',source:'Source',plan:'Plan',genre:'Genre',perspective:'Perspective',tech:'Tech',artDirection:'Art direction',animation:'Animation',audio:'Audio',online:'Online',testing:'Testing',research:'Research',environment:'Environment',model:'Model',usage:'Usage'};return `<dl>${Object.entries(metadata.sourceInformation).map(([k,v])=>`<dt>${names[k]||k}</dt><dd>${esc(v)}</dd>`).join('')}</dl><div class="inkrule"></div><p style="font-size:12px">Research: Activision’s 1982 manual (AtariAge / AtariOnline), contemporary Video Swapper and Electronic Fun coverage, and the AI Hub Session Protocol v1. An original tribute; no original game assets or audio used.</p>`;}
 const key=['','testingFeedback','engineFeedback','promptFeedback'][aboutPage];const questions={testingFeedback:['Issues caught','Critical issues','Most helpful test','Least helpful test'],engineFeedback:['What worked well','Wrong turns','Built for this game','Hardest engine task','Engine changes','Suggested engine improvement'],promptFeedback:['Best part','Confusing part','Hardest part','Suggested prompt change']};return `<ol>${metadata[key].map((v,i)=>`<li><b>${questions[key][i]}</b><br>${esc(v)}</li>`).join('')}</ol>`;
}
function renderMenu(){
 setChrome(!['title','settings','manual','about'].includes(screen)||returnScreen==='play');show('demo',screen==='attract');
 if(['play','title','attract','hub-wait','hub-end'].includes(screen)){$('menu').innerHTML='';if(screen==='title')setChrome(false);return;}
 let body='',wide=false;
 if(screen==='pause'){body=header('FLIGHT HOLD','Take a breather.')+button('Resume sortie','resume','primary')+button('Settings','settings')+button('Field manual','manual')+(!hub?.active?button('Dev flight deck','dev')+button('Return to hangar','title'):'');}
 if(screen==='settings'){body=header('AIR DIVISION / OPTIONS','Tune your cockpit.')+setting('Music','music',settings.music)+setting('Effects & radio','sfx',settings.sfx)+`<div class="setting"><span>Controller glyphs</span><button class="switch" data-action="glyphs">${settings.glyphs}</button></div><div class="setting"><span>Next sortie difficulty</span><button class="switch" data-action="difficulty">${settings.difficulty}</button></div><p class="tiny">Cadet gives a little aim assistance. Commander brings faster aircraft and heavier fire.</p>`;}
 if(screen==='manual'){wide=true;const p=promptText();body=header('READ THIS. THEN GIVE ’EM WHAT FOR.','Field manual')+`<div class="manual-grid"><div class="manual-card"><b>01 / KEEP ’EM ROLLING</b><p>Protect 12 medicine trucks through three sorties. Clear every aircraft to advance. Every surviving truck earns a bigger bonus each sortie. Lose the convoy or your last chopper and the run ends.</p></div><div class="manual-card"><b>02 / OWN THE SKY</b><p>${lastInput==='gamepad'?'Left stick flies. Right stick aims. '+p.fire+' fires. '+p.boost+' boosts.':'WASD or arrows fly. Space fires forward with light aim assist. Mouse aims; hold left click to fire. Shift boosts.'} Ammunition is unlimited. Turn around whenever you need.</p></div><div class="manual-card"><b>03 / SPLIT DECISION</b><p>Orange missiles split into two. Cannon fire cannot stop them. Dodge, or press ${p.pulse} for a 4-second convoy shield. It clears nearby missiles and protects every truck. Recharges in 12 seconds.</p></div><div class="manual-card"><b>04 / BRING A WINGMAN</b><p>Local co-op: pilot two uses IJKL, N to fire, M for shield, and U to boost; or a second controller. Stay within the camera together. AI Hub supports 1–4 pilots competing for score.</p></div><div class="manual-card"><b>05 / SCAN & RESUPPLY</b><p>The scanner shows the entire looping battlefield. Teal is you, red is trouble, cream is the convoy. Collect + crates to repair your hull and a truck; gold crates recharge the shield. Sortie breaks repair surviving trucks.</p></div><div class="manual-card"><b>06 / THE LAST STRETCH</b><p>Jets are fast. Helicopters linger and fire. The final command airship fires faster below half hull. You begin with 3 reserve choppers; earn another every 10,000 points.</p></div></div><p class="tiny">Touch: drag anywhere on the left to fly. The cannon automatically targets enemies. Touch the right side to aim. Tap the shield when it appears.</p>`;}
 if(screen==='about'){wide=true;body=header('CHOP SHOP COMMAND / DEBRIEF',['Source information','Testing feedback','Engine feedback','Prompt feedback'][aboutPage])+`<div class="credits">${creditsContent()}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:23px">${button('← Previous','about-prev','inline')}<span class="tiny">${aboutPage+1} / 4</span>${button('Next →','about-next','inline')}</div>`;}
 if(screen==='dev'){wide=true;body=header('LIVE / PAUSE TO TUNE','Dev flight deck')+`<p class="tiny">Changes apply immediately. This flight deck is disabled during AI Hub competition.</p><div class="manual-grid"><div>${devSlider('Flight speed','speed',12,50,1)}${devSlider('Cannon / second','fireRate',3,24,1)}${devSlider('Enemy speed','enemySpeed',.3,2.5,.1)}${devSlider('Enemy fire rate','enemyFire',.3,2.5,.1)}</div><div>${devSlider('Damage multiplier','damage',.25,4,.25)}${devSlider('Shield cooldown','pulseCooldown',2,25,1)}${devSlider('Aim assistance','assist',0,.6,.02)}<div class="setting"><span>Invincible pilots</span><button class="switch" data-action="god">${game.dev.god?'ON':'OFF'}</button></div></div></div><div style="display:flex;gap:10px;flex-wrap:wrap">${button('Safe convoy: '+(game.dev.convoySafe?'ON':'OFF'),'convoySafe','inline')}${button('Slow time: '+(game.dev.slow?'ON':'OFF'),'slow','inline')}${button('Restore supplies','restore','inline')}${button('Next sortie','next-wave','inline')}${button('Spawn airship','spawn-boss','inline')}${button('Reset defaults','reset-vars','inline')}</div>`;}
 if(screen==='result'||screen==='hub-result'){
  const r=game.result||{won:false,score:game.score,trucks:game.trucks.filter(t=>!t.dead).length,time:game.time,kills:game.kills};
  let best=0;try{best=Number(localStorage.getItem('csc-best'))||0;if(r.score>best){best=r.score;localStorage.setItem('csc-best',best);}}catch{}
  body=`<span class="eyebrow">${r.won?'MISSION ACCOMPLISHED':'FLIGHT DEBRIEF'}</span><h2>${r.won?'Special delivery.':'A tough stretch.'}</h2><p>${r.won?'Medicine delivered. The guys on the ground owe you one.':'The desert keeps its own score. There’s another bird waiting in the hangar.'}</p><div class="result-score mono">${String(r.score).padStart(6,'0')}</div><div class="result-stat"><span>Supplies delivered</span><span>${r.trucks} / 12</span></div><div class="result-stat"><span>Aircraft down</span><span>${r.kills}</span></div><div class="result-stat"><span>Flight time</span><span>${Math.floor(r.time/60)}:${String(Math.floor(r.time%60)).padStart(2,'0')}</span></div><div class="result-stat"><span>Hangar record</span><span>${best}</span></div><div style="margin-top:23px">${hub?.active?'<p class="tiny">SCORE FILED / WAITING FOR AIR DIVISION</p>':button('Fly again','retry','primary')+button('Return to hangar','title')}</div>`;
 }
 $('menu').innerHTML=`<div class="veil"><section class="panel ${wide?'wide':''}">${body}<div class="menu-hint tiny" style="text-align:right;opacity:.6;margin-top:13px;letter-spacing:1px"></div></section></div>`;focusIndex=screen==='pause'?1:0;updatePrompts();focusButtons();
}
function buttons(){return [...document.querySelectorAll('#menu button:not(:disabled),#menu input')].filter(e=>e.offsetParent!==null).concat(screen==='title'?[...document.querySelectorAll('#title button')]:[]);}
function focusButtons(move=0){const items=buttons();if(!items.length)return;focusIndex=(focusIndex+move+items.length)%items.length;for(const e of document.querySelectorAll('.focused'))e.classList.remove('focused');items[focusIndex].classList.add('focused');if(lastInput==='gamepad'){items[focusIndex].focus({preventScroll:true});items[focusIndex].scrollIntoView({block:'nearest'});}}
function nav(dir){const list=buttons();if(!list.length)return;const current=list[focusIndex];if((dir==='left'||dir==='right')&&current?.tagName==='INPUT'){current.value=String(Number(current.value)+(dir==='right'?1:-1)*Number(current.step));current.dispatchEvent(new Event('input',{bubbles:true}));return;}focusButtons(dir==='up'||dir==='left'?-1:1);}
function activateFocused(){buttons()[focusIndex]?.click();}
document.addEventListener('click',e=>{if(ended)return;const b=e.target.closest('[data-action]');if(b){if(e.pointerType==='touch')setInput('touch');unlockSound();action(b.dataset.action);}});
document.addEventListener('input',e=>{const el=e.target;if(el.dataset.setting){settings[el.dataset.setting]=Number(el.value);el.nextElementSibling.value=Math.round(el.value*100)+'%';audio.setMusic(settings.music);audio.setSfx(settings.sfx);saveSettings();}if(el.dataset.dev){game.cfg[el.dataset.dev]=Number(el.value);el.nextElementSibling.value=el.value;}});
document.addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code))e.preventDefault();if(!activity())return;unlockSound();
 if(e.repeat){keys.add(e.code);return;}
 if(e.code==='Escape'||e.code==='KeyP'){if(screen==='play')openMenu('pause');else back();return;}
 if(screen!=='play'){if(e.code==='ArrowDown'||e.code==='KeyS'||e.code==='Tab')nav('down');else if(e.code==='ArrowUp'||e.code==='KeyW')nav('up');else if(e.code==='ArrowLeft')nav('left');else if(e.code==='ArrowRight')nav('right');else if(e.code==='Enter'||e.code==='Space')activateFocused();}
 keys.add(e.code);
});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(screen==='attract')activity();});
document.addEventListener('wheel',()=>activity('keyboard'),{passive:true});
document.addEventListener('pointerdown',e=>{
 if(!activity(e.pointerType==='touch'?'touch':'keyboard'))return;unlockSound();
 if(e.pointerType==='touch'){document.body.classList.add('touch');if(screen==='play'&&!e.target.closest('button,.panel')){touches.set(e.pointerId,{sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,left:e.clientX<innerWidth*.6});e.preventDefault();}}
 else if(e.button===0&&!e.target.closest('button,input,.panel')){mouse.down=true;mouse.x=e.clientX;mouse.y=e.clientY;mouse.aim=true;}
},{passive:false});
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'){const t=touches.get(e.pointerId);if(t){t.x=e.clientX;t.y=e.clientY;}}else{activity('keyboard');mouse.x=e.clientX;mouse.y=e.clientY;if(screen==='play')mouse.aim=true;const b=e.target.closest('button,input');if(b){const i=buttons().indexOf(b);if(i>=0){focusIndex=i;focusButtons();}}}});
document.addEventListener('pointerup',e=>{touches.delete(e.pointerId);if(e.pointerType!=='touch')mouse.down=false;});document.addEventListener('pointercancel',e=>touches.delete(e.pointerId));
document.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',()=>{keys.clear();mouse.down=false;touches.clear();if(screen==='play'&&!hub?.active)openMenu('pause');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.stop();if(screen==='play'&&!hub?.active)openMenu('pause');}else if(screen==='play')audio.resume();});
function padInputs(){
 const pads=[...(navigator.getGamepads?.()||[])].filter(Boolean),out=[];
 for(let i=0;i<pads.length;i++){
  const p=pads[i],down=n=>!!p.buttons[n]?.pressed,prev=previousButtons[i]||[],edge=n=>down(n)&&!prev[n],axis=n=>Math.abs(p.axes[n]||0)>.16?p.axes[n]:0;
  const active=p.buttons.some(b=>b.pressed)||p.axes.some(a=>Math.abs(a)>.2);
  if(active){if(!activity('gamepad')){previousButtons[i]=p.buttons.map(b=>b.pressed);continue;}unlockSound();}
  if(edge(9)&&!down(8)){if(screen==='play')openMenu('pause');else if(screen==='pause')action('resume');}
  if(screen!=='play'&&screen!=='attract'){
   if(edge(0))activateFocused();if(edge(1))back();
   if(performance.now()>padNavAt){if(down(12)||axis(1)<-.5){nav('up');padNavAt=performance.now()+190;}else if(down(13)||axis(1)>.5){nav('down');padNavAt=performance.now()+190;}else if(down(14)||axis(0)<-.5){nav('left');padNavAt=performance.now()+190;}else if(down(15)||axis(0)>.5){nav('right');padNavAt=performance.now()+190;}}
  }
  const ax=axis(2),ay=-axis(3),manual=Math.hypot(ax,ay)>.2;
  out.push({x:axis(0)||(down(15)?1:down(14)?-1:0),y:-axis(1)||(down(12)?1:down(13)?-1:0),fire:down(7)||down(0),pulse:edge(2)||edge(4),boost:down(5),aimX:manual?ax:undefined,aimY:manual?ay:undefined,manualAim:manual});previousButtons[i]=p.buttons.map(b=>b.pressed);
 }return out;
}
function getInputs(pads){
 const a={x:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y:(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),fire:keys.has('Space')||mouse.down,pulse:keys.has('KeyE'),boost:keys.has('ShiftLeft')||keys.has('ShiftRight')};
 if(mouse.down&&mouse.aim){const p=visual.aimWorld(mouse.x,mouse.y);a.aimX=delta(p.x,game.players[0].x);a.aimY=p.y-game.players[0].y;a.manualAim=true;}
 if(lastInput==='touch'){
  const t=[...touches.values()].find(t=>t.left);if(t){a.x=Math.max(-1,Math.min(1,(t.x-t.sx)/55));a.y=Math.max(-1,Math.min(1,(t.sy-t.y)/55));}a.fire=true;
  const right=[...touches.values()].find(t=>!t.left);const target=right?visual.aimWorld(right.x,right.y):game.enemies.reduce((best,e)=>!best||Math.abs(delta(e.x,game.players[0].x))<Math.abs(delta(best.x,game.players[0].x))?e:best,null);
  if(target){a.aimX=delta(target.x,game.players[0].x);a.aimY=target.y-game.players[0].y;a.manualAim=true;}
 }
 const b={x:(keys.has('KeyL')?1:0)-(keys.has('KeyJ')?1:0),y:(keys.has('KeyI')?1:0)-(keys.has('KeyK')?1:0),fire:keys.has('KeyN'),pulse:keys.has('KeyM'),boost:keys.has('KeyU')};
 const combine=(key,pad)=>!pad?key:{...pad,x:key.x||pad.x,y:key.y||pad.y,fire:key.fire||pad.fire,pulse:key.pulse||pad.pulse,boost:key.boost||pad.boost,manualAim:key.manualAim||pad.manualAim,aimX:key.manualAim?key.aimX:pad.aimX,aimY:key.manualAim?key.aimY:pad.aimY};
 if(game.count===2)return [combine(a,pads[0]),combine(b,pads[1])];
 return [lastInput==='gamepad'&&pads.length?pads[0]:a];
}
function drawRadar(){const c=$('radar'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle='#213c40';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#ffffff13';ctx.lineWidth=1;for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(i*w/8,0);ctx.lineTo(i*w/8,h);ctx.stroke();}const px=x=>(wrap(x)+110)/220*w;const py=y=>h-8-y/44*(h-12);ctx.strokeStyle='#efd7a340';ctx.strokeRect(px(game.cameraX)-w*102/440,3,w*102/220,h-6);for(const t of game.trucks)if(!t.dead){ctx.fillStyle=game.convoyShield>0?'#70efdb':'#f8e8be';ctx.fillRect(px(t.x)-3,h-8,6,3);}for(const e of game.enemies){ctx.fillStyle=e.type==='boss'?'#ffcd65':'#ff7755';ctx.fillRect(px(e.x)-(e.type==='boss'?5:2),py(e.y)-2,e.type==='boss'?10:4,4);}for(const p of game.players)if(p.alive){ctx.fillStyle=p===game.players[0]?'#6de7d6':'#d6c6ff';ctx.beginPath();ctx.arc(px(p.x),py(p.y),3.5,0,Math.PI*2);ctx.fill();}}
function updateHud(){
 $('score').textContent=String(game.score).padStart(6,'0');$('convoy').textContent=game.trucks.filter(t=>!t.dead).length;$('convoy').classList.toggle('danger',Number($('convoy').textContent)<5);
 $('mission').textContent=`SORTIE 0${game.wave} / 03`;$('enemies').textContent=game.intermission>0?'AIRSPACE CLEAR / REGROUP':`${Math.max(0,12-game.spawned)+game.enemies.length} HOSTILES REMAIN`;
 const p=game.players[0];$('hull').textContent=(p.alive?'●'.repeat(Math.max(0,Math.ceil(p.hp))):'')+'○'.repeat(Math.max(0,3-Math.ceil(p.alive?p.hp:0)));$('reserves').textContent=game.reserves+' RESERVE'+(game.count===2?' / P2 '+'●'.repeat(Math.max(0,Math.ceil(game.players[1].hp))):'');
 $('pulseStatus').textContent=game.convoyShield>0?'CONVOY SHIELDED / '+Math.ceil(game.convoyShield)+' SEC':game.pulseReady>0?'RECHARGING / '+Math.ceil(game.pulseReady)+' SEC':'READY / 4 SEC PROTECTION';$('pulseMeter').style.width=(1-game.pulseReady/game.cfg.pulseCooldown)*100+'%';$('touchPulse').classList.toggle('ready',screen==='play'&&game.pulseReady<=0&&lastInput==='touch');
 const boss=game.enemies.find(e=>e.type==='boss');show('bossbar',!!boss);if(boss)$('bossHealth').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';drawRadar();
}
function loop(t){
 requestAnimationFrame(loop);const dt=Math.min(.05,(t-frameTime)/1000||1/60);frameTime=t;const pads=ended?[]:padInputs();
 if(hub?.active&&!hub.ended)hub.isRunning();
 if(screen==='title'){game.time+=dt;game.players[0].y=23+Math.sin(game.time*1.5)*.6;if(performance.now()-lastActivity>=10000)start(1,true);}
 if(screen==='attract'||screen==='play'){
  acc+=dt;const inputs=getInputs(pads);let steps=0;while(acc>=1/60&&steps++<4){game.step(1/60,inputs);acc-=1/60;}if(screen==='attract'&&(game.result||game.time>150))start(1,true);
 }else acc=0;
 const running=screen==='play'||screen==='attract';if(!muted())audio.update(dt,{active:running,throttle:Math.abs(game.players[0]?.vx||0)/40,danger:game.enemies.length/8,attract:screen==='attract'});
 if(running||screen==='hub-wait')updateHud();if(performance.now()>noticeUntil)$('notice').classList.remove('visible');
 if(hub?.active&&hub.isRunning()&&t-lastProgress>500){hub.progress(game.score,`Sortie ${game.wave} · ${game.trucks.filter(t=>!t.dead).length} trucks`);lastProgress=t;}
 visual.render({...game,players:game.players.filter(p=>p.alive),trucks:game.trucks.filter(p=>!p.dead)},dt);frameCount++;
}
async function init(){
 try{
  hub=await connectHub({start:()=>start(1),timeup:()=>{hub.result(game.score,stats());game.mode='result';screen='hub-result';renderMenu();audio.stop();},end:()=>{ended=true;screen='hub-end';game.mode='ended';keys.clear();mouse.down=false;touches.clear();audio.stop();$('menu').innerHTML='';noticeUntil=0;}});
  await initPhysics();game=new Game(event);visual=await createVisuals($('game'));window.addEventListener('resize',()=>visual.resize());
  $('loading').remove();updatePrompts();
  if(hub.active){screen='hub-wait';game.mode='waiting';setChrome(true);notice('AIR DIVISION','AWAITING SYNCHRONIZED LAUNCH',86400);hub.ready();}else title();
  window.__game={get state(){return {...game.snapshot(),screen,lastInput,frames:frameCount,renderer:visual.renderer.backend?.isWebGPUBackend?'WebGPU':'WebGL',three:'180',audio:audio.stats(),hub:hub.active};},start:(n=1)=>start(n),pause:()=>openMenu('pause'),menu:action,step:(seconds,inputs)=>{for(let i=0;i<seconds*60;i++)game.step(1/60,inputs);updateHud();},attract:()=>{lastActivity=performance.now()-10001;},get sim(){return game;},get audio(){return audio;},get renderer(){return visual.renderer;}};
  requestAnimationFrame(loop);
 }catch(err){console.error(err);hub?.fail(err.message);$('loading').innerHTML=`<strong>ROTORS GROUNDED</strong><p>${esc(err.message)}</p><small>A current browser with WebGPU or WebGL 2 is required.</small>`;window.__bootError=err.message;}
}
init();
