import {THREE,toonMaterial,buildModel,setLookLayer,HERO_CLIPS,HERO_RIG,compileClips,Precipitation,Timeline,loadPack} from '../../pixel-engine.js';
import {BUSTS,FIGURES} from '../content/models.js';
import {CAST} from '../content/story.js';
import {box} from './field.js';
const {Group,Mesh,CylinderGeometry,SphereGeometry,TorusGeometry,Vector3,AnimationMixer,Color}=THREE;
const orb=(r,c)=>new Mesh(new SphereGeometry(r,12,8),toonMaterial(c));
export class HospitalView{
 async init(ctx){
  this.ctx=ctx;this.root=new Group();ctx.scene.add(this.root);this.rooms={};this.busts={};this.figures=[];this.lamps=[];
  this.rain=new Precipitation({kind:'rain',count:700,area:[26,15,16],color:0x7099a9,speed:12});this.rain.position.z=-10;this.root.add(this.rain);
  try{this.pack=typeof document!=='undefined'?await loadPack('packs/kenney-furniture.json'):null;}catch{this.pack=null;}
  for(const set of ['or','ward','corridor','office','scrub','atrium','roof'])this.rooms[set]=this.buildRoom(set);
  for(const[id,def]of Object.entries(BUSTS)){
   const b=buildModel(def).object;b.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=false;}});setLookLayer(b,'actors');ctx.scene.add(b);b.visible=false;this.busts[id]=b;
  }
  for(let i=0;i<4;i++){
   const def=FIGURES[['ilya','reyes','sabine','pem'][i]],o=buildModel(def).object;setLookLayer(o,'actors');o.scale.setScalar(1.4);
   o.position.set(i%2?4:0,0,i<2?-1.4:1.4);o.rotation.y=i%2?-.7:.6;this.root.add(o);
   const mixer=new AnimationMixer(o),clips=compileClips(HERO_CLIPS,HERO_RIG,o);const idle=clips.find(c=>c.name==='Idle')||clips[0];if(idle)mixer.clipAction(idle).play();this.figures.push({o,mixer,clips});
  }
  this.lampLight=ctx.lights.request({position:[2,4.5,0],color:0xfff1c8,intensity:14,radius:10,priority:7,name:'theatre-lamp'});
  this.monitorLight=ctx.lights.request({position:[-2,2,-3],color:0x41d4c1,intensity:3,radius:7,priority:5,name:'monitor'});
  this.timeline=new Timeline({duration:4,shots:[{at:0,position:[10,6.8,11],target:[1,1,0]},{at:4,position:[9,6.4,10],target:[1,1,0]}]});this.timeline.play();
 }
 buildRoom(kind){
  const g=new Group();g.name=kind;this.root.add(g);const roof=kind==='roof',atrium=kind==='atrium',ward=kind==='ward',office=kind==='office',scrub=kind==='scrub';
  const wall=atrium?0x9d9f99:office?0x253442:0x23414a;
  g.add(box([24,.4,18],[0,-.25,-1],roof?0x253542:0x233d42));
  for(let x=-12;x<12;x+=1.5)for(let z=-9;z<8;z+=1.5)if((x/1.5+z/1.5)%2===0)g.add(box([1.46,.015,1.46],[x,.001,z],roof?0x293d49:0x2c484b));
  if(!roof){
   g.add(box([24,7,.35],[0,3.2,-8],wall),box([.35,7,18],[-12,3.2,-1],wall));
   for(const y of [.2,1.1,5.8])g.add(box([24,.1,.1],[0,y,-7.75],0x739598));
   g.add(box([7.6,3.1,.08],[4.1,3.9,-7.76],0x0e1d32));
   for(const x of [.3,2.2,4.1,6,7.9])g.add(box([.09,3.2,.13],[x,3.9,-7.66],0x5b7a83));
   g.add(box([8,.08,.14],[4.1,4.2,-7.61],0x5b7a83));
   for(let i=0;i<14;i++)g.add(box([.32,.16,.08],[.6+i*.49,2.6+(i%3)*.19,-7.57],i%4?0x29535b:0xd2a96b));
   if(kind==='corridor')for(const x of [-7,-2,3,8]){g.add(box([2,3.8,.2],[x,1.9,-7.45],0x34565d),box([.6,.85,.05],[x,2.6,-7.3],0x11283b));}
  }else{
   for(const x of [-10,10])g.add(box([.15,1.3,18],[x,.65,-1],0x75949c));
   for(let z=-9;z<8;z+=2)for(const x of [-10,10])g.add(box([.12,1.2,.12],[x,.6,z],0x75949c));
   for(let i=0;i<35;i++){const x=-16+i*.9,z=-15-(i%3);g.add(box([.7,1+(i%5)*.7,1],[x,(1+(i%5)*.7)/2,z],0x172a3e));g.add(box([.1,.2,.03],[x,.8,z+.55],i%4?0x528384:0xe0b06d));}
   for(let i=0;i<28;i++)g.add(box([.5,.02,.16],[-6+i*.45,.02,3.4],0xc09e61));
   g.add(box([.3,.02,3.8],[0,.02,1.5],0xd6b66f),box([3.8,.02,.3],[0,.02,1.5],0xd6b66f));
  }
  if(kind==='or'){
   g.add(box([2.6,.35,5.6],[2,1,0],0x819598),box([1.3,.9,2.3],[2,.5,0],0x3c5961),box([2.55,.17,5.4],[2,1.25,0],0x1d8a82));
   const patient=orb(.7,0xd0a37a);patient.scale.set(.58,.4,.7);patient.position.set(2,1.65,-2.1);g.add(patient);
   const drape=orb(1,0x3a9090);drape.scale.set(1.05,.53,1.5);drape.position.set(2,1.38,.3);g.add(drape);
   g.add(box([.15,3,.15],[4.8,1.5,-1],0x849ca0),box([2.7,.15,.15],[3.5,3,-1],0x849ca0));
   const lamp=new Group();const shade=new Mesh(new CylinderGeometry(1,1.2,.22,8),toonMaterial(0x7b969d));lamp.add(shade);
   for(let i=0;i<7;i++){const a=i/6*Math.PI*2,r=i===6?0:.72;const bulb=new Mesh(new CylinderGeometry(.22,.22,.04,6),toonMaterial(0xffedbf));bulb.position.set(Math.cos(a)*r,-.135,Math.sin(a)*r);lamp.add(bulb);}
   lamp.position.set(2.4,4.5,0);lamp.rotation.z=.12;g.add(lamp);this.lamps.push(lamp);
   this.addMonitor(g,[-2,1.8,-2.2]);
   g.add(box([1.8,.1,2.3],[5,1.25,2.7],0x9cabad),box([1.6,.05,2.1],[5,1.34,2.7],0x3b5661));
   for(let i=0;i<7;i++)g.add(box([.08,.07,1.5],[4.4+i*.18,1.43,2.5],0xabc8c9));
   g.add(box([2.7,3.6,.2],[-6,1.8,-7.35],0x38606a),box([.55,.8,.1],[-6,2.5,-7.2],0x102435));
  }else if(ward){
   for(const x of [-5,1,7]){this.prop(g,'bed-single',[x,0,-3],2.3);g.add(box([2.2,.25,3.4],[x,.95,-2.5],0x317878));this.addMonitor(g,[x+1.8,1.4,-4]);}
   for(const x of [-8,-2,4])g.add(box([.08,3.8,4],[x,2,-3],0x668c8b));
  }else if(office){this.prop(g,'desk',[1,0,-3],2);this.prop(g,'chair-desk',[1.2,0,-5],1.6);g.add(box([3.8,1.4,1.8],[1,.7,-3],0x5b4943));g.add(box([.8,.04,.6],[.4,1.45,-2.8],0xd7cda8));
   for(let i=0;i<10;i++)g.add(box([.22,1.2,.6],[-8+i*.27,1.4,-7],i%2?0x995955:0x928365));
  }else if(scrub){for(const x of [-4,0,4])this.prop(g,'kitchen-sink',[x,0,-4],2.3);g.add(box([12,2,.07],[0,3.5,-6],0x3e7785));}
  else if(atrium){for(const x of [-7,7]){g.add(box([.7,6,.7],[x,3,-4],0xc2b692));const vase=new Mesh(new CylinderGeometry(.6,.4,.8,8),toonMaterial(0xa9a9a0));vase.position.set(x,.4,-2);g.add(vase);for(let i=0;i<7;i++){const flower=orb(.25,i%2?0xe7ce9e:0x9b5c72);flower.position.set(x+Math.cos(i)*.4,1.5+Math.sin(i)*.2,-2+Math.sin(i)*.4);g.add(flower);}}}
  g.visible=false;return g;
 }
 prop(g,id,at,scale=1){if(!this.pack)return;try{const b=buildModel('kenney-furniture/'+id,{catalog:this.pack,palette:{wood:'slate',woodDark:'navy',metal:'mist',carpet:'teal',carpetBlue:'teal'}}).object;b.position.set(...at);b.scale.setScalar(scale);g.add(b);}catch{}}
 addMonitor(g,at){const m=new Group();m.add(box([1.7,1.1,.3],[0,0,0],0x1b303e),box([1.4,.8,.05],[0,0,.18],0x0a202c),box([.12,1.8,.12],[0,-1.3,0],0x879f9e));
  for(let i=0;i<20;i++)m.add(box([.055,.045,.03],[-.6+i*.062,.05+Math.sin(i*.8)*.07+(i===10?.25:i===11?-.2:0),.22],0x62dbb1));
  m.position.set(...at);g.add(m);}
 set(kind='or',story=false){
  for(const[k,g]of Object.entries(this.rooms))g.visible=k===kind;this.root.visible=true;
  this.ctx.engine.sun.intensity=story?1.0:.38;this.ctx.engine.ambient.intensity=story?.65:.34;this.ctx.engine.ambient.color.setHex(0x91abb8);
  this.ctx.scene.background=new Color(0x0c1727);for(const f of this.figures)f.o.visible=!story&&kind==='or';
  this.rain.visible=kind==='roof'||!story;this.lampLight.release();this.lampLight=this.ctx.lights.request({position:[2,4.5,0],color:0xfff1c8,intensity:story?5:14,radius:12,priority:7,name:'theatre-lamp'});
 }
 portrait(who,emo='neutral',other=null){
  for(const[id,b]of Object.entries(this.busts)){b.visible=id===who||id===other;if(!b.visible)continue;
   b.position.set(id===who?1.15:-1.6,-.1,id===who?3.2:2.6);b.scale.setScalar(id===who?1:.85);b.rotation.y=id===who?-.12:.2;
   const head=b.getObjectByName('head');head.rotation.z=emo==='sad'?.06:emo==='panic'?-.05:0;
   for(const sign of [-1,1]){const brow=b.getObjectByName('brow'+sign);if(brow)brow.rotation.z=sign*(emo==='angry'||emo==='stern'?-.3:emo==='sad'?.24:emo==='shock'||emo==='panic'?.06:-.1);}
  }this.speaker=who;this.emotion=emo;
 }
 hidePortraits(){for(const b of Object.values(this.busts))b.visible=false;}
 update(dt,t,talking=false){
  this.rain.update(dt,new Vector3(0,4,-8));this.timeline.update(dt);
  for(const l of this.lamps){l.rotation.z=.12+Math.sin(t*.6)*.045;l.rotation.x=Math.sin(t*.43)*.03;}
  for(const f of this.figures)if(f.o.visible)f.mixer.update(dt);
  for(const[id,b]of Object.entries(this.busts))if(b.visible){
   const head=b.getObjectByName('head'),mouth=b.getObjectByName('mouth');if(mouth)mouth.scale.y=talking&&id===this.speaker?1+Math.abs(Math.sin(t*23))*3.5:1;
   if(head)head.rotation.x=Math.sin(t*1.6)*.012;
   const blink=Math.sin(t*.9+Object.keys(CAST).indexOf(id))>.997;
   for(const sign of [-1,1]){const eye=b.getObjectByName('eye'+sign);if(eye)eye.scale.y=blink?.08:1;}
  }
 }
 dispose(){this.rain.dispose();this.lampLight.release();this.monitorLight.release();}
}
