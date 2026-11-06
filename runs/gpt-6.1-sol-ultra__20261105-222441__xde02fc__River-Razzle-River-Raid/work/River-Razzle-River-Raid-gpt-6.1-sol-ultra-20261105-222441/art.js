import * as THREE from 'three/webgpu';

const INK = 0x102d35;
const C = { ink:INK, cream:0xffe8af, red:0xf76b53, yellow:0xffc658, teal:0x198d94, green:0x3e8d65, darkgreen:0x246449, sand:0xd9b96f, land:0x80a06a, steel:0x54747a };
const ramp = new THREE.DataTexture(new Uint8Array([70,70,70,255,145,145,145,255,218,218,218,255,255,255,255,255]),4,1,THREE.RGBAFormat);
ramp.needsUpdate=true;ramp.minFilter=THREE.NearestFilter;ramp.magFilter=THREE.NearestFilter;
const outlineMaterial = new THREE.MeshBasicMaterial({color:INK,side:THREE.BackSide});
const mats = new Map();
function mat(color){if(!mats.has(color))mats.set(color,new THREE.MeshToonMaterial({color,gradientMap:ramp}));return mats.get(color);}
function flat(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1});}
function inkMesh(geometry,color,ink=true){
 const m=new THREE.Mesh(geometry,typeof color==='number'?mat(color):color);m.castShadow=true;m.receiveShadow=true;
 if(ink){const line=new THREE.Mesh(geometry,outlineMaterial);line.scale.setScalar(1.055);line.name='ink';m.add(line);}
 return m;
}
function box(parent,color,x,y,z,sx,sy,sz,ink=true){const m=inkMesh(new THREE.BoxGeometry(sx,sy,sz),color,ink);m.position.set(x,y,z);parent.add(m);return m;}
function cylinder(parent,color,x,y,z,r,h,segments=8,ink=true){const m=inkMesh(new THREE.CylinderGeometry(r,r,h,segments),color,ink);m.position.set(x,y,z);parent.add(m);return m;}
function prism(points,height,color){
 const sh=new THREE.Shape();points.forEach(([x,z],i)=>i?sh.lineTo(x,-z):sh.moveTo(x,-z));sh.closePath();
 const geo=new THREE.ExtrudeGeometry(sh,{depth:height,bevelEnabled:false});geo.rotateX(-Math.PI/2);geo.translate(0,-height/2,0);return inkMesh(geo,color);
}
function line(parent,points,color=INK){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(geo,new THREE.LineBasicMaterial({color}));parent.add(l);return l;}
function mixer(group,tracks,duration){const m=new THREE.AnimationMixer(group);m.clipAction(new THREE.AnimationClip('life',duration,tracks)).play();group.userData.mixer=m;return m;}
function shadow(parent,rx,rz,y=-.85){const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,24),flat(INK,.18));mesh.rotation.x=-Math.PI/2;mesh.scale.set(rx,rz,1);mesh.position.y=y;parent.add(mesh);return mesh;}
function star(parent,x,y,z,r,color=C.cream){const pts=[];for(let i=0;i<10;i++){const a=i*Math.PI/5;pts.push([Math.sin(a)*r*(i%2?.45:1),Math.cos(a)*r*(i%2?.45:1)]);}const s=new THREE.Shape();pts.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));const me=new THREE.Mesh(new THREE.ShapeGeometry(s),flat(color));me.rotation.x=-Math.PI/2;me.position.set(x,y,z);parent.add(me);}


let fuelLabelMaterial;
function fuelStencil(){
 if(fuelLabelMaterial)return fuelLabelMaterial;
 if(typeof document==='undefined')return flat(C.cream);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
 const ctx=canvas.getContext('2d');if(!ctx)return flat(C.cream);
 ctx.fillStyle='#ffe8af';ctx.fillRect(0,0,512,192);
 ctx.strokeStyle='#102d35';ctx.lineWidth=14;ctx.strokeRect(7,7,498,178);
 ctx.fillStyle='#102d35';ctx.font='900 132px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('FUEL',256,101);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 fuelLabelMaterial=new THREE.MeshBasicMaterial({map:texture});return fuelLabelMaterial;
}

export function createJet(color=C.yellow){
 const g=new THREE.Group();g.name='razzleJet';
 const wing=prism([[0,-1.65],[.3,-.75],[1.6,.48],[1.6,.8],[.35,.42],[.25,1.36],[.75,1.62],[.75,1.84],[-.75,1.84],[-.75,1.62],[-.25,1.36],[-.35,.42],[-1.6,.8],[-1.6,.48],[-.3,-.75]],.13,color);g.add(wing);
 const fuselage=inkMesh(new THREE.ConeGeometry(.35,3.6,6),C.cream);fuselage.rotation.x=-Math.PI/2;fuselage.position.y=.16;g.add(fuselage);
 const body=box(g,color,0,.14,.7,.48,.38,1.45);body.rotation.x=.04;
 const canopy=inkMesh(new THREE.SphereGeometry(.34,8,5),0x315e6c);canopy.scale.set(.7,.68,1.8);canopy.position.set(0,.43,-.35);g.add(canopy);
 box(g,C.cream,-.1,.59,-.55,.09,.015,.28,false);
 const fin=prism([[0,.55],[.06,1.45],[-.06,1.45]],.6,color);fin.rotation.z=Math.PI/2;fin.position.set(0,.4,.6);g.add(fin);
 box(g,C.red,-1.21,.09,.55,.18,.055,.36);box(g,C.red,1.21,.09,.55,.18,.055,.36);
 box(g,INK,0,.03,1.66,.29,.28,.3);
 const flame=inkMesh(new THREE.ConeGeometry(.19,1.35,5),flat(0xffa13b),false);flame.rotation.x=Math.PI/2;flame.position.set(0,.03,2.35);flame.name='exhaust';g.add(flame);
 const inner=inkMesh(new THREE.ConeGeometry(.1,.8,5),flat(0xfff4c7),false);inner.rotation.x=Math.PI/2;inner.position.set(0,.05,2.05);g.add(inner);
 star(g,-.91,.11,.49,.24);star(g,.91,.11,.49,.24);
 shadow(g,1.4,1.7);
 mixer(g,[new THREE.VectorKeyframeTrack('exhaust.scale',[0,.09,.18,.3],[1,1,1,.7,1.3,.7,1.1,.7,1.1,1,1,1])],.3);
 return g;
}

export function createEnemy(type,options={}){
 if(type==='jet'){const g=createJet(C.red);g.scale.setScalar(.92);return g;}
 const g=new THREE.Group();g.name=type;
 if(type==='boat'){
  const hull=prism([[0,-2.05],[.85,-1.15],[.85,1.5],[.65,1.85],[-.65,1.85],[-.85,1.5],[-.85,-1.15]],.6,C.red);g.add(hull);
  box(g,C.sand,0,.36,.1,1.42,.1,2.65);box(g,C.cream,0,.78,.35,.92,.75,1.3);
  box(g,0x315e6c,0,.85,-.32,.78,.32,.06);box(g,C.red,0,1.21,.38,1.1,.1,1.5);
  cylinder(g,INK,.28,1.45,.6,.12,.65,6);cylinder(g,C.cream,-.32,1.8,.8,.035,1.4,5);
  const flag=box(g,C.yellow,-.05,2.3,.8,.5,.3,.03,false);flag.rotation.z=.12;
  cylinder(g,C.steel,0,.58,-1.1,.3,.26,8);box(g,INK,0,.74,-1.5,.12,.12,.78);
  for(const x of [-1,1]){line(g,[[x*.57,.44,-1.4],[x*.67,.44,1.4]],C.cream);}
  shadow(g,1.1,2.2,-.55);
  mixer(g,[new THREE.NumberKeyframeTrack('.rotation[z]',[0,1.4,2.8],[-.035,.035,-.035])],2.8);
 }else if(type==='heli'){
  const body=inkMesh(new THREE.SphereGeometry(.7,8,6),C.red);body.scale.set(.8,.65,1.4);body.position.y=.3;g.add(body);
  const cab=inkMesh(new THREE.SphereGeometry(.52,8,5),0x284f5c);cab.scale.set(.85,.7,1);cab.position.set(0,.4,-.65);g.add(cab);
  const tail=inkMesh(new THREE.ConeGeometry(.25,2,5),C.cream);tail.rotation.x=Math.PI/2;tail.position.set(0,.37,1.2);g.add(tail);
  box(g,C.red,0,.65,2,.11,.8,.5);box(g,C.cream,0,.45,1.75,1,.09,.32);
  cylinder(g,INK,0,1,0,.09,.7,6);
  const rotor=new THREE.Group();rotor.name='rotor';rotor.position.y=1.35;g.add(rotor);
  box(rotor,INK,0,0,0,4.6,.06,.16);box(rotor,C.cream,0,.018,0,.16,.035,4.6);
  for(const x of [-.67,.67]){box(g,INK,x,-.45,.1,.1,.1,2.1);box(g,C.steel,x,-.22,-.45,.08,.5,.08);box(g,C.steel,x,-.22,.6,.08,.5,.08);}
  shadow(g,1.5,1.2,-1);
  mixer(g,[new THREE.NumberKeyframeTrack('rotor.rotation[y]',[0,2.2],[0,Math.PI*20]),new THREE.NumberKeyframeTrack('.position[y]',[0,1.1,2.2],[0,.13,0])],2.2);
 }else if(type==='fuel'){
  const mint=0x80d7a7;
  box(g,INK,0,-.15,0,3.8,.2,5.6);box(g,mint,0,0,0,3.55,.18,5.4);
  for(const x of [-1.48,1.48])for(const z of [-2.2,-1.1,0,1.1,2.2]){const b=box(g,C.cream,x,.14,z,.25,.07,.5,false);b.rotation.y=.3;}
  box(g,C.green,0,.26,.65,2.1,.4,3.1);cylinder(g,mint,0,.73,.75,.87,.75,12);cylinder(g,C.cream,0,1.14,.75,.88,.13,12);
  cylinder(g,C.red,.48,1.29,1.15,.17,.18,8);
  // A cream tank stencil and a separate pump make the station legible as fuel.
  box(g,INK,0,1.25,.55,2.72,.09,1.12,false);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(2.64,1.04),fuelStencil());label.rotation.x=-Math.PI/2;label.position.set(0,1.305,.55);label.name='fuelStencil';g.add(label);
  box(g,C.cream,-.8,.7,-1.65,.72,1.13,.8);box(g,C.red,-.8,1.3,-1.65,.83,.15,.87);
  box(g,INK,-.8,.95,-2.06,.5,.35,.04,false);box(g,mint,-.8,.96,-2.09,.34,.15,.025,false);
  const hoseCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.4,1.05,-1.6),new THREE.Vector3(.1,.8,-1.65),new THREE.Vector3(.9,.36,-1.4),new THREE.Vector3(1.22,.5,-.85),new THREE.Vector3(.87,.97,-.62)]);
  const hose=inkMesh(new THREE.TubeGeometry(hoseCurve,20,.085,6,false),INK,false);hose.name='fuelHose';g.add(hose);
  const nozzle=box(g,C.red,.84,1.04,-.54,.16,.18,.47);nozzle.rotation.y=-.5;
  const spout=box(g,C.steel,.72,1.12,-.29,.1,.1,.28);spout.rotation.y=-.5;
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.9,2.02,40),flat(0xbaf4c6,.7));ring.rotation.x=-Math.PI/2;ring.position.y=.12;ring.name='refuelGlow';g.add(ring);
  mixer(g,[new THREE.VectorKeyframeTrack('refuelGlow.scale',[0,1,2],[1,1,1,1.16,1.16,1.16,1,1,1])],2);
 }else if(type==='turret'){
  box(g,C.sand,0,-.15,0,1.8,.4,1.8);cylinder(g,C.steel,0,.3,0,.7,.7,8);cylinder(g,C.red,0,.7,0,.48,.3,8);box(g,INK,0,.8,-.8,.2,.2,1.55);
 }else if(type==='bridge'){
  const w=options.width||28;
  box(g,INK,0,-.05,0,w+5,.5,3.1);box(g,C.sand,0,.27,0,w+5,.14,2.8);
  box(g,0x61716a,0,.39,0,w+4,.07,1.7);
  for(let x=-w/2-1;x<w/2+1;x+=2)box(g,C.cream,x,.45,0,1.1,.03,.08,false);
  for(const z of [-1.3,1.3]){
   box(g,C.red,0,1.1,z,w+5,.19,.16);
   for(let x=-w/2-1;x<=w/2+1;x+=2){box(g,C.cream,x,.78,z,.12,.9,.15);const b=box(g,C.red,x+1,.8,z,2.1,.13,.13);b.rotation.z=.3;}
  }
  for(const x of [-w/2+.5,0,w/2-.5]){box(g,C.steel,x,-.5,0,.9,1.6,2.6);box(g,C.cream,x,1.7,0,.45,2.7,.5);box(g,C.red,x,3.1,0,.8,.3,.85);}
  // Destructible yellow center span is the clear forward-fire target.
  box(g,C.yellow,0,.65,0,4.2,.5,2.1);star(g,0,.93,0,.7,INK);
 }else if(type==='boss'){
  const hull=prism([[0,-5],[3.3,-3.5],[3.6,3],[2.5,4.6],[-2.5,4.6],[-3.6,3],[-3.3,-3.5]],1.25,0x486a70);g.add(hull);
  box(g,C.red,0,.73,0,6.1,.25,6.6);box(g,C.sand,0,1.1,1,3.8,.55,3.6);box(g,C.cream,0,1.9,1.2,2.7,1.2,2.4);
  box(g,0x254856,0,2.05,-.05,2.5,.45,.12);box(g,C.red,0,2.57,1.2,3.2,.18,2.8);
  for(const x of [-2.2,2.2])for(const z of [-2.6,2.5]){cylinder(g,INK,x,1.05,z,.65,.7,8);cylinder(g,C.yellow,x,1.47,z,.47,.35,8);box(g,INK,x,1.55,z-.65,.2,.2,1.8);}
  for(const x of [-.7,.7]){cylinder(g,C.cream,x,3,1.5,.24,1.1,8);cylinder(g,INK,x,3.6,1.5,.25,.15,8);}
  cylinder(g,C.cream,0,3.6,2.3,.06,2.8,6);
  const dish=inkMesh(new THREE.SphereGeometry(.7,8,4,0,Math.PI*2,0,Math.PI/2),C.yellow);dish.rotation.x=Math.PI/3;dish.position.set(0,4.6,2.3);dish.name='radar';g.add(dish);
  star(g,0,1,-2.7,1.1,C.cream);shadow(g,3.8,5,-.85);
  mixer(g,[new THREE.NumberKeyframeTrack('radar.rotation[y]',[0,4],[0,Math.PI*2])],4);
 }
 return g;
}

export function createTree(seed=0){
 const g=new THREE.Group();const h=1.6+(Math.sin(seed*9.1)+1)*.65;
 cylinder(g,0x6e5d42,0,h*.22,0,.13,h*.44,5);
 for(let i=0;i<3;i++){const m=inkMesh(new THREE.ConeGeometry((.87-i*.19)*(h/2),h*.58,5),[0x397b55,0x529265,0x72a578][i]);m.position.y=h*(.42+i*.2);m.rotation.y=seed;g.add(m);}
 return g;
}
export function createRock(seed=0){const g=new THREE.Group();const m=inkMesh(new THREE.DodecahedronGeometry(.55+(Math.sin(seed)+1)*.3,0),0x9f9e7e);m.scale.set(1.3,.8,1);m.rotation.set(seed,seed*.3,seed*.7);g.add(m);return g;}
export function createBuilding(seed=0){
 const g=new THREE.Group();box(g,C.cream,0,.6,0,2.1,1.2,2.7);
 const roof=inkMesh(new THREE.ConeGeometry(1.8,.9,4),C.red);roof.rotation.y=Math.PI/4;roof.scale.z=1.2;roof.position.y=1.6;g.add(roof);
 box(g,0x315e6c,0,.57,-1.36,.55,.8,.05);for(const x of [-.7,.7])box(g,C.yellow,x,.75,-1.36,.35,.35,.05,false);
 box(g,C.sand,1.15,.15,0,.2,.3,2.9);return g;
}

function bandMesh(rows,color){const p=new Float32Array(rows*2*3),idx=[];for(let i=0;i<rows-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,mat(color));mesh.receiveShadow=true;return mesh;}
function updateBand(mesh,values){const a=mesh.geometry.attributes.position.array;for(let i=0;i<values.length;i++){a[i*6]=values[i][0];a[i*6+1]=values[i][2];a[i*6+2]=values[i][3];a[i*6+3]=values[i][1];a[i*6+4]=values[i][2];a[i*6+5]=values[i][3];}mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}
const rand=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453123;return v-Math.floor(v);};
export function createRiverScene(scene,courseFn){
 const group=new THREE.Group();group.name='riverIllustration';scene.add(group);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(190,280),mat(0x218d96));water.rotation.x=-Math.PI/2;water.position.set(0,-.25,-50);water.receiveShadow=true;group.add(water);
 const rows=112, bands=[];
 for(const side of [-1,1]){
  const entries=[['rim',INK],['sand',0xe4ca83],['slope',0x718e5e],['land',0x8da773]];
  for(const [kind,color]of entries){const mesh=bandMesh(rows,color);group.add(mesh);bands.push({side,kind,mesh});}
 }
 const islands=[];for(let j=0;j<2;j++){const mesh=bandMesh(rows,j?0x8da773:INK);group.add(mesh);islands.push(mesh);}
 const scenery=[];
 // Scenery keeps a stable deterministic identity along the course, scrolling with it.
 for(let i=0;i<138;i++){
  const seed=i*17.13;const type=i%17===0?'house':i%5===0?'rock':'tree';
  const object=type==='house'?createBuilding(seed):type==='rock'?createRock(seed):createTree(seed);const side=i%2?-1:1;const offset=3+rand(seed)*24;
  const scale=type==='house'?1.1:.7+rand(seed+3)*1.25;object.scale.setScalar(scale);object.rotation.y=rand(seed+2)*Math.PI*2;group.add(object);scenery.push({object,index:i,side,offset,seed});
 }
 // Angular ridgelines far beyond the shores make a miniature landscape, not a flat playfield.
 for(let i=0;i<22;i++){
  const m=inkMesh(new THREE.ConeGeometry(6+rand(i+6)*5,5+rand(i+9)*8,5),i%2?0x638769:0x6d8b65);m.position.set((i%2?-1:1)*(42+rand(i+1)*30),1,-148+i*10);m.rotation.y=i;group.add(m);
 }
 const flow=[];
 const flowmat=flat(0x85c7ba,.4);
 for(let i=0;i<95;i++){
  const z=-160+rand(i+51)*220;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.06+rand(i)*.06,1.3+rand(i+7)*3),flowmat);mesh.rotation.x=-Math.PI/2;mesh.position.y=-.205;group.add(mesh);flow.push({mesh,seed:i+40,z});
 }
 const foam=[];
 for(let i=0;i<65;i++){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.14,1.5+rand(i+60)*2),flat(0xffe5a0,.65));mesh.rotation.x=-Math.PI/2;mesh.position.y=-.18;group.add(mesh);foam.push({mesh,seed:i,side:i%2?-1:1});
 }
 let lastDistance=-Infinity,t=0;
 function update(distance,dt=0){
  t+=dt;
  if(Math.abs(distance-lastDistance)>.22){
   lastDistance=distance;
   for(const {side,kind,mesh}of bands){const vals=[];for(let i=0;i<rows;i++){
    const z=60-i*2;const c=courseFn(Math.max(0,distance-z));const e=c.center+side*c.width/2;let a,b,y;
    if(kind==='rim'){a=e-side*.12;b=e+side*.22;y=.015;}
    if(kind==='sand'){a=e+side*.1;b=e+side*1.0;y=.025;}
    if(kind==='slope'){a=e+side*.95;b=e+side*1.7;y=.12;}
    if(kind==='land'){a=e+side*1.65;b=side*98;y=.24;}
    vals.push([side<0?b:a,side<0?a:b,y,z]);
   }updateBand(mesh,vals);}
   islands.forEach((mesh,j)=>{const vals=[];for(let i=0;i<rows;i++){const z=60-i*2;const c=courseFn(Math.max(0,distance-z));const island=c.island;const w=island?.width||0;const x=island?.center||c.center;const inset=j&&w>.5?.22:0;vals.push([x-w/2+inset,x+w/2-inset,j?.2:.02,z]);}updateBand(mesh,vals);});
   for(const item of scenery){const spacing=220/69;const chunk=Math.floor((distance-40)/220);let s=chunk*220+Math.floor(item.index/2)*spacing;while(s<distance-60)s+=220;const z=distance-s;const c=courseFn(Math.max(0,s));item.object.position.set(c.center+item.side*(c.width/2+item.offset),.3,z);}
  }
  flow.forEach(({mesh,seed,z})=>{const zz=((z+distance*.7+190)%220)-160;const c=courseFn(Math.max(0,distance-zz));mesh.position.x=c.center+(rand(seed)-.5)*(c.width-1);mesh.position.z=zz;mesh.rotation.z=Math.sin(t*.3+seed)*.04;const isl=c.island;mesh.visible=!(isl&&Math.abs(mesh.position.x-isl.center)<isl.width/2+.3);});
  foam.forEach(({mesh,seed,side})=>{const z=((seed*3.4+distance*.35+190)%220)-160;const c=courseFn(Math.max(0,distance-z));mesh.position.x=c.center+side*(c.width/2-.24);mesh.position.z=z;mesh.rotation.z=Math.sin(seed)*.1;});
 }
 update(0);
 return{group,update,dispose(){scene.remove(group);group.traverse(o=>{if(o.geometry)o.geometry.dispose();});}};
}
