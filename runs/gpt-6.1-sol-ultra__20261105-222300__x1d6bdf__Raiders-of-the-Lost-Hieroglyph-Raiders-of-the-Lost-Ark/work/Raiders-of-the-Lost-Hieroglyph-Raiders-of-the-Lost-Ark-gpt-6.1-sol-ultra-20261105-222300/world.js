import * as THREE from 'three';

// Every surface is modeled: warm gouache colors, hard light bands, and ink edges.
export function buildWorld(stage, scene) {
  const group = new THREE.Group();
  group.name = `Expedition set ${stage}`;
  scene.add(group);
  const solids = [], props = {}, animated = [], torches = [];
  let trapState = {enabled: true, time: 0, escapeTime: 0};
  props.setHazards = state => { trapState = {...trapState, ...state}; };
  let trapVisual = null;
  let seed = 3729 + stage * 101;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const palette = stage === 3 ? {sand:0x314851,stone:0x46616b,light:0x6e8581,dark:0x192d38,ink:0x11222b,gold:0xdda949} : {sand:0xe4b875,stone:0xcb955c,light:0xf2d598,dark:0x96603e,ink:0x44312e,gold:0xf3c35b};
  const materials = new Map();
  const mat = c => { if (!materials.has(c)) materials.set(c,new THREE.MeshToonMaterial({color:c})); return materials.get(c); };
  const ink = new THREE.LineBasicMaterial({color:palette.ink,transparent:true,opacity:0.72});
  const glow = c => new THREE.MeshBasicMaterial({color:c});
  function mesh(geo,c,x,y,z,parent=group,edges=true) {
    const m = new THREE.Mesh(geo,typeof c==='number'?mat(c):c);
    m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;
    if(edges){const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),ink);m.add(e);}
    parent.add(m);return m;
  }
  const box=(x,y,z,w,h,d,c,parent=group,edges=true)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,parent,edges);
  const cyl=(x,y,z,r,h,c,parent=group,n=8,r2=r)=>mesh(new THREE.CylinderGeometry(r2,r,h,n),c,x,y,z,parent);
  const ball=(x,y,z,r,c,parent=group)=>mesh(new THREE.IcosahedronGeometry(r,1),c,x,y,z,parent,false);
  const solid=(x,z,w,d,h,y=0)=>solids.push({x,z,w,d,h,y});
  function line(points,c=palette.ink,parent=group){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Line(g,new THREE.LineBasicMaterial({color:c}));parent.add(m);return m;}
  function glyph(x,y,z,size=.55,parent=group,c=palette.dark) {
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
    const style=Math.floor(rand()*6);
    if(style===0){line([[-size*.3,0,.01],[0,size*.65,.01],[size*.3,0,.01],[-size*.3,0,.01]],c,g);line([[0,.15,0],[0,-size*.3,0]],c,g);}
    else if(style===1){const r=mesh(new THREE.TorusGeometry(size*.23,.025,4,12),c,0,size*.2,0,g,false);line([[-size*.35,-size*.2,0],[size*.35,-size*.2,0]],c,g);}
    else if(style===2){line([[-size*.4,.15,0],[-size*.1,.4,0],[size*.3,.18,0],[-size*.1,-.1,0],[-size*.4,.15,0]],c,g);line([[0,.08,0],[0,-.3,0],[.2,-.3,0]],c,g);}
    else if(style===3){line([[-size*.3,.4,0],[-size*.3,-.2,0],[size*.3,-.2,0],[size*.3,.4,0]],c,g);line([[-size*.3,.15,0],[size*.3,.15,0]],c,g);}
    else if(style===4){line([[-size*.3,.3,0],[0,.05,0],[size*.3,.3,0]],c,g);line([[0,.05,0],[0,-.25,0],[-size*.2,-.25,0]],c,g);}
    else {line([[-size*.35,.1,0],[size*.35,.1,0],[size*.15,.4,0],[-size*.1,.4,0]],c,g);line([[0,.1,0],[0,-.3,0],[size*.25,-.3,0]],c,g);}
    return g;
  }
  function frieze(x,z,w,y=3,parent=group){box(x,y,z,w,.28,.22,palette.gold,parent);for(let i=0;i<Math.floor(w/.8);i++) glyph(x-w/2+.45+i*.8,y-.5,z+.14,.45,parent);}
  function column(x,z,height=4,r=.65,c=palette.stone,parent=group,collide=true){
    box(x,.15,z,r*2.8,.3,r*2.8,palette.dark,parent);
    cyl(x,.42,z,r*1.23,.35,palette.light,parent,8);
    cyl(x,height/2+.45,z,r,height-.5,c,parent,12,r*.84);
    for(let j=0;j<4;j++) {const a=j*Math.PI/2;box(x+Math.sin(a)*r*.88,height/2+.4,z+Math.cos(a)*r*.88,.045,height-.7,.045,palette.dark,parent,false);}
    cyl(x,height+.18,z,r*1.3,.35,palette.light,parent,8);
    box(x,height+.46,z,r*2.7,.22,r*2.7,palette.dark,parent);
    if(collide)solid(x,z,r*2.4,r*2.4,height);
  }
  function pot(x,z,r=.45,c=0xb66345,y=0,parent=group){
    const pts=[[0,0],[r*.62,0],[r*.94,r*.32],[r,r*.85],[r*.65,r*1.4],[r*.58,r*1.6],[r*.72,r*1.64],[r*.72,r*1.8],[r*.55,r*1.8],[r*.55,r*1.65]].map(p=>new THREE.Vector2(...p));
    return mesh(new THREE.LatheGeometry(pts,10),c,x,y,z,parent);
  }
  function crate(x,z,w=.85,y=0,parent=group){
    const q=box(x,y+w/2,z,w,w,w,0x96704a,parent);for(let i of [-1,1]){box(x+i*w*.38,y+w/2,z+w*.51,.1,w,.06,0x583c30,parent);box(x,y+w*.1,z+w*.53,w,.1,.06,0x583c30,parent);box(x,y+w*.9,z+w*.53,w,.1,.06,0x583c30,parent);}const a=box(x,y+w/2,z+w*.54,w*1.15,.085,.04,0x62402e,parent);a.rotation.z=.72;return q;
  }
  function torch(x,z,y=1.2,parent=group){
    cyl(x,y,z,.065,.9,0x583b2e,parent,6);
    const f=mesh(new THREE.ConeGeometry(.2,.6,5),glow(0xffbd52),x,y+.63,z,parent,false);const small=mesh(new THREE.ConeGeometry(.1,.35,5),glow(0xffedb0),x,y+.6,z,parent,false);
    torches.push({f,small,phase:rand()*6});
    const light=new THREE.PointLight(0xffb859,stage===3?12:3,7,2);light.position.set(x,y+1,z);parent.add(light);
  }
  function palm(x,z,s=1){
    const root=new THREE.Group();root.position.set(x,0,z);root.scale.setScalar(s);group.add(root);
    const trunk=cyl(0,2.35,0,.23,4.7,0x97623b,root,7,.16);trunk.rotation.z=.12;
    for(let k=0;k<7;k++){const a=k*Math.PI*2/7,leaf=new THREE.Group();root.add(leaf);leaf.position.set(-.28,4.7,0);leaf.rotation.y=a;const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.65,.45,2.3,-.75);shape.quadraticCurveTo(.4,-.1,0,0);const m=mesh(new THREE.ShapeGeometry(shape),new THREE.MeshToonMaterial({color:k%2?0x506e45:0x738b4e,side:THREE.DoubleSide}),0,0,0,leaf,false);m.rotation.y=Math.PI/2;for(let q=1;q<4;q++)line([[0,0,0],[0,-q*.08,q*.48]],0x37503c,leaf);}
    for(let k=0;k<3;k++)ball(-.1+rand()*.35,4.5,rand()*.4-.2,.18,0x705234,root);
    solid(x,z,.55*s,.55*s,4*s);
  }
  function obelisk(x,z,h=4.5){
    box(x,.25,z,1.5,.5,1.5,palette.dark);box(x,h/2+.5,z,.8,h,.8,palette.stone);
    const p=mesh(new THREE.ConeGeometry(.57,.85,4),palette.gold,x,h+.92,z);p.rotation.y=Math.PI/4;
    for(let j=0;j<5;j++)glyph(x,.9+j*.6,z+.413,.52);
    solid(x,z,1.3,1.3,h);
  }
  function carpet(x,z,w,d,c=0x994c49,parent=group){box(x,.035,z,w,.05,d,c,parent,false);box(x,.07,z,w-.25,.02,d-.25,0xcb985e,parent,false);box(x,.085,z,w-.4,.015,d-.4,c,parent,false);for(let i=0;i<5;i++){const a=box(x-w/2+.4+i*(w-.8)/4,.1,z,.2,.02,d*.6,0xdbbd79,parent,false);a.rotation.y=.3;}for(let i=0;i<Math.floor(w/.2);i++){box(x-w/2+i*.2,.04,z-d/2-.12,.055,.03,.24,0xd8be90,parent,false);box(x-w/2+i*.2,.04,z+d/2+.12,.055,.03,.24,0xd8be90,parent,false);}}
  function flag(x,z,c=0x397d80,parent=group,y=4.8){
    cyl(x,y/2,z,.06,y,0x614732,parent,6);
    const cloth=box(x+.55,y-.45,z,1.1,.75,.055,c,parent,false);animated.push({kind:'flag',m:cloth,phase:rand()*6});
    const tri=new THREE.Shape();tri.moveTo(0,0);tri.lineTo(.35,.35);tri.lineTo(0,.7);tri.closePath();mesh(new THREE.ShapeGeometry(tri),mat(c),x+1.1,y-.82,z,parent,false);
  }
  function stall(x,z,c){
    const root=new THREE.Group();root.position.set(x,0,z);group.add(root);
    for(const a of [-1,1])for(const b of [-1,1])cyl(a*1.8,1.45,b*1.4,.065,2.9,0x745138,root,6);
    // Alternating broad canvas stripes and scalloped valance.
    for(let k=0;k<7;k++){const cloth=box(-1.65+k*.55,2.93,0,.57,.08,3.35,k%2?0xe9cf97:c,root,false);cloth.rotation.x=-.10;box(-1.65+k*.55,2.6,1.62,.55,.5,.08,k%2?0xe9cf97:c,root,false);}
    box(0,.75,0,3.8,1.5,1.15,0x9b6c48,root);box(0,1.53,0,4,.12,1.4,0xe1bd80,root);
    for(let j=0;j<7;j++)pot(-1.5+j*.47,.05,.16,j%2?0xa2533c:0xceab68,1.6,root);
    for(let j=0;j<3;j++)crate(-1.5+j*1.3,-1, .72,0,root);
    solid(x,z,3.9,1.5,1.7);
  }
  function rock(x,z,r=1,c=palette.dark,y=0){const m=mesh(new THREE.DodecahedronGeometry(r,0),c,x,y+r*.55,z);m.scale.y=.65;m.rotation.set(rand(),rand()*3,rand()*.2);return m;}
  function sign(text, subtitle, x, y, z, width=1.8, height=.95, parent=group) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#d9bc7b';ctx.fillRect(0,0,512,256);
    ctx.strokeStyle='#584432';ctx.lineWidth=9;ctx.strokeRect(8,8,496,240);
    ctx.textAlign='center';ctx.fillStyle='#3c4137';ctx.font='bold 92px Georgia';ctx.fillText(text,256,116);
    ctx.font='bold 44px Georgia';ctx.fillText(subtitle,256,192);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const m=mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),x,y,z,parent,false);
    box(x,y,z-.045,width+.1,height+.1,.08,palette.dark,parent);return m;
  }
  function merchant(x,z){
    const root=new THREE.Group();root.position.set(x,0,z);group.add(root);props.merchant=root;
    cyl(0,.65,0,.43,1.2,0x4b7880,root,9,.28);cyl(0,.13,0,.46,.18,0x32515c,root,9);
    box(0,.96,.27,.64,.12,.12,0xddb45d,root);box(0,1.13,.19,.2,.42,.15,0xa95245,root);
    for(const side of [-1,1]){const arm=cyl(side*.37,1.04,0,.11,.6,0x739a98,root,7);arm.rotation.z=side*.38;ball(side*.48,.77,.04,.13,0xbb845f,root);box(side*.2,.09,.16,.27,.17,.42,0x523d32,root);}
    ball(0,1.47,0,.265,0xbb845f,root);cyl(0,1.71,0,.31,.26,0xf1d493,root,10);cyl(0,1.85,0,.21,.15,0xe0bd7e,root,10);
    for(const side of [-1,1]){ball(side*.09,1.52,.235,.027,0x312d2a,root);const brow=box(side*.09,1.58,.24,.1,.025,.025,0x312d2a,root);brow.rotation.z=side*.12;}
    box(0,1.38,.25,.22,.05,.045,0x513b2e,root);box(0,1.48,.27,.07,.12,.07,0xcc9870,root);
    // A flute, folded chute, and shovel make the inventory kit tangible.
    crate(x-1.4,z-.4,.7);cyl(x-1.4,.92,z-.4,.065,1,0xd8ba75).rotation.z=Math.PI/2;
    box(x-1.3,.47,z+.7,.6,.7,.35,0x9b6b4c);box(x-1.3,.54,z+.9,.65,.12,.08,0xd7be87);
    const shovel=cyl(x-2,.7,z-.3,.04,1.4,0x6d4c35);shovel.rotation.z=.28;box(x-2.18,.12,z-.3,.3,.36,.055,0x587579);
    animated.push({kind:'merchant',m:root,phase:0});
  }
  function dartCrossing(z){
    const root=new THREE.Group();group.add(root);props.darts=root;
    const warningMat=new THREE.MeshBasicMaterial({color:0x816041});const lamps=[];
    for(let i=0;i<20;i++){const x=-9.5+i;box(x,.065,z,.68,.04,.2,warningMat,root,false);}
    for(const side of [-1,1]){const x=side*10.4;box(x,.8,z,.65,1.6,1.9,palette.dark,root);box(x,1.65,z,.9,.18,2.1,palette.light,root);for(let j=0;j<3;j++){box(x-side*.34,.45+j*.4,z,.05,.15,.85,0x142b32,root);const lamp=ball(x,1.85,z-.6+j*.6,.09,warningMat,root);lamps.push(lamp);}}
    const bolts=[];for(let i=0;i<7;i++){const bolt=new THREE.Group();root.add(bolt);const shaft=cyl(0,0,0,.025,1.2,0xa78b5b,bolt,5);shaft.rotation.z=Math.PI/2;const point=mesh(new THREE.ConeGeometry(.07,.28,4),0xe9dec0,.7,0,0,bolt);point.rotation.z=-Math.PI/2;box(-.45,0,0,.25,.15,.025,0x9a5143,bolt);bolts.push(bolt);}
    trapVisual={root,warningMat,bolts,z};return root;
  }
  function templeFront(z=-11.7,w=26){
    box(-w/4-1.6,3.0,z,w/2-3.2,6,2.2,palette.stone);box(w/4+1.6,3,z,w/2-3.2,6,2.2,palette.stone);
    box(0,6.2,z,6.2,1.1,2.6,palette.light);box(0,6.85,z,7,.3,2.8,palette.dark);
    box(0,2.65,z-.7,4.3,5.3,.3,stage===3?0x0e202b:0x39454a);
    for(const s of [-1,1]){box(s*2.55,2.6,z+.45,.7,5.2,.6,palette.dark);box(s*2.55,2.6,z+.78,.38,5.2,.1,palette.light);for(let j=0;j<6;j++)glyph(s*2.55,.5+j*.75,z+.85,.5);column(s*7,z+1.2,5.2,.78);}
    frieze(-8,z+1.15,8.5,5.2);frieze(8,z+1.15,8.5,5.2);
    // Sun disk and stone wings.
    mesh(new THREE.TorusGeometry(.68,.13,5,24),palette.gold,0,6.2,z+1.36);
    for(let s of [-1,1])for(let i=0;i<5;i++){const b=box(s*(1+i*.3),6.16-i*.05,z+1.35,.19,.58-i*.05,.15,palette.gold);b.rotation.z=s*-.55;}
    for(let i=0;i<3;i++)box(0,.07+i*.1,z+2.3-i*.25,4.8,.14,.65,palette.light);
    solid(-8,z,9,2.6,6);solid(8,z,9,2.6,6);
  }
  function dunes(){
    for(let i=0;i<10;i++){const x=(i-4.5)*8,z=-24-rand()*14;const hill=mesh(new THREE.SphereGeometry(6+rand()*4,12,5,0,Math.PI*2,0,Math.PI/2),i%2?0xc58b62:0xd9a672,x,-1.5,z,group,false);hill.scale.z=.6;hill.scale.y=.28;}
    for(let i=0;i<3;i++){const p=mesh(new THREE.ConeGeometry(7-i*1.3,9-i,4),0xbb8a64,-24+i*10,-.7+4-i*.5,-34-i*6,group,false);p.rotation.y=Math.PI/4;}
    // Teal horizon silhouettes frame the sand rather than a flat back wall.
  }
  if(stage===2){
    box(-8,-1.15,0,12,2.3,26,palette.dark);box(8.5,-1.15,0,11,2.3,26,palette.dark);
    box(-8,-.12,0,12,.25,26,palette.sand);box(8.5,-.12,0,11,.25,26,palette.sand);
    box(.5,-5,0,5,1,30,0x43626c,group,false);
    for(let k=0;k<15;k++){box(-2.25-rand()*.4,-.5-k*.18,-12+k*1.8,.5,.35,.8,0xb87d4d);box(3.2+rand()*.35,-.5-k*.18,-12+k*1.8,.5,.35,.8,0xca935c);}
  } else {
    box(0,-1.0,0,29,1.8,27,palette.dark);box(0,-.18,0,29,.22,27,palette.stone);box(0,-.035,0,28.6,.12,26.6,palette.sand);
    for(let i=0;i<19;i++)box(-13.2+i*1.45,-.55,13.52,1.15,.25,.05,i%2?palette.dark:palette.stone,group,false);
  }
  // Fine weathered fragments, dry tufts, and cobbles.
  for(let i=0;i<90;i++){
    let x=(rand()-.5)*27,z=(rand()-.5)*24;
    if(stage===2&&x>-2.5&&x<3.5)continue;
    if(rand()>.5){const s=.08+rand()*.15;const b=box(x,.02,z,s,.03,s*.55,stage===3?0x627777:0xc28f56,group,false);b.rotation.y=rand()*3;}
    else if(Math.abs(x)>9){for(let q=0;q<3;q++){const t=box(x+q*.05,.1,z,.025,.2+rand()*.17,.025,stage===3?0x4b7473:0x9c8c51,group,false);t.rotation.z=(q-1)*.4;}}
  }
  if(stage===0){
    dunes();templeFront();
    stall(-10,1.7,0xa54d49);stall(10,-.8,0x398084);
    carpet(-6,0,3.4,4.5,0xa95243);carpet(6,1,2.7,3,0x3f7774);merchant(-6,0);
    palm(-12,7,1.2);palm(11,7,.95);palm(-12,-6,.8);palm(12,-7,1.15);
    obelisk(-10,-7,3.5);
    for(let i=0;i<8;i++){pot(8.5+rand()*3,5+rand()*2,.25+rand()*.3,[0xb96747,0xc49663,0x768379][i%3]);pot(-11+rand()*3,-4+rand()*1.6,.25+rand()*.3);}
    for(let i=0;i<4;i++)crate(8.8+i*.85,7.5,.72+(i%2)*.2);
    // Resting pack camel, angular saddle and rolled blankets.
    const camel=new THREE.Group();camel.position.set(-10,0,8.5);camel.rotation.y=-.5;group.add(camel);
    const body=ball(0,.75,0,.8,0xb78c59,camel);body.scale.set(1.6,.8,.7);ball(-.4,1.2,0,.4,0xaa784a,camel);ball(.4,1.2,0,.4,0xaa784a,camel);
    const neck=cyl(.95,1.2,0,.2,1.2,0xb78c59,camel,6);neck.rotation.z=-.6;box(1.25,1.8,0,.6,.3,.35,0xc09664,camel);
    box(0,1.35,0,1.2,.15,1.1,0x8d4141,camel);cyl(-.2,1.55,0,.22,1.2,0x3d747a,camel,8).rotation.x=Math.PI/2;
    flag(-8,-4,0xa94740);flag(8,3,0x3b7b80);
    for(const x of [-3.5,3.5])torch(x,-8,1);
    // Winding hand-laid paving leads towards the dark temple doorway.
    for(let j=0;j<10;j++)for(let k=-1;k<=1;k++){const p=box(k*.85+(rand()-.5)*.2,.015,8-j*1.7,.75,.025,1.1,0xd4a86e,group,false);p.rotation.y=(rand()-.5)*.15;}
  }
  if(stage===1){
    templeFront(-12);group.children[0].material=mat(0x465f66);group.children[2].material=mat(0xb3986f);
    for(const x of [-10,10])for(const z of [-7,0,7])column(x,z,4.5,.7);
    box(-10,5.0,0,1.8,.55,16,palette.light);
    // The tiny valley is a physical map, with three mesas under a brass orbit.
    const map=new THREE.Group();map.position.set(0,0,1);group.add(map);props.map=map;
    cyl(0,.25,0,2.1,.5,0x4b6a6d,map,12);cyl(0,.54,0,1.9,.1,0xe1c78b,map,12);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const p=mesh(new THREE.CylinderGeometry(.3,.5,.4+(i%2)*.2,5),0xb97b4e,Math.sin(a)*1.2,.75,Math.cos(a)*1.2,map);}
    const orbit=mesh(new THREE.TorusGeometry(2.2,.045,4,48),palette.gold,0,1.1,0,map,false);orbit.rotation.x=Math.PI/2;
    const inner=mesh(new THREE.TorusGeometry(1.6,.03,4,36),palette.gold,0,1.12,0,map,false);inner.rotation.x=Math.PI/2;
    props.dials=[];
    for(const [i,x,z] of [[0,-6,-2],[1,0,-5],[2,6,-2]]){
      box(x,.18,z,1.9,.35,1.9,palette.dark);box(x,.8,z,1.25,1.1,1.25,0x548080);box(x,1.45,z,1.55,.22,1.55,palette.light);
      for(let j=0;j<2;j++)glyph(x,.6+j*.45,z+.64,.6,group,0x233f43);
      const dial=new THREE.Group();dial.position.set(x,1.68,z);group.add(dial);props.dials.push(dial);
      cyl(0,.05,0,.68,.2,palette.gold,dial,8);box(0,.25,-.24,.16,.25,.7,0x71452f,dial);const gem=mesh(new THREE.OctahedronGeometry(.15),glow(0xffe5a0),0,.42,-.52,dial,false);
      solid(x,z,1.4,1.4,1.6);
      sign(['I','II','III'][i],['DAWN','NOON','DUSK'][i],x,2.65,z-.06,1.75,.85);
      const tile=box(x,.035,z+1.8,1.2,.045,1.2,0x54797b);glyph(x,.06,z+1.8,.75).rotation.x=-Math.PI/2;
    }
    // The clue is carved into three stelae facing the player.
    for(const [i,x] of [-3,0,3].entries()){box(x,1.9,-10.3,1.45,2.5,.45,0x53797a);for(let k=0;k<3;k++)glyph(x,1.25+k*.6,-10.04,.6,group,0xdac78e);}
    for(const x of [-8,8])for(const z of [-9,5])torch(x,z,1.5);
    for(let j=0;j<6;j++)box(-4+j*1.6,.015,6,1.4,.035,1.4,j%2?0x72918b:0xc7b184,group,false);
    dartCrossing(4);
  }
  if(stage===2){
    dunes();
    for(const s of [-1,1])for(let j=0;j<5;j++){const x=s*(13.5+rand()*5),z=-13+j*6;const h=5+rand()*7;const m=mesh(new THREE.CylinderGeometry(1.8,3,h,6),j%2?0xb97c51:0xcf9563,x,h/2-2,z);for(let k=0;k<3;k++)cyl(x,h/2-1+k,z,2.15,.15,0xddad79,group,6);}
    for(const x of [-8,8]){for(let j=0;j<3;j++){box(x,.04,-9+j*.65,3.5,.08,.45,palette.light);}}
    // Rope anchor is a sun-battered stone crane above the gorge.
    const anchor=new THREE.Group();anchor.position.set(-2,0,1);group.add(anchor);props.anchor=anchor;
    box(-2.3,2.8,0,.65,5.6,.65,palette.stone,anchor);box(-.9,5.5,0,3.5,.5,.65,palette.light,anchor);
    const hook=mesh(new THREE.TorusGeometry(.38,.09,5,16),palette.gold,0,5.2,0,anchor);hook.rotation.y=Math.PI/2;
    line([[0,5.2,0],[-1,2.5,0],[-1.5,.15,0]],0x64432f,anchor);
    flag(-5,3,0xac5149);flag(6,3,0x4b8584);
    // Parachute landing canopy snagged over a camp on the right plateau.
    const canopy=mesh(new THREE.SphereGeometry(1.4,8,4,0,Math.PI*2,0,Math.PI/2),new THREE.MeshToonMaterial({color:0xe6cf9d,side:THREE.DoubleSide}),9,3,5);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[9+Math.sin(a)*1.4,3,5+Math.cos(a)*1.4],[9,1.2,5]],0x6e5540);}
    crate(10,6,.8);pot(10.7,5,.4);carpet(-8,7,2.4,2.6,0x8e5143);
    // Excavation frame: suspended screen, golden sand and discarded tools.
    box(8,.02,-5,3,.05,3,0xba8757);for(let i=0;i<8;i++){const a=i*Math.PI/4;rock(8+Math.sin(a)*1.5,-5+Math.cos(a)*1.5,.35,0xddb77b);}
    cyl(10.3,.4,-4,.045,.9,0x60422d).rotation.z=-.5;box(10.1,.1,-4,.3,.3,.08,0x52777a);
    const gate=new THREE.Group();gate.position.set(8,0,-11);group.add(gate);for(const x of [-2,2]){box(x,2,0,1.2,4,1.3,palette.stone,gate);for(let i=0;i<4;i++)glyph(x,.8+i*.7,.67,.5,gate);}box(0,4.2,0,5.4,.65,1.5,palette.light,gate);box(0,2.1,-.6,2.8,4.2,.1,0x304650,gate);mesh(new THREE.TorusGeometry(.45,.08,5,18),palette.gold,0,4.2,.81,gate);solid(6,-11,1.3,1.5,4);solid(10,-11,1.3,1.5,4);
    for(let i=0;i<9;i++)rock(-11+rand()*4,-6+rand()*7,.3+rand()*.5);
    for(let i=0;i<8;i++)rock(10+rand()*2,-3+rand()*8,.3+rand()*.4);
  }
  if(stage===3){
    // A vault of blue-black sandstone, with gold revealing the path.
    box(0,3,-12,28,6,1.4,0x243b48);for(let i=0;i<17;i++)frieze(-12+i*1.5,-11.25,1.2,4.8);
    for(const x of [-11,11])for(const z of [-8,-1,6])column(x,z,4.6,.7,0x3c5966);
    box(-11,5,0,2,.6,21,0x6e8581);
    for(const x of [-8,8])for(const z of [-8,0,7])torch(x,z,1.1);
    // Monumental guardian statues, intentionally offset from the player's lane.
    for(const s of [-1,1]){const st=new THREE.Group();st.position.set(s*5.7,0,-8.5);group.add(st);box(0,.25,0,2,.5,2,0x1d3542,st);box(0,1.6,0,1.35,2.4,1,0x557781,st);box(0,3.1,0,1.1,.8,1.15,0x557781,st);const snout=box(0,3.08,.8,.55,.45,1.1,0x557781,st);for(const a of [-1,1]){const ear=mesh(new THREE.ConeGeometry(.24,1.2,4),0x557781,a*.38,4,0,st);box(a*.26,3.27,.59,.15,.07,.04,glow(0xffd06c),st,false);box(a*.75,1.5,0,.25,1.5,.4,0x45636e,st);}box(0,2.1,.55,1.3,.18,.1,palette.gold,st);solid(s*5.7,-8.5,2,2,4);}
    for(let j=0;j<3;j++)box(0,.08+j*.16,-6.8-j*.25,5.3-j*.5,.16,3.3-j*.3,0x6c817c);
    const ark=new THREE.Group();ark.position.set(0,.55,-7);group.add(ark);props.ark=ark;
    box(0,.65,0,2.7,1.2,1.4,palette.gold,ark);box(0,1.3,0,3,.18,1.65,0xf4cd6d,ark);box(0,.1,0,2.95,.22,1.6,0xb97a32,ark);
    for(const s of [-1,1]){box(s*1.1,.7,.72,.18,1.1,.1,0x9d672e,ark);box(s*1.1,.7,-.72,.18,1.1,.1,0x9d672e,ark);const rail=cyl(0,.8,s*.95,.07,4.4,0xb7782f,ark,8);rail.rotation.z=Math.PI/2;
      // Winged geometric guardians above the lid.
      const body=mesh(new THREE.ConeGeometry(.28,.7,5),0xffdc79,s*.8,1.68,0,ark);for(let w=0;w<4;w++){const feather=box(s*(.8-w*.13),1.95+w*.1,0,.17,.7-w*.07,.1,0xffdc79,ark);feather.rotation.z=s*(.4+w*.16);}ball(s*.8,2.14,0,.17,0xffdc79,ark);}
    for(let i=0;i<4;i++)glyph(-.9+i*.6,.6,.711,.4,ark,0x9d672e);
    const aura=mesh(new THREE.TorusGeometry(2,.025,4,64),glow(0xeac676),0,.45,-7,group,false);aura.rotation.x=Math.PI/2;animated.push({kind:'aura',m:aura,phase:0});
    const light=new THREE.PointLight(0xffcf70,18,10,2);light.position.set(0,3,-7);group.add(light);
    for(let i=0;i<9;i++){const p=box(0,.02,9-i*1.5,2,.04,1.1,i%2?0x5b7779:0x9f926a,group,false);}
    // Scattered bones and broken offerings give the cold chamber its own character.
    for(let i=0;i<16;i++){const x=(rand()>.5?1:-1)*(7+rand()*2),z=-7+rand()*16;const b=cyl(x,.08,z,.055,.4+rand()*.4,0xc3c3a7,group,5);b.rotation.z=Math.PI/2;ball(x-.24,.08,z,.09,0xc3c3a7);pot(x+.5,z+.5,.2+rand()*.2,0x617475);}
    // Extraction gateway.
    for(const x of [-2.5,2.5])box(x,1.7,12,.9,3.4,1,0x667e7b);flag(-3,10,0xc09248,group,3.5);
    dartCrossing(4);trapState.enabled=false;
  }
  // Dust motes are geometry, so they remain visible with either rendering backend.
  const dustGeo=new THREE.BufferGeometry();const dustArray=new Float32Array(150*3);for(let i=0;i<150;i++){dustArray[i*3]=(rand()-.5)*29;dustArray[i*3+1]=.5+rand()*7;dustArray[i*3+2]=(rand()-.5)*27;}dustGeo.setAttribute('position',new THREE.BufferAttribute(dustArray,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:stage===3?0xe5cc8e:0xffe7b1,size:.045,transparent:true,opacity:.5,sizeAttenuation:true}));group.add(dust);
  return {group,solids,props,
    update(t,dt){for(const o of torches){o.f.scale.set(1+Math.sin(t*8+o.phase)*.12,1+Math.sin(t*13+o.phase)*.17,1);o.small.scale.y=1+Math.sin(t*11+o.phase)*.2;}for(const o of animated){if(o.kind==='flag')o.m.rotation.y=Math.sin(t*1.8+o.phase)*.12;else if(o.kind==='merchant')o.m.rotation.y=Math.sin(t*.7)*.09;else if(o.kind==='aura'){o.m.scale.setScalar(1+Math.sin(t*2)*.05);o.m.rotation.z=t*.12;}}dust.rotation.y=Math.sin(t*.04)*.035;dust.position.y=Math.sin(t*.3)*.15;
      if(trapVisual){const clock=stage===3?trapState.escapeTime*1.5:trapState.time;const period=stage===3?1:3.8;const phase=((clock%period)+period)%period;const warning=trapState.enabled&&phase>period-(stage===3?.4:.8);trapVisual.warningMat.color.setHex(warning?(Math.sin(t*22)>0?0xffd273:0xb57836):0x735b40);for(let i=0;i<trapVisual.bolts.length;i++){const b=trapVisual.bolts[i];b.visible=trapState.enabled&&phase<.23;b.position.set(-11+phase/.23*22-i*.17,.45+(i%3)*.4,trapVisual.z+(i%3-1)*.25);}}
    },
    dispose(){scene.remove(group);const gs=new Set(),ms=new Set();group.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>ms.add(m));else ms.add(o.material);}});gs.forEach(g=>g.dispose());ms.forEach(m=>{m.map?.dispose();m.dispose();});}
  };
}
