import {THREE,toonMaterial,setLookLayer,buildModel,createNoise,SpringChain,Squash,hologramMaterial} from '../../pixel-engine.js';
import {HAND,TOOL_MODELS} from '../content/models.js';
import {opById} from '../content/ops.js';
const {Group,Mesh,BoxGeometry,CylinderGeometry,SphereGeometry,TorusGeometry,PlaneGeometry,DataTexture,RGBAFormat,NearestFilter,Vector3,CatmullRomCurve3,TubeGeometry}=THREE;
export const SEAT_COLORS=[0xe8443a,0x3b82f6,0x22c55e,0xf5b700];
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export const RAMPS={forearm:[0x724042,0xa36b58,0xc99170,0xe2ad85,0xf5cba4],stomach:[0x441d32,0x773044,0xa95259,0xd47d74,0xe8a38a],
 triage:[0x66313b,0x92504d,0xbd7d67,0xdba480,0xeac49a],bone:[0x351d32,0x643043,0x9c4c52,0xbe7269,0xd39a85],
 liver:[0x3c102b,0x601c37,0x8d2e43,0xb74b52,0xd87465],kidney:[0x59322f,0x8b5a40,0xc39863,0xd8b67f,0xf0d4a0],
 lung:[0x34273c,0x674957,0x95727a,0xbe9693,0xe1b7a5],heart:[0x3c0d24,0x5e1430,0x8a1f38,0xb5343f,0xd65c4f],
 chest:[0x331b30,0x633747,0x96575e,0xc1847d,0xe1b69c],spine:[0x34323e,0x64616a,0x958b88,0xc5b8a6,0xe4d9ba]};
export function heightAt(arena,x,z,t=0,bpm=72){
 const dome=(cx,cz,rx,rz,h)=>h*Math.max(0,1-((x-cx)/rx)**2-((z-cz)/rz)**2)**1.2;
 if(arena==='heart')return Math.max(dome(-1,-.35,4.2,3.4,1.5),dome(1.5,-.6,3.1,2.8,1.75))*(1+.055*Math.max(0,Math.sin(t*bpm/60*Math.PI*2)));
 if(arena==='liver')return Math.max(dome(-1.8,0,5,3.5,1),dome(2.4,-.3,3.2,2.8,.7));
 if(arena==='lung'||arena==='chest')return Math.max(dome(-2.5,0,3,3.4,.9),dome(2.5,0,3,3.4,.9))*(1+.04*Math.sin(t*1.4));
 if(arena==='kidney')return .17+dome(0,0,2.5,2.6,.65);
 if(arena==='forearm'||arena==='triage')return .55*Math.max(0,1-(z/3.7)**2);
 if(arena==='bone')return .16+dome(0,0,6,2,.3);
 if(arena==='spine')return .13+dome(0,0,6,2,.35);
 return .25+Math.sin(z*4+x*.3)*.1;
}
export function box(size,at,color){const m=new Mesh(new BoxGeometry(...size),toonMaterial(color));m.position.set(...at);m.castShadow=m.receiveShadow=true;return m;}
const ball=(r,c)=>new Mesh(new SphereGeometry(r,10,7),toonMaterial(c,{rim:0x84666b}));
function tube(points,r,color){return new Mesh(new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),20,r,5,false),toonMaterial(color));}
function ring(r,color,thick=.035){const m=new Mesh(new TorusGeometry(r,thick,5,32),toonMaterial(color));m.rotation.x=-Math.PI/2;return m;}

export class FieldView{
 constructor(ctx){
  this.ctx=ctx;this.root=new Group();ctx.scene.add(this.root);this.arena=null;this.items=new Map();this.hands=[];this.temp=new Vector3();
  this.geo=new PlaneGeometry(16,9,128,72).rotateX(-Math.PI/2);const uv=this.geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));
  this.pixels=new Uint8Array(480*270*4);this.base=new Uint8Array(this.pixels.length);this.texture=new DataTexture(this.pixels,480,270,RGBAFormat);this.texture.magFilter=this.texture.minFilter=NearestFilter;this.texture.colorSpace=THREE.SRGBColorSpace;this.texture.needsUpdate=true;
  this.surface=new Mesh(this.geo,toonMaterial(0xffffff,{map:this.texture}));this.surface.receiveShadow=true;this.root.add(this.surface);
  this.kidney=ball(.8,0x6c526a);this.kidney.material=this.kidney.material.clone();this.kidney.scale.set(1.6,.6,1);this.root.add(this.kidney);
  this.paddles=new Group();for(const x of [-3,3])this.paddles.add(box([1.5,.17,1.05],[x,1,1],0xa2bac0),box([.95,.23,.28],[x,1.2,1],0x213b4a));this.root.add(this.paddles);this.paddles.visible=false;
  this.beam=new Mesh(new CylinderGeometry(.025,.025,1.05,5),toonMaterial(0xff7267,{rim:0xff9b74}));this.root.add(this.beam);this.beam.visible=false;
  this.buildDrapes();
  for(let i=0;i<4;i++)this.makeHand(i);
  this.ghostHand=buildModel(HAND,{palette:{glove:'cyan',fold:'blue',sleeve:'navy'}}).object;this.ghostHand.scale.setScalar(.7);this.ghostHand.rotation.set(-.46,.72,.2);this.ghostHand.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.transparent=true;m.material.opacity=.32;m.castShadow=false;}});setLookLayer(this.ghostHand,'actors');this.root.add(this.ghostHand);this.ghostHand.visible=false;
  this.scanDisc=new Mesh(new CylinderGeometry(2.2,2.2,.025,48),hologramMaterial({color:0x57e4da}));this.root.add(this.scanDisc);
  this.light=ctx.lights.request({position:[0,5.2,.4],color:0xffeee0,intensity:5,radius:15,priority:10,name:'surgical-light'});
 }
 buildDrapes(){
  for(const [size,at]of [[[3,.6,12],[-9.2,.35,0]],[[3,.6,12],[9.2,.35,0]],[[16,.5,2.4],[0,.25,-5.7]],[[16,.5,2.7],[0,.3,5.8]]]){
   this.root.add(box(size,at,0x1e6869));
  }
  for(let i=0;i<24;i++){
   const x=-9+i*.78;this.root.add(box([.08,.08,2.3],[x,.59,5.6],i%3?0x286e70:0x387c7b));
   this.root.add(box([.08,.08,2],[x,.53,-5.5],0x24585c));
  }
  for(const x of [-7.9,7.9])for(const z of [-3,0,3]){
   const clamp=box([.42,.24,.83],[x,.7,z],0x8cabb7);clamp.rotation.y=x>0?-.4:.4;this.root.add(clamp);
   this.root.add(box([.45,.08,.21],[x+(x>0?-.28:.28),.7,z],0xc3d4cc));
  }
  this.root.add(box([1.9,.14,3.4],[8.8,.8,.6],0x6b8790),box([1.5,.06,3],[8.8,.9,.6],0x344d5a));
  for(let i=0;i<5;i++)this.root.add(box([.08,.09,1.8],[8.2+i*.23,.99,.4],0xc4d4cc));
 }
 makeHand(i){
  const g=new Group(),glove=buildModel(HAND,{palette:{glove:['sky','red','green','sand'][i],fold:['blue','plum','teal','orange'][i]}}).object;
  const colored=[];glove.traverse(m=>{if(m.isMesh){m.material=m.material.clone();if(m.name.endsWith(':glove'))colored.push(m.material);}});
  glove.position.set(.88,.64,1.08);glove.rotation.set(-.46,.72,.2);glove.scale.setScalar(.7);g.add(glove);
  const tools={};for(const[k,def]of Object.entries(TOOL_MODELS)){const t=buildModel(def).object;t.rotation.set(-.5,.7,0);g.add(t);tools[k]=t;}
  const ret=ring(.18,SEAT_COLORS[i],.026);g.add(ret);setLookLayer(g,'actors');this.root.add(g);
  this.hands.push({root:g,glove,tools,ret,colored,squash:new Squash()});
 }
 setArena(arena){
  if(this.arena===arena)return;this.arena=arena;this.paintBase();this.pixels.set(this.base);this.texture.needsUpdate=true;
 }
 paintBase(){
  const noise=createNoise(183),ramp=RAMPS[this.arena]||RAMPS.heart;
  for(let py=0;py<270;py++)for(let px=0;px<480;px++){
   const x=(px/480-.5)*16,z=(py/270-.5)*9,y=heightAt(this.arena,x,z),n=noise.fbm2(x*.85,z*.85)*.5+.5;
   const inside=Math.abs(x)<6.5&&Math.abs(z)<3.65;
   let l=.18+y*.25+n*.46-z*.025,index=Math.max(0,Math.min(4,Math.floor(l*4+BAYER[(px&3)+(py&3)*4]/16*.75)));
   let c=inside?ramp[index]:0x23172a;
   if(inside&&this.arena==='stomach'&&Math.sin(z*8+x*.7+n)>.7)c=ramp[Math.max(0,index-1)];
   if(inside&&this.arena==='lung'&&((px*7+py*11)%37<4))c=ramp[Math.max(0,index-1)];
   if(inside&&this.arena==='bone'&&Math.abs(z-Math.sin(x*.7)*.1)<.48)c=[0xadb6aa,0xe4ddba,0xffebc5][(px+py)%3];
   if(inside&&this.arena==='spine'&&Math.abs(z)<.65&&Math.sin(x*3)>-.75)c=py%3?0xd4ceb0:0xf1e3ba;
   if(inside&&['heart','liver','chest'].includes(this.arena)&&n>.67&&Math.abs(x)>4.5)c=0xd9ac6c;
   const p=(py*480+px)*4;this.base[p]=c>>16;this.base[p+1]=c>>8&255;this.base[p+2]=c&255;this.base[p+3]=255;
  }
  this.pixels.set(this.base);
  const state={rng:62};const rand=()=>{state.rng=(Math.imul(state.rng,1664525)+1013904223)>>>0;return state.rng/4294967296;};
  for(let v=0;v<28;v++){
   let x=(rand()-.5)*12,z=(rand()-.5)*6,a=rand()*Math.PI*2;
   for(let j=0;j<70;j++){this.disc(x,z,j<25?.043:.026,v%3?0x642e47:0xbb6562,false);a+=(rand()-.5)*.5;x+=Math.cos(a)*.09;z+=Math.sin(a)*.09;}
  }
  for(let i=0;i<650;i++){const x=(rand()-.5)*12,z=(rand()-.5)*6;if(heightAt(this.arena,x,z)>.4)this.disc(x,z,.013,0xf1bda1,false);}
  this.base.set(this.pixels);
 }
 disc(x,z,r,color,blend=true){
  const cx=(x/16+.5)*480,cy=(z/9+.5)*270,rx=Math.max(1,r*30),ry=rx;
  for(let iy=Math.max(0,Math.floor(cy-ry));iy<Math.min(270,cy+ry);iy++)for(let ix=Math.max(0,Math.floor(cx-rx));ix<Math.min(480,cx+rx);ix++){
   if(((ix-cx)/rx)**2+((iy-cy)/ry)**2>1)continue;const p=(iy*480+ix)*4;
   if(blend){this.pixels[p]=(this.pixels[p]+(color>>16)*3)/4;this.pixels[p+1]=(this.pixels[p+1]+(color>>8&255)*3)/4;this.pixels[p+2]=(this.pixels[p+2]+(color&255)*3)/4;}
   else {this.pixels[p]=color>>16;this.pixels[p+1]=color>>8&255;this.pixels[p+2]=color&255;}
  }
 }
 paintPath(path,r,c){for(let i=1;i<(path||[]).length;i++){const a=path[i-1],b=path[i],d=Math.hypot(a.x-b.x,a.z-b.z),n=Math.max(1,Math.ceil(d/.035));for(let j=0;j<=n;j++)this.disc(a.x+(b.x-a.x)*j/n,a.z+(b.z-a.z)*j/n,r,c);}}
 buildEntity(e){
  const g=new Group();let body=null;
  if(['hook','prop','magnet'].includes(e.k)){
   if(e.k==='hook'){g.add(tube([[0,.06,0],[.15,.08,-.3],[.36,.12,-.45],[.55,.16,-.3],[.5,.19,0],[.28,.22,.12]],.055,0xd7e2d5));g.add(box([.1,.1,.25],[.1,.08,-.1],0xa7c5c2));}
   else if(e.k==='magnet'){const m=ring(.3,0x7fc5db,.1);m.rotation.x=0;g.add(m,box([.16,.15,.25],[-.27,.05,0],0xe96766));}
   else {g.add(box([.65,.12,.4],[0,0,0],e.prop==='card'?0xe8ddc2:0xdabf7a));}
  }else if(e.k==='fragment'){
   body=box([1,.25,.55],[0,.1,0],0xf0deae);g.add(body);const r=ring(.27,0x92dcd0);r.position.y=.05;g.add(r);
  }else if(e.k==='organ'||e.k==='tumor'){
   body=ball(e.k==='organ'?.65:.52,e.k==='organ'?0xa95567:0x67516a);body.scale.set(1.2,.6,.8);g.add(body);
  }else if(e.k==='clamp'){g.add(box([.9,.13,.12],[0,.1,0],0xb6c9c5),box([.12,.17,.35],[-.37,.1,-.1],0xe3d9bc));}
  else if(e.k==='nerve'){g.add(tube([[-.3,.1,0],[0,.25,-.2],[.3,.35,0],[.5,.5,-.2]],.09,0xedddbc));}
  else if(['polyp','eye','plate','strain','cyst'].includes(e.k)){
   const strain=e.k==='strain',plate=e.k==='plate',eye=e.k==='eye';
   body=ball(strain?.62:plate?.64:eye?.48:.32,strain&&e.strain==='miserere'?0xd9cfb4:plate?0xa64152:eye?0x886d8b:0x9d557b);body.scale.y=plate?.35:strain?.65:.55;g.add(body);
   if(eye||strain||plate){
    const sclera=ball(strain?.26:.2,0xf7dcab);sclera.scale.y=.3;sclera.position.y=.27;g.add(sclera);const pupil=ball(.1,0x3b183b);pupil.scale.y=.3;pupil.position.set(0,.33,0);g.add(pupil);
    const iris=ring(strain?.29:.22,0xf7be69,.035);iris.position.y=.32;g.add(iris);
   }
   if(strain||eye){for(let i=0;i<(strain?6:4);i++){
     const a=i/(strain?6:4)*Math.PI*2,r=strain?.7:.45;
     const limb=tube([[0,0,0],[Math.cos(a)*r,.15,Math.sin(a)*r],[Math.cos(a)*r*1.5,-.12,Math.sin(a)*r*1.5]],.055,strain?0xcc6b73:0xba8c9c);g.add(limb);
   }}
   if(strain&&e.strain==='miserere'){const halo=ring(.95,0xeec77a,.07);halo.position.y=.85;g.add(halo);}
  }
  setLookLayer(g,'actors');g.traverse(m=>{if(m.isMesh)m.castShadow=true;});this.root.add(g);
  const item={root:g,body,squash:new Squash(),chain:null,tail:[]};
  if(e.k==='strain'){
   item.chain=new SpringChain({segments:6,length:.3,stiffness:14,gravity:1,rest:[0,0,-1]});
   for(let i=0;i<6;i++){const t=ball(.13,0xc47479);t.scale.set(1,.65,1);setLookLayer(t,'actors');this.root.add(t);item.tail.push(t);}
  }
  return item;
 }
 update(s,dt){
  const def=opById(s.id);this.setArena(def.arena);this.root.visible=true;const table=s.seats[0]?.table||0;
  this.pixels.set(this.base);
  for(const scar of s.scars)if(scar.table===table){if(['laceration','nick','incision'].includes(scar.k))this.paintPath(scar.path,.025,0x75595a);if(scar.k==='dressing')this.paintPath(scar.path,.32,0xddd7b9);}
  for(const p of s.barriers||[])if(p.table===table)this.disc(p.x,p.z,.55,p.life<2?0x60998b:0x73bcb0);
  for(const e of s.entities){
   if(e.table!==table||e.done)continue;
   if(e.k==='pool'||e.k==='droplet'){this.disc(e.x,e.z,e.r+.035,0x54142f);this.disc(e.x+.03,e.z-.03,e.r*.9,0xa52e44);this.disc(e.x-e.r*.23,e.z-e.r*.25,e.r*.14,0xdd6a67);}
   if(e.k==='laceration'||e.k==='nick'){this.paintPath([{x:e.x,z:e.z},{x:e.x+(e.length||1.5),z:e.z}],.13,0x471728);this.paintPath([{x:e.x,z:e.z},{x:e.x+(e.length||1.5),z:e.z}],.045,0xb3444f);for(let j=0;j<e.progress;j++)this.disc(e.path[j].x,e.path[j].z,.065,0xe6d7b2);}
   if(e.k==='incision'&&e.progress>0)this.paintPath(e.path.slice(0,e.progress),.065,0x5b1835);
   if(e.k==='mask')for(const c of e.cells)if(c.v>0)this.disc(c.x,c.z,.36,0x63b5a6);
  }
  this.texture.needsUpdate=true;
  const pos=this.geo.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,heightAt(this.arena,pos.getX(i),pos.getZ(i),s.elapsed,s.bpm));pos.needsUpdate=true;this.geo.computeVertexNormals();
  this.kidney.visible=this.arena==='kidney'&&(s.stage<3||s.stage>=5);if(this.kidney.visible){this.kidney.position.set(0,heightAt(this.arena,0,0,s.elapsed)+.25,0);this.kidney.material.color.setHex(0x6c526a).lerp(new THREE.Color(0xd66b68),s.pink||0);}
  this.paddles.visible=!!s.blue;if(s.blue){for(let i=0;i<this.paddles.children.length;i++){const p=this.paddles.children[i];p.position.y=heightAt(this.arena,p.position.x,p.position.z,s.elapsed,s.bpm)+.55+(i%2?.2:0);}}
  const ids=new Set(s.entities.map(e=>e.id));for(const[id,item]of this.items)if(!ids.has(id)){item.root.removeFromParent();for(const t of item.tail)t.removeFromParent();this.items.delete(id);}
  for(const e of s.entities){
   let item=this.items.get(e.id);if(!item){item=this.buildEntity(e);this.items.set(e.id,item);}
   const shown=!e.done&&e.table===table&&!['pool','droplet','incision','laceration','mask','scan','nick','dressing'].includes(e.k);
   item.root.visible=shown;for(const t of item.tail)t.visible=shown;
   if(!shown)continue;
   const y=heightAt(this.arena,e.x,e.z,s.elapsed,s.bpm)+.12;
   item.root.position.set(e.x,y,e.z);item.root.rotation.y=e.angle||0;
   let scale=e.k==='strain'&&e.phase==='buried'?.55:1;
   if(e.k==='cyst'&&!e.revealed)scale=.55;
   if(e.k==='eye'&&e.phase!=='open')item.root.scale.set(1,.35,1);else item.root.scale.set(scale,scale*(1+Math.sin(s.elapsed*3+e.id)*.05),scale);
   if(e.k==='plate'&&e.phase==='laser')item.root.scale.y=.18;
   item.squash.update(dt);
   if(item.chain){item.chain.update(Math.min(.04,dt),[e.x,y+.3,e.z],[[1,0,0],[0,1,0],[0,0,1]]);for(let i=0;i<item.tail.length;i++){const p=item.chain.points[i+1];item.tail[i].position.set(p[0],Math.max(p[1],heightAt(this.arena,p[0],p[2],s.elapsed,s.bpm)+.06),p[2]);}}
  }
  for(let i=0;i<4;i++){
   const h=this.hands[i],seat=s.seats[i];h.root.visible=!!(seat&&seat.active&&seat.table===table||(s.blue||s.massage)&&i<2);
   if(!h.root.visible)continue;const sx=(s.blue||s.massage)?(i?3:-3):seat.x,sz=(s.blue||s.massage)?1:seat.z;
   const gloveColor=s.seats.length>1?[0xb13e53,0x3b5dc9,0x38b764,0xffcd75][i]:0x41a6f6;if(h.lastColor!==gloveColor){for(const m of h.colored)m.color.setHex(gloveColor);h.lastColor=gloveColor;}
   h.root.position.set(sx,heightAt(this.arena,sx,sz,s.elapsed,s.bpm)+.12+(s.massage?Math.sin(s.elapsed*s.bpm/60*Math.PI*2)*.15:0),sz);
   for(const[k,t]of Object.entries(h.tools))t.visible=!s.blue&&!s.massage&&k===seat?.tool;
   const force=h.tools.forceps;for(const sign of [-1,1]){const jaw=force.getObjectByName('jaw'+sign);if(jaw)jaw.rotation.y=sign*(seat?.using?.01:.065);}
   const plunger=h.tools.syringe.getObjectByName('plunger');if(plunger)plunger.position.z=1.4+(seat?.draw||0)*.45;
   h.ret.visible=!s.blue&&!s.massage;h.ret.rotation.z=s.elapsed;h.ret.scale.setScalar(seat?.using?.8:1);h.glove.rotation.z=.2+Math.sin(s.elapsed*2+i)*.015;
   h.squash.update(dt);const [xz,y]=h.squash.scale();h.glove.scale.set(.7*xz,.7*y,.7*xz);
  }
  const laser=s.seats.find(seat=>seat.tool==='laser'&&seat.using);this.beam.visible=!!laser;if(laser){this.beam.position.set(laser.x,heightAt(this.arena,laser.x,laser.z,s.elapsed,s.bpm)+.55,laser.z);}
  let ghost=s.ghost?.find(p=>p.tick>=s.tick);if(def.stages[s.stage].boss==='miserere'&&s.trace.length>180)ghost=s.trace[s.trace.length-180];this.ghostHand.visible=!!ghost;if(ghost)this.ghostHand.position.set(ghost.x+.88,heightAt(this.arena,ghost.x,ghost.z,s.elapsed,s.bpm)+.76,ghost.z+1.08);
  const scanner=s.seats.find(seat=>seat.tool==='scanner'&&seat.using);this.scanDisc.visible=!!scanner;if(scanner)this.scanDisc.position.set(scanner.x,heightAt(this.arena,scanner.x,scanner.z,s.elapsed,s.bpm)+.08,scanner.z);
 }
 effect(e){if(e.seat!=null&&this.hands[e.seat]){if(['grab','complete','tether','stitch','shock'].includes(e.type))this.hands[e.seat].squash.kick(e.type==='grab'?-2:1.5);}if(e.type==='tether'){const item=[...this.items.values()].find(v=>v.chain);item?.squash.kick(-4);}}
 project(x,z,s,dy=.1){this.temp.set(x,heightAt(this.arena,x,z,s?.elapsed||0,s?.bpm||72)+dy,z).project(this.ctx.camera.camera);return{x:(this.temp.x+1)/2*this.ctx.hud.width,y:(1-this.temp.y)/2*this.ctx.hud.height};}
 aim(nx,ny,s){const o=new Vector3(),d=new Vector3();this.ctx.camera.rayAt(nx,ny,o,d);let lo=(3-o.y)/d.y,hi=-o.y/d.y;for(let i=0;i<20;i++){const t=(lo+hi)/2,x=o.x+d.x*t,z=o.z+d.z*t;if(o.y+d.y*t>heightAt(this.arena,x,z,s?.elapsed||0,s?.bpm||72))lo=t;else hi=t;}const t=(lo+hi)/2;return{x:o.x+d.x*t,z:o.z+d.z*t};}
 dispose(){this.texture.dispose();this.geo.dispose();this.light.release();}
}
