import {Cruise,DEFAULTS,PLANETS,initPhysics,clamp} from './core.js';
import {View} from './visuals.js';
import {Audio} from './audio.js';
import {Input} from './input.js';
import {Network} from './network.js';

const $=s=>document.querySelector(s),app=$('#app');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('en-US');
const clock=n=>`${Math.floor(Math.max(0,n)/60)}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
const data=JSON.parse($('#credits-data').textContent);
const settingsDefaults={music:10,sfx:70,glyphs:'ps',shake:true,assist:false};
let settings={...settingsDefaults},record={best:0,pairs:[]};
try{settings={...settings,...JSON.parse(localStorage.getItem('ccc-settings')||'{}')};record={...record,...JSON.parse(localStorage.getItem('ccc-record')||'{}')};}catch{}
const audio=new Audio();audio.setVolumes(settings.music/100,settings.sfx/100);
let game,view,input,net,screen='loading',backScreen='title',focusIndex=0,attract=false,lastActivity=performance.now(),toastTimer=0,toastTimeout,accumulator=0,lastFrame=0,hudCd=0,uiTime=0,endedHandled=false,joinCursor=0,joinCode='222222',hubCountdown=false,focusBeforeSettings=0;
let promptDevice='keyboard',debugUsed=false;const isMenu=()=>screen!=='play';
const store=()=>{try{localStorage.setItem('ccc-settings',JSON.stringify(settings));localStorage.setItem('ccc-record',JSON.stringify(record));}catch{}};
function key(action){
  const keyboard={start:'Enter',move:'WASD',fire:'Space',beam:'Space',pulse:'E',boost:'Shift',pause:'Esc',back:'Esc',recall:'R'};
  const ps={start:'×',move:'L',fire:'×',beam:'×',pulse:'○',boost:'R2',pause:'☰',back:'○',recall:'△'};
  const xbox={start:'A',move:'L',fire:'A',beam:'A',pulse:'B',boost:'RT',pause:'☰',back:'B',recall:'Y'};
  const touch={start:'Tap',pause:'☰',back:'Back'};
  return `<span class="key${input?.last==='pad'?' pad':''}" data-key="${action}">${input?.last==='pad'?(settings.glyphs==='ps'?ps:xbox)[action]:input?.last==='touch'?(touch[action]||keyboard[action]):keyboard[action]}</span>`;
}
function updatePrompts(){document.querySelectorAll('[data-key]').forEach(el=>{const action=el.dataset.key;const temp=document.createElement('span');temp.innerHTML=key(action);el.replaceWith(temp.firstChild);});document.body.classList.toggle('touching',input?.last==='touch');}
function button(action,label,kind='back',extra=''){return `<button class="nav ${kind}" data-action="${action}" ${extra}>${label}</button>`;}
function panel(eyebrow,title,body,wide=false){return `<section class="overlay"><div class="panel${wide?' wide':''}"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${body}</div></section>`;}
function footer(label='A little courage goes a long way.'){return `<div class="screen-footer"><span>${key('start')} Select &nbsp; ${key('back')} Back</span><span>${label}</span></div>`;}
function setFocus(index,domFocus=false){
  const els=[...app.querySelectorAll('.nav:not(:disabled)')];if(!els.length)return;focusIndex=(index+els.length)%els.length;els.forEach((e,i)=>e.classList.toggle('focused',i===focusIndex));
  const focused=els[focusIndex];if(domFocus&&input?.last!=='touch'){focused.focus({preventScroll:true});focused.scrollIntoView({block:'nearest',inline:'nearest'});}else if(document.activeElement!==focused&&document.activeElement?.tagName!=='INPUT')document.activeElement?.blur();
}
function show(next,{focus=0,parent}={}){if(parent)backScreen=parent;screen=next;focusIndex=focus;document.body.classList.toggle('playing',next==='play');render();if(next!=='play')input?.clear();}
function render(){
  let html='';
  if(screen==='title'){
    html=`<section class="title-screen"><div class="topline"><div class="brand"><span class="brand-mark">✧</span> INTERSTELLAR RESCUE SERVICE</div><div class="eyebrow">Three worlds. One ark.</div></div><div class="title-copy"><div class="eyebrow">A two-by-two space odyssey</div><h1>COSMIC<br>CREATURE<br><span>CRUISE</span></h1><p class="lede">Stand your ground. Beam them aboard.<br>Leave no little life behind.</p><div class="title-menu">${button('new',`Set a course <span class="arrow">↗</span>`,'primary')}<div class="menu-row">${button('online','Fleet play ↗','text-button')}${button('settings','Settings','text-button')}${button('credits','About','text-button')}</div></div></div><div class="orbit-stamp">ARK SERVICE<b>✧</b>NO. 018</div><aside class="title-aside"><div class="eyebrow">Precious cargo</div><h2>THE UNIVERSE IS BIG.<br>THESE GUYS ARE NOT.</h2><p>Rescue a pair. Save a species.<br>Try not to scratch the spaceship.</p><span class="small title-route">◌ Mallow &nbsp; / &nbsp; ◌ Ember &nbsp; / &nbsp; ◌ Reef</span></aside><div class="screen-footer"><span>${key('start')} Launch &nbsp; <span class="muted">·</span> &nbsp; ${net?.mode==='room'?'Fleet connected':`Best cruise ${fmt(record.best)}`}</span><span>Inspired by Cosmic Ark · 1982</span></div></section>`;
  } else if(screen==='briefing'){
    html=panel('Flight card / 01','Small lives. Big mission.',`<p class="intro">The stars are going out. Your ark has room for one more pair.<br>Visit three worlds. Get everyone home.</p><div class="control-guide"><div class="guide-card"><div class="step">01 / HOLD THE LINE</div><h3>Protect the ark</h3><p>Meteors arrive from four directions. Aim into their path and keep firing. Pink comets take two hits.</p><div class="mini">${key('move')} Aim &nbsp; ${key('fire')} Fire &nbsp; ${key('pulse')} Pulse</div></div><div class="guide-card"><div class="step">02 / BRING THEM HOME</div><h3>Fly. Beam. Return.</h3><p>Hover above a creature and hold the beam. Carry two, then fly to the glowing dock at the top. Matching pairs earn a bonus.</p><div class="mini">${key('move')} Fly &nbsp; ${key('beam')} Beam &nbsp; ${key('boost')} Boost</div></div></div><p class="small muted">A pulse clears nearby danger. Recharges in 9 seconds. Six creatures per planet; the solar surge won't wait.</p><div class="panel-actions">${button('launch',`Let's go ${key('start')}`,'primary')}${button('title','Back')}</div>`,true);
  } else if(screen==='online'){
    html=panel('Fleet play / 1–4 captains','Same stars. Friendly rivalry.',`<p class="intro">Each captain has an ark. Fly the same mission, see your friends' ghost ships, and chase the best rescue score.</p><div class="choice-grid">${button('host','<i>↗</i><b>Create a room</b><span>Get a six-character invite code.<br>The captain launches the fleet.</span>','choice')}${button('join-menu','<i>⌁</i><b>Join a room</b><span>Enter your captain’s code.<br>Up to four arks. No collisions.</span>','choice')}</div><p class="small">Online rooms use PeerJS signaling. Same-browser tabs also connect directly. AI Hub sessions connect automatically.</p><div class="panel-actions">${button('title','Back')}</div>`);
  } else if(screen==='join'){
    html=panel('Fleet play / join','Your ark awaits.',`<p>Enter the captain’s six-character room code.</p><input id="room-input" class="room-code-input nav" type="text" inputmode="text" maxlength="6" aria-label="Room code" autocomplete="off" spellcheck="false" value="${escape(joinCode)}"><p class="small muted">Controller: left / right chooses a letter, up / down changes it. Cross joins.<br>Keyboard: type the code, then Enter.</p><div class="room-status" id="room-status">${escape(net.status)}</div><div class="panel-actions">${button('join','Join fleet ↗','primary')}${button('online','Back')}</div>`);
  } else if(screen==='lobby'){
    html=panel('Fleet play / boarding','All aboard.',`<p class="intro">${net.isHost?'Share the code. Launch when your fleet is ready.':'Your captain will launch the cruise.'}</p><div class="eyebrow">Room code</div><div class="room-code">${escape(net.roomCode)}</div><div class="seats">${Array.from({length:4},(_,i)=>{const p=net.players.find(p=>p.id===i);return `<div class="seat${p?'':' empty'}"><i class="seat-dot" style="background:${p?.color||'#40536b'}"></i>${p?escape(p.name)+(p.id===net.me?' · you':''):'Open seat'}</div>`;}).join('')}</div><div class="room-status">${escape(net.status)}</div><div class="panel-actions">${net.isHost?button('room-launch',`Launch fleet ${key('start')}`,'primary'):''}${button('leave-room','Leave room')}</div>`);
  } else if(screen==='settings'){
    html=panel('Ship systems','Make yourself at home.',`<div class="settings-row"><span>Music</span><input class="nav" data-setting="music" aria-label="Music volume" type="range" min="0" max="100" step="1" value="${settings.music}"><output id="out-music">${settings.music}%</output></div><div class="settings-row"><span>Sound & voices</span><input class="nav" data-setting="sfx" aria-label="Sound and voices volume" type="range" min="0" max="100" step="1" value="${settings.sfx}"><output id="out-sfx">${settings.sfx}%</output></div><div class="settings-row"><span>Controller glyphs</span>${button('glyphs',settings.glyphs==='ps'?'PlayStation · × ○ □ △':'Xbox · A B X Y','setting-toggle')}</div><div class="settings-row"><span>Screen shake</span>${button('shake',settings.shake?'On':'Off','setting-toggle')}</div><div class="settings-row"><span>Flight assistance</span>${button('assist',settings.assist?'On · auto fire & beam':'Off','setting-toggle')}</div><p class="small muted">${input?.last==='touch'?'Touch: drag anywhere to fly. Fire, aim and beam are assisted. Tap ◎ for a pulse.':'Mouse: point and hold to fire in orbit. WASD flies on planets. Space holds the beam. Touch uses a floating thumbstick with automatic aim and beam.'}</p><div class="panel-actions">${button('settings-back','Done','primary')}${button('settings-reset','Defaults')}</div>`);
  } else if(screen==='pause'){
    html=panel('The ark is in good hands.',net.hub?'Flight continues':'Take a little breather.',`<div class="stack">${button('resume',`Resume cruise <span style="float:right">${key('pause')}</span>`,'primary')}${button('settings','Settings','')}${button('archive',`Creature log · ${game.pairs} pairs reunited`,'')}${!net.hub?button('dev','Developer mode',''):''}${button('credits','About & credits','')}${!net.hub?button('retire','Return to title',''):''}</div><p class="small muted">${net.hub?'Your mission keeps running while this menu is open.':'The universe can wait a moment.'}</p>`);
  } else if(screen==='dev'){
    const definitions=[['meteorSpeed','Meteor speed',1,10,.1],['spawnRate','Meteor interval',.3,3,.05],['shuttleSpeed','Shuttle speed',3,18,.25],['beamSpeed','Beam strength',.3,5,.1],['defenseSeconds','Orbit seconds',5,70,1],['rescueSeconds','Rescue seconds',20,180,1],['pulseSeconds','Pulse recharge',1,20,.5],['damage','Damage scale',0,3,.1]];
    html=panel('Developer mode / live controls','The captain’s toolkit.',`<div class="scroll"><div class="dev-grid">${definitions.map(([id,label,min,max,step])=>`<div class="settings-row"><span>${label}</span><input class="nav" data-tuning="${id}" aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${game.tuning[id]}"><output id="out-${id}">${game.tuning[id]}</output></div>`).join('')}</div><div class="dev-actions">${button('god',`Invincible: ${game.god?'ON':'OFF'}`,'')}${button('autopilot',`Autopilot: ${game.autopilot?'ON':'OFF'}`,'')}${button('heal','Repair hull','')}${button('pulse-reset','Recharge pulse','')}${button('skip','Next phase','')}${button('next-planet','Next planet','')}${button('meteor','Spawn meteor','')}${button('step','Advance 1 second','')}${button('restart','Restart mission','')}${button('tuning-reset','Reset balance','')}</div><p class="small muted">Changes apply immediately. Next phase cycles orbit → descent → rescue → departure. Rescue duration is also applied to the current stop. Developer runs do not set a best score.</p></div><div class="panel-actions">${button('dev-resume','Fly with changes ↗','primary')}${button('pause','Back')}</div>`,true);
  } else if(screen==='archive'){
    const known=new Set([...record.pairs,...game.pairLog]);html=panel('Passenger manifest',`${game.rescued} aboard. ${game.pairs} pairs together.`,`<div class="scroll"><p>Every little passenger has a place in the stars. Reunite a pair to stamp your field guide.</p><div class="archive-grid">${PLANETS.flatMap((p,pi)=>p.species.map((name,i)=>{const yes=known.has(pi*3+i);return `<div class="archive-item${yes?'':' locked'}" style="--color:${p.colors[i]}"><div class="archive-face">●ᴗ●</div><b>${escape(name)}</b><span>${p.name} · ${yes?'Pair reunited':'Pair still out there'}</span></div>`;})).join('')}</div></div><div class="panel-actions">${button('pause','Back to flight')}</div>`,true);
  } else if(screen==='credits'){
    const labels={date:'Date',source:'Source',plan:'Plan',genre:'Genre',perspective:'Perspective',tech:'Tech',artDirection:'Art Direction',animation:'Animation',audio:'Audio',online:'Online',testing:'Testing',research:'Research',environment:'Environment',model:'Model',usage:'Usage'};
    html=panel('About / credits','Cosmic Creature Cruise',`<div class="scroll"><p>An original little rescue voyage, inspired by the four-way defense and planetary pickups of <b>Cosmic Ark (1982)</b>. All models, music, effects, and creature chatter are made in code.</p><h3 class="credit-section">Source Information</h3><div class="credits-grid">${Object.entries(data.sourceInformation).map(([k,v])=>`<div class="credit"><b>${labels[k]||k}</b>${escape(v)}</div>`).join('')}</div>${[['Testing Feedback',data.testingFeedback],['Engine Feedback',data.engineFeedback],['Prompt Feedback',data.promptFeedback]].map(([title,answers])=>`<h3 class="credit-section">${title}</h3><ol class="feedback">${answers.map(a=>`<li>${escape(a)}</li>`).join('')}</ol>`).join('')}<h3 class="credit-section">Made with</h3><p class="small">Three.js r180 (MIT), Rapier 0.19.3 (Apache-2.0), PeerJS 1.5.5 (MIT). AI Hub session client 1.4.0. Original code and procedural art by OpenAI gpt-6.1-sol. No external art, audio, or font assets.</p></div><div class="panel-actions">${button('credits-back','Back','primary')}</div>`,true);
  } else if(screen==='results'){
    const won=game.phase==='victory';html=panel(won?'Cruise complete / Welcome home':'Mission ended / The stars remember',won?(game.rescued===18?'Everybody aboard.':'You brought them home.'):'A brave little voyage.',`<p class="intro">${won?'Small creatures. Enormous universe. One very good ark.':escape(game.endReason)}</p><div class="eyebrow">Rescue score${debugUsed?' · Developer run':''}</div><div class="result-score">${fmt(game.score)}</div><div class="result-stats"><div><b>${game.rescued}<span style="display:inline;font-size:20px;color:#7c96b0"> / 18</span></b><span>little lives saved</span></div><div><b>${game.pairs}<span style="display:inline;font-size:20px;color:#7c96b0"> / 9</span></b><span>pairs reunited</span></div><div><b>${game.kills}</b><span>meteors stopped</span></div></div>${net.mode==='room'?`<p class="small">${net.players.map(p=>`${escape(p.name)}: ${fmt(p.id===net.me?game.score:p.score??net.ghosts.get(p.id)?.score??0)}`).join(' &nbsp; · &nbsp; ')}</p>`:''}<div class="panel-actions">${!net.hub?button('replay','One more cruise ↗','primary'):''}${!net.hub?button('title','Title screen'):''}${net.hub?'<p class="small">Score sent to the fleet. Waiting for the round to end.</p>':''}</div>`);
  } else if(screen==='hubwait'){
    html=`<div class="phase-banner"><div class="eyebrow">Fleet session</div><h2>The ark is ready.</h2><p>Waiting for the fleet to launch.</p></div>`;
  } else if(screen==='hubend'){
    html=`<div class="phase-banner"><div class="eyebrow">Fleet session / Round ended</div><h2>Good flying, captain.</h2><p>${fmt(game.score)} points · ${game.rescued} little lives saved</p></div>`;
  }
  if(screen==='play'||['pause','dev','archive','results'].includes(screen)||screen==='settings'&&backScreen==='pause'||screen==='credits'&&backScreen==='pause')html=makeHud()+html;
  app.innerHTML=html;setFocus(focusIndex);updatePrompts();if(screen==='play')updateHud();
}
function makeHud(){return `<section id="hud" aria-label="Flight instruments"><div class="hud-top"><div class="hud-world"><div class="eyebrow" id="route-label"></div><h2 id="world-name"></h2><div class="phase-label" id="phase-name"></div></div><div class="score-block"><div class="score-label">RESCUE SCORE</div><div class="score" id="score"></div></div><div class="hull-block"><div class="eyebrow">ARK INTEGRITY</div><div class="hull-pips" id="hull"></div><div class="small muted" id="streak"></div></div></div>${!attract?`<button class="hud-menu" data-action="pause" tabindex="${screen==='play'?0:-1}">${key('pause')} Menu</button>`:''}<div class="hud-bottom"><div class="objective"><h3 id="objective-title"></h3><p id="objective-sub"></p><div class="controls-strip" id="controls-strip"></div></div><div class="mission-state" id="mission-state"></div></div><div class="network-board" id="network-board"></div>${debugUsed?'<div class="dev-badge">DEVELOPER FLIGHT</div>':''}<div id="phase-banner"></div>${attract?'<div class="attract-bar"><b>FLIGHT DEMONSTRATION</b><span>Press any button to take the helm</span></div>':''}</section>`;}
function updateHud(){
  if(!$('#hud'))return;const p=PLANETS[game.planet],phase=game.phase,s=game.shuttle;
  $('#route-label').textContent=`STOP ${String(game.planet+1).padStart(2,'0')} / 03`;
  $('#world-name').textContent=p.name;$('#phase-name').textContent={defense:'Orbital defense',descent:'Approaching the surface',rescue:'Planetary rescue',warp:'All aboard / departing',escape:'Homeward bound',victory:'Cruise complete',defeat:'Signal lost'}[phase];
  $('#score').textContent=fmt(game.score);$('#hull').innerHTML=Array.from({length:6},(_,i)=>`<i class="pip${i>=Math.ceil(game.hull)?' off':game.hull<3?' low':''}"></i>`).join('');$('#streak').textContent=phase==='defense'&&game.combo>0?`${game.combo} streak · ×${Math.min(5,1+Math.floor(game.combo/4))}`:`${game.rescued} little lives aboard`;
  let objective='',sub='',controls='',mission='',banner='';
  const pulseText=game.pulseCd>0?`Pulse ${Math.ceil(game.pulseCd)}s`:'Pulse ready';
  if(phase==='defense'){
    objective='Hold the line.';sub='Aim into the meteors. Keep the little ones safe.';controls=`<span>${key('move')} Aim</span><span>${key('fire')} Fire</span><span>${key('pulse')} ${pulseText}</span>`;
    const remaining=game.tuning.defenseSeconds+game.planet*4-game.phaseTime;mission=`<div class="eyebrow">Surface window</div><div class="clock">${clock(remaining)}</div><div class="meter"><i style="width:${clamp(remaining/(game.tuning.defenseSeconds+game.planet*4)*100,0,100)}%"></i></div><div class="small muted">${game.planet===0?'Four directions. One precious ark.':game.planet===1?'Pink comets take two hits.':'The last world is counting on you.'}</div>`;
    if(game.phaseTime<3.5)banner=`<div class="phase-banner"><div class="eyebrow">${game.planet===0?'The cruise begins':'New orbit acquired'}</div><h2>Protect the ark.</h2><p>${p.subtitle}</p></div>`;
  } else if(phase==='rescue'){
    objective=s.cargo.length===2?'Precious cargo. Return to the ark.':s.cargo.length===1?'One aboard. Room for a friend.':'A little lower. Hold the beam.';
    sub=s.cargo.length===2?'Fly to the glowing dock at the top center.':`Hover above the little ones. ${6-game.creatures.filter(c=>c.status==='saved').length} still need a lift.`;
    controls=`<span>${key('move')} Fly</span><span>${key('beam')} Beam</span><span>${key('boost')} Boost</span><span>${key('pulse')} ${pulseText}</span>`;
    mission=`<div class="cargo-label">CARGO ${s.cargo.length} / 2</div><div class="cargo-slots">${[0,1].map(i=>`<div class="cargo-slot${s.cargo[i]!==undefined?' full':''}">${s.cargo[i]!==undefined?'●':'·'}</div>`).join('')}</div><div class="pair-strip">${p.species.map((name,i)=>`<div class="pair-token" title="${name}" style="--color:${p.colors[i]}">${game.creatures.filter(c=>c.species===i).map(c=>`<i class="pair-dot${c.status==='saved'?' saved':''}"></i>`).join('')}</div>`).join('')}</div><div class="clock${game.surfaceTime<20?' low':''}"><span style="font:11px monospace;letter-spacing:.1em;margin-right:8px">SOLAR SURGE</span>${clock(game.surfaceTime)}</div>`;
    const saved=game.creatures.filter(c=>c.status==='saved').length;if(saved>0&&Math.abs(s.x)<3.2&&s.y>4.3){sub=`${saved}/6 aboard. Hold ${input.last==='pad'?(settings.glyphs==='ps'?'△':'Y'):'R'} to leave early, or keep rescuing.`;}
  } else if(phase==='descent'){
    objective='A world worth saving.';sub='Shuttle released. Find the little ones.';banner=`<div class="phase-banner"><div class="eyebrow">Landing window open</div><h2>${p.name}</h2><p>${p.subtitle}</p></div>`;
  } else if(phase==='warp'){
    objective='A few more stars. A few more friends.';sub=game.planet<2?'Next stop is already calling.':'Last stop complete. Set a course for home.';banner=`<div class="phase-banner"><div class="eyebrow">Passenger count confirmed</div><h2>${game.creatures.filter(c=>c.status==='saved').length===6?'All six aboard.':'Onward, little ark.'}</h2><p>${game.planet<2?`Next stop: ${PLANETS[game.planet+1].name}`:'The whole universe looks a little brighter.'}</p></div>`;
  } else if(phase==='escape'){
    objective='Home is wherever you all are.';banner=`<div class="phase-banner"><div class="eyebrow">The way home</div><h2>Every little life counts.</h2><p>${game.rescued} rescued. ${game.pairs} pairs reunited.</p></div>`;
  }
  $('#objective-title').textContent=objective;$('#objective-sub').textContent=sub;$('#controls-strip').innerHTML=controls;$('#mission-state').innerHTML=mission;$('#phase-banner').innerHTML=banner;
  const me=net.mode==='solo'?[]:[{id:net.me,name:'Your ark',score:game.score,color:net.players.find(p=>p.id===net.me)?.color||'#f2a59b'},...net.getGhosts()].sort((a,b)=>b.score-a.score);
  $('#network-board').innerHTML=me.map(g=>`<div class="net-line"><b><i class="dot" style="background:${g.color}"></i>${escape(g.name)}</b><span>${fmt(g.score)}</span></div>`).join('');
  const canRecall=phase==='rescue'&&game.creatures.some(c=>c.status==='saved')&&Math.abs(s.x)<3.2&&s.y>4.3;$('#touch-context').textContent='LEAVE';$('#touch-context').setAttribute('aria-label','Hold to leave this planet');$('#touch-context').style.display=canRecall?'block':'none';$('#touch-pulse').style.opacity=game.pulseCd>0?'.4':'1';
}
function toast(title,sub=''){
  clearTimeout(toastTimeout);$('#toast .toast-title').textContent=title;$('#toast .toast-sub').textContent=sub;$('#toast').classList.add('show');toastTimeout=setTimeout(()=>$('#toast').classList.remove('show'),2600);
}
function handleEvents(){
  const events=game.events.splice(0);view.handle(events);for(const e of events){
    if(['shot','kill','hit','pulse','pickup','pair','dock','warning'].includes(e.type))audio.play(e.type);
    if(e.type==='phase'){
      audio.phase=e.phase;if(['descent','warp','escape'].includes(e.phase))audio.play('launch');if(e.phase==='rescue')toast('Six small reasons to hurry.','Beam two aboard. Return to the glowing dock.');
      if(['victory','defeat'].includes(e.phase)){audio.play(e.phase);if(!attract)finishScreen();}
    }
    if(e.type==='pair')toast(`${e.name} reunited!`,'A pair for the stars. +500');
    if(e.type==='dock'&&game.phase==='rescue')toast(`${e.count} safely aboard.`,'The ark has room for a few more.');
    if(e.type==='message'&&e.tone==='danger')toast(e.text,'The ark is pulling everyone out.');
    if(e.type==='hit'){$('#damage-flash').classList.add('hit');setTimeout(()=>$('#damage-flash').classList.remove('hit'),220);const pad=input.pad;pad?.vibrationActuator?.playEffect('dual-rumble',{duration:180,strongMagnitude:.45,weakMagnitude:.2}).catch(()=>{});}
  }
}
function begin(seed=crypto.getRandomValues(new Uint32Array(1))[0],isHub=false){
  attract=false;clearTimeout(toastTimeout);$('#toast').classList.remove('show');game.reset(seed);game.god=false;game.autopilot=false;game.tuning={...DEFAULTS};debugUsed=false;endedHandled=false;hubCountdown=isHub;audio.mute(false);audio.unlock();audio.play('launch');input.clear();show('play');
}
function finishScreen(){
  if(endedHandled)return;endedHandled=true;clearTimeout(toastTimeout);$('#toast').classList.remove('show');if(!debugUsed&&!net.hub){record.best=Math.max(record.best,Math.round(game.score));record.pairs=[...new Set([...record.pairs,...game.pairLog])];store();}net.complete(game);show('results');
}
function title(){if(net.hub)return;net.leave();attract=false;hubCountdown=false;game.reset(1982);game.tuning={...DEFAULTS};game.autopilot=false;game.god=false;debugUsed=false;lastActivity=performance.now();audio.mute(false);audio.phase='title';$('#toast').classList.remove('show');show('title');}
function startAttract(){
  if(net.mode!=='solo'||screen!=='title')return;attract=true;game.reset(1982);game.tuning={...DEFAULTS,defenseSeconds:10,beamSpeed:2.4,shuttleSpeed:10};game.autopilot=true;game.god=true;audio.phase='defense';show('play');
}
function activity(kind){
  lastActivity=performance.now();if(net?.ended)return false;audio.unlock();
  document.body.classList.toggle('touching',kind==='touch');if(attract){title();return false;}if(promptDevice!==kind){promptDevice=kind;updatePrompts();}return true;
}
function menu(command){
  if(net?.ended)return;if(command==='pause'){
    if(screen==='play'&&!attract){show('pause');audio.play('menu');return;}if(['pause','dev','archive'].includes(screen)){show('play');return;}if(screen==='settings'||screen==='credits'){action(screen==='settings'?'settings-back':'credits-back');return;}if(screen!=='title'&&screen!=='hubwait'&&screen!=='results'){action('title');return;}
  }
  if(screen==='play'||screen==='hubwait'||screen==='hubend')return;
  if(command==='back'){if(screen==='pause')show('play');else if(screen==='settings')action('settings-back');else if(screen==='credits')action('credits-back');else if(['dev','archive'].includes(screen))show('pause');else if(screen==='lobby')action('leave-room');else if(screen==='join')show('online');else if(screen!=='title'&&screen!=='results')show('title');return;}
  if(command==='join'){action('join');return;}
  const els=[...app.querySelectorAll('.nav:not(:disabled)')],focused=els[focusIndex];
  if(screen==='join'&&focused?.id==='room-input'&&input.last==='pad'){
    const alphabet='23456789ABCDEFGHJKMNPQRSTUVWXYZ';if(command==='left')joinCursor=(joinCursor+5)%6;if(command==='right')joinCursor=(joinCursor+1)%6;if(command==='up'||command==='down'){let chars=joinCode.padEnd(6,'2').split('');chars[joinCursor]=alphabet[(Math.max(0,alphabet.indexOf(chars[joinCursor]))+(command==='up'?1:alphabet.length-1))%alphabet.length];joinCode=chars.join('');focused.value=joinCode;}
    focused.focus();focused.setSelectionRange(joinCursor,joinCursor+1);if(command==='select')action('join');return;
  }
  if((command==='left'||command==='right')&&focused?.type==='range'){const step=Number(focused.step)||1;focused.value=clamp(Number(focused.value)+(command==='right'?step:-step),Number(focused.min),Number(focused.max));focused.dispatchEvent(new Event('input',{bubbles:true}));audio.play('menu');return;}
  if(command==='up'||command==='down'||command==='left'||command==='right'){setFocus(focusIndex+(command==='up'||command==='left'?-1:1),true);audio.play('menu');}
  if(command==='select'){if(focused?.type==='range')return;focused?.click();}
}
function action(name){
  audio.play('menu');if(net.ended)return;
  if(name==='new'){show('briefing');return;}if(name==='launch'){begin();return;}
  if(name==='title'){title();return;}if(name==='replay'){if(net.mode==='room'){net.leave();}begin();return;}
  if(name==='pause'){show('pause');return;}if(name==='resume'||name==='dev-resume'){show('play');return;}
  if(name==='settings'){focusBeforeSettings=focusIndex;show('settings',{parent:screen==='pause'?'pause':'title'});return;}
  if(name==='settings-back'){show(backScreen,{focus:focusBeforeSettings});return;}
  if(name==='settings-reset'){settings={...settingsDefaults};audio.setVolumes(.1,.7);store();render();return;}
  if(name==='glyphs'){settings.glyphs=settings.glyphs==='ps'?'xbox':'ps';store();render();return;}
  if(name==='shake'||name==='assist'){settings[name]=!settings[name];store();render();return;}
  if(name==='credits'){show('credits',{parent:screen==='pause'?'pause':'title'});return;}
  if(name==='credits-back'){show(backScreen);return;}
  if(name==='online'){show('online');return;}if(name==='host'){net.hostRoom();show('lobby');return;}
  if(name==='join-menu'){net.status='';joinCode='222222';joinCursor=0;show('join');return;}
  if(name==='join'){joinCode=$('#room-input')?.value||joinCode;net.joinRoom(joinCode);show('lobby');return;}
  if(name==='room-launch'){net.startRoom();return;}if(name==='leave-room'){net.leave();show('online');return;}
  if(name==='retire'){title();return;}if(name==='archive'){show('archive');return;}
  if(name==='dev'){debugUsed=true;show('dev');return;}
  if(name==='god'){game.god=!game.god;render();return;}if(name==='autopilot'){game.autopilot=!game.autopilot;render();return;}
  if(name==='heal'){game.hull=6;game.invul=0;render();return;}if(name==='pulse-reset'){game.pulseCd=0;render();return;}
  if(name==='tuning-reset'){game.tuning={...DEFAULTS};if(game.phase==='rescue')game.surfaceTime=DEFAULTS.rescueSeconds;render();return;}
  if(name==='skip'){skipPhase();render();return;}
  if(name==='next-planet'){game.goToPlanet((game.planet+1)%3);handleEvents();render();return;}
  if(name==='meteor'){game.spawnMeteor();render();return;}
  if(name==='step'){for(let i=0;i<60;i++)game.update(1/60,game.botInput());handleEvents();render();return;}
  if(name==='restart'){const tuning={...game.tuning};game.reset(game.seed);game.tuning=tuning;endedHandled=false;render();return;}
}
function skipPhase(){
  if(game.phase==='defense')game.setPhase('descent');else if(game.phase==='descent')game.beginRescue();else if(game.phase==='rescue')game.depart();else if(game.phase==='warp'){game.phaseTime=4;game.update(1/60);}else if(game.phase==='escape')game.finish(true);handleEvents();
}
app.addEventListener('click',e=>{if(input?.blockClick){input.blockClick=false;return;}const b=e.target.closest('[data-action]');if(b&&!b.disabled)action(b.dataset.action);});
app.addEventListener('pointerover',e=>{const b=e.target.closest('.nav');if(b&&input?.last!=='pad'){const els=[...app.querySelectorAll('.nav:not(:disabled)')];const idx=els.indexOf(b);if(idx>=0)setFocus(idx);}});
app.addEventListener('input',e=>{
  const el=e.target;if(el.dataset.setting){const id=el.dataset.setting;settings[id]=Number(el.value);$('#out-'+id).textContent=el.value+'%';audio.setVolumes(settings.music/100,settings.sfx/100);store();}
  if(el.dataset.tuning){const id=el.dataset.tuning;game.tuning[id]=Number(el.value);$('#out-'+id).textContent=el.value;if(id==='rescueSeconds'&&game.phase==='rescue')game.surfaceTime=Number(el.value);debugUsed=true;}
  if(el.id==='room-input')joinCode=el.value.toUpperCase();
});
function frame(now){
  const dt=Math.min((now-lastFrame)/1000||.016,.08);lastFrame=now;uiTime+=dt;input.poll(dt,net.hub);audio.update();
  if(screen==='title'&&now-lastActivity>=10000)startAttract();
  let running=screen==='play'||net.hub&&net.started&&!net.ended&&!['hubend','hubwait','results'].includes(screen);
  if(hubCountdown){if(AIHub.time()<0){running=false;if($('#phase-banner'))$('#phase-banner').innerHTML=`<div class="phase-banner"><div class="eyebrow">Fleet launch</div><h2>${Math.max(1,Math.ceil(-AIHub.time()/1000))}</h2><p>Make room for the little ones.</p></div>`;}else{hubCountdown=false;}}
  if(running){accumulator+=dt;let steps=0;const controls=input.controls(game,settings.assist);while(accumulator>=1/60&&steps<6){game.update(1/60,controls);accumulator-=1/60;steps++;}handleEvents();
    if(attract&&['victory','defeat'].includes(game.phase)){game.reset(1982);game.god=true;game.autopilot=true;}
  }else accumulator=0;
  if(!settings.shake)view.shake=0;
  view.update(dt,game,{title:['title','briefing','online','join','lobby','hubwait'].includes(screen)||screen==='credits'&&backScreen==='title'||screen==='settings'&&backScreen==='title',attract,ghosts:net.getGhosts()});
  if(net.started&&!net.ended&&!hubCountdown)net.tick(dt,game);
  hudCd-=dt;if(hudCd<=0&&screen==='play'&&!hubCountdown){hudCd=.1;updateHud();}requestAnimationFrame(frame);
}
async function boot(){
  try{
    $('#load-status').textContent='Inflating the universe. Starting the collision world.';await initPhysics();game=new Cruise(1982);view=await new View().init($('#scene'));
    input=new Input({activity,menu,isMenu,worldPoint:(x,y)=>view.worldPoint(x,y)});
    net=new Network({start:(seed,isHub)=>begin(seed,isHub),end:()=>{audio.mute(true);input.clear();show('hubend');},change:()=>{if(['lobby','join'].includes(screen))render();}});
    await net.initHub();$('#loading').remove();if(net.hub){show('hubwait');net.ready();}else show('title');lastActivity=performance.now();lastFrame=lastActivity;requestAnimationFrame(frame);
    window.__cruise={get game(){return game;},get screen(){return screen;},get attract(){return attract;},get settings(){return settings;},get network(){return net;},get backend(){return view.backend;},get audio(){return audio;},get input(){return input;},get view(){return view;},get debugUsed(){return debugUsed;},state:()=>({...game.snapshot(),screen,attract,backend:view.backend,network:net.mode,settings:{...settings}}),start:seed=>begin(seed),advance:(seconds,bot=true)=>{const steps=Math.round(seconds*60);for(let i=0;i<steps;i++){game.update(1/60,bot?game.botInput():{});if(['victory','defeat'].includes(game.phase))break;if(i%120===0)game.events.splice(0);}handleEvents();updateHud();return game.snapshot();},action,menu,setIdle:seconds=>{lastActivity=performance.now()-seconds*1000;},setScreen:show,feedback:data};
  }catch(err){console.error(err);$('#load-status').textContent=String(err?.message||err);$('#fatal').style.display='block';$('.loading-line').style.display='none';window.__bootError=String(err);if(window.AIHub?.active)AIHub.fail(String(err?.message||err));}
}
boot();
