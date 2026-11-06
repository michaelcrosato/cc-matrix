/*WASM_IMPORT*/
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ABOUT=JSON.parse($('#about-data').textContent), STORY=JSON.parse($('#story-data').textContent);
const DEFAULTS={music:.1,effects:.8,voices:.7,glyphs:'PlayStation',cursor:15,assist:.7,rumble:true,tremor:true,shake:true,flashes:false,clinical:false,text:42};
let save;try{save=JSON.parse(localStorage.getItem('mercy-refrain-v1'));}catch{};
save={version:1,unlocked:0,continueCase:0,ranks:{},settings:{...DEFAULTS,...save?.settings},...save};save.settings={...DEFAULTS,...save.settings};
const settings=save.settings, sound=new Soundscape(settings);
let api,S,DATA,TITLE,ready=false,graphic=false,screen='title',from='title',device='keyboard',focus=0,caseChoice=0,difficulty=save.difficulty||0;
let sceneLines=[],lineIndex=0,typed=0,typeClock=0,storyAfter=null,storyAuto=false,backlog=false,holdAdvance=0,phaseSeen=-1,resultSeen=false;
let lastInput=performance.now(),lastFrame=performance.now(),elapsed=0,accumulator=0,attractTime=0,attractSegment=-1,seed=42;
let settingsPage=0,devPage=0,aboutSection=0,aboutPage=0,devLive=false,devOverlay=false,chartOpen=false,touchUnlocked=false,touchSettings=false;
let keys=new Set(),mouse=0,giftHeld=false,pointer=[-6,0],tool=1,rotate=0,padStates=new Map(),padSeats=new Map(),lastCues=0,toolSound=-1;
let render3D=true;let TUNE_DEFAULTS={};
let frameNumber=0,fps=0,fpsClock=0,fpsCount=0,bootError='',renderNeeded=true;
const stage=$('#stage'), ui=$('#ui'), markers=$('#markers'), canvas=$('#world');
let isTouch=matchMedia('(pointer: coarse)').matches&&!matchMedia('(any-pointer: fine)').matches;
const empty=()=>({active:false,aim:[0,0],tool:1,held:0,pressure:1,rotate:0,assisted:false,precision:false});
let inputs=Array.from({length:4},empty);
const dirs=['↑','↗','→','↘','↓','↙','←','↖'];
const names=['Scalpel','Forceps','Suture','Suction','Laser','Gel','Scanner','IV Push','Dressing'];
const toolDesc=[
 'Hold and follow the dashed line from its circle. Cut around a mass.',
 'Hold to grasp; pull along the arrow. Bone: drag to its outline, wheel / L1–R1 to rotate.',
 'Hold and zigzag across the seam near the mint needle. Keep moving along it.',
 'Hold over a pool. More trigger pressure drains faster.',
 'Hold to fill the heat ring. Release in the mint band, before it turns red.',
 'Hold and paint the inflamed area until the coverage ring closes.',
 'Hold and sweep to reveal hidden fragments and moving nodules.',
 'Hold to fill the dose. Release in the mint band. Four-second cooldown.',
 'Hold and trace the closure from the mint circle.'
];
const speakerName={Mara:'DR. MARA QUILL',Pet:'DR. PET NWOSU',Bashir:'BASHIR HADDAD',Teddy:'DR. TEDDY LARK',Voss:'CHIEF OTTOLINE VOSS',Vane:'CORDELIA VANE'};
const colors=['#e8443a','#3b82f6','#22c55e','#f5b700'];
function persist(){if(!H.active)try{localStorage.setItem('mercy-refrain-v1',JSON.stringify(save));}catch{}}
function state(){S=JSON.parse(api.state());return S;}
function command(c){if(!api)return;S=JSON.parse(api.command(JSON.stringify(c)));renderNeeded=true;}
function tune(values){command({type:'tune',values});}
function prompt(action){
 const pad=device==='pad',xbox=settings.glyphs==='Xbox';
 const map={confirm:['Enter',xbox?'A':'×','cross'],back:['Esc',xbox?'B':'○','circle'],gift:['Space',xbox?'Y':'△','triangle'],chart:['Tab',xbox?'X':'□','square'],use:['LMB / E',xbox?'RT':'R2'],precision:['Shift',xbox?'LT':'L2'],pause:['Esc','Options'],tools:['1–8','L stick'],shock:[device==='mouse'?'LMB + RMB':'Shift + E',xbox?'LT + RT':'L2 + R2'],next:['→',xbox?'RB':'R1'],previous:['←',xbox?'LB':'L1']};
 const v=map[action]||[action,action];return `<span class="key ${pad&&v[2]?'pad '+v[2]+'-glyph':''}">${esc(v[pad?1:0])}</span>`;
}
function icon(i){const paths=[
 '<path d="M45 5 25 38l-8 13 13-8 19-31Z"/><path d="m29 32 7 4"/>',
 '<path d="M35 4 20 48m15-44 12 43M20 48l7-5m20 4-7-5"/><path d="m31 19 9 1"/>',
 '<path d="M48 7 27 36m0 0c-14-12-22 10-10 13 14 5 17-17 7-10m-3 11c-1 6 21 4 31-5"/>',
 '<path d="m46 4-12 24-13 21m25-45 8 5-13 23-8-4"/><path d="M20 49c4 4 12 5 15 0"/>',
 '<path d="m44 5-15 28 10 6L53 11Zm-13 29-10 17m15-14-10 17"/><path d="m20 44-8-4m10 12-10 3"/>',
 '<path d="m34 8 16 8-12 25-16-8Zm-8 27-7 15 9-7m6-35 3-5 17 9-4 4"/>',
 '<circle cx="34" cy="21" r="13"/><path d="M29 15c7-6 16 4 9 10m-10 8L16 52m5-7 7 4"/>',
 '<path d="m39 5 16 9m-12-6-5 10m-5-2 14 8-13 23-14-8Zm-8 24-6 11m-5-1 10 6M29 27l5 3m-9 3 5 3"/>',
 '<path d="M11 17h45v29H11Zm6 6h33v17H17Z"/><path d="m22 27 4 7m4-7 4 7m4-7 4 7"/>'
 ];return `<svg class="tool-icon" viewBox="0 0 68 60" aria-hidden="true">${paths[i]}</svg>`;}
function heart(){return '<svg class="heart-icon" viewBox="0 0 64 64"><path d="M32 56 7 31C-8 12 18-4 32 13 46-4 72 12 57 31Z"/></svg>';}
function top(label='THE FIRST MOVEMENT'){return `<div class="topline"><div class="brand"><span class="cross"></span>MERCY HARBOR GENERAL <span style="color:#688e8d">/</span> NIGHT WARD</div><span>${label}</span></div>`;}
function bottom(extra=''){return `<div class="bottomline"><span>${prompt('confirm')} Select &nbsp; ${prompt('back')} Back</span><span>${extra||'EIGHT INSTRUMENTS. ONE HEARTBEAT.'}</span></div>`;}
function button(label,action,index=0,primary=false,extra=''){return `<button class="menu-button ${primary?'primary':''}" data-action="${action}" data-nav><span><span class="number">${String(index+1).padStart(2,'0')}</span>${label}</span><span class="arrow">${extra||'↗'}</span></button>`;}
function navigate(next){screen=next;focus=0;chartOpen=false;backlog=false;renderNeeded=true;draw();}
function activity(source='keyboard'){
 lastInput=performance.now();
 if(source==='keyboard'||source==='pad'){if(!touchUnlocked)renderNeeded=true;touchUnlocked=true;isTouch=false;}
 if(device!==source&&source!=='touch'){device=source;renderNeeded=true;}
 if(screen==='attract'){endAttract();return false;}
 if(!ready)return false;
 if(H.ended)return false;
 if(!H.server)sound.unlock();return true;
}
function loadCase(n,mode='operation'){
 api.load(n===8?'surgery/codeblue':`surgery/case/${n}`,seed++);state();tool=S.surgeons[0].tool;pointer=[-6,0];
 inputs=Array.from({length:4},empty);inputs[0]={...empty(),active:true,aim:pointer,tool};
 tune({cursor_speed:settings.cursor,assist:settings.assist,tremor:settings.tremor,clinical:settings.clinical});
 command({type:'difficulty',value:difficulty});phaseSeen=-1;lastCues=0;resultSeen=false;if(mode)navigate(mode);
}
function startStory(n,after=false){
 caseChoice=n;
 const lines=n===8?STORY.epilogue:(after?STORY.after[n]:STORY.before[n]);sceneLines=lines;lineIndex=0;typed=0;typeClock=0;
 storyAfter=()=>{if(n===8){navigate('title');}else if(after){if(n===7)startStory(8);else{save.continueCase=n+1;persist();startStory(n+1,false);}}else navigate('chart');};
 navigate('story');
}
function advanceStory(){if(backlog){backlog=false;draw();return;}const line=sceneLines[lineIndex];if(typed<line.text.length){typed=line.text.length;typeClock=typed;draw();return;}if(lineIndex+1<sceneLines.length){lineIndex++;typed=0;typeClock=0;draw();}else{storyAfter?.();}}
function skipStory(){typed=999;lineIndex=sceneLines.length-1;advanceStory();}
function startAttract(){
 if(H.active||!ready)return;screen='attract';attractTime=0;attractSegment=-1;attractUpdate(0);draw();
}
function endAttract(){loadCase(0,null);command({type:'mirror',state:{mode:'title'}});screen='title';lastInput=performance.now();focus=0;draw();}
function attractUpdate(dt){
 attractTime+=dt;const segment=Math.floor(attractTime/22)%6;if(segment!==attractSegment){attractSegment=segment;
  const entry=[[3,1],[4,0],[5,1],[7,5],[8,0],[3,0]][segment];loadCase(entry[0],null);command({type:'phase',phase:entry[1]});tune({immortal:true,freeze:true,bot:true});command({type:'gift'});
  if(segment===4){const ss=S.surgeons.map((s,i)=>({...s,active:true,ghost:false,cursor:[(i-1.5)*2,0]}));command({type:'mirror',state:{surgeons:ss}});}
  screen='attract';if(segment===5){sceneLines=STORY.before[3];lineIndex=0;typed=999;}draw();
 }
 if(segment===5){const i=Math.floor((attractTime%22)/5)%sceneLines.length;if(i!==lineIndex){lineIndex=i;typed=999;draw();}}
}
function currentTool(i=tool){return (S?.case===6&&i===4)||(S?.case===7&&i===6)?'Cryoprobe':names[i];}
function currentHelp(i=tool){if(currentTool(i)==='Cryoprobe')return 'Hold on an ember until the frost ring closes. Release, crack with Scalpel, then extract.';return toolDesc[i];}
function chartData(){return DATA.cases[caseChoice]||DATA.cases[0];}
function draw(){
 if(!ready)return;renderNeeded=false;
 if(H.server){ui.innerHTML='';markers.innerHTML='';return;}
 document.body.classList.toggle('touch-settings',touchSettings);
 stage.classList.toggle('operating',['operation','attract','dev'].includes(screen));
 $('#scene-wash').style.opacity=['operation','attract','dev','story'].includes(screen)?0:1;
 $('#touch-note').hidden=!(isTouch&&!touchUnlocked&&!touchSettings&&!H.active&&screen!=='attract');
 if(screen!=='operation'&&screen!=='attract'&&screen!=='dev')markers.innerHTML='';
 let html='';
 if(screen==='title'||screen==='menu'){
  html=top()+`<div class="title-block ${screen==='menu'?'menu-screen':''}"><div class="title-over">A SURGICAL ACTION DRAMA</div><h1>${esc(TITLE.split(':')[0].split(' ')[0].toUpperCase())}<span>${esc(TITLE.split(':')[0].split(' ').slice(1).join(' ').toUpperCase())}</span></h1><div class="title-sub">${esc(TITLE.split(':').slice(1).join(':').trim())}</div><svg class="title-line" viewBox="0 0 740 45"><path d="M0 25H170l12-6 11 10 12-25 11 39 13-18H740" fill="none" stroke="#9aebcb" stroke-width="2"/></svg><p class="title-tag">Eight instruments. One heartbeat.</p><nav class="title-menu">${screen==='title'?button('Enter the Night Ward','main',0,true):`${button(save.unlocked?'Continue the night':'Begin your shift',save.unlocked?'continue':'new',0,true)}${save.unlocked?button('New game','new',1):''}${button('Case files','casefiles',save.unlocked?2:1)}${button('Code Blue <span class="sub"> / 1–4 surgeons</span>','codeblue',save.unlocked?3:2)}${button('Settings','settings',save.unlocked?4:3)}${button('About this game','about',save.unlocked?5:4)}`}</nav></div><div class="specimen-label">PORT VERITY • 03:17<strong>THE FIRST MOVEMENT</strong>MERCY HARBOR / OPERATING THEATRE 03</div><div class="specimen-circle"></div><div class="specimen-bottom">R.E.Q.U.I.E.M.<br><span style="color:var(--muted);font-size:23px">THE ONLY ORGANISM ENGINEERED TO KEEP TIME</span></div>${bottom('LOCAL CO-OP: ANOTHER CONTROLLER CAN JOIN WITH '+prompt('confirm'))}`;
 } else if(screen==='difficulty'){
 html=top()+`<section class="panel-shell narrow"><div class="eyebrow">A NEW NIGHT</div><h2>Choose your responsibility.</h2><p class="lead">Your hands make the difference. The heartbeat will tell you when you are falling behind.</p><div class="menu">${button('Resident <span class="sub"> / gentler vitals · 2 recoveries</span>','difficulty:0',0,true)}${button('Attending <span class="sub"> / full pressure · 1 recovery</span>','difficulty:1',1)}${button('Chief <span class="sub"> / no second chances</span>','difficulty:2',2)}</div><div class="panel-footer"><span>All eight instruments. The complete first movement.</span><button class="flat-button" data-action="back" data-nav>${prompt('back')} Back</button></div></section>`;
 } else if(screen==='story'||screen==='attract'&&attractSegment===5){
  const line=sceneLines[lineIndex];if(!line)return;
  html=`<div class="story-top"><span>MERCY HARBOR • ${esc(line.set.toUpperCase())}</span><span>${lineIndex+1} / ${sceneLines.length}</span></div><div class="story-caption">${esc(caseChoice===8?'A first movement.':DATA.cases[caseChoice]?.name||'The First Movement')}</div><div class="story-actions"><button class="flat-button" data-action="auto" data-nav>Auto ${storyAuto?'ON':'OFF'}</button><button class="flat-button" data-action="backlog" data-nav>Backlog</button><button class="flat-button" data-action="skipstory" data-nav>Skip scene</button></div><div class="story-box" data-action="advance"><div class="story-name">${esc(speakerName[line.who]||line.who)}</div><div class="story-text">${esc(line.text.slice(0,Math.floor(typed)))}</div><div class="story-advance"><span>Hold ${prompt('confirm')} to skip</span><button class="flat-button" data-action="advance" data-nav>${prompt('confirm')} Continue →</button></div></div>`;
  if(backlog)html+=`<div class="overlay-dim"></div><div class="backlog">${sceneLines.slice(Math.max(0,lineIndex-5),lineIndex+1).map(l=>`<p><b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('')}<button class="flat-button" data-action="backlog" data-nav>Close backlog</button></div>`;
 } else if(screen==='chart'||screen==='casefiles'){
  const c=chartData(),locked=screen==='casefiles'&&caseChoice>save.unlocked;
  html=top('PATIENT RECORDS')+`<section class="panel-shell center chart patient-chart ${locked?'locked':''}"><div class="chart-head"><div class="eyebrow">CASE FILE ${String(caseChoice).padStart(2,'0')} / ${screen==='chart'?'PRE-OP BRIEFING':locked?'SEALED':'AVAILABLE'}</div><span class="case-number">${String(caseChoice).padStart(2,'0')}</span></div><h2>${esc(c.name)}</h2><div class="case-patient">${esc(c.patient)}</div><p class="patient-line">${esc(c.life)}</p><div class="rule"></div><div class="case-detail"><b>Diagnosis</b> &nbsp; ${esc(c.diagnosis)}<br><b>Surgeon</b> &nbsp; ${esc(c.surgeon)} &nbsp; / &nbsp; <b>Limit</b> &nbsp; ${formatTime(c.timer)}</div><div class="rank-small" style="margin-top:25px">${save.ranks[caseChoice]?'BEST RANK · '+esc(save.ranks[caseChoice]):'THE PATIENT IS WAITING.'}</div><div class="menu">${locked?'':button(screen==='chart'?'Scrub in':'Open this case','scrubin',0,true)}</div><div class="panel-footer">${screen==='casefiles'?`<div class="case-nav"><button class="flat-button" data-action="caseprev" data-nav>← Previous</button><span>${caseChoice+1} / 8</span><button class="flat-button" data-action="casenext" data-nav>Next →</button></div>`:'<span>Listen. Count. Keep them alive.</span>'}<button class="flat-button" data-action="title" data-nav>Back</button></div></section>`;
 } else if(['operation','attract','dev'].includes(screen)){
  html=operationHTML();
  if(screen==='dev')html+=devHTML();
  if(screen==='attract')html+=`<div class="attract-badge">DEMONSTRATION</div><div class="attract-footer">THE FIRST MOVEMENT &nbsp; / &nbsp; Any input returns to the title</div>`;
 } else if(screen==='pause'){
  html=operationHTML()+`<div class="overlay-dim"></div><section class="panel-shell center"><div class="eyebrow">THEATRE ON HOLD</div><h2>Take a breath.</h2><nav class="menu">${button('Resume','resume',0,true)}${button('Restart this phase','retry',1)}${button('Controls','controls',2)}${button('Settings','settings',3)}${button('Dev mode','dev',4)}${button('Quit to title','title',5)}</nav></section>`;
 } else if(screen==='controls'){
  html=top()+`<section class="panel-shell center"><div class="eyebrow">THE HANDS</div><h2>Eight instruments. All yours.</h2><div class="help-grid"><div class="help-item">${prompt('tools')} Select a tool<small>Flick left stick / digits / mouse wheel.</small></div><div class="help-item">${prompt('use')} Operate<small>Right stick, mouse, WASD or arrows aim.</small></div><div class="help-item">${prompt('precision')} Precision<small>Slow the cursor. Quiet Pet's tremor.</small></div><div class="help-item">${prompt('gift')} Hush / Echo / Duet<small>Hold, then release on a heartbeat.</small></div><div class="help-item">${prompt('shock')} Defibrillate<small>During Code: charge, release on the beat.</small></div><div class="help-item">${prompt('chart')} Patient chart<small>See the active objective and instruments.</small></div><div class="help-item">${prompt('back')} Pause / cancel<small>Right click or Q releases an instrument.</small></div><div class="help-item">Co-op · up to four surgeons<small>Additional pads join with ${prompt('confirm')}.</small></div></div><p class="lead">Scalpel: trace. Forceps: pull. Suture: zigzag. Laser: release in the mint band. Suction and Gel: hold. Scanner: sweep. IV: dose, then release.</p><div class="panel-footer"><span>Every finished technique can land on the heartbeat for a bonus.</span><button class="flat-button" data-action="back" data-nav>Back</button></div></section>`;
 } else if(screen==='settings')html=settingsHTML();
 else if(screen==='about')html=aboutHTML();
 else if(screen==='results')html=resultsHTML();
 else if(screen==='dead'){
  html=top('TIME OF DEATH')+`<section class="panel-shell narrow"><div class="eyebrow" style="color:var(--red)">THE ROOM GOES QUIET</div><h2>One more pair of hands.</h2><p class="fail-time">Time of death: 03:42.</p><p class="lead">${S.remaining<=0?'The operating window closed.':'The heartbeat slipped beyond your reach.'} A checkpoint is waiting at the start of this phase.</p><nav class="menu">${button('Retry this phase','retry',0,true)}${button('Restart the case','restart',1)}${button('Return to title','title',2)}</nav></section>`;
 } else if(screen==='hubcard'||screen==='countdown'||screen==='hubend')html=hubHTML();
 if(screen==='attract'&&attractSegment===5)html+='<div class="attract-badge">DEMONSTRATION</div><div class="attract-footer">THE FIRST MOVEMENT / Any input returns to the title</div>';
 ui.innerHTML=html;bindUI();resize();if(chartOpen)drawChart();
}
function formatTime(n){n=Math.max(0,Math.ceil(n));return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;}
function operationHTML(){
 const s=S.surgeons[H.active&&!H.server?H.me:0]||S.surgeons[0];const c=DATA.cases[S.case],p=c.phases[S.phase];
 return `<div class="op-top"><div class="vitals-wrap">${heart()}<div><div class="vitals-main" id="vitals-number">${Math.ceil(S.vitals)}<span>VITAL SIGNS</span></div><div class="vitals-bar"><i id="vitals-bar" style="width:${S.vitals}%"></i></div></div></div><div class="ecg-wrap"><svg viewBox="0 0 1000 84" preserveAspectRatio="none"><path id="ecg-path" d="" fill="none" stroke="#9aebcb" stroke-width="2.5"/></svg><div class="ecg-info" id="bpm">${Math.round(S.bpm)} BPM / ${p.strain||'SINUS'}</div></div><div class="op-clock"><span id="clock">${formatTime(S.remaining)}</span><span class="micro">TIME REMAINING</span></div></div><div class="now"><span class="micro" id="phase-label">NOW / ${esc(p.name)}</span><p id="objective">${esc(S.blue?'Triage the field. Keep the patient alive until the shift ends.':p.objective)}</p></div><div class="op-case"><div class="patient">${esc(S.blue?'Code Blue / Mercy Harbor':c.patient)}</div><div class="case-name">${S.blue?'ENDLESS TRIAGE':`CASE ${String(S.case).padStart(2,'0')} / ${esc(c.name)}`}</div></div><div class="tool-help"><strong id="selected-name">${esc(currentTool(s.tool))}</strong><span id="selected-help">${esc(currentHelp(s.tool))}</span></div><div class="op-tools">${Array.from({length:S.hazards.some(h=>h.alive&&h.kind==='dressing')?9:8},(_,i)=>`<button class="tool-button ${s.tool===i?'selected':''}" data-action="tool:${i}" title="${esc(currentTool(i))}"><span class="tool-key">${device==='pad'?dirs[i]||'':i+1}</span>${icon(i)}<span class="tool-name">${esc(currentTool(i))}</span></button>`).join('')}</div><button class="gift-button ${s.gift>=35?'ready':''}" data-action="gift" id="gift-button">${prompt('gift')} <span id="gift-name">${S.case===7?'Duet':S.case>=5?'Echo':'Hush'}</span><span class="micro" id="gift-label">${S.gift_left>0?S.gift_left.toFixed(1)+' S':Math.round(s.gift)+'% · RELEASE ON THE BEAT'}</span><div class="gift-meter"><i id="gift-meter" style="width:${s.gift}%"></i></div></button><div class="op-bottom"><div class="callout"><span class="speaker-tag">${S.case===7?'TEDDY':'BASHIR'}</span><span id="callout">${esc(S.callout)}</span></div><button class="op-controls" data-action="pause">${prompt('chart')} Chart &nbsp; ${prompt('pause')} Pause</button></div><div id="banner-holder"></div><div id="code-holder"></div>`;
}
function resultsHTML(){
 const c=DATA.cases[S.case],base=S.surgeons.reduce((a,s)=>a+s.score,0),total=base+S.vitals*20+Math.max(0,S.remaining)*5-S.mistakes*100;const rank=rankFor(total,c.par);
 return top('OPERATION COMPLETE')+`<section class="panel-shell center chart result-sheet"><div class="eyebrow">MERCY HARBOR GENERAL / OUTCOME RECORD</div><h2>One life. Still here.</h2><p class="case-patient">${esc(c.patient)}</p><div class="result-grid"><div class="score-lines"><div class="score-line"><span>Technique</span><span>${Math.round(base).toLocaleString()}</span></div><div class="score-line"><span>Vitals ${Math.ceil(S.vitals)} × 20</span><span>+${Math.round(S.vitals*20)}</span></div><div class="score-line"><span>Time remaining</span><span>+${Math.round(Math.max(0,S.remaining)*5)}</span></div><div class="score-line"><span>Errors ${S.mistakes} × −100</span><span>−${S.mistakes*100}</span></div><div class="score-line total"><span>Total</span><span>${Math.round(total).toLocaleString()}</span></div></div><div><div class="rank-stamp ${rank==='ENCORE'?'encore':''}">${rank}</div><div style="text-align:center;margin-top:30px;font-size:27px">BEST CHAIN · ${Math.max(...S.surgeons.map(s=>s.best_chain))}</div></div></div><p class="fate">${esc(c.fate)}</p><nav class="menu">${button('Leave the theatre','afterstory',0,true)}</nav></section>`;
}
function rankFor(total,par){let q=total/par;return q>=1.15?'ENCORE':q>=1?'S':q>=.85?'A':q>=.7?'B':'C';}
function settingsHTML(){
 const pages=['Sound','Controls','Display'];let rows='';
 if(settingsPage===0)rows=slider('music','Music',0,1,.01,'A pulse under the room. Default 10%.')+slider('effects','Effects',0,1,.01,'Instruments, monitors and the heartbeat.')+slider('voices','Voices',0,1,.01,'Synthesized character syllables.');
 if(settingsPage===1)rows=toggle('glyphs','Button prompts','PlayStation or Xbox glyphs.')+slider('cursor','Cursor speed',5,25,.5,'Stick and keyboard. Mouse stays absolute.')+slider('assist','Aim assist',0,1,.05,'Stick and keyboard only.')+toggle('rumble','Controller rumble')+toggle('tremor',"Pet’s tremor");
 if(settingsPage===2)rows=toggle('shake','Screen shake')+toggle('flashes','Reduce flashes')+toggle('clinical','Clinical palette','Blue-grey tissue replaces the anatomical colours.')+slider('text','Text speed',15,90,1,'Letters per second.')+`<div class="setting-row"><label>Fullscreen</label><button class="switch" data-action="fullscreen" data-nav>Toggle</button></div>`;
 return top('PERSONAL SETTINGS')+`<section class="panel-shell center"><div class="eyebrow">MAKE THE ROOM YOURS</div><h2>Settings</h2><div class="tabs">${pages.map((x,i)=>`<button class="${i===settingsPage?'active':''}" data-action="settingstab:${i}">${x}</button>`).join('')}</div><div class="setting-rows">${rows}</div><div class="panel-footer"><button class="flat-button" data-action="resetsettings" data-nav>Restore defaults</button><button class="flat-button" data-action="back" data-nav>${prompt('back')} Back</button></div></section>`;
}
function slider(key,label,min,max,step,detail='',dev=false){const val=dev?S.tune[key]:settings[key];const display=key==='music'||key==='effects'||key==='voices'||key==='assist'?Math.round(val*100)+'%':Number(val).toFixed(step<1?2:0);return `<div class="setting-row" data-slider-row="${key}" data-nav><label for="s-${key}">${label}${detail?`<small>${detail}</small>`:''}</label><input id="s-${key}" aria-label="${label}" data-${dev?'tune':'setting'}="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"><output>${display}</output></div>`;}
function toggle(key,label,detail=''){const v=settings[key],on=key==='glyphs'?v==='PlayStation':!!v;return `<div class="setting-row"><label>${label}${detail?`<small>${detail}</small>`:''}</label><button class="switch ${on?'on':''}" data-action="setting:${key}" data-nav>${key==='glyphs'?esc(v):v?'On':'Off'}</button></div>`;}
const devSliders=[['drain','Vitals drain ×',0,3,.05],['timer','Time allowance ×',.25,3,.05],['power','Tool power ×',.25,3,.05],['heal','IV heal ×',.25,3,.05],['strain_speed','Strain speed ×',.25,2,.05],['toughness','Strain toughness ×',.25,3,.05],['heart_coupling','Heart coupling',0,2,.05],['beat_window','On-beat window (ms)',30,250,5],['cursor_speed','Cursor speed',5,25,.5],['assist','Aim assist',0,1,.05],['gift_gain','Gift gain ×',0,4,.1],['gift_duration','Gift duration ×',.25,3,.05],['hush_scale','Hush time scale',.1,1,.05],['echo_duration','Echo duration (s)',2,25,1],['chain_window','Chain window (s)',3,40,1],['strictness','Rating strictness',.5,1.5,.05],['wrong_penalty','Error penalty ×',0,3,.1],['code_window','Code window (s)',3,20,1],['score','Score multiplier',.25,3,.05],['time_scale','World time scale',.1,2,.05]];
function devHTML(){
 let inner='';if(devPage<4){inner=`<div class="dev-rows">${devSliders.slice(devPage*5,devPage*5+5).map(x=>slider(...x,`Default: ${TUNE_DEFAULTS[x[0]]}`,true)).join('')}</div>`;}else if(devPage===4){inner=`<div class="dev-tools">${[['immortal','Immortal patient'],['freeze','Freeze timer'],['one_hit','One-hit strains']].map(([k,l])=>`<button data-action="devtoggle:${k}" data-nav>${l} · ${S.tune[k]?'ON':'OFF'}</button>`).join('')}${[['gift','Fill gift'],['skip','Skip phase'],['win','Win case'],['code','Force Code'],['kill','Kill patient'],['snapshot','Save snapshot'],['restore','Load snapshot'],['rewind','Rewind 5 s']].map(([a,l])=>`<button data-action="devcmd:${a}" data-nav>${l}</button>`).join('')}<button data-action="step" data-nav>Step one tick</button></div>`;}else if(devPage===5){inner=`<div class="dev-tools">${DATA.cases.map((c,i)=>`<button data-action="devcase:${i}" data-nav>${i} · ${esc(c.name)}</button>`).join('')}${S.data?'':''}<button data-action="prevphase" data-nav>← Previous phase</button><button data-action="nextphase" data-nav>Next phase →</button></div>`;}else{inner=`<div class="dev-tools">${['incision','laceration','bleeder','pool','hook','shard','polyp','tumor','burn','inflammation','bone','nodule','sac','ember','tendril'].slice((devPage-6)*8,(devPage-5)*8).map(k=>`<button data-action="spawn:${k}" data-nav>${k}</button>`).join('')}<button data-action="overlays" data-nav>Target overlays · ${devOverlay?'ON':'OFF'}</button></div>`;}
 return `<div class="dev-stats">PAVILION / 60 HZ<br>Tick ${S.tick}<br>${fps.toFixed(1)} render fps<br>Phase ${S.phase} / ${esc(DATA.cases[S.case].phases[S.phase].name)}</div><section class="panel-shell" style="left:45px;right:auto;top:180px;bottom:80px;width:1160px;background:#08232bed;padding:30px 38px;border:1px solid var(--line)"><div class="eyebrow">LIVE THEATRE TOOLS</div><h2 style="font-size:58px">Dev mode <span style="font-size:28px;color:var(--muted)">${devPage+1} / 8</span></h2><div class="dev-bar"><button class="flat-button" data-action="devlive" data-nav>Live · ${devLive?'ON':'OFF'}</button><button class="flat-button" data-action="devtoggle:bot" data-nav>Bot · ${S.tune.bot?'ON':'OFF'}</button><button class="flat-button" data-action="devreset" data-nav>Reset All</button></div>${inner}<div class="panel-footer"><button class="flat-button" data-action="devprev" data-nav>← Page</button><button class="flat-button" data-action="devnext" data-nav>Page →</button><button class="flat-button" data-action="resume" data-nav>Back to operation</button></div></section>`;
}
const sourceKeys=['date','source','plan','genre','perspective','tech','artDirection','animation','audio','online','testing','research','environment','model','usage'];
const questions=[[],[],['How many issues did testing catch?','How many were critical or game breaking?','Most helpful test','Least helpful test'],['What did you like most about the engine?','Did you get stuck or guess wrong?','Most important thing you built yourself','Hardest part about using the engine','Engine changes and why','One change you would make to the engine'],['What did you like most about this prompt?','What was confusing?','Hardest thing to do','What would you change?']];
function aboutHTML(){
 const sections=['Credits','Source Information','Testing Feedback','Engine Feedback','Prompt Feedback'];let title,copy,count;
 if(aboutSection===0){count=3;title=['An original First Movement','Pavilion / Barlow','Made of code'][aboutPage%3];copy=[`${TITLE}. Original world, characters, dialogue, game design, procedural medical illustrations, 3D instruments, animation, synthesized music, effects and voices created for this demo.`, 'Pavilion engine by Michael Crosato. Engine licence: unknown (none supplied in the checkout). Based on engine commit 49ef2ba. Barlow Condensed Semibold by Jeremy Tribby, SIL Open Font License 1.1. AI Hub Session client 1.4.0, unmodified.','No recorded music, speech, images or model files. All tissue, surgical tools, parasite strains and extruded paper actors are generated in code. Usage: added on import.'][aboutPage%3];}
 else if(aboutSection===1){count=sourceKeys.length;const key=sourceKeys[aboutPage%count];title=key.replace(/([A-Z])/g,' $1');copy=ABOUT.sourceInformation[key];}
 else {const arr=[null,null,ABOUT.testingFeedback,ABOUT.engineFeedback,ABOUT.promptFeedback][aboutSection];count=arr.length;title=questions[aboutSection][aboutPage%count];copy=arr[aboutPage%count];}
 return top('ABOUT / CREDITS')+`<section class="panel-shell center"><div class="eyebrow">${esc(TITLE)}</div><h2>${sections[aboutSection]}</h2><div class="tabs">${sections.map((s,i)=>`<button style="padding:12px 17px;font-size:27px" class="${aboutSection===i?'active':''}" data-action="aboutsection:${i}">${s}</button>`).join('')}</div><div class="about-label">${sections[aboutSection]} / ${aboutPage+1}</div><div class="about-question">${esc(title)}</div><p class="about-copy">${esc(copy)}</p><div class="panel-footer"><div class="about-pages"><button class="flat-button" data-action="aboutprev" data-nav>← Previous</button><span>${aboutPage+1} / ${count}</span><button class="flat-button" data-action="aboutnext:${count}" data-nav>Next →</button></div><button class="flat-button" data-action="back" data-nav>Back</button></div></section>`;
}
function bindUI(){
 const items=$$('[data-nav]');focus=Math.min(focus,items.length-1);items[focus]?.classList.add('focused');
 $$('[data-action]').forEach(el=>{
   el.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;const i=items.indexOf(el);if(i>=0){focus=i;items.forEach(x=>x.classList.remove('focused'));el.classList.add('focused');}});
   if(el.dataset.action==='gift'){el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(activity('mouse'))giftHeld=true;});el.addEventListener('pointerup',()=>giftHeld=false);return;}
   el.addEventListener('click',e=>{e.stopPropagation();if(!activity(e.pointerType==='touch'?'touch':'mouse'))return;act(el.dataset.action);});
 });
 $$('input[data-setting],input[data-tune]').forEach(el=>el.addEventListener('input',e=>{if(e.isTrusted)activity('mouse');const key=el.dataset.setting||el.dataset.tune,val=Number(el.value);if(el.dataset.tune)tune({[key]:val});else{settings[key]=val;applySettings();}el.nextElementSibling.textContent=key==='music'||key==='effects'||key==='voices'||key==='assist'?Math.round(val*100)+'%':val.toFixed(Number(el.step)<1?2:0);}));
}
function applySettings(){sound.apply();tune({cursor_speed:settings.cursor,assist:settings.assist,tremor:settings.tremor,clinical:settings.clinical});persist();renderNeeded=true;}
function menuMove(dir){const items=$$('[data-nav]');if(!items.length)return;focus=(focus+dir+items.length)%items.length;items.forEach((x,i)=>x.classList.toggle('focused',i===focus));sound.cue('nav');}
function menuAdjust(dir){const el=$$('[data-nav]')[focus],range=el?.querySelector('input[type=range]');if(range){range.value=Number(range.value)+dir*Number(range.step);range.dispatchEvent(new Event('input'));return;}
 if(screen==='settings'){settingsPage=(settingsPage+dir+3)%3;focus=0;draw();}else if(screen==='casefiles'){caseChoice=(caseChoice+dir+8)%8;draw();}else if(screen==='about'){act(dir>0?$$('[data-action^="aboutnext"]')[0].dataset.action:'aboutprev');}else if(screen==='dev'){devPage=(devPage+dir+8)%8;focus=0;draw();}}
function confirmMenu(){const el=$$('[data-nav]')[focus];if(el?.dataset.action)act(el.dataset.action);}
function back(){if(H.active)return;if(screen==='operation'){navigate('pause');return;}if(screen==='pause'){navigate('operation');return;}if(screen==='story'){backlog=!backlog;draw();return;}if(screen==='dev'){navigate('pause');return;}if(['settings','about','controls'].includes(screen)){if(touchSettings){touchSettings=false;navigate('title');}else navigate(from==='pause'?'pause':'title');return;}navigate('title');}
function act(a){
 if(!ready||H.ended)return;
 if(H.active){if(a==='hubready'){AIHub.answer('ready');sound.unlock();}else if(a==='hubmore')AIHub.answer('more');return;}
 sound.cue(a==='back'?'back':'select');
 const [key,val]=a.split(':');
 switch(key){
 case 'main':navigate('menu');break;
 case 'new':navigate('difficulty');break;
 case 'continue':caseChoice=save.continueCase;startStory(caseChoice);break;
 case 'difficulty':difficulty=Number(val);save.difficulty=difficulty;caseChoice=0;save.continueCase=0;persist();startStory(0);break;
 case 'casefiles':caseChoice=Math.min(save.continueCase,7);navigate('casefiles');break;
 case 'caseprev':caseChoice=(caseChoice+7)%8;draw();break;case 'casenext':caseChoice=(caseChoice+1)%8;draw();break;
 case 'scrubin':loadCase(caseChoice);break;
 case 'codeblue':caseChoice=8;loadCase(8);break;
 case 'settings':from=screen==='pause'?'pause':from==='pause'&&screen==='controls'?'pause':'title';settingsPage=0;navigate('settings');break;
 case 'about':from='title';aboutSection=0;aboutPage=0;navigate('about');break;
 case 'controls':from=screen==='pause'?'pause':'title';navigate('controls');break;
 case 'title':loadCase(0,null);command({type:'mirror',state:{mode:'title'}});navigate('title');break;
 case 'back':back();break;case 'pause':if(screen==='operation')navigate('pause');break;case 'resume':navigate('operation');break;
 case 'retry':command({type:'retry',checkpoint:true});tool=S.surgeons[0].tool;navigate('operation');break;
 case 'restart':loadCase(S.case);break;
 case 'dev':devPage=0;devLive=false;navigate('dev');break;
 case 'tool':tool=Number(val);sound.cue('tool',tool);renderNeeded=true;break;
 case 'gift':giftHeld=true;break;
 case 'advance':advanceStory();break;case 'auto':storyAuto=!storyAuto;draw();break;case 'backlog':backlog=!backlog;draw();break;case 'skipstory':skipStory();break;
 case 'afterstory':caseChoice=S.case;startStory(S.case,true);break;
 case 'settingstab':settingsPage=Number(val);focus=0;draw();break;
 case 'setting':settings[val]=val==='glyphs'?(settings.glyphs==='Xbox'?'PlayStation':'Xbox'):!settings[val];applySettings();draw();break;
 case 'fullscreen':if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});break;
 case 'resetsettings':Object.assign(settings,DEFAULTS);applySettings();draw();break;
 case 'devprev':devPage=(devPage+7)%8;focus=0;draw();break;case 'devnext':devPage=(devPage+1)%8;focus=0;draw();break;
 case 'devlive':devLive=!devLive;draw();break;case 'devtoggle':tune({[val]:!S.tune[val]});draw();break;
 case 'devcmd':command({type:val});if(val==='win')navigate('results');else if(val==='kill')navigate('dead');else draw();break;
 case 'devreset':command({type:'defaults'});draw();break;
 case 'devcase':loadCase(Number(val),null);screen='dev';draw();break;
 case 'prevphase':command({type:'phase',phase:Math.max(0,S.phase-1)});draw();break;
 case 'nextphase':command({type:'phase',phase:S.phase+1});draw();break;
 case 'step':S=JSON.parse(api.step(JSON.stringify(inputs),1,S.tune.bot));draw();break;
 case 'spawn':command({type:'spawn',kind:val});draw();break;
 case 'overlays':devOverlay=!devOverlay;draw();break;
 case 'aboutsection':aboutSection=Number(val);aboutPage=0;draw();break;
 case 'aboutprev':aboutPage=Math.max(0,aboutPage-1);draw();break;
 case 'aboutnext':aboutPage=(aboutPage+1)%Number(val);draw();break;
 }
}
function resize(){
 const scale=Math.min(innerWidth/1920,innerHeight/1080);stage.style.transform=`scale(${scale})`;
 const width=Math.max(320,Math.min(1600,Math.round(1920*scale*(devicePixelRatio>1?1.25:1))));
 if(canvas.width!==width){canvas.width=width;canvas.height=Math.round(width*9/16);}
}
addEventListener('resize',resize);resize();
function stagePoint(e){const r=stage.getBoundingClientRect();return [(e.clientX-r.left)*1920/r.width,(e.clientY-r.top)*1080/r.height];}
function selectTool(value){tool=(value+8)%8;if(toolSound!==tool){toolSound=tool;sound.cue('tool',tool);}renderNeeded=true;}
addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab','Backspace'].includes(e.key))e.preventDefault();
 if(!activity('keyboard'))return;
 const k=e.key.toLowerCase();keys.add(k);if(e.repeat)return;
 if(H.active&&['hubcard','countdown'].includes(screen)){if(k==='enter')AIHub.answer('ready');if(k==='m')AIHub.answer('more');return;}
 if(H.ended)return;
 if(['operation','dev'].includes(screen)){
  if(/^[1-8]$/.test(k)){selectTool(Number(k)-1);return;}
  if(k==='tab'){chartOpen=!chartOpen;draw();return;}
  if(k==='escape'&&!H.active){back();return;}
  if(screen==='operation')return;
 }
 if(k==='escape'){back();return;}
 if(screen==='story'){
  if(k==='enter'||k===' '){advanceStory();holdAdvance=0;}
  else if(k==='a'){storyAuto=!storyAuto;draw();}else if(k==='b'){backlog=!backlog;draw();}return;
 }
 if(k==='arrowdown'||k==='s')menuMove(1);else if(k==='arrowup'||k==='w')menuMove(-1);
 else if(k==='arrowright'||k==='d')menuAdjust(1);else if(k==='arrowleft'||k==='a')menuAdjust(-1);
 else if(k==='enter'||k===' ')confirmMenu();
});
addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());holdAdvance=0;});
addEventListener('blur',()=>{keys.clear();mouse=0;giftHeld=false;inputs.forEach(i=>i.held=0);if(screen==='operation'&&!H.active)navigate('pause');});
addEventListener('pointermove',e=>{
 if(e.pointerType==='touch')return;if(!activity('mouse'))return;
 if(ready&&['operation','dev'].includes(screen)&&e.target.closest('#stage')&&!e.target.closest('button,input')){const p=stagePoint(e);pointer=JSON.parse(api.aim(...p));}
});
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'){activity('touch');return;}
 if(!activity('mouse'))return;if(screen!=='operation')return;
 e.preventDefault();mouse=e.buttons;const p=stagePoint(e);pointer=JSON.parse(api.aim(...p));canvas.setPointerCapture?.(e.pointerId);
});
addEventListener('pointerdown',e=>{if(screen==='attract')activity(e.pointerType==='touch'?'touch':'mouse');},true);
addEventListener('pointerup',e=>{giftHeld=false;if(e.pointerType!=='touch')mouse=e.buttons;});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('wheel',e=>{
 if(!['operation','dev'].includes(screen))return;e.preventDefault();if(!activity('mouse'))return;
 if(S.surgeons[H.active?H.me:0]?.grabbed && S.hazards.some(h=>h.kind==='bone'&&h.alive)){rotate+=Math.sign(e.deltaY)*6;}else selectTool(tool+Math.sign(e.deltaY));
},{passive:false});
$('#touch-settings').onclick=()=>{lastInput=performance.now();touchSettings=true;from='title';navigate('settings');sound.unlock();};

function pollPads(dt){
 const pads=navigator.getGamepads?.()||[];
 const present=new Set([...pads].filter(Boolean).map(p=>p.index));for(const [index,seat] of padSeats){if(!present.has(index)){padSeats.delete(index);if(inputs[seat])inputs[seat]=empty();if(ready&&S.surgeons[seat]){const ss=S.surgeons.map((s,i)=>i===seat?{...s,active:false,held:0}:s);command({type:'mirror',state:{surgeons:ss}});}}}
 for(const pad of pads){if(!pad)continue;
  const old=padStates.get(pad.index)||{buttons:[],nav:0,signature:''};
  const buttons=pad.buttons.map(b=>b.pressed||b.value>.35),pressed=i=>buttons[i]&&!old.buttons[i],axis=pad.axes;
  const signature=buttons.map(x=>+x).join('')+axis.map(v=>Math.round(v*10)).join(',');
  const moving=axis.some(v=>Math.abs(v)>.18),changed=signature!==old.signature&&(buttons.some(Boolean)||moving);
  if(changed){if(!activity('pad')){padStates.set(pad.index,{buttons,nav:0,signature});continue;}}
  if(!padSeats.has(pad.index)&&pressed(0)){
   const used=[...padSeats.values()];let seat=H.active?H.me:!used.includes(0)?0:[1,2,3].find(i=>!used.includes(i));
   if(seat!==undefined){padSeats.set(pad.index,seat);if(inputs[seat])inputs[seat].active=true;}
  }
  let seat=padSeats.get(pad.index);
  if(seat===undefined && pad.index===0){seat=H.active?H.me:0;padSeats.set(pad.index,seat);}
  if(['hubcard','countdown'].includes(screen)&&H.active){if(pressed(0))AIHub.answer('ready');if(pressed(3))AIHub.answer('more');}
  else if(['operation','dev','attract'].includes(screen)){
   if(pressed(9)&&!buttons[8]&&!H.active){navigate('pause');}
   if(pressed(2)&&screen==='operation'){chartOpen=!chartOpen;draw();}
   if(seat!==undefined && inputs[seat] && screen!=='attract' && (device==='pad'||seat!==(H.active?H.me:0))){
    const s=S.surgeons[seat],input=inputs[seat];input.active=true;input.assisted=true;input.precision=buttons[6];
    let dx=axis[2]||0,dz=axis[3]||0,len=Math.hypot(dx,dz);
    if(len>.12){const v=settings.cursor*len**2.2*dt*(buttons[6]?.35:1);const base=H.active&&!H.isHost?input.aim:s.cursor;input.aim=[Math.max(-9,Math.min(9,base[0]+dx/len*v)),Math.max(-4,Math.min(4.1,base[1]+dz/len*v))];}
    else if(!(H.active&&!H.isHost))input.aim=[...s.cursor];
    const lx=axis[0]||0,lz=axis[1]||0;if(Math.hypot(lx,lz)>.55){input.tool=(Math.round(Math.atan2(lx,-lz)/(Math.PI*2)*8)+8)%8;}
    if(pressed(4)&&!s.grabbed)input.tool=(input.tool+7)%8;if(pressed(5)&&!s.grabbed)input.tool=(input.tool+1)%8;
    input.rotate=s.grabbed?((buttons[5]?1:0)-(buttons[4]?1:0)):0;
    input.pressure=Math.max(pad.buttons[7]?.value||0,buttons[0]?1:0);
    input.held=(buttons[7]||buttons[0]?1:0)|(buttons[3]?2:0)|(buttons[6]&&buttons[7]?4:0)|(buttons[1]?8:0);
    if(seat===(H.active?H.me:0)){tool=input.tool;pointer=[...input.aim];}
   }
  }else if(screen==='story'){
   if(pressed(0))advanceStory();if(buttons[0])holdAdvance+=dt;else holdAdvance=0;if(holdAdvance>1.3)skipStory();
   if(pressed(1)||pressed(2)){backlog=!backlog;draw();}if(pressed(3)){storyAuto=!storyAuto;draw();}
  }else if(!H.active){
   let nav=buttons[13]||axis[1]>.55?1:buttons[12]||axis[1]<-.55?-1:0;
   old.nav=Math.max(0,old.nav-dt);if(nav&&old.nav<=0){menuMove(nav);old.nav=.23;}
   if(pressed(0))confirmMenu();if(pressed(1))back();if(pressed(4)||pressed(14))menuAdjust(-1);if(pressed(5)||pressed(15))menuAdjust(1);
  }
  padStates.set(pad.index,{buttons,nav:old.nav,signature});
 }
}
function gather(dt){
 const seat=H.active?H.me:0;if(H.server||seat<0||!inputs[seat])return;
 if(device==='test')return;
 if(device==='pad'&&[...padSeats.values()].includes(seat))return;
 const input=inputs[seat],s=S.surgeons[seat];input.active=true;input.tool=tool;input.pressure=1;input.rotate=rotate;rotate=0;input.precision=keys.has('shift');
 const dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
 input.assisted=!!(dx||dz);if(dx||dz){const len=Math.hypot(dx,dz),v=settings.cursor*dt*(keys.has('shift')?.35:1);const base=H.active&&!H.isHost?input.aim:s.cursor;pointer=[Math.max(-9,Math.min(9,base[0]+dx/len*v)),Math.max(-4,Math.min(4,base[1]+dz/len*v))];}
 input.aim=pointer;input.held=(mouse&1||keys.has('e')?1:0)|(keys.has(' ')||giftHeld?2:0)|((mouse&3)===3||S.code>0&&keys.has('shift')&&keys.has('e')?4:0)|(mouse&2&&!(mouse&1)||keys.has('q')?8:0);
}
function drawChart(){
 const c=DATA.cases[S.case],p=c.phases[S.phase];
 ui.insertAdjacentHTML('beforeend',`<div class="overlay-dim" id="chart-dim"></div><section class="panel-shell center chart" id="op-chart"><div class="eyebrow">ACTIVE PATIENT CHART</div><h2>${esc(c.patient)}</h2><p class="patient-line">${esc(c.life)}</p><div class="rule"></div><div class="case-detail"><b>${esc(p.name)}</b><br>${esc(p.objective)}<br><br><b>Remaining tasks</b> · ${S.hazards.filter(h=>h.alive).length}<br><b>Surgeon</b> · ${esc(c.surgeon)}</div><p class="patient-line">${esc(currentHelp())}</p><div class="panel-footer"><span>${prompt('chart')} Close chart</span><button class="flat-button" id="chart-close">Return to field</button></div></section>`);
 $('#chart-close').onclick=()=>{chartOpen=false;draw();};
}
function ecg(){let d='';for(let i=0;i<=180;i++){const x=i/180*1000,phase=(i/180*4+S.beat)%1;let v=0;if(S.code<=0){v=6*Math.exp(-(((phase-.15)/.055)**2))-7*Math.exp(-(((phase-.38)/.018)**2))+42*Math.exp(-(((phase-.42)/.012)**2))-17*Math.exp(-(((phase-.46)/.021)**2))+11*Math.exp(-(((phase-.7)/.09)**2));}d+=`${i?'L':'M'}${x.toFixed(1)},${(47-v).toFixed(1)} `;}return d;}
function updateHUD(){
 if(!['operation','attract','dev'].includes(screen)||screen==='attract'&&attractSegment===5){markers.innerHTML='';return;}
 const seat=H.active&&!H.server?H.me:0,s=S.surgeons[seat]||S.surgeons[0],p=DATA.cases[S.case].phases[S.phase];
 if(phaseSeen!==S.phase){phaseSeen=S.phase;if(p.hazards.some(h=>h.kind==='dressing'))tool=8;renderNeeded=true;draw();}
 if($('#vitals-number')){$('#vitals-number').innerHTML=`${Math.ceil(S.vitals)}<span>VITAL SIGNS</span>`;$('#vitals-bar').style.width=S.vitals+'%';$('#vitals-bar').style.background=S.vitals<35?'var(--red)':'var(--mint)';$('#clock').textContent=formatTime(S.remaining);$('#ecg-path').setAttribute('d',ecg());$('#bpm').textContent=`${Math.round(S.bpm)} BPM / ${p.strain||'SINUS'}`;$('#callout').textContent=S.callout;
  $('#selected-name').textContent=currentTool(s.tool);$('#selected-help').textContent=currentHelp(s.tool);
  $$('.tool-button').forEach((el,i)=>el.classList.toggle('selected',i===s.tool));
  $('#gift-label').textContent=S.gift_left>0?`${S.gift_kind.toUpperCase()} · ${S.gift_left.toFixed(1)} S`:Math.round(s.gift)+'% · RELEASE ON THE BEAT';$('#gift-meter').style.width=s.gift+'%';$('#gift-button').classList.toggle('ready',s.gift>=35);
  $('.heart-icon').style.transform=`scale(${1+Math.max(0,1-S.beat*5)*.16})`;
 }
 $('#flash').style.boxShadow=S.vitals<35?`inset 0 0 ${100+60*Math.cos(S.beat*Math.PI*2)}px rgba(225,55,65,.35)`:'none';
 if(S.gift_left>0&&!settings.flashes)$('#flash').style.boxShadow='inset 0 0 140px rgba(170,170,255,.18)';
 const banner=$('#banner-holder');if(banner){const c=S.cues.findLast(c=>['phase','complete','gift'].includes(c.kind)&&c.age<1.5);banner.innerHTML=c?`<div class="banner" style="opacity:${Math.min(1,(1.5-c.age)*2)}">${esc(c.kind==='phase'&&S.phase===0?'OPERATION START':c.text.toUpperCase())}<div class="micro">${c.kind==='gift'?'LISTEN TO THE SPACE BETWEEN':''}</div></div>`:'';}
 const code=$('#code-holder');if(code){code.innerHTML=S.code>0?`<div class="code-overlay"></div><div class="code-panel"><h2>CODE BLUE</h2><p>${prompt('shock')} Hold to charge. Release when the ghost beat meets the line.</p><div class="charge-bar"><i style="width:${Math.min(100,s.charge/1.2*100)}%"></i></div><div class="code-meter"><i class="center"></i><i class="pulse" style="left:${(S.beat+.5)%1*100}%"></i></div><p>${s.charge>=1.1?'CHARGED · WAIT FOR THE BEAT':'CHARGING'} &nbsp; / &nbsp; ${S.code.toFixed(1)} s</p></div>`:'';}
 let elements=[];
 const project=(x,z)=>JSON.parse(api.project(x,z));
 const relevant=S.hazards.filter(h=>h.alive&&(!h.hidden||h.reveal>0));
 if((S.case<=2||devOverlay)&&S.code<=0){
  relevant.slice(0,devOverlay?30:3).forEach(h=>{const i=hazardTool(h),at=project(h.pos[0],h.pos[1]);elements.push(`<div class="field-label" style="left:${at[0]}px;top:${at[1]-56}px"><b>${i+1}</b>${esc(currentTool(i).toUpperCase())}</div>`);});
 }
 S.cues.filter(c=>c.kind==='rating'&&c.age<1.1).forEach(c=>{const at=project(c.pos[0],c.pos[1]);elements.push(`<div class="rating" style="left:${at[0]}px;top:${at[1]-60-c.age*35}px;opacity:${Math.min(1,(1.1-c.age)*3)}">${esc(c.text)}${c.on_beat?'<small>ON BEAT +25%</small>':''}</div>`);});
 if(s.held&1&&[4,6,7].includes(s.tool)&&s.charge>0.1){const at=project(...s.cursor),release=s.charge>=.75&&s.charge<=1.08;elements.push(`<div class="field-label" style="left:${at[0]}px;top:${at[1]+65}px;color:${s.charge>1.08?'var(--red)':release?'var(--mint)':'var(--paper)'}">${release?'RELEASE':s.charge>1.08?'LIFT OFF':`${s.tool===7?'DOSE':'CHARGE'} ${Math.round(s.charge*100)}%`}</div>`);}
 S.surgeons.forEach((s,i)=>{if(s.active&&(i!==seat||s.chain>1)){const at=project(...s.cursor),name=s.ghost?'ECHO':i===seat?`CHAIN ×${s.chain}`:H.active?`SURGEON ${i+1}`:i===1&&S.case===7?'PET':`SURGEON ${i+1}`;elements.push(`<div class="co-op-cursor" data-seat="${i}" style="left:${at[0]}px;top:${at[1]}px;color:${s.ghost?'#d9bfff':colors[i]}">${name}</div>`);}});
 markers.innerHTML=elements.join('');if(H.active){markers.querySelectorAll('[data-seat]').forEach(el=>{const i=Number(el.dataset.seat);if(i!==seat&&!S.surgeons[i].ghost){const p=H.info.players.find(p=>p.id===i);if(p)el.textContent=p.name;}});}
}
function hazardTool(h){if(['incision','tether','soloist'].includes(h.kind))return 0;if(['hook','shard','tendril'].includes(h.kind))return 1;if(h.kind==='bone')return h.stage?2:1;if(['laceration','bleeder'].includes(h.kind))return 2;if(h.kind==='pool')return 3;if(['polyp','sac'].includes(h.kind))return 4;if(h.kind==='tumor')return [0,1,5][h.stage];if(h.kind==='nodule')return h.hidden&&h.reveal<=0?6:h.stage?1:4;if(h.kind==='ember')return h.stage===0?(S.case===7?6:4):h.stage===1?0:1;if(h.kind==='dressing')return 8;return 5;}

// AI Hub Protocol v1: only the host simulates; other copies mirror compact snapshots.
const H={active:!!window.AIHub?.active,info:null,card:{left:null,ready:[]},started:false,ended:false,me:0,server:false,isHost:false,remote:{},sendClock:0,seq:0,lastFrame:-1,lastResult:null,finished:false};
function hubHTML(){
 if(screen==='hubend')return `<div class="hub-card"><div class="eyebrow">THE SHIFT HAS ENDED</div><h1>${esc(TITLE)}</h1><p>The hub is preparing the team's results.</p></div>`;
 if(screen==='countdown')return `<div class="hub-card"><div class="eyebrow">CODE BLUE / TEAM TRIAGE</div><h1>Hands ready.</h1><p>The shift begins in ${Math.max(0,Math.ceil(-AIHub.time()/1000))}.</p></div>`;
 return `<div class="hub-card"><div class="eyebrow">MERCY HARBOR GENERAL / CODE BLUE</div><h1>${esc(TITLE)}</h1><span class="card-time">${H.card.left===null?'Preparing':Math.ceil(H.card.left/1000)+' s'}</span><p>One patient. Up to four surgeons.<br>Keep the patient alive until the shift ends.</p><div class="hub-players">${H.info?.players.map((p,i)=>`<div class="hub-player" style="border-color:${colors[i]}"><span id="hub-name-${i}"></span><small>${H.card.ready?.includes(p.id)?'READY':'SCRUBBING IN'}</small></div>`).join('')||''}</div><p>${prompt('tools')} Select instruments &nbsp; ${prompt('use')} Operate<br>Right stick or mouse aims. ${prompt('gift')} Release your gift on the beat.</p><div class="hub-card-actions">${button('Ready','hubready',0,true)}${button('More time · M / △','hubmore',1)}</div><p style="font-size:25px;color:var(--muted)">Every surgeon has a cursor, instrument, score and gift.</p></div>`;
}
function fillHubNames(){if(H.active&&H.info)H.info.players.forEach((p,i)=>{const node=$(`#hub-name-${i}`);if(node)node.textContent=p.name;});}
function standings(){
 const players=H.info?.players||[],scores={};players.forEach(p=>scores[p.id]=Math.round(S?.surgeons[p.id]?.score||0));
 const sorted=players.slice().sort((a,b)=>scores[b.id]-scores[a.id]),groups=[];for(const p of sorted){const prev=groups.at(-1);if(prev&&scores[prev[0]]===scores[p.id])prev.push(p.id);else groups.push([p.id]);}
 return {standings:groups,scores,won:(S?.vitals||0)>0,stats:Object.fromEntries(players.map(p=>[p.id,{'Techniques':S?.actions||0,'Best chain':S?.surgeons[p.id]?.best_chain||0}])),awards:sorted[0]?[{id:sorted[0].id,title:'Immaculate Hands',detail:'Highest technique score in the theatre.'}]:[]};
}
function finishHub(){if(H.isHost&&!H.finished&&!H.ended){H.finished=true;AIHub.finish(H.lastResult||standings());}}
function compact(){
 const q=n=>Math.round(n*100)/100;
 return [S.case,S.phase,q(S.time),q(S.remaining),q(S.vitals),q(S.bpm),q(S.beat),S.beats,q(S.code),S.shocks,q(S.gift_left),S.gift_kind,q(S.fever),q(S.heat_radius),S.mode,S.serial,
 S.hazards.filter(h=>h.alive||h.id>S.next_id-3&&['laceration','bleeder','bone'].includes(h.kind)).map(h=>[h.id,h.kind,...h.pos.map(q),...h.end.map(q),...h.home.map(q),q(h.progress),h.stage,+h.hidden,q(h.reveal),q(h.age),+h.alive,h.count,q(h.angle)]),
 S.surgeons.map(s=>[+s.active,...s.cursor.map(q),s.tool,s.held,q(s.charge),q(s.score),s.chain,s.best_chain,q(s.gift),+s.ghost]),
 S.cues.slice(-4).map(c=>[c.seq,c.text,c.kind,...c.pos.map(q),q(c.age),c.seat,+c.on_beat]),S.callout];
}
function mirror(a){
 const [n,p,t,r,v,b,beat,beats,code,shocks,gift_left,gift_kind,fever,heat_radius,mode,serial,hazards,surgeons,cues,callout]=a;
 command({type:'mirror',state:{case:n,phase:p,time:t,remaining:r,vitals:v,bpm:b,beat,beats,code,shocks,gift_left,gift_kind,fever,heat_radius,mode,serial,callout,
 hazards:hazards.map(h=>({id:h[0],kind:h[1],pos:[h[2],h[3]],end:[h[4],h[5]],home:[h[6],h[7]],progress:h[8],stage:h[9],hidden:!!h[10],reveal:h[11],age:h[12],alive:!!h[13],count:h[14],angle:h[15],side:0})),
 surgeons:surgeons.map((s,i)=>({...S.surgeons[i],active:!!s[0],cursor:[s[1],s[2]],tool:s[3],held:s[4],charge:s[5],score:s[6],chain:s[7],best_chain:s[8],gift:s[9],ghost:!!s[10]})),
 cues:cues.map(c=>({seq:c[0],text:c[1],kind:c[2],pos:[c[3],c[4]],age:c[5],seat:c[6],on_beat:!!c[7]}))}});
}
let hubConnect=Promise.resolve(null);
if(H.active){
 screen='hubcard';hubConnect=AIHub.connect({mode:'shared-world',seats:[1,4],card:true}).then(info=>{
  if(!info){H.active=false;screen='title';if(ready)draw();return;}
  Object.assign(H,{info,me:info.me,server:info.server,isHost:info.isHost});
  AIHub.on('card',c=>{H.card=c;if(ready&&screen==='hubcard'){draw();fillHubNames();}});
  AIHub.on('start',()=>{H.started=true;if(ready)beginHub();});
  AIHub.on('message',(d,from)=>{
   if(H.ended||!api)return;
   if(d?.type==='i'&&H.isHost&&H.info.players.some(p=>p.id===from)){
    const old=H.remote[from];if(!old||d.seq>=old.seq)H.remote[from]={input:d.input,seq:d.seq,last:performance.now()};
   }else if(d?.type==='f'&&!H.isHost&&from===H.info.host&&d.seq>H.lastFrame){H.lastFrame=d.seq;mirror(d.frame);}
  });
  AIHub.on('leave',({id})=>{if(inputs[id])inputs[id]=empty();delete H.remote[id];if(ready&&S?.surgeons[id]){const ss=S.surgeons.map((s,i)=>i===id?{...s,active:false,held:0}:s);command({type:'mirror',state:{surgeons:ss}});}H.info.players=H.info.players.filter(p=>p.id!==id);});
  AIHub.on('time-up',()=>finishHub());
  AIHub.on('end',()=>{H.ended=true;screen='hubend';sound.stop();keys.clear();mouse=0;if(ready)draw();});
  if(ready){draw();fillHubNames();}
  return info;
 });
 addEventListener('keydown',e=>{if(screen==='hubcard'){if(e.key==='Enter')AIHub.answer('ready');if(e.key.toLowerCase()==='m')AIHub.answer('more');}},true);
}
function beginHub(){
 if(!ready||H.ended)return;seed=H.info.seed;loadCase(8,null);H.info.players.forEach(p=>inputs[p.id]={...empty(),active:true,aim:[(p.id-1.5)*2,0]});
 const ss=S.surgeons.map((s,i)=>({...s,active:H.info.players.some(p=>p.id===i),ghost:false,cursor:[(i-1.5)*2,0]}));command({type:'mirror',state:{surgeons:ss}});
 screen='countdown';draw();if(!H.server)sound.unlock();
}
function netUpdate(dt){
 if(!H.active||!H.started||H.ended)return;
 if(screen==='countdown'){if(AIHub.time()>=0){screen='operation';draw();}else if(frameNumber%15===0)draw();return;}
 if(H.isHost){
  for(const [id,r] of Object.entries(H.remote)){inputs[id]={...empty(),...r.input,active:true};if(performance.now()-r.last>1600)inputs[id].held=0;}
  H.lastResult=standings();
 }
 H.sendClock+=dt;if(H.sendClock<.1)return;H.sendClock=0;
 if(H.isHost){AIHub.send({type:'f',seq:++H.seq,frame:compact()},{reliable:false});if(S.mode==='dead'||S.mode==='results')finishHub();}
 else {AIHub.send({type:'i',seq:++H.seq,input:inputs[H.me]},{to:H.info.host,reliable:false});}
}

function onResult(){
 if(resultSeen)return;resultSeen=true;const c=DATA.cases[S.case],total=S.surgeons.reduce((a,s)=>a+s.score,0)+S.vitals*20+S.remaining*5-S.mistakes*100,rank=rankFor(total,c.par),order=['C','B','A','S','ENCORE'];
 if(!save.ranks[S.case]||order.indexOf(rank)>order.indexOf(save.ranks[S.case]))save.ranks[S.case]=rank;
 save.unlocked=Math.max(save.unlocked,Math.min(7,S.case+1));save.continueCase=Math.min(7,S.case+1);persist();sound.cue('complete');navigate('results');
}
function frame(now){
 requestAnimationFrame(frame);if(!ready||H.ended)return;
 const dt=Math.min(.15,Math.max(.001,(now-lastFrame)/1000));lastFrame=now;elapsed+=dt;frameNumber++;fpsCount++;fpsClock+=dt;
 if(fpsClock>=1){fps=fpsCount/fpsClock;fpsClock=0;fpsCount=0;}
 pollPads(dt);
 const idleMenu=['title','menu','casefiles','about','difficulty'].includes(screen)||screen==='settings'&&from!=='pause';
 if(!H.active&&idleMenu&&now-lastInput>=10000)startAttract();
 if(screen==='attract')attractUpdate(dt);
 if(screen==='story'){
  const line=sceneLines[lineIndex];if(line&&!backlog){typeClock+=dt*settings.text;const before=Math.floor(typed);typed=Math.min(line.text.length,typeClock);if(Math.floor(typed)!==before){sound.voice(line.text[Math.floor(typed)-1],line.who,Math.floor(typed));const el=$('.story-text');if(el)el.textContent=line.text.slice(0,Math.floor(typed));}
   if(storyAuto&&typed>=line.text.length){holdAdvance+=dt;if(holdAdvance>2){holdAdvance=0;advanceStory();}}
   if(keys.has('enter')){holdAdvance+=dt;if(holdAdvance>1.3){holdAdvance=0;skipStory();}}
  }
 }
 const running=(screen==='operation'&&!chartOpen)||screen==='attract'&&attractSegment!==5||screen==='dev'&&devLive;
 if(running&&(!H.active||H.started&&AIHub.time()>=0&&!H.ended)){
  gather(dt);accumulator+=dt;const ticks=Math.min(9,Math.floor(accumulator*60));if(ticks){accumulator-=ticks/60;
   if(!H.active||H.isHost){S=JSON.parse(api.step(JSON.stringify(inputs),ticks,screen==='attract'||S.tune.bot));}
   else if(!H.server&&inputs[H.me]){const i=inputs[H.me],ss=S.surgeons.map((s,n)=>n===H.me?{...s,cursor:i.tool===7?[8.3,-3.1]:i.aim,tool:i.tool,held:i.held}:s);command({type:'mirror',state:{surgeons:ss}});}
   if(S.mode==='results'&&screen==='operation'&&!H.active)onResult();else if(S.mode==='dead'&&screen==='operation'&&!H.active){sound.cue('flatline');navigate('dead');}
  }
 }
 netUpdate(dt);
 if(renderNeeded){draw();fillHubNames();}
 if(!H.server&&graphic&&render3D){const theatreMode=screen==='story'||screen==='attract'&&attractSegment===5;const line=theatreMode?sceneLines[lineIndex]:{};api.render(canvas.width,canvas.height,theatreMode?'story':'field',JSON.stringify(line||{}),elapsed);}
 updateHUD();
 for(const c of S.cues){if(c.seq>lastCues){if(!H.server&&(c.kind!=='phase'||c.age<.2))sound.cue(c.kind);lastCues=c.seq;}}
 if(!H.server){sound.update(dt,screen==='attract'&&attractSegment===5?'story':screen,S);if(screen==='attract'&&attractSegment===5){const l=sceneLines[lineIndex],i=Math.floor(elapsed*12);sound.voice(l.text[i%l.text.length],l.who,i);}}
}

async function boot(){
 try{
  await initWasm();api=new Hospital();DATA=JSON.parse(api.content());TITLE=DATA.title;document.title=TITLE;state();TUNE_DEFAULTS={...S.tune};
  await hubConnect;
  if(window.__surgeryTestNoGPU){render3D=false;}
  else if(!H.server&&navigator.gpu){try{await api.graphics(canvas);graphic=true;}catch(e){bootError=String(e);$('#gpu-note').hidden=false;}}
  else if(!H.server){bootError='WebGPU is unavailable';$('#gpu-note').hidden=false;}
  ready=true;lastInput=performance.now();lastFrame=performance.now();
  if(H.active){screen='hubcard';draw();fillHubNames();if(bootError&&!H.server){AIHub.fail('The surgical theatre requires WebGPU. Use Chrome or Edge.');}else{AIHub.ready();if(H.started)beginHub();}}
  else{loadCase(3,null);command({type:'phase',phase:1});command({type:'mirror',state:{mode:'title'}});screen='title';draw();}
  window.__game={status:()=>({title:TITLE,screen,focus,device,glyphs:settings.glyphs,touchOnly:isTouch&&!touchUnlocked,graphic,bootError,settings:{...settings},busGains:{music:settings.music,effects:settings.effects,voices:settings.voices},audioPeak:sound.peak(),sim:S,hub:{active:H.active,started:H.started,ended:H.ended,me:H.me,server:H.server,isHost:H.isHost}}),step:(n,bot=true)=>{S=JSON.parse(api.step(JSON.stringify(inputs),n,bot));if(S.mode==='results'&&screen==='operation'&&!H.active)onResult();renderNeeded=true;return S;},do:c=>{
   if(typeof c==='string')c=JSON.parse(c);
   lastInput=performance.now();
   if(c.render!==undefined){render3D=c.render;return;}
   if(c.idle!==undefined){lastInput=performance.now()-c.idle;return;}
   if(c.screen){screen=c.screen;draw();return;}
   if(c.action){act(c.action);return;}
   if(c.load!==undefined){caseChoice=c.load;loadCase(c.load);return;}
   if(c.attract){startAttract();return;}
   if(c.scene){api.load(c.scene,c.seed||42);state();phaseSeen=-1;resultSeen=false;screen='operation';draw();return;}
   command(c);
  },input:i=>{inputs[H.active?H.me:0]={...empty(),active:true,...i};pointer=inputs[H.active?H.me:0].aim;tool=inputs[H.active?H.me:0].tool;device='test';},project:(x,z)=>JSON.parse(api.project(x,z)),hash:()=>api.hash(),sound:()=>{sound.unlock();sound.cue('gift');}};
  requestAnimationFrame(frame);
 }catch(e){bootError=String(e);ui.innerHTML=`<div class="loading"><div class="eyebrow">THE THEATRE COULD NOT OPEN</div><h1>Reload to try again.</h1><p>${esc(bootError)}</p></div>`;if(H.active)AIHub.fail(bootError);}
}
boot();
