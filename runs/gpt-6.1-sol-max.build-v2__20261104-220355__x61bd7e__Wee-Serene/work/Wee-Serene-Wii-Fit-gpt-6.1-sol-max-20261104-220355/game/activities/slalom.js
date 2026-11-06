(() => {
const G=window.G,E=G.E,{px,clamp}=E;
G.families.slalom={
 setup(ctx,c){c.data={x:0,z:0,gates:0,missed:0,penalty:0,next:0,tumble:0,finish:0};if(!ctx.m7){ctx.m7=new E.Mode7({floor:(x,y)=>{const n=((Math.floor(x/60)+Math.floor(y/60))%2)?[234,244,245]:[219,234,237];return n;},size:[2000,16000],outside:'#dfedf0',sky:['#90bfd5','#dcecf3'],far:1900,fog:ctx.tier===2?{color:'#c5d9e2',near:500,far:1800}:null});}},
 bot(ctx,c,dt,skill){const d=c.data,next=G.COURSES.gates[Math.min(17,d.next)],diff=next-d.x,quality=skill==='poor'?.55:skill==='average'?.85:1;c.intent.x=clamp(diff*.013*quality,-1,1);c.intent.y=skill==='poor'?0:skill==='average'?.25:.7;},
 update(ctx,c,dt){const d=c.data,v=c.intent;d.tumble=Math.max(0,d.tumble-dt);const speed=G.DEV.slalomSpeed*(v.y>0?1+v.y*.35:1+v.y*.4)*(d.tumble>0?.3:1);d.z+=speed*dt;d.x=clamp(d.x+v.x*G.DEV.slalomTurn*dt,-550,550);
 while(d.next<18&&d.z>340+d.next*G.COURSES.spacing){const target=G.COURSES.gates[d.next],width=ctx.tier===2?58:88;if(Math.abs(d.x-target)<width)d.gates++;else{d.missed++;d.penalty+=3;if(G.context===ctx)G.game.audio.sfx('creak');}d.next++;}
 if(Math.abs(d.x)>480&&d.tumble<=0){d.tumble=1.2;d.penalty+=1.2;d.x*=.88;}
 if(d.next>=18){d.finish=ctx.time;c.finished=true;}
 c.bal.x=v.x*.45;c.bal.y=v.y*.35;G.animateContestant(ctx,c,dt);
 ctx.m7.cam={x:d.x+1000,y:d.z-85,h:42,angle:Math.PI/2,pitch:13,fov:72};
 },
 result(ctx,c){const d=c.data,completion=d.gates/18,timeScore=clamp((G.COURSES.worst-(d.finish||ctx.time)-d.penalty)/(G.COURSES.worst-G.COURSES.par),0,1);return {pct:clamp(completion*(.7+.3*timeScore),0,1),detail:d.gates+'/18 gates · '+d.missed+' missed · +'+d.penalty.toFixed(0)+'s'};},
 fullDraw(r,ctx){const d=ctx.contestants[0].data,m=ctx.m7;for(let i=Math.max(0,d.next-1);i<18;i++){const y=340+i*G.COURSES.spacing,target=1000+G.COURSES.gates[i],w=ctx.tier===2?58:88;for(const s of [-1,1])m.add(target+s*w,y,0,(g,x,yy,k)=>{const h=32*k;px.line(g,x,yy,x,yy-h,'#4c8c9f',Math.max(1,k*2));px.poly(g,[[x,yy-h],[x+s*16*k,yy-h+4*k],[x,yy-h+11*k]],i%2?'#ed947d':'#62b9c2');});}
 for(let i=0;i<45;i++){const yy=i*300+130,xx=1000+(i%2?-560:560)+(i%3)*50;m.add(xx,yy,0,(g,x,y,k)=>{if(i%6===0){px.disc(g,x,y-8*k,8*k,'#ffffff');px.disc(g,x,y-20*k,5*k,'#ffffff');px.rect(g,x-6*k,y-27*k,12*k,3*k,'#7c9fae');}else{px.poly(g,[[x-15*k,y],[x,y-45*k],[x+15*k,y]],'#85afb1');px.poly(g,[[x-12*k,y-12*k],[x,y-45*k],[x+12*k,y-12*k]],'#eff8f7');}});}
 m.draw(r);r.overlay(g=>{const x=r.W/2,y=r.H-42;px.ell(g,x,y+2,24,5,'#adcbd4');px.line(g,x-12,y-2,x-20,y+8,'#d88872',3);px.line(g,x+12,y-2,x+20,y+8,'#d88872',3);});r.overlay(g=>ctx.contestants[0].rig.draw(g,r.W/2,r.H-43,r.view));r.overlay(g=>{G.round(g,13,r.H-53,91,29,'#ffffff');G.text(g,d.gates+' / 18 gates',20,r.H-46,{color:G.palette.cyan});G.text(g,'+'+d.penalty.toFixed(0)+' seconds',20,r.H-35,{color:G.palette.muted});});},
 draw(){},hud(){}
};
})();
