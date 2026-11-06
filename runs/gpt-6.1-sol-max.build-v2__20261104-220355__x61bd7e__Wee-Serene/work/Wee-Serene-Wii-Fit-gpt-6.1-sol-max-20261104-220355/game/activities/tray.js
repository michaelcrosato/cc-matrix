(() => {
const G=window.G,E=G.E,{px,clamp}=E;
G.trayLayout=(ctx,c,index)=>{
 const d=c.data,rows=G.TRAYS[index],cell=12;d.tray=index;d.olives=[];d.glasses=[];d.bumpers=[];d.pending=[];d.lost=0;d.width=rows[0].length*cell;d.height=rows.length*cell;
 d.world=new E.Physics({gravity:[0,0],substeps:3,iterations:6,sleep:false,on:{enter(sensor,body){if(sensor.data?.kind==='glass'&&body.data?.kind==='olive'&&!body.off&&!sensor.off){body.off=true;sensor.off=true;d.collected++;d.pending.push(body);if(G.context===ctx)G.game.audio.sfx('plop');}}}});
 const W=d.width,H=d.height;if(index===1){d.world.chain([[6,H-6],[6,6],[W-6,6],[W-6,H-6]],{r:2,bounce:.25,friction:.2});d.world.segment([6,H-6],[72,H-6],{r:2});d.world.segment([96,H-6],[W-6,H-6],{r:2});}else d.world.chain([[6,6],[W-6,6],[W-6,H-6],[6,H-6],[6,6]],{r:2,bounce:.25,friction:.2});
 rows.forEach((row,y)=>[...row].forEach((ch,x)=>{const xx=x*cell+6,yy=y*cell+6;if(ch==='o')d.olives.push(d.world.circle(xx,yy,3,{bounce:.25,damping:G.DEV.friction,friction:.2,maxSpeed:120,bullet:true,data:{kind:'olive'}}));if(ch==='g')d.glasses.push(d.world.circle(xx,yy,7,{sensor:true,type:'static',data:{kind:'glass'}}));if(ch==='B'){const b=d.world.circle(xx,yy,7,{type:'static',bounce:.6});d.bumpers.push(b);}if(ch==='L')d.gecko=d.world.box(xx,yy,15,5,{type:'kinematic',bounce:.4,data:{kind:'gecko'}});}));
};
G.families.tray={
 setup(ctx,c){c.data={collected:0,total:15,tray:0};G.trayLayout(ctx,c,0);ctx.trayView=new E.View('tray','Tray',0,55,1,1);},
 bot(ctx,c,dt,skill){const d=c.data,o=d.olives.find(o=>!o.off),gl=d.glasses.filter(g=>!g.off);if(!o||!gl.length){c.intent.x=c.intent.y=0;return;}const target=gl.reduce((a,b)=>Math.hypot(b.x-o.x,b.y-o.y)<Math.hypot(a.x-o.x,a.y-o.y)?b:a,gl[0]);const q=skill==='poor'?.5:skill==='average'?.8:1;let tx=target.x,ty=target.y;
  const block=d.bumpers.find(b=>Math.hypot(b.x-o.x,b.y-o.y)<23&&Math.abs(b.x-o.x)<10&&b.y>o.y);if(block){tx=block.x+(o.x<d.width/2?-19:19);ty=block.y-4;}
  c.intent.x=clamp(((tx-o.x)*.035-o.vx*.065)*q,-.75,.75);c.intent.y=-clamp(((ty-o.y)*.035-o.vy*.065)*q,-.75,.75);
 },
 update(ctx,c,dt){const d=c.data,b=c.bal;b.step(dt,c.intent,{noFalls:true});d.world.gravity=[b.x*G.DEV.gravity,-b.y*G.DEV.gravity];for(const o of d.olives)o.damping=G.DEV.friction;d.world.wake();if(d.gecko){d.gecko.vx=Math.cos(ctx.time*.7)*9;d.gecko.x=d.width*.5+Math.sin(ctx.time*.7)*18;}
  d.world.step(dt);for(const o of d.olives)if(!o.off&&o.y>d.height+8){o.off=true;d.lost++;d.pending.push(o);}for(const o of d.pending)d.world.remove(o);d.pending=[];
  if(d.olives.every(o=>o.off)){if(d.tray<2){G.trayLayout(ctx,c,d.tray+1);b.x=b.y=b.vx=b.vy=0;}else c.finished=true;}
  G.animateContestant(ctx,c,dt);
 },
 result(ctx,c){const d=c.data;return {pct:d.collected/15*(.8+.2*Math.max(0,1-ctx.time/ctx.duration)),detail:d.collected+'/15 olives · tray '+(d.tray+1)+' of 3'};},
 fullDraw(r,ctx){const c=ctx.contestants[0],d=c.data,b=c.bal;G.studio(r,'bar');const W=Math.min(r.W-66,280),H=Math.min(126,r.H-90),cx=r.W/2,cy=r.H*.54;
  const to=(x,y,z=0)=>{const xx=(x/d.width-.5)*W,yy=(y/d.height-.5)*H;return [cx+xx,cy+yy+xx*b.x*.09+yy*b.y*.18-z];};
  r.overlay(g=>{const corners=[[0,0],[d.width,0],[d.width,d.height],[0,d.height]].map(p=>to(...p));px.poly(g,corners.map(p=>[p[0]+3,p[1]+5]),'#7ba1a5');px.poly(g,corners,'#cdb38a');const inner=[[4,4],[d.width-4,4],[d.width-4,d.height-4],[4,d.height-4]].map(p=>to(...p));px.poly(g,inner,'#f0dcc0');if(d.tray===1){const p=to(72,d.height),q=to(96,d.height);px.poly(g,[[p[0],p[1]-4],[q[0],q[1]-4],[q[0],q[1]+5],[p[0],p[1]+5]],'#718f89');}for(let i=0;i<4;i++){const a=corners[i],bb=corners[(i+1)%4];px.line(g,...a,...bb,'#b69668',3);}
   for(const o of d.bumpers){const p=to(o.x,o.y);px.ell(g,...p,8,6,'#b3a799');px.ell(g,p[0]-1,p[1]-2,6,4,'#e8e4d7');}
   for(const gl of d.glasses){const p=to(gl.x,gl.y);px.line(g,p[0],p[1],p[0],p[1]+8,'#9eaba3',1);px.ell(g,p[0],p[1]+8,6,2,'#b5b4a1');px.poly(g,[[p[0]-8,p[1]-6],[p[0]+8,p[1]-6],[p[0],p[1]+2]],gl.off?'#b2c79b':'#e8f3eb');px.line(g,p[0]-8,p[1]-6,p[0]+8,p[1]-6,'#7bb5b9');if(gl.off)px.disc(g,p[0],p[1]-4,3,'#8c9b50');}
   for(const o of d.olives){if(o.off)continue;const p=to(o.x,o.y,3);px.ell(g,p[0]+1,p[1]+4,4,2,'#c4b78e');px.disc(g,p[0],p[1],4,'#75854a');px.disc(g,p[0]-1,p[1]-1,2,'#a7b774');px.dot(g,p[0]+1,p[1]+1,'#c77d58');}
   if(d.gecko){const p=to(d.gecko.x,d.gecko.y,2);px.ell(g,p[0],p[1],9,3,'#87a38c');px.disc(g,p[0]+9,p[1]-1,3,'#aac19a');for(const s of [-1,1])for(const x of [-5,4])px.line(g,p[0]+x,p[1],p[0]+x+2,p[1]+s*6,'#748e7d');px.line(g,p[0]-8,p[1],p[0]-18,p[1]+3,'#87a38c',2);}
   G.round(g,14,r.H-40,99,22,'#ffffff');G.text(g,d.collected+' / 15 olives',21,r.H-33,{color:G.palette.cyan});G.text(g,'Tray '+(d.tray+1)+' / 3',r.W-18,54,{align:'right',color:G.palette.muted});G.drawPlate(g,r.W/2,r.H-24,b,17);
  });
 },draw(){},hud(){}
};
})();
