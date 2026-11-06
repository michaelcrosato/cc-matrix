(() => {
const E=My3D2dge,G=window.GAME,{px}=E,{circle,cap}=G.Instruments;
const redBloodRamps=[G.MATS[G.matId('blood')].ramp,G.MATS[G.matId('wound')].ramp];
const text=(g,s,x,y,c='#e5f4e7',o={})=>E.font.text(g,s,x,y,c,{outline:false,shadow:'#071a25',...o});
const box=(g,x,y,w,h,border='#3a6b73',bg='#0d2632')=>E.ui.box(g,x,y,w,h,{bg,border});
function guide(g,points,cut=0,color='#c3a0f2'){
 let len=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=0;t<d;t+=4){const u=t/(d||1),v=Math.min(1,(t+2)/(d||1));px.line(g,a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[0]+(b[0]-a[0])*v,a[1]+(b[1]-a[1])*v,len+t<cut?'#ffdba4':color,1);}len+=d;}
 const p=G.Op.pathAt(points,cut);px.disc(g,p[0],p[1],3,'#112e3a');px.disc(g,p[0],p[1],1.5,'#faf6d7');
}
function brackets(g,x,y,r=10,c='#eaf5d9'){for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){px.line(g,x+a*r,y+b*r,x+a*(r-4),y+b*r,c,1);px.line(g,x+a*r,y+b*r,x+a*r,y+b*(r-4),c,1);}}
function glow(g,x,y,r,color='#63e8cb'){px.blend(g,.15,'add',()=>{px.disc(g,x,y,r+7,color);px.disc(g,x,y,r+3,color);});}
function organism(g,o,S,t){const x=o.x,y=o.y,w=Math.sin(t*3+o.id),teal='#64edcf',dark='#0a3442';
 if(o.type==='bead'){circle(g,o.ox,o.oy,10,teal,1,0,Math.PI*2,true);glow(g,x,y,5);px.ell(g,x,y,4.8,3.7+w*.8,dark);px.ell(g,x-1,y-1,3,2,teal);px.dot(g,x-2,y-2,'#e6fff0');}
 if(o.type==='nest'){glow(g,x,y,12);for(let i=0;i<5;i++){const a=i*Math.PI*.4+t*.1;px.ell(g,x+Math.cos(a)*7,y+Math.sin(a)*5,5,4,'#195c67');}px.ell(g,x,y,7,5,teal);px.ell(g,x+1,y+1,4,3,dark);}
 if(o.type==='legato'){const n=o.left||4;for(let i=n;i>=0;i--){const xx=x+Math.sin(i*.8+t*2)*7+i*7,yy=y+Math.sin(i*.5+t)*4;glow(g,xx,yy,3);px.ell(g,xx,yy,5,3.5,i%4===0?'#c5edb9':'#329d96');px.line(g,xx-2,yy-2,xx+2,yy-2,teal,1);}if(o.stage===2){circle(g,x,y-27,10,'#ffcf91',1);text(g,'CLAMP',x+13,y-30,'#ffcf91');} }
 if(o.type==='tremolo'){glow(g,x,y,29,'#ad9cff');for(let i=0;i<9;i++){const a=i*Math.PI*2/9,xx=x+Math.cos(a)*30,yy=y+Math.sin(a)*22;px.line(g,x,y,xx,yy,'#75b8be',2);}px.ell(g,x,y,23+w*2,18+w,'#172c4b');px.ell(g,x-3,y-4,17,10,'#53777d');px.ell(g,x,y,10,7,'#a0f0d4');circle(g,x,y,25,'#b7a7eb',1);}
 if(o.type==='reed'){const flare=(S.worldTime%.9)<.3;glow(g,x,y,flare?9:3,flare?'#fff1a2':teal);px.poly(g,[[x-5,y+9],[x-3,y-8],[x+2,y-12],[x+5,y-7],[x+4,y+9]],flare?'#eed9a2':'#4a9895');circle(g,x,y,10,flare?'#fff2b4':'#72b4b4',1);}
 if(o.type==='lobe'){const open=G.Op.lobeOpen(S,o);glow(g,x,y,17,open?teal:'#8176a8');px.ell(g,x,y,19,15+w,open?'#308e8a':'#263c55');px.ell(g,x-4,y-5,10,5,open?'#a0edd0':'#687f92');px.ell(g,x+1,y+2,8,6,dark);circle(g,x,y,23,open?'#c9f5c9':'#677a95',1,0,Math.PI*2,!open);text(g,'ABC'[o.index],x,y-4,'#f8ffe9',{align:'center',scale:2});const parent=S.objects.find(q=>q.id===o.parent);if(parent?.first)text(g,String(Math.max(0,10-(S.phaseTime-parent.first))|0),x,y+25,'#ffce9c',{align:'center'});}
 if(o.type==='fermata'){const open=G.Op.eyeOpen(S,o);glow(g,x,y,24,'#a6a6f5');px.ell(g,x,y,25,open?15:5,'#7891ae');px.ell(g,x,y,18,open?10:2,teal);if(open){px.ell(g,x,y,6,10,dark);px.dot(g,x-2,y-5,'#efffe6');}for(let i=0;i<6;i++)px.disc(g,x-15+i*6,y+24,1.6,i<o.hits?'#f2dba4':'#537e8a');}
 if(o.type==='mouth'){glow(g,x,y,25,'#a8a4f3');px.ell(g,x,y,25,21+w*2,'#638a9b');px.ell(g,x,y,18,15+w*2,dark);for(let i=0;i<7;i++){const xx=x-14+i*4;px.poly(g,[[xx,y-10],[xx+3,y-10],[xx+1,y-4]],'#d0e9c8');}px.ell(g,x,y+2,4,9,'#9cebd1');for(let i=0;i<3;i++)px.line(g,x-14+i*13,y-20,x-20+i*17+Math.sin(t*2+i)*4,y-38,'#a1e8cc',2);}
 if(o.type==='voicebox'){glow(g,x,y,20,'#b69eea');for(let i=-2;i<=2;i++)px.ell(g,x+i*11,y,7,15+Math.sin(t*6+i)*4,'#72beb5');circle(g,x,y,31,'#b8b3ef',1,0,Math.PI*2,true);text(g,'DOSE ON THE BEAT',x,y+34,'#c4f4d2',{align:'center'});}
 if(o.type==='repeat'){const wind=(S.phaseTime%20)>=17;glow(g,x,y,30,wind?'#f5e4b5':'#7799c9');text(g,'|:',x-4,y-22,wind?'#f0edc2':'#6393a1',{scale:5,align:'center'});text(g,o.hits+'/6',x,y+24,'#ceead6',{align:'center'});if(wind)text(g,'CUT THE REPEAT',x,y-42,'#ffdfa8',{align:'center'});}
 if(o.type==='lastnote'){glow(g,x,y,12,'#e4ddbd');px.ell(g,x,y,10+w*2,12,'#a9e0ca');px.ell(g,x,y,4,8,dark);}
}
function stamp(F,S){
 for(const o of S.objects){if(o.done&&!(o.type==='wound'||o.type==='arteryTear'))continue;
  if(o.type==='pool'&&!o.done){const r=Math.sqrt(Math.max(1,o.volume))*2.2;F.stampDisc(o.x,o.y,r,2,'blood');F.stampDisc(o.x+r*.6,o.y+2,r*.65,2,'blood');}
  if(o.type==='wound'||o.type==='arteryTear'){const rem=1-o.stitches/o.n;if(rem>0){F.stampLine([[o.x,o.y-o.length/2],[o.x+2,o.y+o.length/2]],2+rem*3,-5*rem,'wound');F.stampLine([[o.x-4,o.y-o.length/2],[o.x-4,o.y+o.length/2]],1.5,2,'skin');}}
  if(o.type==='laceration')F.stampLine([[o.x-8,o.y-4],[o.x+8,o.y+4]],2,-3,'wound');
  if(o.type==='patch')F.stampDisc(o.x,o.y,o.r,1,'muscle');
  if(o.type==='mass')F.stampDisc(o.x,o.y,o.r||23,12,'liver');
  if(o.type==='legato'&&!o.done){const pts=Array.from({length:10},(_,i)=>[o.x+i*7,o.y+Math.sin(i*.7+S.worldTime)*5]);F.stampLine(pts,4,3);}
 }
}
function objects(g,S){const t=S.worldTime;
 for(const o of S.objects){
  if(o.type==='wound'||o.type==='arteryTear'){
   for(let i=0;i<o.stitches;i++){const y=o.y-o.length/2+((i+.5)/o.n)*o.length,shift=o.roll?Math.sin(t*1.3)*6:0;px.line(g,o.x-9+shift,y-2,o.x+9+shift,y+2,'#a2d2ec',1);px.line(g,o.x-9+shift,y+2,o.x+9+shift,y-2,'#6286bd',1);}
  }
  if(o.done||o.type==='pool')continue;if(o.retracted&&!S.flags.retracted){brackets(g,o.x,o.y,16,'#8495ac');text(g,'HOLD RETRACTOR',o.x,o.y+28,'#bdcdbb',{align:'center'});continue;}
  const inLens=S.players.some(p=>p.tool===7&&p.trig>.3&&G.dist(p,o)<48);if(!G.Op.visible(S,o)&&!inLens)continue;
  let x=o.x,y=o.y;const puller=S.players.find(p=>p.grab?.id===o.id);if(puller?.grab?.free){x=puller.x;y=puller.y;}
  if(G.strains[o.type])organism(g,{...o,x,y},S,t);
  if(o.type==='shard'||o.type==='hook'||o.type==='device'){
   if(o.type==='device'){px.poly(g,[[x-24,y-15],[x+22,y-16],[x+28,y+10],[x+17,y+20],[x-25,y+13]],'#a8bdbe');px.poly(g,[[x-18,y-12],[x+17,y-13],[x+19,y+4],[x-18,y+6]],'#d4d8bc');}
   else {px.poly(g,[[x-4,y+9],[x+5,y-14],[x+7,y+4],[x+2,y+13]],o.cork?'#b78f5d':'#aacbd5');px.line(g,x-2,y+7,x+5,y-11,o.cork?'#f2c58a':'#f5ffe8',1);if(o.type==='hook')px.line(g,x+3,y+3,x+13,y-2,'#e0e6cc',3);}
   if(puller&&!puller.grab.free){text(g,'PULL SLOWLY',x,y+22,'#e9e8b9',{align:'center'});E.ui.bar(g,x-18,y+32,36,3,Math.min(1,o.progress),o.tension>1?'#ff997d':'#9fe5c4');}
  }
  if(o.type==='polyp'||o.type==='bleeder'){px.ell(g,x,y,5,4,'#e3937a');px.disc(g,x,y,2,'#732b38');if(o.type==='bleeder'){const u=(t*1.7+o.id)%1;px.line(g,x,y,x+u*10,y-u*12,'#e3867e',1);px.disc(g,x+u*10,y-u*12,1.4,'#ecb5a0');}}
  if(o.type==='patch'||o.type==='laceration'){for(let y1=-o.r;y1<o.r;y1+=5){const w=Math.sqrt(o.r*o.r-y1*y1);px.line(g,x-w,y+y1,x+w,y+y1,'#9bd8ac',1);}if(o.progress>0)E.ui.bar(g,x-12,y+o.r+3,24,2,o.progress,'#bcf1be');}
  if(o.type==='nerve'||o.type==='eloquent'){for(let i=1;i<o.points.length;i++)px.line(g,...o.points[i-1],...o.points[i],'#edc97e',2);}
  if(o.type==='screw'){circle(g,x,y,7,'#d0e1d0',2);px.line(g,x-4,y-3,x+4,y+3,'#314b61',2);if(o.progress)circle(g,x,y,10,'#fff0b6',2,-Math.PI/2,-Math.PI/2+o.progress*Math.PI*2);}
  if(o.type==='board'){px.rect(g,x-44,y-26,88,54,'#277764');for(let i=0;i<6;i++){px.line(g,x-35,y-18+i*7,x+29-(i%3)*8,y-18+i*7,'#d0c68a',1);px.rect(g,x-12+(i%2)*23,y-15+i*5,10,4,'#183b3d');}text(g,'TRUE: TRI / SQR / CIR',x,y+33,'#e8efca',{align:'center'});}
  if(o.type==='wire'){px.line(g,x,y-15,x,y+20,['#f5bd78','#a5d4e8','#aee0c7'][o.order],3);text(g,o.symbol==='triangle'?'△':o.symbol==='square'?'□':'○',x,y-28,'#f8f2c9',{align:'center',scale:2});}
  if(o.type==='bypass'){px.line(g,x-14,y,x+14,y,'#b1d8b9',3);px.disc(g,x,y,3,'#edc67d');}
  if(o.type==='retractorHandle'){px.rect(g,x-16,y-4,32,8,'#8ba7b4');px.rect(g,x-8,y-2,16,4,'#304d61');text(g,'HOLD',x,y+14,'#dfedce',{align:'center'});}
  if(G.Op.toolFor(S,o)===0){brackets(g,x,y,o.type==='mass'?o.r+4:11);if(o.axis&&!puller&&o.type!=='screw'){const ax=x+o.axis[0]*25,ay=y+o.axis[1]*25;px.line(g,x+o.axis[0]*14,y+o.axis[1]*14,ax,ay,'#e2d7aa',1);px.line(g,ax,ay,ax-o.axis[0]*5-o.axis[1]*3,ay-o.axis[1]*5+o.axis[0]*3,'#e2d7aa',1);px.line(g,ax,ay,ax-o.axis[0]*5+o.axis[1]*3,ay-o.axis[1]*5-o.axis[0]*3,'#e2d7aa',1);}}
  if(G.Op.toolFor(S,o)===1&&o.points)guide(g,o.points,o.cut||0);
  if(G.Op.toolFor(S,o)===2){const pair=G.Op.stitchPair(S,o);for(let i=0;i<2;i++){circle(g,...pair[i],4,i?'#79baf6':'#d5eaff',1);px.dot(g,...pair[i],i?'#9acdff':'#ffffff');}px.line(g,...pair[0],...pair[1],'#5e8bb7',1);}
  if(G.Op.toolFor(S,o)===4){circle(g,x,y,10,'#f2dc9c',1);px.line(g,x-3,y,x+3,y,'#f2dc9c');px.line(g,x,y-3,x,y+3,'#f2dc9c');}
  if(G.Op.toolFor(S,o)===5){circle(g,x,y,9,'#ffc18c',1);if(o.progress)circle(g,x,y,11,'#fff0bc',2,-Math.PI/2,-Math.PI/2+Math.min(1,o.progress)*Math.PI*2);}
  if(G.cheats.radii)circle(g,x,y,14,'#efedb0',1,0,Math.PI*2,true);
 }
 for(const d of S.domes){px.blend(g,.24,'add',()=>px.disc(g,d.x,d.y,d.r,'#a6baff'));circle(g,d.x,d.y,d.r,'#b2c4ed',1,Math.PI,Math.PI*2);text(g,'HOLD',d.x,d.y-3,'#c5daf3',{align:'center'});}
 if(S.ghosts.length&&S.ghostTime<6){const ghost=S.ghosts.find(q=>q.at>=S.ghostTime);if(ghost)px.blend(g,.35,'add',()=>{for(const p of ghost.p){brackets(g,p[0],p[1],6,'#ddedfc');}for(const q of ghost.o)circle(g,q[0],q[1],5,'#8299c3');});}
}
function wheel(g,p,x,y,hint=-1){circle(g,x,y,43,'#527c80',1);for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,xx=x+Math.cos(a)*43-12,yy=y+Math.sin(a)*43-12,selected=i===p.tool;box(g,xx,yy,24,24,selected?'#e7e3ac':i===hint?'#89e3bb':'#476574',selected?'#36676e':'#102934');G.Instruments.draw(g,i,xx+6,yy+5,selected?1:0,undefined,0,0,true);if(selected)px.rect(g,xx,yy+23,24,2,G.TOOL_COLORS[i]);}text(g,G.TOOL_NAMES[p.tool].toUpperCase(),x,y-4,'#f0e8bc',{align:'center'});}
function hud(g,r,S,pres,game,ox,oy){
 const ph=G.Op.phaseDef(S),c=G.cases.find(c=>c.id===S.caseId),P=S.players[0],W=r.W,H=r.H,staticMonitor=ph?.static&&S.phaseTime%20<15;
 box(g,5,5,130,33,'#416c75');text(g,'PULSE',11,10,'#9bbeb3');
 if(staticMonitor){for(let i=0;i<21;i++)px.line(g,46+i*4,12+(i*17+S.worldTime*23)%17,49+i*4,12+(i*11+S.worldTime*13)%17,'#78969b');text(g,'--',13,20,'#a7c3b9',{scale:2});}
 else {text(g,String(Math.ceil(S.vitals)).padStart(2,'0'),12,21,S.vitals<30&&Math.floor(S.elapsed*4)%2?'#ff9c7e':'#c5efbe',{scale:2});for(let i=0;i<77;i++){const phase=((i-S.worldTime*46)%42+42)%42,yy=phase<16?0:phase<19?-(phase-16)*2:phase<22?6-(phase-19)*4:phase<25?-6+(phase-22)*2:0;px.line(g,49+i,23-yy,50+i,23-yy,'#82d8b2',1);}if(S.vitals<30)text(g,'CRITICAL',140,31,'#ffb995');}
 box(g,W-102,5,68,25,'#416c75');const sec=Math.max(0,Math.ceil(S.clock)),clock=S.lab?'LAB':String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');text(g,clock,W-68,13,'#e8edc8',{scale:2,align:'center'});
 if(ph){text(g,ph.name.length>27?ph.name.slice(0,26):ph.name,W/2+8,11,'#e5e9cb',{align:'center'});text(g,`${c.id===12?'GRAND ROUNDS':'CASE '+String(c.id).padStart(2,'0')}  /  ${S.phase+1} OF ${c.phases.length}`,W/2+8,24,'#97bdb5',{align:'center'});}
 if(pres.phaseBanner>0&&ph){box(g,W/2-126,43,252,29,'#649b95');text(g,ph.name.toUpperCase(),W/2,48,'#e7f3d0',{align:'center'});text(g,pres.bark?.slice(0,42)||'Read the field. Call the tool.',W/2,61,'#acd1c4',{align:'center'});}
 if(ph?.tutorial&&!S.learned[ph.tutorial]&&pres.phaseBanner<=0){const tip=ph.tip;const lines=E.font.wrap(tip,224,{scale:1});box(g,W/2-122,40,244,13+lines.length*10,'#81b7ac');lines.forEach((l,i)=>text(g,l,W/2,46+i*10,'#e3edcf',{align:'center'}));text(g,'TRAINING: CLOCK HELD',W/2,43+lines.length*10,'#b4dabc',{align:'center'});}
 const port=G.Portraits.get(S.doctor==='sokolova'?'vale':'quill','neutral',false,true);g.drawImage(port,28,16,56,64,4,H-64,56,64);px.reset(g);
 if(pres.bark&&pres.barkTime>0){box(g,62,H-34,Math.min(246,W-174),29,'#31545f');text(g,'QUILL',68,H-30,'#9fcfc0');const barkLines=E.font.wrap(pres.bark,Math.min(234,W-186));text(g,(barkLines[0]||'').slice(0,42),68,H-18,'#e3efce');}
 text(g,G.TOOL_NAMES[P.tool].toUpperCase(),W-8,H-44,G.TOOL_COLORS[P.tool],{align:'right'});text(g,(S.doctor==='vale'?'LONG BREATH':'SECOND LOOK'),W-8,H-28,'#9ecbc3',{align:'right'});
 E.ui.bar(g,W-98,H-16,90,6,S.gauge/100,S.gauge>=(S.doctor==='vale'?35:45)?'#8de0c2':'#53737e');text(g,game.input.label('gift')+' '+(S.slow?'ACTIVE':S.gauge>=(S.doctor==='vale'?35:45)?'READY':Math.floor(S.gauge)+'%'),W-8,H-9,'#d4eacf',{align:'right'});
 if(P.flow>=3)text(g,'FLOW x'+P.flow,W-8,H-56,'#f0dcab',{align:'right'});
 if(c.consult)text(g,game.input.label('consult')+' CONSULT',W-8,H-68,'#b3d9ce',{align:'right'});
 if(S.slow){text(g,'THE STEADY',W/2,82,'#c7ffea',{align:'center',scale:2});text(g,'The world breathes. Your hands do not wait.',W/2,101,'#aad9d5',{align:'center'});}
 if(ph?.static&&S.phaseTime%3<1.5)text(g,'QUILL: "'+Math.round(S.vitals)+', Doctor."',W/2,H-51,'#cce5cc',{align:'center'});
 if(game.settings.hints&&(S.difficulty==='Intern'||(G.runtime?.idle||0)>6)&&S.mode==='operating'){const need=S.objects.find(o=>!o.done&&!G.objects[o.type]?.decor);if(need){const k=need.hidden&&need.marked<=S.worldTime?7:G.Op.toolFor(S,need);if(k>=0&&P.tool!==k)text(g,'CALL '+G.TOOL_NAMES[k].toUpperCase()+' / '+game.input.label('toolNext')+' TOOLS',W/2,H-48,G.TOOL_COLORS[k],{align:'center'});}}
 if(S.lab)text(g,'SKILLS LAB  /  '+game.input.label('pause')+' EXIT',W/2,H-10,'#a7d7bd',{align:'center'});
 if(S.dev)text(g,'DEV',6,43,'#f3cf8d');
 if(S.mode==='blue'){
  px.blend(g,.8,'normal',()=>px.rect(g,0,H/2-48,W,96,'#0b2030'));text(g,'CODE BLUE',W/2,H/2-39,'#d6e5f0',{align:'center',scale:3});
  const u=(S.blue.t%.9)/.9,xx=W/2-110;px.line(g,xx,H/2+5,xx+220,H/2+5,'#6197b9',1);px.line(g,xx+104,H/2+10,xx+110,H/2-15,'#dbefda',2);px.line(g,xx+110,H/2-15,xx+117,H/2+13,'#dbefda',2);px.rect(g,xx+u*220-1,H/2-20,3,39,'#fae1a8');
  text(g,game.input.label('useTool')+' SHOCK ON THE PEAK',W/2,H/2+31,'#dfedce',{align:'center'});for(let i=0;i<4;i++)px.disc(g,W/2-24+i*16,H/2+49,3,i<S.blue.hits?'#a9ebc5':i<S.blue.attempts?'#d29480':'#4c6678');
 }
 if(S.mode==='closing'){
  const rad=16+Math.abs((S.closeTime%1.6)-.8)*65;circle(g,W/2,oy+116,rad,'#e5e5b6',2);circle(g,W/2,oy+116,16,'#8fc9b0',1);text(g,'DRESSING',W/2,oy+162,'#f5e5ba',{align:'center',scale:2});text(g,game.input.label('useTool')+' AS THE RINGS MEET',W/2,oy+183,'#d0e2bb',{align:'center'});
 }
}
function create(){return {caseId:0,field:null,pops:[],bark:'',barkTime:0,phaseBanner:0};}
function present(P,S,game,events,dt){P.phaseBanner=Math.max(0,P.phaseBanner-dt);P.barkTime=Math.max(0,P.barkTime-dt);P.pops=P.pops.map(p=>({...p,life:p.life-dt})).filter(p=>p.life>0);
 for(const e of events){if(e.k==='grade'){P.pops.push({...e,life:1.1});if(e.grade==='Textbook'&&S.players[e.p]?.actions%4===0){P.bark=G.barks.textbook[S.players[e.p].actions%G.barks.textbook.length];P.barkTime=3;}}
  if(e.k==='phase'){P.phaseBanner=2.5;P.bark=e.tip||e.text;P.barkTime=4;}
  if(e.k==='slip'||e.k==='tear'){P.bark=G.barks.slip[S.players[e.p]?.slips%8||0];P.barkTime=3;game.shake(e.k==='tear'?2:1);game.input.rumble(.55,.1);game.flash('#c76a63',.1,.2);}
  if(e.k==='stitch'){game.input.rumble(.2,.05);game.particles.glints(e.x+((game.W-426)>>1),e.y+((game.H-240)>>1),0,3,'#acdbf2');}
  if(e.k==='reveal'||e.k==='free')game.input.rumble(.25,.04);
  if(e.k==='lurch'){game.shake(5);P.bark='No. Again. Use The Steady.';P.barkTime=4;}
  if(e.k==='shock'){game.flash('#e5efff',.25,.7);game.shake(4);game.input.rumble(1,.3);}
  if(e.k==='rewind'||e.k==='forcedRewind'){P.bark='No. Again.';P.barkTime=3;}
  if(e.k==='tool')game.input.rumble(.12,.03);
 }
 if(S.vitals<40&&P.barkTime<=0){P.bark=G.barks.low[Math.floor(S.elapsed/8)%8];P.barkTime=3;}
 const quiet=G.Op.phaseDef(S)?.static&&S.phaseTime%20<15;G.Sound?.present(quiet?events.filter(e=>e.k==='phase'):events);
}
function draw(r,S,P,game,cursors=[]){
 const c=G.cases.find(q=>q.id===S.caseId),ox=(r.W-426)>>1,oy=(r.H-240)>>1,t=S.worldTime;
 if(!P.field||P.caseId!==S.caseId){P.caseId=S.caseId;P.field=G.bakeSite(c.site,S.seed);}
 const F=P.field;stamp(F,S);const lens=S.players.find(p=>p.tool===7&&p.trig>.3),ph=G.Op.phaseDef(S),u=t%.9,beat=Math.exp(-(((u-.06)/.035)**2))+.45*Math.exp(-(((u-.2)/.05)**2));
 const bid=G.matId('blood'),wid=G.matId('wound');if(!P.redRamps)P.redRamps=redBloodRamps;if(!P.clinical)P.clinical=[G.makeRamp(['#081c24','#1c4551','#3c6970','#74908c'],20),G.makeRamp(['#061620','#1b3640','#325660','#547a7c'],20)];G.MATS[bid].ramp=game.settings.blood==='Clinical teal-grey'?P.clinical[0]:P.redRamps[0];G.MATS[wid].ramp=game.settings.blood==='Clinical teal-grey'?P.clinical[1]:P.redRamps[1];
 F.shade({beat,breath:Math.sin(t*.45)*.4,slow:S.slow,lens:lens?{x:lens.x,y:lens.y,r:S.doctor==='vale'?48:38}:null,light:c.tilt?[Math.sin(t*.7)*.35-.25,-.45]:undefined,dim:ph?.blackout ? .82 : 0,spot:ph?.blackout?{x:S.players[0].x,y:S.players[0].y,r:32}:null});
 const origin=r.w(0,0,0),g0=r.ctx;px.rect(g0,0,0,r.W,r.H,'#164c4b');for(let y=0;y<r.H;y+=20)px.line(g0,0,y,r.W,y+10,'#1d5653',1);g0.drawImage(F.cv,origin[0]+ox,origin[1]+oy);px.reset(g0);
 r.overlay(g=>{
  g.save();g.translate(ox,oy);px.reset(g);objects(g,S);
  for(const pop of P.pops){text(g,pop.grade,pop.x,pop.y-14-(1.1-pop.life)*13,pop.grade==='Textbook'?'#fff1b4':pop.grade==='Clean'?'#d1f8d8':'#f2bca1',{align:'center',scale:pop.grade==='Textbook'?2:1});}
  const ghost=S.rewindFx>0;if(ghost)for(let y=0;y<240;y+=7)px.line(g,0,y,426,y,'#8bafc2',1);
  for(const p of S.players){if(p.gone)continue;const cursor=cursors.find(q=>q.id===p.id),x=cursor?.aimX??cursor?.x??p.x,y=cursor?.aimY??cursor?.y??p.y,ownColor=c.coop?G.COLORS[p.id%4]:'#bfe5d8';
   if(p.fine&&(cursor?.fineTime||0)>.15){if(!P.loupe)P.loupe=E.mkCanvas(68,68);const lg=P.loupe.getContext('2d');lg.imageSmoothingEnabled=false;lg.clearRect(0,0,68,68);lg.drawImage(g.canvas,x+ox-17,y+oy-17,34,34,0,0,68,68);for(let row=0;row<68;row++){const half=Math.sqrt(Math.max(0,34*34-(row-34)**2)),xx=34-half;g.drawImage(P.loupe,xx,row,half*2,1,x-half,y-34+row,half*2,1);}px.reset(g);circle(g,x,y,34,'#b4d7c8',1);}
   if(p.tool===7&&p.trig>.3){circle(g,x,y,38,'#a1d8d7',1);circle(g,x,y,10+(t*22)%28,'#68a6b0',1);}
   G.Instruments.draw(g,p.tool,x,y,p.trig,ownColor,Math.min(1,p.charge/.55),p.heat);
   px.line(g,x-5,y,x-2,y,'#eef8d8',1);px.line(g,x+2,y,x+5,y,'#eef8d8',1);px.line(g,x,y-5,x,y-2,'#eef8d8',1);px.line(g,x,y+2,x,y+5,'#eef8d8',1);
   const target=G.Op.target(S,{...p,x,y});if(target&&G.dist({x,y},target)<38&&S.mode==='operating'){const hint=game.input.label('useTool')+' '+G.TOOL_VERBS[p.tool],w=E.font.width(hint)+8,X=x>263?x-w-12:x+12,Y=y<70?y+20:y-18;box(g,X,Y,w,14,G.TOOL_COLORS[p.tool]);text(g,hint,X+4,Y+4,G.TOOL_COLORS[p.tool]);}
   if(p.tool===4&&p.charge>0)E.ui.bar(g,x-10,y-13,20,3,Math.min(1,p.charge/.55),'#ecddad');
   if(p.tool===5&&p.heat>0)E.ui.bar(g,x-10,y-13,20,3,p.heat,p.lock>0?'#ec977d':'#f3c68c');
   if(cursor?.wheelShow>0){const need=S.objects.find(o=>!o.done&&!G.objects[o.type]?.decor),hint=need?(need.hidden&&need.marked<=S.worldTime?7:G.Op.toolFor(S,need)):-1;wheel(g,p,Math.max(60,Math.min(366,x)),Math.max(87,Math.min(150,y)),game.settings.hints?hint:-1);}
  }
  g.restore();px.reset(g);hud(g,r,S,P,game,ox,oy);
 });
}
G.OpArt={create,present,draw,wheel,text,box,brackets,guide};
})();
