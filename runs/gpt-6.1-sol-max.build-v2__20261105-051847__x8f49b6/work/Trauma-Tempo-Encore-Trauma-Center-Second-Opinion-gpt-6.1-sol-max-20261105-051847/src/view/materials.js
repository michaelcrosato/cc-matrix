import * as T from 'three/webgpu';
const d=new Uint8Array([95,95,95,255,165,165,165,255,235,235,235,255,255,255,255,255]);
export const ramp=new T.DataTexture(d,4,1,T.RGBAFormat);ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
export const toon=(color,opts={})=>new T.MeshToonNodeMaterial({color,gradientMap:ramp,...opts});
export const ink=toon('#120d20');
export const cream=toon('#f4f1e8');
export const metal=toon('#b6d8d5');
export function mesh(geo,mat,parent,x=0,y=0,z=0,scale){const m=new T.Mesh(geo,typeof mat==='string'?toon(mat):mat);m.position.set(x,y,z);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent?.add(m);return m;}
export function box(parent,color,x,y,z,w,h,d){return mesh(new T.BoxGeometry(w,h,d),color,parent,x,y,z);}
export function ball(parent,color,x,y,z,rx,ry=rx,rz=rx){return mesh(new T.SphereGeometry(1,24,16),color,parent,x,y,z,[rx,ry,rz]);}
export function tube(parent,color,points,r=.012){const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(c,Math.max(12,points.length*6),r,7,false),color,parent);}
export function ring(parent,color,x,y,z,r,thick=.012){const m=mesh(new T.TorusGeometry(r,thick,8,64),color,parent,x,y,z);return m;}
export function labelTexture(text,{color='#f4f1e8',bg='transparent',size=100,font='700 44px "Barlow Condensed",sans-serif',width=512,height=128}={}){const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');if(bg!=='transparent'){x.fillStyle=bg;x.fillRect(0,0,width,height);}x.fillStyle=color;x.font=font;x.textAlign='center';x.textBaseline='middle';x.fillText(text,width/2,height/2,width-20);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
export function flatLabel(parent,text,x,y,z,w=1,h=.25,color='#f4f1e8'){return mesh(new T.PlaneGeometry(w,h),new T.MeshBasicNodeMaterial({map:labelTexture(text,{color,...(/^\d{1,2}$/.test(text)?{width:128,height:128,font:'700 96px Barlow,sans-serif'}:{})}),transparent:true,depthWrite:false}),parent,x,y,z);}
