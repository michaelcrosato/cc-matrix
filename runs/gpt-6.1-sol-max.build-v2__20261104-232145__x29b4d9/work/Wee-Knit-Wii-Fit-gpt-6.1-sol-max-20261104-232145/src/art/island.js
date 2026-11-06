import * as T from 'three/webgpu';
import {group,mesh,box,ball,cyl,torus,label,beam} from './materials.js';
import {tree,pavilion,lighthouse,sign,jar,crate,bunting} from './props.js';
import {doll,trudy,heron,walrus,gull} from './cast.js';
import {cosmetic} from '../core/rng.js';
export function makeIsland(){let root=group();cyl(root,0xe6d0a5,0,-.36,0,22,.7);let grass=cyl(root,0xa8bd87,0,-.02,0,15,.08);cyl(root,0xbca58c,0,-1.1,0,20.4,.9,21.6);let rock=mesh(new T.ConeGeometry(19.5,11,14),0x8b9c9a,root,0,-6.3,0);rock.rotation.z=Math.PI;const pivot=ball(root,0xb2a591,0,-12.8,0,2.3,1,1.2,1);let road=torus(root,0xe8d7af,0,.035,0,18.7,.9);road.rotation.x=Math.PI/2;for(let i=0;i<45;i++){let a=i*Math.PI*2/45;box(root,0xf8eccd,Math.cos(a)*18.7,.08,Math.sin(a)*18.7,.13,.014,.7,-a);}let inner=torus(root,0xc7c29a,0,.02,0,12,.19);inner.rotation.x=Math.PI/2;
 for(let i=0;i<18;i++){let a=i*2.399,r=10+cosmetic()*6;let x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x-2,z+9)>4&&Math.hypot(x-8,z-8)>4&&Math.hypot(x+13,z-7)>3)tree(root,x,z,.85+cosmetic()*.45);}
 const light=lighthouse(root,2,-9);pavilion(root,-16,-3,0x80b9ad,1.8);pavilion(root,-9,-13,0xb8ae9d,1.35);pavilion(root,15,-3,0xe2a879,1.75);pavilion(root,14,-11,0x95aab4,1.3);pavilion(root,9,-14,0xc69eb1,1.05);let hut=pavilion(root,8,8,0xdf986c,1.4);box(hut,0xf0ddac,0,1,0,2.1,2,2.1);box(hut,0x729c9e,0,.8,1.12,.65,1.6,.1);torus(hut,0xe6b865,.8,1.3,1.12,.25,.04);sign(root,'BED, EVENTUALLY',8,0,10.5,3.1);
 // The pier is a chain of small toy planks.
 for(let i=0;i<18;i++){let x=12+i*.7,z=10+i*.43;box(root,0xd4ac7d,x,.06,z,2.8,.14,.7,-.55);if(i%3===0){cyl(root,0xb88c64,x-1,-1,z,.1,2);cyl(root,0xb88c64,x+1,-1,z,.1,2);}}
 box(root,0xd8b68b,22,.04,16,7,.12,5);crate(root,20,17);for(let i=0;i<3;i++)box(root,i%2?0x81a8a5:0xe7bb75,24,.6+i*1.1,17,1.3,1.1,1.3);box(root,0xe6d3a4,24,4,17.5,1,.1,2.2);
 // Bandstand, yard, pond and circus.
 cyl(root,0xb5a0a2,15,.025,-3,3,.05);bunting(root,[12,3.7,-5],[18,3.7,-5]);box(root,0xd3ad7c,-7,.01,14,5,.035,4);let log=cyl(root,0xa87b55,-7,.5,14,.32,3);log.rotation.z=Math.PI/2;for(let i=0;i<6;i++){let a=i*Math.PI/3;cyl(root,0xc09c6b,Math.cos(a)*1.9,.9,2+Math.sin(a)*1.9,.04,1.8);cyl(root,[0xb689ab,0xe2b770,0x81acaa][i%3],Math.cos(a)*1.9,1.83,2+Math.sin(a)*1.9,.3,.03);}
 cyl(root,0x6ea9a4,-13,.035,7,3.2,.05);for(let i=0;i<9;i++){let a=i*2.3,r=1+cosmetic()*1.8;cyl(root,0x8eac77,-13+Math.cos(a)*r,.08,7+Math.sin(a)*r,.35,.025);if(i%3===0)ball(root,0xe4a7a9,-13+Math.cos(a)*r,.19,7+Math.sin(a)*r,.16,1,.45,1);}
 const jarRoot=jar(root,-3,-4,1.3);sign(root,'A LITTLE MORE LEVEL',-3,0,-1.8,3.8);sign(root,'TODAY’S PLAN',1,0,9,2.9);sign(root,'THE YARD',-7,0,12,2.7);
 for(let i=0;i<35;i++){let a=i*2.41,r=4+cosmetic()*14;for(let j=0;j<3;j++){let flower=ball(root,[0xf0ce83,0xdf9a9f,0xffe3a7][j],Math.cos(a)*r+j*.12,.16,Math.sin(a)*r,.11,1,.5,1);}}
 let guests=[];for(let i=0;i<10;i++){let d=doll(['#dc9371','#9ab4a0','#87a9b8','#b59db3'][i%4],i%6);d.root.position.set(Math.sin(i*2.3)*13,0,Math.cos(i*2.3)*13);d.root.rotation.y=i;d.root.scale.setScalar(.95);root.add(d.root);d.anim.play('walk');guests.push(d);}
 let td=trudy();td.position.set(-1,0,10);root.add(td);let h=heron();h.position.set(-16,0,-3);root.add(h);let w=walrus();w.position.set(-7,0,14);root.add(w);let g=gull();g.position.set(3,7.4,-9);root.add(g);
 for(let i=0;i<36;i++){let a=i*Math.PI*2/36;if(Math.sin(a)>.35&&Math.cos(a)>.45)continue;cyl(root,0xc3aa82,Math.cos(a)*21.1,.35,Math.sin(a)*21.1,.06,.7);}
 return {root,guests,trudy:td,lighthouse:light,jar:jarRoot,gull:g};}
