/* Procedural mansion art. All geometry, texture marks, and animation are generated here. */
export async function createScene(THREE, canvas) {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: false, forceWebGL: new URLSearchParams(location.search).get('renderer') === 'webgl' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  await renderer.init();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0c1520');
  scene.fog = new THREE.FogExp2('#0c1520', .012);
  const camera = new THREE.OrthographicCamera(-26, 26, 16, -16, .1, 160);
  camera.position.set(29, 38, 37);
  const viewTarget = new THREE.Vector3(0, 0, 0);
  camera.lookAt(viewTarget);
  const art = new THREE.Group(), actors = new THREE.Group(), effects = new THREE.Group();
  scene.add(art, actors, effects);
  const obstacles = [];
  const mixers = [];
  let currentFloor = -1, lastWidth = 0, lastHeight = 0, sceneTime = 0;
  const actorsById = new Map(), itemById = new Map(), doorById = new Map();
  const animated = [];
  const mats = new Map();
  const ink = new THREE.MeshBasicMaterial({ color: '#070d16', side: THREE.BackSide });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#0b1019', transparent: true, opacity: .86 });
  const mat = (color, options={}) => {
    const key = color + JSON.stringify(options);
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: .92, metalness: 0, flatShading: true, ...options }));
    return mats.get(key);
  };
  const basic = (color, options={}) => new THREE.MeshBasicMaterial({ color, ...options });
  const colors = { gold:'#e9b55a', brass:'#a87339', bone:'#f9e4b6', wall:'#23494e', wood:'#725748', dark:'#162932', purple:'#655470', teal:'#58c7c0', red:'#743945' };
  function mesh(geo, material, parent=art, outline=false) {
    const m = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
    m.castShadow = true; m.receiveShadow = true; parent.add(m);
    if(outline) {
      const shell = new THREE.Mesh(geo, ink); shell.scale.setScalar(1.035); m.add(shell);
    }
    return m;
  }
  function box(x,y,z,w,h,d,color,parent=art,outline=true) {
    const m=mesh(new THREE.BoxGeometry(w,h,d),color,parent,false); m.position.set(x,y,z);
    if(outline){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,25),edgeMaterial);m.add(edge);}
    return m;
  }
  function sphere(x,y,z,r,color,parent=art,scale=[1,1,1],outline=true) {
    const m=mesh(new THREE.SphereGeometry(r,12,8),color,parent,outline);m.position.set(x,y,z);m.scale.set(...scale);return m;
  }
  function cylinder(x,y,z,r1,r2,h,color,parent=art,n=10) {
    const m=mesh(new THREE.CylinderGeometry(r1,r2,h,n),color,parent);m.position.set(x,y,z);return m;
  }
  function line(points,color='#d1ad6d',parent=art,opacity=1) {
    const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
    const m=new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(m);return m;
  }
  function disc(x,y,z,r,color,parent=art,opacity=1) {
    const m=mesh(new THREE.CircleGeometry(r,48),basic(color,{transparent:opacity<1,opacity,depthWrite:false}),parent);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.castShadow=false;return m;
  }
  function tag(text,x,z,size=1,color='#d4bf9b',parent=art) {
    const cv=document.createElement('canvas');cv.width=512;cv.height=96;
    const ctx=cv.getContext('2d');ctx.clearRect(0,0,512,96);ctx.font='600 30px Georgia';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text.toUpperCase(),256,57);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
    const m=mesh(new THREE.PlaneGeometry(size*7.2,size*1.35),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.65}),parent);m.rotation.x=-Math.PI/2;m.position.set(x,.17,z);m.castShadow=false;return m;
  }
  const ambient = new THREE.HemisphereLight('#a8cadb','#191324',1.25);scene.add(ambient);
  const moon=new THREE.DirectionalLight('#9ec8df',2.9);moon.position.set(-15,25,-17);moon.castShadow=true;
  moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-25,right:25,top:23,bottom:-23,near:1,far:70});moon.shadow.bias=-.001;moon.shadow.normalBias=.03;scene.add(moon);
  const warm=new THREE.DirectionalLight('#ffbc79',1.7);warm.position.set(14,18,18);scene.add(warm);
  const exterior=new THREE.Group();scene.add(exterior);
  const voidGround=mesh(new THREE.CylinderGeometry(39,42,1,64),mat('#11232c'),exterior);voidGround.position.set(0,-2,0);
  const halo=disc(0,-1.45,0,31,'#19313c',exterior,.65);
  // The crooked dead garden frames the floating cutaway like an illustrated diorama.
  function tree(x,z,s=1) {
    const g=new THREE.Group();g.position.set(x,-.8,z);g.scale.setScalar(s);exterior.add(g);
    const trunk=cylinder(0,2,0,.12,.42,5,'#11202a',g,5);trunk.rotation.z=.13;
    for(let i=0;i<6;i++){
      const side=i%2?1:-1,y=1.4+i*.52;
      line([[0,y,0],[side*.8,y+.65,0],[side*1.6,y+.95,.2]],'#243e46',g);
      const branch=cylinder(side*.5,y+.4,0,.05,.14,1.45,'#12242c',g,5);branch.rotation.z=-side*.9;
    }
  }
  [[-23,-14,1.4],[-24,3,1.2],[22,-16,1.1],[23,7,1.3],[-15,-18,.9],[13,-19,1]].forEach(t=>tree(...t));
  // Broken iron fence and cemetery silhouettes.
  for(let i=0;i<22;i++){
    const x=-23+i*2.2;
    cylinder(x,.1,-16,.045,.045,2,'#152932',exterior,5);
    const tip=mesh(new THREE.ConeGeometry(.14,.4,4),mat('#2e4852'),exterior);tip.position.set(x,1.25,-16);
  }
  line([[-23,.4,-16],[23,.4,-16]],'#314955',exterior);line([[-23,-.3,-16],[23,-.3,-16]],'#314955',exterior);
  for(let i=0;i<9;i++){
    const x=-21+(i*7.13)%42,z=-13.6-(i%3)*1.2;
    const grave=box(x,-.1,z,.8,1.1,.3,'#243c46',exterior);grave.rotation.z=(i%3-1)*.14;
    line([[x-.2,.15,z+.16],[x+.2,.15,z+.16]],'#50636a',exterior);line([[x,.4,z+.16],[x,-.1,z+.16]],'#50636a',exterior);
  }
  // Stair landings have a shared, generous reservation on every floor.
  // The same bounds gate art and collision so skipped furniture cannot leave an invisible blocker.
  function furnitureClear(x,z,w,d){return [[-14,-8],[14,8]].every(([sx,sz])=>Math.hypot(Math.max(0,Math.abs(x-sx)-w/2),Math.max(0,Math.abs(z-sz)-d/2))>=2.15);}
  function addCollider(x,z,w,d){if(furnitureClear(x,z,w,d))obstacles.push({x,z,w,d});}
  function wall(x,z,w,d,h=1.6){
    box(x,h/2,z,w,h,d,colors.wall);box(x,h+.05,z,w+.04,.12,d+.06,'#7c8b7d');box(x,.18,z,w+.05,.25,d+.07,'#152d33');addCollider(x,z,w,d);
    if(w>d && w>3) for(let i=0;i<Math.floor(w/1.35);i++) box(x-w/2+.65+i*1.35,h*.6,z+d/2+.012,.045,h*.55,.035,'#436265',art,false);
  }
  function arch(x,z,alongX=true){
    const g=new THREE.Group();g.position.set(x,0,z);if(!alongX)g.rotation.y=Math.PI/2;art.add(g);
    for(const side of [-1,1]){
      box(side*1.6,1.1,0,.25,2.2,.6,'#3d5d60',g);box(side*1.6,2.12,0,.4,.18,.75,colors.brass,g);
    }
    const shape=new THREE.Shape();shape.moveTo(-1.75,2.05);shape.quadraticCurveTo(0,3.5,1.75,2.05);shape.lineTo(1.75,2.45);shape.quadraticCurveTo(0,3.8,-1.75,2.45);shape.closePath();
    const m=mesh(new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:false}),mat('#29484e'),g);m.position.z=-.14;
    const badge=mesh(new THREE.OctahedronGeometry(.22),mat(colors.gold,{emissive:'#603b12',emissiveIntensity:.25}),g);badge.position.set(0,2.85,.18);
  }
  function candle(x,z,parent=art,y=.2,scale=1){
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    cylinder(0,.1,0,.22,.32,.18,colors.brass,g);cylinder(0,.48,0,.11,.13,.7,'#d8c9a1',g);
    const flame=sphere(0,.99,0,.17,basic('#ffc974'),g,[.6,1.7,.6],false);
    animated.push({kind:'flame',object:flame,phase:x+z});
    const glow=disc(0,.015,0,1.3,'#ffbb55',g,.055);return g;
  }
  function portrait(x,z,variant=0,parent=art){
    if(parent===art&&!furnitureClear(x,z,1.55,.16))return null;
    const g=new THREE.Group();g.position.set(x,1.8,z);parent.add(g);
    box(0,0,0,1.55,1.95,.16,colors.brass,g);box(0,0,.1,1.28,1.67,.04,['#273b45','#44334c','#413b37'][variant%3],g);
    sphere(0,.25,.15,.34,['#7c8f82','#9a7f85','#887e6e'][variant%3],g,[.8,1, .13],false);
    const bust=mesh(new THREE.ConeGeometry(.56,.85,5),mat('#17262c'),g);bust.position.set(0,-.37,.15);bust.scale.z=.2;
    for(const sx of [-.12,.12])sphere(sx,.28,.205,.044,basic('#ffdb85'),g,[1,1,.3],false);
    g.rotation.z=Math.sin(x*4)*.07;return g;
  }
  function books(x,z,parent=art,width=3.1){
    if(parent===art&&!furnitureClear(x,z,width,.7))return null;
    const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
    box(0,1.25,0,width,2.5,.7,'#493e3c',g);box(0,1.25,.37,width-.25,2.26,.05,'#192c31',g);
    for(let j=0;j<3;j++){
      box(0,.28+j*.77,.47,width+.15,.1,.95,'#7d6650',g);
      for(let k=0;k<Math.floor(width/.22)-1;k++){
        const bh=.36+((k*7+j*3)%5)*.07;
        const b=box(-width/2+.28+k*.22,.34+j*.77+bh/2,.45,.15,bh,.4,['#a96854','#6c927e','#ba9b60','#69677d','#9c7a60'][k%5],g,false);
        if(k%5===0)b.rotation.z=.14;
        box(b.position.x,b.position.y+bh*.25,.663,.13,.025,.012,'#d8bb81',g,false);
      }
    }
  }
  function table(x,z,parent=art,style=0){
    if(parent===art&&!furnitureClear(x,z,2.6,1.25))return null;
    const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
    box(0,.94,0,2.6,.2,1.25,'#8c6851',g);box(0,1.055,0,2.38,.03,1.04,'#684a40',g);
    for(const sx of [-1,1])for(const sz of [-.4,.4])box(sx,.45,sz,.13,.9,.13,'#53413b',g);
    if(style===0){candle(-.7,0,g,1.1,.6);box(.35,1.11,0,.75,.08,.55,'#7f8d7e',g);box(.35,1.16,0,.62,.03,.5,'#dfcfaa',g);}
    else {sphere(-.55,1.27,0,.22,'#aab5a2',g);cylinder(.2,1.2,0,.27,.3,.2,'#bda581',g);candle(.8,0,g,1.1,.6);}
  }
  function chair(x,z,parent=art,rotation=0){
    if(parent===art&&!furnitureClear(x,z,1,.9))return null;
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);
    box(0,.64,0,.85,.18,.85,'#70444a',g);box(0,1.2,-.32,.9,1.25,.2,'#73464b',g);
    for(const dx of [-.3,.3])for(const dz of [-.3,.3])box(dx,.29,dz,.1,.6,.1,'#594a40',g,false);
    box(0,1.76,-.32,1,.14,.28,colors.brass,g);
  }
  function grandfather(x,z,parent=art){
    if(parent===art&&!furnitureClear(x,z,1.1,.65))return null;
    const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
    box(0,1.5,0,1.1,3,.65,'#4c4140',g);box(0,.2,0,1.4,.25,.9,colors.brass,g);
    box(0,1.15,.35,.7,1.6,.04,'#172f35',g);
    const face=mesh(new THREE.CylinderGeometry(.48,.48,.12,24),mat('#ddc68f'),g);face.rotation.x=Math.PI/2;face.position.set(0,2.4,.42);
    line([[0,2.4,.49],[.05,2.74,.49]],'#19252a',g);line([[0,2.4,.5],[.27,2.3,.5]],'#19252a',g);
    const pend=new THREE.Group();pend.name='Pendulum';pend.position.set(0,1.9,.43);g.add(pend);box(0,-.6,0,.035,1.15,.04,colors.gold,pend);sphere(0,-1.15,0,.19,colors.gold,pend,[1,1,.22]);
    const mixer=new THREE.AnimationMixer(g);mixer.clipAction(new THREE.AnimationClip('clock tick',2,[new THREE.NumberKeyframeTrack('Pendulum.rotation[z]',[0,.5,1,1.5,2],[-.17,0,.17,0,-.17])])).play();mixers.push(mixer);
    const cap=mesh(new THREE.ConeGeometry(.85,.5,4),mat('#79624c'),g);cap.rotation.y=Math.PI/4;cap.position.y=3.2;
  }
  function windowArt(x,z,parent=art){
    if(parent===art&&!furnitureClear(x,z,2.5,.5))return null;
    const g=new THREE.Group();g.position.set(x,1.7,z);parent.add(g);
    box(0,0,0,2.5,2.8,.14,'#102b36',g);box(0,0,.09,2.2,2.5,.03,basic('#447986'),g);
    for(let i=0;i<4;i++){
      const p=mesh(new THREE.PlaneGeometry(.58,.94),basic(['#72b8b5','#8c789f','#dbb87c','#5d8b9e'][i]),g);p.position.set((i%2-.5)*1.05,(i<2?.5:-.5)*1.08,.12);p.rotation.z=Math.PI/4;
    }
    box(0,0,.15,.08,2.6,.08,'#172e36',g);box(0,0,.15,2.3,.08,.08,'#172e36',g);
    for(const side of [-1,1])box(side*1.3,-.12,.17,.32,2.7,.22,'#604752',g);
  }
  function plant(x,z,parent=art){
    if(parent===art&&!furnitureClear(x,z,.7,.7))return null;
    cylinder(x,.3,z,.35,.25,.6,'#8f6451',parent);for(let i=0;i<5;i++){
      const a=i*2.4;const leaf=sphere(x+Math.cos(a)*.27,.9+(i%3)*.2,z+Math.sin(a)*.27,.35,'#3e6d63',parent,[.36,1.8,.5]);leaf.rotation.z=Math.sin(a)*.6;
    }
  }
  function fireplace(x,z,parent=art){
    if(parent===art&&!furnitureClear(x,z,3.1,.9))return null;
    box(x,1.05,z,3.1,2.1,.9,'#586163',parent);box(x,.75,z+.47,2.3,1.35,.05,'#15252c',parent);box(x,2.1,z,3.6,.25,1.25,'#b5a489',parent);
    for(let i=0;i<3;i++){const flame=sphere(x-.5+i*.5,.45,z+.6,.35,basic('#d98746'),parent,[.7,1.4,.5],false);animated.push({kind:'flame',object:flame,phase:i});}
    candle(x-1.1,z,parent,2.25,.65);candle(x+1.1,z,parent,2.25,.65);
  }
  function staircase(x,z,up){
    const g=new THREE.Group();g.position.set(x,0,z);art.add(g);
    box(0,.08,0,3.2,.14,2.7,'#314e50',g);
    for(let i=0;i<5;i++)box(0,.1+i*.16,-.9+i*.42,2.5,.15+i*.31,.4,'#c0a477',g);
    for(const s of [-1,1]){cylinder(s*1.5,.85,1,.08,.1,1.7,colors.brass,g);cylinder(s*1.5,.5,-1,.08,.1,1,colors.brass,g);line([[s*1.5,1,-1],[s*1.5,1.7,1]],'#d6b474',g);}
    const chevron=new THREE.Shape();chevron.moveTo(-.65,0);chevron.lineTo(0,.7);chevron.lineTo(.65,0);chevron.lineTo(.35,0);chevron.lineTo(0,.35);chevron.lineTo(-.35,0);chevron.closePath();
    const arrow=mesh(new THREE.ShapeGeometry(chevron),basic(up?'#f5cc78':'#8ed2d0'),g);arrow.rotation.x=-Math.PI/2;arrow.rotation.z=up?0:Math.PI;arrow.position.set(0,.96,.35);
    tag(up?'UP':'DOWN',x,z+1.9,.38,up?'#f7ce81':'#88bbb9');
    disc(x,.06,z,2.05,up?'#edbd5d':'#60b7c0',art,.06);
  }
  const roomNames=[['The Conservatory','The Long Gallery','The Dining Room','The Cobweb Parlour','The Foyer','The Clock Room'],['The Moonlit Study','The Doll Room','The East Library','The Blue Bedroom','The Landing','The Sealed Salon'],['The Winter Garden','The Mourning Room','The Observatory','The Music Room','The Dusty Landing','The Nursery'],['The Crooked Stair','The Family Vault','The Moth Room','The Trunk Room','The Last Landing','The Rafter Room']];
  function clear(group){while(group.children.length){const child=group.children.pop();child.parent=null;child.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material?.map)o.material.map.dispose();});}}
  function setFloor(floor){
    if(currentFloor===floor)return;
    currentFloor=floor;clear(art);obstacles.length=0;animated.length=0;mixers.length=0;
    const palette=[['#60584b','#6c5e4d','#20474c'],['#5d4f54','#6b5959','#3b3d53'],['#4b5650','#626a58','#284753'],['#645447','#78634f','#3b4350']][floor]||['#60584b','#6c5e4d','#20474c'];
    box(0,-.65,0,37.3,1.2,23.2,'#101e29');box(0,-.12,0,36.6,.15,22.6,colors.brass);box(0,-.02,0,36,.14,22,'#3a3f3c');
    // Individually staggered parquet boards and their ink seams.
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){
      const cx=(col-1)*12,cz=(row-.5)*11;
      box(cx,.005,cz,11.7,.05,10.7,palette[0],art,false);
      for(let j=0;j<15;j++)for(let i=0;i<5;i++){
        const px=cx-5.6+i*2.32+(j%2)*.45;
        const w=i===4&&j%2?1.8:2.25;
        if(px+w/2>cx+5.85)continue;
        box(px,.04,cz-5.05+j*.71,w,.025,.66,(i+j)%3?palette[0]:palette[1],art,false);
        if((i+j)%4===0)line([[px-w*.34,.058,cz-5.02+j*.71],[px+w*.25,.058,cz-5.03+j*.71]],'#373e39',art,.4);
      }
      // Velvet rugs with a botanical geometric border, kept flush to walk over.
      const rug=['#425953','#6d414b','#354f5c','#6c4e47','#5c5948','#3f5e5a'][(col+row*3+floor)%6];
      box(cx,.067,cz,7.7,.025,6.65,'#182d31',art,false);box(cx,.084,cz,7.45,.025,6.4,'#b69566',art,false);box(cx,.101,cz,7.15,.025,6.08,rug,art,false);
      box(cx,.117,cz,6.8,.018,5.74,'#b69566',art,false);box(cx,.129,cz,6.67,.018,5.61,rug,art,false);
      for(let k=0;k<8;k++){
        const a=k*Math.PI/4;line([[cx+Math.cos(a)*.55,.145,cz+Math.sin(a)*.55],[cx+Math.cos(a)*2.15,.145,cz+Math.sin(a)*2.15]],'#ab9067',art,.45);
        const fl=sphere(cx+Math.cos(a)*2.15,.145,cz+Math.sin(a)*2.15,.075,'#b59a71',art,[1,.12,1],false);fl.castShadow=false;
      }
      const diamond=mesh(new THREE.RingGeometry(.64,.69,4),basic('#b69b6f'),art);diamond.rotation.x=-Math.PI/2;diamond.rotation.z=Math.PI/4;diamond.position.set(cx,.15,cz);
      tag(roomNames[floor][row*3+col],cx,cz+2.4,.62);
      // Perimeter furniture leaves all room centers and door routes clear.
      const furnishing=(row*3+col+floor)%6;
      if(furnishing===0){books(cx-2.1,cz-4.5,art,4);grandfather(cx+4.5,cz-4.4);table(cx-3.7,cz+3.1);addCollider(cx-2.1,cz-4.5,4,.7);addCollider(cx+4.5,cz-4.4,1.1,.65);addCollider(cx-3.7,cz+3.1,2.6,1.25);}
      if(furnishing===1){portrait(cx-3.3,cz-5.12,0);portrait(cx,cz-5.12,1);portrait(cx+3.3,cz-5.12,2);plant(cx-4.5,cz+3.8);chair(cx+4.2,cz-3.7,art,-.4);addCollider(cx-4.5,cz+3.8,.7,.7);}
      if(furnishing===2){fireplace(cx-2.5,cz-4.7);table(cx+3.7,cz+3.1,art,1);chair(cx+3.7,cz+4.25);addCollider(cx-2.5,cz-4.7,3.1,.9);addCollider(cx+3.7,cz+3.1,2.6,1.25);}
      if(furnishing===3){table(cx-3.6,cz-3.6,art,1);chair(cx-3.6,cz-4.8,art,Math.PI);chair(cx-3.6,cz-2.5);windowArt(cx+2.7,cz-5.1);plant(cx+4.6,cz+4);addCollider(cx-3.6,cz-3.6,2.6,1.25);}
      if(furnishing===4){grandfather(cx-4.8,cz-3.9);portrait(cx+3,cz-5.1,1);chair(cx+4.5,cz+3.3,art,-Math.PI/2);addCollider(cx-4.8,cz-3.9,1.1,.65);}
      if(furnishing===5){windowArt(cx-2.5,cz-5.1);plant(cx+4.5,cz-4);plant(cx+4.8,cz+3.8);table(cx-3.6,cz+3.4);addCollider(cx+4.5,cz-4,.7,.7);addCollider(cx-3.6,cz+3.4,2.6,1.25);}
      candle(cx+4.9,cz+4.4,art,.1,.8);
      // Inlaid runes and scattered tiny bone-white pages.
      for(let p=0;p<3;p++){
        const page=box(cx-4.3+p*.46,.08,cz+1.9+p*.18,.35,.012,.46,'#a9aa92',art,false);page.rotation.y=p*.9;
      }
      const lamp=new THREE.PointLight(['#ffbd70','#87b9c4','#daa7ad'][(col+row)%3],9,9,2);lamp.position.set(cx-2,3.2,cz-3);art.add(lamp);
    }
    // Exterior cutaway walls. The front rail is low to keep the player visible.
    wall(0,-11,36.5,.32,2.7);wall(-18,0,.32,22,1.6);wall(18,0,.32,22,1.6);
    wall(-10,11,16,.32,.55);wall(10,11,16,.32,.55);
    for(const x of [-6,6])for(const cz of [-5.5,5.5]){
      wall(x,cz-3.55,.25,3.9,1.12);wall(x,cz+3.55,.25,3.9,1.12);arch(x,cz,false);
    }
    for(const cx of [-12,0,12]){wall(cx-3.8,0,4.4,.25,1.18);wall(cx+3.8,0,4.4,.25,1.18);arch(cx,0,true);}
    // Finials, exterior stone tiles, and brass corner braces.
    for(const x of [-18,18])for(const z of [-11,11]){box(x,.4,z,.55,.8,.55,'#63716b');sphere(x,.95,z,.23,colors.brass);}
    for(let i=0;i<9;i++)box(-3.1+i*.78,-.38,12,.71,.18,1.5,'#64716b',art);
    if(floor===0){arch(0,11,true);tag('HOME, IF YOU DARE',0,12.7,.5);disc(0,.04,10,1.5,'#d1b079',art,.08);}
    staircase(-14,-8,true);staircase(14,8,false);
    // Cobweb fans stretched between rafters, rendered as fine ink-white threads.
    for(const [x,z] of [[-17.8,-10.8],[17.8,-10.8],[-5.8,.15],[6.1,-10.8]]){
      for(let i=0;i<5;i++){const a=i*Math.PI/8;line([[x,1.5,z],[x+Math.cos(a)*2.3,1.5-i*.12,z+Math.sin(a)*2.3]],'#718080',art,.3);}
      for(let r=1;r<4;r++){
        const pts=[];for(let i=0;i<5;i++){const a=i*Math.PI/8;pts.push([x+Math.cos(a)*r*.58,1.5-i*.12*r/4,z+Math.sin(a)*r*.58]);}line(pts,'#718080',art,.25);
      }
    }
  }
  function eye(parent,x,y,z,size=.13,evil=false){
    sphere(x,y,z,size,basic(evil?'#ffbc7b':'#f5efd2'),parent,[.77,1.25,.4],false);
    sphere(x+.017,y-.015,z+size*.39,size*.4,basic('#122531'),parent,[.7,1.1,.7],false);
  }
  function playerModel(id,index=0){
    const first=index%2===0;
    const root=new THREE.Group();actors.add(root);
    const body=new THREE.Group();body.name='Body';root.add(body);
    const cloak=mesh(new THREE.ConeGeometry(.49,1.2,9,1,true),mat(first?'#294952':'#644e71',{side:THREE.DoubleSide}),body,true);cloak.position.y=.65;
    cylinder(0,.13,0,.48,.52,.18,'#132731',body);
    const face=sphere(0,1.04,.04,.4,'#142b36',body,[1,1,.9]);
    // The source's enormous eyes remain the most readable feature.
    eye(body,-.14,1.08,.38,.15);eye(body,.14,1.08,.38,.15);
    const collar=mesh(new THREE.TorusGeometry(.32,.075,5,12),mat(first?'#dfb663':'#9bbad1'),body);collar.rotation.x=Math.PI/2;collar.position.y=.79;
    const hat=mesh(new THREE.ConeGeometry(.48,.6,7),mat(first?'#577276':'#856b8e'),body,true);hat.position.set(.02,1.63,-.03);hat.rotation.z=-.18;
    cylinder(0,1.39,0,.55,.55,.08,first?'#bd9b5b':'#9f9bbc',body);
    const hand=new THREE.Group();hand.name='Hand';hand.position.set(.52,.84,.15);body.add(hand);
    sphere(0,0,0,.12,'#d5c49a',hand);box(0,.25,0,.042,.5,.042,'#d3bb88',hand,false);
    const flame=sphere(0,.57,0,.14,basic('#ffcc71'),hand,[.6,1.6,.6],false);flame.name='Flame';
    const light=new THREE.PointLight('#ffc36e',21,10,1.7);light.position.set(.5,1.55,.25);root.add(light);
    const pool=disc(0,.16,0,3.5,'#e9aa55',root,.075);pool.name='Pool';
    const ring=mesh(new THREE.RingGeometry(.52,.58,36),basic(first?'#dfbd77':'#9dc0e5',{transparent:true,opacity:.8,depthWrite:false}),root);ring.rotation.x=-Math.PI/2;ring.position.y=.16;
    const carry=new THREE.Group();carry.position.set(-.48,.8,.18);body.add(carry);
    const ward=new THREE.Group();ward.name='Ward';root.add(ward);
    const wardRing=mesh(new THREE.RingGeometry(.94,1.015,48),basic('#99e3e7',{transparent:true,opacity:.75,depthWrite:false}),ward);wardRing.rotation.x=-Math.PI/2;wardRing.position.y=.18;wardRing.castShadow=false;
    const wardInner=mesh(new THREE.RingGeometry(.77,.79,48),basic('#b4e3ef',{transparent:true,opacity:.4,depthWrite:false}),ward);wardInner.rotation.x=-Math.PI/2;wardInner.position.y=.185;wardInner.castShadow=false;
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;const star=mesh(new THREE.OctahedronGeometry(.07),basic('#b6eced'),ward);star.position.set(Math.cos(a)*.98,.28,Math.sin(a)*.98);star.castShadow=false;
      if(i%2===0){const trail=mesh(new THREE.TorusGeometry(.77,.012,3,32,Math.PI*.55),basic('#78c4db',{transparent:true,opacity:.6}),ward);trail.rotation.set(Math.PI/2+.4,a,.2);trail.position.y=.78;trail.castShadow=false;}
    }
    const wardLight=new THREE.PointLight('#71cbdc',6,5,2);wardLight.position.y=1;ward.add(wardLight);ward.visible=false;
    const mixer=new THREE.AnimationMixer(root);
    const idle=new THREE.AnimationClip('nervous breathing',2.2,[new THREE.NumberKeyframeTrack('Body.position[y]',[0,1.1,2.2],[0,.055,0]),new THREE.NumberKeyframeTrack('Hand.rotation[z]',[0,1.1,2.2],[-.13,.06,-.13])]);
    const walk=new THREE.AnimationClip('tiptoe',.58,[new THREE.NumberKeyframeTrack('Body.rotation[z]',[0,.145,.29,.435,.58],[-.07,0,.07,0,-.07])]);
    mixer.clipAction(idle).play();const walkAction=mixer.clipAction(walk);walkAction.play();
    mixer.clipAction(new THREE.AnimationClip('moon ward',5,[new THREE.NumberKeyframeTrack('Ward.rotation[y]',[0,5],[0,Math.PI*2])])).play();
    return {root,body,light,pool,flame,mixer,walkAction,carry,ward,ring,kind:'player',previous:new THREE.Vector2(),carryType:null};
  }
  function enemyModel(type,id){
    const root=new THREE.Group(),body=new THREE.Group();body.name='Body';root.add(body);actors.add(root);
    if(type==='ghost'){
      const shape=new THREE.Shape();shape.moveTo(-.65,-.65);shape.bezierCurveTo(-.95,.7,-.65,1.4,0,1.4);shape.bezierCurveTo(.65,1.4,.95,.7,.65,-.65);for(let i=0;i<5;i++)shape.lineTo(.65-i*.325,-.65+(i%2)*.3);shape.closePath();
      const ghost=mesh(new THREE.ExtrudeGeometry(shape,{depth:.6,bevelEnabled:true,bevelThickness:.12,bevelSize:.1,bevelSegments:1,steps:1}),mat('#9ac9c0',{emissive:'#244d50',emissiveIntensity:.5,transparent:true,opacity:.87}),body,true);ghost.position.set(0,1.15,-.3);
      eye(body,-.25,1.9,.49,.19,true);eye(body,.25,1.9,.49,.19,true);
      const mouth=sphere(0,1.4,.48,.2,basic('#25414a'),body,[.8,1.4,.25],false);
      const hat=mesh(new THREE.CylinderGeometry(.6,.72,.35,8),mat('#293944'),body,true);hat.position.set(0,2.64,0);cylinder(0,2.44,0,.91,.91,.1,'#33464d',body);
      const light=new THREE.PointLight('#81d6cc',7,5,2);light.position.y=1.7;root.add(light);
      disc(0,.17,0,1.2,'#67bfb6',root,.065);
    } else if(type==='bat'){
      sphere(0,1.35,0,.32,'#52415d',body,[1,1.25,.9]);
      for(const side of [-1,1]){
        const wing=new THREE.Group();wing.name=side<0?'LeftWing':'RightWing';wing.position.set(side*.17,1.48,0);body.add(wing);
        const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*.8,.65,side*1.5,.25);shape.lineTo(side*1.3,-.5);shape.quadraticCurveTo(side*.85,-.15,side*.68,-.6);shape.quadraticCurveTo(side*.25,-.15,0,-.35);shape.closePath();
        mesh(new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}),mat('#855778',{side:THREE.DoubleSide}),wing,true);
        line([[0,0,.07],[side*.7,-.1,.07],[side*1.3,-.5,.07]],'#c28b93',wing);
        const ear=mesh(new THREE.ConeGeometry(.18,.5,3),mat('#8a607d'),body);ear.position.set(side*.2,1.82,0);
      }
      eye(body,-.12,1.43,.28,.11,true);eye(body,.12,1.43,.28,.11,true);
    } else {
      sphere(0,.45,0,.52,'#513c4c',body,[1,.6,1.1]);sphere(0,.46,.45,.31,'#69536b',body,[1,.75,.7]);
      for(let i=0;i<4;i++)for(const side of [-1,1]){
        const leg=new THREE.Group();leg.name=`Leg${side<0?'L':'R'}${i}`;body.add(leg);
        const z=(i-1.5)*.25;line([[side*.35,.45,z],[side*.8,.65,z-.15],[side*1.1,.1,z+.12]],'#a18994',leg);
        const bone=cylinder(side*.67,.5,z,.055,.07,.7,'#5d4358',leg,5);bone.rotation.z=side*.9;
      }
      eye(body,-.13,.55,.68,.12,true);eye(body,.13,.55,.68,.12,true);
      for(const s of [-1,1])sphere(s*.32,.5,.56,.06,basic('#f0bb84'),body,[1,1,.5],false);
    }
    const alert=new THREE.Group();root.add(alert);
    const dangerRing=mesh(new THREE.RingGeometry(type==='spider'?1.14:.93,type==='spider'?1.2:1,40),basic('#f2aa71',{transparent:true,opacity:.65,depthWrite:false}),alert);dangerRing.rotation.x=-Math.PI/2;dangerRing.position.y=.18;dangerRing.castShadow=false;
    const badge=new THREE.Group();badge.position.y=type==='ghost'?3.25:type==='bat'?2.6:1.5;alert.add(badge);
    box(0,.12,0,.075,.34,.03,basic('#ffd58f'),badge,false);sphere(0,-.15,0,.055,basic('#ffd58f'),badge,[1,1,.3],false);
    alert.visible=false;
    const dazed=new THREE.Group();root.add(dazed);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const star=mesh(new THREE.OctahedronGeometry(.12),basic('#a2dfe2'),dazed);star.position.set(Math.cos(a)*.5,type==='ghost'?2.9:type==='bat'?2.2:1,Math.sin(a)*.5);star.castShadow=false;}
    dazed.visible=false;
    const mixer=new THREE.AnimationMixer(root),tracks=[];
    tracks.push(new THREE.NumberKeyframeTrack('Body.position[y]',[0,.6,1.2],[0,type==='ghost'?.2:type==='bat'?.12:.035,0]));
    tracks.push(new THREE.NumberKeyframeTrack('Body.rotation[z]',[0,.6,1.2],[-.04,.04,-.04]));
    if(type==='bat')for(const [name,s] of [['LeftWing',1],['RightWing',-1]])tracks.push(new THREE.NumberKeyframeTrack(`${name}.rotation[z]`,[0,.13,.26],[s*-.3,s*.65,s*-.3]));
    if(type==='spider')for(let i=0;i<4;i++)for(const side of ['L','R'])tracks.push(new THREE.NumberKeyframeTrack(`Leg${side}${i}.rotation[y]`,[0,.2,.4],i%2?[-.1,.1,-.1]:[.1,-.1,.1]));
    mixer.clipAction(new THREE.AnimationClip(type+' haunt',type==='bat'?.26:type==='spider'?.4:1.2,tracks)).play();
    return {root,body,mixer,alert,dangerRing,badge,dazed,kind:type};
  }
  function itemModel(type,pieces=1){
    const root=new THREE.Group(),object=new THREE.Group();object.name='Treasure';root.add(object);
    if(type==='key'){
      const ring=mesh(new THREE.TorusGeometry(.24,.075,6,12),mat('#e6bd67',{metalness:.55,emissive:'#87602d',emissiveIntensity:.25}),object);ring.rotation.x=Math.PI/2;ring.position.set(-.24,.1,0);
      box(.15,.1,0,.65,.12,.12,colors.gold,object);box(.43,.1,.13,.12,.12,.3,colors.gold,object);box(.19,.1,.12,.09,.12,.26,colors.gold,object);
    }else if(type==='scepter'){
      const stem=cylinder(0,.15,0,.045,.06,1.1,colors.gold,object);stem.rotation.z=-.65;
      const gem=mesh(new THREE.OctahedronGeometry(.26),mat('#91c5dd',{emissive:'#5e9dbd',emissiveIntensity:.8}),object);gem.position.set(.35,.6,0);
      const ring=mesh(new THREE.TorusGeometry(.33,.035,5,12),mat(colors.gold),object);ring.position.copy(gem.position);ring.rotation.x=.4;
    }else{
      const n=typeof pieces==='number'?pieces:Array.isArray(pieces)?pieces.length:1;
      const gold=mat('#d3ad69',{metalness:.3,emissive:'#84602a',emissiveIntensity:.18});
      if(n===1){const shard=mesh(new THREE.CylinderGeometry(.33,.22,.45,7,1,true,0,Math.PI*1.25),gold,object,true);shard.rotation.z=.24;shard.position.y=.23;}
      else {
        const urn=mesh(new THREE.LatheGeometry([new THREE.Vector2(.15,0),new THREE.Vector2(.3,.08),new THREE.Vector2(.37,.3),new THREE.Vector2(.26,.6),new THREE.Vector2(.2,.69),new THREE.Vector2(.3,.73)],12),gold,object,true);urn.position.y=.05;
        for(const side of [-1,1]){const handle=mesh(new THREE.TorusGeometry(.16,.04,5,10,Math.PI*1.4),gold,object);handle.position.set(side*.32,.52,0);handle.rotation.z=side*Math.PI/2;}
        if(n>=3){cylinder(0,.83,0,.29,.24,.12,colors.gold,object);sphere(0,.96,0,.09,colors.gold,object);}
      }
      const detail=mesh(new THREE.TorusGeometry(.3,.025,4,12),mat('#8d6650'),object);detail.rotation.x=Math.PI/2;detail.position.y=.25;
    }
    const halo=disc(0,.02,0,.75,type==='scepter'?'#79c4dc':'#e2b96a',root,.12);
    return {root,object,halo,type,pieces};
  }
  // Reusable motes and fireflies are physical geometry, never image files.
  const motes=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.028,0),basic('#9cafad',{transparent:true,opacity:.55}),95);scene.add(motes);const temp=new THREE.Object3D();
  const moteSeeds=Array.from({length:95},(_,i)=>({x:Math.sin(i*17.32)*20,z:Math.cos(i*7.18)*13,y:.5+(i%13)*.25}));
  const fxMeshes=[];
  function renderEffects(fx,time){
    for(let i=fxMeshes.length;i<fx.length;i++){
      const root=new THREE.Group();effects.add(root);
      const ring=mesh(new THREE.RingGeometry(.9,1.02,40),basic('#f2cf89',{transparent:true,opacity:1,depthWrite:false}),root);ring.rotation.x=-Math.PI/2;ring.position.y=.19;
      const sparks=[];for(let j=0;j<8;j++){const s=mesh(new THREE.OctahedronGeometry(.09),basic('#e7c48b'),root);sparks.push(s);}fxMeshes.push({root,ring,sparks});
    }
    fxMeshes.forEach((f,i)=>{
      const d=fx[i];f.root.visible=!!d;if(!d)return;
      const a=d.age||0;f.root.position.set(d.x||0,0,d.z||0);const radius=.6+a*3;f.ring.scale.setScalar(radius);f.ring.material.opacity=Math.max(0,1-a/1.2);
      f.sparks.forEach((s,j)=>{const an=j*Math.PI/4+time;s.position.set(Math.cos(an)*radius,.5+Math.sin(a*3)*.5,Math.sin(an)*radius);s.scale.setScalar(Math.max(.01,1-a));});
    });
  }
  function syncDoors(doors,floor){
    doorById.forEach(d=>d.root.visible=false);
    for(const d of doors||[]){
      if(d.floor!==undefined&&d.floor!==floor)continue;
      let v=doorById.get(d.id);
      if(!v){
        const root=new THREE.Group();actors.add(root);const leaf=new THREE.Group();root.add(leaf);
        box(0,1,0,2.8,2,.22,'#486065',leaf);for(let i=-1;i<=1;i++)box(i*.78,1,.14,.035,1.8,.02,'#c5a163',leaf,false);
        for(const yy of [.3,1.65])box(0,yy,.17,2.6,.08,.04,colors.brass,leaf,false);
        const lock=mesh(new THREE.BoxGeometry(.42,.5,.18),mat('#d4a95c'),leaf);lock.position.set(0,1,.25);
        const chain=mesh(new THREE.TorusGeometry(.19,.05,5,10,Math.PI),mat('#d4a95c'),leaf);chain.position.set(0,1.35,.25);
        v={root,leaf};doorById.set(d.id,v);
      }
      v.root.visible=!!d.locked;v.root.position.set(d.x,0,d.z);v.root.rotation.y=d.orientation==='x'?Math.PI/2:0;
    }
  }
  let lastState={};
  function update(state,dt){
    lastState=state;sceneTime+=dt;const time=state.time??sceneTime;
    setFloor(state.floor||0);
    const isTitle=state.phase==='title'||state.phase==='menu';
    ambient.intensity=.88+Number(state.brightness??.4)*.7+(state.lightning>0?2.3:0);
    moon.intensity=(state.phase==='won'?3.7:2.5)+(state.lightning>0?3:0);
    const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight;
    if(width!==lastWidth||height!==lastHeight){lastWidth=width;lastHeight=height;renderer.setSize(width,height,false);}
    const aspect=width/height;
    const selected=state.players?.find(p=>p.id===state.cameraPlayerId)||state.players?.[0]||{x:0,z:5};
    const groupView=!!state.cameraAllPlayers&&!isTitle;
    const cameraPlayers=groupView?(state.players||[selected]):[selected];
    const p0=cameraPlayers.reduce((p,n)=>({x:p.x+n.x/cameraPlayers.length,z:p.z+n.z/cameraPlayers.length}),{x:0,z:0});
    let span=isTitle?33:aspect<1?35:27;
    if(groupView&&cameraPlayers.length>1){
      const xs=cameraPlayers.map(p=>.776*p.x-.631*p.z),ys=cameraPlayers.map(p=>-.636*(.631*p.x+.776*p.z));
      span=Math.max(span,(Math.max(...xs)-Math.min(...xs)+9)/aspect,Math.max(...ys)-Math.min(...ys)+10);
    }
    camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
    const targetX=isTitle?-8.5:Math.max(-8,Math.min(8,(p0.x||0)*(groupView ? .8 : .55)));
    const targetZ=isTitle?6:Math.max(-3,Math.min(3,(p0.z||0)*(groupView ? .7 : .35)));
    viewTarget.lerp(new THREE.Vector3(targetX,0,targetZ),Math.min(1,dt*3));
    const shake=state.cameraShake||0;
    camera.position.set(viewTarget.x+26+Math.sin(time*53)*shake,34,viewTarget.z+32+Math.cos(time*47)*shake);
    camera.lookAt(viewTarget.x,0,viewTarget.z);
    actorsById.forEach(a=>a.root.visible=false);
    for(const p of state.players||[]){
      const key='p'+p.id;let a=actorsById.get(key);if(!a){a=playerModel(p.id,(state.players||[]).indexOf(p));actorsById.set(key,a);}
      a.root.visible=p.floor===undefined||p.floor===state.floor;
      a.ring.material.opacity=p.id===selected.id?1:.55;
      a.root.position.set(p.x,0,p.z);
      // Face the lens enough for the source's eyes to remain readable while moving.
      let dir=typeof p.dir==='number'?p.dir:0;
      if(p.dir&&typeof p.dir==='object')dir=Math.atan2(p.dir.x||0,p.dir.z||1);
      a.body.rotation.y=dir*.55+.35;
      a.mixer.update(dt);const speed=Math.hypot(p.x-a.previous.x,p.z-a.previous.y)/Math.max(.001,dt);a.walkAction.timeScale=Math.min(2,.25+speed*.2);a.walkAction.weight=speed>.05?1:.1;a.previous.set(p.x,p.z);
      const lit=!!p.lit;a.flame.visible=lit;a.light.intensity=lit?17+Math.sin(time*17)*2+Math.sin(time*29):.15;
      a.pool.visible=lit;a.pool.scale.setScalar(1+Math.sin(time*5)*.025);a.flame.scale.y=1.5+Math.sin(time*21)*.3;
      a.body.visible=!(p.invulnerable>0)||Math.floor(time*12)%2===0;
      a.root.scale.setScalar(p.dashing?1.08:1);
      const carryType=typeof p.carry==='string'?p.carry:p.carry?.type;a.ward.visible=carryType==='scepter';a.ward.scale.setScalar(1+Math.sin(time*4)*.025);const carryPieces=p.pieces||p.carry?.pieces||1;const carryKey=carryType+JSON.stringify(carryPieces);
      if(a.carryType!==carryKey){clear(a.carry);a.carryType=carryKey;if(carryType){const item=itemModel(carryType,carryPieces);item.root.scale.setScalar(.6);a.carry.add(item.root);}}
    }
    for(const e of state.enemies||[]){
      if(e.floor!==undefined&&e.floor!==state.floor)continue;
      const key='e'+e.id;let a=actorsById.get(key);if(!a){a=enemyModel(e.type,e.id);actorsById.set(key,a);}
      a.root.visible=true;a.root.position.set(e.x,0,e.z);a.body.rotation.y=Math.sin(time*.8+e.x)*.22+.3;a.mixer.update(dt*(e.stun>0?.2:1));
      if(e.stun>0)a.root.rotation.z=Math.sin(time*18)*.08;else a.root.rotation.z=0;
      a.alert.visible=!!e.alert&&!(e.stun>0);a.dangerRing.material.opacity=.38+Math.sin(time*7)*.2;a.dangerRing.scale.setScalar(1+Math.sin(time*7)*.05);a.badge.quaternion.copy(camera.quaternion);a.badge.position.y=(e.type==='ghost'?3.25:e.type==='bat'?2.6:1.5)+Math.sin(time*7)*.055;
      a.dazed.visible=e.stun>0;a.dazed.rotation.y=time*3;
    }
    itemById.forEach(i=>i.root.visible=false);
    for(const item of state.items||[]){
      if(item.floor!==state.floor||(item.held!==undefined&&item.held!==null)||(item.carriedBy!==undefined&&item.carriedBy!==null))continue;
      let a=itemById.get(item.id);
      if(!a||a.type!==item.type||JSON.stringify(a.pieces)!==JSON.stringify(item.pieces)){
        if(a){actors.remove(a.root);clear(a.root);}a=itemModel(item.type,item.pieces);actors.add(a.root);itemById.set(item.id,a);
      }
      const lit=(state.players||[]).some(p=>p.lit&&Math.hypot(p.x-item.x,p.z-item.z)<10);
      a.root.visible=lit||isTitle||state.phase==='attract'||state.revealItems;
      a.root.position.set(item.x,.4+Math.sin(time*2.6+item.x)*.1,item.z);a.object.rotation.y=time*.7;a.halo.rotation.z=time*.3;
    }
    syncDoors(state.doors,state.floor);
    mixers.forEach(m=>m.update(dt));
    for(const a of animated){if(a.kind==='flame'){a.object.scale.y=1.5+Math.sin(time*15+a.phase)*.3;a.object.scale.x=.6+Math.sin(time*12+a.phase)*.08;}}
    moteSeeds.forEach((s,i)=>{temp.position.set(s.x+Math.sin(time*.2+i)*.4,s.y+Math.sin(time*.3+i)*.2,s.z+Math.cos(time*.3+i)*.3);temp.scale.setScalar(.6+(i%4)*.2);temp.updateMatrix();motes.setMatrixAt(i,temp.matrix);});motes.instanceMatrix.needsUpdate=true;
    renderEffects(state.fx||[],time);
    renderer.render(scene,camera);
  }
  const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  function project(x,z){const p=new THREE.Vector3(x,1,z).project(camera);return{x:(p.x*.5+.5)*lastWidth,y:(-.5*p.y+.5)*lastHeight};}
  function unproject(x,y){raycaster.setFromCamera(new THREE.Vector2(x/lastWidth*2-1,1-y/lastHeight*2),camera);const p=new THREE.Vector3();if(raycaster.ray.intersectPlane(plane,p))return{x:p.x,z:p.z};return null;}
  setFloor(0);
  return {renderer,scene,camera,obstacles,setFloor,update,project,unproject,actors,backend:renderer.backend.isWebGPUBackend?'WebGPU':'WebGL 2 fallback',dispose(){renderer.dispose();},getRoomNames:()=>roomNames};
}
