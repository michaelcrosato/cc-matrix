/* Wee Serene — Institute for Gentle Improvement. */
(() => {
'use strict';
const E = My3D2dge;
const G = window.G = { E, title: 'Wee Serene', scenes: {}, activities: {}, families: {}, mode: 'story', sceneName: 'title', source: 'keyboard', lastKey: -99, idle: 0, attracting: false, time: 0, slot: 0, context: null, visited: new Set(), issues: [], version: 1 };
const D = E.Input.DEFAULT;
G.INPUT = { up:D.up, down:D.down, left:D.left, right:D.right, start:D.start, pause:D.pause, confirm:D.confirm, cancel:D.cancel,
 breath:['Space','Mouse0','Pad6','Pad7'], catchL:['KeyQ','Mouse0','Pad4'], catchR:['KeyE','Mouse2','Pad5'], jump:['Space','Pad0'], interact:['KeyE','Enter','Pad0'], more:['Tab','KeyM','Pad3'], retry:['KeyR','Pad2'], paceL:['KeyJ','Mouse0','Pad6'], paceR:['KeyK','Mouse2','Pad7'], stepL:['KeyA','ArrowLeft','Mouse0','Pad14','PadAxisLeft'], stepR:['KeyD','ArrowRight','Mouse2','Pad15','PadAxisRight'], stepU:['KeyW','ArrowUp','WheelUp','Pad12','PadAxisUp'], stepD:['KeyS','ArrowDown','WheelDown','Pad13','PadAxisDown'] };
G.CLASS_INPUT = {up:D.up,down:D.down,left:D.left,right:D.right,start:D.start,pause:D.pause,confirm:D.confirm,cancel:D.cancel,breath:['Space','Pad6','Pad7'],catchL:['KeyQ','Pad4'],catchR:['KeyE','Pad5']};
G.palette = {paper:'#f6fafa',ink:'#20404c',muted:'#607d84',cyan:'#14aec3',mint:'#bfeee0',coral:'#ff7a59',oak:'#d9b68a',maple:'#ecd3ac',sea:'#49b6c9',gold:'#eab858',line:'#c9dfe0'};
G.DEFS = [
 ['k','Responsiveness',1,25,.5,1,'Lean'],['c','Damping',1,14,.25,1,'Lean'],['s','Instability',0,2,.05,1,'Lean'],['A','Tremble',0,2,.05,1,'Lean'],['nf','Tremble speed',.2,3,.1,1,'Lean'],['ring','Ring size',.5,2,.05,1,'Lean'],['push','Push strength',0,2,.1,1,'Lean'],['threshold','Stumble edge',.6,1.6,.05,1,'Lean'],['reach','Mouse reach',.15,.6,.01,.33,'Lean'],['nudge','Key nudge',1,4,.1,2.2,'Lean'],
 ['star1','One star',.1,.6,.01,.35,'Scoring'],['star2','Two stars',.5,.9,.01,.65,'Scoring'],['star3','Three stars',.75,1,.01,.90,'Scoring'],['repTolerance','Rep tolerance',.03,.2,.01,.08,'Scoring'],['rhythmWindow','Beat window',.5,2,.1,1,'Scoring'],['fatigue','Fatigue',0,2,.1,1,'Scoring'],
 ['hoopLow','Hoop low',3,10,.25,7,'Cardio'],['hoopHigh','Hoop high',10,18,.25,11,'Cardio'],['jogLow','Cadence low',1,3,.1,2.6,'Cardio'],['jogHigh','Cadence high',3,5,.1,3.4,'Cardio'],['jogSpeed','Jog speed',.5,2,.1,1,'Cardio'],
 ['slalomSpeed','Ski speed',100,400,10,220,'Games'],['slalomTurn','Ski turn',50,300,10,165,'Games'],['gravity','Tray gravity',100,800,20,420,'Games'],['friction','Tray friction',.1,3,.1,1.5,'Games'],['rope','Rope instability',4,22,.5,12,'Games'],['gust','Gust strength',0,15,.5,4.5,'Games'],['timeScale','Time scale',0,3,.25,1,'World'],['minutes','Minutes earned',.5,5,.25,1,'World']
];
G.DEV = Object.fromEntries(G.DEFS.map(d=>[d[0],d[5]]));
G.dev = {open:false,group:'Tools',row:0,page:0,bot:null,noFalls:false,trace:false,frame:false,pose:'111_39_part1',poseTime:4,day:1,tier:1,stars:3};
G.resetDev = () => {for(const d of G.DEFS)G.DEV[d[0]]=d[5];G.dev.bot=null;G.dev.noFalls=false;G.dev.trace=false;G.dev.frame=false;if(G.game)G.game.timeScale=1;};
G.clone = o => JSON.parse(JSON.stringify(o));
G.memberDefault = () => ({version:1,name:'Gentle Doug',avatar:{hair:'short',skin:0,top:0,bottom:0,hat:0},instructor:'Birch',day:1,sessions:0,minutes:0,best:{},spineAge:71,history:[71],ended:false,checked:false,arrived:false,duelWin:false,tareDay:false,lastVisit:Date.now(),dailyScores:[]});
G.member=G.memberDefault();
G.rng=E.rng(1287);
G.activity = spec => { G.activities[spec.id]=spec; };
G.stars = (pct, a) => {const t=a && a.stars || [G.DEV.star1,G.DEV.star2,G.DEV.star3];return t.reduce((n,x)=>n+(pct+1e-6>=x),0);};
G.best = (id,tier=1) => G.member.best[id+'-'+tier] || {stars:0,pct:0};
G.suggestion = () => {const choices=Object.values(G.activities).filter(a=>a.day<=G.member.day);return choices[(G.member.day*7-7)%choices.length]?.id || 'stork';};
G.calculateAge = (m=G.member) => {let sum=0;for(const discipline of ['Stillness','Strength','Cardio','Balance']){const aa=Object.values(G.activities).filter(a=>a.discipline===discipline);sum+=aa.reduce((n,a)=>n+(m.best[a.id+'-1']?.stars||0)*100/3,0)/aa.length;}return Math.min(71,Math.round(78-.58*sum/4))-(m.duelWin?1:0);};
G.unlocked = (a,tier=1) => G.member.ended || (a.day<=G.member.day && (tier===1 || (G.member.day>=4 && G.best(a.id).stars>=2)));
G.persist = () => {if(!G.inSession&&!G.attracting){G.member.lastVisit=Date.now();G.game.saves.save(G.slot);}};
G.validMember=m=>!!(m&&m.version===1&&typeof m.name==='string'&&Number.isInteger(m.day)&&m.day>=1&&m.day<1000&&Number.isFinite(m.minutes)&&m.minutes>=0&&Number.isInteger(m.sessions)&&m.sessions>=0&&m.sessions<=3&&m.avatar&&m.best&&typeof m.best==='object'&&Object.values(m.best).every(b=>b&&Number.isInteger(b.stars)&&b.stars>=0&&b.stars<=3&&Number.isFinite(b.pct)&&b.pct>=0&&b.pct<=1));
G.loadMember = slot => {if(!G.validMember(G.game.saves.get(slot)?.data))return false;const saved=G.game.saves.load(slot);if(saved){G.slot=slot;return true;}return false;};
G.refreshAge = () => {if(G.member.day!==3)G.member.spineAge=G.calculateAge();};
G.record = (ctx) => {
 const c=ctx.contestants[0], a=ctx.a, pct=E.clamp(a.result(ctx,c).pct,0,1), stars=G.stars(pct,a);const out={pct,stars,detail:a.result(ctx,c).detail,minutes:ctx.duration/60*(1+.25*stars)*(a.id===G.suggestion()?1.5:1)*G.DEV.minutes};
 if(!G.attracting && !G.inSession && G.mode!=='class') {const key=a.id+'-'+ctx.tier, old=G.best(a.id,ctx.tier);if(pct>=old.pct)G.member.best[key]={pct,stars};G.member.minutes+=out.minutes;G.refreshAge();G.persist();}
 return out;
};
G.go = (name,data,instant=false) => {G.sceneName=name;G.visited.add(name);if(G.closeDev)G.closeDev();else G.dev.open=false;G.talk?.close();G.game.go(name,data,{fade:instant||G.game.fadeTime===0?0:'iris',seconds:.28});};
G.settings = () => {G.game.shell.show('settings');};
G.inSession=!!(window.AIHub&&window.AIHub.active);
const game = G.game = new E.Game({canvas:'screen',id:'wee-serene-20261104',res:'ps1',expand:true,view:'brawler',views:['brawler','threequarter','side'],input:G.INPUT,touch:'never',autoPause:!G.inSession,live:G.inSession,fullscreen:G.inSession?false:'button',draw:true,
 menu:{quit:G.inSession?false:'title',items:G.inSession?[]:[['Restart session',()=>{game.shell.hide();if(G.context)G.startSession(G.context.a.id,G.context.tier,G.mode);}],['Dev Mode',()=>{game.shell.hide();game.paused=false;G.openDev();}]],
 settings:[{key:'music',value:.1},{key:'glyphs',value:'playstation'},{key:'voice',label:'Voice',type:'slider',min:0,max:1,step:.05,value:.65,group:'Sound'},{key:'gentle',label:'Gentle Mode',value:false,group:'Game'},{key:'breathToggle',label:'Breath toggle',value:false,group:'Game'},{key:'tips',label:"Tare's tips",value:true,group:'Game'}],
 controls:{breath:'Breathe / effort',catchL:'Catch left',catchR:'Catch right',interact:'Talk / choose mat',more:'Activity directory',paceL:'Jog left step',paceR:'Jog right step',stepL:'Step left',stepR:'Step right',stepU:'Step forward',stepD:'Step back',retry:false,jump:'Jump'}}});
window.__game=game;
new E.Shell(game,{theme:{ink:G.palette.ink,paper:G.palette.paper,accent:G.palette.cyan,muted:G.palette.muted,danger:'#d65c45',line:G.palette.line,font:'system-ui, sans-serif',titleFont:'system-ui, sans-serif'}});
game.saves.slots=3;game.saves.canSave=false;
game.saves.write=()=>({data:G.clone(G.member),place:'Day '+G.member.day+' · Lumbar Island',level:G.member.day});
game.saves.read=s=>{const m=s.data;if(!G.validMember(m))return;G.member=Object.assign(G.memberDefault(),G.clone(m));G.member.avatar=Object.assign(G.memberDefault().avatar,m.avatar||{});G.slot=s.slot;};
G.canvas = typeof document!=='undefined' ? document.getElementById('screen') : null;
if(typeof document!=='undefined'){
 document.addEventListener('keydown',()=>{G.lastKey=game.input.clock;G.source='keyboard';});
 document.addEventListener('pointerover',e=>{const b=e.target.closest&&e.target.closest('.esh-sh button:not(:disabled), .esh-sh input:not(:disabled)');if(b&&e.pointerType==='mouse')b.focus({preventScroll:true});});
}
game.debug={snapshot(){const ctx=G.context,c=ctx?.contestants[0];return {scene:G.sceneName,activity:ctx?.a.id||null,tier:ctx?.tier||1,phase:G.sessionPhase||null,day:G.member.day,session:G.member.sessions,pct:c?ctx.a.result(ctx,c).pct:0,stars:G.result?.stars||0,minutes:G.member.minutes,spineAge:G.member.spineAge,lean:c?[c.bal.x,c.bal.y]:[0,0],source:G.source,attract:G.attracting,attractItem:G.attractItem,dev:G.dev.open,ended:G.member.ended,errors:game.errors.length};}};
})();
