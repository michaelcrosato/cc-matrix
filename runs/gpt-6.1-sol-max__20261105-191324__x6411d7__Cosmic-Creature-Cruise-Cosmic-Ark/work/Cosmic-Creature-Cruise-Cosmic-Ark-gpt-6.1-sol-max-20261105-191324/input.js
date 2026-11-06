import {clamp} from './core.js';
export class Input {
  constructor({activity,menu,isMenu,worldPoint}){
    this.activity=activity;this.menu=menu;this.isMenu=isMenu;this.worldPoint=worldPoint;this.keys=new Set();this.last='keyboard';this.mouse={x:innerWidth*.8,y:innerHeight*.5,down:false,active:false};this.pad=null;this.previous=[];this.menuCd=0;this.touch={active:false,x:0,y:0,mx:0,my:0,beam:false,pulse:false};this.touchId=null;this.lastPointer={x:0,y:0};this.blockClick=false;
    addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)&&e.target.tagName!=='INPUT')e.preventDefault();if(!this.wake('keyboard')){this.blockClick=true;return;}
      if(e.target.tagName==='INPUT'&&e.target.type==='text'){if(e.code==='Escape')this.menu('back');if(e.code==='Enter')this.menu('join');return;}
      this.keys.add(e.code);if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))this.mouse.active=false;if(!this.isMenu()){if(['KeyE','KeyK'].includes(e.code))this.pulseQueued=true;if(['Space','KeyJ'].includes(e.code))this.fireQueued=true;}if(!e.repeat){if(['Escape','KeyP'].includes(e.code))this.menu('pause');else if(this.isMenu()){if(['ArrowUp','KeyW'].includes(e.code))this.menu('up');if(['ArrowDown','KeyS','Tab'].includes(e.code))this.menu('down');if(['ArrowLeft','KeyA'].includes(e.code))this.menu('left');if(['ArrowRight','KeyD'].includes(e.code))this.menu('right');if(['Enter','Space'].includes(e.code))this.menu('select');if(['Backspace','KeyB'].includes(e.code))this.menu('back');}}});
    addEventListener('keyup',e=>this.keys.delete(e.code));addEventListener('blur',()=>{this.keys.clear();this.mouse.down=false;this.touch.mx=0;this.touch.my=0;});
    addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;this.mouse.x=e.clientX;this.mouse.y=e.clientY;if(Math.hypot(e.clientX-this.lastPointer.x,e.clientY-this.lastPointer.y)>3){this.lastPointer={x:e.clientX,y:e.clientY};this.wake('keyboard');this.mouse.active=true;}});
    addEventListener('pointerdown',e=>{const kind=e.pointerType==='touch'?'touch':'keyboard';if(!this.wake(kind)){this.blockClick=true;e.preventDefault();return;}this.blockClick=false;if(e.pointerType!=='touch'){if(e.button===0){this.mouse.down=true;if(!this.isMenu())this.fireQueued=true;}this.mouse.x=e.clientX;this.mouse.y=e.clientY;this.mouse.active=true;}else if(!this.isMenu()&&!e.target.closest('button,input')){e.preventDefault();if(this.touchId===null){this.touchId=e.pointerId;this.touch.active=true;this.touch.x=e.clientX;this.touch.y=e.clientY;this.touch.mx=0;this.touch.my=0;const anchor=document.querySelector('#touch-anchor');anchor.style.display='block';anchor.style.left=e.clientX-45+'px';anchor.style.top=e.clientY-45+'px';}else this.touch.beam=true;}});
    addEventListener('pointermove',e=>{if(e.pointerId!==this.touchId)return;const dx=e.clientX-this.touch.x,dy=e.clientY-this.touch.y;this.touch.mx=clamp(dx/48,-1,1);this.touch.my=clamp(-dy/48,-1,1);const nub=document.querySelector('#touch-nub');nub.style.transform=`translate(${clamp(dx,-32,32)}px,${clamp(dy,-32,32)}px)`;});
    const release=e=>{if(e.pointerType!=='touch')this.mouse.down=false;if(e.pointerId===this.touchId){this.touchId=null;this.touch.active=false;this.touch.mx=0;this.touch.my=0;document.querySelector('#touch-anchor').style.display='none';}this.touch.beam=false;this.touch.context=false;};addEventListener('pointerup',release);addEventListener('pointercancel',release);addEventListener('contextmenu',e=>e.preventDefault());
    document.querySelector('#touch-pulse').addEventListener('pointerdown',e=>{e.preventDefault();this.touch.pulse=true;});document.querySelector('#touch-context').addEventListener('pointerdown',e=>{e.preventDefault();this.touch.context=true;});
  }
  wake(kind){this.last=kind;return this.activity(kind)!==false;}
  poll(dt,hub=false){
    const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);this.pad=pad;this.menuCd-=dt;if(!pad){this.previous=[];return;}
    const b=pad.buttons.map(v=>v.pressed||v.value>.5),axes=pad.axes;const reserved=hub&&b[8]&&b[9];const active=b.some((v,i)=>v&&!(reserved&&(i===8||i===9)))||axes.some(v=>Math.abs(v)>.22);
    if(active&&!this.wake('pad')){this.previous=b;return;}
    if(!reserved&&b[9]&&!this.previous[9])this.menu('pause');
    if(this.isMenu()){
      const dir=b[12]||axes[1]<-.5?'up':b[13]||axes[1]>.5?'down':b[14]||axes[0]<-.5?'left':b[15]||axes[0]>.5?'right':null;
      if(dir&&this.menuCd<=0){this.menu(dir);this.menuCd=.19;}if(b[0]&&!this.previous[0])this.menu('select');if(b[1]&&!this.previous[1])this.menu('back');
    }
    this.pulseEdge=!!(b[1]&&!this.previous[1]);this.previous=b;
  }
  controls(game,assist=false){
    const keys=this.keys;const pad=this.pad;let mx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),my=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    let fire=keys.has('Space')||keys.has('KeyJ')||this.mouse.down||this.fireQueued,beam=fire,boost=keys.has('ShiftLeft')||keys.has('ShiftRight'),pulse=keys.has('KeyE')||keys.has('KeyK')||this.touch.pulse||this.pulseQueued,recall=keys.has('KeyR');let aim;
    if(pad&&this.last==='pad'){
      const a=pad.axes,b=pad.buttons;mx=Math.abs(a[0]||0)>.18?a[0]:0;my=Math.abs(a[1]||0)>.18?-a[1]:0;mx+=(b[15]?.pressed?1:0)-(b[14]?.pressed?1:0);my+=(b[12]?.pressed?1:0)-(b[13]?.pressed?1:0);
      const ax=Math.abs(a[2]||0)>.2?a[2]:mx,ay=Math.abs(a[3]||0)>.2?-a[3]:my;if(Math.hypot(ax,ay)>.2)aim=Math.abs(ax)>Math.abs(ay)?ax>0?0:2:ay>0?1:3;
      fire=b[0]?.pressed||b[7]?.value>.35;beam=b[0]?.pressed||b[6]?.value>.35;boost=b[7]?.value>.35||b[5]?.pressed;pulse=this.pulseEdge;recall=b[3]?.pressed;
    }else if(this.last==='touch'){
      mx=this.touch.mx;my=this.touch.my;beam=true;fire=true;boost=Math.hypot(mx,my)>.95;pulse=this.touch.pulse;recall=this.touch.context;
      if(game.phase==='defense'){const threats=[...game.entities.values()].filter(e=>e.kind==='meteor').sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));if(threats[0])aim=threats[0].dir;}
    }else{
      if(mx||my)aim=Math.abs(mx)>=Math.abs(my)?mx>0?0:2:my>0?1:3;
      if(this.mouse.active&&game.phase==='defense'){const p=this.worldPoint(this.mouse.x,this.mouse.y);aim=Math.abs(p.x)>Math.abs(p.y)?p.x>0?0:2:p.y>0?1:3;}
    }
    this.touch.pulse=false;this.pulseEdge=false;this.pulseQueued=false;this.fireQueued=false;if(assist){if(game.phase==='defense'){fire=true;if(aim===undefined)aim=game.botInput().aim;}if(game.phase==='rescue')beam=true;}
    return {mx:clamp(mx,-1,1),my:clamp(my,-1,1),aim,fire,beam,boost,pulse,recall};
  }
  clear(){this.keys.clear();this.mouse.down=false;this.touch.beam=false;this.touch.context=false;this.touch.mx=0;this.touch.my=0;this.pulseQueued=false;this.fireQueued=false;}
}
