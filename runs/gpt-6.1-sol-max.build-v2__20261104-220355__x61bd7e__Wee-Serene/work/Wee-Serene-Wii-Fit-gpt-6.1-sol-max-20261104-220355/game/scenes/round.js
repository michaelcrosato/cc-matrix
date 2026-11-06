(() => {
const G=window.G,E=G.E,game=G.game,P=G.palette,{px}=E;
G.hub={info:null,card:{left:null,ready:[],asked:false,paused:false},event:-1,over:false,reported:false,total:0,scored:[],ghosts:{},sent:-1,progress:-1,deal:[],rigs:{},phase:'card',duration:150};
G.hubReport=()=>{const h=G.hub;if(h.reported||h.over)return;h.reported=true;const score=h.total+(G.context?.contestants[0]?.score||0);AIHub.result({score,stats:{Steadiness:Math.round((G.context?.contestants[0]?.bal.steadiness||0)*100)+'%'},awards:[{title:'Present and accounted for',detail:'A morning class on Lumbar Island.'}]});};
G.connectHub=async()=>{
 const h=G.hub;const info=await AIHub.connect({mode:'ghost',seats:[1,4],card:true});if(!info){G.inSession=false;G.go('title');return;}h.info=info;
 const deal=AIHub.rng('deal'),pick=a=>a[Math.floor(deal()*a.length)];h.deal=[pick(['stork','candle','squat','pushup']),pick(['step','hoop']),pick(['slalom','jog'])];h.duration=Math.min(150,(info.limitMs||150000)/1000);
 for(const p of info.players)h.rigs[p.id]=G.regularRig(p.id+2,1.5);
 AIHub.on('card',c=>{h.card=c;});AIHub.on('start',()=>{h.phase='countdown';});
 AIHub.on('message',(d,from)=>{if(!h.over&&d?.t==='g'&&Number.isFinite(d.a)&&Array.isArray(d.l)&&d.l.every(Number.isFinite)&&Array.isArray(d.w)){h.ghosts[from]=d;}});
 AIHub.on('leave',({id})=>{delete h.ghosts[id];h.info.players=h.info.players.filter(p=>p.id!==id);});
 AIHub.on('time-up',()=>G.hubReport());
 AIHub.on('end',()=>{h.over=true;h.phase='ended';game.audio.stopMusic();game.audio.mute(true);game.input.clear();});
 await game.booted;AIHub.ready();
};
let menu;
G.scenes.round={view:'brawler',camera:{zoom:false},input:G.INPUT,pausable:true,
 enter(){G.light();G.music('studio');G.context=null;menu=new G.Pills([['Ready',()=>{if(G.hub.info)AIHub.answer('ready');}],['More time · Tab / △',()=>{if(G.hub.info)AIHub.answer('more');}]],{x:14,y:()=>game.H-68,w:215,h:23,gap:8});},
 update(dt){const h=G.hub;if(h.over)return;const info=h.info;if(!info)return;const now=AIHub.time()/1000;
  if(now===-Infinity){h.phase='card';if(game.input.pressed('more')){AIHub.answer('more');game.input.consumeAll();}menu.update(dt);return;}
  if(now<0){h.phase='countdown';return;}if(h.reported)return;
  const segment=h.duration/3,index=Math.min(2,Math.floor(now/segment)),local=now-index*segment,intro=Math.min(5,segment*.1),play=segment-intro*2;
  if(index!==h.event){if(G.context&&!h.scored[h.event]){h.total+=G.context.contestants[0].score;h.scored[h.event]=true;}h.event=index;const id=h.deal[index];G.context=G.makeContext(id,1,{rng:AIHub.rng('e'+index),duration:play,fixedDuration:true,contestants:[{local:true,name:info.players.find(p=>p.id===info.me)?.name||'Member',color:info.players.find(p=>p.id===info.me)?.color||P.coral,input:game.input,rig:G.playerRig(1.8)}]});G.music(({step:'step',hoop:'step',slalom:'ski',jog:'jog',candle:'raft'})[id]||'studio');}
  const ctx=G.context;h.phase=local<intro?'intro':local<intro+play?'play':'scores';G.sessionPhase=h.phase==='play'?'play':'countdown';
  const target=Math.min(play,Math.max(0,local-intro));let steps=0;while(ctx.time+1/120<=target&&!ctx.done&&steps++<2400)G.stepContext(ctx,1/120);
  if(h.phase==='intro')G.animateContestant(ctx,ctx.contestants[0],dt);
  if(now-h.sent>=.1){h.sent=now;const c=ctx.contestants[0];AIHub.send({t:'g',a:index,l:[c.bal.x,c.bal.y],p:c.phase,w:[c.worldX||0,c.worldY||0],s:c.score},{reliable:false});}
  if(now-h.progress>=1){h.progress=now;const score=h.total+ctx.contestants[0].score;AIHub.progress({score,label:score+' pts'});}
  if(now>=h.duration-.03)G.hubReport();
  const currentPlayers=info.players.filter(p=>p.id!==info.me);currentPlayers.forEach((p,i)=>{const d=h.ghosts[p.id];if(d?.a===index)G.poseRig(h.rigs[p.id],ctx.a.pose,ctx.time,{dt,x:52+i*35,y:-3,wob:d.l,scrub:ctx.a.family==='rep'?d.p:undefined,body:ctx.a.family==='hoop'?G.hula(d.p||0):ctx.a.family==='step'?G.stepUp(d.p||0):ctx.a.family==='slalom'?G.skiBody(d.l[1]):null,facing:ctx.a.family==='jog'||ctx.a.family==='slalom'?-1.57:undefined});});game.focus(0,0,20);
 },
 draw(r){const h=G.hub,ctx=G.context,info=h.info;if(!ctx){G.studio(r,'deck');if(info)info.players.forEach((p,i)=>{const x=22+i*33;G.mat(r,x,8,p.color);G.poseRig(h.rigs[p.id],'idle',G.time,{x,y:8});G.drawRig(r,h.rigs[p.id],x,8);});G.header(r,'Morning Class','Wee Serene');r.overlay(g=>{G.paragraph(g,'Three gentle exercises. Stay steadiest. Most points wins.',14,61,225);G.paragraph(g,G.promptText('lean','Lean')+'\n'+G.promptText('breath','Breathe / effort'),14,94,225,{color:P.muted});G.text(g,h.card.paused?'More time. Breathe.':h.card.starting?'Getting ready.':h.card.left===null?'Waiting for the class':Math.ceil(h.card.left/1000)+' seconds to settle',14,126,{color:P.cyan});if(info)info.players.forEach((p,i)=>G.text(g,p.name+(h.card.ready.includes(p.id)?' ✓':''),r.W-20,57+i*13,{align:'right',color:p.color}));});if(h.phase==='card')menu.draw(r);}
 else{const a=ctx.a,f=G.families[a.family];if(f.fullDraw)f.fullDraw(r,ctx);else{G.studio(r,a.room);const c=ctx.contestants[0];G.mat(r,-12,4,c.color);G.drawRig(r,c.rig,c.worldX||-12,c.worldY||4);a.draw(r,ctx);r.overlay(g=>G.drawPlate(g,r.W/2,r.H-33,c.bal));}
  if(info)info.players.filter(p=>p.id!==info.me).forEach((p,i)=>{const d=h.ghosts[p.id];if(d?.a===h.event){const x=52+i*35;if(['jog','slalom'].includes(ctx.a.family))r.overlay(g=>px.blend(g,.45,'normal',()=>h.rigs[p.id].draw(g,r.W/2+(i+1)*35,r.H-50,r.view)));else G.drawRig(r,h.rigs[p.id],x,-3,0,{alpha:.45});const q=['jog','slalom'].includes(ctx.a.family)?[r.W/2+(i+1)*35,r.H-112]:r.w(x,-3,47);r.overlay(g=>G.text(g,p.name,q[0],q[1],{align:'center',color:p.color}));}});
  a.hud(r,ctx);G.header(r,'Morning class · '+(h.event+1)+' / 3',a.name);if(h.phase==='intro')G.ribbon(r,'Settle in',a.hint);if(h.phase==='scores')G.ribbon(r,ctx.contestants[0].score+' points','A little breath before the next one.');
 }
 if(h.phase==='countdown'&&!ctx)G.ribbon(r,'Breathe in',String(Math.ceil(-AIHub.time()/1000)));if(h.over)G.ribbon(r,'Class complete','Your place is with the hub.');
 }
};
})();
