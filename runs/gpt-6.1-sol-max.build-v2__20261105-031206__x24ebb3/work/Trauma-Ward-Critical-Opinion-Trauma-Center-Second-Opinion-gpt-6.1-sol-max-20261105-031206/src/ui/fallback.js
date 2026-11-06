import {createOp,step,drainEvents} from '../sim/op.js';
import {botInput} from '../sim/bot.js';
import {OPS} from '../content/ops.js';
import {INTERVIEW} from '../content/about.js';
export function fallback(reason=''){
 const app=document.getElementById('app');app.replaceChildren();
 const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;canvas.className='fallback-art';app.append(canvas);
 const main=document.createElement('main');main.className='fallback-card';app.append(main);
 const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent='VERITY GENERAL / OR-7';main.append(eyebrow);
 const title=document.createElement('h1');title.textContent='TRAUMA WARD';main.append(title);
 const sub=document.createElement('h2');sub.textContent='CRITICAL OPINION';main.append(sub);
 const touch=(navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches)&&!matchMedia('(any-pointer: fine)').matches;
 const message=document.createElement('strong');message.textContent=touch?'Controller or keyboard required':'A WebGPU browser is required';main.append(message);
 const explanation=document.createElement('p');explanation.textContent='The 3D operating theatre needs WebGPU. Open this file in a browser with WebGPU enabled. A surgical demonstration runs behind this message.';main.append(explanation);
 const gear=document.createElement('button');gear.className='fallback-settings';gear.textContent='⚙';gear.ariaLabel='Settings';app.append(gear);
 const details=document.createElement('section');details.className='fallback-details';details.hidden=true;
 const close=document.createElement('button');close.textContent='Close';close.onclick=()=>{details.hidden=true;};details.append(close);
 const h=document.createElement('h2');h.textContent='About / renderer information';details.append(h);
 const desc=document.createElement('p');desc.textContent='WebGPU is unavailable in this browser. The original engine is unchanged. Keyboard, mouse and standard controllers are supported when WebGPU is available.';details.append(desc);
 const json=document.createElement('pre');json.textContent=JSON.stringify(INTERVIEW,null,2);details.append(json);app.append(details);
 gear.onclick=()=>{details.hidden=!details.hidden;};
 const g=canvas.getContext('2d');let sim=createOp(OPS[0],{god:true}),n=0,last=0,acc=0,index=0;
 function draw(now){
  const dt=Math.min(.1,(now-last)/1000||0);last=now;acc+=dt;
  while(acc>1/60){acc-=1/60;step(sim,sim.seats.map((_,i)=>botInput(sim,i,.7)));drainEvents(sim);n++;}
  if(sim.status!=='operating'){index=(index+1)%OPS.length;sim=createOp(OPS[index],{god:true});}
  g.fillStyle='#102b35';g.fillRect(0,0,480,270);g.fillStyle='#287377';g.fillRect(10,20,460,235);g.fillStyle='#b78073';g.beginPath();g.ellipse(240,139,186,90,0,0,7);g.fill();
  for(const e of sim.entities)if(!e.done){const x=240+e.x*25,y=137+e.z*23;g.strokeStyle='#e8d7af';g.fillStyle=e.k==='pool'?'#9c344f':'#d5ba94';
   if(e.k==='pool'){g.beginPath();g.ellipse(x,y,e.r*25,e.r*23,0,0,7);g.fill();}
   else if(e.path){g.beginPath();e.path.forEach((p,i)=>i?g.lineTo(240+p.x*25,137+p.z*23):g.moveTo(240+p.x*25,137+p.z*23));g.stroke();}
   else{g.fillRect(x-3,y-3,6,6);}}
  const seat=sim.seats[0],x=240+seat.x*25,y=137+seat.z*23;g.strokeStyle='#92d7e7';g.lineWidth=12;g.beginPath();g.moveTo(x+45,y+95);g.lineTo(x+10,y+9);g.stroke();g.strokeStyle='#fcdfa3';g.lineWidth=1;g.strokeRect(x-5,y-5,10,10);
  g.fillStyle='#10212e';g.fillRect(0,0,480,22);g.fillStyle='#81d5c2';g.font='10px monospace';g.fillText('DEMONSTRATION / '+OPS[index].title,10,14);requestAnimationFrame(draw);
 }
 window.__FALLBACK__={reason:reason||'WebGPU unavailable',get sim(){return sim;},canvas};requestAnimationFrame(draw);
}
