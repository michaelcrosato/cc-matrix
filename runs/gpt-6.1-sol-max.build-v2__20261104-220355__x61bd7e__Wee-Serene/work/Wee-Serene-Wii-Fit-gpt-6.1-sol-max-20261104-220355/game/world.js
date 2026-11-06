(() => {
const G=window.G,E=G.E,{px}=E,P=G.palette;
E.MATERIALS.retreatWood={color:'#e1c8a1',pattern:'planks',bw:3,len:20};E.MATERIALS.retreatWhite={color:'#f2f7f5',pattern:'none'};E.MATERIALS.retreatCyan={color:'#5dafb8',pattern:'glaze'};
E.SHAPES.mat={about:'soft rounded exercise mat with stitched edging',mats:{a:'retreatCyan',b:'retreatWhite'},parts:[['box','a',[0,0,0],[38,26,1]],['row',2,[0,22,0],['box','b',[0,0,1],[30,.6,.15]]]]};
E.SHAPES.stepbench={about:'low studio step with pale top',mats:{w:'retreatWood',a:'retreatCyan',b:'retreatWhite'},parts:[['box','a',[0,0,0],[24,13,4]],['box','b',[0,0,4],[25,14,1]],['row',2,[17,0,0],['box','w',[0,0,0],[3,10,2]]]]};
E.SHAPES.dumbbell={about:'tiny optimistic dumbbell',mats:{w:'retreatCyan',b:'retreatWhite'},parts:[['box','b',[0,0,2],[10,2,2]],['row',2,[8,0,0],['ball','w',[0,0,3],3]]]};
G.sea=(g,W,H,horizon,t=G.time,dusk=false)=>{for(let y=0;y<H;y+=3)px.rect(g,0,y,W,3,E.mix(dusk?'#d5b8b5':'#c5edf4',dusk?'#9ebec1':'#90d7e4',y/H));px.disc(g,W*.73,horizon-26,12,dusk?'#ffe3bd':'#fff7ce');px.rect(g,0,horizon,W,H-horizon,dusk?'#6ca4af':'#57b9ca');for(let i=0;i<29;i++){const yy=horizon+5+(i*13)%(Math.max(6,H-horizon-8)),xx=((i*59+t*(2+i%3))%(W+40))-20;px.rect(g,xx,yy,8+(i%5)*4,1,i%3===0?'#c5e7e4':dusk?'#9ac8c9':'#8bd4dc');}for(let i=0;i<4;i++){const x=(W*.21+i*71+t*1.4)%(W+25);px.ell(g,x,14+i%2*13,11+i*2,3,'#e6f6f6');}}
G.studio=(r,room='deck',opts={})=>{
 const g=r.ctx,W=r.W,H=r.H,t=G.time,base=Math.round(H*.49),dusk=room==='raft'||opts.dusk;
 G.sea(g,W,H,Math.round(H*.23),t,dusk);
 const outdoor=['deck','pier','raft','coast','laundry'].includes(room);
 if(!outdoor){px.rect(g,0,0,W,base,'#e4edeb');px.rect(g,9,19,W-18,base-27,'#f5faf8');px.rect(g,W*.37,21,W*.51,base-38,'#bbd7da');G.seaWindow(g,W*.37+3,24,W*.51-6,base-44,t);px.rect(g,W*.62,24,3,base-44,'#f7fbf9');px.rect(g,W*.37,base-17,W*.51,4,'#ffffff');}
 for(let y=base;y<H;y+=4)px.rect(g,0,y,W,4,E.mix(dusk?'#b5aaa3':'#f2e4ce',dusk?'#d6beaa':'#dfbf98',(y-base)/(H-base)));
 for(let i=0;i<20;i++){const yy=base+Math.pow(i/19,1.4)*(H-base);px.line(g,0,yy,W,yy,dusk?'#ad9990':'#d5b890');if(i%2===0){const start=(i%4)*29;for(let x=start;x<W;x+=94)px.line(g,x,yy,x,yy+7,'#d8be9c');}}
 if(outdoor){px.rect(g,0,base-3,W,4,'#f5f3e7');px.rect(g,0,base-17,W,2,'#f2f2e4');for(let x=12;x<W;x+=54){px.rect(g,x,base-18,3,24,'#a8bfc0');px.rect(g,x,base-19,3,20,'#f1f1de');}}
 if(room==='pier'||G.festival){for(let x=0;x<W;x+=16){const yy=25+Math.sin(x/W*Math.PI)*10;px.line(g,x,yy,x+16,25+Math.sin((x+16)/W*Math.PI)*10,'#7caaac');px.poly(g,[[x+2,yy+1],[x+12,yy+2],[x+7,yy+11]],['#f4ad92','#f6dc9c','#a3dcd0','#c7bbdd'][(x/16)%4]);}}
 if(room==='iron'){r.shape('dumbbell',-90,-5,0);r.shape('dumbbell',-78,7,0);r.shape('bench',85,-25,0,{scale:1.1,mats:{w:'retreatWood'}});r.shape('pot',88,-36,0,{scale:1.4});r.overlay(g=>{G.text(g,'GENTLY, OR NOT AT ALL',19,base-35,{color:'#789b9d'});});}
 else if(room==='bar'){r.shape('table',80,-25,0,{scale:1.4});r.shape('stool',70,-8,0);r.shape('jar',86,-26,15);r.shape('pot',-90,-30,0,{scale:1.5});}
 else if(room==='bungalow'){r.shape('bed',-68,-20,0,{scale:1.8,mats:{w:'retreatWood'}});r.shape('bench',80,-28,0);r.shape('pot',90,-30,0);}
 else{if(!opts.title)G.plant(r,-105,-34,1.6);G.plant(r,103,-30,1.5);if(room==='raft'){r.prop('lantern',-80,-8,0,{light:true,size:1.2});r.prop('lantern',80,-8,0,{light:true,size:1.2});}else{r.shape('bench',87,-37,0);r.shape('jar',-86,-32,0,{scale:1.1});}}
};
G.seaWindow=(g,x,y,w,h,t)=>{px.rect(g,x,y,w,h,'#b9e8ee');px.rect(g,x,y+h*.42,w,h*.58,'#62bfcc');for(let i=0;i<10;i++)px.rect(g,x+((i*31+t*2)%w),y+h*.46+(i*7)%(h*.5),8,1,'#a5e0e2');px.disc(g,x+w*.78,y+h*.19,6,'#fff8d5');};
G.plant=(r,x,y,s=1)=>{r.shape('pot',x,y,0,{scale:s,mats:{c:'retreatWhite'}});r.queue(x,y,0,g=>{const p=r.w(x,y,9*s);for(let i=0;i<7;i++){const a=i*.63-3.3,dx=Math.cos(a)*10*s,dy=-Math.abs(Math.sin(a))*14*s;px.line(g,p[0],p[1],p[0]+dx,p[1]+dy,'#699a83',2);px.ell(g,p[0]+dx,p[1]+dy,4*s,2*s,i%2?'#8abd96':'#659c85');}});};
G.light=(dusk=false)=>{const game=G.game;game.lights.enabled=true;game.lights.ambient=dusk?.72:.98;game.cam.bounds=null;game.follow(null);game.cam.offset=[0,0];game.focus(0,0,20);};
G.mat=(r,x,y,color)=>{r.shape('mat',x,y,0,{mats:{a:{color:color||'#8bc8c8',pattern:'cloth'}}});};
})();
