(() => {
const G=window.G,E=G.E,{clamp}=E;
G.makeContext=(id,tier=1,opts={})=>{
 const a=G.activities[id];if(!a)throw new Error('Unknown activity '+id);
 const safe=Object.fromEntries(Object.entries(opts).filter(([k,v])=>v!==undefined&&k!=='contestants'));
 const ctx={a,tier,time:0,duration:opts.duration||a.tiers[tier-1].duration||a.duration,rng:opts.rng||E.rng(opts.seed||18371),seed:opts.seed||18371,done:false,cheat:opts.cheat||false,contestants:[],duel:opts.duel||false,tierData:{...a.tiers[tier-1]},...safe};
 const people=opts.contestants||[{name:G.member.name,color:G.palette.coral,input:G.game.input,local:true}];
 people.forEach((p,i)=>{const seed=Math.floor(ctx.rng()*1e8),c={...p,seed,intent:G.emptyIntent(),bal:new G.Balance(ctx.tierData,E.rng(seed)),rig:p.rig||G.playerRig(people.length>1?1.45:1.9),score:0,data:{},phase:0};ctx.contestants.push(c);G.families[a.family].setup?.(ctx,c);});return ctx;
};
G.stepContext=(ctx,dt,skill)=>{
 if(ctx.done)return;ctx.time+=dt;
 for(const c of ctx.contestants){const bot=c.bot||skill; if(bot==='passive')c.intent=G.emptyIntent();else if(bot)G.families[ctx.a.family].bot(ctx,c,dt,bot);else G.readIntent(c,dt,ctx);
  if(bot&&bot!=='passive')c.intent.touched=true;G.families[ctx.a.family].update(ctx,c,dt);const r=ctx.a.result(ctx,c);c.score=clamp(Math.round(r.pct*1000),0,1000);
 }
 ctx.done=ctx.time>=ctx.duration||ctx.contestants.every(c=>c.finished);
};
G.animateContestant=(ctx,c,dt)=>{
 const a=ctx.a,d=c.data,b=c.bal;let pose=a.pose,body=null,scrub,clip;
 if(a.id==='flow'){const names=['lunge','dog','triangle','warrior','stork'];pose=names[Math.min(4,Math.floor(ctx.time/16))];}
 if(a.family==='rep'){scrub=d.depth;if(a.id==='lunge')body=G.sideLunge(b.x);}
 if(a.family==='hoop')body=G.hula(d.angle||0);
 if(a.family==='slalom')body=G.skiBody(c.intent.y);if(a.family==='laundry')body=G.ropeBody(ctx.time,c.intent.effort);
 if(a.family==='step')body=G.stepUp(d.stepAnim>0?Math.sin(Math.min(1,d.stepAnim/.4)*Math.PI):0);
 if(b.stumble>0)clip='Hop_One_Foot_Loop';
 const multi=ctx.contestants.length>1,x=multi?(ctx.contestants.indexOf(c)-(ctx.contestants.length-1)/2)*55:ctx.duel?-42:-12,y=4;
 c.worldX=x;c.worldY=y;c.phase=a.family==='hoop'?(d.angle||0):a.family==='rep'?(d.depth||0):a.family==='step'?(d.stepAnim||0):ctx.time;
 G.poseRig(c.rig,pose,ctx.time,{dt,x,y,wob:a.family==='rep'?[b.x*.3,0]:[b.x,b.y],body,scrub,clip,fall:b.stumble>0,facing:a.family==='jog'||a.family==='slalom'?-1.57:undefined});
};
G.finishRegistry=()=>{for(const a of Object.values(G.activities)){const f=G.families[a.family];for(const k of ['setup','update','draw','hud','bot','result'])a[k]=f[k]||(()=>{});a.ghost=(ctx,c=ctx.contestants[0])=>({l:[c.bal.x,c.bal.y],p:c.phase,w:[c.worldX||0,c.worldY||0],s:c.score});}};
})();
