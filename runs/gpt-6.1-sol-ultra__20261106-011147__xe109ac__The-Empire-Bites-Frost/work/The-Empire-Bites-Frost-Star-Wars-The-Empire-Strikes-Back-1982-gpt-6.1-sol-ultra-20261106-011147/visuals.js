import * as THREE from 'three/webgpu';
import { normalWorld, vec3, color, positionLocal, mix } from 'three/tsl';

const INK = 0x172b3b;
const inkMaterial = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.82 });
const materials = new Map();
function cel(hex) {
  if (materials.has(hex)) return materials.get(hex);
  const m = new THREE.MeshBasicNodeMaterial({ color: hex });
  const shade = normalWorld.dot(vec3(-0.38, 0.82, 0.43)).max(0).mul(3).floor().div(3).mul(0.5).add(0.5);
  m.colorNode = color(hex).mul(shade);
  materials.set(hex, m);
  return m;
}
function mesh(geometry, hex, outline = true) {
  const m = new THREE.Mesh(geometry, cel(hex));
  m.castShadow = true; m.receiveShadow = true;
  if (outline) {
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 28), inkMaterial);
    m.add(lines);
  }
  return m;
}
function box(parent, size, pos, hex, outline = true) {
  const m = mesh(new THREE.BoxGeometry(...size), hex, outline);
  m.position.set(...pos); parent.add(m); return m;
}
function cylinder(parent, radius, height, pos, hex, segments = 10, outline = true) {
  const m = mesh(new THREE.CylinderGeometry(radius, radius, height, segments), hex, outline);
  m.position.set(...pos); parent.add(m); return m;
}
function disc(parent, r, pos, hex, opacity = 1) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  m.position.set(...pos); parent.add(m); return m;
}
function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function mountain(x, width, height, z, tint, rng) {
  const group = new THREE.Group(); group.position.set(x, -3, z);
  const peak = [width * (rng() - .5) * .2, height, 0];
  const ring = [[-width*.58,0,0],[-width*.16,0,width*.25],[width*.58,0,0],[width*.16,0,-width*.25]];
  const v=[], cols=[], k=.3+rng()*.1;
  const baseColor = new THREE.Color(tint), snow = new THREE.Color(0xdcece2);
  for (let i=0; i<4; i++) {
    const a=ring[i], b=ring[(i+1)%4];
    const sa=a.map((p,j)=>peak[j]+(p-peak[j])*k), sb=b.map((p,j)=>peak[j]+(p-peak[j])*k);
    v.push(...peak,...sa,...sb);
    const snowSide=snow.clone().multiplyScalar(i===0?.88:1);
    for(let j=0;j<3;j++) cols.push(...snowSide.toArray());
    v.push(...sa,...a,...b,...sa,...b,...sb);
    const side=baseColor.clone().multiplyScalar(i===0?.83:i===1?1:.92);
    for(let j=0;j<6;j++) cols.push(...side.toArray());
  }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geo.computeVertexNormals();
  const mat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}); const m=new THREE.Mesh(geo,mat);group.add(m);
  return group;
}

export function createEnvironment(scene) {
  const rng=seeded(1982), group=new THREE.Group(); group.name='Frostline'; scene.add(group);
  scene.background=new THREE.Color(0x1b3448);
  const skyMat=new THREE.MeshBasicNodeMaterial({side:THREE.DoubleSide,depthWrite:false});
  skyMat.colorNode=mix(color(0x8dbdc5),color(0x15283e),positionLocal.y.add(230).div(70).clamp(0,1));
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(1800,650),skyMat);sky.position.set(0,190,-210);group.add(sky);
  // The cold setting sun and its thin atmospheric halo.
  disc(group,10,[30,16,-185],0xe6dbb3);
  disc(group,12,[30,16,-186],0xc2d8c4,.2);
  const ring=new THREE.Mesh(new THREE.RingGeometry(13.4,13.55,96),new THREE.MeshBasicMaterial({color:0xd7e9d8,transparent:true,opacity:.35}));ring.position.set(30,16,-184);group.add(ring);
  const starPositions=[];
  for(let i=0;i<120;i++) starPositions.push((rng()-.5)*800,42+rng()*155,-200+rng()*8);
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xe5f5df,size:.35,sizeAttenuation:true,transparent:true,opacity:.65}));group.add(stars);
  for(let layer=0;layer<3;layer++) for(let i=0;i<15;i++) {
    group.add(mountain(-390+i*56+(rng()-.5)*30,64+rng()*65,[17,11,6][layer]+rng()*[17,15,11][layer],-160+layer*43,[0x9abbc4,0x7da3ae,0x5d8995][layer],rng));
  }
  // Broad glacial field with blue faceted relief and a dark ink cut along the horizon.
  const floor=mesh(new THREE.BoxGeometry(1800,4,1000),0xd5e8df,false);floor.position.set(0,-2.2,-28);group.add(floor);
  const backRidge=mesh(new THREE.BoxGeometry(900,1.5,9),0x79a3ad,false);backRidge.position.set(0,.6,-34);group.add(backRidge);
  for(let i=0;i<80;i++) {
    const x=(rng()-.5)*650,z=-18-rng()*65;
    const drift=mesh(new THREE.SphereGeometry(4+rng()*13,8,4,0,Math.PI*2,0,Math.PI/2),i%3?0xc3ddd7:0xe8f3e8,false);
    drift.position.set(x,0,z);drift.scale.set(1,.08+rng()*.11,.6);group.add(drift);
  }
  for(let i=0;i<42;i++) {
    const x=(rng()-.5)*600,z=8+rng()*55;
    const shard=mesh(new THREE.ConeGeometry(1+rng()*2,1+rng()*4,3),i%2?0x8cb9be:0xb9d8d1,true);
    shard.position.set(x,.5,z);shard.rotation.z=(rng()-.5)*.7;group.add(shard);
  }
  // Striations in the ice make speed legible even when no enemies are nearby.
  const iceLines=[];
  for(let i=0;i<110;i++) {
    const x=(rng()-.5)*700,z=(rng()-.5)*110;
    iceLines.push(x,.08,z,x+2+rng()*13,.08,z+.3);
  }
  const lgeo=new THREE.BufferGeometry();lgeo.setAttribute('position',new THREE.Float32BufferAttribute(iceLines,3));group.add(new THREE.LineSegments(lgeo,new THREE.LineBasicMaterial({color:0x91b8ba,transparent:true,opacity:.45})));
  // Rebel shield generator, a row of ribbed ion drums and buried hangars.
  const base=new THREE.Group();base.position.set(-100,0,0);base.name='ShieldGenerator';group.add(base);
  box(base,[20,1.2,12],[0,.6,0],0x8da8ac);
  for(let i=0;i<4;i++) {
    const drum=cylinder(base,3.1,4.2,[-7+i*4.6,4,0],0xcbd6ca,12);drum.rotation.x=Math.PI/2;
    const inset=cylinder(base,2.3,4.35,[-7+i*4.6,4,0],0x718b91,12);inset.rotation.x=Math.PI/2;
    for(let r=0;r<3;r++) {
      const rib=new THREE.Mesh(new THREE.TorusGeometry(3.15,.19,4,12),cel(0xd8e6d6));rib.position.set(-7+i*4.6,4,-1.4+r*1.4);base.add(rib);
    }
  }
  box(base,[1.1,11,1.1],[10,6,-3],0x587a87);
  const dish=mesh(new THREE.ConeGeometry(3,1.5,10,1,true),0xd8e8d8);dish.position.set(10,12,-3);dish.rotation.z=.6;base.add(dish);
  const beacon=disc(base,.45,[10,12,0],0x96ffbc);beacon.name='GeneratorBeacon';
  const hangar=mesh(new THREE.SphereGeometry(9,12,6,0,Math.PI*2,0,Math.PI/2),0xbfd6d0);hangar.position.set(-17,0,-9);hangar.scale.z=.7;base.add(hangar);
  box(base,[8,4,.3],[-17,2,-2.6],0x254252);
  for(let i=0;i<4;i++)box(base,[.15,3.9,.4],[-20+i*2,2,-2.35],0x7ca4a5);
  // Landing pad: strong warm color, edge lights, beacon pole.
  const repairPad=new THREE.Group();repairPad.name='RepairPad';repairPad.position.set(-77,.2,3);group.add(repairPad);
  const pad=cylinder(repairPad,7,.35,[0,0,0],0x446e7c,12);
  const padRing=new THREE.Mesh(new THREE.RingGeometry(5.9,6.2,48),new THREE.MeshBasicMaterial({color:0xf0b06a,side:THREE.DoubleSide}));padRing.rotation.x=-Math.PI/2;padRing.position.y=.2;repairPad.add(padRing);
  for(let i=0;i<8;i++) {
    const a=i/8*Math.PI*2;
    box(repairPad,[.55,.3,.55],[Math.cos(a)*6.4,.4,Math.sin(a)*6.4],0xf5bc75,false);
  }
  box(repairPad,[2,.08,.5],[0,.21,0],0xf0bc78,false);box(repairPad,[.5,.08,3],[0,.21,0],0xf0bc78,false);
  const pole=box(repairPad,[.3,6,.3],[8,3,-2],0x3d6373);const lamp=disc(repairPad,.38,[8,6.3,-1.75],0xffbd72);
  const snow=new THREE.Group();group.add(snow);
  const particles=[];
  for(let i=0;i<170;i++) {
    const s=mesh(new THREE.PlaneGeometry(.09+rng()*.16,.09+rng()*.16),0xe5f4e9,false);s.position.set((rng()-.5)*340,rng()*75,10+rng()*38);snow.add(s);particles.push({mesh:s,speed:1+rng()*3});
  }
  return {group,base,repairPad,update(dt,time) {
    for(const p of particles) {p.mesh.position.x-=dt*(3+p.speed);p.mesh.position.y-=dt*p.speed;if(p.mesh.position.y<0)p.mesh.position.y=75;if(p.mesh.position.x<-180)p.mesh.position.x=180;}
    lamp.scale.setScalar(.85+Math.sin(time*3)*.15);beacon.scale.setScalar(.9+Math.sin(time*4)*.1);
  }};
}

function wedgeGeometry() {
  const vertices=[-3,-.6,-2.7, -3,-.6,2.7, 4,-.4,0, -2,1.1,-1.6, -2,1.1,1.6, 2.2,.65,0];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setIndex([0,2,1,0,3,5,0,5,2,1,2,5,1,5,4,3,4,5,0,1,4,0,4,3]);g.computeVertexNormals();return g;
}
export function createSpeeder(tint=0xf48a48) {
  const g=new THREE.Group();g.name='Snowspeeder';
  const hull=mesh(wedgeGeometry(),0xe9e7d7);g.add(hull);
  const port=box(g,[3.8,.5,2],[-1,.05,-2.5],tint);port.rotation.y=-.13;
  const starboard=box(g,[3.8,.5,2],[-1,.05,2.5],tint);starboard.rotation.y=.13;
  const canopy=box(g,[2.4,1.1,1.6],[-.5,1.2,0],0x315769);canopy.rotation.z=-.1;
  box(g,[.12,1.2,1.7],[-.3,1.2,0],0xa9beb8);
  box(g,[1.1,.06,.1],[-.95,1.78,.7],0xc1efe1,false);
  for(const z of [-3.3,3.3]) box(g,[.18,.04,1.3],[-1.8,.33,z],0xffe4ae,false);
  for(const z of [-3.6,3.6]) {
    box(g,[6,.23,.25],[.2,.25,z],0x3b5660);
    const barrel=cylinder(g,.17,1.6,[3.8,.25,z],0x768b90,8);barrel.rotation.z=-Math.PI/2;
    box(g,[2.4,.75,.7],[-2,-.05,z*.75],0x748b8d);
  }
  const engine=new THREE.Group();engine.name='EngineFlame';engine.position.set(-3.25,0,0);g.add(engine);
  for(const z of [-2,2]) {
    const nozzle=cylinder(g,.65,.8,[-3.1,.05,z],0x314957,10);nozzle.rotation.z=-Math.PI/2;
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.55,3,8),new THREE.MeshBasicMaterial({color:0x81f4ec,transparent:true,opacity:.85}));flame.rotation.z=Math.PI/2;flame.position.set(-.9,.05,z);engine.add(flame);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(.3,2,8),new THREE.MeshBasicMaterial({color:0xf1ffe7}));inner.rotation.z=Math.PI/2;inner.position.set(-.7,.05,z);engine.add(inner);
  }
  const mixer=new THREE.AnimationMixer(g);
  const clip=new THREE.AnimationClip('Ion pulse',.32,[new THREE.VectorKeyframeTrack('EngineFlame.scale',[0,.08,.16,.24,.32],[1,1,1,1.22,.82,.82,.8,1.1,1.1,1.15,.9,.9,1,1,1])]);mixer.clipAction(clip).play();
  g.userData={mixer,engine,hull}; return g;
}

export function createWalker(variant=0) {
  const g=new THREE.Group();g.name='ImperialWalker';
  const armor=variant===2?0x7c8d92:variant===1?0x9aa9aa:0xb1bab3;
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:0x284e62,transparent:true,opacity:.19,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.scale.set(9,3.6,1);shadow.position.y=.12;g.add(shadow);
  box(g,[12,5.6,5.5],[0,15,0],armor);
  box(g,[10.9,.8,5.8],[.3,18.2,0],0xc8cdc1);
  box(g,[3.5,1.2,4.7],[4.5,12,0],0x637b83);
  for(let i=0;i<5;i++) {
    box(g,[1.35,2.5,.18],[-4+i*2.1,15.4,2.85],i%2?0x788e94:0x91a1a1);
    box(g,[.12,4.6,.2],[-4.9+i*2.4,15,2.98],0x425d6b,false);
  }
  for(const z of [-2.88,2.88]) {
    for(let i=0;i<3;i++)box(g,[.7,.24,.15],[1.7+i*1.15,17,z],0x3a5665,false);
  }
  const neck=cylinder(g,1.25,4,[-7.4,14.4,0],0x637c85,8);neck.rotation.z=Math.PI/2;
  for(let i=0;i<4;i++) {const rib=cylinder(g,1.4,.18,[-6.1-i*.65,14.4,0],0x82959a,8);rib.rotation.z=Math.PI/2;}
  const head=new THREE.Group();head.position.set(-9.3,14.2,0);g.add(head);
  const skull=box(head,[4.1,3.7,3.6],[0,0,0],armor);skull.rotation.z=-.12;
  box(head,[.14,.5,3.3],[-2.15,.7,0],0x192f3c);
  for(const z of [-1.45,1.45]) {
    box(head,[3,.36,.35],[-2.5,-1,z],0x344f5d);
    const tip=cylinder(head,.3,.5,[-4.15,-1,z],0x152f3f,8);tip.rotation.z=Math.PI/2;
  }
  const legs=[];
  for(const z of [-1.9,1.9]) for(const x of [-4.2,4.2]) {
    const leg=new THREE.Group();leg.name=`Leg${legs.length}`;leg.position.set(x,12.8,z);g.add(leg);
    const hip=cylinder(leg,1.25,1.1,[0,0,z<0?-.25:.25],0x6c848c,10);hip.rotation.x=Math.PI/2;
    box(leg,[1.15,5.8,1.1],[0,-3.1,0],armor);
    const knee=cylinder(leg,1.1,1.4,[0,-6.2,0],0x80959b,10);knee.rotation.x=Math.PI/2;
    box(leg,[.75,5.5,.9],[.3,-9,0],0xaebbb8);
    box(leg,[.22,4.8,.22],[.8,-9,0],0x4c6977,false);
    box(leg,[3,.8,2.5],[-.35,-12.1,0],0x819a9f);
    box(leg,[3.2,.25,2.65],[-.35,-12.5,0],0x4c6977);
    legs.push(leg);
  }
  const weakMat=new THREE.MeshBasicMaterial({color:0xffb24f});
  const weakpoint=new THREE.Mesh(new THREE.SphereGeometry(.9,12,8),weakMat);weakpoint.position.set(.8,15.2,3.0);weakpoint.name='ReactorPort';g.add(weakpoint);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.2,.17,5,12),cel(0x334d5c));rim.position.copy(weakpoint.position);g.add(rim);
  const tracks=[];
  for(let i=0;i<legs.length;i++) {
    const dir=i===0||i===3?1:-1;
    tracks.push(new THREE.NumberKeyframeTrack(`${legs[i].name}.rotation[z]`,[0,.7,1.4,2.1,2.8],[.18*dir,0,-.18*dir,0,.18*dir]));
  }
  const mixer=new THREE.AnimationMixer(g);const action=mixer.clipAction(new THREE.AnimationClip('Heavy four-beat gait',2.8,tracks));action.play();
  g.userData={weakpoint,mixer,legs,head,action};return g;
}

export function createProjectile(enemy=false) {
  const color=enemy?0xff6348:0x93ffdb;
  const g=new THREE.Group();
  const core=new THREE.Mesh(new THREE.BoxGeometry(enemy?2.8:3.1,enemy?.3:.2,.25),new THREE.MeshBasicMaterial({color:0xfff1c2}));g.add(core);
  const halo=new THREE.Mesh(new THREE.BoxGeometry(enemy?3.7:4,.6,.3),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.45,depthWrite:false}));g.add(halo);
  return g;
}

export function createExplosion(scene,pos,tint=0xffaf5d) {
  const root=new THREE.Group();root.position.copy(pos);scene.add(root);
  const fragments=[];
  for(let i=0;i<20;i++) {
    const a=i/20*Math.PI*2,s=2+Math.random()*5;
    const m=mesh(new THREE.TetrahedronGeometry(.3+Math.random()*.7),i%4? tint:0x344c58,false);root.add(m);
    fragments.push({m,v:new THREE.Vector3(Math.cos(a)*s,Math.sin(a)*s,Math.random()*4-2)});
  }
  const ring=new THREE.Mesh(new THREE.RingGeometry(.7,1,24),new THREE.MeshBasicMaterial({color:0xffe5a4,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));root.add(ring);
  let age=0;
  return {root,update(dt) {age+=dt;for(const p of fragments){p.m.position.addScaledVector(p.v,dt);p.v.y-=dt*8;p.m.rotation.x+=dt*4;p.m.scale.setScalar(Math.max(.02,1-age*.8));}ring.scale.setScalar(1+age*12);ring.material.opacity=Math.max(0,.9-age*1.3);if(age>1.3){scene.remove(root);root.traverse(o=>{if(o.geometry)o.geometry.dispose();});return false;}return true;}};
}
