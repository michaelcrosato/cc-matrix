import * as THREE from 'three/webgpu';
import {PLANETS,clamp,rngFrom} from './core.js';

const INK='#111c35';
export class View {
  async init(container){
    this.renderer=new THREE.WebGPURenderer({antialias:true,alpha:false,forceWebGL:new URLSearchParams(location.search).get('renderer')==='webgl'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor('#10182f');
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    await this.renderer.init();container.appendChild(this.renderer.domElement);this.backend=this.renderer.backend.isWebGPUBackend?'WebGPU':'WebGL 2 fallback';
    this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2('#131c37',.008);this.camera=new THREE.OrthographicCamera(-22,22,12.4,-12.4,.1,150);this.camera.position.set(0,3,45);this.camera.lookAt(0,0,0);
    this.scene.add(new THREE.AmbientLight('#9bb6ee',.8));const light=new THREE.DirectionalLight('#fff2cf',2.5);light.position.set(-9,18,20);this.scene.add(light);const rim=new THREE.DirectionalLight('#83e7ef',.6);rim.position.set(12,-4,-8);this.scene.add(rim);
    this.materials=new Map();this.geo={sphere:new THREE.SphereGeometry(1,20,12),ico:new THREE.IcosahedronGeometry(1,0),rock:new THREE.IcosahedronGeometry(1,1),box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,20),cylinder:new THREE.CylinderGeometry(1,1,1,24),torus:new THREE.TorusGeometry(1,.07,6,64)};
    this.inkMat=new THREE.MeshBasicMaterial({color:INK,side:THREE.BackSide});this.white=this.mat('#fff0cd');this.mixers=[];this.meteorMeshes=new Map();this.critters=new Map();this.effects=[];this.ghosts=new Map();this.time=0;this.planetIndex=-1;this.shake=0;
    this.space=new THREE.Group();this.scene.add(this.space);this.makeStars();this.makePlanet();
    this.orbit=new THREE.Group();this.scene.add(this.orbit);this.makeOrbit();
    this.ark=this.makeArk();this.scene.add(this.ark);this.shuttle=this.makeShuttle();this.scene.add(this.shuttle);this.shuttle.visible=false;
    this.surface=new THREE.Group();this.scene.add(this.surface);this.surface.visible=false;this.makeSurface();
    this.titlePassengers=new THREE.Group();this.scene.add(this.titlePassengers);for(let i=0;i<2;i++){const c=this.makeCritter(0,'#f7a4c7',0);c.position.set(4.9+i*1.8,-5.7,5);c.scale.setScalar(1.3);this.titlePassengers.add(c);}
    this.sentinel=this.makeSentinel();this.scene.add(this.sentinel);this.sentinel.visible=false;
    this.beam=new THREE.Group();const beamMat=new THREE.MeshBasicMaterial({color:'#9fffee',transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false});const cone=new THREE.Mesh(new THREE.ConeGeometry(1.5,1,24,1,true),beamMat);this.beam.add(cone);this.beamCone=cone;
    this.beamRings=[];for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.035,5,32),new THREE.MeshBasicMaterial({color:'#9fffee',transparent:true,opacity:.65}));ring.rotation.x=Math.PI/2;this.beam.add(ring);this.beamRings.push(ring);}this.scene.add(this.beam);this.beam.visible=false;
    this.targetRing=new THREE.Mesh(new THREE.TorusGeometry(1,.045,5,48),new THREE.MeshBasicMaterial({color:'#affff1'}));this.scene.add(this.targetRing);this.targetRing.visible=false;
    this.resize();this.setPlanet(0);await this.renderer.compileAsync(this.scene,this.camera);addEventListener('resize',()=>this.resize());return this;
  }
  mat(c,glow=false){const key=c+glow;if(!this.materials.has(key))this.materials.set(key,glow?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshToonNodeMaterial({color:c}));return this.materials.get(key);}
  mesh(geo,c,parent,x=0,y=0,z=0,sx=1,sy=sx,sz=sx,outline=true){const m=new THREE.Mesh(typeof geo==='string'?this.geo[geo]:geo,this.mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);if(outline){const ink=new THREE.Mesh(m.geometry,this.inkMat);ink.scale.setScalar(1.045);m.add(ink);}parent.add(m);return m;}
  line(points,color,parent,opacity=1){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(line);return line;}
  makeStars(){
    const random=rngFrom(4461),pos=[],colors=[];for(let i=0;i<640;i++){pos.push((random()-.5)*125,(random()-.5)*95,-16-random()*45);const c=new THREE.Color(i%4===0?'#b6d5ee':i%5===0?'#f7d4aa':'#7c8bb3');colors.push(c.r,c.g,c.b);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.starField=new THREE.Points(g,new THREE.PointsMaterial({size:1.4,vertexColors:true,sizeAttenuation:false}));this.space.add(this.starField);
    for(let i=0;i<24;i++){const g=new THREE.Group();const x=(random()-.5)*65,y=(random()-.5)*42;g.position.set(x,y,-12-random()*25);const r=.1+random()*.1;this.line([[-r,0,0],[r,0,0]],'#b2dce6',g);this.line([[0,-r,0],[0,r,0]],'#b2dce6',g);this.space.add(g);}
    for(let i=0;i<5;i++){const pts=[];for(let a=0;a<=120;a++){const t=a/120*Math.PI*2;pts.push([Math.cos(t)*(20+i*2),Math.sin(t)*(7+i*.9),-32-i]);}const l=this.line(pts,i%2?'#263859':'#253451',this.space,.5);l.rotation.z=-.35;}
  }
  makePlanet(){
    this.planet=new THREE.Group();this.planet.position.set(12,-6,-20);this.space.add(this.planet);this.planetBall=this.mesh('sphere','#ad98d9',this.planet,0,0,0,7.4);this.planetBall.rotation.z=-.25;
    const rand=rngFrom(31);for(let i=0;i<28;i++){const a=rand()*Math.PI*2,b=(rand()-.5)*2;const p=new THREE.Vector3(Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b)).multiplyScalar(7.4);const dot=this.mesh('sphere',i%2?'#8b7aad':'#d5bbe8',this.planetBall,p.x/7.4,p.y/7.4,p.z/7.4,.04+rand()*.045,.018,.045,false);dot.lookAt(0,0,0);}
    for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(9+i*.27,.04+i*.02,5,120),this.mat(i===1?'#eac4a7':'#7786b7'));r.rotation.x=1.23;r.rotation.y=.2;this.planet.add(r);}
    this.sun=new THREE.Group();this.sun.position.set(-20,10,-34);this.space.add(this.sun);this.mesh('sphere','#ffc48b',this.sun,0,0,0,5.7,5.7,5.7,false);for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(6.2+i*.3,.025,4,96),this.mat('#a4746e',true));this.sun.add(ring);}
  }
  makeOrbit(){
    for(let n=0;n<3;n++){const p=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;p.push([Math.cos(a)*(4.7+n*.17),Math.sin(a)*(4.7+n*.17),-2]);}this.line(p,n===1?'#47617d':'#2a3e5c',this.orbit,.6);}
    for(let d=0;d<4;d++){const a=d*Math.PI/2;for(let n=0;n<4;n++){const x=Math.cos(a)*(6.2+n*1.2),y=Math.sin(a)*(6.2+n*1.2);this.line([[x-.12*Math.sin(a),y+.12*Math.cos(a),-1],[x+.12*Math.sin(a),y-.12*Math.cos(a),-1]],'#3b5370',this.orbit,.6);}}
    this.aimGroup=new THREE.Group();this.orbit.add(this.aimGroup);this.aimGroup.position.z=1;const a=this.mesh('cone','#a0f3df',this.aimGroup,3.5,0,0,.22,.5,.14,false);a.rotation.z=-Math.PI/2;
    this.line([[2.8,0,0],[6.3,0,0]],'#6cb8b4',this.aimGroup,.5);
  }
  makeArk(){
    const g=new THREE.Group();const hull=new THREE.Group();g.add(hull);g.userData.hull=hull;
    this.mesh('sphere','#f0dec0',hull,0,0,0,2.65,1.15,1.45);this.mesh('sphere','#4a698a',hull,0,.16,.55,1.95,.86,1.12);this.mesh('sphere','#a6e7db',hull,0,.42,1.12,1.35,.5,.55);
    this.mesh('sphere','#fff2cc',hull,-.45,.62,1.5,.28,.09,.06,false);this.mesh('sphere','#5d4668',hull,0,-.48,.45,2.3,.32,1.03);
    this.mesh('box','#ecae7c',hull,0,-.57,1.23,.98,.36,.21);for(let i=-1;i<=1;i++)this.mesh('box','#b9efdc',hull,i*.29,-.57,1.37,.12,.11,.06,false);
    for(const sign of [-1,1]){const fin=this.mesh('box','#b89cc5',hull,sign*2.2,.05,-.05,1.4,.22,.8);fin.rotation.z=sign*.18;this.mesh('sphere','#eac9ae',hull,sign*2.85,-.22,.1,.44,.5,.6);this.mesh('sphere','#98f1df',hull,sign*2.85,-.25,.62,.23,.21,.11);this.mesh('cone','#ffcf84',hull,sign*2.85,-.85,0,.2,.6,.2,false);}
    this.mesh('cylinder','#ecae7c',hull,0,1.02,0,.12,.7,.12);this.mesh('sphere','#9aebd3',hull,0,1.42,0,.2);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;this.mesh('sphere','#f8e0ac',hull,Math.cos(a)*2,-.28,Math.sin(a)*1.1,.075,.07,.06,false);}
    const mixer=new THREE.AnimationMixer(hull);const clip=new THREE.AnimationClip('Ark idle',4,[new THREE.NumberKeyframeTrack('.position[y]',[0,1,2,3,4],[0,.12,0,-.12,0]),new THREE.NumberKeyframeTrack('.rotation[z]',[0,2,4],[-.025,.025,-.025])]);mixer.clipAction(clip).play();this.mixers.push(mixer);return g;
  }
  makeShuttle(ghost=false,color='#efc18c'){
    const g=new THREE.Group();const h=new THREE.Group();g.add(h);g.userData.hull=h;
    this.mesh('sphere',color,h,0,0,0,1,.38,.57);this.mesh('sphere',ghost?'#91bef8':'#9be9de',h,0,.25,.14,.57,.39,.42);this.mesh('box','#55506f',h,0,-.24,.08,1.4,.16,.6);this.mesh('sphere','#fff3d1',h,-.18,.39,.5,.14,.07,.04,false);
    for(const s of [-1,1]){const wing=this.mesh('box',color,h,s*.85,.02,-.1,.7,.1,.62);wing.rotation.z=s*.13;this.mesh('sphere','#8deedb',h,s*.91,-.18,.22,.12,.12,.1);}
    const flame=new THREE.Group();flame.position.set(0,-.42,0);this.mesh('cone','#fff2bd',flame,0,-.18,0,.22,.52,.2,false).rotation.z=Math.PI;h.add(flame);g.userData.flame=flame;
    const mixer=new THREE.AnimationMixer(flame);mixer.clipAction(new THREE.AnimationClip('Engine flutter',.32,[new THREE.VectorKeyframeTrack('.scale',[0,.08,.16,.24,.32],[1,1,1,.8,1.5,.8,1.1,.8,1.1,.9,1.3,.9,1,1,1])])).play();this.mixers.push(mixer);return g;
  }
  makeSurface(){
    this.groundParts=[];const terrain=new THREE.Shape();terrain.moveTo(-30,-9);for(let i=0;i<=60;i++){const x=-30+i;terrain.lineTo(x,-7.9+Math.sin(x*.33)*.3+Math.cos(x*.81)*.13);}terrain.lineTo(30,-20);terrain.lineTo(-30,-20);terrain.closePath();
    const terrainGeo=new THREE.ExtrudeGeometry(terrain,{depth:6,bevelEnabled:false});const ground=this.mesh(terrainGeo,'#65549c',this.surface,0,0,-3,1,1,1,false);this.groundParts.push(ground);
    for(let l=0;l<3;l++){const pts=[];for(let i=0;i<=80;i++){const x=-40+i;pts.push([x,-9-l*.55+Math.sin(x*.31+l)*.2,3.05]);}this.line(pts,l===0?'#bc92b6':'#534570',this.surface,.7);}
    this.plants=[];const random=rngFrom(75);for(let i=0;i<37;i++){
      const x=-25+random()*50,back=i%3===0,z=back?-4:1.2;const g=new THREE.Group();g.position.set(x,-7.7+(back?.3:0),z);const size=.3+random()*.7;g.scale.setScalar(size);this.surface.add(g);
      this.mesh('cylinder','#798b93',g,0,.6,0,.07,1.2,.07);const cap=this.mesh('sphere',i%2?'#d3a7d2':'#8eafd0',g,0,1.35,0,.78,.25,.53);cap.rotation.z=(random()-.5)*.3;
      this.mesh('sphere','#ffe2b4',g,-.22,1.45,.38,.08,.07,.05,false);this.mesh('sphere','#ffe2b4',g,.17,1.5,.4,.06,.06,.04,false);
      this.plants.push(g);
    }
    this.peaks=[];for(let i=0;i<7;i++){const x=-28+i*9;const g=new THREE.Group();g.position.set(x,-7.7,-6);g.scale.setScalar(2);this.surface.add(g);this.peaks.push(this.mesh('cone','#4e537d',g,0,1.5,0,1,4,1.2),this.mesh('cone','#4e537d',g,1.3,1,0,.7,2.8,.8));}
    this.dockRing=new THREE.Mesh(new THREE.TorusGeometry(2,.055,6,64),this.mat('#a5efda',true));this.dockRing.scale.y=.36;this.dockRing.position.set(0,5.6,-.5);this.surface.add(this.dockRing);
    this.dockArrows=[];for(let i=0;i<3;i++){const arrow=this.mesh('cone','#b5e7cd',this.surface,0,4-i*.5,-1,.14,.25,.05,false);this.dockArrows.push(arrow);}
  }
  makeCritter(species,c,variant=0){
    const g=new THREE.Group();const body=new THREE.Group();g.add(body);g.userData.body=body;const round=variant%3;
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:INK,transparent:true,opacity:.24,depthWrite:false}));shadow.position.set(0,-.09,-.15);shadow.scale.set(.57,.1,1);g.add(shadow);
    this.mesh('sphere',c,body,0,.44,0,.55,.55,.42);this.mesh('sphere','#f9e7c5',body,0,.3,.31,.33,.29,.16);
    for(const s of [-1,1]){this.mesh('sphere',c,body,s*.35,.04,.13,.22,.11,.25);this.mesh('sphere',INK,body,s*.19,.57,.38,.07,.105,.055,false);this.mesh('sphere','#fff7dd',body,s*.19-.015,.6,.425,.023,.03,.015,false);this.mesh('sphere','#f1a0af',body,s*.34,.39,.36,.105,.045,.025,false);}
    this.line([[-.07,.34,.46],[0,.3,.48],[.07,.34,.46]],INK,body);
    if(round===0){for(const s of [-1,1]){const ear=this.mesh('sphere',c,body,s*.33,1.05,-.03,.16,.46,.15);ear.rotation.z=-s*.25;this.mesh('sphere','#fbd4bf',ear,0,.13,.7,.5,.65,.3,false);}}
    if(round===1){for(const s of [-1,1]){const leaf=this.mesh('sphere',s===1?'#d8f39a':'#78cba8',body,s*.18,1,-.02,.32,.13,.15);leaf.rotation.z=s*.45;}this.mesh('cylinder','#75a68b',body,0,.9,0,.04,.35,.04);}
    if(round===2){this.mesh('cone',c,body,0,1.05,0,.27,.56,.23);for(const s of [-1,1]){const fin=this.mesh('sphere',c,body,s*.63,.5,0,.3,.13,.23);fin.rotation.z=s*.5;}this.mesh('sphere','#f9e49a',body,0,1.35,0,.12);}
    const mixer=new THREE.AnimationMixer(body);const dur=1.2+species*.17;const clip=new THREE.AnimationClip('Creature bounce',dur,[new THREE.NumberKeyframeTrack('.position[y]',[0,dur*.25,dur*.5,dur*.75,dur],[0,.13,0,.07,0]),new THREE.VectorKeyframeTrack('.scale',[0,dur*.25,dur*.5,dur],[1.06,.94,1, .96,1.08,1, 1.04,.96,1, 1.06,.94,1]),new THREE.NumberKeyframeTrack('.rotation[z]',[0,dur*.5,dur],[-.07,.07,-.07])]);mixer.clipAction(clip).play();this.mixers.push(mixer);g.userData.mixer=mixer;return g;
  }
  makeSentinel(){const g=new THREE.Group();this.mesh('sphere','#68557d',g,0,0,0,1.05,.37,.6);this.mesh('sphere','#ffa1a2',g,0,-.13,.48,.43,.18,.1);for(const s of [-1,1])this.mesh('cone','#d493ad',g,s*.95,.18,0,.18,.6,.2).rotation.z=-s*.9;const ring=new THREE.Mesh(new THREE.TorusGeometry(1.35,.04,6,48),this.mat('#d5a3b2'));ring.rotation.x=Math.PI/2.7;g.add(ring);return g;}
  setPlanet(index){
    this.planetIndex=index;const p=PLANETS[index];this.planetBall.material=this.mat(p.color);this.groundParts.forEach(m=>m.material=this.mat(p.ground));this.renderer.setClearColor(p.sky);
    const peakColor='#'+new THREE.Color(p.ground).lerp(new THREE.Color(p.sky),.35).getHexString();this.peaks.forEach(m=>m.material=this.mat(peakColor));this.plants.forEach((g,i)=>{g.children[1].material=this.mat(i%2?p.color:p.colors[1]);});
    for(const c of this.critters.values()){this.surface.remove(c);const mix=c.userData.mixer;this.mixers=this.mixers.filter(m=>m!==mix);mix?.stopAllAction();}this.critters.clear();
    for(let i=0;i<6;i++){const species=[0,1,2,2,1,0][i];const c=this.makeCritter(species,p.colors[species],species+index);this.surface.add(c);this.critters.set(i,c);}
  }
  effect(x,y,color='#a0f6e0',count=12){
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2,s=1.4+(i%3)*1.1;const m=new THREE.Mesh(this.geo.ico,this.mat(color,true));m.position.set(x,y,.5);m.scale.setScalar(.06+(i%3)*.04);this.scene.add(m);this.effects.push({mesh:m,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.55,total:.55,spin:i*.3});}
  }
  pulse(x,y){const m=new THREE.Mesh(new THREE.TorusGeometry(1,.06,6,100),new THREE.MeshBasicMaterial({color:'#b9fff0',transparent:true,opacity:.9,depthWrite:false}));m.position.set(x,y,1);this.scene.add(m);this.effects.push({mesh:m,life:.65,total:.65,pulse:true});this.shake=.14;}
  handle(events){for(const e of events){if(e.type==='burst')this.effect(e.x,e.y,e.color);if(e.type==='pickup')this.effect(e.x,e.y,'#f9dc9b',15);if(e.type==='pulse')this.pulse(e.x,e.y);if(e.type==='hit')this.shake=.4;if(e.type==='dock')this.effect(0,5,'#b8ffda',24);}}
  resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);const halfH=Math.max(12,21/(w/h));this.camera.left=-halfH*w/h;this.camera.right=halfH*w/h;this.camera.top=halfH;this.camera.bottom=-halfH;this.camera.updateProjectionMatrix();}
  worldPoint(x,y){const p=new THREE.Vector3(x/innerWidth*2-1,-y/innerHeight*2+1,0).unproject(this.camera);const ray=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);const t=-p.z/ray.z;return p.addScaledVector(ray,t);}
  screenPoint(x,y,z=0){const p=new THREE.Vector3(x,y,z).project(this.camera);return {x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight};}
  update(dt,game,{title=false,attract=false,ghosts=[]}={}){
    if(this.generation!==game.generation){this.generation=game.generation;for(const m of this.meteorMeshes.values())this.scene.remove(m);this.meteorMeshes.clear();this.planetIndex=-1;}
    this.time+=dt;const t=this.time,s=game.shuttle;this.mixers.forEach(m=>m.update(dt));if(this.planetIndex!==game.planet)this.setPlanet(game.planet);this.titlePassengers.visible=title;
    const phase=game.phase;const surf=['rescue','warp'].includes(phase);this.surface.visible=surf;this.shuttle.visible=surf;this.sentinel.visible=phase==='rescue';this.orbit.visible=!surf&&!title;this.ark.visible=true;
    this.planet.visible=!surf;this.planet.rotation.z=t*.007;this.starField.rotation.z=Math.sin(t*.015)*.015;
    this.sun.position.x=surf?-13:-20;this.sun.position.y=surf?7:10;this.sun.scale.setScalar(surf?.85:1);
    if(title){this.ark.position.set(9,1,0);this.ark.scale.setScalar(1.75);this.ark.rotation.y=Math.sin(t*.16)*.12;this.orbit.visible=false;
      this.surface.visible=false;this.shuttle.visible=true;this.shuttle.position.set(9+Math.sin(t*.35)*2,-2.8+Math.cos(t*.4)*.6,4);this.shuttle.scale.setScalar(.8);this.sentinel.visible=false;
      for(let i=0;i<6;i++){const c=this.critters.get(i);c.visible=false;}
    }else{
      this.ark.rotation.y=0;this.ark.position.set(0,surf?7.5:0,0);this.ark.scale.setScalar(surf?.86:1);this.shuttle.scale.setScalar(1);this.aimGroup.rotation.z=game.aim*Math.PI/2;
      if(phase==='descent'){const f=clamp(game.phaseTime/3.3,0,1);this.ark.position.y=f*8;this.planet.scale.setScalar(1+f*2);this.shuttle.visible=true;this.shuttle.position.set(0,6-f*7,1);}
      else this.planet.scale.setScalar(1);
      if(surf){this.shuttle.position.set(s.x,s.y,1);this.shuttle.userData.hull.rotation.z=-s.vx*.035;this.shuttle.userData.hull.rotation.y=s.vx*.025;this.sentinel.position.set(game.sentinelX,2.2,0);this.sentinel.rotation.z=Math.sin(t*2)*.08;
        for(const c of game.creatures){const m=this.critters.get(c.id);m.visible=c.status!=='saved';if(c.status==='ground'){m.position.set(c.x,c.y+c.beam*(s.y-c.y-.3),.8);m.scale.setScalar(1-c.beam*.55);m.rotation.z=Math.sin(t*9+c.id)*c.beam*.15;}else if(c.status==='cargo'){const ix=s.cargo.indexOf(c.id);m.position.set(s.x+(ix===0?-.35:.35),s.y+.1,1.45);m.scale.setScalar(.35);m.rotation.z=0;}m.userData.body.rotation.y=Math.sin(t*.6+c.id)*.15;}
        this.dockRing.rotation.z=t*.25;this.dockRing.material.color.set(s.cargo.length?'#f6d797':'#83dfcc');this.dockArrows.forEach((a,i)=>a.visible=Math.sin(t*4+i)>-.25);
      }
      if(phase==='warp'){this.ark.position.y=7.5+(game.phaseTime/3.6)**3*14;this.shuttle.position.y=5.5+game.phaseTime*3;}
      if(phase==='escape'||phase==='victory'){this.ark.position.set(0,Math.sin(t)*.3,0);this.ark.scale.setScalar(1.4);this.planet.visible=false;this.surface.visible=false;this.shuttle.visible=false;this.starField.rotation.z+=dt*.1;}
    }
    this.beam.visible=phase==='rescue'&&s.beam>.01&&!title;
    if(this.beam.visible){const h=Math.max(.1,s.y+6.6);this.beam.position.set(s.x,s.y-h*.5,.45);this.beamCone.scale.set(1,h,1);this.beamCone.material.opacity=.15*s.beam;for(let i=0;i<5;i++){const f=(t*1.5+i/5)%1;const r=1.45*(1-f);this.beamRings[i].position.y=-h*.5+f*h;this.beamRings[i].scale.setScalar(Math.max(.05,r));this.beamRings[i].material.opacity=(1-f)*.7*s.beam;}}
    this.targetRing.visible=false;if(phase==='rescue'&&!title){const c=game.creatures.filter(c=>c.status==='ground'&&Math.abs(c.x-s.x)<2).sort((a,b)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x))[0];if(c){this.targetRing.visible=true;this.targetRing.position.set(c.x,-6.75,1.25);this.targetRing.scale.setScalar(.85+Math.sin(t*5)*.06);this.targetRing.material.color.set(c.beam>0?'#fff0b8':'#9fffee');}}
    const live=new Set();if(!title)for(const e of game.entities.values()){
      if(['ark','shuttle'].includes(e.kind))continue;live.add(e.id);let m=this.meteorMeshes.get(e.id);if(!m){m=new THREE.Group();if(e.kind==='meteor'){this.mesh('rock',e.strong?'#c18bc0':'#a1afc9',m,0,0,0,e.r);this.mesh('rock','#75809e',m,-.2,.15,.45,e.r*.24,.1,.1,false);const trail=this.mesh('cone',e.strong?'#fba6aa':'#f8cc99',m,0,-e.r-.4,-.3,e.r*.5,1.7,e.r*.4,false);trail.rotation.z=Math.PI;}
      else if(e.kind==='shot'){this.mesh('sphere','#d6fff0',m,0,0,0,.17,.65,.15,false);this.mesh('sphere','#76d6c9',m,0,-.5,-.1,.1,.4,.1,false);}
      else {this.mesh('ico','#ff939d',m,0,0,0,.28);const ring=this.mesh('torus','#ffcf9f',m,0,0,0,.42,.42,.42,false);ring.rotation.x=.3;}
      this.scene.add(m);this.meteorMeshes.set(e.id,m);}m.position.set(e.x,e.y,0);m.rotation.z=e.kind==='meteor'||e.kind==='shot'?Math.atan2(e.vy,e.vx)-Math.PI/2:t*4;if(e.kind==='meteor')m.children[0].rotation.y=t*e.spin;if(e.kind==='bolt')m.scale.setScalar(e.warning>0?1.2+Math.sin(t*25)*.35:1);
    }
    for(const [id,m] of this.meteorMeshes)if(!live.has(id)){this.scene.remove(m);this.meteorMeshes.delete(id);}
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;if(e.life<=0){this.scene.remove(e.mesh);if(e.pulse){e.mesh.geometry.dispose();e.mesh.material.dispose();}this.effects.splice(i,1);continue;}const f=e.life/e.total;if(e.pulse){e.mesh.scale.setScalar(1+(1-f)*12);e.mesh.material.opacity=f*.75;}else{e.mesh.position.x+=e.vx*dt;e.mesh.position.y+=e.vy*dt;e.mesh.rotation.z+=dt*e.spin;e.mesh.scale.multiplyScalar(1-dt*2);}}
    const ghostLive=new Set();for(const p of ghosts){if(p.phase!==phase||p.planet!==game.planet||title)continue;ghostLive.add(p.id);let g=this.ghosts.get(p.id);if(!g){g=this.makeShuttle(true,p.color||'#a8c4f3');g.scale.setScalar(.8);this.scene.add(g);this.ghosts.set(p.id,g);}g.position.set(phase==='rescue'?p.x:3.8*Math.cos(p.aim*Math.PI/2),phase==='rescue'?p.y:3.8*Math.sin(p.aim*Math.PI/2),-.5);g.visible=true;}
    for(const [id,g] of this.ghosts)if(!ghostLive.has(id))g.visible=false;
    this.shake=Math.max(0,this.shake-dt);this.camera.position.x=this.shake?Math.sin(t*70)*this.shake*.5:0;this.camera.position.y=3+(this.shake?Math.cos(t*65)*this.shake*.4:0);
    if(game.invul>0&&!title){this.ark.userData.hull.visible=Math.sin(t*25)>.1;this.shuttle.userData.hull.visible=Math.sin(t*25)>.1;}else{this.ark.userData.hull.visible=true;this.shuttle.userData.hull.visible=true;}
    this.renderer.render(this.scene,this.camera);
  }
}
