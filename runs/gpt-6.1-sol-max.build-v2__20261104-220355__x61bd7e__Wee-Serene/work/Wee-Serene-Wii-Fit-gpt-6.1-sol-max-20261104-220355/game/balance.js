(() => {
const G=window.G,E=G.E,{clamp,approach}=E;
G.noise=(rng,f)=>{const p=[rng()*6.283,rng()*6.283,rng()*6.283];return t=>(Math.sin(t*f+p[0])+.6*Math.sin(t*f*1.73+p[1])+.35*Math.sin(t*f*2.61+p[2]))/1.3;};
G.Balance=class {
 constructor(params,rng=E.rng(1)){this.params={...params};this.x=0;this.y=0;this.vx=0;this.vy=0;this.t=0;this.falls=0;this.stumble=0;this.inside=0;this.total=0;this.streak=0;this.target=[0,0];this.trail=[];this.hist=[];this.nx=G.noise(rng,params.nf);this.ny=G.noise(rng,params.nf*1.13);}
 step(dt,intent,opts={}){
  this.t+=dt;let p=this.params;const gentle=G.game.settings.gentle;
  const k=p.k*(G.DEV.k/12),c=p.c*(G.DEV.c/5),s=(opts.s===undefined?p.s:opts.s)*G.DEV.s*(gentle?.7:1),A=p.A*G.DEV.A*(gentle?.7:1),r=p.R*G.DEV.ring*(gentle?1.25:1);
  if(this.stumble>0){this.stumble-=dt;this.x*=Math.exp(-dt*8);this.y*=Math.exp(-dt*8);this.vx=this.vy=0;}
  else {
   const fx=(opts.fx||0)*G.DEV.push,fy=(opts.fy||0)*G.DEV.push;
   this.vx+=(k*(intent.x-this.x)-c*this.vx+(opts.mainX?0:s)*this.x+A*this.nx(this.t*G.DEV.nf)+fx)*dt;
   this.vy+=(k*(intent.y-this.y)-c*this.vy+(opts.mainY?0:s)*this.y+A*this.ny(this.t*G.DEV.nf)+fy)*dt;
   this.x+=this.vx*dt;this.y+=this.vy*dt;
   if(!opts.noFalls&&!G.dev.noFalls&&Math.hypot(this.x,this.y)>=G.DEV.threshold){this.falls++;this.stumble=1;this.streak=0;opts.fall?.();}
   if(opts.noFalls){this.x=clamp(this.x,-1,1);this.y=clamp(this.y,-1,1);}
  }
  const inside=Math.hypot(this.x-this.target[0],this.y-this.target[1])<=r&&this.stumble<=0;
  if(inside){this.inside+=dt;this.streak+=dt;}else this.streak=0;
  this.total+=dt;this.inRing=inside;this.radius=r;
  if(!this.trail.length||this.t-this.trail[this.trail.length-1].t>.04)this.trail.push({x:this.x,y:this.y,t:this.t});while(this.trail[0]&&this.t-this.trail[0].t>1)this.trail.shift();
  this.hist.push({x:this.x,y:this.y,vx:this.vx,vy:this.vy,t:this.t});while(this.hist[0]&&this.t-this.hist[0].t>.6)this.hist.shift();
 }
 get steadiness(){return this.total?this.inside/this.total:0;}
};
G.DEV.k=12;G.DEFS.find(d=>d[0]==='k')[5]=12;G.DEV.c=5;G.DEFS.find(d=>d[0]==='c')[5]=5;
G.BOTS={poor:{tau:.34,gain:1.1,damp:.22,noise:.16},average:{tau:.25,gain:1.4,damp:.30,noise:.08},good:{tau:.18,gain:1.8,damp:.36,noise:.04},expert:{tau:.14,gain:2.2,damp:.42,noise:.02}};
G.balanceBot=(c,skill,dt)=>{
 const b=c.bal,q=G.BOTS[skill]||G.BOTS.expert;let seen=b.hist.find(h=>h.t>=b.t-q.tau)||b;
 if(!c.botNX){const nr=E.rng(c.seed);c.botNX=G.noise(nr,1.4);c.botNY=G.noise(nr,1.4);}
 const tx=-q.gain*(seen.x-b.target[0])-q.damp*seen.vx+b.target[0]*(1-b.params.s/b.params.k)+q.noise*c.botNX(b.t),ty=-q.gain*(seen.y-b.target[1])-q.damp*seen.vy+b.target[1]*(1-b.params.s/b.params.k)+q.noise*c.botNY(b.t);
 c.intent.x+=(tx-c.intent.x)*Math.min(1,dt*16);c.intent.y+=(ty-c.intent.y)*Math.min(1,dt*16);const n=Math.hypot(c.intent.x,c.intent.y);if(n>1){c.intent.x/=n;c.intent.y/=n;}return c.intent;
};
G.emptyIntent=()=>({x:0,y:0,effort:0,breath:0,catchL:false,catchR:false,jump:false,paceL:false,paceR:false,steps:[false,false,false,false],source:'keyboard',touched:false});
G.readIntent=(c,dt,ctx)=>{
 const I=c.input||G.game.input,v=c.intent,m=I.move();
 const recentMouse=I.mouse?.active&&I.mouse.t>G.lastKey;
 let source=I.lastDevice==='gamepad'?'gamepad':recentMouse?'mouse':'keyboard';
 if(source==='gamepad'){v.x=I.padMove[0];v.y=-I.padMove[1];}
 else if(source==='mouse'){
  const p=I.pointer();if(p && !(G.dev.open&&p[0]<G.game.W*.39)){v.x=clamp((p[0]-G.game.W/2)/(G.game.H*G.DEV.reach),-1,1);v.y=clamp((G.game.H/2-p[1])/(G.game.H*G.DEV.reach),-1,1);}
 }else{
  const devArrow=G.dev.open;
  const dx=devArrow?((I.held.has('KeyD')?1:0)-(I.held.has('KeyA')?1:0)):m[0];
  const dy=devArrow?((I.held.has('KeyS')?1:0)-(I.held.has('KeyW')?1:0)):m[1];
  v.x=dx?clamp(v.x+dx*G.DEV.nudge*dt,-1,1):approach(v.x,0,.5*dt);v.y=dy?clamp(v.y-dy*G.DEV.nudge*dt,-1,1):approach(v.y,0,.5*dt);
 }
 const n=Math.hypot(v.x,v.y);if(n>1){v.x/=n;v.y/=n;}
 const held=I.down('breath');if(G.game.settings.breathToggle&&I.pressed('breath'))c.breathHeld=!c.breathHeld;
 const bh=G.game.settings.breathToggle?c.breathHeld:held;
 v.breath=source==='gamepad'?I.value('breath'):approach(v.breath,bh?1:0,dt/4);
 v.effort=source==='gamepad'?I.value('breath'):(held?.6:0);
 v.catchL=I.pressed('catchL');v.catchR=I.pressed('catchR');v.jump=I.pressed('jump')||I.pressed('confirm');v.paceL=I.pressed('paceL');v.paceR=I.pressed('paceR');
 const lanes=G.mode==='class'?['left','down','up','right']:['stepL','stepD','stepU','stepR'];v.steps=lanes.map(a=>I.pressed(a));
 if(I.anyPressed()||Math.hypot(m[0],m[1])>.05||recentMouse)v.touched=true;
 v.source=source;if(c===ctx?.contestants[0])G.source=source;return v;
};
G.drawPlate=(g,x,y,b,radius=26,hidden=false)=>{
 const {px}=E,P=G.palette;px.ell(g,x+1,y+3,radius+2,radius+1,'#bed6d6');px.disc(g,x,y,radius+1,'#e2eff0');px.disc(g,x,y,radius,'#ffffff');
 if(hidden){E.font.text(g,'?',x,y-3,P.muted,{align:'center',outline:false});return;}
 const scale=radius*.80,tx=b.target[0]*scale,ty=-b.target[1]*scale,rr=(b.radius||b.params.R)*scale;
 px.line(g,x-scale,y,x+scale,y,'#edf3f4');px.line(g,x,y-scale,x,y+scale,'#edf3f4');
 px.disc(g,x+tx,y+ty,rr+2,b.inRing?'#a3ddcd':'#cadde2');px.disc(g,x+tx,y+ty,Math.max(1,rr),b.inRing?'#d9f5ea':'#f1f8f8');
 for(const t of b.trail){const age=(b.t-t.t);px.disc(g,x+t.x*scale,y-t.y*scale,age<.3?1.5:1,age<.4?'#9fd7d8':'#dbe8e8');}
 px.disc(g,x+b.x*scale,y-b.y*scale,3,b.stumble>0?P.coral:P.ink);px.dot(g,x+b.x*scale-1,y-b.y*scale-1,'#ffffff');
 if(b.streak>2){for(let i=0;i<4;i++){const a=i*Math.PI/2+b.t*.5;px.dot(g,x+Math.cos(a)*(radius-3),y+Math.sin(a)*(radius-3),P.cyan);}}
};
})();
