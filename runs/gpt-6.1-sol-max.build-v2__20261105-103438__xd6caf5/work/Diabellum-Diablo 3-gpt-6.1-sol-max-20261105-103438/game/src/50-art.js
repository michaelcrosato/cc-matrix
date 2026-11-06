E.MATERIALS.bellBronze={color:'#a78c55',pattern:'metal',rivet:6,over:[['rust','#5c8b81',{amount:.22}]]};
E.MATERIALS.bellWax={color:'#d3c6a0',pattern:'noise',amount:.04};
E.MATERIALS.abbeyOak={color:'#5d4542',pattern:'planks',bw:3,len:18};
E.MATERIALS.vesperStone={color:'#697472',pattern:'stones',size:6,over:[['cracks']]};
E.MATERIALS.holyIron={color:'#535c62',pattern:'metal',rivet:4};
E.SHAPES.parishBell={about:'Verdigris bronze church bell with a broad lip, crown and iron tongue',tags:'bell gothic bronze',mats:{b:'bellBronze',i:'holyIron'},
  parts:[['lathe','b',[0,0,0],[[0,0],[15,0],[15,2],[12,4],[10,8],[9,18],[7,23],[2,25],[0,25]],{seg:16}],['cyl','i',[0,0,2],1.7,17],['ball','i',[0,0,2],3],['cyl','b',[0,0,25],3.5,3],['box','b',[0,0,27],[3,3,5]]]};
E.SHAPES.headstone={about:'Gothic headstone with a little grave bell on a string',tags:'grave stone bell',mats:{s:'vesperStone',b:'bellBronze',i:'holyIron'},
  parts:[['box','s',[0,0,0],[12,5,15]],['prism','s',[0,0,15],[[-6,0],[0,6],[6,0]],5,{axis:'y'}],['box','s',[0,-3,8],[1,1,8]],['box','s',[0,-3,12],[6,1,1]],['cyl','i',[8,0,0],.5,25],['lathe','b',[8,0,21],[[2,0],[1,3],[0,3]],{seg:6}],['box','i',[8,0,2],[.3,.3,19]]]};
E.SHAPES.pew={about:'Breakable oak abbey pew, high back and carved bronze ends',tags:'church pew wood',mats:{w:'abbeyOak',b:'bellBronze'},parts:[['box','w',[0,0,8],[31,8,2]],['box','w',[0,3,10],[31,2,12]],['mirror','x',['box','w',[13,0,0],[3,8,8]]],['mirror','x',['box','b',[15,0,9],[2,9,4]]]]};
E.SHAPES.urn={about:'Wax-sealed funerary urn',tags:'pot grave',mats:{s:'vesperStone',w:'bellWax'},parts:[['lathe','s',[0,0,0],[[0,0],[4,0],[5,3],[5,9],[3,12],[4,13],[0,13]],{seg:8}],['cyl','w',[0,0,13],4,2,{r2:1}]]};
E.SHAPES.lychgate={about:'Roofed gothic graveyard gate with bronze bell and pointed lintel',tags:'gate grave bell',mats:{s:'vesperStone',w:'abbeyOak',b:'bellBronze'},parts:[['mirror','x',['box','s',[21,0,0],[6,8,43]]],['box','w',[0,0,36],[45,5,6]],['prism','w',[0,0,42],[[-28,0],[0,18],[28,0]],18,{axis:'y'}],['use','parishBell',[0,0,25],{scale:.3}],['mirror','x',['cyl','b',[21,0,43],2,5]] ]};
E.SHAPES.chain={about:'Heavy bronze chain link post',tags:'chain heaven',mats:{b:'bellBronze'},parts:[['row',9,[0,0,7],['cyl','b',[0,0,32],2,4,{seg:6}]]]};
E.SHAPES.sluice={about:'Foundry sluice wheel and bronze spillway',tags:'foundry wheel',mats:{b:'bellBronze',i:'holyIron'},parts:[['box','i',[0,0,0],[30,12,8]],['cyl','i',[0,0,8],3,19],['cyl','b',[0,0,27],12,2,{seg:10}],['box','i',[0,0,29],[23,2,2]],['box','i',[0,0,29],[2,23,2]]]};
E.SHAPES.spire={about:'Pointed abbey pier with bronze pinnacles',tags:'gothic pillar',mats:{s:'vesperStone',b:'bellBronze'},parts:[['box','s',[0,0,0],[17,17,6]],['box','s',[0,0,6],[10,10,48]],['box','s',[0,0,54],[17,17,4]],['cyl','b',[0,0,58],7,18,{r2:0,seg:4}]]};
function weaponLine(w,from,to,c,width=1){px.line(w.g,from[0],from[1],to[0],to[1],c,Math.max(1,Math.round(width*w.u)));}
E.Humanoid.weapon('clapper',{length:24,rest:[.55,.28,-.78],blade:true,draw(w){const a=w.at(-2),b=w.at(17),c=w.at(22);w.push((a[2]+b[2])/2,()=>{weaponLine(w,a,b,'#493b32',2);weaponLine(w,w.at(0,-.5),w.at(17,-.5),'#c3a174');for(let i=2;i<10;i+=2)weaponLine(w,w.at(i,-1),w.at(i,1),'#d8bc85');const t=E.tones(w.C.metal);px.disc(w.g,c[0],c[1],4*w.u,t.deep);px.disc(w.g,c[0]-.4,c[1]-.5,3.2*w.u,t.base);px.disc(w.g,c[0]-w.u,c[1]-w.u,1.5*w.u,t.lt);});}});
E.Humanoid.weapon('spade',{length:24,rest:[.25,.25,-.95],blade:true,draw(w){const a=w.at(-3),b=w.at(20);w.push(b[2],()=>{weaponLine(w,a,b,'#6c553c',1.3);weaponLine(w,w.at(16,-2),w.at(22,-3),'#c9c7ad',2);weaponLine(w,w.at(16,2),w.at(22,3),'#7b8d87',2);const pts=[w.at(17,-3),w.at(24),w.at(17,3)];px.poly(w.g,pts.map(p=>p.slice(0,2)),'#aab5a6');weaponLine(w,w.at(17,-3),w.at(24),'#e0dfc6');});}});
E.Humanoid.weapon('crossbow',{length:14,rest:[.85,.12,-.25],blade:false,draw(w){const a=w.at(0),b=w.at(12),l=w.at(10,-7),r=w.at(10,7);w.push(b[2],()=>{weaponLine(w,a,b,'#946b45',3);weaponLine(w,l,b,'#b0b8a9',1.5);weaponLine(w,b,r,'#c0c6b5',1.5);weaponLine(w,l,w.at(4),'#d5c49e');weaponLine(w,w.at(4),r,'#d5c49e');weaponLine(w,w.at(4),w.at(15),'#e7c680');});}});
E.Humanoid.weapon('psalter',{length:4,rest:[.1,0,.3],blade:false,draw(w){const p=w.at(3);w.push(p[2],()=>{px.rect(w.g,p[0]-3*w.u,p[1]-3*w.u,6*w.u,6*w.u,'#bfa77c');px.line(w.g,p[0],p[1]-3*w.u,p[0],p[1]+3*w.u,'#4b5367');});}});
E.Humanoid.hat('watch',h=>{const a=h.at(0,0,2);px.ell(h.g,a[0],a[1],h.r*2.1,h.r*.48,h.dk);px.poly(h.g,[[a[0]-h.r,a[1]],[a[0]-h.r*.7,a[1]-h.r],[a[0]+h.r*.7,a[1]-h.r],[a[0]+h.r,a[1]]],h.c);px.line(h.g,a[0]-h.r*.8,a[1]-1,a[0]+h.r*.8,a[1]-1,'#b69a6b');});
E.Humanoid.hat('beadle',h=>{const a=h.at(0,0,3),rr=h.r;px.poly(h.g,[[a[0]-rr*2.1,a[1]-rr*.6],[a[0],a[1]+rr*.3],[a[0]+rr*2.1,a[1]-rr*.6],[a[0],a[1]-rr*1.5]],'#292a37');px.line(h.g,a[0]-rr*2,a[1]-rr*.6,a[0],a[1]-rr*1.5,GOLD);px.line(h.g,a[0],a[1]-rr*1.5,a[0]+rr*2,a[1]-rr*.6,GOLD);});
function lanternArt(g,x,y,s=1,mouth=0){
  const t=E.tones('#b49b61');px.line(g,x,y-14*s,x,y-10*s,t.lt);px.ell(g,x,y-16*s,3*s,3*s,t.sh);
  px.poly(g,[[x-5*s,y-10*s],[x,y-14*s],[x+5*s,y-10*s]],t.base);px.rect(g,x-5*s,y-10*s,10*s,13*s,'#283c38');
  px.ell(g,x,y-4*s,3.4*s,4.1*s,'#c7c2a4');px.line(g,x-2*s,y-6*s,x-s,y-6*s,'#27322e');px.line(g,x+s,y-6*s,x+2*s,y-6*s,'#27322e');
  px.rect(g,x-s,y-2*s,2*s,Math.max(s,mouth*2*s),'#4b3433');px.line(g,x-5*s,y-10*s,x-5*s,y+3*s,t.sh);px.line(g,x+5*s,y-10*s,x+5*s,y+3*s,t.lt);px.rect(g,x-6*s,y+3*s,12*s,2*s,t.base);px.line(g,x,y-10*s,x,y+3*s,t.deep);
}
function headHook(kind){return (g,Q,rig)=>{
  const p=Q.head;if(!p)return;
  if(kind==='cantor'){px.line(g,p[0]-3*rig.o.size,p[1]-1,p[0]+3*rig.o.size,p[1]-1,'#243043',Math.max(1,rig.o.size));}
  if(kind==='ringer'){for(const key of ['handL','handR']){const a=Q[key];if(a)for(let i=0;i<3;i++)px.line(g,a[0]-2,a[1]-i*2,a[0]+2,a[1]-i*2,'#c7ad7c');}}
};}
function makeHeroRig(h){
  const b=DB.hero[h.kind],gear=h.gear,rare=gear.filter(Boolean).reduce((n,i)=>Math.max(n,i.rarity),0),trim=rare>=4?'#e9c587':rare>=3?'#d0b986':'#ab9771';
  return new E.Humanoid({size:b.size,build:b.build,outfit:b.outfit,weapon:b.weapon,hair:b.hair,hat:gear[1]?(gear[1].rarity>=4?'crown':'helmet'):b.hat||null,hood:gear[1]?false:b.hood,hunch:b.hunch||0,sleeves:b.sleeves,armor:!!gear[2],cape:{len:7,width:5,seg:2.5},seed:hash(h.kind+h.id),colors:{skin:h.kind==='sexton'?'#b5b3a0':'#b9aa8e',hair:h.kind==='sexton'?'#b6b7a8':'#4a4140',cloth:b.cloth,coat:b.cloth,pants:'#333741',boot:gear[4]?'#797a68':'#393b3c',belt:'#6d543a',glove:gear[3]?'#c5a375':'#b1a183',trim,metal:rare>=4?'#bbd0ba':'#8b9692',plate:gear[2]?.rarity>=4?'#aa8a57':'#697779',cape:b.cape,capeIn:'#26252d'},draw:{over:headHook(h.kind)}});
}
class ReachBeast {
  constructor(kind,color){this.kind=kind;this.color=color;this.t=0;this.state={};}
  update(dt,s){this.t+=dt;this.state=s;}
  kick(){}
  draw(g,ox,oy,v){
    const s=this.state,t=this.t,C=E.tones(this.color),f=s.facing||0,cs=Math.cos(f),sn=Math.sin(f),size=this.kind==='moth'?1.8:1;
    const P=(x,y,z)=>{const p=v.p((x*cs-y*sn)*size,(x*sn+y*cs)*size,z*size);return [ox+p[0],oy+p[1]];};
    const line=(a,b,c,w=1)=>px.line(g,a[0],a[1],b[0],b[1],c,w),poly=(a,c)=>px.poly(g,a,c),body=P(0,0,8);
    if(this.kind==='crawler'||this.kind==='hound'){
      const count=this.kind==='hound'?4:8;
      for(let i=0;i<count;i++){const side=i%2?1:-1,fore=Math.floor(i/2)*5-(count===4?2:7),step=Math.sin(t*9+i*1.7)*(s.vx||s.vy?3:.3),hip=P(fore,side*4,9),knee=P(fore+step,side*13,7),foot=P(fore+step*1.6,side*17,Math.max(0,-step));line(hip,knee,C.sh,3);line(knee,foot,C.base,2);line(knee,foot,C.lt,1);}
      px.ell(g,body[0],body[1],11,7,C.deep);px.ell(g,body[0]-1,body[1]-2,10,6,C.base);px.ell(g,body[0]-3,body[1]-3,6,3,C.lt);
      for(const sy of [-1,1]){const e=P(9,sy*4,11);px.rect(g,e[0],e[1],2,2,'#f5d68a');}
    }else if(this.kind==='serpent'){
      for(let i=9;i>=0;i--){const p=P(-i*4,Math.sin(t*7-i*.7)*4,5+Math.sin(i*.5)*3);px.disc(g,p[0],p[1],Math.max(2,6-i*.4),C.sh);px.disc(g,p[0]-1,p[1]-1,Math.max(1,4-i*.3),C.base);}
      const e=P(3,-3,8);px.rect(g,e[0],e[1],2,2,'#f6dc8a');
    }else if(this.kind==='moth'){
      const flutter=.7+Math.sin(t*12)*.2;
      for(const sign of [-1,1]){
        const wing=[P(0,sign*3,12),P(-15,sign*24*flutter,27),P(14,sign*30*flutter,18),P(11,sign*12,2)];poly(wing,C.sh);poly([wing[0],wing[1],wing[2]],C.base);line(wing[1],wing[2],C.lt,2);const eye=P(1,sign*18*flutter,18);px.disc(g,eye[0],eye[1],5,'#8a685a');px.disc(g,eye[0],eye[1],3,'#e0c99d');px.disc(g,eye[0],eye[1],1,'#2a303a');
      }
      line(P(-8,0,12),P(8,0,15),C.deep,5);const h=P(9,0,17);px.disc(g,h[0],h[1],4,C.lt);
    }
  }
}
function makeFoeRig(f){
  const b=f.boss?DB.boss[f.kind]:DB.monster[f.kind],body=b.body;
  if(['crawler','hound','serpent'].includes(body)||f.kind==='regent'&&f.phase>0)return new ReachBeast(f.kind==='regent'?'moth':body,b.color);
  if(body==='blob')return new E.Blob({R:f.kind==='lamb'?8:4,colors:{dk:'#282e38',base:b.color,lt:E.shade(b.color,.3),spec:'#d9d4b7',eye:'#f2dfac',pupil:'#2b2633'},wings:f.kind!=='lamb',feet:true,mouth:true});
  const angel=f.kind==='angelus',size=angel?2.5:f.boss?2:body==='bulky'?1.4:body==='winged'?1.5:1.12;
  return new E.Humanoid({size,build:body==='skeleton'?'skeleton':body==='bulky'||angel?'bulky':'heroic',weapon:f.kind==='digger'?'spade':f.boss||body==='winged'?'clapper':null,hat:f.kind==='beadle'?'beadle':null,outfit:body==='robe'||body==='ghost'||f.kind==='regent'?'robe':'tunic',hood:['robe','ghost'].includes(body),hair:'bald',sleeves:body==='skeleton'?'none':'long',armor:body==='winged'||angel,eyeGlow:true,hunch:body==='ghost'?0:.25,seed:f.id,colors:{skin:b.color,bone:'#c2c0a2',hair:E.shade(b.color,-.3),cloth:E.shade(b.color,-.25),coat:E.shade(b.color,-.25),pants:'#383b3c',boot:'#393a3c',belt:'#665e4c',trim:'#bba16b',metal:'#aaa077',plate:'#9c956f',eye:'#f3d68e'},draw:{over(g,Q,rig){
    if(body==='winged'||angel){const p=Q.neck||Q.head;for(const sign of [-1,1])for(let i=0;i<5;i++){const ax=p[0]+sign*(5+i*3),ay=p[1]+i*1.8;px.poly(g,[[p[0]+sign*4,p[1]+2],[ax+sign*11,ay-12+i],[ax+sign*6,ay+7]],i%2?'#907e57':'#c1ac77');px.line(g,ax,ay,ax+sign*11,ay-12+i,'#e2ca8c');}}
    if(angel){const p=Q.head,rr=10;bellArt(g,p[0],p[1]-4,rr/12,0);if(f.phase===2)px.line(g,p[0],p[1]-12,p[0]+4,p[1]+5,'#19252a',2);}
    if(f.kind==='wight'){const p=Q.handL;if(p)bellArt(g,p[0],p[1]+2,.17,0);}
  }}});
}
function bellArt(g,x,y,s=1,rock=0){
  const C=E.tones('#b49a5b'),pts=[[-12,8],[-9,3],[-7,-9],[-4,-14],[4,-14],[7,-9],[9,3],[12,8],[12,11],[-12,11]].map(([a,b])=>[x+(a+b*rock)*s,y+b*s]);
  px.poly(g,pts,C.deep);px.poly(g,[[-10,7],[-7,1],[-5,-8],[-3,-12],[2,-12],[5,-8],[7,5],[9,7]].map(([a,b])=>[x+(a+b*rock)*s,y+b*s]),C.base);
  px.line(g,x-10*s,y+8*s,x+10*s,y+8*s,C.lt,Math.max(1,s));px.line(g,x-4*s,y-10*s,x-6*s,y+4*s,C.hi,Math.max(1,s));px.ell(g,x,y+11*s,10*s,2*s,C.deep);px.line(g,x,y+7*s,x+rock*8*s,y+14*s,'#5b615d',Math.max(1,2*s));px.disc(g,x+rock*8*s,y+15*s,2*s,C.sh);px.rect(g,x-2*s,y-16*s,4*s,3*s,C.lt);
}
function ensureRig(u,hero=false){
  const signature=hero?u.gear.map(i=>i?.id||0).join(','):u.kind+':'+(u.kind==='regent'?u.phase:0);
  let entry=viewRigs.get(u.id);if(!entry||entry.signature!==signature){entry={rig:hero?makeHeroRig(u):makeFoeRig(u),signature};viewRigs.set(u.id,entry);}return entry.rig;
}
function npcRig(type){
  const id='npc:'+type;if(viewRigs.has(id))return viewRigs.get(id).rig;
  const palettes={forge:['#7d5348','#86877b','short','tunic'],pawn:['#60583f','#c1b58b','bald','coat'],agnes:['#9ba99c','#bcbeb0','long','robe']},p=palettes[type];if(!p)return null;
  const rig=new E.Humanoid({size:type==='pawn'?1.05:1.18,build:'heroic',outfit:p[3],hair:p[2],hood:type==='agnes',hat:type==='pawn'?'cap':null,weapon:null,sleeves:'long',colors:{skin:'#b8ac91',hair:p[1],cloth:p[0],coat:p[0],pants:'#44483f',boot:'#49483c',trim:GOLD},seed:hash(type)});viewRigs.set(id,{rig,signature:'npc'});return rig;
}
function attackState(a){if(!a)return null;const t=a.elapsed,wind=a.wind||.35,total=a.total||1,move=a.s?(a.s.combo?['slash','backslash','overhead'][a.combo]:a.s.move):a.move||'claw';const phase=t<wind?'wind':t<wind+.12?'active':'recover';const u=phase==='wind'?t/wind:phase==='active'?(t-wind)/.12:(t-wind-.12)/Math.max(.1,total-wind-.12);return {spec:E.MOVES[move]||E.MOVES.cast,phase,u:clamp(u,0,1)};}
function updateVisuals(dt,w=W){
  if(!w)return;
  for(const o of w.objects)if(['forge','pawn','agnes'].includes(o.type))npcRig(o.type).update(dt,{x:o.x-19,y:o.y-6,z:0,vx:0,vy:0,facing:.4,pose:o.type==='forge'&&w.time%4<1?'cast':null});
  for(const h of w.heroes){const rig=ensureRig(h,true);rig.update(dt,{x:h.x,y:h.y,z:h.z,vx:h.vx,vy:h.vy,facing:h.facing,attack:attackState(h.attack),dash:h.dodge>0,air:h.dodge>0,hurt:h.hurt,pose:!h.alive?'down':w.angelusKneeling?'guard':null,point:h.kind==='lamplighter',roll:h.dodge>0?(h.kind==='cantor'?0:(.28-h.dodge)/.28*Math.PI*2):0});}
  for(const f of w.foes){const rig=ensureRig(f);const b=DB.monster[f.kind];rig.update(dt,{x:f.x,y:f.y,z:f.z+(b?.body==='ghost'?10+Math.sin(w.time*3+f.id)*2:0),vx:f.vx,vy:f.vy,facing:f.facing,attack:attackState(f.attack),hurt:f.hurt,pose:f.stun>.5?'kneel':w.angelusKneeling&&f.kind==='angelus'?'kneel':null,flap:1,walk:Math.hypot(f.vx,f.vy)>5?1:0});}
  for(const c of w.corpses){const entry=viewRigs.get(c.id);if(entry)entry.rig.update(dt,{x:c.x,y:c.y,z:c.z,facing:c.facing||0,vx:c.vx,vy:c.vy,pose:'down',roll:c.roll||0});}
  for(const a of w.allies){if(!viewRigs.has(a.id))viewRigs.set(a.id,{rig:new E.Humanoid({size:a.giant?1.8:1,build:'skeleton',weapon:'spade',colors:{bone:'#b5c2a0',cloth:'#627459'},seed:a.id}),signature:'ally'});viewRigs.get(a.id).rig.update(dt,{x:a.x,y:a.y,z:0,vx:a.vx||0,vy:a.vy||0,facing:a.facing,attack:a.anim>0?E.move('overhead',1-a.anim/.4):null});}
}
