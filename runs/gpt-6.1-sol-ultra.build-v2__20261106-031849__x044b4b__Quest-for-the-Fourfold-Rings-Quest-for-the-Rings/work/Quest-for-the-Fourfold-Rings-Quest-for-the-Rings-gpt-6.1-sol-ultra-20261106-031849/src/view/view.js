/* Quest for the Fourfold Rings — native my-3D2dge presentation.
 * This file observes simulation state. It never awards progress or draws collision targets. */
(() => {
'use strict';
const E = globalThis.My3D2dge, { px, clamp, lerp } = E;
const GOLD = '#e5b95e', INK = '#101321';
const FAMILIES = {
  dungeon: { floor: '#665f62', dark: '#37333d', wall: '#77727a', top: '#9b9393', glow: '#ffb85f', accent: '#9a4859' },
  crystal: { floor: '#426678', dark: '#223748', wall: '#4c8b9d', top: '#94dedc', glow: '#75eff6', accent: '#7081c5' },
  inferno: { floor: '#8c6c68', dark: '#3b2832', wall: '#6d4b50', top: '#bd9684', glow: '#ffac63', accent: '#c35c42' },
  shifting: { floor: '#655f87', dark: '#302e50', wall: '#5a587d', top: '#9994c0', glow: '#b2a4ff', accent: '#7c77b6' },
  final: { floor: '#625a73', dark: '#252137', wall: '#5d526f', top: '#a18d9a', glow: '#f4c86a', accent: '#95667d' },
  courtyard: { floor: '#68796e', dark: '#343c3a', wall: '#7b8279', top: '#afb1a1', glow: '#ffda91', accent: '#899c70' },
};
const HERO_PALETTES = {
  warrior: { skin:'#edc7a2',hair:'#413547',cloth:'#b8474d',pants:'#403647',boot:'#312b3b',trim:'#f1d58c',belt:'#7b563e',glove:'#dfc490',metal:'#e3e5df',plate:'#c1cad1',hilt:GOLD,cape:'#a9344b',capeIn:'#521e37',eye:'#35263e' },
  wizard: { skin:'#e0baa8',hair:'#e8e2cf',cloth:'#397d99',pants:'#26384f',boot:'#233244',trim:'#f3d88f',belt:GOLD,glove:'#e5c4ae',metal:'#95e6ef',hilt:GOLD,cape:'#2b6182',capeIn:'#1e3c5d',orb:'#9bfff5',eye:'#243a55' },
  phantom: { skin:'#a0d3d9',hair:'#304b6b',cloth:'#96bfd3',coat:'#6e91b5',pants:'#3f4a76',boot:'#303b64',trim:'#e0eaff',belt:'#8c9bbf',glove:'#c9e5e9',metal:'#badcf6',hilt:'#b9bded',cape:'#53698b',capeIn:'#243752',eye:'#e6ffff' },
  changeling: { skin:'#dab894',hair:'#c68b4d',cloth:'#6a8d5c',coat:'#486c4e',pants:'#30453c',boot:'#382e32',trim:'#d7e49b',belt:'#95663e',glove:'#c4ba8d',metal:'#f1d184',hilt:'#bd9b56',cape:'#447663',capeIn:'#23483f',eye:'#273d33' },
};
let game = null, map = null, roomKey = '', worldRef = null, rigs = new Map(), enemyRigs = new Map(), room = null;
let displayWorld=null,smoothEpoch=-1,smoothCache=new Map();
let titleMap = null, boardMap = null, time = 0, lastEpoch = -1, eventId = 0, particles = [], stationaryRigs = {}, lastShift=0,shiftStamp=-99;
const idSeed = id => {let n=2166136261;for(const c of String(id))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const colorOf = k => (FAMILIES[k] || FAMILIES.dungeon);
function registerAssets() {
  Object.assign(E.MATERIALS, {
    qObsidian: { color:'#303044',pattern:'stones',size:7,over:[['cracks'],['moss','#526253',{amount:.1}]] },
    qGold: { color:'#dfac4b',pattern:'metal' }, qIvory: {color:'#d3cfb8',pattern:'stones',size:5},
    qEmber: {color:'#fa8f4c',pattern:'glaze',glow:1}, qCrystal: {color:'#69cbd9',pattern:'glaze',glow:.38},
    qCrystalDark: {color:'#397b9a',pattern:'glaze'}, qMoon: {color:'#aea2da',pattern:'metal'},
    qVerdant: {color:'#537561',pattern:'foliage',size:2.8}, qCloth:{color:'#582d49',pattern:'cloth'},
    qIron: {color:'#53536a',pattern:'metal',rivet:5}, qTable:{color:'#503b36',pattern:'planks',bw:9,len:70},
    qMap: {color:'#9b8b65',pattern:'noise',scale:8,amount:.1}, qSeal:{color:'#ffda88',pattern:'glaze',glow:.8},
  });
  E.PATTERNS.qRunes = (s,m) => ((Math.floor(s.u / 3) ^ Math.floor(s.v / 3)) & 3) === 0 ? 1 : 0;
  E.MATERIALS.qRunestone = {color:'#454467',pattern:'qRunes',over:[['cracks']]};
  Object.assign(E.SHAPES, {
    qRing: {about:'Original ornate vertical twelve-bead gold ring, three raised crown jewels',tags:'ring treasure seal gold',mats:{g:'qGold',s:'qSeal',o:'qObsidian'},foot:[-5,-3,5,3],parts:[
      ['group',[0,0,9],[90,0,0],[['ring',18,5,['ball','g',[0,0,0],1.2]],['ring',6,5.7,['ball','s',[0,0,0],.7]]]],
      ['box','g',[0,0,15],[2.5,2,2]],['ball','s',[0,0,17],1.4],['ball','s',[-4,0,14],1],['ball','s',[4,0,14],1],
    ]},
    qSeal: {about:'Fourfold binding seal with gold radial teeth and luminous central stone',tags:'seal shrine gold',mats:{o:'qObsidian',g:'qGold',s:'qSeal'},foot:[-9,-9,9,9],parts:[
      ['cyl','o',[0,0,0],10,2,{seg:12}],['cyl','g',[0,0,2],8,1,{seg:12}],['cyl','o',[0,0,3],6,1,{seg:12}],
      ['ring',8,7,['box','g',[0,0,3],[1,3,1]]],['ball','s',[0,0,5],3,{sz:.5}],
    ]},
    qPedestal: {about:'Octagonal obsidian ring altar with gold collar',tags:'altar pedestal stone',mats:{o:'qObsidian',g:'qGold'},parts:[
      ['cyl','o',[0,0,0],10,3,{seg:8}],['cyl','g',[0,0,3],7.7,1,{seg:8}],['cyl','o',[0,0,4],6,6,{seg:8}],['cyl','g',[0,0,10],8,1.2,{seg:8}],
    ]},
    qArch: {about:'Gold etched waystone extraction arch with ring-shaped keystone',tags:'gate exit waystone',mats:{o:'qObsidian',g:'qGold',s:'qSeal'},foot:[-17,-5,17,5],parts:[
      ['mirror','x',['box','o',[14,0,0],[6,8,28]]],['mirror','x',['box','g',[14,0,2],[7,9,1.5]]],['mirror','x',['box','g',[14,0,23],[7,9,1.5]]],
      ['box','o',[0,0,28],[34,8,6]],['box','g',[0,4.2,29],[35,1,1]],['use','qRing',[0,0,31],{scale:.66}],
    ]},
    qCrystalRib: {about:'Asymmetric luminous crystal ribs with dark faceted roots',tags:'crystal wall cave',mats:{c:'qCrystal',d:'qCrystalDark'},parts:[
      ['cyl','d',[0,0,0],6.2,3,{seg:5}],['cyl','c',[-2,0,2],4.2,20,{r2:0,seg:5}],['cyl','d',[4,1,2],3,13,{r2:0,seg:4,rot:[0,14,0]}],['cyl','c',[-5,1,0],2.6,10,{r2:0,seg:4,rot:[0,-18,0]}],
    ]},
    qFurnace: {about:'Furnace mechanism with pale pressure dials and three molten vents',tags:'furnace machine fire',mats:{o:'qObsidian',i:'qIron',g:'qGold',f:'qEmber'},parts:[
      ['box','o',[0,0,0],[20,10,18]],['box','i',[0,0,17],[22,12,2]],['row',3,[5,0,0],['box','f',[0,5.2,5],[2,1,8]]],
      ['cyl','i',[-5,0,18],2.2,10,{seg:6}],['cyl','i',[6,0,18],2.2,7,{seg:6}],['ball','g',[0,5.5,16],2,{sz:.75}],
    ],lights:[[0,7,8,'#ff9755',45]]},
    qPartition: {about:'Clockwork sliding partition with gold clock and four corner rivets',tags:'wall clockwork shift',mats:{o:'qRunestone',g:'qGold',i:'qIron'},foot:[-8,-8,8,8],params:{h:23},make:p=>[
      ['box','o',[0,0,0],[15.5,15.5,Math.max(.5,p.h-.5)]],['box','i',[0,0,Math.max(0,p.h-1)],[16,16,1.5]],
      ...(p.h>10?[['box','g',[0,7.9,3],[1,1,p.h-7]],['box','g',[0,7.9,p.h*.6],[9,1,1]],['mirror','x',['ball','g',[5.5,7.7,p.h-3],.9]],['mirror','x',['ball','g',[5.5,7.7,3],.9]]]:[]),
    ]},
    qThrone: {about:'The Ringmaster’s crown-backed obsidian throne',tags:'throne villain obsidian',mats:{o:'qObsidian',g:'qGold',c:'qCloth'},parts:[
      ['box','o',[0,0,0],[34,24,5]],['box','c',[0,0,5],[23,18,4]],['box','o',[0,-7,5],[28,5,44]],
      ['mirror','x',['box','o',[16,2,4],[5,19,17]]],['mirror','x',['box','g',[16,2,21],[6,20,1]]],
      ['row',5,[6,0,0],['cyl','g',[0,-7,49],2.5,9,{r2:0,seg:4}]],['box','g',[0,-10,9],[29,1,1]],
    ]},
    qCastle: {about:'Miniature four-tower castle token for the enchanted route board',tags:'castle board token',mats:{o:'qObsidian',g:'qGold',r:'qCloth'},params:{family:0},make:p=>[
      ['box','o',[0,0,0],[24,17,9]],['mirror','xy',['cyl','o',[10,6,0],4,18,{seg:8}]],
      ['mirror','xy',['cyl','g',[10,6,17],4.5,2,{seg:8}]],['mirror','xy',['cyl',p.family===1?'qCrystal':p.family===2?'qEmber':p.family===3?'qMoon':'qCloth',[10,6,19],4.7,8,{r2:0,seg:4}]],
      ['box','g',[0,8.6,3],[5,1,7]],['box','o',[0,9,3],[3,1,6]],['box','g',[0,0,11],[2,2,10]],
      ['box','r',[4,0,18],[7,.8,5]],
    ]},
    qHourglass: {about:'Dread hourglass of obsidian, gold and pale crystal sand',tags:'hourglass dread board',mats:{o:'qObsidian',g:'qGold',c:'qCrystal',s:'qSeal'},parts:[
      ['cyl','o',[0,0,0],6,2,{seg:8}],['cyl','g',[0,0,2],6,1,{seg:8}],['cyl','g',[0,0,24],6,1,{seg:8}],['cyl','o',[0,0,25],6,2,{seg:8}],
      ['mirror','x',['cyl','g',[4.5,0,3],.65,21,{seg:5}]],['cyl','c',[0,0,4],3.7,9,{r2:.8,seg:6}],['cyl','c',[0,0,13],.8,10,{r2:3.7,seg:6}],['cyl','s',[0,0,4],2.8,3,{r2:0,seg:6}],
    ]},
    qTable: {about:'Carved ritual map table with gold rim and four heavy legs',tags:'table board enchanted map',mats:{w:'qTable',g:'qGold',m:'qMap'},parts:[
      ['box','w',[0,0,0],[270,188,8]],['box','g',[0,0,8],[272,190,1.5]],['box','m',[0,0,9.5],[258,176,1]],
      ['mirror','xy',['box','w',[112,70,-28],[18,18,28]]],['mirror','x',['box','g',[128,0,10],[1,175,1]]],
    ]},
  });
  // Each kit has distinctive held poses, blended by the native continuous rig solver.
  const pose = (name, deltas) => E.Humanoid.pose(name,(J,w)=>{
    for(const [joint,target] of Object.entries(deltas)) if(J[joint]) for(let k=0;k<3;k++) J[joint][k]=lerp(J[joint][k],target[k],w);
  });
  pose('qCarry',{handL:[6,-7,22],elbowL:[1,-8,18]});
  pose('qRevive',{handL:[7,-3,9],handR:[7,3,9],head:[4,0,24]});
  pose('qGuard',{handL:[7,-1,24],elbowL:[3,-5,21],handR:[8,5,25]});
  pose('qPhase',{handL:[2,-8,22],handR:[4,7,26],head:[0,0,31]});
  pose('qCloak',{handL:[2,-2,27],handR:[2,2,27],head:[2,0,29]});
  pose('qLure',{handL:[8,-4,24],handR:[10,2,19]});
  pose('qPass',{handL:[10,-2,25],handR:[10,2,25]});
  E.Humanoid.hat('qHelm', h => {
    E.Humanoid.hats.helmet(h);
    const a=h.at(0,0,h.R*.9), b=h.at(-2,0,h.R*1.75), c=h.at(1,0,h.R*1.8);
    px.poly(h.g,[a,b,c],GOLD);px.line(h.g,...a.slice(0,2),...c.slice(0,2),'#fff0b4');
    for(const s of [-1,1]){const p=h.at(0,s*h.R*.9,h.R*.3),q=h.at(-1,s*h.R*1.65,h.R*1.2);px.line(h.g,p[0],p[1],q[0],q[1],'#bca378',Math.max(1,h.r*.28));}
  });
  E.Humanoid.hat('qCrescent',h=>{
    E.Humanoid.hats.pointed(h);
    const p=h.at(1,0,h.R*1.3);px.disc(h.g,p[0],p[1],Math.max(1,h.r*.32),'#ffde83');px.disc(h.g,p[0]+1,p[1]-.8,Math.max(.5,h.r*.22),'#234c68');
  });
  E.Humanoid.hat('qAntlers',h=>{
    E.Humanoid.hats.band(h);
    for(const s of [-1,1]){const a=h.at(0,s*h.R*.7,h.R*.8),b=h.at(-1,s*h.R*1.1,h.R*1.9),c=h.at(1,s*h.R*1.55,h.R*2.15);px.line(h.g,a[0],a[1],b[0],b[1],GOLD,Math.max(1,h.r*.2));px.line(h.g,b[0],b[1],c[0],c[1],'#e4e4a7');}
  });
  E.Humanoid.weapon('qSword',{length:14,rest:[.5,.35,-.7],blade:true,draw(w){
    const p=w.at(1.7),t=w.at(14),pom=w.at(-2),a=w.at(2,0,-2),b=w.at(2,0,2);
    w.push((p[2]+t[2])/2,()=>{px.line(w.g,p[0],p[1],t[0],t[1],'#657386',Math.max(2,w.u*1.5));px.line(w.g,p[0]-.6,p[1]-.6,t[0],t[1],'#f7f3da',Math.max(1,w.u*.65));px.line(w.g,a[0],a[1],b[0],b[1],GOLD,Math.max(1,w.u));px.disc(w.g,pom[0],pom[1],Math.max(1,w.u*.7),'#e5ac54');px.dot(w.g,t[0],t[1],'#ffffff');});
  }});
  E.Humanoid.weapon('qStaff',{length:13,rest:[.2,.1,1],blade:false,draw(w){
    const a=w.at(-7),b=w.at(10),c=w.at(13);w.push((a[2]+c[2])/2,()=>{px.line(w.g,a[0],a[1],b[0],b[1],'#83603e',Math.max(2,w.u*1.2));px.line(w.g,a[0]-.5,a[1],b[0]-.5,b[1],'#deb66b');px.disc(w.g,c[0],c[1],Math.max(2,w.u*2),'#436b83');px.disc(w.g,c[0]-.4,c[1]-.5,Math.max(1,w.u*1.3),'#a5fff5');px.dot(w.g,c[0]-1,c[1]-1,'#ffffff');});
  }});
}
registerAssets();
function makeHero(classId,seed=1,size=1.3){
  const p=HERO_PALETTES[classId]||HERO_PALETTES.warrior;
  const common={size,seed,face:{eyes:'big',bangs:.35},colors:{...p},sleeves:'long',cape:{len:5,width:4.3,seg:2.3}};
  if(classId==='warrior')return new E.Humanoid({...common,build:'heroic',weapon:'qSword',armor:true,hat:{style:'qHelm',color:'#bcc6cc'},hair:'short',outfit:'tunic',draw:{over(g,Q,rig){const p=Q.handL;if(!p)return;const k=rig.lastView?rig.lastView.scale*size:1.4;px.poly(g,[[p[0]-4*k,p[1]-5*k],[p[0]+4*k,p[1]-5*k],[p[0]+3*k,p[1]+3*k],[p[0],p[1]+6*k],[p[0]-3*k,p[1]+3*k]],'#805339');px.poly(g,[[p[0]-3*k,p[1]-4*k],[p[0]+3*k,p[1]-4*k],[p[0]+2*k,p[1]+2*k],[p[0],p[1]+4*k],[p[0]-2*k,p[1]+2*k]],'#c2b36e');px.line(g,p[0],p[1]-3*k,p[0],p[1]+3*k,'#faf0c4',Math.max(1,k));}}});
  if(classId==='wizard')return new E.Humanoid({...common,weapon:'qStaff',outfit:'robe',hair:'long',hat:{style:'qCrescent',color:'#397b9b'},cape:{len:4,width:4,seg:2.2}});
  if(classId==='phantom')return new E.Humanoid({...common,weapon:null,build:'heroic',hood:true,outfit:'coat',hair:'bald',eyeGlow:'#cbffff',cape:{len:6,width:5.5,seg:2},colors:{...p,skin:'#8cbfcb'}});
  return new E.Humanoid({...common,weapon:null,outfit:'tunic',hair:'long',hat:{style:'qAntlers',color:'#73905a'},cape:{len:6,width:5.3,seg:2.4}});
}
function makeEnemy(kind,seed=20,classId='warrior'){
  if(kind==='fighter')return new E.Humanoid({size:1.03,seed,weapon:'sword',armor:true,build:'bulky',hat:{style:'helmet',color:'#5f606a'},hair:'bald',colors:{skin:'#b0a285',cloth:'#704f47',pants:'#3c343d',plate:'#666b72',metal:'#adb2ae',trim:'#a58b65',eye:'#ffcd73'}});
  if(kind==='fire')return new E.Humanoid({size:1.18,seed,weapon:'staff',outfit:'robe',hood:true,sleeves:'long',eyeGlow:'#ffefad',colors:{skin:'#bb6656',hair:'#472737',cloth:'#782f36',pants:'#332031',boot:'#2c1e2a',trim:'#f0ad66',metal:'#cd8456',orb:'#ffbc67'}});
  if(kind==='nightmare')return new E.Blob({R:7,wings:true,horns:true,tail:true,mouth:'fangs',colors:{dk:'#261e48',base:'#685b9f',lt:'#aaa0d0',spec:'#d0c3e9',eye:'#ffe294',pupil:'#732c53',wing:'#4f416f',inner:'#bf7caa'}});
  if(kind==='echo')return makeHero(classId,seed,1.2);
  return null;
}
function familyOf(w){return w?.room?.family||w?.family||'dungeon';}
function buildMap(def,family){
  const C=colorOf(family),rows=def.rows||['#########################',...Array(17).fill('#.......................#'),'#########################'];
  const flag={stones:[E.hex(C.floor),E.hex(E.shade(C.floor,.08)),E.hex(E.shade(C.floor,-.06))],mortar:E.hex(C.dark),hi:E.hex(E.shade(C.floor,.23)),lo:E.hex(E.shade(C.floor,-.2)),speck:E.hex(E.shade(C.floor,-.12))};
  return new E.TileMap({rows,legend:{'#':1,w:2,c:0,s:0,t:0,'~':{floor:'lava',block:true}},types:{
    1:{h:30,cut:true,cutH:9,face:'qObsidian',roof:'slab',top:C.top,side:C.wall,course:8},
    2:{h:24,cut:true,cutH:10,face:family==='crystal'?'qCrystalDark':'stone',roof:'slab',top:C.top,side:C.wall,course:8},
    3:{h:21,cut:true,cutH:10,face:'qCrystalDark',roof:'qCrystal',top:'#84ced4',side:'#397f97'},
    4:{h:23,cut:true,cutH:10,face:'qRunestone',roof:'qIron',top:'#9390b5',side:'#535072'},
  },floorTex:(x,y,tag)=>{
    if(tag==='lava'){
      const n=E.noise2(x/5,y/5);const k=(Math.sin(x*.35+y*.23)+n*2);return E.hex(k>1.6?'#ffd086':k>.8?'#df704b':k>-.1?'#ac453e':'#592d3a');
    }
    const c=E.tex.flagstone(x,y,flag,10);
    if(family==='courtyard'){
      const moss=E.noise2(x/29,y/22);return moss>.67?E.hex(moss>.75?'#607a5b':'#6c8265'):c;
    }
    const cx=Math.floor(x/16),cy=Math.floor(y/16),lx=x%16,ly=y%16;
    if((cx===2||cx===rows[0].length-3)&&(lx<.6||lx>15.4))return E.hex(E.shade(C.accent,.2));
    if((cx+cy)%7===0&&Math.abs(lx-8)<.65&&Math.abs(ly-8)<3)return E.hex(E.shade(C.accent,.3));
    return c;
  },outside:'#171924',ao:5});
}
function syncMap(w){
  const def=w.room||globalThis.RingContent?.rooms?.[w.roomId];if(!def)return;
  if(roomKey!==def.id||lastEpoch!==w.epoch){
    room=def;map=buildMap(def,def.family);roomKey=def.id;lastEpoch=w.epoch;enemyRigs.clear();particles=[];eventId=w.eventId||0;lastShift=w.shift||0;shiftStamp=-99;
    game.cam.room=null;game.cam.smooth=.1;game.cam.bounds=v=>map.bounds(v);game.cam.snap=true;
  }
  const periodic=(w.roomTime||0)%6<1.45;
  for(let y=0;y<def.rows.length;y++)for(let x=0;x<def.rows[y].length;x++){
    const ch=def.rows[y][x];if(!'cst'.includes(ch))continue;
    let val=0;
    if(ch==='c')val=(w.reveal>0||periodic||(w.contactReveal||[]).some(q=>q.cx===x&&q.cy===y)||(game.settings?.outlines||game.settings?.qOutlines)||(w.heroes||[]).some(h=>Math.hypot(h.x-(x+.5)*16,h.y-(y+.5)*16)<33))?3:0;
    else if(ch==='s'||ch==='t')val=0;
    if(map.cell(x,y)!==val)map.set(x,y,val);
  }
}
function init(g){
  game=g;RingView.game=g;RingView.audio=g.audio;
  E.style.propSize=1.12;
  game.lights.enabled=true;game.lights.ambient=.7;game.lights.darkness=.46;game.lights.tint=.27;
  game.r.outline='#101525';game.r.rim='#ffe5b4';game.r.rimAlpha=.3;
  for(const [k,i] of ['warrior','wizard','phantom','changeling'].map((k,i)=>[k,i]))stationaryRigs[k]=makeHero(k,900+i,1.55);
  titleMap=buildMap({rows:['#########################',...Array(17).fill('#.......................#'),'#########################']},'final');
  boardMap=buildMap({rows:['#########################',...Array(17).fill('#.......................#'),'#########################']},'dungeon');
}
function presentation(w,dt){
  if(smoothEpoch!==w.epoch){smoothCache.clear();smoothEpoch=w.epoch;}
  const copy=(a,kind)=>a.map(e=>{
    const key=kind+e.id;let p=smoothCache.get(key);if(!p){p={x:e.x,y:e.y,targetX:e.x,targetY:e.y,at:time,vx:0,vy:0};smoothCache.set(key,p);}
    const delta=Math.hypot(e.x-p.targetX,e.y-p.targetY);
    if(delta>.001){const elapsed=Math.max(.05,time-p.at);p.vx=(e.x-p.targetX)/elapsed;p.vy=(e.y-p.targetY)/elapsed;p.targetX=e.x;p.targetY=e.y;p.at=time;}
    if(Math.hypot(e.x-p.x,e.y-p.y)>70){p.x=e.x;p.y=e.y;}else{const k=1-Math.exp(-dt/.07);p.x=lerp(p.x,e.x,k);p.y=lerp(p.y,e.y,k);}
    return {...e,x:p.x,y:p.y,vx:time-p.at>.2?0:p.vx,vy:time-p.at>.2?0:p.vy};
  });
  return {...w,heroes:copy(w.heroes||[],'h'),enemies:copy(w.enemies||[],'e')};
}
function update(w,dt,uiState={}){
  if(!game)return;
  time+=dt;worldRef=w;displayWorld=uiState.remote&&w?presentation(w,dt):w;w=displayWorld;
  const screen=uiState.screen||'';
  if(screen==='title'||screen==='select'||!w){
    game.cam.frame(null);game.cam.bounds=null;if(screen==='select'){game.focus(200,175,10);game.cam.offset=[0,0];if(game.zoom!==.9)game.setZoom(.9);}else{game.focus(200,163,12);game.cam.offset=[game.W*.12,24];if(game.zoom!==.87)game.setZoom(.87);}
    for(const [k,rig] of Object.entries(stationaryRigs))rig.update(dt,{x:0,y:0,z:0,facing:Math.PI/2-.25,pose:k==='wizard'?'cast':k==='warrior'?'qCarry':null,expr:'angry'});
    return;
  }
  if(w.mode==='board'||screen==='board'){
    game.cam.frame(null);game.cam.bounds=null;game.cam.offset=[-game.W*.1,12];game.focus(200,158,8);if(game.zoom!==.78)game.setZoom(.78);
    for(const [k,rig] of Object.entries(stationaryRigs))rig.update(dt,{facing:Math.PI/2-.2,pose:k==='warrior'?'guard':null});
    return;
  }
  syncMap(w);if(lastShift!==w.shift){lastShift=w.shift;shiftStamp=time;}game.cam.offset=[0,-3];
  const heroes=w.heroes||[];
  game.cam.frame(heroes,{margin:44,zoom:[.6,.76]});
  if(w.roomId==='final'){game.cam.frame(null);game.setZoom(.62);game.focus(200,132,10);}
  else if(heroes.length){const alive=heroes.filter(h=>!h.down),all=alive.length?alive:heroes;game.focus(all.reduce((a,h)=>a+h.x,0)/all.length,all.reduce((a,h)=>a+h.y,0)/all.length,8);}
  for(const h of heroes){
    const key=h.id+':'+h.classId;let rig=rigs.get(key);if(!rig){rig=makeHero(h.classId,103+h.id);rigs.set(key,rig);}
    const pose=h.down?'down':h.revive>0?'qRevive':h.guard>0?'qGuard':h.phase>0?'qPhase':h.cloak>0?'qCloak':h.pose||(h.carry?'qCarry':null);
    rig.update(dt,{x:h.x,y:h.y,z:h.z||0,vx:h.vx||0,vy:h.vy||0,facing:h.facing||0,attack:h.attack||null,hurt:h.hurt>0,pose,down:h.down?1:0,dash:h.dodge>0,flip:h.dodge>0?clamp(1-h.dodge/.28,0,1):0,expr:h.down?'wince':w.mode==='victory'?'smile':null});
  }
  for(const e of w.enemies||[]){
    let look=enemyRigs.get(e.id);if(!enemyRigs.has(e.id)){look=makeEnemy(e.kind,300+idSeed(e.id),e.classId||'warrior');enemyRigs.set(e.id,look);}
    if(!look)continue;
    if(look instanceof E.Blob)look.update(dt,{flap:e.stun>0?.25:1,look:[Math.cos(e.facing||0),Math.sin(e.facing||0)],squint:e.stun>0,squash:e.wind>0?-.2:0});
    else{
      const attack=typeof e.attack==='object'?e.attack:e.wind>0?{spec:E.MOVES[e.kind==='fire'?'cast':e.attackMove||(e.kind==='echo'?({warrior:'slash',wizard:'cast',phantom:'rising',changeling:'throw'}[e.classId]||'slash'):'slash')],phase:'wind',u:clamp(1-e.wind/(e.windDuration||.7),0,1)}:null;
      look.update(dt,{x:e.x,y:e.y,z:e.z||0,vx:e.vx||0,vy:e.vy||0,facing:e.facing||0,hurt:e.stun>0,attack,pose:e.hp<=0?'down':null,expr:'angry'});
    }
  }
  for(const evt of w.events||[]){
    if(evt.id<=eventId)continue;eventId=evt.id;
    if(!Number.isFinite(evt.x)||!Number.isFinite(evt.y))continue;
    const c=evt.type.includes('ring')||evt.type==='pickup'?GOLD:evt.type.includes('stun')?'#96f4f0':evt.type.includes('hurt')||evt.type==='hit'?'#f2a189':evt.type==='revive'?'#b6efb1':'#b3b7e4';
    if(/hit|hurt|stun|pickup|ring|revive|phase|seal|drop|pass|ward|shift|reveal|deflect/.test(evt.type))particles.push({x:evt.x,y:evt.y,t:time,life:/ring|seal/.test(evt.type)?1.5:.55,type:evt.type,c});
  }
  particles=particles.filter(p=>time-p.t<p.life);
}
function shadow(r,x,y,rad=6){r.shadow(x,y,rad,.26,'#171329');r.shadow(x,y,rad*.55,.22,'#131020');}
function light(r,x,y,z=15,color='#ffbd76',radius=65,intensity=.85){game.lights.add(x,y,z,radius,intensity,{color});}
function runeCircle(r,x,y,rad,color,alpha=.7,z=.25){
  r.decal(g=>{r.groundRing(x,y,rad,color,alpha,z);r.groundRing(x,y,rad*.79,color,alpha*.6,z);const pts=r.groundPts(x,y,rad*.89,8,z);for(let i=0;i<8;i++){const [a,b]=pts[i];px.dot(g,a,b,color);}});
}
function drawRing(r,x,y,z=10,scale=1){
  r.shape('qRing',x,y,z,{scale,facing:Math.PI/2,shadow:false});light(r,x,y,z+12,'#ffcf75',56,.8);
}
function drawExit(r,w){
  const p=w.room?.exit;if(!p)return;const open=!w.room?.ring||w.room?.practice||w.mode==='courtyard'||w.ring?.carrier||w.finalBeat==='escape'||w.room?.cache;
  runeCircle(r,p.x,p.y,15,open?'#ffe3a5':'#7b8795',open?.95:.45);r.shape('qArch',p.x,p.y-3,0,{scale:.8,light:false,facing:Math.PI/2});
  if(open){light(r,p.x,p.y,18,'#ffdb8c',80,1);r.queue(p.x,p.y,14,g=>{const a=r.w(p.x-9,p.y,0),b=r.w(p.x+9,p.y,0),c=r.w(p.x+9,p.y,25),d=r.w(p.x-9,p.y,25);px.polyDither(g,[a,b,c,d],'#ffe1a0',.14,r.ix,r.iy);},{emissive:true});}
}
function drawHazards(r,w){
  for(const h of w.hazards||[]){
    const active=h.phase==='active',warn=h.phase==='warn';if(!active&&!warn)continue;
    const x=h.x,y=h.y,ww=h.w||16,hh=h.h||16;
    const pts=[r.w(x,y,.25),r.w(x+ww,y,.25),r.w(x+ww,y+hh,.25),r.w(x,y+hh,.25)];
    r.decal(g=>{
      px.polyDither(g,pts,active?'#ffbc72':'#efca8f',active?.65:.25,r.ix,r.iy);
      for(let i=0;i<4;i++)px.line(g,...pts[i],...pts[(i+1)%4],active?'#ffe4b1':'#f5d38b',1);
      const n=Math.max(1,Math.floor(Math.max(ww,hh)/18));for(let i=0;i<n;i++){
        const sx=x+(ww>hh?(i+.5)*ww/n:ww*.5),sy=y+(hh>=ww?(i+.5)*hh/n:hh*.5),p=r.w(sx,sy,.5);
        px.line(g,p[0]-2,p[1]-2,p[0]+2,p[1]+2,'#fff0c8');px.line(g,p[0]-2,p[1]+2,p[0]+2,p[1]-2,'#fff0c8');
      }
    },{emissive:active});
    if(active){
      const n=Math.max(2,Math.floor(Math.max(ww,hh)/9));for(let i=0;i<n;i++){
        const sx=x+(ww>hh?(i+.5)*ww/n:ww*.5),sy=y+(hh>=ww?(i+.5)*hh/n:hh*.5),z=6+Math.sin(time*13+i*2)*3;
        r.queue(sx,sy,0,g=>{const p=r.w(sx,sy,0),q=r.w(sx,sy,z+10),a=r.w(sx-4,sy,0),b=r.w(sx+4,sy,0);px.poly(g,[a,q,b],'#cc5c42');px.poly(g,[[p[0]-2,p[1]],q,[p[0]+2,p[1]]],'#ffd087');},{emissive:true});
      }light(r,x+ww/2,y+hh/2,9,'#ff9864',80,.8);
    }
  }
}
function drawConcealed(r,w){
  const def=w.room;if(!def?.rows)return;
  for(let cy=0;cy<def.rows.length;cy++)for(let cx=0;cx<def.rows[cy].length;cx++){
    const c=def.rows[cy][cx],x=(cx+.5)*16,y=(cy+.5)*16;
    if(c==='c'){
      if(map.cell(cx,cy)===0)r.decal(g=>{
        const pts=[r.w(x-7,y-7,.4),r.w(x+7,y-7,.4),r.w(x+7,y+7,.4),r.w(x-7,y+7,.4)];
        for(let i=0;i<4;i++)px.line(g,...pts[i],...pts[(i+1)%4],'#5c9aaf');px.dot(g,...r.w(x,y,.5),'#87d5de');
      });
      else if((cx+cy)%2===0)r.shape('qCrystalRib',x,y,0,{scale:.6,shadow:false});
    }
    if(c==='s'||c==='t'){
      const on=c==='s'?!w.shift:!!w.shift,shiftAge=time-shiftStamp;
      if(w.shiftWarning){r.decal(g=>{const a=r.w(x-7,y-7,.6),b=r.w(x+7,y+7,.6),p=r.w(x,y,.7);px.line(g,a[0],a[1],b[0],a[1],'#ffe0a3');px.line(g,b[0],a[1],b[0],b[1],'#ffe0a3');px.line(g,b[0],b[1],a[0],b[1],'#ffe0a3');px.line(g,a[0],b[1],a[0],a[1],'#ffe0a3');px.line(g,p[0]-4,p[1],p[0]+4,p[1],'#fff1c2');px.line(g,p[0]+4,p[1],p[0]+1,p[1]-3,'#fff1c2');});}
      if(on||shiftAge<.65){const ease=game.reduceMotion?1:clamp(shiftAge/.65,0,1),height=shiftAge<.65?23*(on?ease:1-ease):23;if(height>.5)r.shape('qPartition',x,y,0,{scale:1,shadow:false,facing:Math.PI/2,params:{h:Math.round(height*2)/2}});}
      if(!on)r.decal(g=>{const a=r.w(x-6,y-5,.4),b=r.w(x+6,y+5,.4);px.line(g,...a,...b,'#69658a');const p=r.w(x,y,.5);px.line(g,p[0]-4,p[1],p[0]+4,p[1],'#aea2d0');px.line(g,p[0]+4,p[1],p[0]+1,p[1]-2,'#aea2d0');});
    }
  }
}
function drawProps(r,w){
  const C=colorOf(familyOf(w)),rows=w.room?.rows||[];
  for(const p of w.room?.props||[]){
    const kind=p.kind||p.type||p.shape||'rock',x=p.x,y=p.y,z=p.z||0;
    const shape={crystal:'qCrystalRib',furnace:'qFurnace',seal:'qSeal',altar:'qPedestal',throne:'qThrone',partition:'qPartition',castle:'qCastle'}[kind];
    if(shape)r.shape(shape,x,y,z,{scale:p.scale||1,facing:p.facing??Math.PI/2});
    else r.prop(kind,x,y,z,{...p,size:p.scale||p.size||.9,color:p.color||C.top,light:!!p.light});
  }
  // Authored wall dressing uses the same outer boundary as collision, leaving the floor clear.
  if(rows.length){
    const ww=rows[0].length*16,hh=rows.length*16;
    for(const x of [48,112,ww-112,ww-48]){
      const crystal=familyOf(w)==='crystal';
      if(crystal){r.shape('qCrystalRib',x,22,0,{scale:1});light(r,x,27,14,C.glow,65,.8);}
      else{r.prop(familyOf(w)==='inferno'?'brazier':'torch',x,22,15,{size:.85,light:true,color:C.glow});}
    }
    for(const x of [24,ww-24])for(const y of [72,hh-56]){
      r.prop(familyOf(w)==='crystal'?'crystal':familyOf(w)==='courtyard'?'bush':'pillar',x,y,0,{size:.8,color:C.wall,broken:true});
    }
    if(familyOf(w)==='inferno')for(const x of [40,ww-40])r.shape('qFurnace',x,30,0,{scale:1,facing:Math.PI/2});
    if(familyOf(w)==='dungeon')r.prop('banner',ww/2,23,25,{color:'#753c4c',emblem:GOLD,size:1.2,anchor:'top'});
    if(familyOf(w)==='courtyard')for(const x of [40,ww-40])for(const y of [40,hh-36])r.shape('tree',x,y,0,{scale:1,params:{h:48,seed:x+y}});
  }
}
function drawSpider(r,e){
  const landing=e.wind>0&&e.target?e.target:e;shadow(r,landing.x,landing.y,e.wind>0?13:7);
  const z=e.state==='wind'||e.wind>0?25:e.z||5,ph=time*8+idSeed(e.id)%1000;
  r.actor(e.x,e.y,z,(g,ox,oy)=>{
    const v=E.charView(r.view),p=(x,y,z)=>{const q=v.p(x,y,z);return[ox+q[0],oy+q[1]];};
    const pts=[];for(const s of [-1,1])for(let i=0;i<4;i++){
      const sway=Math.sin(ph+i)*1.2,a=p(s*3,(i-1.5)*2,4),b=p(s*(7+i*.5),(i-1.5)*4,3+sway),c=p(s*(10+i*.5),(i-1.5)*5,-2);
      pts.push([a,b,c]);
    }
    for(const [a,b,c]of pts){px.line(g,...a,...b,'#15182d',3);px.line(g,...b,...c,'#15182d',2);px.line(g,...a,...b,'#8a7a9f',1);px.line(g,...b,...c,'#615a7b');}
    const a=p(0,-2,5),b=p(0,4,4);px.ell(g,a[0],a[1],7,5,'#1e2037');px.ell(g,a[0]-1,a[1]-1,5,3,'#675a87');px.ell(g,a[0]-2,a[1]-2,3,1,'#a998b5');px.disc(g,b[0],b[1],4,'#3b3d59');for(const s of[-1,1])px.dot(g,b[0]+s*2,b[1],'#ffc77b');
  },{flash:e.stun>0?'#9bfff6':undefined,flashMix:.3,xray:false});
  if(e.wind>0){runeCircle(r,landing.x,landing.y,22,'#ffe0b0',.9);r.decal(g=>{const p=r.w(landing.x,landing.y,.8);px.line(g,p[0]-3,p[1]-3,p[0]+3,p[1]+3,'#fff1c9');px.line(g,p[0]-3,p[1]+3,p[0]+3,p[1]-3,'#fff1c9');});}
}
function drawDragon(r,e,w){
  const x=e.x,y=e.y,z=e.z||0,t=time,breath=w?.hazards?.some(h=>h.phase==='warn'),bound=w?.finalBeat==='escape'||w?.mode==='victory';
  shadow(r,x,y,27);
  // A custom continuous rig: ten spine/tail joints, hinged wings, breathing neck and jaw.
  // Every part projects through the native view and uses native snapped pixel shading.
  r.actor(x,y,z,(g,ox,oy)=>{
    const v=E.charView(r.view),P=(a,b,c)=>{const p=v.p(a,b,c);return[ox+p[0],oy+p[1]];};
    const C=E.tones(bound?'#766991':'#635276'),mem=E.tones('#8e5065'),bone='#d2b48b';
    const flap=(bound?-.6:Math.sin(t*1.5)*.1)+(breath?.28:0),wingZ=30+flap*14;
    for(const s of[-1,1]){
      const a=P(s*9,-1,28),b=P(s*34,-11,wingZ+21),c=P(s*65,4,wingZ+15),d=P(s*51,19,wingZ-5),f=P(s*30,18,wingZ-1),h=P(s*13,13,23);
      px.poly(g,[a,b,c,d,f,h],C.deep);px.poly(g,[a,b,c,d,f,h].map(([x,y])=>[x,y-1]),mem.sh);
      px.poly(g,[a,b,f],mem.base);px.poly(g,[b,c,d,f],mem.sh);
      for(const q of[b,c,f])px.line(g,...a,...q,C.lt,2);px.line(g,...b,...c,bone,1);px.line(g,...c,...d,C.base,1);
      const tip=P(s*37,-15,wingZ+25);px.poly(g,[b,tip,[b[0]+s*2,b[1]+3]],bone);
    }
    const tail=[];for(let i=0;i<10;i++){const d=i/9,p=P(Math.sin(t*.7+d*2)*d*14,-i*5,9+(1-d)*6);tail.push(p);if(i)px.line(g,...tail[i-1],...p,C.deep,Math.max(2,12-i));}
    for(let i=1;i<tail.length;i++)px.line(g,...tail[i-1],...tail[i],C.base,Math.max(1,9-i));
    for(const s of[-1,1]){
      const hip=P(s*10,3,13),knee=P(s*18,12,6),foot=P(s*19,21,2);px.line(g,...hip,...knee,C.deep,12);px.line(g,...hip,...knee,C.base,9);px.line(g,...knee,...foot,C.sh,7);for(let j=0;j<3;j++){const p=P(s*(16+j*2.5),24,1);px.line(g,...foot,...p,bone,2);}
    }
    const body=P(0,2,20);px.ell(g,body[0],body[1],19*v.scale,15*v.scale,C.deep);px.ell(g,body[0]-1,body[1]-2,17*v.scale,13*v.scale,C.base);px.ell(g,body[0]-5*v.scale,body[1]-6*v.scale,10*v.scale,6*v.scale,C.lt);
    const rise=breath?6:Math.sin(t*1.5)*1.5,neck0=P(0,9,20),neck1=P(0,18,37+rise),head=P(0,28,38+rise),snout=P(0,35,34+rise);
    px.line(g,...neck0,...neck1,C.deep,20*v.scale);px.line(g,...neck0,...neck1,C.base,16*v.scale);px.line(g,neck0[0]+5,neck0[1],neck1[0]+5,neck1[1],'#a18c94',5*v.scale);
    px.ell(g,head[0],head[1],13*v.scale,9*v.scale,C.deep);px.ell(g,head[0]-1,head[1]-2,11*v.scale,7*v.scale,C.base);px.ell(g,snout[0],snout[1],11*v.scale,5*v.scale,C.sh);
    const jaw=P(0,34,30+rise-(breath?3:0));px.line(g,jaw[0]-8*v.scale,jaw[1],jaw[0]+8*v.scale,jaw[1],C.deep,3*v.scale);
    for(const s of[-1,1]){const n=P(s*5,37,35+rise),f=P(s*8,35,31+rise),tip=P(s*7,37,26+rise);px.ell(g,n[0],n[1],1.5*v.scale,.8*v.scale,C.deep);px.poly(g,[[f[0]-1.4*v.scale,f[1]],tip,[f[0]+1.4*v.scale,f[1]]],bone);}
    for(const s of[-1,1]){
      const eye=P(s*6,29,40+rise);px.line(g,eye[0]-2,eye[1],eye[0]+2,eye[1],bound?'#d6c1ef':'#ffe3a1',2);px.dot(g,eye[0],eye[1],'#fff7d0');
      const h=P(s*8,22,43+rise),tip=P(s*12,17,56+rise);px.poly(g,[h,tip,[h[0]+s*4,h[1]+2]],bone);
    }
    for(let i=0;i<6;i++){const p=P(0,4-i*4,34-i*.8),q=P(0,3-i*4,41-i);px.poly(g,[[p[0]-3,p[1]],q,[p[0]+3,p[1]]],'#b9a1a5');}
    if(breath&&!bound){const p=P(0,36,34+rise);px.disc(g,p[0],p[1],3,'#ffc179');px.dot(g,p[0],p[1],'#fff2b2');}
  },{xray:{color:'#cdb8f5'},outline:'#131424'});
  light(r,x,y+20,35,bound?'#b49df4':'#e8a780',100,.6);
  if(bound)for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.16;runeCircle(r,x+Math.cos(a)*28,y+Math.sin(a)*18,5,'#ffe9aa',.8,35);}
}
function drawHero(r,h,w){
  const rig=rigs.get(h.id+':'+h.classId);if(!rig)return;
  const C=HERO_PALETTES[h.classId],s=h.id===1?'#ffe3a0':'#8be3ee';
  shadow(r,h.x,h.y,h.down?8:6);
  r.decal(()=>r.groundRing(h.x,h.y,7.5,s,h.down?.65:.8));
  const fading=h.phase>0||h.cloak>0;
  r.actor(h.x,h.y,h.z||0,(g,ox,oy)=>rig.draw(g,ox,oy,E.charView(r.view)),{
    xray:{color:s,outline:s,actors:true},outline:(game.settings?.highContrast||game.settings?.outlines||game.settings?.qOutlines)?s:undefined,
    flash:h.hurt>0?'#fff1e2':undefined,flashMix:.35,alpha:fading?.55:1,
    ghost:h.dodge>0||h.phase>0?{color:h.phase>0?'#a4e9f1':s,life:.1,alpha:.18,owner:h}:undefined,
  });
  rig.drawSmear(r,h.classId==='wizard'?['#ffffff','#affcf4','#75d9ec','#4298bc']:undefined);
  if(h.phase>0){runeCircle(r,h.x,h.y,10,'#98eaf1',h.phase<.7?.95:.7);light(r,h.x,h.y,15,'#83dce9',35,.5);if(h.phaseSafe)runeCircle(r,h.phaseSafe.x,h.phaseSafe.y,6,'#ddffff',.8);}
  if(h.cloak>0){const remaining=clamp(h.cloak/.8,0,1);runeCircle(r,h.x,h.y,3+9*remaining,h.cloak<.8?'#ead09d':'#92d7b8',.7);}
  if(h.wardTime>0){runeCircle(r,h.x,h.y,42,'#acf7ec',.6);runeCircle(r,h.x,h.y,40,'#89cde3',.4);light(r,h.x,h.y,12,'#8be9ee',75,.4);}
  if(h.guard>0)r.decal(()=>r.groundArc(h.x,h.y,9,11,(h.facing||0)-1.1,(h.facing||0)+1.1,'#fff1b2',.9));
  if(h.carry||w.ring?.carrier===h.id){drawRing(r,h.x,h.y,38+Math.sin(time*3)*1.5,.75);runeCircle(r,h.x,h.y,11,GOLD,.6);}
  if(h.down){
    r.textAt(h.x,h.y,18,'+',s,{scale:2});
    if(h.revive>0)runeCircle(r,h.x,h.y,12,'#bff2ae',.95);
  }
}
function drawParticles(r){
  for(const p of particles){const u=(time-p.t)/p.life,rad=4+u*22;
    r.decal(()=>r.groundRing(p.x,p.y,rad,p.c,1-u));
    for(let k=0;k<6;k++){const a=k*Math.PI/3+u*.5,x=p.x+Math.cos(a)*rad*.6,y=p.y+Math.sin(a)*rad*.5,z=8+u*20-k%2*3;
      r.queue(x,y,z,g=>{const q=r.w(x,y,z);px.line(g,q[0]-1,q[1],q[0]+1,q[1],p.c);px.line(g,q[0],q[1]-2,q[0],q[1]+2,p.c);},{emissive:true});
    }
  }
}
function drawRoom(r,w,ui={}){
  if(!map){syncMap(w);if(!map)return;}
  const C=colorOf(familyOf(w));game.lights.enabled=true;game.lights.ambient=familyOf(w)==='inferno'?.7:.69;
  r.sky(['#111726','#202539','#171b29']);map.drawFloor(r);map.queueWalls(r);
  drawConcealed(r,w);drawProps(r,w);drawExit(r,w);drawHazards(r,w);
  if(w.room?.ring&&!w.ring?.carrier&&!w.ring?.secured){const p=w.ring||w.room.ring;const fresh=!w.ring?.picked;if(fresh)r.shape('qPedestal',p.x,p.y,0,{scale:.75});runeCircle(r,p.x,p.y,fresh?15:11,GOLD,.65);drawRing(r,p.x,p.y,(fresh?13:3)+Math.sin(time*2.5)*1.5);}
  for(const station of w.stations||[]){
    const c=station.active?'#ffe8a1':['#d8ab7c','#87e4ec','#ffc087','#b4a7ee'][station.index||0];
    r.shape('qSeal',station.x,station.y,0,{scale:1.2,mats:{s:station.active?'qSeal':'qIron'}});runeCircle(r,station.x,station.y,15,c,station.active?.95:.55);
    if(station.active){light(r,station.x,station.y,8,c,60,.9);drawRing(r,station.x,station.y,5,.7);}
    r.textAt(station.x,station.y,15,String((station.index||0)+1),station.active?'#fff0bf':'#c6c3d5');
  }
  for(const e of w.enemies||[]){
    if(e.hp<=0)continue;
    if(e.kind==='dragon'){drawDragon(r,e,w);continue;}
    if(e.kind==='spider'){drawSpider(r,e);continue;}
    const look=enemyRigs.get(e.id);if(!look)continue;const z=e.kind==='nightmare'?e.z||15:e.z||0;
    shadow(r,e.x,e.y,e.kind==='nightmare'?6:5);
    if(e.wind>0)runeCircle(r,e.x,e.y,e.kind==='echo'&&e.classId==='phantom'?40:e.kind==='fire'?13:11,'#edc18c',.7);
    r.actor(e.x,e.y,z,(g,ox,oy)=>look.draw(g,ox,oy,E.charView(r.view)),{flash:e.stun>0?'#a5f6f6':undefined,flashMix:.42,alpha:e.kind==='echo'?.62:1,outline:e.kind==='echo'?'#ef94bb':undefined,xray:e.kind==='echo'?{color:'#e678a9'}:false});
    if(e.stun>0)r.queue(e.x,e.y,z+31,g=>{const p=r.w(e.x,e.y,z+31);for(let i=0;i<3;i++)px.dot(g,p[0]+Math.sin(time*5+i*2)*5,p[1]+Math.cos(time*5+i*2)*2,'#b7ffff');},{emissive:true});
    if(e.kind==='echo')runeCircle(r,e.x,e.y,9,'#df87b4',.7);
  }
  if(w.mode==='victory'&&!(w.enemies||[]).some(e=>e.kind==='dragon'))drawDragon(r,{x:200,y:56,z:0},w);
  for(const h of w.heroes||[])drawHero(r,w.mode==='victory'?{...h,x:h.id===1?147:253,y:112}:h,w);
  for(const lure of w.lures||[]){
    const hostile=lure.team==='enemy';runeCircle(r,lure.x,lure.y,8,hostile?'#ed9cbd':'#c4edb3',.6);r.queue(lure.x,lure.y,13,g=>{const p=r.w(lure.x,lure.y,13+Math.sin(time*4)*2);px.ell(g,p[0],p[1],4,7,hostile?'#a25c86':'#639d85');px.ell(g,p[0],p[1]-3,3,4,hostile?'#eda6c6':'#b7e8b6');px.dot(g,p[0]-1,p[1]-4,'#fff5c7');},{emissive:true});
  }
  for(const p of w.projectiles||[]){
    const stun=p.kind==='rune'||p.kind==='stun'||p.team==='hero',c=stun?'#9aefe8':'#ffad76';
    r.queue(p.x,p.y,p.z||10,g=>{const a=r.w(p.x,p.y,p.z||10),ang=Math.atan2(p.vy||0,p.vx||1),b=r.w(p.x-Math.cos(ang)*5,p.y-Math.sin(ang)*5,p.z||10);px.line(g,...a,...b,c,2);px.disc(g,a[0],a[1],2,c);px.dot(g,a[0]-1,a[1]-1,'#fff3da');},{emissive:true});
  }
  drawParticles(r);
  // Slow dust and embers are closed-form functions of presentation time and never consume simulation RNG.
  for(let i=0;i<(game.reduceMotion?0:16);i++){
    const x=24+(E.hash2(i,3)*((w.room?.rows?.[0]?.length||25)*16-48)),y=24+E.hash2(i,9)*((w.room?.rows?.length||19)*16-48),z=6+((time*(familyOf(w)==='inferno'?6:1.8)+i*7)%35);
    if(r.visible(x,y,z))r.queue(x,y,z,g=>{const p=r.w(x+Math.sin(time*.2+i)*3,y,z);px.dot(g,p[0],p[1],familyOf(w)==='inferno'?'#b98a67':familyOf(w)==='crystal'?'#80b2c2':'#8d929b');},{emissive:familyOf(w)==='inferno'});
  }
  if(ui.navOverlay||ui.collisionOverlay||ui.debug?.collision||ui.debug?.nav||ui.debug?.telegraphs)drawDebug(r,w,ui);
}
function drawDebug(r,w,ui){
  const rows=w.room?.rows||[],nav=ui.debug?.nav||ui.navOverlay,collision=ui.debug?.collision||ui.collisionOverlay;
  r.decal(g=>{for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){
    if(!nav&&!collision)continue;if(!nav&&rows[y][x]==='.')continue;
    const pts=[r.w(x*16,y*16,.6),r.w((x+1)*16,y*16,.6),r.w((x+1)*16,(y+1)*16,.6),r.w(x*16,(y+1)*16,.6)];
    for(let i=0;i<4;i++)px.line(g,...pts[i],...pts[(i+1)%4],rows[y][x]==='.'?'#529277':'#dd9c9c');
  }
  if(nav&&globalThis.RingSim?.path){
    for(const h of w.heroes||[]){
      const target=w.ring&&!w.ring.carrier?w.ring:w.room.exit;if(!target)continue;
      const path=globalThis.RingSim.path(w,h,target),c=h.id===1?'#ffe2a0':'#93e9eb';let last=r.w(h.x,h.y,1);
      for(const n of path){const q=r.w(n.x,n.y,1);px.line(g,...last,...q,c);px.dot(g,q[0],q[1],c);last=q;}
    }
  }
  if(ui.debug?.telegraphs){for(const h of w.hazards||[]){const p=r.w(h.x+h.w/2,h.y+h.h/2,1);E.font.text(g,h.id+' '+h.phase,p[0],p[1],'#fff2bb',{align:'center',outline:true});}}
  });
}
function drawTitle(r,ui){
  game.lights.enabled=true;game.lights.ambient=.61;
  r.sky(['#141b2e','#22243b','#2f2939']);titleMap.drawFloor(r);titleMap.queueWalls(r);
  // The watching antagonist and treasure form an original native-engine diorama.
  r.shape('qThrone',255,87,0,{scale:1.35,facing:Math.PI/2});
  let antagonist=stationaryRigs.ringmaster;if(!antagonist){antagonist=new E.Humanoid({size:2.1,seed:912,build:'heroic',weapon:null,outfit:'robe',hood:true,sleeves:'long',hat:{style:'crown',color:GOLD},eyeGlow:'#fff2b6',colors:{skin:'#251f36',hair:'#201b30',cloth:'#202035',pants:'#242037',boot:'#171525',trim:GOLD,metal:GOLD},cape:{len:8,width:9,seg:3}});stationaryRigs.ringmaster=antagonist;}
  antagonist.update(0,{x:255,y:92,z:7,facing:Math.PI/2,pose:'cast'});
  r.actor(255,92,7,(g,ox,oy)=>antagonist.draw(g,ox,oy,E.charView(r.view)),{outline:'#111020'});
  r.shape('qPedestal',253,170,0,{scale:1.7});runeCircle(r,253,170,30,GOLD,.45);drawRing(r,253,170,28+Math.sin(time*1.8)*2,2);
  const classes=ui.heroClasses||['warrior','wizard'];
  for(let i=0;i<2;i++){
    const k=classes[i]||'warrior',rig=stationaryRigs[k],x=204+i*97,y=224+i*5;
    shadow(r,x,y,9);r.actor(x,y,0,(g,ox,oy)=>rig.draw(g,ox,oy,E.charView(r.view)),{xray:true,outline:i?'#8be3ee':'#ffe3a0'});light(r,x,y,15,i?'#8cd5ee':'#ffd392',70,.65);
  }
  for(const [x,y]of[[170,108],[329,108],[165,233],[341,233]])r.prop('brazier',x,y,0,{size:1.15,light:true});
  for(const [x,y]of[[187,45],[323,45],[187,287],[323,287]])r.prop('pillar',x,y,0,{size:1.2,color:'#6b637f'});
  for(let i=0;i<(game.reduceMotion?0:15);i++){const x=160+E.hash2(i,1)*185,y=65+E.hash2(i,5)*170,z=15+((time*4+i*4)%50);r.queue(x,y,z,g=>{const p=r.w(x,y,z);px.dot(g,p[0],p[1],i%2?'#b99b71':'#8b819d');},{emissive:true});}
}
function drawSelect(r,ui){
  game.lights.enabled=true;game.lights.ambient=.65;r.sky(['#131c2d','#252941','#191c2e']);titleMap.drawFloor(r);titleMap.queueWalls(r);
  const ids=['warrior','wizard','phantom','changeling'];
  for(let i=0;i<4;i++){const x=104+i*64,y=140,rig=stationaryRigs[ids[i]],c=HERO_PALETTES[ids[i]].trim;
    shadow(r,x,y,11);runeCircle(r,x,y,17,c,.5);r.shape('qSeal',x,y,0,{scale:1.6});
    r.actor(x,y,0,(g,ox,oy)=>rig.draw(g,ox,oy,E.charView(r.view)),{outline:c,xray:true});light(r,x,y,20,c,58,.55);
    r.prop('brazier',x,168,0,{size:.85,light:true});
  }
}
const BOARD_NODES=[{id:'dungeon',x:115,y:166,f:0},{id:'crystal',x:185,y:104,f:1},{id:'inferno',x:267,y:159,f:2},{id:'shifting',x:200,y:217,f:3},{id:'final',x:290,y:79,f:4},{id:'cacheCrystal',x:104,y:96,f:1},{id:'cacheShift',x:296,y:224,f:3}];
function drawBoard(r,w,ui){
  game.lights.enabled=true;game.lights.ambient=.76;r.sky(['#121923','#242137','#151922']);boardMap.drawFloor(r);
  r.shape('qTable',200,158,-9,{shadow:false,facing:Math.PI/2,bias:-10000,hides:false});
  r.queue(200,158,2,g=>{
    const edges=[[0,1],[0,2],[0,3],[1,2],[2,3],[1,4],[2,4],[3,4],[1,5],[3,6]],rings=w?.rings||[];
    for(const [a,b] of edges){const A=BOARD_NODES[a],B=BOARD_NODES[b],p=r.w(A.x,A.y,2),q=r.w(B.x,B.y,2);const enabled=a===0||b===0||rings[0];px.line(g,...p,...q,enabled?'#695f4a':'#6b5e4f',2);px.line(g,p[0],p[1]-1,q[0],q[1]-1,enabled?'#d4bd83':'#806f56',1);}
    for(let i=0;i<4;i++)if(rings[i]){const a=BOARD_NODES[i],b=BOARD_NODES[(i+2)%4],p=r.w(a.x,a.y,2),q=r.w(b.x,b.y,2);px.line(g,...p,...q,'#f8dc91',2);}
    // Inked mountain contours and the Ringmaster's distant grasp are native pixels.
    for(let i=0;i<14;i++){const x=82+E.hash2(i,4)*230,y=80+E.hash2(i,8)*155;if(BOARD_NODES.some(n=>Math.hypot(n.x-x,n.y-y)<22))continue;const p=r.w(x,y,2);px.poly(g,[[p[0]-5,p[1]+2],[p[0],p[1]-6],[p[0]+5,p[1]+2]],'#81765d');px.line(g,p[0],p[1]-6,p[0]+2,p[1]-2,'#bcad7f');}
  },{bias:-9999});
  // A five-fingered obsidian shadow reaches over the route table.
  r.queue(200,90,2,g=>{
    const P=(x,y)=>r.w(x,y,2),palm=[P(178,48),P(214,47),P(222,82),P(211,98),P(181,91),P(171,72)];px.polyDither(g,palm,'#171827',.62,r.ix,r.iy);
    const fingers=[[[179,73],[163,96],[159,115]],[[187,84],[184,112],[178,127]],[[196,87],[199,119],[196,135]],[[207,85],[217,109],[218,125]],[[214,74],[235,90],[243,104]]];
    for(const line of fingers){for(let i=1;i<line.length;i++){const a=P(...line[i-1]),b=P(...line[i]);px.line(g,...a,...b,'#34313d',8);px.line(g,...a,...b,'#1f202e',5);}}
    const ring=P(198,105);px.ell(g,ring[0],ring[1],5,2,GOLD);
  },{bias:-9998});
  r.shape('qHourglass',86,195,3,{scale:1.1,facing:Math.PI/2});
  r.queue(86,200,3,g=>{const p=r.w(86,200,3);E.font.text(g,'DREAD '+(w?.dread||0)+'/6',p[0],p[1]+8,'#f4dfa3',{align:'center',outline:true});for(let i=0;i<6;i++)px.rect(g,p[0]-13+i*5,p[1]+18,3,2,i<(w?.dread||0)?'#f6c876':'#61584b');},{bias:999});
  for(let i=0;i<BOARD_NODES.length;i++){
    const n=BOARD_NODES[i],done=i<4&&w?.rings?.[i],available=i===0||w?.rings?.[0],selected=ui.destination===n.id||ui.focusedSite===n.id;
    if(i<4){r.shape('qCastle',n.x,n.y,3,{scale:i===0?1:.88,facing:Math.PI/2,params:{family:n.f},mats:done?{g:'qSeal'}:undefined});if(done)drawRing(r,n.x,n.y,28,.65);}
    else if(i===4){r.shape('qThrone',n.x,n.y,2,{scale:.6,facing:Math.PI/2});runeCircle(r,n.x,n.y,18,GOLD,.4);}
    else r.shape('chest',n.x,n.y,3,{scale:.7,mats:{w:'qTable',b:'qIron',l:'qGold'}});
    if(selected)runeCircle(r,n.x,n.y,22,'#fff0bf',.9,3);
    if(available||done)light(r,n.x,n.y,12,done?'#ffdc89':['#e9b16c','#7cd7e1','#e8936e','#aaa0de'][n.f%4],45,.45);
  }
  for(let i=0;i<4;i++){
    const x=165+i*24,y=255; r.shape('qSeal',x,y,3,{scale:.7,mats:{s:w?.rings?.[i]?'qSeal':'qObsidian'}});
  }
  r.prop('candelabra',70,158,1,{size:1,light:true});r.prop('candelabra',332,160,1,{size:1,light:true});
}
function draw(r,w,uiState={}){
  if(!game)return;if(uiState.remote&&w===worldRef&&displayWorld)w=displayWorld;
  const screen=uiState.screen||'';
  if(screen==='select')return drawSelect(r,uiState);
  if(screen==='title'||!w)return drawTitle(r,uiState);
  if(w.mode==='board'||screen==='board')return drawBoard(r,w,uiState);
  drawRoom(r,w,uiState);
}
function screenToWorld(clientX,clientY){if(!game)return[0,0];const p=game.screen.clientToScreen(clientX,clientY);return p?game.view.toGround(p[0],p[1]):[0,0];}
function dispose(){rigs.clear();enemyRigs.clear();particles=[];roomKey='';lastEpoch=-1;map=null;worldRef=null;displayWorld=null;smoothCache.clear();smoothEpoch=-1;}
const RingView=globalThis.RingView={init,update,draw,render:draw,screenToWorld,makeHero,dispose,palettes:HERO_PALETTES,families:FAMILIES,boardNodes:BOARD_NODES,get map(){return map;},get rigs(){return rigs;},get time(){return time;}};
})();
