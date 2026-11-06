(() => {
const G=window.GAME,{clone,dist,rng,TUNING:T,DIFFICULTY:D}=G;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const histories=new WeakMap(),checkpoints=new WeakMap();
const emit=(S,k,x=213,y=116,data={})=>S.ev.push({k,x,y,...data});
const spec={
 shard:{tool:0,drain:.1},laceration:{tool:3,drain:.2},patch:{tool:3,drain:.1},wound:{tool:2,drain:.4},arteryTear:{tool:2,drain:1},
 bleeder:{tool:5,drain:.5,need:.35},polyp:{tool:5,drain:.1,need:.5},pool:{tool:6,drain:0},guide:{tool:1,drain:0},
 mass:{drain:.2},hook:{drain:.3},clot:{drain:.3},iv:{tool:4,drain:0},nerve:{drain:0,decor:true},eloquent:{drain:0,decor:true},
 nest:{drain:.1},bead:{tool:5,drain:.04,need:.12},legato:{drain:.16},tremolo:{drain:.6},reed:{tool:4,drain:0},
 dacapo:{drain:0,decor:true},lobe:{drain:.1},fermata:{drain:.2},mouth:{drain:.2},voicebox:{tool:4,drain:.25},repeat:{tool:1,drain:.12},lastnote:{drain:.15},
 retractorHandle:{tool:0,drain:0,decor:true},screw:{tool:0,drain:.04},board:{tool:7,drain:0},bypass:{tool:5,drain:.05,need:.8},wire:{tool:1,drain:.05},device:{tool:0,drain:.15}
};
Object.entries(spec).forEach(([id,d])=>G.defObject(id,d));
const ring=(x,y,r)=>Array.from({length:33},(_,i)=>[x+Math.cos(-Math.PI/2+i*Math.PI/16)*r,y+Math.sin(-Math.PI/2+i*Math.PI/16)*r]);
function add(S,data){
 const o={id:S.nextId++,...clone(data),ox:data.x,oy:data.y,stage:0,done:false,progress:0,marked:0,cut:0,stitches:0,tears:0,age:0,...clone(data)};
 if(o.axis===undefined)o.axis=[0,-1];
 if(o.depth===undefined)o.depth=28;
 if(o.type==='pool')o.volume=o.volume||65;
 if(['patch','laceration'].includes(o.type)){o.r=o.r||13;o.cells=[];const r=o.r;for(let y=-r;y<=r;y+=4)for(let x=-r;x<=r;x+=4)if(x*x+y*y<=r*r)o.cells.push([o.x+x,o.y+y,0]);}
 if(['wound','arteryTear'].includes(o.type)){o.n=o.n||3;o.length=o.length||32;}
 if(o.type==='mass')o.points=ring(o.x,o.y,o.r||23);
 if(o.type==='hook')o.points=[[o.x-12,o.y-14],[o.x+12,o.y-14]];
 if(o.type==='nest')o.points=[[o.x-12,o.y],[o.x+12,o.y]];
 if(o.type==='legato'){o.segments=o.segments||8;o.left=o.segments;o.points=[[o.x-19,o.y],[o.x+19,o.y]];o.depth=28;o.maxSpeed=90;}
 if(o.type==='tremolo'){o.amp=1;o.need=3;}
 if(o.type==='fermata'){o.hits=0;o.need=.3;o.hidden=false;}
 if(o.type==='mouth')o.points=[[o.x-17,o.y-11],[o.x+17,o.y-11]];
 if(o.type==='wire')o.points=[[o.x-10,o.y],[o.x+10,o.y]];
 if(o.type==='repeat'){o.points=[[o.x-22,o.y],[o.x+22,o.y]];o.hits=0;}
 if(o.type==='lastnote'){o.points=Array.from({length:73},(_,i)=>{const a=i/72*Math.PI*4,r=5+i/72*31;return [o.x+Math.cos(a)*r,o.y+Math.sin(a)*r];});o.depth=45;}
 S.objects.push(o);
 if(o.type==='tremolo')for(let i=0;i<5;i++){const a=i*Math.PI*.4-Math.PI/2;add(S,{type:'reed',x:o.x+Math.cos(a)*48,y:o.y+Math.sin(a)*35,parent:o.id,index:i});}
 if(o.type==='dacapo')for(let i=0;i<3;i++)add(S,{type:'lobe',x:140+i*73,y:113,index:i,parent:o.id,round:o.round||1,points:[[128+i*73,113],[152+i*73,113]],depth:26});
 return o;
}
function player(id=0){return {id,x:213,y:116,tool:0,trig:0,prev:0,fine:false,score:0,slips:0,flow:0,bestFlow:0,clean:0,textbook:0,actions:0,stitches:0,burns:0,suction:0,heat:0,lock:0,charge:0,cool:0,grab:null,stroke:null,stitch:null,slipCool:0,swap:0,gone:false};}
function phaseDef(S){return G.cases.find(c=>c.id===S.caseId).phases[S.phase];}
function enterPhase(S,index){
 const c=G.cases.find(c=>c.id===S.caseId);S.phase=index;S.phaseTime=0;S.objects=[];S.domes=[];S.phaseLimit=null;S.flags={};S.phaseDelay=.5;
 for(const p of S.players){p.grab=p.stroke=p.stitch=null;p.trig=p.prev=0;}
 if(index>=c.phases.length){S.mode='closing';S.closeTime=0;emit(S,'dressing');return;}
 const ph=c.phases[index];
 const N=S.players.filter(p=>!p.gone).length;
 ph.objects.forEach(d=>add(S,d));
 if(ph.scale&&N>1){for(let i=1;i<N;i++)for(const d of ph.objects.filter(o=>!['pool','dacapo'].includes(o.type)))add(S,{...clone(d),x:clamp(d.x+(i%2?18:-18),75,350),y:clamp(d.y+i*13,60,175)});}
 if(ph.dip!==undefined)S.vitals=ph.dip;
 if(ph.gauge)S.gauge=Math.max(S.gauge,ph.gauge);
 if(ph.refill)S.clock+=ph.refill;
 if(ph.limit)S.phaseLimit=ph.limit;
 if(ph.codeBlue&&!S.blueUsed&&S.difficulty!=='Attending')triggerBlue(S);
 if(ph.codeBlue&&S.difficulty==='Attending')S.flags.attendingBlue=true;
 emit(S,'phase',213,116,{text:ph.name,tip:ph.tip});
 checkpoints.set(S,clone({...S,ev:[]}));
}
function create(c,options={}){
 if(typeof c==='number')c=G.cases.find(q=>q.id===c);
 const difficulty=options.difficulty||'Resident';
 const S={caseId:c.id,seed:options.seed||517,rng:options.seed||517,difficulty,doctor:c.doctor,phase:0,phaseTime:0,elapsed:0,worldTime:0,clock:c.clock*D[difficulty].clock*T.clock,vitals:c.vitals,gauge:options.gauge||35,slow:false,blueUsed:false,blue:null,mode:'operating',objects:[],players:Array.from({length:options.players||1},(_,i)=>player(i)),nextId:1,ev:[],flags:{},learned:{},domes:[],ghosts:[],rewindFx:0,rankCap:null,dev:false,lab:!!options.lab,attract:!!options.attract,failures:0};
 histories.set(S,{list:[],acc:0});enterPhase(S,0);return S;
}
function slip(S,p,damage=3,x=p.x,y=p.y,kind='slip'){
 if(p.slipCool>0)return;
 S.vitals-=damage*T.slipDamage;p.slips++;p.flow=0;p.slipCool=.35;p.score=Math.max(0,p.score-40);S.dev ||= !!G.cheats.lockVitals;
 emit(S,kind,x,y,{p:p.id});
}
function grade(S,p,o,quality=2,points=100){
 const names=['Sloppy','Clean','Textbook'];const q=clamp(quality,0,2);
 p.actions++;p.clean+=q>=1?1:0;p.textbook+=q===2?1:0;
 if(q===0)p.flow=0;else p.flow++;
 p.bestFlow=Math.max(p.bestFlow,p.flow);p.score+=Math.round(points*[.4,1,1.5][q]*(1+Math.min(20,p.flow)*.05));
 S.gauge=clamp(S.gauge+[0,5,10][q]*T.charge,0,100);S.learned[G.TOOLS[p.tool]]=true;
 emit(S,'grade',o.x,o.y,{grade:names[q],p:p.id});
}
function finishObject(S,p,o,q=2,points=100){if(o.done)return;o.done=true;grade(S,p,o,q,points);emit(S,'complete',o.x,o.y,{type:o.type,p:p.id});
 if(o.type==='mass')add(S,{type:'wound',x:o.x,y:o.y,n:3,length:34});
}
function triggerBlue(S){S.mode='blue';S.slow=false;S.blueUsed=true;S.blue={t:0,attempts:0,hits:0,lastCycle:-1};emit(S,'blue');}
function blueStep(S,inputs,dt){const b=S.blue;b.t+=dt;const cycle=Math.floor(b.t/.9),u=b.t% .9;
 let pressed=false;for(let i=0;i<S.players.length;i++){const inp=inputs[i]||{},p=S.players[i];const v=inp.trig||0;if(v>.3&&p.prev<=.3)pressed=true;p.prev=v;}
 if(pressed&&cycle!==b.lastCycle){b.lastCycle=cycle;b.attempts++;if(Math.abs(u-.45)<.14){b.hits++;emit(S,'shock',213,116,{good:true});}else emit(S,'shock',213,116,{good:false});}
 if(cycle>b.lastCycle+1&&cycle>0){b.attempts++;b.lastCycle=cycle-1;}
 if(b.hits>=2){S.vitals=30;S.mode='operating';emit(S,'revived');if(phaseDef(S).codeBlue)enterPhase(S,S.phase+1);}
 else if(b.attempts>=4){S.mode='lost';emit(S,'lost');}
}
function pathInfo(points,x,y){let best={d:Infinity,along:0,x:0,y:0,tx:1,ty:0},total=0;for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i],dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy),t=clamp(((x-ax)*dx+(y-ay)*dy)/(len*len||1),0,1),px=ax+dx*t,py=ay+dy*t,d=Math.hypot(x-px,y-py);if(d<best.d)best={d,along:total+len*t,x:px,y:py,tx:dx/(len||1),ty:dy/(len||1)};total+=len;}return {...best,total};}
function pathAt(points,d){for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i],len=Math.hypot(bx-ax,by-ay);if(d<=len){const t=clamp(d/(len||1),0,1);return [ax+(bx-ax)*t,ay+(by-ay)*t];}d-=len;}return points[points.length-1];}
function stitchPair(S,o){const shift=o.roll?Math.sin(S.worldTime*1.3)*6:0,y=o.y-(o.length||32)/2+((o.stitches+.5)/(o.n||3))*(o.length||32);return [[o.x-10+shift,y],[o.x+10+shift,y]];}
const onBeat=S=>(S.worldTime%.9)<.19;
function lobeOpen(S,o){const periods=[6,7,9],windows=[2.5,2.5,3],speed=(o.round===2?2:1)*T.strainSpeed;return (S.phaseTime*speed+(o.index===0?0:o.index===1?3:6))%periods[o.index]<windows[o.index]*(S.difficulty==='Intern'?1.5:1);}
function eyeOpen(S,o){return ((S.phaseTime*T.strainSpeed)%5.7)>=5;}
function toolFor(S,o){
 if(o.type==='mass'||o.type==='hook'||o.type==='nest')return o.stage===0?1:0;
 if(o.type==='clot')return o.stage===0?4:0;
 if(o.type==='legato')return o.stage===0?1:o.stage===2?5:0;
 if(o.type==='tremolo')return o.stage===0?-1:o.stage===1?5:0;
 if(o.type==='lobe')return o.index===0?5:o.index===1?(o.stage===0?1:0):(o.stage===0?4:3);
 if(o.type==='fermata')return o.stage<2?5:0;
 if(o.type==='mouth')return o.stage===0?1:5;
 if(o.type==='lastnote')return o.stage===0?1:0;
 return spec[o.type]?.tool??-1;
}
function visible(S,o){if(o.done)return false;if(o.hidden&&o.marked<=S.worldTime&&!G.cheats.reveal)return false;
 if(o.underPool&&S.objects.some(q=>q.type==='pool'&&!q.done&&dist(o,q)<42))return false;
 if(o.type!=='pool'&&S.objects.some(q=>q.type==='pool'&&!q.done&&q.volume>12&&dist(o,q)<Math.sqrt(q.volume)*2.1))return false;
 return true;
}
function target(S,p,tool=p.tool){let list=S.objects.filter(o=>visible(S,o)&&toolFor(S,o)===tool);
 if(tool===7)list=S.objects.filter(o=>!o.done&&(o.hidden||['board','legato','fermata'].includes(o.type)));
 let best=null,dd=Infinity;for(const o of list){let d=dist(p,o);if(tool===1&&o.points)d=pathInfo(o.points,p.x,p.y).d;
 if(tool===2){const pair=stitchPair(S,o);d=Math.min(Math.hypot(p.x-pair[0][0],p.y-pair[0][1]),Math.hypot(p.x-pair[1][0],p.y-pair[1][1]));}
 if(d<dd){dd=d;best=o;}}
 return best;
}
function inDome(S,p){return S.domes.some(d=>d.left>0&&Math.hypot(p.x-d.x,p.y-d.y)<d.r);}
function beginStroke(S,p,o){
 if(o.retracted&&!S.flags.retracted)return;
 const start=pathAt(o.points,o.cut||0);if(Math.hypot(p.x-start[0],p.y-start[1])>8+T.assist)return;
 p.stroke={id:o.id,error:0,samples:0,off:0};emit(S,'cut',p.x,p.y,{p:p.id});
}
function cutDone(S,p,o,q){o.cut=0;p.stroke=null;
 if(o.type==='guide'){finishObject(S,p,o,q);}
 else if(o.type==='hook'&&o.stage===0&&!o.relief){o.relief=1;o.points=[[o.x-12,o.y+13],[o.x+12,o.y+13]];grade(S,p,o,q,60);}
 else if(o.type==='wire'){
 if(!S.flags.bypass||o.order!==(S.flags.wireOrder||0)){slip(S,p,30);S.clock-=30;return;}
 S.flags.wireOrder=(S.flags.wireOrder||0)+1;finishObject(S,p,o,q);
 }else if(o.type==='repeat'){
 if((S.phaseTime%20)<17)return;o.hits++;grade(S,p,o,q,180);o.lockUntil=S.phaseTime+(20-S.phaseTime%20)+16.8;
 if(o.hits>=6)finishObject(S,p,o,q,200);
 }else {o.stage=1;grade(S,p,o,q,60);}
}
function useTool(S,p,inp,dt,wd){
 const prev=p.prev,pressed=p.trig>.3&&prev<=.3,released=p.trig<=.3&&prev>.3,held=p.trig>.3;
 p.cool=Math.max(0,p.cool-dt);p.lock=Math.max(0,p.lock-dt);p.slipCool=Math.max(0,p.slipCool-dt);p.swap=Math.max(0,p.swap-dt);
 if(inp.cancel){p.grab=p.stroke=p.stitch=null;p.charge=0;return;}
 if(p.swap>0)return;
 if(inDome(S,p)&&p.tool!==7){if(pressed)emit(S,'held',p.x,p.y,{text:'TIME HELD'});return;}
 const o=target(S,p),near=o&&dist(p,o)<(p.tool===6?Math.max(14,Math.sqrt(o.volume||1)*2.3):p.tool===3?(o.r||13)+10:14);
 const blocked=o&&o.type==='lobe'&&!lobeOpen(S,o);
 if(p.tool===0){
  if(pressed&&o&&near&&!blocked){
   if(o.type==='retractorHandle'){p.grab={id:o.id,handle:true};}
   else if(o.type==='screw'){p.grab={id:o.id,screw:true,angle:Math.atan2(p.y-o.y,p.x-o.x),turn:0};}
   else {p.grab={id:o.id,lastX:p.x,lastY:p.y,pull:0,off:0,free:false};emit(S,'grip',o.x,o.y);}
  }
  if(p.grab){const g=p.grab,q=S.objects.find(a=>a.id===g.id);if(!q||q.done){p.grab=null;return;}
   if(g.handle){S.flags.retracted=held; if(!held)p.grab=null;return;}
   if(g.screw){if(held){const a=Math.atan2(p.y-q.y,p.x-q.x);let da=a-g.angle;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;g.turn+=Math.abs(da);g.angle=a;q.progress=g.turn/(Math.PI*6);if(q.progress>=1){finishObject(S,p,q);p.grab=null;}}else p.grab=null;return;}
   if(held&&!g.free){const dx=p.x-g.lastX,dy=p.y-g.lastY,a=q.axis,along=dx*a[0]+dy*a[1],off=dx*(-a[1])+dy*a[0];g.pull=Math.max(0,g.pull+along);g.off+=off;
    const speed=Math.hypot(dx,dy)/Math.max(.00001,dt);q.tension=speed/(q.maxSpeed||120);
    if((speed>(q.maxSpeed||120)*1.15||Math.abs(g.off)>8)&&p.slipCool<=0){slip(S,p,4,p.x,p.y,'tear');g.pull*=.7;g.off=0;q.tears++;add(S,{type:'laceration',x:q.x+9,y:q.y+9,r:9,optional:true});if(q.type==='legato'){q.stage=0;q.progress=0;q.hidden=true;q.marked=0;p.grab=null;return;}}
    q.progress=clamp(g.pull/q.depth,0,1);g.lastX=p.x;g.lastY=p.y;if(g.pull>=q.depth){g.free=true;emit(S,'free',p.x,p.y);}
   }
   if(released){if(g.free&&Math.hypot(p.x-q.x,p.y-q.y)>=24){
     if(q.type==='legato'){q.left=Math.max(0,q.left-4);q.progress=0;if(q.left<=0){finishObject(S,p,q,q.tears?1:2,180);}else{q.stage=2;grade(S,p,q,1,70);if(!q.split&&q.segments>4){q.split=true;add(S,{type:'legato',x:q.x+60,y:q.y+25,hidden:true,segments:4});emit(S,'split',q.x,q.y);}}}
     else {finishObject(S,p,q,q.tears>1?0:q.tears?1:2,q.type==='lastnote'?400:120);if(q.type==='lastnote'){S.flags.silence=3;emit(S,'silence');}}
   }else q.progress=0;p.grab=null;}
  }
 }else if(p.tool===1){
  if(pressed&&o&&!blocked){if(o.type==='repeat'&&((S.phaseTime%20)<17||S.phaseTime<o.lockUntil))return;beginStroke(S,p,o);}
  if(held&&!p.stroke&&o&&['wire','mouth','repeat'].includes(o.type)&&!blocked&&p.speed>=60&&pathInfo(o.points,p.x,p.y).d<5&&(o.type!=='repeat'||S.phaseTime%20>=17&&S.phaseTime>=(o.lockUntil||0))){cutDone(S,p,o,2);return;}
  if(held&&p.stroke){const q=S.objects.find(a=>a.id===p.stroke.id);if(!q||q.done){p.stroke=null;return;}const z=pathInfo(q.points,p.x,p.y);p.stroke.samples++;p.stroke.error+=z.d;
   const gated=q.type==='lastnote'&&onBeat(S);if(gated){if(z.along>(q.cut||0)+2)slip(S,p,2);}
   else if(z.d<=9*T.tolerance+T.assist&&z.along<(q.cut||0)+18){q.cut=Math.max(q.cut||0,z.along);p.stroke.off=0;}
   else {p.stroke.off+=dt;if(p.stroke.off>.12){slip(S,p,3);p.stroke.off=0;}}
   if((q.cut||0)>=z.total-2){const error=p.stroke.error/Math.max(1,p.stroke.samples);cutDone(S,p,q,error<1.8*T.tolerance?2:error<4*T.tolerance?1:0);}
  }
  if(released)p.stroke=null;
  if(held&&!p.stroke&&p.speed>6&&(!o||!near)){p.bare=(p.bare||0)+dt;if(p.bare>.2){slip(S,p,3);p.bare=0;}}
 }else if(p.tool===2){
  if(pressed&&o&&!o.done){const pair=stitchPair(S,o);if(Math.hypot(p.x-pair[0][0],p.y-pair[0][1])<=9+T.assist)p.stitch={id:o.id,t:0};}
  if(p.stitch){p.stitch.t+=dt;const q=S.objects.find(a=>a.id===p.stitch.id);if(!q){p.stitch=null;return;}
   if(released){const pair=stitchPair(S,q),ok=Math.hypot(p.x-pair[1][0],p.y-pair[1][1])<=6+(S.doctor==='sokolova'?1:0)+T.assist;
    if(ok&&!(q.beatGate&&onBeat(S))){q.stitches++;p.stitches++;const t=p.stitch.t;grade(S,p,q,t<=.6?2:t<=1.2?1:0,65);emit(S,'stitch',p.x,p.y);if(q.stitches>=q.n){q.done=true;emit(S,'complete',q.x,q.y,{type:q.type});}}
    else slip(S,p,1);p.stitch=null;
   }
  }
 }else if(p.tool===3){
  if(held&&o&&near&&!blocked){if(o.type==='lobe'){o.progress+=dt;if(o.progress>=1)finishObject(S,p,o,2,160);}else{
   let filled=0;for(const c of o.cells){if(Math.hypot(c[0]-p.x,c[1]-p.y)<10)c[2]=1;filled+=c[2];}o.progress=filled/o.cells.length;
   if(o.progress>=.9){S.vitals=clamp(S.vitals+2*T.healing,0,99);finishObject(S,p,o);}
  }}
 }else if(p.tool===4){
  if(held&&p.cool<=0)p.charge=Math.min(.9,p.charge+dt);
  if(released&&p.cool<=0&&p.charge>0){const fill=Math.min(1,p.charge/.55),bubble=p.charge>.85,q=p.charge>=.495&&!bubble?2:bubble?0:1;p.charge=0;p.cool=.35;
   if(o&&near&&!blocked){
    if(o.type==='reed'){if((S.worldTime%.9)<.3){o.done=true;const parent=S.objects.find(a=>a.id===o.parent);if(parent)parent.amp=Math.max(0,parent.amp-.2);grade(S,p,o,q,80);emit(S,'sedate',o.x,o.y);}else {slip(S,p,2);}}
    else if(o.type==='voicebox'){if((S.worldTime%.9)<.3){o.hits++;grade(S,p,o,q,160);if(o.hits>=3)finishObject(S,p,o,q,200);}else slip(S,p,2);}
    else if(o.type==='iv'){S.vitals=clamp(S.vitals+D[S.difficulty].dose*(T.syringeDose/18)*fill*T.healing*(bubble?.5:1),0,99);finishObject(S,p,o,q);}
    else {o.stage=1;grade(S,p,o,q,70);}
   }else S.vitals=clamp(S.vitals+D[S.difficulty].dose*(T.syringeDose/18)*fill*T.healing*(bubble?.5:1),0,99);
   emit(S,'inject',p.x,p.y,{fill});
  }
 }else if(p.tool===5){
  if(!held)p.heat=Math.max(0,p.heat-.6*dt);
  if(held&&p.lock<=0){p.heat+=T.cauteryHeat*dt;if(p.heat>=1){p.heat=1;p.lock=1.2;emit(S,'overheat',p.x,p.y);}
   const allowed=o&&near&&!blocked&&!(o.type==='fermata'&&!eyeOpen(S,o));
   if(allowed){p.bare=0;o.progress+=dt/(T.strainHealth||1);let need=spec[o.type]?.need||.5;
    if(o.type==='tremolo')need=3;
    if(o.type==='mouth')need=1.5;
    if(o.type==='lobe')need=1;
    if(o.type==='fermata')need=.3;
    if(G.cheats.oneHit&&G.strains[o.type])need=.01;if(o.progress>=need){p.burns++;if(o.type==='legato'){o.stage=1;o.progress=0;grade(S,p,o,2,70);}
     else if(o.type==='tremolo'){o.stage=2;o.progress=0;grade(S,p,o,2,180);}
     else if(o.type==='fermata'){o.progress=0;o.hits++;grade(S,p,o,2,100);if(o.hits===3){o.stage=1;o.hidden=true;o.marked=0;o.x=258;o.y=112;add(S,{type:'legato',x:163,y:126,segments:4,hidden:true});add(S,{type:'legato',x:220,y:146,segments:4,hidden:true});}if(o.hits>=6){o.stage=2;o.hidden=false;o.maxSpeed=60;o.depth=34;}}
     else {if(o.type==='bypass')S.flags.bypass=true;finishObject(S,p,o,p.lock>0?1:2);}
    }
   }else{p.bare=(p.bare||0)+dt;if(p.bare>.25)S.vitals-=.8*dt;if(p.bare>.6){slip(S,p,3);p.bare=0;emit(S,'char',p.x,p.y);}}
  }
 }else if(p.tool===6){
  if(held&&o&&near){const vol=Math.min(o.volume,T.suction*dt);o.volume-=vol;p.suction+=vol;if(o.volume<=0){o.done=true;emit(S,'drain',o.x,o.y);} }
 }else if(p.tool===7){
  if(held)for(const q of S.objects){if(q.done)continue;if(dist(p,q)<38*(S.doctor==='vale'?1.25:1)){q.marked=S.worldTime+4;if(q.type==='board'){finishObject(S,p,q);S.flags.boardRead=true;}if(q.hidden&&!q.seen){q.seen=true;emit(S,'reveal',q.x,q.y);S.learned.sonar=true;}}}
 }
 if(held&&(p.tool===1||p.tool===5)){for(const q of S.objects.filter(a=>a.type==='nerve'||a.type==='eloquent'))if(pathInfo(q.points,p.x,p.y).d<3)slip(S,p,12);}
}
function worldStep(S,wd){
 const c=G.cases.find(q=>q.id===S.caseId),ph=phaseDef(S);S.worldTime+=wd;S.phaseTime+=wd;
 let drain=c.drain;
 S.domes=S.domes.map(d=>({...d,left:d.left-wd})).filter(d=>d.left>0);
 for(const o of S.objects){if(o.done)continue;o.age+=wd;const def=spec[o.type];
  if(!inDome(S,o))drain+=(def?.drain||0)*(G.strains[o.type]?T.strainDamage:1)*(o.type==='wound'||o.type==='arteryTear'?1-o.stitches/o.n:1);
  if(['bleeder','arteryTear'].includes(o.type)){
   let pool=S.objects.find(q=>q.type==='pool'&&q.source===o.id&&!q.done);if(!pool&&o.age>3){pool=add(S,{type:'pool',x:o.x+5,y:o.y+4,volume:1,source:o.id,optional:true});}
   if(pool)pool.volume=Math.min(100,pool.volume+wd*(o.type==='bleeder'?6:14)*T.bleed);
  }
  if(o.type==='pool'&&c.tilt){o.x=clamp(o.x+Math.sin(S.worldTime*.8)*wd*12,90,330);}
  if(o.type==='tremolo'){
   if(o.stage===0&&o.amp<=.21){o.stage=1;emit(S,'crack',o.x,o.y);}
   if(o.stage===1){o.progress=Math.max(0,o.progress);if(o.age>18&&o.age%6<wd){const reed=S.objects.find(q=>q.parent===o.id&&q.done);if(reed){reed.done=false;o.amp=Math.min(1,o.amp+.2);}}}
  }
  if(o.type==='nest'&&o.age>2&&Math.floor(o.age*T.spawnRate/(T.staccatoBeat*2))>(o.spawned||0)&&S.objects.filter(q=>q.type==='bead'&&!q.done).length<4*S.players.length){o.spawned=(o.spawned||0)+1;add(S,{type:'bead',x:o.x+20,y:o.y+20});}
  if(o.type==='bead'){
   const t=(S.phaseTime*T.strainSpeed+(o.id%5)*.31)%T.staccatoBeat,u=t/T.staccatoBeat;
   o.x=o.ox+Math.sin(o.id*2+Math.floor((S.phaseTime+(o.id%5)*.31)/T.staccatoBeat))*(u>.7?9:3);
   o.y=o.oy-Math.sin(Math.PI*Math.min(1,u/.7))*10;
   if(u>.98&&o.age>6&&!o.bit){o.bit=true;add(S,{type:'laceration',x:o.ox+6,y:o.oy+6,r:8,optional:true});emit(S,'bite',o.x,o.y);}
  }
  if(o.type==='dacapo'){
   const lobes=S.objects.filter(q=>q.parent===o.id),dead=lobes.filter(q=>q.done).length;
   if(dead>0&&!o.first)o.first=S.phaseTime;
   if(dead===3){o.done=true;emit(S,'choirEnd',o.x,o.y);}
   else if(o.first&&S.phaseTime-o.first>10){for(const q of lobes){q.done=false;q.stage=0;q.progress=0;q.cut=0;}o.first=0;S.vitals-=8*T.strainDamage;emit(S,'repeat',o.x,o.y,{text:'FROM THE TOP'});}
  }
  if(o.type==='fermata'){
   if(o.stage<2&&!eyeOpen(S,o)&&S.domes.length===0)S.domes.push({x:o.x+33,y:o.y+13,r:34,left:5-(S.phaseTime%5.7)});
   if(o.stage===1)drain+=.05;
  }
  if(o.type==='repeat'&&S.phaseTime>=20){const cycle=Math.floor(S.phaseTime/20);if(cycle>(o.cycle||0)){o.cycle=cycle;if(S.phaseTime>=o.lockUntil||!o.lockUntil){const h=histories.get(S),old=h?.list.find(q=>S.elapsed-q.at<=6.1);if(old){const gauge=S.gauge,elapsed=S.elapsed,phaseTime=S.phaseTime,hits=o.hits,repeatId=o.id;h.forced={at:elapsed,s:clone({...S,ev:[],ghosts:[]})};restore(S,old.s);S.elapsed=elapsed;S.phaseTime=phaseTime;S.gauge=gauge;const sign=S.objects.find(q=>q.id===repeatId);if(sign){sign.hits=hits;sign.cycle=cycle;}emit(S,'forcedRewind',213,116);return;}}}}
 }
 const tutorial=ph.tutorial&&!S.learned[ph.tutorial]&&c.id<=4;
 if(!tutorial&&!S.lab){S.clock-=wd;S.vitals-=drain*wd*T.drain*D[S.difficulty].drain;}
 if(S.phaseLimit!==null){if(S.slow)S.flags.breathed=true;if(S.phaseTime>S.phaseLimit&&!S.flags.limitHit){S.flags.limitHit=true;S.vitals-=12;emit(S,'urgent',213,116,{text:'Keep the pulse alive'});}}
 if(ph.lurch&&S.phaseTime>ph.lurch&&!S.flags.lurched){S.flags.lurched=true;S.vitals-=7;S.players[0].slips++;emit(S,'lurch');}
 if(c.coop){const handles=S.objects.filter(o=>o.type==='retractorHandle');if(S.players.filter(p=>!p.gone).length===1&&handles.length){S.flags.retracted=(S.phaseTime%3)<1.5;S.flags.quillHolds=true;}}
 if(ph.codeBlue&&(S.blueUsed||S.flags.attendingBlue)){enterPhase(S,S.phase+1);return;}
 const nests=S.objects.filter(o=>o.type==='nest');if(nests.length&&nests.every(o=>o.done)){if(!S.flags.nestsClear)S.flags.nestsClear=S.phaseTime;if(S.phaseTime-S.flags.nestsClear>=3)for(const o of S.objects)if(o.type==='bead')o.done=true;}
 const active=S.objects.filter(o=>!o.done&&!spec[o.type]?.decor&&!o.optional);
 if(active.length===0){S.phaseDelay-=wd;if(S.phaseDelay<=0){S.completed=(S.completed||0)+1;enterPhase(S,S.phase+1);}}
 if(S.vitals<=0){if(!S.blueUsed&&S.difficulty!=='Attending')triggerBlue(S);else{S.mode='lost';emit(S,'lost');}}
 if(c.device&&S.vitals<25){S.mode='lost';emit(S,'detonate');}
 if(S.clock<=0&&!S.lab){S.mode='lost';emit(S,'lost');}
}
function restore(S,s){const ev=S.ev;Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,clone(s));S.ev=ev;}
function gift(S){
 const c=G.cases.find(q=>q.id===S.caseId);
 if(S.doctor==='sokolova'&&!c.coop){
  if(S.gauge<45)return false;const h=histories.get(S);if(h?.forced&&S.elapsed-h.forced.at<3){const hands=S.players.map(p=>({x:p.x,y:p.y,tool:p.tool})),gauge=S.gauge-45;restore(S,h.forced.s);S.gauge=gauge;S.players.forEach((p,i)=>{Object.assign(p,hands[i]);p.grab=p.stroke=p.stitch=null;p.prev=p.trig=0;});const sign=S.objects.find(o=>o.type==='repeat');if(sign){sign.hits++;sign.lockUntil=S.phaseTime+17;if(sign.hits>=6)sign.done=true;}h.forced=null;S.rewindFx=1.2;emit(S,'rewind');return true;}const want=Math.min(T.rewindSeconds,S.elapsed),sample=h?.list.find(q=>q.at>=S.elapsed-want);
  if(!sample)return false;const hands=S.players.map(p=>({x:p.x,y:p.y,tool:p.tool})),gauge=S.gauge-45;
  const ghosts=h.list.filter(q=>q.at>=sample.at).map(q=>({at:q.at-sample.at,p:q.s.players.map(p=>[p.x,p.y]),o:q.s.objects.filter(o=>!o.done).map(o=>[o.x,o.y])}));
  restore(S,sample.s);S.players.forEach((p,i)=>{Object.assign(p,hands[i]);p.grab=p.stroke=p.stitch=null;p.trig=p.prev=0;});S.gauge=gauge;S.ghosts=ghosts;S.ghostTime=0;S.rewindFx=1.2;h.list=h.list.filter(q=>q.at<sample.at);emit(S,'rewind');return true;
 }
 if(S.slow){S.slow=false;return true;}if(S.gauge<35)return false;S.slow=true;S.learned.gift=true;emit(S,'breath');return true;
}
function step(S,inputs,dt){
 S.ev=[];if(S.mode==='won'||S.mode==='lost')return;
 if(S.mode==='blue'){blueStep(S,inputs,dt);return;}
 if(S.clockT!==undefined&&T.clock!==S.clockT)S.clock*=T.clock/S.clockT;S.clockT=T.clock;
 S.elapsed+=dt;S.rewindFx=Math.max(0,S.rewindFx-dt);S.ghostTime=(S.ghostTime||0)+dt;
 if(S.mode==='closing'){S.closeTime+=dt;for(let i=0;i<inputs.length;i++){const a=inputs[i]||{},p=S.players[i];if((a.trig||0)>.3&&p.prev<=.3&&S.closeTime>.25){const err=Math.abs((S.closeTime%1.6)-.8);p.score+=err<.14?250:120;S.mode='won';emit(S,'closed',213,116,{text:err<.14?'TEXTBOOK DRESSING':'CASE CLOSED'});}p.prev=a.trig||0;}return;}
 if(S.flags.silence>0){S.flags.silence-=dt;if(S.flags.silence<=0)emit(S,'oneBeep');return;}
 const cheats=G.cheats||{};
 S.gauge=clamp(S.gauge+dt*.5*T.charge,0,100);
 for(let i=0;i<S.players.length;i++){const p=S.players[i],a=inputs[i]||{};if(p.gone)continue;
  const oldX=p.x,oldY=p.y;p.x=clamp(Number.isFinite(a.x)?a.x:p.x,28,398);p.y=clamp(Number.isFinite(a.y)?a.y:p.y,42,190);p.speed=Math.hypot(p.x-oldX,p.y-oldY)/dt;
  const nt=clamp(a.tool===undefined?p.tool:a.tool,0,7);if(nt!==p.tool){p.grab=p.stroke=p.stitch=null;p.charge=0;p.tool=nt;p.swap=.12;emit(S,'tool',p.x,p.y,{tool:nt,p:p.id});}p.fine=!!a.fine;p.trig=a.trig||0;
  if(a.consult&&G.cases.find(q=>q.id===S.caseId).consult){S.doctor=S.doctor==='vale'?'sokolova':'vale';emit(S,'consult',p.x,p.y,{doctor:S.doctor});}
  if(a.gift)gift(S);
  useTool(S,p,a,dt,dt*(S.slow?T.breathFactor:1));p.prev=p.trig;
 }
 if(S.slow){S.gauge-=T.breathDrain*dt;if(S.gauge<=0){S.gauge=0;S.slow=false;}}
 const wd=dt*(S.slow?T.breathFactor:1);const oldClock=S.clock;
 worldStep(S,wd);
 if(cheats.freezeClock)S.clock=oldClock;
 if(cheats.lockVitals||S.lab||S.attract)S.vitals=99;
 if(cheats.infiniteGift||S.attract)S.gauge=100;
 if(cheats.oneHit)for(const o of S.objects)if(G.strains[o.type])o.progress=10;
 S.vitals=clamp(S.vitals,0,99);
 if(cheats.lockVitals||cheats.freezeClock||cheats.infiniteGift||cheats.oneHit||cheats.reveal)S.dev=true;
 if(S.lab&&S.mode==='closing')enterPhase(S,0);
 const h=histories.get(S);if(h){h.acc+=dt;if(h.acc>=.1){h.acc=0;h.list.push({at:S.elapsed,s:clone({...S,ev:[],ghosts:[]})});while(h.list.length>Math.ceil(T.rewindSeconds*10)+5)h.list.shift();}}
}
function retry(S){const cp=checkpoints.get(S);if(!cp)return false;const failures=S.failures+1;restore(S,cp);S.mode='operating';S.rankCap='B';S.failures=failures;S.vitals=Math.max(45,S.vitals);const h=histories.get(S);if(h){h.list=[];h.acc=0;}emit(S,'phase',213,116,{text:phaseDef(S).name});return true;}
function rank(S){const c=G.cases.find(q=>q.id===S.caseId),score=S.players.reduce((a,p)=>a+p.score,0)+Math.max(0,S.clock)*2+S.vitals*3,ratio=score/c.par;let rank=ratio>=.95?'S':ratio>=.8?'A':ratio>=.6?'B':ratio>=.4?'C':'D';if(S.rankCap&&'SABCD'.indexOf(rank)<'SABCD'.indexOf(S.rankCap))rank=S.rankCap;return {rank,score:Math.round(score),star:rank==='S'&&S.difficulty==='Attending'&&S.players.every(p=>!p.slips)};}
Object.assign(G,{Op:{create,step,add,enterPhase,phaseDef,toolFor,visible,target,stitchPair,pathInfo,pathAt,onBeat,lobeOpen,eyeOpen,gift,triggerBlue,retry,rank,history:S=>histories.get(S),checkpoint:S=>checkpoints.get(S)},emit});
['nest','bead','legato','tremolo','reed','dacapo','lobe','fermata','mouth','voicebox','repeat','lastnote'].forEach(k=>G.strains[k]=spec[k]);
})();
