(() => {
const G=window.GAME;
function make(game,R){const H=window.AIHub;let info=null,phase='wait',card=null,ended=false,finished=false,inputN=0,snapN=0,heard=0,snapAcc=0,inputAcc=0,eventAcc=0,objectIndex=0,known=new Set(),eventQueue=[],lastPhase=-1;
 const remote={},lastInput={},mine=G.Cursor.create(0),recent=[];
 const packPlayer=p=>[p.id,Math.round(p.x*10)/10,Math.round(p.y*10)/10,p.tool,p.trig>.3?1:0,p.score,p.flow,p.slips,p.stitches,p.burns,Math.round(p.suction),p.gone?1:0,p.heat,p.charge];
 const packObj=o=>[o.id,o.type,Math.round(o.x*10)/10,Math.round(o.y*10)/10,o.done?1:0,o.stage,Math.round(o.progress*100)/100,o.stitches,Math.round((o.cut||0)*10)/10,Math.round(o.volume||0),Math.round((o.marked||0)*10)/10,Math.round(o.age*10)/10,o.hits||0,o.left||0,o.amp||0];
 function unpackObj(a){let o=R.S.objects.find(q=>q.id===a[0]);if(!o){o=G.Op.add(R.S,{id:a[0],type:a[1],x:a[2],y:a[3]});o.id=a[0];}Object.assign(o,{x:a[2],y:a[3],done:!!a[4],stage:a[5],progress:a[6],stitches:a[7],cut:a[8],volume:a[9],marked:a[10],age:a[11],hits:a[12],left:a[13],amp:a[14]});}
 function sendState(){
  if(ended||!R.S)return;const S=R.S,batch=[],objs=S.objects;if(objectIndex>=objs.length)objectIndex=0;
  const msg={t:'s',n:++snapN,ph:S.phase,m:S.mode,c:Math.round(S.clock*1000),v:Math.round(S.vitals*10)/10,g:Math.round(S.gauge),w:Math.round(S.worldTime*100)/100,pt:Math.round(S.phaseTime*100)/100,sl:S.slow?1:0,doc:S.doctor,rt:S.flags.retracted?1:0,ct:S.closeTime||0,b:S.blue?[S.blue.t,S.blue.attempts,S.blue.hits,S.blue.lastCycle]:null,bt:S.blue?H.time()-S.blue.t*1000:0,p:S.players.map(packPlayer),o:batch};
  while(batch.length<8&&batch.length<objs.length){const row=packObj(objs[objectIndex]);batch.push(row);if(JSON.stringify(msg).length>1080){batch.pop();break;}objectIndex=(objectIndex+1)%Math.max(1,objs.length);}
  H.send(msg,{reliable:false});
 }
 function finish(won){if(finished||ended||!info?.isHost)return;finished=true;phase='finished';const S=R.S,live=info.players.filter(q=>!S.players.find(p=>p.id===q.id)?.gone).sort((a,b)=>S.players[b.id].score-S.players[a.id].score),standings=[];
  for(const q of live){const last=standings.at(-1);if(last&&S.players[last[0]].score===S.players[q.id].score)last.push(q.id);else standings.push([q.id]);}
  const scores=Object.fromEntries(live.map(q=>[q.id,S.players[q.id].score]));const stats=Object.fromEntries(live.map(q=>{const p=S.players[q.id];return [q.id,{'Clean actions':p.clean,'Best flow':p.bestFlow,'Stitches':p.stitches,'Slips':p.slips}];}));
  const awards=[];for(const [key,title] of [['textbook','Steadiest Hand'],['stitches','Needlework'],['suction','Hoover'],['burns','Firebrand']]){const p=live.map(q=>S.players[q.id]).sort((a,b)=>b[key]-a[key])[0];if(p)awards.push({id:p.id,title,detail:Math.round(p[key])+' '+key});}
  H.send({t:'over',s:{mode:S.mode,vitals:S.vitals,clock:S.clock,players:S.players.map(packPlayer),phase:S.phase}});H.finish({standings,scores,won:!!won,stats,awards});
 }
 async function connect(){
  info=await H.connect({mode:'shared-world',seats:[1,4],card:true});if(!info){R.inSession=false;game.go('title');return;}
  const seed=(H.rng('sim')()*4294967295)>>>0;R.S=G.Op.create(12,{seed,difficulty:'Intern',players:info.players.length});R.cursors=[];
  mine.id=info.me;if(!info.server)R.cursors=[mine];R.presentation=G.OpArt.create();
  H.on('card',c=>{card=c;});H.on('start',()=>phase='count');
  H.on('message',(d,from)=>{
   if(ended||!d||typeof d!=='object')return;
   if(info.isHost){const p=R.S.players.find(p=>p.id===from);if(!p||p.gone)return;
    if(d.t==='i'&&d.n>(lastInput[from]||0)){
     const previous=lastInput[from]||0;lastInput[from]=d.n;const samples=Array.isArray(d.q)?d.q.slice(-6).filter(q=>Array.isArray(q)&&q.length===5&&q[0]>previous):[];const queue=remote[from]?.queue||[];for(const q of samples)queue.push({n:q[0],x:Math.max(28,Math.min(398,+q[1]||213)),y:Math.max(42,Math.min(190,+q[2]||116)),trig:q[3]?1:0,tool:Math.max(0,Math.min(7,q[4]|0)),applied:false});remote[from]={x:Math.max(28,Math.min(398,+d.x||213)),y:Math.max(42,Math.min(190,+d.y||116)),tool:Math.max(0,Math.min(7,d.tool|0)),trig:d.trig?1:0,fine:!!d.fine,queue:queue.slice(-24)};
    }
    if(d.t==='p'){if(d.gift)G.Op.gift(R.S);}
   }else if(from===info.host){
    if(d.t==='s'&&d.n>heard){heard=d.n;const S=R.S;if(d.ph!==S.phase){G.Op.enterPhase(S,d.ph);S.ev=[];}Object.assign(S,{mode:d.m,clock:d.c/1000,vitals:d.v,gauge:d.g,worldTime:d.w,phaseTime:d.pt,slow:!!d.sl,doctor:d.doc,closeTime:d.ct||0});S.flags.retracted=!!d.rt;S.blue=d.b?{t:Math.max(0,(H.time()-d.bt)/1000),attempts:d.b[1],hits:d.b[2],lastCycle:d.b[3]}:null;
     for(const a of d.p||[]){const p=S.players.find(p=>p.id===a[0]);if(p)Object.assign(p,{x:a[1],y:a[2],tool:a[3],trig:a[4],score:a[5],flow:a[6],slips:a[7],stitches:a[8],burns:a[9],suction:a[10],gone:!!a[11],heat:a[12],charge:a[13]});}
     (d.o||[]).forEach(unpackObj);S.ev=[];
    }
    if(d.t==='e'){
     if(d.ph!==undefined&&d.ph!==R.S.phase){G.Op.enterPhase(R.S,d.ph);R.S.ev=[];}
     if(d.add)for(const o of d.add){const current=R.S.objects.find(q=>q.id===o.id);if(current)Object.assign(current,o);else R.S.objects.push(o);}
     eventQueue.push(...(d.ev||[]));
    }
    if(d.t==='over'){Object.assign(R.S,{mode:d.s.mode,vitals:d.s.vitals,clock:d.s.clock,phase:d.s.phase});finished=true;phase='finished';}
   }
  });
  H.on('leave',({id})=>{const p=R.S.players.find(p=>p.id===id);if(p)p.gone=true;delete remote[id];});
  H.on('time-up',()=>{if(info.isHost)finish(R.S.mode==='won');});
  H.on('end',()=>{ended=true;phase='over';G.Sound.stop();game.input.clear();});
  H.ready();
 }
 function update(dt){
  if(!info||ended)return;
  if(!info.server)game.focus(game.W/2,game.H/2,0);
  const I=game.input;
  if(phase==='wait'){
   if(I.pressed('confirm')||I.pressed('start'))H.answer('ready');if(I.pressed('more'))H.answer('more');const click=I.clicked();if(click)H.answer(click[1]>game.H-53?'more':'ready');return;
  }
  if(phase==='count'&&H.time()>=0){phase='play';if(typeof document!=='undefined')document.body.dataset.hubCard='false';G.Sound.music('op');}
  if(phase!=='play'||finished)return;
  if(!info.isHost&&R.S.mode==='blue'&&R.S.blue)R.S.blue.t+=dt;
  let local=null;if(!info.server){local=G.Cursor.update(mine,G.Cursor.read(I,game,mine),R.S,dt);if(local.gift&&!info.isHost)H.send({t:'p',gift:true},{to:info.host});}
  if(info.isHost){
   const inputs=R.S.players.map(p=>{
    if(!info.server&&p.id===info.me)return local;
    const report=remote[p.id];if(!report)return {x:p.x,y:p.y,tool:p.tool,trig:0};const queue=report.queue||[];if(queue[0]?.applied&&Math.hypot(queue[0].x-p.x,queue[0].y-p.y)<.8)queue.shift();const a=queue[0]||report;if(queue[0])queue[0].applied=true;const dx=a.x-p.x,dy=a.y-p.y,d=Math.hypot(dx,dy),speed=380,step=Math.min(1,speed*dt/(d||1));return {x:p.x+dx*step,y:p.y+dy*step,tool:a.tool,trig:a.trig,fine:report.fine};
   });
   G.Op.step(R.S,inputs,dt);eventQueue.push(...R.S.ev);G.OpArt.present(R.presentation,R.S,game,R.S.ev,dt);G.Sound.tick(R.S,dt);
   if(R.S.mode==='won'||R.S.mode==='lost')finish(R.S.mode==='won');
   snapAcc+=dt;if(snapAcc>=1/12){snapAcc=0;sendState();}
   eventAcc+=dt;if(eventAcc>=.25&&!ended){eventAcc=0;const fresh=R.S.objects.filter(o=>!known.has(o.id));fresh.forEach(o=>known.add(o.id));const ev=eventQueue.splice(0,50),change=lastPhase!==R.S.phase;if(change){lastPhase=R.S.phase;known=new Set(R.S.objects.map(o=>o.id));}if(ev.length||fresh.length||change)H.send({t:'e',ph:R.S.phase,add:change?R.S.objects:fresh,ev});}
  }else{
   inputAcc+=dt;if(inputAcc>=1/15){inputAcc=0;inputN++;recent.push([inputN,Math.round(local.x*10)/10,Math.round(local.y*10)/10,local.trig>.3?1:0,local.tool]);if(recent.length>6)recent.shift();H.send({t:'i',n:inputN,x:Math.round(local.x*10)/10,y:Math.round(local.y*10)/10,tool:local.tool,trig:local.trig>.3?1:0,fine:local.fine?1:0,q:recent},{to:info.host,reliable:false});}
   G.OpArt.present(R.presentation,R.S,game,eventQueue.splice(0),dt);G.Sound.tick(R.S,dt);
  }
 }
 function draw(r){if(info?.server)return;
  if(phase==='wait'||phase==='count'||!info){G.Stages.draw(r,'theatre',game.time);r.overlay(g=>{
   const {text,box}=G.OpArt,W=r.W,Hh=r.H,x=W/2-183,y=Hh/2-105;box(g,x,y,366,210,'#8bb9a4','#d3dfc6');
   text(g,'THEATRE THREE / GRAND ROUNDS',W/2,y+10,'#426c64',{align:'center'});text(g,G.GAME_TITLE,W/2,y+27,'#153b42',{align:'center',scale:2});
   text(g,'Save the patient together.',W/2,y+51,'#345954',{align:'center'});text(g,'Clean actions lead the standings.',W/2,y+64,'#345954',{align:'center'});
   (info?.players||[]).forEach((p,i)=>{const yy=y+84+i*17;text(g,(card?.ready?.includes(p.id)?'✓ ':'  ')+p.name.slice(0,22),W/2,yy,p.color,{align:'center'});});
   text(g,game.input.label('useTool')+' USE  '+game.input.label('gift')+' LONG BREATH',W/2,y+158,'#173e44',{align:'center'});
   text(g,game.input.label('confirm')+' READY',W/2,y+177,'#173e44',{align:'center',scale:2});text(g,game.input.label('more')+' MORE TIME',W/2,y+198,'#345954',{align:'center'});
   const remaining=phase==='count'?Math.max(0,Math.ceil(-H.time()/1000)):card?.left==null?null:Math.ceil(card.left/1000);if(remaining!==null)text(g,String(remaining),W-28,22,'#e9e6b7',{scale:3,align:'right'});
  });return;}
  if(R.S)G.OpArt.draw(r,R.S,R.presentation,game,R.cursors);
  if(phase==='finished'||phase==='over')r.overlay(g=>{G.OpArt.box(g,r.W/2-130,r.H/2-29,260,58);G.OpArt.text(g,ended?'ROUND COMPLETE':'WAITING FOR THE HUB',r.W/2,r.H/2-10,'#e5ecd0',{align:'center',scale:2});});
 }
 return {connect,scene:{pausable:true,camera:{zoom:false,wheel:false},enter(){if(typeof document!=='undefined')document.body.dataset.hubCard='true';},update,draw},probe:()=>({phase,over:finished,ended,host:info?.isHost,server:info?.server,heard,state:R.S}),finish,info:()=>info};
}
G.Hub={make};
})();
