import * as THREE from 'three';

// All art is modeled here: paper-cut silhouettes, stepped light and thick ink edges.
const palette = { ink:0x111d2b,grass:0x294b4d,grass2:0x385d53,road:0x303e51,path:0x7b7863,cream:0xffe9b1, amber:0xf5ae66,teal:0x64c7c1,bark:0x795d5d,leaf:0xbf7050,leaf2:0xd99a5a,red:0xdc684f,blue:0x5d9eaa,roof:0x3c3c53 };
const materials=new Map();
// r180 uses RGBA textures consistently on WebGPU.
const rampRGBA=new THREE.DataTexture(new Uint8Array([72,72,72,255,145,145,145,255,207,207,207,255,255,255,255,255]),4,1,THREE.RGBAFormat);
rampRGBA.magFilter=THREE.NearestFilter;rampRGBA.minFilter=THREE.NearestFilter;rampRGBA.needsUpdate=true;
function material(c,basic=false){const k=`${c}:${basic}`;if(!materials.has(k)){const m=basic?new THREE.MeshBasicNodeMaterial({color:c}):new THREE.MeshToonNodeMaterial({color:c,gradientMap:rampRGBA});materials.set(k,m);}return materials.get(k);}
const ink=material(palette.ink,true);ink.side=THREE.BackSide;
function group(parent,name){const o=new THREE.Group();o.name=name||'';if(parent)parent.add(o);return o;}
function shape(parent,geometry,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,outline=true,basic=false){
 const mesh=new THREE.Mesh(geometry,material(color,basic));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=!basic;mesh.receiveShadow=!basic;parent.add(mesh);
 if(outline){const hull=new THREE.Mesh(geometry,ink);hull.scale.set(1.035,1.035,1.035);hull.castShadow=false;hull.receiveShadow=false;mesh.add(hull);}return mesh;
}
const sphereGeometry=new THREE.SphereGeometry(1,12,8), boxGeometry=new THREE.BoxGeometry(1,1,1), cylinderGeometry=new THREE.CylinderGeometry(1,1,1,10), coneGeometry=new THREE.ConeGeometry(1,1,8);
const sphere=(p,c,x,y,z,sx,sy=sx,sz=sx,o=true,b=false)=>shape(p,sphereGeometry,c,x,y,z,sx,sy,sz,o,b);
const box=(p,c,x,y,z,w,h,d,o=true,b=false)=>shape(p,boxGeometry,c,x,y,z,w,h,d,o,b);
const cylinder=(p,c,x,y,z,r,h,o=true)=>shape(p,cylinderGeometry,c,x,y,z,r,h,r,o);
function rod(p,c,a,b,r=.06,outline=true){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),mid=av.clone().add(bv).multiplyScalar(.5);const m=shape(p,cylinderGeometry,c,mid.x,mid.y,mid.z,r,av.distanceTo(bv),r,outline);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return m;}
function ring(p,c,x,y,z,r,t=.07){return shape(p,new THREE.TorusGeometry(r,t,6,24),c,x,y,z);}
function rnd(seed){let a=seed|0;return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// Static geometry is baked by material after construction, leaving art dense and draw calls few.
function bake(root){
 root.updateMatrixWorld(true);const buckets=new Map();
 root.traverse(o=>{if(!o.isMesh)return;const key=`${o.material.uuid}/${o.castShadow}/${o.receiveShadow}`;let b=buckets.get(key);if(!b){b={material:o.material,cast:o.castShadow,receive:o.receiveShadow,p:[],n:[],uv:[]};buckets.set(key,b);}const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const pos=geo.getAttribute('position'),norm=geo.getAttribute('normal'),uv=geo.getAttribute('uv');for(let i=0;i<pos.count;i++){b.p.push(pos.getX(i),pos.getY(i),pos.getZ(i));b.n.push(norm?.getX(i)||0,norm?.getY(i)||1,norm?.getZ(i)||0);b.uv.push(uv?.getX(i)||0,uv?.getY(i)||0);}geo.dispose();});
 root.clear();for(const b of buckets.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));geo.computeBoundingSphere();const m=new THREE.Mesh(geo,b.material);m.castShadow=b.cast;m.receiveShadow=b.receive;root.add(m);}
}
function canvasSign(text,sub='',bg='#f4dfb0',fg='#283949',w=512){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=192;const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,w,192);c.strokeStyle=fg;c.lineWidth=12;c.strokeRect(10,10,w-20,172);c.fillStyle=fg;c.textAlign='center';c.font='bold 48px Georgia,serif';c.fillText(text,w/2,86);if(sub){c.font='bold 25px sans-serif';c.fillText(sub,w/2,137);}const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicNodeMaterial({map:tex});
}
function sign(p,text,sub,x,y,z,w=3.6){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w*.375),canvasSign(text,sub));m.position.set(x,y,z);p.add(m);return m;}
function house(p,x,z,color,mirror=1){
 const g=group(p);g.position.set(x,0,z);const w=10,d=8;
 box(g,0x3a3e4b,0,.22,0,w+.5,.45,d+.5);box(g,color,0,2.3,0,w,4.2,d);box(g,0xe3c799,0,.65,4.06,w,.2,.12);
 // A gabled roof with visible end grain and oversized eaves.
 const roof=new THREE.BufferGeometry();const v=[-5.5,4.4,-4.6,5.5,4.4,-4.6,0,7,-4.6,-5.5,4.4,4.6,0,7,4.6,5.5,4.4,4.6,-5.5,4.4,-4.6,0,7,-4.6,0,7,4.6,-5.5,4.4,-4.6,0,7,4.6,-5.5,4.4,4.6,5.5,4.4,-4.6,5.5,4.4,4.6,0,7,4.6,5.5,4.4,-4.6,0,7,4.6,0,7,-4.6];roof.setAttribute('position',new THREE.Float32BufferAttribute(v,3));roof.computeVertexNormals();shape(g,roof,palette.roof);
 for(let i=0;i<5;i++){rod(g,0x6e6070,[-5.15+i*.12,4.58+i*.51,4.68],[5.15-i*.12,4.58+i*.51,4.68],.025,false);}
 box(g,0x8d6457,3.3,6.4,-1.6,1.1,3.2,1.2);box(g,palette.ink,3.3,8.02,-1.6,1.3,.2,1.4);
 for(let row=0;row<7;row++)box(g,0x4b424c,3.3,5.2+row*.4,-.98,1.12,.035,.04,false);
 box(g,0xe1cbaa,0,1.8,4.1,2.05,3.6,.3);box(g,0x56717a,0,1.75,4.29,1.6,3.3,.2);box(g,0xf3c075,.48,1.6,4.43,.1,.1,.1,false,true);box(g,palette.cream,0,3.6,4.25,2.2,.2,.55);
 for(const a of [-3.25,3.25]){box(g,palette.ink,a,2.5,4.1,2.25,2.25,.2);box(g,palette.amber,a,2.5,4.23,1.9,1.9,.08,false,true);box(g,0xe4c59c,a,2.5,4.33,.12,2,.08);box(g,0xe4c59c,a,2.5,4.33,2,.12,.08);box(g,0x6a7068,a,1.3,4.35,2.5,.4,.65);for(let k=0;k<5;k++)sphere(g,0x7a9e70,a-.9+k*.45,1.6,4.4,.28,.3,.23,false);}
 for(const side of [-1,1]){box(g,palette.ink,side*5.06,2.6,0,.2,2,2);box(g,palette.amber,side*5.18,2.6,0,.03,1.6,1.6,false,true);box(g,0xe4c59c,side*5.2,2.6,0,.08,1.8,.12);}
 for(let j=0;j<3;j++)box(g,0xa19b86,0,.12+j*.14,5-j*.4,2.7,.25,.9);
 box(g,0x8c8c76,0,.04,7,2.3,.08,3.8,false);
 for(let k=0;k<8;k++){const xx=-4.5+k*1.3;if(Math.abs(xx)<1.9)continue;box(g,0xc6bda0,xx,.85,7.9,.15,1.55,.16);shape(g,new THREE.ConeGeometry(.15,.24,4),0xc6bda0,xx,1.7,7.9,1,1,1,false);}box(g,0xa89f86,-3.4,.65,7.9,3.4,.12,.12);box(g,0xa89f86,3.4,.65,7.9,3.4,.12,.12);
 // Paper-thin siding lines read as ink at the fixed camera distance.
 for(let row=0;row<9;row++){box(g,0x66716f,0,.65+row*.4,4.02,9.85,.026,.025,false);}
 for(const a of [-1,1]){box(g,0x4b5f55,a*4.1,.6,5.65,1.8,1.15,1.6,false);sphere(g,0x647e5c,a*4.1,1.1,5.65,1.1,.8,.9,false);}
 const lamp=group(g);lamp.position.set(1.4,2.9,4.6);box(lamp,palette.ink,0,0,0,.42,.8,.35);box(lamp,0xffd992,0,0,.2,.26,.55,.1,false,true);
 return g;
}
function tree(p,x,z,s=1,c=palette.leaf,redwood=false){
 const g=group(p);g.position.set(x,0,z);g.scale.setScalar(s);cylinder(g,redwood?0x63515a:0x7f5a54,0,redwood?4:2.1,0,redwood?.53:.35,redwood?8:4.2);
 if(redwood){for(let j=0;j<4;j++){const y=5+j*1.65;shape(g,coneGeometry,j%2?0x31504d:0x3d6659,0,y,0,3.7-j*.58,4.5,3.7-j*.58,true);}}
 else {rod(g,0x765651,[0,2.1,0],[-1.5,4.4,.4],.15);rod(g,0x765651,[0,2.9,0],[1.4,4.6,-.4],.16);sphere(g,c,-1,4.5,.2,2.1,1.8,1.9);sphere(g,c,1.15,4.8,-.2,2,2.1,1.8);sphere(g,c,0,5.9,0,1.9,1.65,1.7);}
 return g;
}
function pumpkin(p,x,z,s=1){const g=group(p);g.position.set(x,.38*s,z);g.scale.setScalar(s);sphere(g,0xe28d4c,0,0,0,.46,.4,.45);for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=ring(g,0xb96742,0,0,0,.355,.012);m.rotation.y=a;m.scale.y=.97;}cylinder(g,0x4c604b,0,.46,0,.06,.23,false);box(g,palette.ink,-.15,.02,.38,.1,.1,.04,false,true);box(g,palette.ink,.15,.02,.38,.1,.1,.04,false,true);return g;}
function streetLamp(p,x,z){cylinder(p,palette.ink,x,3.7,z,.09,7.4);rod(p,palette.ink,[x,7.3,z],[x+.85,7.3,z],.08);shape(p,new THREE.ConeGeometry(.5,.35,8),palette.ink,x+.85,7.15,z);sphere(p,0xffd89a,x+.85,6.94,z,.32,.16,.32,false,true);const glow=new THREE.PointLight(0xffbd7a,7,10,2);glow.position.set(x+.85,6.4,z);p.add(glow);}
function flower(p,x,z,healed=false){const g=group(p);g.position.set(x,0,z);cylinder(g,0xaa7257,0,.4,0,.5,.8);cylinder(g,0xc5956b,0,.8,0,.58,.15);cylinder(g,0x333b38,0,.89,0,.48,.04,false);rod(g,0x6c8f6b,[0,.8,0],[.1,2,0],.045);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;sphere(g,healed?0xffcb78:0xa788a0,.1+Math.sin(a)*.27,1.9+Math.cos(a)*.27,.03,.19,.22,.09);}sphere(g,0xd69c4f,.1,1.9,.1,.16,.16,.1);sphere(g,0x7d9a6b,.16,1.38,0,.28,.1,.12);return g;}

export function createWorld(scene){
 scene.background=new THREE.Color(0x172d46);scene.fog=new THREE.FogExp2(0x233c50,.0075);
 const root=group(scene,'paper-moon-neighborhood'),staticRoot=group(root,'baked-ink-world'),moving=group(root,'moving-world');
 const obstacles=[],random=rnd(9021982),landmarks={home:{x:0,z:22},garden:{x:-8,z:3},rendezvous:{x:0,z:-32},bike:{x:0,z:17}};
 const hemi=new THREE.HemisphereLight(0xb8d7ec,0x597568,2.3);scene.add(hemi);
 const moonlight=new THREE.DirectionalLight(0xbdd6ff,3.1);moonlight.position.set(-22,38,-26);moonlight.castShadow=true;moonlight.shadow.mapSize.set(2048,2048);moonlight.shadow.camera.left=-45;moonlight.shadow.camera.right=45;moonlight.shadow.camera.top=45;moonlight.shadow.camera.bottom=-45;moonlight.shadow.normalBias=.08;moonlight.shadow.bias=-.0001;moonlight.shadow.camera.far=110;scene.add(moonlight);scene.add(moonlight.target);
 const warm=new THREE.DirectionalLight(0xffb674,.65);warm.position.set(15,9,25);scene.add(warm);
 box(staticRoot,palette.grass,0,-.34,-100,110,.6,300,false);
 // Suburb: wide ink-blue road, warm concrete sidewalks, tiny reflective lane marks.
 box(staticRoot,palette.road,0,-.015,16,78,.08,6.8,false);box(staticRoot,0x8d9a94,0,.025,11.9,78,.12,1.4,false);box(staticRoot,0x8d9a94,0,.025,20.1,78,.12,1.4,false);
 for(let x=-37;x<39;x+=6)box(staticRoot,0xbac3a9,x,.035,16,2.2,.015,.11,false);
 for(let x=-36;x<38;x+=2.7){box(staticRoot,0x566b70,x,.1,11.22,.045,.05,.16,false);box(staticRoot,0x566b70,x,.1,20.78,.045,.05,.16,false);}
 // A slightly crooked path, as if cut from old construction paper.
 for(let z=-36;z<13;z+=1.5){const xx=Math.sin(z*.14)*2;const m=box(staticRoot,palette.path,xx,.005,z,5.4,.07,2,false);m.rotation.y=Math.cos(z*.14)*.11;}
 for(let z=21;z<35;z+=3)box(staticRoot,0x7e8c7c,0,.03,z,3.6,.08,2.3,false);
 const homes=[[-19,24,0x8b9e8d],[19,24,0x8b909e],[-21,-.5,0xb38d76],[21,-6,0x729b9c]];
 for(const [x,z,c] of homes){house(staticRoot,x,z,c);obstacles.push({x,z,w:10.5,d:8.5,h:7});}
 // Curving home fences and hedges frame the safe paths without closing them.
 for(const side of [-1,1]){for(let z=23;z<35;z+=1.25){box(staticRoot,0xb4ad91,side*9,.75,z,.14,1.4,.12);shape(staticRoot,new THREE.ConeGeometry(.12,.18,4),0xb4ad91,side*9,1.52,z,1,1,1,false);}box(staticRoot,0x9a967f,side*9,.6,28.5,.1,.11,12);box(staticRoot,0x9a967f,side*9,1.15,28.5,.1,.11,12);}
 for(let k=0;k<8;k++){sphere(staticRoot,0x486c5b,-12-k*1.6,.65,7.5,.9,.9,.75);sphere(staticRoot,0x486c5b,12+k*1.6,.65,-13,.9,.9,.75);}
 // A little shed, a garage workbench and the homemade-radio clearing.
 box(staticRoot,0x7a8c78,-25,1.45,-14,5.2,2.9,4);const shedRoof=box(staticRoot,0x3c4b51,-25,3.08,-14,6,.35,4.8);shedRoof.rotation.z=.08;box(staticRoot,0x9cba9d,-24.7,1.3,-11.92,2,2.6,.15);for(let i=0;i<4;i++)box(staticRoot,0x596f62,-25.5+i*.5,1.3,-11.8,.025,2.4,.02,false);obstacles.push({x:-25,z:-14,w:5.4,d:4.2,h:3.3});
 box(staticRoot,0x856b54,-22,.8,9,3, .18,1.5);for(const dx of [-1.2,1.2])box(staticRoot,0x473c3d,-22+dx,.4,9,.14,.8,1.1);box(staticRoot,0x71836d,-23.4,.35,10.1,.7,.7,.6);
 // Camp on the right; an old record player sits on a picnic table in gameplay.
 box(staticRoot,0x927558,23,.65,2.5,3.5,.2,2);for(const dx of [-1.4,1.4])box(staticRoot,0x6d5a4c,23+dx,.3,2.5,.18,.6,1.7);box(staticRoot,0x9a835e,23,.35,4.25,3.5,.15,.55);
 for(const [x,z] of [[-14,10.7],[14,20.8],[-31,20.8],[31,10.6]])streetLamp(staticRoot,x,z);
 // Mailboxes, battered bins, stones, pumpkins, fallen leaves.
 for(const [x,z] of [[-13,22],[13,22],[-15,8],[15,8]]){cylinder(staticRoot,0x7c7770,x,.75,z,.08,1.5);box(staticRoot,0x7192a0,x,1.6,z,.6,.55,.85);box(staticRoot,0xc64d43,x+.35,1.75,z,.08,.4,.35);}
 for(const [x,z] of [[-7,24],[8,23],[-23,31],[14,32],[-27,6],[29,-1],[-28,-16]])pumpkin(staticRoot,x,z,.8+random()*.45);
 for(const [x,z] of [[-13,4],[14,2]]){cylinder(staticRoot,0x344b53,x,.7,z,.55,1.4);cylinder(staticRoot,0x698478,x,1.45,z,.6,.12);for(let j=0;j<8;j++){let a=j*Math.PI/4;rod(staticRoot,0x1f3540,[x+Math.cos(a)*.53,.15,z+Math.sin(a)*.53],[x+Math.cos(a)*.53,1.35,z+Math.sin(a)*.53],.018,false);}}
 // Forest massing: tall redwoods framing the blue path and distant ink mountains.
 for(let i=0;i<76;i++){const z=-17-random()*145;const x=(random()>.5?1:-1)*(8+random()*37);const s=.7+random()*.65;if(z<-142&&Math.abs(x)<24)continue;tree(staticRoot,x,z,s,0x42685b,true);if(z>-43&&Math.abs(x)<34)obstacles.push({x,z,w:s*1.15,d:s*1.15,h:s*10});}
 for(const [x,z,s,c] of [[-33,28,1.4,palette.leaf],[33,31,1.4,palette.leaf2],[-9,5,.95,palette.leaf2],[9,-4,.9,palette.leaf],[-32,-7,1.1,palette.leaf],[32,-18,1.3,0x8c9063],[-34,12,1.15,palette.leaf2],[34,8,1.2,palette.leaf]]){tree(staticRoot,x,z,s,c);obstacles.push({x,z,w:.7*s,d:.7*s,h:6*s});}
 for(let i=0;i<260;i++){const x=(random()-.5)*80,z=35-random()*190;if(Math.abs(x)<4.5&&z<13)continue;if(z>10&&z<21)continue;const c=[0xaf7952,0xe2ad69,0x50705c,0x708c63][i%4];const m=shape(staticRoot,new THREE.ConeGeometry(.07+random()*.08,.3+random()*.3,3),c,x,.1,z,1,1,1,false);m.rotation.z=(random()-.5)*.5;}
 for(let i=0;i<45;i++){const x=(random()-.5)*68,z=-15-random()*135;if(Math.abs(x)<5)continue;sphere(staticRoot,0x647c79,x,.18,z,.35+random()*.8,.2+random()*.3,.4+random()*.8,false);}
 // Observatory clearing: little stones make a protective ring, but leave an entry.
 cylinder(staticRoot,0x777968,0,.015,-32,6.2,.06,false);for(let i=0;i<16;i++){const a=i*Math.PI*2/18;sphere(staticRoot,0x859b8b,Math.sin(a)*5.8,.16,-32+Math.cos(a)*5.8,.34,.24,.4);}
 sign(staticRoot,'OLD CREEK','KEEP A LITTLE WONDER',6,2.3,-22,4);cylinder(staticRoot,0x786957,6,1,-22,.09,2);
 sign(staticRoot,'NIGHT OWL','NEIGHBORHOOD WATCH',-12,2.6,11.8,3);cylinder(staticRoot,0x586267,-12,1.2,11.8,.08,2.5);
 // A second, sheltered clearing is the destination of the moonlit bicycle ride.
 cylinder(staticRoot,0x677e6b,0,.012,-176,14,.055,false);
 cylinder(staticRoot,0x7d8972,0,.045,-178,8,.065,false);
 for(let i=0;i<23;i++){const a=i*Math.PI*2/23;const r=18+(i%3)*1.4;if(Math.cos(a)>.15)continue;tree(staticRoot,Math.sin(a)*r,-177+Math.cos(a)*r,.8+(i%4)*.13,0x41665a,true);}
 for(let i=0;i<25;i++){const a=i*Math.PI*2/25;sphere(staticRoot,0x8da38a,Math.sin(a)*9,.15,-178+Math.cos(a)*9,.28,.18,.3,false);}
 for(let i=0;i<13;i++){const h=20+random()*20;shape(staticRoot,coneGeometry,i%2?0x294156:0x2e4859,-78+i*13,h*.35,-232-random()*12,20,h,12,false,true);}
 // Starfield and moon are real geometry, with no raster art dependencies.
 const moon=group(moving,'harvest-moon');moon.position.set(0,34,-85);sphere(moon,0xffe7ab,0,0,0,9,9,.6,false,true);sphere(moon,0xf0d8a6,-2.9,1.6,.48,1.2,1.4,.03,false,true);sphere(moon,0xf0d8a6,3,-2.1,.47,1.6,1.1,.03,false,true);sphere(moon,0xf6dfac,1.8,3.6,.47,.8,.6,.03,false,true);
 const haloMat=new THREE.MeshBasicNodeMaterial({color:0xe0d9ad,transparent:true,opacity:.055,depthWrite:false});const halo=new THREE.Mesh(new THREE.CircleGeometry(11.8,64),haloMat);halo.position.set(0,0,-.7);moon.add(halo);
 const stars=new THREE.InstancedMesh(sphereGeometry,material(0xffedc8,true),240),obj=new THREE.Object3D();for(let i=0;i<240;i++){obj.position.set((random()-.5)*270,23+random()*95,-85-random()*255);const r=.025+random()*.095;obj.scale.setScalar(r);obj.updateMatrix();stars.setMatrixAt(i,obj.matrix);}moving.add(stars);
 const clouds=[];for(let i=0;i<7;i++){const c=group(moving);c.position.set(-60+i*20,23+i%3*4,-97-i%2*25);for(let k=0;k<4;k++)sphere(c,0x3d5265,k*3.4,Math.sin(k)*.5,0,4.4,1.2,1.1,false,true);clouds.push(c);}
 for(let i=0;i<16;i++){const h=16+random()*16;shape(staticRoot,coneGeometry,i%2?0x2b4057:0x30495b,-95+i*13,h*.35,-222-random()*10,16,h,9,false,true);}
 // Breathing firefly points: a tiny original constellation follows the trail.
 const fireflies=new THREE.InstancedMesh(sphereGeometry,material(0xf8d98a,true),64);const flies=[];for(let i=0;i<64;i++)flies.push({x:(random()-.5)*35,y:.6+random()*2.8,z:8-random()*68,p:random()*6.28});moving.add(fireflies);
 const garden=group(moving,'healing-garden');garden.add(flower(null,-8,3,false));const healthy=flower(null,-8,3,true);healthy.visible=false;garden.add(healthy);
 const transmitter=group(moving,'homemade-transmitter');transmitter.position.set(0,.1,-32);const transmitterBase=box(transmitter,0x8c7257,0,.15,0,2.7,.3,2);transmitter.visible=false;
 const txPieces=[createProp('record'),createProp('toy'),createProp('antenna')];txPieces[0].position.set(-.55,.3,0);txPieces[0].scale.setScalar(.65);txPieces[1].position.set(.65,.3,0);txPieces[1].scale.setScalar(.65);txPieces[2].position.set(0,.35,-.4);txPieces[2].scale.setScalar(.9);for(const part of txPieces)transmitter.add(part);
 const ship=group(moving,'welcome-home');ship.position.set(0,2.4,-38);ship.visible=false;sphere(ship,0x618b91,0,1.6,0,5,3.2,4.6);cylinder(ship,0xb4b7a4,0,.4,0,5.4,.55);cylinder(ship,0x37565f,0,.05,0,4.8,.35);for(let i=0;i<14;i++){const a=i*Math.PI*2/14;sphere(ship,0xffdd91,Math.sin(a)*5.15,.55,Math.cos(a)*5.15,.23,.13,.23,false,true);}sphere(ship,0xb6cbc0,0,3.8,0,2.8,.65,2.5);box(ship,0xffd89d,0,.8,4.8,1.7,2.8,.15,false,true);box(ship,0x9bb4ad,0,-.25,5.3,2,.2,2.1);const beam=new THREE.Mesh(new THREE.ConeGeometry(3.8,3.4,32,1,true),new THREE.MeshBasicNodeMaterial({color:0xffe0a0,transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=-1.5;ship.add(beam);
 bake(staticRoot);
 return {root,obstacles,landmarks,moon,ship,transmitter,garden,
  update(dt,time){clouds.forEach((c,i)=>{c.position.x+=dt*(.15+i*.02);if(c.position.x>90)c.position.x=-90;});flies.forEach((f,i)=>{obj.position.set(f.x+Math.sin(time*.5+f.p)*.7,f.y+Math.sin(time+f.p)*.4,f.z);obj.scale.setScalar(.035+Math.sin(time*2+f.p)*.012);obj.updateMatrix();fireflies.setMatrixAt(i,obj.matrix);});fireflies.instanceMatrix.needsUpdate=true;if(ship.visible)ship.position.y=2.4+Math.sin(time)*.22;},
  setStage(stage){const atDestination=stage==='flight'||stage==='goodbye';ship.position.x=0;ship.position.z=atDestination?-179:-38;if(atDestination){scene.fog.density=.0045;}else{scene.fog.density=.0075;moon.position.set(0,34,-85);}},
  setFlightFocus(x,y,z){moon.position.set(x*.1+1,y+26,z-100);},
  setShipPosition(x,z){ship.position.x=x;ship.position.z=z;},
  setFlowerHealed(bool){garden.children[0].visible=!bool;healthy.visible=bool;},
  setTransmitterProgress(n){transmitter.visible=n>0;txPieces.forEach((p,i)=>p.visible=i<n);},
  setShipVisible(bool){ship.visible=bool;}
 };
}

function animationSet(root,tracks,duration=1){const mixer=new THREE.AnimationMixer(root);const clip=new THREE.AnimationClip('handmade-life',duration,tracks);const action=mixer.clipAction(clip);action.play();return{mixer,action,clip};}
function track(name,prop,times,values){return new THREE.NumberKeyframeTrack(`${name}.${prop}`,times,values);}
export function createKid(color=palette.red){
 const root=group(null,'kid'),body=group(root,'body');
 box(body,0x273d50,0,.83,0,.62,.75,.4);sphere(body,color,0,1.42,0,.48,.58,.35);box(body,color,0,1.36,.24,.42,.28,.18);rod(body,0xf2bd8b,[-.09,1.75,.27],[-.09,1.17,.34],.014,false);rod(body,0xf2bd8b,[.09,1.75,.27],[.09,1.17,.34],.014,false);
 sphere(body,color,0,2.16,-.02,.56,.62,.5);sphere(body,0xf0bb91,0,2.17,.22,.43,.46,.37);sphere(body,0x654c42,0,2.51,.21,.44,.2,.33);sphere(body,0x1e2a35,-.15,2.21,.55,.047,.066,.03,false,true);sphere(body,0x1e2a35,.15,2.21,.55,.047,.066,.03,false,true);sphere(body,0xd49778,0,2.1,.59,.065,.05,.06,false);rod(body,0x9b6353,[-.1,1.99,.55],[.1,1.99,.55],.018,false);
 const leftArm=group(body,'leftArm');leftArm.position.set(-.45,1.68,0);sphere(leftArm,color,-.06,-.25,0,.18,.4,.19);sphere(leftArm,0xf0bb91,-.06,-.62,.03,.13,.16,.13);
 const rightArm=group(body,'rightArm');rightArm.position.set(.45,1.68,0);sphere(rightArm,color,.06,-.25,0,.18,.4,.19);sphere(rightArm,0xf0bb91,.06,-.62,.03,.13,.16,.13);
 const leftLeg=group(root,'leftLeg');leftLeg.position.set(-.2,.88,0);box(leftLeg,0x334a5a,0,-.32,0,.25,.64,.26);box(leftLeg,0xe3d9ba,0,-.7,.12,.31,.21,.53);box(leftLeg,0x708d98,0,-.69,.16,.32,.08,.5);
 const rightLeg=group(root,'rightLeg');rightLeg.position.set(.2,.88,0);box(rightLeg,0x334a5a,0,-.32,0,.25,.64,.26);box(rightLeg,0xe3d9ba,0,-.7,.12,.31,.21,.53);box(rightLeg,0x708d98,0,-.69,.16,.32,.08,.5);
 const times=[0,.25,.5,.75,1];const{mixer,action}=animationSet(root,[track('leftLeg','rotation[x]',times,[0,.65,0,-.65,0]),track('rightLeg','rotation[x]',times,[0,-.65,0,.65,0]),track('leftArm','rotation[x]',times,[0,-.45,0,.45,0]),track('rightArm','rotation[x]',times,[0,.45,0,-.45,0]),track('body','position[y]',times,[0,.06,0,.06,0])]);
 let time=0;return{root,mixer,body,leftArm,rightArm,leftLeg,rightLeg,animate(dt,s={}){time+=dt;mixer.update(dt*(s.moving?Math.max(.5,s.speed||1)*1.5:.13));action.setEffectiveWeight(s.moving?1:0);body.position.y=s.hide?-.38:Math.sin(time*2)*.025;root.scale.y=root.scale.x*(s.hide?.78:1);if(!s.moving){leftLeg.rotation.x=rightLeg.rotation.x=0;leftArm.rotation.x=rightArm.rotation.x=0;}if(s.pulse){rightArm.rotation.x=-1.7;rightArm.rotation.z=-.3;}else rightArm.rotation.z=0;}};
}
export function createAlien(){
 const root=group(null,'visitor'),body=group(root,'alienBody');
 sphere(body,0xb48965,0,.76,0,.68,.83,.47);sphere(body,0xc79c71,0,1,.2,.51,.53,.32);sphere(body,0x9c775b,-.38,.13,.18,.35,.17,.44);sphere(body,0x9c775b,.38,.13,.18,.35,.17,.44);
 cylinder(body,0xb48b67,0,1.62,0,.24,.78);const head=group(body,'alienHead');head.position.set(0,2.12,0);sphere(head,0xb58c68,0,0,0,.68,.48,.42);sphere(head,0xc59b73,-.42,.13,.14,.34,.24,.3);sphere(head,0xc59b73,.42,.13,.14,.34,.24,.3);sphere(head,0x293444,-.32,.07,.38,.195,.18,.07);sphere(head,0x293444,.32,.07,.38,.195,.18,.07);sphere(head,0x8bc6cb,-.32,.07,.433,.125,.125,.025,false,true);sphere(head,0x8bc6cb,.32,.07,.433,.125,.125,.025,false,true);sphere(head,0x182a3c,-.31,.07,.46,.068,.095,.012,false,true);sphere(head,0x182a3c,.31,.07,.46,.068,.095,.012,false,true);sphere(head,0xffe8bc,-.35,.12,.475,.028,.028,.012,false,true);sphere(head,0xffe8bc,.28,.12,.475,.028,.028,.012,false,true);sphere(head,0xa67d60,0,-.06,.42,.15,.11,.1);rod(head,0x6d5652,[-.16,-.22,.34],[.16,-.22,.34],.022,false);
 for(let i=0;i<3;i++){const y=.42+i*.19;const arc=ring(body,0x8f6c55,0,y,.26,.37+i*.025,.013);arc.scale.y=.26;}
 const hand=group(body,'alienHand');hand.position.set(-.54,1.13,0);rod(hand,0xb58c68,[0,0,0],[-.18,-.56,.06],.1);sphere(hand,0xc9a07b,-.19,-.59,.06,.14,.14,.14);for(let i=0;i<3;i++)rod(hand,0xc9a07b,[-.27+i*.07,-.61,.12],[-.29+i*.07,-.78,.13],.025,false);
 const lightHand=group(body,'lightHand');lightHand.position.set(.53,1.13,0);rod(lightHand,0xb58c68,[0,0,0],[.18,-.49,.1],.1);sphere(lightHand,0xc9a07b,.19,-.52,.1,.13,.14,.14);rod(lightHand,0xc9a07b,[.2,-.5,.15],[.22,-.18,.23],.035);const finger=sphere(lightHand,0xffd78c,.22,-.16,.23,.075,.075,.075,false,true);
 const heart=sphere(body,0xffa06d,0,1.15,.482,.105,.12,.03,false,true);const glow=new THREE.PointLight(0xff9d62,.7,3);glow.position.set(0,1.15,.6);body.add(glow);
 const{mixer}=animationSet(root,[track('alienBody','rotation[z]',[0,.5,1,1.5,2],[0,.035,0,-.035,0]),track('alienHead','rotation[y]',[0,1,2],[.08,-.08,.08]),track('alienHand','rotation[x]',[0,.5,1,1.5,2],[0,.25,0,-.25,0])],2);
 let time=0;return{root,mixer,body,heart,finger,animate(dt,s={}){time+=dt;mixer.update(dt*(s.moving?2:1));body.position.y=(s.hide?-.2:0)+(s.moving?Math.abs(Math.sin(time*6))*.07:Math.sin(time*1.7)*.03);lightHand.rotation.x=s.pulse?-1.8:0;glow.intensity=s.pulse?5:.6+Math.sin(time*2)*.2;heart.scale.set(.105,.12,.03).multiplyScalar(s.pulse?1.5:1+Math.sin(time*3)*.12);root.scale.y=root.scale.x*(s.hide?.8:1);}};
}
export function createGuard(){
 const root=group(null,'searcher'),body=group(root,'guardBody');box(body,0x42596a,0,1.3,0,.72,.94,.45);box(body,0x314351,0,.9,0,.76,.15,.5);sphere(body,0xc0a28d,0,2.08,0,.31,.39,.3);sphere(body,0x3b4856,0,2.33,-.03,.36,.16,.34);box(body,0x2d3d4b,0,2.25,.24,.48,.055,.23);sphere(body,0x182d3a,-.12,2.1,.27,.04,.05,.02,false,true);sphere(body,0x182d3a,.12,2.1,.27,.04,.05,.02,false,true);
 const leftLeg=group(root,'guardLeftLeg');leftLeg.position.set(-.2,.87,0);box(leftLeg,0x344857,0,-.32,0,.26,.67,.28);box(leftLeg,0x182c39,0,-.73,.13,.33,.2,.5);const rightLeg=group(root,'guardRightLeg');rightLeg.position.set(.2,.87,0);box(rightLeg,0x344857,0,-.32,0,.26,.67,.28);box(rightLeg,0x182c39,0,-.73,.13,.33,.2,.5);
 rod(body,0x42596a,[-.4,1.65,0],[-.47,.98,0],.17);sphere(body,0xc0a28d,-.47,.96,.04,.12,.13,.12);rod(body,0x42596a,[.4,1.66,0],[.48,1.38,.43],.17);sphere(body,0xc0a28d,.48,1.38,.43,.12,.13,.12);const torch=cylinder(body,0x1c2b38,.48,1.37,.66,.1,.5);torch.rotation.x=Math.PI/2;const lens=cylinder(body,0xffdda0,.48,1.37,.95,.12,.04,false);lens.rotation.x=Math.PI/2;lens.material=material(0xffdda0,true);
 const beamMat=new THREE.MeshBasicNodeMaterial({color:0xffdea6,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false});const beam=new THREE.Mesh(new THREE.ConeGeometry(2.4,9,24,1,true),beamMat);beam.rotation.x=-Math.PI/2;beam.position.set(.48,1.38,5.4);body.add(beam);
 const{mixer}=animationSet(root,[track('guardLeftLeg','rotation[x]',[0,.25,.5,.75,1],[0,.5,0,-.5,0]),track('guardRightLeg','rotation[x]',[0,.25,.5,.75,1],[0,-.5,0,.5,0]),track('guardBody','position[y]',[0,.25,.5,.75,1],[0,.05,0,.05,0])]);
 return{root,mixer,beam,animate(dt,s={}){mixer.update(dt*(s.moving?1:.05));beam.material.opacity=s.alert?.15:.07;}};
}
export function createProp(kind){
 const g=group(null,kind);
 if(kind==='toy'||kind==='keyboard'){box(g,0xc7bda4,0,.23,0,1.55,.45,.9);box(g,0x78a9a3,0,.48,-.21,1.28,.06,.28);for(let i=0;i<7;i++){box(g,[0xe47f56,0xe3b25a,0x7faca0][i%3],-.57+i*.19,.49,.19,.15,.08,.4);}box(g,0x273f4b,.34,.52,-.2,.35,.03,.15,false,true);}
 else if(kind==='record'){box(g,0x8c634d,0,.2,0,1.6,.4,1.25);cylinder(g,0x233845,-.2,.43,0,.5,.06);cylinder(g,0xd28a58,-.2,.47,0,.13,.02);rod(g,0xc2bfa8,[.6,.46,-.4],[.56,.53,.3],.035);rod(g,0xc2bfa8,[.56,.53,.3],[.18,.5,.37],.035);box(g,0xbe9975,0,.9,-.6,1.6,1.5,.08);box(g,0x7d6351,0,.91,-.54,1.33,1.2,.03,false);}
 else if(kind==='antenna'){cylinder(g,0x9eb6ad,0,.25,0,.3,.5);rod(g,0xd8c9a3,[0,.3,0],[0,2,0],.04);rod(g,0xd8c9a3,[-.9,1.65,0],[.9,1.65,0],.035);for(let i=0;i<4;i++)rod(g,0xb8c8b8,[-.65+i*.43,1.65,-.4],[-.65+i*.43,1.65,.4],.025);sphere(g,0xffd58a,0,2.06,0,.08,.08,.08,false,true);}
 else if(kind==='candy'){sphere(g,0xefc26e,0,.12,0,.13,.08,.13);}
 else if(kind==='flower'){g.add(flower(null,0,0,true));}
 return g;
}
export function createBike(){
 const root=group(null,'mooncycle'),bike=group(root,'bikeFrame');
 const wheels=[];for(const z of [-1.15,1.15]){const wheel=group(bike,z<0?'rearWheel':'frontWheel');wheel.position.set(0,.72,z);const tire=ring(wheel,0x182a36,0,0,0,.64,.1);tire.rotation.y=Math.PI/2;const rim=ring(wheel,0xc7cab0,0,0,0,.51,.035);rim.rotation.y=Math.PI/2;for(let i=0;i<10;i++){const a=i*Math.PI/5;rod(wheel,0x9caea4,[0,0,0],[0,Math.sin(a)*.5,Math.cos(a)*.5],.012,false);}const axle=cylinder(wheel,0xb3c1b3,0,0,0,.09,.36);axle.rotation.z=Math.PI/2;wheels.push(wheel);}
 const frameColor=0xd66c4f;for(const [a,b] of [[[0,.73,-1.15],[0,.75,-.15]],[[0,.75,-.15],[0,1.65,-.4]],[[0,1.65,-.4],[0,.73,-1.15]],[[0,.75,-.15],[0,1.65,.7]],[[0,1.65,.7],[0,1.65,-.4]],[[0,1.65,.7],[0,.73,1.15]]])rod(bike,frameColor,a,b,.065);
 rod(bike,0xb9b9a2,[0,1.65,-.4],[0,1.9,-.45],.055);box(bike,0x263946,0,1.92,-.48,.48,.12,.6);rod(bike,0xb9b9a2,[0,1.65,.7],[0,2.16,.82],.05);rod(bike,0xb9b9a2,[-.58,2.2,.9],[.58,2.2,.9],.05);for(const x of [-.58,.58])rod(bike,0x263946,[x,2.2,.9],[x,2.2,.62],.07);
 const pedal=group(bike,'pedal');pedal.position.set(0,.75,-.15);rod(pedal,0xc4bda6,[-.25,0,0],[.25,0,0],.035);box(pedal,0x263946,-.3,.02,.25,.24,.1,.3);box(pedal,0x263946,.3,-.02,-.25,.24,.1,.3);
 // Woven basket: real sticks instead of a texture.
 box(bike,0xac9777,0,1.6,1.27,.9,.12,.75);for(let i=0;i<5;i++){const x=-.43+i*.215;rod(bike,0xc8b08a,[x,1.6,.95],[x,2.22,.95],.025);rod(bike,0xc8b08a,[x,1.6,1.62],[x,2.22,1.62],.025);}for(let i=0;i<5;i++){const y=1.65+i*.13;box(bike,0xb7a07e,0,y,1.63,.92,.035,.035,false);box(bike,0xb7a07e,0,y,.94,.92,.035,.035,false);box(bike,0xb7a07e,-.46,y,1.28,.035,.035,.7,false);box(bike,0xb7a07e,.46,y,1.28,.035,.035,.7,false);}
 const rider=createKid();rider.root.scale.setScalar(.87);rider.root.position.set(0,1.03,-.38);rider.body.rotation.x=.28;rider.leftLeg.rotation.x=-.5;rider.rightLeg.rotation.x=.5;rider.leftArm.rotation.x=-1;rider.rightArm.rotation.x=-1;bike.add(rider.root);
 const passenger=createAlien();passenger.root.scale.setScalar(.57);passenger.root.position.set(0,1.63,1.25);bike.add(passenger.root);const blanket=sphere(bike,0xe2d8b8,0,1.87,1.27,.43,.4,.35);const cape=shape(bike,new THREE.ConeGeometry(.45,1.6,5,1,true),0xe4cf9a,0,2.2,-1.12,1,1,1,false);cape.rotation.x=Math.PI/2;cape.rotation.z=Math.PI;
 const{mixer}=animationSet(root,[track('pedal','rotation[x]',[0,1],[0,Math.PI*2]),track('rearWheel','rotation[x]',[0,1],[0,Math.PI*2]),track('frontWheel','rotation[x]',[0,1],[0,Math.PI*2]),track('bikeFrame','rotation[z]',[0,.5,1],[.025,-.025,.025])]);
 let time=0;return{root,mixer,rider,passenger,wheels,pedal,animate(dt,s={}){time+=dt;cape.visible=rider.root.visible;blanket.visible=passenger.root.visible;mixer.update(dt*(s.moving||s.flying?2:.05));passenger.animate(dt,{pulse:s.flying});rider.leftLeg.rotation.x=Math.sin(time*8)*.65-.2;rider.rightLeg.rotation.x=-Math.sin(time*8)*.65-.2;cape.rotation.x=Math.PI/2+Math.sin(time*9)*.08;if(s.flying)bike.position.y=Math.sin(time*2)*.08;else bike.position.y=0;}};
}
