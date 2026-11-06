(() => {
const E=My3D2dge,G=window.GAME,{text,box}=G.OpArt,{px}=E;
const groups=[
 ['Patient',[['drain','Drain',0,3,.1],['slipDamage','Slip damage',0,3,.1],['healing','Healing',.2,3,.1],['syringeDose','IV dose',6,36,1],['clock','Clock multiplier',.4,2,.1]]],
 ['Hands',[['cursorSpeed','Cursor speed',120,550,10],['fine','Fine factor',.1,.7,.05],['curve','Stick curve',1,2.6,.1],['assist','Surgical assist',0,1,.05],['magnet','Magnet radius',0,36,2],['tolerance','Grade tolerance',.5,2,.1]]],
 ['Strains',[['strainSpeed','Strain speed',.2,2,.1],['strainHealth','Strain health',.2,2,.1],['spawnRate','Spawn rate',.2,2,.1],['strainDamage','Strain damage',0,3,.1],['staccatoBeat','Staccato beat',.7,3,.1]]],
 ['The Steady',[['charge','Charge rate',.2,3,.1],['breathDrain','Breath drain',4,30,1],['breathFactor','World speed',.1,.8,.05],['rewindSeconds','Rewind seconds',1,9,1]]],
 ['Fluids',[['bleed','Bleeding',0,3,.1],['suction','Suction rate',20,140,10],['cauteryHeat','Heat gain',.1,1,.05]]]
];
function make(game,R){
 const d={open:false,tab:0,page:0,row:0,caseId:1,phase:0,spawn:0,story:0,drag:false,speed:1};
 const stored=E.store.get('second-signal-dev-tuning',null);if(stored)for(const k in G.DEFAULTS)if(Number.isFinite(stored[k]))G.TUNING[k]=stored[k];
 function mark(){if(R.S)R.S.dev=true;E.store.set('second-signal-dev-tuning',G.TUNING);}
 function rows(){
  if(d.tab===0)return [...groups[d.page][1].map(([key,label,min,max,step])=>({key,label,min,max,step,get:()=>G.TUNING[key],set:v=>{G.TUNING[key]=v;mark();}})),{label:'Reset this page',act:()=>{for(const [key] of groups[d.page][1])G.TUNING[key]=G.DEFAULTS[key];mark();}},{label:'Reset all tuning',act:()=>{Object.assign(G.TUNING,G.DEFAULTS);mark();}}];
  if(d.tab===1)return [['lockVitals','Lock pulse'],['freezeClock','Freeze clock'],['infiniteGift','Infinite Steady'],['oneHit','One-hit strains'],['reveal','Reveal hidden'],['radii','Show hit radii'],['bot','Autosurgeon']].map(([key,label])=>({label,get:()=>G.cheats[key]?'ON':'OFF',act:()=>{G.cheats[key]=!G.cheats[key];mark();}})).concat({label:'Time speed',get:()=>game.timeScale,act:()=>{const v=[.25,.5,1,2];game.timeScale=v[(v.indexOf(game.timeScale)+1)%4];mark();}});
  if(d.tab===2){const c=G.cases.find(c=>c.id===d.caseId);return [
   {label:'Case: '+c.name,get:()=>d.caseId,min:1,max:12,step:1,set:v=>{d.caseId=v;d.phase=0;}},
   {label:'Jump to phase',get:()=>d.phase+1,min:1,max:c.phases.length,step:1,set:v=>d.phase=v-1,act:()=>{G.startCase(d.caseId,'dev',d.phase);}},
   {label:'Force win',act:()=>{if(R.S){R.S.dev=true;R.S.mode='won';}}},
   {label:'Force lost / Code Blue',act:()=>{if(R.S){if(R.S.mode==='blue')R.S.mode='lost';else G.Op.triggerBlue(R.S);R.S.dev=true;}}},
   {label:'Spawn '+Object.keys(G.objects)[d.spawn],get:()=>d.spawn,min:0,max:Object.keys(G.objects).length-1,step:1,set:v=>d.spawn=v,act:()=>{if(R.S){const p=R.cursors[0]||{x:213,y:116};G.Op.add(R.S,{type:Object.keys(G.objects)[d.spawn],x:p.x,y:p.y});mark();}}},
   {label:'Story '+Object.keys(G.stories)[d.story],get:()=>d.story,min:0,max:Object.keys(G.stories).length-1,step:1,set:v=>d.story=v,act:()=>game.go('story',{id:Object.keys(G.stories)[d.story],next:'menu'})},
   {label:'Unlock all cases',act:()=>{R.save.unlocked=11;R.persist();}},
   {label:'Clear campaign save',act:()=>{R.save={next:1,unlocked:1,ranks:{},difficulty:'Resident',cleared:[]};R.persist();}}
  ];}
  return [{label:'Seed '+(R.S?.seed||0)},{label:'Phase '+(R.S?R.S.phase+1:0)+' / '+(R.S?.objects.length||0)+' objects'},{label:'Hash '+(R.S?G.hash({...R.S,ev:[]}):'none')},{label:'Copy tuning',act:()=>{const s=JSON.stringify(G.TUNING,null,2);if(typeof navigator!=='undefined'&&navigator.clipboard)navigator.clipboard.writeText(s).catch(()=>{});console.log(s);game.note('Tuning copied');}},{label:'Reset all cheats',act:()=>{for(const k of Object.keys(G.cheats))delete G.cheats[k];game.timeScale=1;}}];
 }
 function update(dt){if(!d.open)return false;const I=game.input,rs=rows(),W=Math.max(166,Math.floor(game.W*.36));d.width=W;d.row=Math.max(0,Math.min(d.row,rs.length-1));
  if(I.pressed('cancel')){d.open=false;I.consumeAll();return false;}
  if(I.pressed('toolNext')){d.tab=(d.tab+1)%4;d.row=0;I.consumeAll();}
  if(I.pressed('toolPrev')){d.tab=(d.tab+3)%4;d.row=0;I.consumeAll();}
  if(I.repeat('down'))d.row=(d.row+1)%rs.length;if(I.repeat('up'))d.row=(d.row+rs.length-1)%rs.length;
  const ptr=I.pointer(),click=I.clicked();if(ptr&&I.mouse.t!==d.mouseTime){d.mouseTime=I.mouse.t;if(ptr[0]<W&&ptr[1]>=44&&ptr[1]<44+rs.length*22)d.row=Math.floor((ptr[1]-44)/22);}
  const row=rs[d.row],dir=I.repeat('right')?1:I.repeat('left')?-1:0;
  const set=(row,v)=>row.set(Math.round(Math.max(row.min,Math.min(row.max,v))*100)/100);
  if(dir&&row.set)set(row,row.get()+row.step*dir);
  if(I.pressed('confirm')||click&&click[0]<W){if(d.tab===0&&click&&click[1]<39)d.page=(d.page+1)%groups.length;else if(row.act)row.act();I.consumeAll();}
  if(d.tab===0&&I.pressed('consult')){d.page=(d.page+1)%groups.length;d.row=0;}
  if(ptr&&ptr[0]<W&&I.down('useTool')&&row.set&&ptr[1]>=44&&ptr[1]<44+rs.length*22){const t=Math.max(0,Math.min(1,(ptr[0]-12)/(W-24))),v=row.min+Math.round(t*(row.max-row.min)/row.step)*row.step;set(row,v);}
  return !!(ptr&&ptr[0]<W&&I.lastDevice==='mouse');
 }
 function draw(r){if(!d.open)return;r.overlay(g=>{const W=d.width||166;box(g,0,0,W,r.H,'#85bcae','#102b36');text(g,'DEV MODE',9,8,'#f0d69b',{scale:2});text(g,['TUNING','CHEATS','JUMP','INFO'][d.tab],9,29,'#b7e5d2');if(d.tab===0)text(g,groups[d.page][0]+' >',W-9,29,'#ead9a3',{align:'right'});
  rows().forEach((row,i)=>{const y=44+i*22,sel=i===d.row;if(sel)px.rect(g,4,y-2,W-8,21,'#365c63');text(g,row.label.slice(0,28),9,y+1,sel?'#fff0c2':'#c5ded0');
   if(row.set){const v=row.get(),t=(v-row.min)/(row.max-row.min);E.ui.bar(g,10,y+13,W-54,3,t,'#8bd8b8');const def=G.DEFAULTS[row.key];if(def!==undefined)px.line(g,10+(W-54)*(def-row.min)/(row.max-row.min),y+11,10+(W-54)*(def-row.min)/(row.max-row.min),y+17,'#f0e0b1');text(g,String(v),W-9,y+10,'#d7f0ce',{align:'right'});}
   else if(row.get)text(g,String(row.get()),W-10,y+10,'#f2d8a5',{align:'right'});
  });text(g,game.input.label('toolPrev')+'/'+game.input.label('toolNext')+' TAB',8,r.H-23,'#a8cfc0');text(g,game.input.label('cancel')+' CLOSE  '+game.input.label('consult')+' PAGE',8,r.H-11,'#a8cfc0');
 });}
 return {state:d,open(){d.open=true;game.resume();if(R.S)R.S.dev=true;},update,draw,groups};
}
G.Dev={make,groups};
})();
