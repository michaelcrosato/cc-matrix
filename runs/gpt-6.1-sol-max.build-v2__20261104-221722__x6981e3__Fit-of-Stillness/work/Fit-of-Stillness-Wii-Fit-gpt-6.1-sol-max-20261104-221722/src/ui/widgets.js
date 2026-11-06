import { say, wrap, measure, clean } from './font.js';
export const C = { paper:0xf5f4e8, ink:0x193e3b, teal:0x387b70, mint:0xd8ebd7, pale:0xe9f0de, line:0xb0caba, orange:0xe58d51, white:0xffffff, grey:0x7c9c91, red:0xc45848, gold:0xe7b85f, blue:0x8dc6d8 };
export function rect(h,x,y,w,height,c){if(w>0&&height>0)h.rect(Math.round(x),Math.round(y),Math.round(w),Math.round(height),c);}
export function line(h,x1,y1,x2,y2,c,width=2){const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1); for(let i=0;i<=steps;i+=1.3){const t=i/steps;rect(h,x1+(x2-x1)*t-width/2,y1+(y2-y1)*t-width/2,width,width,c);}}
export function circle(h,x,y,r,c,outline=0){for(let dy=-r;dy<=r;dy++){const w=Math.sqrt(Math.max(0,r*r-dy*dy));if(!outline)rect(h,x-w,y+dy,w*2+1,1,c);else{const wi=Math.sqrt(Math.max(0,(r-outline)**2-dy*dy));if(Math.abs(dy)>r-outline)rect(h,x-w,y+dy,w*2+1,1,c);else{rect(h,x-w,y+dy,w-wi+1,1,c);rect(h,x+wi,y+dy,w-wi+1,1,c);}}}}
export function text(h,x,y,s,{scale=1,color=C.ink,align='left',maxWidth,leading=11}={}){s=clean(s);let rows=maxWidth?wrap(s,maxWidth,scale):s.split('\n');rows.forEach((row,i)=>say(h,Math.round(x-(align==='center'?measure(row,scale)/2:align==='right'?measure(row,scale):0)),Math.round(y+i*leading*scale),row,{scale,color,shadow:false}));return rows.length*leading*scale;}
export function panel(h,x,y,w,height,{color=C.paper,edge=C.line,shadow=true}={}){if(shadow)rect(h,x+3,y+3,w,height,C.ink);rect(h,x,y,w,height,edge);rect(h,x+1,y+1,w-2,height-2,color);}
export function badge(h,x,y,label,color=C.teal){const w=measure(label)+12;rect(h,x,y,w,15,color);text(h,x+6,y+4,label,{color:C.paper});return w;}
export function star(h,x,y,size=6,c=C.gold){const points=[[0,-1],[.28,-.28],[1,-.28],[.44,.18],[.65,.9],[0,.48],[-.65,.9],[-.44,.18],[-1,-.28],[-.28,-.28]];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];line(h,x+a[0]*size,y+a[1]*size,x+b[0]*size,y+b[1]*size,c,2);line(h,x,y,x+a[0]*size,y+a[1]*size,c,2);}}
export function stars(h,x,y,n,size=6){for(let i=0;i<3;i++)star(h,x+i*(size*3),y,size,i<n?C.gold:C.line);}
export function dial(h,x,y,r,dot,ring=.3,{pointer,hide=false,steady=true}={}){
  circle(h,x+1,y+2,r+3,C.ink);circle(h,x,y,r+2,C.line);circle(h,x,y,r,C.paper);
  for(let a=0;a<Math.PI*2;a+=Math.PI/12)line(h,x+Math.cos(a)*(r-5),y+Math.sin(a)*(r-5),x+Math.cos(a)*(r-2),y+Math.sin(a)*(r-2),C.line,1);
  if(!hide){line(h,x-r*.73,y,x+r*.73,y,C.line,1);line(h,x,y-r*.73,x,y+r*.73,C.line,1);circle(h,x,y,r*ring/1.2,steady?C.teal:C.orange,2);circle(h,x+dot.x/1.2*r,y-dot.y/1.2*r,3,C.ink);circle(h,x+dot.x/1.2*r-1,y-dot.y/1.2*r-1,1,C.white);}
  if(pointer){line(h,x,y,pointer.x,pointer.y,C.grey,1);line(h,pointer.x-3,pointer.y,pointer.x+3,pointer.y,C.teal,1);line(h,pointer.x,pointer.y-3,pointer.x,pointer.y+3,C.teal,1);}
}
export function ouncePortrait(h,x,y,r=14,t=0){circle(h,x,y,r+2,C.teal);circle(h,x,y,r,C.paper);for(const sx of [-1,1])rect(h,x+sx*r*.35-1,y-3,2,3,C.ink);line(h,x,y+4,x+Math.sin(t*.6)*r*.7,y-r*.62,C.red,2);circle(h,x,y+4,2,C.red);}
export function chart(h,x,y,w,height,ages,offset=0){
  ages=ages.length>7?ages.slice(-7):ages;
  line(h,x,y,x,y+height,C.line);line(h,x,y+height,x+w,y+height,C.line);
  for(let i=0;i<7;i++){const px=x+i*w/6;text(h,px,y+height+5,String(i+1),{color:C.grey,align:'center'});const v=ages[i];if(v!=null){const py=y+height-(v-offset-15)/90*height;if(i&&ages[i-1]!=null)line(h,x+(i-1)*w/6,y+height-(ages[i-1]-offset-15)/90*height,px,py,C.teal);circle(h,px,py,3,C.teal);}}
}
export class UI {
  constructor(app){this.app=app;this.rects=[];this.focus=0;this.repeat=0;this.previousAxis=0;}
  begin(h){this.h=h;this.rects=[];this.buttons=[];}
  button(id,x,y,w,height,label,{active=false,disabled=false,small=false,detail,onClick}={}){
    const h=this.h,c=disabled?C.grey:C.ink;this.rects.push({id,x,y,w,h:height});this.buttons.push({id,x,y,w,h:height,onClick,disabled});
    if(active){rect(h,x,y,w,height,C.teal);text(h,x+9,y+(small?6:8),label,{color:C.paper,scale:small?1:2});if(!small)text(h,x+w-13,y+10,'>',{color:C.paper});}
    else{rect(h,x,y,w,height,C.paper);rect(h,x,y+height-1,w,1,C.line);text(h,x+9,y+(small?6:8),label,{color:c,scale:small?1:2});}
    if(detail)text(h,x+w-9,y+height-10,detail,{color:active?C.mint:C.grey,align:'right'});
  }
  hit(px,py){return this.buttons.findIndex(b=>!b.disabled&&px>=b.x&&py>=b.y&&px<=b.x+b.w&&py<=b.y+b.h);}
  end(ctx,selected,activate){
    const i=ctx.input,p=i.pointer;const px=(p.x+1)*this.h.width/2,py=(1-p.y)*this.h.height/2;
    if(this.app.device.kind==='mouse'&&p.over){const over=this.hit(px,py);if(over>=0){selected=over;if(i.wasPressed('MouseLeft'))activate(over);} }
    return selected;
  }
  validate(){return this.rects.filter(r=>r.x<0||r.y<0||r.x+r.w>this.h.width+.1||r.y+r.h>this.h.height+.1);}
}
