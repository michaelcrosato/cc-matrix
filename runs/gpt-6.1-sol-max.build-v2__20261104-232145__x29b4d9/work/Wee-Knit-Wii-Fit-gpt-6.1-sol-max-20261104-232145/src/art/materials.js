import * as T from 'three/webgpu';
export const INK=0x26232e;
const ramp=new T.DataTexture(new Uint8Array([100,180,255]),3,1,T.RedFormat);ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.colorSpace=T.NoColorSpace;ramp.needsUpdate=true;
const cache=new Map();
export function mat(colour){if(!cache.has(colour))cache.set(colour,new T.MeshToonNodeMaterial({color:colour,gradientMap:ramp}));return cache.get(colour);}
export const glass=new T.MeshBasicNodeMaterial({color:0xd7f4f5,transparent:true,opacity:.17,side:T.DoubleSide,depthWrite:false});
export function mesh(g,c,parent,x=0,y=0,z=0){const m=new T.Mesh(g,typeof c==='object'?c:mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent?.add(m);return m;}
export function box(p,c,x,y,z,w,h,d,r=0){const m=mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z);m.rotation.y=r;return m;}
export function ball(p,c,x,y,z,r,sx=1,sy=1,sz=1){const m=mesh(new T.SphereGeometry(r,18,12),c,p,x,y,z);m.scale.set(sx,sy,sz);return m;}
export function cyl(p,c,x,y,z,r,h,rt=r){return mesh(new T.CylinderGeometry(rt,r,h,32),c,p,x,y,z);}
export function torus(p,c,x,y,z,r,tube=.025){return mesh(new T.TorusGeometry(r,tube,8,48),c,p,x,y,z);}
export function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent?.add(g);return g;}
export function beam(p,c,a,b,r=.04){let mid=new T.Vector3().addVectors(new T.Vector3(...a),new T.Vector3(...b)).multiplyScalar(.5);let v=new T.Vector3(...b).sub(new T.Vector3(...a));let m=cyl(p,c,...mid.toArray(),r,v.length());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
export function label(text,colour='#302a35',bg=null,size=1){const can=document.createElement('canvas');can.width=768;can.height=160;const ctx=can.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,768,160);}ctx.fillStyle=colour;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 70px Fredoka, sans-serif';ctx.fillText(text,384,82,740);let tex=new T.CanvasTexture(can);tex.colorSpace=T.SRGBColorSpace;let m=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true}));m.scale.set(size*4.8,size,1);return m;}
