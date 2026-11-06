import {clamp} from '../core/rng.js';
import {TOOLS,opById} from '../content/ops.js';
import {validTool,targetPoint} from '../sim/op.js';
export class Devices{
 constructor(){
  this.last='keyboard';this.lastDesktop='keyboard';this.pads=[];this.previous={};this.edges={};this.lastPad=0;this.activity=false;this.eventActivity=false;this.mouseMoved=false;this.listeners=[];
  this.touchOnly=typeof navigator!=='undefined'&&(navigator.maxTouchPoints>0||globalThis.matchMedia?.('(pointer: coarse)').matches)&&!globalThis.matchMedia?.('(any-pointer: fine)').matches;
  this.blocked=this.touchOnly;
  if(typeof window!=='undefined'){
   const on=(event,fn)=>{window.addEventListener(event,fn);this.listeners.push([event,fn]);};
   on('keydown',e=>{this.last=this.lastDesktop='keyboard';this.blocked=false;this.eventActivity=true;});
   on('pointermove',e=>{if(e.pointerType==='touch')return;if(e.movementX||e.movementY){this.last=this.lastDesktop='mouse';this.mouseMoved=true;this.eventActivity=true;}});
   on('pointerdown',e=>{this.last=e.pointerType==='touch'?'touch':'mouse';if(e.pointerType!=='touch')this.lastDesktop='mouse';this.eventActivity=true;});
   on('wheel',()=>{this.last=this.lastDesktop='mouse';this.eventActivity=true;});
  }
 }
 poll(input){
  this.activity=this.eventActivity;const eventDevice=this.eventActivity?this.last:null;this.eventActivity=false;
  this.pads=typeof navigator!=='undefined'&&navigator.getGamepads?Array.from(navigator.getGamepads()).filter(p=>p?.connected):[];this.edges={};
  if(this.pads.length)this.blocked=false;
  for(const p of this.pads){
   const values=p.buttons.map(b=>!!b.pressed||b.value>.3),old=this.previous[p.index]||[];
   this.edges[p.index]=values.map((b,i)=>b&&!old[i]);this.previous[p.index]=values;
   if(values.some(Boolean)||p.axes.some(x=>Math.abs(x)>.2)){this.last='pad';this.lastPad=p.index;this.activity=true;this.blocked=false;}
  }
  if(eventDevice)this.last=eventDevice;
  if(input.wasPressed('Enter','Space','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyK','KeyQ','KeyE','KeyF','Tab','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8')){this.activity=true;this.last=this.lastDesktop='keyboard';this.blocked=false;}
  if(input.wasPressed('MouseLeft','MouseRight','Touch')||input.wheel)this.activity=true;
 }
 pressed(button,index=this.lastPad){return!!this.edges[index]?.[button];}
 pad(index){return this.pads.find(p=>p.index===index)||this.pads[0];}
 down(button,index=this.lastPad){const b=this.pad(index)?.buttons[button];return b?.value??(b?.pressed?1:0);}
 navigation(input,age){
  const p=this.pad(this.lastPad),ax=p?.axes[0]||0,ay=p?.axes[1]||0;
  const heldDir=ay>.55?1:ay<-.55?-1:0;let repeat=0;
  if(heldDir&&(!this.navDir||this.navDir!==heldDir||age>this.nextNav)){repeat=heldDir;this.nextNav=age+(this.navDir===heldDir?.16:.35);}this.navDir=heldDir;
  return{up:input.wasPressed('ArrowUp','KeyW')||this.pressed(12)||repeat<0,
   down:input.wasPressed('ArrowDown','KeyS')||this.pressed(13)||repeat>0,
   left:input.wasPressed('ArrowLeft','KeyA')||this.pressed(14),right:input.wasPressed('ArrowRight','KeyD')||this.pressed(15),
   confirm:input.wasPressed('Enter','Space')||this.pressed(0),back:input.wasPressed('Escape','MouseRight')||this.pressed(1),
   prev:input.wasPressed('KeyQ')||this.pressed(4),next:input.wasPressed('KeyE')||this.pressed(5),
  };
 }
 prompt(action,settings){
  if(this.last==='pad'){
   const ps={use:'R2',tool:'R STICK',gift:'L2',steady:'L1',confirm:'CROSS',back:'CIRCLE',pause:'OPTIONS',dose:'SQUARE',tag:'TRIANGLE',left:'L2',right:'R2',prev:'L1',next:'R1'};
   const xb={use:'RT',tool:'R STICK',gift:'LT',steady:'LB',confirm:'A',back:'B',pause:'MENU',dose:'X',tag:'Y',left:'LT',right:'RT',prev:'LB',next:'RB'};
   return(settings.glyphs==='Xbox'?xb:ps)[action]||action;
  }
  return{use:this.last==='mouse'?'LMB':'J',tool:'1-8',gift:'SPACE',steady:'SHIFT',confirm:'ENTER',back:'ESC',pause:'ESC',dose:'F',tag:'E',left:this.last==='mouse'?'LMB':'J',right:this.last==='mouse'?'RMB':'K',prev:'Q',next:'E'}[action]||action;
 }
 operation(ctx,s,index,source='auto',settings){
  const seat=s.seats[index],input=ctx.input,pad=typeof source==='number'?this.pad(source):source==='auto'&&this.last==='pad'?this.pad(this.lastPad):null;
  if(this.opFrame!==ctx.engine.frame){this.opFrame=ctx.engine.frame;this.opEdges=new Set();}
  const edge=(b,p)=>{const key=p+':'+b;if(!this.pressed(b,p)||this.opEdges.has(key))return false;this.opEdges.add(key);return true;};
  let x=seat.x,z=seat.z,tool=seat.tool,rotate=0,table=seat.table,tag=false;
  const dt=1/60,dead=(v)=>Math.abs(v)<.18?0:v;
  const steady=pad?this.down(4,pad.index)>.2:input.isDown('ShiftLeft','ShiftRight');
  if(!pad&&(source==='auto'||source==='keyboard')&&(source==='keyboard'?this.lastDesktop:this.last)==='mouse'&&input.pointer.over){const p=ctx.gameField.aim(input.pointer.x,input.pointer.y,s);x=p.x;z=p.z;}
  else{
   let ax=pad?dead(pad.axes[0]||0):(input.isDown('KeyD','ArrowRight')?1:0)-(input.isDown('KeyA','ArrowLeft')?1:0),
    az=pad?dead(pad.axes[1]||0):(input.isDown('KeyS','ArrowDown')?1:0)-(input.isDown('KeyW','ArrowUp')?1:0);
   let m=Math.hypot(ax,az);if(m>1){ax/=m;az/=m;m=1;}
   let speed=s.config.cursorSpeed*m**1.2*(steady?s.config.steadyFactor:1)*settings.cursorSpeed;
   if(settings.aimAssist&&s.entities.some(e=>!e.done&&e.table===seat.table&&validTool(e)===tool&&Math.hypot(targetPoint(e).x-x,targetPoint(e).z-z)<.75))speed*=1-s.config.aimAssist*.65;
   x+=ax*speed*dt;z+=az*speed*dt;
  }
  const grabbed=s.entities.find(e=>e.id===seat.grab),fragment=grabbed?.k==='fragment';
  if(pad){
   const rx=pad.axes[2]||0,ry=pad.axes[3]||0;
   if(fragment)rotate=rx;
   else if(Math.hypot(rx,ry)>.55){const ix=(Math.round(Math.atan2(rx,-ry)/(Math.PI/4))+8)%8;if(opById(s.id).tools.includes(TOOLS[ix]))tool=TOOLS[ix];}
   if(edge(5,pad.index))tool=seat.lastTool;
   if(edge(2,pad.index))tool='syringe';
   if(edge(14,pad.index))table=(table+s.vitals.length-1)%s.vitals.length;
   if(edge(15,pad.index))table=(table+1)%s.vitals.length;
   tag=edge(3,pad.index);
  }else if(source==='auto'||source==='keyboard'){
   for(let n=1;n<=8;n++)if(input.consumePress('Digit'+n)&&opById(s.id).tools.includes(TOOLS[n-1]))tool=TOOLS[n-1];
   if(fragment)rotate=(input.isDown('KeyE')?1:0)-(input.isDown('KeyQ')?1:0)+Math.sign(input.wheel)*3;
   else{if(input.consumePress('KeyQ'))tool=seat.lastTool;if(input.wheel){let idx=TOOLS.indexOf(tool);do{idx=(idx+Math.sign(input.wheel)+8)%8;}while(!opById(s.id).tools.includes(TOOLS[idx]));tool=TOOLS[idx];}}
   if(input.consumePress('KeyF'))tool='syringe';if(input.consumePress('Tab'))table=(table+1)%s.vitals.length;
   tag=input.consumePress('KeyE');
  }
  let gift=pad?this.down(6,pad.index)>.2:input.isDown('Space');
  if(settings.giftToggle&&seat.gift==='quiet'){
   const toggle=pad?edge(6,pad.index):input.consumePress('Space');if(toggle)this.giftToggled=!this.giftToggled;gift=!!this.giftToggled;
  }
  const use=pad?Math.max(this.down(7,pad.index),this.down(0,pad.index)):input.isDown('MouseLeft','KeyJ')?1:0;
  const right=pad?this.down(7,pad.index)>.2:input.isDown('MouseRight','KeyK');
  const left=pad?this.down(6,pad.index)>.2:input.isDown('MouseLeft','KeyJ');
  return{x:clamp(x,-6.3,6.3),z:clamp(z,-3.5,3),tool,use,gift,steady,rotate,table,tag,
   drop:pad?this.down(1,pad.index)>.2:input.isDown('KeyK','MouseRight')&&!s.blue&&!s.massage,left,right};
 }
 rumble(strength=.3,duration=100){for(const p of this.pads)p.vibrationActuator?.playEffect?.('dual-rumble',{duration,strongMagnitude:strength,weakMagnitude:strength*.6}).catch?.(()=>{});}
 dispose(){for(const[e,fn]of this.listeners)window.removeEventListener(e,fn);}
}
