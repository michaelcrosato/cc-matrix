(() => {
const G=window.G,E=G.E,{px,clamp}=E;
G.families.hoop={
 setup(ctx,c){c.data={angle:0,lastAngle:null,speed:0,hoops:1,points:0,bad:0,caught:0,lastCatch:-1,toss:0,side:0};},
 bot(ctx,c,dt,skill){const dir=ctx.time<ctx.duration/2?1:-1,ang=ctx.time<ctx.duration/2?ctx.time*9:(ctx.duration-ctx.time)*9;const speed=skill==='poor'?.6:skill==='average'?.91:1;c.intent.x=Math.cos(ang*speed)*.8;c.intent.y=Math.sin(ang*speed)*.8;const hit=ctx.time%8<.05;c.intent.catchL=hit&&Math.floor(ctx.time/8)%2===1;c.intent.catchR=hit&&Math.floor(ctx.time/8)%2===0;c.intent.source='gamepad';},
 update(ctx,c,dt){const d=c.data,v=c.intent,angle=Math.atan2(v.y,v.x),diff=d.lastAngle===null?0:E.angDiff(d.lastAngle,angle);d.lastAngle=angle;d.angle+=diff;
 const raw=Math.abs(diff/dt);d.speed+=(raw-d.speed)*Math.min(1,dt*8);const keyboard=v.source==='keyboard',low=G.DEV.hoopLow*(keyboard?.6:1),high=(G.DEV.hoopHigh+(d.hoops-1)*.15)*(keyboard?.6:1),dir=ctx.time<ctx.duration/2?1:-1;
 const correct=diff*dir>=0&&Math.hypot(v.x,v.y)>.55&&d.speed>=low&&d.speed<=high;d.good=correct;
 if(correct){d.points+=(1+d.hoops*.2)*dt;d.bad=0;}else d.bad+=dt;
 if(d.bad>1.5&&d.hoops>1){d.hoops--;d.bad=0;}
 const toss=Math.round(ctx.time/8),window=Math.abs(ctx.time-toss*8);d.toss=window<1.3&&toss>0?1-window/1.3:0;d.side=toss%2?0:1;
 if(toss>0&&window<.25&&d.lastCatch!==toss&&((d.side===0&&v.catchL)||(d.side===1&&v.catchR))){d.hoops=Math.min(6,d.hoops+1);d.caught++;d.lastCatch=toss;if(G.context===ctx)G.game.audio.sfx('clink');}
 c.bal.step(dt,v,{noFalls:true});G.animateContestant(ctx,c,dt);
 },
 result(ctx,c){return {pct:clamp(c.data.points/(ctx.duration*1.65),0,1),detail:c.data.caught+' catches · '+c.data.hoops+' hoops at the finish'};},
 draw(r,ctx){for(const c of ctx.contestants){const p=r.w(c.worldX,c.worldY,22);for(let h=0;h<c.data.hoops;h++){const col=['#efb967','#e98b75','#8bc9b1','#8cbcd4','#ba9ecb','#d6c56d'][h];for(const front of [false,true])r.queue(c.worldX,c.worldY,22,g=>{const cy=p[1]+h*2-3;let prev=null;for(let i=0;i<=16;i++){const a=(front?0:Math.PI)+i/16*Math.PI,point=[p[0]+Math.cos(a)*19,p[1]+h*2+Math.sin(a)*5];if(prev)px.line(g,...prev,...point,col,2);prev=point;}},{bias:front?6:-6});}}},
 hud(r,ctx){const d=ctx.contestants[0].data;r.overlay(g=>{G.round(g,r.W/2-68,49,136,29,'#ffffff');G.text(g,ctx.time>ctx.duration/2?'Other way!':'Keep it circling',r.W/2,55,{align:'center',color:G.palette.cyan});G.text(g,d.good?'Just right':d.speed<6?'Too slow':'Too eager',r.W/2,67,{align:'center'});if(d.toss>.1)G.tag(g,(d.side===0?G.promptText('catchL','Catch left'):G.promptText('catchR','Catch right')),d.side===0?14:r.W-140,105);});}
};
})();
