import * as THREE from 'three/webgpu';

// Everything in this diorama is drawn with geometry. The four-step ramp and
// inverted hulls give the little expedition a printed, hand-inked appearance.
const C = {
  ink: 0x122c31, cream: 0xffedc5, sun: 0xffcf68, clay: 0xc4694c,
  dirt: 0x925247, darkEarth: 0x463d43, moss: 0x8eae59,
  leaf: 0x286759, lightLeaf: 0x57986c, darkLeaf: 0x164b48,
  mint: 0x8ebf98, teal: 0x267d79, gold: 0xffc354, coral: 0xf37659,
};
const ramp = new THREE.DataTexture(new Uint8Array([66,66,66,255, 126,126,126,255, 191,191,191,255, 255,255,255,255]),4,1,THREE.RGBAFormat);
ramp.minFilter = THREE.NearestFilter;
ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
const materials = new Map();
const ink = new THREE.MeshBasicMaterial({color: C.ink, side: THREE.BackSide});
const glowMats = new Map();
function mat(color) {
  const key = typeof color === 'string' ? color : color.toString(16);
  if (!materials.has(key)) materials.set(key, new THREE.MeshToonNodeMaterial({color, gradientMap:ramp}));
  return materials.get(key);
}
function glow(color) {
  if (!glowMats.has(color)) glowMats.set(color, new THREE.MeshBasicMaterial({color}));
  return glowMats.get(color);
}
const G = {
  box: new THREE.BoxGeometry(1,1,1),
  ball: new THREE.SphereGeometry(1,10,7),
  stone: new THREE.IcosahedronGeometry(1,0),
  cylinder: new THREE.CylinderGeometry(1,1,1,9),
  cone: new THREE.ConeGeometry(1,1,7),
  ring: new THREE.TorusGeometry(.32,.08,6,14),
};
const leafShape = new THREE.Shape();
leafShape.moveTo(0,0); leafShape.bezierCurveTo(-.68,.7,-.6,1.64,0,2.12);
leafShape.bezierCurveTo(.6,1.64,.68,.7,0,0);
G.leaf = new THREE.ExtrudeGeometry(leafShape,{depth:.025,bevelEnabled:false,curveSegments:4});
function mesh(parent,geometry,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,outline=true) {
  const m = new THREE.Mesh(geometry,mat(color));
  m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.castShadow=true; m.receiveShadow=true;
  parent.add(m);
  if(outline){const h=new THREE.Mesh(geometry,ink); h.scale.setScalar(1.045); m.add(h);}
  return m;
}
function box(p,c,x,y,z,sx,sy,sz,outline=true) { return mesh(p,G.box,c,x,y,z,sx,sy,sz,outline); }
function ball(p,c,x,y,z,sx,sy=sx,sz=sx,outline=true) { return mesh(p,G.ball,c,x,y,z,sx,sy,sz,outline); }
function segment(p,a,b,r,color,outline=true) {
  const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta=bv.clone().sub(av);
  const m=mesh(p,G.cylinder,color,...av.clone().add(bv).multiplyScalar(.5).toArray(),r,delta.length(),r,outline);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  return m;
}
function rng(seed=374761) {let n=seed; return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const random=rng();
const vary=(a,b)=>a+random()*(b-a);
function plant(parent,x,y,z,size=1,color=C.leaf) {
  const p=new THREE.Group();p.position.set(x,y,z);p.scale.setScalar(size);parent.add(p);
  for(let i=0;i<5;i++){
    const l=mesh(p,G.leaf,i%2?color:C.lightLeaf,0,.02,0,.28+random()*.1,.48+random()*.25,.8);
    l.rotation.z=(i-2)*.42; l.rotation.y=i*.7;
    segment(l,[0,.15,.07],[0,1.7,.07],.02,C.mint,false);
  }
  return p;
}
function fern(parent,x,y,z,size=1,color=C.lightLeaf) {
  const p=new THREE.Group();p.position.set(x,y,z);p.scale.setScalar(size);parent.add(p);
  for(let f=0;f<5;f++){
    const angle=(f-2)*.52;
    const frond=new THREE.Group();frond.rotation.z=angle;frond.rotation.y=f*.8;p.add(frond);
    segment(frond,[0,0,0],[0,1.45,0],.025,color,false);
    for(let j=1;j<6;j++){
      const w=(1-j/7)*.24;
      const l=mesh(frond,G.leaf,color,-.01,j*.22,0,w,.16,.7,false);l.rotation.z=.9;
      const r=mesh(frond,G.leaf,color,.01,j*.22,.02,w,.16,.7,false);r.rotation.z=-.9;
    }
  }
  return p;
}
function tree(parent,x,z,height=10,size=1,layer=0) {
  const p=new THREE.Group();p.position.set(x,0,z);p.scale.setScalar(size);parent.add(p);
  const bark=layer?0x3e7164:0x4c6850;
  const trunk=mesh(p,G.cylinder,bark,0,height*.48,0,.38,height,.48);trunk.rotation.z=vary(-.08,.08);
  segment(p,[-.02,0,0],[-1,.1,.5],.2,bark);
  segment(p,[0,0,0],[.9,.12,.7],.19,bark);
  segment(p,[0,height*.55,0],[-2.7,height*.88,0],.17,bark);
  segment(p,[0,height*.64,0],[2.4,height*.9,0],.16,bark);
  for(let i=0;i<4;i++){
    const yy=height*(.35+i*.14);
    const ring=mesh(p,G.cylinder,layer?0x538574:0x829569,0,yy,.01,.39,.075,.49,false);ring.rotation.z=trunk.rotation.z;
  }
  for(let i=0;i<7;i++){
    const xx=(i-3)*1.18, yy=height+Math.sin(i*2)*.52;
    const col=layer?0x397b69:[C.darkLeaf,C.leaf,C.lightLeaf][i%3];
    const crown=mesh(p,G.stone,col,xx,yy,vary(-1,1),2.4,1.25,1.6,!layer);
    crown.rotation.z=vary(-.4,.4);
    if(!layer&&i%2===0){
      for(let k=0;k<3;k++){
        const l=mesh(p,G.leaf,C.mint,xx+k*.3,yy+.1,.95,.22,.35,.5,false);l.rotation.z=-1.1+k*.25;
      }
    }
  }
  return p;
}
function flower(parent,x,y,z,color=C.coral) {
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
  segment(g,[0,0,0],[0,.65,0],.025,C.leaf,false);
  for(let i=0;i<5;i++){const a=i*Math.PI*.4;ball(g,color,Math.cos(a)*.16,.68+Math.sin(a)*.16,.04,.14,.14,.045,false);}
  ball(g,C.gold,0,.68,.1,.075,.075,.04,false);
  return g;
}
function boulder(parent,x,y,z,s=1,color=0x9c9c7b) {
  const m=mesh(parent,G.stone,color,x,y,z,s,s*.7,s*.75);m.rotation.set(vary(0,1),vary(0,3),vary(-.3,.3));return m;
}
function shrine(parent,x,y=0,z=-1.7,large=false) {
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
  const size=large?1.45:1;g.scale.setScalar(size);
  box(g,0x54867c,0,.18,0,2,.36,1.55);
  box(g,0x789b83,0,1.2,0,1.4,2,1.15);
  box(g,0xa8b992,0,2.28,0,1.85,.24,1.5);
  box(g,C.darkLeaf,0,1.32,.59,1,.95,.045);
  box(g,C.gold,-.24,1.42,.65,.16,.17,.08);
  box(g,C.gold,.24,1.42,.65,.16,.17,.08);
  box(g,0x77957a,0,1.14,.74,.24,.3,.28);
  box(g,0xd3bd86,0,.86,.65,.54,.1,.1);
  for(let k=0;k<3;k++)box(g,0x4b7c70,-.5+k*.5,.52,.64,.15,.14,.07);
  plant(g,-.9,.1,0,.42);plant(g,.75,.15,-.1,.5);
  return g;
}
function torch(parent,x,y,z) {
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
  segment(g,[0,0,0],[0,1.25,0],.07,0x76513b);
  mesh(g,G.cone,C.gold,0,1.5,0,.18,.5,.18,false);
  mesh(g,G.cone,C.coral,0,1.45,0,.25,.42,.25,false).rotation.z=.2;
  return g;
}

export function createWorld(scene,level) {
  const group=new THREE.Group();group.name='InkJungle';scene.add(group);
  const length=level.length||240;
  scene.background=new THREE.Color(C.cream);
  scene.fog=new THREE.Fog(C.cream,50,110);
  const hemi = new THREE.HemisphereLight(0xfff2ce,0x426661,2.2); scene.add(hemi);
  const sunLight=new THREE.DirectionalLight(0xffe8bf,2.1);sunLight.position.set(12,22,12);scene.add(sunLight);scene.add(sunLight.target);
  sunLight.castShadow=true;sunLight.shadow.mapSize.set(2048,2048);
  Object.assign(sunLight.shadow.camera,{left:-28,right:28,top:22,bottom:-20,near:.5,far:75});
  sunLight.shadow.normalBias=.05;sunLight.shadow.bias=-.0003;
  const fill =new THREE.DirectionalLight(0x7dd3c7,.8);fill.position.set(-8,7,-10);scene.add(fill);
  const back=new THREE.Group();group.add(back);
  // Paper-colored sky, overlapping hazy mountain cuts, and distant canopy.
  for(let x=-35;x<length+40;x+=22){
    const mountain=mesh(back,G.cone,0xb6cfac,x,2,-35,19,19,6,false);mountain.rotation.y=.5;
    const hill=mesh(back,G.stone,0x86b69c,x+10,3,-25,17,7,5,false);hill.rotation.z=.2;
    mesh(back,G.stone,0x6aa58e,x,2,-17,12,6,4,false);
  }
  for(let x=-16;x<length+20;x+=8.2)tree(group,x,-11.5,10+random()*2,1.1,1);
  for(let x=-10;x<length+16;x+=13.8)tree(group,x+random()*3,-5.5,8.4+random()*1.5,1,0);

  // The forest floor recedes behind the playable cutaway, grounding the trees.
  box(group,0x87a66f,length/2,-.16,-8.9,length+30,.24,13.2,false);

  // The surface is cut into real islands. The lower corridor is always visible.
  const cuts=[...(level.gaps||[]).map(g=>({a:g.a,b:g.b,type:g.type})),...(level.ladders||[]).map(x=>({a:x-.7,b:x+.7,type:'ladder'}))].sort((a,b)=>a.a-b.a);
  const merged=[];
  for(const cut of cuts){const prev=merged.at(-1);if(prev&&cut.a<=prev.b)prev.b=Math.max(prev.b,cut.b);else merged.push({...cut});}
  const segments=[];let a=-8;
  for(const gap of merged){if(gap.a>a)segments.push([a,gap.a]);a=Math.max(a,gap.b);}
  segments.push([a,length+8]);
  for(const [a,b] of segments){
    const w=b-a;if(w<=0)continue;
    box(group,C.clay,(a+b)/2,-.66,0,w,1.32,4.6,false);
    box(group,C.moss,(a+b)/2,-.1,0,w,.2,4.7,false);
    box(group,0xe4a26f,(a+b)/2,-.34,2.32,w,.12,.04,false);
    box(group,C.dirt,(a+b)/2,-1.16,2.32,w,.23,.04,false);
    box(group,C.ink,(a+b)/2,.015,2.37,w,.055,.04,false);
    // A scattered ink mark on the top and pebble strata along the edge.
    for(let xx=a+.5;xx<b-.2;xx+=1.8){
      if(random()>.4)box(group,0x567950,xx,.025,1.6,.38,.025,.05,false).rotation.y=vary(-.5,.5);
      if(random()>.35)mesh(group,G.stone,0xe4a36f,xx,-.76,2.35,.13,.09,.045,false);
    }
  }
  // Rear cavern wall; the foreground remains open for the explorer.
  box(group,0x375854,length/2,-4.3,-2.65,length+18,5.9,.65,false);
  box(group,0x263f44,length/2,-11.5,0,length+18,9,4.7,false);
  box(group,0x62947f,length/2,-7.05,0,length+18,.12,4.7,false);
  box(group,C.ink,length/2,-6.96,2.36,length+18,.045,.04,false);
  for(let x=-5;x<length+8;x+=4){
    box(group,0x426b62,x,-3.3,-2.29,2.8,.12,.025,false).rotation.z=vary(-.06,.06);
    box(group,0x284947,x+1.4,-5.2,-2.29,2.5,.12,.025,false).rotation.z=vary(-.08,.08);
    mesh(group,G.cone,0x4b6b5c,x,-2.1,-1.9,.33,1.4,.5).rotation.z=Math.PI;
    if(random()>.3)mesh(group,G.cone,0x4f887e,x+1,-6.5,-1.8,.4,1,.4);
    for(let j=0;j<3;j++)ball(group,0x9ad2aa,x+j*.24,-6.8+random()*.2,-1.7,.07,.13,.07,false);
  }
  const torches=[];
  for(let x=8;x<length;x+=24){
    torches.push(torch(group,x,-6.9,-1.6));
    const lg=new THREE.PointLight(0xffb45b,.55,7,2);lg.position.set(x,-5.4,-.6);group.add(lg);
  }
  const vines=[];
  for(const d of level.vines||[]){
    const p=new THREE.Group();p.position.set(d.x,d.y,0);group.add(p);
    const rope=mesh(p,G.cylinder,0x687c46,0,-d.length/2,0,.07,d.length,.07);
    const end=new THREE.Vector3();
    for(let k=0;k<4;k++){
      const leaf=mesh(p,G.leaf,C.lightLeaf,.02,-.5-k*d.length*.2,0,.17,.24,.7);leaf.rotation.z=k%2?.8:-.8;
    }
    ball(p,C.gold,0,-d.length,0,.15,.16,.15);
    const anchor=mesh(group,G.cylinder,0x786a45,d.x,d.y+.15,0,.25,.5,.25);anchor.rotation.z=Math.PI/2;
    vines.push({group:p,rope,end,angle:0,definition:d});
  }
  for(const x of level.ladders||[]){
    const g=new THREE.Group();g.position.set(x,0,.15);group.add(g);
    segment(g,[-.48,.6,0],[-.48,-6.9,0],.07,0xc6ab6f);
    segment(g,[.48,.6,0],[.48,-6.9,0],.07,0xc6ab6f);
    for(let y=.2;y>-7;y-=.43)segment(g,[-.48,y,.01],[.48,y,.01],.06,0xe0bd80);
    // A hand-painted turquoise arrow marks each route choice.
    const arrow=mesh(g,G.cone,C.gold,.95,.8,0,.16,.5,.08,false);arrow.rotation.z=Math.PI;
  }
  const waters=[];
  for(const gap of level.gaps||[]){
    if(gap.type==='ladder'||gap.type==='hole')continue;
    const type=gap.type||'water';
    const water=box(group,type==='tar'?0x2d3940:type==='quicksand'?0xc99d57:0x329589,(gap.a+gap.b)/2,-.7,0,gap.b-gap.a,.16,4.4,false);
    waters.push(water);
    for(let xx=gap.a+.4;xx<gap.b;xx+=.9){
      box(group,type==='tar'?0x66736b:type==='quicksand'?0xe3bd7c:0x8bc9a2,xx,-.59,vary(-1.7,1.7),.55,.02,.035,false);
    }
    for(let x of [gap.a-.25,gap.b+.25]){fern(group,x,0,-1.1,.65);boulder(group,x,.12,1.6,.4);}
  }
  const inGap=x=>merged.some(g=>x>g.a-.3&&x<g.b+.3);
  for(let x=-5;x<length+7;x+=1.5){
    if(inGap(x))continue;
    if(random()>.56)plant(group,x,.02,-1.65,vary(.4,.85));
    if(random()>.56)fern(group,x+.3,.02,1.9,vary(.3,.65),random()>.5?C.lightLeaf:C.leaf);
    if(random()>.83)flower(group,x,.02,1.7,random()>.5?C.coral:C.gold);
    if(random()>.87)boulder(group,x,.12,-.9,vary(.25,.5));
    if(random()>.82) {
      // Small roots curl out of the cut-earth cross section.
      segment(group,[x,-.1,2.36],[x+.3,-.6,2.38],.035,0x5d5140,false);
      segment(group,[x+.3,-.6,2.38],[x+.55,-.85,2.38],.025,0x5d5140,false);
    }
  }
  for(const section of level.sections||[]){
    const x=section.start+3;
    if(!inGap(x))shrine(group,x,0,-1.8,false);
    // A little route pennant: legible by color, not tiny world-space type.
    const flag=new THREE.Group();flag.position.set(x+2,0,-1);group.add(flag);
    segment(flag,[0,0,0],[0,2.4,0],.05,0x657b59);
    const f=box(flag,C.coral,.35,2,0,.65,.38,.045);f.rotation.z=-.08;
    if(section.biome==='swamp'){
      for(let i=0;i<9;i++){
        const xx=section.start+3+i*3.1;
        for(let j=0;j<3;j++){
          segment(group,[xx+j*.2,-.1,-2.2],[xx+j*.2+.12,1.6+j*.2,-2.2],.035,0x708551,false);
          mesh(group,G.cylinder,0x8b6543,xx+j*.2+.12,1.6+j*.2,-2.2,.09,.38,.09);
        }
      }
    }else if(section.biome==='ruins'||section.biome==='temple'){
      for(let i=0;i<3;i++){
        const xx=section.start+7+i*9;
        const ruin=new THREE.Group();ruin.position.set(xx,0,-3.1);group.add(ruin);
        for(let k=0;k<3;k++)box(ruin,0x8da084,0,.32+k*.64,0,1.45-k*.1,.6,1.2);
        box(ruin,0xb5ba8e,0,2.03,0,1.6,.24,1.4);
        const sun=mesh(ruin,G.ring,C.gold,0,1.28,.65,.7,.7,.6);sun.rotation.z=.12;
        plant(ruin,.8,.05,.4,.55);
      }
    }else if(section.biome==='cave'){
      for(let i=0;i<6;i++){
        const crystal=mesh(group,G.cone,0x9ac9b2,section.start+4+i*5,-6.3,-1.5,.27,1.15,.3);
        crystal.rotation.z=(i%2-.5)*.35;
        mesh(group,G.cone,0x62a99b,section.start+4.3+i*5,-6.6,-1.3,.2,.65,.2).rotation.z=.3;
      }
    }else if(section.biome==='ember'){
      for(let i=0;i<5;i++){
        const xx=section.start+4+i*6.4;
        const burnt=mesh(group,G.cylinder,0x3e5144,xx,1.5,-3.1,.22,3,.25);burnt.rotation.z=.08;
        segment(group,[xx,1.9,-3.1],[xx+.9,2.7,-3.1],.1,0x3e5144);
        ball(group,0xe2a56b,xx,3.05,-3.1,.23,.07,.25,false);
        boulder(group,xx+.7,.2,-2.4,.55,0x83715b);
      }
    }
  }
  for(const x of level.checkpoints||[]){
    const post=new THREE.Group();post.position.set(x,0,-1.4);group.add(post);
    box(post,0x5c8b7c,0,.25,0,.85,.5,.7);
    box(post,C.cream,0,.75,0,.56,.65,.46);
    const gem=mesh(post,G.stone,C.gold,0,1.22,0,.2,.28,.15);gem.rotation.z=.15;
    box(post,C.teal,0,.8,.25,.27,.1,.03,false);
  }
  for(const x of level.walls||[]){
    const wall=new THREE.Group();wall.position.set(x,-7,0);group.add(wall);
    for(let row=0;row<7;row++){
      box(wall,row%2?0x647e6b:0x78917a,(row%2)*.08, .4+row*.78,0,1.15,.73,3.9);
      box(wall,0x33584e,-.23,.42+row*.78,2,.035,.45,.015,false);
    }
    plant(wall,0,5.4,-1,.35);
  }
  const gateway=new THREE.Group();gateway.position.set(length-5,0,-1.6);group.add(gateway);
  for(let side of [-1,1]){
    box(gateway,0x547e70,side*2.1,1.8,0,1.05,3.6,1.2);
    box(gateway,0x9fb28a,side*2.1,3.8,0,1.4,.38,1.5);
    for(let k=0;k<3;k++)box(gateway,C.gold,side*2.1,.8+k,.64,.52,.12,.045,false);
    plant(gateway,side*2.75,0,.2,.7);
  }
  box(gateway,0x71937b,0,4.2,0,5.8,.52,1.5);
  box(gateway,C.gold,0,4.2,.8,1.05,.3,.08);
  mesh(gateway,G.stone,C.cream,0,4.8,0,.38,.5,.24);
  box(gateway,0x63816c,0,.1,0,5.8,.2,2.5);
  shrine(group,length-1,0,-2.8,true);
  // Camp is an unmistakable warm, safe bookend to the expedition.
  const camp=new THREE.Group();camp.position.set(1,0,-1.3);group.add(camp);
  const tent=mesh(camp,G.cone,0xf1b76d,0,.72,0,1.3,1.5,.9);tent.rotation.y=Math.PI/4;
  mesh(camp,G.cone,0x304d4b,0,.55,.72,.45,1.1,.08,false);
  box(camp,C.coral,0,.05,1,2.5,.07,1.2);
  for(let k=0;k<3;k++)boulder(camp,2+k*.27,.12,.4,.18,0x9a8b6b);
  const campfire=makeHazard('fire');campfire.scale.setScalar(.55);campfire.position.set(2.4,.05,.5);camp.add(campfire);
  const fireflies=[];
  for(let i=0;i<65;i++){
    const m=new THREE.Mesh(G.ball,glow(i%3===0?0xffde87:0xb9e4a0));
    m.scale.setScalar(vary(.025,.055));m.position.set(vary(-5,length+5),vary(.7,5.8),vary(-3,2));
    group.add(m);fireflies.push({mesh:m,x:m.position.x,y:m.position.y,z:m.position.z,phase:random()*Math.PI*2});
  }
  return {group,vines,sunLight,decorations:{waters,torches,fireflies},update(t,dt){
    for(const v of vines){v.angle=Math.sin(t*1.25+(v.definition.phase||0))*.95;v.group.rotation.z=v.angle;v.end.set(v.definition.x+Math.sin(v.angle)*v.definition.length,v.definition.y-Math.cos(v.angle)*v.definition.length,0);}
    for(let i=0;i<waters.length;i++)waters[i].position.y=-.7+Math.sin(t*1.8+i)*.025;
    for(let i=0;i<torches.length;i++)torches[i].children[1].scale.y=.45+Math.sin(t*13+i)*.05;
    for(const f of fireflies){f.mesh.position.y=f.y+Math.sin(t*.8+f.phase)*.35;f.mesh.position.x=f.x+Math.cos(t*.5+f.phase)*.3;f.mesh.scale.setScalar(.027+Math.sin(t*2+f.phase)*.014);}
    campfire.userData.animate?.(t);
  }};
}

export function makeTreasure(type='gold') {
  type=String(type).toLowerCase();
  const g=new THREE.Group();g.name='treasure_'+type;
  if(type.includes('ring')||type.includes('diamond')){
    const r=mesh(g,G.ring,C.gold,0,.42,0,1,1,1);r.rotation.y=.12;
    mesh(g,G.stone,0xa9eee0,0,.84,0,.25,.26,.21);
  }else if(type.includes('bag')||type.includes('pouch')){
    ball(g,0xd3a05c,0,.3,0,.38,.42,.26);
    mesh(g,G.cone,0xf7ce80,0,.66,0,.16,.25,.14);
    box(g,C.ink,0,.56,.02,.38,.08,.3,false);
    const star=mesh(g,G.stone,C.gold,0,.3,.26,.13,.13,.04,false);star.rotation.z=.35;
  }else if(type.includes('relic')||type.includes('idol')){
    box(g,C.gold,0,.3,0,.64,.6,.43);
    box(g,C.cream,0,.65,0,.75,.18,.5);
    box(g,C.ink,-.16,.38,.24,.13,.13,.04,false);
    box(g,C.ink,.16,.38,.24,.13,.13,.04,false);
    box(g,C.coral,0,.15,.25,.23,.08,.04,false);
  }else{
    const color=type.includes('silver')?0xc5dfd4:C.gold;
    for(let i=0;i<3;i++){
      const m=box(g,color,(i%2-.5)*.37,.15+(i===2?.26:0),i===2?0:.03,.66,.22,.36);m.rotation.y=i===2?.12:-.08;
      box(g,type.includes('silver')?0xf1faf1:0xffe3a0,(i%2-.5)*.37,.27+(i===2?.26:0),.1,.45,.025,.12,false);
    }
  }
  // A stylized radial sparkle lives in the same object and can rotate with it.
  const glint=mesh(g,G.stone,C.cream,.42,.85,0,.09,.22,.035,false);glint.rotation.z=.4;
  return g;
}

export function makeHazard(type='log') {
  type=String(type).toLowerCase();const g=new THREE.Group();g.name='hazard_'+type;
  if(type.includes('log')){
    const log=mesh(g,G.cylinder,0x8c5940,0,.36,0,.38,1.15,.38);log.rotation.x=Math.PI/2;
    for(const z of [-.59,.59]){
      const end=mesh(g,G.cylinder,0xd9ad6c,0,.36,z,.32,.025,.32);end.rotation.x=Math.PI/2;
      const ring=mesh(g,G.ring,0x93694b,0,.36,z*1.025,.62,.62,.45,false);ring.rotation.z=.3;
      ball(g,0x986742,0,.36,z*1.03,.06,.06,.02,false);
    }
    for(let k=0;k<5;k++)segment(g,[Math.sin(k)*.32,.36+Math.cos(k)*.33,-.49],[Math.sin(k)*.32,.36+Math.cos(k)*.33,.49],.025,0x4e4939,false);
  }else if(type.includes('snake')||type.includes('cobra')){
    const points=[new THREE.Vector3(-.5,.1,0),new THREE.Vector3(-.2,.12,.1),new THREE.Vector3(.23,.18,0),new THREE.Vector3(.22,.65,0),new THREE.Vector3(.18,.94,0)];
    const geom=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),14,.13,7,false);
    mesh(g,geom,0x7f9e4e);
    ball(g,0xd0b855,.18,.76,0,.3,.37,.15);
    ball(g,0x90b65b,.18,1.02,.01,.22,.18,.18);
    ball(g,C.ink,.28,1.04,.16,.035,.04,.025,false);
    segment(g,[.35,.98,.05],[.54,.97,.05],.018,C.coral,false);
    g.userData.animate=t=>{g.rotation.z=Math.sin(t*2.8)*.07;};
  }else if(type.includes('scorpion')){
    ball(g,0xb77953,0,.24,0,.35,.19,.25);
    for(let side of [-1,1])for(let i=0;i<3;i++){
      segment(g,[-.2+i*.18,.21,side*.15],[-.3+i*.2,.09,side*.42],.04,0xc08b58);
    }
    const tail=new THREE.Group();g.add(tail);tail.position.set(-.28,.3,0);
    segment(tail,[0,0,0],[-.2,.3,0],.09,0xb77953);
    segment(tail,[-.2,.3,0],[-.08,.62,0],.075,0xb77953);
    segment(tail,[-.08,.62,0],[.14,.58,0],.06,C.coral);
    for(let s of [-1,1]){segment(g,[.2,.26,s*.16],[.49,.3,s*.31],.07,0xc08b58);ball(g,C.coral,.53,.32,s*.32,.14,.12,.16);}
    ball(g,C.ink,.32,.29,.13,.025,.03,.025,false);
    g.userData.animate=t=>{tail.rotation.x=Math.sin(t*3)*.15;};
  }else if(type.includes('croc')){
    ball(g,0x73995e,0,.04,0,1.05,.27,.42);
    const head=box(g,0x8dab65,.48,.15,0,1.2,.27,.65);
    const jaw=new THREE.Group();jaw.position.set(.02,.2,0);g.add(jaw);
    box(jaw,0x9bb76f,.58,.02,0,1.3,.14,.65);
    for(let i=0;i<5;i++)for(let s of [-1,1])mesh(jaw,G.cone,C.cream,.1+i*.22,-.1,s*.26,.07,.19,.07,false).rotation.z=Math.PI;
    for(let s of [-1,1]){ball(g,0xaabf74,.17,.36,s*.24,.17,.16,.12);ball(g,C.ink,.23,.4,s*.32,.05,.06,.025,false);}
    for(let i=0;i<4;i++)mesh(g,G.cone,0x456e50,-.9+i*.3,.28,0,.12,.22,.12);
    g.userData.jaw=jaw;g.userData.animate=t=>{jaw.rotation.z=Math.max(0,Math.sin(t*1.4))*.48;};
  }else if(type.includes('fire')){
    for(let k=0;k<3;k++){
      const a=k*Math.PI/3;
      const l=mesh(g,G.cylinder,0x78523a,Math.cos(a)*.12,.09,Math.sin(a)*.12,.1,.9,.1);l.rotation.z=Math.PI/2;l.rotation.y=a;
    }
    const flames=new THREE.Group();g.add(flames);
    for(let k=0;k<5;k++){
      const f=mesh(flames,G.cone,k%2?C.gold:C.coral,Math.sin(k*4)*.16,.4+random()*.13,Math.cos(k*4)*.13,.16,.72,.16,false);
      f.rotation.z=Math.sin(k)*.2;
    }
    g.userData.animate=t=>{for(let k=0;k<flames.children.length;k++)flames.children[k].scale.y=.65+Math.sin(t*12+k)*.15;};
  }else{
    boulder(g,0,.3,0,.55);
  }
  return g;
}

export function makeExplorer(color=0xe77757) {
  const group=new THREE.Group();group.name='Explorer';
  const rig=new THREE.Group();rig.name='rig';rig.position.y=-.125;group.add(rig);
  const body=new THREE.Group();body.name='body';body.position.y=1.05;rig.add(body);
  box(body,0x2c7770,0,.2,0,.5,.62,.47);
  box(body,color,.03,-.02,0,.53,.16,.49);
  box(body,0xd1a35c,-.29,.25,0,.2,.48,.43); // expedition backpack
  box(body,0x6c7650,-.41,.3,0,.12,.36,.33);
  segment(body,[.01,.48,-.26],[.01,-.05,-.26],.035,C.gold,false);
  const head=new THREE.Group();head.name='head';head.position.y=.7;body.add(head);
  ball(head,0xf2bc8c,0,.02,0,.27,.32,.26);
  ball(head,0x4a4639,-.15,.04,0,.16,.26,.25);
  ball(head,0xf2bc8c,.26,.03,0,.1,.085,.09);
  for(let s of [-1,1]){
    ball(head,C.ink,.22,.1,s*.18,.035,.055,.032,false);
    box(head,0x5b4738,.19,.19,s*.19,.1,.025,.03,false).rotation.z=.15;
    ball(head,0xf2bc8c,-.08,-.01,s*.25,.085,.1,.065);
  }
  box(head,0x7e4f3d,.22,-.11,.09,.085,.025,.1,false);
  const brim=mesh(head,G.cylinder,0xe1b46a,0,.29,0,.44,.08,.39);
  mesh(head,G.cylinder,0xe4bb76,-.03,.4,0,.26,.23,.25);
  mesh(head,G.cylinder,0x3a6555,-.03,.33,0,.27,.08,.26,false);
  const scarf=box(body,color,.02,.48,0,.57,.13,.54);
  const tail=mesh(body,G.leaf,color,-.3,.39,.05,.13,.33,.7);tail.rotation.z=1.9;
  // Hip and shoulder pivots are animated with native Three.js clips.
  const limbs={};
  for(let s of [-1,1]){
    const suffix=s===-1?'Far':'Near';
    const leg=new THREE.Group();leg.name='leg'+suffix;leg.position.set(0,.79,s*.15);rig.add(leg);limbs['leg'+suffix]=leg;
    box(leg,0xb28d54,0,-.21,0,.21,.45,.22);
    box(leg,0x314e48,.075,-.52,0,.36,.23,.25);
    box(leg,0x213d3d,.075,-.63,.01,.39,.07,.27,false);
    const arm=new THREE.Group();arm.name='arm'+suffix;arm.position.set(0,1.45,s*.31);rig.add(arm);limbs['arm'+suffix]=arm;
    box(arm,0x2e7b70,0,-.13,0,.19,.29,.2);
    box(arm,0xf2bc8c,0,-.36,0,.16,.27,.17);
    ball(arm,0xf2bc8c,0,-.52,0,.105,.11,.1);
  }
  const times=[0,.15,.3,.45,.6];
  const track=(name,values)=>new THREE.NumberKeyframeTrack(name,times,values);
  const clips={
    idle:new THREE.AnimationClip('idle',1.8,[new THREE.NumberKeyframeTrack('body.position[y]',[0,.9,1.8],[1.05,1.085,1.05]),new THREE.NumberKeyframeTrack('armNear.rotation[z]',[0,.9,1.8],[.05,-.04,.05])]),
    run:new THREE.AnimationClip('run',.6,[track('legNear.rotation[z]',[-.68,0,.68,0,-.68]),track('legFar.rotation[z]',[.68,0,-.68,0,.68]),track('armNear.rotation[z]',[.7,0,-.7,0,.7]),track('armFar.rotation[z]',[-.7,0,.7,0,-.7]),track('body.position[y]',[1.05,1.12,1.05,1.12,1.05])]),
    jump:new THREE.AnimationClip('jump',.6,[track('legNear.rotation[z]',[-.5,-.6,-.6,-.5,-.5]),track('legFar.rotation[z]',[.4,.5,.5,.4,.4]),track('armNear.rotation[z]',[-1.8,-2,-2,-1.8,-1.8]),track('armFar.rotation[z]',[-1.4,-1.6,-1.6,-1.4,-1.4])]),
    climb:new THREE.AnimationClip('climb',.6,[track('legNear.rotation[z]',[-.8,-.3,.2,-.3,-.8]),track('legFar.rotation[z]',[.2,-.3,-.8,-.3,.2]),track('armNear.rotation[z]',[-2.7,-2,-1.6,-2,-2.7]),track('armFar.rotation[z]',[-1.6,-2,-2.7,-2,-1.6])]),
    swing:new THREE.AnimationClip('swing',.6,[track('armNear.rotation[z]',[-3,-3,-3,-3,-3]),track('armFar.rotation[z]',[-2.9,-2.9,-2.9,-2.9,-2.9]),track('legNear.rotation[z]',[-.35,-.25,-.15,-.25,-.35]),track('legFar.rotation[z]',[.25,.15,.05,.15,.25])]),
  };
  const mixer=new THREE.AnimationMixer(rig);const actions={};
  for(const [name,clip] of Object.entries(clips)){actions[name]=mixer.clipAction(clip);}
  let current='idle';actions.idle.play();
  return {group,mixer,actions,update(dt,state={}){
    const name=state.swinging?'swing':state.climbing?'climb':state.grounded===false?'jump':state.moving?'run':'idle';
    if(name!==current){actions[current].fadeOut(.12);actions[name].reset().fadeIn(.12).play();current=name;}
    if(state.facing!==undefined)group.rotation.y=state.facing<0?Math.PI:0;
    mixer.update(dt);
    tail.rotation.z=1.9+Math.sin(mixer.time*7)*.12;
  }};
}
