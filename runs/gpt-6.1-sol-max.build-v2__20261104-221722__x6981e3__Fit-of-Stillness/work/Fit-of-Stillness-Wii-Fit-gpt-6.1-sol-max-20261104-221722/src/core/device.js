export class Device {
  kind = 'keyboard'; pulse = false; touchOnly = false; serial = 0; px = 0; py = 0; held = new Set(); ax = 0; ay = 0;
  constructor() { if (typeof matchMedia !== 'undefined') this.touchOnly = matchMedia('(hover: none) and (pointer: coarse)').matches; }
  update(input) {
    this.pulse = false;
    const keys = input.state().held, fresh = keys.filter(k=>!this.held.has(k));
    const keyEdge=fresh.some(k=>!k.startsWith('Pad')&&!k.startsWith('Mouse')&&k!=='Touch');
    const padEdge=fresh.some(k=>k.startsWith('Pad'))||Math.hypot(input.padAxis.x-this.ax,input.padAxis.y-this.ay)>.045;
    if(keyEdge)this.use('keyboard');
    else if(padEdge)this.use('pad');
    else if(Math.abs(input.pointer.x-this.px)+Math.abs(input.pointer.y-this.py)>.003||fresh.some(k=>k.startsWith('Mouse')||k==='Touch')||input.wheel)this.use(input.pointer.touch?'touch':'mouse');
    else if(keys.length||Math.hypot(input.padAxis.x,input.padAxis.y)>.3)this.pulse=true;
    this.held=new Set(keys);this.ax=input.padAxis.x;this.ay=input.padAxis.y;this.px=input.pointer.x;this.py=input.pointer.y;
  }
  use(kind) { this.kind=kind; this.pulse=true; this.serial++; if (kind==='keyboard'||kind==='pad') this.touchOnly=false; }
}
