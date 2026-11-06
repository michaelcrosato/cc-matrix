import * as THREE from 'three/webgpu';
import { color, normalWorld, vec3, mix, step } from 'three/tsl';

const WRAP = 220;
const INK = 0x25313a;
const P = { ink: INK, cream: 0xffecc6, teal: 0x2ba8a0, tealLight: 0x84ded0, red: 0xe9634d, navy: 0x253a4d, yellow: 0xffcc67, purple: 0x77617c };
const wrap = (x) => ((x + WRAP / 2) % WRAP + WRAP) % WRAP - WRAP / 2;
let randomSeed = 71833;
const random = () => ((randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0) / 4294967296);
const range = (a,b) => a+(b-a)*random();

export async function createVisuals(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7dba8);
  const camera = new THREE.OrthographicCamera(-51,51,29,-29,.1,450);
  const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  await renderer.init();
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','The desert airspace and supply convoy');
  renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;';

  const inkMat = new THREE.MeshBasicMaterial({color:INK, side:THREE.BackSide});
  const edgeMat = new THREE.LineBasicMaterial({color:INK,transparent:true,opacity:.72});
  const materials = new Map();
  function mat(hex,flat=false) {
    const k=String(hex)+flat;
    if(materials.has(k)) return materials.get(k);
    const m = new THREE.MeshBasicNodeMaterial();
    if(flat) {m.colorNode=color(hex);m.side=THREE.DoubleSide;}
    else {
      const shade=normalWorld.dot(vec3(.32,.72,.61));
      m.colorNode=mix(color(hex).mul(.53),color(hex).mul(.82),step(-.08,shade));
      m.colorNode=mix(m.colorNode,color(hex),step(.42,shade));
    }
    materials.set(k,m);return m;
  }
  function part(parent,geo,hex,x=0,y=0,z=0,outline=true) {
    const mesh=new THREE.Mesh(geo,mat(hex));
    mesh.position.set(x,y,z); parent.add(mesh);
    if(outline) {
      const outlineMesh=new THREE.Mesh(geo,inkMat);outlineMesh.scale.setScalar(1.035);mesh.add(outlineMesh);
    }
    return mesh;
  }
  const box=(p,w,h,d,c,x=0,y=0,z=0,o=true)=>part(p,new THREE.BoxGeometry(w,h,d),c,x,y,z,o);
  function ell(p,rx,ry,rz,c,x=0,y=0,z=0,o=true) {
    const m=part(p,new THREE.SphereGeometry(1,16,10),c,x,y,z,o);m.scale.set(rx,ry,rz);return m;
  }
  function cyl(p,r1,r2,h,c,x=0,y=0,z=0,o=true) {return part(p,new THREE.CylinderGeometry(r1,r2,h,10),c,x,y,z,o);}
  function rod(p,a,b,r,c) {
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);
    const m=cyl(p,r,r,v.length(),c,...av.clone().add(bv).multiplyScalar(.5).toArray());
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;
  }
  function shape(parent,pts,c,z=0,edge=false) {
    const s=new THREE.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(s),mat(c,true));mesh.position.z=z;parent.add(mesh);
    if(edge) {
      const g=new THREE.BufferGeometry().setFromPoints([...pts,pts[0]].map(([x,y])=>new THREE.Vector3(x,y,z+.04)));
      parent.add(new THREE.Line(g,edgeMat));
    }return mesh;
  }
  function animate(root,tracks,duration=1) {
    const mixer=new THREE.AnimationMixer(root);
    mixer.clipAction(new THREE.AnimationClip('mechanical',duration,tracks)).play();root.userData.mixer=mixer;return root;
  }
  function rotor(parent,name,x,y,z,size=3.3) {
    cyl(parent,.13,.2,.6,INK,x,y-.12,z);
    const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);
    box(g,size*2,.075,.24,P.navy,0,0,0);box(g,.24,.075,size*2,P.navy,0,0,0);
    box(g,.6,.09,.28,P.cream,size-.3,.01,0,false);box(g,.6,.09,.28,P.cream,-size+.3,.01,0,false);
    ell(g,.31,.18,.31,P.cream,0,.1,0);
    return new THREE.NumberKeyframeTrack(`${name}.rotation[y]`,[0,.12],[0,Math.PI*2]);
  }
  function helicopter(type='player',id=0) {
    const root=new THREE.Group(),hull=new THREE.Group();root.add(hull);root.userData.hull=hull;
    const enemy=type==='enemy',base=enemy?P.red:(id===1||id==='p1')?P.yellow:P.teal;
    ell(hull,2.15,1.04,.95,base,0,.05,0);
    ell(hull,1.10,.86,.86,P.navy,1.12,.18,.07);
    // Pale front panes and an unmistakable ink window division.
    shape(hull,[[.58,.85],[1.28,.84],[1.94,.42],[1.98,.06],[.58,.06]],0xa6d6ce,.848,true);
    rod(hull,[1.2,.85,.88],[1.2,.07,.92],.055,INK);
    box(hull,1.45,.18,1.68,P.cream,-.45,-.63,.05);
    box(hull,.19,.62,.045,P.cream,-.75,.12,.98,false);
    box(hull,.62,.19,.045,P.cream,-.75,.12,.98,false);
    // Tail boom, fin, turbine, laser pod, landing skids.
    const boom=box(hull,3.2,.31,.36,base,-3,.48,0);boom.rotation.z=-.07;
    shape(hull,[[-4.6,.4],[-4.5,2.04],[-3.84,1.72],[-3.66,.4]],base,.12,true);
    box(hull,1.4,.13,1.72,base,-3.55,.57,0);
    ell(hull,.98,.44,.55,P.navy,-.44,1.04,0);
    cyl(hull,.27,.3,.45,P.cream,-.8,1.37,0);
    const exhaust=cyl(hull,.22,.22,.65,INK,-1.52,.98,0);exhaust.rotation.z=Math.PI/2;
    box(hull,1.62,.3,.32,INK,1.42,-.71,.78);
    box(hull,.32,.17,.2,P.yellow,2.35,-.7,.78);
    for(const z of [-.83,.83]) {
      rod(hull,[-1.2,-.65,z*.6],[-1.5,-1.27,z],.075,INK);
      rod(hull,[.85,-.65,z*.6],[.7,-1.27,z],.075,INK);
      rod(hull,[-2,-1.25,z],[1.6,-1.25,z],.10,P.navy);
      rod(hull,[1.6,-1.25,z],[1.87,-.99,z],.10,P.navy);
    }
    const tracks=[rotor(hull,'mainRotor',-.32,1.8,0,3.55)];
    if(!enemy) {
      const flash=shape(hull,[[2.35,-.7],[2.7,-.49],[3.06,-.67],[2.75,-.75],[2.94,-1.02],[2.59,-.86]],P.yellow,1.02);
      flash.name='muzzleFlash';flash.visible=false;
    }
    const tail=new THREE.Group();tail.position.set(-4.4,.87,.33);tail.name='tailRotor';hull.add(tail);
    box(tail,.12,1.45,.11,P.navy);box(tail,1.45,.12,.11,P.navy);
    tracks.push(new THREE.NumberKeyframeTrack('tailRotor.rotation[z]',[0,.1],[0,Math.PI*2]));
    if(enemy) root.scale.setScalar(.82);
    animate(root,tracks,.12);
    return root;
  }
  function jet() {
    const g=new THREE.Group();
    ell(g,2.5,.47,.48,P.red);
    const nose=part(g,new THREE.ConeGeometry(.46,1.6,10),P.cream,2.2,0,0);nose.rotation.z=-Math.PI/2;
    ell(g,.95,.44,.34,P.navy,.45,.4,.02);
    const wing=shape(g,[[-1.25,-.02],[-1.7,-.27],[.2,-.3],[1.1,.03],[-.6,.16]],P.red,.4,true);
    box(g,.9,.1,4.3,P.red,-.45,-.02,0);
    shape(g,[[-2,.13],[-2.04,1.22],[-1.4,1.06],[-.8,.14]],P.navy,.12,true);
    box(g,.78,.11,1.8,P.navy,-1.8,.1,0);
    ell(g,.6,.24,.24,P.yellow,-2.8,0,0,false);
    g.userData.flame=g.children[g.children.length-1];
    return g;
  }
  function boss() {
    const g=new THREE.Group();
    ell(g,8.2,2.4,2.2,P.navy,0,.8,0);
    ell(g,7.65,1.88,2.22,P.red,.1,1.18,0);
    box(g,10,.9,3.9,P.cream,-.2,-.65,0);
    for(let i=-3;i<=3;i++) {
      const strip=box(g,.14,2.8,.06,P.navy,i*1.8,1.4,2.19,false);strip.rotation.z=-.13;
      ell(g,.19,.19,.08,P.yellow,i*1.8,-.65,2.04,false);
    }
    ell(g,2.1,.78,.8,P.navy,1.8,-1.25,.5);
    shape(g,[[.5,-1.6],[3.6,-1.6],[3.5,-.92],[1.1,-.8]],0x82c5c1,1.32,true);
    shape(g,[[-6,1.5],[-8.6,4],[-7,4.2],[-4.4,2]],P.red,.1,true);
    box(g,3,.22,7.5,P.navy,-5,.5,0);
    const tracks=[];
    for(let i=0;i<4;i++) {
      const x=-5.6+i*3.6;
      tracks.push(rotor(g,'bossRotor'+i,x,3.6,0,2.2));
      box(g,1.6,.85,1.6,P.red,x,-1.35,.1);
      for(const z of [-.42,.42]) {
        const tube=cyl(g,.18,.18,.7,INK,x+.4,-1.9,z+.1);tube.rotation.z=.15;
      }
    }
    animate(g,tracks,.16);return g;
  }
  function truck() {
    const g=new THREE.Group();
    box(g,4.1,.35,1.65,P.navy,0,-.35,0);
    box(g,2.75,1.55,1.65,0xd2be83,-.55,.54,0);
    box(g,1.15,1.28,1.65,P.teal,1.28,.42,0);
    box(g,.85,.53,.035,0x8ed8cc,1.34,.68,.85);
    box(g,.14,.6,.05,P.navy,1.3,.64,.89,false);
    box(g,.2,.2,.05,P.yellow,1.84,.05,.88,false);
    box(g,.92,.12,.1,P.cream,1.32,-.18,.9,false);
    box(g,.78,.17,.035,0xf8edd3,-.55,.52,.86,false);
    box(g,.17,.78,.035,0xf8edd3,-.55,.52,.86,false);
    for(let i=-1;i<=1;i++)box(g,.08,1.45,.05,0xad976b,-.55+i*.8,.54,.86,false);
    const tracks=[];
    for(let i=0;i<2;i++)for(let j=0;j<2;j++) {
      const z=j?.86:-.86,x=i?1.18:-1.25;
      const w=cyl(g,.53,.53,.30,P.navy,x,-.65,z);w.rotation.x=Math.PI/2;
      const hub=cyl(g,.22,.22,.32,P.cream,x,-.65,z);hub.rotation.x=Math.PI/2;
      const spoke=box(g,.61,.10,.035,P.navy,x,-.65,z+(j?.18:-.18),false);spoke.name=`wheel${i}${j}`;
      tracks.push(new THREE.NumberKeyframeTrack(`${spoke.name}.rotation[z]`,[0,.8],[0,Math.PI*2]));
    }
    return animate(g,tracks,.8);
  }
  function bullet(data) {
    const g=new THREE.Group();
    if(data.owner==='player') {
      box(g,2.2,.19,.19,P.tealLight,0,0,0,false);
      box(g,1.65,.065,.22,P.cream,.18,0,.07,false);
    } else {
      ell(g,data.kind==='split'?.3:.55,.23,.23,P.red);
      box(g,.4,.14,.16,P.yellow,-.55,0,0,false);
      for(let i=1;i<4;i++)ell(g,.19+i*.025,.13+i*.02,.13,0xe7a665,-.5-i*.38,0,0,false);
    }return g;
  }
  function pickup(type) {
    const g=new THREE.Group();
    const plate=cyl(g,1.02,1.02,.22,type==='repair'?P.teal:P.yellow);plate.rotation.x=Math.PI/2;
    if(type==='repair') {box(g,1.1,.25,.08,P.cream,0,0,.22);box(g,.25,1.1,.08,P.cream,0,0,.22);}
    else shape(g,[[-.5,.55],[.5,.55],[.42,-.15],[0,-.62],[-.42,-.15]],P.navy,.23,true);
    animate(g,[new THREE.NumberKeyframeTrack('.rotation[y]',[0,1.4,2.8],[0,Math.PI,Math.PI*2])],2.8);return g;
  }

  // A screen-printed desert, built in layers and wrapped continuously.
  const backdrop=new THREE.Group();scene.add(backdrop);
  const landscape=[];
  const sunRoot=new THREE.Group();sunRoot.position.set(30,36,-66);backdrop.add(sunRoot);
  const sun=new THREE.Mesh(new THREE.CircleGeometry(7.1,64),mat(0xfff2cb,true));sunRoot.add(sun);
  for(let i=0;i<5;i++) {
    const stripe=new THREE.Mesh(new THREE.PlaneGeometry(15,.12+i*.1),mat(0xf7dba8,true));stripe.position.set(0,-5+i*1.1,.2);sunRoot.add(stripe);
  }
  function mountain(x,width,height,z,col,parallax) {
    const g=new THREE.Group();g.position.set(x,0,z);backdrop.add(g);
    const pts=[[-width/2,0],[-width*.39,height*.25],[-width*.29,height*.28],[-width*.19,height*.9],[-width*.05,height],[width*.19,height*.98],[width*.28,height*.73],[width*.35,height*.73],[width*.44,height*.23],[width/2,0]];
    shape(g,pts,col);
    shape(g,[[width*.03,height*.98],[width*.19,height*.98],[width*.28,height*.73],[width*.35,height*.73],[width*.44,height*.23],[width/2,0],[width*.09,0]],new THREE.Color(col).multiplyScalar(.87).getHex(),.03);
    for(let j=0;j<4;j++) {
      const yy=height*(.16+j*.15),span=width*(.35-j*.045);
      box(g,span,.08,.03,new THREE.Color(col).multiplyScalar(.8).getHex(),range(-.15,.15)*width,yy,.07,false);
    }
    landscape.push({g,x,parallax,period:440});
  }
  for(let i=0;i<15;i++)mountain(-210+i*31,range(32,49),range(12,23),-48,0xb39b9d,.12);
  for(let i=0;i<16;i++)mountain(-220+i*29,range(20,38),range(7,17),-27,0xc78169,.32);
  for(let i=0;i<18;i++)mountain(-215+i*26,range(15,32),range(5,12),-13,0xd89967,.55);
  // Fine wispy clouds echo the scanner's horizontal lines.
  const clouds=[];
  for(let i=0;i<13;i++) {
    const g=new THREE.Group();const x=range(-220,220),y=range(28,48);g.position.set(x,y,-55);backdrop.add(g);
    for(let j=0;j<3;j++)box(g,range(4,11),.17,.04,0xf9e9c7,j*2,j*.5,0,false);
    clouds.push({g,x,parallax:.06,period:440});
  }
  const ground=new THREE.Group();scene.add(ground);
  box(ground,600,6,85,0xcc9962,0,-3.6,-9,false);
  box(ground,600,.18,13.5,0x9c795c,0,-.25,0,false);
  box(ground,600,.06,.18,0xe7bd7e,0,-.13,6.7,false);
  box(ground,600,.06,.18,0xe7bd7e,0,-.13,-6.7,false);
  const roadside=[];
  for(let i=0;i<55;i++) {
    const g=new THREE.Group();const x=-220+i*8.15;g.position.set(x,-.07,0);ground.add(g);
    box(g,2.8,.06,.18,0xf4d3a1,0,0,0,false);roadside.push({g,x,parallax:1,period:440});
  }
  for(let i=0;i<36;i++) {
    const g=new THREE.Group();const x=range(-220,220),z=i%2?range(8,25):range(-13,-8);g.position.set(x,-.3,z);ground.add(g);
    if(i%3===0) {
      const height=range(1.8,3.2);
      cyl(g,.22,.27,height,0x727e58,0,height/2,0);
      const side=i%2?1:-1;
      rod(g,[0,height*.48,0],[side*.68,height*.48,0],.16,0x727e58);
      rod(g,[side*.68,height*.48,0],[side*.68,height*.78,0],.16,0x727e58);
      rod(g,[0,height*.7,0],[-side*.53,height*.7,0],.14,0x727e58);
      rod(g,[-side*.53,height*.7,0],[-side*.53,height*.95,0],.14,0x727e58);
    }else {
      const r=part(g,new THREE.DodecahedronGeometry(range(.5,1.25)),i%2?0xb7865f:0xcb9a68,0,.3,0);r.scale.y=.65;
      for(let j=0;j<3;j++)rod(g,[range(-1,1),.04,range(-.3,.3)],[range(-1,1),range(.35,.75),range(-.3,.3)],.025,0xa27752);
    }
    roadside.push({g,x,parallax:1,period:440});
  }
  const pylons=[];
  for(let i=0;i<7;i++) {
    const g=new THREE.Group();const x=-220+i*70;g.position.set(x,0,-8);ground.add(g);
    rod(g,[-1,0,0],[0,8,0],.10,0x6e6961);rod(g,[1,0,0],[0,8,0],.10,0x6e6961);
    for(let j=1;j<5;j++)rod(g,[-1+j*.17,j*1.3,0],[1-j*.17,j*1.3,0],.06,0x6e6961);
    box(g,3,.15,.18,0x6e6961,0,6.6,0);box(g,2,.15,.18,0x6e6961,0,7.7,0);
    pylons.push({g,x,parallax:1,period:440});
  }
  const entities=new Map(),particles=[],flashes=[];
  const shadowMat=new THREE.MeshBasicMaterial({color:0x483d38,transparent:true,opacity:.16,depthWrite:false});
  const smokeMat=new THREE.MeshBasicMaterial({color:0x51494a,transparent:true,opacity:.28,depthWrite:false});
  const trailMat=new THREE.MeshBasicMaterial({color:0xffefc5,transparent:true,opacity:.65,depthWrite:false});
  let cameraX=0,elapsed=0,lastState=null;
  const shieldMaterial=new THREE.MeshBasicMaterial({color:0x71ead7,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false});
  const shieldEdgeMaterial=new THREE.MeshBasicMaterial({color:0x92fff0,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
  function emitSmoke(x,y) {
    const life=range(.5,.9),mesh=new THREE.Mesh(new THREE.CircleGeometry(range(.18,.35),8),smokeMat.clone());
    mesh.position.set(x,y,1.1);scene.add(mesh);
    particles.push({mesh,x,y,vx:range(-1.3,-.4),vy:range(1.1,2.2),spin:.1,life,full:life,smoke:true});
  }
  function speedTrails(g) {
    const trails=new THREE.Group();
    for(let i=0;i<3;i++) {
      const streak=new THREE.Mesh(new THREE.PlaneGeometry(3+i*.9,.055),trailMat);
      streak.position.set(-5-i*.8,(i-1)*.52,0);trails.add(streak);
    }
    trails.visible=false;scene.add(trails);g.userData.speedTrails=trails;return trails;
  }
  function damageMarks(g,count,y) {
    const health=new THREE.Group();health.position.set(0,y,1.3);
    for(let i=0;i<count;i++) {
      const m=box(health,.44,.13,.06,P.cream,(i-(count-1)/2)*.64,0,0,false);m.name='health'+i;
    }
    g.add(health);g.userData.damageMarks=health;return health;
  }
  function addEntity(key,data,create) {
    let g=entities.get(key);
    if(!g){g=create();g.userData.entityType=key[0];entities.set(key,g);scene.add(g);}
    g.userData.used=true;
    if((key[0]==='p'||key[0]==='e'||key[0]==='t')&&!g.userData.groundShadow){
      const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,24),shadowMat);shadow.rotation.x=-Math.PI/2;shadow.scale.set(key[0]==='t'?2.5:data.type==='boss'?9:3.3,key[0]==='t'?.8:1.3,1);scene.add(shadow);g.userData.groundShadow=shadow;
    }
    if(g.userData.groundShadow)g.userData.groundShadow.position.set(cameraX+wrap(data.x-cameraX),-.10,0);
    g.position.set(cameraX+wrap(data.x-cameraX),data.y??2,0);
    return g;
  }
  function burst(x,y,hex=P.yellow,count=22) {
    if(typeof hex==='string')hex=new THREE.Color(hex).getHex();
    const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1.02,32),new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false}));
    ring.position.set(x,y,4);scene.add(ring);flashes.push({mesh:ring,x,y,life:.55,full:.55});
    for(let i=0;i<count;i++) {
      const size=range(.13,.5),mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(size,0),mat(i%4===0?INK:i%3===0?P.cream:hex,true));
      mesh.position.set(x,y,range(1,4));scene.add(mesh);
      const a=range(0,Math.PI*2),speed=range(4,18);
      particles.push({mesh,x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,spin:range(-7,7),life:range(.3,.95),full:1});
    }
  }
  const pulseMesh=new THREE.Mesh(new THREE.RingGeometry(.94,1,64),new THREE.MeshBasicMaterial({color:0x8bffe4,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));pulseMesh.visible=false;scene.add(pulseMesh);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),aimPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  function aimWorld(clientX,clientY) {
    const r=renderer.domElement.getBoundingClientRect();pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);
    raycaster.setFromCamera(pointer,camera);const hit=new THREE.Vector3();raycaster.ray.intersectPlane(aimPlane,hit);return {x:hit.x,y:hit.y};
  }
  function resize() {
    const w=container.clientWidth||innerWidth,h=container.clientHeight||innerHeight,aspect=w/h;
    const height=Math.max(53,100/aspect);
    camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();renderer.setSize(w,h);
  }
  function render(state,dt=1/60) {
    elapsed+=dt;lastState=state;cameraX=Number.isFinite(state.cameraX)?state.cameraX:0;
    camera.position.set(cameraX,27.5,100);camera.lookAt(cameraX,20,0);camera.updateMatrixWorld();
    ground.position.x=cameraX;
    // Ground children scroll against the camera independently of its backing plane.
    for(const a of [...landscape,...clouds])a.g.position.x=cameraX+((a.x-cameraX*a.parallax+220)%440+440)%440-220;
    for(const a of [...roadside,...pylons])a.g.position.x=((a.x-cameraX+220)%440+440)%440-220;
    sunRoot.position.x=cameraX+30-Math.sin(cameraX*.002)*5;
    for(const g of entities.values())g.userData.used=false;
    for(const p of state.players||[]) {
      if(p.alive===false)continue;
      const g=addEntity('p'+p.id,p,()=>{
        const a=helicopter('player',p.id);
        const shield=new THREE.Mesh(new THREE.SphereGeometry(4.6,24,12),shieldMaterial);shield.scale.set(1,.68,.45);shield.name='shield';a.add(shield);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(4.6,.045,4,64),shieldEdgeMaterial);ring.scale.y=.68;ring.name='shieldRing';a.add(ring);
        return a;
      });
      g.rotation.y=p.dir===-1?Math.PI:0;g.scale.setScalar(state.mode==='title'?2.65:1);
      g.userData.hull.rotation.z=THREE.MathUtils.damp(g.userData.hull.rotation.z,-(p.vx||0)*.007,8,dt);
      g.visible=!(p.invuln>0&&Math.floor(elapsed*16)%2);
      const shielded=!!p.shield;
      g.getObjectByName('shield').visible=shielded;g.getObjectByName('shieldRing').visible=shielded;
      if(p.fire>(g.userData.lastFire||0)+.01)g.userData.muzzleUntil=elapsed+.055;
      g.userData.lastFire=p.fire||0;
      g.getObjectByName('muzzleFlash').visible=elapsed<(g.userData.muzzleUntil||0)&&state.mode!=='title';
      const trails=g.userData.speedTrails||speedTrails(g),speed=Math.hypot(p.vx||0,p.vy||0);
      trails.visible=speed>31&&state.mode!=='title';
      trails.position.set(g.position.x,g.position.y,1.1);trails.rotation.z=Math.atan2(p.vy||0,p.vx||1);
      trails.scale.x=.7+(speed-26)/24;
      if(p.hp<=1&&elapsed>(g.userData.nextSmoke||0)) {emitSmoke(p.x-1.4*p.dir,p.y+.8);g.userData.nextSmoke=elapsed+.12;}
      g.userData.mixer?.update(dt);
    }
    for(const e of state.enemies||[]) {
      const g=addEntity('e'+e.id,e,()=>e.type==='boss'?boss():e.type==='jet'?jet():helicopter('enemy'));
      g.rotation.y=e.dir===-1?Math.PI:0;
      g.rotation.z=e.type==='jet'?Math.sin(elapsed*3+e.id)*.05:Math.sin(elapsed*2+Number(e.id||0))*.025;
      g.userData.mixer?.update(dt);
      if(g.userData.flame)g.userData.flame.scale.x=.6+Math.sin(elapsed*38)*.2;
      if(e.type!=='boss') {
        const marks=g.userData.damageMarks||damageMarks(g,Math.min(4,e.maxHp||3),e.type==='jet'?1.6:2.5);
        marks.visible=e.hp<e.maxHp;
        marks.children.forEach((m,i)=>{m.material=mat(i<Math.ceil(e.hp)?P.yellow:INK,true);});
      }
      if(e.hp<=e.maxHp*.4&&elapsed>(g.userData.nextSmoke||0)) {emitSmoke(e.x,e.y+.65);g.userData.nextSmoke=elapsed+.18;}
    }
    for(const t of state.trucks||[]) {
      if(t.hp<=0)continue;
      const g=addEntity('t'+t.id,t,truck);g.rotation.y=Math.PI;g.userData.mixer?.update(dt);
      g.rotation.z=Math.sin(elapsed*17+Number(t.id||0))*.01;
      if(!g.userData.convoyShield) {
        const dome=new THREE.Group();
        const glow=new THREE.Mesh(new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI/2),shieldMaterial);glow.scale.set(2.9,2.3,1.35);dome.add(glow);
        const arc=new THREE.Mesh(new THREE.TorusGeometry(2.9,.045,4,40,Math.PI),shieldEdgeMaterial);arc.scale.y=.78;arc.position.z=1.1;dome.add(arc);
        dome.position.y=-.7;g.add(dome);g.userData.convoyShield=dome;
      }
      g.userData.convoyShield.visible=state.convoyShield>0&&(state.convoyShield>.7||Math.floor(elapsed*9)%2===0);
      if(t.hp<2&&elapsed>(g.userData.nextSmoke||0)) {emitSmoke(t.x+1.2,t.y+1.2);g.userData.nextSmoke=elapsed+.24;}
    }
    for(const b of state.bullets||[]) {
      const g=addEntity('b'+b.id,b,()=>bullet(b));g.position.z=1.6;
      g.rotation.z=Math.atan2(b.vy||0,b.vx||1);g.scale.setScalar(b.kind==='split'?1.1:1);
    }
    for(const p of state.pickups||[]) {
      const g=addEntity('u'+p.id,p,()=>pickup(p.type));g.position.y+=Math.sin(elapsed*3+Number(p.id||0))*.35;g.userData.mixer?.update(dt);
    }
    for(const [key,g]of entities)if(!g.userData.used){
      scene.remove(g);
      if(g.userData.groundShadow){scene.remove(g.userData.groundShadow);g.userData.groundShadow.geometry.dispose();}
      if(g.userData.speedTrails){scene.remove(g.userData.speedTrails);g.userData.speedTrails.traverse(o=>o.geometry?.dispose());}
      g.userData.mixer?.stopAllAction();
      const owned=new Set();g.traverse(o=>{if(o.geometry)owned.add(o.geometry);});for(const geometry of owned)geometry.dispose();
      entities.delete(key);
    }
    for(let i=particles.length-1;i>=0;i--) {
      const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.smoke?.6:-9)*dt;p.vx*=1-dt;
      p.mesh.position.x=cameraX+wrap(p.x-cameraX);p.mesh.position.y=p.y;p.mesh.rotation.z+=p.spin*dt;
      if(p.smoke){const f=Math.max(0,p.life/p.full);p.mesh.scale.setScalar(1+(1-f)*2.2);p.mesh.material.opacity=f*.28;}
      else p.mesh.scale.setScalar(Math.max(.01,p.life));
      if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();if(p.smoke)p.mesh.material.dispose();particles.splice(i,1);}
    }
    for(let i=flashes.length-1;i>=0;i--) {
      const f=flashes[i];f.life-=dt;f.mesh.position.x=cameraX+wrap(f.x-cameraX);f.mesh.scale.setScalar(1+(1-f.life/f.full)*8);f.mesh.material.opacity=Math.max(0,f.life/f.full);
      if(f.life<=0){scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();flashes.splice(i,1);}
    }
    if(state.pulse&&state.pulse.ttl>0) {
      pulseMesh.visible=true;pulseMesh.position.set(cameraX+wrap(state.pulse.x-cameraX),state.pulse.y,3);pulseMesh.scale.setScalar(Math.max(1,state.pulse.radius));pulseMesh.material.opacity=Math.min(1,state.pulse.ttl*2);
    }else pulseMesh.visible=false;
    renderer.render(scene,camera);
  }
  function dispose(){window.removeEventListener('resize',resize);renderer.dispose();for(const m of materials.values())m.dispose();scene.traverse(o=>o.geometry?.dispose());}
  resize();window.addEventListener('resize',resize);
  return {render,resize,burst,aimWorld,renderer,scene,camera,dispose,get viewport(){return {width:camera.right-camera.left,height:camera.top-camera.bottom};}};
}
