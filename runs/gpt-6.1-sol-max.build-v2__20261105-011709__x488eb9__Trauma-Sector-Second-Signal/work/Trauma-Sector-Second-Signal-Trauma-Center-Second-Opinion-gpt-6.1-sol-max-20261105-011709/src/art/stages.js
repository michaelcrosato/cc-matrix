(() => {
const E=My3D2dge,G=window.GAME,{px}=E;
const txt=(g,s,x,y,c='#e5f3df',o={})=>E.font.text(g,s,x,y,c,{outline:false,...o});
function rain(g,W,H,t){for(let i=0;i<50;i++){const x=(i*73+t*19)%W,y=(i*37+t*95)%(H+20)-20;px.line(g,x,y,x-3,y+10,'#476675',1);}}
function city(g,W,H,t){px.rect(g,0,0,W,H,'#071624');for(let k=0;k<12;k++)px.rect(g,0,k*H/12,W,H/12+1,E.mix('#071624','#29374a',k/14));
 px.disc(g,W*.78,H*.23,15,'#8fa6a0');px.disc(g,W*.78-5,H*.23-3,14,'#1e3543');
 for(let layer=0;layer<3;layer++)for(let i=0;i<18;i++){const x=i*37-layer*13,h=20+(i*37%59)+layer*9,y=H*.65-h;px.rect(g,x,y,29,h+H*.35,['#162d3a','#102532','#0c202a'][layer]);if(layer===2)for(let j=0;j<3;j++)for(let k=0;k<h/9;k++)if((j+k+i)%3)px.rect(g,x+4+j*8,y+5+k*9,3,3,(i+j)%2?'#54776f':'#c3ab70');}
 for(let i=0;i<3;i++){const x=W*.08+i*W*.35,y=H*.37;px.line(g,x,H*.72,x,y,'#0a222e',4);px.line(g,x-35,y+12,x+64,y-5,'#0a222e',3);px.line(g,x,y-24,x+55,y-3,'#0a222e',2);px.line(g,x+54,y,x+54,y+45,'#16313b',1);}
 px.rect(g,0,H*.82,W,H*.18,'#0b2933');for(let i=0;i<25;i++)px.line(g,(i*31+t*8)%W,H*.84+(i*17)%32,(i*31+t*8)%W+14,H*.84+(i*17)%32,'#294e55',1);
}
function title(r,t){r.overlay(g=>{const W=r.W,H=r.H;city(g,W,H,t);const bw=Math.min(224,W*.56),x=(W-bw)/2,y=H*.49;
 px.rect(g,x-3,y-3,bw+6,H*.37,'#081d26');px.rect(g,x,y,bw,H*.35,'#354955');px.rect(g,x+7,y+6,bw-14,H*.32,'#273c47');
 for(let row=0;row<4;row++)for(let col=0;col<Math.floor(bw/16)-1;col++){const X=x+10+col*16,Y=y+12+row*13;px.rect(g,X,Y,10,8,(row+col)%4===0?'#172f3b':(row+col)%3===0?'#90a79a':'#c9b98a');px.line(g,X+5,Y,X+5,Y+7,'#405961',1);}
 px.rect(g,x+bw/2-23,y-12,46,14,'#3b5b62');txt(g,'ST. RAZ\'S',x+bw/2,y-8,'#cee9cc',{align:'center'});
 px.rect(g,x+bw/2-12,y+62,24,26,'#102932');px.rect(g,x+bw/2-9,y+65,18,21,'#b1c8b0');
 px.line(g,x+bw+12,y+6,x+bw+12,y+32,'#ff9e81',3);px.line(g,x+bw+3,y+19,x+bw+21,y+19,'#ff9e81',3);
 const ax=(t*54)%(W+100)-50;px.rect(g,ax,H*.87,32,14,'#c4c9b0');px.rect(g,ax+20,H*.86,12,14,'#9babac');px.rect(g,ax+21,H*.865,8,6,'#3c5c66');px.disc(g,ax+7,H*.93,4,'#091e27');px.disc(g,ax+27,H*.93,4,'#091e27');px.rect(g,ax+8,H*.86,9,2,Math.sin(t*12)>0?'#ff7b72':'#748fff');
 rain(g,W,H,t);px.blend(g,.35,'normal',()=>px.rect(g,0,0,W,H*.49,'#071823'));
 });}
const palettes={theatre:['#122b3a','#446576','#7ca6a0'],scrub:['#1b3540','#436c77','#d4dfc9'],ward:['#243a49','#6b8789','#b9bea4'],office:['#322c40','#70606a','#e7bd84'],radiology:['#152b3a','#365767','#b4e8cb'],harbor:['#0b2030','#2e4658','#95b6b0'],gala:['#392b40','#92746e','#ffdfa0'],ship:['#1d3543','#526f7a','#e4cb8d'],chapel:['#302b49','#6c617e','#e1bf9b']};
function stage(r,id,t){const pal=palettes[id]||palettes.theatre;r.overlay(g=>{const W=r.W,H=r.H,base=H*.65;
 if(id==='harbor'){city(g,W,H,t);rain(g,W,H,t);return;}
 px.rect(g,0,0,W,H,pal[0]);px.rect(g,0,base,W,H-base,E.tones(pal[1]).deep);
 for(let x=0;x<W;x+=48){px.rect(g,x+1,10,45,base-9,pal[1]);px.rect(g,x+4,13,39,base-16,E.tones(pal[1]).sh);px.line(g,x+1,base,x+47,base,E.tones(pal[1]).lt,1);}
 for(let x=0;x<W;x+=32){px.line(g,W/2,base,x,H,E.tones(pal[1]).sh,1);}for(let y=base+10;y<H;y+=18)px.line(g,0,y,W,y,E.tones(pal[1]).sh,1);
 const wx=W*.5-66,wy=24,wh=Math.min(83,H*.3);px.rect(g,wx-3,wy-3,138,wh+6,'#101f32');px.rect(g,wx,wy,132,wh,'#233c50');
 for(let i=0;i<18;i++){const x=wx+(i*31)%130,y=wy+(i*19+t*34)%wh;px.line(g,x,y,x-2,Math.min(wy+wh,y+6),'#67828a',1);}px.line(g,wx+66,wy,wx+66,wy+wh,pal[1],3);px.line(g,wx,wy+wh/2,wx+132,wy+wh/2,pal[1],3);
 if(id==='radiology'){for(let i=0;i<3;i++){const x=W*.14+i*W*.27;px.rect(g,x-2,30,66,77,'#90c2b2');px.rect(g,x,32,62,73,'#d1efd4');for(let k=0;k<7;k++){px.line(g,x+30,41+k*6,x+11,49+k*5,'#84a79b',2);px.line(g,x+30,41+k*6,x+50,49+k*5,'#84a79b',2);}}}
 if(id==='theatre'){px.rect(g,W*.34,base-19,W*.34,24,'#325b64');px.rect(g,W*.36,base-21,W*.3,14,'#a9c9b5');for(let i=0;i<5;i++)px.disc(g,W*.5+(i-2)*10,22,5,pal[2]);px.line(g,W*.5,0,W*.5,17,'#79999c',3);}
 if(id==='scrub'){for(let i=0;i<3;i++){const x=40+i*(W-80)/3;px.rect(g,x,base-18,65,20,'#97aaac');px.ell(g,x+32,base-17,22,5,'#47626b');px.line(g,x+32,base-24,x+32,base-35,'#bfccbd',2);px.line(g,x+32,base-35,x+43,base-35,'#bfccbd',2);}}
 if(id==='gala'||id==='chapel'){for(let i=0;i<6;i++){const x=22+i*(W-44)/5;px.rect(g,x,15,5,base-15,'#9c8490');px.rect(g,x-3,base-3,11,5,'#d2b9aa');}const cx=W*.5;px.line(g,cx,0,cx,26,'#be986c',2);for(let i=-3;i<=3;i++){px.line(g,cx,25,cx+i*12,34+Math.abs(i)*3,'#be986c',2);px.disc(g,cx+i*12,32+Math.abs(i)*3,3,'#ffe1a0');}}
 if(id==='office'){px.rect(g,W*.56,base-22,110,25,'#7a5547');px.rect(g,W*.6,base-44,34,23,'#203e45');px.rect(g,W*.6+2,base-42,30,19,'#9bb7a3');}
 if(id==='ship'){const swing=Math.sin(t)*11;px.line(g,W*.5,0,W*.5+swing,35,'#759090',2);px.poly(g,[[W*.5+swing-14,35],[W*.5+swing+14,35],[W*.5+swing+6,25],[W*.5+swing-6,25]],'#e3c58b');for(let i=0;i<3;i++){const x=24+i*W*.3;px.rect(g,x,base-8,100,12,'#9c8876');px.rect(g,x,base-14,100,6,'#a4c1ad');}}
 px.blend(g,.16,'add',()=>{const x=W*.52+Math.sin(t*.6)*4;px.poly(g,[[x-10,11],[x+10,11],[x+90,base+15],[x-100,base+15]],pal[2]);});
 txt(g,id==='ship'?'SAMARITAN\'S WAKE':'ST. ERASMUS HARBOR HOSPITAL',10,8,'#aac6bc');
 });}
G.Stages={title,draw:stage,ids:Object.keys(palettes)};
})();
