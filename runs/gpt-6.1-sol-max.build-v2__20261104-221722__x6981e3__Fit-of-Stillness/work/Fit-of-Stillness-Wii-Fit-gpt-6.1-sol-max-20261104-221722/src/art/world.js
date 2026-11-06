import { THREE, PALETTE, toonMaterial, buildModel, textureMap, WaterSurface, WAVES_CALM, GrassField, Boids, RippleField } from '../../pixel-engine.js';
import { MODELS } from './models.js';
import './textures.js';
import { STATIONS } from '../data/activities.js';
const { Mesh, BoxGeometry, PlaneGeometry, CylinderGeometry, SphereGeometry, Group, Vector3 }=THREE;
export function box(ctx,at,size,color,solid=false){const m=new Mesh(new BoxGeometry(...size),toonMaterial(PALETTE[color]||color));m.position.set(...at);m.receiveShadow=true;m.castShadow=false;ctx.scene.add(m);if(solid)ctx.physics.addStaticBox({position:at,halfExtents:size.map(x=>x/2)});return m;}
export function place(ctx,id,at=[0,0,0],{scale=1,turn=0,palette}={}){const m=buildModel(id,{catalog:MODELS,palette});m.object.position.set(...at);m.object.scale.setScalar(scale);m.object.rotation.y=turn*Math.PI/180;ctx.scene.add(m.object);return m.object;}
export function floor(ctx,w,d,at=[0,.012,0]){const g=new PlaneGeometry(w,d).rotateX(-Math.PI/2);g.attributes.uv.array.forEach((v,i,uv)=>uv[i]=v*(i%2?d:w)/2);const m=new Mesh(g,toonMaterial(PALETTE.white,{map:textureMap('clinic-tile')}));m.position.set(...at);m.receiveShadow=true;ctx.scene.add(m);return m;}
export function ocean(ctx,size=100){const ripples=new RippleField({size:[size,size],cells:[32,32]});const water=new WaterSurface({size:[size,size],segments:[32,32],at:[0,-.36,0],waves:WAVES_CALM,ripples,deep:PALETTE.sky,shallow:PALETTE.cyan,foam:PALETTE.white});ctx.scene.add(water);return water;}
export function island(ctx){
 const sea=ocean(ctx);const ground=new Mesh(new CylinderGeometry(23,24,1.2,48),toonMaterial(PALETTE.sand));ground.scale.z=.78;ground.position.y=-.58;ground.receiveShadow=true;ctx.scene.add(ground);ctx.physics.addStaticBox({position:[0,-.4,0],halfExtents:[21,.4,16]});
 const lawn=new Mesh(new CylinderGeometry(20.5,21,.14,48),toonMaterial(PALETTE.lime));lawn.scale.z=.75;lawn.position.y=.02;ctx.scene.add(lawn);floor(ctx,15,12,[0,.11,0]);
 for(const [x,z,w,d]of [[-8,3,14,2],[8,3,14,2],[0,-6,2,12],[0,8,2,8],[10,-6,2,12],[-10,-6,2,12]])floor(ctx,w,d,[x,.115,z]);
 place(ctx,'kettlebell-volcano',[-15,0,-13],{scale:.7});place(ctx,'foam-roller-hill',[14,0,-14],{scale:.7,turn:18});place(ctx,'tare-dumbbell',[-3,0,-14],{scale:.65,turn:20});
 place(ctx,'tare-pavilion',[-11,.1,3]);place(ctx,'tare-pavilion',[11,.1,3],{palette:{roof:'orange',trim:'plum'}});place(ctx,'tare-pavilion',[12,.1,-10],{scale:.8,palette:{roof:'plum',trim:'sand'}});
 place(ctx,'sweat-jar',[4,.12,-4]);place(ctx,'tare-lockers',[-4,.12,-4],{turn:0});place(ctx,'tare-hammock',[14,.12,10],{turn:-20});
 place(ctx,'tare-dumbbell',[-12,-.9,-10],{scale:.7});box(ctx,[-12,.16,-10],[5,.2,5],'orange');
 place(ctx,'fountain',[0,.12,-2],{scale:.9,palette:{stone:'white',trim:'teal',water:'sky',spray:'white'}});
 for(const [x,z]of [[-18,4],[-16,-5],[-6,13],[17,7],[19,-7],[-17,11],[9,12],[3,-13]])place(ctx,'tare-palm',[x,.05,z],{scale:1+(x%3)*.1,turn:x*12});
 for(const [x,z]of [[-5,4],[5,5],[-6,-6],[7,-7]]){place(ctx,'park-bench',[x,.14,z],{palette:{wood:'white',wood2:'sky',iron:'teal'}});place(ctx,'flowers',[x+.8,.16,z+.8],{scale:1.3});}
 for(const s of STATIONS.filter(s=>s.number)){const m=new Mesh(new CylinderGeometry(.75,.75,.1,24),toonMaterial(PALETTE[s.color]));m.position.set(s.x,.23,s.z+3);ctx.scene.add(m);}
 const grass=new GrassField({area:[35,25],at:[0,.04,0],count:600,exclude:[]}); // sparse blades outside the plaza, kept low
 grass.visible=false;ctx.scene.add(grass);
 const flock=new Boids(7,{bounds:{min:[-19,6,-14],max:[19,10,14]}});const birds=Array.from({length:7},(_,i)=>place(ctx,'kevin',[i,7,-5],{scale:.7}));
 return {sea,flock,birds,update(t,dt){sea.update(t);flock.step(dt);for(let i=0;i<birds.length;i++){const p=flock.pos;birds[i].position.set(p[i*3],p[i*3+1],p[i*3+2]);birds[i].getObjectByName('wingR')?.rotation.set(0,0,Math.sin(t*6+i)*.35);birds[i].getObjectByName('wingL')?.rotation.set(0,0,-Math.sin(t*6+i)*.35);}}};
}
export function postcard(ctx){
 const sea=ocean(ctx,70),base=new Mesh(new CylinderGeometry(5.3,5.7,1,32),toonMaterial(PALETTE.sand));base.position.set(3,-.45,0);base.scale.z=.8;ctx.scene.add(base);floor(ctx,7,5,[3,.08,0]);
 place(ctx,'tare-palm',[6,.06,-1.7],{scale:1.15,turn:80});place(ctx,'tare-palm',[.7,.06,-2.8],{scale:.8,turn:-30});place(ctx,'tare-pavilion',[3,.1,-3],{scale:.6});
 place(ctx,'kettlebell-volcano',[9,-.2,-9],{scale:.65,turn:10});place(ctx,'foam-roller-hill',[-3,-.2,-12],{scale:.45});
 place(ctx,'yoga-mat',[3,.14,.4],{palette:{body:'teal'}});place(ctx,'yoga-mat',[5,.14,.4],{palette:{body:'sky'}});place(ctx,'sweat-jar',[.2,.13,.8],{scale:.65});place(ctx,'kevin',[5,.15,2.2]);
 for(const [x,z]of [[0,-1],[6.2,1.3],[2,-2.7]])place(ctx,'flowers',[x,.1,z],{scale:1.4});
 return {sea,update(t){sea.update(t);}};
}
export function stage(ctx,data,lanes=3){
 const sea=ocean(ctx,100);box(ctx,[0,-.15,0],[17,.3,9],'mist',true);floor(ctx,17,9,[0,.012,0]);box(ctx,[0,.05,-3.7],[17,.12,.24],'teal');
 for(const x of [-8,-6,-4,-2,0,2,4,6,8])box(ctx,[x,.5,-3.7],[.10,.9,.10],'white');box(ctx,[0,.9,-3.7],[17,.1,.12],'white');
 for(const x of [-7.4,7.4])place(ctx,'tare-palm',[x,0,-3],{scale:1.1,turn:x*8});
 place(ctx,'kettlebell-volcano',[-17,-1,-26],{scale:1.1});place(ctx,'foam-roller-hill',[18,-1,-28],{scale:.85});
 const xs=lanes===4?[-3,-1,1,3]:lanes===2?[-1.4,1.4]:lanes===1?[0]:[-2.2,0,2.2];
 for(let i=0;i<xs.length;i++)if(!['tray','pier','jog'].includes(data.kind))place(ctx,data.kind==='step'?'step-platform':'yoga-mat',[xs[i],.02,.8],{palette:{body:i===Math.floor(xs.length/2)?'teal':'sky'}});
 box(ctx,[-4.6,.15,-1.2],[1.8,.3,1.7],'white');const bird=place(ctx,'kevin',[4.3,.98,-3.7],{turn:-30});
 if(data.kind==='reps'){place(ctx,'tare-dumbbell',[-6.5,0,-.5],{scale:.3});place(ctx,'tare-dumbbell',[6.5,0,-.5],{scale:.3});}
 if(data.kind==='hoop'||data.kind==='step'){for(const x of [-5.8,5.8]){box(ctx,[x,.8,-2],[.9,1.6,.7],'plum');for(const y of [.45,1.12]){const m=new Mesh(new CylinderGeometry(.25,.25,.08,12),toonMaterial(PALETTE.slate));m.rotation.x=Math.PI/2;m.position.set(x,y,-1.61);ctx.scene.add(m);}}}
 if(data.kind==='header')place(ctx,'dennis-catapult',[4.8,.02,-1.8],{scale:.7});
 return {xs,sea,bird,update(t){sea.update(t);}};
}
export function lineWorld(ctx){const sea=ocean(ctx);for(const z of [-2,30])place(ctx,'tare-dumbbell',[0,-.7,z],{scale:.85});for(const z of [-2,30])box(ctx,[0,-.3,z],[5,.5,3],'sand');const points=[];for(let i=0;i<=60;i++)points.push(new Vector3(0,1.05-Math.sin(i/60*Math.PI)*.25,i*.5));const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),80,.075,6,false);const rope=new Mesh(g,toonMaterial(PALETTE.orange));ctx.scene.add(rope);place(ctx,'tare-palm',[-4,0,30]);for(const z of [6,12,18,24]){box(ctx,[-1.4,1,z],[.08,2,.08],'white');box(ctx,[-1.1,1.8,z],[.6,.35,.06],'orange');}return{sea,rope,update(t){sea.update(t);}};}

export function pierWorld(ctx){const sea=ocean(ctx,100);box(ctx,[-5,.05,0],[10,.4,2.4],'orange');for(const x of [-9,-6,-3])for(const z of [-.9,.9])box(ctx,[x,-.65,z],[.2,1.5,.2],'plum');box(ctx,[-5,.02,-3.4],[8,.3,3],'sand');place(ctx,'tare-palm',[-9,.15,-5]);place(ctx,'kevin',[-.2,.3,-1]);return{sea,update(t){sea.update(t);}};}
