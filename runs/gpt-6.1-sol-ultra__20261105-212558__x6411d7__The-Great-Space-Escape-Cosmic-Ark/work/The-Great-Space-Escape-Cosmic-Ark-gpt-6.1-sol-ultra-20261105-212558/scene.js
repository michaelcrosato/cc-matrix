import * as THREE from 'three/webgpu';
import { normalWorld, vec3, color } from 'three/tsl';

const INK = 0x081920;
const PALETTES = [
  { ground:0x227674, rim:0x70d3ae, plant:0x94eac2, sky:0x0b202d, rock:0x5c8d83, planet:0xd2a66b, accent:0xff925b },
  { ground:0x77528f, rim:0xd3a2d8, plant:0xf4c48d, sky:0x1a1830, rock:0xa57d9c, planet:0x8eabd3, accent:0xffb368 },
  { ground:0x346e85, rim:0x9fdfdb, plant:0xbde5e3, sky:0x101f37, rock:0x6aa8b2, planet:0xec997c, accent:0xf4bc6c },
];
const GEO = {
  sphere:new THREE.SphereGeometry(1,20,12), ico:new THREE.IcosahedronGeometry(1,1),
  ball:new THREE.IcosahedronGeometry(1,2), box:new THREE.BoxGeometry(1,1,1),
  cyl:new THREE.CylinderGeometry(1,1,1,24), cone:new THREE.ConeGeometry(1,1,16),
  ring:new THREE.TorusGeometry(1,0.07,6,64), disk:new THREE.CircleGeometry(1,32),
};
const materials = new Map();
function cel(hex){
  if(materials.has(hex)) return materials.get(hex);
  const m=new THREE.MeshBasicNodeMaterial();
  const illumination=normalWorld.dot(vec3(-.38,.74,.65).normalize()).max(0).mul(3).floor().div(3).mul(.48).add(.52);
  m.colorNode=color(hex).mul(illumination);m.name='Three-tone ink '+hex.toString(16);materials.set(hex,m);return m;
}
const black = new THREE.MeshBasicMaterial({color:INK,side:THREE.BackSide});
const flat = hex => new THREE.MeshBasicMaterial({color:hex});
function piece(parent,geometry,hex,pos=[0,0,0],scale=[1,1,1],outline=true){
  const mesh=new THREE.Mesh(geometry,cel(hex));mesh.position.set(...pos);mesh.scale.set(...scale);parent.add(mesh);
  if(outline){const edge=new THREE.Mesh(geometry,black);edge.scale.setScalar(1.045);mesh.add(edge);}return mesh;
}
function box(parent,hex,pos,scale){return piece(parent,GEO.box,hex,pos,scale);}
function sphere(parent,hex,pos,scale){return piece(parent,GEO.sphere,hex,pos,scale);}
function ring(parent,hex,pos,scale){return piece(parent,GEO.ring,hex,pos,scale,false);}
function line(parent,points,hex=0x51737d,opacity=1){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const o=new THREE.Line(geo,new THREE.LineBasicMaterial({color:hex,transparent:opacity<1,opacity}));parent.add(o);return o;}
function labelTexture(text,fg='#102832',bg='#f2e9cf'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);x.fillStyle=fg;x.font='bold 74px monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,65);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function tag(parent,text,pos,scale){const mat=new THREE.MeshBasicMaterial({map:labelTexture(text)});const p=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat);p.position.set(...pos);p.scale.set(...scale);parent.add(p);return p;}
function nativeLoop(root,tracks,duration){const mixer=new THREE.AnimationMixer(root);const clip=new THREE.AnimationClip('living-loop',duration,tracks);mixer.clipAction(clip).play();return mixer;}

function ark(){
  const g=new THREE.Group();g.name='MOTHER_ARK';
  const hull=sphere(g,0xe6e0c6,[0,0,0],[3.35,.92,1.3]);
  sphere(g,0x50877f,[0,.28,-.22],[3.6,.6,1]);
  sphere(g,0x8bc6b2,[0,.56,0],[2.75,.57,1.15]);
  box(g,0x152e3a,[0,-.45,1.05],[4.5,.5,.3]);
  box(g,0xeaddb8,[0,-.42,1.24],[4.4,.18,.12]);
  for(let i=-2;i<=2;i++){
    sphere(g,0x122e3d,[i*.78,.1,1.19],[.3,.32,.12]);
    sphere(g,i===0?0xffb865:0x7bceb8,[i*.78,.12,1.3],[.205,.23,.07]);
    box(g,0xf3edcf,[i*.78-.075,.205,1.37],[.06,.065,.025]);
  }
  sphere(g,0x0e3544,[0,1.02,-.1],[1.25,.7,.75]);
  sphere(g,0x75d8d7,[0,1.13,.08],[1.09,.59,.68]);
  sphere(g,0xd9f2dd,[-.4,1.37,.65],[.18,.08,.03]);
  box(g,0xe6d9b5,[0,.8,.7],[2.4,.11,.15]);
  for(const side of [-1,1]){
    const wing=box(g,0xe6dfc4,[side*3.0,-.08,-.15],[1.7,.19,1.7]);wing.rotation.z=side*.13;
    box(g,0xff9968,[side*3.1,.03,.42],[.2,.1,1]);
    box(g,0x173843,[side*3.55,-.25,.1],[.7,.63,.8]);
    const engine=sphere(g,0xffa668,[side*3.67,-.6,.25],[.36,.55,.39]);engine.name='engine'+(side>0?'R':'L');
    box(g,0xeaddc3,[side*2.6,.75,-.5],[.18,.85,.3]);
    sphere(g,0xffad6e,[side*2.6,1.22,-.5],[.16,.16,.16]);
    for(let j=0;j<3;j++)box(g,0x204b52,[side*2.68,-.26+j*.18,1.02],[.35,.06,.03]);
  }
  box(g,0x173843,[0,-.89,.6],[1.3,.2,.8]);
  sphere(g,0xffb16b,[0,-1.02,.7],[.4,.13,.35]);
  tag(g,'ARK / 01',[0,-.44,1.43],[1.6,.31,1]);
  const antenna=piece(g,GEO.cyl,0xece5ca,[1.65,1.5,-.2],[.045,.8,.045]);antenna.rotation.z=-.25;
  sphere(g,0xffa76f,[1.76,1.91,-.2],[.14,.14,.14]);
  g.userData.mixer=nativeLoop(g,[new THREE.VectorKeyframeTrack('engineR.scale',[0,.35,.7],[.36,.55,.39,.36,.8,.39,.36,.55,.39]),new THREE.VectorKeyframeTrack('engineL.scale',[0,.35,.7],[.36,.8,.39,.36,.55,.39,.36,.8,.39])],.7);
  return g;
}
function saucer(hex=0x9ce2c3){
  const g=new THREE.Group();
  sphere(g,0xece1bd,[0,0,0],[.89,.26,.65]);
  sphere(g,hex,[0,.12,0],[.83,.18,.62]);
  sphere(g,0x153b4c,[0,.35,-.02],[.45,.38,.39]);
  sphere(g,0x84d9de,[0,.4,.03],[.36,.31,.32]);
  sphere(g,0xeaf0ce,[-.13,.5,.31],[.08,.04,.02]);
  for(let j=-1;j<=1;j++)sphere(g,0xffae6c,[j*.4,-.03,.58],[.08,.065,.04]);
  box(g,0x1e4247,[0,-.2,.05],[.42,.18,.37]);
  sphere(g,0x8ee4c7,[0,-.32,.05],[.17,.08,.17]);
  for(let i=0;i<2;i++){const cargo=sphere(g,0xb9eccc,[(i-.5)*.33,-.23,.55],[.105,.105,.055]);cargo.name='cargo'+i;cargo.visible=false;}
  const halo=new THREE.Mesh(GEO.sphere,new THREE.MeshBasicMaterial({color:0xc9ffe0,wireframe:true,transparent:true,opacity:.3}));halo.name='halo';halo.scale.set(1.1,.7,.85);halo.visible=false;g.add(halo);
  const beam=new THREE.Mesh(new THREE.ConeGeometry(1,1,32,1,true),new THREE.MeshBasicMaterial({color:0x95ffd0,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));beam.name='beam';g.add(beam);beam.visible=false;
  const beamRing=ring(g,0xa6f4c5,[0,-.35,.2],[.4,.4,.4]);beamRing.name='beamRing';beamRing.rotation.x=Math.PI/2;beamRing.visible=false;
  return g;
}
function creature(type=0){
  const g=new THREE.Group(), body=new THREE.Group();body.name='body';g.add(body);
  const colors=[0xaceac1,0xffc077,0xc7abec,0x94e1eb];const col=colors[type%4];
  if(type%3===0){
    sphere(body,col,[0,.52,0],[.42,.52,.3]);
    for(const side of [-1,1]){
      const ear=sphere(body,col,[side*.22,1.09,-.04],[.12,.44,.1]);ear.rotation.z=-side*.2;
      sphere(body,0xffb3a2,[side*.22,1.1,.055],[.055,.29,.02]);
      sphere(body,col,[side*.28,.16,.04],[.21,.11,.25]);
    }
    sphere(body,0xe6f5ce,[0,.4,.24],[.23,.22,.09]);
  }else if(type%3===1){
    sphere(body,col,[0,.45,0],[.53,.4,.35]);
    const wing=box(body,0xf7db91,[-.45,.47,-.04],[.55,.14,.3]);wing.name='wing';wing.rotation.z=-.35;
    const wing2=box(body,0xf7db91,[.45,.47,-.04],[.55,.14,.3]);wing2.name='wing2';wing2.rotation.z=.35;
    piece(body,GEO.cone,0xff855b,[0,.34,.43],[.13,.26,.13]).rotation.x=Math.PI/2;
    for(const side of [-1,1])box(body,0xed9554,[side*.2,.08,.06],[.11,.23,.2]);
    for(let j=-1;j<=1;j++)sphere(body,0xffa064,[j*.15,.86,0],[.09,.19,.1]);
  }else{
    sphere(body,col,[0,.35,0],[.5,.34,.35]);
    sphere(body,0x8c709e,[-.24,.55,-.03],[.37,.39,.33]);
    const spiral=ring(body,0xe5c4dc,[-.24,.55,.31],[.23,.23,.23]);
    ring(body,0xe5c4dc,[-.24,.55,.32],[.11,.11,.11]);
    for(const side of [-1,1]){
      box(body,col,[side*.16+.2,.76,.11],[.075,.55,.07]);
      sphere(body,0xf4edcf,[side*.16+.2,1.01,.12],[.14,.13,.14]);
      sphere(body,INK,[side*.16+.2,1.01,.24],[.055,.065,.035]);
    }
  }
  if(type%3!==2){
    for(const side of [-1,1]){
      sphere(body,0xf9efdb,[side*.17,.61,.278],[.12,.14,.075]);
      sphere(body,INK,[side*.17+.025,.61,.34],[.052,.068,.023]);
    }
  }
  sphere(body,0xffa5a2,[-.28,.42,.28],[.08,.04,.02]);sphere(body,0xffa5a2,[.28,.42,.28],[.08,.04,.02]);
  const tracks=[new THREE.NumberKeyframeTrack('body.position[y]',[0,.4,.8],[0,.12,0]),new THREE.NumberKeyframeTrack('body.rotation[z]',[0,.4,.8],[-.055,.055,-.055])];
  if(type%3===1){tracks.push(new THREE.NumberKeyframeTrack('wing.rotation[z]',[0,.2,.4],[-.4,.3,-.4]),new THREE.NumberKeyframeTrack('wing2.rotation[z]',[0,.2,.4],[.4,-.3,.4]));}
  g.userData.mixer=nativeLoop(g,tracks,.8);return g;
}
function rock(){const g=new THREE.Group();piece(g,GEO.ico,0xa48275,[0,0,0],[1,.88,.8]);piece(g,GEO.ico,0x655c60,[.3,.14,.6],[.32,.25,.15]);piece(g,GEO.ico,0xd2ae8b,[-.32,.27,.5],[.19,.18,.12]);return g;}
function flower(parent,x,y,scale,col){
 const g=new THREE.Group();g.position.set(x,y,-1.2);g.scale.setScalar(scale);parent.add(g);
 const stem=piece(g,GEO.cyl,0x214e50,[0,.65,0],[.06,1.3,.06]);stem.rotation.z=.12;
 for(let j=0;j<5;j++){const a=j/5*Math.PI*2;sphere(g,col,[Math.sin(a)*.3,1.35+Math.cos(a)*.3,0],[.26,.3,.15]);}
 sphere(g,0xf3dc9f,[0,1.35,.14],[.2,.2,.11]);
}
function terrain(index){
  const p=PALETTES[index],g=new THREE.Group();g.name='planet-surface-'+index;
  piece(g,GEO.sphere,p.ground,[0,-15,-3],[26,8,5]);
  piece(g,GEO.sphere,p.rim,[0,-14.45,-3.4],[26,7.4,4.8]);
  piece(g,GEO.sphere,p.ground,[0,-14.7,-2.8],[26,7.4,4.6]);
  for(let j=0;j<24;j++){
    const x=-20+j*1.8;const y=-7.6-Math.abs(x)*.018+Math.sin(j*1.9)*.18;
    const s=.4+(Math.sin(j*8.3)+1)*.3;
    const stone=piece(g,GEO.ico,p.rock,[x,y-.5,-.65],[s*1.4,s*.7,s]);stone.rotation.z=j;
    if(j%3===0){
      const trunk=piece(g,GEO.cyl,0x214c4d,[x,y+.7,-2],[.1,1.7,.1]);trunk.rotation.z=Math.sin(j)*.16;
      const cap=piece(g,GEO.sphere,p.plant,[x+.1,y+1.5,-2],[.9,.45,.7]);
      for(let q=-1;q<=1;q++)sphere(g,p.accent,[x+q*.34,y+1.57,-1.35],[.12,.1,.05]);
    }else if(j%4===0)flower(g,x,y,.75,p.plant);
    for(let k=0;k<3;k++){
      const blade=piece(g,GEO.cone,p.rim,[x+k*.19,y+.05,-.4],[.06,.55+(k%2)*.2,.05],false);blade.rotation.z=(k-1)*.3;
    }
  }
  for(let j=0;j<13;j++){const x=-21+j*3.6;const mountain=piece(g,GEO.cone,p.rock,[x,-8.3-Math.abs(x)*.03,-5],[1.9,3.6+Math.sin(j)*1.2,1.5]);mountain.rotation.z=Math.sin(j)*.2;}
  return g;
}
export async function createScene(canvas){
  const renderer=new THREE.WebGPURenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  await renderer.init();
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0a1b29);
  const camera=new THREE.OrthographicCamera(-18,18,10.125,-10.125,.1,150);camera.position.set(0,0,45);camera.lookAt(0,0,0);
  const background=new THREE.Group();scene.add(background);
  // A printed star chart: distant stars, orbital arcs, and a warm gas giant.
  let seed=71893;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const starPositions=[],starColors=[];
  for(let i=0;i<700;i++){starPositions.push((rand()-.5)*100,(rand()-.5)*60,-35-rand()*10);const c=new THREE.Color(i%9===0?0xf6bf7d:i%3?0x8cafb0:0xe1e5ce);starColors.push(c.r,c.g,c.b);}
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));starGeo.setAttribute('color',new THREE.Float32BufferAttribute(starColors,3));
  background.add(new THREE.Points(starGeo,new THREE.PointsMaterial({size:1.5,vertexColors:true,sizeAttenuation:false})));
  for(let i=0;i<30;i++){const x=(rand()-.5)*68,y=(rand()-.5)*35;line(background,[[x-.11,y,-34],[x+.11,y,-34]],0x9bc4c0,.45);line(background,[[x,y-.11,-34],[x,y+.11,-34]],0x9bc4c0,.45);}
  const planet=new THREE.Group();planet.position.set(10.5,3.8,-24);planet.rotation.z=-.33;background.add(planet);
  sphere(planet,0xcaa572,[0,0,0],[4.9,4.9,4.9]);
  for(let j=-3;j<=3;j++){const disk=piece(planet,GEO.cyl,j%2?0xd4b786:0xb98f69,[0,j*1.08,.02],[Math.sqrt(24-j*j*1.16),.08,Math.sqrt(24-j*j*1.16)],false);}
  const ringPlanet=piece(planet,new THREE.TorusGeometry(6.75,.2,4,100),0xc6c6a7,[0,0,0],[1,.34,1],false);ringPlanet.rotation.x=.15;
  const ringPlanet2=piece(planet,new THREE.TorusGeometry(7.2,.07,4,100),0x788f8c,[0,0,.04],[1,.34,1],false);ringPlanet2.rotation.x=.15;
  // Diagram rings remain deliberately restrained behind the action.
  const orbital=new THREE.Group();orbital.position.set(5,0,-30);background.add(orbital);
  for(let i=0;i<3;i++){const curve=[];for(let j=0;j<=150;j++){const a=j/150*Math.PI*2;curve.push([Math.cos(a)*(13+i*4),Math.sin(a)*(13+i*4),0]);}line(orbital,curve,0x24404b,.43);}
  const surfaces=PALETTES.map((_,i)=>terrain(i));for(const t of surfaces)scene.add(t);
  const mother=ark();scene.add(mother);
  const shield=new THREE.Mesh(GEO.sphere,new THREE.MeshBasicMaterial({color:0x99f3d5,wireframe:true,transparent:true,opacity:.16}));shield.scale.set(4.4,2.1,2.0);scene.add(shield);
  const guide=new THREE.Group();scene.add(guide);
  for(const x of [-16,16])line(guide,[[x,-7,0],[x,8,0]],0x456a6f,.3);
  const rescueGuide=new THREE.Group();scene.add(rescueGuide);
  for(let x=-15;x<15;x+=.72)line(rescueGuide,[[x,1,-.2],[x+.28,1,-.2]],0x87c8b1,.48);
  for(const x of [-15,15]){line(rescueGuide,[[x,1.18,0],[x,.82,0]],0xa7ddc4,.7);}
  const dock=new THREE.Group();dock.position.set(0,4.85,1.7);rescueGuide.add(dock);
  const dockRing=ring(dock,0x9ae4bd,[0,.2,0],[2.8,.42,1]);
  for(const side of [-1,1]){line(dock,[[side*2.9,.8,0],[side*2.9,-.4,0],[side*2.25,-.4,0]],0xa6e8c4,.82);line(dock,[[side*1.8,-.4,0],[side*1.5,-.08,0],[side*1.2,-.4,0]],0xa6e8c4,.82);}
  tag(dock,'DOCK HERE',[0,-.58,.01],[1.5,.3,1]);
  const maps={players:new Map(),meteors:new Map(),shots:new Map(),critters:new Map(),enemies:new Map(),effects:new Map()};
  const staticCritters=new THREE.Group();scene.add(staticCritters);
  for(let i=0;i<7;i++){const c=creature(i%3);c.position.set(3.5+i*1.55,-7.2,1);c.userData.offset=i*.14;staticCritters.add(c);}
  let lastWorld=-1,frames=0;
  const aimMeshes=new Map();
  const trailMaterial=new THREE.MeshBasicMaterial({color:0xffa165,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false});
  function sync(key,list,factory,update){
    const map=maps[key],live=new Set();
    for(const item of list||[]){if(item.active===false||(item.status==='aboard'||item.status==='delivered'))continue;live.add(item.id);let obj=map.get(item.id);if(!obj){obj=factory(item);map.set(item.id,obj);scene.add(obj);}update(obj,item);}
    for(const [id,obj]of map){if(!live.has(id)){scene.remove(obj);map.delete(id);}}
  }
  function render(state,dt){
    dt=Math.min(dt||.016,.06);const t=state.time||0;const phase=state.phase||'title';const title=phase==='title';const rescue=phase==='rescue'||title||phase==='victory';const world=Math.min(2,Math.max(0,state.world||0));
    rescueGuide.visible=phase==='rescue';dockRing.scale.y=.38+Math.sin(t*3)*.035;
    if(world!==lastWorld){surfaces.forEach((s,i)=>s.visible=i===world);scene.background.setHex(PALETTES[world].sky);lastWorld=world;}
    surfaces[world].position.y=rescue?0:-10;
    staticCritters.visible=title||phase==='victory';
    staticCritters.children.forEach(c=>c.userData.mixer.update(dt));
    mother.position.set(title?6:0,title?1.7:rescue?6.4:0,0);mother.scale.setScalar(title?1.18:rescue?.8:1);mother.rotation.z=Math.sin(t*.7)*.015;mother.position.y+=Math.sin(t*1.3)*.06;
    mother.userData.mixer.update(dt);
    shield.position.copy(mother.position);shield.visible=((state.shield||0)>0||(state.players||[]).some(p=>p.shield>0&&phase==='defense'))&&!title;shield.material.opacity=.15+Math.sin(t*8)*.05;
    background.rotation.z=Math.sin(t*.025)*.01;
    planet.rotation.z=-.33+t*.001;
    sync('players',title?[]:state.players||[],item=>saucer(typeof item.color==='number'?item.color:parseInt((item.color||'#a5e8c7').replace('#',''),16)),(obj,item)=>{
      obj.visible=phase!=='defense';obj.position.set(item.x,item.y,1.2);obj.rotation.z=Math.sin(t*3+item.id)*.025;
      obj.getObjectByName('halo').visible=(item.shield||0)>0;for(let i=0;i<2;i++)obj.getObjectByName('cargo'+i).visible=(item.cargo?.length||0)>i;
      const beam=obj.getObjectByName('beam'),br=obj.getObjectByName('beamRing');beam.visible=Boolean(item.beam)&&rescue&&item.y<1;br.visible=beam.visible;
      if(beam.visible){const h=Math.max(.2,item.y+7.2);beam.position.set(0,-h/2-.25,-.05);beam.scale.set(1.25,h,1.25);br.position.set(0,-h+.08,.08);br.scale.setScalar(1.1+Math.sin(t*8)*.08);}
      let a=aimMeshes.get(item.id);if(!a){a=new THREE.Group();ring(a,0xf8d18b,[0,0,0],[.25,.25,.25]);line(a,[[-.42,0,0],[-.28,0,0]],0xffd493);line(a,[[.28,0,0],[.42,0,0]],0xffd493);line(a,[[0,-.42,0],[0,-.28,0]],0xffd493);line(a,[[0,.28,0],[0,.42,0]],0xffd493);scene.add(a);aimMeshes.set(item.id,a);}
      a.visible=!rescue&&phase==='defense';a.position.set((item.aimX||0)*5.2,(item.aimY||0)*4.0,2);
    });
    for(const [id,a]of aimMeshes)if(!(state.players||[]).some(p=>p.id===id&&p.active!==false))a.visible=false;
    sync('meteors',state.meteors,()=>{const g=rock();const tail=new THREE.Mesh(GEO.cone,trailMaterial);tail.name='tail';tail.position.set(0,1.3,-.15);tail.scale.set(.5,2,.3);g.add(tail);return g;},(obj,item)=>{
      obj.position.set(item.x,item.y,.3);obj.scale.setScalar(item.r||.55);obj.rotation.z=t*.5+item.id*.7;
      const tail=obj.getObjectByName('tail');if(item.vx!==undefined){tail.rotation.z=Math.atan2(-item.vx,item.vy||1);tail.position.set(-item.vx*.25,-(item.vy||1)*.25,-.15);}tail.visible=true;
    });
    sync('shots',state.shots,()=>{const g=new THREE.Group();box(g,0xc7ffe0,[0,0,0],[.13,.65,.13]);box(g,0xf8f4c9,[0,.15,.05],[.065,.25,.04]);return g;},(obj,item)=>{obj.position.set(item.x,item.y,1);obj.rotation.z=(item.angle||0)-Math.PI/2;});
    sync('critters',title?[]:state.critters,item=>creature(item.type||0),(obj,item)=>{let y=item.y-.6;const lifting=(item.lift||0)>0&&item.status==='ground';if(lifting){const p=(state.players||[]).find(p=>p.beam&&Math.abs(p.x-item.x)<1.7);if(p)y=item.y-.6+(p.y-item.y+.1)*Math.min(1,item.lift/1.15);}
      obj.position.set(item.x,y,1.3);obj.userData.mixer.update(dt);obj.scale.setScalar(lifting?1-Math.min(1,item.lift)*.22:1);obj.rotation.z=lifting?Math.sin(t*9)*.12:0;});
    sync('enemies',state.enemies,()=>{const g=saucer(0xf58f79);sphere(g,0xf98077,[0,.72,0],[.13,.2,.1]);return g;},(obj,item)=>{obj.position.set(item.x,item.y,.6);obj.rotation.z=Math.sin(t*4+item.id)*.12;});
    sync('effects',state.effects,item=>{
      const g=new THREE.Group();const col=item.kind==='rescue'?0xa6ffd4:item.kind==='hit'?0xff886b:0xffd78c;
      const r=ring(g,col,[0,0,0],[1,1,1]);r.name='burstRing';
      for(let j=0;j<9;j++){const a=j/9*Math.PI*2;const s=piece(g,GEO.ico,col,[Math.cos(a),Math.sin(a),0],[.12,.12,.12],false);s.name='spark';s.userData.a=a;}
      return g;
    },(obj,item)=>{const f=1-Math.max(0,item.life)/(item.maxLife||.65);obj.position.set(item.x,item.y,2);obj.scale.setScalar(.25+f*(item.kind==='pulse'?9:2));obj.children.forEach(c=>{c.visible=f<.92;if(c.name==='spark')c.scale.setScalar(Math.max(.02,(1-f)*.2));});obj.rotation.z=f*.4;});
    if(phase==='warp'){mother.position.z=Math.sin((state.phaseTime||0)*2)*.8;mother.scale.setScalar(1+(state.phaseTime||0)*.06);}else mother.position.z=0;
    renderer.render(scene,camera);frames++;
  }
  function resize(){const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);const aspect=w/h;const halfH=Math.max(10.125,18/aspect);camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();}
  resize();addEventListener('resize',resize);
  return {render,resize,renderer,camera,scene,ready:{webgpu:Boolean(renderer.backend?.isWebGPUBackend),three:THREE.REVISION,animation:'AnimationMixer / AnimationClip',get frames(){return frames;}},dispose(){removeEventListener('resize',resize);renderer.dispose();}};
}
