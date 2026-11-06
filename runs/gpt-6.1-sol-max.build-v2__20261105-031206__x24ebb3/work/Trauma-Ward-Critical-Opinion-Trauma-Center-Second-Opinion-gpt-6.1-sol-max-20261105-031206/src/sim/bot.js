import {INJECTION,validTool,targetPoint} from './op.js';
import {opById} from '../content/ops.js';
function move(seat,p,speed){const dx=p.x-seat.x,dz=p.z-seat.z,d=Math.hypot(dx,dz),n=Math.min(1,speed/60/Math.max(d,.0001));return{x:seat.x+dx*n,z:seat.z+dz*n};}
export function botInput(s,index=0,skill=.7){
 const seat=s.seats[index];if(skill<=0)return{};const st=opById(s.id).stages[s.stage],speed=3.5+skill*5;
 if(s.blue){const b=s.blue;const release=b.held&&Math.abs(b.needle-.72)<s.config.blueWidth*.35;return{left:!release,right:!release};}
 if(st.special==='massage'){
  const beat=Math.floor(s.elapsed*s.bpm/60);return{left:beat%2===0,right:beat%2===1};
 }
 if(st.special==='quiet')return{gift:true};
 if(st.special==='rewind')return{gift:!s.lookCount};
 if(st.boss==='miserere'){const core=s.entities.find(e=>!e.done&&e.grabbed!=null&&e.grabbed!==index);if(core){const hand=s.seats[core.grabbed];return{...move(seat,hand,speed+3),tool:'forceps',use:true};}}
 const needsDose=(Math.min(...s.vitals)<(skill<.5?40:56)||st.special==='inject')&&s.doses>0;
 if(needsDose||seat.tool==='syringe'&&seat.using){const p=move(seat,INJECTION,speed),near=Math.hypot(p.x-INJECTION.x,p.z-INJECTION.z)<.25;return{...p,tool:'syringe',use:!near||seat.draw<1,table:s.vitals.indexOf(Math.min(...s.vitals))};}
 let target=seat.grab?s.entities.find(e=>e.id===seat.grab):s.entities.find(e=>e.id===seat.work&&!e.done&&validTool(e)===seat.tool);
 if(!target){
  let es=s.entities.filter(e=>!e.done&&e.required&&e.grabbed==null&&!(e.k==='cyst'&&e.revealed&&!e.real));
  if(s.seats.length>1){const unclaimed=es.filter(e=>!s.seats.some(other=>other.id!==index&&other.work===e.id));if(unclaimed.length)es=unclaimed;}
  es.sort((a,b)=>{
   const penalty=e=>e.k==='strain'&&e.phase==='buried'?100:e.k==='eye'&&e.phase!=='open'?50:0;
   return penalty(a)-penalty(b)+Math.hypot(seat.x-a.x,seat.z-a.z)-Math.hypot(seat.x-b.x,seat.z-b.z);
  });target=es[0];
 }
 if(!target)return{use:false};
 let tool=validTool(target),p=targetPoint(target),use=true,rotate=0;
 if(seat.grab){
  if(target.k==='fragment'||target.k==='organ'&&target.place){p={x:target.tx,z:target.tz};const da=(target.targetAngle||0)-(target.angle||0);rotate=Math.abs(da)<.03?0:Math.sign(da);if(Math.hypot(seat.x-p.x,seat.z-p.z)<.2&&Math.abs(da)<.04)use=false;}
  else {p=target.path[Math.min(target.progress,target.path.length-1)];if(target.free)use=false;}
 }
 if(target.k==='strain'&&target.phase==='buried'){tool='scanner';use=false;}
 if(target.k==='eye'&&target.phase!=='open')use=false;
 if(target.k==='plate'&&(s.elapsed*s.bpm/60)%1<=.37)use=false;
 const movement=move(seat,p,target.k==='magnet'?Math.min(speed,3):speed);
 const d=Math.hypot(movement.x-p.x,movement.z-p.z);
 if(!seat.grab&&['scalpel','suture','forceps','laser','drain'].includes(tool)&&d>(tool==='drain'?target.r+.1:skill>=.99?.07:.38))use=false;
 if(skill<1&&['scalpel','suture'].includes(tool)){movement.z+=Math.sin(s.tick*.17+index)*(1-skill)*.0015;}
 const gift=seat.gift==='quiet'&&s.composure>40&&Math.min(...s.vitals)<35;
 return{...movement,tool,use,rotate,gift,table:target.table};
}
