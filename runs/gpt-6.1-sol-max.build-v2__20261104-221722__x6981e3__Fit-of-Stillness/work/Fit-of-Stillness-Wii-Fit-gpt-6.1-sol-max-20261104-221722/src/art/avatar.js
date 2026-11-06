import { THREE, HERO_MODEL, HERO_RIG, compileClips, toonMaterial, PALETTE, setLookLayer, ContactShadow } from '../../pixel-engine.js';
import { CLIPS } from './clips.js';
const {Mesh,BoxGeometry,SphereGeometry,CylinderGeometry,Vector3,AnimationMixer}=THREE;
export const LOOKS=[
 {skin:'sand',top:'white',bottom:'sky',shoe:'white',hair:'ink',headband:'red'},
 {skin:'orange',top:'teal',bottom:'white',shoe:'plum',hair:'plum',bun:true},
 {skin:'red',top:'sand',bottom:'navy',shoe:'white',hair:'ink'},
 {skin:'sand',top:'plum',bottom:'sky',shoe:'white',hair:'orange',bun:true},
 {skin:'plum',top:'cyan',bottom:'white',shoe:'orange',hair:'ink'},
 {skin:'orange',top:'white',bottom:'teal',shoe:'white',hair:'slate',headband:'sky'}
];
export const CAST={Coach:{skin:'sand',top:'cyan',bottom:'cyan',shoe:'white',hair:'mist',bun:true,long:true},Marguerite:{skin:'sand',top:'plum',bottom:'white',shoe:'white',hair:'mist',bun:true,headband:'sky'},Dennis:{skin:'orange',top:'orange',bottom:'navy',shoe:'white',hair:'plum',headband:'white'},June:{skin:'sand',top:'teal',bottom:'plum',shoe:'white',hair:'ink',bun:true}};
function soften(mesh,egg=false){mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox,s=b.getSize(new Vector3()),c=b.getCenter(new Vector3()),g=egg?new SphereGeometry(.5,10,8):new CylinderGeometry(.5,.5,1,8);g.scale(s.x,s.y,s.z);g.translate(c.x,c.y,c.z);mesh.geometry=g;}
export function dress(root,look){
 const hide=new Set(['Moustache','ButtonR','ButtonL','Hat','Brim','Eyes','Nose']);
 const slots={Overalls:'bottom',ThighR:'bottom',ThighL:'bottom',ShinR_Mesh:look.long?'bottom':'skin',ShinL_Mesh:look.long?'bottom':'skin',Shirt:'top',SleeveR:'top',SleeveL:'top',ForearmR_Mesh:look.long?'top':'skin',ForearmL_Mesh:look.long?'top':'skin',GloveR:'skin',GloveL:'skin',Face:'skin',ShoeR:'shoe',ShoeL:'shoe'};
 root.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;if(hide.has(o.name)){o.visible=false;return;}if(slots[o.name])o.material=toonMaterial(PALETTE[look[slots[o.name]]]);if(o.name==='Face')soften(o,true);else if(/Sleeve|Forearm|Thigh|Shin|Glove/.test(o.name))soften(o);});
 const face=root.getObjectByName('Face');face.geometry.computeBoundingBox();const b=face.geometry.boundingBox,s=b.getSize(new Vector3()),c=b.getCenter(new Vector3());const add=(m,x,y,z)=>{m.position.set(x,y,z);face.parent.add(m);return m;};
 for(const sx of [-1,1])add(new Mesh(new BoxGeometry(.055,.09,.03),toonMaterial(PALETTE.ink)),c.x+sx*s.x*.2,c.y+.02,c.z+s.z*.48);
 add(new Mesh(new BoxGeometry(.1,.022,.03),toonMaterial(PALETTE.ink)),c.x,c.y-s.y*.2,c.z+s.z*.47);
 const hair=add(new Mesh(new SphereGeometry(.5,10,6,0,Math.PI*2,0,Math.PI*.55)),c.x,c.y+s.y*.04,c.z-s.z*.05);hair.material=toonMaterial(PALETTE[look.hair]);hair.scale.set(s.x*1.08,s.y*(look.hairStyle==='cropped'?.65:1.04),s.z*1.08);
 if(look.hairStyle==='bun'||look.bun&&look.hairStyle!=='cap'&&look.hairStyle!=='cropped')add(new Mesh(new SphereGeometry(.12,8,6),toonMaterial(PALETTE[look.hair])),c.x,c.y+s.y*.6,c.z-s.z*.2);
 if(look.headband){const band=add(new Mesh(new CylinderGeometry(.5,.5,1,10),toonMaterial(PALETTE[look.headband])),c.x,c.y+s.y*.16,c.z);band.scale.set(s.x*1.06,.06,s.z*1.06);}
 if(look.cape){const cape=new Mesh(new BoxGeometry(.5,.7,.04),toonMaterial(PALETTE.sky));cape.position.set(0,.95,-.18);root.add(cape);}
 return root;
}
let compiled=null;
export async function avatar(ctx,look=LOOKS[0],at=[0,0,0],clip='Idle'){
 const root=(await ctx.loadModel(HERO_MODEL,{castShadow:false})).scene;dress(root,look);setLookLayer(root,'actors');root.position.set(...at);ctx.scene.add(root);
 const mixer=new AnimationMixer(root);compiled||=compileClips(CLIPS,HERO_RIG,root);const actions=Object.fromEntries(compiled.map(c=>[c.name,mixer.clipAction(c)]));
 const shadow=new ContactShadow(.36);ctx.scene.add(shadow);shadow.place(at[0],at[1],at[2],0);
 const a={root,mixer,actions,shadow,clip:null,torso:root.getObjectByName('Torso'),pelvis:root.getObjectByName('Pelvis'),leanX:0,leanY:0,leanP:0,
 play(name,fade=.18){if(this.clip===name)return;this.actions[this.clip]?.fadeOut(fade);this.clip=name;this.actions[name]?.reset().fadeIn(fade).play();},
 update(dt,dot=null){if(this.torso){this.torso.rotation.z-=this.leanX;this.torso.rotation.x-=this.leanY;}if(this.pelvis)this.pelvis.position.x-=this.leanP;this.mixer.update(dt);this.leanX=dot?-dot.x*.18:0;this.leanY=dot?-dot.y*.12:0;this.leanP=dot?dot.x*.05:0;if(this.torso){this.torso.rotation.z+=this.leanX;this.torso.rotation.x+=this.leanY;}if(this.pelvis)this.pelvis.position.x+=this.leanP;this.shadow.place(this.root.position.x,.02,this.root.position.z,Math.max(0,this.root.position.y));}
 };a.play(clip,0);a.update(0);return a;
}
