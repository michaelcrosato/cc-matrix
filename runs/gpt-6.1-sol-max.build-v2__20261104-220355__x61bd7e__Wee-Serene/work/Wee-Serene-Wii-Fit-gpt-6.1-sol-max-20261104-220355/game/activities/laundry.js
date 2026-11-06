(() => {
const G=window.G,E=G.E,{px,clamp}=E;
G.families.laundry={
 setup(ctx,c){c.data={progress:0,post:0,air:0,peg:0,gustSign:ctx.rng()<.5?-1:1,gust:false,warning:false,penalty:0,fallTimer:0};c.bal.params.s=G.DEV.rope;},
 bot(ctx,c,dt,skill){G.balanceBot(c,skill,dt);c.intent.y=0;c.intent.effort=skill==='poor'?.35:skill==='average'?.5:.65;const next=G.COURSES.pegs[c.data.peg];c.intent.jump=next!==undefined&&c.data.progress>next-.018&&c.data.progress<next+.01;},
 update(ctx,c,dt){const d=c.data,b=c.bal,v=c.intent,t=ctx.time,period=t%7;d.warning=period>4.2&&period<5;d.gust=period>=5&&period<5.6;
 if(v.jump&&d.air<=0){d.air=.7;if(G.context===ctx)G.game.audio.sfx('boop');}d.air=Math.max(0,d.air-dt);
 if(d.fallTimer>0)d.fallTimer-=dt;else if(d.air<=0){b.y=b.vy=0;b.step(dt,{...v,y:0},{s:G.DEV.rope+(ctx.tier===2?2:0)+v.effort*4,fx:d.gust?d.gustSign*G.DEV.gust:0,noFalls:ctx.cheat,fall:()=>{d.fallTimer=1;d.progress=Math.floor(d.progress*3)/3;d.penalty+=3;}});}
 if(d.fallTimer<=0)d.progress+=v.effort*dt/(ctx.duration*.52);
 if(d.progress>=(d.peg<3?G.COURSES.pegs[d.peg]:2)){if(d.air<=0){d.progress=Math.max(0,d.progress-.025);d.penalty+=1;}d.peg++;}
 d.post=Math.floor(d.progress*3);if(d.progress>=1)c.finished=true;G.animateContestant(ctx,c,dt);c.rig.mocap=G.sample('Walk_Loop',t*(v.effort+.2));
 },
 result(ctx,c){return {pct:clamp(c.data.progress-.06*c.bal.falls-c.data.penalty*.005,0,1),detail:Math.min(3,c.data.post)+'/3 spans · '+c.bal.falls+' hamper visits'};},
 fullDraw(r,ctx){const c=ctx.contestants[0],d=c.data;G.studio(r,'laundry');const y=r.H*.59,x0=25,x1=r.W-25;r.overlay(g=>{px.rect(g,0,y+45,r.W,r.H-y-45,'#b9cfa7');for(let i=0;i<4;i++){const x=x0+(x1-x0)*i/3;px.rect(g,x-3,y-3,6,65,'#bea17d');px.rect(g,x-3,y-3,2,65,'#e5cba2');}
 for(let i=0;i<80;i++){const u=i/79,x=x0+(x1-x0)*u,yy=y+Math.abs(Math.sin(u*3*Math.PI))*4;px.dot(g,x,yy,'#728d8e');px.dot(g,x,yy+1,'#a9c0bb');}
 for(let i=0;i<7;i++){const x=x0+(i+.6)/7*(x1-x0),yy=y+10;if(i%2){px.poly(g,[[x-5,yy],[x+5,yy],[x+7,yy+18],[x-7,yy+18]],['#f3d8bd','#e6b9a9','#c5dfd9'][i%3]);}else{px.rect(g,x-5,yy,10,20,'#f8eee0');px.rect(g,x,yy+14,10,6,'#f8eee0');}}
 for(const p of G.COURSES.pegs){px.rect(g,x0+p*(x1-x0)-1,y-4,3,8,'#d3a765');}if(d.warning||d.gust){for(let i=0;i<6;i++)px.line(g,20+i*43,y-50+(i%3)*9,45+i*43,y-50+(i%3)*9,'#8ebdc5');G.text(g,d.warning?'A sock. A warning.':'Gust!',r.W/2,57,{align:'center',color:G.palette.cyan});}G.drawGerald(g,35,y+57,.8);});
 const xx=x0+clamp(d.progress,0,1)*(x1-x0),zz=d.air>0?Math.sin(d.air/.7*Math.PI)*28:0,wx=(xx-r.W/2)/r.ppu;r.overlay(g=>c.rig.draw(g,xx,y-zz+(d.fallTimer>0?Math.sin(d.fallTimer*Math.PI)*25:0),r.view));r.overlay(g=>{G.text(g,'Please do not walk on the laundry line.',14,r.H-49,{color:G.palette.muted});G.text(g,'Walking on the laundry line: 10:30 daily.',14,r.H-38,{color:G.palette.muted});G.drawPlate(g,r.W/2,r.H-22,c.bal,17);});
 },draw(){},hud(){}
};
})();
