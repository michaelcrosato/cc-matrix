import * as THREE from 'three/webgpu';
import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.19.3';

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const defaults = {speed:30,enemySpeed:2.1,damage:9,enemyDamage:18,fireRate:.17,weakWindow:1.6,gameSpeed:1,invulnerable:false,autopilot:false};
const balance = {...defaults};
const settings = {music:.1,sfx:.7,glyphs:'playstation',shake:.65,aimAssist:true};
try { Object.assign(settings,JSON.parse(localStorage.getItem('frost-settings')||'{}')); } catch {}
const audio = new AudioSystem();
audio.setMusic(settings.music);audio.setSfx(settings.sfx);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-58,58,34,-34,.1,600);
const vec = new THREE.Vector3();
let renderer,env,world,ready=false,menu='title',mode='title',pausedFrom='play';
let lastInput='keyboard',menuFocus=0,menuItems=[],lastActivity=0,clockTime=0,lastPadNav=0;
let wave=1,score=0,base=100,reserves=3,evacuated=0,elapsed=0,stage='combat',stageTime=0;
let waveClock=0,waveSpawns=[];
let players=[],walkers=[],bullets=[],effects=[],debris=[],colliderOwners=new Map(),serial=1;
let radioTimer=0,bannerTimer=0,toastTimer=0,shake=0,flash=0,remoteInput={},remoteLast=0;
let upgrades={damage:1,armor:1,speed:1},attract=false,attractCycle=0,coopActive=false;
let manualInput=null,camX=-15,renderTime=0,briefBack='title',aboutTab='source';
const errors=[];
const rendererRecoveries=[];
const stats={shots:0,hits:0,kills:0,weakKills:0,repairs:0,forces:0,boosts:0,enemyShots:0,bombs:0,physicsSteps:0};
const held=new Set(),mouse={x:innerWidth*.65,y:innerHeight*.48,down:false,active:false};
const touches=new Map();
const padPrevious=[];
let touchMove=null,touchAim=null,touchForce=false,padForce=false;
const waveNames=['THE LONG SHADOW','TEETH IN THE WHITE','THE LAST TRANSPORT'];
const captions=[
 'Those walkers are heading for our generator. Make them regret the walk.',
 'New contacts. Homing bombs this time. Keep moving, pilot.',
 'That siege walker has the whole ridge shaking. The last transport is counting on you.'
];

const net=createNetwork({
 onInput:(input,id)=>{remoteLast=performance.now();remoteInput[id]={...input,receivedAt:remoteLast};},
 onSnapshot:s=>{if(!net.isHost)applySnapshot(s);},
 onRole:r=>{coopActive=r.players?.length>1||r.role==='guest';updateNetBadge();},
 onStart:()=>{coopActive=true;startGame({network:true});},
 onStatus:text=>{const e=$('netStatus');if(e)e.textContent=text;updateNetBadge();},
 onTimeUp:()=>{if(net.isHost)endGame(false,'The evacuation window has closed.');},
 onEnd:r=>{
  if(net.hub){mode='result';menu='';held.clear();mouse.down=false;touches.clear();remoteInput={};audio.setMuted(true);$('overlay').classList.add('hidden');$('pauseButton').classList.add('hidden');$('touchAction').classList.add('hidden');}
  else if(!net.isHost&&mode!=='result')endGame(!!r?.won,'Flight channel closed.');
 },
 onLeave:()=>{remoteInput={};if(!net.hub&&!net.isHost){pausedFrom='play';mode='paused';showOverlay('disconnect',`<section class="panel">${head('Flight link lost','Your wingmate has gone silent.','The host connection closed. Return to the flight deck to start a new sortie.')}<button class="primary" data-action="quit">Return to flight deck</button></section>`);}else toast('Wingmate disconnected. You have the controls.');}
});

function saveSettings(){try{localStorage.setItem('frost-settings',JSON.stringify(settings));}catch{}}
function setLastInput(type){if(lastInput!==type){lastInput=type;document.body.classList.toggle('touch',type==='touch');updatePrompts();}}
function noteInput(type){
 if(net.hub&&net.ended)return true;
 setLastInput(type);lastActivity=clockTime;
 if(attract){attract=false;balance.autopilot=false;showTitle();return true;}
 audio.unlock().catch(()=>{});return false;
}
function focusAt(i){
 menuItems=[...$('overlay').querySelectorAll('button:not([disabled]),input,select,textarea')];
 if(menu==='title')menuItems=[...$('titleScreen').querySelectorAll('button:not([disabled])')];
 if(!menuItems.length)return;
 menuFocus=(i+menuItems.length)%menuItems.length;
 document.querySelectorAll('.focused').forEach(e=>e.classList.remove('focused'));
 menuItems[menuFocus]?.classList.add('focused');
 menuItems[menuFocus]?.scrollIntoView({block:'nearest'});
}
function showOverlay(name,html){
 menu=name;$('titleScreen').classList.add('hidden');$('overlay').classList.remove('hidden');$('overlay').innerHTML=html;
 focusAt(0);updatePrompts();
}
const head=(eyebrow,title,sub='')=>`<header><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${sub?`<p class="subtitle">${sub}</p>`:''}</header>`;
function backButton(action='back'){return `<button class="back" data-action="${action}"><span data-prompt="back">Esc</span> Back</button>`;}
function showTitle(){
 mode='title';menu='title';attract=false;coopActive=false;lastActivity=clockTime;
 $('overlay').classList.add('hidden');$('titleScreen').classList.remove('hidden');$('hud').classList.add('hidden');$('pauseButton').classList.add('hidden');$('attractTag').classList.add('hidden');$('targetLabels').innerHTML='';$('crosshair').classList.add('hidden');$('touchAction').classList.add('hidden');$('touchTip').classList.add('hidden');$('banner').classList.add('hidden');$('radio').classList.add('hidden');
 if(ready)resetMission(true);focusAt(0);
}
function showBriefing(){
 const helping=mode==='paused';briefBack=menu;showOverlay('briefing',`<section class="panel wide">${head('Pilot briefing / 01','Hold until they’re home.','Three transports need a clear sky. Stop every walker before it reaches the generator. You have three reserve craft.')}
 <div class="mission-grid"><div class="control-card"><span class="n">01</span><h3>Fly & fight</h3><p><span data-control="move"></span> fly · <span data-control="aim"></span> aim<br><span data-control="fire"></span> fire · <span data-control="boost"></span> boost</p></div><div class="control-card"><span class="n">02</span><h3>Find the flaw</h3><p>An amber flash exposes a walker’s bomb hatch. One precise shot destroys a normal walker. The siege unit takes several.</p></div><div class="control-card"><span class="n">03</span><h3>Trust the feeling</h3><p>Survive and land hits to charge resonance. <span data-control="force"></span> clears enemy fire, opens nearby hatches and grants five seconds of protection.</p></div><div class="control-card"><span class="n">04</span><h3>Come home to repair</h3><p>Settle over the cyan repair pad near the base. Stop low and your shields regenerate. Boost spends energy; easing off restores it.</p></div></div>
 <footer class="row spread"><span class="muted">No tow cables. Just a good eye and a bad feeling.</span><button class="primary" data-action="${helping?'resume':'start'}">${helping?'Resume flight':'Launch'} <span data-prompt="confirm"></span></button></footer>${backButton(helping?'pause':'title')}</section>`);
}
function pauseGame(){if(!['play','attract'].includes(mode))return;pausedFrom=mode;mode='paused';showPause();}
function showPause(){showOverlay('pause',`<section class="panel">${head('Flight computer / Standby','Take a breath.',net.connected?'The battle continues while the flight computer is open.':'The battle is waiting for you.')}<div class="stack"><button class="primary" data-action="resume">Resume flight</button><div class="menu-grid"><button data-action="settings">Settings</button><button data-action="dev">Developer tools</button><button data-action="briefhelp">Flight manual</button><button data-action="about">About / credits</button></div><button data-action="restart">Restart sortie</button><button data-action="quit">Return to flight deck</button></div><footer><span data-prompt="pause"></span> Resume</footer></section>`);}
function resumeGame(){mode=pausedFrom;menu='';$('overlay').classList.add('hidden');mouse.down=false;held.clear();if(stage==='intermission'&&!net.connected&&!attract&&!balance.autopilot)showUpgrade();}
function showSettings(){
 showOverlay('settings',`<section class="panel">${head('Flight preferences','Make it yours.')}
 <div class="setting"><label for="music">Music<small>Original synthesized score</small></label><input id="music" type="range" min="0" max="1" step=".01" value="${settings.music}"><output>${Math.round(settings.music*100)}%</output></div>
 <div class="setting"><label for="sfx">Effects & voices<small>Blasters, engines and radio gibberish</small></label><input id="sfx" type="range" min="0" max="1" step=".01" value="${settings.sfx}"><output>${Math.round(settings.sfx*100)}%</output></div>
 <div class="setting"><label for="glyphs">Controller glyphs</label><select id="glyphs"><option value="playstation" ${settings.glyphs==='playstation'?'selected':''}>PlayStation</option><option value="xbox" ${settings.glyphs==='xbox'?'selected':''}>Xbox · A B X Y</option></select></div>
 <div class="setting"><label for="shake">Camera shake</label><input id="shake" type="range" min="0" max="1" step=".05" value="${settings.shake}"><output>${Math.round(settings.shake*100)}%</output></div>
 <div class="setting"><label for="aimAssist">Aim magnetism<small>Helps stick and touch aiming find a target</small></label><input id="aimAssist" type="checkbox" ${settings.aimAssist?'checked':''}></div>
 <footer>Headphones optional. Bravery recommended.</footer>${backButton()}</section>`);
}
function showDev(){
 const specs=[['speed','Flight speed',12,60,1],['enemySpeed','Walker speed',.25,5,.05],['damage','Blaster damage',1,30,1],['enemyDamage','Enemy damage',2,40,1],['fireRate','Fire interval',.07,.5,.01],['weakWindow','Hatch window',.4,5,.1],['gameSpeed','Simulation speed',.25,3,.25]];
 showOverlay('dev',`<section class="panel wide" id="devPanel">${head('Developer tools / Live balance','Tune the battle.','Changes apply immediately. Testing tools are available in every sortie.')}<div class="settings-grid">${specs.map(([id,label,min,max,step])=>`<div class="setting"><label for="dev-${id}">${label}</label><input type="range" id="dev-${id}" data-balance="${id}" min="${min}" max="${max}" step="${step}" value="${balance[id]}"><output>${balance[id]}</output></div>`).join('')}<div class="setting"><label for="dev-invulnerable">Invulnerable</label><input id="dev-invulnerable" data-balance="invulnerable" type="checkbox" ${balance.invulnerable?'checked':''}></div><div class="setting"><label for="dev-autopilot">AI pilot</label><input id="dev-autopilot" data-balance="autopilot" type="checkbox" ${balance.autopilot?'checked':''}></div></div><div class="menu-grid" style="margin-top:1rem"><button data-action="dev-repair">Restore shields & resonance</button><button data-action="dev-clear">Clear current wave</button><button data-action="dev-wave">Advance to final wave</button><button data-action="dev-reset">Reset balance defaults</button></div><footer>Physics: Rapier ${RAPIER.version()} · ${stats.physicsSteps} steps · ${renderer?.backend?.isWebGPUBackend?'WebGPU':'WebGL 2 fallback'}</footer>${backButton('pause')}</section>`);
}
function showUpgrade(){
 showOverlay('upgrade',`<section class="panel wide">${head(`Transport ${evacuated} / 3 away`,'A little help from home.','Choose one field modification for the next push. Shields have been restored.')}<div class="row"><button class="upgrade-card" data-upgrade="damage"><div class="symbol">ϟ</div><h3>Hot capacitors</h3><p>25% more blaster damage.<br>Give them something to remember.</p></button><button class="upgrade-card" data-upgrade="armor"><div class="symbol">◇</div><h3>Shield plating</h3><p>30% more shield capacity.<br>Cold comfort. Real protection.</p></button><button class="upgrade-card" data-upgrade="speed"><div class="symbol">≫</div><h3>Vector thrusters</h3><p>20% faster flight.<br>Never be where they’re aiming.</p></button></div><footer>The generator is still holding. Let’s keep it that way.</footer></section>`);
}
function selectUpgrade(type){
 const keepMenu=net.connected&&mode==='paused';
 upgrades[type]*=type==='damage'?1.25:type==='armor'?1.3:1.2;
 for(const p of players)p.hp=100*upgrades.armor;
 if(!keepMenu){$('overlay').classList.add('hidden');menu='';}stage='combat';wave++;spawnWave(wave);stageTime=0;audio.sfx('ui');
}
function showCoop(){
 showOverlay('coop',`<section class="panel wide">${head('Wingmate co-op / 1–2 pilots','Never fly alone.','Share the same battlefield, generator and reserve fleet. Both pilots can score the winning shot.')}<div class="mission-grid"><div class="control-card"><h3>Nearby tabs</h3><p class="co-op-info">Open this game twice on the same origin. Enter the same flight code in each tab.</p><label class="label" for="room">Flight code</label><input id="room" type="text" maxlength="18" value="FROST-7" aria-label="Flight code"><div class="row" style="margin-top:.7rem"><button data-action="host">Host</button><button data-action="join">Join</button></div></div><div class="control-card"><h3>Across the stars</h3><p class="co-op-info">Exchange connection cards with a friend on another device. Host creates a card; guest returns a reply.</p><div class="row"><button data-action="offer">Create card</button><button data-action="answer">Reply to card</button></div><textarea id="signal" aria-label="Connection card" placeholder="Paste a connection card here"></textarea><div class="row"><button data-action="accept">Accept reply</button><button data-action="copy">Copy card</button></div></div></div><div class="status-line" id="netStatus">AI Hub sessions connect automatically. Standalone co-op needs two copies of this game.</div><footer class="row spread"><span class="muted">Direct connections depend on your network.</span><button class="primary" data-action="net-start">Launch together</button></footer>${backButton('net-back')}</section>`);
}
function showAbout(tab=aboutTab){
 aboutTab=tab;
 const s=REPORT.sourceInformation;
 let body='';
 if(tab==='source')body=`<div class="credit-grid">${Object.entries(s).map(([key,val])=>`<div><b>${key.replace(/([A-Z])/g,' $1')}</b>${val}</div>`).join('')}</div><p class="subtitle">An original fan-made homage. Star Wars and its characters belong to Lucasfilm. No official affiliation. All game geometry, animation and sound were created for this demo.</p><p class="subtitle">Research: <a href="https://www.ataricompendium.com/archives/manuals/vcs/star_wars_empire.pdf" target="_blank" rel="noreferrer">1982 original manual</a> · <a href="https://atariage.com/manual_html_page.php?SoftwareLabelID=501" target="_blank" rel="noreferrer">AtariAge manual transcription</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noreferrer">AI Hub SDK</a></p>`;
 else {const groups={testing:['Testing Feedback',REPORT.testingFeedback],engine:['Engine Feedback',REPORT.engineFeedback],prompt:['Prompt Feedback',REPORT.promptFeedback]};let [title,answers]=groups[tab];body=`<div class="feedback"><h3>${title}</h3>${answers.map(x=>`<p>${x}</p>`).join('')}</div>`;}
 showOverlay('about',`<section class="panel wide">${head('Flight archive / credits','Built for a cold rebellion.')}<div class="tab-row">${[['source','Source Information'],['testing','Testing Feedback'],['engine','Engine Feedback'],['prompt','Prompt Feedback']].map(([a,t])=>`<button data-tab="${a}" class="${a===tab?'primary':''}">${t}</button>`).join('')}</div><div id="aboutBody">${body}</div>${backButton()}</section>`);
}
function updatePrompts(){
 const pad=lastInput==='gamepad',xbox=settings.glyphs==='xbox';
 const c=pad?{move:'L stick',aim:'R stick',fire:'RT',boost:'LT',force:'X',pause:'≡',confirm:'A',back:'B'}:{move:'W A S D',aim:'Mouse',fire:'LMB / Space',boost:'Shift',force:'E',pause:'Esc',confirm:'Enter',back:'Esc'};
 if(pad&&!xbox)Object.assign(c,{fire:'R2',boost:'L2',force:'□',pause:'Options',confirm:'✕',back:'○'});
 if(lastInput==='touch')Object.assign(c,{move:'Left drag',aim:'Right drag',fire:'Auto',boost:'Full drag',force:'Tap resonance',pause:'Ⅱ',confirm:'Tap',back:'Back'});
 document.querySelectorAll('[data-prompt]').forEach(e=>e.textContent=c[e.dataset.prompt]||'');
 document.querySelectorAll('[data-control]').forEach(e=>{e.textContent=c[e.dataset.control]||'';e.classList.add('key');});
 $('controlHints').innerHTML=[['move','Fly'],['fire','Fire'],['boost','Boost'],['force','Resonance']].map(([k,v])=>`<span><b class="key">${c[k]}</b>${v}</span>`).join('');
}
function back(){if(menu==='pause'){resumeGame();return;}if(mode==='paused'){showPause();return;}if(menu==='upgrade')return;showTitle();}
function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');toastTimer=3;}
function radio(text,duration=5){$('radioText').textContent=text;$('radio').classList.remove('hidden');radioTimer=duration;if(!attract)audio.voice(wave*19+Math.floor(elapsed));}
function banner(text,sub,duration=3){$('bannerTitle').textContent=text;$('bannerSub').textContent=sub;$('banner').classList.remove('hidden');bannerTimer=duration;}
function updateNetBadge(){$('netBadge').textContent=net.connected?`${net.transport.toUpperCase()} · ${net.role.toUpperCase()} · ${net.players.length} PILOTS`:'';}

async function action(name){
 if(net.hub&&['start','title','quit','restart','host','join','net-back','net-start','offer','answer','accept','coop'].includes(name)){toast('AI Hub controls the start and end of this flight.');return;}
 switch(name){
 case 'briefing':showBriefing();break;
 case 'start':net.solo();startGame();break;
 case 'title':showTitle();break;
 case 'quit':net.solo();showTitle();break;
 case 'back':back();break;
 case 'resume':resumeGame();break;
 case 'pause':showPause();break;
 case 'settings':showSettings();break;
 case 'dev':showDev();break;
 case 'about':showAbout();break;
 case 'coop':showCoop();break;
 case 'briefhelp':showBriefing();break;
 case 'restart':if(net.connected){if(net.isHost)net.restart();else toast('Your host can restart the flight.');}else startGame();break;
 case 'dev-repair':for(const p of players){p.hp=100*upgrades.armor;p.focus=100;p.energy=100;}toast('Flight systems restored.');break;
 case 'dev-clear':waveSpawns=[];for(const w of [...walkers])killWalker(w,false);toast('Wave cleared.');break;
 case 'dev-wave':clearCombat();wave=3;spawnWave(3);resumeGame();break;
 case 'dev-reset':Object.assign(balance,defaults);showDev();break;
 case 'host':net.host($('room').value);break;
 case 'join':net.join($('room').value);break;
 case 'net-back':net.solo();showTitle();break;
 case 'net-start':if(net.isHost&&net.connected)net.start();else toast('Host a flight and connect your wingmate first.');break;
 case 'offer':$('netStatus').textContent='Preparing connection card…';$('signal').value=await net.createOffer();break;
 case 'answer':{const value=$('signal').value.trim();if(!value){toast('Paste the host’s card first.');break;}$('signal').value=await net.answerOffer(value);break;}
 case 'accept':await net.acceptAnswer($('signal').value.trim());break;
 case 'copy':try{await navigator.clipboard.writeText($('signal').value);toast('Connection card copied.');}catch{$('signal').select();toast('Card selected. Copy with your keyboard.');}break;
 }
}
document.addEventListener('click',e=>{
 if(noteInput(e.pointerType==='touch'?'touch':e.detail===0?lastInput:'keyboard'))return;
 const b=e.target.closest('[data-action],[data-upgrade],[data-tab]');if(!b)return;audio.sfx('ui');
 if(b.dataset.action)action(b.dataset.action).catch(err=>toast(err.message));
 if(b.dataset.upgrade)selectUpgrade(b.dataset.upgrade);
 if(b.dataset.tab)showAbout(b.dataset.tab);
});
document.addEventListener('pointerover',e=>{const b=e.target.closest('button,input,select,textarea');if(b&&menuItems.includes(b)){menuFocus=menuItems.indexOf(b);document.querySelectorAll('.focused').forEach(el=>el.classList.remove('focused'));b.classList.add('focused');}});
document.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'&&menu&&(Math.abs(e.movementX)+Math.abs(e.movementY)>0)){setLastInput('keyboard');lastActivity=clockTime;}});
document.addEventListener('input',e=>{
 const el=e.target;if(el.dataset.balance){const k=el.dataset.balance;balance[k]=el.type==='checkbox'?el.checked:Number(el.value);if(el.nextElementSibling)el.nextElementSibling.textContent=el.value;return;}
 if(!(el.id in settings))return;settings[el.id]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;
 if(el.nextElementSibling?.tagName==='OUTPUT')el.nextElementSibling.textContent=Math.round(Number(el.value)*100)+'%';
 audio.setMusic(settings.music);audio.setSfx(settings.sfx);saveSettings();updatePrompts();
});
document.addEventListener('keydown',e=>{
 if(e.target.matches('input[type=text],textarea')){if(e.key==='Escape'){e.preventDefault();back();}return;}
 if(noteInput('keyboard')){e.preventDefault();return;}
 held.add(e.code);
 if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(mode==='play')pauseGame();else if(menu)back();return;}
 if(menu){
 if(['ArrowDown','ArrowUp','Tab'].includes(e.code)){e.preventDefault();focusAt(menuFocus+(e.code==='ArrowUp'||e.shiftKey?-1:1));audio.sfx('ui');}
 if(['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();adjustFocused(e.code==='ArrowRight'?1:-1);}
 if(e.code==='Enter'||e.code==='Space'){e.preventDefault();const f=menuItems[menuFocus];if(f?.tagName==='BUTTON')f.click();else if(f?.type==='checkbox'){f.checked=!f.checked;f.dispatchEvent(new Event('input',{bubbles:true}));}}
 }else if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
});
document.addEventListener('keyup',e=>held.delete(e.code));
function adjustFocused(d){const el=menuItems[menuFocus];if(el?.type==='range'){el.value=Number(el.value)+d*Number(el.step||1);el.dispatchEvent(new Event('input',{bubbles:true}));}else if(el?.tagName==='SELECT'){el.selectedIndex=clamp(el.selectedIndex+d,0,el.options.length-1);el.dispatchEvent(new Event('input',{bubbles:true}));}else focusAt(menuFocus+d);}
$('pauseButton').onclick=e=>{e.stopPropagation();if(!noteInput(e.pointerType==='touch'?'touch':lastInput))pauseGame();};
$('touchAction').onpointerdown=e=>{e.stopPropagation();touchForce=true;noteInput('touch');};
let canvas=$('world');
function bindCanvasInput(target){
target.addEventListener('pointerdown',e=>{
 if(noteInput(e.pointerType==='touch'?'touch':'keyboard'))return;
 if(e.pointerType==='touch'){
 const item={startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,side:e.clientX<innerWidth/2?'move':'aim'};touches.set(e.pointerId,item);target.setPointerCapture(e.pointerId);updateTouches();
 }else{mouse.down=true;mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;}
});
target.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'){const t=touches.get(e.pointerId);if(t){t.x=e.clientX;t.y=e.clientY;updateTouches();}return;}
 if(Math.abs(e.movementX)+Math.abs(e.movementY)>0){if(noteInput('keyboard'))return;mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;}
});
target.addEventListener('pointerup',releasePointer);target.addEventListener('pointercancel',releasePointer);
}
function releasePointer(e){touches.delete(e.pointerId);updateTouches();mouse.down=false;}
bindCanvasInput(canvas);window.addEventListener('pointerup',()=>mouse.down=false);
function updateTouches(){touchMove=null;touchAim=null;for(const t of touches.values()){const v={x:clamp((t.x-t.startX)/60,-1,1),y:clamp(-(t.y-t.startY)/60,-1,1)};if(t.side==='move')touchMove=v;else touchAim=v;}}
window.addEventListener('blur',()=>{held.clear();mouse.down=false;touches.clear();updateTouches();if(mode==='play'&&!net.connected)pauseGame();});

function pollPad(){
 if(net.server||(net.hub&&net.ended))return null;
 const pad=[...navigator.getGamepads?.()||[]].find(Boolean);if(!pad)return null;
 const b=pad.buttons.map(v=>typeof v==='number'?v:(v.value||(+v.pressed)));
 const axes=pad.axes.map(v=>Math.abs(v)>.16?v:0);
 const active=b.some(v=>v>.3)||axes.some(v=>Math.abs(v)>.25);
 if(active){if(noteInput('gamepad')){for(let i=0;i<b.length;i++)padPrevious[i]=b[i];return null;}}
 const edge=i=>b[i]>.5&&!(padPrevious[i]>.5);
 if(edge(9)&&!(net.hub&&b[8]>.5)){if(mode==='play')pauseGame();else if(mode==='paused')resumeGame();}
 if(menu){
 if(edge(1))back();
 const dy=(b[13]>.5||axes[1]>.5?1:0)-(b[12]>.5||axes[1]<-.5?1:0);
 const dx=(b[15]>.5||axes[0]>.5?1:0)-(b[14]>.5||axes[0]<-.5?1:0);
 if((dy||dx)&&clockTime-lastPadNav>.2){if(dy)focusAt(menuFocus+dy);else adjustFocused(dx);lastPadNav=clockTime;audio.sfx('ui');}
 if(edge(0)){const f=menuItems[menuFocus];if(f?.tagName==='BUTTON')f.click();else if(f?.type==='checkbox'){f.checked=!f.checked;f.dispatchEvent(new Event('input',{bubbles:true}));}}
 }
 padForce=edge(2);for(let i=0;i<b.length;i++)padPrevious[i]=b[i];
 return {x:axes[0]||0,y:-(axes[1]||0),aimX:axes[2]||0,aimY:-(axes[3]||0),fire:b[7]>.2||b[5]>.5,boost:b[6]>.2||b[4]>.5,force:padForce};
}
function getInput(p,pad){
 if(manualInput)return {...manualInput};
 if(attract||balance.autopilot)return aiInput(p);
 if(lastInput==='gamepad'&&pad)return pad;
 if(lastInput==='touch'){
 const target=closestWalker(p);let ax=touchAim?.x||0,ay=touchAim?.y||0;
 if(Math.hypot(ax,ay)<.2&&target){ax=target.x-p.x;ay=15.2-p.y;}
 const result={x:touchMove?.x||0,y:touchMove?.y||0,aimX:ax,aimY:ay,fire:!!target,boost:Math.hypot(touchMove?.x||0,touchMove?.y||0)>.95,force:touchForce};touchForce=false;return result;
 }
 let ax=0,ay=0;
 if(mouse.active){vec.set(mouse.x/innerWidth*2-1,-mouse.y/innerHeight*2+1,0).unproject(camera);const dir=new THREE.Vector3(0,0,-1).transformDirection(camera.matrixWorld);const t=-vec.z/dir.z;vec.addScaledVector(dir,t);ax=vec.x-p.x;ay=vec.y-p.y;}
 else {ax=p.face;ay=0;}
 const force=held.has('KeyE');held.delete('KeyE');
 return {x:(held.has('KeyD')||held.has('ArrowRight')?1:0)-(held.has('KeyA')||held.has('ArrowLeft')?1:0),y:(held.has('KeyW')||held.has('ArrowUp')?1:0)-(held.has('KeyS')||held.has('ArrowDown')?1:0),aimX:ax,aimY:ay,fire:mouse.down||held.has('Space'),boost:held.has('ShiftLeft')||held.has('ShiftRight'),force};
}

function makeBody(desc){return world.createRigidBody(desc);}
function addPlayer(id,color,x=-42,y=24){
 const mesh=createSpeeder(color);scene.add(mesh);mesh.position.set(x,y,0);
 const body=makeBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,0).setGravityScale(0).setLinearDamping(4).lockRotations());
 const collider=world.createCollider(RAPIER.ColliderDesc.ball(1.5).setSensor(true),body);
 const p={id,mesh,body,collider,x,y,vx:0,vy:0,face:1,hp:100*upgrades.armor,focus:25,energy:100,cooldown:0,invuln:2,forceTime:0,dead:0,boosting:false,repairing:false,aimX:1,aimY:0};
 colliderOwners.set(collider.handle,{type:'player',entity:p});players.push(p);return p;
}
function clearCombat(){
 for(const list of [walkers,bullets,debris])for(const e of list){if(e.mesh)scene.remove(e.mesh);if(e.body&&world?.bodies.contains(e.body.handle))world.removeRigidBody(e.body);}
 for(const e of effects)scene.remove(e.root||e.mesh);effects=[];walkers=[];bullets=[];debris=[];$('targetLabels').innerHTML='';
}
function resetMission(decorative=false){
 clearCombat();for(const p of players)scene.remove(p.mesh);players=[];world?.free();
 world=new RAPIER.World({x:0,y:-16,z:0});colliderOwners=new Map();
 world.createCollider(RAPIER.ColliderDesc.cuboid(400,1,160).setTranslation(0,-1.5,0).setRestitution(.15));
 wave=1;score=0;base=100;reserves=3;evacuated=0;elapsed=0;stage='combat';stageTime=0;upgrades={damage:1,armor:1,speed:1};serial=1;for(const k in stats)stats[k]=0;
 addPlayer(0,0xff763e,decorative?-35:-43,decorative?23:25);
 if(coopActive||net.hub&&net.players.length>1)addPlayer(1,0x69e5ed,-51,28);
 spawnWave(1,decorative);camX=decorative?-2:-25;
}
function spawnWalker(x,kind='walker',phase=0){
 const mesh=createWalker(kind==='siege'?2:wave===2?1:0);mesh.position.set(x,0,0);scene.add(mesh);
 if(kind==='siege')mesh.scale.setScalar(1.27);
 const scale=kind==='siege'?1.27:1;
 const body=makeBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,0,0));
 const colliders=[world.createCollider(RAPIER.ColliderDesc.cuboid(6*scale,3.2*scale,3.7).setTranslation(0,15*scale,0).setSensor(true),body),world.createCollider(RAPIER.ColliderDesc.cuboid(3*scale,2*scale,3.7).setTranslation(-7*scale,13*scale,0).setSensor(true),body)];
 const hp=kind==='siege'?640:190+wave*20;
 const w={id:serial++,kind,mesh,body,colliders,x,hp,maxHp:hp,phase,weak:false,forced:0,fire:2+phase*.6,bomb:6+phase,scale,dead:false,flash:0};
 for(const c of colliders)colliderOwners.set(c.handle,{type:'walker',entity:w});
 walkers.push(w);return w;
}
function spawnWave(n,decorative=false){
 const positions=n===1?[27,91]:n===2?[18,65,115]:[10,70,125];
 waveClock=0;
 waveSpawns=decorative?[]:n===1?[{at:12,x:110},{at:24,x:128}]:n===2?[{at:10,x:105},{at:20,x:130},{at:30,x:80}]:[{at:12,x:116},{at:24,x:129,kind:'siege'}];
 positions.forEach((x,i)=>spawnWalker(x,'walker',i*2.1));
 if(!decorative){banner(`Wave 0${n}`,waveNames[n-1],3);radio(captions[n-1],6);}
}
function startGame(options={}){
 if(!ready||(net.hub&&net.ended))return;
 remoteInput={};remoteLast=performance.now();
 attract=!!options.attract;coopActive=!!options.network&&(net.players.length>1||net.connected);mode=attract?'attract':'play';menu='';balance.autopilot=!!options.autopilot||attract;
 resetMission();$('titleScreen').classList.add('hidden');$('overlay').classList.add('hidden');$('hud').classList.remove('hidden');$('pauseButton').classList.toggle('hidden',attract||net.server);$('attractTag').classList.toggle('hidden',!attract);$('crosshair').classList.toggle('hidden',lastInput!=='keyboard');
 if(lastInput==='touch'){$('touchTip').classList.remove('hidden');setTimeout(()=>$('touchTip').classList.add('hidden'),5500);}
 radio(captions[0],7);banner('Hold the line','THREE WAVES · THREE TRANSPORTS · ONE CHANCE',3);held.clear();mouse.down=false;manualInput=null;
}
function closestWalker(p){return walkers.filter(w=>!w.dead).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];}
function aiInput(p){
 const w=[...walkers].sort((a,b)=>a.x-b.x)[0];
 if(!w)return{x:0,y:0,aimX:1,aimY:0,fire:false,boost:false,force:false};
 // The demonstration visits the repair pad once, then fights the actual waves.
 if((attract||balance.autopilot)&&elapsed>13&&elapsed<21&&stats.repairs===0){
 if(p.hp>60)p.hp=60;
 return{x:clamp((-77-p.x)/8,-1,1),y:clamp((3.6-p.y)/5,-1,1),aimX:1,aimY:0,fire:false,boost:Math.abs(p.x+77)>20,force:false};
 }
 const desiredX=w.x-23,desiredY=w.scale*15.2;
 return{x:clamp((desiredX-p.x)/10,-1,1),y:clamp((desiredY-p.y)/7,-1,1),aimX:w.x+.8*w.scale-p.x,aimY:desiredY-p.y,fire:true,boost:Math.abs(desiredX-p.x)>35,force:p.focus>=100};
}
function aimFor(p,input){
 let ax=Number(input.aimX)||0,ay=Number(input.aimY)||0;
 if(Math.hypot(ax,ay)<.1){ax=p.face;ay=0;}
 const len=Math.hypot(ax,ay);ax/=len;ay/=len;
 if(settings.aimAssist&&(lastInput!=='keyboard'||balance.autopilot||attract)){
 let best=.91,target=null;
 for(const w of walkers){const dx=w.x+.8*w.scale-p.x,dy=15.2*w.scale-p.y,l=Math.hypot(dx,dy),dot=(dx*ax+dy*ay)/l;if(dot>best&&l<90){target={x:dx/l,y:dy/l};best=dot;}}
 if(target){ax=target.x;ay=target.y;}
 }
 p.aimX=ax;p.aimY=ay;if(Math.abs(ax)>.15)p.face=ax<0?-1:1;
}
function fire(p){
 if(p.cooldown>0||p.dead>0)return;p.cooldown=balance.fireRate;
 const x=p.x+p.aimX*3.8,y=p.y+p.aimY*3.8;
 spawnBullet(x,y,p.aimX*100,p.aimY*100,false,false,p.id);
 stats.shots++;audio.sfx('shoot');
}
function spawnBullet(x,y,vx,vy,enemy=false,homing=false,owner=0){
 const mesh=createProjectile(enemy);mesh.position.set(x,y,0);mesh.rotation.z=Math.atan2(vy,vx);if(homing)mesh.scale.set(1.6,2.5,1.6);scene.add(mesh);
 const b={id:serial++,mesh,x,y,vx,vy,enemy,homing,owner,life:homing?11:4};
 if(homing){b.body=makeBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,y,0));b.collider=world.createCollider(RAPIER.ColliderDesc.ball(1.3).setSensor(true),b.body);colliderOwners.set(b.collider.handle,{type:'bomb',entity:b});stats.bombs++;}
 bullets.push(b);return b;
}
function force(p){
 if(p.focus<100||p.dead>0)return false;p.focus=0;p.forceTime=5;p.invuln=5;stats.forces++;audio.sfx('force');shake=1;
 for(const b of [...bullets])if(b.enemy){burst(b.x,b.y,0x6deaf0,.5);removeBullet(b);}
 for(const w of walkers)if(Math.abs(w.x-p.x)<65)w.forced=5;
 const geo=new THREE.RingGeometry(1,1.1,64),mat=new THREE.MeshBasicMaterial({color:0x92f7ff,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
 const mesh=new THREE.Mesh(geo,mat);mesh.position.set(p.x,p.y,4);scene.add(mesh);effects.push({mesh,time:0,update(dt){this.time+=dt;mesh.scale.setScalar(1+this.time*75);mat.opacity=Math.max(0,.8-this.time);if(this.time>1){scene.remove(mesh);geo.dispose();mat.dispose();return false;}return true;}});
 toast('Resonance active · hatches exposed');return true;
}
function damagePlayer(p,amount){
 if(p.invuln>0||balance.invulnerable||attract||balance.autopilot)return;
 p.hp-=amount;p.invuln=.8;shake=.8;flash=.75;audio.sfx('hit');
 if(p.hp<=0){p.hp=0;burst(p.x,p.y,0xff7439,2);p.dead=2.5;p.mesh.visible=false;reserves--;audio.sfx('explosion');if(reserves<0)endGame(false,'Our last snowcraft is down. The ridge belongs to them.');else radio('We lost a craft. Another is ready. Get back out there.',4);}
}
function burst(x,y,color=0xffa164,size=1){const fx=createExplosion(scene,new THREE.Vector3(x,y,1),color);if(fx.root)fx.root.scale.setScalar(size);effects.push(fx);}
function removeBullet(b){const i=bullets.indexOf(b);if(i>=0)bullets.splice(i,1);scene.remove(b.mesh);if(b.body){colliderOwners.delete(b.collider.handle);world.removeRigidBody(b.body);}}
function killWalker(w,weak=false){
 if(w.dead)return;w.dead=true;stats.kills++;if(weak)stats.weakKills++;score+=weak?1200:w.kind==='siege'?3000:650;
 burst(w.x,14*w.scale,0xff873f,w.scale*2);audio.sfx('explosion');shake=1.1;
 for(const p of players)p.focus=clamp(p.focus+18,0,100);
 for(let i=0;i<9;i++){
 const body=makeBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(w.x+(Math.random()-.5)*10,12+Math.random()*8,(Math.random()-.5)*4));
 body.setLinvel({x:(Math.random()-.5)*22,y:5+Math.random()*10,z:(Math.random()-.5)*9},true);body.setAngvel({x:Math.random()*3,y:Math.random()*3,z:Math.random()*4},true);
 world.createCollider(RAPIER.ColliderDesc.cuboid(.7,.6,.8).setRestitution(.25),body);
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.2,1.6),new THREE.MeshStandardMaterial({color:i%3?0x526779:0xf49b60,flatShading:true}));scene.add(mesh);debris.push({mesh,body,life:8});
 }
 scene.remove(w.mesh);for(const c of w.colliders)colliderOwners.delete(c.handle);world.removeRigidBody(w.body);walkers=walkers.filter(e=>e!==w);
}
function hitWalker(w,b){
 if(w.dead)return;stats.hits++;score+=10;
 const portY=15.2*w.scale;
 const weak=w.weak&&Math.abs(b.y-portY)<1.9*w.scale;
 let damage=balance.damage*upgrades.damage;
 if(w.kind==='siege')damage*=weak?16:.4;
 else if(weak)damage=w.maxHp;
 w.hp-=damage;w.flash=.1;burst(b.x,b.y,weak?0xffda7b:0x92e9ed,.25);audio.sfx(weak?'weakpoint':'hit');
 const p=players.find(p=>p.id===b.owner);if(p)p.focus=clamp(p.focus+2.8,0,100);
 if(w.hp<=0)killWalker(w,weak);
}
function stepPlayer(p,input,dt){
 p.invuln=Math.max(0,p.invuln-dt);p.forceTime=Math.max(0,p.forceTime-dt);p.cooldown-=dt;
 if(p.dead>0){p.dead-=dt;if(p.dead<=0){p.hp=100*upgrades.armor;p.x=-77;p.y=8;p.body.setTranslation({x:p.x,y:p.y,z:0},true);p.body.setLinvel({x:0,y:0,z:0},true);p.invuln=4;p.mesh.visible=true;}return;}
 const x=clamp(Number(input.x)||0,-1,1),y=clamp(Number(input.y)||0,-1,1),l=Math.max(1,Math.hypot(x,y));
 const boost=!!input.boost&&p.energy>3;
 if(boost&&!p.boosting){stats.boosts++;audio.sfx('boost');}p.boosting=boost;
 p.energy=clamp(p.energy+(boost?-26:19)*dt,0,100);
 const speed=balance.speed*upgrades.speed*(boost?1.9:1);
 p.vx=lerp(p.vx,x/l*speed,Math.min(1,dt*6));p.vy=lerp(p.vy,y/l*speed,Math.min(1,dt*6));
 if(p.x<-113&&p.vx<0||p.x>130&&p.vx>0)p.vx=0;
 if(p.y<3.4&&p.vy<0||p.y>46&&p.vy>0)p.vy=0;
 p.body.setLinvel({x:p.vx,y:p.vy,z:0},true);
 aimFor(p,input);if(input.fire)fire(p);if(input.force)force(p);
 p.focus=clamp(p.focus+dt*1.1,0,100);
 const repair=Math.abs(p.x+77)<9&&p.y<5.5&&Math.hypot(p.vx,p.vy)<13;
 if(repair&&p.hp<100*upgrades.armor){p.hp=clamp(p.hp+dt*27,0,100*upgrades.armor);if(!p.repairing){stats.repairs++;audio.sfx('repair');toast('Repair pad linked · shields restoring');}}p.repairing=repair;
 if(!p.invuln&&!attract&&!balance.autopilot){for(const w of walkers){if(Math.abs(p.x-w.x)<8*w.scale&&p.y>8&&p.y<19*w.scale){damagePlayer(p,28);break;}}}
}
function simulate(dt,input){
 elapsed+=dt;stageTime+=dt;stats.physicsSteps++;
 if(base<=0){endGame(false,'The generator is gone. All ships, fall back.');return;}
 if(stage==='intermission'){
 if((attract||balance.autopilot||net.connected)&&stageTime>3)selectUpgrade(wave===1?'damage':'armor');
 return;
 }
 waveClock+=dt;
 while(waveSpawns.length&&waveClock>=waveSpawns[0].at){const next=waveSpawns.shift();spawnWalker(next.x,next.kind||'walker',waveClock%6.8);radio(next.kind==='siege'?'Heavy contact on the ridge. That is the siege walker. Finish it before it finishes us.':'More walkers coming over the eastern ridge. Watch your sweep.',4);}
 for(let i=0;i<players.length;i++){
 const p=players[i];let pi=input;
 if(net.connected&&net.isHost){const id=net.players[i]?.id;pi=!net.server&&id===net.me?input:(remoteInput[id]&&performance.now()-remoteInput[id].receivedAt<1000?remoteInput[id]:{});}
 else if(i>0)pi=aiInput(p);
 stepPlayer(p,pi||{},dt);
 }
 for(const w of [...walkers]){
 const slow=lerp(.55,1,w.hp/w.maxHp);w.x-=balance.enemySpeed*(w.kind==='siege'?.7:1)*(1+(wave-1)*.2)*slow*dt;
 w.body.setNextKinematicTranslation({x:w.x,y:0,z:0});w.forced=Math.max(0,w.forced-dt);w.flash=Math.max(0,w.flash-dt);
 const cycle=(elapsed+w.phase)%6.8;w.weak=w.forced>0||cycle>6.8-balance.weakWindow;
 const wp=w.mesh.userData.weakpoint;if(wp){wp.visible=w.weak;wp.material.color?.setHex(w.forced>0?0x86f9ff:0xffbd5a);}
 w.fire-=dt;w.bomb-=dt;
 if(w.fire<=0){
 const p=players.filter(p=>!p.dead).sort((a,b)=>Math.abs(a.x-w.x)-Math.abs(b.x-w.x))[0];
 if(p){const dx=p.x-(w.x-8*w.scale),dy=p.y-13*w.scale,l=Math.hypot(dx,dy);spawnBullet(w.x-8*w.scale,13*w.scale,dx/l*25,dy/l*25,true);stats.enemyShots++;}w.fire=3.1+Math.random()*1.6;
 }
 if(wave>=2&&w.bomb<=0){spawnBullet(w.x,15*w.scale,-8,8,true,true);w.bomb=w.kind==='siege'?6:9;}
 if(w.x<-101){base=Math.max(0,base-(w.kind==='siege'?100:45));killWalker(w,false);score=Math.max(0,score-650);shake=2;radio('They reached the generator! We cannot take another hit.',5);}
 }
 world.timestep=dt;world.step();
 for(const p of players){const t=p.body.translation();p.x=clamp(t.x,-115,132);p.y=clamp(t.y,3,47);if(t.x!==p.x||t.y!==p.y)p.body.setTranslation({x:p.x,y:p.y,z:0},true);}
 for(const b of [...bullets]){
 b.life-=dt;if(b.life<=0||Math.abs(b.x)>190||b.y>75||b.y<0){removeBullet(b);continue;}
 if(b.homing){const p=players.find(p=>!p.dead);if(p){const dx=p.x-b.x,dy=p.y-b.y,len=Math.hypot(dx,dy);b.vx=lerp(b.vx,dx/len*20,dt*1.6);b.vy=lerp(b.vy,dy/len*20,dt*1.6);}}
 const len=Math.hypot(b.vx,b.vy),dir={x:b.vx/len,y:b.vy/len,z:0};
 const ray=new RAPIER.Ray({x:b.x,y:b.y,z:0},dir);
 const hit=world.castRay(ray,len*dt+1,true,undefined,undefined,undefined,undefined,c=>{const owner=colliderOwners.get(c.handle);return b.enemy?owner?.type==='player'&&!owner.entity.dead:(owner?.type==='walker'||owner?.type==='bomb');});
 if(hit){const owner=colliderOwners.get(hit.collider.handle);b.x+=dir.x*hit.timeOfImpact;b.y+=dir.y*hit.timeOfImpact;
 if(owner?.type==='walker')hitWalker(owner.entity,b);
 if(owner?.type==='player'){damagePlayer(owner.entity,b.homing?balance.enemyDamage*1.8:balance.enemyDamage);burst(b.x,b.y,0xff784b,.35);}
 if(owner?.type==='bomb'){burst(owner.entity.x,owner.entity.y,0xffc080,.7);removeBullet(owner.entity);score+=150;audio.sfx('explosion');}
 removeBullet(b);continue;
 }
 b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.body)b.body.setNextKinematicTranslation({x:b.x,y:b.y,z:0});
 }
 for(const d of [...debris]){d.life-=dt;if(d.life<=0){scene.remove(d.mesh);world.removeRigidBody(d.body);debris=debris.filter(e=>e!==d);}}
 if(!walkers.length&&!waveSpawns.length&&mode!=='result'){
 evacuated=wave;stage='intermission';stageTime=0;score+=Math.round(base*10);for(const p of players)p.hp=100*upgrades.armor;
 for(const b of [...bullets])removeBullet(b);
 if(wave===3){endGame(true,'All transports are away. There’s still a little hope in this galaxy.');return;}
 banner('Transport away',`${evacuated} OF 3 CREWS SAFE`,3);radio('Transport clear. They’re coming home because of you.',4);
 if(!attract&&!balance.autopilot&&!net.connected)showUpgrade();
 }
}
function endGame(won,reason){
 if(mode==='result')return;
 if(attract){attractCycle++;startGame({attract:true});return;}
 mode='result';menu='result';audio.sfx(won?'victory':'defeat');if(net.connected&&net.isHost)net.sendSnapshot(snapshot(),true);net.finish(won,score);$('banner').classList.add('hidden');$('radio').classList.add('hidden');$('pauseButton').classList.add('hidden');
 let best=0;try{best=Number(localStorage.getItem('frost-best')||0);if(score>best)localStorage.setItem('frost-best',String(score));}catch{}
 showOverlay('result',`<section class="panel wide">${head(won?'Operation Whiteout / Complete':'Operation Whiteout / Lost',won?'The cold didn’t win.':'A shadow on the snow.',reason)}<div class="result-values"><div><div class="label">Final score</div><div class="big-number">${score.toLocaleString()}</div></div><div><div class="label">Transports</div><div class="big-number">${evacuated} / 3</div></div><div><div class="label">Hatch kills</div><div class="big-number">${stats.weakKills}</div></div><div><div class="label">Flight time</div><div class="big-number">${Math.floor(elapsed/60)}:${String(Math.floor(elapsed%60)).padStart(2,'0')}</div></div></div><p class="subtitle">${won?'The crews owe you a drink. Preferably something warm.':'The snow remembers every brave pilot. Ready for another try?'} Personal best: ${Math.max(best,score).toLocaleString()}.</p><footer class="row"><button class="primary" data-action="restart">Fly again</button><button data-action="quit">Flight deck</button></footer></section>`);
}

function snapshot(){return{mode,wave,score,base,reserves,evacuated,elapsed,stage,waveClock,waveSpawns,upgrades,stats,players:players.map(p=>({id:p.id,x:p.x,y:p.y,vx:p.vx,vy:p.vy,hp:p.hp,focus:p.focus,energy:p.energy,face:p.face,aimX:p.aimX,aimY:p.aimY,forceTime:p.forceTime,invuln:p.invuln,boosting:p.boosting,repairing:p.repairing,dead:p.dead})),walkers:walkers.map(w=>({id:w.id,x:w.x,hp:w.hp,maxHp:w.maxHp,kind:w.kind,weak:w.weak,scale:w.scale})),bullets:bullets.map(b=>({id:b.id,x:b.x,y:b.y,vx:b.vx,vy:b.vy,enemy:b.enemy,homing:b.homing})),won:mode==='result'&&evacuated===3};}
function applySnapshot(s){
 if(!ready||!s?.players)return;
 if(mode==='title'||menu==='coop')startGame({network:true});
 wave=s.wave;score=s.score;base=s.base;reserves=s.reserves;evacuated=s.evacuated;elapsed=s.elapsed;stage=s.stage;waveClock=s.waveClock??0;waveSpawns=s.waveSpawns||[];upgrades=s.upgrades;Object.assign(stats,s.stats);
 for(const data of s.players){let p=players.find(p=>p.id===data.id);if(!p)p=addPlayer(data.id,0x6de9eb);Object.assign(p,data);}
 for(const data of s.walkers){let w=walkers.find(w=>w.id===data.id);if(!w){w=spawnWalker(data.x,data.kind);w.id=data.id;}Object.assign(w,data);const wp=w.mesh.userData.weakpoint;if(wp)wp.visible=w.weak;}
 for(const w of [...walkers])if(!s.walkers.some(d=>d.id===w.id)){burst(w.x,15,0xffa660,2);scene.remove(w.mesh);world.removeRigidBody(w.body);walkers=walkers.filter(e=>e!==w);}
 for(const b of bullets)scene.remove(b.mesh);bullets=[];
 for(const b of s.bullets){const mesh=createProjectile(b.enemy);scene.add(mesh);bullets.push({...b,mesh,life:1});}
 if(s.mode==='result'&&mode!=='result')endGame(s.won,s.won?'All transports are away. Together, you held the line.':'The flight is over.');
}

function tick(dt,pad=null){
 clockTime+=dt;renderTime+=dt;
 if(!net.hub&&menu==='title'&&mode==='title'&&clockTime-lastActivity>=10){startGame({attract:true});}
 if(['play','attract'].includes(mode)||(net.connected&&mode==='paused')){
 const index=net.connected?net.players.findIndex(p=>p.id===net.me):0;
 const local=net.server?null:(players[index]||players[0]);
 if(net.server)simulate(dt*balance.gameSpeed,{});
 else if(local){const input=mode==='paused'?{}:getInput(local,pad);if(net.connected&&!net.isHost)net.sendInput(input);else simulate(dt*balance.gameSpeed,input);}
 if(net.isHost&&net.connected)net.sendSnapshot(snapshot());
 }
 if(radioTimer>0){radioTimer-=dt;if(radioTimer<=0)$('radio').classList.add('hidden');}
 if(bannerTimer>0){bannerTimer-=dt;if(bannerTimer<=0)$('banner').classList.add('hidden');}
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.add('hidden');}
}
function visualUpdate(dt){
 env?.update(dt,renderTime);
 for(const p of players){
 p.mesh.position.set(p.x,p.y,0);p.mesh.rotation.y=p.face<0?Math.PI:0;p.mesh.rotation.z=clamp(p.vy*.009,-.22,.22)*p.face;
 p.mesh.userData.mixer?.update(dt);if(p.boosting&&p.mesh.userData.engine)p.mesh.userData.engine.scale.x*=1.8;
 p.mesh.visible=p.dead<=0&&(p.invuln<=0||p.forceTime>0||Math.floor(renderTime*12)%3!==0);
 }
 for(const w of walkers){w.mesh.position.x=w.x;w.mesh.userData.mixer?.update(mode==='paused'&&!net.connected?0:dt*(.6+balance.enemySpeed*.35));}
 for(const b of bullets){b.mesh.position.set(b.x,b.y,1);b.mesh.rotation.z=Math.atan2(b.vy,b.vx);}
 for(const d of debris){d.mesh.position.copy(d.body.translation());d.mesh.quaternion.copy(d.body.rotation());}
 for(const fx of [...effects])if(fx.update(dt)===false)effects=effects.filter(e=>e!==fx);
 const index=net.connected?net.players.findIndex(p=>p.id===net.me):0;
 const local=net.server?null:(players[index]||players[0]);
 const desired=mode==='title'?-3:clamp((local?.x||0)+((local?.face||1)*13),-66,80);
 camX=lerp(camX,desired,Math.min(1,dt*2.3));
 shake=Math.max(0,shake-dt*3);flash=Math.max(0,flash-dt*2);$('damageFlash').style.opacity=flash*.6;
 camera.position.set(camX+(Math.random()-.5)*shake*settings.shake,32+(Math.random()-.5)*shake*settings.shake,100);camera.lookAt(camX,18,0);camera.updateMatrixWorld();
 if(mode==='title'){for(const p of players){p.y=23+Math.sin(renderTime*.8)*2;p.x=-35+Math.sin(renderTime*.18)*8;}}
 if(local)audio.update(dt,{speed:Math.hypot(local.vx,local.vy)/60,danger:Math.max(0,1-base/100)*.5+wave*.16,playing:['play','attract'].includes(mode)});
 if(['play','attract','paused','result'].includes(mode))updateHUD(local);
 $('crosshair').classList.toggle('hidden',!['play','attract'].includes(mode)||lastInput!=='keyboard'||attract);
 $('crosshair').style.left=mouse.x+'px';$('crosshair').style.top=mouse.y+'px';
}
function updateHUD(p){
 $('waveName').textContent=`0${wave} / ${waveNames[wave-1]}`;$('baseValue').textContent=Math.round(base)+'%';$('baseBar').style.width=base+'%';$('evacValue').textContent=`${evacuated} / 3`;$('scoreValue').textContent=String(score).padStart(6,'0');$('reserveValue').textContent=Math.max(0,reserves);
 if(p){$('shieldValue').textContent=Math.round(p.hp);$('shieldBar').style.width=p.hp/(100*upgrades.armor)*100+'%';$('focusBar').style.width=p.focus+'%';$('energyBar').style.width=p.energy+'%';$('focusLabel').textContent=p.forceTime>0?'Resonating':p.focus>=100?'Resonance ready':'Resonance';$('touchAction').classList.toggle('hidden',lastInput!=='touch'||p.focus<100||mode!=='play');}
 $('threatCount').textContent=walkers.length+' hostile'+(walkers.length===1?'':'s');
 $('waveObjective').textContent=p?.repairing?'Repair pad linked · shields restoring':stage==='intermission'?'Transport departing · next wave inbound':!walkers.length&&waveSpawns.length?`Reinforcements inbound in ${Math.ceil(waveSpawns[0].at-waveClock)}s · regroup and repair`:wave===3?'Break the siege walker. Clear the final transport.':'Stop the walkers before they reach the generator.';
 $('radar').innerHTML=walkers.map(w=>`<i class="radar-dot" style="left:${clamp((w.x+110)/245*100,2,98)}%"></i>`).join('')+players.map((q,i)=>`<i class="radar-dot ship ${i?'friend':''}" style="left:${clamp((q.x+110)/245*100,2,98)}%"></i>`).join('');
 let labels='';
 for(const w of walkers){vec.set(w.x,24*w.scale,0).project(camera);if(Math.abs(vec.x)<1.15)labels+=`<div class="enemy-label" style="left:${(vec.x*.5+.5)*innerWidth}px;top:${(-vec.y*.5+.5)*innerHeight}px">${w.kind==='siege'?'SIEGE WALKER':'ARMORED WALKER'}<div class="hp"><i style="width:${w.hp/w.maxHp*100}%"></i></div>${w.weak?'<div class="weak">◇ HATCH EXPOSED</div>':''}</div>`;}
 $('targetLabels').innerHTML=labels;
}
function resize(){
 const aspect=innerWidth/innerHeight,halfHeight=aspect<1.1?43:33;camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();renderer?.setSize(innerWidth,innerHeight);renderer?.setPixelRatio(Math.min(devicePixelRatio,2));
}
window.addEventListener('resize',resize);
window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));

window.__game={
 get ready(){return ready;},audio,network:net,start:startGame,pause:pauseGame,resume:resumeGame,
 inspect:()=>({ready,mode,menu,menuFocus,lastInput,wave,score,base,health:players[0]?.hp??0,focus:players[0]?.focus??0,energy:players[0]?.energy??0,reserves,evacuated,elapsed,stage,player:players[0]?{x:players[0].x,y:players[0].y}:null,players:players.map(p=>({id:p.id,x:p.x,y:p.y,health:p.hp})),enemies:walkers.map(w=>({x:w.x,hp:w.hp,weak:w.weak,kind:w.kind})),stats:{...stats},renderer:renderer?.backend?.isWebGPUBackend?'WebGPU':'WebGL2',rendererRecoveries:[...rendererRecoveries],physicsVersion:ready?RAPIER.version():'unknown',errors:[...errors],net:net.inspect(),balance:{...balance},settings:{...settings},attractCycle}),
 setInput:input=>{manualInput=input;},
 step:seconds=>{const count=Math.ceil(seconds*60);for(let i=0;i<count;i++)tick(1/60);visualUpdate(0);return window.__game.inspect();},
 menu:name=>{if(name==='title')showTitle();else if(name==='pause'){pausedFrom='play';mode='paused';showPause();}else if(name==='settings')showSettings();else if(name==='dev')showDev();else if(name==='about')showAbout();},
 dev:{set:(key,value)=>{if(key in balance)balance[key]=value;else if(['focus','health','energy'].includes(key)){const p=players[0];if(p)p[key==='health'?'hp':key]=value;}else if(key==='base')base=value;},spawnWave:n=>{clearCombat();wave=n;stage='combat';spawnWave(n);},damage:n=>damagePlayer(players[0],n),teleport:(x,y)=>{const p=players[0];p.x=x;p.y=y;p.vx=p.vy=0;p.body.setTranslation({x,y,z:0},true);p.body.setLinvel({x:0,y:0,z:0},true);},force:()=>force(players[0]),killAll:()=>{waveSpawns=[];for(const w of [...walkers])killWalker(w,false);},setAutopilot:b=>balance.autopilot=b}
};

async function initializeRenderer(){
 for(let attempt=0;attempt<3;attempt++){
  let candidate;
  try{
   candidate=new THREE.WebGPURenderer({canvas,antialias:true,alpha:false,forceWebGL:attempt===2});
   candidate.setClearColor(0x53778c);candidate.outputColorSpace=THREE.SRGBColorSpace;candidate.toneMapping=THREE.ACESFilmicToneMapping;candidate.toneMappingExposure=1.1;
   await candidate.init();
   if(attempt===0&&navigator.gpu&&!candidate.backend.isWebGPUBackend)throw new Error('WebGPU initialization selected WebGL2; retrying WebGPU with a fresh context.');
   candidate.setPixelRatio(Math.min(devicePixelRatio,2));candidate.setSize(innerWidth,innerHeight);
   await candidate.renderAsync(scene,camera);
   return candidate;
  }catch(error){
   rendererRecoveries.push({attempt:attempt+1,reason:String(error?.message||error),backend:attempt===2?'WebGL2':'WebGPU'});
   try{candidate?.dispose();}catch{}
   if(attempt===2)throw error;
   // Canvas context types cannot be changed after either backend has claimed one.
   const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;bindCanvasInput(canvas);
   $('loadDetail').textContent='Reconnecting the graphics system…';
   await new Promise(resolve=>setTimeout(resolve,150));
  }
 }
}
async function init(){
 try{
 $('loadDetail').textContent='Initializing WebGPU renderer and Rapier 0.19.3…';
 await RAPIER.init();
 env=createEnvironment(scene);resize();resetMission(true);focusAt(0);updatePrompts();camera.position.set(-3,32,100);camera.lookAt(-3,18,0);camera.updateMatrixWorld();
 renderer=await initializeRenderer();ready=true;$('loading').classList.add('hidden');
 if(net.hub){mode='session-wait';menu='';$('titleScreen').classList.add('hidden');$('overlay').classList.add('hidden');}
 const hubInfo=await net.connect();if(!hubInfo&&mode==='session-wait')showTitle();net.ready();
 let previous=performance.now(),accumulator=0;
 renderer.setAnimationLoop(now=>{
 const delta=Math.min(.12,(now-previous)/1000);previous=now;
 const pad=pollPad();accumulator+=delta;let count=0;
 while(accumulator>=1/60&&count<8){tick(1/60,pad);accumulator-=1/60;count++;}
 visualUpdate(delta);renderer.render(scene,camera);
 });
 }catch(error){
 errors.push(String(error));$('loadDetail').textContent='Flight systems could not start: '+error.message+'. This game needs a browser with WebGPU or WebGL 2 and an internet connection for its pinned engine libraries.';
 net.fail(error.message);console.error(error);
 }
}
init();
