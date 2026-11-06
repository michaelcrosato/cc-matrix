(() => {
  'use strict';

  const app = document.getElementById('app');
  const canvas = document.getElementById('world');
  const context = canvas.getContext('2d');
  const hub = window.AIHub;
  const names = ['Alex','Ari','Ash','Bailey','Bea','Benny','Birdie','Blair','Bo','Cameron','Casey','Charlie','Cleo','Coco','Dani','Drew','Eden','Eli','Emery','Finn','Frankie','Harper','Indigo','Jaden','Jamie','Jesse','Jules','Kai','Kit','Lane','Leo','Lou','Marley','Mika','Morgan','Nico','Parker','Quinn','Remy','Robin'];
  const skins = ['#f4c29c','#dca37a','#b87855','#8a563f','#f5d7c4','#604437'];
  const outfits = ['#ff826d','#49b4ac','#f5bb52','#8a9cdb','#e77c9d','#87b979','#e9a778','#778a99'];
  const titles = ['Stillness Intern','Human Soup','Wobble Enthusiast','Certified Lean-To','Acceptable Human','Seasoned Tilter','Professional Standing Person','Alarmingly Balanced','Chief of Almost','Puddle Avoider','The Upright-ish','Assistant to Gravity','A Quiet Triumph','Exceptionally Present','Honorary Buoy','Very Good at Floor','Sensible Seagull','The Sway Whisperer','Locally Stable','Foot Placement Expert','A Fine Vertical','Slightly Legendary','Calm Adjacent','Proudly Perpendicular','The Unfallen','Official Dot Mover','Ocean Negotiator','Flamingo in Training','Grand Marshal of Balance','Keeper of the Wobble'];
  const events = [
    {id:'breath', name:'Breath Bloom', day:1, coach:'Posey', place:'Stillness Studio', length:32, description:'Breathe with the flower. Hold Action as it opens; release as it closes.', controls:'Hold and release Action with the flower.'},
    {id:'pose', name:'Pose Parade', day:1, coach:'Posey', place:'Stillness Studio', length:36, description:'Follow three gently drifting poses. Keep your dot inside the moving ring.', controls:'Lean toward the moving target.'},
    {id:'squat', name:'Tempo Squats', day:2, coach:'Big Kettle', place:'Iron Gazebo', length:32, description:'A very dignified imaginary chair awaits. Press on the beat.', controls:'Press Action when the ring closes.'},
    {id:'plank', name:'Plank Standoff', day:2, coach:'Big Kettle', place:'Iron Gazebo', length:30, description:'Brace against the breeze. A plank is a promise you make to the floor.', controls:'Hold Action and keep the dot centered.'},
    {id:'step', name:'Step Party', day:3, coach:'Bounce', place:'Boardwalk', length:32, description:'Find your feet at 96 beats per minute. Left, right, and repeat.', controls:'Alternate Left and Right on the beat.'},
    {id:'spin', name:'Floatie Spin', day:3, coach:'Bounce', place:'Boardwalk', length:32, description:'Circle your lean to keep a bright stack of floaties spinning.', controls:'Circle with WASD, the stick, or mouse.'},
    {id:'lap', name:'Morning Lap', day:3, coach:'Bounce', place:'Boardwalk', length:35, description:'Take the scenic route. Alternate your steps and steer around beach clutter.', controls:'Alternate Left and Right; lean to steer.'},
    {id:'tide', name:'Tide Table', day:4, coach:'Commodore Gull', place:'Lagoon', length:40, description:'Tilt the raft to roll a shell into the tide pool. Mind the edges.', controls:'Lean to roll the shell into the pool.'},
    {id:'paddle', name:'Paddle Slalom', day:4, coach:'Commodore Gull', place:'Lagoon', length:36, description:'Steer through the buoy gates. The sea is mostly on your side.', controls:'Lean left and right to meet the gates.'},
    {id:'tray', name:'Tray Trek', day:4, coach:'Marjorie', place:'Lagoon Pier', length:35, description:'Carry five very optimistic smoothies across a wobbly pier.', controls:'Keep the dot centered through the gusts.'},
    {id:'dive', name:'Cannonball Cup', day:4, coach:'Commodore Gull', place:'Lagoon Tower', length:36, description:'Time your bounce, tuck in the air, and make a spectacular splash.', controls:'Press Action at the bottom of a bounce; hold to tuck.'},
    {id:'finale', name:'The Big Stand', day:5, coach:'Pip', place:'Sunset Bay', length:90, description:'The whole island is watching. Breathe, pose, step, brace, and finally be still.', controls:'Follow each phase. During Long Stillness, do nothing.'}
  ];
  const medley = ['paddle','tide','dive'];
  const goals = [3,5,7,9,0];
  const keys = new Set();
  const storage = 'wii-fit-together-v1';
  let saved = readStorage();
  let settings = Object.assign({music:0.1, sound:true, glyph:'PlayStation'}, saved.settings || {});
  let state = {screen:'title', previous:'title', slot:null, profile:null, setup:{name:'Alex',skin:0,outfit:0}, round:null, paused:false, together:null, hub:null, lastInput:performance.now(), device:'keyboard', attract:false, message:'', returnScreen:'title'};
  let center = {x:0,y:0,vx:0,vy:0}, aim = {x:0,y:0}, mouseAim = null, mouseHeld = false, previousButtons = [], audio, musicClock = 0, lastFrame = performance.now(), lastHubUpdate = 0, lastHubProgress = 0;
  let viewport = {width:0,height:0,scale:1,ox:0,oy:0};

  function readStorage() { try { return JSON.parse(localStorage.getItem(storage) || '{}'); } catch (_) { return {}; } }
  function save() { try { saved.settings = settings; saved.slots ||= [null,null,null,null]; if (state.profile && state.slot !== null) saved.slots[state.slot] = state.profile; localStorage.setItem(storage, JSON.stringify(saved)); } catch (_) {} }
  function esc(value) { return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character])); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function smooth(value, target, rate, dt) { return value + (target-value) * Math.min(1,rate*dt); }
  function markInput(device) { const needsRender = state.attract || (!state.hasHardwareInput && (device === 'keyboard' || device === 'gamepad')); state.device = device; state.lastInput = performance.now(); if (device === 'keyboard' || device === 'gamepad') state.hasHardwareInput = true; if (needsRender) { state.attract = false; render(); } }
  function sound(frequency=440, length=.08, type='sine', volume=.06) {
    if (!settings.sound) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); const oscillator=audio.createOscillator(), gain=audio.createGain(); oscillator.type=type; oscillator.frequency.value=frequency; gain.gain.setValueAtTime(volume,audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length); oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime+length); } catch (_) {}
  }
  function voice() { [490,610,520].forEach((tone,index) => setTimeout(() => sound(tone,.07,'sine',.025),index*75)); }
  function music(dt) { if (!audio || !settings.music || document.hidden) return; musicClock -= dt; if (musicClock <= 0) { musicClock=.48; const notes=[261.63,329.63,392,329.63,293.66,349.23,440,349.23]; const index=Math.floor(performance.now()/480)%notes.length; try { const oscillator=audio.createOscillator(), gain=audio.createGain(); oscillator.type='sine'; oscillator.frequency.value=notes[index]; gain.gain.setValueAtTime(settings.music*.07,audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.32); oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime+.32); } catch (_) {} } }
  function button(label, action, extra='', subtitle='') { return `<button class="button ${extra}" data-action="${action}">${label}${subtitle ? `<small>${subtitle}</small>` : ''}</button>`; }
  function header(right='A little balance goes a long way') { return `<div class="topbar"><div class="logo">TIPPY <i>✳</i> CAY</div><span class="pill"><span class="sun-dot"></span>${esc(right)}</span></div>`; }
  function shell(content, right) { return `<div class="screen">${header(right)}${content}</div>`; }
  function modal(title, eyebrow, content, back='title') { return shell(`<div class="panel-wrap"><section class="panel"><div class="panel-head"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2></div><button class="close" data-action="${back}" aria-label="Back">×</button></div>${content}</section></div>`); }
  function profileName() { return state.profile ? state.profile.name : 'Guest'; }
  function profileDay() { return state.profile ? clamp(state.profile.day,1,5) : 1; }
  function eventById(id) { return events.find(item => item.id === id); }
  function unlocked(item) { return state.profile && (state.profile.freePlay || item.day <= state.profile.day); }
  function formatScore(score) { return Math.round(score).toLocaleString(); }

  function render() {
    let html = '';
    if (state.screen === 'title') {
      const hasSave = (saved.slots || []).some(Boolean);
      html = shell(`<div class="title-layout"><section class="title-panel"><div class="overline">A rather uplifting island escape</div><h1>Wii Fit<br><span>Together.</span></h1><p class="lede">Welcome to Tippy Cay, where the sea is calm, the company is questionable, and balance is a journey.</p><div class="title-actions">${button('New Stay','slots-new','primary','A five-day island adventure')}${button('Continue','slots-continue','',hasSave?'Welcome back to the island':'Choose a guest to continue')}${button('Play Together','together','coral','Local or AI Hub medley')}${button('Settings','settings','', 'Controls, sound & accessibility')}</div></section><aside class="hero-note"><b>A note from Pip</b>“We believe in you.<br>Gravity has declined to comment.”</aside></div><div class="footer"><span>✳ AN ORIGINAL TIPPY CAY GETAWAY</span><div><button class="pill" data-action="about">About this game</button> <span class="hint">WASD / arrows · Space · Controller</span></div></div>`, 'THE ISLAND IS OPEN');
    } else if (state.screen === 'slots') {
      const slots = saved.slots || [null,null,null,null];
      html = modal(state.slotMode === 'new' ? 'Choose a guest' : 'Welcome back', 'THE GUEST BOOK', `<p>Every guest gets a little corner of the island. Choose an empty book to begin.</p><div class="cards">${slots.map((guest,index) => `<button class="card" data-action="slot:${index}"><strong>${guest ? esc(guest.name) : 'Guest '+(index+1)+' · Empty'}</strong><small>${guest ? `Day ${guest.day} · ${guest.minutesTotal || 0} minutes banked` : 'Ready for a new stay'}</small></button>`).join('')}</div><p class="tiny">Your progress stays in this browser on this device.</p>`);
    } else if (state.screen === 'customize') {
      html = modal('Make yourself at home','YOUR ISLAND LOOK', `<p>Pick a name and an outfit. Your look is always welcome here.</p><label class="field">Guest name<select id="guest-name">${names.map(name=>`<option ${name === state.setup.name ? 'selected' : ''}>${name}</option>`).join('')}</select></label><div class="field">Skin tone<div class="swatches">${skins.map((color,index)=>`<button class="swatch ${index===state.setup.skin?'selected':''}" style="background:${color}" data-action="skin:${index}" aria-label="Skin tone ${index+1}"></button>`).join('')}</div></div><div class="field">Outfit color<div class="swatches">${outfits.map((color,index)=>`<button class="swatch ${index===state.setup.outfit?'selected':''}" style="background:${color}" data-action="outfit:${index}" aria-label="Outfit color ${index+1}"></button>`).join('')}</div></div><div class="row">${button('Back','slots-new')}${button('Arrive on the island','create-guest','primary')}</div>`, 'slots-new');
    } else if (state.screen === 'intro') {
      html = modal(`Welcome, ${esc(profileName())}!`,'A WORD FROM PIP', `<div class="dialogue"><span class="speaker">PIP · RECEPTION CUSHION</span><p>“I’m Pip. I run reception, mostly by remaining in one place. You’ll fit right in.”</p><p>Each morning starts with a Wobble Check. Try activities, collect minutes for the giant clam, and take the week at your own pace.</p></div><div class="row">${button('Let’s explore','island','primary')}</div>`);
    } else if (state.screen === 'island') {
      const guest=state.profile, day=profileDay(), goal=goals[day-1];
      const available=events.filter(item=>unlocked(item));
      html = shell(`<div class="island-layout"><section class="island-panel"><div class="eyebrow">HELLO, ${esc(guest.name.toUpperCase())} · ${guest.freePlay?'FREE PLAY':'YOUR ISLAND STAY'}</div><h2>Find your<br>happy wobble.</h2><div class="dayline"><span>DAY ${day} / 5</span><span>✳ ${guest.dayMinutes || 0} / ${goal || '∞'} MIN</span><span>★ ${guest.stars || 0} STARS</span></div><p class="island-note">${guest.checked ? `Pip says your Balance Age is ${guest.age}. The clam looks impressed.` : 'Pip is waiting for your morning Wobble Check.'}</p><div class="activity-list">${!guest.checked ? `<button class="activity highlight" data-action="check"><span>◉</span><strong>Morning Wobble Check<small>Say hello to Pip · about a minute</small></strong><b>→</b></button>` : ''}${available.map(item=>`<button class="activity" data-action="intro:${item.id}"><span>${item.day===4?'≈':item.day===3?'✳':item.day===5?'★':'◌'}</span><strong>${item.name}<small>${item.place} · ${item.coach}</small></strong><b>→</b></button>`).join('')}</div><div class="row island-actions">${button('Guest book','calendar')}${button(day===5?'Finish the stay':'Call it a day','end-day','primary')}</div></section></div><div class="footer"><span>MINUTE CLAM: ${guest.minutesTotal || 0} MINUTES SAVED</span><button class="pill" data-action="settings">Settings</button></div>`, guest.freePlay ? 'FREE PLAY' : `DAY ${day} OF 5`);
    } else if (state.screen === 'calendar') {
      const guest=state.profile;
      html = modal('Your island log','THE GUEST BOOK', `<p>Every visit is worth a stamp. Your best moments stay right here.</p><div class="cards">${[1,2,3,4,5].map(day=>`<div class="card"><strong>${day < guest.day || guest.freePlay ? '✓' : '○'} Day ${day}</strong><small>${day===guest.day&&!guest.freePlay?'Currently exploring':day < guest.day || guest.freePlay?'A day well spent':'A day to look forward to'}</small></div>`).join('')}</div><p>Balance Age: <strong>${guest.age ?? 'not checked yet'}</strong> · Total: <strong>${guest.minutesTotal || 0} minutes</strong></p><div class="row">${button('Back to the island','island','primary')}</div>`, 'island');
    } else if (state.screen === 'eventIntro') {
      const item=eventById(state.eventId);
      html = modal(item.name, `${esc(item.place.toUpperCase())} · WITH ${esc(item.coach.toUpperCase())}`, `<div class="dialogue"><span class="speaker">${esc(item.coach.toUpperCase())} SAYS</span><p>“${esc(item.description)}”</p></div><p><strong>How to play:</strong> ${esc(item.controls)}</p><p>Move with WASD, arrows, a controller stick, or your mouse. Action is Space, Enter, controller south button, or click.</p><div class="row">${button('Not yet','cancel-event')}${button('I’m ready','begin-event','primary')}</div>`, 'cancel-event');
    } else if (state.screen === 'checkIntro') {
      html = modal('Morning Wobble Check','PIP · RECEPTION CUSHION', `<div class="dialogue"><p>“This is not a test of your worth. It is a test of whether the dot stays near the middle.”</p></div><p>Four little checks: stand still, lean toward targets, close your eyes, and alternate steps. Your Balance Age is a playful score, not medical advice.</p><div class="row">${button('Back','island')}${button('Begin the check','begin-check','primary')}</div>`, 'island');
    } else if (state.screen === 'event' || state.screen === 'check') {
      const round=state.round;
      html = shell(`<div class="hud"><div><div class="eyebrow">${esc(round.place.toUpperCase())}</div><h2 id="round-name">${esc(round.name)}</h2><div id="round-subtitle">${esc(round.instruction)}</div></div><div class="hud-right"><div class="pill" id="timer">${Math.ceil(round.length)}s</div><button class="pill" data-action="pause">Ⅱ Pause</button></div></div><div class="event-center"><div class="phase-card" id="phase-card">${esc(round.instruction)}</div></div><div class="event-bottom"><div class="puck" aria-label="Balance puck"><div class="target" id="target"></div><div class="dot" id="dot"></div></div><div class="meter"><div><strong id="round-score">0</strong> <span id="score-label">POINTS</span></div><div class="meter-track"><div id="meter-fill"></div></div><small id="round-help">${esc(round.controls)}</small></div></div>`, state.together ? `PLAYER ${state.together.player+1} · MEDLEY` : 'FIND YOUR BALANCE');
      if (state.paused) html += `<div class="overlay"><section class="panel narrow"><div class="eyebrow">TAKE YOUR TIME</div><h2>Paused.</h2><p>${state.together?.online?'The online round continues in the background.':'The island isn’t going anywhere.'}</p><div class="row">${button('Resume','resume','primary')}${button('Settings','settings')}${state.together?.online?'':button('Leave activity','leave-event')}</div>${state.together?.online?'':`<details><summary>Developer tuning</summary><label class="field">Spring stiffness<input id="dev-stiffness" type="range" min="10" max="80" value="${state.stiffness ?? 40}"></label><label class="field">Damping<input id="dev-damping" type="range" min="2" max="20" value="${state.damping ?? 8.5}" step=".5"></label><label class="field">Wobble<input id="dev-wobble" type="range" min="0" max=".4" value="${state.wobble ?? .12}" step=".01"></label><label class="field">Time scale<input id="dev-timeScale" type="range" min=".25" max="4" value="${state.timeScale ?? 1}" step=".25"></label><div class="row">${button('Reset tuning','reset-tuning')}${button('Finish activity now','finish-now')}${!state.together?button('Give 5 minutes','give-minutes'):''}</div></details>`}</section></div>`;
    } else if (state.screen === 'result') {
      const result=state.result;
      html = modal(result.isCheck ? `Balance Age: ${result.age}` : result.name, result.isCheck?'MORNING CHECK COMPLETE':'THAT WAS A GOOD WOBBLE', `<div class="big-score">${result.isCheck ? esc(result.age) : formatScore(result.score)}<small>${result.isCheck?'PLAYFUL BALANCE AGE · NOT A HEALTH MEASURE':'POINTS'}</small></div><div class="stars">${'★'.repeat(result.stars || 0)}${'☆'.repeat(3-(result.stars || 0))}</div><div class="dialogue"><span class="speaker">PIP SAYS</span><p>“${esc(result.comment)}”</p></div><div class="row">${button(state.together?'Continue medley':'Back to the island','result-next','primary')}</div>`, state.together?'result-next':'island');
    } else if (state.screen === 'endDay') {
      const guest=state.profile, goal=goals[profileDay()-1];
      const canFinish=guest.checked && (guest.freePlay || guest.day===5 ? guest.finaleDone || guest.freePlay : guest.dayMinutes>=goal);
      html = modal(guest.day===5?'Check out?':'Time to rest?','THE MINUTE CLAM', `<div class="dialogue"><span class="speaker">PIP · RECEPTION CUSHION</span><p>“The clam has swallowed ${guest.dayMinutes || 0} minutes today. This is apparently a good thing.”</p></div><p>${!guest.checked?'Complete the morning Wobble Check first.':guest.day===5&&!guest.finaleDone&&!guest.freePlay?'Complete The Big Stand before checking out.':!canFinish?`The clam is hoping for ${goal} minutes today. Complete another activity or two.`:'You have done enough for today. The island will be here when you wake.'}</p><div class="row">${button('Keep exploring','island')}${canFinish ? button(guest.day===5?'See the finale':'Sleep until tomorrow','sleep','primary') : ''}</div>`, 'island');
    } else if (state.screen === 'ending') {
      html = modal(state.profile.age<=40?'A standing ovation.':'An extended stay.','THE BIG STAND · CHECKOUT', `<div class="big-score">${state.profile.age}<small>FINAL BALANCE AGE</small></div><div class="dialogue"><p>${state.profile.age<=40?'“You did it,” says Pip. “You stood there, and we all felt something.”':'“We’ve extended your stay,” says Pip. “The paperwork is a napkin.”'}</p><p>The cast waves from the water. Your island adventure continues in free play.</p></div><p>Created for Tippy Cay · A playful original game inspired by Wii Fit.</p><div class="row">${button('Continue in free play','free-play','primary')}</div>`, 'island');
    } else if (state.screen === 'together') {
      html = modal('Play together','THE ISLAND MEDLEY', `<p>Take turns on one device through Paddle Slalom, Tide Table, and Cannonball Cup. Add up to four guests; each score is out of 3,000.</p><div class="cards three">${[2,3,4].map(number=>`<button class="card" data-action="hotseat:${number}"><strong>${number} guests</strong><small>Pass the controller after each medley</small></button>`).join('')}</div><p class="tiny">When launched from AI Hub, the same medley runs online with translucent ghost guests.</p>`);
    } else if (state.screen === 'handoff') {
      const group=state.together, item=eventById(medley[group.event]);
      html = modal(`Guest ${group.player+1}, you’re up!`,'PASS THE CONTROLLER', `<p>Round ${group.event+1} of 3: <strong>${item.name}</strong></p><div class="dialogue"><p>“No rush,” says Pip. “The sea will wait. The gull might not.”</p></div><div class="row">${button('Start '+item.name,'hotseat-next','primary')}</div>`, 'title');
    } else if (state.screen === 'podium') {
      const group=state.together, ranking=group.scores.map((score,index)=>({score,index})).sort((left,right)=>right.score-left.score);
      html = modal('A very good medley','ISLAND PODIUM', `<p>The clam would like to thank every guest for their outstanding participation.</p><div class="cards">${ranking.map((entry,index)=>`<div class="card"><strong>${['🥇','🥈','🥉','✳'][index]} Guest ${entry.index+1}</strong><small>${formatScore(entry.score)} / 3,000 points</small></div>`).join('')}</div><div class="row">${button('Play again','together')}${button('Return to title','title','primary')}</div>`);
    } else if (state.screen === 'waiting') {
      html = modal('Waiting for the island','AI HUB · ONLINE MEDLEY', `<p>${esc(state.message || 'Getting your group together…')}</p><div class="dialogue"><p>Three events. One shared island. Everyone plays at their own pace with live ghost guests.</p></div>${state.hub && !state.hub.splash ? `<div class="row">${button('Ready to play','hub-ready','primary')}</div>` : ''}`);
    } else if (state.screen === 'settings') {
      html = modal('Make it yours','SETTINGS & CONTROLS', `<label class="field">Music volume: <span id="music-value">${Math.round(settings.music*100)}%</span><input id="music" type="range" min="0" max="100" value="${Math.round(settings.music*100)}"></label><label class="field">Sound effects <select id="sound"><option value="on" ${settings.sound?'selected':''}>On</option><option value="off" ${!settings.sound?'selected':''}>Off</option></select></label><label class="field">Controller labels <select id="glyph"><option ${settings.glyph==='PlayStation'?'selected':''}>PlayStation</option><option ${settings.glyph==='Xbox'?'selected':''}>Xbox</option></select></label><p>Keyboard: WASD or arrow keys to lean; Space / Enter to act; Esc to pause. Controller: left stick and ${settings.glyph==='Xbox'?'A':'Cross'}. Mouse: move to lean and click to act. Arrow keys navigate menus.</p><p>Touch-only devices can view the island; connect a controller or keyboard to play.</p><div class="row">${button('Done','settings-back','primary')}</div>`, 'settings-back');
    } else if (state.screen === 'about') {
      const info = window.__aboutData || {};
      const blocks = [['Source Information',info.sourceInformation],['Testing Feedback',info.testingFeedback],['Engine Feedback',info.engineFeedback],['Prompt Feedback',info.promptFeedback]];
      html = modal('About this game','THE FINE PRINT', `<p>Made with Shardfall and an original island full of questionable advice.</p>${blocks.map(([label,value])=>`<h3>${esc(label)}</h3><div class="about-list">${Array.isArray(value)?value.map(line=>`<p>${esc(line)}</p>`).join(''):Object.entries(value||{}).map(([key,line])=>`<p><strong>${esc(key)}:</strong> ${esc(line)}</p>`).join('')}</div>`).join('')}<h3>Library credits</h3><div class="about-list"><p>Shardfall core assets: Shardfall contributors (CC0 1.0).</p><p>100STYLE motion: Mason, Starke and Komura (CC BY 4.0).</p><p>Mesh2Motion and its contributors; Universal Animation Libraries 1 and 2 by Quaternius (CC0 1.0).</p><p>CMU Graphics Lab Motion Capture Database: free to use, copy, modify and redistribute; the data may not be resold, even in converted form.</p><p>The interface uses system fonts. Shardfall's embedded egui fonts include Hack, Noto Emoji, Ubuntu Light and Emoji Icon Font.</p></div><details class="licenses"><summary>Font license texts</summary>${Object.entries(window.__licenseData || {}).map(([label,text])=>`<h4>${esc(label)}</h4><pre>${esc(text)}</pre>`).join('')}</details><div class="row">${button('Back to the island','title','primary')}</div>`);
    }
    if (state.attract && state.screen==='title') html += `<div class="attract-label">A LITTLE ISLAND DAYDREAM · PRESS ANY KEY TO RETURN</div>`;
    if (isTouchOnly() && !state.hasHardwareInput && !['settings','about'].includes(state.screen)) html += `<div class="touch-guard"><div><strong>Controller or keyboard required</strong><p>Connect one to play. The island will wait for you.</p><button class="button" data-action="settings">Settings</button></div></div>`;
    app.innerHTML = html;
    const musicInput=document.getElementById('music');
    if (musicInput) musicInput.addEventListener('input', event=>{ settings.music=Number(event.target.value)/100; document.getElementById('music-value').textContent=Math.round(settings.music*100)+'%'; save(); });
    const soundInput=document.getElementById('sound');
    if (soundInput) soundInput.addEventListener('change', event=>{ settings.sound=event.target.value==='on'; save(); });
    const glyphInput=document.getElementById('glyph');
    if (glyphInput) glyphInput.addEventListener('change', event=>{ settings.glyph=event.target.value; save(); render(); });
    const nameInput=document.getElementById('guest-name');
    if (nameInput) nameInput.addEventListener('change', event=>{ state.setup.name=event.target.value; });
    for (const kind of ['stiffness','damping','wobble','timeScale']) { const input=document.getElementById('dev-'+kind); if(input) input.addEventListener('input', event=>{state[kind]=Number(event.target.value);}); }
  }

  function isTouchOnly() { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; }
  function newProfile() { return {name:state.setup.name,skin:state.setup.skin,outfit:state.setup.outfit,day:1,dayMinutes:0,minutesTotal:0,stars:0,age:null,checked:false,finaleDone:false,freePlay:false,bests:{},clearedToday:{},lastDate:new Date().toISOString().slice(0,10)}; }
  function setScreen(screen) { state.screen=screen; render(); }
  function selectAction(action) {
    if (!action) return;
    sound(520,.05);
    if (action === 'title') { state.paused=false; state.together=null; state.round=null; setScreen('title'); }
    else if (action === 'slots-new' || action === 'slots-continue') { state.slotMode=action==='slots-new'?'new':'continue'; setScreen('slots'); }
    else if (action.startsWith('slot:')) { const index=Number(action.slice(5)), guest=(saved.slots||[])[index]; state.slot=index; if (guest) { state.profile=guest; setScreen('island'); } else { state.setup={name:names[index],skin:index%skins.length,outfit:index%outfits.length}; setScreen('customize'); } }
    else if (action.startsWith('skin:')) { state.setup.skin=Number(action.slice(5)); render(); }
    else if (action.startsWith('outfit:')) { state.setup.outfit=Number(action.slice(7)); render(); }
    else if (action==='create-guest') { state.profile=newProfile(); save(); voice(); setScreen('intro'); }
    else if (action==='island') { if (state.profile) {state.paused=false;setScreen('island');} else setScreen('title'); }
    else if (action==='calendar') setScreen('calendar');
    else if (action==='check') { voice(); setScreen('checkIntro'); }
    else if (action==='begin-check') startCheck();
    else if (action.startsWith('intro:')) { state.eventId=action.slice(6); voice(); setScreen('eventIntro'); }
    else if (action==='cancel-event') setScreen(state.together?'handoff':'island');
    else if (action==='begin-event') startRound(state.eventId);
    else if (action==='pause') { state.paused=true; render(); }
    else if (action==='resume') { state.paused=false; render(); }
    else if (action==='reset-tuning') { state.stiffness=40; state.damping=8.5; state.wobble=.12; state.timeScale=1; render(); }
    else if (action==='finish-now') { state.paused=false; if(state.screen==='check') finishCheck(); else finishRound(); }
    else if (action==='give-minutes') { if(state.profile && !state.together) {state.profile.dayMinutes=(state.profile.dayMinutes||0)+5;state.profile.minutesTotal=(state.profile.minutesTotal||0)+5;save();} render(); }
    else if (action==='leave-event') { state.paused=false; if (state.together && state.together.online) reportHub(); else setScreen(state.together?'handoff':'island'); }
    else if (action==='result-next') advanceResult();
    else if (action==='end-day') setScreen('endDay');
    else if (action==='sleep') { if (state.profile.day===5) setScreen('ending'); else { state.profile.day++; state.profile.dayMinutes=0; state.profile.clearedToday={}; state.profile.checked=false; state.profile.lastDate=new Date().toISOString().slice(0,10); save(); setScreen('island'); } }
    else if (action==='free-play') { state.profile.freePlay=true; save(); setScreen('island'); }
    else if (action==='together') { state.together=null; setScreen('together'); }
    else if (action.startsWith('hotseat:')) { state.together={count:Number(action.slice(8)),player:0,event:0,scores:[0,0,0,0],online:false,ghosts:{}}; setScreen('handoff'); }
    else if (action==='hotseat-next') { state.eventId=medley[state.together.event]; setScreen('eventIntro'); }
    else if (action==='settings') { state.returnScreen=state.screen; setScreen('settings'); }
    else if (action==='settings-back') setScreen(state.returnScreen || 'title');
    else if (action==='about') setScreen('about');
    else if (action==='hub-ready') { if(hub) hub.ready(); state.message='Ready! Waiting for the other guests.'; render(); }
  }

  function startCheck() { center={x:0,y:0,vx:0,vy:0}; aim={x:0,y:0}; state.paused=false; state.round={name:'Morning Wobble Check',place:'Stillness Studio',instruction:'Stand still. This is the whole test.',controls:'Keep the dot near the center.',length:37,elapsed:0,sum:0,samples:0,actionHits:0,actionCount:0,targets:0,phase:0,steps:0,lastStep:'',metric:[0,0,0,0],phaseSamples:[0,0,0,0]}; setScreen('check'); }
  function startRound(id) { const item=eventById(id); if(!item) return; center={x:0,y:0,vx:0,vy:0}; aim={x:0,y:0}; lastHubUpdate=0; lastHubProgress=0; state.paused=false; state.round={...item,instruction:item.controls,elapsed:0,sum:0,samples:0,actionHits:0,actionCount:0,steps:0,lastStep:'',shellX:0,shellY:0,shellVx:0,shellVy:0,potted:0,spin:0,prevAngle:0,gates:0,gateIndex:-1,stillBroken:false,ghostTrail:[]}; setScreen('event'); if(state.together?.online && hub) hub.progress({score:state.together.scores[0],label:`${item.name}: starting`}); }
  function triggerAction(side='action') {
    if (!state.round || !['event','check'].includes(state.screen) || state.paused) return;
    const round=state.round, time=round.elapsed;
    if (round.id==='finale' && time>60) round.stillBroken=true;
    round.actionCount++;
    if (side==='left' || side==='right') { if (round.lastStep!==side) {round.steps++; round.lastStep=side;} }
    if (round.id==='squat' || round.id==='step' || round.id==='lap' || round.id==='dive' || state.screen==='check') {
      const interval=round.id==='dive'?1.2:round.id==='step'?.625:.6;
      const phase=time%interval; if(Math.min(phase,interval-phase)<.22) round.actionHits++;
      sound(round.id==='dive'?240:420,.09,'sine',.045);
    } else sound(360,.06,'sine',.03);
  }
  function finishCheck() {
    const round=state.round;
    const metric=round.metric.map((value,index)=>round.phaseSamples[index] ? value/round.phaseSamples[index] : 0);
    metric[3]=clamp(round.steps/8,0,1)*.6 + clamp(round.actionHits/8,0,1)*.4;
    const skill=.30*metric[0]+.25*metric[1]+.25*metric[2]+.20*metric[3];
    const age=Math.round(clamp(24+56*Math.pow(1-clamp(skill,0,1),1.1)-2*(profileDay()-1)-Math.min((state.profile.stars||0)/3,8),18,99));
    state.profile.checked=true; state.profile.age=age; save();
    state.result={isCheck:true,age,stars:skill>.8?3:skill>.5?2:1,comment:'A number! We can put it on a postcard. The important part is that you showed up.'}; voice(); setScreen('result');
  }
  function finishRound() {
    const round=state.round; let score=Math.round(clamp(round.sum/Math.max(round.samples,1),0,1)*1000);
    if (round.id==='tide') score=Math.round(clamp(round.potted*200+score*.4,0,1000));
    if (round.id==='paddle') score=Math.round(clamp(round.gates*125+score*.3,0,1000));
    if (round.id==='dive') score=Math.round(clamp(score*.5+Math.min(round.actionHits,8)*65,0,1000));
    if (round.id==='finale' && !round.stillBroken) score=Math.min(1000,score+100);
    const stars=score>=850?3:score>=650?2:score>=400?1:0;
    let banked=0;
    if(state.together) { state.together.scores[state.together.player]+=score; if(state.together.online && hub) hub.progress({score:state.together.scores[0],label:`${round.name}: ${score}`}); }
    else if (state.profile) { const guest=state.profile; guest.clearedToday=guest.clearedToday||{}; banked=guest.clearedToday[round.id]?1:1+stars; guest.clearedToday[round.id]=true; guest.dayMinutes=(guest.dayMinutes||0)+banked; guest.minutesTotal=(guest.minutesTotal||0)+banked; guest.stars=(guest.stars||0)+stars; guest.bests[round.id]=Math.max(guest.bests[round.id]||0,score); if(round.id==='finale') {guest.finaleDone=true;guest.age=Math.max(18,Math.round((guest.age||60)-score/100));} save(); }
    state.result={isCheck:false,name:round.name,score,stars,comment:`${titles[Math.min(titles.length-1,Math.floor(score/1000*titles.length))]}. We’ve banked ${state.together?'your points':`${banked} minute${banked===1?'':'s'} in the clam`}.`}; state.paused=false; sound(660,.25,'sine'); voice(); setScreen('result');
    if(state.together?.online) setTimeout(()=>{if(state.screen==='result' && state.round===round && state.together?.online) advanceResult();},1500);
  }
  function advanceResult() {
    if(!state.together) {setScreen('island');return;}
    const group=state.together; group.event++;
    if(group.online) { if(group.event>=3) reportHub(); else {state.eventId=medley[group.event];startRound(state.eventId);} return; }
    if(group.event>=3) {group.event=0;group.player++;}
    if(group.player>=group.count) setScreen('podium'); else setScreen('handoff');
  }
  function reportHub() { if(!state.together || !state.together.online) return; const score=clamp(Math.round(state.together.scores[0]),0,3000); if(hub && !state.together.reported) {state.together.reported=true;hub.result({score,stats:{events:Math.min(3,state.together.event)},awards:[{name:'Island Enthusiast',description:'Completed the Tippy Cay medley.'}]});} state.message=`Medley complete: ${formatScore(score)} points. Waiting for the group.`;setScreen('waiting'); }

  function updateInput(dt) {
    let x=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0), y=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
    let gamepad=null; try { gamepad=Array.from(navigator.getGamepads?.()||[]).find(Boolean); } catch (_) {}
    if(gamepad) {
      const dead=value=>Math.abs(value)<.12?0:Math.sign(value)*Math.pow((Math.abs(value)-.12)/.88,1.5);
      const gx=dead(gamepad.axes[0]||0), gy=dead(gamepad.axes[1]||0); if(Math.abs(gx)+Math.abs(gy)>.03) {x=gx;y=gy;markInput('gamepad');state.hasHardwareInput=true;}
      const pressed=gamepad.buttons.map(item=>item.pressed);
      for(const index of [0,9,12,13,14,15]) if(pressed[index]&&!previousButtons[index]) { markInput('gamepad');state.hasHardwareInput=true; if(index===9){if(['event','check'].includes(state.screen)) selectAction(state.paused?'resume':'pause');} else if(['event','check'].includes(state.screen)&&!state.paused) triggerAction(index===14?'left':index===15?'right':'action'); else if(index===0) { const focused=document.activeElement; if(focused && focused.tagName==='BUTTON') focused.click(); else app.querySelector('button:not([disabled])')?.focus(); } else if([12,13,14,15].includes(index)) moveFocus(index===12||index===14?-1:1); }
      previousButtons=pressed;
    }
    if(state.paused && !state.together?.online) return;
    const speed=keys.has('shift')?.5:1;
    if(x||y) { aim.x=clamp(aim.x+x*1.6*dt*speed,-1,1); aim.y=clamp(aim.y+y*1.6*dt*speed,-1,1); }
    else if(mouseAim && state.device==='mouse') { aim.x=mouseAim.x;aim.y=mouseAim.y; }
    else {aim.x=smooth(aim.x,0,1.2,dt);aim.y=smooth(aim.y,0,1.2,dt);}
    const round=state.round, time=round?.elapsed||0, wobble=state.wobble ?? .12;
    const targetX=aim.x*.92+wobble*(Math.sin(time*2.13)*.6+Math.sin(time*3.71)*.4), targetY=aim.y*.92+wobble*(Math.sin(time*1.79)*.6+Math.sin(time*3.31)*.4);
    const stiffness=state.stiffness||40, damping=state.damping||8.5;
    center.vx+=((targetX-center.x)*stiffness-center.vx*damping)*dt;center.vy+=((targetY-center.y)*stiffness-center.vy*damping)*dt;
    center.x=clamp(center.x+center.vx*dt,-1.2,1.2);center.y=clamp(center.y+center.vy*dt,-1.2,1.2);
  }
  function heldAction() { try { const gamepad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);return mouseHeld||keys.has(' ')||keys.has('enter')||!!gamepad?.buttons[0]?.pressed; } catch (_) { return mouseHeld||keys.has(' '); } }
  function tickRound(dt) {
    const round=state.round, online=!!state.together?.online, onlineSettings=online && state.screen==='settings' && state.returnScreen==='event'; if(!round || (state.paused && !online) || (!['event','check'].includes(state.screen) && !onlineSettings)) return;
    round.elapsed+=dt; const time=round.elapsed;
    let quality=clamp(1-Math.hypot(center.x,center.y)*.8,0,1), targetX=0,targetY=0, instruction=round.controls;
    if(state.screen==='check') {
      const phase=time<8?0:time<23?1:time<29?2:3;round.phase=phase;
      if(phase===1) {targetX=[-.7,.7,-.7][Math.min(2,Math.floor((time-8)/5))];quality=clamp(1-Math.abs(center.x-targetX),0,1);instruction='Lean into the target ring.';}
      else if(phase===2) instruction='Eyes closed. Trust the sound and find your center.';
      else if(phase===3) instruction='Alternate left and right steps to the beat.';
      else instruction='Stand still. This is the whole test.';
      round.metric[phase]+=quality;round.phaseSamples[phase]++;
    } else {
      if(round.id==='breath') { const inhale=(time%8)<4;quality=(heldAction()===inhale)?1:.15;instruction=inhale?'Breathe in · hold Action':'Breathe out · release Action'; }
      else if(round.id==='pose') { targetX=Math.sin(time*.58)*.55;targetY=Math.cos(time*.43)*.25;quality=clamp(1-Math.hypot(center.x-targetX,center.y-targetY),0,1);instruction='Follow the drifting ring.'; }
      else if(round.id==='squat') {quality=clamp(round.actionHits/Math.max(1,time/.6)*1.1,0,1)*.7+quality*.3;instruction='Press Action as the beat lands.';}
      else if(round.id==='plank') { quality=quality*(heldAction()?1:.35);instruction='Hold Action. Be one with the plank.'; }
      else if(round.id==='step'||round.id==='lap') {quality=clamp(round.steps/Math.max(1,time/.625),0,1)*.65+clamp(round.actionHits/Math.max(1,round.actionCount),0,1)*.35;instruction='Alternate Left and Right on the beat.';}
      else if(round.id==='spin') {const angle=Math.atan2(center.y,center.x);let diff=angle-round.prevAngle;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;round.prevAngle=angle;round.spin=smooth(round.spin,Math.abs(diff)/Math.max(dt,.001),3,dt);quality=clamp(round.spin/4,0,1)*(Math.hypot(center.x,center.y)>.25?1:.3);instruction='Circle your lean. Keep the floaties moving!';}
      else if(round.id==='tide') {round.shellVx=(round.shellVx+center.x*dt*.9)*Math.exp(-1.6*dt);round.shellVy=(round.shellVy+center.y*dt*.9)*Math.exp(-1.6*dt);round.shellX=clamp(round.shellX+round.shellVx*dt,-.9,.9);round.shellY=clamp(round.shellY+round.shellVy*dt,-.9,.9);targetX=Math.sin(round.potted*3)*.6;targetY=Math.cos(round.potted*2)*.55;if(Math.hypot(round.shellX-targetX,round.shellY-targetY)<.16){round.potted++;round.shellX=0;round.shellY=0;sound(780,.12);}quality=clamp(1-Math.hypot(round.shellX-targetX,round.shellY-targetY)*.5,0,1);instruction=`Shells in pools: ${round.potted} · Tilt toward the pool.`;}
      else if(round.id==='paddle') {targetX=Math.sin(Math.floor(time/4.5)*1.9)*.65;quality=clamp(1-Math.abs(center.x-targetX),0,1);const gate=Math.floor(time/4.5);if(gate!==round.gateIndex){round.gateIndex=gate;if(quality>.63)round.gates++;}instruction=`Gates cleared: ${round.gates} · Steer to the ring.`;}
      else if(round.id==='tray') {quality=clamp(quality-.08*Math.abs(Math.sin(time*1.7)),0,1);instruction='Keep the smoothies aboard.';}
      else if(round.id==='dive') {quality=clamp(round.actionHits/Math.max(1,time/1.2)*1.5,0,1)*.7+(heldAction()?.3:0);instruction='Press at the bottom of the bounce; hold to tuck.';}
      else if(round.id==='finale') {if(time<16){instruction=(time%8)<4?'Breathe in · hold Action':'Breathe out · release Action';quality=(heldAction()===((time%8)<4))?1:.2;}else if(time<36){targetX=Math.sin(time*.5)*.5;quality=clamp(1-Math.abs(center.x-targetX),0,1);instruction='Follow the pose through the breeze.';}else if(time<48){quality=clamp(round.steps/Math.max(1,(time-36)/.625),0,1);instruction='Step with the island marching band.';}else if(time<60){quality*=heldAction()?1:.3;instruction='Brace against the waves. Hold Action.';}else{instruction=time>75?'Press Action to skip? Or simply stay.':'The Long Stillness. Do nothing.';quality=round.stillBroken?.2:1;}}
      round.sum+=quality;round.samples++;
    }
    const dot=document.getElementById('dot'), target=document.getElementById('target');
    if(dot){dot.style.transform=`translate(${center.x*43}px,${center.y*43}px)`;dot.style.opacity=state.screen==='check'&&round.phase===2?'0':'1';}
    if(target){target.style.transform=`translate(${targetX*43}px,${targetY*43}px)`;target.style.opacity=state.screen==='check'&&round.phase===2?'0':'1';}
    const timer=document.getElementById('timer'), subtitle=document.getElementById('round-subtitle'), phase=document.getElementById('phase-card'), score=document.getElementById('round-score'), fill=document.getElementById('meter-fill');
    if(timer)timer.textContent=Math.max(0,Math.ceil(round.length-time))+'s';if(subtitle)subtitle.textContent=instruction;if(phase)phase.textContent=instruction;if(score)score.textContent=state.screen==='check'?['STILL','LEAN','LISTEN','STEP'][round.phase]:formatScore(round.sum/Math.max(1,round.samples)*1000);if(fill)fill.style.width=clamp(time/round.length*100,0,100)+'%';
    if(state.together?.online && hub && time-lastHubUpdate>.1){lastHubUpdate=time;hub.send({event:state.together.event,x:center.x,y:center.y,progress:time/round.length},{reliable:false});}
    if(state.together?.online && hub && time-lastHubProgress>=2){lastHubProgress=time;hub.progress({score:state.together.scores[0]+Math.round(clamp(round.sum/Math.max(round.samples,1),0,1)*1000),label:round.name});}
    if(time>=round.length) { if(state.screen==='check')finishCheck();else finishRound(); }
  }

  function moveFocus(direction) { const items=Array.from(app.querySelectorAll('button:not([disabled]),select,input')).filter(item=>item.offsetParent!==null);if(!items.length)return;const index=items.indexOf(document.activeElement);items[(index+direction+items.length)%items.length].focus(); }
  app.addEventListener('click', event=>{const target=event.target.closest('[data-action]');if(target){markInput('mouse');selectAction(target.dataset.action);} });
  window.addEventListener('keydown', event=>{const key=event.key.toLowerCase(); const inRound=['event','check'].includes(state.screen); if(['arrowup','arrowdown','arrowleft','arrowright','escape'].includes(key)||(key===' '&&inRound))event.preventDefault();if(!keys.has(key)){markInput('keyboard');if(key==='escape'&&inRound){selectAction(state.paused?'resume':'pause');}else if(inRound&&!state.paused){if(key===' '||key==='enter')triggerAction();if(key==='arrowleft'||key==='a')triggerAction('left');if(key==='arrowright'||key==='d')triggerAction('right');}else if(['arrowup','arrowleft','arrowdown','arrowright'].includes(key)&&!['INPUT','SELECT'].includes(document.activeElement?.tagName))moveFocus(key==='arrowup'||key==='arrowleft'?-1:1);else if(key==='enter'&&document.activeElement===document.body)app.querySelector('button:not([disabled])')?.click();}
    keys.add(key);
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();mouseHeld=false;});
  window.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&['event','check'].includes(state.screen)&&!state.paused){mouseAim={x:clamp((event.clientX-innerWidth/2)/(innerWidth*.35),-1,1),y:clamp((event.clientY-innerHeight/2)/(innerHeight*.35),-1,1)};markInput('mouse');}});
  window.addEventListener('pointerdown',event=>{if(event.target.closest('button,input,select,details,summary'))return;if(event.pointerType==='mouse'&&['event','check'].includes(state.screen)){mouseHeld=true;triggerAction();}});
  window.addEventListener('pointerup',()=>{mouseHeld=false;});

  function resize() {const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);viewport.width=canvas.width;viewport.height=canvas.height;viewport.scale=Math.max(canvas.width/1600,canvas.height/900);viewport.ox=(canvas.width-1600*viewport.scale)/2;viewport.oy=(canvas.height-900*viewport.scale)/2;}
  window.addEventListener('resize',resize);resize();
  function ellipse(x,y,rx,ry,color) {context.fillStyle=color;context.beginPath();context.ellipse(x,y,rx,ry,0,0,Math.PI*2);context.fill();}
  function line(x1,y1,x2,y2,color,width=5) {context.strokeStyle=color;context.lineWidth=width;context.lineCap='round';context.beginPath();context.moveTo(x1,y1);context.lineTo(x2,y2);context.stroke();}
  function palm(x,y,size,flip=1) {context.save();context.translate(x,y);context.scale(size*flip,size);line(0,0,12,-95,'#b87f5a',13);for(let index=0;index<5;index++){const angle=-2.9+index*.54;context.save();context.translate(12,-95);context.rotate(angle);ellipse(42,0,48,11,index%2?'#61b58b':'#449e83');context.restore();}context.restore();}
  function human(x,y,size,skin,outfit,lean=0,step=0) {context.save();context.translate(x,y);context.scale(size,size);ellipse(0,5,29,9,'#347c7060');line(-8,-10,-13+step*8,2,'#526e73',8);line(8,-10,13-step*8,2,'#526e73',8);context.rotate(lean*.23);context.fillStyle=outfit;context.beginPath();context.roundRect(-16,-56,32,48,13);context.fill();line(-13,-47,-24+lean*8,-20,skin,8);line(13,-47,24+lean*8,-20,skin,8);ellipse(0,-67,15,17,skin);ellipse(-5,-68,1.4,1.5,'#28494a');ellipse(5,-68,1.4,1.5,'#28494a');context.restore();}
  function pip(x,y,size=1) {context.save();context.translate(x,y);context.scale(size,size);ellipse(0,4,38,9,'#337e7660');ellipse(0,-19,32,25,'#71cfd6');ellipse(0,-27,27,20,'#92e7e5');ellipse(-8,-28,2.5,3,'#295a5a');ellipse(8,-28,2.5,3,'#295a5a');line(-4,-19,4,-19,'#295a5a',2);context.restore();}
  function hut(x,y,size,color) {context.save();context.translate(x,y);context.scale(size,size);ellipse(0,0,110,28,'#4e9d8e70');context.fillStyle='#fff5d7';context.fillRect(-62,-87,124,83);context.fillStyle=color;context.beginPath();context.moveTo(-88,-85);context.lineTo(0,-140);context.lineTo(88,-85);context.closePath();context.fill();context.fillStyle='#57a99f';context.fillRect(-15,-54,30,50);context.fillStyle='#b4e6dd';context.fillRect(-49,-67,23,21);context.fillRect(26,-67,23,21);context.restore();}
  function drawWorld(now) {
    const scale=viewport.scale;context.setTransform(scale,0,0,scale,viewport.ox,viewport.oy);context.clearRect(-500,-500,2600,1900);
    const sky=context.createLinearGradient(0,0,0,600);sky.addColorStop(0,'#a7e9e5');sky.addColorStop(1,'#e6f8d8');context.fillStyle=sky;context.fillRect(-500,-500,2600,1250);
    ellipse(1310,140,68,68,'#fff4b5');ellipse(1280,122,100,100,'#fff2b728');
    for(let index=0;index<5;index++){const x=280+index*310+Math.sin(now*.00012+index)*18;ellipse(x,145+index%2*48,72,18,'#ffffffa8');ellipse(x-35,150+index%2*48,45,16,'#ffffffa8');}
    context.fillStyle='#73cfd0';context.fillRect(-500,390,2600,1010);ellipse(260,409,300,58,'#9bdacc');ellipse(1210,420,380,72,'#89cfc3');
    for(let index=0;index<12;index++){let x=(index*241+now*.012)%1900-150;line(x,475+(index%4)*77,x+50,475+(index%4)*77,'#d3f7e690',3);}
    ellipse(910,715,660,235,'#55a99b');ellipse(900,682,650,215,'#efd69c');ellipse(895,664,614,188,'#f7e7b7');ellipse(890,615,520,133,'#bbdea5');
    context.fillStyle='#deba82';context.beginPath();context.moveTo(620,645);context.lineTo(1020,645);context.lineTo(1150,820);context.lineTo(760,820);context.closePath();context.fill();
    for(let index=0;index<8;index++)line(660+index*44,666,810+index*44,810,'#f4d09a',4);
    hut(704,538,.83,'#ff987b');hut(1015,527,.95,'#78cfc2');hut(1230,570,.65,'#f6c46f');
    palm(500,612,.95);palm(1320,630,1.1,-1);palm(1140,512,.55);palm(565,500,.5,-1);
    const guest=state.profile||state.setup||{skin:0,outfit:0};
    human(1070,750,1.2,skins[guest.skin||0],outfits[guest.outfit||0],center.x,Math.sin(now*.005));pip(1160,770,1.15);
    human(725,586,.55,skins[3],outfits[4],0,0);human(940,583,.5,skins[1],outfits[2],0,0);
    if(['event','check'].includes(state.screen)) {
      context.fillStyle='#fff4d7ba';context.beginPath();context.roundRect(585,195,430,405,42);context.fill();
      ellipse(800,547,185,48,'#91d5bf');ellipse(800,533,158,35,'#fbecc7');
      const round=state.round; const act=heldAction();human(800,532,2.75,skins[guest.skin||0],outfits[guest.outfit||0],center.x,Math.sin(now*.008)*(round?.id==='step'?.8:.1));
      if(round?.id==='breath'){const r=80+30*Math.sin(round.elapsed*Math.PI/4);context.strokeStyle='#ffb2a6';context.lineWidth=8;context.beginPath();context.arc(800,348,r,0,Math.PI*2);context.stroke();}
      if(round?.id==='tide'){ellipse(800+round.shellX*145,500+round.shellY*45,12,10,'#f58a73');ellipse(800+Math.sin(round.potted*3)*87,500+Math.cos(round.potted*2)*25,16,9,'#61b8c2');}
      if(round?.id==='paddle'){context.strokeStyle='#ff9c72';context.lineWidth=10;context.beginPath();context.arc(800+Math.sin(Math.floor(round.elapsed/4.5)*1.9)*100,300,58,0,Math.PI*2);context.stroke();}
      if(round?.id==='dive'&&act){for(let index=0;index<8;index++)ellipse(700+index*27,545-Math.abs(Math.sin(now*.005+index))*45,8,12,'#9be7e5');}
      for(const [id,ghost] of Object.entries(state.together?.ghosts||{})) if(ghost.event===state.together.event){context.globalAlpha=.35;human(800+ghost.x*180,530,2.25,'#c3eee5','#78a3c5',ghost.x,0);context.globalAlpha=1;}
    }
  }
  function frame(now) { const realDt=Math.max(0,(now-lastFrame)/1000), dt=Math.min(realDt,.05);lastFrame=now;updateInput(dt);if(!state.paused || state.together?.online)tickRound(state.together?.online?realDt:dt*(state.timeScale ?? 1));music(dt);if(state.screen==='title'&&!state.attract&&now-state.lastInput>10000){state.attract=true;render();}drawWorld(now);requestAnimationFrame(frame); }
  requestAnimationFrame(frame);

  if (hub && hub.active) {
    hub.on('start', data=>{state.together={count:state.hub?.players?.length||1,player:0,event:0,scores:[0,0,0,0],online:true,ghosts:{}};setTimeout(()=>startRound(medley[0]),Math.max(0,Number(data?.in)||0));});
    hub.on('message',(data,from)=>{if(state.together?.online && data && Number.isFinite(data.x) && Number.isFinite(data.y))state.together.ghosts[from||'guest']=data;});
    hub.on('time-up',()=>reportHub());hub.on('end',()=>{state.paused=true;state.message='The online session has ended.';setScreen('waiting');});
    hub.connect({mode:'ghost',seats:[1,4]}).then(info=>{if(!info)return;state.hub=info;state.message='Connected! Getting the medley ready.';setScreen('waiting');if(info.splash)hub.ready();}).catch(()=>{state.message='Could not connect to AI Hub. Local play is still available.';setScreen('waiting');});
    hub.probe(()=>({scene:state.screen,menu:{screen:state.screen},world:{event:state.round?.id,elapsed:state.round?.elapsed},input:{device:state.device}}));
  }
  window.__gameBoot={ready:true,title:'Wii Fit Together'};
  window.__gameStatus=()=>JSON.stringify({scene:state.screen,guest:profileName(),day:state.profile?.day||0,checked:!!state.profile?.checked,minutes:state.profile?.dayMinutes||0,age:state.profile?.age??null,event:state.round?.id||null,elapsed:state.round?.elapsed||0,paused:state.paused,resultStars:state.result?.stars??null,together:state.together?{player:state.together.player,event:state.together.event,scores:state.together.scores}:null});
  if (new URLSearchParams(location.search).has('test')) window.__testAdvance=seconds=>{for(let elapsed=0;elapsed<seconds&&['event','check'].includes(state.screen);elapsed+=.025){updateInput(.025);tickRound(.025);}};
  render();
})();
