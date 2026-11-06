/* Native E.Shell extension: one focus/navigation hierarchy for every input. */
(() => {
  'use strict';
  const C=RingContent,S=RingSim;
  function create(game,app){
    let lastMode='',lastRoom='',lastAnnouncement='',aboutPage=0,heroSeat=0,selectClasses=['warrior','wizard'];
    const uiState={screen:'title',heroClasses:selectClasses,debug:{collision:false,nav:false,telegraphs:false}};
    const settings=[
      {key:'music',value:.1},{key:'effects',value:.75},{key:'glyphs',value:'playstation',options:[['playstation','PlayStation'],['xbox','Xbox']]},
      {key:'voice',label:'Voice',value:.5,type:'slider',group:'Sound'},
      {key:'outlines',label:'Persistent crystal outlines',value:false,group:'Comfort'},
      {key:'highContrast',label:'High contrast heroes',value:true,group:'Comfort'},
      {key:'subtitles',label:'Large subtitles',value:true,group:'Comfort'},
      {key:'aimAssist',label:'Aim assistance',value:true,group:'Game'},
      {key:'hints',label:'Teaching prompts',value:true,group:'Game'},
    ];
    const shell=new My3D2dge.Shell(game,{tv:true,theme:{ink:'#f8edd6',paper:'rgba(15,18,30,.94)',accent:'#edc573',muted:'#c0bdc9',danger:'#fa9b85',line:'rgba(223,186,112,.32)',titleFont:'Georgia, serif'},screens:{pause:{kicker:'A shelter between shadows',title:'Pause',text:()=>app.net?'Local menu · the shared world continues. Your hero waits.':'The expedition waits. No Dread passes while you read.',actions:()=>[
      ['Dev Mode',dev],['About / Credits',about],{label:'Abandon castle · return to board',disabled:!app.world||!['room','failed'].includes(app.world.mode)||!!app.net&&app.net.localSeat!==app.net.routeChooser,fn:()=>{app.intent({type:'board'});shell.hide();}},
      {label:'Quit to title',disabled:!!app.net,fn:()=>app.toTitle()},
    ]},help:{kicker:'The Fourfold Compact',title:'How to Play',sections:[['The theft','Take a ring from its shrine. Carry it to the golden waystone. The ring belongs to both heroes. Clearing every enemy is never required.'],['Two hands against the dark','One human plays with a companion. R1 / Q sends it to the objective. Hold context beside a fallen hero to revive. To pass a ring, both nearby humans hold context; the companion always accepts.'],['The expedition','The Dungeon opens the road. Choose the next three castles in any order. Each entry or failed-room retry adds one Dread, capped at six. Secured rings open shortcuts. Four rings unlock the dragon’s seals.'],['Play together','Couch: keyboard/mouse + pad, or two pads. Press Options on a free controller; takeover happens at a safe transition. Online shared-world co-op is supplied by AI Hub. There is no standalone online lobby.'],['Touch','Drag anywhere on the left to move; drag on the right to aim. Attacks aim automatically when needed. Class, evade and contextual actions appear when useful. Two fingers work independently.']],keys:[['WASD / left stick','Move'],['Mouse / right stick','Aim'],['Left mouse / R2','Primary action'],['Right mouse / L2','Class power'],['Space / ✕','Dodge'],['E / △','Interact · hold to revive'],['Q / R1','Companion objective ping'],['Tab / □','Objective view'],['Esc / Options','Pause']] }},settings:{items:settings}});
    // Keep native Shell navigation, selecting the local device that actually asked.
    const nativeMenuStep=shell._step.bind(shell);
    shell._step=()=>{const primary=game.input;let chosen=primary;if(!app.net&&shell.screen){for(let i=0;i<game.players.length;i++){const q=game.players[i];if(q.anyPressed()||Math.hypot(...q.padMove)>.4){chosen=q;app.menuSeat=i;}}}try{game.input=chosen;nativeMenuStep();}finally{game.input=primary;}};
    const nativeSet=game.settings.onChange;
    game.settings.onChange=(key,value)=>{if(nativeSet)nativeSet(key,value);if(key.startsWith('tune_')){if(!app.net||app.net.authority)S.setTuning(app.world,key.slice(5),value);}app.configureAudio();};
    for(const [key,t] of Object.entries(C.tuning))game.settings.define({key:'tune_'+key,label:t.label,type:'slider',group:'Development',value:t.value,min:t.min,max:t.max,step:t.step});
    // Development sliders belong only in Dev Mode, not ordinary Settings.
    const oldRows=shell._settingsRows.bind(shell);
    shell._settingsRows=add=>{const keys=game.settings.keys.bind(game.settings);game.settings.keys=group=>group==='Development'?[]:keys(group);try{oldRows(add);}finally{game.settings.keys=keys;}};
    const oldRender=shell._render.bind(shell);
    shell._render=()=>{oldRender();if(shell.root){shell.root.dataset.screen=shell.screen||'play';uiState.screen=shell.screen||'play';document.body.classList.toggle('ring-modal',!!shell.screen);
      shell.root.querySelectorAll('button').forEach(b=>{b.addEventListener('pointerenter',()=>{if(!b.disabled)b.focus({preventScroll:true});});b.addEventListener('focus',()=>RingAudio.event({type:'menu-focus'}));b.addEventListener('click',()=>RingAudio.event({type:'menu-confirm'}));});
      if(shell.screen==='select')decorateHeroCards();if(shell.screen==='board')decorateBoard();
      if(app.net&&!app.net.authority&&shell.screen==='dev')shell.root.querySelectorAll('input[type=range]').forEach(e=>e.disabled=true);
    }};
    function show(name,spec){shell.show(name,spec);game.input.consumeAll();return shell;}
    function title(){lastMode='';lastRoom='';selectClasses=['warrior','wizard'];uiState.heroClasses=selectClasses;shell.hide();show('title',{kicker:'A compact for two souls',name:'Quest for the\nFourfold Rings',subtitle:'Steal the light. Bring each other home.',meta:['1–2 heroes','An original cooperative fantasy'],footer:'AI companion · couch co-op · AI Hub online',actions:[
      ['New Expedition',()=>select(0)],{label:'Continue Expedition',disabled:!app.hasSave(),fn:()=>{shell.hide();app.continueRun();}},['How to Play',()=>show('help')],['Settings',()=>show('settings')],['About / Credits',about],
    ],back:()=>{}});}
    function decorateHeroCards(){const buttons=shell.root.querySelectorAll('.esh-btns button');const ids=Object.keys(C.heroes);buttons.forEach((b,i)=>{if(i>=4)return;const h=C.heroes[ids[i]];b.style.setProperty('--hero',h.color);const n=document.createElement('span');n.className='hero-description';n.textContent=h.description;b.append(n);});}
    function select(seat,waystone=false){
      heroSeat=seat;if(waystone)selectClasses=app.world.heroes.map(h=>h.classId);uiState.heroClasses=selectClasses;
      const own=app.net?app.net.localSeat:seat;
      show('select',{kicker:waystone?'A safe waystone':'Choose the company',title:waystone?'Change your hero':seat===0?'Who shall bear the first light?':'Who shall keep the second?',text:'Every pair can finish the expedition. Duplicate heroes are welcome.',actions:Object.entries(C.heroes).map(([id,h])=>({label:h.name,primary:selectClasses[seat]===id,fn:()=>{
        selectClasses[seat]=id;uiState.heroClasses=selectClasses;
        if(waystone){app.intent({type:'hero',value:id},own);shell.back();lastMode='';}
        else if(seat===0)select(1);else{shell.hide();app.newRun(selectClasses);}
      }})).concat([{label:waystone?'Keep this company':'Back',primary:false,fn:()=>shell.back()}]),back:()=>shell.back()});
      // back needs to pop without recursively invoking itself.
      shell._stack.at(-1).s.back=()=>{shell._stack.at(-1).s.back=null;shell.back();};
    }
    function decorateBoard(){const buttons=shell.root.querySelectorAll('.esh-btns button');const sites=C.sites.filter(s=>available(s));buttons.forEach((b,i)=>{const s=sites[i];if(!s)return;b.dataset.family=s.family;b.addEventListener('focus',()=>uiState.focusedSite=s.id);if(b===document.activeElement)uiState.focusedSite=s.id;const text=document.createElement('span');text.className='site-detail';text.textContent=s.hazard;b.append(text);});}
    function available(site){const w=app.world;if(site.final)return w.rings.every(Boolean);if(site.cache)return w.rings[0]&&!w.caches[site.id];return !w.rings[site.index]&&(site.index===0||w.rings[0]);}
    function showBoard(){
      const w=app.world,chooser=app.net?app.net.routeChooser:0,isChooser=!app.net||app.net.localSeat===chooser,chooserName=app.net?app.net.info?.players?.[chooser]?.name||'Hero '+(chooser+1):'Hero 1';
      shell.hide();show('board',{kicker:`The enchanted roads · ${w.rings.filter(Boolean).length} / 4 rings`,title:'Choose the next threshold',text:`⌛ Dread ${w.dread} / 6 · entering a site adds 1\nCompany ${w.heroes.map(h=>h.hp+'/5').join(' · ')}\n${chooserName} chooses the road. Each hero may change at this waystone.`,actions:C.sites.filter(available).map(site=>({label:site.name,disabled:!isChooser,fn:()=>{if(!app.net&&app.menuSeat!==0){shell.toast('Hero 1 chooses the road','You may change your own hero at this waystone.');return;}show('destination',{kicker:site.cache?'Optional detour':'The next theft',title:site.name,text:site.description+'\n'+site.hazard+'\nDread '+w.dread+' → '+Math.min(6,w.dread+1)+' / 6. '+(site.final?'Four recovered rings open this gate.':'The entry charge is paid once; room two and Continue are free.'),actions:[{label:'Enter '+site.name,primary:true,fn:()=>{shell.hide();app.intent({type:'route',value:site.id});lastMode='';}},['Choose another road',()=>shell.back()]]});}})).concat([
        {label:'Change my hero',primary:false,disabled:!!app.net&&app.net.localSeat<0,fn:()=>select(app.net?app.net.localSeat:app.menuSeat,true)},
        ...(!app.net&&app.localHumans<2?[{label:'Change companion / Hero 2',primary:false,fn:()=>select(1,true)}]:[]),
        ['Pause / Settings',()=>game.menu()],
      ]),footer:w.shortcuts.length?'Open shortcuts: '+w.shortcuts.join(' · '):'The Hollow Crown must fall before the other roads awaken.',back:()=>game.menu()});
    }
    function failed(){shell.hide();show('failure',{kicker:'The circle remains unbroken',title:'Both lights have fallen',text:'Retry this chamber with the rings already secured. Dread rises by one, up to six. The finale’s four seals reset together on a full wipe.',actions:[
      {label:'Retry chamber · +1 Dread',fn:()=>{shell.hide();app.intent({type:'retry'});lastMode='';},disabled:!!app.net&&app.net.localSeat!==app.net.routeChooser},
      {label:'Return to expedition board',fn:()=>{shell.hide();app.intent({type:'board'});lastMode='';},disabled:!!app.net&&app.net.localSeat!==app.net.routeChooser},
      {label:'Quit to title',disabled:!!app.net,fn:()=>app.toTitle()},
    ],back:()=>{}});}
    function victory(){const w=app.world;shell.hide();show('results',{kicker:'The fourth circle closes',title:'Morning belongs to two',text:C.dialogue.victory,emblem:'◉',stats:[[4,'RINGS RETURNED'],[w.stats.revives,'HANDS RAISED'],[w.dread+'/6','FINAL DREAD'],[Math.floor(w.time/60)+':'+String(Math.floor(w.time%60)).padStart(2,'0'),'EXPEDITION TIME']],medals:[['The fourfold compact',true],['Unassisted expedition',!w.assisted]],actions:[
      {label:'Another Expedition',disabled:!!app.net,fn:()=>app.toTitle(true)},['Credits & the making',about],{label:'Return to title',disabled:!!app.net,fn:()=>app.toTitle()},
    ],footer:'Original procedural art, animation and score · Built with my-3D2dge · Inspired by Quest for the Rings (1981).',back:()=>{}});}
    function about(){show('about',{kicker:'The making of the compact',title:'About / Credits',text:'An original adaptation of Quest for the Rings (1981). The rings, kingdoms, heroes and prose here are newly made. Research, development and verification details follow.',actions:[['Source Information',()=>source(0)],['Testing Feedback',()=>feedback('testingFeedback','Testing Feedback')],['Engine Feedback',()=>feedback('engineFeedback','Engine Feedback')],['Prompt Feedback',()=>feedback('promptFeedback','Prompt Feedback')],['Credits',()=>show('credits',{title:'The hands behind the circle',sections:[['Design, engineering, art & score','OpenAI gpt-6.1-sol · reasoning effort ultra. Built in Codex CLI on Linux. Original assets and code-created music, effects and gibberish.'],['Native engine','my-3D2dge 0.89.1 · Michael Crosato. Native shaded pixel rendering, continuous Humanoid rigs, Attack timelines, TileMap, input, Shell and settings.'],['Online session client','AI Hub Session Protocol v1 · client 1.4.0 · Michael Crosato. Supplied session client included unmodified.'],['Historical source','Quest for the Rings (1981), Odyssey². Manual transcript and illustrated scan archived at odyssey2.info. This original tribute uses newly authored fiction and assets.']],actions:[['Back',()=>shell.back()]]})],['Back',()=>shell.back()]]});}
    function source(page){aboutPage=page;const data=globalThis.RingInterview?.sourceInformation||{};const entries=Object.entries(data),size=5,pages=Math.ceil(entries.length/size);show('source',{kicker:'Source Information · '+(page+1)+' / '+pages,title:'Source Information',sections:entries.slice(page*size,(page+1)*size).map(([k,v])=>[k.replace(/([A-Z])/g,' $1'),v]),actions:[...(page+1<pages?[['Next page',()=>{shell._stack.pop();source(page+1);}]]:[]),...(page>0?[['Previous page',()=>{shell._stack.pop();source(page-1);}]]:[]),['Back to About',()=>{shell._stack.pop();shell._render();}]]});}
    function feedback(key,title){const values=globalThis.RingInterview?.[key]||['unknown'];const qs={testingFeedback:['Issues found','Critical / game breaking','Most helpful test','Least helpful test'],engineFeedback:['Liked most','Stuck or guessed wrong','Most important custom system','Hardest engine aspect','Engine changes and reasons','One engine improvement'],promptFeedback:['Liked most','Confusing','Hardest task','One prompt improvement']}[key];let page=0;const render=()=>show('feedback',{kicker:title+' · '+(page+1)+' / '+values.length,title:qs[page],text:values[page],actions:[...(page+1<values.length?[['Next',()=>{page++;shell._stack.pop();render();}]]:[]),...(page>0?[['Previous',()=>{page--;shell._stack.pop();render();}]]:[]),['Back to About',()=>shell.back()]]});render();}
    function dev(){const w=app.world;if(!w)return;const authority=!app.net||app.net.authority;for(const k of Object.keys(C.tuning))game.settings['tune_'+k]=w.tuning[k];show('dev',{kicker:'Development · runs using mutations are marked assisted',title:'The Ringmaster’s workshop',text:authority?'Live tuning takes effect immediately. Reset restores the authored balance.':'Read-only guest inspector. Only the authority can change the shared world.',rows:['#Live balance',...Object.keys(C.tuning).map(k=>'tune_'+k)],actions:[
      {label:'Reset tuning to defaults',disabled:!authority,fn:()=>{app.dev('reset');dev();}},
      {label:'Heal / revive both heroes',disabled:!authority,fn:()=>app.dev('heal')},
      {label:'Invulnerability: '+(w.invulnerable?'ON':'OFF'),disabled:!authority,fn:()=>{app.dev('invulnerable',!w.invulnerable);dev();}},
      {label:'Restart checkpoint',disabled:!authority,fn:()=>{shell.hide();app.dev('restart');lastMode='';}},
      {label:'Jump to authored room',disabled:!authority,fn:()=>show('roomJump',{title:'Choose a room',text:'This marks the expedition assisted.',actions:Object.values(C.rooms).map(r=>[r.name,()=>{shell.hide();app.dev('jump',r.id);lastMode='';}]).concat([['Back',()=>shell.back()]])})},
      {label:'Spawn a threat',disabled:!authority,fn:()=>show('spawn',{title:'A threat, upon safe stone',actions:['fighter','fire','spider','nightmare'].map(kind=>[kind,()=>{app.dev('spawn',kind);shell.toast('Threat summoned',kind);}]).concat([['Back',()=>shell.back()]])})},
      {label:'Spawn a telegraphed flame lane',disabled:!authority,fn:()=>app.dev('hazard')},
      ['Collision overlay: '+(uiState.debug.collision?'ON':'OFF'),()=>{uiState.debug.collision=!uiState.debug.collision;dev();}],
      ['Navigation overlay: '+(uiState.debug.nav?'ON':'OFF'),()=>{uiState.debug.nav=!uiState.debug.nav;dev();}],
      ['Telegraph overlay: '+(uiState.debug.telegraphs?'ON':'OFF'),()=>{uiState.debug.telegraphs=!uiState.debug.telegraphs;dev();}],
      ['State / companion inspector',inspector],['Back',()=>shell.back()],
    ]});}
    function inspector(){const w=app.world;show('inspector',{kicker:'Observational state · tick '+w.tick,title:'The expedition’s pulse',sections:[['World',`${w.mode} / ${w.roomId} · epoch ${w.epoch}\nRings ${w.rings.map(x=>x?'●':'○').join(' ')} · Dread ${w.dread}/6\nSeed ${w.seed} · ${w.assisted?'ASSISTED':'normal'}`],['Companion',w.heroes.map(h=>`${h.id} ${h.classId} · ${h.ai?'AI: '+h.aiState:h.device}\n${h.hp}/5 health · (${h.x.toFixed(0)}, ${h.y.toFixed(0)})`).join('\n')],['Ringmaster',`${w.director.event}: ${w.director.reason}\nBudget ${w.director.budget}; events ${w.director.count}`],['Network',app.net?JSON.stringify(app.net.inspect()):'Standalone · no transport']],actions:[['Refresh',()=>{shell._stack.pop();inspector();}],['Back',()=>shell.back()]]});}
    function reconnect(seat){app.waitingSeat=seat;show('reconnect',{title:'A controller has fallen silent',text:'Reconnect and press a button, or let your companion take this hand. The standalone expedition waits.',actions:[[seat===0?'Continue with keyboard + companion':'Continue with AI',()=>{app.useAI(seat);shell.hide();}],['Keep waiting',()=>shell.toast('Waiting for a controller','Press any button on the reconnected controller.')]],back:()=>{}});game.pause('controller');}
    function sync(){const w=app.world;if(!w)return;
      if(!app.attract&&w.mode!==lastMode){if(w.mode==='board')showBoard();if(w.mode==='failed')failed();if(w.mode==='victory')victory();if(['courtyard','room'].includes(w.mode)&&['board','destination','failure','results','select'].includes(shell.screen))shell.hide();lastMode=w.mode;}
      if(w.mode==='board'&&!shell.screen&&!app.attract)showBoard();
      if(lastRoom!==w.roomId&&!app.attract){lastRoom=w.roomId;if(game.settings.hints&&['room','courtyard'].includes(w.mode))shell.tutorial(C.rooms[w.roomId].name,w.roomId==='courtyard'&&game.input.lastDevice==='touch'?'Drag left to move and right to aim. Primary attacks are assisted. Use the class and evade actions when they appear; hold the context action to help. Reach the golden waystone.':C.rooms[w.roomId].tutorial,18);}
      if(w.announcement!==lastAnnouncement&&w.announcementUntil>w.time&&!app.attract){lastAnnouncement=w.announcement;if(game.settings.subtitles){const caption=document.getElementById('caption');caption.textContent=w.announcement;caption.classList.add('on');}RingAudio.event({type:'voice',id:'line-'+w.epoch+'-'+w.announcement,caption:w.announcement,role:w.announcement.startsWith('Companion:')?w.heroes.find(p=>p.ai)?.classId||'warrior':'ringmaster'});}
      const caption=document.getElementById('caption');if(caption){caption.classList.toggle('on',!shell.screen&&!app.attract&&w.announcementUntil>w.time&&game.settings.subtitles);caption.classList.toggle('above-tutorial',!shell._els.tut.hidden);}
      const h=w.heroes[Math.max(0,app.net?app.net.localSeat:0)],context=S.context(w,h);const prompt=context?{act:'interact',label:context.label,...(context.type==='revive'||context.type==='station'?{progress:context.progress}:{} )}:null;
      shell.hud({objective:{step:`${w.rings.filter(Boolean).length} / 4 RINGS${w.assisted?' · ASSISTED':''}`,title:S.objective(w)},status:app.attract?'DEMONSTRATION':app.net?'AI HUB · SHARED WORLD':'TWO HANDS · ONE QUEST',bars:w.heroes.map(p=>({label:C.heroes[p.classId].name+(p.ai?' · companion':' · hero '+p.id)+(p.down?' · DOWN':''),value:p.hp,max:5,kind:'pips',color:C.heroes[p.classId].color})),counts:[['Dread',w.dread+' / 6'],['Class power',h.powerCd>0?h.powerCd.toFixed(1)+'s':'Ready']],prompt,keys:[[game.input.label('attack'),'Primary'],[game.input.label('skill'),'Class'],[game.input.label('dash'),'Dodge'],[game.input.label('ping'),'Companion']],place:C.rooms[w.roomId].name});
    }
    return {shell,state:uiState,title,select,showBoard,about,dev,reconnect,sync,invalidate:()=>{lastMode='';lastRoom='';},help:()=>show('help')};
  }
  globalThis.RingUI={create};
})();
