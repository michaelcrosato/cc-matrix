(() => {
const G=window.G,E=G.E,{px,clamp}=E;
G.families.hold={
 setup(ctx,c){c.data.breathTime=0;c.data.pushSign=ctx.rng()<.5?-1:1;c.data.lastPush=0;c.data.lastGull=-1;},
 bot(ctx,c,dt,skill){G.balanceBot(c,skill,dt);if(ctx.a.id==='flow'){const guide=.5-.5*Math.cos(ctx.time*Math.PI/4);c.intent.breath=clamp(guide+(skill==='poor'?.27:skill==='average'?.15:.02)*Math.sin(ctx.time*1.2),0,1);}},
 update(ctx,c,dt){const b=c.bal,d=c.data,t=ctx.time,flow=ctx.a.id==='flow';
  const phase=Math.floor(t/12);b.target=flow?[0,0]:[[0,0],[.07,.03],[-.06,.05],[.04,-.04]][phase%4];
  const every=ctx.tier===2?6:7,push=Math.floor(t/every);if(push>d.lastPush){d.lastPush=push;const angle=ctx.rng()*6.28;b.vx+=Math.cos(angle)*.6*G.DEV.push;b.vy+=Math.sin(angle)*.6*G.DEV.push;}
  const gull=!flow&&t%18>8&&t%18<12;d.gull=gull;if(gull&&d.lastGull!==Math.floor(t/18)){d.lastGull=Math.floor(t/18);if(G.context===ctx)G.game.audio.sfx('gull');}
  b.step(dt,c.intent,{fx:gull?d.pushSign*2.5:0,noFalls:ctx.cheat,fall:()=>{if(G.context===ctx){G.game.audio.sfx('stumble');c.input?.rumble(.35,.18);}}});
  if(flow){d.guide=.5-.5*Math.cos(t*Math.PI/4);if(Math.abs(c.intent.breath-d.guide)<.25)d.breathTime+=dt;}
  G.animateContestant(ctx,c,dt);
 },
 result(ctx,c){const b=c.bal,d=c.data;const pct=ctx.a.id==='flow'?.6*b.steadiness+.4*d.breathTime/Math.max(.01,ctx.time):b.steadiness-.05*b.falls;return {pct:clamp(pct,0,1),detail:Math.round(b.steadiness*100)+'% steady · '+b.falls+' stumbles'};},
 draw(r,ctx){for(const c of ctx.contestants){if(c.data.gull){const p=r.w(c.worldX+20*c.data.pushSign,4,44);r.queue(c.worldX,4,44,g=>{px.ell(g,p[0],p[1],4,3,'#f9fcfc');px.line(g,p[0]-7,p[1]-1,p[0]+6,p[1]+2,'#9caebb',2);px.poly(g,[[p[0]+3,p[1]],[p[0]+7,p[1]+1],[p[0]+3,p[1]+2]],'#e7b25d');});}}},
 hud(r,ctx){if(ctx.a.id==='flow'){const d=ctx.contestants[0].data; r.overlay(g=>{const x=r.W-59,y=104;px.disc(g,x,y,12+d.guide*12,'#dfefeb');px.disc(g,x,y,9+d.guide*11,'#bfe6d7');px.disc(g,x,y,5+ctx.contestants[0].intent.breath*15,'#74bfb5');G.text(g,Math.sin(ctx.time*Math.PI/4)>0?'Breathe in':'Breathe out',x,136,{align:'center'});});}}
};
})();
