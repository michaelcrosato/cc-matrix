(() => {
const G=window.G,E=G.E,{px,clamp}=E;
G.repBead=(ctx,t)=>{if(ctx.a.id==='lunge')return Math.sin(t*Math.PI/2)*.76;const period=ctx.tier===2?5:4,u=(t%period)/period;return ctx.tier===2?(u<.6?u/.6*.88:u<.8?.88:(1-u)/.2*.88):(.5-.5*Math.cos(t*Math.PI/2))*.88;};
G.families.rep={
 setup(ctx,c){c.data={depth:0,bead:0,error:0,repError:0,repTime:0,form:0,reps:0,repScore:0,bonus:false,judgment:'Follow the bead',fatigue:0};},
 bot(ctx,c,dt,skill){const target=G.repBead(ctx,ctx.time+(skill==='expert'?.22:skill==='good'?.15:skill==='average'?-.01:-.18)),prev=G.repBead(ctx,ctx.time-dt),vel=(G.repBead(ctx,ctx.time+dt)-prev)/(2*dt),b=c.bal,side=ctx.a.id==='lunge';let u=target+.38*vel;const noise=skill==='poor'?.19:skill==='average'?.10:skill==='good'?.035:.01;u+=noise*Math.sin(ctx.time*2.7+c.seed);if(side){c.intent.x=clamp(u,-1,1);c.intent.y=0;}else{c.intent.y=-clamp(u,0,.99);c.intent.x=noise*.3*Math.sin(ctx.time);}},
 update(ctx,c,dt){const d=c.data,b=c.bal,side=ctx.a.id==='lunge';d.bead=G.repBead(ctx,ctx.time);d.fatigue=clamp((ctx.time/ctx.duration-.6)/.4,0,1)*G.DEV.fatigue;
  const oldA=b.params.A,oldK=b.params.k;b.params.A*=1+d.fatigue;b.params.k*=1-.13*d.fatigue;
  b.step(dt,c.intent,{mainY:!side,mainX:side,s:8,noFalls:true});b.params.A=oldA;b.params.k=oldK;
  d.depth=side?b.x:clamp(-b.y,0,1);const err=Math.abs(d.depth-d.bead);d.error+=err*dt;d.repError+=err*dt;d.repTime+=dt;d.form+=Math.abs(side?b.y:b.x)*dt;
  const n=Math.floor(ctx.time/(ctx.tier===2?5:4));if(n>d.reps){const mean=d.repError/Math.max(.01,d.repTime),v=clamp(1-(mean-G.DEV.repTolerance)/.27,0,1);d.repScore+=v;d.reps=n;d.judgment=v>.9?'Perfect':v>.5?'Good':'Late';d.repError=d.repTime=0;if(G.context===ctx)G.babble(G.member.instructor,'ho');}
  if(!d.bonus&&ctx.time>=ctx.duration-.1&&d.repScore/Math.max(1,d.reps)>.8&&!ctx.fixedDuration){d.bonus=true;ctx.duration+=(ctx.tier===2?5:4)*2;d.judgment='Two more. Very good.';}
  G.animateContestant(ctx,c,dt);
 },
 result(ctx,c){const d=c.data,mean=d.error/Math.max(.01,ctx.time),quality=clamp(1-(mean-G.DEV.repTolerance)/.27,0,1);return {pct:quality*(1-Math.min(.3,d.form/Math.max(.01,ctx.time)*.5)),detail:d.reps+' reps · '+Math.round(quality*100)+'% on the rail'};},
 draw(){},
 hud(r,ctx){const c=ctx.contestants[0],d=c.data;r.overlay(g=>{const x=r.W-66,y=72,h=83,side=ctx.a.id==='lunge';G.round(g,x-21,y-8,44,h+37,'#f7fbfa');
  if(side){const xx=x-24,yy=y+40;px.line(g,xx,yy,xx+48,yy,'#c2d4d7',3);px.disc(g,xx+24+d.bead*24,yy,5,'#d3ad54');px.disc(g,xx+24+d.depth*24,yy,3,'#227d8d');}
  else {px.line(g,x,y,x,y+h,'#c2d4d7',3);px.disc(g,x,y+d.bead*h,5,'#e4bc65');px.disc(g,x,y+d.depth*h,3,'#227d8d');}
  G.text(g,String(d.reps),x,y+h+6,{scale:2,align:'center'});G.text(g,'reps',x,y+h+23,{align:'center',color:G.palette.muted});G.text(g,d.judgment,r.W/2,55,{align:'center',color:G.palette.cyan});if(d.fatigue>.15)G.text(g,'Working muscles',18,r.H-54,{color:G.palette.muted});});}
};
})();
