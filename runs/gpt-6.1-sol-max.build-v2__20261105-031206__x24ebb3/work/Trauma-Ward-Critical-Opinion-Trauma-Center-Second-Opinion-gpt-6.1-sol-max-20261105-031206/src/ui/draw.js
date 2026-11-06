export const C={ink:0x101d2c,panel:0x152b37,edge:0x365861,teal:0x76d7c3,ivory:0xf3e7c7,dim:0x87a3a6,red:0xf08077,gold:0xe9bb6c,blue:0x80bfdf};
export function rect(h,x,y,w,ht,c){h.rect(Math.round(x),Math.round(y),Math.max(0,Math.round(w)),Math.max(0,Math.round(ht)),c);}
export function line(h,x,y,x2,y2,c,thick=1){const dx=x2-x,dy=y2-y,n=Math.max(Math.abs(dx),Math.abs(dy),1);for(let i=0;i<=n;i++)rect(h,x+dx*i/n,y+dy*i/n,thick,thick,c);}
export function circle(h,x,y,r,c,dashed=false){const n=Math.max(14,Math.round(r*7));for(let i=0;i<n;i++){if(dashed&&i%4>1)continue;const a=i/n*Math.PI*2;rect(h,x+Math.cos(a)*r,y+Math.sin(a)*r,1,1,c);}}
export function diamond(h,x,y,r,c){line(h,x,y-r,x+r,y,c);line(h,x+r,y,x,y+r,c);line(h,x,y+r,x-r,y,c);line(h,x-r,y,x,y-r,c);}
export function text(h,x,y,t,c=C.ivory,scale=1){h.text(Math.round(x),Math.round(y),String(t),{color:c,scale,shadow:C.ink});}
export const labelize=s=>s===s.toUpperCase()?s:s.replace(/([A-Z])/g,' $1').toUpperCase();
export function centered(h,y,t,c=C.ivory,scale=1){text(h,(h.width-h.measure(t,scale).width)/2,y,t,c,scale);}
export function wrap(h,t,width,scale=1){const words=String(t).toUpperCase().replace(/\*/g,'').split(/\s+/),lines=[];let current='';for(const word of words){const next=current?current+' '+word:word;if(h.measure(next,scale).width>width&&current){lines.push(current);current=word;}else current=next;}if(current)lines.push(current);return lines;}
export function paragraph(h,x,y,t,width,c=C.ivory,scale=1,gap=11,maxLines=99){const lines=wrap(h,t,width,scale);lines.slice(0,maxLines).forEach((s,i)=>text(h,x,y+i*gap,s,c,scale));return Math.min(lines.length,maxLines)*gap;}
export function panel(h,x,y,w,ht,accent=C.teal){rect(h,x+2,y+3,w,ht,C.ink);rect(h,x,y,w,ht,C.panel);rect(h,x,y,w,1,accent);rect(h,x,y,1,ht,C.edge);rect(h,x+w-1,y,1,ht,C.edge);rect(h,x,y+ht-1,w,1,C.edge);}
export function keycap(h,x,y,label,color=C.dim){const w=h.measure(label).width+8;rect(h,x,y,w,12,C.edge);text(h,x+4,y+3,label,color);return w+5;}
export function waveform(h,x,y,w,phase,color=C.teal){
 let prev={x,y};for(let i=0;i<w;i++){const p=((i/w+phase)%1),v=p>.43&&p<.46?-3:p>.46&&p<.49?8:p>.49&&p<.52?-11:p>.52&&p<.55?3:Math.sin(p*25)*.5;
 const yy=y-v;line(h,prev.x,prev.y,x+i,yy,color);prev={x:x+i,y:yy};}
}
export const ICONS={
 scalpel:['......w','.....ww','....ww.','...ww..','..bb...','.bb....','bb.....'],
 forceps:['w....w.','.w..w..','.w..w..','..ww...','..ww...','..ww...','..bb...'],
 suture:['..ww...','.w..w..','w....w.','w......','.w.....','..www..','.....w.'],
 drain:['..www..','..w.w..','..www..','...b...','...b...','...b...','...b...'],
 syringe:['..w.w..','..www..','...b...','..bbb..','..bwb..','..bbb..','...w...'],
 gel:['...w...','...w...','..www..','.ccccc.','.ccccc.','.ccccc.','..www..'],
 laser:['...r...','...r...','..www..','..bbb..','..bbb..','..bbb..','...b...'],
 scanner:['..ccc..','.c...c.','c..w..c','c.www.c','c..w..c','.c...c.','..ccc..'],
};
export function toolIcon(h,x,y,id,c=C.ivory){h.sprite(Math.round(x),Math.round(y),ICONS[id]||ICONS.forceps,{w:c,b:C.dim,c:C.teal,r:C.red});}
export function padGlyph(h,x,y,button,xbox=false){
 const rows={cross:['c.....c','.c...c.','..c.c..','...c...','..c.c..','.c...c.','c.....c'],circle:['..ccc..','.c...c.','c.....c','c.....c','c.....c','.c...c.','..ccc..'],square:['ccccccc','c.....c','c.....c','c.....c','c.....c','c.....c','ccccccc'],triangle:['...c...','..c.c..','..c.c..','.c...c.','.c...c.','c.....c','ccccccc']};
 if(xbox){circle(h,x+4,y+4,6,C.dim);text(h,x+2,y+1,{cross:'A',circle:'B',square:'X',triangle:'Y'}[button],C.ivory);}
 else h.sprite(Math.round(x),Math.round(y),rows[button],{c:{cross:C.blue,circle:C.red,square:0xe5a3c8,triangle:C.teal}[button]});
}
