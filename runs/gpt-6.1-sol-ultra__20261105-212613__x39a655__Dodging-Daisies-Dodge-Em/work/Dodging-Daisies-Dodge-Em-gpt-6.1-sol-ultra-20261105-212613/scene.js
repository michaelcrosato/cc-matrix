import * as THREE from 'three/webgpu';
import { trackPoint } from './core.js';

const INK = 0x243936;
const PALETTE = {cream:0xf7edcf, yellow:0xf4bf45, teal:0x43b6a2, red:0xed7258, road:0x354e4a, mint:0x91c7ae};
const clamp = THREE.MathUtils.clamp;

function roundShape(w,h,r){
  const s=new THREE.Shape();r=Math.min(r,w,h);s.moveTo(w,-h+r);s.lineTo(w,h-r);s.quadraticCurveTo(w,h,w-r,h);s.lineTo(-w+r,h);s.quadraticCurveTo(-w,h,-w,h-r);s.lineTo(-w,-h+r);s.quadraticCurveTo(-w,-h,-w+r,-h);s.lineTo(w-r,-h);s.quadraticCurveTo(w,-h,w,-h+r);return s;
}
const toonRamp=new THREE.DataTexture(new Uint8Array([70,155,255]),3,1,THREE.RedFormat);toonRamp.minFilter=THREE.NearestFilter;toonRamp.magFilter=THREE.NearestFilter;toonRamp.needsUpdate=true;
function solid(color){return new THREE.MeshToonNodeMaterial({color,gradientMap:toonRamp});}
function basic(color){return new THREE.MeshBasicMaterial({color});}
const outlineMat = new THREE.MeshBasicMaterial({color:INK,side:THREE.BackSide});
function outlined(geometry,material,amount=0.045){
 const group=new THREE.Group();const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;group.add(m);
 const outline=new THREE.Mesh(geometry,outlineMat);outline.scale.setScalar(1+amount);group.add(outline);return group;
}
function box(w,h,d,color,outline=true){const g=new THREE.BoxGeometry(w,h,d);return outline?outlined(g,solid(color)):new THREE.Mesh(g,solid(color));}
function ringGeo(w,h,width,r=1){const shape=roundShape(w+width/2,h+width/2,r+width/2);const hole=roundShape(w-width/2,h-width/2,Math.max(.08,r-width/2));shape.holes.push(new THREE.Path(hole.getPoints(20).reverse()));const geo=new THREE.ShapeGeometry(shape,20);geo.rotateX(-Math.PI/2);return geo;}
function disk(radius,height,color,sides=12){return outlined(new THREE.CylinderGeometry(radius,radius,height,sides),solid(color),.035);}
function textTexture(lines,options={}){
 const c=document.createElement('canvas');c.width=1024;c.height=options.height||384;const a=c.getContext('2d');
 a.fillStyle=options.bg||'#f7edcf';a.fillRect(0,0,c.width,c.height);a.strokeStyle='#243936';a.lineWidth=20;a.strokeRect(10,10,c.width-20,c.height-20);
 lines.forEach((line,i)=>{a.font=`900 ${i===0?100:50}px 'Arial Black',Arial,sans-serif`;a.textAlign='center';a.textBaseline='middle';a.fillStyle=i===0?'#243936':'#426c60';a.fillText(line,c.width/2,c.height*(i===0?.42:.75));});
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return tx;
}
function flowerMesh(size=.23,petal=0xf7edcf){
 const group=new THREE.Group();const petalMat=solid(petal);const geom=new THREE.SphereGeometry(size*.61,6,4);
 for(let i=0;i<5;i++){const p=new THREE.Mesh(geom,petalMat);p.scale.set(1,.32,1);p.position.set(Math.cos(i*Math.PI*2/5)*size*.56,0,Math.sin(i*Math.PI*2/5)*size*.56);group.add(p);}
 const center=new THREE.Mesh(new THREE.SphereGeometry(size*.36,7,4),solid(PALETTE.yellow));center.scale.y=.4;center.position.y=.035;group.add(center);return group;
}
function tree(x,z,color=PALETTE.teal,scale=1){
 const root=new THREE.Group();root.position.set(x,.1,z);root.scale.setScalar(scale);
 const planter=box(.9,.35,.9,PALETTE.cream);planter.position.y=.1;root.add(planter);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.9,6),solid(0x846b4c));trunk.position.y=.7;root.add(trunk);
 const crown=outlined(new THREE.IcosahedronGeometry(.66,0),solid(color),.035);crown.position.y=1.35;root.add(crown);return root;
}
function makeCar(color,id){
 const root=new THREE.Group();const bob=new THREE.Group();bob.name='chassis';root.add(bob);
 const body=box(.83,.38,1.45,color);body.position.y=.38;bob.add(body);
 const cabin=box(.68,.32,.68,color);cabin.position.set(0,.71,-.13);bob.add(cabin);
 const roof=box(.51,.035,.37,PALETTE.cream,false);roof.position.set(0,.889,-.16);bob.add(roof);
 const windshield=box(.55,.19,.035,0xb7e4d8,false);windshield.position.set(0,.73,.23);windshield.rotation.x=-.14;bob.add(windshield);
 const backWindow=box(.54,.17,.035,0x355f5a,false);backWindow.position.set(0,.73,-.48);bob.add(backWindow);
 const stripe=box(.13,.014,.43,PALETTE.cream,false);stripe.position.set(0,.578,.45);bob.add(stripe);
 const bumper=box(.91,.12,.11,PALETTE.cream);bumper.position.set(0,.24,.77);bob.add(bumper);
 const rear=box(.89,.10,.1,INK,false);rear.position.set(0,.25,-.77);bob.add(rear);
 for(let side of [-1,1]){
  const head=box(.17,.1,.04,0xffed9b,false);head.position.set(side*.25,.4,.751);bob.add(head);
  const tail=box(.18,.08,.025,0xfa6958,false);tail.position.set(side*.25,.4,-.736);bob.add(tail);
 }
 const wheels=[];
 for(let x of [-.48,.48])for(let z of [-.47,.43]){
  const wheel=outlined(new THREE.CylinderGeometry(.24,.24,.18,10),solid(0x27342e),.04);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.23,z);bob.add(wheel);wheels.push(wheel);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.19,8),solid(0xdfd9b7));hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);bob.add(hub);
 }
 const numberCanvas=document.createElement('canvas');numberCanvas.width=128;numberCanvas.height=128;const a=numberCanvas.getContext('2d');a.fillStyle='#f7edcf';a.beginPath();a.arc(64,64,52,0,Math.PI*2);a.fill();a.fillStyle='#243936';a.textAlign='center';a.textBaseline='middle';a.font='900 75px Arial';a.fillText(String(id==='p1'?2:1),64,69);const texture=new THREE.CanvasTexture(numberCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 const num=new THREE.Mesh(new THREE.PlaneGeometry(.39,.39),new THREE.MeshBasicMaterial({map:texture,transparent:true}));num.rotation.x=-Math.PI/2;num.position.set(0,.902,-.16);bob.add(num);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.66,20),new THREE.MeshBasicMaterial({color:0x122b25,transparent:true,opacity:.24,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(.8,1.25,1);shadow.position.y=.026;root.add(shadow);
 const exhaust=new THREE.Group();exhaust.position.set(0,.28,-.88);root.add(exhaust);
 for(let i=0;i<3;i++){const plume=new THREE.Mesh(new THREE.OctahedronGeometry(.12+i*.045),basic(PALETTE.yellow));plume.position.z=-i*.2;exhaust.add(plume);}
 const pulseRing=new THREE.Mesh(new THREE.TorusGeometry(1.04,.045,5,32),new THREE.MeshBasicMaterial({color:0xf5e29d,transparent:true,opacity:.95}));pulseRing.rotation.x=-Math.PI/2;pulseRing.position.y=.16;pulseRing.visible=false;root.add(pulseRing);
 const mixer=new THREE.AnimationMixer(root);const track=new THREE.NumberKeyframeTrack('chassis.position[y]',[0,.1,.2],[0,.025,0]);const lean=new THREE.NumberKeyframeTrack('chassis.rotation[z]',[0,.15,.3],[.015,-.015,.015]);const clip=new THREE.AnimationClip('motor-idle',.3,[track,lean]);mixer.clipAction(clip).play();
 return {root,bob,wheels,mixer,exhaust,color,num,pulseRing};
}

export async function createScene(container){
 const renderer=new THREE.WebGPURenderer({antialias:true,alpha:false,powerPreference:'high-performance',forceWebGL:new URLSearchParams(location.search).get('renderer')==='webgl'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0xeaddbc);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Four lane rooftop flower circuit');renderer.domElement.style.cssText='display:block;width:100%;height:100%;';
 await renderer.init();
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xeaddbc);scene.fog=new THREE.Fog(0xeaddbc,65,110);
 const camera=new THREE.OrthographicCamera(-18,18,12,-12,.1,160);camera.position.set(0,36,21);camera.lookAt(0,0,0);
 const ambient=new THREE.HemisphereLight(0xfff2d1,0x50756b,2.4);scene.add(ambient);
 const sunlight=new THREE.DirectionalLight(0xfff0ce,3.2);sunlight.position.set(-12,28,-9);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);sunlight.shadow.camera.left=-22;sunlight.shadow.camera.right=22;sunlight.shadow.camera.top=18;sunlight.shadow.camera.bottom=-18;sunlight.shadow.normalBias=.04;sunlight.shadow.bias=-.0002;scene.add(sunlight);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),solid(0xeaddbc));ground.rotation.x=-Math.PI/2;ground.position.y=-1.11;ground.receiveShadow=true;scene.add(ground);
 const baseShape=roundShape(15.2,10.8,1.6);const baseGeo=new THREE.ExtrudeGeometry(baseShape,{depth:.65,bevelEnabled:true,bevelThickness:.15,bevelSize:.15,bevelSegments:1,steps:1,curveSegments:12});baseGeo.rotateX(-Math.PI/2);
 const base=outlined(baseGeo,solid(0xe2b96d),.006);base.position.y=-.95;scene.add(base);
 const lawn=new THREE.Mesh(new THREE.ShapeGeometry(roundShape(14.7,10.3,1.35),16),solid(0xa1bda0));lawn.rotation.x=-Math.PI/2;lawn.position.y=-.04;lawn.receiveShadow=true;scene.add(lawn);
 const roadShape=roundShape(14.075,9.675,1.98);roadShape.holes.push(new THREE.Path(roundShape(5.475,1.075,.12).getPoints(20).reverse()));const roadGeo=new THREE.ShapeGeometry(roadShape,24);roadGeo.rotateX(-Math.PI/2); // one uninterrupted road, painted dividers show all four lanes
 const road=new THREE.Mesh(roadGeo,solid(PALETTE.road));road.position.y=.012;road.receiveShadow=true;scene.add(road);
 // Distinct ink-edged boundaries are broken only at the four lane-change openings.
 const boundaryMaterial=solid(0xf1e4ba);
 for(let boundary=0;boundary<5;boundary++){
  const lane=boundary-.5;const points=[];
  for(let i=0;i<=512;i++){const t=i/512;const p=trackPoint(t,lane);points.push(new THREE.Vector3(p.x,.085,p.z));}
  for(let quadrant=0;quadrant<4;quadrant++){
   const from=quadrant*128+8,to=(quadrant+1)*128-8;const curve=new THREE.CatmullRomCurve3(points.slice(from,to+1));
   const line=new THREE.Mesh(new THREE.TubeGeometry(curve,120,boundary===0||boundary===4?.055:.045,5,false),boundaryMaterial);line.receiveShadow=true;scene.add(line);
  }
 }
 // Small curb tiles around the outside make the board feel hand built.
 for(let i=0;i<128;i++){
  const p=trackPoint((i+.5)/128,-.53);const tile=box(.20,.08,.43,i%2?PALETTE.cream:PALETTE.red,false);tile.position.set(p.x,.09,p.z);tile.rotation.y=p.angle;scene.add(tile);
 }
 const gates=[];
 for(let gate=0;gate<4;gate++){
  const g=new THREE.Group();const p=trackPoint(gate/4,1.5);g.position.set(p.x,.03,p.z);g.rotation.y=p.angle;
  const area=new THREE.Mesh(new THREE.PlaneGeometry(7.9,1.35),new THREE.MeshBasicMaterial({color:0x5f8676,transparent:true,opacity:.42,depthWrite:false}));area.rotation.x=-Math.PI/2;g.add(area);
  const lights=[];
  for(let j=-3;j<=3;j++){
   const marker=new THREE.Mesh(new THREE.PlaneGeometry(.36,.10),basic(0xc7dcaa));marker.rotation.x=-Math.PI/2;marker.position.set(j*.89,.02,.45);g.add(marker);lights.push(marker);
   const marker2=marker.clone();marker2.position.z=-.45;g.add(marker2);lights.push(marker2);
  }
  const bar=new THREE.Group();for(const divider of [-2.15,0,2.15]){const block=box(.14,.13,1.28,PALETTE.yellow);block.position.set(divider,.19,0);bar.add(block);}bar.visible=false;g.add(bar);g.userData={lights,bar,area};gates.push(g);scene.add(g);
 }
 // The tiny garden in the infield carries the flower-rally identity without obscuring a lane.
 const island=new THREE.Mesh(new THREE.ShapeGeometry(roundShape(5.3,.95,.7),12),solid(0x739a74));island.rotation.x=-Math.PI/2;island.position.y=.07;scene.add(island);
 const signTexture=textTexture(['DAISY MOTOR CLUB','ALL PETALS. NO BRAKES.']);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.8,2.12),new THREE.MeshBasicMaterial({map:signTexture}));sign.rotation.x=-Math.PI/2;sign.position.set(0,.11,0);scene.add(sign);
 for(let side of [-1,1]){
  const planter=box(1.28,.28,1.32,0xe2b96d);planter.position.set(side*4.5,.14,0);scene.add(planter);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,.64,5),solid(0x456f50));stem.position.set(side*4.5,.6,0);scene.add(stem);
  const bloom=flowerMesh(.62);bloom.position.set(side*4.5,.95,0);bloom.rotation.z=side*.3;scene.add(bloom);
 }
 // Rim furniture: clipped shrubs, pit boxes and hazard posts outside the racing line.
 for(let side of [-1,1])for(let z of [-8.6,-5.8,5.8,8.6])scene.add(tree(side*14.3,z,z>0?0x6b9d7b:0x73aa91,.65));
 for(let x of [-11,-7,-3,3,7,11]){
  const planter=box(1.8,.2,.54,0xecc992);planter.position.set(x,.05,-10);scene.add(planter);
  for(let k=0;k<3;k++){const f=flowerMesh(.21,k%2?PALETTE.red:PALETTE.cream);f.position.set(x+(k-1)*.47,.25,-10);scene.add(f);}
 }
 const pennants=[];
 for(let side of [-1,1]){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,2.3,7),solid(INK));pole.position.set(side*13.6,1.08,10.05);scene.add(pole);
  const flag=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(side*1.1,-.24,0),new THREE.Vector3(0,-.52,0)]),new THREE.MeshBasicMaterial({color:side<0?PALETTE.teal:PALETTE.red,side:THREE.DoubleSide}));flag.geometry.setIndex([0,1,2]);flag.geometry.computeVertexNormals();flag.position.set(side*13.6,2.18,10.05);scene.add(flag);pennants.push(flag);
 }
 // Paper-cut skyline is a kiosk decoration; menu and game HUD keep a clean paper margin.
 const skyline=new THREE.Group();scene.add(skyline);
 for(let i=0;i<13;i++){
  const height=1.1+((i*17)%7)*.25;const b=box(1.4+((i*7)%3)*.25,height,1.4,i%3===0?0xb9c4a3:i%3===1?0xcfc29e:0x98b4a3);b.position.set((i-6)*2.7,-.7+height/2,-13.7-((i*3)%2)*.6);skyline.add(b);
  for(let w=0;w<2;w++){const win=box(.16,.24,.015,0xf7edcf,false);win.position.set((i-6)*2.7+(w-.5)*.5,-.5+height*.7,-12.985-((i*3)%2)*.6);skyline.add(win);}
 }
 const decoration=new THREE.Group();decoration.name='garden-spinner';decoration.position.set(4.5,.96,0);scene.add(decoration);
 const spinClip=new THREE.AnimationClip('garden-breeze',4,[new THREE.NumberKeyframeTrack('.rotation[y]',[0,4],[0,Math.PI*2])]);const decorationMixer=new THREE.AnimationMixer(decoration);decorationMixer.clipAction(spinClip).play();
 const dots=new Map(),cars=new Map(),particles=[];let lastTime=0,frame=0,cameraX=0,cameraZ=0,frustumHeight=27.8,lastMode='title';
 function getCar(id,color){if(!cars.has(id)){const c=makeCar(color||PALETTE.yellow,id);cars.set(id,c);scene.add(c.root);}return cars.get(id);}
 function burst(x,z,color=PALETTE.yellow){
  for(let i=0;i<12;i++){const p=new THREE.Mesh(new THREE.OctahedronGeometry(.10+Math.random()*.09),basic(color));p.position.set(x,.4,z);scene.add(p);const a=Math.random()*Math.PI*2;particles.push({mesh:p,vx:Math.cos(a)*(1.7+Math.random()*2),vz:Math.sin(a)*(1.7+Math.random()*2),vy:1.5+Math.random()*2,life:.5+Math.random()*.4,max:.9});}
 }
 function composeCamera(mode,dt,immediate=false,shake=0){
  const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight),aspect=width/height;
  const title=mode==='title',phonePortrait=width<=700&&aspect<.9;
  const targetHeight=title?(phonePortrait?35.4/aspect:Math.max(27.8,55.5/aspect)):Math.max(27.8,34.5/aspect);
  const targetX=title&&!phonePortrait?-targetHeight*aspect*.20:0;
  const targetZ=title&&phonePortrait?targetHeight*.28/.864:.2;
  const alpha=immediate?1:1-Math.exp(-dt*7);
  frustumHeight+=(targetHeight-frustumHeight)*alpha;cameraX+=(targetX-cameraX)*alpha;cameraZ+=(targetZ-cameraZ)*alpha;
  camera.left=-frustumHeight*aspect/2;camera.right=frustumHeight*aspect/2;camera.top=frustumHeight/2;camera.bottom=-frustumHeight/2;camera.updateProjectionMatrix();
  camera.position.set(cameraX+(shake>0?Math.sin(lastTime*93)*shake*.12:0),36,21+cameraZ+(shake>0?Math.cos(lastTime*79)*shake*.12:0));camera.lookAt(cameraX,0,cameraZ);
 }
 function resize(){renderer.setSize(Math.max(1,container.clientWidth),Math.max(1,container.clientHeight),false);composeCamera(lastMode,0,true);} 
 resize();
 function update(state,dt){
  dt=Math.min(dt||.016,.05);lastTime+=dt;frame++;decorationMixer.update(dt);
  const activeIds=new Set();const vehicles=[...(state.players||[]).map(p=>({...p,isEnemy:false})),...(state.enemies||[]).map(p=>({...p,isEnemy:true}))];
  for(const v of vehicles){
   const id=String(v.id??(v.isEnemy?'e':'p')+activeIds.size);activeIds.add(id);const car=getCar(id,v.color||(v.isEnemy?PALETTE.red:PALETTE.yellow));const lane=Number.isFinite(v.renderLane)?v.renderLane:v.lane;const p=trackPoint(v.t||0,lane||0);car.root.position.set(p.x,.10,p.z);car.root.rotation.y=p.angle+(v.isEnemy||v.direction===-1?Math.PI:0);car.root.visible=v.alive!==false&&(!(v.invincible>0)||Math.floor(lastTime*11)%2===0||state.attract||state.mode==='title');
   car.mixer.update(dt*(v.boost?1.8:1));car.exhaust.visible=!!v.boost;car.exhaust.scale.setScalar(.8+Math.sin(lastTime*50)*.15);for(const wheel of car.wheels)wheel.rotation.x-=dt*(v.boost?28:15);car.num.visible=!v.isEnemy;car.pulseRing.visible=v.pulse>0;car.pulseRing.scale.setScalar(1+Math.sin(lastTime*9)*.08);
  }
  for(const[id,c]of cars)if(!activeIds.has(id))c.root.visible=false;
  const dotIds=new Set();for(const d of state.dots||[]){
   const id=String(d.id??`${d.lane}:${d.t}`);dotIds.add(id);let data=dots.get(id);if(!data){const flower=flowerMesh(.22);const p=trackPoint(d.t,d.lane);flower.position.set(p.x,.18,p.z);scene.add(flower);data={root:flower,collected:!!d.collected,t:d.t,lane:d.lane};dots.set(id,data);}const p=trackPoint(d.t,d.lane);data.root.position.x=p.x;data.root.position.z=p.z;
   if(d.collected&&!data.collected&&frame>3)burst(p.x,p.z,0xf4c64e);data.collected=!!d.collected;data.root.visible=!d.collected;data.root.position.y=.20+Math.sin(lastTime*3+d.t*20)*.025;data.root.rotation.y=lastTime*.16+d.t;
  }
  for(const[id,d]of dots)if(!dotIds.has(id))d.root.visible=false;
  for(let i=0;i<gates.length;i++){const open=!state.gateOpen||state.gateOpen[i]!==false;const data=gates[i].userData;data.bar.visible=!open;data.area.material.color.setHex(open?0x72977c:0xa56c4f);data.area.material.opacity=open?.32:.55;for(const light of data.lights)light.material.color.setHex(open?0xc4dcaa:0xf27b62);}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);continue;}p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;p.mesh.position.y+=p.vy*dt;p.vy-=7*dt;p.mesh.rotation.x+=dt*5;p.mesh.rotation.z+=dt*3;p.mesh.scale.setScalar(Math.min(1,p.life*3));}
  for(let i=0;i<pennants.length;i++)pennants[i].rotation.y=Math.sin(lastTime*2+i)*.13;
  lastMode=state.mode;composeCamera(state.mode,dt,frame===1,state.shake);skyline.visible=!!state.attract;
  renderer.render(scene,camera);
 }
 const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.15),hit=new THREE.Vector3();
 function pickLane(clientX,clientY){const rect=renderer.domElement.getBoundingClientRect();mouse.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);if(!raycaster.ray.intersectPlane(plane,hit))return null;let best=Infinity,lane=0;for(let l=0;l<4;l++)for(let j=0;j<160;j++){const p=trackPoint(j/160,l),distance=(hit.x-p.x)**2+(hit.z-p.z)**2;if(distance<best){best=distance;lane=l;}}return best<12?lane:null;}
 renderer.render(scene,camera);
 return {update,resize,burst,pickLane,renderer,scene,camera,stats:()=>({backend:renderer.backend?.isWebGPUBackend?'WebGPU':'WebGL 2 fallback',cars:cars.size,dots:dots.size,particles:particles.length,nativeAnimations:cars.size+1}),dispose(){renderer.dispose();}};
}
