(() => {
const G=window.G,E=G.E,{px,clamp}=E;
G.families.candle={
 setup(ctx,c){if(ctx.duel&&!ctx.crowd)ctx.crowd=Array.from({length:4},(_,i)=>G.regularRig(i+1,1));c.data={flame:1,mean:0,relights:0,pushIndex:-1,thought:0,fx:0,fy:0,lastDistraction:-1,untouched:false};},
 bot(ctx,c,dt,skill){G.balanceBot(c,skill,dt);},
 update(ctx,c,dt){const b=c.bal,d=c.data,t=ctx.time,part=Math.floor(t/7);
  if(part!==d.pushIndex){d.pushIndex=part;d.thought=Math.floor(ctx.rng()*G.lines.thoughts.length);const a=ctx.rng()*6.28;d.fx=Math.cos(a)*(3+ctx.rng()*2);d.fy=Math.sin(a)*(3+ctx.rng()*2);}
  d.untouched=t>=20&&!c.intent.touched;if(ctx.duel){const beat=Math.floor(t/15);d.distraction=Math.min(5,beat);if(beat!==d.lastDistraction){d.lastDistraction=beat;if(G.context===ctx&&beat>=4){G.game.flash('#ffe4b9',.3,.12);G.babble('Tare','la');}}}
  const thought=t%7>2&&t%7<4.5;d.thinking=thought;b.step(dt,c.intent,{fx:thought?d.fx:0,fy:thought?d.fy:0,noFalls:ctx.cheat});
  const speed=Math.hypot(b.vx,b.vy);d.flame=clamp(d.flame+(speed>.55?-.4:b.inRing?.12:-.05)*dt,0,1);d.mean+=d.flame*dt;
  if(d.flame<=0){if(d.relights===0){d.relights++;d.flame=.85;b.x=b.y=b.vx=b.vy=0;}else{c.finished=true;d.flame=0;}}
  if(ctx.cheat)d.flame=Math.max(.55,d.flame);
  if(ctx.duel){if(ctx.crowd)ctx.crowd.forEach((rig,i)=>G.poseRig(rig,'idle',t,{dt,x:-70+i*25+Math.sin(t*.3)*15,y:-25,clip:'Walk_Loop'}));if(t>60&&G.context===ctx&&Math.floor(t*3)>Math.floor((t-dt)*3))G.babble('Tare','laloubou'[Math.floor(t*3)%8]);if(t>45&&t<60&&G.context===ctx&&Math.floor(t/3)>Math.floor((t-dt)/3)&&!G.game.settings.reduceMotion)G.game.particles.glints((Math.floor(t/3)%2?1:-1)*65,-20,65,12,'#f4d395');}
  if(ctx.duel)d.opponent=t<75?1:Math.max(0,1-(t-75)*.09*(d.flame>.5?1:0));
  G.animateContestant(ctx,c,dt);
 },
 result(ctx,c){const b=c.bal,d=c.data;return {pct:clamp(.6*b.steadiness+.4*d.mean/Math.max(.01,ctx.time)-.15*d.relights,0,1),detail:Math.round(d.flame*100)+'% flame · '+Math.round(b.steadiness*100)+'% steady'};},
 draw(r,ctx){if(ctx.duel&&ctx.time>30&&ctx.time<45)ctx.crowd?.forEach((rig,i)=>G.drawRig(r,rig,-70+i*25+Math.sin(ctx.time*.3)*15,-25));for(const c of ctx.contestants){G.candle(r,c.worldX+18,18,c.data.flame,ctx.time);}if(ctx.tier===2||ctx.duel){const t=ctx.time;r.queue(75,-8,0,g=>{const p=r.w(75,-8,0);if(ctx.duel&&t>15&&t<30||ctx.tier===2&&Math.floor(t/7)%2===0){px.rect(g,p[0]-7,p[1]-10,14,10,'#b2c6bf');px.poly(g,[[p[0]-6,p[1]-27],[p[0]+6,p[1]-27],[p[0]+4,p[1]-10],[p[0]-4,p[1]-10]],'#dff0e9');px.line(g,p[0]-2,p[1]-12,p[0]+3*Math.sin(t*40),p[1]-22,'#9db288',2);}else if(t>70||ctx.tier===2){px.ell(g,p[0],p[1]-6,8,5,'#f6faf4');px.line(g,p[0]+5,p[1]-6,p[0]+9,p[1]-17,'#f6faf4',3);px.disc(g,p[0]+10,p[1]-18,4,'#f6faf4');px.line(g,p[0]+13,p[1]-18,p[0]+18,p[1]-16,'#ddaa65',2);}});}
 if(ctx.duel)G.candle(r,64,18,ctx.contestants[0].data.opponent??1,ctx.time);},
 hud(r,ctx){const d=ctx.contestants[0].data;if(d.untouched&&ctx.time<25)r.overlay(g=>{G.round(g,12,94,r.W-24,32,'#ffffff');G.paragraph(g,G.lines.untouched,20,101,r.W-40,{color:G.palette.muted});});if(d.thinking)r.overlay(g=>{const s=ctx.duel?G.lines.duel[d.distraction||0]:ctx.tier===2&&d.pushIndex%2===0?G.lines.duel[d.pushIndex%6]:G.lines.thoughts[d.thought],w=Math.min(r.W-40,E.font.width(s)+18),x=(r.W-w)/2;G.round(g,x,61,w,20,'#ffffff');G.text(g,s,r.W/2,68,{align:'center',color:G.palette.muted});});}
};
G.candle=(r,x,y,flame,t)=>r.queue(x,y,0,g=>{const p=r.w(x,y,0),fx=p[0],fy=p[1];px.ell(g,fx,fy,7,2,'#9db0ae');px.rect(g,fx-3,fy-10,6,10,'#f0db9b');px.rect(g,fx-2,fy-10,2,9,'#fff0c1');px.line(g,fx,fy-11,fx,fy-13,'#776956');if(flame>0){const h=4+flame*8,w=2+Math.sin(t*9)*.4;px.ell(g,fx,fy-13-h*.4,w+1,h*.6,'#f2b667');px.ell(g,fx-.5,fy-13-h*.3,w*.6,h*.37,'#fff3be');G.game.lights.add(x,y,9,25,.3,{color:'#ffdc9a'});}});
})();
