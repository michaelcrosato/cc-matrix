import { disc, clamp } from './dot.js';
import { ACTIONS } from './actions.js';
import { ActivityBot } from './activity.js';
export class LocalDriver {
  constructor(app, { keyboardOnly = false } = {}) { this.app=app; this.x=this.y=0; this.keyboardOnly=keyboardOnly; }
  read(run, dt, ctx, dial) {
    const i=ctx.input, device=this.app.device.kind; let v={x:0,y:0}, rate=false;
    if(device==='mouse' && !this.keyboardOnly && dial) v=disc(((i.pointer.x+1)*ctx.hud.width/2-dial.x)/this.app.tunables.mouseLeanRadius, -((1-i.pointer.y)*ctx.hud.height/2-dial.y)/this.app.tunables.mouseLeanRadius);
    else if(device==='pad'&&!this.keyboardOnly) { v={...i.padAxis}; }
    else { rate=true; const raw=disc((i.isDown('KeyD','ArrowRight')?1:0)-(i.isDown('KeyA','ArrowLeft')?1:0),(i.isDown('KeyW','ArrowUp')?1:0)-(i.isDown('KeyS','ArrowDown')?1:0)); const half=i.isDown('ShiftLeft','ShiftRight')?.5:1; const k=Math.min(1,dt/(Math.hypot(raw.x,raw.y) ? .10:.06)); this.x+=(raw.x*half-this.x)*k; this.y+=(raw.y*half-this.y)*k; v={x:this.x,y:this.y}; }
    return { ...v, rate, breath: i.anyDown(ACTIONS.breath), stepL:i.consumeAny(this.keyboardOnly?['KeyF','ArrowLeft','MouseLeft']:ACTIONS.stepL),stepR:i.consumeAny(this.keyboardOnly?['KeyJ','ArrowRight','MouseRight']:ACTIONS.stepR),confirm:i.consumeAny(ACTIONS.confirm)||i.consumePress('MouseLeft') };
  }
}
export class PadDriver {
  constructor(index){ this.index=index; this.previous=[]; }
  read() { const p=typeof navigator!=='undefined'?navigator.getGamepads?.()[this.index]:null; if(!p)return {x:0,y:0};const buttons=p.buttons.map(b=>b.pressed||b.value>.5),edge=n=>buttons[n]&&!this.previous[n];const v=disc(Math.abs(p.axes[0])>.12?p.axes[0]:0,Math.abs(p.axes[1])>.12?-p.axes[1]:0);const u={...v,breath:buttons[7]||buttons[0],stepL:edge(4)||edge(6),stepR:edge(5)||edge(7),confirm:edge(0)};this.previous=buttons;return u; }
}
export class BotDriver extends ActivityBot { read(run,dt){ return super.read(run,dt); } }
export class GhostDriver { constructor(){this.displayOnly=true;this.packet=null;} receive(p){this.packet=p;} read(){throw new Error('Ghost lanes are display only.');} }
