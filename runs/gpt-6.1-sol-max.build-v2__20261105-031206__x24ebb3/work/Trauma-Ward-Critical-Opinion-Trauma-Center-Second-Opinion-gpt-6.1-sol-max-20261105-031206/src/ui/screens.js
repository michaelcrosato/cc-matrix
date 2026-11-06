import {C,rect,line,circle,diamond,text,centered,paragraph,panel,keycap,waveform,toolIcon,padGlyph,labelize} from './draw.js';
import {TITLE,TAGLINE} from '../core/meta.js';
import {TOOLS,OPS,CONSULT,opById,TOOL_HELP} from '../content/ops.js';
import {SCENES,CAST} from '../content/story.js';
import {results,validTool,targetPoint,INJECTION} from '../sim/op.js';
import {SLIDERS} from '../core/config.js';
import {INTERVIEW} from '../content/about.js';
import {SEAT_COLORS} from '../view/field.js';

export function menu(a,title,subtitle,entries,{left=false,width=302,top=49}={}){
 const h=a.ctx.hud,w=Math.min(width,h.width-24),x=left?18:Math.round((h.width-w)/2),maxRows=Math.max(2,Math.min(7,Math.floor((h.height-top-61)/20)));
 a.entries=entries;a.focus=Math.max(0,Math.min(entries.length-1,a.focus));
 if(a.focus<a.scroll)a.scroll=a.focus;if(a.focus>=a.scroll+maxRows)a.scroll=a.focus-maxRows+1;
 a.scroll=Math.max(0,Math.min(Math.max(0,entries.length-maxRows),a.scroll));
 const shown=entries.slice(a.scroll,a.scroll+maxRows),ht=37+shown.length*20;
 panel(h,x,top,w,ht);text(h,x+11,top+10,title,C.teal);text(h,x+11,top+23,subtitle,C.dim);
 a.ui=[];
 for(let i=0;i<shown.length;i++){
  const e=shown[i],idx=i+a.scroll,y=top+36+i*20,active=idx===a.focus;
  if(active){rect(h,x+5,y-2,w-10,19,C.edge);rect(h,x+5,y-2,2,19,C.teal);text(h,x+10,y+3,'>',C.teal);}
  const label=e.label;let yy=y+3;text(h,x+21,yy,label,e.disabled?C.edge:active?C.ivory:C.dim);
  if(e.value!=null){const val=String(typeof e.value==='function'?e.value():e.value);text(h,x+w-12-h.measure(val).width,yy,val,active?C.gold:C.dim);}
  if(e.slider){const val=e.slider(),bx=x+22,by=y+13,bw=w-44;rect(h,bx,by,bw,2,C.ink);rect(h,bx,by,bw*val,2,active?C.teal:C.edge);}
  a.ui.push({x:x+5,y:y-2,w:w-10,h:19,index:idx,entry:e});
 }
 if(entries.length>maxRows)text(h,x+w-50,top+ht-2,`${a.scroll+1}-${Math.min(entries.length,a.scroll+maxRows)}`,C.dim);
 const hints=`${a.devices.prompt('confirm',a.settings)} SELECT   ${a.devices.prompt('back',a.settings)} BACK`;
 if(a.devices.last==='pad'){const x=h.width/2-75;padGlyph(h,x,h.height-17,'cross',a.settings.glyphs==='Xbox');text(h,x+14,h.height-16,'SELECT',C.dim);padGlyph(h,x+86,h.height-17,'circle',a.settings.glyphs==='Xbox');text(h,x+100,h.height-16,'BACK',C.dim);}else centered(h,h.height-16,hints,C.dim);
 return {x,y:top,w,h:ht};
}
export function frame(a,label){const h=a.ctx.hud;rect(h,0,0,h.width,24,C.ink);text(h,12,8,'VERITY GENERAL',C.teal);text(h,h.width-12-h.measure(label).width,8,label,C.dim);}
export function drawTitle(a){
 const h=a.ctx.hud,x=Math.max(20,(h.width-480)/2+22),y=Math.max(53,h.height*.23);
 rect(h,0,0,h.width,2,C.teal);text(h,x,20,'PORT VERITY / 03:07',C.dim);
 text(h,x,y,'TRAUMA',C.ivory,3);text(h,x,y+26,'WARD',C.ivory,3);
 waveform(h,x,y+56,210,a.age*.14,C.teal);
 h.text(x,y+76,'CRITICAL OPINION',{color:C.gold,scale:2,shadow:C.ink});
 text(h,x,y+99,TAGLINE.toUpperCase(),C.dim);
 if(Math.sin(a.age*3)>-.65){if(a.devices.last==='pad'){padGlyph(h,x,y+124,'cross',a.settings.glyphs==='Xbox');text(h,x+15,y+124,'SCRUB IN',C.ivory);}else text(h,x,y+124,'[ ENTER / CLICK TO SCRUB IN ]',C.ivory);}
 text(h,x,h.height-29,'A SURGICAL DRAMA',C.teal);text(h,x,h.height-16,'1-4 SURGEONS / TEN OPERATIONS',C.dim);
 text(h,h.width-72,20,'OR - 7',C.teal);a.ui=[];a.entries=[];
}
export function drawMain(a){frame(a,'THE NIGHT SHIFT');const h=a.ctx.hud;const x=Math.max(18,(h.width-480)/2+18);text(h,x,38,'THE TRUTH, STAT.',C.gold,2);
 const entries=[];if(a.save.next>0&&a.save.next<10)entries.push({label:'CONTINUE SHIFT',value:`${a.save.next+1}/10`,action:()=>a.startStory(a.save.next)});
 entries.push({label:'NEW SHIFT',action:()=>a.show('difficulty')},{label:'OPERATING LOG',value:Object.keys(a.save.cleared).length+'/10',action:()=>{a.logIndex=0;a.show('log');}},
 {label:'CONSULT',value:'1-4',action:()=>a.openConsult()},{label:'SETTINGS',action:()=>a.openSettings('main')},{label:'ABOUT / CREDITS',action:()=>a.openAbout('main')});
 menu(a,'ON CALL','SCRUB IN. SOMEONE NEEDS YOU.',entries,{left:true,top:64,width:284});
}
export function drawDifficulty(a){frame(a,'NEW SHIFT');menu(a,'CHOOSE YOUR SHIFT','SAME PATIENTS. DIFFERENT PRESSURE.',[
 {label:'INTERN',value:'MORE TIME',action:()=>a.newShift('Intern')},{label:'RESIDENT',value:'STANDARD',action:()=>a.newShift('Resident')},
 {label:'ATTENDING',value:'NO HINTS',action:()=>a.newShift('Attending')},
 {label:'BACK',action:()=>a.show('main')},
 ],{top:63});}
export function drawStory(a){
 const h=a.ctx.hud,sc=SCENES[a.episode],beat=sc.beats[a.beat],c=CAST[beat.who];
 rect(h,0,0,h.width,26,C.ink);text(h,12,9,sc.title,C.teal);text(h,h.width-55,9,`${a.beat+1}/${sc.beats.length}`,C.dim);
 const ht=64,y=h.height-ht;panel(h,8,y,h.width-16,ht,C.teal);rect(h,15,y+8,3,10,C.gold);text(h,23,y+9,c.name,C.gold);
 const reveal=beat.say.slice(0,Math.floor(a.lineAge*38*a.settings.textSpeed));paragraph(h,23,y+25,reveal,h.width-53,C.ivory,1,12,2);
 text(h,h.width-12-h.measure(`${a.devices.prompt('confirm',a.settings)} NEXT  /  ESC SKIP`).width,h.height-12,`${a.devices.prompt('confirm',a.settings)} NEXT  /  ESC SKIP`,C.dim);
 a.ui=[{x:0,y:28,w:h.width,h:h.height-28,entry:{action:()=>a.advanceStory()}}];a.entries=[];
}
export function drawBriefing(a){
 const h=a.ctx.hud,op=OPS[a.episode],w=Math.min(354,h.width-26),x=(h.width-w)/2,y=29;
 panel(h,x,y,w,h.height-52,C.gold);rect(h,x+w/2-33,y-5,66,12,C.edge);text(h,x+w/2-24,y-2,'OR - 7',C.teal);
 text(h,x+17,y+23,`CASE ${String(op.n).padStart(2,'0')} / ${op.arena.toUpperCase()}`,C.dim);
 text(h,x+17,y+42,op.title,C.gold,Math.min(2,Math.floor((w-30)/h.measure(op.title).width)));
 line(h,x+17,y+64,x+w-17,y+64,C.edge);
 text(h,x+17,y+78,op.patient.name,C.ivory,1);text(h,x+17,y+93,`${op.patient.age||'--'} / ${op.patient.job}`,C.dim);
 paragraph(h,x+17,y+113,op.patient.hook,w-34,C.ivory,1,12);
 const yy=Math.min(y+151,h.height-60);text(h,x+17,yy,'ATTENDING: '+(op.surgeon==='sabine'?'S. ACHTERBERG':op.surgeon==='both'?'MARSH + ACHTERBERG':'I. MARSH'),C.teal);
 text(h,x+17,yy+14,`${a.settings.difficulty.toUpperCase()} / ${Math.floor(op.time/60)}:${String(op.time%60).padStart(2,'0')} ALLOCATED`,C.dim);
 centered(h,h.height-17,`[ ${a.devices.prompt('confirm',a.settings)} BEGIN OPERATION ]`,C.gold);
 a.ui=[{x,y,w,h:h.height-y,entry:{action:()=>a.startOperation(op,{campaign:true})}}];a.entries=[];
}
export function drawOperation(a){
 const h=a.ctx.hud,s=a.sim,def=opById(s.id),st=def.stages[s.stage],field=a.field,seat=s.seats[a.localSeat||0]||s.seats[0],table=seat.table;
 const vitals=Math.round(st.boss==='false'?99:s.vitals[table]),clock=Math.max(0,Math.ceil(s.remaining)),critical=vitals<30;
 rect(h,0,0,h.width,31,C.ink);rect(h,0,30,h.width,1,critical?C.red:C.edge);
 text(h,10,5,'VITALS',critical?C.red:C.dim);text(h,10,15,String(Math.max(0,vitals)).padStart(2,'0'),critical?C.red:C.teal,2);
 const ekgWidth=Math.min(68,h.width*.12);waveform(h,43,19,ekgWidth,s.elapsed*(critical?.4:.22),critical?C.red:C.teal);
 const clockText=`${Math.floor(clock/60)}:${String(clock%60).padStart(2,'0')}`;text(h,(h.width-h.measure(clockText,2).width)/2,8,clockText,clock<30?C.red:C.gold,2);
 if(s.quietUnlocked){const xx=h.width-119;text(h,xx,5,seat.gift==='look'?'SECOND LOOK':'THE QUIET',s.quiet?C.teal:C.dim);rect(h,xx,18,93,4,C.edge);rect(h,xx,18,93*s.composure/100,4,C.teal);}
 else text(h,h.width-106,15,`CASE ${def.n===11?'CO':String(def.n).padStart(2,'0')} / OR-7`,C.dim);
 const stepX=51+ekgWidth,stepW=(h.width-h.measure(clockText,2).width)/2-stepX-8,chars=Math.max(3,Math.floor(stepW/6));text(h,stepX,5,`${s.stage+1}/${def.stages.length}`,C.dim);text(h,stepX,18,st.title.length>chars?st.title.slice(0,Math.max(1,chars-2))+'..':st.title,C.ivory);
 if(s.vitals.length>1){for(let i=0;i<s.vitals.length;i++){const x=h.width/2-73+i*50;rect(h,x,35,46,13,seat.table===i?C.edge:C.ink);text(h,x+3,38,`${String.fromCharCode(65+i)} ${Math.round(s.vitals[i])}`,s.vitals[i]<30?C.red:C.teal);a.worldUI.push({x,y:35,w:46,h:13,entry:{action:()=>{seat.table=i;}}});}}
 const remaining=s.entities.filter(e=>!e.done&&e.required&&e.table===table&&!(e.k==='cyst'&&!e.real&&e.revealed));
 const hint=remaining.find(e=>validTool(e)===seat.tool)||remaining[0];
 for(const e of s.entities){
  if(e.done||e.table!==table)continue;
  const selected=validTool(e)===seat.tool,co=selected?C.gold:C.dim;
  if(['incision','laceration','nick','dressing'].includes(e.k)||['forceps','scalpel'].includes(validTool(e))&&e.path&&(selected||e===hint)){
   const path=e.path||[];for(let i=0;i<path.length;i++){
    const p=field.project(path[i].x,path[i].z,s,.15);if(i<(e.progress||0)){circle(h,p.x,p.y,1,C.teal);continue;}
    if(i%1===0)rect(h,p.x-1,p.y-1,2,2,selected?C.gold:C.edge);
    if(e.k==='laceration'&&i===e.progress)diamond(h,p.x,p.y,3,C.gold);
   }
  }
  if(e.k==='fragment'){
   const p=field.project(e.tx,e.tz,s);line(h,p.x-10,p.y-4,p.x+10,p.y-4,C.gold);line(h,p.x-10,p.y+4,p.x+10,p.y+4,C.gold);text(h,p.x-3,p.y-3,String(e.id%10),C.ivory);
  }
  if(e.k==='mask')for(const cell of e.cells){const p=field.project(cell.x,cell.z,s);if(cell.v>=.2)rect(h,p.x,p.y,2,2,C.teal);else{rect(h,p.x,p.y,1,1,C.gold);}}
  if(e.k==='scan'||e.k==='cyst'&&!e.revealed){if(seat.tool==='scanner'){const p=field.project(e.x,e.z,s);circle(h,p.x,p.y,7,C.teal,true);if(seat.using)diamond(h,p.x,p.y,4,e.real===false?C.red:C.teal);}}
  if(e.k==='cyst'&&e.revealed){const p=field.project(e.x,e.z,s);text(h,p.x-3,p.y-12,e.real?'+':'X',e.real?C.gold:C.red);}
  if(['eye','strain','plate'].includes(e.k)){
   const p=field.project(e.x,e.z,s,.5);const hp=e.hp||1;for(let i=0;i<hp;i++)rect(h,p.x-hp*3+i*6,p.y-17,4,2,e.k==='eye'&&e.phase==='closed'?C.edge:C.red);
   if(e.k==='strain'&&e.phase==='knock'){text(h,p.x-14,p.y-28,'KNOCK',C.gold);diamond(h,p.x,p.y-7,6,C.gold);}
   if(e.k==='strain'&&e.phase==='exposed')text(h,p.x-11,p.y-24,'PULL',C.gold);
   if(e.k==='plate')text(h,p.x-13,p.y-25,e.phase.toUpperCase(),C.gold);
  }
  if(e.heat>0&&['polyp','eye','plate'].includes(e.k)){const p=field.project(e.x,e.z,s,.4);rect(h,p.x-9,p.y+10,18,2,C.edge);rect(h,p.x-9,p.y+10,18*Math.min(1,e.heat/(e.k==='eye'?1.2:s.config.laserTime)),2,C.red);}
 }
 if(hint&&a.settings.difficulty!=='Attending'&&def.n!==9&&!s.blue){const p=targetPoint(hint),v=field.project(p.x,p.z,s,.2);diamond(h,v.x,v.y-10-Math.sin(a.age*4)*2,3,C.teal);}
 for(const tip of s.seats)if(tip.table===table&&tip.active){const p=field.project(tip.x,tip.z,s,.16),col=a.network?parseInt(a.network.info.players[tip.id].color.replace('#',''),16):s.seats.length===1?C.gold:SEAT_COLORS[tip.id];circle(h,p.x,p.y,5,col);line(h,p.x-8,p.y,p.x-5,p.y,col);line(h,p.x+5,p.y,p.x+8,p.y,col);line(h,p.x,p.y-8,p.x,p.y-5,col);if(s.seats.length>1){toolIcon(h,p.x+8,p.y-9,tip.tool,col);text(h,p.x+8,p.y+2,String(tip.id+1),col);}}
 if(seat.grab&&s.entities.find(e=>e.id===seat.grab)?.free){const p=field.project(seat.x,seat.z,s,.4);rect(h,p.x-24,p.y-24,49,12,C.ink);text(h,p.x-21,p.y-21,'RELEASE',C.gold);}
 if(s.ghost.length){const idx=Math.min(s.ghost.length-1,Math.floor(a.ghostAge*60));const g=s.ghost[idx];if(g){const p=field.project(g.x,g.z,s);circle(h,p.x,p.y,7,C.blue,true);} }
 if(st.boss==='miserere'&&s.trace.length>180){const ghost=s.trace[s.trace.length-180],p=field.project(ghost.x,ghost.z,s);circle(h,p.x,p.y,8,C.red,true);toolIcon(h,p.x+10,p.y,ghost.tool,C.red);}
 if(seat.tool==='syringe'){
  const p=field.project(INJECTION.x,INJECTION.z,s);circle(h,p.x,p.y,16,C.teal);circle(h,p.x,p.y,13,C.teal,true);text(h,p.x-15,p.y-25,'INJECT',C.teal);rect(h,p.x-12,p.y+22,24,3,C.edge);rect(h,p.x-12,p.y+22,24*seat.draw,3,C.gold);
 }
 if(st.boss==='wrath'||st.boss==='reprise'){
  const safe=(s.elapsed*s.bpm/60)%1>.35;const label=`${s.bpm} BPM / ${safe?'DIASTOLE - SAFE':'SYSTOLE - WAIT'}`;
  rect(h,(h.width-h.measure(label).width)/2-5,35,h.measure(label).width+10,12,C.ink);text(h,(h.width-h.measure(label).width)/2,38,label,safe?C.blue:C.red);
 }
 const wx=h.width-44,wy=h.height-78;
 panel(h,h.width-83,h.height-116,77,73,C.edge);
 const toolLabel=(a.devices.last==='pad'?'':(TOOLS.indexOf(seat.tool)+1)+' ')+seat.tool.toUpperCase();text(h,h.width-76,h.height-110,toolLabel,C.gold);
 circle(h,wx,wy,24,C.edge);for(let i=0;i<8;i++){
  const ang=i*Math.PI/4-Math.PI/2,x=wx+Math.cos(ang)*21-3,y=wy+Math.sin(ang)*21-3,on=def.tools.includes(TOOLS[i]);
  if(TOOLS[i]===seat.tool){circle(h,x+3,y+3,7,C.gold);}toolIcon(h,x,y,TOOLS[i],on?(TOOLS[i]===seat.tool?C.gold:C.ivory):C.edge);
  if(on)a.worldUI.push({x:x-4,y:y-4,w:14,h:14,entry:{action:()=>{seat.lastTool=seat.tool;seat.tool=TOOLS[i];}}});
 }
 text(h,h.width-76,h.height-51,`DOSES ${s.doses}`,C.gold);
 if(!s.blue&&!s.massage){
  const desired=hint?validTool(hint):st.hint,wrong=TOOLS.includes(desired)&&desired!==seat.tool;
  const hintText=seat.grab&&s.entities.find(e=>e.id===seat.grab)?.k==='fragment'?(a.devices.last==='pad'?'R STICK ROTATES. RELEASE TO MATCH THE BONE.':'ROTATE Q/E / WHEEL. RELEASE ON SILHOUETTE.'):st.special==='quiet'?`HOLD ${a.devices.prompt('gift',a.settings)} - THE QUIET`:st.special==='rewind'?`PRESS ${a.devices.prompt('gift',a.settings)} - THE SECOND LOOK`:wrong?`${a.devices.last==='pad'?'R STICK':TOOLS.indexOf(desired)+1} SELECT ${desired.toUpperCase()}. ${TOOL_HELP[desired]}`:`${a.devices.prompt('use',a.settings)}: ${TOOL_HELP[seat.tool]}`;
  rect(h,6,h.height-68,h.width-98,25,C.ink);paragraph(h,11,h.height-62,hintText,h.width-112,C.ivory,1,10,2);
 }
 rect(h,0,h.height-39,h.width,39,C.ink);rect(h,0,h.height-39,2,39,def.n===9?C.edge:C.teal);
 const comm=st.id==='fragments'&&a.devices.last==='pad'?'GRAB. ROTATE WITH R STICK. RELEASE ON THE GOLD BONE.':a.comm||st.say||'KEEP THE PATIENT ALIVE.';
 if(def.n===9&&s.stage<4){text(h,10,h.height-31,'NO SIGNAL',C.edge);}
 else {text(h,10,h.height-33,def.surgeon==='sabine'?'DR. ACHTERBERG':'NURSE REYES',C.teal);paragraph(h,10,h.height-22,comm,h.width-24,C.ivory,1,10,2);}
 const mistakes=`${s.mistakes}/${s.config.maxMistakes||'-'} ERR`;rect(h,h.width-17-h.measure(mistakes).width,34,h.measure(mistakes).width+13,14,C.ink);text(h,h.width-10-h.measure(mistakes).width,38,mistakes,s.mistakes>2?C.red:C.dim);
 if(s.cold>0&&!s.pink)text(h,10,64,`COLD TIME ${Math.ceil(s.cold)}`,C.blue);
 for(const pop of a.popups){const p=field.project(pop.x,pop.z,s,.4);text(h,p.x-h.measure(pop.label).width/2,p.y-20-pop.age*9,pop.label,pop.label==='MISTAKE'?C.red:C.gold);}
 if(s.blue)drawBlue(a);
 if(s.massage)drawMassage(a);
 if(a.attract){rect(h,0,0,h.width,13,C.gold);centered(h,3,'DEMO - PRESS ANY BUTTON',C.ink);}
 if(a.devHitboxes){for(const e of s.entities)if(!e.done){const p=field.project(e.x,e.z,s);circle(h,p.x,p.y,10,C.red,true);text(h,p.x+10,p.y,String(e.id),C.red);}text(h,10,78,`${Math.round(a.ctx.engine.fps)} FPS / ${s.tick} TICKS / ${s.entities.length} ENTITIES`,C.gold);}
}
function drawBlue(a){const h=a.ctx.hud,b=a.sim.blue,w=Math.min(320,h.width-20),x=(h.width-w)/2,y=h.height/2-52;
 panel(h,x,y,w,109,C.red);centered(h,y+10,'CODE BLUE',C.red,2);centered(h,y+32,`${b.shocks}/2 SHOCKS  /  ${Math.ceil(b.left)} SECONDS`,C.ivory);
 const bx=x+19,bw=w-38;rect(h,bx,y+51,bw,15,C.edge);rect(h,bx+bw*(.72-a.config.blueWidth/2),y+51,bw*a.config.blueWidth,15,C.teal);rect(h,bx+b.needle*bw-1,y+47,3,23,C.gold);
 centered(h,y+78,`HOLD ${a.devices.prompt('left',a.settings)} + ${a.devices.prompt('right',a.settings)}`,C.gold);centered(h,y+94,'RELEASE BOTH IN THE GREEN ZONE',C.ivory);
}
function drawMassage(a){const h=a.ctx.hud,m=a.sim.massage,w=Math.min(310,h.width-20),x=(h.width-w)/2,y=h.height/2-38;
 panel(h,x,y,w,90,C.red);centered(h,y+10,'MANUAL CARDIAC MASSAGE',C.red);centered(h,y+28,`ALTERNATE ${a.devices.prompt('left',a.settings)} / ${a.devices.prompt('right',a.settings)} ON THE BEAT`,C.ivory);
 for(let i=0;i<8;i++)circle(h,h.width/2-49+i*14,y+53,4,i<m.hits?C.teal:C.edge);
 const beat=(a.sim.elapsed*a.sim.bpm/60)%1;rect(h,x+17,y+72,w-34,4,C.edge);rect(h,x+17,y+72,(w-34)*beat,4,C.gold);
}
export function drawResults(a){
 const h=a.ctx.hud,s=a.sim,r=results(s),def=opById(s.id),w=Math.min(326,h.width-24),x=(h.width-w)/2,y=16;
 panel(h,x,y,w,h.height-32,s.status==='saved'?C.teal:C.red);text(h,x+13,y+12,s.status==='saved'?'OPERATION COMPLETE':'PATIENT LOST',s.status==='saved'?C.teal:C.red);
 text(h,x+13,y+29,def.title,C.ivory);
 if(s.status==='saved'){
  const scale=a.age-a.resultAt<.24?5:4;text(h,x+w-59,y+47,r.rank,C.gold,scale);if(r.pristine)text(h,x+w-77,y+82,'PRISTINE',C.gold);
  text(h,x+13,y+52,`TIME LEFT  ${Math.ceil(s.remaining)} SEC`,C.dim);text(h,x+13,y+67,`VITALS     ${r.vitals}`,C.dim);text(h,x+13,y+82,`TECHNIQUE  ${s.clean} CLEAN`,C.dim);text(h,x+13,y+97,`STREAK     ${r.streak}`,C.dim);text(h,x+13,y+112,`SCORE      ${r.total}`,C.teal);
  line(h,x+13,y+128,x+w-13,y+128,C.edge);paragraph(h,x+13,y+139,def.patient.followUp[r.rank],w-26,C.ivory,1,11,2);
  const label=a.isConsult?'ANOTHER CONSULT':a.isReplay?'BACK TO LOG':a.episode===9?'THE MORNING AFTER':'NEXT CASE';
  const yy=h.height-48;rect(h,x+10,yy,w-20,19,C.edge);centered(h,yy+6,`${a.devices.prompt('confirm',a.settings)}  ${label}`,C.gold);a.entries=[{label,action:()=>a.afterResults()}];a.ui=[{x:x+10,y:yy,w:w-20,h:19,index:0,entry:a.entries[0]}];
 }else{
  paragraph(h,x+13,y+53,s.cause||'THE PATIENT COULD NOT BE SAVED.',w-26,C.red);text(h,x+13,y+80,'TIME OF DEATH...',C.dim);
  const es=[{label:'RETRY FROM THIS STAGE',action:()=>a.retry()},{label:'RESTART OPERATION',action:()=>a.restart()}];if(a.save.failures>=2)es.push({label:'SWITCH TO INTERN',action:()=>{a.settings.difficulty='Intern';a.restart();}});es.push({label:'QUIT TO MENU',action:()=>a.show('main')});
  a.entries=es;a.ui=[];es.forEach((e,i)=>{const yy=y+108+i*23;if(a.focus===i)rect(h,x+10,yy-3,w-20,19,C.edge);text(h,x+20,yy+2,(a.focus===i?'> ':'  ')+e.label,a.focus===i?C.gold:C.ivory);a.ui.push({x:x+10,y:yy-3,w:w-20,h:19,index:i,entry:e});});
 }
}
export function drawPause(a){frame(a,'SHIFT PAUSED');menu(a,'PAUSED','THE PATIENT CAN WAIT HERE.',[
 {label:'RESUME',action:()=>a.show('operation')},{label:'RETRY STAGE',action:()=>a.retry()},{label:'RESTART OPERATION',action:()=>a.restart()},
 {label:'SETTINGS',action:()=>a.openSettings('pause')},{label:'DEV MODE',action:()=>{a.devTab=0;a.devPage=0;a.show('dev');}},
 {label:'QUIT TO MENU',action:()=>a.show('main')},
 ],{top:48});}
export function drawLog(a){
 const h=a.ctx.hud;frame(a,'OPERATING LOG');const list=OPS.filter(d=>a.save.cleared[d.id]);
 if(!list.length){menu(a,'OPERATING LOG','YOUR FIRST SHIFT IS STILL AHEAD.',[{label:'NEW SHIFT',action:()=>a.show('difficulty')},{label:'BACK',action:()=>a.show('main')}]);return;}
 a.logIndex=(a.logIndex+list.length)%list.length;const op=list[a.logIndex],rank=a.save.cleared[op.id].rank;
 const w=Math.min(326,h.width-24),x=(h.width-w)/2;panel(h,x,43,w,130,C.gold);text(h,x+14,55,`CASE ${op.n} / ${list.length} FILES CLEARED`,C.dim);text(h,x+14,74,op.title,C.gold);text(h,x+14,94,op.patient.name,C.ivory);paragraph(h,x+14,113,op.patient.followUp[rank],w-75,C.dim,1,11,3);text(h,x+w-36,108,rank,C.gold,3);
 menu(a,'PATIENT FILE',`${a.devices.prompt('prev',a.settings)} / ${a.devices.prompt('next',a.settings)} TO FLIP`,[{label:'REPLAY THIS CASE',action:()=>a.startOperation(op,{replay:true})},{label:'BACK',action:()=>a.show('main')}],{top:183});
}
export function drawConsult(a){const h=a.ctx.hud;frame(a,'CONSULT / COUCH CO-OP');
 const w=Math.min(350,h.width-24),x=(h.width-w)/2;panel(h,x,38,w,82);text(h,x+12,49,'SCRUB IN TOGETHER',C.gold);text(h,x+12,66,'PRESS CROSS / A ON EACH CONTROLLER.',C.dim);
 for(let i=0;i<4;i++){const xx=x+16+i*(w-25)/4;rect(h,xx,88,62,17,i<a.consultSources.length?C.edge:C.ink);text(h,xx+4,93,i<a.consultSources.length?`SEAT ${i+1}`:'OPEN',i<a.consultSources.length?SEAT_COLORS[i]:C.dim);}
 const cleared=OPS.filter(o=>a.save.cleared[o.id]&&![3,9].includes(o.n));const choices=[CONSULT,...cleared];a.consultOp=Math.min(a.consultOp,choices.length-1);
 menu(a,'CONSULT','SHARED VITALS. INDIVIDUAL SCORES.',[
 {label:'CASE',value:()=>choices[a.consultOp].title,adjust:d=>{a.consultOp=(a.consultOp+d+choices.length)%choices.length;}},
 {label:'KEYBOARD SEAT',value:()=>a.consultSources.includes('keyboard')?'IN':'OUT',action:()=>{if(a.consultSources.includes('keyboard')){if(a.consultSources.length>1)a.consultSources=a.consultSources.filter(x=>x!=='keyboard');}else if(a.consultSources.length<4)a.consultSources.unshift('keyboard');}},
 {label:'START CONSULT',value:a.consultSources.length+' HANDS',action:()=>a.startOperation(choices[a.consultOp],{consult:true,seats:a.consultSources.length})},
 {label:'BACK',action:()=>a.show('main')},
 ],{top:132,width:350});}
function sliderEntry(a,def){const[k,label,min,max,inc]=def;return{label,value:()=>Number(a.config[k].toFixed(2)),slider:()=> (a.config[k]-min)/(max-min),adjust:d=>{a.config[k]=Math.max(min,Math.min(max,Math.round((a.config[k]+d*inc)*100)/100));}};}
export function drawDev(a){
 frame(a,'DEVELOPER TOOLS');const tabs=['BALANCE','CHEATS','JUMP','ACTIONS','VIEW'];const h=a.ctx.hud;rect(h,h.width/2-87,29,174,15,C.ink);centered(h,33,`${a.devices.prompt('prev',a.settings)} < ${tabs[a.devTab]} > ${a.devices.prompt('next',a.settings)}`,C.gold);
 let es=[];
 if(a.devTab===0){es=SLIDERS.slice(a.devPage*6,a.devPage*6+6).map(d=>sliderEntry(a,d));es.push({label:'BALANCE PAGE',value:`${a.devPage+1}/4`,action:()=>{a.devPage=(a.devPage+1)%4;a.focus=0;},adjust:d=>{a.devPage=(a.devPage+d+4)%4;a.focus=0;}},{label:'RESET TO DEFAULTS',action:()=>a.resetBalance()});}
 if(a.devTab===1){for(const[k,label]of [['god','GOD VITALS'],['infiniteComposure','INFINITE COMPOSURE'],['freezeClock','FREEZE CLOCK'],['unlimitedMistakes','UNLIMITED MISTAKES']])es.push({label,value:()=>a.sim[k]?'ON':'OFF',action:()=>{a.sim[k]=!a.sim[k];}});es.push({label:'UNLOCK ALL CASES',action:()=>a.unlockAll()},{label:'RESET TO DEFAULTS',action:()=>a.resetBalance()});}
 if(a.devTab===2){es=[{label:'OPERATION',value:()=>opById('op'+a.jumpOp).title,adjust:d=>{a.jumpOp=(a.jumpOp-1+d+11)%11+1;a.jumpStage=0;}},
 {label:'STAGE',value:()=>String(a.jumpStage+1),adjust:d=>{const n=opById('op'+a.jumpOp).stages.length;a.jumpStage=(a.jumpStage+d+n)%n;}},
 {label:'JUMP TO OPERATION',action:()=>a.jumpOperation()},
 {label:'STORY SCENE',value:()=>String(a.jumpScene+1),adjust:d=>{a.jumpScene=(a.jumpScene+d+11)%11;}},
 {label:'JUMP TO STORY',action:()=>a.startStory(a.jumpScene)}];}
 if(a.devTab===3)es=[{label:'COMPLETE STAGE',action:()=>a.completeStage()},{label:'WIN OPERATION',action:()=>a.forceOutcome(true)},{label:'FAIL OPERATION',action:()=>a.forceOutcome(false)},
 {label:'TRIGGER CODE BLUE',action:()=>a.devBlue()},{label:'SPAWN',value:()=>a.spawnKind,adjust:d=>{const k=['pool','laceration','hook','polyp','strain'];a.spawnKind=k[(k.indexOf(a.spawnKind)+d+k.length)%k.length];},action:()=>a.devSpawn()},
 {label:'COPY OP JSON TO CONSOLE',action:()=>a.copyOp()}];
 if(a.devTab===4)es=[{label:'HITBOXES + STATS',value:()=>a.devHitboxes?'ON':'OFF',action:()=>{a.devHitboxes=!a.devHitboxes;}},
 {label:'BOT PLAYS',value:()=>a.botPlays?'ON':'OFF',action:()=>{a.botPlays=!a.botPlays;}},{label:'BOT SKILL',value:()=>a.botSkill.toFixed(1),slider:()=>a.botSkill,adjust:d=>{a.botSkill=Math.max(.1,Math.min(1,a.botSkill+d*.1));}},
 {label:'SIM SPEED',value:()=>a.simSpeed.toFixed(1)+'X',slider:()=>a.simSpeed/3,adjust:d=>{a.simSpeed=Math.max(.1,Math.min(3,a.simSpeed+d*.1));}},
 {label:'FRAME STEP',action:()=>a.frameStep()},{label:'RESUME OPERATION',action:()=>a.show('operation')}];
 menu(a,'DEV / '+tabs[a.devTab],'CHANGES APPLY LIVE. ESC TO PAUSE.',es,{top:48,width:350});
}
const SETTING_TABS=['AUDIO','CONTROLS','PICTURE','GAME'];
export function drawSettings(a){
 frame(a,'SETTINGS');const h=a.ctx.hud;rect(h,h.width/2-87,29,174,15,C.ink);centered(h,33,`${a.devices.prompt('prev',a.settings)} < ${SETTING_TABS[a.settingsTab]} > ${a.devices.prompt('next',a.settings)}`,C.gold);
 const setting=(key,label,min=0,max=1,inc=.1)=>({label,value:()=>Math.round(a.settings[key]*100)+'%',slider:()=> (a.settings[key]-min)/(max-min),adjust:d=>a.setting(key,Math.max(min,Math.min(max,a.settings[key]+d*inc)))});
 const toggle=(key,label)=>({label,value:()=>a.settings[key]?'ON':'OFF',action:()=>a.setting(key,!a.settings[key])});
 const choose=(key,label,list)=>({label,value:()=>a.settings[key].toUpperCase(),adjust:d=>a.setting(key,list[(list.indexOf(a.settings[key])+d+list.length)%list.length]),action:()=>a.setting(key,list[(list.indexOf(a.settings[key])+1)%list.length])});
 let es=[];
 if(a.settingsTab===0)es=[setting('music','MUSIC'),setting('sound','SOUND'),setting('voices','VOICES')];
 if(a.settingsTab===1)es=[choose('glyphs','BUTTON GLYPHS',['PlayStation','Xbox']),toggle('aimAssist','AIM ASSIST'),setting('cursorSpeed','CURSOR SPEED',.4,2,.1),toggle('rumble','RUMBLE'),toggle('giftToggle','QUIET TOGGLE')];
 if(a.settingsTab===2)es=[choose('look','LOOK',['Surgical','Noir','Arcade']),{label:'PIXEL SIZE',value:()=>a.settings.pixelSize+'X',adjust:d=>a.setting('pixelSize',Math.max(1,Math.min(3,a.settings.pixelSize+d)))},toggle('shake','SCREEN SHAKE'),toggle('reduceFlashes','REDUCE FLASHES'),{label:'FULLSCREEN',action:()=>a.fullscreen()}];
 if(a.settingsTab===3)es=[setting('textSpeed','TEXT SPEED',.5,2,.1),choose('difficulty','DIFFICULTY',['Intern','Resident','Attending']),{label:'CONTROLS GUIDE',action:()=>{a.aboutReturn='settings';a.aboutPage=-1;a.show('about');}},{label:'RESET SETTINGS',action:()=>a.resetSettings()}];
 es.push({label:'BACK',action:()=>a.show(a.settingsReturn||'main')});menu(a,'SETTINGS / '+SETTING_TABS[a.settingsTab],'LEFT / RIGHT ADJUST. ENTER TOGGLE.',es,{top:52,width:338});
}
const FEEDBACK_QUESTIONS={testingFeedback:['ISSUES CAUGHT','CRITICAL ISSUES','MOST HELPFUL TEST','LEAST HELPFUL TEST'],engineFeedback:['WHAT WORKED BEST','GUESSES AND BLOCKERS','BUILT ON TOP','HARDEST ENGINE TASK','ENGINE CHANGES','ONE ENGINE IMPROVEMENT'],promptFeedback:['WHAT WORKED BEST','WHAT WAS CONFUSING','HARDEST TASK','ONE PROMPT IMPROVEMENT']};
export function aboutPages(){
 const pages=[];const fields=Object.entries(INTERVIEW.sourceInformation);
 for(let i=0;i<fields.length;i+=2)pages.push({title:'SOURCE INFORMATION',items:fields.slice(i,i+2).map(([label,answer])=>({label,answer}))});
 for(const key of Object.keys(FEEDBACK_QUESTIONS))for(let i=0;i<INTERVIEW[key].length;i+=2)pages.push({title:key.replace(/([A-Z])/g,' $1').toUpperCase(),items:INTERVIEW[key].slice(i,i+2).map((answer,j)=>({label:FEEDBACK_QUESTIONS[key][i+j],answer}))});
 pages.push({title:'CREDITS',items:[{label:'DESIGN, ART, ANIMATION, AUDIO',answer:'Original game content written in code for this build. Inspired by the surgical action and dramatic tone of the credited source.'},{label:'ENGINE AND LIBRARIES',answer:'Pixel Engine 0.46.0 (MIT), three.js (MIT), Rapier (Apache 2.0), Kenney Furniture (CC0). Full licence texts are embedded in this page.'},{label:'PORT VERITY',answer:'Thank you for showing up. The truth, stat.'}]});return pages;
}
export function drawAbout(a){
 const h=a.ctx.hud;frame(a,'ABOUT / CREDITS');
 if(a.aboutPage===-1){const w=Math.min(390,h.width-24),x=(h.width-w)/2;panel(h,x,40,w,h.height-65);text(h,x+14,52,'SURGICAL INSTRUMENTS',C.gold);
 const lines=['AIM: MOUSE / WASD / LEFT STICK','USE: HOLD CLICK / J / R2','TOOLS 1-8 / RIGHT STICK. Q / R1 LAST TOOL.','STEADY: SHIFT / L1. SYRINGE: F / SQUARE.','GIFT: SPACE / L2. TABLE: TAB / D-PAD.','PADDLES: BOTH BUTTONS / J+K / L2+R2.','BONE: Q/E / WHEEL / RIGHT STICK ROTATES.','PULL ALONG ARROWS. RELEASE TO EXTRACT.','PAUSE: ESC / OPTIONS. DEV MODE IS THERE.'];
 lines.forEach((l,i)=>text(h,x+14,72+i*16,l,C.ivory));a.entries=[];a.ui=[];return;}
 const pages=aboutPages(),p=pages[a.aboutPage%pages.length],w=Math.min(402,h.width-24),x=(h.width-w)/2,y=39;
 panel(h,x,y,w,h.height-61);text(h,x+13,y+12,p.title,C.gold);let yy=y+33;
 for(const item of p.items){text(h,x+13,yy,labelize(item.label),C.teal);yy+=13;yy+=paragraph(h,x+13,yy,item.answer,w-27,C.ivory,1,11,6)+12;}
 centered(h,h.height-14,`${a.devices.prompt('prev',a.settings)} / ${a.devices.prompt('next',a.settings)}  PAGE ${a.aboutPage+1}/${pages.length}   ${a.devices.prompt('back',a.settings)} BACK`,C.dim);
 a.entries=[];a.ui=[{x:0,y:35,w:h.width/2,h:h.height-35,entry:{action:()=>{a.aboutPage=(a.aboutPage-1+pages.length)%pages.length;}}},{x:h.width/2,y:35,w:h.width/2,h:h.height-35,entry:{action:()=>{a.aboutPage=(a.aboutPage+1)%pages.length;}}}];
}
export function drawCredits(a){const h=a.ctx.hud;frame(a,'SHIFT REPORT');centered(h,49,'EVERYBODY HAS A TOMORROW.',C.gold,Math.min(2,Math.floor((h.width-20)/h.measure('EVERYBODY HAS A TOMORROW.').width)));
 centered(h,77,'TEN CASES. TEN TRUTHS TOLD.',C.dim);
 const start=h.width/2-100;for(let i=0;i<10;i++){const x=start+(i%5)*42,y=105+Math.floor(i/5)*39;rect(h,x,y,34,30,C.panel);text(h,x+4,y+4,String(i+1).padStart(2,'0'),C.dim);text(h,x+20,y+12,a.save.cleared['op'+(i+1)]?.rank||'-',C.teal,2);}
 centered(h,196,'REYES: YOU HAVE A SEVEN A.M.',C.ivory);centered(h,h.height-32,`${a.devices.prompt('confirm',a.settings)} ABOUT / CREDITS`,C.gold);centered(h,h.height-16,'ESC RETURN TO TITLE',C.dim);a.entries=[];a.ui=[];
}
export function drawCard(a){const h=a.ctx.hud,n=a.network,info=n.info;frame(a,'CONSULT / LIVE SESSION');centered(h,34,'TRAUMA WARD',C.ivory,2);centered(h,55,'CRITICAL OPINION',C.gold);
 const w=Math.min(348,h.width-24),x=(h.width-w)/2;panel(h,x,76,w,101);text(h,x+12,87,'KEEP THE PATIENT ALIVE. TOP THE TEAM SCORE.',C.teal);
 info.players.forEach((p,i)=>text(h,x+12,107+i*14,`${(n.card.ready||[]).includes(p.id)?'READY':'WAIT '}  ${p.name}`,parseInt(p.color.replace('#',''),16)));
 centered(h,185,'STICK / MOUSE: AIM. R2 / CLICK: USE.',C.ivory);centered(h,199,'RIGHT STICK / 1-8: SELECT INSTRUMENT.',C.dim);
 const remain=n.started&&AIHub.time()<0?Math.ceil(-AIHub.time()/1000):n.card.paused?'PAUSED':n.card.starting?'STARTING':Math.ceil((n.card.left||0)/1000)+' SEC';centered(h,215,String(remain),C.gold);
 const ready={label:'READY',action:()=>AIHub.answer('ready')},more={label:'MORE TIME',action:()=>AIHub.answer('more')};a.entries=[ready,more];a.ui=[];
 for(let i=0;i<2;i++){const xx=h.width/2-143+i*154;rect(h,xx,h.height-27,132,20,C.edge);text(h,xx+7,h.height-20,i===0?'ENTER / CROSS: READY':'M / TRIANGLE: MORE',C.gold);a.ui.push({x:xx,y:h.height-27,w:132,h:20,index:i,entry:i===0?ready:more});}
}
export function draw(a){
 const h=a.ctx.hud;h.clear();a.worldUI=[];
 if(a.devices.blocked&&a.screen!=='settings'&&!a.network){a.ui=[];a.entries=[];if(a.attract){rect(h,0,0,h.width,13,C.gold);centered(h,3,'DEMO / CONNECT A PAD',C.ink);}else{centered(h,14,'TRAUMA WARD',C.gold);centered(h,27,'CRITICAL OPINION',C.ivory);}return;}
 const drawers={title:drawTitle,main:drawMain,difficulty:drawDifficulty,story:drawStory,briefing:drawBriefing,operation:drawOperation,results:drawResults,pause:drawPause,settings:drawSettings,log:drawLog,consult:drawConsult,dev:drawDev,about:drawAbout,credits:drawCredits,card:drawCard};
 (drawers[a.screen]||drawTitle)(a);
 if(a.attract&&a.screen!=='operation'){rect(h,0,0,h.width,13,C.gold);centered(h,3,'DEMO - PRESS ANY BUTTON',C.ink);}
 if(a.screen==='operation')a.ui=a.worldUI;
}
