import { circle, line, rect, text, C } from '../ui/widgets.js';
export function glyph(h,x,y,kind,label,scheme='PlayStation'){
  if(kind==='pad'&&label==='WASD'){circle(h,x+7,y+6,6,C.ink);circle(h,x+7,y+6,3,C.mint,1);line(h,x+7,y-1,x+7,y+2,C.teal,1);return 19;}
  if(kind==='pad'&&['Space','F/J','Q/E','pause'].includes(label)){const l=label==='Space'?scheme==='Xbox'?'RT':'R2':label==='F/J'||label==='Q/E'?scheme==='Xbox'?'LB/RB':'L1/R1':scheme==='Xbox'?'Menu':'Options';const w=l.length*6+5;rect(h,x,y,w,12,C.ink);text(h,x+3,y+2,l,{color:C.paper});return w+5;}
  if(kind==='pad') {circle(h,x+6,y+6,6,C.ink); if(scheme==='Xbox')text(h,x+3,y+3,label==='confirm'?'A':label==='back'?'B':'X',{color:C.paper});else if(label==='back')circle(h,x+6,y+6,3,C.orange,1);else if(label==='confirm'){line(h,x+3,y+3,x+9,y+9,C.blue,1);line(h,x+9,y+3,x+3,y+9,C.blue,1);}else rect(h,x+3,y+3,6,6,C.mint);return 16;}
  if(kind==='mouse'){rect(h,x+2,y,9,13,C.ink);rect(h,x+3,y+1,7,10,C.paper);rect(h,x+3,y+1,3,5,C.teal);return 16;}
  const l=label==='confirm'?'Enter':label==='back'||label==='pause'?'Esc':label;const w=l.length*6+5;rect(h,x,y,w,12,C.line);rect(h,x,y,w,10,C.paper);text(h,x+3,y+2,l);return w+5;
}
export function prompts(h,app,items,x=12,y=h.height-20){for(const [button,verb] of items){const w=glyph(h,x,y,app.device.kind,button,app.settings.glyphs);text(h,x+w,y+2,verb,{color:C.ink});x+=w+verb.length*6+16;}}
