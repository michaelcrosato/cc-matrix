(() => {
const G=window.GAME,{Op}=G;
function create(id=0,options={}){return {id,target:null,stage:0,t:0,reaction:options.reaction||0,aimError:options.aimError||0,speed:options.speed||260,cursor:G.Cursor.create(id),options,release:0,heal:false};}
function move(B,S,goal,dt,speed=B.speed,extra={}){
 const p=B.cursor,engaged=S.players[B.id]?.grab||S.players[B.id]?.stroke,errX=B.aimError&&!engaged?Math.sin((B.target||0)*5.17+B.id)*B.aimError:0,errY=B.aimError&&!engaged?Math.cos((B.target||0)*3.31+B.id)*B.aimError:0,dx=goal[0]+errX-p.x,dy=goal[1]+errY-p.y,dd=Math.hypot(dx,dy),max=G.TUNING.cursorSpeed*(S.doctor==='vale'?1.15:1)*(extra.fine?G.TUNING.fine:1);
 const desired=Math.min(speed,dd/Math.max(dt*5,.035));let l=Math.pow(Math.min(1,desired/(max||1)),1/G.TUNING.curve);
 const device={aim:dd>.5?[dx/dd*l,dy/dd*l]:[0,0],...extra};
 return G.Cursor.update(p,device,S,dt);
}
function choose(S,B){
 const p=S.players[B.id];const objects=S.objects.filter(o=>!o.done&&!G.objects[o.type]?.decor&&!o.optional);
 let list=objects.filter(o=>!S.players.some(q=>q.id!==B.id&&!q.gone&&(q.grab?.id===o.id||q.stroke?.id===o.id||q.stitch?.id===o.id)));
 if(!list.length)list=objects;
 list=list.filter(o=>!(o.type==='tremolo'&&o.stage===0)&&!(o.type==='lobe'&&!Op.lobeOpen(S,o))&&!(o.type==='repeat'&&((S.phaseTime%20)<17||S.phaseTime<(o.lockUntil||0))));
 list.sort((a,b)=>{
 const priority=o=>o.type==='pool'?0:o.type==='bleeder'||o.type==='arteryTear'?1:o.type==='bypass'?2:o.type==='wire'?3+o.order:o.type==='reed'?2:5;
 return priority(a)-priority(b)||G.dist(B.cursor,a)-G.dist(B.cursor,b);
 });
 return list[0]||null;
}
function next(B,S,dt){
 B.t+=dt;const p=S.players.find(p=>p.id===B.id)||S.players[0];
 if(!p||p.gone)return {x:213,y:116,tool:0,trig:0};
 if(B.phase!==S.phase||B.caseId!==S.caseId){B.phase=S.phase;B.caseId=S.caseId;B.target=null;B.stage=0;B.release=.12;B.cursor.x=p.x;B.cursor.y=p.y;B.cursor.tool=p.tool;}
 if(S.mode==='blue'){const u=S.blue.t%.9;return move(B,S,[213,116],dt,200,{trigger:u>.42&&u<.48?1:0});}
 if(S.mode==='closing'){const t=S.closeTime%1.6;return move(B,S,[213,116],dt,200,{trigger:t>.78&&t<.84?1:0});}
 if(S.mode!=='operating')return move(B,S,[213,116],dt,200,{trigger:0});
 if(S.flags.silence>0)return move(B,S,[B.cursor.x,B.cursor.y],dt,0,{trigger:0});
 if(B.release>0){B.release-=dt;return move(B,S,[B.cursor.x,B.cursor.y],dt,0,{trigger:0});}
 if(S.vitals<(G.cases[S.caseId-1].device?48:42)&&!p.grab&&!p.stroke&&!p.stitch){
  B.heal=true;
 }
 if(B.heal){const settled=p.tool===4&&p.swap<=0;const trig=settled&&p.charge<.53?1:0;if(p.prev>.3&&!trig){B.heal=false;B.release=.4;}
  return move(B,S,[83,167],dt,230,{pick:4,trigger:trig});
 }
 const handle=S.objects.find(o=>o.type==='retractorHandle'&&!o.done),retractedGuide=S.objects.find(o=>o.retracted&&!o.done);if(handle&&retractedGuide&&S.players.filter(p=>!p.gone).length>1&&B.id===S.players.filter(p=>!p.gone).at(-1).id){return move(B,S,[handle.x,handle.y],dt,160,{pick:0,trigger:G.dist(B.cursor,handle)<3&&p.swap<=0?1:0});}
 let o=S.objects.find(o=>o.id===B.target&&!o.done);
 if(!o||Op.toolFor(S,o)!==B.tool||o.type==='lobe'&&!Op.lobeOpen(S,o)){
  const candidate=choose(S,B);if(candidate?.id!==B.target){B.target=candidate?.id;B.stage=0;B.screwAngle=0;B.think=B.reaction;}o=candidate;
 }
 if(B.think>0){B.think-=dt;return move(B,S,[B.cursor.x,B.cursor.y],dt,0,{trigger:0});}
 if(!o){
  const handle=S.objects.find(o=>o.type==='retractorHandle');
  if(handle&&S.players.length>1&&!S.flags.retracted)return move(B,S,[handle.x,handle.y],dt,160,{pick:0,trigger:G.dist(B.cursor,handle)<4?1:0});
  return move(B,S,[85+B.id*14,169],dt,150,{trigger:0,gift:false});
 }
 if(o.hidden&&o.marked<=S.worldTime&&!G.cheats.reveal){B.tool=7;return move(B,S,[o.x,o.y],dt,200,{pick:7,trigger:1});}
 if(!Op.visible(S,o)){
  const pool=S.objects.find(q=>q.type==='pool'&&!q.done);if(pool){B.target=pool.id;o=pool;B.stage=0;}else return move(B,S,[o.x,o.y],dt,180,{pick:7,trigger:1});
 }
 if(o.type==='repeat'&&((S.phaseTime%20)<17||S.phaseTime<(o.lockUntil||0)))return move(B,S,[o.x-22,o.y],dt,150,{pick:1,trigger:0});
 const tool=Op.toolFor(S,o);B.tool=tool;
 if(tool<0)return move(B,S,[213,116],dt,180,{trigger:0});
 const swap=tool!==p.tool||p.swap>0;const extra={pick:tool,trigger:0};
 let goal=[o.x,o.y],speed=B.speed;
 if(tool===0){
  if(o.type==='screw'){
   if(p.grab?.id===o.id){B.screwAngle=(B.screwAngle||0)+dt*5;goal=[o.x+8*Math.cos(B.screwAngle),o.y+8*Math.sin(B.screwAngle)];extra.trigger=1;speed=65;}
   else {goal=[o.x+8,o.y];if(!swap&&Math.hypot(B.cursor.x-goal[0],B.cursor.y-goal[1])<2+B.aimError*1.6)extra.trigger=1;}
  }else if(p.grab?.id===o.id){
   if(p.grab.free){if(G.dist(B.cursor,o)<26){extra.trigger=1;goal=[o.x+o.axis[0]*29,o.y+o.axis[1]*29];speed=70;}else{extra.trigger=0;goal=[B.cursor.x,B.cursor.y];B.release=.15;}}
   else {const remaining=Math.max(3,o.depth-p.grab.pull+3);goal=[B.cursor.x+o.axis[0]*remaining,B.cursor.y+o.axis[1]*remaining];extra.trigger=1;speed=Math.min(78,(o.maxSpeed||120)*.7);}
  }else {if(!swap&&G.dist(B.cursor,o)<2+B.aimError*1.6)extra.trigger=1;}
 }else if(tool===1){
  goal=Op.pathAt(o.points,o.cut||0);
  if(p.stroke?.id===o.id){
   const gated=o.type==='lastnote'&&Op.onBeat(S);goal=Op.pathAt(o.points,(o.cut||0)+(gated?0:3));extra.trigger=1;speed=gated?0:92;
  }else if(!swap&&Math.hypot(goal[0]-B.cursor.x,goal[1]-B.cursor.y)<3+B.aimError*1.6)extra.trigger=1;
 }else if(tool===2){
  const pair=Op.stitchPair(S,o);goal=p.stitch?.id===o.id?pair[1]:pair[0];
  if(p.stitch?.id===o.id){extra.trigger=1;if(Math.hypot(B.cursor.x-goal[0],B.cursor.y-goal[1])<3+B.aimError&&!(o.beatGate&&Op.onBeat(S)))extra.trigger=0;speed=100;}
  else if(!swap&&Math.hypot(B.cursor.x-goal[0],B.cursor.y-goal[1])<3+B.aimError*1.6)extra.trigger=1;
 }else if(tool===3){
  if(o.cells){const cell=o.cells.find(c=>!c[2]);if(cell)goal=[cell[0],cell[1]];}
  extra.trigger=swap?0:1;speed=170;
 }else if(tool===4){
  if(!swap&&G.dist(B.cursor,o)<4+B.aimError){
   const isBeat=o.type==='reed'||o.type==='voicebox';const u=S.worldTime%.9;
   extra.trigger=p.charge<.52?1:isBeat&&u>=.25?1:0;
   if(p.charge>=.52&&(!isBeat||u<.25))B.release=.12;
  }
 }else if(tool===5){
  extra.trigger=!swap&&G.dist(B.cursor,o)<5+B.aimError&&p.heat<.88&&p.lock<=0&&!(o.type==='fermata'&&o.stage<2&&!Op.eyeOpen(S,o))?1:0;
  if(p.heat>=.88)B.cooling=true;if(B.cooling){extra.trigger=0;if(p.heat<.18)B.cooling=false;}
 }else if(tool===6||tool===7)extra.trigger=swap?0:1;
 if(o.type==='lastnote'&&o.stage===0&&Op.onBeat(S)){extra.trigger=0;speed=0;}if(o.retracted&&!S.flags.retracted)extra.trigger=0;
 if(S.caseId===3&&(S.phase===3||B.aimError>0&&S.phase===0)&&!S.slow&&S.gauge>=35)extra.gift=true;
 if(B.options.showGifts&&S.gauge>65&&Math.floor(B.t)%18===0&&!S.slow)extra.gift=true;
 return move(B,S,goal,dt,speed,extra);
}
G.Bot={create,next,move};
})();
