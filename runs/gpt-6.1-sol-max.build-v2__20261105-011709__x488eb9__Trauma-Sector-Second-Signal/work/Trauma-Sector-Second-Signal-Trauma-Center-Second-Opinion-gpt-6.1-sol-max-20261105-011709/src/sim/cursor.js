(() => {
const G=window.GAME,{TUNING:T}=G,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function create(id=0){return {x:213,y:116,tool:0,vx:0,vy:0,wheelSector:-1,wheelTime:0,wheelShow:0,trigger:0,toggle:false,prevTrigger:false,fineTime:0,id};}
function update(p,d,S,dt){
 let aim=d.aim||[0,0],wheel=d.wheel||[0,0];if(d.swapSticks)[aim,wheel]=[wheel,aim];
 const len=Math.hypot(...aim),fine=!!d.fine,assist=clamp(T.assist+(G.DIFFICULTY[S.difficulty]?.assist||0)+(S.doctor==='sokolova'?.2:0),0,1);
 const obj=G.Op.target(S,{...p,tool:p.tool});let mag=1;
 if(obj&&G.dist(p,obj)<T.magnet&&p.tool!==7)mag=1-.55*assist;
 let vx=0,vy=0;
 if(len>.01){const speed=T.cursorSpeed*(S.doctor==='vale'?1.15:1)*Math.pow(Math.min(1,len),T.curve)*(fine?T.fine:1)*mag;vx=aim[0]/len*speed;vy=aim[1]/len*speed;}
 if(d.keys){vx+=d.keys[0]*200*(fine?T.fine:1);vy+=d.keys[1]*200*(fine?T.fine:1);}
 if(d.nudge){vx+=d.nudge[0]*40;vy+=d.nudge[1]*40;}
 const sp=S.players.find(q=>q.id===p.id)||S.players[0];
 if(sp?.stroke){const guide=S.objects.find(q=>q.id===sp.stroke.id);if(guide){const z=G.Op.pathInfo(guide.points,p.x,p.y),along=vx*z.tx+vy*z.ty;vx=along*z.tx+(vx-along*z.tx)*(1-.8*assist);vy=along*z.ty+(vy-along*z.ty)*(1-.8*assist);}}
 const k=1-Math.exp(-dt/.06);p.vx+=(vx-p.vx)*k;p.vy+=(vy-p.vy)*k;
 if(d.mouse){p.x=d.mouse[0];p.y=d.mouse[1];p.vx=p.vy=0;}else{
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(obj&&len<.08&&!d.keys?.some(v=>v)&&G.dist(p,obj)<T.magnet&&!sp?.grab&&!sp?.stroke&&!sp?.stitch){const dd=G.dist(p,obj),step=Math.min(dd,90*assist*dt);if(dd>.01){p.x+=(obj.x-p.x)/dd*step;p.y+=(obj.y-p.y)/dd*step;}}
 }
 p.x=clamp(p.x,28,398);p.y=clamp(p.y,42,190);
 if(d.pick!==undefined&&d.pick!==p.tool){p.tool=d.pick;p.wheelShow=.6;}
 if(d.cycle){p.tool=(p.tool+d.cycle+8)%8;p.wheelShow=.6;}
 if(Math.hypot(...wheel)>.6){const sector=(Math.round(Math.atan2(wheel[0],-wheel[1])/(Math.PI/4))+8)%8;if(sector!==p.wheelSector){p.wheelSector=sector;p.wheelTime=0;}else p.wheelTime+=dt;if(p.wheelTime>=.08)p.tool=sector;p.wheelShow=.4;}else{p.wheelSector=-1;p.wheelTime=0;p.wheelShow=Math.max(0,p.wheelShow-dt);}
 let trigger=d.trigger||0;if(d.sustainedToggle&&[3,5,6,7].includes(p.tool)){if(trigger>.3&&!p.prevTrigger)p.toggle=!p.toggle;p.prevTrigger=trigger>.3;trigger=p.toggle?1:0;}else{p.prevTrigger=trigger>.3;p.toggle=false;}
 p.fineTime=fine?p.fineTime+dt:0;p.trigger=trigger;
 const tremolo=S.objects.find(o=>o.type==='tremolo'&&!o.done&&Math.hypot(p.x-o.x,p.y-o.y)<70);const amp=tremolo&&!S.slow?(tremolo.amp||0)*5*(fine?.35:1):0;p.aimX=p.x+Math.sin(S.worldTime*53)*amp;p.aimY=p.y+Math.sin(S.worldTime*47+1)*amp;
 return {x:p.aimX,y:p.aimY,tool:p.tool,trig:trigger,fine,gift:!!d.gift,consult:!!d.consult,cancel:!!d.cancel};
}
function read(I,game,cursor){
 const bool=a=>I.down(a)?1:0;
 let pick;for(let n=1;n<=8;n++)if(I.pressed('tool'+n))pick=n-1;
 const ptr=I.pointer(),ox=(game.W-426)>>1,oy=(game.H-240)>>1;
 const d={aim:I.padAim||[0,0],wheel:I.padMove||[0,0],keys:[bool('curR')-bool('curL'),bool('curD')-bool('curU')],nudge:[bool('nudgeR')-bool('nudgeL'),bool('nudgeD')-bool('nudgeU')],pick,
  cycle:I.pressed('toolNext')?1:I.pressed('toolPrev')?-1:0,trigger:I.value('useTool'),fine:I.down('fine'),gift:I.pressed('gift'),consult:I.pressed('consult'),cancel:I.pressed('cancel'),swapSticks:game.settings.swapSticks,sustainedToggle:game.settings.sustained==='Toggle'};
 if(G.runtime?.S?.mode==='blue'&&I.lastDevice==='gamepad'&&!d.fine)d.trigger=0;
 if(I.lastDevice==='mouse'&&ptr)d.mouse=[ptr[0]-ox,ptr[1]-oy];
 if(I.down('wheelHold')&&ptr){if(!cursor.mouseWheel)cursor.mouseWheel=[ptr[0],ptr[1]];const dx=ptr[0]-cursor.mouseWheel[0],dy=ptr[1]-cursor.mouseWheel[1],r=Math.hypot(dx,dy);d.wheel=[dx/Math.max(1,r),dy/Math.max(1,r)];d.mouse=null;}
 if(!I.down('wheelHold'))cursor.mouseWheel=null;
 return d;
}
G.Cursor={create,update,read};
})();
