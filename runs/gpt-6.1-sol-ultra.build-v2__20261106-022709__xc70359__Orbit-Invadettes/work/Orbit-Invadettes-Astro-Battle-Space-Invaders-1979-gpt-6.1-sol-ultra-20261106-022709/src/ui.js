import {DIFFICULTIES,TUNING} from './content.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(id,label,sub='',secondary=false,disabled=false)=>`<button class="action ${secondary?'secondary':''}" data-action="${id}" ${disabled?'disabled':''}>${escape(label)}${sub?`<small>${escape(sub)}</small>`:''}</button>`;
const TEST_Q=['How many issues did testing catch?','How many were critical or game breaking?','Most helpful test','Least helpful test'];
const ENGINE_Q=['What did you like most about the engine?','Did you get stuck or guess wrong?','Most important system built','Hardest part of using the engine','Engine changes and reasons','One suggested engine change'];
const PROMPT_Q=['What worked best in the prompt?','What was confusing?','What was hardest?','One suggested prompt change'];

export class Interface{
  constructor(app,report){
    this.app=app;this.game=app.game;this.report=report;this.root=typeof document==='undefined'?null:document.getElementById('ui');
    this.screen='title';this.page=0;this.focus=0;this.memory={};this.parent='title';this.rows=[];this.lock=.2;this.devPage=0;
    this.pages=this.reportPages();
  }
  reportPages(){
    const pages=[{title:'About Orbit Invadettes',body:[
      ['ORIGINAL GAME','Cut a lane. Catch the scrap. Keep your planet. Six formations across three outposts, then an original hostile flagship. Solo or simultaneous local co-op; shared-world online co-op when launched by AI Hub.'],
      ['CREDITS','Game design, programming, original pixel art and procedural music: OpenAI gpt-6.1-sol. Built on Michael Crosato’s my-3D2dge. AI Hub session client by Michael Crosato. No commercial game assets, ROMs or recorded audio.'],
      ['SOURCE INTERPRETATION','Inspired by Bally’s Astrocade Space Invaders, subsequently called Astro Battle. The supplied combined source wording is interpreted this way; it is not a newly established release-history claim. Repair salvage, specialists, co-op and the flagship are original additions.']
    ]},{title:'Research & licenses',body:[
      ['WHAT WAS EXAMINED','Archived manual scan, manual transcription, Video Games October 1982 comparison, and sampled archive-linked Nice and Games Astro Battle footage at 90/120 seconds with a sequential filmstrip. Source sound was not listened to; exact audio is unknown.'],
      ['PRIMARY SOURCES','Bally Alley manual archive: ballyalley.com/cart_manuals/html_manuals/astro_battle.htm · gameplay archive: ballyalley.com/astrocade_videos/cartridge_videos/cartridge_videos.html. Detailed observations and retained references are in research/RESEARCH.md.'],
      ['LICENSES','my-3D2dge © 2026 Michael Crosato, MIT License. Permission is granted, free of charge, to use, copy, modify, merge, publish, distribute, sublicense and/or sell copies, subject to retaining the copyright and permission notice. Software is provided “AS IS”, without warranty. Full MIT notice is retained in this HTML.']
    ]}];
    const fields=Object.entries(this.report.sourceInformation);
    for(let i=0;i<fields.length;i+=3)pages.push({title:'Source information',body:fields.slice(i,i+3).map(([k,v])=>[k.replace(/([A-Z])/g,' $1').toUpperCase(),v])});
    for(const [title,questions,answers] of [['Testing feedback',TEST_Q,this.report.testingFeedback],['Engine feedback',ENGINE_Q,this.report.engineFeedback],['Prompt feedback',PROMPT_Q,this.report.promptFeedback]]){
      for(let i=0;i<answers.length;i+=2)pages.push({title,body:answers.slice(i,i+2).map((v,j)=>[questions[i+j],v])});
    }
    return pages;
  }
  show(screen,opts={}){
    this.memory[this.screen]=this.focus;
    if(opts.parent)this.parent=opts.parent;
    this.screen=screen;this.focus=this.memory[screen]??0;this.lock=.18;
    this.app.clearInput();
    this.render();
  }
  focusAt(n,{dom=true}={}){
    if(!this.rows.length)return;
    this.focus=(n+this.rows.length)%this.rows.length;
    this.rows.forEach((el,i)=>{
      const row=el.closest('.setting-row')||el;
      row.classList.toggle('focused',i===this.focus);
    });
    if(dom&&this.rows[this.focus]){this.rows[this.focus].focus({preventScroll:true});this.rows[this.focus].scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});}
  }
  frame(title,sub,body,extra=''){
    return `<section class="screen menu-screen ${extra}" aria-label="${escape(title)}"><p class="eyebrow">ORBIT INVADETTES / DEFENSE NETWORK</p><h1 class="menu-title">${title}</h1>${sub?`<p class="sub">${sub}</p>`:''}${body}</section>`;
  }
  render(){
    if(!this.root)return;
    const a=this.app,w=a.world,s=this.screen,hub=!!a.session;
    if(s==='play'||s==='hub-wait'){this.root.innerHTML='';this.rows=[];return;}
    if(s==='attract'){
      this.root.innerHTML='<div class="demo-banner"><strong>ATTRACT PLAY</strong><p>AI demonstration · any input returns to title</p></div>';this.rows=[];return;
    }
    let html='';
    if(s==='title'){
      html=`<section class="screen title-screen" aria-label="Title"><div class="title-art"><p class="eyebrow">A small planet. A very large problem.</p><h1 class="logo">Orbit<span>Invadettes</span></h1><p class="tagline">Cut a lane. Catch the scrap.<br>Keep your planet.</p><p class="edition">PLANETARY DEFENSE / EST. 1979 · REBUILT 2026</p></div><div class="menu-card"><span class="pill">1–2 PLAYERS / SIX WAVES + FLAGSHIP</span><div class="actions">${btn('launch','Deploy cannons','Solo or simultaneous local co-op')}${btn('controls','How to defend')}${btn('settings','Settings','',true)}${btn('records','Local records','',true)}${btn('about','About & credits','',true)}</div><p class="foot"><span id="menu-prompt">${escape(a.menuPrompt())}</span><br>Online co-op is available through AI Hub.<br>Idle 10 seconds for a demonstration.</p></div></section>`;
    }else if(s==='launch'){
      const d=DIFFICULTIES[a.difficulty],name=typeof d==='string'?d:d.name;
      html=this.frame('Choose your defense','The entire campaign is available at every difficulty.',`<div class="actions">${btn('players','Players: '+(a.playerCount===1?'Solo':'Two-player co-op'),a.playerCount===1?'3 deployments, including your first cannon.':'6 shared deployments. Two pads, keyboard + pad, or split keyboard.')}${btn('difficulty','Difficulty: '+name,(d.description||d.help||'Adjust with Left / Right.'))}${btn('start','Launch defense','Hold fire. Collect salvage. Repair the nearest bunker.')}${btn('back','Back','',true)}</div><p class="foot">P1: A/D · Space · Q. P2 on a shared keyboard: arrows · . · /.<br>Local roster locks at launch. A returning pad reclaims its seat.</p>`);
    }else if(s==='controls'){
      const t=a.primary==='touch',xbox=this.game.settings.glyphs==='xbox';
      html=this.frame('Two actions. One planet.',hub?'Your Options overlay is local. The team’s world keeps moving.':'Six formations. Three outposts. One hostile flagship.',`<div class="control-grid"><div><strong>MOVE</strong>${t?'Drag horizontally in the lower play area. Movement is relative to your thumb.':'Left stick / D-pad · A/D or arrows. Move the mouse inside the field to set a horizontal target.'}</div><div><strong>FIRE</strong>${t?'Clear lanes fire automatically. A second finger fires through cover to cut a new lane.':(xbox?'Hold RT or A':'Hold R2 or Cross')+' · Space or left mouse. Two missiles at a time. Your shots cut your bunkers.'}</div><div><strong>REPAIR</strong>${t?'Tap the temporary REPAIR button while moving. It appears when salvage can restore cover.':(xbox?'LB or X':'L1 or Square')+' · Q or right mouse. One charge restores a cluster in the nearest bunker.'}</div><div><strong>READ THE SKY</strong>Gold brackets announce enemy fire. Mint diamonds are salvage. Keep aliens above the striped breach line.</div></div><div class="actions">${btn('back','Ready','',false)}</div><p class="foot">${t?'Use two simultaneous contacts to deliberately cut cover.':'P2 shared keyboard: arrows · . to fire · / to repair.'}<br>Options / Escape: ${hub?'local options':'pause'}. Xbox button names are available in Settings.</p>`);
    }else if(s==='settings'){
      const page=this.page%2;const S=this.game.settings;
      const slider=(key,label,help='')=>`<label class="setting-row"><span>${label} <span class="value" data-value="${key}">${Math.round(S[key]*100)}%</span></span><input aria-label="${label}" data-setting="${key}" type="range" min="0" max="1" step=".05" value="${S[key]}">${help?`<small>${help}</small>`:''}</label>`;
      const toggle=(id,label,value,help='')=>btn(id,label+': '+(value?'On':'Off'),help);
      let body=page===0?[
        slider('volume','Master'),slider('music','Music','Default 10%. All sound is generated in code.'),slider('effects','Effects'),slider('voice','Alien voices'),toggle('mute','Mute all',!S.sound),
      ].join(''):[
        btn('glyphs','Controller labels: '+(S.glyphs==='xbox'?'Xbox A / B / X / Y':'PlayStation Cross / Circle')),
        toggle('motion','Reduced motion',S.motion),toggle('flash','Reduced flashes',S.flashes===0),toggle('touchAssist','Touch auto-fire',S.touchAssist,'Clear upward lanes fire automatically; two fingers intentionally cut cover.'),
        btn('fullscreen','Full screen','Requires a browser gesture; availability depends on the browser.')
      ].join('');
      html=this.frame('Settings <span class="page-number">'+(page+1)+' / 2</span>',hub?'Local preferences only. The shared world continues.':'Your preferences persist when browser storage is available.',`<div class="actions">${body}${btn('settingsPage',page===0?'Controls & accessibility →':'← Sound settings','',true)}${btn('resetSettings','Reset preferences','Music returns to 10%. Records are kept.',true)}${btn('back','Back','',true)}</div>`);
    }else if(s==='pause'){
      html=this.frame(hub?'Local options':'Defense paused',hub?'<span class="local-live">TEAM WORLD IS LIVE</span>':'Your cannons are holding position.',`<div class="actions">${btn('resume','Return to defense')}${btn('settings','Settings')}${btn('controls','Controls','',true)}${btn('dev','Developer tools','Diagnostics and live balance controls',true)}${hub?'':btn('restart','Restart campaign','A fresh run with the same roster and difficulty.',true)+btn('title','Return to title','',true)}</div><p class="foot">${hub?'Your seat is neutral while this overlay is open.':'Pause from either player affects the whole local team.'}</p>`);
    }else if(s==='dev'){
      const disabled=hub;
      const pg=this.devPage;let body='';
      if(pg===0){
        body=`<div class="dev-grid"><div class="actions">${btn('invincible','Invulnerability: '+(a.invulnerable?'On':'Off'),'Marks the run assisted.',false,disabled)}${btn('reserve','Add a deployment','Shared reserve +1',false,disabled)}${btn('charges','Fill repair charges','Each active player receives 3.',false,disabled)}${btn('encounter','Encounter: '+(w.encounter===6?'Flagship':w.encounter+1),'Left / Right selects, then restarts.',false,disabled)}${btn('phase','Flagship phase: '+(w.boss?.phase??'—'),'Starts the selected boss phase.',false,disabled)}</div><div class="actions">${btn('restartEncounter','Restart encounter','Keeps score and cover; assisted.',false,disabled)}${btn('spawnType','Spawn selection: '+a.spawnType,'Left / Right chooses enemy or saucer.',false,disabled)}${btn('spawn','Spawn selected','Adds the selected attacker / bonus.',false,disabled)}${btn('overlay','Collision & telegraphs: '+(a.overlays?'On':'Off'))}${btn('time','Time: '+a.speed+'×','Live when the overlay is closed.',false,disabled)}${btn('step','Single step','One fixed 1/120 second step while this screen is open.',false,disabled)}</div></div><label class="setting-row"><span>Deterministic seed</span><input class="seed" id="seed-input" aria-label="Deterministic seed" type="text" inputmode="numeric" value="${w.seed}" ${disabled?'disabled':''}><small>Use “Restart from seed” to begin an assisted campaign.</small></label>${btn('seed','Restart from seed','',true,disabled)}`;
      }else{
        const list=TUNING.slice((pg-1)*5,pg*5);
        body='<div class="actions">'+list.map(t=>`<label class="setting-row"><span>${escape(t.label)} <span class="value" data-tune-value="${t.key}">${Number(w.tuning[t.key]).toFixed(t.step<1?2:0)}</span></span><input type="range" data-tuning="${t.key}" aria-label="${escape(t.label)}" min="${t.min}" max="${t.max}" step="${t.step}" value="${w.tuning[t.key]}" ${disabled?'disabled':''}><small>${escape(t.description)} Bounds ${t.min}–${t.max}.</small></label>`).join('')+btn('resetTuning','Reset difficulty tuning','Restores values from this difficulty’s preset.',true,disabled)+'</div>';
      }
      html=this.frame('Developer tools <span class="page-number">'+(pg+1)+' / 3</span>',hub?'World changes are disabled in AI Hub sessions. Local diagnostics remain available.':'Changing the world marks this run ASSISTED and separates its records.',body+`<div class="dev-summary" id="dev-summary">${escape(a.stateSummary())}</div><div class="page-actions">${btn('devPage','Next page')}${btn('resume','Play / observe')}${btn('back','Back','',true)}</div>`,'dev-screen');
    }else if(s==='results'){
      const won=w.status==='victory',interrupted=hub&&!['victory','defeat'].includes(w.status);
      const interruptedText=a.sessionEndReason==='host-left'?'The host departed. This round is void.':a.sessionEndReason==='sat-out'?'This seat is sitting out the round.':'AI Hub closed this round before a team outcome.';
      const minutes=Math.floor(w.time/60),seconds=Math.floor(w.time%60);
      html=this.frame(interrupted?(a.sessionEndReason==='host-left'?'ROUND VOID.':'ROUND CLOSED.'):(won?'PLANET KEPT.':'DEFENSE LOST.'),interrupted?interruptedText:won?'The Invadettes have somewhere else to be.':(/breach/i.test(w.reason)?'An invader crossed the breach line.':w.reason==='time-expired'?'Time expired before the flagship fell.':'All deployments were exhausted.'),`<p class="pill">${escape((DIFFICULTIES[w.difficulty]?.name||'Standard')+' · '+(w.players.length>1?'Co-op':'Solo')+(w.assisted?' · Assisted':''))}</p><p class="score">${String(w.score).padStart(6,'0')}</p><div class="contributions">${w.players.map(s=>`<div><strong>P${s.seat+1} · ${s.score} pts</strong><br>${s.kills} targets · ${s.repairs} repairs</div>`).join('')}</div><p class="sub">${minutes}:${String(seconds).padStart(2,'0')} · ${interrupted?'No completed team outcome.':won?'Six formations and the flagship cleared.':'Wave '+Math.min(6,w.encounter+1)+' reached.'}</p><div class="actions">${hub?btn('resultsWait','AI Hub handles the next round','Waiting for the Hub result card.',false,true):btn('restart','Deploy again')+btn('settings','Settings','',true)+btn('title','Title','',true)}</div>`);
    }else if(s==='records'){
      const records=a.records.filter(r=>!!r.assisted===!!a.recordsAssisted).slice().sort((x,y)=>y.score-x.score).slice(0,7);
      html=this.frame('Local records',a.recordsAssisted?'Assisted runs. These are kept separate from ordinary records.':'Ordinary rules. Scores stay on this browser.',`<div>${records.length?records.map((r,i)=>`<div class="record-row"><span>${i+1}. ${escape(r.mode)}<br><small>${escape(r.difficulty)} · ${r.assisted?'ASSISTED':'STANDARD RULES'} · ${r.won?'VICTORY':'DEFEAT'}</small></span><strong>${r.score}</strong></div>`).join(''):'<p class="sub">A clean slate. Your planet awaits.</p>'}</div><div class="actions" style="margin-top:20px">${btn('recordFilter',a.recordsAssisted?'View ordinary records':'View assisted records','',true)}${btn('back','Back')}</div>`);
    }else if(s==='about'){
      const pg=this.pages[this.page%this.pages.length];
      html=this.frame(escape(pg.title)+' <span class="page-number">'+(this.page+1)+' / '+this.pages.length+'</span>','Credits, provenance and honest build feedback.',`<div class="report-body">${pg.body.map(([k,v])=>`<p><strong>${escape(k)}</strong><br>${escape(v)}</p>`).join('')}</div><div class="page-actions">${btn('previous','← Previous')}${btn('next','Next →')}${btn('back','Back','',true)}</div>`,'report-screen');
    }
    this.root.innerHTML=html;
    this.rows=Array.from(this.root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)'));
    this.rows.forEach((el,i)=>{
      el.addEventListener('pointerenter',()=>this.focusAt(i,{dom:false}));
      el.addEventListener('focus',()=>this.focusAt(i,{dom:false}));
      if(el.dataset.action)el.addEventListener('click',e=>{if(performance.now()<a.wakeUntil){e.preventDefault();return;}a.activity(e.pointerType==='touch'?'touch':e.pointerType==='mouse'?'pointer':a.primary);this.activate(el.dataset.action);});
      if(el.dataset.setting)el.addEventListener('input',()=>{
        a.activity();this.game.settings.set(el.dataset.setting,Number(el.value));
        this.root.querySelector('[data-value="'+el.dataset.setting+'"]').textContent=Math.round(el.value*100)+'%';
      });
      if(el.dataset.tuning)el.addEventListener('input',()=>{
        a.tune(el.dataset.tuning,Number(el.value));this.root.querySelector('[data-tune-value="'+el.dataset.tuning+'"]').textContent=Number(el.value).toFixed(2);
      });
    });
    this.focusAt(Math.min(this.focus,this.rows.length-1),{dom:false});
  }
  activate(id,dir=1){
    const a=this.app,s=this.screen;
    if(id==='back'){
      if(s==='title')return;
      if(s==='results'){if(!a.session)a.toTitle();return;}
      if(s==='pause'||s==='dev'){this.show(s==='dev'?'pause':'play');return;}
      this.show(this.parent||'title');return;
    }
    if(id==='settings'||id==='controls'||id==='dev'||id==='about'||id==='records'||id==='launch'){
      this.page=0;if(id==='dev')this.devPage=0;
      this.show(id,{parent:s});return;
    }
    if(id==='recordFilter'){a.recordsAssisted=!a.recordsAssisted;this.render();return;}
    if(id==='players'){a.playerCount=a.playerCount===1?2:1;this.render();return;}
    if(id==='difficulty'){a.difficulty=(a.difficulty+dir+4)%4;this.render();return;}
    if(id==='settingsPage'){this.page=(this.page+1)%2;this.render();return;}
    if(id==='previous'||id==='next'){this.page=(this.page+(id==='next'?1:-1)+this.pages.length)%this.pages.length;this.render();return;}
    if(id==='devPage'){this.devPage=(this.devPage+1)%3;this.render();return;}
    if(id==='start'||id==='restart'){a.startRun();return;}
    if(id==='resume'){this.show('play');return;}
    if(id==='title'){a.toTitle();return;}
    if(id==='glyphs'){this.game.settings.set('glyphs',this.game.settings.glyphs==='xbox'?'playstation':'xbox');this.render();return;}
    if(id==='mute'){this.game.settings.set('sound',!this.game.settings.sound);this.render();return;}
    if(id==='motion'){this.game.settings.set('motion',!this.game.settings.motion);this.render();return;}
    if(id==='flash'){this.game.settings.set('flashes',this.game.settings.flashes===0?1:0);this.render();return;}
    if(id==='touchAssist'){this.game.settings.set('touchAssist',!this.game.settings.touchAssist);this.render();return;}
    if(id==='resetSettings'){a.resetSettings();this.render();return;}
    if(id==='fullscreen'){a.fullscreen();return;}
    a.devAction(id,dir);this.render();
  }
  update(dt){
    this.lock=Math.max(0,this.lock-dt);
    if(['play','attract','hub-wait'].includes(this.screen))return;
    for(const I of this.game.players){
      if(this.lock>0)continue;
      if(I.repeat('down',.32,.12)){this.focusAt(this.focus+1);this.app.activity(I.lastDevice);}
      if(I.repeat('up',.32,.12)){this.focusAt(this.focus-1);this.app.activity(I.lastDevice);}
      const el=this.rows[this.focus];
      if(!el)continue;
      if(el.tagName==='INPUT'&&el.type==='text'){if(I.pressed('cancel')||I.pressed('pause')){this.activate('back');I.consumeAll();}continue;}
      let dir=0;
      if(I.repeat('left',.32,.12))dir=-1;
      if(I.repeat('right',.32,.12))dir=1;
      if(dir){
        this.app.activity(I.lastDevice);
        if(el.type==='range'){
          el.value=Math.max(Number(el.min),Math.min(Number(el.max),Number(el.value)+Number(el.step||1)*dir));
          el.dispatchEvent(new Event('input',{bubbles:true}));
        }else if(['players','difficulty','encounter','phase','spawnType','time','glyphs'].includes(el.dataset.action))this.activate(el.dataset.action,dir);
      }
      if(I.pressed('confirm')||I.pressed('start')){
        this.app.activity(I.lastDevice);
        if(el.dataset.action)this.activate(el.dataset.action);
        I.consumeAll();break;
      }
      if(I.pressed('cancel')||I.pressed('pause')){
        this.app.activity(I.lastDevice);
        this.activate('back');I.consumeAll();break;
      }
    }
    if(this.screen==='dev'){
      const el=this.root?.querySelector('#dev-summary');if(el)el.textContent=this.app.stateSummary();
    }
  }
}
