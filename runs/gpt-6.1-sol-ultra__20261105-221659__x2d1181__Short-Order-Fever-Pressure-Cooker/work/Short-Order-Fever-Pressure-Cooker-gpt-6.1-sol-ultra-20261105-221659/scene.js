import * as THREE from 'three/webgpu';
import { color, normalWorld, vec3, dot, step } from 'three/tsl';

export async function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#13323b');
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: false, forceWebGL: new URLSearchParams(location.search).has('webgl') });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  await renderer.init();
  const camera = new THREE.OrthographicCamera(-13.5, 13.5, 7.6, -7.6, .1, 100);
  camera.position.set(0, 18, 19.5);
  camera.lookAt(0, .1, .2);
  const ink = '#172c31', cream = '#fff0cf', teal = '#2c9b91', coral = '#ef735e', yellow = '#fbc858';
  const materials = new Map();
  const shade = dot(normalWorld, vec3(-.45, .85, .55)).mul(.5).add(.5);
  const bands = step(.28, shade).mul(.22).add(step(.65, shade).mul(.18)).add(.60);
  function mat(c, flat = false) {
    const key = c + flat;
    if (!materials.has(key)) {
      const m = new THREE.MeshBasicNodeMaterial({ color: c });
      if (!flat) m.colorNode = color(c).mul(bands);
      materials.set(key, m);
    }
    return materials.get(key);
  }
  const lineMat = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: .8 });
  const world = new THREE.Group(); scene.add(world);
  const dynamic = new THREE.Group(); scene.add(dynamic);
  function mesh(geo, c, parent = world, outline = true) {
    const obj = new THREE.Mesh(geo, mat(c));
    parent.add(obj);
    if (outline) {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), lineMat);
      obj.add(edges);
    }
    return obj;
  }
  function box(x, y, z, sx, sy, sz, c, parent = world, outline = true) {
    const o = mesh(new THREE.BoxGeometry(sx, sy, sz), c, parent, outline); o.position.set(x, y, z); return o;
  }
  function cylinder(x, y, z, r, h, c, parent = world, n = 16, outline = true) {
    const o = mesh(new THREE.CylinderGeometry(r, r, h, n), c, parent, outline); o.position.set(x, y, z); return o;
  }
  function sphere(x, y, z, r, c, parent = world, sx = 1, sy = 1, sz = 1) {
    const o = mesh(new THREE.SphereGeometry(r, 16, 10), c, parent, false); o.position.set(x, y, z);o.scale.set(sx,sy,sz);return o;
  }
  function label(text, w, h, opts = {}) {
    const cv = document.createElement('canvas'); cv.width = Math.round(w * 100); cv.height = Math.round(h * 100);
    const ctx = cv.getContext('2d');
    if (opts.bg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, cv.width, cv.height); }
    if (opts.border) { ctx.strokeStyle = opts.border;ctx.lineWidth=8;ctx.strokeRect(4,4,cv.width-8,cv.height-8); }
    ctx.fillStyle = opts.color || ink;ctx.textAlign = 'center';ctx.textBaseline = 'middle';
    ctx.font = `${opts.weight || 900} ${opts.font || Math.min(cv.height * .68, cv.width / (text.length * .62))}px ${opts.family || 'sans-serif'}`;
    ctx.fillText(text, cv.width / 2, cv.height * .53, cv.width * .93);
    const tex = new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicNodeMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));return o;
  }
  function wallLabel(text,x,y,z,w,h,opts={}) { const o=label(text,w,h,opts);o.position.set(x,y,z);world.add(o);return o; }
  function floorLabel(text,x,z,w,h,opts={}) {const o=label(text,w,h,opts);o.rotation.x=-Math.PI/2;o.position.set(x,.025,z);world.add(o);return o;}
  function shadow(x,z,sx=.7,sz=.45,parent=world) {
    const o=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicNodeMaterial({color:ink,transparent:true,opacity:.17,depthWrite:false}));o.rotation.x=-Math.PI/2;o.position.set(x,.021,z);o.scale.set(sx,sz,1);parent.add(o);return o;
  }

  // A cut-away roadside diner, drawn with a warm print-shop palette.
  box(0,-.38,.6,23,.7,17.8,ink);
  box(0,-.015,.6,22.8,.08,17.6,cream);
  for(let x=-11;x<11;x++) for(let z=-7;z<9;z++) {
    if((x+z)%2===0) box(x+.5,.036,z+.5,.985,.018,.985,'#d4dccb',world,false);
  }
  box(0,2.15,-6.1,23,4.5,.35,'#5cb9ac');
  box(0,.8,-5.87,22.7,1.6,.08,cream);
  for(let x=-11;x<=11;x++) box(x,.82,-5.80,.022,1.55,.025,'#91aaa1',world,false);
  for(let y=.25;y<1.7;y+=.5) box(0,y,-5.79,22.7,.018,.025,'#91aaa1',world,false);
  box(0,1.65,-5.77,22.8,.10,.1,coral);
  box(-11.35,1.3,.4,.25,2.6,12.9,'#3b8d87');
  box(11.35,1.3,.4,.25,2.6,12.9,'#3b8d87');
  box(-11.3,2.65,.4,.35,.12,13,cream);
  box(11.3,2.65,.4,.35,.12,13,cream);

  // Hand-painted marquee and striped awning.
  box(0,3.35,-5.75,10.3,1.60,.23,ink);
  wallLabel('SHORT ORDER FEVER',0,3.44,-5.60,9.9,1.13,{color:cream,font:69});
  wallLabel('GOOD FOOD. GREAT PRESSURE.',0,2.82,-5.60,7,.27,{color:yellow,font:20,weight:700});
  for(let i=0;i<23;i++) box(-11+i,4.37,-5.65,.98,.38,.85,i%2?cream:coral);
  for(let i=0;i<8;i++) {
    cylinder(-10.5+i*3,4.08,-5.1,.075,.18,yellow,world,10,false);
  }
  // Left order chalkboard and clock, right pie-and-coffee shelf.
  box(-8,2.96,-5.67,4.6,2.08,.19,ink);
  wallLabel('TODAY’S SPECIAL',-8,3.62,-5.53,4.1,.38,{color:yellow,font:27});
  wallLabel('A LITTLE HUSTLE',-8,3.06,-5.53,4.1,.38,{color:cream,font:27});
  wallLabel('A LOTTA BURGER',-8,2.53,-5.53,4.1,.38,{color:cream,font:27});
  const clock=new THREE.Group();world.add(clock);clock.position.set(8.2,3.1,-5.50);
  const clockFace=cylinder(0,0,0,.86,.13,cream,clock,32);clockFace.rotation.x=Math.PI/2;
  const clockHand=box(0,.22,.09,.055,.52,.03,ink,clock,false);
  const hand2=box(.19,0,.10,.46,.06,.03,coral,clock,false);
  for(let i=0;i<12;i++) {const a=i*Math.PI/6;box(Math.sin(a)*.67,Math.cos(a)*.67,.1,.055,.055,.02,ink,clock,false);}

  // The grill line is decorative; all moving ingredients share the clear center belt.
  box(0,.49,-3.75,19,1.0,2.1,'#b7c8bc');box(0,1.04,-3.75,19.25,.13,2.26,cream);
  for(let x=-8;x<=8;x+=2) {
    box(x,.50,-2.66,1.82,.79,.06,'#6eaaa0');
    box(x,.76,-2.60,.55,.07,.08,ink);
  }
  for(let x=-7.7;x<-2.5;x+=1.05) {
    box(x,1.15,-3.85,.8,.13,1.25,ink);
    for(let k=0;k<4;k++) box(x-.28+k*.18,1.23,-3.85,.03,.03,1.15,'#d4dbca',world,false);
  }
  for(let x=-7.5;x<-3.8;x+=1.55) cylinder(x,1.29,-3.75,.3,.14,'#7b402d',world,14);
  box(-5.1,3.30,-3.9,6.8,.29,2.1,'#a3bbb3');
  box(-5.1,2.96,-3.90,6.8,.43,1.85,'#d9dfce');box(-5.1,2.72,-3.02,6.95,.11,.18,cream);
  box(-5.1,3.93,-4.1,2.3,1.0,1,'#7faaa4');
  for(let k=0;k<10;k++) box(-7.8+k*.60,2.41,-2.99,.24,.06,.1,ink,world,false);
  // Condiments and prep bins.
  const vegColors=['#6fad47','#ef6a50','#f7c74c','#6b392c'];
  for(let i=0;i<4;i++) {box(1.2+i*1.4,1.14,-3.45,1.1,.14,1.25,ink);box(1.2+i*1.4,1.23,-3.45,.94,.12,1.06,vegColors[i]);}
  for(let i=0;i<5;i++) {
    cylinder(7.0+i*.39,1.42,-3.6,.13,.67,i%2?yellow:coral,world,10);
    cylinder(7.0+i*.39,1.83,-3.6,.075,.19,cream,world,8);
  }
  wallLabel('FRESH • FAST • FUSSY',4.0,1.98,-5.70,5.1,.38,{color:ink,font:29});
  // Shiny coffee urn, stacked cups, and a tiny plant.
  cylinder(9.45,1.58,-4.15,.35,.98,ink);cylinder(9.45,2.1,-4.15,.39,.12,'#cbd3c1');
  box(9.45,1.44,-3.75,.15,.13,.18,yellow);
  for(let k=0;k<3;k++) {cylinder(8.7,1.15+k*.13,-4.3,.17,.14,cream);}
  cylinder(-10.2,.52,-4.1,.48,.9,coral);
  for(let i=0;i<6;i++) {const a=i*Math.PI/3;const l=sphere(-10.2+Math.cos(a)*.24,1.15+Math.sin(a)*.2,-4.1+Math.sin(a)*.2,.42,'#3b9866',world,.35,1,.5);l.rotation.z=a;}

  // Bold conveyor with brass rivets, dark rubber treads and readable end caps.
  box(0,.64,-.65,19.9,.87,2.07,ink);
  box(0,1.085,-.65,19.5,.16,1.83,'#4d706c');
  box(0,1.18,-1.55,19.7,.11,.13,cream);
  box(0,1.18,.25,19.7,.11,.13,cream);
  const beltSlats=[];
  for(let i=0;i<40;i++) {const t=box(-9.75+i*.5,1.176,-.65,.035,.022,1.58,'#9aaca0',world,false);beltSlats.push(t);}
  for(let i=0;i<20;i++) {cylinder(-9.4+i,.86,.405,.035,.02,yellow,world,7,false).rotation.x=Math.PI/2;}
  box(-10.02,1.0,-.65,.55,.45,2.08,coral);
  box(10.02,1.0,-.65,.55,.45,2.08,coral);
  const motor=cylinder(-10.05,.47,-.65,.39,.55,yellow);motor.rotation.z=Math.PI/2;
  floorLabel('CATCH ↑',0,1.0,3.5,.46,{color:'#69938b',font:34});
  for(let i=0;i<8;i++) {const arrow=label('›',.5,.55,{color:'#c0d5bd',font:60});arrow.rotation.x=-Math.PI/2;arrow.rotation.z=-Math.PI/2;arrow.position.set(-8+i*2.3,1.20,-.65);world.add(arrow);}
  // Delivery counters keep the front of the aisle open and the ticket colors unmistakable.
  const hatchColors=['#f87963','#63c6bb','#f7c85f'];
  const hatches=[];
  for(let i=0;i<3;i++) {
    const x=[-5.5,0,5.5][i],c=hatchColors[i];
    const g=new THREE.Group();world.add(g);g.position.set(x,0,5.95);
    box(0,.36,0,4.35,.7,1.22,c,g);
    box(0,.76,0,4.55,.13,1.43,cream,g);
    box(0,.84,0,2.82,.045,.94,ink,g);
    box(0,.87,0,2.62,.035,.78,c,g);
    for(let k=0;k<4;k++) {box(-1.14+k*.76,.9,0,.035,.018,.69,cream,g,false);}
    const sign=label(`${i+1}  ${['SUNSET','MINT','GOLDEN'][i]}`,3.7,.57,{color:cream,bg:ink,font:38});sign.position.set(0,.39,.626);g.add(sign);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.58,.66,32),new THREE.MeshBasicNodeMaterial({color:c,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.057,4.95);world.add(ring);hatches.push({g,ring});
    floorLabel('↓',x,4.27,.67,.67,{color:c,font:79});
  }
  floorLabel('DELIVER',0,7.50,4.8,.64,{color:cream,font:48});
  // The floor grate telegraphs the steam hazard before a puff can touch the chef.
  const vent = new THREE.Group(); world.add(vent); vent.position.set(0, 0, 2.75);
  box(0,.065,0,1.94,.07,1.10,'#7b9690',vent);
  box(0,.108,0,1.72,.025,.88,ink,vent);
  for(let i=0;i<10;i++) box(-.77+i*.17,.127,0,.057,.018,.76,'#b8cbbd',vent,false);
  for(let x of [-.85,.85]) for(let z of [-.45,.45]) cylinder(x,.11,z,.035,.018,cream,vent,8,false);
  const ventGlowMaterial = new THREE.MeshBasicNodeMaterial({ color: '#f6a23e', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const ventGlow = new THREE.Mesh(new THREE.RingGeometry(.78,.94,40),ventGlowMaterial);
  ventGlow.rotation.x=-Math.PI/2;ventGlow.scale.y=.65;ventGlow.position.y=.047;vent.add(ventGlow);
  const ventLampMaterial = new THREE.MeshBasicNodeMaterial({color:'#3c5754'});
  for(let x of [-1.03,1.03]) { const lamp=new THREE.Mesh(new THREE.BoxGeometry(.075,.018,.75),ventLampMaterial);lamp.position.set(x,.06,0);vent.add(lamp); }
  const ventPuffs=[];
  for(let i=0;i<10;i++) {
    const puff=sphere(0,.3,0,.24,'#fff0cf',vent,1,1,1);
    puff.material=new THREE.MeshBasicNodeMaterial({color:'#fff2d2',transparent:true,opacity:0,depthWrite:false});
    ventPuffs.push(puff);
  }
  // Side rails, service bell and exit mat frame the play area without blocking it.
  box(-9.5,.36,3.6,1.0,.72,5.0,'#74b4a1');box(9.5,.36,3.6,1.0,.72,5.0,'#74b4a1');
  box(-9.5,.79,3.6,1.15,.12,5.15,cream);box(9.5,.79,3.6,1.15,.12,5.15,cream);
  cylinder(9.5,.92,2.0,.38,.10,ink);sphere(9.5,1.0,2,.34,yellow,world,1,.55,1);cylinder(9.5,1.23,2,.06,.16,ink);
  wallLabel('BELL',9.5,.49,6.19,.88,.4,{color:cream,font:28});
  for(let side of [-1,1]) {
    for(let i=0;i<3;i++) {const x=side*10.4,z=1.5+i*1.6;box(x,.92,z,.73,.15,.96,coral);cylinder(x,.47,z,.07,.86,ink,world,8);}
  }
  // Overhead pendants and pools of warm light are part of the illustration.
  for(let x of [-8.8,8.8]) {
    cylinder(x,4.28,-.8,.025,1.8,ink,world,6);
    const lamp=mesh(new THREE.ConeGeometry(.62,.40,20),coral);lamp.position.set(x,3.28,-.8);
    cylinder(x,3.06,-.8,.47,.05,yellow);
  }

  const ingredientMats={patty:'#834733',lettuce:'#72b849',tomato:'#ef6752',cheese:'#f6c74d'};
  function makeIngredient(type, parent, small = false) {
    const g=new THREE.Group();parent.add(g);
    if(type==='cheese') {
      const o=box(0,0,0,.77,.07,.77,ingredientMats[type],g);o.rotation.y=Math.PI/4;
      const flap=box(.39,-.035,0,.19,.045,.38,ingredientMats[type],g);flap.rotation.z=-.6;
    } else if(type==='lettuce') {
      cylinder(0,0,0,.45,.09,ingredientMats[type],g,9);
      for(let i=0;i<7;i++) {const a=i*6.283/7;sphere(Math.cos(a)*.31,.025,Math.sin(a)*.31,.21,ingredientMats[type],g,1,.28,1);}
    } else if(type==='tomato') {
      cylinder(0,0,0,.41,.12,ingredientMats[type],g,20);
      for(let i=0;i<5;i++) {const a=i*6.283/5;sphere(Math.cos(a)*.23,.071,Math.sin(a)*.23,.055,'#ffd08b',g,1,.2,1);}
    } else {
      cylinder(0,0,0,.41,.20,ingredientMats.patty,g,16);
      for(let i=0;i<4;i++) {const b=box(-.22+i*.15,.107,0,.035,.014,.49,'#543225',g,false);b.rotation.y=-.3;}
    }
    if(small)g.scale.setScalar(.8);
    return g;
  }
  function bun(parent,y,top=false) {
    if(top) {
      sphere(0,y,0,.45,'#edb45e',parent,1,.48,1);
      for(let i=0;i<8;i++) {const a=i*2.4;const r=.10+(i%3)*.09;const sesame=sphere(Math.cos(a)*r,y+.17,Math.sin(a)*r,.034,cream,parent,.5,.24,1);sesame.rotation.y=a;}
    } else cylinder(0,y,0,.42,.14,'#dfa558',parent,20);
  }
  const players=new Map(), items=new Map(), debris=new Map();
  function createChef(p) {
    const root=new THREE.Group();root.scale.setScalar(1.12);dynamic.add(root);
    const bodyRoot=new THREE.Group();bodyRoot.name='chefBody';root.add(bodyRoot);
    const pc=p.color||coral;
    const coat=mesh(new THREE.CylinderGeometry(.34,.41,.71,12),cream,bodyRoot);coat.position.y=.88;
    const apron=box(0,.78,.305,.5,.54,.11,pc,bodyRoot);apron.rotation.x=-.06;
    box(0,1.13,.33,.50,.11,.08,pc,bodyRoot);
    for(let y of [.83,1.03])for(let x of [-.12,.12]) sphere(x,y,.363,.035,ink,bodyRoot);
    const head=sphere(0,1.48,0,.31,'#efbd8c',bodyRoot,.95,1,1);
    sphere(0,1.46,.30,.083,'#edaa76',bodyRoot,1,.8,1);
    for(let x of [-.115,.115]) sphere(x,1.54,.279,.037,ink,bodyRoot,.7,1,1);
    const moustache=sphere(0,1.38,.29,.105,ink,bodyRoot,1.4,.35,.55);
    cylinder(0,1.79,0,.32,.30,cream,bodyRoot,14);
    for(let i=0;i<3;i++)sphere((i-1)*.18,1.97,0,.23,cream,bodyRoot,1,1,1);
    const armL=new THREE.Group();armL.name='armL';bodyRoot.add(armL);armL.position.set(-.35,1.14,0);
    const armR=new THREE.Group();armR.name='armR';bodyRoot.add(armR);armR.position.set(.35,1.14,0);
    for(let [a,s]of [[armL,-1],[armR,1]]) {
      const sleeve=cylinder(s*.045,-.18,.02,.13,.40,cream,a,10);sleeve.rotation.z=s*.27;
      sphere(s*.09,-.40,.05,.13,'#efbd8c',a);
    }
    const legL=new THREE.Group();legL.name='legL';root.add(legL);legL.position.set(-.19,.48,0);
    const legR=new THREE.Group();legR.name='legR';root.add(legR);legR.position.set(.19,.48,0);
    for(let l of [legL,legR]) {cylinder(0,-.19,0,.115,.38,'#253f43',l,10);box(0,-.40,.10,.27,.19,.40,ink,l);}
    const stackRoot=new THREE.Group();root.add(stackRoot);stackRoot.position.set(.60,1.02,.48);
    cylinder(0,0,0,.58,.07,cream,stackRoot,24);bun(stackRoot,.10);
    const disc=new THREE.Mesh(new THREE.RingGeometry(.56,.65,32),new THREE.MeshBasicNodeMaterial({color:pc,transparent:true,opacity:.8,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.y=.04;root.add(disc);
    const blob=shadow(0,0,.60,.48,root);
    const mixer=new THREE.AnimationMixer(root);
    const walkClip=new THREE.AnimationClip('walk',.55,[
      new THREE.NumberKeyframeTrack('legL.rotation[x]',[0,.1375,.275,.4125,.55],[0,.7,0,-.7,0]),
      new THREE.NumberKeyframeTrack('legR.rotation[x]',[0,.1375,.275,.4125,.55],[0,-.7,0,.7,0]),
      new THREE.NumberKeyframeTrack('chefBody.position[y]',[0,.1375,.275,.4125,.55],[0,.07,0,.07,0]),
      new THREE.NumberKeyframeTrack('armL.rotation[x]',[0,.1375,.275,.4125,.55],[0,-.35,0,.35,0]),
      new THREE.NumberKeyframeTrack('armR.rotation[x]',[0,.1375,.275,.4125,.55],[0,.35,0,-.35,0])
    ]);
    const idleClip=new THREE.AnimationClip('idle',2,[new THREE.NumberKeyframeTrack('chefBody.scale[y]',[0,1,2],[1,1.025,1])]);
    const actClip=new THREE.AnimationClip('toss',.28,[new THREE.NumberKeyframeTrack('armR.rotation[x]',[0,.12,.28],[0,-1.7,0]),new THREE.NumberKeyframeTrack('armL.rotation[x]',[0,.12,.28],[0,-1.2,0])]);
    const walk=mixer.clipAction(walkClip);walk.play();walk.setEffectiveWeight(0);
    mixer.clipAction(idleClip).play();
    const act=mixer.clipAction(actClip);act.setLoop(THREE.LoopOnce,1);act.clampWhenFinished=false;
    const nameTag=label(`CHEF ${Number(p.id)+1}`,1.5,.3,{color:cream,bg:ink,font:19});nameTag.position.set(0,2.40,0);nameTag.quaternion.copy(camera.quaternion);root.add(nameTag);
    const c={root,bodyRoot,stackRoot,mixer,walk,act,lastStack:'',lastX:p.x,lastZ:p.z,lastAction:false,nameTag};players.set(p.id,c);return c;
  }
  const catchCue=new THREE.Group();dynamic.add(catchCue);catchCue.visible=false;
  const catchMaterial=new THREE.MeshBasicNodeMaterial({color:'#83d088',transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false});
  const catchRing=new THREE.Mesh(new THREE.RingGeometry(.52,.61,40),catchMaterial);
  catchRing.rotation.x=-Math.PI/2;catchRing.position.y=1.255;catchCue.add(catchRing);
  const catchArrow=new THREE.Group();catchCue.add(catchArrow);
  const arrowStem=new THREE.Mesh(new THREE.BoxGeometry(.095,.31,.095),mat('#83d088',true));arrowStem.position.y=2.17;catchArrow.add(arrowStem);
  const arrowHead=new THREE.Mesh(new THREE.ConeGeometry(.18,.27,3),mat('#83d088',true));arrowHead.rotation.z=Math.PI;arrowHead.position.y=1.95;catchArrow.add(arrowHead);
  const particles=[];
  function burst(x,z,c=yellow,count=16) {
    for(let i=0;i<count;i++) {
      const o=mesh(new THREE.BoxGeometry(.085,.085,.085),c,dynamic,false);o.position.set(x,.7+Math.random()*.6,z);
      const a=Math.random()*Math.PI*2,s=1+Math.random()*2;particles.push({o,vx:Math.cos(a)*s,vz:Math.sin(a)*s,vy:2+Math.random()*3,life:.6+Math.random()*.5});
    }
  }
  const steam=[];
  for(let i=0;i<8;i++) {
    const o=sphere(-7.5+(i%3)*1.55,1.6,-3.75,.16,'#d7ddd0',world,1,1,1);
    o.material=new THREE.MeshBasicNodeMaterial({color:'#f5eaca',transparent:true,opacity:.22,depthWrite:false});steam.push({o,phase:i*.61});
  }
  const raycaster=new THREE.Raycaster(), ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const worldPoint=(clientX,clientY)=> {
    const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),camera);
    const hit=new THREE.Vector3();return raycaster.ray.intersectPlane(ground,hit)?{x:hit.x,z:hit.z}:null;
  };
  function resize() {
    const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;
    renderer.setSize(w,h,false);
    const aspect=w/h,halfW=aspect<1.25?11.9:12.6;
    camera.left=-halfW;camera.right=halfW;camera.top=halfW/aspect;camera.bottom=-halfW/aspect;camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize',resize);
  function update(state,dt) {
    const t=state.time||0;
    for(let i=0;i<beltSlats.length;i++) beltSlats[i].position.x=-9.75+((i*.5+t*(state.freeze>0?.12:1.4))%19.5);
    clockHand.rotation.z=-t*.025;hand2.rotation.z=-t*.20;
    const ventPhase=Number(state.ventPhase)||0;
    const ventActive=state.shift>0&&ventPhase>11.5&&ventPhase<14;
    const ventWarning=state.shift>0&&ventPhase>9.5&&ventPhase<=11.5;
    const ventPulse=.5+.5*Math.sin((state.time||0)*16);
    ventGlowMaterial.opacity=ventActive?.8:ventWarning?.2+ventPulse*.65:0;
    ventLampMaterial.color.set(ventActive?'#fff2be':ventWarning?(ventPulse>.45?'#f9a33d':'#8d4d30'):'#3c5754');
    for(let i=0;i<ventPuffs.length;i++) {
      const puff=ventPuffs[i],phase=((state.time||0)*1.15+i*.173)%1;
      puff.visible=ventActive;
      if(ventActive){puff.position.set(Math.sin(i*2.4+phase)*.66,.2+phase*2.0,Math.cos(i*2.4)*.28);puff.scale.set(.7+phase*.7,1.05+phase*.8,.7+phase*.7);puff.material.opacity=(1-phase)*.50;}
    }
    for(const {o,phase}of steam) {const phaseT=(t*.6+phase)%2;o.position.y=1.5+phaseT*.7;o.scale.setScalar(.5+phaseT*.65);o.material.opacity=(1-phaseT/2)*.23;}
    const liveItems=new Set();
    for(const item of state.items||[]) {
      liveItems.add(item.id);let v=items.get(item.id);
      if(!v){v=makeIngredient(item.type,dynamic);items.set(item.id,v);}
      v.position.set(item.x,1.36+(item.type==='patty'?.02:0),item.z??-.65);v.rotation.y=Math.sin(t+Number(item.id)*.7)*.12;
    }
    for(const [id,v]of items)if(!liveItems.has(id)){dynamic.remove(v);items.delete(id);}
    const localChef=(state.players||[]).find(p=>p.id===state.localId)||(state.players||[])[0];
    const localRecipe=(state.orders||[])[localChef?.order]?.recipe;
    const nextLayer=localRecipe?.[(localChef?.stack||[]).length];
    let catchCandidate=null;
    if(localChef&&nextLayer&&!state.menu&&state.mode==='playing') {
      let nearestDistance=state.catchRadius??2.25;
      for(const item of state.items||[]) {
        const distance=Math.hypot(item.x-localChef.x,(item.z??-.65)-localChef.z);
        if(distance<nearestDistance){nearestDistance=distance;catchCandidate=item;}
      }
    }
    catchCue.visible=Boolean(catchCandidate);
    if(catchCandidate) {
      const correct=catchCandidate.type===nextLayer;
      catchCue.position.set(catchCandidate.x,0,catchCandidate.z??-.65);
      catchMaterial.color.set(correct?'#83d088':'#f87963');
      catchMaterial.opacity=.78+Math.sin(t*7)*.18;
      catchRing.scale.setScalar(1+Math.sin(t*7)*.055);
      catchArrow.visible=correct;catchArrow.position.y=Math.sin(t*6)*.10;
    }
    const liveDebris=new Set();
    for(const part of state.debris||[]) {
      liveDebris.add(part.id);let v=debris.get(part.id);
      if(!v){v=makeIngredient(part.type,dynamic,true);debris.set(part.id,v);}
      v.position.set(part.x,part.y,part.z);
      v.quaternion.set(part.qx||0,part.qy||0,part.qz||0,part.qw??1);
    }
    for(const[id,v]of debris)if(!liveDebris.has(id)){dynamic.remove(v);debris.delete(id);}
    const livePlayers=new Set();
    for(const p of state.players||[]) {
      livePlayers.add(p.id);const v=players.get(p.id)||createChef(p);
      const moved=Math.hypot(p.x-v.lastX,p.z-v.lastZ)>dt*.3;
      v.walk.setEffectiveWeight(moved?1:0);v.walk.timeScale=p.dash?2.4:1;
      if(p.action&&!v.lastAction){v.act.reset().play();}
      v.lastAction=p.action;v.mixer.update(Math.min(dt,.1));
      v.root.position.set(p.x,p.dash?Math.abs(Math.sin(t*35))*.06:0,p.z);
      const angle=p.angle||0;v.bodyRoot.rotation.y=0;
      // Keep the plate facing the camera: a readable cartoon silhouette beats hidden ingredients.
      v.root.rotation.y=0;
      v.lastX=p.x;v.lastZ=p.z;
      const stackKey=(p.stack||[]).join(',')+(p.complete?'!':'');
      if(stackKey!==v.lastStack) {
        while(v.stackRoot.children.length>2)v.stackRoot.remove(v.stackRoot.children[v.stackRoot.children.length-1]);
        (p.stack||[]).forEach((type,i)=>{const m=makeIngredient(type,v.stackRoot,true);m.position.y=.22+i*.155;});
        if(p.complete)bun(v.stackRoot,.27+(p.stack||[]).length*.155,true);
        v.lastStack=stackKey;
      }
      v.stackRoot.position.y=1.03+Math.sin(t*6+Number(p.id))*.025;
      v.nameTag.quaternion.copy(camera.quaternion);
    }
    for(const[id,v]of players)if(!livePlayers.has(id)){dynamic.remove(v.root);players.delete(id);}
    for(let i=0;i<hatches.length;i++){
      const h=hatches[i],ready=(state.players||[]).some(p=>p.order===i&&p.complete);
      h.ring.material.opacity=ready?.84+Math.sin(t*6)*.16:.35+Math.sin(t*3+i)*.12;
      h.ring.scale.setScalar(ready?1.35+Math.sin(t*6)*.09:1);
    }
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.vy-=8*dt;p.o.position.x+=p.vx*dt;p.o.position.z+=p.vz*dt;p.o.position.y+=p.vy*dt;p.o.rotation.x+=dt*6;p.o.rotation.z+=dt*8;if(p.life<=0){dynamic.remove(p.o);p.o.geometry.dispose();particles.splice(i,1);}}
    renderer.render(scene,camera);
  }
  return {update,resize,burst,worldPoint,renderer,rendererName:renderer.backend?.isWebGPUBackend?'WebGPU':'WebGL 2 fallback',dispose(){window.removeEventListener('resize',resize);renderer.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});}};
}
