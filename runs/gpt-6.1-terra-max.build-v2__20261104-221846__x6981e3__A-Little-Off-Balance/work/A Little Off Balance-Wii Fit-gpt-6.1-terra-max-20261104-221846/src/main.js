import { ACTIVITIES, DAY_NAMES, activityForDay } from './data/activities.js';
import { makeProfile, wobbleAge, ActivitySession } from './core/session.js';
import { DEFAULT_TUNABLES } from './core/dot.js';
import { Sound } from './core/audio-runtime.js';
import { about } from './data/about.js';
import { TITLE } from './data/title.js';
import engineCredits from '../CREDITS.md';
import { EVENT_SECONDS, BREAK_SECONDS, pickMedley, medleyWindow } from './data/medley.js';
import { startWorld } from './world.js';

const ui=document.getElementById('ui');
const stored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const escape=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const app={screen:'title',aboutPage:0,session:null,settings:{music:.1,effects:.7,glyphs:'ps',contrast:false,motion:false,...stored('alob-settings',{})},profiles:stored('alob-profiles',[null,null,null]),slot:0,activity:null,result:null,tuning:{...DEFAULT_TUNABLES},input:{x:0,y:0,breath:false,left:false,right:false},keys:new Set(),lastInput:performance.now(),inputKind:'keyboard',focus:0,paused:false,attract:false,attractIndex:0,medley:null,weigh:null,hubRound:false,hubEnded:false,hubScores:{},hubClock:0,gamepadButtons:[],driver:null};
const sound=new Sound(app.settings);
const save=()=>{try{localStorage.setItem('alob-profiles',JSON.stringify(app.profiles));localStorage.setItem('alob-settings',JSON.stringify(app.settings));}catch{}};
const profile=()=>app.guest||app.profiles[app.slot];
const brand='<div class="brand"><span class="brand-icon">✳</span> LITTLE ISLAND WELLNESS</div>';
const button=(label,action,extra='',style='')=>`<button class="button ${style}" data-action="${action}" ${extra}>${label}<span class="arrow">↗</span></button>`;
const back=target=>`<button class="back" data-action="${target}" aria-label="Go back">←</button>`;
const panel=(content,extra='')=>`<section class="screen ${extra}"><div class="panel glass">${content}</div></section>`;
const heading=(kicker,title,description)=>`<div class="eyebrow">${kicker}</div><h1 class="heading">${title}</h1><p class="description">${description}</p>`;
const hint=()=>app.inputKind==='gamepad'?`<span class="key">${app.settings.glyphs==='xbox'?'A':'✕'}</span> SELECT <span class="key">${app.settings.glyphs==='xbox'?'B':'◯'}</span> BACK`:'<span class="key">↑↓</span> CHOOSE <span class="key">ENTER</span> SELECT';
const footer=()=>`<div class="footnote">${hint()}</div>`;
const notice=()=>matchMedia('(hover: none) and (pointer: coarse)').matches&&!app.keyboardSeen&&!Array.from(navigator.getGamepads?.()||[]).some(Boolean);
const iconFor=family=>({still:'✳',reps:'↕',hoop:'◌',header:'◉',step:'♪',slack:'〰',tray:'♧',jog:'➜',jump:'↗'})[family]||'✳';

function aboutPages(){
  const paragraphs=entries=>entries.map(entry=>`<p>${escape(entry)}</p>`).join('');
  const source=Object.entries(about.sourceInformation).map(([key,value])=>`${key}: ${value}`);
  return [
    {title:'About the island',description:'This is not medical advice. Ounce is a scale.',body:`<p>${escape(TITLE)} is a playful tribute to Wii Fit, made for little moments of movement and laughter.</p>`},
    ...[0,5,10].map(start=>({title:'Source Information',description:`The story behind this game · ${start/5+1} of 3`,body:paragraphs(source.slice(start,start+5))})),
    ...[['Testing Feedback',about.testingFeedback],['Engine Feedback',about.engineFeedback],['Prompt Feedback',about.promptFeedback]].map(([title,entries])=>({title,description:'Notes from making the island.',body:paragraphs(entries)})),
    {title:'Credits',description:'Made with care, code, and a little wobble.',body:'<p>Game design, procedural art, animation, music, sound effects, and writing: the game creator.</p><p>Built with Pixel Engine 0.46.0 and its included libraries. The next page contains the full kit credits.</p>'},
    {title:'Full kit credits',description:'Pixel Engine and included libraries.',body:`<pre class="credits-full" tabindex="0" aria-label="Full Pixel Engine credits">${escape(engineCredits)}</pre>`}
  ];
}

function render(){
  document.body.classList.toggle('high-contrast',app.settings.contrast);
  document.body.classList.toggle('reduce-motion',app.settings.motion);
  let content='';
  if(app.screen==='title'){
    content=panel(`${brand}<h1 class="title">${escape(TITLE.split(' ').slice(0,2).join(' '))}<br><span>${escape(TITLE.split(' ').slice(2).join(' '))}.</span></h1><p class="lede">A week of movement, a talking scale, and absolutely no pressure to be graceful.</p><div class="title-tag">YOUR ISLAND IS READY</div>${notice()?`<p class="description" style="margin-top:18px"><strong>Controller or keyboard required</strong></p><div class="menu">${button('Settings','settings','','ghost')}</div>`:`<div class="menu">${button('Begin your week','slots','','primary')}<div class="menu-row">${button('Drop-in','dropin','','ghost')}${button('Family Hour','family','','ghost')}</div><div class="menu-row">${button('Settings','settings','','ghost')}${button('About','about','','ghost')}</div></div>${footer()}`}`,'title-screen')+`<div class="hero-note">WELCOME TO LITTLE ISLAND<strong>Take it one wobble at a time.</strong>EST. WHENEVER YOU ARE READY</div>`;
  }else if(app.screen==='slots'){
    content=panel(`<div class="topline">${back('title')}<span class="badge">YOUR WEEK</span></div>${heading('A PLACE TO BEGIN','Who is stepping on?','Choose a profile. Your island remembers your progress on this device.')}<div class="stack">${app.profiles.map((item,index)=>`<button class="list-item" data-action="slot" data-index="${index}"><span class="icon">${index+1}</span><span><span class="name">${item?escape(item.name):'Start a new week'}</span><span class="sub">${item?`DAY ${item.day} · ${item.drips} DRIPS`:'EMPTY PROFILE'}</span></span><span class="arrow">→</span></button>`).join('')}</div>${footer()}`);
  }else if(app.screen==='island'){
    const player=profile(), day=Math.min(player.day,7), activities=activityForDay(day);
    content=panel(`<div class="topline">${back('title')}<span class="badge sun">✦ ${player.drips} DRIPS</span></div>${heading(`DAY ${day} / 7 · ${DAY_NAMES[day-1]}`,'Good to see you. ',`Ounce says: “${day===7?'Today, we stand together. And I owe you an explanation.':'The island is ready when you are.'}”`)}<div class="stats"><span class="badge">${escape(player.name)}</span> <span class="badge">${player.stars} STARS</span> <span class="badge">WOBBLE AGE ${player.history.length?wobbleAge(player):'—'}</span></div><div class="stack"><button class="list-item" data-action="weigh"><span class="icon">◉</span><span><span class="name">Daily weigh-in</span><span class="sub">THREE LITTLE BALANCE CHECKS</span></span><span class="arrow">→</span></button>${day===7?`<button class="list-item" data-action="finale"><span class="icon">✦</span><span><span class="name">The Long Stand</span><span class="sub">YOUR WEEK FINALE</span></span><span class="arrow">→</span></button>`:''}</div><div class="eyebrow" style="margin-top:20px">PICK A PRACTICE · ${activities.length} OPEN</div><div class="scroll-list stack">${activities.map(activity=>`<button class="list-item" data-action="intro" data-id="${activity.id}"><span class="icon">${iconFor(activity.family)}</span><span><span class="name">${escape(activity.name)}</span><span class="sub">${escape(activity.place.toUpperCase())} · ${activity.duration} SEC ${player.played[activity.id]?`· ${'★'.repeat(player.played[activity.id])}`:''}</span></span><span class="arrow">→</span></button>`).join('')}</div><div class="menu-row" style="margin-top:12px">${button('Day report','day-report','','small')}${button('Settings','settings','','small ghost')}</div>${footer()}`,'island-screen');
  }else if(app.screen==='intro'){
    const activity=app.activity;
    content=panel(`<div class="topline">${back(app.returnScreen||'island')}<span class="badge sun">${escape(activity.place.toUpperCase())}</span></div>${heading('TODAY’S PRACTICE',escape(activity.name),escape(activity.instruction)+'.')}<div class="instruction-card"><strong>LET’S KEEP IT SIMPLE</strong><p>Lean with the left stick or WASD. Press Space / R2 to breathe; use F and J / L1 and R1 to step.</p><p>Find your own rhythm. Ounce is not a medical professional, despite the nametag.</p></div><div class="menu">${button('Let’s go','start','','primary')}${button(`Hard mode: ${app.hard?'ON':'OFF'}`,'hard','','ghost')}</div>${footer()}`);
  }else if(app.screen==='game'&&app.medley){
    const medley=app.medley, activity=ACTIVITIES.find(item=>item.id===medley.picks[medley.event]);
    const ranking=medley.scores.map((score,index)=>({score,index})).sort((left,right)=>right.score-left.score);
    content=`<section class="screen family-game"><div class="family-game-shell"><div class="family-game-top"><div><div class="eyebrow">FAMILY HOUR · EVENT ${medley.event+1} / 3</div><h1>${medley.phase==='break'?'Time for a breather':escape(activity.name)}</h1><p>${medley.phase==='break'?'Next event starts shortly.':escape(activity.instruction)}</p></div><div class="family-clock"><strong id="family-time">${medley.phase==='break'?Math.ceil(medley.breakTime):EVENT_SECONDS}</strong><small>SECONDS</small></div></div>${medley.phase==='break'?`<div class="family-break"><strong>ROUND COMPLETE</strong>${ranking.map((entry,index)=>`<div><span>${index+1}. ${familyName(medley.members[entry.index],entry.index)}</span><b>${entry.score} PTS</b></div>`).join('')}</div>`:`<div class="family-grid">${medley.members.map((member,index)=>`<div class="family-lane"><div class="family-lane-title"><strong>${familyName(member,index)}</strong><span>${member.kind==='bot'?'BOT':member.kind==='keyboard'?'KEYBOARD':`PAD ${member.index+1}`}</span></div><div class="family-lane-body"><div class="dial family-dial"><span class="dot" id="family-dot-${index}"></span></div><div><strong id="family-score-${index}">0</strong><small>POINTS</small></div></div><p id="family-cue-${index}">${escape(activity.instruction)}</p></div>`).join('')}</div>`}</div><div class="family-game-tip">F / J OR L1 / R1: STEP · ESC / OPTIONS: PAUSE</div></section>`;
  }else if(app.screen==='game'){
    const activity=app.session.activity;
    content=`<section class="screen game-screen"><div class="game-hud"><div class="game-top"><div class="game-title"><small>${app.attract?'ISLAND DEMO · PRESS ANY KEY TO PLAY':app.hubRound?'AI HUB · THREE-EVENT MEDLEY':escape(activity.place.toUpperCase())}</small><strong>${escape(activity.name)}</strong></div><div class="game-time" id="seconds">${Math.ceil(app.session.duration)}</div></div><div class="game-bottom"><div class="balance-card"><div class="balance-inner"><div class="dial" id="dial" aria-label="Balance indicator"><div class="dial-ring"></div><div class="dot" id="balance-dot"></div></div><div class="balance-text"><strong>Find your center.</strong><p id="live-score">A little wobble is normal.</p><div class="meter"><span id="meter" style="width:0%"></span></div></div></div></div><div class="game-tip">${escape(activity.instruction)}<br><strong id="live-cue"></strong><br><span class="key">WASD / L</span> LEAN <span class="key">SPACE / R2</span> BREATHE<br><span class="key">F / J · L1 / R1</span> STEP · ESC PAUSE</div></div></div></section>`;
  }else if(app.screen==='pause'){
    content=panel(`<div class="topline"><span class="badge">TAKE YOUR TIME</span></div>${heading('PAUSED','A little breather.','Your island will be right here.')}<div class="menu">${button('Resume','resume','','primary')}${button('Settings','settings','','ghost')}${button('Dev tools','dev','','ghost')}${button('Leave practice','leave','','ghost')}</div>${footer()}`);
  }else if(app.screen==='results'){
    const result=app.result;
    content=panel(`<div class="topline"><span class="badge sun">PRACTICE COMPLETE</span></div>${heading('NICE WORK',escape(app.activity.name),escape(app.activity.quip||'THE ISLAND IS PROUD OF YOU.'))}<div class="score-hero">${result.score}<small style="font-size:20px;color:#8ca397"> / 100</small></div><div class="stars">${'★'.repeat(result.stars)}${'☆'.repeat(3-result.stars)}</div><div class="result-box"><span>+ ${result.drips} DRIPS</span><span>${Math.round(result.seconds)} SECONDS OF YOU TIME</span></div><div class="menu">${button(app.medley?'Next player / event':app.weigh?'Continue weigh-in':'Back to the island','continue','','primary')}${!app.medley&&!app.weigh?button('Try again','start','','ghost'):''}</div>${footer()}`);
  }else if(app.screen==='weigh-result'){
    content=panel(`<div class="topline"><span class="badge">DAILY CHECK-IN</span></div>${heading('A NUMBER, NOT A VERDICT','Your wobble age','Ounce has reviewed your three balance checks with tremendous confidence.')}<div class="score-hero">${wobbleAge(profile())}</div><p class="description">This is just a playful score, not a measure of health. Keep moving at your own pace.</p><div class="menu">${button('Back to the island','island','','primary')}</div>${footer()}`);
  }else if(app.screen==='day-report'){
    const player=profile();
    content=panel(`<div class="topline">${back('island')}<span class="badge sun">DAY ${player.day}</span></div>${heading('YOUR DAY REPORT','Every wobble counts.',`You have collected ${player.drips} drips and ${player.stars} stars. You showed up; the rest is gravy.`)}<div class="instruction-card"><strong>OUNCE’S NOTE</strong><p>${player.day===6?'Tomorrow is the Long Stand. Ounce seems unusually quiet.':player.day>=7?'The island is still yours to enjoy.':'A little movement is better than a perfectly planned nap. Usually.'}</p></div><div class="menu">${button(player.day>=7?'Back to the island':'Start the next day','next-day','','primary')}</div>${footer()}`);
  }else if(app.screen==='reveal'){
    content=panel(`${brand}${heading('THE LONG STAND','Ounce comes clean.','“I added seven years to everyone’s wobble age. I thought you would come back if the number worried you. That was wrong.”')}<p class="description" style="margin-top:16px">The island agrees: a number should never tell you your worth. Your wobble age is now honest, and the island remains open.</p><div class="menu">${button('A fresh start','island','','primary')}</div>`);
  }else if(app.screen==='family'){
    content=panel(`<div class="topline">${back('title')}<span class="badge">LOCAL MULTIPLAYER</span></div>${heading('PLAY TOGETHER','Family Hour','Join up to four players for three simultaneous events.')}<div class="family-roster">${app.medley.members.map((member,index)=>`<span class="badge">${familyName(member,index)} · ${member.kind==='pad'?`PAD ${member.index+1}`:member.kind.toUpperCase()}</span>`).join('')||'<span class="badge">NO PLAYERS YET</span>'}</div><div class="menu">${button('Join with keyboard','family-join','', 'ghost')}${button('Add a bot','family-bot','', 'ghost')}${button('Start the medley','family-start',app.medley.members.length?'':'disabled','primary')}</div><p class="family-help">ENTER: join keyboard · CROSS / A: join controller<br>SPACE / OPTIONS: start · B: add bot</p>${footer()}`);
  }else if(app.screen==='medley-board'){
    const ranking=app.medley.scores.map((score,index)=>({score,index})).sort((left,right)=>right.score-left.score);
    content=panel(`<div class="topline"><span class="badge sun">FAMILY HOUR</span></div>${heading('MEDLEY COMPLETE','A standing ovation.','A little wobble is better together.')}<div class="stack">${ranking.map((entry,index)=>`<div class="list-item"><span class="icon">${index+1}</span><span><span class="name">${familyName(app.medley.members[entry.index],entry.index)}</span><span class="sub">${entry.score} POINTS</span></span></div>`).join('')}</div><div class="menu">${button('Back to title','title','','primary')}</div>`);
  }else if(app.screen==='settings'||app.screen==='dev'){
    const dev=app.screen==='dev';
    const ranges=dev?Object.entries(app.tuning).map(([key,value])=>`<div class="field"><label for="${key}">${escape(key)}</label><input id="${key}" data-tune="${key}" type="range" min="${key==='timeScale'?.25:0}" max="${key==='timeScale'?4:key==='dotLag'?.5:8}" step=".01" value="${value}"></div>`).join(''):`<div class="field"><label for="music">Music ${Math.round(app.settings.music*100)}%</label><input id="music" data-setting="music" type="range" min="0" max="1" step=".05" value="${app.settings.music}"></div><div class="field"><label for="effects">Effects ${Math.round(app.settings.effects*100)}%</label><input id="effects" data-setting="effects" type="range" min="0" max="1" step=".05" value="${app.settings.effects}"></div><div class="field"><label for="glyphs">Controller prompts</label><select id="glyphs" data-setting="glyphs"><option value="ps" ${app.settings.glyphs==='ps'?'selected':''}>PlayStation</option><option value="xbox" ${app.settings.glyphs==='xbox'?'selected':''}>Xbox</option></select></div><div class="field"><label for="contrast">High contrast</label><input id="contrast" data-setting="contrast" type="checkbox" ${app.settings.contrast?'checked':''}></div><div class="field"><label for="motion">Reduce motion</label><input id="motion" data-setting="motion" type="checkbox" ${app.settings.motion?'checked':''}></div>`;
    content=panel(`<div class="topline">${back('settings-back')}<span class="badge">${dev?'LIVE TUNING':'MAKE YOURSELF COMFORTABLE'}</span></div>${heading(dev?'DEVELOPER TOOLS':'YOUR PREFERENCES',dev?'Tune the wobble.':'Settings',dev?'Changes apply immediately, including during a paused practice.':'Make the island feel like yours.')}<div class="stack">${ranges}</div><div class="menu">${dev?button('Reset tuning','reset-tuning','','ghost'):''}${button('Done','settings-back','','primary')}</div>${footer()}`);
  }else if(app.screen==='about'){
    const pages=aboutPages(),current=pages[app.aboutPage];
    content=panel(`<div class="topline">${back('title')}<span class="badge">CREDITS</span></div>${heading('THE FINE PRINT',current.title,current.description)}<div class="about-text">${current.body}</div><div class="about-navigation"><button class="button ghost" data-action="about-prev" ${app.aboutPage===0?'disabled':''}>← Previous</button><span>${app.aboutPage+1} / ${pages.length}</span><button class="button primary" data-action="about-next" ${app.aboutPage===pages.length-1?'disabled':''}>Next →</button></div><p class="about-help">← / → or L1 / R1: change page${current.title==='Full kit credits'?' · ↑ / ↓: scroll':''}</p>${footer()}`,'about-screen');
  }else if(app.screen==='hub-card'){
    content=panel(`${brand}${heading('AI HUB · GHOST MEDLEY','Ready to wobble?','Three events, one shared clock. Earn points and watch your fellow islanders as ghosts.')}<div class="menu">${button('Ready','hub-ready','','primary')}${button('I need more time','hub-more','','ghost')}</div>${footer()}`);
  }else if(app.screen==='hub-finished'){
    content=panel(`${brand}${heading('AI HUB · GHOST MEDLEY','Well wobbled.','Your score is in. The hub will show the final standings.')}<div class="badge sun">${app.result?.score||0} POINTS</div>`);
  }
  ui.innerHTML=content;
  app.focus=0;
  const first=ui.querySelector('button:not(:disabled)');if(first&&app.inputKind==='gamepad')first.classList.add('focused');
}

function go(screen){app.screen=screen;render();}
function begin(activity,options={}){
  app.activity=activity;app.session=new ActivitySession(activity,{hard:app.hard,tuning:app.tuning,...options});app.paused=false;go('game');
}
function finish(){
  if(!app.session)return;
  app.result=app.session.result();
  if(app.attract){app.attractIndex++;startAttract();return;}
  if(app.hubRound)return;
  if(app.weigh){app.weigh.push(app.result.score/100);if(app.weigh.length<3){startWeigh();return;}profile().history.push(...app.weigh);profile().history=profile().history.slice(-3);app.weigh=null;save();go('weigh-result');return;}
  if(profile()){const player=profile();player.drips+=app.result.drips;player.stars+=Math.max(0,app.result.stars-(player.played[app.activity.id]||0));player.played[app.activity.id]=Math.max(app.result.stars,player.played[app.activity.id]||0);if(app.activity.id==='finale'){player.revealed=true;save();go('reveal');return;}save();}
  sound.effect('good');go('results');
}
function startWeigh(){const index=app.weigh.length;const names=['Still water','A gentle shift','Chase the breeze'];begin({...ACTIVITIES[0],id:['tree','heron','tax'][index],name:names[index],place:'Weigh-in',duration:8,ring:.38,instruction:['KEEP YOUR DOT IN THE RING','COUNTER THE DRIFT','STAY NEAR THE CENTER'][index]});}
function familyName(member,index){return member.kind==='bot'?`BOT ${index+1}`:`PLAYER ${index+1}`;}
function seededRandom(seed){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function familyJoin(kind,index){const medley=app.medley;if(!medley||medley.members.length>=4||kind!=='bot'&&medley.members.some(member=>member.kind===kind&&member.index===index))return;medley.members.push({kind,index});medley.scores.push(0);render();}
function startMedley(){
  const medley=app.medley;
  app.activity=ACTIVITIES.find(activity=>activity.id===medley.picks[medley.event]);
  medley.phase='event';
  medley.sessions=medley.members.map(()=>new ActivitySession(app.activity,{duration:EVENT_SECONDS,random:seededRandom(medley.seed+medley.event),hard:false,tuning:{...app.tuning,timeScale:1}}));
  app.session=medley.sessions[0];app.paused=false;go('game');
}
function finishFamilyEvent(){
  const medley=app.medley;
  medley.sessions.forEach((session,index)=>{medley.scores[index]+=session.result().score*10;});
  if(medley.event===2){go('medley-board');return;}
  medley.phase='break';medley.breakTime=BREAK_SECONDS;render();
}
function startAttract(){app.attract=true;const sequence=['tree','hoop','step','header','slackline'];const activity=ACTIVITIES.find(item=>item.id===sequence[app.attractIndex%sequence.length]);begin(activity,{duration:12});}
function leaveAttract(){app.attract=false;app.session=null;app.lastInput=performance.now();go('title');}
function act(action,element){
  sound.unlock();sound.effect('select');app.lastInput=performance.now();
  if(app.attract){leaveAttract();return;}
  if(action==='title'){app.session=null;app.medley=null;app.guest=null;go('title');}
  else if(action==='slots')go('slots');
  else if(action==='slot'){app.guest=null;app.slot=Number(element.dataset.index);if(!app.profiles[app.slot])app.profiles[app.slot]=makeProfile(`PLAYER ${app.slot+1}`);save();go('island');}
  else if(action==='dropin'){app.guest=makeProfile('GUEST');app.guest.day=7;app.guest.revealed=true;app.returnScreen='island';go('island');}
  else if(action==='island'){app.medley=null;app.weigh=null;go('island');}
  else if(action==='intro'){app.activity=ACTIVITIES.find(item=>item.id===element.dataset.id);app.returnScreen='island';app.hard=false;sound.effect('voice');go('intro');}
  else if(action==='hard'){app.hard=!app.hard;render();}
  else if(action==='start')begin(app.activity);
  else if(action==='weigh'){app.weigh=[];startWeigh();}
  else if(action==='finale'){app.activity={...ACTIVITIES[0],id:'finale',name:'The Long Stand',place:'Pavilion',duration:45,ring:.32,quip:'A LITTLE HONESTY GOES A LONG WAY.'};app.returnScreen='island';go('intro');}
  else if(action==='continue')go('island');
  else if(action==='day-report')go('day-report');
  else if(action==='next-day'){if(profile().day<7)profile().day++;save();go('island');}
  else if(action==='family'){const seed=Math.floor(Math.random()*4294967296);app.medley={members:[],scores:[],seed,event:0,picks:pickMedley(seededRandom(seed)),padButtons:{},padEdges:{}};go('family');}
  else if(action==='family-join')familyJoin('keyboard');
  else if(action==='family-bot')familyJoin('bot');
  else if(action==='family-start'&&app.medley.members.length)startMedley();
  else if(action==='settings'){app.settingsFrom=app.screen;go('settings');}
  else if(action==='settings-back')go(app.screen==='dev'?'pause':app.settingsFrom||'title');
  else if(action==='dev')go('dev');
  else if(action==='reset-tuning'){app.tuning={...DEFAULT_TUNABLES};if(app.session)app.session.tuning={...app.tuning};render();}
  else if(action==='resume'){app.paused=false;go('game');}
  else if(action==='leave'){app.session=null;app.medley=null;app.weigh=null;go(profile()?'island':'title');}
  else if(action==='about'){app.aboutPage=0;go('about');}
  else if(action==='about-prev'||action==='about-next'){app.aboutPage=Math.max(0,Math.min(aboutPages().length-1,app.aboutPage+(action==='about-next'?1:-1)));render();}
  else if(action==='hub-ready')globalThis.AIHub?.answer('ready');
  else if(action==='hub-more')globalThis.AIHub?.answer('more');
}
ui.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(target)act(target.dataset.action,target);});
ui.addEventListener('pointerover',event=>{const target=event.target.closest('button');if(target){ui.querySelectorAll('button.focused').forEach(item=>item.classList.remove('focused'));target.classList.add('focused');app.focus=Array.from(ui.querySelectorAll('button:not(:disabled)')).indexOf(target);}});
ui.addEventListener('input',event=>{const target=event.target;if(target.dataset.setting){const key=target.dataset.setting;app.settings[key]=target.type==='checkbox'?target.checked:target.type==='range'?Number(target.value):target.value;save();document.body.classList.toggle('high-contrast',app.settings.contrast);document.body.classList.toggle('reduce-motion',app.settings.motion);}if(target.dataset.tune){app.tuning[target.dataset.tune]=Number(target.value);if(app.session)app.session.tuning={...app.tuning};}});
function menuMove(delta){const buttons=Array.from(ui.querySelectorAll('button:not(:disabled)'));if(!buttons.length)return;app.focus=(app.focus+delta+buttons.length)%buttons.length;buttons.forEach((item,index)=>item.classList.toggle('focused',index===app.focus));buttons[app.focus].focus();buttons[app.focus].scrollIntoView({block:'nearest'});}
function pause(){if(app.screen==='game'&&!app.attract&&!app.hubRound){app.paused=true;go('pause');}else if(app.screen==='pause')act('resume');}
window.addEventListener('keydown',event=>{if(app.screen!=='about')return;const key=event.key.toLowerCase(),credits=ui.querySelector('.credits-full');if(!['arrowleft','arrowright'].includes(key)&&!(credits&&['arrowup','arrowdown'].includes(key)))return;event.preventDefault();event.stopImmediatePropagation();app.lastInput=performance.now();app.inputKind='keyboard';if(key==='arrowleft'&&!event.repeat)act('about-prev');else if(key==='arrowright'&&!event.repeat)act('about-next');else if(credits&&key==='arrowup')credits.scrollBy(0,-100);else if(credits&&key==='arrowdown')credits.scrollBy(0,100);},true);
window.addEventListener('keydown',event=>{if(app.screen!=='family'||event.repeat)return;const key=event.key.toLowerCase();if(!['enter',' ','b','escape'].includes(key))return;event.preventDefault();event.stopImmediatePropagation();app.keyboardSeen=true;app.lastInput=performance.now();app.inputKind='keyboard';sound.unlock();if(key==='enter')familyJoin('keyboard');else if(key==='b')familyJoin('bot');else if(key===' '&&app.medley.members.length)startMedley();else if(key==='escape')act('title');},true);
window.addEventListener('keydown',event=>{if(app.hubClosed)return;const wasNotice=notice();app.keyboardSeen=true;app.lastInput=performance.now();app.inputKind='keyboard';sound.unlock();if(app.attract){leaveAttract();return;}if(app.screen==='title'&&wasNotice)render();const key=event.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','escape'].includes(key))event.preventDefault();if(event.repeat)return;if(app.screen==='hub-card'&&(key==='enter'||key==='m')){event.preventDefault();globalThis.AIHub?.answer(key==='m'?'more':'ready');return;}app.keys.add(key);if(app.screen==='game'){if(key==='f')app.input.left=true;if(key==='j')app.input.right=true;if(key==='escape')pause();}else if(!['INPUT','SELECT'].includes(document.activeElement?.tagName)){if(key==='arrowdown'||key==='s')menuMove(1);else if(key==='arrowup'||key==='w')menuMove(-1);else if(key==='enter'){event.preventDefault();const buttons=Array.from(ui.querySelectorAll('button:not(:disabled)'));buttons[app.focus]?.click();}else if(key==='escape'){const backButton=ui.querySelector('.back');if(backButton)backButton.click();else if(app.screen==='pause')pause();}}});
window.addEventListener('keyup',event=>app.keys.delete(event.key.toLowerCase()));
window.addEventListener('blur',()=>app.keys.clear());
window.addEventListener('pointerdown',event=>{app.lastInput=performance.now();if(app.attract){leaveAttract();return;}sound.unlock();if(event.pointerType==='mouse')app.inputKind='mouse';});
ui.addEventListener('pointermove',event=>{if(app.screen!=='game'||event.pointerType!=='mouse')return;const dial=event.target.closest('#dial');if(!dial)return;const rect=dial.getBoundingClientRect();app.mouse={x:Math.max(-1,Math.min(1,(event.clientX-rect.left-rect.width/2)/(rect.width/2))),y:Math.max(-1,Math.min(1,(event.clientY-rect.top-rect.height/2)/(rect.height/2)))};app.lastInput=performance.now();});
window.addEventListener('gamepadconnected',()=>{app.lastInput=performance.now();if(app.screen==='title')render();});

function gamepad(){if(app.medley&&['family','game'].includes(app.screen))return null;const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);if(!pad)return null;const down=index=>!!pad.buttons[index]?.pressed;const just=index=>down(index)&&!app.gamepadButtons[index];if(just(9)){app.lastInput=performance.now();app.inputKind='gamepad';pause();}if(app.screen==='hub-card'&&just(3))globalThis.AIHub?.answer('more');if(app.screen!=='game'){if(app.screen==='about'&&(just(4)||just(5)))act(just(4)?'about-prev':'about-next');const credits=app.screen==='about'?ui.querySelector('.credits-full'):null;if(just(12)){if(credits)credits.scrollBy(0,-100);else menuMove(-1);}if(just(13)){if(credits)credits.scrollBy(0,100);else menuMove(1);}if(just(0)){const buttons=Array.from(ui.querySelectorAll('button:not(:disabled)'));buttons[app.focus]?.click();}if(just(1))ui.querySelector('.back')?.click();}else{if(just(4))app.input.left=true;if(just(5))app.input.right=true;}if(pad.axes.some(value=>Math.abs(value)>.2)||pad.buttons.some(item=>item.pressed)){app.lastInput=performance.now();app.inputKind='gamepad';if(app.attract){leaveAttract();return null;}}app.gamepadButtons=pad.buttons.map(item=>item.pressed);return pad;}
function pollFamilyPads(){
  if(!app.medley||!['family','game'].includes(app.screen))return;
  const medley=app.medley;medley.padEdges={};
  for(const pad of Array.from(navigator.getGamepads?.()||[]).filter(Boolean)){
    const previous=medley.padButtons[pad.index]||[],just=index=>!!pad.buttons[index]?.pressed&&!previous[index];
    medley.padEdges[pad.index]={left:just(4),right:just(5)};medley.padButtons[pad.index]=pad.buttons.map(item=>item.pressed);
    if(pad.axes.some(value=>Math.abs(value)>.2)||pad.buttons.some(item=>item.pressed)){app.lastInput=performance.now();app.inputKind='gamepad';}
    if(app.screen==='family'){
      if(just(0))familyJoin('pad',pad.index);
      if(just(2))familyJoin('bot');
      if(just(9)&&medley.members.length)startMedley();
      if(just(1))act('title');
    }else if(just(9)){app.gamepadButtons=pad.buttons.map(item=>item.pressed);pause();}
  }
}
function activityCue(session){
  const activity=session.activity,time=session.elapsed;
  if(activity.family==='reps'){
    const phase=(time/3.2)%1;
    const target=phase<.4?phase/.4:phase<.55?1:phase<.9?1-(phase-.55)/.35:0;
    return `MATCH ${Math.round(target*100)}% · YOU ${Math.round(session.rep*100)}%`;
  }
  if(activity.family==='header')return Math.floor(time/2.4)%2===0?'← HEAD LEFT':'HEAD RIGHT →';
  if(activity.family==='step')return Math.abs(time/.7-Math.round(time/.7))<.23?'STEP NOW · F OR J':'WAIT FOR THE BEAT';
  if(activity.family==='jog')return 'ALTERNATE F AND J';
  if(activity.family==='slack')return 'F / J TO WALK THE LINE';
  if(activity.family==='jump')return 'SPACE / R2 TO JUMP';
  if(activity.family==='hoop')return `CIRCLE THE STICK · ${Math.round(session.hoopLift*100)}% LIFT`;
  if(activity.breath)return Math.sin(time*Math.PI*2/activity.breath)>0?'BREATHE IN · HOLD':'BREATHE OUT · RELEASE';
  return 'KEEP THE DOT INSIDE THE RING';
}
function updateFamily(dt){
  const medley=app.medley,timeLabel=document.getElementById('family-time');
  if(medley.phase==='break'){
    medley.breakTime-=dt;
    if(timeLabel)timeLabel.textContent=Math.max(0,Math.ceil(medley.breakTime));
    if(medley.breakTime<=0){medley.event++;startMedley();}
    return;
  }
  const pads=Array.from(navigator.getGamepads?.()||[]);
  medley.sessions.forEach((session,index)=>{
    const member=medley.members[index],pad=member.kind==='pad'?pads.find(item=>item?.index===member.index):null;
    const input={x:0,y:0,breath:false,left:false,right:false};
    if(member.kind==='keyboard'){
      input.x=Number(app.keys.has('d')||app.keys.has('arrowright'))-Number(app.keys.has('a')||app.keys.has('arrowleft'));
      input.y=Number(app.keys.has('s')||app.keys.has('arrowdown'))-Number(app.keys.has('w')||app.keys.has('arrowup'));
      input.breath=app.keys.has(' ');input.left=app.input.left;input.right=app.input.right;
    }else if(pad){
      input.x=pad.axes[0]||0;input.y=pad.axes[1]||0;input.breath=!!pad.buttons[7]?.pressed;Object.assign(input,medley.padEdges[pad.index]);
    }else if(member.kind==='bot'){
      const time=session.elapsed,family=session.activity.family;
      if(family==='hoop'){input.x=Math.cos(time*7);input.y=Math.sin(time*7);}
      else if(family==='reps'){const phase=(time/3.2)%1;input.y=-(phase<.4?phase/.4:phase<.55?1:phase<.9?1-(phase-.55)/.35:0);}
      else if(family==='header'){const beat=Math.floor((time+dt-1.2)/2.4);input.x=beat%2===0?-.8:.8;}
      else{input.x=Math.sin(time)*.08;input.y=Math.cos(time)*.08;}
      input.breath=session.activity.breath?Math.sin((time+dt)*Math.PI*2/session.activity.breath)>0:false;
      if(Math.floor((time+dt)/.7)!==Math.floor(time/.7)){input.left=Math.floor((time+dt)/.7)%2===0;input.right=!input.left;}
    }
    session.update(dt,input);
    const dot=document.getElementById(`family-dot-${index}`),score=document.getElementById(`family-score-${index}`),cue=document.getElementById(`family-cue-${index}`);
    if(dot){dot.style.left=`${50+Math.max(-1,Math.min(1,session.dot.x))*38}%`;dot.style.top=`${50+Math.max(-1,Math.min(1,session.dot.y))*38}%`;}
    if(score)score.textContent=medley.scores[index]+session.result().score*10;
    if(cue)cue.textContent=activityCue(session);
  });
  app.input.left=false;app.input.right=false;
  document.documentElement.style.setProperty('--avatar-lean',`${-app.session.dot.x*16}deg`);
  if(timeLabel)timeLabel.textContent=Math.max(0,Math.ceil(app.session.duration-app.session.elapsed));
  if(medley.sessions.every(session=>session.finished))finishFamilyEvent();
}
function frame(now){
  const dt=Math.min(.05,(now-(app.previous||now))/1000);app.previous=now;sound.update(dt);
  if(app.hubClosed){requestAnimationFrame(frame);return;}
  pollFamilyPads();
  const pad=gamepad();
  if(app.screen==='title'&&!globalThis.AIHub?.active&&now-app.lastInput>10000)startAttract();
  if(app.screen==='game'&&app.medley){updateFamily(dt);requestAnimationFrame(frame);return;}
  if(app.screen==='game'&&app.session){
    const seconds=document.getElementById('seconds');
    if(app.hubRound&&!syncHub()){app.input.left=false;app.input.right=false;requestAnimationFrame(frame);return;}
    let x=Number(app.keys.has('d')||app.keys.has('arrowright'))-Number(app.keys.has('a')||app.keys.has('arrowleft'));
    let y=Number(app.keys.has('s')||app.keys.has('arrowdown'))-Number(app.keys.has('w')||app.keys.has('arrowup'));
    if(pad&&(Math.abs(pad.axes[0])>.12||Math.abs(pad.axes[1])>.12)){x=pad.axes[0];y=pad.axes[1];}else if(app.inputKind==='mouse'&&app.mouse){x=app.mouse.x;y=app.mouse.y;}
    if(app.attract){const time=app.session.elapsed;x=app.session.activity.family==='hoop'?Math.cos(time*7):Math.sin(time*1.2)*.2;y=app.session.activity.family==='hoop'?Math.sin(time*7):Math.cos(time)*.2;if(Math.floor(time*3)%2===0)app.input.left=true;else app.input.right=true;}
    if(app.driver==='perfect'){x=0;y=0;}
    app.session.update(dt,{x,y,breath:app.keys.has(' ')||!!pad?.buttons[7]?.pressed,left:app.input.left,right:app.input.right});app.input.left=false;app.input.right=false;
    document.documentElement.style.setProperty('--avatar-lean',`${-app.session.dot.x*16}deg`);
    const dot=document.getElementById('balance-dot'),meter=document.getElementById('meter'),score=document.getElementById('live-score'),cue=document.getElementById('live-cue'),dial=document.getElementById('dial');
    if(dot){dot.style.left=`${50+app.session.dot.x*38}%`;dot.style.top=`${50+app.session.dot.y*38}%`;}
    if(seconds)seconds.textContent=Math.max(0,Math.ceil(app.session.duration-app.session.elapsed));
    if(meter)meter.style.width=`${Math.min(100,app.session.elapsed/app.session.duration*100)}%`;
    if(score)score.textContent=`${app.session.result().score} POINTS · ${app.medley?`PLAYER ${app.medley.player+1}`:'KEEP GOING'}`;
    if(cue)cue.textContent=activityCue(app.session);
    if(dial&&app.hubRound){dial.querySelectorAll('.ghost-dot').forEach(node=>node.remove());for(const ghost of Object.values(app.hubScores).slice(0,3)){if(ghost?.a!==app.hubEvent||!Number.isFinite(ghost?.x)||!Number.isFinite(ghost?.y))continue;const marker=document.createElement('span');marker.className='ghost-dot';marker.style.left=`${50+Math.max(-1,Math.min(1,ghost.x))*38}%`;marker.style.top=`${50+Math.max(-1,Math.min(1,ghost.y))*38}%`;dial.appendChild(marker);}}
    if(app.session.finished&&!app.hubRound)finish();
  }
  requestAnimationFrame(frame);
}

function hubScore(){return app.hubTotal+(app.session?.result().score||0)*10;}
function beginHubEvent(index){app.hubEvent=index;const activity=ACTIVITIES.find(item=>item.id===app.hubPicks[index]);begin(activity,{duration:EVENT_SECONDS,random:globalThis.AIHub.rng(`event:${index}`),hard:false,tuning:{...DEFAULT_TUNABLES,timeScale:1}});}
function finishHub(){if(!app.hubRound||app.hubEnded)return;const score=hubScore();app.hubEnded=true;app.hubRound=false;clearInterval(app.hubTimer);globalThis.AIHub.result({score});app.result={score};go('hub-finished');}
function syncHub(){
  const window=medleyWindow(globalThis.AIHub.time());
  if(window.phase==='finished'){finishHub();return false;}
  if(window.index>app.hubEvent){app.hubTotal+=(app.session?.result().score||0)*10;beginHubEvent(window.index);}
  if(window.phase!=='event'){
    const seconds=document.getElementById('seconds'),cue=document.getElementById('live-cue');
    if(seconds)seconds.textContent=Math.ceil(window.remaining);
    if(cue)cue.textContent=window.phase==='countdown'?'GET READY · STARTING TOGETHER':`EVENT COMPLETE · NEXT IN ${Math.ceil(window.remaining)}`;
    return false;
  }
  return true;
}
function sendHubState(){if(!app.hubRound||app.hubEnded||!app.session)return;const hub=globalThis.AIHub,score=hubScore();hub.progress({score,label:app.activity.name});hub.send({a:app.hubEvent,x:app.session.dot.x,y:app.session.dot.y,c:0,t:app.session.elapsed,s:score},{reliable:false});}
function setupHub(){const hub=globalThis.AIHub;if(!hub?.active)return;hub.on('card',()=>{app.hubClosed=false;go('hub-card');});hub.on('start',()=>{app.hubClosed=false;app.hubRound=true;app.hubEnded=false;app.hubScores={};app.hubTotal=0;app.hubPicks=pickMedley(hub.rng('medley'));beginHubEvent(0);clearInterval(app.hubTimer);sendHubState();app.hubTimer=setInterval(sendHubState,100);});hub.on('message',(data,from)=>{app.hubScores[from]=data;});hub.on('time-up',finishHub);hub.on('end',()=>{clearInterval(app.hubTimer);app.hubRound=false;app.hubEnded=true;app.hubClosed=true;sound.context?.suspend();});hub.connect({mode:'ghost',seats:[1,4],card:true}).then(info=>{if(info)hub.ready();});}
window.__GAME__={go:(screen,args={})=>{if(args.id)app.activity=ACTIVITIES.find(item=>item.id===args.id);if(screen==='game'&&app.activity)begin(app.activity);else go(screen);},state:()=>({screen:app.screen,day:profile()?.day,activity:app.activity?.id,elapsed:app.session?.elapsed,score:app.session?.result().score,attract:app.attract,profiles:app.profiles,hubScores:app.hubScores,family:app.medley?{phase:app.medley.phase,event:app.medley.event,players:app.medley.members.length,scores:[...app.medley.scores],picks:[...app.medley.picks],dots:app.medley.sessions?.map(session=>({x:session.dot.x,y:session.dot.y}))}:null}),setDriver:skill=>{app.driver=skill;},get tunables(){return app.tuning;},finishActivity:()=>{if(app.medley?.phase==='event'){app.medley.sessions.forEach(session=>{session.elapsed=session.duration;session.finished=true;});finishFamilyEvent();}else if(app.session){app.session.elapsed=app.session.duration;app.session.finished=true;finish();}},finishBreak:()=>{if(app.medley?.phase==='break'){app.medley.event++;startMedley();}}};
render();setupHub();startWorld(app).catch(error=>{console.warn('3D island unavailable:',error.message);});requestAnimationFrame(frame);
