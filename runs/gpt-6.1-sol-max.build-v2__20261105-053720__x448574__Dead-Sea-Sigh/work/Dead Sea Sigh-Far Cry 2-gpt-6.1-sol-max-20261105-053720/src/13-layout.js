const PROPS=[];
function prop(id,P,x,y,z=0,o={}){PROPS.push({id,x:atP(P,x,y)[0],y:atP(P,x,y)[1],z:P.z+z*M,o});}
function tentRow(P,count,x,y){for(let k=0;k<count;k++){const xx=x+(k%6)*7,yy=y+Math.floor(k/6)*8;for(const s of [-1,1])beam(P,[xx,yy,2.4],[xx,yy+s*2,0],5,.08,'#a59b75',K_PLAIN);beam(P,[xx-2.6,yy,2.4],[xx+2.6,yy,2.4],.08,.08,WOOD,K_PLANKS);B(P,xx,yy,0,4.8,3.5,.15,0,'#554934',K_PLANKS,false);}}
function hull(P,x,y,yaw=0,index=0){const q={...P,x:atP(P,x,y)[0],y:atP(P,x,y)[1],yaw,c:Math.cos(yaw),s:Math.sin(yaw)};const C=index%2?'#4f5c50':'#7a3a1e';
 B(q,0,0,.2,22,5.7,.3,0,'#38362b',K_METAL);for(const side of [-1,1]){B(q,0,side*3,.3,22,.18,4.6,0,C,K_METAL);beam(q,[-11,side*3,.3],[-15,0,2],.15,3,C,K_METAL);beam(q,[11,side*3,.3],[14,0,2],.15,3,C,K_METAL);for(let i=-9;i<10;i+=3)B(q,i,side*3.12,.5,.16,.16,4.6,0,'#9a6346',K_PLAIN,false);}
 B(q,-7,0,4.9,6,5.8,.2,0,'#8b805f',K_METAL);shack({...q,z:q.z+4.9*M},-6,0,4.6,4.3,3,{n:[{at:2.3,kind:'window'}],s:[{at:2,kind:'door'}],e:[{at:2,kind:'window'}]},'#b4a888','#70634d',false);ladder(q,-9,3.6,0,4.9,-Math.PI/2);
 beam(q,[-1,0,0],[-1,0,14],.2,.2,'#665340',K_PLAIN);beam(q,[-1,-4,10],[-1,4,10],.12,.12,'#665340',K_PLAIN);beam(q,[-1,0,14],[9,3,4.7],.025,.025,'#3b3630',K_PLAIN);beam(q,[-1,0,14],[-9,-3,4.7],.025,.025,'#3b3630',K_PLAIN);
 for(let i=-5;i<7;i+=4)crate(q,i,0,.6,.1,1.1);B(q,7,0,.3,4,4,.2,0,'#3e392e',K_PLANKS);return q;
}
function layout(){E.SHAPES.charred={about:'Burned thorn tree, leafless crown',mats:{b:'#191512 bark'},parts:[['lathe','b',[0,0,0],[[3,0],[2.5,22],[1,42]],{seg:7}],['box','b',[0,0,31],[20,2,2],{rot:12}],['box','b',[0,0,35],[2,18,2],{rot:-22}]]};E.SHAPES.bottle={about:'Bottle tree with swollen trunk and flat thorn crown',mats:{b:'#8e795b bark',l:'#8e8a55 foliage'},parts:[['lathe','b',[0,0,0],[[5,0],[7,13],[5,28],[2,45],[1.5,54]],{seg:8}],['ball','l',[0,0,56],12,{sz:.23}],['ball','l',[10,0,54],8,{sz:.25}]]};
 for(const o of SITES){const q=o.P;if(o.id==='fleet'){for(let i=0;i<9;i++)hull(q,(i%3-1)*43,(Math.floor(i/3)-1)*36,(i%3-1)*.37,i);}
 else if(o.id==='salt'){shack(q,-9,-8,24,9,4,{s:[{at:9,kind:'bay'},{at:18,kind:'door'}]},'#a9a08a','#7a6e5c');for(let i=0;i<8;i++)B(q,12+i%3*3,Math.floor(i/3)*4,0,3,3,1+i%2,.1,'#d9d2bd',K_PLAIN,false);tentRow({...q,y:q.y+120*M,z:height(q.x,q.y+120*M)},30,-20,-10);}
 else if(o.id==='lamp'){CYL(q,0,0,0,4.8,33,'#c4b9a0',K_CONCRETE,18);CYL(q,0,0,0,4.95,4,'#8c4430',K_CONCRETE,18);CYL(q,0,0,33,5.6,.4,'#433d35',K_METAL,18);CYL(q,0,0,33.4,4.1,4.5,'#a99f7c',K_PLAIN,12);CYL(q,0,0,37.9,5.3,1,'#413c35',K_METAL,12);CYL(q,0,0,39,1,2,'#433d35',K_METAL,8);ladder(q,5,0,0,33,Math.PI);shack(q,14,6,7,6,3,{s:[{at:3,kind:'door'}]},'#c3b69b');}
 else if(o.id==='sill'){B(q,0,0,0,240,14,46,0,'#9e9480',K_CONCRETE);for(const x of [-65,0,65]){B(q,x,7.2,0,28,.6,38,0,'#4b5148',K_RIBS);beam(q,[x,8,0],[x,8,46],.4,.4,STEEL,K_PLAIN);}B(q,0,0,46,242,16,.3,0,'#b6a98b',K_CONCRETE);shack({...q,z:q.z+46.3*M},0,0,13,10,4.3,{s:[{at:6.5,kind:'bay'}],n:[{at:3,kind:'window'},{at:9,kind:'window'}]},'#ada78e');for(let i=0;i<160;i++)B(q,-120+i*1.2,15,0+i*.2875,1.25,3,.3,0,CON2,K_CONCRETE);B(q,38,-18,46,22,22,.3,0,'#525448',K_CONCRETE);B(q,72,10,46,4,10,.3,0,CON2,K_CONCRETE);ladder(q,-4,8,0,46,-Math.PI/2);}
 else if(o.id==='mission'){wall(q,-12,-10,12,-10,5,.6,'#c2b69b',K_CONCRETE,[{at:12,kind:'bay'}]);wall(q,-12,-10,-12,10,4,.6,'#b9ad94',K_CONCRETE,[{at:5,kind:'window'},{at:15,kind:'window'}]);wall(q,12,-10,12,10,3.2,.6,'#b9ad94',K_CONCRETE);B(q,0,-10,5,2,.5,2.5,0,'#b9ad94',K_CONCRETE);tentRow(q,12,-30,20);tank(q,18,-10,0);prop('bed',q,-7,0,0,{scale:1.5});prop('table',q,4,0,0,{scale:1.4});}
 else if(o.id==='port'){for(let i=0;i<14;i++){const x=(i%5-2)*16,y=(Math.floor(i/5)-1)*22;shack(q,x,y,10+i%3,9,4+(i===2?8:0),{s:[{at:5,kind:'door'}],n:[{at:3,kind:'window'}]},i%2?'#b9a789':'#bfae8e');}B(q,0,65,-4,160,5,5,0,'#a89a80',K_CONCRETE);hull(q,-30,47,.1,2);}
 else if(o.id==='reedcamp'){tentRow(q,12,-20,-15);B(q,0,10,0,50,2,.3,0,WOOD,K_PLANKS);tower(q,-24,12,0,7);}
 else if(o.id==='strip'){B(q,0,0,-.1,90,8,.15,0,'#b6a487',K_PLAIN,false);for(let i=-40;i<40;i+=9)B(q,i,0,.06,4,.2,.02,0,'#ded4b8',K_PLAIN,false);B(q,-16,15,0,10,1.8,1.5,.3,'#a78c54',K_METAL);B(q,-16,15,1.3,2,14,.2,.3,'#c1aa74',K_METAL,false);}
 else if(o.id==='st4'){shack(q,0,0,12,9,4,{s:[{at:6,kind:'bay'}],n:[{at:3,kind:'window'}]},'#a7a18a');tank(q,16,0,0,8,2);beam(q,[-15,3,.4],[18,3,.4],.4,.4,'#6e6554',K_METAL);tower(q,-16,16,0,7);}
 else if(o.id==='tannery'){shack(q,-6,-6,9,7,3,{s:[{at:4,kind:'door'}]},'#b09b7a');for(let i=0;i<6;i++){CYL(q,8+i%3*4,Math.floor(i/3)*5,0,1.5,1,'#725c46',K_CONCRETE,10);}}
 else if(o.id==='watertower'){tower(q,0,0,0,12);CYL(q,0,0,12,3.5,5,'#8a8b75',K_RIBS,12);shack(q,8,8,6,6,3,{s:[{at:3,kind:'door'}]},'#a89b7a');}
 else if(o.id==='k9'||o.id==='red'){for(let i=0;i<6;i++)container(q,(i%3-1)*10,(Math.floor(i/3)*2-1)*14,0,0,i%2?'#716e50':'#9b6747',i===1);tower(q,-22,20,0,9);shack(q,0,-28,12,8,4,{s:[{at:6,kind:'bay'}]},'#b6a585');for(let x=-24;x<25;x+=8)sandbags(q,x,25,0,6);}
 if(o.faction==='safe'){prop('bed',q,0,6,0,{scale:1.5});prop('chest',q,5,6,0,{scale:1.5});prop('chair',q,-3,6,0,{scale:1.3});}
 if(!['remnant','fleet','strip','sill'].includes(o.id)){prop('barrel',q,12,12,0,{scale:1.5});prop('crate',q,14,12,0,{scale:1.2});}
 }
 for(const p of POSTS){const q=p.P;barrier(q,0,-3,Math.PI/2);sandbags(q,3,7,Math.PI/2,6);sandbags(q,-3,-8,Math.PI/2,6);tower(q,-9,8,0,5);prop('barrel',q,4,7,0,{scale:1.5});}
 for(const st of STAKES){const q={x:st.m*M,y:st.n*M,z:height(st.m*M,st.n*M),c:1,s:0,yaw:0};for(const a of [0,2.1,4.2])beam(q,[Math.cos(a)*.5,Math.sin(a)*.5,0],[0,0,1.2],.05,.05,STEEL,K_PLAIN);B(q,0,0,1.15,.8,.6,.4,0,'#8e967b',K_METAL,false);}
}
function placeProps(){for(const p of PROPS)world.shape(p.id,p.x,p.y,p.z,{...p.o,solid:false});}
